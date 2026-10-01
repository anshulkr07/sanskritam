"""Transcribe a learner's voice without letting Saaras rewrite their Sanskrit.

Talk cannot pin a language. A learner answers in Sanskrit, in their own
language, or in a mix of the two, and the transcript has to say which. So Talk
asks Saaras to auto-detect ("unknown"). Measured 2026-09-23 against live
Sarvam — 20 Bulbul-voiced Sanskrit lines over three voices, plus Kannada,
Telugu, Tamil, Malayalam, Bengali, Hindi, Marathi and English — no single
saaras:v4 call is faithful to all of them:

  * **Auto-detect hears spoken Sanskrit as English and translates it.** 19 of
    20 Sanskrit lines came back in English: "मम नाम अंशुलः। अहं संस्कृतं
    पठामि।" became "My name is Anshul. I read Sanskrit." (en-IN, probability
    1.0), and "अहं गच्छसि।" became "I am going." — erasing the exact mistake
    the tutor exists to catch. saaras:v3 did this too, on 2 of 20.
  * **Pinned to sa-IN it is the most faithful Sanskrit transcriber measured**
    (20 of 20, agreement errors intact) — and it rewrites everything else into
    Devanagari. A Tamil sentence came back as correct-looking Sanskrit,
    "एन नाम अन्शुल्। अहं संस्कृतम् शिक्षे।": praise for Sanskrit nobody said.
  * **Auto-detect is excellent at everything that is not Sanskrit.** Every
    Kannada, Telugu, Tamil, Malayalam, Bengali, Hindi and Marathi line came
    back in its own script, at probability 0.82–1.0.

So both run, concurrently — the wait is the slower of two ~400 ms calls, not
their sum — and `pick_transcript` decides. The auto pass is trusted whenever it
names one of the learner's languages other than English, because the Sanskrit
pass would only rewrite those. When it says English, Sanskrit or nothing, the
Sanskrit pass wins only if Vidyut reads it as Sanskrit and it carries no Hindi
or Marathi. Real English does not: the Sanskrit pass spells it out in
Devanagari ("माय नेम इज़ अंशुल"), which Vidyut cannot parse.

Cost: two STT calls per voice turn, about ₹0.04 extra for a five-second line
at ₹30/hour. Keyterms, v4's other new feature, are deliberately NOT used. The
same measurement caught a Sanskrit keyterm turning the learner's "अहं
गच्छसि" into "अहं गच्छामि", correcting them before the tutor could. A Latin
keyterm also flipped a Hindi line into an English translation.

Mixed speech and ``mode=codemix`` (measured 2026-10-01, live Sarvam,
Bulbul-voiced stand-ins of handover §3.1 lines 1–5 plus two controls,
``scripts/bench_codemix.py``, ``results/bench_codemix.json``):

* Hindi + English ("नमस्ते, आज का temperature कितना है?"): ``transcribe``
  writes the whole line in Devanagari ("टेंपरेचर"); ``codemix`` on v4 keeps
  "temperature" in Latin and the rest in Devanagari, at p=0.998. v3 agrees.
* Kannada + English ("ನನಗೆ ಸಂಸ್ಕೃತ ಕಲಿಯಬೇಕು, please help me."): same —
  ``transcribe`` transliterates the English into Kannada script, ``codemix``
  on v4 keeps "please help me" in Latin at p=0.999. Pinned sa-IN rewrites the
  line into Marathi-looking Devanagari ("मला संस्कृत शिकायबेकु"), which is
  why the Sanskrit pass is never trusted for a non-Sanskrit line.
* Sanskrit + English ("मम नाम अंशुलः, and I live in Bengaluru."): auto
  ``transcribe`` translates the whole line into English (the known erasure);
  ``codemix`` on v4 ALSO answers in English ("My name is Anshulah...").
  Codemix does not recover Devanagari here. The pinned sa-IN pass does keep
  the mix ("मम नाम अंशुलाः, and I live in Bengaluru.").
* Hindi + English + Kannada ("आज का weather अच्छा है, ನೀವು ಹೇಳಿ।"): both
  auto passes hear one predominant language (kn-IN) and write the Hindi
  words in Kannada script ("ಆಜ್ ಕಾ ವೆದರ್ ಅಚ್ಚಾ ಹೆ"); ``codemix`` keeps the
  Latin "weather" but the Hindi words stay in Kannada script. Two Indian
  languages in one sentence come back in ONE Indic script, as the docs imply
  (only the predominant language is labelled). Re-scripting those words is
  the tutor's job ("heard", ``services/tutor.py``).
* Sanskrit + English + Hindi ("अहं गच्छामि, but कल नहीं।"): auto hears hi-IN
  and writes "बट" in Devanagari; ``codemix`` on v4 answers en-IN, fully
  romanized ("Aham Gachhami but kal Nahi."). v3 codemix keeps the mix best
  ("अहम गच्छामि, but कल नहीं।") but v3 mistranscribes elsewhere, so v4 is used.
* Controls: pure Sanskrit ("अहं विद्यालयं गच्छामि।") — ``codemix`` on v4
  romanizes ("Aham Vidyalayam Gachchhami.", en-IN) while v3 keeps Devanagari.
  Pure Hindi — every pass faithful; codemix equals transcribe.

Decision: a third concurrent pass, (unknown, codemix) on the same model,
feeds a ``display`` string next to ``transcript``. ``transcript`` keeps its
current meaning and still feeds the tutor — codemix is NOT as faithful as
``transcribe`` for Sanskrit-dominant speech (it romanizes it), so the two
stay separate. ``display`` is the codemix text only when the auto pass won
AND both passes name the same predominant language AND the codemix text is
non-empty; otherwise it equals ``transcript``. A failed codemix pass is
logged and falls back — it never fails the request. Cost: one more STT call
per voice turn (~₹0.04 for five seconds); quota is still charged once per
request, in the router.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Optional

from app.services import lang_detect
from app.services.sarvam import SarvamClient

logger = logging.getLogger("shabd.stt")

#: The Sanskrit pass's language code (Saaras accepts it; Bulbul does not yet).
SANSKRIT = "sa-IN"


def reads_as_sanskrit(text: str) -> bool:
    """True when a transcript is a clean Sanskrit line, not a rewritten one.

    Vidyut must find a verb root or pronoun and parse at least the tutor's
    own health floor. The free detection layers must name no bridge language:
    a Hindi or Marathi word, or a run of another script, means Saaras
    transliterated something that was not Sanskrit.
    """
    stripped = (text or "").strip()
    if not stripped:
        return False
    # Imported here: tutor pulls in Vidyut, and this module is imported by a
    # router that must stay importable without it.
    from app.services.tutor import sanskrit_health

    health = sanskrit_health(stripped)
    if not (health.looks_sanskrit and health.ok):
        return False
    code, _how = lang_detect.detect_free(stripped)
    return code is None


def pick_transcript(auto: dict, sanskrit: Optional[dict]) -> tuple[dict, str]:
    """Choose between the auto-detect pass and the Sanskrit pass.

    Returns ``(result, source)`` where source is "auto" or "sanskrit".
    """
    lang = lang_detect.normalize_code(auto.get("language_code") or "")
    if lang and lang != "en":
        return auto, "auto"
    if sanskrit is not None and reads_as_sanskrit(sanskrit.get("transcript") or ""):
        return sanskrit, "sanskrit"
    return auto, "auto"


def pick_display(chosen: dict, source: str, auto: dict, codemix: object) -> str:
    """The learner-visible line: the mix as it was said, never a rewrite.

    The codemix text is used only when the auto pass won, it is non-empty,
    and both passes name the same predominant language — so a romanized
    codemix answer ("Aham Gachhami but kal Nahi.", en-IN) never replaces a
    Devanagari transcript (hi-IN), and a failed codemix pass never matters.
    """
    transcript = chosen.get("transcript") or ""
    if source != "auto" or not isinstance(codemix, dict):
        return transcript
    text = (codemix.get("transcript") or "").strip()
    if not text:
        return transcript
    auto_lang = lang_detect.normalize_code(auto.get("language_code") or "")
    codemix_lang = lang_detect.normalize_code(codemix.get("language_code") or "")
    if auto_lang and codemix_lang and auto_lang == codemix_lang:
        return text
    return transcript


async def transcribe_learner(
    client: SarvamClient,
    audio_data: bytes,
    *,
    filename: str = "audio.wav",
    model: Optional[str] = None,
) -> dict:
    """Auto-detect the learner's language without losing their Sanskrit.

    Same shape as `SarvamClient.speech_to_text`, plus ``source`` and
    ``display`` (the mix as it was said; see the module docstring). Raises
    `SarvamError` when the auto pass fails: the Sanskrit pass alone is never
    trusted, because it turns a Tamil sentence into Sanskrit. A failed
    Sanskrit or codemix pass costs nothing but the fallback — the auto pass
    is used as-is, which is what this endpoint did before.
    """
    auto, sanskrit, codemix = await asyncio.gather(
        client.speech_to_text(audio_data=audio_data, language_code="unknown",
                              model=model, filename=filename),
        client.speech_to_text(audio_data=audio_data, language_code=SANSKRIT,
                              model=model, filename=filename),
        client.speech_to_text(audio_data=audio_data, language_code="unknown",
                              model=model, filename=filename, mode="codemix"),
        return_exceptions=True,
    )
    if isinstance(auto, BaseException):
        raise auto
    if isinstance(sanskrit, BaseException):
        if not isinstance(sanskrit, Exception):
            raise sanskrit
        logger.warning("Sanskrit STT pass failed, keeping auto-detect: %s", sanskrit)
        sanskrit = None
    if isinstance(codemix, BaseException):
        if not isinstance(codemix, Exception):
            raise codemix
        logger.warning("Codemix STT pass failed, keeping transcript: %s", codemix)
        codemix = None

    chosen, source = pick_transcript(auto, sanskrit)
    display = pick_display(chosen, source, auto, codemix)
    logger.info(
        "[talk] stt pick=%s auto=%s p=%s chars=%d display_chars=%d",
        source, auto.get("language_code") or "-", auto.get("language_probability"),
        len(chosen.get("transcript") or ""), len(display),
    )
    return {**chosen, "source": source, "display": display}
