"""Import chant audio + manifest into storage and verse_audio (5.6).

Usage:
    python -m scripts.chant_import --manifest ../gpu_out/manifest.jsonl --audio ../gpu_out/audio [--decisions ../gpu_out/decisions.json] [--live]

Dry run by default: checks verse_uids exist, audio files exist, prints plan.
--live stores files (content-hashed paths, idempotent) and upserts rows.
--match-relabelled files the audio of a verse whose reference was changed after
the export (a seed correction renamed Ramayana 1.2.14 to 1.2.15) under the
verse that has the same sung text, when exactly one such verse is left. The
verse_uid hashes the reference and the text, so a renamed verse otherwise no
longer matches its audio. Text that differs is never matched.
--upload-only (with --live) stores the files and writes no rows: the audio can
sit in R2/GCS under the keys the import will use (chant/<voice>/<file>) before
anything is reviewed, and the real import later finds the files already there.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--manifest", required=True)
    ap.add_argument("--audio", required=True)
    ap.add_argument("--decisions", default="")
    ap.add_argument("--live", action="store_true")
    ap.add_argument("--match-relabelled", action="store_true",
                    help="match a manifest verse the database no longer has to the one verse with the same sung text")
    ap.add_argument("--upload-only", action="store_true",
                    help="with --live: store the audio, write no verse_audio rows")
    args = ap.parse_args()
    if args.upload_only and not args.live:
        ap.error("--upload-only needs --live")

    from app.config import settings
    from app.db import SessionLocal
    from app.models import Shloka, VerseAudio
    from app.services.chant_text import verse_uid as _uid
    from app.services.storage import get_storage

    manifest = [json.loads(l) for l in Path(args.manifest).read_text(encoding="utf-8").splitlines() if l.strip()]
    decisions: dict[str, str] = {}
    if args.decisions:
        decisions = json.loads(Path(args.decisions).read_text(encoding="utf-8"))
        if isinstance(decisions, dict) and "decisions" in decisions:
            decisions = decisions["decisions"]

    db = SessionLocal()
    try:
        # Known uids from DB (compute 4.1 over rows: matches across DBs).
        known: set[str] = set()
        text_of: dict[str, str] = {}
        for (ref, dev) in db.query(Shloka.source_ref, Shloka.devanagari).all():
            u = _uid(ref or "", dev or "")
            known.add(u)
            text_of[u] = dev or ""
        if args.match_relabelled:
            from collections import Counter

            from app.services.chant_text import _tts_of, chant_lines

            have_audio = {m.get("verse_uid") for m in manifest}
            free: dict[tuple, list[str]] = {}
            for u, dev in text_of.items():
                if u not in have_audio:
                    free.setdefault(tuple(l["tts"] for l in chant_lines(dev)), []).append(u)
            sigs = {}
            for m in manifest:
                if m.get("verse_uid") not in known:
                    sigs[m["verse_uid"]] = tuple(_tts_of(l.get("text", "")) for l in m.get("lines", []))
            how_many = Counter(sigs.values())
            remapped = []
            for i, m in enumerate(manifest):
                sig = sigs.get(m.get("verse_uid"))
                cands = free.get(sig, []) if sig and all(sig) and how_many[sig] == 1 else []
                if len(cands) == 1:
                    print(f"  relabelled: {m.get('source_ref')} ({m['verse_uid']}) -> {cands[0]}")
                    manifest[i] = dict(m, verse_uid=cands[0])
                    remapped.append(cands[0])
            if remapped:
                known |= set(remapped)
        audio_dir = Path(args.audio)
        to_do = []
        skipped = []
        for m in manifest:
            uid = m.get("verse_uid", "")
            if uid not in known:
                skipped.append(uid)
                continue
            f = audio_dir / m.get("file", "")
            if not f.exists():
                skipped.append(uid + " (missing file)")
                continue
            to_do.append(m)
        print(f"manifest: {len(manifest)} known: {len(to_do)} skipped: {len(skipped)}")
        for s in skipped[:20]:
            print(f"  skip {s}")
        if not args.live:
            print("dry run: nothing written, nothing spent.")
            return
        storage = get_storage()
        n_up = 0
        for m in to_do:
            uid = m["verse_uid"]
            f = audio_dir / m["file"]
            data = f.read_bytes()
            # Content-hashed storage path: check exists() first (idempotent).
            dest = f"chant/{m.get('voice', settings.chant_voice)}/{m['file']}"
            url = None
            try:
                if not storage.exists(dest):
                    storage.store(data, dest, content_type="audio/mp4")
                # Always the storage's own url(): LocalStorage.store() returns a
                # file path, which the phone cannot fetch ("/audio/..." it can).
                url = storage.url(dest)
            except Exception as e:
                print(f"store failed {uid}: {e}")
                continue
            if args.upload_only:
                n_up += 1
                print(f"  stored {dest} -> {url}")
                continue
            status = m.get("qc_status", "needs_listen")
            if uid in decisions and decisions[uid] in ("approved", "rejected"):
                status = decisions[uid]
            row = db.query(VerseAudio).filter(
                VerseAudio.verse_uid == uid, VerseAudio.voice == m.get("voice", settings.chant_voice)).first()
            if row is None:
                row = VerseAudio(verse_uid=uid, voice=m.get("voice", settings.chant_voice))
                db.add(row)
            row.url = url or m.get("file", "")
            row.duration_ms = int(m.get("duration_ms", 0))
            row.lines = m.get("lines", [])
            row.meter = m.get("meter", "")
            row.qc_status = status
            row.qc_reasons = m.get("qc_reasons", [])
            row.source_commit = m.get("source_commit", "")
            n_up += 1
        db.commit()
        print(f"stored {n_up} file(s), no rows written (--upload-only)" if args.upload_only else f"upserted: {n_up}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
