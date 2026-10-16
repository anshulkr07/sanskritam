"""Admin endpoints: create/list challenges, metrics."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth import require_admin
from app.db import get_db
from app.models import Challenge
from app.schemas import ChallengeResponse, CreateChallengeRequest
from app.services import iast
from app.routers.explain import explain_metrics
from app.routers.speech import tts_cache_metrics
from app.services.metrics import escape_rate, tts_share, top_escape_nodes
from app.services.quota import budget_status
from app.services.content_well import content_well_report
from app.services.retention import day2_return, p8_report

router = APIRouter()


from pydantic import BaseModel, Field


class CommunityModerationBody(BaseModel):
    suspended: bool
    remove_photo: bool = False
    reason: str = Field(min_length=5, max_length=1000)


@router.put("/admin/community/learners/{uid}")
def moderate_learner(uid: str, body: CommunityModerationBody,
                     _auth: bool = Depends(require_admin), db: Session = Depends(get_db)):
    from app.models import Learner, ContentReport
    from app.routers.community import notify
    from app.services.storage import get_storage
    learner = db.query(Learner).filter_by(id=uid).with_for_update().one_or_none()
    if not learner:
        raise HTTPException(404, "Learner not found.")
    if len(body.reason.strip()) < 5:
        raise HTTPException(422, "Give a reason for the moderation decision.")
    learner.community_suspended = body.suspended
    key = learner.avatar_key if body.remove_photo else None
    if key:
        learner.avatar_key = None
    db.add(ContentReport(learner_id=uid, surface="group_admin",
                         question=f"Community access for {uid}",
                         answer=f"suspended={body.suspended}; remove_photo={body.remove_photo}",
                         reason=body.reason.strip()))
    notify(db)
    db.commit()
    if key:
        try:
            get_storage().delete_private(key)
        except Exception:
            pass
    return {"id": uid, "suspended": body.suspended, "photo_removed": bool(key)}


@router.post("/admin/challenges", response_model=ChallengeResponse)
async def create_challenge(
    req: CreateChallengeRequest,
    _auth: bool = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Create a new challenge (admin only).

    P7-13: an omitted/empty target_iast is derived from lipi rather than
    stored empty; an explicitly supplied value is still honoured for a human
    admin who hand-corrects one row.
    """
    challenge = Challenge(
        id=uuid.uuid4().hex[:16],
        prompt_l1=req.prompt_l1,
        prompt_lang=req.prompt_lang,
        target_sanskrit=req.target_sanskrit,
        target_iast=req.target_iast or iast.to_iast(req.target_sanskrit),
        features=req.features,
        accepted_parses=req.accepted_parses if req.accepted_parses else [],
        register=req.linguistic_register,
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
def list_admin_challenges(
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
def get_metrics(
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
        "explain": explain_metrics(),
        # Rupees spent against each vendor's ceiling in the quota window.
        "spend": budget_status(db),
        "tts_cache": tts_cache_metrics(),
        "writing": writing_abstention(db),
        "retention": day2_return(db),
        "p8": p8_report(db, hours=max(hours, 168)),
    }


def writing_abstention(db: Session) -> dict:
    """P20-4: writing-attempt abstention rate, split by source.

    If the photo path abstains on most attempts it is not helping, and that
    should be a number the owner can see, not a suspicion.
    """
    from app.models import WritingAttempt

    rows = (
        db.query(WritingAttempt.source, WritingAttempt.verdict, func.count(WritingAttempt.id))
        .group_by(WritingAttempt.source, WritingAttempt.verdict)
        .all()
    )
    by_source: dict[str, dict[str, int]] = {}
    for source, verdict, n in rows:
        s = source or "ink"
        by_source.setdefault(s, {"attempts": 0, "unsure": 0, "correct": 0, "wrong": 0})
        by_source[s]["attempts"] += n
        if verdict in ("unsure", "correct", "wrong"):
            by_source[s][verdict] += n
    out = {}
    for s, v in by_source.items():
        total = v["attempts"]
        out[s] = {
            **v,
            "abstention_rate": round(v["unsure"] / total, 4) if total else 0.0,
        }
    return out


@router.get("/admin/content-wells")
def get_content_wells(
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


@router.get("/admin/reports")
def list_content_reports(
    limit: int = Query(50, ge=1, le=200),
    _auth: bool = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Learner-flagged AI replies, newest first — the Play policy queue."""
    from app.models import ContentReport

    rows = (
        db.query(ContentReport)
        .order_by(ContentReport.created_at.desc(), ContentReport.id.desc())
        .limit(limit)
        .all()
    )
    return {
        "count": len(rows),
        "reports": [
            {
                "id": r.id,
                "learner_id": r.learner_id,
                "surface": r.surface,
                "question": r.question,
                "answer": r.answer,
                "reason": r.reason,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in rows
        ],
    }


@router.get("/admin/errors")
def get_recent_errors(
    limit: int = Query(50, ge=1, le=200),
    _auth: bool = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Recent server crashes (P8-2) — route, type, traceback; no learner
    content is ever written to this table. Newest first."""
    from app.models import ErrorLog

    rows = db.query(ErrorLog).order_by(ErrorLog.ts.desc(), ErrorLog.id.desc()).limit(limit).all()
    return {
        "count": len(rows),
        "errors": [
            {
                "id": r.id,
                "ts": r.ts.isoformat() if r.ts else None,
                "route": r.route,
                "error_type": r.error_type,
                "detail": r.detail,
                "traceback": r.traceback,
                "request_id": r.request_id,
            }
            for r in rows
        ],
    }
