"""P21-3 — the second-text importer (scripts/import_text.py).

The catalogue is not the product; the mechanism is. These tests pin the
mechanism: idempotency by source_ref, no TTS in the import path (§6), the
licence gate, and the engine-verification floor. They run against the test
DB (fresh) with a synthetic payload — no network, no real corpus needed.
"""

import json

from scripts.import_text import MIN_BREAKDOWN_WORDS, build_row, run_import


def _payload(verses, licence="test licence — synthetic payload, no source"):
    return {"licence": licence, "source": "test", "verses": verses}


def test_build_row_verifies_through_engine():
    row = build_row("बालकः पठति।", "test-1")
    assert row is not None
    assert row["iast"], "IAST must be lipi-derived (P7-13)"
    assert len(row["word_breakdown"]) >= MIN_BREAKDOWN_WORDS
    # metre key exists; anuṣṭubh-style variable lines stay absent (§6)
    assert "metre" in row


def test_build_row_skips_untappable_verse():
    assert build_row("।", "test-empty") is None
    assert build_row("", "test-blank") is None


def test_import_is_idempotent_and_tts_free(client):
    from app.db import SessionLocal
    from app.models import Shloka

    payload = _payload([
        {"ref": "p21-test-1", "devanagari": "बालकः पठति।"},
        {"ref": "p21-test-2", "devanagari": "रामः लिखति।"},
    ])
    first = run_import(payload, live=True)
    assert first["added"] == 2, first
    second = run_import(payload, live=True)
    assert second["added"] == 0 and second["skipped_dup"] == 2, second

    db = SessionLocal()
    try:
        rows = db.query(Shloka).filter(Shloka.source_ref.like("p21-test-%")).all()
        assert len(rows) == 2
        # §6: never TTS a corpus import — audio goes only on studied content
        assert all(r.audio_url == "" for r in rows)
    finally:
        db.close()


def test_import_refuses_missing_licence():
    import pytest
    with pytest.raises(SystemExit):
        run_import({"verses": [{"ref": "x", "devanagari": "बालकः।"}]}, live=False)
