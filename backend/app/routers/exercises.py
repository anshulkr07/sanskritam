"""P23-2 · Generated-exercise endpoints (no table, no review queue).

``POST /exercises/generate`` builds the renderable item for
(kind, params, seed) — the answer is never in it. ``POST /exercises/grade``
regenerates the same item from the same seed and compares.

LOCAL computation (vidyut, ₹0) — no quota, no vendor call. Do NOT add
metering here (HANDOVER §2.9 / LESSON_OVERHAUL P23-2).
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.auth import require_learner
from app.db import get_db
from app.models import Learner
from app.services import exercise_gen
from sqlalchemy.orm import Session

router = APIRouter(prefix="/exercises")


class GenerateRequest(BaseModel):
    kind: str
    params: dict = Field(default_factory=dict)
    seed: int = 0


class GradeRequest(BaseModel):
    kind: str
    params: dict = Field(default_factory=dict)
    seed: int = 0
    answer: dict = Field(default_factory=dict)


@router.get("/kinds")
async def list_kinds(_learner: Learner = Depends(require_learner)):
    """The gradable step kinds the client can render."""
    return {"kinds": list(exercise_gen.SUPPORTED_KINDS)}


@router.post("/generate")
async def generate_exercise(
    req: GenerateRequest,
    _learner: Learner = Depends(require_learner),
):
    try:
        return exercise_gen.generate(req.kind, req.params, req.seed)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/grade")
async def grade_exercise(
    req: GradeRequest,
    learner: Learner = Depends(require_learner),
    db: Session = Depends(get_db),
):
    try:
        result = exercise_gen.grade(req.kind, req.params, req.seed, req.answer)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    # Standalone practice still moves the daily goal bar + calendar.
    from app.services.activity import record_activity, xp_for_challenge_verdict
    record_activity(
        db,
        learner,
        xp=xp_for_challenge_verdict(
            result.get("verdict", "unsure"), bool(result.get("abstained"))),
        attempts=1,
    )
    db.commit()
    return result
