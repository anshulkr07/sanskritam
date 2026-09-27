"""P9-1: the Pāṇinian derivation service.

No network. Pins the exact step counts and sūtra codes verified live on this
machine with vidyut 0.4.0 (HANDOVER P9-1 / quick reference).
"""

import pytest

from app.services import prakriya

pytestmark = pytest.mark.skipif(
    not prakriya._HAS_PRAKRIYA, reason="vidyut.prakriya unavailable"
)


def test_bhavati_steps_and_codes():
    r = prakriya.derive(dhatu="भू", lakara="Lat", purusha="Prathama", vacana="Eka")
    assert r["result"] == "भवति"
    assert r["step_count"] == 20
    codes = [s["code"] for s in r["steps"]]
    assert codes[0] == "1.3.1"
    assert r["steps"][-1]["sutra_devanagari"] == "अ अ"  # 8.4.68 closes the derivation
    assert "6.1.78" in codes  # एचोऽयवायावः — the vowel→semivowel rule that yields भव्
    # the sūtra text resolves to Devanagari, never SLP1
    assert r["steps"][0]["sutra_devanagari"] == "भूवादयो धातवः"
    assert r["steps"][0]["sutra_text"]  # SLP1 text present but not leaked to Dev field


def test_devena_noun_derivation():
    r = prakriya.derive(
        pratipadika="देव", linga="Pum", vibhakti="Trtiya", vacana="Eka"
    )
    assert r["result"] == "देवेन"
    codes = [s["code"] for s in r["steps"]]
    assert "7.1.12" in codes
    assert "6.1.87" in codes
    assert r["step_count"] == 10


def test_unknown_dhatu_degrades_to_empty():
    assert prakriya.derive(dhatu="zzz") == {
        "result": "",
        "step_count": 0,
        "steps": [],
    }


def test_missing_args_degrades_to_empty():
    assert prakriya.derive() == {"result": "", "step_count": 0, "steps": []}


def test_result_is_carried_on_every_step():
    """P9-5.1: each step carries its own complete form, not a compressed diff."""
    r = prakriya.derive(dhatu="भू", lakara="Lat", purusha="Prathama", vacana="Eka")
    assert len(r["steps"]) == r["step_count"]
    assert all("result" in s and "code" in s and "sutra_devanagari" in s for s in r["steps"])


# ─── P11-5 paradigm ───

def test_noun_paradigm_has_8x3_grid():
    r = prakriya.paradigm(pratipadika="देव", linga="Pum")
    assert r["kind"] == "subanta"
    assert len(r["rows"]) == 8  # 8 vibhakti
    assert all(len(row) == 3 for row in r["rows"])  # × 3 vacana
    # NOM.SG = देवः, with its own derivation attached
    nom_sg = r["rows"][0][0]
    assert nom_sg["form"] == "देवः"
    assert nom_sg["derivation"] and nom_sg["derivation"]["steps"]


def test_verb_paradigm_pins_lakara():
    r = prakriya.paradigm(dhatu="भू", lakara="Lat")
    assert r["kind"] == "tinanta"
    assert len(r["rows"]) == 3  # 3 puruṣa
    # Prathama.Eka = भवति
    assert r["rows"][0][0]["form"] == "भवति"


def test_paradigm_cached():
    a = prakriya.paradigm(pratipadika="देव", linga="Pum")
    b = prakriya.paradigm(pratipadika="देव", linga="Pum")
    assert a == b


def test_paradigm_missing_is_empty_not_error():
    assert prakriya.paradigm(pratipadika="") == {"rows": [], "kind": "subanta"}
    # dhatu="" is falsy so it also degrades, returning an empty grid
    r = prakriya.paradigm(dhatu="")
    assert r["rows"] == []


def test_unknown_enum_member_warns_and_defaults(caplog):
    """A misspelled vidyut code (linga="Neut" — the member is "Napumsaka")
    must LOUDLY fall back, never silently derive the wrong gender. Found
    2026-09-08 via phala→phalau (correct: phale)."""
    import logging

    from app.services.prakriya import _enum_member
    from vidyut.prakriya import Linga

    with caplog.at_level(logging.WARNING, logger="shabd.prakriya"):
        assert _enum_member(Linga, "Neut", Linga.Pum) is Linga.Pum
    assert any("Neut" in m for m in caplog.messages)
    # Valid members resolve silently.
    assert _enum_member(Linga, "Napumsaka", Linga.Pum) is Linga.Napumsaka
    assert _enum_member(Linga, "Stri", Linga.Pum) is Linga.Stri


# ─── 2026-09-15: feminine stems, exact roots, the rest of the engine ───
# Every expected form below was measured live on vidyut 0.4.0.

def _singular_column(stem, linga, **kw):
    rows = prakriya.paradigm(pratipadika=stem, linga=linga, **kw)["rows"]
    return [row[0]["form"] for row in rows], rows[0][2]["form"]


def test_feminine_a_stem_declines_with_nyap():
    sg, nom_pl = _singular_column("लता", "Stri")
    assert sg == ["लता", "लताम्", "लतया", "लतायै", "लतायाः", "लतायाः", "लतायाम्", "लते"]
    assert nom_pl == "लताः"


def test_feminine_i_stem_declines_with_nyap():
    sg, nom_pl = _singular_column("नदी", "Stri")
    assert sg[:3] == ["नदी", "नदीम्", "नद्या"]
    assert nom_pl == "नद्यः"


def test_visarga_type_feminines_stay_basic():
    for stem, nom in [("लक्ष्मी", "लक्ष्मीः"), ("श्री", "श्रीः"), ("वधू", "वधूः"), ("धी", "धीः")]:
        assert prakriya.derive(pratipadika=stem, linga="Stri")["result"] == nom, stem
    assert prakriya.derive(pratipadika="स्त्री", linga="Stri")["result"] == "स्त्री"


def test_stem_type_override():
    assert prakriya.derive(pratipadika="लता", linga="Stri", stem_type="basic")["result"] == "लताः"


@pytest.mark.parametrize("root,form", [
    ("वद्", "वदति"), ("वन्द्", "वन्दते"), ("गम्", "गच्छति"), ("स्था", "तिष्ठति"),
    ("सेव्", "सेवते"), ("कृ", "करोति"), ("जन्", "जायते"), ("अस्", "अस्ति"),
    ("लभ्", "लभते"), ("दृश्", "पश्यति"), ("नी", "नयति"),
    # ज्ञा is also spelled plainly in gaṇa 1 (ज्ञाति); the usual sense must win.
    ("ज्ञा", "जानाति"),
])
def test_root_lookup_resolves_the_intended_root(root, form):
    assert form in prakriya.derive_forms(dhatu=root, lakara="Lat",
                                         purusha="Prathama", vacana="Eka")


def test_gana_and_upadesha_pin_the_root():
    assert prakriya.derive(aupadeshika="vada~", gana="Bhvadi")["result"] == "वदति"
    assert prakriya.derive(dhatu="वद्", gana="Nope")["result"] == ""


def test_passive_voice():
    assert prakriya.derive(dhatu="पठ्", prayoga="Karmani")["result"] == "पठ्यते"
    assert "क्रियते" in prakriya.derive_forms(dhatu="कृ", prayoga="Karmani")


def test_causative_and_desiderative():
    assert "गमयति" in prakriya.derive_forms(dhatu="गम्", sanadi=["Nic"])
    assert prakriya.derive(dhatu="पा", sanadi=["San"])["result"] == "पिपासति"
    assert prakriya.derive(dhatu="गम्", sanadi=["Bogus"])["result"] == ""


def test_prefixes():
    assert prakriya.derive(dhatu="गम्", prefixes=["आ"])["result"] == "आगच्छति"
    assert "उत्तिष्ठति" in prakriya.derive_forms(dhatu="स्था", prefixes=["उद्"])


@pytest.mark.parametrize("kw,form", [
    (dict(dhatu="गम्", krt="ktvA"), "गत्वा"),
    (dict(dhatu="गम्", krt="ktvA", prefixes=["आ"]), "आगत्य"),
    (dict(dhatu="पठ्", krt="tumun"), "पठितुम्"),
    (dict(dhatu="गम्", krt="kta", linga="Pum"), "गतः"),
    (dict(dhatu="गम्", krt="ktavatu", linga="Pum"), "गतवान्"),
    (dict(dhatu="कृ", krt="tavya", linga="Napumsaka"), "कर्तव्यम्"),
    (dict(dhatu="हृ", krt="GaY", prefixes=["प्र"], linga="Pum"), "प्रहारः"),
])
def test_krdanta(kw, form):
    assert form in prakriya.derive_forms(**kw)


@pytest.mark.parametrize("kw,form", [
    (dict(pratipadika="रघु", taddhita="aR", linga="Pum"), "राघवः"),
    (dict(pratipadika="कुन्ती", taddhita="Qak", linga="Pum"), "कौन्तेयः"),
    (dict(pratipadika="मनुष्य", taddhita="tva", linga="Napumsaka"), "मनुष्यत्वम्"),
    (dict(pratipadika="भग", taddhita="matup", linga="Pum"), "भगवान्"),
])
def test_taddhita(kw, form):
    assert form in prakriya.derive_forms(**kw)


def test_unknown_suffix_name_degrades_to_empty():
    assert prakriya.derive(dhatu="गम्", krt="nope")["result"] == ""
    assert prakriya.derive(pratipadika="गुरु", taddhita="nope")["result"] == ""


def test_expect_picks_the_optional_form():
    for want in ("देवात्", "देवाद्"):
        assert prakriya.derive(pratipadika="देव", vibhakti="Panchami", expect=want)["result"] == want


def test_routes_expose_the_new_params(client):
    def result(**params):
        return client.get("/grammar/derive", params=params).json()["result"]

    assert result(pratipadika="लता", linga="Stri", vibhakti="Trtiya") == "लतया"
    assert result(dhatu="गम्", prefixes="आ") == "आगच्छति"
    assert result(dhatu="गम्", krt="ktvA") == "गत्वा"
    assert result(dhatu="पठ्", prayoga="Karmani") == "पठ्यते"
    rows = client.get("/grammar/paradigm", params={"pratipadika": "लता", "linga": "Stri"}).json()["rows"]
    assert rows[2][0]["form"] == "लतया"
