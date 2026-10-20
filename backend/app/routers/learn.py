"""The story course ("The Burnt Book"): content, story state, review.

    GET  /learn/index           the journey: acts, parts, units, lesson summaries,
                                ghosts, leaves, cast (ETag; 304 when unchanged)
    GET  /learn/lessons/{id}    one lesson's cards (ETag = the lesson's hash)
    GET  /learn/state           where this learner is in the story
                                (?track=simple: in Simple mode)
    POST /learn/attempts        a lesson's graded answers → spaced review
    GET  /learn/review          practice cards due again, ready to render
    POST /learn/test-out        a passed unit check finishes the unit's lessons

Finishing a lesson stays ``POST /progress/card-lesson`` (XP, streak and the
GameResult row the story state is derived from); nothing here duplicates it.

Content is built once per process from ``app/curriculum/content`` (see
``app.curriculum``). Index and lessons need no sign-in: they are the same
for everyone, so phones can cache them by ETag and work offline.
"""

from __future__ import annotations

import logging
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth import require_learner
from app.db import get_db
from app.models import Learner

logger = logging.getLogger("shabd.learn")

router = APIRouter(prefix="/learn")

REVIEW_KIND = "learn"
CARD_LESSON_GAME = "card-lesson"  # the game name POST /progress/card-lesson writes
# Simple mode (owner, 2026-10-20): the same lessons, no story, its own
# progress. It has no prologue, so the prologue counts as read there.
TRACK_GAMES = {"story": CARD_LESSON_GAME, "simple": "card-lesson-simple"}
Track = Literal["story", "simple"]
TEST_OUT_PASS = 0.8  # share of a unit check answered right to test out
MAX_RESULTS = 60


def _pack():
    from app.curriculum import get_pack

    return get_pack()


def _cached(request: Request, payload: dict, tag: str) -> Response:
    """JSON with a strong ETag; 304 when the phone already has this version."""
    etag = f'"{tag}"'
    if etag in (request.headers.get("if-none-match") or ""):
        return Response(status_code=304, headers={"ETag": etag})
    return JSONResponse(payload, headers={"ETag": etag, "Cache-Control": "no-cache"})


def review_key(lesson_id: str, card_id: str) -> str:
    return f"learn:{lesson_id}#{card_id}"


def _parse_key(key: str) -> tuple[str, str] | None:
    if not key.startswith("learn:") or "#" not in key:
        return None
    lesson_id, card_id = key[len("learn:"):].split("#", 1)
    return lesson_id, card_id


def _finished(db: Session, learner_id: str, lesson_ids: set[str], track: str = "story") -> set[str]:
    from app.models import GameResult

    rows = (
        db.query(GameResult.mode)
        .filter(GameResult.learner_id == learner_id, GameResult.game == TRACK_GAMES[track])
        .distinct()
        .all()
    )
    done = {m for (m,) in rows if m in lesson_ids}
    prologue = ((_pack().index.get("course") or {}).get("prologue") or {}).get("id")
    if track == "simple" and prologue:
        done.add(prologue)
    return done


@router.get("/index")
def read_index(request: Request):
    pack = _pack()
    return _cached(request, pack.index, pack.version)


@router.get("/lessons/{lesson_id}")
def read_lesson(lesson_id: str, request: Request):
    pack = _pack()
    lesson = pack.lessons.get(lesson_id)
    if lesson is None:
        raise HTTPException(status_code=404, detail="No such lesson.")
    return _cached(request, lesson, lesson["hash"])


@router.get("/state")
def read_state(track: Track = Query("story"), learner: Learner = Depends(require_learner),
               db: Session = Depends(get_db)):
    from app.curriculum.state import derive

    pack = _pack()
    state = derive(pack.index, _finished(db, learner.id, set(pack.lessons), track))
    state["version"] = pack.version
    return state


class CardResult(BaseModel):
    card_id: str = Field(min_length=1, max_length=48)
    verdict: Literal["correct", "off_by_one", "incorrect", "unsure"]


class AttemptsIn(BaseModel):
    lesson_id: str = Field(min_length=1, max_length=32)
    results: list[CardResult] = Field(default_factory=list, max_length=MAX_RESULTS)


@router.post("/attempts")
def record_attempts(body: AttemptsIn, learner: Learner = Depends(require_learner),
                    db: Session = Depends(get_db)):
    """Each graded practice card joins the learner's review schedule (an
    explore card or an unknown card is ignored; "unsure" schedules nothing).
    One call per lesson, sent when the lesson ends."""
    from app.services.review import schedule_review

    lesson = _pack().lessons.get(body.lesson_id)
    if lesson is None:
        raise HTTPException(status_code=404, detail="No such lesson.")
    practice = {c["id"] for c in lesson["cards"] if c.get("kind") == "practice"}
    scheduled = 0
    for r in body.results:
        if r.card_id not in practice:
            continue
        row = schedule_review(db, learner.id, review_key(body.lesson_id, r.card_id),
                              REVIEW_KIND, r.verdict)
        scheduled += row is not None
    db.commit()
    return {"scheduled": scheduled}


@router.get("/review")
def read_review(limit: int = Query(12, ge=1, le=50),
                learner: Learner = Depends(require_learner), db: Session = Depends(get_db)):
    """Practice cards due again, oldest first, each with the card itself so
    the review session renders it like any card. A card whose lesson was
    rewritten since (gone, or no longer practice) is skipped."""
    from app.services.review import due_count, due_items

    lessons = _pack().lessons
    items = []
    for row in due_items(db, learner.id, limit=limit * 2, kinds=[REVIEW_KIND]):
        parsed = _parse_key(row.item_key)
        if parsed is None:
            continue
        lesson = lessons.get(parsed[0])
        card = next((c for c in (lesson or {}).get("cards", []) if c.get("id") == parsed[1]), None)
        if card is None or card.get("kind") != "practice":
            continue
        items.append({
            "item_key": row.item_key,
            "lesson_id": parsed[0],
            "lesson_title": lesson["title"],
            "due_at": row.due_at.isoformat() if hasattr(row.due_at, "isoformat") else str(row.due_at),
            "card": card,
        })
        if len(items) >= limit:
            break
    return {"due_count": due_count(db, learner.id, kinds=[REVIEW_KIND]), "items": items}


class TestOutIn(BaseModel):
    unit_id: str = Field(min_length=1, max_length=64)
    checks_right: int = Field(ge=0)
    checks_total: int = Field(ge=1)
    track: Track = "story"


@router.post("/test-out")
def test_out(body: TestOutIn, learner: Learner = Depends(require_learner),
             db: Session = Depends(get_db)):
    """“I know this”: a learner who passes the current unit's check (taken
    first, via POST /progress/card-lesson) has the unit's lessons marked
    finished, without XP. Only the unit the learner is on can be tested
    out, so nobody skips the road ahead blind; the next unit can be tested
    out straight after."""
    from app.curriculum.state import derive
    from app.models import GameResult
    from app.services.localtime import learner_today

    pack = _pack()
    unit = next((u for a in pack.index["acts"] for p in a["parts"] for u in p["units"]
                 if u["id"] == body.unit_id), None)
    if unit is None or unit.get("status") != "ready" or not unit.get("check"):
        raise HTTPException(status_code=404, detail="No such unit.")
    finished = _finished(db, learner.id, set(pack.lessons), body.track)
    if unit["check"]["id"] not in finished:
        raise HTTPException(status_code=409, detail="Finish the unit check first.")
    if body.checks_right > body.checks_total or body.checks_right / body.checks_total < TEST_OUT_PASS:
        raise HTTPException(status_code=409, detail="The check was not passed.")
    lessons = [l["id"] for l in unit["lessons"]]
    current = derive(pack.index, finished - {unit["check"]["id"]}).get("current") or {}
    if current.get("unit_id") != body.unit_id:
        raise HTTPException(status_code=409, detail="Only the unit you are on can be tested out.")
    added = []
    for lesson_id in lessons:
        if lesson_id in finished:
            continue
        db.add(GameResult(learner_id=learner.id, date=learner_today(learner), game=TRACK_GAMES[body.track],
                          mode=lesson_id, score=0, moves=0, goal_met=False, daily=False))
        added.append(lesson_id)
    db.commit()
    return {"finished": added}
