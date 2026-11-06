"""Owned editions and Guru time, bought with Mudrā (owner decision 2026-11-06).

Mudrā is the app's coin. Store purchases put Mudrā in the wallet: packs
(kind "refill") and Lite/Plus, which add Mudrā every plan month and include
monthly Guru minutes, scored recitations, offline downloads and no ads
(commerce/plans.py). Books, audiobooks and extra Guru minutes are bought with
Mudrā (commerce/mudra.py) and owned for good. Plans do not open paid books by
themselves. The per-edition and Guru-minute store SKUs below stay only so that
any receipt for them can still be verified; they are not offered.

All mutations run under the existing per-account wallet lock. Store receipts are
verified before this module is called. Prices here are planning references only:
the app always shows the store's localized price.
"""
import math
from datetime import timedelta

from fastapi import HTTPException
from app.config import settings
PREFIX = "com.sanskritam.app."
from app.commerce.models import OwnedEdition, Title, VoiceBalance, VoiceCall

def mudra_for_inr(inr):
    """Mudrā a pack of this rupee price gives (owner, 2026-11-06): the price
    rounded up to the next ten, then 10% extra from 300 and 20% extra from 1,000.
    ₹99 gives 100, ₹299 gives 330, ₹999 gives 1,200."""
    base = -(-inr // 10) * 10
    return base + base * (20 if base >= 1000 else 10 if base >= 300 else 0) // 100


# Google Play sells fixed prices only, so a "custom amount" is one of these
# packs, stepped through in the shop. Three of them are also shown as presets.
# Rupee prices with planning-reference dollar prices; the store sets each
# country's real price.
MUDRA_PACKS = ((49, 1.49), (99, 2.99), (149, 4.49), (199, 5.99), (249, 7.49), (299, 8.99), (399, 11.99),
               (499, 14.99), (699, 20.99), (999, 29.99), (1499, 44.99), (1999, 59.99), (2999, 89.99), (4999, 149.99))
MUDRA_PRESETS = (99, 299, 999)

# "credits" is the Mudrā one plan month adds: a monthly payment adds it at once,
# an annual payment adds the first month at once and the rest one month at a
# time (plans.grant_due). Annual costs ten months: two months free.
PRODUCTS = {
    PREFIX + "lite.v2.monthly": {"kind": "subscription", "tier": "lite", "credits": 150, "months": 1, "inr": 99, "usd": 3.99, "name": "Lite monthly"},
    PREFIX + "lite.v2.annual": {"kind": "subscription", "tier": "lite", "credits": 150, "months": 12, "inr": 999, "usd": 39.99, "name": "Lite annual"},
    PREFIX + "plus.v2.monthly": {"kind": "subscription", "tier": "plus", "credits": 500, "months": 1, "inr": 299, "usd": 9.99, "name": "Plus monthly"},
    PREFIX + "plus.v2.annual": {"kind": "subscription", "tier": "plus", "credits": 500, "months": 12, "inr": 2999, "usd": 99.99, "name": "Plus annual"},
    # Mudrā packs: consumable store products named by the Mudrā they give.
    # India anchors 1 Mudrā ≈ ₹1; elsewhere the store price follows local
    # prices (specs/mudra-20261106.md).
    **{PREFIX + f"mudra.{mudra_for_inr(inr)}": {"kind": "refill", "credits": mudra_for_inr(inr), "inr": inr, "usd": usd,
        "name": f"{mudra_for_inr(inr)} Mudrā", "preset": inr in MUDRA_PRESETS,
        "extra": mudra_for_inr(inr) - -(-inr // 10) * 10}
       for inr, usd in MUDRA_PACKS},
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

REGIONAL_PLUS = {"INR": [299, 2999], "USD": [9.99, 99.99], "GBP": [7.99, 79.99],
    "EUR": [8.99, 89.99], "CAD": [12.99, 129.99], "AUD": [14.99, 149.99], "AED": [29.99, 299.99]}
REGIONAL_LITE = {"INR": [99, 999], "USD": [3.99, 39.99], "GBP": [2.99, 29.99],
    "EUR": [3.49, 34.99], "CAD": [4.99, 49.99], "AUD": [5.99, 59.99], "AED": [12.99, 129.99]}
TRIAL_MS = 180_000
VOICE_PIPELINE_ID = "guru-sarvam-v1"
VOICE_CONFIG = {"pipeline": 1, "persona": "guru", "tts_model": "bulbul:v3", "speaker": "ashutosh",
                "llm_model": "sarvam-105b-conversations", "web_search": False, "thinking_budget": 0}


def enabled():
    return settings.commerce_enabled and settings.commerce_hybrid_enabled


def premium(db, title_id):
    from app.commerce.licensing import noncommercial
    title = db.get(Title, title_id)
    # A non-commercial licence keeps a text free whatever its catalogue row says.
    return bool(title and title.published and title.metadata_json.get("premium") is True
                and not noncommercial(db, title_id))


def owns(db, learner_id, title_id):
    return db.query(OwnedEdition).filter_by(learner_id=learner_id, title_id=title_id, revoked=False).first() is not None


def lite_included(db, title_id):
    title = db.get(Title, title_id)
    return bool(premium(db, title_id) and title.metadata_json.get("lite_included") is True)


def member_access(db, member, title_id):
    # Under Mudrā a plan grants Mudrā and removes ads; it does not open books.
    return False


def can_access(db, learner_id, title_id):
    from app.commerce import service as svc
    if not premium(db, title_id) or owns(db, learner_id, title_id):
        return True
    return bool(svc.title_access(db, learner_id, title_id))


def can_download(db, learner_id, title_id):
    """Offline copies: owned editions always; free books and audio with a plan;
    non-commercial texts for everyone (they are never a plan perk)."""
    from app.commerce import service as svc
    from app.commerce.licensing import noncommercial
    if owns(db, learner_id, title_id) or svc.title_access(db, learner_id, title_id) or noncommercial(db, title_id):
        return True
    return bool(not premium(db, title_id) and svc.membership(db, learner_id))


# List prices in Mudrā by demand, not length (owner, 2026-11-06): people buy
# the Gītā far more than a Purāṇa of 10,000 verses. (book, audiobook).
# A title's own Title.credits wins; then metadata {"tier": ...}; then this map;
# then length: up to 50 verse pages is a stotra, anything longer scholarly.
# Members pay less: plans.PLANS "discount".
TIER_PRICES = {"flagship": (199, 249), "popular": (99, 149), "stotra": (29, 49), "scholarly": (79, 129)}
DEMAND_TIERS = {
    "flagship": ("gita",),
    "popular": ("isha", "katha", "mundaka", "kena", "prashna", "mandukya", "taittiriya", "aitareya",
                "shvetashvatara", "yogasutra", "hathayoga", "vishnusahasranama", "lalita", "saundarya",
                "devimahatmya", "naradabhakti", "ashtavakra", "bhagavata", "ramayana", "mahabharata",
                "chanakya", "hito", "pancha", "niti", "subhashita", "meghaduta", "shakuntala", "gitagovinda"),
    "stotra": ("aditya", "bhajagovindam", "tandava", "mahimna", "ramaraksha"),
    "scholarly": ("shivapurana", "garuda", "rigveda", "samaveda", "yajurveda", "atharvaveda", "chandogya",
                  "brihadaranyaka", "kumarasambhava", "raghuvamsha", "vetala", "simhasana", "sushruta",
                  "ayurveda", "amarakosha", "arthashastra", "lilavati"),
}
TIER_OF = {slug: tier for tier, slugs in DEMAND_TIERS.items() for slug in slugs}


def demand_tier(db, title):
    """The book's price tier, or None when there is nothing in it to sell."""
    from app.models import CanonText
    from app.commerce import preview
    counts = db.info.setdefault("verse_counts", {})
    if title.slug not in counts:
        text = db.query(CanonText).filter_by(slug=title.slug).first()
        counts[title.slug] = len(preview.book_rows(db, text)) if text else 0
    if not counts[title.slug]:
        return None  # not imported yet: nothing to sell
    tier = (title.metadata_json or {}).get("tier") or TIER_OF.get(title.slug)
    if tier in TIER_PRICES:
        return tier
    return "stotra" if counts[title.slug] <= 50 else "scholarly"


def suggested_price(db, title):
    """The list price for this book's demand tier, or None when there is none."""
    tier = demand_tier(db, title)
    if tier is None:
        return None
    book, audio = TIER_PRICES[tier]
    return audio if title.medium == "audio" else book


def price(db, title_id):
    """The Mudrā list price of a premium, published title, or None when it is not for sale."""
    if not premium(db, title_id):
        return None
    title = db.get(Title, title_id)
    return title.credits if (title.credits or 0) > 0 else suggested_price(db, title)


def entitlements(db, learner_id):
    from app.commerce import service as svc
    member = svc.membership(db, learner_id)
    titles = [t for t in db.query(Title).filter_by(published=True) if t.metadata_json.get("premium") is True]
    return {"member_tier": member.tier if member else "free", "ad_free": bool(member),
        "background_audio": True, "offline_free_titles": bool(member),
        "catalogue": [{"id": t.id, "name": t.name, "medium": t.medium, "price": price(db, t.id),
                       "lite_included": False} for t in titles],
        "included_titles": [],
        "downloadable_titles": [t.id for t in titles if can_download(db, learner_id, t.id)]}


def voice_ready(db):
    from app.commerce import service as svc
    cost = svc.setting(db, "ai_costs", {}).get("voice", {})
    bound = cost.get("bound_inr", 0)
    return bool(settings.commerce_voice_enabled and cost.get("verified_at") and cost.get("pipeline_id") == VOICE_PIPELINE_ID and
                len(str(cost.get("evidence", ""))) >= 20 and isinstance(bound, (int, float)) and
                not isinstance(bound, bool) and math.isfinite(bound) and 0 < bound <= 2)


def offers(db):
    """Store products for sale: Mudrā packs and Lite/Plus, once there is
    something to spend Mudrā on (a priced book or audiobook, or Guru voice)."""
    spendable = voice_ready(db) or any(price(db, t.id) for t in db.query(Title).filter_by(published=True))
    return [{"id": key, **value} for key, value in PRODUCTS.items()
            if spendable and value["kind"] in {"subscription", "refill"}]


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
    """Bill what was used: the free trial first, then the plan month's minutes,
    then minutes bought with Mudrā. Unused plan time returns to its month."""
    from app.commerce import service as svc
    if call.state != "reserved":
        return call.billed_ms
    plan_ms = call.plan_ms or 0
    reserved = call.trial_ms + plan_ms + call.paid_ms
    if used_ms is None:
        used_ms = max(0, math.ceil((min(svc.now(), call.expires_at) - call.delivered_at).total_seconds() * 1000)) if call.delivered_at else 0
    used_ms = max(0, min(reserved, used_ms))
    used_trial = min(call.trial_ms, used_ms)
    used_plan = min(plan_ms, used_ms - used_trial)
    b = balance(db, call.learner_id)
    b.trial_used_ms -= call.trial_ms - used_trial
    b.paid_ms += call.paid_ms - (used_ms - used_trial - used_plan)
    call.billed_ms, call.state = used_ms, "settled"
    return used_ms


def snapshot(db, learner_id):
    from app.commerce import service as svc
    for call in db.query(VoiceCall).filter_by(learner_id=learner_id, state="reserved").filter(VoiceCall.expires_at <= svc.now()):
        settle_call(db, call)
    b = balance(db, learner_id)
    from app.commerce import plans
    _, plan_ms = plans.guru_left(db, learner_id)
    return {"paid_seconds": max(0, b.paid_ms) // 1000, "trial_seconds": max(0, TRIAL_MS - b.trial_used_ms) // 1000,
        "plan_seconds": plan_ms // 1000,
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
    from app.commerce import plans
    trial = max(0, min(TRIAL_MS - b.trial_used_ms, 600_000))
    period, plan_left = plans.guru_left(db, learner_id)
    plan = min(plan_left, 600_000 - trial)
    paid = min(max(0, b.paid_ms), 600_000 - trial - plan)
    if trial + plan + paid < 1000:
        raise HTTPException(402, "Buy Guru minutes with Mudrā, or choose Lite or Plus for minutes every month")
    b.trial_used_ms += trial
    b.paid_ms -= paid
    call = VoiceCall(learner_id=learner_id, trial_ms=trial, paid_ms=paid, plan_ms=plan, plan_period=period if plan else None,
        expires_at=svc.now() + timedelta(seconds=30 + (trial + plan + paid) / 1000))
    db.add(call)
    db.flush()
    return call
