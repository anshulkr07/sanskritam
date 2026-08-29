"""Health, auth, and learner model endpoints."""

from tests.conftest import _TMPDIR  # noqa: F401  (ensures env set before imports)


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert "version" in body


def test_dev_login(client):
    r = client.post("/auth/dev-login", json={"display_name": "alice", "bridge_langs": ["en", "hi"]})
    assert r.status_code == 200
    body = r.json()
    assert "token" in body
    learner = body["learner"]
    assert learner["display_name"] == "alice"
    assert learner["bridge_langs"] == ["en", "hi"]
    assert 0.0 <= learner["sanskrit_ratio"] <= 1.0
    assert 0.0 <= learner["script_ratio"] <= 1.0


def test_me_requires_auth(client):
    r = client.get("/me")
    assert r.status_code == 401


def test_me_roundtrip(client, auth_headers):
    r = client.get("/me", headers=auth_headers)
    assert r.status_code == 200
    body = r.json()
    assert "model" in body or "sanskrit_ratio" in body or "learner" in body


def test_bad_token_rejected(client):
    r = client.get("/me", headers={"Authorization": "Bearer bogus-token"})
    assert r.status_code == 401
