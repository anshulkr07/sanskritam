"""Auth router: dev-login, anonymous, Google, and Apple sign-in endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import create_token
from app.db import get_db
from app.models import Learner
from app.schemas import AnonLoginRequest, AppleAuthRequest, DevLoginRequest, DevLoginResponse, GoogleAuthRequest

router = APIRouter()


@router.post("/auth/dev-login", response_model=DevLoginResponse)
async def dev_login(req: DevLoginRequest, db: Session = Depends(get_db)):
    """Simple dev login: create or return existing learner by display_name.

    Returns 404 when ``DEV_LOGIN_ENABLED=false`` (production guard).
    """
    from app.config import settings

    if not settings.dev_login_enabled:
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


@router.post("/auth/google", response_model=DevLoginResponse)
async def google_login(req: GoogleAuthRequest, db: Session = Depends(get_db)):
    """Google Sign-in: verify an ID token, bind the learner to its ``sub``.

    The client obtains a Google ID token (JWT) via the platform sign-in flow
    and sends it here. We verify the signature against Google's public keys
    and the audience against ``settings.google_client_id``. The token's ``sub``
    (stable per Google account) identifies the learner, so the same Google
    account always maps to the same Sanskritam learner across devices and reinstalls.

    Returns 501 when Google login is not configured (``google_client_id``
    unset), and 401 on an invalid/expired/mis-audienced token.
    """
    from app.config import settings

    if not settings.google_client_id:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Google login is not configured on this server.",
        )

    payload = _verify_google_id_token(req.id_token, settings.google_client_id)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Google token"
        )

    sub = payload.get("sub")
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Token missing sub claim"
        )

    existing = db.query(Learner).filter(Learner.google_sub == sub).first()
    if existing:
        learner = existing
    else:
        learner = Learner(
            # Prefer the profile name Google supplied; fall back to the email
            # local part, then a generic label.
            display_name=payload.get("name")
            or (payload.get("email") or "").split("@")[0]
            or f"Learner_{sub[:8]}",
            bridge_langs=req.bridge_langs,
            google_sub=sub,
            timezone=(req.timezone or "UTC").strip() or "UTC",
        )
        db.add(learner)
        db.commit()
        db.refresh(learner)

    # Keep the learner's day boundary in step with the device, as for anon.
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


def _verify_google_id_token(id_token: str, audience_cfg: str):
    """Verify a Google ID token against Google's JWKS; return claims or None.

    ``audience_cfg`` may be a comma-separated list of client IDs (one per
    platform: Android, iOS, Web). A token whose ``aud`` matches ANY of them is
    accepted. Uses PyJWT's JWKS client (fetches/caches Google's signing keys on
    demand). Rejects expired/unverified/mis-audienced tokens. Deferred import
    so crypto is only pulled on demand.
    """
    import jwt
    from jwt import PyJWKClient

    allowed = {a.strip() for a in audience_cfg.split(",") if a.strip()}
    if not allowed:
        return None

    try:
        jwks_client = PyJWKClient("https://www.googleapis.com/oauth2/v3/certs")
        key = jwks_client.get_signing_key_from_jwt(id_token).key
        # decode without audience, then check aud against the allowed set
        payload = jwt.decode(
            id_token,
            key,
            algorithms=["RS256"],
            options={"verify_exp": True, "verify_iss": True, "verify_aud": False},
        )
        if payload.get("aud") not in allowed:
            return None
        return payload
    except Exception:
        return None


@router.post("/auth/apple", response_model=DevLoginResponse)
async def apple_login(req: AppleAuthRequest, db: Session = Depends(get_db)):
    """Sign in with Apple: verify an identityToken, bind the learner to its ``sub``.

    App Store Guideline 4.8 makes this mandatory wherever Google sign-in is
    offered. The client obtains an identityToken (JWT, ES256) via the platform
    Sign in with Apple flow and sends it here with the ``display_name`` Apple
    supplied on first authorization (Apple never sends the name again). We
    verify the signature against Apple's public keys and the audience against
    ``settings.apple_client_id``. The token's ``sub`` (stable per Apple
    account) identifies the learner across devices and reinstalls.

    Returns 501 when Apple login is not configured (``apple_client_id``
    unset), and 401 on an invalid/expired/mis-audienced token.
    """
    from app.config import settings

    if not settings.apple_client_id:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Apple login is not configured on this server.",
        )

    payload = _verify_apple_id_token(req.id_token, settings.apple_client_id)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Apple token"
        )

    sub = payload.get("sub")
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Token missing sub claim"
        )

    existing = db.query(Learner).filter(Learner.apple_sub == sub).first()
    if existing:
        learner = existing
    else:
        learner = Learner(
            # Apple sends the name/email only on first authorization, which
            # the client forwards; fall back to the email local part, then a
            # generic label. Apple may also hide the email (relay) — usable
            # as a fallback all the same, never as an identity.
            display_name=req.display_name
            or payload.get("name")
            or (payload.get("email") or "").split("@")[0]
            or f"Learner_{sub[:8]}",
            bridge_langs=req.bridge_langs,
            apple_sub=sub,
            timezone=(req.timezone or "UTC").strip() or "UTC",
        )
        db.add(learner)
        db.commit()
        db.refresh(learner)

    # Keep the learner's day boundary in step with the device, as for anon.
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


def _verify_apple_id_token(id_token: str, audience_cfg: str):
    """Verify an Apple identityToken against Apple's JWKS; return claims or None.

    ``audience_cfg`` may be a comma-separated list of client IDs (bundle ID
    and/or Services ID). A token whose ``aud`` matches ANY of them is
    accepted. Apple signs with ES256 and publishes keys at
    ``https://appleid.apple.com/auth/keys``; ``iss`` must be
    ``https://appleid.apple.com``. Deferred import so crypto is only pulled
    on demand.
    """
    import jwt
    from jwt import PyJWKClient

    allowed = {a.strip() for a in audience_cfg.split(",") if a.strip()}
    if not allowed:
        return None

    try:
        jwks_client = PyJWKClient("https://appleid.apple.com/auth/keys")
        key = jwks_client.get_signing_key_from_jwt(id_token).key
        # decode without audience, then check aud against the allowed set
        payload = jwt.decode(
            id_token,
            key,
            algorithms=["ES256"],
            issuer="https://appleid.apple.com",
            options={"verify_exp": True, "verify_aud": False},
        )
        if payload.get("aud") not in allowed:
            return None
        return payload
    except Exception:
        return None