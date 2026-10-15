import asyncio
import contextlib
import json
import time
import logging

from fastapi import APIRouter, Depends, WebSocket
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.auth import require_learner
from app.db import SessionLocal, get_db
from app.models import Learner
from app.services.play.matches import make_ticket, use_ticket
from .config import LabConfig
from .session import STRATEGIES
from .providers import provider_error
from app.services.quota import QuotaExceeded, refund_quota

router = APIRouter()
MAX_SECONDS = 600
logger = logging.getLogger("shabd.voice_lab")


@router.post("/voice-lab/ticket")
def ticket(learner: Learner = Depends(require_learner), db: Session = Depends(get_db)):
    return {"ticket": make_ticket(db, learner, None, scope="voice-lab"), "max_seconds": MAX_SECONDS}


def authenticate(value):
    with SessionLocal() as db:
        ticket = use_ticket(db, value)
        if ticket.scope != "voice-lab":
            raise ValueError("Wrong ticket scope")
        return ticket.learner_id


def consume(learner_id, kind, amount):
    from app.services.quota import check_and_consume
    with SessionLocal() as db:
        learner = db.get(Learner, learner_id)
        check_and_consume(db, learner, kind, amount, surface="voice-lab")


def refund(learner_id, kind, amount):
    with SessionLocal() as db:
        learner = db.get(Learner, learner_id)
        refund_quota(db, learner, kind, amount, surface="voice-lab", reason="unused_audio")


@router.websocket("/ws/voice-lab")
async def voice_lab(websocket: WebSocket):
    await websocket.accept()
    session = None
    learner_id = None
    metered_audio = metered_native = 0
    lock = asyncio.Lock()
    started = time.monotonic()
    # Authenticate in the first frame so neither the bearer token nor the
    # single-use ticket appears in a proxy URL/access log.
    async def send(message):
        async with lock:
            await websocket.send_json(message)

    try:
        hello = json.loads(await asyncio.wait_for(websocket.receive_text(), 10))
        try:
            learner_id = await asyncio.to_thread(authenticate, hello.get("ticket", ""))
        except Exception:
            await websocket.close(code=4401)
            return

        async def meter(kind, amount):
            await asyncio.to_thread(consume, learner_id, kind, amount)

        config = LabConfig.model_validate(hello.get("config", {}))
        capabilities = hello.get("capabilities") or {}
        playback_feedback = isinstance(capabilities, dict) and capabilities.get("playback_feedback") is True
        barge_in = isinstance(capabilities, dict) and capabilities.get("barge_in") is True
        client_endpointing = isinstance(capabilities, dict) and capabilities.get("client_endpointing") is True

        async def backup(reason):
            nonlocal session
            if session:
                await session.close()
            fallback = config.model_copy(update={"pipeline": 1, "speaker": "ashutosh", "tts_model": "bulbul:v3", "web_search": False})
            session = STRATEGIES[1](fallback, send, meter)
            session.playback_feedback = playback_feedback
            session.barge_enabled = barge_in
            session.client_endpointing = client_endpointing
            await session.start()
            await send({"type": "interrupted"})
            await send({"type": "notice", "message": reason + " Friend continues with the backup voice and reply service, without web search."})

        session = STRATEGIES[config.pipeline](config, send, meter)
        session.playback_feedback = playback_feedback
        session.barge_enabled = barge_in
        session.client_endpointing = client_endpointing
        try:
            await session.start()
        except Exception as exc:
            if config.pipeline != 3:
                raise
            logger.warning("voice_native_start_failed error_type=%s", type(exc).__name__)
            await backup("The native voice provider is unavailable.")
        await send({"type": "ready", "config": config.model_dump(), "max_seconds": MAX_SECONDS,
                    "capabilities": {"playback_feedback": playback_feedback, "barge_in": barge_in, "client_endpointing": client_endpointing}})
        while True:
            remaining = MAX_SECONDS - (time.monotonic() - started)
            if remaining <= 0:
                await send({"type": "fatal", "message": "Call limit reached (10 minutes). Start another call."})
                break
            frame = await asyncio.wait_for(websocket.receive(), remaining)
            if frame["type"] == "websocket.disconnect":
                break
            pcm = frame.get("bytes")
            if pcm is not None:
                if len(pcm) > 64000 or len(pcm) % 2:
                    await send({"type": "error", "message": "Audio must be mono PCM16 in frames of at most 2 seconds."})
                    continue
                # Reserve small blocks ahead of audio, refunding unused credit.
                # A database round trip on every second stalls interruption.
                duration = len(pcm) / 32000
                if metered_audio < duration:
                    await meter("stt_seconds", 5)
                    metered_audio += 5
                metered_audio -= duration
                if session.config.pipeline == 3:
                    if metered_native < duration:
                        try:
                            await meter("gemini_inr", .5)
                            metered_native += 5
                        except QuotaExceeded:
                            await backup("The app's daily Gemini allowance is used.")
                    if session.config.pipeline == 3:
                        metered_native -= duration
                try:
                    await session.audio(pcm)
                except Exception:
                    if session.config.pipeline != 3:
                        raise
                    await backup("The native voice connection was lost. Please repeat your last sentence.")
                    await session.audio(pcm)
                continue
            try:
                if len(frame.get("text", "")) > 16000:
                    raise ValueError("Message too large")
                msg = json.loads(frame.get("text", "{}"))
                kind = msg.get("type")
                if kind == "stop":
                    break
                if kind == "config":
                    updated = LabConfig.model_validate({**config.model_dump(), **msg.get("config", {})})
                    structural = (updated.pipeline, updated.speaker, updated.live_model, updated.web_search, updated.thinking_budget, updated.temperature)
                    previous = (config.pipeline, config.speaker, config.live_model, config.web_search, config.thinking_budget, config.temperature)
                    if updated.pipeline != config.pipeline or session.config.pipeline != updated.pipeline or (updated.pipeline == 3 and structural != previous):
                        await session.close()
                        config = updated
                        session = STRATEGIES[updated.pipeline](updated, send, meter)
                        session.playback_feedback = playback_feedback
                        session.barge_enabled = barge_in
                        session.client_endpointing = client_endpointing
                        try:
                            await session.start()
                        except Exception:
                            if updated.pipeline != 3:
                                raise
                            await backup("The native voice provider is unavailable.")
                        await send({"type": "interrupted"})
                    else:
                        await session.update(updated)
                    config = updated
                    await send({"type": "config_applied", "config": config.model_dump()})
                elif kind == "interrupt":
                    await session.interrupt()
                elif kind == "end_audio":
                    await session.end_audio()
                elif kind == "playback":
                    if not playback_feedback or type(msg.get("busy")) is not bool:
                        raise ValueError("Invalid playback feedback")
                    await session.playback(msg["busy"])
                elif kind == "barge_in":
                    if not barge_in:
                        raise ValueError("Barge-in was not negotiated")
                    await session.barge_in()
                elif kind == "text":
                    text = str(msg.get("text", "")).strip()[:2000]
                    if text:
                        await send({"type": "transcript", "role": "user", "text": text, "final": True})
                        await session.text(text)
                elif kind == "ping":
                    await send({"type": "pong"})
                else:
                    raise ValueError("Unknown message type")
            except (ValueError, ValidationError, TypeError, AttributeError):
                await send({"type": "error", "message": "Invalid message or configuration. Settings were not applied."})
    except Exception as exc:
        logger.warning("voice_call_failed error_type=%s code=%s quota_kind=%s", type(exc).__name__, getattr(exc, "code", None), getattr(exc, "kind", None))
        message = provider_error(exc)
        with contextlib.suppress(Exception):
            await send({"type": "fatal", "message": message})
    finally:
        if session:
            with contextlib.suppress(Exception):
                await session.close()
        if learner_id:
            for kind, amount in (("stt_seconds", metered_audio), ("gemini_inr", metered_native * .1)):
                if amount > .0001:
                    with contextlib.suppress(Exception):
                        await asyncio.to_thread(refund, learner_id, kind, amount)
        with contextlib.suppress(Exception):
            await websocket.close()
