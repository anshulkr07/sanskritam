"""P20 — writing practice endpoints.

``GET  /writing/items`` — the drill corpus (tier 1/2/3), IAST included
(P7-13-derived, so the reading crutch is correct for the learner who cannot
yet read Devanagari).

``POST /writing/attempt`` — record one handwriting attempt. P20-3 contract:
the body carries {item_id, recognised_text, confidence, source} — NEVER the
strokes and NEVER an image (§2.16). The verdict is three-valued
(correct|wrong|unsure); `unsure` provably cannot lower mastery or break a
streak, and this router enforces that by never calling the streak/mastery
path except on `correct`.

P20-4: the photo path (source='photo') biases hard toward `unsure` via the
configured thresholds; abstention rates are reported per source in
GET /admin/metrics.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth import require_learner
from app.db import get_db
from app.models import Learner, WritingAttempt, WritingItem
from app.services.writing import grade_writing

logger = logging.getLogger("shabd.writing")

router = APIRouter(prefix="/writing")


class WritingAttemptRequest(BaseModel):
    item_id: str
    recognised_text: str = Field(default="", description="On-device ML Kit output — never the strokes, never the image")
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    source: str = Field(default="ink", description="'ink' | 'photo'")


class WritingAttemptResponse(BaseModel):
    verdict: str                 # correct | wrong | unsure
    abstained: bool
    item_id: str
    item_devanagari: str
    item_iast: str
    attempt_id: int | None = None


class WritingItemResponse(BaseModel):
    id: str
    tier: int
    sort_order: int
    devanagari: str
    iast: str
    gloss: str
    stroke_paths: list = []
    challenge_id: str | None = None


@router.get("/items", response_model=list[WritingItemResponse])
async def list_writing_items(
    tier: int | None = None,
    _learner: Learner = Depends(require_learner),
    db: Session = Depends(get_db),
):
    """The writing drill corpus, ordered tier then teaching order."""
    q = db.query(WritingItem)
    if tier is not None:
        q = q.filter(WritingItem.tier == tier)
    rows = q.order_by(WritingItem.tier, WritingItem.sort_order).all()
    return [
        WritingItemResponse(
            id=r.id,
            tier=r.tier,
            sort_order=r.sort_order,
            devanagari=r.devanagari,
            iast=r.iast or "",
            gloss=r.gloss or "",
            stroke_paths=r.stroke_paths or [],
            challenge_id=r.challenge_id,
        )
        for r in rows
    ]


@router.post("/attempt", response_model=WritingAttemptResponse)
async def writing_attempt(
    req: WritingAttemptRequest,
    learner: Learner = Depends(require_learner),
    db: Session = Depends(get_db),
):
    """Grade and persist one writing attempt (P20-3).

    §2.2 enforcement, structurally: the streak/mastery path is reachable ONLY
    from the `correct` branch — there is no code path by which `unsure` can
    penalise, because none exists.
    """
    item = db.get(WritingItem, req.item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Unknown writing item")

    source = req.source if req.source in ("ink", "photo") else "ink"
    scoring = grade_writing(item.devanagari, req.recognised_text, req.confidence, source)

    attempt = WritingAttempt(
        learner_id=learner.id,
        item_id=item.id,
        recognised_text=(req.recognised_text or "")[:128],
        confidence=req.confidence,
        source=source,
        verdict=scoring["verdict"],
        abstained=scoring["abstained"],
    )
    db.add(attempt)
    db.flush()
    # Real practice for the goal bar + calendar.
    from app.services.activity import WRITING_XP, record_activity
    record_activity(
        db,
        learner,
        xp=0 if scoring["abstained"] else WRITING_XP.get(scoring["verdict"], 0),
        attempts=1,
    )
    db.commit()
    db.refresh(attempt)

    # Correct attempts feed handwriting progress — which lives in its OWN
    # column (P23-5). feature_mastery maps feature_id -> float; writing
    # progress maps item-iast -> {attempts, correct}. Mixing them made
    # feature_mastery heterogeneous and broke every float() reader.
    if scoring["verdict"] == "correct":
        writing = dict(learner.writing_mastery or {})
        # Lazy migration: rows written before P23-5 carry "write:" dicts in
        # feature_mastery. Move them once, here — this router owns the only
        # writer, so one move point covers every learner.
        mastery = dict(learner.feature_mastery or {})
        legacy = {k: v for k, v in mastery.items()
                  if isinstance(k, str) and k.startswith("write:") and isinstance(v, dict)}
        for k, v in legacy.items():
            short = k[len("write:"):]
            cell = dict(writing.get(short) or {"attempts": 0, "correct": 0})
            cell["attempts"] = int(cell.get("attempts", 0)) + int(v.get("attempts", 0))
            cell["correct"] = int(cell.get("correct", 0)) + int(v.get("correct", 0))
            writing[short] = cell
            del mastery[k]
        if legacy:
            learner.feature_mastery = mastery
        key = item.iast or item.devanagari
        cell = dict(writing.get(key) or {"attempts": 0, "correct": 0})
        cell["attempts"] = int(cell.get("attempts", 0)) + 1
        cell["correct"] = int(cell.get("correct", 0)) + 1
        writing[key] = cell
        learner.writing_mastery = writing
        db.commit()

    return WritingAttemptResponse(
        verdict=scoring["verdict"],
        abstained=scoring["abstained"],
        item_id=item.id,
        item_devanagari=item.devanagari,
        item_iast=item.iast or "",
        attempt_id=attempt.id,
    )
