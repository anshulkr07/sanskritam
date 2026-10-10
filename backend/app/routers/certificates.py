"""Public certificate pages (handover_recite 11.7). Registered before static mount."""

from html import escape

from fastapi import APIRouter, HTTPException
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from fastapi import Depends

router = APIRouter()

_PLACE = {1: "First place", 2: "Second place", 3: "Third place"}


@router.get("/certificates/{code}", response_class=HTMLResponse, include_in_schema=False)
def show_certificate(code: str, db: Session = Depends(get_db)):
    from app.models import Certificate
    c = db.query(Certificate).filter(Certificate.code == code).first()
    if c is None:
        return HTMLResponse(
            "<!doctype html><html><body><h1>Not found</h1>"
            "<p>No certificate with that code.</p></body></html>", status_code=404)
    place = _PLACE.get(c.rank or 0, f"Rank {c.rank}")
    comp = c.competition_id or c.month or ""
    return HTMLResponse(
        f"<!doctype html><html><head><meta charset='utf-8'><title>Certificate {escape(str(c.code))}</title></head>"
        f"<body><h1>Certificate</h1><p>{escape(place)}</p><p>{escape(str(c.public_name))}</p>"
        f"<p>{escape(str(comp))}</p><p>{escape(str(c.piece_ref))}</p><p>Issued by Sanskritam</p></body></html>")
