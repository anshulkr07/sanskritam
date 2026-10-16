"""Corpus tracker (specs/corpus-and-audiobooks-roadmap.md section 3.1).

One record per book/edition: slug, title, intended contents, source
URL/revision, transcription rights, chapter inventory, expected units,
extracted units, validated units and production units — plus a state from
the roadmap's list (source needed, source found, fetched, extracted,
validation blocked, ready to import, imported, production verified,
complete or partial with recorded gaps).

Sources of truth, in order:
1. app/seeds/canon.py (the 51 catalogue entries: titles, licences, counts).
2. scripts/books/catalogue.py (paged build specs: sources, reference counts).
3. backend/results/imports/**  (reports, payloads, sources files = local work).
4. backend/app.db, read-only through sqlite3 (the local mirror).
5. production, either the dated 16 October audit snapshot or a live
   read-only refresh (--refresh-prod), never a write.

Usage (from backend/):
    PYTHONUTF8=1 ./.venv/Scripts/python.exe -m scripts.books.tracker
    PYTHONUTF8=1 ./.venv/Scripts/python.exe -m scripts.books.tracker --refresh-prod

Outputs: results/corpus/tracker.json (machine-readable) and
results/corpus/tracker.md (the same records as a table). Nothing here
writes to any database. Production is opened with SET TRANSACTION READ ONLY
and the connection string is never printed.
"""

from __future__ import annotations

import argparse
import datetime
import json
import os
import re
import shutil
import sqlite3
import subprocess
import sys
from collections import Counter
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[2]
ROOT = BACKEND.parent
OUT_DIR = ROOT / "results" / "corpus"
BOOKS_DIR = BACKEND / "results" / "imports" / "books"
CLASSIC_DIR = BACKEND / "results" / "imports"
SNAPSHOT = ROOT / "results" / "content-audit-20261016" / "inventory.json"
LOCAL_DB = BACKEND / "app.db"

sys.path.insert(0, str(BACKEND))
from app.seeds.canon import CANON_TEXTS  # noqa: E402
from scripts.books.catalogue import BOOKS  # noqa: E402

# The roadmap's work batches (section 3.2/3.3/3.4 lists) as data.
BACKLOG_3_2 = ["katha", "mundaka", "mahimna", "vetala", "raghuvamsha",
               "yajurveda", "bhagavata", "shivapurana"]
EMPTY_3_3 = ["atharvaveda", "ayurveda", "simhasana", "garuda",
             "arthashastra", "lilavati"]

# Classic payload files, some books have several (the anthology is not one
# file — defining its contents explicitly is 3.4 work).
CLASSIC_PAYLOADS = {
    "gita": ["gita.payload.json"],
    "hito": ["hito.payload.json", "hito-b2.payload.json"],
    "niti": ["niti.payload.json"],
    "isha": ["isha.payload.json", "isha-v2.payload.json"],
    "katha": ["katha.payload.json", "katha-complete.payload.json",
              "katha-complete-fixed.payload.json"],
    "ramayana": ["ramayana.payload.json"],
    "mahabharata": ["mahabharata.payload.json", "mahabharata-bori.payload.json"],
    "pancha": ["pancha.payload.json"],
    "subhashita": ["sringara.payload.json", "vairagya.payload.json",
                   "vairagya2.payload.json"],
    "mundaka": ["mundaka.payload.json", "mundaka-316.payload.json",
                "mundaka-complete.payload.json",
                "mundaka-complete-fixed.payload.json"],
}

# Books whose completeness cannot be measured against a single count yet.
ANTHOLOGY_SLUGS = {"hito", "niti", "pancha", "subhashita"}
INDEX_SLUGS = {"ayurveda", "simhasana"}
# Selections that the roadmap expands to complete chosen editions (3.4).
SELECTION_EXPANSIONS = {"ramayana", "mahabharata"}

# Recorded source restrictions (roadmap 2, 3.3): GRETIL CC BY-NC-SA is not
# acceptable under the commercial-use rule; Caraka/Simhasana have no chosen
# source yet. These stay visible with a specific blocker.
SOURCE_BLOCKERS = {
    "garuda": "GRETIL CC BY-NC-SA transcription is not acceptable under the "
              "commercial-use rule; an eligible source/scan/permission is "
              "needed (roadmap section 3.3).",
    "arthashastra": "GRETIL CC BY-NC-SA (Kangle 1969) is not acceptable under "
                    "the commercial-use rule; Kangle copyright not checked; an "
                    "eligible transcription is needed (roadmap section 3.3).",
    "lilavati": "GRETIL CC BY-NC-SA transcription is not acceptable under the "
                "commercial-use rule; the rejected 170-row attempt also had 20 "
                "bad rows, 93 repeated refs and 272 expected (roadmap 3.3).",
    "ayurveda": "No acceptable Caraka e-text chosen yet; catalogue row is "
                "index-only (roadmap section 3.3).",
    "simhasana": "No edition/source chosen yet for Siṃhāsana Dvātriṃśikā "
                 "(roadmap section 3.3).",
}

# Unit notes: rows are not canonical verses for these books (roadmap 3.1
# 'sentence chunks, prose units, half-verses must not inflate completeness').
UNIT_NOTES = {
    "katha": "The built completion had 120 verses; the reviewed fix payload "
             "merged the 'ओम् इत्येतत्' formula into 1.2.15, so 119 rows are "
             "the accepted units (imported 2026-10-16, local + production). "
             "Production also keeps two orphan rows under the old "
             "'Kaṭha Upaniṣad' spelling (1.3.3, 1.3.14).",
    "mundaka": "The completion was imported 2026-10-16 from the reviewed fix "
               "payload (front matter of the six chapter openings dropped; "
               "the five other 3.1.1-style chunks fixed before import). "
               "3.1.6 keeps four rows since 2026-09 — two fragments and two "
               "complete, each with its own approved chant — the fragments "
               "are left as written. The older selection's 20 rows and "
               "translations are untouched.",
    "rigveda": "DCS rows are sentence groups, not ṛcs: ~11.7k rows for 10,552 "
               "canonical ṛcs (roadmap 3.4).",
    "samaveda": "Rows are recitation units; arika numbers restart per "
                "prapāṭhaka and are stored as ordinals within the archika "
                "chapter; 1.4% over the traditional 1,875.",
    "sushruta": "The page numbers every line: 7,582 rows for 186 chapters; "
                "rows are sutra/line units, not canonical verse numbers.",
    "gitagovinda": "272 printed units including dhruva refrains (traditional "
                   "264 counts verses without them).",
    "amarakosha": "3,127 half-line units (kāṇḍa.varga.half-line), not whole "
                  "verses.",
    "vetala": "2,195 rows (GRETIL 2,175 = the 25 tales plus कथामुख prose); "
              "pages 01, 16 and 18's split-sandhi duplicate recensions are "
              "excluded and prose lead-ins stay with the following verse.",
    "devimahatmya": "588 rows vs 587 reference_by_chapter total (one extra "
                    "row in the built file); reconcile at audit (roadmap 3.4).",
    "chanakya": "343 numbered verses over 17 chapters; 15 chapter-colophon "
                "numbers and one garbled marker are not verses.",
}


def _read_json(path: Path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None


def _rel(path: Path) -> str:
    try:
        return path.relative_to(ROOT).as_posix()
    except ValueError:
        return path.as_posix()


# ── local database (sqlite3, read-only) ─────────────────────────────────


def local_counts() -> dict:
    """Per-slug local stats from backend/app.db, opened read-only."""
    if not LOCAL_DB.exists():
        return {"meta": {"rows": 0, "unmatched": 0}, "books": {}}
    uri = f"file:{LOCAL_DB.as_posix()}?mode=ro"
    con = sqlite3.connect(uri, uri=True)
    try:
        rows = con.execute(
            "select source_ref, chapter, devanagari, iast, translation_en, "
            "translation_hi, audio_url, book, in_daily from shlokas").fetchall()
    finally:
        con.close()
    per: dict[str, list] = {}
    unmatched = 0
    for (ref, chapter, dev, iast, en, hi, audio, book, in_daily) in rows:
        slug = book if (book and not in_daily) else None
        if slug is None:
            for t in CANON_TEXTS:
                if t.get("paged"):
                    continue
                pref = t.get("ref_prefixes") or []
                if in_daily and any(p and p in (ref or "") for p in pref):
                    slug = t["slug"]
                    break
        if not slug:
            unmatched += 1
            continue
        per.setdefault(slug, []).append((ref, chapter, dev, iast, en, hi, audio))
    out: dict[str, dict] = {}
    for slug, rs in per.items():
        chapters = {c for (_r, c, *_x) in rs if c not in (None, "")}
        out[slug] = {
            "rows": len(rs),
            "unique_refs": len({r for (r, *_x) in rs}),
            "duplicate_rows": len(rs) - len({r for (r, *_x) in rs}),
            "chapters": len(chapters),
            "devanagari": sum(bool(x[2]) for x in rs),
            "iast": sum(bool(x[3]) for x in rs),
            "en": sum(bool(x[4]) for x in rs),
            "hi": sum(bool(x[5]) for x in rs),
            "audio_url": sum(bool(x[6]) for x in rs),
            "en_refs": len({r for (r, _c, _d, _i, en, _h, _a) in rs if en}),
            "hi_refs": len({r for (r, _c, _d, _i, _e, hi, _a) in rs if hi}),
        }
    return {"meta": {"rows": len(rows), "unmatched": unmatched}, "books": out}


# ── production (snapshot or live read-only refresh) ─────────────────────


def _gcloud(*args: str) -> str:
    exe = shutil.which("gcloud.cmd") or shutil.which("gcloud")
    if not exe:
        raise SystemExit("tracker: gcloud is not on PATH; cannot refresh production")
    p = subprocess.run([exe, *args], capture_output=True, text=True, encoding="utf-8")
    if p.returncode:
        raise SystemExit("tracker: gcloud read failed (are you signed in to the right project?)")
    return (p.stdout or "").strip()


def _prod_url(secret: str, project: str) -> str:
    url = (os.environ.get("DATABASE_URL") or "").strip()
    if not url:
        url = _gcloud("secrets", "versions", "access", "latest",
                      f"--secret={secret}", f"--project={project}")
    return re.sub(r"^postgres(?:ql)?://", "postgresql+psycopg://", url)


def _redact(message: str, url: str) -> str:
    text = message.replace(url, "<DATABASE_URL>")
    if "@" in url and "://" in url:
        creds = url.split("://", 1)[1].split("@", 1)[0]
        if ":" in creds:
            text = text.replace(creds.split(":", 1)[1], "<password>")
    return text


def prod_counts(secret: str, project: str) -> dict:
    """Live per-slug production counts, read-only. Same shape as local."""
    from sqlalchemy import create_engine, text

    url = _prod_url(secret, project)
    engine = create_engine(url, connect_args={"connect_timeout": 20,
                                              "prepare_threshold": None})
    try:
        with engine.connect() as c:
            c.execute(text("SET TRANSACTION READ ONLY"))
            rows = [dict(x) for x in c.execute(text(
                "select source_ref, chapter, devanagari, iast, translation_en, "
                "translation_hi, audio_url, book, in_daily, verse_uid "
                "from shlokas")).mappings()]
            audio = [dict(x) for x in c.execute(text(
                "select verse_uid, voice, url, qc_status from verse_audio")).mappings()]
    except Exception as exc:  # noqa: BLE001 - never echo the connection string
        raise SystemExit("tracker: production refresh failed: "
                         + _redact(f"{type(exc).__name__}: {exc}", url)[:400])
    served = {a["verse_uid"] for a in audio
              if a.get("url") and a.get("qc_status") in ("auto_ok", "approved")}
    per: dict[str, list] = {}
    unmatched = 0
    for r in rows:
        slug = r["book"] if (r["book"] and not r["in_daily"]) else None
        if slug is None:
            for t in CANON_TEXTS:
                if t.get("paged"):
                    continue
                pref = t.get("ref_prefixes") or []
                if r["in_daily"] and any(p and p in (r["source_ref"] or "") for p in pref):
                    slug = t["slug"]
                    break
        if not slug:
            unmatched += 1
            continue
        per.setdefault(slug, []).append(r)
    out: dict[str, dict] = {}
    for slug, rs in per.items():
        chapters = {r["chapter"] for r in rs if r["chapter"] not in (None, "")}
        out[slug] = {
            "rows": len(rs),
            "unique_refs": len({r["source_ref"] for r in rs}),
            "duplicate_rows": len(rs) - len({r["source_ref"] for r in rs}),
            "chapters": len(chapters),
            "devanagari": sum(bool(r["devanagari"]) for r in rs),
            "iast": sum(bool(r["iast"]) for r in rs),
            "en": sum(bool(r["translation_en"]) for r in rs),
            "hi": sum(bool(r["translation_hi"]) for r in rs),
            "audio_url": sum(bool(r["audio_url"]) for r in rs),
            "chant": sum(r["verse_uid"] in served for r in rs),
            "en_refs": len({r["source_ref"] for r in rs if r["translation_en"]}),
            "hi_refs": len({r["source_ref"] for r in rs if r["translation_hi"]}),
        }
    return {"meta": {"kind": "live", "rows": len(rows), "unmatched": unmatched,
                     "read_at": datetime.datetime.now(
                         datetime.timezone.utc).isoformat(timespec="seconds")},
            "books": out}


def snapshot_counts() -> dict:
    """Production counts from the dated 16 October audit snapshot."""
    data = _read_json(SNAPSHOT) or {}
    prod = data.get("prod") or {}
    books = {}
    for b in prod.get("books") or []:
        books[b.get("slug")] = {
            "rows": b.get("rows", 0),
            "unique_refs": b.get("unique_refs", 0),
            "duplicate_rows": max(0, b.get("rows", 0) - b.get("unique_refs", 0)),
            "chapters": None,
            "iast": b.get("iast", 0),
            "en": b.get("en", 0),
            "hi": b.get("hi", 0),
            "en_refs": None,
            "hi_refs": None,
            "chant": b.get("chant", 0),
            "chant_ms": b.get("chant_ms", 0),
        }
    totals = prod.get("totals") or {}
    return {"meta": {"kind": "snapshot-20261016",
                     "revision": data.get("revision"),
                     "secret_version": data.get("secret_version"),
                     "rows": totals.get("rows"),
                     "unmatched": None},
            "books": books}


# ── artifacts (reports, payloads, sources) ──────────────────────────────


def _report_and_sources(slug: str, paged: bool) -> dict:
    """Report/sources/payload artifacts for one slug from both dirs."""
    out: dict = {"report": None, "sources": None, "payloads": [], "prod_reports": []}
    dirs = [BOOKS_DIR, CLASSIC_DIR]
    for d in dirs:
        rep = d / f"{slug}.report.json"
        if rep.exists() and out["report"] is None:
            out["report"] = {"path": _rel(rep), "data": _read_json(rep)}
        src = d / f"{slug}.sources.json"
        if src.exists() and out["sources"] is None:
            out["sources"] = {"path": _rel(src), "data": _read_json(src)}
    names = ([f"{slug}.payload.json"] if paged else CLASSIC_PAYLOADS.get(slug, []))
    for name in names:
        p = (BOOKS_DIR if paged else CLASSIC_DIR) / name
        if p.exists():
            data = _read_json(p) or {}
            out["payloads"].append({
                "path": _rel(p),
                "verses": len(data.get("verses") or []),
                "mtime": datetime.date.fromtimestamp(p.stat().st_mtime).isoformat(),
            })
    for pat in (f"{slug}*.prod-report.json", f"{slug}*.report.json"):
        for p in sorted(CLASSIC_DIR.glob(pat)) + sorted(BOOKS_DIR.glob(pat)):
            data = _read_json(p) or {}
            if "added" in data or "built" in data:
                out["prod_reports"].append({
                    "path": _rel(p),
                    "added": data.get("added"),
                    "built": data.get("built"),
                    "status": data.get("status"),
                    "date": datetime.date.fromtimestamp(p.stat().st_mtime).isoformat()})
            if out["report"] is None and "built" in data:
                # Classic import fixes (katha.payload.report.json) carry the
                # import report; a real build report has "built".
                out["report"] = {"path": _rel(p), "data": data}
    return out


def _expected_units(canon_entry: dict, spec: dict | None) -> tuple[int | None, str]:
    # The catalogue carries the freshly reconciled counts (dated notes); the
    # canon seed can be older (e.g. Tandava 13 -> 16, Chanakya 345 -> 343).
    if spec:
        if spec.get("reference_total"):
            return spec["reference_total"], "catalogue reference_total"
        if spec.get("planned"):
            return spec["planned"], "catalogue planned"
    planned = canon_entry.get("verses_planned") or 0
    if planned:
        return planned, "canon verses_planned"
    return None, "open (count fixed at build)"


# ── record building ─────────────────────────────────────────────────────


def build_record(entry: dict, spec: dict | None, local: dict, prod: dict) -> dict:
    slug = entry["slug"]
    paged = bool(entry.get("paged"))
    art = _report_and_sources(slug, paged)
    report = (art["report"] or {}).get("data") or {}
    sources = (art["sources"] or {}).get("data") or {}
    expected, basis = _expected_units(entry, spec)
    loc = local.get(slug) or {}
    prd = prod.get(slug) or {}
    if paged:
        extracted = report.get("built")
        validated = None
        payload_verses = sum(p["verses"] for p in art["payloads"])
        if report.get("status") == "OK" and payload_verses:
            validated = payload_verses
    else:
        # Classic books were imported from payload fixes over several
        # sessions; the accepted units are what the database holds, and the
        # payload files are candidates/variants.
        extracted = max((p["verses"] for p in art["payloads"]), default=None)
        validated = loc.get("unique_refs") or prd.get("unique_refs") or None

    # Source URLs/revisions: wiki pages carry revid+url; DCS/GRETIL/Ambuda
    # record the text/file identifier.
    urls: list[dict] = []
    for pg in (sources.get("pages") or []):
        urls.append({"page": pg.get("title"), "revid": pg.get("revid"),
                     "url": pg.get("url")})
    for f in (sources.get("files") or []):
        urls.append({"file": f})
    if spec:
        if spec.get("dcs_text"):
            urls.append({"dcs_text": spec["dcs_text"]})
        if spec.get("gretil_file"):
            urls.append({"gretil": spec["gretil_file"]})
        if spec.get("ambuda_slug"):
            urls.append({"ambuda": spec["ambuda_slug"]})

    # State (roadmap 3.1): derived from artifacts, never from presence alone.
    blockers: list[str] = []
    if slug in SOURCE_BLOCKERS:
        blockers.append(SOURCE_BLOCKERS[slug])
    stop_reasons = report.get("stop_reasons") or []
    if report.get("status") == "STOPPED":
        state = "validation blocked"
    elif validated is not None:
        state = "imported" if (prd.get("rows") or 0) > 0 or (loc.get("rows") or 0) > 0 \
            else "ready to import"
    elif art["sources"]:
        state = "fetched" if not report else "extracted"
    elif urls:
        state = "source found"
    else:
        state = "source needed"
    if slug in ("garuda", "arthashastra", "lilavati", "ayurveda", "simhasana"):
        # A licence/source decision outranks build artifacts.
        state = "source needed"

    # Gaps: missing chapters and count deltas against the intended contents.
    missing_chapters = report.get("missing_chapters") or []
    expected_for_delta = expected
    if expected_for_delta is None:
        expected_for_delta = validated
    delta = None
    if expected_for_delta and (prd.get("unique_refs") or prd.get("rows")):
        have = prd.get("unique_refs") or prd.get("rows") or 0
        delta = have - expected_for_delta

    # Build candidates that were never imported (classic completions: payloads
    # larger than what was validated). A payload whose name is the stem of an
    # import/prod report has been imported — for katha, the unfixed 120-verse
    # payload is covered by the reports of its fixed successor — and only
    # unreported payloads remain candidates.
    candidates = []
    if not paged and validated:
        reported = [Path(r["path"]).name.split(".")[0] for r in art["prod_reports"]]
        for pay in art["payloads"]:
            key = Path(pay["path"]).name.split(".")[0]
            if pay["verses"] > validated and not any(s.startswith(key) for s in reported):
                candidates.append({"payload": pay["path"],
                                   "verses": pay["verses"]})

    contents_note = None
    if slug in ANTHOLOGY_SLUGS:
        contents_note = "anthology contents not yet defined (roadmap 3.4)"
    elif slug in INDEX_SLUGS and state == "source needed":
        contents_note = "index-only catalogue row; no readable content (roadmap 3.3)"
    elif slug in SELECTION_EXPANSIONS:
        contents_note = "selections only; expand to the complete chosen edition (roadmap 3.4)"
    elif candidates:
        contents_note = "completion candidate built but not imported (roadmap 3.2)"

    if slug in ANTHOLOGY_SLUGS or slug in INDEX_SLUGS:
        completion = "undefined"
    elif state == "imported" and slug in SELECTION_EXPANSIONS:
        completion = "partial"
    elif candidates:
        completion = "partial"
    elif state == "imported" and expected_for_delta:
        have = prd.get("unique_refs") or prd.get("rows") or 0
        completion = "complete" if have >= expected_for_delta and not missing_chapters \
            else "partial"
    else:
        completion = "unknown"

    roadmap = ["3.4"]
    if slug in BACKLOG_3_2:
        roadmap = ["3.2"]
    elif slug in EMPTY_3_3:
        roadmap = ["3.3"]
        if slug == "atharvaveda":
            roadmap = ["3.3", "3.4"]

    verify_path = OUT_DIR / "verify" / f"{slug}.json"
    verification = _read_json(verify_path)

    return {
        "slug": slug,
        "title_en": entry.get("title_en"),
        "title_sa": entry.get("title_sa"),
        "mode": "paged" if paged else "classic",
        "register": entry.get("register") or (spec or {}).get("register") or "classical",
        "tier": entry.get("tier"),
        "study_order": entry.get("study_order"),
        "roadmap": roadmap,
        "intended_contents": {
            "edition": entry.get("source"),
            "summary": entry.get("notes"),
            "expected_units": expected,
            "expected_basis": basis,
            "reference_total": (spec or {}).get("reference_total"),
            "reference_by_chapter": (spec or {}).get("reference_by_chapter"),
            "unit_note": UNIT_NOTES.get(slug),
        },
        "rights": entry.get("licence"),
        "source": {"key": entry.get("source_key") or (spec or {}).get("source_key"),
                   "urls": urls[:12],
                   "urls_total": len(urls)},
        "artifacts": art,
        "counts": {
            "expected": expected,
            "extracted": extracted,
            "validated": validated,
            "local_rows": loc.get("rows"),
            "local_unique_refs": loc.get("unique_refs"),
            "local_chapters": loc.get("chapters"),
            "prod_rows": prd.get("rows"),
            "prod_unique_refs": prd.get("unique_refs"),
            "prod_chapters": prd.get("chapters"),
            "duplicate_rows": prd.get("duplicate_rows"),
        },
        "coverage": {
            "iast": prd.get("iast"),
            "en": prd.get("en"),
            "hi": prd.get("hi"),
            "chant": prd.get("chant"),
        },
        "state": state,
        "stop_reasons": stop_reasons or None,
        "blockers": blockers or None,
        "gaps": {
            "missing_chapters": missing_chapters or None,
            "count_delta": delta,
            "note": UNIT_NOTES.get(slug),
            "contents": contents_note,
            "candidates": candidates or None,
        },
        "completion": completion,
        "verified": bool(verification),
        "verification": verification,
    }


def build_tracker(refresh_prod: bool, secret: str, project: str) -> dict:
    local = local_counts()
    if refresh_prod:
        prod = prod_counts(secret, project)
        p = OUT_DIR / f"prod-counts-{datetime.date.today().isoformat()}.json"
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(json.dumps(prod, ensure_ascii=False, indent=1),
                     encoding="utf-8", newline="")
    else:
        prod = snapshot_counts()
    records = [build_record(t, BOOKS.get(t["slug"]), local["books"], prod["books"])
               for t in CANON_TEXTS]
    states = Counter(r["state"] for r in records)
    completions = Counter(r["completion"] for r in records)
    totals = {
        "books": len(records),
        "by_state": dict(states),
        "by_completion": dict(completions),
        "local_rows": local["meta"]["rows"],
        "local_unmatched_rows": local["meta"]["unmatched"],
        "prod_rows": prod["meta"].get("rows"),
        "prod_unmatched_rows": prod["meta"].get("unmatched"),
    }
    return {
        "generated": datetime.datetime.now(datetime.timezone.utc)
        .isoformat(timespec="seconds"),
        "baseline": _rel(SNAPSHOT),
        "prod_counts": prod["meta"],
        "totals": totals,
        "books": records,
    }


def write_markdown(tracker: dict) -> None:
    lines = [
        "# Corpus tracker",
        "",
        f"Generated {tracker['generated']} from {tracker['baseline']} "
        f"(production counts: {tracker['prod_counts']['kind']}). "
        "Regenerate: `python -m scripts.books.tracker [--refresh-prod]` from backend/.",
        "",
        f"Totals: {tracker['totals']['books']} books, "
        f"local rows {tracker['totals']['local_rows']}, "
        f"production rows {tracker['totals']['prod_rows']}; "
        f"states {tracker['totals']['by_state']}; "
        f"completion {tracker['totals']['by_completion']}.",
        "",
        "| Slug | Book | State | Completion | Expected | Extracted | Validated | Prod rows | Prod refs | Gaps |",
        "|---|---|---|---|---:|---:|---:|---:|---:|---|",
    ]
    for r in tracker["books"]:
        c = r["counts"]
        gaps = []
        if r["gaps"]["missing_chapters"]:
            gaps.append("missing ch " + ",".join(str(x) for x in r["gaps"]["missing_chapters"]))
        if r["gaps"]["count_delta"] is not None and r["gaps"]["count_delta"] < 0:
            gaps.append(f"delta {r['gaps']['count_delta']}")
        if r["stop_reasons"]:
            gaps.append("; ".join(r["stop_reasons"]))
        if r["blockers"]:
            gaps.append(r["blockers"][0].split(";")[0])
        if r["gaps"].get("contents"):
            gaps.append(r["gaps"]["contents"])
        for cand in r["gaps"].get("candidates") or []:
            gaps.append(f"candidate {cand['payload'].split('/')[-1]} ({cand['verses']})")
        lines.append(
            f"| `{r['slug']}` | {r['title_en']} | {r['state']} | {r['completion']} | "
            f"{c['expected'] or ''} | {c['extracted'] or ''} | {c['validated'] or ''} | "
            f"{c['prod_rows'] if c['prod_rows'] is not None else ''} | "
            f"{c['prod_unique_refs'] if c['prod_unique_refs'] is not None else ''} | "
            f"{'; '.join(str(g) for g in gaps) if gaps else ''} |")
    lines += [
        "",
        "## Batch order (roadmap 3.2 and 3.3)",
        "",
    ]
    by_slug = {r["slug"]: r for r in tracker["books"]}
    lines.append("**3.2 locally prepared backlog:**")
    lines.append("")
    for s in BACKLOG_3_2:
        r = by_slug.get(s)
        if r:
            lines.append(f"- `{s}` — {r['title_en']}: {r['state']}, "
                         f"extracted {r['counts']['extracted']}, "
                         f"validated {r['counts']['validated']}"
                         + (f"; {'; '.join(r['stop_reasons'])}" if r["stop_reasons"] else ""))
    lines.append("")
    lines.append("**3.3 empty catalogue entries:**")
    lines.append("")
    for s in EMPTY_3_3:
        r = by_slug.get(s)
        if r:
            note = (r["blockers"][0] if r["blockers"] else
                    (r["stop_reasons"] or ["awaiting build"])[0])
            lines.append(f"- `{s}` — {r['title_en']}: {r['state']}; {note}")
    (OUT_DIR / "tracker.md").write_text("\n".join(lines) + "\n",
                                        encoding="utf-8", newline="")


def main(argv=None) -> int:
    p = argparse.ArgumentParser(prog="books.tracker")
    p.add_argument("--refresh-prod", action="store_true",
                   help="read production counts live (read-only) instead of the snapshot")
    p.add_argument("--secret", default="shabd-database-url")
    p.add_argument("--project", default="gen-lang-client-0232760726")
    args = p.parse_args(argv)
    tracker = build_tracker(args.refresh_prod, args.secret, args.project)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUT_DIR / "tracker.json").write_text(
        json.dumps(tracker, ensure_ascii=False, indent=1), encoding="utf-8", newline="")
    write_markdown(tracker)
    print(f"[tracker] {tracker['totals']['books']} books -> {_rel(OUT_DIR / 'tracker.json')}")
    for state, n in sorted(tracker["totals"]["by_state"].items()):
        print(f"[tracker]   {state}: {n}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
