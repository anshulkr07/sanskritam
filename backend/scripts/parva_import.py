"""Load Parva seed files into parva_pages (handover 8.4, runbook 14.3).

Reads backend/app/seeds/parva/<slug>[.<variant>].<lang>.json, each with
{slug, variant, lang, status, body, sources}, validates with the automatic
checks, and writes a new version row (draft/auto_ok/approved/withdrawn).
The owner approves by changing "status" to "approved" in the file and
importing again.

Usage:
    cd backend && ./.venv/Scripts/python.exe scripts/parva_import.py [--check-only] [--slug SLUG]
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.db import SessionLocal, init_db  # noqa: E402
from app.models import ParvaPage  # noqa: E402
from app.services.parva_content import check_draft  # noqa: E402

SEEDS = Path(__file__).resolve().parents[1] / "app" / "seeds" / "parva"


def load_passages() -> dict:
    """ref -> {text_name, url, read_on} from seeds/parva/passages.json.

    Every text item's ref must be in here: it records the exact source
    opened for that reference. Model drafts built by parva_drafts.py carry
    the same passages in their requests.
    """
    fp = SEEDS / "passages.json"
    if not fp.is_file():
        return {}
    try:
        data = json.loads(fp.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def load_files() -> list[dict]:
    out = []
    for fp in sorted(SEEDS.glob("*.json")):
        if fp.name in ("batch_input.jsonl", "passages.json"):
            continue
        try:
            data = json.loads(fp.read_text(encoding="utf-8"))
        except Exception as e:
            print(f"SKIP {fp.name}: not JSON ({e})")
            continue
        data["_file"] = fp.name
        out.append(data)
    return out


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check-only", action="store_true")
    parser.add_argument("--slug", help="Import only this festival's pages, in both languages")
    args = parser.parse_args()
    check_only = args.check_only
    passages = load_passages()
    init_db()
    db = SessionLocal()
    try:
        n_ok = n_fail = 0
        for data in load_files():
            slug = str(data.get("slug", ""))
            if args.slug and slug != args.slug:
                continue
            variant = str(data.get("variant", "") or "")
            lang = str(data.get("lang", ""))
            status = str(data.get("status", "draft"))
            body = data.get("body", {})
            sources = data.get("sources", [])
            if not slug or lang not in ("en", "hi"):
                print(f"SKIP {data['_file']}: need slug + lang en|hi")
                n_fail += 1
                continue
            errs = check_draft(body or {}, passages or None)
            auto = not errs
            if errs:
                print(f"FAIL {data['_file']}: " + "; ".join(errs[:5]))
                if status == "approved":
                    print(f"  (not importing as approved: checks failed)")
                    n_fail += 1
                    continue
            if check_only:
                print(f"OK {data['_file']}: {'auto_ok' if auto else 'draft with notes'}")
                n_ok += 1
                continue
            # New version when the body differs from the latest stored.
            latest = (db.query(ParvaPage)
                      .filter(ParvaPage.slug == slug, ParvaPage.variant == variant,
                              ParvaPage.lang == lang)
                      .order_by(ParvaPage.version.desc()).first())
            if latest is not None and (latest.body or {}) == (body or {}) and latest.status == status:
                print(f"SKIP {data['_file']}: already at v{latest.version} {status}")
                continue
            version = (latest.version + 1) if latest else 1
            eff_status = status
            if status == "draft" and auto:
                eff_status = "auto_ok"
            row = ParvaPage(slug=slug, variant=variant, lang=lang, version=version,
                            body=body or {}, sources=sources or [], status=eff_status,
                            checked_on=date.today().isoformat() if auto else "",
                            approved_on=date.today().isoformat() if status == "approved" else "")
            db.add(row)
            db.commit()
            print(f"IMPORT {data['_file']}: v{version} {eff_status}")
            n_ok += 1
        print(f"done: {n_ok} ok, {n_fail} failed")
    finally:
        db.close()


if __name__ == "__main__":
    main()
