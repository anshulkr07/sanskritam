"""Live recitation streaming: a backend WebSocket proxy to the hosted
realtime STT provider (brief §7 "Live STT and audio handling").

Design:
  • The provider key never leaves the server. The client authenticates with a
    short-lived ticket (the same MatchTicket table, scope "recite").
  • The client streams timestamped PCM chunks; the server forwards them to
    Sarvam's realtime Sanskrit endpoint and relays interim transcripts plus
    the final reconciled transcript for the same attempt id.
  • If the upstream stream cannot be opened, the server says so explicitly
    and the client keeps recording locally and uploads at the end — a
    post-upload transcript is clearly labelled, never presented as live STT.
  • Final scoring always uses the full audio upload; provisional captions
    are coaching-visible text only and never replace the recorded attempt.

The exact realtime contract is re-verified against Sarvam's current docs at
deployment time (the brief flags this); the adapter isolates that contract
in _upstream_url/_upstream_headers so a shape change is a one-file edit.
"""

from __future__ import annotations

import asyncio
import json
import logging
import uuid

from fastapi import WebSocket, WebSocketDisconnect

from app.config import settings
from app.db import SessionLocal
from app.services.play.matches import use_ticket

logger = logging.getLogger("shabd.recite-stream")

PROTOCOL = "recite-stream-1"


def _upstream_url() -> str:
    return getattr(settings, "sarvam_realtime_url", "") or \
        "wss://api.sarvam.ai/speech-to-text/ws"


def _upstream_headers() -> dict:
    return {"api-subscription-key": settings.sarvam_api_key or ""}


async def _pump_upstream(ws_up, websocket, attempt_id: str) -> None:
    """Relay provider events to the learner as interim/final captions."""
    try:
        async for raw in ws_up.iter_text():
            try:
                data = json.loads(raw)
            except Exception:
                continue
            transcript = data.get("transcript") or data.get("text") or ""
            if not transcript:
                continue
            final = bool(data.get("final") or data.get("is_final"))
            await websocket.send_json({
                "type": "caption", "attempt_id": attempt_id,
                "text": transcript, "final": final, "provisional": True,
            })
    except Exception as e:  # upstream closed
        logger.info("upstream closed for %s: %s", attempt_id, e)
    finally:
        try:
            await websocket.send_json({"type": "caption_end", "attempt_id": attempt_id})
        except Exception:
            pass


async def recite_stream_ws(websocket: WebSocket, ticket: str, attempt_id: str = ""):
    """/ws/recite/{ticket}?attempt_id=... — registered on the app in main.py."""
    db = SessionLocal()
    attempt_id = attempt_id or uuid.uuid4().hex[:16]
    import websockets  # noqa: F401  — presence checked before accepting
    try:
        try:
            t = use_ticket(db, ticket)
        except Exception:
            await websocket.close(code=4401)
            return
        if t.scope != "recite" and t.scope != "match":
            await websocket.close(code=4403)
            return
        await websocket.accept()
        if not settings.sarvam_api_key:
            # No upstream configured: say so; the client records locally and
            # uploads at the end (clearly not live STT).
            await websocket.send_json({"type": "unavailable",
                                       "reason": "streaming provider not configured",
                                       "attempt_id": attempt_id,
                                       "fallback": "record-and-upload"})
            while True:
                msg = await websocket.receive_text()  # drain until client closes
                if msg == "stop":
                    break
            return
        import websockets
        try:
            ws_up = await websockets.connect(
                _upstream_url(), extra_headers=_upstream_headers(), max_size=2 ** 22)
        except Exception as e:
            logger.info("upstream connect failed: %s", e)
            await websocket.send_json({"type": "unavailable",
                                       "reason": "upstream unreachable",
                                       "attempt_id": attempt_id,
                                       "fallback": "record-and-upload"})
            while True:
                msg = await websocket.receive_text()
                if msg == "stop":
                    break
            return
        await websocket.send_json({"type": "ready", "attempt_id": attempt_id,
                                   "protocol": PROTOCOL})
        pump = asyncio.create_task(_pump_upstream(ws_up, websocket, attempt_id))
        try:
            while True:
                msg = await websocket.receive()
                if msg.get("type") == "websocket.disconnect":
                    break
                if "bytes" in msg and msg["bytes"]:
                    await ws_up.send(msg["bytes"])
                elif "text" in msg:
                    text = msg["text"]
                    if text == "stop":
                        try:
                            await ws_up.send(json.dumps({"type": "end"}))
                        except Exception:
                            pass
                        break
        finally:
            pump.cancel()
            try:
                await ws_up.close()
            except Exception:
                pass
    except WebSocketDisconnect:
        pass
    except Exception as e:  # noqa: BLE001
        logger.info("recite stream closed: %s", e)
    finally:
        db.close()
        try:
            await websocket.close()
        except Exception:
            pass
