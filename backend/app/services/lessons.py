"""Lesson verification + reads (P22-1).

Every example in a lesson must be derivable by the engine. Verification runs
at SEED time, not at request time: each example carries ``derivation_params``
(a prakriya.derive call) or a ``sandhi_join`` (a split_candidates call), and
the seed stores the example only when the engine reproduces the surface form
exactly. A lesson cannot claim a form the engine cannot produce — the §6
provenance rule applied to content.

``derive`` never raises (it degrades to an empty result), so verification is
``result == devanagari``: an empty result fails, and a confident wrong result
(measured: वद् → वन्दते, कन्या → कन्याः) fails too.
"""

from __future__ import annotations

import logging
from typing import Any, Optional

from sqlalchemy.orm import Session

from app.models import Lesson
from app.services import prakriya
from app.services.sandhi import split_candidates

logger = logging.getLogger("shabd.lessons")

# Step kinds that render a sandbox component and are never assessment:
# attempting one is a no-op (correct, graded False, mastery/schedule
# untouched). Practice is not graded until a grader the engine can honestly
# support exists (§2.2, §6.2).
PRACTICE_KINDS = frozenset({"explain", "build", "articulate", "read"})


def verify_example(example: dict[str, Any]) -> Optional[dict[str, Any]]:
    """Verify one seed example against the engine.

    Returns the storable example (with ``derivation`` attached) or None when
    the engine cannot reproduce the surface form — the caller drops Nones.
    """
    dev = (example.get("devanagari") or "").strip()
    if not dev:
        return None
    params = example.get("derivation_params") or {}
    if params:
        try:
            der = prakriya.derive(**params)
        except Exception:  # noqa: BLE001 — unverifiable means dropped
            return None
        if not der or der.get("result") != dev:
            logger.info("lesson example dropped (engine cannot derive): %s", dev)
            return None
        return {
            "devanagari": dev,
            "iast": example.get("iast", ""),
            "gloss": example.get("gloss", ""),
            "derivation": der,
        }
    join = (example.get("sandhi_join") or "").strip()
    if join:
        try:
            splits = split_candidates(join)
        except Exception:  # noqa: BLE001
            return None
        if not splits:
            logger.info("lesson example dropped (no sandhi split): %s", dev)
            return None
        return {
            "devanagari": dev,
            "iast": example.get("iast", ""),
            "gloss": example.get("gloss", ""),
            "derivation": {"splits": splits[:3]},
        }
    # No verifiable claim attached — prose-only illustration, stored without
    # a derivation. The client renders it without a SutraCard.
    return {
        "devanagari": dev,
        "iast": example.get("iast", ""),
        "gloss": example.get("gloss", ""),
        "derivation": None,
    }


def get_lesson(db: Session, feature_id: str) -> Optional[Lesson]:
    return db.query(Lesson).filter(Lesson.feature_id == feature_id).first()


def get_lesson_by_id(db: Session, lesson_id: str) -> Optional[Lesson]:
    return db.query(Lesson).filter(Lesson.id == lesson_id).first()


def list_units(db: Session):
    from app.models import Unit

    return db.query(Unit).order_by(Unit.rank).all()


def list_lessons(db: Session, unit_id: Optional[str] = None):
    q = db.query(Lesson).order_by(Lesson.unit_id, Lesson.rank)
    if unit_id:
        q = q.filter(Lesson.unit_id == unit_id)
    return q.all()


def get_step(db: Session, lesson_id: str, rank: int):
    from app.models import LessonStep

    return (
        db.query(LessonStep)
        .filter(LessonStep.lesson_id == lesson_id, LessonStep.rank == rank)
        .first()
    )


def serve_step(db: Session, lesson_id: str, rank: int) -> Optional[dict[str, Any]]:
    """The ordered step, already ``generate``d where its kind is generated.

    The answer is never in the payload — ``grade`` rebuilds it from the
    same seed. An engine miss serves an abstention-shaped step, never a
    broken exercise (§2.2)."""
    from app.services import exercise_gen

    step = get_step(db, lesson_id, rank)
    if step is None:
        return None
    if step.kind in PRACTICE_KINDS:
        return {"rank": step.rank, "kind": step.kind,
                "payload": step.payload or {}, "abstained": False}
    gen = (step.payload or {}).get("gen") or {}
    try:
        item = exercise_gen.generate(
            gen.get("kind") or step.kind, gen.get("params") or {},
            int(gen.get("seed") or 0))
    except ValueError:
        return {"rank": step.rank, "kind": step.kind,
                "payload": {}, "abstained": True,
                "reason": "samasa/karaka need the analyzer"}
    return {"rank": step.rank, "kind": step.kind,
            "payload": item, "abstained": bool(item.get("abstained"))}


def attempt_step(db: Session, learner, lesson_id: str, rank: int,
                 answer: dict[str, Any]) -> dict[str, Any]:
    """Grade one step; write mastery AND the review schedule (P23-3).

    Returns {"verdict", "abstained", "mastery", "due_at", "item_key"}.
    ``explain`` steps carry nothing to answer: attempting one is a no-op
    that reports correct without touching mastery or schedule, so the
    client can treat "read" as complete without a special case. The
    practice kinds (``build`` / ``articulate`` / ``read``) are the same
    no-op: the client renders the sandbox component and practice is never
    assessment (§2.2 — no grader the engine can honestly support exists
    for them yet, so none is invented).
    """
    from app import adaptive
    from app.services import exercise_gen
    from app.services.review import schedule_review

    lesson = get_lesson_by_id(db, lesson_id)
    if lesson is None:
        return {"missing": "lesson"}
    step = get_step(db, lesson_id, rank)
    if step is None:
        return {"missing": "step"}

    features = (step.grading or {}).get("features") or lesson.features or []
    if isinstance(features, str):
        features = [features]
    if not features and lesson.feature_id:
        features = [lesson.feature_id]
    item_key = f"step:{lesson_id}:{rank}"

    if step.kind in PRACTICE_KINDS:
        return {"verdict": "correct", "abstained": False, "graded": False,
                "mastery": dict(learner.feature_mastery or {}),
                "due_at": None, "item_key": item_key}

    gen = (step.payload or {}).get("gen") or {}
    try:
        verdict = exercise_gen.grade(
            gen.get("kind") or step.kind, gen.get("params") or {},
            int(gen.get("seed") or 0), dict(answer or {}))
    except ValueError as e:
        return {"error": str(e)}

    mastery = adaptive.update_mastery(
        learner, list(features),
        verdict.get("verdict", "unsure"), bool(verdict.get("abstained")))
    # Graded steps are real practice: feed the daily goal bar + calendar.
    # Practice kinds return early above and never reach here by design.
    from app.services.activity import record_activity, xp_for_challenge_verdict
    record_activity(
        db,
        learner,
        xp=xp_for_challenge_verdict(
            verdict.get("verdict", "unsure"), bool(verdict.get("abstained"))),
        attempts=1,
    )
    db.flush()
    row = schedule_review(db, learner.id, item_key, "step",
                          verdict.get("verdict", "unsure"),
                          bool(verdict.get("abstained")))
    db.flush()
    due_at = None
    if row is not None and row.due_at is not None:
        due = row.due_at
        due_at = due.isoformat() if hasattr(due, "isoformat") else str(due)
    return {"verdict": verdict.get("verdict", "unsure"),
            "abstained": bool(verdict.get("abstained")),
            "graded": True,
            "mastery": mastery,
            "due_at": due_at,
            "item_key": item_key}


def lesson_feature_ids(db: Session) -> set[str]:
    """Feature ids that have a lesson — the P22-4 ``has_lesson`` contract."""
    return {r[0] for r in db.query(Lesson.feature_id).all()}
