"""P19 — Ask anywhere: a session-free explain endpoint.

Most of this phase already existed (``services/explainer.py``, the provider,
quota accounting, ``reply_language()``) — reachable from exactly one screen.
What was missing was a way to call the explainer that is NOT a conversation.

P19-1: ``POST /explain`` takes ``{surface, subject, question}`` — the screen
the learner is on, the thing on it, and what they typed. No session required.
It explains ALREADY-AUTHORED text and never invents Sanskrit (no Vidyut gate
on this path, §12).

P19-2: engine-first routing (``services/ask_engine.py``). A grammar question
is answered by sandhi/prakriya/chandas/cheda deterministically at ₹0; the LLM
answers meaning questions. The derivation is an ADDITION to the LLM path,
never a replacement, and a fall-through to the model is recorded in the
response metadata so the split is measurable.

P19-3: survivable at 400 calls/day — answers are cached by
``(surface, subject, normalised question)``; a repeated identical question
costs one call; quota exhaustion DEGRADES to the engine answer (or the
authored text alone) with an honest note, never to a blank (§2.11).
"""

from __future__ import annotations

import logging
import re

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth import require_learner
from app.db import get_db
from app.models import Learner
from app.services import ask_engine
from app.services.explainer import get_explainer, reply_language
from app.services.quota import QuotaExceeded, check_and_consume, refund_quota

logger = logging.getLogger("shabd.ask")

router = APIRouter(prefix="/explain")


class AskPlace(BaseModel):
    lat: float = 0.0
    lon: float = 0.0
    tz: str = ""
    label: str = ""


class AskRequest(BaseModel):
    surface: str = Field(description="The screen the learner is on (e.g. 'grammar', 'shloka', 'challenge')")
    subject: str = Field(
        default="",
        description="The thing on that screen: a sandhi pair, a word form, a verse line. "
                    "May be empty when the learner asks a general question.",
    )
    question: str = Field(default="", description="What the learner typed, if anything")
    screen_text: str = Field(default="", description="Text read on-device from the screen, at most 2000 chars")
    place: AskPlace | None = Field(default=None, description="Approximate place for calendar math, body only")
    cards: bool = Field(default=False, description="The app can render a card")


class AskResponse(BaseModel):
    routed_to: str = Field(description="'engine' | 'llm' | 'cache' | 'engine_fallback'")
    explanation: str = Field(description="Human-readable answer; for engine answers, a rendered summary")
    engine: dict = Field(default_factory=dict, description="Structured engine answer (blocks), when routed_to='engine'")
    source: str = Field(default="", description="'llm' | 'engine' | 'cache' — for metrics")
    provider: str = ""
    cached: bool = False
    card: dict | None = Field(default=None, description="Shaped wider answer, when cards=true")


# ── P19-3: the answer cache ──────────────────────────────────────────────────
# In-process, keyed by (surface, subject, normalised question). Twenty learners
# stuck on the same join ask the same thing; only the first call costs money.
# For an answer that used calculated facts, the learner-local date and the
# place rounded to one decimal join the key, or a tithi answer would replay
# tomorrow.

_CACHE_MAX = 512
_cache: dict[tuple[str, ...], dict] = {}


def _norm_question(q: str) -> str:
    return re.sub(r"\s+", " ", (q or "").strip().casefold())


# ── which questions the grammar engines answer ───────────────────────────────
# The engines parse a word or split a join, whatever was asked. That is right
# for "why does it end like this?" and wrong for "What does this mean?", which
# would get a derivation and no meaning. So a question about meaning, saying or
# usage goes to the model, unless it also names a grammar term. No question at
# all (the tap-to-explain case) keeps the engine-first behaviour.

_MEANING_Q = re.compile(
    r"\b(mean|means|meaning|translat\w*|say|pronounc\w*|example|sentence|use|used)\b", re.I
)
_GRAMMAR_Q = re.compile(
    r"\b(grammar|case|cases|ending|endings|tense|sandhi|split|parse|derive|derivation|"
    r"declen\w*|conjugat\w*|form|root|stem|metre|meter|scan\w*)\b",
    re.I,
)
_DEVANAGARI = re.compile("[ऀ-ॿ]")


def wants_engine(question: str) -> bool:
    """True when the grammar engines should try before the model."""
    q = (question or "").strip()
    if not q:
        return True
    if _GRAMMAR_Q.search(q):
        return True
    return not _MEANING_Q.search(q)


def _cache_key(surface: str, subject: str, question: str, extra: str = "") -> tuple[str, ...]:
    base = (surface.strip().lower(), subject.strip(), _norm_question(question))
    return base if not extra else base + (extra,)


def _cache_get(key) -> dict | None:
    hit = _cache.get(key)
    if hit is not None:
        # refresh recency
        _cache[key] = _cache.pop(key)
    return hit


def _cache_put(key, value: dict) -> None:
    _cache[key] = value
    if len(_cache) > _CACHE_MAX:
        _cache.pop(next(iter(_cache)))


# ── P19-3: cache-hit rate is measurable, not assumed ─────────────────────────

_counters = {"cache_hit": 0, "engine": 0, "llm": 0, "fallback": 0}


def metrics_note(kind: str) -> None:
    try:
        _counters[kind] = _counters.get(kind, 0) + 1
    except Exception:
        pass


def explain_metrics() -> dict:
    """Cache-hit rate and routing split — surfaced via GET /admin/metrics."""
    total = _counters["engine"] + _counters["llm"] + _counters["fallback"]
    hits = _counters["cache_hit"]
    return {
        "explain_requests": total + hits,
        "explain_engine_answers": _counters["engine"],
        "explain_llm_answers": _counters["llm"],
        "explain_engine_fallbacks": _counters["fallback"],
        "explain_cache_hits": hits,
        "explain_cache_hit_rate": round(hits / (total + hits), 4) if (total + hits) else 0.0,
        "explain_cache_entries": len(_cache),
    }


# ── rendering ────────────────────────────────────────────────────────────────

_CALENDAR_Q = re.compile(
    r"tithi|panchang|panchangam|nakshatra|nakshatram|yoga\b|karana|today|aaj|आज|"
    r"when is|kab hai|कब|muhurta|muhurtam|sunrise|sunset|moonrise|vrat|vrata|"
    r"festival|utsav|parva",
    re.I,
)

_DELHI = {"lat": 28.6139, "lon": 77.2090, "tz": "Asia/Kolkata", "label": "New Delhi"}


def _resolve_place(place: AskPlace | None) -> tuple[dict, bool]:
    """Approximate place for calendar math. Returns (place_dict, place_needed).

    With no place in the request, calculate for New Delhi and set
    place_needed True. The server uses the place for the calculation and
    never stores or logs it.
    """
    if place is not None and (place.lat or place.lon):
        try:
            lat = round(float(place.lat), 1)
            lon = round(float(place.lon), 1)
        except (TypeError, ValueError):
            lat, lon = _DELHI["lat"], _DELHI["lon"]
        tz = (place.tz or "Asia/Kolkata").strip() or "Asia/Kolkata"
        label = (place.label or "").strip() or "Your place"
        return {"lat": lat, "lon": lon, "tz": tz, "label": label}, False
    return dict(_DELHI), True


def _find_festival_in_text(text: str) -> dict | None:
    from app.services import panchang as _panchang

    q = (text or "").casefold()
    if not q:
        return None
    for row in _panchang._FESTIVALS:
        names = [row["name"].casefold(), *[a.casefold() for a in row.get("aliases", [])]]
        for n in names:
            if n and n in q:
                return row
    return None


def _fmt_day(d) -> str:
    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    return f"{d.day} {months[d.month - 1]} {d.year}"


def _build_facts(question: str, screen_text: str, place: dict) -> tuple[str, str, str, str, str]:
    """Calendar FACTS for the model, plus when_text, when_note, date_str, place_key.

    Returns empty facts when the question is not about the calendar. Never
    raises: a calculation failure means no FACTS, and the model is told it
    cannot calculate that yet.
    """
    from datetime import datetime
    from zoneinfo import ZoneInfo
    from app.services import panchang as _panchang

    combined = f"{question} {screen_text}"
    if not _CALENDAR_Q.search(combined) and _find_festival_in_text(combined) is None:
        return "", "", "", "", ""
    tzname = place.get("tz") or "Asia/Kolkata"
    try:
        zone = ZoneInfo(tzname)
    except Exception:
        zone = ZoneInfo("Asia/Kolkata")
        tzname = "Asia/Kolkata"
    today = datetime.now(zone).date()
    date_str = today.isoformat()
    place_key = f"{round(float(place.get('lat', 0)), 1)},{round(float(place.get('lon', 0)), 1)}"
    label = place.get("label") or "New Delhi"
    try:
        d = _panchang.day(today, place)
    except Exception:
        return "", "", "", date_str, place_key
    fest_row = _find_festival_in_text(combined)
    fest_line = ""
    when_text = _fmt_day(today)
    if fest_row is not None:
        try:
            for yr in (today.year, today.year + 1):
                try:
                    occ = _panchang.festival(fest_row["name"], yr, place)
                except LookupError:
                    continue
                if isinstance(occ, tuple):
                    start, end = occ
                    if end >= today:
                        fest_line = f"- {fest_row['name']}: {_fmt_day(start)} to {_fmt_day(end)}."
                        when_text = f"{_fmt_day(start)} to {_fmt_day(end)}"
                        break
                else:
                    if occ >= today:
                        fest_line = f"- {fest_row['name']}: {_fmt_day(occ)}."
                        when_text = _fmt_day(occ)
                        break
            else:
                fest_line = f"- {fest_row['name']}: cannot calculate that yet."
        except Exception:
            fest_line = f"- {fest_row['name']}: cannot calculate that yet."
    when_note = f"For {label}"
    today_line = (
        f"- Today, {_fmt_day(today)}: {d.get('tithi', '')} until {d.get('tithi_end', '')}, "
        f"then {d.get('tithi_next', '')}. Month {d.get('month_purnimanta', '')} (Purnimanta)."
    )
    facts = (
        f"FACTS (calculated for {label}; use exactly as given, never change or add to them):\n"
        f"{today_line}"
        + (f"\n{fest_line}" if fest_line else "")
    )
    return facts, when_text, when_note, date_str, place_key


def _render_engine_answer(ans: dict) -> str:
    """Flatten the structured engine answer into readable prose. The blocks
    stay available in ``engine`` for the client's derivation renderer."""
    parts: list[str] = []
    for b in ans.get("blocks", []):
        kind = b.get("kind")
        if kind == "parse":
            stem = b.get("stem") or ""
            feat = b.get("feature") or ""
            parts.append(f"{b.get('word', '')} ({b.get('iast', '')}) — {stem} {feat}".strip())
            der = b.get("derivation")
            if der and der.get("steps"):
                parts.append("Derivation:")
                for s in der["steps"]:
                    sutra = s.get("sutra") or ""
                    code = s.get("code", "")
                    step = f"  {code} {sutra}".strip() if (code or sutra) else ""
                    if step:
                        parts.append(step)
                    parts.append(f"    → {s.get('result', '')}")
        elif kind == "split":
            parts.append(f"{b.get('joined', '')} splits as:")
            for s in b.get("splits", []):
                parts.append(f"  {s.get('first', '')} + {s.get('second', '')}"
                             f"  ({s.get('first_iast', '')} + {s.get('second_iast', '')})")
        elif kind == "scansion":
            for i, line in enumerate(b.get("lines", []), 1):
                weights = " ".join(s.get("weight", "") for s in line.get("syllables", []))
                syls = " ".join(s.get("syllable_devanagari", "") for s in line.get("syllables", []))
                parts.append(f"Line {i}: {syls}")
                parts.append(f"        {weights}")
            if b.get("metre"):
                parts.append(f"Metre: {b['metre']}")
    return "\n".join(p for p in parts if p)


# ── the endpoint ─────────────────────────────────────────────────────────────

@router.post("", response_model=AskResponse)
async def ask_explain(
    req: AskRequest,
    learner: Learner = Depends(require_learner),
    db: Session = Depends(get_db),
):
    subject = (req.subject or "").strip()
    question = (req.question or "").strip()
    screen_text = (req.screen_text or "")[:2000].strip()
    wants_cards = bool(req.cards)
    if not subject and not question and not screen_text:
        raise HTTPException(status_code=422, detail="Ask a question or say what you are looking at.")

    # The new card path is taken when cards is true and either there is no
    # subject or screen_text is present. The engine-first path for a Sanskrit
    # subject stays exactly as it is.
    use_cards = wants_cards and (not subject or bool(screen_text))

    place_dict, place_needed = _resolve_place(req.place)
    facts, when_text, when_note, date_str, place_key = _build_facts(
        question or subject, screen_text, place_dict
    )
    has_facts = bool(facts)
    if use_cards and has_facts:
        key = _cache_key(req.surface, subject, question or screen_text, f"cards:{date_str}:{place_key}")
    elif use_cards:
        key = _cache_key(req.surface, subject, question or screen_text, "cards")
    else:
        key = _cache_key(req.surface, subject, question)

    # 1. Cache first — a repeated question costs nothing.
    cached = _cache_get(key)
    if cached is not None:
        resp = dict(cached)
        resp["cached"] = True
        metrics_note("cache_hit")
        return AskResponse(**resp)

    # 2. Engine-first routing (P19-2) — grammar questions cost ₹0 and are
    #    never metered (§2.9). A general question has no subject to parse, and
    #    a question about meaning or saying goes to the model. The card path
    #    skips the engine: a shaped wider answer, not a derivation.
    if not use_cards:
        ans = ask_engine.route(req.surface, subject, question) if (subject and wants_engine(question)) else None
        if ans is not None:
            rendered = _render_engine_answer(ans)
            if rendered:
                payload = {
                    "routed_to": "engine",
                    "explanation": rendered,
                    "engine": dict(ans),
                    "source": "engine",
                    "provider": "",
                    "card": None,
                }
                _cache_put(key, payload)
                metrics_note("engine")
                return AskResponse(**payload)

    # 3. LLM path — metered, session-free, reply_language resolved
    #    server-side. One llm_calls unit per answer, card or prose.
    language = reply_language(question or screen_text or subject, learner.bridge_langs)
    try:
        check_and_consume(db, learner, "llm_calls", 1, surface="explain")
    except QuotaExceeded as exc:
        if not subject:
            raise HTTPException(status_code=429, detail="Today's explanations are used up. Try again tomorrow.")
        from app.services.iast import to_iast as _to_iast

        subject_iast = _to_iast(subject)
        note = (
            "Today's explanation quota is used up, so here is the text itself: "
            f"{subject}"
            + (f" ({subject_iast})" if subject_iast and subject_iast != subject else "")
        )
        payload = {
            "routed_to": "engine_fallback",
            "explanation": note,
            "engine": {"routed_to": "engine_fallback", "title": "Subject",
                       "blocks": [{"kind": "info", "text": subject}], "subject": subject},
            "source": "engine_fallback",
            "provider": "",
            "card": None,
        }
        _cache_put(key, payload)
        metrics_note("fallback")
        return AskResponse(**payload)

    explainer = get_explainer()

    # 3a. Card path: shaped wider answer with FACTS. The model never writes
    # `when`; the server sets it from the same calculated facts. A broken
    # JSON falls back to the prose path with card null.
    if use_cards:
        from app.services.explainer import flatten_card as _flatten

        card_raw = await explainer.answer_card(
            question or "What does this mean?",
            language=language,
            facts=facts,
            screen_text=screen_text,
        )
        if card_raw is not None:
            when = {"text": when_text, "note": when_note} if (when_text or has_facts) else {"text": "", "note": ""}
            card = {
                "title": card_raw.get("title", ""),
                "title_sa": card_raw.get("title_sa", ""),
                "title_iast": card_raw.get("title_iast", ""),
                "when": when,
                "summary": card_raw.get("summary", ""),
                "sections": card_raw.get("sections", []),
                "terms": card_raw.get("terms", []),
                "caution": card_raw.get("caution", ""),
                "place_needed": place_needed if has_facts else False,
            }
            explanation = _flatten(card_raw, when_text if has_facts else "", when_note if has_facts else "")
            if not explanation:
                explanation = card_raw.get("summary", "") or "Here is what I found."
            try:
                provider = explainer._get_provider().label
            except Exception:
                provider = ""
            payload = {
                "routed_to": "llm",
                "explanation": explanation,
                "engine": {},
                "source": "llm",
                "provider": provider,
                "card": card,
            }
            _cache_put(key, payload)
            metrics_note("llm")
            return AskResponse(**payload)
        # Parsing failed: fall through to the prose path with card null.

    if subject and not use_cards:
        iast = ""
        if _DEVANAGARI.search(subject):
            try:
                from app.services.iast import to_iast as _to_iast_llm

                iast = _to_iast_llm(subject) or ""
            except Exception:
                iast = ""
        text = await explainer.explain(
            subject,
            iast=iast,
            question=question,
            language=language,
            answer_question=True,
        )
    else:
        text = await explainer.answer(question or screen_text or subject, language=language)
    if text:
        provider = ""
        try:
            provider = explainer._get_provider().label
        except Exception:
            pass
        payload = {
            "routed_to": "llm",
            "explanation": text,
            "engine": {},
            "source": "llm",
            "provider": provider,
            "card": None,
        }
        _cache_put(key, payload)
        metrics_note("llm")
        return AskResponse(**payload)

    refund_quota(db, learner, "llm_calls", 1, surface="explain", reason="downstream_failure")
    raise HTTPException(status_code=503, detail="Explanation unavailable right now. Try again in a moment.")
