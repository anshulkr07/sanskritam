"""Practice step kinds: build / articulate / read are never assessment.

The client renders the sandbox component (WordBank / VocalTract / passage)
and the attempt is a no-op — correct, graded False, mastery and review
schedule untouched. Same contract as explain steps; §2.2 (no invented
grading — no forced alignment, no comprehension grader, reorder already
covers graded assembly).
"""

from tests.conftest import _TMPDIR  # noqa: F401  (ensures env set before imports)


def _make_practice_lesson(db, kind):
    import uuid

    from app.models import Lesson, LessonStep

    lid = f"practice-{kind}-{uuid.uuid4().hex[:8]}"
    lesson = Lesson(
        id=lid, feature_id="NOM.SG", features=["NOM.SG"],
        unit_id="u2", rank=99, title_en=f"practice {kind}",
        body="", register="laukika", provenance="original",
        attribution="original",
    )
    db.add(lesson)
    # Two steps: the p23 suite requires every listed lesson to carry ≥2,
    # and fixtures must not pollute lesson-enumerating tests.
    db.add(LessonStep(
        lesson_id=lid, rank=0, kind=kind,
        payload={"prompt": f"practice {kind}"},
        grading={"features": ["NOM.SG"]},
    ))
    db.add(LessonStep(
        lesson_id=lid, rank=1, kind="explain",
        payload={"text": "practice interlude"},
        grading={},
    ))
    db.commit()
    return lid


def _drop_practice_lesson(db, lid):
    from app.models import Lesson

    row = db.query(Lesson).filter(Lesson.id == lid).first()
    if row is not None:
        db.delete(row)
        db.commit()


def test_practice_kinds_attempt_is_noop(client, auth_headers):
    from app.db import SessionLocal
    from app.services.lessons import attempt_step

    for kind in ("build", "articulate", "read"):
        db = SessionLocal()
        lid = None
        try:
            learner_id = client.post(
                "/auth/dev-login",
                json={"display_name": f"practice-{kind}",
                      "bridge_langs": ["en", "hi"]}).json()["learner"]["id"]
            from app.models import Learner
            learner = db.query(Learner).filter(Learner.id == learner_id).first()
            lid = _make_practice_lesson(db, kind)
            before = dict(learner.feature_mastery or {})
            result = attempt_step(db, learner, lid, 0, {"anything": "goes"})
            assert result["verdict"] == "correct", (kind, result)
            assert result["graded"] is False, (kind, result)
            assert dict(learner.feature_mastery or {}) == before, (
                f"{kind} must not touch mastery")
        finally:
            if lid is not None:
                _drop_practice_lesson(db, lid)
            db.close()


def test_practice_kinds_serve_payload_as_is(client, auth_headers):
    from app.db import SessionLocal

    for kind in ("build", "articulate", "read"):
        db = SessionLocal()
        lid = None
        try:
            lid = _make_practice_lesson(db, kind)
            r = client.get(f"/lessons/{lid}/steps", headers=auth_headers)
            assert r.status_code == 200, r.text
            steps = r.json()
            assert steps[0]["kind"] == kind, steps
            assert steps[0]["abstained"] is False, steps
        finally:
            if lid is not None:
                _drop_practice_lesson(db, lid)
            db.close()


def test_practice_kinds_in_registry():
    from app.services.lessons import PRACTICE_KINDS

    assert PRACTICE_KINDS == frozenset({"explain", "build", "articulate", "read"})
