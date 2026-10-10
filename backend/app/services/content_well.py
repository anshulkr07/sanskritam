"""Content-well health report (P7-7).

The defect P7-6 fixed was *silent*: the śloka well emptied and nothing said
so — a human found it by reading a SQLite table two days late. This module
makes the condition of every daily-content well a checkable number, exposed
via an endpoint and pinned by a test. A red test is the mechanism; we do not
page, and we add no alerting dependency.

What "runway" means for a cycling well
--------------------------------------
Daily wells (daily word, śloka) never truly empty: the router resolves any
date deterministically by cycling the seeded rows (§2.12). So the real runway
is not "days until empty" — it is the **number of distinct seeded items**,
i.e. how many days pass before the same item is seen again. A well of one row
does not fail; it just freezes on one item forever. We report that count as
``runway_days`` per well, alongside the physical row count.

``approved scenarios`` is the count of dialogue scenarios a human has
reviewed and accepted (P7-3). It is the number of *worthwhile* journeys the
Talk tab can offer.
"""

import datetime

from sqlalchemy.orm import Session

from app.models import DailyWord, DialogueScenario, Shloka
from app.seeds.daily_words import _CURATED as _SEED_DAILY_WORDS
from app.seeds.shlokas import SEED_SLOKAS as _SEED_SLOKAS

# Floors the guard test asserts. Days of distinct content before a daily
# surface repeats; and approved (human-reviewed) scenarios on offer.
MIN_RUNWAY_DAYS = 14
MIN_APPROVED_SCENARIOS = 1


def _future_rows(db: Session, model) -> int:
    """Count of seeded rows active today or later (distinct remaining days)."""
    today = datetime.date.today().isoformat()
    if model is Shloka:
        # Paged books never feed the daily verse or the runway (6.4).
        return db.query(model).filter(model.date >= today, model.in_daily.is_(True)).count()
    return db.query(model).filter(model.date >= today).count()


def _well_rows(db: Session, model) -> int:
    if model is Shloka:
        return db.query(model).filter(model.in_daily.is_(True)).count()
    return db.query(model).count()


def content_well_report(db: Session) -> dict:
    """Return per-well health for every daily-content surface.

    The returned dict mirrors the docstring; ``healthy`` is False only when a
    floor is breached, and each failing well is named so a red test (or a
    human) can see *which* well is the problem.
    """
    today = datetime.date.today().isoformat()

    wells = {
        "daily_word": {
            "rows_total": _well_rows(db, DailyWord),
            "rows_remaining": _future_rows(db, DailyWord),
            "runway_days": _well_rows(db, DailyWord),
            "seed_rows": len(_SEED_DAILY_WORDS),
            "dates_from": None,
            "dates_to": None,
        },
        "shloka": {
            "rows_total": _well_rows(db, Shloka),
            "rows_remaining": _future_rows(db, Shloka),
            "runway_days": _well_rows(db, Shloka),
            "seed_rows": len(_SEED_SLOKAS),
            "dates_from": None,
            "dates_to": None,
        },
    }
    # Useful context: the seeded date span of each well, so a human can see
    # at a glance whether the well still has fresh content coming.
    for model, key in ((DailyWord, "daily_word"), (Shloka, "shloka")):
        if model is Shloka:
            dates = sorted({r[0] for r in db.query(model.date).filter(model.in_daily.is_(True)).all()})
        else:
            dates = sorted({r[0] for r in db.query(model.date).all()})
        if dates:
            wells[key]["dates_from"] = dates[0]
            wells[key]["dates_to"] = dates[-1]

    scenario_counts = {
        status: db.query(DialogueScenario)
        .filter(DialogueScenario.review_status == status)
        .count()
        for status in ("approved", "pending", "rejected")
    }

    # Which wells breach the floor? Name them so the failure means something.
    low_runway = [
        name for name, w in wells.items() if w["runway_days"] < MIN_RUNWAY_DAYS
    ]
    low_approved = scenario_counts["approved"] < MIN_APPROVED_SCENARIOS

    # P8-1: the seed is ahead of the database. run_seed() refills every boot,
    # so a well whose DB count is below its seed count means the app has not
    # been started since the seed grew — exactly the stale-DB state that left
    # 6 ślokas and 0 daily words serving for days. Name the well; a red test
    # is the mechanism, not a human noticing five days later.
    seed_behind = [
        name for name, w in wells.items() if w["rows_total"] < w["seed_rows"]
    ]

    return {
        "generated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "today": today,
        "floors": {
            "min_runway_days": MIN_RUNWAY_DAYS,
            "min_approved_scenarios": MIN_APPROVED_SCENARIOS,
        },
        "wells": wells,
        "scenarios": scenario_counts,
        "issues": {
            "low_runway_wells": low_runway,
            "low_approved": low_approved,
            "seed_behind_wells": seed_behind,
        },
        "healthy": not low_runway and not low_approved and not seed_behind,
    }