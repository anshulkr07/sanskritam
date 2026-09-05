"""P19 — ask-anywhere: session-free /explain with engine-first routing.

Covers P19-1 (session-free endpoint), P19-2 (engines before the model — a
sandhi/morphology question costs ₹0 and carries sūtra numbers; routing
metadata records where the answer came from) and P19-3 (identical repeat hits
the cache; the quota path never returns a blank).
"""

from app.routers.explain import _cache, explain_metrics
from app.services.ask_engine import route as engine_route


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
