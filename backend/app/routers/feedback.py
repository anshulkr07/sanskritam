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
import json
import logging
import uuid
from collections import deque
from threading import Lock
from time import monotonic

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth import require_learner
from app.db import get_db
from app.models import ContentReport, ErrorLog, Learner

router = APIRouter()

#: Reports a learner may file per UTC day.
REPORTS_PER_DAY = 20

#: Each field is clipped to this many characters, client and server.
MAX_FIELD = 2000


class ClientErrorRequest(BaseModel):
    # Identifiers only: no arbitrary exception messages or screen content.
    route: str = Field(max_length=80, pattern=r"^[A-Za-z][A-Za-z0-9_]*$")
    error_type: str = Field(pattern=r"^(Error|TypeError|RangeError|ReferenceError|SyntaxError)$")
    components: list[str] = Field(default_factory=list, max_length=20)


_client_error_times: deque[float] = deque()
_client_error_lock = Lock()


@router.post("/feedback/client-error", status_code=204)
def report_client_error(
    req: ClientErrorRequest,
    learner: Learner = Depends(require_learner),
    db: Session = Depends(get_db),
):
    """Render failures visible in Cloud Logging and /admin/errors, without content."""
    import re

    if any(not re.fullmatch(r"[A-Za-z][A-Za-z0-9_]{0,79}", c) for c in req.components):
        raise HTTPException(status_code=422, detail="Component names must be identifiers")
    # A crash loop must not fill the database or Cloud Logging. Global,
    # bounded per process, without retaining learner identifiers.
    with _client_error_lock:
        now = monotonic()
        while _client_error_times and now - _client_error_times[0] >= 60:
            _client_error_times.popleft()
        if len(_client_error_times) >= 60:
            raise HTTPException(status_code=429, detail="Diagnostic limit reached")
        _client_error_times.append(now)
    rid = uuid.uuid4().hex
    components = " > ".join(req.components)
    db.add(ErrorLog(route=f"mobile/{req.route}", error_type=req.error_type,
                    detail="Client render failure", traceback=components, request_id=rid))
    db.commit()
    logging.getLogger("shabd.client").error("client_render_error %s", json.dumps({
        "request_id": rid, "route": req.route, "error_type": req.error_type,
        "components": req.components,
    }))
    return None


class ReportRequest(BaseModel):
    surface: str = Field(..., pattern="^(talk|ask|fact|word|voice-lab)$")
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
    report = ContentReport(
        learner_id=learner.id,
        surface=req.surface,
        question=(req.question or "")[:MAX_FIELD],
        answer=(req.answer or "")[:MAX_FIELD],
        reason=(req.reason or "")[:MAX_FIELD],
    )
    db.add(report)
    db.commit()
    logging.getLogger("shabd.safety").warning("safety_report_queued report_id=%s", report.id)
    return None
