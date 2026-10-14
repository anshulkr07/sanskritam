"""Live recitation captions: a backend WebSocket relay to Sarvam's streaming
speech-to-text (handover_games_daily_multiplayer §7 "Live STT").

  • The provider key never leaves the server. The phone gets a short-lived,
    single-use ticket from POST /recite/stream-ticket (MatchTicket, scope
    "recite") and connects to /ws/recite/{ticket}.
  • The phone sends binary frames of 16 kHz mono 16-bit PCM. The server
    wraps each in Sarvam's JSON audio message and forwards it.
  • Sarvam answers with one transcript per spoken segment (its own voice
    activity detection). Each becomes {"type": "caption", "text", "final"}.
    Captions are provisional coaching text only: the score always comes from
    the full recording uploaded afterwards.
  • "stop" from the phone flushes the provider, waits briefly for the last
    segment, then closes. Streamed seconds are metered as STT use.
  • Any failure says {"type": "unavailable"}: the phone keeps recording and
    scores from the upload.

Contract read at docs.sarvam.ai (speech-to-text WebSocket, 2026-10-14):
wss://api.sarvam.ai/speech-to-text/ws with query language-code, model,
mode, sample_rate, input_audio_codec, vad_signals, flush_signal; header
Api-Subscription-Key; client messages {"audio": {"data", "sample_rate",
"encoding"}} and {"type": "flush"}; responses {"type": "data"|"error"|
"events", "data": {...}}.
"""

from __future__ import annotations

import asyncio
import base64
import json
import logging
import time
import uuid
from urllib.parse import urlencode

from fastapi import WebSocket, WebSocketDisconnect

from app.config import settings
from app.db import SessionLocal
from app.services.play.matches import use_ticket

logger = logging.getLogger("shabd.recite-stream")

PROTOCOL = "recite-stream-2"
RATE = 16000
MAX_SECONDS = 120
FLUSH_WAIT_S = 2.5


def _upstream_url() -> str:
    base = getattr(settings, "sarvam_realtime_url", "") or "wss://api.sarvam.ai/speech-to-text/ws"
    q = {
        "language-code": "sa-IN",
        "model": settings.sarvam_stt_model or "saaras:v4",
        "mode": "transcribe",
        "sample_rate": str(RATE),
        "input_audio_codec": "pcm_s16le",
        "high_vad_sensitivity": "true",
        "vad_signals": "true",
        "flush_signal": "true",
    }
    return f"{base}?{urlencode(q)}"


def _upstream_headers() -> dict:
    return {"Api-Subscription-Key": settings.sarvam_api_key or ""}


def audio_message(pcm: bytes) -> str:
    return json.dumps({"audio": {"data": base64.b64encode(pcm).decode("ascii"),
                                 "sample_rate": str(RATE), "encoding": "audio/wav"}})


def caption_from(raw: str) -> dict | None:
    """One provider message -> one phone message (or None to skip)."""
    try:
        msg = json.loads(raw)
    except (TypeError, ValueError):
        return None
    kind = msg.get("type")
    data = msg.get("data") or {}
    if kind == "data":
        text = (data.get("transcript") or "").strip()
        return {"type": "caption", "text": text, "final": True} if text else None
    if kind == "events":
        sig = data.get("signal_type")
        if sig in ("START_SPEECH", "END_SPEECH"):
            return {"type": "speech", "state": "start" if sig == "START_SPEECH" else "end"}
        return None
    if kind == "error":
        return {"type": "unavailable", "reason": "provider error"}
    return None


async def _connect():
    import websockets
    headers = _upstream_headers()
    try:
        return await websockets.connect(_upstream_url(), additional_headers=headers, max_size=2 ** 22)
    except TypeError:  # websockets < 14
        return await websockets.connect(_upstream_url(), extra_headers=headers, max_size=2 ** 22)


async def _relay(ws_up, websocket: WebSocket, attempt_id: str, finished: asyncio.Event) -> None:
    try:
        async for raw in ws_up:
            out = caption_from(raw if isinstance(raw, str) else raw.decode("utf-8", "ignore"))
            if out is None:
                continue
            out["attempt_id"] = attempt_id
            await websocket.send_json(out)
            if finished.is_set() and out.get("type") == "caption":
                return
    except Exception as e:  # noqa: BLE001 — upstream closed
        logger.info("upstream closed for %s: %s", attempt_id, e)


async def _drain(websocket: WebSocket) -> None:
    while True:
        msg = await websocket.receive()
        if msg.get("type") == "websocket.disconnect" or msg.get("text") == "stop":
            return


def _meter(learner_id: str, seconds: float) -> None:
    if seconds <= 0:
        return
    from app.models import Learner
    from app.services.quota import QuotaExceeded, check_and_consume
    db = SessionLocal()
    try:
        learner = db.query(Learner).filter(Learner.id == learner_id).first()
        if learner is not None:
            try:
                check_and_consume(db, learner, "stt_seconds", seconds, surface="recite-live")
            except QuotaExceeded:
                pass  # already streamed; the next ticket is refused instead
    finally:
        db.close()


async def recite_stream_ws(websocket: WebSocket, ticket: str, attempt_id: str = ""):
    """/ws/recite/{ticket}?attempt_id=... (registered in main.py)."""
    attempt_id = attempt_id or uuid.uuid4().hex[:16]
    db = SessionLocal()
    try:
        try:
            t = use_ticket(db, ticket)
        except Exception:
            await websocket.close(code=4401)
            return
        if t.scope != "recite":
            await websocket.close(code=4403)
            return
        learner_id = t.learner_id
    finally:
        db.close()

    await websocket.accept()
    sent_bytes = 0
    try:
        if not settings.sarvam_api_key:
            await websocket.send_json({"type": "unavailable", "reason": "not configured",
                                       "attempt_id": attempt_id})
            await _drain(websocket)
            return
        try:
            ws_up = await _connect()
        except Exception as e:  # noqa: BLE001
            logger.info("upstream connect failed: %s", e)
            await websocket.send_json({"type": "unavailable", "reason": "provider unreachable",
                                       "attempt_id": attempt_id})
            await _drain(websocket)
            return
        await websocket.send_json({"type": "ready", "attempt_id": attempt_id,
                                   "protocol": PROTOCOL, "sample_rate": RATE,
                                   "max_seconds": MAX_SECONDS})
        finished = asyncio.Event()
        relay = asyncio.create_task(_relay(ws_up, websocket, attempt_id, finished))
        started = time.monotonic()
        try:
            while True:
                msg = await websocket.receive()
                if msg.get("type") == "websocket.disconnect":
                    break
                if msg.get("bytes"):
                    if sent_bytes >= MAX_SECONDS * RATE * 2 or time.monotonic() - started > MAX_SECONDS + 15:
                        continue  # captions stop; the recording carries on
                    chunk = msg["bytes"]
                    sent_bytes += len(chunk)
                    await ws_up.send(audio_message(chunk))
                elif msg.get("text") == "stop":
                    finished.set()
                    try:
                        await ws_up.send(json.dumps({"type": "flush"}))
                        await asyncio.wait_for(asyncio.shield(relay), timeout=FLUSH_WAIT_S)
                    except Exception:  # noqa: BLE001 — timeout or closed
                        pass
                    try:
                        await websocket.send_json({"type": "caption_end", "attempt_id": attempt_id})
                    except Exception:  # noqa: BLE001
                        pass
                    break
        finally:
            relay.cancel()
            try:
                await ws_up.close()
            except Exception:  # noqa: BLE001
                pass
    except WebSocketDisconnect:
        pass
    except Exception as e:  # noqa: BLE001
        logger.info("recite stream closed: %s", e)
    finally:
        await asyncio.to_thread(_meter, learner_id, sent_bytes / (RATE * 2))
        try:
            await websocket.close()
        except Exception:  # noqa: BLE001
            pass
