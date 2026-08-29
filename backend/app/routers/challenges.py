"""Challenge endpoints: GET /challenges/next, GET /challenges (list)."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.adaptive import select_next_challenge
from app.auth import require_learner
from app.db import get_db
from app.models import Challenge, Learner
from app.schemas import ChallengeResponse

router = APIRouter()


@router.get("/challenges/next", response_model=ChallengeResponse)
async def get_next_challenge(
    register: str = Query("laukika", pattern="^(laukika|classical)$"),
    mode: str = Query("text", pattern="^(text|audio)$"),
    learner: Learner = Depends(require_learner),
    db: Session = Depends(get_db),
):
    """Select the next challenge at the edge of feature mastery."""
    # Get recent 5 challenge ids for this learner
    from app.models import Attempt
    recent_attempts = (
        db.query(Attempt)
        .filter(Attempt.learner_id == learner.id)
        .order_by(Attempt.ts.desc())
        .limit(5)
        .all()
    )
    recent_ids = [a.challenge_id for a in recent_attempts]

    challenge = select_next_challenge(
        learner=learner,
        register=register,
        mode=mode,
        recent_challenge_ids=recent_ids,
        db=db,
    )

    if challenge is None:
        raise HTTPException(status_code=404, detail="No challenges found for this register")

    return ChallengeResponse(
        id=challenge.id,
        prompt_l1=challenge.prompt_l1,
        prompt_lang=challenge.prompt_lang,
        target_sanskrit=challenge.target_sanskrit,
        target_iast=challenge.target_iast,
        features=challenge.features or [],
        audio_url=challenge.audio_url or "",
        register=challenge.register,
    )


@router.get("/challenges", response_model=list[ChallengeResponse])
async def list_challenges(
    register: str = Query("laukika", pattern="^(laukika|classical)$"),
    learner: Learner = Depends(require_learner),
    db: Session = Depends(get_db),
):
    """List all challenges for a register."""
    challenges = db.query(Challenge).filter(Challenge.register == register).all()
    return [
        ChallengeResponse(
            id=c.id,
            prompt_l1=c.prompt_l1,
            prompt_lang=c.prompt_lang,
            target_sanskrit=c.target_sanskrit,
            target_iast=c.target_iast,
            features=c.features or [],
            audio_url=c.audio_url or "",
            register=c.register,
        )
        for c in challenges
    ]