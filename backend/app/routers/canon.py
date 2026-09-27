"""Canon endpoints (P21-4): the ordered, depth-graded reading catalogue.

GET /canon — every text in study order with live imported counts (matched by
ref_prefixes against shloka source_refs) and coverage = imported/planned.
Auth-bound like /shlokas. LOCAL computation — no quota, no vendor call.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth import require_learner
from app.db import get_db
from app.models import Learner, Shloka

router = APIRouter()


def canon_report(db: Session) -> list[dict]:
    """Catalogue rows with live counts. The plan column is static; the
    imported count is matched live so an import shows up with zero UI work."""
    from app.models import CanonText

    texts = db.query(CanonText).order_by(CanonText.study_order.asc()).all()
    refs = [r[0] or "" for r in db.query(Shloka.source_ref).all()]
    out = []
    for t in texts:
        prefixes = t.ref_prefixes or []
        imported = sum(
            1 for r in refs if any(p and p in r for p in prefixes)
        ) if prefixes else 0
        planned = t.verses_planned or 0
        out.append({
            "slug": t.slug,
            "title_en": t.title_en or "",
            "title_sa": t.title_sa or "",
            "source": t.source or "",
            "licence": t.licence or "",
            "study_order": t.study_order or 0,
            "depth": t.depth or "index",
            "tier": t.tier or "free",
            "verses_planned": planned,
            "verses_imported": imported,
            "coverage": round(imported / planned, 4) if planned else 0.0,
            "notes": t.notes or "",
            "ref_prefixes": prefixes,
        })
    return out


@router.get("/canon")
def get_canon(
    learner: Learner = Depends(require_learner),
    db: Session = Depends(get_db),
):
    """The canon in study order (P21-4)."""
    return {"texts": canon_report(db)}
