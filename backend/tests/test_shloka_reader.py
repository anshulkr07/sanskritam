"""Tests for GET /shlokas — the reader corpus list (UI_HANDOVER U13, HANDOVER P21-1).

The reader list must: require auth, return every seeded verse in deterministic
date order, carry the word_breakdown instrumentation on each row, and cost
nothing/leak nothing. It never drives TTS or an LLM (P21: reading is not metered).
"""


def _login(client, name: str = "reader-tester"):
    r = client.post("/auth/dev-login", json={"display_name": name, "bridge_langs": ["en", "hi"]})
    assert r.status_code == 200
    data = r.json()
    return {"Authorization": f"Bearer {data['token']}"}, data["learner"]["id"]


def test_list_requires_auth(client):
    r = client.get("/shlokas")
    assert r.status_code == 401


def test_list_returns_all_shlokas_in_date_order(client):
    headers, _ = _login(client, "reader-list")
    r = client.get("/shlokas", headers=headers)
    assert r.status_code == 200
    body = r.json()
    assert isinstance(body, list)
    assert len(body) >= 1
    # Deterministic ascending-date order for the reader scroll.
    dates = [item["date"] for item in body]
    assert dates == sorted(dates)
    # Every row is a real verse (non-empty text).
    for item in body:
        assert item["devanagari"].strip()
        assert item["source_ref"]


def test_list_carries_word_breakdown_instrumentation(client):
    headers, _ = _login(client, "reader-inst")
    r = client.get("/shlokas", headers=headers)
    body = r.json()
    with_breakdown = [i for i in body if i["word_breakdown"]]
    # The reader's tap-a-word instrumentation is populated on the corpus.
    assert with_breakdown, "expected at least one verse with a word breakdown"
    for item in with_breakdown:
        for w in item["word_breakdown"]:
            assert "word" in w


def test_list_is_deterministic_across_calls(client):
    headers, _ = _login(client, "reader-det")
    a = client.get("/shlokas", headers=headers).json()
    b = client.get("/shlokas", headers=headers).json()
    assert [x["id"] for x in a] == [x["id"] for x in b]