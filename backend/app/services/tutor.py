"""Free-form conversation tutor: Sarvam speaks, Vidyut decides what is true.

Replaces the dialogue graph's edge matching on the live turn path (product
decision 2026-09-02). The graph could only accept the ONE sentence its author
enumerated per question, so "aham anshul asmi" — correct Sanskrit, correct
answer — was rejected, and the learner was asked the same question forever.

**Rewritten 2026-09-22** for multilingual, conversational Talk. The old reply
shape was ``{"sanskrit": ..., "bridge": ...}`` — literally a sentence and its
translation — and it read to the learner as a translator rather than a person.
The turn is now four distinct jobs (read back, fix, reply, explain) and the
learner's language is any of Sarvam's ten, not a Hindi/English toggle.

The division of labour is the one this codebase already uses for authoring
(`services/authoring.py`), pointed at the runtime instead:

  • **Vidyut decides grammar.** It analyses the learner's utterance and the
    model's proposed Sanskrit. It is the only thing here allowed to say a form
    is right or wrong — §6.3's abstention principle holds, so "unknown" is
    never reported as "wrong".
  • **Sarvam decides what to say next.** It never assigns a verdict; it is
    handed Vidyut's reading and writes the tutor's turn around it.
  • **`services/lang_detect.py` decides what language to say it in.** Not the
    model — see that module for why.
  • **`services/iast.py` decides the roman spelling.** Never the model: P7-13
    found 130/264 stored transliterations wrong when an LLM produced them.

Guardrail, in order:
  1. The learner's utterance is analysed BEFORE the model sees it, and the
     analysis is passed in as fact. The model cannot overrule it.
  2. Every field the model returns is checked for SCRIPT PURITY before
     anything else. Measured 2026-09-22: on native-script input (Telugu,
     Kannada, Malayalam) the model leaks the input script into the Sanskrit
     field 38% of the time — ``reply_sa`` came back 26% Devanagari and the
     rest Telugu. The old `_is_bridge_language` check is a Hindi *word list*
     and waves every one of those through.
  3. Surviving Sanskrit is analysed by Vidyut. Sanskrit that does not clear
     the health check is never spoken to a learner — one retry at a simpler
     register, then the field is dropped.

Both directions tolerate unknown words. `is_confident()` demands EVERY word
parse, which no sentence containing a name can do — that strictness is exactly
what rejected the owner's own name. `sanskrit_health` asks the weaker, correct
question instead: is anything here actually *malformed*?
"""

from __future__ import annotations

import json
import logging
import re
import time
from dataclasses import dataclass, field
from typing import Any, Optional

from sqlalchemy.orm import Session as DBSession

from app.config import settings
from app.evals.providers import LLMResponse, build_provider
from app.grading.analyzer import analyze_sentence, detect_script
from app.models import (
    ConversationSession,
    ConversationTurn,
    DialogueEdge,
    DialogueScenario,
    Learner,
)
from app.services import lang_detect
from app.services.iast import to_iast

logger = logging.getLogger("shabd.tutor")

# How much of a line must parse cleanly before we are willing to speak it.
# A one-name-in-five-words sentence sits at 0.8; genuine word salad falls far
# below. Tuned to admit proper nouns, not to admit broken grammar.
_HEALTH_FLOOR = 0.6

# How much of a "Sanskrit" field must actually BE Devanagari. Deliberately
# strict: this catches script leakage, and a legitimate Sanskrit line has no
# reason to carry Telugu or Latin letters. Measured failures sat at 1-40%
# Devanagari, so there is a wide, safe gap below this floor.
_SCRIPT_FLOOR = 0.90

# Turns of history handed to the model. The whole conversation is short by
# design; this only guards a runaway session's prompt size.
_HISTORY_TURNS = 16

# High-frequency Hindi forms that are not Sanskrit words. The analyser cannot
# tell the two apart in Devanagari — it declines "मुझे" as readily as "रामः" —
# so a line of Hindi sails through the health check and gets spoken to the
# learner as Sanskrit. These particular forms never occur in Sanskrit, so one
# hit is decisive. (Kept alongside the script-purity gate, which catches a
# different failure: Hindi is in the RIGHT script, just the wrong language.)
_HINDI_MARKERS = frozenset({
    "है", "हैं", "हूँ", "हूं", "था", "थी", "थे", "हो", "होगा", "होगी",
    "आप", "आपका", "आपके", "आपकी", "आपको", "मैं", "मुझे", "मेरा", "मेरी", "मेरे",
    "क्या", "नहीं", "नही", "और", "कि", "को", "का", "की", "के", "में", "से",
    "यह", "वह", "कैसे", "कहाँ", "क्यों", "बहुत", "अच्छा", "ठीक", "लिए",
})


def _is_bridge_language(text: str) -> bool:
    """True when a line the model called Sanskrit is actually Hindi."""
    words = {w.strip("।,!?.‍") for w in (text or "").split()}
    return bool(words & _HINDI_MARKERS)


# Scripts a learner may WRITE Sanskrit in, mapped to their vidyut.lipi scheme.
# Karnataka, Andhra and Kerala schools teach Sanskrit in the regional script,
# so "ಅಹಂ ಗಚ್ಛಾಮಿ" is a realistic line from exactly the learners Talk now
# serves. Vidyut only reads Devanagari and IAST, so before this such a line
# parsed 0% — the tutor was told "this is not Sanskrit, correct nothing" and,
# measured live on 2026-09-22, corrected it anyway: "మమ నామ అన్షుల్" (correct)
# drew a note claiming the learner had "omitted the verb asti".
#
# vidyut.lipi round-trips these scripts losslessly for Sanskrit, and measured
# against real Telugu, Kannada and Malayalam SENTENCES the transliterated
# native text still parses as not-Sanskrit (ratio 0.00-0.33, no root, no
# pronoun) — so this does not start mistaking a learner's own language for
# Sanskrit.
#
# Tamil is deliberately absent. Its script has no voiced or aspirated stops,
# so Sanskrit in plain Tamil script cannot be recovered: "கச்சாமி" comes back
# "कच्चामि", not "गच्छामि". Analysing that would report a correct word as
# unreadable, which is worse than no analysis at all.
_SANSKRIT_CAPABLE_SCRIPTS: dict[str, str] = {
    "te": "Telugu",
    "kn": "Kannada",
    "ml": "Malayalam",
    "bn": "Bengali",
    "gu": "Gujarati",
    "pa": "Gurmukhi",
    "or": "Odia",
}


def as_devanagari(text: str) -> str:
    """Rewrite a line written in a Sanskrit-capable Indic script in Devanagari.

    Returns the text unchanged when it is not predominantly in one of those
    scripts. Latin letters and punctuation pass through untouched, so a mixed
    line like "ಅಹಂ ಗಚ್ಛಾಮಿ correct aa?" keeps its English half as-is.
    """
    stripped = text or ""
    for code, scheme_name in _SANSKRIT_CAPABLE_SCRIPTS.items():
        block = lang_detect.LANGUAGES[code].block
        if block and lang_detect.script_share(stripped, *block) >= 0.30:
            try:
                from vidyut.lipi import Scheme, transliterate

                return transliterate(stripped, getattr(Scheme, scheme_name), Scheme.Devanagari)
            except Exception as exc:  # analysis is an aid; it never kills a turn
                logger.warning("could not transliterate %s line: %s", scheme_name, exc)
                return stripped
    return stripped


def repair_stray_letters(text: str) -> str:
    """Rewrite a stray native-script letter inside a Sanskrit line in Devanagari.

    Live: "ಅहम् अपि गच्छामि" — one Kannada letter inside a Devanagari word,
    copied from a learner who wrote in Kannada script. That line is 96%
    Devanagari and clears the purity floor, so without this it reached the
    learner as a two-script word the voice cannot read. Only a slip ever gets
    here — the floor still rejects a real leak — and the repaired words then
    face Vidyut like any others, so a bad repair cannot be spoken.
    """
    out = text or ""
    for code, scheme_name in _SANSKRIT_CAPABLE_SCRIPTS.items():
        block = lang_detect.LANGUAGES[code].block
        if not block or not lang_detect.script_count(out, *block):
            continue
        run = re.compile(f"[\\u{block[0]:04x}-\\u{block[1]:04x}]+")
        try:
            from vidyut.lipi import Scheme, transliterate

            src = getattr(Scheme, scheme_name)
            out = run.sub(lambda m: transliterate(m.group(0), src, Scheme.Devanagari), out)
        except Exception as exc:  # the gate rejects what cannot be repaired
            logger.warning("could not repair stray %s letters: %s", scheme_name, exc)
    return out


#: The most foreign letters a Sanskrit line may carry and still be treated as
#: a slip of the pen rather than a leak. Measured leaks carried dozens.
_MAX_SLIP_LETTERS = 2


def _count_other_indic(text: str) -> int:
    return sum(1 for c in (text or "") if c.isalpha() and 0x0980 <= ord(c) <= 0x0DFF)


def has_other_indic_letters(text: str) -> bool:
    """Any letter from an Indic block other than Devanagari (Tamil, Sinhala...)."""
    return _count_other_indic(text) > 0


# Scripts Devanagari may be rewritten INTO for display. A superset of the
# analysis map: see `localize_devanagari` for why Tamil belongs here only.
_DISPLAY_SCRIPTS: dict[str, str] = {**_SANSKRIT_CAPABLE_SCRIPTS, "ta": "Tamil"}

# A run of Devanagari letters, allowing the spaces and joiners between words.
# Danda (U+0964/5) is excluded on purpose: it is shared punctuation, not a letter.
_DEVANAGARI_RUN = re.compile(
    r"[ऀ-ॣ०-ॿ]+(?:[\s‌‍]+[ऀ-ॣ०-ॿ]+)*"
)


def localize_devanagari(text: str, lang_code: str) -> str:
    """Rewrite Devanagari pasted into a native-language line in that script.

    The model copies names and quoted Sanskrit straight out of its own
    Sanskrit line, so a Telugu reply came back "నీ పేరు अंशुల్" — two scripts
    and two fonts mid-sentence, even with the prompt forbidding it. Rewriting
    the run in the learner's own script is deterministic and, for these
    scripts, lossless — and it is how a Telugu or Kannada learner first met
    Sanskrit at school.

    Tamil IS included here, unlike in `as_devanagari`. Recovering Sanskrit
    FROM plain Tamil script is lossy, but writing it INTO Tamil is not:
    vidyut.lipi uses the standard superscript convention (गच्छामि ->
    க³ச்சா²மி), so voicing and aspiration survive. Live, a Tamil line opened
    with "उत्तमம்" — half Devanagari, half Tamil, inside one word.
    Devanagari-script languages (Hindi, Marathi) need nothing.
    """
    scheme_name = _DISPLAY_SCRIPTS.get((lang_code or "").lower())
    if not scheme_name or not text:
        return text
    try:
        from vidyut.lipi import Scheme, transliterate

        target = getattr(Scheme, scheme_name)
        return _DEVANAGARI_RUN.sub(
            lambda m: transliterate(m.group(0), Scheme.Devanagari, target), text
        )
    except Exception as exc:  # cosmetic; never costs the learner their turn
        logger.warning("could not localize Devanagari into %s: %s", scheme_name, exc)
        return text


def is_devanagari_pure(text: str) -> bool:
    """True when a field claiming to be Sanskrit is actually in Devanagari.

    The gate the 2026-09-22 measurement demanded. An empty field passes: a
    turn is allowed to carry no Sanskrit, and "" is not a purity failure.
    """
    stripped = (text or "").strip()
    if not stripped:
        return True
    return lang_detect.script_share(stripped, *lang_detect.DEVANAGARI) >= _SCRIPT_FLOOR


@dataclass
class SanskritHealth:
    """Vidyut's read of a line: how much of it parsed, and what it found."""

    ok: bool = False
    ratio: float = 0.0                              # confidently-parsed share
    features: dict[str, str] = field(default_factory=dict)
    unparsed: list[str] = field(default_factory=list)
    empty: bool = True
    looks_sanskrit: bool = False
    # Set when the learner wrote in a native Indic script and the line was
    # rewritten in Devanagari so Vidyut could read it. Empty otherwise.
    devanagari_form: str = ""
    # Person/number mismatches `agreement_errors` could PROVE. A line can
    # parse 100% and still carry one ("aham gacchasi"), so `ok` alone never
    # means "correct" — see `is_correct`.
    agreement: list[str] = field(default_factory=list)

    @property
    def is_correct(self) -> bool:
        """Vidyut's full verdict: a Sanskrit attempt that parses AND agrees."""
        return self.ok and self.looks_sanskrit and not self.agreement

    def as_prompt_fact(self) -> str:
        """The analysis, phrased for the model — including where not to trust it.

        The analyser matches stems, so it returns confident-looking output for
        Hindi and English too: "mujhe nahi pata" comes back as
        `mujha = LOC.SG, nah = LOC.SG, pat = VOC.SG`. Handing that over as
        fact invites the tutor to correct a learner's Hindi as bad Sanskrit,
        so the limitation is stated rather than hidden.
        """
        if self.empty:
            return "The learner wrote nothing."
        if not self.looks_sanskrit:
            return (
                "The learner does NOT appear to have written Sanskrit — no "
                "Sanskrit verb root or pronoun was found. The grammar "
                "analyser matches stems and will happily force other languages "
                "into Sanskrit endings, so there is no usable analysis of this "
                "line. Reply to what they MEANT, offer them the Sanskrit for "
                "it, and correct nothing."
            )
        bits = []
        if self.devanagari_form:
            # Without this the model sees Telugu letters and describes a
            # correct Sanskrit sentence as "asking how to say it in
            # Sanskrit" — observed live on 2026-09-22.
            bits.append(
                "The learner wrote SANSKRIT in their own script, not their own "
                f"language. In Devanagari it reads: {self.devanagari_form}."
            )
        bits.append(f"Vidyut parsed {round(self.ratio * 100)}% of the words.")
        if self.agreement:
            bits.append(
                "Vidyut found a REAL grammatical error — this is a mistake, and "
                "the fix must correct exactly it: " + "; ".join(self.agreement) + "."
            )
        if self.features:
            grammar = ", ".join(f"{k} = {v}" for k, v in sorted(self.features.items()))
            bits.append(f"Grammar found: {grammar}.")
        else:
            bits.append("No grammatical features could be read.")
        if self.unparsed:
            bits.append(
                "These words could not be read at all — most often that means "
                "a name, a place, or a borrowed word, NOT a mistake. Do not "
                "correct them unless the grammar around them is wrong: "
                f"{', '.join(self.unparsed)}."
            )
        return " ".join(bits)


# ─── Person agreement ────────────────────────────────────────────────────
#
# Vidyut's per-word parse says whether each word is a real form. It does not
# say whether the words AGREE, so "aham gacchasi" (I you-go) parses 100% and
# was reported as correct Sanskrit — measured 2026-09-22, along with
# "tvam gacchami", "aham gacchati" and "ahaṃ chātraḥ asi". Those are the most
# common mistakes a beginner makes, and the correction guard added the same
# day would have silently discarded the model's fix for every one of them.
#
# The check is deliberately narrow, per §6.3 — abstaining is always allowed,
# accusing is not:
#   • first- and second-person NOMINATIVE pronouns only. Their person is
#     unambiguous. "bhavān" is left out: it takes a third-person verb, and the
#     analyser misparses it as bhava ACC.PL anyway. Duals are left out because
#     āvām / yuvām are also accusative.
#   • per sentence, and only when a sentence has EXACTLY one such pronoun and
#     EXACTLY one finite verb. "aham gacchāmi, tvam?" (I'm going — you?) is
#     correct elliptical Sanskrit; with two pronouns in play, it abstains.
_PERSONAL_PRONOUNS: dict[str, tuple[str, str]] = {
    "aham": ("1", "SG"), "vayam": ("1", "PL"),
    "tvam": ("2", "SG"), "yūyam": ("2", "PL"), "yuyam": ("2", "PL"),
}
# Spellings the analyser does not parse (word-final ṃ), matched by exact
# spelling as a backup. A closed class, so spelling is safe to trust.
_PRONOUN_SPELLINGS: dict[str, str] = {
    "aham": "aham", "ahaṃ": "aham", "ahaṁ": "aham", "अहम्": "aham", "अहं": "aham",
    "vayam": "vayam", "vayaṃ": "vayam", "वयम्": "vayam", "वयं": "vayam",
    "tvam": "tvam", "tvaṃ": "tvam", "tvaṁ": "tvam", "त्वम्": "tvam", "त्वं": "tvam",
    "yūyam": "yūyam", "yuyam": "yūyam", "yūyaṃ": "yūyam", "यूयम्": "yūyam", "यूयं": "yūyam",
}
_FINITE = re.compile(r"\.([123])(SG|DU|PL)$")
_SENTENCE_END = re.compile(r"[।॥?!.]+")
_PERSON = {"1": "first", "2": "second", "3": "third"}
_NUMBER = {"SG": "singular", "DU": "dual", "PL": "plural"}


def agreement_errors(text: str) -> list[str]:
    """Person/number mismatches between a personal pronoun and its verb.

    Returns plain-English descriptions, empty when nothing is provably wrong.
    `text` must already be Devanagari or IAST (see `as_devanagari`).
    """
    errors: list[str] = []
    for sentence in _SENTENCE_END.split(text or ""):
        if not sentence.strip():
            continue
        try:
            results = analyze_sentence(sentence, is_iast=detect_script(sentence) != "dev")
        except Exception:  # an aid, never a turn-killer
            continue
        pronouns: list[tuple[str, str, str]] = []   # (word, person, number)
        verbs: list[tuple[str, str, str]] = []
        for r in results:
            parsed = r.parsed or {}
            key = next(
                (k for k, feat in parsed.items() if feat == "PRON" and k in _PERSONAL_PRONOUNS),
                None,
            ) or _PRONOUN_SPELLINGS.get((r.word or "").strip(",;:'\"").lower())
            if key:
                pronouns.append((r.word, *_PERSONAL_PRONOUNS[key]))
                continue
            for k, feat in parsed.items():
                m = _FINITE.search(feat or "")
                if k.startswith("√") and m:
                    verbs.append((r.word, m.group(1), m.group(2)))
                    break
        if len(pronouns) != 1 or len(verbs) != 1:
            continue
        (p_word, p_person, p_num), (v_word, v_person, v_num) = pronouns[0], verbs[0]
        if (p_person, p_num) != (v_person, v_num):
            errors.append(
                f"'{p_word}' needs a {_PERSON[p_person]}-person {_NUMBER[p_num]} "
                f"verb, but '{v_word}' is {_PERSON[v_person]}-person {_NUMBER[v_num]}"
            )
    return errors


def sanskrit_health(text: str) -> SanskritHealth:
    """Analyse a line, tolerating words Vidyut has never heard of.

    A proper noun is not an error. `analyzer.is_confident` demands that EVERY
    word parse, which no sentence containing a name can do — that is exactly
    the check that rejected "aham anshul asmi". And the analyzer cannot tell a
    name from gibberish: both come back `error="unrecognized"`, so the error
    flag is useless as a discriminator.

    What *does* separate them, measured on the real analyzer, is how much of
    the line survives: "aham anshul asmi" parses 67% (the frame `aham` +
    `√as PRES.1SG` is intact, one content word is unknown) while word salad
    parses 0%. So the verdict is the parsed share, and unreadable words are
    reported rather than counted as errors.
    """
    stripped = (text or "").strip()
    if not stripped:
        return SanskritHealth()

    # Sanskrit written in Kannada/Telugu/Malayalam/... script is still
    # Sanskrit; Vidyut just cannot read it until it is in Devanagari.
    original = stripped
    stripped = as_devanagari(stripped)
    devanagari_form = stripped if stripped != original else ""

    try:
        results = analyze_sentence(stripped, is_iast=detect_script(stripped) != "dev")
    except Exception as exc:  # the analyzer must never take a turn down
        logger.warning("analyzer raised on %r: %s", stripped[:60], exc)
        return SanskritHealth(empty=False)

    if not results:
        return SanskritHealth(empty=False)

    features: dict[str, str] = {}
    unparsed: list[str] = []
    confident = 0
    for r in results:
        if r.is_confident:
            confident += 1
            features.update(r.parsed or {})
        else:
            unparsed.append(r.word)

    ratio = confident / len(results)
    # Was this even an attempt at Sanskrit? The analyser cannot answer that —
    # it declines "mujhe" as happily as "rāmaḥ". Measured across real inputs,
    # what separates the two is a recognised VERBAL ROOT ("√as", "√vas",
    # "√gam") or a Sanskrit pronoun: a bridge-language line yields noun
    # declensions only, never a root. It is a heuristic, and it is used only
    # to decide whether the analysis is worth reporting at all.
    looks_sanskrit = any(
        role.startswith("√") or feat == "PRON" for role, feat in features.items()
    )
    # `ok` deliberately does NOT require `looks_sanskrit`. The two answer
    # different questions: `ok` is "is this well formed enough to say out
    # loud" (the outgoing gate) and `looks_sanskrit` is "was this an attempt
    # at Sanskrit at all" (a judgement about the learner). Conflating them
    # broke the gate on verbless questions — "भवान् कः?" has no verb because
    # Sanskrit elides the copula, and it is perfectly good Sanskrit.
    return SanskritHealth(
        ok=ratio >= _HEALTH_FLOOR,
        ratio=ratio,
        features=features,
        unparsed=unparsed,
        empty=False,
        looks_sanskrit=looks_sanskrit,
        devanagari_form=devanagari_form if looks_sanskrit else "",
        agreement=agreement_errors(stripped) if looks_sanskrit else [],
    )


@dataclass
class TutorReply:
    """One tutor turn, after every gate has had its say.

    Four jobs, not two halves of a translation:
      • `read_back`  — what the learner said, and in which languages.
      • `fix_*`      — the correct Sanskrit, when theirs needed fixing.
      • `reply_*`    — the tutor actually answering, in Sanskrit AND in the
                       learner's own language.
      • `explain_en` — the teaching, always in English.

    Every roman field is computed here by `to_iast()`, never by the model.
    """

    read_back: str = ""

    fix_needed: bool = False
    fix_dev: str = ""
    fix_iast: str = ""
    fix_note: str = ""

    reply_sa: str = ""
    reply_sa_iast: str = ""
    reply_native: str = ""

    explain_en: str = ""

    native_lang: str = "en"
    done: bool = False
    source: str = "llm"       # "llm" | "llm_no_sanskrit" | "degraded"
    learner: SanskritHealth = field(default_factory=SanskritHealth)

    @property
    def has_content(self) -> bool:
        """Is there anything at all to show the learner?"""
        return bool(self.reply_sa or self.reply_native or self.explain_en)

    @property
    def speakable(self) -> str:
        """The line the tutor says out loud — Sanskrit first, else native."""
        return self.reply_sa or self.reply_native


_SYSTEM_PROMPT = """You are a warm, fluent Sanskrit conversation partner in \
Sanskritam. You are talking WITH one learner, the way a friend who happens to \
know Sanskrit deeply would. You are not a translator and you are not a quiz.

THE LEARNER MIXES LANGUAGES. They may write Sanskrit mixed with their own Indian \
language, in that language's own script or in roman letters. That is normal and \
welcome. Never scold it. Work out what they meant, then help.

EVERY REPLY HAS FOUR JOBS, and they are DIFFERENT things:
1. "read_back": one line of English on what the learner's LATEST line said and \
which languages it used. Their latest line only — never an earlier one.
2. "fix": THEIR line, said properly in Sanskrit. Use it when their Sanskrit was \
wrong or incomplete, when they mixed in another language, or when they wrote no \
Sanskrit at all (then give the Sanskrit for what they said). When their Sanskrit \
was already correct, "needed" is false and the fix is empty.
3. "reply_sa" and "reply_native": YOUR OWN answer to them, as a person — never a \
translation of what they said. If they say "I am fine, how are you?", the fix \
is THEIR sentence in Sanskrit, and your reply says how YOU are. React to what \
they actually said, add something of your own, and move the conversation on. \
You may ask a question, but you do not have to. When "fix.needed" is true their \
line was NOT correct, so neither reply may call it correct, right or true: do \
not open with सत्यम्, सम्यक्, समीचीनम् or साधु, and do not say "Correct" or \
"Right" in any language. Encourage the attempt instead, then answer.
4. "explain_en": English teaching about the Sanskrit in THIS turn — what each \
part means and why it was chosen. See the grammar-label rule below.

HOW YOU TALK
- Read the learner's latest line carefully. Answering a sentence they did not \
write is worse than answering slowly. Never claim they wrote or added a word \
that is not in their line.
- Use what they told you. If they said their name, use it. Never ask again for \
something they already answered.
- Never repeat a sentence you already said in this conversation. Each turn says \
something new.
- Keep "reply_sa" short: one to three simple sentences a beginner can read.
- Never use em dashes in anything the learner will read. Use commas or full stops.

WHAT COUNTS AS CORRECT
- Sanskrit written in roman letters ("aham gacchami") or in the learner's own \
script ("ಅಹಂ ಗಚ್ಛಾಮಿ") is still Sanskrit. The script is NOT an error; never \
"correct" it into Devanagari.
- Sanskrit routinely leaves out the verb "to be". "सः बालः" and "भवान् कः?" \
are complete, correct sentences. Never tell a learner they must add अस्ति or \
अस्मि.
- There is no single expected answer. Any grammatical reply that makes sense is \
correct.

OUTPUT — one JSON object, nothing else, no markdown fences:
{"read_back": "<one line of English: what they said + which languages>",
 "fix": {"needed": <true|false>,
         "devanagari": "<the correct Sanskrit in Devanagari, empty if nothing to fix>",
         "note_en": "<one line of English on what was wrong, empty if nothing to fix>"},
 "reply_sa": "<your conversational reply in Sanskrit, Devanagari>",
 "reply_native": "<your reply_sa, said again in THE LANGUAGE NAMED IN THE \
FINAL INSTRUCTION, in that language's own native script>",
 "explain_en": "<2-4 sentences of English: what the Sanskrit in this turn \
means, word by word where it helps, and why it is built that way>",
 "done": false}

CRITICAL — FIELD PURITY. These are hard constraints, not preferences:
- "reply_sa" and "fix.devanagari" must be 100% Devanagari script. Not one \
letter of Telugu, Kannada, Tamil, Malayalam, Bengali, Gujarati or Latin may \
appear in them. If you cannot write pure Sanskrit, leave the field EMPTY.
- "reply_sa" must be SANSKRIT, never Hindi. Hindi is not Sanskrit merely \
because it shares the script.
- "read_back" and "explain_en" are English. You may quote Devanagari words \
inside them — that is wanted — but the prose around the quotes is English.
- ONLY "reply_native" uses the learner's own script — and it uses it for \
everything, names included. Do not paste a Devanagari name into it.
- Do NOT transliterate anything into roman letters anywhere. Roman spellings \
are generated elsewhere and yours would conflict.

GRAMMAR IS NOT YOURS TO JUDGE
- You are given a Vidyut morphological analysis of the learner's line and, \
when there is one, a verdict. When the verdict says the line is correct, it \
IS correct: "fix.needed" is false. Do not invent a reason to correct it.
- Otherwise, call a form wrong ONLY when the analysis shows it is wrong. Words \
listed as unreadable are names or borrowings — accept them silently.
- The analysis is imperfect and sometimes misreads a correct word. If it \
disagrees with what the learner obviously meant, trust the learner.
- NEVER invent a Sanskrit word. If you do not know the Sanskrit for something, \
say so in "explain_en" and leave it out of "fix.devanagari". A confidently \
invented word is the worst thing you can do to a learner.
- In "explain_en", name a grammatical form — a case, number, person or tense — \
ONLY for a word whose form appears in the Vidyut analysis you were given. For \
every other word, including all of your own, say what it MEANS and why it fits; \
do not label its grammar. Words like कुत्र, कुतः, अद्य, अत्र are indeclinables \
and have no case at all.
- Names, places and modern words inside a Sanskrit frame are CORRECT. Never \
tell a learner their own name is a mistake.

Keep the Sanskrit beginner-friendly: short, classical, standard forms — \
nominative, accusative, locative, ablative, present tense.

Set "done": true only when the learner says goodbye."""

_RETRY_NUDGE = """Your previous reply was rejected. Its "reply_sa" or \
"fix.devanagari" was either not pure Devanagari script, or did not pass the \
Sanskrit grammar checker. Reply again using SHORTER, simpler Sanskrit — a \
three-or-four word sentence in standard classical forms, 100% Devanagari — or \
leave those fields EMPTY and carry the turn in "reply_native" and \
"explain_en" instead."""


_MIRROR_NUDGE = """Your previous "reply_sa" was the same sentence as \
"fix.devanagari". That is translating the learner's line back to them, not \
answering them. The fix is THEIR sentence; "reply_sa" must be YOUR OWN answer — \
react to what they said, add something of your own, and move the conversation \
on."""

_MIRROR_NORM = re.compile(r"[\s।॥?!.,;:'\"()\-]+")


def mirrors_fix(reply: "TutorReply") -> bool:
    """True when the tutor's reply is just the learner's own line, translated.

    The owner's first complaint, word for word: "Looks like its just
    translating what we are saying." Measured on the third live run, the
    prompt alone left one turn in sixteen doing exactly that — the learner
    said "naanu chennagiddini, neevu hegiddira?" (I'm fine, how are you?) and
    the reply was the identical sentence as the fix. Cheap to detect exactly,
    so it is detected rather than hoped away.

    Also catches the fix plus a short tail — "अहं कुशली अस्मि। भवान् कथम्
    अस्ति? अद्य अत्र अध्ययनं कुर्मः।", where the learner's own line was 61% of
    the reply. So: the fix anywhere in the reply (not only at the start, since
    "साधु!" in front changes nothing), making up at least half of it. A short
    fix quoted inside a longer, genuinely new reply stays well under that.
    """
    if not (reply.reply_sa and reply.fix_dev):
        return False
    r = _MIRROR_NORM.sub("", reply.reply_sa)
    f = _MIRROR_NORM.sub("", reply.fix_dev)
    if not r or not f:
        return False
    return f in r and len(f) >= 0.5 * len(r)


# Words that tell a learner their line was right. Measured 2026-09-23 over 21
# correction turns: 10 replies OPENED with सत्यम् or सम्यक् — shown to the
# learner as "Correct.", "Right.", "Exactly!", "सही है।" — beside a card
# showing their line was wrong. A prompt rule brought it to 5 of 18; this
# catches the rest.
_AFFIRMATIONS = frozenset({"सत्यम्", "सम्यक्", "समीचीनम्", "साधु", "शुद्धम्"})
_OPENING_WORD = re.compile(r"^[\s'\"‘“]*([^\s।॥!?,.;:'\"’”]+)")


def affirms_a_fixed_line(reply: "TutorReply") -> bool:
    """True when a reply opens by calling a line correct that it also fixes.

    Only the OPENING word counts. "अहो, वयम् गच्छामः इति सम्यक्।" says the
    FIX is correct, which is exactly right, and a whole-line search would
    retry it.
    """
    if not (reply.fix_needed and reply.reply_sa):
        return False
    m = _OPENING_WORD.match(reply.reply_sa)
    return bool(m) and m.group(1) in _AFFIRMATIONS


def _norm_sentence(text: str) -> str:
    return _MIRROR_NORM.sub("", text or "")


def repeated_questions(reply_sa: str, asked: list[str]) -> list[str]:
    """Questions in this reply that the tutor has already asked.

    Containment, not equality: live, "भवान् कुतः आगतः?" came back as
    "अद्य भवान् कुतः आगतः?" twice more — the same question with "today"
    bolted on, which an exact match would wave through. Very short asked
    questions are skipped so a bare "किम्?" cannot match everything.
    """
    if not reply_sa or not asked:
        return []
    prior = [n for n in (_norm_sentence(q) for q in asked) if len(n) >= 8]
    hits: list[str] = []
    for q in _QUESTION.findall(reply_sa):
        n = _norm_sentence(q)
        if n and any(p in n or n in p for p in prior):
            hits.append(q.strip())
    return hits


# Every Indic block after Devanagari, through Sinhala. A letter from any of
# these that is not the learner's own script has no business in their line.
_OTHER_INDIC = (0x0980, 0x0DFF)


def foreign_script_in_native(text: str, lang_code: str) -> str:
    """Name the OTHER script whose letters leaked into a native-language line.

    Live, twice: a session opened in Kannada (the learner's language last
    time), the learner switched to Telugu, and the Telugu reply ended in a
    Kannada phrase copied from the opening — "మీరు ಎಲ್ಲಿಂದ ಬರುತ್ತೀರಿ?".
    Those are Kannada WORDS, so transliterating the letters would not help;
    it has to be rewritten. Later a single SINHALA letter turned up inside a
    Telugu word ("సువසాగతం"), which is why this checks the whole Indic range
    rather than only the scripts Talk supports, and why one letter is enough.
    Devanagari is not checked: it is either the learner's own script or is
    localized after the gate.
    """
    if not text:
        return ""
    target = lang_detect.get(lang_code)
    for c in text:
        if not c.isalpha():
            continue
        o = ord(c)
        if not (_OTHER_INDIC[0] <= o <= _OTHER_INDIC[1]):
            continue
        if target.block and target.block[0] <= o <= target.block[1]:
            continue
        for code, lo, hi in lang_detect._UNIQUE_BLOCKS:
            if lo <= o <= hi:
                return f"{lang_detect.get(code).name_en} letters"
        return "letters from another script"
    return ""


_QUOTED = re.compile(r"'[^']*'|\"[^\"]*\"|‘[^’]*’|“[^”]*”")
# Per sentence. The same floor the outgoing gate uses to call a line speakable
# Sanskrit — and the one the live transliterated sentence (0.67) sat above.
_TRANSLITERATED_FLOOR = _HEALTH_FLOOR


def native_line_is_sanskrit(text: str, lang_code: str) -> bool:
    """True when the "native" line is really the Sanskrit, in native letters.

    Live: a learner wrote Sanskrit in Telugu script, and the model answered
    in kind — "మమ నామ మిత్రమ్. భవాన్ కుత్త్ అస్తి?" is its Sanskrit reply
    written in Telugu LETTERS, not said in the Telugu LANGUAGE, so a learner
    who reads Telugu got no reply they could understand. The test is the same
    one that tells a learner's native-script Sanskrit from their own language,
    which real Telugu, Kannada and Malayalam sentences measurably fail.
    """
    if (lang_code or "").lower() not in _SANSKRIT_CAPABLE_SCRIPTS or not text:
        return False
    # Judged SENTENCE BY SENTENCE, and flagged only when every sentence is
    # Sanskrit. A native line that shows the learner an example — quoted or
    # not — is exactly right: "ഇത് ലളിതമാണ്. ഗൃഹം ഗച്ഛാമി." is "This is
    # simple." in Malayalam followed by the Sanskrit. Scored as one line it
    # read 75% Sanskrit and was flagged, because Malayalam is so Sanskritised
    # that "ലളിതം" IS Sanskrit "lalita". Per sentence, the Malayalam one
    # reads as not-Sanskrit and the line is left alone; the transliterated
    # reply this exists for was Sanskrit in every sentence (1.00 and 0.67).
    unquoted = _QUOTED.sub(" ", text)
    judged = 0
    for sentence in _SENTENCE_END.split(unquoted):
        if len(sentence.split()) < 2:
            continue  # one word is too short to call either way
        judged += 1
        h = sanskrit_health(sentence)
        if not (h.looks_sanskrit and h.ratio >= _TRANSLITERATED_FLOOR):
            return False
    return judged > 0


def soft_problems(reply: "TutorReply", asked: list[str], native_lang: str) -> list[str]:
    """Everything wrong with a reply that one more try might fix.

    "Soft" as opposed to the gates: none of these makes the reply unsafe to
    show, so the first reply is kept as a fallback and only replaced by a
    retry that is not worse. Each entry is the sentence the model is told.
    """
    problems: list[str] = []
    if mirrors_fix(reply):
        problems.append(_MIRROR_NUDGE)
    if affirms_a_fixed_line(reply):
        problems.append(
            "Your previous \"reply_sa\" opened by telling the learner their line "
            "was right, but your fix shows it was wrong. Neither reply may call "
            "it correct, right or true — encourage the attempt, then answer."
        )
    again = repeated_questions(reply.reply_sa, asked)
    if again:
        problems.append(
            "Your previous \"reply_sa\" asked again: " + " | ".join(again)
            + " — you already asked that in this conversation. Ask something "
            "new, or ask nothing."
        )
    foreign = foreign_script_in_native(reply.reply_native, native_lang)
    if foreign:
        problems.append(
            f"Your previous \"reply_native\" mixed in {foreign}. Write it ONLY "
            f"in {lang_detect.order_phrase(native_lang)}."
        )
    if native_line_is_sanskrit(reply.reply_native, native_lang):
        lang = lang_detect.get(native_lang).name_en
        problems.append(
            f"Your previous \"reply_native\" was your Sanskrit written in {lang} "
            f"letters. It must be TRANSLATED into the {lang} language — words a "
            f"{lang} speaker uses — not transliterated."
        )
    return problems


class ConversationTutor:
    """Runs one free-form turn: analyse, ask the model, gate what comes back."""

    def __init__(self, provider_ref: Optional[str] = None) -> None:
        self._provider_ref = provider_ref or settings.tutor_provider
        self._provider = None

    def _get_provider(self):
        if self._provider is None:
            self._provider = build_provider(
                self._provider_ref, timeout=settings.tutor_timeout_s
            )
        return self._provider

    @property
    def available(self) -> bool:
        try:
            return self._get_provider().configured
        except ValueError:
            return False

    async def reply(
        self,
        *,
        transcript: str,
        history: list[dict[str, str]],
        situation: str,
        target_features: list[str],
        native_lang: str,
        opening: bool = False,
    ) -> TutorReply:
        """Produce the tutor's next turn.

        `transcript` is the learner's utterance ("" on the opening turn).
        `native_lang` has already been settled by `services/lang_detect.py` —
        this method does not guess it and does not let the model choose it.

        Returns a TutorReply whose Sanskrit has passed both gates, or which
        carries none at all. Never raises.
        """
        t0 = time.perf_counter()
        health = sanskrit_health(transcript) if not opening else SanskritHealth()
        health_ms = (time.perf_counter() - t0) * 1000

        user = self._build_user_prompt(
            transcript=transcript,
            health=health,
            history=history,
            situation=situation,
            target_features=target_features,
            native_lang=native_lang,
            opening=opening,
        )

        t1 = time.perf_counter()
        reply = await self._call_and_gate(
            user, asked=asked_questions(history), native_lang=native_lang
        )
        gate_ms = (time.perf_counter() - t1) * 1000

        # §6.3: Vidyut decides grammar, not the model. When Vidyut read the
        # learner's line as correct Sanskrit, no correction reaches them —
        # whatever the model wrote. The prompt says the same thing, and was
        # measured not to be enough: live on 2026-09-22, "aham kushalah asmi"
        # (correct) drew a "say it like this" card for "कुशलः अस्मि" with an
        # invented rule about gender agreement to justify it. A wrong
        # correction costs far more than a missed one.
        if not opening and health.is_correct and reply.fix_needed:
            logger.info(
                "suppressed a fix on a line Vidyut read as correct: %r -> %r",
                transcript[:60], reply.fix_dev[:60],
            )
            reply.fix_needed = False
            reply.fix_dev = reply.fix_iast = reply.fix_note = ""

        reply.reply_native = localize_devanagari(reply.reply_native, native_lang)
        logger.info(
            "[talk] tutor health=%.0fms llm+gate=%.0fms total=%.0fms source=%s lang=%s",
            health_ms, gate_ms, (time.perf_counter() - t0) * 1000,
            reply.source, native_lang,
        )
        reply.learner = health
        reply.native_lang = native_lang
        return reply

    async def _call_and_gate(
        self,
        user: str,
        asked: Optional[list[str]] = None,
        native_lang: str = "en",
    ) -> TutorReply:
        """One call, then at most one retry — for rejected Sanskrit, or for
        every soft problem `soft_problems` finds, named together.

        A reply with only soft problems is still a COMPLETE, valid turn, so it
        is kept as the fallback. The retry replaces it only if it is not worse:
        an outage, Sanskrit the gate has to drop, or MORE soft problems all
        leave the learner with the first reply.
        """
        asked = asked or []
        nudge = _RETRY_NUDGE
        fallback: Optional[TutorReply] = None
        fallback_problems: list[str] = []
        for attempt in (0, 1):
            system = _SYSTEM_PROMPT if attempt == 0 else _SYSTEM_PROMPT + "\n\n" + nudge
            raw = await self._complete(system, user)
            if raw is None:
                if fallback is not None:
                    return fallback
                return TutorReply(
                    explain_en="I lost my train of thought there — say that again?",
                    source="degraded",
                )

            parsed = _parse_reply(raw)
            if parsed is None:
                logger.warning("tutor reply was not JSON: %r", raw[:200])
                continue

            reply, sanskrit_rejected = self._gate(parsed)
            problems = (
                soft_problems(reply, asked, native_lang) if reply.has_content else []
            )
            if attempt == 0:
                if sanskrit_rejected:
                    # Worth one more try at a simpler register before we give
                    # up on saying anything in Sanskrit this turn.
                    continue
                if problems:
                    logger.info("tutor reply had %d soft problem(s); retrying: %s",
                                len(problems), [p[:48] for p in problems])
                    fallback, fallback_problems = reply, problems
                    nudge = ("Your previous reply was not used, for these reasons:\n- "
                             + "\n- ".join(problems))
                    continue
            elif fallback is not None and (
                sanskrit_rejected
                or not reply.has_content
                or len(problems) > len(fallback_problems)
            ):
                return fallback
            if reply.has_content:
                return reply

        if fallback is not None:
            return fallback
        return TutorReply(
            explain_en="Let's try that once more — say it however you like.",
            source="degraded",
        )

    def _gate(self, parsed: dict[str, Any]) -> tuple[TutorReply, bool]:
        """Apply every gate to one parsed model reply.

        Returns ``(reply, sanskrit_rejected)``. `sanskrit_rejected` is True
        when a NON-EMPTY Sanskrit field was thrown away, which is the only
        condition worth retrying — a model that deliberately left the field
        empty has made a legitimate choice and retrying just burns a call.
        """
        fix_raw = parsed.get("fix")
        if not isinstance(fix_raw, dict):
            fix_raw = {}

        reply_sa = str(parsed.get("reply_sa") or "").strip()
        fix_dev = str(fix_raw.get("devanagari") or "").strip()

        rejected = False
        reply_sa, dropped = self._gate_sanskrit(reply_sa, "reply_sa")
        rejected |= dropped
        fix_dev, dropped = self._gate_sanskrit(fix_dev, "fix.devanagari")
        rejected |= dropped

        # `needed` is the model's claim; an empty fix after gating is no fix,
        # whatever it claimed. Rendering a "say it like this" card with
        # nothing in it is worse than not rendering one.
        fix_needed = bool(fix_raw.get("needed")) and bool(fix_dev)

        reply = TutorReply(
            read_back=str(parsed.get("read_back") or "").strip(),
            fix_needed=fix_needed,
            fix_dev=fix_dev,
            fix_iast=to_iast(fix_dev) if fix_dev else "",
            fix_note=str(fix_raw.get("note_en") or "").strip() if fix_needed else "",
            reply_sa=reply_sa,
            reply_sa_iast=to_iast(reply_sa) if reply_sa else "",
            reply_native=str(parsed.get("reply_native") or "").strip(),
            explain_en=str(parsed.get("explain_en") or "").strip(),
            done=bool(parsed.get("done", False)),
            source="llm" if reply_sa else "llm_no_sanskrit",
        )
        return reply, rejected

    @staticmethod
    def _gate_sanskrit(text: str, label: str) -> tuple[str, bool]:
        """Script purity, then Hindi, then Vidyut. Returns ``(kept, dropped)``.

        Order matters and is cheapest-first: a script check is a character
        scan, the Hindi check is a set intersection, and only survivors pay
        for a Vidyut parse.
        """
        if not text:
            return "", False

        # A slip is a letter or two, and it is repaired BEFORE the purity
        # floor — otherwise whether one stray letter survives depends on how
        # long the sentence around it is (1 in 9 letters fails a 90% floor,
        # 1 in 25 passes). Anything bigger is a real leak and the floor below
        # rejects it untouched.
        if 0 < _count_other_indic(text) <= _MAX_SLIP_LETTERS:
            text = repair_stray_letters(text)

        if not is_devanagari_pure(text):
            share = lang_detect.script_share(text, *lang_detect.DEVANAGARI)
            logger.info(
                "tutor %s was not Devanagari (%.0f%%): %r",
                label, share * 100, text[:80],
            )
            return "", True

        # Letters that could not be repaired (Tamil, Sinhala) are rejected.
        if has_other_indic_letters(text):
            logger.info("tutor %s kept letters from another script: %r", label, text[:80])
            return "", True

        if _is_bridge_language(text):
            logger.info("tutor %s was Hindi, not Sanskrit: %r", label, text[:80])
            return "", True

        gate = sanskrit_health(text)
        if not gate.ok:
            logger.info(
                "tutor %s failed the grammar gate (ratio=%.2f unparsed=%s): %r",
                label, gate.ratio, gate.unparsed, text[:80],
            )
            return "", True
        if gate.agreement:
            # "अहं गच्छति" parses word by word. Saying it to a learner teaches
            # the exact mistake they are here to stop making.
            logger.info("tutor %s failed agreement (%s): %r",
                        label, "; ".join(gate.agreement), text[:80])
            return "", True

        return text, False

    async def _complete(self, system: str, user: str) -> Optional[str]:
        try:
            provider = self._get_provider()
        except ValueError as exc:
            logger.warning("tutor provider unavailable: %s", exc)
            return None
        try:
            resp: LLMResponse = await provider.complete(
                system,
                user,
                temperature=settings.tutor_temperature,
                max_tokens=settings.tutor_max_tokens,
                json_mode=True,
            )
        except Exception as exc:
            logger.warning("tutor call failed: %s", exc)
            return None
        if not resp.ok:
            logger.warning("tutor response not ok: %s", resp.error or "empty")
            return None
        return resp.text

    @staticmethod
    def _build_user_prompt(
        *,
        transcript: str,
        health: SanskritHealth,
        history: list[dict[str, str]],
        situation: str,
        target_features: list[str],
        native_lang: str,
        opening: bool,
    ) -> str:
        lines = [
            f"Situation: {situation}" if situation else "",
        ]
        if target_features:
            lines.append(
                "Grammar worth steering the conversation towards (do not "
                "announce these, just create chances to use them): "
                + ", ".join(target_features)
            )
        if history:
            lines.append("\nConversation so far:")
            for h in history:
                who = "Tutor" if h["role"] == "tutor" else "Learner"
                lines.append(f"  {who}: {h['text']}")
            asked = asked_questions(history)
            if asked:
                lines.append(
                    "\nQuestions you have ALREADY asked in this conversation. "
                    "Do not ask any of them again, in any wording — ask "
                    "something new, or ask nothing: " + " | ".join(asked)
                )

        if opening:
            # Measured: without a length limit the opening ran to four or five
            # Sanskrit sentences — a wall for a learner's very first line.
            lines.append(
                "\nThis is the FIRST turn. Greet the learner warmly in ONE short "
                "Sanskrit sentence and ask ONE easy question. There is nothing "
                "to read back and nothing to correct yet — leave \"read_back\" "
                "empty and \"fix.needed\" false."
            )
        else:
            lines.append(f"\nThe learner's LATEST line: {transcript}")
            lines.append(f"Vidyut's analysis of that line: {health.as_prompt_fact()}")
            if health.is_correct:
                # Stated as a verdict, not left for the model to infer from the
                # analysis. The server enforces it too (see `reply`); saying it
                # here stops the model writing a WHY paragraph about a fix that
                # is then removed.
                lines.append(
                    "Vidyut's verdict: this line is CORRECT Sanskrit. \"fix.needed\" "
                    "is false. Respond to what it SAYS."
                )

        # LAST, and phrased as an order rather than a rule. Measured
        # 2026-09-22: this model ignores a language instruction in the system
        # prompt and collapses to Kannada (2/7 languages correct); the same
        # instruction here took it to 9/9. services/explainer.py records the
        # identical finding. Do not move this into _SYSTEM_PROMPT.
        phrase = lang_detect.order_phrase(native_lang)
        lines.append(f"\nThe learner's own language is {phrase}.")
        lines.append(
            f'Write "reply_native" ENTIRELY in {phrase}. This is not optional. '
            f"Do not write it in any other language."
        )
        lines.append("Reply with the JSON object only.")
        return "\n".join(x for x in lines if x)


_QUESTION = re.compile(r"[^।॥?!.\n]+\?")
_CORRECTION_TAG = "  [you already corrected"


def asked_questions(history: list[dict[str, str]]) -> list[str]:
    """Every question the tutor has already asked, in order, deduplicated.

    Measured live: a general "never repeat yourself" rule in the system prompt
    did not stop the tutor asking "भवान् कुत्र वसति?" four times in one
    conversation. Handing it the literal list, in the user message, is the
    same move that fixed the reply language — this model follows a specific
    order next to its turn far better than a rule at the top.
    """
    seen: set[str] = set()
    out: list[str] = []
    for h in history:
        if h.get("role") != "tutor":
            continue
        text = h.get("text", "").split(_CORRECTION_TAG)[0]
        sanskrit = text.split(" / ")[0]
        for q in _QUESTION.findall(sanskrit):
            q = q.strip()
            if q and q not in seen:
                seen.add(q)
                out.append(q)
    return out


def _parse_reply(text: str) -> Optional[dict[str, Any]]:
    """Extract the reply object, tolerating Sarvam's occasional wrappers."""
    data: Any = None
    try:
        data = json.loads(text)
    except (json.JSONDecodeError, TypeError):
        m = re.search(r"\{.*\}", text or "", re.DOTALL)
        if m:
            try:
                data = json.loads(m.group(0))
            except json.JSONDecodeError:
                return None
    if not isinstance(data, dict):
        return None
    # Same envelope quirk edge_router._deep_edge guards against.
    _KEYS = ("reply_sa", "reply_native", "explain_en", "read_back", "fix")
    if not any(k in data for k in _KEYS):
        for v in data.values():
            if isinstance(v, dict) and any(k in v for k in _KEYS):
                return v
        return None
    return data


# ─── Session helpers ────────────────────────────────────────────────────


def target_features(db: DBSession, scenario_id: str) -> list[str]:
    """The scenario's syllabus: every feature its authored sa-edges exercise.

    This is all that survives of the graph on the live path. The authored
    edges stop being a script the learner must reproduce and become the list
    of grammar the conversation should create openings for.
    """
    edges = (
        db.query(DialogueEdge)
        .filter(DialogueEdge.scenario_id == scenario_id, DialogueEdge.lang == "sa")
        .all()
    )
    seen: list[str] = []
    for e in edges:
        for f in e.features or []:
            if f not in seen:
                seen.append(f)
    return seen


def situation(scenario: Optional[DialogueScenario]) -> str:
    if scenario is None:
        return ""
    bits = [scenario.title or "", scenario.description or ""]
    return " — ".join(b for b in bits if b)


def history_for_prompt(
    db: DBSession, session_id: str, limit: int = _HISTORY_TURNS
) -> list[dict[str, str]]:
    """Recent turns, flattened to what the model needs to not repeat itself.

    The correction is carried now. Without it the tutor had no memory of what
    it had already corrected and would raise the same note every turn.
    """
    rows = (
        db.query(ConversationTurn)
        .filter(ConversationTurn.session_id == session_id)
        .order_by(ConversationTurn.idx.desc())
        .limit(limit)
        .all()
    )
    out: list[dict[str, str]] = []
    for r in reversed(rows):
        text = " / ".join(x for x in (r.devanagari or "", r.gloss or "") if x)
        if r.correction:
            text = f"{text}  [you already corrected: {r.correction}]" if text else ""
        if text:
            out.append({"role": r.role, "text": text})
    return out


def record_turn(
    db: DBSession,
    session: ConversationSession,
    *,
    role: str,
    devanagari: str = "",
    iast: str = "",
    gloss: str = "",
    correction: str = "",
    parsed_features: Optional[dict] = None,
    verdict: str = "",
) -> ConversationTurn:
    """Append one line to the session transcript."""
    next_idx = (
        db.query(ConversationTurn)
        .filter(ConversationTurn.session_id == session.id)
        .count()
    )
    turn = ConversationTurn(
        session_id=session.id,
        idx=next_idx,
        role=role,
        devanagari=devanagari,
        iast=iast,
        gloss=gloss,
        correction=correction,
        parsed_features=parsed_features or {},
        verdict=verdict,
    )
    db.add(turn)
    return turn


_singleton: Optional[ConversationTutor] = None


def get_tutor() -> ConversationTutor:
    global _singleton
    if _singleton is None:
        _singleton = ConversationTutor()
    return _singleton
