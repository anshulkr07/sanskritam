"""Talk's Ask mode (routers/ask.py, services/ask_live.py, ask_sources.py).

Zero network calls: the model is a fake provider, pages come from a fake
download function, and the language classifier is switched off.
"""

import asyncio
import json
import random
import string
import uuid

import pytest

from app.config import settings
from app.db import SessionLocal
from app.evals.providers import LLMResponse
from app.models import AskAnswer, Shloka, UsageEvent
from app.routers.explain import _cache
from app.services import ask_live, ask_sources, lang_detect

GITA_2_47 = "कर्मण्येवाधिकारस्ते मा फलेषु कदाचन। मा कर्मफलहेतुर्भूर्मा ते सङ्गोऽस्त्वकर्मणि॥"
MADE_UP = "यदा यदा हि दुःखस्य ग्लानिर्भवति भारत। सुखमेव तदा नित्यं प्राप्नोति हृदये नरः॥"

ANSWER = {
    "title": "Dussehra puja vidhi",
    "title_sa": "विजयादशमी",
    "summary": "Dussehra marks the victory of good over evil; the puja is done in the afternoon.",
    "sections": [
        {"heading": "Samagri", "style": "bullets", "items": ["- Roli, rice, flowers", "**Lamp** and ghee"]},
        {"heading": "Steps", "style": "steps", "items": ["Bathe and wear clean clothes.", "Chant ॐ नमः शिवाय."]},
        {"heading": "Odd", "style": "weird", "items": ["x"]},
    ],
    "verses": [
        {"sa": GITA_2_47, "ref": "Bhagavad Gita 2.47", "meaning": "Your right is to the work alone.", "url": ""},
        {"sa": MADE_UP, "ref": "Bhagavad Gita 4.99", "meaning": "Made up.", "url": ""},
        {"sa": "not devanagari", "ref": "x", "meaning": "y", "url": ""},
    ],
    "terms": [{"sa": "शमी", "meaning": "the shami tree"}, {"sa": "shami", "meaning": "roman, dropped"}],
    "sources": [{"title": "A blog", "url": "https://someone.blogspot.com/dussehra"},
                {"title": "Drik", "url": "https://www.drikpanchang.com/festivals/dussehra/dussehra-date-time.html"}],
    "caution": "",
    "follow_ups": ["What is shami puja?", "Why burn Ravana?", "When is Diwali?", "extra"],
    "needs_birth": False,
}


class FakeProvider:
    configured = True
    label = "vertex:fake"

    def __init__(self, reply=None):
        self.reply = ANSWER if reply is None else reply
        self.calls = []

    async def complete(self, system, user, *, temperature=0.0, max_tokens=512, json_mode=False):
        self.calls.append({"system": system, "user": user})
        if isinstance(self.reply, Exception):
            raise self.reply
        return LLMResponse(text=json.dumps(self.reply, ensure_ascii=False),
                           prompt_tokens=900, completion_tokens=700, model="fake", provider="vertex")


@pytest.fixture(autouse=True)
def quiet(monkeypatch):
    """No classifier call and no page opened unless a test asks for it."""
    async def no_guess(self, text):
        return None
    monkeypatch.setattr(lang_detect.LanguageClassifier, "classify", no_guess)
    monkeypatch.setattr(settings, "ask_source_check_s", 0.0)
    ask_sources._pages.clear()
    ask_sources._robots.clear()
    _cache.clear()


@pytest.fixture
def model(monkeypatch):
    fake = FakeProvider()
    monkeypatch.setattr(ask_live, "_get_provider", lambda: fake)
    return fake


def _login(client):
    r = client.post("/auth/dev-login",
                    json={"display_name": f"ask-{uuid.uuid4().hex[:8]}", "bridge_langs": ["en", "hi"]})
    assert r.status_code == 200, r.text
    data = r.json()
    return data["learner"]["id"], {"Authorization": f"Bearer {data['token']}"}


def _word():
    return "".join(random.choice(string.ascii_lowercase) for _ in range(8))


# ── the card ──────────────────────────────────────────────────────────────

def test_clip_holds_the_shape():
    card = ask_live.clip(ANSWER)
    assert card["title_iast"]
    assert [s["style"] for s in card["sections"]] == ["bullets", "steps", "bullets"]
    assert card["sections"][0]["items"] == ["Roli, rice, flowers", "Lamp and ghee"]
    assert "ॐ नमः शिवाय" in card["sections"][1]["items"][1]
    assert len(card["verses"]) == 2 and all(v["iast"] for v in card["verses"])
    assert [t["sa"] for t in card["terms"]] == ["शमी"]
    assert len(card["follow_ups"]) == 3
    assert card["needs_birth"] is False
    flat = ask_live.flatten(card)
    assert "1. Bathe and wear clean clothes." in flat


def test_maths_survives_cleaning():
    card = ask_live.clip({"summary": "a*b is written a × b", "sections": [
        {"heading": "Sum", "style": "steps", "items": ["23 × 47 = 1081", "x² + 5x + 6 = 0"]}]})
    assert card["summary"] == "a*b is written a × b"
    assert card["sections"][0]["items"] == ["23 × 47 = 1081", "x² + 5x + 6 = 0"]


@pytest.mark.parametrize("q,ok", [
    ("What is the main teaching of the Gita?", True),
    ("Why do we light lamps on Diwali?", True),
    ("Dussehra ki puja vidhi batao", True),
    ("What is my nakshatra?", False),
    ("मेरी कुंडली में मंगल दोष है?", False),
    ("Born on 15 06 1990, what is my rashi", False),
    ("I feel sad, what does the Gita say?", False),
])
def test_only_questions_about_the_world_are_kept(q, ok):
    assert ask_live.shareable(q) is ok


# ── the checks ────────────────────────────────────────────────────────────

def _page_download(pages):
    def download(url):
        if url.endswith("/robots.txt"):
            return 404, "text/plain", b"", url
        body = pages.get(url)
        if body is None:
            return 404, "text/html", b"", url
        return 200, "text/html; charset=utf-8", body.encode("utf-8"), url
    return download


def test_a_verse_stands_only_when_a_trusted_page_carries_it():
    card = ask_live.clip(ANSWER)
    gita = "https://vedabase.io/en/library/bg/2/47/"
    drik = ANSWER["sources"][1]["url"]
    download = _page_download({
        gita: f"<html><body><p>{GITA_2_47}</p><p>translation</p></body></html>",
        drik: "<html><body>" + "Dussehra puja timing and vidhi. " * 20 + "</body></html>",
    })
    counts = ask_sources.check_card(card, budget_s=5, download=download)
    assert [v["ref"] for v in card["verses"]] == ["Bhagavad Gita 2.47"]
    assert card["verses"][0]["url"] == gita and card["verses"][0]["site"] == "Vedabase"
    # The blog is never opened; the almanac page opened and stays.
    assert [s["url"] for s in card["sources"]] == [drik]
    assert counts["verses_kept"] == 1 and counts["sources_kept"] == 1


def test_a_verse_the_app_holds_needs_no_page(client):
    db = SessionLocal()
    try:
        row = Shloka(id=uuid.uuid4().hex[:16], date="2020-01-02", source_ref="Bhagavad Gītā 2.47",
                     devanagari=GITA_2_47, iast="", word_breakdown=[])
        db.add(row)
        db.commit()
        card = ask_live.clip({"summary": "x", "verses": [
            {"sa": GITA_2_47, "ref": "", "meaning": "work alone", "url": ""}]})
        ask_sources.mark_stored(db, card)
        ask_sources.check_card(card, budget_s=0)
        assert len(card["verses"]) == 1
        # The seed may hold the same verse; any row that carries it will do.
        held = db.get(Shloka, card["verses"][0]["shloka_id"])
        assert held is not None and "कर्मण्येवाधिकारस्ते" in held.devanagari
        assert card["verses"][0]["ref"]
    finally:
        db.query(Shloka).filter(Shloka.date == "2020-01-02").delete()
        db.commit()
        db.close()


@pytest.mark.parametrize("ref,exact,whole,name", [
    ("Bhagavad Gita, Chapter 2, Verse 47", "/bg/2/47/", "sa_bhagavadgItA-comm.txt", "Bhagavad Gita"),
    ("श्रीमद्भागवत पुराण २.५.३४", "/sb/2/5/34/", "sa_bhAgavatapurANa.txt", "श्रीमद्भागवत पुराण"),
    ("Isha Upanishad 7", "/iso/7/", "sa_IzopaniSad-or-IzAvAsyopaniSadkANva-recension-comm.txt", "Isha Upanishad"),
    ("Rigveda Mandala 10, Sukta 191, Mantra 2", "", "sa_Rgveda-edAufrecht.txt", "Rigveda"),
    ("Yoga Sutra 1.2", "", "sa_pataJjali-yogasUtra.txt", "Yoga Sutra"),
    ("Devi Gita 3.12", "", "sa_devIgItA.txt", "Devi Gita"),
    ("Mahabharata 5.39.58", "", "mbh_05_u.htm", "Mahabharata"),
    ("Rāmāyaṇa, Sundara Kāṇḍa 5.1", "", "sa_rAmAyaNa.txt", "Rāmāyaṇa, Sundara Kāṇḍa"),
    ("Dharmasindhu", "", "", "Dharmasindhu"),
])
def test_references_route_to_pages_code_can_build(ref, exact, whole, name):
    pages = ask_sources.ref_urls(ref)
    assert (pages[0].endswith(exact) if exact else pages == [])
    lib = ask_sources.library_urls(ref)
    assert (lib[0][0].endswith(whole) if whole else lib == [])
    assert ask_sources.text_name(ref) == name


def test_a_verse_found_in_a_whole_text_loses_its_numbers():
    rv = "https://gretil.sub.uni-goettingen.de/gretil/corpustei/transformations/plaintext/sa_Rgveda-edAufrecht.txt"
    verse = "समानी व आकूतिः समाना हृदयानि वः। समानमस्तु वो मनो यथा वः सुसहासति॥"
    roman = "samānī va ākūtiḥ samānā hṛdayāni vaḥ / samānam astu vo mano yathā vaḥ susahāsati // RV_10,191.4"
    card = ask_live.clip({"summary": "x", "verses": [
        {"sa": verse, "ref": "Rigveda 10.191.4", "meaning": "one mind", "url": ""}]})
    ask_sources.check_card(card, budget_s=5, download=_page_download({rv: roman * 3}))
    assert len(card["verses"]) == 1
    assert card["verses"][0]["ref"] == "Rigveda"
    assert card["verses"][0]["url"].endswith("/html/sa_Rgveda-edAufrecht.htm")
    assert card["verses"][0]["site"] == "GRETIL, Göttingen"


def test_a_verse_with_a_roman_word_inside_is_dropped():
    card = ask_live.clip({"summary": "x", "verses": [
        {"sa": "दीर्घचतुरश्रस्याक्ष्णया रज्जुः पार्श्वमानी तिर्यङ् Broadway च", "ref": "Shulba", "meaning": "", "url": ""}]})
    assert card["verses"] == []


def test_a_short_quotation_stands_only_when_whole_on_the_page():
    ch = "https://gretil.sub.uni-goettingen.de/gretil/corpustei/transformations/plaintext/sa_chAndogyopaniSad-comm.txt"
    page = "śrutaṃ hy eva me bhagavaddṛśebhyas tarati śokam ātmavid iti / so 'haṃ bhagavaḥ śocāmi"
    good = ask_live.clip({"summary": "x", "verses": [
        {"sa": "तरति शोकमात्मवित्", "ref": "Chandogya Upanishad 7.1.3", "meaning": "", "url": ""}]})
    ask_sources.check_card(good, budget_s=5, download=_page_download({ch: page}))
    assert [v["ref"] for v in good["verses"]] == ["Chandogya Upanishad"]
    ask_sources._pages.clear()
    bad = ask_live.clip({"summary": "x", "verses": [
        {"sa": "तरति दुःखमात्मवित्", "ref": "Chandogya Upanishad 7.1.3", "meaning": "", "url": ""}]})
    ask_sources.check_card(bad, budget_s=5, download=_page_download({ch: page}))
    assert bad["verses"] == []


def test_with_no_time_to_check_unheld_verses_are_dropped():
    card = ask_live.clip(ANSWER)
    ask_sources.check_card(card, budget_s=0)
    assert card["verses"] == [] and card["sources"] == []
    assert card["summary"]


# ── the endpoint ──────────────────────────────────────────────────────────

def test_ask_answers_and_meters_gemini(client, model):
    learner_id, headers = _login(client)
    r = client.post("/ask/talk", json={"question": f"How is the {_word()} festival celebrated?", "lang": "en"},
                    headers=headers)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["routed_to"] == "llm" and d["lang"] == "en" and d["script"] == "latin"
    assert d["card"]["title"] == "Dussehra puja vidhi"
    assert "Bathe and wear clean clothes." in d["explanation"]
    assert d["needs"] == "" and d["chart"] is None
    assert "Write every field in English." in model.calls[0]["user"]
    db = SessionLocal()
    try:
        spent = sum(e.amount for e in db.query(UsageEvent).filter(
            UsageEvent.learner_id == learner_id, UsageEvent.kind == "gemini_inr").all())
    finally:
        db.close()
    assert spent > 0


def test_a_world_question_is_stored_and_served_again(client, model):
    _id, headers = _login(client)
    q = f"What does the {_word()} ritual mean?"
    first = client.post("/ask/talk", json={"question": q, "lang": "en"}, headers=headers).json()
    second = client.post("/ask/talk", json={"question": q.upper(), "lang": "en"}, headers=headers).json()
    assert first["routed_to"] == "llm"
    assert second["routed_to"] == "cache" and second["cached"] is True
    assert second["card"]["title"] == first["card"]["title"]
    assert len(model.calls) == 1


def test_a_personal_or_follow_up_question_is_never_stored(client, model):
    _id, headers = _login(client)
    tag = _word()
    client.post("/ask/talk", json={"question": f"I feel low about {tag}, what helps?", "lang": "en"}, headers=headers)
    client.post("/ask/talk", json={"question": f"And {tag} after that?", "lang": "en",
                                   "history": [{"q": "What is dharma?", "a": "Duty."}]}, headers=headers)
    db = SessionLocal()
    try:
        rows = db.query(AskAnswer).filter(AskAnswer.subject == "__ask__",
                                          AskAnswer.question.contains(tag)).count()
    finally:
        db.close()
    assert rows == 0
    assert "EARLIER IN THIS CONVERSATION" in model.calls[-1]["user"]
    assert "Q: What is dharma?" in model.calls[-1]["user"]


def test_a_hindi_question_is_answered_in_hindi(client, model):
    _id, headers = _login(client)
    r = client.post("/ask/talk", json={"question": "दशहरे की पूजा कैसे करें?"}, headers=headers)
    assert r.status_code == 200, r.text
    assert r.json()["lang"] == "hi"
    assert "Hindi" in model.calls[-1]["user"].splitlines()[-1]


def test_a_chart_question_without_birth_details_asks_for_them(client, monkeypatch):
    fake = FakeProvider({**ANSWER, "summary": "Share your birth details.", "needs_birth": True})
    monkeypatch.setattr(ask_live, "_get_provider", lambda: fake)
    _id, headers = _login(client)
    d = client.post("/ask/talk", json={"question": "What does my kundli say?", "lang": "en"},
                    headers=headers).json()
    assert d["needs"] == "birth"


def test_birth_details_bring_a_calculated_chart(client, model):
    _id, headers = _login(client)
    r = client.post("/ask/talk", json={
        "question": "What does my kundli say about my career?", "lang": "en",
        "birth": {"date": "1990-06-15", "time": "11:00", "lat": 28.6, "lon": 77.2,
                  "tz": "Asia/Kolkata", "label": "New Delhi"},
    }, headers=headers)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["chart"]["lagna"]["sign_en"] and len(d["chart"]["planets"]) == 9
    assert d["chart"]["dasha"]["maha"]["lord"]
    user = model.calls[-1]["user"]
    assert "CHART (calculated by the app" in user and "Lagna (ascendant):" in user
    # The birth details themselves are not in what the model is sent.
    assert "1990-06-15" not in user and "11:00" not in user


def test_bad_birth_details_are_refused(client, model):
    _id, headers = _login(client)
    r = client.post("/ask/talk", json={"question": "Read my chart", "lang": "en",
                                       "birth": {"date": "15/06/1990", "time": "11:00", "lat": 28.6, "lon": 77.2}},
                    headers=headers)
    assert r.status_code == 422


def test_without_gemini_the_sarvam_card_answers(client, monkeypatch):
    from app.services import explainer as expl_mod

    monkeypatch.setattr(ask_live, "available", lambda: False)

    async def old_card(self, question="", language="English", facts="", screen_text=""):
        return {"title": "Dharma", "title_sa": "धर्मः", "title_iast": "dharmaḥ",
                "summary": "Dharma is what holds things together.",
                "sections": [], "terms": [], "caution": ""}

    monkeypatch.setattr(expl_mod.Explainer, "answer_card", old_card)
    _id, headers = _login(client)
    d = client.post("/ask/talk", json={"question": f"What is {_word()} dharma?", "lang": "en"},
                    headers=headers).json()
    assert d["routed_to"] == "fallback"
    assert d["card"]["title"] == "Dharma" and d["card"]["verses"] == []


def test_the_ask_bubble_uses_the_same_explainer(client, model):
    _id, headers = _login(client)
    r = client.post("/explain", json={"surface": "general", "subject": "",
                                      "question": f"What is {_word()}?", "cards": True}, headers=headers)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["routed_to"] == "llm" and d["provider"] == "vertex:fake"
    assert d["card"]["title"] == "Dussehra puja vidhi"
    assert "follow_ups" in d["card"] and "verses" in d["card"]


# ── streaming (POST /ask/talk/stream) ──────────────────────────────────────

def _events(client, body, headers):
    out = []
    with client.stream("POST", "/ask/talk/stream", json=body, headers=headers) as r:
        assert r.status_code == 200, r.read()
        assert r.headers["content-type"].startswith("text/event-stream")
        for line in r.iter_lines():
            if line.startswith("data: "):
                out.append(json.loads(line[6:]))
    return out


class StreamingProvider(FakeProvider):
    """Writes the answer in small pieces, as Vertex's stream does."""

    async def stream(self, system, user, *, temperature=0.0, max_tokens=512, json_mode=False, usage=None):
        self.calls.append({"system": system, "user": user})
        text = json.dumps(self.reply, ensure_ascii=False)
        for i in range(0, len(text), 12):
            await asyncio.sleep(0.03)
            yield text[i:i + 12]
        if usage is not None:
            usage.update(prompt_tokens=900, output_tokens=700)


def test_the_stream_withholds_partial_cards_until_the_checked_answer(client, monkeypatch):
    fake = StreamingProvider()
    monkeypatch.setattr(ask_live, "_get_provider", lambda: fake)
    monkeypatch.setattr(ask_live, "_PARTIAL_EVERY_S", 0.0)
    _id, headers = _login(client)
    evs = _events(client, {"question": f"How is {_word()} kept?", "lang": "en"}, headers)
    kinds = [e["type"] for e in evs]
    assert kinds[-1] == "final" and kinds.count("final") == 1 and "partial" not in kinds
    partials = [e["card"] for e in evs if e["type"] == "partial"]
    # Unchecked verses and links never travel in a partial card.
    assert all("verses" not in c and "sources" not in c for c in partials)
    assert partials == []  # unchecked fragments are withheld by the launch router
    final = evs[-1]["response"]
    assert final["routed_to"] == "llm" and final["card"]["sections"]
    assert len(fake.calls) == 1


def test_the_stream_serves_a_stored_answer_in_one_event(client, model):
    _id, headers = _login(client)
    q = f"What is the {_word()} vrata?"
    client.post("/ask/talk", json={"question": q, "lang": "en"}, headers=headers)
    evs = _events(client, {"question": q, "lang": "en"}, headers)
    assert [e["type"] for e in evs] == ["final"]
    assert evs[0]["response"]["cached"] is True


def test_the_stream_reports_errors_as_events(client, monkeypatch):
    monkeypatch.setattr(ask_live, "available", lambda: False)
    from app.services import explainer as expl_mod

    async def nothing(self, question="", language="English", facts="", screen_text=""):
        return None

    monkeypatch.setattr(expl_mod.Explainer, "answer_card", nothing)
    _id, headers = _login(client)
    evs = _events(client, {"question": f"What is {_word()}?", "lang": "en"}, headers)
    assert evs[-1]["type"] == "error" and evs[-1]["status"] == 503


def test_a_bad_request_fails_before_the_stream_starts(client, model):
    _id, headers = _login(client)
    r = client.post("/ask/talk/stream", json={"question": "Read my chart", "lang": "en",
                                              "birth": {"date": "1990-13-40", "lat": 28.6, "lon": 77.2}},
                    headers=headers)
    assert r.status_code == 422


def test_every_prefix_of_an_answer_can_be_read():
    text = json.dumps(ANSWER, ensure_ascii=False)
    for i in range(2, len(text) + 1):
        assert ask_live.repair_json(text[:i]) is not None, text[:i]
    assert ask_live.repair_json(text) == ANSWER
    assert ask_live.repair_json('{"needs_birth": fal') == {"needs_birth": None}
    assert ask_live.repair_json('{"title": "Da') == {"title": "Da"}
    assert ask_live.repair_json('{"sections": [{"heading": "S", "ite') == {"sections": [{"heading": "S"}]}


# ── gun milan through the endpoint ────────────────────────────────────────

BOY = {"date": "1990-06-15", "time": "11:00", "lat": 28.6, "lon": 77.2, "tz": "Asia/Kolkata", "label": "New Delhi"}
GIRL = {"date": "1992-03-10", "time": "07:30", "lat": 28.6, "lon": 77.2, "tz": "Asia/Kolkata", "label": "New Delhi"}


def test_a_partner_brings_a_calculated_match(client, model):
    _id, headers = _login(client)
    d = client.post("/ask/talk", json={"question": "Do our kundlis match?", "lang": "en",
                                       "birth": BOY, "partner": GIRL, "asker_is": "boy"},
                    headers=headers).json()
    m = d["match"]
    assert len(m["kootas"]) == 8 and m["max"] == 36.0
    assert m["total"] == sum(k["points"] for k in m["kootas"])
    user = model.calls[-1]["user"]
    assert "MATCH (ashtakoota" in user and "the asker (boy)" in user
    # The asker as the girl turns the match round.
    d2 = client.post("/ask/talk", json={"question": "Do our kundlis match?", "lang": "en",
                                        "birth": GIRL, "partner": BOY, "asker_is": "girl"},
                     headers=headers).json()
    assert d2["match"]["kootas"] == m["kootas"]


def test_a_match_question_without_a_partner_asks_for_one(client, monkeypatch):
    fake = FakeProvider({**ANSWER, "summary": "Share both birth details.", "needs_partner": True})
    monkeypatch.setattr(ask_live, "_get_provider", lambda: fake)
    _id, headers = _login(client)
    d = client.post("/ask/talk", json={"question": "Will my marriage match be good?", "lang": "en",
                                       "birth": BOY}, headers=headers).json()
    assert d["needs"] == "partner" and d["match"] is None
