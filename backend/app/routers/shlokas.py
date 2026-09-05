"""Shloka endpoints: GET /shlokas (the reader list, U13/P21) and
GET /shlokas/today (the daily verse).

A daily surface that must never freeze (HANDOVER §2.12): selection resolves in
the learner's own timezone (§2.8) and, when the seeded window is past, cycles
deterministically so every learner on a given date sees the same verse forever
— instead of falling back to "the newest row", which served one frozen verse
for days with no error (P7-6).

GET /shlokas powers the reader (UI_HANDOVER U13, HANDOVER P21-1): a vertical
scroll of verse cards over the 96 verses already in `shlokas`. It returns the
whole lightweight corpus in date order, with the already-populated
`word_breakdown` — word, meaning and features per word — which is the reader's
instrumentation (P21-1: "built and paid for"). No TTS, no LLM, ₹0 (P21).
"""

from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth import require_learner
from app.db import get_db
from app.models import Learner, Shloka
from app.schemas import ShlokaResponse
from app.services.localtime import local_date

router = APIRouter()

# Anchor for the deterministic cycle: a fixed past date, NOT date.today().
# Every learner on a given date past the seeded window indexes the same offset
# from this anchor, so the well cannot freeze (§2.12).
_CYCLE_ANCHOR = date(2026, 9, 3)


def _select_shloka(db: Session, day: str) -> Shloka | None:
    """Pick the verse for a learner-local day.

    Seeded rows win when one exists for the exact day; past the seeded window
    the schedule cycles deterministically. Mirrors daily_word._select_word.
    """
    row = db.query(Shloka).filter(Shloka.date == day).first()
    if row is not None:
        return row

    try:
        d = date.fromisoformat(day)
        offset = (d - _CYCLE_ANCHOR).days
        rows = db.query(Shloka).order_by(Shloka.date.asc()).all()
        if not rows:
            return None
        idx = offset % len(rows)
        return rows[idx]
    except ValueError:
        return None


def _shloka_response(s: Shloka) -> ShlokaResponse:
    """Map an ORM Shloka to the API shape (shared by list + today)."""
    return ShlokaResponse(
        id=s.id,
        date=s.date,
        source_ref=s.source_ref,
        devanagari=s.devanagari,
        iast=s.iast,
        metre=s.metre or "",
        word_breakdown=s.word_breakdown or [],
        features=s.features or [],
        audio_url=s.audio_url or "",
    )


@router.get("/shlokas", response_model=list[ShlokaResponse])
async def list_shlokas(
    learner: Learner = Depends(require_learner),
    db: Session = Depends(get_db),
):
    """The full reader corpus (U13/P21-1) in date order.

    Authenticated like /today (the reader rides on the same learner token).
    Returns every verse with its word_breakdown — the reader's instrumentation.
    No TTS, no LLM: reading is not metered (U13-3, P21).
    """
    rows = (
        db.query(Shloka)
        .order_by(Shloka.date.asc(), Shloka.id.asc())
        .all()
    )
    return [_shloka_response(s) for s in rows]


@router.get("/shlokas/today", response_model=ShlokaResponse)
async def get_today_shloka(
    learner: Learner = Depends(require_learner),
    db: Session = Depends(get_db),
):
    """The daily shloka, resolved in the learner's own timezone.

    Authenticated (mobile already sends the bearer token on this call so the
    day boundary is the learner's local day, HANDOVER §2.8).
    """
    day = local_date(getattr(learner, "timezone", None))
    shloka = _select_shloka(db, day)
    if shloka is None:
        # No rows at all — empty well, not a freeze. Caller sees 404; the
        # runway guard (P7-7) pages loudly on this before it happens.
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="No shloka available")

    return _shloka_response(shloka)