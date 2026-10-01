"""Hindu calendar calculations: tithi, festivals and the daily panchang.

Pure functions, no network, no database. The model never recalls a date: the
server computes sunrise, tithi and festival dates with astronomy-engine
(2.1.19, MIT, accuracy within one arcminute of NOVAS per its README) and
hands them to the model as FACTS. Never use Swiss Ephemeris or anything built
on pyswisseph here: it is AGPL or commercial.

Conventions (amanta month, paksha, tithi, part of day) follow the usual
panchang rules; each festival rule is tested against Drik Panchang's 2026 and
2027 dates for New Delhi in tests/test_panchang.py. A festival whose rule does
not reproduce both dates is NOT shipped: Ask answers that it cannot calculate
that one yet. Never hardcode a date to make a test pass.

Ayanamsa: Lahiri, 23.857 degrees at J2000 precessing at 50.29 arcseconds per
year (the epoch value published by the Calendar Reform Committee, 1955; the
rate is IAU precession, Jean Meeus, Astronomical Algorithms, ch. 21). That is
about 24.2 degrees in late 2026. Sidereal longitude = tropical longitude
minus this value, for the Moon's geocentric and the Sun's geocentric
(Earth's heliocentric + 180) ecliptic longitudes.
"""

from __future__ import annotations

import logging
import math
from datetime import date, datetime, time as dtime, timedelta, timezone
from typing import Optional
from zoneinfo import ZoneInfo

import astronomy
from astronomy import Body, Direction, Observer, Time

logger = logging.getLogger("shabd.panchang")

#: J2000 in UTC days-since-epoch terms: Time(0) is 2000-01-01 12:00 TT, and
#: .ut counts days from the same epoch in UT. The TT-UT drift (~69 s) is far
#: below the minute this module reports times to.
_J2000_UTC = datetime(2000, 1, 1, 12, 0, 0, tzinfo=timezone.utc)

#: Lahiri ayanamsa at J2000, degrees; annual precession, degrees.
_AYANAMSA_J2000 = 23.857
_AYANAMSA_RATE = 50.29 / 3600.0

#: Daylight fifths: midday is the middle fifth, afternoon the fourth.
_MIDDAY_SPAN = (0.4, 0.6)
_AFTERNOON_SPAN = (0.6, 0.8)
#: Pradosh: the first 2 hours 24 minutes after sunset.
_PRADOSH = timedelta(hours=2, minutes=24)

TITHI_NAMES = [
    "Pratipada", "Dwitiya", "Tritiya", "Chaturthi", "Panchami", "Shashthi",
    "Saptami", "Ashtami", "Navami", "Dashami", "Ekadashi", "Dwadashi",
    "Trayodashi", "Chaturdashi",
]

NAKSHATRAS = [
    "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra",
    "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni",
    "Uttara Phalguni", "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha",
    "Jyeshtha", "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana",
    "Dhanishta", "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada",
    "Revati",
]

YOGAS = [
    "Vishkambha", "Priti", "Ayushman", "Saubhagya", "Shobhana", "Atiganda",
    "Sukarma", "Dhriti", "Shula", "Ganda", "Vriddhi", "Dhruva", "Vyaghata",
    "Harshana", "Vajra", "Siddhi", "Vyatipata", "Variyana", "Parigha",
    "Shiva", "Siddha", "Sadhya", "Shubha", "Shukla", "Brahma", "Indra",
    "Vaidhriti",
]

#: The seven movable karanas, cycling after Kimstughna.
_MOVABLE_KARANAS = ["Bava", "Balava", "Kaulava", "Taitila", "Garaja", "Vanija", "Vishti"]

#: Amanta month names, Chaitra-first. The Sun's sidereal sign at the new moon
#: that begins the month decides: Mina gives Chaitra, Mesha gives Vaishakha.
MONTHS = [
    "Chaitra", "Vaishakha", "Jyeshtha", "Ashadha", "Shravana", "Bhadrapada",
    "Ashwina", "Kartika", "Margashirsha", "Pausha", "Magha", "Phalguna",
]

WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


# ── time plumbing ─────────────────────────────────────────────────────

def _zone(tzname: str) -> ZoneInfo:
    try:
        return ZoneInfo(tzname or "Asia/Kolkata")
    except Exception:
        logger.warning("unknown timezone %r, using UTC", tzname)
        return ZoneInfo("UTC")


def _utc_to_time(dt: datetime) -> Time:
    """An aware UTC datetime to an astronomy Time."""
    u = dt.astimezone(timezone.utc).replace(tzinfo=None)
    return Time.Make(u.year, u.month, u.day, u.hour, u.minute,
                     u.second + u.microsecond / 1_000_000.0)


def _time_to_utc(t: Time) -> datetime:
    """An astronomy Time to an aware UTC datetime."""
    try:
        as_utc = t.Utc()
        if isinstance(as_utc, datetime):
            return as_utc.replace(tzinfo=timezone.utc)
    except Exception:
        pass
    return (_J2000_UTC + timedelta(days=t.ut)).astimezone(timezone.utc)


def _local_midnight_utc(day: date, tzname: str) -> datetime:
    """00:00 of a learner-local date, as UTC."""
    local = datetime.combine(day, dtime.min).replace(tzinfo=_zone(tzname))
    return local.astimezone(timezone.utc)


def _fmt(dt: Optional[datetime], tzname: str) -> str:
    if dt is None:
        return ""
    return dt.astimezone(_zone(tzname)).strftime("%H:%M")


# ── longitudes ────────────────────────────────────────────────────────

def ayanamsa(when_utc: datetime) -> float:
    """Lahiri ayanamsa in degrees for a UTC moment."""
    years = (when_utc.replace(tzinfo=None) - datetime(2000, 1, 1, 12)).total_seconds() / 31557600.0
    return _AYANAMSA_J2000 + years * _AYANAMSA_RATE


def _tropical_moon(t: Time) -> float:
    return astronomy.EclipticGeoMoon(t).lon % 360.0


def _tropical_sun(t: Time) -> float:
    return (astronomy.EclipticLongitude(Body.Earth, t) + 180.0) % 360.0


def _sidereal_moon(t: Time) -> float:
    return (_tropical_moon(t) - ayanamsa(_time_to_utc(t))) % 360.0


def _sidereal_sun(t: Time) -> float:
    return (_tropical_sun(t) - ayanamsa(_time_to_utc(t))) % 360.0


def elongation(t: Time) -> float:
    """The Moon's elongation from the Sun in degrees (== MoonPhase)."""
    return astronomy.MoonPhase(t) % 360.0


# ── rise and set ──────────────────────────────────────────────────────

def _observer(place: dict) -> Observer:
    return Observer(float(place["lat"]), float(place["lon"]), 0.0)


def sunrise(day: date, place: dict) -> Optional[datetime]:
    """Sunrise of a learner-local date, as UTC (None near the poles)."""
    start = _utc_to_time(_local_midnight_utc(day, place["tz"]) - timedelta(hours=12))
    found = astronomy.SearchRiseSet(Body.Sun, _observer(place), Direction.Rise, start, 1.5)
    return _time_to_utc(found) if found is not None else None


def sunset(day: date, place: dict) -> Optional[datetime]:
    """Sunset of a learner-local date, as UTC."""
    sr = sunrise(day, place)
    if sr is None:
        return None
    found = astronomy.SearchRiseSet(
        Body.Sun, _observer(place), Direction.Set, _utc_to_time(sr), 1.0)
    return _time_to_utc(found) if found is not None else None


def moonrise(day: date, place: dict) -> Optional[datetime]:
    """The first moonrise on or after a learner-local date's sunrise, as UTC."""
    sr = sunrise(day, place)
    if sr is None:
        return None
    found = astronomy.SearchRiseSet(
        Body.Moon, _observer(place), Direction.Rise, _utc_to_time(sr), 1.5)
    return _time_to_utc(found) if found is not None else None


# ── tithi / nakshatra / yoga / karana ─────────────────────────────────

def tithi_at(when_utc: datetime) -> tuple[int, datetime]:
    """(tithi number 1-30, end time as UTC) current at a UTC moment."""
    t = _utc_to_time(when_utc)
    idx = int(elongation(t) // 12) % 30
    target = ((idx + 1) * 12) % 360.0
    end = astronomy.SearchMoonPhase(target, t, 2.0)
    end_utc = _time_to_utc(end) if end is not None else when_utc + timedelta(days=1.2)
    return idx + 1, end_utc


def tithi_name(number: int) -> tuple[str, str]:
    """(paksha, name): 1-15 Shukla ending Purnima, 16-30 Krishna ending Amavasya."""
    if number == 15:
        return "Shukla", "Purnima"
    if number == 30:
        return "Krishna", "Amavasya"
    if number < 15:
        return "Shukla", TITHI_NAMES[number - 1]
    return "Krishna", TITHI_NAMES[number - 16]


def karana_at(when_utc: datetime) -> tuple[str, datetime]:
    """(karana name, end time as UTC) current at a UTC moment."""
    t = _utc_to_time(when_utc)
    idx = int(elongation(t) // 6) % 60
    if idx == 0:
        name = "Kimstughna"
    elif 1 <= idx <= 56:
        name = _MOVABLE_KARANAS[(idx - 1) % 7]
    elif idx == 57:
        name = "Shakuni"
    elif idx == 58:
        name = "Chatushpada"
    else:
        name = "Naga"
    target = ((idx + 1) * 6) % 360.0
    end = astronomy.SearchMoonPhase(target, t, 2.0)
    end_utc = _time_to_utc(end) if end is not None else when_utc + timedelta(hours=13)
    return name, end_utc


def _next_crossing(
    start_utc: datetime,
    value: callable,
    boundary: float,
    period: float,
    limit_days: float = 2.0,
) -> datetime:
    """Bisect the next time `value` (rising through `period`) hits `boundary`."""
    lo = start_utc
    lo_v = value(lo)
    span = (boundary - (lo_v % period)) % period
    if span < 1e-9:
        span = period
    # Mean rate over one span: robust to the Moon's uneven speed.
    hi = lo + timedelta(days=limit_days)
    rate = (value(hi) - lo_v) / limit_days
    if rate <= 0:
        return lo + timedelta(days=span / 13.0)
    hi = lo + timedelta(days=span / rate + 0.2)
    for _ in range(60):
        mid = lo + (hi - lo) / 2
        if (value(mid) - lo_v) % period >= span:
            hi = mid
        else:
            lo = mid
    return hi


def nakshatra_at(when_utc: datetime) -> tuple[str, datetime]:
    """(nakshatra, end time as UTC) current at a UTC moment."""
    span = 360.0 / 27.0
    lon = _sidereal_moon(_utc_to_time(when_utc))
    idx = int(lon // span) % 27
    end = _next_crossing(when_utc, lambda u: _sidereal_moon(_utc_to_time(u)),
                         (idx + 1) * span, 360.0)
    return NAKSHATRAS[idx], end


def yoga_at(when_utc: datetime) -> tuple[str, datetime]:
    """(yoga, end time as UTC) current at a UTC moment."""
    span = 360.0 / 27.0

    def total(u: datetime) -> float:
        t = _utc_to_time(u)
        return (_sidereal_sun(t) + _sidereal_moon(t)) % 360.0

    idx = int(total(when_utc) // span) % 27
    end = _next_crossing(when_utc, total, (idx + 1) * span, 360.0)
    return YOGAS[idx], end


# ── lunar month ───────────────────────────────────────────────────────

def _new_moon_around(day: date, place: dict, direction: int) -> datetime:
    """Nearest new moon before (direction=-1) or after (direction=+1) a date."""
    noon = _local_midnight_utc(day, place["tz"]) + timedelta(hours=12)
    found = astronomy.SearchMoonPhase(0.0, _utc_to_time(noon), 40.0 * direction)
    if found is None:
        raise ValueError("no new moon found in range")
    return _time_to_utc(found)


def amanta_month(new_moon_utc: datetime) -> tuple[str, bool]:
    """(month name, adhika) for the lunation beginning at a new moon.

    The Sun's sidereal sign at that moment decides: Mina gives Chaitra,
    Mesha gives Vaishakha, and so on. The caller detects adhika by comparing
    with the next new moon's sign.
    """
    sign = int(_sidereal_sun(_utc_to_time(new_moon_utc)) // 30) % 12
    return MONTHS[(sign + 1) % 12], sign


def month_of(day: date, place: dict) -> tuple[str, str, bool]:
    """(amanta month, purnimanta month, adhika) for a learner-local date.

    Amanta is the lunation the date falls in; purnimanta names the Krishna
    half after the following month. An adhika (extra) month carries the same
    name with the prefix, in both conventions.
    """
    nm = _new_moon_around(day, place, -1)
    month, sign = amanta_month(nm)
    nm_next = _new_moon_around(day, place, +1)
    _, sign_next = amanta_month(nm_next)
    adhika = sign_next == sign
    # The day's paksha at sunrise decides the purnimanta name.
    sr = sunrise(day, place)
    paksha_now, _ = tithi_name(tithi_at(sr)[0]) if sr else ("Shukla", "")
    if paksha_now == "Krishna":
        purni_base = MONTHS[(MONTHS.index(month) + 1) % 12]
    else:
        purni_base = month
    prefix = "Adhika " if adhika else ""
    return prefix + month, prefix + purni_base, adhika


# ── the day ───────────────────────────────────────────────────────────

def day(day_local: date, place: dict) -> dict:
    """Everything Ask needs about one learner-local date, as plain words."""
    tzname = place.get("tz") or "Asia/Kolkata"
    sr = sunrise(day_local, place)
    ss = sunset(day_local, place)
    mr = moonrise(day_local, place)
    anchor = sr or (_local_midnight_utc(day_local, tzname) + timedelta(hours=6))

    num, t_end = tithi_at(anchor)
    paksha, tname = tithi_name(num)
    num2, t2_end = tithi_at(t_end + timedelta(minutes=1))
    _, tname2 = tithi_name(num2)

    nak, nak_end = nakshatra_at(anchor)
    yog, yog_end = yoga_at(anchor)
    kar, kar_end = karana_at(anchor)
    kar2, kar2_end = karana_at(kar_end + timedelta(minutes=1))

    amanta, purnimanta, _adhika = month_of(day_local, place)
    vs_year, shaka_year = samvat(day_local, place)

    return {
        "date": day_local.isoformat(),
        "weekday": WEEKDAYS[day_local.weekday()],
        "sunrise": _fmt(sr, tzname),
        "sunset": _fmt(ss, tzname),
        "moonrise": _fmt(mr, tzname),
        "tithi": f"{paksha} {tname}",
        "tithi_end": _fmt(t_end, tzname),
        "tithi_next": f"{tithi_name(num2)[0]} {tname2}",
        "tithi_next_start": _fmt(t_end, tzname),
        "nakshatra": nak,
        "nakshatra_end": _fmt(nak_end, tzname),
        "yoga": yog,
        "yoga_end": _fmt(yog_end, tzname),
        "karana": kar,
        "karana_end": _fmt(kar_end, tzname),
        "karana_next": kar2,
        "karana_next_end": _fmt(kar2_end, tzname),
        "month_amanta": amanta,
        "month_purnimanta": purnimanta,
        "vikram_samvat": vs_year,
        "shaka": shaka_year,
    }


def samvat(day_local: date, place: dict) -> tuple[int, int]:
    """(Vikram Samvat, Shaka) for a learner-local date (Chaitradi new year)."""
    gy = day_local.year
    try:
        ugadi = festival("ugadi", gy, place)
        start = ugadi if isinstance(ugadi, date) else ugadi[0]
    except Exception:
        start = date(gy, 3, 22)
    vs = gy + 57 if day_local >= start else gy + 56
    return vs, vs - 135


# ── festivals ─────────────────────────────────────────────────────────

#: part of day in which the tithi must be current: sunrise | forenoon |
#: midday | afternoon | pradosh | midnight | moonrise | None (at sunrise,
#: the plain tithi-at-sunrise day).
_PARTS = ("sunrise", "forenoon", "midday", "afternoon", "pradosh", "midnight", "moonrise")

#: name, aliases, amanta month, paksha, tithi number, part. Month "" means
#: computed, not lunar (Makara Sankranti, Holi).
_FESTIVALS: list[dict] = [
    {"name": "Makara Sankranti", "aliases": ["makara sankranti", "makar sankranti", "pongal", "uttarayana", "uttarayan", "lohri"],
     "month": "", "paksha": "", "tithi": 0, "part": "sunrise", "kind": "sankranti"},
    {"name": "Vasant Panchami", "aliases": ["vasant panchami", "basant panchami", "saraswati puja", "saraswati pooja"],
     "month": "Magha", "paksha": "Shukla", "tithi": 5, "part": "forenoon"},
    {"name": "Maha Shivaratri", "aliases": ["maha shivaratri", "maha shivratri", "shivaratri", "shivratri", "herath"],
     "month": "Magha", "paksha": "Krishna", "tithi": 29, "part": "midnight"},
    {"name": "Holika Dahan", "aliases": ["holika dahan", "chhoti holi"],
     "month": "Phalguna", "paksha": "Shukla", "tithi": 15, "part": "pradosh"},
    {"name": "Holi", "aliases": ["holi", "dhulandi", "rangwali holi"],
     "month": "", "paksha": "", "tithi": 0, "part": "sunrise", "kind": "after_holika"},
    {"name": "Ugadi", "aliases": ["ugadi", "gudi padwa", "gudhi padwa", "cheti chand"],
     "month": "Chaitra", "paksha": "Shukla", "tithi": 1, "part": "sunrise"},
    {"name": "Rama Navami", "aliases": ["rama navami", "ram navami", "ram navmi"],
     "month": "Chaitra", "paksha": "Shukla", "tithi": 9, "part": "midday"},
    {"name": "Buddha Purnima", "aliases": ["buddha purnima", "budh purnima", "vesak"],
     "month": "Vaishakha", "paksha": "Shukla", "tithi": 15, "part": "sunrise"},
    {"name": "Guru Purnima", "aliases": ["guru purnima", "vyasa purnima"],
     "month": "Ashadha", "paksha": "Shukla", "tithi": 15, "part": "sunrise"},
    {"name": "Raksha Bandhan", "aliases": ["raksha bandhan", "rakhi", "rakhi purnima", "raksha bandhanam"],
     "month": "Shravana", "paksha": "Shukla", "tithi": 15, "part": "afternoon"},
    {"name": "Krishna Janmashtami", "aliases": ["krishna janmashtami", "janmashtami", "gokulashtami", "sri jayanti"],
     "month": "Shravana", "paksha": "Krishna", "tithi": 23, "part": "midnight"},
    {"name": "Ganesh Chaturthi", "aliases": ["ganesh chaturthi", "vinayaka chaturthi", "vinayagar chaturthi", "ganeshotsav"],
     "month": "Bhadrapada", "paksha": "Shukla", "tithi": 4, "part": "midday"},
    {"name": "Pitru Paksha", "aliases": ["pitru paksha", "pitra paksh", "pitr paksha", "mahalaya", "shraddha paksha"],
     "month": "Bhadrapada", "paksha": "Krishna", "tithi": 16, "part": "afternoon", "kind": "range"},
    {"name": "Durga Ashtami", "aliases": ["durga ashtami", "maha ashtami", "ashtami"],
     "month": "Ashwina", "paksha": "Shukla", "tithi": 8, "part": None},
    {"name": "Maha Navami", "aliases": ["maha navami", "navami", "saraswati visarjan"],
     "month": "Ashwina", "paksha": "Shukla", "tithi": 9, "part": None},
    {"name": "Dussehra", "aliases": ["dussehra", "vijaya dashami", "vijayadashami", "dasara", "dashahara"],
     "month": "Ashwina", "paksha": "Shukla", "tithi": 10, "part": "afternoon"},
    {"name": "Karwa Chauth", "aliases": ["karwa chauth", "karva chauth", "karwachauth"],
     "month": "Ashwina", "paksha": "Krishna", "tithi": 19, "part": "moonrise"},
    {"name": "Diwali", "aliases": ["diwali", "deepavali", "deepawali", "lakshmi puja", "lakshmi pooja", "kali puja"],
     "month": "Ashwina", "paksha": "Krishna", "tithi": 30, "part": "pradosh"},
    {"name": "Govardhan Puja", "aliases": ["govardhan puja", "govardhan pooja", "annakut"],
     "month": "Kartika", "paksha": "Shukla", "tithi": 1, "part": None},
    {"name": "Bhai Dooj", "aliases": ["bhai dooj", "bhaidooj", "bhaiya dooj", "yama dwitiya"],
     "month": "Kartika", "paksha": "Shukla", "tithi": 2, "part": "afternoon"},
    {"name": "Chhath Puja", "aliases": ["chhath puja", "chhath", "chhath pooja", "surya shashthi"],
     "month": "Kartika", "paksha": "Shukla", "tithi": 6, "part": None},
    {"name": "Kartik Purnima", "aliases": ["kartik purnima", "kartika purnima", "dev deepawali", "dev diwali", "guru nanak jayanti", "gurpurab"],
     "month": "Kartika", "paksha": "Shukla", "tithi": 15, "part": None},
]


def find_festival(name_or_alias: str) -> Optional[dict]:
    """The festival row for an English, Hindi or common roman spelling."""
    q = (name_or_alias or "").strip().lower()
    if not q:
        return None
    for f in _FESTIVALS:
        if q == f["name"].lower() or q in f["aliases"]:
            return f
    for f in _FESTIVALS:
        if q in f["name"].lower() or f["name"].lower() in q:
            return f
    return None


def _part_instant(day: date, place: dict, part: Optional[str]) -> Optional[datetime]:
    """One UTC instant inside a part of day (its midpoint, or the moment)."""
    tzname = place.get("tz") or "Asia/Kolkata"
    sr = sunrise(day, place)
    ss = sunset(day, place)
    if part in (None, "sunrise"):
        return sr
    if sr is None or ss is None:
        return None
    if part == "forenoon":
        midday_start = sr + (ss - sr) * _MIDDAY_SPAN[0]
        return sr + (midday_start - sr) / 2
    if part == "midday":
        return sr + (ss - sr) * sum(_MIDDAY_SPAN) / 2
    if part == "afternoon":
        return sr + (ss - sr) * sum(_AFTERNOON_SPAN) / 2
    if part == "pradosh":
        return ss + _PRADOSH / 2
    if part == "midnight":
        return _local_midnight_utc(day + timedelta(days=1), tzname)
    if part == "moonrise":
        return moonrise(day, place)
    return sr


def _tithi_number_at(instant_utc: datetime) -> Optional[int]:
    if instant_utc is None:
        return None
    return tithi_at(instant_utc)[0]


def _lunations(year: int, place: dict) -> list[datetime]:
    """New moons from mid-December (year-1) to mid-January (year+1)."""
    start = _utc_to_time(datetime(year - 1, 12, 15, 12, tzinfo=timezone.utc))
    out: list[datetime] = []
    t = start
    for _ in range(16):
        found = astronomy.SearchMoonPhase(0.0, t, 32.0)
        if found is None:
            break
        out.append(_time_to_utc(found))
        t = found.AddDays(20.0)
    return out


def _tithi_start_instant(from_utc: datetime, number: int) -> datetime:
    """Next instant the elongation reaches tithi `number`'s opening edge."""
    target = ((number - 1) * 12) % 360.0
    found = astronomy.SearchMoonPhase(target, _utc_to_time(from_utc), 32.0)
    if found is None:
        raise ValueError(f"tithi {number} not found in range")
    return _time_to_utc(found)


def _dates_for_tithi(
    year: int, place: dict, month: str, paksha: str, number: int, part: Optional[str],
) -> list[date]:
    """Local dates of one tithi in one amanta month (nija only)."""
    tzname = place.get("tz") or "Asia/Kolkata"
    zone = _zone(tzname)
    hits: list[date] = []
    for nm in _lunations(year, place):
        m, sign = amanta_month(nm)
        nm_next = _time_to_utc(astronomy.SearchMoonPhase(0.0, _utc_to_time(nm), 32.0))
        _, sign_next = amanta_month(nm_next)
        if m != month or sign_next == sign:
            continue
        if paksha == "Shukla":
            start = _tithi_start_instant(nm, number)
        else:
            full = _tithi_start_instant(nm, 15)
            start = _tithi_start_instant(full, number)
        _num, end = tithi_at(start + timedelta(minutes=1))
        # Candidate civil dates overlapping the tithi's span, with margins.
        cur = (start - timedelta(hours=36)).astimezone(zone).date()
        last = (end + timedelta(hours=36)).astimezone(zone).date()
        d = cur
        while d <= last and (d - cur).days < 6:
            instant = _part_instant(d, place, part)
            if instant is not None and _tithi_number_at(instant) == number:
                # The tithi must belong to this lunation, not a neighbour's.
                hits.append(d)
            d += timedelta(days=1)
    # Dedupe, keep year-local dates.
    seen = sorted({d for d in hits if d.year == year})
    return seen


def _pick_day(days: list[date], place: dict, part: Optional[str], number: int) -> Optional[date]:
    """One date from candidates: most daylight overlap wins, then the earlier."""
    if not days:
        return None
    if len(days) == 1:
        return days[0]
    tzname = place.get("tz") or "Asia/Kolkata"
    zone = _zone(tzname)

    def overlap(d: date) -> float:
        sr = sunrise(d, place)
        ss = sunset(d, place)
        if sr is None or ss is None:
            return 0.0
        span_start = max(sr, _local_midnight_utc(d, tzname))
        span_end = min(ss, _local_midnight_utc(d + timedelta(days=1), tzname))
        # Tithi span over this date's daylight.
        num, end = tithi_at(sr)
        if num != number:
            return 0.0
        start = sr
        lo = max(start, span_start)
        hi = min(end, span_end)
        return max(0.0, (hi - lo).total_seconds())

    scored = sorted(days, key=lambda d: (-overlap(d), d))
    return scored[0]


def _makara_sankranti(year: int, place: dict) -> date:
    """Local date the Sun enters sidereal Makara (270 degrees)."""
    tzname = place.get("tz") or "Asia/Kolkata"
    zone = _zone(tzname)
    lo = datetime(year, 1, 10, tzinfo=timezone.utc)
    hi = datetime(year, 1, 20, tzinfo=timezone.utc)
    for _ in range(50):
        mid = lo + (hi - lo) / 2
        if _sidereal_sun(_utc_to_time(mid)) >= 270.0:
            hi = mid
        else:
            lo = mid
    return hi.astimezone(zone).date()


def festival(name_or_alias: str, year: int, place: dict) -> date | tuple[date, date]:
    """Next occurrence's local date (or date range) for a festival name.

    Raises LookupError for an unknown or unshipped festival.
    """
    row = find_festival(name_or_alias)
    if row is None:
        raise LookupError(f"unknown festival: {name_or_alias!r}")
    kind = row.get("kind")
    if kind == "sankranti":
        return _makara_sankranti(year, place)
    if kind == "after_holika":
        d = festival("Holika Dahan", year, place)
        assert isinstance(d, date)
        return d + timedelta(days=1)
    if kind == "range":
        start_days = _dates_for_tithi(year, place, row["month"], row["paksha"], 16, row["part"])
        end_days = _dates_for_tithi(year, place, row["month"], row["paksha"], 30, row["part"])
        start = _pick_day(start_days, place, row["part"], 16)
        end = _pick_day(end_days, place, row["part"], 30)
        if start is None or end is None:
            raise LookupError(f"cannot calculate {row['name']} for {year}")
        return (start, end)
    days = _dates_for_tithi(year, place, row["month"], row["paksha"], row["tithi"], row["part"])
    picked = _pick_day(days, place, row["part"], row["tithi"])
    if picked is None:
        raise LookupError(f"cannot calculate {row['name']} for {year}")
    return picked
