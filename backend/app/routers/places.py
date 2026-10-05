"""GET /places/search: find a city anywhere (GeoNames cities5000).

Used by the phone's place chooser for a place of birth and the learner's own
place. The query is neither stored nor logged.
"""

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from app.auth import require_learner
from app.models import Learner
from app.services import places

router = APIRouter(prefix="/places")


class PlaceOut(BaseModel):
    label: str
    name: str
    region: str
    country: str
    lat: float
    lon: float
    tz: str


@router.get("/search", response_model=list[PlaceOut])
def search_places(
    q: str = Query(..., min_length=1, max_length=80),
    limit: int = Query(default=10, ge=1, le=25),
    learner: Learner = Depends(require_learner),  # noqa: F841 — signed-in use only
):
    return places.search(q, limit)
