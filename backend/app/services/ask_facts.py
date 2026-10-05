"""Calendar FACTS for Ask: calculated by code, handed to the model as orders.

The model never recalls a date, a tithi, a nakshatra or a time. When a
question touches the calendar, the server works the day out for the
learner's place (services/panchang.py) and writes it into a FACTS block the
model must use as given. Shared by the Ask bubble (routers/explain.py) and
Talk's Ask mode (routers/ask.py).

Moved out of routers/explain.py on 2026-10-05, when Talk's Ask mode needed
the same facts. Added then: nakshatra, yoga, karana, sunrise and sunset. The
day's nakshatra and yoga end times can be minutes off near a boundary
(DECISIONS.md, the Kāla entries); the names are right.
"""

from __future__ import annotations

import re
from datetime import date, datetime
from typing import Optional
from zoneinfo import ZoneInfo

# "yoga" alone is left out: in Ask it is far more often the practice than the
# panchang element, and "today's yoga" still matches on "today".
CALENDAR_Q = re.compile(
    r"tithi|panchang|panchangam|nakshatra|nakshatram|karana|today|aaj|आज|"
    r"when is|kab hai|कब|muhurta|muhurtam|muhurat|muhurt|sunrise|sunset|moonrise|vrat|vrata|"
    r"festival|utsav|parva|puja|pooja|पूजा|त्योहार|तिथि|नक्षत्र|मुहूर्त|"
    r"brahm[a]?\s*muh[uo]?ra?t|bramha\s*muh[uo]?ra?t|brahmamuh[uo]?ra?t|ब्रह्म\s*मुहूर्त|amavasya|amavas|amavsya|अमावस्या|"
    r"purnima|poornima|pournam|पूर्णिमा|ekadashi|ekadasi|एकादशी|"
    r"samvat|samwat|vikrami",
    re.I,
)

#: Months of the year: month words together with list words, or "Hindu months".
_MONTH_Q = re.compile(r"\b(?:months?|maas|masa|masam|mahine)\b|महीने|महीनों|मास", re.I)
_MONTH_LIST_Q = re.compile(r"\b(?:list|12|twelve|names?)\b|\ball\s+(?:the\s+)?(?:hindu\s+)?months\b|बारह|सभी|hindu months", re.I)

#: Brahma muhurta spellings.
# "brahma" alone is Brahma, Brahman, Brahmagupta, the Brahmanda: only with muhurta.
_BRAHMA_Q = re.compile(r"brahm[a]?\s*muh[uo]?ra?t|bramha\s*muh[uo]?ra?t|brahmamuh[uo]?ra?t|ब्रह्म\s*मुहूर्त", re.I)

#: Next-tithi questions.
_AMAVASYA_Q = re.compile(r"amavasya|amavas|amavsya|अमावस्या", re.I)
_PURNIMA_Q = re.compile(r"purnima|poornima|pournam|पूर्णिमा", re.I)
_EKADASHI_Q = re.compile(r"ekadashi|ekadasi|एकादशी", re.I)

#: A daily horoscope: today's transits for the asker.
_DAILY_Q = re.compile(r"horoscope today|daily horoscope|aaj ka rashifal|आज का राशिफल|rashifal", re.I)

_TRADITIONS = ("north", "deccan", "gujarat", "tamil", "kerala", "bengal")

DELHI = {"lat": 28.6139, "lon": 77.2090, "tz": "Asia/Kolkata", "label": "New Delhi"}


def resolve_place(lat: float = 0.0, lon: float = 0.0, tz: str = "", label: str = "",
                  given: bool = False) -> tuple[dict, bool]:
    """Approximate place for calendar math. Returns (place, place_needed).

    With no place, calculate for New Delhi and say a place is needed. The
    place is used for the calculation and never stored or logged.
    """
    if given and (lat or lon):
        try:
            la, lo = round(float(lat), 1), round(float(lon), 1)
        except (TypeError, ValueError):
            return dict(DELHI), True
        return {"lat": la, "lon": lo, "tz": (tz or "Asia/Kolkata").strip() or "Asia/Kolkata",
                "label": (label or "").strip() or "Your place"}, False
    return dict(DELHI), True


def _alias_in(name: str, text: str) -> bool:
    """A festival name in a question, as a whole word when it is roman."""
    if re.fullmatch(r"[a-z0-9 '.-]+", name):
        return re.search(r"(?<![a-z])" + re.escape(name) + r"(?![a-z])", text) is not None
    return name in text


#: The two Navratris: a question naming neither gets whichever comes next.
_NAVRATRIS = ("Chaitra Navratri", "Sharad Navratri")
_NAMED_NAVRATRI = re.compile(r"chaitra|vasant|sharad|shardiya|ashwin|ashvin|चैत्र|शारदीय|आश्विन", re.I)


def find_festival_in_text(text: str) -> Optional[dict]:
    from app.services import panchang as _panchang

    q = (text or "").casefold()
    if not q:
        return None
    for row in _panchang._FESTIVALS:
        names = [row["name"].casefold(), *[a.casefold() for a in row.get("aliases", [])]]
        for n in names:
            if n and _alias_in(n, q):
                return row
    return None


def fmt_day(d: date) -> str:
    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    return f"{d.day} {months[d.month - 1]} {d.year}"


def is_calendar_question(question: str, screen_text: str = "") -> bool:
    combined = f"{question} {screen_text}"
    return (bool(CALENDAR_Q.search(combined)) or find_festival_in_text(combined) is not None
            or is_months_question(question, screen_text))


def is_brahma_question(question: str, screen_text: str = "") -> bool:
    return bool(_BRAHMA_Q.search(f"{question} {screen_text}"))


def is_next_tithi_question(question: str, screen_text: str = "") -> Optional[str]:
    combined = f"{question} {screen_text}"
    if _AMAVASYA_Q.search(combined):
        return "amavasya"
    if _PURNIMA_Q.search(combined):
        return "purnima"
    if _EKADASHI_Q.search(combined):
        return "ekadashi"
    return None


def is_months_question(question: str, screen_text: str = "") -> bool:
    combined = f"{question} {screen_text}"
    if re.search(r"hindu months", combined, re.I):
        return True
    return bool(_MONTH_Q.search(combined) and _MONTH_LIST_Q.search(combined))


def is_daily_question(question: str) -> bool:
    return bool(_DAILY_Q.search(question or ""))


def norm_tradition(tradition: str = "") -> str:
    t = (tradition or "").strip().lower()
    return t if t in _TRADITIONS else "north"


def convention_for(tradition: str) -> str:
    t = norm_tradition(tradition)
    return "purnimanta" if t == "north" else "amanta"


def fmt_time(dt: datetime) -> str:
    return dt.strftime("%H:%M")


def calendar_facts(question: str, screen_text: str, place: dict,
                   tradition: str = "") -> tuple[str, str, str, str, str]:
    """FACTS for the model, plus when_text, when_note, date_str, place_key.

    Empty facts when the question is not about the calendar. Never raises: a
    calculation failure means no FACTS, and the model is told it cannot
    calculate that yet. Each new FACTS line sets when_text to the thing asked
    about, not to today's date.
    """
    from app.services import panchang as _panchang

    combined = f"{question} {screen_text}"
    if not is_calendar_question(question, screen_text):
        return "", "", "", "", ""
    tzname = place.get("tz") or "Asia/Kolkata"
    try:
        zone = ZoneInfo(tzname)
    except Exception:
        zone = ZoneInfo("Asia/Kolkata")
    today = datetime.now(zone).date()
    date_str = today.isoformat()
    place_key = f"{round(float(place.get('lat', 0)), 1)},{round(float(place.get('lon', 0)), 1)}"
    label = place.get("label") or "New Delhi"
    try:
        d = _panchang.day(today, place)
    except Exception:
        return "", "", "", date_str, place_key
    fest_row = find_festival_in_text(combined)
    fest_line = ""
    when_text = fmt_day(today)
    fest_rows = [fest_row] if fest_row is not None else []
    if fest_row is not None and fest_row["name"] in _NAVRATRIS and not _NAMED_NAVRATRI.search(combined):
        fest_rows = [r for r in _panchang._FESTIVALS if r["name"] in _NAVRATRIS]
    best = None  # (start date, row, occurrence)
    for row in fest_rows:
        for yr in (today.year, today.year + 1):
            try:
                occ = _panchang.festival(row["name"], yr, place)
            except Exception:
                continue
            last = occ[1] if isinstance(occ, tuple) else occ
            first = occ[0] if isinstance(occ, tuple) else occ
            if last >= today:
                if best is None or first < best[0]:
                    best = (first, row, occ)
                break
    if best is not None:
        fest_row = best[1]
    if fest_row is not None:
        try:
            for yr in (today.year, today.year + 1):
                try:
                    occ = _panchang.festival(fest_row["name"], yr, place)
                except LookupError:
                    continue
                if isinstance(occ, tuple):
                    start, end = occ
                    if end >= today:
                        fest_line = f"- {fest_row['name']}: {fmt_day(start)} to {fmt_day(end)}."
                        when_text = f"{fmt_day(start)} to {fmt_day(end)}"
                        break
                else:
                    if occ >= today:
                        fest_line = f"- {fest_row['name']}: {fmt_day(occ)}."
                        when_text = fmt_day(occ)
                        break
            else:
                fest_line = f"- {fest_row['name']}: cannot calculate that yet."
        except Exception:
            fest_line = f"- {fest_row['name']}: cannot calculate that yet."
    # Brahma muhurta: tomorrow when asked, else today if not ended, else tomorrow.
    brahma_line = ""
    if is_brahma_question(question, screen_text):
        try:
            ql = combined.casefold()
            wants_tomorrow = bool(re.search(r"\btomorrow\b|\bkal\b|कल", combined, re.I))
            now_utc = datetime.now(ZoneInfo("UTC"))
            target = today + __import__("datetime").timedelta(days=1) if wants_tomorrow else today
            if not wants_tomorrow:
                try:
                    bm_today = _panchang.brahma_muhurta(today, place)
                    if bm_today is not None and now_utc < bm_today[1]:
                        target = today
                    elif bm_today is not None:
                        target = today + __import__("datetime").timedelta(days=1)
                except Exception:
                    target = today
            bm = _panchang.brahma_muhurta(target, place)
            if bm is not None:
                s_utc, e_utc, sr_utc = bm
                s = s_utc.astimezone(zone).strftime("%H:%M")
                e = e_utc.astimezone(zone).strftime("%H:%M")
                sr = sr_utc.astimezone(zone).strftime("%H:%M")
                brahma_line = f"- Brahma muhurta on {fmt_day(target)}: {s} to {e} (sunrise {sr})."
                when_text = f"Brahma muhurta, {fmt_day(target)}"
            else:
                brahma_line = "- Brahma muhurta: cannot calculate that yet."
        except Exception:
            brahma_line = "- Brahma muhurta: cannot calculate that yet."
    # The next Amavasya, Purnima or Ekadashi after now.
    tithi_line = ""
    tithi_kind = is_next_tithi_question(question, screen_text)
    if fest_row is not None:
        tithi_kind = None  # "Guru Purnima" is a festival question, not "the next purnima"
    if tithi_kind is not None:
        try:
            now_utc = datetime.now(ZoneInfo("UTC"))
            if tithi_kind == "amavasya":
                b, e, day = _panchang.next_amavasya(now_utc, place)
                bl, el = b.astimezone(zone), e.astimezone(zone)
                tithi_line = (f"- Next Amavasya: begins {fmt_day(bl.date())} {bl.strftime('%H:%M')}, "
                              f"ends {fmt_day(el.date())} {el.strftime('%H:%M')}; the day is {fmt_day(day)}.")
                when_text = fmt_day(day)
            elif tithi_kind == "purnima":
                b, e, day = _panchang.next_purnima(now_utc, place)
                bl, el = b.astimezone(zone), e.astimezone(zone)
                tithi_line = (f"- Next Purnima: begins {fmt_day(bl.date())} {bl.strftime('%H:%M')}, "
                              f"ends {fmt_day(el.date())} {el.strftime('%H:%M')}; the day is {fmt_day(day)}.")
                when_text = fmt_day(day)
            else:
                which, b, e = _panchang.next_ekadashi(now_utc, place)
                bl, el = b.astimezone(zone), e.astimezone(zone)
                tithi_line = (f"- Next Ekadashi ({which}): begins {fmt_day(bl.date())} {bl.strftime('%H:%M')}, "
                              f"ends {fmt_day(el.date())} {el.strftime('%H:%M')}; "
                              f"the fasting day cannot be calculated yet.")
                when_text = "Ekadashi"
        except Exception:
            tithi_line = f"- Next {tithi_kind.capitalize()}: cannot calculate that yet."
    # The months of the current Vikram Samvat year, Chaitra first.
    months_block = ""
    trad = norm_tradition(tradition)
    if is_months_question(question, screen_text):
        try:
            conv = convention_for(trad)
            vs_year, conv_used, rows = _panchang.months_of_year(today, place, conv)
            header = f"MONTHS (Vikram Samvat {vs_year} Chaitradi, {conv_used}, calculated for {label}):"
            months_block = header + "\n" + "\n".join(
                f"- {r['roman']} | {r['dev']} | {fmt_day(r['start'])} to {fmt_day(r['end'])}" for r in rows)
            if trad in ("tamil", "kerala", "bengal"):
                months_block += "\n- Note: these traditions count solar months, which this list does not."
            when_text = f"Vikram Samvat {vs_year}"
        except Exception:
            months_block = "- MONTHS: cannot calculate that yet."
    when_note = f"For {label}"
    today_line = (
        f"- Today, {fmt_day(today)} ({d.get('weekday', '')}): {d.get('tithi', '')} until "
        f"{d.get('tithi_end', '')}, then {d.get('tithi_next', '')}. "
        f"Month {d.get('month_purnimanta', '')} (Purnimanta), {d.get('month_amanta', '')} (Amanta). "
        f"Vikram Samvat {d.get('vikram_samvat', '')}."
    )
    sky_line = (
        f"- Nakshatra {d.get('nakshatra', '')} until about {d.get('nakshatra_end', '')}; "
        f"yoga {d.get('yoga', '')}; karana {d.get('karana', '')}. "
        f"Sunrise {d.get('sunrise', '')}, sunset {d.get('sunset', '')} (local time)."
    )
    extra = "\n".join(l for l in (fest_line, brahma_line, tithi_line, months_block) if l)
    facts = (
        f"FACTS (calculated for {label}; use exactly as given, never change or add to them):\n"
        f"{today_line}\n{sky_line}"
        + (f"\n{extra}" if extra else "")
    )
    return facts, when_text, when_note, date_str, place_key
