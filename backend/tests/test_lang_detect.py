"""Which language did the learner just speak?

The free layers (script scan, marker table) are pure functions and are tested
directly. The classifier is stubbed at `LanguageClassifier.classify` — no test
here reaches Sarvam — so the resolver's ORDERING is what gets exercised: which
layer wins, and when the paid one is skipped entirely.
"""

from __future__ import annotations

import asyncio

import pytest

from app.services import lang_detect
from app.services.lang_detect import (
    LanguageClassifier,
    detect_free,
    normalize_code,
    order_phrase,
    resolve_language,
    script_share,
)


def _run(coro):
    return asyncio.run(coro)


# ─── Layer 1: the script scan ───────────────────────────────────────────


@pytest.mark.parametrize(
    "text,expected",
    [
        ("ನನ್ನ ಹೆಸರು ಅನ್ಶುಲ್", "kn"),
        ("నేను ఇంటికి వెళ్తున్నాను", "te"),
        ("என் பெயர் அன்ஷுல்", "ta"),
        ("ഞാൻ വീട്ടിൽ പോകുന്നു", "ml"),
        ("আমার নাম অংশুল", "bn"),
        ("મારું નામ અંશુલ", "gu"),
        ("ਮੇਰਾ ਨਾਮ ਅੰਸ਼ੁਲ", "pa"),
        ("ମୋ ନାମ ଅଂଶୁଲ", "or"),
    ],
)
def test_a_unique_script_is_decisive(text, expected):
    code, how = detect_free(text)
    assert code == expected, f"{text!r} -> {code}"
    assert how == "script"


def test_code_mixed_native_script_still_reads():
    """"അഹം ഗച്ഛാമി correct aano?" is under half Malayalam by letter count but
    is unmistakably a Malayalam speaker. The floor is 0.30 for this reason."""
    code, how = detect_free("അഹം ഗച്ഛാമി correct aano?")
    assert code == "ml"
    assert how == "script"


def test_script_share_ignores_punctuation_and_digits():
    # Letters only: a short line is otherwise diluted below any useful floor.
    assert script_share("ಹೇಗೆ?! 123", *lang_detect.LANGUAGES["kn"].block) == 1.0


# ─── Devanagari is ambiguous ────────────────────────────────────────────


def test_hindi_in_devanagari_is_hindi():
    code, how = detect_free("मुझे संस्कृत में कैसे कहना है")
    assert code == "hi"
    assert how == "devanagari"


def test_marathi_in_devanagari_is_marathi():
    code, how = detect_free("मला संस्कृत मध्ये कसा बोलायचा आहे")
    assert code == "mr"


def test_sanskrit_in_devanagari_is_not_a_bridge_language():
    """Sanskrit is the subject being taught, never the language to reply in.
    Abstaining here is what lets the session keep the language it had."""
    code, how = detect_free("अहं गृहं गच्छामि")
    assert code is None, f"Sanskrit was mistaken for a bridge language: {code}"
    assert how == "devanagari"


# ─── Layer 2: the romanized marker table ────────────────────────────────


@pytest.mark.parametrize(
    "text,expected",
    [
        ("Aham henge adini", "kn"),
        ("nanna hesaru anshul", "kn"),
        ("nenu ela unnanu", "te"),
        ("naan porein nu sanskrit la epdi solrathu", "ta"),
        ("njan pokunnu ennu engane parayum", "ml"),
        ("mujhe kaise kehna hai", "hi"),
        ("mala kasa bolaycha aahe", "mr"),
        ("amar naam anshul, kibhabe bolbo", "bn"),
    ],
)
def test_romanized_markers_catch_the_common_giveaways(text, expected):
    code, how = detect_free(text)
    assert code == expected, f"{text!r} -> {code}"
    assert how == "marker"


def test_the_owners_own_line_is_caught_for_free():
    """Regression, and the reason the marker table runs BEFORE the classifier.

    Measured 2026-09-22: the LLM classifier scores 16/17 on romanized input
    and its single miss is this exact line — it answers Telugu at
    confidence 1.0. The model is *confidently* wrong, so confidence is never
    thresholded anywhere in this module; "henge" is decisive and free.
    """
    assert detect_free("Aham henge adini") == ("kn", "marker")


def test_plain_english_abstains_rather_than_guessing():
    code, _ = detect_free("how do I say I am going home in sanskrit")
    assert code is None


# ─── The resolver's ordering ────────────────────────────────────────────


def _never_called(monkeypatch):
    """Fail loudly if the paid layer is reached."""
    async def boom(self, text):
        raise AssertionError(f"the classifier was called for {text!r}")
    monkeypatch.setattr(LanguageClassifier, "classify", boom)


def _classifier_says(monkeypatch, code):
    calls: list[str] = []

    async def fake(self, text):
        calls.append(text)
        return code

    monkeypatch.setattr(LanguageClassifier, "classify", fake)
    return calls


def test_a_free_hit_never_pays_for_the_classifier(monkeypatch):
    _never_called(monkeypatch)
    assert _run(resolve_language("ನನ್ನ ಹೆಸರು ಅನ್ಶುಲ್")) == ("kn", "script")
    assert _run(resolve_language("Aham henge adini")) == ("kn", "marker")


def test_sanskrit_keeps_the_session_language(monkeypatch):
    """A learner writing pure Sanskrit has not switched to English."""
    _never_called(monkeypatch)
    code, how = _run(resolve_language("अहं गृहं गच्छामि", sticky="te"))
    assert code == "te"
    assert how == "sticky(sanskrit)"


def test_the_stt_hint_beats_the_classifier(monkeypatch):
    """Saaras already returns what it detected and it costs nothing.

    The line here deliberately trips no marker — a marker hit is decisive and
    would (correctly) win first, which is asserted separately below.
    """
    _never_called(monkeypatch)
    code, how = _run(resolve_language("that one please", stt_hint="ta-IN"))
    assert code == "ta"
    assert how == "stt"


def test_saaras_hearing_sanskrit_names_no_bridge_language(monkeypatch):
    """The Sanskrit STT pass (services/learner_stt.py) reports sa-IN.

    Sanskrit is the subject, never the learner's language, so the session's
    language carries the turn — and the classifier, built for romanized
    lines, is not paid to look at a Devanagari one.
    """
    _never_called(monkeypatch)
    assert _run(resolve_language("अहं विद्यालयं गच्छामि।", sticky="kn", stt_hint="sa-IN")) == (
        "kn", "sticky(sanskrit)")
    assert _run(resolve_language("अहं विद्यालयं गच्छामि।", stt_hint="sa-IN")) == (
        "en", "stt(sanskrit)")


def test_santali_is_not_sanskrit():
    assert lang_detect.is_sanskrit_code("sa-IN")
    assert lang_detect.is_sanskrit_code("sa")
    assert not lang_detect.is_sanskrit_code("sat-IN")
    assert not lang_detect.is_sanskrit_code("")
    assert not lang_detect.is_sanskrit_code(None)


def test_a_marker_hit_outranks_the_stt_hint(monkeypatch):
    """Saaras auto-detect is good but not infallible, and a marker is exact.
    Order is cheapest-and-surest first, so the text wins over the audio."""
    _never_called(monkeypatch)
    code, how = _run(resolve_language("idhu enna", stt_hint="kn-IN"))
    assert (code, how) == ("ta", "marker")


def test_a_short_line_sticks_rather_than_re_guessing(monkeypatch):
    """A settled session outranks a guess on a line too short to judge —
    nobody switches from Telugu to Tamil halfway through a conversation."""
    _never_called(monkeypatch)
    code, how = _run(resolve_language("ok fine", sticky="te"))
    assert code == "te"
    assert how == "sticky(short)"


def test_a_long_ambiguous_line_does_pay_for_the_classifier(monkeypatch):
    calls = _classifier_says(monkeypatch, "ml")
    code, how = _run(resolve_language(
        "so how would I actually say that whole thing properly", sticky="te"))
    assert code == "ml"
    assert how == "llm"
    assert calls, "the classifier should have been consulted"


def test_a_failed_classifier_keeps_the_session_language(monkeypatch):
    """Fail-closed: defaulting a Telugu speaker to English is the bug this
    module replaced, so an outage must not do it either.

    Reported as "sticky(fallback)", not "default" — the classifier abstaining
    is frequently the RIGHT answer (a line of romanized Sanskrit has no bridge
    language in it at all), and a log reading "default" on a correct sticky
    hit is how you talk yourself into believing detection is broken.
    """
    _classifier_says(monkeypatch, None)
    code, how = _run(resolve_language(
        "so how would I actually say that whole thing", sticky="te"))
    assert code == "te"
    assert how == "sticky(fallback)"


def test_a_stray_glyph_does_not_swing_the_language(monkeypatch):
    """The unique-script floor is low (0.15) because those scripts are never
    used for Sanskrit. `_MIN_SCRIPT_LETTERS` is what keeps that safe: one
    pasted character in a long English line must not decide the turn."""
    _classifier_says(monkeypatch, None)
    code, how = _run(resolve_language(
        "what does the letter ಠ actually sound like in practice", sticky="hi"))
    assert code == "hi", f"a single glyph decided the language: {how}"
    assert how != "script"


def test_a_tag_question_in_native_script_is_decisive(monkeypatch):
    """Romanized Sanskrit with a Kannada tag question is 24% Kannada by
    letter count and unmistakable to a human. At the old 0.30 floor it fell
    through to the paid classifier, which answered "this is Sanskrit" —
    correct, and useless."""
    _never_called(monkeypatch)
    code, how = _run(resolve_language("aham vidyalayam gacchami ಅಂತ ಸರಿನಾ?"))
    assert (code, how) == ("kn", "script")


def test_with_nothing_to_go_on_it_falls_back_to_english(monkeypatch):
    _classifier_says(monkeypatch, None)
    code, _ = _run(resolve_language("so how would I actually say that thing"))
    assert code == "en"


# ─── The registry ───────────────────────────────────────────────────────


def test_every_language_has_a_voice_and_a_script():
    for code, lang in lang_detect.LANGUAGES.items():
        assert lang.bulbul.endswith("-IN"), code
        assert lang.script, code
        assert lang.name_native, code


def test_sanskrit_is_not_a_bridge_language():
    """It is the subject. A learner cannot pick it as their own language."""
    assert "sa" not in lang_detect.LANGUAGES


@pytest.mark.parametrize(
    "raw,expected",
    [("kn-IN", "kn"), ("te", "te"), ("od-IN", "or"), ("", None), ("xx-YY", None)],
)
def test_vendor_codes_normalize(raw, expected):
    """Sarvam spells Odia "od-IN"; ISO 639-1 is "or"."""
    assert normalize_code(raw) == expected


def test_the_order_phrase_names_the_native_script():
    """The measured fix for this model: naming the script inline is what took
    it from 2/7 languages correct to 9/9."""
    assert order_phrase("te") == "Telugu (తెలుగు script)"
    assert order_phrase("en") == "English"
    assert order_phrase(None) == "English"
