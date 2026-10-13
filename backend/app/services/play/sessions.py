"""Game sessions: issue, validate, finish — with ranked allocations.

Flow (brief §5):
  • POST start  → issues a session, holds the pack server-side. A ranked start
    reserves one of the day's three allocations (Daily Word: its one puzzle is
    served by its own endpoints and contributes through a finished session
    record instead).
  • /answer     → records game actions against the server-held key, returning
    only what the player may see. Idempotent per action.
  • /hint       → converts a ranked round to practice before it can score,
    closing the answer-peeking retry loophole.
  • /finish     → computes the 0-1000 score from server metrics, writes
    GameDayScore + recomputes DailyGamePoints in ONE transaction. Duplicate
    finish calls are idempotent. The 2-minute submission grace is honoured;
    anything later is void, not fabricated.
  • /abandon    → a client abandon consumes the allocation only after the
    deadline passes; verified server failures release it (void).
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.models import DailyGamePoints, GameDayScore, GameSession
from app.services.localtime import local_date
from app.services.play import packs, rubrics
from app.services.play.catalog import (
    DAILY_WORD_ATTEMPTS,
    GAMES,
    GRACE_SUBMIT_SECONDS,
    RANKED_ATTEMPTS_PER_DAY,
    TOP_GAMES_COUNT,
)

logger = logging.getLogger("shabd.play")

DEADLINES = {  # generous per-round bounds by game (seconds)
    "smriti": 15 * 60, "rush": 8 * 60, "varna-jaal": 12 * 60,
    "word-groups": 12 * 60, "pada-path": 12 * 60, "number": 15 * 60,
    "daily-word": 15 * 60,
}


class PlayError(Exception):
    def __init__(self, status: int, detail: str):
        self.status = status
        self.detail = detail
        super().__init__(detail)


def ist_day() -> str:
    """Shared Play rankings use Asia/Kolkata boundaries (brief §5)."""
    return local_date("Asia/Kolkata")


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def start_session(db: Session, learner, *, game: str, mode: str,
                  difficulty: dict | None, answer_lang: str,
                  idempotency_key: str, match_id: str = "") -> GameSession:
    if game not in GAMES:
        raise PlayError(404, "Unknown game.")
    if idempotency_key:
        existing = (db.query(GameSession)
                    .filter(GameSession.learner_id == learner.id,
                            GameSession.idempotency_key == idempotency_key)
                    .first())
        if existing is not None:
            return existing
    if mode not in ("ranked", "practice", "local", "online-casual"):
        raise PlayError(422, "Unknown mode.")
    g = GAMES[game]
    ranked = mode == "ranked"
    day = ist_day()
    alloc_left = _allocations_left(db, learner.id, game, day)
    if ranked and alloc_left <= 0:
        raise PlayError(429, "No ranked attempts left for this game today. Practice is open.")

    spec = g.ranked_spec if ranked else _casual_spec(g, difficulty)
    seed = uuid.uuid4().hex[:16]
    pack = _build_pack(db, game, spec=spec, seed=seed, ranked=ranked, answer_lang=answer_lang)
    if not pack:
        raise PlayError(503, "No content available for this game yet.")

    deadline = _utcnow() + timedelta(seconds=DEADLINES.get(game, 900))
    session = GameSession(
        learner_id=learner.id, game=game, mode=mode,
        ruleset=rubrics.RUBRIC_VERSION, answer_lang=answer_lang,
        # Issued day (IST) for every mode: the personal Play goal counts
        # completed valid rounds in any mode; only ranked ones consume
        # allocations.
        allocation_day=day,
        pack=pack, seed=seed,
        deadline=deadline + timedelta(seconds=GRACE_SUBMIT_SECONDS),
        idempotency_key=idempotency_key or None,
        match_id=match_id or None,
    )
    db.add(session)
    if ranked:
        cell = _day_cell(db, learner.id, game, day)
        cell.attempts_used += 1
    try:
        db.commit()
    except Exception:
        db.rollback()
        # Concurrent start with the same idempotency key: return the winner.
        if idempotency_key:
            existing = (db.query(GameSession)
                        .filter(GameSession.learner_id == learner.id,
                                GameSession.idempotency_key == idempotency_key)
                        .first())
            if existing is not None:
                return existing
        raise
    return session


def _casual_spec(g, difficulty: dict | None) -> dict:
    diff = difficulty or {}
    if g.key == "smriti":
        return {"pairs": int(diff.get("pairs", 8)), "deck": diff.get("deck", "word-meaning")}
    if g.key == "rush":
        return {"questions": int(diff.get("questions", 10))}
    if g.key == "varna-jaal":
        return {"size": int(diff.get("size", 4)), "words": 4 if int(diff.get("size", 4)) < 4 else 5}
    if g.key == "word-groups":
        tiles = int(diff.get("tiles", 16))
        gs = int(diff.get("group_size", 4))
        return {"tiles": tiles, "group_size": gs}
    if g.key == "pada-path":
        return {"prompts": int(diff.get("prompts", 5))}
    if g.key == "number":
        return {"prompts": int(diff.get("prompts", 5)), "band": diff.get("band", "0-20")}
    return g.ranked_spec


def _build_pack(db: Session, game: str, *, spec: dict, seed: str, ranked: bool,
                answer_lang: str) -> dict:
    if game == "smriti":
        return packs.smriti_pack(db, pairs=int(spec["pairs"]), deck=spec.get("deck", "word-meaning"),
                                 seed=seed, ranked=ranked)
    if game == "rush":
        return packs.rush_pack(db, questions=int(spec["questions"]), seed=seed, ranked=ranked)
    if game == "varna-jaal":
        return packs.varna_jaal_pack(db, size=int(spec["size"]), word_count=int(spec["words"]),
                                     seed=seed)
    if game == "word-groups":
        return packs.word_groups_pack(db, tiles=int(spec["tiles"]), group_size=int(spec["group_size"]),
                                      seed=seed)
    if game == "pada-path":
        return packs.pada_path_pack(db, prompts=int(spec["prompts"]), seed=seed, ranked=ranked)
    if game == "number":
        return packs.number_pack(prompts=int(spec["prompts"]), seed=seed,
                                 answer_lang=answer_lang or "sa", band=spec.get("band", ""))
    return {}


def _day_cell(db: Session, learner_id: str, game: str, day: str) -> GameDayScore:
    cell = (db.query(GameDayScore)
            .filter(GameDayScore.learner_id == learner_id, GameDayScore.day == day,
                    GameDayScore.game == game)
            .with_for_update()
            .first())
    if cell is None:
        cell = GameDayScore(learner_id=learner_id, day=day, game=game)
        db.add(cell)
        db.flush()
    return cell


def _allocations_left(db: Session, learner_id: str, game: str, day: str) -> int:
    limit = DAILY_WORD_ATTEMPTS if game == "daily-word" else RANKED_ATTEMPTS_PER_DAY
    cell = (db.query(GameDayScore)
            .filter(GameDayScore.learner_id == learner_id, GameDayScore.day == day,
                    GameDayScore.game == game)
            .first())
    used = cell.attempts_used if cell else 0
    return max(0, limit - used)


def client_view(session: GameSession) -> dict:
    g = GAMES[session.game]
    pack = session.pack or {}
    if session.game == "smriti":
        view = packs.smriti_client_view(pack)
    elif session.game == "rush":
        view = packs.rush_client_view(pack)
    elif session.game == "varna-jaal":
        view = packs.varna_jaal_client_view(pack)
    elif session.game == "word-groups":
        view = packs.word_groups_client_view(pack)
    elif session.game == "pada-path":
        view = packs.pada_path_client_view(pack)
    elif session.game == "number":
        view = packs.number_client_view(pack)
    else:
        view = {}
    return {
        "id": session.id, "game": session.game, "mode": session.mode,
        "ruleset": session.ruleset, "answer_lang": session.answer_lang,
        "status": session.status,
        "deadline": session.deadline.isoformat() + "Z" if session.deadline else None,
        "ranked_spec": g.ranked_spec if session.mode == "ranked" else None,
        "pack": view,
        "result": session.result,
        "score": session.score,
    }


def apply_answer(db: Session, learner, session: GameSession, action: dict) -> dict:
    """Record one game action against the server-held key. Authorised
    information only leaves the server; actions are idempotent by (index,
    attempt counter) and validated for membership/deadlines."""
    if session.learner_id != learner.id:
        raise PlayError(403, "Not your session.")
    if session.status not in ("active", "practice"):
        raise PlayError(409, "Session is closed.")
    if session.deadline and _utcnow() > session.deadline + timedelta(seconds=GRACE_SUBMIT_SECONDS):
        raise PlayError(410, "Session deadline passed.")
    game = session.game
    pack = session.pack
    state = session.result if isinstance(session.result, dict) else None
    if state is None:
        state = _fresh_state(game, pack)
    typ = action.get("type", "")
    out: dict = {"ok": True}

    if game == "smriti":
        out = _smriti_action(pack, state, action)
    elif game == "rush":
        out = _rush_action(pack, state, action)
    elif game == "varna-jaal":
        out = _varna_action(pack, state, action)
    elif game == "word-groups":
        out = _wordgroups_action(pack, state, action)
    elif game == "pada-path":
        out = _padapath_action(pack, state, action)
    elif game == "number":
        out = _number_action(pack, state, action)
    else:
        raise PlayError(404, "Unknown game.")

    # Plain JSON columns keep their committed snapshot BY REFERENCE: in-place
    # edits mutate the snapshot itself, so the flush-time comparison sees no
    # change and silently skips the UPDATE. flag_modified forces the column
    # dirty regardless.
    from sqlalchemy.orm.attributes import flag_modified
    session.result = state
    flag_modified(session, "result")
    db.commit()
    return out


def _fresh_state(game: str, pack: dict) -> dict:
    st: dict = {"actions": []}
    if game == "smriti":
        st["found_pairs"] = []
        st["attempts"] = 0
        st["reveals"] = {}
    elif game == "rush":
        st["answers"] = [None] * len(pack.get("questions", []))
        st["received_ms"] = [None] * len(pack.get("questions", []))
    elif game == "varna-jaal":
        st["found"] = []
    elif game == "word-groups":
        st["solved_groups"] = []
        st["wrong"] = 0
        st["locked"] = []
    elif game == "pada-path":
        st["scores"] = {}
        st["details"] = {}
    elif game == "number":
        st["prompt_scores"] = {}
        st["prompt_results"] = {}
    return st


# ── per-game action handlers ────────────────────────────────────────────────


def _smriti_action(pack: dict, state: dict, action: dict) -> dict:
    """Server-authorised reveals and flip limits: the client never receives
    the hidden deck up front (ranked/live); casual local play may, but the
    API path is the same."""
    typ = action.get("type", "reveal")
    if typ == "reveal":
        card_id = int(action.get("card", -1))
        # Flip limits: at most two unrevealed cards may be open at once, so a
        # rogue client cannot walk the hidden deck (ranked/live play).
        open_now = [c for c, seen in state["reveals"].items() if not seen.get("settled")]
        if str(card_id) not in state["reveals"] and len(open_now) >= 2:
            raise PlayError(429, "Two cards are already open.")
        face = packs.smriti_reveal(pack, card_id)
        state["reveals"][str(card_id)] = {"settled": False}
        return {"reveal": face}
    if typ == "attempt":
        a, b = int(action.get("a", -1)), int(action.get("b", -1))
        cards = pack["cards"]
        if not (0 <= a < len(cards) and 0 <= b < len(cards)) or a == b:
            raise PlayError(422, "Bad attempt.")
        state["attempts"] += 1
        for cid in (str(a), str(b)):
            if cid in state["reveals"]:
                state["reveals"][cid]["settled"] = True
        ca, cb = cards[a], cards[b]
        match = ca["pair"] == cb["pair"]
        if match and ca["pair"] not in state["found_pairs"]:
            state["found_pairs"].append(ca["pair"])
        complete = len(state["found_pairs"]) >= pack["pairs"]
        return {"match": match, "found": len(state["found_pairs"]),
                "pairs": pack["pairs"], "complete": complete,
                "attempts": state["attempts"]}
    raise PlayError(422, "Unknown smriti action.")


def _rush_action(pack: dict, state: dict, action: dict) -> dict:
    idx = int(action.get("index", -1))
    qs = pack.get("questions", [])
    if not (0 <= idx < len(qs)):
        raise PlayError(422, "Bad question index.")
    if state["answers"][idx] is not None:
        return {"already": True, "correct": state["answers"][idx]}
    choice = action.get("choice", "")
    q = qs[idx]
    correct = choice == q["correct_value"]
    state["answers"][idx] = correct
    state["received_ms"][idx] = max(0, int(action.get("elapsed_ms", 10**9)))
    # After the round the correct option is revealed; during play only the
    # correctness flag leaves the server.
    return {"correct": correct}


def _varna_action(pack: dict, state: dict, action: dict) -> dict:
    """Path submission: checked against the key. Repeat finds return
    already-found without awarding anything again (no points spam). The
    client view hides word identities, so a hit returns the word's index in
    the required list — enough to cross off the clue, never enough to cheat."""
    cells = list(action.get("cells", []))
    spelled = _spelled_cells(pack, cells)
    hit = None
    for w in pack["words"]:
        if w["sa"] == spelled:
            hit = w
            break
    if hit is None:
        return {"found": False}
    if hit["id"] in state["found"]:
        return {"found": True, "already": True}
    state["found"].append(hit["id"])
    complete = len(state["found"]) >= len(pack["words"])
    index = next((i for i, w in enumerate(pack["words"]) if w["id"] == hit["id"]), None)
    return {"found": True, "index": index,
            "found_count": len(state["found"]), "required": len(pack["words"]),
            "complete": complete}


def _spelled_cells(pack: dict, cells: list[int]) -> str:
    """Concatenate aksharas at the submitted cell indices."""
    grid = pack["cells"]
    out = []
    for c in cells:
        if not isinstance(c, int) or c < 0 or c >= len(grid):
            return "\u0000"
        out.append(grid[c])
    return "".join(out)


def _wordgroups_action(pack: dict, state: dict, action: dict) -> dict:
    if action.get("type") != "submit_group":
        raise PlayError(422, "Unknown word-groups action.")
    tile_ids = list(action.get("tiles", []))
    if len(tile_ids) != pack["group_size"]:
        raise PlayError(422, "Wrong group size.")
    key = pack["key"]
    groups = set()
    for t in tile_ids:
        info = key.get(t)
        if info is None:
            raise PlayError(422, "Unknown tile.")
        groups.add(info["group"])
    # a solved group locks: resubmitting any of its tiles is refused softly
    for t in tile_ids:
        g = key[t]["group"]
        if g in state["solved_groups"]:
            return {"accepted": False, "locked": True,
                    "mistakes_left": pack["max_wrong"] - state["wrong"]}
    if len(groups) != 1:
        state["wrong"] += 1
        over = state["wrong"] >= pack["max_wrong"]
        return {"accepted": False, "over": over,
                "mistakes_left": max(0, pack["max_wrong"] - state["wrong"])}
    g = groups.pop()
    state["solved_groups"].append(g)
    members = [t for t, info in key.items() if info["group"] == g]
    label = key[members[0]]["label"]
    explanation = key[members[0]].get("explanation", "")
    state["locked"].append({"group": g, "tiles": members, "label": label})
    complete = len(state["solved_groups"]) >= pack["groups_total"]
    over = state["wrong"] >= pack["max_wrong"]
    return {"accepted": True, "label": label, "explanation": explanation,
            "tiles": members, "solved": len(state["solved_groups"]),
            "groups_total": pack["groups_total"], "complete": complete,
            "over": over, "mistakes_left": max(0, pack["max_wrong"] - state["wrong"])}


def _padapath_action(pack: dict, state: dict, action: dict) -> dict:
    idx = int(action.get("index", -1))
    prompts = pack.get("prompts", [])
    if not (0 <= idx < len(prompts)):
        raise PlayError(422, "Bad prompt index.")
    if str(idx) in state["scores"]:
        return {"already": True, **state["details"][str(idx)]}
    order = list(action.get("order", []))
    result = packs.pada_path_score(prompts[idx], order)
    state["scores"][str(idx)] = int(result["score"])
    state["details"][str(idx)] = {"accepted": result["accepted"], "kind": result["kind"],
                                  "detail": result["detail"]}
    return {"score": result["score"], "accepted": result["accepted"],
            "detail": result["detail"],
            "meaning": prompts[idx].get("meaning", ""),
            "explanation": prompts[idx].get("explanation", ""),
            "correct_reading": _padapath_reading(prompts[idx])}


def _padapath_reading(prompt: dict) -> str:
    if prompt["type"] == "quotation":
        tiles = {t["id"]: t["sa"] for t in prompt["tiles"]}
        canonical = prompt.get("canonical_order") or list(tiles.keys())
        return " ".join(tiles[t] for t in canonical)
    # sentences: canonical is the accepted order whose ids are w0..wn in
    # word-list order
    tiles = {t["id"]: t["sa"] for t in prompt["tiles"]}
    acc = (prompt.get("accepted_orders") or [])
    if acc:
        return " ".join(tiles[t] for t in acc[0])
    tiles_in_id_order = [tiles[f"w{i}"] for i in range(len(tiles))]
    return " ".join(tiles_in_id_order)


def _number_action(pack: dict, state: dict, action: dict) -> dict:
    """Submit once to lock a ranked answer; component breakdown returns after
    submission. Blank submissions score 0 (still locked)."""
    from app.services.numerals.scoring import NumberKey, score_prompt

    idx = int(action.get("index", -1))
    prompts = pack.get("prompts", [])
    if not (0 <= idx < len(prompts)):
        raise PlayError(422, "Bad prompt index.")
    if str(idx) in state["prompt_scores"]:
        return {"already": True, **state["prompt_results"][str(idx)]}
    selections = action.get("selections", {})
    if not isinstance(selections, dict):
        raise PlayError(422, "Selections must map slot ids to semantic ids.")
    p = prompts[idx]
    key = NumberKey(canonical=p["canonical"], lang=pack["answer_lang"],
                    grouping=pack["grouping"], include_sign=False)
    try:
        scored = score_prompt(key, {str(k): str(v) for k, v in selections.items()})
    except Exception as e:  # malformed selections: score 0, tell the client
        logger.info("number selection rejected: %s", e)
        scored = None
    if scored is None:
        state["prompt_scores"][str(idx)] = 0
        state["prompt_results"][str(idx)] = {"error": "invalid selections"}
        return {"score": 0, "error": "invalid selections"}
    state["prompt_scores"][str(idx)] = int(scored.score)
    state["prompt_results"][str(idx)] = {
        "c": scored.c, "s": scored.s, "l": scored.l,
        "evidence": scored.evidence, "parse_ok": scored.parse_ok,
    }
    v = p["canonical"]
    from app.services.numerals.render import render_phrase
    assembled = render_phrase(pack["answer_lang"], {str(k): str(v2) for k, v2 in selections.items()},
                              p["skeleton_key"])
    return {"score": int(scored.score), "c": scored.c, "s": scored.s, "l": scored.l,
            "evidence": scored.evidence,
            "assembled": assembled,
            "reading": p["reading"], "alternative": p["alternative"],
            "display_international": p["display_international"],
            "display_indian": p["display_indian"]}


# ── finish / abandon / hint ─────────────────────────────────────────────────


def mark_hint(db: Session, learner, session: GameSession) -> dict:
    if session.learner_id != learner.id:
        raise PlayError(403, "Not your session.")
    if session.status != "active":
        raise PlayError(409, "Session already closed.")
    session.status = "practice"
    session.hints_used += 1
    db.commit()
    return {"status": "practice", "ranked": False}


def finish_session(db: Session, learner, session: GameSession, *,
                   metrics_override: dict | None = None,
                   outcome: str = "finish") -> dict:
    """Validate, score from server metrics, and commit the day aggregates in
    one transaction. Idempotent: a repeat finish returns the stored result."""
    if session.learner_id != learner.id:
        raise PlayError(403, "Not your session.")
    if session.status == "finished":
        return _finish_payload(db, learner, session, repeat=True)
    if session.status in ("void", "abandoned"):
        raise PlayError(409, "Session already closed without a score.")
    if session.status == "practice" or session.mode != "ranked":
        ranked = False
    else:
        ranked = True

    now = _utcnow()
    if outcome == "finish" and session.deadline and now > session.deadline + timedelta(seconds=GRACE_SUBMIT_SECONDS):
        # No indefinite carryover: too late is void, never a fabricated score.
        session.status = "void"
        session.result = {"void_reason": "late_submission"}
        db.commit()
        raise PlayError(410, "Submission window closed; the round was voided.")

    game = session.game
    state = session.result if isinstance(session.result, dict) else _fresh_state(game, session.pack)
    metrics = _metrics_for(game, session.pack, state, metrics_override or {})
    try:
        scored = rubrics.score_for(game, metrics)
    except (KeyError, ValueError) as e:
        logger.warning("scoring metrics invalid for %s: %s", game, e)
        session.status = "void"
        session.result = {"void_reason": "invalid_metrics"}
        db.commit()
        raise PlayError(422, "Round could not be validated; it was voided.")

    session.score = scored.score
    session.result = {"metrics": metrics, "breakdown": scored.breakdown,
                      "rubric": rubrics.RUBRIC_VERSION, "ranked": ranked}
    session.status = "finished"
    session.finished_at = now

    if ranked:
        _write_day_aggregates(db, learner, game, scored.score, now)
    db.commit()
    return _finish_payload(db, learner, session)


def _metrics_for(game: str, pack: dict, state: dict, override: dict) -> dict:
    """Build rubric metrics from server-held state. `override` only supplies
    elapsed timing from the client clock where rubrics allow it — never
    correctness."""
    if game == "smriti":
        return {"pairs": pack["pairs"], "attempts": state.get("attempts", 0),
                "found": len(state.get("found_pairs", []))}
    if game == "rush":
        answers = []
        for i, correct in enumerate(state.get("answers", [])):
            if correct is None:
                answers.append({"correct": False, "elapsed_ms": 10**9})
            else:
                answers.append({"correct": bool(correct),
                                "elapsed_ms": (state.get("received_ms") or [])[i] or 10**9})
        return {"answers": answers, "window_ms": pack.get("window_ms", 12000)}
    if game == "varna-jaal":
        found = len(state.get("found", []))
        required = len(pack.get("words", []))
        all_found = required > 0 and found >= required
        return {"required": required, "found": found, "all_found": all_found,
                "window_ms": int(override.get("window_ms", 300000)),
                "elapsed_ms": max(0, int(override.get("elapsed_ms", 10**9)))}
    if game == "word-groups":
        return {"groups_total": pack["groups_total"],
                "solved": len(state.get("solved_groups", [])),
                "wrong": state.get("wrong", 0)}
    if game == "pada-path":
        scores = state.get("scores", {})
        total = len(pack.get("prompts", []))
        # Equally weighted prompts: unanswered ones score 0, they never drop
        # out of the mean.
        return {"prompt_scores": [int(scores.get(str(i), 0)) for i in range(total)]}
    if game == "number":
        scores = state.get("prompt_scores", {})
        total = len(pack.get("prompts", []))
        return {"prompt_scores": [int(scores.get(str(i), 0)) for i in range(total)]}
    raise ValueError(game)


def _write_day_aggregates(db: Session, learner, game: str, score: int, now: datetime) -> None:
    day = ist_day()
    cell = _day_cell(db, learner.id, game, day)
    cell.best_score = max(int(cell.best_score or 0), int(score))
    cell.updated_at = now
    # Recompute the combined daily aggregate for this learner/day in the same
    # transaction (top three distinct games, max 3000).
    cells = (db.query(GameDayScore)
             .filter(GameDayScore.learner_id == learner.id, GameDayScore.day == day)
             .all())
    ranked_cells = sorted(((c.game, int(c.best_score or 0)) for c in cells),
                          key=lambda t: -t[1])
    top = ranked_cells[:TOP_GAMES_COUNT]
    total = min(3000, sum(s for _, s in top))
    rounds = (db.query(GameSession)
              .filter(GameSession.learner_id == learner.id,
                      GameSession.status == "finished",
                      GameSession.allocation_day == day)
              .count())
    row = (db.query(DailyGamePoints)
           .filter(DailyGamePoints.learner_id == learner.id, DailyGamePoints.day == day)
           .first())
    if row is None:
        row = DailyGamePoints(learner_id=learner.id, day=day)
        db.add(row)
    row.total = total
    row.games = [{"game": g, "score": s} for g, s in top]
    row.rounds_done = rounds
    row.computed_at = now


def _finish_payload(db: Session, learner, session: GameSession, repeat: bool = False) -> dict:
    day = ist_day()
    cell = (db.query(GameDayScore)
            .filter(GameDayScore.learner_id == learner.id, GameDayScore.day == day,
                    GameDayScore.game == session.game)
            .first())
    daily = (db.query(DailyGamePoints)
             .filter(DailyGamePoints.learner_id == learner.id, DailyGamePoints.day == day)
             .first())
    result = session.result or {}
    return {
        "session_id": session.id,
        "game": session.game,
        "score": session.score or 0,
        "ranked": bool(result.get("ranked")),
        "ranked_eligible": bool(result.get("ranked")),
        "eligibility_reason": "" if result.get("ranked") else
        ("converted to practice" if session.hints_used else "casual round — did not change rank"),
        "rubric": result.get("rubric", rubrics.RUBRIC_VERSION),
        "breakdown": result.get("breakdown", {}),
        "best_today": int(cell.best_score or 0) if cell else (session.score or 0),
        "attempts_left": _allocations_left(db, learner.id, session.game, day),
        "daily_total": int(daily.total or 0) if daily else 0,
        "daily_games": daily.games if daily else [],
        "goal_rounds_done": int(daily.rounds_done or 0) if daily else 0,
        "repeat": repeat,
    }


def abandon_session(db: Session, learner, session: GameSession, *, server_failure: bool = False) -> dict:
    if session.learner_id != learner.id:
        raise PlayError(403, "Not your session.")
    if session.status in ("finished", "void", "abandoned"):
        return {"status": session.status}
    now = _utcnow()
    if server_failure:
        # Verified server failures release the allocation — the attempt never
        # happened from the ranking's point of view.
        session.status = "void"
        if session.mode == "ranked" and session.allocation_day:
            cell = (db.query(GameDayScore)
                    .filter(GameDayScore.learner_id == learner.id,
                            GameDayScore.day == session.allocation_day,
                            GameDayScore.game == session.game)
                    .first())
            if cell is not None and cell.attempts_used > 0:
                cell.attempts_used -= 1
        session.result = {"void_reason": "server_failure"}
    else:
        deadline = session.deadline or now
        if now < deadline:
            # A client abandon inside the deadline does not consume anything
            # yet; the session just closes unscored.
            session.status = "abandoned"
            session.result = {"void_reason": "abandoned_before_deadline"}
        else:
            session.status = "abandoned"
            session.result = {"void_reason": "abandoned_after_timeout"}
    db.commit()
    return {"status": session.status}
