"""Structured metrics: escape rate, TTS source share, top escape nodes.

All ``emit()`` calls go to a dedicated ``shabd.metrics`` logger as JSON lines.
Never raises — metrics failure must never break a request.
"""

import json
import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models import ConversationSession, EscapeLog, UsageEvent

logger = logging.getLogger("shabd.metrics")


def emit(event: str, **fields) -> None:
    """Write one structured JSON line to the 'shabd.metrics' logger.

    Never raises — metrics must never break a request.
    """
    try:
        record = {
            "event": event,
            "ts": datetime.now(timezone.utc).isoformat(),
            **fields,
        }
        logger.info(json.dumps(record))
    except Exception:
        pass


def escape_rate(db: Session, hours: int = 24) -> dict:
    """Return {'escapes': int, 'turns': int, 'rate': float} over the window."""
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)

    escapes = (
        db.query(func.count(EscapeLog.id))
        .filter(EscapeLog.ts >= cutoff)
        .scalar()
        or 0
    )

    total_turns_result = (
        db.query(func.coalesce(func.sum(ConversationSession.turn_count), 0))
        .filter(ConversationSession.started_at >= cutoff)
        .scalar()
        or 0
    )
    total_turns = int(total_turns_result)

    rate = round(escapes / total_turns, 4) if total_turns > 0 else 0.0

    return {"escapes": escapes, "turns": total_turns, "rate": rate}


def tts_share(db: Session, hours: int = 24) -> dict:
    """Return {'live_chars': int, 'prerendered_chars': int, 'live_share': float}."""
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)

    rows = (
        db.query(UsageEvent.source, func.coalesce(func.sum(UsageEvent.amount), 0))
        .filter(
            UsageEvent.kind == "tts_chars",
            UsageEvent.ts >= cutoff,
        )
        .group_by(UsageEvent.source)
        .all()
    )

    totals = {"live": 0, "prerendered": 0}
    for source, total in rows:
        s = source or "live"
        if s in totals:
            totals[s] = int(total)

    live = totals["live"]
    prerendered = totals["prerendered"]
    total = live + prerendered
    live_share = round(live / total, 4) if total > 0 else 0.0

    return {"live_chars": live, "prerendered_chars": prerendered, "live_share": live_share}


def top_escape_nodes(db: Session, limit: int = 20) -> list[dict]:
    """Nodes ranked by escape count — this is the authoring priority queue.

    Returns [{'node_id': str, 'scenario_id': str, 'escapes': int}, ...].
    """
    rows = (
        db.query(
            EscapeLog.node_id,
            EscapeLog.scenario_id,
            func.count(EscapeLog.id).label("escapes"),
        )
        .group_by(EscapeLog.node_id, EscapeLog.scenario_id)
        .order_by(func.count(EscapeLog.id).desc())
        .limit(limit)
        .all()
    )

    return [
        {"node_id": node_id, "scenario_id": scenario_id, "escapes": escapes}
        for node_id, scenario_id, escapes in rows
    ]