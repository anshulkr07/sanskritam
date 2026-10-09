"""Export verses for chant rendering (handover_recite 5.5).

Usage:
    python -m scripts.chant_export --out ../gpu_jobs/chant_jobs.jsonl \
        [--books "Bhagavad Gita,Hitopadesa"] [--sample 20] [--skip-served]

Reads shlokas from the configured database (DATABASE_URL or local app.db).
Writes one JSON line per verse: verse_uid, source_ref, book, vedic, lines.
Prints counts by book, by Vedic, lines and syllables. Writes no DB rows.
"""

from __future__ import annotations

import argparse
import json
import random
import re
import sqlite3
import sys
import unicodedata
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "app"))

VEDIC_BOOKS = (
    "Kathopanisad", "Katha", "Mundaka", "Isopanisad", "Ishopanisad",
    "Taittiriya", "Brhadaranyaka", "Brihadaranyaka", "Kena", "Prasna",
    "Mandukya", "Chandogya", "Svetasvatara", "Aitareya", "Kausitaki",
)

# Same parsing as mobile utils/verses.ts parseRef: trailing numbers removed,
# SPELL_FIX applied.
_SPELL_FIX = [(re.compile(r"N\u012bt\u012b\u015bataka"), "N\u012bti\u015bataka"),
              (re.compile(r"N\u012bt\u012b\b"), "N\u012bti")]
_TRAILING = re.compile(r"^(.+?)\s+(\d+(?:\.\d+)*)\s*$")


def book_of(source_ref: str) -> str:
    ref = (source_ref or "").strip()
    ref = re.sub(r"\s+", " ", ref)
    for rx, to in _SPELL_FIX:
        ref = rx.sub(to, ref)
    m = _TRAILING.match(ref)
    if m:
        return m.group(1).strip()
    return ref


def _fold(s: str) -> str:
    nfkd = unicodedata.normalize("NFD", s or "")
    return "".join(c for c in nfkd if unicodedata.category(c) != "Mn").lower()


def is_vedic(book: str) -> bool:
    f = _fold(book)
    if "upanisad" in f or "upanishad" in f:
        return True
    for vb in VEDIC_BOOKS:
        if f.startswith(_fold(vb)):
            return True
    return False


def _db_path() -> Path:
    import os
    url = os.environ.get("DATABASE_URL", "")
    if url:
        raise SystemExit("DATABASE_URL is set: point chant_export at SQLite only in this version.")
    # backend/scripts -> backend/app.db
    here = Path(__file__).resolve().parent.parent
    for cand in (here / "app.db", Path("backend/app.db"), Path("app.db")):
        if cand.exists():
            return cand
    return here / "app.db"


def load_rows(db_path: Path):
    con = sqlite3.connect(str(db_path))
    con.row_factory = sqlite3.Row
    try:
        rows = con.execute(
            "SELECT id, source_ref, devanagari FROM shlokas ORDER BY date ASC, id ASC"
        ).fetchall()
    finally:
        con.close()
    return rows


def served_uids() -> set[str]:
    try:
        from app.config import settings
        from app.db import SessionLocal
        from app.models import VerseAudio
        db = SessionLocal()
        try:
            q = db.query(VerseAudio.verse_uid).filter(
                VerseAudio.voice == settings.chant_voice,
                VerseAudio.qc_status.in_(["approved", "auto_ok"]),
            ).all()
            return {r[0] for r in q}
        finally:
            db.close()
    except Exception:
        return set()


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--books", default="")
    ap.add_argument("--sample", type=int, default=0)
    ap.add_argument("--skip-served", action="store_true")
    args = ap.parse_args()

    from app.services.chant_text import chant_lines, verse_uid

    rows = load_rows(_db_path())
    books_filter: set[str] = set()
    if args.books.strip():
        books_filter = {b.strip() for b in args.books.split(",") if b.strip()}

    jobs: list[dict] = []
    served = served_uids() if args.skip_served else set()
    for r in rows:
        ref = r["source_ref"] or ""
        dev = r["devanagari"] or ""
        book = book_of(ref)
        if books_filter and book not in books_filter and ref not in books_filter:
            # Also allow matching by substring for convenience.
            if not any(b in ref for b in books_filter):
                continue
        uid = verse_uid(ref, dev)
        if uid in served:
            continue
        lines = chant_lines(dev)
        jobs.append({
            "verse_uid": uid,
            "source_ref": ref,
            "book": book,
            "vedic": is_vedic(book),
            "lines": lines,
        })

    if args.sample and args.sample < len(jobs):
        # Cover in order: speaker line, long line, each metre-ish (by line
        # count/syllables as proxy without a detector here), unrecognised
        # (single-line), Vedic, then random with fixed seed.
        picked: list[dict] = []
        seen: set[int] = set()

        def take(pred, n=1):
            found = 0
            for idx, j in enumerate(jobs):
                if idx in seen:
                    continue
                if pred(j):
                    picked.append(j)
                    seen.add(idx)
                    found += 1
                    if found >= n:
                        break

        take(lambda j: any(ln.get("kind") == "speaker" for ln in j["lines"]))
        take(lambda j: any(ln.get("syllables", 0) > 44 for ln in j["lines"]))
        take(lambda j: j["vedic"])
        take(lambda j: len(j["lines"]) == 1)
        rng = random.Random(20261009)
        rest = [j for i, j in enumerate(jobs) if i not in seen]
        rng.shuffle(rest)
        need = args.sample - len(picked)
        picked.extend(rest[:max(0, need)])
        jobs = picked[:args.sample]

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    with open(out, "w", encoding="utf-8", newline="") as f:
        for j in jobs:
            f.write(json.dumps(j, ensure_ascii=False) + "\n")

    # Counts.
    by_book: dict[str, int] = {}
    n_vedic = 0
    n_lines = 0
    n_syl = 0
    for j in jobs:
        by_book[j["book"]] = by_book.get(j["book"], 0) + 1
        n_vedic += 1 if j["vedic"] else 0
        n_lines += len(j["lines"])
        n_syl += sum(ln.get("syllables", 0) for ln in j["lines"])
    print(f"verses: {len(jobs)}")
    print(f"vedic: {n_vedic} non-vedic: {len(jobs) - n_vedic}")
    print(f"lines: {n_lines} syllables: {n_syl}")
    for b in sorted(by_book):
        print(f"  {b}: {by_book[b]}")


if __name__ == "__main__":
    main()
