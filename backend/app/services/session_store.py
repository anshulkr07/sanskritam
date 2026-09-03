"""Session state management for dialogue conversations.

SQLite-backed via SQLAlchemy. ConversationSession model lives in app/models.py.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session as DBSession

from app.models import (
    ConversationSession,
    DialogueScenario,
    DialogueNode,
    Learner,
)


def create_session(
    db: DBSession,
    learner: Learner,
    scenario: DialogueScenario,
    mode: str = "llm",
) -> ConversationSession:
    """Create a conversation session.

    In "graph" mode the session starts at the scenario's entry node and walks
    authored edges. In "llm" mode there is no node — the scenario supplies the
    situation and the target features, and `services/tutor.py` drives the
    conversation. The scenario is recorded either way.
    """
    session = ConversationSession(
        id=uuid.uuid4().hex[:16],
        learner_id=learner.id,
        scenario_id=scenario.id,
        current_node_id=scenario.entry_node_id if mode == "graph" else None,
        mode=mode,
        turn_count=0,
        ratio_hint=getattr(learner, "sanskrit_ratio", 0.3) or 0.3,
    )
    db.add(session)
    db.commit()
    return session


def get_session(
    db: DBSession,
    session_id: str,
    learner_id: str,
) -> Optional[ConversationSession]:
    """Look up a session by id, scoped to the learner (ownership check)."""
    return (
        db.query(ConversationSession)
        .filter(
            ConversationSession.id == session_id,
            ConversationSession.learner_id == learner_id,
        )
        .first()
    )


def advance(
    db: DBSession,
    session: ConversationSession,
    node_id: str,
    ratio_hint_delta: float = 0.0,
) -> ConversationSession:
    """Advance the session to the given node, updating turn count and ratio hint.

    Args:
        db: Database session.
        session: Conversation session to advance.
        node_id: Target node ID (may be same as current for repair retry).
        ratio_hint_delta: Adjustment to ratio_hint (added then clamped [0, 1]).

    Returns:
        The updated session (also committed).
    """
    session.current_node_id = node_id
    session.turn_count = (session.turn_count or 0) + 1
    # Clamp ratio_hint
    current_hint = session.ratio_hint or 0.3
    session.ratio_hint = max(0.0, min(1.0, current_hint + ratio_hint_delta))
    session.updated_at = datetime.now(timezone.utc)
    db.commit()
    return session
