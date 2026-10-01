"""Run ``scripts/import_text`` against the PRODUCTION database, with a backup first.

From the repo root or from backend/ (the script moves to backend/ itself)::

    backend/.venv/Scripts/python.exe backend/scripts/prod_import.py --file results/imports/gita.payload.json --fix-existing --min-words 0
    backend/.venv/Scripts/python.exe backend/scripts/prod_import.py --file results/imports/gita.payload.json --fix-existing --min-words 0 --live

Dry run is the default and writes nothing. ``--live`` first saves the whole
``shlokas`` table to ``results/backups/prod-shlokas-<UTC time>.json`` and only
then imports. ``--restore <that file> --live`` puts the table back exactly.

The connection string is ``DATABASE_URL`` when it is set, otherwise the newest
version of the Secret Manager secret the Cloud Run service reads
(``shabd-database-url``), fetched with gcloud. It is never printed.

This must be set BEFORE anything from ``app`` is imported: ``app.db`` builds
its engine at import time, which is why this is a wrapper and not a flag on
``import_text``.
"""

from __future__ import annotations

import argparse
import io
import json
import os
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

BACKEND = Path(__file__).resolve().parent.parent
FIELDS = ["id", "date", "source_ref", "devanagari", "iast", "metre", "word_breakdown",
          "features", "audio_url", "register", "translation_hi", "translation_en"]


def _database_url(secret: str) -> str:
    url = (os.environ.get("DATABASE_URL") or "").strip()
    if url:
        return url
    gcloud = shutil.which("gcloud.cmd") or shutil.which("gcloud")
    if not gcloud:
        raise SystemExit("prod_import: DATABASE_URL is not set and gcloud is not on PATH.")
    out = subprocess.run(
        [gcloud, "secrets", "versions", "access", "latest", f"--secret={secret}"],
        capture_output=True, text=True, check=False,
    )
    url = (out.stdout or "").strip()
    if out.returncode != 0 or not url:
        raise SystemExit(f"prod_import: could not read the secret {secret!r} with gcloud "
                         f"(exit {out.returncode}). Are you signed in to the right project?")
    return url


def _redact(message: str, url: str) -> str:
    """An error message with the connection string and its password taken out."""
    text = message.replace(url, "<DATABASE_URL>")
    if "@" in url and "://" in url:
        credentials = url.split("://", 1)[1].split("@", 1)[0]
        if ":" in credentials:
            text = text.replace(credentials.split(":", 1)[1], "<password>")
    return text


def _counts(db, Shloka, books: set[str]) -> str:
    rows = db.query(Shloka.source_ref).all()
    of_text = sum(1 for (ref,) in rows if (ref or "").rsplit(" ", 1)[0] in books)
    return f"{len(rows)} verses in the table, {of_text} of them from this text"


def _backup(db, Shloka) -> Path:
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    out = Path("results/backups") / f"prod-shlokas-{stamp}.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    rows = db.query(Shloka).order_by(Shloka.date.asc(), Shloka.id.asc()).all()
    data = [{f: getattr(r, f) for f in FIELDS} for r in rows]
    out.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
    if out.stat().st_size == 0 or len(data) != len(rows):
        raise SystemExit("prod_import: the backup did not write correctly; nothing was imported.")
    print(f"[backup] {len(data)} verses saved to backend/{out.as_posix()}")
    return out


def _restore(db, Shloka, backup: Path, live: bool) -> None:
    data = json.loads(backup.read_text(encoding="utf-8"))
    keep = {row["id"]: row for row in data}
    current = {r.id: r for r in db.query(Shloka).all()}
    extra = [i for i in current if i not in keep]
    missing = [i for i in keep if i not in current]
    changed = [i for i in keep if i in current
               and any(getattr(current[i], f) != keep[i][f] for f in FIELDS)]
    verb = "" if live else "would be "
    print(f"[restore] {len(extra)} verse(s) {verb}deleted, {len(missing)} {verb}re-created, "
          f"{len(changed)} {verb}put back to their saved text")
    if not live:
        return
    for i in extra:
        db.delete(current[i])
    for i in missing:
        db.add(Shloka(**keep[i]))
    for i in changed:
        for f in FIELDS:
            setattr(current[i], f, keep[i][f])
    db.commit()
    print("[restore] done")


def main(argv=None) -> int:
    p = argparse.ArgumentParser(prog="prod_import", description=__doc__.splitlines()[0])
    p.add_argument("--file", help="import payload, relative to backend/")
    p.add_argument("--live", action="store_true", help="write (default is a dry run)")
    p.add_argument("--fix-existing", action="store_true",
                   help="replace an existing row's text when it is not the incoming verse")
    p.add_argument("--min-words", type=int, default=None,
                   help="fewest confidently analysed words for a verse to be imported")
    p.add_argument("--restore", help="a backup written by this script, relative to backend/")
    p.add_argument("--secret", default="shabd-database-url")
    args = p.parse_args(argv)
    if bool(args.file) == bool(args.restore):
        p.error("give exactly one of --file and --restore")

    os.chdir(BACKEND)  # payload paths, results/ and the Vidyut data are relative to backend/
    sys.path.insert(0, str(BACKEND))
    if hasattr(sys.stdout, "buffer"):
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

    url = _database_url(args.secret)
    os.environ["DATABASE_URL"] = url
    try:
        from app.db import SessionLocal, engine
        from app.models import Shloka
        from scripts.import_text import MIN_BREAKDOWN_WORDS, print_report, run_import

        if engine.dialect.name != "postgresql":
            raise SystemExit("prod_import: this is not the Postgres database. Refusing to run.")
        print("[prod] connected to the production database" + ("" if args.live else " (dry run)"))

        if args.restore:
            with SessionLocal() as db:
                _restore(db, Shloka, Path(args.restore), args.live)
            return 0

        payload = json.loads(Path(args.file).read_text(encoding="utf-8"))
        books = {v.get("ref", "").rsplit(" ", 1)[0] for v in payload.get("verses") or []}
        min_words = MIN_BREAKDOWN_WORDS if args.min_words is None else args.min_words
        with SessionLocal() as db:
            print("[before]", _counts(db, Shloka, books))
            if args.live:
                _backup(db, Shloka)
        report = run_import(payload, live=args.live, fix_existing=args.fix_existing,
                            min_words=min_words)
        print_report(report, args.live, min_words)
        print(f"[import] licence: {report['licence']}")
        if args.live:
            out = Path("results/imports") / (Path(args.file).stem + ".prod-report.json")
            out.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
            with SessionLocal() as db:
                print("[after]", _counts(db, Shloka, books))
        else:
            print("[prod] nothing was written. Add --live to import.")
        return 0
    except SystemExit:
        raise
    except Exception as exc:  # noqa: BLE001 - never let a driver error echo the connection string
        print("prod_import failed:", type(exc).__name__, _redact(str(exc), url)[:600])
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
