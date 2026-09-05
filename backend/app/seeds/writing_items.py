"""P20-1 — the writing drill corpus: syllabary, mātrā forms, pool words.

Three tiers, in the order the tradition teaches (articulation order for the
letters — the order the mouth learns):

  1. the varṇamālā — from ``seeds/varnamala.py``, the same data U4-1 renders,
     never re-typed;
  2. mātrā forms — the vowel signs on a consonant (क का कि की कु कू), the step
     most apps skip and the one where beginners actually fail;
  3. whole words — drawn from APPROVED challenge rows where possible (the
     drill primes vocabulary the learner meets in a challenge the same week),
     falling back to the curated daily-word list, at zero content cost.

The seed is ADDITIVE and idempotent (§2.13): it inserts rows that do not exist
and never deletes or rewrites rows it did not create. IAST is derived from
lipi at seed time (P7-13). Tier 3 rows carry ``challenge_id`` so the drill
links to the pool instead of duplicating it.

No LLM anywhere — the corpus is computed from existing tables.
"""

from __future__ import annotations

import logging

from sqlalchemy.orm import Session

from app.models import Challenge, DailyWord, WritingItem
from app.seeds.stroke_data import letter_strokes
from app.seeds.varnamala import VARNAMALA_DATA
from app.services import iast

logger = logging.getLogger("shabd.seed_writing")

# Vowel signs (mātrās) for tier 2, in teaching order, with the bare vowel for
# reference. The carrier consonant क is the traditional drill base.
_MATRAS = [
    ("ा", "ā"), ("ि", "i"), ("ी", "ī"), ("ु", "u"), ("ू", "ū"),
    ("ृ", "ṛ"), ("े", "e"), ("ै", "ai"), ("ो", "o"), ("ौ", "au"),
]
_MATRA_BASE = "क"

# Words used when the challenge pool has no approved rows yet. Sourced from
# the curated daily-word list (already glossed, already gated).
_WORD_FALLBACK = ["बालकः", "गृहम्", "पुस्तकम्", "चन्द्रः", "कमल", "फलम्", "गजः", "जलम्"]


def _tier1_rows() -> list[dict]:
    """The 13 vowels + 33 consonants (+ nasals/others) in articulation order."""
    rows: list[dict] = []
    order = 0
    sections = (
        VARNAMALA_DATA["vowels"]
        + VARNAMALA_DATA["consonants"]
        + VARNAMALA_DATA["nasals"]
        + VARNAMALA_DATA["others"]
    )
    for cell in sections:
        dev = cell.get("devanagari")
        if not dev:
            continue
        rows.append({
            "tier": 1,
            "sort_order": order,
            "devanagari": dev,
            "gloss": cell.get("kind", ""),
        })
        order += 1
    return rows


def _tier2_rows() -> list[dict]:
    """Mātrā forms on the carrier consonant."""
    rows: list[dict] = []
    order = 0
    rows.append({
        "tier": 2, "sort_order": order, "devanagari": _MATRA_BASE, "gloss": "bare consonant",
    })
    order += 1
    for sign, _vowel_iast in _MATRAS:
        rows.append({
            "tier": 2, "sort_order": order,
            "devanagari": _MATRA_BASE + sign,
            "gloss": f"क + {sign}",
        })
        order += 1
    return rows


def _tier3_rows(db: Session) -> list[dict]:
    """Whole words, preferring approved challenge rows (already gated,
    already glossed, already carry pre-rendered audio)."""
    rows: list[dict] = []
    order = 0

    approved = (
        db.query(Challenge)
        .filter(Challenge.review_status == "approved")
        .all()
    )
    seen_words = set()
    for ch in approved:
        # First word of the target sentence — short enough to drill.
        first = (ch.target_sanskrit or "").strip("।॥,.!? ").split()
        if not first:
            continue
        word = first[0]
        if not word or word in seen_words or len(word) > 12:
            continue
        seen_words.add(word)
        rows.append({
            "tier": 3, "sort_order": order,
            "devanagari": word,
            "gloss": ch.prompt_l1 or "",
            "challenge_id": ch.id,
        })
        order += 1

    # Top up from the fallback list when the pool is thin (it currently is:
    # 33 approved rows). Fallback words are NOT tied to a challenge row.
    have = {r["devanagari"] for r in rows}
    for word in _WORD_FALLBACK:
        if word in have or len(rows) >= 24:
            break
        clue = ""
        dw = db.query(DailyWord).filter(DailyWord.answer == word).first()
        if dw is not None:
            clue = dw.clue or ""
        rows.append({
            "tier": 3, "sort_order": order,
            "devanagari": word,
            "gloss": clue,
            "challenge_id": None,
        })
        order += 1
    return rows


def seed_writing_items(db: Session) -> None:
    """Additive, idempotent (§2.13): insert what is missing, touch nothing else."""
    candidates = _tier1_rows() + _tier2_rows() + _tier3_rows(db)
    # P20-2: attach the authored stroke paths where the letter has them.
    for row in candidates:
        row["stroke_paths"] = letter_strokes(row["devanagari"]) or []
    inserted = 0
    for row in candidates:
        exists = (
            db.query(WritingItem)
            .filter(
                WritingItem.tier == row["tier"],
                WritingItem.devanagari == row["devanagari"],
            )
            .first()
        )
        if exists is not None:
            # Fill the P20-2 stroke paths in when they have been authored but
            # the row predates them. Otherwise leave the row untouched.
            if row.get("stroke_paths") and not (exists.stroke_paths or []):
                exists.stroke_paths = row["stroke_paths"]
            continue
        item = WritingItem(
            id=None,  # model default (_uuid) applies on flush
            tier=row["tier"],
            sort_order=row["sort_order"],
            devanagari=row["devanagari"],
            iast=iast.to_iast(row["devanagari"]),
            gloss=row.get("gloss", ""),
            stroke_paths=row.get("stroke_paths", []),
            challenge_id=row.get("challenge_id"),
        )
        db.add(item)
        db.flush()
        inserted += 1
    if inserted:
        logger.info("Seeded %d writing items", inserted)
