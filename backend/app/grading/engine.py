"""
Grading engine: compare morphological feature sets, not strings.

Free word order: ग्रामं गच्छामि == गच्छामि ग्रामम्.
Abstention principle: never mark incorrect if the analyzer is uncertain.

Sandhi handling: we grade against both the raw text and a naively-split variant.
The splitter attempts common vowel sandhi splits (a + a -> ā, etc.).
We take the BEST verdict across all variants.
"""

from typing import Any, Optional

from app.grading.analyzer import (
    analyze_sentence,
    feature_set_from_results,
    feature_set_variants,
    is_confident,
)


def _feature_set_key(fs: dict[str, str]) -> frozenset[tuple[str, str]]:
    """Normalized key for feature-set comparison (order-independent)."""
    return frozenset((k, v) for k, v in sorted(fs.items()))


def grade_attempt(
    response_text: str,
    accepted_parses: list[dict[str, str]],
    expected_features: list[str],
    is_iast: bool = False,
) -> dict[str, Any]:
    """
    Grade a learner's attempt.

    Args:
        response_text: The learner's Sanskrit text (Devanagari or IAST).
        accepted_parses: List of accepted feature-set dicts.
        expected_features: List of feature IDs the challenge exercises.
        is_iast: Whether input is IAST (auto-detected if not specified).

    Returns:
        dict with verdict, parsed_features, diff, diagnosis, abstained, grammar_note
    """
    # Auto-detect IAST (if contains only ASCII + diacritics)
    if not is_iast:
        has_devanagari = any(ord(c) >= 0x0900 and ord(c) <= 0x097F for c in response_text)
        is_iast = not has_devanagari

    # Analyze
    results = analyze_sentence(response_text, is_iast=is_iast)

    # Check abstention
    abstained = not is_confident(results)

    # All valid readings (ambiguous endings produce alternatives).
    # Grade against EVERY variant; accept if any matches an accepted parse.
    variants = feature_set_variants(results)
    if not variants and not abstained:
        variants = [{}]
    primary = feature_set_from_results(results)

    # Compare every (variant, accepted) pair
    best_verdict = "incorrect"
    best_diff: list[dict] = []
    best_diagnosis = ""
    best_parsed = primary
    matched_expected = None

    for accepted in accepted_parses:
        accepted_key = _feature_set_key(accepted)

        for parsed in variants:
            parsed_key = _feature_set_key(parsed)

            if parsed_key == accepted_key:
                return {
                    "verdict": "correct",
                    "parsed_features": parsed,
                    "expected_features": accepted_parses,
                    "diff": [],
                    "diagnosis": "Correct!",
                    "grammar_note": None,
                    "abstained": False,
                    "matched_reading": parsed,
                }

            diff = _compute_diff(parsed, accepted)
            if len(diff) == 1 and not abstained:
                one_off = diff[0]
                diagnosis = _generate_diagnosis(one_off)
                if best_verdict != "off_by_one" or len(diff) < len(best_diff):
                    best_verdict = "off_by_one"
                    best_diff = diff
                    best_diagnosis = diagnosis
                    best_parsed = parsed
                    matched_expected = accepted
            elif len(diff) < len(best_diff) or not best_diff:
                best_diff = diff
                best_parsed = parsed
                matched_expected = accepted

    if best_verdict == "incorrect" and not abstained:
        best_diagnosis = best_diagnosis or "Incorrect — several features don't match."

    if abstained:
        best_verdict = "incorrect"
        best_diagnosis = ("Could not parse confidently — "
                          "some words were unrecognized. Never mark incorrect on uncertainty.")

    # Build grammar note
    grammar_note = None
    if best_verdict == "off_by_one" and matched_expected:
        grammar_note = _build_grammar_note(best_diff, matched_expected)

    return {
        "verdict": best_verdict,
        "parsed_features": best_parsed,
        "expected_features": accepted_parses,
        "diff": best_diff,
        "diagnosis": best_diagnosis,
        "grammar_note": grammar_note,
        "abstained": abstained,
    }


def _compute_diff(
    parsed: dict[str, str],
    expected: dict[str, str],
) -> list[dict[str, Any]]:
    """Compute symmetric difference between parsed and expected feature sets."""
    diff = []
    parsed_keys = set(parsed.keys())
    expected_keys = set(expected.keys())

    # Keys in expected but not in parsed
    for k in expected_keys - parsed_keys:
        diff.append({
            "feature": k,
            "expected": expected[k],
            "actual": None,
            "type": "missing",
        })

    # Keys in parsed but not in expected
    for k in parsed_keys - expected_keys:
        diff.append({
            "feature": k,
            "expected": None,
            "actual": parsed[k],
            "type": "extra",
        })

    # Keys in both but different values
    for k in parsed_keys & expected_keys:
        if parsed[k] != expected[k]:
            diff.append({
                "feature": k,
                "expected": expected[k],
                "actual": parsed[k],
                "type": "mismatch",
            })

    return diff


def _generate_diagnosis(diff_item: dict) -> str:
    """Generate a human-readable diagnosis for a single feature difference."""
    ftype = diff_item.get("type", "")
    feature = diff_item.get("feature", "")
    expected = diff_item.get("expected", "")
    actual = diff_item.get("actual", "")

    if ftype == "missing":
        return f"The word '{feature}' should take the case form '{expected}'"
    elif ftype == "extra":
        return f"Unexpected word '{feature}' with form '{actual}'"
    elif ftype == "mismatch":
        return (f"The word '{feature}' should be in '{expected}' "
                f"(not '{actual}')")
    return "A feature doesn't match."


def _build_grammar_note(
    diff: list[dict],
    matched: dict[str, str],
) -> Optional[dict[str, Any]]:
    """Build a grammar explanation for the learner."""
    if not diff:
        return None
    item = diff[0]
    return {
        "feature": item.get("feature", ""),
        "expected": item.get("expected", ""),
        "actual": item.get("actual", ""),
        "note": f"'{item.get('feature', '')}' takes {item.get('expected', '')} form. "
                f"You used {item.get('actual', '(none)')}."
    }