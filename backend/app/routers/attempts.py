"""Attempt endpoints: POST /attempts."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.adaptive import update_mastery, update_streak
from app.auth import require_learner
from app.db import get_db
from app.grading.engine import grade_attempt
from app.models import Attempt, Challenge, Learner
from app.schemas import AttemptRequest, AttemptResponse
from app.services.prakriya import derive as derive_form

router = APIRouter()


def _attempt_derivation(verdict: str, abstained: bool, challenge: Challenge):
    """P9-3: attach a correct-form derivation on a grammatical mismatch.

    Returns None (no derivation) for a correct verdict, an `unsure`/abstained
    verdict (a derivation is an explanation, never an accusation — §2.2 / §3.3),
    or when no target word is derivable. Each word of the target sentence is
    tried as a noun then a verb; the first derivable inflected form is returned.

    The LLM gloss (grammar_note) and this derivation are INDEPENDENT and either
    may be absent — this is an addition, not a replacement (see P9-3).
    """
    if verdict in ("correct", "unsure") or abstained:
        return None
    target = (challenge.target_sanskrit or "").strip("।॥,!? ")
    if not target:
        return None
    words = [w for w in target.split() if w]
    for word in words:
        # Prefer deriving the word as a noun, then as a bare verb root.
        for der in (derive_form(pratipadika=word), derive_form(dhatu=word)):
            if der["steps"]:
                return der
    return None


@router.post("/attempts", response_model=AttemptResponse)
async def submit_attempt(
    req: AttemptRequest,
    learner: Learner = Depends(require_learner),
    db: Session = Depends(get_db),
):
    """Submit a challenge attempt and receive grading."""
    challenge = db.query(Challenge).filter(Challenge.id == req.challenge_id).first()
    if challenge is None:
        raise HTTPException(status_code=404, detail="Challenge not found")

    # Grade the attempt (script detection happens inside grade_attempt;
    # the analyzer handles mixed-script input per word).
    result = grade_attempt(
        response_text=req.response_text,
        accepted_parses=challenge.accepted_parses or [],
        expected_features=challenge.features or [],
    )

    # Update adaptive model ("unsure" is a no-op in both)
    updated_mastery = update_mastery(
        learner=learner,
        challenge_features=challenge.features or [],
        verdict=result["verdict"],
        abstained=result["abstained"],
    )
    update_streak(learner, result["verdict"])
    db.commit()

    # Record attempt
    attempt = Attempt(
        learner_id=learner.id,
        challenge_id=challenge.id,
        raw_text=req.response_text,
        parsed_features=result["parsed_features"],
        verdict=result["verdict"],
        diff=result["diff"],
        diagnosis=result["diagnosis"],
        grammar_note=result["grammar_note"],
        abstained=result["abstained"],
    )
    db.add(attempt)
    db.commit()

    return AttemptResponse(
        verdict=result["verdict"],
        parsed_features=result["parsed_features"],
        accepted_parses=result["accepted_parses"],
        diff=result["diff"],
        diagnosis=result["diagnosis"],
        grammar_note=result["grammar_note"],
        abstained=result["abstained"],
        derivation=_attempt_derivation(result["verdict"], result["abstained"], challenge),
        updated_model={
            "sanskrit_ratio": learner.sanskrit_ratio or 0.3,
            "sanskrit_ratio_setting": learner.sanskrit_ratio_setting,
            "script_ratio": learner.script_ratio or 0.3,
            "feature_mastery": updated_mastery,
            "streak": learner.streak or 0,
        },
    )
