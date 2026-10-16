"""Reconcile a locally built classic completion payload against the rows
already in the database (roadmap 3.2, orders 1-2: katha, mundaka).

Read-only: local app.db and production are opened read-only; the payload is
never imported here. The importer (`scripts/import_text.py`) classifies an
existing ref whose normalized text differs as a mismatch and leaves it alone;
this script produces the per-ref review table the roadmap asks for: existing
text (local and prod), incoming text and the exact differing chunks, plus the
new refs and orphans the import would touch.

Usage (from backend/):
    PYTHONUTF8=1 ./.venv/Scripts/python.exe -m scripts.books.reconcile_completion --slug katha

Output: results/corpus/<slug>-completion-reconciliation.json and .md.
"""

from __future__ import annotations

import argparse
import datetime
import difflib
import json
import re
import sqlite3
import sys
import unicodedata
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[2]
ROOT = BACKEND.parent
OUT_DIR = ROOT / "results" / "corpus"
LOCAL_DB = BACKEND / "app.db"

sys.path.insert(0, str(BACKEND))
from scripts.books.tracker import _prod_url, _redact  # noqa: E402
from scripts.import_text import same_verse  # noqa: E402

COMPLETIONS = {
    "katha": {
        "payload": "results/imports/katha-complete.payload.json",
        "prefixes": ["Kaṭhopaniṣad", "Kaṭha Upaniṣad"],
    },
    "mundaka": {
        "payload": "results/imports/mundaka-complete.payload.json",
        "prefixes": ["Mundaka Upaniṣad"],
    },
}

_WS = re.compile(r"\s+")


def _norm(text: str) -> str:
    return _WS.sub("", unicodedata.normalize("NFC", text or ""))


def _local_rows(prefixes: list[str]) -> list[dict]:
    like = " or ".join("source_ref like ?" for _ in prefixes)
    con = sqlite3.connect(f"file:{LOCAL_DB.as_posix()}?mode=ro", uri=True)
    try:
        cur = con.execute(
            f"select id, source_ref, devanagari, translation_en, translation_hi, date "
            f"from shlokas where ({like}) and in_daily = 1",
            [p + "%" for p in prefixes])
        return [dict(zip([d[0] for d in cur.description], r)) for r in cur.fetchall()]
    finally:
        con.close()


def _prod_rows(prefixes: list[str], secret: str, project: str) -> list[dict]:
    from sqlalchemy import create_engine, text as sql

    url = _prod_url(secret, project)
    engine = create_engine(url, connect_args={"connect_timeout": 20,
                                              "prepare_threshold": None})
    like = " or ".join(f"source_ref like '{p}%'" for p in prefixes)
    try:
        with engine.connect() as c:
            c.execute(sql("SET TRANSACTION READ ONLY"))
            rows = [dict(x) for x in c.execute(sql(
                f"select id, source_ref, devanagari, translation_en, translation_hi, date "
                f"from shlokas where ({like}) and in_daily = true")).mappings()]
        return rows
    except Exception as exc:  # noqa: BLE001
        raise SystemExit("reconcile_completion: production read failed: "
                         + _redact(f"{type(exc).__name__}: {exc}", url)[:300])


def _spans(existing: str, incoming: str) -> list[dict]:
    a, b = _norm(existing), _norm(incoming)
    sm = difflib.SequenceMatcher(None, a, b, autojunk=False)
    out = []
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == "equal":
            continue
        out.append({"kind": tag, "existing": a[i1:i2], "incoming": b[j1:j2]})
    return out


def _row_info(r: dict) -> dict:
    return {"id": r["id"], "date": str(r["date"]), "text": r["devanagari"],
            "en": bool(r["translation_en"]), "hi": bool(r["translation_hi"])}


def reconcile(slug: str, payload: dict, local: list[dict], prod: list[dict]) -> dict:
    loc_by_ref: dict[str, list[dict]] = {}
    for r in local:
        loc_by_ref.setdefault(r["source_ref"], []).append(r)
    prd_by_ref: dict[str, list[dict]] = {}
    for r in prod:
        prd_by_ref.setdefault(r["source_ref"], []).append(r)

    incoming_refs = {v["ref"] for v in payload.get("verses") or []}
    findings = []
    n_match = n_new = 0
    for v in payload.get("verses") or []:
        ref = v["ref"]
        erows = loc_by_ref.get(ref, [])
        if not erows:
            n_new += 1
            continue
        if any(same_verse(r["devanagari"], v["devanagari"]) for r in erows):
            n_match += 1
            continue
        findings.append({
            "ref": ref,
            "incoming": v["devanagari"],
            "local": [_row_info(r) for r in erows],
            "prod": [_row_info(r) for r in prd_by_ref.get(ref, [])],
            "spans": _spans(erows[0]["devanagari"], v["devanagari"]),
        })
    orphans = {
        "local": sorted(ref for ref, rows in loc_by_ref.items()
                        if ref not in incoming_refs and rows),
        "prod": sorted(ref for ref, rows in prd_by_ref.items()
                       if ref not in incoming_refs and rows),
    }
    return {
        "generated": datetime.datetime.now(datetime.timezone.utc)
        .isoformat(timespec="seconds"),
        "slug": slug,
        "payload": COMPLETIONS[slug]["payload"],
        "payload_verses": len(payload.get("verses") or []),
        "existing_matched": n_match,
        "new_refs": n_new,
        "mismatched": len(findings),
        "local_total": len(local),
        "prod_total": len(prod),
        "orphans": orphans,
        "findings": findings,
    }


def write_markdown(rep: dict) -> None:
    p = OUT_DIR / f"{rep['slug']}-completion-reconciliation"
    lines = [
        f"# {rep['slug']} completion reconciliation",
        "",
        f"Generated {rep['generated']}. Payload {rep['payload']} with "
        f"{rep['payload_verses']} verses vs local {rep['local_total']} / "
        f"production {rep['prod_total']} rows.",
        f"Matched existing refs {rep['existing_matched']}, new refs "
        f"{rep['new_refs']}, mismatched refs {rep['mismatched']}.",
        "",
        "A mismatch means the DB row for that ref holds a different text than "
        "the incoming verse (normalized-letter comparison, the importer's own "
        "rule). `spans` lists the differing chunks only, not the whole verse.",
        "",
    ]
    if rep["orphans"]["local"] or rep["orphans"]["prod"]:
        lines += ["Orphans (rows in DB under these prefixes that the payload "
                  "does not contain):", ""]
        lines.append(f"- local: {', '.join(rep['orphans']['local']) or '-'}")
        lines.append(f"- prod:  {', '.join(rep['orphans']['prod']) or '-'}")
        lines.append("")
    for f in rep["findings"]:
        lines.append(f"## `{f['ref']}`")
        lines.append("")
        for r in f["local"]:
            lines.append(f"- local ({r['id']}, {r['date']}, en={r['en']}, "
                         f"hi={r['hi']}): {r['text']}")
        for r in f["prod"]:
            lines.append(f"- prod  ({r['id']}, {r['date']}, en={r['en']}, "
                         f"hi={r['hi']}): {r['text']}")
        lines.append(f"- incoming: {f['incoming']}")
        for s in f["spans"]:
            lines.append(f"  - {s['kind']}: existing `{s['existing']}` → "
                         f"incoming `{s['incoming']}`")
        lines.append("")
    (p.with_suffix(".md")).write_text("\n".join(lines) + "\n",
                                      encoding="utf-8", newline="")
    (p.with_suffix(".json")).write_text(
        json.dumps(rep, ensure_ascii=False, indent=1), encoding="utf-8",
        newline="")


def main(argv=None) -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    ap = argparse.ArgumentParser(prog="books.reconcile_completion")
    ap.add_argument("--slug", required=True, choices=sorted(COMPLETIONS))
    ap.add_argument("--secret", default="shabd-database-url")
    ap.add_argument("--project", default="gen-lang-client-0232760726")
    args = ap.parse_args(argv)
    spec = COMPLETIONS[args.slug]
    payload = json.loads((BACKEND / spec["payload"]).read_text(encoding="utf-8"))
    rep = reconcile(args.slug, payload,
                    _local_rows(spec["prefixes"]),
                    _prod_rows(spec["prefixes"], args.secret, args.project))
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    write_markdown(rep)
    print(f"[reconcile:{args.slug}] matched {rep['existing_matched']}, "
          f"new {rep['new_refs']}, mismatched {rep['mismatched']}; "
          f"orphans local {len(rep['orphans']['local'])} / "
          f"prod {len(rep['orphans']['prod'])}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
