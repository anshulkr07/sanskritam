"""Learner profile endpoints: GET /me, PATCH /me, DELETE /me."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth import require_learner
from app.db import get_db
from app.models import Learner
from app.schemas import MeResponse, UpdateMeRequest, LearnerProfile

router = APIRouter()


def _profile(learner: Learner) -> LearnerProfile:
    effective = learner.sanskrit_ratio if learner.sanskrit_ratio is not None else 0.3
    setting = learner.sanskrit_ratio_setting
    if setting is None:
        # Legacy rows predate the ceiling column: the effective value IS the ceiling.
        setting = effective
    return LearnerProfile(
        id=learner.id,
        display_name=learner.display_name,
        bridge_langs=learner.bridge_langs or [],
        sanskrit_ratio=effective,
        sanskrit_ratio_setting=setting,
        script_ratio=learner.script_ratio if learner.script_ratio is not None else 0.3,
        feature_mastery=learner.feature_mastery or {},
        streak=learner.streak or 0,
        voice_minutes_used=learner.voice_minutes_used or 0.0,
        timezone=learner.timezone or "UTC",
    )


def _model(learner: Learner) -> dict:
    effective = learner.sanskrit_ratio if learner.sanskrit_ratio is not None else 0.3
    setting = learner.sanskrit_ratio_setting
    if setting is None:
        setting = effective
    return {
        "sanskrit_ratio": effective,
        "sanskrit_ratio_setting": setting,
        "script_ratio": learner.script_ratio if learner.script_ratio is not None else 0.3,
        "feature_mastery": learner.feature_mastery or {},
        "streak": learner.streak or 0,
        "bridge_langs": learner.bridge_langs or [],
    }


@router.get("/me", response_model=MeResponse)
async def get_me(learner: Learner = Depends(require_learner), db: Session = Depends(get_db)):
    """Get current learner profile + adaptive model state."""
    return MeResponse(learner=_profile(learner), model=_model(learner))


@router.patch("/me", response_model=MeResponse)
async def update_me(
    req: UpdateMeRequest,
    learner: Learner = Depends(require_learner),
    db: Session = Depends(get_db),
):
    """Update learner profile fields.

    sanskrit_ratio is the USER's setting: it becomes the ceiling the adaptive
    system's drift cannot exceed. The effective ratio is clamped to it
    immediately (drift may lower it below the ceiling; a user raise takes
    effect at once, a user lower clamps the effective value down).
    """
    if req.script_ratio is not None:
        learner.script_ratio = max(0.0, min(1.0, req.script_ratio))
    if req.sanskrit_ratio is not None:
        setting = max(0.0, min(1.0, req.sanskrit_ratio))
        learner.sanskrit_ratio_setting = setting
        if (learner.sanskrit_ratio or 0.0) > setting:
            learner.sanskrit_ratio = setting
    if req.bridge_langs is not None:
        learner.bridge_langs = req.bridge_langs
    if req.display_name is not None:
        learner.display_name = req.display_name
    if req.timezone is not None:
        # Store whatever the client sends; localtime.resolve_tz degrades an
        # unknown key to UTC at read time rather than rejecting it here, so a
        # device with an exotic tz database can still sync its profile.
        learner.timezone = req.timezone.strip() or "UTC"
    db.commit()
    db.refresh(learner)

    return MeResponse(learner=_profile(learner), model=_model(learner))


@router.delete("/me", status_code=204)
async def delete_me(
    learner: Learner = Depends(require_learner),
    db: Session = Depends(get_db),
):
    """Hard-delete the current learner and their owned data.

    - Tokens, attempts, usage_events, conversation_sessions are deleted.
    - EscapeLog.learner_id is set to NULL (aggregate metrics survive).
    - The learner row itself is hard-deleted.
    """
    # Nullify escape log references first (aggregate metrics are about content)
    import sqlalchemy as sa
    db.execute(
        sa.text("UPDATE escape_logs SET learner_id = NULL WHERE learner_id = :lid"),
        {"lid": learner.id},
    )

    # Delete owned rows (tokens and attempts cascade via ORM, but we do it
    # explicitly for clarity and to handle usage_events and conversation_sessions)
    from app.models import Attempt, ConversationSession, EscapeLog, Token, UsageEvent

    db.query(UsageEvent).filter(UsageEvent.learner_id == learner.id).delete()
    db.query(ConversationSession).filter(ConversationSession.learner_id == learner.id).delete()
    db.query(Token).filter(Token.learner_id == learner.id).delete()
    db.query(Attempt).filter(Attempt.learner_id == learner.id).delete()

    # Finally delete the learner itself
    db.delete(learner)
    db.commit()

    return None