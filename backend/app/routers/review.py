"""P23-5 · The review schedule endpoints.

``GET /review/due`` — how many items are due today, and which (oldest
first). The Home screen's honest "N due today" reads this; the step player
can pull due step instances for spaced review. LOCAL computation — no quota.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.auth import require_learner
from app.db import get_db
from app.models import Learner
from app.schemas import ReviewItemResponse
from app.services.review import due_count, due_items

router = APIRouter(prefix="/review")


@router.get("/due")
async def read_due(
    limit: int = Query(20, ge=1, le=100),
    learner: Learner = Depends(require_learner),
    db: Session = Depends(get_db),
):
    items = due_items(db, learner.id, limit=limit)
    return {
        "due_count": due_count(db, learner.id),
        "items": [
            ReviewItemResponse(
                item_key=r.item_key,
                kind=r.kind or "step",
                due_at=r.due_at.isoformat() if hasattr(r.due_at, "isoformat") else str(r.due_at),
                stability=float(r.stability or 0),
                difficulty=float(r.difficulty if r.difficulty is not None else 0),
                lapses=int(r.lapses or 0),
                last_verdict=r.last_verdict or "",
            )
            for r in items
        ],
    }
