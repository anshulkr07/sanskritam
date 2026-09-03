"""Free-form conversation tutor: the Vidyut guardrail and the LLM turn.

No test here reaches Sarvam. `ConversationTutor._complete` is the seam — it is
the last thing before the network — so every test drives real prompt building,
real JSON parsing, and the real Vidyut gate against canned model output.
"""

from __future__ import annotations

import asyncio
import json

import pytest

from app.services.tutor import ConversationTutor, sanskrit_health


# ─── The guardrail ──────────────────────────────────────────────────────


def test_a_learners_own_name_is_not_an_error():
    """Regression (owner report): "aham anshul asmi" — correct Sanskrit,
    correct answer — was rejected because Vidyut has never heard of "anshul".

    `analyzer.is_confident` demands every word parse, so any sentence carrying
    a name fails it outright. The analyzer also cannot tell a name from
    gibberish (both come back error="unrecognized"), so the health check keys
    on how much of the line survives instead.
    """
    h = sanskrit_health("aham anshul asmi")
    assert h.ok, f"a name in a well-formed frame must pass: {h}"
    assert "anshul" in h.unparsed
    # The grammatical frame is what actually got read.
    assert "√as" in h.features


@pytest.mark.parametrize(
    "text",
    ["aham rāmaḥ asmi", "अहं रामः अस्मि", "aham vidyālayam gacchāmi", "मम नाम अंशुल"],
)
def test_well_formed_sanskrit_passes(text):
    assert sanskrit_health(text).ok, text


@pytest.mark.parametrize("text", ["फ़लदफ़दफ़ खखख", "asdf qwer zxcv"])
def test_word_salad_fails(text):
    h = sanskrit_health(text)
    assert not h.ok, f"gibberish must not pass the gate: {h}"
    assert h.ratio == 0.0


def test_empty_is_empty_not_wrong():
    h = sanskrit_health("   ")
    assert h.empty and not h.ok


@pytest.mark.parametrize("text", ["mujhe nahi pata", "I live in Delhi", "मुझे नहीं पता"])
def test_bridge_language_is_not_graded_as_sanskrit(text):
    """The analyser matches stems, so it declines Hindi and English into
    confident-looking Sanskrit ("mujhe" -> mujha LOC.SG). Reporting that as
    fact invites the tutor to correct a learner's Hindi as bad Sanskrit, so a
    line with no verbal root and no pronoun is flagged as not-Sanskrit and its
    analysis is withheld from the model."""
    h = sanskrit_health(text)
    assert not h.looks_sanskrit, f"{text!r} is not a Sanskrit attempt: {h}"
    fact = h.as_prompt_fact()
    assert "does NOT appear to have written Sanskrit" in fact
    assert "correct nothing" in fact


@pytest.mark.parametrize("text", ["aham anshul asmi", "aham dillīnagare vasāmi", "अहं रामः अस्मि"])
def test_real_sanskrit_attempts_are_recognised(text):
    assert sanskrit_health(text).looks_sanskrit, text


def test_analysis_reaches_the_model_as_fact_not_accusation():
    """The prompt must hand Vidyut's reading over as ground truth AND tell the
    model that an unreadable word is a name, not a mistake — otherwise the
    tutor 'corrects' the learner's name, which is the failure this replaced."""
    fact = sanskrit_health("aham anshul asmi").as_prompt_fact()
    assert "anshul" in fact
    assert "NOT a mistake" in fact


# ─── The LLM turn ───────────────────────────────────────────────────────


def _stub(monkeypatch, *payloads):
    """Queue canned model responses; later calls repeat the last one."""
    calls: list[tuple[str, str]] = []
    queue = list(payloads)

    async def fake_complete(self, system, user):
        calls.append((system, user))
        return queue.pop(0) if len(queue) > 1 else (queue[0] if queue else None)

    monkeypatch.setattr(ConversationTutor, "_complete", fake_complete)
    return calls


def _run(coro):
    return asyncio.run(coro)


async def _reply(tutor, **kw):
    kw.setdefault("transcript", "aham anshul asmi")
    kw.setdefault("history", [])
    kw.setdefault("situation", "first meeting")
    kw.setdefault("target_features", ["NOM.SG", "PRES.1SG"])
    kw.setdefault("bridge_langs", ["en", "hi"])
    kw.setdefault("ratio", 0.3)
    return await tutor.reply(**kw)


def test_good_sanskrit_is_spoken(monkeypatch):
    _stub(monkeypatch, json.dumps({
        "sanskrit": "साधु! भवान् कुत्र वसति?",
        "bridge": "Nice to meet you. Where do you live?",
        "correction": "",
        "understood": True,
        "done": False,
    }))
    r = _run(_reply(ConversationTutor()))
    assert r.source == "llm"
    assert r.sanskrit == "साधु! भवान् कुत्र वसति?"
    assert r.bridge


def test_ungated_sanskrit_is_never_spoken(monkeypatch):
    """The one inviolable rule: malformed Sanskrit must not reach a learner.

    One retry at a simpler register, then the turn keeps its bridge half and
    drops the Sanskrit entirely.
    """
    bad = json.dumps({"sanskrit": "फ़लदफ़दफ़ खखख", "bridge": "Where do you live?",
                      "correction": "", "understood": True, "done": False})
    calls = _stub(monkeypatch, bad, bad)
    r = _run(_reply(ConversationTutor()))

    assert r.sanskrit == "", f"gate let malformed Sanskrit through: {r}"
    assert r.bridge == "Where do you live?"
    assert r.source == "llm_bridge_only"
    assert len(calls) == 2, "the gate must retry once before giving up"
    assert "did not pass the grammar checker" in calls[1][0], "retry must say why"


def test_gate_retry_can_recover(monkeypatch):
    _stub(
        monkeypatch,
        json.dumps({"sanskrit": "खखख फ़दफ़", "bridge": "", "correction": ""}),
        json.dumps({"sanskrit": "भवान् कुत्र वसति?", "bridge": "Where do you live?",
                    "correction": ""}),
    )
    r = _run(_reply(ConversationTutor()))
    assert r.sanskrit == "भवान् कुत्र वसति?"
    assert r.source == "llm"


def test_bridge_only_reply_is_legitimate(monkeypatch):
    _stub(monkeypatch, json.dumps({
        "sanskrit": "", "bridge": "Let's slow down — what does 'gacchāmi' mean to you?",
        "correction": "", "understood": True, "done": False,
    }))
    r = _run(_reply(ConversationTutor()))
    assert r.source == "llm_bridge_only"
    assert r.sanskrit == ""
    assert r.bridge


def test_model_unreachable_degrades_without_raising(monkeypatch):
    _stub(monkeypatch, None)
    r = _run(_reply(ConversationTutor()))
    assert r.source == "degraded"
    assert r.bridge, "a degraded turn must still say something"


def test_unparseable_model_output_degrades(monkeypatch):
    _stub(monkeypatch, "I'm sorry, I can't help with that.")
    r = _run(_reply(ConversationTutor()))
    assert r.source == "degraded"


def test_wrapped_json_envelope_is_unwrapped(monkeypatch):
    """Sarvam -conversations sometimes wraps the payload, the same quirk
    edge_router._deep_edge already guards against."""
    _stub(monkeypatch, json.dumps({"data": {
        "sanskrit": "भवान् कुत्र वसति?", "bridge": "Where do you live?",
        "correction": "", "understood": True, "done": False,
    }}))
    r = _run(_reply(ConversationTutor()))
    assert r.sanskrit == "भवान् कुत्र वसति?"


def test_prompt_carries_history_situation_and_targets(monkeypatch):
    calls = _stub(monkeypatch, json.dumps({"sanskrit": "", "bridge": "ok"}))
    _run(_reply(
        ConversationTutor(),
        history=[{"role": "tutor", "text": "भवान् कः?"},
                 {"role": "learner", "text": "aham anshul asmi"}],
        situation="प्रथमं मेलनम् — a first meeting",
        target_features=["ABL.SG", "PRES.1SG"],
    ))
    _, user = calls[0]
    assert "प्रथमं मेलनम्" in user
    assert "ABL.SG" in user
    assert "भवान् कः?" in user, "the model must see what it already asked"
    assert "aham anshul asmi" in user
    # And Vidyut's reading of the current line, as fact.
    assert "Vidyut parsed" in user


def test_opening_turn_has_nothing_to_correct(monkeypatch):
    calls = _stub(monkeypatch, json.dumps({"sanskrit": "", "bridge": "नमस्ते!"}))
    r = _run(_reply(ConversationTutor(), transcript="", opening=True))
    assert r.bridge == "नमस्ते!"
    _, user = calls[0]
    assert "FIRST turn" in user
    assert "nothing to correct" in user


# ─── The endpoint, end to end ───────────────────────────────────────────


@pytest.fixture
def llm_mode(monkeypatch):
    """Run the real router, real gate, real recording — stub only the network.

    `available` is forced on because the test environment has no Sarvam key,
    and an unconfigured tutor makes /conversation/start fall back to graph
    mode by design.
    """
    monkeypatch.setattr(ConversationTutor, "available", property(lambda self: True))

    scripted: list[str] = []

    def script(*payloads):
        scripted.clear()
        scripted.extend(payloads)

    async def fake_complete(self, system, user):
        if not scripted:
            return None
        return scripted.pop(0) if len(scripted) > 1 else scripted[0]

    monkeypatch.setattr(ConversationTutor, "_complete", fake_complete)
    return script


def _say(sanskrit="", bridge="", correction="", done=False):
    return json.dumps({"sanskrit": sanskrit, "bridge": bridge,
                       "correction": correction, "understood": True, "done": done})


def test_llm_start_opens_without_a_node_or_edges(client, auth_headers, llm_mode):
    llm_mode(_say(sanskrit="नमस्ते! भवान् कः?", bridge="Hello! Who are you?"))
    r = client.post("/conversation/start", json={}, headers=auth_headers)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["mode"] == "llm"
    assert d["node"]["devanagari"] == "नमस्ते! भवान् कः?"
    assert d["edges"] == [], "free-form mode offers nothing to choose from"


def test_learners_own_name_is_accepted_and_moves_on(client, auth_headers, llm_mode):
    """The whole point: "aham anshul asmi" is a correct answer, and the tutor
    asks something NEW rather than repeating the question."""
    llm_mode(_say(sanskrit="भवान् कः?", bridge="Who are you?"))
    sid = client.post("/conversation/start", json={}, headers=auth_headers).json()["session_id"]

    llm_mode(_say(sanskrit="स्वागतम्! भवान् कुत्र वसति?",
                  bridge="Welcome, Anshul! Where do you live?"))
    d = client.post(
        "/conversation/turn",
        json={"session_id": sid, "transcript": "aham anshul asmi"},
        headers=auth_headers,
    ).json()

    assert d["mode"] == "llm"
    assert d["verdict"] == "correct", f"a name is not an error: {d}"
    assert d["escape"] is False
    assert d["correction"] == "", "the learner's own name must never be corrected"
    assert d["node"]["devanagari"] != "भवान् कः?", "the tutor repeated the question"


def test_llm_turn_never_escapes_even_on_gibberish(client, auth_headers, llm_mode):
    """There is no edge to miss, so there is no escape and no repair ladder —
    the tutor just answers. Vidyut still reports the line as unreadable."""
    llm_mode(_say(bridge="Hello!"))
    sid = client.post("/conversation/start", json={}, headers=auth_headers).json()["session_id"]

    llm_mode(_say(bridge="I didn't follow that — try saying it another way?"))
    d = client.post(
        "/conversation/turn",
        json={"session_id": sid, "transcript": "asdf qwer zxcv"},
        headers=auth_headers,
    ).json()
    assert d["escape"] is False
    assert d["verdict"] == "unsure", f"gibberish is unsure, never incorrect: {d}"
    assert d["node"]["devanagari"]


def test_history_reaches_the_next_prompt(client, auth_headers, llm_mode, monkeypatch):
    llm_mode(_say(sanskrit="भवान् कः?", bridge="Who are you?"))
    sid = client.post("/conversation/start", json={}, headers=auth_headers).json()["session_id"]

    seen: list[str] = []
    original = ConversationTutor._complete

    async def spy(self, system, user):
        seen.append(user)
        return await original(self, system, user)

    monkeypatch.setattr(ConversationTutor, "_complete", spy)
    llm_mode(_say(sanskrit="साधु!", bridge="Good!"))
    client.post("/conversation/turn",
                json={"session_id": sid, "transcript": "aham anshul asmi"},
                headers=auth_headers)

    assert seen, "the turn did not reach the model"
    assert "भवान् कः?" in seen[0], "the tutor was not told what it already asked"


def test_model_outage_degrades_the_turn_not_the_session(client, auth_headers, llm_mode):
    llm_mode(_say(bridge="Hello!"))
    sid = client.post("/conversation/start", json={}, headers=auth_headers).json()["session_id"]

    llm_mode()   # nothing scripted → _complete returns None
    d = client.post("/conversation/turn",
                    json={"session_id": sid, "transcript": "aham anshul asmi"},
                    headers=auth_headers).json()
    assert d["degraded"] is True
    assert d["node"]["devanagari"], "a degraded turn still says something"
    assert d["session_done"] is False


def test_graph_mode_still_available_as_the_fallback(client, auth_headers, llm_mode):
    r = client.post("/conversation/start", json={"mode": "graph"}, headers=auth_headers)
    assert r.status_code == 200
    d = r.json()
    assert d["mode"] == "graph"
    assert d["edges"], "graph mode still offers its authored edges"


def test_hindi_labelled_as_sanskrit_is_moved_to_the_bridge(monkeypatch):
    """Observed live: the model answered entirely in Hindi in the "sanskrit"
    field. Vidyut declines Devanagari Hindi happily, so the health check
    passed it, and the app rendered the same sentence twice — once as each
    half of the turn."""
    _stub(monkeypatch, json.dumps({
        "sanskrit": "बहुत अच्छा! आपका मित्र राम है। क्या आप अच्छे हैं?",
        "bridge": "", "correction": "",
    }))
    r = _run(_reply(ConversationTutor()))
    assert r.sanskrit == "", f"Hindi must not be spoken as Sanskrit: {r}"
    assert "आपका मित्र राम है" in r.bridge, "the line must survive as the bridge half"


def test_identical_halves_collapse_to_one(monkeypatch):
    same = "भवान् कुत्र वसति?"
    _stub(monkeypatch, json.dumps({"sanskrit": same, "bridge": same, "correction": ""}))
    r = _run(_reply(ConversationTutor()))
    assert not (r.sanskrit and r.bridge == r.sanskrit), "one turn, rendered twice"


def test_verbless_sanskrit_still_passes_the_gate(monkeypatch):
    """Sanskrit elides the copula, so "भवान् कः?" has no verb and no pronoun.
    Requiring one broke the outgoing gate on ordinary nominal sentences."""
    _stub(monkeypatch, json.dumps({
        "sanskrit": "भवान् कः?", "bridge": "Who are you?", "correction": "",
    }))
    r = _run(_reply(ConversationTutor()))
    assert r.sanskrit == "भवान् कः?"
    assert r.source == "llm"
