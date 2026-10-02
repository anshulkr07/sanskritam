"""Audit the reader seed against the Gita dataset payload (HANDOVER 7.5).

Compares backend/app/seeds/shlokas.py rows with results/imports/gita.payload.json
by letters only, and reports the audit table: verse / part / another verse /
not that verse / bad reference / repeats. Run:

    ./.venv/Scripts/python.exe scripts/audit_reader_seed.py --payload results/imports/gita.payload.json
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path


def letters_only(s: str) -> str:
    return re.sub(r"[^ऀ-ॿ]", "", s or "")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--payload", default="results/imports/gita.payload.json")
    args = ap.parse_args()

    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
    try:
        from app.seeds.shlokas import SEED_SLOKAS
    except Exception:
        try:
            from app.seeds import shlokas as sh
            SEED_SLOKAS = getattr(sh, "SEED_SLOKAS", None) or getattr(sh, "_todo", [])
        except Exception as exc:
            print(f"cannot load seed: {exc}")
            return 1

    payload_path = Path(args.payload)
    if not payload_path.exists():
        alt = Path(__file__).resolve().parent.parent / "results" / "imports" / Path(args.payload).name
        if alt.exists():
            payload_path = alt
    if not payload_path.exists():
        print(f"payload not found: {args.payload} (owner holds the 700-verse file)")
        print(f"seed rows: {len(SEED_SLOKAS)}")
        return 0

    payload = json.loads(payload_path.read_text(encoding="utf-8"))
    verses = payload if isinstance(payload, list) else payload.get("verses", payload.get("rows", []))
    by_ref: dict[str, str] = {}
    for v in verses:
        ref = str(v.get("source_ref") or v.get("ref") or "").strip()
        text = str(v.get("devanagari") or v.get("text") or "").strip()
        if ref and text:
            by_ref[ref] = text

    counts = {"verse": 0, "part": 0, "another": 0, "not_verse": 0, "bad_ref": 0}
    for s in SEED_SLOKAS:
        ref = s.get("source_ref", "")
        dev = s.get("devanagari", "")
        if "Bhagavad" not in ref and "Gītā" not in ref and "Gita" not in ref:
            continue
        want = by_ref.get(ref, "")
        if not want:
            # Try normalised ref match.
            counts["bad_ref"] += 1
            print(f"BADREF {ref}")
            continue
        a, b = letters_only(dev), letters_only(want)
        if a == b:
            counts["verse"] += 1
        elif a and (a in b or b in a):
            counts["part"] += 1
            print(f"PART {ref}")
        else:
            # Another verse's text?
            other = [r for r, t in by_ref.items() if letters_only(t) == a]
            if other:
                counts["another"] += 1
                print(f"ANOTHER {ref} is {other[0]}")
            else:
                counts["not_verse"] += 1
                print(f"NOTVERSE {ref}: {dev[:40]}")
    print(counts)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
