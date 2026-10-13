"""Share links: opaque codes, scoped payloads, revoke, expiry, attribution."""

from __future__ import annotations


def _login(client, name: str) -> dict:
    r = client.post("/auth/dev-login", json={"display_name": name})
    return {"Authorization": f"Bearer {r.json()['token']}"}


def test_share_link_payload_whitelist_and_resolve(client):
    h = _login(client, "Share A")
    r = client.post("/share/links", json={
        "kind": "result", "ttl": "achievement",
        "payload": {"title": "Smriti", "score": 870, "token": "SECRET", "learner_id": "x"},
    }, headers=h)
    assert r.status_code == 200
    code = r.json()["code"]
    # public resolve: whitelisted fields only — no token, no ids
    pub = client.get(f"/share/links/{code}")
    assert pub.status_code == 200
    p = pub.json()["payload"]
    assert p["score"] == 870
    assert "token" not in p and "learner_id" not in p
    # resolve counted an opened event
    from app.db import SessionLocal
    from app.models import LinkEvent
    db = SessionLocal()
    n = db.query(LinkEvent).filter(LinkEvent.code == code, LinkEvent.event == "opened").count()
    db.close()
    assert n >= 1


def test_share_link_revoke(client):
    h = _login(client, "Share B")
    other = _login(client, "Share C")
    code = client.post("/share/links", json={"kind": "rank", "payload": {"rank": 3}},
                       headers=h).json()["code"]
    # someone else cannot revoke it
    r = client.post("/share/links/revoke", json={"code": code}, headers=other)
    assert r.status_code == 404
    r = client.post("/share/links/revoke", json={"code": code}, headers=h)
    assert r.json()["revoked"] is True
    assert client.get(f"/share/links/{code}").status_code == 404


def test_attribution_events_validated(client):
    h = _login(client, "Share D")
    r = client.post("/share/events", json={"event": "sample_started", "code": "abc"}, headers=h)
    assert r.json()["ok"] is True
    r = client.post("/share/events", json={"event": "not_a_real_event"}, headers=h)
    assert r.status_code == 422


def test_app_link_statement_files(client):
    r = client.get("/share/.well-known/assetlinks.json")
    assert r.status_code == 200
    # with no configured fingerprint the statement asserts nothing (never fake)
    assert r.json() == []
    r = client.get("/share/.well-known/apple-app-site-association")
    assert r.status_code == 200
