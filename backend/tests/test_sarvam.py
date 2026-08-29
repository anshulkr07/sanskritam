"""Tests for Sarvam TTS/STT integration (mocked — no real API calls)."""

import base64
import io
import json
from unittest.mock import AsyncMock, patch, MagicMock

import httpx
import pytest


# ─── helpers ──────────────────────────────────


def _login(client, name="speech_tester"):
    r = client.post("/auth/dev-login", json={"display_name": name, "bridge_langs": ["en", "hi"]})
    assert r.status_code == 200
    return {"Authorization": f"Bearer {r.json()['token']}"}


FAKE_AUDIO_B64 = base64.b64encode(b"\x00" * 100).decode()


def _mock_tts_response():
    """Fake httpx.Response for a successful TTS call."""
    return httpx.Response(
        status_code=200,
        json={"audio": FAKE_AUDIO_B64},
        request=httpx.Request("POST", "https://api.sarvam.ai/text-to-speech"),
    )


def _mock_stt_response(transcript="नमस्ते"):
    """Fake httpx.Response for a successful STT call."""
    return httpx.Response(
        status_code=200,
        json={"transcript": transcript, "language_code": "sa-IN"},
        request=httpx.Request("POST", "https://api.sarvam.ai/speech-to-text"),
    )


# ─── TTS tests ────────────────────────────────


def test_tts_requires_auth(client):
    r = client.post("/speech/tts", json={"text": "hello"})
    assert r.status_code == 401


def test_tts_returns_503_without_api_key(client):
    """When SARVAM_API_KEY is empty, the endpoint should return 503."""
    h = _login(client)
    with patch("app.routers.speech.get_sarvam_client", side_effect=RuntimeError("SARVAM_API_KEY is not configured")):
        r = client.post("/speech/tts", json={"text": "hello"}, headers=h)
    assert r.status_code == 503
    assert "not configured" in r.json()["detail"].lower()


def test_tts_happy_path(client):
    h = _login(client, "tts_ok")

    with patch("app.routers.speech.get_sarvam_client") as mock_get:
        mock_client = AsyncMock()
        mock_client.text_to_speech.return_value = FAKE_AUDIO_B64
        mock_get.return_value = mock_client

        r = client.post("/speech/tts", json={"text": "नमस्ते दुनिया", "language_code": "hi-IN"}, headers=h)

    assert r.status_code == 200
    body = r.json()
    assert body["audio_base64"] == FAKE_AUDIO_B64
    mock_client.text_to_speech.assert_called_once()


def test_tts_validation_text_too_long(client):
    h = _login(client, "tts_long")
    r = client.post("/speech/tts", json={"text": "x" * 2501}, headers=h)
    assert r.status_code == 422


def test_tts_validation_pace_out_of_range(client):
    h = _login(client, "tts_pace")
    r = client.post("/speech/tts", json={"text": "hello", "pace": 5.0}, headers=h)
    assert r.status_code == 422


def test_tts_sarvam_error_returns_502(client):
    h = _login(client, "tts_err")

    from app.services.sarvam import SarvamError
    with patch("app.routers.speech.get_sarvam_client") as mock_get:
        mock_client = AsyncMock()
        mock_client.text_to_speech.side_effect = SarvamError(429, "Rate limit exceeded")
        mock_get.return_value = mock_client

        r = client.post("/speech/tts", json={"text": "test"}, headers=h)

    assert r.status_code == 502
    assert "rate limit" in r.json()["detail"].lower()


# ─── STT tests ────────────────────────────────


def test_stt_requires_auth(client):
    r = client.post("/speech/stt", files={"file": ("audio.wav", b"\x00" * 10, "audio/wav")})
    assert r.status_code == 401


def test_stt_returns_503_without_api_key(client):
    h = _login(client, "stt_nokey")
    with patch("app.routers.speech.get_sarvam_client", side_effect=RuntimeError("SARVAM_API_KEY is not configured")):
        r = client.post(
            "/speech/stt",
            files={"file": ("audio.wav", b"\x00" * 10, "audio/wav")},
            headers=h,
        )
    assert r.status_code == 503


def test_stt_happy_path(client):
    h = _login(client, "stt_ok")

    with patch("app.routers.speech.get_sarvam_client") as mock_get:
        mock_client = AsyncMock()
        mock_client.speech_to_text.return_value = {"transcript": "गच्छामि ग्रामम्", "language_code": "sa-IN"}
        mock_get.return_value = mock_client

        r = client.post(
            "/speech/stt",
            files={"file": ("test.wav", b"\x00" * 50, "audio/wav")},
            data={"language_code": "sa-IN", "mode": "transcribe"},
            headers=h,
        )

    assert r.status_code == 200
    body = r.json()
    assert body["transcript"] == "गच्छामि ग्रामम्"
    assert body["language_code"] == "sa-IN"
    mock_client.speech_to_text.assert_called_once()


def test_stt_codemix_mode(client):
    h = _login(client, "stt_cm")

    with patch("app.routers.speech.get_sarvam_client") as mock_get:
        mock_client = AsyncMock()
        mock_client.speech_to_text.return_value = {"transcript": "main ghar ja raha hoon", "language_code": "hi-IN"}
        mock_get.return_value = mock_client

        r = client.post(
            "/speech/stt",
            files={"file": ("test.wav", b"\x00" * 50, "audio/wav")},
            data={"language_code": "hi-IN", "mode": "codemix"},
            headers=h,
        )

    assert r.status_code == 200
    assert r.json()["transcript"] == "main ghar ja raha hoon"


def test_stt_sarvam_error_returns_502(client):
    h = _login(client, "stt_err")

    from app.services.sarvam import SarvamError
    with patch("app.routers.speech.get_sarvam_client") as mock_get:
        mock_client = AsyncMock()
        mock_client.speech_to_text.side_effect = SarvamError(500, "Internal server error")
        mock_get.return_value = mock_client

        r = client.post(
            "/speech/stt",
            files={"file": ("audio.wav", b"\x00" * 10, "audio/wav")},
            headers=h,
        )

    assert r.status_code == 502
