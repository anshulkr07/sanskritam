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
from app.commerce.models import Wallet, Title, Purchase, Membership, Profile, Setting, ReferralReward, PayoutRequest, AdGrant, HostedEvent, Reservation
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
        cost = {"ask": {"bound_inr": .2, "verified_at": "test", "evidence": "fixture"}, "analysis": {"bound_inr": .8, "verified_at": "test", "evidence": "fixture"}, "voice": {"bound_inr": 2, "verified_at": "test", "evidence": "fixture"}}
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
    assert client.post("/commerce/titles/unlock", headers=headers, json={"title_id": tid, "expected_credits": 30, "request_id": "unlock-request"}).status_code == 200
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
    assert "entries" not in response.json() and not response.json()["settings"]
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


def test_reward_callbacks_are_idempotent_and_transaction_cannot_be_reused(client, account, monkeypatch):
    from app.commerce import ads
    from app.commerce.router import sign
    user, headers = account
    tokens = []
    with SessionLocal() as db:
        for _ in range(2):
            row = AdGrant(learner_id=user, title_id="test:book", kind="reading", expires_at=svc.now() + timedelta(minutes=10))
            db.add(row); db.flush()
            tokens.append(sign({"scope": "ad", "sub": user, "id": row.id, "exp": row.expires_at}))
        db.commit()
    token = tokens[0]
    async def verified(_):
        return {"custom_data": token, "transaction_id": "ad-replay-" + user}
    monkeypatch.setattr(ads, "verify_callback", verified)
    for _ in range(2):
        assert client.get("/commerce/ads/ssv?verified-test-signature").status_code == 200
    token = tokens[1]
    assert client.get("/commerce/ads/ssv?verified-test-signature").status_code == 409


def test_ad_limits_consent_and_member_suppression(client, account, monkeypatch):
    user, headers = account
    monkeypatch.setattr(settings, "commerce_ads_enabled", True)
    with SessionLocal() as db:
        tid = user + ":book"
        db.add(Title(id=tid, slug=user, medium="book", name="Ad sample", credits=30, published=True))
        db.commit()
    body = {"title_id": tid, "kind": "practice"}
    assert client.post("/commerce/ads/ticket", headers=headers, json=body).status_code == 403
    with SessionLocal() as db:
        db.add(Profile(learner_id=user, adult=True, ads_consent=True, country="IN")); db.commit()
    for _ in range(3):
        assert client.post("/commerce/ads/ticket", headers=headers, json=body).status_code == 200
    assert client.post("/commerce/ads/ticket", headers=headers, json=body).status_code == 429
    with SessionLocal() as db:
        db.add(Membership(learner_id=user, provider="apple", original_id=user, tier="lite", paid_until=svc.now() + timedelta(days=1))); db.commit()
    assert client.post("/commerce/ads/ticket", headers=headers, json=body).status_code == 403


def test_native_cap_survives_ticket_expiry(client, account, monkeypatch):
    user, headers = account
    monkeypatch.setattr(settings, "commerce_ads_enabled", True)
    with SessionLocal() as db:
        db.add(Profile(learner_id=user, adult=True, ads_consent=True, country="IN"))
        db.get(Learner, user).streak = 1
        for _ in range(2):
            db.add(AdGrant(learner_id=user, title_id="", kind="native", expires_at=svc.now() - timedelta(minutes=1)))
        db.commit()
    assert client.post("/commerce/ads/ticket", headers=headers, json={"title_id": "", "kind": "native"}).status_code == 429


@pytest.mark.parametrize("unknown", [False, True])
def test_voice_delivery_enforces_accepted_limit_and_releases_on_unknown_audio(client, account, unknown):
    import base64
    import io
    import wave
    from app.commerce.metering import CommerceRoute, delivered_seconds
    from app.commerce.router import sign
    user, headers = account
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as target:
        target.setnchannels(1); target.setsampwidth(2); target.setframerate(8000)
        target.writeframes(b"\x00\x00" * (8000 * 36))
    audio = base64.b64encode(b"unknown format" if unknown else buffer.getvalue()).decode()
    route = APIRouter(route_class=CommerceRoute)
    @route.post("/conversation/turn")
    async def voice_reply():
        return {"reply": {"audio_base64": audio}}
    app = FastAPI(); app.include_router(route)
    quote = sign({"scope": "quote", "sub": user, "action": "voice", "rate": 20, "credits": 10, "seconds": 30, "exp": svc.now() + timedelta(minutes=1)})
    with TestClient(app) as test:
        result = test.post("/conversation/turn", json={}, headers={**headers, "X-Credit-Quote": quote, "X-Credit-Request": "voice-delivery-limit"})
    assert result.status_code == (503 if unknown else 200), result.text
    if not unknown:
        assert delivered_seconds(result.json()) == 30
    with SessionLocal() as db:
        wallet = db.get(Wallet, user)
        assert wallet.reserved == 0 and wallet.balance == (1000 if unknown else 990)


def test_event_publication_needs_reviews_and_unique_hosting_purchase(client, account, monkeypatch):
    user, headers = account
    monkeypatch.setattr(settings, "commerce_hosting_enabled", True)
    admin = {"X-Admin-Token": "test-admin"}
    with SessionLocal() as db:
        config = db.get(Setting, "reward_countries")
        if config: config.value = {"IN": {"method": "local gift", "reviewed": True}}
        else: db.add(Setting(key="reward_countries", value={"IN": {"method": "local gift", "reviewed": True}}))
        p = svc.apply_purchase(db, user, {"provider": "apple", "transaction_id": user, "original_id": user, "product_id": PREFIX + "hosting", "paid_at": svc.now(), "paid_until": None})
        events = []
        for _ in range(2):
            row = HostedEvent(organizer_id=user, state="approved", details={"countries": ["IN"], "funding_inr_paise": 10000, "tie_breaks": "Earliest valid entry", "verification": "Reviewed adult identity", "moderation": "Platform moderation", "sponsorship": "Platform administers this event"})
            db.add(row); db.flush(); events.append(row.id)
        db.commit(); purchase_id = p.id
    body = {"state": "published", "evidence": "Funded and reviewed with settlement evidence", "hosting_purchase_id": purchase_id}
    assert client.post(f"/commerce/admin/events/{events[0]}/review", headers=admin, json=body).status_code == 409
    body.update(identity_reviewed=True, rules_reviewed=True, funding_reviewed=True, moderation_reviewed=True)
    assert client.post(f"/commerce/admin/events/{events[0]}/review", headers=admin, json=body).status_code == 200
    assert client.post(f"/commerce/admin/events/{events[1]}/review", headers=admin, json=body).status_code == 409
    public = client.get("/commerce/events", headers=headers).json()
    assert all("review_evidence" not in e["details"] and "reviews" not in e["details"] for e in public)


def test_disconnected_response_does_not_settle_undelivered_work(client, account):
    import asyncio
    from app.commerce.metering import CommerceRoute
    from app.commerce.router import sign
    user, headers = account
    route = APIRouter(route_class=CommerceRoute)
    @route.post("/ask/talk")
    async def reply():
        return {"cached": False, "card": {"text": "Useful answer"}}
    app = FastAPI(); app.include_router(route)
    quote = sign({"scope": "quote", "sub": user, "action": "ask", "rate": 2, "credits": 2, "seconds": 0, "exp": svc.now() + timedelta(minutes=1)})
    wire_headers = {**headers, "X-Credit-Quote": quote, "X-Credit-Request": "disconnect-before-body"}
    async def disconnected():
        async def receive():
            return {"type": "http.request", "body": b"{}", "more_body": False}
        async def send(message):
            if message["type"] == "http.response.body":
                raise OSError("Connection lost before delivery")
        await app({"type": "http", "asgi": {"version": "3.0"}, "http_version": "1.1", "method": "POST", "scheme": "http",
                   "path": "/ask/talk", "raw_path": b"/ask/talk", "query_string": b"", "root_path": "",
                   "server": ("testserver", 80), "client": ("testclient", 1),
                   "headers": [(k.lower().encode(), v.encode()) for k, v in wire_headers.items()]}, receive, send)
    with pytest.raises(OSError):
        asyncio.run(disconnected())
    with SessionLocal() as db:
        wallet = svc.lock_wallet(db, user)
        assert wallet.balance == 1000 and wallet.reserved == 2
        db.query(Reservation).filter_by(learner_id=user).one().expires_at = svc.now() - timedelta(seconds=1)
        db.flush(); svc.expire_reservations(db, wallet); db.commit()
        assert wallet.balance == 1000 and wallet.reserved == 0


@pytest.mark.parametrize("accepted_action", ["ask", "analysis"])
def test_detailed_analysis_requires_its_own_quote(client, account, monkeypatch, accepted_action):
    from app.routers import explain
    from app.commerce.router import sign
    user, headers = account
    calls = []
    async def measured_stub(req, learner, db):
        calls.append(req)
        assert req.cards and "detailed" in req.question
        assert req.screen_text == "अ + इ → ए"
        return {"routed_to": "llm", "explanation": "Detailed result", "cached": False}
    monkeypatch.setattr(explain, "ask_explain", measured_stub)
    quote = sign({"scope": "quote", "sub": user, "action": accepted_action, "rate": 8 if accepted_action == "analysis" else 2,
                  "seconds": 0, "exp": svc.now() + timedelta(minutes=1)})
    response = client.post("/explain/analysis", headers={**headers, "X-Credit-Quote": quote, "X-Credit-Request": "detailed-analysis-test"},
                           json={"surface": "grammar", "subject": "अ + इ → ए", "question": "Explain the reasoning"})
    assert response.status_code == (200 if accepted_action == "analysis" else 403), response.text
    assert len(calls) == (1 if accepted_action == "analysis" else 0)
    with SessionLocal() as db:
        assert db.get(Wallet, user).balance == (992 if accepted_action == "analysis" else 1000)
