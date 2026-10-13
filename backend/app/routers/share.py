"""Share links, attribution events and verified app links (brief §11).

Share links are opaque, scoped and revocable; payloads carry no account
identifiers or tokens. Room invites expire in hours, achievement links in
weeks. Attribution records measurable events only — a store click is not an
install, and unverifiable attribution stays unknown.

App links: /.well-known/assetlinks.json (Android App Links) and
/.well-known/apple-app-site-association (Universal Links) are served from
settings so the owning domain can point at this backend. /l/{code} resolves
share links to the public landing page, which routes installed apps into the
right screen via the link's payload.
"""

from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse, RedirectResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth import require_learner
from app.config import settings
from app.db import get_db
from app.models import Learner, LinkEvent, ShareLink

router = APIRouter(prefix="/share")

INVITE_TTL_HOURS = 12
ACHIEVEMENT_TTL_DAYS = 28


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class ShareBody(BaseModel):
    kind: str  # result|rank|match|recitation|number
    payload: dict = {}
    ttl: str = "achievement"  # invite | achievement


@router.post("/links")
def post_link(body: ShareBody, learner: Learner = Depends(require_learner),
              db: Session = Depends(get_db)):
    code = secrets.token_urlsafe(12)[:16].replace("-", "a").replace("_", "b")
    ttl = (timedelta(hours=INVITE_TTL_HOURS) if body.ttl == "invite"
           else timedelta(days=ACHIEVEMENT_TTL_DAYS))
    # Safety: payloads are whitelisted keys only — no ids, no tokens.
    safe = {k: v for k, v in (body.payload or {}).items()
            if k in ("title", "subtitle", "game", "score", "rank", "period",
                     "date", "verse", "percent", "streak", "opponent_alias")}
    link = ShareLink(code=code, learner_id=learner.id, kind=body.kind[:24],
                     payload=safe, expires_at=_utcnow() + ttl)
    db.add(link)
    db.commit()
    base = str(settings.public_base_url).rstrip("/") if getattr(settings, "public_base_url", "") else ""
    return {"code": code, "url": f"{base}/l/{code}" if base else f"/l/{code}",
            "expires_at": link.expires_at.isoformat() + "Z"}


class RevokeBody(BaseModel):
    code: str


@router.post("/links/revoke")
def post_revoke(body: RevokeBody, learner: Learner = Depends(require_learner),
                db: Session = Depends(get_db)):
    link = db.query(ShareLink).filter(ShareLink.code == body.code).first()
    if link is None or link.learner_id != learner.id:
        raise HTTPException(status_code=404, detail="Link not found.")
    link.revoked = True
    db.commit()
    return {"revoked": True}


@router.get("/links/{code}")
def get_link(code: str, db: Session = Depends(get_db)):
    """Public resolve: the safe payload for the landing page. Counts one
    'opened' attribution event per resolve."""
    link = db.query(ShareLink).filter(ShareLink.code == code).first()
    if link is None or link.revoked:
        raise HTTPException(status_code=404, detail="Link not found.")
    if link.expires_at and link.expires_at < _utcnow():
        raise HTTPException(status_code=410, detail="Link expired.")
    if link.max_opens and link.opens >= link.max_opens:
        raise HTTPException(status_code=410, detail="Link exhausted.")
    link.opens += 1
    db.add(LinkEvent(code=code, event="opened"))
    db.commit()
    return {"kind": link.kind, "payload": link.payload,
            "expires_at": link.expires_at.isoformat() + "Z" if link.expires_at else None}


class EventBody(BaseModel):
    code: str = ""
    event: str
    meta: dict = {}


@router.post("/events")
def post_event(body: EventBody, learner: Learner | None = Depends(require_learner),
               db: Session = Depends(get_db)):
    """Measurable attribution events from the app and the landing sample."""
    allowed = {"opened", "link_opened", "sample_started", "sample_completed", "store_click",
               "install", "redeemed", "first_game"}
    if body.event not in allowed:
        raise HTTPException(status_code=422, detail="Unknown event.")
    db.add(LinkEvent(code=(body.code or "")[:24], event=body.event,
                     learner_id=learner.id if learner else None,
                     meta=body.meta or {}))
    db.commit()
    return {"ok": True}


@router.get("/links/{code}/resolve")
def get_resolve(code: str, db: Session = Depends(get_db)):
    """Landing-page redirect target for installed apps (deep link)."""
    link = db.query(ShareLink).filter(ShareLink.code == code).first()
    if link is None or link.revoked or (link.expires_at and link.expires_at < _utcnow()):
        return RedirectResponse(f"/?link={code}")
    return RedirectResponse(f"/?link={code}#play")


@router.get("/l/{code}", include_in_schema=False)
def landing(code: str):
    """The public mobile landing page: safe preview, invite code, store
    buttons and the unranked browser sample. Served from frontend/."""
    from pathlib import Path

    from fastapi.responses import FileResponse
    page = Path(__file__).resolve().parents[3] / "frontend" / "landing.html"
    if page.exists():
        return FileResponse(page, media_type="text/html")
    return RedirectResponse("/")


# ── Verified app links ───────────────────────────────────────────────────────


def _assetlinks() -> list[dict]:
    sha = getattr(settings, "android_cert_fingerprints", "") or ""
    fingerprints = [f.strip() for f in sha.split(",") if f.strip()]
    if not fingerprints:
        # Statement list stays valid but asserts nothing until the owner adds
        # the signing cert fingerprint — we never fake verification.
        return []
    return [{
        "relation": ["delegate_permission/common.handle_all_urls"],
        "target": {
            "namespace": "android_app",
            "package_name": "com.sanskritam.app",
            "sha256_cert_fingerprints": fingerprints,
        },
    }]


@router.get("/.well-known/assetlinks.json", include_in_schema=False)
def assetlinks():
    return JSONResponse(_assetlinks())


@router.get("/.well-known/apple-app-site-association", include_in_schema=False)
def aasa():
    app_ids = [a.strip() for a in (getattr(settings, "apple_app_ids", "") or "").split(",") if a.strip()]
    if not app_ids:
        return JSONResponse({"applinks": {"apps": [], "details": []}})
    return JSONResponse({
        "applinks": {
            "apps": [],
            "details": [{"appIDs": app_ids,
                         "components": [{"path": "/l/*"}]}],
        }
    })
