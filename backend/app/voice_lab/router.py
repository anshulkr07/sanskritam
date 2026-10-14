import asyncio
import contextlib
import json
import time

from fastapi import APIRouter, Depends, WebSocket
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.auth import require_learner
from app.db import SessionLocal, get_db
from app.models import Learner
from app.services.play.matches import make_ticket, use_ticket
from .config import LabConfig
from .session import STRATEGIES

router = APIRouter()
MAX_SECONDS = 600


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


@router.websocket("/ws/voice-lab")
async def voice_lab(websocket: WebSocket):
    await websocket.accept()
    session = None
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
        session = STRATEGIES[config.pipeline](config, send, meter)
        await session.start()
        await send({"type": "ready", "config": config.model_dump(), "max_seconds": MAX_SECONDS})
        metered_audio = 0
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
                # Reserve quota before sending each second of microphone audio.
                duration = len(pcm) / 32000
                if metered_audio < duration:
                    await meter("stt_seconds", max(1, duration))
                    if config.pipeline == 3:
                        # Reserve native audio spend before sending the input.
                        await meter("gemini_inr", 0.1 * max(1, duration))
                    metered_audio += max(1, duration)
                metered_audio -= duration
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
                    if updated.pipeline != config.pipeline or (updated.pipeline == 3 and structural != previous):
                        await session.close()
                        session = STRATEGIES[updated.pipeline](updated, send, meter)
                        await session.start()
                        await send({"type": "interrupted"})
                    else:
                        await session.update(updated)
                    config = updated
                    await send({"type": "config_applied", "config": config.model_dump()})
                elif kind == "interrupt":
                    await session.interrupt()
                elif kind == "end_audio":
                    await session.end_audio()
                elif kind == "text":
                    text = str(msg.get("text", "")).strip()[:2000]
                    if text:
                        await send({"type": "transcript", "role": "user", "text": text, "final": True})
                        await session.text(text)
                else:
                    raise ValueError("Unknown message type")
            except (ValueError, ValidationError, TypeError, AttributeError):
                await send({"type": "error", "message": "Invalid message or configuration. Settings were not applied."})
    except Exception as exc:
        message = str(exc) if isinstance(exc, RuntimeError) else "Voice call ended. Check provider configuration and reconnect."
        with contextlib.suppress(Exception):
            await send({"type": "fatal", "message": message})
    finally:
        if session:
            with contextlib.suppress(Exception):
                await session.close()
        with contextlib.suppress(Exception):
            await websocket.close()
