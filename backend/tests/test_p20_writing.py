"""P20 — learning to write: items, grading contract, abstention safety.

P20-1: writing_items seeded (three tiers, additive, IAST lipi-derived).
P20-3: three-valued verdict; an `unsure` provably cannot lower mastery or
break a streak (the test asserts the router never writes mastery on unsure);
no image or stroke array is accepted by any endpoint (§2.16 — the request
schema has no field for them, so an oversized body cannot smuggle one in);
thresholds live in config, not in a literal.
"""

import pytest

from app.models import Learner, WritingAttempt, WritingItem
from app.services.writing import grade_writing


# ── P20-1: the corpus ────────────────────────────────────────────────────────

def test_writing_items_seeded(client):
    r = client.get("/writing/items", headers=auth_h(client))
    assert r.status_code == 200
    rows = r.json()
    assert rows, "writing corpus seeded"
    tiers = {row["tier"] for row in rows}
    assert {1, 2, 3} <= tiers, f"all three tiers present: {tiers}"
    # tier 1 starts at the first vowel — articulation order
    t1 = sorted([row for row in rows if row["tier"] == 1], key=lambda x: x["sort_order"])
    assert t1[0]["devanagari"] == "अ"
    # every row carries lipi IAST (P7-13 invariant extends here)
    from app.services.iast import matches
    bad = [row["devanagari"] for row in rows
           if not matches(row["devanagari"], row["iast"])]
    assert not bad, f"non-lipi IAST in writing_items: {bad[:5]}"


def test_writing_items_tier2_matras(client):
    r = client.get("/writing/items", params={"tier": 2}, headers=auth_h(client))
    rows = r.json()
    devs = {row["devanagari"] for row in rows}
    assert "क" in devs
    assert "का" in devs and "कि" in devs and "की" in devs


def test_writing_items_tier3_links_pool(client):
    """Tier 3 references existing challenge rows rather than duplicating them."""
    from app.db import SessionLocal
    from app.models import Challenge

    db = SessionLocal()
    try:
        rows = db.query(WritingItem).filter(WritingItem.tier == 3).all()
        assert rows, "tier 3 populated"
        linked = [r for r in rows if r.challenge_id]
        assert linked, "tier 3 words linked to challenge rows"
        ch_ids = {r.challenge_id for r in linked}
        found = db.query(Challenge).filter(Challenge.id.in_(ch_ids)).all()
        assert len(found) == len(ch_ids), "every challenge_id resolves"
    finally:
        db.close()


def auth_h(client):
    r = client.post("/auth/dev-login", json={"display_name": "tester", "bridge_langs": ["en"]})
    assert r.status_code == 200
    return {"Authorization": f"Bearer {r.json()['token']}"}


# ── P20-3: the grading contract ──────────────────────────────────────────────

def test_grade_correct_high_confidence():
    v = grade_writing("क", "क", 0.95)
    assert v == {"verdict": "correct", "abstained": False}


def test_grade_low_confidence_is_unsure_not_wrong():
    """A weak match on the right letter is still unsure — thresholds govern."""
    v = grade_writing("क", "क", 0.5)
    assert v["verdict"] == "unsure" and v["abstained"] is True


def test_grade_confident_different_letter_is_wrong():
    v = grade_writing("क", "ख", 0.9)
    assert v["verdict"] == "wrong" and v["abstained"] is False


def test_grade_empty_recognition_is_unsure():
    v = grade_writing("क", "", 0.9)
    assert v["verdict"] == "unsure"


def test_photo_path_biases_toward_unsure():
    """P20-4: the photo path's floors are higher — the same recognition that
    is confidently right on ink is only an abstention on photo."""
    ink = grade_writing("क", "क", 0.85, source="ink")
    photo = grade_writing("क", "क", 0.85, source="photo")
    assert ink["verdict"] == "correct"
    assert photo["verdict"] == "unsure", "photo floor > ink floor"
    # and the photo path almost never says wrong
    photo_wrong = grade_writing("क", "ख", 0.7, source="photo")
    assert photo_wrong["verdict"] == "unsure"


def test_thresholds_live_in_config_not_literals():
    from app.config import settings
    assert settings.writing_correct_confidence > 0.5
    assert settings.writing_photo_correct_confidence > settings.writing_correct_confidence
    assert settings.writing_photo_wrong_confidence > settings.writing_wrong_confidence


# ── the endpoint + abstention safety ────────────────────────────────────────

def _item(db, dev=None, tier=1):
    """Use an existing seeded row (or add a throwaway one for a letter the
    seed does not carry). Never insert a row that collides with the seed."""
    from app.services.iast import to_iast
    if dev is not None:
        it = (
            db.query(WritingItem)
            .filter(WritingItem.tier == tier, WritingItem.devanagari == dev)
            .first()
        )
        if it is not None:
            return it, False  # existing — do not delete
    it = WritingItem(
        id=f"wi-test-{dev or 'zz'}-{id(db) % 100000}", tier=tier, sort_order=999,
        devanagari=dev or "卐",  # a glyph the seed will never carry
        iast=to_iast(dev) if dev else "",
        gloss="", stroke_paths=[],
    )
    db.add(it)
    db.commit()
    return it, True  # created — cleanup required


def _cleanup_item(db, item_id, created=True):
    if not created:
        return
    db.query(WritingAttempt).filter(WritingAttempt.item_id == item_id).delete(synchronize_session=False)
    db.query(WritingItem).filter(WritingItem.id == item_id).delete(synchronize_session=False)
    db.commit()


def test_attempt_endpoint_verdicts(client):
    from app.db import SessionLocal
    db = SessionLocal()
    try:
        it, created = _item(db, "क")
        h = auth_h(client)
        # correct
        r = client.post("/writing/attempt", headers=h, json={
            "item_id": it.id, "recognised_text": "क", "confidence": 0.95, "source": "ink"})
        assert r.status_code == 200
        assert r.json()["verdict"] == "correct"
        # unsure — low confidence
        r2 = client.post("/writing/attempt", headers=h, json={
            "item_id": it.id, "recognised_text": "क", "confidence": 0.3, "source": "ink"})
        assert r2.json()["verdict"] == "unsure" and r2.json()["abstained"] is True
        # wrong — confident different letter
        r3 = client.post("/writing/attempt", headers=h, json={
            "item_id": it.id, "recognised_text": "ग", "confidence": 0.9, "source": "ink"})
        assert r3.json()["verdict"] == "wrong"
    finally:
        _cleanup_item(db, it.id, created)
        db.close()


def test_unsure_cannot_lower_mastery_or_break_streak(client):
    """The §2.2 test: after an unsure attempt the learner's mastery map and
    streak are untouched. Structurally guaranteed — the router never writes
    them outside the `correct` branch — and asserted here against the DB.

    Runs on a THROWAWAY learner: the shared 'tester' accumulates attempts
    from the other tests in this module, so 'no write: entries' would be
    meaningless on it."""
    from app.db import SessionLocal
    db = SessionLocal()
    lr = None
    try:
        it, created = _item(db, "ख")
        lr = Learner(
            id="unsure-test-learner", display_name="unsure-test-learner",
            bridge_langs=["en"], feature_mastery={},
            sanskrit_ratio=0.3, sanskrit_ratio_setting=0.8,
        )
        db.add(lr)
        from app.models import Token
        db.add(Token(id="unsure-test-token", learner_id=lr.id))
        db.commit()
        h = {"Authorization": "Bearer unsure-test-token"}
        before = client.get("/me", headers=h).json()

        for _ in range(3):
            r = client.post("/writing/attempt", headers=h, json={
                "item_id": it.id, "recognised_text": "", "confidence": 0.1, "source": "ink"})
            assert r.json()["verdict"] == "unsure"

        after = client.get("/me", headers=h).json()
        assert after["learner"]["streak"] == before["learner"]["streak"], "unsure never breaks a streak"
        assert after["learner"]["sanskrit_ratio"] == before["learner"]["sanskrit_ratio"], "unsure never moves the ratio"
        # no mastery entries were written by the unsure attempts
        db.expire_all()
        db.refresh(lr)
        writes = {k: v for k, v in (lr.feature_mastery or {}).items() if k.startswith("write:")}
        assert not writes, f"unsure attempts wrote mastery: {writes}"
    finally:
        _cleanup_item(db, it.id, created)
        if lr is not None:
            db.query(Learner).filter(Learner.id == lr.id).delete(synchronize_session=False)
            db.commit()
        db.close()


def test_correct_attempt_can_feed_mastery(client):
    from app.db import SessionLocal
    db = SessionLocal()
    try:
        it, created = _item(db, "ग")
        h = auth_h(client)
        r = client.post("/writing/attempt", headers=h, json={
            "item_id": it.id, "recognised_text": "ग", "confidence": 0.95, "source": "ink"})
        assert r.json()["verdict"] == "correct"
        db.expire_all()
        lr = db.query(Learner).filter(Learner.display_name == "tester").first()
        writes = {k: v for k, v in (lr.feature_mastery or {}).items() if k.startswith("write:")}
        assert writes, "a correct attempt feeds mastery"
    finally:
        _cleanup_item(db, it.id, created)
        db.close()


def test_no_strokes_or_image_accepted(client):
    """§2.16: the request schema has no field for strokes or an image — extra
    fields are dropped by the pydantic model, so they cannot reach the DB."""
    from app.db import SessionLocal
    db = SessionLocal()
    try:
        it, created = _item(db, "घ")
        h = auth_h(client)
        r = client.post("/writing/attempt", headers=h, json={
            "item_id": it.id, "recognised_text": "घ", "confidence": 0.95,
            "source": "ink",
            "strokes": [[[0, 0], [1, 1]]],       # must be ignored, not stored
            "image_base64": "AAAA",              # must be ignored, not stored
        })
        assert r.status_code == 200
        db.expire_all()
        row = db.query(WritingAttempt).filter(WritingAttempt.item_id == it.id).first()
        assert row is not None
        assert not hasattr(row, "strokes") and not hasattr(row, "image_base64")
        assert row.recognised_text == "घ"
    finally:
        _cleanup_item(db, it.id, created)
        db.close()


def test_photo_abstention_reported_per_source(client):
    from app.db import SessionLocal
    db = SessionLocal()
    try:
        it, created = _item(db, "च")
        h = auth_h(client)
        client.post("/writing/attempt", headers=h, json={
            "item_id": it.id, "recognised_text": "च", "confidence": 0.5, "source": "photo"})
        client.post("/writing/attempt", headers=h, json={
            "item_id": it.id, "recognised_text": "च", "confidence": 0.95, "source": "ink"})
        r = client.get("/admin/metrics", headers={"X-Admin-Token": "test-admin"})
        w = r.json().get("writing", {})
        assert "photo" in w and "ink" in w
        assert w["photo"]["abstention_rate"] == 1.0
        # this test's ink attempt was confident-correct; other tests in the
        # module may have added unsure ink attempts, so assert OUR attempt
        # counted and the rate reflects the shared counters.
        assert w["ink"]["attempts"] >= 1
    finally:
        _cleanup_item(db, it.id, created)
        db.close()
