"""Vocabulary curriculum reads (P22-5).

Words are grouped by the 10 topic slugs in ``seeds/briefs.py`` (SITUATIONS)
and frequency-ordered within a topic by ``rank``. Static content served from
the DB — no live external call, no network.
"""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.models import VocabWord
from app.seeds.briefs import SITUATIONS

TOPIC_SLUGS: list[str] = [s["slug"] for s in SITUATIONS]


def list_topics() -> list[dict[str, str]]:
    return [
        {"slug": s["slug"], "title": s.get("title", s["slug"]),
         "description": s.get("description", "")}
        for s in SITUATIONS
    ]


def words_for_topic(db: Session, topic: str) -> list[VocabWord]:
    return (
        db.query(VocabWord)
        .filter(VocabWord.topic == topic)
        .order_by(VocabWord.rank)
        .all()
    )
