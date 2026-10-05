"""Birth charts by calculation (services/kundli.py).

The planet figures below are NASA JPL Horizons' observer tables (quantity 31,
geocentric apparent ecliptic-of-date longitude), fetched 2026-10-05 from
ssd.jpl.nasa.gov/api/horizons.api. The lagna is checked against a direct
search of the eastern horizon with astronomy-engine, a method independent of
the closed formula in kundli.ascendant.
"""

from datetime import datetime, timedelta, timezone

import astronomy as A
import pytest

from app.services import kundli as K

HORIZONS = {
    datetime(1990, 6, 15, 5, 30, tzinfo=timezone.utc): {
        "Sun": 83.8708654, "Moon": 341.7521703, "Mercury": 65.2276365, "Venus": 48.4591222,
        "Mars": 10.8465408, "Jupiter": 105.8308241, "Saturn": 294.0477745,
    },
    datetime(2026, 10, 5, 6, 30, tzinfo=timezone.utc): {
        "Sun": 192.0414508, "Moon": 124.4245248, "Mercury": 216.1338101, "Venus": 218.415516,
        "Mars": 124.1591975, "Jupiter": 140.3431379, "Saturn": 11.2429939,
    },
}


@pytest.mark.parametrize("when", list(HORIZONS))
def test_planets_match_jpl_horizons(when):
    t = K._time(when)
    for name, expected in HORIZONS[when].items():
        got = K.tropical_longitude(getattr(A.Body, name), t)
        assert abs(K._signed_delta(expected, got)) < 0.01, (name, expected, got)


def _rising_point(t, lat, lon):
    """The ecliptic longitude on the eastern horizon, found by search."""
    obs = A.Observer(lat, lon, 0)
    to_eqj = A.InverseRotation(A.Rotation_EQJ_ECT(t))
    to_eqd = A.Rotation_EQJ_EQD(t)

    def alt_az(lam):
        v = A.VectorFromSphere(A.Spherical(0.0, lam % 360.0, 1.0), t)
        eq = A.EquatorFromVector(A.RotateVector(to_eqd, A.RotateVector(to_eqj, v)))
        h = A.Horizon(t, obs, eq.ra, eq.dec, A.Refraction.Airless)
        return h.altitude, h.azimuth

    lam, prev = 0.0, alt_az(0.0)[0]
    while lam < 360.0:
        nxt = alt_az(lam + 1.0)[0]
        if (prev <= 0) != (nxt <= 0):
            lo, hi = lam, lam + 1.0
            for _ in range(30):
                mid = (lo + hi) / 2
                if (alt_az(lo)[0] <= 0) == (alt_az(mid)[0] <= 0):
                    lo = mid
                else:
                    hi = mid
            root = ((lo + hi) / 2) % 360.0
            if 0 < alt_az(root)[1] < 180:
                return root
        prev, lam = nxt, lam + 1.0
    raise AssertionError("no rising point found")


@pytest.mark.parametrize("when,lat,lon", [
    (datetime(1990, 6, 15, 5, 30, tzinfo=timezone.utc), 28.6, 77.2),
    (datetime(1975, 3, 3, 1, 5, tzinfo=timezone.utc), -33.9, 151.2),
])
def test_lagna_formula_matches_horizon_search(when, lat, lon):
    t = K._time(when)
    assert abs(K._signed_delta(_rising_point(t, lat, lon), K.ascendant(t, lat, lon))) < 0.01


def test_naming_helpers():
    assert K.sign_of(0.0) == 0 and K.sign_of(359.9) == 11
    assert K.nakshatra_of(0.0) == (0, 1)
    assert K.nakshatra_of(K.NAK_SPAN - 0.01) == (0, 4)
    assert K.nakshatra_of(359.99) == (26, 4)
    # Navamsha: movable signs start from themselves, fixed from the ninth,
    # dual from the fifth.
    assert K.navamsa_sign(0.0) == 0      # Aries -> Aries
    assert K.navamsa_sign(30.0) == 9     # Taurus -> Capricorn
    assert K.navamsa_sign(60.0) == 6     # Gemini -> Libra
    assert K.navamsa_sign(90.0) == 3     # Cancer -> Cancer
    assert K.house_from(0, 0) == 1 and K.house_from(11, 0) == 12 and K.house_from(0, 11) == 2
    assert K.dms(12.5) == "12°30'"
    assert K.dignity("Sun", 0) == "exalted" and K.dignity("Sun", 6) == "debilitated"
    assert K.dignity("Saturn", 10) == "own sign" and K.dignity("Rahu", 2) == ""


def test_vimshottari_balance_and_order():
    birth = datetime(2000, 1, 1, tzinfo=timezone.utc)
    # The Moon at the very start of Ashwini: all seven years of Ketu remain.
    m = K.mahadashas(0.0, birth, 3)
    assert [p["lord"] for p in m] == ["Ketu", "Venus", "Sun"]
    assert m[0]["start"] == birth
    assert m[0]["end"] - m[0]["start"] == timedelta(days=7 * K.YEAR_DAYS)
    # Halfway through Bharani: half of Venus's twenty years remain.
    m = K.mahadashas(K.NAK_SPAN * 1.5, birth, 1)[0]
    assert m["lord"] == "Venus"
    assert abs((m["end"] - birth) - timedelta(days=10 * K.YEAR_DAYS)) < timedelta(seconds=1)
    # The nine sub-periods start with the period's own lord and fill it.
    subs = K.antardashas(m)
    assert subs[0]["lord"] == "Venus" and len(subs) == 9
    assert abs(subs[-1]["end"] - m["end"]) < timedelta(seconds=1)


def test_chart_with_and_without_birth_time():
    now = datetime(2026, 10, 5, 6, 30, tzinfo=timezone.utc)
    born = K.birth_moment("1990-06-15", "11:00", "Asia/Kolkata")
    c = K.chart(born, 28.6, 77.2, now=now)
    assert c["lagna"] is not None and c["conventions"]["ayanamsa"] == "Lahiri"
    assert [p["key"] for p in c["planets"]] == [g[0] for g in K.GRAHAS]
    sun = next(p for p in c["planets"] if p["key"] == "sun")
    # 15 June 1990, 05:30 UT: the Sun has just entered sidereal Gemini.
    assert sun["sign_en"] == "Gemini"
    rahu = next(p for p in c["planets"] if p["key"] == "rahu")
    ketu = next(p for p in c["planets"] if p["key"] == "ketu")
    assert abs(((ketu["lon"] - rahu["lon"]) % 360.0) - 180.0) < 1e-6
    assert c["dasha"]["maha"] and c["dasha"]["antar"]
    text = K.facts_text(c)
    assert text.startswith("CHART (calculated by the app")
    assert "Lagna (ascendant):" in text and "Vimshottari dasha now:" in text

    blind = K.chart(K.birth_moment("1990-06-15", "", "Asia/Kolkata", time_known=False),
                    28.6, 77.2, time_known=False, now=now)
    assert blind["lagna"] is None
    assert "from the Moon" in blind["conventions"]["houses"]
    moon = next(p for p in blind["planets"] if p["key"] == "moon")
    assert moon["house"] == 1
    assert "Lagna: unknown" in K.facts_text(blind)


@pytest.mark.parametrize("day,clock", [("15-06-1990", "11:00"), ("1890-01-01", "11:00"),
                                       ("1990-06-15", "25:00"), ("1990-06-15", "noon")])
def test_bad_birth_details_are_refused(day, clock):
    with pytest.raises(K.BirthError):
        K.birth_moment(day, clock, "Asia/Kolkata")
