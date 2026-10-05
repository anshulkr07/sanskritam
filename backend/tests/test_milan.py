"""Gun milan (services/milan.py): the tables' own consistency, the rules, and
Drik Panchang's own results.

tests/fixtures/drik_milan/pairs.json holds what Drik Panchang's calculator
gave for 127 invented pairs of 1996 births (10:00 IST, New Delhi), read on
2026-10-05; the last test recomputes each pair and asks for the same points.
"""

import json
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path

import pytest

from app.services import kundli, milan

DRIK = json.loads((Path(__file__).parent / "fixtures" / "drik_milan" / "pairs.json").read_text(encoding="utf-8"))

SWORN = {("Horse", "Buffalo"), ("Elephant", "Lion"), ("Sheep", "Monkey"), ("Serpent", "Mongoose"),
         ("Dog", "Deer"), ("Cat", "Rat"), ("Cow", "Tiger")}


def test_yoni_table_is_symmetric_with_zeros_only_for_sworn_enemies():
    n = len(milan.YONI_ANIMALS)
    for i in range(n):
        assert milan.YONI_POINTS[i][i] == 4
        for j in range(n):
            assert milan.YONI_POINTS[i][j] == milan.YONI_POINTS[j][i]
            a, b = milan.YONI_ANIMALS[i], milan.YONI_ANIMALS[j]
            assert (milan.YONI_POINTS[i][j] == 0) == ((a, b) in SWORN or (b, a) in SWORN)


def test_each_nakshatra_has_one_gana_nadi_and_yoni():
    for table in (milan.NAK_GANA, milan.NAK_NADI, milan.NAK_YONI):
        assert len(table) == 27
    assert [milan.NAK_GANA.count(g) for g in range(3)] == [9, 9, 9]
    assert [milan.NAK_NADI.count(g) for g in range(3)] == [9, 9, 9]
    # Every animal has a male and a female nakshatra except the Mongoose,
    # whose female is Abhijit (not one of the 27).
    counts = [milan.NAK_YONI.count(a) for a in range(14)]
    assert counts[milan.YONI_ANIMALS.index("Mongoose")] == 1
    assert sorted(c for i, c in enumerate(counts) if milan.YONI_ANIMALS[i] != "Mongoose") == [2] * 13


@pytest.mark.parametrize("boy,girl,points", [
    ("Sun", "Moon", 5.0), ("Sun", "Sun", 5.0), ("Sun", "Mercury", 4.0), ("Moon", "Mars", 4.0),
    ("Jupiter", "Saturn", 3.0), ("Mercury", "Moon", 1.0), ("Mars", "Saturn", 0.5), ("Sun", "Saturn", 0.0),
])
def test_graha_maitri(boy, girl, points):
    assert milan.maitri_points(boy, girl) == points
    assert milan.maitri_points(girl, boy) == points


def test_tara_bhakoot_and_varna_rules():
    assert milan.tara_of(0, 0) == 1 and milan.tara_of(0, 2) == 3 and milan.tara_of(0, 9) == 1
    assert milan.tara_points(0, 0) == 3.0           # janma both ways
    assert milan.tara_points(0, 2) == 1.5           # girl is vipat from the boy, boy is 26 -> 8 from her
    assert milan.bhakoot_points(0, 0) == 7.0 and milan.bhakoot_points(0, 6) == 7.0
    assert milan.bhakoot_points(0, 1) == 0.0 and milan.bhakoot_points(1, 0) == 0.0   # 2/12
    assert milan.bhakoot_points(0, 4) == 0.0 and milan.bhakoot_points(0, 5) == 0.0   # 5/9, 6/8
    assert milan.SIGN_VARNA[3] == 3 and milan.SIGN_VARNA[0] == 2 and milan.SIGN_VARNA[2] == 0


def test_vashya_groups_split_sagittarius_and_capricorn_at_fifteen_degrees():
    assert milan.vashya_group(8 * 30 + 10) == 1 and milan.vashya_group(8 * 30 + 20) == 0
    assert milan.vashya_group(9 * 30 + 10) == 0 and milan.vashya_group(9 * 30 + 20) == 2
    assert milan.vashya_group(4 * 30 + 1) == 3 and milan.vashya_group(7 * 30 + 1) == 4


def test_two_charts_make_a_full_match():
    now = datetime(2026, 10, 5, tzinfo=timezone.utc)
    boy = kundli.chart(kundli.birth_moment("1990-06-15", "11:00", "Asia/Kolkata"), 28.6, 77.2, now=now)
    girl = kundli.chart(kundli.birth_moment("1992-03-10", "07:30", "Asia/Kolkata"), 28.6, 77.2, now=now)
    m = milan.match(boy, girl)
    assert [k["key"] for k in m["kootas"]] == [k for k, _n, _m in milan.KOOTAS]
    assert m["max"] == 36.0 and sum(k["max"] for k in m["kootas"]) == 36.0
    assert m["total"] == sum(k["points"] for k in m["kootas"])
    assert all(0 <= k["points"] <= k["max"] for k in m["kootas"])
    assert m["verdict"] == milan.verdict(m["total"])
    text = milan.facts_text(m, asker_is="boy")
    assert text.startswith("MATCH (ashtakoota") and "the asker (boy)" in text and "Total:" in text
    # The same pair the other way round is a different match: Varna and Gana
    # read the boy's side first.
    assert milan.match(girl, boy)["kootas"][0]["boy"] == m["kootas"][0]["girl"]


@pytest.mark.parametrize("total,word", [(36, "excellent"), (31, "excellent"), (30.5, "very good"),
                                        (21, "very good"), (20, "middling"), (17, "middling"), (16.5, "inauspicious")])
def test_verdict_bands(total, word):
    assert milan.verdict(total) == word


def test_nadi_and_bhakoot_exceptions():
    # Ashwini 0, Bharani 1, Krittika 2 (Antya), Rohini 3 (Antya); Mesha 0, Vrishabha 1.
    assert milan.bhakoot_and_nadi(2, 3, 4, 2, 1, 1)[:2] == (7.0, 8.0)   # same Nadi, same sign
    assert milan.bhakoot_and_nadi(2, 2, 1, 3, 0, 1)[:2] == (0.0, 8.0)   # same nakshatra, two signs (2/12)
    assert milan.bhakoot_and_nadi(1, 1, 4, 4, 0, 0)[:2] == (0.0, 0.0)   # same pada
    assert milan.bhakoot_and_nadi(1, 1, 4, 2, 0, 0)[:2] == (0.0, 0.0)   # Bharani does not allow it
    assert milan.bhakoot_and_nadi(0, 0, 3, 2, 0, 0)[:2] == (7.0, 8.0)   # Ashwini does, in different padas
    assert milan.bhakoot_and_nadi(0, 0, 3, 3, 0, 0)[:2] == (0.0, 0.0)   # but not in the same pada
    assert milan.bhakoot_and_nadi(3, 12, 1, 1, 1, 5) == (0.0, 8.0, "")  # Rohini (Antya), Hasta (Adi): 5/9
    assert milan.bhakoot_and_nadi(2, 15, 2, 4, 1, 6) == (0.0, 0.0, "")  # Krittika, Vishakha: both Antya, 6/8


@lru_cache(maxsize=None)
def _chart(day: str) -> dict:
    return kundli.chart(kundli.birth_moment(day, "10:00", "Asia/Kolkata"), 28.6358, 77.2244,
                        now=datetime(2026, 10, 5, tzinfo=timezone.utc))


@pytest.mark.parametrize("pair", DRIK["pairs"], ids=lambda p: f"{p['boy']}/{p['girl']}")
def test_points_match_drik_panchang(pair):
    m = milan.match(_chart(pair["boy"]), _chart(pair["girl"]))
    got = {k["key"]: k["points"] for k in m["kootas"]}
    assert {k: got[k] for k in pair["drik"]} == pair["drik"]
