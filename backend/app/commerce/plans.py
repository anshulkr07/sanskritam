"""What Free, Lite and Plus include (owner decision 2026-11-06).

Modelled on Claude's Pro and Max plans: a plan is a monthly allowance that costs
far less than buying the same use with Mudrā, the way Pro and Max cost less than
the API for steady use. Guru minutes and scored recitations renew every plan
month and do not pile up; the Mudrā a plan adds stay in the wallet for good.

A plan month starts on the day the plan was bought or last renewed. An annual
plan has twelve plan months, and its Mudrā arrive one month at a time, so a year
that is later refunded cannot have been spent in advance.

Costs behind these numbers (specs/mudra-20261106.md): a Guru minute costs at most
₹2 (hybrid.voice_ready refuses a pipeline above that), a scored recitation about
₹0.33 (Sarvam speech-to-text at ₹0.49 a minute, for the recording and its live
captions), and Lite and Plus bring in about ₹71 and ₹215 a month after GST and
Google's 15%.
"""
import calendar

from fastapi import HTTPException

from app.commerce import service as svc
from app.commerce.models import Ledger, Purchase, VoiceCall, Wallet

PLANS = {
    # "discount": percent off the Mudrā price of books, audiobooks and avatars,
    # which cost nothing to serve. Talk minutes and recitations cost real money,
    # so members get them as a monthly allowance instead of a discount.
    "free": {"mudra": 0, "guru_minutes": 0, "recite_per_day": 2, "recite_per_month": None,
             "ads": True, "offline": False, "daily_multiplier": 1, "avatars": "bought", "discount": 0},
    "lite": {"mudra": 150, "guru_minutes": 30, "recite_per_day": None, "recite_per_month": 100,
             "ads": False, "offline": True, "daily_multiplier": 2, "avatars": "bought", "discount": 25},
    "plus": {"mudra": 500, "guru_minutes": 120, "recite_per_day": None, "recite_per_month": 500,
             "ads": False, "offline": True, "daily_multiplier": 3, "avatars": "all", "discount": 50},
}
# Tiers sold before Mudrā keep the nearest current plan.
LEGACY = {"pro": "plus", "institutional": "plus"}


def add_months(moment, months):
    month = moment.month - 1 + months
    year, month = moment.year + month // 12, month % 12 + 1
    return moment.replace(year=year, month=month, day=min(moment.day, calendar.monthrange(year, month)[1]))


def current(db, learner_id, at=None):
    """The learner's plan right now, or None on the free tier.

    {"tier", "rules", "purchase", "annual", "index", "start", "end", "paid_until", "state"}:
    ``start``/``end`` bound the current plan month.
    """
    from app.commerce import hybrid
    at = at or svc.now()
    member = svc.membership(db, learner_id, at)
    if member is None:
        return None
    tier = LEGACY.get(member.tier, member.tier)
    if tier not in PLANS or tier == "free":
        return None
    purchase = (db.query(Purchase).filter_by(learner_id=learner_id, provider=member.provider,
                                             original_id=member.original_id, state="paid")
                .filter(Purchase.paid_at <= at).order_by(Purchase.paid_at.desc()).first())
    anchor = purchase.paid_at if purchase else at
    product = hybrid.PRODUCTS.get(purchase.product_id, {}) if purchase else {}
    annual = product.get("months", 1) > 1
    index = 0
    if annual:
        while index < 11 and add_months(anchor, index + 1) <= at:
            index += 1
    start = add_months(anchor, index)
    end = min(add_months(anchor, index + 1), member.paid_until) if annual else member.paid_until
    return {"tier": tier, "rules": PLANS[tier], "purchase": purchase, "annual": annual, "index": index,
            "start": start, "end": max(end, start), "paid_until": member.paid_until, "state": member.state}


def tier_of(db, learner_id):
    plan = current(db, learner_id)
    return plan["tier"] if plan else None


def rules_for(db, learner_id):
    plan = current(db, learner_id)
    return plan["rules"] if plan else PLANS["free"]


def grant_due(db, learner_id):
    """Add the Mudrā of each annual-plan month that has begun. Idempotent; call
    under the wallet lock. The first month's Mudrā came with the payment."""
    from app.commerce import hybrid
    plan = current(db, learner_id)
    if not plan or not plan["annual"] or not plan["purchase"]:
        return 0
    purchase = plan["purchase"]
    monthly = hybrid.PRODUCTS.get(purchase.product_id, {}).get("credits", 0)
    if monthly <= 0:
        return 0
    # The caller holds the wallet lock; locking again would expire its changes.
    wallet = db.get(Wallet, learner_id) or svc.lock_wallet(db, learner_id)
    added = 0
    for month in range(1, plan["index"] + 1):
        key = f"plan:{purchase.id}:{month}"
        if not db.query(Ledger.id).filter_by(key=key).first():
            svc.journal(db, wallet, monthly, key, "plan_month", {"purchase_id": purchase.id, "month": month})
            added += monthly
    return added


def take_back_months(db, purchase, wallet):
    """On refund, take back the monthly Mudrā an annual plan had added."""
    for row in db.query(Ledger).filter(Ledger.key.like(f"plan:{purchase.id}:%")).all():
        svc.journal(db, wallet, -row.amount, "refund-" + row.key, "refund", {"purchase_id": purchase.id},
                    allow_deficit=True)


def period_key(plan):
    return plan["start"].strftime("%Y-%m-%dT%H:%M:%S")


def guru_used_ms(db, learner_id, key):
    used = 0
    for call in db.query(VoiceCall).filter_by(learner_id=learner_id, plan_period=key):
        if call.state == "reserved":
            used += call.plan_ms or 0
        else:
            used += min(call.plan_ms or 0, max(0, (call.billed_ms or 0) - (call.trial_ms or 0)))
    return used


def guru_left(db, learner_id):
    """(plan month key, milliseconds of plan Guru time left); (None, 0) without a plan."""
    plan = current(db, learner_id)
    if not plan or not plan["rules"]["guru_minutes"]:
        return None, 0
    key = period_key(plan)
    return key, max(0, plan["rules"]["guru_minutes"] * 60_000 - guru_used_ms(db, learner_id, key))


def _scored(db, learner_id, since, until=None):
    from app.models import ReciteAttempt
    query = db.query(ReciteAttempt).filter(ReciteAttempt.learner_id == learner_id,
                                           ReciteAttempt.status == "scored",
                                           ReciteAttempt.competition_id.is_(None),
                                           ReciteAttempt.created_at >= since)
    if until is not None:
        query = query.filter(ReciteAttempt.created_at < until)
    return query


def recite_state(db, learner):
    """{"per": "day"|"month", "total", "used", "left", "resets_at"} for scored practice.

    Competition entries are scored separately and never counted here."""
    from datetime import timedelta
    from app.services.localtime import local_date_of, local_now
    plan = current(db, learner.id)
    if plan and plan["rules"]["recite_per_month"]:
        total = plan["rules"]["recite_per_month"]
        used = _scored(db, learner.id, plan["start"], plan["end"]).count()
        return {"per": "month", "total": total, "used": used, "left": max(0, total - used),
                "resets_at": plan["end"]}
    total = PLANS["free"]["recite_per_day"]
    tz = getattr(learner, "timezone", None)
    today = local_date_of(svc.now(), tz)
    rows = _scored(db, learner.id, svc.now() - timedelta(hours=36)).all()
    used = sum(1 for r in rows if local_date_of(r.created_at, tz) == today)
    now_local = local_now(tz)
    seconds_left = max(1, 24 * 3600 - (now_local.hour * 3600 + now_local.minute * 60 + now_local.second))
    return {"per": "day", "total": total, "used": used, "left": max(0, total - used),
            "resets_at": svc.now() + timedelta(seconds=seconds_left)}


def check_recite(db, learner):
    """Refuse a scored practice recitation once the day's or month's are used."""
    from app.commerce import hybrid
    if not hybrid.enabled():
        return
    state = recite_state(db, learner)
    if state["left"] > 0:
        return
    retry = max(1, int((state["resets_at"] - svc.now()).total_seconds()))
    if state["per"] == "day":
        detail = {"code": "recite_limit", "per": "day", "total": state["total"],
                  "message": f"You have used today's {state['total']} scored recitations. "
                             f"Lite gives {PLANS['lite']['recite_per_month']} a month, Plus {PLANS['plus']['recite_per_month']}."}
    else:
        detail = {"code": "recite_limit", "per": "month", "total": state["total"],
                  "message": f"This month's {state['total']} scored recitations are used. "
                             "They renew with your next plan month."}
    raise HTTPException(429, detail, headers={"Retry-After": str(retry)})


def public():
    """The plan table the shop shows."""
    return {tier: {k: v for k, v in rules.items() if k != "daily_multiplier"} for tier, rules in PLANS.items()}


def view(db, learner):
    """The learner's plan and what is left of this plan month."""
    plan = current(db, learner.id)
    recite = recite_state(db, learner)
    out = {"tier": plan["tier"] if plan else "free", "recite": {k: recite[k] for k in ("per", "total", "used", "left")},
           "recite_resets_at": recite["resets_at"]}
    if plan:
        key, left_ms = guru_left(db, learner.id)
        out.update(month_ends=plan["end"], paid_until=plan["paid_until"], annual=plan["annual"],
                   renews=plan["state"] == "active",
                   guru={"total_minutes": plan["rules"]["guru_minutes"], "left_seconds": left_ms // 1000})
    return out
