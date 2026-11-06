"""Sign in with Apple authorization-code exchange and deletion revocation.

Apple can revoke a Sign in with Apple authorization only with a refresh token
or access token from the token endpoint. These tests exercise the real client
secret/encryption code and stub only the HTTPS calls to Apple.
"""

import jwt
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec

from tests.conftest import _TMPDIR  # noqa: F401  (ensures env set before imports)

APPLE_AUDIENCE = "com.example.shabd"
APPLE_SUB = "000123.abc456def789.0123"


def _keypair():
    key = ec.generate_private_key(ec.SECP256R1())
    pem = key.private_bytes(
        serialization.Encoding.PEM,
        serialization.PrivateFormat.PKCS8,
        serialization.NoEncryption(),
    ).decode()
    return key, pem


def _configure_apple(monkeypatch, key_pem):
    from app.config import settings

    monkeypatch.setattr(settings, "apple_client_id", APPLE_AUDIENCE)
    monkeypatch.setattr(settings, "apple_team_id", "TEAM123456")
    monkeypatch.setattr(settings, "apple_key_id", "KEY1234567")
    monkeypatch.setattr(settings, "apple_private_key", key_pem)
    monkeypatch.setattr(settings, "apple_private_key_path", "")
    monkeypatch.setattr(settings, "apple_token_key", "apple-test-encryption-key")


def _token_payload(sub=APPLE_SUB):
    return {
        "iss": "https://appleid.apple.com",
        "sub": sub,
        "aud": APPLE_AUDIENCE,
        "email": "learner@privaterelay.appleid.com",
        "email_verified": True,
    }


class _Response:
    def __init__(self, status_code=200, body=None):
        self.status_code = status_code
        self._body = body or {}

    def json(self):
        return self._body


def test_client_secret_is_es256_with_apple_claims(monkeypatch):
    from app.services import apple_signin

    key, pem = _keypair()
    _configure_apple(monkeypatch, pem)

    secret = apple_signin.client_secret(APPLE_AUDIENCE)
    assert secret
    claims = jwt.decode(
        secret,
        key.public_key(),
        algorithms=["ES256"],
        audience="https://appleid.apple.com",
    )
    assert claims["iss"] == "TEAM123456"
    assert claims["sub"] == APPLE_AUDIENCE
    assert claims["exp"] > claims["iat"]
    assert jwt.get_unverified_header(secret)["kid"] == "KEY1234567"


def test_private_key_accepts_escaped_newlines(monkeypatch):
    from app.services import apple_signin

    _key, pem = _keypair()
    _configure_apple(monkeypatch, pem.replace("\n", "\\n"))
    assert apple_signin.client_secret(APPLE_AUDIENCE)


def test_refresh_authorization_is_encrypted_at_rest(monkeypatch):
    from app.services import apple_signin

    _configure_apple(monkeypatch, _keypair()[1])
    sealed = apple_signin.encrypt_authorization("rt-123", APPLE_AUDIENCE)
    assert sealed and "rt-123" not in sealed
    assert apple_signin.decrypt_authorization(sealed) == ("rt-123", APPLE_AUDIENCE)


def test_exchange_and_revoke_use_apple_endpoints(monkeypatch):
    from app.services import apple_signin

    _key, pem = _keypair()
    _configure_apple(monkeypatch, pem)
    calls = []

    def fake_post(url, data=None, timeout=None):
        calls.append((url, dict(data or {})))
        if url == apple_signin.TOKEN_URL:
            return _Response(200, {
                "refresh_token": "rt-123",
                "id_token": jwt.encode(
                    {"sub": APPLE_SUB, "aud": APPLE_AUDIENCE}, "unused-signing-key-with-enough-length-1234567890", algorithm="HS256"
                ),
            })
        return _Response(200, {})

    monkeypatch.setattr(apple_signin.requests, "post", fake_post)

    assert apple_signin.exchange_authorization_code(
        "code-123", APPLE_AUDIENCE, APPLE_SUB
    ) == "rt-123"
    assert apple_signin.revoke_refresh_token("rt-123", APPLE_AUDIENCE) is True

    token_call = calls[0]
    assert token_call[1]["grant_type"] == "authorization_code"
    assert token_call[1]["code"] == "code-123"
    assert token_call[1]["client_id"] == APPLE_AUDIENCE
    revoke_call = calls[1]
    assert revoke_call[0] == apple_signin.REVOKE_URL
    assert revoke_call[1]["token"] == "rt-123"
    assert revoke_call[1]["token_type_hint"] == "refresh_token"


def test_exchange_rejects_a_code_for_another_subject(monkeypatch):
    from app.services import apple_signin

    _key, pem = _keypair()
    _configure_apple(monkeypatch, pem)

    def fake_post(url, data=None, timeout=None):
        return _Response(200, {
            "refresh_token": "rt-123",
            "id_token": jwt.encode(
                {"sub": "someone-else", "aud": APPLE_AUDIENCE}, "unused-signing-key-with-enough-length-1234567890", algorithm="HS256"
            ),
        })

    monkeypatch.setattr(apple_signin.requests, "post", fake_post)
    assert apple_signin.exchange_authorization_code(
        "code-123", APPLE_AUDIENCE, APPLE_SUB
    ) is None


def test_apple_login_stores_the_exchanged_token(client, monkeypatch):
    from app.config import settings
    from app.db import SessionLocal
    from app.models import Learner
    from app.routers import auth_router
    from app.services import apple_signin

    _configure_apple(monkeypatch, _keypair()[1])
    monkeypatch.setattr(settings, "apple_client_id", APPLE_AUDIENCE)
    monkeypatch.setattr(auth_router, "_verify_apple_id_token", lambda tok, aud: _token_payload())
    monkeypatch.setattr(apple_signin, "configured", lambda: True)
    monkeypatch.setattr(
        apple_signin, "exchange_authorization_code",
        lambda code, client_id, sub: "rt-123",
    )

    response = client.post(
        "/auth/apple",
        json={
            "id_token": "valid-token-token-token",
            "authorization_code": "one-time-code",
            "bridge_langs": ["en", "hi"],
        },
    )
    assert response.status_code == 200, response.text
    learner_id = response.json()["learner"]["id"]

    with SessionLocal() as db:
        learner = db.get(Learner, learner_id)
        assert learner.apple_sub == APPLE_SUB
        assert learner.apple_refresh_token
        assert "rt-123" not in learner.apple_refresh_token
        assert apple_signin.decrypt_authorization(learner.apple_refresh_token) == (
            "rt-123", APPLE_AUDIENCE,
        )


def test_apple_login_survives_a_failed_code_exchange(client, monkeypatch):
    from app.config import settings
    from app.routers import auth_router
    from app.services import apple_signin

    _configure_apple(monkeypatch, _keypair()[1])
    monkeypatch.setattr(settings, "apple_client_id", APPLE_AUDIENCE)
    monkeypatch.setattr(
        auth_router, "_verify_apple_id_token",
        lambda tok, aud: _token_payload(sub="login-no-token-sub"),
    )
    monkeypatch.setattr(apple_signin, "configured", lambda: True)
    monkeypatch.setattr(apple_signin, "exchange_authorization_code", lambda *args: None)

    response = client.post(
        "/auth/apple",
        json={"id_token": "valid-token-token-token", "authorization_code": "bad-code"},
    )
    assert response.status_code == 200, response.text


def test_linking_apple_stores_the_exchanged_token(client, monkeypatch):
    from app.config import settings
    from app.db import SessionLocal
    from app.models import Learner
    from app.routers import auth_router
    from app.services import apple_signin

    _configure_apple(monkeypatch, _keypair()[1])
    monkeypatch.setattr(settings, "apple_client_id", APPLE_AUDIENCE)
    monkeypatch.setattr(
        auth_router, "_verify_apple_id_token",
        lambda tok, aud: _token_payload(sub="linked-apple-sub"),
    )
    monkeypatch.setattr(apple_signin, "configured", lambda: True)
    monkeypatch.setattr(
        apple_signin, "exchange_authorization_code",
        lambda code, client_id, sub: "rt-link-123",
    )

    login = client.post(
        "/auth/dev-login",
        json={"display_name": "apple-link-learner", "bridge_langs": ["en"]},
    )
    assert login.status_code == 200, login.text
    learner_id = login.json()["learner"]["id"]
    headers = {"Authorization": f"Bearer {login.json()['token']}"}

    response = client.post(
        "/me/link/apple",
        headers=headers,
        json={
            "id_token": "valid-token-token-token",
            "authorization_code": "link-code",
        },
    )
    assert response.status_code == 200, response.text

    with SessionLocal() as db:
        learner = db.get(Learner, learner_id)
        assert learner.apple_sub == "linked-apple-sub"
        assert apple_signin.decrypt_authorization(learner.apple_refresh_token) == (
            "rt-link-123", APPLE_AUDIENCE,
        )


def test_account_deletion_revokes_apple_and_clears_the_outbox(client, monkeypatch):
    from app.db import SessionLocal
    from app.models import Learner, ProviderDeletion
    from app.services import apple_signin, provider_deletion

    _configure_apple(monkeypatch, _keypair()[1])
    revoked = []
    monkeypatch.setattr(
        provider_deletion.apple_signin, "revoke_refresh_token",
        lambda refresh_token, client_id: revoked.append((refresh_token, client_id)) or True,
    )

    login = client.post(
        "/auth/dev-login",
        json={"display_name": "apple-delete-learner", "bridge_langs": ["en"]},
    )
    assert login.status_code == 200, login.text
    learner_id = login.json()["learner"]["id"]
    headers = {"Authorization": f"Bearer {login.json()['token']}"}

    with SessionLocal() as db:
        learner = db.get(Learner, learner_id)
        learner.apple_sub = APPLE_SUB + "-delete"
        learner.apple_refresh_token = apple_signin.encrypt_authorization(
            "rt-delete-123", APPLE_AUDIENCE,
        )
        db.commit()

    response = client.delete("/me", headers=headers)
    assert response.status_code == 204, response.text
    assert revoked == [("rt-delete-123", APPLE_AUDIENCE)]

    with SessionLocal() as db:
        assert db.get(Learner, learner_id) is None
        assert db.get(ProviderDeletion, ("apple", learner_id)) is None


def test_failed_apple_revocation_stays_queued_for_retry(client, monkeypatch):
    from app.db import SessionLocal
    from app.models import Learner, ProviderDeletion
    from app.services import apple_signin, provider_deletion

    _configure_apple(monkeypatch, _keypair()[1])
    results = [False, True]
    calls = []

    def fake_revoke(refresh_token, client_id):
        calls.append((refresh_token, client_id))
        return results.pop(0)

    monkeypatch.setattr(provider_deletion.apple_signin, "revoke_refresh_token", fake_revoke)

    login = client.post(
        "/auth/dev-login",
        json={"display_name": "apple-retry-learner", "bridge_langs": ["en"]},
    )
    assert login.status_code == 200, login.text
    learner_id = login.json()["learner"]["id"]
    headers = {"Authorization": f"Bearer {login.json()['token']}"}

    with SessionLocal() as db:
        learner = db.get(Learner, learner_id)
        learner.apple_sub = APPLE_SUB + "-retry"
        learner.apple_refresh_token = apple_signin.encrypt_authorization(
            "rt-retry-123", APPLE_AUDIENCE,
        )
        db.commit()

    assert client.delete("/me", headers=headers).status_code == 204

    with SessionLocal() as db:
        task = db.get(ProviderDeletion, ("apple", learner_id))
        assert task is not None
        assert "rt-retry-123" not in task.secret
        assert provider_deletion.process(db)["pending"] == 0
        assert db.get(ProviderDeletion, ("apple", learner_id)) is None

    assert calls == [
        ("rt-retry-123", APPLE_AUDIENCE),
        ("rt-retry-123", APPLE_AUDIENCE),
    ]


def test_apple_revocation_migration_roundtrip(tmp_path, monkeypatch):
    import importlib

    from alembic.migration import MigrationContext
    from alembic.operations import Operations
    from sqlalchemy import create_engine, inspect

    migration = importlib.import_module(
        "migrations.versions.20261106_apple_revocation"
    )
    engine = create_engine("sqlite:///" + str(tmp_path / "apple-migration.db"))
    with engine.begin() as connection:
        connection.exec_driver_sql(
            "CREATE TABLE learners (id VARCHAR(64) PRIMARY KEY)"
        )
        connection.exec_driver_sql(
            "CREATE TABLE provider_deletions ("
            "provider VARCHAR(32), subject VARCHAR(64), "
            "task_id VARCHAR(128), created_at DATETIME, "
            "PRIMARY KEY (provider, subject))"
        )
        monkeypatch.setattr(
            migration, "op", Operations(MigrationContext.configure(connection))
        )
        migration.upgrade()
        assert "apple_refresh_token" in {
            column["name"] for column in inspect(connection).get_columns("learners")
        }
        assert "secret" in {
            column["name"]
            for column in inspect(connection).get_columns("provider_deletions")
        }
        migration.downgrade()
        assert "apple_refresh_token" not in {
            column["name"] for column in inspect(connection).get_columns("learners")
        }


def test_legacy_apple_login_without_a_token_does_not_queue_an_unrevocable_task(client):
    from app.db import SessionLocal
    from app.models import Learner, ProviderDeletion

    login = client.post(
        "/auth/dev-login",
        json={"display_name": "apple-legacy-learner", "bridge_langs": ["en"]},
    )
    assert login.status_code == 200, login.text
    learner_id = login.json()["learner"]["id"]
    headers = {"Authorization": f"Bearer {login.json()['token']}"}

    with SessionLocal() as db:
        db.get(Learner, learner_id).apple_sub = APPLE_SUB + "-legacy"
        db.commit()

    assert client.delete("/me", headers=headers).status_code == 204
    with SessionLocal() as db:
        assert db.get(ProviderDeletion, ("apple", learner_id)) is None
