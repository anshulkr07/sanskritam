"""P8-4 — the question 10 people answer, with thresholds written FIRST.

Ten users is not a launch; it is an instrument, and an instrument needs a
question. The whole test is three numbers plus day-2 return:

1. ``escape_rate`` — do learners stay inside the graph? (falling = converging)
2. ``tts_live_share`` — is the pipeline keeping up? (rising live = drifting cost)
3. ``day2_return`` — did they come back on day 2? (the retention half)

Thresholds are recorded here BEFORE anyone is invited, so the result is not
decided after the fact. They are deliberately lenient: with n=10 a threshold
is a tripwire for "look closer", not a launch gate.
"""

from __future__ import annotations

from datetime import date, timedelta

from sqlalchemy.orm import Session

from app.models import DailyActivity, Learner
from app.services.localtime import learner_today
from app.services.metrics import escape_rate, tts_share

# The P8-4 question, verbatim. Thresholds below it.
P8_QUESTION = (
    "Do 10 strangers complete a first session, stay inside the graph, "
    "and come back on day 2 — without the cost model drifting?"
)

# Tripwires (see module docstring: lenient by design at n=10).
P8_THRESHOLDS = {
    "escape_rate_max": 0.35,   # above this the graph is not covering real talk
    "tts_live_share_max": 0.50,  # above this the pre-render pipeline is behind
    "day2_return_min": 0.30,   # below this nothing else matters — fix the loop first
    "min_first_sessions": 10,  # the instrument needs its n before it can answer
}


def first_session_dates(db: Session) -> dict[str, str]:
    """Earliest DailyActivity date per learner (learner-local dates)."""
    rows = db.query(DailyActivity.learner_id, DailyActivity.date).all()
    first: dict[str, str] = {}
    for lid, d in rows:
        if lid not in first or d < first[lid]:
            first[lid] = d
    return first


def day2_return(db: Session, cohort_days: int = 30) -> dict:
    """Share of learners active on the day AFTER their first session day.

    A learner counts as returned when ANY DailyActivity row exists on
    first_date + 1 day. Learners whose first date is today are excluded from
    the denominator — they have not had their day 2 yet. Only learners whose
    first date is within the last ``cohort_days`` are counted, so the number
    describes the current product, not history.
    """
    today = date.today().isoformat()
    cutoff = (date.today() - timedelta(days=cohort_days)).isoformat()
    first = first_session_dates(db)
    eligible = {lid: d for lid, d in first.items() if cutoff <= d < today}
    if not eligible:
        return {"cohort": 0, "returned": 0, "day2_return": 0.0}
    active_days: dict[str, set[str]] = {}
    rows = db.query(DailyActivity.learner_id, DailyActivity.date).all()
    for lid, d in rows:
        active_days.setdefault(lid, set()).add(d)
    returned = 0
    for lid, d0 in eligible.items():
        d1 = (date.fromisoformat(d0) + timedelta(days=1)).isoformat()
        if d1 in active_days.get(lid, set()):
            returned += 1
    n = len(eligible)
    return {"cohort": n, "returned": returned, "day2_return": round(returned / n, 4)}


def p8_report(db: Session, hours: int = 168) -> dict:
    """The whole P8-4 instrument in one dict: question, numbers, thresholds."""
    esc = escape_rate(db, hours=hours)
    tts = tts_share(db, hours=hours)
    ret = day2_return(db)
    checks = {
        "escape_rate_ok": esc["rate"] <= P8_THRESHOLDS["escape_rate_max"],
        "tts_share_ok": tts["live_share"] <= P8_THRESHOLDS["tts_live_share_max"],
        "day2_ok": ret["day2_return"] >= P8_THRESHOLDS["day2_return_min"],
    }
    return {
        "question": P8_QUESTION,
        "thresholds": dict(P8_THRESHOLDS),
        "escape_rate": esc,
        "tts_share": tts,
        "retention": ret,
        "checks": checks,
        "pass": all(checks.values()),
    }


def record_today_activity(db: Session, learner: Learner) -> None:
    """Helper used by tests: ensure a DailyActivity row for the learner today."""
    today = learner_today(learner)
    row = (
        db.query(DailyActivity)
        .filter(DailyActivity.learner_id == learner.id, DailyActivity.date == today)
        .first()
    )
    if row is None:
        db.add(DailyActivity(learner_id=learner.id, date=today, xp=10, attempts=1))
        db.commit()
