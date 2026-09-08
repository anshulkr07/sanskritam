"""Notify endpoints (P13): token collection + the daily job trigger.

- ``POST /me/push-tokens`` — register/replace one device token (learner auth).
- ``DELETE /me/push-tokens`` — remove one device (learner auth).
- ``POST /admin/notify/run`` — run one pass of the daily-notify job (admin).
  In production this is a scheduled-job runner hitting this endpoint; the send
  itself is the job (P13-1: a job, not a request path). No push vendor is
  called here — without transport configured the run is a dry-run ledger
  pass, which still exercises idempotency. NEVER any learner content in the
  request or response beyond the token itself.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.auth import require_admin, require_learner
from app.db import get_db
from app.models import Learner, PushToken
from app.schemas import PushTokenRequest, PushTokenResponse
from app.services.notify import ignored_streak, register_token, run_notify_job

router = APIRouter()


@router.post("/me/push-tokens", response_model=PushTokenResponse)
async def post_push_token(
    req: PushTokenRequest,
    learner: Learner = Depends(require_learner),
    db: Session = Depends(get_db),
):
    """Register or replace this device's push token (P13-1)."""
    row = register_token(db, learner, req.device_id, req.token, req.platform)
    return PushTokenResponse(device_id=row.device_id, platform=row.platform or "", dead=bool(row.dead))


@router.delete("/me/push-tokens")
async def delete_push_token(
    device_id: str = Query(""),
    learner: Learner = Depends(require_learner),
    db: Session = Depends(get_db),
):
    """Remove one device token (e.g. logout). Never an error when absent."""
    db.query(PushToken).filter(
        PushToken.learner_id == learner.id,
        PushToken.device_id == (device_id or ""),
    ).delete()
    db.commit()
    return {"removed": True}


@router.post("/admin/notify/run")
async def run_notify(
    kind: str = Query("reminder"),
    _auth: bool = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Run one pass of the daily-notify job (P13-1). Dry-run ledger pass when
    no push transport is configured — idempotent either way."""
    result = run_notify_job(db, transport=None, kind=kind or "reminder")
    return result


@router.get("/admin/notify/ignored/{learner_id}")
async def get_ignored(
    learner_id: str,
    _auth: bool = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Inspect one learner's ignore-decay streak (P13-1: stop after a few)."""
    return {"learner_id": learner_id, "ignored_streak": ignored_streak(db, learner_id)}
