"""P21-4 · Build the import_text payload for the Mahābhārata selections.

Source: sa.wikisource.org Mahābhāratam, Udyoga Parva chapters 33–34
(Vidura Nīti — the counsels of Vidura to Dhṛtarāṣṭra, the epic's most
famous wisdom passage and its most teachable maxims for a graded reader:
paṇḍita/mūḍha marks, dharma sayings, subhāṣita-style numbered lists).

Why Vidura Nīti first (cf. Rāmāyaṇa "Bāla + Sundara selections first"):
the canon plans 200 studied verses for the Mahābhārata; Udyoga 33 holds
~131 verses and 34 another ~88, so 33 full + the first 62 of 34 make 193
new verses, which land on exactly 200 with the 7 already-seeded
Mahābhārata verses (1.11.12, 1.107.32, 3.2.15, 5.39.58, 12.26.23,
12.316.6, 13.7.22 — none in chapters 33–34, so no collisions).

Licence: Text: public domain (ancient); transcription: sa.wikisource.org
(CC BY-SA 4.0), accessed 2026-10-07. Same registry key as the Īśā import
("sa-wikisource"); the payload records the verbatim licence string and
import_text refuses to run without one (§6).

Usage (from backend/, CWD is the schema — §2.10):

    PYTHONIOENCODING=utf-8 ./.venv/Scripts/python.exe -m scripts.build_mahabharata_payload
    PYTHONIOENCODING=utf-8 ./.venv/Scripts/python.exe -m scripts.import_text --file results/imports/mahabharata.payload.json
    PYTHONIOENCODING=utf-8 ./.venv/Scripts/python.exe -m scripts.import_text --file results/imports/mahabharata.payload.json --live

Refs follow the existing corpus format "Mahābhārata <book>.<chapter>.<verse>"
(BORI numbering, e.g. "Mahābhārata 5.33.21"), so the 7 seeded rows dedupe
(§2.14) and /canon's ref_prefixes match with zero UI work.
"""

from __future__ import annotations

import json
import re
import sys
import urllib.parse
import urllib.request
from pathlib import Path

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

LICENCE = (
    "Text: public domain (ancient); transcription: sa.wikisource.org "
    "(CC BY-SA 4.0), accessed 2026-10-07"
)
SOURCE = (
    "Mahābhārata, Udyoga Parva 33–34 (Vidura Nīti selections first; "
    "sa.wikisource.org, CC BY-SA transcription)"
)
OUT = Path("results/imports/mahabharata.payload.json")
STAGE = Path("results/imports/mahabharata.stage.json")

CHAPTERS = [
    ("महाभारतम्-05-उद्योगपर्व-033", 5, 33, None),   # full chapter (~130 verses)
    ("महाभारतम्-05-उद्योगपर्व-034", 5, 34, 63),     # first 63 verses only
]

_UA = {"User-Agent": "SanskritamBot/1.0 (reader corpus builder; contact: dev@sanskritam.example)"}


def _fetch_wikitext(title: str) -> str:
    url = (
        "https://sa.wikisource.org/w/api.php?action=parse&page="
        + urllib.parse.quote(title)
        + "&prop=wikitext&format=json"
    )
    req = urllib.request.Request(url, headers=_UA)
    with urllib.request.urlopen(req, timeout=60) as resp:
        data = json.load(resp)
    try:
        return data["parse"]["wikitext"]["*"]
    except KeyError:
        raise SystemExit(f"[mahabharata] page not found or blocked: {title}")


def _clean_text(html: str) -> str:
    text = re.sub(r"<BR\s*/?>", " ", html, flags=re.I)
    text = re.sub(r"</?[^>]+>", "", text)  # <B>, <p>, etc.
    text = text.replace("`", "").replace("'", "")
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _parse_table_chapter(wikitext: str, book: int, chapter: int) -> list[dict]:
    """Parse one sa.wikisource table-format chapter into verse dicts."""
    rows = re.findall(r"<tr><td><p>(.*?)<td>(.*?)</p></tr>", wikitext, re.S)
    verses: list[dict] = []
    for raw_text, raw_nums in rows:
        text = _clean_text(raw_text)
        nums = _clean_text(raw_nums)
        if not text or not nums:
            continue
        # Speaker headers ("विदुर उवाच।" with number ...x) are not verses.
        if nums.strip().endswith("x") or text.strip().endswith("उवाच।"):
            continue
        m = re.search(r"(\d+)-(\d+)-(\d+)", nums)
        if not m:
            continue
        b, c, v = int(m.group(1)), int(m.group(2)), int(m.group(3))
        if (b, c) != (book, chapter):
            continue
        if not text.endswith(("॥", "।")):
            text = text + " ॥"
        verses.append({
            "ref": f"Mahābhārata {b}.{c}.{v}",
            "devanagari": text,
            "translation_hi": "",
            "translation_en": "",
        })
    # Canonical order, deduped by verse number.
    seen: dict[int, dict] = {}
    for vs in verses:
        n = int(vs["ref"].rsplit(".", 1)[1])
        seen.setdefault(n, vs)
    return [seen[k] for k in sorted(seen)]


def build_payload() -> dict:
    all_verses: list[dict] = []
    stage: dict = {}
    for title, book, chapter, limit in CHAPTERS:
        wt = _fetch_wikitext(title)
        stage[title] = wt
        parsed = _parse_table_chapter(wt, book, chapter)
        if limit is not None:
            parsed = parsed[:limit]
        print(f"[mahabharata] {title}: {len(parsed)} verses")
        all_verses.extend(parsed)
    # Dedupe by ref across chapters (chapters differ, so no-op; safety).
    seen = set()
    verses = []
    for v in all_verses:
        if v["ref"] not in seen:
            seen.add(v["ref"])
            verses.append(v)
    return {
        "licence": LICENCE,
        "source": SOURCE,
        "register": "classical",
        "verses": verses,
    }, stage


def main() -> int:
    payload, stage = build_payload()
    n = len(payload["verses"])
    print(f"[mahabharata] total: {n} verses")
    if n < 150:
        print("[mahabharata] WARNING: expected ~193 verses; wikisource tables may have changed")
    STAGE.parent.mkdir(parents=True, exist_ok=True)
    STAGE.write_text(json.dumps(
        {"licence": LICENCE, "source": SOURCE, "chapters": list(stage.keys()),
         "note": "raw wikitext cache; payload is the import input"},
        ensure_ascii=False, indent=1), encoding="utf-8")
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"[mahabharata] payload: {n} verses -> {OUT}")
    if payload["verses"]:
        print(f"[mahabharata] first: {payload['verses'][0]['ref']}")
        print(f"[mahabharata] last:  {payload['verses'][-1]['ref']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
