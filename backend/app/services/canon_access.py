"""Paged-book Plus access (handover_reading_shelf.md section 6.7).

Owner decision 2026-10-09: Plus books lock behind CANON_PLUS_GATE, turned on
when buying Plus works. The gate is off by default, so with no environment
change nothing is locked for anyone.

A free learner reads the first chapter of each Plus book; a book with one
chapter gives its first 5 verses.
"""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.config import settings
from app.models import CanonText, Learner, Shloka
from app.services.entitlement import has_entitlement


def plus_locked(db: Session | None, learner: Learner | None, text: CanonText) -> bool:
    """True when this learner may read only the preview of this book."""
    if settings.commerce_enabled:
        from app.commerce.service import title_access
        return not (db is not None and learner is not None and title_access(db, learner.id, text.slug + ":book"))
    if not settings.canon_plus_gate:
        return False
    if (text.tier or "free") != "plus":
        return False
    return not has_entitlement(learner, "canon_plus", db)


def _chapter_min_seq(db: Session, slug: str) -> dict[str, int]:
    rows = (
        db.query(Shloka.chapter, Shloka.seq)
        .filter(Shloka.book == slug, Shloka.in_daily.is_(False))
        .all()
    )
    out: dict[str, int] = {}
    for chapter, seq in rows:
        ch = chapter or ""
        try:
            s = int(seq or 0)
        except Exception:
            s = 0
        if ch not in out or s < out[ch]:
            out[ch] = s
    return out


def preview_chapter(db: Session, text: CanonText) -> str:
    """The chapter with the smallest seq (the free preview chapter)."""
    mins = _chapter_min_seq(db, text.slug)
    if not mins:
        return ""
    return sorted(mins.items(), key=lambda kv: (kv[1], kv[0]))[0][0]


def verse_open(db: Session, learner: Learner | None, text: CanonText, shloka: Shloka) -> bool:
    """Open when not locked, or in the preview chapter, or (one-chapter book)
    among the first 5 by seq."""
    if settings.commerce_enabled:
        from app.commerce.access import reading_open
        return learner is not None and reading_open(db, learner, text, shloka)
    if not plus_locked(db, learner, text):
        return True
    preview = preview_chapter(db, text)
    if (shloka.chapter or "") == preview:
        # One-chapter book: only the first 5 verses are open.
        mins = _chapter_min_seq(db, text.slug)
        if len(mins) <= 1:
            try:
                return int(shloka.seq or 0) <= 5
            except Exception:
                return False
        return True
    return False
