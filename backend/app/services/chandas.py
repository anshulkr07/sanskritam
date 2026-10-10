"""
Scansion service (P11-1) — derives the long/short rhythm from verse text alone.

Wraps ``vidyut.chandas`` (rule-based, local, ₹0 — no vendor call). Every śloka
therefore has a rhythm without anyone authoring one.

Degrades like ``prakriya``: unscannable input returns empty lines, never raises.

IMPORTANT (P11-1): ``padya`` (the metre NAME) is often None and that is not a
bug — anuṣṭubh is variable and is not a fixed entry in the 145-vṛtta table.
Never fill a missing metre name with a guess; the caller renders the rhythm
strip with no name.
"""

from __future__ import annotations

import logging
import os

import vidyut.lipi as _lipi

logger = logging.getLogger("shabd.chandas")

_chandas = None


def _data_path() -> str:
    from app.config import settings
    override = os.environ.get("VIDYUT_DATA_DIR", "") or getattr(settings, "vidyut_data_dir", "")
    if override:
        return os.path.join(override, "chandas", "meters.tsv")
    return os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
        "vidyut-data", "chandas", "meters.tsv",
    )


def _load():
    global _chandas
    if _chandas is not None:
        return
    from vidyut.chandas import Chandas
    try:
        with open(_data_path(), encoding="utf-8") as f:
            _chandas = Chandas.from_text(f.read())
    except FileNotFoundError:
        logger.warning("chandas data missing; scansion will return empty")
        _chandas = False


def _d2slp(text: str) -> str:
    return _lipi.transliterate(text, _lipi.Scheme.Devanagari, _lipi.Scheme.Slp1)


def scan(text: str) -> dict:
    """Scan a Devanagari verse line into its syllable weights.

    Returns ``{lines: [[{syllable_devanagari, weight}]], metre}`` where weight
    is ``G`` (guru/long) or ``L`` (laghu/short). Each akshara's text is
    transliterated back to Devanagari — the client renders, it does not convert.
    """
    empty = {"lines": [], "metre": None}
    if not text.strip():
        return empty
    try:
        _load()
        if not _chandas:
            return empty
        slp = _d2slp(text)
        match = _chandas.classify(slp)
        lines = []
        for line in match.aksharas:
            lines.append({
                "syllables": [
                    {
                        "syllable_devanagari": _lipi.transliterate(
                            a.text, _lipi.Scheme.Slp1, _lipi.Scheme.Devanagari
                        ),
                        "weight": a.weight,  # 'G' or 'L'
                    }
                    for a in line
                ]
            })
        return {
            "lines": lines,
            "metre": match.padya,  # often None — see module docstring
        }
    except BaseException as e:  # noqa: BLE001 - degrade, never raise.
        # The Rust engine panics (PanicException, a BaseException) on marks
        # outside its table (seen 2026-10-09 on a Katha verse); a metre that
        # stays absent is correct, a dead import is not.
        logger.warning("scansion failed for %r: %s", text, e)
        return empty
