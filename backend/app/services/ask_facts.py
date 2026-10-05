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
    r"when is|kab hai|कब|muhurta|muhurtam|muhurat|sunrise|sunset|moonrise|vrat|vrata|"
    r"festival|utsav|parva|puja|pooja|पूजा|त्योहार|तिथि|नक्षत्र|मुहूर्त",
    re.I,
)

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


def find_festival_in_text(text: str) -> Optional[dict]:
    from app.services import panchang as _panchang

    q = (text or "").casefold()
    if not q:
        return None
    for row in _panchang._FESTIVALS:
        names = [row["name"].casefold(), *[a.casefold() for a in row.get("aliases", [])]]
        for n in names:
            if n and n in q:
                return row
    return None


def fmt_day(d: date) -> str:
    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    return f"{d.day} {months[d.month - 1]} {d.year}"


def is_calendar_question(question: str, screen_text: str = "") -> bool:
    combined = f"{question} {screen_text}"
    return bool(CALENDAR_Q.search(combined)) or find_festival_in_text(combined) is not None


def calendar_facts(question: str, screen_text: str, place: dict) -> tuple[str, str, str, str, str]:
    """FACTS for the model, plus when_text, when_note, date_str, place_key.

    Empty facts when the question is not about the calendar. Never raises: a
    calculation failure means no FACTS, and the model is told it cannot
    calculate that yet.
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
    facts = (
        f"FACTS (calculated for {label}; use exactly as given, never change or add to them):\n"
        f"{today_line}\n{sky_line}"
        + (f"\n{fest_line}" if fest_line else "")
    )
    return facts, when_text, when_note, date_str, place_key
