"""POST /ask/talk and /ask/talk/stream: one question in Talk's Ask mode.

The phone keeps the thread and sends the last few questions and answers with
each new one; the server keeps no thread. Order of work:

1. settle the answer's language (services/lang_detect.py, as Talk does);
2. calculate what code can: the day's FACTS for the learner's place, a
   CHART when birth details came with the question, and a MATCH (gun milan)
   when a partner's details came too;
3. serve a stored answer when the question is about the world, not the
   asker, and someone has asked it before;
4. otherwise ask Gemini (services/ask_live.py), or the old Sarvam card when
   Gemini cannot answer;
5. check every verse and link the answer cites (services/ask_sources.py);
6. store it for the next learner when it may be shared.

``/ask/talk/stream`` does the same as server-sent events: ``partial`` cards
while Gemini writes (title, summary and sections; verses and links only once
checked), then one ``final`` with the whole response, or an ``error``.

Birth details are used for the calculation and never stored or logged.
"""

from __future__ import annotations

import asyncio
import json
import logging
import time
from dataclasses import dataclass, field
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth import require_learner
from app.config import settings
from app.db import SessionLocal, get_db
from app.models import Learner
from app.services import ask_facts, ask_live, ask_route, ask_sources, book_search, kundli, lang_detect, milan
from app.services.explainer import get_explainer
from app.services.quota import QuotaExceeded, check_and_consume, refund_quota
from app.services.verse_study import load_answer, save_answer

logger = logging.getLogger("shabd.ask_talk")

from app.commerce.metering import CommerceRoute
router = APIRouter(prefix="/ask", route_class=CommerceRoute)

#: The ask_answers rows this route keeps are filed under this subject.
STORE_SUBJECT = "__ask__"


class Turn(BaseModel):
    q: str = Field(default="", max_length=1500)
    a: str = Field(default="", max_length=2500)


class Place(BaseModel):
    lat: float = 0.0
    lon: float = 0.0
    tz: str = ""
    label: str = ""


class Birth(BaseModel):
    date: str = Field(description="YYYY-MM-DD, local to the birth place")
    time: str = Field(default="", description="HH:MM, 24-hour, local to the birth place")
    time_known: bool = True
    lat: float
    lon: float
    tz: str = "Asia/Kolkata"
    label: str = ""


class TalkRequest(BaseModel):
    question: str = Field(..., max_length=1000)
    history: list[Turn] = Field(default_factory=list, max_length=12)
    lang: Optional[str] = Field(default=None, description="The thread's language so far, ISO 639-1")
    stt_lang: Optional[str] = Field(default=None, description="Saaras' language code for a voice question")
    place: Optional[Place] = None
    birth: Optional[Birth] = None
    partner: Optional[Birth] = Field(default=None, description="The other person, for gun milan")
    asker_is: Optional[Literal["boy", "girl"]] = Field(
        default=None, description="Which side of the match the asker is; the partner is the other")
    tradition: Optional[str] = Field(default=None, description="The learner's Kala tradition for month lists")


class TalkResponse(BaseModel):
    card: Optional[dict] = None
    explanation: str = ""
    lang: str = "en"
    script: str = "latin"
    routed_to: str = Field(default="llm", description="'llm' | 'cache' | 'fallback'")
    cached: bool = False
    needs: str = Field(default="", description="'birth' or 'partner' when a reading needs those details")
    provider: str = ""
    chart: Optional[dict] = Field(default=None, description="The calculated chart, when birth details came")
    match: Optional[dict] = Field(default=None, description="The calculated gun milan, when a partner came")


def chart_view(c: dict) -> dict:
    """What the phone draws: the lagna, the nine grahas, the running dasha."""
    lg = c.get("lagna")
    return {
        "time_known": c["time_known"],
        "lagna": {k: lg[k] for k in ("sign_en", "sign_sa", "sign_roman", "deg", "nakshatra", "pada")} if lg else None,
        "planets": [
            {k: p[k] for k in ("key", "name", "name_sa", "sign_en", "sign_sa", "sign_roman", "deg",
                                "house", "nakshatra", "pada", "retro", "dignity")}
            for p in c["planets"]
        ],
        "moon_sign_en": c["moon_sign_en"],
        "moon_sign_sa": c["moon_sign_sa"],
        "nakshatra": c["nakshatra"],
        "pada": c["pada"],
        "dasha": {"maha": c["dasha"]["maha"], "antar": c["dasha"]["antar"]},
        "conventions": c["conventions"],
    }


def _chart_of(b: Birth) -> dict:
    try:
        born = kundli.birth_moment(b.date, b.time, b.tz, b.time_known)
        return kundli.chart(born, float(b.lat), float(b.lon), time_known=b.time_known)
    except kundli.BirthError as exc:
        raise HTTPException(status_code=422, detail=str(exc))


@dataclass
class Prepared:
    """Everything worked out before any model is asked."""

    question: str
    history: list[tuple[str, str]]
    lang: lang_detect.Language
    how: str
    language: str
    facts: str
    when_text: str
    when_note: str
    place_needed: bool
    chart: Optional[dict] = None
    chart_text: str = ""
    match: Optional[dict] = None
    match_text: str = ""
    store: bool = False
    key: str = ""
    books: str = ""                     # the verses book search found, as the model reads them
    book_hits: list = field(default_factory=list)
    books_named: list = field(default_factory=list)
    refs_asked: list = field(default_factory=list)
    searched: bool = False              # the search ran and found its way (no embedding error)
    lane: str = ""                      # which free Gemini model goes first (services/ask_route.py)
    started: float = field(default_factory=time.perf_counter)


async def _prepare(req: TalkRequest) -> Prepared:
    question = (req.question or "").strip()
    from app.services.ai_safety import check_input
    check_input(question)
    if not question:
        raise HTTPException(status_code=422, detail="Ask a question.")
    code, how = await lang_detect.resolve_language(question, sticky=req.lang, stt_hint=req.stt_lang)

    if req.place is not None:
        place, place_needed = ask_facts.resolve_place(req.place.lat, req.place.lon, req.place.tz,
                                                     req.place.label, given=True)
    else:
        place, place_needed = ask_facts.resolve_place()
    tradition = ask_facts.norm_tradition(req.tradition or "")
    facts, when_text, when_note, date_str, place_key = ask_facts.calendar_facts(
        question, "", place, tradition)

    p = Prepared(
        question=question,
        history=[(t.q, t.a) for t in req.history if (t.q or "").strip()],
        lang=lang_detect.get(code), how=how, language=lang_detect.order_phrase(code),
        facts=facts, when_text=when_text, when_note=when_note, place_needed=place_needed,
    )
    if req.birth is not None:
        p.chart = _chart_of(req.birth)
        p.chart_text = kundli.facts_text(p.chart)
        if ask_facts.is_daily_question(question):
            try:
                p.chart_text += "\n" + kundli.daily_text(p.chart)
            except Exception:
                pass
    if req.birth is not None and req.partner is not None:
        other = _chart_of(req.partner)
        asker = req.asker_is or "boy"
        boy, girl = (p.chart, other) if asker == "boy" else (other, p.chart)
        p.match = milan.match(boy, girl)
        p.match_text = milan.facts_text(p.match, asker_is=asker)

    # A question about the world, asked before, costs nothing.
    p.store = not p.history and p.chart is None and ask_live.shareable(question)
    extra = f"{date_str}|{place_key}" if facts else ""
    if facts and "MONTHS" in facts:
        extra = f"{extra}|{tradition}" if extra else tradition
    p.key = ask_live.store_key(question, extra)
    return p


async def _find_books(db: Session, p: Prepared) -> None:
    """Search the books the app holds for this question (services/book_search.py)
    and keep the verses for the model. Off unless BOOK_SEARCH_ENABLED; asked only
    after the stored-answer check, so a repeated question costs no embedding. A
    failure leaves the question to be answered without them."""
    if not settings.book_search_enabled:
        _route(p)
        return
    # A follow-up often names nothing, so the question before it is searched too.
    query = (p.history[-1][0] + "\n" if p.history else "") + p.question
    try:
        res = await book_search.search(db, query)
    except Exception as exc:  # noqa: BLE001 — never block an answer on the search
        logger.warning("[ask] book search failed: %s", type(exc).__name__)
        _route(p)
        return
    p.book_hits = res.hits
    p.books = book_search.books_block(res.hits)
    p.books_named, p.refs_asked, p.searched = res.books_named, res.refs_asked, not res.error
    logger.info("[ask] book search hits=%d named=%s refs=%s embed=%.0fms search=%.0fms error=%s",
                len(res.hits), res.books_named, res.refs_asked, res.embed_ms, res.search_ms, res.error or "-")
    _route(p)


def _route(p: Prepared) -> None:
    """Choose the free Gemini model order for this question (services/ask_route.py)."""
    r = ask_route.lane(p.question, history=p.history, facts=p.facts, chart=p.chart_text, match=p.match_text,
                       hits=p.book_hits, books_named=p.books_named, refs_asked=p.refs_asked,
                       searched=p.searched)
    p.lane = r.lane
    if p.searched:
        logger.info("[ask] lane=%s (%s)", r.lane, r.why)


def _respond(p: Prepared, card: Optional[dict], routed: str, provider: str = "",
             cached: bool = False) -> TalkResponse:
    needs = ""
    if card and card.get("needs_birth") and p.chart is None:
        needs = "birth"
    elif card and card.get("needs_partner") and p.match is None:
        needs = "partner"
    if card is not None and p.facts:
        card["when"] = {"text": p.when_text, "note": p.when_note}
        card["place_needed"] = p.place_needed
    return TalkResponse(
        card=card,
        explanation=ask_live.flatten(card) if card else "",
        lang=p.lang.code,
        script=p.lang.script,
        routed_to=routed,
        cached=cached,
        needs=needs,
        provider=provider,
        chart=chart_view(p.chart) if p.chart else None,
        match=p.match,
    )


def _stored(db: Session, p: Prepared) -> Optional[TalkResponse]:
    if not p.store:
        return None
    hit = load_answer(db, STORE_SUBJECT, p.key, p.lang.code)
    if hit and ask_live.has_content(hit.get("card")):
        logger.info("[ask] stored answer lang=%s total=%.0fms", p.lang.code,
                    (time.perf_counter() - p.started) * 1000)
        return _respond(p, hit["card"], "cache", hit.get("provider", ""), cached=True)
    return None


async def _finish(db: Session, p: Prepared, card: dict, routed: str, provider: str) -> TalkResponse:
    """Check the answer's verses and links, keep it when it may be shared."""
    from app.services.ai_safety import check_output
    check_output(ask_live.flatten(card), db)
    ask_sources.mark_stored(db, card)
    book_search.restore_refs(card, p.book_hits)
    counts = await asyncio.to_thread(ask_sources.check_card, card)
    ask_live.finalize_more(card)
    if p.store and routed == "llm" and not card.get("needs_birth") and not card.get("needs_partner"):
        save_answer(db, STORE_SUBJECT, p.key, p.lang.code, {"card": card, "provider": provider}, provider)
    logger.info(
        "[ask] answered lang=%s(%s) routed=%s facts=%s chart=%s match=%s turns=%d verses=%d/%d "
        "sources=%d/%d total=%.0fms",
        p.lang.code, p.how, routed, bool(p.facts), p.chart is not None, p.match is not None,
        len(p.history), counts["verses_kept"], counts["verses"], counts["sources_kept"], counts["sources"],
        (time.perf_counter() - p.started) * 1000,
    )
    return _respond(p, card, routed, provider)


def _context(p: Prepared) -> str:
    return p.facts + "".join("\n" + t for t in (p.chart_text, p.match_text) if t)


async def _fallback(db: Session, learner: Learner, p: Prepared) -> Optional[dict]:
    """The old Sarvam card, metered as before, for when Gemini cannot answer."""
    try:
        check_and_consume(db, learner, "llm_calls", 1, surface="ask")
    except QuotaExceeded as exc:
        from app.services.quota import budget_message, BUDGET_KIND
        message = budget_message(exc.kind) if exc.kind == BUDGET_KIND else "Today's questions are used up. Try again tomorrow."
        raise HTTPException(status_code=429, detail={"kind": exc.kind, "message": message, "retry_after_s": exc.retry_after_s})
    old = await get_explainer().answer_card(p.question, language=p.language, facts=_context(p))
    if not old:
        refund_quota(db, learner, "llm_calls", 1, surface="ask", reason="downstream_failure")
        return None
    return ask_live.from_old_card(old)


@router.post("/talk", response_model=TalkResponse)
async def ask_talk(
    req: TalkRequest,
    learner: Learner = Depends(require_learner),
    db: Session = Depends(get_db),
):
    p = await _prepare(req)
    hit = _stored(db, p)
    if hit is not None:
        from app.services.ai_safety import check_output
        check_output(hit.explanation, db)
    if hit is not None:
        return hit

    card: Optional[dict] = None
    routed, provider = "llm", ""
    await _find_books(db, p)
    got = await ask_live.ask(db, learner, p.question, p.language, history=p.history,
                             facts=p.facts, chart=p.chart_text, match=p.match_text, books=p.books,
                             lane=p.lane, surface="ask")
    if got is not None:
        card, provider = ask_live.clip(got[0]), got[1]
    if not ask_live.has_content(card):
        card, routed, provider = await _fallback(db, learner, p), "fallback", ""
    if not ask_live.has_content(card):
        raise HTTPException(status_code=503, detail="No answer right now. Try again in a moment.")
    return await _finish(db, p, card, routed, provider)


def _event(payload: dict) -> str:
    return "data: " + json.dumps(payload, ensure_ascii=False) + "\n\n"


@router.post("/talk/stream")
async def ask_talk_stream(
    req: TalkRequest,
    learner: Learner = Depends(require_learner),
    db: Session = Depends(get_db),
):
    """The same answer as /ask/talk, sent while it is written (text/event-stream)."""
    p = await _prepare(req)            # a bad request still fails with its own status
    hit = _stored(db, p)
    if hit is not None:
        from app.services.ai_safety import check_output
        check_output(hit.explanation, db)
    learner_id = learner.id

    async def events():
        if hit is not None:
            yield _event({"type": "final", "response": hit.model_dump()})
            return
        # The request's session may close before a stream ends; this one
        # lives as long as the stream does.
        own = SessionLocal()
        try:
            me = own.get(Learner, learner_id)
            raw, provider = None, ""
            await _find_books(own, p)
            async for ev in ask_live.ask_stream(own, me, p.question, p.language, history=p.history,
                                                facts=p.facts, chart=p.chart_text, match=p.match_text,
                                                books=p.books, lane=p.lane, surface="ask"):
                if ev["type"] == "partial":
                    pass  # Deliver only the final answer after server safety checks.
                elif ev["type"] == "done":
                    raw, provider = ev["data"], ev["provider"]
            card = ask_live.clip(raw) if raw else None
            routed = "llm"
            if not ask_live.has_content(card):
                try:
                    card, routed, provider = await _fallback(own, me, p), "fallback", ""
                except HTTPException as exc:
                    yield _event({"type": "error", "status": exc.status_code, "detail": exc.detail})
                    return
            if not ask_live.has_content(card):
                yield _event({"type": "error", "status": 503, "detail": "No answer right now. Try again in a moment."})
                return
            resp = await _finish(own, p, card, routed, provider)
            yield _event({"type": "final", "response": resp.model_dump()})
        except QuotaExceeded as exc:
            from app.services.quota import budget_message
            yield _event({"type": "error", "status": 429, "detail": budget_message(exc.kind)})
        except HTTPException as exc:
            yield _event({"type": "error", "status": exc.status_code, "detail": exc.detail})
        except Exception as exc:  # noqa: BLE001 — the phone gets an error event, not a cut stream
            logger.warning("ask stream broke: %s", type(exc).__name__)
            yield _event({"type": "error", "status": 500, "detail": "Something went wrong. Try again."})
        finally:
            own.close()

    return StreamingResponse(
        events(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
