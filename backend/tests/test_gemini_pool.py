"""The free Gemini keys in front of paid Vertex (services/gemini_pool.py), for
chat and for embeddings. No network: the keys are fake, the providers are
fakes, and Google's answers are written out."""

import asyncio
import json
from datetime import datetime, timezone

import httpx
import numpy as np
import pytest

from app.config import settings
from app.db import SessionLocal
from app.evals.providers import LLMResponse
from app.models import UsageEvent
from app.services import ask_live
from app.services import book_search as bs
from app.services import gemini_pool as gp

DIMS = settings.book_search_dims

DAILY_429 = ('HTTP 429: {"error": {"code": 429, "message": "You exceeded your current quota.\\n* Quota exceeded '
             'for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 20, '
             'model: gemini-3.8-flash\\nPlease retry in 3600s.", "status": "RESOURCE_EXHAUSTED", "details": '
             '[{"violations": [{"quotaId": "GenerateRequestsPerDayPerProjectPerModel-FreeTier"}]}]}}')
MINUTE_429 = ('HTTP 429: {"error": {"code": 429, "status": "RESOURCE_EXHAUSTED", "details": [{"violations": '
              '[{"quotaId": "GenerateRequestsPerMinutePerProjectPerModel-FreeTier"}]}, '
              '{"retryDelay": "37s"}]}}')


class Clock:
    def __init__(self, t):
        self.t = t

    def __call__(self):
        return self.t

    def advance(self, s):
        self.t += s


def _epoch(*a):
    return datetime(*a, tzinfo=timezone.utc).timestamp()


class FakeSlotProvider:
    """One (key, model): answers from a script, else a normal answer."""

    def __init__(self, key, model, script):
        self.key, self.model, self.script, self.calls = key, model, script, 0
        self.label = f"gemini-free:{model}"

    def _next(self):
        self.calls += 1
        return self.script.pop(0) if self.script else None

    async def complete(self, system, user, **kw):
        step = self._next()
        if step == "SLOW":
            await asyncio.sleep(2)
            step = None
        if step is None:
            return LLMResponse(text='{"title": "t"}', prompt_tokens=100, completion_tokens=50,
                               provider="gemini-free", model=self.model)
        return LLMResponse(provider="gemini-free", model=self.model, error=step)

    async def stream(self, system, user, *, usage=None, **kw):
        step = self._next()
        if step == "SLOW":
            await asyncio.sleep(2)
            step = None
        if step is not None and not step.startswith("MID:"):
            raise RuntimeError(step)
        yield '{"title"'
        if step:
            raise RuntimeError(step[4:])
        yield ': "t"}'
        if usage is not None:
            usage.update(prompt_tokens=100, output_tokens=50)


class FakePaid:
    configured = True
    label = "vertex:gemini-3.8-flash"

    def __init__(self):
        self.calls = 0

    async def complete(self, system, user, **kw):
        self.calls += 1
        return LLMResponse(text='{"title": "paid"}', prompt_tokens=100, completion_tokens=50,
                           provider="vertex", model="gemini-3.8-flash")

    async def stream(self, system, user, *, usage=None, **kw):
        self.calls += 1
        yield '{"title": "paid"}'
        if usage is not None:
            usage.update(prompt_tokens=100, output_tokens=50)


def make_pool(keys=("KEY-ONE", "KEY-TWO", "KEY-THREE"), models=("m-a", "m-b"), rpm=5, rpd=20, scripts=None,
              clock=None, **kw):
    scripts = scripts or {}
    made = {}

    def factory(key, model):
        made[(key, model)] = FakeSlotProvider(key, model, scripts.get((key, model), []))
        return made[(key, model)]

    pool = gp.GeminiPool(list(keys), list(models), rpm=rpm, rpd=rpd, clock=clock or Clock(_epoch(2026, 10, 10, 12)),
                         provider_factory=factory, **kw)
    return pool, made


# ── keys, clock ───────────────────────────────────────────────────────────

def test_keys_are_split_cleaned_and_not_repeated():
    assert gp.parse_keys(" a, b\nc;a ,'d' ") == ["a", "b", "c", "d"]
    assert gp.parse_keys("") == []


def test_the_free_day_ends_at_midnight_pacific_whatever_the_season():
    summer = gp.next_reset(_epoch(2026, 10, 10, 12))
    winter = gp.next_reset(_epoch(2026, 11, 5, 12))
    assert datetime.fromtimestamp(summer, timezone.utc) == datetime(2026, 10, 11, 7, tzinfo=timezone.utc)
    assert datetime.fromtimestamp(winter, timezone.utc) == datetime(2026, 11, 6, 8, tzinfo=timezone.utc)


# ── choosing a slot ───────────────────────────────────────────────────────

def test_models_in_order_and_keys_in_turn():
    pool, _ = make_pool()
    seen = [pool.acquire() for _ in range(16)]
    first = seen[:15]
    assert all(s.model == "m-a" for s in first)
    assert [s.key_no for s in first[:6]] == [1, 2, 3, 1, 2, 3], "spread over the keys, not one key first"
    assert all(sum(1 for s in first if s.key_no == k) == 5 for k in (1, 2, 3)), "5 a minute each"
    assert seen[15].model == "m-b", "the first model is full for this minute"


def test_a_slot_is_free_again_after_the_minute():
    clock = Clock(_epoch(2026, 10, 10, 12))
    pool, _ = make_pool(keys=("K",), models=("m-a",), clock=clock)
    assert [pool.acquire() is not None for _ in range(6)] == [True] * 5 + [False]
    clock.advance(61)
    assert pool.acquire() is not None


def test_the_daily_cap_holds_until_midnight_pacific():
    clock = Clock(_epoch(2026, 10, 10, 12))
    pool, _ = make_pool(keys=("K",), models=("m-a", "m-b"), rpm=0, rpd=2, clock=clock)
    got = [pool.acquire() for _ in range(5)]
    assert [s.model if s else None for s in got] == ["m-a", "m-a", "m-b", "m-b", None]
    clock.advance(60 * 60 * 20)       # 08:00 UTC next day: past 07:00 UTC, the reset
    assert pool.acquire().model == "m-a"


# ── what a failure parks ──────────────────────────────────────────────────

def test_a_per_minute_429_parks_for_the_time_google_names():
    clock = Clock(_epoch(2026, 10, 10, 12))
    pool, _ = make_pool(keys=("K",), models=("m-a",), clock=clock)
    s = pool.acquire()
    pool.fail(s, MINUTE_429)
    assert not pool.available()
    clock.advance(37)
    assert not pool.available()
    clock.advance(2)
    assert pool.available()


def test_a_daily_429_parks_until_the_reset():
    clock = Clock(_epoch(2026, 10, 10, 12))
    pool, _ = make_pool(keys=("K",), models=("m-a",), clock=clock)
    s = pool.acquire()
    pool.fail(s, DAILY_429)
    assert s.blocked_until == gp.next_reset(clock())
    clock.advance(60 * 60 * 3)
    assert not pool.available()


def test_a_429_with_no_details_waits_a_minute_and_a_repeat_waits_longer():
    clock = Clock(_epoch(2026, 10, 10, 12))
    pool, _ = make_pool(keys=("K",), models=("m-a",), rpm=0, rpd=0, clock=clock)
    s = pool.acquire()
    pool.fail(s, "HTTP 429: busy")
    assert 59 <= s.blocked_until - clock() <= 61
    for _ in range(3):
        clock.advance(100)
        pool.fail(pool.acquire(), "HTTP 429: busy")
    assert s.blocked_until - clock() >= 1700


def test_a_bad_key_or_model_is_parked_and_a_stray_400_is_not():
    clock = Clock(_epoch(2026, 10, 10, 12))
    pool, _ = make_pool(keys=("K",), models=("m-a",), rpm=0, rpd=0, clock=clock)
    s = pool.acquire()
    pool.fail(s, "HTTP 403: API key not valid")
    assert s.blocked_until - clock() == 600
    clock.advance(601)
    pool.fail(pool.acquire(), "HTTP 400: bad request")
    assert pool.available(), "one 400 may be this request's fault"
    pool.fail(pool.acquire(), "HTTP 400: bad request")
    pool.fail(pool.acquire(), "HTTP 400: bad request")
    assert not pool.available()


def test_status_never_carries_a_key():
    pool, _ = make_pool()
    pool.fail(pool.acquire(), DAILY_429)
    assert "KEY-ONE" not in json.dumps(pool.status()) and "KEY-TWO" not in repr(pool.status())
    assert "KEY-ONE" not in repr(pool.slots["chat"][0]), "a slot's repr hides its key"


# ── the chain: free first, paid last ──────────────────────────────────────

def _run(coro):
    return asyncio.run(coro)


def test_a_free_slot_answers_and_paid_is_not_called():
    pool, _ = make_pool()
    paid = FakePaid()
    r = _run(gp.TieredGemini(pool, paid).complete("s", "u"))
    assert r.ok and r.provider == "gemini-free" and paid.calls == 0


def test_a_429_moves_on_to_the_next_slot_inside_one_request():
    pool, made = make_pool(keys=("K1", "K2"), models=("m-a",), scripts={("K1", "m-a"): [MINUTE_429]})
    paid = FakePaid()
    r = _run(gp.TieredGemini(pool, paid).complete("s", "u"))
    assert r.ok and made[("K2", "m-a")].calls == 1 and paid.calls == 0
    again = _run(gp.TieredGemini(pool, paid).complete("s", "u"))
    assert again.ok and made[("K1", "m-a")].calls == 1, "K1 is parked and is not asked again"


def test_when_every_free_slot_fails_paid_answers():
    pool, _ = make_pool(keys=("K1",), models=("m-a", "m-b"),
                        scripts={("K1", "m-a"): [DAILY_429], ("K1", "m-b"): [DAILY_429]})
    paid = FakePaid()
    r = _run(gp.TieredGemini(pool, paid).complete("s", "u"))
    assert r.provider == "vertex" and paid.calls == 1


def test_paid_false_keeps_a_request_off_the_paid_route():
    pool, _ = make_pool(keys=("K1",), models=("m-a",), scripts={("K1", "m-a"): [DAILY_429]})
    paid = FakePaid()
    r = _run(gp.TieredGemini(pool, paid).complete("s", "u", paid=False))
    assert not r.ok and paid.calls == 0


def _lanes(monkeypatch, simple="m-b,m-a", careful="m-a"):
    monkeypatch.setattr(settings, "gemini_free_models_simple", simple)
    monkeypatch.setattr(settings, "gemini_free_models_careful", careful)


def test_a_lane_names_the_free_models_and_their_order(monkeypatch):
    _lanes(monkeypatch, simple="m-b, m-a")
    assert gp.lane_models("simple") == ["m-b", "m-a"] and gp.lane_models("careful") == ["m-a"]
    assert gp.lane_models("") is None and gp.lane_models("other") is None
    _lanes(monkeypatch, careful="")
    assert gp.lane_models("careful") is None, "a blank list means every model, in the pool's order"


def test_a_simple_question_tries_the_lighter_model_first_and_a_careful_one_the_stronger(monkeypatch):
    _lanes(monkeypatch)
    pool, made = make_pool(keys=("K1",), models=("m-a", "m-b"))
    tier = gp.TieredGemini(pool, FakePaid())
    assert _run(tier.complete("s", "u", lane="simple")).model == "m-b"
    assert _run(tier.complete("s", "u", lane="careful")).model == "m-a"
    assert _run(tier.complete("s", "u")).model == "m-a", "no lane: the pool's own order"


def test_a_simple_question_moves_to_the_stronger_free_model_then_to_paid(monkeypatch):
    _lanes(monkeypatch)
    pool, _ = make_pool(keys=("K1",), models=("m-a", "m-b"), rpd=1)
    paid = FakePaid()
    tier = gp.TieredGemini(pool, paid)
    got = [_run(tier.complete("s", "u", lane="simple")).model for _ in range(3)]
    assert got == ["m-b", "m-a", "gemini-3.8-flash"] and paid.calls == 1


def test_a_careful_question_goes_to_paid_rather_than_to_the_lighter_free_model(monkeypatch):
    _lanes(monkeypatch)
    pool, made = make_pool(keys=("K1",), models=("m-a", "m-b"), rpd=1)
    paid = FakePaid()
    tier = gp.TieredGemini(pool, paid)
    assert _run(tier.complete("s", "u", lane="careful")).model == "m-a"
    again = _run(tier.complete("s", "u", lane="careful"))
    assert again.provider == "vertex" and paid.calls == 1
    assert ("K1", "m-b") not in made, "the lighter model was never asked"
    assert not tier.free_possible(lane="careful") and tier.free_possible(lane="simple")


def test_a_streamed_answer_follows_its_lane(monkeypatch):
    _lanes(monkeypatch)
    pool, _ = make_pool(keys=("K1",), models=("m-a", "m-b"))
    tier = gp.TieredGemini(pool, FakePaid())
    _, usage, err = _stream(tier, lane="simple")
    assert err is None and usage["label"] == "gemini-free:m-b"
    _, usage, err = _stream(tier, lane="careful")
    assert err is None and usage["label"] == "gemini-free:m-a"


def test_personal_requests_go_straight_to_paid_unless_allowed(monkeypatch):
    pool, made = make_pool()
    paid = FakePaid()
    tier = gp.TieredGemini(pool, paid)
    monkeypatch.setattr(settings, "gemini_free_allow_personal", False)
    r = _run(tier.complete("s", "u", private=True))
    assert r.provider == "vertex" and paid.calls == 1 and not made
    assert not tier.free_possible(private=True) and tier.free_possible(private=False)
    monkeypatch.setattr(settings, "gemini_free_allow_personal", True)
    assert _run(tier.complete("s", "u", private=True)).provider == "gemini-free"


def test_an_empty_answer_is_not_a_quota_problem():
    pool, _ = make_pool(keys=("K1",), models=("m-a",), scripts={("K1", "m-a"): ["Empty response (finishReason: SAFETY)"]})
    paid = FakePaid()
    _run(gp.TieredGemini(pool, paid).complete("s", "u"))
    assert pool.available(), "the slot is not parked for a filtered answer"


def _stream(tier, **kw):
    usage = {}

    async def go():
        return [p async for p in tier.stream("s", "u", usage=usage, **kw)]

    try:
        return _run(go()), usage, None
    except Exception as exc:  # noqa: BLE001
        return None, usage, exc


def test_a_stream_that_fails_before_its_first_piece_moves_to_the_next_slot():
    pool, made = make_pool(keys=("K1", "K2"), models=("m-a",), scripts={("K1", "m-a"): [MINUTE_429]})
    pieces, usage, err = _stream(gp.TieredGemini(pool, FakePaid()))
    assert err is None and "".join(pieces) == '{"title": "t"}'
    assert usage["free"] is True and usage["label"] == "gemini-free:m-a"


def test_a_stream_that_breaks_after_its_first_piece_is_not_replaced():
    pool, _ = make_pool(keys=("K1", "K2"), models=("m-a",), scripts={("K1", "m-a"): ["MID:connection reset"]})
    paid = FakePaid()
    pieces, usage, err = _stream(gp.TieredGemini(pool, paid))
    assert isinstance(err, RuntimeError) and paid.calls == 0


def test_a_stream_falls_back_to_paid_and_says_so():
    pool, _ = make_pool(keys=("K1",), models=("m-a",), scripts={("K1", "m-a"): [DAILY_429]})
    paid = FakePaid()
    pieces, usage, err = _stream(gp.TieredGemini(pool, paid))
    assert err is None and paid.calls == 1
    assert usage["free"] is False and usage["label"] == "vertex:gemini-3.8-flash"


def test_a_free_key_slower_than_the_limit_is_set_aside_and_paid_answers(monkeypatch):
    monkeypatch.setattr(settings, "gemini_free_timeout_s", 0.05)
    pool, made = make_pool(keys=("K1", "K2"), models=("m-a",), scripts={("K1", "m-a"): ["SLOW"]})
    paid = FakePaid()
    r = _run(gp.TieredGemini(pool, paid).complete("s", "u"))
    assert r.provider == "vertex" and paid.calls == 1
    assert ("K2", "m-a") not in made, "a slow tier is not tried again on a second key in the same request"
    k1 = pool.slots["chat"][0]
    assert 29 <= k1.blocked_until - pool.clock() <= 31, "and the slow key rests for 30 s"


def test_a_stream_with_no_first_piece_in_time_goes_to_paid(monkeypatch):
    monkeypatch.setattr(settings, "gemini_free_timeout_s", 0.05)
    pool, made = make_pool(keys=("K1", "K2"), models=("m-a",), scripts={("K1", "m-a"): ["SLOW"]})
    paid = FakePaid()
    pieces, usage, err = _stream(gp.TieredGemini(pool, paid))
    assert err is None and paid.calls == 1 and "".join(pieces) == '{"title": "paid"}'
    assert usage["free"] is False and ("K2", "m-a") not in made


def test_a_slot_that_keeps_failing_rests_longer_each_time_and_a_good_answer_resets_it():
    clock = Clock(_epoch(2026, 10, 10, 12))
    pool, _ = make_pool(keys=("K",), models=("m-a",), rpm=0, rpd=0, clock=clock)
    rests = []
    for _ in range(4):
        s = pool.acquire()
        pool.fail(s, "HTTP 503: This model is currently experiencing high demand.")
        rests.append(round(s.blocked_until - clock()))
        clock.advance(rests[-1] + 1)
    assert rests == [30, 60, 120, 240]
    s = pool.acquire()
    pool.ok(s)
    pool.fail(s, "HTTP 503: busy")
    assert round(s.blocked_until - clock()) == 30


def test_the_vertex_key_file_is_found_from_any_working_directory(monkeypatch, tmp_path):
    from app.services import vertex_live

    backend = tmp_path / "backend"
    backend.mkdir()
    (tmp_path / "vertex_credentials.json").write_text('{"client_email": "x@y.z"}', encoding="utf-8")
    elsewhere = tmp_path / "elsewhere"
    elsewhere.mkdir()
    monkeypatch.chdir(elsewhere)
    monkeypatch.setattr(vertex_live, "_BACKEND_DIR", backend)
    monkeypatch.setattr(settings, "vertex_credentials_json", "")
    monkeypatch.setattr(settings, "vertex_credentials_path", "../vertex_credentials.json")
    assert vertex_live.credentials_info() == {"client_email": "x@y.z"}


# ── the real provider's request ───────────────────────────────────────────

def test_the_free_provider_sends_the_key_in_a_header_and_never_in_the_url():
    seen = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["url"], seen["headers"], seen["body"] = str(request.url), request.headers, json.loads(request.content)
        return httpx.Response(200, json={"candidates": [{"content": {"parts": [{"text": '{"a": 1}'}]}}],
                                         "usageMetadata": {"promptTokenCount": 7, "candidatesTokenCount": 3}})

    prov = gp.GeminiApiProvider("SECRET-KEY", "gemini-3.8-flash")
    prov._http = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    r = _run(prov.complete("sys", "usr", temperature=0.4, max_tokens=100, json_mode=True))
    assert r.ok and r.provider == "gemini-free" and (r.prompt_tokens, r.completion_tokens) == (7, 3)
    assert seen["url"] == f"{gp.API_BASE}/models/gemini-3.8-flash:generateContent"
    assert "SECRET-KEY" not in seen["url"] and seen["headers"]["x-goog-api-key"] == "SECRET-KEY"
    assert "authorization" not in seen["headers"]
    assert seen["body"]["systemInstruction"]["parts"][0]["text"] == "sys"
    assert seen["body"]["generationConfig"]["responseMimeType"] == "application/json"


def test_a_429_keeps_enough_of_the_body_to_name_its_quota():
    body = "x" * 800 + "GenerateRequestsPerDayPerProjectPerModel-FreeTier"

    def handler(request):
        return httpx.Response(429, text=body)

    prov = gp.GeminiApiProvider("K", "m")
    prov._http = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    r = _run(prov.complete("s", "u"))
    assert "PerDay" in r.error


# ── Ask: cost, budget, personal data ──────────────────────────────────────

def _spent(learner_id):
    db = SessionLocal()
    try:
        return sum(e.amount for e in db.query(UsageEvent).filter(
            UsageEvent.learner_id == learner_id, UsageEvent.kind == "gemini_inr").all())
    finally:
        db.close()


@pytest.fixture
def tiered(monkeypatch):
    from tests.test_ask_live import ANSWER

    # The fake pool's models are not the lanes' real ones; a blank lane list means every model.
    _lanes(monkeypatch, simple="", careful="")
    pool, made = make_pool(keys=("K1",), models=("m-a",), rpm=0, rpd=0)
    paid = FakePaid()
    paid_answer = json.dumps(ANSWER)

    async def paid_complete(system, user, **kw):
        paid.calls += 1
        return LLMResponse(text=paid_answer, prompt_tokens=900, completion_tokens=700,
                           provider="vertex", model="gemini-3.8-flash")

    paid.complete = paid_complete
    tier = gp.TieredGemini(pool, paid)

    class Free(FakeSlotProvider):
        async def complete(self, system, user, **kw):
            step = self._next()
            if step is not None:
                return LLMResponse(provider="gemini-free", model=self.model, error=step)
            return LLMResponse(text=paid_answer, prompt_tokens=900, completion_tokens=700,
                               provider="gemini-free", model=self.model)

    pool._factory = lambda key, model: made.setdefault((key, model), Free(key, model, []))
    monkeypatch.setattr(ask_live, "_get_provider", lambda: tier)
    return tier, pool, paid, made


def test_a_free_answer_costs_nothing_and_names_its_model(client, tiered):
    from tests.test_ask_live import _login, _word

    tier, pool, paid, made = tiered
    learner_id, headers = _login(client)
    r = client.post("/ask/talk", json={"question": f"What is the {_word()} vrata?", "lang": "en"}, headers=headers)
    assert r.status_code == 200, r.text
    assert r.json()["provider"] == "gemini-free:m-a" and paid.calls == 0
    assert abs(_spent(learner_id)) < 1e-9, "the reservation was returned whole"


def test_when_free_is_spent_paid_answers_and_is_charged(client, tiered):
    from tests.test_ask_live import _login, _word

    tier, pool, paid, made = tiered
    pool.fail(pool.acquire(), DAILY_429)
    learner_id, headers = _login(client)
    r = client.post("/ask/talk", json={"question": f"What is the {_word()} vrata?", "lang": "en"}, headers=headers)
    assert r.status_code == 200 and r.json()["provider"] == "vertex:gemini-3.8-flash" and paid.calls == 1
    assert _spent(learner_id) > 0


def test_shared_gemini_budget_stops_before_any_provider_call(client, tiered, monkeypatch):
    from tests.test_ask_live import _login, _word

    tier, pool, paid, made = tiered
    monkeypatch.setattr(settings, "gemini_daily_budget_inr", 0.0001)
    _id, headers = _login(client)
    r = client.post("/ask/talk", json={"question": f"What is the {_word()} vrata?", "lang": "en"}, headers=headers)
    assert r.status_code == 429, r.text
    assert r.json()["detail"]["kind"] == "gemini_budget"
    assert paid.calls == 0 and not made
    assert _spent(_id) == pytest.approx(0.0)


def test_a_chart_request_never_goes_to_the_free_keys(client, tiered):
    from tests.test_ask_live import _login

    tier, pool, paid, made = tiered
    _id, headers = _login(client)
    r = client.post("/ask/talk", json={
        "question": "What does my chart say about my career?", "lang": "en",
        "birth": {"date": "1995-06-15", "time": "10:30", "lat": 28.6, "lon": 77.2, "tz": "Asia/Kolkata"},
    }, headers=headers)
    assert r.status_code == 200, r.text
    assert paid.calls == 1 and not made, "the free keys were not asked"


# ── embeddings ────────────────────────────────────────────────────────────

def _vec(axis):
    v = np.zeros(DIMS)
    v[axis] = 1.0
    return v.tolist()


@pytest.fixture
def free_embed(monkeypatch):
    monkeypatch.setattr(settings, "gemini_api_keys", "EMB-KEY-1,EMB-KEY-2")
    monkeypatch.setattr(settings, "gemini_free_embeddings", True)
    gp.reset_pool()
    bs.reset_parity()
    vertex_calls = []

    async def fake_vertex(texts, task, model, dims, client, timeout):
        vertex_calls.append(list(texts))
        return bs.Embedded(vectors=[_vec(0) for _ in texts], tokens=5, chars=sum(len(t) for t in texts))

    monkeypatch.setattr(bs, "_embed_vertex", fake_vertex)
    yield vertex_calls
    gp.reset_pool()
    bs.reset_parity()


def _client(handler):
    return httpx.AsyncClient(transport=httpx.MockTransport(handler))


def test_embeddings_come_from_the_free_key_once_they_match_vertex(free_embed):
    calls = []

    def handler(request):
        body = json.loads(request.content)
        calls.append((request.headers["x-goog-api-key"], len(body["requests"]), body["requests"][0]["taskType"],
                      body["requests"][0]["outputDimensionality"]))
        return httpx.Response(200, json={"embeddings": [{"values": _vec(0)} for _ in body["requests"]]})

    out = _run(bs.embed(["a", "b"], "RETRIEVAL_QUERY", client=_client(handler)))
    assert len(out.vectors) == 2 and out.tokens == 0, "a free call has no billed tokens"
    assert calls[-1][1:] == (2, "RETRIEVAL_QUERY", DIMS) and calls[-1][0].startswith("EMB-KEY")
    assert len(free_embed) == 1, "Vertex was asked once, for the one-time comparison"
    _run(bs.embed(["c"], "RETRIEVAL_QUERY", client=_client(handler)))
    assert len(free_embed) == 1, "and not again"


def test_a_429_sends_the_embedding_to_vertex(free_embed):
    state = {"n": 0}

    def handler(request):
        state["n"] += 1
        body = json.loads(request.content)
        if len(body["requests"]) == 1 and body["requests"][0]["content"]["parts"][0]["text"] == bs._PARITY_PROBE:
            return httpx.Response(200, json={"embeddings": [{"values": _vec(0)}]})
        return httpx.Response(429, text=DAILY_429[len("HTTP 429: "):])

    out = _run(bs.embed(["question"], "RETRIEVAL_QUERY", client=_client(handler)))
    assert len(out.vectors) == 1 and out.tokens == 5, "Vertex answered"


def test_vectors_that_differ_from_vertexs_are_never_used(free_embed):
    seen = []

    def handler(request):
        seen.append(1)
        body = json.loads(request.content)
        return httpx.Response(200, json={"embeddings": [{"values": _vec(7)} for _ in body["requests"]]})

    out = _run(bs.embed(["q"], "RETRIEVAL_QUERY", client=_client(handler)))
    assert out.tokens == 5, "Vertex's vectors were returned"
    n = len(seen)
    _run(bs.embed(["q2"], "RETRIEVAL_QUERY", client=_client(handler)))
    assert len(seen) == n, "the free keys are not asked again once they have been found different"


def test_other_embedding_models_use_vertex_alone(free_embed):
    def handler(request):
        raise AssertionError("the free keys must not be called")

    out = _run(bs.embed(["q"], "RETRIEVAL_QUERY", model="text-multilingual-embedding-002", client=_client(handler)))
    assert out.tokens == 5


def test_a_lane_that_names_no_pooled_model_is_warned_about(monkeypatch, caplog):
    monkeypatch.setattr(settings, "gemini_api_keys", "K1")
    monkeypatch.setattr(settings, "gemini_free_models", "m-a")
    _lanes(monkeypatch, simple="m-a", careful="gemini-3.8-flash")
    gp.reset_pool()
    with caplog.at_level("WARNING", logger="shabd.gemini_pool"):
        assert gp.get_pool() is not None
    gp.reset_pool()
    assert "lane 'careful'" in caplog.text and "lane 'simple'" not in caplog.text


def test_without_keys_nothing_changes(monkeypatch):
    monkeypatch.setattr(settings, "gemini_api_keys", "")
    gp.reset_pool()
    assert gp.get_pool() is None
