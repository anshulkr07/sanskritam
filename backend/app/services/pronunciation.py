"""Pronunciation scoring service (P3-2).

Grades a learner's akṣara pronunciation against the target using
contrast classes the ASR can reliably resolve.  Abstains (returns
'unsure') when the confidence is low or the contrast is not scorable.
"""

# Contrast pairs the grader is allowed to have an opinion about.
# Each key is a contrast name; the value is the set of Devanagari
# characters that participate in that contrast.
SCORABLE_CONTRASTS: dict[str, tuple[str, ...]] = {
    "retroflex_vs_dental": ("ट", "त", "ठ", "थ", "ड", "द", "ढ", "ध", "ण", "न"),
    "aspirated_vs_plain": ("क", "ख", "ग", "घ", "च", "छ", "ज", "झ", "ट", "ठ", "ड", "ढ", "त", "थ", "द", "ध", "प", "फ", "ब", "भ"),
    "sibilants": ("श", "ष", "स"),
    "vowel_length": ("अ", "आ", "इ", "ई", "उ", "ऊ"),
}


# Punctuation a transcriber wraps around a lone akṣara. saaras:v4 answers "त।"
# for a spoken त where saaras:v3 answered "त" — measured 2026-09-23, and
# compared exactly that turned most correct letters into "unsure". It says
# nothing about how the letter was said. The visarga (ः) IS a sound, and is
# not in this list.
_EDGE_PUNCTUATION = "।॥.,?!;:'\"“”‘’ \t\r\n"


def _find_contrast(ch: str) -> str | None:
    """Return the contrast class name for a character, or None."""
    for name, chars in SCORABLE_CONTRASTS.items():
        if ch in chars:
            return name
    return None


def score_pronunciation(target: str, transcript: str) -> dict:
    """Score a pronunciation attempt.

    Returns:
        dict with keys: verdict, contrast, confidence, abstained, diagnosis

    Verdict values: correct | near | incorrect | unsure.
    """
    target = target.strip()
    transcript = (transcript or "").strip(_EDGE_PUNCTUATION)

    # Silence / empty → unsure
    if not transcript:
        return {
            "verdict": "unsure",
            "contrast": "",
            "confidence": 0.0,
            "abstained": True,
            "diagnosis": "I couldn't hear anything — try again?",
        }

    # Hallucination guard: wild length difference
    if len(transcript) > len(target) * 3 and len(transcript) > 5:
        return {
            "verdict": "unsure",
            "contrast": "",
            "confidence": 0.0,
            "abstained": True,
            "diagnosis": "The audio was unclear — try again?",
        }

    # Exact match → correct
    if target == transcript:
        return {
            "verdict": "correct",
            "contrast": "",
            "confidence": 1.0,
            "abstained": False,
            "diagnosis": "Perfect!",
        }

    # Find the target's contrast class
    target_contrast = _find_contrast(target)
    if target_contrast is None:
        # Target is not in any scorable class → unsure
        return {
            "verdict": "unsure",
            "contrast": "",
            "confidence": 0.0,
            "abstained": True,
            "diagnosis": "I couldn't judge that clearly — try again?",
        }

    # Check if the transcript character that corresponds to the target
    # is in the same contrast class (but different character)
    # For simplicity: check if the first character of transcript is in
    # the same contrast class but different from target
    first_char = transcript[0] if transcript else ""
    if first_char and first_char != target and first_char in SCORABLE_CONTRASTS.get(target_contrast, ()):
        # Within-class mismatch → incorrect
        diagnosis_map = {
            "retroflex_vs_dental": "That was the dental *ta*; the target is the retroflex *ṭa* — tongue further back.",
            "aspirated_vs_plain": "The aspiration was off — try adding more breath.",
            "sibilants": "That sibilant was different — check your tongue position.",
            "vowel_length": "The vowel length was off — try holding it longer or shorter.",
        }
        return {
            "verdict": "incorrect",
            "contrast": target_contrast,
            "confidence": 0.8,
            "abstained": False,
            "diagnosis": diagnosis_map.get(target_contrast, "Try again with better articulation."),
        }

    # Mismatch outside any scorable class → unsure
    return {
        "verdict": "unsure",
        "contrast": "",
        "confidence": 0.0,
        "abstained": True,
        "diagnosis": "I couldn't judge that clearly — try again?",
    }