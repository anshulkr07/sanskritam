"""Vocabulary endpoints (P22-5): GET /vocab/{topic}.

Frequency-ordered word lists per topic slug (the 10 SITUATIONS slugs from
``seeds/briefs.py``). An unknown topic is an honest 404, never a blank
(§2.11). Static content — no quota, no network.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import require_learner
from app.db import get_db
from app.models import Learner
from app.schemas import VocabExample, VocabWordResponse
from app.services.vocab import TOPIC_SLUGS, list_topics, words_for_topic

router = APIRouter()


@router.get("/vocab/topics")
async def vocab_topics(
    learner: Learner = Depends(require_learner),
):
    """The 10 topic slugs with titles — the selector the client renders."""
    return {"topics": list_topics()}


@router.get("/vocab/{topic}", response_model=list[VocabWordResponse])
async def read_vocab(
    topic: str,
    learner: Learner = Depends(require_learner),
    db: Session = Depends(get_db),
):
    """Frequency-ordered words for ``topic``; empty list when the topic has
    no words yet (honest empty state), 404 when the topic does not exist."""
    if topic not in TOPIC_SLUGS:
        raise HTTPException(status_code=404, detail=f"unknown vocab topic {topic}")
    return [
        VocabWordResponse(
            topic=w.topic,
            rank=w.rank or 0,
            devanagari=w.devanagari,
            iast=w.iast or "",
            gloss=w.gloss or "",
            gender=w.gender or "",
            stem=w.stem or "",
            examples=[VocabExample(
                devanagari=e.get("devanagari", ""),
                iast=e.get("iast", ""),
                gloss=e.get("gloss", ""),
            ) for e in (w.examples or [])],
        )
        for w in words_for_topic(db, topic)
    ]
