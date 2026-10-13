"""Period leaderboards: daily, weekly, monthly; combined and per-game;
Friends/Everyone; shared ranks for ties; frozen snapshots for closed periods.

Shared Play rankings use Asia/Kolkata boundaries: day 00:00-24:00, week
Monday-Sunday, calendar month. Monthly = the sum of that month's days, never
the sum of weeks crossing month boundaries. Equal totals share a competition
rank (1, 2, 2, 4); stable learner id only breaks the tie for display order.
"""

from __future__ import annotations

from datetime import date, datetime, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models import DailyGamePoints, GameDayScore, LeaderboardSnapshot


def ist_now() -> datetime:
    from app.services.localtime import local_now
    return local_now("Asia/Kolkata")


def ist_today() -> date:
    return ist_now().date()


def period_key(d: date, period: str) -> str:
    if period == "daily":
        return d.isoformat()
    if period == "weekly":
        return f"{d.isocalendar()[0]}-W{d.isocalendar()[1]:02d}"
    if period == "monthly":
        return d.isoformat()[:7]
    raise ValueError(f"unknown period {period!r}")


def period_bounds(key: str, period: str) -> tuple[datetime, datetime]:
    """[start, end) of the period in IST, returned as aware datetimes."""
    tz = None
    from app.services.localtime import resolve_tz
    tz = resolve_tz("Asia/Kolkata")
    if period == "daily":
        start = datetime.fromisoformat(key).replace(tzinfo=tz)
        return start, start + timedelta(days=1)
    if period == "weekly":
        year, week = key.split("-W")
        monday = date.fromisocalendar(int(year), int(week), 1)
        start = datetime.combine(monday, datetime.min.time()).replace(tzinfo=tz)
        return start, start + timedelta(days=7)
    if period == "monthly":
        year, month = (int(x) for x in key.split("-"))
        start = datetime(year, month, 1, tzinfo=tz)
        if month == 12:
            end = datetime(year + 1, 1, 1, tzinfo=tz)
        else:
            end = datetime(year, month + 1, 1, tzinfo=tz)
        return start, end
    raise ValueError(f"unknown period {period!r}")


def period_end_iso(key: str, period: str) -> str:
    start, end = period_bounds(key, period)
    return end.isoformat()


def _days_of_period(key: str, period: str) -> list[str]:
    start, end = period_bounds(key, period)
    days = []
    d = start.date()
    while d < end.date():
        days.append(d.isoformat())
        d += timedelta(days=1)
    return days


def _competition_ranks(rows: list[dict]) -> list[dict]:
    """Shared ranks for equal totals (1, 2, 2, 4); stable id only fixes
    display order inside a tie."""
    ordered = sorted(rows, key=lambda r: (-r["score"], r["learner_id"]))
    out = []
    prev_score = None
    rank = 0
    for i, r in enumerate(ordered):
        if r["score"] != prev_score:
            rank = i + 1
            prev_score = r["score"]
        out.append({**r, "rank": rank})
    return out


def _board_scores(db: Session, period: str, key: str, board: str,
                  learner_ids: list[str] | None) -> list[dict]:
    """[(learner_id, score, participation)] for one board/period."""
    days = _days_of_period(key, period)
    q_ids = None
    if learner_ids is not None:
        if not learner_ids:
            return []
        q_ids = learner_ids
    if period == "daily" and board == "combined":
        q = db.query(DailyGamePoints.learner_id,
                     DailyGamePoints.total,
                     DailyGamePoints.rounds_done).filter(DailyGamePoints.day == key)
        if q_ids is not None:
            q = q.filter(DailyGamePoints.learner_id.in_(q_ids))
        return [{"learner_id": lid, "score": int(total or 0), "participation": 1 if (total or 0) > 0 else 0,
                 "rounds": int(rd or 0)} for lid, total, rd in q.all()]
    if period == "daily":
        q = db.query(GameDayScore.learner_id,
                     func.max(GameDayScore.best_score),
                     func.count(GameDayScore.id)).filter(
            GameDayScore.day == key, GameDayScore.game == board)
        if q_ids is not None:
            q = q.filter(GameDayScore.learner_id.in_(q_ids))
        rows = q.group_by(GameDayScore.learner_id).all()
        return [{"learner_id": lid, "score": int(s or 0), "participation": int(n or 0), "rounds": int(n or 0)}
                for lid, s, n in rows]
    # weekly/monthly: sum the daily rows inside the period
    part = _participation(db, days, board if board != "combined" else None, q_ids)
    if board == "combined":
        q = db.query(DailyGamePoints.learner_id,
                     func.sum(DailyGamePoints.total)).filter(DailyGamePoints.day.in_(days))
        if q_ids is not None:
            q = q.filter(DailyGamePoints.learner_id.in_(q_ids))
        rows = q.group_by(DailyGamePoints.learner_id).all()
        return [{"learner_id": lid, "score": int(s or 0), "participation": part.get(lid, 0)}
                for lid, s in rows]
    q = db.query(GameDayScore.learner_id, func.sum(GameDayScore.best_score)).filter(
        GameDayScore.day.in_(days), GameDayScore.game == board)
    if q_ids is not None:
        q = q.filter(GameDayScore.learner_id.in_(q_ids))
    rows = q.group_by(GameDayScore.learner_id).all()
    return [{"learner_id": lid, "score": int(s or 0), "participation": part.get(lid, 0)}
            for lid, s in rows]


def _participation(db: Session, days: list[str], board: str | None,
                   learner_ids: list[str] | None) -> dict[str, int]:
    """Distinct days with at least one finished ranked round in the period."""
    from app.models import GameSession
    q = (db.query(GameSession.learner_id, GameSession.allocation_day)
         .filter(GameSession.status == "finished",
                 GameSession.mode == "ranked",
                 GameSession.allocation_day.in_(days)))
    if board:
        q = q.filter(GameSession.game == board)
    if learner_ids is not None:
        if not learner_ids:
            return {}
        q = q.filter(GameSession.learner_id.in_(learner_ids))
    out: dict[str, set] = {}
    for lid, day in q.all():
        out.setdefault(lid, set()).add(day)
    return {lid: len(v) for lid, v in out.items()}


def _alias_map(db: Session, learner_ids: list[str]) -> dict[str, dict]:
    from app.models import Learner
    rows = db.query(Learner.id, Learner.display_name).filter(Learner.id.in_(learner_ids)).all()
    return {lid: (name or "Learner") for lid, name in rows}


def leaderboard(db: Session, *, period: str, key: str, board: str, scope: str,
                learner, limit: int = 50, offset: int = 0) -> dict:
    """The board page plus the caller's own row fetched independently (pinned
    You row). scope 'friends' = accepted friends + self."""
    learner_ids: list[str] | None = None
    if scope == "friends":
        from app.models import Friendship
        friend_ids = [f.friend_id for f in
                      db.query(Friendship).filter(Friendship.learner_id == learner.id,
                                                  Friendship.status == "accepted").all()]
        learner_ids = friend_ids + [learner.id]
    raw = _board_scores(db, period, key, board, learner_ids)
    ranked = _competition_ranks([r for r in raw if r["score"] > 0])
    names = _alias_map(db, [r["learner_id"] for r in ranked])
    page = ranked[offset: offset + limit]
    rows = [{
        "rank": r["rank"], "learner_id": r["learner_id"],
        "name": names.get(r["learner_id"], "Learner"),
        "score": r["score"], "participation": r.get("participation", 0),
        "is_me": r["learner_id"] == learner.id,
    } for r in page]
    me = next((r for r in ranked if r["learner_id"] == learner.id), None)
    me_row = None
    if me:
        me_row = {
            "rank": me["rank"], "learner_id": me["learner_id"],
            "name": names.get(me["learner_id"], "Learner"),
            "score": me["score"], "participation": me.get("participation", 0), "is_me": True,
        }
    return {
        "period": period, "period_key": key, "board": board, "scope": scope,
        "period_end": period_end_iso(key, period),
        "rows": rows, "total": len(ranked),
        "me": me_row,
        "empty": len(ranked) == 0,
    }


def freeze_day(db: Session, day: str) -> int:
    """Snapshot the combined daily board for a completed day (job-called).
    Freezing runs after the submission grace + validation jobs finish."""
    raw = _board_scores(db, "daily", day, "combined", None)
    ranked = _competition_ranks([r for r in raw if r["score"] > 0])
    names = _alias_map(db, [r["learner_id"] for r in ranked])
    existing = db.query(LeaderboardSnapshot).filter(
        LeaderboardSnapshot.period == "daily", LeaderboardSnapshot.period_key == day,
        LeaderboardSnapshot.board == "combined").all()
    have = {s.learner_id for s in existing}
    n = 0
    for r in ranked:
        if r["learner_id"] in have:
            continue
        db.add(LeaderboardSnapshot(period="daily", period_key=day, board="combined",
                                   learner_id=r["learner_id"], rank=r["rank"],
                                   score=r["score"], participation=r.get("participation", 0)))
        n += 1
    db.commit()
    return n


def board_or_snapshot(db: Session, *, period: str, key: str, board: str, scope: str,
                      learner, limit: int = 50, offset: int = 0) -> dict:
    """Live compute for the current period; frozen snapshots for past ones."""
    today = ist_today()
    if period == "daily":
        current = key >= today.isoformat()
    elif period == "weekly":
        current = key >= period_key(today, "weekly")
    else:
        current = key >= period_key(today, "monthly")
    if current or scope == "friends":
        return leaderboard(db, period=period, key=key, board=board, scope=scope,
                           learner=learner, limit=limit, offset=offset)
    snap = (db.query(LeaderboardSnapshot)
            .filter(LeaderboardSnapshot.period == period,
                    LeaderboardSnapshot.period_key == key,
                    LeaderboardSnapshot.board == board)
            .order_by(LeaderboardSnapshot.rank)
            .all())
    if not snap:
        return leaderboard(db, period=period, key=key, board=board, scope=scope,
                           learner=learner, limit=limit, offset=offset)
    names = _alias_map(db, [s.learner_id for s in snap])
    rows = [{
        "rank": s.rank, "learner_id": s.learner_id,
        "name": names.get(s.learner_id, "Learner"),
        "score": s.score, "participation": s.participation,
        "is_me": s.learner_id == learner.id,
    } for s in snap[offset: offset + limit]]
    me = next((s for s in snap if s.learner_id == learner.id), None)
    return {
        "period": period, "period_key": key, "board": board, "scope": scope,
        "period_end": period_end_iso(key, period),
        "rows": rows, "total": len(snap), "frozen": True,
        "me": {"rank": me.rank, "score": me.score, "is_me": True,
               "participation": me.participation} if me else None,
        "empty": len(snap) == 0,
    }
