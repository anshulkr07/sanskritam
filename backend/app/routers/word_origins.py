"""Word journey endpoints (handover_language).

``GET /word-origins/today`` - today's card for the learner's local day.
``GET /word-origins`` - earlier words, newest first.
``GET /word-origins/{origin_id}`` - one origin with its ladder.

Read-only: reading gives no XP and touches no mastery, like the story deck.
Auth-bound like /story and /units. No quota. No writes.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import require_learner
from app.db import get_db
from app.models import Learner
from app.schemas import (
    WordHopResponse,
    WordOriginResponse,
    WordOriginSummary,
    WordOriginsResponse,
    WordRouteResponse,
    WordScriptResponse,
    WordSourceResponse,
    WordTodayResponse,
)
from app.services import word_origins as svc

router = APIRouter(prefix="/word-origins")


def _script(origin) -> WordScriptResponse:
    if (origin.display_dev or ""):
        return WordScriptResponse(dev=origin.display_dev or "", iast=origin.display_iast or "")
    return WordScriptResponse(dev=origin.sanskrit_dev or "", iast=origin.sanskrit_iast or "")


def _stem(origin) -> WordScriptResponse:
    return WordScriptResponse(dev=origin.sanskrit_dev or "", iast=origin.sanskrit_iast or "")


def _route_to_response(r) -> WordRouteResponse:
    hops = []
    for h in (r.hops or []):
        if not isinstance(h, dict):
            continue
        if not (h.get("lang") and h.get("form")):
            # Every hop has a lang and a form; skip malformed rows defensively.
            if not (h.get("lang") or h.get("form")):
                continue
        hops.append(WordHopResponse(
            lang=str(h.get("lang") or ""),
            form=str(h.get("form") or ""),
            gloss=str(h.get("gloss") or ""),
        ))
    return WordRouteResponse(
        id=r.id,
        lang=r.lang or "",
        lang_name=r.lang_name or "",
        word=r.word or "",
        script=r.script or "",
        roman=r.roman or "",
        gloss=r.gloss or "",
        kind=r.kind or "",
        relation=svc.relation_of(r),
        confidence=r.confidence or "",
        hops=hops,
        sources=list(r.source_keys or []),
        source_url=getattr(r, "source_url", "") or "",
        source_site=getattr(r, "source_site", "") or "",
    )


def _origin_to_response(origin, routes, sources) -> WordOriginResponse:
    src_by_key = {s.key: s for s in sources}
    first = ["mw"] if svc.read_in_dictionary(origin) else []
    ordered_keys = first + [k for r in routes for k in (r.source_keys or []) if k != "mw"]
    seen: list[str] = []
    for k in ordered_keys:
        if k and k not in seen:
            seen.append(k)
    srcs = [
        WordSourceResponse(key=k, name=(src_by_key[k].name if k in src_by_key else ""),
                           url=(src_by_key[k].url if k in src_by_key else ""))
        for k in seen if k in src_by_key
    ]
    # A route the daily pipeline wrote cites the very page that was checked.
    pages: list[str] = []
    for r in routes:
        url = getattr(r, "source_url", "") or ""
        if url and url not in pages:
            pages.append(url)
            srcs.append(WordSourceResponse(
                key=f"page:{r.id}",
                name=(getattr(r, "source_site", "") or "") or url,
                url=url,
            ))
    return WordOriginResponse(
        id=origin.id,
        sanskrit=_script(origin),
        stem=_stem(origin),
        gloss=origin.gloss or "",
        attested=origin.attested or "",
        note=origin.note or "",
        routes=[_route_to_response(r) for r in routes],
        sources=srcs,
    )


@router.get("/today", response_model=WordTodayResponse)
def read_word_today(
    learner: Learner = Depends(require_learner),
    db: Session = Depends(get_db),
):
    """Today's word journey card for the learner's local day."""
    day, origin, headline, routes, sources = svc.today_for(db, learner)
    if origin is None:
        return WordTodayResponse(date=day, available=False, origin=None, headline_route_id="")
    return WordTodayResponse(
        date=day,
        available=True,
        origin=_origin_to_response(origin, routes, sources),
        headline_route_id=headline.id if headline is not None else "",
    )


@router.get("", response_model=WordOriginsResponse)
def read_word_origins(
    learner: Learner = Depends(require_learner),
    db: Session = Depends(get_db),
):
    """Earlier words scheduled on or before today, newest first."""
    _day, origins, by_origin = svc.list_for(db, learner)
    out: list[WordOriginSummary] = []
    for o in origins:
        routes = svc._visible_routes(by_origin.get(o.id, []))
        langs: list[str] = []
        for r in routes:
            ln = r.lang_name or r.lang or ""
            if ln and ln not in langs:
                langs.append(ln)
        out.append(WordOriginSummary(
            id=o.id,
            sanskrit=_script(o),
            gloss=o.gloss or "",
            languages=langs,
            scheduled_date=o.scheduled_date or "",
        ))
    return WordOriginsResponse(origins=out)


@router.get("/{origin_id}", response_model=WordOriginResponse)
def read_word_origin(
    origin_id: str,
    learner: Learner = Depends(require_learner),
    db: Session = Depends(get_db),
):
    """One origin, or 404 if unknown, withdrawn or scheduled after today."""
    _day, origin, routes, sources = svc.get_for(db, origin_id, learner)
    if origin is None:
        raise HTTPException(status_code=404, detail="unknown word")
    return _origin_to_response(origin, routes, sources)
