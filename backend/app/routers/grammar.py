"""Grammar endpoints: varnamala, feature taxonomy."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Feature
from app.schemas import FeatureResponse, VarnamalaResponse
from app.seeds.varnamala import VARNAMALA_DATA

router = APIRouter()

# IAST labels for the five places of articulation (frontend display)
IAST_PLACE = {
    "kanthya": "kaṇṭhya",
    "talavya": "tālavya",
    "murdhanya": "mūrdhanya",
    "dantya": "dantya",
    "oshthya": "oṣṭhya",
    "oshthya_kanthya": "oṣṭha-kaṇṭhya",
    "kanthya_talavya": "kaṇṭha-tālavya",
    "kanthya_oshthya": "kaṇṭha-oṣṭhya",
    "oshthya_dantya": "oṣṭha-dantya",
}


def _with_iast_place(cells: list[dict]) -> list[dict]:
    out = []
    for c in cells:
        d = dict(c)
        if d.get("place"):
            d["iast_place"] = IAST_PLACE.get(d["place"], d["place"])
        out.append(d)
    return out


@router.get("/grammar/varnamala", response_model=VarnamalaResponse)
async def get_varnamala():
    """Get the varnamala grid."""
    data = dict(VARNAMALA_DATA)
    for key in ("vowels", "consonants", "nasals", "others"):
        data[key] = _with_iast_place(data[key])
    return data


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