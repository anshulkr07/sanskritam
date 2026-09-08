"""P23-4a · The licence registry endpoint.

``GET /licences`` renders what ``seeds/licences.py`` authors: one row per
source we take anything from, with the licence named exactly and the credit
line VERBATIM. The client renders this and nothing else (U15-7) — the
screen decides nothing, the registry does.

Gated on nothing; the RELEASE of attributed content (not the import that
produces it) is what waits on the screen existing.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth import require_learner
from app.db import get_db
from app.models import ContentSource, Learner
from app.schemas import LicenceResponse

router = APIRouter()


@router.get("/licences", response_model=list[LicenceResponse])
async def read_licences(
    learner: Learner = Depends(require_learner),  # noqa: F841 — auth-bound like /shlokas
    db: Session = Depends(get_db),
):
    rows = db.query(ContentSource).order_by(ContentSource.key).all()
    return [
        LicenceResponse(
            key=r.key,
            name=r.name or "",
            url=r.url or "",
            licence=r.licence or "",
            credit=r.credit or "",
            taken=r.taken or "",
        )
        for r in rows
    ]
