"""P22-5/P22-6 — vocabulary curriculum + graded reading.

No network: static content served from the DB.
"""

from app.seeds.briefs import SITUATIONS


def _auth_h(client):
    r = client.post("/auth/dev-login",
                    json={"display_name": "vocabuser", "bridge_langs": ["en", "hi"]})
    return {"Authorization": f"Bearer {r.json()['token']}"}


def test_vocab_requires_auth(client):
    assert client.get("/vocab/family").status_code == 401


def test_vocab_topics_are_the_ten_slugs(client):
    d = client.get("/vocab/topics", headers=_auth_h(client)).json()
    assert {t["slug"] for t in d["topics"]} == {s["slug"] for s in SITUATIONS}


def test_vocab_topic_shape_and_order(client):
    words = client.get("/vocab/family", headers=_auth_h(client)).json()
    assert len(words) >= 5
    ranks = [w["rank"] for w in words]
    assert ranks == sorted(ranks), "frequency ordering must be preserved"
    for w in words:
        for field in ("topic", "devanagari", "iast", "gloss", "gender",
                      "stem", "examples"):
            assert field in w, f"word missing {field}"
        assert w["topic"] == "family"


def test_vocab_unknown_topic_is_404(client):
    r = client.get("/vocab/klingon", headers=_auth_h(client))
    assert r.status_code == 404


def test_vocab_iast_matches_lipi(client):
    from app.services import iast
    words = client.get("/vocab/food", headers=_auth_h(client)).json()
    for w in words:
        assert w["iast"] == iast.to_iast(w["devanagari"]), w["devanagari"]


def test_reader_requires_auth(client):
    assert client.get("/reader/1").status_code == 401


def test_reader_tiers_shape(client):
    h = _auth_h(client)
    for tier in (1, 2, 3):
        rows = client.get(f"/reader/{tier}", headers=h).json()
        assert len(rows) >= 1, f"tier {tier} is empty"
        for p in rows:
            for field in ("tier", "devanagari", "iast", "word_breakdown",
                          "parse", "features", "register"):
                assert field in p, f"tier {tier} passage missing {field}"
            assert p["tier"] == tier
            assert p["word_breakdown"], f"tier {tier} passage has no breakdown"


def test_reader_iast_matches_lipi(client):
    """P7-13 extends to graded reading: stored IAST == lipi(devanagari)."""
    from app.services import iast
    rows = client.get("/reader/2", headers=_auth_h(client)).json()
    for p in rows:
        assert p["iast"] == iast.to_iast(p["devanagari"]), p["devanagari"][:40]


def test_reader_unknown_tier_is_404(client):
    assert client.get("/reader/9", headers=_auth_h(client)).status_code == 404


def test_reader_never_grades(client):
    """U13-3 extends to graded tiers: no verdict/score/streak keys anywhere."""
    rows = client.get("/reader/1", headers=_auth_h(client)).json()
    blob = str(rows)
    for key in ("verdict", "score", "streak", "mastery"):
        assert key not in blob
