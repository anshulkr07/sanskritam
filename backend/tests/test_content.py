"""Content invariants: varnamala completeness, taxonomy, seeds, pipeline validation."""


def test_varnamala_grid_completeness(client):
    r = client.get("/grammar/varnamala")
    assert r.status_code == 200
    d = r.json()
    # vowels: 14 (a ā i ī u ū ṛ ṝ ḷ e ai o au) — allow short ṝ/ḷ absences
    vowels = d.get("vowels", [])
    assert len(vowels) >= 12, f"expected >=12 vowels, got {len(vowels)}"
    # traditional sparśa matrix: 5 places x 4 stop columns = 20, + 5 nasals
    cons = d.get("consonants", [])
    assert len(cons) >= 20, f"expected >=20 consonants, got {len(cons)}"
    nasals = d.get("nasals", [])
    assert len(nasals) == 5, f"expected 5 nasals, got {len(nasals)}"
    # every entry has devanagari + iast
    for v in vowels[:5]:
        assert "devanagari" in v and "iast" in v, v
    for c in cons[:5]:
        assert "devanagari" in c and "iast" in c, c


def test_varnamala_has_the_five_places(client):
    """The five places of articulation must be present, with IAST labels."""
    r = client.get("/grammar/varnamala")
    d = r.json()
    text = str(d)
    places = ["kaṇṭhya", "tālavya", "mūrdhanya", "dantya", "oṣṭhya"]
    # Response carries iast_place labels alongside the slug
    for p in places:
        assert p in text, f"missing place {p}"
    # All five slugs present across consonants+nasals
    for slug in ["kanthya", "talavya", "murdhanya", "dantya", "oshthya"]:
        assert slug in text, f"missing slug {slug}"


def test_feature_taxonomy_has_dual(client):
    """The dual number is a first-class feature (spec §7) — never folded into plural."""
    r = client.get("/grammar/features")
    assert r.status_code == 200
    feats = r.json()
    assert len(feats) >= 30
    blob = str(feats)
    assert "DU" in blob or "DUAL" in blob or "dvi" in blob.lower()


def test_shloka_today(client):
    r = client.get("/shlokas/today")
    assert r.status_code == 200
    d = r.json()
    assert d["devanagari"]
    assert d["iast"]
    assert d["word_breakdown"]
    assert d["source_ref"]


def test_seed_content_volume(client):
    r = client.get("/admin/challenges", headers={"X-Admin-Token": "test-admin"})
    assert r.status_code == 200
    items = r.json()
    assert isinstance(items, list) and len(items) >= 25, f"only {len(items)} challenges"


def test_pipeline_validates_all_content(client):
    """Content correctness is a checkable invariant, not a hope (spec §11.3)."""
    r = client.post("/pipeline/run", headers={"X-Admin-Token": "test-admin"})
    assert r.status_code == 200
    d = r.json()
    assert d["total"] >= 25
    assert d["passed"] == d["total"], f"pipeline failures: {d['anomalies'][:3]}"


def test_pipeline_catches_corrupted_challenge(client):
    """Insert a challenge with WRONG accepted_parses; pipeline must flag it."""
    bad = {
        "prompt_l1": "The boy goes to the forest.",
        "prompt_lang": "en",
        "target_sanskrit": "बालः वनम् गच्छति।",
        "target_iast": "bālas vanam gacchati.",
        "features": ["NOM.SG", "ACC.SG", "PRES.3SG"],
        # DELIBERATELY WRONG: claims LOC.SG for the object
        "accepted_parses": [{"bāla": "NOM.SG", "vana": "LOC.SG", "√gam": "PRES.3SG"}],
        "register": "laukika",
    }
    r = client.post("/admin/challenges", json=bad, headers={"X-Admin-Token": "test-admin"})
    assert r.status_code in (200, 201), r.text
    bad_id = r.json().get("id") if isinstance(r.json(), dict) else None

    r2 = client.post("/pipeline/run", headers={"X-Admin-Token": "test-admin"})
    d = r2.json()
    if bad_id:
        flagged = [a for a in d["anomalies"] if a.get("challenge_id") == bad_id]
    else:
        flagged = [a for a in d["anomalies"] if "vanam" in str(a) or "वनम्" in str(a)]
    assert flagged, f"pipeline failed to catch a corrupted challenge; anomalies={d['anomalies'][:2]}"


def test_admin_requires_token(client):
    r = client.get("/admin/challenges")
    assert r.status_code == 401
    r2 = client.post("/pipeline/run", headers={"X-Admin-Token": "wrong"})
    assert r2.status_code == 401
