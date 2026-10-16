"""Meter real endpoint delivery, including streaming failures and cancellations."""
import base64
import asyncio
import io
import json
import logging
import wave

from fastapi import HTTPException
from fastapi.routing import APIRoute
from starlette.responses import StreamingResponse
from starlette.background import BackgroundTasks

from app.auth import get_learner_from_token
from app.config import settings
from app.db import SessionLocal
from app.commerce import service as svc
from app.commerce.models import Reservation

logger = logging.getLogger(__name__)
PAID_PATHS = {"/ask/talk": "ask", "/ask/talk/stream": "ask", "/explain": "ask", "/explain/analysis": "analysis",
              "/conversation/explain": "ask", "/conversation/start": "voice", "/conversation/turn": "voice",
              "/speech/tts": "voice"}


def delivered_seconds(data):
    from app.services.audio_meta import audio_seconds
    total = 0.0
    if isinstance(data, dict):
        for key, value in data.items():
            if key == "audio_base64" and value:
                try:
                    total += audio_seconds(base64.b64decode(value)) or 0
                except (ValueError, TypeError):
                    pass
            elif isinstance(value, (dict, list)):
                total += delivered_seconds(value)
    elif isinstance(data, list):
        total += sum(delivered_seconds(item) for item in data)
    return total


def free_response(data):
    return data.get("cached") is True or data.get("routed_to") in {"cache", "engine", "engine_fallback"} or data.get("mode") == "graph"


def limit_voice_audio(data, maximum_seconds):
    """Cap delivered audio, rather than silently giving audio beyond the accepted spend.

    The synthesis provider returns PCM WAV. Other measured containers can pass
    through within the allowance, but unknown or over-limit containers fail closed.
    """
    from app.services.audio_meta import audio_seconds
    remaining = float(maximum_seconds)
    def visit(value):
        nonlocal remaining
        if isinstance(value, list):
            return [visit(item) for item in value]
        if not isinstance(value, dict):
            return value
        result = {}
        for key, item in value.items():
            if key != "audio_base64" or not item:
                result[key] = visit(item)
                continue
            try:
                raw = base64.b64decode(item, validate=True)
                duration = audio_seconds(raw)
                if duration is None:
                    raise ValueError("Unmeasurable audio")
                if duration > remaining:
                    with wave.open(io.BytesIO(raw), "rb") as source:
                        frames = source.readframes(max(0, int(remaining * source.getframerate())))
                        output = io.BytesIO()
                        with wave.open(output, "wb") as target:
                            target.setparams(source.getparams())
                            target.writeframes(frames)
                    raw = output.getvalue()
                    duration = audio_seconds(raw) or 0
                remaining = max(0, remaining - duration)
                result[key] = base64.b64encode(raw).decode()
            except (ValueError, TypeError, wave.Error, EOFError) as exc:
                raise HTTPException(503, "Voice delivery could not be bounded; no credits charged") from exc
        return result
    return visit(data)


class CommerceRoute(APIRoute):
    def get_route_handler(self):
        original = super().get_route_handler()
        async def handle(request):
            action = PAID_PATHS.get(request.url.path)
            if not settings.commerce_enabled or not action:
                return await original(request)
            from app.commerce.router import decode
            # Graph practice incurs no live model/synthesis charge.
            if request.url.path == "/conversation/start":
                body = await request.json()
                if body.get("mode") == "graph":
                    return await original(request)
            auth = request.headers.get("authorization", "")
            db = SessionLocal()
            try:
                learner = get_learner_from_token(auth.removeprefix("Bearer "), db) if auth.startswith("Bearer ") else None
                if not learner:
                    raise HTTPException(401, "Sign in to use premium AI")
                learner_id = learner.id
                if request.url.path == "/conversation/turn":
                    from app.models import ConversationSession
                    body = await request.json()
                    session = db.get(ConversationSession, body.get("session_id", ""))
                    if session and session.learner_id == learner_id and session.mode == "graph":
                        return await original(request)
                token = request.headers.get("x-credit-quote", "")
                if not token:
                    raise HTTPException(402, {"code": "quote_required", "action": action})
                quote = decode(token, "quote")
                if quote["sub"] != learner_id or quote["action"] != action:
                    raise HTTPException(403, "Quote does not match account or action")
                request_id = request.headers.get("x-credit-request", "")
                if not 8 <= len(request_id) <= 80:
                    raise HTTPException(422, "A unique credit request id is required")
                reservation = svc.reserve(db, learner_id, action, request_id, quote.get("seconds", 0))
                if reservation.status != "open" or reservation.started or reservation.rate != quote["rate"]:
                    raise HTTPException(409, "Request already completed or quote changed; request a new quote")
                rid = reservation.id
                reservation.started = True
                db.commit()
            except Exception:
                db.rollback()
                raise
            finally:
                db.close()

            def finish(delivered=False, data=None):
                with SessionLocal() as own:
                    svc.settle(own, learner_id, rid, delivered=delivered,
                               seconds=delivered_seconds(data or {}) if action == "voice" else 0)
                    own.commit()

            try:
                response = await original(request)
            except BaseException:
                finish()
                raise
            if isinstance(response, StreamingResponse):
                if action == "voice":
                    finish()
                    raise HTTPException(503, "Streaming voice delivery is not enabled")
                iterator = response.body_iterator
                async def events():
                    buffer, delivered, result = "", False, {}
                    try:
                        async for chunk in iterator:
                            completed_result = None
                            text = chunk.decode() if isinstance(chunk, bytes) else chunk
                            buffer += text
                            while "\n\n" in buffer:
                                event, buffer = buffer.split("\n\n", 1)
                                if event.startswith("data: "):
                                    try:
                                        value = json.loads(event[6:])
                                        if value.get("type") == "final":
                                            result = value.get("response", {})
                                            completed_result = result
                                    except ValueError:
                                        pass
                            yield chunk
                            # Resume only after ASGI accepted this chunk. A failed
                            # final send must not charge an undelivered answer.
                            if completed_result is not None:
                                delivered = not free_response(completed_result)
                    finally:
                        finish(delivered, result)
                response.body_iterator = events()
                return response
            data = {}
            try:
                data = json.loads(response.body)
            except (ValueError, AttributeError):
                pass
            if action == "voice" and 200 <= response.status_code < 300:
                try:
                    data = await asyncio.to_thread(limit_voice_audio, data, quote["seconds"])
                    response.body = json.dumps(data, ensure_ascii=False).encode()
                    response.headers["content-length"] = str(len(response.body))
                except BaseException:
                    finish()
                    raise
            if 200 <= response.status_code < 300 and not free_response(data):
                # Starlette runs background work only after the response body has
                # been sent. A disconnect leaves the reservation to expire safely.
                previous_background = response.background
                background = BackgroundTasks()
                background.add_task(finish, True, data)
                if previous_background:
                    background.add_task(previous_background)
                response.background = background
            else:
                finish(False, data)
            return response
        return handle
