"""P17-1: render item-file builder reads approved scenarios from the DB.

Verifies it pulls from the database (not the seed module), emits only
approved-scenario speakable nodes, and skips placeholders + already-rendered
nodes with distinct counts — so the render pass can never silently cover a
fraction of the authored graph (§2.11). No network.
"""

import json
import uuid

import pytest

from app.db import SessionLocal
from app.models import Challenge, DialogueEdge, DialogueNode, DialogueScenario
from app.services import iast

from scripts.build_render_items import build_challenge_items, build_items, main


@pytest.fixture(scope="module", autouse=True)
def _db_ready(client):
    return client


def _make_scenario(db, review_status="approved"):
    s = DialogueScenario(id=uuid.uuid4().hex[:16], title="render-me",
                         register="laukika", review_status=review_status)
    db.add(s)
    db.flush()
    return s


def _node(db, sid, devanagari="नमस्ते", lang="sa", kind="tutor", audio_url=""):
    n = DialogueNode(id=uuid.uuid4().hex[:16], scenario_id=sid, kind=kind,
                     lang=lang, devanagari=devanagari, iast="", gloss="",
                     audio_url=audio_url)
    db.add(n)
    db.flush()
    return n


def test_emits_approved_unrendered_only():
    """Inclusion/exclusion against the shared seeded DB — no exact counts.

    The seeded approved dialogue already contributes nodes, so assert the
    specific nodes we control: approved+speakable+unrendered appear, pending /
    already-rendered / placeholder do not.
    """
    db = SessionLocal()
    try:
        approved = _make_scenario(db, "approved")
        pending = _make_scenario(db, "pending")
        n_ok = _node(db, approved.id, devanagari="मम नाम")
        _node(db, approved.id, devanagari="कुशलम्", lang="hi")
        # pending scenario — must NOT be emitted
        _node(db, pending.id, devanagari="अगोचरम्")
        # already rendered — must be skipped & counted
        n_rendered = _node(db, approved.id, devanagari="पुराणम्",
                           audio_url="https://cd/x.wav")
        # placeholder — empty devanagari, must be skipped & counted
        n_ph = _node(db, approved.id, devanagari="", kind="nterm", lang="hi")
        db.commit()

        plan = build_items(db)
        items = plan["items"]
        texts = {it["text"] for it in items}
        assert "मम नाम" in texts and "कुशलम्" in texts, "approved unrendered must be emitted"
        assert "अगोचरम्" not in texts, "pending scenario content must be excluded"
        assert "पुराणम्" not in texts, "already-rendered node must be excluded"
        assert n_rendered.id in plan["skipped_rendered"], "rendered node counted separately"
        assert n_ph.id in plan["skipped_placeholder"], "placeholder counted separately"
        # shape is exactly {id, text, lang}
        assert all(set(it) == {"id", "text", "lang"} for it in items)
        # item id is the DB node id (so the render pass can write back)
        assert any(it["id"] == n_ok.id for it in items)
    finally:
        db.close()


def test_pending_scenario_never_emitted():
    db = SessionLocal()
    try:
        pending = _make_scenario(db, "pending")
        _node(db, pending.id, devanagari="केवलम्")
        db.commit()
        plan = build_items(db)
        assert not any(it["text"] == "केवलम्" for it in plan["items"]), \
            "pending scenario content must not reach the render item file"
    finally:
        db.close()


def test_dry_run_writes_nothing(tmp_path):
    db = SessionLocal()
    try:
        approved = _make_scenario(db, "approved")
        _node(db, approved.id, devanagari="मम नाम")
        db.commit()
    finally:
        db.close()

    out = tmp_path / "r.json"
    rc = main(["--out", str(out), "--dry-run"])
    assert rc == 0
    assert not out.exists(), "dry-run must not write the item file"


def test_emitted_ids_are_db_node_ids(tmp_path):
    """The id in the item file must be the DB DialogueNode.id so the render
    pass can write audio_url back to the exact row (P17-2 prerequisite)."""
    db = SessionLocal()
    try:
        approved = _make_scenario(db, "approved")
        n = _node(db, approved.id, devanagari="मम नाम")
        node_id = n.id
        db.commit()
    finally:
        db.close()

    out = tmp_path / "r.json"
    assert main(["--out", str(out)]) == 0
    items = json.loads(out.read_text(encoding="utf-8"))
    assert any(it["id"] == node_id for it in items), \
        "item id must be the DB node id for the render pass to write back"


# ─── P17-4: challenge render items ──────────────────────────────────────────

def _challenge(db, target, status="approved", register="laukika", audio_url=""):
    c = Challenge(
        id=uuid.uuid4().hex[:16], prompt_l1="Say it.", target_sanskrit=target,
        features=["NOM.SG"], register=register, review_status=status,
        # P7-13: IAST is lipi-derived even in fixtures, so leaked rows cannot
        # trip the table-wide IAST invariant test.
        target_iast=iast.to_iast(target),
        accepted_parses=[{"bāla": "NOM.SG"}], audio_url=audio_url,
    )
    db.add(c)
    db.flush()
    return c


def _cleanup(db, ids):
    if ids:
        db.query(Challenge).filter(Challenge.id.in_(ids)).delete(synchronize_session=False)
        db.commit()


def test_challenge_builder_emits_approved_unrendered_only():
    """P17-4: only approved, unrendered challenges are emitted; pending /
    rendered / rejected are excluded. Second run emits nothing new (₹0)."""
    db = SessionLocal()
    ids = []
    try:
        ok = _challenge(db, "बालः वनं गच्छति", "approved")
        ids.append(ok.id)
        _challenge(db, "सीता फलं खादति", "pending")
        _challenge(db, "नरः जलं पिबति", "rejected")
        rendered = _challenge(db, "अश्वः ग्रामं गच्छति", "approved",
                              audio_url="https://cd/x.wav")
        ids.append(rendered.id)
        db.commit()

        plan = build_challenge_items(db)
        texts = {it["text"] for it in plan["items"]}
        assert ok.target_sanskrit in texts, "approved unrendered challenge emitted"
        assert "सीता फलं खादति" not in texts, "pending challenge excluded"
        assert "नरः जलं पिबति" not in texts, "rejected challenge excluded"
        assert rendered.target_sanskrit not in texts, \
            "already-rendered challenge excluded (no duplicate spend)"
        assert rendered.id in plan["skipped_rendered"]
        assert all(set(it) == {"id", "text", "lang"} for it in plan["items"])
        assert all(it["lang"] == "sa" for it in plan["items"])
    finally:
        _cleanup(db, ids)
        db.close()


def test_challenge_builder_second_run_emits_zero():
    """A rendered challenge is never re-emitted: putting it in a second pass
    costs ₹0 (P17-4's no-duplicate-spend rule)."""
    db = SessionLocal()
    ids = []
    try:
        c = _challenge(db, "बालः पुस्तकं पठति", "approved", audio_url="/audio/c.wav")
        ids.append(c.id)
        db.commit()
        plan = build_challenge_items(db)
        assert all(it["id"] != c.id for it in plan["items"]), \
            "an already-rendered challenge must not be re-emitted"
        assert c.id in plan["skipped_rendered"]
    finally:
        _cleanup(db, ids)
        db.close()