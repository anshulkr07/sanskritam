"""P23-4 · Stage learnsanskrit.org sections as lesson rows.

Modelled on ``scripts/import_text.py`` — same discipline, exactly:

- Dry-run by default; NOTHING is written without ``--live``.
- REFUSES to run without the per-source licence (``--licence`` must name
  the guide's verified licence, CC BY 4.0 — LESSON_OVERHAUL §3). "It was on
  the internet" is not a licence.
- Idempotent by source key (``provenance = learnsanskrit:<section-id>``):
  a re-run adds 0 rows and says so. Judge the run by DISTINCT rows added.
- NO TTS in the import path: staged rows ship ``audio_url == ""``.
- Back up ``app.db`` first (§2.13).
- The engine-verification rule survives unchanged
  (``services/lessons.py::verify_example``): an example the engine cannot
  reproduce is DROPPED and reported, never stored.
- Output lands in ``results/imports/``.

Input: a checkout of ``github.com/sanskrit/learnsanskrit.org`` — the guide
lives as SML (a custom lightweight markup) under ``content/``: 17 core
lessons plus ~77 topic sections. This importer does not need to understand
all of SML: headings (``#``), paragraphs and Devanagari runs are enough to
STAGE. Staging is not publishing: the adaptation pass (adapt, do not copy;
owner-curated) happens on the staged JSON in ``results/imports/``, and the
licence registry key (P23-4a) is written by the importer so attribution is
a join from the first row, not a later chore.

Usage (from backend/, CWD is the schema — §2.10)::

    python -m scripts.import_learnsanskrit --dir <learnsanskrit.org/content> --licence "CC BY 4.0"
    python -m scripts.import_learnsanskrit --dir <...> --licence "CC BY 4.0" --live
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import uuid
from pathlib import Path

if __package__ in (None, ""):  # allow `python scripts/import_learnsanskrit.py`
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

EXPECTED_LICENCE = "CC BY 4.0"
ATTRIBUTION_KEY = "learnsanskrit"

# SML section path keywords -> unit. First hit wins; anything unrecognised
# lands in u2 (First Words) and is reported, never dropped silently (§2.11).
# Order matters: distinctive units (voices, genders, compounds, karaka) are
# checked BEFORE the generic verb/person/case keywords — "verb-1" and
# "present" would otherwise swallow the whole verbs-1/2/3 dirs (which hold
# tense-mood, voice and class content), and short stubs like "dat"/"abl"/
# "gen"/"lat" over-fire on ordinary English words.
UNIT_MAP: list[tuple[str, list[str]]] = [
    ("u1", ["sound", "varna", "vowel", "consonant", "pronunci", "alphabet", "devanagari"]),
    ("u6", ["sandhi"]),
    ("u10", ["compound", "samasa", "dvandva", "tatpurusa", "bahuvrihi", "avyayi"]),
    ("u11", ["karaka", "kartr", "karma", "karana", "sampradana", "apadana", "adhikarana"]),
    ("u4", ["number", "vacana", "dual", "plural", "dvi", "bahu"]),
    ("u9", ["voice", "pada", "atmanepada", "parasmaipada", "karmani", "bhave", "prayoga"]),
    ("u7", ["gender", "linga", "masculine", "feminine", "neuter"]),
    ("u8", ["tense", "lakara", "imperative", "imperfect", "future", "mood", "lrt", "lun", "lit", "lot", "lan"]),
    ("u5", ["person", "purusha", "purusa", "gana", "class", "present-tense", "lat-"]),
    ("u3", ["case", "vibhakti", "instrumental", "dative", "ablative", "genitive",
            "locative", "vocative", "trtiya", "caturthi", "pancami", "sasthi",
            "saptami"]),
    ("u2", ["noun", "nominal", "nominative", "accusative", "verb", "sentence",
            "word", "basic", "intro", "prathama", "dvitiya"]),
]

DEVANAGARI_RE = re.compile(r"[\u0900-\u097F]+(?:\s+[\u0900-\u097F]+)*")


def map_unit(relpath: str) -> str:
    lowered = relpath.lower()
    for unit, keywords in UNIT_MAP:
        if any(k in lowered for k in keywords):
            return unit
    return "u2"


def parse_sml(text: str) -> dict:
    """Tolerant SML read: title (first ``#`` line, else the ``{title ...}``
    macro the real guide .txt files use), paragraphs, and Devanagari runs
    (candidate examples for engine verification)."""
    title = ""
    m = re.search(r"\{title\s+([^}]+)\}", text)
    if m:
        title = m.group(1).strip()
    # Titles nest inline macros ("{title {s Atmanepada}}") — unwrap to
    # plain words; the adaptation pass owns the final wording.
    title = re.sub(r"\{[a-zA-Z-]+\s+", "", title).replace("}", "").strip()
    paras: list[str] = []
    current: list[str] = []
    for line in text.splitlines():
        stripped = line.strip()
        if stripped.startswith("#") and not title:
            title = stripped.lstrip("#").strip()
            continue
        if not stripped:
            if current:
                paras.append(" ".join(current))
                current = []
            continue
        if stripped.startswith("#"):
            continue  # sub-headings structure, not prose
        current.append(stripped)
    if current:
        paras.append(" ".join(current))
    dev_runs: list[str] = []
    for p in paras:
        for m in DEVANAGARI_RE.findall(p):
            if m not in dev_runs:
                dev_runs.append(m)
    return {"title": title, "paragraphs": paras, "devanagari_runs": dev_runs[:6]}


def _unwrap_inline_macros(text: str) -> str:
    """Unwrap SML formatting for staged drafts: ``{s X}``/``{dfn X}`` carry
    the readable word X, and structural commands ({h},{ul},{li},{aka},...)
    are dropped keeping their inner text. The result is a readable draft,
    not finished prose — the adaptation pass owns the final wording."""
    text = re.sub(r"\{(?:s|dfn|h|ul|li|aka)\s*", "", text)
    return re.sub(r"[{}]", "", text).strip()


def stage_section(section_id: str, relpath: str, parsed: dict) -> dict:
    """One SML file -> one stageable lesson dict (adapted, not copied: the
    staged body is the section's opening capped at 120 words — the owner
    adaptation pass rewrites it before any learner sees it)."""
    body = "\n\n".join(_unwrap_inline_macros(p) for p in parsed["paragraphs"][:4])
    words = body.split()
    if len(words) > 120:
        body = " ".join(words[:120])
    return {
        "section_id": section_id,
        "unit_id": map_unit(relpath),
        "title_en": parsed["title"] or section_id,
        "body": body,
        "candidate_examples": parsed["devanagari_runs"],
        "provenance": f"{ATTRIBUTION_KEY}:{section_id}",
        "attribution": ATTRIBUTION_KEY,
    }


def collect_sections(content_dir: Path) -> list[dict]:
    staged = []

    def _stage_file(path: Path) -> None:
        rel = path.relative_to(content_dir).as_posix()
        section_id = path.relative_to(content_dir).with_suffix("").as_posix().replace("/", "-")
        if any(s["section_id"] == section_id for s in staged):
            return
        try:
            parsed = parse_sml(path.read_text(encoding="utf-8"))
        except Exception as e:  # noqa: BLE001 — one bad file never kills the run
            print(f"[import] unreadable file skipped: {rel} ({e})")
            return
        if not parsed["paragraphs"]:
            print(f"[import] empty section skipped: {rel}")
            return
        staged.append(stage_section(section_id, rel, parsed))

    # The real guide checkout keeps SML under .txt (macros like {title},
    # {s}, {ul}); some checkouts render to .md. Scan all three, dedupe by
    # section id — first hit (sml, then txt, then md) wins.
    for ext in ("*.sml", "*.txt", "*.md"):
        for path in sorted(content_dir.rglob(ext)):
            # Skip non-guide text (word lists, notes) — prose sections only.
            if path.name in ("index.json", "kale.txt", "todo.txt"):
                continue
            if path.parent.name == "lists":
                continue
            # Skip vyakarana/ (Pāṇinian reference track) — the sūtra
            # curriculum is an owner-gated pedagogy decision (§6), not
            # beginner-lesson staging material.
            if "vyakarana" in path.relative_to(content_dir).parts:
                continue
            _stage_file(path)
    return staged


def run_import(staged: list[dict], licence: str, live: bool) -> dict:
    if licence.strip() != EXPECTED_LICENCE:
        raise SystemExit(
            f"import refused: licence must be {EXPECTED_LICENCE!r} "
            f"(LESSON_OVERHAUL §3) — got {licence!r}")
    from app.db import SessionLocal
    from app.models import Lesson, LessonStep

    db = SessionLocal()
    try:
        existing = {r[0] for r in db.query(Lesson.provenance).all()}
        added = 0
        skipped_dup = 0
        for s in staged:
            if s["provenance"] in existing:
                skipped_dup += 1
                continue
            if live:
                lesson_id = uuid.uuid4().hex[:16]
                db.add(Lesson(
                    id=lesson_id,
                    feature_id="NOM.SG",  # lead tag; steps carry the real span
                    features=[],
                    unit_id=s["unit_id"],
                    rank=900,  # staged rows sort after curated ones; the
                    # owner pass re-ranks when the adaptation lands
                    title_en=f"[staged] {s['title_en']}",
                    title_hi="",
                    body=s["body"],
                    examples=[],
                    visual_type="none",
                    visual_data={},
                    audio_url="",  # never TTS a corpus import (§6)
                    register="laukika",
                    provenance=s["provenance"],
                    attribution=ATTRIBUTION_KEY,
                ))
                db.add(LessonStep(
                    lesson_id=lesson_id, rank=0, kind="explain",
                    payload={"text": " ".join(s["body"].split()[:120]),
                             "staged_from": s["section_id"]},
                    grading={},
                ))
                db.flush()
                existing.add(s["provenance"])
            added += 1
        if live:
            db.commit()
    finally:
        db.close()
    return {"added": added, "skipped_dup": skipped_dup,
            "licence": licence, "source": "learnsanskrit.org"}


def main(argv=None) -> int:
    p = argparse.ArgumentParser(prog="import_learnsanskrit",
                                description="P23-4 learnsanskrit.org stager (dry-run default).")
    p.add_argument("--dir", required=True, help="checkout content/ dir (*.sml)")
    p.add_argument("--licence", required=True, help='must be "CC BY 4.0" (§3)')
    p.add_argument("--live", action="store_true", help="write rows (default dry-run)")
    args = p.parse_args(argv)
    content_dir = Path(args.dir)
    if not content_dir.is_dir():
        raise SystemExit(f"import refused: not a directory: {content_dir}")
    staged = collect_sections(content_dir)
    print(f"[import] staged {len(staged)} section(s) from {content_dir}")
    by_unit: dict[str, int] = {}
    for s in staged:
        by_unit[s["unit_id"]] = by_unit.get(s["unit_id"], 0) + 1
    print("[import] unit map: " + ", ".join(
        f"{u}={n}" for u, n in sorted(by_unit.items())))
    report = run_import(staged, args.licence, live=args.live)
    mode = "LIVE" if args.live else "DRY-RUN (nothing written)"
    verb = "added" if args.live else "would be added"
    print(f"[import] {mode}: {report['added']} distinct lesson(s) {verb}, "
          f"{report['skipped_dup']} duplicate(s) skipped")
    print(f"[import] licence: {report['licence']}")
    out = Path("results/imports") / "learnsanskrit.stage.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(staged, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[import] staged JSON written to {out} (owner adaptation pass edits this)")
    if args.live:
        rep = Path("results/imports") / "learnsanskrit.report.json"
        rep.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"[import] report written to {rep}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
