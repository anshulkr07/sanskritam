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
- ``--replace-refs`` names, comma-separated, refs a review has decided to
  rewrite even though the stored text scores as the same verse: a one-letter
  typo sits above the 0.97 ratio, so ``--fix-existing`` never reaches it.
  Listed refs take the same in-place replacement path; once their letters
  match, they are duplicates again (the repair is idempotent). The corrected
  text changes the row's ``verse_uid`` (models.py hashes source_ref +
  devanagari on every write), so ``verse_audio`` chant rows and
  ``recite_attempts`` history keyed by the old uid move with it.
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
from app.models import ReciteAttempt, Shloka, VerseAudio  # noqa: E402
from app.services import iast  # noqa: E402
from app.services.chandas import scan as chandas_scan  # noqa: E402
from app.services.chant_text import verse_uid as verse_uid_of  # noqa: E402
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


def _scan_copy(dev: str) -> str:
    """The text the metre engine reads. Its Rust core panics (not a catchable
    exception) on Vedic accent marks (seen 2026-10-09 on a Katha verse), so it
    gets a copy without them; the stored verse keeps its text."""
    dev = dev.replace("ꣳ", "ं")
    return "".join(
        ch for ch in dev
        if not (0x0951 <= ord(ch) <= 0x0954 or 0x1CD0 <= ord(ch) <= 0x1CFF
                or 0xA8E0 <= ord(ch) <= 0xA8F2))


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
        metre = (chandas_scan(_scan_copy(dev)).get("metre") or "") or ""
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


def _trailing_numbers(ref: str) -> list[str] | None:
    """Trailing number parts of a ref, e.g. 'Yoga Sūtra 1.2' -> ['1', '2']."""
    import re as _re
    m = _re.search(r"(\d+(?:\.\d+)*)\s*$", (ref or "").strip())
    if not m:
        return None
    return m.group(1).split(".")


def _chapter_of_ref(ref: str) -> str | None:
    """Every number but the last, joined by '.', or '' for a one-number ref."""
    parts = _trailing_numbers(ref)
    if parts is None:
        return None
    if len(parts) <= 1:
        return ""
    return ".".join(str(int(p)) for p in parts[:-1])


def _paged_book_entry(slug: str) -> dict | None:
    try:
        from app.seeds.canon import CANON_TEXTS as _CANON
    except Exception:
        return None
    for t in _CANON:
        if t.get("slug") == slug:
            return t
    return None


def _build_paged_row(devanagari: str, ref: str) -> tuple[dict, bool]:
    """Build a paged row that is never skipped.

    Returns (row, had_breakdown). On analyzer failure the verse is kept with
    an empty breakdown (handover_reading_shelf.md 6.3.5); the caller lists it
    under no_breakdown.
    """
    dev = (devanagari or "").strip()
    try:
        breakdown_src = analyze_sentence(dev) if dev else None
    except Exception:
        breakdown_src = None
    if breakdown_src is None:
        try:
            metre = (chandas_scan(_scan_copy(dev)).get("metre") or "") or "" if dev else ""
        except Exception:
            metre = ""
        try:
            iast_text = iast.to_iast(dev) if dev else ""
        except Exception:
            iast_text = ""
        return ({
            "source_ref": ref,
            "devanagari": dev,
            "iast": iast_text,
            "metre": metre,
            "word_breakdown": [],
            "features": [],
        }, False)
    breakdown = [
        {"word": r.word,
         "meaning": (sorted(set((r.parsed or {}).keys())) or [""])[0] if r.is_confident else "",
         "features": sorted(set((r.parsed or {}).values())) if r.is_confident else []}
        for r in breakdown_src
    ]
    try:
        metre = (chandas_scan(_scan_copy(dev)).get("metre") or "") or ""
    except Exception:
        metre = ""
    feats: list[str] = []
    for w in breakdown:
        feats.extend(f for f in w["features"] if f not in feats)
    return ({
        "source_ref": ref,
        "devanagari": dev,
        "iast": iast.to_iast(dev),
        "metre": metre,
        "word_breakdown": breakdown,
        "features": feats,
    }, True)


def _run_paged_import(payload: dict, live: bool, min_words: int | None) -> dict:
    import time as _time
    import uuid as _uuid

    slug = payload.get("book")
    licence = (payload.get("licence") or "").strip()
    source = (payload.get("source") or "").strip()
    register = (payload.get("register") or "classical").strip().lower()
    if not licence:
        raise SystemExit("import refused: no per-text licence in the payload (§6)")
    if register not in ("classical", "vedic", "laukika"):
        raise SystemExit(f"import refused: unknown register {register!r} (§5)")
    entry = _paged_book_entry(slug)
    if not entry or not entry.get("paged"):
        raise SystemExit(f"import refused: unknown or non-paged book {slug!r} (6.3.1)")
    if "daily" not in payload or payload.get("daily") is not False:
        raise SystemExit("import refused: paged payload needs 'daily': false (6.3.2)")
    ref_name = (entry.get("ref_prefixes") or [""])[0]
    if not ref_name:
        raise SystemExit(f"import refused: book {slug!r} has no ref name (6.3.3)")
    verses = payload.get("verses") or []
    # 6.3.3: refuse the whole payload on the first bad ref/chapter.
    failures: list[str] = []
    for v in verses:
        ref = v.get("ref", "")
        chapter = v.get("chapter", "")
        ok = True
        if not ref.startswith(ref_name + " "):
            ok = False
        elif _trailing_numbers(ref) is None:
            ok = False
        else:
            want_chapter = _chapter_of_ref(ref)
            # Normalise numeric chapters ("01" -> "1", "1.01" -> "1.1").
            def _norm(ch: str) -> str:
                if ch == "":
                    return ""
                try:
                    return ".".join(str(int(p)) for p in str(ch).split("."))
                except Exception:
                    return str(ch)
            if _norm(chapter) != _norm(want_chapter or ""):
                ok = False
        if not ok:
            failures.append(f"{ref!r} chapter={chapter!r} want={_chapter_of_ref(ref)!r}")
    if failures:
        print(f"import refused: {len(failures)} verse(s) outside book {slug!r} (6.3.3):")
        for f in failures[:20]:
            print(f"           {f}")
        raise SystemExit(f"import refused: {len(failures)} verse(s) fail the ref/chapter check (6.3.3)")
    # Within-book dedupe only (6.3.4): a classic row may carry the same ref.
    db = SessionLocal()
    try:
        existing_book_refs = {r[0] for r in db.query(Shloka.source_ref).filter(Shloka.book == slug).all()}
        incoming_refs = {v.get("ref", "") for v in verses}
        orphans = sorted(r for r in existing_book_refs if r not in incoming_refs)
        today_iso = datetime.date.today().isoformat()
        added = 0
        skipped_dup = 0
        no_breakdown: list[str] = []
        chapters: dict[str, int] = {}
        # A paged import never skips a verse (6.3.5), so --min-words (default 0
        # here) has nothing to filter; the argument is accepted and ignored.
        t0 = _time.time()
        seen_in_payload: set[str] = set()
        for idx, v in enumerate(verses):
            ref = v.get("ref", "")
            chapter = v.get("chapter", "")
            # Normalise chapter numbers for storage.
            try:
                if chapter == "":
                    chapter_norm = ""
                else:
                    chapter_norm = ".".join(str(int(p)) for p in str(chapter).split("."))
            except Exception:
                chapter_norm = str(chapter)
            if ref in existing_book_refs or ref in seen_in_payload:
                skipped_dup += 1
                seen_in_payload.add(ref)
                continue
            seen_in_payload.add(ref)
            row, _ok = _build_paged_row(v.get("devanagari", ""), ref)
            # Thin analysis is listed, never a reason to drop the verse (a
            # scripture with holes is worse than a verse without analysis).
            if not row["word_breakdown"]:
                no_breakdown.append(ref)
            chapters[chapter_norm] = chapters.get(chapter_norm, 0) + 1
            if live:
                db.add(Shloka(
                    id=_uuid.uuid4().hex[:16],
                    date=today_iso,
                    audio_url="",
                    register=register,
                    book=slug,
                    chapter=chapter_norm,
                    seq=idx + 1,
                    in_daily=False,
                    translation_hi=(v.get("translation_hi") or "").strip(),
                    translation_en=(v.get("translation_en") or "").strip(),
                    **row,
                ))
                added += 1
                if added % 500 == 0:
                    db.commit()
                    print(f"[import] {slug}: {added} verses ...")
            else:
                added += 1
        if live:
            db.commit()
        dt = max(1e-6, _time.time() - t0)
        print(f"[import] {slug}: {added} verses in {dt:.1f}s ({added / dt:.1f}/s)")
        return {"added": added, "skipped_dup": skipped_dup,
                "skipped_thin": [], "fixed": [], "mismatched": [],
                "orphans": orphans, "licence": licence, "source": source,
                "book": slug, "chapters": chapters, "no_breakdown": no_breakdown}
    finally:
        db.close()


def run_import(payload: dict, live: bool, *, fix_existing: bool = False,
               min_words: int | None = None,
               replace_refs: set[str] | None = None) -> dict:
    replace_refs = replace_refs or set()
    # Paged import (handover_reading_shelf.md 6.3): a payload with "book".
    if payload.get("book"):
        return _run_paged_import(payload, live, min_words)
    if min_words is None:
        min_words = MIN_BREAKDOWN_WORDS
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
                force = ref in replace_refs
                for existing in db.query(Shloka).filter_by(source_ref=ref).all():
                    differs = _letters(existing.devanagari) != _letters(incoming_text)
                    if not (force and differs) and same_verse(existing.devanagari, incoming_text):
                        # Preserve existing Sanskrit, IDs and authored meanings.
                        # Only fill translation gaps.
                        if live:
                            for field in ("translation_hi", "translation_en"):
                                incoming = (v.get(field) or "").strip()
                                if incoming and not (getattr(existing, field) or "").strip():
                                    setattr(existing, field, incoming)
                        continue
                    # The stored text is not this verse (or a review listed the
                    # ref for replacement). Its translation would sit beside the
                    # wrong Sanskrit, so it is never filled.
                    if not fix_existing and not force:
                        mismatched.append(ref)
                        continue
                    replacement = build_row(incoming_text, ref, min_words)
                    if replacement is None:
                        mismatched.append(ref)
                        continue
                    old_uid = (existing.verse_uid
                               or verse_uid_of(existing.source_ref or "",
                                               existing.devanagari or ""))
                    new_uid = verse_uid_of(ref, replacement["devanagari"])
                    uid_rows = 0
                    if old_uid and new_uid and old_uid != new_uid:
                        for model in (VerseAudio, ReciteAttempt):
                            uid_rows += db.query(model).filter_by(verse_uid=old_uid).count()
                    fixed.append({"ref": ref, "id": existing.id, "date": existing.date,
                                  "was": (existing.devanagari or "")[:80],
                                  "uid_rows": uid_rows})
                    if live:
                        for field in ("devanagari", "iast", "metre", "word_breakdown", "features"):
                            setattr(existing, field, replacement[field])
                        existing.translation_hi = (v.get("translation_hi") or "").strip()
                        existing.translation_en = (v.get("translation_en") or "").strip()
                        if uid_rows:
                            # The before_update listener (models.py) will stamp
                            # the new hash on flush; chant rows and recite
                            # history are keyed by the old one and follow the
                            # corrected text.
                            for model in (VerseAudio, ReciteAttempt):
                                db.query(model).filter_by(verse_uid=old_uid).update(
                                    {"verse_uid": new_uid}, synchronize_session=False)
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
                    book=None,
                    chapter="",
                    seq=0,
                    in_daily=True,
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


def print_report(report: dict, live: bool, min_words: int | None = MIN_BREAKDOWN_WORDS) -> None:
    mode = "LIVE" if live else "DRY-RUN (nothing written)"
    verb = "added" if live else "would be added"
    print(f"[import] {mode}: {report['added']} distinct verse(s) {verb}, "
          f"{report['skipped_dup']} duplicate(s) skipped")
    if report.get("book"):
        print(f"[import] book: {report['book']}, chapters: {report.get('chapters', {})}")
    if report.get("no_breakdown"):
        print(f"[import] {len(report['no_breakdown'])} verse(s) kept with empty breakdown: "
              + ", ".join(report["no_breakdown"][:20]))
    if report["skipped_thin"]:
        print(f"[import] skipped (< {min_words} confident words): "
              + ", ".join(report["skipped_thin"]))
    if report["fixed"]:
        verb = "replaced" if live else "would be replaced"
        print(f"[import] {len(report['fixed'])} existing row(s) {verb} with the incoming verse:")
        for f in report["fixed"]:
            extra = (f"  [{f['uid_rows']} chant/history row(s) follow the corrected text]"
                     if f.get("uid_rows") else "")
            print(f"           {f['ref']}  ({f['date']})  was: {f['was']}{extra}")
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
    p.add_argument("--min-words", type=int, default=None,
                   help="fewest confidently analysed words for a verse to be imported "
                        "(default 2 classic, 0 paged)")
    p.add_argument("--replace-refs", default="",
                   help="comma-separated refs to rewrite even when the stored text "
                        "reads as the same verse (a reviewed typo repair)")
    args = p.parse_args(argv)
    payload = json.loads(Path(args.file).read_text(encoding="utf-8"))
    # Paged payloads set --min-words 0 themselves (6.3.5).
    min_words = args.min_words
    if min_words is None:
        min_words = 0 if payload.get("book") else MIN_BREAKDOWN_WORDS
    replace_refs = {r.strip() for r in args.replace_refs.split(",") if r.strip()}
    report = run_import(payload, live=args.live, fix_existing=args.fix_existing,
                        min_words=min_words, replace_refs=replace_refs)
    print_report(report, args.live, min_words)
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
