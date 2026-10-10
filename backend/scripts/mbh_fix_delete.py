"""Mahabharata fix 8.3 step 2: delete the 193 mis-numbered rows."""

import json
import sys

sys.path.insert(0, ".")

from app.db import SessionLocal
from app.models import Shloka

SEED_REFS = {"Mahābhārata 1.11.12", "Mahābhārata 1.107.32", "Mahābhārata 3.2.15",
             "Mahābhārata 5.39.58", "Mahābhārata 12.26.23", "Mahābhārata 12.316.6",
             "Mahābhārata 13.7.22"}

payload = json.load(open("results/imports/mahabharata.payload.json", encoding="utf-8"))
want = {v["ref"]: v.get("devanagari", "") for v in payload["verses"]}
assert len(want) == 193, len(want)

db = SessionLocal()
try:
    cands = db.query(Shloka).filter(Shloka.source_ref.in_(list(want))).all()
    matched = [r for r in cands if (r.devanagari or "") == want.get(r.source_ref, None)]
    print(f"[mbh-fix] candidates sharing refs: {len(cands)}, exact-text matches: {len(matched)}")
    touched_seed = [r.source_ref for r in matched if r.source_ref in SEED_REFS]
    assert not touched_seed, f"would touch seeded rows: {touched_seed}"
    if len(matched) != 193:
        print(f"[mbh-fix] STOP: count is {len(matched)}, not 193. Nothing deleted.")
        raise SystemExit(1)
    live = "--live" in sys.argv
    if not live:
        print("[mbh-fix] DRY-RUN: nothing deleted. Add --live.")
        raise SystemExit(0)
    for r in matched:
        db.delete(r)
    db.commit()
    print("[mbh-fix] LIVE: deleted 193 rows.")
finally:
    db.close()
