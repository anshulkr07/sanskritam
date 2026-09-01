"""Tests for anonymous login (P1-1).

Backend-only tests — mobile changes are verified via typecheck.
"""

import uuid

from fastapi.testclient import TestClient

from app.main import create_app


# ─── P1-1: Anonymous login ─────────────────────────────

def test_anon_login_returns_token(client):
    """Anonymous login returns a token and learner."""
    install_id = uuid.uuid4().hex[:32]
    r = client.post("/auth/anonymous", json={
        "install_id": install_id,
        "bridge_langs": ["en"]
    })
    assert r.status_code == 200, r.text
    data = r.json()
    assert "token" in data
    assert data["learner"]["display_name"] == f"Learner_{install_id[:8]}"
    assert data["learner"]["bridge_langs"] == ["en"]


def test_same_install_id_returns_same_learner(client):
    """Same install_id returns the same learner."""
    install_id = uuid.uuid4().hex[:32]

    r1 = client.post("/auth/anonymous", json={"install_id": install_id})
    assert r1.status_code == 200
    id1 = r1.json()["learner"]["id"]

    r2 = client.post("/auth/anonymous", json={"install_id": install_id})
    assert r2.status_code == 200
    id2 = r2.json()["learner"]["id"]

    assert id1 == id2, f"Same install_id should return same learner, got {id1} != {id2}"


def test_different_install_ids_produce_different_learners(client):
    """Different install_ids produce different learners."""
    install_id_a = uuid.uuid4().hex[:32]
    install_id_b = uuid.uuid4().hex[:32]

    r1 = client.post("/auth/anonymous", json={"install_id": install_id_a})
    assert r1.status_code == 200
    id_a = r1.json()["learner"]["id"]

    r2 = client.post("/auth/anonymous", json={"install_id": install_id_b})
    assert r2.status_code == 200
    id_b = r2.json()["learner"]["id"]

    assert id_a != id_b, "Different install_ids should produce different learners"


def test_anon_login_with_display_name(client):
    """Anonymous login accepts optional display_name."""
    install_id = uuid.uuid4().hex[:32]
    r = client.post("/auth/anonymous", json={
        "install_id": install_id,
        "display_name": "My Display Name",
    })
    assert r.status_code == 200, r.text
    assert r.json()["learner"]["display_name"] == "My Display Name"


def test_anon_login_token_works(client):
    """Token from anon login works for authenticated requests."""
    install_id = uuid.uuid4().hex[:32]
    r = client.post("/auth/anonymous", json={"install_id": install_id})
    assert r.status_code == 200
    token = r.json()["token"]

    r2 = client.get("/me", headers={"Authorization": f"Bearer {token}"})
    assert r2.status_code == 200, "Token from anon login should work"