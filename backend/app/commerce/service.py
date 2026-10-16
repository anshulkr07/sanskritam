from __future__ import annotations

import hashlib
import math
from datetime import datetime, timedelta

from fastapi import HTTPException
from sqlalchemy import update, or_
from sqlalchemy.orm import Session

from app.commerce.catalogue import PRODUCTS, TIERS, ACTION_RATES
from app.commerce.models import (Wallet, Ledger, Membership, Purchase, Unlock, Title,
                                Cooldown, Reservation, Setting, Referral, ReferralReward)


def now():
    return datetime.utcnow()


def setting(db: Session, key: str, default=None):
    row = db.get(Setting, key)
    return row.value if row else default


def product_catalogue(db):
    overrides = setting(db, "products", {})
    return {key: {**value, "credits": overrides.get(key, {}).get("credits", value["credits"])} for key, value in PRODUCTS.items()}


def lock_wallet(db: Session, learner_id: str) -> Wallet:
    """An UPDATE locks a wallet on both PostgreSQL and SQLite (FOR UPDATE does not)."""
    db.flush()  # expire_all must never discard a caller's pending changes
    for key in list(db.info):
        if isinstance(key, tuple) and key[0] == "commerce_access":
            db.info.pop(key)
    from sqlalchemy.dialects.sqlite import insert as sqlite_insert
    from sqlalchemy.dialects.postgresql import insert as pg_insert
    insert = pg_insert if db.get_bind().dialect.name == "postgresql" else sqlite_insert
    db.execute(insert(Wallet).values(learner_id=learner_id, balance=0, reserved=0, voice_milliseconds=0, version=0)
               .on_conflict_do_nothing(index_elements=["learner_id"]))
    db.execute(update(Wallet).where(Wallet.learner_id == learner_id).values(version=Wallet.version + 1))
    db.expire_all()
    return db.get(Wallet, learner_id)


def journal(db, wallet, amount, key, kind, details=None, allow_deficit=False):
    previous = db.query(Ledger).filter_by(key=key).first()
    if previous:
        if previous.learner_id != wallet.learner_id or previous.amount != amount:
            raise HTTPException(409, "Idempotency key already used for another operation")
        return previous
    if not allow_deficit and amount < 0 and wallet.balance - wallet.reserved + amount < 0:
        raise HTTPException(402, {"code": "insufficient_credits", "required": -amount,
                                  "available": max(0, wallet.balance - wallet.reserved)})
    wallet.balance += amount
    row = Ledger(learner_id=wallet.learner_id, key=key, amount=amount, kind=kind, details=details or {})
    db.add(row)
    db.flush()
    return row


def expire_reservations(db, wallet):
    for row in db.query(Reservation).filter_by(learner_id=wallet.learner_id, status="open").filter(Reservation.expires_at <= now()):
        wallet.reserved -= row.amount
        row.status = "expired"


def membership(db, learner_id, at=None):
    at = at or now()
    rows = db.query(Membership).filter_by(learner_id=learner_id).filter(
        Membership.paid_until > at, Membership.state.in_(["active", "cancelled", "grace"])).all()
    return max(rows, key=lambda row: list(TIERS).index(row.tier), default=None)


def active_unlocks(db, learner_id, at=None):
    return db.query(Unlock).filter_by(learner_id=learner_id, surrendered_at=None).filter(Unlock.expires_at > (at or now())).all()


def title_access(db, learner_id, title_id):
    return db.query(Unlock).filter_by(learner_id=learner_id, title_id=title_id, surrendered_at=None).filter(Unlock.expires_at > now()).first()


def extend_titles(db, learner_id, paid_until, eligible_at=None):
    for row in active_unlocks(db, learner_id, eligible_at):
        row.expires_at = max(row.expires_at, paid_until + timedelta(days=365))
        row.membership_extended = True


def snapshot(db, learner_id):
    wallet = lock_wallet(db, learner_id)
    expire_reservations(db, wallet)
    member = membership(db, learner_id)
    unlocks = active_unlocks(db, learner_id)
    cooldowns = db.query(Cooldown).filter_by(learner_id=learner_id, skipped=False).filter(Cooldown.until > now()).all()
    return {"tier": member.tier if member else "free", "member_until": member.paid_until if member else None,
            "balance": wallet.balance, "reserved": wallet.reserved,
            "available": max(0, wallet.balance - wallet.reserved), "deficit": max(0, -wallet.balance),
            "slots": TIERS[member.tier if member else "free"]["slots"],
            "offline": bool(member), "background_audio": bool(member), "ad_free": bool(member),
            "unlocks": [{"id": r.id, "title_id": r.title_id, "expires_at": r.expires_at} for r in unlocks],
            "cooldowns": [{"id": r.id, "until": r.until} for r in cooldowns]}


def unlock_title(db, learner_id, title_id, request_id, expected_credits=None):
    wallet = lock_wallet(db, learner_id)
    expire_reservations(db, wallet)
    key = f"unlock:{learner_id}:{request_id}"
    previous = db.query(Ledger).filter_by(key=key).first()
    if previous:
        if previous.details.get("title_id") != title_id:
            raise HTTPException(409, "Request already used for another title")
        return db.get(Unlock, previous.details["unlock_id"])
    title = db.get(Title, title_id)
    if not title or not title.published:
        raise HTTPException(404, "Title is not available for purchase")
    existing = title_access(db, learner_id, title_id)
    if existing:
        return existing
    if expected_credits is not None and title.credits != expected_credits:
        raise HTTPException(409, {"code": "price_changed", "credits": title.credits})
    member = membership(db, learner_id)
    limit = TIERS[member.tier if member else "free"]["slots"]
    used = len(active_unlocks(db, learner_id))
    cooling = 0 if member else db.query(Cooldown).filter_by(learner_id=learner_id, skipped=False).filter(Cooldown.until > now()).count()
    if limit is not None and used + cooling >= limit:
        raise HTTPException(409, {"code": "slots_full", "active": used, "cooling": cooling, "limit": limit})
    row = Unlock(learner_id=learner_id, title_id=title_id, acquired_at=now(),
                 expires_at=(member.paid_until if member else now()) + timedelta(days=365),
                 membership_extended=bool(member))
    db.add(row)
    db.flush()
    journal(db, wallet, -title.credits, key, "title_unlock", {"title_id": title_id, "unlock_id": row.id})
    return row


def surrender(db, learner_id, unlock_id):
    lock_wallet(db, learner_id)
    row = db.get(Unlock, unlock_id)
    if not row or row.learner_id != learner_id:
        raise HTTPException(404, "Unknown unlock")
    if row.surrendered_at:
        return
    is_active = row.expires_at > now()
    row.surrendered_at = now()
    if is_active and not membership(db, learner_id):
        db.add(Cooldown(learner_id=learner_id, unlock_id=row.id, until=now() + timedelta(days=7)))


def skip_cooldown(db, learner_id, cooldown_id, expected_credits=None):
    wallet = lock_wallet(db, learner_id)
    row = db.get(Cooldown, cooldown_id)
    if not row or row.learner_id != learner_id:
        raise HTTPException(404, "Unknown slot")
    if row.skipped or row.until <= now() or membership(db, learner_id):
        return
    cost = int(setting(db, "skip_credits", 25))
    if expected_credits is not None and cost != expected_credits:
        raise HTTPException(409, {"code": "price_changed", "credits": cost})
    journal(db, wallet, -cost, f"skip:{row.id}", "cooldown_skip")
    row.skipped = True


def action_quote(db, action, seconds=0):
    if action not in ACTION_RATES:
        raise HTTPException(404, "Unknown credit action")
    report = setting(db, "ai_costs", {})
    item = report.get(action, {})
    if not item.get("verified_at") or not item.get("evidence") or float(item.get("bound_inr", 0)) <= 0:
        raise HTTPException(503, "This AI action is awaiting cost verification")
    rate = max(ACTION_RATES[action], math.ceil(float(item["bound_inr"]) / .10))
    # For voice the bound/rate is per minute, rounded upwards to a 15s quantum.
    rate = math.ceil(rate / 4) * 4 if action == "voice" else rate
    amount = math.ceil(seconds / 15) * (rate // 4) if action == "voice" else rate
    if amount <= 0 or amount > 100000:
        raise HTTPException(422, "Choose a valid spending limit")
    return {"action": action, "credits": amount, "rate": rate,
            "unit": "minute" if action == "voice" else "action", "seconds": seconds}


def reserve(db, learner_id, action, request_id, seconds=0):
    wallet = lock_wallet(db, learner_id)
    expire_reservations(db, wallet)
    key = f"reserve:{learner_id}:{request_id}"
    existing = db.query(Reservation).filter_by(key=key).first()
    if existing:
        if existing.action != action:
            raise HTTPException(409, "Request already used for another action")
        return existing
    quote = action_quote(db, action, seconds)
    if wallet.balance < 0 or quote["credits"] > wallet.balance - wallet.reserved:
        raise HTTPException(402, "Insufficient credits")
    wallet.reserved += quote["credits"]
    row = Reservation(learner_id=learner_id, key=key, action=action, amount=quote["credits"],
                      rate=quote["rate"], expires_at=now() + timedelta(minutes=max(10, math.ceil(seconds / 60) + 5)))
    db.add(row)
    db.flush()
    return row


def settle(db, learner_id, reservation_id, delivered=True, seconds=0):
    """Internal only: delivery is established by the server, never by a client claim."""
    wallet = lock_wallet(db, learner_id)
    row = db.get(Reservation, reservation_id)
    if not row or row.learner_id != learner_id:
        raise HTTPException(404, "Unknown reservation")
    if row.status != "open":
        return row
    amount = row.amount if delivered else 0
    if row.action == "voice":
        milliseconds = max(0, int(seconds * 1000)) if delivered else 0
        total = wallet.voice_milliseconds + milliseconds
        intervals = total // 15000
        amount = min(row.amount, intervals * (row.rate // 4))
        wallet.voice_milliseconds = total % 15000
    wallet.reserved -= row.amount
    journal(db, wallet, -amount, f"settle:{row.id}", "ai_usage", {"action": row.action}, allow_deficit=True)
    row.status = "settled" if delivered else "released"
    row.settled = amount
    return row


def apply_purchase(db, learner_id, verified):
    """Accepts normalized data only from a cryptographically verified store adapter."""
    wallet = lock_wallet(db, learner_id)
    provider, tx = verified["provider"], verified["transaction_id"]
    old = db.query(Purchase).filter_by(provider=provider, transaction_id=tx).first()
    if old:
        if old.learner_id != learner_id:
            raise HTTPException(409, "Purchase belongs to another account")
        member = db.query(Membership).filter_by(provider=provider, original_id=verified["original_id"]).first()
        latest = db.query(Purchase).filter_by(provider=provider, original_id=verified["original_id"]).order_by(Purchase.paid_at.desc()).first()
        if member and old.state == "paid" and latest.id == old.id and member.state != "deleted" and verified.get("state"):
            member.state, member.paid_until = verified["state"], verified["paid_until"]
        return old
    product = product_catalogue(db).get(verified["product_id"])
    if not product:
        raise HTTPException(422, "Unknown store product")
    credits = product["credits"]
    if verified.get("revoked"):
        raise HTTPException(409, "Purchase was revoked")
    previous_membership = None
    evidence = dict(verified.get("evidence", {}))
    if product["kind"] == "subscription":
        evidence["tier_credits"] = product["credits"]
        linked = evidence.get("linked_token_hash")
        if linked and not verified.get("upgrade_from"):
            prior_member = db.query(Membership).filter_by(provider=provider, original_id=linked).first()
            if prior_member:
                if prior_member.learner_id != learner_id:
                    raise HTTPException(409, "Linked purchase belongs to another account")
                if prior_member.paid_until > verified["paid_at"] and prior_member.tier != product["tier"]:
                    prior = db.query(Purchase).filter_by(provider=provider, original_id=linked).order_by(Purchase.paid_at.desc()).first()
                    if not prior:
                        raise HTTPException(409, "Upgrade requires the previous verified payment period")
                    period_start = datetime.fromisoformat(prior.evidence.get("billing_period", prior.paid_at.isoformat()))
                    period = max(1, (prior_member.paid_until - period_start).total_seconds())
                    remaining = min(1, max(0, (prior_member.paid_until - verified["paid_at"]).total_seconds() / period))
                    # Charge-prorated-price keeps the billing boundary. A new full
                    # paid period instead receives its normal grant.
                    if verified["paid_until"] <= prior_member.paid_until + timedelta(minutes=2):
                        old_credits = prior.evidence.get("tier_credits", PRODUCTS[prior.product_id]["credits"])
                        credits = max(0, math.floor((credits - old_credits) * remaining))
                        evidence.update(is_upgrade=True, billing_period=period_start.isoformat())
                    prior_member.paid_until = verified["paid_at"]
                    prior_member.state = "replaced"
        previous_membership = db.query(Membership).filter_by(provider=provider, original_id=verified["original_id"]).first()
        if previous_membership and previous_membership.learner_id != learner_id:
            raise HTTPException(409, "Subscription belongs to another account")
        if previous_membership and previous_membership.tier != product["tier"] and previous_membership.paid_until > verified["paid_at"] and not verified.get("upgrade_from"):
            prior = db.query(Purchase).filter_by(provider=provider, original_id=verified["original_id"]).order_by(Purchase.paid_at.desc()).first()
            if prior and prior.paid_at <= verified["paid_at"]:
                period_start = datetime.fromisoformat(prior.evidence.get("billing_period", prior.paid_at.isoformat()))
                period = max(1, (previous_membership.paid_until - period_start).total_seconds())
                fraction = min(1, max(0, (previous_membership.paid_until - verified["paid_at"]).total_seconds() / period))
                old_credits = prior.evidence.get("tier_credits", PRODUCTS[prior.product_id]["credits"])
                credits = max(0, math.floor((credits - old_credits) * fraction))
                evidence.update(is_upgrade=True, billing_period=period_start.isoformat())
        if verified.get("upgrade_from"):
            prior = db.query(Purchase).filter_by(provider=provider, transaction_id=verified["upgrade_from"]).first()
            if not prior or prior.learner_id != learner_id:
                raise HTTPException(409, "Upgrade requires the previous verified purchase")
            fraction = min(1, max(0, float(verified.get("remaining_fraction", 0))))
            credits = max(0, math.floor((credits - prior.credits) * fraction))
        paid_until = verified["paid_until"]
        if previous_membership is None:
            previous_membership = Membership(learner_id=learner_id, provider=provider,
                original_id=verified["original_id"], tier=product["tier"], paid_until=paid_until)
            db.add(previous_membership)
        # Delayed events cannot downgrade a newer period.
        latest = db.query(Purchase).filter_by(provider=provider, original_id=verified["original_id"]).order_by(Purchase.paid_at.desc()).first()
        if previous_membership.paid_until <= paid_until and (not latest or latest.paid_at <= verified["paid_at"]):
            previous_membership.tier = product["tier"]
            previous_membership.paid_until = paid_until
            previous_membership.state = verified.get("state", "active")
            previous_membership.updated_at = now()
        extend_titles(db, learner_id, paid_until, eligible_at=verified["paid_at"])
    row = Purchase(learner_id=learner_id, provider=provider, transaction_id=tx,
                   original_id=verified["original_id"], product_id=verified["product_id"],
                   credits=credits, paid_at=verified["paid_at"], evidence={"billing_period": verified["paid_at"].isoformat(), **evidence})
    db.add(row)
    journal(db, wallet, credits, f"store:{provider}:{tx}", "store_" + product["kind"], {"product_id": row.product_id})
    db.flush()
    return row


def refund_purchase(db, purchase):
    wallet = lock_wallet(db, purchase.learner_id)
    if purchase.state == "refunded":
        return
    journal(db, wallet, -purchase.credits, f"refund:{purchase.provider}:{purchase.transaction_id}",
            "refund", {"purchase_id": purchase.id}, allow_deficit=True)
    purchase.state = "refunded"
    latest = db.query(Purchase).filter_by(provider=purchase.provider, original_id=purchase.original_id).order_by(Purchase.paid_at.desc()).first()
    if latest and latest.id == purchase.id:
        member = db.query(Membership).filter_by(provider=purchase.provider, original_id=purchase.original_id).first()
        if member and member.state != "deleted":
            member.paid_until, member.state = now(), "revoked"
    reward = db.query(ReferralReward).filter_by(purchase_id=purchase.id).first()
    if reward:
        reward.state = "clawback" if reward.state == "paid" else "reversed"


def record_settlement(db, purchase, net_minor, currency, inr_paise, evidence):
    if "sandbox" in str(purchase.evidence.get("environment", "")).lower() and (net_minor or inr_paise):
        raise HTTPException(409, "Sandbox transactions cannot produce real revenue or referral rewards")
    if purchase.net_minor is not None:
        raise HTTPException(409, "Settlement already recorded; use an audited adjustment")
    if not evidence or min(net_minor, inr_paise) < 0:
        raise HTTPException(422, "Nonnegative settlement and evidence required")
    purchase.net_minor, purchase.currency, purchase.net_inr_paise = net_minor, currency, inr_paise
    purchase.evidence = {**purchase.evidence, "settlement": evidence}
    referral = db.get(Referral, purchase.learner_id)
    if not referral or PRODUCTS[purchase.product_id]["kind"] != "subscription" or purchase.state != "paid":
        return
    prior = db.query(Purchase).filter_by(learner_id=purchase.learner_id).filter(
        Purchase.product_id.in_([p for p, v in PRODUCTS.items() if v["kind"] == "subscription"])).order_by(Purchase.paid_at, Purchase.id).all()
    periods = list(dict.fromkeys(p.evidence.get("billing_period", p.paid_at.isoformat()) for p in prior))
    if purchase.evidence.get("billing_period", purchase.paid_at.isoformat()) not in periods[:3]:
        return
    db.add(ReferralReward(referrer_id=referral.referrer_id, purchase_id=purchase.id,
        amount_minor=net_minor // 5, inr_paise=inr_paise // 5, currency=currency,
        available_at=purchase.paid_at + timedelta(days=45)))
