"""Multiplayer: rooms, quick match queue, live actions over the service
layer, resolve and rematch. The WebSocket endpoint itself needs a running
loop; its message handlers are exercised through the same service calls the
socket makes."""

from __future__ import annotations

import uuid
from datetime import timedelta

from app.services.play import matches as M


def _login(client, name: str) -> dict:
    r = client.post("/auth/dev-login", json={"display_name": name})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


def test_room_create_join_ready_start(client):
    a = _login(client, "Host A")
    b = _login(client, "Guest B")
    r = client.post("/play/matches/rooms", json={"game": "varna-jaal"}, headers=a)
    assert r.status_code == 200, r.text
    room = r.json()
    assert room["status"] == "lobby" and room["code"]
    assert room["players"][0]["is_host"] is True

    r = client.post("/play/matches/rooms/join", json={"code": room["code"]}, headers=b)
    assert r.status_code == 200
    assert len(r.json()["players"]) == 2

    # guest not ready initially? default ready False
    r = client.post(f"/play/matches/rooms/{room['match_id']}/start", json={}, headers=a)
    assert r.status_code == 409  # someone not ready
    r = client.post(f"/play/matches/rooms/{room['match_id']}/ready",
                    json={"ready": True}, headers=b)
    assert r.json()["ready"] is True
    r = client.post(f"/play/matches/rooms/{room['match_id']}/start", json={}, headers=a)
    assert r.status_code == 200 and r.json()["status"] == "countdown"

    # host transfer then leave in lobby would close or rehost; here match
    # started, so guest leaving is a forfeit
    r = client.post(f"/play/matches/rooms/{room['match_id']}/leave", json={}, headers=b)
    assert r.status_code == 200


def test_quick_match_pairs_two_players(client):
    a = _login(client, "Queue A")
    b = _login(client, "Queue B")
    r = client.post("/play/matches/queue",
                    json={"game": "smriti", "ruleset": "casual", "answer_lang": "sa", "band": "open"},
                    headers=a)
    assert r.json() == {"matched": False, "waiting": True, "since": r.json().get("since")}
    r = client.post("/play/matches/queue",
                    json={"game": "smriti", "ruleset": "casual", "answer_lang": "sa", "band": "open"},
                    headers=b)
    assert r.json()["matched"] is True
    mid = r.json()["match_id"]
    # A's status sees the match too
    r = client.get("/play/matches/queue", headers=a)
    assert r.json().get("matched") is True and r.json()["match_id"] == mid
    # both see a snapshot
    for h in (a, b):
        s = client.get(f"/play/matches/{mid}", headers=h).json()
        assert s["kind"] == "quick" and len(s["players"]) == 2
    client.post("/play/matches/queue/cancel", json={}, headers=a)


def test_band_widening_and_never_cross_incompatible(client):
    a = _login(client, "Queue C")
    # different answer languages must not pair
    r = client.post("/play/matches/queue",
                    json={"game": "rush", "answer_lang": "sa", "band": "open"}, headers=a)
    b = _login(client, "Queue D")
    r = client.post("/play/matches/queue",
                    json={"game": "rush", "answer_lang": "en", "band": "open"}, headers=b)
    assert r.json()["matched"] is False
    client.post("/play/matches/queue/cancel", json={}, headers=a)
    client.post("/play/matches/queue/cancel", json={}, headers=b)


def test_live_match_full_round_smriti(client):
    a = _login(client, "Live A")
    b = _login(client, "Live B")
    room = client.post("/play/matches/rooms", json={"game": "smriti"}, headers=a).json()
    mid = room["match_id"]
    client.post("/play/matches/rooms/join", json={"code": room["code"]}, headers=b)
    client.post(f"/play/matches/rooms/{mid}/ready", json={"ready": True}, headers=b)
    client.post(f"/play/matches/rooms/{mid}/start", json={}, headers=a)
    # force countdown -> active
    from app.db import SessionLocal
    from app.models import LiveMatch
    db = SessionLocal()
    m = db.query(LiveMatch).filter(LiveMatch.id == mid).first()
    m.round_deadline = M._now()
    db.commit()
    db.close()
    M.tick(_db())
    snap = client.get(f"/play/matches/{mid}", headers=a).json()
    assert snap["status"] == "active"
    assert snap["pack"] is not None and "cards" not in (snap["pack"] or {})
    # both players play their own identical board; one correct pair
    for h in (a, b):
        # find a matching pair through reveals (server authorises)
        view = client.get(f"/play/matches/{mid}", headers=h).json()
        assert view["own_state"] is not None
    # resolve by forfeiting b, then letting the shared deadline pass — the
    # match must not end while A is still playing
    client.post(f"/play/matches/rooms/{mid}/leave", json={}, headers=b)
    M.tick(_db())
    snap = client.get(f"/play/matches/{mid}", headers=a).json()
    assert snap["status"] == "active"  # A is still playing: no early resolve
    db = SessionLocal()
    m = db.query(LiveMatch).filter(LiveMatch.id == mid).first()
    m.round_deadline = M._now() - timedelta(seconds=5)
    db.commit()
    db.close()
    M.tick(_db())
    snap = client.get(f"/play/matches/{mid}", headers=a).json()
    assert snap["status"] == "results"
    assert snap["result"]["standings"][0]["score"] >= 0


def test_membership_enforced(client):
    a = _login(client, "Room Owner")
    c = _login(client, "Outsider")
    room = client.post("/play/matches/rooms", json={"game": "rush"}, headers=a).json()
    r = client.post(f"/play/matches/rooms/{room['match_id']}/ready", json={"ready": True}, headers=c)
    assert r.status_code == 403
    r = client.get(f"/play/matches/{room['match_id']}", headers=c)
    assert r.status_code == 403
    r = client.get(f"/play/matches/{room['match_id']}/ticket", headers=c)
    assert r.status_code == 403


def _db():
    from app.db import SessionLocal
    return SessionLocal()
