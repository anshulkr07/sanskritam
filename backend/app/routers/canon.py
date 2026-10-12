"""Canon endpoints (P21-4 + reading shelf 2026-10-09).

GET /canon — the ordered, depth-graded reading catalogue with live imported
counts and coverage. Without a query parameter it returns only classic rows
(old phones). With ?include=paged it returns every row and adds paged/locked.
Auth-bound like /shlokas. LOCAL computation — no quota, no vendor call.

GET /canon/{slug}/chapters + GET /canon/{slug}/verses — one chapter at a
time for paged books (the reader today downloads every verse in one call;
that cannot carry 60,000+ verses).
"""

import re
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth import require_learner
from app.db import get_db
from app.models import Learner, Shloka

router = APIRouter()

# The reader's parseRef (mobile/src/utils/verses.ts): a book name, then a
# trailing verse number such as "2.47" or "13".
_TRAILING_NUMS = re.compile(r"^(.+?)\s+(\d+(?:\.\d+)*)\s*$")


def verse_key(ref: str) -> str:
    """One key per verse, the way the reader lists a book.

    A numbered reference is one verse however many rows carry it: the daily
    seed holds half-verses under the verse's number and an import holds the
    whole verse under the same one (Gītā 18.66 is both), and the book shows
    it once. A reference without a number ("Sūkti: Subhāṣita") is shared by
    different sayings, so each such row is its own verse.
    """
    norm = re.sub(r"\s+", " ", (ref or "").strip()).replace("Nītīśataka", "Nītiśataka")
    m = _TRAILING_NUMS.match(norm)
    if not m:
        return ""
    return m.group(1).strip() + " " + ".".join(str(int(n)) for n in m.group(2).split("."))


def _chapter_sort_key(ch: str) -> tuple:
    if ch == "":
        return (-1,)
    try:
        return tuple(int(p) for p in ch.split("."))
    except Exception:
        return (10 ** 9, ch)


def _section_of(chapter: str) -> str:
    if not chapter or "." not in chapter:
        return ""
    try:
        return str(int(chapter.split(".")[0]))
    except Exception:
        return ""


def canon_report(db: Session, learner=None, include_paged: bool = False) -> list[dict]:
    """Catalogue rows with live counts.

    Classic books: matched live by ref_prefixes against classic source_refs
    (in_daily True), counting verses as the reader lists them (verse_key).
    Paged books: one COUNT(*) per book from the book column (in_daily False).
    """
    from app.models import CanonText
    from app.services import canon_access as _access

    texts = db.query(CanonText).order_by(CanonText.study_order.asc()).all()
    if not include_paged:
        texts = [t for t in texts if not getattr(t, "paged", False)]
    # Classic counts: substring match over classic refs only.
    classic_refs: list[str] = []
    if any(not getattr(t, "paged", False) for t in texts):
        classic_refs = [
            r[0] or ""
            for r in db.query(Shloka.source_ref).filter(Shloka.in_daily.is_(True)).all()
        ]
    # Paged counts: one GROUP BY for all books (6.6).
    paged_counts: dict[str, int] = {}
    if any(getattr(t, "paged", False) for t in texts):
        for book, cnt in (
            db.query(Shloka.book, func.count(Shloka.id))
            .filter(Shloka.in_daily.is_(False), Shloka.book.isnot(None))
            .group_by(Shloka.book)
            .all()
        ):
            if book:
                paged_counts[book] = int(cnt or 0)
    out = []
    for t in texts:
        paged = bool(getattr(t, "paged", False))
        planned = t.verses_planned or 0
        if paged:
            imported = paged_counts.get(t.slug, 0)
        else:
            prefixes = t.ref_prefixes or []
            mine = [r for r in classic_refs if any(p and p in r for p in prefixes)] if prefixes else []
            keys = [verse_key(r) for r in mine]
            imported = len({k for k in keys if k}) + sum(1 for k in keys if not k)
        row = {
            "slug": t.slug,
            "title_en": t.title_en or "",
            "title_sa": t.title_sa or "",
            "source": t.source or "",
            "licence": t.licence or "",
            "study_order": t.study_order or 0,
            "depth": t.depth or "index",
            "tier": t.tier or "free",
            "verses_planned": planned,
            "verses_imported": imported,
            "coverage": round(imported / planned, 4) if planned else 0.0,
            "notes": t.notes or "",
            "ref_prefixes": t.ref_prefixes or [],
        }
        if include_paged:
            row["paged"] = paged
            try:
                row["locked"] = bool(_access.plus_locked(db, learner, t)) if learner is not None else False
            except Exception:
                row["locked"] = False
        out.append(row)
    return out


@router.get("/canon")
def get_canon(
    learner: Learner = Depends(require_learner),
    db: Session = Depends(get_db),
    include: str | None = Query(default=None),
):
    """The canon in study order (P21-4 + paged shelf).

    Without a query parameter only classic (paged == False) rows are
    returned, field for field as before, so a phone already out sees exactly
    what it sees today. With ?include=paged every row is returned with
    paged/locked.
    """
    include_paged = (include or "") == "paged"
    return {"texts": canon_report(db, learner, include_paged)}


def _get_paged_text(db: Session, slug: str):
    from app.models import CanonText

    text = db.query(CanonText).filter(CanonText.slug == slug).first()
    if text is None or not getattr(text, "paged", False):
        raise HTTPException(status_code=404, detail="No such paged book")
    return text


@router.get("/canon/{slug}/chapters")
def get_canon_chapters(
    slug: str,
    learner: Learner = Depends(require_learner),
    db: Session = Depends(get_db),
):
    """Chapters of one paged book, in order of their smallest seq."""
    from app.services import canon_access as _access

    text = _get_paged_text(db, slug)
    rows = (
        # Contents need only addresses and ordering. Loading full ORM rows
        # also transfers every verse's text, glosses and parse for large books.
        db.query(Shloka.chapter, Shloka.seq, Shloka.source_ref)
        .filter(Shloka.book == slug, Shloka.in_daily.is_(False))
        .order_by(Shloka.seq.asc())
        .all()
    )
    by_chapter: dict[str, list] = defaultdict(list)
    for r in rows:
        by_chapter[r.chapter or ""].append(r)
    ordered = sorted(by_chapter.keys(), key=lambda c: (
        min(int(x.seq or 0) for x in by_chapter[c]) if by_chapter[c] else 10 ** 9, c))
    locked_book = _access.plus_locked(db, learner, text)
    # The first chapter is already known; avoid reading the book a second time.
    preview = ordered[0] if ordered else ""
    one_chapter = len(ordered) <= 1
    chapters = []
    for ch in ordered:
        verses = sorted(by_chapter[ch], key=lambda r: int(r.seq or 0))
        first = verses[0] if verses else None
        ch_locked = locked_book and (ch != preview)
        chapters.append({
            "chapter": ch,
            "section": _section_of(ch),
            "count": len(verses),
            "first_ref": (first.source_ref or "") if first else "",
            "locked": bool(ch_locked),
        })
    return {
        "slug": text.slug,
        "title_en": text.title_en or "",
        "title_sa": text.title_sa or "",
        "tier": text.tier or "free",
        "locked": bool(locked_book),
        "preview": {"chapter": preview, "verses": 5 if one_chapter else None},
        "chapters": chapters,
    }


def _verse_responses(db: Session, rows: list) -> list:
    """The same verse shape GET /shlokas returns: verse_uid for Learn, and the
    chant (audio, line times) when one has been imported for the verse."""
    from app.routers.shlokas import _chant_map, _shloka_response
    from app.services.chant_text import verse_uid as _uid

    uids = [(getattr(s, "verse_uid", "") or _uid(s.source_ref or "", s.devanagari or "")) for s in rows]
    chants = _chant_map(db, uids)
    return [_shloka_response(s, chants) for s in rows]


@router.get("/canon/{slug}/verses")
def get_canon_verses(
    slug: str,
    chapter: str | None = Query(default=None),
    learner: Learner = Depends(require_learner),
    db: Session = Depends(get_db),
):
    """Verses of one chapter, ordered by seq (ShlokaResponse shape)."""
    from app.services import canon_access as _access

    text = _get_paged_text(db, slug)
    want = chapter if chapter is not None else ""
    rows = (
        db.query(Shloka)
        .filter(Shloka.book == slug, Shloka.chapter == want, Shloka.in_daily.is_(False))
        .order_by(Shloka.seq.asc())
        .all()
    )
    if not rows:
        # Distinguish an unknown chapter from an empty one: does the book
        # hold this chapter at all?
        known = {
            r[0] or ""
            for r in db.query(Shloka.chapter)
            .filter(Shloka.book == slug, Shloka.in_daily.is_(False))
            .all()
        }
        if want not in known:
            raise HTTPException(status_code=404, detail="No such chapter")
    locked_book = _access.plus_locked(db, learner, text)
    preview = _access.preview_chapter(db, text)
    # Is this a one-chapter book?
    known_all = [
        r[0] or ""
        for r in db.query(Shloka.chapter)
        .filter(Shloka.book == slug, Shloka.in_daily.is_(False))
        .all()
    ]
    one_chapter = len(set(known_all)) <= 1
    if not locked_book:
        verses = rows
        return {
            "slug": slug,
            "chapter": want,
            "locked": False,
            "locked_after": None,
            "verses": _verse_responses(db, verses),
        }
    # Locked: only the preview chapter opens.
    if want != preview:
        return {"slug": slug, "chapter": want, "locked": True,
                "locked_after": None, "verses": []}
    if one_chapter:
        verses = rows[:5]
        return {
            "slug": slug, "chapter": want, "locked": True,
            "locked_after": 5,
            "verses": _verse_responses(db, verses),
        }
    verses = [r for r in rows if _access.verse_open(db, learner, text, r)]
    return {
        "slug": slug, "chapter": want, "locked": False,
        "locked_after": None,
        "verses": _verse_responses(db, verses),
    }
