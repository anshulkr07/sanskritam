"""
Grading engine: compare morphological feature sets, not strings.

Free word order: ग्रामं गच्छामि == गच्छामि ग्रामम्.
Abstention principle (spec §6.3): when the analyzer is not confident, the
verdict is "unsure" — never "incorrect". "unsure" carries no adaptive penalty
(no streak reset, no mastery decay, no ratio change); a false accusation is
worse than a missing verdict.

Verdicts: "correct" | "off_by_one" | "incorrect" | "unsure".
Morphological ambiguity (au/e/oḥ/ām endings...) is handled upstream by the
analyzer's alternatives; here every valid reading is tried against the
accepted parses, so ambiguity never falsely accuses.
"""

from typing import Any, Optional

from app.grading.analyzer import (
    analyze_sentence,
    detect_script,
    feature_set_from_results,
    feature_set_variants,
    is_confident,
)


def _feature_set_key(fs: dict[str, str]) -> frozenset[tuple[str, str]]:
    """Normalized key for feature-set comparison (order-independent)."""
    return frozenset((k, v) for k, v in sorted(fs.items()))


# ─── Feature → English glosses (diagnosis is the product — spec §7.2) ───

_CASE_EN = {
    "NOM": "nominative (subject)", "ACC": "accusative (object)",
    "INSTR": "instrumental ('with/by')", "DAT": "dative ('to/for')",
    "ABL": "ablative ('from')", "GEN": "genitive ('of')",
    "LOC": "locative ('in/on')", "VOC": "vocative (addressing)",
}
_NUMBER_EN = {"SG": "singular", "DU": "dual", "PL": "plural"}
_TENSE_EN = {
    "PRES": "present", "IMPF": "imperfect", "FUT": "future", "IMP": "imperative",
    "OPT": "optative", "AOR": "aorist", "PERF": "perfect",
}
_PERSON_EN = {"1": "1st person", "2": "2nd person", "3": "3rd person"}


def _format_feature(feat: Optional[str]) -> str:
    """'ACC.SG' -> 'the accusative (object) singular (ACC.SG)'.
    'PRES.1SG' -> 'the present 1st person singular (PRES.1SG)'.
    Unknown keys fall back to the raw value."""
    if not feat:
        return "(none)"
    parts = feat.split(".")
    head = parts[0]
    if head in _TENSE_EN:
        rest = parts[1] if len(parts) > 1 else ""
        person = _PERSON_EN.get(rest[:1], "")
        number = _NUMBER_EN.get(rest[1:], "") if len(rest) > 1 else ""
        bits = " ".join(b for b in (_TENSE_EN[head], person, number) if b)
        return f"the {bits} ({feat})"
    if head in _CASE_EN:
        number = _NUMBER_EN.get(parts[1], "") if len(parts) > 1 else ""
        return f"the {_CASE_EN[head]} {number} ({feat})".strip()
    return f"'{feat}'"


def _role_noun(feature_key: str) -> str:
    """Human word for the diff key: roots ('√khād') are verbs, others are words."""
    if feature_key.startswith("√"):
        return f"the verb '{feature_key}'"
    return f"the word '{feature_key}'"


def grade_attempt(
    response_text: str,
    accepted_parses: list[dict[str, str]],
    expected_features: list[str],
    is_iast: bool = False,
) -> dict[str, Any]:
    """
    Grade a learner's attempt.

    Args:
        response_text: The learner's Sanskrit text (Devanagari, IAST, or a mix).
        accepted_parses: List of accepted feature-set dicts.
        expected_features: Feature IDs this challenge exercises. Used to pick
            which feature the grammar note explains when several differ.
        is_iast: Whether input is IAST (auto-detected if not specified).

    Returns:
        dict with verdict, parsed_features, diff, diagnosis, abstained,
        grammar_note, accepted_parses (the accepted feature-sets).
    """
    # Auto-detect script; mixed-script text is handled per-word by the analyzer.
    if not is_iast:
        is_iast = detect_script(response_text) != "dev"

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
                    "accepted_parses": accepted_parses,
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
        # Abstention principle: uncertainty is NOT incorrectness. The learner
        # did nothing provably wrong, so the verdict carries no penalty.
        best_verdict = "unsure"
        best_diagnosis = ("Some words couldn't be read confidently, so this isn't "
                          "graded as right or wrong. Check spelling (Devanagari or "
                          "IAST) and try again.")

    # Build grammar note
    grammar_note = None
    if best_verdict == "off_by_one" and matched_expected:
        grammar_note = _build_grammar_note(best_diff, matched_expected, expected_features)

    return {
        "verdict": best_verdict,
        "parsed_features": best_parsed,
        "accepted_parses": accepted_parses,
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
    expected = diff_item.get("expected")
    actual = diff_item.get("actual")

    if ftype == "missing":
        return (f"{_role_noun(feature)} should take "
                f"{_format_feature(expected)}.")
    elif ftype == "extra":
        return f"Unexpected form: {_role_noun(feature)} reads as {_format_feature(actual)}."
    elif ftype == "mismatch":
        return (f"{_role_noun(feature)} should be in "
                f"{_format_feature(expected)} — you used {_format_feature(actual)}.")
    return "A feature doesn't match."


def _build_grammar_note(
    diff: list[dict],
    matched: dict[str, str],
    expected_features: Optional[list[str]] = None,
) -> Optional[dict[str, Any]]:
    """Build a grammar explanation for the learner.

    When several features differ, prefer the one this challenge actually
    teaches (a member of expected_features) — the note should explain the
    exercise, not an incidental difference.
    """
    if not diff:
        return None
    item = diff[0]
    taught = set(expected_features or [])
    for d in diff:
        if (d.get("expected") or "") in taught or (d.get("actual") or "") in taught:
            item = d
            break
    return {
        "feature": item.get("feature", ""),
        "expected": item.get("expected", ""),
        "actual": item.get("actual", ""),
        "note": f"{_role_noun(item.get('feature', ''))} takes "
                f"{_format_feature(item.get('expected'))}. "
                f"You used {_format_feature(item.get('actual'))}."
    }
