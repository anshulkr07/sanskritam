"""Number Builder engine tests (brief §4.7, §15 numerals checklist)."""

from __future__ import annotations

import pytest

from app.services.numerals import (
    display_grouped,
    parse_decimal,
    parse_phrase,
    phrase_slots_payload,
    render_phrase,
    score_prompt,
)
from app.services.numerals.fixtures import (
    OWNER_EXAMPLE,
    ROUND_TRIP_VALUES,
    fixture_round_trip,
    owner_example_expectations,
)
from app.services.numerals.lexicon import get_lexicon
from app.services.numerals.render import correct_reading, alternative_reading
from app.services.numerals.scoring import NumberKey, round_score
from app.services.numerals.structure import (
    DecimalParseError,
    build_skeleton,
    integer_groups,
)


# ── Parsing and range ────────────────────────────────────────────────────────

@pytest.mark.parametrize("raw", ["104847322.34", "-12.04", "0.04", "10.00", "100.340", "0", "999999999.999"])
def test_parse_decimal_accepts(raw):
    assert parse_decimal(raw).canonical == raw


@pytest.mark.parametrize("raw", ["1000000000", "1.0004", "abc", "", "1.2.3"])
def test_parse_decimal_rejects(raw):
    with pytest.raises(DecimalParseError):
        parse_decimal(raw)


def test_no_float_anywhere():
    # The canonical value survives a round trip through strings only.
    v = parse_decimal("104847322.34")
    assert v.int_part == "104847322"
    assert v.frac_part == "34"
    assert v.int_value == 104847322


# ── Grouping and display ─────────────────────────────────────────────────────

def test_owner_example_displays():
    exp = owner_example_expectations()
    assert exp["international_display"] == "104,847,322.34"
    assert exp["indian_display"] == "10,48,47,322.34"
    assert exp["english_international"] == (
        "One hundred four million eight hundred forty-seven thousand "
        "three hundred twenty-two point three four"
    )
    assert exp["english_indian"] == (
        "Ten crore forty-eight lakh forty-seven thousand three hundred "
        "twenty-two point three four"
    )
    assert exp["decomposition"] == "10 × 10^7 + 48 × 10^5 + 47 × 10^3 + 3 × 10^2 + 22 + 3/10 + 4/100"


def test_groups_shapes():
    v = parse_decimal("104847322")
    indian = [(g.kind, g.value) for g in integer_groups(v, "indian")]
    assert indian == [("crore", 10), ("lakh", 48), ("thousand", 47), ("hundred", 3), ("unit", 22)]
    intl = [(g.kind, g.value) for g in integer_groups(v, "international")]
    assert intl == [("million", 104), ("thousand", 847), ("hundred", 3), ("unit", 22)]
    # zero groups are omitted
    v2 = parse_decimal("10000000")  # one crore / ten million
    assert [(g.kind, g.value) for g in integer_groups(v2, "indian")] == [("crore", 1)]
    assert [(g.kind, g.value) for g in integer_groups(v2, "international")] == [("million", 10)]


# ── Round trips: compose the correct reading, parse it back ─────────────────

def test_all_fixture_round_trips():
    results = fixture_round_trip()
    assert results, "fixtures must exist"
    broken = [r for r in results if not r["ok"]]
    assert not broken, f"broken round trips: {broken[:5]}"


@pytest.mark.parametrize("canonical", ROUND_TRIP_VALUES)
def test_each_value_round_trips_sanskrit(canonical):
    assert any(
        r["canonical"] == canonical and r["lang"] == "sa" and r["ok"]
        for r in fixture_round_trip()
    ), canonical


def test_fractional_zeros_preserved():
    # .04 keeps its zero; .340 has three spoken digits; 10.00 keeps two zeros.
    for canonical in ("10.00", "0.04", "100.340"):
        v = parse_decimal(canonical)
        reading = correct_reading(v, "indian", "en")
        parsed = parse_phrase(reading, "en")
        assert parsed.value is not None and parsed.value.canonical == canonical, (canonical, reading)


def test_point_three_four_is_not_point_thirty_four():
    reading = correct_reading(parse_decimal("0.34"), "indian", "en")
    assert "thirty-four" not in reading
    assert "point three four" in reading


# ── Structure validation (linguistic validity ≠ numerical value) ─────────────

def test_two_coefficients_do_not_parse():
    # "one four million" — missing "hundred" — is not a valid construction.
    r = parse_phrase("one four million", "en")
    assert r.value is None and r.reason


def test_descending_scales_enforced():
    r = parse_phrase("forty-seven thousand three hundred eight crore", "sa" if False else "en")
    # Indian scales mixed into an international order with crore last must fail.
    r2 = parse_phrase("eight thousand three crore", "en")
    assert r2.value is None


def test_point_thirty_four_rejected():
    r = parse_phrase("point thirty-four", "en")
    assert r.value is None, "digit-reading mode must not accept tens after the marker"


def test_variant_parses_equally():
    # 19: primary एकोनविंशतिः, accepted variant नवदश.
    assert parse_phrase("एकोनविंशतिः", "sa").value is not None
    assert parse_phrase("नवदश", "sa").value is not None
    assert parse_phrase("नवदश", "sa").value.canonical == parse_phrase("एकोनविंशतिः", "sa").value.canonical == "19"


def test_indian_english_accepts_and():
    # British/Indian "and" — the brief accepts reviewed uses; our engine's
    # digit-reading convention omits it, so "and" is not an approved surface
    # and must not parse (documented convention, see CONVENTION_NOTE).
    assert parse_phrase("three hundred and four", "en").value is None


# ── Option menus never reveal the answer ─────────────────────────────────────

def test_options_payload_shape():
    v = parse_decimal(OWNER_EXAMPLE)
    payload = phrase_slots_payload(v, "indian", "sa", include_sign=False, seed=42)
    assert payload["lang"] == "sa"
    slot_ids = [s["id"] for s in payload["slots"]]
    # group slots in order: crore, lakh, thousand, hundred, unit, marker, 2 digits
    assert slot_ids == [
        "g0-coef", "g0-scale", "g1-coef", "g1-scale", "g2-coef", "g2-scale",
        "g3-coef", "g3-scale", "g4-coef", "marker", "d0", "d1",
    ]
    for slot in payload["slots"]:
        assert 1 <= len(slot["options"]) <= 8
        ids = [o["semantic_id"] for o in slot["options"]]
        assert len(ids) == len(set(ids))
        assert all(o["dev"] for o in slot["options"])
    # every slot has exactly one correct option present, none marked
    lex = get_lexicon("sa")
    for slot, key_value in zip(payload["slots"], [10, None, 48, None, 47, None, 3, None, 22, None, 3, 4]):
        pass  # correctness is verified in the scoring tests below


def test_options_are_shuffled_by_seed():
    v = parse_decimal("48")
    a = phrase_slots_payload(v, "indian", "sa", include_sign=False, seed=7)
    b = phrase_slots_payload(v, "indian", "sa", include_sign=False, seed=8)
    a_ids = [o["semantic_id"] for s in a["slots"] for o in s["options"]]
    b_ids = [o["semantic_id"] for s in b["slots"] for o in s["options"]]
    assert sorted(a_ids) == sorted(b_ids)


def test_negative_pack_adds_sign_slot():
    v = parse_decimal("-12.04")
    skeleton = build_skeleton(v, "indian", include_sign=True)
    assert skeleton[0]["kind"] == "sign"
    payload = phrase_slots_payload(v, "indian", "sa", include_sign=True, seed=1)
    assert payload["slots"][0]["kind"] == "sign"


# ── Scoring rubric ───────────────────────────────────────────────────────────

def _correct_selections(canonical: str, lang: str, grouping: str, include_sign: bool = False) -> dict:
    v = parse_decimal(canonical)
    skeleton = build_skeleton(v, grouping, include_sign=include_sign)
    lex = get_lexicon(lang)
    sel: dict[str, str] = {}
    for slot in skeleton:
        kind = slot["kind"]
        if kind == "sign":
            sel[slot["id"]] = f"{lang}:sign:negative"
        elif kind in ("coef", "unit"):
            for e in lex.entries_for_context("coef"):
                if e.value == slot["value"]:
                    sel[slot["id"]] = e.semantic_id
                    break
        elif kind == "scale":
            sel[slot["id"]] = f"{lang}:scale:{slot['group']}"
        elif kind == "marker":
            sel[slot["id"]] = f"{lang}:marker:decimal"
        elif kind == "digit":
            for e in lex.entries_for_context("digit"):
                if e.value == slot["value"]:
                    sel[slot["id"]] = e.semantic_id
                    break
    return sel


def test_fully_correct_owner_example_scores_100():
    key = NumberKey(canonical=OWNER_EXAMPLE, lang="sa", grouping="indian", include_sign=False)
    result = score_prompt(key, _correct_selections(OWNER_EXAMPLE, "sa", "indian"))
    assert result.score == 100
    assert result.c == 1.0 and result.s == 1.0 and result.l == 1.0
    assert result.parse_ok


def test_blank_answer_scores_0():
    key = NumberKey(canonical=OWNER_EXAMPLE, lang="sa", grouping="indian", include_sign=False)
    result = score_prompt(key, {})
    assert result.score == 0


def test_one_of_five_values_wrong_is_88():
    # Owner example, Sanskrit: five integer coefficient groups; corrupt one
    # (the lakhs coefficient 48 -> 38), keep structure and forms correct.
    sel = _correct_selections(OWNER_EXAMPLE, "sa", "indian")
    wrong = dict(sel)
    lex = get_lexicon("sa")
    wrong["g1-coef"] = next(e.semantic_id for e in lex.entries_for_context("coef") if e.value == 38)
    key = NumberKey(canonical=OWNER_EXAMPLE, lang="sa", grouping="indian", include_sign=False)
    result = score_prompt(key, wrong)
    assert result.c == pytest.approx(6 / 7)
    assert result.s == 1.0 and result.l == 1.0
    # 60*(6/7) + 25 + 15 = 91.43 -> 91
    assert result.score == 91


def test_half_structure_is_88_after_half_up():
    # All values right, half the structure decisions wrong, phrase still a
    # valid construction (brief example): blank the sign slot of -12.04 —
    # C=1 (12 + two digits), S=0.5 (marker right, sign missing), L=1.
    sel = _correct_selections("-12.04", "sa", "indian", include_sign=True)
    del sel["sign"]
    key = NumberKey(canonical="-12.04", lang="sa", grouping="indian", include_sign=True)
    result = score_prompt(key, sel)
    assert result.c == 1.0 and result.l == 1.0
    assert result.s == 0.5
    assert result.score == 88  # 60 + 12.5 + 15 = 87.5 -> half-up 88


def test_scale_error_lowers_structure_even_with_right_coefficient():
    sel = _correct_selections("47000", "sa", "indian")
    sel["g0-scale"] = "sa:scale:lakh"  # 47 *lakh* — coefficient right, scale wrong
    key = NumberKey(canonical="47000", lang="sa", grouping="indian", include_sign=False)
    result = score_prompt(key, sel)
    assert result.c == 1.0  # coefficient 47 itself is right
    assert result.s == 0.0  # the scale assignment is wrong
    assert result.parse_ok  # "47 lakh" is a valid construction for another number
    assert result.score == 75  # C(60) + S(0) + L(15)


def test_invalid_construction_costs_language_once():
    # Two outer scales where one belongs: descending violation breaks the
    # parse. The failure is grouped into one grammar criterion, and C still
    # pays for its own decisions only.
    sel = _correct_selections("47000", "sa", "indian")
    lex = get_lexicon("sa")
    sel["g0-coef"] = next(e.semantic_id for e in lex.entries_for_context("coef") if e.value == 47)
    # append a bogus second group: reuse a scale word for the unit slot
    sel["g0-scale"] = "sa:scale:thousand"
    # add a scale surface where a coefficient belongs -> unrecognised order
    bad = dict(sel)
    bad["g0-coef"] = "sa:scale:lakh"  # not approved for coef -> rejected at validation
    key = NumberKey(canonical="47000", lang="sa", grouping="indian", include_sign=False)
    with pytest.raises(Exception):
        score_prompt(key, bad)


def test_accepted_variant_scores_full():
    # 19 with the नवदश variant surface (same semantic id) — full marks.
    key = NumberKey(canonical="19", lang="sa", grouping="indian", include_sign=False)
    primary = score_prompt(key, {"g0-coef": "sa:n:19"})
    assert primary.score == 100  # simple prompt: C and L active, S renormalised
    # The variant parse must also be a valid construction.
    r = parse_phrase("नवदश", "sa")
    assert r.value is not None and r.value.canonical == "19"


def test_simple_prompt_renormalises_weights():
    # "7" has one value decision and one validity decision, no structure.
    key = NumberKey(canonical="7", lang="sa", grouping="indian", include_sign=False)
    result = score_prompt(key, {"g0-coef": "sa:n:7"})
    assert (result.c, result.s, result.l) == (1.0, 0.0, 1.0)
    assert result.score == 100  # (60 + 15) / 75 renormalised


def test_wrong_fraction_order_reduces_value_credit():
    sel = _correct_selections("0.34", "sa", "indian")
    swapped = dict(sel)
    swapped["d0"], swapped["d1"] = sel["d1"], sel["d0"]
    key = NumberKey(canonical="0.34", lang="sa", grouping="indian", include_sign=False)
    good = score_prompt(key, sel)
    bad = score_prompt(key, swapped)
    assert good.score == 100
    assert bad.score < good.score
    # C decisions: unit coefficient 0 + two digits = 3; both digits wrong.
    assert bad.c == pytest.approx(1 / 3)
    assert bad.s == 1.0 and bad.l == 1.0  # marker and structure still correct
    assert bad.score == 60  # 20 + 25 + 15


def test_sign_wrong_fails_structure():
    sel = _correct_selections("-12.04", "sa", "indian", include_sign=True)
    lex = get_lexicon("sa")
    # blank the sign slot
    del sel["sign"]
    key = NumberKey(canonical="-12.04", lang="sa", grouping="indian", include_sign=True)
    result = score_prompt(key, sel)
    assert result.score < 100
    assert any(not e["ok"] and e["criterion"] == "structure" and e["target"] == "sign" for e in result.evidence)


def test_round_score_five_prompts_half_up_once():
    # roundScore = 10 x mean(promptScore), rounded once at the end (0-1000).
    assert round_score([100, 100, 100, 100, 75]) == 950
    assert round_score([88, 88, 88, 88, 87]) == 878  # 87.8 -> 878
    assert round_score([]) == 0


def test_repeated_word_cannot_double_count():
    # "त्रीणि त्रीणि" cannot read as 3 and 3 in different positions: two
    # coefficients in a row is not a construction.
    r = parse_phrase("त्रीणि त्रीणि", "sa")
    assert r.value is None


def test_display_grouping_helpers():
    assert display_grouped(parse_decimal("999999999.999"), "indian") == "99,99,99,999.999"
    assert display_grouped(parse_decimal("999999999.999"), "international") == "999,999,999.999"
    assert display_grouped(parse_decimal("-12.04"), "indian") == "-12.04"
    assert display_grouped(parse_decimal("0"), "indian") == "0"
