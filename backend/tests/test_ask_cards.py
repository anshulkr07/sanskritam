"""Ask cards: shaped wider answers with calculated FACTS, never recalled dates.

Covers HANDOVER 4.4-4.5: the card is parsed and clipped, dates come from
FACTS, a refusal stays one line, broken JSON falls back to prose, and the
cache key changes with the date.
"""

import pytest

from app.routers import explain as explain_router
from app.routers.explain import _build_facts, _cache_key, _cache
from app.services.explainer import clip_card, flatten_card, parse_card_json


def test_clip_card_enforces_shape():
    raw = {
        "title": "one two three four five six seven eight",
        "title_sa": "पितृपक्षः",
        "summary": "Sixteen lunar days for remembering ancestors.",
        "sections": [
            {"heading": "How to observe", "style": "steps", "items": ["a", "b", "c", "d", "e", "f"]},
            {"heading": "Food", "style": "bullets", "items": ["x"]},
            {"heading": "More", "style": "bullets", "items": ["y"]},
            {"heading": "Extra", "style": "bullets", "items": ["z"]},
        ],
        "terms": [
            {"sa": "तर्पणम्", "meaning": "water offering"},
            {"sa": "hello", "meaning": "not devanagari"},
            {"sa": "श्राद्धम्", "meaning": "rite"},
            {"sa": "पिण्डः", "meaning": "rice ball"},
            {"sa": "दक्षिणा", "meaning": "gift"},
        ],
        "caution": "See a doctor if unwell.",
    }
    card = clip_card(raw)
    assert len(card["title"].split()) <= 6
    assert len(card["sections"]) <= 3
    assert all(len(s["items"]) <= 5 for s in card["sections"])
    assert len(card["terms"]) <= 4
    assert all("hello" not in t["sa"] for t in card["terms"])
    assert all(t["iast"] for t in card["terms"])
    assert "—" not in card["summary"]


def test_parse_broken_json_returns_none():
    assert parse_card_json("not json at all") is None
    assert parse_card_json('{"title": "x"') is None


def test_refusal_stays_one_line():
    raw = {"title": "Outside help", "summary": "I can only help with Sanskrit, festivals and home practice.", "sections": [], "terms": [], "caution": ""}
    card = clip_card(raw)
    assert card["summary"].count(".") <= 1 or "\n" not in card["summary"]
    flat = flatten_card(card)
    assert "Sanskrit" in flat


def test_facts_come_from_calculation():
    place = {"lat": 28.6, "lon": 77.2, "tz": "Asia/Kolkata", "label": "New Delhi"}
    facts, when_text, when_note, date_str, place_key = _build_facts(
        "What is today's tithi?", "", place
    )
    assert facts.startswith("FACTS (calculated for New Delhi")
    assert "Today," in facts
    assert when_text
    assert when_note == "For New Delhi"
    assert date_str
    assert place_key == "28.6,77.2"


def test_no_calendar_question_gives_no_facts():
    place = {"lat": 28.6, "lon": 77.2, "tz": "Asia/Kolkata", "label": "New Delhi"}
    facts, *_ = _build_facts("What is sandhi?", "", place)
    assert facts == ""


def test_cache_key_changes_with_date():
    k1 = _cache_key("general", "", "what is today's tithi?", "cards:2026-10-01:28.6,77.2")
    k2 = _cache_key("general", "", "what is today's tithi?", "cards:2026-10-02:28.6,77.2")
    k3 = _cache_key("general", "", "what is today's tithi?", "cards:2026-10-01:12.9,77.6")
    assert k1 != k2
    assert k1 != k3


def _fake_card():
    return {
        "title": "Pitru Paksha",
        "title_sa": "पितृपक्षः",
        "title_iast": "pitrpakṣaḥ",
        "summary": "Sixteen lunar days for remembering your ancestors.",
        "sections": [{"heading": "How to observe", "style": "steps", "items": ["Offer water in the morning."]}],
        "terms": [{"sa": "तर्पणम्", "iast": "tarpaṇam", "meaning": "water offering"}],
        "caution": "",
    }


def test_card_endpoint_sets_when_from_facts(client, auth_headers, monkeypatch):
    from app.services import explainer as expl_mod

    async def fake_answer_card(self, question="", language="English", facts="", screen_text=""):
        assert facts.startswith("FACTS"), facts
        return _fake_card()

    monkeypatch.setattr(expl_mod.Explainer, "answer_card", fake_answer_card)
    _cache.clear()
    r = client.post(
        "/explain",
        json={"surface": "general", "subject": "", "question": "When is pitru paksha?", "cards": True},
        headers=auth_headers,
    )
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["card"] is not None
    assert d["card"]["title"] == "Pitru Paksha"
    assert d["card"]["when"]["text"]
    assert d["card"]["when"]["note"] == "For New Delhi"
    assert d["card"]["place_needed"] is True
    assert "Sixteen lunar days" in d["explanation"]


def test_card_endpoint_with_place_clears_place_needed(client, auth_headers, monkeypatch):
    from app.services import explainer as expl_mod

    async def fake_answer_card(self, question="", language="English", facts="", screen_text=""):
        return _fake_card()

    monkeypatch.setattr(expl_mod.Explainer, "answer_card", fake_answer_card)
    _cache.clear()
    r = client.post(
        "/explain",
        json={
            "surface": "general", "subject": "", "question": "What is today's tithi?",
            "cards": True,
            "place": {"lat": 12.9, "lon": 77.6, "tz": "Asia/Kolkata", "label": "Bengaluru"},
        },
        headers=auth_headers,
    )
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["card"] is not None
    assert d["card"]["place_needed"] is False
    assert "Bengaluru" in d["card"]["when"]["note"]


def test_broken_card_json_falls_back_to_prose(client, auth_headers, monkeypatch):
    from app.services import explainer as expl_mod

    async def fake_answer_card(self, question="", language="English", facts="", screen_text=""):
        return None

    async def fake_answer(self, question="", language="English"):
        return "Pitru Paksha is the fortnight for ancestors."

    monkeypatch.setattr(expl_mod.Explainer, "answer_card", fake_answer_card)
    monkeypatch.setattr(expl_mod.Explainer, "answer", fake_answer)
    _cache.clear()
    r = client.post(
        "/explain",
        json={"surface": "general", "subject": "", "question": "When is pitru paksha?", "cards": True},
        headers=auth_headers,
    )
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["card"] is None
    assert "Pitru Paksha" in d["explanation"]
