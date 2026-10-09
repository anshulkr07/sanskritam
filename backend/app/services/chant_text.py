"""Chant text: the one function that decides chant lines.

Used by the export (what is rendered), the API (what the phone highlights)
and scoring (what is compared). Pure: only re, unicodedata, hashlib.

Section 4.1 verse_uid + section 4.2 chant_lines of handover_recite.md.
"""

from __future__ import annotations

import hashlib
import re
import unicodedata


def verse_uid(source_ref: str, devanagari: str) -> str:
    norm = re.sub(r"\s+", " ", unicodedata.normalize("NFC", devanagari or "")).strip()
    key = (source_ref or "").strip() + "|" + norm
    return hashlib.sha1(key.encode("utf-8")).hexdigest()[:16]


_DANDA_SPLIT = re.compile(r"(?<=[\u0964\u0965])")

# Keep only Devanagari letters/signs for core(); verse numbers carry only
# dandas, digits, spaces, slashes and punctuation.
_CORE_KEEP = re.compile(r"[\u0900-\u0963\u0971-\u097F]")
_UVACHA = re.compile(r"^(?:\S+ ){0,3}\S*उवाच$")

_PAREN = re.compile(r"\([^()]*\)")
_BRACKET = re.compile(r"\[[^\[\]]*\]")

# Vedic accents + joiners removed for TTS.
_TTS_REMOVE = (
    "\u200d\u200c"  # ZWJ ZWNJ
    "\u0951\u0952\u0953\u0954"
)


def _tts_of(piece: str) -> str:
    p = _PAREN.sub(" ", piece)
    p = _BRACKET.sub(" ", p)
    for ch in _TTS_REMOVE:
        p = p.replace(ch, "")
    # Strip Vedic accent blocks U+1CD0..U+1CFF and U+A8E0..U+A8FF.
    p = "".join(
        c for c in p
        if not ("\u1cd0" <= c <= "\u1cff" or "\ua8e0" <= c <= "\ua8ff")
    )
    # Keep Devanagari + spaces only.
    p = "".join(
        c for c in p
        if c == " " or "\u0900" <= c <= "\u0963" or "\u0971" <= c <= "\u097f"
    )
    p = re.sub(r"\s+", " ", p).strip()
    return p


def _core(piece: str) -> str:
    return "".join(_CORE_KEEP.findall(piece))


def _syllables(tts: str) -> int:
    """Vagdhenu's own n_aksharas rule: independent vowel counts one, and so
    does each consonant not followed by virama."""
    n = 0
    chars = list(tts.replace(" ", ""))
    for i, c in enumerate(chars):
        o = ord(c)
        if 0x0905 <= o <= 0x0914:
            n += 1
        elif 0x0915 <= o <= 0x0939:
            nxt = chars[i + 1] if i + 1 < len(chars) else ""
            if nxt != "\u094d":
                n += 1
    return n


def _split_parts(tts: str, syllables: int) -> list[str]:
    if syllables <= 44:
        return [tts]
    words = tts.split(" ")
    if len(words) <= 1:
        return [tts]
    counts = [_syllables(w) for w in words]
    total = sum(counts)
    best_k = 1
    best_diff = total
    for k in range(1, len(words)):
        left = sum(counts[:k])
        diff = abs(total - 2 * left)
        if diff < best_diff:
            best_diff = diff
            best_k = k
    left = " ".join(words[:best_k])
    right = " ".join(words[best_k:])
    out: list[str] = []
    for half in (left, right):
        hs = _syllables(half)
        if hs > 44 and " " in half:
            out.extend(_split_parts(half, hs))
        else:
            out.append(half)
    return out


def chant_lines(devanagari: str) -> list[dict]:
    """Split verse text into chant lines.

    Returns [{"i", "text", "tts", "parts", "kind", "syllables"}].
    """
    if not (devanagari or "").strip():
        return []
    lines: list[dict] = []
    # Step 1: split on newlines, then after each danda.
    raw_pieces: list[str] = []
    for chunk in (devanagari or "").split("\n"):
        for p in _DANDA_SPLIT.split(chunk):
            s = p.strip()
            if s:
                raw_pieces.append(s)
    for piece in raw_pieces:
        core = _core(piece)
        tts = _tts_of(piece)
        if not core or not tts:
            # Verse number (e.g. "|| 47 ||"): fold into previous line.
            if lines:
                lines[-1]["text"] = (lines[-1]["text"] + " " + piece).strip()
            continue
        kind = "speaker" if _UVACHA.match(tts) else "verse"
        syl = _syllables(tts)
        parts = _split_parts(tts, syl)
        lines.append({
            "i": len(lines),
            "text": piece,
            "tts": tts,
            "parts": parts,
            "kind": kind,
            "syllables": syl,
        })
    # Re-index defensively (fold-ins must not leave gaps).
    for idx, ln in enumerate(lines):
        ln["i"] = idx
    return lines
