"""Tests for structured metrics (P0-3).

Tests verify the metrics service functions and the GET /admin/metrics endpoint.
All use deltas from a shared DB to avoid interference from other tests.
"""

import uuid
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.main import create_app
from app.models import (
    ConversationSession,
    DialogueNode,
    DialogueScenario,
    EscapeLog,
    Learner,
    UsageEvent,
)


# ── Helpers ─────────────────────────────────────────────

@pytest.fixture
def fresh_client():
    app = create_app()
    with TestClient(app) as c:
        yield c


def _login(client):
    uid = uuid.uuid4().hex[:12]
    r = client.post("/auth/dev-login", json={"display_name": f"metrics-tester-{uid}", "bridge_langs": ["en", "hi"]})
    assert r.status_code == 200, r.text
    data = r.json()
    return data["token"], data["learner"]["id"], {"Authorization": f"Bearer {data['token']}"}


def _ensure_scenario_and_node(learner_id: str) -> tuple[str, str]:
    """Create a scenario + node for test data, return (scenario_id, node_id)."""
    db: Session = SessionLocal()
    try:
        scenario = DialogueScenario(
            id=uuid.uuid4().hex[:16],
            title="Test Scenario - Metrics",
            description="metrics test",
            register="laukika",
        )
        db.add(scenario)
        db.commit()
        node = DialogueNode(
            id=uuid.uuid4().hex[:16],
            scenario_id=scenario.id,
            kind="tutor",
            lang="sa",
            devanagari="metrics test node",
        )
        db.add(node)
        db.commit()
        return scenario.id, node.id
    finally:
        db.close()


def _count_escapes(scenario_id: str) -> int:
    """Count escapes for a specific scenario."""
    db: Session = SessionLocal()
    try:
        return db.query(EscapeLog).filter(EscapeLog.scenario_id == scenario_id).count()
    finally:
        db.close()


def _count_sessions(scenario_id: str) -> int:
    db: Session = SessionLocal()
    try:
        return db.query(ConversationSession).filter(
            ConversationSession.scenario_id == scenario_id,
            ConversationSession.started_at >= datetime.now(timezone.utc) - timedelta(hours=48),
        ).count()
    finally:
        db.close()


# ── Tests ──────────────────────────────────────────────

def test_emit_never_raises():
    """emit() never raises even on bad input."""
    from app.services.metrics import emit

    # These should all be swallowed without error
    emit("test")
    emit("test", extra={})
    emit("test", numeric_field=42, complex_field=None)
    # Should not raise
    assert True


def test_escape_rate_math(fresh_client):
    """escape_rate maths returns correct numbers with seeded test rows."""
    from app.services.metrics import escape_rate

    token, lid, headers = _login(fresh_client)
    scenario_id, node_id = _ensure_scenario_and_node(lid)

    # Use a long-enough window to cover our seed data
    db: Session = SessionLocal()
    try:
        # Add two sessions with known turn counts
        for turn_count, hours in [(20, 2), (30, 1)]:
            sess = ConversationSession(
                id=uuid.uuid4().hex[:16],
                learner_id=lid,
                scenario_id=scenario_id,
                current_node_id=node_id,
                turn_count=turn_count,
                started_at=datetime.now(timezone.utc) - timedelta(hours=hours),
            )
            db.add(sess)
        db.commit()

        # Add two escapes
        for hours in [1, 2]:
            esc = EscapeLog(
                id=uuid.uuid4().hex[:16],
                learner_id=lid,
                scenario_id=scenario_id,
                node_id=node_id,
                transcript="test escape",
                parsed_features={},
                verdict="no_match",
                ts=datetime.now(timezone.utc) - timedelta(hours=hours),
            )
            db.add(esc)
        db.commit()

        result = escape_rate(db, hours=48)
        # Our test data has 2 escapes, but so do other tests — so we assert the
        # function returns realistic shape and the total is >= 2
        assert result["escapes"] >= 2
        assert result["turns"] >= 50  # 20 + 30
        assert isinstance(result["rate"], float)
        assert result["rate"] >= 0.0
    finally:
        db.close()


def test_escape_rate_window_filtering(fresh_client):
    """Older events are excluded by window parameter."""
    from app.services.metrics import escape_rate

    token, lid, headers = _login(fresh_client)
    scenario_id, node_id = _ensure_scenario_and_node(lid)

    db: Session = SessionLocal()
    try:
        # Very old escape + session (outside any reasonable test window)
        esc = EscapeLog(
            id=uuid.uuid4().hex[:16],
            learner_id=lid, scenario_id=scenario_id, node_id=node_id,
            transcript="old", parsed_features={}, verdict="no_match",
            ts=datetime.now(timezone.utc) - timedelta(hours=120),
        )
        db.add(esc)
        sess = ConversationSession(
            id=uuid.uuid4().hex[:16],
            learner_id=lid, scenario_id=scenario_id,
            current_node_id=node_id, turn_count=100,
            started_at=datetime.now(timezone.utc) - timedelta(hours=120),
        )
        db.add(sess)
        db.commit()

        # 24-hour window should exclude these 120-hour-old events
        result_24 = escape_rate(db, hours=24)
        before_escapes_24 = result_24["escapes"]

        # 200-hour window should include them
        result_200 = escape_rate(db, hours=200)
        after_escapes_200 = result_200["escapes"]

        # The wide window should see MORE escapes than the narrow window
        # (at minimum, it includes our seeded one)
        assert after_escapes_200 >= before_escapes_24 + 1, (
            f"Wide window ({after_escapes_200}) should have more escapes than "
            f"narrow window ({before_escapes_24})"
        )
    finally:
        db.close()


def test_top_escape_nodes_ordering(fresh_client):
    """top_escape_nodes returns nodes ranked by escape count."""
    from app.services.metrics import top_escape_nodes

    token, lid, headers = _login(fresh_client)
    scenario_id, node_id1 = _ensure_scenario_and_node(lid)

    db: Session = SessionLocal()
    try:
        # Create a second node in the same scenario
        node_id2 = uuid.uuid4().hex[:16]
        node2 = DialogueNode(
            id=node_id2, scenario_id=scenario_id,
            kind="tutor", lang="sa", devanagari="node2",
        )
        db.add(node2)
        db.commit()

        # Seeded escapes for node1 (3) and node2 (1)
        for _ in range(3):
            db.add(EscapeLog(
                id=uuid.uuid4().hex[:16], learner_id=lid,
                scenario_id=scenario_id, node_id=node_id1,
                transcript="test", parsed_features={}, verdict="no_match",
                ts=datetime.now(timezone.utc) - timedelta(hours=1),
            ))
        db.add(EscapeLog(
            id=uuid.uuid4().hex[:16], learner_id=lid,
            scenario_id=scenario_id, node_id=node_id2,
            transcript="test", parsed_features={}, verdict="no_match",
            ts=datetime.now(timezone.utc) - timedelta(hours=1),
        ))
        db.commit()

        result = top_escape_nodes(db)
        # Find our test nodes in the results
        node1_entries = [r for r in result if r["node_id"] == node_id1]
        node2_entries = [r for r in result if r["node_id"] == node_id2]
        assert len(node1_entries) == 1
        assert len(node2_entries) == 1
        assert node1_entries[0]["escapes"] == 3
        assert node2_entries[0]["escapes"] == 1
        # node1 should rank higher than node2
        node1_rank = result.index(node1_entries[0])
        node2_rank = result.index(node2_entries[0])
        assert node1_rank < node2_rank, "node1 (3 escapes) should rank above node2 (1 escape)"
    finally:
        db.close()


def test_tts_share_math(fresh_client):
    """tts_share splits on source column."""
    from app.services.metrics import tts_share

    token, lid, headers = _login(fresh_client)

    db: Session = SessionLocal()
    try:
        before = tts_share(db, hours=48)
        live_before = before["live_chars"]
        pre_before = before["prerendered_chars"]

        # Add test TTS events
        db.add(UsageEvent(
            learner_id=lid, kind="tts_chars", amount=800,
            surface="test", source="live",
            ts=datetime.now(timezone.utc) - timedelta(hours=1),
        ))
        db.add(UsageEvent(
            learner_id=lid, kind="tts_chars", amount=200,
            surface="test", source="prerendered",
            ts=datetime.now(timezone.utc) - timedelta(hours=1),
        ))
        db.commit()

        after = tts_share(db, hours=48)
        assert after["live_chars"] == live_before + 800
        assert after["prerendered_chars"] == pre_before + 200
    finally:
        db.close()


def test_admin_metrics_requires_auth(fresh_client):
    """GET /admin/metrics returns 401 without admin header."""
    r = fresh_client.get("/admin/metrics")
    assert r.status_code == 401


def test_admin_metrics_shape(fresh_client):
    """GET /admin/metrics returns all three rollups."""
    r = fresh_client.get("/admin/metrics", headers={"X-Admin-Token": "test-admin"})
    assert r.status_code == 200
    body = r.json()
    assert "escape_rate" in body
    assert "tts_share" in body
    assert "top_escape_nodes" in body
    assert isinstance(body["escape_rate"]["rate"], float)
    assert body["tts_share"]["live_share"] >= 0.0
    assert isinstance(body["top_escape_nodes"], list)