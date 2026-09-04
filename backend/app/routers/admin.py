"""Admin endpoints: create/list challenges, metrics."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.auth import require_admin
from app.db import get_db
from app.models import Challenge
from app.schemas import ChallengeResponse, CreateChallengeRequest
from app.services.metrics import escape_rate, tts_share, top_escape_nodes
from app.services.content_well import content_well_report

router = APIRouter()


@router.post("/admin/challenges", response_model=ChallengeResponse)
async def create_challenge(
    req: CreateChallengeRequest,
    _auth: bool = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Create a new challenge (admin only)."""
    challenge = Challenge(
        id=uuid.uuid4().hex[:16],
        prompt_l1=req.prompt_l1,
        prompt_lang=req.prompt_lang,
        target_sanskrit=req.target_sanskrit,
        target_iast=req.target_iast,
        features=req.features,
        accepted_parses=req.accepted_parses if req.accepted_parses else [],
        register=req.register,
        audio_url=req.audio_url,
    )
    db.add(challenge)
    db.commit()
    db.refresh(challenge)

    return ChallengeResponse(
        id=challenge.id,
        prompt_l1=challenge.prompt_l1,
        prompt_lang=challenge.prompt_lang,
        target_sanskrit=challenge.target_sanskrit,
        target_iast=challenge.target_iast,
        features=challenge.features or [],
        audio_url=challenge.audio_url or "",
        register=challenge.register,
    )


@router.get("/admin/challenges", response_model=list[ChallengeResponse])
async def list_admin_challenges(
    _auth: bool = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """List all challenges (admin view)."""
    challenges = db.query(Challenge).all()
    return [
        ChallengeResponse(
            id=c.id,
            prompt_l1=c.prompt_l1,
            prompt_lang=c.prompt_lang,
            target_sanskrit=c.target_sanskrit,
            target_iast=c.target_iast,
            features=c.features or [],
            audio_url=c.audio_url or "",
            register=c.register,
        )
        for c in challenges
    ]


@router.get("/admin/metrics")
async def get_metrics(
    hours: int = Query(24, ge=1, le=168),
    _auth: bool = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Return aggregate metrics: escape rate, TTS source share, top escape nodes.

    Requires admin token.  Default window is 24 hours.
    """
    return {
        "escape_rate": escape_rate(db, hours=hours),
        "tts_share": tts_share(db, hours=hours),
        "top_escape_nodes": top_escape_nodes(db),
    }


@router.get("/admin/content-wells")
async def get_content_wells(
    _auth: bool = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Return daily-content-well health (P7-7).

    Per daily surface: rows total, rows remaining, and days of runway before
    the deterministic cycle repeats; plus approved/pending/rejected scenario
    counts. ``healthy`` is False when a floor is breached, naming the well —
    a red test is the mechanism, not an alerting dependency.
    """
    return content_well_report(db)