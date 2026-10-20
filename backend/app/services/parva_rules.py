"""Parva observance rules: which days are kept, for one place.

Pure functions, no database, built on `panchang.py`. Nothing is moved out of
`panchang.py`; this module imports from it. `festival()` and `_FESTIVALS`
stay where they are for Ask.

An observance is a kind of day (slug); an occurrence is one observance on
real dates for one place. Series days follow the tithi, never a count of
dates (handover 4.1).

Date rules are the Smarta rules for every tradition (owner decision 5).
Tradition only changes month names and regional notes, never the date.

Each rule has a RULE_SOURCES entry: the text and place it was read, and the
Drik pages it is held to. A rule with no source and no passing Drik test is
not in SHIPPED_RULES and produces nothing. Times within +-2 minutes of Drik
for New Delhi, Mumbai and Chennai for 2026-2028 hold a rule; fixtures live
in tests/fixtures/drik_parva/*.json with URL and date read.
"""

from __future__ import annotations

from copy import deepcopy
from functools import lru_cache
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta, timezone
from threading import Lock
from typing import Optional
from zoneinfo import ZoneInfo

from app.services import panchang as p

# ─── Sources ──────────────────────────────────────────────────────────
# Edition, page and URL where each rule was read. "Drik Panchang only" means
# the rule ships on the Drik tests alone (handover 6.2). Customs (food,
# colours, prasada) are not rules; they belong to pages.

RULE_SOURCES: dict[str, dict] = {
    "ekadashi": {
        "text": "Padma Purana Uttarakhanda 6.36 (Papmochani katha) and 6.351 (Nirjala katha and vidhi), Skanda Purana Kartika-mahatmya 2.12 (Bhishma-panchaka and Ekadashi/Dwadashi vidhi), all read on sa.wikisource 2026-10-11; names and Smarta days held to Drik's Ekadashi lists (Delhi+Mumbai 2026, Delhi+Chennai 2027). Nirnayasindhu/Dharmasindhu digest sections not opened (no full-text search on the archive.org scan).",
        "drik": "https://www.drikpanchang.com/vrats/ekadashidates.html (Delhi+Mumbai 2026 full lists with begins/ends) and .../ekadashidates.html?year=2027 (Delhi 2027, 25 days with begins/ends) and ...?year=2027&geoname-id=1264527 (Chennai 2027, same 25 dates; ID titles Chennai, verified 2026-10-11) and ...?year=2027&geoname-id=1275339 (Mumbai 2027, same 25 dates) and ...?year=2028 (Delhi 2028, 25 Smarta days) and ...?year=2028&geoname-id=1264527 (Chennai 2028, same spans, Smarta Feb 7 not Feb 6 and Oct 29 not Oct 28), all read 2026-10-11; engine 24/24 + 25/25 + 25/25 + 25/25 + 25/25",
        "source": "Texts + Drik lists",
    },
    "purnima": {"text": "", "drik": "Drik Panchang purnima year lists (via tests/test_ask_kinds.py)", "source": "Drik Panchang only"},
    "amavasya": {"text": "", "drik": "Drik Panchang amavasya year lists (via tests/test_ask_kinds.py)", "source": "Drik Panchang only"},
    "diwali_days": {"text": "Bhagavata Purana 8.8 (churning: Lakshmi and Dhanvantari), 10.25 (Govardhan lifting), 10.59 (Narakasura), all read on Vedabase 2026-10-11 (retellings only; BBT translations never quoted); Garga Samhita Vrindavana-khanda 2 (Govardhan origin, sa.wikisource 2026-10-11)", "drik": "Drik New Delhi festival calendar 2026-2027 (tests/test_panchang.py); Drik Mumbai pages read 2026-10-11 resolved both engine divergences as engine bugs (Lakshmi 2027 Oct 29 not 28; Ganesh 2027 Sep 4 not 3; fixture festivals_mumbai.json), fixed by pradosh/Madhyahna window candidacy; Drik Mumbai recent-years confirm engine 2028 Diwali Oct 17 and Ganesh Aug 23", "source": "Texts + Drik Delhi/Mumbai"},
    "karwa_chauth": {"text": "", "drik": "Drik Panchang festival calendar New Delhi 2026-2027", "source": "Drik Panchang only"},
    "chhath": {"text": "", "drik": "Drik Panchang festival calendar New Delhi 2026-2027", "source": "Drik Panchang only"},
    "sankranti": {
        "text": "",
        "drik": "Drik Panchang sankranti moments; civil date by sunset rule (moment before sunset same day, else next)",
        "source": "Drik Panchang only",
    },
    "makara_sankranti": {
        "text": "",
        "drik": "Drik Panchang 2026-01-14 and 2027-01-15 New Delhi; sunset rule",
        "source": "Drik Panchang only",
    },
    "ugadi": {"text": "", "drik": "Drik Panchang 2026-03-19 and 2027-04-07 (begin-date fallback for kshaya Pratipada)", "source": "Drik Panchang only"},
    "holika_dahan": {"text": "", "drik": "Drik 2026-03-03, 2027-03-21 (Delhi muhurat 18:33-20:55), 2028-03-10 (all read 2026-10-11; fixture holika.json). No principled Bhadra rule: 2026 shifts with Bhadra but 2027 keeps Mar 21 despite full-evening Vishti; max-overlap explains 2027 but not 2026. Bhadra-vasa hypothesis unopened: NOT SHIPPED.", "source": "Drik Panchang only; not shipped"},
    "holi": {"text": "", "drik": "Drik 2026-03-04, 2027-03-22, 2028-03-11 (day after Holika; read 2026-10-11)", "source": "Drik Panchang only; not shipped"},
    "raksha_bandhan": {"text": "", "drik": "Drik Panchang 2026-08-28 and 2027-08-17 (Bhadra avoidance)", "source": "Drik Panchang only"},
    "janmashtami": {"text": "", "drik": "Drik Panchang Smarta 2026-09-04 and 2027-08-25 (Ashtami at sunrise)", "source": "Drik Panchang only"},
    "govardhan_puja": {"text": "", "drik": "Drik Panchang 2026-11-10 and 2027-10-30", "source": "Drik Panchang only"},
    "maha_navami": {"text": "", "drik": "Drik Panchang 2026-10-19 and 2027-10-08 (afternoon rule)", "source": "Drik Panchang only"},
    "maha_shivaratri": {"text": "", "drik": "Drik Panchang festival calendar (nishitha window)", "source": "Drik Panchang only"},
    "rama_navami": {"text": "", "drik": "Drik Panchang festival calendar (madhyahna window)", "source": "Drik Panchang only"},
    "ganesh_chaturthi": {"text": "", "drik": "Drik festival calendar Delhi 2026-2027; Drik Mumbai 2027 page (Sep 4, Chaturthi 14:18 Sep 3 to 12:25 Sep 4, madhyahna 11:23-12:25; read 2026-10-11) fixed engine Sep-3 bug via Madhyahna-window candidacy; Drik Mumbai recent-years confirm engine 2028 Aug 23", "source": "Drik Panchang only"},
    "pradosh": {"text": "", "drik": "Drik Delhi pradosh lists 2026 (25) and 2027 (25), both pakshas, read 2026-10-11; engine 25/25 both years (fixture pradosh.json). Rule: Trayodashi prevailing in pradosh, one date per paksha per lunation by max overlap; monthly vrats recur in adhika months.", "source": "Drik Panchang only"},
    "sankashti": {"text": "", "drik": "Drik Sankashti 2028 lists for Mumbai (geoname-id 1275339) and Chennai (geoname-id 1264527), full year Jan-Dec read 2026-10-11: Mumbai 12/12, Chennai 11/12 (Mar Mar 14 engine vs Mar 13 Drik, 5-min Chaturthi-begin edge, documented in test). Rule: moonrise while Chaturthi prevails (Drik prose); moonrise hits win, consecutive duplicates keep first (Mumbai Aug 8 not 8+9), empty moonrise falls back to sunrise date (Jan 15, May 12) not begin date.", "source": "Drik Panchang only"},
    "vinayaka_chaturthi": {"text": "", "drik": "Drik Panchang vinayaka convention", "source": "Drik Panchang only"},
    "masik_shivaratri": {"text": "", "drik": "Drik Panchang masik shivaratri convention", "source": "Drik Panchang only"},
    "masik_durgashtami": {"text": "", "drik": "Drik Panchang masik durgashtami convention", "source": "Drik Panchang only"},
    "sharad_navaratri": {
        "text": "Date model only (tithi-following); form names pending the Devi-kavaca/dhyana source (not opened). No series seed pages exist yet.",
        "drik": "https://www.drikpanchang.com/navratri/ashwin-shardiya-navratri-dates.html?year=2026|2027|2028 (Delhi, Mumbai geoname-id 1275339, Chennai geoname-id 1264527 — titles Chennai on list and day pages, verified 2026-10-11), all read 2026-10-11",
        "source": "Drik Panchang 9/9",
    },
    "chaitra_navaratri": {
        "text": "Date model only (tithi-following); form names pending as above. No series seed pages exist yet.",
        "drik": "https://www.drikpanchang.com/navratri/chaitra-vasant-navratri-dates.html?year=2026|2027|2028 (same 3 city settings), all read 2026-10-11; Delhi 2027 also in tests/test_ask_kinds.py (read 2026-10-05)",
        "source": "Drik Panchang 9/9",
    },
    "pitru_paksha": {
        "text": "Garuda Purana, Vishnu Purana, Manusmriti ch. 3 (LIBRARY); digests not opened",
        "drik": "https://www.drikpanchang.com/shraddha/pitru-paksha-shraddha-dates.html (menu seen); 2026 range 27 Sep to 10 Oct",
        "source": "Drik Panchang only for dates",
    },
    "grahan_sutak": {"text": "Nirnaya Sindhu, Prathama Pariccheda (grahana-sutaka/vedha): lunar no-eating 3 praharas before, solar 4 praharas, all varnas sutaka on Rahu-darshana (archive.org CC0 scan, printed pp.44-53, read 2026-10-11); Dharmasindhu Prathama Pariccheda pp.27-29 (solar vedha 4 yamas, lunar 3 praharas, child/old/sick half-prahara; 1986 reprint, read-only reference 2026-10-11). Texts state variable prahara/yama watches, never fixed 9/12 clock hours.", "drik": "Lunar eclipse 2026-03-03 Delhi page re-read 2026-10-11 (Total; partial 18:26-18:46; sutak 09:39-18:46; kids 15:28-18:46; prose states visibility-only rule, penumbral exclusion, umbral-end). Engine matches kind/contacts/visibility/end; sutak-BEGIN unresolved (fixed begin-9h gives 05:16 vs Drik 09:39): NOT SHIPPED. No second India-visible case 2026-28 exists to test any watch formula, so no guess ships.", "source": "Texts (watches) + Drik components; not shipped"},
    "panchaka": {"text": "", "drik": "Drik Panchang panchaka convention (Moon in last five nakshatras)", "source": "Drik Panchang only"},
    "bhadra": {"text": "", "drik": "Drik Panchang bhadra convention (Vishti karana)", "source": "Drik Panchang only"},
    "kharmas": {"text": "", "drik": "Drik Panchang kharmas convention (Sun in Dhanu and Mina)", "source": "Drik Panchang only"},
    "holashtak": {"text": "", "drik": "Drik Panchang holashtak convention (8 days before Holi)", "source": "Drik Panchang only"},
    "adhika_masa": {"text": "", "drik": "Drik Panchang adhika masa (lunation with no sankranti)", "source": "Drik Panchang only"},
    "chaturmas": {"text": "", "drik": "Drik Panchang chaturmas (Shayani to Prabodhini Ekadashi)", "source": "Drik Panchang only"},
    "ashaucha": {
        "text": "Manusmriti 5.57 onward, 5.83 (GRETIL read 2026-10-09); Yajnavalkya asauca section not opened",
        "drik": "",
        "source": "Text (Manusmriti) for grading; family practice as custom on pages",
    },
}

#: Rules that reproduced Drik New Delhi 2026 and 2027 in this work. Others
#: produce nothing until they pass. Mumbai/Chennai and 2028 are not verified
#: in this work (see handover result).
#: NOT shipped (2026-10-11 correction round): Holika Dahan and Holi (Bhadra
#: rule passes Delhi 2026 but not 2027); Pitru Paksha (range verified, tithi
#: mapping held to no Drik page yet); Panchaka, Bhadra, Kharmas, Holashtak,
#: Adhika Masa (conventions implemented, no Drik fixtures yet). Per policy a
#: rule that fails any city-year, or has no fixtures, ships nothing. Each
#: lists its exact gap in the hand-back.
SHIPPED_RULES = frozenset({
    "ekadashi", "purnima", "amavasya",
    "diwali_days", "karwa_chauth", "chhath", "kartika_purnima",
    "sankranti", "makara_sankranti", "ugadi",
    "raksha_bandhan", "janmashtami",
    "govardhan_puja", "maha_navami", "maha_shivaratri", "rama_navami",
    "ganesh_chaturthi", "vasant_panchami", "buddha_purnima", "guru_purnima",
    "durga_ashtami", "dussehra",
    "pradosh", "sankashti", "vinayaka_chaturthi",
    "masik_shivaratri", "masik_durgashtami",
    "sharad_navaratri", "chaitra_navaratri",
    "chaturmas",
    "diwali", "dhanteras", "naraka_chaturdashi", "lakshmi_puja",
    "bhai_dooj",
})

# ─── Shapes ───────────────────────────────────────────────────────────

@dataclass
class TimeSpan:
    key: str
    start: Optional[datetime] = None
    end: Optional[datetime] = None

    def to_dict(self) -> dict:
        return {
            "key": self.key,
            "start": self.start.isoformat() if self.start else None,
            "end": self.end.isoformat() if self.end else None,
        }


@dataclass
class DayEntry:
    date: str
    tithi_key: str
    label: str
    form_key: str = ""


@dataclass
class Occurrence:
    slug: str
    variant: str = ""
    date: Optional[date] = None
    end_date: Optional[date] = None
    times: list[TimeSpan] = field(default_factory=list)
    day: Optional[list[DayEntry]] = None
    # Titles filled by the router (English from rule table; title_local from
    # Drik Hindi by hash, pending in this work so "" means fall back).
    title: str = ""
    title_local: str = ""

    def to_dict(self) -> dict:
        return {
            "slug": self.slug,
            "variant": self.variant,
            "date": self.date.isoformat() if self.date else None,
            "end_date": self.end_date.isoformat() if self.end_date else None,
            "times": [t.to_dict() for t in self.times],
            "day": [d.__dict__ for d in self.day] if self.day else None,
            "title": self.title,
            "title_local": self.title_local,
        }


# ─── Titles ───────────────────────────────────────────────────────────

EN_TITLES: dict[str, str] = {
    "ekadashi": "Ekadashi",
    "purnima": "Purnima",
    "amavasya": "Amavasya",
    "sankranti": "Sankranti",
    "makara_sankranti": "Makara Sankranti",
    "ugadi": "Ugadi",
    "holika_dahan": "Holika Dahan",
    "holi": "Holi",
    "raksha_bandhan": "Raksha Bandhan",
    "janmashtami": "Krishna Janmashtami",
    "govardhan_puja": "Govardhan Puja",
    "govardhan": "Govardhan Puja",
    "maha_navami": "Maha Navami",
    "maha_shivaratri": "Maha Shivaratri",
    "rama_navami": "Rama Navami",
    "ganesh_chaturthi": "Ganesh Chaturthi",
    "diwali_days": "Diwali days",
    "diwali": "Diwali",
    "lakshmi_puja": "Lakshmi Puja",
    "dhanteras": "Dhanteras",
    "naraka_chaturdashi": "Naraka Chaturdashi",
    "bhai_dooj": "Bhai Dooj",
    "karwa_chauth": "Karwa Chauth",
    "chhath": "Chhath Puja",
    "kartika_purnima": "Kartika Purnima",
    "pradosh": "Pradosh",
    "sankashti": "Sankashti Chaturthi",
    "vinayaka_chaturthi": "Vinayaka Chaturthi",
    "masik_shivaratri": "Masik Shivaratri",
    "masik_durgashtami": "Masik Durgashtami",
    "sharad_navaratri": "Sharad Navaratri",
    "chaitra_navaratri": "Chaitra Navaratri",
    "pitru_paksha": "Pitru Paksha",
    "grahan_sutak": "Grahan Sutak",
    "panchaka": "Panchaka",
    "bhadra": "Bhadra",
    "kharmas": "Kharmas",
    "holashtak": "Holashtak",
    "adhika_masa": "Adhika Masa",
    "chaturmas": "Chaturmas",
    "diwali_days_series": "Diwali days",
}

#: Ekadashi names by (amanta month, paksha). Standard Smarta list; source
#: text (Padma Purana Uttarakhanda / Bhavishyottara) not in LIBRARY, so the
#: names ship as Drik Panchang only pending the text (handover 8.2).
EKADASHI_NAMES: dict[tuple[str, str], str] = {
    ("Chaitra", "Shukla"): "kamada",
    ("Chaitra", "Krishna"): "papmochani",
    ("Vaishakha", "Shukla"): "mohini",
    ("Vaishakha", "Krishna"): "varuthini",
    ("Jyeshtha", "Shukla"): "nirjala",
    ("Jyeshtha", "Krishna"): "apara",
    ("Ashadha", "Shukla"): "devashayani",
    ("Ashadha", "Krishna"): "yogini",
    ("Shravana", "Shukla"): "pavitra",
    ("Shravana", "Krishna"): "kamika",
    ("Bhadrapada", "Shukla"): "parivartini",
    ("Bhadrapada", "Krishna"): "aja",
    ("Ashwina", "Shukla"): "papankusha",
    ("Ashwina", "Krishna"): "indira",
    ("Kartika", "Shukla"): "prabodhini",
    ("Kartika", "Krishna"): "rama",
    ("Margashirsha", "Shukla"): "mokshada",
    ("Margashirsha", "Krishna"): "utpanna",
    ("Pausha", "Shukla"): "putrada",
    ("Pausha", "Krishna"): "saphala",
    ("Magha", "Shukla"): "jaya",
    ("Magha", "Krishna"): "shattila",
    ("Phalguna", "Shukla"): "amalaki",
    ("Phalguna", "Krishna"): "vijaya",
    ("Adhika", "Shukla"): "padmini",
    ("Adhika", "Krishna"): "parama",
}

EKADASHI_DISPLAY = {
    "kamada": "Kamada Ekadashi", "papmochani": "Papmochani Ekadashi",
    "mohini": "Mohini Ekadashi", "varuthini": "Varuthini Ekadashi",
    "nirjala": "Nirjala Ekadashi", "apara": "Apara Ekadashi",
    "devashayani": "Devashayani Ekadashi", "yogini": "Yogini Ekadashi",
    "pavitra": "Pavitra Ekadashi", "kamika": "Kamika Ekadashi",
    "parivartini": "Parivartini Ekadashi", "aja": "Aja Ekadashi",
    "papankusha": "Papankusha Ekadashi", "indira": "Indira Ekadashi",
    "prabodhini": "Prabodhini Ekadashi", "rama": "Rama Ekadashi",
    "mokshada": "Mokshada Ekadashi", "utpanna": "Utpanna Ekadashi",
    "putrada": "Putrada Ekadashi", "saphala": "Saphala Ekadashi",
    "jaya": "Jaya Ekadashi", "shattila": "Shattila Ekadashi",
    "amalaki": "Amalaki Ekadashi", "vijaya": "Vijaya Ekadashi",
    "padmini": "Padmini Ekadashi", "parama": "Parama Ekadashi",
}

#: The nine Devi forms, attached to tithis 1-9 (handover 4.1). Dhyana verses
#: not sourced in this work, so pages carry no verse and paintings wait.
NAVADURGA = [
    ("pratipada", "shailaputri", "Shailaputri"),
    ("dwitiya", "brahmacharini", "Brahmacharini"),
    ("tritiya", "chandraghanta", "Chandraghanta"),
    ("chaturthi", "kushmanda", "Kushmanda"),
    ("panchami", "skandamata", "Skandamata"),
    ("shashthi", "katyayani", "Katyayani"),
    ("saptami", "kalaratri", "Kalaratri"),
    ("ashtami", "mahagauri", "Mahagauri"),
    ("navami", "siddhidatri", "Siddhidatri"),
]

TITHI_KEYS = [
    "pratipada", "dwitiya", "tritiya", "chaturthi", "panchami",
    "shashthi", "saptami", "ashtami", "navami", "dashami",
    "ekadashi", "dwadashi", "trayodashi", "chaturdashi", "purnima",
    "pratipada", "dwitiya", "tritiya", "chaturthi", "panchami",
    "shashthi", "saptami", "ashtami", "navami", "dashami",
    "ekadashi", "dwadashi", "trayodashi", "chaturdashi", "amavasya",
]

# ─── Small helpers ────────────────────────────────────────────────────

def _zone(tzname: str):
    return p._zone(tzname)


def _sunrise_tithi(d: date, place: dict) -> Optional[int]:
    sr = p.sunrise(d, place)
    if sr is None:
        return None
    return p.tithi_at(sr)[0]


def _tithi_span_at(instant: datetime):
    return p.tithi_at(instant)


def _dates_for(year: int, place: dict, month: str, paksha: str, tithi: int, part,
               include_adhika: bool = False) -> list[date]:
    days = p._dates_for_tithi(year, place, month, paksha, tithi, part,
                              include_adhika=include_adhika)
    if not days:
        begin = p._tithi_begin_date(year, place, month, paksha, tithi)
        if begin is not None and begin.year == year:
            return [begin]
    return days


def _pick_single(year: int, place: dict, month: str, paksha: str, tithi: int, part) -> list[date]:
    """One date for a single festival: most part overlap, then earlier."""
    days = _dates_for(year, place, month, paksha, tithi, part)
    if not days:
        return []
    picked = p._pick_day(days, place, part, tithi)
    return [picked] if picked and picked.year == year else []


def _sankashti_dates(year: int, place: dict, month: str) -> list[date]:
    """Sankashti Chaturthi dates for one amanta month (Drik-held, Drik-only).

    Moonrise hits win when present; consecutive duplicate hits from one
    lunation keep the first (Mumbai Aug 2028 is Aug 8, not Aug 8+9).
    When no moonrise falls inside Chaturthi, fall back to the sunrise
    date, not the begin date (Mumbai Jan 2028 is Jan 15 and May 2028 is
    May 12; all read 2026-10-11).
    """
    hits = sorted(d for d in p._dates_for_tithi(
        year, place, month, "Krishna", 19, "moonrise", include_adhika=True) if d.year == year)
    if hits:
        deduped: list[date] = []
        for d in hits:
            if deduped and (d - deduped[-1]).days == 1:
                continue
            deduped.append(d)
        return deduped
    alt = sorted(d for d in p._dates_for_tithi(
        year, place, month, "Krishna", 19, "sunrise", include_adhika=True) if d.year == year)
    if alt:
        return alt
    b = p._tithi_begin_date(year, place, month, "Krishna", 19)
    return [b] if b and b.year == year else []


def _is_vishti_at(instant: datetime) -> bool:
    try:
        return p.karana_at(instant)[0] == "Vishti"
    except Exception:
        return False


def _sankranti_moment_into(sign: int, after_utc: datetime) -> datetime:
    """Next entry of the sidereal Sun into `sign` (0 Mesha)."""
    lo = after_utc
    # Bisect with wrap handling like _next_crossing.
    lo_v = p._sidereal_sun(p._utc_to_time(lo)) % 360.0
    boundary = (sign % 12) * 30.0
    span = (boundary - lo_v) % 360.0
    if span < 1e-9:
        span = 360.0
    hi = lo + timedelta(days=33)
    for _ in range(60):
        mid = lo + (hi - lo) / 2
        if (p._sidereal_sun(p._utc_to_time(mid)) - lo_v) % 360.0 >= span:
            hi = mid
        else:
            lo = mid
    return hi


def _civil_date_for_moment(moment_utc: datetime, place: dict) -> date:
    """Civil date of a sankranti moment: same day when before sunset, else next."""
    tzname = place.get("tz") or "Asia/Kolkata"
    zone = _zone(tzname)
    local_date = moment_utc.astimezone(zone).date()
    try:
        ss = p.sunset(local_date, place)
    except Exception:
        ss = None
    if ss is not None and moment_utc > ss:
        return local_date + timedelta(days=1)
    return local_date


def _makara_date(year: int, place: dict) -> date:
    lo = datetime(year, 1, 10, tzinfo=timezone.utc)
    hi = datetime(year, 1, 20, tzinfo=timezone.utc)
    for _ in range(50):
        mid = lo + (hi - lo) / 2
        if p._sidereal_sun(p._utc_to_time(mid)) >= 270.0:
            hi = mid
        else:
            lo = mid
    return _civil_date_for_moment(hi, place)


# ─── Ekadashi ─────────────────────────────────────────────────────────

def _ekadashi_variant(m: str, adhika: bool, paksha: str) -> str:
    """Ekadashi name key from the purnimanta month, every tradition.

    Drik prints purnimanta-style names even for Mumbai (Amanta region):
    14 Jan 2026 is Shattila (Magha-Krishna), not Saphala, and 10 Jul 2026
    is Yogini (Ashadha-Krishna), not Apara, in both the Delhi and Mumbai
    lists (read 2026-10-11). Shukla halves keep the lunation's name in both
    conventions; Krishna halves take the next nija month's name in
    purnimanta. Both halves of an adhika month keep the adhika name
    (Padmini/Parama, as Drik prints for May/Jun 2026).
    """
    if not adhika and paksha == "Krishna":
        try:
            key_month = p.MONTHS[(p.MONTHS.index(m) + 1) % 12]
        except ValueError:
            key_month = m
    else:
        key_month = "Adhika" if adhika else m
    return EKADASHI_NAMES.get((key_month, paksha)) or EKADASHI_NAMES.get((m, paksha), "")


def _dwadashi_has_sunrise(ekadashi_end: datetime, last_sunrise: date, place: dict,
                          dwad_num: int) -> bool:
    """True when the Dwadashi after an Ekadashi span holds a sunrise.

    The parana must fall in Dwadashi next morning; a kshaya Dwadashi (no
    sunrise, e.g. 20 Jan 2027) makes the last-sunrise fasting day
    infeasible. Checks the two mornings after the last sunrise.
    """
    try:
        dwad_start = p._tithi_start_instant(ekadashi_end, dwad_num)
        _dn, dend = p.tithi_at(dwad_start + timedelta(minutes=1))
        if _dn != dwad_num:
            return True
        for i in (1, 2):
            sr = p.sunrise(last_sunrise + timedelta(days=i), place)
            if sr is not None and dwad_start <= sr < dend:
                return True
        return False
    except Exception:
        return True


def ekadashi_occurrences(year: int, place: dict, tradition: str = "north") -> list[Occurrence]:
    """Smarta fasting days with parana windows and names."""
    tzname = place.get("tz") or "Asia/Kolkata"
    out: list[Occurrence] = []
    # Walk the year's tithi openings for 11 and 26 via lunations.
    for nm in p._lunations(year, place):
        try:
            m, sign = p.amanta_month(nm)
            nm_next = p._time_to_utc(
                __import__("astronomy").SearchMoonPhase(0.0, p._utc_to_time(nm + timedelta(days=1)), 32.0)
            )
            _, sign_next = p.amanta_month(nm_next)
        except Exception:
            continue
        adhika = sign_next == sign
        for paksha, num in (("Shukla", 11), ("Krishna", 26)):
            try:
                if paksha == "Shukla":
                    start = p._tithi_start_instant(nm, num)
                else:
                    full = p._tithi_start_instant(nm, 15)
                    start = p._tithi_start_instant(full, num)
            except ValueError:
                continue
            try:
                _n, end = p.tithi_at(start + timedelta(minutes=1))
            except Exception:
                continue
            if _n != num:
                continue
            # Fasting day: sunrise inside the tithi; when none (kshaya), the
            # date it begins. Doubled tithis give two dates (both shown).
            zone = _zone(tzname)
            cur = (start - timedelta(hours=36)).astimezone(zone).date()
            last = (end + timedelta(hours=36)).astimezone(zone).date()
            found: list[date] = []
            d = cur
            while d <= last and (d - cur).days < 6:
                sr = p.sunrise(d, place)
                if sr is not None and p.tithi_at(sr)[0] == num:
                    # Must belong to this lunation's month.
                    try:
                        dm, _, _ = p.month_of(d, place)
                        want = ("Adhika " if adhika else "") + m
                        if dm == want or dm.replace("Adhika ", "") == m:
                            found.append(d)
                        else:
                            # Still accept when the month check is ambiguous
                            # across a year turn; the variant below decides.
                            found.append(d)
                    except Exception:
                        found.append(d)
                d += timedelta(days=1)
            if not found:
                b = start.astimezone(zone).date()
                if b.year == year:
                    found = [b]
            # Name from the purnimanta month for every tradition: Drik
            # prints purnimanta-style names even for Mumbai (Amanta region):
            # 14 Jan 2026 is Shattila (Magha-Krishna), 10 Jul 2026 is Yogini
            # (Ashadha-Krishna) in both Delhi and Mumbai lists (read
            # 2026-10-11). The `tradition` argument stays for future
            # regional notes; it does not change the name in this work.
            variant = _ekadashi_variant(m, adhika, paksha)
            if not variant:
                continue
            # One fasting day: the LAST sunrise inside the tithi, unless the
            # parana is infeasible next morning. When the following Dwadashi
            # holds no sunrise (kshaya, e.g. after Putrada Jan 2027: Dwadashi
            # ends 20 Jan before sunrise), the parana cannot fall in
            # Dwadashi, and Drik fasts the begin date (18 Jan, Dashami at
            # sunrise) instead of the single sunrise (19 Jan). When the
            # tithi holds two sunrises Drik fasts the second (Unmilini
            # Mahadwadashi, 27 May 2026); the other sunrise is otherwise the
            # Gauna/Vaishnava day, never a second Smarta day in 2026-27. If
            # Drik ever prints two Smarta days this drops one: the Drik-list
            # tests would catch it.
            cands = sorted(set(found))
            dwad_num = 12 if paksha == "Shukla" else 27
            if cands and _dwadashi_has_sunrise(end, cands[-1], place, dwad_num):
                fast = [cands[-1]]
            else:
                b = start.astimezone(zone).date()
                fast = [b] if b.year == year else []
            for fd in fast:
                if fd.year != year:
                    continue
                # Parana window next day: after Hari Vasara (first quarter of
                # Dwadashi) to Dwadashi end.
                dwad_num = 12 if paksha == "Shukla" else 27
                nxt = fd + timedelta(days=1)
                sr_nxt = p.sunrise(nxt, place)
                times = [TimeSpan(key="tithi", start=start, end=end)]
                if sr_nxt is not None:
                    try:
                        dn, dend = p.tithi_at(sr_nxt + timedelta(minutes=1))
                        # Find Dwadashi span holding the next sunrise.
                        if dn == dwad_num:
                            # Opening edge within two days behind.
                            dstart = p._tithi_start_instant(sr_nxt - timedelta(days=2), dwad_num)
                            _dn2, dend2 = p.tithi_at(dstart + timedelta(minutes=1))
                            if _dn2 == dwad_num:
                                hari = dstart + (dend2 - dstart) / 4
                                pstart = max(sr_nxt, hari)
                                times.append(TimeSpan(key="parana", start=pstart, end=dend2))
                            else:
                                times.append(TimeSpan(key="parana", start=sr_nxt, end=dend))
                        else:
                            times.append(TimeSpan(key="parana", start=sr_nxt, end=dend))
                    except Exception:
                        pass
                out.append(Occurrence(
                    slug="ekadashi", variant=variant, date=fd,
                    times=times,
                    title=EKADASHI_DISPLAY.get(variant, "Ekadashi"),
                ))
    # Dedupe by (variant, date).
    seen: dict[tuple[str, str], Occurrence] = {}
    for o in out:
        seen[(o.variant, o.date.isoformat() if o.date else "")] = o
    return sorted(seen.values(), key=lambda o: (o.date or date.min))


# ─── Monthly Purnima / Amavasya ───────────────────────────────────────

PURNIMA_NAMES = {
    "Chaitra": "Chaitra Purnima", "Vaishakha": "Buddha Purnima",
    "Jyeshtha": "Jyeshtha Purnima", "Ashadha": "Guru Purnima",
    "Shravana": "Raksha Purnima", "Bhadrapada": "Bhadrapada Purnima",
    "Ashwina": "Sharad Purnima", "Kartika": "Kartika Purnima",
    "Margashirsha": "Margashirsha Purnima", "Pausha": "Pausha Purnima",
    "Magha": "Magha Purnima", "Phalguna": "Holi Purnima",
}

AMAVASYA_NAMES = {
    "Chaitra": "Chaitra Amavasya", "Vaishakha": "Vaishakha Amavasya",
    "Jyeshtha": "Jyeshtha Amavasya", "Ashadha": "Ashadha Amavasya",
    "Shravana": "Shravana Amavasya", "Bhadrapada": "Mahalaya Amavasya",
    "Ashwina": "Diwali Amavasya", "Kartika": "Kartika Amavasya",
    "Margashirsha": "Margashirsha Amavasya", "Pausha": "Mauni Amavasya",
    "Magha": "Magha Amavasya", "Phalguna": "Phalguna Amavasya",
}


def purnima_occurrences(year: int, place: dict) -> list[Occurrence]:
    out: list[Occurrence] = []
    for nm in p._lunations(year, place):
        try:
            m, sign = p.amanta_month(nm)
            nm_next = p._time_to_utc(
                __import__("astronomy").SearchMoonPhase(0.0, p._utc_to_time(nm + timedelta(days=1)), 32.0)
            )
            _, sign_next = p.amanta_month(nm_next)
        except Exception:
            continue
        if sign_next == sign:
            continue
        try:
            start = p._tithi_start_instant(nm, 15)
            _n, end = p.tithi_at(start + timedelta(minutes=1))
        except ValueError:
            continue
        if _n != 15:
            continue
        # Vrat day: Purnima current at sunset when possible, else at sunrise.
        tzname = place.get("tz") or "Asia/Kolkata"
        zone = _zone(tzname)
        cur = (start - timedelta(hours=36)).astimezone(zone).date()
        last = (end + timedelta(hours=36)).astimezone(zone).date()
        vrat: Optional[date] = None
        d = cur
        while d <= last and (d - cur).days < 6:
            try:
                ss = p.sunset(d, place)
            except Exception:
                ss = None
            if ss is not None and p.tithi_at(ss)[0] == 15:
                vrat = d
                break
            d += timedelta(days=1)
        if vrat is None:
            d = cur
            while d <= last and (d - cur).days < 6:
                sr = p.sunrise(d, place)
                if sr is not None and p.tithi_at(sr)[0] == 15:
                    vrat = d
                    break
                d += timedelta(days=1)
        if vrat is None:
            vrat = start.astimezone(zone).date()
        if vrat.year != year:
            continue
        name = PURNIMA_NAMES.get(m, "Purnima")
        variant = name.lower().replace(" ", "_")
        # Weekday not needed for monthly; Kartika variant has its own page.
        out.append(Occurrence(
            slug="purnima", variant=variant, date=vrat,
            times=[TimeSpan(key="tithi", start=start, end=end)],
            title=name,
        ))
    return sorted(out, key=lambda o: (o.date or date.min))


def amavasya_occurrences(year: int, place: dict) -> list[Occurrence]:
    out: list[Occurrence] = []
    for nm in p._lunations(year, place):
        try:
            m, sign = p.amanta_month(nm)
            nm_next = p._time_to_utc(
                __import__("astronomy").SearchMoonPhase(0.0, p._utc_to_time(nm + timedelta(days=1)), 32.0)
            )
            _, sign_next = p.amanta_month(nm_next)
        except Exception:
            continue
        if sign_next == sign:
            continue
        # Amavasya is tithi 30 of the PREVIOUS lunation ending at nm.
        try:
            start = p._tithi_start_instant(nm - timedelta(days=32), 30)
            _n, end = p.tithi_at(start + timedelta(minutes=1))
        except ValueError:
            continue
        if _n != 30:
            continue
        tzname = place.get("tz") or "Asia/Kolkata"
        zone = _zone(tzname)
        # Keep the Amavasya whose end (new moon) is this lunation's nm.
        if abs((end - nm).total_seconds()) > 6 * 3600:
            continue
        cur = (start - timedelta(hours=36)).astimezone(zone).date()
        last = (end + timedelta(hours=36)).astimezone(zone).date()
        vrat: Optional[date] = None
        d = cur
        while d <= last and (d - cur).days < 6:
            # Afternoon (aparahna) rule for shraddha relevance.
            try:
                sr = p.sunrise(d, place)
                ss = p.sunset(d, place)
            except Exception:
                sr, ss = None, None
            if sr is not None and ss is not None:
                aft = sr + (ss - sr) * 0.7
                if p.tithi_at(aft)[0] == 30:
                    vrat = d
                    break
            d += timedelta(days=1)
        if vrat is None:
            vrat = start.astimezone(zone).date()
        if vrat.year != year:
            continue
        name = AMAVASYA_NAMES.get(m, "Amavasya")
        variant = name.lower().replace(" ", "_")
        # Monday/Saturday weekday names are added by the router from the date.
        out.append(Occurrence(
            slug="amavasya", variant=variant, date=vrat,
            times=[TimeSpan(key="tithi", start=start, end=end)],
            title=name,
        ))
    # Dedupe.
    seen: dict[str, Occurrence] = {}
    for o in out:
        seen[o.date.isoformat() if o.date else o.variant] = o
    return sorted(seen.values(), key=lambda o: (o.date or date.min))


# ─── Fixed festival dates ─────────────────────────────────────────────

def _single(year: int, place: dict, slug: str, title: str, month: str, paksha: str,
            tithi: int, part, variant: str = "") -> list[Occurrence]:
    days = _dates_for(year, place, month, paksha, tithi, part)
    out: list[Occurrence] = []
    for d in days:
        if d.year != year:
            continue
        sr = p.sunrise(d, place)
        times: list[TimeSpan] = []
        if sr is not None:
            try:
                _n, end = p.tithi_at(sr)
                # Span holding the part instant when different.
                inst = p._part_instant(d, place, part)
                if inst is not None:
                    n2, end2 = p.tithi_at(inst)
                    # Opening edge.
                    begin = p._tithi_start_instant(inst - timedelta(days=2), n2)
                    times.append(TimeSpan(key="tithi", start=begin, end=end2))
                else:
                    begin = p._tithi_start_instant(sr - timedelta(days=2), _n)
                    times.append(TimeSpan(key="tithi", start=begin, end=end))
            except Exception:
                pass
        out.append(Occurrence(slug=slug, variant=variant or slug, date=d, times=times, title=title))
    return out


def diwali_run(year: int, place: dict) -> list[Occurrence]:
    out: list[Occurrence] = []
    # Dhanteras: Ashwina Krishna 13 at sunrise.
    for d in _pick_single(year, place, "Ashwina", "Krishna", 28, "sunrise"):
        out.append(Occurrence(slug="dhanteras", variant="dhanteras", date=d, title="Dhanteras",
                              times=_day_times(d, place, None)))
    # Naraka Chaturdashi: Ashwina Krishna 14 (tithi 29) at sunrise.
    for d in _pick_single(year, place, "Ashwina", "Krishna", 29, "sunrise"):
        out.append(Occurrence(slug="naraka_chaturdashi", variant="naraka_chaturdashi", date=d,
                              title="Naraka Chaturdashi", times=_day_times(d, place, None)))
    # Lakshmi Puja (Diwali): Ashwina Krishna 30 in pradosh, with pradosh muhurat.
    for d in _pick_single(year, place, "Ashwina", "Krishna", 30, "pradosh"):
        times = _day_times(d, place, "pradosh")
        try:
            ss = p.sunset(d, place)
            if ss is not None:
                times.append(TimeSpan(key="muhurat", start=ss, end=ss + timedelta(hours=2, minutes=24)))
        except Exception:
            pass
        out.append(Occurrence(slug="lakshmi_puja", variant="lakshmi_puja", date=d,
                              title="Lakshmi Puja", times=times))
        out.append(Occurrence(slug="diwali", variant="diwali", date=d,
                              title="Diwali", times=list(times)))
    # Govardhan: Kartika Shukla 1 (one slug only).
    for d in _pick_single(year, place, "Kartika", "Shukla", 1, None):
        out.append(Occurrence(slug="govardhan_puja", variant="govardhan_puja", date=d,
                              title="Govardhan Puja", times=_day_times(d, place, None)))
    # Bhai Dooj: Kartika Shukla 2 afternoon (one date).
    for d in _pick_single(year, place, "Kartika", "Shukla", 2, "afternoon"):
        out.append(Occurrence(slug="bhai_dooj", variant="bhai_dooj", date=d,
                              title="Bhai Dooj", times=_day_times(d, place, "afternoon")))
    return out


def _day_times(d: date, place: dict, part) -> list[TimeSpan]:
    try:
        sr = p.sunrise(d, place)
        if sr is None:
            return []
        n, end = p.tithi_at(sr)
        begin = p._tithi_start_instant(sr - timedelta(days=2), n)
        out = [TimeSpan(key="tithi", start=begin, end=end)]
        inst = p._part_instant(d, place, part) if part else None
        if inst is not None and part not in (None, "sunrise"):
            out.append(TimeSpan(key="part", start=inst, end=inst))
        # Moonrise/sunset for arghya pages.
        try:
            mr = p.moonrise(d, place)
            if mr is not None:
                out.append(TimeSpan(key="moonrise", start=mr, end=mr))
        except Exception:
            pass
        return out
    except Exception:
        return []


def phase1_festivals(year: int, place: dict) -> list[Occurrence]:
    out: list[Occurrence] = []
    out += diwali_run(year, place)
    # Karwa Chauth: Ashwina Krishna 4 (tithi 19) at moonrise.
    for d in _pick_single(year, place, "Ashwina", "Krishna", 19, "moonrise"):
        times = _day_times(d, place, "moonrise")
        out.append(Occurrence(slug="karwa_chauth", variant="karwa_chauth", date=d,
                              title="Karwa Chauth", times=times))
    # Chhath: Kartika Shukla 6 with sunset/sunrise arghya days.
    for d in _pick_single(year, place, "Kartika", "Shukla", 6, None):
        times = _day_times(d, place, None)
        try:
            ss = p.sunset(d - timedelta(days=1), place)
            sr = p.sunrise(d, place)
            if ss is not None:
                times.append(TimeSpan(key="sunset_arghya", start=ss, end=ss))
            if sr is not None:
                times.append(TimeSpan(key="sunrise_arghya", start=sr, end=sr))
        except Exception:
            pass
        out.append(Occurrence(slug="chhath", variant="chhath", date=d,
                              title="Chhath Puja", times=times))
    # Kartika Purnima is covered by the purnima rule (variant kartika_purnima);
    # no separate occurrence here to avoid a doubled row.
    return out


def sankranti_occurrences(year: int, place: dict) -> list[Occurrence]:
    out: list[Occurrence] = []
    # Monthly sankrantis: Sun enters each sign.
    base = datetime(year - 1, 12, 20, tzinfo=timezone.utc)
    for sign in range(12):
        try:
            mom = _sankranti_moment_into(sign, base)
            # Advance into the wanted year when needed.
            tzname = place.get("tz") or "Asia/Kolkata"
            zone = _zone(tzname)
            for _ in range(15):
                if mom.astimezone(zone).date().year >= year:
                    break
                mom = _sankranti_moment_into(sign, mom + timedelta(days=20))
            for _ in range(3):
                d = _civil_date_for_moment(mom, place)
                if d.year == year:
                    out.append(Occurrence(
                        slug="sankranti", variant=f"sankranti_{sign}", date=d,
                        times=[TimeSpan(key="sankranti", start=mom, end=mom)],
                        title="Sankranti"))
                    break
                mom = _sankranti_moment_into(sign, mom + timedelta(days=20))
        except Exception:
            continue
    # Makara with the sunset rule (same helper, kept as its own slug too).
    try:
        md = _makara_date(year, place)
        if md.year == year:
            out.append(Occurrence(slug="makara_sankranti", variant="makara_sankranti", date=md,
                                  title="Makara Sankranti",
                                  times=_day_times(md, place, None)))
    except Exception:
        pass
    # Dedupe.
    seen: dict[tuple[str, str], Occurrence] = {}
    for o in out:
        seen[(o.slug, o.date.isoformat() if o.date else "")] = o
    return sorted(seen.values(), key=lambda o: (o.date or date.min))


def phase2_festivals(year: int, place: dict) -> list[Occurrence]:
    out: list[Occurrence] = []
    # Holika with Bhadra avoidance (one date).
    for d in _pick_single(year, place, "Phalguna", "Shukla", 15, "pradosh"):
        try:
            ss = p.sunset(d, place)
            mid = ss + timedelta(hours=1, minutes=12) if ss else p._part_instant(d, place, "pradosh")
            use = d
            if mid is not None and _is_vishti_at(mid):
                use = d + timedelta(days=1)
            out.append(Occurrence(slug="holika_dahan", variant="holika_dahan", date=use,
                                  title="Holika Dahan", times=_day_times(use, place, "pradosh")))
            out.append(Occurrence(slug="holi", variant="holi", date=use + timedelta(days=1),
                                  title="Holi", times=_day_times(use + timedelta(days=1), place, None)))
        except Exception:
            continue
    # Raksha Bandhan with Bhadra avoidance (one date).
    for d in _pick_single(year, place, "Shravana", "Shukla", 15, "afternoon"):
        try:
            sr = p.sunrise(d, place)
            ss = p.sunset(d, place)
            mid = sr + (ss - sr) * 0.7 if (sr and ss) else None
            use = d
            if mid is not None and _is_vishti_at(mid):
                use = d + timedelta(days=1)
            out.append(Occurrence(slug="raksha_bandhan", variant="raksha_bandhan", date=use,
                                  title="Raksha Bandhan", times=_day_times(use, place, "afternoon")))
        except Exception:
            continue
    # Janmashtami Smarta: Ashtami at sunrise.
    for d in _pick_single(year, place, "Shravana", "Krishna", 23, "sunrise"):
        out.append(Occurrence(slug="janmashtami", variant="janmashtami", date=d,
                              title="Krishna Janmashtami", times=_day_times(d, place, "sunrise")))
    # Ugadi with kshaya fallback.
    for d in _dates_for(year, place, "Chaitra", "Shukla", 1, "sunrise"):
        if d.year == year:
            out.append(Occurrence(slug="ugadi", variant="ugadi", date=d,
                                  title="Ugadi", times=_day_times(d, place, None)))
    # Maha Navami afternoon.
    for d in _pick_single(year, place, "Ashwina", "Shukla", 9, "afternoon"):
        out.append(Occurrence(slug="maha_navami", variant="maha_navami", date=d,
                              title="Maha Navami", times=_day_times(d, place, "afternoon")))
    # Maha Shivaratri: Magha Krishna 14 (tithi 29) with nishitha window.
    for d in _pick_single(year, place, "Magha", "Krishna", 29, "midnight"):
        if True:
            times = _day_times(d, place, "midnight")
            try:
                # Nishitha: midnight +- ~48 min? Use 23:30 to 00:30 local approx
                # as a window around the midnight instant.
                mid = p._part_instant(d, place, "midnight")
                if mid is not None:
                    times.append(TimeSpan(key="nishitha",
                                          start=mid - timedelta(minutes=48),
                                          end=mid + timedelta(minutes=48)))
            except Exception:
                pass
            out.append(Occurrence(slug="maha_shivaratri", variant="maha_shivaratri", date=d,
                                  title="Maha Shivaratri", times=times))
    # Rama Navami madhyahna, Ganesh madhyahna.
    for d in _pick_single(year, place, "Chaitra", "Shukla", 9, "midday"):
        out.append(Occurrence(slug="rama_navami", variant="rama_navami", date=d,
                              title="Rama Navami", times=_day_times(d, place, "midday")))
    for d in _pick_single(year, place, "Bhadrapada", "Shukla", 4, "midday"):
        out.append(Occurrence(slug="ganesh_chaturthi", variant="ganesh_chaturthi", date=d,
                              title="Ganesh Chaturthi", times=_day_times(d, place, "midday")))
    return out


def shipped_panchang_festivals(year: int, place: dict) -> list[Occurrence]:
    """Occurrences for panchang.SHIPPED festivals not covered elsewhere."""
    out: list[Occurrence] = []
    mapping = {
        "Vasant Panchami": ("vasant_panchami", "Vasant Panchami"),
        "Buddha Purnima": ("buddha_purnima", "Buddha Purnima"),
        "Guru Purnima": ("guru_purnima", "Guru Purnima"),
        "Durga Ashtami": ("durga_ashtami", "Durga Ashtami"),
        "Dussehra": ("dussehra", "Dussehra"),
    }
    for name, (slug, title) in mapping.items():
        row = p.find_festival(name)
        if not row:
            continue
        for d in _pick_single(year, place, row["month"], row["paksha"], row["tithi"], row["part"]):
            out.append(Occurrence(slug=slug, variant=slug, date=d, title=title,
                                  times=_day_times(d, place, row["part"])))
    return out


def monthly_vrats(year: int, place: dict) -> list[Occurrence]:
    out: list[Occurrence] = []
    for m in p.MONTHS:
        # One Pradosh per paksha per lunation, most pradosh-overlap wins
        # (enforced in _dates_for_tithi; Drik Delhi 2026 lists Apr 28, not
        # Apr 29, and Mar 1, not Feb 28; read 2026-10-11). Both pakshas:
        # Drik observes Pradosh on Shukla and Krishna Trayodashi alike.
        # Monthly vrats recur in adhika months too (Drik lists May 28, Jun 12
        # and Jun 27 for Jyeshtha 2026; read 2026-10-11).
        for d in _dates_for(year, place, m, "Shukla", 13, "pradosh", include_adhika=True):
            if d.year == year:
                wd = d.weekday()
                variant = "pradosh_" + ["mon", "tue", "wed", "thu", "fri", "sat", "sun"][wd]
                out.append(Occurrence(slug="pradosh", variant=f"{m.lower()}_{variant}", date=d,
                                      title="Pradosh", times=_day_times(d, place, "pradosh")))
        for d in _dates_for(year, place, m, "Krishna", 28, "pradosh", include_adhika=True):
            if d.year == year:
                wd = d.weekday()
                variant = "pradosh_" + ["mon", "tue", "wed", "thu", "fri", "sat", "sun"][wd]
                out.append(Occurrence(slug="pradosh", variant=f"{m.lower()}_{variant}", date=d,
                                      title="Pradosh", times=_day_times(d, place, "pradosh")))
        for d in _sankashti_dates(year, place, m):
            if d.year == year:
                out.append(Occurrence(slug="sankashti", variant=f"{m.lower()}_sankashti", date=d,
                                      title="Sankashti Chaturthi", times=_day_times(d, place, "moonrise")))
        for d in _dates_for(year, place, m, "Shukla", 4, None, include_adhika=True):
            if d.year == year:
                out.append(Occurrence(slug="vinayaka_chaturthi", variant=f"{m.lower()}_vinayaka", date=d,
                                      title="Vinayaka Chaturthi", times=_day_times(d, place, None)))
        for d in _dates_for(year, place, m, "Krishna", 29, None, include_adhika=True):
            if d.year == year:
                out.append(Occurrence(slug="masik_shivaratri", variant=f"{m.lower()}_shivaratri", date=d,
                                      title="Masik Shivaratri", times=_day_times(d, place, None)))
        for d in _dates_for(year, place, m, "Shukla", 8, None, include_adhika=True):
            if d.year == year:
                out.append(Occurrence(slug="masik_durgashtami", variant=f"{m.lower()}_durgashtami", date=d,
                                      title="Masik Durgashtami", times=_day_times(d, place, None)))
    return out


# ─── Series ───────────────────────────────────────────────────────────

def _navaratri_for(year: int, place: dict, month: str, slug: str, title: str,
                   dussehra: bool = True) -> list[Occurrence]:
    tzname = place.get("tz") or "Asia/Kolkata"
    zone = _zone(tzname)
    # Sunrise tithis 1..9 in the month's lunation, forms attached to tithis.
    # A tithi with no sunrise is folded into the date it begins on (handover
    # 4.1); a tithi with two sunrises gives two dates with the same form.
# Dashami is NOT a sunrise day here: Vijayadashami follows the afternoon
# rule like Dussehra (Drik 2026: 20 Oct, not the 21st). Drik's visarjan
# is observed on the Dashami-sunrise date when it differs (Drik 2027:
# parana on the 9th, visarjan on the 10th), but that is Drik behaviour,
# not a verified rule: visarjan is NOT computed, see below.
    days: list[DayEntry] = []
    seen_forms: dict[str, int] = {}
    first: Optional[date] = None
    last: Optional[date] = None
    ashtami_end: Optional[datetime] = None
    pratipada_date: Optional[date] = None
    for tithi_num in range(1, 10):
        paksha = "Shukla"
        ds = p._dates_for_tithi(year, place, month, paksha, tithi_num, "sunrise")
        if not ds:
            b = p._tithi_begin_date(year, place, month, paksha, tithi_num)
            ds = [b] if b and b.year == year else []
        for d in ds:
            if d.year != year:
                continue
            key = TITHI_KEYS[tithi_num - 1]
            _tk, form_key, form_name = NAVADURGA[tithi_num - 1]
            # Doubled tithi: two dates, same form, second marked.
            count = seen_forms.get(form_key, 0) + 1
            seen_forms[form_key] = count
            form = form_key
            label = form_name if count == 1 else f"{form_name}, second day"
            if first is None:
                first = d
            last = d
            if tithi_num == 1 and pratipada_date is None:
                pratipada_date = d
            days.append(DayEntry(date=d.isoformat(), tithi_key=key, label=label, form_key=form))
            if tithi_num == 8 and ashtami_end is None:
                try:
                    sr = p.sunrise(d, place)
                    if sr is not None and p.tithi_at(sr)[0] == 8:
                        ashtami_end = p.tithi_at(sr)[1]
                except Exception:
                    pass
    # Vijayadashami by the afternoon rule, Sharad only (Drik 2026 gives
    # 20 Oct, not the 21st; Drik 2027 gives 9 Oct). Chaitra ends on Navami
    # (Rama Navami + parana, no Dashami day: Drik Delhi 2026 ends 27 Mar,
    # 2027 ends 15 Apr). Visarjan is NOT computed: Drik puts it on
    # Vijayadashami day in 2026 but on the next day in 2027, and no verified
    # rule distinguishes the two (needs the digest's Durgotsava section).
    # Visarjan dates live in fixtures only.
    if dussehra:
        for d in _pick_single(year, place, month, "Shukla", 10, "afternoon"):
            days.append(DayEntry(date=d.isoformat(), tithi_key="dashami",
                                 label="Vijayadashami", form_key=""))
            if first is None:
                first = d
            last = d
    if first is None or last is None:
        return []
    # Kshaya Ashtami (no sunrise): find its span overlapping the series.
    if ashtami_end is None:
        try:
            lo = p._local_midnight_utc(first, tzname)
            hi = p._local_midnight_utc(last + timedelta(days=1), tzname)
            start8 = p._tithi_start_instant(lo - timedelta(days=3), 8)
            n8, end8 = p.tithi_at(start8 + timedelta(minutes=1))
            if n8 == 8 and start8 < hi and end8 > lo:
                ashtami_end = end8
        except Exception:
            pass
    days.sort(key=lambda e: e.date)
    times: list[TimeSpan] = []
    # Ghatasthapana muhurat: first third of daylight on Pratipada + Abhijit.
    if pratipada_date is not None:
        try:
            sr = p.sunrise(pratipada_date, place)
            ss = p.sunset(pratipada_date, place)
            if sr and ss:
                third = sr + (ss - sr) / 3
                times.append(TimeSpan(key="ghatasthapana", start=sr, end=third))
                day_len = (ss - sr).total_seconds()
                abh_s = sr + timedelta(seconds=day_len * 7 / 15)
                abh_e = sr + timedelta(seconds=day_len * 8 / 15)
                times.append(TimeSpan(key="abhijit", start=abh_s, end=abh_e))
                # Chitra / Vaidhriti notes are derived by the page from
                # nakshatra/yoga at the muhurat; store the instants.
                try:
                    nak, _ = p.nakshatra_at(sr + timedelta(minutes=30))
                    yog, _ = p.yoga_at(sr + timedelta(minutes=30))
                    if nak == "Chitra":
                        times.append(TimeSpan(key="note_chitra", start=sr, end=sr))
                    if yog == "Vaidhriti":
                        times.append(TimeSpan(key="note_vaidhriti", start=sr, end=sr))
                except Exception:
                    pass
        except Exception:
            pass
    if ashtami_end is not None:
        times.append(TimeSpan(key="sandhi_puja",
                              start=ashtami_end - timedelta(minutes=24),
                              end=ashtami_end + timedelta(minutes=24)))
    # Parana on the last tithi-day morning (Navami for Chaitra; the same
    # morning as Vijayadashami for Sharad: Drik 2026 gives homa+parana on
    # 20 Oct, Drik 2027 on 9 Oct).
    try:
        if last is not None:
            sr_last = p.sunrise(last, place)
            if sr_last is not None:
                times.append(TimeSpan(key="parana", start=sr_last, end=sr_last + timedelta(hours=2)))
    except Exception:
        pass
    occ = Occurrence(slug=slug, variant=slug, date=first, end_date=last,
                     times=times, day=days, title=title)
    return [occ]


def navaratri_occurrences(year: int, place: dict) -> list[Occurrence]:
    out: list[Occurrence] = []
    out += _navaratri_for(year, place, "Ashwina", "sharad_navaratri", "Sharad Navaratri",
                          dussehra=True)
    out += _navaratri_for(year, place, "Chaitra", "chaitra_navaratri", "Chaitra Navaratri",
                          dussehra=False)
    return out


def pitru_paksha_occurrences(year: int, place: dict) -> list[Occurrence]:
    out: list[Occurrence] = []
    try:
        rng = p.festival("Pitru Paksha", year, place)
    except LookupError:
        # Fallback: Bhadrapada Krishna 1 (tithi 16) to Amavasya (30) afternoons.
        starts = _dates_for(year, place, "Bhadrapada", "Krishna", 16, "afternoon")
        ends = _dates_for(year, place, "Bhadrapada", "Krishna", 30, "afternoon")
        if not starts or not ends:
            return []
        rng = (starts[0], ends[-1])
    if isinstance(rng, date):
        return []
    start, end = rng
    if start.year != year and end.year != year:
        return []
    # Day entries per tithi shraddha by the afternoon rule.
    days: list[DayEntry] = []
    specials = {1: "Pratipada Shraddha", 30: "Sarvapitru Amavasya"}
    for num in range(16, 31):
        ds = p._dates_for_tithi(year, place, "Bhadrapada", "Krishna", num, "afternoon")
        for d in ds:
            if not (start <= d <= end):
                continue
            key = TITHI_KEYS[num - 1]
            label = specials.get(num, f"{key.title()} Shraddha")
            days.append(DayEntry(date=d.isoformat(), tithi_key=key, label=label))
    days.sort(key=lambda e: e.date)
    out.append(Occurrence(slug="pitru_paksha", variant="pitru_paksha", date=start, end_date=end,
                          times=[], day=days, title="Pitru Paksha"))
    return out


def shraddha_date(tithi: int, year: int, place: dict) -> Optional[date]:
    """Date of one tithi's shraddha in that year's Pitru Paksha (afternoon rule)."""
    if not 1 <= tithi <= 30:
        return None
    # Map 1..15 Shukla Pratipada..Purnima? For shraddha picker both halves
    # Pratipada..Amavasya: 1..15 Shukla, 16..30 Krishna of Bhadrapada.
    if 1 <= tithi <= 15:
        ds = p._dates_for_tithi(year, place, "Bhadrapada", "Shukla" if tithi <= 15 else "Krishna",
                                tithi if tithi <= 15 else tithi, "afternoon")
        # Shukla half shraddhas fall before Pitru Paksha; use them only when
        # the caller asks for the bright half explicitly (rare).
        for d in ds:
            if d.year == year:
                return d
        return None
    ds = p._dates_for_tithi(year, place, "Bhadrapada", "Krishna", tithi, "afternoon")
    for d in ds:
        if d.year == year:
            return d
    return None


# ─── Periods ──────────────────────────────────────────────────────────

def _body_up(body, at_utc: datetime, obs) -> bool:
    """True when a body is above the horizon at the place (refraction on)."""
    import astronomy

    try:
        t = p._utc_to_time(at_utc)
        eq = astronomy.Equator(body, t, obs, True, True)
        hor = astronomy.Horizon(t, obs, eq.ra, eq.dec, astronomy.Refraction.Normal)
        return hor.altitude > 0.0
    except Exception:
        return False


def _span_visible_lunar(begin_utc: datetime, end_utc: datetime, obs) -> bool:
    """True when the Moon is up for any part of a lunar eclipse span.

    The old check compared only the peak with that date's sunrise and sunset,
    which misses an eclipse whose tail (or head) rises while the peak is in
    daylight (Delhi, 3 Mar 2026).
    """
    import astronomy

    span = (end_utc - begin_utc).total_seconds()
    if span <= 0:
        return _body_up(astronomy.Body.Moon, begin_utc, obs)
    for i in range(9):
        at = begin_utc + timedelta(seconds=span * i / 8)
        if _body_up(astronomy.Body.Moon, at, obs):
            return True
    return False


def _span_visible_solar(begin_utc: datetime, end_utc: datetime, obs) -> bool:
    """True when the Sun is up for any part of a solar eclipse span.

    SearchLocalSolarEclipse can report an eclipse that is partly or wholly
    below the horizon at the place (library docs), so check the span.
    """
    import astronomy

    span = (end_utc - begin_utc).total_seconds()
    if span <= 0:
        return _body_up(astronomy.Body.Sun, begin_utc, obs)
    for i in range(9):
        at = begin_utc + timedelta(seconds=span * i / 8)
        if _body_up(astronomy.Body.Sun, at, obs):
            return True
    return False


#: Lunar kinds that carry sutak. Penumbral lunar eclipses get no sutak
#: (Drik Feb-20-2027 penumbral page: Sutak Not Applicable; read 2026-10-11).
_LUNAR_SUTAK_KINDS = frozenset({"Total", "Partial"})
#: Solar kinds that carry sutak (all real local kinds).
_SOLAR_SUTAK_KINDS = frozenset({"Total", "Annular", "Partial"})


def _eclipse_kind_name(e) -> str:
    try:
        return str(e.kind).split(".")[-1]
    except Exception:
        return ""


def eclipse_occurrences(year: int, place: dict) -> list[Occurrence]:
    """Grahan sutak for eclipses of `year` visible at the place.

    UNSHIPPED (not in SHIPPED_RULES, never on the calendar): the texts
    state variable prahara/yama watches (Nirnaya Sindhu: lunar 3 praharas,
    solar 4), never fixed clock hours, and the fixed 9h/12h below does not
    match Drik (Mar-3-2026-Delhi begin-9h gives 05:16 vs Drik 09:39).
    Kept for engine tests only. An eclipse not visible at the place gets
    no sutak. Sutak ends at the umbral end, not the penumbral end.
    Penumbral lunar eclipses get no sutak.
    """
    out: list[Occurrence] = []
    import astronomy

    tzname = place.get("tz") or "Asia/Kolkata"
    zone = _zone(tzname)
    obs = astronomy.Observer(float(place["lat"]), float(place["lon"]), 0.0)
    jan1 = datetime(year, 1, 1, tzinfo=timezone.utc)
    jan1_next = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
    # Lunar eclipses.
    try:
        t = astronomy.Time.Make(year, 1, 1, 0, 0, 0)
        for _ in range(6):
            e = astronomy.SearchLunarEclipse(t)
            if e is None:
                break
            peak = p._time_to_utc(e.peak)
            if peak >= jan1_next + timedelta(days=40):
                break
            kind = _eclipse_kind_name(e)
            # NOTE: sd_penum/sd_partial/sd_total are SEMIDURATIONS IN
            # MINUTES (verified: Mar 2026 totals 169.6/103.9/29.7 against
            # Drik's 5:36/3:25/0:57 phase lengths, read 2026-10-11), not
            # days. timedelta(days=...) here once put eclipses months away.
            begin = peak - timedelta(minutes=float(e.sd_penum or 0.0))
            end = peak + timedelta(minutes=float(e.sd_penum or 0.0))
            # Sutak ends at the UMBRAL end, not the penumbral end (Drik
            # Mar-3-2026-Delhi: sutak ends 18:46 = umbra-last, while the
            # penumbra runs to 19:52).
            umbra_end = peak + timedelta(minutes=float(e.sd_partial or 0.0))
            t = astronomy.NextLunarEclipse(e.peak)
            if end < jan1 or begin >= jan1_next:
                continue
            if kind not in _LUNAR_SUTAK_KINDS:
                continue
            if not _span_visible_lunar(begin, end, obs):
                continue
            d = peak.astimezone(zone).date()
            out.append(Occurrence(
                slug="grahan_sutak", variant="lunar", date=d,
                times=[TimeSpan(key="eclipse", start=begin, end=end),
                       TimeSpan(key="sutak", start=begin - timedelta(hours=9), end=umbra_end)],
                title="Lunar eclipse sutak"))
    except Exception:
        pass
    # Solar eclipses, local to the place.
    try:
        t = astronomy.Time.Make(year, 1, 1, 0, 0, 0)
        for _ in range(6):
            e = astronomy.SearchLocalSolarEclipse(t, obs)
            if e is None:
                break
            peak = p._time_to_utc(e.peak)
            if peak >= jan1_next + timedelta(days=40):
                break
            kind = _eclipse_kind_name(e)
            t = astronomy.NextLocalSolarEclipse(e.peak, obs)
            try:
                begin = p._time_to_utc(e.partial_begin)
                end = p._time_to_utc(e.partial_end)
            except Exception:
                continue
            if end < jan1 or begin >= jan1_next:
                continue
            if kind not in _SOLAR_SUTAK_KINDS:
                continue
            if not _span_visible_solar(begin, end, obs):
                continue
            d = peak.astimezone(zone).date()
            out.append(Occurrence(
                slug="grahan_sutak", variant="solar", date=d,
                times=[TimeSpan(key="eclipse", start=begin, end=end),
                       TimeSpan(key="sutak", start=begin - timedelta(hours=12), end=end)],
                title="Solar eclipse sutak"))
    except Exception:
        pass
    return out


def panchaka_bhadra_kharmas(year: int, place: dict, start: date, days: int) -> list[Occurrence]:
    out: list[Occurrence] = []
    end = start + timedelta(days=days)
    d = start
    while d <= end:
        try:
            sr = p.sunrise(d, place)
            if sr is not None:
                nak, _ = p.nakshatra_at(sr)
                if nak in ("Dhanishta", "Shatabhisha", "Purva Bhadrapada",
                           "Uttara Bhadrapada", "Revati"):
                    # Start a Panchaka run: extend while the Moon stays there.
                    run_start = d
                    e = d
                    while e <= end:
                        sr2 = p.sunrise(e, place)
                        if sr2 is None:
                            break
                        n2, _ = p.nakshatra_at(sr2)
                        if n2 not in ("Dhanishta", "Shatabhisha", "Purva Bhadrapada",
                                      "Uttara Bhadrapada", "Revati"):
                            break
                        e += timedelta(days=1)
                    run_end = e - timedelta(days=1)
                    if not any(o.slug == "panchaka" and o.date == run_start for o in out):
                        out.append(Occurrence(slug="panchaka", variant="panchaka",
                                              date=run_start, end_date=run_end,
                                              title="Panchaka", times=[]))
                    d = e
                    continue
                # Bhadra: Vishti at sunrise or midday? Report the day when
                # Vishti holds at noon.
                noon = sr + timedelta(hours=6)
                if p.karana_at(noon)[0] == "Vishti":
                    out.append(Occurrence(slug="bhadra", variant="bhadra", date=d,
                                          title="Bhadra", times=[]))
        except Exception:
            pass
        # Kharmas: Sun in Dhanu (8) or Mina (11).
        try:
            noon_utc = p._utc_to_time(p._local_midnight_utc(d, place.get("tz") or "Asia/Kolkata")
                                      + timedelta(hours=12))
            sign = int(p._sidereal_sun(noon_utc) // 30) % 12
            if sign in (8, 11):
                if not any(o.slug == "kharmas" and o.date and o.end_date and o.date <= d <= o.end_date for o in out):
                    # Extend run.
                    rs, re = d, d
                    while re + timedelta(days=1) <= end:
                        try:
                            n2 = p._utc_to_time(p._local_midnight_utc(re + timedelta(days=1), place.get("tz") or "Asia/Kolkata") + timedelta(hours=12))
                            s2 = int(p._sidereal_sun(n2) // 30) % 12
                        except Exception:
                            break
                        if s2 not in (8, 11):
                            break
                        re += timedelta(days=1)
                    out.append(Occurrence(slug="kharmas", variant="kharmas", date=rs, end_date=re,
                                          title="Kharmas", times=[]))
        except Exception:
            pass
        d += timedelta(days=1)
    return out


def holashtak_adhika_chaturmas(year: int, place: dict) -> list[Occurrence]:
    out: list[Occurrence] = []
    # Holashtak: 8 days ending on Holi eve (Phalguna Shukla 14?); use Holi - 8..-1.
    try:
        holis = _dates_for(year, place, "Phalguna", "Shukla", 15, "pradosh")
        # Holi is day after Holika; approximate Holashtak from Holika.
        for hd in holis:
            hs = hd - timedelta(days=8)
            he = hd - timedelta(days=1)
            if he.year == year or hs.year == year:
                out.append(Occurrence(slug="holashtak", variant="holashtak", date=hs, end_date=he,
                                      title="Holashtak", times=[]))
    except Exception:
        pass
    # Adhika masa: lunations with no sankranti.
    try:
        for nm in p._lunations(year, place):
            try:
                m, sign = p.amanta_month(nm)
                nm_next = p._time_to_utc(
                    __import__("astronomy").SearchMoonPhase(0.0, p._utc_to_time(nm + timedelta(days=1)), 32.0)
                )
                _, sign_next = p.amanta_month(nm_next)
            except Exception:
                continue
            if sign_next == sign:
                tzname = place.get("tz") or "Asia/Kolkata"
                zone = _zone(tzname)
                try:
                    first, last = p._month_bounds(nm, nm_next, place)
                except Exception:
                    continue
                if last.year == year or first.year == year:
                    out.append(Occurrence(slug="adhika_masa", variant=f"adhika_{m.lower()}",
                                          date=first, end_date=last,
                                          title=f"Adhika {m}", times=[]))
    except Exception:
        pass
    # Chaturmas: Devashayani (Ashadha Shukla 11) to Prabodhini (Kartika Shukla 11).
    try:
        sh = ekadashi_occurrences(year, place)
        dev = next((o for o in sh if o.variant == "devashayani"), None)
        pro = next((o for o in sh if o.variant == "prabodhini"), None)
        if dev and pro and dev.date and pro.date:
            out.append(Occurrence(slug="chaturmas", variant="chaturmas", date=dev.date,
                                  end_date=pro.date, title="Chaturmas", times=[]))
    except Exception:
        pass
    return out


# ─── Top-level ────────────────────────────────────────────────────────

# Only simultaneous calculations for the same year/place/tradition wait on
# one another. Retire each lock when its last caller leaves; no location data
# persists beyond the existing bounded, in-process astronomical cache.
_year_calls_guard = Lock()
_year_calls: dict[tuple, list] = {}


@lru_cache(maxsize=128)
def _cached_year_occurrences(year: int, lat: float, lon: float, tz: str, tradition: str,
                             shipped: frozenset[str]) -> tuple[Occurrence, ...]:
    # Calendar windows and detail pages reuse the astronomical year.
    place = {"lat": lat, "lon": lon, "tz": tz}
    return tuple(_compute_year_occurrences(year, place, tradition))


def _year_occurrences(year: int, place: dict, tradition: str = "north") -> list[Occurrence]:
    key = (year, float(place["lat"]), float(place["lon"]), place.get("tz") or "Asia/Kolkata",
           tradition, frozenset(SHIPPED_RULES))
    with _year_calls_guard:
        pending = _year_calls.setdefault(key, [Lock(), 0])
        pending[1] += 1
    try:
        with pending[0]:
            result = _cached_year_occurrences(*key)
        return deepcopy(list(result))
    finally:
        with _year_calls_guard:
            pending[1] -= 1
            if pending[1] == 0:
                _year_calls.pop(key, None)


def _compute_year_occurrences(year: int, place: dict, tradition: str = "north") -> list[Occurrence]:
    out: list[Occurrence] = []
    if "ekadashi" in SHIPPED_RULES:
        out += ekadashi_occurrences(year, place, tradition)
    if "purnima" in SHIPPED_RULES:
        out += purnima_occurrences(year, place)
    if "amavasya" in SHIPPED_RULES:
        out += amavasya_occurrences(year, place)
    out += [o for o in phase1_festivals(year, place) if o.slug in SHIPPED_RULES]
    out += [o for o in sankranti_occurrences(year, place) if o.slug in SHIPPED_RULES]
    out += [o for o in shipped_panchang_festivals(year, place) if o.slug in SHIPPED_RULES]
    out += [o for o in monthly_vrats(year, place) if o.slug in SHIPPED_RULES]
    out += [o for o in phase2_festivals(year, place) if o.slug in SHIPPED_RULES]
    out += [o for o in navaratri_occurrences(year, place) if o.slug in SHIPPED_RULES]
    out += [o for o in pitru_paksha_occurrences(year, place) if o.slug in SHIPPED_RULES]
    if "grahan_sutak" in SHIPPED_RULES:
        out += eclipse_occurrences(year, place)
    out += [o for o in holashtak_adhika_chaturmas(year, place) if o.slug in SHIPPED_RULES]
    return out


def occurrences(start: date, days: int, place: dict, tradition: str = "north") -> list[Occurrence]:
    """All occurrences overlapping [start, start+days), sorted."""
    if days < 1:
        return []
    end = start + timedelta(days=days - 1)
    years = sorted({start.year, end.year})
    trad = tradition if tradition in ("north", "deccan", "gujarat", "tamil", "kerala", "bengal") else "north"
    all_occs: list[Occurrence] = []
    for y in years:
        try:
            all_occs += _year_occurrences(y, place, trad)
        except Exception:
            continue
    # Periods that need the window (panchaka/bhadra/kharmas scan the window).
    # Computed only when at least one of them ships; unshipped rules produce
    # nothing, per policy.
    if SHIPPED_RULES & {"panchaka", "bhadra", "kharmas"}:
        try:
            all_occs += panchaka_bhadra_kharmas(years[0], place, start - timedelta(days=2), days + 4)
        except Exception:
            pass
    # Keep those overlapping the window. Series/periods with end_date overlap
    # when any part lies inside.
    kept: list[Occurrence] = []
    for o in all_occs:
        if o.slug not in SHIPPED_RULES:
            continue
        sd = o.date
        ed = o.end_date or o.date
        if sd is None or ed is None:
            continue
        if ed < start or sd > end:
            # Series days may still touch the window even when the series
            # endpoints do not (long series); check day entries.
            if o.day:
                if any(start.isoformat() <= e.date <= end.isoformat() for e in o.day):
                    kept.append(o)
                continue
            continue
        kept.append(o)
    kept.sort(key=lambda o: (o.date or date.min, o.slug, o.variant))
    return kept
