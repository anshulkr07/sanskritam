"""Play API: summary, catalog, sessions, results, leaderboards.

Design contract (brief §12): every result carries its ruleset version, raw
breakdown, ranked eligibility and reason, and the new personal/period state.
Answer keys live only in GameSession.pack and are never serialised. All
endpoints are authenticated; idempotency keys make starts and finishes safe
to retry.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth import require_admin, require_learner
from app.db import get_db
from app.models import (
    DailyGamePoints, DailyWordPlay, GameSession, Learner,
)
from app.services.play import boards, catalog, rubrics, sessions as session_svc
from app.services.activity import record_activity
from app.services.localtime import local_date

router = APIRouter(prefix="/play")


def _http(e: session_svc.PlayError) -> HTTPException:
    return HTTPException(status_code=e.status, detail=e.detail)


# ── Summary (top of the Play hub) ────────────────────────────────────────────


@router.get("/summary")
def get_summary(
    learner: Learner = Depends(require_learner),
    db: Session = Depends(get_db),
):
    """Your rank today, ranked points, change since last visit, period end,
    the personal goal and streak, the recitation competition card and the
    weekly friend goal. Before any ranked round today the rank card says so —
    a position is never fabricated."""
    day = session_svc.ist_day()
    daily = (db.query(DailyGamePoints)
             .filter(DailyGamePoints.learner_id == learner.id, DailyGamePoints.day == day)
             .first())
    prev_day = (db.query(DailyGamePoints)
                .filter(DailyGamePoints.learner_id == learner.id,
                        DailyGamePoints.day < day)
                .order_by(DailyGamePoints.day.desc())
                .first())
    total = int(daily.total or 0) if daily else 0
    change = total - int(daily.visit_total or 0) if daily else 0
    if daily is None:
        daily = DailyGamePoints(learner_id=learner.id, day=day, total=0,
                                visit_total=0, visit_at=func.now())
        db.add(daily)
    else:
        daily.visit_total = total
        daily.visit_at = func.now()
    db.commit()

    # Rank within today's everyone board (0 when unranked: nothing fabricated).
    board = boards.leaderboard(db, period="daily", key=day, board="combined",
                               scope="everyone", learner=learner, limit=1)
    me_rank = board["me"]["rank"] if board["me"] else None

    # Personal goal: completed valid rounds today (any mode) + games streak.
    rounds = int(daily.rounds_done or 0)
    streak = _games_streak(db, learner.id, day)

    # Competition card: one active recitation competition, if any.
    comp = None
    try:
        from app.models import Competition
        c = (db.query(Competition)
             .filter(Competition.status == "open")
             .order_by(Competition.opens_at)
             .first())
        if c is not None:
            comp = {
                "id": c.id, "title": c.slug, "pieces": len(c.pieces or []),
                "closes_at": c.closes_at.isoformat() + "Z",
            }
    except Exception:
        comp = None

    # Weekly friend goal (only after the learner opted in).
    from app.services.play.social import goal_view
    try:
        friend_goal = goal_view(db, learner)
    except Exception:
        friend_goal = None

    return {
        "day": day,
        "rank_today": {
            "rank": me_rank,
            "points": total,
            "change_since_visit": change,
            "period_end": boards.period_end_iso(day, "daily"),
            "unranked_yet": total <= 0,
            "explain_ist": "Shared Play rankings follow India Standard Time; the day resets at 00:00 IST.",
        },
        "goal": {"label": f"Complete {catalog.GOAL_ROUNDS_PER_DAY} rounds",
                 "done": rounds, "target": catalog.GOAL_ROUNDS_PER_DAY,
                 "streak": streak},
        "daily_word": _daily_word_state(db, learner.id, day),
        "competition": comp,
        "friend_goal": friend_goal,
        "last_week_total": int(prev_day.total or 0) if prev_day and prev_day.day >= _days_ago(day, 7) else None,
    }


def _days_ago(day: str, n: int) -> str:
    from datetime import date, timedelta
    return (date.fromisoformat(day) - timedelta(days=n)).isoformat()


def _games_streak(db: Session, learner_id: str, today: str) -> int:
    """Consecutive days with a completed round, ending today — or yesterday,
    so a current streak is preserved before today's goal is due."""
    from datetime import date, timedelta
    from app.models import GameSession

    def has(day: str) -> bool:
        return (db.query(GameSession)
                .filter(GameSession.learner_id == learner_id,
                        GameSession.status == "finished",
                        GameSession.allocation_day == day)
                .first() is not None)

    d = date.fromisoformat(today)
    if not has(d.isoformat()):
        d -= timedelta(days=1)
        if not has(d.isoformat()):
            return 0
    streak = 0
    while has(d.isoformat()) and streak < 366:
        streak += 1
        d -= timedelta(days=1)
    return streak


def _daily_word_state(db: Session, learner_id: str, day: str) -> dict:
    play = (db.query(DailyWordPlay)
            .filter(DailyWordPlay.learner_id == learner_id, DailyWordPlay.date == day)
            .first())
    return {
        "done": bool(play and play.finished),
        "solved": bool(play and play.solved),
        "guesses": int(play.guess_count or 0) if play else 0,
    }


# ── Catalog ──────────────────────────────────────────────────────────────────


@router.get("/catalog")
def get_catalog(learner: Learner = Depends(require_learner), db: Session = Depends(get_db)):
    out = catalog.catalog_payload()
    # Media inventory gates: a game whose ranked spec requires illustrations
    # reports media_ready=false until the reviewed images exist, so the hub
    # never claims ranked picture play it cannot serve.
    from app.models import GameContent
    try:
        imgs = (db.query(func.count(GameContent.id))
                .filter(GameContent.game == "vocab", GameContent.kind == "concept",
                        GameContent.status.in_(("validated", "reviewed")),
                        GameContent.body["image"].as_string() != "")
                .scalar() or 0)
    except Exception:
        imgs = 0
    for g in out["games"]:
        g["media_ready"] = True
        if g.get("requires_media") == "illustrations":
            g["media_ready"] = imgs >= 24
    return out


@router.get("/allocations")
def get_allocations(
    learner: Learner = Depends(require_learner),
    db: Session = Depends(get_db),
):
    day = session_svc.ist_day()
    out = {}
    for key in catalog.RANKED_GAME_KEYS:
        limit = 1 if key == "daily-word" else catalog.RANKED_ATTEMPTS_PER_DAY
        from app.models import GameDayScore
        cell = (db.query(GameDayScore)
                .filter(GameDayScore.learner_id == learner.id, GameDayScore.day == day,
                        GameDayScore.game == key).first())
        used = int(cell.attempts_used or 0) if cell else 0
        out[key] = {"used": used, "limit": limit, "left": max(0, limit - used)}
    return {"day": day, "games": out, "ist": True}


# ── Sessions ─────────────────────────────────────────────────────────────────


class StartBody(BaseModel):
    game: str
    mode: str = "practice"
    difficulty: dict = Field(default_factory=dict)
    answer_lang: str = "sa"
    idempotency_key: str = ""
    match_id: str = ""


@router.post("/sessions")
def post_start(
    body: StartBody,
    learner: Learner = Depends(require_learner),
    db: Session = Depends(get_db),
):
    try:
        s = session_svc.start_session(
            db, learner, game=body.game, mode=body.mode,
            difficulty=body.difficulty or None,
            answer_lang=(body.answer_lang or "sa")[:8],
            idempotency_key=(body.idempotency_key or "")[:64],
            match_id=(body.match_id or "")[:32],
        )
    except session_svc.PlayError as e:
        raise _http(e)
    return session_svc.client_view(s)


@router.get("/sessions/{session_id}")
def get_session(
    session_id: str,
    learner: Learner = Depends(require_learner),
    db: Session = Depends(get_db),
):
    s = _own_session(db, learner, session_id)
    return session_svc.client_view(s)


class AnswerBody(BaseModel):
    type: str = ""
    index: int = -1
    card: int = -1
    a: int = -1
    b: int = -1
    cells: list = Field(default_factory=list)
    tiles: list = Field(default_factory=list)
    order: list = Field(default_factory=list)
    choice: str = ""
    selections: dict = Field(default_factory=dict)
    elapsed_ms: int = 0


@router.post("/sessions/{session_id}/answer")
def post_answer(
    session_id: str,
    body: AnswerBody,
    learner: Learner = Depends(require_learner),
    db: Session = Depends(get_db),
):
    s = _own_session(db, learner, session_id)
    try:
        return session_svc.apply_answer(db, learner, s, body.model_dump())
    except session_svc.PlayError as e:
        raise _http(e)


class HintBody(BaseModel):
    reason: str = ""


@router.post("/sessions/{session_id}/hint")
def post_hint(
    session_id: str,
    body: HintBody,
    learner: Learner = Depends(require_learner),
    db: Session = Depends(get_db),
):
    s = _own_session(db, learner, session_id)
    try:
        out = session_svc.mark_hint(db, learner, s)
    except session_svc.PlayError as e:
        raise _http(e)
    out["note"] = ("Hints move this round into practice: the ranked allocation "
                   "was consumed and the result will not change rank.")
    return out


class FinishBody(BaseModel):
    elapsed_ms: int = 0
    window_ms: int = 0
    outcome: str = "finish"


@router.post("/sessions/{session_id}/finish")
def post_finish(
    session_id: str,
    body: FinishBody,
    learner: Learner = Depends(require_learner),
    db: Session = Depends(get_db),
):
    s = _own_session(db, learner, session_id)
    try:
        out = session_svc.finish_session(db, learner, s, outcome=body.outcome,
                                         metrics_override={"elapsed_ms": body.elapsed_ms,
                                                           "window_ms": body.window_ms})
    except session_svc.PlayError as e:
        raise _http(e)
    # Small activity credit for finished rounds (learning XP is a separate
    # currency from ranked points and from the personal Play goal).
    try:
        record_activity(db, learner, xp=2, attempts=1)
        db.commit()
    except Exception:
        db.rollback()
    return out


class AbandonBody(BaseModel):
    server_failure: bool = False


@router.post("/sessions/{session_id}/abandon")
def post_abandon(
    session_id: str,
    body: AbandonBody,
    learner: Learner = Depends(require_learner),
    db: Session = Depends(get_db),
):
    s = _own_session(db, learner, session_id)
    try:
        return session_svc.abandon_session(db, learner, s, server_failure=body.server_failure)
    except session_svc.PlayError as e:
        raise _http(e)


def _own_session(db: Session, learner: Learner, session_id: str) -> GameSession:
    s = db.query(GameSession).filter(GameSession.id == session_id).first()
    if s is None or s.learner_id != learner.id:
        raise HTTPException(status_code=404, detail="Session not found.")
    return s


# ── Daily Word contribution (bridges the existing puzzle into Play points) ──


class DailyWordFinishBody(BaseModel):
    date: str
    guesses: int = 0
    solved: bool = False
    finished: bool = False


@router.post("/daily-word/finish")
def post_daily_word_finish(
    body: DailyWordFinishBody,
    learner: Learner = Depends(require_learner),
    db: Session = Depends(get_db),
):
    """Called after the existing /daily-word/guess flow finishes a day so the
    ranked daily contribution is recorded once, server-side. Daily Word's
    ranked contribution stays its one daily puzzle; duel editions never call
    this. Replays return the stored result (idempotent)."""
    play = (db.query(DailyWordPlay)
            .filter(DailyWordPlay.learner_id == learner.id,
                    DailyWordPlay.date == body.date)
            .first())
    if play is None:
        raise HTTPException(status_code=409, detail="No puzzle state for that day yet.")
    solved = bool(play.solved and body.solved)
    finished = bool(play.finished)
    metrics = {"guesses": int(play.guess_count or 0), "solved": solved, "finished": finished}
    scored = rubrics.score_for("daily-word", metrics)

    existing = (db.query(GameSession)
                .filter(GameSession.learner_id == learner.id,
                        GameSession.game == "daily-word",
                        GameSession.allocation_day == body.date,
                        GameSession.status == "finished")
                .first())
    if existing is not None:
        return {"score": existing.score, "repeat": True}

    day = session_svc.ist_day()
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    s = GameSession(
        learner_id=learner.id, game="daily-word", mode="ranked",
        ruleset=rubrics.RUBRIC_VERSION, answer_lang="sa",
        allocation_day=body.date, status="finished",
        pack={}, score=scored.score,
        result={"metrics": metrics, "breakdown": scored.breakdown,
                "rubric": rubrics.RUBRIC_VERSION, "ranked": True},
        idempotency_key=f"dw-{learner.id}-{body.date}",
        finished_at=now,
    )
    db.add(s)
    session_svc._write_day_aggregates(db, learner, "daily-word", scored.score, now)
    db.commit()
    return {"score": scored.score, "repeat": False,
            "breakdown": scored.breakdown}


# ── Leaderboards ─────────────────────────────────────────────────────────────


@router.get("/leaderboard")
def get_leaderboard(
    period: str = Query("daily", pattern="^(daily|weekly|monthly)$"),
    board: str = Query("combined"),
    scope: str = Query("everyone", pattern="^(everyone|friends)$"),
    key: str = Query(""),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    learner: Learner = Depends(require_learner),
    db: Session = Depends(get_db),
):
    day = boards.ist_today()
    if board not in ("combined",) and board not in catalog.RANKED_GAME_KEYS:
        raise HTTPException(status_code=422, detail="Unknown board.")
    if not key:
        key = boards.period_key(day, period)
    else:
        try:
            boards.period_bounds(key, period)
        except Exception:
            raise HTTPException(status_code=422, detail="Bad period key.")
    return boards.board_or_snapshot(db, period=period, key=key, board=board,
                                    scope=scope, learner=learner,
                                    limit=limit, offset=offset)


@router.get("/history")
def get_history(
    learner: Learner = Depends(require_learner),
    db: Session = Depends(get_db),
    limit: int = Query(30, ge=1, le=100),
):
    rows = (db.query(GameSession)
            .filter(GameSession.learner_id == learner.id,
                    GameSession.status == "finished")
            .order_by(GameSession.finished_at.desc())
            .limit(limit).all())
    return {"rounds": [{
        "id": r.id, "game": r.game, "mode": r.mode, "score": r.score or 0,
        "ranked": bool((r.result or {}).get("ranked")),
        "rubric": (r.result or {}).get("rubric", ""),
        "breakdown": (r.result or {}).get("breakdown", {}),
        "finished_at": r.finished_at.isoformat() + "Z" if r.finished_at else None,
    } for r in rows]}


# ── Admin: content preflight / publish / inventory ──────────────────────────


class ContentUpdateBody(BaseModel):
    content_id: str
    version: int = 1
    status: str  # validated | reviewed | retired


@router.post("/admin/content")
def post_admin_content(
    body: ContentUpdateBody,
    admin: bool = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Move one content item through the review states (brief §10). reviewed
    requires the automatic validation to have passed; retired rows stop
    serving but keep their history."""
    from app.models import GameContent
    row = (db.query(GameContent)
           .filter(GameContent.content_id == body.content_id,
                   GameContent.version == body.version)
           .first())
    if row is None:
        raise HTTPException(status_code=404, detail="Content not found.")
    if body.status not in ("validated", "reviewed", "retired"):
        raise HTTPException(status_code=422, detail="Unknown status.")
    if body.status == "reviewed" and row.status == "draft":
        raise HTTPException(status_code=409, detail="Run validation before review.")
    row.status = body.status
    if body.status == "reviewed":
        row.reviewer = "admin"
    db.commit()
    return {"content_id": row.content_id, "status": row.status}


@router.get("/admin/content/inventory")
def get_admin_inventory(
    admin: bool = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Inventory counts + depletion alerts (brief §10 minimums)."""
    from app.models import GameContent
    counts: dict = {}
    for game, in db.query(GameContent.game).distinct().all():
        rows = (db.query(GameContent.status, func.count(GameContent.id))
                .filter(GameContent.game == game)
                .group_by(GameContent.status).all())
        counts[game] = {status: n for status, n in rows}
    minimums = {"vocab": 300, "word-groups": 120, "pada-path": 150}
    alerts = []
    for game, minimum in minimums.items():
        total = sum(counts.get(game, {}).values())
        if total < minimum:
            alerts.append({"game": game, "have": total, "minimum": minimum})
    return {"counts": counts, "alerts": alerts}
