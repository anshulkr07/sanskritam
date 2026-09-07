"""Graded-reading reads (P22-6).

Three tiers — 1 simple (Units 2–3) · 2 with sandhi (Unit 6) · 3 with
compounds/classical (Unit 10). Static content served from the DB; every row
carries the Vidyut parse produced at seed time. Reading, not drilling: no
verdict, no score — the endpoint only serves passages.
"""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.models import ReaderPassage

VALID_TIERS = (1, 2, 3)


def passages_for_tier(db: Session, tier: int) -> list[ReaderPassage]:
    return (
        db.query(ReaderPassage)
        .filter(ReaderPassage.tier == tier)
        .order_by(ReaderPassage.sort_order)
        .all()
    )
