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


async def transcribe_learner(
    client: SarvamClient,
    audio_data: bytes,
    *,
    filename: str = "audio.wav",
    model: Optional[str] = None,
) -> dict:
    """Auto-detect the learner's language without losing their Sanskrit.

    Same shape as `SarvamClient.speech_to_text`, plus ``source``. Raises
    `SarvamError` when the auto pass fails: the Sanskrit pass alone is never
    trusted, because it turns a Tamil sentence into Sanskrit. A failed Sanskrit
    pass costs nothing but the fallback — the auto pass is used as-is, which
    is what this endpoint did before.
    """
    auto, sanskrit = await asyncio.gather(
        client.speech_to_text(audio_data=audio_data, language_code="unknown",
                              model=model, filename=filename),
        client.speech_to_text(audio_data=audio_data, language_code=SANSKRIT,
                              model=model, filename=filename),
        return_exceptions=True,
    )
    if isinstance(auto, BaseException):
        raise auto
    if isinstance(sanskrit, BaseException):
        if not isinstance(sanskrit, Exception):
            raise sanskrit
        logger.warning("Sanskrit STT pass failed, keeping auto-detect: %s", sanskrit)
        sanskrit = None

    chosen, source = pick_transcript(auto, sanskrit)
    logger.info(
        "[talk] stt pick=%s auto=%s p=%s chars=%d",
        source, auto.get("language_code") or "-", auto.get("language_probability"),
        len(chosen.get("transcript") or ""),
    )
    return {**chosen, "source": source}
