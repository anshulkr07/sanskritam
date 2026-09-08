"""Lesson endpoints (P22-1, P23-3): units, lessons, steps, attempts.

P22-1's ``GET /lessons/{feature_id}`` stays — Path.tsx and the ``has_lesson``
contract (P22-4) depend on it, and its 404 is honest and must stay honest.
P23-3 adds the spine a step player needs:

- ``GET /units`` — the eleven units, ranked, each with its lessons and
  per-unit progress.
- ``GET /lessons`` — list, filterable by ``unit_id``.
- ``GET /lessons/{id}/steps`` — the ordered steps, each already ``generate``d
  where its kind is generated (the answer is never in the payload).
- ``POST /lessons/{id}/steps/{rank}/attempt`` — grades one step, writes
  mastery AND the review schedule.

LOCAL computation — no quota (§2.9): examples were verified at seed time
and exercises regenerate from the engine, so serving is reads + vidyut.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.auth import require_learner
from app.db import get_db
from app.models import Learner, LessonStep
from app.schemas import (
    LessonExample,
    LessonResponse,
    LessonSummary,
    StepAttemptRequest,
    StepAttemptResponse,
    StepResponse,
    UnitResponse,
)
from app.services import lessons as lesson_service

router = APIRouter()


def _step_count(db: Session, lesson_id: str) -> int:
    return db.query(LessonStep).filter(LessonStep.lesson_id == lesson_id).count()


def _summary(db: Session, lesson) -> LessonSummary:
    return LessonSummary(
        id=lesson.id,
        feature_id=lesson.feature_id,
        features=list(lesson.features or ([lesson.feature_id] if lesson.feature_id else [])),
        unit_id=lesson.unit_id,
        rank=lesson.rank or 0,
        title_en=lesson.title_en or "",
        title_hi=lesson.title_hi or "",
        register=lesson.register or "laukika",
        step_count=_step_count(db, lesson.id),
        attribution=lesson.attribution or "",
    )


def _unit_progress(lesson_summaries: list[LessonSummary],
                   mastery: dict) -> float:
    if not lesson_summaries:
        return 0.0
    scores = []
    for s in lesson_summaries:
        feats = s.features or [s.feature_id]
        vals = [mastery.get(f) for f in feats
                if isinstance(mastery.get(f), (int, float))]
        scores.append(sum(vals) / len(vals) if vals else 0.0)
    return round(sum(scores) / len(scores), 3) if scores else 0.0


@router.get("/units", response_model=list[UnitResponse])
async def read_units(
    learner: Learner = Depends(require_learner),
    db: Session = Depends(get_db),
):
    """The eleven units, ranked, each with its lessons and per-unit progress."""
    mastery = learner.feature_mastery if isinstance(learner.feature_mastery, dict) else {}
    out = []
    for unit in lesson_service.list_units(db):
        lessons = [_summary(db, l) for l in
                   lesson_service.list_lessons(db, unit.id)]
        out.append(UnitResponse(
            id=unit.id,
            rank=unit.rank or 0,
            layer=unit.layer if unit.layer is not None else 1,
            title_en=unit.title_en or "",
            title_hi=unit.title_hi or "",
            blurb=unit.blurb or "",
            lessons=lessons,
            progress=_unit_progress(lessons, mastery),
        ))
    return out


@router.get("/lessons", response_model=list[LessonSummary])
async def read_lessons(
    unit_id: str | None = Query(None, description="filter to one unit, e.g. u2"),
    learner: Learner = Depends(require_learner),  # noqa: F841 — auth-bound like /shlokas
    db: Session = Depends(get_db),
):
    """List lessons, optionally filtered by unit."""
    return [_summary(db, l) for l in lesson_service.list_lessons(db, unit_id)]


@router.get("/lessons/{lesson_id}/steps", response_model=list[StepResponse])
async def read_steps(
    lesson_id: str,
    learner: Learner = Depends(require_learner),  # noqa: F841
    db: Session = Depends(get_db),
):
    """The ordered steps, each already generated where its kind is generated."""
    lesson = lesson_service.get_lesson_by_id(db, lesson_id)
    if lesson is None:
        raise HTTPException(status_code=404, detail=f"no lesson {lesson_id}")
    steps = (
        db.query(LessonStep)
        .filter(LessonStep.lesson_id == lesson_id)
        .order_by(LessonStep.rank)
        .all()
    )
    out = []
    for s in steps:
        served = lesson_service.serve_step(db, lesson_id, s.rank) or {}
        out.append(StepResponse(
            rank=s.rank,
            kind=s.kind,
            payload=served.get("payload", s.payload or {}),
            abstained=bool(served.get("abstained")),
        ))
    return out


@router.post("/lessons/{lesson_id}/steps/{rank}/attempt",
             response_model=StepAttemptResponse)
async def attempt_step(
    lesson_id: str,
    rank: int,
    req: StepAttemptRequest,
    learner: Learner = Depends(require_learner),
    db: Session = Depends(get_db),
):
    """Grade one step; write mastery AND the review schedule (P23-3)."""
    result = lesson_service.attempt_step(db, learner, lesson_id, rank,
                                         dict(req.answer or {}))
    if result.get("missing") == "lesson":
        raise HTTPException(status_code=404, detail=f"no lesson {lesson_id}")
    if result.get("missing") == "step":
        raise HTTPException(status_code=404,
                            detail=f"no step {rank} in lesson {lesson_id}")
    if result.get("error"):
        raise HTTPException(status_code=400, detail=result["error"])
    db.commit()
    mastery = result.get("mastery") or {}
    clean = {k: float(v) for k, v in mastery.items()
             if isinstance(v, (int, float))}
    return StepAttemptResponse(
        verdict=result.get("verdict", "unsure"),
        abstained=bool(result.get("abstained")),
        mastery=clean,
        due_at=result.get("due_at"),
        item_key=result.get("item_key", ""),
    )


@router.get("/lessons/{feature_id}", response_model=LessonResponse)
async def read_lesson(
    feature_id: str,
    learner: Learner = Depends(require_learner),  # noqa: F841
    db: Session = Depends(get_db),
):
    """Return the lesson teaching ``feature_id`` with Vidyut-verified examples."""
    lesson = lesson_service.get_lesson(db, feature_id)
    if lesson is None:
        raise HTTPException(status_code=404, detail=f"no lesson yet for {feature_id}")
    return LessonResponse(
        id=lesson.id,
        feature_id=lesson.feature_id,
        features=list(lesson.features or ([lesson.feature_id] if lesson.feature_id else [])),
        unit_id=lesson.unit_id,
        rank=lesson.rank or 0,
        title_en=lesson.title_en or "",
        title_hi=lesson.title_hi or "",
        body=lesson.body or "",
        examples=[LessonExample(
            devanagari=e.get("devanagari", ""),
            iast=e.get("iast", ""),
            gloss=e.get("gloss", ""),
            derivation=e.get("derivation"),
        ) for e in (lesson.examples or [])],
        visual_type=lesson.visual_type or "none",
        visual_data=lesson.visual_data or {},
        audio_url=lesson.audio_url or "",
        register=lesson.register or "laukika",
        attribution=lesson.attribution or "",
    )
