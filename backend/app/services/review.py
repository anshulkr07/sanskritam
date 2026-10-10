"""P23-5 · A real scheduler: item-level memory with due dates.

``research/tech-research.md`` researched and recommended FSRS (MIT, "each
feature = one card"). This module implements that recommendation's contract
— per-ITEM stability/difficulty/lapses, due dates, intervals that grow on
recall and shorten on lapse, time-aware scheduling — as local computation
with no new dependency (deterministic, offline, ₹0; the callers would not
change if the ``fsrs`` package were adopted later).

An item is a step instance (``step:<lesson_id>:<rank>``) or a vocab word
(``vocab:<word_id>``) — not just a feature tag. That is the whole point:
adaptive.py kept one 0..1 score per feature with no due dates, so a learner
returning after a month saw exactly the state they left.

``unsure``/abstained touches nothing — §2.2 at the schedule level.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.models import ReviewItem

logger = logging.getLogger("shabd.review")

# Initial memory for an item never graded before.
INIT_STABILITY_DAYS = 1.0
INIT_DIFFICULTY = 0.3

# Recall grows the interval; a near-miss grows it less; a lapse collapses it.
CORRECT_FACTOR = 2.2
NEAR_FACTOR = 1.2
LAPSE_STABILITY_FLOOR_DAYS = 0.25  # a lapsed item returns within hours, not weeks
LAPSE_FACTOR = 0.4
NEW_LAPSE_INTERVAL_HOURS = 10 / 60  # ~10 minutes: the lapse is still warm

MIN_DIFFICULTY = 0.1
MAX_DIFFICULTY = 0.9


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _as_aware(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def schedule_review(db: Session, learner_id: str, item_key: str, kind: str,
                    verdict: str, abstained: bool = False,
                    now: datetime | None = None) -> ReviewItem | None:
    """Advance (or create) the schedule for one item after one graded attempt.

    Returns the ReviewItem, or None when the verdict was ``unsure``/abstained
    (uncertainty schedules nothing — §2.2). Upserts on
    (learner_id, item_key).
    """
    if verdict == "unsure" or abstained:
        return None
    moment = now or _utcnow()
    row = (
        db.query(ReviewItem)
        .filter(ReviewItem.learner_id == learner_id,
                ReviewItem.item_key == item_key)
        .first()
    )
    if row is None:
        row = ReviewItem(
            learner_id=learner_id,
            item_key=item_key,
            kind=kind,
            due_at=moment,
            stability=INIT_STABILITY_DAYS,
            difficulty=INIT_DIFFICULTY,
            lapses=0,
            last_verdict="",
        )
        db.add(row)

    stability = float(row.stability or INIT_STABILITY_DAYS)
    difficulty = float(row.difficulty if row.difficulty is not None else INIT_DIFFICULTY)
    lapses = int(row.lapses or 0)

    if verdict == "correct":
        stability = stability * CORRECT_FACTOR
        difficulty = max(MIN_DIFFICULTY, difficulty - 0.05)
        due = moment + timedelta(days=stability)
    elif verdict == "off_by_one":
        stability = stability * NEAR_FACTOR
        due = moment + timedelta(days=stability)
    else:  # incorrect — a lapse: the interval shortens, difficulty rises
        lapses += 1
        stability = max(LAPSE_STABILITY_FLOOR_DAYS, stability * LAPSE_FACTOR)
        difficulty = min(MAX_DIFFICULTY, difficulty + 0.15)
        # A lapse returns while it is still warm, then rebuilds from there.
        due = moment + timedelta(hours=NEW_LAPSE_INTERVAL_HOURS)

    row.stability = round(stability, 4)
    row.difficulty = round(difficulty, 4)
    row.lapses = lapses
    row.last_verdict = verdict
    row.due_at = due
    row.updated_at = moment
    db.flush()
    return row


def due_items(db: Session, learner_id: str, now: datetime | None = None,
              limit: int = 50, kinds: list[str] | None = None) -> list[ReviewItem]:
    """Items whose due date has passed — oldest first."""
    moment = now or _utcnow()
    q = db.query(ReviewItem).filter(ReviewItem.learner_id == learner_id)
    if kinds is not None:
        q = q.filter(ReviewItem.kind.in_(kinds))
    rows = q.order_by(ReviewItem.due_at).limit(limit * 3).all()
    return [r for r in rows if _as_aware(r.due_at) <= moment][:limit]


def due_count(db: Session, learner_id: str, now: datetime | None = None,
              kinds: list[str] | None = None) -> int:
    moment = now or _utcnow()
    q = db.query(ReviewItem.due_at, ReviewItem.kind).filter(
        ReviewItem.learner_id == learner_id)
    if kinds is not None:
        q = q.filter(ReviewItem.kind.in_(kinds))
    n = 0
    for due_at, kind in q.all():
        if kinds is not None and kind not in kinds:
            continue
        if due_at is not None and _as_aware(due_at) <= moment:
            n += 1
    return n
