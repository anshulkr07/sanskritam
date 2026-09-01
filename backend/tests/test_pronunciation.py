"""Tests for pronunciation scoring service (P3-2).

Pure function tests — no network, no DB.
"""

from app.services.pronunciation import score_pronunciation


# ── Exact match ────────────────────────────────────────

def test_exact_match_returns_correct():
    """Exact match → correct, high confidence."""
    result = score_pronunciation("क", "क")
    assert result["verdict"] == "correct"
    assert result["confidence"] == 1.0
    assert result["abstained"] is False


# ── Silence / empty ────────────────────────────────────

def test_silence_returns_unsure():
    """Empty transcript → unsure, abstained=True."""
    result = score_pronunciation("क", "")
    assert result["verdict"] == "unsure"
    assert result["abstained"] is True


def test_whitespace_returns_unsure():
    """Whitespace-only transcript → unsure."""
    result = score_pronunciation("क", "   ")
    assert result["verdict"] == "unsure"
    assert result["abstained"] is True


# ── Hallucination guard ────────────────────────────────

def test_hallucinated_long_transcript_returns_unsure():
    """Transcript much longer than target → unsure."""
    result = score_pronunciation("क", "कृपया भवान् कथम् अस्ति")
    assert result["verdict"] == "unsure"
    assert result["abstained"] is True


# ── Contrast classes ───────────────────────────────────

def test_retroflex_vs_dental_incorrect():
    """Dental ta vs retroflex ṭa → incorrect."""
    result = score_pronunciation("ट", "त")
    assert result["verdict"] == "incorrect"
    assert result["contrast"] == "retroflex_vs_dental"
    assert result["abstained"] is False


def test_aspirated_vs_plain_incorrect():
    """Plain ka vs aspirated kha → incorrect."""
    result = score_pronunciation("ख", "क")
    assert result["verdict"] == "incorrect"
    assert result["contrast"] == "aspirated_vs_plain"
    assert result["abstained"] is False


def test_sibilant_incorrect():
    """Sibilant śa vs ṣa → incorrect."""
    result = score_pronunciation("ष", "श")
    assert result["verdict"] == "incorrect"
    assert result["contrast"] == "sibilants"
    assert result["abstained"] is False


def test_vowel_length_incorrect():
    """Short a vs long ā → incorrect."""
    result = score_pronunciation("आ", "अ")
    assert result["verdict"] == "incorrect"
    assert result["contrast"] == "vowel_length"
    assert result["abstained"] is False


# ── Out-of-class substitutions ─────────────────────────

def test_out_of_class_substitution_returns_unsure():
    """Substitution outside any scorable class → unsure, abstained."""
    # य and र are not in any scorable contrast class
    result = score_pronunciation("य", "र")
    assert result["verdict"] == "unsure"
    assert result["abstained"] is True


def test_non_scorable_target_returns_unsure():
    """Target not in any scorable contrast → unsure."""
    result = score_pronunciation("य", "य")
    assert result["verdict"] == "correct", "Same char should be correct"
    result = score_pronunciation("य", "व")
    assert result["verdict"] == "unsure", "Non-scorable mismatch should be unsure"


# ── Abstention guarantees ──────────────────────────────

def test_never_incorrect_with_abstained():
    """No input path can return incorrect while abstained=True."""
    # Exhaustive over known test inputs
    for target, transcript in [
        ("क", ""),
        ("क", "  "),
        ("क", "बहुतलम्बापाठः"),
        ("ल", "र"),
    ]:
        result = score_pronunciation(target, transcript)
        if result["abstained"]:
            assert result["verdict"] != "incorrect", (
                f"abstained=True with verdict='{result['verdict']}' "
                f"for target='{target}' transcript='{transcript}'"
            )


def test_near_miss_returns_incorrect_verdict():
    """Near miss within contrast class should be incorrect, not unsure."""
    result = score_pronunciation("ट", "त")
    assert result["verdict"] == "incorrect"
    result = score_pronunciation("श", "ष")
    assert result["verdict"] == "incorrect"