"""Live matches: private rooms, quick match, and the shared authoritative
state behind them (brief §6).

State machine: lobby -> countdown -> active -> resolving -> results ->
(rematch) closed. The LiveMatch row is the single source of truth — pub/sub
delivery alone is not a database — so every transition is a transactional
write, events carry per-match sequence numbers, and reconnecting clients
rebuild from a snapshot. Per-player hidden information (packs, keys) lives
server-side; opponents exchange progress only, never answers.

Multi-worker support: state is shared through the database (works on SQLite
locally and transactional Postgres in production). WebSocket connections
poll their match's event log, so actions acknowledge immediately to their
actor while opponents converge within about a second.
"""

from __future__ import annotations

from copy import deepcopy
import logging
import random
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import update, text
from sqlalchemy.orm import Session

from app.models import (
    LiveMatch, MatchEvent, MatchParticipant, MatchQueueEntry, MatchTicket,
)
from app.services.play import packs, sessions as session_svc

logger = logging.getLogger("shabd.matches")

MAX_ROOM = 8
QUICK_MAX = 4
COUNTDOWN_SECONDS = 5
RECONNECT_GRACE_SECONDS = 30
WIDEN_AFTER_SECONDS = 15
TICKET_TTL_SECONDS = 120
LIVE_GAMES = {"smriti", "rush", "varna-jaal", "word-groups", "pada-path", "number"}

GAME_ROUND_SECONDS = {
    "smriti": 240, "rush": 120, "varna-jaal": 300, "word-groups": 300,
    "pada-path": 300, "number": 420, "daily-word": 420,
}


class MatchError(Exception):
    def __init__(self, status: int, detail: str):
        self.status = status
        self.detail = detail
        super().__init__(detail)


def _now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _code(rng: random.Random) -> str:
    alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
    return "".join(rng.choice(alphabet) for _ in range(6))


# ── Rooms ────────────────────────────────────────────────────────────────────


def create_room(db: Session, learner, *, game: str, ruleset: str = "casual",
                answer_lang: str = "sa", config: dict | None = None) -> LiveMatch:
    if game not in LIVE_GAMES:
        raise MatchError(422, "This game does not support online matches.")
    _validate_setup(game, config or {})
    for _ in range(12):
        code = _code(random.Random(uuid.uuid4().hex))
        if not db.query(LiveMatch).filter(LiveMatch.code == code,
                                          LiveMatch.status.in_(("lobby", "countdown", "active"))).first():
            break
    m = LiveMatch(code=code, game=game, kind="private", ruleset=ruleset,
                  answer_lang=answer_lang or "sa", host_id=learner.id,
                  config=config or {}, state={"players": {}})
    db.add(m)
    db.flush()
    db.add(MatchParticipant(match_id=m.id, learner_id=learner.id,
                            alias=_alias(learner), is_host=True, ready=True))
    _emit(db, m, "joined", {"learner_id": learner.id, "alias": _alias(learner)})
    db.commit()
    return m


def _alias(learner) -> str:
    return (getattr(learner, "display_name", "") or "Learner")[:32]


def join_room(db: Session, learner, code: str) -> LiveMatch:
    m = (db.query(LiveMatch)
         .filter(LiveMatch.code == code.strip().upper(),
                 LiveMatch.status.in_(("lobby",)))
         .first())
    if m is None:
        raise MatchError(404, "Room not found or already started.")
    return _join(db, learner, m)


def _join(db: Session, learner, m: LiveMatch) -> LiveMatch:
    if _blocked_in(db, m, learner.id):
        raise MatchError(403, "You cannot join this room.")
    p = (db.query(MatchParticipant)
         .filter(MatchParticipant.match_id == m.id,
                 MatchParticipant.learner_id == learner.id).first())
    if p is None:
        count = db.query(MatchParticipant).filter(MatchParticipant.match_id == m.id).count()
        limit = MAX_ROOM if m.kind == "private" else QUICK_MAX
        if count >= limit:
            raise MatchError(409, "Room is full.")
        p = MatchParticipant(match_id=m.id, learner_id=learner.id, alias=_alias(learner))
        db.add(p)
        _emit(db, m, "joined", {"learner_id": learner.id, "alias": p.alias})
    p.left_at = None
    db.commit()
    return m


def _blocked_in(db: Session, m: LiveMatch, learner_id: str) -> bool:
    from app.models import Block
    others = [p.learner_id for p in
              db.query(MatchParticipant).filter(MatchParticipant.match_id == m.id).all()]
    if not others:
        return False
    return db.query(Block).filter(Block.learner_id == learner_id,
                                  Block.blocked_id.in_(others)).first() is not None or \
           db.query(Block).filter(Block.blocked_id == learner_id,
                                  Block.learner_id.in_(others)).first() is not None


def leave_room(db: Session, learner, match_id: str) -> dict:
    m = _get(db, match_id, write=True)
    p = _participant(db, m, learner.id)
    if m.status == "lobby":
        db.delete(p)
        _emit(db, m, "left", {"learner_id": learner.id})
        if m.host_id == learner.id:
            nxt = (db.query(MatchParticipant)
                   .filter(MatchParticipant.match_id == m.id,
                           MatchParticipant.learner_id != learner.id)
                   .order_by(MatchParticipant.joined_at).first())
            if nxt is not None:
                nxt.is_host = True
                m.host_id = nxt.learner_id
                _emit(db, m, "host", {"learner_id": nxt.learner_id})
            else:
                m.status = "closed"
    elif m.status in ("results", "closed"):
        p.left_at = _now()
        _emit(db, m, "left", {"learner_id": learner.id})
    else:
        # Leaving mid-play is a forfeit, not a room teardown.
        p.forfeited = True
        p.left_at = _now()
        _emit(db, m, "forfeit", {"learner_id": learner.id})
        _maybe_resolve(db, m)
    db.commit()
    return {"status": m.status}


def set_ready(db: Session, learner, match_id: str, ready: bool) -> dict:
    m = _get(db, match_id, write=True)
    p = _participant(db, m, learner.id)
    if m.status != "lobby":
        raise MatchError(409, "Match already started.")
    p.ready = bool(ready)
    _emit(db, m, "ready", {"learner_id": learner.id, "ready": p.ready})
    db.commit()
    return {"ready": p.ready}


def update_config(db: Session, learner, match_id: str, config: dict) -> dict:
    m = _get(db, match_id, write=True)
    if m.host_id != learner.id:
        raise MatchError(403, "Only the host can change the setup.")
    if m.status != "lobby":
        raise MatchError(409, "Match already started.")
    merged = {**(m.config or {}), **(config or {})}
    _validate_setup(m.game, merged)
    m.config = merged
    _emit(db, m, "config", {"config": m.config})
    db.commit()
    return {"config": m.config}


def transfer_host(db: Session, learner, match_id: str, to: str) -> dict:
    m = _get(db, match_id, write=True)
    if m.host_id != learner.id:
        raise MatchError(403, "Only the host can transfer the host role.")
    p = _participant(db, m, to)
    p.is_host = True
    old = _participant(db, m, learner.id)
    old.is_host = False
    m.host_id = to
    _emit(db, m, "host", {"learner_id": to})
    db.commit()
    return {"host": to}


def start_match(db: Session, learner, match_id: str) -> dict:
    m = _get(db, match_id, write=True)
    if m.host_id != learner.id:
        raise MatchError(403, "Only the host can start.")
    if m.status != "lobby":
        raise MatchError(409, "Match already started.")
    participants = _participants(db, m)
    if len(participants) < 2:
        raise MatchError(409, "Need at least two players.")
    if not all(p.ready for p in participants):
        raise MatchError(409, "Everyone must be ready.")
    m.status = "countdown"
    m.round_deadline = _now() + timedelta(seconds=COUNTDOWN_SECONDS)
    _emit(db, m, "countdown", {"seconds": COUNTDOWN_SECONDS})
    db.commit()
    return {"status": "countdown", "seconds": COUNTDOWN_SECONDS}


def activate(db: Session, m: LiveMatch) -> None:
    """Move a countdown match into active play, dealing the packs (called by
    the tick job and lazily by WS reads)."""
    m = _get(db, m.id, write=True)
    if m.status != "countdown":
        db.commit()
        return
    participants = _participants(db, m)
    seed = m.id  # equal content and layout seed for every player
    cfg = m.config or {}
    state = {"players": {}, "started_at": _now().isoformat()}
    pack = _deal(db, m, seed, cfg)
    pack_view = _client_view(m.game, pack)
    for p in participants:
        state["players"][p.learner_id] = {
            "pack": deepcopy(pack), "progress": {}, "score": 0, "done": False,
        }
    m.state = state
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(m, "state")
    m.status = "active"
    seconds = GAME_ROUND_SECONDS.get(m.game, 300)
    m.round_deadline = _now() + timedelta(seconds=seconds)
    _emit(db, m, "start", {"seconds": seconds, "pack": pack_view})
    db.commit()


def _deal(db: Session, m: LiveMatch, seed: str, cfg: dict) -> dict:
    game = m.game
    if game == "smriti":
        return packs.smriti_pack(db, pairs=int(cfg.get("pairs", 8)),
                                 deck=cfg.get("deck", "word-meaning"), seed=seed, ranked=False)
    if game == "rush":
        return packs.rush_pack(db, questions=int(cfg.get("questions", 10)), seed=seed, ranked=False)
    if game == "varna-jaal":
        return packs.varna_jaal_pack(db, size=int(cfg.get("size", 4)),
                                     word_count=int(cfg.get("words", 5)), seed=seed)
    if game == "word-groups":
        return packs.word_groups_pack(db, tiles=int(cfg.get("tiles", 16)),
                                      group_size=int(cfg.get("group_size", 4)), seed=seed)
    if game == "pada-path":
        return packs.pada_path_pack(db, prompts=int(cfg.get("prompts", 5)), seed=seed, ranked=False)
    if game == "number":
        return packs.number_pack(prompts=int(cfg.get("prompts", 5)), seed=seed,
                                 answer_lang=m.answer_lang or "sa",
                                 band=cfg.get("band", ""), grouping="indian")
    return {}


def _validate_setup(game: str, config: dict) -> None:
    if game == "word-groups" and (config.get("tiles", 16), config.get("group_size", 4)) not in ((16, 4), (9, 3)):
        raise MatchError(422, "Choose a standard 16/4 or beginner 9/3 Word Groups board.")
    for key, high in {"pairs": 12, "questions": 30, "prompts": 20, "words": 8}.items():
        if key in config and (not isinstance(config[key], int) or not 1 <= config[key] <= high):
            raise MatchError(422, f"Invalid {key} for this match.")
    if "size" in config and config["size"] not in (3, 4):
        raise MatchError(422, "Choose a 3 or 4 cell grid.")


def _client_view(game: str, pack: dict) -> dict:
    if game == "smriti":
        return packs.smriti_client_view(pack)
    if game == "rush":
        return packs.rush_client_view(pack)
    if game == "varna-jaal":
        return packs.varna_jaal_client_view(pack)
    if game == "word-groups":
        return packs.word_groups_client_view(pack)
    if game == "pada-path":
        return packs.pada_path_client_view(pack)
    if game == "number":
        return packs.number_client_view(pack)
    return {}


# ── Live actions ─────────────────────────────────────────────────────────────


def submit_action(db: Session, learner, match_id: str, action: dict, idem: str = "") -> dict:
    m = _get(db, match_id, write=True)
    p = _participant(db, m, learner.id)
    if p.forfeited:
        raise MatchError(409, "You left this match.")
    if idem and idem in (p.state or {}).get("acks", {}):
        ack = p.state["acks"][idem]
        db.commit()
        return ack
    if m.status == "countdown" and _now() >= (m.round_deadline or _now()):
        activate(db, m)
        m = _get(db, match_id, write=True)
    if m.status != "active":
        raise MatchError(409, f"Match is {m.status}.")
    if m.round_deadline and _now() > m.round_deadline + timedelta(seconds=2):
        _maybe_resolve(db, m)
        raise MatchError(410, "Round deadline passed.")
    players = (m.state or {}).get("players", {})
    mine = players.get(learner.id)
    if mine is None:
        raise MatchError(409, "Not seated.")
    if mine.get("done"):
        raise MatchError(409, "Your round is complete. Waiting for the other players.")
    state = mine.get("progress") or _fresh_live_state(m.game)
    try:
        result = _live_action(db, m, mine, state, action)
    except session_svc.PlayError as e:
        raise MatchError(e.status, e.detail)
    from sqlalchemy.orm.attributes import flag_modified
    mine["progress"] = state
    mine["done"] = bool(result.get("complete") or result.get("over"))
    p.score = _live_score(m.game, state, mine["pack"])
    _emit(db, m, "progress", {
        "learner_id": learner.id,
        "public": _public_progress(m.game, state),
        "score": p.score,
    }, actor=learner.id)
    m.state = {**(m.state or {}), "players": players}
    flag_modified(m, "state")
    ack = {"ok": True, **result}
    if idem:
        acks = {**(p.state or {}).get("acks", {}), idem: ack}
        # Retain enough acknowledgements to safely retry every move in a round.
        p.state = {**(p.state or {}), "acks": dict(list(acks.items())[-512:])}
    players_now = (m.state or {}).get("players", {})
    if players_now and all(players_now.get(pp.learner_id, {}).get("done") or pp.forfeited
                           for pp in _participants(db, m)):
        _resolve(db, m)
    db.commit()
    return ack


def _fresh_live_state(game: str) -> dict:
    if game == "smriti":
        return {"found_pairs": [], "attempts": 0, "reveals": {}}
    if game == "rush":
        return {"answers": {}, "received_ms": {}}
    if game == "varna-jaal":
        return {"found": []}
    if game == "word-groups":
        return {"solved_groups": [], "wrong": 0, "locked": []}
    if game == "pada-path":
        return {"scores": {}, "details": {}}
    if game == "number":
        return {"prompt_scores": {}, "prompt_results": {}}
    return {}


def _live_action(db: Session, m: LiveMatch, mine: dict, state: dict, action: dict) -> dict:
    game = m.game
    pack = mine["pack"]
    if game == "smriti":
        return session_svc._smriti_action(pack, state, action)
    if game == "rush":
        idx = int(action.get("index", -1))
        qs = pack.get("questions", [])
        if not (0 <= idx < len(qs)):
            raise session_svc.PlayError(422, "Bad question index.")
        if str(idx) in state["answers"]:
            return {"already": True, "correct": state["answers"][str(idx)]}
        correct = action.get("choice", "") == qs[idx]["correct_value"]
        state["answers"][str(idx)] = correct
        state["received_ms"][str(idx)] = max(0, int(action.get("elapsed_ms", 10**9)))
        complete = len(state["answers"]) >= len(qs)
        return {"correct": correct, "complete": complete}
    if game == "varna-jaal":
        return session_svc._varna_action(pack, state, action)
    if game == "word-groups":
        return session_svc._wordgroups_action(pack, state, action)
    if game == "pada-path":
        idx = str(action.get("index", -1))
        order = action.get("order", [])
        prompts = pack["prompts"]
        index = int(idx)
        if not 0 <= index < len(prompts) or sorted(order) != sorted(t["id"] for t in prompts[index]["tiles"]):
            raise session_svc.PlayError(422, "Place every word tile exactly once.")
        result = session_svc._padapath_action(pack, state, action)
        result = {"score": state["scores"].get(idx, 0), **result,
                  "complete": len(state["scores"]) >= len(pack["prompts"])}
        state["details"][idx] = result
        return result
    if game == "number":
        idx = str(action.get("index", -1))
        result = session_svc._number_action(pack, state, action)
        result = {"score": state["prompt_scores"].get(idx, 0), **result,
                  "complete": len(state["prompt_scores"]) >= len(pack["prompts"])}
        state["prompt_results"][idx] = result
        return result
    raise session_svc.PlayError(404, "Unknown game.")


def _public_progress(game: str, state: dict) -> dict:
    """Opponents see progress, never hidden card identities or answers."""
    if game == "smriti":
        return {"pairs_found": len(state.get("found_pairs", [])),
                "attempts": state.get("attempts", 0)}
    if game == "rush":
        return {"answered": len(state.get("answers", {})),
                "correct": sum(1 for v in state.get("answers", {}).values() if v)}
    if game == "varna-jaal":
        return {"found": len(state.get("found", []))}
    if game == "word-groups":
        return {"solved": len(state.get("solved_groups", [])),
                "wrong": state.get("wrong", 0)}
    if game == "pada-path":
        return {"submitted": len(state.get("scores", {})),
                "points": sum(int(v) for v in state.get("scores", {}).values())}
    if game == "number":
        return {"submitted": len(state.get("prompt_scores", {})),
                "points": sum(int(v) for v in state.get("prompt_scores", {}).values())}
    return {}


def _live_score(game: str, state: dict, pack: dict | None = None) -> int:
    from app.services.play import rubrics
    pack = pack or {}
    try:
        if game == "smriti":
            return rubrics.smriti(pack.get("pairs", 8), state.get("attempts", 0), len(state.get("found_pairs", []))).score
        if game == "rush":
            answers = [{"correct": state.get("answers", {}).get(str(i), False),
                        "elapsed_ms": state.get("received_ms", {}).get(str(i), 10**9)}
                       for i in range(len(pack.get("questions", [])))]
            return rubrics.rush(answers, pack.get("window_ms", 12000)).score
        if game == "varna-jaal":
            found = len(state.get("found", []))
            required = len(pack.get("words", [])) or 5
            return rubrics.varna_jaal(required, found, found >= required, 300000, 300000).score
        if game == "word-groups":
            return rubrics.word_groups(pack.get("groups_total", 4), len(state.get("solved_groups", [])), state.get("wrong", 0)).score
        if game == "pada-path":
            vals = [int(state.get("scores", {}).get(str(i), 0)) for i in range(len(pack.get("prompts", [])))]
            return rubrics.pada_path(vals).score
        if game == "number":
            vals = [int(state.get("prompt_scores", {}).get(str(i), 0)) for i in range(len(pack.get("prompts", [])))]
            return rubrics.number(vals).score
    except Exception:
        return 0
    return 0


# ── Resolve / results / rematch ──────────────────────────────────────────────


def tick(db: Session) -> int:
    """Advance deadlines: countdown -> active, active -> resolving (job- or
    read-called; safe to run concurrently)."""
    n = 0
    now = _now()
    for m in db.query(LiveMatch).filter(LiveMatch.status == "countdown").all():
        if m.round_deadline and now >= m.round_deadline:
            activate(db, m)
            n += 1
    for m in db.query(LiveMatch).filter(LiveMatch.status == "active").all():
        if m.round_deadline and now >= m.round_deadline + timedelta(seconds=2):
            m = _get(db, m.id, write=True)
            if _resolve(db, m):
                n += 1
    db.commit()
    return n


def _maybe_resolve(db: Session, m: LiveMatch) -> None:
    players = (m.state or {}).get("players", {})
    if not players:
        return
    participants = _participants(db, m)
    done = all(players.get(p.learner_id, {}).get("done") or p.forfeited
               for p in participants)
    if done:
        _resolve(db, m)


def _resolve(db: Session, m: LiveMatch) -> bool:
    if m.status not in ("active", "countdown"):
        return False
    participants = _participants(db, m)
    standings = []
    for p in participants:
        players = (m.state or {}).get("players", {})
        mine = players.get(p.learner_id, {})
        state = mine.get("progress") or _fresh_live_state(m.game)
        score = 0 if p.forfeited else _live_score(m.game, state, mine.get("pack"))
        p.score = score
        standings.append({"learner_id": p.learner_id, "alias": p.alias,
                          "score": score, "forfeited": p.forfeited})
    standings.sort(key=lambda s: -s["score"])
    best = standings[0]["score"] if standings else 0
    rank = 0
    prev = None
    for s in standings:
        if s["score"] != prev:
            rank += 1
            prev = s["score"]
        s["rank"] = rank
    m.result = {"standings": standings, "kind": "casual",
                "note": "Online matches are casual for the daily ladder; ranked "
                        "contributions come from the canonical individual variant."}
    m.status = "results"
    _emit(db, m, "results", {"standings": standings})
    return True


def rematch_vote(db: Session, learner, match_id: str) -> dict:
    m = _get(db, match_id, write=True)
    p = _participant(db, m, learner.id)
    if m.status == "closed" and (m.state or {}).get("rematch_id"):
        rematch_id = m.state["rematch_id"]
        db.commit()
        return {"rematch": rematch_id}
    if m.status != "results":
        raise MatchError(409, "Wait for the match results before requesting a rematch.")
    votes = set((p.state or {}).get("rematch_votes", []))
    votes.add(learner.id)
    p.state = {**(p.state or {}), "rematch_votes": sorted(votes)}
    participants = [pp for pp in _participants(db, m) if pp.left_at is None and not pp.forfeited]
    if len(participants) >= 2 and all(pp.learner_id in (pp.state or {}).get("rematch_votes", []) for pp in participants):
        nm = LiveMatch(code=_code(random.Random(uuid.uuid4().hex)), game=m.game,
                       kind=m.kind, ruleset=m.ruleset, answer_lang=m.answer_lang,
                       host_id=m.host_id if any(pp.learner_id == m.host_id for pp in participants) else participants[0].learner_id, config=m.config,
                       state={"players": {}})
        db.add(nm)
        db.flush()
        for pp in participants:
            db.add(MatchParticipant(match_id=nm.id, learner_id=pp.learner_id,
                                    alias=pp.alias, is_host=pp.learner_id == nm.host_id,
                                    ready=True))
        _emit(db, nm, "joined", {"rematch_of": m.id})
        for pp in participants:
            _emit(db, nm, "joined", {"learner_id": pp.learner_id, "alias": pp.alias})
        m.status = "closed"
        m.state = {**(m.state or {}), "rematch_id": nm.id}
        _emit(db, m, "rematch", {"match_id": nm.id})
        db.commit()
        return {"rematch": nm.id, "code": nm.code}
    _emit(db, m, "rematch_vote", {"learner_id": learner.id,
                                  "votes": len([pp for pp in participants
                                                if pp.learner_id in (pp.state or {}).get("rematch_votes", [])])})
    db.commit()
    return {"votes_pending": True}


# ── Snapshots / tickets / queue ──────────────────────────────────────────────


def snapshot(db: Session, m: LiveMatch, learner_id: str) -> dict:
    participants = _participants(db, m)
    players = (m.state or {}).get("players", {})
    mine = players.get(learner_id, {})
    pack_view = _client_view(m.game, mine.get("pack", {})) if mine else None
    # For same-board races every player shares the seed: each client renders
    # its own copy from its own pack view; others expose progress only.
    return {
        "match_id": m.id, "code": m.code, "game": m.game, "kind": m.kind,
        "ruleset": m.ruleset, "answer_lang": m.answer_lang,
        "status": m.status, "host": m.host_id, "config": m.config,
        "seq": m.seq,
        "deadline": m.round_deadline.isoformat() + "Z" if m.round_deadline else None,
        "players": [{"learner_id": p.learner_id, "alias": p.alias,
                     "is_host": p.is_host, "ready": p.ready,
                     "connected": p.connected, "score": p.score,
                     "forfeited": p.forfeited,
                     "progress": _public_progress(m.game, (players.get(p.learner_id, {}) or {}).get("progress") or _fresh_live_state(m.game))}
                    for p in participants],
        "pack": pack_view,
        "own_state": _resume_progress(m.game, mine),
        "own_done": bool(mine.get("done")),
        "rematch_id": (m.state or {}).get("rematch_id"),
        "rematch_voted": learner_id in (next((p.state or {} for p in participants if p.learner_id == learner_id), {})).get("rematch_votes", []),
        "result": m.result,
    }


def _resume_progress(game: str, mine: dict) -> dict:
    """Only the requester receives their previous moves and authorised faces."""
    state = dict(mine.get("progress") or _fresh_live_state(game))
    if game == "smriti" and mine:
        state["faces"] = {cid: packs.smriti_reveal(mine["pack"], int(cid))
                          for cid in state.get("reveals", {})}
    if game == "varna-jaal" and mine:
        state["found_indices"] = [str(i) for i, w in enumerate(mine["pack"]["words"])
                                  if w["id"] in state.get("found", [])]
    return state


def make_ticket(db: Session, learner, match_id: str | None, scope: str = "match") -> str:
    t = uuid.uuid4().hex + uuid.uuid4().hex[:16]
    db.add(MatchTicket(id=t, learner_id=learner.id, match_id=match_id,
                       scope=scope, expires_at=_now() + timedelta(seconds=TICKET_TTL_SECONDS)))
    db.commit()
    return t


def use_ticket(db: Session, ticket: str) -> MatchTicket:
    t = db.query(MatchTicket).filter(MatchTicket.id == ticket).first()
    if t is None or t.used_at is not None or t.expires_at < _now():
        raise MatchError(401, "Ticket invalid or expired.")
    t.used_at = _now()
    db.commit()
    return t


def events_since(db: Session, m: LiveMatch, since: int, limit: int = 100) -> list[MatchEvent]:
    return (db.query(MatchEvent)
            .filter(MatchEvent.match_id == m.id, MatchEvent.seq > since)
            .order_by(MatchEvent.seq)
            .limit(limit).all())


def _emit(db: Session, m: LiveMatch, type_: str, payload: dict, actor: str = "system") -> None:
    m.seq = (m.seq or 0) + 1
    db.add(MatchEvent(match_id=m.id, seq=m.seq, type=type_, payload=payload, actor=actor))


def mark_connected(db: Session, m: LiveMatch, learner_id: str, connected: bool) -> None:
    m = _get(db, m.id, write=True)
    p = (db.query(MatchParticipant)
         .filter(MatchParticipant.match_id == m.id, MatchParticipant.learner_id == learner_id)
         .first())
    if p is None:
        db.commit()
        return
    was = p.connected
    p.connected = connected
    p.last_seen = _now()
    if connected and not was:
        _emit(db, m, "reconnected", {"learner_id": learner_id})
    if not connected and was:
        _emit(db, m, "disconnected", {"learner_id": learner_id})
    db.commit()


# ── Quick match ──────────────────────────────────────────────────────────────


def enqueue(db: Session, learner, *, game: str, ruleset: str = "casual",
            answer_lang: str = "sa", band: str = "open") -> dict:
    if game not in LIVE_GAMES:
        raise MatchError(422, "This game does not support online matches.")
    _lock_queue(db)
    _cancel_queue(db, learner.id)
    now = _now()
    # 1) someone waiting with same game/ruleset/lang and compatible band
    candidates = (db.query(MatchQueueEntry)
                  .filter(MatchQueueEntry.game == game,
                          MatchQueueEntry.ruleset == ruleset,
                          MatchQueueEntry.answer_lang == answer_lang,
                          MatchQueueEntry.status == "waiting",
                          MatchQueueEntry.learner_id != learner.id)
                  .order_by(MatchQueueEntry.enqueued_at)
                  .all())
    for c in candidates:
        waited = (now - (c.enqueued_at or now)).total_seconds()
        if _bands_compatible(c.band, band, waited) and not _queue_blocked(db, learner.id, c.learner_id):
            m = _pair(db, c, learner, game, ruleset, answer_lang, band)
            return {"matched": True, "match_id": m.id, "code": m.code}
    entry = MatchQueueEntry(learner_id=learner.id, game=game, ruleset=ruleset,
                            answer_lang=answer_lang, band=band or "open")
    db.add(entry)
    db.commit()
    return {"matched": False, "waiting": True,
            "since": entry.enqueued_at.isoformat() + "Z" if entry.enqueued_at else None}


def _bands_compatible(a: str, b: str, waited_seconds: float) -> bool:
    if a == "open" or b == "open" or a == b:
        return True
    # After 15 seconds widen to compatible bands; never show bots as people.
    return waited_seconds >= WIDEN_AFTER_SECONDS


def _pair(db: Session, other: MatchQueueEntry, learner, game, ruleset, answer_lang, band) -> LiveMatch:
    m = LiveMatch(code=_code(random.Random(uuid.uuid4().hex)), game=game,
                  kind="quick", ruleset=ruleset, answer_lang=answer_lang,
                  host_id=other.learner_id, config={}, state={"players": {}})
    db.add(m)
    db.flush()
    db.add(MatchParticipant(match_id=m.id, learner_id=other.learner_id,
                            alias=_alias_of(db, other.learner_id), is_host=True, ready=True))
    db.add(MatchParticipant(match_id=m.id, learner_id=learner.id,
                            alias=_alias(learner), is_host=False, ready=True))
    other.status = "matched"
    other.match_id = m.id
    entry = db.query(MatchQueueEntry).filter(MatchQueueEntry.learner_id == learner.id,
                                            MatchQueueEntry.status == "waiting").first()
    if entry is None:
        entry = MatchQueueEntry(learner_id=learner.id, game=game, ruleset=ruleset,
                                answer_lang=answer_lang, band=band or "open")
        db.add(entry)
    entry.status = "matched"
    entry.match_id = m.id
    _emit(db, m, "joined", {"learner_id": other.learner_id})
    _emit(db, m, "joined", {"learner_id": learner.id})
    db.commit()
    return m


def _alias_of(db: Session, learner_id: str) -> str:
    from app.models import Learner
    l = db.query(Learner).filter(Learner.id == learner_id).first()
    return _alias(l) if l else "Learner"


def queue_status(db: Session, learner) -> dict:
    _lock_queue(db)
    entry = (db.query(MatchQueueEntry)
             .filter(MatchQueueEntry.learner_id == learner.id,
                     MatchQueueEntry.status == "waiting")
             .first())
    if entry is None:
        matched = (db.query(MatchQueueEntry)
                   .join(LiveMatch, LiveMatch.id == MatchQueueEntry.match_id)
                   .join(MatchParticipant, (MatchParticipant.match_id == LiveMatch.id) &
                         (MatchParticipant.learner_id == learner.id))
                   .filter(MatchQueueEntry.learner_id == learner.id,
                           MatchQueueEntry.status == "matched",
                           LiveMatch.status.in_(("lobby", "countdown", "active")),
                           MatchParticipant.left_at.is_(None), MatchParticipant.forfeited.is_(False))
                   .order_by(MatchQueueEntry.enqueued_at.desc()).first())
        if matched:
            match_id = matched.match_id
            db.commit()
            return {"matched": True, "match_id": match_id}
        db.commit()
        return {"matched": False, "waiting": False}
    waited = (_now() - (entry.enqueued_at or _now())).total_seconds()
    # Re-evaluate compatibility while polling: two queued bands may become
    # compatible after 15s without a third player arriving.
    candidates = (db.query(MatchQueueEntry).filter(
        MatchQueueEntry.game == entry.game, MatchQueueEntry.ruleset == entry.ruleset,
        MatchQueueEntry.answer_lang == entry.answer_lang, MatchQueueEntry.status == "waiting",
        MatchQueueEntry.learner_id != learner.id).order_by(MatchQueueEntry.enqueued_at).all())
    for other in candidates:
        age = max(waited, (_now() - (other.enqueued_at or _now())).total_seconds())
        if _bands_compatible(entry.band, other.band, age) and not _queue_blocked(db, learner.id, other.learner_id):
            m = _pair(db, other, learner, entry.game, entry.ruleset, entry.answer_lang, entry.band)
            return {"matched": True, "match_id": m.id, "code": m.code}
    result = {"matched": False, "waiting": True,
            "game": entry.game, "waited_seconds": int(waited),
            "widened": waited >= WIDEN_AFTER_SECONDS,
            "offer_solo_after": max(0, 30 - int(waited))}
    db.commit()
    return result


def _cancel_queue(db: Session, learner_id: str) -> None:
    (db.query(MatchQueueEntry)
     .filter(MatchQueueEntry.learner_id == learner_id,
             MatchQueueEntry.status.in_(("waiting", "matched")))
     .update({"status": "cancelled"}))


def cancel_queue(db: Session, learner) -> dict:
    _lock_queue(db)
    # A pairing can win the race with the Cancel tap. Remove the cancelling
    # player's lobby seat as well, rather than leave a ghost ready player.
    entries = db.query(MatchQueueEntry).filter(MatchQueueEntry.learner_id == learner.id,
                                              MatchQueueEntry.status == "matched").all()
    mids = {entry.match_id for entry in entries if entry.match_id}
    _cancel_queue(db, learner.id)
    db.flush()
    for mid in mids:
        m = _get(db, mid, write=True)
        p = db.query(MatchParticipant).filter(MatchParticipant.match_id == mid,
                                              MatchParticipant.learner_id == learner.id).first()
        if m.status in ("lobby", "countdown", "active") and p is not None:
            leave_room(db, learner, mid)
    db.commit()
    return {"cancelled": True}


def _queue_blocked(db: Session, a: str, b: str) -> bool:
    from app.models import Block
    from sqlalchemy import or_, and_
    return db.query(Block).filter(or_(and_(Block.learner_id == a, Block.blocked_id == b),
                                      and_(Block.learner_id == b, Block.blocked_id == a))).first() is not None


def _lock_queue(db: Session) -> None:
    if db.get_bind().dialect.name == "sqlite":
        db.execute(update(MatchQueueEntry).where(MatchQueueEntry.status == "waiting")
                   .values(status=MatchQueueEntry.status))
    elif db.get_bind().dialect.name == "postgresql":
        db.execute(text("SELECT pg_advisory_xact_lock(75438771)"))


def _get(db: Session, match_id: str, *, write: bool = False) -> LiveMatch:
    if write and db.get_bind().dialect.name == "sqlite":
        # SQLite has no row locks. Acquire its write lock before reading the
        # JSON state so simultaneous moves cannot overwrite each other.
        db.execute(update(LiveMatch).where(LiveMatch.id == match_id)
                   .values(updated_at=LiveMatch.updated_at))
    query = db.query(LiveMatch).filter(LiveMatch.id == match_id)
    if write:
        query = query.populate_existing().with_for_update()
    m = query.first()
    if m is None:
        raise MatchError(404, "Match not found.")
    return m


def advance(db: Session, m: LiveMatch) -> LiveMatch:
    """Snapshots also drive deadlines when a socket is reconnecting."""
    if m.round_deadline and m.status == "countdown" and _now() >= m.round_deadline:
        activate(db, m)
    elif m.round_deadline and m.status == "active" and _now() >= m.round_deadline + timedelta(seconds=2):
        m = _get(db, m.id, write=True)
        _resolve(db, m)
        db.commit()
    return m


def _participant(db: Session, m: LiveMatch, learner_id: str) -> MatchParticipant:
    p = (db.query(MatchParticipant)
         .filter(MatchParticipant.match_id == m.id, MatchParticipant.learner_id == learner_id)
         .first())
    if p is None:
        raise MatchError(403, "Not a participant.")
    return p


def _participants(db: Session, m: LiveMatch) -> list[MatchParticipant]:
    return (db.query(MatchParticipant)
            .filter(MatchParticipant.match_id == m.id)
            .order_by(MatchParticipant.joined_at).all())


def my_match(db: Session, learner_id: str) -> LiveMatch | None:
    """The active match this learner is seated in, if any (resume path)."""
    rows = (db.query(MatchParticipant)
            .filter(MatchParticipant.learner_id == learner_id,
                    MatchParticipant.left_at.is_(None))
            .all())
    if not rows:
        return None
    ids = [r.match_id for r in rows]
    m = (db.query(LiveMatch)
         .filter(LiveMatch.id.in_(ids),
                 LiveMatch.status.in_(("lobby", "countdown", "active", "resolving", "results")))
         .order_by(LiveMatch.updated_at.desc())
         .first())
    return m
