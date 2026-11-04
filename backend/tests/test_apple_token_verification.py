"""Exercise the real Apple JWT verifier with local keys, without vendor calls."""

from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa

from app.routers.auth_router import _verify_apple_id_token


@pytest.fixture(scope="module")
def signing_key():
    return rsa.generate_private_key(public_exponent=65537, key_size=2048)


@pytest.fixture
def apple_token(monkeypatch, signing_key):
    # Only replace Apple's key fetch. jwt.decode still verifies the actual
    # signature, allowed algorithm, expiry and issuer, plus our audience gate.
    monkeypatch.setattr(jwt, "PyJWKClient", lambda url: SimpleNamespace(
        get_signing_key_from_jwt=lambda token: SimpleNamespace(key=signing_key.public_key())
    ))

    def make(**overrides):
        claims = {
            "iss": "https://appleid.apple.com",
            "aud": "com.sanskritam.app",
            "sub": "apple-test-learner",
            "exp": datetime.now(timezone.utc) + timedelta(minutes=5),
        }
        claims.update(overrides)
        return jwt.encode(claims, signing_key, algorithm="RS256", headers={"kid": "test-key"})

    return make


def test_accepts_apple_rs256_identity_token(apple_token):
    payload = _verify_apple_id_token(apple_token(), " other.service, com.sanskritam.app ")
    assert payload is not None
    assert payload["sub"] == "apple-test-learner"


@pytest.mark.parametrize("overrides", [
    {"aud": "another.app"},
    {"iss": "https://attacker.example"},
    {"exp": datetime.now(timezone.utc) - timedelta(minutes=5)},
])
def test_rejects_wrong_audience_issuer_or_expired_token(apple_token, overrides):
    assert _verify_apple_id_token(apple_token(**overrides), "com.sanskritam.app") is None


def test_rejects_token_signed_by_another_key(apple_token):
    other_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    claims = jwt.decode(apple_token(), options={"verify_signature": False})
    forged = jwt.encode(claims, other_key, algorithm="RS256")
    assert _verify_apple_id_token(forged, "com.sanskritam.app") is None


def test_rejects_unexpected_algorithm(apple_token):
    claims = jwt.decode(apple_token(), options={"verify_signature": False})
    forged = jwt.encode(claims, "attacker-secret-with-at-least-32-bytes", algorithm="HS256")
    assert _verify_apple_id_token(forged, "com.sanskritam.app") is None
