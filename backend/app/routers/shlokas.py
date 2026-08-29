"""Shloka endpoints: GET /shlokas/today."""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Shloka
from app.schemas import ShlokaResponse

router = APIRouter()


@router.get("/shlokas/today", response_model=ShlokaResponse)
async def get_today_shloka(db: Session = Depends(get_db)):
    """Get the daily shloka."""
    today = date.today().isoformat()
    shloka = db.query(Shloka).filter(Shloka.date == today).first()
    if shloka is None:
        # Fall back to latest available
        shloka = db.query(Shloka).order_by(Shloka.date.desc()).first()
    if shloka is None:
        raise HTTPException(status_code=404, detail="No shloka available")

    return ShlokaResponse(
        id=shloka.id,
        date=shloka.date,
        source_ref=shloka.source_ref,
        devanagari=shloka.devanagari,
        iast=shloka.iast,
        metre=shloka.metre,
        word_breakdown=shloka.word_breakdown or [],
        features=shloka.features or [],
        audio_url=shloka.audio_url or "",
    )