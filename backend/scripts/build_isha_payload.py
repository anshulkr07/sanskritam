"""Parse the sa.wikisource Īśā Upaniṣad text into an import_text payload.

Run from backend/ with the venv python:
    PYTHONIOENCODING=utf-8 ./.venv/Scripts/python.exe -m scripts.build_isha_payload
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

LICENCE = (
    "Text: public domain (ancient); transcription: sa.wikisource.org "
    "(CC BY-SA), accessed 2026-09-17"
)
SOURCE = "Īśopaniṣad (sa.wikisource.org, CC BY-SA transcription)"
STAGE = Path("results/imports/isha.stage.json")
OUT = Path("results/imports/isha.payload.json")

_D1 = "०१२३४५६७८९"
_DEVA_DIGITS = str.maketrans(_D1, "0123456789")
# Devanagari marker: ॥n॥ or ॥n।। (the .। variant is used for mantra 13).
_MARK = re.compile(r"॥\s*([०-९]{1,2})\s*[।॥]{1,2}")


def to_arabic(s: str) -> int:
    return int(s.translate(_DEVA_DIGITS))


def _clean(line: str) -> str:
    """Strip wikisource/HTML shells and verse markers; collapse whitespace."""
    line = re.sub(r"<[^>]+>", "", line)
    for pat in ("[[", "]]", "#", "{{", "}}"):
        line = line.replace(pat, "")
    line = _MARK.sub("", line)
    return re.sub(r"\s+", " ", line).strip()


def _preamble_end(raw_lines: list[str], first_marker_idx: int) -> int:
    """Last index of the title/shanti/अथ header before the poem proper."""
    end = -1
    for i in range(first_marker_idx):
        ln = raw_lines[i]
        if "अथ" in ln or "शान्तिः" in ln or "उपनिषत्" in ln or "पूर्ण" in ln:
            end = i
    return end


def split_verses(raw_lines: list[str]) -> list[dict]:
    """Mantra n = lines strictly after the ॥(n-1)॥ marker up to the ॥n॥ line.

    The previewl poem stores each mantra's halves on consecutive lines ending
    with ॥n॥, so each mantra is a contiguous slice. First mantra starts right
    after the preamble (अथ/शान्तिः header); the rest after the prior marker.
    """
    markers: list[tuple[int, int]] = []  # (line_index, devanagari_number)
    for i, ln in enumerate(raw_lines):
        m = _MARK.search(ln)
        if m and 1 <= (n := to_arabic(m.group(1))) <= 18:
            markers.append((i, n))
    # First occurrence per number wins (a footnote may reuse a number); keep
    # the real 18 in ascending canonical order.
    markers.sort(key=lambda t: (t[1], t[0]))
    seen: set[int] = set()
    uniq: list[tuple[int, int]] = []
    for i, n in markers:
        if n in seen:
            continue
        seen.add(n)
        uniq.append((i, n))
    markers = uniq
    if not markers:
        return []
    start = _preamble_end(raw_lines, markers[0][0]) + 1
    verses: list[dict] = []
    for k, (idx, n) in enumerate(markers):
        body = " ".join(_clean(l) for l in raw_lines[start : idx + 1])
        body = re.sub(r"[ ।ॐ\-—]*$", "", body).strip()
        verses.append({
            "ref": f"Īśopaniṣad {n}", "devanagari": body,
            "iast_src": "", "translation_hi": "", "translation_en": "",
        })
        start = idx + 1
    return verses


def main() -> int:
    data = json.loads(STAGE.read_text(encoding="utf-8"))
    lines = data["raw_lines"]
    verses = split_verses(lines)
    if len(verses) != 18:
        print(f"[isha] WARNING: {len(verses)} verses (expected 18): "
              + ", ".join(v["ref"] for v in verses))
    payload = {"licence": data.get("licence", LICENCE),
               "source": data.get("source", SOURCE),
               "register": "vedic", "verses": verses}
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=1),
                   encoding="utf-8")
    print(f"[isha] payload: {len(verses)} verses -> {OUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())