"""Golden Number Builder fixtures — a release requirement (brief §4.7/§15).

Every fixture pins: exact round-trip (compose -> parse -> same canonical
string), the display groupings, the reviewed readings, and the scoring
behaviour for the rubric examples. The owner's number 104847322.34 is the
canonical worked example. Fixture values (§15):

0, 1, 19, 20, 21, 48, 99, 100, 101, 1000, 100001, 10000000, 104847322.34,
999999999.999, -12.04, 0.04, 10.00, 100.340
"""

from __future__ import annotations

from dataclasses import dataclass

from .render import correct_reading, parse_phrase, render_phrase
from .structure import DecimalNumber, display_grouped, parse_decimal

OWNER_EXAMPLE = "104847322.34"

ROUND_TRIP_VALUES = [
    "0", "1", "19", "20", "21", "48", "99", "100", "101", "1000",
    "100001", "10000000", "104847322.34", "999999999.999",
    "-12.04", "0.04", "10.00", "100.340",
]


@dataclass(frozen=True)
class Fixture:
    canonical: str
    grouping: str  # the grouping its readings use
    lang: str
    reading: str  # the primary reviewed reading (primary surfaces)
    alternative: str  # an accepted variant reading, when one exists
    indian_display: str
    international_display: str


def _number(canonical: str) -> DecimalNumber:
    return parse_decimal(canonical)


def fixture_round_trip() -> list[dict]:
    """Compose the correct selections for every fixture and parse them back."""
    from .structure import build_skeleton
    from .lexicon import get_lexicon

    results = []
    for canonical in ROUND_TRIP_VALUES:
        value = _number(canonical)
        for lang in ("sa", "en"):
            for grouping in (("indian",) if lang == "sa" else ("indian", "international")):
                skeleton = build_skeleton(value, grouping, include_sign=value.negative)
                lex = get_lexicon(lang)
                selections: dict[str, str] = {}
                for slot in skeleton:
                    kind = slot["kind"]
                    if kind == "sign":
                        selections[slot["id"]] = f"{lang}:sign:negative"
                    elif kind in ("coef", "unit"):
                        for e in lex.entries_for_context("coef"):
                            if e.value == slot["value"]:
                                selections[slot["id"]] = e.semantic_id
                                break
                    elif kind == "scale":
                        selections[slot["id"]] = f"{lang}:scale:{slot['group']}"
                    elif kind == "marker":
                        selections[slot["id"]] = f"{lang}:marker:decimal"
                    elif kind == "digit":
                        for e in lex.entries_for_context("digit"):
                            if e.value == slot["value"]:
                                selections[slot["id"]] = e.semantic_id
                                break
                phrase = render_phrase(lang, selections, skeleton)
                parsed = parse_phrase(phrase, lang)
                expected = value.canonical if (value.negative and not value.is_zero) or not value.negative else value.canonical
                results.append({
                    "canonical": canonical,
                    "lang": lang,
                    "grouping": grouping,
                    "phrase": phrase,
                    "parsed": parsed.value.canonical if parsed.value else None,
                    "ok": bool(parsed.value and parsed.value.canonical == expected.lstrip("+")),
                })
    return results


def owner_example_expectations() -> dict:
    value = _number(OWNER_EXAMPLE)
    return {
        "international_display": display_grouped(value, "international"),
        "indian_display": display_grouped(value, "indian"),
        "english_international": correct_reading(value, "international", "en"),
        "english_indian": correct_reading(value, "indian", "en"),
        "sanskrit": correct_reading(value, "indian", "sa"),
        "decomposition": "10 × 10^7 + 48 × 10^5 + 47 × 10^3 + 3 × 10^2 + 22 + 3/10 + 4/100",
    }


def scoring_fixtures() -> list[dict]:
    """The rubric examples from §4.7, as executable expectations."""
    return [
        {"name": "fully-correct", "canonical": OWNER_EXAMPLE,
         "c": 1.0, "s": 1.0, "l": 1.0, "expect_score": 100},
        {"name": "one-of-five-values-wrong", "c": 0.8, "s": 1.0, "l": 1.0,
         "expect_score": 88},
        {"name": "half-structure", "c": 1.0, "s": 0.5, "l": 1.0,
         "expect_score": 88},
        {"name": "blank", "c": 0.0, "s": 0.0, "l": 0.0, "expect_score": 0},
    ]
