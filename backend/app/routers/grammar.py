"""Grammar endpoints: varnamala, feature taxonomy."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Feature
from app.schemas import FeatureResponse, VarnamalaResponse
from app.seeds.varnamala import VARNAMALA_DATA

router = APIRouter()


@router.get("/grammar/varnamala", response_model=VarnamalaResponse)
async def get_varnamala():
    """Get the varnamala grid."""
    return VARNAMALA_DATA


@router.get("/grammar/features", response_model=list[FeatureResponse])
async def get_features(db: Session = Depends(get_db)):
    """Get the full feature taxonomy."""
    features = db.query(Feature).order_by(Feature.rank).all()
    return [
        FeatureResponse(
            id=f.id,
            kind=f.kind,
            rank=f.rank or 0,
            label_en=f.label_en or "",
            label_hi=f.label_hi or "",
        )
        for f in features
    ]