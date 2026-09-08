"""P8-5 · Database backup: timestamped copy, retention prune, optional upload.

Policy (HANDOVER P8-5 — Cloud Run kept, owner decision 2026-09-08):
- SQLite (dev): copy ``app.db`` to ``backups/app-YYYYMMDD-HHMMSS.db``.
- Postgres (production, DATABASE_URL set): ``pg_dump --format=custom`` to
  ``backups/app-YYYYMMDD-HHMMSS.dump``. Requires the libpq ``pg_dump`` binary
  on PATH (Cloud Shell has it; the API image does not — run from Cloud Shell
  or a cron host, never inside the Cloud Run container).
- Keep the newest KEEP backups (default 30), delete older ones.
- With --upload + GCS_BACKUP_BUCKET set, also upload the newest backup to the
  bucket (same lazy-import rule as storage.py: missing package is a loud
  error, not a silent skip).

Run (CWD is the schema — §2.10):
    python -m scripts.backup_db [--keep 30] [--upload]
Nothing is ever deleted except pruned backups older than the keep window, and
the prune only runs AFTER the new backup verifies (size > 0).
"""

from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

if __package__ in (None, ""):  # allow `python scripts/backup_db.py`
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))


def _stamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")


def _prune(backup_dir: Path, keep: int) -> list[str]:
    """Delete backups older than the keep window. Returns deleted names."""
    files = sorted(
        [p for p in backup_dir.iterdir() if p.is_file()],
        key=lambda p: p.name,
    )
    doomed = files[: max(0, len(files) - keep)]
    deleted = []
    for p in doomed:
        p.unlink()
        deleted.append(p.name)
    return deleted


def backup_sqlite(db_path: str, backup_dir: Path, keep: int) -> dict:
    src = Path(db_path)
    if not src.is_file():
        raise SystemExit(f"backup refused: no database at {src} (§2.13 — back up, don't invent)")
    backup_dir.mkdir(parents=True, exist_ok=True)
    dest = backup_dir / f"app-{_stamp()}.db"
    shutil.copy2(src, dest)
    if dest.stat().st_size == 0:
        dest.unlink()
        raise SystemExit("backup refused: copy verified at 0 bytes")
    deleted = _prune(backup_dir, keep)
    return {"backend": "sqlite", "file": str(dest), "bytes": dest.stat().st_size, "pruned": deleted}


def backup_postgres(database_url: str, backup_dir: Path, keep: int) -> dict:
    dump = shutil.which("pg_dump")
    if dump is None:
        raise SystemExit("backup refused: pg_dump not on PATH (run from Cloud Shell, not the API image)")
    backup_dir.mkdir(parents=True, exist_ok=True)
    dest = backup_dir / f"app-{_stamp()}.dump"
    env = dict(os.environ, PGCONNECT_TIMEOUT="15")
    r = subprocess.run(
        [dump, "--format=custom", "--no-owner", f"--file={dest}", database_url],
        capture_output=True, text=True, env=env, timeout=600,
    )
    if r.returncode != 0 or not dest.is_file() or dest.stat().st_size == 0:
        if dest.is_file():
            dest.unlink()
        raise SystemExit(f"backup refused: pg_dump failed: {r.stderr.strip()[-500:]}")
    deleted = _prune(backup_dir, keep)
    return {"backend": "postgres", "file": str(dest), "bytes": dest.stat().st_size, "pruned": deleted}


def upload_newest(backup_dir: Path, bucket: str, newest: str) -> str:
    try:
        from google.cloud import storage as gcs  # type: ignore
    except ImportError:
        raise SystemExit("upload refused: google-cloud-storage not installed")
    client = gcs.Client()
    blob = client.bucket(bucket).blob(f"db-backups/{Path(newest).name}")
    blob.upload_from_filename(newest)
    return f"gs://{bucket}/db-backups/{Path(newest).name}"


def main(argv=None) -> int:
    p = argparse.ArgumentParser(prog="backup_db", description="P8-5 timestamped DB backup.")
    p.add_argument("--keep", type=int, default=30, help="retain newest N backups (default 30)")
    p.add_argument("--upload", action="store_true", help="also upload newest to GCS_BACKUP_BUCKET")
    p.add_argument("--dir", default="backups", help="backup directory (default backups/)")
    args = p.parse_args(argv)

    database_url = os.environ.get("DATABASE_URL", "").strip()
    backup_dir = Path(args.dir)
    if database_url:
        report = backup_postgres(database_url, backup_dir, args.keep)
    else:
        from app.config import settings  # noqa: E402
        report = backup_sqlite(settings.db_path, backup_dir, args.keep)
    print(f"[backup] {report['backend']}: {report['file']} ({report['bytes']} bytes)")
    if report["pruned"]:
        print(f"[backup] pruned {len(report['pruned'])}: " + ", ".join(report["pruned"]))
    if args.upload:
        bucket = os.environ.get("GCS_BACKUP_BUCKET", "").strip()
        if not bucket:
            raise SystemExit("upload refused: GCS_BACKUP_BUCKET is not set")
        dest = upload_newest(backup_dir, bucket, report["file"])
        print(f"[backup] uploaded: {dest}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
