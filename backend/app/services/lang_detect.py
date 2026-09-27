"""Which language did the learner just speak?

Talk is multilingual (2026-09-22): a learner may write Sanskrit mixed with any
of Sarvam's ten Indian languages, in that language's own script or romanized.
Everything downstream — the tutor's reply language, the TTS voice, which font
the client loads — hangs off this one answer, so it is resolved HERE, once,
and handed to the model as an order rather than left to its judgement.

That last point is not a style preference. Measured 2026-09-22 across 11
languages, ``sarvam-105b-conversations`` collapses to **Kannada** for almost
any non-Kannada input when the language rule lives in the system prompt —
Telugu, Tamil, Malayalam, Bengali and even Hindi all came back Kannada (2/7
correct). Naming the language as a direct order in the *user* message took the
same model to 9/9. ``services/explainer.py`` records the identical finding for
the identical model on a different path; this module is that lesson, reused.

The stack, cheapest first — each layer only runs if the ones above abstain:

  1. **Script scan** (0 ms). Decisive: nobody writes Telugu script by accident.
  2. **Romanized marker table** (0 ms). "henge", "epdi", "njan" are giveaways.
  3. **Saaras' own ``language_code``** (free). Voice turns already carry it.
  4. **An LLM classifier** (~180 ms, ~15 tokens). Everything left over.

Measured hit rates: the classifier alone scored 16/17 on romanized input. Its
one miss is instructive — "Aham henge adini" came back Telugu at
``confidence: 1.0``. The model is *confidently* wrong, so confidence is never
thresholded here; the marker table catches that exact line for free instead,
which is why it runs first.
"""

from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass
from typing import Optional

from app.config import settings
from app.evals.providers import LLMResponse, build_provider

logger = logging.getLogger("shabd.lang")


@dataclass(frozen=True)
class Language:
    """One supported bridge language and everything downstream needs of it."""

    code: str           # ISO 639-1
    name_en: str        # "Telugu" — what the model is ordered with
    name_native: str    # "తెలుగు" — what the learner is shown
    script: str         # the script key the client maps to a font
    bulbul: str         # Sarvam TTS language_code
    block: Optional[tuple[int, int]] = None   # Unicode range, None for Latin


#: Sarvam's supported set. Sanskrit is deliberately NOT here — it is the
#: subject being taught, never the learner's bridge language.
LANGUAGES: dict[str, Language] = {
    "hi": Language("hi", "Hindi", "हिन्दी", "devanagari", "hi-IN", (0x0900, 0x097F)),
    "mr": Language("mr", "Marathi", "मराठी", "devanagari", "mr-IN", (0x0900, 0x097F)),
    "bn": Language("bn", "Bengali", "বাংলা", "bengali", "bn-IN", (0x0980, 0x09FF)),
    "gu": Language("gu", "Gujarati", "ગુજરાતી", "gujarati", "gu-IN", (0x0A80, 0x0AFF)),
    "pa": Language("pa", "Punjabi", "ਪੰਜਾਬੀ", "gurmukhi", "pa-IN", (0x0A00, 0x0A7F)),
    "or": Language("or", "Odia", "ଓଡ଼ିଆ", "oriya", "od-IN", (0x0B00, 0x0B7F)),
    "ta": Language("ta", "Tamil", "தமிழ்", "tamil", "ta-IN", (0x0B80, 0x0BFF)),
    "te": Language("te", "Telugu", "తెలుగు", "telugu", "te-IN", (0x0C00, 0x0C7F)),
    "kn": Language("kn", "Kannada", "ಕನ್ನಡ", "kannada", "kn-IN", (0x0C80, 0x0CFF)),
    "ml": Language("ml", "Malayalam", "മലയാളം", "malayalam", "ml-IN", (0x0D00, 0x0D7F)),
    "en": Language("en", "English", "English", "latin", "en-IN", None),
}

DEFAULT = "en"

#: Sanskrit's own block. Shared with Hindi and Marathi, so a Devanagari hit is
#: never decisive on its own — see `_disambiguate_devanagari`.
DEVANAGARI = (0x0900, 0x097F)

#: Scripts that belong to exactly one language, so a hit IS decisive.
_UNIQUE_BLOCKS: tuple[tuple[str, int, int], ...] = tuple(
    (lang.code, lang.block[0], lang.block[1])
    for lang in LANGUAGES.values()
    if lang.block is not None and lang.block != DEVANAGARI
)

# ─── Layer 2: romanized marker tables ────────────────────────────────────

# Words that occur in one language and essentially nowhere else when written
# in Latin script. Kept SMALL and high-precision on purpose: a false hit here
# outranks the classifier, so an ambiguous word costs more than a missing one.
# "henge" earns its place — it is the exact word the LLM classifier gets wrong.
_MARKERS: dict[str, frozenset[str]] = {
    "kn": frozenset({
        "henge", "hege", "hegidini", "adini", "idini", "illi", "yaake", "yake",
        "beku", "bekku", "ideya", "helodu", "helu", "nalli", "nanna", "ninna",
        "madu", "madtini", "barthini", "hogtini", "gottilla", "channagi",
    }),
    "te": frozenset({
        "unnanu", "unnavu", "unnaru", "ela", "ekkada", "cheppu", "cheppali",
        "kavali", "chala", "velthunnanu", "vellali", "nenu", "meeru", "emi",
        "enti", "ledu", "telusu", "bagunnanu", "peru",
    }),
    "ta": frozenset({
        "porein", "poren", "epdi", "eppadi", "solrathu", "sollu", "solla",
        "enna", "panra", "pannu", "irukku", "irukken", "illai", "vanakkam",
        "naan", "nee", "romba", "theriyum", "seiya",
    }),
    "ml": frozenset({
        "njan", "pokunnu", "engane", "parayum", "parayu", "aano", "ente",
        "undu", "illa", "ariyilla", "cheyyu", "nannayi", "ippo", "ennu",
    }),
    "hi": frozenset({
        "mujhe", "kaise", "kahan", "kyun", "nahi", "nahin", "mera", "meri",
        "hoon", "raha", "rahi", "chahiye", "karna", "bolna", "hai", "kya",
    }),
    "mr": frozenset({
        "mala", "kasa", "kashi", "bolaycha", "aahe", "aahes", "kay", "pahije",
        "karaycha", "nahi", "majha", "majhi", "tula",
    }),
    "bn": frozenset({
        "amar", "tomar", "kibhabe", "bolbo", "ache", "korbo", "kothay",
        "keno", "ami", "tumi", "bhalo", "jani",
    }),
    "gu": frozenset({
        "mane", "kevi", "rite", "kehvu", "chhe", "chhu", "tame", "hun",
        "shu", "kyare", "karvu",
    }),
    "pa": frozenset({
        "mainu", "kive", "kinna", "haiga", "tusi", "asi", "changa",
        "karna", "dasso", "kithe",
    }),
    "or": frozenset({
        "mote", "kipari", "kahibi", "achhi", "tume", "mun", "kemiti",
        "kouthi", "bhala",
    }),
}

_WORD_SPLIT = re.compile(r"[^\wऀ-ൿ]+")


def _words(text: str) -> set[str]:
    return {w for w in _WORD_SPLIT.split((text or "").lower()) if w}


# High-frequency Hindi forms that are not Sanskrit. Lifted from
# `services/tutor.py`, where it guards the same confusion from the other side
# (Hindi landing in the Sanskrit field). Devanagari alone cannot separate
# Sanskrit from Hindi, and these forms never occur in Sanskrit.
_HINDI_IN_DEVANAGARI = frozenset({
    "है", "हैं", "हूँ", "हूं", "था", "थी", "थे", "हो", "होगा", "होगी",
    "आप", "आपका", "आपके", "आपकी", "आपको", "मैं", "मुझे", "मेरा", "मेरी", "मेरे",
    "क्या", "नहीं", "नही", "और", "कि", "को", "का", "की", "के", "में", "से",
    "यह", "वह", "कैसे", "कहाँ", "क्यों", "बहुत", "अच्छा", "ठीक", "लिए",
})

# Marathi's giveaways in its own script. Same idea, narrower list.
_MARATHI_IN_DEVANAGARI = frozenset({
    "आहे", "आहेस", "आहात", "मला", "तुला", "काय", "कसा", "कशी", "पाहिजे",
    "माझा", "माझी", "नाही", "करायचं", "बोलायचं",
})


#: How much of a line must sit in a UNIQUE (non-Devanagari) script before that
#: script decides. Low by design — see `detect_free`.
_UNIQUE_SCRIPT_FLOOR = 0.15

#: ...and at least this many letters of it, so one stray glyph pasted into a
#: short line cannot swing the whole turn's language.
_MIN_SCRIPT_LETTERS = 3


def script_count(text: str, lo: int, hi: int) -> int:
    """How many of the line's letters fall inside one Unicode block."""
    return sum(1 for c in (text or "") if c.isalpha() and lo <= ord(c) <= hi)


def script_share(text: str, lo: int, hi: int) -> float:
    """Share of the line's LETTERS that fall inside one Unicode block.

    Letters only: digits, danda and punctuation say nothing about language and
    would otherwise dilute a short line below any useful threshold.
    """
    letters = [c for c in (text or "") if c.isalpha()]
    if not letters:
        return 0.0
    return sum(1 for c in letters if lo <= ord(c) <= hi) / len(letters)


def _disambiguate_devanagari(text: str) -> Optional[str]:
    """Devanagari in — Hindi, Marathi, or Sanskrit (i.e. not a bridge language)?

    Returns a language code, or None when the line looks like Sanskrit, which
    is the subject being taught rather than a language to reply in. None means
    "keep whatever language the session already had".
    """
    words = _words(text)
    if words & _MARATHI_IN_DEVANAGARI:
        return "mr"
    if words & _HINDI_IN_DEVANAGARI:
        return "hi"
    return None


def detect_free(text: str) -> tuple[Optional[str], str]:
    """Layers 1 and 2 — the ones that cost nothing.

    Returns ``(code, how)``. ``code`` is None when both layers abstain, which
    is the caller's signal to fall through to Saaras or the classifier.
    ``how`` is one of "script", "devanagari", "marker", "unknown" and exists
    so the logs can show which layer is carrying the traffic.
    """
    stripped = (text or "").strip()
    if not stripped:
        return None, "unknown"

    # 1. A unique script is decisive, and the bar is LOW on purpose.
    #
    #    None of these scripts is used to write Sanskrit, and nobody types
    #    Kannada by accident — so their presence identifies the speaker even
    #    when most of the line is something else. Two real lines set the bar:
    #    "അഹം ഗച്ഛാമി correct aano?" is 40% Malayalam, and
    #    "aham vidyalayam gacchami ಅಂತ ಸರಿನಾ?" — romanized Sanskrit with a
    #    Kannada tag question — is 24%. Both are unmistakable to a human. At
    #    a 0.30 floor the second fell through to the paid classifier, which
    #    answered "this is Sanskrit" (correctly) and therefore nothing usable.
    #
    #    `_MIN_SCRIPT_LETTERS` is what keeps this honest: a share alone would
    #    let one stray glyph in a three-word line decide, so a real run of
    #    that script is also required.
    for code, lo, hi in _UNIQUE_BLOCKS:
        if script_count(stripped, lo, hi) >= _MIN_SCRIPT_LETTERS and \
                script_share(stripped, lo, hi) >= _UNIQUE_SCRIPT_FLOOR:
            return code, "script"

    # Devanagari keeps the higher bar. It is shared with Sanskrit itself, so
    # a few Devanagari letters in a line mean "this learner is quoting the
    # language they are studying", not "this learner speaks Hindi".
    if script_share(stripped, *DEVANAGARI) >= 0.30:
        return _disambiguate_devanagari(stripped), "devanagari"

    # 2. Romanized markers. A tie between two languages abstains rather than
    #    guessing — the classifier is better at ambiguity than a word list.
    words = _words(stripped)
    scores = {code: len(words & marks) for code, marks in _MARKERS.items()}
    best = max(scores, key=lambda c: scores[c])
    if scores[best] > 0 and list(scores.values()).count(scores[best]) == 1:
        return best, "marker"

    return None, "unknown"


# ─── Layer 4: the classifier ─────────────────────────────────────────────

_CLASSIFY_SYSTEM = """You identify which Indian language a romanized \
(Latin-script) line is written in. The line may also contain Sanskrit words or \
English words mixed in - ignore those and identify the learner's OWN language.

Answer with one JSON object and nothing else:
{"lang": "<one of: hi mr bn gu pa or ta te kn ml en>"}

"hi"=Hindi "mr"=Marathi "bn"=Bengali "gu"=Gujarati "pa"=Punjabi "or"=Odia \
"ta"=Tamil "te"=Telugu "kn"=Kannada "ml"=Malayalam "en"=English only.

Judge by the grammar and vocabulary of the non-Sanskrit, non-English words:
- Kannada: -ide, -ini, -alla, henge, yaake, illi, maadu, beku
- Telugu: -unnanu, -tunnanu, ela, ekkada, cheppu, kavali, chala
- Tamil: -ren, -kiren, epdi, enna, illai, irukku, sollu, vanakkam
- Malayalam: -unnu, -aano, engane, entha, illa, parayu, undu
- Hindi: hai, kya, nahi, kaise, kahan, mujhe, karna, chahiye
- Marathi: aahe, kay, nahi, kasa, mala, pahije, karaycha
- Bengali: ami, tumi, amar, kothay, kibhabe, ache
- Gujarati: chhe, shu, kevi, mane, tame
If the line is only English and Sanskrit, answer "en"."""


class LanguageClassifier:
    """The paid layer: one tiny call for input no free layer could read."""

    def __init__(self, provider_ref: Optional[str] = None) -> None:
        self._provider_ref = provider_ref or settings.tutor_provider
        self._provider = None

    def _get_provider(self):
        if self._provider is None:
            self._provider = build_provider(self._provider_ref)
        return self._provider

    @property
    def available(self) -> bool:
        try:
            return self._get_provider().configured
        except ValueError:
            return False

    async def classify(self, text: str) -> Optional[str]:
        """Best guess at the learner's language, or None on any failure.

        Fail-closed: the caller keeps the session's existing language, which
        is a far better outcome than defaulting a Telugu speaker to English.
        """
        stripped = (text or "").strip()
        if not stripped:
            return None
        try:
            provider = self._get_provider()
        except ValueError as exc:
            logger.warning("classifier provider unavailable: %s", exc)
            return None
        try:
            resp: LLMResponse = await provider.complete(
                _CLASSIFY_SYSTEM,
                f"Line: {stripped}\n\nWhich language? JSON only.",
                temperature=0.0,
                max_tokens=40,
                json_mode=True,
            )
        except Exception as exc:  # noqa: BLE001 — never take a turn down
            logger.warning("classifier call failed: %s", exc)
            return None
        if not resp.ok:
            return None

        code = _parse_code(resp.text)
        if code is None:
            logger.info("classifier returned no usable code: %r", (resp.text or "")[:120])
            return None
        logger.info("[talk] classify %dms -> %s", resp.latency_ms, code)
        return code


def _parse_code(text: str) -> Optional[str]:
    """Pull a supported language code out of the classifier's reply."""
    data = None
    try:
        data = json.loads(text)
    except (json.JSONDecodeError, TypeError):
        m = re.search(r"\{.*\}", text or "", re.DOTALL)
        if m:
            try:
                data = json.loads(m.group(0))
            except json.JSONDecodeError:
                data = None
    if isinstance(data, dict):
        code = str(data.get("lang") or "").strip().lower()
        if code in LANGUAGES:
            return code
    return None


_singleton: Optional[LanguageClassifier] = None


def get_classifier() -> LanguageClassifier:
    global _singleton
    if _singleton is None:
        _singleton = LanguageClassifier()
    return _singleton


# ─── The resolver the routers call ───────────────────────────────────────


async def resolve_language(
    text: str,
    *,
    sticky: Optional[str] = None,
    stt_hint: Optional[str] = None,
) -> tuple[str, str]:
    """Settle the learner's language for this turn.

    Args:
        text: the learner's utterance.
        sticky: the language this session already settled on, if any. A
            conversation does not switch from Telugu to Tamil halfway, so a
            settled session outranks the classifier's guess on a short or
            ambiguous line — only a decisive free layer overrides it.
        stt_hint: Saaras' own ``language_code`` when the turn came from
            voice. Free and already in the response; nothing read it before.

    Returns ``(code, how)`` — never raises, always returns a supported code.
    """
    code, how = detect_free(text)
    if code is not None:
        return code, how

    # The free layers abstained. On Devanagari that means "this reads as
    # Sanskrit", which is not a bridge language at all — keep what we had.
    if how == "devanagari" and sticky:
        return sticky, "sticky(sanskrit)"

    # Saaras heard Sanskrit — `services/learner_stt.py` kept its Sanskrit
    # pass. That names no bridge language either, and the classifier is only
    # built for romanized lines: paying it to look at a Devanagari Sanskrit
    # line buys a guess, not an answer.
    if is_sanskrit_code(stt_hint):
        return (sticky, "sticky(sanskrit)") if sticky else (DEFAULT, "stt(sanskrit)")

    if stt_hint:
        hinted = normalize_code(stt_hint)
        if hinted:
            return hinted, "stt"

    if sticky:
        # A settled session only pays for the classifier when the line is
        # long enough for the classifier to beat what we already know.
        if len((text or "").split()) < 4:
            return sticky, "sticky(short)"

    guessed = await get_classifier().classify(text)
    if guessed:
        return guessed, "llm"

    # The classifier abstained or failed. Note that "abstained" is often the
    # RIGHT answer rather than a failure: a line that is mostly romanized
    # Sanskrit ("aham vidyalayam gacchami ...") has no bridge language in it,
    # the classifier says so, and the session's existing language is exactly
    # what should carry the turn. These are labelled apart because a log line
    # reading "default" for a correct sticky hit is how you convince yourself
    # detection is broken when it is not.
    if sticky:
        return sticky, "sticky(fallback)"
    return DEFAULT, "default"


def normalize_code(code: str) -> Optional[str]:
    """Map a Sarvam/BCP-47 tag ("kn-IN", "od-IN") to a supported code."""
    raw = (code or "").strip().lower()
    if not raw:
        return None
    head = raw.split("-")[0]
    if head in LANGUAGES:
        return head
    # Sarvam spells Odia "od-IN"; ISO 639-1 is "or".
    if head == "od":
        return "or"
    return None


def is_sanskrit_code(code: Optional[str]) -> bool:
    """True for Sarvam's Sanskrit tag ("sa-IN", "sa") — never Santali's "sat-IN"."""
    return (code or "").strip().lower().split("-")[0] == "sa"


def get(code: Optional[str]) -> Language:
    """A Language for any input, falling back to English rather than raising."""
    return LANGUAGES.get((code or "").strip().lower(), LANGUAGES[DEFAULT])


def order_phrase(code: Optional[str]) -> str:
    """How the language is named TO THE MODEL, as a direct order.

    Includes the native script name because the measured failure was writing
    the right language in the wrong script — and because naming the script
    inline is what took the model from 2/7 to 9/9.
    """
    lang = get(code)
    if lang.code == "en":
        return "English"
    return f"{lang.name_en} ({lang.name_native} script)"
