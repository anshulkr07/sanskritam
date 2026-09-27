"""
Sandhi service (P11-2) — split a joined Devanagari form into its constituents.

Wraps ``vidyut.sandhi`` + ``vidyut.kosha`` (rule-based, local, ₹0 — no quota).
``split_at`` returns candidates whose ``is_valid`` is a *phonetic* check, not a
lexical one — it happily returns real-sounding non-words. The kosha filter is
what makes the output usable: we rank valid splits by whether BOTH halves
resolve in the lexicon.

For the JOIN direction (and the named rule like 6.1.87 आद्गुणः), the caller
uses ``prakriya``, not this module (HANDOVER P11-2.3).
"""

from __future__ import annotations

import logging
import os

import vidyut.lipi as _lipi

logger = logging.getLogger("shabd.sandhi")

_splitter = None
_kosha = None


def _data_dir() -> str:
    from app.config import settings
    override = os.environ.get("VIDYUT_DATA_DIR", "") or getattr(settings, "vidyut_data_dir", "")
    if override:
        return override
    return os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
        "vidyut-data",
    )


def _load():
    global _splitter, _kosha
    if _splitter is not None:
        return
    from vidyut.sandhi import Splitter
    from vidyut.kosha import Kosha
    base = _data_dir()
    try:
        _splitter = Splitter.from_csv(os.path.join(base, "sandhi", "rules.csv"))
        _kosha = Kosha(os.path.join(base, "kosha"))
    except FileNotFoundError:
        logger.warning("sandhi/kosha data missing")
        _splitter = False
        _kosha = False


def _d2slp(text: str) -> str:
    return _lipi.transliterate(text, _lipi.Scheme.Devanagari, _lipi.Scheme.Slp1)


def _s2d(text: str) -> str:
    return _lipi.transliterate(text, _lipi.Scheme.Slp1, _lipi.Scheme.Devanagari)


def _known(word: str) -> bool:
    """True when the SLP1 word resolves in the kosha."""
    if not word:
        return False
    return len(_kosha.get(word)) > 0


def is_known_word(word: str) -> bool:
    """True when a Devanagari word resolves in the kosha. False without the
    data, and never raises — callers use it to rank, not to gate."""
    if not word or not word.strip():
        return False
    try:
        _load()
        return bool(_kosha) and _known(_d2slp(word.strip()))
    except Exception as e:  # noqa: BLE001 - degrade, never raise
        logger.warning("kosha lookup failed for %r: %s", word, e)
        return False


def split_candidates(joined: str) -> list[dict]:
    """Return the ranked, lexical split candidates for a joined Devanagari form.

    Each: ``{first, second, first_valid, second_valid}``. Ranked so the split
    where BOTH halves resolve in the kosha comes first; purely-phonetic splits
    follow. Empty list when no valid split exists (never raises).
    """
    empty: list[dict] = []
    if not joined.strip():
        return empty
    try:
        _load()
        if not _splitter or not _kosha:
            return empty
        slp = _d2slp(joined)
        out = []
        for i in range(1, len(slp)):
            for sp in _splitter.split_at(slp, i):
                if not sp.is_valid:
                    continue
                f, s = sp.first, sp.second
                out.append({
                    "first": _s2d(f),
                    "second": _s2d(s),
                    "first_valid": _known(f),
                    "second_valid": _known(s),
                })
        # Dedup and rank: both-known first, then one-known, then phonetic-only
        seen = set()
        ranked = []
        for c in out:
            key = (c["first"], c["second"])
            if key in seen:
                continue
            seen.add(key)
            ranked.append(c)
        ranked.sort(key=lambda c: -((c["first_valid"] and c["second_valid"]) * 2
                                    + (c["first_valid"] or c["second_valid"])))
        return ranked
    except Exception as e:  # noqa: BLE001 - degrade, never raise
        logger.warning("sandhi split failed for %r: %s", joined, e)
        return empty


def rule_splits(joined: str) -> list[tuple[str, str]]:
    """Every phonetically valid split of a joined form, as Devanagari pairs.

    No lexicon filter — this is the sandhi rule table's own answer. The
    grammar guide verifies its sandhi claims with it, because compound halves
    (विद्या + आलयः's विद्या-) are stems, not dictionary words. Final visarga
    comes back as स्/र् (रामस् + च). Never raises.
    """
    if not joined.strip():
        return []
    try:
        _load()
        if not _splitter:
            return []
        slp = _d2slp(joined.replace(" ", ""))
        out: list[tuple[str, str]] = []
        for i in range(1, len(slp)):
            for sp in _splitter.split_at(slp, i):
                if sp.is_valid:
                    out.append((_s2d(sp.first), _s2d(sp.second)))
        return list(dict.fromkeys(out))
    except Exception as e:  # noqa: BLE001 - degrade, never raise
        logger.warning("sandhi rule split failed for %r: %s", joined, e)
        return []
