"""What a verse means: the database first, Gemini once, then the database.

Owner instruction 2026-10-02 (services/verse_study.py). Zero network calls:
the model is a fake provider that counts how often it is asked.
"""

import asyncio
import json
import uuid

import pytest

from app.config import settings
from app.db import SessionLocal
from app.evals.providers import LLMResponse
from app.models import AskAnswer, Shloka, UsageEvent
from app.routers.explain import _cache, is_engine_question, is_verse_subject
from app.services import verse_study
from app.services.quota import GEMINI_KIND, gemini_cost_inr

STUDY = {
    "clear": True,
    "meaning_en": "Truth alone wins, not falsehood.",
    "meaning_hi": "सत्य की ही जीत होती है, असत्य की नहीं।",
    "idea_en": ["Truth lasts.", "It is India's national motto."],
    "idea_hi": ["सत्य टिकता है।"],
    "words": [{"sa": "सत्यम्", "en": "truth", "hi": "सत्य"},
              {"sa": "jayate", "en": "not Devanagari, dropped", "hi": ""}],
}
CARD = {
    "title": "Why truth wins",
    "summary": "Because a lie needs more lies to stand.",
    "sections": [{"heading": "The idea", "style": "bullets", "items": ["Truth needs no support."]}],
    "terms": [{"sa": "सत्यम्", "meaning": "truth"}],
}


class FakeProvider:
    """Counts calls and answers with whatever JSON the test queued."""

    configured = True
    label = "vertex:fake"

    def __init__(self, reply=None):
        self.reply = STUDY if reply is None else reply
        self.calls = []

    async def complete(self, system, user, *, temperature=0.0, max_tokens=512, json_mode=False):
        self.calls.append({"system": system, "user": user, "max_tokens": max_tokens})
        if isinstance(self.reply, Exception):
            raise self.reply
        if isinstance(self.reply, LLMResponse):
            return self.reply
        return LLMResponse(text=json.dumps(self.reply, ensure_ascii=False),
                           prompt_tokens=400, completion_tokens=300,
                           model="fake", provider="vertex")


@pytest.fixture
def model(monkeypatch):
    fake = FakeProvider()
    monkeypatch.setattr(verse_study, "_get_provider", lambda: fake)
    _cache.clear()
    return fake


@pytest.fixture
def no_model(monkeypatch):
    """No Gemini credentials, which is how the suite (and a host without the
    key) runs."""
    monkeypatch.setattr(verse_study, "available", lambda: False)
    _cache.clear()


def _login(client):
    r = client.post("/auth/dev-login",
                    json={"display_name": f"verse-{uuid.uuid4().hex[:8]}", "bridge_langs": ["en", "hi"]})
    assert r.status_code == 200, r.text
    data = r.json()
    return data["learner"]["id"], {"Authorization": f"Bearer {data['token']}"}


def _verse(en="", hi="", breakdown=None):
    """A verse row with text no other test uses."""
    tag = uuid.uuid4().hex[:6]
    text = f"सत्यमेव जयते नानृतम् {tag}"
    db = SessionLocal()
    try:
        row = Shloka(id=uuid.uuid4().hex[:16], date="2020-01-01", source_ref="Test 1.1",
                     devanagari=text, iast="", word_breakdown=breakdown or [],
                     translation_en=en, translation_hi=hi)
        db.add(row)
        db.commit()
        return row.id, text
    finally:
        db.close()


def _row(shloka_id):
    db = SessionLocal()
    try:
        return db.query(Shloka).filter(Shloka.id == shloka_id).first()
    finally:
        db.close()


def _gemini_spend(learner_id):
    db = SessionLocal()
    try:
        rows = db.query(UsageEvent).filter(UsageEvent.learner_id == learner_id,
                                           UsageEvent.kind == GEMINI_KIND).all()
        return sum(r.amount for r in rows)
    finally:
        db.close()


def _ask(client, headers, text, question, surface="shloka", cards=True):
    return client.post("/explain", headers=headers,
                       json={"surface": surface, "subject": text, "question": question, "cards": cards})


# ── the meaning under the verse ──────────────────────────────────────────────

def test_stored_meaning_is_served_without_the_model(client, model):
    _, headers = _login(client)
    sid, _ = _verse(en="Stored English.", hi="संग्रहीत हिंदी।")
    r = client.get(f"/shlokas/{sid}/meaning", headers=headers)
    assert r.status_code == 200, r.text
    assert r.json() == {"translation_en": "Stored English.", "translation_hi": "संग्रहीत हिंदी।", "source": "db"}
    assert model.calls == []


def test_missing_meaning_is_written_once_then_read_from_the_row(client, model):
    lid, headers = _login(client)
    sid, _ = _verse()

    first = client.get(f"/shlokas/{sid}/meaning", headers=headers).json()
    assert first == {"translation_en": STUDY["meaning_en"], "translation_hi": STUDY["meaning_hi"], "source": "llm"}
    row = _row(sid)
    assert row.translation_en == STUDY["meaning_en"] and row.translation_hi == STUDY["meaning_hi"]

    _, other = _login(client)
    second = client.get(f"/shlokas/{sid}/meaning", headers=other).json()
    assert second["source"] == "db" and second["translation_en"] == STUDY["meaning_en"]
    assert len(model.calls) == 1, "the second learner must not pay for a model call"
    # The ledger ends at what the call was billed for, not at the reservation.
    assert _gemini_spend(lid) == pytest.approx(gemini_cost_inr(400, 300))


def test_a_sourced_translation_is_never_overwritten(client, model):
    """One language stored: nothing is generated, and nothing replaces it."""
    _, headers = _login(client)
    sid, _ = _verse(en="From the import.")
    body = client.get(f"/shlokas/{sid}/meaning", headers=headers).json()
    assert body == {"translation_en": "From the import.", "translation_hi": "", "source": "db"}
    assert model.calls == []


def test_unreadable_line_stores_nothing_and_is_not_asked_twice(client, model):
    model.reply = {"clear": False}
    _, headers = _login(client)
    sid, _ = _verse()
    for _ in range(2):
        body = client.get(f"/shlokas/{sid}/meaning", headers=headers).json()
        assert body == {"translation_en": "", "translation_hi": "", "source": "none"}
    assert len(model.calls) == 1
    assert _row(sid).translation_en == ""


def test_no_credentials_means_no_meaning_and_no_error(client, no_model):
    _, headers = _login(client)
    sid, _ = _verse()
    r = client.get(f"/shlokas/{sid}/meaning", headers=headers)
    assert r.status_code == 200 and r.json()["source"] == "none"


def test_failed_call_is_refunded_and_stores_nothing(client, model):
    model.reply = RuntimeError("network down")
    lid, headers = _login(client)
    sid, text = _verse()
    assert client.get(f"/shlokas/{sid}/meaning", headers=headers).json()["source"] == "none"
    assert _gemini_spend(lid) == pytest.approx(0.0)
    db = SessionLocal()
    try:
        assert verse_study.load_answer(db, text, verse_study.MEANING_Q, "en") is None
    finally:
        db.close()


def test_vendor_error_is_settled_to_zero(client, model):
    """Google bills only a 200: an HTTP error carries no tokens."""
    model.reply = LLMResponse(provider="vertex", model="fake", error="HTTP 503: unavailable")
    lid, headers = _login(client)
    sid, _ = _verse()
    assert client.get(f"/shlokas/{sid}/meaning", headers=headers).json()["source"] == "none"
    assert _gemini_spend(lid) == pytest.approx(0.0)


def test_meaning_404_for_unknown_verse(client, model):
    _, headers = _login(client)
    assert client.get("/shlokas/does-not-exist/meaning", headers=headers).status_code == 404


def test_meaning_requires_auth(client):
    assert client.get("/shlokas/anything/meaning").status_code == 401


# ── the Ask sheet ────────────────────────────────────────────────────────────

def test_ask_meaning_is_a_card_written_once_and_then_served_from_the_db(client, model):
    _, headers = _login(client)
    sid, text = _verse()

    d = _ask(client, headers, text, "What does this verse mean?").json()
    assert d["routed_to"] == "llm" and d["provider"] == "vertex:fake"
    card = d["card"]
    assert card["title"] == "Meaning"
    assert card["summary"] == STUDY["meaning_en"]
    assert card["sections"] == [{"heading": "The idea", "style": "bullets", "items": STUDY["idea_en"]}]
    assert [t["sa"] for t in card["terms"]] == ["सत्यम्"], "a non-Devanagari term is dropped"
    assert card["terms"][0]["iast"] == "satyam"
    assert STUDY["meaning_en"] in d["explanation"]
    # The same call filled the row the verse screen reads.
    assert _row(sid).translation_hi == STUDY["meaning_hi"]

    # A new process (empty memory cache), another learner, another wording.
    _cache.clear()
    _, other = _login(client)
    again = _ask(client, other, text, "what is the meaning of this shloka").json()
    assert again["card"]["summary"] == STUDY["meaning_en"]
    assert len(model.calls) == 1


def test_hindi_question_gets_the_hindi_card_from_the_same_study(client, model):
    _, headers = _login(client)
    _, text = _verse()
    _ask(client, headers, text, "What does this verse mean?")
    _cache.clear()
    d = _ask(client, headers, text, "इस श्लोक का अर्थ हिंदी में बताइए").json()
    assert d["card"]["title"] == "अर्थ"
    assert d["card"]["summary"] == STUDY["meaning_hi"]
    assert d["card"]["sections"][0]["heading"] == "भाव"
    assert len(model.calls) == 1, "one study serves both languages"


def test_hindi_meaning_question_is_not_sent_to_the_scansion_engine(client, model):
    """It used to be: the grammar word lists read only English."""
    _, headers = _login(client)
    _, text = _verse()
    d = _ask(client, headers, text, "इस श्लोक का अर्थ क्या है?").json()
    assert d["routed_to"] == "llm" and d["card"]["summary"] == STUDY["meaning_hi"]


def test_stored_translation_answers_the_meaning_question_for_free(client, model):
    _, headers = _login(client)
    _, text = _verse(en="Stored English.", breakdown=[{"word": "सत्यम्", "meaning": "truth", "features": []}])
    d = _ask(client, headers, text, "What does this verse mean?").json()
    assert d["card"]["summary"] == "Stored English."
    assert d["card"]["terms"] == [{"sa": "सत्यम्", "iast": "satyam", "meaning": "truth"}]
    assert model.calls == []


def test_other_question_is_answered_once_and_stored(client, model):
    model.reply = CARD
    _, headers = _login(client)
    _, text = _verse(en="Truth alone wins.")
    q = "Why does truth win?"

    d = _ask(client, headers, text, q).json()
    assert d["card"]["title"] == "Why truth wins" and d["card"]["summary"] == CARD["summary"]
    user = model.calls[0]["user"]
    assert "AUTHORED MEANING: Truth alone wins." in user
    assert user.rstrip().endswith("Write your entire answer in English.")

    _cache.clear()
    again = _ask(client, headers, text, "  why does truth WIN? ").json()
    assert again["card"]["summary"] == CARD["summary"]
    assert len(model.calls) == 1, "the same question, differently typed, is served from the DB"


def test_a_verse_the_app_does_not_hold_is_still_answered_and_stored(client, model):
    """It can be from anywhere: no shlokas row is needed."""
    _, headers = _login(client)
    text = f"उद्यमेन हि सिध्यन्ति कार्याणि {uuid.uuid4().hex[:6]}"
    d = _ask(client, headers, text, "What does this verse mean?", surface="home").json()
    assert d["card"]["summary"] == STUDY["meaning_en"]
    _cache.clear()
    _ask(client, headers, text, "What does this verse mean?", surface="home")
    assert len(model.calls) == 1
    db = SessionLocal()
    try:
        assert db.get(AskAnswer, verse_study.answer_key(text, verse_study.MEANING_Q, "en")) is not None
    finally:
        db.close()


def test_old_client_without_cards_gets_prose(client, model):
    _, headers = _login(client)
    _, text = _verse()
    d = _ask(client, headers, text, "What does this verse mean?", cards=False).json()
    assert d["card"] is None and STUDY["meaning_en"] in d["explanation"]


def test_grammar_and_rhythm_questions_stay_with_the_engines(client, model):
    _, headers = _login(client)
    line = "कर्मण्येवाधिकारस्ते मा फलेषु कदाचन"
    for q in ("What metre is this?", "rhythm?"):
        _cache.clear()
        d = _ask(client, headers, line, q).json()
        assert d["routed_to"] == "engine", q
    assert model.calls == []


def test_spent_gemini_budget_falls_back_without_calling_the_model(client, model, monkeypatch):
    lid, headers = _login(client)
    _, text = _verse()
    db = SessionLocal()
    try:
        from app.services.quota import spend_since
        spent = spend_since(db, settings.quota_window_hours, "gemini")
    finally:
        db.close()
    monkeypatch.setattr(settings, "gemini_daily_budget_inr", spent + 0.0001)
    r = _ask(client, headers, text, "What does this verse mean?")
    # No Gemini, no stored meaning and no Sarvam key in the suite: the old
    # path's honest 503, and above all no model call.
    assert r.status_code == 503, r.text
    assert model.calls == []
    assert _gemini_spend(lid) == pytest.approx(0.0)


def test_per_learner_gemini_allowance_holds(client, model, monkeypatch):
    lid, headers = _login(client)
    monkeypatch.setattr(settings, "quota_gemini_inr_per_day", 0.0001)
    sid, _ = _verse()
    assert client.get(f"/shlokas/{sid}/meaning", headers=headers).json()["source"] == "none"
    assert model.calls == []


def test_reservation_covers_the_worst_case(client, model):
    """What is reserved before the call is never less than the call can cost."""
    lid, headers = _login(client)
    sid, _ = _verse()
    client.get(f"/shlokas/{sid}/meaning", headers=headers)
    call = model.calls[0]
    reserve = gemini_cost_inr(len(call["system"]) + len(call["user"]), call["max_tokens"])
    assert call["max_tokens"] == settings.verse_study_max_tokens
    assert reserve >= gemini_cost_inr(400, 300)
    db = SessionLocal()
    try:
        rows = (db.query(UsageEvent).filter(UsageEvent.learner_id == lid, UsageEvent.kind == GEMINI_KIND)
                .order_by(UsageEvent.id).all())
        assert [r.source for r in rows] == ["live", "settle"]
        assert rows[0].amount == pytest.approx(reserve)
    finally:
        db.close()


# ── small pieces ─────────────────────────────────────────────────────────────

@pytest.mark.parametrize("q, expected", [
    ("What does this verse mean?", True),
    ("what is the meaning of this shloka", True),
    ("Translate it", True),
    ("इस श्लोक का अर्थ हिंदी में बताइए", True),
    ("इसका मतलब क्या है?", True),
    ("What does the word adhikara mean?", False),
    ("कर्मणि शब्द का अर्थ क्या है?", False),
    ("Why does Krishna say this?", False),
    ("", False),
])
def test_is_meaning_question(q, expected):
    assert verse_study.is_meaning_question(q) is expected


def test_slot_for():
    assert verse_study.slot_for("English") == "en"
    assert verse_study.slot_for("Hindi (हिन्दी script)") == "hi"
    assert verse_study.slot_for("Kannada (ಕನ್ನಡ script)") is None


def test_verse_subject_and_routing_rules():
    assert is_verse_subject("shloka", "धर्मो रक्षति रक्षितः")
    assert is_verse_subject("home", "धर्मो रक्षति रक्षितः")
    assert not is_verse_subject("grammar", "धर्मो रक्षति रक्षितः")
    assert not is_verse_subject("shloka", "कर्मण्येवाधिकारस्ते"), "one word is the engines' business"
    assert is_engine_question("What metre is this?")
    assert is_engine_question("rhythm?")
    assert is_engine_question("इसका छन्द क्या है?")
    assert not is_engine_question("What does this verse mean?")
    assert not is_engine_question("Why does truth win?")
    assert not is_engine_question("ಇದರ ಅರ್ಥ ಏನು?")


def test_answer_key_separates_language_and_question():
    a = verse_study.answer_key("verse", verse_study.MEANING_Q, "en")
    assert a != verse_study.answer_key("verse", verse_study.MEANING_Q, "hi")
    assert a != verse_study.answer_key("verse", "why?", "en")
    assert a == verse_study.answer_key(" verse ", verse_study.MEANING_Q, "en")


# ── the Vertex provider (services/vertex_live.py) ────────────────────────────

class _Resp:
    def __init__(self, status, body):
        self.status_code = status
        self._body = body
        self.text = json.dumps(body)

    def json(self):
        return self._body


class _Http:
    is_closed = False

    def __init__(self, resp):
        self.resp = resp
        self.posts = []

    async def post(self, url, headers=None, json=None):
        self.posts.append({"url": url, "headers": headers, "json": json})
        return self.resp


def _vertex(monkeypatch, resp):
    from app.evals.providers import build_provider
    from app.services import vertex_live

    monkeypatch.setattr(vertex_live, "credentials_info", lambda: {"type": "service_account"})
    monkeypatch.setattr(vertex_live, "_fetch_token", lambda info: "test-token")
    provider = build_provider("vertex:gemini-3.8-flash")
    provider._http = _Http(resp)
    return provider


def test_vertex_provider_sends_no_reasoning_and_counts_reasoning_as_output(monkeypatch):
    provider = _vertex(monkeypatch, _Resp(200, {
        "candidates": [{"finishReason": "STOP", "content": {"parts": [
            {"text": "working", "thought": True}, {"text": "{\"clear\": true}"}]}}],
        "usageMetadata": {"promptTokenCount": 52, "candidatesTokenCount": 90, "thoughtsTokenCount": 10},
    }))
    resp = asyncio.run(provider.complete("sys", "user", max_tokens=300, json_mode=True))
    assert resp.ok and resp.text == '{"clear": true}'
    assert (resp.prompt_tokens, resp.completion_tokens) == (52, 100)
    post = provider._http.posts[0]
    assert post["url"].endswith(
        f"/projects/{settings.vertex_project}/locations/{settings.vertex_location}"
        "/publishers/google/models/gemini-3.8-flash:generateContent")
    assert post["headers"] == {"Authorization": "Bearer test-token"}
    config = post["json"]["generationConfig"]
    assert config["thinkingConfig"] == {"thinkingBudget": 0}
    assert config["maxOutputTokens"] == 300 and config["responseMimeType"] == "application/json"


def test_vertex_provider_reports_an_http_error_with_no_tokens(monkeypatch):
    provider = _vertex(monkeypatch, _Resp(429, {"error": {"message": "quota"}}))
    resp = asyncio.run(provider.complete("sys", "user"))
    assert not resp.ok and resp.error.startswith("HTTP 429")
    assert (resp.prompt_tokens, resp.completion_tokens) == (0, 0)


def test_vertex_provider_is_unconfigured_without_a_key():
    """conftest blanks both the key file path and the JSON."""
    from app.evals.providers import build_provider

    provider = build_provider("vertex:gemini-3.8-flash")
    assert provider.configured is False
    resp = asyncio.run(provider.complete("sys", "user"))
    assert resp.error == "Vertex credentials not set"
    assert verse_study.available() is False
