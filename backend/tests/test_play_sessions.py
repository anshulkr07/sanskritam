"""Play sessions end-to-end: start, actions, finish, allocations, idempotency.

Uses the shared TestClient fixture (real migration path, temp SQLite). Two
learners exercise allocation limits, hint conversion, ranked aggregates and
the daily top-three.
"""

from __future__ import annotations

import uuid


def _login(client, name: str) -> dict:
    r = client.post("/auth/dev-login", json={"display_name": name})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


def _start(client, headers, game, mode="practice", difficulty=None, idem=None, **kw):
    body = {"game": game, "mode": mode, "difficulty": difficulty or {},
            "answer_lang": kw.get("answer_lang", "sa"),
            "idempotency_key": idem or f"test-{uuid.uuid4().hex[:12]}"}
    return client.post("/play/sessions", json=body, headers=headers)


def test_smriti_practice_round_flow(client):
    h = _login(client, "Play Smriti")
    r = _start(client, h, "smriti", difficulty={"pairs": 6, "deck": "word-meaning"})
    assert r.status_code == 200, r.text
    view = r.json()
    assert view["game"] == "smriti"
    assert view["pack"]["pairs"] == 6
    assert "cards" not in view["pack"], "hidden deck must not ship to the client"

    sid = view["id"]
    # reveal card 0 (authorised)
    r = client.post(f"/play/sessions/{sid}/answer", json={"type": "reveal", "card": 0}, headers=h)
    assert r.status_code == 200 and "reveal" in r.json()
    face0 = r.json()["reveal"]
    # reveal card 1
    r = client.post(f"/play/sessions/{sid}/answer", json={"type": "reveal", "card": 1}, headers=h)
    face1 = r.json()["reveal"]
    # commit the attempt
    r = client.post(f"/play/sessions/{sid}/answer",
                    json={"type": "attempt", "a": 0, "b": 1}, headers=h)
    assert r.status_code == 200
    assert r.json()["attempts"] == 1
    matched = r.json()["match"]
    # finish
    r = client.post(f"/play/sessions/{sid}/finish", json={}, headers=h)
    assert r.status_code == 200, r.text
    out = r.json()
    assert out["ranked"] is False
    assert 0 <= out["score"] <= 1000
    assert out["breakdown"]["pairs"] == 6
    # idempotent repeat finish returns the same result
    r2 = client.post(f"/play/sessions/{sid}/finish", json={}, headers=h)
    assert r2.json()["score"] == out["score"] and r2.json()["repeat"] is True


def test_smriti_flip_limit_enforced(client):
    h = _login(client, "Play Flip")
    r = _start(client, h, "smriti", difficulty={"pairs": 6, "deck": "word-meaning"})
    sid = r.json()["id"]
    for c in range(3):
        rr = client.post(f"/play/sessions/{sid}/answer", json={"type": "reveal", "card": c}, headers=h)
    # third distinct open card without settling attempts must be refused
    codes = [rr.status_code for rr in [client.post(
        f"/play/sessions/{sid}/answer", json={"type": "reveal", "card": 3}, headers=h)]]
    assert codes[0] == 429


def test_ranked_allocations_and_top_three(client):
    h = _login(client, "Play Ranked")
    day_header = None
    scores = {}
    for game in ("smriti", "rush", "word-groups"):
        sid = _start(client, h, game, mode="ranked").json()["id"]
        assert sid
        if game == "smriti":
            # finish with a real board: reveal two, attempt, finish
            client.post(f"/play/sessions/{sid}/answer", json={"type": "reveal", "card": 0}, headers=h)
            client.post(f"/play/sessions/{sid}/answer", json={"type": "reveal", "card": 1}, headers=h)
            client.post(f"/play/sessions/{sid}/answer", json={"type": "attempt", "a": 0, "b": 1}, headers=h)
        elif game == "rush":
            view = client.get(f"/play/sessions/{sid}", headers=h).json()
            qs = view["pack"]["questions"]
            for i, q in enumerate(qs[:3]):
                client.post(f"/play/sessions/{sid}/answer",
                            json={"index": i, "choice": q["options"][0], "elapsed_ms": 3000}, headers=h)
        else:
            view = client.get(f"/play/sessions/{sid}", headers=h).json()
            tiles = [t["id"] for t in view["pack"]["tiles"]]
            # submit tile groups by solving order is unknown to the client; a
            # wrong group is fine — it costs points but still validates.
            client.post(f"/play/sessions/{sid}/answer",
                        json={"type": "submit_group", "tiles": tiles[:4]}, headers=h)
        fin = client.post(f"/play/sessions/{sid}/finish", json={}, headers=h)
        assert fin.status_code == 200, fin.text
        scores[game] = fin.json()
    assert scores["smriti"]["ranked"] is True
    total = scores["smriti"]["daily_total"]
    assert total >= 0

    # fourth ranked round for smriti is refused (3 per day)
    r = _start(client, h, "smriti", mode="ranked")
    assert r.status_code in (200, 429)
    # burn remaining allocations
    while r.status_code == 200:
        sid = r.json()["id"]
        client.post(f"/play/sessions/{sid}/abandon", json={}, headers=h)
        r = _start(client, h, "smriti", mode="ranked")
    assert r.status_code == 429
    # practice stays open
    r = _start(client, h, "smriti", mode="practice")
    assert r.status_code == 200


def test_idempotent_start(client):
    h = _login(client, "Play Idem")
    idem = "idem-123"
    r1 = _start(client, h, "smriti", idem=idem)
    r2 = _start(client, h, "smriti", idem=idem)
    assert r1.json()["id"] == r2.json()["id"]


def test_hint_converts_to_practice(client):
    h = _login(client, "Play Hint")
    sid = _start(client, h, "smriti", mode="ranked").json()["id"]
    r = client.post(f"/play/sessions/{sid}/hint", json={}, headers=h)
    assert r.status_code == 200
    assert r.json()["status"] == "practice"
    fin = client.post(f"/play/sessions/{sid}/finish", json={}, headers=h)
    assert fin.json()["ranked"] is False
    assert "practice" in fin.json()["eligibility_reason"]


def test_leaderboard_daily_combined(client):
    h = _login(client, "Play Board")
    # finish one quick ranked rush round with 3 correct answers
    sid = _start(client, h, "rush", mode="ranked").json()["id"]
    view = client.get(f"/play/sessions/{sid}", headers=h).json()
    for i, q in enumerate(view["pack"]["questions"]):
        # find the correct answer index is unknown to us; answer option 0.
        client.post(f"/play/sessions/{sid}/answer",
                    json={"index": i, "choice": q["options"][0], "elapsed_ms": 2000}, headers=h)
    client.post(f"/play/sessions/{sid}/finish", json={}, headers=h)
    r = client.get("/play/leaderboard?period=daily&board=combined&scope=everyone", headers=h)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["board"] == "combined"
    assert "rows" in body and "me" in body
    assert body["period_end"]


def test_summary_and_allocations(client):
    h = _login(client, "Play Summary")
    r = client.get("/play/summary", headers=h)
    assert r.status_code == 200, r.text
    s = r.json()
    assert s["rank_today"]["unranked_yet"] is True
    assert s["rank_today"]["rank"] is None  # nothing fabricated before play
    assert s["goal"]["target"] == 3
    r = client.get("/play/allocations", headers=h)
    assert r.status_code == 200
    allocs = r.json()["games"]
    assert allocs["smriti"]["left"] == 3
    assert allocs["daily-word"]["limit"] == 1


def test_number_session_flow(client):
    h = _login(client, "Play Number")
    r = _start(client, h, "number", mode="ranked", answer_lang="sa")
    assert r.status_code == 200, r.text
    view = r.json()
    prompts = view["pack"]["prompts"]
    assert len(prompts) == 5
    for p in prompts:
        assert "canonical" not in p, "answer key must not ship"
        assert all("dev" in o for s in p["slots"] for o in s["options"])
    # answer prompt 0 with the correct selections via the internal path:
    # (the test reaches into the pack through the service layer for the key)
    from app.db import SessionLocal
    from app.models import GameSession, Learner
    from app.services.numerals.lexicon import get_lexicon
    from app.services.numerals.scoring import score_prompt, NumberKey
    db = SessionLocal()
    try:
        row = db.query(GameSession).filter(GameSession.id == view["id"]).first()
        learner = db.query(Learner).filter(Learner.id == row.learner_id).first()
        assert row is not None
        p0 = row.pack["prompts"][0]
        lex = get_lexicon("sa")
        selections = {}
        for slot in p0["skeleton_key"]:
            kind = slot["kind"]
            if kind == "sign":
                selections[slot["id"]] = "sa:sign:negative"
            elif kind in ("coef", "unit"):
                selections[slot["id"]] = next(e.semantic_id for e in lex.entries_for_context("coef") if e.value == slot["value"])
            elif kind == "scale":
                selections[slot["id"]] = f"sa:scale:{slot['group']}"
            elif kind == "marker":
                selections[slot["id"]] = "sa:marker:decimal"
            elif kind == "digit":
                selections[slot["id"]] = next(e.semantic_id for e in lex.entries_for_context("digit") if e.value == slot["value"])
        # submit through the API: answers never reveal correctness live
        r = client.post(f"/play/sessions/{view['id']}/answer",
                        json={"index": 0, "selections": selections}, headers=h)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["score"] == 100
        assert body["reading"]
        # locked: resubmission returns the stored result
        r2 = client.post(f"/play/sessions/{view['id']}/answer",
                         json={"index": 0, "selections": selections}, headers=h)
        assert r2.json().get("already") is True
        fin = client.post(f"/play/sessions/{view['id']}/finish", json={}, headers=h)
        assert fin.status_code == 200
        # one correct prompt of five: mean = 100/5 = 20, roundScore = 10 x 20
        assert fin.json()["score"] == 200
    finally:
        db.close()
