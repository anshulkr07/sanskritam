"""Lesson-video catalogue (P24).

``GET /videos`` — the unit's videos, ranked. Metadata only: the app never
downloads, caches, or re-hosts video, so serving is plain DB reads and
carries no quota (§2.9). ``lesson_id`` resolves through the lesson's unit
(units are stable ``u1``..``u11``; lesson ids are seed-generated).

There is deliberately NO attempt/grade endpoint for videos. Watching writes
nothing — no mastery, no XP, no review item. The steps below the video are
the only graded surface, and YouTube Playback Integrity forbids
incentivised viewing.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.auth import require_learner
from app.db import get_db
from app.models import Learner, Lesson, VideoItem
from app.schemas import VideoItemResponse

router = APIRouter()


def _to_response(v: VideoItem) -> VideoItemResponse:
    return VideoItemResponse(
        id=v.id,
        unit_id=v.unit_id or "",
        rank=v.rank or 0,
        title=v.title or "",
        channel=v.channel or "",
        youtube_id=v.youtube_id,
        url=v.url or "",
        lang=v.lang or "en",
        duration_s=v.duration_s or 0,
        playback=v.playback or "embed",
        source_key=v.source_key or "",
    )


@router.get("/videos", response_model=list[VideoItemResponse])
async def read_videos(
    unit_id: str | None = Query(None, description="filter to one unit, e.g. u1"),
    lesson_id: str | None = Query(None, description="resolve the lesson's unit"),
    lang: str | None = Query(None, description="teaching medium: en | hi"),
    playback: str | None = Query(None, description="embed | link"),
    learner: Learner = Depends(require_learner),  # noqa: F841 — auth-bound like /shlokas
    db: Session = Depends(get_db),
):
    """The catalogue: ranked video metadata for a unit (or a lesson in it)."""
    if lesson_id:
        lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
        if lesson is None:
            raise HTTPException(status_code=404, detail=f"no lesson {lesson_id}")
        unit_id = lesson.unit_id
    q = db.query(VideoItem)
    if unit_id:
        q = q.filter(VideoItem.unit_id == unit_id)
    if lang:
        q = q.filter(VideoItem.lang == lang)
    if playback:
        q = q.filter(VideoItem.playback == playback)
    rows = q.order_by(VideoItem.unit_id, VideoItem.rank).all()
    return [_to_response(v) for v in rows]
