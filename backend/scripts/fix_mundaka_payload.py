"""Produce the reviewed Mundaka completion payload (roadmap 3.2 order 2).

Input : results/imports/mundaka-complete.payload.json  (sa.wikisource, 64 verses, unimported)
Output: results/imports/mundaka-complete-fixed.payload.json

Review of the completion (results/corpus/mundaka-completion-reconciliation.md):

1. Ref 3.1.1 is the only mismatch: its incoming chunk opens with the second
   Muṇḍaka's colophon ("॥ इति मुण्डकोपनिषदि द्वितीयमुण्डके द्वितीयः खण्डः ॥")
   and the third Muṇḍaka's heading; the stored row is the clean verse. The
   five chapter openings (1.1.1, 1.2.1, 2.1.1, 2.2.1, 3.2.1) carry the same
   glued-in structure, and 1.1.1 also opens with the page title, the śānti
   verses and the invocation. That front matter is dropped: the chunk keeps
   only what follows its last "…खण्डः ॥" heading line.
2. Refs already in the database keep the written rows, so the import sees a
   duplicate, not a mismatch. Mundaka Upaniṣad 3.1.6 holds four rows since
   2026-09 (two fragments, two complete) and production carries an approved
   chant for each, the fragment chants reciting the fragments. The payload
   carries the complete row's text; the two fragment rows are left as
   written on purpose — completing them would move their chants onto the
   complete text's verse_uid, where the audio would no longer match the
   text. The import reports them as left alone.
3. The source's opening ॐ (1.1.1) and the closing verse numbers stay: the
   wiki pipeline keeps the verse's own number and the kept ॐ, as in the
   stored Kena Upaniṣad rows.

Usage (from backend/):
    PYTHONUTF8=1 ./.venv/Scripts/python.exe scripts/fix_mundaka_payload.py
"""

from __future__ import annotations

import json
import sqlite3
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
SRC = BACKEND / "results" / "imports" / "mundaka-complete.payload.json"
DST = BACKEND / "results" / "imports" / "mundaka-complete-fixed.payload.json"
LOCAL_DB = BACKEND / "app.db"

# Chapter openings: the wiki split glued the previous chapter's colophon and
# the next chapter's heading in front of the verse.
OPENING_REFS = {
    "Mundaka Upaniṣad 1.1.1",
    "Mundaka Upaniṣad 1.2.1",
    "Mundaka Upaniṣad 2.1.1",
    "Mundaka Upaniṣad 2.2.1",
    "Mundaka Upaniṣad 3.1.1",
    "Mundaka Upaniṣad 3.2.1",
}
NOTE = (" Refs already carried by the selection keep the written rows; the "
        "chapter-opening chunks had the previous chapter's colophon and the "
        "next chapter's heading (and, at 1.1.1, the page title and śānti "
        "verses) glued in front by the wiki split — the front matter is "
        "dropped, the verse's opening ॐ and closing number stay. 3.1.6 has "
        "four rows since 2026-09 (two fragments, two complete), each with an "
        "approved chant; the payload's text is the complete row's and the "
        "fragment rows are left as written (completing them would move their "
        "chants onto the complete text).")


def _strip_front(text: str, ref: str) -> str:
    lines = text.split("\n")
    last = None
    for i, ln in enumerate(lines):
        if "खण्डः" in ln:
            last = i
    if last is None:
        raise SystemExit(f"fix_mundaka_payload: {ref}: no खण्डः heading line")
    return "\n".join(lines[last + 1:]).strip()


def _db_rows() -> dict[str, str]:
    con = sqlite3.connect(f"file:{LOCAL_DB.as_posix()}?mode=ro", uri=True)
    try:
        cur = con.execute(
            "select source_ref, devanagari from shlokas "
            "where source_ref like 'Mundaka%'")
        best: dict[str, str] = {}
        for ref, dev in cur.fetchall():
            # 3.1.6 has four rows: the complete text is the longest.
            if ref not in best or len(dev) > len(best[ref]):
                best[ref] = dev
        return best
    finally:
        con.close()


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    payload = json.loads(SRC.read_text(encoding="utf-8"))
    db = _db_rows()
    verses, stripped, kept = [], 0, 0
    for v in payload["verses"]:
        ref = v["ref"]
        text = v["devanagari"]
        if ref in OPENING_REFS:
            text = _strip_front(text, ref)
            stripped += 1
        if ref in db:
            text = db[ref]
            kept += 1
        verses.append({"ref": ref, "devanagari": text,
                       "translation_hi": v.get("translation_hi") or "",
                       "translation_en": v.get("translation_en") or ""})
    out = dict(payload)
    out["verses"] = verses
    out["licence"] = (payload.get("licence") or "").rstrip() + NOTE
    DST.write_text(json.dumps(out, ensure_ascii=False, indent=1),
                   encoding="utf-8", newline="")
    print(f"[fix-mundaka] {len(payload['verses'])} in, {len(verses)} out; "
          f"front matter stripped {stripped}, existing text kept {kept} "
          f"-> {DST}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
