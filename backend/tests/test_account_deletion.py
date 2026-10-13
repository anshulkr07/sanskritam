"""Account deletion removes everything a learner owns.

Google Play requires deletion inside the app, and production is Postgres,
which enforces the learners.id foreign keys that SQLite in this suite does not.
So a table missed by DELETE /me would not leave rows behind quietly in
production — it would turn deletion into a 500. The first test is the guard
that catches a new table; the second proves the rows actually go.
"""

from datetime import datetime, timezone

import pytest

from app.db import SessionLocal
from app.models import (
    Base,
    ConversationSession,
    ConversationTurn,
    DailyActivity,
    DialogueScenario,
    Learner,
    PushToken,
    UsageEvent,
)
from app.routers.me import learner_owned_models


def test_every_table_referencing_learners_is_deleted_with_the_account():
    owned = {m.__table__.name for m in learner_owned_models()}
    referencing = {
        t.name
        for t in Base.metadata.tables.values()
        if any(fk.target_fullname == "learners.id" for fk in t.foreign_keys)
    }
    # escape_logs is nulled, not deleted: aggregate content metrics survive.
    assert referencing - {"escape_logs"} == owned

    # Rows that reference a learner-owned table rather than the learner must
    # be deleted first; delete_me handles them explicitly. conversation_turns
    # (by session ids) and the Play v2 grandchildren: match_participants and
    # match_events (by membership / with the match) and friend_goal_rounds
    # (by learner_id, before the paired friend_goals row goes).
    grandchildren = {
        t.name
        for t in Base.metadata.tables.values()
        if any(fk.target_fullname.split(".")[0] in owned for fk in t.foreign_keys)
    }
    assert grandchildren <= {"conversation_turns", "match_participants", "match_events", "friend_goal_rounds"}


def test_delete_me_removes_rows_in_every_owned_table(client):
    r = client.post("/auth/dev-login", json={"display_name": "delete-everything", "bridge_langs": ["en"]})
    assert r.status_code == 200, r.text
    lid = r.json()["learner"]["id"]
    headers = {"Authorization": f"Bearer {r.json()['token']}"}

    db = SessionLocal()
    try:
        scenario = db.query(DialogueScenario).first()
        if scenario is None:
            pytest.skip("No dialogue scenarios seeded")
        session = ConversationSession(learner_id=lid, scenario_id=scenario.id, mode="llm")
        db.add(session)
        db.flush()
        session_id = session.id
        db.add(ConversationTurn(session_id=session_id, idx=0, role="learner", devanagari="नमः"))
        db.add(DailyActivity(learner_id=lid, date="2026-09-16", xp=10))
        db.add(PushToken(learner_id=lid, device_id="device-1", token="ExponentPushToken[test]", platform="android"))
        db.add(UsageEvent(
            learner_id=lid, kind="tts_chars", amount=5, surface="test", source="live",
            ts=datetime.now(timezone.utc),
        ))
        db.commit()
    finally:
        db.close()

    r = client.delete("/me", headers=headers)
    assert r.status_code == 204, r.text

    db = SessionLocal()
    try:
        for model in learner_owned_models():
            if not hasattr(model, "learner_id"):
                continue  # paired-row tables (FriendGoal) are checked below
            left = db.query(model).filter(model.learner_id == lid).count()
            assert left == 0, f"{model.__tablename__} kept {left} row(s)"
        # Paired-row table: both columns must be clear of the deleted id.
        from app.models import FriendGoal
        assert db.query(FriendGoal).filter((FriendGoal.learner_a == lid) | (FriendGoal.learner_b == lid)).count() == 0
        assert db.query(ConversationTurn).filter(ConversationTurn.session_id == session_id).count() == 0
        assert db.get(Learner, lid) is None
    finally:
        db.close()
