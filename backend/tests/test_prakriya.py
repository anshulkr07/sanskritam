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
