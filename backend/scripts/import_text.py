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
- A row that already has the incoming reference keeps its Sanskrit. Its
  translations are filled only when that Sanskrit IS the incoming verse:
  the seed has rows whose text is a fragment, another verse or not from the
  text at all under a real verse number (audited 2026-10-01: 25 of the 51
  seeded Gītā rows), and the right translation next to the wrong Sanskrit is
  worse than no translation. ``--fix-existing`` replaces such a row's text
  with the incoming verse, in place, keeping its id and date so the daily
  schedule and the seed's (source_ref, date) key are untouched.
- ``--min-words 0`` keeps verses the analyzer reads fewer than two words of
  (Gītā 2.64 and 5.8). A scripture with holes is worse than a verse whose
  words carry no analysis.
"""

from __future__ import annotations

import argparse
import datetime
import difflib
import json
import re
import sys
import unicodedata
from pathlib import Path

if __package__ in (None, ""):  # allow `python scripts/import_text.py`
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.db import SessionLocal  # noqa: E402
from app.models import Shloka  # noqa: E402
from app.services import iast  # noqa: E402
from app.services.chandas import scan as chandas_scan  # noqa: E402
from app.grading.analyzer import analyze_sentence  # noqa: E402

MIN_BREAKDOWN_WORDS = 2

# Everything that differs between two printings of one verse: spacing, dandas,
# verse numbers, punctuation, the avagraha.
_NOT_LETTERS = re.compile(r"[\s।॥\d०-९.,;:!?'\"\-–—ऽ|]+")
_SAME_VERSE_RATIO = 0.97


def _letters(text: str) -> str:
    return _NOT_LETTERS.sub("", unicodedata.normalize("NFC", text or ""))


def same_verse(a: str, b: str) -> bool:
    """True when two texts are one verse, whatever their punctuation and numbering.

    A fragment is not the verse: half a śloka scores about 0.67 and is False.
    """
    la, lb = _letters(a), _letters(b)
    if not la or not lb:
        return False
    return la == lb or difflib.SequenceMatcher(None, la, lb).ratio() >= _SAME_VERSE_RATIO


def build_row(devanagari: str, ref: str, min_words: int = MIN_BREAKDOWN_WORDS) -> dict | None:
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
    if confident < min_words:
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


def run_import(payload: dict, live: bool, *, fix_existing: bool = False,
               min_words: int = MIN_BREAKDOWN_WORDS) -> dict:
    licence = (payload.get("licence") or "").strip()
    source = (payload.get("source") or "").strip()
    if not licence:
        raise SystemExit("import refused: no per-text licence in the payload (§6)")
    # P21-4: register rides in the payload (Vedic thin slice lives here);
    # allowlist only — a typo must not mint a fourth register silently.
    register = (payload.get("register") or "classical").strip().lower()
    if register not in ("classical", "vedic", "laukika"):
        raise SystemExit(f"import refused: unknown register {register!r} (§5)")
    verses = payload.get("verses") or []
    db = SessionLocal()
    try:
        existing_refs = {r[0] for r in db.query(Shloka.source_ref).all()}
        # Rows that claim to be from this text under a reference the payload
        # does not have (the seed's "Bhagavad Gītā 8.30": chapter 8 ends at 28).
        incoming_refs = {v.get("ref", "") for v in verses}
        books = {ref.rsplit(" ", 1)[0] for ref in incoming_refs if " " in ref}
        orphans = sorted(r for r in existing_refs
                         if r and r not in incoming_refs and r.rsplit(" ", 1)[0] in books)
        dates = sorted({r[0] for r in db.query(Shloka.date).all()})
        next_date = (datetime.date.fromisoformat(dates[-1]) + datetime.timedelta(days=1)
                     if dates else datetime.date.today())
        added = 0
        skipped_dup = 0
        skipped_thin = []
        fixed: list[dict] = []
        mismatched: list[str] = []
        for v in verses:
            ref = v.get("ref", "")
            if ref in existing_refs:
                incoming_text = v.get("devanagari", "")
                for existing in db.query(Shloka).filter_by(source_ref=ref).all():
                    if same_verse(existing.devanagari, incoming_text):
                        # Preserve existing Sanskrit, IDs and authored meanings.
                        # Only fill translation gaps.
                        if live:
                            for field in ("translation_hi", "translation_en"):
                                incoming = (v.get(field) or "").strip()
                                if incoming and not (getattr(existing, field) or "").strip():
                                    setattr(existing, field, incoming)
                        continue
                    # The stored text is not this verse. Its translation would
                    # sit beside the wrong Sanskrit, so it is never filled.
                    if not fix_existing:
                        mismatched.append(ref)
                        continue
                    replacement = build_row(incoming_text, ref, min_words)
                    if replacement is None:
                        mismatched.append(ref)
                        continue
                    fixed.append({"ref": ref, "id": existing.id, "date": existing.date,
                                  "was": (existing.devanagari or "")[:80]})
                    if live:
                        for field in ("devanagari", "iast", "metre", "word_breakdown", "features"):
                            setattr(existing, field, replacement[field])
                        existing.translation_hi = (v.get("translation_hi") or "").strip()
                        existing.translation_en = (v.get("translation_en") or "").strip()
                skipped_dup += 1
                continue
            row = build_row(v.get("devanagari", ""), ref, min_words)
            if row is None:
                skipped_thin.append(ref)
                continue
            if live:
                import uuid
                db.add(Shloka(
                    id=uuid.uuid4().hex[:16],
                    date=(next_date + datetime.timedelta(days=added)).isoformat(),
                    audio_url="",  # §6: never TTS a corpus import
                    register=register,
                    translation_hi=(v.get("translation_hi") or "").strip(),
                    translation_en=(v.get("translation_en") or "").strip(),
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
            "skipped_thin": skipped_thin, "fixed": fixed, "mismatched": mismatched,
            "orphans": orphans, "licence": licence, "source": source}


def print_report(report: dict, live: bool, min_words: int = MIN_BREAKDOWN_WORDS) -> None:
    mode = "LIVE" if live else "DRY-RUN (nothing written)"
    verb = "added" if live else "would be added"
    print(f"[import] {mode}: {report['added']} distinct verse(s) {verb}, "
          f"{report['skipped_dup']} duplicate(s) skipped")
    if report["skipped_thin"]:
        print(f"[import] skipped (< {min_words} confident words): "
              + ", ".join(report["skipped_thin"]))
    if report["fixed"]:
        verb = "replaced" if live else "would be replaced"
        print(f"[import] {len(report['fixed'])} existing row(s) {verb} with the incoming verse:")
        for f in report["fixed"]:
            print(f"           {f['ref']}  ({f['date']})  was: {f['was']}")
    if report["mismatched"]:
        print(f"[import] {len(report['mismatched'])} existing row(s) hold a different text than the "
              "incoming verse and were left alone (no translation filled; --fix-existing replaces them): "
              + ", ".join(report["mismatched"]))
    if report["orphans"]:
        print("[import] existing reference(s) this text does not have, left alone: "
              + ", ".join(report["orphans"]))


def main(argv=None) -> int:
    p = argparse.ArgumentParser(prog="import_text",
                                description="P21-3 second-text importer (dry-run default).")
    p.add_argument("--file", required=True, help="input JSON payload (see module docstring)")
    p.add_argument("--live", action="store_true", help="write rows (default dry-run)")
    p.add_argument("--fix-existing", action="store_true",
                   help="replace an existing row's text when it is not the incoming verse")
    p.add_argument("--min-words", type=int, default=MIN_BREAKDOWN_WORDS,
                   help="fewest confidently analysed words for a verse to be imported (default 2)")
    args = p.parse_args(argv)
    payload = json.loads(Path(args.file).read_text(encoding="utf-8"))
    report = run_import(payload, live=args.live, fix_existing=args.fix_existing,
                        min_words=args.min_words)
    print_report(report, args.live, args.min_words)
    print(f"[import] licence: {report['licence']}")
    if args.live:
        out = Path("results/imports") / (Path(args.file).stem + ".report.json")
        if out.resolve() == Path(args.file).resolve():
            raise SystemExit("import refused: report would overwrite the input payload")
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"[import] report written to {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
