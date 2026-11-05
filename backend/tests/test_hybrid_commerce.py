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


def test_plans_grant_mudra_and_no_ads_but_do_not_open_books(db):
    # Mudrā (2026-11-06): a plan puts Mudrā in the wallet every plan month and
    # removes ads; books and audiobooks are bought with Mudrā and kept.
    buy(db, "edition.gita.audio", "audio")
    purchase = buy(db, "plus.v2.monthly", "membership")
    assert purchase.credits == 500
    assert svc.lock_wallet(db, "u").balance == 500
    assert not hybrid.can_access(db, "u", "gita:book")
    assert hybrid.entitlements(db, "u")["ad_free"]
    db.query(Membership).update({"paid_until": svc.now() - timedelta(seconds=1)})
    db.commit()
    assert not hybrid.entitlements(db, "u")["ad_free"]
    assert hybrid.can_access(db, "u", "gita:audio")
    assert svc.lock_wallet(db, "u").balance == 500  # Mudrā outlive the plan


def test_existing_library_is_free_until_explicitly_marked_premium(db):
    assert hybrid.can_access(db, "u", "unknown:book")
    db.get(Title, "gita:book").metadata_json = {}
    assert hybrid.can_access(db, "u", "gita:book")


# An annual plan adds its first month's Mudrā with the payment, the rest monthly.
@pytest.mark.parametrize("period, mudra", [("monthly", 150), ("annual", 150)])
def test_lite_grants_its_mudra_and_a_refund_takes_them_back(db, period, mudra):
    purchase = buy(db, "lite.v2." + period)
    assert purchase.credits == mudra
    assert svc.membership(db, "u").tier == "lite"
    state = hybrid.entitlements(db, "u")
    assert state["ad_free"] and state["background_audio"]
    assert state["included_titles"] == [] and state["downloadable_titles"] == []
    assert not hybrid.can_download(db, "u", "gita:book")
    assert hybrid.can_download(db, "u", "free:book")  # offline free books come with a plan
    svc.refund_purchase(db, purchase); db.commit()
    assert svc.lock_wallet(db, "u").balance == 0
    assert hybrid.entitlements(db, "u")["member_tier"] == "free"
    assert not hybrid.can_download(db, "u", "free:book")


def test_store_offers_mudra_packs_and_plans_once_there_is_something_to_buy(db, monkeypatch):
    monkeypatch.setattr(settings, "commerce_voice_enabled", False)  # Guru minutes count as something too
    def kinds(): return sorted({p["kind"] for p in hybrid.offers(db)})
    for medium in ("book", "audio"):
        db.get(Title, "gita:" + medium).credits = 0
    db.commit()
    assert kinds() == []  # premium but unpriced: nothing to spend Mudrā on yet
    db.get(Title, "gita:book").credits = 199
    db.commit()
    assert kinds() == ["refill", "subscription"]
    packs = [p for p in hybrid.offers(db) if p["kind"] == "refill"]
    assert len(packs) == 14 and {p["id"].rsplit(".", 1)[-1] for p in packs if p["preset"]} == {"100", "330", "1200"}
    db.get(Title, "gita:book").published = False
    db.commit()
    assert kinds() == []
    # Already-paid receipts restore even when nothing is on sale.
    buy(db, "lite.v2.monthly"); buy(db, "lite.v2.monthly")
    assert db.query(Purchase).count() == 1


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
    upgrade = receipt("upgrade", "plus", svc.now(), start + timedelta(days=60))
    svc.apply_purchase(db, "u", upgrade); db.commit()
    assert svc.membership(db, "u").tier == "plus"


def test_shop_and_offline_api_follow_mudra_ownership(db, monkeypatch):
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from app.auth import require_learner
    from app.db import get_db
    from app.commerce.router import router
    monkeypatch.setattr(settings, "commerce_signing_key", "test-key-with-more-than-thirty-two-characters")
    for medium, price in (("book", 199), ("audio", 249)):
        db.get(Title, "gita:" + medium).credits = price
    buy(db, "plus.v2.monthly")
    app = FastAPI(); app.include_router(router)
    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[require_learner] = lambda: db.get(Learner, "u")
    with TestClient(app) as client:
        state = client.get("/commerce/shop").json()
        assert state["member_tier"] == "plus" and state["ad_free"]
        assert state["regional_lite"]["USD"] == [3.99, 39.99]
        assert state["mudra"] == {"balance": 500, "available": 500, "deficit": 0}
        assert state["plan"]["tier"] == "plus" and state["plan"]["guru"] == {"total_minutes": 120, "left_seconds": 7200}
        assert state["plan"]["recite"] == {"per": "month", "total": 500, "used": 0, "left": 500}
        assert state["plans"]["lite"]["recite_per_month"] == 100 and "daily_multiplier" not in state["plans"]["lite"]
        assert state["prices"] == {"gita:book": 199, "gita:audio": 249}
        assert state["discount"] == 50 and state["member_prices"] == {"gita:book": 99, "gita:audio": 124}
        assert state["included_titles"] == []
        response = client.get("/commerce/titles/gita:book/licence")
        assert response.status_code == 403 and "Mudrā" in response.json()["detail"]
        bought = client.post("/commerce/mudra/spend", json={"item": "title:gita:book", "request_id": "first-book", "expected": 99})
        assert bought.status_code == 200 and bought.json()["available"] == 401  # Plus pays half
        db.query(Membership).update({"paid_until": svc.now() - timedelta(seconds=1)})
        db.commit()
        grant = client.get("/commerce/titles/gita:book/licence").json()
        assert grant["owned"] and grant["premium"]
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
    plans = importlib.import_module("migrations.versions.20261106_plan_allowances")
    engine = create_engine("sqlite:///" + str(tmp_path / "migration.db"))
    with engine.begin() as connection:
        operations = Operations(MigrationContext.configure(connection))
        monkeypatch.setattr(migration, "op", operations)
        monkeypatch.setattr(plans, "op", operations)
        migration.upgrade()
        assert len(inspect(connection).get_table_names()) == 3
        plans.upgrade()
        columns = {c["name"] for c in inspect(connection).get_columns("commerce_voice_calls")}
        assert {"plan_ms", "plan_period"} <= columns
        plans.downgrade()
        assert "plan_ms" not in {c["name"] for c in inspect(connection).get_columns("commerce_voice_calls")}
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


@pytest.fixture
def ad_client(db, monkeypatch):
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from app.auth import require_learner
    from app.db import get_db
    from app.commerce.router import router
    from app.commerce.ads_router import router as ads_router
    monkeypatch.setattr(settings, "commerce_ads_enabled", True)
    monkeypatch.setattr(settings, "commerce_signing_key", "test-key-with-more-than-thirty-two-characters")
    monkeypatch.setattr(settings, "commerce_admob_units", '["ca-app-pub-1234567890/2747237135"]')
    app = FastAPI(); app.include_router(router); app.include_router(ads_router)
    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[require_learner] = lambda: db.get(Learner, "u")
    with TestClient(app) as client:
        yield client


def test_free_accounts_see_ads_with_no_age_or_opt_in_step(ad_client):
    # Claiming to be under 18 must not be a way to skip ads: there is no such step.
    policy = ad_client.get("/commerce/ads/eligibility").json()
    assert policy == {"allowed": True, "enabled": True, "ad_free": False, "listen_ad_minutes": 10}
    assert ad_client.put("/commerce/ads/preferences", json={"adult": False, "opted_in": False}).status_code in (404, 405)
    # Native ads need no ticket any more.
    assert ad_client.post("/commerce/ads/ticket", json={"title_id": "", "kind": "native"}).status_code == 422


@pytest.mark.parametrize("plan", ["lite", "plus"])
def test_paid_members_never_receive_ads(db, ad_client, plan):
    buy(db, plan + ".v2.monthly")
    policy = ad_client.get("/commerce/ads/eligibility").json()
    assert policy["ad_free"] and not policy["allowed"]
    for kind, title in (("practice", "gita:book"), ("ask", "")):
        assert ad_client.post("/commerce/ads/ticket", json={"title_id": title, "kind": kind}).status_code == 403


def test_owned_editions_suppress_ads_and_refund_only_changes_that_grant(db, ad_client):
    purchased = buy(db, "edition.gita.book")
    assert not ad_client.get("/commerce/ads/eligibility?title_id=gita:book").json()["allowed"]
    assert ad_client.get("/commerce/ads/eligibility?title_id=gita:audio").json()["allowed"]
    assert ad_client.post("/commerce/ads/ticket", json={"title_id": "gita:book", "kind": "practice"}).status_code == 403
    svc.refund_purchase(db, purchased); db.commit()
    assert ad_client.get("/commerce/ads/eligibility?title_id=gita:book").json()["allowed"]


def signed_reward(ticket, transaction="google-verified-completion", unit="2747237135"):
    import time
    async def signed(_query):
        return {"custom_data": ticket, "transaction_id": transaction, "ad_unit": unit,
                "timestamp": str(int(time.time() * 1000))}
    return signed


def test_reward_requires_server_verification_and_is_idempotent(db, ad_client, monkeypatch):
    from app.commerce import ads
    from app.commerce.models import AdGrant
    body = {"title_id": "gita:audio", "kind": "practice"}
    ticket = ad_client.post("/commerce/ads/ticket", json=body).json()
    assert not ad_client.get("/commerce/ads/" + ticket["id"]).json()["verified"]
    # Google's callback carries only the number after the slash of the unit ID.
    monkeypatch.setattr(ads, "verify_callback", signed_reward(ticket["ticket"]))
    for _ in range(2):
        response = ad_client.get("/commerce/ads/ssv?fixture=verified")
        assert response.status_code == 200 and response.json() == {"ok": True}
    assert ad_client.get("/commerce/ads/" + ticket["id"]).json()["verified"]
    assert db.query(AdGrant).filter_by(transaction_id="google-verified-completion").count() == 1
    for _ in range(2):
        assert ad_client.post("/commerce/ads/ticket", json=body).status_code == 200
    assert ad_client.post("/commerce/ads/ticket", json=body).status_code == 429


@pytest.mark.parametrize("problem, change", [
    ("unrecognised ad unit", {"unit": "1111111111"}),
    ("unknown reward ticket", {"ticket": "not-our-ticket"}),
])
def test_signed_callbacks_that_grant_nothing_still_get_200(db, ad_client, monkeypatch, problem, change):
    # AdMob's "Verify URL" sends a signed test callback; refusing it blocks the SSV setup.
    from app.commerce import ads
    from app.commerce.models import AdGrant
    ticket = ad_client.post("/commerce/ads/ticket", json={"title_id": "gita:audio", "kind": "practice"}).json()
    monkeypatch.setattr(ads, "verify_callback", signed_reward(change.get("ticket", ticket["ticket"]), unit=change.get("unit", "2747237135")))
    response = ad_client.get("/commerce/ads/ssv?fixture=test")
    assert response.status_code == 200 and response.json() == {"ok": False, "ignored": problem}
    assert db.query(AdGrant).filter(AdGrant.transaction_id.isnot(None)).count() == 0


def test_unsigned_callback_is_refused(ad_client):
    assert ad_client.get("/commerce/ads/ssv?ad_unit=2747237135&transaction_id=x&signature=bad&key_id=none").status_code == 401


def test_ad_kill_switch_and_no_ad_opens_more_of_an_edition(ad_client, monkeypatch):
    # Previews are a fixed 5% for everyone (owner, 2026-11-06): no reading or listening rewards.
    for kind in ("reading", "audio"):
        assert ad_client.post("/commerce/ads/ticket", json={"title_id": "gita:book", "kind": kind}).status_code == 422
    monkeypatch.setattr(settings, "commerce_ads_enabled", False)
    assert not ad_client.get("/commerce/ads/eligibility").json()["allowed"]
    assert ad_client.post("/commerce/ads/ticket", json={"title_id": "gita:audio", "kind": "practice"}).status_code == 403


def test_listening_ad_interval_comes_from_the_server_with_a_floor(ad_client, monkeypatch):
    monkeypatch.setattr(settings, "commerce_listen_ad_minutes", 2)
    assert ad_client.get("/commerce/ads/eligibility").json()["listen_ad_minutes"] == 5
    monkeypatch.setattr(settings, "commerce_listen_ad_minutes", 12)
    assert ad_client.get("/commerce/ads/eligibility").json()["listen_ad_minutes"] == 12


def test_ads_launch_without_purchases(tmp_path, monkeypatch):
    # COMMERCE_ADS_ENABLED alone mounts the ad routes; the shop stays off.
    monkeypatch.setattr(settings, "commerce_enabled", False)
    monkeypatch.setattr(settings, "commerce_hybrid_enabled", False)
    monkeypatch.setattr(settings, "commerce_ads_enabled", True)
    monkeypatch.setattr(settings, "deferred_features_enabled", False)
    from app.main import create_app
    paths = set(create_app().openapi()["paths"])  # routers are included lazily
    assert "/commerce/ads/eligibility" in paths and "/commerce/ads/ssv" in paths
    assert "/commerce/shop" not in paths
    from app.commerce.ad_policy import eligibility
    engine = create_engine("sqlite:///" + str(tmp_path / "ads-only.db"))  # no commerce tables needed
    with sessionmaker(engine)() as db:
        assert eligibility(db, "anyone") == {"allowed": True, "enabled": True, "ad_free": False}
    engine.dispose()
    monkeypatch.setattr(settings, "commerce_ads_enabled", False)
    assert "/commerce/ads/eligibility" not in set(create_app().openapi()["paths"])


def test_reward_problem_reads_the_numeric_unit_and_fresh_timestamp(monkeypatch):
    from app.commerce import ads
    monkeypatch.setattr(settings, "commerce_admob_units", '["ca-app-pub-1234567890/2747237135", "555"]')
    fresh = {"ad_unit": "2747237135", "timestamp": "1700000000000", "transaction_id": "t", "custom_data": "c"}
    assert ads.reward_problem(fresh, now_ms=1700000000000) is None
    assert ads.reward_problem({**fresh, "ad_unit": "555"}, now_ms=1700000000000) is None
    assert ads.reward_problem(fresh, now_ms=1700000000000 + 25 * 3600 * 1000) == "stale reward"
    assert ads.reward_problem({**fresh, "custom_data": ""}, now_ms=1700000000000) == "missing reward identity"

def test_reward_units_come_from_the_config_file_when_env_is_empty(tmp_path, monkeypatch):
    # deploy.sh joins env vars with commas, so the list lives in ad_config.json.
    import json
    from app.commerce import ads
    monkeypatch.setattr(settings, "commerce_admob_units", "[]")
    path = tmp_path / "ad_config.json"
    path.write_text(json.dumps({"rewarded_units": ["ca-app-pub-1/42"]}), encoding="utf-8")
    monkeypatch.setattr(ads, "CONFIG_FILE", path)
    assert ads.unit_ids() == {"42"}
    monkeypatch.setattr(settings, "commerce_admob_units", '["7"]')
    assert ads.unit_ids() == {"7"}
    monkeypatch.setattr(settings, "commerce_admob_units", "[]")
    monkeypatch.setattr(ads, "CONFIG_FILE", tmp_path / "missing.json")
    assert ads.unit_ids() == set()


def test_checked_in_ad_config_is_valid_and_empty_by_default():
    import json
    from app.commerce import ads
    data = json.loads(ads.CONFIG_FILE.read_text(encoding="utf-8"))
    assert data["rewarded_units"] == [] and "audio_breaks" not in data


def test_an_ad_adds_to_todays_own_ai_allowance(db, ad_client, monkeypatch):
    from app.commerce import ads
    from app.services import quota
    assert ad_client.get("/commerce/ads/ask-topup").json() == {"available": True, "left_today": 3}
    ticket = ad_client.post("/commerce/ads/ticket", json={"kind": "ask"}).json()
    assert quota.ad_bonus(db, "u", quota.GEMINI_KIND) == 0
    monkeypatch.setattr(ads, "verify_callback", signed_reward(ticket["ticket"], transaction="ask-view"))
    assert ad_client.get("/commerce/ads/ssv?fixture=ask").json() == {"ok": True}
    assert quota.ad_bonus(db, "u", quota.GEMINI_KIND) == quota.ASK_AD_BONUS[quota.GEMINI_KIND]
    assert quota.ad_bonus(db, "u", "llm_calls") == quota.ASK_AD_BONUS["llm_calls"]
    assert quota.ad_bonus(db, "u", "tts_chars") == 0  # never the speech allowance
    assert ad_client.get("/commerce/ads/ask-topup").json()["left_today"] == 2
    buy(db, "lite.v2.monthly")  # paying members have no ads, so no ad top-up either
    assert ad_client.get("/commerce/ads/ask-topup").json()["available"] is False


def test_the_ad_bonus_raises_the_learners_limit_not_the_shared_budget(db, monkeypatch):
    from app.commerce.models import AdGrant
    from app.services import quota
    monkeypatch.setattr(settings, "commerce_ads_enabled", True)
    monkeypatch.setattr(settings, "quota_enabled", True)
    monkeypatch.setattr(settings, "quota_llm_calls_per_day", 1)
    learner = db.get(Learner, "u")
    quota.check_and_consume(db, learner, "llm_calls", 1, surface="explain")
    with pytest.raises(quota.QuotaExceeded):
        quota.check_and_consume(db, learner, "llm_calls", 1, surface="explain")
    db.add(AdGrant(learner_id="u", title_id="", kind="ask", transaction_id="seen", expires_at=svc.now() + timedelta(hours=24)))
    db.commit()
    quota.check_and_consume(db, learner, "llm_calls", 1, surface="explain")
