"""Learner profile endpoints: GET /me, PATCH /me."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth import require_learner
from app.db import get_db
from app.models import Learner
from app.schemas import MeResponse, UpdateMeRequest, LearnerProfile

router = APIRouter()


def _profile(learner: Learner) -> LearnerProfile:
    return LearnerProfile(
        id=learner.id,
        display_name=learner.display_name,
        bridge_langs=learner.bridge_langs or [],
        sanskrit_ratio=learner.sanskrit_ratio or 0.3,
        script_ratio=learner.script_ratio or 0.3,
        feature_mastery=learner.feature_mastery or {},
        streak=learner.streak or 0,
        voice_minutes_used=learner.voice_minutes_used or 0.0,
    )


def _model(learner: Learner) -> dict:
    return {
        "sanskrit_ratio": learner.sanskrit_ratio or 0.3,
        "sanskrit_ratio_setting": learner.sanskrit_ratio_setting,
        "script_ratio": learner.script_ratio or 0.3,
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
    db.commit()
    db.refresh(learner)

    return MeResponse(learner=_profile(learner), model=_model(learner))
