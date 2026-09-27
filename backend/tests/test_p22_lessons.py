"""P22-1/P22-3/P22-4 — the Lesson content type, Units 1–3, has_lesson.

No network (local engine only at seed time; serving is a row read).
"""

from app.services.lessons import verify_example


def _auth_h(client):
    r = client.post("/auth/dev-login",
                    json={"display_name": "lessonuser", "bridge_langs": ["en", "hi"]})
    return {"Authorization": f"Bearer {r.json()['token']}"}


def test_lesson_requires_auth(client):
    r = client.get("/lessons/NOM.SG")
    assert r.status_code == 401


def test_lesson_shape(client):
    d = client.get("/lessons/NOM.SG", headers=_auth_h(client)).json()
    assert d["feature_id"] == "NOM.SG"
    assert d["unit_id"] == "u2"
    assert len(d["body"]) > 100
    assert d["visual_type"] in ("grid", "tree", "state_machine", "none")
    assert isinstance(d["visual_data"], dict)
    for ex in d["examples"]:
        for field in ("devanagari", "iast", "gloss"):
            assert field in ex, f"example missing {field}"


def test_lesson_examples_are_engine_derived(client):
    """Every stored example's derivation reproduces its surface form — the
    P22-1 provenance rule. A lesson cannot claim what the engine cannot
    produce (measured gaps: feminine ā-stems, वद्, गम्)."""
    for fid in ("NOM.SG", "ACC.SG", "PRES.3SG", "INSTR.SG", "DAT.SG",
                "ABL.SG", "GEN.SG", "LOC.SG", "VOC.SG", "SG"):
        d = client.get(f"/lessons/{fid}", headers=_auth_h(client)).json()
        for ex in d["examples"]:
            der = ex.get("derivation")
            if der is None:
                continue
            if "result" in der:
                assert der["result"] == ex["devanagari"], (fid, ex)
                assert der["step_count"] > 0
            else:
                assert der.get("splits"), (fid, ex)


def test_lesson_iast_matches_lipi(client):
    """P7-13 extends to lessons: stored IAST == lipi(devanagari)."""
    from app.services import iast
    d = client.get("/lessons/ACC.SG", headers=_auth_h(client)).json()
    for ex in d["examples"]:
        assert ex["iast"] == iast.to_iast(ex["devanagari"]), ex["devanagari"]


def test_missing_lesson_is_honest_404(client):
    """A feature with no lesson returns 404 — never a blank (§2.11)."""
    r = client.get("/lessons/PRES.2SG", headers=_auth_h(client))
    assert r.status_code == 404


def test_verify_example_drops_engine_gaps():
    """The equality check drops confident-wrong engine output, not just
    empty output: a real form that is not the claimed one (the future
    पठिष्यति for a present-tense पठति) keeps the example out of lessons.
    (Until 2026-09-15 the case pinned here was वद्→वन्दते, a root-lookup bug
    since fixed in prakriya._find_dhatu.)"""
    assert verify_example({
        "devanagari": "पठति",
        "derivation_params": {"dhatu": "पठ्", "lakara": "Lrt",
                              "purusha": "Prathama", "vacana": "Eka"},
    }) is None
    ok = verify_example({
        "devanagari": "पठति",
        "derivation_params": {"dhatu": "पठ्", "lakara": "Lat",
                              "purusha": "Prathama", "vacana": "Eka"},
    })
    assert ok is not None and ok["derivation"]["result"] == "पठति"


def test_path_nodes_carry_has_lesson(client):
    """P22-4: the spine exposes has_lesson so Path routes Learn first."""
    d = client.get("/grammar/path", headers=_auth_h(client)).json()
    by_id = {n["id"]: n for n in d["nodes"]}
    assert by_id["NOM.SG"]["has_lesson"] is True
    assert by_id["PRES.2SG"]["has_lesson"] is False
    for n in d["nodes"]:
        assert "has_lesson" in n


def test_p22_2_taxonomy_present_without_bands(client):
    """Samāsa + kāraka features seed cleanly and no challenge band
    references them (taxonomy-only by design — §2.1, analyzer stays frozen)."""
    from app.seeds.briefs import CHALLENGE_BANDS
    from scripts.p712_feature_coverage import TAXONOMY_ONLY_FEATURES

    feats = {f["id"] for f in client.get("/grammar/features",
                                         headers=_auth_h(client)).json()}
    assert TAXONOMY_ONLY_FEATURES <= feats
    band_feats = {f for b in CHALLENGE_BANDS for f in b["features"]}
    assert not (band_feats & TAXONOMY_ONLY_FEATURES)
