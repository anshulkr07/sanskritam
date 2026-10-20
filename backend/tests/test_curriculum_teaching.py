"""Instructional figures must preserve live text, source checks and answer privacy."""
from pathlib import Path
from types import SimpleNamespace

import pytest
from pydantic import ValidationError

from app.curriculum.audio import attach, card_sources, clip_key
from app.curriculum.loader import CourseData
from app.curriculum.pack import lesson_payload
from app.curriculum.schema import Lesson, TeachingVisual


def visual(**overrides):
    return {"id": "number", "kind": "comparison", "title": {"en": "One and two", "hi": "एक और दो"},
            "items": [{"id": "one", "sa": "बालकः", "meaning": {"en": "one boy", "hi": "एक बालक"}},
                      {"id": "two", "sa": "बालकौ", "meaning": {"en": "two boys", "hi": "दो बालक"}}], **overrides}


@pytest.mark.parametrize("change", [
    {"items": []},
    {"items": [{"id": "same", "sa": "अ"}, {"id": "same", "sa": "इ"}]},
    {"edges": [{"source": "one", "target": "missing", "label": {"en": "agrees"}}]},
    {"items": [{"id": "empty"}]},
    {"kind": "matrix", "columns": [{"en": "A"}], "rows": []},
    {"kind": "matrix", "columns": [{"en": "A"}], "rows": [[{"id": "a", "sa": "अ"}, {"id": "b", "sa": "इ"}]]},
    {"items": [{"id": "scan", "sa": "रामः", "weights": "LX"}]},
])
def test_invalid_visuals_are_rejected(change):
    with pytest.raises(ValidationError):
        TeachingVisual.model_validate(visual(**change))


def test_nested_images_resolve_and_authoring_data_never_ships():
    figure = visual()
    figure["items"][0]["image"] = {"id": "reader", "brief": "PRIVATE AUTHOR NOTE", "alt": {"en": "One reader"}, "ratio": "4:3"}
    figure["items"][0]["check"] = {"type": "subanta", "stem": "बालक"}
    lesson = Lesson.model_validate({"id": "test.figures", "template": "scene", "title": {"en": "Number"},
        "cards": [{"id": "t1", "kind": "teach", "body": {"en": "Compare the groups."}, "visuals": [figure]}]})
    data = CourseData(root=Path("."))
    data.deliveries["reader"] = SimpleNamespace(phone="https://cdn.example/phone.webp", tablet="https://cdn.example/tablet.webp", width=1024, height=768)
    payload = lesson_payload(lesson, data)
    item = payload["cards"][0]["visuals"][0]["items"][0]
    assert item["iast"] == "bālakaḥ"
    assert item["image"]["delivered"] is True
    assert item["image"]["phone"] == "https://cdn.example/phone.webp"
    assert "brief" not in item["image"] and "check" not in item
    assert "PRIVATE AUTHOR NOTE" not in str(payload)


def test_feedback_audio_does_not_leak_an_assessment_answer():
    figure = visual()
    card = {"kind": "practice", "feedback_visuals": [figure]}
    clips = {clip_key("बालकः"): {"url": "https://clips.example/one.mp3"}}
    assert card_sources(card) == []
    mapping = attach([card], clips)
    assert mapping["बालकः"] == "https://clips.example/one.mp3"
    assert "audio" not in card


def test_revision_figures_use_existing_recordings():
    card = {"kind": "revision", "rows": [{"visuals": [visual()]}]}
    assert ("sentence", "बालकः") in card_sources(card)
    mapping = attach([card], {clip_key("बालकौ"): {"url": "https://clips.example/two.mp3"}})
    assert card["audio"] == [mapping["बालकौ"]]
