"""DCS vocab curation record: mapping discipline, idempotency, served shape.

Seeds (`app.seeds.vocab.DCS_VOCAB`) are the source of truth; this module
audits the mapping against staged rows. No network, no checkouts.
"""

from tests.conftest import _TMPDIR  # noqa: F401  (ensures env set before imports)

from scripts.import_vocab_dcs import (
    GLOSS_FIXES,
    TOPIC_MAP,
    plan_audit,
)


def _staged():
    return [
        {"devanagari": "जलं", "gloss": "water"},
        {"devanagari": "राजा", "gloss": "king"},
        {"devanagari": "उवाच", "gloss": "said"},
        {"devanagari": "देवा", "gloss": "demigods"},
        {"devanagari": "पञ्च", "gloss": "five"},
        {"devanagari": "", "gloss": ""},
    ]


def test_audit_imports_only_mapped_with_fixes():
    audit = plan_audit(_staged())
    got = {(i["topic"], i["devanagari"], i["gloss"]) for i in audit["imports"]}
    assert ("food", "जलं", "water") in got
    assert ("festivals", "देवा", "gods") in got  # GLOSS_FIXES applied
    assert len(audit["imports"]) == 2
    reasons = {s["devanagari"]: s["reason"] for s in audit["skips"]}
    assert "verb" in reasons["उवाच"] and "role" in reasons["राजा"]
    assert "numeral" in reasons["पञ्च"]


def test_seeds_and_script_map_agree():
    """TOPIC_MAP (auditor) and DCS_VOCAB (shipper) must describe the same
    rows — two lists of the same decisions would drift."""
    from app.seeds.vocab import DCS_VOCAB

    seed_map = {d: t for t, d, _ in DCS_VOCAB}
    assert seed_map == TOPIC_MAP
    assert len(DCS_VOCAB) == 27
    for _, _, gloss in DCS_VOCAB:
        assert gloss and gloss.strip()


def test_run_import_idempotent_and_ranked_after_curated(client):
    from app.db import SessionLocal
    from app.models import VocabWord
    from scripts.import_vocab_dcs import run_import

    db = SessionLocal()
    try:
        before = db.query(VocabWord).filter(VocabWord.topic == "food").all()
        curated_max = max(w.rank for w in before
                          if w.provenance == "original")
        r1 = run_import(db, live=True)
        assert r1["added"] >= 0
        row = db.query(VocabWord).filter(
            VocabWord.topic == "food", VocabWord.devanagari == "जलं").first()
        assert row is not None
        assert row.rank > curated_max, "imports sort after curated rows"
        assert row.provenance == "dcs"
        r2 = run_import(db, live=True)
        assert r2["added"] == 0
    finally:
        db.close()


def test_topic_map_covers_only_valid_slugs():
    from app.seeds.briefs import SITUATIONS

    slugs = {s["slug"] for s in SITUATIONS}
    assert set(TOPIC_MAP.values()) <= slugs
    assert len(TOPIC_MAP) == 27


def test_dcs_rows_seeded_with_lipi_iast(client):
    """Fresh DBs get the DCS rows from seeds (not from anyone's dev DB)."""
    from app.db import SessionLocal
    from app.models import VocabWord
    from app.services import iast as _iast

    db = SessionLocal()
    try:
        rows = db.query(VocabWord).filter(
            VocabWord.provenance == "dcs").all()
        assert len(rows) == 27, len(rows)
        for w in rows:
            assert w.iast == _iast.to_iast(w.devanagari), w.devanagari
            assert w.gloss and w.topic
    finally:
        db.close()
