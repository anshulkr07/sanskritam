"""POST /speech/tts serves repeated text from memory (2026-10-02).

Bulbul is billed per character and the verse of the day is the same text for
every learner. The suite runs with the cache off (conftest); each test turns
it on. Zero network calls: the Sarvam client is mocked.
"""

from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.db import SessionLocal
from app.main import create_app
from app.models import UsageEvent
from app.routers import speech

_UID = 0
VERSE = "धर्मो रक्षति रक्षितः।"


@pytest.fixture
def fresh_client():
    app = create_app()
    with TestClient(app) as c:
        yield c


@pytest.fixture
def cache_on(monkeypatch):
    monkeypatch.setattr(settings, "tts_cache_max_bytes", 1024)
    speech._tts_cache.clear()
    monkeypatch.setattr(speech, "_tts_cache_bytes", 0)
    yield
    speech._tts_cache.clear()


@pytest.fixture
def sarvam(monkeypatch):
    mock_client = AsyncMock()
    mock_client.text_to_speech.return_value = "QVVESU8="
    monkeypatch.setattr("app.routers.speech.get_sarvam_client", lambda: mock_client)
    return mock_client


def _login(client):
    global _UID
    _UID += 1
    r = client.post("/auth/dev-login",
                    json={"display_name": f"tts-cache-{_UID}", "bridge_langs": ["en", "hi"]})
    assert r.status_code == 200, r.text
    data = r.json()
    return data["learner"]["id"], {"Authorization": f"Bearer {data['token']}"}


def _events(learner_id):
    db = SessionLocal()
    try:
        return db.query(UsageEvent).filter(UsageEvent.learner_id == learner_id).count()
    finally:
        db.close()


def _tts(client, headers, text=VERSE, **extra):
    return client.post("/speech/tts", headers=headers,
                       json={"text": text, "language_code": "sa-IN", "surface": "shloka", **extra})


def test_second_learner_hears_the_verse_without_a_vendor_call(fresh_client, cache_on, sarvam):
    first, h1 = _login(fresh_client)
    second, h2 = _login(fresh_client)

    a = _tts(fresh_client, h1)
    b = _tts(fresh_client, h2)
    assert a.status_code == b.status_code == 200
    assert a.json()["audio_base64"] == b.json()["audio_base64"] == "QVVESU8="
    assert sarvam.text_to_speech.call_count == 1
    assert _events(first) == 1
    assert _events(second) == 0, "a cache hit spends nothing, so it charges nothing"


def test_cached_audio_is_served_past_a_spent_allowance(fresh_client, cache_on, sarvam, monkeypatch):
    _, h1 = _login(fresh_client)
    _tts(fresh_client, h1)
    _, h2 = _login(fresh_client)
    monkeypatch.setattr(settings, "quota_tts_chars_per_day", 0)
    assert _tts(fresh_client, h2).status_code == 200
    assert _tts(fresh_client, h2, text="नवीनं वाक्यम्").status_code == 429


def test_voice_pace_and_language_are_part_of_the_key(fresh_client, cache_on, sarvam):
    _, headers = _login(fresh_client)
    _tts(fresh_client, headers)
    _tts(fresh_client, headers, pace=0.8)
    _tts(fresh_client, headers, speaker="anushka")
    fresh_client.post("/speech/tts", headers=headers,
                      json={"text": VERSE, "language_code": "en-IN", "surface": "shloka"})
    assert sarvam.text_to_speech.call_count == 4


def test_failed_synthesis_is_not_cached(fresh_client, cache_on, sarvam):
    from app.services.sarvam import SarvamError

    _, headers = _login(fresh_client)
    sarvam.text_to_speech.side_effect = SarvamError(502, "mock failure")
    assert _tts(fresh_client, headers).status_code == 502
    sarvam.text_to_speech.side_effect = None
    assert _tts(fresh_client, headers).status_code == 200
    assert sarvam.text_to_speech.call_count == 2


def test_cache_stays_inside_its_byte_limit(cache_on, monkeypatch):
    monkeypatch.setattr(settings, "tts_cache_max_bytes", 100)
    for i in range(10):
        speech._tts_cache_put((f"text-{i}", "hi-IN", "aditya", 1.0), "x" * 20)
    assert speech._tts_cache_bytes <= 100
    assert len(speech._tts_cache) == 5
    # Oldest out first, newest kept.
    assert ("text-9", "hi-IN", "aditya", 1.0) in speech._tts_cache
    assert ("text-0", "hi-IN", "aditya", 1.0) not in speech._tts_cache
    # One clip larger than a quarter of the room is not kept at all.
    speech._tts_cache_put(("huge", "hi-IN", "aditya", 1.0), "x" * 26)
    assert ("huge", "hi-IN", "aditya", 1.0) not in speech._tts_cache


def test_cache_off_means_every_request_reaches_the_vendor(fresh_client, sarvam, monkeypatch):
    monkeypatch.setattr(settings, "tts_cache_max_bytes", 0)
    _, headers = _login(fresh_client)
    _tts(fresh_client, headers)
    _tts(fresh_client, headers)
    assert sarvam.text_to_speech.call_count == 2
