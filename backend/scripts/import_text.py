"""P21-3 · Import a second text into the reader corpus.

A GRETIL/DCS text becomes readable with NO new UI work: the reader serves
``GET /shlokas`` (date order, auth-bound), so an import is rows, not a
feature. Usage (from backend/, CWD is the schema — §2.10):

    python -m scripts.import_text --file verses.json [--live]

Input JSON: {"licence": "...", "source": "...",
             "verses": [{"ref": "gita-2.47", "devanagari": "..."}, ...]}

Rules (§6 / §2.13 / §2.14 / §2.15):
- Per-text licence is REQUIRED in the input and is recorded in
  ``results/imports/<stem>.json`` next to the row counts. No licence, no
  import. "It was on the internet" is not a licence.
- Idempotent by ``source_ref``: a re-run adds 0 rows and says so. Judge the
  run by DISTINCT rows added, never by "inserted".
- NO TTS in the import path (§6 — the Mahābhārata is ₹30,000+ at Bulbul
  rates). Imported rows ship ``audio_url == ""``; the test asserts it.
- Back up ``app.db`` first (§2.13). Dry-run is the default.
- Each verse runs the same pipeline as the shloka seed: IAST from lipi
  (P7-13), metre from the chandas engine (absent stays absent — anuṣṭubh
  returns None and that is correct), word_breakdown from the analyzer with
  confident-only claims. A verse with fewer than MIN_BREAKDOWN_WORDS
  confident words is SKIPPED and reported — an untappable verse is dead
  weight in the reader, not content.
- Dates continue past the current max shloka date (deterministic, one day
  per verse in input order), so the daily rotation extends rather than
  being hijacked.
"""

from __future__ import annotations

import argparse
import datetime
import json
import sys
from pathlib import Path

if __package__ in (None, ""):  # allow `python scripts/import_text.py`
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.db import SessionLocal  # noqa: E402
from app.models import Shloka  # noqa: E402
from app.services import iast  # noqa: E402
from app.services.chandas import scan as chandas_scan  # noqa: E402
from app.grading.analyzer import analyze_sentence  # noqa: E402

MIN_BREAKDOWN_WORDS = 2


def build_row(devanagari: str, ref: str) -> dict | None:
    """Run the seed pipeline for one verse. None => skip (reported)."""
    dev = (devanagari or "").strip()
    if not dev:
        return None
    try:
        breakdown_src = analyze_sentence(dev)
    except Exception:  # noqa: BLE001 — engine unavailable: skip, loudly
        return None
    breakdown = [
        {"word": r.word,
         "meaning": (sorted(set((r.parsed or {}).keys())) or [""])[0] if r.is_confident else "",
         "features": sorted(set((r.parsed or {}).values())) if r.is_confident else []}
        for r in breakdown_src
    ]
    confident = sum(1 for r in breakdown_src if r.is_confident)
    if confident < MIN_BREAKDOWN_WORDS:
        return None
    try:
        metre = (chandas_scan(dev).get("metre") or "") or ""
    except Exception:  # noqa: BLE001 — metre stays absent
        metre = ""
    feats: list[str] = []
    for w in breakdown:
        feats.extend(f for f in w["features"] if f not in feats)
    return {
        "source_ref": ref,
        "devanagari": dev,
        "iast": iast.to_iast(dev),
        "metre": metre,
        "word_breakdown": breakdown,
        "features": feats,
    }


def run_import(payload: dict, live: bool) -> dict:
    licence = (payload.get("licence") or "").strip()
    source = (payload.get("source") or "").strip()
    if not licence:
        raise SystemExit("import refused: no per-text licence in the payload (§6)")
    verses = payload.get("verses") or []
    db = SessionLocal()
    try:
        existing_refs = {r[0] for r in db.query(Shloka.source_ref).all()}
        dates = sorted({r[0] for r in db.query(Shloka.date).all()})
        next_date = (datetime.date.fromisoformat(dates[-1]) + datetime.timedelta(days=1)
                     if dates else datetime.date.today())
        added = 0
        skipped_dup = 0
        skipped_thin = []
        for v in verses:
            ref = v.get("ref", "")
            if ref in existing_refs:
                skipped_dup += 1
                continue
            row = build_row(v.get("devanagari", ""), ref)
            if row is None:
                skipped_thin.append(ref)
                continue
            if live:
                import uuid
                db.add(Shloka(
                    id=uuid.uuid4().hex[:16],
                    date=(next_date + datetime.timedelta(days=added)).isoformat(),
                    audio_url="",  # §6: never TTS a corpus import
                    register="classical",
                    **row,
                ))
                db.flush()
                existing_refs.add(ref)
            added += 1
        if live:
            db.commit()
    finally:
        db.close()
    return {"added": added, "skipped_dup": skipped_dup,
            "skipped_thin": skipped_thin, "licence": licence, "source": source}


def main(argv=None) -> int:
    p = argparse.ArgumentParser(prog="import_text",
                                description="P21-3 second-text importer (dry-run default).")
    p.add_argument("--file", required=True, help="input JSON payload (see module docstring)")
    p.add_argument("--live", action="store_true", help="write rows (default dry-run)")
    args = p.parse_args(argv)
    payload = json.loads(Path(args.file).read_text(encoding="utf-8"))
    report = run_import(payload, live=args.live)
    mode = "LIVE" if args.live else "DRY-RUN (nothing written)"
    verb = "added" if args.live else "would be added"
    print(f"[import] {mode}: {report['added']} distinct verse(s) {verb}, "
          f"{report['skipped_dup']} duplicate(s) skipped")
    if report["skipped_thin"]:
        print(f"[import] skipped (< {MIN_BREAKDOWN_WORDS} confident words): "
              + ", ".join(report["skipped_thin"]))
    print(f"[import] licence: {report['licence']}")
    if args.live:
        out = Path("results/imports") / (Path(args.file).stem + ".json")
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"[import] report written to {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
