"""Panchang calculations: the Drik Panchang fixture and the festival table.

The day fixture is Drik Panchang for New Delhi, 1 October 2026 (read
2026-10-01). Tolerances: two minutes on sunrise, sunset and the tithi end,
three on nakshatra, yoga and karana.

The festival dates are Drik Panchang's festival calendar for New Delhi (read
2026-10-01). Only festivals whose rule reproduces BOTH the 2026 and the 2027
date ship (Pitru Paksha: 2026 only, 2027 was not read). Never hardcode a date
to make a test pass.
"""

from datetime import date

import pytest

from app.services import panchang

DELHI = {"lat": 28.6139, "lon": 77.2090, "tz": "Asia/Kolkata", "label": "New Delhi"}


def _mins(hhmm: str) -> int:
    h, m = hhmm.split(":")
    return int(h) * 60 + int(m)


def test_day_fixture_new_delhi_1_oct_2026():
    d = panchang.day(date(2026, 10, 1), DELHI)
    assert abs(_mins(d["sunrise"]) - _mins("06:14")) <= 2, d
    assert abs(_mins(d["sunset"]) - _mins("18:07")) <= 2, d
    assert d["tithi"] == "Krishna Panchami", d
    assert abs(_mins(d["tithi_end"]) - _mins("12:35")) <= 2, d
    assert d["tithi_next"] == "Krishna Shashthi", d
    assert d["nakshatra"] == "Rohini", d
    assert d["yoga"] == "Siddhi", d
    assert d["karana"] == "Taitila", d
    assert abs(_mins(d["karana_end"]) - _mins("12:35")) <= 3, d
    assert d["karana_next"] == "Garaja", d
    assert d["weekday"] == "Thursday", d
    assert d["month_amanta"] == "Bhadrapada", d
    assert d["month_purnimanta"] == "Ashwina", d
    assert d["vikram_samvat"] == 2083, d
    assert d["shaka"] == 1948, d


def test_nakshatra_yoga_karana_ends_within_three_minutes():
    d = panchang.day(date(2026, 10, 1), DELHI)
    # Rohini runs past midnight into 2 October 04:27; the end clock time is
    # on the next civil date but still reported as HH:MM.
    assert abs(_mins(d["nakshatra_end"]) - _mins("04:27")) <= 3, d
    assert abs(_mins(d["yoga_end"]) - _mins("21:18")) <= 3, d
    assert abs(_mins(d["karana_next_end"]) - _mins("23:24")) <= 3, d


FESTIVALS_2026 = {
    "Makara Sankranti": date(2026, 1, 14),
    "Vasant Panchami": date(2026, 1, 23),
    "Maha Shivaratri": date(2026, 2, 15),
    "Holika Dahan": date(2026, 3, 3),
    "Holi": date(2026, 3, 4),
    "Ugadi": date(2026, 3, 19),
    "Rama Navami": date(2026, 3, 26),
    "Buddha Purnima": date(2026, 5, 1),
    "Guru Purnima": date(2026, 7, 29),
    "Raksha Bandhan": date(2026, 8, 28),
    "Krishna Janmashtami": date(2026, 9, 4),
    "Ganesh Chaturthi": date(2026, 9, 14),
    "Durga Ashtami": date(2026, 10, 19),
    "Maha Navami": date(2026, 10, 19),
    "Dussehra": date(2026, 10, 20),
    "Karwa Chauth": date(2026, 10, 29),
    "Diwali": date(2026, 11, 8),
    "Govardhan Puja": date(2026, 11, 10),
    "Bhai Dooj": date(2026, 11, 11),
    "Chhath Puja": date(2026, 11, 15),
    "Kartik Purnima": date(2026, 11, 24),
}

FESTIVALS_2027 = {
    "Makara Sankranti": date(2027, 1, 15),
    "Vasant Panchami": date(2027, 2, 11),
    "Maha Shivaratri": date(2027, 3, 6),
    "Holika Dahan": date(2027, 3, 21),
    "Holi": date(2027, 3, 22),
    "Ugadi": date(2027, 4, 7),
    "Rama Navami": date(2027, 4, 15),
    "Buddha Purnima": date(2027, 5, 20),
    "Guru Purnima": date(2027, 7, 18),
    "Raksha Bandhan": date(2027, 8, 17),
    "Krishna Janmashtami": date(2027, 8, 25),
    "Ganesh Chaturthi": date(2027, 9, 4),
    "Durga Ashtami": date(2027, 10, 7),
    "Maha Navami": date(2027, 10, 8),
    "Dussehra": date(2027, 10, 9),
    "Karwa Chauth": date(2027, 10, 18),
    "Diwali": date(2027, 10, 29),
    "Govardhan Puja": date(2027, 10, 30),
    "Bhai Dooj": date(2027, 10, 31),
    "Chhath Puja": date(2027, 11, 4),
    "Kartik Purnima": date(2027, 11, 14),
}


@pytest.mark.parametrize("name,expected", sorted(FESTIVALS_2026.items()))
def test_festival_2026(name, expected):
    if name not in panchang.SHIPPED_FESTIVALS:
        pytest.skip(f"{name} not shipped: rule does not reproduce both years")
    got = panchang.festival(name, 2026, DELHI)
    assert got == expected, f"{name}: got {got}, want {expected}"


@pytest.mark.parametrize("name,expected", sorted(FESTIVALS_2027.items()))
def test_festival_2027(name, expected):
    if name not in panchang.SHIPPED_FESTIVALS:
        pytest.skip(f"{name} not shipped: rule does not reproduce both years")
    got = panchang.festival(name, 2027, DELHI)
    assert got == expected, f"{name}: got {got}, want {expected}"


def test_pitru_paksha_2026_range():
    got = panchang.festival("Pitru Paksha", 2026, DELHI)
    assert got == (date(2026, 9, 27), date(2026, 10, 10)), got


def test_unknown_festival_raises():
    with pytest.raises(LookupError):
        panchang.festival("Christmas", 2026, DELHI)


def test_unshipped_festival_raises():
    for name in ("Ugadi", "Holi", "Raksha Bandhan", "Maha Navami", "Govardhan Puja"):
        with pytest.raises(LookupError):
            panchang.festival(name, 2026, DELHI)


def test_adhika_month_is_detected():
    # 2026 has an extra lunar month before the autumn festivals (handover
    # appendix B): mid-June must fall in an adhika month.
    _amanta, _purni, adhika = panchang.month_of(date(2026, 6, 1), DELHI)
    assert adhika, (_amanta, _purni)
