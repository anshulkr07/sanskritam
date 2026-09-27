"""Daily word endpoints (P12): वर्ण-बन्धः, the varṇamālā guessing game.

GET  /daily-word        → today's puzzle state (WITHOUT the answer)
POST /daily-word/guess  → submit a guess, returns tile states + axis

The guessing game is LOCAL computation (varṇamālā grid scoring) — no vendor
call, no quota, by design. Do NOT add metering here.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth import require_learner
from app.db import get_db
from app.models import Learner
from app.schemas import DailyWordGuessRequest, DailyWordGuessResponse, DailyWordPuzzle
from app.services import daily_word

router = APIRouter(prefix="/daily-word")


@router.get("", response_model=DailyWordPuzzle)
def get_daily_word(
    learner: Learner = Depends(require_learner),
    db: Session = Depends(get_db),
):
    """Today's puzzle for this learner's local day — without the answer."""
    return daily_word.get_puzzle(learner, db)


@router.post("/guess", response_model=DailyWordGuessResponse)
async def submit_daily_word_guess(
    req: DailyWordGuessRequest,
    learner: Learner = Depends(require_learner),
    db: Session = Depends(get_db),
):
    """Score a guess and advance the per-day game. Refuses replay."""
    return daily_word.guess(learner, db, req.guess)
