"""Tests for voice quota enforcement (P0-2).

All tests use monkeypatched Sarvam client — zero network calls.
"""

import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.config import settings
from app.db import SessionLocal
from app.main import create_app
from app.models import Learner, UsageEvent


# ── Helpers ─────────────────────────────────────────────

_UID = 0


def _unique_name() -> str:
    """Return a unique display name per call to avoid learner reuse."""
    global _UID
    _UID += 1
    return f"quota-tester-{_UID}"


@pytest.fixture
def fresh_client():
    """Function-scoped TestClient — allows per-test monkeypatching."""
    app = create_app()
    with TestClient(app) as c:
        yield c


def _login(client, name=None):
    name = name or _unique_name()
    r = client.post("/auth/dev-login", json={"display_name": name, "bridge_langs": ["en", "hi"]})
    assert r.status_code == 200, r.text
    data = r.json()
    return data["token"], data["learner"]["id"], {"Authorization": f"Bearer {data['token']}"}


def _seed_usage(learner_id: str, kind: str, amount: float, hours_ago: float = 0):
    """Insert a UsageEvent row directly for test setup."""
    db: Session = SessionLocal()
    try:
        event = UsageEvent(
            learner_id=learner_id,
            kind=kind,
            amount=amount,
            surface="test",
            source="live",
            ts=datetime.now(timezone.utc) - timedelta(hours=hours_ago),
        )
        db.add(event)
        db.commit()
    finally:
        db.close()


def _count_usage_events(learner_id: str = None) -> int:
    """Count UsageEvent rows (optionally filtered by learner)."""
    db: Session = SessionLocal()
    try:
        q = db.query(UsageEvent)
        if learner_id:
            q = q.filter(UsageEvent.learner_id == learner_id)
        return q.count()
    finally:
        db.close()


def _get_learner(learner_id: str) -> Learner:
    db: Session = SessionLocal()
    try:
        return db.query(Learner).filter(Learner.id == learner_id).first()
    finally:
        db.close()


def _monkeypatch_sarvam(monkeypatch):
    """Set up a mock Sarvam client that returns success."""
    mock_client = AsyncMock()
    mock_client.text_to_speech.return_value = "bW9ja2VkYXVkaW8="  # "mockaudio" base64
    mock_client.speech_to_text.return_value = {
        "transcript": "mock transcript",
        "language_code": "sa-IN",
    }
    monkeypatch.setattr("app.routers.speech.get_sarvam_client", lambda: mock_client)
    return mock_client


# ── TTS quota tests ────────────────────────────────────

def test_tts_under_limit(fresh_client, monkeypatch):
    """Under limit → 200, one UsageEvent row written."""
    _monkeypatch_sarvam(monkeypatch)
    token, lid, headers = _login(fresh_client)

    r = fresh_client.post("/speech/tts", json={"text": "नमस्ते", "surface": "test"}, headers=headers)
    assert r.status_code == 200, r.text

    events = _count_usage_events(lid)
    assert events == 1, f"Expected exactly 1 UsageEvent, found {events}"

    db: Session = SessionLocal()
    try:
        event = db.query(UsageEvent).filter(UsageEvent.learner_id == lid).first()
        assert event.kind == "tts_chars"
        assert event.amount == len("नमस्ते")  # 6 Unicode chars
        assert event.surface == "test"
        assert event.source == "live"
    finally:
        db.close()


def test_tts_crosses_limit_returns_429(fresh_client, monkeypatch):
    """Crossing limit → 429, no UsageEvent written, no Sarvam call made."""
    mock_client = _monkeypatch_sarvam(monkeypatch)
    token, lid, headers = _login(fresh_client)

    # Seed enough usage to exhaust quota (quota_tts_chars_per_day = 20_000)
    _seed_usage(lid, "tts_chars", 19_995)

    # This request should cross the 20_000 limit
    r = fresh_client.post("/speech/tts", json={"text": "अतिरिक्तपरीक्षणपाठः", "surface": "test"}, headers=headers)
    assert r.status_code == 429, f"Expected 429, got {r.status_code}: {r.text}"

    # No UsageEvent should have been written for the failed request
    count = _count_usage_events(lid)
    assert count == 1, f"Expected exactly 1 seeded event, found {count}"

    # Sarvam should NOT have been called
    mock_client.text_to_speech.assert_not_called()


def test_events_outside_window_excluded(fresh_client, monkeypatch):
    """Events older than the window are excluded from the sum."""
    _monkeypatch_sarvam(monkeypatch)
    token, lid, headers = _login(fresh_client)

    # Seed an event from 48 hours ago (window is 24 hours)
    _seed_usage(lid, "tts_chars", 19_000, hours_ago=48)

    # Should still pass because the old event is outside the window
    r = fresh_client.post("/speech/tts", json={"text": "नमस्ते", "surface": "test"}, headers=headers)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"

    # Now seed an event within the window that would push us over
    _seed_usage(lid, "tts_chars", 19_995, hours_ago=0)

    # This request should now be blocked
    r = fresh_client.post("/speech/tts", json={"text": "अधिकः", "surface": "test"}, headers=headers)
    assert r.status_code == 429, "Recent event should still be in window"


def test_429_retry_after_header(fresh_client, monkeypatch):
    """429 body carries retry_after_s > 0 and Retry-After header."""
    _monkeypatch_sarvam(monkeypatch)
    token, lid, headers = _login(fresh_client)
    _seed_usage(lid, "tts_chars", 20_000)

    r = fresh_client.post("/speech/tts", json={"text": "a", "surface": "test"}, headers=headers)
    assert r.status_code == 429

    body = r.json()
    detail = body["detail"]
    assert detail["retry_after_s"] > 0
    assert detail["kind"] == "tts_chars"
    assert detail["used"] >= 20_000
    assert detail["limit"] == 20_000

    # Retry-After header should be present
    header_val = r.headers.get("retry-after") or r.headers.get("Retry-After", "0")
    assert int(header_val) > 0


def test_two_learners_independent_budgets(fresh_client, monkeypatch):
    """Two learners have independent quota budgets."""
    _monkeypatch_sarvam(monkeypatch)

    token1, lid1, headers1 = _login(fresh_client, "learner-a-quota")
    r2 = fresh_client.post("/auth/dev-login", json={"display_name": "learner-b-quota", "bridge_langs": ["en", "hi"]})
    assert r2.status_code == 200
    data2 = r2.json()
    lid2 = data2["learner"]["id"]
    headers2 = {"Authorization": f"Bearer {data2['token']}"}

    # Exhaust learner1's quota
    _seed_usage(lid1, "tts_chars", 20_000)

    # Learner1 should get 429
    r1 = fresh_client.post("/speech/tts", json={"text": "परीक्षा", "surface": "test"}, headers=headers1)
    assert r1.status_code == 429, f"Learner-a should be blocked, got {r1.status_code}"

    # Learner2 should get 200 (independent budget)
    r2 = fresh_client.post("/speech/tts", json={"text": "परीक्षा", "surface": "test"}, headers=headers2)
    assert r2.status_code == 200, f"Learner-b should be unblocked, got {r2.status_code}"


# ── STT quota tests ────────────────────────────────────

def test_stt_under_limit(fresh_client, monkeypatch):
    """STT under limit → 200."""
    _monkeypatch_sarvam(monkeypatch)
    token, lid, headers = _login(fresh_client)

    audio_bytes = b"\x00\x00" * 8000  # 16000 bytes → ~0.5s of 16kHz 16-bit mono

    r = fresh_client.post(
        "/speech/stt",
        files={"file": ("test.wav", audio_bytes, "audio/wav")},
        data={"language_code": "sa-IN", "mode": "transcribe", "surface": "test"},
        headers=headers,
    )
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
    assert r.json()["transcript"] == "mock transcript"


def test_stt_crosses_limit_returns_429(fresh_client, monkeypatch):
    """STT crossing limit → 429, no Sarvam call."""
    mock_client = _monkeypatch_sarvam(monkeypatch)
    token, lid, headers = _login(fresh_client)

    # Seed STT usage close to limit (quota_stt_seconds_per_day = 900)
    _seed_usage(lid, "stt_seconds", 895)

    # A 10-second audio chunk would push it over (895 + 10 > 900)
    audio_bytes = b"\x00\x00" * 16000 * 10  # 320000 bytes → ~10s

    r = fresh_client.post(
        "/speech/stt",
        files={"file": ("big.wav", audio_bytes, "audio/wav")},
        data={"language_code": "sa-IN", "mode": "transcribe", "surface": "test"},
        headers=headers,
    )
    assert r.status_code == 429, f"Expected 429, got {r.status_code}: {r.text}"
    mock_client.speech_to_text.assert_not_called()


def test_stt_increments_voice_minutes(fresh_client, monkeypatch):
    """voice_minutes_used increments on STT."""
    _monkeypatch_sarvam(monkeypatch)
    token, lid, headers = _login(fresh_client)

    before = _get_learner(lid).voice_minutes_used

    # ~30 seconds of audio: 16000 * 2 * 30 = 960000 bytes
    audio_bytes = b"\x00\x00" * 480000  # 960000 bytes → ~30s

    r = fresh_client.post(
        "/speech/stt",
        files={"file": ("long.wav", audio_bytes, "audio/wav")},
        data={"language_code": "sa-IN", "mode": "transcribe", "surface": "varnamala"},
        headers=headers,
    )
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"

    after = _get_learner(lid).voice_minutes_used
    assert after > before, f"voice_minutes_used should increase: {before} -> {after}"
    # 30 seconds = 0.5 minutes
    assert abs(after - before - 0.5) < 0.01, f"Expected ~0.5 minute increase, got {after - before}"


# ── Quota disabled test ────────────────────────────────

def test_quota_disabled_no_enforcement(fresh_client, monkeypatch):
    """quota_enabled=False → no enforcement, no rows."""
    # Patch settings at the module level rather than env var
    monkeypatch.setattr(settings, "quota_enabled", False)

    # Need a fresh app so route handlers pick up the patched settings
    # (actually settings is a module-level singleton; routes import it,
    #  monkeypatch.setattr affects the live object, so even the existing
    #  app should see it)
    _monkeypatch_sarvam(monkeypatch)
    token, lid, headers = _login(fresh_client)

    _seed_usage(lid, "tts_chars", 999_999)

    r = fresh_client.post("/speech/tts", json={"text": "बहुत", "surface": "test"}, headers=headers)
    assert r.status_code == 200, f"Expected 200 with quota disabled, got {r.status_code}: {r.text}"

    # No new UsageEvents from check_and_consume when disabled
    count = _count_usage_events(lid)
    assert count == 1, f"Expected only the seeded event, found {count}"