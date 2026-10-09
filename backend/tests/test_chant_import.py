"""chant_import dry-run/live/idempotent (5.9)."""

import json


def test_chant_import_dry_live_idempotent(tmp_path, monkeypatch):
    from app.db import SessionLocal
    from app.models import Shloka, VerseAudio
    from app.services.chant_text import verse_uid
    from app.services.storage import LocalStorage, set_storage

    db = SessionLocal()
    try:
        from app.services.iast import to_iast
        row = Shloka(date="2026-02-02", source_ref="Imp 1.1",
                     devanagari="कर्म योग।", iast=to_iast("कर्म योग।"), metre="")
        db.add(row)
        db.commit()
        db.refresh(row)
        uid = row.verse_uid or verse_uid("Imp 1.1", "कर्म योग।")
        row_id = row.id
    finally:
        db.close()

    audio_dir = tmp_path / "audio"
    audio_dir.mkdir()
    (audio_dir / "f.m4a").write_bytes(b"FAKEAUDIO")
    mani = tmp_path / "manifest.jsonl"
    mani.write_text(json.dumps({"verse_uid": uid, "source_ref": "Imp 1.1",
                                "voice": "vagdhenu-steer-2026-06-17", "meter": "",
                                "file": "f.m4a", "duration_ms": 1200,
                                "lines": [], "qc_status": "auto_ok",
                                "qc_reasons": [], "vedic": False,
                                "source_commit": ""}) + "\n"
                    + json.dumps({"verse_uid": "unknown-uid-1234", "source_ref": "X",
                                  "voice": "vagdhenu-steer-2026-06-17", "meter": "",
                                  "file": "f.m4a", "duration_ms": 1, "lines": [],
                                  "qc_status": "auto_ok", "qc_reasons": [],
                                  "vedic": False, "source_commit": ""}) + "\n",
                   encoding="utf-8")

    import runpy
    import sys
    # Dry run touches nothing.
    sys.argv = ["chant_import", "--manifest", str(mani), "--audio", str(audio_dir)]
    runpy.run_module("scripts.chant_import", run_name="__main__")
    db = SessionLocal()
    try:
        assert db.query(VerseAudio).filter(VerseAudio.verse_uid == uid).first() is None
    finally:
        db.close()

    # Live with fake storage rooted at tmp.
    store = LocalStorage(base_dir=str(tmp_path / "store"))
    set_storage(store)
    try:
        sys.argv = ["chant_import", "--manifest", str(mani), "--audio", str(audio_dir), "--live"]
        runpy.run_module("scripts.chant_import", run_name="__main__")
        db = SessionLocal()
        try:
            r1 = db.query(VerseAudio).filter(VerseAudio.verse_uid == uid).first()
            assert r1 is not None and r1.qc_status == "auto_ok"
            assert db.query(VerseAudio).filter(VerseAudio.verse_uid == "unknown-uid-1234").first() is None
        finally:
            db.close()
        # Re-run is idempotent (no duplicate rows).
        sys.argv = ["chant_import", "--manifest", str(mani), "--audio", str(audio_dir), "--live"]
        runpy.run_module("scripts.chant_import", run_name="__main__")
        db = SessionLocal()
        try:
            assert db.query(VerseAudio).filter(VerseAudio.verse_uid == uid).count() == 1
        finally:
            db.close()
    finally:
        from app.services.storage import get_storage as _gs, LocalStorage as _LS
        set_storage(_LS())
        db = SessionLocal()
        try:
            db.query(VerseAudio).filter(VerseAudio.verse_uid == uid).delete(synchronize_session=False)
            db.query(Shloka).filter(Shloka.id == row_id).delete(synchronize_session=False)
            db.commit()
        finally:
            db.close()
