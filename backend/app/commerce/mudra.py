"""Spending Mudrā (owner decision 2026-11-06).

Mudrā reach the wallet through verified store purchases (service.apply_purchase:
packs, and Lite/Plus every plan month, plans.grant_due). They are spent here on things that are
then the learner's for good:

- "title:<slug>:<book|audio>"  one edition, at its catalogue price (Title.credits);
- "both:<slug>"                 the book and its audiobook together, 10% off when
                                neither is owned yet;
- "guru:<5|15|30>"              Guru voice minutes, which never expire.

A closed loop: Mudrā have no cash value, cannot be cashed out or transferred,
and are bought only through Google Play or the App Store (RBI treats this as a
closed-system prepaid instrument, which needs no RBI authorisation). A refunded
pack takes its Mudrā back even if they were spent, so the balance can go below
zero; what was bought stays owned.
"""
import math

from fastapi import HTTPException

from app.commerce import hybrid, plans, service as svc
from app.commerce.models import Ledger, OwnedEdition, Title

GURU_MINUTES = {5: 50, 15: 140, 30: 270}
BOTH_DISCOUNT = 0.9


def member_price(list_price, discount):
    """A plan's price for a book, audiobook or avatar: the list price less the
    plan's percent (plans.PLANS "discount"), rounded down."""
    return list_price * (100 - discount) // 100


def guru_offers(db):
    return [{"minutes": m, "price": p} for m, p in GURU_MINUTES.items()] if hybrid.voice_ready(db) else []


def quote(db, learner_id, item):
    """{"item", "price", "titles", "minutes"}; 404/409/503 when it cannot be bought."""
    kind, _, rest = item.partition(":")
    if kind == "guru":
        minutes = int(rest) if rest.isdigit() else 0
        if minutes not in GURU_MINUTES:
            raise HTTPException(404, "Unknown Guru minutes")
        if not hybrid.voice_ready(db):
            raise HTTPException(503, "Guru voice is being prepared")
        return {"item": item, "price": GURU_MINUTES[minutes], "titles": [], "minutes": minutes}
    if kind == "title":
        title_ids = [rest]
    elif kind == "both":
        title_ids = [rest + ":book", rest + ":audio"]
    else:
        raise HTTPException(404, "Unknown item")
    prices = {t: hybrid.price(db, t) for t in title_ids}
    if any(p is None for p in prices.values()):
        raise HTTPException(404, "This edition is not for sale")
    missing = [t for t in title_ids if not hybrid.owns(db, learner_id, t)]
    if not missing:
        raise HTTPException(409, {"code": "already_owned", "message": "This is already yours"})
    discount = plans.rules_for(db, learner_id)["discount"]
    listed = sum(prices[t] for t in missing)
    total = sum(member_price(prices[t], discount) for t in missing)
    if kind == "both" and len(missing) == 2:
        listed, total = math.floor(listed * BOTH_DISCOUNT), math.floor(total * BOTH_DISCOUNT)
    return {"item": item, "price": total, "list_price": listed, "discount": discount, "titles": missing, "minutes": 0}


def spend(db, learner_id, item, request_id, expected):
    """Idempotent per request_id: a retry after a lost reply returns the same result."""
    wallet = svc.lock_wallet(db, learner_id)
    svc.expire_reservations(db, wallet)
    plans.grant_due(db, learner_id)
    key = f"mudra:{learner_id}:{request_id}"
    previous = db.query(Ledger).filter_by(key=key).first()
    if previous:
        if previous.learner_id != learner_id or previous.details.get("item") != item:
            raise HTTPException(409, "This request was already used for something else")
        return result(db, learner_id, wallet, item, -previous.amount)
    q = quote(db, learner_id, item)
    if expected != q["price"]:
        raise HTTPException(409, {"code": "price_changed", "price": q["price"]})
    row = svc.journal(db, wallet, -q["price"], key, "mudra_spend",
                      {"item": item, "titles": q["titles"], "minutes": q["minutes"]})
    for title_id in q["titles"]:
        # Not tied to a store purchase: a later pack refund never takes it back.
        db.add(OwnedEdition(learner_id=learner_id, title_id=title_id, purchase_id="mudra:" + row.id))
    if q["minutes"]:
        hybrid.balance(db, learner_id).paid_ms += q["minutes"] * 60_000
    db.flush()
    return result(db, learner_id, wallet, item, q["price"])


def result(db, learner_id, wallet, item, price):
    return {"item": item, "price": price, "balance": wallet.balance,
            "available": max(0, wallet.balance - wallet.reserved),
            "owned_titles": sorted({r.title_id for r in db.query(OwnedEdition).filter_by(learner_id=learner_id, revoked=False)})}


def _label(row, names):
    item = (row.details or {}).get("item", "")
    kind, _, rest = item.partition(":")
    if row.kind == "mudra_spend" and kind == "title":
        slug, _, medium = rest.rpartition(":")
        return f"{names.get(rest, slug)} · {'audiobook' if medium == 'audio' else 'book'}"
    if row.kind == "mudra_spend" and kind == "both":
        return f"{names.get(rest + ':book', rest)} · book and audiobook"
    if row.kind == "mudra_spend" and kind == "guru":
        return f"Guru · {rest} minutes"
    if row.kind in {"store_subscription", "plan_month"}:
        product = hybrid.PRODUCTS.get((row.details or {}).get("product_id", ""), {})
        tier = product.get("tier") or ("plan" if row.kind == "plan_month" else "")
        return f"{tier.capitalize() or 'Plan'} · plan month"
    return {"store_refill": "Mudrā pack", "refund": "Refund"}.get(row.kind, row.kind.replace("_", " ").capitalize())


def history(db, learner_id, limit=20):
    """The latest Mudrā movements, newest first, for the shop's ledger."""
    names = {t.id: t.name for t in db.query(Title)}
    rows = (db.query(Ledger).filter(Ledger.learner_id == learner_id, Ledger.amount != 0)
            .order_by(Ledger.created_at.desc(), Ledger.id.desc()).limit(limit))
    return [{"label": _label(r, names), "amount": r.amount, "at": r.created_at} for r in rows]


def history_csv(db, learner):
    """Every Mudrā movement, oldest first, with the balance after each, as CSV
    for a spreadsheet. Times are in the learner's own timezone."""
    import csv
    import io
    from datetime import timezone
    from app.services.localtime import resolve_tz
    tz = resolve_tz(getattr(learner, "timezone", None))
    names = {t.id: t.name for t in db.query(Title)}
    rows = (db.query(Ledger).filter(Ledger.learner_id == learner.id, Ledger.amount != 0)
            .order_by(Ledger.created_at.asc(), Ledger.id.asc()).limit(20_000))
    out = io.StringIO()
    writer = csv.writer(out, lineterminator="\r\n")
    writer.writerow(["Date", "Description", "Mudrā", "Balance"])
    balance = 0
    for row in rows:
        balance += row.amount
        when = row.created_at.replace(tzinfo=timezone.utc).astimezone(tz).strftime("%Y-%m-%d %H:%M")
        writer.writerow([when, _label(row, names), f"{row.amount:+d}", balance])
    # A byte-order mark so spreadsheet apps read "Mudrā" as UTF-8.
    return "\ufeff" + out.getvalue()


def wallet_view(db, learner_id):
    """The balance and prices the app shows. Call under the wallet lock."""
    wallet = svc.lock_wallet(db, learner_id)
    svc.expire_reservations(db, wallet)
    plans.grant_due(db, learner_id)
    prices = {t.id: hybrid.price(db, t.id) for t in db.query(Title).filter_by(published=True)}
    discount = plans.rules_for(db, learner_id)["discount"]
    return {"mudra": {"balance": wallet.balance, "available": max(0, wallet.balance - wallet.reserved),
                      "deficit": max(0, -wallet.balance)},
            "prices": {k: v for k, v in prices.items() if v},
            # What this learner pays: the list price less the plan's discount.
            "member_prices": {k: member_price(v, discount) for k, v in prices.items() if v},
            "discount": discount,
            "guru_minutes": guru_offers(db),
            "both_discount": BOTH_DISCOUNT}
