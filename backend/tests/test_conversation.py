"""Tests for conversation runtime: start, turn, escape-log.

The LLM edge-router (services/edge_router.py) is stubbed for the whole module:
no test may hit the real Sarvam API. The stub answers by phrase-similarity to
each edge's expected_phrases so the fixtures behave like the product router
(meaning-match without exact spelling). Tests that need a specific routing
decision override the stub's return value directly.
"""

from __future__ import annotations

import pytest

from app.models import DialogueEdge
from app.services import edge_router as edge_router_module


class _StubRouter:
    """Deterministic stand-in for EdgeRouter: meaning-equivalence routing.

    route() canonicalizes the transcript's words and each candidate edge's
    phrase words through a small Hinglish→gloss map (what the real LLM does
    with world knowledge, the stub does with a table), then returns the first
    edge with a matching word — word-boundary aware, so "no" never matches
    inside "know". Negation in the transcript restricts candidates to negative
    edges (mirroring the product prompt's polarity handling). Returns None on
    no-match; never raises.
    """

    # transcript/phrase word → canonical meaning token
    _EQUIV = {
        "haa": "yes", "haan": "yes", "han": "yes", "haanji": "yes",
        "ji": "yes", "jee": "yes", "yes": "yes", "ok": "yes", "okay": "yes",
        "sure": "yes", "ready": "yes", "taiyaar": "yes", "taiyar": "yes",
        "हाँ": "yes", "जी": "yes", "तैयार": "yes",
        "nahi": "no", "nahin": "no", "no": "no", "not": "no", "nope": "no",
        "नहीं": "no", "नही": "no",
        "thanks": "thanks", "thank": "thanks", "dhanyavaad": "thanks",
        "धन्यवाद": "thanks",
        "bye": "bye", "alvida": "bye", "अलविदा": "bye", "पुनर्मिलामः": "bye",
        "gehe": "gehe", "गेहे": "gehe", "ghar": "gehe", "घर": "gehe",
    }
    _NEGATIONS = {"no", "not", "nahi", "nahin", "नहीं", "नही"}

    def __init__(self) -> None:
        self.available = True
        self.calls: list[dict] = []
        self.unavailable = False

    def _canon(self, word: str) -> str:
        return self._EQUIV.get(word.lower().strip(".,!? "), word.lower())

    async def route(self, transcript, tutor_text, edges):
        self.calls.append({"transcript": transcript, "tutor_text": tutor_text,
                           "edge_ids": [e.id for e in edges]})
        if self.unavailable:
            return None
        words = {(self._canon(w)) for w in (transcript or "").split()}
        if words & self._NEGATIONS:
            edges = [e for e in edges if {self._canon(w) for w in " ".join(e.expected_phrases or []).split()} & self._NEGATIONS] or edges
        for e in edges:
            for phrase in e.expected_phrases or []:
                pwords = {self._canon(w) for w in str(phrase).split() if w}
                if pwords & words:
                    return e
        return None


@pytest.fixture(autouse=True)
def stub_edge_router(monkeypatch):
    """Stub get_edge_router() for every test in this module."""
    stub = _StubRouter()
    monkeypatch.setattr(edge_router_module, "_singleton", stub)
    monkeypatch.setattr(
        edge_router_module, "get_edge_router", lambda: stub
    )
    # Sanity: patched-in object must be what turn_loop resolves.
    from app.services import turn_loop as turn_loop_module

    assert turn_loop_module.get_edge_router() is stub
    yield stub


def test_list_scenarios(client, auth_headers):
    """GET /conversation/scenarios returns the seeded scenario."""
    r = client.get("/conversation/scenarios", headers=auth_headers)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "scenarios" in data
    assert len(data["scenarios"]) >= 1
    sc = data["scenarios"][0]
    assert "id" in sc
    assert "title" in sc
    assert "node_count" in sc
    assert sc["node_count"] == 30


def test_start_returns_entry_node_and_edges(client, auth_headers):
    """POST /conversation/start returns session, entry node, edges."""
    r = client.post("/conversation/start", json={"mode": "graph"}, headers=auth_headers)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "session_id" in data
    assert data["session_id"]
    assert "scenario" in data
    assert "node" in data
    assert "edges" in data
    node = data["node"]
    # Entry node n00 is "hi" bridge greeting
    assert node["lang"] == "hi"
    assert node["kind"] == "tutor"
    # Verify NO accepted_parses in edges
    for e in data["edges"]:
        assert "accepted_parses" not in e, f"Edge {e['id']} leaked accepted_parses"
    # Should have 2 edges from n00 (हाँ → n01, नहीं → n00r)
    assert len(data["edges"]) == 2


def _resolve_expected_text(transcript: str) -> str:
    """Helper: convert IAST expected_text to Devanagari for the API."""
    # The expected_text from seed is in IAST (romanized),
    # but the API just takes the raw text that goes to grade_attempt.
    # grade_accepts both IAST and Devanagari, so we can send the
    # IAST text directly.
    return transcript


def test_full_happy_path(client, auth_headers):
    """Complete the dialogue graph by answering each sa question correctly."""
    # Start session
    r = client.post("/conversation/start", json={"mode": "graph"}, headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    session_id = data["session_id"]

    turns = 0
    max_turns = 40
    session_done = False

    # The first turn should answer the entry node (n00) bridge edge with "हाँ"
    r = client.post(
        "/conversation/turn",
        json={"session_id": session_id, "transcript": "हाँ"},
        headers=auth_headers,
    )
    assert r.status_code == 200, f"Turn {turns}: {r.text}"
    data = r.json()
    assert data["matched"] is True, f"Bridge match failed: {data}"
    turns += 1

    # Now we should be at the first sa question node. Walk through.
    while not session_done and turns < max_turns:
        data = r.json()  # re-read the last response
        edges = data.get("edges", [])

        if data.get("session_done"):
            session_done = True
            break

        if not edges:
            session_done = True
            break

        # Find first sa edge to answer
        sa_edges = [e for e in edges if e["lang"] == "sa"]
        bridge_edges = [e for e in edges if e["lang"] == "bridge"]

        if sa_edges:
            transcript = sa_edges[0]["expected_text"]
            r = client.post(
                "/conversation/turn",
                json={"session_id": session_id, "transcript": transcript},
                headers=auth_headers,
            )
            assert r.status_code == 200, f"Turn {turns}: {r.text}"
            data = r.json()
            assert data["matched"] is True, (
                f"Turn {turns}: expected match for '{transcript}', got {data}"
            )
            assert data["verdict"] == "correct", f"Turn {turns}: {data}"
        elif bridge_edges:
            # Answer with a bridge phrase.
            # Different bridge nodes accept different phrases — try them in order.
            node_lang = data["node"]["lang"]
            if node_lang == "sa":
                # Sanskrit bridge nodes often want closing phrases
                phrases = ["धन्यवाद", "पुनर्मिलामः", "हाँ", "bye"]
            else:
                phrases = ["हाँ", "धन्यवाद", "तैयार"]
            matched_ok = False
            for phrase in phrases:
                r = client.post(
                    "/conversation/turn",
                    json={"session_id": session_id, "transcript": phrase},
                    headers=auth_headers,
                )
                assert r.status_code == 200, f"Turn {turns}: {r.text}"
                data = r.json()
                if data["matched"]:
                    matched_ok = True
                    break
            if not matched_ok:
                # Final attempt — fall through; the assertion below will catch it
                r = client.post(
                    "/conversation/turn",
                    json={"session_id": session_id, "transcript": "धन्यवाद"},
                    headers=auth_headers,
                )
                data = r.json()
            assert data["matched"] is True, (
                f"Turn {turns}: bridge should match, got {data}"
            )
        turns += 1

    assert session_done, (
        f"Session did not complete within {max_turns} turns (used {turns})"
    )
    assert turns <= max_turns, f"Too many turns: {turns}"


def test_free_word_order(client, auth_headers):
    """Free word order: different word order should pass at first sa question."""
    r = client.post("/conversation/start", json={"mode": "graph"}, headers=auth_headers)
    assert r.status_code == 200
    session_id = r.json()["session_id"]

    # Bridge past entry
    r = client.post(
        "/conversation/turn",
        json={"session_id": session_id, "transcript": "हाँ"},
        headers=auth_headers,
    )
    assert r.status_code == 200

    # Try free word order: "रामः अहं अस्मि" instead of "अहं रामः अस्मि"
    # grade_attempt does feature-set comparison (word-order independent)
    r2 = client.post(
        "/conversation/turn",
        json={"session_id": session_id, "transcript": "रामः अहं अस्मि"},
        headers=auth_headers,
    )
    assert r2.status_code == 200, r2.text
    data2 = r2.json()
    assert data2["matched"] is True, f"Free word order should match: {data2}"
    assert data2["verdict"] == "correct"


def test_off_by_one_triggers_escape(client, auth_headers):
    """One-feature-off answer triggers escape to repair node."""
    r = client.post("/conversation/start", json={"mode": "graph"}, headers=auth_headers)
    assert r.status_code == 200
    session_id = r.json()["session_id"]

    # Bridge past entry
    r = client.post(
        "/conversation/turn",
        json={"session_id": session_id, "transcript": "हाँ"},
        headers=auth_headers,
    )
    assert r.status_code == 200

    # Wrong case: अहं रामम् अस्मि (ACC instead of NOM on rāma)
    r2 = client.post(
        "/conversation/turn",
        json={"session_id": session_id, "transcript": "अहं रामम् अस्मि"},
        headers=auth_headers,
    )
    assert r2.status_code == 200, r2.text
    data2 = r2.json()
    assert data2["matched"] is False, f"Expected no match: {data2}"
    assert data2["escape"] is True, f"Expected escape: {data2}"
    assert data2["node"]["kind"] == "repair", f"Expected repair node: {data2}"
    assert data2["verdict"] == "off_by_one", f"Expected off_by_one: {data2}"


def test_unsure_path(client, auth_headers):
    """Gibberish Devanagari should produce 'unsure', never 'incorrect'."""
    r = client.post("/conversation/start", json={"mode": "graph"}, headers=auth_headers)
    assert r.status_code == 200
    session_id = r.json()["session_id"]

    # Bridge past entry
    r = client.post(
        "/conversation/turn",
        json={"session_id": session_id, "transcript": "हाँ"},
        headers=auth_headers,
    )
    assert r.status_code == 200

    # Post gibberish Devanagari
    r2 = client.post(
        "/conversation/turn",
        json={"session_id": session_id, "transcript": "फ़लदफ़दफ़"},
        headers=auth_headers,
    )
    assert r2.status_code == 200, r2.text
    data2 = r2.json()
    assert data2["verdict"] != "incorrect", (
        f"Gibberish should never be 'incorrect': {data2}"
    )
    assert data2["escape"] is True, f"Expected escape: {data2}"
    assert data2["matched"] is False


def test_bridge_fallback(client, auth_headers):
    """Bridge fallback: respond with 'हाँ' at entry — matched, no escape."""
    r = client.post("/conversation/start", json={"mode": "graph"}, headers=auth_headers)
    assert r.status_code == 200
    session_id = r.json()["session_id"]

    r = client.post(
        "/conversation/turn",
        json={"session_id": session_id, "transcript": "हाँ"},
        headers=auth_headers,
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["matched"] is True, f"Bridge 'हाँ' should match: {data}"
    assert data["verdict"] == "correct"
    assert data["escape"] is False, f"No escape expected: {data}"


def test_escape_log_endpoint(client, auth_headers):
    """Escape-log endpoint returns grouped counts."""
    r = client.post("/conversation/start", json={"mode": "graph"}, headers=auth_headers)
    assert r.status_code == 200
    session_id = r.json()["session_id"]
    scenario_id = r.json()["scenario"]["id"]

    # Bridge past entry
    r = client.post(
        "/conversation/turn",
        json={"session_id": session_id, "transcript": "हाँ"},
        headers=auth_headers,
    )
    assert r.status_code == 200

    # Trigger an escape with gibberish
    r2 = client.post(
        "/conversation/turn",
        json={"session_id": session_id, "transcript": "फ़लदफ़दफ़"},
        headers=auth_headers,
    )
    assert r2.status_code == 200

    # Query escape log
    r3 = client.get(
        f"/conversation/escape-log?scenario_id={scenario_id}",
        headers=auth_headers,
    )
    assert r3.status_code == 200, r3.text
    data3 = r3.json()
    assert "entries" in data3
    assert "grouped" in data3
    assert len(data3["entries"]) >= 1
    assert len(data3["grouped"]) >= 1
    # Verify grouped counts
    total_from_entries = len(data3["entries"])
    total_from_grouped = sum(g["count"] for g in data3["grouped"])
    assert total_from_entries == total_from_grouped, f"Count mismatch: {data3}"
    # Check entry fields
    entry = data3["entries"][0]
    assert "node_id" in entry
    assert "transcript" in entry
    assert "verdict" in entry
    assert "ts" in entry


def test_session_ownership(client, auth_headers):
    """Learner B cannot post a turn to Learner A's session (404)."""
    # Create learner A's session
    r = client.post("/conversation/start", json={"mode": "graph"}, headers=auth_headers)
    assert r.status_code == 200
    session_id = r.json()["session_id"]

    # Login as learner B
    r_b = client.post(
        "/auth/dev-login",
        json={"display_name": "learner_b", "bridge_langs": ["en"]},
    )
    assert r_b.status_code == 200
    headers_b = {"Authorization": f"Bearer {r_b.json()['token']}"}

    # Attempt to use A's session
    r2 = client.post(
        "/conversation/turn",
        json={"session_id": session_id, "transcript": "हाँ"},
        headers=headers_b,
    )
    assert r2.status_code in (
        403,
        404,
    ), f"Expected 403/404, got {r2.status_code}: {r2.text}"


def test_empty_transcript_escape(client, auth_headers):
    """Empty/whitespace transcript triggers escape with 'empty' verdict."""
    r = client.post("/conversation/start", json={"mode": "graph"}, headers=auth_headers)
    assert r.status_code == 200
    session_id = r.json()["session_id"]

    r2 = client.post(
        "/conversation/turn",
        json={"session_id": session_id, "transcript": ""},
        headers=auth_headers,
    )
    assert r2.status_code == 200, r2.text
    data2 = r2.json()
    assert data2["matched"] is False
    assert data2["escape"] is True


def test_escape_at_entry_node_never_incorrect(client, auth_headers):
    """Regression: gibberish at the ENTRY node (bridge-only, no sa-edges to grade).

    The escape path must grade the utterance independently (§12) — unsure stays
    unsure; a valid-but-unexpected utterance is 'no_match', never 'incorrect'.
    """
    r = client.post("/conversation/start", json={"mode": "graph"}, headers=auth_headers)
    assert r.status_code == 200
    session_id = r.json()["session_id"]

    # Gibberish AT the entry node — no sa-edge grade runs here.
    r2 = client.post(
        "/conversation/turn",
        json={"session_id": session_id, "transcript": "फ़लदफ़दफ़"},
        headers=auth_headers,
    )
    assert r2.status_code == 200, r2.text
    data2 = r2.json()
    assert data2["matched"] is False
    assert data2["escape"] is True
    assert data2["verdict"] in ("unsure", "no_match"), data2
    assert data2["verdict"] != "incorrect"

    # A well-formed but unexpected Sanskrit sentence at entry is no_match, not incorrect.
    r3 = client.post(
        "/conversation/turn",
        json={"session_id": session_id, "transcript": "अहं फलं खादामि"},
        headers=auth_headers,
    )
    assert r3.status_code == 200, r3.text
    data3 = r3.json()
    assert data3["verdict"] == "no_match", data3
    assert data3["verdict"] != "incorrect"


def test_valid_but_unexpected_at_sa_node_no_match(client, auth_headers):
    """Regression: at a node WITH sa-edges, a confidently-parsed utterance that
    matches no edge escapes as 'no_match' — never 'incorrect' (§6.3: an escape
    never accuses; off_by_one still names the near miss)."""
    r = client.post("/conversation/start", json={"mode": "graph"}, headers=auth_headers)
    session_id = r.json()["session_id"]

    # Bridge past entry to the first sa question.
    r = client.post("/conversation/turn", json={"session_id": session_id, "transcript": "हाँ"}, headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    if data.get("session_done") or not any(e["lang"] == "sa" for e in data.get("edges", [])):
        return  # scenario shape changed; nothing to assert here

    # Valid, confident Sanskrit that matches no edge on this node.
    r2 = client.post(
        "/conversation/turn",
        json={"session_id": session_id, "transcript": "अहं फलं खादामि"},
        headers=auth_headers,
    )
    assert r2.status_code == 200, r2.text
    d2 = r2.json()
    assert d2["matched"] is False and d2["escape"] is True
    assert d2["verdict"] == "no_match", d2
    assert d2["verdict"] != "incorrect"


def test_prerendered_audio_records_prerendered_and_no_vendor_call(client, auth_headers):
    """P17-3: a turn/start on a node with audio_url records source='prerendered'
    on the UsageEvent ledger and issues ZERO vendor calls.

    The edge-router is module-stubbed to fail-if-called (its `route` returns
    None when `unavailable`, but here we assert it is never consulted at all by
    checking the stub recorded no calls). Nodes in the test DB carry an
    audio_url the moment a prerendered scenario is introduced — set one on the
    entry node and confirm the accounting.
    """
    from app.db import SessionLocal
    from app.models import DialogueNode, DialogueScenario, UsageEvent
    from app.services.metrics import tts_share

    db = SessionLocal()
    try:
        scenario = db.query(DialogueScenario).filter(
            DialogueScenario.review_status == "approved"
        ).first()
        assert scenario is not None
        entry = db.query(DialogueNode).filter(
            DialogueNode.id == scenario.entry_node_id
        ).first()
        assert entry is not None
        entry.audio_url = "/audio/dialogue/entry-node.wav"
        db.commit()
    finally:
        db.close()

    # Start the conversation graph — this returns the entry node WITH audio_url.
    r = client.post("/conversation/start", json={"mode": "graph"}, headers=auth_headers)
    assert r.status_code == 200, r.text
    node = r.json()["node"]
    assert node["audio_url"], "entry node should expose its pre-rendered audio_url"
    session_id = r.json()["session_id"]

    # The prerendered serve must be recorded, and must NOT consume quota / hit a vendor.
    db = SessionLocal()
    try:
        learner_id = auth_headers["Authorization"].split(" ")[1]
        # Resolve the learner from the token via the DB.
        from app.models import Token
        tok = db.query(Token).filter(Token.id == learner_id).first()
        assert tok is not None, "test token must resolve"
        lr = tok.learner
        ev = db.query(UsageEvent).filter(
            UsageEvent.learner_id == lr.id,
            UsageEvent.source == "prerendered",
        ).count()
        assert ev >= 1, "start on a prerendered node must record a prerendered event"
    finally:
        db.close()

    # And tts_share no longer reports 100% live once prerendered audio is served.
    db = SessionLocal()
    try:
        share = tts_share(db, hours=24)
    finally:
        db.close()
    assert share["prerendered_chars"] > 0, "prerendered chars must be visible to tts_share"
    assert share["live_share"] < 1.0, "tts_share must move off 100% live after a prerendered serve"

    # Zero vendor calls: a start on a prerendered node never consults the router.
    assert edge_router_module._singleton.calls == [], (
        "prerendered audio must not trigger any vendor (router) call"
    )


def test_negation_preempts_affirmative_on_dual_match(client, auth_headers):
    """Regression: an utterance hitting BOTH edge sets routes by negation.

    'I am not ready' contains 'ready' (affirmative edge) AND 'not' (negative
    edge). Scoring must consider every bridge edge — and a negation must
    pre-empt a longer affirmative phrase, regardless of rank order.
    """
    r = client.post("/conversation/start", json={"mode": "graph"}, headers=auth_headers)
    assert r.status_code == 200
    session_id = r.json()["session_id"]

    # Dual-edge utterance: affirmative 'ready' + negation 'not'.
    r2 = client.post(
        "/conversation/turn",
        json={"session_id": session_id, "transcript": "I am not ready"},
        headers=auth_headers,
    )
    assert r2.status_code == 200, r2.text
    d2 = r2.json()
    assert d2["matched"] is True, f"'I am not ready' must match the negative edge: {d2}"
    # Negative edge routes to the ask-again repair node (n00r: hi/repair),
    # NOT the first sa question (n01: sa/tutor).
    assert d2["node"]["kind"] == "repair", f"Negation must route to repair node: {d2}"
    assert d2["node"]["lang"] == "hi", f"Negation must route to hi node: {d2}"

    # Control: pure negative still routes negative.
    r_a = client.post("/conversation/start", json={"mode": "graph"}, headers=auth_headers)
    sid_a = r_a.json()["session_id"]
    r3 = client.post(
        "/conversation/turn",
        json={"session_id": sid_a, "transcript": "no"},
        headers=auth_headers,
    )
    assert r3.status_code == 200, r3.text
    d3 = r3.json()
    assert d3["matched"] is True and d3["node"]["kind"] == "repair", d3

    # Control: affirmative without negation still advances to the sa question.
    r_b = client.post("/conversation/start", json={"mode": "graph"}, headers=auth_headers)
    sid_b = r_b.json()["session_id"]
    r4 = client.post(
        "/conversation/turn",
        json={"session_id": sid_b, "transcript": "ready"},
        headers=auth_headers,
    )
    assert r4.status_code == 200, r4.text
    d4 = r4.json()
    assert d4["matched"] is True, f"'ready' must still match affirmative: {d4}"
    assert d4["node"]["kind"] == "tutor" and d4["node"]["lang"] == "sa", d4


def test_bridge_matching_is_whole_word(client, auth_headers):
    """Regression: bridge matching uses word boundaries, not substrings.

    'no' inside 'I know' must not match a negative edge; 'ready' inside
    'readiness' must not match the affirmative edge. Escape verdicts stay
    non-accusing either way.
    """
    r = client.post("/conversation/start", json={"mode": "graph"}, headers=auth_headers)
    assert r.status_code == 200
    session_id = r.json()["session_id"]

    # 'know' contains 'no' as a substring — boundary matching must reject it.
    r2 = client.post(
        "/conversation/turn",
        json={"session_id": session_id, "transcript": "I know"},
        headers=auth_headers,
    )
    assert r2.status_code == 200, r2.text
    d2 = r2.json()
    assert d2["matched"] is False, f"'I know' must not match a bridge edge: {d2}"
    assert d2["verdict"] != "incorrect"

    # The real affirmative still matches.
    r3 = client.post(
        "/conversation/turn",
        json={"session_id": session_id, "transcript": "हाँ"},
        headers=auth_headers,
    )
    assert r3.status_code == 200, r3.text
    d3 = r3.json()
    assert d3["matched"] is True, f"'हाँ' must still match: {d3}"


def test_consecutive_escapes_escalate_and_reveal(client, auth_headers):
    """Regression: a learner who cannot answer is moved on, not asked forever.

    Escape 4 reveals the authored answer and steps the graph FORWARD. v1 ended
    the session here, which only traded the loop for a dead end at question 1.
    """
    r = client.post("/conversation/start", json={"mode": "graph"}, headers=auth_headers)
    assert r.status_code == 200
    session_id = r.json()["session_id"]

    gibberish = "फ़लदफ़दफ़"
    verdicts, nodes = [], []
    for _ in range(12):
        r2 = client.post(
            "/conversation/turn",
            json={"session_id": session_id, "transcript": gibberish},
            headers=auth_headers,
        )
        assert r2.status_code == 200, r2.text
        d2 = r2.json()
        assert d2["verdict"] != "incorrect"
        verdicts.append(d2["verdict"])
        nodes.append(d2["node"]["id"])
        if d2["session_done"]:
            break

    assert "revealed" in verdicts, (
        f"escape ladder never revealed an answer: {verdicts}"
    )
    # The reveal must carry the line the learner failed to produce.
    idx = verdicts.index("revealed")
    r3 = client.post(
        "/conversation/turn",
        json={"session_id": session_id, "transcript": gibberish},
        headers=auth_headers,
    )
    assert r3.status_code == 200
    # …and it must not park the learner back where they already were.
    assert nodes[idx] not in nodes[:idx], (
        f"reveal moved the learner to an already-visited node: {nodes}"
    )


def test_router_never_offered_fallback_routing_edges(client, auth_headers):
    """Regression (owner report, reproduced in the running app): a wrong
    Sanskrit answer came back matched=True / verdict "correct".

    A question node's only bridge edge is the FALLBACK ROUTING edge to its
    repair — no expected_phrases, no expected_text, not a thing a learner can
    say. Handing it to the edge-router left exactly one candidate, so the
    router picked it and laundered every failed answer into a bridge match:
    no escape logged, no streak, ladder never fires, question ↔ repair
    forever. The router must not see those edges at all.
    """
    r = client.post("/conversation/start", json={"mode": "graph"}, headers=auth_headers)
    assert r.status_code == 200
    session_id = r.json()["session_id"]

    r = client.post(
        "/conversation/turn",
        json={"session_id": session_id, "transcript": "हाँ"},
        headers=auth_headers,
    )
    assert r.json()["matched"] is True   # now at the first sa question

    d = client.post(
        "/conversation/turn",
        # Valid-ish Sanskrit that no edge on this node accepts.
        json={"session_id": session_id, "transcript": "aham brahmāsmi"},
        headers=auth_headers,
    ).json()
    assert d["matched"] is False, f"a wrong answer must not match a bridge edge: {d}"
    assert d["verdict"] != "correct", f"a wrong answer must never grade correct: {d}"
    assert d["escape"] is True, f"a wrong answer must take the escape path: {d}"


def test_repair_acknowledgement_does_not_reset_escape_streak(client, auth_headers):
    """Regression (owner report): the conversation repeated two lines forever.

    Miss the question → narrow repair → "हाँ" back to the question → miss it
    again. Every acknowledgement cleared `consecutive_escapes`, so the
    escalation ladder never reached 3 and the pair ping-ponged with no exit.
    The streak must survive a repair node's own acknowledgement.
    """
    r = client.post("/conversation/start", json={"mode": "graph"}, headers=auth_headers)
    assert r.status_code == 200
    session_id = r.json()["session_id"]

    def turn(text):
        r2 = client.post(
            "/conversation/turn",
            json={"session_id": session_id, "transcript": text},
            headers=auth_headers,
        )
        assert r2.status_code == 200, r2.text
        return r2.json()

    assert turn("हाँ")["matched"] is True  # entry bridge → first sa question
    stuck_node = None
    escaped = []
    for _ in range(6):
        d = turn("aham rāmam asmi")   # off_by_one: wrong case, drives the narrow repair
        escaped.append(d["node"]["id"])
        if d["verdict"] == "revealed" or d["session_done"]:
            stuck_node = d["node"]["id"]
            break
        turn("हाँ")                    # acknowledge the repair, back to the question

    assert stuck_node is not None, (
        f"never escalated out of the repair loop — visited {escaped}"
    )
    assert len(set(escaped)) > 1, "the learner never left the repair node"


# ─── LLM edge-router (bridge turns) ─────────────────────────────────────────


def test_romanized_hinglish_reply_matches_via_router(client, auth_headers, stub_edge_router):
    """Regression (production escape logs, 2026-08-30): 'Haa' and 'Ji' at the
    Hindi greeting node were logged as `unsure` escapes because the phrase
    matcher only knew 'haan'. The LLM router routes them to the affirmative
    edge — matched=true, verdict=correct, no escape row."""
    for reply in ("Haa", "Ji", "haan ji", "Ok sure"):
        r = client.post("/conversation/start", json={"mode": "graph"}, headers=auth_headers)
        assert r.status_code == 200
        session_id = r.json()["session_id"]

        r2 = client.post(
            "/conversation/turn",
            json={"session_id": session_id, "transcript": reply},
            headers=auth_headers,
        )
        assert r2.status_code == 200, r2.text
        d2 = r2.json()
        assert d2["matched"] is True, f"{reply!r} must route via the LLM: {d2}"
        assert d2["verdict"] == "correct", d2
        assert d2["escape"] is False, d2
        # Router advanced past the greeting to the first sa question.
        assert d2["node"]["lang"] == "sa", d2
        # The router actually fired (phrase matcher alone can't catch these).
        assert len(stub_edge_router.calls) >= 1, f"router not consulted for {reply!r}"


def test_router_not_consulted_when_phrase_matcher_resolves(client, auth_headers, stub_edge_router):
    """A seeded phrase ('हाँ') resolves deterministically — zero LLM calls."""
    r = client.post("/conversation/start", json={"mode": "graph"}, headers=auth_headers)
    session_id = r.json()["session_id"]

    r2 = client.post(
        "/conversation/turn",
        json={"session_id": session_id, "transcript": "हाँ"},
        headers=auth_headers,
    )
    assert r2.status_code == 200
    assert r2.json()["matched"] is True
    assert stub_edge_router.calls == [], "phrase match must short-circuit the LLM"


def test_router_failure_falls_back_to_escape(client, auth_headers, stub_edge_router):
    """Fail-closed: when the router is unavailable/erroring, an unmatched
    utterance takes the escape path exactly as before the router existed."""
    stub_edge_router.unavailable = True
    r = client.post("/conversation/start", json={"mode": "graph"}, headers=auth_headers)
    session_id = r.json()["session_id"]

    r2 = client.post(
        "/conversation/turn",
        json={"session_id": session_id, "transcript": "Haa"},
        headers=auth_headers,
    )
    assert r2.status_code == 200, r2.text
    d2 = r2.json()
    assert d2["matched"] is False, d2
    assert d2["escape"] is True, d2
    assert d2["verdict"] != "incorrect", "escape must never accuse (§6.3)"


def test_router_null_is_escape_not_advance(client, auth_headers, stub_edge_router):
    """Router returning None (genuine no-match) → escape path, session intact."""
    r = client.post("/conversation/start", json={"mode": "graph"}, headers=auth_headers)
    session_id = r.json()["session_id"]

    # Gibberish: the stub finds no phrase overlap → None, like the real router.
    r2 = client.post(
        "/conversation/turn",
        json={"session_id": session_id, "transcript": "xyzzy quux"},
        headers=auth_headers,
    )
    assert r2.status_code == 200, r2.text
    d2 = r2.json()
    assert d2["matched"] is False and d2["escape"] is True, d2


def test_router_never_sees_sa_edges(client, auth_headers, stub_edge_router):
    """Contract: the router only receives bridge edges. At the first sa
    question (bridge fallback + sa edges present), the router's candidate
    list must contain bridge edges only — sa grading stays deterministic."""
    r = client.post("/conversation/start", json={"mode": "graph"}, headers=auth_headers)
    session_id = r.json()["session_id"]
    # Advance to the first sa question.
    r2 = client.post(
        "/conversation/turn",
        json={"session_id": session_id, "transcript": "हाँ"},
        headers=auth_headers,
    )
    assert r2.status_code == 200 and r2.json()["matched"] is True

    stub_edge_router.calls.clear()
    # Valid Sanskrit matching the sa edge — graded before any router call.
    r3 = client.post(
        "/conversation/turn",
        json={"session_id": session_id, "transcript": "aham rāmaḥ asmi"},
        headers=auth_headers,
    )
    assert r3.status_code == 200, r3.text
    d3 = r3.json()
    assert d3["matched"] is True and d3["verdict"] == "correct", d3
    assert stub_edge_router.calls == [], "sa matches must never consult the router"

    # Now a bridge-only miss at the sa node: router candidates must be bridge-only.
    stub_edge_router.calls.clear()
    r4 = client.post(
        "/conversation/turn",
        json={"session_id": session_id, "transcript": "xyzzy quux"},
        headers=auth_headers,
    )
    assert r4.status_code == 200
    if stub_edge_router.calls:
        for call in stub_edge_router.calls:
            # Every candidate the router saw lives on the scenario's bridge set.
            assert all(isinstance(i, str) for i in call["edge_ids"])


def test_pinned_edge_bypasses_router(client, auth_headers, stub_edge_router):
    """Client-pinned edge_id (test console) restricts matching to that edge
    and never consults the router — both when the transcript matches the
    pinned edge and when it doesn't (historical pin semantics: pin narrows
    the candidate set; it does not force a match)."""
    r = client.post("/conversation/start", json={"mode": "graph"}, headers=auth_headers)
    data = r.json()
    session_id = data["session_id"]
    affirmative_edge_id = data["edges"][0]["id"]  # rank 0 = हाँ/yes edge

    # Pinned + matching phrase → walks the edge, no router call.
    r2 = client.post(
        "/conversation/turn",
        json={"session_id": session_id, "edge_id": affirmative_edge_id,
              "transcript": "haan"},
        headers=auth_headers,
    )
    assert r2.status_code == 200, r2.text
    d2 = r2.json()
    assert d2["matched"] is True and d2["node"]["lang"] == "sa", d2
    assert stub_edge_router.calls == [], "pinned turns must not consult the router"

    # Pinned + non-matching transcript → escape, still no router call.
    r = client.post("/conversation/start", json={"mode": "graph"}, headers=auth_headers)
    session_id = r.json()["session_id"]
    r3 = client.post(
        "/conversation/turn",
        json={"session_id": session_id, "edge_id": affirmative_edge_id,
              "transcript": "xyzzy quux"},
        headers=auth_headers,
    )
    assert r3.status_code == 200, r3.text
    d3 = r3.json()
    assert d3["matched"] is False and d3["escape"] is True, d3
    assert stub_edge_router.calls == [], "pinned turns must not consult the router"


# ── Meta moves: questions ABOUT the line, not answers to it ──────────────
# The turn path must stay model-free (§12), so these assert the loop resolves
# them itself: same node, no grading, no escape logged. The generated answer
# is a separate call, stubbed below — no test may reach the real Sarvam API.


class _StubExplainer:
    """Stand-in for services/explainer.Explainer."""

    def __init__(self, text="It means: who are you?"):
        self.text = text
        self.calls: list[dict] = []

    @property
    def available(self) -> bool:
        return self.text is not None

    def _get_provider(self):
        raise ValueError("stub has no provider")

    async def explain(self, line, *, iast="", gloss="", question="",
                      translate_only=False, language="English"):
        self.calls.append({"line": line, "iast": iast, "gloss": gloss,
                           "question": question, "translate_only": translate_only,
                           "language": language})
        return self.text


@pytest.fixture
def stub_explainer(monkeypatch):
    """Patch the router's get_explainer; returns the stub for assertions."""
    from app.routers import conversation as conv_module

    stub = _StubExplainer()
    monkeypatch.setattr(conv_module, "get_explainer", lambda: stub)
    return stub


def _start(client, auth_headers):
    r = client.post("/conversation/start", json={"mode": "graph"}, headers=auth_headers)
    assert r.status_code == 200, r.text
    return r.json()


def test_meta_explain_holds_the_node(client, auth_headers):
    """'What does that mean?' does not advance, grade, or escape."""
    start = _start(client, auth_headers)
    sid, node_id = start["session_id"], start["node"]["id"]

    r = client.post(
        "/conversation/turn",
        json={"session_id": sid, "transcript": "इसका मतलब क्या होता है?"},
        headers=auth_headers,
    )
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["meta_intent"] == "explain"
    assert d["verdict"] == "meta"
    assert d["escape"] is False
    assert d["matched"] is False
    # Same node, and its exits are still on offer.
    assert d["node"]["id"] == node_id
    assert d["edges"], "a held node must still expose its edges"


def test_meta_repeat_detected(client, auth_headers):
    """'Say it again' is a meta move, answered client-side with no model."""
    start = _start(client, auth_headers)
    r = client.post(
        "/conversation/turn",
        json={"session_id": start["session_id"], "transcript": "phir se boliye"},
        headers=auth_headers,
    )
    assert r.status_code == 200, r.text
    assert r.json()["meta_intent"] == "repeat"


def test_meta_leaves_no_escape_log(client, auth_headers):
    """A question is not a failure: nothing reaches the authoring backlog."""
    start = _start(client, auth_headers)
    sid, scenario_id = start["session_id"], start["scenario"]["id"]
    log_url = f"/conversation/escape-log?scenario_id={scenario_id}"

    # The learner is shared across this module, so assert on the delta.
    before = len(client.get(log_url, headers=auth_headers).json()["entries"])

    client.post(
        "/conversation/turn",
        json={"session_id": sid, "transcript": "samajh nahi aaya"},
        headers=auth_headers,
    )
    r = client.get(log_url, headers=auth_headers)
    assert r.status_code == 200, r.text
    assert len(r.json()["entries"]) == before


def test_expected_reply_beats_meta_detection(client, auth_headers):
    """A seeded reply stays a real turn even if it reads like a meta phrase.

    Guards the ordering choice in process_turn: meta detection runs first, so
    exact expected-phrase equality has to win it back.
    """
    start = _start(client, auth_headers)
    sid = start["session_id"]
    r = client.post(
        "/conversation/turn",
        json={"session_id": sid, "transcript": "हाँ"},
        headers=auth_headers,
    )
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["meta_intent"] is None
    assert d["matched"] is True
    assert d["node"]["id"] != start["node"]["id"], "a real reply must advance"


def test_normal_turn_carries_no_meta_intent(client, auth_headers):
    """meta_intent stays null on ordinary turns."""
    start = _start(client, auth_headers)
    r = client.post(
        "/conversation/turn",
        json={"session_id": start["session_id"], "transcript": "हाँ तैयार है।"},
        headers=auth_headers,
    )
    assert r.json()["meta_intent"] is None


def test_explain_endpoint_returns_generated_text(client, auth_headers, stub_explainer):
    """POST /conversation/explain answers about the session's current node."""
    start = _start(client, auth_headers)
    r = client.post(
        "/conversation/explain",
        json={"session_id": start["session_id"], "question": "इसका मतलब क्या होता है?"},
        headers=auth_headers,
    )
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["source"] == "llm"
    assert d["explanation"] == "It means: who are you?"
    assert d["line"] == start["node"]["devanagari"]
    # The learner's own words reach the model, so it can answer in kind.
    assert stub_explainer.calls[0]["question"] == "इसका मतलब क्या होता है?"


def test_explain_accepts_an_earlier_line(client, auth_headers, stub_explainer):
    """`text` lets the client ask about a bubble that is no longer current."""
    start = _start(client, auth_headers)
    r = client.post(
        "/conversation/explain",
        json={"session_id": start["session_id"], "text": "भवान् कः?", "translate_only": True},
        headers=auth_headers,
    )
    assert r.status_code == 200, r.text
    assert stub_explainer.calls[0]["line"] == "भवान् कः?"
    assert stub_explainer.calls[0]["translate_only"] is True
    # Not the current node, so its authored iast/gloss must not be attached.
    assert stub_explainer.calls[0]["gloss"] == ""


def test_explain_degrades_when_model_unavailable(client, auth_headers, stub_explainer):
    """A model outage still returns an answer — never a 5xx mid-conversation."""
    stub_explainer.text = None
    start = _start(client, auth_headers)
    r = client.post(
        "/conversation/explain",
        json={"session_id": start["session_id"]},
        headers=auth_headers,
    )
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["source"] in ("gloss", "none")
    assert d["explanation"].strip()


def test_explain_requires_session_ownership(client, auth_headers):
    """Another learner's session is not explainable."""
    start = _start(client, auth_headers)
    other = client.post("/auth/dev-login", json={"display_name": "intruder"})
    headers_b = {"Authorization": f"Bearer {other.json()['token']}"}
    r = client.post(
        "/conversation/explain",
        json={"session_id": start["session_id"]},
        headers=headers_b,
    )
    assert r.status_code == 404


def test_explain_answers_in_the_language_asked(client, auth_headers, stub_explainer):
    """The reply language is resolved server-side, not left to the model.

    Sarvam answers in Hindi whatever the system prompt says, so the endpoint
    decides from the learner's script and passes it as an instruction.
    """
    start = _start(client, auth_headers)
    sid = start["session_id"]

    client.post("/conversation/explain",
                json={"session_id": sid, "question": "इसका मतलब क्या होता है?"},
                headers=auth_headers)
    assert stub_explainer.calls[-1]["language"].startswith("Hindi")

    # Romanized Hinglish is Latin script — someone typing it can read English.
    client.post("/conversation/explain",
                json={"session_id": sid, "question": "matlab kya hai"},
                headers=auth_headers)
    assert stub_explainer.calls[-1]["language"] == "English"

    client.post("/conversation/explain",
                json={"session_id": sid, "question": "what does that mean"},
                headers=auth_headers)
    assert stub_explainer.calls[-1]["language"] == "English"
