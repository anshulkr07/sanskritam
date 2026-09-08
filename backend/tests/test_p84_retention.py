"""P8-4 — the question 10 people answer, with thresholds written first."""

from datetime import datetime, timedelta, timezone

from app.db import SessionLocal
from app.models import DailyActivity, Learner
from app.services.retention import (
    P8_QUESTION,
    P8_THRESHOLDS,
    day2_return,
    first_session_dates,
    p8_report,
)

ADMIN = {"X-Admin-Token": "test-admin"}


def _learner(db, name="p84user"):
    import uuid
    learner = Learner(id="p84-" + uuid.uuid4().hex[:8], display_name=name, bridge_langs=["en", "hi"])
    db.add(learner)
    db.commit()
    db.refresh(learner)
    return learner


def _active(db, learner, day):
    db.add(DailyActivity(learner_id=learner.id, date=day, xp=10, attempts=2))
    db.commit()


def test_thresholds_are_sane_and_written_first():
    assert isinstance(P8_QUESTION, str) and len(P8_QUESTION) > 20
    t = P8_THRESHOLDS
    assert 0 < t["escape_rate_max"] < 1
    assert 0 < t["tts_live_share_max"] <= 1
    assert 0 < t["day2_return_min"] < 1
    assert t["min_first_sessions"] == 10


def test_day2_counts_only_eligible_cohort():
    db = SessionLocal()
    try:
        # Test learners default to UTC, so "today" is the UTC date — never
        # server-local date.today(), which straddles midnight in IST (§2.8).
        today = datetime.now(timezone.utc).date()
        yday = (today - timedelta(days=1)).isoformat()
        today_s = today.isoformat()
        old = (today - timedelta(days=5)).isoformat()
        # A: first yesterday, active today → returned.
        a = _learner(db, "p84-a")
        _active(db, a, yday)
        _active(db, a, today_s)
        # C: first 5 days ago, never again → cohort, not returned.
        c = _learner(db, "p84-c")
        _active(db, c, old)
        first = first_session_dates(db)
        assert first[a.id] == yday
        out = day2_return(db)
        assert out["cohort"] >= 2
        assert out["returned"] >= 1
        assert 0.0 <= out["day2_return"] <= 1.0
    finally:
        db.close()


def test_first_session_today_excluded():
    """A learner whose first date is today has no day 2 yet — excluded."""
    from app.services.retention import record_today_activity
    db = SessionLocal()
    try:
        learner = _learner(db, "p84-today")
        before = day2_return(db)["cohort"]
        record_today_activity(db, learner)
        after = day2_return(db)["cohort"]
        assert after == before  # today-first learners never enter the denominator
    finally:
        db.close()


def test_p8_report_shape_and_admin_metrics(client):
    db = SessionLocal()
    try:
        rep = p8_report(db)
        assert rep["question"] == P8_QUESTION
        assert set(rep) == {"question", "thresholds", "escape_rate", "tts_share",
                            "retention", "checks", "pass"}
        assert set(rep["checks"]) == {"escape_rate_ok", "tts_share_ok", "day2_ok"}
    finally:
        db.close()
    r = client.get("/admin/metrics", headers=ADMIN)
    assert r.status_code == 200, r.text
    d = r.json()
    assert "retention" in d and "p8" in d
    assert d["p8"]["question"] == P8_QUESTION
