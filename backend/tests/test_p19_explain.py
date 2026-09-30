"""P19 — ask-anywhere: session-free /explain with engine-first routing.

Covers P19-1 (session-free endpoint), P19-2 (engines before the model — a
sandhi/morphology question costs ₹0 and carries sūtra numbers; routing
metadata records where the answer came from) and P19-3 (identical repeat hits
the cache; the quota path never returns a blank).
"""

import types

import pytest

from app.routers.explain import _cache, explain_metrics, wants_engine
from app.services.ask_engine import route as engine_route
from app.services.explainer import Explainer, strip_dashes


def _ask(client, headers, surface="grammar", subject="बालकः", question=""):
    return client.post(
        "/explain",
        json={"surface": surface, "subject": subject, "question": question},
        headers=headers,
    )


# ── P19-1: no session required ───────────────────────────────────────────────

def test_explain_requires_auth(client):
    r = client.post("/explain", json={"surface": "grammar", "subject": "बालकः"})
    assert r.status_code == 401


def test_explain_requires_subject(client, auth_headers):
    r = client.post("/explain", json={"surface": "grammar", "subject": ""},
                    headers=auth_headers)
    assert r.status_code == 422


# ── P19-2: engine-first ──────────────────────────────────────────────────────

def test_sandhi_question_is_engine_answered(client, auth_headers):
    _cache.clear()
    r = _ask(client, auth_headers, subject="बालकश्च", question="what is this sandhi?")
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["routed_to"] == "engine"
    assert d["source"] == "engine"
    # the split names both halves
    assert "बालक" in d["explanation"] and "च" in d["explanation"]
    blocks = d["engine"]["blocks"]
    assert any(b["kind"] == "split" for b in blocks)


def test_word_form_question_carries_derivation(client, auth_headers):
    _cache.clear()
    r = _ask(client, auth_headers, subject="बालकः", question="why bālakaḥ?")
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["routed_to"] == "engine"
    blocks = d["engine"]["blocks"]
    parse = [b for b in blocks if b["kind"] == "parse"]
    assert parse, f"expected a parse block: {blocks}"
    assert parse[0]["feature"] == "NOM.SG"
    # the derivation carries sūtra codes — the acceptance criterion
    assert any("derivation" in b and b["derivation"]["steps"] for b in parse), (
        "a noun form the engine can derive must show its prakriyā"
    )
    assert any(s["code"].startswith("1.") or "." in s["code"]
               for b in parse if "derivation" in b
               for s in b["derivation"]["steps"])


def test_verse_question_returns_scansion_without_metre_guess(client, auth_headers):
    _cache.clear()
    line = "कर्मण्येवाधिकारस्ते मा फलेषु कदाचन"
    r = _ask(client, auth_headers, surface="shloka", subject=line, question="rhythm?")
    assert r.status_code == 200
    d = r.json()
    if d["routed_to"] == "engine":
        block = next(b for b in d["engine"]["blocks"] if b["kind"] == "scansion")
        assert block["lines"], "scansion lines present"
        # absent is absent — no fabricated metre name (§6)
        assert d["explanation"].count("Metre:") <= 1


def test_engine_route_metadata_present(client, auth_headers):
    _cache.clear()
    r = _ask(client, auth_headers, subject="बालकः")
    d = r.json()
    assert d["routed_to"] in ("engine", "llm", "engine_fallback")


def test_engine_route_unit_sandhi_vs_word():
    a = engine_route("grammar", "बालकश्च", "")
    assert a is not None and a["routed_to"] == "engine"
    b = engine_route("grammar", "बालकः", "")
    assert b is not None and any(x["kind"] == "parse" for x in b["blocks"])


# ── P19-3: cache + honest degradation ────────────────────────────────────────

def test_repeated_identical_question_hits_cache(client, auth_headers):
    _cache.clear()
    r1 = _ask(client, auth_headers, subject="बालकश्च", question="what is this?")
    assert r1.status_code == 200
    assert r1.json()["cached"] is False
    r2 = _ask(client, auth_headers, subject="बालकश्च", question="what is this?")
    assert r2.status_code == 200
    d2 = r2.json()
    assert d2["cached"] is True
    assert d2["explanation"] == r1.json()["explanation"]


def test_metrics_report_cache_and_routing(client, auth_headers):
    _cache.clear()
    _ask(client, auth_headers, subject="बालकश्च")
    r = client.get("/admin/metrics", headers={"X-Admin-Token": "test-admin"})
    assert r.status_code == 200
    m = r.json().get("explain", {})
    assert m["explain_requests"] >= 1
    assert m["explain_engine_answers"] >= 1
    assert "explain_cache_hit_rate" in m


def test_quota_exhaustion_degrades_never_blank(client, auth_headers):
    """When the LLM quota is gone the endpoint still answers with the subject
    (an honest fallback), never a 5xx blank — §2.11.

    The subject here is deliberately not engine-parseable (a Latin-script
    question about a word the engines don't know), so the request reaches the
    metered LLM path."""
    _cache.clear()
    subject = "kim etat"
    # Drain a THROWAWAY learner's quota — draining the shared "tester" learner
    # would leak into every other LLM-path test in the suite.
    from app.db import SessionLocal
    from app.models import Learner
    from app.services.quota import check_and_consume

    db = SessionLocal()
    quota_learner = None
    try:
        quota_learner = Learner(
            id="quota-drain-test", display_name="quota-drain-test",
            bridge_langs=["en"], feature_mastery={},
            sanskrit_ratio=0.3, sanskrit_ratio_setting=0.8,
        )
        db.add(quota_learner)
        db.commit()
        from app.config import settings
        for _ in range(int(settings.quota_llm_calls_per_day)):
            check_and_consume(db, quota_learner, "llm_calls", 1, surface="explain")
        # mint a token for this learner — Token.id IS the bearer token
        from app.models import Token
        tok = Token(id="quota-drain-token", learner_id=quota_learner.id)
        db.add(tok)
        db.commit()
    finally:
        db.close()

    headers = {"Authorization": "Bearer quota-drain-token"}
    try:
        r = _ask(client, headers, subject=subject, question="what does this mean?")
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["routed_to"] == "engine_fallback"
        assert subject in d["explanation"], "fallback shows the subject itself"
        assert d["explanation"].strip(), "never a blank (§2.11)"
    finally:
        db = SessionLocal()
        try:
            lr = db.get(Learner, "quota-drain-test")
            if lr is not None:
                db.delete(lr)
                db.commit()
        finally:
            db.close()


# ── general questions, question-aware routing, no em dashes ──────────────────

class _FakeExplainer:
    """Stands in for the model: records what the router asked for."""

    def __init__(self, reply="Namaste is the usual greeting.", ok=True):
        self.reply = reply if ok else None
        self.explain_calls = []
        self.answer_calls = []

    def _get_provider(self):
        return types.SimpleNamespace(label="fake")

    async def explain(self, line, **kwargs):
        self.explain_calls.append((line, kwargs))
        return self.reply

    async def answer(self, question, **kwargs):
        self.answer_calls.append((question, kwargs))
        return self.reply


@pytest.fixture
def fake_explainer(monkeypatch):
    fake = _FakeExplainer()
    monkeypatch.setattr("app.routers.explain.get_explainer", lambda: fake)
    _cache.clear()
    return fake


def _post(client, headers, **body):
    return client.post("/explain", json=body, headers=headers)


def test_question_without_subject_is_answered_by_the_model(client, auth_headers, fake_explainer):
    r = _post(client, auth_headers, surface="general", subject="", question="How do I say hello?")
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["routed_to"] == "llm"
    assert d["explanation"] == "Namaste is the usual greeting."
    # the general path, not the line-explaining one
    assert fake_explainer.answer_calls and not fake_explainer.explain_calls
    assert fake_explainer.answer_calls[0][0] == "How do I say hello?"


def test_subject_field_may_be_left_out_entirely(client, auth_headers, fake_explainer):
    r = _post(client, auth_headers, surface="general", question="What is sandhi?")
    assert r.status_code == 200, r.text


def test_neither_subject_nor_question_is_still_rejected(client, auth_headers, fake_explainer):
    r = _post(client, auth_headers, surface="general", subject="  ", question="  ")
    assert r.status_code == 422
    assert "—" not in r.json()["detail"]


def test_interim_app_path_sends_the_question_as_the_subject(client, auth_headers, fake_explainer):
    """An app that retries a 422 with subject=question must still get an answer."""
    q = "What are the cases?"
    r = _post(client, auth_headers, surface="general", subject=q, question=q)
    assert r.status_code == 200, r.text
    assert r.json()["routed_to"] == "llm"


def test_meaning_question_about_a_word_goes_to_the_model_not_the_engine(client, auth_headers, fake_explainer):
    r = _ask(client, auth_headers, subject="बालकः", question="What does this mean?")
    assert r.status_code == 200, r.text
    assert r.json()["routed_to"] == "llm"
    line, kwargs = fake_explainer.explain_calls[0]
    assert line == "बालकः"
    assert kwargs["answer_question"] is True
    assert kwargs["iast"] == "bālakaḥ"  # the deterministic reading is handed over


def test_grammar_question_about_a_word_still_reaches_the_engine(client, auth_headers, fake_explainer):
    r = _ask(client, auth_headers, subject="बालकः", question="Explain the grammar")
    assert r.status_code == 200, r.text
    assert r.json()["routed_to"] == "engine"
    assert not fake_explainer.explain_calls


@pytest.mark.parametrize("question, engine", [
    ("", True),                          # tap-to-explain: engine first, as before
    ("why bālakaḥ?", True),              # neither list: engine (the default)
    ("why does it end like this?", True),
    ("what is this sandhi?", True),
    ("Explain the grammar", True),
    ("Split it into words", True),
    ("What metre is this?", True),
    ("What does this mean?", False),
    ("What does this verse mean?", False),
    ("How do I say it?", False),
    ("translate it", False),
    ("Why does it use this ending?", True),   # "use" AND "ending": grammar wins
])
def test_wants_engine_routing(question, engine):
    assert wants_engine(question) is engine


def test_general_question_with_quota_spent_says_so_plainly(client, auth_headers, fake_explainer, monkeypatch):
    from app.services.quota import QuotaExceeded

    def spent(*a, **k):
        raise QuotaExceeded(kind="llm_calls", used=400, limit=400, retry_after_s=3600)

    monkeypatch.setattr("app.routers.explain.check_and_consume", spent)
    r = _post(client, auth_headers, surface="general", subject="", question="What is sandhi?")
    assert r.status_code == 429
    assert "—" not in r.json()["detail"]
    assert not fake_explainer.answer_calls


def test_model_failure_refunds_and_returns_503(client, auth_headers, monkeypatch):
    refunds = []
    monkeypatch.setattr("app.routers.explain.get_explainer", lambda: _FakeExplainer(ok=False))
    monkeypatch.setattr("app.routers.explain.refund_quota", lambda *a, **k: refunds.append(k))
    _cache.clear()
    r = _post(client, auth_headers, surface="general", subject="", question="What is sandhi?")
    assert r.status_code == 503
    assert "—" not in r.json()["detail"]
    assert refunds, "a failed model call must give the quota back"


# ── em dashes never reach the learner ────────────────────────────────────────

@pytest.mark.parametrize("raw, clean", [
    ("Kamala means lotus — a common flower.", "Kamala means lotus, a common flower."),
    ("— Gita 2.47", "Gita 2.47"),
    ("It is a noun —", "It is a noun"),
    ("one—two", "one, two"),
    ("Pages 2–3 cover it.", "Pages 2–3 cover it."),     # an en dash inside a range stays
    ("No dashes here.", "No dashes here."),
    ("A — B — C", "A, B, C"),
])
def test_strip_dashes(raw, clean):
    assert strip_dashes(raw) == clean


def test_model_output_is_stripped_of_dashes_and_markup():
    async def complete(system, user, **kw):
        return types.SimpleNamespace(
            ok=True, text="**Namaste** — a greeting.", error=None,
            latency_ms=1, prompt_tokens=1, completion_tokens=1,
        )

    ex = Explainer()
    ex._provider = types.SimpleNamespace(complete=complete, label="fake")
    import asyncio
    out = asyncio.run(ex.answer("How do I say hello?"))
    assert out == "Namaste, a greeting."


def test_prompts_forbid_em_dashes():
    from app.services import explainer

    assert "Never use em dashes" in explainer._SYSTEM_PROMPT
    assert "Never use em dashes" in explainer._GENERAL_PROMPT
