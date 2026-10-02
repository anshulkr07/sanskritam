"""Golden values for the phone's calendar engine (mobile/src/kala/engine.ts).

The phone works out the tithi with the JavaScript build of the same
astronomy-engine release this server uses, so the Home card and an Ask answer
cannot disagree. This script asks the server engine (app/services/panchang.py)
about a spread of instants and writes what it says to
mobile/scripts/kala-fixtures.json. `node scripts/check-kala.mjs` in mobile/
then holds the phone's engine to those numbers.

Run it again only when panchang.py or the astronomy-engine pin changes:

    cd backend && ./.venv/Scripts/python.exe scripts/gen_kala_fixtures.py

Two things the server engine gets wrong are marked, not copied (both found
2026-10-01 while writing the phone port):

* ``_next_crossing`` falls back to a rough estimate when the value wraps past
  360 degrees inside its two-day window, so nakshatra and yoga end times are
  approximate there. Those rows carry ``"approx": true``.
* ``month_of`` names the dark half of an added month after the NEXT month
  (Adhika Ashadha for what is still Adhika Jyeshtha). Those rows carry
  ``"py_adhika_krishna": true``.
"""

from __future__ import annotations

import json
import os
import sys
from datetime import date, datetime, timedelta, timezone
from importlib import metadata

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services import panchang as p  # noqa: E402

OUT = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "mobile", "scripts", "kala-fixtures.json",
)

PLACES = {
    "New Delhi": {"lat": 28.6, "lon": 77.2, "tz": "Asia/Kolkata", "label": "New Delhi"},
    "Mumbai": {"lat": 19.1, "lon": 72.9, "tz": "Asia/Kolkata", "label": "Mumbai"},
    "Ahmedabad": {"lat": 23.0, "lon": 72.6, "tz": "Asia/Kolkata", "label": "Ahmedabad"},
    "Chennai": {"lat": 13.1, "lon": 80.3, "tz": "Asia/Kolkata", "label": "Chennai"},
    "Kochi": {"lat": 10.0, "lon": 76.3, "tz": "Asia/Kolkata", "label": "Kochi"},
    "Kolkata": {"lat": 22.6, "lon": 88.4, "tz": "Asia/Kolkata", "label": "Kolkata"},
}
DELHI = PLACES["New Delhi"]


def iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.") + f"{dt.microsecond // 1000:03d}Z"


def wraps(value, start: datetime) -> bool:
    """True when _next_crossing takes its rough fallback from this start."""
    return value(start + timedelta(days=2.0)) - value(start) <= 0


def sid_moon(u: datetime) -> float:
    return p._sidereal_moon(p._utc_to_time(u))


def sid_sun(u: datetime) -> float:
    return p._sidereal_sun(p._utc_to_time(u))


def yoga_total(u: datetime) -> float:
    return (sid_sun(u) + sid_moon(u)) % 360.0


def instant_row(u: datetime) -> dict:
    t = p._utc_to_time(u)
    num, t_end = p.tithi_at(u)
    nak, nak_end = p.nakshatra_at(u)
    yog, yog_end = p.yoga_at(u)
    kar, kar_end = p.karana_at(u)
    return {
        "at": iso(u),
        "elongation": round(p.elongation(t), 6),
        "sidereal_sun": round(p._sidereal_sun(t), 6),
        "sidereal_moon": round(p._sidereal_moon(t), 6),
        "ayanamsa": round(p.ayanamsa(u), 8),
        "tithi": num,
        "tithi_end": iso(t_end),
        "nakshatra": p.NAKSHATRAS.index(nak),
        "nakshatra_end": iso(nak_end),
        "nakshatra_approx": wraps(sid_moon, u),
        "yoga": p.YOGAS.index(yog),
        "yoga_end": iso(yog_end),
        "yoga_approx": wraps(yoga_total, u),
        "karana": kar,
        "karana_end": iso(kar_end),
    }


def main() -> None:
    instants = []
    base = datetime(2024, 1, 3, 1, 17, 0, tzinfo=timezone.utc)
    for i in range(180):
        instants.append(instant_row(base + timedelta(days=16.3741 * i)))
    # The mock's own moment and its neighbours.
    for u in (
        datetime(2026, 10, 1, 4, 10, tzinfo=timezone.utc),
        datetime(2026, 10, 1, 7, 6, 30, tzinfo=timezone.utc),
        datetime(2026, 10, 3, 2, 30, tzinfo=timezone.utc),
        datetime(2026, 10, 4, 0, 10, tzinfo=timezone.utc),
        datetime(2026, 10, 10, 16, 0, tzinfo=timezone.utc),
    ):
        instants.append(instant_row(u))

    months = []
    d = date(2026, 1, 5)
    while d <= date(2027, 6, 1):
        sr = p.sunrise(d, DELHI)
        amanta, purnimanta, adhika = p.month_of(d, DELHI)
        num = p.tithi_at(sr)[0]
        months.append({
            "date": d.isoformat(),
            "sunrise": iso(sr),
            "tithi_at_sunrise": num,
            "amanta": amanta,
            "purnimanta": purnimanta,
            "adhika": adhika,
            "py_adhika_krishna": bool(adhika and num > 15),
        })
        d += timedelta(days=9)

    rise = []
    for label, place in PLACES.items():
        for dd in (date(2026, 1, 14), date(2026, 3, 19), date(2026, 6, 21),
                   date(2026, 10, 1), date(2026, 12, 21), date(2027, 4, 7)):
            sr = p.sunrise(dd, place)
            ss = p.sunset(dd, place)
            rise.append({
                "place": label, "lat": place["lat"], "lon": place["lon"],
                "date": dd.isoformat(), "sunrise": iso(sr), "sunset": iso(ss),
            })

    out = {
        "generated_by": "backend/scripts/gen_kala_fixtures.py",
        "generated_on": date.today().isoformat(),
        "astronomy_engine": metadata.version("astronomy-engine"),
        # Drik Panchang, New Delhi, 1 October 2026 (read 2026-10-01): the same
        # fixture tests/test_panchang.py holds the server to. Clock times are
        # Asia/Kolkata. Tolerances are that test's.
        "drik": {
            "place": {"lat": 28.6139, "lon": 77.2090, "tz": "Asia/Kolkata"},
            "date": "2026-10-01",
            "sunrise": "06:14", "sunset": "18:07",
            "tithi": 20, "tithi_end": "12:35", "tithi_next": 21,
            "nakshatra": "Rohini", "nakshatra_end": "04:27",
            "yoga": "Siddhi", "yoga_end": "21:18",
            "karana": "Taitila", "karana_end": "12:35",
            "karana_next": "Garaja", "karana_next_end": "23:24",
            "amanta": "Bhadrapada", "purnimanta": "Ashwina",
            "vikram_samvat": 2083, "shaka": 1948,
            "tolerance_minutes": {"sun": 2, "tithi": 2, "other": 3},
        },
        # Drik Panchang, New Delhi (geoname 1261481), one day page per weekday,
        # read 2026-10-01. `weekday` counts from Sunday = 0. Each stretch is
        # [start, end] on the clock in Asia/Kolkata. Abhijit is "None" on the
        # Wednesday page.
        "drik_week": [
            {"date": "2026-10-01", "weekday": 4, "sunrise": "06:14", "sunset": "18:07",
             "rahu": ["13:40", "15:09"], "yamaganda": ["06:14", "07:43"], "gulika": ["09:12", "10:41"],
             "brahma": ["04:37", "05:26"], "abhijit": ["11:47", "12:34"], "tithi_at_sunrise": 20},
            {"date": "2026-10-02", "weekday": 5, "sunrise": "06:14", "sunset": "18:06",
             "rahu": ["10:41", "12:10"], "yamaganda": ["15:08", "16:37"], "gulika": ["07:43", "09:12"],
             "brahma": ["04:37", "05:26"]},
            {"date": "2026-10-03", "weekday": 6, "sunrise": "06:15", "sunset": "18:05",
             "rahu": ["09:12", "10:41"], "yamaganda": ["13:39", "15:07"], "gulika": ["06:15", "07:44"],
             "brahma": ["04:38", "05:26"], "tithi_at_sunrise": 22},
            {"date": "2026-10-04", "weekday": 0, "sunrise": "06:15", "sunset": "18:04",
             "rahu": ["16:35", "18:04"], "yamaganda": ["12:10", "13:38"], "gulika": ["15:07", "16:35"],
             "brahma": ["04:38", "05:27"], "tithi_at_sunrise": 24},
            {"date": "2026-10-05", "weekday": 1, "sunrise": "06:16", "sunset": "18:03",
             "rahu": ["07:44", "09:13"], "yamaganda": ["10:41", "12:09"], "gulika": ["13:38", "15:06"],
             "brahma": ["04:38", "05:27"]},
            {"date": "2026-10-06", "weekday": 2, "sunrise": "06:17", "sunset": "18:01",
             "rahu": ["15:05", "16:33"], "yamaganda": ["09:13", "10:41"], "gulika": ["12:09", "13:37"],
             "brahma": ["04:39", "05:28"], "tithi_at_sunrise": 26},
            {"date": "2026-10-07", "weekday": 3, "sunrise": "06:17", "sunset": "18:00",
             "rahu": ["12:09", "13:37"], "yamaganda": ["07:45", "09:13"], "gulika": ["10:41", "12:09"],
             "brahma": ["04:39", "05:28"], "abhijit": None},
        ],
        # Drik Panchang's regional day pages (Tamil for Chennai, Malayalam for
        # Cochin, Bengali for Kolkata, Gujarati for Ahmedabad), read
        # 2026-10-01. `sign` is the Sun's sign of the solar month, 0 = Mesha.
        # The dates are chosen so the three month-start rules disagree.
        "drik_regional": [
            {"tradition": "tamil", "date": "2026-01-14", "sign": 9, "day": 1, "says": "01, Thai"},
            {"tradition": "tamil", "date": "2026-10-01", "sign": 5, "day": 15, "says": "15, Purattaasi"},
            {"tradition": "tamil", "date": "2026-10-18", "sign": 6, "day": 1, "says": "01, Aippasi"},
            {"tradition": "kerala", "date": "2026-01-14", "sign": 8, "day": 30, "year": 1201, "says": "30, Dhanu; 1201 Kollam Era"},
            {"tradition": "kerala", "date": "2026-10-01", "sign": 5, "day": 15, "year": 1202, "says": "15, Kanni; 1202 Kollam Era"},
            {"tradition": "kerala", "date": "2026-10-18", "sign": 6, "day": 1, "year": 1202, "says": "01, Thulam"},
            {"tradition": "bengal", "date": "2026-04-15", "sign": 0, "day": 1, "year": 1433, "says": "01, Boishakh; 1433 Bengali Era"},
            {"tradition": "bengal", "date": "2026-10-01", "sign": 5, "day": 14, "year": 1433, "says": "14, Ashshin; 1433 Bengali Era"},
            {"tradition": "bengal", "date": "2026-10-18", "sign": 6, "day": 1, "year": 1433, "says": "01, Kartik"},
        ],
        # Other things the same pages state, each used by one check.
        "drik_facts": {
            "gujarat_2026_10_01": {"month": 5, "tithi": 20, "year": 2082, "says": "20, Bhadarvo; Vad, Pancham; 2082 Vikrama Samvata"},
            "years_2026_10_01": {"vikrama": 2083, "shaka": 1948, "gujarati": 2082, "kali": 5127},
            "kali_2026_01_14": 5126,
            "ritu": [{"date": "2026-10-01", "ritu": 2, "says": "Vedic Ritu Varsha"},
                     {"date": "2026-10-12", "ritu": 3, "says": "Vedic Ritu Sharad"}],
            "ayana_2026_10_01": 1,
            "kolkata_2026_10_04": {"sunrise": "05:29", "tithi_at_sunrise": 23, "says": "Ashtami upto 05:51 AM"},
            "chennai_2026_10_01": {"sunrise": "05:58", "nakshatra_at_sunrise": 2, "nakshatra_end": "06:02",
                                   "says": "Karthigai upto 06:02 AM, then Rohini"},
        },
        "nakshatras": p.NAKSHATRAS,
        "yogas": p.YOGAS,
        "months_order": p.MONTHS,
        "instants": instants,
        "months": months,
        "rise": rise,
    }
    with open(OUT, "w", encoding="utf-8", newline="\n") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
        f.write("\n")
    approx_n = sum(1 for r in instants if r["nakshatra_approx"])
    approx_y = sum(1 for r in instants if r["yoga_approx"])
    print(f"wrote {OUT}")
    print(f"  {len(instants)} instants ({approx_n} nakshatra and {approx_y} yoga ends are the engine's rough fallback)")
    print(f"  {len(months)} month rows ({sum(1 for m in months if m['py_adhika_krishna'])} in the dark half of an added month)")
    print(f"  {len(rise)} sunrise and sunset rows")


if __name__ == "__main__":
    main()
