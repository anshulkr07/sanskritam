"""Original monoline Devanagari writing guides, revision 2.

The previous data used Latin-like hooks for several unrelated letters.
These guides use a common headline at y=30 and separate vowel signs.
Each path is a pen movement, never a filled font outline. Conjuncts without
an authored guide return no paths; the client shows the shaped font instead.
"""
from __future__ import annotations
import re

STEM = "M 74 30 L 74 82"
HEAD = "M 15 30 L 84 30"
# Original centre-line drawings. Body first, right stem, headline last.
BODIES = {
    "अ": ["M 22 40 C 44 28 49 48 30 53 C 52 51 49 74 25 71", "M 45 53 L 74 53", STEM],
    "आ": ["M 18 40 C 37 28 41 48 25 53 C 45 51 42 74 20 71", "M 39 53 L 60 53", "M 60 30 L 60 82", "M 84 30 L 84 82"],
    "इ": ["M 62 30 L 38 30 L 38 44 C 70 40 66 59 44 60 C 24 64 30 83 58 80", "M 58 80 L 69 88"],
    "ई": ["M 62 30 L 38 30 L 38 44 C 70 40 66 59 44 60 C 24 64 30 83 58 80", "M 58 80 L 69 88", "M 60 30 C 32 6 77 4 67 24"],
    "उ": ["M 24 32 C 58 22 69 43 42 49 C 76 49 72 74 42 76 C 23 76 17 65 23 57"],
    "ऊ": ["M 18 32 C 48 22 58 43 34 49 C 66 49 65 74 36 76 C 18 76 12 65 18 57", "M 58 48 C 90 36 98 63 70 70"],
    "ऋ": ["M 28 30 L 28 64 L 50 48 L 68 68", "M 50 48 L 50 82", STEM],
    "ए": ["M 30 30 L 30 58 C 30 69 47 76 59 64 L 59 30"],
    "ऐ": ["M 30 30 L 30 58 C 30 69 47 76 59 64 L 59 30", "M 58 30 C 43 12 29 7 20 10"],
    "ओ": ["M 18 40 C 37 28 41 48 25 53 C 45 51 42 74 20 71", "M 39 53 L 60 53", "M 60 30 L 60 82", "M 84 30 L 84 82", "M 83 30 C 70 12 55 9 47 11"],
    "औ": ["M 18 40 C 37 28 41 48 25 53 C 45 51 42 74 20 71", "M 39 53 L 60 53", "M 60 30 L 60 82", "M 84 30 L 84 82", "M 83 30 C 70 12 55 9 47 11", "M 71 29 C 59 15 43 10 36 12"],
    "क": ["M 49 30 L 49 82", "M 49 49 C 24 33 14 56 34 62 C 43 64 49 53 49 49 C 79 35 89 66 73 73"],
    "ख": ["M 18 30 C 43 27 45 46 22 51 C 37 53 42 69 59 70 C 70 68 74 56 74 47", STEM],
    "ग": ["M 26 30 L 26 61 C 26 73 49 70 49 57 L 49 30", STEM],
    "घ": ["M 28 30 C 12 40 28 53 43 46 C 25 53 20 73 51 70 L 74 70", STEM],
    "ङ": ["M 58 30 C 18 27 14 53 44 52 C 19 55 26 78 52 73 C 68 71 70 60 63 55", "M 77 47 L 78 47"],
    "च": ["M 25 45 L 74 45", "M 25 45 L 25 65 C 25 77 49 79 58 67", STEM],
    "छ": ["M 25 30 C 49 23 58 41 36 46 C 61 46 61 64 39 64 C 20 64 22 83 48 81 C 68 81 78 66 66 57"],
    "ज": ["M 25 48 L 74 48", "M 56 30 L 56 57 C 56 81 22 79 24 62", STEM],
    "झ": ["M 20 35 C 45 29 47 45 27 49 C 50 50 48 69 24 67", "M 45 66 L 58 76 L 74 62", STEM],
    "ञ": ["M 25 30 C 51 24 54 49 32 51 C 22 54 28 68 43 64 L 74 64", STEM],
    "ट": ["M 62 30 L 36 30 L 36 42 C 14 46 18 80 48 78 C 65 77 70 63 61 56"],
    "ठ": ["M 51 30 L 51 40 C 16 40 15 79 49 79 C 82 79 83 40 51 40"],
    "ड": ["M 61 30 L 36 30 L 36 43 C 75 43 69 65 42 63 C 23 63 30 82 58 79"],
    "ढ": ["M 58 30 L 32 30 L 32 43 C 66 44 62 64 37 62 C 17 62 23 82 50 78", "M 59 48 C 83 34 91 67 66 70"],
    "ण": ["M 24 30 L 24 63 C 24 80 52 80 52 63 L 52 30", STEM],
    "त": ["M 24 48 L 74 48", "M 42 48 C 19 48 18 70 38 78", STEM],
    "थ": ["M 26 30 C 8 31 10 52 30 49 C 51 40 55 58 74 58", "M 27 48 L 27 72 L 74 72", STEM],
    "द": ["M 62 30 L 36 30 L 36 44 C 18 50 20 78 45 76 L 65 67 L 59 85"],
    "ध": ["M 31 30 C 6 26 10 54 32 49 L 74 49", "M 24 50 L 24 71 L 74 71", STEM],
    "न": ["M 31 60 C 19 51 20 68 31 60 L 74 60", STEM],
    "प": ["M 25 30 L 25 65 L 74 65", STEM],
    "फ": ["M 25 30 L 25 65 L 56 65", "M 56 30 L 56 82", "M 56 49 C 88 37 96 66 73 75"],
    "ब": ["M 74 43 C 36 29 22 74 59 73 L 74 65", "M 35 46 L 66 70", STEM],
    "भ": ["M 29 30 C 8 26 10 53 29 48", "M 29 48 L 29 70 L 74 70", STEM],
    "म": ["M 25 30 L 25 68 C 9 73 14 52 25 60 L 74 60", STEM],
    "य": ["M 24 30 C 39 40 35 52 23 55 L 23 66 C 23 81 60 77 74 65", STEM],
    "र": ["M 60 30 C 80 41 69 56 41 54 L 65 81"],
    "ल": ["M 24 79 L 24 55 C 24 41 44 43 44 58 C 44 39 65 40 74 54", STEM],
    "व": ["M 74 45 C 38 29 23 74 57 73 L 74 63", STEM],
    "श": ["M 38 30 C 12 29 16 52 38 48 C 18 54 28 67 48 60", "M 48 60 L 35 82", STEM],
    "ष": ["M 25 30 L 25 65 L 74 65", "M 25 30 L 74 74", STEM],
    "स": ["M 49 30 C 69 42 53 56 30 52", "M 31 51 L 22 62 L 43 82", "M 30 58 L 74 58", STEM],
    "ह": ["M 58 30 L 58 40 C 22 31 20 56 49 54 C 24 62 36 83 57 72 L 73 81"],
}
SIGNS = {
    "ा": ["M 92 30 L 92 82", "M 75 30 L 99 30"],
    "ि": ["M 9 30 L 9 82", "M 9 30 C 10 0 60 0 74 30", "M 0 30 L 20 30"],
    "ी": ["M 92 30 L 92 82", "M 92 30 C 91 0 58 3 50 30", "M 75 30 L 100 30"],
    "ु": ["M 74 82 C 98 84 91 105 66 99"],
    "ू": ["M 74 82 C 98 84 91 105 66 99 C 79 119 102 107 102 91"],
    "ृ": ["M 74 82 L 58 94 L 76 103"],
    "े": ["M 74 30 C 58 10 43 5 33 8"],
    "ै": ["M 74 30 C 58 10 43 5 33 8", "M 61 30 C 46 14 33 9 23 12"],
    "ो": ["M 92 30 L 92 82", "M 75 30 L 100 30", "M 92 30 C 77 11 62 6 50 8"],
    "ौ": ["M 92 30 L 92 82", "M 75 30 L 100 30", "M 92 30 C 77 11 62 6 50 8", "M 79 30 C 65 14 48 9 39 11"],
    "ं": ["M 50 17 L 50.1 17"],
    "ः": ["M 94 50 L 94.1 50", "M 94 69 L 94.1 69"],
    "्": ["M 63 88 L 82 96"],
}

def _translate(d: str, offset: float, scale: float) -> str:
    tokens = re.findall(r"[MLC]|-?\d+(?:\.\d+)?", d)
    axis = 0
    out = []
    for token in tokens:
        if token in "MLC": out.append(token); axis = 0
        else:
            value = float(token) * scale + (offset if axis % 2 == 0 else 0)
            out.append(f"{value:.2f}"); axis += 1
    return " ".join(out)

def writing_paths(text: str) -> list[dict]:
    # A separated full consonant cannot stand in for a conjunct.
    if re.search(r"्[क-ह]", text): return []
    groups: list[tuple[str, list[str]]] = []
    for c in text:
        if c in SIGNS and groups:
            base = groups[-1][0]
            # Below-base signs attach to the actual stem, not the right edge
            # of every glyph. In क that stem is in the middle of the letter.
            anchor = {"क": 49, "फ": 56}.get(base, 74)
            signs = [_translate(d, anchor - 74, 1) for d in SIGNS[c]] if c in ("ु", "ू", "ृ") else SIGNS[c]
            groups[-1][1].extend(signs)
        elif c in BODIES: groups.append((c, [*BODIES[c], HEAD]))
        else: return []
    scale = min(0.78, 90 / max(112, len(groups) * 112))
    out = []
    for i, (_c, paths) in enumerate(groups):
        for d in paths:
            out.append({"d": _translate(d, 5 + i * 112 * scale, scale), "dir": "ltr" if d == HEAD else "ttb"})
    return out
