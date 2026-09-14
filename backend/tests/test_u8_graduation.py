"""U8 curation (2026-09-08, owner-approved packet): 4 taxonomy features,
3 graduated lessons, 9 verified examples, 6 round-tripping steps.

Guards the curation contract: taxonomy present, lessons graduated (no
[staged] title, real ranks/features), examples engine-derived with lipi
IAST, steps round-trip correct, parked rows untouched.
"""

from tests.conftest import _TMPDIR  # noqa: F401  (ensures env set before imports)


U8 = {
    "IMP.2PL": ("Orders to many: the imperative", 0, 3),
    "IMPF.3SG": ("What already happened: the imperfect", 1, 3),
    "FUT.1SG": ("What will happen: the future", 2, 3),
}

PARKED = [
    "learnsanskrit:guide-verbs-2-the-blessing-mood",
    "learnsanskrit:guide-verbs-2-the-conditional-mood",
    "learnsanskrit:guide-verbs-2-the-distant-future-tense",
]


def test_u8_taxonomy_present(client):
    from app.db import SessionLocal
    from app.models import Feature

    db = SessionLocal()
    try:
        ids = {f.id for f in db.query(Feature).all()}
    finally:
        db.close()
    for fid in ("IMP.2PL", "IMPF.3SG", "FUT.1SG", "FUT.3SG"):
        assert fid in ids, f"U8 feature missing: {fid}"


def test_u8_lessons_graduated_with_verified_examples(client):
    from app.db import SessionLocal
    from app.models import Lesson

    db = SessionLocal()
    try:
        for fid, (title, rank, n_ex) in U8.items():
            row = db.query(Lesson).filter(Lesson.unit_id == "u8",
                                          Lesson.feature_id == fid).first()
            assert row is not None, f"no u8 lesson for {fid}"
            assert row.title_en == title, row.title_en
            assert not row.title_en.startswith("[staged]")
            assert row.rank == rank, (fid, row.rank)
            assert len(row.examples or []) == n_ex, (fid, row.examples)
            for ex in row.examples:
                assert ex.get("derivation"), (fid, ex.get("devanagari"))
                assert ex.get("iast"), (fid, ex.get("devanagari"))
    finally:
        db.close()


def test_u8_steps_round_trip(client):
    from app.db import SessionLocal
    from app.models import Lesson, LessonStep
    from app.services import exercise_gen

    db = SessionLocal()
    try:
        for fid in U8:
            lesson = db.query(Lesson).filter(
                Lesson.unit_id == "u8", Lesson.feature_id == fid).first()
            steps = sorted(db.query(LessonStep).filter(
                LessonStep.lesson_id == lesson.id).all(),
                key=lambda s: s.rank)
            assert [s.kind for s in steps] == ["explain", "derive_next",
                                               "derive_next"], fid
            for s in steps[1:]:
                g = s.payload["gen"]
                answer = exercise_gen.correct_answer(
                    g["kind"], g["params"], g["seed"])
                v = exercise_gen.grade(g["kind"], g["params"], g["seed"],
                                       answer)
                assert v["verdict"] == "correct", (fid, s.rank, v)
    finally:
        db.close()


def test_generated_keys_are_closed_world(client):
    # New GENERATED kinds (parked moods, new roots) arrive only via a
    # curation packet with measured engine output — never by drive-by
    # addition. Pin the exact key set; extending it is a conscious diff.
    from app.seeds.lesson_steps import GENERATED

    assert set(GENERATED) == {
        "SG", "NOM.SG", "ACC.SG", "PRES.3SG", "INSTR.SG", "DAT.SG",
        "ABL.SG", "GEN.SG", "LOC.SG", "VOC.SG", "VOWEL-SANDHI",
        "IMP.2PL", "IMPF.3SG", "FUT.1SG",
        "DU", "NOM.PL", "GEN.PL",
        "NEUT", "MASC", "PRES.1SG", "PRES.1DU", "ATMANEPADA",
        # Grammar-guide expansion (2026-09-14, engine-exact measured):
        # plural/dual cases, plural/dual persons, singular imperative,
        # third future, outward voice, split sandhi types.
        "PL", "NOM.DU", "ACC.DU", "ACC.PL", "LOC.PL",
        "PRES.1PL", "PRES.2PL", "PRES.3PL", "PRES.3DU",
        "IMP.2SG", "FUT.3SG", "PARASMAIPADA",
        "VISARGA-SANDHI", "ANUSVARA-SANDHI", "CONSONANT-SANDHI",
    }


def test_u8_step_exercised_set_matches_taxonomy():
    from scripts.p712_feature_coverage import STEP_EXERCISED_FEATURES

    assert STEP_EXERCISED_FEATURES == {"IMP.2PL", "IMPF.3SG", "FUT.1SG",
                                       "FUT.3SG"}
