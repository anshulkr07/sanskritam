"""Auth router: dev-login endpoint."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth import create_token
from app.db import get_db
from app.models import Learner
from app.schemas import DevLoginRequest, DevLoginResponse

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