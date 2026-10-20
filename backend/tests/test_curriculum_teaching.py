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


def test_shared_images_reuse_one_definition_but_conflicts_are_rejected():
    import copy
    from app.curriculum.schema import ImageRef
    from app.curriculum.validate import Checker, errors
    checker = Checker(CourseData(root=Path('.')))
    image = ImageRef(id='shared-reader', brief='One boy reads one open book in a quiet plain courtyard.', alt={'en':'One reader','hi':'पढ़ता एक बालक'})
    checker._image('first', image)
    checker._image('second', copy.deepcopy(image))
    assert not errors(checker.issues)
    conflicting = copy.deepcopy(image)
    conflicting.alt.en = 'Two readers'
    checker._image('conflicting', conflicting)
    assert any('conflicts with its definition' in i.message for i in errors(checker.issues))


@pytest.mark.parametrize('diagram', [
    {'kind':'count','quantity':-1}, {'kind':'count','quantity':1001},
    {'kind':'conversation','role':'speaker','quantity':4},
    {'kind':'position','relation':'somewhere'},
])
def test_semantic_diagrams_reject_ambiguous_values(diagram):
    with pytest.raises(ValidationError):
        TeachingVisual.model_validate(visual(items=[{'id':'cue','diagram':diagram}]))


def test_live_comparison_and_nested_table_picture_ship_without_private_claims():
    lesson = Lesson.model_validate({'id':'test.matrix','template':'scene','title':{'en':'Forms'},
      'cards':[{'id':'tb1','kind':'table','caption':{'en':'Compare'},'columns':[{'en':'Form'}],
       'rows':[[{'sa':'देवेन','compare_from':'देव','check':{'type':'subanta','stem':'देव'},
                 'image':{'id':'deva','brief':'Private image authoring notes never enter the public lesson payload.','alt':{'en':'A deity'}}}]]}]})
    data=CourseData(root=Path('.'))
    data.deliveries['deva']=SimpleNamespace(phone='https://cdn.example/deva.webp',tablet='https://cdn.example/deva-large.webp',width=1000,height=750)
    cell=lesson_payload(lesson,data)['cards'][0]['rows'][0][0]
    assert cell['compare_from_iast']=='deva'
    assert cell['image']['delivered'] and 'brief' not in cell['image']
    assert 'check' not in cell
