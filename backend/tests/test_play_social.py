"""Friends, blocking, and the weekly cooperative friend goal."""

from __future__ import annotations


def _login(client, name: str) -> dict:
    r = client.post("/auth/dev-login", json={"display_name": name})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


def _me(client, h) -> str:
    return client.get("/me", headers=h).json()["learner"]["id"]


def test_friend_request_accept_flow(client):
    a = _login(client, "Friend A")
    b = _login(client, "Friend B")
    b_id = _me(client, b)
    r = client.post("/social/friends/request", json={"learner_id": b_id}, headers=a)
    assert r.json()["status"] == "pending"
    lst = client.get("/social/friends", headers=b).json()
    assert len(lst["requests"]) == 1
    r = client.post("/social/friends/respond",
                    json={"learner_id": _me(client, a), "accept": True}, headers=b)
    assert r.json()["status"] == "accepted"
    for h in (a, b):
        lst = client.get("/social/friends", headers=h).json()
        assert len(lst["friends"]) == 1 and not lst["requests"]


def test_player_card_shows_the_standing(client):
    from app.db import SessionLocal
    from app.models import Learner

    a = _login(client, "Card A")
    b = _login(client, "Card B")
    c = _login(client, "Card C")
    a_id, b_id, c_id = _me(client, a), _me(client, b), _me(client, c)

    card = client.get(f"/social/players/{b_id}", headers=a).json()
    assert card["name"] == "Card B" and card["relationship"] == "none"
    assert card["avatar_url"] is None                    # no picture set

    client.post("/social/friends/request", json={"learner_id": b_id}, headers=a)
    assert client.get(f"/social/players/{b_id}", headers=a).json()["relationship"] == "outgoing"
    assert client.get(f"/social/players/{a_id}", headers=b).json()["relationship"] == "incoming"

    client.post("/social/friends/respond", json={"learner_id": a_id, "accept": True}, headers=b)
    assert client.get(f"/social/players/{b_id}", headers=a).json()["relationship"] == "friends"
    assert client.get(f"/social/players/{a_id}", headers=a).json()["relationship"] == "self"

    client.post(f"/social/friends/{c_id}/block", json={"reason": "test"}, headers=a)
    assert client.get(f"/social/players/{c_id}", headers=a).json()["relationship"] == "blocked"
    # the blocked one sees it from their side too, with no action to take
    assert client.get(f"/social/players/{a_id}", headers=c).json()["relationship"] == "blocked"

    assert client.get("/social/players/nobody", headers=a).status_code == 404

    db = SessionLocal()
    try:
        row = db.query(Learner).filter(Learner.id == b_id).first()
        row.avatar_key = f"{b_id}/abcd1234"
        db.commit()
    finally:
        db.close()
    card = client.get(f"/social/players/{b_id}", headers=a).json()
    assert card["avatar_url"].endswith("/people/{}/photo/abcd1234".format(b_id))


def test_block_removes_friendship(client):
    a = _login(client, "Friend C")
    b = _login(client, "Friend D")
    a_id, b_id = _me(client, a), _me(client, b)
    client.post("/social/friends/request", json={"learner_id": b_id}, headers=a)
    client.post("/social/friends/respond", json={"learner_id": a_id, "accept": True}, headers=b)
    r = client.post(f"/social/friends/{b_id}/block", json={"reason": "test"}, headers=a)
    assert r.json()["blocked"] is True
    assert client.get("/social/friends", headers=a).json()["friends"] == []
    # blocked: a new request is refused
    r = client.post("/social/friends/request", json={"learner_id": b_id}, headers=a)
    assert r.status_code == 403


def test_weekly_goal_optin_progress_completion(client, monkeypatch):
    from app.services.play import social as social_svc
    a = _login(client, "Goal A")
    b = _login(client, "Goal B")
    a_id, b_id = _me(client, a), _me(client, b)
    client.post("/social/friends/request", json={"learner_id": b_id}, headers=a)
    client.post("/social/friends/respond", json={"learner_id": a_id, "accept": True}, headers=b)
    # before opting in there is no goal
    assert client.get("/social/friend-goal", headers=a).json()["goal"] is None
    r = client.post("/social/friend-goal/join", json={"partner_id": b_id}, headers=a)
    g = r.json()
    assert g["target"] == 20 and g["min_each"] == 5 and g["max_per_day"] == 5
    # a non-friend cannot opt in with someone else
    c = _login(client, "Goal C")
    r = client.post("/social/friend-goal/join", json={"partner_id": b_id}, headers=c)
    assert r.status_code == 409
    # lift the daily cap for this test so 16+5 credits land in one day
    monkeypatch.setattr(social_svc, "GOAL_MAX_PER_PERSON_DAY", 99)
    for i in range(16):
        client.post("/social/friend-goal/credit",
                    json={"session_ref": f"s-a-{i}"}, headers=a)
    for i in range(4):
        client.post("/social/friend-goal/credit",
                    json={"session_ref": f"s-b-{i}"}, headers=b)
    g = client.get("/social/friend-goal", headers=a).json()["goal"]
    assert g["total"] == 20 and g["mine"] == 16 and g["partner_rounds"] == 4
    assert g["status"] == "active"  # B has fewer than five
    client.post("/social/friend-goal/credit", json={"session_ref": "s-b-4"}, headers=b)
    g = client.get("/social/friend-goal", headers=a).json()["goal"]
    # 16 + 5 = 21 total; completion fired when B reached the five minimum
    assert g["status"] == "completed" and g["total"] == 21
    # the reward badge was granted to both
    from app.db import SessionLocal
    from app.models import CosmeticGrant
    db = SessionLocal()
    grants = db.query(CosmeticGrant).filter(CosmeticGrant.item_key == "badgefriendgoal").all()
    assert len(grants) == 2
    db.close()
    # idempotent per round ref: re-crediting the same session changes nothing
    client.post("/social/friend-goal/credit", json={"session_ref": "s-b-4"}, headers=b)
    g = client.get("/social/friend-goal", headers=a).json()["goal"]
    assert g["total"] == 21


def test_weekly_goal_daily_cap(client):
    a = _login(client, "Cap A")
    b = _login(client, "Cap B")
    a_id, b_id = _me(client, a), _me(client, b)
    client.post("/social/friends/request", json={"learner_id": b_id}, headers=a)
    client.post("/social/friends/respond", json={"learner_id": a_id, "accept": True}, headers=b)
    client.post("/social/friend-goal/join", json={"partner_id": b_id}, headers=a)
    for i in range(8):  # more than the five-per-person cap
        client.post("/social/friend-goal/credit",
                    json={"session_ref": f"cap-a-{i}"}, headers=a)
    g = client.get("/social/friend-goal", headers=a).json()["goal"]
    assert g["mine"] == 5  # capped at five per person per day
