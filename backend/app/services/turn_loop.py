"""Turn loop: process a learner utterance against the dialogue graph.

Reuses grading/engine.py::grade_attempt unchanged. Bridge-edge matching runs
the deterministic phrase matcher first; per the 2026-08-30 product decision,
whatever the matcher misses is routed by the Sarvam LLM edge-router
(services/edge_router.py) — learners reply in free Hinglish ("Haa", "Ji")
that no phrase list can enumerate. sa-edge grading stays fully deterministic.
"""

from __future__ import annotations

import logging
import re
import uuid
from typing import Any, Optional

from sqlalchemy.orm import Session as DBSession

from app.adaptive import update_mastery
from app.grading.engine import grade_attempt
from app.models import (
    ConversationSession,
    DialogueEdge,
    DialogueNode,
    EscapeLog,
    Learner,
)
from app.services.edge_router import get_edge_router
from app.services.meta_intent import detect_meta_intent, normalize as _meta_norm
from app.services.quota import QuotaExceeded, check_and_consume, refund_quota
from app.services.session_store import advance

logger = logging.getLogger("shabd.conversation")

# Bridge-edge negation lexicon (v1: en + hi bridge registers per §12).
# A bridge edge whose expected_phrases contain any of these counts as a
# NEGATIVE edge: when an utterance matches both a negative and an affirmative
# edge ("I am not ready" contains "ready" and "not"), the negative pre-empts —
# a learner saying "no" must never be routed down the affirmative path.
# Seed authors can extend per-edge later; this default covers the seeded graph.
NEGATION_WORDS = frozenset({
    # English
    "no", "not", "never", "none", "nothing", "without", "don't", "dont",
    "cannot", "can't", "won't", "wont",
    # Hindi (Devanagari + common romanizations)
    "नहीं", "नही", "मत", "nahin", "nahi", "mat",
})


def _has_negation_phrase(edge: DialogueEdge) -> bool:
    """True when the edge's expected_phrases declare it a negative edge."""
    for phrase in edge.expected_phrases or []:
        p = " ".join(str(phrase).strip().lower().split())
        if p in NEGATION_WORDS:
            return True
    return False


async def process_turn(
    db: DBSession,
    learner: Learner,
    session: ConversationSession,
    transcript: str,
    edge_id: Optional[str] = None,
) -> dict[str, Any]:
    """Process a single turn in a conversation.

    Args:
        db: Database session.
        learner: The authenticated learner.
        session: The active ConversationSession.
        transcript: The learner's utterance (text).
        edge_id: Optional client-pinned edge (validate if provided).

    Returns:
        Dict matching TurnResponse shape: verdict, diagnosis, matched, node,
        edges, session_done, escape, ratio_hint.
    """
    # 1. Load current node and outgoing edges
    current_node: DialogueNode = (
        db.query(DialogueNode)
        .filter(DialogueNode.id == session.current_node_id)
        .first()
    )
    if current_node is None:
        raise ValueError(f"Current node {session.current_node_id} not found")

    scenario_id = session.scenario_id
    outgoing_edges: list[DialogueEdge] = (
        db.query(DialogueEdge)
        .filter(
            DialogueEdge.from_node_id == current_node.id,
            DialogueEdge.scenario_id == scenario_id,
        )
        .order_by(DialogueEdge.rank)
        .all()
    )

    # Terminal check: no outgoing edges
    if not outgoing_edges:
        session.turn_count = (session.turn_count or 0) + 1
        db.commit()
        return _build_turn_response(
            verdict="correct",
            diagnosis="Conversation complete.",
            matched=False,
            session=session,
            node=current_node,
            edges=[],
            session_done=True,
            escape=False,
        )

    # Validate edge_id if provided (client-pinned choice)
    pinned_edge: Optional[DialogueEdge] = None
    if edge_id is not None:
        for e in outgoing_edges:
            if e.id == edge_id:
                pinned_edge = e
                break
        if pinned_edge is None:
            raise ValueError(f"Edge {edge_id} not found on current node")

    edges_to_check = [pinned_edge] if pinned_edge else outgoing_edges

    # ── Meta moves ("what does that mean?", "say it again") ──────────────
    # A question ABOUT the line is not a move IN the graph, so it resolves
    # before edge matching: the bridge phrase lists are loose enough to
    # swallow one ("समझ नहीं आया" contains नहीं and would route down the
    # refusal edge). The converse mistake is guarded — an utterance that IS
    # one of the node's expected replies stays a normal turn even if it
    # happens to contain a meta phrase. A pinned edge_id means the caller
    # chose the path explicitly; honour it and skip detection entirely.
    #
    # A meta turn does NOT advance the node, count an escape, or move the
    # ratio. It returns the SAME node with `meta_intent` set, and the client
    # decides what to do with it: replay the audio for "repeat", or call
    # POST /conversation/explain for "explain"/"translate". No model runs in
    # this function — §12's sub-second turn path stays model-free.
    if pinned_edge is None:
        meta_intent = detect_meta_intent(transcript)
        if meta_intent is not None and not _is_expected_reply(transcript, outgoing_edges):
            return _build_turn_response(
                verdict="meta",
                diagnosis="",
                matched=False,
                session=session,
                node=current_node,
                edges=outgoing_edges,
                session_done=False,
                escape=False,
                meta_intent=meta_intent,
            )

    # 2. Find the matching edge
    matched_edge = None
    near_edge: Optional[DialogueEdge] = None
    grade_result: Optional[dict[str, Any]] = None
    near_grade_result: Optional[dict[str, Any]] = None
    last_grade_result: Optional[dict[str, Any]] = None  # track the last sa result (for unsure)

    # Bridge matching: word-boundary aware, ALL candidate bridge edges scored,
    # then resolved: (1) negative edge pre-empts affirmative — "I am not ready"
    # contains both "ready" and "not", and "no" must never route affirmative;
    # (2) otherwise the LONGEST matched phrase wins — specificity beats rank.
    # Plain substring + first-rank-wins misroutes negations and collisions
    # ("I know" contains "no"; "readiness" contains "ready").
    transcript_norm = " ".join((transcript or "").strip().lower().split())

    def _bridge_hit(phrases: list[str]) -> Optional[str]:
        """Longest expected phrase that appears as a whole word/phrase in the
        transcript, else None. Multi-word phrases match on the joined form."""
        best: Optional[str] = None
        for phrase in phrases or []:
            p = " ".join(phrase.strip().lower().split())
            if not p:
                continue
            if re.search(rf"(?<!\w){re.escape(p)}(?!\w)", transcript_norm):
                if best is None or len(p) > len(best):
                    best = p
        return best

    matched_edge = None
    best_bridge_hit: Optional[str] = None
    best_bridge_negative = False
    for edge in edges_to_check:
        if edge.lang == "bridge":
            hit = _bridge_hit(edge.expected_phrases or [])
            # Score EVERY bridge edge — do not break on the first hit.
            # Negation pre-empts regardless of phrase length or rank;
            # among same-polarity edges the longest phrase (most specific)
            # wins. Earlier hits of equal length keep rank priority.
            neg = _has_negation_phrase(edge)
            if hit is not None:
                if matched_edge is None:
                    matched_edge, best_bridge_hit, best_bridge_negative = edge, hit, neg
                elif (neg, len(hit)) > (best_bridge_negative, len(best_bridge_hit)):
                    matched_edge, best_bridge_hit, best_bridge_negative = edge, hit, neg

        elif edge.lang == "sa":
            # Grade via grading engine
            result = grade_attempt(
                response_text=transcript,
                accepted_parses=edge.accepted_parses or [],
                expected_features=edge.features or [],
            )
            if result["verdict"] == "correct":
                matched_edge = edge
                grade_result = result
                break
            elif result["verdict"] == "off_by_one":
                # Remember the best off_by_one candidate
                near_edge = edge
                near_grade_result = result
            else:
                # Track last grade result (unsure) for verdict propagation
                last_grade_result = result

    # ── LLM edge-router (product decision 2026-08-30) ────────────────────
    # The phrase matcher only catches the seeded canned phrases; real replies
    # ("Haa", "Ji", "ok sure", "nahi") slip past it and become escapes. When
    # nothing matched deterministically, hand the BRIDGE edges to the Sarvam
    # router, which picks one by meaning. sa-edges never go to the LLM —
    # their verdicts must stay reproducible. A client-pinned edge_id means
    # the test console chose the path — honour it strictly, no routing. The
    # negation pre-emption guard above stays authoritative: when the matcher
    # resolved to the NEGATIVE edge, the router is not consulted.
    if matched_edge is None and pinned_edge is None:
        router = get_edge_router()
        # Only edges that describe a real learner reply are candidates. The
        # seeded graph also carries FALLBACK ROUTING edges — bridge edges with
        # no expected_phrases and no expected_text, wired from a question to
        # its repair purely so `_pick_repair_node` can find one. They are not
        # things a learner can say, and offering them to the router laundered
        # every failed Sanskrit answer into a bridge match: at a question whose
        # only bridge edge is its fallback, the router had exactly one
        # candidate and picked it, so a wrong answer returned matched=True,
        # verdict "correct", and walked to the repair node — no escape logged,
        # no streak, and the escalation ladder never fired. That is the loop
        # the owner hit. The deterministic matcher already ignores these (an
        # empty phrase list cannot hit); this aligns the router with it, and
        # keeps the router off any verdict it was never allowed to assign.
        bridge_edges = [
            e
            for e in outgoing_edges
            if e.lang == "bridge" and e.to_node_id and (e.expected_phrases or [])
        ]
        if bridge_edges and router.available and transcript.strip():
            # Consume quota before the LLM call
            try:
                check_and_consume(db, learner, "llm_calls", 1, surface="conversation")
            except QuotaExceeded:
                logger.info("LLM quota exceeded for learner %s — skipping edge-router", learner.id)
                # Fall through — the phrase matcher already ran; no match is escape
            else:
                try:
                    chosen = await router.route(
                        transcript=transcript,
                        tutor_text=current_node.devanagari or current_node.gloss or "",
                        edges=bridge_edges,
                    )
                    if chosen is not None:
                        matched_edge = chosen
                except Exception:
                    # Refund quota on downstream failure — the call didn't complete
                    logger.warning("edge-route call failed for learner %s — refunding quota", learner.id)
                    refund_quota(db, learner, "llm_calls", 1, surface="conversation", reason="downstream_failure")
                    # Fall through to escape path

    # Determine if this is empty/whitespace
    is_empty = not (transcript or "").strip()

    # 3. Handle match vs no-match
    if matched_edge is not None:
        return _handle_match(
            db=db,
            learner=learner,
            session=session,
            edge=matched_edge,
            grade_result=grade_result,
            current_node=current_node,
            outgoing_edges=outgoing_edges,
        )
    else:
        return _handle_no_match(
            db=db,
            learner=learner,
            session=session,
            transcript=transcript,
            current_node=current_node,
            outgoing_edges=outgoing_edges,
            near_edge=near_edge,
            near_grade_result=near_grade_result,
            last_grade_result=last_grade_result,
            is_empty=is_empty,
        )


def _handle_match(
    db: DBSession,
    learner: Learner,
    session: ConversationSession,
    edge: DialogueEdge,
    grade_result: Optional[dict[str, Any]],
    current_node: DialogueNode,
    outgoing_edges: list[DialogueEdge],
) -> dict[str, Any]:
    """Handle a matched edge."""
    verdict = "correct"
    diagnosis = "Correct!"

    # A successful turn ends any escape streak — but leaving a REPAIR node is
    # not that kind of success. A repair's only exit is a bridge acknowledgement
    # ("हाँ") back to the question just missed, so clearing the streak there let
    # escape → acknowledge → escape ping-pong between a question and its repair
    # forever: the counter was reset on every other turn and the ladder below
    # never reached 3. That is the exact loop `consecutive_escapes` was added to
    # stop (DECISIONS.md, human-review finding 2) — it only ever closed the
    # repair→repair case, not question↔repair.
    if current_node.kind != "repair":
        session.consecutive_escapes = 0

    if edge.lang == "sa" and grade_result is not None:
        # Apply adaptive update (mirror attempts.py pattern)
        _ = update_mastery(
            learner=learner,
            challenge_features=edge.features or [],
            verdict="correct",
            abstained=False,
        )

    # Determine ratio delta: +0.02 on correct sa, 0 on bridge
    ratio_delta = 0.02 if edge.lang == "sa" else 0.0

    # Advance to target node
    if edge.to_node_id is not None:
        advance(db, session, edge.to_node_id, ratio_hint_delta=ratio_delta)
    else:
        # Null to_node_id = terminal edge
        session.turn_count = (session.turn_count or 0) + 1
        db.commit()

    # Check if we're now at a terminal node
    target_node_id = edge.to_node_id
    session_done = target_node_id is None

    if target_node_id is not None:
        next_node: DialogueNode = (
            db.query(DialogueNode).filter(DialogueNode.id == target_node_id).first()
        )
        next_edges: list[DialogueEdge] = (
            db.query(DialogueEdge)
            .filter(
                DialogueEdge.from_node_id == target_node_id,
                DialogueEdge.scenario_id == session.scenario_id,
            )
            .all()
        )
        if not next_edges:
            session_done = True
            next_edges = []  # explicit: terminal nodes expose no exits
    else:
        next_node = current_node  # fallback
        session_done = True
        next_edges = []

    return _build_turn_response(
        verdict=verdict,
        diagnosis=diagnosis,
        matched=True,
        session=session,
        node=next_node,
        edges=next_edges if not session_done else [],
        session_done=session_done,
        escape=False,
    )


def _handle_no_match(
    db: DBSession,
    learner: Learner,
    session: ConversationSession,
    transcript: str,
    current_node: DialogueNode,
    outgoing_edges: list[DialogueEdge],
    near_edge: Optional[DialogueEdge],
    near_grade_result: Optional[dict[str, Any]],
    last_grade_result: Optional[dict[str, Any]],
    is_empty: bool,
) -> dict[str, Any]:
    """Handle no matched edge — escape path."""
    # Determine grade info from best attempt
    if near_grade_result is not None:
        best_verdict = near_grade_result["verdict"]
        best_diagnosis = near_grade_result.get("diagnosis", "")
        parsed_features = near_grade_result.get("parsed_features", {})
    elif last_grade_result is not None:
        # Use the last grade result (e.g. "unsure") — never transform to "incorrect"
        best_verdict = last_grade_result["verdict"]
        best_diagnosis = last_grade_result.get("diagnosis", "")
        parsed_features = last_grade_result.get("parsed_features", {})
    elif is_empty:
        best_verdict = "empty"
        best_diagnosis = "Empty utterance."
        parsed_features = {}
    else:
        # §12: Vidyut still grades the utterance — "is this valid Sanskrit?" —
        # independently of whether the graph expected it. A no-match is never
        # "incorrect": the learner wasn't wrong, the graph just had no edge.
        validity = grade_attempt(transcript, [], [])
        if validity["verdict"] == "unsure":
            best_verdict = "unsure"
            best_diagnosis = validity.get("diagnosis", "")
            parsed_features = validity.get("parsed_features", {})
        else:
            best_verdict = "no_match"
            best_diagnosis = "No matching response found."
            parsed_features = validity.get("parsed_features", {})

    # §6.3 in conversation: an escape never accuses. "incorrect" can only mean
    # "confidently parsed but matched no edge" — that is the graph's gap, not
    # the learner's error. Downgrade to no_match (keep the diagnosis text; the
    # narrow repair uses it). off_by_one stays: it names a concrete near miss.
    if best_verdict == "incorrect":
        best_verdict = "no_match"

    # Escape logging: always log any unmatched utterance
    esc = EscapeLog(
        id=uuid.uuid4().hex[:16],
        learner_id=learner.id,
        scenario_id=session.scenario_id,
        node_id=current_node.id,
        transcript=transcript or "",
        parsed_features=parsed_features,
        verdict=best_verdict,
    )
    db.add(esc)
    db.commit()

    # Emit escape metric
    from app.services.metrics import emit as _emit
    _emit("escape",
          scenario_id=session.scenario_id,
          node_id=current_node.id,
          learner_id=learner.id,
          verdict=best_verdict)

    # ── Escalation ladder (§12: a stuck learner is a lost learner) ──
    # Track consecutive escapes on the session; escalate instead of asking
    # again forever:
    #   escape 1-2: repair node as usual
    #   escape 3:   bridge drop — move to a bridge-language node if the graph
    #               offers one reachable via bridge edges (repair with
    #               repair_type="bridge" preferred)
    #   escape 4:   reveal — say the line and move the conversation PAST the
    #               question. The escape rows are still written, so the
    #               authoring backlog keeps its signal either way.
    session.consecutive_escapes = (session.consecutive_escapes or 0) + 1

    # Escape 4 stops asking and starts telling. v1 ended the session here,
    # which traded a loop for a dead end: a learner who missed question 1 of 12
    # lost the whole scenario and met the same wall on every restart. Asking a
    # fifth time is not an option either — that is the loop. So the tutor does
    # what a human tutor does: gives the answer and carries on.
    if session.consecutive_escapes >= 4:
        revealed = _reveal_and_advance(db, session, current_node)
        if revealed is not None:
            return revealed

    # Pick repair node
    repair_node = _pick_repair_node(
        db=db,
        current_node=current_node,
        has_near_edge=near_edge is not None,
        scenario_id=session.scenario_id,
        prefer_bridge=session.consecutive_escapes >= 3,
    )

    # Ratio: -0.05 on escape
    advance(db, session, repair_node.id, ratio_hint_delta=-0.05)

    if session.consecutive_escapes >= 4:
        # No answer in reach to reveal (a node with no forward sa-edge). Stop
        # gracefully rather than ask again forever; the log records the dead end.
        db.commit()
        return _build_turn_response(
            verdict=best_verdict,
            diagnosis=(best_diagnosis + " Let's switch to your language for now — "
                       "try this scenario again later."),
            matched=False,
            session=session,
            node=repair_node,
            edges=[],           # no exits offered — session is done
            session_done=True,
            escape=True,
        )

    # Get edges for the repair node
    repair_edges: list[DialogueEdge] = (
        db.query(DialogueEdge)
        .filter(
            DialogueEdge.from_node_id == repair_node.id,
            DialogueEdge.scenario_id == session.scenario_id,
        )
        .order_by(DialogueEdge.rank)
        .all()
    )

    return _build_turn_response(
        verdict=best_verdict,
        diagnosis=best_diagnosis,
        matched=False,
        session=session,
        node=repair_node,
        edges=repair_edges,
        session_done=False,
        escape=True,
    )


def _answer_edge(
    db: DBSession,
    node: DialogueNode,
    scenario_id: str,
) -> Optional[DialogueEdge]:
    """The edge carrying the authored answer the learner is failing to produce.

    Prefers a sa-edge with authored ``expected_text`` on ``node`` itself. A
    repair node has none — its exits are bridge acknowledgements that teach
    nothing — so one hop is followed back to the question it was repairing.
    Returns None when no answer is in reach.
    """
    def _pick(n: DialogueNode) -> Optional[DialogueEdge]:
        edges = (
            db.query(DialogueEdge)
            .filter(
                DialogueEdge.from_node_id == n.id,
                DialogueEdge.scenario_id == scenario_id,
                DialogueEdge.to_node_id.isnot(None),
            )
            .order_by(DialogueEdge.rank)
            .all()
        )
        for e in edges:
            if e.lang == "sa" and (e.expected_text or "").strip():
                return e
        return None

    edge = _pick(node)
    if edge is not None:
        return edge

    if node.kind != "repair":
        return None

    hops = (
        db.query(DialogueEdge)
        .filter(
            DialogueEdge.from_node_id == node.id,
            DialogueEdge.scenario_id == scenario_id,
            DialogueEdge.lang == "bridge",
            DialogueEdge.to_node_id.isnot(None),
        )
        .order_by(DialogueEdge.rank)
        .all()
    )
    for h in hops:
        target = (
            db.query(DialogueNode).filter(DialogueNode.id == h.to_node_id).first()
        )
        # Only hop to a real question; repair→repair would teach nothing.
        if target is None or target.kind == "repair":
            continue
        edge = _pick(target)
        if edge is not None:
            return edge
    return None


def _reveal_and_advance(
    db: DBSession,
    session: ConversationSession,
    current_node: DialogueNode,
) -> Optional[dict[str, Any]]:
    """Escape-ladder terminus: say the answer out loud and move on.

    Always steps FORWARD along a sa-edge of the question the learner is stuck
    on, so the conversation cannot re-enter the repair it just escaped. The
    escape row for this turn is already written by the caller; this only
    decides where the learner goes next.

    Returns None when the graph offers no answer to reveal from here, leaving
    the caller's repair path in charge.
    """
    edge = _answer_edge(db, current_node, session.scenario_id)
    if edge is None or edge.to_node_id is None:
        return None

    next_node = (
        db.query(DialogueNode).filter(DialogueNode.id == edge.to_node_id).first()
    )
    if next_node is None:
        return None

    # The reveal unsticks the learner, so the streak restarts at the node they
    # are moved to — otherwise the very next miss would fire the ladder again.
    session.consecutive_escapes = 0
    advance(db, session, next_node.id, ratio_hint_delta=-0.05)

    next_edges: list[DialogueEdge] = (
        db.query(DialogueEdge)
        .filter(
            DialogueEdge.from_node_id == next_node.id,
            DialogueEdge.scenario_id == session.scenario_id,
        )
        .order_by(DialogueEdge.rank)
        .all()
    )

    return _build_turn_response(
        # A verdict of its own: the turn was neither graded nor matched, and
        # the client must show this diagnosis rather than the generic
        # "didn't catch that" copy every other escape gets.
        verdict="revealed",
        diagnosis=(
            f"Let's not stay stuck — the answer here was: {edge.expected_text} "
            "We'll come back to it. Moving on."
        ),
        matched=False,
        session=session,
        node=next_node,
        edges=next_edges,
        session_done=not next_edges,
        escape=True,
    )


def _pick_repair_node(
    db: DBSession,
    current_node: DialogueNode,
    has_near_edge: bool,
    scenario_id: str,
    prefer_bridge: bool = False,
) -> DialogueNode:
    """Pick the appropriate repair node for an escape.

    If near_edge exists (off_by_one), prefer a "narrow" repair node from
    the current node's outgoing fallback edges. Otherwise use "ask_again".
    With ``prefer_bridge`` (escape streak >= 3) a repair_type="bridge" node
    wins over narrow/ask_again — drop to the learner's language first.
    """
    # Get all nodes reachable via fallback edges from current node
    fallback_edges: list[DialogueEdge] = (
        db.query(DialogueEdge)
        .filter(
            DialogueEdge.from_node_id == current_node.id,
            DialogueEdge.scenario_id == scenario_id,
            DialogueEdge.lang == "bridge",
            DialogueEdge.to_node_id.isnot(None),
        )
        .all()
    )

    target_ids = [e.to_node_id for e in fallback_edges if e.to_node_id]

    if target_ids:
        candidates = (
            db.query(DialogueNode)
            .filter(
                DialogueNode.id.in_(target_ids),
                DialogueNode.scenario_id == scenario_id,
            )
            .all()
        )

        if prefer_bridge:
            for c in candidates:
                if c.kind == "repair" and c.repair_type == "bridge":
                    return c

        if has_near_edge:
            # Prefer narrow repair
            for c in candidates:
                if c.kind == "repair" and c.repair_type == "narrow":
                    return c

        # Fallback: any repair node
        for c in candidates:
            if c.kind == "repair" and c.repair_type == "ask_again":
                return c

        # Last resort: first available target that is NOT narrow
        non_narrow = [c for c in candidates if c.repair_type != "narrow"]
        if non_narrow:
            return non_narrow[0]

    # No repair wired from this node: hold the learner ON the question.
    #
    # This used to jump to the scenario's first repair node by `sort`, which
    # was added to stop sessions stranding on nodes without a repair exit. But
    # a repair node's exits rejoin the graph wherever ITS author put them —
    # the seeded first repair leads back to question 1 — so escaping at a late
    # node silently rewound the learner to the beginning, and the rewind cycle
    # replaced the loop it was meant to fix. Holding the node cannot strand a
    # session any more: the escalation ladder reveals the answer and moves on
    # at escape 4.
    return current_node


def _is_expected_reply(transcript: str, edges: list[DialogueEdge]) -> bool:
    """True when the utterance IS one of the node's seeded replies, verbatim.

    The guard on meta detection: a learner whose actual answer happens to
    contain a meta phrase must still take their edge. Exact (normalized)
    equality only — anything looser would re-import the substring collisions
    the bridge matcher already had to fix.
    """
    norm = _meta_norm(transcript)
    if not norm:
        return False
    for edge in edges:
        for phrase in edge.expected_phrases or []:
            if _meta_norm(str(phrase)) == norm:
                return True
    return False


def _build_turn_response(
    verdict: str,
    diagnosis: str,
    matched: bool,
    session: ConversationSession,
    node: DialogueNode,
    edges: list[DialogueEdge],
    session_done: bool,
    escape: bool,
    meta_intent: Optional[str] = None,
) -> dict[str, Any]:
    """Build the response dict matching TurnResponse schema."""
    return {
        "verdict": verdict,
        "diagnosis": diagnosis,
        "matched": matched,
        "node": _node_out(node),
        "edges": [_edge_out(e) for e in edges],
        "session_done": session_done,
        "escape": escape,
        "ratio_hint": session.ratio_hint or 0.3,
        "meta_intent": meta_intent,
    }


def _node_out(node: DialogueNode) -> dict[str, Any]:
    """Serialize node for client (NodeOut)."""
    return {
        "id": node.id,
        "kind": node.kind,
        "lang": node.lang,
        "devanagari": node.devanagari,
        "iast": node.iast or "",
        "gloss": node.gloss or "",
        "audio_url": node.audio_url or "",
        "repair_type": node.repair_type,
    }


def _edge_out(edge: DialogueEdge) -> dict[str, Any]:
    """Serialize edge for client (EdgeOut — NO accepted_parses)."""
    return {
        "id": edge.id,
        "lang": edge.lang,
        "expected_text": edge.expected_text or "",
        "features": edge.features or [],
    }
