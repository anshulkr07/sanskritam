"""Advertising endpoints, on their own switch (COMMERCE_ADS_ENABLED) so ads can
launch before purchases. Native and full-screen ads need no ticket; rewarded
ads still need commerce. Book and audiobook previews are a fixed 5% for
everyone (commerce/preview.py), so an ad no longer opens more of a paid edition
(owner, 2026-11-06); rewarded ads give more Ask answers and practice time."""
from __future__ import annotations

import logging
from datetime import timedelta
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.auth import require_learner
from app.config import settings
from app.db import get_db
from app.models import Learner
from app.commerce import service as svc
from app.commerce.ad_policy import eligibility
from app.commerce.models import AdGrant, Title
from app.commerce.router import decode, enabled, sign

log = logging.getLogger(__name__)
router = APIRouter(prefix="/commerce/ads", tags=["Advertising"])


@router.get("/eligibility")
def ad_eligibility(title_id: str = "", learner: Learner = Depends(require_learner), db: Session = Depends(get_db)):
    # listen_ad_minutes: listening time between full-screen ads in the
    # audiobook player (the app shows the first after half of it).
    return {**eligibility(db, learner.id, title_id), "listen_ad_minutes": max(5, settings.commerce_listen_ad_minutes)}


class AdBody(BaseModel):
    title_id: str = Field(default="", max_length=160)
    # "ask": more of today's own AI allowance (services/quota.ad_bonus).
    kind: Literal["practice", "ask"]
    target: str = Field(default="", max_length=100)


def _rewarded_today(db, learner_id):
    midnight = svc.now().replace(hour=0, minute=0, second=0, microsecond=0)
    # Count issued tickets too, so concurrent requests cannot pass the cap.
    return db.query(AdGrant).filter_by(learner_id=learner_id).filter(
        AdGrant.created_at >= midnight, AdGrant.kind != "native",
        or_(AdGrant.transaction_id.isnot(None), AdGrant.expires_at > svc.now())).count()


@router.get("/ask-topup")
def ask_topup(learner: Learner = Depends(require_learner), db: Session = Depends(get_db)):
    """Whether "Watch an ad to keep asking" can help right now: ads on, a
    rewarded view left today, and room in the shared Gemini budget (when that
    is spent, more personal allowance would not get an answer)."""
    from app.services.quota import gemini_headroom_inr
    if not settings.commerce_enabled or not eligibility(db, learner.id)["allowed"]:
        return {"available": False, "left_today": 0}
    left = max(0, 3 - _rewarded_today(db, learner.id))
    return {"available": bool(left and gemini_headroom_inr(db) > 2), "left_today": left}


@router.post("/ticket")
def ad_ticket(body: AdBody, learner: Learner = Depends(require_learner), db: Session = Depends(get_db)):
    """A signed rewarded-ad ticket; Google hands it back in the server callback."""
    enabled()
    svc.lock_wallet(db, learner.id)
    if not eligibility(db, learner.id, body.title_id if body.kind != "ask" else "")["allowed"]:
        raise HTTPException(403, "Advertising is unavailable for this account or purchased edition")
    title = db.get(Title, body.title_id) if body.kind != "ask" else None
    if body.kind != "ask" and not title:
        raise HTTPException(404, "Unknown title")
    target = body.target
    if _rewarded_today(db, learner.id) >= 3:
        raise HTTPException(429, "Daily advertising limit reached")
    row = AdGrant(learner_id=learner.id, title_id=body.title_id, kind=body.kind, target=target,
                  expires_at=svc.now() + timedelta(minutes=15))
    db.add(row)
    db.flush()
    token = sign({"scope": "ad", "sub": learner.id, "id": row.id, "exp": row.expires_at})
    db.commit()
    return {"ticket": token, "id": row.id}


@router.get("/ssv")
async def ad_callback(request: Request, db: Session = Depends(get_db)):
    """AdMob server-side verification. 401 only when Google did not sign it;
    every signed callback gets 200, granting only when everything checks out."""
    from app.commerce import ads as admob
    data = await admob.verify_callback(request.url.query)

    def ignored(reason):
        log.info("AdMob reward callback granted nothing: %s", reason)
        return {"ok": False, "ignored": reason}

    problem = admob.reward_problem(data)
    if problem:
        return ignored(problem)
    try:
        # A signed retry stays idempotent after the ticket's 15-minute window;
        # the expiry check below still stops a late callback granting anew.
        payload = decode(data["custom_data"], "ad", allow_expired=True)
    except HTTPException:
        return ignored("unknown reward ticket")
    svc.lock_wallet(db, payload["sub"])
    row = db.get(AdGrant, payload["id"])
    if not row or row.learner_id != payload["sub"] or row.kind == "native":
        return ignored("unknown reward")
    if row.transaction_id:
        return {"ok": True} if row.transaction_id == data["transaction_id"] else ignored("reward already claimed")
    if row.expires_at <= svc.now():
        return ignored("reward ticket expired")
    if db.query(AdGrant).filter_by(transaction_id=data["transaction_id"]).first():
        return ignored("transaction already used")
    row.transaction_id = data["transaction_id"]
    row.expires_at = svc.now() + timedelta(hours=24)
    db.commit()
    return {"ok": True}


@router.get("/{grant_id}")
def reward_status(grant_id: str, learner: Learner = Depends(require_learner), db: Session = Depends(get_db)):
    row = db.get(AdGrant, grant_id)
    if not row or row.learner_id != learner.id:
        raise HTTPException(404, "Unknown reward")
    return {"verified": bool(row.transaction_id and row.expires_at > svc.now()), "expires_at": row.expires_at}
