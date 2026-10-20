"""Ask's book search (services/book_search.py) and its hand-off to ask_live.

No network: the question's vector comes from a fake embedder, and the
verses' vectors are written straight into verse_vectors.
"""

import asyncio
import uuid

import numpy as np
import pytest

from app.config import settings
from app.db import SessionLocal
from app.models import CanonText, Shloka, VerseVector
from app.services import ask_live
from app.services import book_search as bs
from app.services.iast import to_iast

DIMS = settings.book_search_dims
SLUG = "testbook"
TITLE = "Testabodha Sūtra"

# Three verses of a made-up book, each tied to one axis of the vector space.
VERSES = [
    ("1.1", "अथ परीक्षाशास्त्रानुशासनम्", "Now begins the teaching of tests.", 0),
    ("1.2", "क्रोधो नाशयति बुद्धिं सर्वदा", "Anger always destroys the understanding.", 1),
    ("2.1", "मित्रं विपत्सु जानीयात् परीक्षया", "Know a friend in misfortune, by testing.", 2),
]


def _vec(axis: int) -> bytes:
    v = np.zeros(DIMS, dtype="<f4")
    v[axis] = 1.0
    return v.tobytes()


@pytest.fixture(scope="module")
def book(client):  # noqa: ARG001 — the client fixture creates and seeds the database
    """The made-up book, removed again afterwards: the database is shared by
    the whole session, and other tests count or check every shloka."""
    db = SessionLocal()
    ids = {}
    try:
        db.add(CanonText(slug=SLUG, title_en=TITLE, title_sa="परीक्षाबोधसूत्रम्",
                         ref_prefixes=[TITLE], tier="plus"))
        for ref, deva, en, axis in VERSES:
            row = Shloka(id=uuid.uuid4().hex[:16], date="2099-01-01", source_ref=f"{TITLE} {ref}",
                         devanagari=deva, iast=to_iast(deva), translation_en=en, book=SLUG, in_daily=False)
            db.add(row)
            db.flush()
            ids[ref] = row.id
            db.add(VerseVector(shloka_id=row.id, model=settings.book_search_embed_model, dims=DIMS,
                               text_hash="x", vec=_vec(axis)))
        db.commit()
        bs.reset_cache()
        yield ids
    finally:
        db.query(VerseVector).filter(VerseVector.shloka_id.in_(list(ids.values()))).delete(synchronize_session=False)
        db.query(Shloka).filter(Shloka.id.in_(list(ids.values()))).delete(synchronize_session=False)
        db.query(CanonText).filter_by(slug=SLUG).delete(synchronize_session=False)
        db.commit()
        db.close()
        bs.reset_cache()


def _fake_embed(axis: int):
    async def embed(question):
        v = [0.0] * DIMS
        v[axis] = 1.0
        return bs.Embedded(vectors=[v], tokens=7, chars=len(question))
    return embed


def _search(question, axis=0, k=3):
    db = SessionLocal()
    try:
        return asyncio.run(bs.search(db, question, k=k, embed_question=_fake_embed(axis)))
    finally:
        db.close()


# ── spelling ──────────────────────────────────────────────────────────────

@pytest.mark.parametrize("a,b", [
    ("कर्मण्येवाधिकारस्ते मा फलेषु", "karmany evadhikaras te ma phalesu"),
    ("karmaṇy evādhikāras te", "karmany evadhikaras te"),
    ("Krishna", "kṛṣṇa"),
    ("Geeta", "गीता"),
    ("namaḥ", "namah"),
    ("jñāna", "gyana"),
])
def test_spellings_of_one_word_meet(a, b):
    assert bs.fold(a).replace(" ", "") == bs.fold(b).replace(" ", "")


def test_verse_numbers_in_any_form():
    assert bs.asked_refs("Gita 2.47, गीता २.४७ and BG 2:13") == [(2, 47), (2, 13)]
    assert bs.asked_refs("chapter 3 verse 5 of the Gita") == [(3, 5)]
    assert bs.asked_refs("Katha 1.2.23") == [(1, 2, 23)]
    assert bs.asked_refs("what is dharma?") == []


# ── search ────────────────────────────────────────────────────────────────

def test_reference_fetches_the_verse_first(book):
    r = _search(f"Explain {TITLE} 1.2 in Hindi", axis=2)
    assert SLUG in r.books_named and (1, 2) in r.refs_asked
    assert r.hits[0].verse.shloka_id == book["1.2"]
    assert "ref" in r.hits[0].why


def test_loose_roman_quotation_finds_the_verse(book):
    r = _search("I heard krodho nashayati buddhim sarvada somewhere, where is it from?", axis=0)
    assert r.hits[0].verse.shloka_id == book["1.2"]
    assert "sanskrit" in r.hits[0].why


def test_meaning_finds_a_verse_with_no_shared_words(book):
    r = _search("how to recognise a true friend", axis=2)
    assert r.hits[0].verse.shloka_id == book["2.1"]
    assert "meaning" in r.hits[0].why


def test_a_failed_embedding_leaves_the_other_searches(book):
    async def broken(question):
        raise RuntimeError("down")

    db = SessionLocal()
    try:
        r = asyncio.run(bs.search(db, f"{TITLE} 2.1", embed_question=broken))
    finally:
        db.close()
    assert r.error.startswith("RuntimeError")
    assert r.hits[0].verse.shloka_id == book["2.1"]


def test_a_half_verse_merges_but_two_verses_sharing_a_reference_both_stay(book):
    """Rāmāyaṇa 1.2.14 once held two different verses: the curse and another. A
    seeded half-verse beside its whole verse is still shown once."""
    whole = "यदेव भवति सत्यं तदेव जयते लोके नानृतं सत्येन पन्था विततो देवयानः"
    half = "यदेव भवति सत्यं तदेव जयते लोके"
    other = "अन्यदेव किमपि वाक्यं परीक्षाशास्त्रे पठ्यते नित्यम्"
    db = SessionLocal()
    ids = []
    try:
        for deva in (whole, half, other):
            row = Shloka(id=uuid.uuid4().hex[:16], date="2099-01-01", source_ref=f"{TITLE} 3.1",
                         devanagari=deva, iast=to_iast(deva), book=SLUG, in_daily=False)
            db.add(row)
            ids.append(row.id)
        db.commit()
        bs.reset_cache()
        hits = _search(f"{TITLE} 3.1", k=6).hits
        texts = [h.verse.devanagari for h in hits if h.verse.ref.endswith(" 3.1")]
        assert sorted(texts) == sorted([whole, other])
    finally:
        db.query(Shloka).filter(Shloka.id.in_(ids)).delete(synchronize_session=False)
        db.commit()
        db.close()
        bs.reset_cache()


def test_a_name_inside_a_longer_name_is_not_a_second_book(book):
    db = SessionLocal()
    try:
        idx = bs.index_for(db)
    finally:
        db.close()
    named = bs.books_named(idx, "Ashtavakra Gita 1.1")
    assert "ashtavakra" in named and "gita" not in named


# ── what the model is given ───────────────────────────────────────────────

def test_block_numbers_the_verses_and_cited_maps_back(book):
    r = _search(f"{TITLE} 1.2", axis=1)
    block = bs.books_block(r.hits)
    assert block.startswith("FROM THE APP'S BOOKS")
    assert "[B1] " + TITLE + " 1.2" in block and "Anger always destroys" in block
    assert bs.cited(r.hits, "B1").shloka_id == book["1.2"]
    assert bs.cited(r.hits, "B9") is None and bs.cited(r.hits, "x") is None


def test_rules_and_block_reach_the_model_only_with_verses():
    from app.services.ai_safety import SAFETY_INSTRUCTIONS
    assert ask_live.system_prompt("") == SAFETY_INSTRUCTIONS + ask_live.SYSTEM_PROMPT
    assert ask_live.system_prompt("FROM THE APP'S BOOKS ...").startswith(SAFETY_INSTRUCTIONS)
    assert ask_live.system_prompt("FROM THE APP'S BOOKS ...").endswith(ask_live.BOOKS_RULES)
    msg = ask_live.user_message("What is anger?", "English", books="FROM THE APP'S BOOKS\n[B1] X 1.1")
    assert msg.index("[B1] X 1.1") < msg.index("Learner asks: What is anger?")
    assert "FROM THE APP'S BOOKS" not in ask_live.user_message("What is anger?", "English")


def test_clip_keeps_the_book_id_of_a_verse():
    card = ask_live.clip({
        "kind": "verses", "title": "Anger", "summary": "s",
        "verses": [
            {"id": "b1", "sa": "क्रोधो नाशयति बुद्धिं सर्वदा", "ref": "Testabodha Sūtra 1.2", "meaning": "m"},
            {"id": "G999", "sa": "मित्रं विपत्सु जानीयात्", "ref": "X 1", "meaning": "m"},
        ],
    })
    assert card["verses"][0]["id"] == "B1"
    assert "id" not in card["verses"][1]


def test_a_cited_verse_takes_the_apps_reference_and_loses_its_id(book):
    r = _search(f"{TITLE} 1.2", axis=1)
    card = {"verses": [
        {"id": "B1", "sa": "क्रोधो नाशयति बुद्धिं सर्वदा", "ref": "Testabodha Sūtra 1.4"},   # number off
        {"id": "B1", "sa": "मित्रं विपत्सु जानीयात्", "ref": "Elsewhere 2"},                    # other verse
        {"id": "B9", "sa": "क्रोधो नाशयति बुद्धिं सर्वदा", "ref": "Testabodha Sūtra 1.9"},     # no such id
        {"sa": "क्रोधो नाशयति बुद्धिं सर्वदा", "ref": "Testabodha Sūtra 1.2"},                   # no id
    ]}
    assert bs.restore_refs(card, r.hits) == 1
    assert card["verses"][0]["ref"] == f"{TITLE} 1.2"
    assert card["verses"][1]["ref"] == "Elsewhere 2" and card["verses"][2]["ref"] == "Testabodha Sūtra 1.9"
    assert all("id" not in v for v in card["verses"])


# ── the Ask route ─────────────────────────────────────────────────────────

def test_ask_hands_the_found_verses_to_the_model_when_the_flag_is_on(client, monkeypatch, book):
    from app.services import ask_sources as asrc
    from tests.test_ask_live import FakeProvider, _login, _word

    fake = FakeProvider()
    monkeypatch.setattr(ask_live, "_get_provider", lambda: fake)
    monkeypatch.setattr(settings, "ask_source_check_s", 0.0)
    asrc._pages.clear()
    _id, headers = _login(client)

    async def fake_search(db, question, **kw):
        return bs.Result(hits=[bs.Hit(verse=bs.index_for(db).verses[0], score=1.0)], books_named=[], refs_asked=[])

    monkeypatch.setattr(bs, "search", fake_search)

    monkeypatch.setattr(settings, "book_search_enabled", False)
    client.post("/ask/talk", json={"question": f"What is {_word()}?", "lang": "en"}, headers=headers)
    assert "FROM THE APP'S BOOKS" not in fake.calls[-1]["user"]

    monkeypatch.setattr(settings, "book_search_enabled", True)
    r = client.post("/ask/talk", json={"question": f"What is {_word()}?", "lang": "en"}, headers=headers)
    assert r.status_code == 200
    assert "FROM THE APP'S BOOKS" in fake.calls[-1]["user"]
    assert fake.calls[-1]["system"].endswith(ask_live.BOOKS_RULES)


def test_a_failing_search_never_blocks_an_answer(client, monkeypatch):
    from tests.test_ask_live import FakeProvider, _login, _word

    fake = FakeProvider()
    monkeypatch.setattr(ask_live, "_get_provider", lambda: fake)
    monkeypatch.setattr(settings, "ask_source_check_s", 0.0)
    monkeypatch.setattr(settings, "book_search_enabled", True)
    _id, headers = _login(client)

    async def broken(db, question, **kw):
        raise RuntimeError("index unavailable")

    monkeypatch.setattr(bs, "search", broken)
    r = client.post("/ask/talk", json={"question": f"What is {_word()}?", "lang": "en"}, headers=headers)
    assert r.status_code == 200 and r.json()["routed_to"] == "llm"
    assert "FROM THE APP'S BOOKS" not in fake.calls[-1]["user"]
