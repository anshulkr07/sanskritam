"""The story course: content rules, engine claims, the pack, story state and
the /learn endpoints. Content errors fail here, so CI blocks a broken lesson
the same way ``python -m app.curriculum check --engine`` does."""

from __future__ import annotations

import json
import shutil
import uuid

import pytest
import yaml

from app.curriculum import CONTENT_DIR, build, load
from app.curriculum.engine import claims
from app.curriculum.engine import run as engine_run
from app.curriculum.schema import LESSON_ID_MAX
from app.curriculum.state import course_order, derive
from app.curriculum.validate import buildable, errors, validate


@pytest.fixture(scope="module")
def data():
    return load(CONTENT_DIR)


@pytest.fixture(scope="module")
def pack(data):
    return build(data)


def _messages(issues):
    return [f"{i.where}: {i.message}" for i in issues]


# ─── Content ────────────────────────────────────────────────────────────────

def test_content_has_no_errors(data):
    bad = errors(validate(data))
    assert not bad, "\n".join(_messages(bad))


def test_every_engine_claim_and_widget_holds(data):
    assert sum(1 for _ in claims(data)) >= 15  # the claims really are collected
    bad = errors(engine_run(data))
    assert not bad, "\n".join(_messages(bad))


def test_release_gate_blocks_unreviewed_lessons_and_missing_pictures(data):
    import copy
    unreviewed = copy.deepcopy(data)
    unreviewed.lessons["vowels.short"].obj.review = "engine_ok"
    unreviewed.deliveries.clear()
    msgs = "\n".join(_messages(errors(validate(unreviewed, release=True))))
    assert "a release needs scholar_ok" in msgs
    assert "not delivered" in msgs


def test_current_owner_approved_content_passes_release_gates(data):
    bad = errors(validate(data, release=True))
    assert not bad, "\n".join(_messages(bad))
    assert all(loc.obj.review == "scholar_ok" for loc in data.lessons.values())


def _broken_copy(tmp_path, lesson_rel: str, edit) -> object:
    root = tmp_path / "content"
    shutil.copytree(CONTENT_DIR, root)
    path = root / lesson_rel
    raw = yaml.safe_load(path.read_text(encoding="utf-8"))
    edit(raw)
    path.write_text(yaml.safe_dump(raw, allow_unicode=True, sort_keys=False), encoding="utf-8")
    return load(root)


SHORT = "acts/act-1/vowels/vowels.short.yaml"


def _card(raw, cid):
    return next(c for c in raw["cards"] if c["id"] == cid)


def test_checker_catches_a_scene_without_its_summary(tmp_path):
    d = _broken_copy(tmp_path, SHORT, lambda raw: raw["cards"].pop())
    assert any("ends with its summary" in m for m in _messages(errors(validate(d))))


def test_checker_catches_a_target_missing_from_the_passage(tmp_path):
    def edit(raw):
        _card(raw, "e2")["params"]["targets"].append("उलूकः")
    d = _broken_copy(tmp_path, SHORT, edit)
    assert any("targets not in the passage" in m for m in _messages(errors(validate(d))))


def test_checker_catches_a_misspelt_widget_key(tmp_path):
    def edit(raw):
        _card(raw, "e1")["params"] = {"letter": ["अ"]}
    d = _broken_copy(tmp_path, SHORT, edit)
    assert any("mouth_map" in m for m in _messages(errors(validate(d))))


def test_checker_catches_a_wrong_engine_claim(tmp_path):
    def edit(raw):
        # Feminine would not do: an i-stem feminine is ऋषिः too. The object case is ऋषिम्.
        _card(raw, "t2")["examples"][0]["check"]["vibhakti"] = "Dvitiya"
    d = _broken_copy(tmp_path, SHORT, edit)
    assert any("ऋषिः" in m for m in _messages(errors(engine_run(d))))


def test_tiles_must_build_the_answer():
    assert buildable("कू", ["क", "ू", "ु"])
    assert not buildable("कू", ["क", "ु"])
    assert not buildable("ककू", ["क", "ू"])  # each tile once


# ─── Pack ───────────────────────────────────────────────────────────────────

def _walk(node):
    if isinstance(node, dict):
        yield node
        for v in node.values():
            yield from _walk(v)
    elif isinstance(node, list):
        for v in node:
            yield from _walk(v)


def test_pack_is_deterministic_and_ships_no_server_only_data(data, pack):
    again = build(data)
    assert again.version == pack.version
    assert {k: v["hash"] for k, v in again.lessons.items()} == {k: v["hash"] for k, v in pack.lessons.items()}
    for lesson_id, lesson in pack.lessons.items():
        assert len(lesson_id) <= LESSON_ID_MAX
        for node in _walk(lesson):
            assert "brief" not in node and "prompt_text" not in node
            check = node.get("check")
            assert not (isinstance(check, dict) and "type" in check), f"engine claim shipped in {lesson_id}"


def test_pack_adds_iast_and_engine_inputs(pack):
    short = pack.lessons["vowels.short"]
    mouth = next(c for c in short["cards"] if c["id"] == "e1")["params"]
    assert mouth["places"]["इ"] == ["talu"] and mouth["iast"]["इ"] == "i"
    long_ = pack.lessons["vowels.long"]
    tapper = next(c for c in long_["cards"] if c["id"] == "e2")["params"]
    assert tapper["scan"][0]["weights"] == "LGLGLGLG"
    signs = pack.lessons["vowels.signs"]
    builder = next(c for c in signs["cards"] if c["id"] == "e1")["params"]
    assert builder["iast"]["कौ"] == "kau"
    typed = next(c for c in signs["cards"] if c["id"] == "p2")
    assert typed["accept"] == ["कू"] and typed["answers_iast"] == ["kū"]


def test_authored_contrast_and_join_match_their_prompts(pack):
    contrast = next(c for c in pack.lessons["nf1.deva"]["cards"] if c["id"] == "p6")["exercise"]
    assert not contrast["item"]["abstained"]
    assert contrast["item"]["a"]["form"] != contrast["item"]["b"]["form"]
    target = contrast["item"][contrast["answer"]["pick"]]
    assert (target["form"], target["vibhakti"], target["vacana"]) == ("देवौ", "Prathama", "Dvi")
    joined = next(c for c in pack.lessons["vs.guna"]["cards"] if c["id"] == "p6")["exercise"]
    assert not joined["item"]["abstained"]
    assert (joined["item"]["first"], joined["item"]["second"], joined["answer"]["joined"]) == ("तथा", "इति", "तथेति")
    assert joined["item"]["options"].count(joined["answer"]["joined"]) == 1


def test_index_keeps_each_unit_check_and_marks_planned_units(pack):
    units = {u["id"]: u for a in pack.index["acts"] for p in a["parts"] for u in p["units"]}
    vowels = units["vowels"]
    assert vowels["status"] == "ready"
    assert vowels["check"]["id"] == "vowels.check"
    assert vowels["revision"]["id"] == "vowels.revision"
    assert vowels["ghost"]["freed_line"]["iast"]
    assert "beats" not in vowels["episode"]  # the authors' plot outline never ships
    for unit in units.values():
        if unit["status"] == "planned":
            assert not unit["lessons"] and unit["revision"] is None and unit["check"] is None
            assert unit["reading"] is None


def test_optional_readings_ship_with_glosses_and_do_not_reset_progress(data, pack):
    units = [u for a in pack.index["acts"] for p in a["parts"] for u in p["units"]]
    readings = [u for u in units if u.get("reading")]
    assert {u["id"] for u in readings} >= {"who-does", "one-two-many", "past", "reading-kss"}
    required = [s["lesson_id"] for s in course_order(pack.index) if s["role"] not in ("reading", "revision", "coming_soon")]
    before = derive(pack.index, required)
    assert before["current"] is None and all(u["done"] for u in before["units"].values())
    for unit in readings:
        lid = unit["reading"]["id"]
        lesson = pack.lessons[lid]
        assert lesson["template"] == "episode"
        assert lid not in {l["id"] for l in unit["lessons"]}
        assert any(c["kind"] == "practice" for c in lesson["cards"])
        sentences = [s for c in lesson["cards"] if c["kind"] == "reading" for s in c["passage"]]
        assert sentences and all(s["words"] and s["iast"] for s in sentences)
        after = derive(pack.index, [*required, lid])
        assert lid in after["finished"]
        for key in ("current", "units", "ghosts_freed", "leaves", "acts"):
            assert after[key] == before[key]


def test_checker_requires_episode_template_for_optional_reading(tmp_path):
    d = _broken_copy(tmp_path, "acts/act-3/past/unit.yaml", lambda raw: raw.update(reading="past.tell"))
    assert any("reading past.tell uses template scene, expected episode" in m for m in _messages(errors(validate(d))))


def test_optional_reading_cannot_need_future_skills(tmp_path):
    d = _broken_copy(tmp_path, "acts/act-3/past/past.reading.yaml", lambda raw: raw.update(needs=["verb.lrt"]))
    assert any("needs verb.lrt, which is not taught before it" in m for m in _messages(errors(validate(d))))


# ─── Story state ────────────────────────────────────────────────────────────

VOWEL_LESSONS = ["vowels.short", "vowels.long", "vowels.compound", "vowels.signs"]


def _unit_after(index, unit_id):
    """The unit that follows ``unit_id`` in course order (as more units are
    written, it turns from planned to ready; the tests follow the data)."""
    order = [u for a in index["acts"] for p in a["parts"] for u in p["units"]]
    ids = [u["id"] for u in order]
    return order[ids.index(unit_id) + 1]


def test_state_starts_at_the_prologue(pack):
    s = derive(pack.index, [])
    assert s["current"]["lesson_id"] == "prologue"
    assert s["ghosts_freed"] == [] and not any(leaf["recovered"] for leaf in s["leaves"])


def test_state_needs_the_check_not_the_revision(pack):
    s = derive(pack.index, ["prologue", *VOWEL_LESSONS])
    assert s["current"]["lesson_id"] == "vowels.check"
    assert not s["units"]["vowels"]["done"]
    s = derive(pack.index, ["prologue", *VOWEL_LESSONS, "vowels.check"])
    assert s["units"]["vowels"]["done"] and s["ghosts_freed"] == ["dhumaka"]
    nxt = _unit_after(pack.index, "vowels")
    if nxt["status"] == "planned":
        assert s["current"] is None and s["coming_soon"] == nxt["id"]
    else:
        assert s["current"]["unit_id"] == nxt["id"]
    assert not s["leaves"][0]["recovered"]  # the other three units of the part are still ahead


def test_course_order_lists_planned_units_as_coming_soon(pack):
    import copy

    # The whole course is written: every unit contributes its lessons, revision and check.
    roles = [s["role"] for s in course_order(pack.index)]
    assert roles[0] == "prologue" and "coming_soon" not in roles
    assert roles.count("revision") == roles.count("check") == sum(
        len(part["units"]) for act in pack.index["acts"] for part in act["parts"])
    # A unit that is not ready again shows once as "coming soon" (the path new units use).
    index = copy.deepcopy(pack.index)
    unit = index["acts"][-1]["parts"][-1]["units"][-1]
    unit["status"] = "planned"
    stops = course_order(index)
    assert [s["unit_id"] for s in stops if s["role"] == "coming_soon"] == [unit["id"]]


# ─── Endpoints ──────────────────────────────────────────────────────────────

def _learner(client):
    r = client.post("/auth/dev-login", json={"display_name": f"learn-{uuid.uuid4().hex[:8]}",
                                              "bridge_langs": ["en"]})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


def test_index_and_lessons_are_cached_by_etag(client):
    r = client.get("/learn/index")
    assert r.status_code == 200 and r.headers["etag"]
    assert client.get("/learn/index", headers={"If-None-Match": r.headers["etag"]}).status_code == 304
    r = client.get("/learn/lessons/vowels.short")
    assert r.status_code == 200
    assert r.headers["etag"] == f'"{r.json()["hash"]}"'
    assert client.get("/learn/lessons/vowels.short", headers={"If-None-Match": r.headers["etag"]}).status_code == 304
    assert client.get("/learn/lessons/no-such-lesson").status_code == 404


def test_state_follows_finished_lessons(client):
    h = _learner(client)
    assert client.get("/learn/state", headers=h).json()["current"]["lesson_id"] == "prologue"
    assert client.post("/progress/card-lesson", json={"lesson_id": "prologue"}, headers=h).status_code == 200
    s = client.get("/learn/state", headers=h).json()
    assert s["current"]["lesson_id"] == "vowels.short" and s["version"].startswith("learn-")


def test_optional_reading_completion_is_saved_without_advancing_the_road(client):
    h = _learner(client)
    before = client.get("/learn/state", headers=h).json()
    index = _pack_index(client)
    unit = next(u for a in index["acts"] for p in a["parts"] for u in p["units"] if u["id"] == "past")
    lid = unit["reading"]["id"]
    response = client.get("/learn/lessons/" + lid)
    assert response.status_code == 200 and response.json()["template"] == "episode"
    assert client.get("/learn/lessons/" + lid, headers={"If-None-Match": response.headers["etag"]}).status_code == 304
    assert client.post("/progress/card-lesson", json={"lesson_id": lid, "checks_right": 2, "checks_total": 2}, headers=h).status_code == 200
    assert client.post("/learn/attempts", json={"lesson_id": lid, "results": [{"card_id": "p1", "verdict": "correct"}]}, headers=h).status_code == 200
    after = client.get("/learn/state", headers=h).json()
    assert lid in after["finished"]
    for key in ("current", "units", "ghosts_freed", "leaves", "acts"):
        assert after[key] == before[key]


def test_attempts_schedule_practice_cards_only(client):
    from datetime import datetime, timedelta, timezone

    from app.db import SessionLocal
    from app.models import ReviewItem

    h = _learner(client)
    body = {"lesson_id": "vowels.short", "results": [
        {"card_id": "p1", "verdict": "incorrect"},
        {"card_id": "e1", "verdict": "correct"},       # explore: not reviewed
        {"card_id": "nope", "verdict": "correct"},     # unknown: ignored
        {"card_id": "p4", "verdict": "unsure"},        # uncertainty schedules nothing
    ]}
    r = client.post("/learn/attempts", json=body, headers=h)
    assert r.status_code == 200 and r.json() == {"scheduled": 1}
    assert client.post("/learn/attempts", json={"lesson_id": "nope", "results": []}, headers=h).status_code == 404

    db = SessionLocal()
    try:
        row = db.query(ReviewItem).filter(ReviewItem.item_key == "learn:vowels.short#p1").order_by(
            ReviewItem.updated_at.desc()).first()
        row.due_at = datetime.now(timezone.utc) - timedelta(minutes=1)
        db.commit()
    finally:
        db.close()
    due = client.get("/learn/review", headers=h).json()
    assert due["due_count"] >= 1
    item = next(i for i in due["items"] if i["item_key"] == "learn:vowels.short#p1")
    assert item["card"]["kind"] == "practice" and item["card"]["id"] == "p1"


def test_test_out_finishes_the_current_unit(client):
    h = _learner(client)
    # Not on this unit yet (the prologue comes first): refused.
    client.post("/progress/card-lesson", json={"lesson_id": "vowels.check"}, headers=h)
    r = client.post("/learn/test-out", json={"unit_id": "vowels", "checks_right": 9, "checks_total": 9}, headers=h)
    assert r.status_code == 409
    client.post("/progress/card-lesson", json={"lesson_id": "prologue"}, headers=h)
    r = client.post("/learn/test-out", json={"unit_id": "vowels", "checks_right": 5, "checks_total": 9}, headers=h)
    assert r.status_code == 409  # not passed
    r = client.post("/learn/test-out", json={"unit_id": "vowels", "checks_right": 8, "checks_total": 9}, headers=h)
    assert r.status_code == 200 and r.json()["finished"] == VOWEL_LESSONS
    s = client.get("/learn/state", headers=h).json()
    assert s["units"]["vowels"]["done"] and s["ghosts_freed"] == ["dhumaka"]
    planned = [u["id"] for a in _pack_index(client)["acts"] for p in a["parts"] for u in p["units"]
               if u["status"] == "planned"]
    if planned:  # a unit that is not written yet cannot be tested out
        assert client.post("/learn/test-out", json={"unit_id": planned[0], "checks_right": 1,
                                                    "checks_total": 1}, headers=h).status_code == 404


def _pack_index(client):
    return client.get("/learn/index").json()


def test_index_payload_is_json_serialisable(pack):
    json.dumps(pack.index, ensure_ascii=False)
    for lesson in pack.lessons.values():
        json.dumps(lesson, ensure_ascii=False)
