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
    discount = getattr(tx, "offerDiscountType", None)
    if str(getattr(discount, "value", discount)) == "FREE_TRIAL":
        raise HTTPException(409, "Credits are granted only for a paid subscription period")
    return {"provider": "apple", "transaction_id": tx.transactionId,
        "original_id": tx.originalTransactionId, "product_id": tx.productId,
        "paid_at": ms(tx.purchaseDate), "paid_until": ms(tx.expiresDate) if tx.expiresDate else None,
        "revoked": bool(tx.revocationDate),
        "evidence": {"account_token": str(tx.appAccountToken or ""), "environment": str(tx.environment)}}


def apple_client():
    from appstoreserverlibrary.api_client import AppStoreServerAPIClient
    from appstoreserverlibrary.models.Environment import Environment
    if not settings.commerce_apple_private_key_path:
        raise HTTPException(503, "Apple server API credentials are not configured")
    env = Environment.PRODUCTION if settings.commerce_store_environment == "Production" else Environment.SANDBOX
    return AppStoreServerAPIClient(Path(settings.commerce_apple_private_key_path).read_bytes(),
        settings.commerce_apple_key_id, settings.commerce_apple_issuer_id, settings.commerce_bundle_id, env)


def verify_apple(signed_transaction, learner_id=None, refresh=False):
    try:
        verifier = apple_verifier()
        tx = verifier.verify_and_decode_signed_transaction(signed_transaction)
        value = normalize_apple(tx, learner_id)
        if refresh:
            # A valid old JWS can predate a refund. Never grant from that snapshot.
            try:
                current = apple_client().get_transaction_info(tx.transactionId)
            except HTTPException:
                raise
            except Exception as exc:
                raise HTTPException(503, "Apple purchase status is temporarily unavailable") from exc
            fresh = verifier.verify_and_decode_signed_transaction(current.signedTransactionInfo)
            if fresh.transactionId != tx.transactionId or fresh.originalTransactionId != tx.originalTransactionId:
                raise HTTPException(422, "Apple transaction identity changed")
            value = normalize_apple(fresh, learner_id)
        return value
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
    if order.get("purchaseToken") and order["purchaseToken"] != token:
        raise HTTPException(422, "Google order does not match the purchase token")
    if order.get("lineItems") and not any(i.get("productId") == product_id for i in order["lineItems"]):
        raise HTTPException(422, "Google order does not match the purchased product")
    total = order.get("total")
    if total is not None and int(total.get("units", 0)) * 1000000000 + int(total.get("nanos", 0)) <= 0:
        raise HTTPException(409, "Credits are granted only for a paid order")
    paid_at = iso(order.get("orderHistory", {}).get("processedEvent", {}).get("eventTime") or order["createTime"])
    return {"provider": "google", "transaction_id": tx, "original_id": hashlib.sha256(token.encode()).hexdigest(),
            "product_id": product_id, "paid_at": paid_at, "paid_until": until,
            "state": state, "revoked": order.get("state") == "REFUNDED",
            "evidence": {"account_token": bound, "token_hash": hashlib.sha256(token.encode()).hexdigest(),
                         "environment": "Sandbox" if "testPurchase" in data or data.get("purchaseType") == 0 else "Production",
                         "linked_token_hash": hashlib.sha256(data["linkedPurchaseToken"].encode()).hexdigest() if data.get("linkedPurchaseToken") else None,
                         "acknowledged": data.get("acknowledgementState"),
                         "consumed": data.get("consumptionState") == 1,
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
    from appstoreserverlibrary.api_client import GetTransactionHistoryVersion
    from appstoreserverlibrary.models.TransactionHistoryRequest import TransactionHistoryRequest
    client, result, revision, seen = apple_client(), {}, None, set()
    request = TransactionHistoryRequest(productIds=[key for key, product in PRODUCTS.items() if product["kind"] == "subscription"])
    while True:
        history = client.get_transaction_history(transaction_id, revision, request, GetTransactionHistoryVersion.V2)
        for signed in history.signedTransactions or []:
            try:
                value = verify_apple(signed, learner_id)
            except HTTPException as exc:
                if exc.status_code == 409 and "paid subscription period" in str(exc.detail):
                    continue  # Free trials never create a paid credit grant.
                raise
            result[value["transaction_id"]] = value
        if not history.hasMore:
            break
        if not history.revision or history.revision in seen:
            raise HTTPException(503, "Apple history pagination did not advance")
        revision = history.revision
        seen.add(revision)
    response = client.get_all_subscription_statuses(transaction_id)
    for group in response.data or []:
        for item in group.lastTransactions or []:
            value = verify_apple(item.signedTransactionInfo, learner_id)
            if item.signedRenewalInfo:
                renewal = apple_verifier().verify_and_decode_renewal_info(item.signedRenewalInfo)
                if renewal.gracePeriodExpiresDate and ms(renewal.gracePeriodExpiresDate) > datetime.utcnow():
                    value["state"], value["paid_until"] = "grace", ms(renewal.gracePeriodExpiresDate)
            result[value["transaction_id"]] = value
    return sorted(result.values(), key=lambda value: value["paid_at"])


async def google_subscription_history(token, latest, known_transactions=()):
    """Backfill missing paid orders; guessed IDs never establish a payment.

    Candidate renewal suffixes are checked individually with Google's Orders
    API, including its actual product, token and funded service period. Unknown
    order-ID formats require reconciliation review rather than inferred grants.
    """
    import re
    from urllib.parse import quote
    match = re.fullmatch(r"(.+)\.\.(\d+)", latest["transaction_id"])
    if not match:
        return []  # An initial unsuffixed order has no earlier renewal suffix.
    number = int(match[2])
    if number > 120:
        raise HTTPException(409, "Extended Google order history requires a reviewed import")
    result = []
    candidates = [match[1]] + [match[1] + ".." + str(index) for index in range(number)]
    for order_id in candidates:
        if order_id in known_transactions:
            continue
        order = await google_request("orders/" + quote(order_id, safe=""))
        if order.get("state") not in {"PROCESSED", "PARTIALLY_REFUNDED", "REFUNDED"}:
            continue
        if order.get("orderId") != order_id or order.get("purchaseToken") != token:
            raise HTTPException(422, "Historical Google order identity does not match")
        items = [i for i in order.get("lineItems", []) if PRODUCTS.get(i.get("productId"), {}).get("kind") == "subscription"]
        if len(items) != 1:
            raise HTTPException(422, "Historical Google subscription product is ambiguous")
        item = items[0]
        period = item.get("subscriptionDetails", {})
        if period.get("offerPhase") == "FREE_TRIAL" or "freeTrialDetails" in period.get("offerPhaseDetails", {}):
            continue
        if not period.get("servicePeriodStartTime") or not period.get("servicePeriodEndTime"):
            raise HTTPException(409, "Google billing-period evidence is missing")
        value = {**latest, "transaction_id": order_id, "product_id": item["productId"],
                 "paid_at": iso(order.get("orderHistory", {}).get("processedEvent", {}).get("eventTime") or order["createTime"]),
                 "paid_until": iso(period["servicePeriodEndTime"]), "state": "expired", "revoked": order["state"] == "REFUNDED",
                 "evidence": {**latest.get("evidence", {}), "billing_period": iso(period["servicePeriodStartTime"]).isoformat(), "history_verified": True}}
        # A historical period must not inherit the latest upgrade's linked token.
        value["evidence"].pop("linked_token_hash", None)
        result.append(value)
    return sorted(result, key=lambda value: value["paid_at"])


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
