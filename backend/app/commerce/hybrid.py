"""Direct edition ownership and non-expiring voice time, independent of membership.

All mutations run under the existing per-account wallet lock. Store receipts are
verified before this module is called. Prices here are planning references only.
"""
import math
from datetime import timedelta

from fastapi import HTTPException
from app.config import settings
PREFIX = "com.sanskritam.app."
from app.commerce.models import OwnedEdition, Title, VoiceBalance, VoiceCall

PRODUCTS = {
    PREFIX + "plus.v2.monthly": {"kind": "subscription", "tier": "plus", "credits": 0, "inr": 299, "name": "Plus monthly"},
    PREFIX + "plus.v2.annual": {"kind": "subscription", "tier": "plus", "credits": 0, "inr": 2499, "name": "Plus annual"},
    **{PREFIX + f"guru.minutes.{minutes}": {"kind": "voice_pack", "credits": 0, "minutes": minutes,
        "inr": inr, "usd": usd, "name": f"Guru · {minutes} minutes"}
       for minutes, inr, usd in ((5, 49, .99), (15, 149, 2.99), (30, 279, 5.49))},
}
# Each edition has its own non-consumable SKU; no client-selected title grants.
for slug, name, prices in (("isha", "Īśopaniṣad", (99, 149, 249)),
                           ("gita", "Bhagavad Gita", (199, 249, 399)),
                           ("katha", "Kaṭha Upaniṣad", (149, 199, 299))):
    for medium, price in zip(("book", "audio", "bundle"), prices):
        PRODUCTS[PREFIX + f"edition.{slug}.{medium}"] = {
            "kind": "edition", "credits": 0, "inr": price, "name": f"{name} · {medium}",
            "titles": [slug + ":" + m for m in (("book", "audio") if medium == "bundle" else (medium,))],
        }

REGIONAL_PLUS = {"INR": [299, 2499], "USD": [9.99, 79.99], "GBP": [7.99, 59.99],
    "EUR": [8.99, 69.99], "CAD": [12.99, 99.99], "AUD": [14.99, 119.99], "AED": [29.99, 229.99]}
TRIAL_MS = 180_000
VOICE_PIPELINE_ID = "guru-sarvam-v1"
VOICE_CONFIG = {"pipeline": 1, "persona": "guru", "tts_model": "bulbul:v3", "speaker": "ashutosh",
                "llm_model": "sarvam-105b-conversations", "web_search": False, "thinking_budget": 0}


def enabled():
    return settings.commerce_enabled and settings.commerce_hybrid_enabled


def premium(db, title_id):
    title = db.get(Title, title_id)
    return bool(title and title.published and title.metadata_json.get("premium") is True)


def owns(db, learner_id, title_id):
    return db.query(OwnedEdition).filter_by(learner_id=learner_id, title_id=title_id, revoked=False).first() is not None


def can_access(db, learner_id, title_id):
    from app.commerce import service as svc
    if not premium(db, title_id) or owns(db, learner_id, title_id):
        return True
    return bool(svc.membership(db, learner_id) or svc.title_access(db, learner_id, title_id))


def voice_ready(db):
    from app.commerce import service as svc
    cost = svc.setting(db, "ai_costs", {}).get("voice", {})
    bound = cost.get("bound_inr", 0)
    return bool(settings.commerce_voice_enabled and cost.get("verified_at") and cost.get("pipeline_id") == VOICE_PIPELINE_ID and
                len(str(cost.get("evidence", ""))) >= 20 and isinstance(bound, (int, float)) and
                not isinstance(bound, bool) and math.isfinite(bound) and 0 < bound <= 2)


def offers(db):
    has_premium = any(t.metadata_json.get("premium") is True for t in db.query(Title).filter_by(published=True))
    return [{"id": key, **value} for key, value in PRODUCTS.items()
            if (value["kind"] != "subscription" or has_premium)
            and (value["kind"] != "edition" or all(premium(db, t) for t in value["titles"]))
            and (value["kind"] != "voice_pack" or voice_ready(db))]


def balance(db, learner_id):
    row = db.get(VoiceBalance, learner_id)
    if row is None:
        row = VoiceBalance(learner_id=learner_id, paid_ms=0, trial_used_ms=0)
        db.add(row)
        db.flush()
    return row


def grant(db, purchase, product):
    if product["kind"] == "edition":
        # Fulfil an already-paid, verified store receipt even if the catalogue
        # was paused between checkout and delivery. SKU-to-title mapping is fixed.
        for title_id in product["titles"]:
            db.add(OwnedEdition(learner_id=purchase.learner_id, title_id=title_id, purchase_id=purchase.id))
    elif product["kind"] == "voice_pack":
        # A completed store payment must be delivered even if new sales pause.
        balance(db, purchase.learner_id).paid_ms += product["minutes"] * 60_000


def revoke(db, purchase):
    product = PRODUCTS.get(purchase.product_id, {})
    db.query(OwnedEdition).filter_by(purchase_id=purchase.id).update({"revoked": True})
    if product.get("kind") == "voice_pack":
        balance(db, purchase.learner_id).paid_ms -= product["minutes"] * 60_000


def settle_call(db, call, used_ms=None):
    from app.commerce import service as svc
    if call.state != "reserved":
        return call.billed_ms
    reserved = call.trial_ms + call.paid_ms
    if used_ms is None:
        used_ms = max(0, math.ceil((min(svc.now(), call.expires_at) - call.delivered_at).total_seconds() * 1000)) if call.delivered_at else 0
    used_ms = max(0, min(reserved, used_ms))
    used_trial = min(call.trial_ms, used_ms)
    b = balance(db, call.learner_id)
    b.trial_used_ms -= call.trial_ms - used_trial
    b.paid_ms += call.paid_ms - (used_ms - used_trial)
    call.billed_ms, call.state = used_ms, "settled"
    return used_ms


def snapshot(db, learner_id):
    from app.commerce import service as svc
    for call in db.query(VoiceCall).filter_by(learner_id=learner_id, state="reserved").filter(VoiceCall.expires_at <= svc.now()):
        settle_call(db, call)
    b = balance(db, learner_id)
    return {"paid_seconds": max(0, b.paid_ms) // 1000, "trial_seconds": max(0, TRIAL_MS - b.trial_used_ms) // 1000,
        "deficit_seconds": max(0, -b.paid_ms) // 1000, "voice_enabled": voice_ready(db),
        "owned_titles": sorted({r.title_id for r in db.query(OwnedEdition).filter_by(learner_id=learner_id, revoked=False)}),
        "call_active": db.query(VoiceCall).filter_by(learner_id=learner_id, state="reserved").first() is not None}


def reserve_call(db, learner_id):
    from app.commerce import service as svc
    from app.models import Learner
    svc.lock_wallet(db, learner_id)
    learner = db.get(Learner, learner_id)
    if not learner or not (learner.google_sub or learner.apple_sub):
        raise HTTPException(409, "Sign in with Google or Apple to protect your free trial and purchased minutes")
    if not voice_ready(db):
        raise HTTPException(503, "Guru voice is being prepared")
    state = snapshot(db, learner_id)
    if state["call_active"]:
        raise HTTPException(409, "End your current Guru call before starting another")
    b = balance(db, learner_id)
    trial = min(TRIAL_MS - b.trial_used_ms, 600_000)
    paid = min(max(0, b.paid_ms), 600_000 - trial)
    if trial + paid < 1000:
        raise HTTPException(402, "Buy a minute pack to continue. No subscription is required")
    b.trial_used_ms += trial
    b.paid_ms -= paid
    call = VoiceCall(learner_id=learner_id, trial_ms=trial, paid_ms=paid,
        expires_at=svc.now() + timedelta(seconds=30 + (trial + paid) / 1000))
    db.add(call)
    db.flush()
    return call
