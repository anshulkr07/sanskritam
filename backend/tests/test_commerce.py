"""Financial and title lifecycle invariants; never contacts a payment or AI vendor."""
import uuid
from datetime import timedelta

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db import Base
from app.commerce import service as svc
from app.commerce.catalogue import PREFIX
from app.commerce.models import (Wallet, Ledger, Membership, Title, Unlock, Cooldown,
    Reservation, Purchase, Setting, Referral, ReferralReward)


@pytest.fixture
def db(tmp_path):
    engine = create_engine("sqlite:///" + str(tmp_path / "commerce.db"))
    tables = [t for t in Base.metadata.sorted_tables if t.name.startswith("commerce_")]
    Base.metadata.create_all(engine, tables=tables)
    with sessionmaker(engine)() as session:
        yield session
    engine.dispose()


def grant(db, user="u", amount=10000):
    wallet = svc.lock_wallet(db, user)
    svc.journal(db, wallet, amount, "test:" + uuid.uuid4().hex, "promotion")
    db.commit()


def title(db, name, medium="book", credits=30):
    row = Title(id=name + ":" + medium, slug=name, medium=medium, name=name, credits=credits, published=True)
    db.add(row)
    db.commit()
    return row.id


def purchase(tx="t1", product="plus.monthly", until=None):
    return {"provider": "apple", "transaction_id": tx, "original_id": "original", "product_id": PREFIX + product,
            "paid_at": svc.now(), "paid_until": until or svc.now() + timedelta(days=30)}


def test_purchase_retry_does_not_double_grant(db):
    value = purchase()
    svc.apply_purchase(db, "u", value)
    db.commit()
    svc.apply_purchase(db, "u", value)
    db.commit()
    assert db.get(Wallet, "u").balance == 450
    assert db.query(Purchase).count() == 1
    assert db.query(Ledger).count() == 1


def test_purchase_cannot_be_restored_to_other_account(db):
    value = purchase()
    svc.apply_purchase(db, "u", value)
    db.commit()
    with pytest.raises(HTTPException) as exc:
        svc.apply_purchase(db, "someone-else", value)
    assert exc.value.status_code == 409


def test_refund_deficit_preserves_unrelated_title(db):
    p = svc.apply_purchase(db, "u", purchase(product="credits.small"))
    db.commit()
    tid = title(db, "gita", credits=80)
    svc.unlock_title(db, "u", tid, "request-01")
    db.commit()
    svc.refund_purchase(db, p)
    db.commit()
    svc.refund_purchase(db, p)
    db.commit()
    assert db.get(Wallet, "u").balance == -80
    assert svc.title_access(db, "u", tid)
    with pytest.raises(HTTPException):
        svc.unlock_title(db, "u", title(db, "other"), "request-02")


def test_five_separate_book_audio_slots_and_cooldown(db):
    grant(db)
    ids = [title(db, "gita", "book"), title(db, "gita", "audio")]
    ids += [title(db, str(i)) for i in range(4)]
    unlocked = [svc.unlock_title(db, "u", t, "req-" + str(i)) for i, t in enumerate(ids[:5])]
    db.commit()
    with pytest.raises(HTTPException) as exc:
        svc.unlock_title(db, "u", ids[5], "sixth-01")
    assert exc.value.status_code == 409
    db.rollback()
    svc.surrender(db, "u", unlocked[0].id)
    db.commit()
    with pytest.raises(HTTPException):
        svc.unlock_title(db, "u", ids[5], "sixth-02")
    db.rollback()
    cooldown = db.query(Cooldown).one()
    before = db.get(Wallet, "u").balance
    svc.skip_cooldown(db, "u", cooldown.id)
    db.commit()
    svc.skip_cooldown(db, "u", cooldown.id)
    db.commit()
    assert db.get(Wallet, "u").balance == before - 25
    svc.unlock_title(db, "u", ids[5], "sixth-03")
    db.commit()
    assert len(svc.active_unlocks(db, "u")) == 5


def test_surrender_repurchase_is_a_new_charge(db):
    grant(db)
    tid = title(db, "gita")
    member = Membership(learner_id="u", provider="apple", original_id="o", tier="lite", paid_until=svc.now() + timedelta(days=10))
    db.add(member)
    db.commit()
    first = svc.unlock_title(db, "u", tid, "request-1")
    db.commit()
    svc.surrender(db, "u", first.id)
    db.commit()
    second = svc.unlock_title(db, "u", tid, "request-2")
    db.commit()
    assert first.id != second.id
    assert db.get(Wallet, "u").balance == 9940


@pytest.mark.parametrize("tier,limit", [("lite", 10), ("plus", 20), ("pro", None)])
def test_membership_limits(db, tier, limit):
    grant(db)
    db.add(Membership(learner_id="u", provider="apple", original_id="o", tier=tier, paid_until=svc.now() + timedelta(days=30)))
    db.commit()
    assert svc.snapshot(db, "u")["slots"] == limit


def test_renewal_extends_and_expired_titles_do_not_reopen(db):
    grant(db)
    active = svc.unlock_title(db, "u", title(db, "active"), "request-1")
    expired = svc.unlock_title(db, "u", title(db, "expired"), "request-2")
    expired.expires_at = svc.now() - timedelta(days=1)
    db.commit()
    value = purchase(until=svc.now() + timedelta(days=30))
    svc.apply_purchase(db, "u", value)
    db.commit()
    assert abs((active.expires_at - (value["paid_until"] + timedelta(days=365))).total_seconds()) < 1
    assert not svc.title_access(db, "u", expired.title_id)
    member = db.query(Membership).one()
    member.paid_until = svc.now() - timedelta(seconds=1)
    db.commit()
    assert not svc.snapshot(db, "u")["offline"]
    assert svc.title_access(db, "u", active.title_id)


def costs(db):
    db.add(Setting(key="ai_costs", value={a: {"bound_inr": cost, "verified_at": "2026-10-16", "evidence": "test bound"}
        for a, cost in [("ask", .2), ("voice", 2), ("analysis", .8)]}))
    db.commit()


def test_reservations_block_double_spending_and_release_failures(db):
    grant(db, amount=2)
    costs(db)
    r = svc.reserve(db, "u", "ask", "req-first")
    db.commit()
    assert svc.reserve(db, "u", "ask", "req-first").id == r.id
    db.commit()
    with pytest.raises(HTTPException):
        svc.reserve(db, "u", "ask", "req-second")
    db.rollback()
    svc.settle(db, "u", r.id, delivered=False)
    db.commit()
    assert db.get(Wallet, "u").balance == 2
    assert db.get(Wallet, "u").reserved == 0


def test_voice_uses_complete_delivered_intervals_and_cap(db):
    grant(db, amount=100)
    costs(db)
    r = svc.reserve(db, "u", "voice", "voice-req", seconds=60)
    db.commit()
    svc.settle(db, "u", r.id, seconds=31)
    db.commit()
    assert db.get(Wallet, "u").balance == 90
    assert db.get(Wallet, "u").reserved == 0
    svc.settle(db, "u", r.id, seconds=600)
    db.commit()
    assert db.get(Wallet, "u").balance == 90


def test_cost_gate_and_bound_rounding(db):
    with pytest.raises(HTTPException):
        svc.action_quote(db, "ask")
    db.add(Setting(key="ai_costs", value={"ask": {"bound_inr": .51, "verified_at": "today", "evidence": "measured fixture"}}))
    db.commit()
    assert svc.action_quote(db, "ask")["credits"] == 6


def test_referral_only_first_three_subscriptions_and_refund(db):
    db.add(Referral(learner_id="u", referrer_id="friend"))
    db.commit()
    rows = []
    for i in range(4):
        p = svc.apply_purchase(db, "u", purchase(tx="t" + str(i)))
        db.commit()
        svc.record_settlement(db, p, 20000, "INR", 20000, "settlement report row")
        db.commit()
        rows.append(p)
    assert db.query(ReferralReward).count() == 3
    r = db.query(ReferralReward).filter_by(purchase_id=rows[0].id).one()
    assert r.amount_minor == 4000
    assert r.available_at == rows[0].paid_at + timedelta(days=45)
    svc.refund_purchase(db, rows[0])
    db.commit()
    assert r.state == "reversed"


def test_wallet_writer_lock_prevents_concurrent_overspending(db):
    from concurrent.futures import ThreadPoolExecutor
    factory = sessionmaker(db.get_bind())
    grant(db, amount=30)
    a, b = title(db, "a"), title(db, "b")
    def spend(t):
        with factory() as own:
            try:
                svc.unlock_title(own, "u", t, "request-" + t)
                own.commit()
                return True
            except HTTPException:
                own.rollback()
                return False
    with ThreadPoolExecutor(max_workers=2) as executor:
        results = list(executor.map(spend, [a, b]))
    assert sum(results) == 1
    db.expire_all()
    assert db.get(Wallet, "u").balance == 0
