"""Receipt freshness and signature verification, without vendor network calls."""
import base64
import asyncio
import time
from types import SimpleNamespace
from urllib.parse import urlencode

import pytest
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec
from fastapi import HTTPException

from app.config import settings
from app.commerce import stores, ads
from app.commerce.catalogue import PREFIX


def transaction(**changes):
    return SimpleNamespace(**{
        "bundleId": settings.commerce_bundle_id, "productId": PREFIX + "credits.small",
        "appAccountToken": stores.account_token("user"), "transactionId": "tx1",
        "originalTransactionId": "tx1", "purchaseDate": 1000000, "expiresDate": None,
        "revocationDate": None, "environment": "Sandbox", **changes,
    })


@pytest.mark.parametrize("change,expected", [({"revocationDate": 2000000}, True), ({}, False)])
def test_apple_refresh_uses_current_refund_status(monkeypatch, change, expected):
    verified = {"old-jws": transaction(), "fresh-jws": transaction(**change)}
    monkeypatch.setattr(stores, "apple_verifier", lambda: SimpleNamespace(verify_and_decode_signed_transaction=verified.__getitem__))
    def lookup(tx):
        assert tx == "tx1"
        return SimpleNamespace(signedTransactionInfo="fresh-jws")
    monkeypatch.setattr(stores, "apple_client", lambda: SimpleNamespace(get_transaction_info=lookup))
    result = stores.verify_apple("old-jws", "user", refresh=True)
    assert result["revoked"] is expected


@pytest.mark.parametrize("changes", [{"transactionId": "another"}, {"appAccountToken": stores.account_token("other-user")}])
def test_apple_refresh_checks_identity_again(monkeypatch, changes):
    verified = {"old": transaction(), "fresh": transaction(**changes)}
    monkeypatch.setattr(stores, "apple_verifier", lambda: SimpleNamespace(verify_and_decode_signed_transaction=verified.__getitem__))
    monkeypatch.setattr(stores, "apple_client", lambda: SimpleNamespace(get_transaction_info=lambda _: SimpleNamespace(signedTransactionInfo="fresh")))
    with pytest.raises(HTTPException) as exc:
        stores.verify_apple("old", "user", refresh=True)
    assert exc.value.status_code in {409, 422}


def test_apple_lookup_failure_never_falls_back_to_old_receipt(monkeypatch):
    monkeypatch.setattr(stores, "apple_verifier", lambda: SimpleNamespace(verify_and_decode_signed_transaction=lambda _: transaction()))
    def unavailable(_):
        raise RuntimeError("network unavailable")
    monkeypatch.setattr(stores, "apple_client", lambda: SimpleNamespace(get_transaction_info=unavailable))
    with pytest.raises(HTTPException) as exc:
        stores.verify_apple("old", "user", refresh=True)
    assert exc.value.status_code == 503


def test_admob_signature_covers_exact_reward_fields(monkeypatch):
    private = ec.generate_private_key(ec.SECP256R1())
    public = private.public_key().public_bytes(serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo).decode()
    monkeypatch.setattr(ads, "_keys", {"local-test": public})
    monkeypatch.setattr(ads, "_loaded_at", time.monotonic())
    monkeypatch.setattr(settings, "commerce_admob_units", '["test-unit"]')
    signed = urlencode({"custom_data": "signed-account-ticket", "timestamp": int(time.time() * 1000), "transaction_id": "unique-ad", "ad_unit": "test-unit"})
    signature = base64.urlsafe_b64encode(private.sign(signed.encode(), ec.ECDSA(hashes.SHA256()))).decode().rstrip("=")
    query = signed + "&signature=" + signature + "&key_id=local-test"
    assert asyncio.run(ads.verify_callback(query))["transaction_id"] == "unique-ad"
    with pytest.raises(HTTPException) as exc:
        asyncio.run(ads.verify_callback(query.replace("unique-ad", "forged-ad")))
    assert exc.value.status_code == 401


def test_direct_static_book_audio_is_blocked_but_instructional_audio_remains_free(tmp_path, monkeypatch):
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from app.commerce.static_audio import ProtectedAudioFiles
    (tmp_path / "chant").mkdir(); (tmp_path / "varnamala").mkdir()
    (tmp_path / "chant" / "known.m4a").write_bytes(b"protected")
    (tmp_path / "varnamala" / "a.wav").write_bytes(b"free instruction")
    app = FastAPI(); app.mount("/audio", ProtectedAudioFiles(directory=str(tmp_path)))
    with TestClient(app) as test:
        monkeypatch.setattr(settings, "commerce_enabled", True)
        assert test.get("/audio/chant/known.m4a").status_code == 403
        assert test.get("/audio/varnamala/a.wav").content == b"free instruction"
        monkeypatch.setattr(settings, "commerce_enabled", False)
        assert test.get("/audio/chant/known.m4a").content == b"protected"


def test_apple_reconciliation_reads_all_history_pages(monkeypatch):
    from datetime import datetime, timedelta
    begin = datetime(2026, 1, 1)
    def normalize(signed, learner):
        assert learner == "user"
        return {"transaction_id": signed, "paid_at": begin + timedelta(days=int(signed) * 30)}
    monkeypatch.setattr(stores, "verify_apple", normalize)
    revisions = []
    def history(tx, revision, request, version):
        revisions.append(revision)
        assert tx == "original" and PREFIX + "lite.monthly" in request.productIds
        return SimpleNamespace(signedTransactions=["1", "2"] if revision is None else ["3"], hasMore=revision is None, revision="page-2")
    monkeypatch.setattr(stores, "apple_client", lambda: SimpleNamespace(get_transaction_history=history, get_all_subscription_statuses=lambda _: SimpleNamespace(data=[])))
    assert [p["transaction_id"] for p in stores.current_apple_transactions("original", "user")] == ["1", "2", "3"]
    assert revisions == [None, "page-2"]


def test_google_reconciliation_backfills_only_verified_missing_orders(monkeypatch):
    seen = []
    async def request(path):
        order_id = path.split("/", 1)[1]
        seen.append(order_id)
        return {"orderId": order_id, "purchaseToken": "trusted-token", "state": "PROCESSED", "createTime": "2026-02-01T00:00:00Z",
                "lineItems": [{"productId": PREFIX + "lite.monthly", "subscriptionDetails": {"servicePeriodStartTime": "2026-02-01T00:00:00Z", "servicePeriodEndTime": "2026-03-01T00:00:00Z"}}]}
    monkeypatch.setattr(stores, "google_request", request)
    latest = {"provider": "google", "transaction_id": "GPA-test..2", "original_id": "hashed", "evidence": {"linked_token_hash": "older"}}
    result = asyncio.run(stores.google_subscription_history("trusted-token", latest, {"GPA-test", "GPA-test..0"}))
    assert seen == ["GPA-test..1"]
    assert len(result) == 1 and result[0]["transaction_id"] == "GPA-test..1"
    assert result[0]["product_id"] == PREFIX + "lite.monthly" and result[0]["state"] == "expired"
    assert "linked_token_hash" not in result[0]["evidence"]


def test_google_history_rejects_a_different_purchase_token(monkeypatch):
    async def request(_):
        return {"orderId": "GPA-test", "purchaseToken": "other-token", "state": "PROCESSED"}
    monkeypatch.setattr(stores, "google_request", request)
    with pytest.raises(HTTPException) as exc:
        asyncio.run(stores.google_subscription_history("trusted-token", {"transaction_id": "GPA-test..1"}))
    assert exc.value.status_code == 422
