"""Parva festivals: GET /parva/calendar, /parva/page/{slug}, /parva/shraddha-date.

The place the phone sends with a date query is used for that answer and not
stored, as the privacy policy already says. Do not write it to the database,
do not log it, do not put it in an error report. Compute per request; an
in-process LRU keyed by (rounded place, start, days, tradition, lang) is
fine. Never persist it.
"""

from __future__ import annotations

from datetime import date, datetime
from functools import lru_cache
from typing import Optional
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth import require_learner
from app.config import settings
from app.db import get_db
from app.models import Learner, ParvaArt, ParvaPage
from app.services import parva_rules as rules

router = APIRouter(prefix="/parva")

TRADITIONS = ("north", "deccan", "gujarat", "tamil", "kerala", "bengal")


def _serve_statuses(raw: str) -> set[str]:
    return {s.strip() for s in (raw or "").split(",") if s.strip()}


def _round1(x: float) -> float:
    try:
        return round(float(x), 1)
    except Exception:
        return 0.0


def _place(lat: float, lon: float, tz: str) -> dict:
    return {"lat": _round1(lat), "lon": _round1(lon), "tz": (tz or "Asia/Kolkata")}


@lru_cache(maxsize=256)
def _cached_occurrences(start_iso: str, days: int, lat: float, lon: float, tz: str, tradition: str):
    start = date.fromisoformat(start_iso)
    place = {"lat": lat, "lon": lon, "tz": tz}
    occs = rules.occurrences(start, days, place, tradition)
    # Freeze to plain data for the cache.
    return [o.to_dict() | {"_date": o.date.isoformat() if o.date else None,
                           "_end": o.end_date.isoformat() if o.end_date else None} for o in occs]


class TimeOut(BaseModel):
    key: str
    start: Optional[str] = None
    end: Optional[str] = None


class OccurrenceOut(BaseModel):
    slug: str
    variant: str = ""
    title: str
    title_local: str = ""
    date: Optional[str] = None
    end_date: Optional[str] = None
    times: list[TimeOut] = []
    day: Optional[list[dict]] = None
    has_page: bool = False
    art_url: str = ""


class CalendarOut(BaseModel):
    place_label: str = ""
    occurrences: list[OccurrenceOut] = []


def _page_map(db: Session, lang: str) -> set[tuple[str, str]]:
    statuses = _serve_statuses(settings.parva_serve_statuses)
    if not statuses:
        return set()
    rows = db.query(ParvaPage.slug, ParvaPage.variant).filter(
        ParvaPage.lang == lang, ParvaPage.status.in_(statuses)).all()
    return {(str(s), str(v)) for s, v in rows}


def _art_map(db: Session) -> dict[str, str]:
    statuses = _serve_statuses(settings.parva_art_serve_statuses)
    if not statuses:
        return {}
    rows = db.query(ParvaArt.key, ParvaArt.url).filter(ParvaArt.status.in_(statuses)).all()
    return {str(k): str(u) for k, u in rows}


def _has_page(pages: set[tuple[str, str]], slug: str, variant: str) -> bool:
    if (slug, variant) in pages or (slug, "") in pages:
        return True
    # Diwali run: occurrence slug dhanteras etc, page diwali_days variant.
    if (slug in ("dhanteras", "naraka_chaturdashi", "lakshmi_puja", "diwali",
                 "govardhan_puja", "bhai_dooj")
            and (("diwali_days", variant) in pages or ("diwali_days", slug) in pages)):
        return True
    # Kartika Purnima alias.
    if slug == "purnima" and variant == "kartika_purnima" and ("kartika_purnima", "") in pages:
        return True
    return False


def _art_for(arts: dict[str, str], slug: str, variant: str) -> str:
    for key in (f"{slug}_{variant}" if variant else "", slug):
        if key and key in arts:
            return arts[key]
    # Navaratri series painting.
    return ""


@router.get("/calendar", response_model=CalendarOut)
def parva_calendar(
    start: Optional[str] = Query(default=None, description="YYYY-MM-DD, default today at the place"),
    days: int = Query(default=60, ge=1, le=120),
    lat: float = Query(...),
    lon: float = Query(...),
    tz: str = Query(default="Asia/Kolkata"),
    tradition: str = Query(default="north"),
    lang: str = Query(default="en"),
    label: str = Query(default=""),
    learner: Learner = Depends(require_learner),
    db: Session = Depends(get_db),
):
    _ = learner
    max_days = int(getattr(settings, "parva_max_days", 120) or 120)
    days = max(1, min(int(days), max_days))
    trad = tradition if tradition in TRADITIONS else "north"
    lg = "hi" if (lang or "").lower().startswith("hi") else "en"
    tzname = tz or "Asia/Kolkata"
    try:
        ZoneInfo(tzname)
    except Exception:
        tzname = "Asia/Kolkata"
    place = _place(lat, lon, tzname)
    if start:
        try:
            start_d = date.fromisoformat(start)
        except ValueError:
            raise HTTPException(status_code=400, detail="start must be YYYY-MM-DD")
    else:
        try:
            start_d = datetime.now(ZoneInfo(tzname)).date()
        except Exception:
            start_d = date.today()
    # NOTE: place is rounded and never written anywhere (privacy).
    frozen = _cached_occurrences(start_d.isoformat(), days, place["lat"], place["lon"], tzname, trad)
    pages = _page_map(db, lg)
    arts = _art_map(db)
    zone = ZoneInfo(tzname)
    out: list[OccurrenceOut] = []
    for f in frozen:
        slug = str(f.get("slug") or "")
        variant = str(f.get("variant") or "")
        title = str(f.get("title") or rules.EN_TITLES.get(slug, slug))
        # title_local pending Drik Hindi hash check: "" falls back to title.
        times: list[TimeOut] = []
        for t in f.get("times") or []:
            s = t.get("start")
            e = t.get("end")
            try:
                s = datetime.fromisoformat(s).astimezone(zone).isoformat() if s else None
            except Exception:
                pass
            try:
                e = datetime.fromisoformat(e).astimezone(zone).isoformat() if e else None
            except Exception:
                pass
            times.append(TimeOut(key=str(t.get("key") or ""), start=s, end=e))
        out.append(OccurrenceOut(
            slug=slug, variant=variant, title=title, title_local="",
            date=f.get("_date"), end_date=f.get("_end"),
            times=times, day=f.get("day"),
            has_page=_has_page(pages, slug, variant),
            art_url=_art_for(arts, slug, variant),
        ))
    return CalendarOut(place_label=label or tzname, occurrences=out)


class PageOut(BaseModel):
    slug: str
    variant: str = ""
    lang: str
    body: dict = {}
    sources: list[dict] = []
    art_url: str = ""
    times: list[TimeOut] = []
    date: Optional[str] = None
    end_date: Optional[str] = None
    day: Optional[list[dict]] = None


def _latest_page(db: Session, slug: str, variant: str, lang: str):
    statuses = _serve_statuses(settings.parva_serve_statuses)
    # Alias: kartika_purnima page may live as purnima variant.
    candidates = [(slug, variant), (slug, "")]
    if slug == "kartika_purnima":
        candidates += [("purnima", "kartika_purnima")]
    if slug in ("dhanteras", "naraka_chaturdashi", "lakshmi_puja", "diwali",
                "govardhan_puja", "bhai_dooj"):
        candidates += [("diwali_days", variant), ("diwali_days", slug)]
    for cs, cv in candidates:
        row = (db.query(ParvaPage)
               .filter(ParvaPage.slug == cs, ParvaPage.variant == cv,
                       ParvaPage.lang == lang, ParvaPage.status.in_(statuses))
               .order_by(ParvaPage.version.desc()).first())
        if row is not None:
            return row
    return None


@router.get("/page/{slug}", response_model=PageOut)
def parva_page(
    slug: str,
    variant: str = Query(default=""),
    lang: str = Query(default="en"),
    year: Optional[int] = Query(default=None),
    lat: Optional[float] = Query(default=None),
    lon: Optional[float] = Query(default=None),
    tz: str = Query(default="Asia/Kolkata"),
    learner: Learner = Depends(require_learner),
    db: Session = Depends(get_db),
):
    _ = learner
    lg = "hi" if (lang or "").lower().startswith("hi") else "en"
    row = _latest_page(db, slug, variant or "", lg)
    if row is None:
        raise HTTPException(status_code=404, detail="No page")
    arts = _art_map(db)
    art_url = _art_for(arts, row.slug, row.variant or "")
    if not art_url:
        art_url = _art_for(arts, slug, variant or "")
    # Calculated times for the next occurrence when place+year given.
    times: list[TimeOut] = []
    date_s: Optional[str] = None
    end_s: Optional[str] = None
    day_out: Optional[list[dict]] = None
    if lat is not None and lon is not None:
        tzname = tz or "Asia/Kolkata"
        try:
            ZoneInfo(tzname)
        except Exception:
            tzname = "Asia/Kolkata"
        zone = ZoneInfo(tzname)
        place = _place(lat, lon, tzname)
        y = int(year) if year else datetime.now(zone).date().year
        try:
            occs = rules.occurrences(date(y, 1, 1), 366, place, "north")
        except Exception:
            occs = []
        best = None
        for o in occs:
            if o.slug == slug and (not variant or o.variant == variant):
                best = o
                break
            # Alias matches.
            if slug == "kartika_purnima" and o.slug == "purnima" and o.variant == "kartika_purnima":
                best = o
                break
            if slug in ("dhanteras", "naraka_chaturdashi", "lakshmi_puja", "diwali",
                        "govardhan_puja", "bhai_dooj") and o.slug == slug:
                best = o
                break
        if best is not None and best.date:
            date_s = best.date.isoformat()
            end_s = best.end_date.isoformat() if best.end_date else None
            for t in best.times:
                s = t.start.astimezone(zone).isoformat() if t.start else None
                e = t.end.astimezone(zone).isoformat() if t.end else None
                times.append(TimeOut(key=t.key, start=s, end=e))
            if best.day:
                day_out = [d.__dict__ for d in best.day]
    return PageOut(slug=slug, variant=variant or "", lang=lg,
                   body=row.body or {}, sources=row.sources or [],
                   art_url=art_url, times=times, date=date_s, end_date=end_s,
                   day=day_out)


@router.get("/shraddha-date")
def shraddha_date(
    tithi: int = Query(..., ge=1, le=30),
    year: int = Query(...),
    lat: float = Query(...),
    lon: float = Query(...),
    tz: str = Query(default="Asia/Kolkata"),
    learner: Learner = Depends(require_learner),
):
    _ = learner
    tzname = tz or "Asia/Kolkata"
    try:
        ZoneInfo(tzname)
    except Exception:
        tzname = "Asia/Kolkata"
    place = _place(lat, lon, tzname)
    d = rules.shraddha_date(int(tithi), int(year), place)
    if d is None:
        raise HTTPException(status_code=404, detail="No shraddha date")
    return {"tithi": int(tithi), "year": int(year), "date": d.isoformat()}
