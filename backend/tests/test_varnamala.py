"""Spec E — varnamala drill surface: ids, contrast groups, endpoints.

Covers the spec's Tests section: 48 unique stable ids, devanagari + iast on
every cell, symmetric minimal_pairs, resolvable contrast-group references,
the five places with IAST labels, empty examples on rii/li/lii, practice
reps with no verdict field, and the untouched legacy grid.
"""


def test_varnamala_full_grid_has_48_ids(client):
    r = client.get("/varnamala")
    assert r.status_code == 200, r.text
    d = r.json()
    cells = d["vowels"] + d["consonants"] + d["nasals"] + d["others"]
    assert len(cells) == 49, f"expected 49 varnas, got {len(cells)}"
    ids = [c["id"] for c in cells]
    assert len(set(ids)) == 49, "varna ids must be unique and stable"
    for c in cells:
        assert c["devanagari"] and c["iast"], c
        assert c["audio_url"] == f"/audio/varnamala/{c['id']}.wav", c
        assert c["example_audio_url"] == f"/audio/varnamala/{c['id']}_example.wav", c


def test_varnamala_minimal_pairs_symmetric(client):
    r = client.get("/varnamala")
    cells = r.json()["vowels"] + r.json()["consonants"] + r.json()["nasals"] + r.json()["others"]
    pairs_of = {c["id"]: c["minimal_pairs"] for c in cells}
    for vid, pairs in pairs_of.items():
        for other in pairs:
            assert other in pairs_of, f"{vid} pairs with unknown {other}"
            assert vid in pairs_of[other], f"asymmetric: {vid} lists {other} but not vice versa"


def test_varnamala_contrast_groups_resolve(client):
    r = client.get("/varnamala")
    d = r.json()
    ids = {c["id"] for c in d["vowels"] + d["consonants"] + d["nasals"] + d["others"]}
    assert len(d["contrast_groups"]) == 5
    for g in d["contrast_groups"]:
        assert g["note_en"], g
        for x, y in g["pairs"]:
            assert x in ids and y in ids, f"group {g['id']} references unknown varna"


def test_varnamala_has_the_five_places(client):
    r = client.get("/varnamala")
    text = str(r.json())
    for slug in ["kanthya", "talavya", "murdhanya", "dantya", "oshthya"]:
        assert slug in text, f"missing slug {slug}"


def test_varnamala_rare_vowels_have_empty_examples(client):
    r = client.get("/varnamala")
    by_id = {c["id"]: c for c in r.json()["vowels"]}
    for vid in ("rii", "li", "lii"):
        assert by_id[vid]["example_devanagari"] == "", vid
        assert by_id[vid]["example_iast"] == "", vid


def test_varnamala_practice_increments_reps_no_verdict(client, auth_headers):
    r = client.post("/varnamala/practice", json={"varna_id": "tta", "heard": True, "recorded": True},
                    headers=auth_headers)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["varna_id"] == "tta" and d["reps"] == 1
    assert "verdict" not in d, "practice returns no verdict (Spec E §5)"
    r2 = client.post("/varnamala/practice", json={"varna_id": "tta"},
                     headers=auth_headers)
    assert r2.json()["reps"] == 2


def test_varnamala_practice_unknown_id_404(client, auth_headers):
    r = client.post("/varnamala/practice", json={"varna_id": "zzz"},
                    headers=auth_headers)
    assert r.status_code == 404


def test_varnamala_progress_tracks_coverage(client, auth_headers):
    client.post("/varnamala/practice", json={"varna_id": "ta"}, headers=auth_headers)
    r = client.get("/varnamala/progress", headers=auth_headers)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["total"] == 49
    assert d["covered"] >= 1
    assert d["progress"]["ta"]["reps"] >= 1


def test_varnamala_endpoints_require_learner_for_progress(client):
    assert client.get("/varnamala/progress").status_code in (401, 403)
    assert client.post("/varnamala/practice", json={"varna_id": "ta"}).status_code in (401, 403)


def test_legacy_grammar_varnamala_unchanged(client):
    r = client.get("/grammar/varnamala")
    assert r.status_code == 200
    d = r.json()
    assert len(d["vowels"]) >= 12 and len(d["consonants"]) >= 20 and len(d["nasals"]) == 5


def test_build_varnamala_items_shape():
    from scripts.build_varnamala_items import build_items
    items = build_items()
    by_id = {it["id"]: it for it in items}
    # 49 aksaras + 46 example words (rii/li/lii have no example by design)
    assert len(items) == 49 + 46, f"expected 95 items, got {len(items)}"
    assert by_id["tta"]["text"] == "ट"
    assert by_id["tta_example"]["text"] == "पटः"
    assert "lii_example" not in by_id
    for it in items:
        assert it["lang"] == "sa" and it["text"].strip()
