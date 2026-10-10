"""Phase 0: the crossing fix.

_next_crossing used to fall back to span/13 degrees a day whenever the value
wrapped past 360 inside its two-day window. Vaidhriti (the 27th yoga) always
took that path. The fix unwraps the run modulo the period and bisects, the
same as the phone engine (mobile/src/kala/engine.ts nextCrossing).

Fixtures: Drik Panchang day pages for New Delhi, read 2026-10-10 in the
handover (Vaidhriti ends 21:05, Indra ends 22:02). The two September
nakshatra ends are held to the phone engine (11:07, 10:16 IST); Drik pages
for those dates were not opened in this work (see handover result).
"""

from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from app.services import panchang as p

DELHI = {"lat": 28.6139, "lon": 77.2090, "tz": "Asia/Kolkata", "label": "New Delhi"}
IST = ZoneInfo("Asia/Kolkata")


def _ist_hhmm(dt):
    return dt.astimezone(IST).strftime("%H:%M")


def _mins(hhmm):
    h, m = hhmm.split(":")
    return int(h) * 60 + int(m)


def _apart(a, b):
    d = abs(_mins(a) - _mins(b))
    return min(d, 1440 - d)


def test_vaidhriti_ends_2105_11_oct_2026():
    anchor = datetime(2026, 10, 11, 0, 30, tzinfo=timezone.utc)
    name, end = p.yoga_at(anchor)
    assert name == "Vaidhriti", (name, end)
    assert _apart(_ist_hhmm(end), "21:05") <= 2, (name, _ist_hhmm(end))


def test_indra_ends_2202_10_oct_2026():
    anchor = datetime(2026, 10, 10, 0, 30, tzinfo=timezone.utc)
    name, end = p.yoga_at(anchor)
    assert name == "Indra", (name, end)
    assert _apart(_ist_hhmm(end), "22:02") <= 2, (name, _ist_hhmm(end))


def test_nakshatra_ends_sep_2026():
    anchor27 = datetime(2026, 9, 27, 0, 30, tzinfo=timezone.utc)
    name27, end27 = p.nakshatra_at(anchor27)
    assert name27 == "Uttara Bhadrapada", (name27, end27)
    assert _apart(_ist_hhmm(end27), "11:07") <= 2, (name27, _ist_hhmm(end27))
    anchor28 = datetime(2026, 9, 28, 0, 30, tzinfo=timezone.utc)
    name28, end28 = p.nakshatra_at(anchor28)
    assert name28 == "Revati", (name28, end28)
    assert _apart(_ist_hhmm(end28), "10:16") <= 2, (name28, _ist_hhmm(end28))


def test_no_fallback_line():
    import inspect

    src = inspect.getsource(p._next_crossing)
    assert "span / 13" not in src, "fallback estimate must be gone"


def test_every_boundary_is_real_over_2026():
    """Sweep: each reported end is a real boundary, lengths sane."""
    from datetime import timedelta

    base = datetime(2024, 1, 3, 1, 17, tzinfo=timezone.utc)
    for i in range(60):
        at = base + timedelta(days=16.3741 * i)
        # Nakshatra
        lon = p._sidereal_moon(p._utc_to_time(at))
        idx = int(lon // (360.0 / 27.0)) % 27
        _name, end = p.nakshatra_at(at)
        before = p._sidereal_moon(p._utc_to_time(end - timedelta(seconds=20)))
        after = p._sidereal_moon(p._utc_to_time(end + timedelta(seconds=20)))
        assert int(before // (360.0 / 27.0)) % 27 == idx
        assert int(after // (360.0 / 27.0)) % 27 == (idx + 1) % 27

        def _total(u):
            t = p._utc_to_time(u)
            return (p._sidereal_sun(t) + p._sidereal_moon(t)) % 360.0

        ylon = _total(at)
        yidx = int(ylon // (360.0 / 27.0)) % 27
        _yn, yend = p.yoga_at(at)
        yb = _total(yend - timedelta(seconds=20))
        ya = _total(yend + timedelta(seconds=20))
        assert int(yb // (360.0 / 27.0)) % 27 == yidx
        assert int(ya // (360.0 / 27.0)) % 27 == (yidx + 1) % 27


def test_month_of_adhika_7_june_2026():
    from datetime import date

    am, _pm, adhika = p.month_of(date(2026, 6, 7), DELHI)
    assert adhika
    assert am == "Adhika Jyeshtha", am


def test_samvat_turns_at_chaitra_pratipada():
    from datetime import date

    vs18, _ = p.samvat(date(2026, 3, 18), DELHI)
    vs20, _ = p.samvat(date(2026, 3, 20), DELHI)
    assert vs18 == 2082, vs18
    assert vs20 == 2083, vs20
    vs_oct, shaka = p.samvat(date(2026, 10, 1), DELHI)
    assert (vs_oct, shaka) == (2083, 1948)
