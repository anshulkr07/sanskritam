"""DCS vocabulary curation record + import auditor (P22-5).

The SHIPPED rows live in `app.seeds.vocab.DCS_VOCAB` (topic, devanagari,
gloss) and ship via `seed_vocab` like every other row — seeds are the
source of truth, so fresh DBs, dev DB and tests can never disagree.
This module owns the curation DECISIONS that produced that list:

  - TOPIC_MAP (devanagari -> slug): hand-mapped from induced glosses.
    Verbs, numerals, proper names and epithets have no topic home and
    stay staged — forcing them in would misfile.
  - GLOSS_FIXES: standard-knowledge corrections of auto glosses
    (devāḥ are gods, not "demigods"; opaque transliterations expanded).
  - SKIP_REASONS: every staged-but-unshipped row, with its reason.
    Staged rows with no gloss wait for curation silently.

`plan_audit` replays the mapping against the staged JSON (review tool);
`run_import` inserts missing DCS_VOCAB rows with the seed's own rules
(rank after curated, lipi IAST, pool examples, provenance "dcs").
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

if __package__ in (None, ""):  # allow `python scripts/import_vocab_dcs.py`
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# Devanagari -> topic. Hand-mapped from induced glosses (2026-09-08).
TOPIC_MAP: dict[str, str] = {
    "जलं": "food", "लवणं": "food", "तैलं": "food", "कटुः": "food",
    "विषं": "health", "शरीरं": "health", "हृदयं": "health",
    "पित्तं": "health", "त्रिफला": "health", "हरीतकी": "health",
    "कटुका": "health",
    "मात्रा": "family",
    "ज्ञानं": "school", "वचनं": "school", "सूक्ष्मं": "school",
    "संशयः": "school",
    "दिनं": "routine", "मासि": "routine", "कालं": "routine",
    "नमः": "festivals", "नमोनमः": "festivals", "देवा": "festivals",
    "दानं": "festivals",
    "काञ्चनं": "market", "ताम्रं": "market", "ऋणं": "market",
    "पलं": "market",
}

# Staged auto-gloss -> shipped gloss. Standard knowledge, recorded (not
# silently edited): devāḥ are gods; the rest expand opaque
# transliterations into usable glosses.
GLOSS_FIXES: dict[str, str] = {
    "देवा": "gods",
    "पलं": "pala (unit of weight)",
    "कटुका": "katuka (bitter herb)",
    "त्रिफला": "triphala (three-fruit remedy)",
    "हरीतकी": "haritaki (medicinal fruit)",
}

# Staged devanagari -> why it stays staged.
SKIP_REASONS: dict[str, str] = {
    "विजयाय": "wrong gloss (heard; contextual echo)",
    "गृहीत्वा": "wrong gloss (kamsa; name dominance) + verb",
    "सूतः": "wrong gloss (sauti; narrator-name dominance)",
    "सूतो": "wrong gloss (suta; name fragment)",
    "लेख्यं": "wrong gloss (case; contextual echo)",
    "ब्रूहि": "verb (no topic home); gloss 'please' is contextual",
    "उवाच": "verb (no topic home)",
    "शृणु": "verb (no topic home)",
    "श्रुत्वा": "verb (no topic home)",
    "पञ्च": "numeral (parked with number-words)",
    "सप्त": "numeral (parked with number-words)",
    "दश": "numeral (parked with number-words)",
    "षट्": "numeral (parked with number-words)",
    "त्रिषु": "numeral (parked with number-words)",
    "त्रिधा": "numeral (parked with number-words)",
    "त्रिविधं": "numeral (parked with number-words)",
    "द्वितीया": "numeral (parked with number-words)",
    "सप्तधा": "numeral (parked with number-words)",
    "संजय": "proper name (not vocabulary)",
    "रुद्रः": "proper name (not vocabulary)",
    "ब्रह्मा": "proper name (not vocabulary)",
    "भृगुः": "proper name (not vocabulary)",
    "रोहिणी": "proper name (not vocabulary)",
    "विजया": "proper name (not vocabulary)",
    "कृष्णं": "proper name (not vocabulary)",
    "राजा": "role with no topic home (no rulers slug)",
    "नृपः": "role with no topic home (no rulers slug)",
    "भगवान्": "epithet with no topic home",
    "मधुरा": "ambiguous (sweet vs the city Mathurā)",
    "पृथिवी": "weak fit (earth is not travel)",
    "गवां": "livestock with no topic home",
    "हृदि": "inflected form (locative), not a headword",
}

PROVENANCE = "dcs"


def plan_audit(staged: list[dict]) -> dict:
    """Replay mapping decisions against staged rows (review tool, no DB)."""
    from app.seeds.vocab import DCS_VOCAB

    shipped = {(t, d) for t, d, _ in DCS_VOCAB}
    imports, skips = [], []
    for row in staged:
        dev = row.get("devanagari", "")
        gloss = (row.get("gloss") or "").strip()
        if not dev or not gloss:
            continue
        hit = next(((t, d, g) for t, d, g in DCS_VOCAB if d == dev), None)
        if hit is None:
            skips.append({"devanagari": dev, "gloss": gloss,
                          "reason": SKIP_REASONS.get(dev, "unmapped gloss")})
        else:
            imports.append({"topic": hit[0], "devanagari": hit[1],
                            "gloss": hit[2]})
    return {"imports": imports, "skips": skips}


def run_import(db, live: bool) -> dict:
    """Insert missing DCS_VOCAB rows with seed rules. Idempotent."""
    from app.models import Challenge, VocabWord
    from app.seeds.vocab import DCS_VOCAB, _pool_examples
    from app.services import iast as _iast

    approved = [
        (c.target_sanskrit or "", c.prompt_l1 or "")
        for c in db.query(Challenge)
        .filter(Challenge.review_status == "approved").all()
    ]
    added = skipped_dup = 0
    for topic, dev, gloss in DCS_VOCAB:
        existing = db.query(VocabWord).filter(
            VocabWord.topic == topic, VocabWord.devanagari == dev).first()
        if existing:
            skipped_dup += 1
            continue
        if live:
            top_rank = db.query(VocabWord.rank).filter(
                VocabWord.topic == topic).order_by(
                VocabWord.rank.desc()).first()
            rank = (top_rank[0] + 1) if top_rank else 0
            db.add(VocabWord(
                topic=topic, rank=rank, devanagari=dev,
                iast=_iast.to_iast(dev), gloss=gloss,
                gender="", stem="",
                examples=_pool_examples(dev, approved),
                provenance=PROVENANCE,
            ))
            # Flush per add (autoflush is off in this codebase's sessions):
            # same-topic later rows must see this rank, or every row in a
            # topic lands on the same rank.
            db.flush()
            added += 1
    if live:
        db.commit()
    return {"added": added, "skipped_dup": skipped_dup}


def main(argv=None) -> int:
    p = argparse.ArgumentParser(prog="import_vocab_dcs",
                                description="Audit mapping + import DCS vocab.")
    p.add_argument("--in", dest="inp",
                   default="results/imports/dcs-vocab.glossed.json")
    p.add_argument("--live", action="store_true", help="write rows (default dry-run)")
    args = p.parse_args(argv)
    from app.db import SessionLocal

    staged = json.loads(Path(args.inp).read_text(encoding="utf-8"))
    audit = plan_audit(staged)
    db = SessionLocal()
    try:
        report = run_import(db, live=args.live)
    finally:
        db.close()
    mode = "LIVE" if args.live else "DRY-RUN (nothing written)"
    print(f"[vocab-dcs] {mode}: {report['added']} added, "
          f"{report['skipped_dup']} dupes, "
          f"{len(audit['skips'])} left staged")
    for s in audit["skips"]:
        print(f"[vocab-dcs]   staged: {s['devanagari']} ({s['gloss']}) — {s['reason']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
