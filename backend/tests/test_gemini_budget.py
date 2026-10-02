"""The Gemini ceiling (owner decision 2026-10-02: ₹200/day across everyone),
the real cost of auto-detect speech, and the ledger's column width.

The suite runs with both ceilings off (conftest: one shared database); each
test here turns one on relative to what is already spent. Zero network calls.
"""

from datetime import date, datetime, timezone
from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient

from app.config import Settings, settings
from app.db import SessionLocal
from app.main import create_app
from app.models import Learner, UsageEvent
from app.services import quota
from app.services.quota import (
    BUDGET_KIND,
    GEMINI_BUDGET_KIND,
    GEMINI_KIND,
    QuotaExceeded,
    check_and_consume,
    gemini_cost_inr,
    gemini_headroom_inr,
    refund_quota,
    settle_quota,
    spend_since,
    usage_since,
)

_UID = 0


@pytest.fixture
def fresh_client():
    app = create_app()
    with TestClient(app) as c:
        yield c


def _login(client):
    global _UID
    _UID += 1
    r = client.post("/auth/dev-login",
                    json={"display_name": f"gemini-budget-{_UID}", "bridge_langs": ["en", "hi"]})
    assert r.status_code == 200, r.text
    data = r.json()
    return data["learner"]["id"], {"Authorization": f"Bearer {data['token']}"}


def _seed(learner_id, kind, amount):
    db = SessionLocal()
    try:
        db.add(UsageEvent(learner_id=learner_id, kind=kind, amount=amount, surface="test",
                          source="live", ts=datetime.now(timezone.utc)))
        db.commit()
    finally:
        db.close()


def _spent(pool):
    db = SessionLocal()
    try:
        return spend_since(db, settings.quota_window_hours, pool)
    finally:
        db.close()


def _with_learner(lid, fn):
    db = SessionLocal()
    try:
        return fn(db, db.query(Learner).filter(Learner.id == lid).first())
    finally:
        db.close()


def test_gemini_ceiling_ships_on_at_200():
    assert Settings.model_fields["gemini_daily_budget_inr"].default == 200.0
    assert Settings.model_fields["quota_daily_budget_inr"].default == 300.0


def test_the_two_ceilings_do_not_share_money(fresh_client):
    lid, _ = _login(fresh_client)
    sarvam, gemini = _spent("sarvam"), _spent("gemini")
    _seed(lid, GEMINI_KIND, 5.0)       # ₹5 of Gemini
    _seed(lid, "tts_chars", 1_000)     # ₹3 of Sarvam
    assert _spent("gemini") - gemini == pytest.approx(5.0)
    assert _spent("sarvam") - sarvam == pytest.approx(3.0)


def test_gemini_ceiling_blocks_everyone_once_spent(fresh_client, monkeypatch):
    spender, _ = _login(fresh_client)
    other, _ = _login(fresh_client)
    monkeypatch.setattr(settings, "gemini_daily_budget_inr", _spent("gemini") + 1.0)
    _seed(spender, GEMINI_KIND, 0.9)

    with pytest.raises(QuotaExceeded) as exc:
        _with_learner(other, lambda db, l: check_and_consume(db, l, GEMINI_KIND, 0.2, surface="test"))
    assert exc.value.kind == GEMINI_BUDGET_KIND
    # A call that still fits goes through.
    _with_learner(other, lambda db, l: check_and_consume(db, l, GEMINI_KIND, 0.05, surface="test"))


def test_spent_gemini_ceiling_leaves_sarvam_alone(fresh_client, monkeypatch):
    mock_client = AsyncMock()
    mock_client.text_to_speech.return_value = "bW9ja2VkYXVkaW8="
    monkeypatch.setattr("app.routers.speech.get_sarvam_client", lambda: mock_client)
    spender, headers = _login(fresh_client)
    monkeypatch.setattr(settings, "gemini_daily_budget_inr", _spent("gemini") + 0.5)
    monkeypatch.setattr(settings, "quota_daily_budget_inr", _spent("sarvam") + 100.0)
    _seed(spender, GEMINI_KIND, 5.0)   # far past the Gemini ceiling

    r = fresh_client.post("/speech/tts", json={"text": "नमस्ते", "surface": "test"}, headers=headers)
    assert r.status_code == 200, r.text


def test_spent_sarvam_ceiling_leaves_gemini_alone(fresh_client, monkeypatch):
    spender, _ = _login(fresh_client)
    monkeypatch.setattr(settings, "quota_daily_budget_inr", _spent("sarvam") + 1.0)
    monkeypatch.setattr(settings, "gemini_daily_budget_inr", _spent("gemini") + 100.0)
    _seed(spender, "tts_chars", 10_000)   # ₹30 of Sarvam, past its ceiling

    _with_learner(spender, lambda db, l: check_and_consume(db, l, GEMINI_KIND, 0.2, surface="test"))
    with pytest.raises(QuotaExceeded) as exc:
        _with_learner(spender, lambda db, l: check_and_consume(db, l, "llm_calls", 1, surface="test"))
    assert exc.value.kind == BUDGET_KIND


def test_one_learner_cannot_drain_the_gemini_pool(fresh_client):
    lid, _ = _login(fresh_client)
    _seed(lid, GEMINI_KIND, settings.quota_gemini_inr_per_day - 0.1)
    with pytest.raises(QuotaExceeded) as exc:
        _with_learner(lid, lambda db, l: check_and_consume(db, l, GEMINI_KIND, 0.2, surface="test"))
    assert exc.value.kind == GEMINI_KIND


def test_settle_replaces_the_reservation_with_the_real_cost(fresh_client):
    lid, _ = _login(fresh_client)

    def run(db, learner):
        check_and_consume(db, learner, GEMINI_KIND, 0.40, surface="test")
        settle_quota(db, learner, GEMINI_KIND, 0.40, 0.11, surface="test")
        return usage_since(db, lid, GEMINI_KIND, 24)

    assert _with_learner(lid, run) == pytest.approx(0.11)


def test_headroom(fresh_client, monkeypatch):
    lid, _ = _login(fresh_client)
    assert _with_learner(lid, lambda db, l: gemini_headroom_inr(db)) == float("inf")  # ceiling off in the suite
    monkeypatch.setattr(settings, "gemini_daily_budget_inr", _spent("gemini") + 7.0)
    _seed(lid, GEMINI_KIND, 2.0)
    assert _with_learner(lid, lambda db, l: gemini_headroom_inr(db)) == pytest.approx(5.0)


def test_gemini_price_and_the_january_step():
    """$0.75 / $3.75 per 1M through 2026, $1.50 / $7.50 after, at ₹100."""
    before = gemini_cost_inr(1_000_000, 1_000_000, on=date(2026, 12, 31))
    after = gemini_cost_inr(1_000_000, 1_000_000, on=date(2027, 1, 1))
    assert before == pytest.approx((0.75 + 3.75) * settings.usd_inr)
    assert after == pytest.approx((1.50 + 7.50) * settings.usd_inr)
    # One verse study: about 400 tokens in, 300 out.
    assert gemini_cost_inr(400, 300, on=date(2026, 10, 2)) == pytest.approx(0.1425)


# ── auto-detect speech is three Saaras calls ─────────────────────────────────

def _stt(client, headers, language_code):
    audio = b"\x00\x00" * 16000 * 10   # 10 s of 16 kHz 16-bit mono
    return client.post("/speech/stt", headers=headers,
                       files={"file": ("a.wav", audio, "audio/wav")},
                       data={"language_code": language_code, "mode": "transcribe", "surface": "test"})


def _mock_stt(monkeypatch, fail=False):
    from app.services.sarvam import SarvamError

    mock_client = AsyncMock()
    if fail:
        mock_client.speech_to_text.side_effect = SarvamError(502, "mock failure")
    else:
        mock_client.speech_to_text.return_value = {"transcript": "नमस्ते", "language_code": "hi-IN"}
    monkeypatch.setattr("app.routers.speech.get_sarvam_client", lambda: mock_client)
    return mock_client


def test_auto_detect_charges_the_budget_for_three_passes_and_the_learner_for_one(fresh_client, monkeypatch):
    mock_client = _mock_stt(monkeypatch)
    lid, headers = _login(fresh_client)
    before = _spent("sarvam")

    r = _stt(fresh_client, headers, "unknown")
    assert r.status_code == 200, r.text
    assert mock_client.speech_to_text.call_count == 3

    used = _with_learner(lid, lambda db, l: usage_since(db, lid, "stt_seconds", 24))
    assert used == pytest.approx(10.0), "the learner's allowance moves by the recording, once"
    assert _spent("sarvam") - before == pytest.approx(30.0 * settings.price_stt_inr_per_second)


def test_pinned_language_is_one_pass(fresh_client, monkeypatch):
    mock_client = _mock_stt(monkeypatch)
    lid, headers = _login(fresh_client)
    before = _spent("sarvam")
    assert _stt(fresh_client, headers, "sa-IN").status_code == 200
    assert mock_client.speech_to_text.call_count == 1
    assert _spent("sarvam") - before == pytest.approx(10.0 * settings.price_stt_inr_per_second)


def test_failed_auto_detect_refunds_all_three_passes(fresh_client, monkeypatch):
    _mock_stt(monkeypatch, fail=True)
    lid, headers = _login(fresh_client)
    before = _spent("sarvam")
    assert _stt(fresh_client, headers, "unknown").status_code == 502
    assert _spent("sarvam") - before == pytest.approx(0.0)
    assert _with_learner(lid, lambda db, l: usage_since(db, lid, "stt_seconds", 24)) == pytest.approx(0.0)


def test_budget_blocks_auto_detect_on_its_real_cost(fresh_client, monkeypatch):
    """Room for one pass is not room for three."""
    mock_client = _mock_stt(monkeypatch)
    _, headers = _login(fresh_client)
    one_pass = 10.0 * settings.price_stt_inr_per_second
    monkeypatch.setattr(settings, "quota_daily_budget_inr", _spent("sarvam") + one_pass * 2)
    r = _stt(fresh_client, headers, "unknown")
    assert r.status_code == 429 and r.json()["detail"]["kind"] == BUDGET_KIND
    mock_client.speech_to_text.assert_not_called()


# ── the ledger's 16-character columns ────────────────────────────────────────

def test_every_ledger_value_fits_its_column(fresh_client):
    """PostgreSQL refuses a value longer than the column; SQLite does not, so
    only a test can see it here. "downstream_failure" is 18 characters."""
    lid, _ = _login(fresh_client)

    def run(db, learner):
        check_and_consume(db, learner, "stt_seconds", 5, surface="test", vendor_amount=15)
        refund_quota(db, learner, "stt_seconds", 5, surface="test",
                     reason="downstream_failure", vendor_amount=15)
        check_and_consume(db, learner, GEMINI_KIND, 0.3, surface="test")
        settle_quota(db, learner, GEMINI_KIND, 0.3, 0.1, surface="test")
        return db.query(UsageEvent).filter(UsageEvent.learner_id == lid).all()

    rows = _with_learner(lid, run)
    assert len(rows) == 6
    kind_len = UsageEvent.__table__.c.kind.type.length
    source_len = UsageEvent.__table__.c.source.type.length
    for r in rows:
        assert len(r.kind) <= kind_len, r.kind
        assert len(r.source) <= source_len, r.source
    assert {r.source for r in rows} == {"live", "refund", "settle"}


def test_unknown_pool_kind_is_free_of_charge_but_still_an_error(fresh_client):
    lid, _ = _login(fresh_client)
    with pytest.raises(ValueError, match="Unknown quota kind"):
        _with_learner(lid, lambda db, l: check_and_consume(db, l, "gemini_calls", 1))
    assert quota._price_inr("stt_seconds_x") == settings.price_stt_inr_per_second
