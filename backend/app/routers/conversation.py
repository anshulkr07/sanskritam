"""Conversation runtime router: start, turn, escape-log endpoints.

Schemas are defined here (NOT in app/schemas.py per build deltas).
"""

from __future__ import annotations

import logging
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth import require_learner
from app.config import settings
from app.db import get_db
from app.models import (
    DialogueEdge,
    DialogueScenario,
    DialogueNode,
    EscapeLog,
    Learner,
)
from app.services.explainer import get_explainer, reply_language
from app.services.meta_intent import detect_meta_intent
from app.services.quota import QuotaExceeded, check_and_consume, refund_quota
from app.services.session_store import create_session, get_session
from app.services.turn_loop import process_turn
from app.services.tutor import (
    get_tutor,
    history_for_prompt,
    record_turn,
    situation as tutor_situation,
    target_features,
)

logger = logging.getLogger("shabd.conversation")

router = APIRouter()


# ─── Pydantic schemas ────────────────────────────────────────────────────


class StartRequest(BaseModel):
    scenario_id: Optional[str] = Field(default=None, description="Scenario ID, or None for first by created_at")
    mode: Optional[str] = Field(
        default=None,
        description=(
            "'llm' (default) for the free-form tutor — any grammatical answer "
            "is accepted and Vidyut gates the Sanskrit; 'graph' for the "
            "authored dialogue graph, kept as the fallback when the model is "
            "unavailable. Falls back to 'graph' automatically if the tutor is "
            "disabled or unconfigured."
        ),
    )


class NodeOut(BaseModel):
    id: str
    kind: str
    lang: str
    devanagari: str
    iast: str = ""
    gloss: str = ""
    audio_url: str = ""
    repair_type: Optional[str] = None


class EdgeOut(BaseModel):
    id: str
    lang: str
    expected_text: str = ""
    features: list[str] = []


class ScenarioOut(BaseModel):
    id: str
    title: str
    description: str = ""
    register: str = ""
    est_minutes: int = 5
    node_count: int = 0


class ScenarioListResponse(BaseModel):
    scenarios: list[ScenarioOut]


class ScenarioDetail(BaseModel):
    id: str
    title: str
    description: str = ""
    est_minutes: int = 5


class StartResponse(BaseModel):
    session_id: str
    scenario: ScenarioDetail
    node: NodeOut
    edges: list[EdgeOut]
    mode: str = "graph"


class TurnRequest(BaseModel):
    session_id: str
    edge_id: Optional[str] = Field(default=None, description="Optional client-pinned edge ID")
    transcript: str = Field(..., description="Learner's utterance in any language (Sanskrit graded by features; bridge replies routed by the LLM edge-router)")


class TurnResponse(BaseModel):
    verdict: str
    diagnosis: str
    matched: bool
    node: Optional[NodeOut] = None
    edges: list[EdgeOut] = []
    session_done: bool = False
    escape: bool = False
    ratio_hint: float = 0.3
    mode: str = "graph"
    correction: str = Field(
        default="",
        description=(
            "LLM mode only: at most one short grammar note about the "
            "learner's line, raised only when Vidyut found a real error. An "
            "unknown word (a name) is never a correction."
        ),
    )
    degraded: bool = Field(
        default=False,
        description="LLM mode only: the model was unreachable and this turn is a stand-in.",
    )
    meta_intent: Optional[str] = Field(
        default=None,
        description=(
            "Set when the learner asked ABOUT the conversation instead of "
            "answering: 'explain' | 'repeat' | 'translate'. The node did not "
            "advance and nothing was graded or logged. 'repeat' is answered "
            "client-side by replaying the node; the other two are answered by "
            "POST /conversation/explain, deliberately a SECOND call so the "
            "turn itself stays model-free and sub-second (§12)."
        ),
    )


class ExplainRequest(BaseModel):
    session_id: str
    question: str = Field(default="", description="The learner's own words, so the reply matches their language")
    text: str = Field(default="", description="Line to explain; defaults to the session's current node")
    translate_only: bool = Field(default=False, description="True for meta_intent='translate' — render, don't teach")


class ExplainResponse(BaseModel):
    explanation: str
    source: str = Field(description="'llm' | 'gloss' | 'none' — where the text came from")
    provider: str = ""
    line: str = ""


class EscapeLogEntry(BaseModel):
    id: str
    node_id: str
    transcript: str
    verdict: str
    ts: str


class EscapeCount(BaseModel):
    node_id: str
    count: int


class EscapeLogResponse(BaseModel):
    entries: list[EscapeLogEntry]
    grouped: list[EscapeCount]


# ─── Endpoints ───────────────────────────────────────────────────────────


@router.get("/conversation/scenarios", response_model=ScenarioListResponse)
async def list_scenarios(
    learner: Learner = Depends(require_learner),
    db: Session = Depends(get_db),
):
    """List all available dialogue scenarios with node counts (approved only)."""
    scenarios = db.query(DialogueScenario).filter(
        DialogueScenario.review_status == "approved"
    ).order_by(DialogueScenario.created_at).all()
    result = []
    for s in scenarios:
        node_count = db.query(DialogueNode).filter(DialogueNode.scenario_id == s.id).count()
        result.append(ScenarioOut(
            id=s.id,
            title=s.title,
            description=s.description or "",
            register=s.register or "",
            est_minutes=s.est_minutes or 5,
            node_count=node_count,
        ))
    return ScenarioListResponse(scenarios=result)


@router.post("/conversation/start", response_model=StartResponse)
async def start_conversation(
    req: StartRequest,
    learner: Learner = Depends(require_learner),
    db: Session = Depends(get_db),
):
    """Start a new conversation session."""
    # Resolve scenario
    if req.scenario_id:
        scenario = db.query(DialogueScenario).filter(DialogueScenario.id == req.scenario_id).first()
    else:
        scenario = db.query(DialogueScenario).order_by(DialogueScenario.created_at).first()

    if scenario is None:
        raise HTTPException(status_code=404, detail="No scenario found")

    # ── LLM mode: no entry node, no edges — the tutor opens the conversation.
    mode = (req.mode or ("llm" if settings.tutor_enabled else "graph")).lower()
    if mode == "llm" and not get_tutor().available:
        logger.info("tutor unconfigured — starting in graph mode instead")
        mode = "graph"

    if mode == "llm":
        return await _start_llm(db, learner, scenario)

    if not scenario.entry_node_id:
        raise HTTPException(status_code=500, detail="Scenario has no entry node")

    # Create session
    session = create_session(db, learner, scenario, mode="graph")

    # Load entry node + its edges
    entry_node = db.query(DialogueNode).filter(DialogueNode.id == scenario.entry_node_id).first()
    if entry_node is None:
        raise HTTPException(status_code=500, detail="Entry node not found")

    entry_edges = (
        db.query(DialogueEdge)
        .filter(
            DialogueEdge.from_node_id == entry_node.id,
            DialogueEdge.scenario_id == scenario.id,
        )
        .order_by(DialogueEdge.rank)
        .all()
    )

    return StartResponse(
        session_id=session.id,
        scenario=ScenarioDetail(
            id=scenario.id,
            title=scenario.title,
            description=scenario.description or "",
            est_minutes=scenario.est_minutes or 5,
        ),
        node=NodeOut(
            id=entry_node.id,
            kind=entry_node.kind,
            lang=entry_node.lang,
            devanagari=entry_node.devanagari,
            iast=entry_node.iast or "",
            gloss=entry_node.gloss or "",
            audio_url=entry_node.audio_url or "",
            repair_type=entry_node.repair_type,
        ),
        edges=[EdgeOut(id=e.id, lang=e.lang, expected_text=e.expected_text or "", features=e.features or []) for e in entry_edges],
        mode="graph",
    )


async def _start_llm(
    db: Session,
    learner: Learner,
    scenario: DialogueScenario,
) -> StartResponse:
    """Open a free-form session: the tutor writes its own greeting.

    There is no entry node and no edge list. `node` is still populated so the
    client renders a tutor line the same way in both modes; `edges` is empty
    because in this mode there is nothing to choose from — any grammatical
    reply is a valid move.
    """
    session = create_session(db, learner, scenario, mode="llm")

    tutor = get_tutor()
    reply = None
    try:
        check_and_consume(db, learner, "llm_calls", 1, surface="conversation")
    except QuotaExceeded as exc:
        logger.info("LLM quota exceeded on start for learner %s", learner.id)
        raise HTTPException(
            status_code=429,
            detail={
                "detail": f"LLM quota exceeded: {exc.used:.0f}/{exc.limit:.0f} calls.",
                "kind": exc.kind,
                "retry_after_s": exc.retry_after_s,
            },
            headers={"Retry-After": str(exc.retry_after_s)},
        )

    reply = await tutor.reply(
        transcript="",
        history=[],
        situation=tutor_situation(scenario),
        target_features=target_features(db, scenario.id),
        bridge_langs=learner.bridge_langs or ["en"],
        ratio=session.ratio_hint or 0.3,
        opening=True,
    )
    if reply.source == "degraded":
        refund_quota(db, learner, "llm_calls", 1, surface="conversation",
                     reason="downstream_failure")

    record_turn(
        db, session,
        role="tutor",
        devanagari=reply.sanskrit,
        gloss=reply.bridge,
    )
    db.commit()

    return StartResponse(
        session_id=session.id,
        scenario=ScenarioDetail(
            id=scenario.id,
            title=scenario.title,
            description=scenario.description or "",
            est_minutes=scenario.est_minutes or 5,
        ),
        node=NodeOut(
            id=f"llm:{session.id}:0",
            kind="tutor",
            lang="sa" if reply.sanskrit else _bridge_lang(learner),
            devanagari=reply.sanskrit or reply.bridge,
            iast="",
            gloss=reply.bridge if reply.sanskrit else "",
        ),
        edges=[],
        mode="llm",
    )


def _bridge_lang(learner: Learner) -> str:
    return "hi" if "hi" in (learner.bridge_langs or []) else "en"


@router.post("/conversation/turn", response_model=TurnResponse)
async def submit_turn(
    req: TurnRequest,
    learner: Learner = Depends(require_learner),
    db: Session = Depends(get_db),
):
    """Submit a learner utterance in conversation."""
    session = get_session(db, req.session_id, learner.id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found or not owned by learner")

    if session.mode == "llm":
        return await _turn_llm(db, learner, session, req.transcript)

    try:
        result = await process_turn(
            db=db,
            learner=learner,
            session=session,
            transcript=req.transcript,
            edge_id=req.edge_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    return TurnResponse(**result)


async def _turn_llm(
    db: Session,
    learner: Learner,
    session,
    transcript: str,
) -> TurnResponse:
    """A free-form turn: Vidyut reads the learner, Sarvam writes the tutor.

    There is no matching and no escape. The learner cannot be "wrong" about
    which sentence they picked, because no sentence was ever required —
    `verdict` reports what Vidyut found in their Sanskrit and nothing more.
    """
    scenario = (
        db.query(DialogueScenario)
        .filter(DialogueScenario.id == session.scenario_id)
        .first()
    )
    tutor = get_tutor()

    # Meta moves still resolve before anything else — asking what a line means
    # is not a turn in the conversation. Unlike graph mode this costs a model
    # call either way, but the client still needs to know to route it to
    # /conversation/explain rather than render it as the tutor's next line.
    intent = detect_meta_intent(transcript)
    if intent is not None:
        last = history_for_prompt(db, session.id, limit=1)
        return TurnResponse(
            verdict="meta",
            diagnosis="",
            matched=False,
            node=NodeOut(
                id=f"llm:{session.id}:{session.turn_count or 0}",
                kind="tutor",
                lang="sa",
                devanagari=last[0]["text"].split(" / ")[0] if last else "",
            ),
            edges=[],
            ratio_hint=session.ratio_hint or 0.3,
            meta_intent=intent,
            mode="llm",
        )

    try:
        check_and_consume(db, learner, "llm_calls", 1, surface="conversation")
    except QuotaExceeded as exc:
        raise HTTPException(
            status_code=429,
            detail={
                "detail": f"LLM quota exceeded: {exc.used:.0f}/{exc.limit:.0f} calls.",
                "kind": exc.kind,
                "retry_after_s": exc.retry_after_s,
            },
            headers={"Retry-After": str(exc.retry_after_s)},
        )

    reply = await tutor.reply(
        transcript=transcript,
        history=history_for_prompt(db, session.id),
        situation=tutor_situation(scenario),
        target_features=target_features(db, session.scenario_id),
        bridge_langs=learner.bridge_langs or ["en"],
        ratio=session.ratio_hint or 0.3,
    )
    if reply.source == "degraded":
        refund_quota(db, learner, "llm_calls", 1, surface="conversation",
                     reason="downstream_failure")

    health = reply.learner
    # §6.3 holds: this verdict describes the learner's Sanskrit, it does not
    # judge their answer. "unsure" is the abstention, never an accusation, and
    # a line carrying only a name lands on "correct" rather than failing.
    if not (transcript or "").strip():
        verdict = "empty"
    elif not health.looks_sanskrit:
        # No verb root and no pronoun. Either they answered in their own
        # language — a legitimate move, but not one that earns a higher
        # Sanskrit ratio — or the line read as nothing at all.
        verdict = "unsure" if health.ratio < 0.34 else "bridge"
    elif health.ok:
        verdict = "correct"
    elif health.ratio < 0.34:
        verdict = "unsure"
    else:
        verdict = "off_by_one"

    record_turn(
        db, session,
        role="learner",
        devanagari=transcript,
        parsed_features=health.features,
        verdict=verdict,
    )
    record_turn(
        db, session,
        role="tutor",
        devanagari=reply.sanskrit,
        gloss=reply.bridge,
        correction=reply.correction,
    )

    # Ratio drifts up on clean Sanskrit, down when they fall back to the
    # bridge — the same signal the graph used, from a freer source.
    delta = 0.02 if verdict == "correct" else (-0.02 if verdict == "bridge" else 0.0)
    session.turn_count = (session.turn_count or 0) + 1
    session.ratio_hint = max(0.0, min(1.0, (session.ratio_hint or 0.3) + delta))
    db.commit()

    return TurnResponse(
        verdict=verdict,
        diagnosis=reply.bridge if not reply.sanskrit else "",
        matched=True,          # no matching happens; nothing was rejected
        node=NodeOut(
            id=f"llm:{session.id}:{session.turn_count}",
            kind="tutor",
            lang="sa" if reply.sanskrit else _bridge_lang(learner),
            devanagari=reply.sanskrit or reply.bridge,
            iast=reply.iast,
            gloss=reply.bridge if reply.sanskrit else "",
        ),
        edges=[],
        session_done=reply.done,
        escape=False,
        ratio_hint=session.ratio_hint,
        mode="llm",
        correction=reply.correction,
        degraded=reply.source == "degraded",
    )


@router.post("/conversation/explain", response_model=ExplainResponse)
async def explain_line(
    req: ExplainRequest,
    learner: Learner = Depends(require_learner),
    db: Session = Depends(get_db),
):
    """Explain the tutor's line — §12's live-but-off-the-turn-path model call.

    Deliberately NOT folded into /conversation/turn. The turn path is
    model-free by design (that is what buys the sub-second turn); this runs
    after it has already returned, so its ~2 s is spent with nobody waiting
    on the graph. It reads session state and never writes it: no advance, no
    grading, no escape log.

    Degrades in one step: when the model is unavailable or fails, the node's
    authored gloss is served instead (source='gloss'), which is the same text
    the client already shows under the line. The learner always gets an
    answer of some kind.
    """
    session = get_session(db, req.session_id, learner.id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found or not owned by learner")

    node = (
        db.query(DialogueNode)
        .filter(DialogueNode.id == session.current_node_id)
        .first()
    )
    # `text` lets the client ask about an EARLIER bubble; the session is still
    # required, both as the ownership check and to keep this endpoint scoped
    # to a real conversation rather than a general translation service.
    line = (req.text or "").strip() or (node.devanagari if node else "")
    if not line:
        raise HTTPException(status_code=404, detail="Nothing to explain on this session")

    # IAST/gloss only apply when we are explaining the node itself.
    on_node = node is not None and line == node.devanagari
    iast = (node.iast or "") if on_node and node else ""
    gloss = (node.gloss or "") if on_node and node else ""

    explainer = get_explainer()
    # Sarvam will not infer the answer's language reliably, so it is
    # decided here from the learner's own script and passed as an order.
    language = reply_language(req.question, learner.bridge_langs)

    # Meter LLM quota — 429 is appropriate here because the learner asked for
    # an extra (off-turn-path) explanation.
    try:
        check_and_consume(db, learner, "llm_calls", 1, surface="explain")
    except QuotaExceeded as exc:
        raise HTTPException(
            status_code=429,
            detail={
                "detail": f"LLM quota exceeded: {exc.used:.0f}/{exc.limit:.0f} calls in rolling window. Retry after {exc.retry_after_s}s.",
                "kind": exc.kind,
                "used": exc.used,
                "limit": exc.limit,
                "retry_after_s": exc.retry_after_s,
            },
            headers={"Retry-After": str(exc.retry_after_s)},
        )

    text = await explainer.explain(
        line,
        iast=iast,
        gloss=gloss,
        question=req.question,
        translate_only=req.translate_only,
        language=language,
    )
    if text:
        provider = ""
        try:
            provider = explainer._get_provider().label
        except Exception:  # label is diagnostic only — never fail the response
            pass
        return ExplainResponse(explanation=text, source="llm", provider=provider, line=line)

    # Explain call returned nothing — refund the quota since the LLM did not
    # actually produce a useful response
    refund_quota(db, learner, "llm_calls", 1, surface="explain", reason="downstream_failure")

    if gloss:
        return ExplainResponse(explanation=gloss, source="gloss", line=line)

    logger.info("explain unavailable and no gloss for node %s", node.id if node else "?")
    return ExplainResponse(
        explanation="I can't explain that one right now — try asking again in a moment.",
        source="none",
        line=line,
    )


@router.get("/conversation/escape-log", response_model=EscapeLogResponse)
async def get_escape_log(
    scenario_id: str = Query(..., description="Scenario ID to filter by"),
    learner: Learner = Depends(require_learner),
    db: Session = Depends(get_db),
):
    """Get escape log entries (learner-scoped) grouped by node."""
    entries = (
        db.query(EscapeLog)
        .filter(
            EscapeLog.learner_id == learner.id,
            EscapeLog.scenario_id == scenario_id,
        )
        .order_by(EscapeLog.ts.desc())
        .all()
    )

    # Group by node_id
    from collections import Counter
    counts: Counter[str] = Counter()
    for e in entries:
        counts[e.node_id] += 1

    return EscapeLogResponse(
        entries=[
            EscapeLogEntry(
                id=e.id,
                node_id=e.node_id,
                transcript=e.transcript or "",
                verdict=e.verdict,
                ts=e.ts.isoformat() if e.ts else "",
            )
            for e in entries
        ],
        grouped=[EscapeCount(node_id=nid, count=c) for nid, c in counts.most_common()],
    )
