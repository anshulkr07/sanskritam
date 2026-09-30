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


class AskRequest(BaseModel):
    surface: str = Field(description="The screen the learner is on (e.g. 'grammar', 'shloka', 'challenge')")
    subject: str = Field(
        default="",
        description="The thing on that screen: a sandhi pair, a word form, a verse line. "
                    "May be empty when the learner asks a general question.",
    )
    question: str = Field(default="", description="What the learner typed, if anything")


class AskResponse(BaseModel):
    routed_to: str = Field(description="'engine' | 'llm' | 'cache' | 'engine_fallback'")
    explanation: str = Field(description="Human-readable answer; for engine answers, a rendered summary")
    engine: dict = Field(default_factory=dict, description="Structured engine answer (blocks), when routed_to='engine'")
    source: str = Field(default="", description="'llm' | 'engine' | 'cache' — for metrics")
    provider: str = ""
    cached: bool = False


# ── P19-3: the answer cache ──────────────────────────────────────────────────
# In-process, keyed by (surface, subject, normalised question). Twenty learners
# stuck on the same join ask the same thing; only the first call costs money.

_CACHE_MAX = 512
_cache: dict[tuple[str, str, str], dict] = {}


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


def _cache_key(surface: str, subject: str, question: str) -> tuple[str, str, str]:
    return (surface.strip().lower(), subject.strip(), _norm_question(question))


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
    if not subject and not question:
        raise HTTPException(status_code=422, detail="Ask a question or say what you are looking at.")

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
    #    a question about meaning or saying goes to the model.
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
            }
            _cache_put(key, payload)
            metrics_note("engine")
            return AskResponse(**payload)

    # 3. LLM path (P19-1) — metered, session-free, reply_language resolved
    #    server-side. The engine path above is an ADDITION to this, not a
    #    replacement; open-ended questions still reach the model.
    language = reply_language(question, learner.bridge_langs)
    try:
        check_and_consume(db, learner, "llm_calls", 1, surface="explain")
    except QuotaExceeded as exc:
        if not subject:
            # A general question has no text of its own to fall back to, so
            # say so plainly (the app shows a short try-again message).
            raise HTTPException(status_code=429, detail="Today's explanations are used up. Try again tomorrow.")
        # P19-3: degrade honestly when the daily quota is spent — the subject
        # itself plus its IAST, never a blank and never a broken-button lie.
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
        }
        _cache_put(key, payload)  # no LLM spend to replay; caching is free
        metrics_note("fallback")
        return AskResponse(**payload)

    explainer = get_explainer()
    if subject:
        # Hand the model the IAST reading when the subject is Devanagari, so
        # "How do I say it?" is answered from the deterministic transliteration
        # rather than from the model's memory.
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
        text = await explainer.answer(question, language=language)
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
        }
        _cache_put(key, payload)
        metrics_note("llm")
        return AskResponse(**payload)

    # Model failed/empty — refund and say so honestly (§2.11: never silence).
    refund_quota(db, learner, "llm_calls", 1, surface="explain", reason="downstream_failure")
    raise HTTPException(status_code=503, detail="Explanation unavailable right now. Try again in a moment.")
