"""chant_import dry-run/live/idempotent (5.9)."""

import json


def test_chant_import_dry_live_idempotent(client, tmp_path, monkeypatch):
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
            # The phone fetches this; a file path here (what store() returns
            # locally) would never load.
            assert r1.url == "/audio/chant/vagdhenu-steer-2026-06-17/f.m4a"
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


def test_upload_only_stores_the_audio_and_writes_no_rows(client, tmp_path):
    import runpy
    import sys

    from app.db import SessionLocal
    from app.models import Shloka, VerseAudio
    from app.services.chant_text import verse_uid
    from app.services.storage import LocalStorage, set_storage

    with SessionLocal() as db:
        row = Shloka(date="2026-02-03", source_ref="Up 1.1", devanagari="योग कर्म।", iast="x", metre="")
        db.add(row)
        db.commit()
        row_id = row.id
    uid = verse_uid("Up 1.1", "योग कर्म।")
    audio_dir = tmp_path / "audio"
    audio_dir.mkdir()
    (audio_dir / "u.m4a").write_bytes(b"FAKEAUDIO")
    mani = tmp_path / "manifest.jsonl"
    mani.write_text(json.dumps({"verse_uid": uid, "source_ref": "Up 1.1", "voice": "vagdhenu-steer-2026-06-17",
                                "file": "u.m4a", "duration_ms": 900, "lines": [], "qc_status": "needs_listen",
                                "qc_reasons": ["pause"]}) + "\n", encoding="utf-8")
    store = LocalStorage(base_dir=str(tmp_path / "store"))
    set_storage(store)
    try:
        sys.argv = ["chant_import", "--manifest", str(mani), "--audio", str(audio_dir), "--live", "--upload-only"]
        runpy.run_module("scripts.chant_import", run_name="__main__")
        assert store.exists("chant/vagdhenu-steer-2026-06-17/u.m4a")
        with SessionLocal() as db:
            assert db.query(VerseAudio).filter(VerseAudio.verse_uid == uid).count() == 0
        # The real import afterwards finds the file there and records the row.
        sys.argv = ["chant_import", "--manifest", str(mani), "--audio", str(audio_dir), "--live"]
        runpy.run_module("scripts.chant_import", run_name="__main__")
        with SessionLocal() as db:
            r = db.query(VerseAudio).filter(VerseAudio.verse_uid == uid).one()
            assert r.url == "/audio/chant/vagdhenu-steer-2026-06-17/u.m4a"
    finally:
        from app.services.storage import LocalStorage as _LS
        set_storage(_LS())
        with SessionLocal() as db:
            db.query(VerseAudio).filter(VerseAudio.verse_uid == uid).delete(synchronize_session=False)
            db.query(Shloka).filter(Shloka.id == row_id).delete(synchronize_session=False)
            db.commit()


def test_a_relabelled_verse_is_matched_by_its_sung_text(client, tmp_path):
    import runpy
    import sys

    from app.db import SessionLocal
    from app.models import Shloka, VerseAudio
    from app.services.chant_text import verse_uid
    from app.services.storage import LocalStorage, set_storage

    text = "योगश्चित्तवृत्तिनिरोधः ॥ १ ॥"
    twin = "तदा द्रष्टुः स्वरूपेऽवस्थानम् ॥ २ ॥"
    with SessionLocal() as db:
        rows = [Shloka(date="2026-02-04", source_ref="Rel 1.15", devanagari=text, iast="x", metre=""),
                Shloka(date="2026-02-05", source_ref="Rel 9.1", devanagari=twin, iast="x", metre=""),
                Shloka(date="2026-02-06", source_ref="Rel 9.2", devanagari=twin, iast="x", metre="")]
        db.add_all(rows)
        db.commit()
        ids = [r.id for r in rows]
    new_uid = verse_uid("Rel 1.15", text)
    old_uid = verse_uid("Rel 1.14", text)               # what the export saw before the rename
    twin_old = verse_uid("Rel 9.0", twin)
    audio_dir = tmp_path / "audio"
    audio_dir.mkdir()
    for n in ("a.m4a", "t.m4a"):
        (audio_dir / n).write_bytes(b"FAKE")
    mani = tmp_path / "manifest.jsonl"
    mani.write_text(
        json.dumps({"verse_uid": old_uid, "source_ref": "Rel 1.14", "voice": "v", "file": "a.m4a", "duration_ms": 900,
                    "lines": [{"i": 0, "text": text, "kind": "verse", "start_ms": 100, "end_ms": 800}],
                    "qc_status": "auto_ok", "qc_reasons": []}) + "\n"
        + json.dumps({"verse_uid": twin_old, "source_ref": "Rel 9.0", "voice": "v", "file": "t.m4a", "duration_ms": 900,
                      "lines": [{"i": 0, "text": twin, "kind": "verse", "start_ms": 100, "end_ms": 800}],
                      "qc_status": "auto_ok", "qc_reasons": []}) + "\n", encoding="utf-8")
    store = LocalStorage(base_dir=str(tmp_path / "store"))
    set_storage(store)
    try:
        # Without the flag nothing matches: the renamed verse has a new uid.
        sys.argv = ["chant_import", "--manifest", str(mani), "--audio", str(audio_dir), "--live"]
        runpy.run_module("scripts.chant_import", run_name="__main__")
        with SessionLocal() as db:
            assert db.query(VerseAudio).filter(VerseAudio.verse_uid.in_([new_uid, old_uid])).count() == 0
        # With it, the one verse that has this sung text gets the audio. The twin text
        # is on two verses: ambiguous, so it is left alone.
        sys.argv = ["chant_import", "--manifest", str(mani), "--audio", str(audio_dir), "--live", "--match-relabelled"]
        runpy.run_module("scripts.chant_import", run_name="__main__")
        with SessionLocal() as db:
            r = db.query(VerseAudio).filter(VerseAudio.verse_uid == new_uid).one()
            assert r.qc_status == "auto_ok" and r.lines[0]["start_ms"] == 100
            assert db.query(VerseAudio).filter(VerseAudio.verse_uid.in_([old_uid, twin_old])).count() == 0
            assert db.query(VerseAudio).filter(VerseAudio.voice == "v").count() == 1
    finally:
        from app.services.storage import LocalStorage as _LS
        set_storage(_LS())
        with SessionLocal() as db:
            db.query(VerseAudio).filter(VerseAudio.voice == "v").delete(synchronize_session=False)
            db.query(Shloka).filter(Shloka.id.in_(ids)).delete(synchronize_session=False)
            db.commit()
