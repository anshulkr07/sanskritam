"""Free-form conversation tutor: the Vidyut guardrail and the LLM turn.

No test here reaches Sarvam. `ConversationTutor._complete` is the seam — it is
the last thing before the network — so every test drives real prompt building,
real JSON parsing, and the real Vidyut gate against canned model output.
"""

from __future__ import annotations

import asyncio
import json

import pytest

from app.services.tutor import (
    ConversationTutor,
    is_devanagari_pure,
    sanskrit_health,
)


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


# ─── The script-purity gate ─────────────────────────────────────────────
#
# Added 2026-09-22 after measuring the multilingual turn against Sarvam. On
# NATIVE-SCRIPT input (Telugu, Kannada, Malayalam) the model leaks the input
# script into the Sanskrit field 38% of the time (3 of 8 measured). The
# pre-existing `_is_bridge_language` check is a Hindi *word list* and waves
# every one of those through, so the learner sees Telugu rendered as Sanskrit.


@pytest.mark.parametrize("text", ["अहं गृहं गच्छामि", "भवान् कः?", ""])
def test_pure_devanagari_passes_the_script_gate(text):
    assert is_devanagari_pure(text), text


@pytest.mark.parametrize(
    "text",
    [
        # Measured live: reply_sa came back 26% Devanagari, the rest Telugu.
        "నీవు 'నేను గృహానికి गच्छामि' అని చెప్పవచ్చు",
        "ಅಹೋ, ಇದು ಬಹಳ ಸರಳम्",
        "നമസ്കാരം! 'ഞാൻ വീട്ടിൽ പോകുന്നു' എന്ന് गच्छामि",
        "aham gacchami",          # romanized is not Devanagari either
    ],
)
def test_foreign_script_fails_the_script_gate(text):
    assert not is_devanagari_pure(text), f"script leak was not caught: {text!r}"


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
    kw.setdefault("native_lang", "kn")
    return await tutor.reply(**kw)


def _say(reply_sa="", reply_native="", explain_en="", read_back="",
         fix_needed=False, fix_dev="", fix_note="", done=False):
    return json.dumps({
        "read_back": read_back,
        "fix": {"needed": fix_needed, "devanagari": fix_dev, "note_en": fix_note},
        "reply_sa": reply_sa,
        "reply_native": reply_native,
        "explain_en": explain_en,
        "done": done,
    })


def test_good_sanskrit_is_spoken(monkeypatch):
    _stub(monkeypatch, _say(
        reply_sa="साधु! भवान् कुत्र वसति?",
        reply_native="ಚೆನ್ನಾಗಿದೆ! ನೀನು ಎಲ್ಲಿ ವಾಸಿಸುತ್ತೀಯ?",
        explain_en="kutra means where.",
    ))
    r = _run(_reply(ConversationTutor()))
    assert r.source == "llm"
    assert r.reply_sa == "साधु! भवान् कुत्र वसति?"
    assert r.reply_native and r.explain_en


def test_iast_is_generated_here_not_taken_from_the_model(monkeypatch):
    """P7-13: an LLM got 130 of 264 stored transliterations wrong, so the
    roman spelling is `services/iast.py`'s and the model is never asked for
    one. A model that volunteers an `iast` field must be ignored."""
    payload = json.loads(_say(reply_sa="अहं गच्छामि", reply_native="ನಾನು ಹೋಗುತ್ತೇನೆ"))
    payload["iast"] = "AHAM GACCHAAMI (wrong)"
    _stub(monkeypatch, json.dumps(payload))
    r = _run(_reply(ConversationTutor()))
    assert r.reply_sa_iast == "ahaṃ gacchāmi", r.reply_sa_iast
    assert "wrong" not in r.reply_sa_iast


def test_foreign_script_in_the_sanskrit_field_is_dropped(monkeypatch):
    """The 38%-of-native-script-input failure, end to end. The turn survives
    on its native-language half rather than rendering Telugu as Sanskrit."""
    leaked = _say(
        reply_sa="నీవు 'నేను గృహానికి गच्छामि' అని చెప్పవచ్చు",
        reply_native="నువ్వు 'అహం గృహం గచ్ఛామి' అని చెప్పవచ్చు",
        explain_en="gṛham is the accusative of home.",
    )
    _stub(monkeypatch, leaked, leaked)
    r = _run(_reply(ConversationTutor(), native_lang="te"))
    assert r.reply_sa == "", f"Telugu was spoken as Sanskrit: {r.reply_sa!r}"
    assert r.reply_native, "the turn must survive on its native half"
    assert r.source == "llm_no_sanskrit"


def test_script_leak_retries_once_before_giving_up(monkeypatch):
    calls = _stub(
        monkeypatch,
        _say(reply_sa="ಅಹೋ, ಇದು ಬಹಳ ಸರಳम्", reply_native="ಅಹೋ"),
        _say(reply_sa="एतत् सरलम्", reply_native="ಇದು ಸುಲಭ"),
    )
    r = _run(_reply(ConversationTutor()))
    assert r.reply_sa == "एतत् सरलम्", "the retry's clean Sanskrit was not kept"
    assert len(calls) == 2, "the gate must retry once before giving up"
    assert "not pure Devanagari" in calls[1][0], "the retry must say why"


def test_an_invented_sanskrit_word_is_caught_by_vidyut(monkeypatch):
    """Measured on the owner's own example: asked about "Aham henge adini",
    the model invented "आदिनि" as the Sanskrit for "today" (it is अद्य) and
    then confidently explained the invented word. The gate runs on
    `fix.devanagari` for exactly this reason, not only on `reply_sa`."""
    salad = _say(
        reply_sa="अद्य त्वं कथम् असि?",
        reply_native="ಇಂದು ನೀನು ಹೇಗಿದ್ದೀಯ?",
        fix_needed=True,
        fix_dev="फ़लदफ़दफ़ खखख",
        fix_note="replaced the Kannada words",
    )
    _stub(monkeypatch, salad, salad)
    r = _run(_reply(ConversationTutor()))
    assert r.fix_dev == "", "malformed Sanskrit reached the learner as a correction"
    assert r.fix_needed is False, "a fix with nothing in it must not render"
    assert r.fix_note == ""
    assert r.reply_sa, "the rest of the turn must survive"


def test_hindi_labelled_as_sanskrit_is_dropped(monkeypatch):
    """Observed live: the model answered entirely in Hindi in the Sanskrit
    field. Hindi is in the RIGHT script, so the purity gate passes it and
    Vidyut declines it happily — the word-list check is what catches it."""
    hindi = _say(
        reply_sa="बहुत अच्छा! आपका मित्र राम है। क्या आप अच्छे हैं?",
        reply_native="ಬಹಳ ಚೆನ್ನಾಗಿದೆ!",
    )
    _stub(monkeypatch, hindi, hindi)
    r = _run(_reply(ConversationTutor()))
    assert r.reply_sa == "", f"Hindi must not be spoken as Sanskrit: {r.reply_sa!r}"


def test_verbless_sanskrit_still_passes_the_gate(monkeypatch):
    """Sanskrit elides the copula, so "भवान् कः?" has no verb and no pronoun.
    Requiring one broke the outgoing gate on ordinary nominal sentences."""
    _stub(monkeypatch, _say(reply_sa="भवान् कः?", reply_native="ನೀನು ಯಾರು?"))
    r = _run(_reply(ConversationTutor()))
    assert r.reply_sa == "भवान् कः?"
    assert r.source == "llm"


def test_a_turn_with_no_sanskrit_is_legitimate(monkeypatch):
    _stub(monkeypatch, _say(
        reply_native="ಸ್ವಲ್ಪ ನಿಧಾನವಾಗಿ ಹೋಗೋಣ.",
        explain_en="Let's slow down — what does 'gacchāmi' mean to you?",
    ))
    r = _run(_reply(ConversationTutor()))
    assert r.source == "llm_no_sanskrit"
    assert r.reply_sa == ""
    assert r.has_content


def test_model_unreachable_degrades_without_raising(monkeypatch):
    _stub(monkeypatch, None)
    r = _run(_reply(ConversationTutor()))
    assert r.source == "degraded"
    assert r.has_content, "a degraded turn must still say something"


def test_unparseable_model_output_degrades(monkeypatch):
    _stub(monkeypatch, "Sorry, I cannot help with that.")
    r = _run(_reply(ConversationTutor()))
    assert r.source == "degraded"


def test_wrapped_json_envelope_is_unwrapped(monkeypatch):
    """Sarvam -conversations sometimes wraps the payload, the same quirk
    edge_router._deep_edge already guards against."""
    inner = json.loads(_say(reply_sa="भवान् कुत्र वसति?", reply_native="ನೀನು ಎಲ್ಲಿ?"))
    _stub(monkeypatch, json.dumps({"data": inner}))
    r = _run(_reply(ConversationTutor()))
    assert r.reply_sa == "भवान् कुत्र वसति?"


# ─── The language order ─────────────────────────────────────────────────


def test_the_language_is_ordered_in_the_user_message_not_the_system_prompt(monkeypatch):
    """Measured 2026-09-22: with the language rule in the system prompt this
    model collapses to Kannada for almost any input (2/7 languages correct).
    Naming it as an order in the USER message took it to 9/9. Moving this
    back into _SYSTEM_PROMPT silently reintroduces the bug, so the placement
    is asserted, not just the content. services/explainer.py records the
    identical finding for the identical model."""
    calls = _stub(monkeypatch, _say(reply_native="మీరు ఎలా ఉన్నారు?"))
    _run(_reply(ConversationTutor(), native_lang="te"))
    system, user = calls[0]

    assert "Telugu" in user and "తెలుగు" in user, "the order must name the script"
    assert "not optional" in user
    # It must be the LAST thing the model reads, closest to its own turn.
    assert user.rstrip().endswith("Reply with the JSON object only.")
    assert user.index("The learner's own language is") > user.index("The learner's LATEST line")

    # The system prompt may NAME Telugu — the field-purity clause lists the
    # scripts that must stay out of the Sanskrit field, and that list is the
    # gate's whole point. What it must not do is tell the model which language
    # to REPLY in; that decision is per-turn and belongs in the user message.
    assert "The learner's own language is" not in system
    assert "LANGUAGE NAMED IN THE FINAL INSTRUCTION" in system, (
        "the system prompt must defer the choice to the per-turn order"
    )


def test_every_supported_language_has_an_order_phrase():
    from app.services import lang_detect
    for code in lang_detect.LANGUAGES:
        phrase = lang_detect.order_phrase(code)
        assert phrase and phrase != code, code


def test_prompt_carries_history_situation_and_targets(monkeypatch):
    calls = _stub(monkeypatch, _say(reply_native="ಸರಿ"))
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
    calls = _stub(monkeypatch, _say(reply_sa="नमस्ते!", reply_native="ನಮಸ್ಕಾರ!"))
    r = _run(_reply(ConversationTutor(), transcript="", opening=True))
    assert r.reply_sa == "नमस्ते!"
    _, user = calls[0]
    assert "FIRST turn" in user
    assert "nothing to correct" in user


# ─── The endpoint, end to end ───────────────────────────────────────────


@pytest.fixture
def llm_mode(monkeypatch):
    """Run the real router, real gates, real recording — stub only the network.

    `available` is forced on because the test environment has no Sarvam key,
    and an unconfigured tutor makes /conversation/start fall back to graph
    mode by design.

    The language classifier is stubbed to None as well: every utterance here
    is caught by the free layers, and a test that silently reached for the
    paid one would be measuring the wrong thing.
    """
    monkeypatch.setattr(ConversationTutor, "available", property(lambda self: True))

    from app.services.lang_detect import LanguageClassifier

    async def no_classifier(self, text):
        return None

    monkeypatch.setattr(LanguageClassifier, "classify", no_classifier)

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


def _start(client, auth_headers):
    return client.post("/conversation/start", json={}, headers=auth_headers).json()


def test_llm_start_opens_without_a_node_or_edges(client, auth_headers, llm_mode):
    llm_mode(_say(reply_sa="नमस्ते! भवान् कः?", reply_native="ನಮಸ್ಕಾರ! ನೀನು ಯಾರು?"))
    r = client.post("/conversation/start", json={}, headers=auth_headers)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["mode"] == "llm"
    assert d["edges"] == [], "free-form mode offers nothing to choose from"
    assert d["talk"]["reply_devanagari"] == "नमस्ते! भवान् कः?"


def test_the_turn_carries_all_four_jobs(client, auth_headers, llm_mode):
    """The whole point of the rewrite: a turn is a read-back, a fix, a
    bilingual reply and an English explanation — not a line and its gloss."""
    llm_mode(_say(reply_sa="भवान् कः?", reply_native="ನೀನು ಯಾರು?"))
    sid = _start(client, auth_headers)["session_id"]

    llm_mode(_say(
        read_back="You wrote Sanskrit mixed with Kannada.",
        fix_needed=True, fix_dev="अहं कथम् अस्मि?", fix_note="henge is Kannada.",
        reply_sa="अहं कुशली अस्मि।",
        reply_native="ನಾನು ಚೆನ್ನಾಗಿದ್ದೇನೆ.",
        explain_en="katham is the Sanskrit question word for how.",
    ))
    d = client.post(
        "/conversation/turn",
        json={"session_id": sid, "transcript": "Aham henge adini"},
        headers=auth_headers,
    ).json()

    t = d["talk"]
    assert t["read_back"]
    assert t["fix"]["needed"] is True
    assert t["fix"]["devanagari"] == "अहं कथम् अस्मि?"
    assert t["reply_devanagari"] and t["reply_native"] and t["explain_en"]


def test_roman_is_served_for_every_devanagari_line(client, auth_headers, llm_mode):
    """Both scripts, always — the owner asked for Devanagari AND roman, and
    the old screen shipped neither because `iast` was never populated."""
    llm_mode(_say(reply_sa="नमस्ते!", reply_native="ನಮಸ್ಕಾರ!"))
    sid = _start(client, auth_headers)["session_id"]

    llm_mode(_say(
        fix_needed=True, fix_dev="अहं कथम् अस्मि?", fix_note="fixed",
        reply_sa="अहं गच्छामि।", reply_native="ನಾನು ಹೋಗುತ್ತೇನೆ.",
    ))
    t = client.post(
        "/conversation/turn",
        json={"session_id": sid, "transcript": "Aham henge adini"},
        headers=auth_headers,
    ).json()["talk"]

    assert t["reply_roman"] == "ahaṃ gacchāmi."
    assert t["fix"]["roman"] == "ahaṃ katham asmi?"


def test_the_language_follows_what_the_learner_actually_wrote(client, auth_headers, llm_mode):
    """`bridge_langs` is ["en", "hi"] for this learner (see conftest), and
    under the old code that forced English on every turn forever. The reply
    language now comes from the utterance itself."""
    llm_mode(_say(reply_sa="नमस्ते!", reply_native="ನಮಸ್ಕಾರ!"))
    sid = _start(client, auth_headers)["session_id"]

    llm_mode(_say(reply_sa="साधु!", reply_native="మీరు బాగున్నారు."))
    t = client.post(
        "/conversation/turn",
        json={"session_id": sid, "transcript": "నేను ఇంటికి వెళ్తున్నాను"},
        headers=auth_headers,
    ).json()["talk"]

    assert t["native_lang"] == "te", t
    assert t["native_script"] == "telugu"
    assert t["lang_source"] == "script"


def test_the_stt_hint_reaches_the_detector(client, auth_headers, llm_mode):
    """Voice input carries Saaras' own language_code. Nothing read it before."""
    llm_mode(_say(reply_sa="नमस्ते!", reply_native="ನಮಸ್ಕಾರ!"))
    sid = _start(client, auth_headers)["session_id"]

    llm_mode(_say(reply_sa="साधु!", reply_native="நல்லது!"))
    t = client.post(
        "/conversation/turn",
        json={"session_id": sid, "transcript": "that one please", "stt_lang": "ta-IN"},
        headers=auth_headers,
    ).json()["talk"]

    assert t["native_lang"] == "ta"
    assert t["lang_source"] == "stt"


def test_the_language_sticks_across_turns(client, auth_headers, llm_mode):
    """A learner does not switch from Telugu to Tamil halfway. Once settled,
    a short or Sanskrit-only line must not reset them to English."""
    llm_mode(_say(reply_sa="नमस्ते!", reply_native="ನಮಸ್ಕಾರ!"))
    sid = _start(client, auth_headers)["session_id"]

    llm_mode(_say(reply_sa="साधु!", reply_native="మీరు బాగున్నారు."))
    client.post("/conversation/turn",
                json={"session_id": sid, "transcript": "నేను ఇంటికి వెళ్తున్నాను"},
                headers=auth_headers)

    # Now a line of pure Sanskrit — no Telugu in it at all.
    llm_mode(_say(reply_sa="उत्तमम्!", reply_native="చాలా బాగుంది!"))
    t = client.post("/conversation/turn",
                    json={"session_id": sid, "transcript": "अहं गच्छामि"},
                    headers=auth_headers).json()["talk"]

    assert t["native_lang"] == "te", "the session forgot the learner's language"
    assert t["lang_source"].startswith("sticky")


def test_learners_own_name_is_accepted_and_moves_on(client, auth_headers, llm_mode):
    """A name is a correct answer, and the tutor asks something NEW rather
    than repeating the question."""
    llm_mode(_say(reply_sa="भवान् कः?", reply_native="ನೀನು ಯಾರು?"))
    sid = _start(client, auth_headers)["session_id"]

    llm_mode(_say(reply_sa="स्वागतम्! भवान् कुत्र वसति?", reply_native="ಸ್ವಾಗತ!"))
    d = client.post(
        "/conversation/turn",
        json={"session_id": sid, "transcript": "aham anshul asmi"},
        headers=auth_headers,
    ).json()

    assert d["verdict"] == "correct", f"a name is not an error: {d}"
    assert d["escape"] is False
    assert d["correction"] == "", "the learner's own name must never be corrected"
    assert d["talk"]["reply_devanagari"] != "भवान् कः?", "the tutor repeated the question"


def test_llm_turn_never_escapes_even_on_gibberish(client, auth_headers, llm_mode):
    """There is no edge to miss, so there is no escape and no repair ladder."""
    llm_mode(_say(reply_native="ನಮಸ್ಕಾರ!"))
    sid = _start(client, auth_headers)["session_id"]

    llm_mode(_say(reply_native="ಅರ್ಥವಾಗಲಿಲ್ಲ.",
                  explain_en="I did not follow that — try another way?"))
    d = client.post(
        "/conversation/turn",
        json={"session_id": sid, "transcript": "asdf qwer zxcv"},
        headers=auth_headers,
    ).json()
    assert d["escape"] is False
    assert d["verdict"] == "unsure", f"gibberish is unsure, never incorrect: {d}"


def test_history_reaches_the_next_prompt(client, auth_headers, llm_mode, monkeypatch):
    llm_mode(_say(reply_sa="भवान् कः?", reply_native="ನೀನು ಯಾರು?"))
    sid = _start(client, auth_headers)["session_id"]

    seen: list[str] = []
    original = ConversationTutor._complete

    async def spy(self, system, user):
        seen.append(user)
        return await original(self, system, user)

    monkeypatch.setattr(ConversationTutor, "_complete", spy)
    llm_mode(_say(reply_sa="साधु!", reply_native="ಚೆನ್ನಾಗಿದೆ!"))
    client.post("/conversation/turn",
                json={"session_id": sid, "transcript": "aham anshul asmi"},
                headers=auth_headers)

    assert seen, "the turn did not reach the model"
    assert "भवान् कः?" in seen[0], "the tutor was not told what it already asked"


def test_model_outage_degrades_the_turn_not_the_session(client, auth_headers, llm_mode):
    llm_mode(_say(reply_native="ನಮಸ್ಕಾರ!"))
    sid = _start(client, auth_headers)["session_id"]

    llm_mode()   # nothing scripted -> _complete returns None
    d = client.post("/conversation/turn",
                    json={"session_id": sid, "transcript": "aham anshul asmi"},
                    headers=auth_headers).json()
    assert d["degraded"] is True
    assert d["talk"]["explain_en"], "a degraded turn still says something"
    assert d["session_done"] is False


def test_graph_mode_still_available_as_the_fallback(client, auth_headers, llm_mode):
    r = client.post("/conversation/start", json={"mode": "graph"}, headers=auth_headers)
    assert r.status_code == 200
    d = r.json()
    assert d["mode"] == "graph"
    assert d["edges"], "graph mode still offers its authored edges"
    assert d["talk"] is None, "graph mode answers with `node`, not `talk`"


# ─── Regressions caught live against Sarvam, 2026-09-22 ─────────────────
#
# Each test below pins a failure that only showed up when real multi-turn
# conversations ran through the HTTP endpoints against the live model — the
# single-turn and stubbed tests above had all passed while these were live.


def _fresh_learner(client, name: str) -> dict:
    """A learner with no conversation history. The session-scoped
    `auth_headers` learner has sessions from every other test in this file,
    which is exactly the state a language-seeding test must not start from."""
    r = client.post("/auth/dev-login",
                    json={"display_name": name, "bridge_langs": ["en", "hi"]})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


def test_a_new_learner_is_not_greeted_in_hindi(client, llm_mode):
    """The first seeding rule took the first non-English entry of
    `bridge_langs` — and the client hardcodes ["en", "hi"] at every login, so
    EVERY conversation opened in Hindi. The owner's first request was to be
    rid of the Hindi."""
    headers = _fresh_learner(client, "live-regress-new")
    llm_mode(_say(reply_sa="नमस्ते! भवान् कः?", reply_native="Hello! Who are you?"))
    t = client.post("/conversation/start", json={}, headers=headers).json()["talk"]
    assert t["native_lang"] == "en", f"a new learner was greeted in {t['native_lang']!r}"
    assert t["lang_source"] == "default"


def test_a_returning_learner_is_greeted_in_their_own_language(client, llm_mode):
    headers = _fresh_learner(client, "live-regress-returning")
    llm_mode(_say(reply_sa="नमस्ते!", reply_native="Hello!"))
    sid = client.post("/conversation/start", json={}, headers=headers).json()["session_id"]

    llm_mode(_say(reply_sa="साधु!", reply_native="ಚೆನ್ನಾಗಿದೆ!"))
    client.post("/conversation/turn",
                json={"session_id": sid, "transcript": "ನನ್ನ ಹೆಸರು ಅಂಶುಲ್"},
                headers=headers)

    # A brand-new conversation, the next day.
    llm_mode(_say(reply_sa="पुनः स्वागतम्!", reply_native="ಮತ್ತೆ ಸ್ವಾಗತ!"))
    t = client.post("/conversation/start", json={}, headers=headers).json()["talk"]
    assert t["native_lang"] == "kn"
    assert t["lang_source"] == "history"


def test_a_correct_line_is_never_corrected(monkeypatch):
    """Live: "aham kushalah asmi" is correct, Vidyut said so, and the model
    still produced a "say it like this" card for "कुशलः अस्मि" — justified by
    an invented rule about gender agreement. The prompt forbids it; the
    server guard is what makes it impossible."""
    _stub(monkeypatch, _say(
        reply_sa="साधु! त्वं कुशली असि।",
        reply_native="ಒಳ್ಳೆಯದು!",
        fix_needed=True,
        fix_dev="कुशलः अस्मि",
        fix_note="The adjective needs to agree in gender.",
    ))
    r = _run(_reply(ConversationTutor(), transcript="aham kushalah asmi"))
    assert r.fix_needed is False, f"a correct line was corrected: {r.fix_dev!r}"
    assert r.fix_dev == "" and r.fix_note == ""
    assert r.reply_sa, "the rest of the turn must survive"


def test_the_model_is_told_the_verdict_not_left_to_infer_it(monkeypatch):
    calls = _stub(monkeypatch, _say(reply_sa="साधु!", reply_native="ಒಳ್ಳೆಯದು!"))
    _run(_reply(ConversationTutor(), transcript="aham kushalah asmi"))
    _, user = calls[0]
    assert "CORRECT Sanskrit" in user


def test_a_real_mistake_still_gets_its_fix(monkeypatch):
    """The guard keys on Vidyut's verdict, so a genuinely mixed line keeps it."""
    _stub(monkeypatch, _say(
        reply_sa="अहं कुशली अस्मि।",
        reply_native="ನಾನು ಚೆನ್ನಾಗಿದ್ದೇನೆ.",
        fix_needed=True,
        fix_dev="अहं कथम् अस्मि?",
        fix_note="henge is Kannada.",
    ))
    r = _run(_reply(ConversationTutor(), transcript="Aham henge adini"))
    assert r.fix_needed and r.fix_dev == "अहं कथम् अस्मि?"


@pytest.mark.parametrize(
    "text",
    ["మమ నామ అన్షుల్", "ಅಹಂ ಗಚ್ಛಾಮಿ", "ಅಹಂ ಕುಶಲಃ ಅಸ್ಮಿ", "অহং গচ্ছামি"],
)
def test_sanskrit_written_in_a_native_script_is_read_as_sanskrit(text):
    """Karnataka and Andhra schools teach Sanskrit in the regional script.
    Vidyut reads only Devanagari/IAST, so these parsed 0% and the tutor was
    told to "correct nothing" — then corrected "మమ నామ అన్షుల్" anyway,
    claiming the learner had omitted अस्ति."""
    h = sanskrit_health(text)
    assert h.ok and h.looks_sanskrit, f"{text!r} is correct Sanskrit: {h}"


@pytest.mark.parametrize(
    "text",
    ["నేను ఇంటికి వెళ్తున్నాను", "ನಾನು ಶಾಲೆಗೆ ಹೋಗುತ್ತೇನೆ", "ഞാൻ വീട്ടിൽ പോകുന്നു",
     "ನನ್ನ ಹೆಸರು ಅಂಶುಲ್. ಸಂಸ್ಕೃತದಲ್ಲಿ ಹೇಗೆ ಹೇಳೋದು?"],
)
def test_a_native_language_sentence_is_not_mistaken_for_sanskrit(text):
    """The other side of the same change: transliterating a learner's own
    language into Devanagari must not make it look like Sanskrit."""
    assert not sanskrit_health(text).looks_sanskrit, text


def test_tamil_script_is_left_alone():
    """Tamil script has no voiced or aspirated stops, so Sanskrit in it cannot
    be recovered: "கச்சாமி" would come back "कच्चामि", not "गच्छामि", and a
    correct word would be reported unreadable."""
    from app.services.tutor import as_devanagari
    assert as_devanagari("அஹம் கச்சாமி") == "அஹம் கச்சாமி"


def test_explain_works_in_llm_mode(client, auth_headers, llm_mode, monkeypatch):
    """Live: every "what does that mean?" in the free-form tutor 404'd. The
    endpoint looked for a graph node, and LLM mode has none. Silent to the
    learner, who saw only a generic apology."""
    llm_mode(_say(reply_sa="भवान् कः?", reply_native="ನೀನು ಯಾರು?"))
    sid = _start(client, auth_headers)["session_id"]

    seen: dict = {}

    async def fake_explain(self, line, **kw):
        seen["line"] = line
        seen.update(kw)
        return "It asks who you are."

    from app.services.explainer import Explainer
    monkeypatch.setattr(Explainer, "explain", fake_explain)

    r = client.post("/conversation/explain",
                    json={"session_id": sid, "question": "what does that mean?"},
                    headers=auth_headers)
    assert r.status_code == 200, r.text
    assert r.json()["explanation"] == "It asks who you are."
    assert seen["line"] == "भवान् कः?", "the wrong line was explained"
    assert seen["iast"] == "bhavān kaḥ?", "the lipi IAST should ride along as ground truth"


def test_a_meta_question_points_at_the_tutors_real_line(client, auth_headers, llm_mode):
    """The meta-intent response used to re-parse the line out of the flattened
    history text, which now carries correction notes. It reads the row."""
    llm_mode(_say(reply_sa="भवान् कः?", reply_native="ನೀನು ಯಾರು?"))
    sid = _start(client, auth_headers)["session_id"]
    llm_mode(_say(reply_sa="भवान् कुत्र वसति?", reply_native="ನೀನು ಎಲ್ಲಿ ವಾಸಿಸುತ್ತೀಯ?",
                  fix_needed=True, fix_dev="अहं गच्छामि", fix_note="a note that must not leak"))
    client.post("/conversation/turn",
                json={"session_id": sid, "transcript": "Aham henge adini"},
                headers=auth_headers)

    d = client.post("/conversation/turn",
                    json={"session_id": sid, "transcript": "what does that mean?"},
                    headers=auth_headers).json()
    assert d["meta_intent"] == "explain"
    assert d["node"]["devanagari"] == "भवान् कुत्र वसति?"
    assert "must not leak" not in d["node"]["devanagari"]


# ─── Second live round, 2026-09-22 ──────────────────────────────────────


def test_devanagari_pasted_into_a_telugu_line_is_rewritten_in_telugu():
    """Live: "నీ పేరు अंशुల్" — the model copied the name out of its own
    Sanskrit line, so one Telugu sentence carried two scripts and two fonts."""
    from app.services.tutor import localize_devanagari
    out = localize_devanagari("నీ పేరు अंशुల్ అని విన్నాను.", "te")
    assert out == "నీ పేరు అంశుల్ అని విన్నాను."
    assert not any("ऀ" <= c <= "ॿ" for c in out if c.isalpha())


def test_danda_survives_localization():
    from app.services.tutor import localize_devanagari
    assert localize_devanagari("ಹೌದು, अहं गच्छामि। ಸರಿ.", "kn") == "ಹೌದು, ಅಹಂ ಗಚ್ಛಾಮಿ। ಸರಿ."


@pytest.mark.parametrize("lang,text", [("hi", "मैं घर जा रहा हूँ"),
                                       ("mr", "मी घरी जात आहे"),
                                       ("en", "you said अहम्")])
def test_localization_leaves_devanagari_languages_and_english_alone(lang, text):
    """Hindi and Marathi ARE Devanagari. English lines quote Sanskrit in
    Devanagari on purpose — there is no Latin rendering to prefer."""
    from app.services.tutor import localize_devanagari
    assert localize_devanagari(text, lang) == text


def test_the_native_line_is_localized_on_the_way_out(monkeypatch):
    _stub(monkeypatch, _say(reply_sa="भवतः नाम अंशुल्।",
                            reply_native="నీ పేరు अंशुल्."))
    r = _run(_reply(ConversationTutor(), native_lang="te"))
    assert r.reply_native == "నీ పేరు అంశుల్."


def test_already_asked_questions_are_listed_for_the_model(monkeypatch):
    """Live: "भवान् कुत्र वसति?" asked four times in one conversation, under
    a system-prompt rule saying never to repeat. The literal list, next to
    the model's turn, is what this model actually follows."""
    calls = _stub(monkeypatch, _say(reply_sa="साधु!", reply_native="ಸರಿ"))
    _run(_reply(
        ConversationTutor(),
        history=[
            {"role": "tutor", "text": "स्वागतम्। भवान् कुत्र वसति? / Welcome."},
            {"role": "learner", "text": "Aham henge adini"},
            {"role": "tutor", "text": "अहं कुशलः अस्मि। भवान् कुत्र वसति? / x"},
        ],
    ))
    _, user = calls[0]
    assert "ALREADY asked" in user
    assert user.count("भवान् कुत्र वसति?") >= 1
    listed = user.split("ALREADY asked")[1]
    assert listed.count("भवान् कुत्र वसति?") == 1, "the list must be deduplicated"


def test_a_correction_note_is_never_mistaken_for_a_question():
    from app.services.tutor import asked_questions
    h = [{"role": "tutor",
          "text": "साधु। / ok  [you already corrected: did you mean kutra?]"}]
    assert asked_questions(h) == []


def test_the_model_is_told_when_native_script_is_sanskrit(monkeypatch):
    """Live: the model saw Telugu letters and called a correct Sanskrit line
    "asking how to say it in Sanskrit"."""
    calls = _stub(monkeypatch, _say(reply_sa="साधु!", reply_native="సరే"))
    _run(_reply(ConversationTutor(), transcript="మమ నామ అన్షుల్", native_lang="te"))
    _, user = calls[0]
    assert "wrote SANSKRIT in their own script" in user
    assert "मम नाम" in user, "the Devanagari reading must be handed over"


def test_a_native_language_line_gets_no_sanskrit_note(monkeypatch):
    calls = _stub(monkeypatch, _say(reply_sa="साधु!", reply_native="సరే"))
    _run(_reply(ConversationTutor(), transcript="నేను ఇంటికి వెళ్తున్నాను", native_lang="te"))
    _, user = calls[0]
    assert "wrote SANSKRIT in their own script" not in user


def test_the_prompt_forbids_labelling_the_tutors_own_grammar():
    """Live: about 7 of 16 WHY paragraphs mis-labelled the tutor's OWN words
    (आगच्छति called first person, कुत्र and अद्य called locative). explainer.py
    already forbids this model from making grammatical claims for the same
    reason; the tutor may label only what Vidyut analysed."""
    from app.services.tutor import _SYSTEM_PROMPT
    assert "ONLY for a word whose form appears in the Vidyut analysis" in _SYSTEM_PROMPT
    assert "indeclinables" in _SYSTEM_PROMPT


def test_no_example_name_in_the_prompt_can_leak_into_a_reply():
    """Live: with "मम नाम रामः" as the copula example, the tutor told a
    learner "मदीयं नाम अपि रामः" — "my name is also Rama"."""
    from app.services.tutor import _SYSTEM_PROMPT
    assert "रामः" not in _SYSTEM_PROMPT


# ─── Third live round: the translator, detected ─────────────────────────


_MIRROR = dict(
    reply_sa="अहं कुशली अस्मि। भवान् कथम् अस्ति?",
    reply_native="ನಾನು ಚೆನ್ನಾಗಿದ್ದೇನೆ. ನೀವು ಹೇಗಿದ್ದೀರಾ?",
    fix_needed=True,
    fix_dev="अहं कुशली अस्मि। भवान् कथम् अस्ति?",
    fix_note="You wrote in Kannada.",
)


def test_a_reply_that_mirrors_the_fix_is_retried(monkeypatch):
    """The owner's first complaint, word for word: "Looks like its just
    translating what we are saying." Live: "naanu chennagiddini, neevu
    hegiddira?" drew a reply identical to the fix — their own sentence,
    translated, presented as the tutor talking."""
    calls = _stub(
        monkeypatch,
        _say(**_MIRROR),
        _say(reply_sa="अहम् अपि कुशली अस्मि, धन्यवादः। अद्य किं पठसि?",
             reply_native="ನಾನೂ ಚೆನ್ನಾಗಿದ್ದೇನೆ, ಧನ್ಯವಾದ. ಇಂದು ಏನು ಓದುತ್ತಿದ್ದೀಯ?",
             fix_needed=True, fix_dev=_MIRROR["fix_dev"], fix_note="x"),
    )
    r = _run(_reply(ConversationTutor(), transcript="naanu chennagiddini, neevu hegiddira?"))
    assert len(calls) == 2, "a mirrored reply must be retried once"
    assert "translating the learner's line back" in calls[1][0]
    assert r.reply_sa.startswith("अहम् अपि कुशली"), "the retry's own answer was not kept"
    assert r.fix_dev == _MIRROR["fix_dev"], "the fix itself is right and must survive"


def test_a_mirror_is_kept_rather_than_losing_the_turn(monkeypatch):
    """A mirror is a complete, valid turn. If the retry is worse — here the
    model is unreachable — the learner still gets the mirror, not an apology."""
    queue = [_say(**_MIRROR), None]

    async def fake_complete(self, system, user):
        return queue.pop(0)

    monkeypatch.setattr(ConversationTutor, "_complete", fake_complete)
    r = _run(_reply(ConversationTutor(), transcript="naanu chennagiddini"))
    assert r.source == "llm", f"the turn degraded instead of keeping the mirror: {r}"
    assert r.reply_sa == _MIRROR["reply_sa"]


def test_a_mirror_is_kept_over_a_retry_whose_sanskrit_fails_the_gate(monkeypatch):
    _stub(monkeypatch, _say(**_MIRROR),
          _say(reply_sa="ಅಹೋ, ಇದು ಬಹಳ ಸರಳम्", reply_native="ಅಹೋ"))
    r = _run(_reply(ConversationTutor(), transcript="naanu chennagiddini"))
    assert r.reply_sa == _MIRROR["reply_sa"], "a complete turn was traded for a partial one"


@pytest.mark.parametrize(
    "reply_sa,fix_dev,expected",
    [
        ("अहं कुशली अस्मि।", "अहं कुशली अस्मि", True),            # punctuation only
        ("अहं कुशली अस्मि। भवान्?", "अहं कुशली अस्मि।", True),       # fix is most of it
        # Live: the fix plus a short tail, 61% of the reply. Missed at 70%.
        ("अहं कुशली अस्मि। भवान् कथम् अस्ति? अद्य अत्र अध्ययनं कुर्मः।",
         "अहं कुशली अस्मि, भवान् कथम् अस्ति?", True),
        ("साधु! अहं कुशली अस्मि।", "अहं कुशली अस्मि", True),         # not only at the start
        ("अहं कुशली अस्मि। अद्य किं पठसि? कुत्र वससि?", "अहं कुशली अस्मि।", False),
        ("अहम् अपि कुशली अस्मि।", "अहं कुशली अस्मि।", False),       # a real answer
        ("साधु!", "", False),                                        # no fix at all
    ],
)
def test_mirror_detection(reply_sa, fix_dev, expected):
    from app.services.tutor import TutorReply, mirrors_fix
    assert mirrors_fix(TutorReply(reply_sa=reply_sa, fix_dev=fix_dev)) is expected


@pytest.mark.parametrize(
    "reply_sa,fix_needed,expected",
    [
        # Live 2026-09-23: 10 of 21 correction turns opened like these.
        ("सत्यम्। भवान् कुत्र गच्छति?", True, True),
        ("सम्यक्! अद्य किं पठसि?", True, True),
        ("'सत्यम्', भवान् सम्यक् वदति।", True, True),
        # Praising the FIX is right; so is encouraging the attempt.
        ("अहो, वयम् गच्छामः इति सम्यक्। अद्य भवान् कुत्र गच्छति?", True, False),
        ("उत्तमः प्रयासः! वयम् गच्छामः इति वक्तुं शक्यते।", True, False),
        # A correct line may be called correct.
        ("सत्यम्। भवान् कुत्र गच्छति?", False, False),
    ],
)
def test_affirming_a_line_the_turn_corrects(reply_sa, fix_needed, expected):
    from app.services.tutor import TutorReply, affirms_a_fixed_line
    reply = TutorReply(reply_sa=reply_sa, fix_needed=fix_needed, fix_dev="अहं गच्छामि।" if fix_needed else "")
    assert affirms_a_fixed_line(reply) is expected


def test_a_reply_calling_a_corrected_line_right_is_retried(monkeypatch):
    """"Correct." beside a card saying it was wrong: the learner cannot tell
    which to believe."""
    calls = _stub(
        monkeypatch,
        _say(reply_sa="सत्यम्। भवान् कुत्र गच्छति?", reply_native="Right. Where are you going?",
             fix_needed=True, fix_dev="अहं विद्यालयं गच्छामि।", fix_note="Use the first person."),
        _say(reply_sa="उत्तमः प्रयासः! भवान् कुत्र गच्छति?", reply_native="Good try! Where are you going?",
             fix_needed=True, fix_dev="अहं विद्यालयं गच्छामि।", fix_note="Use the first person."),
    )
    r = _run(_reply(ConversationTutor(), transcript="अहं विद्यालयं गच्छसि।"))
    assert len(calls) == 2, "a reply affirming a corrected line must be retried once"
    assert "telling the learner their line was right" in calls[1][0]
    assert r.reply_sa.startswith("उत्तमः प्रयासः")
    assert r.fix_dev == "अहं विद्यालयं गच्छामि।"


def test_devanagari_in_a_tamil_line_is_rewritten_with_superscripts():
    """Live: a Tamil line opened "उत्तमம्" — half Devanagari, half Tamil,
    inside one word. Recovering Sanskrit FROM Tamil is lossy, but writing it
    INTO Tamil is not: vidyut.lipi's superscript convention keeps voicing
    and aspiration (गच्छामि -> க³ச்சா²மி)."""
    from app.services.tutor import localize_devanagari
    assert localize_devanagari("उत्तमம். நீங்கள்?", "ta") == "உத்தமம். நீங்கள்?"
    assert localize_devanagari("'गच्छामि' என்று", "ta") == "'க³ச்சா²மி' என்று"


# ─── Fourth live round: every soft problem, one retry ───────────────────

_ASKED_HISTORY = [
    {"role": "tutor", "text": "स्वागतम्! भवान् कुतः आगतः? / Welcome! Where are you from?"},
    {"role": "learner", "text": "vanakkam"},
]


def test_a_repeated_question_is_retried(monkeypatch):
    """Live: "भवान् कुतः आगतः?" came back as "अद्य भवान् कुतः आगतः?" twice
    more — the same question with "today" bolted on, under a prompt that
    listed it as already asked."""
    calls = _stub(
        monkeypatch,
        _say(reply_sa="उत्तमम्। अद्य भवान् कुतः आगतः?", reply_native="நல்லது. இன்று எங்கிருந்து வந்தாய்?"),
        _say(reply_sa="उत्तमम्। भवान् किं पठति?", reply_native="நல்லது. நீ என்ன படிக்கிறாய்?"),
    )
    r = _run(_reply(ConversationTutor(), history=_ASKED_HISTORY, native_lang="ta"))
    assert len(calls) == 2, "a repeated question must be retried once"
    assert "you already asked that" in calls[1][0]
    assert r.reply_sa == "उत्तमम्। भवान् किं पठति?"


def test_repeat_detection_uses_containment_not_equality():
    from app.services.tutor import repeated_questions
    asked = ["भवान् कुतः आगतः?"]
    assert repeated_questions("उत्तमम्। अद्य भवान् कुतः आगतः?", asked)
    assert not repeated_questions("उत्तमम्। भवान् किं पठति?", asked)


def test_a_very_short_asked_question_cannot_match_everything():
    from app.services.tutor import repeated_questions
    assert not repeated_questions("भवान् किं पठति?", ["किम्?"])


def test_another_indic_script_in_the_native_line_is_retried(monkeypatch):
    """Live, twice: a session opened in Kannada, the learner switched to
    Telugu, and the Telugu reply ended in a Kannada phrase copied from the
    opening. Those are Kannada words — transliterating the letters would not
    make them Telugu — so the model has to rewrite it."""
    calls = _stub(
        monkeypatch,
        _say(reply_sa="साधु।", reply_native="మీ పేరు అంశుల్. మీరు ಎಲ್ಲಿಂದ ಬರುತ್ತೀರಿ?"),
        _say(reply_sa="साधु।", reply_native="మీ పేరు అంశుల్. మీరు ఎక్కడి నుండి వచ్చారు?"),
    )
    r = _run(_reply(ConversationTutor(), native_lang="te"))
    assert len(calls) == 2
    assert "mixed in Kannada" in calls[1][0]
    assert "ಎಲ್ಲಿಂದ" not in r.reply_native


def test_the_retry_is_kept_only_if_it_is_not_worse(monkeypatch):
    """One soft problem in the first reply, two in the retry: the learner
    gets the first."""
    first = _say(reply_sa="उत्तमम्। अद्य भवान् कुतः आगतः?", reply_native="நல்லது.")
    worse = _say(reply_sa="उत्तमम्। अद्य भवान् कुतः आगतः?",
                 reply_native="நல்லது. ಎಲ್ಲಿಂದ ಬರುತ್ತೀರಿ?")
    _stub(monkeypatch, first, worse)
    r = _run(_reply(ConversationTutor(), history=_ASKED_HISTORY, native_lang="ta"))
    assert "ಎಲ್ಲಿಂದ" not in r.reply_native, "a worse retry replaced a better first reply"


def test_several_problems_are_named_in_one_retry(monkeypatch):
    """At most two calls per turn, however many things were wrong."""
    calls = _stub(
        monkeypatch,
        _say(reply_sa="अहं कुशली अस्मि। भवान् कुतः आगतः?",
             reply_native="நான் நலம். ಎಲ್ಲಿಂದ?",
             fix_needed=True, fix_dev="अहं कुशली अस्मि। भवान् कुतः आगतः?", fix_note="x"),
        _say(reply_sa="अहम् अपि कुशली अस्मि।", reply_native="நானும் நலம்.",
             fix_needed=True, fix_dev="अहं कुशली अस्मि। भवान् कुतः आगतः?", fix_note="x"),
    )
    _run(_reply(ConversationTutor(), history=_ASKED_HISTORY, native_lang="ta"))
    assert len(calls) == 2
    nudge = calls[1][0]
    assert "translating the learner's line back" in nudge
    assert "you already asked that" in nudge
    assert "mixed in Kannada" in nudge


# ─── Person agreement ───────────────────────────────────────────────────
#
# Found while testing the correction guard against live Sarvam: Vidyut's
# `ok` means every word is a real form, not that the words agree. The guard
# trusted it, so "aham gacchasi" — the most common beginner mistake there is —
# would have had its real correction silently discarded.


@pytest.mark.parametrize(
    "text",
    ["aham gacchasi", "tvam gacchami", "aham gacchati", "ahaṃ chātraḥ asi", "अहं गच्छसि।"],
)
def test_a_person_mismatch_is_caught(text):
    from app.services.tutor import agreement_errors
    errors = agreement_errors(text)
    assert errors, f"{text!r} is wrong and was not caught"
    assert "person" in errors[0]


@pytest.mark.parametrize(
    "text",
    [
        "aham gacchami",
        "अहं छात्रः अस्मि",
        "aham gacchāmi tvam gacchasi",   # two clauses, each agrees
        "aham jānāmi saḥ gacchati",      # a third-person clause is not a mismatch
        "aham gacchāmi, tvam?",          # ellipsis: correct, and must abstain
        "अहं गच्छामि। त्वम्?",           # the same across a sentence break
        "aham chatrah",                  # no verb at all: the copula is optional
        "bhavān gacchati",               # honorific takes the third person
        "yūyam gacchatha",
    ],
)
def test_correct_sanskrit_is_never_accused(text):
    """§6.3: abstaining is always allowed, accusing is not."""
    from app.services.tutor import agreement_errors
    assert agreement_errors(text) == [], f"{text!r} is correct"


def test_ok_is_not_the_same_as_correct():
    h = sanskrit_health("aham gacchasi")
    assert h.ok, "every word IS a real form"
    assert not h.is_correct, "but the line is wrong"


def test_the_guard_keeps_a_real_agreement_fix(monkeypatch):
    """The regression this section exists for."""
    _stub(monkeypatch, _say(
        reply_sa="अहं गच्छामि इति वद।",
        reply_native="ನಾನು ಹೋಗುತ್ತೇನೆ.",
        fix_needed=True,
        fix_dev="अहं गच्छामि",
        fix_note="aham takes a first-person verb.",
    ))
    r = _run(_reply(ConversationTutor(), transcript="aham gacchasi"))
    assert r.fix_needed and r.fix_dev == "अहं गच्छामि", "a real correction was discarded"


def test_the_model_is_told_about_the_agreement_error(monkeypatch):
    calls = _stub(monkeypatch, _say(reply_sa="साधु।", reply_native="ಸರಿ"))
    _run(_reply(ConversationTutor(), transcript="aham gacchasi"))
    _, user = calls[0]
    assert "REAL grammatical error" in user
    assert "first-person singular" in user
    assert "CORRECT Sanskrit" not in user, "a wrong line must not be called correct"


def test_the_tutors_own_sanskrit_must_agree(monkeypatch):
    """The outgoing gate: "अहं गच्छति" parses word by word, and saying it to
    a learner teaches the exact mistake they are here to stop making."""
    bad = _say(reply_sa="अहं गच्छति।", reply_native="ನಾನು ಹೋಗುತ್ತಾನೆ")
    calls = _stub(monkeypatch, bad, bad)
    r = _run(_reply(ConversationTutor()))
    assert r.reply_sa == "", "a mismatched sentence reached the learner"
    assert len(calls) == 2, "it must be retried like any other gate failure"


def test_an_agreement_error_is_off_by_one_not_correct(client, auth_headers, llm_mode):
    """It used to fall through to "correct" and earn full XP."""
    llm_mode(_say(reply_sa="नमस्ते!", reply_native="Hello!"))
    sid = _start(client, auth_headers)["session_id"]
    llm_mode(_say(reply_sa="अहं गच्छामि इति वद।", reply_native="Say I go.",
                  fix_needed=True, fix_dev="अहं गच्छामि", fix_note="aham needs gacchāmi."))
    d = client.post("/conversation/turn",
                    json={"session_id": sid, "transcript": "aham gacchasi"},
                    headers=auth_headers).json()
    assert d["verdict"] == "off_by_one", d["verdict"]
    assert d["talk"]["fix"]["needed"] is True


# ─── Stray letters and the wrong kind of "native" line ──────────────────


def test_a_stray_native_letter_in_the_sanskrit_is_repaired(monkeypatch):
    """Live: "ಅहम् अपि गच्छामि" — one Kannada letter, 96% Devanagari, so it
    cleared the purity floor and reached the learner as a two-script word."""
    _stub(monkeypatch, _say(reply_sa="ಅहम् अपि गच्छामि।", reply_native="ನಾನೂ ಹೋಗುತ್ತೇನೆ."))
    r = _run(_reply(ConversationTutor()))
    assert r.reply_sa == "अहम् अपि गच्छामि।", r.reply_sa
    assert r.reply_sa_iast.startswith("aham api"), "the roman line must be clean too"


def test_a_stray_letter_that_cannot_be_repaired_is_rejected(monkeypatch):
    """Tamil letters cannot be turned back into Sanskrit losslessly, so the
    line is dropped rather than guessed at."""
    bad = _say(reply_sa="अहं க गच्छामि अपि च।", reply_native="நானும்.")
    _stub(monkeypatch, bad, bad)
    r = _run(_reply(ConversationTutor(), native_lang="ta"))
    assert r.reply_sa == ""


def test_a_single_sinhala_letter_in_a_telugu_line_is_caught():
    """Live: "సువසాగతం" — one Sinhala letter inside a Telugu word. Sinhala is
    not a script Talk supports, which is exactly why the check covers the
    whole Indic range and not only the supported ones."""
    from app.services.tutor import foreign_script_in_native
    assert foreign_script_in_native("సువసాగతం", "te") == ""
    assert foreign_script_in_native("సువසాగతం", "te") != ""


def test_sanskrit_in_telugu_letters_is_not_a_telugu_reply():
    """Live: the "Telugu" line was "మమ నామ మిత్రమ్. భవాన్ కుత్త్ అస్తి?" —
    the Sanskrit reply in Telugu LETTERS. A Telugu reader got nothing they
    could understand."""
    from app.services.tutor import native_line_is_sanskrit
    assert native_line_is_sanskrit("మమ నామ మిత్రమ్. భవాన్ కథమ్ అస్తి?", "te")
    assert not native_line_is_sanskrit("నా పేరు మిత్రం. మీరు ఎలా ఉన్నారు?", "te")


def test_a_transliterated_native_line_is_retried(monkeypatch):
    calls = _stub(
        monkeypatch,
        _say(reply_sa="मम नाम मित्रम्। भवान् कथम् अस्ति?",
             reply_native="మమ నామ మిత్రమ్. భవాన్ కథమ్ అస్తి?"),
        _say(reply_sa="मम नाम मित्रम्। भवान् कथम् अस्ति?",
             reply_native="నా పేరు మిత్రం. మీరు ఎలా ఉన్నారు?"),
    )
    r = _run(_reply(ConversationTutor(), native_lang="te"))
    assert len(calls) == 2
    assert "TRANSLATED into the Telugu language" in calls[1][0]
    assert r.reply_native == "నా పేరు మిత్రం. మీరు ఎలా ఉన్నారు?"


@pytest.mark.parametrize(
    "line,lang",
    [
        ("'അഹം ഗൃഹം ഗച്ഛാമി' എന്ന് പറയാം.", "ml"),   # quotes the Sanskrit: right
        ("“ಅಹಂ ಗಚ್ಛಾಮಿ” ಎಂದು ಹೇಳಬಹುದು.", "kn"),
        ("అహం గచ్ఛామి అని చెప్పవచ్చు.", "te"),        # unquoted, but half Telugu
        # Live false alarm: a Malayalam sentence, then the Sanskrit example
        # unquoted. "ലളിതം" is Sanskrit "lalita", so as one line it read 75%.
        ("ഇത് ലളിതമാണ്. ഗൃഹം ഗച്ഛാമി.", "ml"),
    ],
)
def test_a_native_line_that_quotes_the_sanskrit_is_not_flagged(line, lang):
    """A quoting native sentence is exactly what a tutor should write, and a
    quoted sentence can be most of a short line — measured at 60% parsed
    before quotes were stripped, against 83% for a truly transliterated one."""
    from app.services.tutor import native_line_is_sanskrit
    assert not native_line_is_sanskrit(line, lang), line
