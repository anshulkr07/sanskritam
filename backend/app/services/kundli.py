"""Birth charts by calculation: positions, lagna, houses, nakshatras, dashas.

Owner instruction 2026-10-05: "Let kundali go to any extent." Ask mode reads
a chart and predicts from it; it never works out a position, a sign, a house
or a dasha itself. Everything here is code, on the astronomy-engine that
services/panchang.py already uses (MIT). Never Swiss Ephemeris or anything
built on pyswisseph: it is AGPL or commercial.

Conventions, each written into the chart so a reading can name them:

* Sidereal zodiac, Lahiri ayanamsa (``panchang.ayanamsa``).
* Geocentric apparent longitudes on the true ecliptic of date: astronomy-
  engine's GeoVector with aberration, rotated from J2000 equator to the
  ecliptic of date. Checked 2026-10-05 against NASA JPL Horizons (observer
  table, quantity 31) for 1990-06-15 05:30 UT and 2026-10-05 06:30 UT: every
  planet within 0.005 degrees (tests/test_kundli.py keeps those figures).
* Rahu is the mean lunar node (Jean Meeus, Astronomical Algorithms, 47.7),
  Ketu the point opposite. Software differs here (mean or true node); the
  chart says which.
* Lagna: the ecliptic point rising in the east, from local apparent sidereal
  time and the mean obliquity (Meeus 22.2). Tested against a direct search of
  the eastern horizon.
* Houses: whole sign from the lagna's sign, as in Parashari practice. With no
  birth time the lagna is unknown, so houses are counted from the Moon's sign
  (chandra lagna) and the chart says so.
* Vimshottari dasha from the Moon's nakshatra, 120 years, years of 365.25
  days. Some almanacs use other year lengths; dates can differ by days.
* Navamsha (D9): each sign in nine parts of 3 degrees 20 minutes.

Pure functions: no network, no database. The birth details are used for the
calculation and are never stored or logged.
"""

from __future__ import annotations

import math
from datetime import date, datetime, timedelta, timezone
from typing import Optional

import astronomy
from astronomy import Body, Time

from app.services import panchang

NAK_SPAN = 360.0 / 27.0
PADA_SPAN = NAK_SPAN / 4.0
YEAR_DAYS = 365.25

#: Sign names: English, the app's Sanskrit stems (the same strings Kāla shows,
#: mobile/src/kala/sanskritNames.ts), and the common roman spelling used in
#: almanacs, which is what readers search for.
SIGN_EN = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra",
           "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"]
SIGN_SA = ["मेष", "वृषभ", "मिथुन", "कर्कट", "सिंह", "कन्या", "तुला",
           "वृश्चिक", "धनुस्", "मकर", "कुम्भ", "मीन"]
SIGN_ROMAN = ["Mesha", "Vrishabha", "Mithuna", "Karka", "Simha", "Kanya", "Tula",
              "Vrishchika", "Dhanu", "Makara", "Kumbha", "Meena"]
SIGN_LORD = ["Mars", "Venus", "Mercury", "Moon", "Sun", "Mercury", "Venus",
             "Mars", "Jupiter", "Saturn", "Saturn", "Jupiter"]

#: key, English, Sanskrit stem, astronomy body (None for the nodes).
GRAHAS: list[tuple[str, str, str, Optional[Body]]] = [
    ("sun", "Sun", "सूर्य", Body.Sun),
    ("moon", "Moon", "चन्द्र", Body.Moon),
    ("mars", "Mars", "मङ्गल", Body.Mars),
    ("mercury", "Mercury", "बुध", Body.Mercury),
    ("jupiter", "Jupiter", "गुरु", Body.Jupiter),
    ("venus", "Venus", "शुक्र", Body.Venus),
    ("saturn", "Saturn", "शनि", Body.Saturn),
    ("rahu", "Rahu", "राहु", None),
    ("ketu", "Ketu", "केतु", None),
]

#: Vimshottari: the nakshatra lords in order, and their years.
DASHA_ORDER = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"]
DASHA_YEARS = {"Ketu": 7, "Venus": 20, "Sun": 6, "Moon": 10, "Mars": 7,
               "Rahu": 18, "Jupiter": 16, "Saturn": 19, "Mercury": 17}

#: Exaltation sign (debilitation is the sign opposite) and own signs.
EXALTED = {"Sun": 0, "Moon": 1, "Mars": 9, "Mercury": 5, "Jupiter": 3, "Venus": 11, "Saturn": 6}
OWN = {"Sun": (4,), "Moon": (3,), "Mars": (0, 7), "Mercury": (2, 5),
       "Jupiter": (8, 11), "Venus": (1, 6), "Saturn": (9, 10)}

#: The houses the common Manglik rule counts, from the lagna, the Moon and
#: Venus. Traditions differ; the chart says which set was used.
MANGLIK_HOUSES = (1, 2, 4, 7, 8, 12)


# ── longitudes ────────────────────────────────────────────────────────

def _time(utc: datetime) -> Time:
    return panchang._utc_to_time(utc)


def tropical_longitude(body: Body, t: Time) -> float:
    """Geocentric apparent longitude on the true ecliptic of date, degrees."""
    vec = astronomy.GeoVector(body, t, True)
    ecl = astronomy.SphereFromVector(astronomy.RotateVector(astronomy.Rotation_EQJ_ECT(t), vec))
    return ecl.lon % 360.0


def mean_node(t: Time) -> float:
    """Longitude of the Moon's mean ascending node (Meeus 47.7), degrees."""
    T = t.tt / 36525.0
    om = (125.0445479 - 1934.1362891 * T + 0.0020754 * T * T
          + T ** 3 / 467441.0 - T ** 4 / 60616000.0)
    return om % 360.0


def mean_obliquity(t: Time) -> float:
    """Mean obliquity of the ecliptic (Meeus 22.2), degrees."""
    T = t.tt / 36525.0
    seconds = 21.448 - 46.8150 * T - 0.00059 * T * T + 0.001813 * T ** 3
    return 23.0 + 26.0 / 60.0 + seconds / 3600.0


def ascendant(t: Time, lat: float, lon: float) -> float:
    """Tropical longitude of the ecliptic point rising in the east, degrees."""
    lst = math.radians((astronomy.SiderealTime(t) * 15.0 + lon) % 360.0)
    eps = math.radians(mean_obliquity(t))
    phi = math.radians(lat)
    y = math.cos(lst)
    x = -(math.sin(lst) * math.cos(eps) + math.tan(phi) * math.sin(eps))
    return math.degrees(math.atan2(y, x)) % 360.0


def sidereal(tropical: float, utc: datetime) -> float:
    return (tropical - panchang.ayanamsa(utc)) % 360.0


def _signed_delta(a: float, b: float) -> float:
    """b - a in degrees, wrapped to (-180, 180]."""
    return ((b - a + 540.0) % 360.0) - 180.0


# ── naming ────────────────────────────────────────────────────────────

def sign_of(lon: float) -> int:
    return int(lon // 30.0) % 12


def dms(deg_in_sign: float) -> str:
    """12.5 -> 12°30'."""
    d = int(deg_in_sign)
    m = int(round((deg_in_sign - d) * 60))
    if m == 60:
        d, m = d + 1, 0
    return f"{d}°{m:02d}'"


def nakshatra_of(lon: float) -> tuple[int, int]:
    """(nakshatra index 0-26, pada 1-4) for a sidereal longitude."""
    idx = int(lon // NAK_SPAN) % 27
    pada = int((lon % NAK_SPAN) // PADA_SPAN) + 1
    return idx, min(pada, 4)


def navamsa_sign(lon: float) -> int:
    """D9 sign: each sign in nine parts; movable signs start from themselves,
    fixed from the ninth, dual from the fifth, which is one count of 108."""
    return int(lon * 9.0 // 30.0) % 12


def house_from(sign: int, first: int) -> int:
    """Whole-sign house of ``sign`` counted from ``first`` (1-12)."""
    return (sign - first) % 12 + 1


def dignity(name: str, sign: int) -> str:
    if name in EXALTED:
        if sign == EXALTED[name]:
            return "exalted"
        if sign == (EXALTED[name] + 6) % 12:
            return "debilitated"
        if sign in OWN[name]:
            return "own sign"
    return ""


def _place_point(lon: float) -> dict:
    s = sign_of(lon)
    nak, pada = nakshatra_of(lon)
    return {
        "lon": round(lon, 4),
        "sign": s,
        "sign_en": SIGN_EN[s],
        "sign_sa": SIGN_SA[s],
        "sign_roman": SIGN_ROMAN[s],
        "deg": dms(lon % 30.0),
        "nakshatra": panchang.NAKSHATRAS[nak],
        "pada": pada,
        "navamsa_en": SIGN_EN[navamsa_sign(lon)],
    }


# ── positions at one moment ───────────────────────────────────────────

def positions(utc: datetime) -> dict[str, dict]:
    """Sidereal positions of the nine grahas at a UTC moment, with retrograde
    flags (a planet whose longitude falls over the next day)."""
    t = _time(utc)
    t_next = _time(utc + timedelta(days=1))
    out: dict[str, dict] = {}
    for key, name, sa, body in GRAHAS:
        if body is not None:
            trop = tropical_longitude(body, t)
            moving = _signed_delta(trop, tropical_longitude(body, t_next))
            retro = body not in (Body.Sun, Body.Moon) and moving < 0
        elif key == "rahu":
            trop, retro = mean_node(t), True
        else:
            trop, retro = (mean_node(t) + 180.0) % 360.0, True
        point = _place_point(sidereal(trop, utc))
        point.update({"key": key, "name": name, "name_sa": sa, "retro": retro})
        out[key] = point
    return out


# ── Vimshottari dasha ─────────────────────────────────────────────────

def _years(n: float) -> timedelta:
    return timedelta(days=n * YEAR_DAYS)


def mahadashas(moon_lon: float, birth_utc: datetime, count: int = 10) -> list[dict]:
    """The mahadashas from the one running at birth, with UTC start and end."""
    idx = int(moon_lon // NAK_SPAN) % 27
    lord = DASHA_ORDER[idx % 9]
    done = (moon_lon % NAK_SPAN) / NAK_SPAN
    start = birth_utc - _years(done * DASHA_YEARS[lord])
    out: list[dict] = []
    i = DASHA_ORDER.index(lord)
    for _ in range(count):
        lord = DASHA_ORDER[i % 9]
        end = start + _years(DASHA_YEARS[lord])
        out.append({"lord": lord, "start": start, "end": end})
        start, i = end, i + 1
    return out


def antardashas(maha: dict) -> list[dict]:
    """The nine sub-periods of one mahadasha, starting with its own lord."""
    total = DASHA_YEARS[maha["lord"]]
    i = DASHA_ORDER.index(maha["lord"])
    start = maha["start"]
    out: list[dict] = []
    for k in range(9):
        lord = DASHA_ORDER[(i + k) % 9]
        end = start + _years(total * DASHA_YEARS[lord] / 120.0)
        out.append({"lord": lord, "start": start, "end": end})
        start = end
    return out


def running(periods: list[dict], when: datetime) -> Optional[dict]:
    for p in periods:
        if p["start"] <= when < p["end"]:
            return p
    return None


def _d(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).date().isoformat()


# ── the chart ─────────────────────────────────────────────────────────

class BirthError(ValueError):
    """Birth details that cannot make a chart."""


def birth_moment(day: str, clock: str, tz: str, time_known: bool = True) -> datetime:
    """The birth moment as an aware local datetime. Noon when the time is unknown."""
    try:
        d = date.fromisoformat((day or "").strip())
    except ValueError as exc:
        raise BirthError("birth date must be YYYY-MM-DD") from exc
    if d.year < 1900 or d > date.today() + timedelta(days=1):
        raise BirthError("birth date out of range")
    hh, mm = 12, 0
    if time_known:
        try:
            hh_s, mm_s = (clock or "").strip().split(":")[:2]
            hh, mm = int(hh_s), int(mm_s)
        except (ValueError, AttributeError) as exc:
            raise BirthError("birth time must be HH:MM") from exc
        if not (0 <= hh <= 23 and 0 <= mm <= 59):
            raise BirthError("birth time out of range")
    return datetime(d.year, d.month, d.day, hh, mm, tzinfo=panchang._zone(tz))


def chart(
    birth_local: datetime,
    lat: float,
    lon: float,
    *,
    time_known: bool = True,
    now: Optional[datetime] = None,
) -> dict:
    """Everything a reading needs, calculated. ``now`` (UTC) sets the running
    dasha and today's transits; it defaults to the present moment."""
    if not (-66.0 <= lat <= 66.0 and -180.0 <= lon <= 180.0):
        raise BirthError("birth place out of range")
    birth_utc = birth_local.astimezone(timezone.utc)
    now = (now or datetime.now(timezone.utc)).astimezone(timezone.utc)
    t = _time(birth_utc)

    grahas = positions(birth_utc)
    moon = grahas["moon"]

    lagna: Optional[dict] = None
    if time_known:
        lagna = _place_point(sidereal(ascendant(t, lat, lon), birth_utc))
        first, houses_rule = lagna["sign"], "whole sign from the lagna"
    else:
        first, houses_rule = moon["sign"], "whole sign from the Moon (birth time unknown)"

    planets = []
    for key, name, _sa, _body in GRAHAS:
        g = dict(grahas[key])
        g["house"] = house_from(g["sign"], first)
        g["dignity"] = dignity(name, g["sign"])
        planets.append(g)

    mds = mahadashas(moon["lon"], birth_utc)
    maha = running(mds, now)
    antar = running(antardashas(maha), now) if maha else None

    mars, venus = grahas["mars"]["sign"], grahas["venus"]["sign"]
    counted = {"moon": house_from(mars, moon["sign"]), "venus": house_from(mars, venus)}
    if lagna is not None:
        counted = {"lagna": house_from(mars, lagna["sign"]), **counted}
    manglik = {
        "houses_from": counted,
        "rule_houses": list(MANGLIK_HOUSES),
        "counts_from": [k for k, h in counted.items() if h in MANGLIK_HOUSES],
    }

    rahu = grahas["rahu"]["lon"]
    sides = {(grahas[k]["lon"] - rahu) % 360.0 < 180.0
             for k in ("sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn")}
    kaal_sarp = len(sides) == 1

    today = positions(now)
    sat_from_moon = house_from(today["saturn"]["sign"], moon["sign"])
    sade_sati = {12: "rising", 1: "peak", 2: "setting"}.get(sat_from_moon, "")
    dhaiya = {4: "4th", 8: "8th"}.get(sat_from_moon, "")

    return {
        "conventions": {
            "zodiac": "sidereal",
            "ayanamsa": "Lahiri",
            "ayanamsa_deg": round(panchang.ayanamsa(birth_utc), 3),
            "node": "mean",
            "houses": houses_rule,
            "dasha_year_days": YEAR_DAYS,
        },
        "time_known": time_known,
        "lagna": lagna,
        "planets": planets,
        "moon_sign_en": moon["sign_en"],
        "moon_sign_sa": moon["sign_sa"],
        "moon_sign_roman": moon["sign_roman"],
        "nakshatra": moon["nakshatra"],
        "pada": moon["pada"],
        "dasha": {
            "maha": {"lord": maha["lord"], "start": _d(maha["start"]), "end": _d(maha["end"])} if maha else None,
            "antar": {"lord": antar["lord"], "start": _d(antar["start"]), "end": _d(antar["end"])} if antar else None,
            "sequence": [{"lord": p["lord"], "start": _d(p["start"]), "end": _d(p["end"])} for p in mds],
        },
        "manglik": manglik,
        "kaal_sarp": kaal_sarp,
        "transits": {
            "date": _d(now),
            "planets": [{"name": today[k]["name"], "sign_en": today[k]["sign_en"],
                         "sign_roman": today[k]["sign_roman"], "retro": today[k]["retro"],
                         "house_from_moon": house_from(today[k]["sign"], moon["sign"])}
                        for k, _n, _s, _b in GRAHAS],
            "saturn_from_moon": sat_from_moon,
            "sade_sati": sade_sati,
            "dhaiya": dhaiya,
        },
    }


def facts_text(c: dict) -> str:
    """The chart as plain lines for the model, under a heading it must obey."""
    conv = c["conventions"]
    lines = [
        "CHART (calculated by the app for the person asking; use exactly as given, "
        "never change, add or recompute a position, sign, house, nakshatra or date):",
        f"- Zodiac: sidereal, {conv['ayanamsa']} ayanamsa {conv['ayanamsa_deg']} degrees. "
        f"Houses: {conv['houses']}. Rahu and Ketu: {conv['node']} node.",
    ]
    lg = c.get("lagna")
    if lg:
        lines.append(f"- Lagna (ascendant): {lg['sign_roman']} ({lg['sign_en']}) {lg['deg']}, "
                     f"{lg['nakshatra']} pada {lg['pada']}. Navamsha lagna: {lg['navamsa_en']}.")
    else:
        lines.append("- Lagna: unknown, because the birth time is unknown. Do not read the lagna "
                     "or house lords from the lagna; houses below count from the Moon.")
    for p in c["planets"]:
        extra = []
        if p.get("retro") and p["key"] not in ("rahu", "ketu"):
            extra.append("retrograde")
        if p.get("dignity"):
            extra.append(p["dignity"])
        tail = f", {', '.join(extra)}" if extra else ""
        lines.append(f"- {p['name']}: {p['sign_roman']} ({p['sign_en']}) {p['deg']}, house {p['house']}, "
                     f"{p['nakshatra']} pada {p['pada']}, navamsha {p['navamsa_en']}{tail}.")
    lines.append(f"- Moon sign (rashi): {c['moon_sign_roman']} ({c['moon_sign_en']}). "
                 f"Birth nakshatra: {c['nakshatra']} pada {c['pada']}.")
    d = c["dasha"]
    if d.get("maha"):
        m, a = d["maha"], d.get("antar")
        lines.append(f"- Vimshottari dasha now: {m['lord']} mahadasha {m['start']} to {m['end']}"
                     + (f", {a['lord']} antardasha {a['start']} to {a['end']}." if a else "."))
    upcoming = [p for p in d.get("sequence", []) if d.get("maha") and p["start"] >= d["maha"]["end"]][:4]
    if upcoming:
        lines.append("- Next mahadashas: " + "; ".join(f"{p['lord']} from {p['start']}" for p in upcoming) + ".")
    mg = c["manglik"]
    label = {"lagna": "the lagna", "moon": "the Moon", "venus": "Venus"}
    where = ", ".join(f"{h} from {label[k]}" for k, h in mg["houses_from"].items())
    counts = ", ".join(label[k] for k in mg["counts_from"]) or "none of them"
    lines.append(f"- Mars is in house {where}. The common Manglik rule counts houses "
                 f"{', '.join(str(h) for h in mg['rule_houses'])}; by it Mars counts from {counts}. "
                 "Traditions differ on the houses and on cancellations.")
    lines.append(f"- All seven planets on one side of the Rahu-Ketu axis (kaal sarp): {'yes' if c['kaal_sarp'] else 'no'}.")
    tr = c["transits"]
    moves = "; ".join(f"{p['name']} {p['sign_roman']}{' (R)' if p['retro'] and p['name'] not in ('Rahu', 'Ketu') else ''}"
                      f" house {p['house_from_moon']} from the Moon" for p in tr["planets"])
    lines.append(f"- Transits on {tr['date']} (sidereal): {moves}.")
    if tr["sade_sati"]:
        lines.append(f"- Saturn is {tr['saturn_from_moon']} from the Moon: sade sati, {tr['sade_sati']} phase.")
    elif tr["dhaiya"]:
        lines.append(f"- Saturn is in the {tr['dhaiya']} house from the Moon (dhaiya).")
    else:
        lines.append("- Sade sati: not running now.")
    lines.append("- Gun milan (matching two charts) is not calculated by the app yet.")
    return "\n".join(lines)
