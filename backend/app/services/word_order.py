"""
Word-order service (P11-3) — the surface behind the "sentence that will not
break" proof (U7-4).

Free word order is the most distinctive fact about Sanskrit. Given a
graded-correct sentence, return the set of permutations that remain
grammatically equivalent (decided by the SAME ``analyze_sentence`` +
``feature_set_variants`` path the grader uses — never hand-written rules and
never touching analyzer.py, §2.1), plus per-word role endings and one *wrong*
ending per word ("what would this have changed it to mean?").

Length cap: enumerating n! permutations explodes. We refuse (explicitly, see
§2.11) beyond a small word count rather than silently truncating.
"""

from __future__ import annotations

import itertools
import logging

from app.grading.analyzer import (
    analyze_sentence,
    feature_set_variants,
    is_confident,
)

logger = logging.getLogger("shabd.word_order")

MAX_WORDS = 5


def _feature_keys(feature_set: dict[str, str]) -> frozenset[tuple[str, str]]:
    return frozenset(feature_set.items())


def _per_word_roles(sentence: str) -> list[dict]:
    """For each word, its primary parsed role and the ending that carries it."""
    results = analyze_sentence(sentence)
    out = []
    for r in results:
        # A parsed reading maps role -> feature (e.g. {'√gam': 'PRES.3SG'}).
        # The ending is the last morpheme of the parsed feature id, when present.
        role = None
        ending = None
        if r.parsed:
            # prefer the most content-bearing role
            role, feat = next(iter(r.parsed.items()))
            ending = feat.split(".")[-1] if feat else None
        out.append({
            "word": r.word,
            "role": role,
            "ending": ending,
        })
    return out


def equivalent_orders(sentence: str) -> dict:
    """Return equivalent permutations, per-word roles, and wrong endings."""
    empty = {"words": [], "equivalent_orders": [], "per_word": [],
             "wrong_endings": [], "refused": None}
    words = [w for w in sentence.split() if w.strip("।॥,!?")]
    if not words:
        return empty
    if len(words) > MAX_WORDS:
        return {
            **empty,
            "words": words,
            "refused": f"too many words ({len(words)}); maximum is {MAX_WORDS}",
        }

    # Reference feature-set spelling of the sentence. Equivalence = the two
    # orders are ambiguous reads of the same (role -> feature) mapping.
    try:
        ref_results = analyze_sentence(" ".join(words))
        if not ref_results or not is_confident(ref_results):
            return {**empty, "words": words}
        ref_variants = {_feature_keys(v) for v in feature_set_variants(ref_results)}
        ref_variants.add(_feature_keys(feature_set_from_results(ref_results)))
    except Exception as e:  # noqa: BLE001 - degrade, never raise
        logger.warning("word_order ref analysis failed: %s", e)
        return {**empty, "words": words}

    equivalent = []
    for perm in sorted(set(itertools.permutations(words))):
        perm_line = " ".join(perm)
        try:
            pres = analyze_sentence(perm_line)
            if not is_confident(pres):
                continue
            variants = {_feature_keys(v) for v in feature_set_variants(pres)}
            variants.add(_feature_keys(feature_set_from_results(pres)))
            if variants & ref_variants:
                equivalent.append(list(perm))
        except Exception:  # noqa: BLE001
            continue

    return {
        "words": words,
        "equivalent_orders": equivalent,
        "per_word": _per_word_roles(" ".join(words)),
        "wrong_endings": _wrong_endings(words),
        "refused": None,
    }


def feature_set_from_results(results) -> dict[str, str]:
    out = {}
    for r in results:
        if r.is_confident:
            for role, feat in r.parsed.items():
                out[role] = feat
    return out


def _wrong_endings(words: list[str]) -> list[dict]:
    """One illustrative wrong ending per word, with its semantic effect.

    A wrong vibhakti (e.g. NOM where DAT is required) usually just makes the
    sentence ungrammatical or changes the kāraka. We report the mismatch in
    human terms rather than inventing a translation.
    """
    out = []
    for w in words:
        results = analyze_sentence(w)
        if not results or not results[0].parsed:
            continue
        role, feat = next(iter(results[0].parsed.items()))
        parts = feat.split(".")
        if len(parts) < 2:
            continue
        # Build a plausible wrong ending by shifting the case slot.
        wrong = _shift_case(feat)
        out.append({
            "word": w,
            "role": role,
            "ending": parts[-1],
            "wrong_ending": wrong,
            "effect": _case_effect(parts[-1] if len(parts) == 1 else parts[0]),
        })
    return out


_CASE_EFFECT = {
    "NOM": "the word becomes the subject (who/what does the action)",
    "ACC": "the word becomes the direct object",
    "INSTR": "the word becomes the instrument/companion (with whom/by means)",
    "DAT": "the word becomes the recipient (for whom)",
    "ABL": "the word becomes the source (from where/of whom)",
    "GEN": "the word becomes the possessor ('of' the rest)",
    "LOC": "the word becomes the location (in/on/at)",
    "VOC": "the word becomes the addressee (being called to)",
}


def _case_effect(case: str) -> str:
    return _CASE_EFFECT.get(case, "the sentence's meaning or grammar changes")


def _shift_case(feat: str) -> str:
    parts = feat.split(".")
    if not parts:
        return feat
    order = ["NOM", "ACC", "INSTR", "DAT", "ABL", "GEN", "LOC", "VOC"]
    if parts[0] in order:
        nxt = order[(order.index(parts[0]) + 1) % len(order)]
        parts[0] = nxt
    return ".".join(parts)
