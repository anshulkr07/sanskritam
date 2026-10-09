"""verse_uid migration + /shlokas chant attach (5.9)."""

from app.models import Shloka, VerseAudio
from app.services.chant_text import verse_uid


def test_insert_gets_uid_and_shlokas_attaches(client, auth_headers):
    from app.db import SessionLocal
    db = SessionLocal()
    try:
        from app.services.iast import to_iast
        row = Shloka(date="2026-01-01", source_ref="Test 1.1",
                     devanagari="धर्मक्षेत्रे कुरुक्षेत्रे।", iast=to_iast("धर्मक्षेत्रे कुरुक्षेत्रे।"),
                     metre="")
        db.add(row)
        db.commit()
        db.refresh(row)
        assert row.verse_uid == verse_uid("Test 1.1", "धर्मक्षेत्रे कुरुक्षेत्रे।")
        uid = row.verse_uid
        row_id = row.id
        db.add(VerseAudio(verse_uid=uid, voice="vagdhenu-steer-2026-06-17",
                          url="/audio/x.m4a", duration_ms=1000,
                          lines=[{"i": 0, "text": "x", "kind": "verse", "start_ms": 0, "end_ms": 1000}],
                          meter="", qc_status="auto_ok", qc_reasons=[]))
        db.add(VerseAudio(verse_uid="nope-nope-nope-no", voice="vagdhenu-steer-2026-06-17",
                          url="/audio/y.m4a", duration_ms=1000, lines=[],
                          meter="", qc_status="needs_listen", qc_reasons=[]))
        db.commit()
    finally:
        db.close()
    try:
        r = client.get("/shlokas", headers=auth_headers)
        assert r.status_code == 200, r.text
        rows = r.json()
        mine = [v for v in rows if v.get("verse_uid") == uid]
        assert mine and mine[0]["chant"] is not None
        assert mine[0]["chant"]["url"] == "/audio/x.m4a"
        # needs_listen row attaches nothing (served = auto_ok,approved only).
        r2 = client.get("/shlokas/today", headers=auth_headers)
        assert r2.status_code in (200, 404)
    finally:
        db = SessionLocal()
        try:
            db.query(VerseAudio).filter(VerseAudio.verse_uid.in_([uid, "nope-nope-nope-no"])).delete(synchronize_session=False)
            db.query(Shloka).filter(Shloka.id == row_id).delete(synchronize_session=False)
            db.commit()
        finally:
            db.close()
