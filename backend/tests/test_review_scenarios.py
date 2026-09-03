"""P7-3: offline scenario review tool.

Covers the walk order (graph order from entry_node_id, indented under the
reaching edge), idempotent approve/reject (no-op does not rewrite
reviewed_at), the pending-packet writer, and that unreachable nodes are
surfaced rather than silently dropped (§2.11). Pure DB — no network, no
server, no admin token.
"""

import os
import io

import pytest

from app.db import SessionLocal
from app.models import DialogueEdge, DialogueNode, DialogueScenario

from scripts.review_scenarios import (
    load_scenarios,
    render_packet,
    render_scenario,
    set_review_status,
)


@pytest.fixture(scope="module", autouse=True)
def _db_ready(client):
    """Ensure the session DB is migrated+seeded even when this module runs alone.

    ``client`` (conftest) is session-scoped and calls init_db + run_seed;
    depending on it here makes that guaranteed before any SessionLocal use.
    """
    return client


def _uuid():
    import uuid
    return uuid.uuid4().hex[:16]


def _make_scenario(db, **kw):
    fields = {
        "id": _uuid(),
        "title": "test scenario",
        "register": "laukika",
        "review_status": "pending",
        "est_minutes": 5,
        **kw,
    }
    s = DialogueScenario(**fields)
    db.add(s)
    db.flush()
    return s


def _node(db, sid, kind="tutor", lang="sa", **kw):
    n = DialogueNode(
        id=_uuid(), scenario_id=sid, kind=kind, lang=lang,
        devanagari=kw.pop("devanagari", "परीक्षा"), iast=kw.pop("iast", ""),
        gloss=kw.pop("gloss", ""), **kw,
    )
    db.add(n)
    db.flush()
    return n


def _edge(db, sid, from_n, to_n, rank=0, lang="bridge", text="आह"):
    e = DialogueEdge(
        id=_uuid(), scenario_id=sid, from_node_id=from_n.id,
        to_node_id=to_n.id, lang=lang, expected_text=text,
        accepted_parses=[], expected_phrases=[], features=[], rank=rank,
    )
    db.add(e)
    db.flush()
    return e


@pytest.fixture
def graph_db():
    """A fresh scenario with an entry → (bridge) → repair chain + an orphan."""
    db = SessionLocal()
    try:
        s = _make_scenario(db, title="walkable-" + _uuid())
        entry = _node(db, s.id, devanagari="नमस्ते", iast="namaste", gloss="hello")
        mid = _node(db, s.id, devanagari="कुशलम्", iast="kuśalam", gloss="well")
        repair = _node(db, s.id, kind="repair", repair_type="bridge",
                       devanagari="कृपया पुनः", iast="kṛpayā punaḥ", lang="hi", gloss="please again")
        orphan = _node(db, s.id, devanagari="अनाथम्", lang="sa", gloss="orphan")
        _edge(db, s.id, entry, mid, rank=1)
        _edge(db, s.id, mid, repair, rank=0)
        s.entry_node_id = entry.id
        db.commit()
        db.refresh(s)
        yield s
    finally:
        db.close()


def _render_lines(db, s):
    return render_scenario(db, db.get(DialogueScenario, s.id))


def test_walk_order_follows_edges_from_entry(graph_db):
    """Nodes appear in graph order from the entry, indented under the edge."""
    db = SessionLocal()
    try:
        lines = _render_lines(db, graph_db)
        joined = "\n".join(lines)
        # entry node text appears before its child and the repair node
        assert joined.index("नमस्ते") < joined.index("कुशलम्") < joined.index("कृपया पुनः")
        # the learner phrase sits between its nodes
        assert "आह" in joined
        # repair_type is marked
        assert "REPAIR:bridge" in joined
        # no raw node ids leak into normal bodies (ids only on flagged lines)
        flagged = [l for l in lines if graph_db.id in l]
        body = [l for l in lines if l not in flagged]
        for l in body:
            assert graph_db.id not in l, f"raw id leaked into body: {l}"
    finally:
        db.close()


def test_unreachable_nodes_are_surfaced_not_dropped(graph_db):
    db = SessionLocal()
    try:
        joined = "\n".join(_render_lines(db, graph_db))
        assert "नमस्ते" in joined
        assert "UNREACHABLE FROM ENTRY" in joined
        assert "अनाथ" in joined
    finally:
        db.close()


def test_approve_is_idempotent_and_sets_reviewed_at(graph_db):
    db = SessionLocal()
    try:
        s1, changed1 = set_review_status(db, graph_db.id, "approved")
        assert changed1 is True
        assert s1["review_status"] == "approved"
        reviewed_at_1 = s1["reviewed_at"]

        s2, changed2 = set_review_status(db, graph_db.id, "approved")
        assert changed2 is False, "re-approving must be a no-op"
        assert s2["reviewed_at"] == reviewed_at_1, "no-op must not rewrite reviewed_at"
    finally:
        db.close()


def test_reject_sets_note(graph_db):
    db = SessionLocal()
    try:
        s, changed = set_review_status(db, graph_db.id, "rejected", note="not worth saying")
        assert changed is True
        assert s["review_status"] == "rejected"
        assert s["review_note"] == "not worth saying"
        # approved stays invisible afterward via the status filter
        rows = load_scenarios(db, status="approved")
        assert all(r["id"] != graph_db.id for r in rows)
    finally:
        db.close()


def test_list_reports_counts_and_statuses(graph_db):
    db = SessionLocal()
    try:
        rows = load_scenarios(db)  # includes the seeded scenario + walkable
        row = next(r for r in rows if r["id"] == graph_db.id)
        assert row["n_nodes"] == 4
        assert row["n_edges"] == 2
        assert row["review_status"] == "pending"
        assert row["register"] == "laukika"
    finally:
        db.close()


def test_packet_writes_only_pending_scenarios(graph_db):
    db = SessionLocal()
    try:
        # create a distinct pending scenario (seeded content is always approved)
        pend = _make_scenario(db, title="packet-me", id=_uuid())
        db.commit()
        # approve the fixture scenario so it is not pending
        set_review_status(db, graph_db.id, "approved")
        buf = io.StringIO()
        n = render_packet(db, "", out=buf)
        out = buf.getvalue()
        assert n >= 1
        assert "packet-me" in out, "the pending scenario must be in the packet"
        assert graph_db.title not in out, "the approved scenario must not appear in the pending packet"
    finally:
        db.close()


def test_show_unknown_errors():
    db = SessionLocal()
    try:
        with pytest.raises(FileNotFoundError):
            set_review_status(db, "does-not-exist", "approved")
    finally:
        db.close()