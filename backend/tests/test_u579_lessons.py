"""U5/U7/U9 curation (2026-09-08, complete-all mandate): 2 + 2 + 1 lessons.

U7: neuter works (Napumsaka), feminine truly broken — no feminine surface
forms anywhere (examples, bodies, grids). U5: 18/18 9-cell exact. U9:
dhāv ātmanepada + paṭh parasmaipada (ATMANEPADA's first coverage).
"""

from tests.conftest import _TMPDIR  # noqa: F401  (ensures env set before imports)


# feature_id -> (title_en, rank, n_examples, [(kind, rank)...] )
EXPECTED = {
    "NEUT": ("It changes everything: neuter", 0, 3),
    "MASC": ("Masculine, and how you know", 1, 3),
    "PRES.1SG": ("Who speaks: I and you", 0, 3),
    "PRES.1DU": ("We-two and you-two", 1, 3),
    "ATMANEPADA": ("For others, for self: the two voices", 0, 3),
}

UNIT_OF = {
    "NEUT": "u7", "MASC": "u7",
    "PRES.1SG": "u5", "PRES.1DU": "u5",
    "ATMANEPADA": "u9",
}


def test_new_lessons_present_with_verified_examples(client):
    from app.db import SessionLocal
    from app.models import Lesson

    db = SessionLocal()
    try:
        for fid, (title, rank, n_ex) in EXPECTED.items():
            row = db.query(Lesson).filter(
                Lesson.unit_id == UNIT_OF[fid],
                Lesson.feature_id == fid).first()
            assert row is not None, f"no lesson for {fid}"
            assert row.title_en == title, row.title_en
            assert not row.title_en.startswith("[staged]")
            assert row.rank == rank, (fid, row.rank)
            assert len(row.examples or []) == n_ex, (fid, row.examples)
            for ex in row.examples:
                assert ex.get("derivation"), (fid, ex.get("devanagari"))
                assert ex.get("iast"), (fid, ex.get("devanagari"))
    finally:
        db.close()


def test_new_lesson_steps_round_trip(client):
    from app.db import SessionLocal
    from app.models import Lesson, LessonStep
    from app.services import exercise_gen

    db = SessionLocal()
    try:
        for fid in EXPECTED:
            lesson = db.query(Lesson).filter(
                Lesson.unit_id == UNIT_OF[fid],
                Lesson.feature_id == fid).first()
            steps = sorted(db.query(LessonStep).filter(
                LessonStep.lesson_id == lesson.id).all(),
                key=lambda s: s.rank)
            assert steps[0].kind == "explain", fid
            assert len(steps) == 3, (fid, len(steps))
            for s in steps[1:]:
                g = s.payload["gen"]
                answer = exercise_gen.correct_answer(
                    g["kind"], g["params"], g["seed"])
                if isinstance(answer, list):
                    answer = {"cells": answer}
                v = exercise_gen.grade(g["kind"], g["params"], g["seed"],
                                       answer)
                assert v["verdict"] == "correct", (fid, s.rank, v)
    finally:
        db.close()


def test_no_feminine_surface_forms_in_u7(client):
    """The engine masculines feminine ā-stems (kanyā→kanyāḥ), so U7 shows
    no derivable feminine surface forms — not in examples, not in grids.
    The FEM concept lesson (rank 2, explain-only) names the gap in IAST
    without claiming engine-wrong Devanagari forms. If the engine is
    ever fixed, this test names exactly where feminine drills go."""
    from app.db import SessionLocal
    from app.models import Lesson

    db = SessionLocal()
    try:
        rows = db.query(Lesson).filter(Lesson.unit_id == "u7").all()
        assert len(rows) == 3
        blob = " ".join(str(r.examples or "") + str(r.visual_data or "")
                        for r in rows)
    finally:
        db.close()
    for form in ("कन्या", "कन्याः", "माला", "मालाः", "नदी", "नदीः",
                 "कन्यया", "कन्यायै", "कन्यायाः", "कन्याम्"):
        assert form not in blob, form


def test_fem_still_unclaimed_everywhere_else(client):
    """FEM has exactly one concept-only lesson (explain-only, no graded steps,
    no derivable examples) until the engine derives feminine forms. No step
    band or challenge may claim it."""
    from app.db import SessionLocal
    from app.models import Lesson, LessonStep

    db = SessionLocal()
    try:
        rows = db.query(Lesson).all()
        claimed = [r for r in rows if "FEM" in (r.features or [])]
        assert len(claimed) == 1, [r.feature_id for r in claimed]
        fem = claimed[0]
        assert fem.feature_id == "FEM" and fem.unit_id == "u7"
        assert (fem.examples or []) == []
        steps = db.query(LessonStep).filter(
            LessonStep.lesson_id == fem.id).all()
        assert len(steps) == 1 and steps[0].kind == "explain"
    finally:
        db.close()
