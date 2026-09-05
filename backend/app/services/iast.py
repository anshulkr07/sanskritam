"""Canonical IAST (P7-13): every transliteration is `lipi`'s, never a model's.

Measured 2026-09-05: 130 of 264 challenge rows carried IAST that disagreed with
``vidyut.lipi`` on the same Devanagari — dropped vowel length, transposed
letters, ITRANS-style output, one U+15BA glyph. The cause was asking the LLM
for a transliteration that a library call computes correctly for ₹0. This
module is the single seam for stored IAST:

  • ``to_iast(dev)``       — the oracle: ``grading.analyzer.devanagari_to_iast``
                             (the same vidyut.lipi call the frozen analyzer
                             already uses; called, not reimplemented).
  • ``normalize(text)``    — the comparison form: NFC, casefolded, with danda
                             (। ॥) and the periods lipi renders them to removed.
                             Whitespace is NOT stripped — the stored IAST must
                             mirror the Devanagari word-for-word.
  • ``matches(dev, iast)`` — the content invariant, free oracle.

Never "fix" a mismatch by editing the Devanagari to match the IAST: the
Devanagari passed the Vidyut gate; the IAST did not pass anything.
"""

from __future__ import annotations

import unicodedata

# danda + double danda + the ASCII period lipi renders them to.
_DANDA = str.maketrans("", "", "।॥.·")


def to_iast(devanagari: str) -> str:
    """The only way stored IAST is produced (P7-13)."""
    from app.grading.analyzer import devanagari_to_iast

    return devanagari_to_iast(devanagari or "")


def normalize(text: str) -> str:
    """Comparison form: NFC, casefolded, danda/period-stripped.

    Whitespace is preserved so a stored IAST that claims word divisions the
    Devanagari does not have (or vice versa) still counts as a mismatch.
    """
    t = unicodedata.normalize("NFC", text or "")
    t = t.translate(_DANDA)
    return t.casefold().strip()


def matches(devanagari: str, iast: str) -> bool:
    """True when `iast` is what lipi produces from `devanagari` (danda-insensitive)."""
    return normalize(to_iast(devanagari)) == normalize(iast)
