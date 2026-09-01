"""Tests for progress endpoints (P4-1, P4-2)."""

from fastapi.testclient import TestClient

from app.main import create_app


def _login(client, name="progress-tester"):
    r = client.post("/auth/dev-login", json={"display_name": name, "bridge_langs": ["en", "hi"]})
    assert r.status_code == 200
    data = r.json()
    return {"Authorization": f"Bearer {data['token']}"}, data["learner"]["id"]


# ─── P4-1: Daily goal and XP ──────────────────────────

def test_get_daily_requires_auth(client):
    r = client.get("/progress/daily")
    assert r.status_code == 401


def test_get_daily_returns_zeroes_for_new_learner(client):
    headers, lid = _login(client, "daily-new")
    r = client.get("/progress/daily", headers=headers)
    assert r.status_code == 200
    body = r.json()
    assert body["xp"] == 0
    assert body["attempts"] == 0
    assert body["goal_xp"] == 50
    assert body["date"] is not None


def test_get_daily_shape(client):
    headers, lid = _login(client, "daily-shape")
    r = client.get("/progress/daily", headers=headers)
    assert r.status_code == 200
    body = r.json()
    assert "date" in body
    assert "xp" in body
    assert "goal_xp" in body
    assert "goal_met" in body
    assert "attempts" in body
    assert "conversation_turns" in body
    assert "pronunciation_attempts" in body


def test_default_goal_xp(client):
    """Default daily_goal_xp is 50."""
    headers, lid = _login(client, "daily-goal")
    r = client.get("/progress/daily", headers=headers)
    assert r.json()["goal_xp"] == 50


def test_get_streak_requires_auth(client):
    r = client.get("/progress/streak")
    assert r.status_code == 401


def test_get_streak_returns_zero_for_new_learner(client):
    headers, lid = _login(client, "streak-new")
    r = client.get("/progress/streak", headers=headers)
    assert r.status_code == 200
    body = r.json()
    assert body["streak"] == 0
    assert "freezes" in body
    assert "max_freezes" in body


def test_get_streak_shape(client):
    headers, lid = _login(client, "streak-shape")
    r = client.get("/progress/streak", headers=headers)
    assert r.status_code == 200
    body = r.json()
    assert "streak" in body
    assert "freezes" in body
    assert "max_freezes" in body


def test_daily_activity_model_has_expected_columns():
    from app.models import DailyActivity
    assert DailyActivity.__tablename__ == "daily_activity"
    cols = {c.name for c in DailyActivity.__table__.columns}
    expected = {"id", "learner_id", "date", "xp", "attempts",
                "conversation_turns", "pronunciation_attempts", "goal_met"}
    assert cols >= expected