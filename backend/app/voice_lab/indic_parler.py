"""Indic-Parler adapters: existing FastAPI endpoint or authenticated HF Gradio Space."""
import asyncio
import base64
import re

import httpx

from app.config import settings


async def _thread_resource(factory, cleanup, *args, **kwargs):
    """Finish cleanup even if a thread returns its client/job after cancellation."""
    task = asyncio.create_task(asyncio.to_thread(factory, *args, **kwargs))
    try:
        return await asyncio.shield(task)
    except asyncio.CancelledError:
        def release_when_done(completed):
            if completed.cancelled() or completed.exception() is not None:
                return
            asyncio.create_task(asyncio.to_thread(cleanup, completed.result()))
        task.add_done_callback(release_when_done)
        raise


def voice_description(config):
    pitch = "low" if config.pitch < -1 else "high" if config.pitch > 1 else "balanced"
    pace = "slow" if config.pace < 0.95 else "fast" if config.pace > 1.1 else "moderate"
    return (f"{config.speaker} speaks Sanskrit in a {config.emotion} tone with a {pitch} pitch "
            f"at a {pace} pace. Very clear studio audio with no background noise.")


def validate_space_id(value):
    if not re.fullmatch(r"[\w-]+/[\w.-]+", value, flags=re.ASCII):
        raise RuntimeError("VOICE_LAB_PARLER_SPACE must be a Hugging Face owner/space-name.")
    return value


def decode_space_audio(result):
    if not isinstance(result, dict) or result.get("codec") != "wav":
        raise RuntimeError("Indic-Parler Space returned an invalid audio response.")
    encoded = result.get("audio_base64", "")
    if not isinstance(encoded, str) or len(encoded) > 4 * 1024 * 1024:
        raise RuntimeError("Indic-Parler audio is too large.")
    try:
        audio = base64.b64decode(encoded, validate=True)
        rate = int(result["sample_rate"])
    except (ValueError, KeyError, TypeError):
        raise RuntimeError("Indic-Parler Space returned invalid audio data.") from None
    if not (8000 <= rate <= 48000) or audio[:4] != b"RIFF" or audio[8:12] != b"WAVE":
        raise RuntimeError("Indic-Parler Space must return WAV audio at a supported sample rate.")
    return encoded, rate


class IndicParlerAdapter:
    def __init__(self):
        self.client = None
        self.job = None

    async def close(self):
        if self.job:
            await asyncio.to_thread(self.job.cancel)
            self.job = None
        if self.client:
            await asyncio.to_thread(self.client.close)
            self.client = None

    async def speak(self, text, config, send):
        description = voice_description(config)
        if settings.voice_lab_parler_space:
            if not settings.hf_token:
                raise RuntimeError("Set HF_TOKEN to use your signed-in Hugging Face GPU quota.")
            from gradio_client import Client
            space_id = validate_space_id(settings.voice_lab_parler_space)
            try:
                if self.client is None:
                    self.client = await _thread_resource(
                        Client, lambda client: client.close(), space_id, token=settings.hf_token, verbose=False,
                        download_files=False, analytics_enabled=False,
                        httpx_kwargs={"timeout": 30},
                    )
                self.job = await _thread_resource(self.client.submit, lambda job: job.cancel(),
                                                  text, description, api_name="/synthesize")
                result = await asyncio.to_thread(self.job.result, timeout=120)
                self.job = None
                encoded, rate = decode_space_audio(result)
                await send({"type": "audio", "codec": "wav", "data": encoded, "sample_rate": rate})
            except asyncio.CancelledError:
                await self.close()
                raise
            except Exception as exc:
                await self.close()
                message = str(exc).lower()
                if "quota" in message:
                    raise RuntimeError("Hugging Face GPU allowance is exhausted. Switch to Edge TTS or wait for the daily reset.") from None
                if "timeout" in message or isinstance(exc, TimeoutError):
                    raise RuntimeError("Hugging Face speech timed out in the queue. Try again or select Edge TTS.") from None
                if isinstance(exc, RuntimeError):
                    raise
                raise RuntimeError("Indic-Parler Space is unavailable. Check its build status, model access and HF_TOKEN.") from None
            return
        if not settings.voice_lab_parler_url:
            raise RuntimeError("Set VOICE_LAB_PARLER_SPACE or VOICE_LAB_PARLER_URL for Indic-Parler.")
        async with httpx.AsyncClient(timeout=60) as client:
            result = await client.post(settings.voice_lab_parler_url,
                                       json={"text": text, "description": description, "language": "sa-IN"})
            result.raise_for_status()
            if result.headers.get("content-type", "").split(";")[0] not in ("audio/wav", "audio/x-wav", "audio/mpeg"):
                raise RuntimeError("Indic-Parler endpoint must return audio/wav or audio/mpeg.")
            await send({"type": "audio", "codec": "encoded", "data": base64.b64encode(result.content).decode(), "sample_rate": 24000})
