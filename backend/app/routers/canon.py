"""Canon endpoints (P21-4): the ordered, depth-graded reading catalogue.

GET /canon — every text in study order with live imported counts (matched by
ref_prefixes against shloka source_refs) and coverage = imported/planned.
Auth-bound like /shlokas. LOCAL computation — no quota, no vendor call.
"""

import re

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth import require_learner
from app.db import get_db
from app.models import Learner, Shloka

router = APIRouter()

# The reader's parseRef (mobile/src/utils/verses.ts): a book name, then a
# trailing verse number such as "2.47" or "13".
_TRAILING_NUMS = re.compile(r"^(.+?)\s+(\d+(?:\.\d+)*)\s*$")


def verse_key(ref: str) -> str:
    """One key per verse, the way the reader lists a book.

    A numbered reference is one verse however many rows carry it: the daily
    seed holds half-verses under the verse's number and an import holds the
    whole verse under the same one (Gītā 18.66 is both), and the book shows
    it once. A reference without a number ("Sūkti: Subhāṣita") is shared by
    different sayings, so each such row is its own verse.
    """
    norm = re.sub(r"\s+", " ", (ref or "").strip()).replace("Nītīśataka", "Nītiśataka")
    m = _TRAILING_NUMS.match(norm)
    if not m:
        return ""
    return m.group(1).strip() + " " + ".".join(str(int(n)) for n in m.group(2).split("."))


def canon_report(db: Session) -> list[dict]:
    """Catalogue rows with live counts. The plan column is static; the
    imported count is matched live so an import shows up with zero UI work,
    and counts verses as the reader lists them (``verse_key``)."""
    from app.models import CanonText

    texts = db.query(CanonText).order_by(CanonText.study_order.asc()).all()
    refs = [r[0] or "" for r in db.query(Shloka.source_ref).all()]
    out = []
    for t in texts:
        prefixes = t.ref_prefixes or []
        mine = [r for r in refs if any(p and p in r for p in prefixes)] if prefixes else []
        keys = [verse_key(r) for r in mine]
        imported = len({k for k in keys if k}) + sum(1 for k in keys if not k)
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
