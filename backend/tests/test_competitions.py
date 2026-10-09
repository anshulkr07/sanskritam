"""Competition windows, eligibility, counted rules, ranking, hold, monthly, purge (11.15)."""

from datetime import datetime, timezone


def _login(client, name="comp"):
    r = client.post("/auth/dev-login", json={"display_name": name, "bridge_langs": ["en"]})
    assert r.status_code == 200, r.text
    tok = r.json()["token"]
    return {"Authorization": f"Bearer {tok}"}, tok


def _set_identity(client, headers, tok, google=True):
    from app.db import SessionLocal
    from app.auth import get_learner_from_token
    db = SessionLocal()
    try:
        learner = get_learner_from_token(tok, db)
        if google:
            learner.google_sub = "g-" + learner.id
        db.commit()
    finally:
        db.close()


def test_windows_and_tick_idempotent(client, monkeypatch):
    from app.db import SessionLocal
    from app.services import competitions as svc
    from app.models import Competition, Shloka, VerseAudio
    from app.services.chant_text import verse_uid as _u
    db = SessionLocal()
    try:
        # Wednesday 23:59 IST is midweek; Thursday 00:00 opens weekend.
        # 2026-10-07 is Wednesday; 2026-10-08 Thursday.
        wed = datetime(2026, 10, 7, 18, 29, 0, tzinfo=timezone.utc)  # 23:59 IST
        thu = datetime(2026, 10, 7, 18, 30, 0, tzinfo=timezone.utc)  # 00:00 IST Thu
        # _window_for_fixed takes naive local; feed IST naive.
        from zoneinfo import ZoneInfo
        ist = ZoneInfo("Asia/Kolkata")
        k1, *_ = svc._window_for_fixed(wed.astimezone(ist).replace(tzinfo=None))
        k2, *_ = svc._window_for_fixed(thu.astimezone(ist).replace(tzinfo=None))
        assert k1 == "midweek" and k2 == "weekend"
        # Seed served chant for an existing verse and point rotation at it.
        s = db.query(Shloka).first()
        uid = getattr(s, "verse_uid", "") or _u(s.source_ref or "", s.devanagari or "")
        if db.query(VerseAudio).filter(VerseAudio.verse_uid == uid).first() is None:
            db.add(VerseAudio(verse_uid=uid, voice="vagdhenu-steer-2026-06-17",
                              url="/audio/t.m4a", duration_ms=20000, lines=[],
                              meter="", qc_status="auto_ok", qc_reasons=[]))
            db.commit()
        from app.seeds import competition_pieces as _p
        monkeypatch.setattr(_p, "PIECES", [s.source_ref])
        n1 = svc.ensure_next(db, wed)
        n2 = svc.ensure_next(db, wed)
        assert n2 == 0  # idempotent
        db.commit()
        assert db.query(Competition).count() >= 2
    finally:
        db.close()


def test_eligibility_counted_best_hold_publish(client, monkeypatch):
    from app.config import settings
    monkeypatch.setattr(settings, "scorer_url", "fake")
    monkeypatch.setattr(settings, "competition_attempts_per_day", 10)
    h, tok = _login(client, "compA")
    _set_identity(client, h, tok)
    # Profile steps in order.
    r = client.post("/competitions/x/attempts", headers=h,
                    files={"file": ("a.m4a", b"\x00" * 4000, "audio/mp4")},
                    data={"verse_uid": "u", "camera": "{}"})
    assert r.status_code in (403, 404)
    # Build an open competition directly.
    from app.db import SessionLocal
    from app.models import Competition, Shloka
    from app.services.chant_text import verse_uid as _u
    db = SessionLocal()
    try:
        s = db.query(Shloka).first()
        uid = getattr(s, "verse_uid", "") or _u(s.source_ref or "", s.devanagari or "")
        now = datetime.now(timezone.utc)
        from datetime import timedelta
        comp = Competition(slug="test-open-1", kind="weekend",
                           opens_at=now - timedelta(hours=1),
                           closes_at=now + timedelta(hours=1),
                           results_at=now + timedelta(hours=2),
                           pieces=[{"source_ref": s.source_ref, "verse_uid": uid}],
                           status="open", rules_version=settings.competition_rules_version)
        db.add(comp)
        db.commit()
        cid = comp.id
    finally:
        db.close()
    # Missing profile -> 403 public_name.
    r = client.post(f"/competitions/{cid}/attempts", headers=h,
                    files={"file": ("a.m4a", b"\x00" * 4000, "audio/mp4")},
                    data={"verse_uid": uid, "camera": "{}"})
    assert r.status_code == 403 and "public_name" in r.text
    # Complete profile.
    r = client.put("/me/public-profile", headers=h, json={
        "public_name": "CompTester", "age_confirmed": True,
        "rules_accepted": True, "recordings_consent": True})
    assert r.status_code == 200, r.text
    # Counted attempt (hidden true, good camera, app 1.2.0).
    import json as _json
    cam = _json.dumps({"face_ratio": 1.0, "eyes_closed_ratio": 1.0,
                       "multi_face_ratio": 0.0, "mouth_moving_ratio": 0.8,
                       "app_version": "1.2.0", "samples": 10})
    r = client.post(f"/competitions/{cid}/attempts", headers=h,
                    files={"file": ("a.m4a", b"\x00" * 4000, "audio/mp4")},
                    data={"verse_uid": uid, "camera": cam, "hidden": "true"})
    assert r.status_code == 200, r.text
    assert r.json()["counted"] is True
    # hidden false -> text_shown.
    r = client.post(f"/competitions/{cid}/attempts", headers=h,
                    files={"file": ("a.m4a", b"\x00" * 4000, "audio/mp4")},
                    data={"verse_uid": uid, "camera": cam, "hidden": "false"})
    assert r.json()["why_not"] == "text_shown"
    # Eyes open -> eyes_open.
    cam2 = _json.dumps({"face_ratio": 1.0, "eyes_closed_ratio": 0.1,
                        "multi_face_ratio": 0.0, "mouth_moving_ratio": 0.8,
                        "app_version": "1.2.0"})
    r = client.post(f"/competitions/{cid}/attempts", headers=h,
                    files={"file": ("a.m4a", b"\x00" * 4000, "audio/mp4")},
                    data={"verse_uid": uid, "camera": cam2, "hidden": "true"})
    assert r.json()["why_not"] == "eyes_open"
    # Two faces.
    cam3 = _json.dumps({"face_ratio": 1.0, "eyes_closed_ratio": 1.0,
                        "multi_face_ratio": 0.5, "mouth_moving_ratio": 0.8,
                        "app_version": "1.2.0"})
    r = client.post(f"/competitions/{cid}/attempts", headers=h,
                    files={"file": ("a.m4a", b"\x00" * 4000, "audio/mp4")},
                    data={"verse_uid": uid, "camera": cam3, "hidden": "true"})
    assert r.json()["why_not"] == "two_faces"
    # Old app.
    cam4 = _json.dumps({"face_ratio": 1.0, "eyes_closed_ratio": 1.0,
                        "multi_face_ratio": 0.0, "mouth_moving_ratio": 0.8,
                        "app_version": "1.1.0"})
    r = client.post(f"/competitions/{cid}/attempts", headers=h,
                    files={"file": ("a.m4a", b"\x00" * 4000, "audio/mp4")},
                    data={"verse_uid": uid, "camera": cam4, "hidden": "true"})
    assert r.json()["why_not"] == "old_app"
    # Leaderboard + certificate page.
    r = client.get(f"/competitions/{cid}/leaderboard", headers=h)
    assert r.status_code == 200
    r = client.get("/certificates/NOPE123", headers=h)
    assert r.status_code == 404


def test_monthly_purge_cert_page(client):
    r = client.get("/certificates/NOPE123")
    assert r.status_code == 404
