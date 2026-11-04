"""Hybrid purchase, refund and metering invariants; no live vendor calls."""
import importlib
import asyncio
from datetime import timedelta

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import sessionmaker
from alembic.migration import MigrationContext
from alembic.operations import Operations

from app.db import Base
from app.models import Learner
from app.config import settings
from app.commerce import hybrid, service as svc, stores
from app.commerce.models import Title, Setting, Purchase, Membership, VoiceCall


@pytest.fixture
def db(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "commerce_enabled", True)
    monkeypatch.setattr(settings, "commerce_hybrid_enabled", True)
    monkeypatch.setattr(settings, "commerce_voice_enabled", True)
    engine = create_engine("sqlite:///" + str(tmp_path / "hybrid.db"))
    Base.metadata.create_all(engine)
    with sessionmaker(engine)() as db:
        db.add(Learner(id="u", display_name="Learner", google_sub="verified-u"))
        db.add(Setting(key="ai_costs", value={"voice": {"bound_inr": 2, "pipeline_id": hybrid.VOICE_PIPELINE_ID, "verified_at": "test", "evidence": "Measured staging voice pipeline for test"}}))
        for medium in ("book", "audio"):
            db.add(Title(id="gita:" + medium, slug="gita", medium=medium, name="Gita", credits=0,
                         published=True, metadata_json={"premium": True}))
        db.commit()
        yield db
    engine.dispose()


def buy(db, product, tx="one", user="u"):
    row = svc.apply_purchase(db, user, {"provider": "apple", "transaction_id": tx, "original_id": tx,
        "product_id": hybrid.PREFIX + product, "paid_at": svc.now(), "paid_until": svc.now() + timedelta(days=30), "evidence": {}})
    db.commit()
    return row


def test_bundle_is_permanent_idempotent_and_independent_of_membership(db):
    buy(db, "edition.gita.bundle")
    buy(db, "edition.gita.bundle")
    assert db.query(Purchase).count() == 1
    assert hybrid.owns(db, "u", "gita:book") and hybrid.owns(db, "u", "gita:audio")
    assert not svc.membership(db, "u")
    assert hybrid.can_access(db, "u", "gita:audio")
    with pytest.raises(HTTPException):
        buy(db, "edition.gita.bundle", user="another")


def test_refund_only_revokes_its_edition_not_other_purchases(db):
    book = buy(db, "edition.gita.book", "book")
    buy(db, "edition.gita.audio", "audio")
    svc.refund_purchase(db, book); db.commit()
    assert not hybrid.can_access(db, "u", "gita:book")
    assert hybrid.can_access(db, "u", "gita:audio")


def test_plus_access_ends_without_changing_owned_audio(db):
    buy(db, "edition.gita.audio", "audio")
    buy(db, "plus.v2.monthly", "membership")
    assert hybrid.can_access(db, "u", "gita:book")
    db.query(Membership).update({"paid_until": svc.now() - timedelta(seconds=1)})
    db.commit()
    assert not hybrid.can_access(db, "u", "gita:book")
    assert hybrid.can_access(db, "u", "gita:audio")


def test_existing_library_is_free_until_explicitly_marked_premium(db):
    assert hybrid.can_access(db, "u", "unknown:book")
    db.get(Title, "gita:book").metadata_json = {}
    assert hybrid.can_access(db, "u", "gita:book")


@pytest.mark.parametrize("period", ["monthly", "annual"])
def test_lite_access_is_explicit_per_medium_and_does_not_include_downloads(db, period):
    from app.commerce.access import has_title
    db.get(Title, "gita:book").metadata_json = {"premium": True, "lite_included": True}
    purchase = buy(db, "lite.v2." + period)
    assert purchase.credits == 0
    assert svc.membership(db, "u").tier == "lite"
    assert has_title(db, "u", "gita:book")
    assert not has_title(db, "u", "gita:audio")
    assert not hybrid.can_download(db, "u", "gita:book")
    assert hybrid.can_download(db, "u", "free:book")
    state = hybrid.entitlements(db, "u")
    assert state["ad_free"] and state["background_audio"]
    assert state["included_titles"] == ["gita:book"]
    assert state["downloadable_titles"] == []
    assert svc.snapshot(db, "u")["offline"] is False
    db.get(Title, "gita:audio").metadata_json = {"premium": True, "lite_included": True}
    db.commit()
    assert has_title(db, "u", "gita:audio")
    assert not hybrid.can_download(db, "u", "gita:audio")
    assert hybrid.snapshot(db, "u")["paid_seconds"] == 0
    svc.refund_purchase(db, purchase); db.commit()
    assert not has_title(db, "u", "gita:book")
    assert hybrid.entitlements(db, "u")["member_tier"] == "free"


def test_lite_offers_require_a_published_explicit_starter_collection(db):
    def lite_offers(): return [p for p in hybrid.offers(db) if p.get("tier") == "lite"]
    assert not lite_offers()
    title = db.get(Title, "gita:book")
    title.metadata_json = {"premium": True, "lite_included": "true"}
    assert not lite_offers()
    title.metadata_json = {"premium": True, "lite_included": True}
    assert len(lite_offers()) == 2
    title.published = False
    assert not lite_offers()
    # Already-paid receipts restore even after the starter collection is delisted.
    buy(db, "lite.v2.monthly"); buy(db, "lite.v2.monthly")
    assert db.query(Purchase).count() == 1


def test_plus_expiry_falls_back_to_lite_without_revoking_purchased_editions(db):
    db.get(Title, "gita:book").metadata_json = {"premium": True, "lite_included": True}
    buy(db, "lite.v2.annual", "lite")
    buy(db, "plus.v2.monthly", "plus")
    assert svc.membership(db, "u").tier == "plus"
    assert hybrid.can_download(db, "u", "gita:book")
    assert hybrid.can_access(db, "u", "gita:audio")
    db.query(Membership).filter_by(tier="plus").update({"paid_until": svc.now() - timedelta(seconds=1)})
    db.commit()
    assert svc.membership(db, "u").tier == "lite"
    assert hybrid.can_access(db, "u", "gita:book")
    assert not hybrid.can_download(db, "u", "gita:book")
    assert not hybrid.can_access(db, "u", "gita:audio")
    buy(db, "edition.gita.bundle", "owned")
    db.query(Membership).update({"paid_until": svc.now() - timedelta(seconds=1)})
    db.commit()
    for medium in ("book", "audio"):
        assert hybrid.can_access(db, "u", "gita:" + medium)
        assert hybrid.can_download(db, "u", "gita:" + medium)


def test_verified_plan_change_and_delayed_receipt_do_not_restore_old_tier(db):
    start = svc.now() - timedelta(days=31)
    def receipt(tx, tier, paid_at, until):
        return {"provider": "apple", "transaction_id": tx, "original_id": "plan-chain",
                "product_id": hybrid.PREFIX + tier + ".v2.monthly", "paid_at": paid_at,
                "paid_until": until, "state": "active", "evidence": {}}
    plus = receipt("plus", "plus", start, start + timedelta(days=30))
    svc.apply_purchase(db, "u", plus); db.commit()
    lite = receipt("lite", "lite", start + timedelta(days=30), start + timedelta(days=60))
    svc.apply_purchase(db, "u", lite); db.commit()
    svc.apply_purchase(db, "u", plus); db.commit()
    assert svc.membership(db, "u").tier == "lite"
    assert not hybrid.can_access(db, "u", "gita:audio")
    upgrade = receipt("upgrade", "plus", svc.now(), start + timedelta(days=60))
    svc.apply_purchase(db, "u", upgrade); db.commit()
    assert hybrid.can_download(db, "u", "gita:audio")


def test_lite_shop_and_offline_api_enforce_download_rights(db, monkeypatch):
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from app.auth import require_learner
    from app.db import get_db
    from app.commerce.router import router
    monkeypatch.setattr(settings, "commerce_signing_key", "test-key-with-more-than-thirty-two-characters")
    db.get(Title, "gita:book").metadata_json = {"premium": True, "lite_included": True}
    buy(db, "lite.v2.monthly")
    app = FastAPI(); app.include_router(router)
    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[require_learner] = lambda: db.get(Learner, "u")
    with TestClient(app) as client:
        state = client.get("/commerce/shop").json()
        assert state["member_tier"] == "lite" and state["ad_free"]
        assert state["regional_lite"]["INR"] == [99, 799]
        assert state["regional_lite"]["USD"] == [3.99, 29.99]
        assert state["included_titles"] == ["gita:book"]
        response = client.get("/commerce/titles/gita:book/licence")
        assert response.status_code == 403 and "Plus" in response.json()["detail"]
        assert client.get("/commerce/titles/gita:audio/licence").status_code == 403
        buy(db, "plus.v2.monthly", "plus")
        grant = client.get("/commerce/titles/gita:audio/licence").json()
        assert grant["premium"] and not grant["owned"]
        assert stores.iso(grant["expires_at"]) <= svc.now() + timedelta(days=7)
        buy(db, "edition.gita.book", "owned")
        db.query(Membership).update({"paid_until": svc.now() - timedelta(seconds=1)})
        db.commit()
        assert client.get("/commerce/titles/gita:book/licence").json()["owned"]
        assert client.get("/commerce/titles/gita:audio/licence").status_code == 403


def test_unpublished_editions_are_not_sold(db):
    db.get(Title, "gita:audio").published = False
    assert not any(p["id"].endswith("edition.gita.bundle") for p in hybrid.offers(db))
    buy(db, "edition.gita.bundle")
    assert hybrid.owns(db, "u", "gita:audio")  # honour a receipt paid before delisting


def test_voice_pack_restore_does_not_double_grant_or_require_membership(db):
    buy(db, "guru.minutes.5")
    buy(db, "guru.minutes.5")
    assert hybrid.snapshot(db, "u")["paid_seconds"] == 300
    assert svc.membership(db, "u") is None


def test_trial_reservation_prevents_concurrent_calls_and_failed_start_is_free(db):
    call = hybrid.reserve_call(db, "u"); db.commit()
    assert call.trial_ms == 180000 and call.paid_ms == 0
    with pytest.raises(HTTPException) as exc:
        hybrid.reserve_call(db, "u")
    assert exc.value.status_code == 409
    hybrid.settle_call(db, call, 0); db.commit()
    assert hybrid.snapshot(db, "u")["trial_seconds"] == 180


def test_trial_consumed_first_and_unused_paid_minutes_return(db):
    buy(db, "guru.minutes.5")
    call = hybrid.reserve_call(db, "u"); db.commit()
    hybrid.settle_call(db, call, 200000); db.commit()
    assert hybrid.snapshot(db, "u")["trial_seconds"] == 0
    assert hybrid.snapshot(db, "u")["paid_seconds"] == 280
    hybrid.settle_call(db, call, 0); db.commit()
    assert hybrid.snapshot(db, "u")["paid_seconds"] == 280


def test_stale_undelivered_call_releases_trial(db):
    call = hybrid.reserve_call(db, "u")
    call.expires_at = svc.now() - timedelta(seconds=1); db.commit()
    assert hybrid.snapshot(db, "u")["trial_seconds"] == 180
    assert call.state == "settled"


def test_stale_delivered_call_charges_bounded_elapsed_time(db):
    call = hybrid.reserve_call(db, "u")
    call.delivered_at = svc.now() - timedelta(seconds=40)
    call.expires_at = svc.now() - timedelta(seconds=10); db.commit()
    state = hybrid.snapshot(db, "u")
    assert 149 <= state["trial_seconds"] <= 150


def test_voice_refund_keeps_trial_and_reverses_pack_once(db):
    purchase = buy(db, "guru.minutes.5")
    call = hybrid.reserve_call(db, "u"); db.commit()
    hybrid.settle_call(db, call, 200000); db.commit()
    svc.refund_purchase(db, purchase); db.commit()
    svc.refund_purchase(db, purchase); db.commit()
    state = hybrid.snapshot(db, "u")
    assert state["paid_seconds"] == 0 and state["trial_seconds"] == 0
    assert state["deficit_seconds"] == 20


def test_voice_requires_verified_account_and_cost_evidence(db):
    db.get(Learner, "u").google_sub = None; db.commit()
    with pytest.raises(HTTPException) as exc:
        hybrid.reserve_call(db, "u")
    assert exc.value.status_code == 409
    db.get(Learner, "u").google_sub = "verified"
    db.get(Setting, "ai_costs").value = {}; db.commit()
    assert not hybrid.voice_ready(db)
    assert not any(p["kind"] == "voice_pack" for p in hybrid.offers(db))
    db.get(Setting, "ai_costs").value = {"voice": {"bound_inr": 2.1, "pipeline_id": hybrid.VOICE_PIPELINE_ID,
        "verified_at": "test", "evidence": "Measured cost above the current pack budget"}}
    db.commit()
    assert not hybrid.voice_ready(db)


@pytest.mark.parametrize("startup_fails", [False, True])
def test_voice_socket_enforces_trial_and_releases_unused_time(db, monkeypatch, startup_fails):
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    import app.voice_lab.router as voice
    monkeypatch.setattr(voice, "SessionLocal", sessionmaker(bind=db.get_bind()))
    monkeypatch.setattr(voice, "authenticate", lambda token: "u")
    class Pipeline:
        def __init__(self, config, send, meter): self.config, self.send = config, send
        async def start(self):
            if startup_fails: raise RuntimeError("Synthetic startup failure")
            await self.send({"type": "audio", "data": "AAAA", "codec": "pcm", "sample_rate": 24000})
        async def close(self): pass
    monkeypatch.setitem(voice.STRATEGIES, 1, Pipeline)
    app = FastAPI(); app.include_router(voice.router)
    with TestClient(app) as client:
        with client.websocket_connect("/ws/voice-lab") as socket:
            socket.send_json({"ticket": "test", "config": {"pipeline": 3, "web_search": True}})
            if startup_fails:
                assert socket.receive_json()["type"] == "fatal"
            else:
                assert socket.receive_json()["type"] == "audio"
                assert socket.receive_json()["type"] == "billing_started"
                ready = socket.receive_json()
                assert ready["max_seconds"] == 180
                assert ready["config"]["pipeline"] == 1 and ready["config"]["web_search"] is False
                socket.send_json({"type": "stop"})
    db.expire_all()
    state = hybrid.snapshot(db, "u")
    assert state["call_active"] is False
    assert state["trial_seconds"] == 180 if startup_fails else state["trial_seconds"] >= 175


def test_google_editions_acknowledged_not_consumed(monkeypatch):
    calls = []
    async def request(path, method, body): calls.append(path)
    monkeypatch.setattr(stores, "google_request", request)
    asyncio.run(stores.finish_google(hybrid.PREFIX + "edition.gita.book", "proof"))
    asyncio.run(stores.finish_google(hybrid.PREFIX + "guru.minutes.5", "proof"))
    assert calls[0].endswith(":acknowledge") and calls[1].endswith(":consume")


def test_hybrid_migration_round_trip(tmp_path, monkeypatch):
    migration = importlib.import_module("migrations.versions.20261104_hybrid_commerce")
    engine = create_engine("sqlite:///" + str(tmp_path / "migration.db"))
    with engine.begin() as connection:
        monkeypatch.setattr(migration, "op", Operations(MigrationContext.configure(connection)))
        migration.upgrade()
        assert len(inspect(connection).get_table_names()) == 3
        migration.downgrade()
        assert not inspect(connection).get_table_names()
    engine.dispose()


def test_shop_and_purchase_api_without_membership(client, monkeypatch):
    from app.db import SessionLocal
    from app.commerce.router import decode
    monkeypatch.setattr(settings, "commerce_enabled", True)
    monkeypatch.setattr(settings, "commerce_hybrid_enabled", True)
    monkeypatch.setattr(settings, "commerce_sales_enabled", True)
    monkeypatch.setattr(settings, "commerce_signing_key", "test-key-with-more-than-thirty-two-characters")
    login = client.post("/auth/dev-login", json={"display_name": "hybrid-api", "bridge_langs": ["en"]}).json()
    user = login["learner"]["id"]
    headers = {"Authorization": "Bearer " + login["token"]}
    with SessionLocal() as db:
        db.get(Learner, user).google_sub = "hybrid-verified"
        for medium in ("book", "audio"):
            db.merge(Title(id="gita:" + medium, slug="gita", medium=medium, name="Gita", credits=0,
                           published=True, metadata_json={"premium": True}))
        db.commit()
    async def verify(product, proof, learner):
        return {"provider": "google", "transaction_id": "hybrid-api-book", "original_id": "hybrid-api-book",
            "product_id": product, "paid_at": svc.now(), "paid_until": None, "evidence": {}}
    async def finish(*args): pass
    monkeypatch.setattr(stores, "verify_google", verify)
    monkeypatch.setattr(stores, "finish_google", finish)
    shop = client.get("/commerce/shop", headers=headers)
    assert shop.status_code == 200
    assert shop.json()["member_until"] is None
    assert shop.json()["trial_seconds"] == 180
    body = {"provider": "google", "product_id": hybrid.PREFIX + "edition.gita.book", "proof": "verified-by-fixture"}
    for _ in range(2):
        response = client.post("/commerce/purchases/verify", headers=headers, json=body)
        assert response.status_code == 200, response.text
        assert response.json()["consumable"] is False
    monkeypatch.setattr(settings, "commerce_sales_enabled", False)
    assert client.post("/commerce/purchases/verify", headers=headers, json=body).status_code == 200
    state = client.get("/commerce/shop", headers=headers).json()
    assert state["owned_titles"] == ["gita:book"]
    licence = client.get("/commerce/titles/gita:book/licence", headers=headers)
    assert licence.status_code == 200, licence.text
    assert licence.json()["owned"] is True
    assert decode(licence.json()["licence"], "offline")["sub"] == user
    assert client.get("/commerce/titles/gita:audio/licence", headers=headers).status_code == 403
    with SessionLocal() as db:
        for medium in ("book", "audio"):
            db.get(Title, "gita:" + medium).metadata_json = {}
        db.commit()
