"""API-level tests: challenge selection, register isolation, adaptive model."""

import uuid


def _login(client, name):
    r = client.post("/auth/dev-login", json={"display_name": name, "bridge_langs": ["en", "hi"]})
    assert r.status_code == 200
    return {"Authorization": f"Bearer {r.json()['token']}"}


def test_challenges_next_requires_auth(client):
    r = client.get("/challenges/next")
    assert r.status_code == 401


def test_next_challenge_shape(client):
    h = _login(client, "sel1")
    r = client.get("/challenges/next", params={"register": "laukika", "mode": "text"}, headers=h)
    assert r.status_code == 200
    ch = r.json()
    assert ch["register"] == "laukika"
    assert ch["prompt_l1"]
    assert ch["target_sanskrit"]
    assert isinstance(ch["features"], list)


def test_register_isolation_never_crosses(client):
    """A laukika request must NEVER return a classical challenge (spec §5)."""
    h = _login(client, "regiso")
    for _ in range(25):
        r = client.get("/challenges/next", params={"register": "laukika", "mode": "text"}, headers=h)
        assert r.status_code == 200
        assert r.json()["register"] == "laukika"


def test_classical_register_returns_classical(client):
    h = _login(client, "regc")
    r = client.get("/challenges/next", params={"register": "classical", "mode": "text"}, headers=h)
    assert r.status_code == 200
    assert r.json()["register"] == "classical"


def test_invalid_register_rejected(client):
    h = _login(client, "regbad")
    r = client.get("/challenges/next", params={"register": "epic", "mode": "text"}, headers=h)
    assert r.status_code == 422


def test_selection_never_repeats_last_n(client):
    """Selection engine must not serve the same challenge back-to-back."""
    h = _login(client, "norepeat")
    ids = []
    for _ in range(12):
        r = client.get("/challenges/next", params={"register": "laukika", "mode": "text"}, headers=h)
        ids.append(r.json()["id"])
    pairs = list(zip(ids, ids[1:]))
    repeats = [p for p in pairs if p[0] == p[1]]
    assert not repeats, f"back-to-back repeats: {repeats}"


def test_correct_attempt_updates_ratio_and_mastery(client):
    h = _login(client, "adapt")
    # Get a challenge and its target (dev convenience: admin view has target)
    r = client.get("/challenges/next", params={"register": "laukika", "mode": "text"}, headers=h)
    ch = r.json()
    # Peek the answer via admin list
    r2 = client.get("/admin/challenges", headers={"X-Admin-Token": "test-admin"})
    targets = {c["id"]: c for c in r2.json()} if isinstance(r2.json(), list) else {}
    # Fall back to grading the exact target text (from the challenge in play mode it's hidden,
    # so use admin endpoint; if unavailable, submit a known-correct per seed)
    target = None
    if ch["id"] in targets:
        target = targets[ch["id"]].get("target_sanskrit")
    if not target:
        #已知 seed: रामः फलम् खादति। — find any challenge via repeated pulls
        target = "रामः फलम् खादति"
    r3 = client.post("/attempts", json={"challenge_id": ch["id"], "response_text": target.rstrip("।.")}, headers=h)
    assert r3.status_code == 200
    body = r3.json()
    assert "updated_model" in body
    um = body["updated_model"]
    assert 0.0 <= um["sanskrit_ratio"] <= 1.0
    assert isinstance(um["feature_mastery"], dict)


def test_attempt_unknown_challenge_404(client):
    h = _login(client, "nf")
    r = client.post("/attempts", json={"challenge_id": "nonexistent", "response_text": "x"}, headers=h)
    assert r.status_code == 404


def test_patch_me_script_ratio(client):
    h = _login(client, "patchme")
    r = client.get("/me", headers=h)
    body = r.json()
    payload = {"script_ratio": 0.8}
    r2 = client.patch("/me", json=payload, headers=h)
    assert r2.status_code == 200, r2.text
