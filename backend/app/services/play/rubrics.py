"""Versioned 0-1000 rubrics for the seven Play games (brief §5).

Each function scores from SERVER-side recorded metrics only — client-reported
totals are never accepted. Raw metrics stay on the session result so the
breakdown can be shown and audited. Rubric version "v1" is frozen for the
first ranked period; changing thresholds means a new version and a period
boundary, never a silent edit.
"""

from __future__ import annotations

from dataclasses import dataclass

from decimal import Decimal, ROUND_HALF_UP

RUBRIC_VERSION = "v1"


def _clamp(v: float, lo: float = 0.0, hi: float = 1000.0) -> int:
    return int(max(lo, min(hi, Decimal(str(v)).quantize(Decimal("1"), rounding=ROUND_HALF_UP))))


@dataclass
class GameScore:
    score: int
    breakdown: dict


def smriti(pairs: int, attempts: int, found: int) -> GameScore:
    """P pairs, M committed two-card attempts, K pairs found:
    600*(K/P) + 400*(K/P)*min(1, K/max(M,1)). Fewer attempts at equal
    completion never produces a worse score."""
    p = max(1, int(pairs))
    k = max(0, min(int(found), p))
    m = max(1, int(attempts))
    completion = k / p
    efficiency = min(1.0, k / m)
    raw = 600 * completion + 400 * completion * efficiency
    return GameScore(_clamp(raw), {"pairs": p, "found": k, "attempts": m,
                                   "completion": round(completion, 4),
                                   "efficiency": round(efficiency, 4)})


def rush(answers: list[dict], window_ms: int) -> GameScore:
    """Mean over the questions of 900*correct + 100*correct*speedFactor.
    speedFactor in [0,1] from server timing: (window - elapsed)/window clamped.
    Wrong/blank receives 0."""
    if not answers:
        return GameScore(0, {"answers": 0})
    total = 0.0
    detail = []
    for a in answers:
        correct = bool(a.get("correct"))
        elapsed = max(0, int(a.get("elapsed_ms", window_ms)))
        speed = max(0.0, min(1.0, (window_ms - elapsed) / window_ms)) if correct else 0.0
        q = (900 + 100 * speed) if correct else 0.0
        total += q
        detail.append({"correct": correct, "speed": round(speed, 4), "points": round(q, 1)})
    mean = total / max(1, len(answers))
    return GameScore(_clamp(mean), {"per_question": detail})


def varna_jaal(required: int, found: int, all_found: bool, window_ms: int, elapsed_ms: int) -> GameScore:
    """900*(found/required), plus 100*speedFactor only when every required
    word was found."""
    req = max(1, int(required))
    got = max(0, min(int(found), req))
    raw = 900 * got / req
    speed = 0.0
    if all_found:
        speed = max(0.0, min(1.0, (window_ms - elapsed_ms) / window_ms))
        raw += 100 * speed
    return GameScore(_clamp(raw), {"required": req, "found": got, "all_found": all_found,
                                   "speed": round(speed, 4)})


DAILY_WORD_GUESS_SCORES = {1: 1000, 2: 900, 3: 800, 4: 700, 5: 600, 6: 500}


def daily_word(guess_count: int, solved: bool, finished: bool) -> GameScore:
    """Solved on guess 1-6 gives 1000..500; unsuccessful gives 0 ranked points
    but still counts as completed participation."""
    if solved:
        return GameScore(DAILY_WORD_GUESS_SCORES.get(int(guess_count), 500), {"guesses": int(guess_count), "solved": True})
    return GameScore(0, {"guesses": int(guess_count), "solved": False, "completed_participation": bool(finished)})


def word_groups(groups_total: int, solved: int, wrong: int) -> GameScore:
    """250*groupsSolved - 25*wrongSubmissions clamped to 0-1000, scaled to the
    board's group count so a beginner 3-group board caps at 750 like any
    casual round; ranked boards are standard (4 groups)."""
    total = max(1, int(groups_total))
    per_group = 1000 / total
    raw = per_group * int(solved) - 25 * int(wrong)
    return GameScore(_clamp(raw), {"groups_total": total, "solved": int(solved), "wrong": int(wrong)})


def pada_path(prompt_scores: list[int]) -> GameScore:
    """Mean prompt correctness (0-100 each) x 10; five equally weighted
    prompts. No speed bonus."""
    if not prompt_scores:
        return GameScore(0, {"prompts": 0})
    mean = sum(prompt_scores) / len(prompt_scores)
    return GameScore(_clamp(mean * 10), {"per_prompt": list(prompt_scores)})


def number(prompt_scores: list[int]) -> GameScore:
    """Five equally weighted 100-point prompt results x 10, rounded once
    (half-up). No speed bonus; timeouts score 0."""
    if not prompt_scores:
        return GameScore(0, {"prompts": 0})
    mean = Decimal(sum(prompt_scores)) / Decimal(len(prompt_scores))
    return GameScore(int((mean * 10).quantize(Decimal("1"), rounding=ROUND_HALF_UP)),
                     {"per_prompt": list(prompt_scores)})


def score_for(game: str, metrics: dict) -> GameScore:
    """Dispatch on the game key. Metrics come from the server-held session."""
    if game == "smriti":
        return smriti(metrics["pairs"], metrics["attempts"], metrics["found"])
    if game == "rush":
        return rush(metrics["answers"], metrics["window_ms"])
    if game == "varna-jaal":
        return varna_jaal(metrics["required"], metrics["found"], metrics["all_found"],
                          metrics["window_ms"], metrics["elapsed_ms"])
    if game == "daily-word":
        return daily_word(metrics["guesses"], metrics["solved"], metrics["finished"])
    if game == "word-groups":
        return word_groups(metrics["groups_total"], metrics["solved"], metrics["wrong"])
    if game == "pada-path":
        return pada_path(metrics["prompt_scores"])
    if game == "number":
        return number(metrics["prompt_scores"])
    raise ValueError(f"unknown game {game!r}")
