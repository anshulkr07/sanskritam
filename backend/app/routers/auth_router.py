"""Auth router: dev-login and anonymous login endpoints."""

from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth import create_token
from app.db import get_db
from app.models import Learner
from app.schemas import AnonLoginRequest, DevLoginRequest, DevLoginResponse

router = APIRouter()


@router.post("/auth/dev-login", response_model=DevLoginResponse)
async def dev_login(req: DevLoginRequest, db: Session = Depends(get_db)):
    """Simple dev login: create or return existing learner by display_name.

    Returns 404 when ``DEV_LOGIN_ENABLED=false`` (production guard).
    """
    from app.config import settings
    if not settings.dev_login_enabled:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Not found")

    existing = db.query(Learner).filter(Learner.display_name == req.display_name).first()
    if existing:
        learner = existing
    else:
        learner = Learner(
            display_name=req.display_name,
            bridge_langs=req.bridge_langs,
        )
        db.add(learner)
        db.commit()
        db.refresh(learner)

    token = create_token(learner.id, db)
    return DevLoginResponse(
        token=token.id,
        learner={
            "id": learner.id,
            "display_name": learner.display_name,
            "bridge_langs": learner.bridge_langs,
            "sanskrit_ratio": learner.sanskrit_ratio,
            "sanskrit_ratio_setting": learner.sanskrit_ratio_setting,
            "script_ratio": learner.script_ratio,
            "feature_mastery": learner.feature_mastery or {},
            "streak": learner.streak or 0,
            "voice_minutes_used": learner.voice_minutes_used or 0.0,
        },
    )


@router.post("/auth/anonymous", response_model=DevLoginResponse)
async def anon_login(req: AnonLoginRequest, db: Session = Depends(get_db)):
    """Anonymous login by device install_id — idempotent.

    Same ``install_id`` returns the same learner with a fresh token.
    Different ``install_id`` always creates a new learner.
    """
    existing = db.query(Learner).filter(Learner.install_id == req.install_id).first()
    if existing:
        learner = existing
    else:
        learner = Learner(
            display_name=req.display_name or f"Learner_{req.install_id[:8]}",
            bridge_langs=req.bridge_langs,
            install_id=req.install_id,
            timezone=(req.timezone or "UTC").strip() or "UTC",
        )
        db.add(learner)
        db.commit()
        db.refresh(learner)
    # A returning device may have travelled or fixed its clock; keep the
    # learner's day boundary in step with the device on every login.
    if req.timezone and req.timezone.strip() and learner.timezone != req.timezone.strip():
        learner.timezone = req.timezone.strip()
        db.commit()

    token = create_token(learner.id, db)
    return DevLoginResponse(
        token=token.id,
        learner={
            "id": learner.id,
            "display_name": learner.display_name,
            "bridge_langs": learner.bridge_langs,
            "sanskrit_ratio": learner.sanskrit_ratio,
            "sanskrit_ratio_setting": learner.sanskrit_ratio_setting,
            "script_ratio": learner.script_ratio,
            "feature_mastery": learner.feature_mastery or {},
            "streak": learner.streak or 0,
            "voice_minutes_used": learner.voice_minutes_used or 0.0,
            "timezone": learner.timezone or "UTC",
        },
    )