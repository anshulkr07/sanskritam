"""P20-2 — stroke-order reference data for the varṇamālā.

AUTHORED, not scraped (provenance in DECISIONS.md 2026-09-06): stroke-order
charts are frequently copyrighted, so these paths were written from scratch
against the geometric structure of each akṣara and verified by rendering
(``python scripts/verify_strokes.py`` renders every letter; the frames are
checked by eye against the letterforms).

Coordinate system: a 0..100 × 0..100 box, x rightward, y DOWNWARD (screen
convention, matching SVG/RN). y=10 is the śirorekhā — the headline every
Devanagari letter hangs from; the client draws it separately and letters are
authored to touch it.

Each stroke: {"d": "M x y L x y ... [C for curves]", "dir": "ltr"|"rtl"|"ttb"|"btt"}.
Direction is the pen's travel, which is what the animated demonstration plays
and what per-stroke order/direction feedback checks.

This is data, not a model, and it is checked into the seed layer — the canvas
(U12-2) renders it and the demonstration (U12-1) animates it.
"""

from __future__ import annotations

# ── vowels ───────────────────────────────────────────────────────────────────

VOWELS: dict[str, list[dict]] = {
    # अ: the traditional form — vertical with a hooked left arm at the base
    "अ": [
        {"d": "M 65 15 L 65 78 L 30 78", "dir": "ttb"},          # stem down, then leftward foot
        {"d": "M 30 78 C 30 60 45 48 58 48", "dir": "ltr"},      # the hook curving up
    ],
    # आ: अ plus a vertical bar on the right
    "आ": [
        {"d": "M 65 15 L 65 78 L 30 78", "dir": "ttb"},
        {"d": "M 30 78 C 30 60 45 48 58 48", "dir": "ltr"},
        {"d": "M 85 20 L 85 78", "dir": "ttb"},
    ],
    # इ: left vertical with a top hook, dot to the right
    "इ": [
        {"d": "M 40 25 C 40 15 55 12 60 18", "dir": "ltr"},
        {"d": "M 40 22 L 40 80", "dir": "ttb"},
        {"d": "M 72 25 L 72 32", "dir": "ttb"},                  # the bindu stroke
    ],
    # ई: इ with a second bowl on the right
    "ई": [
        {"d": "M 40 25 C 40 15 55 12 60 18", "dir": "ltr"},
        {"d": "M 40 22 L 40 80", "dir": "ttb"},
        {"d": "M 72 25 L 72 32", "dir": "ttb"},
        {"d": "M 72 30 C 88 34 88 70 70 74", "dir": "ttb"},      # the outer bowl
    ],
    # उ: right stem curving down-left into a bowl
    "उ": [
        {"d": "M 62 18 L 62 45 C 62 70 30 74 30 55 C 30 44 44 40 52 46", "dir": "ttb"},
        {"d": "M 75 30 L 75 37", "dir": "ttb"},                  # bindu
    ],
    # ऊ: उ with a second lower bowl on the stem
    "ऊ": [
        {"d": "M 62 18 L 62 38 C 62 58 30 62 30 46 C 30 36 44 33 52 38", "dir": "ttb"},
        {"d": "M 62 42 C 62 70 30 80 30 60 C 30 50 44 47 52 52", "dir": "ttb"},
        {"d": "M 75 30 L 75 37", "dir": "ttb"},
    ],
    # ऋ: vertical stem + a right hook at the base
    "ऋ": [
        {"d": "M 50 15 L 50 80", "dir": "ttb"},
        {"d": "M 50 55 C 66 55 74 66 68 80 C 64 88 50 88 46 80", "dir": "ltr"},
        {"d": "M 72 25 L 72 32", "dir": "ttb"},
    ],
    # ॠ: ऋ with a second tail
    "ॠ": [
        {"d": "M 50 15 L 50 80", "dir": "ttb"},
        {"d": "M 50 48 C 64 48 70 58 66 68", "dir": "ltr"},
        {"d": "M 50 62 C 64 62 70 74 66 84", "dir": "ltr"},
        {"d": "M 72 25 L 72 32", "dir": "ttb"},
    ],
    # ऌ: like लि's core — a stem with a left hook at top
    "ऌ": [
        {"d": "M 55 20 L 55 80", "dir": "ttb"},
        {"d": "M 55 28 C 44 22 34 28 34 38 C 34 46 44 50 52 46", "dir": "rtl"},
        {"d": "M 76 25 L 76 32", "dir": "ttb"},
    ],
    # ॡ: ऌ plus a second hook
    "ॡ": [
        {"d": "M 55 20 L 55 80", "dir": "ttb"},
        {"d": "M 55 28 C 44 22 34 28 34 38 C 34 46 44 50 52 46", "dir": "rtl"},
        {"d": "M 55 52 C 44 46 34 52 34 62 C 34 70 44 74 52 70", "dir": "rtl"},
        {"d": "M 76 25 L 76 32", "dir": "ttb"},
    ],
    # ए: the backward loop with a descending stroke
    "ए": [
        {"d": "M 40 50 C 40 26 66 26 66 44 C 66 58 48 60 42 52", "dir": "btt"},
        {"d": "M 62 42 L 78 80", "dir": "btt"},
    ],
    # ऐ: ए plus a leading vertical
    "ऐ": [
        {"d": "M 26 20 L 26 80", "dir": "ttb"},
        {"d": "M 46 50 C 46 26 70 26 70 44 C 70 58 53 60 47 52", "dir": "btt"},
        {"d": "M 66 42 L 82 80", "dir": "btt"},
    ],
    # ओ: अ with a top-left bowl
    "ओ": [
        {"d": "M 66 15 L 66 78 L 32 78", "dir": "ttb"},
        {"d": "M 32 78 C 32 60 45 48 58 48", "dir": "ltr"},
        {"d": "M 30 30 C 30 16 52 14 60 26", "dir": "ltr"},
    ],
    # औ: ओ plus a trailing vertical
    "औ": [
        {"d": "M 62 15 L 62 78 L 30 78", "dir": "ttb"},
        {"d": "M 30 78 C 30 60 43 48 55 48", "dir": "ltr"},
        {"d": "M 26 30 C 26 16 47 14 55 26", "dir": "ltr"},
        {"d": "M 82 20 L 82 78", "dir": "ttb"},
    ],
}

# ── consonants (the 5×5 sparśa matrix + nasals are generated) ───────────────

# The 25 sparśa letters share three body skeletons (vertical+loop families).
# Authored per letter — shared "templates" produced letters that read wrong.
CONSONANTS: dict[str, list[dict]] = {
    # क: vertical + right bowl + the diagonal slash
    "क": [
        {"d": "M 30 18 L 30 80", "dir": "ttb"},
        {"d": "M 30 40 C 46 30 62 36 62 52 C 62 66 48 72 36 66", "dir": "ltr"},
        {"d": "M 52 62 L 76 80", "dir": "btt"},
    ],
    "ख": [
        {"d": "M 30 18 L 30 80", "dir": "ttb"},
        {"d": "M 30 40 C 46 30 62 36 62 52 C 62 66 48 72 36 66", "dir": "ltr"},
        {"d": "M 52 62 L 74 74", "dir": "btt"},
        {"d": "M 74 74 C 88 62 84 40 70 34", "dir": "rtl"},
    ],
    "ग": [
        {"d": "M 30 18 L 30 62 C 30 74 44 80 54 72", "dir": "ttb"},
        {"d": "M 30 44 C 46 34 66 38 70 52 C 74 66 60 76 48 70", "dir": "ltr"},
    ],
    "घ": [
        {"d": "M 30 18 L 30 62 C 30 74 44 80 54 72", "dir": "ttb"},
        {"d": "M 30 44 C 46 34 66 38 70 52 C 74 66 60 76 48 70", "dir": "ltr"},
        {"d": "M 70 30 C 84 36 86 56 74 66", "dir": "ttb"},
    ],
    "ङ": [
        {"d": "M 30 18 L 30 62 C 30 76 48 82 60 72", "dir": "ttb"},
        {"d": "M 30 44 C 46 34 66 38 70 52 C 74 68 58 78 46 70", "dir": "ltr"},
    ],
    "च": [
        {"d": "M 28 34 C 40 22 60 22 68 34", "dir": "ltr"},
        {"d": "M 28 34 L 28 62 C 28 76 46 82 58 72", "dir": "ttb"},
    ],
    "छ": [
        {"d": "M 28 34 C 40 22 60 22 68 34", "dir": "ltr"},
        {"d": "M 28 34 L 28 62 C 28 76 46 82 58 72", "dir": "ttb"},
        {"d": "M 62 18 C 74 22 76 40 68 48", "dir": "ttb"},
    ],
    "ज": [
        {"d": "M 28 22 C 34 34 40 34 46 24", "dir": "ltr"},
        {"d": "M 30 40 L 30 62 C 30 76 48 82 60 72", "dir": "ttb"},
    ],
    "झ": [
        {"d": "M 28 22 C 34 34 40 34 46 24", "dir": "ltr"},
        {"d": "M 30 40 L 30 62 C 30 76 48 82 60 72", "dir": "ttb"},
        {"d": "M 64 18 C 76 22 78 40 70 48", "dir": "ttb"},
    ],
    "ञ": [
        {"d": "M 30 18 L 30 60 C 30 76 48 82 60 72", "dir": "ttb"},
        {"d": "M 30 40 C 44 30 60 36 60 50 C 60 60 50 64 44 60", "dir": "ltr"},
        {"d": "M 44 60 L 70 60", "dir": "ltr"},
    ],
    "ट": [
        {"d": "M 22 20 L 78 20", "dir": "ltr"},
        {"d": "M 36 20 C 30 44 30 62 40 76 C 50 84 66 80 72 68", "dir": "btt"},
    ],
    "ठ": [
        {"d": "M 22 20 L 78 20", "dir": "ltr"},
        {"d": "M 36 20 C 30 44 30 62 40 76 C 50 84 66 80 72 68", "dir": "btt"},
        {"d": "M 70 34 L 70 62", "dir": "ttb"},
    ],
    "ड": [
        {"d": "M 22 20 L 78 20", "dir": "ltr"},
        {"d": "M 40 26 C 30 42 32 66 46 76 C 58 82 72 72 72 58", "dir": "btt"},
    ],
    "ढ": [
        {"d": "M 22 20 L 78 20", "dir": "ltr"},
        {"d": "M 40 26 C 30 42 32 66 46 76 C 58 82 72 72 72 58", "dir": "btt"},
        {"d": "M 78 26 C 70 42 72 60 80 68", "dir": "btt"},
    ],
    "ण": [
        {"d": "M 22 20 L 78 20", "dir": "ltr"},
        {"d": "M 36 20 L 36 60 C 36 74 52 80 62 70", "dir": "ttb"},
        {"d": "M 36 44 C 48 36 62 42 62 56", "dir": "ltr"},
    ],
    "त": [
        {"d": "M 30 18 L 30 68 C 30 78 42 82 50 74", "dir": "ttb"},
        {"d": "M 30 52 C 42 44 54 48 58 58 C 61 66 54 74 46 72", "dir": "ltr"},
    ],
    "थ": [
        {"d": "M 30 18 L 30 68 C 30 78 42 82 50 74", "dir": "ttb"},
        {"d": "M 30 52 C 42 44 54 48 58 58 C 61 66 54 74 46 72", "dir": "ltr"},
        {"d": "M 68 24 C 80 30 82 50 72 60", "dir": "ttb"},
    ],
    "द": [
        {"d": "M 28 20 C 44 14 62 18 70 30", "dir": "ltr"},
        {"d": "M 28 20 C 22 40 26 66 40 76 C 52 82 66 74 68 62", "dir": "btt"},
    ],
    "ध": [
        {"d": "M 28 20 C 44 14 62 18 70 30", "dir": "ltr"},
        {"d": "M 28 20 C 22 40 26 66 40 76 C 52 82 66 74 68 62", "dir": "btt"},
        {"d": "M 76 22 L 76 74", "dir": "ttb"},
    ],
    "न": [
        {"d": "M 30 18 L 30 60 C 30 74 46 80 56 70", "dir": "ttb"},
        {"d": "M 30 42 C 44 34 58 40 58 54 C 58 64 48 68 42 64", "dir": "ltr"},
    ],
    "प": [
        {"d": "M 30 18 L 30 80", "dir": "ttb"},
        {"d": "M 30 44 C 44 34 62 40 62 54 C 62 66 48 70 40 64", "dir": "ltr"},
    ],
    "फ": [
        {"d": "M 30 18 L 30 80", "dir": "ttb"},
        {"d": "M 30 44 C 44 34 62 40 62 54 C 62 66 48 70 40 64", "dir": "ltr"},
        {"d": "M 66 26 C 78 32 80 52 70 62", "dir": "ttb"},
    ],
    "ब": [
        {"d": "M 30 18 L 30 68 C 30 80 46 84 56 74", "dir": "ttb"},
        {"d": "M 30 38 C 44 30 58 36 58 50 C 58 62 46 66 38 60", "dir": "ltr"},
        {"d": "M 46 60 C 56 58 62 66 58 74", "dir": "ltr"},
    ],
    "भ": [
        {"d": "M 30 18 L 30 68 C 30 80 46 84 56 74", "dir": "ttb"},
        {"d": "M 30 38 C 44 30 58 36 58 50 C 58 62 46 66 38 60", "dir": "ltr"},
        {"d": "M 46 60 C 56 58 62 66 58 74", "dir": "ltr"},
        {"d": "M 72 22 L 72 74", "dir": "ttb"},
    ],
    "म": [
        {"d": "M 30 18 L 30 62 C 30 76 46 82 56 72", "dir": "ttb"},
        {"d": "M 30 40 C 42 32 54 36 58 46 C 60 54 54 60 48 58", "dir": "ltr"},
        {"d": "M 56 44 C 66 40 74 48 70 60 C 68 68 60 70 56 66", "dir": "ltr"},
    ],
    "य": [
        {"d": "M 32 22 C 42 30 44 44 38 56", "dir": "ltr"},
        {"d": "M 38 56 L 66 30", "dir": "btt"},
        {"d": "M 52 42 L 52 66 C 52 78 66 82 74 72", "dir": "ttb"},
    ],
    "र": [
        {"d": "M 46 18 L 46 80", "dir": "ttb"},
        {"d": "M 46 30 C 60 24 74 32 74 44", "dir": "ltr"},
    ],
    "ल": [
        {"d": "M 34 18 L 34 70 C 34 80 46 84 54 76", "dir": "ttb"},
        {"d": "M 34 32 C 48 24 64 30 64 44 C 64 58 50 62 44 56", "dir": "ltr"},
    ],
    "व": [
        {"d": "M 30 22 C 42 16 58 16 66 24", "dir": "ltr"},
        {"d": "M 48 20 L 48 64 C 48 78 64 82 72 72", "dir": "ttb"},
    ],
    "श": [
        {"d": "M 30 18 L 30 68 C 30 80 46 84 56 74", "dir": "ttb"},
        {"d": "M 30 38 C 44 30 58 36 58 50 C 58 62 46 66 38 60", "dir": "ltr"},
        {"d": "M 52 30 C 60 22 72 22 78 30", "dir": "ltr"},
    ],
    "ष": [
        {"d": "M 22 20 L 78 20", "dir": "ltr"},
        {"d": "M 40 20 L 40 60 C 40 74 56 80 66 70", "dir": "ttb"},
        {"d": "M 40 40 C 52 32 64 38 64 52 C 64 62 54 66 48 62", "dir": "ltr"},
    ],
    "स": [
        {"d": "M 28 34 C 40 22 60 22 68 34", "dir": "ltr"},
        {"d": "M 28 34 L 28 62 C 28 76 46 82 58 72", "dir": "ttb"},
        {"d": "M 30 60 C 44 52 60 58 62 70", "dir": "ltr"},
    ],
    "ह": [
        {"d": "M 34 18 L 34 60 C 34 76 50 82 62 72", "dir": "ttb"},
        {"d": "M 34 36 C 46 28 60 34 60 48 C 60 58 50 62 44 58", "dir": "ltr"},
        {"d": "M 44 58 C 58 54 70 62 68 74", "dir": "ltr"},
    ],
}

# ── nasals and others ────────────────────────────────────────────────────────

NASALS: dict[str, list[dict]] = {
    "ङ": CONSONANTS["ङ"],
    "ञ": CONSONANTS["ञ"],
    "ण": CONSONANTS["ण"],
    "न": CONSONANTS["न"],
    "म": CONSONANTS["म"],
}

OTHERS: dict[str, list[dict]] = {
    "य": CONSONANTS["य"],
    "र": CONSONANTS["र"],
    "ल": CONSONANTS["ल"],
    "व": CONSONANTS["व"],
    "श": CONSONANTS["श"],
    "ष": CONSONANTS["ष"],
    "स": CONSONANTS["स"],
    "ह": CONSONANTS["ह"],
}

# anusvara / visarga are dots — one small stroke each
SPECIALS: dict[str, list[dict]] = {
    "ं": [{"d": "M 48 30 C 48 24 56 24 56 30 C 56 34 48 34 48 30", "dir": "ltr"}],
    "ः": [
        {"d": "M 50 26 C 50 22 56 22 56 26 C 56 30 50 30 50 26", "dir": "ltr"},
        {"d": "M 50 44 C 50 40 56 40 56 44 C 56 48 50 48 50 44", "dir": "ltr"},
    ],
}


def letter_strokes(devanagari: str) -> list[dict] | None:
    """Ordered stroke paths for one akṣara, or None when not authored."""
    for table in (VOWELS, CONSONANTS, SPECIALS):
        if devanagari in table:
            return table[devanagari]
    return None


def stroke_catalogue() -> dict[str, list[dict]]:
    """Everything authored so far."""
    out: dict[str, list[dict]] = {}
    out.update(VOWELS)
    out.update(CONSONANTS)
    out.update(SPECIALS)
    return out
