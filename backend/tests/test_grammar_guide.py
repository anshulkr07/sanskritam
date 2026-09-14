"""Grammar-guide expansion (2026-09-14): full-taxonomy lessons + /grammar/guide.

No network: engine verification at seed time, guide is static data.
"""

from tests.conftest import _TMPDIR  # noqa: F401  (ensures env set before imports)


def _auth_h(client, name="guideuser"):
    r = client.post("/auth/dev-login",
                    json={"display_name": name, "bridge_langs": ["en", "hi"]})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


NEW_GRADABLE = ["PL", "NOM.DU", "ACC.DU", "ACC.PL", "LOC.PL", "PRES.1PL",
                "PRES.2PL", "PRES.3PL", "PRES.3DU", "IMP.2SG", "FUT.3SG",
                "PARASMAIPADA", "VISARGA-SANDHI", "ANUSVARA-SANDHI",
                "CONSONANT-SANDHI"]

CONCEPT_ONLY = ["FEM", "INDECL", "SAMASA-DVANDVA", "SAMASA-TATPURUSA",
                "SAMASA-BAHUVRIHI", "SAMASA-AVYAYIBHAVA", "KARAKA-KARTR",
                "KARAKA-KARMA", "KARAKA-KARANA", "KARAKA-SAMPRADANA",
                "KARAKA-APADANA", "KARAKA-ADHIKARANA"]


def test_new_lessons_present(client):
    from app.db import SessionLocal
    from app.models import Lesson

    db = SessionLocal()
    try:
        for fid in NEW_GRADABLE + CONCEPT_ONLY:
            row = db.query(Lesson).filter(Lesson.feature_id == fid).first()
            assert row is not None, f"no lesson for {fid}"
            assert not (row.title_en or "").startswith("[staged]"), fid
            assert (row.body or "").strip(), fid
    finally:
        db.close()


def test_new_gradable_steps_round_trip(client):
    from app.db import SessionLocal
    from app.models import Lesson, LessonStep
    from app.services import exercise_gen

    db = SessionLocal()
    try:
        for fid in NEW_GRADABLE:
            lesson = db.query(Lesson).filter(
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


def test_concept_only_lessons_explain_only(client):
    from app.db import SessionLocal
    from app.models import Lesson, LessonStep

    db = SessionLocal()
    try:
        for fid in CONCEPT_ONLY:
            lesson = db.query(Lesson).filter(
                Lesson.feature_id == fid).first()
            steps = db.query(LessonStep).filter(
                LessonStep.lesson_id == lesson.id).all()
            assert len(steps) == 1 and steps[0].kind == "explain", fid
    finally:
        db.close()


def test_new_examples_engine_derived(client):
    h = _auth_h(client)
    for fid in NEW_GRADABLE:
        d = client.get(f"/lessons/{fid}", headers=h).json()
        assert d["examples"], fid
        for ex in d["examples"]:
            der = ex.get("derivation")
            if der is None:
                continue
            if "result" in der:
                assert der["result"] == ex["devanagari"], (fid, ex)
            else:
                assert der.get("splits"), (fid, ex)


def test_guide_shape(client):
    h = _auth_h(client)
    d = client.get("/grammar/guide", headers=h).json()
    assert d["version"]
    assert len(d["sections"]) == 8
    ids = [s["id"] for s in d["sections"]]
    assert ids == ["tags", "cases", "numbers", "verbs", "gender-voice",
                   "sandhi", "samasa", "karaka"]
    for s in d["sections"]:
        assert s["title_en"] and s["body_beginner"], s["id"]
        assert s["feature_ids"], s["id"]
        assert s["examples"], s["id"]


def test_path_has_lesson_flipped_for_new_features(client):
    h = _auth_h(client)
    d = client.get("/grammar/path", headers=h).json()
    by_id = {n["id"]: n for n in d["nodes"]}
    for fid in NEW_GRADABLE + CONCEPT_ONLY:
        assert by_id[fid]["has_lesson"] is True, fid
    # Side-features stay lesson-less by design (taught inside a sibling).
    assert by_id["PRES.2SG"]["has_lesson"] is False
