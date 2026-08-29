"""
Adaptive engine: SM-2-inspired feature mastery update + challenge selection.

Two independent dials:
- sanskrit_ratio: how much target language to use (adjusted slightly per attempt)
- script_ratio: Devanagari vs IAST (user-adjustable via PATCH /me)

Selection: pick the challenge whose required features have average mastery
nearest the "edge" (0.5–0.7). Avoid repeats of the last N challenges.
Weight down challenges already solved.
"""

import random
from typing import Optional

from sqlalchemy.orm import Session

from app.models import Challenge, Learner


# SM-2 constants
SM2_MIN = 0.1
SM2_MAX = 1.0
SM2_CORRECT_INC = 0.15
SM2_OFF_INC = 0.05
SM2_INCORRECT_DEC = 0.10
SM2_ABSTRACT_DEC = 0.02  # small decay for unconfident attempts

# Ratio adjustments
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
        verdict: "correct" | "off_by_one" | "incorrect"
        abstained: Whether the analyzer abstained.

    Returns:
        Updated feature_mastery dict.
    """
    mastery = dict(learner.feature_mastery or {})

    for feat in challenge_features:
        current = mastery.get(feat, 0.3)  # default starting at 0.3

        if abstained:
            delta = -SM2_ABSTRACT_DEC
        elif verdict == "correct":
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

    # Update sanskrit_ratio
    if verdict == "correct":
        learner.sanskrit_ratio = min(1.0, learner.sanskrit_ratio + RATIO_CORRECT_INC)
    elif verdict == "incorrect" and not abstained:
        learner.sanskrit_ratio = max(0.1, learner.sanskrit_ratio - RATIO_INCORRECT_DEC)

    return mastery


def select_next_challenge(
    learner: Learner,
    register: str = "laukika",
    mode: str = "text",
    recent_challenge_ids: Optional[list[str]] = None,
    db: Optional[Session] = None,
) -> Optional[Challenge]:
    """
    Select the next challenge at the edge of feature mastery.

    Picks challenges whose required features have average mastery nearest
    0.6 (the sweet spot between too easy and too hard). Avoids the last
    N=5 challenges. Weights down challenges already solved (any feature
    with mastery > 0.9).
    """
    mastery = learner.feature_mastery or {}

    # Build query
    query = Challenge.query if db is None else db.query(Challenge)
    query = query.filter(Challenge.register == register)

    # Exclude recently seen challenges
    recent = recent_challenge_ids or []
    if recent:
        query = query.filter(~Challenge.id.in_(recent))

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
    """Update streak based on verdict."""
    if verdict == "correct":
        learner.streak = (learner.streak or 0) + 1
    elif verdict == "incorrect":
        learner.streak = 0
    # off_by_one: streak stays
    return learner.streak