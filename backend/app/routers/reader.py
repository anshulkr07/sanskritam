"""Graded-reading endpoints (P22-6): GET /reader/{tier}.

Three tiers — 1 simple (Units 2–3) · 2 with sandhi (Unit 6) · 3 with
compounds/classical (Unit 10). Reading, not drilling: no verdict, no score,
and per P21 the list never triggers TTS. An empty tier returns [] (honest
empty state); an invalid tier is a 422 from the path validation.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import require_learner
from app.db import get_db
from app.models import Learner
from app.schemas import ReaderPassageResponse
from app.services.reader import VALID_TIERS, passages_for_tier

router = APIRouter()


@router.get("/reader/{tier}", response_model=list[ReaderPassageResponse])
async def read_tier(
    tier: int,
    learner: Learner = Depends(require_learner),
    db: Session = Depends(get_db),
):
    """Graded sentences for ``tier`` with breakdown + Vidyut parse."""
    if tier not in VALID_TIERS:
        raise HTTPException(status_code=404, detail=f"unknown reader tier {tier}")
    return [
        ReaderPassageResponse(
            tier=p.tier,
            sort_order=p.sort_order or 0,
            devanagari=p.devanagari,
            iast=p.iast or "",
            word_breakdown=p.word_breakdown or [],
            parse=p.parse or [],
            features=p.features or [],
            register=p.register or "laukika",
        )
        for p in passages_for_tier(db, tier)
    ]
