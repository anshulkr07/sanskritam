"""Sarvam AI API client — Bulbul v3 TTS + Saaras STT (``settings.sarvam_stt_model``).

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
        sample_rate: int = 22050,
    ) -> str:
        """Convert text to speech via Bulbul v3.

        Returns the audio as a **base64-encoded string** — the first entry of
        the response's ``audios`` list (Bulbul v3 returns ``{"audios": [b64]}``;
        the legacy ``audio``/``audio_base64`` keys are accepted as fallback).
        Callers can decode with ``base64.b64decode()`` for WAV bytes.

        ``sample_rate`` goes out as ``speech_sample_rate``, the field Bulbul
        actually reads. This used to send ``sample_rate``, which Bulbul ignores
        — that is why a 2026-08-29 probe found 22050 Hz "regardless". Probed
        2026-09-23: ``speech_sample_rate=16000`` returns a 16 kHz WAV. The
        default stays 22050 so learners hear exactly what they heard before.

        Note: Bulbul has no ``sa-IN`` outside beta — Devanagari Sanskrit text
        renders via ``settings.tts_sanskrit_code`` (``hi-IN``, Hindi-flavoured
        pronunciation) until the sa-IN beta is enabled on the account.
        """
        import time as _time
        _t0 = _time.perf_counter()
        client = await self._client()
        payload = {
            "text": text,
            "language_code": language_code,
            "speaker": speaker,
            "model": model,
            "pace": pace,
            "speech_sample_rate": sample_rate,
        }
        resp = await client.post("/text-to-speech", json=payload)
        if resp.status_code != 200:
            raise SarvamError(resp.status_code, resp.text)

        data = resp.json()
        audios = data.get("audios")
        if isinstance(audios, list) and audios:
            out = str(audios[0])
            logger.info(
                "[talk] tts chars=%d lang=%s ms=%.0f",
                len(text), language_code, (_time.perf_counter() - _t0) * 1000,
            )
            return out
        audio_b64: str = data.get("audio") or data.get("audio_base64", "")
        if not audio_b64:
            raise SarvamError(500, "No audio in Sarvam TTS response")
        logger.info(
            "[talk] tts chars=%d lang=%s ms=%.0f",
            len(text), language_code, (_time.perf_counter() - _t0) * 1000,
        )
        return audio_b64

    # ── STT ───────────────────────────────────

    async def speech_to_text(
        self,
        audio_data: bytes,
        language_code: str = "sa-IN",
        model: Optional[str] = None,
        mode: str = "transcribe",
        filename: str = "audio.wav",
    ) -> dict:
        """Transcribe audio via Saaras — ``settings.sarvam_stt_model`` unless given.

        Returns ``{"transcript": str, "language_code": str,
        "language_probability": float | None}``. ``language_code`` is "" when
        auto-detect heard no language (Saaras answers null), and
        ``language_probability`` is only set on auto-detect ("unknown").

        Do not call this with ``language_code="unknown"`` for a learner:
        saaras:v4 translates spoken Sanskrit into English on auto-detect. Use
        ``services.learner_stt.transcribe_learner``.
        """
        import time as _time2
        _t0 = _time2.perf_counter()
        model = model or settings.sarvam_stt_model
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
        logger.info(
            "[talk] stt bytes=%d model=%s lang=%s->%s ms=%.0f",
            len(audio_data), model, language_code, body.get("language_code"),
            (_time2.perf_counter() - _t0) * 1000,
        )
        # Auto-detect can answer `language_code: null`, which used to reach
        # STTResponse (a required str) as None and 500 the request. A pinned
        # request still falls back to the code it asked for.
        detected = body.get("language_code") or ("" if language_code == "unknown" else language_code)
        return {
            "transcript": body.get("transcript") or "",
            "language_code": detected,
            "language_probability": body.get("language_probability"),
        }

    # ── Document Intelligence (photographed handwriting) ──────────────────

    # Job states from the docs (docs.sarvam.ai/api/api-guides-tutorials/
    # document-intelligence/overview, checked 2026-09-30).
    _DOC_DONE = frozenset({"completed", "partially_completed"})
    _DOC_FAILED = frozenset({"failed", "rejected"})

    async def digitise_image(
        self,
        image: bytes,
        filename: str = "writing.jpg",
        mime: str = "image/jpeg",
        language_code: str = "sa-IN",
        *,
        poll_interval_s: float = 2.0,
        timeout_s: float = 45.0,
    ) -> str:
        """Read one image with Sarvam Document Intelligence; return its text.

        The API is an asynchronous job:
          1. ``POST /doc-ai/v1/job/digitise`` (multipart ``file``, ``language``,
             ``output_format``) returns ``{"job_id": ..., "status": "pending"}``;
          2. ``GET /job/{id}/status`` until ``completed`` (or a failed state);
          3. ``GET /job/{id}/download-url`` returns a signed URL to a ZIP holding
             the primary file (``.md`` here), ``metadata/page_NNN.json`` and
             ``manifest.json``.

        Privacy: the image and the text are never logged; only sizes are. The
        signed download URL is fetched WITHOUT the API key (it belongs to a
        storage host, not to Sarvam's API).

        Raises ``SarvamError`` on any HTTP failure, a failed job, or a timeout.
        """
        import asyncio
        import io
        import time as _time3
        import zipfile

        _t0 = _time3.perf_counter()
        client = await self._client()
        resp = await client.post(
            "/doc-ai/v1/job/digitise",
            files={"file": (filename, image, mime)},
            data={"language": language_code, "output_format": "md"},
        )
        if resp.status_code not in (200, 201, 202):
            raise SarvamError(resp.status_code, resp.text[:300])
        job = resp.json()
        job_id = job.get("job_id") or job.get("id")
        if not job_id:
            raise SarvamError(502, "Sarvam document job returned no id")

        status = str(job.get("status") or job.get("job_state") or "pending").lower()
        deadline = _time3.monotonic() + timeout_s
        while status not in self._DOC_DONE:
            if status in self._DOC_FAILED:
                raise SarvamError(502, f"Sarvam document job {status}")
            if _time3.monotonic() >= deadline:
                raise SarvamError(504, "Sarvam document job timed out")
            await asyncio.sleep(poll_interval_s)
            poll = await client.get(f"/doc-ai/v1/job/{job_id}/status")
            if poll.status_code == 429:
                await asyncio.sleep(5.0)  # rate limited: back off and keep waiting
                continue
            if poll.status_code != 200:
                raise SarvamError(poll.status_code, poll.text[:300])
            body = poll.json()
            status = str(body.get("status") or body.get("job_state") or status).lower()

        link = await client.get(f"/doc-ai/v1/job/{job_id}/download-url")
        if link.status_code != 200:
            raise SarvamError(link.status_code, link.text[:300])
        link_body = link.json() or {}
        url = link_body.get("url") or link_body.get("download_url")
        if not url:
            raise SarvamError(502, "Sarvam document job returned no download url")

        async with httpx.AsyncClient(timeout=30.0) as plain:  # no API key: not Sarvam's host
            blob = await plain.get(url)
        if blob.status_code != 200:
            raise SarvamError(blob.status_code, "Sarvam document download failed")

        try:
            with zipfile.ZipFile(io.BytesIO(blob.content)) as zf:
                names = sorted(
                    n for n in zf.namelist()
                    if n.lower().endswith(".md") and "/" not in n.strip("/")
                )
                text = "\n".join(zf.read(n).decode("utf-8", errors="replace") for n in names)
        except zipfile.BadZipFile as exc:
            raise SarvamError(502, "Sarvam document download was not a zip") from exc

        logger.info(
            "[doc-ai] digitise bytes=%d lang=%s chars=%d ms=%.0f",
            len(image), language_code, len(text), (_time3.perf_counter() - _t0) * 1000,
        )
        return text


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
