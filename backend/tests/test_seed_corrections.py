"""Seed corrections reach a database that was seeded before them (2026-10-02).

The seed file's verses were checked at the texts and corrected: wrong
references, invented lines, wrong glosses. The seeder skips a day that already
has a row, so ``_correct_seed_rows`` repairs existing rows in place, keyed on
the date plus the exact Devanagari. These pin what it does, and that the
seeder no longer adds a second row to a day whose reference changed.

Every test puts the day back as the seed has it: the suite shares one
database.
"""

import uuid
from datetime import timedelta

from app.db import SessionLocal
from app.models import AskAnswer, ReaderPassage, Shloka
from app.seeds.seed import _correct_seed_rows, _normalise_ref, _seed_shlokas
from app.seeds.shlokas import SEED_SLOKAS, SHLOKA_ANCHOR
from app.services.iast import to_iast
from app.services.verse_study import MEANING_Q, answer_key


def _seed(day_offset):
    return next(s for s in SEED_SLOKAS if s["day_offset"] == day_offset)


def _date(day_offset):
    return (SHLOKA_ANCHOR + timedelta(days=day_offset)).isoformat()


def _rows(db, day_offset):
    return db.query(Shloka).filter(Shloka.date == _date(day_offset)).all()


def _first_was(same_verse):
    """A seed entry whose day used to carry other text (or the same verse misspelt)."""
    for s in SEED_SLOKAS:
        for old, same in s["was"]:
            if same is same_verse:
                return s, old
    raise AssertionError(f"no seed entry with was=(…, {same_verse})")


def test_seed_file_invariants():
    offsets = [s["day_offset"] for s in SEED_SLOKAS]
    assert len(set(offsets)) == len(offsets), "one verse per date"
    texts = {s["devanagari"] for s in SEED_SLOKAS}
    for s in SEED_SLOKAS:
        assert s["word_breakdown"], s["source_ref"]
        for old, same in s["was"]:
            assert old != s["devanagari"] and old not in texts and isinstance(same, bool)
        for w in s["word_breakdown"]:
            assert w["word"] != "भूत", f"day {s['day_offset']}: भूत is not a word of this verse"


def test_a_trailing_verse_number_is_a_number():
    assert _normalise_ref("Nītiśataka 13") == "Nītiśataka 13"
    assert _normalise_ref("Hitopadeśa, Prastāvikā 6") == "Hitopadeśa, Prastāvikā 6"
    assert _normalise_ref("Manusmṛti 8.15") == "Manusmṛti 8.15"
    assert _normalise_ref("Subhāṣita") == "Sūkti: Subhāṣita"
    assert _normalise_ref("Sūkti: Hitopadeśa") == "Sūkti: Hitopadeśa"


def test_corrected_reference_renames_the_row_and_adds_none(client):
    """Day 11 was labelled Gītā 6.5; its text is 6.6."""
    seed = _seed(11)
    assert seed["source_ref"] == "Bhagavad Gītā 6.6"
    with SessionLocal() as db:
        row = _rows(db, 11)[0]
        row_id, total = row.id, db.query(Shloka).count()
        row.source_ref = "Bhagavad Gītā 6.5"          # as an older database holds it
        row.translation_en = "A meaning written for this text."
        db.commit()

        _seed_shlokas(db)
        db.commit()
        assert db.query(Shloka).count() == total, "the seeder must not add a second row to the day"

        _correct_seed_rows(db)
        db.commit()
        rows = _rows(db, 11)
        assert [r.id for r in rows] == [row_id], "renamed in place"
        assert rows[0].source_ref == "Bhagavad Gītā 6.6"
        assert rows[0].translation_en == "A meaning written for this text.", \
            "the text did not change, so its meaning stays"
        rows[0].translation_en = ""
        db.commit()


def test_replaced_text_takes_the_new_verse_and_loses_the_old_meaning(client):
    seed, old = _first_was(False)
    day = seed["day_offset"]
    with SessionLocal() as db:
        row = _rows(db, day)[0]
        row_id, total = row.id, db.query(Shloka).count()
        row.devanagari = old
        row.iast = to_iast(old)
        row.source_ref = "Sūkti: an old label"
        row.translation_en = "Meaning of the old line."
        row.translation_hi = "पुरानी पंक्ति का अर्थ।"
        for slot in ("en", "hi"):
            db.merge(AskAnswer(key=answer_key(old, MEANING_Q, slot), subject=old,
                               question=MEANING_Q, language=slot, payload={"explanation": "x"}))
        db.add(ReaderPassage(id=uuid.uuid4().hex[:16], tier=2, sort_order=99, devanagari=old,
                             iast=to_iast(old), provenance="public-domain"))
        db.commit()

        _seed_shlokas(db)
        _correct_seed_rows(db)
        db.commit()

        assert db.query(Shloka).count() == total
        rows = _rows(db, day)
        assert [r.id for r in rows] == [row_id], "replaced in place: id and date carry the schedule"
        row = rows[0]
        assert row.devanagari == seed["devanagari"]
        assert row.iast == to_iast(seed["devanagari"])
        assert row.source_ref == _normalise_ref(seed["source_ref"])
        assert row.word_breakdown == seed["word_breakdown"]
        assert row.translation_en == "" and row.translation_hi == "", \
            "a meaning must not outlive the Sanskrit it was written for"
        assert db.query(AskAnswer).filter(AskAnswer.subject == old).count() == 0
        assert db.query(ReaderPassage).filter(ReaderPassage.devanagari == old).count() == 0


def test_respelt_verse_keeps_its_meaning(client):
    seed, old = _first_was(True)
    day = seed["day_offset"]
    with SessionLocal() as db:
        row = _rows(db, day)[0]
        row.devanagari = old
        row.iast = to_iast(old)
        row.translation_en = "Still the meaning of this verse."
        db.commit()

        _correct_seed_rows(db)
        db.commit()
        row = _rows(db, day)[0]
        assert row.devanagari == seed["devanagari"]
        assert row.translation_en == "Still the meaning of this verse."
        row.translation_en = ""
        db.commit()


def test_wrong_gloss_is_repaired_on_an_existing_row(client):
    """Day 17 glossed a word that is not in the verse (भूत) as a vocative."""
    seed = _seed(17)
    with SessionLocal() as db:
        row = _rows(db, 17)[0]
        row.word_breakdown = [{"word": "भूत", "meaning": "O son of Kunti", "features": ["VOC.SG"]}]
        row.features = ["VOC.SG"]
        db.commit()

        _correct_seed_rows(db)
        db.commit()
        row = _rows(db, 17)[0]
        assert row.word_breakdown == seed["word_breakdown"]
        assert row.features == seed["features"]
        assert "कौन्तेय" in [w["word"] for w in row.word_breakdown]


def test_a_row_holding_other_text_is_left_alone(client):
    """``import_text --fix-existing`` may have put another verse on a seeded day."""
    other = "धर्मक्षेत्रे कुरुक्षेत्रे समवेता युयुत्सवः।"
    with SessionLocal() as db:
        row = _rows(db, 29)[0]
        saved = (row.devanagari, row.iast, row.source_ref)
        total = db.query(Shloka).count()
        row.devanagari, row.iast, row.source_ref = other, to_iast(other), "Bhagavad Gītā 1.1"
        row.translation_en = "A sourced translation."
        db.commit()

        _seed_shlokas(db)
        _correct_seed_rows(db)
        db.commit()
        assert db.query(Shloka).count() == total, "no second row for the day"
        row = _rows(db, 29)[0]
        assert (row.devanagari, row.source_ref) == (other, "Bhagavad Gītā 1.1")
        assert row.translation_en == "A sourced translation."

        row.devanagari, row.iast, row.source_ref = saved
        row.translation_en = ""
        db.commit()


def test_an_imported_verse_under_the_same_reference_is_not_touched(client):
    """Production may hold the whole Gītā: 18.66 exists there as its own row."""
    seed = _seed(29)
    assert seed["source_ref"] == "Bhagavad Gītā 18.66"
    whole = ("सर्वधर्मान्परित्यज्य मामेकं शरणं व्रज। "
             "अहं त्वा सर्वपापेभ्यो मोक्षयिष्यामि मा शुचः॥")
    with SessionLocal() as db:
        twin = Shloka(id=uuid.uuid4().hex[:16], date="2031-01-01",
                      source_ref="Bhagavad Gītā 18.66", devanagari=whole, iast=to_iast(whole),
                      translation_en="The payload's translation.")
        db.add(twin)
        row = _rows(db, 29)[0]
        row.source_ref = "Bhagavad Gītā 12.4"
        db.commit()
        twin_id, row_id = twin.id, row.id

        _correct_seed_rows(db)
        db.commit()
        both = db.query(Shloka).filter(Shloka.source_ref == "Bhagavad Gītā 18.66").all()
        assert {r.id for r in both} == {twin_id, row_id}
        kept = db.get(Shloka, twin_id)
        assert kept.devanagari == whole and kept.translation_en == "The payload's translation."

        db.delete(kept)
        db.commit()


def test_a_copy_on_the_same_date_is_removed(client):
    seed = _seed(11)
    with SessionLocal() as db:
        row = _rows(db, 11)[0]
        row.translation_hi = "इस श्लोक का अर्थ।"
        copy = Shloka(id="0000-copy", date=_date(11), source_ref="Bhagavad Gītā 6.5",
                      devanagari=seed["devanagari"], iast=to_iast(seed["devanagari"]))
        db.add(copy)
        db.commit()
        row_id = row.id

        _correct_seed_rows(db)
        db.commit()
        rows = _rows(db, 11)
        assert [r.id for r in rows] == [row_id], "the row with a stored meaning is the one kept"
        rows[0].translation_hi = ""
        db.commit()


def test_corrections_are_idempotent(client):
    def snapshot(db):
        return [(r.id, r.date, r.source_ref, r.devanagari, r.word_breakdown, r.translation_en)
                for r in db.query(Shloka).order_by(Shloka.id)]

    with SessionLocal() as db:
        _correct_seed_rows(db)
        db.commit()
        before = snapshot(db)
        _correct_seed_rows(db)
        db.commit()
        assert snapshot(db) == before, "a second pass changes nothing"
        # And the table is the seed: every seeded day holds the seed's verse.
        for s in SEED_SLOKAS:
            row = _rows(db, s["day_offset"])
            assert len(row) == 1 and row[0].devanagari == s["devanagari"]
            assert row[0].source_ref == _normalise_ref(s["source_ref"])
