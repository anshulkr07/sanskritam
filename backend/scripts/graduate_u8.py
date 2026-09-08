"""Graduate 3 staged U8 rows to curated lessons (2026-09-08 curation packet).

Implements `results/u8-curation-packet.md` (owner-approved whole-unit
batch): U8-0 imperative, U8-1 imperfect, U8-2 future + the u8→u2 re-map
of the miscategorized overview row.

Two-phase: verify EVERY example against the engine first; write nothing
unless all verify. Idempotent by provenance — re-running graduates
nothing twice (graduated rows no longer carry the [staged] title).

Content lives in ONE place: ``app.seeds.lessons.SEED_LESSONS`` (the U8
rows). This script reads the specs from there, so the DB graduation and
fresh-DB seeding can never disagree. Staged rows keep
provenance=learnsanskrit:<section> + attribution key (CC BY 4.0):
adaptation, not copy.

Usage (from backend/): python -m scripts.graduate_u8 [--live]
Dry-run (default) verifies + prints the plan. --live writes.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

if __package__ in (None, ""):  # allow `python scripts/graduate_u8.py`
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.seeds.lessons import SEED_LESSONS  # noqa: E402

# Packet T5: the overview row is not a tense lesson.
REMAP = {"learnsanskrit:guide-core-the-sanskrit-language": "u2"}

U8_PROVENANCE = {
    "learnsanskrit:guide-verbs-1-the-command-mood",
    "learnsanskrit:guide-verbs-1-the-ordinary-past-tense",
    "learnsanskrit:guide-verbs-2-the-simple-future-tense",
}


def _specs() -> list[dict]:
    specs = [r for r in SEED_LESSONS
             if r.get("provenance") in U8_PROVENANCE]
    assert len(specs) == 3, f"expected 3 U8 seed rows, got {len(specs)}"
    return specs


def _explain(text: str) -> str:
    first = (text or "").split("\n\n")[0].strip()
    words = first.split()
    return " ".join(words[:120])


def plan(db) -> dict:
    """Verify everything first. Returns {lessons, errors} — errors non-empty
    means write nothing."""
    from app.models import Lesson
    from app.services import iast as _iast
    from app.services.lessons import verify_example

    lessons = []
    errors = []
    for spec in _specs():
        row = db.query(Lesson).filter(
            Lesson.provenance == spec["provenance"]).first()
        if row is None:
            errors.append(f"missing staged row {spec['provenance']}")
            continue
        if not (row.title_en or "").startswith("[staged]"):
            continue  # already graduated — idempotent skip
        verified = []
        for ex in spec["examples"]:
            v = verify_example(dict(ex))
            if v is None:
                errors.append(f"{spec['provenance']}: engine cannot derive "
                              f"{ex['devanagari']} — write nothing")
                continue
            v["iast"] = _iast.to_iast(v["devanagari"])
            verified.append(v)
        lessons.append({"row": row, "spec": spec, "examples": verified})
    return {"lessons": lessons, "errors": errors}


def apply(db, planned: dict) -> dict:
    """Write graduation. Caller must have checked errors == []."""
    from app.models import Lesson, LessonStep

    n_steps = 0
    for item in planned["lessons"]:
        row, spec = item["row"], item["spec"]
        row.title_en = spec["title_en"]
        row.title_hi = spec["title_hi"]
        row.body = spec["body"]
        row.feature_id = spec["feature_id"]
        row.features = spec["features"]
        row.rank = spec["rank"]
        row.examples = item["examples"]
        row.visual_type = "none"
        row.visual_data = {}
        step0 = db.query(LessonStep).filter(
            LessonStep.lesson_id == row.id, LessonStep.rank == 0).first()
        if step0 is not None:
            step0.payload = {"text": _explain(spec["body"])}
            n_steps += 1
    n_remap = 0
    for prov, unit in REMAP.items():
        row = db.query(Lesson).filter(Lesson.provenance == prov).first()
        if row is not None and row.unit_id != unit:
            row.unit_id = unit
            n_remap += 1
    db.commit()
    return {"lessons": len(planned["lessons"]), "steps_touched": n_steps,
            "remapped": n_remap}


def main(argv=None) -> int:
    p = argparse.ArgumentParser(prog="graduate_u8",
                                description="Graduate 3 staged U8 rows (dry-run default).")
    p.add_argument("--live", action="store_true", help="write rows (default dry-run)")
    args = p.parse_args(argv)
    from app.db import SessionLocal

    db = SessionLocal()
    try:
        planned = plan(db)
        print(f"[u8] {len(planned['lessons'])} lesson(s) to graduate, "
              f"{len(planned['errors'])} error(s)")
        for e in planned["errors"]:
            print(f"[u8] ERROR: {e}")
        if planned["errors"]:
            return 1
        for item in planned["lessons"]:
            s = item["spec"]
            print(f"[u8]   {s['provenance']} -> {s['title_en']} "
                  f"({len(item['examples'])}/{len(s['examples'])} examples verify)")
        if not args.live:
            print("[u8] DRY-RUN (nothing written)")
            return 0
        rep = apply(db, planned)
        print(f"[u8] LIVE: {rep['lessons']} graduated, "
              f"{rep['steps_touched']} explain steps refreshed, "
              f"{rep['remapped']} remapped")
    finally:
        db.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
