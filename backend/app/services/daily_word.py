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

Two ways to play, one puzzle:
- ``codepoint`` (the original): the learner types Devanagari and every Unicode
  code point is a tile. पुस्तक is six tiles (प ु स ् त क), including a lone
  vowel sign and a virama, and the learner must type all six.
- ``akshara``: the unit is the AKṢARA, the letter as it is written and read.
  पुस्तक is three (पु स्त क). The client shows a bank of whole akṣaras to tap
  (``bank`` in the puzzle), so nobody has to type Devanagari, and tiles never
  hold a lone vowel sign. Scoring compares akṣaras; a near miss is a first
  consonant one step away on the mouth-map (क→ग) or a vowel that differs only in
  length (कि→की).

Both modes share one game per learner-day; ``mode`` only says how a guess is
segmented and scored.
"""

from __future__ import annotations

import logging
import random
import re
from datetime import date, timedelta

from sqlalchemy.orm import Session

from app.models import DailyWord, DailyWordPlay
from app.services.localtime import local_date
from app.services.varna_distance import _GRID, _build, distance_on_grid

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


# ─── Akṣaras ──────────────────────────────────────────────────────────────
#
# An akṣara is a consonant cluster plus the vowel written on it (पु, स्त, द्या),
# a lone vowel letter (अ, आ), each with an optional anusvāra / visarga /
# candrabindu (सं, अः). Written with \u escapes on purpose: these ranges are
# invisible combining marks, and a source file that shows them as glyphs is
# where segmentation bugs hide.
#
#   _C       a consonant (क–ह and the precomposed nukta letters), optional nukta
#   VIRAMA   ् (U+094D) joins a consonant to the next: क्ष = क + ् + ष
#   signs    ा–ौ (U+093E–U+094C) and the vocalic ॢ ॣ
#   marks    ँ ं ः (U+0901–U+0903)
_C = "[क-हक़-य़]़?"
_AKSHARA = re.compile(
    "(?:" + _C + "्)*" + _C + "[ा-ौॢॣ]?[ँ-ः]?"  # conjunct + vowel sign
    "|[अ-औॠॡ][ँ-ः]?"                                   # a vowel letter
    "|(?:" + _C + "्)+$"                                                        # a final half letter
)
_STARTS_WITH_CONSONANT = re.compile("^(" + _C + ")")


def aksharas(word: str) -> list[str]:
    """Split Devanagari into akṣaras: पुस्तक → [पु, स्त, क].

    The pieces always join back to the input. Text the pattern does not cover
    (avagraha ऽ, oṃ ॐ, digits) falls back to code points, so this never drops
    or invents a character.
    """
    text = word or ""
    parts = _AKSHARA.findall(text)
    if "".join(parts) != text:
        return list(text)
    return parts


# Short/long pairs. Two akṣaras are "the same but for length" when they match
# once every long vowel is folded to its short one.
_LONG_TO_SHORT = {
    "ा": "",        # ा  (a long ā sign; the short a has no sign)
    "ी": "ि",  # ी → ि
    "ू": "ु",  # ू → ु
    "ॄ": "ृ",  # ॄ → ृ
    "ॣ": "ॢ",  # ॣ → ॢ
    "आ": "अ",  # आ → अ
    "ई": "इ",  # ई → इ
    "ऊ": "उ",  # ऊ → उ
    "ॠ": "ऋ",  # ॠ → ऋ
    "ॡ": "ऌ",  # ॡ → ऌ
}


def _fold_length(ak: str) -> str:
    return "".join(_LONG_TO_SHORT.get(ch, ch) for ch in ak)


def _split_akshara(ak: str) -> tuple[str, str]:
    """(first consonant, the rest). A lone vowel letter has no first consonant."""
    m = _STARTS_WITH_CONSONANT.match(ak)
    if not m:
        return "", ak
    return m.group(1), ak[m.end():]


def _akshara_near(guess: str, answer: str) -> str | None:
    """The axis on which `guess` is one step from `answer`, or None if it is not.

    ``length``: they differ only in vowel length. Otherwise the first
    consonants must be one step apart on the mouth-map and everything after
    them identical (so कि is near गि, not near गु).
    """
    if guess == answer:
        return None
    if _fold_length(guess) == _fold_length(answer):
        return "length"
    gh, gt = _split_akshara(guess)
    ah, at = _split_akshara(answer)
    if gh and ah and gt == at and gh != ah:
        dist = distance_on_grid(gh, ah)
        axis = dist.get("axis")
        if axis and 0 <= dist.get("distance", -1) <= _NEAR_MAX_DISTANCE:
            return axis
    return None


def _akshara_tiles(guess: list[str], answer: list[str]) -> list[dict]:
    """Score a guess akṣara by akṣara.

    Two passes so a repeated letter is not over-credited: exact matches first
    (and they use up their letter), then `present` for a letter that is in the
    word elsewhere, then `near`, else `absent`.
    """
    tiles: list[dict | None] = [None] * len(guess)
    remaining: dict[str, int] = {}
    for i, a in enumerate(answer):
        if i < len(guess) and guess[i] == a:
            continue
        remaining[a] = remaining.get(a, 0) + 1

    for i, g in enumerate(guess):
        if i < len(answer) and g == answer[i]:
            tiles[i] = {"character": g, "state": STATE_EXACT, "axis": None}

    for i, g in enumerate(guess):
        if tiles[i] is not None:
            continue
        if remaining.get(g, 0) > 0:
            remaining[g] -= 1
            tiles[i] = {"character": g, "state": STATE_PRESENT, "axis": None}
            continue
        axis = _akshara_near(g, answer[i]) if i < len(answer) else None
        if axis:
            tiles[i] = {"character": g, "state": STATE_NEAR, "axis": axis}
        else:
            tiles[i] = {"character": g, "state": STATE_ABSENT, "axis": None}
    return [t for t in tiles if t is not None]


# ─── The bank ─────────────────────────────────────────────────────────────

BANK_MIN = 6
BANK_MAX = 10
# Common akṣaras, used to pad the bank of a short word out to BANK_MIN.
_FILLER = ["क", "म", "त", "न", "र", "ल", "स", "प", "द", "ग", "व", "य", "ज", "ब", "ह", "ता", "रा"]
_OTHER_CONSONANTS = list("यरलवशषसह")


_SHORT_TO_LONG = {short: long_ for long_, short in _LONG_TO_SHORT.items() if short}


def _lengthen(ak: str) -> list[str]:
    """The same akṣara with a long vowel in place of its short one (कि → की,
    क → का, अ → आ). Empty when there is no short vowel to lengthen."""
    if not ak:
        return []
    last = ak[-1]
    if last in _SHORT_TO_LONG:
        return [ak[:-1] + _SHORT_TO_LONG[last]]
    if re.search(_C + "$", ak):  # ends on a consonant: it carries the short a
        return [ak + "ा"]
    return []


def _distractor(ak: str, rnd: random.Random) -> str | None:
    """A plausible wrong tile for `ak`: a near miss, not a random letter.

    Prefer the same akṣara with its vowel length flipped (कि ↔ की); otherwise
    swap the first consonant for a neighbour on the mouth-map (क → ग, ख).
    Returns None when there is nothing sensible to offer.
    """
    _build()
    options: list[str] = []

    # 1. flip the vowel length
    folded = _fold_length(ak)
    options.extend([folded] if folded != ak else _lengthen(ak))

    # 2. the first consonant one step away on the grid
    head, tail = _split_akshara(ak)
    if head in _GRID:
        same_place: list[str] = []
        other_place: list[str] = []
        for other in _GRID:
            if other == head:
                continue
            d = distance_on_grid(head, other)
            if d.get("distance") != 1:
                continue
            (same_place if d.get("axis") in ("voicing", "aspiration") else other_place).append(other)
        options.extend(o + tail for o in (same_place or other_place))
    elif head in _OTHER_CONSONANTS:
        options.extend(o + tail for o in _OTHER_CONSONANTS if o != head)

    options = [o for o in dict.fromkeys(options) if o and o != ak]
    return rnd.choice(options) if options else None


def build_bank(answer: str, day: str) -> list[str]:
    """The akṣaras offered to tap for a day's word: every one it needs (with
    repeats) plus a near-miss distractor for each, 6 to 10 in all.

    Deterministic per (day, answer): every learner on a date sees the same
    bank, in the same order, and it does not change between requests.
    """
    rnd = random.Random(f"{day}|{answer}")
    needed = aksharas(answer)
    bank = list(needed)
    taken = set(needed)

    for ak in dict.fromkeys(needed):  # one distractor per distinct akṣara
        if len(bank) >= BANK_MAX:
            break
        d = _distractor(ak, rnd)
        if d and d not in taken:
            bank.append(d)
            taken.add(d)

    fillers = [f for f in _FILLER if f not in taken]
    rnd.shuffle(fillers)
    while len(bank) < BANK_MIN and fillers:
        bank.append(fillers.pop())

    rnd.shuffle(bank)
    return bank


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

    ``word_length`` (code points, for the typing client) and ``letters`` (the
    akṣara count, for the tapping client) are safe to expose, and so is
    ``bank``: it holds the word's own akṣaras among near-miss distractors, so
    it does not say which is which. The answer itself is withheld until the game
    ends (P12-2.3); once it has, it comes back as ``revealed`` so a learner who
    returns to a finished day sees it.
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
            "letters": 0,
            "bank": [],
            "status": "no_word",
        }

    solves = _solved_streak(db, learner)
    finished = bool(play and play.finished)
    return {
        "date": day,
        "available": True,
        "solved": bool(play and play.solved),
        "finished": finished,
        "guesses_used": play.guess_count if play else 0,
        "max_guesses": MAX_GUESSES,
        "word_length": len(word.answer),
        "letters": len(aksharas(word.answer)),
        "bank": build_bank(word.answer, day),
        "clue": word.clue or "",
        "streak": solves,
        "status": "solved" if (play and play.solved) else ("finished" if finished else "open"),
        # The answer is revealed only once the game has ended (P12-2.3).
        "revealed": {"answer": word.answer, "answer_iast": word.answer_iast or ""} if finished else None,
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


def guess(
    learner,
    db: Session,
    submitted: str,
    mode: str = "codepoint",
    letters: list[str] | None = None,
) -> dict:
    """Submit a guess for today's word.

    Returns per-position state + axis (never the answer while open). Refuses
    (``status="refused"``) when the game is already solved/finished — no
    replay — and when the guess length does not match the word (refused rather
    than silently re-scored, per P12-2.3).

    ``mode="akshara"`` scores whole akṣaras. ``letters`` is the guess already
    split into them (what the tapping client sends, so no re-segmentation can
    merge two tiles into a conjunct); without it the string is segmented here.
    Any other mode is the original code-point scoring, unchanged.
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
    akshara_mode = mode == "akshara"
    answer_letters = aksharas(word.answer)
    given: list[str] = []
    if akshara_mode:
        given = [l.strip()[:12] for l in (letters or []) if l and l.strip()] or aksharas(submitted)
        valid = len(given) == len(answer_letters)
    else:
        valid = bool(submitted) and len(submitted) == len(word.answer)
    if not valid:
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

    tiles = _akshara_tiles(given, answer_letters) if akshara_mode else _guess_tiles(submitted, word.answer)
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

    # Real practice for the goal bar + calendar: a solved word is worth a
    # challenge-correct; any other valid guess is small engagement XP.
    from app.services.activity import record_activity
    record_activity(db, learner, xp=10 if is_correct else 2, attempts=1)
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