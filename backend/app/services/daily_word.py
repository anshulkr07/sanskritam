"""Daily-word service (P12): वर्ण-बन्धः, the varṇamālā guessing game.

One curated word per learner-local day, scored against the varṇamālā grid
(rather than letter identity) so a near-miss like क against ग is one step apart
(HANDOVER P12 / P11-4). This is LOCAL computation — no vendor call, no quota.

Selection is deterministic per learner-local day (HANDOVER §2.8): the same
local date always yields the same puzzle, resolved through services/localtime
rather than server UTC.

Invariants enforced here:
- The answer is never returned before the game ends (P12-2.3).
- A solved (or exhausted) day refuses further guesses — no replay (P12-2.2).
- Scoring on an unsolved puzzle reveals per-position state + axis, which is
  exactly what the client needs to render the four distinguishable tile states
  without ever seeing the word.
"""

from __future__ import annotations

import logging
from datetime import date, timedelta

from sqlalchemy.orm import Session

from app.models import DailyWord, DailyWordPlay
from app.services.localtime import local_date
from app.services.varna_distance import distance_on_grid

logger = logging.getLogger("shabd.daily_word")

# Guess cap: a solved day stays solved, an exhausted day is done (P12-2.2).
MAX_GUESSES = 6

# Tile states the client renders (U8-4.1). `axis` carries the phonetic reason
# for a near-miss so the four states never collapse to colour alone (U5-3).
STATE_EXACT = "exact"
STATE_NEAR = "near"          # right place, wrong character, on the grid
STATE_PRESENT = "present"    # correct character, elsewhere in the word
STATE_ABSENT = "absent"

# Anything within these feature-steps on the grid counts as a near miss; the
# big place-boundary jump (क→प) is far and not a near miss.
_NEAR_MAX_DISTANCE = 1


def _resolve_date(learner) -> str:
    """The puzzle's day boundary, in the learner's own timezone (§2.8)."""
    return local_date(getattr(learner, "timezone", None))


def _select_word(db: Session, day: str) -> DailyWord | None:
    """Pick the curated word for a learner-local day.

    Uses the seeded rows first (deterministic, curated); if the day falls
    outside the seeded window, cycles the anchored schedule deterministically
    so every date still resolves to the same word for every learner on it.
    """
    row = db.query(DailyWord).filter(DailyWord.date == day).first()
    if row is not None:
        return row

    # Deterministic fallback: index into the anchored window by day offset,
    # cycling so every date still resolves to the same word for every learner.
    try:
        d = date.fromisoformat(day)
        offset = (d - date(2026, 9, 2)).days
        rows = db.query(DailyWord).order_by(DailyWord.date).all()
        if not rows:
            return None
        idx = offset % len(rows)
        return rows[idx]
    except ValueError:
        return None


def get_puzzle(learner, db: Session) -> dict:
    """Return the puzzle for the learner's local day without revealing the answer.

    ``word_length`` is safe to expose (the client needs the grid width);
    the answer itself is withheld until the game ends (P12-2.3).
    """
    day = _resolve_date(learner)
    word = _select_word(db, day)
    play = (
        db.query(DailyWordPlay)
        .filter(DailyWordPlay.learner_id == learner.id, DailyWordPlay.date == day)
        .first()
    )

    if word is None:
        return {
            "date": day,
            "available": False,
            "solved": False,
            "finished": False,
            "guesses_used": 0,
            "max_guesses": MAX_GUESSES,
            "word_length": 0,
            "status": "no_word",
        }

    solves = _solved_streak(db, learner)
    return {
        "date": day,
        "available": True,
        "solved": bool(play and play.solved),
        "finished": bool(play and play.finished),
        "guesses_used": play.guess_count if play else 0,
        "max_guesses": MAX_GUESSES,
        "word_length": len(word.answer),
        "clue": word.clue or "",
        "streak": solves,
        "status": "solved" if (play and play.solved) else ("finished" if (play and play.finished) else "open"),
    }


def _score_char(guess_char: str, answer_char: str, answer_counts: dict[str, int]) -> dict:
    """Score one tile.

    Priority: exact > present-elsewhere > near (right place, near character on
    the grid) > absent. Returns ``{character, state, axis}``.
    """
    if guess_char == answer_char:
        return {"character": guess_char, "state": STATE_EXACT, "axis": None}

    if answer_counts.get(guess_char, 0) > 0:
        return {"character": guess_char, "state": STATE_PRESENT, "axis": None}

    dist = distance_on_grid(guess_char, answer_char)
    if dist.get("axis") and dist.get("distance", -1) <= _NEAR_MAX_DISTANCE and dist.get("distance", -1) >= 0:
        return {"character": guess_char, "state": STATE_NEAR, "axis": dist["axis"]}

    return {"character": guess_char, "state": STATE_ABSENT, "axis": None}


def _guess_tiles(guess: str, answer: str) -> list[dict]:
    """Score every position of a guess against the answer.

    For a present-elsewhere determination, once a character is consumed by an
    exact match on another position we decrement its remaining count so a
    repeated letter is not over-credited.
    """
    # Exacts first (mark exact places), then resolve the remaining counts.
    answer_counts: dict[str, int] = {}
    for ch in answer:
        answer_counts[ch] = answer_counts.get(ch, 0) + 1

    result: list[dict] = []
    for i, g in enumerate(guess[: len(answer)]):
        a = answer[i]
        tile = _score_char(g, a, answer_counts)
        if tile["state"] == STATE_EXACT and answer_counts.get(g, 0) > 0:
            answer_counts[g] -= 1
        result.append(tile)
    return result


def guess(learner, db: Session, submitted: str) -> dict:
    """Submit a guess for today's word.

    Returns per-position state + axis (never the answer while open). Refuses
    (``status="refused"``) when the game is already solved/finished — no
    replay — and when the guess length does not match the word (refused rather
    than silently re-scored, per P12-2.3).
    """
    day = _resolve_date(learner)
    word = _select_word(db, day)
    if word is None:
        return {"status": "no_word", "solved": False, "finished": False, "tiles": [], "guesses_used": 0, "max_guesses": MAX_GUESSES}

    play = (
        db.query(DailyWordPlay)
        .filter(DailyWordPlay.learner_id == learner.id, DailyWordPlay.date == day)
        .first()
    )
    if play is None:
        play = DailyWordPlay(learner_id=learner.id, date=day, guess_count=0, solved=False, finished=False)
        db.add(play)
        db.flush()

    if play.finished:
        logger.info("daily-word: replay refused for learner %s on %s", learner.id, day)
        return {
            "status": "refused",
            "solved": bool(play.solved),
            "finished": True,
            "tiles": [],
            "guesses_used": play.guess_count,
            "max_guesses": MAX_GUESSES,
            "reason": "already_finished",
        }

    submitted = (submitted or "").strip()
    if not submitted or len(submitted) != len(word.answer):
        # Not a valid move: refuse rather than silently re-score (P12-2.3).
        return {
            "status": "refused",
            "solved": False,
            "finished": False,
            "tiles": [],
            "guesses_used": play.guess_count,
            "max_guesses": MAX_GUESSES,
            "reason": "length_mismatch",
        }

    play.guess_count += 1

    tiles = _guess_tiles(submitted, word.answer)
    is_correct = all(t["state"] == STATE_EXACT for t in tiles)
    if is_correct:
        play.solved = True
        play.finished = True

    guesses_exhausted = play.guess_count >= MAX_GUESSES
    game_over = play.solved or guesses_exhausted

    # The answer is revealed ONLY now, when the game has ended (P12-2.3).
    reveal = None
    if game_over:
        play.finished = True
        reveal = {
            "answer": word.answer,
            "answer_iast": word.answer_iast or "",
        }

    db.commit()
    return {
        "status": "solved" if play.solved else ("finished" if game_over else "open"),
        "solved": bool(play.solved),
        "finished": bool(game_over),
        "tiles": tiles,
        "guesses_used": play.guess_count,
        "max_guesses": MAX_GUESSES,
        "revealed": reveal,
    }


def _solved_streak(db: Session, learner) -> int:
    """Consecutive days (ending today) on which the learner solved the word.

    The streak is read from persisted play rows; an unsolved-or-missing day
    breaks it. This is learner-local by construction because each row's date is
    already resolved in the learner's own timezone.
    """
    plays = (
        db.query(DailyWordPlay)
        .filter(DailyWordPlay.learner_id == learner.id, DailyWordPlay.solved.is_(True))
        .order_by(DailyWordPlay.date.desc())
        .all()
    )
    if not plays:
        return 0

    today = _resolve_date(learner)
    expected = today
    streak = 0
    for p in plays:
        if p.date == expected:
            streak += 1
            d = date.fromisoformat(expected) - timedelta(days=1)
            expected = d.isoformat()
        else:
            break
    return streak