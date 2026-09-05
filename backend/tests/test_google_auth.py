"""Google sign-in endpoint tests.

The token-verification stub (``_verify_google_id_token``) is monkeypatched so
no live call to accounts.google.com happens in tests. This still exercises the
real endpoint logic: bind-to-`sub`, find-or-create, idempotency, and the
not-configured guard.
"""

from tests.conftest import _TMPDIR  # noqa: F401  (ensures env set before imports)

GOOGLE_SUB = "11223344556677889900"
GOOGLE_AUDIENCE = "test-client-id.apps.googleusercontent.com"


def _token_payload(sub=GOOGLE_SUB, **overrides):
    payload = {
        "iss": "https://accounts.google.com",
        "sub": sub,
        "aud": GOOGLE_AUDIENCE,
        "email": "learner@example.com",
        "email_verified": True,
        "name": "Learner Google",
    }
    payload.update(overrides)
    return payload


def test_google_login_requires_config(client, monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "google_client_id", "")
    r = client.post(
        "/auth/google",
        json={"id_token": "not-a-real-token-token-token-token", "bridge_langs": ["en", "hi"]},
    )
    assert r.status_code == 501, r.text


def test_google_login_creates_and_is_idempotent(client, monkeypatch):
    from app.config import settings
    from app.routers import auth_router

    monkeypatch.setattr(settings, "google_client_id", GOOGLE_AUDIENCE)
    monkeypatch.setattr(auth_router, "_verify_google_id_token", lambda tok, aud: _token_payload())

    # First login creates a learner bound to the Google sub.
    r1 = client.post(
        "/auth/google",
        json={"id_token": "tok-1-token-token-token", "bridge_langs": ["en", "hi"]},
    )
    assert r1.status_code == 200, r1.text
    body1 = r1.json()
    assert "token" in body1
    assert body1["learner"]["display_name"] == "Learner Google"
    learner_id_1 = body1["learner"]["id"]

    # Same sub logs back in to the SAME learner (not a new row).
    r2 = client.post(
        "/auth/google",
        json={"id_token": "tok-2-token-token-token", "bridge_langs": ["hi"]},
    )
    assert r2.status_code == 200, r2.text
    body2 = r2.json()
    assert body2["learner"]["id"] == learner_id_1, (
        "same Google account must map to the same learner"
    )


def test_google_login_rejects_invalid_token(client, monkeypatch):
    from app.config import settings
    from app.routers import auth_router

    monkeypatch.setattr(settings, "google_client_id", GOOGLE_AUDIENCE)
    monkeypatch.setattr(auth_router, "_verify_google_id_token", lambda tok, aud: None)

    r = client.post(
        "/auth/google",
        json={"id_token": "forged-token-token-token", "bridge_langs": ["en", "hi"]},
    )
    assert r.status_code == 401, r.text


def test_google_login_rejects_missing_sub(client, monkeypatch):
    from app.config import settings
    from app.routers import auth_router

    monkeypatch.setattr(settings, "google_client_id", GOOGLE_AUDIENCE)
    monkeypatch.setattr(
        auth_router,
        "_verify_google_id_token",
        lambda tok, aud: _token_payload(sub=""),
    )

    r = client.post(
        "/auth/google",
        json={"id_token": "tok-token-token-token", "bridge_langs": ["en", "hi"]},
    )
    assert r.status_code == 401, r.text