"""Parva festivals: GET /parva/calendar, /parva/page/{slug}, /parva/shraddha-date.

The place the phone sends with a date query is used for that answer and not
stored, as the privacy policy already says. Do not write it to the database,
do not log it, do not put it in an error report. Compute per request; an
in-process LRU keyed by (rounded place, start, days, tradition, lang) is
fine. Never persist it.
"""

from __future__ import annotations

from datetime import date as date_cls, datetime
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
from app.services import parva_catalog as catalog
from app.services import parva_rules as rules
from app.services.parva_content import normalize_form_key, normalize_tithi_key

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
    start = date_cls.fromisoformat(start_iso)
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
    # Availability separates verified dates from content readiness:
    # verified_dates | basic_detail | complete_guide | unavailable_unverified.
    availability: str = "verified_dates"


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
            start_d = date_cls.fromisoformat(start)
        except ValueError:
            raise HTTPException(status_code=400, detail="start must be YYYY-MM-DD")
    else:
        try:
            start_d = datetime.now(ZoneInfo(tzname)).date()
        except Exception:
            start_d = date_cls.today()
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
        hp = _has_page(pages, slug, variant)
        out.append(OccurrenceOut(
            slug=slug, variant=variant, title=title, title_local="",
            date=f.get("_date"), end_date=f.get("_end"),
            times=times, day=f.get("day"),
            has_page=hp,
            art_url=_art_for(arts, slug, variant),
            availability=catalog.availability_for(slug, hp),
        ))
    return CalendarOut(place_label=label or tzname, occurrences=out)


@router.get("/catalog")
def parva_catalog(
    lang: str = Query(default="en"),
    learner: Learner = Depends(require_learner),
    db: Session = Depends(get_db),
):
    """Machine-readable observance catalog with coverage status."""
    _ = learner
    lg = "hi" if (lang or "").lower().startswith("hi") else "en"
    pages = _page_map(db, lg)
    # Also count the other language so "missing Hi" is visible, not hidden.
    other = _page_map(db, "hi" if lg == "en" else "en")
    rows = catalog.catalog_report(pages)
    for r in rows:
        slug = str(r.get("slug") or "")
        r["has_page_requested_lang"] = any(s == slug for s, _v in pages)
        r["has_page_other_lang"] = any(s == slug for s, _v in other)
    return {"catalog": rows}


def _occurrence_matches(o: rules.Occurrence, slug: str, variant: str) -> bool:
    if o.slug == slug and (not variant or o.variant == variant):
        return True
    if slug == "kartika_purnima" and o.slug == "purnima" and o.variant == "kartika_purnima":
        return True
    if slug in ("dhanteras", "naraka_chaturdashi", "lakshmi_puja", "diwali",
                "govardhan_puja", "bhai_dooj") and o.slug == slug:
        return True
    # Variant-less request for a recurring vrat matches any variant; the
    # exact-date step below then picks the occurrence on that date.
    if slug in ("ekadashi", "pradosh", "purnima", "amavasya") and o.slug == slug and not variant:
        return True
    return False


def _pick_occurrence(occs: list[rules.Occurrence], slug: str, variant: str,
                     want_date: Optional[str]) -> Optional[rules.Occurrence]:
    """Exact occurrence: the one on `want_date` when given, else the next.

    For series, a day entry on `want_date` selects its parent series even
    when the series start differs. Repeated vrats in one year are therefore
    distinguished by date, not by first-in-year order.
    """
    cands = [o for o in occs if _occurrence_matches(o, slug, variant)]
    if not cands:
        return None
    if want_date:
        for o in cands:
            if o.date and o.date.isoformat() == want_date:
                return o
            if o.day and any(e.date == want_date for e in o.day):
                return o
        # Past/future date with no day entry: nearest series/period covering it.
        for o in cands:
            if o.date and o.end_date and o.date.isoformat() <= want_date <= o.end_date.isoformat():
                return o
    # No date requested: the first occurrence (year order) stays the default
    # for backward compatibility.
    return cands[0]


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
    title: str = ""
    tradition: str = "north"
    availability: str = "basic_detail"
    # Index of the selected day inside `day` (series), -1 when none.
    day_index: int = -1
    # Exact occurrence identity the client must carry for share/Ask/reminders.
    occurrence_date: Optional[str] = None


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
    tradition: str = Query(default="north"),
    date: Optional[str] = Query(default=None, description="YYYY-MM-DD exact occurrence/series day"),
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
    # Calculated times for the exact occurrence when place given.
    times: list[TimeOut] = []
    date_s: Optional[str] = None
    end_s: Optional[str] = None
    day_out: Optional[list[dict]] = None
    title = rules.EN_TITLES.get(slug, slug)
    trad = tradition if tradition in TRADITIONS else "north"
    day_index = -1
    occurrence_date: Optional[str] = None
    if lat is not None and lon is not None:
        tzname = tz or "Asia/Kolkata"
        try:
            ZoneInfo(tzname)
        except Exception:
            tzname = "Asia/Kolkata"
        zone = ZoneInfo(tzname)
        place = _place(lat, lon, tzname)
        try:
            want_y = int(date[:4]) if date else None
        except Exception:
            want_y = None
        y = int(year) if year else (want_y or datetime.now(zone).date().year)
        # Year window for the wanted date. One year covers every current
        # series; only Jan/Dec dates also look next door. This avoids the
        # old truncated 366-day title lookup without tripling every call.
        try:
            years = {y}
            if date and len(date) >= 7:
                try:
                    _m = int(date[5:7])
                    if _m == 1:
                        years.add(y - 1)
                    elif _m == 12:
                        years.add(y + 1)
                except Exception:
                    pass
            occs: list[rules.Occurrence] = []
            for yy in sorted(years):
                try:
                    span = (date_cls(yy + 1, 1, 1) - date_cls(yy, 1, 1)).days
                    occs += rules.occurrences(date_cls(yy, 1, 1), span, place, trad)
                except Exception:
                    continue
        except Exception:
            occs = []
        best = _pick_occurrence(occs, slug, variant or "", date)
        if best is not None and best.date:
            title = best.title or title
            date_s = best.date.isoformat()
            end_s = best.end_date.isoformat() if best.end_date else None
            occurrence_date = date_s
            for t in best.times:
                s = t.start.astimezone(zone).isoformat() if t.start else None
                e = t.end.astimezone(zone).isoformat() if t.end else None
                times.append(TimeOut(key=t.key, start=s, end=e))
            if best.day:
                day_out = []
                for i, d in enumerate(best.day):
                    dd = dict(d.__dict__)
                    # Normalise keys so seed joins never depend on spelling.
                    if dd.get("tithi_key"):
                        dd["tithi_key"] = normalize_tithi_key(str(dd["tithi_key"]))
                    if dd.get("form_key"):
                        dd["form_key"] = normalize_form_key(str(dd["form_key"]))
                        # Per-day deity painting (navadurga_<form_key> art row);
                        # blank when none approved, the client falls back.
                        dd["art_url"] = arts.get(f"navadurga_{dd['form_key']}", "")
                    day_out.append(dd)
                    if date and dd.get("date") == date:
                        day_index = i
                if day_index < 0 and date:
                    # Requested date is the occurrence start itself.
                    if date_s == date:
                        day_index = 0 if not best.day else -1
    hp = True
    return PageOut(slug=slug, variant=variant or "", lang=lg,
                   body=row.body or {}, sources=row.sources or [],
                   art_url=art_url, times=times, date=date_s, end_date=end_s,
                   day=day_out, title=title, tradition=trad,
                   availability=catalog.availability_for(slug, hp),
                   day_index=day_index, occurrence_date=occurrence_date)


class BasicOut(BaseModel):
    slug: str
    variant: str = ""
    title: str
    date: Optional[str] = None
    end_date: Optional[str] = None
    times: list[TimeOut] = []
    day: Optional[list[dict]] = None
    availability: str = "verified_dates"
    message: str = ""
    tradition: str = "north"


@router.get("/basic/{slug}", response_model=BasicOut)
def parva_basic(
    slug: str,
    variant: str = Query(default=""),
    date: Optional[str] = Query(default=None),
    year: Optional[int] = Query(default=None),
    lat: float = Query(...),
    lon: float = Query(...),
    tz: str = Query(default="Asia/Kolkata"),
    tradition: str = Query(default="north"),
    learner: Learner = Depends(require_learner),
):
    """Verified dates/status without requiring an approved rich body.

    Every calendar item links here when no page is published, so no styled
    card ever ignores a tap and no draft is exposed as guidance.
    """
    _ = learner
    slug = catalog.resolve_slug(slug)
    trad = tradition if tradition in TRADITIONS else "north"
    tzname = tz or "Asia/Kolkata"
    try:
        ZoneInfo(tzname)
    except Exception:
        tzname = "Asia/Kolkata"
    zone = ZoneInfo(tzname)
    place = _place(lat, lon, tzname)
    try:
        want_y = int(date[:4]) if date else None
    except Exception:
        want_y = None
    y = int(year) if year else (want_y or datetime.now(zone).date().year)
    years = {y}
    if date and len(date) >= 7:
        try:
            _m = int(date[5:7])
            if _m == 1:
                years.add(y - 1)
            elif _m == 12:
                years.add(y + 1)
        except Exception:
            pass
    occs: list[rules.Occurrence] = []
    for yy in sorted(years):
        try:
            span = (date_cls(yy + 1, 1, 1) - date_cls(yy, 1, 1)).days
            occs += rules.occurrences(date_cls(yy, 1, 1), span, place, trad)
        except Exception:
            continue
    best = _pick_occurrence(occs, slug, variant or "", date)
    if best is None or best.date is None:
        raise HTTPException(status_code=404, detail="No occurrence")
    times: list[TimeOut] = []
    for t in best.times:
        s = t.start.astimezone(zone).isoformat() if t.start else None
        e = t.end.astimezone(zone).isoformat() if t.end else None
        times.append(TimeOut(key=t.key, start=s, end=e))
    day_out = None
    if best.day:
        day_out = []
        for d in best.day:
            dd = dict(d.__dict__)
            if dd.get("tithi_key"):
                dd["tithi_key"] = normalize_tithi_key(str(dd["tithi_key"]))
            if dd.get("form_key"):
                dd["form_key"] = normalize_form_key(str(dd["form_key"]))
            day_out.append(dd)
    entry = next((c for c in catalog.CATALOG if c["slug"] == slug), None)
    if entry is None:
        msg = "Verified dates for this observance. A complete guide is not yet published."
    elif not best:
        msg = "Verified dates for this observance. A complete guide is not yet published."
    elif entry.get("content_complete"):
        msg = ""
    else:
        missing = ", ".join((entry.get("missing") or [])[:3])
        msg = ("Verified dates for this observance. A complete step-by-step guide "
               "is not yet published" + (f" (still needed: {missing})." if missing else "."))
    return BasicOut(
        slug=best.slug, variant=best.variant, title=best.title or rules.EN_TITLES.get(slug, slug),
        date=best.date.isoformat(), end_date=best.end_date.isoformat() if best.end_date else None,
        times=times, day=day_out, availability=catalog.availability_for(slug, False),
        message=msg, tradition=trad,
    )


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
