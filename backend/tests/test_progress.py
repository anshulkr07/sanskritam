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


# ─── P4-2: Streak, freeze, repair ─────────────────────

def test_repair_streak_requires_auth(client):
    r = client.post("/progress/repair")
    assert r.status_code == 401


def test_repair_streak_consumes_freeze(client):
    headers, lid = _login(client, "repair-test")
    r = client.post("/progress/repair", headers=headers)
    assert r.status_code == 200
    body = r.json()
    assert body["repaired"] is True
    assert body["streak"] >= 1
    assert body["freezes_remaining"] == 1


def test_repair_streak_exhausts_freezes(client):
    headers, lid = _login(client, "repair-exhaust")
    r1 = client.post("/progress/repair", headers=headers)
    assert r1.json()["repaired"] is True
    r2 = client.post("/progress/repair", headers=headers)
    assert r2.json()["repaired"] is True
    r3 = client.post("/progress/repair", headers=headers)
    assert r3.json()["repaired"] is False, "Third repair should fail — no freezes left"


def test_streak_freezes_initial_value(client):
    headers, lid = _login(client, "freeze-init")
    r = client.get("/progress/streak", headers=headers)
    assert r.json()["freezes"] == 2


def test_repair_outside_window_graceful(client):
    """Repair with no freezes returns repaired=False."""
    headers, lid = _login(client, "repair-outside")
    # Exhaust all freezes first
    for _ in range(2):
        client.post("/progress/repair", headers=headers)
    r = client.post("/progress/repair", headers=headers)
    assert r.status_code == 200
    assert r.json()["repaired"] is False


def test_streak_has_learner_column():
    from app.models import Learner
    cols = {c.name for c in Learner.__table__.columns}
    assert "streak_freezes" in cols
    assert "daily_goal_xp" in cols
    assert "last_active_date" in cols


def test_streak_default_is_zero_for_new_learner(client):
    """New learner starts with streak=0."""
    headers, lid = _login(client, "streak-zero")
    r = client.get("/progress/streak", headers=headers)
    assert r.json()["streak"] == 0


# ─── P5: Storage abstraction ──────────────────────────

def test_storage_store_and_exists(tmp_path):
    from app.services.storage import LocalStorage, content_hash
    s = LocalStorage(base_dir=str(tmp_path / "audio"))
    data = b"fake-wav-data"
    path = "test/recording.wav"
    url = s.store(data, path)
    assert s.exists(path)
    assert data == (tmp_path / "audio" / path).read_bytes()


def test_content_hash_produces_deterministic_output():
    from app.services.storage import content_hash
    h1 = content_hash(b"same-data")
    h2 = content_hash(b"same-data")
    assert h1 == h2
    assert len(h1) == 32