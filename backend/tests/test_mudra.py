"""Mudrā (owner decision 2026-11-06): packs and plans fill the wallet, and
books, audiobooks and Guru minutes are bought with Mudrā and kept."""
from datetime import timedelta

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db import Base
from app.models import Learner
from app.config import settings
from app.commerce import hybrid, mudra, service as svc, stores
from app.commerce.models import OwnedEdition, Setting, Title


@pytest.fixture
def db(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "commerce_enabled", True)
    monkeypatch.setattr(settings, "commerce_hybrid_enabled", True)
    monkeypatch.setattr(settings, "commerce_voice_enabled", True)
    engine = create_engine("sqlite:///" + str(tmp_path / "mudra.db"))
    Base.metadata.create_all(engine)
    with sessionmaker(engine)() as db:
        db.add(Learner(id="u", display_name="Learner", google_sub="verified-u"))
        db.add(Setting(key="ai_costs", value={"voice": {"bound_inr": 2, "pipeline_id": hybrid.VOICE_PIPELINE_ID, "verified_at": "test", "evidence": "Measured staging voice pipeline for test"}}))
        for medium, price in (("book", 199), ("audio", 249)):
            db.add(Title(id="gita:" + medium, slug="gita", medium=medium, name="Gita", credits=price,
                         published=True, metadata_json={"premium": True}))
        db.commit()
        yield db
    engine.dispose()


def pack(db, amount, tx):
    row = svc.apply_purchase(db, "u", {"provider": "google", "transaction_id": tx, "original_id": tx,
        "product_id": hybrid.PREFIX + f"mudra.{amount}", "paid_at": svc.now(), "paid_until": None, "evidence": {}})
    db.commit()
    return row


def balance(db):
    return svc.lock_wallet(db, "u").balance


def test_packs_fill_the_wallet_and_a_book_is_bought_and_kept(db):
    pack(db, 330, "p1")
    assert balance(db) == 330
    result = mudra.spend(db, "u", "title:gita:book", "req-book-1", 199); db.commit()
    assert result["price"] == 199 and result["available"] == 131
    assert hybrid.owns(db, "u", "gita:book") and hybrid.can_download(db, "u", "gita:book")
    assert not hybrid.can_access(db, "u", "gita:audio")
    # A retry after a lost reply returns the same result and charges once.
    assert mudra.spend(db, "u", "title:gita:book", "req-book-1", 199)["price"] == 199
    assert balance(db) == 131
    with pytest.raises(HTTPException) as reuse:
        mudra.spend(db, "u", "title:gita:audio", "req-book-1", 249)
    assert reuse.value.status_code == 409
    with pytest.raises(HTTPException) as again:
        mudra.spend(db, "u", "title:gita:book", "req-book-2", 199)
    assert again.value.status_code == 409 and again.value.detail["code"] == "already_owned"


def test_not_enough_mudra_or_a_changed_price_charges_nothing(db):
    pack(db, 100, "p1")
    with pytest.raises(HTTPException) as short:
        mudra.spend(db, "u", "title:gita:book", "req-short", 199)
    assert short.value.status_code == 402 and short.value.detail["required"] == 199
    with pytest.raises(HTTPException) as moved:
        mudra.spend(db, "u", "title:gita:book", "req-moved", 150)
    assert moved.value.status_code == 409 and moved.value.detail == {"code": "price_changed", "price": 199}
    assert balance(db) == 100 and not hybrid.owns(db, "u", "gita:book")


def test_book_and_audio_together_cost_less_until_one_is_owned(db):
    pack(db, 1200, "p1")
    assert mudra.quote(db, "u", "both:gita")["price"] == int((199 + 249) * 0.9)
    mudra.spend(db, "u", "title:gita:book", "req-book", 199); db.commit()
    assert mudra.quote(db, "u", "both:gita") == {"item": "both:gita", "price": 249, "list_price": 249, "discount": 0,
                                                 "titles": ["gita:audio"], "minutes": 0}
    mudra.spend(db, "u", "both:gita", "req-both", 249); db.commit()
    assert hybrid.owns(db, "u", "gita:audio")
    assert balance(db) == 1200 - 199 - 249


def test_free_and_unpriced_books_are_not_sold(db):
    pack(db, 100, "p1")
    db.get(Title, "gita:book").metadata_json = {}
    db.get(Title, "gita:audio").credits = 0
    db.commit()
    for item in ("title:gita:book", "title:gita:audio", "title:unknown:book", "both:gita"):
        with pytest.raises(HTTPException) as refused:
            mudra.quote(db, "u", item)
        assert refused.value.status_code == 404


def test_guru_minutes_are_bought_with_mudra_and_never_expire(db):
    pack(db, 330, "p1")
    mudra.spend(db, "u", "guru:15", "req-guru", 140); db.commit()
    assert hybrid.snapshot(db, "u")["paid_seconds"] == 15 * 60
    assert balance(db) == 190
    settings_off = settings.commerce_voice_enabled
    try:
        settings.commerce_voice_enabled = False
        with pytest.raises(HTTPException) as off:
            mudra.quote(db, "u", "guru:5")
        assert off.value.status_code == 503
        assert mudra.guru_offers(db) == []
    finally:
        settings.commerce_voice_enabled = settings_off


def test_a_refunded_pack_takes_its_mudra_back_but_what_was_bought_stays(db):
    purchase = pack(db, 330, "p1")
    mudra.spend(db, "u", "title:gita:book", "req-book", 199); db.commit()
    svc.refund_purchase(db, purchase); db.commit()
    assert balance(db) == 131 - 330
    assert hybrid.owns(db, "u", "gita:book")
    view = mudra.wallet_view(db, "u")
    assert view["mudra"] == {"balance": -199, "available": 0, "deficit": 199}
    with pytest.raises(HTTPException) as blocked:
        mudra.spend(db, "u", "title:gita:audio", "req-audio", 249)
    assert blocked.value.status_code == 402
    pack(db, 330, "p2")
    assert balance(db) == 131


def test_mudra_packs_are_consumed_and_plans_acknowledged(monkeypatch):
    import asyncio
    calls = []
    async def request(path, method="GET", body=None): calls.append(path)
    monkeypatch.setattr(stores, "google_request", request)
    asyncio.run(stores.finish_google(hybrid.PREFIX + "mudra.100", "proof"))
    asyncio.run(stores.finish_google(hybrid.PREFIX + "plus.v2.monthly", "proof"))
    assert calls[0].endswith(":consume") and calls[1].endswith(":acknowledge")


def test_mudra_pack_purchase_through_the_api(client, monkeypatch):
    from app.db import SessionLocal
    monkeypatch.setattr(settings, "commerce_enabled", True)
    monkeypatch.setattr(settings, "commerce_hybrid_enabled", True)
    monkeypatch.setattr(settings, "commerce_sales_enabled", True)
    monkeypatch.setattr(settings, "commerce_signing_key", "test-key-with-more-than-thirty-two-characters")
    login = client.post("/auth/dev-login", json={"display_name": "mudra-api", "bridge_langs": ["en"]}).json()
    user, headers = login["learner"]["id"], {"Authorization": "Bearer " + login["token"]}
    with SessionLocal() as session:
        session.get(Learner, user).google_sub = "mudra-verified-" + user
        session.merge(Title(id="mudra-test:book", slug="mudra-test", medium="book", name="Test book", credits=99,
                            published=True, metadata_json={"premium": True}))
        session.commit()
    async def verify(product, proof, learner):
        return {"provider": "google", "transaction_id": "mudra-api-" + user, "original_id": "mudra-api-" + user,
                "product_id": product, "paid_at": svc.now(), "paid_until": None, "evidence": {}}
    async def finish(*args): pass
    monkeypatch.setattr(stores, "verify_google", verify)
    monkeypatch.setattr(stores, "finish_google", finish)
    try:
        body = {"provider": "google", "product_id": hybrid.PREFIX + "mudra.100", "proof": "verified-by-fixture"}
        for _ in range(2):
            response = client.post("/commerce/purchases/verify", headers=headers, json=body)
            assert response.status_code == 200, response.text
            assert response.json()["consumable"] is True
        shop = client.get("/commerce/shop", headers=headers).json()
        assert shop["mudra"]["available"] == 100 and shop["prices"]["mudra-test:book"] == 99
        assert {p["id"] for p in shop["products"]} >= {hybrid.PREFIX + "mudra.100", hybrid.PREFIX + "plus.v2.monthly"}
        assert not any(p["kind"] in {"edition", "voice_pack"} for p in shop["products"])
        spent = client.post("/commerce/mudra/spend", headers=headers, json={"item": "title:mudra-test:book", "request_id": "api-spend-1", "expected": 99})
        assert spent.status_code == 200, spent.text
        assert spent.json()["available"] == 1 and "mudra-test:book" in spent.json()["owned_titles"]
        assert client.post("/commerce/mudra/spend", headers=headers, json={"item": "title:x:pdf", "request_id": "api-spend-2", "expected": 1}).status_code == 422
    finally:
        with SessionLocal() as session:
            session.query(OwnedEdition).filter_by(title_id="mudra-test:book").delete()
            row = session.get(Title, "mudra-test:book")
            if row:
                session.delete(row)
            session.commit()
