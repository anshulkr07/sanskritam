"""Attempt endpoints: POST /attempts."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.adaptive import update_mastery, update_streak
from app.auth import require_learner
from app.db import get_db
from app.grading.engine import grade_attempt
from app.models import Attempt, Challenge, Learner
from app.schemas import AttemptRequest, AttemptResponse

router = APIRouter()


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
        updated_model={
            "sanskrit_ratio": learner.sanskrit_ratio or 0.3,
            "sanskrit_ratio_setting": learner.sanskrit_ratio_setting,
            "script_ratio": learner.script_ratio or 0.3,
            "feature_mastery": updated_mastery,
            "streak": learner.streak or 0,
        },
    )
