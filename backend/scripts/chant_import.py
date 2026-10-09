"""Import chant audio + manifest into storage and verse_audio (5.6).

Usage:
    python -m scripts.chant_import --manifest ../gpu_out/manifest.jsonl --audio ../gpu_out/audio [--decisions ../gpu_out/decisions.json] [--live]

Dry run by default: checks verse_uids exist, audio files exist, prints plan.
--live stores files (content-hashed paths, idempotent) and upserts rows.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--manifest", required=True)
    ap.add_argument("--audio", required=True)
    ap.add_argument("--decisions", default="")
    ap.add_argument("--live", action="store_true")
    args = ap.parse_args()

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
        for (ref, dev) in db.query(Shloka.source_ref, Shloka.devanagari).all():
            known.add(_uid(ref or "", dev or ""))
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
                    url = storage.store(data, dest, content_type="audio/mp4")
                else:
                    url = storage.url(dest)
            except Exception as e:
                print(f"store failed {uid}: {e}")
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
        print(f"upserted: {n_up}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
