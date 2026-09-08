"""P13 — push tokens and the daily-notify job. No network in any test."""

from app.db import SessionLocal
from app.models import Learner, NotificationSend, PushToken
from app.services.notify import (
    MAX_IGNORED,
    build_message,
    ignored_streak,
    record_failure,
    register_token,
    run_notify_job,
)

ADMIN = {"X-Admin-Token": "test-admin"}


def _learner(db, name="p13user"):
    import uuid
    lid = "p13-" + uuid.uuid4().hex[:8]
    learner = Learner(id=lid, display_name=name, bridge_langs=["en", "hi"], timezone="UTC")
    db.add(learner)
    db.commit()
    db.refresh(learner)
    return learner


def _auth(client, name):
    r = client.post("/auth/dev-login", json={"display_name": name, "bridge_langs": ["en", "hi"]})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


def test_register_and_replace_revives(client):
    h = _auth(client, "p13-reg")
    r = client.post("/me/push-tokens", headers=h, json={"device_id": "d1", "token": "tok-aaa-111", "platform": "android"})
    assert r.status_code == 200, r.text
    assert r.json()["dead"] is False
    # Replace same device: one row, new token.
    r = client.post("/me/push-tokens", headers=h, json={"device_id": "d1", "token": "tok-bbb-222", "platform": "android"})
    assert r.status_code == 200
    db = SessionLocal()
    try:
        from app.auth import get_learner_from_token
        tok = h["Authorization"].split(" ", 1)[1]
        learner = get_learner_from_token(tok, db)
        rows = db.query(PushToken).filter(PushToken.learner_id == learner.id).all()
        assert len(rows) == 1
        assert rows[0].token == "tok-bbb-222"
    finally:
        db.close()


def test_two_devices_two_rows(client):
    h = _auth(client, "p13-twodev")
    for dev in ("d1", "d2"):
        r = client.post("/me/push-tokens", headers=h, json={"device_id": dev, "token": f"tok-{dev}-xyz", "platform": "ios"})
        assert r.status_code == 200
    db = SessionLocal()
    try:
        from app.auth import get_learner_from_token
        learner = get_learner_from_token(h["Authorization"].split(" ", 1)[1], db)
        assert db.query(PushToken).filter(PushToken.learner_id == learner.id).count() == 2
    finally:
        db.close()


def test_delete_token(client):
    h = _auth(client, "p13-del")
    client.post("/me/push-tokens", headers=h, json={"device_id": "d1", "token": "tok-del-me-1"})
    r = client.delete("/me/push-tokens", headers=h, params={"device_id": "d1"})
    assert r.status_code == 200
    r = client.delete("/me/push-tokens", headers=h, params={"device_id": "d1"})
    assert r.status_code == 200  # absent is not an error


def test_two_strikes_dead_then_skipped(client):
    db = SessionLocal()
    try:
        learner = _learner(db)
        row = register_token(db, learner, "d1", "tok-dead-beef", "android")
        assert row.dead is False
        record_failure(db, row)
        db.refresh(row)
        assert row.dead is False
        record_failure(db, row)
        db.refresh(row)
        assert row.dead is True
        # Re-register revives.
        row2 = register_token(db, learner, "d1", "tok-new-device", "android")
        assert row2.dead is False
        assert row2.fail_count == 0
    finally:
        db.close()


def test_job_idempotent_second_run_skips(client):
    db = SessionLocal()
    try:
        learner = _learner(db, "p13-idem")
        register_token(db, learner, "d1", "tok-idem-0001", "android")
        before = db.query(NotificationSend).filter(NotificationSend.learner_id == learner.id).count()
        out1 = run_notify_job(db, transport=lambda t, ti, b: True, kind="reminder")
        assert out1["sent"] >= 1
        mid = db.query(NotificationSend).filter(NotificationSend.learner_id == learner.id).count()
        assert mid == before + 1
        out2 = run_notify_job(db, transport=lambda t, ti, b: True, kind="reminder")
        after = db.query(NotificationSend).filter(NotificationSend.learner_id == learner.id).count()
        assert after == mid  # no double-send
        assert out2["skipped_already_sent"] >= 1
    finally:
        db.close()


def test_job_one_a_day_across_kinds(client):
    db = SessionLocal()
    try:
        learner = _learner(db, "p13-oneaday")
        register_token(db, learner, "d1", "tok-oneaday-1", "android")
        out1 = run_notify_job(db, transport=lambda t, ti, b: True, kind="reminder")
        assert out1["sent"] >= 1
        out2 = run_notify_job(db, transport=lambda t, ti, b: True, kind="word")
        assert out2["skipped_one_a_day"] >= 1
    finally:
        db.close()


def test_job_stops_after_ignored(client):
    from datetime import date, timedelta
    db = SessionLocal()
    try:
        learner = _learner(db, "p13-ignored")
        register_token(db, learner, "d1", "tok-ignored-11", "android")
        # MAX_IGNORED past sends, no activity at all → streak == sends.
        for i in range(1, MAX_IGNORED + 1):
            day = (date.today() - timedelta(days=i)).isoformat()
            db.add(NotificationSend(learner_id=learner.id, local_date=day, kind="reminder"))
        db.commit()
        assert ignored_streak(db, learner.id) >= MAX_IGNORED
        out = run_notify_job(db, transport=lambda t, ti, b: True, kind="reminder")
        assert out["skipped_ignored"] >= 1
    finally:
        db.close()


def test_copy_never_shames():
    banned = ("streak", "gone", "days", "lost", "shame", "urgent", "hurry", "missed", "lazy")
    for kind, content in (("reminder", ""), ("sloka", "धर्मक्षेत्रे"), ("word", "पुस्तकम्")):
        title, body = build_message(kind, content)
        blob = f"{title} {body}".lower()
        for word in banned:
            assert word not in blob, (kind, word, blob)


def test_admin_run_endpoint_idempotent(client):
    h = _auth(client, "p13-adminrun")
    client.post("/me/push-tokens", headers=h, json={"device_id": "d1", "token": "tok-admin-987"})
    r = client.get("/admin/notify/run", headers=ADMIN)
    assert r.status_code in (404, 405)  # GET is not the job; POST is
    r1 = client.post("/admin/notify/run", headers=ADMIN)
    assert r1.status_code == 200, r1.text
    r2 = client.post("/admin/notify/run", headers=ADMIN)
    assert r2.status_code == 200
    # Second identical run can only skip more, never send more.
    assert r2.json()["sent"] <= r1.json()["sent"]
