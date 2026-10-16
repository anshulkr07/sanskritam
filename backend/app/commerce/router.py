from __future__ import annotations

import base64
import hashlib
import json
import secrets
from datetime import timedelta
from pathlib import Path
from typing import Literal

import jwt
from fastapi import APIRouter, Depends, Header, HTTPException, Request, UploadFile, File, Form
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth import require_learner
from app.config import settings
from app.db import get_db
from app.models import Learner
from app.commerce import service as svc, stores
from app.commerce.catalogue import PRODUCTS, TIERS, REGIONAL_MEMBERSHIPS
from app.commerce.models import (Wallet, Ledger, Purchase, Title, Unlock, Membership, Profile,
    Referral, ReferralReward, Setting, Audit, HostedEvent, AdGrant, PayoutRequest, EventEntry, PrizeCase)

router = APIRouter(prefix="/commerce", tags=["Commerce"])


@router.get("/terms", response_class=HTMLResponse)
def commerce_terms():
    return Path(__file__).with_name("terms.html").read_text(encoding="utf-8")


@router.api_route("/media", methods=["GET", "HEAD"])
async def media(ticket: str, request: Request, db: Session = Depends(get_db)):
    from app.commerce.media import serve_media
    return await serve_media(ticket, db, request.method == "HEAD")


def enabled():
    if not settings.commerce_enabled:
        raise HTTPException(503, "Monetization is not enabled yet")


def sign(payload):
    if len(settings.commerce_signing_key) < 32:
        raise HTTPException(503, "Commerce signing is not configured")
    return jwt.encode(payload, settings.commerce_signing_key, algorithm="HS256")


def decode(token, scope):
    try:
        value = jwt.decode(token, settings.commerce_signing_key, algorithms=["HS256"], options={"require": ["exp", "scope"]})
        if value["scope"] != scope:
            raise ValueError("Wrong scope")
        return value
    except Exception as exc:
        raise HTTPException(401, "Authorization expired or invalid") from exc


def admin_role(x_admin_token: str = Header("")):
    digest = hashlib.sha256(x_admin_token.encode()).hexdigest()
    roles = json.loads(settings.commerce_admin_keys_json)
    role = roles.get(digest)
    if not role and settings.admin_token and settings.admin_token != "dev-admin" and secrets.compare_digest(x_admin_token, settings.admin_token):
        role = "owner"
    if role not in {"owner", "finance", "catalogue", "moderator"}:
        raise HTTPException(403, "Commerce administrator credentials required")
    return {"role": role, "actor": digest[:16]}


def audit(db, actor, action, details, roles):
    if actor["role"] != "owner" and actor["role"] not in roles:
        raise HTTPException(403, "This administrator role cannot perform this action")
    db.add(Audit(actor=actor["actor"], action=action, details=details))


@router.get("/catalogue")
def catalogue(learner: Learner = Depends(require_learner), db: Session = Depends(get_db)):
    products = [{"id": key, **value} for key, value in svc.product_catalogue(db).items()]
    return {"enabled": settings.commerce_enabled, "sales_enabled": settings.commerce_sales_enabled,
        "account_verified": bool(learner.google_sub or learner.apple_sub),
        "ads_enabled": settings.commerce_ads_enabled, "tiers": TIERS, "products": products,
        "regional_memberships": REGIONAL_MEMBERSHIPS,
        "account_token": stores.account_token(learner.id), "google_account": stores.google_account(learner.id),
        "titles": [{"id": r.id, "slug": r.slug, "medium": r.medium, "name": r.name,
                    "credits": r.credits, "metadata": r.metadata_json} for r in db.query(Title).filter_by(published=True)],
        "terms": {"credits_expire": False, "nonmember_days": 365, "post_membership_days": 365,
                  "cooldown_days": 7, "skip_credits": svc.setting(db, "skip_credits", 25)}}


@router.get("/wallet")
def wallet(learner: Learner = Depends(require_learner), db: Session = Depends(get_db)):
    result = svc.snapshot(db, learner.id)
    result["enabled"] = settings.commerce_enabled
    result["supporter_badges"] = [r.product_id.rsplit(".", 1)[-1] for r in db.query(Purchase).filter_by(learner_id=learner.id, state="paid")
                                  if PRODUCTS.get(r.product_id, {}).get("kind") == "supporter"]
    db.commit()
    return result


@router.get("/history")
def history(learner: Learner = Depends(require_learner), db: Session = Depends(get_db), before: str = ""):
    query = db.query(Ledger).filter_by(learner_id=learner.id)
    if before:
        cursor = db.get(Ledger, before)
        if not cursor or cursor.learner_id != learner.id:
            raise HTTPException(404, "Unknown cursor")
        query = query.filter(Ledger.created_at < cursor.created_at)
    rows = query.order_by(Ledger.created_at.desc(), Ledger.id.desc()).limit(100).all()
    return [{"id": r.id, "amount": r.amount, "kind": r.kind, "details": r.details, "created_at": r.created_at} for r in rows]


class VerifyBody(BaseModel):
    provider: Literal["apple", "google"]
    product_id: str = Field(max_length=160)
    proof: str = Field(min_length=1, max_length=40000)


@router.post("/purchases/verify")
async def verify_purchase(body: VerifyBody, learner: Learner = Depends(require_learner), db: Session = Depends(get_db)):
    enabled()
    if not settings.commerce_sales_enabled:
        raise HTTPException(503, "Store sales are not enabled")
    if not learner.google_sub and not learner.apple_sub:
        raise HTTPException(409, "Link a verified Google or Apple sign-in before purchasing")
    verified = stores.verify_apple(body.proof, learner.id) if body.provider == "apple" else await stores.verify_google(body.product_id, body.proof, learner.id)
    if verified["product_id"] != body.product_id:
        raise HTTPException(422, "Product does not match verified purchase")
    if verified.get("revoked"):
        old = db.query(Purchase).filter_by(provider=body.provider, transaction_id=verified["transaction_id"]).first()
        if old and old.learner_id == learner.id:
            svc.refund_purchase(db, old)
            db.commit()
        raise HTTPException(409, "The store has revoked this purchase")
    if body.provider == "google":
        verified["evidence"]["encrypted_token"] = encrypt_proof(body.proof)
    purchase = svc.apply_purchase(db, learner.id, verified)
    db.commit()
    store_finished = False
    if body.provider == "google":
        try:
            await stores.finish_google(body.product_id, body.proof)
            store_finished = True
        except HTTPException:
            # The durable grant remains; the phone or reconciliation retries acknowledgement.
            pass
    result = svc.snapshot(db, learner.id)
    db.commit()
    return {"purchase_id": purchase.id, "finish_transaction": True, "store_finished": store_finished, "wallet": result}


def encrypt_proof(value):
    from cryptography.fernet import Fernet
    if len(settings.commerce_signing_key) < 32:
        raise HTTPException(503, "Store proof encryption is not configured")
    key = base64.urlsafe_b64encode(hashlib.sha256((settings.commerce_signing_key + ":store-proof").encode()).digest())
    return Fernet(key).encrypt(value.encode()).decode()


def decrypt_proof(value):
    from cryptography.fernet import Fernet
    key = base64.urlsafe_b64encode(hashlib.sha256((settings.commerce_signing_key + ":store-proof").encode()).digest())
    return Fernet(key).decrypt(value.encode()).decode()


class LinkBody(BaseModel):
    provider: Literal["google", "apple"]
    id_token: str = Field(min_length=20, max_length=20000)


@router.post("/accounts/link")
def link_account(body: LinkBody, learner: Learner = Depends(require_learner), db: Session = Depends(get_db)):
    from app.routers.auth_router import _verify_google_id_token, _verify_apple_id_token
    audience = settings.google_client_id if body.provider == "google" else settings.apple_client_id
    if not audience:
        raise HTTPException(503, "This sign-in provider is not configured")
    payload = (_verify_google_id_token if body.provider == "google" else _verify_apple_id_token)(body.id_token, audience)
    if not payload or not payload.get("sub"):
        raise HTTPException(401, "Account identity could not be verified")
    field = Learner.google_sub if body.provider == "google" else Learner.apple_sub
    other = db.query(Learner).filter(field == payload["sub"]).first()
    if other and other.id != learner.id:
        raise HTTPException(409, "This sign-in is already attached to another account. Sign in to that account; contact support before merging purchases.")
    svc.lock_wallet(db, learner.id)
    setattr(learner, body.provider + "_sub", payload["sub"])
    db.commit()
    return {"ok": True}


class UnlockBody(BaseModel):
    title_id: str = Field(max_length=160)
    request_id: str = Field(min_length=8, max_length=80)


@router.post("/titles/unlock")
def unlock(body: UnlockBody, learner: Learner = Depends(require_learner), db: Session = Depends(get_db)):
    enabled()
    row = svc.unlock_title(db, learner.id, body.title_id, body.request_id)
    result = {"id": row.id, "title_id": row.title_id, "expires_at": row.expires_at}
    db.commit()
    return result


class ConfirmBody(BaseModel):
    confirmed: Literal[True]


@router.post("/unlocks/{unlock_id}/surrender")
def surrender(unlock_id: str, body: ConfirmBody, learner: Learner = Depends(require_learner), db: Session = Depends(get_db)):
    enabled()
    svc.surrender(db, learner.id, unlock_id)
    db.commit()
    return {"ok": True}


@router.post("/cooldowns/{cooldown_id}/skip")
def skip(cooldown_id: str, body: ConfirmBody, learner: Learner = Depends(require_learner), db: Session = Depends(get_db)):
    enabled()
    svc.skip_cooldown(db, learner.id, cooldown_id)
    db.commit()
    return {"ok": True}


@router.get("/titles/{title_id}/licence")
def licence(title_id: str, learner: Learner = Depends(require_learner), db: Session = Depends(get_db)):
    enabled()
    member = svc.membership(db, learner.id)
    access = svc.title_access(db, learner.id, title_id)
    if not member or not access:
        raise HTTPException(403, "An active membership and title unlock are required")
    until = min(svc.now() + timedelta(days=7), member.paid_until, access.expires_at)
    payload = {"scope": "offline", "sub": learner.id, "title": title_id, "exp": until}
    return {"licence": sign(payload), "expires_at": until, "owner": learner.id}


@router.get("/titles/{title_id}/content")
def title_content(title_id: str, chapter: str | None = None, learner: Learner = Depends(require_learner), db: Session = Depends(get_db)):
    from sqlalchemy import or_
    from app.models import CanonText, Shloka
    from app.routers.canon import _verse_responses
    from app.commerce.access import filter_reading
    title = db.get(Title, title_id)
    if not title or not title.published:
        raise HTTPException(404, "Unknown title")
    canon = db.query(CanonText).filter_by(slug=title.slug).first()
    if not canon:
        raise HTTPException(404, "Content is not published")
    query = db.query(Shloka)
    if canon.paged:
        query = query.filter_by(book=title.slug, in_daily=False)
        if chapter is not None:
            query = query.filter_by(chapter=chapter)
        elif title.medium == "book":
            first = query.order_by(Shloka.seq).first()
            query = query.filter_by(chapter=first.chapter if first else "")
        query = query.order_by(Shloka.seq, Shloka.id)
    else:
        predicates = [Shloka.source_ref.contains(p) for p in (canon.ref_prefixes or []) if p]
        if not predicates:
            return {"verses": []}
        query = query.filter(Shloka.in_daily.is_(True), or_(*predicates)).order_by(Shloka.date, Shloka.id)
    rows = query.limit(20000).all()
    if title.medium == "book":
        rows = filter_reading(db, learner, rows)
    responses = _verse_responses(db, rows, learner)
    if title.medium == "audio" and settings.commerce_enabled:
        allowed_text_ids = {r.id for r in filter_reading(db, learner, rows)}
        filtered = []
        for row, response in zip(rows, responses):
            if not response.chant and not response.audio_url:
                continue
            if row.id not in allowed_text_ids:
                chant = response.chant.model_copy(update={"lines": []}) if response.chant else None
                response = response.model_copy(update={"devanagari": "", "iast": "", "translation_en": "", "translation_hi": "", "word_breakdown": [], "chant": chant})
            filtered.append(response)
        responses = filtered
    return {"verses": responses}


class MediaRenewBody(BaseModel):
    ticket: str = Field(max_length=12000)


@router.post("/media/renew")
def renew_media(body: MediaRenewBody, learner: Learner = Depends(require_learner), db: Session = Depends(get_db)):
    try:
        data = jwt.decode(body.ticket, settings.commerce_signing_key, algorithms=["HS256"], options={"verify_exp": False})
        if data.get("scope") != "media" or data.get("sub") != learner.id:
            raise ValueError("Wrong owner")
    except Exception as exc:
        raise HTTPException(401, "Invalid media authorization") from exc
    if data.get("limit_ms") is None and data.get("title") != "daily:audio" and not svc.title_access(db, learner.id, data["title"]):
        raise HTTPException(403, "This audio unlock has ended")
    if data.get("limit_ms") is not None:
        from app.commerce.access import protect_audio
        from app.models import Shloka
        from app.routers.shlokas import _shloka_response, _chant_map
        row = db.get(Shloka, data["row"])
        if not row:
            raise HTTPException(404, "Unknown verse")
        response = protect_audio(db, learner, row, _shloka_response(row, _chant_map(db, [row.verse_uid])))
        return {"url": response.chant.url if data["kind"] == "chant" and response.chant else response.audio_url}
    data["exp"] = svc.now() + timedelta(minutes=5)
    return {"url": "/commerce/media?ticket=" + sign(data)}


class QuoteBody(BaseModel):
    action: Literal["ask", "analysis", "voice", "recitation"]
    seconds: int = Field(default=0, ge=0, le=3600)


@router.post("/quotes")
def quote(body: QuoteBody, learner: Learner = Depends(require_learner), db: Session = Depends(get_db)):
    enabled()
    result = svc.action_quote(db, body.action, body.seconds)
    result["token"] = sign({**result, "scope": "quote", "sub": learner.id, "exp": svc.now() + timedelta(minutes=5)})
    return result


class ProfileBody(BaseModel):
    country: str = Field(pattern="^[A-Z]{2}$")
    adult: bool
    ads_consent: bool = False


@router.put("/profile")
def profile(body: ProfileBody, learner: Learner = Depends(require_learner), db: Session = Depends(get_db)):
    svc.lock_wallet(db, learner.id)
    row = db.get(Profile, learner.id)
    if not row:
        row = Profile(learner_id=learner.id)
        db.add(row)
    row.country, row.adult, row.ads_consent = body.country, body.adult, body.ads_consent
    db.commit()
    return {"code": row.code, **body.model_dump()}


@router.get("/profile")
def get_profile(learner: Learner = Depends(require_learner), db: Session = Depends(get_db)):
    row = db.get(Profile, learner.id)
    return {"country": row.country if row else "", "adult": bool(row and row.adult),
            "ads_consent": bool(row and row.ads_consent), "code": row.code if row else None}


class ReferralBody(BaseModel):
    code: str = Field(min_length=6, max_length=24)


@router.post("/referrals/attribute")
def attribute(body: ReferralBody, learner: Learner = Depends(require_learner), db: Session = Depends(get_db)):
    svc.lock_wallet(db, learner.id)
    mine = db.get(Profile, learner.id)
    other = db.query(Profile).filter_by(code=body.code).first()
    if not mine or not mine.adult or not other or not other.adult or other.learner_id == learner.id:
        raise HTTPException(422, "A valid adult referral is required")
    if db.get(Referral, learner.id) or db.query(Purchase).filter_by(learner_id=learner.id).filter(Purchase.product_id.in_([p for p, v in PRODUCTS.items() if v["kind"] == "subscription"])).first():
        raise HTTPException(409, "Referral must be attached before the first membership purchase")
    db.add(Referral(learner_id=learner.id, referrer_id=other.learner_id))
    db.commit()
    return {"ok": True}


@router.get("/referrals")
def referrals(learner: Learner = Depends(require_learner), db: Session = Depends(get_db)):
    rows = db.query(ReferralReward).filter_by(referrer_id=learner.id).all()
    profile = db.get(Profile, learner.id)
    return {"code": profile.code if profile else None, "threshold_inr_paise": 50000,
            "rewards": [{"id": r.id, "amount_minor": r.amount_minor, "currency": r.currency,
                         "available_at": r.available_at, "state": r.state} for r in rows]}


class AdBody(BaseModel):
    title_id: str = Field(max_length=160)
    kind: Literal["reading", "audio", "practice", "native"]
    target: str = Field(default="", max_length=100)


@router.post("/ads/ticket")
def ad_ticket(body: AdBody, learner: Learner = Depends(require_learner), db: Session = Depends(get_db)):
    enabled()
    if not settings.commerce_ads_enabled or svc.membership(db, learner.id):
        raise HTTPException(403, "Advertising is unavailable")
    if body.kind == "native" and not learner.streak:
        raise HTTPException(403, "Complete a learning activity before native advertising")
    svc.lock_wallet(db, learner.id)
    profile = db.get(Profile, learner.id)
    if not profile or not profile.adult or not profile.ads_consent:
        raise HTTPException(403, "Advertising consent and adult profile required")
    if body.kind != "native" and not db.get(Title, body.title_id):
        raise HTTPException(404, "Unknown title")
    target = body.target
    if body.kind == "reading":
        from app.models import CanonText, Shloka
        title = db.get(Title, body.title_id)
        canon = db.query(CanonText).filter_by(slug=title.slug).first()
        if canon and canon.paged:
            chapters = []
            for chapter, in db.query(Shloka.chapter).filter_by(book=canon.slug, in_daily=False).order_by(Shloka.seq):
                if chapter not in chapters:
                    chapters.append(chapter)
            if len(chapters) > 1:
                claimed = {r.target for r in db.query(AdGrant).filter_by(learner_id=learner.id, title_id=body.title_id, kind="reading").filter(AdGrant.expires_at > svc.now())}
                choices = [c for c in chapters[1:] if c not in claimed]
                if not choices:
                    raise HTTPException(409, "All additional chapters are already available")
                target = target if target in choices else choices[0]
    midnight = svc.now().replace(hour=0, minute=0, second=0, microsecond=0)
    query = db.query(AdGrant).filter_by(learner_id=learner.id).filter(AdGrant.created_at >= midnight)
    query = query.filter(AdGrant.kind == "native") if body.kind == "native" else query.filter(AdGrant.kind != "native")
    from sqlalchemy import or_
    query = query.filter(or_(AdGrant.transaction_id.isnot(None), AdGrant.expires_at > svc.now()))
    # Count issued tickets too: concurrent ad requests cannot bypass the cap.
    if query.count() >= (2 if body.kind == "native" else 3):
        raise HTTPException(429, "Daily advertising limit reached")
    row = AdGrant(learner_id=learner.id, title_id=body.title_id, kind=body.kind, target=target,
                  expires_at=svc.now() + timedelta(minutes=15))
    db.add(row)
    db.flush()
    token = sign({"scope": "ad", "sub": learner.id, "id": row.id, "exp": row.expires_at})
    db.commit()
    return {"ticket": token, "id": row.id}


@router.get("/ads/ssv")
async def ad_callback(request: Request, db: Session = Depends(get_db)):
    from app.commerce.ads import verify_callback
    data = await verify_callback(request.url.query)
    payload = decode(data["custom_data"], "ad")
    svc.lock_wallet(db, payload["sub"])
    row = db.get(AdGrant, payload["id"])
    if not row or row.learner_id != payload["sub"] or row.kind == "native":
        raise HTTPException(422, "Unknown reward")
    if row.transaction_id:
        if row.transaction_id != data["transaction_id"]:
            raise HTTPException(409, "Reward already claimed")
        return {"ok": True}
    if row.expires_at <= svc.now():
        raise HTTPException(410, "Reward ticket expired")
    row.transaction_id = data["transaction_id"]
    row.expires_at = svc.now() + timedelta(hours=24)
    db.commit()
    return {"ok": True}


@router.get("/ads/{grant_id}")
def reward_status(grant_id: str, learner: Learner = Depends(require_learner), db: Session = Depends(get_db)):
    row = db.get(AdGrant, grant_id)
    if not row or row.learner_id != learner.id:
        raise HTTPException(404, "Unknown reward")
    return {"verified": bool(row.transaction_id and row.expires_at > svc.now()), "expires_at": row.expires_at}


class EventBody(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    kind: Literal["poetry", "singing", "recitation", "game"]
    rules: str = Field(min_length=30, max_length=12000)
    judging: str = Field(min_length=20, max_length=6000)
    countries: list[str] = Field(min_length=1, max_length=250)
    reward: str = Field(min_length=3, max_length=1000)
    fulfilment: str = Field(min_length=20, max_length=4000)
    funding_inr_paise: int = Field(ge=0)
    starts_at: str
    ends_at: str


@router.post("/events")
def create_event(body: EventBody, learner: Learner = Depends(require_learner), db: Session = Depends(get_db)):
    enabled()
    profile = db.get(Profile, learner.id)
    if not profile or not profile.adult:
        raise HTTPException(403, "An adult organizer profile is required")
    if stores.iso(body.ends_at) <= stores.iso(body.starts_at):
        raise HTTPException(422, "Event must end after it begins")
    row = HostedEvent(organizer_id=learner.id, details={**body.model_dump(), "entry_fee": 0,
        "store_disclaimer": "Apple and Google do not sponsor or administer this competition."})
    db.add(row)
    db.commit()
    return {"id": row.id, "state": row.state}


@router.get("/events")
def list_events(learner: Learner = Depends(require_learner), db: Session = Depends(get_db)):
    rows = db.query(HostedEvent).filter((HostedEvent.organizer_id == learner.id) | (HostedEvent.state == "published")).all()
    return [{"id": r.id, "state": r.state, "details": {k: v for k, v in r.details.items() if k not in {"recipient", "delivery", "identity", "funding_evidence"}}} for r in rows]


@router.get("/admin", response_class=HTMLResponse)
def admin_page():
    # HTML has no secrets or data; every API requires role authentication.
    return Path(__file__).with_name("admin.html").read_text(encoding="utf-8")


@router.get("/admin/data")
def admin_data(actor=Depends(admin_role), db: Session = Depends(get_db)):
    def rows(model):
        values = db.query(model).limit(200).all()
        return [{c.name: getattr(row, c.name) for c in row.__table__.columns if c.name != "evidence"} for row in values]
    result = {"role": actor["role"], "titles": rows(Title), "events": rows(HostedEvent), "settings": rows(Setting)}
    result["entries"] = rows(EventEntry)
    for event in result["events"]:
        event["details"] = {k: v for k, v in event["details"].items() if k not in {"recipient", "delivery", "identity"}}
    if actor["role"] in {"owner", "finance"}:
        result.update(purchases=rows(Purchase), rewards=rows(ReferralReward), ledger=rows(Ledger), audit=rows(Audit), prizes=rows(PrizeCase))
        result["payouts"] = [{"id": r.id, "learner_id": r.learner_id, "state": r.state, "reward_ids": r.reward_ids,
                              "recipient": json.loads(decrypt_proof(r.recipient_encrypted)), "fulfilment": r.fulfilment}
                             for r in db.query(PayoutRequest).limit(100)]
        from app.commerce.reporting import operating_report
        result["report"] = operating_report(db)
        db.add(Audit(actor=actor["actor"], action="finance.view", details={"sections": ["purchases", "payouts", "prizes", "report"]}))
        db.commit()
    return result


class TitleBody(BaseModel):
    slug: str = Field(pattern="^[a-z0-9_-]{1,100}$")
    medium: Literal["book", "audio"]
    name: str = Field(min_length=1, max_length=256)
    credits: int = Field(gt=0, le=100000)
    published: bool = False
    metadata: dict = Field(default_factory=dict)


@router.put("/admin/titles/{title_id}")
def save_title(title_id: str, body: TitleBody, actor=Depends(admin_role), db: Session = Depends(get_db)):
    if title_id != body.slug + ":" + body.medium:
        raise HTTPException(422, "Title id must be slug:medium")
    for link in body.metadata.get("affiliates", []):
        if not str(link.get("url", "")).startswith("https://") or not link.get("disclosure"):
            raise HTTPException(422, "Affiliate links require HTTPS and a disclosure")
    audit(db, actor, "title.update", {"id": title_id, "value": body.model_dump()}, {"catalogue"})
    row = db.get(Title, title_id)
    if not row:
        row = Title(id=title_id)
        db.add(row)
    row.slug, row.medium, row.name = body.slug, body.medium, body.name
    row.credits, row.published, row.metadata_json = body.credits, body.published, body.metadata
    db.commit()
    return {"ok": True}


class SettingBody(BaseModel):
    value: dict | list | int | bool


@router.put("/admin/settings/{key}")
def update_setting(key: str, body: SettingBody, actor=Depends(admin_role), db: Session = Depends(get_db)):
    if key not in {"ai_costs", "skip_credits", "reward_countries", "prize_budget", "marketing", "media_origins", "products"}:
        raise HTTPException(422, "Unknown configuration key")
    if key == "skip_credits" and (not isinstance(body.value, int) or body.value < 0):
        raise HTTPException(422, "Skip cost must be a nonnegative integer")
    if key == "products":
        if not isinstance(body.value, dict) or any(k not in PRODUCTS or not isinstance(v, dict) or
            not isinstance(v.get("credits"), int) or not 0 <= v["credits"] <= 100000 for k, v in body.value.items()):
            raise HTTPException(422, "Products require a valid product id and nonnegative credit grant")
    audit(db, actor, "setting.update", {"key": key, "value": body.value}, set())
    row = db.get(Setting, key)
    if row:
        row.value = body.value
    else:
        db.add(Setting(key=key, value=body.value))
    db.commit()
    return {"ok": True}


class GrantBody(BaseModel):
    learner_id: str = Field(max_length=64)
    amount: int = Field(ge=-1000000, le=1000000)
    reason: str = Field(min_length=10, max_length=1000)
    request_id: str = Field(min_length=8, max_length=80)


@router.post("/admin/grants")
def grant(body: GrantBody, actor=Depends(admin_role), db: Session = Depends(get_db)):
    if not db.get(Learner, body.learner_id):
        raise HTTPException(404, "Unknown learner")
    audit(db, actor, "wallet.adjust", body.model_dump(), {"finance"})
    wallet = svc.lock_wallet(db, body.learner_id)
    svc.journal(db, wallet, body.amount, "admin:" + body.request_id, "promotion" if body.amount >= 0 else "adjustment", {"reason": body.reason}, allow_deficit=True)
    db.commit()
    return {"ok": True}


class SettlementBody(BaseModel):
    net_minor: int = Field(ge=0)
    inr_paise: int = Field(ge=0)
    currency: str = Field(pattern="^[A-Z]{3}$")
    evidence: str = Field(min_length=10, max_length=4000)


@router.post("/admin/purchases/{purchase_id}/settlement")
def settlement(purchase_id: str, body: SettlementBody, actor=Depends(admin_role), db: Session = Depends(get_db)):
    purchase = db.get(Purchase, purchase_id)
    if not purchase:
        raise HTTPException(404, "Unknown purchase")
    audit(db, actor, "purchase.settlement", {"id": purchase_id, **body.model_dump()}, {"finance"})
    svc.lock_wallet(db, purchase.learner_id)
    svc.record_settlement(db, purchase, body.net_minor, body.currency, body.inr_paise, body.evidence)
    db.commit()
    return {"ok": True}


class FulfilmentBody(BaseModel):
    method: Literal["cash", "gift"]
    evidence: str = Field(min_length=10, max_length=4000)
    fees_minor: int = Field(ge=0)
    currency: str = Field(pattern="^[A-Z]{3}$")
    identity_reviewed: Literal[True]
    duplicate_payment_reviewed: Literal[True]


@router.post("/admin/rewards/{reward_id}/fulfil")
def fulfil(reward_id: str, body: FulfilmentBody, actor=Depends(admin_role), db: Session = Depends(get_db)):
    if not settings.commerce_rewards_enabled:
        raise HTTPException(503, "Reward fulfilment is not enabled")
    reward = db.get(ReferralReward, reward_id)
    if not reward:
        raise HTTPException(404, "Unknown reward")
    svc.lock_wallet(db, reward.referrer_id)
    profile = db.get(Profile, reward.referrer_id)
    countries = svc.setting(db, "reward_countries", {})
    if not profile or not profile.adult or not countries.get(profile.country):
        raise HTTPException(409, "A reviewed fulfilment route for the recipient country is required")
    eligible = db.query(ReferralReward).filter_by(referrer_id=reward.referrer_id, state="pending").filter(ReferralReward.available_at <= svc.now()).all()
    if reward.state != "pending" or reward.available_at > svc.now() or sum(r.inr_paise for r in eligible) < 50000:
        raise HTTPException(409, "Reward hold or payout threshold not satisfied")
    audit(db, actor, "reward.fulfil", {"id": reward_id, **body.model_dump()}, {"finance"})
    reward.state, reward.fulfilment = "paid", body.model_dump()
    db.commit()
    return {"ok": True}


class EventReview(BaseModel):
    state: Literal["approved", "published", "cancelled", "results_review", "fulfilled", "appeal"]
    evidence: str = Field(min_length=20, max_length=12000)
    hosting_purchase_id: str | None = None
    fulfilment: dict = Field(default_factory=dict)


@router.post("/admin/events/{event_id}/review")
def review_event(event_id: str, body: EventReview, actor=Depends(admin_role), db: Session = Depends(get_db)):
    event = db.get(HostedEvent, event_id)
    if not event:
        raise HTTPException(404, "Unknown event")
    svc.lock_wallet(db, event.organizer_id)
    audit(db, actor, "event.review", {"id": event_id, **body.model_dump()}, {"moderator"})
    if body.state == "published":
        if not settings.commerce_hosting_enabled:
            raise HTTPException(503, "Organizer hosting is not enabled")
        purchase = db.get(Purchase, body.hosting_purchase_id or "")
        if not purchase or purchase.learner_id != event.organizer_id or purchase.state != "paid" or PRODUCTS[purchase.product_id]["kind"] != "hosting":
            raise HTTPException(409, "An unused verified hosting purchase is required")
        routes = svc.setting(db, "reward_countries", {})
        if not all(routes.get(c) for c in event.details.get("countries", [])):
            raise HTTPException(409, "Every advertised country needs reviewed reward fulfilment")
        if event.details.get("funding_inr_paise", 0) <= 0:
            raise HTTPException(409, "Prize funding must be verified")
        event.hosting_purchase_id = purchase.id
    event.state = body.state
    event.details = {**event.details, "review_evidence": body.evidence, "delivery": body.fulfilment}
    db.commit()
    return {"ok": True, "hosting_refund_required": body.state == "cancelled" and bool(event.hosting_purchase_id)}


@router.post("/notifications/apple")
async def apple_notification(request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    try:
        envelope = stores.apple_verifier().verify_and_decode_notification(data["signedPayload"])
        if not envelope.data and str(getattr(envelope.notificationType, "value", envelope.notificationType)) == "TEST":
            return {"ok": True}
        value = stores.verify_apple(envelope.data.signedTransactionInfo)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(422, "Invalid Apple notification") from exc
    existing = db.query(Membership).filter_by(provider="apple", original_id=value["original_id"]).first()
    purchase = db.query(Purchase).filter_by(provider="apple", transaction_id=value["transaction_id"]).first()
    if value["revoked"] and purchase:
        latest = db.query(Purchase).filter_by(provider="apple", original_id=value["original_id"]).order_by(Purchase.paid_at.desc()).first()
        svc.refund_purchase(db, purchase)
        if existing and latest and latest.id == purchase.id:
            existing.paid_until, existing.state = svc.now(), "revoked"
    elif existing and db.get(Learner, existing.learner_id):
        svc.apply_purchase(db, existing.learner_id, value)
        if envelope.data.signedRenewalInfo:
            renewal = stores.apple_verifier().verify_and_decode_renewal_info(envelope.data.signedRenewalInfo)
            if renewal.gracePeriodExpiresDate and stores.ms(renewal.gracePeriodExpiresDate) > svc.now():
                existing.state, existing.paid_until = "grace", stores.ms(renewal.gracePeriodExpiresDate)
    elif existing or purchase:
        return {"ok": True}
    else:
        # Retried once the initial verified client purchase establishes ownership.
        raise HTTPException(503, "Initial purchase verification has not arrived")
    db.commit()
    return {"ok": True}


@router.post("/notifications/google")
async def google_notification(request: Request, db: Session = Depends(get_db)):
    stores.verify_google_notification(request.headers.get("authorization", ""))
    payload = await request.json()
    try:
        data = json.loads(base64.b64decode(payload["message"]["data"]))
    except Exception as exc:
        raise HTTPException(422, "Invalid Pub/Sub envelope") from exc
    if data.get("packageName") != settings.commerce_bundle_id:
        raise HTTPException(422, "Unexpected application")
    if data.get("testNotification"):
        return {"ok": True}
    notification = data.get("subscriptionNotification") or data.get("oneTimeProductNotification") or data.get("voidedPurchaseNotification")
    if not notification:
        return {"ok": True}
    token_hash = hashlib.sha256(notification["purchaseToken"].encode()).hexdigest()
    old = db.query(Purchase).filter_by(provider="google", original_id=token_hash).order_by(Purchase.paid_at.desc()).first()
    if not old:
        raise HTTPException(503, "Initial purchase verification has not arrived")
    if not db.get(Learner, old.learner_id):
        return {"ok": True}
    if data.get("voidedPurchaseNotification"):
        revoked = db.query(Purchase).filter_by(provider="google", transaction_id=notification.get("orderId")).first()
        if revoked:
            svc.refund_purchase(db, revoked)
            if revoked.id == old.id:
                member = db.query(Membership).filter_by(provider="google", original_id=token_hash).first()
                if member:
                    member.state, member.paid_until = "revoked", svc.now()
    else:
        value = await stores.verify_google(notification.get("subscriptionId") or old.product_id, notification["purchaseToken"], old.learner_id)
        value["evidence"]["encrypted_token"] = encrypt_proof(notification["purchaseToken"])
        svc.apply_purchase(db, old.learner_id, value)
        member = db.query(Membership).filter_by(provider="google", original_id=token_hash).first()
        if member:
            member.state = value["state"]
            member.paid_until = value["paid_until"]
    db.commit()
    return {"ok": True}


class PayoutBody(BaseModel):
    method: Literal["cash", "gift"]
    recipient: str = Field(min_length=10, max_length=4000)


@router.post("/referrals/payout")
def request_payout(body: PayoutBody, learner: Learner = Depends(require_learner), db: Session = Depends(get_db)):
    if not settings.commerce_rewards_enabled:
        raise HTTPException(503, "Payout requests are not enabled")
    svc.lock_wallet(db, learner.id)
    profile = db.get(Profile, learner.id)
    if not profile or not profile.adult or not svc.setting(db, "reward_countries", {}).get(profile.country):
        raise HTTPException(409, "Your country requires a reviewed fulfilment route")
    rewards = db.query(ReferralReward).filter_by(referrer_id=learner.id, state="pending").filter(ReferralReward.available_at <= svc.now()).all()
    if sum(r.inr_paise for r in rewards) < 50000:
        raise HTTPException(409, "The ₹500-equivalent threshold or 45-day hold has not been satisfied")
    row = PayoutRequest(learner_id=learner.id, reward_ids=[r.id for r in rewards],
                        recipient_encrypted=encrypt_proof(json.dumps({"method": body.method, "country": profile.country, "recipient": body.recipient})))
    db.add(row)
    for reward in rewards:
        reward.state = "requested"
    db.commit()
    return {"id": row.id, "state": row.state}


@router.post("/admin/payouts/{payout_id}/fulfil")
def fulfil_payout(payout_id: str, body: FulfilmentBody, actor=Depends(admin_role), db: Session = Depends(get_db)):
    if not settings.commerce_rewards_enabled:
        raise HTTPException(503, "Payouts are not enabled")
    row = db.get(PayoutRequest, payout_id)
    if not row:
        raise HTTPException(404, "Unknown payout request")
    svc.lock_wallet(db, row.learner_id)
    if row.state == "paid":
        return {"ok": True}
    rewards = db.query(ReferralReward).filter(ReferralReward.id.in_(row.reward_ids)).all()
    if not rewards or any(r.state != "requested" or r.available_at > svc.now() for r in rewards) or sum(r.inr_paise for r in rewards) < 50000:
        raise HTTPException(409, "Payout needs review after reward adjustments")
    audit(db, actor, "payout.fulfil", {"id": payout_id, "evidence": body.evidence}, {"finance"})
    row.state, row.fulfilment = "paid", body.model_dump()
    for reward in rewards:
        reward.state, reward.fulfilment = "paid", {"payout_id": row.id}
    db.commit()
    return {"ok": True}


@router.post("/events/{event_id}/entries")
async def submit_entry(event_id: str, text: str = Form("", max_length=12000), file: UploadFile | None = File(None),
                       learner: Learner = Depends(require_learner), db: Session = Depends(get_db)):
    enabled()
    svc.lock_wallet(db, learner.id)
    event = db.get(HostedEvent, event_id)
    profile = db.get(Profile, learner.id)
    if not event or event.state != "published":
        raise HTTPException(404, "No open event")
    if not profile or not profile.adult or profile.country not in event.details.get("countries", []):
        raise HTTPException(403, "An eligible adult profile is required")
    if not stores.iso(event.details["starts_at"]) <= svc.now() <= stores.iso(event.details["ends_at"]):
        raise HTTPException(409, "The submission window is closed")
    start = svc.now().replace(hour=0, minute=0, second=0, microsecond=0)
    if db.query(EventEntry).filter_by(event_id=event_id, learner_id=learner.id).filter(EventEntry.created_at >= start).count() >= 10:
        raise HTTPException(429, "Every entrant has the same limit of ten submissions per day")
    if not text.strip() and not file:
        raise HTTPException(422, "Submit a poem, recitation, or song recording")
    entry = EventEntry(event_id=event_id, learner_id=learner.id, text=text)
    db.add(entry)
    db.flush()
    if file:
        content = await file.read(10 * 1024 * 1024 + 1)
        from app.services.audio_meta import audio_seconds
        duration = audio_seconds(content)
        if len(content) > 10 * 1024 * 1024 or not duration or duration > 300:
            raise HTTPException(422, "Use a WAV or M4A recording up to five minutes and 10 MB")
        from app.services.storage import get_storage
        entry.audio_key = get_storage().store_private(content, f"hosted/{event_id}/{entry.id}.m4a")
    db.commit()
    return {"id": entry.id, "state": entry.state, "entry_fee": 0}


class JudgeBody(BaseModel):
    score: int = Field(ge=0, le=100)
    state: Literal["reviewed", "disqualified"]
    rubric: str = Field(min_length=20, max_length=4000)
    integrity_reviewed: Literal[True]


@router.post("/admin/entries/{entry_id}/judge")
def judge_entry(entry_id: str, body: JudgeBody, actor=Depends(admin_role), db: Session = Depends(get_db)):
    row = db.get(EventEntry, entry_id)
    if not row:
        raise HTTPException(404, "Unknown entry")
    audit(db, actor, "entry.judge", {"id": entry_id, **body.model_dump()}, {"moderator"})
    row.score, row.state, row.judging = body.score, body.state, {**body.model_dump(), "judge": actor["actor"]}
    db.commit()
    return {"ok": True}


@router.get("/admin/entries/{entry_id}/audio")
def entry_audio(entry_id: str, actor=Depends(admin_role), db: Session = Depends(get_db)):
    audit(db, actor, "entry.audio_review", {"id": entry_id}, {"moderator"})
    row = db.get(EventEntry, entry_id)
    if not row or not row.audio_key:
        raise HTTPException(404, "No recording")
    from app.services.storage import get_storage
    from fastapi.responses import Response
    content = get_storage().read_private(row.audio_key)
    db.commit()
    return Response(content, media_type="audio/mp4", headers={"Cache-Control": "no-store"})


@router.get("/events/{event_id}/results")
def event_results(event_id: str, learner: Learner = Depends(require_learner), db: Session = Depends(get_db)):
    event = db.get(HostedEvent, event_id)
    if not event or event.state not in {"results_review", "fulfilled", "appeal"}:
        raise HTTPException(404, "Results are not published")
    rows = db.query(EventEntry).filter_by(event_id=event_id, state="reviewed").order_by(EventEntry.score.desc(), EventEntry.created_at).all()
    best, result = set(), []
    for row in rows:
        if row.learner_id in best:
            continue
        best.add(row.learner_id)
        user = db.get(Learner, row.learner_id)
        result.append({"rank": len(result) + 1, "name": user.display_name if user else "Learner", "score": row.score})
    return {"event_id": event_id, "state": event.state, "results": result}


class AppealBody(BaseModel):
    explanation: str = Field(min_length=20, max_length=4000)


@router.post("/events/{event_id}/appeal")
def appeal(event_id: str, body: AppealBody, learner: Learner = Depends(require_learner), db: Session = Depends(get_db)):
    event = db.get(HostedEvent, event_id)
    entry = db.query(EventEntry).filter_by(event_id=event_id, learner_id=learner.id).first()
    if not event or not entry:
        raise HTTPException(404, "No entry to appeal")
    # Entrants can append their own appeal; they cannot alter judging or results.
    entry.judging = {**entry.judging, "appeal": body.explanation, "appeal_at": svc.now().isoformat()}
    db.commit()
    return {"ok": True}


class PrizeBody(BaseModel):
    event_id: str = Field(max_length=64)
    learner_id: str = Field(max_length=64)
    cost_inr_paise: int = Field(gt=0)
    sponsor_inr_paise: int = Field(default=0, ge=0)
    evidence: str = Field(min_length=20, max_length=4000)
    integrity_reviewed: Literal[True]


@router.post("/admin/prizes")
def create_prize(body: PrizeBody, actor=Depends(admin_role), db: Session = Depends(get_db)):
    from sqlalchemy import func
    profile = db.get(Profile, body.learner_id)
    if not profile or not profile.adult or not svc.setting(db, "reward_countries", {}).get(profile.country):
        raise HTTPException(409, "An eligible adult recipient and funded country route are required")
    svc.lock_wallet(db, "system:prize-budget")
    month = svc.now().strftime("%Y-%m")
    used = db.query(func.sum(PrizeCase.cost_inr_paise - PrizeCase.sponsor_inr_paise)).filter_by(month=month).scalar() or 0
    budget = svc.setting(db, "prize_budget", {"monthly_inr_paise": 500000}).get("monthly_inr_paise", 500000)
    if body.sponsor_inr_paise > body.cost_inr_paise or used + body.cost_inr_paise - body.sponsor_inr_paise > budget:
        raise HTTPException(409, "Prize exceeds funded monthly budget")
    audit(db, actor, "prize.create", body.model_dump(), {"finance"})
    row = PrizeCase(event_id=body.event_id, learner_id=body.learner_id, month=month,
                    cost_inr_paise=body.cost_inr_paise, sponsor_inr_paise=body.sponsor_inr_paise,
                    details={"funding_evidence": body.evidence, "integrity_reviewed": True})
    db.add(row)
    db.commit()
    return {"id": row.id, "state": row.state}


@router.post("/admin/prizes/{prize_id}/fulfil")
def fulfil_prize(prize_id: str, body: FulfilmentBody, actor=Depends(admin_role), db: Session = Depends(get_db)):
    if not settings.commerce_rewards_enabled:
        raise HTTPException(503, "Prize fulfilment is not enabled")
    row = db.get(PrizeCase, prize_id)
    if not row:
        raise HTTPException(404, "Unknown prize")
    svc.lock_wallet(db, row.learner_id)
    audit(db, actor, "prize.fulfil", {"id": prize_id, **body.model_dump()}, {"finance"})
    row.state, row.details = "fulfilled", {**row.details, "delivery": body.model_dump()}
    db.commit()
    return {"ok": True}
