"""Daily-activity recording — the writer behind the Progress screen.

Every graded learner action funnels through :func:`record_activity`, which
upserts the learner-local ``DailyActivity`` row for today (see
``services/localtime.learner_today``). The Progress screen's bars read those
rows back:

- ``GET /progress/daily`` — today's XP vs ``daily_goal_xp`` (the goal bar).
- ``GET /progress/history`` — per-day rows for the streak calendar.
- ``GET /progress/streak`` — the streak itself (owned by ``adaptive``).

Before this module existed nothing ever WROTE ``DailyActivity`` outside tests
(``retention.record_today_activity`` is test-only), so a learner who practised
all day still saw ``0 / 50 XP`` and an empty 35-day calendar — a progress bar
that looked mocked because, effectively, it was.

XP table (documented here so client and server agree):
- challenge / lesson-step attempt: correct 10, off_by_one 5, incorrect 2,
  unsure/abstained 0. Mirrors the client's session roll-up
  (``correct * 10 + total * 2`` in spirit): a daily goal of 50 XP is ~5
  correct answers.
- conversation turn: correct 5, bridge/no_match/off_by_one 2,
  unsure/meta/empty/revealed 0 — engagement without gaming empty submits.
- pronunciation: correct 5, near 3, incorrect 1, unsure 0.
- writing: correct 5, wrong 1, unsure 0.
- daily-word guess: solved 10, valid-but-unsolved guess 2, refused 0.
- generic exercise grade: correct 10, off_by_one 5, incorrect 2, unsure 0.

``goal_met`` is recomputed on every write (``xp >= daily_goal_xp``) and
``learner.last_active_date`` tracks the last day anything was recorded, so
streak-adjacent readers never need a second query.
"""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.models import DailyActivity, Learner
from app.services.localtime import learner_today

# Verdict → XP for challenge-shaped grading
# (challenge attempts, lesson steps, generic exercises).
CHALLENGE_XP: dict[str, int] = {
    "correct": 10,
    "off_by_one": 5,
    "incorrect": 2,
    "unsure": 0,
}

# Verdict → XP for conversation turns.
CONVERSATION_XP: dict[str, int] = {
    "correct": 5,
    "off_by_one": 2,
    "bridge": 2,
    "no_match": 2,
    "incorrect": 2,
    "unsure": 0,
    "meta": 0,
    "empty": 0,
    "revealed": 0,
}

# Verdict → XP for pronunciation attempts.
PRONUNCIATION_XP: dict[str, int] = {
    "correct": 5,
    "near": 3,
    "incorrect": 1,
    "unsure": 0,
}

# Verdict → XP for writing attempts.
WRITING_XP: dict[str, int] = {
    "correct": 5,
    "wrong": 1,
    "unsure": 0,
}


def xp_for_challenge_verdict(verdict: str, abstained: bool = False) -> int:
    """XP for a challenge-shaped verdict. Abstention never earns."""
    if abstained:
        return 0
    return CHALLENGE_XP.get(verdict, 0)


def record_activity(
    db: Session,
    learner: Learner,
    *,
    xp: int = 0,
    attempts: int = 0,
    conversation_turns: int = 0,
    pronunciation_attempts: int = 0,
) -> DailyActivity:
    """Upsert today's activity row and stamp ``last_active_date``.

    Flushes (does NOT commit) so the caller's transaction owns the write —
    every caller below already commits around its grading writes.
    ``goal_met`` is recomputed from the running total on each call.
    """
    today = learner_today(learner)
    row = (
        db.query(DailyActivity)
        .filter(
            DailyActivity.learner_id == learner.id,
            DailyActivity.date == today,
        )
        .first()
    )
    if row is None:
        row = DailyActivity(
            learner_id=learner.id,
            date=today,
            xp=0,
            attempts=0,
            conversation_turns=0,
            pronunciation_attempts=0,
            goal_met=False,
        )
        db.add(row)
        db.flush()
    row.xp = (row.xp or 0) + max(0, int(xp))
    row.attempts = (row.attempts or 0) + max(0, int(attempts))
    row.conversation_turns = (row.conversation_turns or 0) + max(0, int(conversation_turns))
    row.pronunciation_attempts = (row.pronunciation_attempts or 0) + max(
        0, int(pronunciation_attempts)
    )
    goal = learner.daily_goal_xp or 50
    row.goal_met = (row.xp or 0) >= goal
    learner.last_active_date = today
    db.flush()
    return row
