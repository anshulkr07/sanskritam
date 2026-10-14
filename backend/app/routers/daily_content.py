"""Daily content endpoints: the "Do you know" fact, and the job that keeps
both daily cards stocked.

For learners (read-only, like /story and /word-origins: no XP, no mastery,
no quota, no writes):

``GET /facts/today``      today's fact for the learner's local day
``GET /facts``            earlier facts, newest first
``GET /facts/{fact_id}``  one fact

For the scheduler and the owner (header ``X-Admin-Token``):

``POST /admin/content/tick``      move the pipeline one step (services/daily_content.py)
``GET  /admin/content/status``    stock, the last runs and what they did
``POST /admin/content/withdraw``  take one card down at once

The tick is a job, not a request path (as POST /admin/notify/run is). In
production a scheduler calls it every half hour; a call with nothing to do
costs two small queries. The handlers are plain ``def`` on purpose: the tick
opens web pages and waits on them, so it must run in the threadpool.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth import require_admin, require_learner
from app.db import get_db
from app.models import FactCard, Learner
from app.schemas import FactResponse, FactsResponse, FactSummary, FactTodayResponse
from app.services import daily_content as svc
from app.services.localtime import local_date

router = APIRouter()


def _fact(row: FactCard) -> FactResponse:
    return FactResponse(
        id=row.id,
        fact=row.fact or "",
        claim_kind=row.claim_kind or "",
        text_name=row.text_name or "",
        ref=row.ref or "",
        devanagari=row.devanagari or "",
        iast=row.iast or "",
        translation=row.translation or "",
        explanation=row.explanation or "",
        source_url=row.source_url or "",
        source_site=row.source_site or "",
        scheduled_date=row.scheduled_date or "",
    )


@router.get("/facts/today", response_model=FactTodayResponse)
def read_fact_today(
    learner: Learner = Depends(require_learner),
    db: Session = Depends(get_db),
):
    """Today's fact for the learner's local day."""
    day = local_date(learner.timezone)
    row = svc.fact_for_day(db, day)
    if row is None:
        return FactTodayResponse(date=day, available=False, fact=None)
    return FactTodayResponse(date=day, available=True, fact=_fact(row))


@router.get("/facts", response_model=FactsResponse)
def read_facts(
    learner: Learner = Depends(require_learner),
    db: Session = Depends(get_db),
):
    """Facts dated on or before today, newest first."""
    day = local_date(learner.timezone)
    query = (
        db.query(FactCard)
        .filter(FactCard.status == "approved", FactCard.scheduled_date <= day)
    )
    if query.filter(FactCard.made_by == "reviewed").first() is not None:
        query = query.filter(FactCard.made_by == "reviewed")
    rows = query.order_by(FactCard.scheduled_date.desc()).limit(6).all()
    return FactsResponse(facts=[
        FactSummary(id=r.id, fact=r.fact or "", text_name=r.text_name or "",
                    ref=r.ref or "", scheduled_date=r.scheduled_date or "")
        for r in rows
    ])


@router.get("/facts/{fact_id}", response_model=FactResponse)
def read_fact(
    fact_id: str,
    learner: Learner = Depends(require_learner),
    db: Session = Depends(get_db),
):
    """One fact, or 404 if unknown, withdrawn or dated after today."""
    day = local_date(learner.timezone)
    row = db.query(FactCard).filter(FactCard.id == fact_id).first()
    if row is None or (row.status or "") != "approved" or (row.scheduled_date or "9999") > day:
        raise HTTPException(status_code=404, detail="unknown fact")
    return _fact(row)


# ─── The job ────────────────────────────────────────────────────────────────

@router.post("/admin/content/tick")
def run_content_tick(
    _auth: bool = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Move the daily-content pipeline one step. Safe to call at any time."""
    return svc.tick(db)


@router.get("/admin/content/status")
def read_content_status(
    _auth: bool = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Stock of each kind, the last ten runs and what each did."""
    return svc.status(db)


class WithdrawRequest(BaseModel):
    kind: str = Field(..., pattern="^(fact|word|route)$")
    id: str


@router.post("/admin/content/withdraw")
def withdraw_content(
    req: WithdrawRequest,
    _auth: bool = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Take one card down at once: a fact, a whole Sanskrit word, or one
    route of a word. The row is kept and is not proposed again. A word that
    comes from a batch file returns at the next start; edit the file instead.
    """
    if not svc.withdraw(db, req.kind, req.id):
        raise HTTPException(status_code=404, detail="unknown card")
    return {"withdrawn": True, "kind": req.kind, "id": req.id}
