"""Progress endpoints: daily activity, XP, streaks."""

import logging
from datetime import date, timedelta

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth import require_learner
from app.db import get_db
from app.models import DailyActivity, Learner
from app.services.localtime import learner_today

logger = logging.getLogger("shabd.progress")

router = APIRouter(prefix="/progress")


@router.get("/history")
async def get_progress_history(
    days: int = Query(35, ge=1, le=90),
    learner: Learner = Depends(require_learner),
    db: Session = Depends(get_db),
):
    """Recent per-day activity rows, for the streak calendar (UI U9-2 / U3-2).

    Days are learner-local (§2.8 — never server UTC) and returned oldest-first.
    Only days with any recorded activity appear as rows; the calendar fills the
    gaps itself so an empty day is never confused with a missing one.
    """
    today = date.fromisoformat(learner_today(learner))
    cutoff = (today - timedelta(days=days - 1)).isoformat()
    rows = (
        db.query(DailyActivity)
        .filter(
            DailyActivity.learner_id == learner.id,
            DailyActivity.date >= cutoff,
        )
        .order_by(DailyActivity.date.asc())
        .all()
    )
    return [
        {
            "date": r.date,
            "xp": r.xp,
            "attempts": r.attempts,
            "goal_met": r.goal_met,
        }
        for r in rows
    ]


@router.get("/daily")
async def get_daily_progress(
    learner: Learner = Depends(require_learner),
    db: Session = Depends(get_db),
):
    """Get the learner's daily activity for today (learner-local date).

    The date is resolved in the learner's own timezone, never server UTC: in
    IST a UTC boundary would credit everything practised before 05:30 local to
    the previous day and break the streak of anyone who studies late.
    """
    today = learner_today(learner)
    activity = db.query(DailyActivity).filter(
        DailyActivity.learner_id == learner.id,
        DailyActivity.date == today,
    ).first()

    return {
        "date": today,
        "xp": activity.xp if activity else 0,
        "attempts": activity.attempts if activity else 0,
        "conversation_turns": activity.conversation_turns if activity else 0,
        "pronunciation_attempts": activity.pronunciation_attempts if activity else 0,
        "goal_met": activity.goal_met if activity else False,
        "goal_xp": learner.daily_goal_xp or 50,
    }


@router.get("/streak")
async def get_streak(
    learner: Learner = Depends(require_learner),
    db: Session = Depends(get_db),
):
    """Get the learner's current streak and freeze info."""
    return {
        "streak": learner.streak or 0,
        "freezes": learner.streak_freezes or 0,
        "max_freezes": 2,
    }


@router.post("/repair")
async def repair_streak(
    learner: Learner = Depends(require_learner),
    db: Session = Depends(get_db),
):
    """Repair a broken streak within 48h grace period (consumes one freeze)."""
    from datetime import timedelta

    if learner.streak_freezes and learner.streak_freezes > 0:
        learner.streak_freezes -= 1
        learner.streak = (learner.streak or 0) + 1
        db.commit()
        return {"repaired": True, "streak": learner.streak, "freezes_remaining": learner.streak_freezes}
    return {"repaired": False, "streak": learner.streak or 0, "freezes_remaining": 0}