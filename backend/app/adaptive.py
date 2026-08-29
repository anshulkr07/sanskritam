"""
Adaptive engine: SM-2-inspired feature mastery update + challenge selection.

Two independent dials:
- sanskrit_ratio: how much target language to use. The LEARNER sets a
  preference (sanscript_ratio_setting via PATCH /me); the system's per-attempt
  adjustments only move the effective ratio UNDER that ceiling — never past it.
  One writer per value: user owns the setting, system owns the effective ratio.
- script_ratio: Devanagari vs IAST (user-adjustable via PATCH /me)

Selection: pick the challenge whose required features have average mastery
nearest the "edge" (0.5–0.7). Avoid repeats of the last N challenges.
Weight down challenges already solved.
"""

import random  # noqa: F401 — reserved for stochastic tie-breaking in selection
from typing import Optional

from sqlalchemy.orm import Session

from app.models import Challenge, Learner


# SM-2 constants
SM2_MIN = 0.1
SM2_MAX = 1.0
SM2_CORRECT_INC = 0.15
SM2_OFF_INC = 0.05
SM2_INCORRECT_DEC = 0.10

# Ratio adjustments (effective ratio only; bounded by the user's setting)
RATIO_CORRECT_INC = 0.02
RATIO_INCORRECT_DEC = 0.01


def update_mastery(
    learner: Learner,
    challenge_features: list[str],
    verdict: str,
    abstained: bool,
) -> dict[str, float]:
    """
    SM-2-inspired update for feature mastery scores.

    Args:
        learner: The learner model (modified in-place).
        challenge_features: Feature IDs exercised by this challenge.
        verdict: "correct" | "off_by_one" | "incorrect" | "unsure"
        abstained: Whether the analyzer abstained.

    Returns:
        Updated feature_mastery dict.
    """
    if verdict == "unsure" or abstained:
        # Abstention principle: uncertainty changes nothing. No mastery decay,
        # no ratio drift — the learner did nothing provably wrong.
        return dict(learner.feature_mastery or {})

    mastery = dict(learner.feature_mastery or {})

    for feat in challenge_features:
        current = mastery.get(feat, 0.3)  # default starting at 0.3

        if verdict == "correct":
            delta = SM2_CORRECT_INC * (1.0 - current)  # harder near 1.0
        elif verdict == "off_by_one":
            delta = SM2_OFF_INC * (1.0 - current)
        else:  # incorrect
            delta = -SM2_INCORRECT_DEC * current  # proportional to current
            # But not below 0.1
            if current + delta < SM2_MIN:
                delta = SM2_MIN - current

        new_val = max(SM2_MIN, min(SM2_MAX, current + delta))
        mastery[feat] = round(new_val, 3)

    learner.feature_mastery = mastery

    # Update effective sanskrit_ratio — but never past the user's ceiling.
    ceiling = learner.sanskrit_ratio_setting
    if ceiling is None:  # legacy rows: current value is its own ceiling
        ceiling = learner.sanskrit_ratio or 0.0
    if verdict == "correct":
        target = (learner.sanskrit_ratio or 0.0) + RATIO_CORRECT_INC
        learner.sanskrit_ratio = min(ceiling, target)
    elif verdict == "incorrect":
        learner.sanskrit_ratio = max(0.1, (learner.sanskrit_ratio or 0.0) - RATIO_INCORRECT_DEC)

    return mastery


def select_next_challenge(
    learner: Learner,
    db: Session,
    register: str = "laukika",
    mode: str = "text",
    recent_challenge_ids: Optional[list[str]] = None,
) -> Optional[Challenge]:
    """Select the next challenge at the edge of feature mastery.

    Picks challenges whose required features have average mastery nearest
    0.6 (the sweet spot between too easy and too hard). Avoids the last
    N=5 challenges. Weights down challenges already solved (any feature
    with mastery > 0.9).

    `db` is a required positional parameter — the old
    `Challenge.query` fallback (Flask-SQLAlchemy idiom) does not exist in
    SQLAlchemy 2.0 and would AttributeError.
    """
    mastery = learner.feature_mastery or {}

    # Build query
    query = db.query(Challenge)
    query = query.filter(Challenge.register == register)

    # Exclude recently served challenges (no-repeat window; also covers
    # attempts, since a served challenge that is attempted lands here too)
    recent = list(recent_challenge_ids or [])
    try:
        served = learner.recent_challenge_ids or []
    except Exception:
        served = []
    window = list(dict.fromkeys(served + recent))[-5:]
    if window:
        query = query.filter(~Challenge.id.in_(window))

    challenges = query.all()
    if not challenges:
        # Window exhaustion fallback: relax to attempts-only exclusion so the
        # learner always gets a challenge even if the register is small.
        if recent:
            query = db.query(Challenge).filter(Challenge.register == register)
            query = query.filter(~Challenge.id.in_(recent[-2:]))
            challenges = query.all()
        if not challenges:
            return None

    best_challenge = None
    best_score = float("inf")

    for ch in challenges:
        if not ch.features:
            continue

        # Average mastery of this challenge's features
        scores = [mastery.get(f, 0.3) for f in ch.features]
        avg_mastery = sum(scores) / len(scores)

        # Edge distance: how far from 0.6 (sweet spot)
        edge_distance = abs(avg_mastery - 0.6)

        # Penalty: if any feature has mastery > 0.9, add penalty
        solved_penalty = 0
        for f in ch.features:
            if mastery.get(f, 0) > 0.9:
                solved_penalty += 0.3
        score = edge_distance + solved_penalty

        if score < best_score:
            best_score = score
            best_challenge = ch

    return best_challenge


def update_streak(learner: Learner, verdict: str) -> int:
    """Update streak based on verdict.

    "unsure" is a no-op: the streak is the learner's, not the parser's.
    """
    if verdict == "correct":
        learner.streak = (learner.streak or 0) + 1
    elif verdict == "incorrect":
        learner.streak = 0
    # off_by_one: streak stays
    # unsure: streak stays — no streak change on analyzer uncertainty
    return learner.streak
