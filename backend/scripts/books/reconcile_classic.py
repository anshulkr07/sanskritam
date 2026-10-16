"""Reconcile the classic (daily) rows between local backend/app.db and
production (specs/corpus-and-audiobooks-roadmap.md section 3.1: "Reconcile
the small existing classic local/prod differences individually").

Read-only on both sides. Reports, per book and reference, the rows only
local has and only production has, with a text-similarity verdict so
alternate texts, fragments and true gaps can be told apart (audit README:
"do not import them blindly as missing verses").

Usage (from backend/):
    PYTHONUTF8=1 ./.venv/Scripts/python.exe -m scripts.books.reconcile_classic

Output: results/corpus/classic-reconciliation.json and .md.
"""

from __future__ import annotations

import argparse
import datetime
import difflib
import json
import re
import sqlite3
import unicodedata
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[2]
ROOT = BACKEND.parent
OUT_DIR = ROOT / "results" / "corpus"
LOCAL_DB = BACKEND / "app.db"

import sys  # noqa: E402

sys.path.insert(0, str(BACKEND))
from app.seeds.canon import CANON_TEXTS  # noqa: E402
from scripts.books.tracker import _prod_url, _redact  # noqa: E402

_NOT_LETTERS = re.compile(r"[\s।॥\d०-९.,;:!?'\"\-–—ऽ|]+")


def _letters(text: str) -> str:
    return _NOT_LETTERS.sub("", unicodedata.normalize("NFC", text or ""))


def _ratio(a: str, b: str) -> float:
    la, lb = _letters(a), _letters(b)
    if not la or not lb:
        return 0.0
    if la == lb:
        return 1.0
    return difflib.SequenceMatcher(None, la, lb).ratio()


def _book_of(ref: str) -> str:
    for t in CANON_TEXTS:
        if t.get("paged"):
            continue
        for p in t.get("ref_prefixes") or []:
            if p and p in (ref or ""):
                return t["slug"]
    return "(unassigned)"


def _local_rows() -> list[dict]:
    uri = f"file:{LOCAL_DB.as_posix()}?mode=ro"
    con = sqlite3.connect(uri, uri=True)
    try:
        cur = con.execute(
            "select id, source_ref, devanagari, translation_en, translation_hi, "
            "date, audio_url from shlokas where in_daily = 1")
        cols = [d[0] for d in cur.description]
        return [dict(zip(cols, r)) for r in cur.fetchall()]
    finally:
        con.close()


def _prod_rows(secret: str, project: str) -> list[dict]:
    from sqlalchemy import create_engine, text

    url = _prod_url(secret, project)
    engine = create_engine(url, connect_args={"connect_timeout": 20,
                                              "prepare_threshold": None})
    try:
        with engine.connect() as c:
            c.execute(text("SET TRANSACTION READ ONLY"))
            rows = [dict(x) for x in c.execute(text(
                "select id, source_ref, devanagari, translation_en, translation_hi, "
                "date, audio_url from shlokas where in_daily = true")).mappings()]
        return rows
    except Exception as exc:  # noqa: BLE001
        raise SystemExit("reconcile: production read failed: "
                         + _redact(f"{type(exc).__name__}: {exc}", url)[:300])


def _group(rows: list[dict]) -> dict[str, list[dict]]:
    out: dict[str, list[dict]] = {}
    for r in rows:
        out.setdefault(r["source_ref"] or "", []).append(r)
    return out


def reconcile(local: list[dict], prod: list[dict]) -> dict:
    loc, prd = _group(local), _group(prod)
    refs = sorted(set(loc) | set(prd))
    findings = []
    for ref in refs:
        lrows, prows = loc.get(ref, []), prd.get(ref, [])
        lset = {r["devanagari"] for r in lrows}
        pset = {r["devanagari"] for r in prows}
        if lset == pset:
            continue
        book = _book_of(ref)
        local_only = [r for r in lrows if r["devanagari"] not in pset]
        prod_only = [r for r in prows if r["devanagari"] not in lset]
        pairs = []
        paired_prod: set[str] = set()
        for lo in local_only:
            best, ratio = None, 0.0
            for po in prod_only:
                r = _ratio(lo["devanagari"], po["devanagari"])
                if r > ratio:
                    best, ratio = po, r
            verdict = ("same verse, punctuation differs" if ratio >= 0.97
                       else "alternate text" if ratio >= 0.6
                       else "different text")
            if best is not None:
                paired_prod.add(best["id"])
            pairs.append({
                "local": {"id": lo["id"], "date": str(lo["date"]),
                          "text": lo["devanagari"],
                          "en": bool(lo["translation_en"]),
                          "hi": bool(lo["translation_hi"]),
                          "audio": bool(lo["audio_url"])},
                "prod": None if best is None else {
                    "id": best["id"], "date": str(best["date"]),
                    "text": best["devanagari"],
                    "en": bool(best["translation_en"]),
                    "hi": bool(best["translation_hi"]),
                    "audio": bool(best["audio_url"])},
                "similarity": round(ratio, 3),
                "verdict": verdict,
            })
        prod_unpaired = [{
            "id": po["id"], "date": str(po["date"]), "text": po["devanagari"],
            "en": bool(po["translation_en"]), "hi": bool(po["translation_hi"]),
            "audio": bool(po["audio_url"]),
            "similarity": round(_ratio(po["devanagari"], lrows[0]["devanagari"]), 3)
            if lrows else None,
        } for po in prod_only if po["id"] not in paired_prod]
        def _row(r: dict) -> dict:
            return {"id": r["id"], "date": str(r["date"]), "text": r["devanagari"],
                    "en": bool(r["translation_en"]), "hi": bool(r["translation_hi"]),
                    "audio": bool(r["audio_url"])}

        findings.append({"ref": ref, "book": book,
                         "local_rows": len(lrows), "prod_rows": len(prows),
                         "local_only": len(local_only),
                         "prod_only": len(prod_only), "pairs": pairs,
                         "prod_unpaired": prod_unpaired,
                         "local_all": [_row(r) for r in lrows],
                         "prod_all": [_row(r) for r in prows]})
    return {
        "generated": datetime.datetime.now(datetime.timezone.utc)
        .isoformat(timespec="seconds"),
        "local_rows": len(local), "prod_rows": len(prod),
        "different_refs": len(findings),
        "findings": findings,
    }


def write_markdown(rep: dict) -> None:
    lines = [
        "# Classic local/production reconciliation",
        "",
        f"Generated {rep['generated']}. Local {rep['local_rows']} classic rows, "
        f"production {rep['prod_rows']}; {rep['different_refs']} references differ.",
        "Read-only both sides. Verdicts: same verse = punctuation only; "
        "alternate text = a different reading/edition; different text = fragment "
        "or unrelated row.",
        "",
    ]
    for f in rep["findings"]:
        lines.append(f"## `{f['ref']}` ({f['book']}) — local {f['local_only']}, "
                     f"prod {f['prod_only']}")
        lines.append("")
        for p in f["pairs"]:
            lines.append(f"- similarity {p['similarity']}: {p['verdict']}")
            lines.append(f"  - local ({p['local']['id']}, {p['local']['date']}, "
                         f"en={p['local']['en']}, hi={p['local']['hi']}): "
                         f"{p['local']['text'][:160]}")
            if p["prod"]:
                lines.append(f"  - prod  ({p['prod']['id']}, {p['prod']['date']}, "
                             f"en={p['prod']['en']}, hi={p['prod']['hi']}): "
                             f"{p['prod']['text'][:160]}")
        for pu in f.get("prod_unpaired") or []:
            lines.append(f"- prod-only ({pu['id']}, {pu['date']}, en={pu['en']}, "
                         f"hi={pu['hi']}, sim {pu['similarity']}): "
                         f"{pu['text'][:160]}")
        lines.append("")
    (OUT_DIR / "classic-reconciliation.md").write_text(
        "\n".join(lines) + "\n", encoding="utf-8", newline="")


def main(argv=None) -> int:
    p = argparse.ArgumentParser(prog="books.reconcile_classic")
    p.add_argument("--secret", default="shabd-database-url")
    p.add_argument("--project", default="gen-lang-client-0232760726")
    args = p.parse_args(argv)
    rep = reconcile(_local_rows(), _prod_rows(args.secret, args.project))
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUT_DIR / "classic-reconciliation.json").write_text(
        json.dumps(rep, ensure_ascii=False, indent=1), encoding="utf-8", newline="")
    write_markdown(rep)
    print(f"[reconcile] {rep['different_refs']} differing refs "
          f"(local-only/prod-only rows: "
          f"{sum(f['local_only'] for f in rep['findings'])}/"
          f"{sum(f['prod_only'] for f in rep['findings'])})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
