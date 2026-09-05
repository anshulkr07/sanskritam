"""Grammar endpoints: varnamala, feature taxonomy, derivations.

P9/P11 endpoints in this file are LOCAL computation (Vidyut, offline, ₹0) —
no quota, no vendor call, by design. Do NOT "fix" that by adding metering.
"""

from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db import get_db
from app.auth import require_learner
from app.models import Feature, Learner
from app.schemas import (
    DerivationResponse,
    FeatureResponse,
    ParadigmResponse,
    PathNodeResponse,
    PathSpineResponse,
    ScansionResponse,
    VarnamalaResponse,
    VarnaDistanceResponse,
    WordOrderResponse,
)
from app.seeds.varnamala import VARNAMALA_DATA
from app.services import chandas, prakriya
from app.services.sandhi import split_candidates
from app.services.varna_distance import distance_on_grid
from app.services.word_order import equivalent_orders

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


@router.get("/grammar/path", response_model=PathSpineResponse)
async def get_path_spine(
    learner: Learner = Depends(require_learner),
    db: Session = Depends(get_db),
):
    """The approved-content spine the journey path renders (P7-5).

    Nodes are the feature taxonomy in teaching order (``features.rank``), each
    carrying its **approved** challenge count — the path reflects what is
    actually servable, not the brief catalogue. ``mastery`` is filled from the
    caller's ``feature_mastery`` map (0 when absent); ``pending_count`` shows
    the P8-0 backlog per feature so an author can see coverage gaps too.
    LOCAL computation — no quota (§2.9)."""
    import json as _json

    from app.models import Challenge

    features = db.query(Feature).order_by(Feature.rank).all()
    counts: dict[tuple[str, str], int] = {}
    for ch in db.query(Challenge.review_status, Challenge.features).all():
        status = ch[0]
        feats = ch[1] or []
        if isinstance(feats, str):  # SQLite may hand back the raw JSON text
            feats = _json.loads(feats)
        for f in feats:
            counts[(f, status)] = counts.get((f, status), 0) + 1

    mastery_map = learner.feature_mastery if isinstance(learner.feature_mastery, dict) else {}

    nodes = []
    for f in features:
        nodes.append(PathNodeResponse(
            id=f.id,
            feature=f.id,
            kind=f.kind,
            rank=f.rank or 0,
            label_en=f.label_en or "",
            label_hi=f.label_hi or "",
            approved_count=counts.get((f.id, "approved"), 0),
            pending_count=counts.get((f.id, "pending"), 0),
            mastery=float(mastery_map.get(f.id, 0.0)),
        ))

    covered = sum(1 for n in nodes if n.approved_count > 0)
    return PathSpineResponse(nodes=nodes, features_covered=covered, features_total=len(nodes))


@router.get("/grammar/derive", response_model=DerivationResponse)
async def derive(
    dhatu: Optional[str] = Query(None, description="dhātu in Devanagari, e.g. भू"),
    lakara: Optional[str] = Query(None, description="Lakara enum name (Lat, Lot, Lun…)"),
    purusha: Optional[str] = Query(None, description="Purusha enum name (Prathama, Madhyama, Uttama)"),
    vacana: Optional[str] = Query(None, description="Vacana enum name (Eka, Dvi, Bahu)"),
    pratipadika: Optional[str] = Query(None, description="prātipadika in Devanagari, e.g. देव"),
    linga: Optional[str] = Query(None, description="Linga enum name (Pum, Stri, Napumsaka)"),
    vibhakti: Optional[str] = Query(None, description="Vibhakti enum name (Prathama, Dvitiya, Trtiya…)"),
):
    """Derive a word form's full prakriyā (P9-2). LOCAL computation — no quota."""
    return prakriya.derive(
        dhatu=dhatu,
        lakara=lakara,
        purusha=purusha,
        vacana=vacana,
        pratipadika=pratipadika,
        linga=linga,
        vibhakti=vibhakti,
    )


@router.get("/grammar/scansion", response_model=ScansionResponse)
async def scansion(text: str = Query(..., min_length=1)):
    """Compute the long/short rhythm of a verse line (P11-1). LOCAL — no quota."""
    return chandas.scan(text)


@router.get("/grammar/sandhi", response_model=dict)
async def sandhi(
    joined: str = Query(..., description="joined Devanagari form to split"),
):
    """Return valid split candidates for a sandhi'd form (P11-2). LOCAL — no quota."""
    return {"candidates": split_candidates(joined)}


@router.get("/grammar/word-order", response_model=WordOrderResponse)
async def word_order(
    sentence: str = Query(..., description="Devanagari graded-correct sentence"),
):
    """Equivalent word-order permutations and per-word role endings (P11-3). LOCAL."""
    return equivalent_orders(sentence)


@router.get("/grammar/varna-distance", response_model=VarnaDistanceResponse)
async def varna_distance(a: str, b: str):
    """Phonetic distance between two sparśa consonants (P11-4). LOCAL — no quota."""
    return distance_on_grid(a, b)


@router.get("/grammar/paradigm", response_model=ParadigmResponse)
async def paradigm(
    pratipadika: Optional[str] = None,
    linga: Optional[str] = None,
    dhatu: Optional[str] = None,
    lakara: Optional[str] = None,
):
    """A full paradigm grid, each cell carrying its own derivation (P11-5). LOCAL."""
    return prakriya.paradigm(
        pratipadika=pratipadika,
        linga=linga,
        dhatu=dhatu,
        lakara=lakara,
    )