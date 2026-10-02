"""Content reports: flag AI-generated replies without leaving the app.

Google Play's AI-Generated Content policy requires in-app reporting for
chatbots. POST /feedback/report stores one row and returns 204. Every new
endpoint uses require_learner. Nothing here logs a place or a screen's text —
a report carries only the question, the answer and an optional reason.

The daily cards are written by a model too, so they can be flagged the same
way: surface "fact" (question = the card's id, answer = the fact) and
surface "word" (question = the route's id, answer = the word).
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth import require_learner
from app.db import get_db
from app.models import ContentReport, Learner

router = APIRouter()

#: Reports a learner may file per UTC day.
REPORTS_PER_DAY = 20

#: Each field is clipped to this many characters, client and server.
MAX_FIELD = 2000


class ReportRequest(BaseModel):
    surface: str = Field(..., pattern="^(talk|ask|fact|word)$")
    question: str = ""
    answer: str = ""
    reason: str = ""


@router.post("/feedback/report", status_code=204)
def report_content(
    req: ReportRequest,
    learner: Learner = Depends(require_learner),
    db: Session = Depends(get_db),
):
    """Flag a tutor reply, an Ask answer or a daily card. Returns 204, always."""
    day_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today = (
        db.query(func.count(ContentReport.id))
        .filter(
            ContentReport.learner_id == learner.id,
            ContentReport.created_at >= day_start,
        )
        .scalar()
    ) or 0
    if today >= REPORTS_PER_DAY:
        raise HTTPException(status_code=429, detail="Report limit reached. Try again tomorrow.")
    db.add(ContentReport(
        learner_id=learner.id,
        surface=req.surface,
        question=(req.question or "")[:MAX_FIELD],
        answer=(req.answer or "")[:MAX_FIELD],
        reason=(req.reason or "")[:MAX_FIELD],
    ))
    db.commit()
    return None
