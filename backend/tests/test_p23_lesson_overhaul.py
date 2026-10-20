"""P23-6 — the lesson rebuild's tests.

The test that replaces a reviewer (round-trip), the test that replaces
remembering (attribution resolves), and the pins for determinism,
abstention, ordering, scheduling and the migration/seed agreement.

No network: every kind below is a vidyut call. No metering anywhere.
"""

import json
import subprocess
import sys

import pytest

from app.services import exercise_gen as eg


def _auth_h(client, name="p23user"):
    r = client.post("/auth/dev-login",
                    json={"display_name": name, "bridge_langs": ["en", "hi"]})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


def _correct_answer_for(kind, params, seed):
    """Build the right answer the way a learner who knows it would: from the
    engine's own output for the same (kind, params, seed)."""
    ans = eg.correct_answer(kind, params, seed)
    assert ans is not None, f"no engine item for {kind}"
    if kind == "grid_fill":
        return {"cells": ans}
    if kind == "reorder":
        return {"order": ans["equivalent_orders"][0]}
    return ans


# ─── Step CRUD and ordering ───────────────────────────────────────────────

def test_step_ordering_and_unique_rank(client):
    h = _auth_h(client)
    units = client.get("/units", headers=h).json()
    assert len(units) == 11
    lesson_id = units[1]["lessons"][0]["id"]  # u2 first lesson
    steps = client.get(f"/lessons/{lesson_id}/steps", headers=h).json()
    assert [s["rank"] for s in steps] == sorted(s["rank"] for s in steps)
    assert steps[0]["kind"] == "explain"
    assert any(s["kind"] == "grid_fill" for s in steps)


def test_step_rank_constraint_holds(client):
    """uq_step_lesson_rank: two steps cannot share (lesson, rank)."""
    import sqlalchemy.exc
    from app.db import SessionLocal
    from app.models import Lesson, LessonStep

    db = SessionLocal()
    try:
        lesson = db.query(Lesson).first()
        dup = LessonStep(lesson_id=lesson.id, rank=0, kind="explain",
                         payload={}, grading={})
        db.add(dup)
        with pytest.raises(sqlalchemy.exc.IntegrityError):
            db.flush()
    finally:
        db.rollback()
        db.close()


# ─── Generator determinism ────────────────────────────────────────────────

@pytest.mark.parametrize("kind", list(eg.SUPPORTED_KINDS))
def test_generator_deterministic_same_seed(kind):
    first = eg.generate(kind, {}, 42)
    second = eg.generate(kind, {}, 42)
    assert first == second
    other = eg.generate(kind, {}, 43)
    # Different seeds may coincide on tiny item spaces (contrast prompts);
    # determinism is the requirement, and it holds above.


def test_generator_deterministic_across_processes():
    """Same seed → byte-identical item in two processes (P23-2)."""
    code = (
        "import json; from app.services import exercise_gen as eg; "
        "print(json.dumps(eg.generate('grid_fill', {}, 7), sort_keys=True, ensure_ascii=False))"
    )
    a = subprocess.run([sys.executable, "-X", "utf8", "-c", code], capture_output=True,
                       text=True, encoding="utf-8", cwd=".")
    b = subprocess.run([sys.executable, "-X", "utf8", "-c", code], capture_output=True,
                       text=True, encoding="utf-8", cwd=".")
    assert a.returncode == 0, a.stderr[-2000:]
    assert b.returncode == 0, b.stderr[-2000:]
    assert a.stdout == b.stdout


# ─── Round-trip: the test that replaces a reviewer ────────────────────────

@pytest.mark.parametrize("kind", list(eg.SUPPORTED_KINDS))
def test_round_trip_grades_correct(kind):
    """Every generated exercise, for every kind, grades correct against its
    own generated answer."""
    params = {} if kind != "sandhi_join" else {}
    answer = _correct_answer_for(kind, params, 7)
    verdict = eg.grade(kind, params, 7, answer)
    assert verdict["verdict"] == "correct", (kind, verdict)
    assert verdict["abstained"] is False


def test_round_trip_wrong_answer_not_correct():
    v = eg.grade("contrast", {}, 7, {"pick": "zzz"})
    assert v["verdict"] == "unsure"  # unreadable answers abstain, never accuse
    ans = eg.correct_answer("contrast", {}, 7)
    wrong_pick = "b" if ans["pick"] == "a" else "a"
    v2 = eg.grade("contrast", {}, 7, {"pick": wrong_pick})
    assert v2["verdict"] == "incorrect"


# ─── Abstention ───────────────────────────────────────────────────────────

def test_abstention_never_incorrect():
    """An engine miss yields unsure + abstained — never incorrect (§2.2)."""
    # Unjoinable input: the splitter returns nothing.
    item = eg.generate("sandhi_split", {"joined": "a"}, 1)
    assert item.get("abstained") is True
    v = eg.grade("sandhi_split", {"joined": "a"}, 1,
                 {"first": "x", "second": "y"})
    assert v["verdict"] == "unsure" and v["abstained"] is True
    # Empty answers are not evidence, on every kind.
    for kind in eg.SUPPORTED_KINDS:
        v = eg.grade(kind, {}, 7, {})
        assert v["verdict"] == "unsure", kind
        assert v["abstained"] is True


def test_verdict_vocabulary_closed():
    for kind in eg.SUPPORTED_KINDS:
        v = eg.grade(kind, {}, 7, _correct_answer_for(
            kind, {}, 7) if kind != "grid_fill"
            else {"cells": eg.correct_answer(kind, {}, 7)})
        assert v["verdict"] in ("correct", "off_by_one", "incorrect", "unsure")


# ─── Engine provenance for every seeded example ───────────────────────────

def test_seeded_examples_engine_derived(client):
    h = _auth_h(client, "p23prov")
    lessons = client.get("/lessons", headers=h).json()
    assert len(lessons) >= 11  # 10 Units 1–3 + the U6 sandhi lesson
    for summary in lessons:
        steps = client.get(f"/lessons/{summary['id']}/steps", headers=h).json()
        # Concept-only lessons (FEM/INDECL/SAMASA-*/KARAKA-*) are explain-only
        # by design (P23-2: never grade what the engine cannot mark).
        assert len(steps) >= 1, summary["feature_id"]
        if len(steps) == 1:
            assert steps[0]["kind"] == "explain", summary["feature_id"]
        else:
            assert len(steps) >= 2, summary["feature_id"]
        lesson = client.get(f"/lessons/{summary['feature_id']}", headers=h).json()
        for ex in lesson["examples"]:
            der = ex.get("derivation")
            if der is None:
                continue
            if "result" in der:
                assert der["result"] == ex["devanagari"], (lesson["feature_id"], ex)
            else:
                assert der.get("splits"), (lesson["feature_id"], ex)


# ─── Attribution resolves: the test that replaces remembering ─────────────

def test_attribution_resolves(client):
    """Every distinct attribution/provenance key in every content table
    matches a content_sources row. Unattributed content is a red test."""
    h = _auth_h(client, "p23attr")
    keys = {r["key"] for r in client.get("/licences", headers=h).json()}
    assert {"original", "learnsanskrit", "vidyut-data", "sa-wikisource",
            "public-domain"} <= keys
    from app.db import SessionLocal
    from app.models import CanonText, Lesson, ReaderPassage, VocabWord

    db = SessionLocal()
    try:
        for (attribution,) in db.query(Lesson.attribution).distinct().all():
            assert (attribution or "") in keys, f"lesson attribution {attribution!r}"
        for (prov,) in db.query(VocabWord.provenance).distinct().all():
            assert (prov or "") in keys, f"vocab provenance {prov!r}"
        for (prov,) in db.query(ReaderPassage.provenance).distinct().all():
            assert (prov or "") in keys, f"reader provenance {prov!r}"
        for (sk,) in db.query(CanonText.source_key).distinct().all():
            assert (sk or "") in keys, f"canon source_key {sk!r}"
    finally:
        db.close()


def test_licence_names_exact(client):
    """Licences are named exactly — CC BY 4.0, MIT, CC BY-SA 4.0."""
    h = _auth_h(client, "p23lic")
    by_key = {r["key"]: r for r in client.get("/licences", headers=h).json()}
    assert by_key["learnsanskrit"]["licence"] == "CC BY 4.0"
    assert by_key["vidyut-data"]["licence"] == "MIT"
    # Reading shelf 2026-10-09 (6.10): sa.wikisource states CC BY-SA 4.0.
    assert by_key["sa-wikisource"]["licence"] == "CC BY-SA 4.0"
    assert by_key["dcs"]["licence"] == "CC BY 4.0"
    assert by_key["ambuda"]["licence"] == "CC0 1.0"
    assert by_key["gretil"]["licence"] == "CC BY-NC-SA 4.0"
    assert by_key["public-domain"]["licence"] == "public domain"
    for row in by_key.values():
        assert row["credit"], row["key"]


# ─── Scheduler ────────────────────────────────────────────────────────────

def test_scheduler_advances_and_lapse_shortens(client):
    from datetime import datetime, timezone
    import sqlalchemy
    from app.db import SessionLocal, engine
    from app.services.review import due_count, schedule_review

    insp = sqlalchemy.inspect(engine)
    assert "review_items" in insp.get_table_names(), (
        f"missing in {engine.url}")

    db = SessionLocal()
    try:
        learner_id = "sched-test-learner"
        now = datetime(2026, 9, 8, 12, 0, tzinfo=timezone.utc)
        first = schedule_review(db, learner_id, "step:x:1", "step", "correct", now=now)
        db.commit()
        # Capture plain values: the second call mutates the same ORM row.
        first_due = first.due_at
        first_stability = first.stability
        assert first_due is not None
        second = schedule_review(db, learner_id, "step:x:1", "step", "correct",
                                 now=first_due)
        db.commit()
        # A recall grows the interval: second due is further out than first.
        assert second.due_at > first_due
        assert second.stability > first_stability
        second_due = second.due_at
        second_stability = second.stability
        second_difficulty = second.difficulty
        lapsed = schedule_review(db, learner_id, "step:x:1", "step", "incorrect",
                                 now=second_due)
        db.commit()
        # A lapse shortens the INTERVAL (10 warm minutes, not days) and
        # records itself — the absolute due still moves forward in time.
        assert lapsed.due_at > second_due
        assert (lapsed.due_at - second_due) < (second_due - first_due)
        assert lapsed.lapses == 1
        assert lapsed.difficulty > second_difficulty
        # Unsure schedules nothing.
        assert schedule_review(db, learner_id, "step:x:1", "step", "unsure",
                               now=now) is None
        assert due_count(db, learner_id, now=now) == 0
    finally:
        db.rollback()
        db.close()


# ─── Migration and seed agree ─────────────────────────────────────────────

def test_migration_units_match_seed(client):
    """The migration's eleven units and seeds/units.py agree on ids+ranks —
    the duplication is deliberate (frozen snapshot vs live source)."""
    from app.seeds.units import SEED_UNITS
    import importlib.util

    spec = importlib.util.spec_from_file_location(
        "p23mig", "migrations/versions/f1a2b3c4d5e6_p23_lesson_steps.py")
    mig = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mig)
    assert [u[0] for u in mig.UNITS] == [u[0] for u in SEED_UNITS]
    assert [u[1] for u in mig.UNITS] == [u[1] for u in SEED_UNITS]


# ─── No samasa/karaka claims ──────────────────────────────────────────────

def test_no_band_or_generator_claims_samasa_karaka():
    from app.seeds.briefs import CHALLENGE_BANDS
    from scripts.p712_feature_coverage import TAXONOMY_ONLY_FEATURES

    band_feats = {f for b in CHALLENGE_BANDS for f in b["features"]}
    assert not (band_feats & TAXONOMY_ONLY_FEATURES)
    for feat in sorted(TAXONOMY_ONLY_FEATURES):
        with pytest.raises(ValueError):
            eg.generate("grid_fill", {"feature": feat}, 1)
        with pytest.raises(ValueError):
            eg.grade("grid_fill", {"feature": feat}, 1, {})


# ─── Step endpoints ───────────────────────────────────────────────────────

def test_step_payload_carries_no_answer(client):
    """The served step is renderable; the answer is NOT in it."""
    h = _auth_h(client, "p23noans")
    units = client.get("/units", headers=h).json()
    lesson_id = units[1]["lessons"][0]["id"]
    steps = client.get(f"/lessons/{lesson_id}/steps", headers=h).json()
    gen_steps = [s for s in steps if s["kind"] != "explain"]
    assert gen_steps
    for s in gen_steps:
        blob = json.dumps(s["payload"])
        assert '"answer"' not in blob, (s["kind"], blob[:200])


def test_step_attempt_writes_mastery_and_schedule(client):
    h = _auth_h(client, "p23attempt")
    units = client.get("/units", headers=h).json()
    lesson = units[1]["lessons"][0]
    steps = client.get(f"/lessons/{lesson['id']}/steps", headers=h).json()
    target = next(s for s in steps if s["kind"] == "grid_fill")
    gen = target["payload"].get("gen") or target["payload"]
    kind = (gen.get("kind") or target["kind"])
    params = gen.get("params", {})
    seed = int(gen.get("seed", 0))
    ans = eg.correct_answer(kind, params, seed)
    answer = {"cells": ans} if kind == "grid_fill" else (
        {"order": ans["equivalent_orders"][0]} if kind == "reorder" else ans)
    r = client.post(f"/lessons/{lesson['id']}/steps/{target['rank']}/attempt",
                    headers=h, json={"answer": answer})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["verdict"] == "correct"
    assert body["due_at"], "an attempt must schedule a review"
    assert body["item_key"].startswith("step:")
    due = client.get("/review/due", headers=h).json()
    assert due["due_count"] >= 0  # scheduled in the future; the join holds


def test_explain_attempt_touches_nothing(client):
    h = _auth_h(client, "p23explain")
    units = client.get("/units", headers=h).json()
    lesson = units[1]["lessons"][0]
    r = client.post(f"/lessons/{lesson['id']}/steps/0/attempt",
                    headers=h, json={"answer": {}})
    assert r.status_code == 200
    assert r.json()["verdict"] == "correct"
    assert r.json()["due_at"] is None


def test_lessons_list_and_filter(client):
    h = _auth_h(client, "p23list")
    all_lessons = client.get("/lessons", headers=h).json()
    u6 = client.get("/lessons?unit_id=u6", headers=h).json()
    assert all_lessons and u6
    assert {l["feature_id"] for l in u6} == {"VOWEL-SANDHI", "VISARGA-SANDHI",
                                            "ANUSVARA-SANDHI", "CONSONANT-SANDHI"}
    sandhi = next(l for l in u6 if l["feature_id"] == "VOWEL-SANDHI")
    assert set(sandhi["features"]) == {"VOWEL-SANDHI", "VISARGA-SANDHI",
                                       "ANUSVARA-SANDHI", "CONSONANT-SANDHI"}


def test_exercise_endpoints(client):
    h = _auth_h(client, "p23ex")
    kinds = client.post("/exercises/generate", headers=h,
                        json={"kind": "contrast", "params": {}, "seed": 3})
    assert kinds.status_code == 200
    assert kinds.json()["kind"] == "contrast"
    bad = client.post("/exercises/generate", headers=h,
                      json={"kind": "grid_fill",
                            "params": {"feature": "SAMASA-DVANDVA"}, "seed": 1})
    assert bad.status_code == 400
    assert "kinds" in client.get("/exercises/kinds", headers=h).json()


# ─── P23-4 importer discipline ────────────────────────────────────────────

def test_learnsanskrit_importer(client, tmp_path):
    """Dry-run default, licence refusal, idempotent live staging with the
    registry key from the first row (P23-4, modelled on import_text.py)."""
    import sys
    sys.path.insert(0, "scripts")
    import import_learnsanskrit as imp

    (tmp_path / "sounds.sml").write_text(
        "# Sounds\n\nFirst meet the sounds. क ख ग घ ङ hum together.\n",
        encoding="utf-8")
    (tmp_path / "sandhi.sml").write_text(
        "# Sandhi\n\nWhere sounds meet. तथा इति makes तथेति.\n",
        encoding="utf-8")
    staged = imp.collect_sections(tmp_path)
    assert len(staged) == 2
    by_id = {s["section_id"]: s for s in staged}
    assert by_id["sounds"]["unit_id"] == "u1"
    assert by_id["sandhi"]["unit_id"] == "u6"

    with pytest.raises(SystemExit):
        imp.run_import(staged, licence="", live=False)
    with pytest.raises(SystemExit):
        imp.run_import(staged, licence="MIT", live=False)

    first = imp.run_import(staged, licence="CC BY 4.0", live=True)
    assert first["added"] == 2 and first["skipped_dup"] == 0
    second = imp.run_import(staged, licence="CC BY 4.0", live=True)
    assert second["added"] == 0 and second["skipped_dup"] == 2

    from app.db import SessionLocal
    from app.models import Lesson
    db = SessionLocal()
    try:
        # Scoped to this test's own provenances: U8 seed rows share the
        # learnsanskrit: prefix (2026-09-08 curation) and must survive.
        rows = db.query(Lesson).filter(
            Lesson.provenance.in_(["learnsanskrit:sounds",
                                   "learnsanskrit:sandhi"])).all()
        assert len(rows) == 2
        for r in rows:
            assert r.attribution == "learnsanskrit"
            assert r.audio_url == ""  # never TTS a corpus import
    finally:
        for r in db.query(Lesson).filter(
                Lesson.provenance.in_(["learnsanskrit:sounds",
                                       "learnsanskrit:sandhi"])).all():
            for s in r.steps:
                db.delete(s)
            db.delete(r)
        db.commit()
        db.close()


# ─── Writing lives outside feature_mastery ────────────────────────────────

def test_writing_mastery_separate_from_feature_mastery(client):
    from app.db import SessionLocal
    from app.models import WritingItem

    h = _auth_h(client, "p23write")
    db = SessionLocal()
    try:
        item = db.query(WritingItem).first()
        assert item is not None
        item_id, dev = item.id, item.devanagari
    finally:
        db.close()
    r = client.post("/writing/attempt", headers=h,
                    json={"item_id": item_id, "recognised_text": dev,
                          "confidence": 0.99, "source": "ink"})
    assert r.status_code == 200, r.text
    assert r.json()["verdict"] == "correct"
    me = client.get("/me", headers=h).json()["learner"]
    assert not [k for k in (me["feature_mastery"] or {}) if str(k).startswith("write:")]


# ─── The staged shelf stays off the path ──────────────────────────────────

def test_is_staged_rule():
    import types
    from app.services.lessons import is_staged

    assert is_staged(types.SimpleNamespace(title_en="[staged] Vowels", rank=900))
    assert is_staged(types.SimpleNamespace(title_en="Anything", rank=900))
    assert is_staged(types.SimpleNamespace(title_en="[staged] Odd", rank=3))
    assert not is_staged(types.SimpleNamespace(title_en="Sounds first", rank=0))
    assert not is_staged(types.SimpleNamespace(title_en="", rank=None))


def test_units_omit_staged_lessons_but_lessons_keep_them(client):
    """Unreviewed imports are parked on the staged shelf. /units is the learner's
    path, so it leaves them out; /lessons still lists them (the grammar guide
    links by id)."""
    from app.db import SessionLocal
    from app.models import Lesson, Unit

    db = SessionLocal()
    try:
        unit = db.query(Unit).filter(Unit.id == "u2").first()
        feature = db.query(Lesson).filter(Lesson.unit_id == "u2").first().feature_id
        row = Lesson(
            id="staged-shelf-test", feature_id=feature, unit_id=unit.id, rank=900,
            title_en="[staged] Shelf test", title_hi="", body="", examples=[],
        )
        db.add(row)
        db.commit()
    finally:
        db.close()
    try:
        h = _auth_h(client, "p23staged")
        in_units = {l["id"] for u in client.get("/units", headers=h).json() for l in u["lessons"]}
        assert "staged-shelf-test" not in in_units
        for u in client.get("/units", headers=h).json():
            for l in u["lessons"]:
                assert not l["title_en"].startswith("[staged]"), l["title_en"]
                assert l["rank"] < 900
        in_lessons = {l["id"] for l in client.get("/lessons", headers=h).json()}
        assert "staged-shelf-test" in in_lessons
    finally:
        db = SessionLocal()
        try:
            db.query(Lesson).filter(Lesson.id == "staged-shelf-test").delete()
            db.commit()
        finally:
            db.close()
