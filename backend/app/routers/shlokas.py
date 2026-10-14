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

GET /shlokas/{id}/meaning (2026-10-02) is the one route here that may reach a
model: the verse's meaning in English and Hindi, from the row when it is
stored, written once by Gemini and stored when it is not
(services/verse_study.py). It is its own route so that /shlokas/today, which
Home waits on, stays a plain read.
"""

from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth import require_learner
from app.db import get_db
from app.models import Learner, Shloka
from app.schemas import ChantInfo, ChantLine, ShlokaResponse
from app.services import verse_study
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
    Paged books never feed the daily verse (handover_reading_shelf.md 6.4).
    """
    row = db.query(Shloka).filter(Shloka.date == day, Shloka.in_daily.is_(True)).first()
    if row is not None:
        return row

    try:
        d = date.fromisoformat(day)
        offset = (d - _CYCLE_ANCHOR).days
        rows = db.query(Shloka).filter(Shloka.in_daily.is_(True)).order_by(Shloka.date.asc()).all()
        if not rows:
            return None
        idx = offset % len(rows)
        return rows[idx]
    except ValueError:
        return None


def _shloka_response(s: Shloka, chant_by_uid: dict | None = None) -> ShlokaResponse:
    """Map an ORM Shloka to the API shape (shared by list + today)."""
    from app.config import settings as _settings
    from app.services.chant_text import verse_uid as _uid
    uid = getattr(s, "verse_uid", "") or _uid(s.source_ref or "", s.devanagari or "")
    chant = None
    if chant_by_uid is not None and uid in chant_by_uid:
        chant = chant_by_uid[uid]
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
        translation_hi=s.translation_hi or "",
        translation_en=s.translation_en or "",
        verse_uid=uid,
        chant=chant,
    )


def _chant_map(db, uids: list[str]) -> dict:
    """Load served VerseAudio rows once into {verse_uid: ChantInfo}."""
    from app.config import settings as _settings
    from app.models import VerseAudio
    if not uids:
        return {}
    statuses = [s.strip() for s in (_settings.chant_serve_statuses or "").split(",") if s.strip()]
    rows = (
        db.query(VerseAudio)
        .filter(VerseAudio.verse_uid.in_(uids),
                VerseAudio.voice == _settings.chant_voice,
                VerseAudio.qc_status.in_(statuses) if statuses else True)
        .all()
    )
    out: dict = {}
    for r in rows:
        try:
            lines = [ChantLine(i=int(l.get("i", 0)), text=str(l.get("text", "")),
                               kind=str(l.get("kind", "verse")),
                               start_ms=int(l.get("start_ms", 0)),
                               end_ms=int(l.get("end_ms", 0)))
                     for l in (r.lines or [])]
        except Exception:
            lines = []
        out[r.verse_uid] = ChantInfo(url=r.url or "", duration_ms=int(r.duration_ms or 0),
                                     voice=r.voice or "", lines=lines)
    return out


@router.get("/shlokas", response_model=list[ShlokaResponse])
def list_shlokas(
    learner: Learner = Depends(require_learner),
    db: Session = Depends(get_db),
):
    """The full reader corpus (U13/P21-1) in date order.

    Authenticated like /today (the reader rides on the same learner token).
    Returns every classic verse with its word_breakdown — the reader's
    instrumentation. Paged books are never listed here (6.4): they are served
    one chapter at a time by GET /canon/{slug}/verses. Old phones then see
    exactly today's list.
    No TTS, no LLM: reading is not metered (U13-3, P21).
    """
    rows = (
        db.query(Shloka)
        .filter(Shloka.in_daily.is_(True))
        .order_by(Shloka.date.asc(), Shloka.id.asc())
        .all()
    )
    from app.services.chant_text import verse_uid as _uid
    uids = [(getattr(s, "verse_uid", "") or _uid(s.source_ref or "", s.devanagari or "")) for s in rows]
    cmap = _chant_map(db, uids)
    return [_shloka_response(s, cmap) for s in rows]


@router.get("/shlokas/uid/{verse_uid}", response_model=ShlokaResponse)
def get_shloka_by_uid(
    verse_uid: str,
    learner: Learner = Depends(require_learner),
    db: Session = Depends(get_db),
):
    """One verse by its verse_uid, from any book (paged books included), for
    the Learn screen when a competition or a book links a verse that the
    classic list does not carry."""
    row = db.query(Shloka).filter(Shloka.verse_uid == verse_uid).first()
    if row is None:
        raise HTTPException(status_code=404, detail="No such verse.")
    return _shloka_response(row, _chant_map(db, [verse_uid]))


@router.get("/shlokas/today", response_model=ShlokaResponse)
def get_today_shloka(
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
        raise HTTPException(status_code=404, detail="No shloka available")

    from app.services.chant_text import verse_uid as _uid
    uid = getattr(shloka, "verse_uid", "") or _uid(shloka.source_ref or "", shloka.devanagari or "")
    return _shloka_response(shloka, _chant_map(db, [uid]))


class ShlokaMeaning(BaseModel):
    translation_en: str = ""
    translation_hi: str = ""
    source: str = Field(
        default="none",
        description="'db' when the meaning was stored, 'llm' when it was just "
                    "written and stored, 'none' when there is none to show",
    )


@router.get("/shlokas/{shloka_id}/meaning", response_model=ShlokaMeaning)
async def get_shloka_meaning(
    shloka_id: str,
    learner: Learner = Depends(require_learner),
    db: Session = Depends(get_db),
):
    """The verse's meaning in English and Hindi.

    Stored meaning is returned as it is. A verse with none is written once by
    Gemini (metered on the Gemini budget), stored on the row, and served from
    the row to everyone after. A verse the model was already asked about and
    could not read is not sent again. Never an error for a missing meaning:
    'none' and two empty strings, and the screen shows the verse without it.

    A locked Plus verse answers 403 before any model call (6.7).
    """
    shloka = db.query(Shloka).filter(Shloka.id == shloka_id).first()
    if shloka is None:
        raise HTTPException(status_code=404, detail="No such shloka")

    if getattr(shloka, "book", None):
        from app.models import CanonText
        from app.services import canon_access as _access

        text = db.query(CanonText).filter(CanonText.slug == shloka.book).first()
        if text is not None and not _access.verse_open(db, learner, text, shloka):
            raise HTTPException(status_code=403, detail="Part of Plus")

    def _stored() -> tuple[str, str]:
        return (shloka.translation_en or "").strip(), (shloka.translation_hi or "").strip()

    en, hi = _stored()
    if en or hi:
        return ShlokaMeaning(translation_en=en, translation_hi=hi, source="db")
    # Asked before and the answer was "nothing honest to say": do not pay again.
    if verse_study.load_answer(db, shloka.devanagari, verse_study.MEANING_Q, "en") is not None:
        return ShlokaMeaning()

    written = await verse_study.write_study(db, learner, shloka.devanagari, shloka)
    en, hi = _stored()
    if written and (en or hi):
        return ShlokaMeaning(translation_en=en, translation_hi=hi, source="llm")
    return ShlokaMeaning()