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


def test_import_preserves_translations_and_dry_run_writes_nothing(client):
    from app.db import SessionLocal
    from app.models import Shloka

    ref = "p21-translations-test"
    payload = _payload([{
        "ref": ref,
        "devanagari": "बालकः पठति।",
        "translation_hi": "बालक पढ़ता है।",
        "translation_en": "The boy reads.",
    }])
    run_import(payload, live=False)
    with SessionLocal() as db:
        assert db.query(Shloka).filter_by(source_ref=ref).count() == 0

    result = run_import(payload, live=True)
    assert result["added"] == 1
    with SessionLocal() as db:
        row = db.query(Shloka).filter_by(source_ref=ref).one()
        assert row.translation_hi == payload["verses"][0]["translation_hi"]
        assert row.translation_en == payload["verses"][0]["translation_en"]
    assert run_import(payload, live=True)["added"] == 0


def test_import_fills_only_missing_translations(client):
    from app.db import SessionLocal
    from app.models import Shloka

    ref = "p21-backfill-test"
    verse = {"ref": ref, "devanagari": "बालकः पठति।", "translation_en": "Keep this meaning."}
    run_import(_payload([verse]), live=True)
    incoming = dict(verse, translation_hi="बालक पढ़ता है।", translation_en="Do not replace.")
    run_import(_payload([incoming]), live=False)
    with SessionLocal() as db:
        assert db.query(Shloka).filter_by(source_ref=ref).one().translation_hi == ""
    run_import(_payload([incoming]), live=True)
    with SessionLocal() as db:
        row = db.query(Shloka).filter_by(source_ref=ref).one()
        assert row.translation_hi == incoming["translation_hi"]
        assert row.translation_en == "Keep this meaning."


def test_import_refuses_missing_licence():
    import pytest
    with pytest.raises(SystemExit):
        run_import({"verses": [{"ref": "x", "devanagari": "बालकः।"}]}, live=False)


# ── 2026-10-01: rows that carry a reference but not that verse's text ──
# The seed has fragments, other verses and invented lines under real Gītā
# numbers. These pin what the importer does when it meets one.

_HALF = "कर्मण्येवाधिकारस्ते।"
_WHOLE = "कर्मण्येवाधिकारस्ते मा फलेषु कदाचन। मा कर्मफलहेतुर्भूर्मा ते सङ्गोऽस्त्वकर्मणि॥"


def test_same_verse_ignores_punctuation_and_numbering():
    from scripts.import_text import same_verse

    assert same_verse(_WHOLE, "कर्मण्येवाधिकारस्ते मा फलेषु कदाचन ।\nमा कर्मफलहेतुर्भूर्मा ते सङ्गोऽस्त्वकर्मणि ॥ ४७ ॥")
    assert not same_verse(_HALF, _WHOLE), "a fragment is not the verse"
    assert not same_verse("बालकः पठति।", "रामः वनं गच्छति।")
    assert not same_verse("", _WHOLE)


def test_existing_row_with_other_text_gets_no_translation(client):
    from app.db import SessionLocal
    from app.models import Shloka

    ref = "p21-mismatch-test"
    run_import(_payload([{"ref": ref, "devanagari": "बालकः पठति।"}]), live=True)
    incoming = {"ref": ref, "devanagari": "रामः वनं गच्छति।", "translation_en": "Rama goes to the forest."}
    report = run_import(_payload([incoming]), live=True)
    assert report["mismatched"] == [ref] and report["fixed"] == [] and report["added"] == 0
    with SessionLocal() as db:
        row = db.query(Shloka).filter_by(source_ref=ref).one()
        assert row.devanagari == "बालकः पठति।"
        assert row.translation_en == "", "a translation must never sit beside other Sanskrit"


def test_fix_existing_replaces_the_text_in_place(client):
    from app.db import SessionLocal
    from app.models import Shloka

    ref = "p21-fix-test"
    run_import(_payload([{"ref": ref, "devanagari": "बालकः पठति।"}]), live=True)
    with SessionLocal() as db:
        before = db.query(Shloka).filter_by(source_ref=ref).one()
        row_id, row_date = before.id, before.date
    incoming = {"ref": ref, "devanagari": "रामः वनं गच्छति।",
                "translation_hi": "राम वन जाता है।", "translation_en": "Rama goes to the forest."}

    dry = run_import(_payload([incoming]), live=False, fix_existing=True)
    assert [f["ref"] for f in dry["fixed"]] == [ref]
    with SessionLocal() as db:
        assert db.query(Shloka).filter_by(source_ref=ref).one().devanagari == "बालकः पठति।"

    live = run_import(_payload([incoming]), live=True, fix_existing=True)
    assert [f["ref"] for f in live["fixed"]] == [ref] and live["added"] == 0
    with SessionLocal() as db:
        row = db.query(Shloka).filter_by(source_ref=ref).one()
        assert (row.id, row.date) == (row_id, row_date), "id and date carry the daily schedule and the seed key"
        assert row.devanagari == incoming["devanagari"]
        assert row.iast and row.translation_en == incoming["translation_en"]
        assert row.translation_hi == incoming["translation_hi"]

    again = run_import(_payload([incoming]), live=True, fix_existing=True)
    assert again["fixed"] == [] and again["mismatched"] == [] and again["added"] == 0


def test_min_words_zero_keeps_a_thin_verse(client):
    thin = {"ref": "p21-thin-test", "devanagari": "बालकः।"}
    skipped = run_import(_payload([thin]), live=False)
    assert skipped["added"] == 0 and skipped["skipped_thin"] == [thin["ref"]]
    kept = run_import(_payload([thin]), live=True, min_words=0)
    assert kept["added"] == 1 and kept["skipped_thin"] == []


def test_import_reports_references_the_text_does_not_have(client):
    run_import(_payload([{"ref": "p21-orphan 99", "devanagari": "बालकः पठति।"}]), live=True)
    report = run_import(_payload([{"ref": "p21-orphan 1", "devanagari": "रामः लिखति।"}]), live=False)
    assert report["orphans"] == ["p21-orphan 99"]
