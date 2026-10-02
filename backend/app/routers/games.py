"""Play games endpoints (HANDOVER 5.7). No vendor calls, no quota."""

from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth import require_learner
from app.db import get_db
from app.models import GameResult, Learner
from app.services import games as game_svc
from app.services.activity import record_activity
from app.services.localtime import local_date

router = APIRouter(prefix="/games")


@router.get("/deck")
def get_deck(
    game: str = Query("rush", pattern="^(rush|smriti)$"),
    set: str = Query("", description="letters|words"),
    topic: str = Query(""),
    learner: Learner = Depends(require_learner),
    db: Session = Depends(get_db),
):
    items = game_svc.deck(db, game, set_name=set, topic=topic)
    if len(items) < 40:
        raise HTTPException(status_code=404, detail="Not enough words for this game yet.")
    return {"game": game, "set": set or "words", "count": len(items), "items": items}


@router.get("/varna-jaal")
def get_varna_jaal(
    learner: Learner = Depends(require_learner),
    db: Session = Depends(get_db),
):
    tz = getattr(learner, "timezone", None) or "UTC"
    today_str = local_date(tz)
    day = date.fromisoformat(today_str)
    return game_svc.varna_jaal(day)


@router.get("/pools")
def get_pools(
    kind: str = Query(""),
    learner: Learner = Depends(require_learner),
    db: Session = Depends(get_db),
):
    from app.seeds import game_pools as pools

    if not kind:
        built = pools.build_pools()
        return {"kinds": sorted(built.keys()), "counts": {k: len(v) for k, v in built.items()}}
    if kind not in ("reorder", "sandhi_join", "sandhi_split", "grid_fill", "contrast", "scan_metre"):
        raise HTTPException(status_code=404, detail="Unknown pool kind.")
    items = pools.pools_for(kind)
    return {"kind": kind, "count": len(items), "params": items}


@router.get("/daily")
def get_daily(
    learner: Learner = Depends(require_learner),
    db: Session = Depends(get_db),
):
    return game_svc.daily_info(db, learner)


class GameResultIn(BaseModel):
    game: str = Field(description="rush|smriti|varna-jaal|practice kind")
    mode: str = ""
    score: int = 0
    moves: int = 0
    duration_ms: int = 0
    daily: bool = False
    found: int = 0
    total: int = 0


@router.post("/result")
def post_result(
    body: GameResultIn,
    learner: Learner = Depends(require_learner),
    db: Session = Depends(get_db),
):
    game = (body.game or "").strip()[:32]
    if not game:
        raise HTTPException(status_code=422, detail="Game is required.")
    tz = getattr(learner, "timezone", None) or "UTC"
    today_str = local_date(tz)

    # Points for this result, capped at 30; games cannot fill the daily goal
    # alone: at most 60 per day from games.
    pts = game_svc.points_for(game, score=body.score, moves=body.moves, found=body.found)
    day_total = (
        db.query(func.coalesce(func.sum(GameResult.score), 0))
        if False
        else None
    )
    # Sum XP already awarded today from games via DailyActivity? Track via
    # game_results rows joined to awarded points stored in score? Instead keep
    # a simple cap: sum prior points today from a lightweight query on xp.
    # We store awarded xp in moves? No: recompute prior awarded points.
    prior = db.query(GameResult).filter(GameResult.learner_id == learner.id, GameResult.date == today_str).all()
    prior_xp = 0
    for r in prior:
        prior_xp += game_svc.points_for(r.game, score=r.score, moves=r.moves, found=0)
    if prior_xp >= 60:
        pts = 0
    elif prior_xp + pts > 60:
        pts = 60 - prior_xp

    info = game_svc.daily_info(db, learner)
    met = game_svc.goal_met(game if game in ("rush", "smriti", "varna-jaal") else info["game"], info["goal"], score=body.score, moves=body.moves, found=body.found, total=body.total)
    # Sandhi practice round uses its own goal shape; goal_met handles score.
    if game in ("reorder", "sandhi_join", "sandhi_split", "grid_fill", "contrast", "scan_metre", "practice", "sandhi"):
        met = int(body.score or 0) >= 60

    row = GameResult(
        learner_id=learner.id,
        date=today_str,
        game=game,
        mode=(body.mode or "")[:32],
        score=int(body.score or 0),
        moves=int(body.moves or 0),
        duration_ms=int(body.duration_ms or 0),
        daily=bool(body.daily),
        goal_met=bool(met and body.daily) if body.daily else bool(met) if game in ("rush", "smriti", "varna-jaal") else False,
    )
    # Practice rounds count toward the streak only when played as daily.
    if game in ("rush", "smriti", "varna-jaal"):
        row.goal_met = bool(met) if body.daily else row.goal_met and False or False
        # Non-daily bests still store goal_met for streak only when daily.
        if not body.daily:
            # Keep the raw achievement for bests, but streak counts daily only
            # in daily_info (it queries goal_met regardless of daily flag, so
            # gate here: non-daily never sets goal_met).
            row.goal_met = False
            if met:
                # A non-daily goal met is still a best candidate; streak picks
                # it up only via daily rows, so leave goal_met False.
                pass
    db.add(row)
    if pts:
        record_activity(db, learner, xp=pts, attempts=1)
    db.commit()

    # Best per game+mode.
    best_row = (
        db.query(GameResult)
        .filter(GameResult.learner_id == learner.id, GameResult.game == game, GameResult.mode == (body.mode or "")[:32])
        .order_by(GameResult.score.desc())
        .first()
    )
    best = int(best_row.score or 0) if best_row else int(body.score or 0)
    is_best = bool(best_row and best_row.id == row.id)

    fresh = game_svc.daily_info(db, learner)
    return {
        "xp": pts,
        "best": best,
        "is_best": is_best,
        "daily_done": bool(fresh["done"]),
        "streak": int(fresh["streak"]),
    }
