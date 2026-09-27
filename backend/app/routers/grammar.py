"""Grammar endpoints: varnamala, feature taxonomy, derivations.

P9/P11 endpoints in this file are LOCAL computation (Vidyut, offline, ₹0) —
no quota, no vendor call, by design. Do NOT "fix" that by adding metering.
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db import get_db
from app.auth import require_learner
from app.models import Feature, Learner
from app.schemas import (
    DerivationResponse,
    FeatureResponse,
    GuideIndexResponse,
    GuideTopicResponse,
    ParadigmResponse,
    PathNodeResponse,
    PathSpineResponse,
    ScansionResponse,
    VarnamalaResponse,
    VarnaDistanceResponse,
    WordLookupResponse,
    WordOrderResponse,
)
from app.seeds.varnamala import VARNAMALA_DATA
from app.services import chandas, grammar_guide, prakriya, word_lookup
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
def get_features(db: Session = Depends(get_db)):
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
def get_path_spine(
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
    from app.services.lessons import lesson_feature_ids

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
    with_lessons = lesson_feature_ids(db)

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
            has_lesson=f.id in with_lessons,
        ))

    covered = sum(1 for n in nodes if n.approved_count > 0)
    return PathSpineResponse(nodes=nodes, features_covered=covered, features_total=len(nodes))


@router.get("/grammar/guide", response_model=GuideIndexResponse)
def get_guide():
    """The Grammar tab's index: chapters, topic summaries, glossary (bilingual).

    No DB, no quota, no vendor — the guide is authored data
    (app/services/grammar_guide), built once per process. Lesson existence
    is resolved client-side from GET /lessons so the guide never goes stale."""
    return grammar_guide.guide_index()


@router.get("/grammar/guide/topics/{topic_id}", response_model=GuideTopicResponse)
def get_guide_topic(topic_id: str):
    """One full topic: blocks, go-deeper sections, quick check, proofs."""
    topic = grammar_guide.guide_topic(topic_id)
    if topic is None:
        raise HTTPException(status_code=404, detail=f"no grammar topic {topic_id!r}")
    return topic


@router.get("/grammar/lookup", response_model=WordLookupResponse)
def lookup_word(word: str = Query(..., min_length=1, max_length=40, description="one Devanagari word")):
    """What form is this word? Up to three readings, each re-derived by the
    engine to the exact typed word. LOCAL — no quota."""
    return word_lookup.lookup(word)


def _csv(value: Optional[str]) -> Optional[list[str]]:
    """``"pra,A"`` → ``["pra", "A"]``; empty or missing → None."""
    if not value:
        return None
    items = [v.strip() for v in value.split(",") if v.strip()]
    return items or None


@router.get("/grammar/derive", response_model=DerivationResponse)
def derive(
    dhatu: Optional[str] = Query(None, description="dhātu in Devanagari, e.g. भू"),
    lakara: Optional[str] = Query(None, description="Lakara enum name (Lat, Lot, Lun…)"),
    purusha: Optional[str] = Query(None, description="Purusha enum name (Prathama, Madhyama, Uttama)"),
    vacana: Optional[str] = Query(None, description="Vacana enum name (Eka, Dvi, Bahu)"),
    pratipadika: Optional[str] = Query(None, description="prātipadika in Devanagari, e.g. देव"),
    linga: Optional[str] = Query(None, description="Linga enum name (Pum, Stri, Napumsaka)"),
    vibhakti: Optional[str] = Query(None, description="Vibhakti enum name (Prathama, Dvitiya, Trtiya…)"),
    gana: Optional[str] = Query(None, description="Gana enum name (Bhvadi, Adadi…) — pins the root"),
    aupadeshika: Optional[str] = Query(None, description="exact dhātupāṭha upadeśa in SLP1, e.g. vada~"),
    prayoga: Optional[str] = Query(None, description="Kartari | Karmani | Bhave"),
    sanadi: Optional[str] = Query(None, description="comma list: Nic, San, Yan"),
    prefixes: Optional[str] = Query(None, description="comma list of upasargas, e.g. प्र,आ"),
    krt: Optional[str] = Query(None, description="vidyut Krt name, e.g. ktvA, tumun, kta"),
    taddhita: Optional[str] = Query(None, description="vidyut Taddhita name, e.g. aR, tva, matup"),
    stem_type: Optional[str] = Query(None, description="basic | nyap — overrides the feminine-stem guess"),
    avyaya: Optional[bool] = Query(None, description="derive the stem as an indeclinable"),
    expect: Optional[str] = Query(None, description="when forms are optional, show this one"),
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
        gana=gana,
        aupadeshika=aupadeshika,
        prayoga=prayoga,
        sanadi=_csv(sanadi),
        prefixes=_csv(prefixes),
        krt=krt,
        taddhita=taddhita,
        stem_type=stem_type,
        avyaya=avyaya,
        expect=expect,
    )


@router.get("/grammar/scansion", response_model=ScansionResponse)
def scansion(text: str = Query(..., min_length=1)):
    """Compute the long/short rhythm of a verse line (P11-1). LOCAL — no quota."""
    return chandas.scan(text)


@router.get("/grammar/sandhi", response_model=dict)
def sandhi(
    joined: str = Query(..., description="joined Devanagari form to split"),
):
    """Return valid split candidates for a sandhi'd form (P11-2). LOCAL — no quota."""
    return {"candidates": split_candidates(joined)}


@router.get("/grammar/word-order", response_model=WordOrderResponse)
def word_order(
    sentence: str = Query(..., description="Devanagari graded-correct sentence"),
):
    """Equivalent word-order permutations and per-word role endings (P11-3). LOCAL."""
    return equivalent_orders(sentence)


@router.get("/grammar/varna-distance", response_model=VarnaDistanceResponse)
def varna_distance(a: str, b: str):
    """Phonetic distance between two sparśa consonants (P11-4). LOCAL — no quota."""
    return distance_on_grid(a, b)


@router.get("/grammar/paradigm", response_model=ParadigmResponse)
def paradigm(
    pratipadika: Optional[str] = None,
    linga: Optional[str] = None,
    dhatu: Optional[str] = None,
    lakara: Optional[str] = None,
    gana: Optional[str] = None,
    aupadeshika: Optional[str] = None,
    prayoga: Optional[str] = None,
    sanadi: Optional[str] = None,
    prefixes: Optional[str] = None,
    stem_type: Optional[str] = None,
):
    """A full paradigm grid, each cell carrying its own derivation (P11-5). LOCAL."""
    return prakriya.paradigm(
        pratipadika=pratipadika,
        linga=linga,
        dhatu=dhatu,
        lakara=lakara,
        gana=gana,
        aupadeshika=aupadeshika,
        prayoga=prayoga,
        sanadi=_csv(sanadi),
        prefixes=_csv(prefixes),
        stem_type=stem_type,
    )