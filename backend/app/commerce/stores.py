"""Trust boundaries for Apple signed transactions and Google Publisher API purchases."""
import hashlib
import json
import uuid
from datetime import datetime, timezone
from pathlib import Path

import httpx
from fastapi import HTTPException

from app.config import settings
from app.commerce.catalogue import PRODUCTS


def account_token(learner_id):
    return str(uuid.uuid5(uuid.NAMESPACE_URL, "sanskritam:store:" + learner_id))


def google_account(learner_id):
    return hashlib.sha256(account_token(learner_id).encode()).hexdigest()


def ms(value):
    return datetime.fromtimestamp(int(value) / 1000, timezone.utc).replace(tzinfo=None)


def iso(value):
    return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(timezone.utc).replace(tzinfo=None)


def apple_verifier():
    from appstoreserverlibrary.signed_data_verifier import SignedDataVerifier
    from appstoreserverlibrary.models.Environment import Environment
    roots = [Path(path).read_bytes() for path in json.loads(settings.commerce_apple_root_paths)]
    if not roots or (settings.commerce_store_environment == "Production" and not settings.commerce_apple_app_id):
        raise HTTPException(503, "Apple verification is not configured")
    env = Environment.PRODUCTION if settings.commerce_store_environment == "Production" else Environment.SANDBOX
    return SignedDataVerifier(roots, True, env, settings.commerce_bundle_id, settings.commerce_apple_app_id or None)


def normalize_apple(tx, learner_id=None):
    if tx.bundleId != settings.commerce_bundle_id or tx.productId not in PRODUCTS:
        raise HTTPException(422, "Unexpected Apple application or product")
    if learner_id and str(tx.appAccountToken or "").lower() != account_token(learner_id):
        raise HTTPException(409, "Apple purchase account does not match")
    return {"provider": "apple", "transaction_id": tx.transactionId,
        "original_id": tx.originalTransactionId, "product_id": tx.productId,
        "paid_at": ms(tx.purchaseDate), "paid_until": ms(tx.expiresDate) if tx.expiresDate else None,
        "revoked": bool(tx.revocationDate),
        "evidence": {"account_token": str(tx.appAccountToken or ""), "environment": str(tx.environment)}}


def verify_apple(signed_transaction, learner_id=None):
    try:
        tx = apple_verifier().verify_and_decode_signed_transaction(signed_transaction)
        return normalize_apple(tx, learner_id)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(422, "Apple transaction verification failed") from exc


def google_access_token():
    from google.oauth2 import service_account
    from google.auth.transport.requests import Request
    if not settings.commerce_google_credentials_path:
        raise HTTPException(503, "Google purchase verification is not configured")
    credentials = service_account.Credentials.from_service_account_file(
        settings.commerce_google_credentials_path, scopes=["https://www.googleapis.com/auth/androidpublisher"])
    credentials.refresh(Request())
    return credentials.token


async def google_request(path, method="GET", body=None):
    import asyncio
    access = await asyncio.to_thread(google_access_token)
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.request(method, "https://androidpublisher.googleapis.com/androidpublisher/v3/applications/"
                                        + settings.commerce_bundle_id + "/" + path,
                                        headers={"Authorization": "Bearer " + access}, json=body)
    if response.status_code >= 400:
        raise HTTPException(503 if response.status_code >= 500 else 422, "Google purchase verification unavailable or invalid")
    return response.json() if response.content else {}


async def verify_google(product_id, token, learner_id=None):
    from urllib.parse import quote
    product = PRODUCTS.get(product_id)
    if not product:
        raise HTTPException(422, "Unknown product")
    subscription = product["kind"] == "subscription"
    path = ("purchases/subscriptionsv2/tokens/" + quote(token, safe="") if subscription else
            "purchases/products/" + quote(product_id, safe="") + "/tokens/" + quote(token, safe=""))
    data = await google_request(path)
    state = "active"
    if subscription:
        status = data.get("subscriptionState")
        if status not in {"SUBSCRIPTION_STATE_ACTIVE", "SUBSCRIPTION_STATE_CANCELED", "SUBSCRIPTION_STATE_IN_GRACE_PERIOD", "SUBSCRIPTION_STATE_EXPIRED", "SUBSCRIPTION_STATE_ON_HOLD", "SUBSCRIPTION_STATE_PAUSED"}:
            raise HTTPException(409, "Subscription payment is pending")
        items = [item for item in data.get("lineItems", []) if item.get("productId") == product_id and item.get("latestSuccessfulOrderId")]
        if not items:
            raise HTTPException(422, "No paid matching subscription period")
        item = max(items, key=lambda i: i["expiryTime"])
        until = iso(item["expiryTime"])
        tx = item["latestSuccessfulOrderId"]
        bound = data.get("externalAccountIdentifiers", {}).get("obfuscatedExternalAccountId")
        state = {"SUBSCRIPTION_STATE_CANCELED": "cancelled", "SUBSCRIPTION_STATE_IN_GRACE_PERIOD": "grace",
                 "SUBSCRIPTION_STATE_ON_HOLD": "hold", "SUBSCRIPTION_STATE_PAUSED": "paused",
                 "SUBSCRIPTION_STATE_EXPIRED": "expired"}.get(status, "active")
        paid_at = iso(data["startTime"])
    else:
        if data.get("purchaseState") != 0:
            raise HTTPException(409, "Payment is pending or cancelled")
        until, tx = None, data.get("orderId")
        paid_at = ms(data["purchaseTimeMillis"])
        bound = data.get("obfuscatedExternalAccountId")
    if not tx or (learner_id and bound != google_account(learner_id)):
        raise HTTPException(409, "Google purchase account does not match")
    # startTime is the initial subscription start, not the current renewal date.
    order = await google_request("orders/" + quote(tx, safe=""))
    if order.get("state") not in {"PROCESSED", "PARTIALLY_REFUNDED", "REFUNDED"}:
        raise HTTPException(409, "The order is not a completed payment")
    paid_at = iso(order["createTime"])
    return {"provider": "google", "transaction_id": tx, "original_id": hashlib.sha256(token.encode()).hexdigest(),
            "product_id": product_id, "paid_at": paid_at, "paid_until": until,
            "state": state, "revoked": order.get("state") == "REFUNDED",
            "evidence": {"account_token": bound, "token_hash": hashlib.sha256(token.encode()).hexdigest(),
                         "environment": "Sandbox" if "testPurchase" in data or data.get("purchaseType") == 0 else "Production",
                         "linked_token_hash": hashlib.sha256(data["linkedPurchaseToken"].encode()).hexdigest() if data.get("linkedPurchaseToken") else None,
                         "acknowledged": data.get("acknowledgementState"),
                         "order_time": order["createTime"]}}


async def finish_google(product_id, token):
    """Called only after the verified grant commits, so a lost phone cannot lose it."""
    from urllib.parse import quote
    product = PRODUCTS[product_id]
    kind = "subscriptions" if product["kind"] == "subscription" else "products"
    operation = "acknowledge" if kind == "subscriptions" else "consume"
    path = f"purchases/{kind}/{quote(product_id, safe='')}/tokens/{quote(token, safe='')}:{operation}"
    await google_request(path, "POST", {} if operation == "acknowledge" else None)


def current_apple_transactions(transaction_id, learner_id):
    from appstoreserverlibrary.api_client import AppStoreServerAPIClient
    from appstoreserverlibrary.models.Environment import Environment
    if not settings.commerce_apple_private_key_path:
        raise HTTPException(503, "Apple server API credentials are not configured")
    env = Environment.PRODUCTION if settings.commerce_store_environment == "Production" else Environment.SANDBOX
    client = AppStoreServerAPIClient(Path(settings.commerce_apple_private_key_path).read_bytes(),
        settings.commerce_apple_key_id, settings.commerce_apple_issuer_id, settings.commerce_bundle_id, env)
    response = client.get_all_subscription_statuses(transaction_id)
    result = []
    for group in response.data or []:
        for item in group.lastTransactions or []:
            value = verify_apple(item.signedTransactionInfo, learner_id)
            if item.signedRenewalInfo:
                renewal = apple_verifier().verify_and_decode_renewal_info(item.signedRenewalInfo)
                if renewal.gracePeriodExpiresDate and ms(renewal.gracePeriodExpiresDate) > datetime.utcnow():
                    value["state"], value["paid_until"] = "grace", ms(renewal.gracePeriodExpiresDate)
            result.append(value)
    return result


def verify_google_notification(authorization):
    from google.oauth2 import id_token
    from google.auth.transport.requests import Request
    if not settings.commerce_google_notification_audience or not settings.commerce_google_notification_email:
        raise HTTPException(503, "Google notifications are not configured")
    try:
        claims = id_token.verify_oauth2_token(authorization.removeprefix("Bearer "), Request(), settings.commerce_google_notification_audience)
        if claims.get("email") != settings.commerce_google_notification_email or not claims.get("email_verified"):
            raise ValueError("Unexpected principal")
    except Exception as exc:
        raise HTTPException(401, "Invalid Google notification identity") from exc
