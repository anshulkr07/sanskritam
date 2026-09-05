"""P7-13 — backfill stored IAST from vidyut.lipi.

One-time content fix for the measured 130/264 challenge + 9/96 shloka rows
whose IAST did not match what lipi computes from the same Devanagari. The
Devanagari passed the Vidyut gate; the IAST did not pass anything — so the
IAST is what gets rewritten, never the Devanagari.

§2.13/§2.15 discipline: the caller backs up `app.db` first, runs this against
the COPY, diffs the counts, and only then runs it for real. The script itself:

  • reports the before/after mismatch counts per table (the acceptance
    criterion is the counts, not "it ran"),
  • only UPDATEs rows that actually mismatch (idempotent — a re-run touches
    zero rows and says so),
  • never DELETEs and never touches the Devanagari.

Run:  ./.venv/Scripts/python.exe -m scripts.backfill_iast
"""

from __future__ import annotations

import sys

from app.db import SessionLocal
from app.models import Challenge, DailyWord, Shloka
from app.services.iast import matches, to_iast


def _backfill(db, rows, dev_attr, iast_attr, label) -> tuple[int, int]:
    """Rewrite `iast_attr` from lipi where it mismatches. Returns (fixed, total)."""
    total = fixed = 0
    for row in rows:
        dev = getattr(row, dev_attr) or ""
        if not dev.strip():
            continue
        total += 1
        current = getattr(row, iast_attr) or ""
        if matches(dev, current):
            continue
        setattr(row, iast_attr, to_iast(dev))
        fixed += 1
    print(f"{label}: {fixed} of {total} rows rewritten")
    return fixed, total


def main() -> int:
    db = SessionLocal()
    try:
        rows_c = db.query(Challenge).all()
        rows_s = db.query(Shloka).all()
        rows_d = db.query(DailyWord).all()

        def _count(rows, dev_attr, iast_attr):
            n = 0
            for r in rows:
                dev = getattr(r, dev_attr) or ""
                if dev.strip() and not matches(dev, getattr(r, iast_attr) or ""):
                    n += 1
            return n

        before = (
            _count(rows_c, "target_sanskrit", "target_iast"),
            _count(rows_s, "devanagari", "iast"),
            _count(rows_d, "answer", "answer_iast"),
        )
        print(f"BEFORE mismatches: challenges={before[0]} shlokas={before[1]} daily_words={before[2]}")

        fixed_c, _ = _backfill(db, rows_c, "target_sanskrit", "target_iast", "challenges")
        fixed_s, _ = _backfill(db, rows_s, "devanagari", "iast", "shlokas")
        fixed_d, _ = _backfill(db, rows_d, "answer", "answer_iast", "daily_words")

        db.commit()

        # AFTER counts — re-query fresh so we measure the committed state.
        db2 = SessionLocal()
        try:
            after = (
                _count(db2.query(Challenge).all(), "target_sanskrit", "target_iast"),
                _count(db2.query(Shloka).all(), "devanagari", "iast"),
                _count(db2.query(DailyWord).all(), "answer", "answer_iast"),
            )
        finally:
            db2.close()
        print(f"AFTER  mismatches: challenges={after[0]} shlokas={after[1]} daily_words={after[2]}")
        if any(after):
            print("STILL MISMATCHING — do not edit the Devanagari; investigate the oracle instead.")
            return 1
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(main())
