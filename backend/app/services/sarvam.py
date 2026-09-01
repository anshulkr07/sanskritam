"""Sarvam AI API client — Bulbul v3 TTS + Saaras v3 STT.

Thin async wrapper using httpx.  All API calls go through a singleton
``SarvamClient`` obtained via ``get_sarvam_client()``, which doubles as
a FastAPI dependency.
"""

from __future__ import annotations

import base64
import logging
from typing import Optional

import httpx

from app.config import settings

logger = logging.getLogger("shabd.sarvam")

_BASE_URL = "https://api.sarvam.ai"


# ──────────────────────────────────────────────
# Exceptions
# ──────────────────────────────────────────────

class SarvamError(Exception):
    """Raised when a Sarvam API call fails."""

    def __init__(self, status_code: int, detail: str) -> None:
        self.status_code = status_code
        self.detail = detail
        super().__init__(f"Sarvam API {status_code}: {detail}")


# ──────────────────────────────────────────────
# Client
# ──────────────────────────────────────────────

class SarvamClient:
    """Async client for Sarvam AI speech APIs."""

    def __init__(self, api_key: str, base_url: str = _BASE_URL) -> None:
        self._api_key = api_key
        self._base_url = base_url
        self._http: Optional[httpx.AsyncClient] = None

    async def _client(self) -> httpx.AsyncClient:
        if self._http is None or self._http.is_closed:
            self._http = httpx.AsyncClient(
                base_url=self._base_url,
                headers={"api-subscription-key": self._api_key},
                timeout=30.0,
            )
        return self._http

    async def close(self) -> None:
        if self._http and not self._http.is_closed:
            await self._http.aclose()

    # ── TTS ───────────────────────────────────

    async def text_to_speech(
        self,
        text: str,
        language_code: str = "hi-IN",
        speaker: str = "aditya",
        model: str = "bulbul:v3",
        pace: float = 1.0,
        sample_rate: int = 24000,
    ) -> str:
        """Convert text to speech via Bulbul v3.

        Returns the audio as a **base64-encoded string** — the first entry of
        the response's ``audios`` list (Bulbul v3 returns ``{"audios": [b64]}``;
        the legacy ``audio``/``audio_base64`` keys are accepted as fallback).
        Callers can decode with ``base64.b64decode()`` for WAV bytes.

        Note: ``sample_rate`` is currently **ignored** by bulbul:v3 — it
        returns 22050 Hz mono regardless (probed 2026-08-29).  The param is
        kept for forward compatibility.

        Note: Bulbul has no ``sa-IN`` outside beta — Devanagari Sanskrit text
        renders via ``hi-IN`` (Hindi-flavored pronunciation) until the sa-IN
        beta is enabled on the account.
        """
        client = await self._client()
        payload = {
            "text": text,
            "language_code": language_code,
            "speaker": speaker,
            "model": model,
            "pace": pace,
            "sample_rate": sample_rate,
        }
        resp = await client.post("/text-to-speech", json=payload)
        if resp.status_code != 200:
            raise SarvamError(resp.status_code, resp.text)

        data = resp.json()
        audios = data.get("audios")
        if isinstance(audios, list) and audios:
            return str(audios[0])
        audio_b64: str = data.get("audio") or data.get("audio_base64", "")
        if not audio_b64:
            raise SarvamError(500, "No audio in Sarvam TTS response")
        return audio_b64

    # ── STT ───────────────────────────────────

    async def speech_to_text(
        self,
        audio_data: bytes,
        language_code: str = "sa-IN",
        model: str = "saaras:v4",
        mode: str = "transcribe",
        filename: str = "audio.wav",
    ) -> dict:
        """Transcribe audio via Saaras v3.

        Returns ``{"transcript": str, "language_code": str}``.
        """
        client = await self._client()
        files = {"file": (filename, audio_data, "audio/wav")}
        data = {
            "language_code": language_code,
            "model": model,
            "mode": mode,
        }
        resp = await client.post("/speech-to-text", files=files, data=data)
        if resp.status_code != 200:
            raise SarvamError(resp.status_code, resp.text)

        body = resp.json()
        return {
            "transcript": body.get("transcript", ""),
            "language_code": body.get("language_code", language_code),
        }


# ──────────────────────────────────────────────
# Singleton / FastAPI dependency
# ──────────────────────────────────────────────

_singleton: Optional[SarvamClient] = None


def get_sarvam_client() -> SarvamClient:
    """Return the module-level ``SarvamClient``.

    Raises ``RuntimeError`` (surfaced as HTTP 503 by the router) when no
    API key is configured.
    """
    global _singleton
    if not settings.sarvam_api_key:
        raise RuntimeError("SARVAM_API_KEY is not configured")
    if _singleton is None:
        _singleton = SarvamClient(api_key=settings.sarvam_api_key)
    return _singleton
