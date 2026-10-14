"""Exercise actual two-player moves, snapshots, sockets, results and rematches."""
import json
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta

import anyio
import pytest

from app.db import SessionLocal
from app.models import LiveMatch, MatchQueueEntry
from app.services.play import matches as M


def login(client):
    r = client.post("/auth/dev-login", json={"display_name": f"Live-{uuid.uuid4().hex[:12]}"})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


def snapshot(client, mid, auth):
    r = client.get(f"/play/matches/{mid}", headers=auth)
    assert r.status_code == 200, r.text
    return r.json()


def action(client, mid, auth, move, idem=None):
    r = client.post(f"/play/matches/{mid}/actions", headers=auth,
                    json={"action": move, "idem": idem or uuid.uuid4().hex})
    assert r.status_code == 200, r.text
    return r.json()


def active_room(client, game, config=None, kind="private"):
    a, b = login(client), login(client)
    if kind == "quick":
        assert client.post("/play/matches/queue", headers=a, json={"game": game}).json()["matched"] is False
        paired = client.post("/play/matches/queue", headers=b, json={"game": game}).json()
        assert paired["matched"]
        room = snapshot(client, paired["match_id"], a)
        assert client.get("/play/matches/queue", headers=a).json()["match_id"] == paired["match_id"]
        assert client.get("/play/matches/queue", headers=b).json()["match_id"] == paired["match_id"]
        assert client.post(f"/play/matches/rooms/{room['match_id']}/config", headers=a,
                           json={"config": config or {}}).status_code == 200
    else:
        r = client.post("/play/matches/rooms", headers=a, json={"game": game, "config": config or {}})
        assert r.status_code == 200, r.text
        room = r.json()
    mid = room["match_id"]
    if kind == "private":
        assert client.post("/play/matches/rooms/join", headers=b, json={"code": room["code"]}).status_code == 200
    assert client.post(f"/play/matches/rooms/{mid}/ready", headers=b, json={"ready": True}).status_code == 200
    assert client.post(f"/play/matches/rooms/{mid}/start", headers=b, json={}).status_code == 403
    assert client.post(f"/play/matches/rooms/{mid}/start", headers=a, json={}).status_code == 200
    with SessionLocal() as db:
        m = db.get(LiveMatch, mid)
        m.round_deadline = M._now() - timedelta(seconds=1)
        db.commit()
    s = snapshot(client, mid, a)
    assert s["status"] == "active" and s["pack"]
    assert s["pack"] == snapshot(client, mid, b)["pack"]
    return mid, a, b


def pack_for(mid):
    with SessionLocal() as db:
        m = db.get(LiveMatch, mid)
        return next(iter(m.state["players"].values()))["pack"]


def moves(game, pack):
    if game == "smriti":
        pairs = {}
        for i, card in enumerate(pack["cards"]):
            pairs.setdefault(card["pair"], []).append(i)
        for a, b in pairs.values():
            yield {"type": "reveal", "card": a}
            yield {"type": "reveal", "card": b}
            yield {"type": "attempt", "a": a, "b": b}
    elif game == "rush":
        for q in pack["questions"]:
            yield {"index": q["index"], "choice": q["correct_value"], "elapsed_ms": 100}
    elif game == "varna-jaal":
        for word in pack["words"]:
            yield {"cells": pack["paths"][word["id"]]}
    elif game == "word-groups":
        groups = {}
        for tid, key in pack["key"].items():
            groups.setdefault(key["group"], []).append(tid)
        for tiles in groups.values():
            yield {"type": "submit_group", "tiles": tiles}
    elif game == "pada-path":
        for p in pack["prompts"]:
            order = p["canonical_order"] if p["type"] == "quotation" else p["accepted_orders"][0]
            yield {"index": p["index"], "order": order}
    elif game == "number":
        for p in pack["prompts"]:
            yield {"index": p["index"], "selections": {
                slot["id"]: slot["options"][0]["semantic_id"] for slot in p["slots"]}}


@pytest.mark.parametrize("game,config", [
    ("smriti", {"pairs": 2}), ("rush", {"questions": 2}),
    ("varna-jaal", {"words": 2}), ("word-groups", {"tiles": 16}),
    ("pada-path", {"prompts": 2}), ("number", {"prompts": 5}),
])
@pytest.mark.parametrize("kind", ["private", "quick"])
def test_two_players_complete_and_rematch(client, game, config, kind):
    mid, a, b = active_room(client, game, config, kind)
    pack = pack_for(mid)
    for auth in (a, b):
        for move in moves(game, pack):
            idem = uuid.uuid4().hex
            ack = action(client, mid, auth, move, idem)
            # Lost HTTP responses can be replayed even after completion.
            assert action(client, mid, auth, move, idem) == ack
        s = snapshot(client, mid, auth)
        assert s["own_done"] is True
        if auth == a:
            assert s["status"] == "active"
            assert snapshot(client, mid, b)["own_done"] is False
    s = snapshot(client, mid, a)
    assert s["status"] == "results"
    assert s["result"] == snapshot(client, mid, b)["result"]
    assert len(s["result"]["standings"]) == 2
    if game in ("smriti", "word-groups"):
        assert all(p["score"] == 1000 for p in s["result"]["standings"])
    r = client.post(f"/play/matches/rooms/{mid}/rematch", headers=a, json={})
    assert r.json() == {"votes_pending": True}
    assert snapshot(client, mid, a)["rematch_voted"] is True
    assert snapshot(client, mid, b)["rematch_voted"] is False
    r = client.post(f"/play/matches/rooms/{mid}/rematch", headers=b, json={})
    assert r.status_code == 200 and r.json()["rematch"]
    new_mid = r.json()["rematch"]
    assert snapshot(client, mid, a)["rematch_id"] == new_mid
    assert client.post(f"/play/matches/rooms/{mid}/rematch", headers=a, json={}).json()["rematch"] == new_mid
    for auth in (a, b):
        new = snapshot(client, new_mid, auth)
        assert new["status"] == "lobby" and len(new["players"]) == 2
        assert new["own_done"] is False and all(p["ready"] for p in new["players"])


def test_concurrent_players_keep_both_progress(client):
    mid, a, b = active_room(client, "rush", {"questions": 2})
    move = next(moves("rush", pack_for(mid)))
    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(lambda auth: action(client, mid, auth, move), (a, b)))
    assert all(r["correct"] for r in results)
    for auth in (a, b):
        s = snapshot(client, mid, auth)
        assert len(s["own_state"]["answers"]) == 1
        assert all(p["progress"]["answered"] == 1 for p in s["players"])
        assert all(0 < p["score"] < 1000 for p in s["players"])


def test_resume_reveals_are_private(client):
    mid, a, b = active_room(client, "smriti", {"pairs": 2})
    move = next(moves("smriti", pack_for(mid)))
    ack = action(client, mid, a, move)
    mine = snapshot(client, mid, a)
    theirs = snapshot(client, mid, b)
    assert mine["own_state"]["faces"][str(move["card"])] == ack["reveal"]
    assert theirs["own_state"]["faces"] == {}
    assert all("faces" not in p["progress"] for p in theirs["players"])
    assert "cards" not in mine["pack"]


def test_quick_match_both_players_and_poll_widening(client):
    a, b = login(client), login(client)
    payload = {"game": "rush", "band": "beginner", "answer_lang": "en"}
    assert client.post("/play/matches/queue", headers=a, json=payload).json()["matched"] is False
    assert client.post("/play/matches/queue", headers=b, json={**payload, "band": "advanced"}).json()["matched"] is False
    with SessionLocal() as db:
        for entry in db.query(MatchQueueEntry).filter(MatchQueueEntry.status == "waiting",
                                                     MatchQueueEntry.answer_lang == "en").all():
            entry.enqueued_at = M._now() - timedelta(seconds=16)
        db.commit()
    ra = client.get("/play/matches/queue", headers=a).json()
    rb = client.get("/play/matches/queue", headers=b).json()
    assert ra["matched"] and rb["matched"] and ra["match_id"] == rb["match_id"]
    mid = ra["match_id"]
    for auth in (a, b):
        assert snapshot(client, mid, auth)["kind"] == "quick"
    client.post(f"/play/matches/rooms/{mid}/leave", headers=a, json={})
    assert client.get("/play/matches/queue", headers=a).json()["matched"] is False


def test_word_groups_failure_completes_and_deadline_resolves(client):
    mid, a, b = active_room(client, "word-groups", {"tiles": 16})
    pack = pack_for(mid)
    groups = list(moves("word-groups", pack))
    mixed = groups[0]["tiles"][:2] + groups[1]["tiles"][:2]
    for _ in range(4):
        ack = action(client, mid, a, {"type": "submit_group", "tiles": mixed})
    assert ack["over"] and snapshot(client, mid, a)["own_done"]
    assert snapshot(client, mid, b)["status"] == "active"
    with SessionLocal() as db:
        db.get(LiveMatch, mid).round_deadline = M._now() - timedelta(seconds=3)
        db.commit()
    assert snapshot(client, mid, b)["status"] == "results"


def test_cancel_after_pairing_does_not_leave_a_ghost_player(client):
    a, b = login(client), login(client)
    client.post("/play/matches/queue", headers=a, json={"game": "number"})
    paired = client.post("/play/matches/queue", headers=b, json={"game": "number"}).json()
    assert paired["matched"]
    assert client.post("/play/matches/queue/cancel", headers=b, json={}).status_code == 200
    s = snapshot(client, paired["match_id"], a)
    assert len(s["players"]) == 1 and s["players"][0]["is_host"]
    assert client.get("/play/matches/queue", headers=b).json()["matched"] is False


def test_number_boards_use_only_the_match_seed(monkeypatch):
    import random
    from app.services.play import packs
    monkeypatch.setattr(random, "random", lambda: 0.01)
    first = packs.number_pack(prompts=5, seed="same-board", answer_lang="sa", band="ranked")
    monkeypatch.setattr(random, "random", lambda: 0.99)
    second = packs.number_pack(prompts=5, seed="same-board", answer_lang="sa", band="ranked")
    assert first == second


def test_host_transfer_and_midround_forfeit(client):
    a, b = login(client), login(client)
    room = client.post("/play/matches/rooms", headers=a, json={"game": "rush", "config": {"questions": 2}}).json()
    mid = room["match_id"]
    joined = client.post("/play/matches/rooms/join", headers=b, json={"code": room["code"]}).json()
    guest = next(p["learner_id"] for p in joined["players"] if not p["is_host"])
    assert client.post(f"/play/matches/rooms/{mid}/leave", headers=a, json={}).status_code == 200
    assert snapshot(client, mid, b)["host"] == guest
    # Former host can rejoin as a guest; transferred host keeps start rights.
    client.post("/play/matches/rooms/join", headers=a, json={"code": room["code"]})
    for auth in (a, b):
        client.post(f"/play/matches/rooms/{mid}/ready", headers=auth, json={"ready": True})
    assert client.post(f"/play/matches/rooms/{mid}/start", headers=b, json={}).status_code == 200
    with SessionLocal() as db:
        db.get(LiveMatch, mid).round_deadline = M._now()
        db.commit()
    snapshot(client, mid, b)
    client.post(f"/play/matches/rooms/{mid}/leave", headers=a, json={})
    for move in moves("rush", pack_for(mid)):
        action(client, mid, b, move)
    s = snapshot(client, mid, b)
    assert s["status"] == "results"
    assert next(p for p in s["result"]["standings"] if p["forfeited"])["score"] == 0


def receive_type(ws, kind):
    async def receive():
        with anyio.fail_after(8):
            return await ws._send_rx.receive()
    for _ in range(100):
        raw = ws.portal.call(receive)
        assert raw["type"] == "websocket.send", raw
        event = json.loads(raw["text"])
        if event["type"] == kind:
            return event
    pytest.fail(f"Did not receive {kind}")


def test_two_real_sockets_results_rematch_and_reconnect(client, monkeypatch):
    from app.routers import matches as router
    monkeypatch.setattr(router, "POLL_SECONDS", 0.03)
    mid, a, b = active_room(client, "rush", {"questions": 2})
    tickets = [client.get(f"/play/matches/{mid}/ticket", headers=h).json()["ticket"] for h in (a, b)]
    with client.websocket_connect(f"/ws/matches/{tickets[0]}") as wa:
        assert receive_type(wa, "snapshot")["payload"]["match_id"] == mid
        with client.websocket_connect(f"/ws/matches/{tickets[1]}") as wb:
            assert receive_type(wb, "snapshot")["payload"]["status"] == "active"
            pack = pack_for(mid)
            first, second = list(moves("rush", pack))
            wa.send_json({"type": "action", "action": first, "idem": "ws-first"})
            assert receive_type(wa, "ack")["payload"]["correct"]
            progress = receive_type(wb, "progress")["payload"]
            assert progress["public"]["answered"] == 1 and "choice" not in progress
            action(client, mid, a, second)
            for move in (first, second):
                action(client, mid, b, move)
            assert receive_type(wa, "results")["payload"] == receive_type(wb, "results")["payload"]
            client.post(f"/play/matches/rooms/{mid}/rematch", headers=a, json={})
            r = client.post(f"/play/matches/rooms/{mid}/rematch", headers=b, json={}).json()
            assert receive_type(wa, "rematch")["payload"]["match_id"] == r["rematch"]
            assert receive_type(wb, "rematch")["payload"]["match_id"] == r["rematch"]
    ticket = client.get(f"/play/matches/{r['rematch']}/ticket", headers=a).json()["ticket"]
    with client.websocket_connect(f"/ws/matches/{ticket}") as resumed:
        s = receive_type(resumed, "snapshot")["payload"]
        assert s["status"] == "lobby" and all(p["ready"] for p in s["players"])
