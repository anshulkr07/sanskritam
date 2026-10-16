"""The daily-content pipeline (services/daily_content.py) and its endpoints.

No network: Vertex is a stand-in that answers from a script, and the web is a
dictionary of made-up pages. The words, stems and pages are test data in the
shape of the real thing; the verses are ones the app already seeds.
"""

from __future__ import annotations

import json
import re

import pytest

from app.config import settings
from app.db import SessionLocal
from app.models import ContentJob, ContentRejection, FactCard, WordOrigin, WordRoute
from app.services import daily_content as svc
from app.services import page_check as pc

ADMIN = {"X-Admin-Token": "test-admin"}
DAY = "2031-03-01"  # far from every date a batch file holds


# ─── Stand-ins ──────────────────────────────────────────────────────────────

class FakeVertex:
    """Answers a batch job from a script: {"propose": {key: text}, "cite": fn,
    "judge": fn}. A function is given each request's text."""

    prefix = "sanskritam-word-origins"

    def __init__(self, propose: dict, cite, judge=None):
        self.script = {"propose": propose, "cite": cite, "judge": judge or _word_judge}
        self.uploads: dict[str, list[dict]] = {}
        self.state = "JOB_STATE_SUCCEEDED"
        self.fail_create = False

    def upload_input(self, obj, text):
        step = obj.split("/")[-2]
        self.uploads[step] = [json.loads(line) for line in text.splitlines() if line.strip()]
        return {"name": obj}

    def create_job(self, run_id, step, obj):
        if self.fail_create:
            raise RuntimeError("create job failed HTTP 403")
        return {"name": f"jobs/{run_id}/{step}"}

    def get_job(self, name):
        return {"name": name, "state": self.state}

    def collect_predictions(self, vjob):
        step = vjob["name"].rsplit("/", 1)[1]
        answers = self.script[step]
        if callable(answers):
            answers = {line["key"]: answers(line["request"]["contents"][0]["parts"][0]["text"])
                       for line in self.uploads[step]}
        return {k: {"text": v, "status": "ok", "prompt_tokens": 10, "candidates_tokens": 20,
                    "thoughts_tokens": 5} for k, v in answers.items()}

    def user_text(self, step, key):
        line = next(x for x in self.uploads[step] if x["key"] == key)
        return line["request"]["contents"][0]["parts"][0]["text"]


def _web(pages: dict):
    calls: list[str] = []

    def download(url):
        calls.append(url)
        if url.endswith("/robots.txt"):
            return 404, "text/plain", b"", url
        if url in pages:
            return 200, "text/html; charset=utf-8", pages[url].encode("utf-8"), url
        return 404, "text/html", b"", url

    return pc.PageFetcher(download=download, sleep=lambda s: None), calls


def _pages(*urls):
    return json.dumps({"pages": [{"url": u, "site": "x", "says": "x", "sanskrit_as_printed": ""} for u in urls]})


@pytest.fixture()
def db(client):
    session = SessionLocal()
    yield session
    session.close()


@pytest.fixture(autouse=True)
def _leave_nothing_behind(client, monkeypatch):
    # The real kosha takes seconds to load; the gate is the same with a small one.
    monkeypatch.setattr(svc, "_kosha_stems", lambda: {"kalApa", "SarkarA", "mAtf"})
    # Tests start runs back to back; the rest between runs has its own test.
    monkeypatch.setattr(svc, "MIN_GAP_S", 0)
    monkeypatch.setattr(svc, "EMPTY_GAP_S", 0)
    yield
    s = SessionLocal()
    try:
        s.query(WordRoute).filter(WordRoute.checked_by == "page").delete(synchronize_session=False)
        s.query(WordOrigin).filter(WordOrigin.batch == "auto").delete(synchronize_session=False)
        s.query(FactCard).delete(synchronize_session=False)
        s.query(ContentJob).delete(synchronize_session=False)
        s.query(ContentRejection).delete(synchronize_session=False)
        s.commit()
    finally:
        s.close()


def _only(monkeypatch, kind):
    """Run one kind: the other is told it is fully stocked."""
    monkeypatch.setattr(settings, "content_words_stock_days", 10 ** 6 if kind == "words" else 0)
    monkeypatch.setattr(settings, "content_facts_stock_days", 10 ** 6 if kind == "facts" else 0)


def _auth(client, name):
    r = client.post("/auth/dev-login", json={"display_name": name, "bridge_langs": ["en"]})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


# ─── Words, end to end ──────────────────────────────────────────────────────

def _word(word, sanskrit, route=(), **kw):
    base = {"word": word, "roman": "", "gloss": "a test thing", "sanskrit": sanskrit,
            "sanskrit_gloss": "test bundle", "route": list(route), "confidence": "certain"}
    base.update(kw)
    return base


WORD_PROPOSALS = {
    "w-de": json.dumps([
        # Joins a hand-checked Sanskrit word; found through the address the
        # code knows, with no page from the model. One claimed stop is not
        # on the page, so no stops are shown.
        _word("Zuckertest", "śarkarā", [{"lang": "Persian", "form": "shakar"},
                                        {"lang": "Arabic", "form": "sukkar"}]),
        # The page prints the stem beside "aind." in a list of relatives, with
        # no word that code can read as "akin to": only the judge catches it.
        _word("Mutterprobe", "mātṛ"),
    ]),
    "w-fr": json.dumps([
        _word("calape", "kalāpa", [{"lang": "Arabic", "form": "qalab"}]),
        _word("mèretest", "mātṛ"),          # the page only calls it a relative
        _word("wikimot", "kalāpa"),         # the model names only Wikipedia
        _word("motmort", "kalāpa"),         # its page cannot be opened
        _word("inventé", "blorpa"),         # no such stem in the kosha
        _word("deux mots", "kalāpa"),       # not one word
    ]),
    "w-open": json.dumps([
        _word("kalapu", "kalāpa", language="Testish", lang_code="tst"),
        _word("sanslangue", "kalāpa"),      # the open request must name the language
    ]),
}

WORD_PAGES = {
    "https://www.dwds.de/wb/etymwb/Zuckertest":
        "<p>Zuckertest m. Entlehnt über arab. sukkar, dieses aus aind. śárkarā 'Grieß'.</p>",
    "https://www.dwds.de/wb/etymwb/Mutterprobe":
        "<p>Mutterprobe f. ahd. muoter (8. Jh.) führt mit aind. mātṛ́-, griech. mḗtēr auf ie. *mātér-.</p>",
    "https://www.cnrtl.fr/etymologie/calape":
        "<p>calape, subst. Empr. à l'ar. qalab, lui-même du sanskrit kalāpa « faisceau ».</p>",
    "https://www.cnrtl.fr/etymologie/meretest":
        "<p>mèretest. Du lat. mater, apparenté au sanskrit mātṛ.</p>",
    "https://dict.example.edu/kalapu":
        "<p>kalapu n. Perhaps from Sanskrit kalāpa.</p>",
}


def _word_cite(user_text: str) -> str:
    word = re.search(r"Word: (\S+) \(", user_text).group(1)
    return {
        "Zuckertest": _pages(),
        "Mutterprobe": _pages(),
        "calape": _pages("https://en.wikipedia.org/wiki/Calape", "https://www.cnrtl.fr/etymologie/calape"),
        "mèretest": _pages("https://www.cnrtl.fr/etymologie/meretest"),
        "wikimot": _pages("https://fr.wikipedia.org/wiki/Wikimot", "https://fr.wiktionary.org/wiki/wikimot"),
        "motmort": _pages("https://www.cnrtl.fr/etymologie/motmort"),
        "kalapu": _pages("https://dict.example.edu/kalapu"),
    }[word]


def _word_judge(user_text: str) -> str:
    word = re.search(r"Word: (\S+) \(", user_text).group(1)
    if word == "Mutterprobe":
        return json.dumps({"verdict": "relative", "hedged": False})
    return json.dumps({"verdict": "source", "hedged": False})


def _run_words(db, monkeypatch):
    _only(monkeypatch, "words")
    vertex = FakeVertex(WORD_PROPOSALS, _word_cite)
    fetcher, calls = _web(WORD_PAGES)
    first = svc.tick(db, vertex=vertex, fetcher=fetcher, today=DAY)
    second = svc.tick(db, vertex=vertex, fetcher=fetcher, today=DAY)
    return vertex, calls, first, second


def test_words_run_end_to_end(db, monkeypatch):
    vertex, calls, first, second = _run_words(db, monkeypatch)

    assert first["facts"]["state"] == "stocked"
    assert first["words"]["state"] == "submitted"
    # Eight languages in turn and one open request.
    assert first["words"]["requests"] == svc.LANGS_PER_RUN + 1
    assert second["words"] == {"state": "done", "run": first["words"]["run"], "confirmed": 3, "of": 7}

    job = db.query(ContentJob).one()
    assert job.stage == "done" and job.active_key is None
    assert job.stats["dropped"] == {"stem_not_in_kosha": 1, "bad_word": 1, "no_language": 1}
    assert job.stats["verdicts"] == {"page_ok": 4, "confirmed": 3, "judged_relative": 1,
                                     "cognate_only": 1, "no_trusted_page": 1, "cannot_open": 1}
    assert job.stats["stored"] == {"new_route": 2, "new_origin": 1}
    assert job.stats["propose_tokens"]["answered"] == 3
    # The passages held for the judge are gone once the run ends.
    assert job.payload == {}

    # Only candidates that passed the stem gate cost a page request, and only
    # those a page carries cost a judgement.
    assert len(vertex.uploads["cite"]) == 7
    assert sorted(line["key"] for line in vertex.uploads["judge"]) == ["i000", "i001", "i002", "i006"]
    # Wikipedia was named and never opened.
    assert not any("wiki" in u for u in calls)


def test_a_new_word_becomes_a_card_with_its_page(db, monkeypatch):
    _run_words(db, monkeypatch)

    origin = db.query(WordOrigin).filter(WordOrigin.batch == "auto").one()
    assert origin.mw_key == "kalApa" and origin.id == "kalapa"
    assert origin.scheduled_date == DAY and origin.status == "approved"
    # Devanagari and roman are lipi's, not the model's.
    dev, iast = svc.sanskrit_forms("kalApa")
    assert (origin.sanskrit_dev, origin.sanskrit_iast) == (dev, iast)

    routes = db.query(WordRoute).filter(WordRoute.origin_id == origin.id).order_by(WordRoute.rank).all()
    assert [(r.lang, r.word, r.rank) for r in routes] == [("fr", "calape", 0), ("tst", "kalapu", 1)]
    fr, tst = routes
    assert fr.checked_by == "page" and fr.checked_on == DAY and fr.kind == "loan"
    assert fr.source_url == "https://www.cnrtl.fr/etymologie/calape"
    assert fr.source_site == "Trésor de la langue française (CNRTL)"
    # The page prints the stop, so the stop is shown.
    assert fr.hops == [{"lang": "Arabic", "form": "qalab"}] and fr.confidence == "certain"
    # "Perhaps from Sanskrit" on the page makes the card say probably.
    assert tst.confidence == "probable" and tst.lang_name == "Testish"
    assert tst.source_site == "dict.example.edu"


def test_a_word_in_a_new_language_joins_the_sanskrit_word_it_goes_back_to(db, monkeypatch):
    _run_words(db, monkeypatch)
    route = db.query(WordRoute).filter(WordRoute.word == "Zuckertest").one()
    assert route.origin_id == "sharkara"  # the hand-checked origin, not a second one
    assert route.source_url == "https://www.dwds.de/wb/etymwb/Zuckertest"
    # "shakar" is not on the page, so none of the claimed stops is shown.
    assert route.hops == []
    assert db.query(WordOrigin).filter(WordOrigin.mw_key == "SarkarA").count() == 1


def test_what_fails_the_check_is_remembered_and_what_could_not_be_read_is_not(db, monkeypatch):
    _run_words(db, monkeypatch)
    rows = {(r.lang, r.key): r.reason for r in db.query(ContentRejection).all()}
    assert rows == {("fr", "mèretest"): "cognate_only", ("fr", "wikimot"): "no_trusted_page",
                    ("de", "mutterprobe"): "judged_relative"}
    # Turned-down words are named in the next request for that language.
    taken = svc.taken_words(db)
    assert {"mèretest", "wikimot", "calape"} <= taken["fr"]
    assert "motmort" not in taken["fr"]
    assert "mango" in taken["en"]  # from the hand-made rejected.json


def test_the_api_shows_a_pipeline_word_with_its_page_and_no_dictionary_it_did_not_read(client, db, monkeypatch):
    _run_words(db, monkeypatch)
    import app.services.localtime as lt

    monkeypatch.setattr(lt, "local_date", lambda tz=None: DAY)
    h = _auth(client, "dailyword")
    body = client.get("/word-origins/today", headers=h).json()
    assert body["available"] is True and body["origin"]["id"] == "kalapa"
    assert body["headline_route_id"] == "kalapa.fr.calape"
    fr, tst = body["origin"]["routes"]
    assert fr["relation"] == "travelled" and tst["relation"] == "traced"
    assert fr["source_url"] == "https://www.cnrtl.fr/etymologie/calape"
    sources = body["origin"]["sources"]
    assert [s["url"] for s in sources] == [
        "https://www.cnrtl.fr/etymologie/calape", "https://dict.example.edu/kalapu"]
    assert not any(s["key"] == "mw" for s in sources)

    # A hand-checked word keeps Monier-Williams and gains the new page.
    hand = client.get("/word-origins/sharkara", headers=h).json()
    keys = [s["key"] for s in hand["sources"]]
    assert keys[0] == "mw" and "page:sharkara.de.zuckertest" in keys
    new = next(r for r in hand["routes"] if r["word"] == "Zuckertest")
    assert new["relation"] == "traced"


def test_prompts_name_the_language_and_what_to_avoid(db, monkeypatch):
    vertex, _calls, _first, _second = _run_words(db, monkeypatch)
    en = vertex.user_text("propose", "w-en")
    assert en.startswith("List 12 English words that go back to a Sanskrit word")
    assert "Do not use these words:" in en and "mango" in en and "sugar" in en
    assert "Indo-Aryan" not in en
    assert "or by descent from it within the Indo-Aryan family" in vertex.user_text("propose", "w-hi")
    assert "languages other than these: English, Hindi, German" in vertex.user_text("propose", "w-open")
    cite = vertex.user_text("cite", "i002")
    assert cite.startswith('Word: calape (French), meaning "a test thing".')
    assert "Never Wikipedia" in cite
    judge = vertex.user_text("judge", "i002")
    assert judge.startswith("Word: calape (French)\nSanskrit word: kalāpa\n\nPassage from cnrtl.fr:")
    assert "lui-même du sanskrit kalāpa" in judge and "does not come from it" in judge
    # Batch lines ask for JSON at temperature 0.
    config = vertex.uploads["propose"][0]["request"]["generationConfig"]
    assert config["responseMimeType"] == "application/json" and config["temperature"] == 0


def test_languages_come_round_in_turn(db, monkeypatch):
    _only(monkeypatch, "words")
    seen = []
    for _ in range(2):
        vertex = FakeVertex({}, lambda text: _pages())
        fetcher, _ = _web({})
        svc.tick(db, vertex=vertex, fetcher=fetcher, today=DAY)
        seen.append([line["key"] for line in vertex.uploads["propose"]])
        svc.tick(db, vertex=vertex, fetcher=fetcher, today=DAY)  # nothing proposed: the run ends
    assert seen[0][:3] == ["w-en", "w-hi", "w-de"] and seen[0][-1] == "w-open"
    assert not set(seen[0][:-1]) & set(seen[1][:-1])
    assert db.query(ContentJob).filter(ContentJob.stage == "done").count() == 2


# ─── Facts, end to end ──────────────────────────────────────────────────────

def _verses():
    from app.seeds.shlokas import SEED_SLOKAS

    return [s["devanagari"] for s in SEED_SLOKAS if len(s["devanagari"]) > 60][:3]


def _fact(ref, devanagari, **kw):
    base = {"text": "Test-gītā", "ref": ref, "devanagari": devanagari,
            "translation": "A plain rendering made for this test.",
            "fact": "The text names a test fact — plainly.",
            "explanation": "It says so in one line. That is why it is of interest.",
            "claim_kind": "the text says this"}
    base.update(kw)
    return base


def _run_facts(db, monkeypatch):
    from app.services.iast import to_iast

    a, b, c = _verses()
    _only(monkeypatch, "facts")
    lifted = "these eight words stand on the page itself verbatim"
    proposals = {"f-0": json.dumps([
        _fact("1.1", a),
        _fact("1.2", b, translation=f"It says that {lifted}, more or less."),
        _fact("1.3", c, claim_kind="modern interpretation"),
        _fact("1.4", "", fact="No passage at all."),
        _fact("1.5", a, claim_kind="I am sure"),
    ])}
    page = f"<h1>Test-gītā</h1><p>{to_iast(a)} || 1.1 ||</p><p>{to_iast(b)} || 1.2 ||</p><p>{lifted}</p>"
    url = "http://gretil.sub.uni-goettingen.de/gretil/test.htm"
    vertex = FakeVertex(proposals, lambda text: _pages("https://sa.wikisource.org/wiki/x", url))
    fetcher, calls = _web({url: page})
    first = svc.tick(db, vertex=vertex, fetcher=fetcher, today=DAY)
    second = svc.tick(db, vertex=vertex, fetcher=fetcher, today=DAY)
    return vertex, calls, first, second, (a, b, c), url


def test_facts_run_end_to_end(db, monkeypatch):
    from app.services.iast import to_iast

    vertex, calls, first, second, (a, _b, _c), url = _run_facts(db, monkeypatch)
    assert first["words"]["state"] == "stocked"
    assert first["facts"]["requests"] == svc.GROUPS_PER_RUN
    assert second["facts"]["state"] == "done" and second["facts"]["confirmed"] == 1

    job = db.query(ContentJob).one()
    assert job.stats["dropped"] == {"bad_passage": 1, "bad_wording": 1}
    assert job.stats["verdicts"] == {"confirmed": 1, "translation_copies_page": 1, "verse_not_on_page": 1}
    assert not any("wikisource" in u for u in calls)

    card = db.query(FactCard).one()
    assert card.scheduled_date == DAY and card.status == "approved" and card.made_by == "auto"
    assert card.devanagari == a and card.iast == to_iast(a)
    assert card.source_url == url and card.source_site == "GRETIL, Göttingen"
    assert card.verse_match >= svc.MIN_VERSE_SHARE and card.claim_kind == "text"
    # The copy rule: no em dash reaches the card.
    assert card.fact == "The text names a test fact, plainly."

    reasons = {r.key: r.reason for r in db.query(ContentRejection).all()}
    assert reasons == {"testgita:1.2": "translation_copies_page", "testgita:1.3": "verse_not_on_page"}
    # The next request names every passage used or turned down.
    assert "Do not use these passages:" not in vertex.user_text("propose", "f-0")
    lines = svc.fact_propose_lines(["the Test"], ["Test-gītā 1.1", "Test-gītā 1.2"])
    assert "Do not use these passages: Test-gītā 1.1; Test-gītā 1.2" in lines[0]["request"]["contents"][0]["parts"][0]["text"]


def test_the_fact_api(client, db, monkeypatch):
    _run_facts(db, monkeypatch)
    card = db.query(FactCard).one()
    import app.routers.daily_content as router

    h = _auth(client, "dailyfact")
    # Before its day: nothing, and the card itself is a 404.
    monkeypatch.setattr(router, "local_date", lambda tz=None: "2031-02-28")
    assert client.get("/facts/today", headers=h).json() == {"date": "2031-02-28", "available": False, "fact": None}
    assert client.get(f"/facts/{card.id}", headers=h).status_code == 404
    assert client.get("/facts", headers=h).json() == {"facts": []}

    monkeypatch.setattr(router, "local_date", lambda tz=None: DAY)
    body = client.get("/facts/today", headers=h).json()
    assert body["available"] is True and body["date"] == DAY
    fact = body["fact"]
    assert fact["id"] == card.id and fact["claim_kind"] == "text"
    assert fact["text_name"] == "Test-gītā" and fact["ref"] == "1.1"
    assert fact["devanagari"] == card.devanagari and fact["iast"] == card.iast
    assert fact["source_url"].startswith("http://gretil.sub.uni-goettingen.de/")
    assert client.get(f"/facts/{card.id}", headers=h).json() == fact
    assert [f["id"] for f in client.get("/facts", headers=h).json()["facts"]] == [card.id]

    # A later day with no card of its own shows the earlier ones in turn.
    monkeypatch.setattr(router, "local_date", lambda tz=None: "2031-03-09")
    assert client.get("/facts/today", headers=h).json()["fact"]["id"] == card.id

    # Reading writes nothing, and the endpoints need a learner.
    assert client.post("/facts/today", headers=h).status_code in (404, 405)
    assert client.get("/facts/today").status_code in (401, 403, 422)
    assert client.get("/facts/nope", headers=h).status_code == 404


def test_fact_for_day_takes_turns():
    class Row:
        def __init__(self, day):
            self.scheduled_date, self.status = day, "approved"

    class Query:
        def __init__(self, rows):
            self.rows = rows

        def filter(self, *a):
            return self

        def order_by(self, *a):
            return self

        def all(self):
            return self.rows

    class Db:
        def __init__(self, rows):
            self.rows = rows

        def query(self, model):
            return Query(self.rows)

    rows = [Row("2031-03-01"), Row("2031-03-02"), Row("2031-03-03")]
    assert svc.fact_for_day(Db(rows), "2031-03-03") is rows[2]      # its own day
    assert svc.fact_for_day(Db(rows), "2031-03-04") is rows[0]      # then round again
    assert svc.fact_for_day(Db(rows), "2031-03-05") is rows[1]
    assert svc.fact_for_day(Db([]), "2031-03-05") is None


def test_facts_history_follows_the_daily_turns(db):
    """History lists the cards the latest days actually show: a card dated
    recently but whose turn has not come must not appear, and today's card
    must. Regression: /facts used to order by scheduled_date instead."""
    db.query(FactCard).delete()
    for i, day in enumerate(("2031-03-01", "2031-03-02", "2031-03-03")):
        db.add(FactCard(id=f"hist-{i}", status="approved", made_by="reviewed",
                        scheduled_date=day, fact=f"fact {i}", text_name="Test",
                        ref=f"1.{i}", ref_key=f"test:1.{i}", devanagari="क", iast="ka"))
    db.commit()
    rows = svc.recent_facts(db, "2031-03-05")
    days = ("2031-03-05", "2031-03-04", "2031-03-03")
    assert rows[0].id == svc.fact_for_day(db, days[0]).id  # today's card leads
    assert [r.id for r in rows] == [svc.fact_for_day(db, d).id for d in days]
    assert len({r.id for r in rows}) == 3                  # each card once


def test_the_facts_history_endpoint_returns_the_shown_cards(client, db, monkeypatch):
    db.query(FactCard).delete()
    db.commit()
    h = _auth(client, "histlearner")
    for i, day in enumerate(("2031-02-26", "2031-02-27", "2031-02-28")):
        db.add(FactCard(id=f"api-{i}", status="approved", made_by="reviewed",
                        scheduled_date=day, fact=f"api fact {i}", text_name="Test",
                        ref=f"2.{i}", ref_key=f"test:2.{i}", devanagari="क", iast="ka"))
    db.commit()
    import app.routers.daily_content as router

    monkeypatch.setattr(router, "local_date", lambda tz=None: "2031-03-01")
    listed = client.get("/facts", headers=h).json()["facts"]
    expected: list[str] = []                     # distinct cards, newest day first
    for d in ("2031-03-01", "2031-02-28", "2031-02-27"):
        row = svc.fact_for_day(db, d)
        if row.id not in expected:
            expected.append(row.id)
    assert [f["id"] for f in listed] == expected


# ─── The run itself ─────────────────────────────────────────────────────────

def test_nothing_runs_while_stock_is_full(db, monkeypatch):
    monkeypatch.setattr(settings, "content_words_stock_days", 0)
    monkeypatch.setattr(settings, "content_facts_stock_days", 0)
    vertex = FakeVertex({}, lambda text: _pages())
    out = svc.tick(db, vertex=vertex, fetcher=_web({})[0], today=DAY)
    assert out == {"date": DAY, "facts": {"state": "stocked", "stock": 0},
                   "words": {"state": "stocked", "stock": 0}}
    assert vertex.uploads == {} and db.query(ContentJob).count() == 0


def test_without_a_key_nothing_is_sent(db, monkeypatch):
    _only(monkeypatch, "facts")
    monkeypatch.setattr(svc, "vertex_from_settings", lambda: None)
    out = svc.tick(db, fetcher=_web({})[0], today=DAY)
    assert out["facts"]["state"] == "not_configured"
    assert db.query(ContentJob).count() == 0


def test_a_job_still_running_is_left_alone(db, monkeypatch):
    _only(monkeypatch, "facts")
    vertex = FakeVertex({}, lambda text: _pages())
    fetcher = _web({})[0]
    svc.tick(db, vertex=vertex, fetcher=fetcher, today=DAY)
    vertex.state = "JOB_STATE_RUNNING"
    out = svc.tick(db, vertex=vertex, fetcher=fetcher, today=DAY)
    assert out["facts"]["state"] == "running" and out["facts"]["stage"] == "propose"
    job = db.query(ContentJob).one()
    assert job.active_key == "facts" and not job.locked_until
    # A second run of the same kind cannot start beside it.
    assert svc._start(db, "facts", vertex, DAY, 0) == {"state": "busy"}


def test_a_failed_start_waits_before_trying_again(db, monkeypatch):
    _only(monkeypatch, "facts")
    vertex = FakeVertex({}, lambda text: _pages())
    vertex.fail_create = True
    fetcher = _web({})[0]
    assert svc.tick(db, vertex=vertex, fetcher=fetcher, today=DAY)["facts"]["state"] == "failed"
    job = db.query(ContentJob).one()
    assert job.stage == "failed" and job.active_key is None and "403" in job.error
    vertex.fail_create = False
    assert svc.tick(db, vertex=vertex, fetcher=fetcher, today=DAY)["facts"]["state"] == "waiting_after_failure"
    monkeypatch.setattr(svc, "RETRY_AFTER_S", 0)
    assert svc.tick(db, vertex=vertex, fetcher=fetcher, today=DAY)["facts"]["state"] == "submitted"


def test_a_batch_job_that_ends_badly_fails_the_run(db, monkeypatch):
    _only(monkeypatch, "facts")
    vertex = FakeVertex({}, lambda text: _pages())
    fetcher = _web({})[0]
    svc.tick(db, vertex=vertex, fetcher=fetcher, today=DAY)
    vertex.state = "JOB_STATE_FAILED"
    assert svc.tick(db, vertex=vertex, fetcher=fetcher, today=DAY)["facts"]["state"] == "failed"
    assert "JOB_STATE_FAILED" in db.query(ContentJob).one().error


def test_a_passing_error_is_tried_again_and_a_lasting_one_ends_the_run(db, monkeypatch):
    _only(monkeypatch, "facts")
    vertex = FakeVertex({}, lambda text: _pages())
    fetcher = _web({})[0]
    svc.tick(db, vertex=vertex, fetcher=fetcher, today=DAY)

    real_get = vertex.get_job

    def broken(name):
        raise TimeoutError("vertex did not answer")

    vertex.get_job = broken
    out = svc.tick(db, vertex=vertex, fetcher=fetcher, today=DAY)["facts"]
    assert out["state"] == "error" and out["errors"] == 1
    job = db.query(ContentJob).one()
    assert job.active_key == "facts" and job.stage == "propose" and not job.locked_until

    # It answers again: the run goes on and the count is cleared.
    vertex.get_job = real_get
    vertex.state = "JOB_STATE_RUNNING"
    assert svc.tick(db, vertex=vertex, fetcher=fetcher, today=DAY)["facts"]["state"] == "running"
    db.expire_all()
    assert db.query(ContentJob).one().stats.get("errors") == 0

    # It never answers: after enough tries in a row the run is given up.
    vertex.get_job = broken
    monkeypatch.setattr(svc, "MAX_ERRORS", 2)
    assert svc.tick(db, vertex=vertex, fetcher=fetcher, today=DAY)["facts"]["state"] == "error"
    assert svc.tick(db, vertex=vertex, fetcher=fetcher, today=DAY)["facts"]["state"] == "failed"
    db.expire_all()
    job = db.query(ContentJob).one()
    assert job.stage == "failed" and job.active_key is None and "TimeoutError" in job.error


def test_one_candidate_that_cannot_be_stored_does_not_sink_the_run(db, monkeypatch):
    _only(monkeypatch, "words")
    vertex = FakeVertex(WORD_PROPOSALS, _word_cite)
    fetcher = _web(WORD_PAGES)[0]
    real_store = svc.store_word

    def store(db_, item, result, today):
        if item["word"] == "calape":
            raise ValueError("made-up failure")
        return real_store(db_, item, result, today)

    monkeypatch.setattr(svc, "store_word", store)
    svc.tick(db, vertex=vertex, fetcher=fetcher, today=DAY)
    assert svc.tick(db, vertex=vertex, fetcher=fetcher, today=DAY)["words"]["state"] == "done"
    stats = db.query(ContentJob).one().stats
    assert stats["verdicts"]["store_error"] == 1 and stats["verdicts"]["confirmed"] == 2
    assert stats["stored"] == {"new_route": 1, "new_origin": 1}
    # Not remembered as turned down: it may be found again another day.
    assert db.query(ContentRejection).filter(ContentRejection.key == "calape").count() == 0


def test_the_check_stops_when_time_is_up_and_goes_on_next_time(db, monkeypatch):
    _only(monkeypatch, "words")
    vertex = FakeVertex(WORD_PROPOSALS, _word_cite)
    now = [0.0]

    def download(url):
        now[0] += 40.0  # every request is slow
        if url.endswith("/robots.txt"):
            return 404, "", b"", url
        if url in WORD_PAGES:
            return 200, "text/html", WORD_PAGES[url].encode("utf-8"), url
        return 404, "text/html", b"", url

    def fetcher():
        return pc.PageFetcher(download=download, sleep=lambda s: None, clock=lambda: now[0], deadline=now[0] + 75)

    svc.tick(db, vertex=vertex, fetcher=fetcher(), today=DAY)
    states = []
    for _ in range(12):
        out = svc.tick(db, vertex=vertex, fetcher=fetcher(), today=DAY)["words"]
        states.append(out["state"])
        if out["state"] == "done":
            break
    assert states[0] == "checking" and states[-1] == "done"
    # Slow sites cost time, never a card: the same three are confirmed.
    assert db.query(ContentJob).one().stats["verdicts"]["confirmed"] == 3


def test_a_run_that_would_cost_too_much_waits(db, monkeypatch):
    _only(monkeypatch, "words")
    vertex = FakeVertex(WORD_PROPOSALS, _word_cite)
    fetcher = _web(WORD_PAGES)[0]
    # Nine propose requests are estimated well above one paisa.
    monkeypatch.setattr(settings, "content_daily_budget_inr", 0.01)
    assert svc.tick(db, vertex=vertex, fetcher=fetcher, today=DAY)["words"]["state"] == "over_budget"
    assert vertex.uploads == {} and db.query(ContentJob).count() == 0

    # Enough for the proposals; then not enough for seven page requests.
    monkeypatch.setattr(settings, "content_daily_budget_inr", 1000.0)
    assert svc.tick(db, vertex=vertex, fetcher=fetcher, today=DAY)["words"]["state"] == "submitted"
    monkeypatch.setattr(settings, "content_daily_budget_inr", svc._batch_inr(250 * 7, 1600 * 7) / 2)
    out = svc.tick(db, vertex=vertex, fetcher=fetcher, today=DAY)["words"]
    assert out["state"] == "over_budget" and out["stage"] == "propose"
    assert "cite" not in vertex.uploads
    job = db.query(ContentJob).one()
    assert job.active_key == "words" and job.stats["candidates"] == 7

    # The ceiling lifted: the same run goes on from where it stood.
    monkeypatch.setattr(settings, "content_daily_budget_inr", 0)
    assert svc.tick(db, vertex=vertex, fetcher=fetcher, today=DAY)["words"]["state"] == "done"
    assert db.query(ContentJob).one().stats["verdicts"]["confirmed"] == 3


def test_what_was_spent_is_counted_from_the_token_counts(db, monkeypatch):
    assert svc.spent_inr(db) == 0.0
    db.add(ContentJob(id="words-x", kind="words", stage="done", stats={
        "propose_tokens": {"prompt_tokens": 1_000_000, "candidates_tokens": 0, "thoughts_tokens": 0},
        "cite_tokens": {"prompt_tokens": 0, "candidates_tokens": 500_000, "thoughts_tokens": 500_000},
    }))
    db.commit()
    from app.services.quota import gemini_cost_inr

    # Half the list price: a million tokens in and a million out.
    assert abs(svc.spent_inr(db) - gemini_cost_inr(1_000_000, 1_000_000) / 2) < 1e-6
    # The service-wide Gemini ceiling counts too, with batch spend added to it.
    monkeypatch.setattr(settings, "content_daily_budget_inr", 0)
    assert svc.affordable(db, "cite", 10) is True
    monkeypatch.setattr(settings, "gemini_daily_budget_inr", 1.0)
    monkeypatch.setattr(settings, "quota_enabled", True)
    assert svc.affordable(db, "cite", 10) is False


def test_the_judge_decides_and_no_answer_is_not_a_yes(db, monkeypatch):
    _only(monkeypatch, "words")
    answers = {
        "Zuckertest": json.dumps({"verdict": "source", "hedged": True}),
        "Mutterprobe": json.dumps({"verdict": "not stated", "hedged": False}),
        "calape": "I think so",
        "kalapu": json.dumps({"verdict": "yes"}),
    }
    vertex = FakeVertex(WORD_PROPOSALS, _word_cite,
                        judge=lambda text: answers[re.search(r"Word: (\S+) \(", text).group(1)])
    fetcher = _web(WORD_PAGES)[0]
    svc.tick(db, vertex=vertex, fetcher=fetcher, today=DAY)
    assert svc.tick(db, vertex=vertex, fetcher=fetcher, today=DAY)["words"]["confirmed"] == 1
    verdicts = db.query(ContentJob).one().stats["verdicts"]
    assert verdicts["confirmed"] == 1 and verdicts["judged_not_stated"] == 1 and verdicts["judge_no_answer"] == 2
    # A passage the judge calls hedged makes the card say probably.
    assert db.query(WordRoute).filter(WordRoute.word == "Zuckertest").one().confidence == "probable"
    assert db.query(WordRoute).filter(WordRoute.checked_by == "page").count() == 1
    # A reply that could not be read is not held against the word.
    keys = {r.key for r in db.query(ContentRejection).all()}
    assert "mutterprobe" in keys and "calape" not in keys and "kalapu" not in keys


def test_a_judge_job_still_running_keeps_the_run_waiting(db, monkeypatch):
    _only(monkeypatch, "words")
    vertex = FakeVertex(WORD_PROPOSALS, _word_cite)
    fetcher = _web(WORD_PAGES)[0]
    svc.tick(db, vertex=vertex, fetcher=fetcher, today=DAY)
    real_get = vertex.get_job
    vertex.get_job = lambda name: {"name": name, "state": "JOB_STATE_RUNNING" if name.endswith("/judge") else "JOB_STATE_SUCCEEDED"}
    out = svc.tick(db, vertex=vertex, fetcher=fetcher, today=DAY)["words"]
    assert out["state"] == "running" and out["stage"] == "judge"
    job = db.query(ContentJob).one()
    assert job.stage == "judge" and len(job.payload["pending"]) == 4
    assert db.query(WordRoute).filter(WordRoute.checked_by == "page").count() == 0
    vertex.get_job = real_get
    assert svc.tick(db, vertex=vertex, fetcher=fetcher, today=DAY)["words"]["state"] == "done"
    assert db.query(WordRoute).filter(WordRoute.checked_by == "page").count() == 3


def test_a_kind_rests_between_runs(db, monkeypatch):
    _only(monkeypatch, "facts")
    vertex = FakeVertex({}, lambda text: _pages())
    fetcher = _web({})[0]
    svc.tick(db, vertex=vertex, fetcher=fetcher, today=DAY)
    assert svc.tick(db, vertex=vertex, fetcher=fetcher, today=DAY)["facts"]["state"] == "done"
    # The run made nothing: the longer rest applies.
    monkeypatch.setattr(svc, "EMPTY_GAP_S", 3600)
    assert svc.tick(db, vertex=vertex, fetcher=fetcher, today=DAY)["facts"]["state"] == "resting"
    monkeypatch.setattr(svc, "EMPTY_GAP_S", 0)
    monkeypatch.setattr(svc, "MIN_GAP_S", 3600)
    assert svc.tick(db, vertex=vertex, fetcher=fetcher, today=DAY)["facts"]["state"] == "submitted"


def test_days_are_filled_in_order_and_never_twice(db):
    assert svc.next_free_date(db, "facts", DAY) == DAY
    db.add(FactCard(scheduled_date=DAY, ref_key="t:1", status="approved"))
    db.add(FactCard(scheduled_date="2031-03-02", ref_key="t:2", status="approved"))
    db.commit()
    assert svc.next_free_date(db, "facts", DAY) == "2031-03-03"
    assert svc.stock_days(db, "facts", DAY) == 1
    assert svc.stock_days(db, "facts", "2031-02-27") == 2


# ─── Small rules ────────────────────────────────────────────────────────────

def test_stem_gate():
    stems = {"SarkarA", "yoga", "jaNgala"}
    assert svc.stem_key("śarkarā", stems) == "SarkarA"
    assert svc.stem_key("yogaḥ", stems) == "yoga"          # first-case ending
    assert svc.stem_key("jaṅgalam", stems) == "jaNgala"
    assert svc.stem_key("jaṅgala-", stems) == "jaNgala"
    assert svc.stem_key("sharkara", stems) == ""           # no diacritics: not the stem
    assert svc.stem_key("blorpa", stems) == ""
    assert svc.stem_key("", stems) == ""
    dev, _ = svc.sanskrit_forms("SarkarA")
    assert svc.stem_key(dev, stems) == "SarkarA"           # given in Devanagari


def test_small_text_rules():
    assert svc.clean("  a — b – c  ") == "a, b, c"
    assert svc.clean("x" * 50, 10) == "x" * 10
    assert svc.script_of("Zucker") == "latin" and svc.script_of("сахар") == "cyrillic"
    assert svc.script_of("شکر") == "arabic" and svc.script_of("ภาษา") == "thai"
    assert svc.script_of("砂糖") == "han" and svc.script_of("12") == "other"
    assert svc.claim_kind("the text says this") == "text"
    assert svc.claim_kind("Tradition reads it this way") == "tradition"
    assert svc.claim_kind("modern interpretation") == "modern"
    assert svc.claim_kind("certainly true") == ""
    assert svc.route_id("sharkara", "de", "Zucker", "") == "sharkara.de.zucker"
    assert svc.route_id("sharkara", "ru", "сахар", "sakhar") == "sharkara.ru.sakhar"
    assert re.fullmatch(r"sharkara\.th\.u[0-9a-f]{8}", svc.route_id("sharkara", "th", "ภาษา", ""))


def test_addresses_the_code_knows():
    assert svc.word_urls("en", "sugar") == ["https://ahdictionary.com/word/search.html?q=sugar"]
    assert svc.word_urls("ru", "мёд") == ["https://gufo.me/dict/vasmer/%D0%BC%D0%B5%D0%B4"]
    assert svc.word_urls("fr", "sucre") == []
    assert svc.verse_urls("Bhagavad-gītā", "2.47") == ["https://vedabase.io/en/library/bg/2/47/"]
    assert svc.verse_urls("Śrīmad-Bhāgavatam", "9.3.32") == ["https://vedabase.io/en/library/sb/9/3/32/"]
    assert svc.verse_urls("Bhāgavata Purāṇa", "9.3.32") == ["https://vedabase.io/en/library/sb/9/3/32/"]
    assert svc.verse_urls("Bhagavad-gītā", "2") == [] and svc.verse_urls("Kaṭha Upaniṣad", "1.2.3") == []
    for urls in (svc.word_urls("en", "x"), svc.word_urls("de", "X"), svc.word_urls("ru", "х"),
                 svc.word_urls("hi", "x"), svc.verse_urls("Bhagavad-gītā", "1.1")):
        assert all(pc.usable_url(u) == "" for u in urls)


def test_every_language_is_listed_once_with_a_short_code():
    codes = [code for code, _name, _indo in svc.LANGUAGES]
    assert len(codes) == len(set(codes)) >= 70
    assert all(re.fullmatch(r"[a-z]{2,8}", c) for c in codes)
    assert all(len(name) <= 32 for _c, name, _i in svc.LANGUAGES)
    assert len(svc.LANGUAGES) % svc.LANGS_PER_RUN == 0  # each run takes a whole step


# ─── The owner's endpoints ──────────────────────────────────────────────────

def test_the_tick_endpoint_needs_the_admin_token_and_sends_nothing_without_a_key(client):
    assert client.post("/admin/content/tick").status_code == 401
    r = client.post("/admin/content/tick", headers=ADMIN)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["facts"]["state"] == "not_configured"
    assert body["words"]["state"] in ("not_configured", "stocked")
    assert client.get("/admin/content/tick", headers=ADMIN).status_code in (404, 405)


def test_status_and_withdraw(client, db, monkeypatch):
    _run_facts(db, monkeypatch)
    card = db.query(FactCard).one()
    assert client.get("/admin/content/status").status_code == 401
    status = client.get("/admin/content/status", headers=ADMIN).json()
    assert status["configured"] is False
    assert status["facts"]["cards"] == 1 and status["facts"]["turned_down"] == 2
    assert status["runs"][0]["stage"] == "done" and status["runs"][0]["in_flight"] is False
    assert status["runs"][0]["stats"]["verdicts"]["confirmed"] == 1

    assert client.post("/admin/content/withdraw", json={"kind": "fact", "id": card.id}).status_code == 401
    assert client.post("/admin/content/withdraw", json={"kind": "fact", "id": "nope"}, headers=ADMIN).status_code == 404
    assert client.post("/admin/content/withdraw", json={"kind": "page", "id": card.id}, headers=ADMIN).status_code == 422
    r = client.post("/admin/content/withdraw", json={"kind": "fact", "id": card.id}, headers=ADMIN)
    assert r.status_code == 200 and r.json()["withdrawn"] is True
    db.expire_all()
    card = db.query(FactCard).one()
    assert card.status == "withdrawn" and card.scheduled_date is None
    # It is not proposed again, and its day is free.
    assert db.query(ContentRejection).filter(ContentRejection.reason == "withdrawn").one().key == card.ref_key
    assert svc.next_free_date(db, "facts", DAY) == DAY


def test_withdrawing_a_route_or_a_word(client, db, monkeypatch):
    _run_words(db, monkeypatch)
    r = client.post("/admin/content/withdraw", json={"kind": "route", "id": "kalapa.tst.kalapu"}, headers=ADMIN)
    assert r.status_code == 200
    r = client.post("/admin/content/withdraw", json={"kind": "word", "id": "kalapa"}, headers=ADMIN)
    assert r.status_code == 200
    db.expire_all()
    origin = db.query(WordOrigin).filter(WordOrigin.id == "kalapa").one()
    assert origin.status == "withdrawn" and origin.scheduled_date is None
    # A later run that finds another word for the same stem does not bring it back.
    item = {"lang": "it", "lang_name": "Italian", "word": "calapo", "roman": "", "gloss": "x",
            "sanskrit": "kalāpa", "mw_key": "kalApa", "sanskrit_gloss": "x", "route": []}
    result = {"verdict": "confirmed", "url": "https://www.treccani.it/x", "host": "treccani.it", "hops": []}
    assert svc.store_word(db, item, result, DAY) == "origin_withdrawn"


def test_a_daily_card_can_be_reported(client):
    h = _auth(client, "dailyreport")
    for surface in ("fact", "word"):
        r = client.post("/feedback/report", json={"surface": surface, "question": "id", "answer": "x"}, headers=h)
        assert r.status_code == 204, r.text
