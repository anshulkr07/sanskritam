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
    db.commit()
    db.refresh(attempt)

    # Correct attempts may feed mastery the way pronunciation does. Unsure
    # contributes NOTHING (§2.2) — and nothing here writes it.
    if scoring["verdict"] == "correct":
        # Copy before mutating: assigning the loaded JSON dict back to the
        # column after in-place mutation records NO attribute change, and the
        # UPDATE is silently skipped (it passes in isolation, where the
        # column starts empty, and drops the write on a populated row).
        mastery = dict(learner.feature_mastery or {})
        key = f"write:{item.iast or item.devanagari}"
        cell = dict(mastery.get(key) or {"attempts": 0, "correct": 0, "ef": 2.5})
        cell["attempts"] += 1
        cell["correct"] += 1
        mastery[key] = cell
        learner.feature_mastery = mastery
        db.commit()

    return WritingAttemptResponse(
        verdict=scoring["verdict"],
        abstained=scoring["abstained"],
        item_id=item.id,
        item_devanagari=item.devanagari,
        item_iast=item.iast or "",
        attempt_id=attempt.id,
    )
