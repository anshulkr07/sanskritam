"""Apple sign-in endpoint tests (App Store Guideline 4.8).

The token-verification stub (``_verify_apple_id_token``) is monkeypatched so
no live call to appleid.apple.com happens in tests. This still exercises the
real endpoint logic: bind-to-`sub`, find-or-create, idempotency, the
first-auth display name, and the not-configured guard.
"""

from tests.conftest import _TMPDIR  # noqa: F401  (ensures env set before imports)

APPLE_SUB = "000123.abc456def789.0123"
APPLE_AUDIENCE = "com.example.shabd"


def _token_payload(sub=APPLE_SUB, **overrides):
    payload = {
        "iss": "https://appleid.apple.com",
        "sub": sub,
        "aud": APPLE_AUDIENCE,
        "email": "learner@privaterelay.appleid.com",
        "email_verified": True,
    }
    payload.update(overrides)
    return payload


def test_apple_login_requires_config(client, monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "apple_client_id", "")
    r = client.post(
        "/auth/apple",
        json={"id_token": "not-a-real-token-token-token-token", "bridge_langs": ["en", "hi"]},
    )
    assert r.status_code == 501, r.text


def test_apple_login_creates_and_is_idempotent(client, monkeypatch):
    from app.config import settings
    from app.routers import auth_router

    monkeypatch.setattr(settings, "apple_client_id", APPLE_AUDIENCE)
    monkeypatch.setattr(auth_router, "_verify_apple_id_token", lambda tok, aud: _token_payload())

    # First login creates a learner bound to the Apple sub. Apple sent no
    # name here, so the relay-email local part is the fallback display name.
    r1 = client.post(
        "/auth/apple",
        json={"id_token": "tok-1-token-token-token", "bridge_langs": ["en", "hi"]},
    )
    assert r1.status_code == 200, r1.text
    body1 = r1.json()
    assert "token" in body1
    learner_id_1 = body1["learner"]["id"]

    # Same sub logs back in to the SAME learner (not a new row).
    r2 = client.post(
        "/auth/apple",
        json={"id_token": "tok-2-token-token-token", "bridge_langs": ["hi"]},
    )
    assert r2.status_code == 200, r2.text
    body2 = r2.json()
    assert body2["learner"]["id"] == learner_id_1, (
        "same Apple account must map to the same learner"
    )


def test_apple_login_uses_forwarded_display_name(client, monkeypatch):
    from app.config import settings
    from app.routers import auth_router

    monkeypatch.setattr(settings, "apple_client_id", APPLE_AUDIENCE)
    monkeypatch.setattr(
        auth_router, "_verify_apple_id_token",
        lambda tok, aud: _token_payload(sub="different-sub-0001"),
    )

    r = client.post(
        "/auth/apple",
        json={"id_token": "tok-3-token-token-token", "display_name": "Sisya Apple"},
    )
    assert r.status_code == 200, r.text
    assert r.json()["learner"]["display_name"] == "Sisya Apple"


def test_apple_login_rejects_invalid_token(client, monkeypatch):
    from app.config import settings
    from app.routers import auth_router

    monkeypatch.setattr(settings, "apple_client_id", APPLE_AUDIENCE)
    monkeypatch.setattr(auth_router, "_verify_apple_id_token", lambda tok, aud: None)

    r = client.post(
        "/auth/apple",
        json={"id_token": "forged-token-token-token", "bridge_langs": ["en", "hi"]},
    )
    assert r.status_code == 401, r.text


def test_apple_login_rejects_missing_sub(client, monkeypatch):
    from app.config import settings
    from app.routers import auth_router

    monkeypatch.setattr(settings, "apple_client_id", APPLE_AUDIENCE)
    monkeypatch.setattr(
        auth_router,
        "_verify_apple_id_token",
        lambda tok, aud: _token_payload(sub=""),
    )

    r = client.post(
        "/auth/apple",
        json={"id_token": "tok-token-token-token", "bridge_langs": ["en", "hi"]},
    )
    assert r.status_code == 401, r.text
