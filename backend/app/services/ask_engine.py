"""P19-2 — engine-first routing for ask-anywhere.

A learner stuck on a grammar screen asks about a sandhi join, a case ending, a
verse rhythm, or a word — and four LOCAL engines answer those deterministically
for ₹0 (§2.7: Vidyut is a rule library, not a model; §2.9: never meter a
grammar route). The model is measurably the WORST tool for the job: Sarvam
false-accuses ~50% of dual-bearing lines (§2.6) at ₹0.0055 a call.

Route by what is being asked:

  | the learner is looking at | answered by            |
  |---------------------------|------------------------|
  | a sandhi join             | services/sandhi.py     |
  | a verb or noun form       | services/prakriya.py   |
  | a verse's rhythm          | services/chandas.py    |
  | a word in a sentence      | chedaka + kosha        |
  | anything else (meaning)   | the explainer (LLM)    |

Two standing rules, both non-negotiable:
  • The derivation is an ADDITION to the LLM path, never a replacement
    (owner ruling) — derivation answers grammar, the model answers meaning.
  • Absent is absent: chandas returns None for anuṣṭubh's metre name, so the
    response carries the scansion and says nothing about a name (§6).

A route that falls through to the model records ``routed_to="llm"`` in the
response metadata, so the split is measurable rather than assumed (P19-2
acceptance).
"""

from __future__ import annotations

import logging
import re
from typing import Optional

from app.grading.analyzer import (
    AnalyzerResult,
    analyze_sentence,
    normalize_to_slp1,
)
from app.services import chandas, prakriya, sandhi
from app.services.iast import to_iast

logger = logging.getLogger("shabd.ask_engine")

_DEVANAGARI = re.compile(r"[\u0900-\u097F]")
# Surface endings that suggest the learner is asking about a word FORM
# (grammar), not the sentence's meaning.
_WORDish = re.compile(r"^[\u0900-\u097F\s।॥,.!?-]+$")

_SURFACE_HINTS = {
    "sandhi": "sandhi",
    "grammar": "word",
    "scansion": "verse",
    "verse": "verse",
    "challenge": "sentence",
    "conversation": "sentence",
    "varnamala": "word",
    "path": "sentence",
    "home": "sentence",
    "shloka": "verse",
}


class EngineAnswer(dict):
    """A dict with a guaranteed ``routed_to`` key, so callers can't drop it."""


def _engine_answer(routed_to: str, title: str, blocks: list[dict],
                   subject: str, note: str = "") -> EngineAnswer:
    """blocks: [{kind: 'derivation'|'scansion'|'split'|'parse'|'info', ...}]."""
    return EngineAnswer(
        routed_to=routed_to,
        title=title,
        blocks=blocks,
        subject=subject,
        note=note,
    )


# ── helpers ──────────────────────────────────────────────────────────────────

def _derive_word_form(word: str, parsed: dict) -> Optional[dict]:
    """Try to produce a prakriyā for one analyzed word form.

    ``parsed`` maps {stem_or_root_iast: 'FEATURE'}. For a noun the key is the
    stem (resolved against all three liṅgas — the kosha's is not unanimous,
    §2.1 — and the derivation matching the queried surface wins); for a verb
    the key is '√root' with a tense feature.
    Returns the derive() dict or None when the engine cannot derive it.
    """
    for stem, feat in parsed.items():
        if not isinstance(feat, str) or "." not in feat:
            continue
        case, number = feat.split(".", 1)
        # noun path — stem needs Devanagari for prakriya.derive
        stem_dev = _iast_to_dev(stem)
        if not stem_dev:
            continue
        vib = {"NOM": "Prathama", "ACC": "Dvitiya", "INSTR": "Trtiya",
               "DAT": "Chaturthi", "ABL": "Panchami", "GEN": "Shashthi",
               "LOC": "Saptami", "VOC": "Sambodhana"}.get(case)
        vac = {"SG": "Eka", "DU": "Dvi", "PL": "Bahu"}.get(number)
        if vib is None or vac is None:
            continue
        best = None
        for linga in ("Pum", "Stri", "Napumsaka"):
            der = prakriya.derive(pratipadika=stem_dev, linga=linga,
                                  vibhakti=vib, vacana=vac)
            if der.get("result"):
                if best is None:
                    best = der  # first derivation that works
                if der["result"].strip("।") == word.strip("।"):
                    best = der
                    break
        if best is not None:
            return best

        # verb path — '√dṛś'-style root with a tense/person/number feature
        if stem.startswith("√"):
            root_dev = _iast_to_dev(stem[1:])
            if root_dev:
                der = prakriya.derive(dhatu=root_dev, lakara="Lat")
                if der.get("result"):
                    return der
    return None


def _iast_to_dev(text: str) -> str:
    """IAST → Devanagari via the same lipi seam everything else uses."""
    from app.grading.analyzer import iast_to_devanagari

    out = iast_to_devanagari(text)
    return out if _DEVANAGARI.search(out or "") else ""


def _word_answer(subject: str) -> Optional[EngineAnswer]:
    """A word or short form — the analyzer + prakriya answer it."""
    clean = subject.strip("।॥,.!? ").strip()
    if not clean or not _DEVANAGARI.search(clean):
        return None
    if len(clean.split()) > 3:
        return None  # a sentence, not a word form

    try:
        results = [r for r in analyze_sentence(clean) if isinstance(r, AnalyzerResult)]
    except Exception as e:  # noqa: BLE001 — engines degrade, never raise
        logger.warning("ask-engine analyze failed for %r: %s", clean, e)
        return None
    confident = [r for r in results if r.is_confident]
    if not confident:
        return None

    blocks: list[dict] = []
    for r in confident:
        parsed = dict(r.parsed)
        if not parsed:
            continue
        reading = next(iter(parsed.items()), (None, None))
        stem, feat = reading
        block: dict = {
            "kind": "parse",
            "word": r.word,
            "iast": to_iast(r.word),
            "stem": stem,
            "feature": feat,
        }
        der = _derive_word_form(r.word, parsed)
        if der and der.get("steps"):
            block["derivation"] = {
                "result": der["result"],
                "step_count": der["step_count"],
                "steps": [
                    {"code": s["code"],
                     "sutra": s.get("sutra_devanagari") or s.get("sutra_text", ""),
                     "result": s["result"]}
                    for s in der["steps"]
                ],
            }
        blocks.append(block)

    if not blocks:
        return None
    return _engine_answer(
        routed_to="engine",
        title="Morphology",
        blocks=blocks,
        subject=clean,
        note="Derivation shown where the engine can derive the form.",
    )


def _sandhi_answer(subject: str) -> Optional[EngineAnswer]:
    """A joined form — services/sandhi.py splits it, ₹0."""
    clean = subject.strip("।॥,.!? ").strip()
    if not clean or " " in clean or len(clean) < 3:
        return None
    candidates = sandhi.split_candidates(clean)
    lexical = [c for c in candidates if c["first_valid"] and c["second_valid"]]
    if not lexical:
        return None
    return _engine_answer(
        routed_to="engine",
        title="Sandhi split",
        blocks=[{
            "kind": "split",
            "joined": clean,
            "splits": [
                {"first": c["first"], "second": c["second"],
                 "first_iast": to_iast(c["first"]),
                 "second_iast": to_iast(c["second"])}
                for c in lexical[:4]
            ],
        }],
        subject=clean,
    )


def _verse_answer(subject: str) -> Optional[EngineAnswer]:
    """A verse line — services/chandas.py scans it. Absent is absent: when the
    metre name is None the response simply carries no metre name (§6)."""
    clean = subject.strip()
    if not clean or not _DEVANAGARI.search(clean):
        return None
    if len(clean) < 8:
        return None  # too short to be a line someone wants scanned
    result = chandas.scan(clean)
    lines = result.get("lines") or []
    if not lines:
        return None
    block: dict = {"kind": "scansion", "lines": lines}
    metre = result.get("metre")  # often None — never fill it with a guess
    if metre:
        block["metre"] = metre
    return _engine_answer(
        routed_to="engine",
        title="Scansion",
        blocks=[block],
        subject=clean,
    )


def _sentence_answer(subject: str) -> Optional[EngineAnswer]:
    """A full sentence — chedaka+analyzer give the per-word parse; that is the
    honest engine answer for 'what are the words here'."""
    clean = subject.strip("।॥,.!? ").strip()
    if not clean or not _DEVANAGARI.search(clean):
        return None
    words = clean.split()
    if len(words) < 2:
        return None
    try:
        results = [r for r in analyze_sentence(clean) if r.is_confident]
    except Exception as e:  # noqa: BLE001
        logger.warning("ask-engine sentence analyze failed for %r: %s", clean, e)
        return None
    if not results:
        return None
    blocks = [{
        "kind": "parse",
        "word": r.word,
        "iast": to_iast(r.word),
        "feature": next(iter(r.parsed.values()), ""),
        "stem": next(iter(r.parsed.keys()), ""),
    } for r in results]
    return _engine_answer(
        routed_to="engine",
        title="Word by word",
        blocks=blocks,
        subject=clean,
    )


# ── the router ───────────────────────────────────────────────────────────────

def route(surface: str, subject: str, question: str) -> Optional[EngineAnswer]:
    """Answer from the engines when the question is a grammar question.

    Returns None when the engines have nothing honest to say — the caller then
    decides (LLM explainer, or the honest 'no engine answer' path). Routing is
    by what the subject IS, first; by the surface's nature, second.
    """
    subj = (subject or "").strip()
    if not subj:
        return None
    surf = (surface or "").lower()

    # 1. A joined form with no spaces is the classic sandhi question.
    a = _sandhi_answer(subj)
    if a is not None:
        return a

    # 2. A multi-word Devanagari line on a verse-y surface is a scansion ask —
    #    but only when it is actually scannable; a sentence falls through.
    if len(subj.split()) >= 4 or surf in ("shloka", "verse", "scansion"):
        a = _verse_answer(subj)
        if a is not None:
            return a

    # 3. A single word or short form is a morphology ask.
    a = _word_answer(subj)
    if a is not None:
        return a

    # 4. A full sentence gets a word-by-word parse.
    a = _sentence_answer(subj)
    if a is not None:
        return a

    return None
