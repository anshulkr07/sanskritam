"""Which free Gemini model a question goes to first (services/ask_route.py).
The examples are questions from the 2026-10-10 test, with the search results
the test's retrieval gave them."""

from types import SimpleNamespace

import pytest

from app.config import settings
from app.services import ask_live
from app.services import ask_route as ar
from app.services import book_search as bs
from tests.test_ask_live import FakeProvider, _login, _word
from tests.test_book_search import book  # noqa: F401 — the fixture


def hit(sim=0.75, *why):
    return SimpleNamespace(similarity=sim, why=list(why) or ["meaning"])


STRONG = [hit(0.77, "meaning", "book"), hit(0.74, "meaning", "book"), hit(0.7, "meaning", "book")]
WEAK = [hit(0.62, "meaning"), hit(0.61, "meaning"), hit(0.6, "meaning")]


def lane(question, **kw):
    kw.setdefault("hits", STRONG)
    return ar.lane(question, **kw)


@pytest.mark.parametrize("question, kw", [
    ("What are the five kinds of vrittis in Patanjali's Yoga Sutra?", {"books_named": ["yogasutra"]}),
    ("What does Vidura say is the only fault of forgiving people?", {}),
    ("geeta mein krodh ke baare mein kya likha hai?", {"books_named": ["gita"]}),
    ("मन बहुत चंचल है, गीता में इसे वश में करने का क्या उपाय बताया है?", {"books_named": ["gita"]}),
    ("What does the Gita say about a person who stays the same in honour and dishonour?", {"books_named": ["gita"]}),
])
def test_a_plain_question_about_a_book_the_app_holds_is_simple(question, kw):
    r = lane(question, **kw)
    assert (r.lane, r.why) == (ar.SIMPLE, "plain")


@pytest.mark.parametrize("question, kw", [
    ("A learner wrote बालकाः पठति. Is it right? If not, correct it.", {"hits": WEAK}),
    ("Split the sandhi in 'karmaṇy evādhikāras te' and name each change.", {"hits": WEAK}),
    ("In Gita 2.47, what case and number is फलेषु?", {"hits": WEAK, "refs_asked": [(2, 47)], "books_named": ["gita"]}),
    ("'सत्यमेव जयते' का संधि-विच्छेद कीजिए और 'जयते' किस प्रकार का रूप है?", {"hits": WEAK}),
])
def test_a_grammar_question_is_simple_even_with_little_to_find_in_the_books(question, kw):
    assert lane(question, **kw) == ar.Route(ar.SIMPLE, "grammar")


@pytest.mark.parametrize("question, kw, why", [
    ("What does Bhagavad Gita 18.80 say?", {"refs_asked": [(18, 80)], "books_named": ["gita"]}, "verse reference asked"),
    ("Which Ramayana verse says 'janani janmabhumishcha swargadapi gariyasi'?", {}, "origin or truth of a claim asked"),
    ("Where in the Katha Upanishad does it say 'satyameva jayate'?", {}, "origin or truth of a claim asked"),
    ("Is 'śoka-sthāna-sahasrāṇi' from the Hitopadesha or the Mahabharata?", {}, "origin or truth of a claim asked"),
    ("Does the Bhagavad Gita prove that the atom was discovered in ancient India?", {}, "origin or truth of a claim asked"),
    ("sukhasya anantaram dukham wala shlok kahan se hai aur iska matlab kya hai?", {}, "origin or truth of a claim asked"),
    ("What does the Kena Upanishad say moves the mind?",
     {"books_named": ["kena"], "hits": [hit(0.7), hit(0.69), hit(0.69)]}, "book not held"),
    ("What will the weather be in Delhi tomorrow?", {"hits": [hit(0.56), hit(0.56), hit(0.55)]}, "weak evidence"),
    ("I failed my exam and I feel worthless. What do the texts say?", {"hits": WEAK}, "weak evidence"),
])
def test_the_risky_questions_are_careful(question, kw, why):
    r = lane(question, **kw)
    assert (r.lane, r.why) == (ar.CAREFUL, why)


def test_a_conversation_a_calendar_fact_or_a_chart_is_careful_whatever_the_question():
    q = "And what did Nachiketa choose when Yama tempted him?"
    assert lane(q, history=[("What does the Katha say?", "...")]).lane == ar.CAREFUL
    assert lane(q, facts="Next Ekadashi begins 21 Oct 2026").lane == ar.CAREFUL
    assert lane(q, chart="CHART ...").lane == ar.CAREFUL
    assert lane(q, match="MATCH ...").lane == ar.CAREFUL
    assert lane(q).lane == ar.SIMPLE


def test_quoted_words_are_evidence_without_a_similarity():
    assert lane("What does it mean?", hits=[hit(0.0, "sanskrit")]).lane == ar.SIMPLE
    assert lane("What does it mean?", hits=[hit(0.0, "ref")]).lane == ar.SIMPLE


def test_only_the_first_three_hits_count_as_evidence():
    assert lane("What is anger?", hits=WEAK + [hit(0.9)]).lane == ar.CAREFUL
    assert lane("What is anger?", hits=[]).lane == ar.CAREFUL


def test_without_a_book_search_everything_is_careful():
    r = lane("What are the five kinds of vrittis?", searched=False)
    assert (r.lane, r.why) == (ar.CAREFUL, "no book search")


# ── the route hands the lane to the model call ────────────────────────────

class TieredFake(FakeProvider):
    is_tiered = True

    def __init__(self):
        super().__init__()
        self.lanes = []

    def free_possible(self, private=False, lane=""):
        return True

    async def complete(self, system, user, *, temperature=0.0, max_tokens=512, json_mode=False,
                       paid=True, private=False, lane=""):
        self.lanes.append(lane)
        return await super().complete(system, user, temperature=temperature, max_tokens=max_tokens,
                                      json_mode=json_mode)


def test_the_ask_route_sends_each_question_down_its_lane(client, monkeypatch, book):  # noqa: F811
    fake = TieredFake()
    monkeypatch.setattr(ask_live, "_get_provider", lambda: fake)
    monkeypatch.setattr(settings, "ask_source_check_s", 0.0)
    _id, headers = _login(client)

    async def fake_search(db, question, **kw):
        return bs.Result(hits=[bs.Hit(verse=bs.index_for(db).verses[0], score=1.0, why=["meaning", "book"],
                                      similarity=0.75)], books_named=[], refs_asked=[])

    monkeypatch.setattr(bs, "search", fake_search)

    def ask(question):
        r = client.post("/ask/talk", json={"question": question, "lang": "en"}, headers=headers)
        assert r.status_code == 200, r.text

    monkeypatch.setattr(settings, "book_search_enabled", True)
    ask(f"What is {_word()}?")
    ask(f"Where does the verse about {_word()} occur?")
    assert fake.lanes == [ar.SIMPLE, ar.CAREFUL]

    monkeypatch.setattr(settings, "book_search_enabled", False)
    ask(f"What is {_word()}?")
    assert fake.lanes[-1] == ar.CAREFUL, "the test behind the lanes had book search on"
