"""Apply the accepted local-side fixes from the classic reconciliation.

Decisions: results/corpus/classic-reconciliation-decisions.md (roadmap 3.1).
Production is read-only and is never written; only backend/app.db is updated.
For each named local row, devanagari/translation_en/translation_hi are copied
from the matching production row when they differ; id, date, audio and all
other fields are untouched.

Dry-run by default. Usage (from backend/):
    PYTHONUTF8=1 ./.venv/Scripts/python.exe -m scripts.books.apply_local_classic_sync
    PYTHONUTF8=1 ./.venv/Scripts/python.exe -m scripts.books.apply_local_classic_sync --apply
"""

from __future__ import annotations

import argparse
import datetime
import shutil
import sqlite3
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[2]
LOCAL_DB = BACKEND / "app.db"

sys.path.insert(0, str(BACKEND))
from scripts.books.tracker import _prod_url, _redact  # noqa: E402

# (local id, production id): local row keeps its identity; content follows prod.
SYNC: list[tuple[str, str]] = [
    ("711bf5a56c954083", "217f59895b194c9c"),  # Gītā 2.13
    ("9f011e607e374f5a", "2f1d6cc67dab41dc"),  # Gītā 2.48 (local fragment)
    ("57c80ca12ed64942", "d837537b5f414955"),  # Gītā 6.5
    ("c586953206f34b2e", "17cbc3eeec2c4dd5"),  # Nītiśataka 12
    ("fcd7920ee5a74440", "e03e76d854204d20"),  # Nītiśataka 13
    ("ca5cd1cba3b94358", "aab3e2a6dc5f4bc7"),  # Nītiśataka 27
    ("00435bae21804e22", "07d991e06e5748a8"),  # Nītiśataka 86 (local fragment)
    ("b77d1b0f30334aa6", "36fe2e1da7e64a60"),  # Īśopaniṣad 1
]
FIELDS = ("devanagari", "translation_en", "translation_hi")


def _prod_rows(secret: str, project: str) -> dict[str, dict]:
    from sqlalchemy import create_engine, text

    url = _prod_url(secret, project)
    engine = create_engine(url, connect_args={"connect_timeout": 20,
                                              "prepare_threshold": None})
    try:
        with engine.connect() as c:
            c.execute(text("SET TRANSACTION READ ONLY"))
            rows = list(c.execute(text(
                "select id, source_ref, devanagari, translation_en, translation_hi "
                "from shlokas where in_daily = true and id in (%s)"
                % ",".join(f"'{i}'" for _, i in SYNC))).mappings())
        return {r["id"]: dict(r) for r in rows}
    except Exception as exc:  # noqa: BLE001
        raise SystemExit("sync: production read failed: "
                         + _redact(f"{type(exc).__name__}: {exc}", url)[:300])


def _plan(prod: dict[str, dict]) -> list[tuple[str, dict]]:
    con = sqlite3.connect(f"file:{LOCAL_DB.as_posix()}?mode=ro", uri=True)
    try:
        plan = []
        for local_id, prod_id in SYNC:
            row = con.execute(
                f"select id, source_ref, {', '.join(FIELDS)} from shlokas where id = ?",
                (local_id,)).fetchone()
            if row is None:
                raise SystemExit(f"sync: local row {local_id} not found")
            cur = dict(zip(("id", "source_ref") + FIELDS, row))
            src = prod.get(prod_id)
            if src is None:
                raise SystemExit(f"sync: production row {prod_id} not found")
            if cur["source_ref"] != src["source_ref"]:
                raise SystemExit(f"sync: ref mismatch for {local_id}: "
                                 f"{cur['source_ref']!r} vs {src['source_ref']!r}")
            changes = {}
            for f in FIELDS:
                before, after = cur[f], src[f]
                if (before or "") != (after or ""):
                    changes[f] = (before, after)
            plan.append((local_id, {"ref": cur["source_ref"], "changes": changes}))
        return plan
    finally:
        con.close()


def _apply(plan: list[tuple[str, dict]], prod: dict[str, dict]) -> None:
    stamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
    backup = LOCAL_DB.with_name(f"app.db.bak-{stamp}-classic-sync")
    shutil.copy2(LOCAL_DB, backup)
    con = sqlite3.connect(str(LOCAL_DB))
    try:
        with con:
            for local_id, info in plan:
                if not info["changes"]:
                    continue
                prod_id = dict(SYNC)[local_id]
                con.execute(
                    f"update shlokas set {', '.join(f + ' = ?' for f in info['changes'])} "
                    f"where id = ?",
                    [prod[prod_id][f] for f in info["changes"]] + [local_id])
        print(f"[sync] backup: {backup}")
    finally:
        con.close()


def main(argv=None) -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    p = argparse.ArgumentParser(prog="books.apply_local_classic_sync")
    p.add_argument("--secret", default="shabd-database-url")
    p.add_argument("--project", default="gen-lang-client-0232760726")
    p.add_argument("--apply", action="store_true",
                   help="write to local app.db (default is dry-run)")
    args = p.parse_args(argv)
    prod = _prod_rows(args.secret, args.project)
    plan = _plan(prod)
    changed = 0
    for local_id, info in plan:
        if not info["changes"]:
            print(f"[sync] {local_id} ({info['ref']}): unchanged")
            continue
        changed += 1
        for f, (before, after) in info["changes"].items():
            print(f"[sync] {local_id} ({info['ref']}): {f}")
            print(f"    - {str(before)[:110]}")
            print(f"    + {str(after)[:110]}")
    if args.apply:
        _apply(plan, prod)
        print(f"[sync] applied to {changed} local rows; production untouched")
    else:
        print(f"[sync] dry-run: {changed} local rows would change "
              f"(re-run with --apply)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
