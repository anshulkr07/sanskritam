"""Progress endpoints: daily activity, XP, streaks."""

import logging
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth import require_learner
from app.db import get_db
from app.models import DailyActivity, Learner
from app.services.localtime import learner_today

logger = logging.getLogger("shabd.progress")

router = APIRouter(prefix="/progress")


@router.get("/history")
def get_progress_history(
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
            "conversation_turns": r.conversation_turns or 0,
            "pronunciation_attempts": r.pronunciation_attempts or 0,
            "goal_met": r.goal_met,
        }
        for r in rows
    ]


@router.get("/daily")
def get_daily_progress(
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
def get_streak(
    learner: Learner = Depends(require_learner),
    db: Session = Depends(get_db),
):
    """Get the learner's current streak and freeze info."""
    return {
        "streak": learner.streak or 0,
        "freezes": learner.streak_freezes or 0,
        "max_freezes": 2,
    }


CARD_LESSON_XP = 10
CARD_LESSON_GAME = "card-lesson"


class CardLessonIn(BaseModel):
    lesson_id: str
    checks_right: int = 0
    checks_total: int = 0


@router.post("/card-lesson")
def finish_card_lesson(
    body: CardLessonIn,
    learner: Learner = Depends(require_learner),
    db: Session = Depends(get_db),
):
    """A Learn card lesson read to its last card (owner decision 2026-10-13:
    card lessons count toward XP and the streak).

    The first finish of a lesson earns CARD_LESSON_XP; finishing it again
    earns nothing but still marks the day active. Finishes are kept as
    GameResult rows (game "card-lesson", mode = lesson id) so no migration
    is needed; score stays 0 and goal_met False, so the games' own point cap
    and daily-challenge streak never count them.
    """
    from app.models import GameResult
    from app.services.activity import record_activity

    lesson_id = (body.lesson_id or "").strip()[:32]
    if not lesson_id:
        raise HTTPException(status_code=422, detail="lesson_id is required.")
    seen = (
        db.query(GameResult)
        .filter(
            GameResult.learner_id == learner.id,
            GameResult.game == CARD_LESSON_GAME,
            GameResult.mode == lesson_id,
        )
        .first()
    )
    xp = 0 if seen else CARD_LESSON_XP
    db.add(GameResult(
        learner_id=learner.id,
        date=learner_today(learner),
        game=CARD_LESSON_GAME,
        mode=lesson_id,
        score=0,
        moves=max(0, int(body.checks_right or 0)),
        goal_met=False,
        daily=False,
    ))
    row = record_activity(db, learner, xp=xp, attempts=1)
    db.commit()
    return {
        "xp": xp,
        "first_time": seen is None,
        "today_xp": row.xp,
        "goal_xp": learner.daily_goal_xp or 50,
        "goal_met": bool(row.goal_met),
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