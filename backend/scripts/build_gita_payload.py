"""P21-5 · Build the import_text payload for the full Bhagavad Gītā.

Source: deepakrakshit/bhagavad-gita-dataset (GitHub, MIT licence) — 18
chapters, 700 verses, Devanagari + IAST + Hindi + English (translation +
explanation). Downloaded to results/imports/source_data/bhagavad-gita-dataset.

Usage (from backend/, CWD is the schema — §2.10):

    python -m scripts.build_gita_payload            # writes the payload JSON
    python -m scripts.import_text --file results/imports/gita.payload.json [--live]

Refs follow the existing corpus format "Bhagavad Gītā <c>.<v>" so the 51
seeded Gītā rows dedupe (§2.14: judge the run by DISTINCT rows added).
The dataset's own IAST rides through as ``iast_src`` — record, never retype —
but the ROW's iast is still lipi-derived in import_text (P7-13: one engine,
one truth; the dataset's romanisation is not verified here).
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

if __package__ in (None, ""):  # allow `python scripts/build_gita_payload.py`
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

DATASET_LICENCE = (
    "Text: public domain (ancient); dataset: deepakrakshit/bhagavad-gita-dataset "
    "(MIT), translations and explanations included, accessed 2026-09-17"
)
SOURCE = "Bhagavad Gītā (deepakrakshit/bhagavad-gita-dataset, MIT)"
DEFAULT_DATA_DIR = Path("results/imports/source_data/bhagavad-gita-dataset/dataset")


def build_payload(chapters: list[dict]) -> dict:
    """Map the dataset's chapter files into one import_text payload."""
    verses: list[dict] = []
    skipped = []
    for ch in chapters:
        c = ch.get("chapter_number")
        for v in ch.get("verses") or []:
            vn = v.get("verse_number")
            dev = (v.get("sanskrit") or {}).get("devanagari") or ""
            if not dev.strip():
                skipped.append(f"{c}.{vn}")
                continue
            verses.append({
                "ref": f"Bhagavad Gītā {c}.{vn}",
                "devanagari": dev.strip(),
                "iast_src": (v.get("sanskrit") or {}).get("iast") or "",
                "translation_hi": ((v.get("hindi") or {}).get("translation") or "").strip(),
                "translation_en": ((v.get("english") or {}).get("translation") or "").strip(),
            })
    return {
        "licence": DATASET_LICENCE,
        "source": SOURCE,
        "register": "classical",
        "verses": verses,
        "_skipped_empty": skipped,
    }


def build_payload_from_dir(data_dir: Path) -> dict:
    files = sorted(data_dir.glob("chapter_*.json"))
    if not files:
        raise SystemExit(f"no chapter files under {data_dir} — download the dataset first")
    chapters = []
    for f in files:
        ch = json.loads(f.read_text(encoding="utf-8"))
        if isinstance(ch, dict) and "verses" in ch:
            chapters.append(ch)
    return build_payload(chapters)


def main() -> int:
    payload = build_payload_from_dir(DEFAULT_DATA_DIR)
    out = Path("results/imports/gita.payload.json")
    out.write_text(json.dumps(payload, ensure_ascii=False, indent=1), encoding="utf-8")
    n = len(payload["verses"])
    skipped = payload["_skipped_empty"]
    print(f"[gita] payload: {n} verses -> {out}")
    if skipped:
        print(f"[gita] skipped empty: {', '.join(skipped)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
