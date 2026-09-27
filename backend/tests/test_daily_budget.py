"""Service-wide daily spend budget (owner decision 2026-09-15: ₹300/day).

Per-learner quotas are tested in test_quota.py. The suite runs with the budget
off (conftest sets QUOTA_DAILY_BUDGET_INR=0, because usage rows from every test
share one database); each test here turns it on relative to what is already
spent. Zero network calls: the Sarvam client is mocked.
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient

from app.config import Settings, settings
from app.db import SessionLocal
from app.main import create_app
from app.models import UsageEvent
from app.services.quota import BUDGET_KIND, spend_since

_UID = 0


@pytest.fixture
def fresh_client():
    """Function-scoped TestClient — allows per-test monkeypatching."""
    app = create_app()
    with TestClient(app) as c:
        yield c


def _login(client):
    global _UID
    _UID += 1
    r = client.post(
        "/auth/dev-login",
        json={"display_name": f"budget-tester-{_UID}", "bridge_langs": ["en", "hi"]},
    )
    assert r.status_code == 200, r.text
    data = r.json()
    return data["learner"]["id"], {"Authorization": f"Bearer {data['token']}"}


def _seed(learner_id: str, kind: str, amount: float):
    db = SessionLocal()
    try:
        db.add(UsageEvent(
            learner_id=learner_id,
            kind=kind,
            amount=amount,
            surface="test",
            source="live",
            ts=datetime.now(timezone.utc),
        ))
        db.commit()
    finally:
        db.close()


def _spent() -> float:
    db = SessionLocal()
    try:
        return spend_since(db, settings.quota_window_hours)
    finally:
        db.close()


def _mock_sarvam(monkeypatch):
    mock_client = AsyncMock()
    mock_client.text_to_speech.return_value = "bW9ja2VkYXVkaW8="
    monkeypatch.setattr("app.routers.speech.get_sarvam_client", lambda: mock_client)
    return mock_client


def test_budget_ships_on_at_300():
    """Production gets the ceiling by default; only the test suite turns it off."""
    assert Settings.model_fields["quota_daily_budget_inr"].default == 300.0


def test_spend_prices_each_kind(fresh_client):
    """1,000 chars (₹3) + 360 s of speech (₹3) + 10 LLM calls (₹1) = ₹7."""
    lid, _ = _login(fresh_client)
    before = _spent()
    _seed(lid, "tts_chars", 1_000)
    _seed(lid, "stt_seconds", 360)
    _seed(lid, "llm_calls", 10)
    assert _spent() - before == pytest.approx(7.0)


def test_refund_nets_out_of_spend(fresh_client):
    lid, _ = _login(fresh_client)
    before = _spent()
    _seed(lid, "tts_chars", 1_000)
    _seed(lid, "tts_chars", -1_000)
    assert _spent() - before == pytest.approx(0.0)


def test_budget_blocks_a_learner_who_spent_nothing(fresh_client, monkeypatch):
    """Other learners' spend exhausts the budget for everyone, before any vendor call."""
    mock_client = _mock_sarvam(monkeypatch)
    spender, _ = _login(fresh_client)
    _, headers = _login(fresh_client)
    monkeypatch.setattr(settings, "quota_daily_budget_inr", _spent() + 1.0)
    _seed(spender, "tts_chars", 500)  # ₹1.50 — past the ₹1 of headroom

    r = fresh_client.post("/speech/tts", json={"text": "नमस्ते", "surface": "test"}, headers=headers)
    assert r.status_code == 429, r.text
    assert r.json()["detail"]["kind"] == BUDGET_KIND
    mock_client.text_to_speech.assert_not_called()


def test_budget_allows_calls_within_it(fresh_client, monkeypatch):
    _mock_sarvam(monkeypatch)
    _, headers = _login(fresh_client)
    monkeypatch.setattr(settings, "quota_daily_budget_inr", _spent() + 100.0)

    r = fresh_client.post("/speech/tts", json={"text": "नमस्ते", "surface": "test"}, headers=headers)
    assert r.status_code == 200, r.text


def test_zero_budget_is_off(fresh_client, monkeypatch):
    _mock_sarvam(monkeypatch)
    spender, _ = _login(fresh_client)
    _, headers = _login(fresh_client)
    monkeypatch.setattr(settings, "quota_daily_budget_inr", 0.0)
    _seed(spender, "tts_chars", 1_000_000)  # ₹3,000 spent by someone else

    r = fresh_client.post("/speech/tts", json={"text": "नमस्ते", "surface": "test"}, headers=headers)
    assert r.status_code == 200, r.text
