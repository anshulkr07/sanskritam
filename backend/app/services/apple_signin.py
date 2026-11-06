"""Sign in with Apple: authorization-code exchange and token revocation.

An Apple identity token proves who signed in, but it is not a credential the
server can revoke. App Review requires the app to revoke the learner's Apple
authorization when the account is deleted. The sign-in flow therefore also
returns a short-lived, one-time authorization code; this service exchanges it
for a refresh token and seals that token before it is stored.

The refresh token is revoked at ``https://appleid.apple.com/auth/revoke`` using
a client secret signed with the .p8 key created in the Apple Developer portal
(Keys > Sign in with Apple). It is never returned to the app or written to a
log.

Configuration (all server-side environment values):
    APPLE_CLIENT_ID       bundle ID and/or Services ID (already used for login)
    APPLE_TEAM_ID         Apple Developer team ID
    APPLE_KEY_ID          Key ID of the Sign in with Apple .p8 key
    APPLE_PRIVATE_KEY     .p8 contents; literal ``\\n`` escapes are accepted
    APPLE_PRIVATE_KEY_PATH optional local-dev alternative to the value above
    APPLE_TOKEN_KEY       optional dedicated encryption secret

The encryption key falls back to ``COMMERCE_SIGNING_KEY`` and then to the .p8
key, so an Apple-only deployment does not need commerce configuration.
"""

import base64
import hashlib
import json
import logging
import time
from pathlib import Path

import requests

from app.config import settings

logger = logging.getLogger("shabd.apple")

TOKEN_URL = "https://appleid.apple.com/auth/token"
REVOKE_URL = "https://appleid.apple.com/auth/revoke"
APPLE_AUDIENCE = "https://appleid.apple.com"
TIMEOUT_SECONDS = 10


def _private_key() -> str:
    """The .p8 key, from the environment or a local file, with real newlines."""
    value = (settings.apple_private_key or "").strip()
    if not value and settings.apple_private_key_path:
        try:
            value = Path(settings.apple_private_key_path).read_text(encoding="utf-8").strip()
        except OSError:
            logger.error("apple_private_key_unreadable")
            return ""
    # Secret Manager and .env files often carry the PEM as one line with
    # literal \n sequences; normalise both forms to a real PEM.
    return value.replace("\\n", "\n")


def configured() -> bool:
    return bool(
        settings.apple_client_id
        and settings.apple_team_id
        and settings.apple_key_id
        and _private_key()
    )


def _allowed_client_ids() -> set[str]:
    return {value.strip() for value in settings.apple_client_id.split(",") if value.strip()}


def client_secret(client_id: str) -> str | None:
    """Build the short-lived ES256 JWT Apple expects as ``client_secret``."""
    key = _private_key()
    if not (key and client_id and settings.apple_team_id and settings.apple_key_id):
        return None
    import jwt

    now = int(time.time())
    return jwt.encode(
        {
            "iss": settings.apple_team_id,
            "iat": now,
            "exp": now + 300,
            "aud": APPLE_AUDIENCE,
            "sub": client_id,
        },
        key,
        algorithm="ES256",
        headers={"kid": settings.apple_key_id},
    )


def _encryption_key() -> bytes | None:
    source = (
        settings.apple_token_key
        or settings.commerce_signing_key
        or _private_key()
    )
    if not source:
        return None
    return base64.urlsafe_b64encode(
        hashlib.sha256((source + ":apple-refresh-token").encode()).digest()
    )


def encrypt_authorization(refresh_token: str, client_id: str) -> str | None:
    """Seal the refresh token and the client ID that minted it."""
    key = _encryption_key()
    if not key:
        return None
    from cryptography.fernet import Fernet

    payload = json.dumps(
        {"refresh_token": refresh_token, "client_id": client_id},
        separators=(",", ":"),
    )
    return Fernet(key).encrypt(payload.encode()).decode()


def decrypt_authorization(value: str) -> tuple[str, str] | None:
    """Open a value produced by :func:`encrypt_authorization`."""
    key = _encryption_key()
    if not (key and value):
        return None
    from cryptography.fernet import Fernet

    try:
        payload = json.loads(Fernet(key).decrypt(value.encode()).decode())
    except Exception:
        return None
    refresh_token = payload.get("refresh_token") if isinstance(payload, dict) else None
    client_id = payload.get("client_id") if isinstance(payload, dict) else None
    if not (isinstance(refresh_token, str) and refresh_token and isinstance(client_id, str) and client_id):
        return None
    return refresh_token, client_id


def _audience(claims: dict) -> str:
    aud = claims.get("aud")
    if isinstance(aud, list):
        aud = aud[0] if aud else ""
    return aud if isinstance(aud, str) else ""


def exchange_authorization_code(code: str, client_id: str, expected_sub: str) -> str | None:
    """Exchange Apple's one-time authorization code for a refresh token.

    Returns ``None`` on any failure. The caller keeps the identity-token login
    working even when Apple's token endpoint is unavailable.
    """
    secret = client_secret(client_id)
    if not secret:
        return None
    try:
        response = requests.post(
            TOKEN_URL,
            data={
                "client_id": client_id,
                "client_secret": secret,
                "code": code,
                "grant_type": "authorization_code",
            },
            timeout=TIMEOUT_SECONDS,
        )
    except requests.RequestException:
        logger.warning("apple_token_exchange_unreachable")
        return None
    if response.status_code != 200:
        logger.warning("apple_token_exchange_failed status=%s", response.status_code)
        return None
    try:
        data = response.json()
    except ValueError:
        logger.warning("apple_token_exchange_invalid_json")
        return None
    refresh_token = data.get("refresh_token")
    if not isinstance(refresh_token, str) or not refresh_token:
        logger.warning("apple_token_exchange_missing_refresh_token")
        return None

    # Apple returns a fresh identity token with the exchange. It came directly
    # from Apple over TLS; comparing its subject keeps a code from being paired
    # with a different learner's already-verified identity token.
    returned = data.get("id_token")
    if returned:
        import jwt

        try:
            claims = jwt.decode(
                returned,
                options={"verify_signature": False, "verify_aud": False, "verify_exp": False},
            )
        except Exception:
            logger.warning("apple_token_exchange_bad_id_token")
            return None
        if claims.get("sub") != expected_sub:
            logger.warning("apple_token_exchange_subject_mismatch")
            return None
        returned_aud = claims.get("aud")
        if returned_aud and returned_aud != client_id:
            logger.warning("apple_token_exchange_audience_mismatch")
            return None
    return refresh_token


def authorization_for_code(code: str, claims: dict) -> str | None:
    """Verify the code's audience, exchange it, and seal the result for storage.

    Never raises: a bad Apple configuration or an Apple outage must not turn a
    valid identity-token login into a 500. The learner simply has no revocable
    token until a later sign-in succeeds.
    """
    try:
        client_id = _audience(claims)
        sub = claims.get("sub")
        if not (code and client_id and sub and configured()):
            return None
        if client_id not in _allowed_client_ids():
            logger.warning("apple_authorization_unexpected_audience")
            return None
        refresh_token = exchange_authorization_code(code, client_id, sub)
        if not refresh_token:
            return None
        return encrypt_authorization(refresh_token, client_id)
    except Exception:
        logger.exception("apple_authorization_failed")
        return None


def revoke_refresh_token(refresh_token: str, client_id: str) -> bool:
    """Revoke one Apple authorization; ``True`` means Apple confirmed it."""
    secret = client_secret(client_id)
    if not (secret and refresh_token and client_id):
        return False
    try:
        response = requests.post(
            REVOKE_URL,
            data={
                "client_id": client_id,
                "client_secret": secret,
                "token": refresh_token,
                "token_type_hint": "refresh_token",
            },
            timeout=TIMEOUT_SECONDS,
        )
    except requests.RequestException:
        logger.warning("apple_revoke_unreachable")
        return False
    if 200 <= response.status_code < 300:
        return True
    error = ""
    try:
        body = response.json()
        error = body.get("error", "") if isinstance(body, dict) else ""
    except ValueError:
        pass
    # RFC 7009 lets an already-invalid token count as cancelled. Anything
    # else (bad client secret, Apple outage) must stay in the retry outbox.
    if error in {"invalid_token", "invalid_grant"}:
        return True
    logger.warning("apple_revoke_failed status=%s error=%s", response.status_code, error)
    return False
