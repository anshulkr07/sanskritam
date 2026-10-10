"""Graded-reading seed builder (P22-6).

Three tiers from ALREADY-SERVABLE content — no external corpus import, so no
per-source licence question arises beyond the pools' own provenance:

- tier 1 (Units 2–3): short APPROVED laukika challenge sentences (≤5 words,
  no sandhi feature claimed). The breakdown + parse come from
  ``analyze_sentence`` at seed time; only confident words carry features, and
  ``meaning`` holds the engine's lemma stem (a reading aid, not a gloss —
  the row never claims more than the engine returned).
- tier 2 (Unit 6): served śloka verses — sandhi-rich classical lines whose
  ``word_breakdown`` is already populated (P21-1). Shorter half.
- tier 3 (Unit 10): the longer śloka verses — compound-dense classical lines.

A DCS import (650K+ parsed lines) is the later VOLUME step, gated on the
per-source licence record P22-6 §6 requires. When it lands it appends tiers
by the same unique key; nothing here is overwritten.
"""

from __future__ import annotations

import logging

from sqlalchemy.orm import Session

from app.grading.analyzer import analyze_sentence
from app.models import Challenge, ReaderPassage, Shloka
from app.services import iast

logger = logging.getLogger("shabd.seed.reader")

_SANDHI_FEATURES = frozenset({
    "VOWEL-SANDHI", "VISARGA-SANDHI", "ANUSVARA-SANDHI", "CONSONANT-SANDHI",
})

TIER1_MAX_WORDS = 5
TIER_PASSAGES_PER_TIER = 12


def _breakdown_from_analyzer(devanagari: str) -> tuple[list[dict], list[dict], list[str]]:
    """Build (word_breakdown, parse, features) from the engine.

    Only confident readings contribute features; an unconfident word ships
    with empty meaning/features (absent is absent — never a guessed gloss).
    """
    breakdown: list[dict] = []
    parse: list[dict] = []
    features: list[str] = []
    try:
        results = analyze_sentence(devanagari)
    except Exception:  # noqa: BLE001 — engine unavailable: passage ships bare
        return breakdown, parse, features
    for r in results:
        feats = sorted(set((r.parsed or {}).values())) if r.is_confident else []
        lemmas = sorted(set((r.parsed or {}).keys())) if r.is_confident else []
        breakdown.append({
            "word": r.word,
            "meaning": lemmas[0] if lemmas else "",
            "features": feats,
        })
        parse.append({
            "word": r.word,
            "lemma": lemmas[0] if lemmas else "",
            "features": feats,
            "confident": bool(r.is_confident),
        })
        features.extend(f for f in feats if f not in features)
    return breakdown, parse, features


def _ensure(db: Session, tier: int, sort_order: int, devanagari: str,
            breakdown: list[dict], parse: list[dict], features: list[str],
            register: str, provenance: str) -> bool:
    existing = db.query(ReaderPassage).filter(
        ReaderPassage.tier == tier,
        ReaderPassage.devanagari == devanagari,
    ).first()
    if existing:
        # P23-4a: repoint pre-registry free text at the key.
        if existing.provenance != provenance:
            existing.provenance = provenance
        return False
    db.add(ReaderPassage(
        tier=tier,
        sort_order=sort_order,
        devanagari=devanagari,
        iast=iast.to_iast(devanagari),
        word_breakdown=breakdown,
        parse=parse,
        features=features,
        register=register,
        provenance=provenance,
    ))
    # Flush per add (same discipline as _seed_challenges): the pool now holds
    # laukika+classical variants of one sentence, so the existence check above
    # must see this row before the next candidate — otherwise the second
    # variant double-inserts against the UNIQUE(tier, devanagari) constraint.
    # Found 2026-09-08 when P8-0 grew the approved pool 33→264.
    db.flush()
    return True


def seed_reader_passages(db: Session) -> dict[str, int]:
    """Idempotent graded-reading seed. Returns per-tier counts ADDED."""
    added = {"tier1": 0, "tier2": 0, "tier3": 0}

    # ── Tier 1: short approved challenge sentences, no sandhi ──────────
    approved = (
        db.query(Challenge)
        .filter(Challenge.review_status == "approved")
        .all()
    )
    simple = [
        c for c in approved
        if len((c.target_sanskrit or "").split()) <= TIER1_MAX_WORDS
        and not (_SANDHI_FEATURES & set(c.features or []))
    ]
    simple.sort(key=lambda c: (len((c.target_sanskrit or "").split()), c.target_sanskrit or ""))
    for i, c in enumerate(simple[:TIER_PASSAGES_PER_TIER]):
        dev = c.target_sanskrit
        breakdown, parse, feats = _breakdown_from_analyzer(dev)
        if _ensure(db, 1, i, dev, breakdown, parse,
                   sorted(set((c.features or []) + feats)),
                   c.register or "laukika",
                   "original"):
            added["tier1"] += 1

    # ── Tiers 2+3: served ślokas, shorter half then longer half ────────
    # The graded reader must keep choosing from the same verses (6.4):
    # paged books never feed it.
    shlokas = db.query(Shloka).filter(Shloka.in_daily.is_(True)).order_by(Shloka.date).all()
    by_len = sorted(shlokas, key=lambda s: len((s.devanagari or "").split()))
    half = max(1, len(by_len) // 2)
    for tier, rows in ((2, by_len[:half]), (3, by_len[half:])):
        for i, s in enumerate(rows[:TIER_PASSAGES_PER_TIER]):
            breakdown = [
                {"word": w.get("word", ""), "meaning": w.get("meaning", ""),
                 "features": w.get("features", [])}
                for w in (s.word_breakdown or [])
            ]
            if _ensure(db, tier, i, s.devanagari, breakdown,
                       [{"word": w["word"], "lemma": w.get("meaning", ""),
                         "features": w.get("features", []), "confident": True}
                        for w in breakdown if w["word"]],
                       list(s.features or []), s.register or "classical",
                       "public-domain"):
                added[f"tier{tier}"] += 1

    logger.info("Reader passages added: %s", added)
    return added
