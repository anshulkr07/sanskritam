"""Matches API: rooms (HTTP), matchmaking, tickets and the live WebSocket.

Protocol (events carry match id, player id, protocol version, sequence,
idempotency key):
  • HTTP  POST /play/matches/rooms            create private room
          POST /play/matches/rooms/join       join by code
          POST /play/matches/rooms/{id}/ready|start|config|host|leave|rematch
          GET  /play/matches/{id}             snapshot (auth)
          GET  /play/matches/{id}/ticket      short-lived WS ticket
          POST /play/matches/queue            enqueue / status / cancel
  • WS    /ws/matches/{ticket}?since=N        live events + actions
Client messages: {"type":"action","action":{...},"idem":...} |
  {"type":"ready","ready":bool} | {"type":"start"} | {"type":"config",...} |
  {"type":"rematch"} | {"type":"ping"}.
Server pushes: {"seq","type","payload"} events; on a gap the client asks
{"type":"sync","since":N} or simply reconnects — snapshots rebuild state.
"""

from __future__ import annotations

import asyncio
import json
import logging

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth import require_learner
from app.db import SessionLocal, get_db
from app.models import Learner
from app.services.play import matches as match_svc

logger = logging.getLogger("shabd.matches")

router = APIRouter(prefix="/play/matches")
PROTOCOL_VERSION = 1


def _http(e: match_svc.MatchError) -> HTTPException:
    return HTTPException(status_code=e.status, detail=e.detail)


class RoomBody(BaseModel):
    game: str
    ruleset: str = "casual"
    answer_lang: str = "sa"
    config: dict = {}


class JoinBody(BaseModel):
    code: str


@router.post("/rooms")
def post_room(body: RoomBody, learner: Learner = Depends(require_learner),
              db: Session = Depends(get_db)):
    try:
        m = match_svc.create_room(db, learner, game=body.game, ruleset=body.ruleset,
                                  answer_lang=body.answer_lang, config=body.config)
    except match_svc.MatchError as e:
        raise _http(e)
    return match_svc.snapshot(db, m, learner.id)


@router.post("/rooms/join")
def post_join(body: JoinBody, learner: Learner = Depends(require_learner),
              db: Session = Depends(get_db)):
    try:
        m = match_svc.join_room(db, learner, body.code)
    except match_svc.MatchError as e:
        raise _http(e)
    return match_svc.snapshot(db, m, learner.id)


@router.get("/resume")
def get_resume(learner: Learner = Depends(require_learner), db: Session = Depends(get_db)):
    m = match_svc.my_match(db, learner.id)
    if m is None:
        return {"match": None}
    match_svc.advance(db, m)
    snap = match_svc.snapshot(db, m, learner.id)
    ticket = match_svc.make_ticket(db, learner, m.id)
    snap["ticket"] = ticket
    return {"match": snap}


class ReadyBody(BaseModel):
    ready: bool = True


class ActionBody(BaseModel):
    action: dict
    idem: str


@router.post("/{match_id}/actions")
def post_action(match_id: str, body: ActionBody,
                learner: Learner = Depends(require_learner), db: Session = Depends(get_db)):
    try:
        return match_svc.submit_action(db, learner, match_id, body.action, body.idem)
    except match_svc.MatchError as e:
        raise _http(e)


@router.post("/rooms/{match_id}/ready")
def post_ready(match_id: str, body: ReadyBody,
               learner: Learner = Depends(require_learner), db: Session = Depends(get_db)):
    try:
        return match_svc.set_ready(db, learner, match_id, body.ready)
    except match_svc.MatchError as e:
        raise _http(e)


class ConfigBody(BaseModel):
    config: dict


@router.post("/rooms/{match_id}/config")
def post_config(match_id: str, body: ConfigBody,
                learner: Learner = Depends(require_learner), db: Session = Depends(get_db)):
    try:
        return match_svc.update_config(db, learner, match_id, body.config)
    except match_svc.MatchError as e:
        raise _http(e)


class HostBody(BaseModel):
    to: str


@router.post("/rooms/{match_id}/host")
def post_host(match_id: str, body: HostBody,
              learner: Learner = Depends(require_learner), db: Session = Depends(get_db)):
    try:
        return match_svc.transfer_host(db, learner, match_id, body.to)
    except match_svc.MatchError as e:
        raise _http(e)


@router.post("/rooms/{match_id}/start")
def post_start(match_id: str, learner: Learner = Depends(require_learner),
               db: Session = Depends(get_db)):
    try:
        return match_svc.start_match(db, learner, match_id)
    except match_svc.MatchError as e:
        raise _http(e)


@router.post("/rooms/{match_id}/leave")
def post_leave(match_id: str, learner: Learner = Depends(require_learner),
               db: Session = Depends(get_db)):
    try:
        return match_svc.leave_room(db, learner, match_id)
    except match_svc.MatchError as e:
        raise _http(e)


@router.post("/rooms/{match_id}/rematch")
def post_rematch(match_id: str, learner: Learner = Depends(require_learner),
                 db: Session = Depends(get_db)):
    try:
        return match_svc.rematch_vote(db, learner, match_id)
    except match_svc.MatchError as e:
        raise _http(e)


class QueueBody(BaseModel):
    game: str
    ruleset: str = "casual"
    answer_lang: str = "sa"
    band: str = "open"


@router.post("/queue")
def post_queue(body: QueueBody, learner: Learner = Depends(require_learner),
               db: Session = Depends(get_db)):
    try:
        return match_svc.enqueue(db, learner, game=body.game, ruleset=body.ruleset,
                                 answer_lang=body.answer_lang, band=body.band)
    except match_svc.MatchError as e:
        raise _http(e)


# Literal queue paths are declared BEFORE the /{match_id} routes below so
# FastAPI never matches "queue" as a match id.
@router.get("/queue")
def get_queue(learner: Learner = Depends(require_learner), db: Session = Depends(get_db)):
    return match_svc.queue_status(db, learner)


@router.post("/queue/cancel")
def post_queue_cancel(learner: Learner = Depends(require_learner),
                      db: Session = Depends(get_db)):
    return match_svc.cancel_queue(db, learner)


@router.get("/{match_id}")
def get_snapshot(match_id: str, learner: Learner = Depends(require_learner),
                 db: Session = Depends(get_db)):
    try:
        m = match_svc._get(db, match_id)
        match_svc._participant(db, m, learner.id)
    except match_svc.MatchError as e:
        raise _http(e)
    match_svc.advance(db, m)
    return match_svc.snapshot(db, m, learner.id)


@router.get("/{match_id}/ticket")
def get_ticket(match_id: str, learner: Learner = Depends(require_learner),
               db: Session = Depends(get_db)):
    try:
        m = match_svc._get(db, match_id)
        match_svc._participant(db, m, learner.id)
    except match_svc.MatchError as e:
        raise _http(e)
    return {"ticket": match_svc.make_ticket(db, learner, match_id),
            "ws": "/ws/matches", "protocol": PROTOCOL_VERSION}


# ── WebSocket ────────────────────────────────────────────────────────────────

POLL_SECONDS = 0.8


@router.websocket("/ws/matches/{ticket}")
async def ws_matches(websocket: WebSocket, ticket: str, since: int = 0):
    """Live match socket. Registered on the app at /ws/matches/{ticket} (see
    main.py) — the router prefix is for the REST half only."""
    db = SessionLocal()
    send_lock = asyncio.Lock()
    match: object | None = None
    learner: Learner | None = None
    try:
        try:
            t = match_svc.use_ticket(db, ticket)
        except match_svc.MatchError as e:
            await websocket.close(code=4401)
            return
        learner = db.query(Learner).filter(Learner.id == t.learner_id).first()
        if learner is None or not t.match_id:
            await websocket.close(code=4402)
            return
        m = match_svc._get(db, t.match_id)
        try:
            match_svc._participant(db, m, learner.id)
        except match_svc.MatchError:
            await websocket.close(code=4403)
            return
        match = m
        await websocket.accept()
        match_svc.mark_connected(db, m, learner.id, True)
        if m.status == "countdown" and m.round_deadline and match_svc._now() >= m.round_deadline:
            match_svc.activate(db, m)
        snap = match_svc.snapshot(db, m, learner.id)
        snap["protocol"] = PROTOCOL_VERSION
        await websocket.send_text(json.dumps({"type": "snapshot", "payload": snap}))
        last_seq = max(since, m.seq or 0)

        async def _send(obj: dict) -> None:
            async with send_lock:
                await websocket.send_text(json.dumps(obj, default=str))

        async def handle(msg: dict) -> None:
            nonlocal last_seq
            db.expire_all()
            type_ = msg.get("type", "")
            if type_ == "action":
                ack = match_svc.submit_action(db, learner, match.id, msg.get("action", {}),
                                              idem=str(msg.get("idem", "")))
                await _send({"type": "ack", "idem": msg.get("idem", ""), "payload": ack})
            elif type_ == "ready":
                match_svc.set_ready(db, learner, match.id, bool(msg.get("ready", True)))
            elif type_ == "start":
                match_svc.start_match(db, learner, match.id)
            elif type_ == "config":
                match_svc.update_config(db, learner, match.id, msg.get("config", {}))
            elif type_ == "rematch":
                match_svc.rematch_vote(db, learner, match.id)
            elif type_ == "leave":
                match_svc.leave_room(db, learner, match.id)
            elif type_ == "sync":
                since_n = int(msg.get("since", 0))
                events = match_svc.events_since(db, match, since_n)
                for ev in events:
                    await _send({"seq": ev.seq, "type": ev.type, "payload": ev.payload})
                last_seq = max(last_seq, since_n)
            elif type_ == "ping":
                await _send({"type": "pong"})

        async def receiver() -> None:
            while True:
                raw = await websocket.receive_text()
                try:
                    msg = json.loads(raw)
                except Exception:
                    continue
                try:
                    await handle(msg)
                except match_svc.MatchError as e:
                    db.rollback()
                    await _send({"type": "error", "detail": e.detail, "status": e.status, "idem": msg.get("idem")})
                except Exception as e:  # never let one bad message kill the socket
                    db.rollback()
                    logger.info("ws action failed: %s", e)
                    await _send({"type": "error", "detail": "action failed"})

        async def pumper() -> None:
            nonlocal last_seq
            while True:
                await asyncio.sleep(POLL_SECONDS)
                db.expire_all()
                match_svc.advance(db, match)
                events = match_svc.events_since(db, match, last_seq)
                for ev in events:
                    await _send({"seq": ev.seq, "type": ev.type, "payload": ev.payload})
                    last_seq = max(last_seq, ev.seq)
                if match.status == "closed" and last_seq >= match.seq:
                    await _send({"type": "closed", "payload": {}})
                    break

        recv_task = asyncio.create_task(receiver())
        pump_task = asyncio.create_task(pumper())
        await asyncio.wait({recv_task, pump_task}, return_when=asyncio.FIRST_COMPLETED)
        recv_task.cancel()
        pump_task.cancel()
    except WebSocketDisconnect:
        pass
    except Exception as e:  # noqa: BLE001
        logger.info("ws closed: %s", e)
    finally:
        try:
            if match is not None and learner is not None:
                match_svc.mark_connected(db, match, learner.id, False)
        except Exception:
            pass
        db.close()
        try:
            await websocket.close()
        except Exception:
            pass
