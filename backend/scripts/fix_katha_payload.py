"""Produce the reviewed Katha completion payload (roadmap 3.2 order 1).

Input : results/imports/katha-complete.payload.json  (DCS, 120 verses, unimported)
Output: results/imports/katha-complete-fixed.payload.json

Review of the 22 historical mismatches (results/corpus/katha-completion-reconciliation.md):

1. DCS numbers the "ओम् इत्येतत् ॥" formula as its own verse 1.2.16, so DCS
   1.2.16-1.2.26 = standard 1.2.15(tail)-1.2.25. The existing rows follow the
   standard numbering (1.2.18 = "न जायते...."). The formula is already the tail
   of the existing 1.2.15 row, so DCS 1.2.16 is dropped and 1.2.17-1.2.26 are
   renumbered to 1.2.16-1.2.25.
2. The other mismatches are DCS word-splitting conventions (word-final virama
   plus a space, e.g. "सस्यम् इव" vs the rows' "सस्यमिव"). The 40 rows already
   imported are kept canonical: every incoming verse whose (renumbered) ref
   already exists gets that row's text, so the importer sees a duplicate, not a
   mismatch, and nothing is replaced.
3. Two rows carry obvious transcription typos; they are corrected across the
   payload and the database rows (an explicit, recorded replacement):
   Kaṭhopaniṣad 1.3.11 "पुरुशान्" -> "पुरुषान्"; 2.2.13 "तेषं" -> "तेषां".
   A one-letter difference scores as the same verse (> 0.97), so
   `--fix-existing` alone cannot reach them; the importer is given both refs
   via `--replace-refs` (see scripts/import_text.py). Their existing
   translations ride in the payload so the replacement cannot blank them.

Usage (from backend/):
    PYTHONUTF8=1 ./.venv/Scripts/python.exe scripts/fix_katha_payload.py
"""

from __future__ import annotations

import json
import sqlite3
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
SRC = BACKEND / "results" / "imports" / "katha-complete.payload.json"
DST = BACKEND / "results" / "imports" / "katha-complete-fixed.payload.json"
LOCAL_DB = BACKEND / "app.db"

DROP_REFS = {"Kaṭhopaniṣad 1.2.16"}
REF_MAP = {
    "Kaṭhopaniṣad 1.2.17": "Kaṭhopaniṣad 1.2.16",
    "Kaṭhopaniṣad 1.2.18": "Kaṭhopaniṣad 1.2.17",
    "Kaṭhopaniṣad 1.2.19": "Kaṭhopaniṣad 1.2.18",
    "Kaṭhopaniṣad 1.2.20": "Kaṭhopaniṣad 1.2.19",
    "Kaṭhopaniṣad 1.2.21": "Kaṭhopaniṣad 1.2.20",
    "Kaṭhopaniṣad 1.2.22": "Kaṭhopaniṣad 1.2.21",
    "Kaṭhopaniṣad 1.2.23": "Kaṭhopaniṣad 1.2.22",
    "Kaṭhopaniṣad 1.2.24": "Kaṭhopaniṣad 1.2.23",
    "Kaṭhopaniṣad 1.2.25": "Kaṭhopaniṣad 1.2.24",
    "Kaṭhopaniṣad 1.2.26": "Kaṭhopaniṣad 1.2.25",
}
TYPO_FIXES = {
    "Kaṭhopaniṣad 1.3.11": ("पुरुशान् न परं", "पुरुषान् न परं"),
    "Kaṭhopaniṣad 2.2.13": ("धीरास्तेषं शान्तिः", "धीरास्तेषां शान्तिः"),
}
NOTE = (" Refs 1.2.16-1.2.25 follow the existing selection's numbering (DCS "
        "counts the 'ओम् इत्येतत्' formula as its own verse; it is kept inside "
        "1.2.15 here). Existing refs keep the written rows (DCS word-splitting "
        "not applied); two transcription typos corrected: 1.3.11 पुरुशान् -> "
        "पुरुषान्, 2.2.13 तेषं -> तेषां.")


def _db_rows() -> dict[str, dict]:
    con = sqlite3.connect(f"file:{LOCAL_DB.as_posix()}?mode=ro", uri=True)
    try:
        cur = con.execute(
            "select source_ref, devanagari, translation_en, translation_hi "
            "from shlokas where in_daily = 1 and source_ref like 'Kaṭh%'")
        return {r[0]: {"text": r[1], "en": r[2] or "", "hi": r[3] or ""}
                for r in cur.fetchall()}
    finally:
        con.close()


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    payload = json.loads(SRC.read_text(encoding="utf-8"))
    db = _db_rows()
    verses, dropped, mapped, kept, fixed = [], 0, 0, 0, 0
    for v in payload["verses"]:
        ref = v["ref"]
        if ref in DROP_REFS:
            dropped += 1
            continue
        new_ref = REF_MAP.get(ref, ref)
        if new_ref != ref:
            mapped += 1
        text = v["devanagari"]
        if new_ref in db:
            text = db[new_ref]["text"]
            kept += 1
            if new_ref in TYPO_FIXES:
                old, new = TYPO_FIXES[new_ref]
                if old not in text:
                    raise SystemExit(f"fix_katha_payload: {new_ref}: "
                                     f"expected {old!r} in the row")
                text = text.replace(old, new)
                v["translation_en"] = db[new_ref]["en"]
                v["translation_hi"] = db[new_ref]["hi"]
                fixed += 1
        verses.append({"ref": new_ref, "devanagari": text,
                       "translation_hi": v.get("translation_hi") or "",
                       "translation_en": v.get("translation_en") or ""})
    out = dict(payload)
    out["verses"] = verses
    out["licence"] = (payload.get("licence") or "").rstrip() + NOTE
    DST.write_text(json.dumps(out, ensure_ascii=False, indent=1),
                   encoding="utf-8", newline="")
    print(f"[fix-katha] {len(payload['verses'])} in, {len(verses)} out; "
          f"dropped {dropped}, renumbered {mapped}, kept existing text {kept}, "
          f"typo fixes {fixed} -> {DST}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
