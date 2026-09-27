"""Word Lab lookup (2026-09-15): the analyzer proposes, the engine decides."""

import pytest

from app.services import prakriya
from app.services.word_lookup import lookup


def _first(word):
    cands = lookup(word)["candidates"]
    assert cands, word
    return cands[0]


def test_noun_with_a_clipped_analyzer_stem():
    c = _first("रामेण")  # the analyzer says *ram; the engine confirms राम
    assert (c["kind"], c["lemma"], c["linga"]) == ("noun", "राम", "Pum")
    assert {"vibhakti": "Trtiya", "vacana": "Eka"} in c["readings"]
    assert "instrumental singular" in c["plain"]["en"] and "तृतीया एकवचन" in c["plain"]["hi"]


def test_feminine_stem():
    c = _first("लताम्")
    assert (c["lemma"], c["linga"]) == ("लता", "Stri")
    assert c["readings"] == [{"vibhakti": "Dvitiya", "vacana": "Eka"}]


def test_verb_present_and_a_tense_the_analyzer_mislabels():
    c = _first("गच्छति")
    assert (c["kind"], c["lemma"], c["lakara"]) == ("verb", "गम्", "Lat")
    assert {"purusha": "Prathama", "vacana": "Eka"} in c["readings"]
    fut = _first("पठिष्यति")
    assert (fut["lemma"], fut["lakara"]) == ("पठ्", "Lrt")


def test_a_wrong_primary_reading_gives_way_to_a_verified_alternative():
    c = _first("गुरवे")  # analyzer's first guess is a locative of *gurava
    assert (c["lemma"], c["readings"][0]["vibhakti"]) == ("गुरु", "Caturthi")


def test_syncretic_forms_list_every_reading():
    c = _first("फलं")
    assert c["lemma"] == "फल" and c["linga"] == "Napumsaka"
    assert {r["vibhakti"] for r in c["readings"]} >= {"Prathama", "Dvitiya"}


def test_indeclinable_and_pronoun():
    assert _first("च")["kind"] == "indeclinable"
    c = _first("अहम्")
    assert (c["kind"], c["lemma"]) == ("pronoun", "अस्मद्")


@pytest.mark.parametrize("word", ["xyz", "", "राम सीता"])
def test_nothing_to_explain_gives_no_candidates(word):
    assert lookup(word)["candidates"] == []


@pytest.mark.parametrize("word", ["रामेण", "लताम्", "गच्छति", "पठिष्यति", "गुरवे", "फलं", "अहम्", "तस्मै", "बालकाः"])
def test_every_candidate_rederives_the_typed_word(word):
    for c in lookup(word)["candidates"]:
        if c["derive_params"]:
            params = dict(c["derive_params"])
            expect = params.pop("expect")
            assert expect in prakriya.derive_forms(**params), (word, c)


def test_lookup_route(client):
    r = client.get("/grammar/lookup", params={"word": "रामेण"})
    assert r.status_code == 200
    body = r.json()
    assert body["iast"] == "rāmeṇa" and body["candidates"][0]["lemma"] == "राम"
    assert client.get("/grammar/lookup", params={"word": ""}).status_code == 422


def test_ask_engine_derives_dative_and_genitive_forms():
    """ask_engine used vidyut names that don't exist (Chaturthi, Shashthi) and
    silently derived the nominative instead."""
    from app.services.ask_engine import _derive_word_form

    assert _derive_word_form("गुरवे", {"guru": "DAT.SG"})["result"] == "गुरवे"
    assert _derive_word_form("रामस्य", {"rāma": "GEN.SG"})["result"] == "रामस्य"
