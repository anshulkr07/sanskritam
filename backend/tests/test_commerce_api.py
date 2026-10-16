import hashlib
import json
import uuid
from datetime import timedelta

import pytest
from fastapi import FastAPI, APIRouter
from fastapi.testclient import TestClient
from fastapi.responses import StreamingResponse

from app.config import settings
from app.db import SessionLocal
from app.models import Learner, Token
from app.commerce import service as svc
from app.commerce.models import Wallet, Title, Purchase, Membership, Profile, Setting, ReferralReward, PayoutRequest
from app.commerce.catalogue import PREFIX


@pytest.fixture
def account(client, monkeypatch):
    monkeypatch.setattr(settings, "commerce_enabled", True)
    monkeypatch.setattr(settings, "commerce_sales_enabled", True)
    monkeypatch.setattr(settings, "commerce_signing_key", "test-signing-key-longer-than-thirty-two-bytes")
    monkeypatch.setattr(settings, "commerce_rewards_enabled", True)
    response = client.post("/auth/dev-login", json={"display_name": "commerce-" + uuid.uuid4().hex[:8], "bridge_langs": ["en"]})
    assert response.status_code == 200, response.text
    value = response.json()
    headers = {"Authorization": "Bearer " + value["token"]}
    user = value["learner"]["id"]
    with SessionLocal() as db:
        db.get(Learner, user).google_sub = "verified-test-" + user
        wallet = svc.lock_wallet(db, user)
        svc.journal(db, wallet, 1000, "test-funds:" + user, "promotion")
        row = db.get(Setting, "ai_costs")
        cost = {"ask": {"bound_inr": .2, "verified_at": "test", "evidence": "fixture"}, "voice": {"bound_inr": 2, "verified_at": "test", "evidence": "fixture"}}
        if row: row.value = cost
        else: db.add(Setting(key="ai_costs", value=cost))
        db.commit()
    return user, headers


def test_wallet_requires_authentication(client):
    assert client.get("/commerce/wallet").status_code == 401


def test_store_credits_only_from_verified_adapter(client, account, monkeypatch):
    from app.commerce import stores
    user, headers = account
    async def verified(product, proof, learner):
        assert learner == user
        return {"provider": "google", "transaction_id": user + "-order", "original_id": user + "-token",
                "product_id": product, "paid_at": svc.now(), "paid_until": None, "evidence": {}}
    monkeypatch.setattr(stores, "verify_google", verified)
    async def finish(*args):
        return None
    monkeypatch.setattr(stores, "finish_google", finish)
    body = {"provider": "google", "product_id": PREFIX + "credits.small", "proof": "server-verifies-this"}
    for _ in range(2):
        response = client.post("/commerce/purchases/verify", json=body, headers=headers)
        assert response.status_code == 200, response.text
    assert client.get("/commerce/wallet", headers=headers).json()["balance"] == 1100


def test_disabled_sales_never_accept_purchase(client, account, monkeypatch):
    monkeypatch.setattr(settings, "commerce_sales_enabled", False)
    response = client.post("/commerce/purchases/verify", headers=account[1], json={"provider": "google", "product_id": PREFIX + "credits.small", "proof": "fake"})
    assert response.status_code == 503


def test_download_needs_both_membership_and_unlock(client, account):
    user, headers = account
    assert client.get("/commerce/titles/unknown:book/licence", headers=headers).status_code == 403
    with SessionLocal() as db:
        tid = user + ":book"
        db.add(Title(id=tid, slug=user, medium="book", name="Test book", credits=30, published=True))
        db.commit()
    assert client.post("/commerce/titles/unlock", headers=headers, json={"title_id": tid, "request_id": "unlock-request"}).status_code == 200
    assert client.get(f"/commerce/titles/{tid}/licence", headers=headers).status_code == 403
    with SessionLocal() as db:
        member = Membership(learner_id=user, provider="apple", original_id=user, tier="lite", paid_until=svc.now() + timedelta(days=2))
        db.add(member); db.commit()
    result = client.get(f"/commerce/titles/{tid}/licence", headers=headers)
    assert result.status_code == 200
    from app.commerce.router import decode
    payload = decode(result.json()["licence"], "offline")
    assert payload["sub"] == user
    assert payload["exp"] < (svc.now() + timedelta(days=3)).timestamp()


def test_forged_ad_callback_is_rejected(client, account):
    assert client.get("/commerce/ads/ssv?custom_data=forged&signature=invalid&key_id=wrong").status_code == 401


def test_admin_roles_do_not_expose_finance(client, account, monkeypatch):
    token = "catalogue-test-token"
    monkeypatch.setattr(settings, "commerce_admin_keys_json", json.dumps({hashlib.sha256(token.encode()).hexdigest(): "catalogue"}))
    response = client.get("/commerce/admin/data", headers={"X-Admin-Token": token})
    assert response.status_code == 200
    assert "purchases" not in response.json() and "payouts" not in response.json()
    response = client.post("/commerce/admin/grants", headers={"X-Admin-Token": token},
        json={"learner_id": account[0], "amount": 1000, "request_id": "bad-grant", "reason": "not permitted for catalogue"})
    assert response.status_code == 403


def test_payout_request_holds_all_rewards_atomically(client, account):
    user, headers = account
    with SessionLocal() as db:
        db.add(Profile(learner_id=user, adult=True, country="GB"))
        setting = db.get(Setting, "reward_countries")
        if setting: setting.value = {"GB": {"method": "local gift", "reviewed": True}}
        else: db.add(Setting(key="reward_countries", value={"GB": {"method": "local gift", "reviewed": True}}))
        for i in range(2):
            db.add(ReferralReward(referrer_id=user, purchase_id=uuid.uuid4().hex, amount_minor=400, inr_paise=30000, currency="GBP", available_at=svc.now() - timedelta(days=1)))
        db.commit()
    body = {"method": "gift", "recipient": "Test recipient instructions"}
    first = client.post("/commerce/referrals/payout", headers=headers, json=body)
    assert first.status_code == 200, first.text
    assert client.post("/commerce/referrals/payout", headers=headers, json=body).status_code == 409
    with SessionLocal() as db:
        row = db.get(PayoutRequest, first.json()["id"])
        assert "Test recipient" not in row.recipient_encrypted


@pytest.mark.parametrize("stream,success,cached", [(False, True, False), (False, True, True), (False, False, False), (True, True, False), (True, False, False)])
def test_metered_routes_settle_delivery_and_release_failures(client, account, stream, success, cached):
    from app.commerce.metering import CommerceRoute
    from app.commerce.router import sign
    user, headers = account
    route = APIRouter(route_class=CommerceRoute)
    @route.post("/ask/talk")
    async def fake_answer():
        if stream:
            async def events():
                yield 'data: {"type":"partial","card":{"text":"working"}}\n\n'
                yield 'data: {"type":"final","response":{"cached":false}}\n\n' if success else 'data: {"type":"error","status":503}\n\n'
            return StreamingResponse(events(), media_type="text/event-stream")
        if not success:
            from fastapi import HTTPException
            raise HTTPException(503, "Provider unavailable")
        return {"cached": cached, "card": {"text": "Useful answer"}}
    app = FastAPI(); app.include_router(route)
    quote = sign({"scope": "quote", "sub": user, "action": "ask", "rate": 2, "credits": 2, "seconds": 0, "exp": svc.now() + timedelta(minutes=1)})
    with TestClient(app) as test:
        response = test.post("/ask/talk", json={}, headers={**headers, "X-Credit-Quote": quote, "X-Credit-Request": "one-request-id"})
        assert response.status_code == (200 if success or stream else 503), response.text
        assert test.post("/ask/talk", json={}, headers={**headers, "X-Credit-Quote": quote, "X-Credit-Request": "one-request-id"}).status_code == 409
    with SessionLocal() as db:
        wallet = db.get(Wallet, user)
        assert wallet.reserved == 0
        assert wallet.balance == (998 if success and not cached else 1000)
