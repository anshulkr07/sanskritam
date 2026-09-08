"""U4 curation (2026-09-08, owner-approved packet): 3 seed lessons, no new
taxonomy (DU/NOM.PL/GEN.PL all pre-existed), grid_fill+contrast steps.

Guards: lessons present with real ranks/features, examples engine-derived
with lipi IAST (incl. the neuter-dual CUT — engine masculines phala),
steps round-trip correct, grids highlight the taught number.
"""

from tests.conftest import _TMPDIR  # noqa: F401  (ensures env set before imports)


U4 = {
    "DU": ("Two is special: the dual", 0, 4, "बालकौ"),
    "NOM.PL": ("Many: the plural", 1, 3, "बालकाः"),
    "GEN.PL": ("Whose and where, for many", 2, 3, "बालकानाम्"),
}


def test_u4_lessons_present_with_verified_examples(client):
    from app.db import SessionLocal
    from app.models import Lesson

    db = SessionLocal()
    try:
        for fid, (title, rank, n_ex, first_dev) in U4.items():
            row = db.query(Lesson).filter(Lesson.unit_id == "u4",
                                          Lesson.feature_id == fid).first()
            assert row is not None, f"no u4 lesson for {fid}"
            assert row.title_en == title, row.title_en
            assert not row.title_en.startswith("[staged]")
            assert row.rank == rank, (fid, row.rank)
            assert len(row.examples or []) == n_ex, (fid, row.examples)
            assert row.examples[0]["devanagari"] == first_dev
            for ex in row.examples:
                assert ex.get("derivation"), (fid, ex.get("devanagari"))
                assert ex.get("iast"), (fid, ex.get("devanagari"))
    finally:
        db.close()


def test_u4_neuter_dual_derives_with_correct_code(client):
    """Vidyut liṅga codes are Pum/Stri/Napumsaka — 'Neut' silently
    defaulted to Pum (masculining phala→phalau). The seed uses Napumsaka,
    so फले survives verification; this pins that path end to end."""
    from app.db import SessionLocal
    from app.models import Lesson

    db = SessionLocal()
    try:
        row = db.query(Lesson).filter(Lesson.unit_id == "u4",
                                      Lesson.feature_id == "DU").first()
        devs = [ex["devanagari"] for ex in (row.examples or [])]
        assert "फले" in devs, devs
        assert "फलौ" not in devs, devs
    finally:
        db.close()


def test_u4_steps_round_trip(client):
    from app.db import SessionLocal
    from app.models import Lesson, LessonStep
    from app.services import exercise_gen

    db = SessionLocal()
    try:
        for fid in U4:
            lesson = db.query(Lesson).filter(
                Lesson.unit_id == "u4", Lesson.feature_id == fid).first()
            steps = sorted(db.query(LessonStep).filter(
                LessonStep.lesson_id == lesson.id).all(),
                key=lambda s: s.rank)
            assert [s.kind for s in steps] == ["explain", "grid_fill",
                                               "contrast"], fid
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


def test_u4_grids_highlight_the_taught_number(client):
    from app.db import SessionLocal
    from app.models import Lesson

    db = SessionLocal()
    try:
        expect = {"DU": "बालकौ", "NOM.PL": "बालकाः", "GEN.PL": "बालकानाम्"}
        for fid, hl in expect.items():
            row = db.query(Lesson).filter(
                Lesson.unit_id == "u4", Lesson.feature_id == fid).first()
            assert row.visual_type == "grid", fid
            assert row.visual_data.get("highlight") == hl, (fid, row.visual_data)
    finally:
        db.close()
