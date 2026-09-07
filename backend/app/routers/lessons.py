"""Lesson endpoints (P22-1): GET /lessons/{feature_id}.

One lesson per feature. A feature with no lesson returns an honest 404
(never a blank — §2.11). LOCAL computation — no quota (§2.9): the examples
were verified at seed time, so serving is a row read.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import require_learner
from app.db import get_db
from app.models import Learner
from app.schemas import LessonExample, LessonResponse
from app.services.lessons import get_lesson

router = APIRouter()


@router.get("/lessons/{feature_id}", response_model=LessonResponse)
async def read_lesson(
    feature_id: str,
    learner: Learner = Depends(require_learner),
    db: Session = Depends(get_db),
):
    """Return the lesson teaching ``feature_id`` with Vidyut-verified examples."""
    lesson = get_lesson(db, feature_id)
    if lesson is None:
        raise HTTPException(status_code=404, detail=f"no lesson yet for {feature_id}")
    return LessonResponse(
        feature_id=lesson.feature_id,
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
    )
