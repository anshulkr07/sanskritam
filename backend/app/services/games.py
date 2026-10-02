"""Play games backend (HANDOVER 5.7). No vendor calls, no quota.

- deck: word/meaning pairs for Rush and Smriti, letters for Smriti sets.
- varna-jaal: one deterministic 4x4 akshara board per learner-local date.
- pools: params lists for PracticeRound (seeds/game_pools.py).
- daily: rotating challenge with streak, like daily_word._solved_streak.
- result: points via record_activity(), caps 30 per result and 60 per day.
"""

from __future__ import annotations

import logging
import random
from datetime import date, timedelta

from sqlalchemy.orm import Session

from app.models import Learner
from app.services.daily_word import aksharas
from app.services.localtime import local_date

logger = logging.getLogger("shabd.games")

WEEKLY_GAMES = ["rush", "smriti", "varna-jaal", "sandhi", "rush", "smriti", "varna-jaal"]

COMMON_AKSHARAS = [
    "क", "ख", "ग", "घ", "च", "छ", "ज", "ट", "त", "थ", "द", "न",
    "प", "म", "य", "र", "ल", "व", "स", "ह", "अ", "आ", "इ", "उ",
]


def _vocab_items(db: Session) -> list[dict]:
    from app.models import Shloka, VocabWord

    items: list[dict] = []
    seen: set[tuple[str, str]] = set()
    try:
        for w in db.query(VocabWord).all():
            sa = (w.devanagari or "").strip()
            meaning = (w.gloss or "").strip()
            if not sa or not meaning:
                continue
            if len(aksharas(sa)) > 6:
                continue
            key = (sa, meaning)
            if key in seen:
                continue
            seen.add(key)
            try:
                from app.services.iast import to_iast as _to_iast
                iast = _to_iast(sa)
            except Exception:
                iast = ""
            items.append({"sa": sa, "iast": iast, "meaning": meaning, "topic": w.topic or ""})
    except Exception:
        pass
    try:
        for s in db.query(Shloka).all():
            for e in (s.word_breakdown or []):
                sa = str(e.get("word", "") or "").strip()
                meaning = str(e.get("meaning", "") or "").strip()
                if not sa or not meaning:
                    continue
                # Imported verses carry stems in Devanagari here, not glosses;
                # still usable as a pair, deduped and length-capped.
                if len(aksharas(sa)) > 6 or len(aksharas(sa)) < 1:
                    continue
                key = (sa, meaning)
                if key in seen:
                    continue
                seen.add(key)
                try:
                    from app.services.iast import to_iast as _to_iast
                    iast = _to_iast(sa)
                except Exception:
                    iast = ""
                items.append({"sa": sa, "iast": iast, "meaning": meaning, "topic": "shloka"})
    except Exception:
        pass
    return items


def _letters() -> list[dict]:
    try:
        from app.seeds import varnamala as vn
        rows = getattr(vn, "VARNAMALA", None) or getattr(vn, "LETTERS", None) or []
    except Exception:
        rows = []
    out: list[dict] = []
    for r in rows:
        try:
            sa = (r.get("sa") or r.get("devanagari") or "").strip() if isinstance(r, dict) else str(r).strip()
            roman = (r.get("roman") or r.get("iast") or "").strip() if isinstance(r, dict) else ""
            if not sa:
                continue
            out.append({"sa": sa, "iast": roman, "meaning": roman, "topic": "letters"})
        except Exception:
            continue
    if len(out) < 20:
        fallback = ["अ", "आ", "इ", "ई", "उ", "ऊ", "क", "ख", "ग", "घ", "च", "छ", "ज", "ट", "त", "थ", "द", "न", "प", "म", "य", "र", "ल", "व", "स", "ह"]
        for ch in fallback:
            if not any(i["sa"] == ch for i in out):
                out.append({"sa": ch, "iast": ch, "meaning": ch, "topic": "letters"})
    return out


def deck(db: Session, game: str, set_name: str = "", topic: str = "") -> list[dict]:
    """Word/meaning pairs for Rush and Smriti. At least 40 or not offered."""
    if set_name == "letters":
        items = _letters()
    else:
        items = _vocab_items(db)
        if topic:
            items = [i for i in items if i.get("topic") == topic] or items
    # Dedupe meanings for Rush distractors: never two options sharing one.
    seen_meaning: set[str] = set()
    uniq: list[dict] = []
    for i in items:
        m = (i.get("meaning") or "").strip().casefold()
        if m and m in seen_meaning and game == "rush":
            continue
        seen_meaning.add(m)
        uniq.append(i)
    return uniq


def _board_seed(day: date) -> int:
    return int(day.strftime("%Y%m%d"))


def _neighbours(r: int, c: int, size: int = 4) -> list[tuple[int, int]]:
    out = []
    for dr in (-1, 0, 1):
        for dc in (-1, 0, 1):
            if dr == 0 and dc == 0:
                continue
            nr, nc = r + dr, c + dc
            if 0 <= nr < size and 0 <= nc < size:
                out.append((nr, nc))
    return out


def _traceable(cells: list[str], word_aks: list[str], size: int = 4) -> bool:
    def dfs(idx: int, r: int, c: int, used: set[tuple[int, int]]) -> bool:
        if cells[r * size + c] != word_aks[idx]:
            return False
        if idx == len(word_aks) - 1:
            return True
        used.add((r, c))
        for nr, nc in _neighbours(r, c, size):
            if (nr, nc) in used:
                continue
            if dfs(idx + 1, nr, nc, used):
                return True
        used.discard((r, c))
        return False

    for r in range(size):
        for c in range(size):
            if dfs(0, r, c, set()):
                return True
    return False


def varna_jaal(day: date) -> dict:
    """One deterministic 4x4 board for a learner-local date."""
    from app.services.daily_word import aksharas as _aks

    size = 4
    seed = _board_seed(day)
    words: list[dict] = []
    cells: list[str] = [""] * (size * size)
    # Candidate words: short common words, 2 to 4 aksharas.
    candidates = [
        ("रामः", "Rama"), ("सीता", "Sita"), ("फलम्", "fruit"), ("जलम्", "water"),
        ("ग्रामः", "village"), ("देवः", "god"), ("नरः", "man"), ("वनम्", "forest"),
        ("पुस्तकम्", "book"), ("गृहम्", "house"), ("मित्रम्", "friend"), ("धर्मः", "duty"),
    ]
    rng = random.Random(seed)
    picked: list[tuple[str, str, list[str]]] = []
    for sa, meaning in candidates:
        aks = _aks(sa)
        if 2 <= len(aks) <= 4:
            picked.append((sa, meaning, aks))
        if len(picked) >= 6:
            break
    picked = picked[:6] if len(picked) >= 6 else picked

    for attempt_seed in range(seed, seed + 32):
        trial = [""] * (size * size)
        ok_all = True
        rng_try = random.Random(attempt_seed)
        order = list(range(size * size))
        for sa, meaning, aks in picked:
            placed = False
            starts = list(range(size * size))
            rng_try.shuffle(starts)
            for s in starts:
                path = _place_word(trial, aks, s, size, rng_try)
                if path is not None:
                    for idx, pos in enumerate(path):
                        trial[pos] = aks[idx]
                    placed = True
                    break
            if not placed:
                ok_all = False
                break
        if ok_all:
            cells = trial
            break
    else:
        cells = trial

    for i in range(len(cells)):
        if not cells[i]:
            cells[i] = rng.choice(COMMON_AKSHARAS)

    try:
        from app.services.iast import to_iast as _to_iast
    except Exception:
        def _to_iast(s: str) -> str:  # type: ignore
            return ""

    words = [{"aksharas": aks, "sa": sa, "iast": _to_iast(sa), "meaning": meaning} for sa, meaning, aks in picked]
    # Guarantee traceability: keep only traceable words, pad check in tests.
    words = [w for w in words if _traceable(cells, w["aksharas"], size)]
    return {"date": day.isoformat(), "size": size, "cells": cells, "words": words}


def _place_word(cells: list[str], aks: list[str], start: int, size: int, rng: random.Random) -> list[int] | None:
    def dfs(idx: int, pos: int, used: set[int], path: list[int]) -> list[int] | None:
        r, c = pos // size, pos % size
        cur = cells[pos]
        if cur and cur != aks[idx]:
            return None
        used.add(pos)
        path.append(pos)
        if idx == len(aks) - 1:
            return list(path)
        nbs = [(nr * size + nc) for nr, nc in _neighbours(r, c, size) if (nr * size + nc) not in used]
        rng.shuffle(nbs)
        for nb in nbs:
            got = dfs(idx + 1, nb, used, path)
            if got is not None:
                return got
        used.discard(pos)
        path.pop()
        return None

    return dfs(0, start, set(), [])


def daily_info(db: Session, learner: Learner, day: date | None = None) -> dict:
    """Today's challenge: rotating game, goal, done and streak."""
    from app.models import GameResult

    tz = getattr(learner, "timezone", None) or "UTC"
    today_str = local_date(tz)
    today = date.fromisoformat(today_str) if today_str else date.today()
    if day is not None:
        today = day
        today_str = day.isoformat()
    game = WEEKLY_GAMES[today.weekday() % len(WEEKLY_GAMES)]
    goals = {
        "rush": {"type": "score", "value": 300, "label": "Score 300"},
        "smriti": {"type": "moves", "value": 14, "label": "16 cards in 14 moves"},
        "varna-jaal": {"type": "found_all", "value": 1, "label": "Find every word"},
        "sandhi": {"type": "score", "value": 60, "label": "60 of 80"},
    }
    goal = goals.get(game, {"type": "score", "value": 100, "label": "Play"})
    done = (
        db.query(GameResult)
        .filter(GameResult.learner_id == learner.id, GameResult.date == today_str, GameResult.daily.is_(True), GameResult.goal_met.is_(True))
        .first()
        is not None
    )
    streak = 0
    d = today
    while True:
        hit = (
            db.query(GameResult)
            .filter(GameResult.learner_id == learner.id, GameResult.date == d.isoformat(), GameResult.goal_met.is_(True))
            .first()
            is not None
        )
        if not hit:
            break
        streak += 1
        d -= timedelta(days=1)
        if streak > 365:
            break
    return {"date": today_str, "game": game, "goal": goal, "done": done, "streak": streak}


def points_for(game: str, score: int = 0, moves: int = 0, found: int = 0) -> int:
    """Points for one result, capped at 30."""
    if game == "rush":
        pts = max(0, int(score or 0) // 20)
    elif game == "smriti":
        pairs = max(0, 8 - max(0, int(moves or 0) - 8) // 2) if moves else 8
        pts = 10 + pairs
    elif game in ("varna-jaal", "varna_jaal"):
        pts = 5 * max(0, int(found or 0))
    else:
        pts = 3 * max(0, int(score or 0) // 10) if score else 0
        if game in ("reorder", "sandhi_join", "sandhi_split", "grid_fill", "contrast", "scan_metre", "practice"):
            pts = max(pts, 0)
    return max(0, min(30, pts))


def goal_met(game: str, goal: dict, score: int = 0, moves: int = 0, found: int = 0, total: int = 0) -> bool:
    gtype = (goal or {}).get("type", "")
    value = int((goal or {}).get("value", 0) or 0)
    if gtype == "score":
        return int(score or 0) >= value
    if gtype == "moves":
        return bool(moves) and int(moves) <= value
    if gtype == "found_all":
        return total > 0 and int(found or 0) >= total
    return False
