"""Story-deck endpoints (Discover Sanskrit).

``GET /story/chapters`` — the seven chapters, ranked, each with its ranked
cards. Read-only and local computation (DB reads + nothing else), so no
quota (§2.9). Auth-bound like /units and /shlokas.

There is deliberately NO attempt/grade endpoint for cards. Reading writes
nothing — no mastery, no XP, no review item. The dive-deeper screens a card
links to are the graded surfaces.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.auth import require_learner
from app.db import get_db
from app.models import Learner, StoryCard, StoryChapter
from app.schemas import StoryCardResponse, StoryChapterResponse

router = APIRouter()


def _card_to_response(c: StoryCard) -> StoryCardResponse:
    return StoryCardResponse(
        id=c.id,
        chapter_id=c.chapter_id or "",
        rank=c.rank or 0,
        title_en=c.title_en or "",
        title_hi=c.title_hi or "",
        body=c.body or "",
        example_dev=c.example_dev or "",
        example_iast=c.example_iast or "",
        example_gloss=c.example_gloss or "",
        deep_link=c.deep_link or "none",
        deep_link_label=c.deep_link_label or "",
        attribution=c.attribution or "",
    )


@router.get("/story/chapters", response_model=list[StoryChapterResponse])
async def read_story_chapters(
    learner: Learner = Depends(require_learner),  # noqa: F841 — auth-bound like /units
    db: Session = Depends(get_db),
):
    """The deck: seven ranked chapters, each with its ranked cards."""
    out = []
    chapters = db.query(StoryChapter).order_by(StoryChapter.rank).all()
    for ch in chapters:
        cards = (
            db.query(StoryCard)
            .filter(StoryCard.chapter_id == ch.id)
            .order_by(StoryCard.rank)
            .all()
        )
        out.append(StoryChapterResponse(
            id=ch.id,
            rank=ch.rank or 0,
            title_en=ch.title_en or "",
            title_hi=ch.title_hi or "",
            blurb=ch.blurb or "",
            cards=[_card_to_response(c) for c in cards],
        ))
    return out


@router.get("/story/cards", response_model=list[StoryCardResponse])
async def read_story_cards(
    chapter_id: str | None = Query(None, description="filter to one chapter, e.g. s2"),
    learner: Learner = Depends(require_learner),  # noqa: F841
    db: Session = Depends(get_db),
):
    """Flat card list, optionally filtered by chapter — ranked."""
    q = db.query(StoryCard)
    if chapter_id:
        q = q.filter(StoryCard.chapter_id == chapter_id)
    rows = q.order_by(StoryCard.chapter_id, StoryCard.rank).all()
    return [_card_to_response(c) for c in rows]
