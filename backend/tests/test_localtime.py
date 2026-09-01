"""Learner-local day boundary.

The bug these exist to prevent: computing the daily-activity date in server
UTC. In IST (UTC+5:30) that credits everything practised between 00:00 and
05:30 local to the *previous* day, so a learner who studies Monday evening and
again at 1am Tuesday gets both credited to Monday, Tuesday records nothing,
and their streak breaks despite two consecutive days of practice.
"""

from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest

from app.services.localtime import (
    learner_today,
    local_date,
    local_date_of,
    resolve_tz,
)


# ─── the regression this file exists for ───

def test_ist_after_midnight_is_the_new_local_day_not_the_previous_utc_day():
    """1:00am IST on 2 Sept is 19:30 UTC on 1 Sept. The learner's day is the 2nd."""
    instant = datetime(2026, 9, 1, 19, 30, tzinfo=timezone.utc)

    assert instant.strftime("%Y-%m-%d") == "2026-09-01"          # what UTC says
    assert local_date_of(instant, "Asia/Kolkata") == "2026-09-02"  # what the learner lived


def test_ist_evening_and_following_small_hours_are_two_distinct_days():
    """Mon 23:00 IST and Tue 01:00 IST must not collapse into one day.

    Under the UTC bug both land on Monday, Tuesday gets no credit, and the
    streak breaks for a learner who practised on consecutive days.
    """
    monday_evening = datetime(2026, 8, 31, 17, 30, tzinfo=timezone.utc)  # Mon 23:00 IST
    tuesday_small_hours = datetime(2026, 9, 1, 19, 30, tzinfo=timezone.utc)  # Tue 01:00 IST

    d1 = local_date_of(monday_evening, "Asia/Kolkata")
    d2 = local_date_of(tuesday_small_hours, "Asia/Kolkata")

    assert d1 == "2026-08-31"
    assert d2 == "2026-09-02"
    assert d1 != d2, "consecutive-day practice collapsed into a single day"


def test_the_utc_boundary_is_0530_in_ist():
    """Sweep the IST day boundary: 05:29 IST is still yesterday in UTC terms."""
    just_before = datetime(2026, 9, 1, 18, 29, tzinfo=timezone.utc)  # 23:59 IST 1 Sep
    just_after = datetime(2026, 9, 1, 18, 31, tzinfo=timezone.utc)   # 00:01 IST 2 Sep

    assert local_date_of(just_before, "Asia/Kolkata") == "2026-09-01"
    assert local_date_of(just_after, "Asia/Kolkata") == "2026-09-02"


# ─── timezones behind UTC (the diaspora thesis) ───

def test_us_timezone_behind_utc_resolves_to_the_previous_day():
    """20:00 New York on 1 Sept is 00:00 UTC on 2 Sept — the learner's day is the 1st."""
    instant = datetime(2026, 9, 2, 0, 0, tzinfo=timezone.utc)
    assert local_date_of(instant, "America/New_York") == "2026-09-01"


def test_utc_learner_is_unchanged_by_the_fix():
    """Existing rows default to UTC and must behave exactly as before."""
    instant = datetime(2026, 9, 1, 19, 30, tzinfo=timezone.utc)
    assert local_date_of(instant, "UTC") == "2026-09-01"


# ─── resolution never raises ───

@pytest.mark.parametrize("bad", ["", None, "   ", "Not/AZone", "Mars/Olympus", ";drop"])
def test_unknown_timezone_falls_back_to_utc_without_raising(bad):
    """A wrong-by-hours date beats a 500 on the progress screen."""
    tz = resolve_tz(bad)
    assert str(tz) == "UTC"


def test_naive_datetime_is_treated_as_utc():
    """Every timestamp this project stores is written by models._utcnow."""
    naive = datetime(2026, 9, 1, 19, 30)
    assert local_date_of(naive, "Asia/Kolkata") == "2026-09-02"


def test_local_date_matches_a_manually_converted_now():
    expected = datetime.now(timezone.utc).astimezone(resolve_tz("Asia/Kolkata")).strftime("%Y-%m-%d")
    assert local_date("Asia/Kolkata") == expected


def test_learner_today_reads_the_learners_own_timezone():
    learner = SimpleNamespace(timezone="Asia/Kolkata")
    assert learner_today(learner) == local_date("Asia/Kolkata")


def test_learner_without_timezone_attribute_falls_back_to_utc():
    """Defensive: a learner row loaded before the column existed."""
    assert learner_today(SimpleNamespace()) == local_date("UTC")


# ─── end to end through the API ───

def test_progress_daily_reports_the_learner_local_date(client, auth_headers):
    r = client.patch("/me", json={"timezone": "Asia/Kolkata"}, headers=auth_headers)
    assert r.status_code == 200, r.text
    assert r.json()["learner"]["timezone"] == "Asia/Kolkata"

    r = client.get("/progress/daily", headers=auth_headers)
    assert r.status_code == 200, r.text
    assert r.json()["date"] == local_date("Asia/Kolkata")


def test_changing_timezone_changes_the_reported_day_boundary(client, auth_headers):
    """Two learners mid-boundary must not be forced onto the same date."""
    client.patch("/me", json={"timezone": "Pacific/Kiritimati"}, headers=auth_headers)  # UTC+14
    east = client.get("/progress/daily", headers=auth_headers).json()["date"]

    client.patch("/me", json={"timezone": "Pacific/Midway"}, headers=auth_headers)  # UTC-11
    west = client.get("/progress/daily", headers=auth_headers).json()["date"]

    # 25 hours apart — they can never be on the same calendar date.
    assert east != west
    assert east == local_date("Pacific/Kiritimati")
    assert west == local_date("Pacific/Midway")


def test_unknown_timezone_from_a_client_does_not_break_progress(client, auth_headers):
    """A junk tz must degrade to UTC, not 500 the progress screen."""
    r = client.patch("/me", json={"timezone": "Not/AZone"}, headers=auth_headers)
    assert r.status_code == 200

    r = client.get("/progress/daily", headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["date"] == local_date("UTC")


def test_anonymous_login_accepts_and_persists_a_timezone(client):
    r = client.post(
        "/auth/anonymous",
        json={"install_id": "tz-install-id-000001", "timezone": "Asia/Kolkata"},
    )
    assert r.status_code == 200, r.text
    assert r.json()["learner"]["timezone"] == "Asia/Kolkata"

    headers = {"Authorization": f"Bearer {r.json()['token']}"}
    assert client.get("/me", headers=headers).json()["learner"]["timezone"] == "Asia/Kolkata"


def test_returning_device_updates_a_changed_timezone(client):
    """The learner travelled; their day boundary should follow the device."""
    install = "tz-install-id-000002"
    client.post("/auth/anonymous", json={"install_id": install, "timezone": "Asia/Kolkata"})

    r = client.post("/auth/anonymous", json={"install_id": install, "timezone": "Europe/London"})
    assert r.status_code == 200
    assert r.json()["learner"]["timezone"] == "Europe/London"


def test_login_without_a_timezone_defaults_to_utc(client):
    r = client.post("/auth/anonymous", json={"install_id": "tz-install-id-000003"})
    assert r.status_code == 200
    assert r.json()["learner"]["timezone"] == "UTC"
