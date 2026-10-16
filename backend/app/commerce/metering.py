"""Meter real endpoint delivery, including streaming failures and cancellations."""
import base64
import json
import logging

from fastapi import HTTPException
from fastapi.routing import APIRoute
from starlette.responses import StreamingResponse

from app.auth import get_learner_from_token
from app.config import settings
from app.db import SessionLocal
from app.commerce import service as svc
from app.commerce.models import Reservation

logger = logging.getLogger(__name__)
PAID_PATHS = {"/ask/talk": "ask", "/ask/talk/stream": "ask", "/explain": "ask",
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
                iterator = response.body_iterator
                async def events():
                    buffer, delivered, result = "", False, {}
                    try:
                        async for chunk in iterator:
                            text = chunk.decode() if isinstance(chunk, bytes) else chunk
                            buffer += text
                            while "\n\n" in buffer:
                                event, buffer = buffer.split("\n\n", 1)
                                if event.startswith("data: "):
                                    try:
                                        value = json.loads(event[6:])
                                        if value.get("type") == "final":
                                            result = value.get("response", {})
                                            delivered = not free_response(result)
                                    except ValueError:
                                        pass
                            yield chunk
                    finally:
                        finish(delivered, result)
                response.body_iterator = events()
                return response
            data = {}
            try:
                data = json.loads(response.body)
            except (ValueError, AttributeError):
                pass
            finish(200 <= response.status_code < 300 and not free_response(data), data)
            return response
        return handle
