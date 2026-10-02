"""Off-turn-path explainer: answers "what does that mean?" for a tutor line.

§12 puts NO model in the guided turn path — that is what buys the sub-second
turn. It does allow one live off the path: the tap-to-expand explanation,
which "tolerates 2 s because nobody is waiting mid-conversation". This module
is that caller. The turn loop never awaits it; the client asks for it after
the turn has already returned (turn_loop flags `meta_intent`, the client then
calls POST /conversation/explain).

Vendor: **Sarvam `sarvam-105b-conversations`**, per the user's 2026-08-30
instruction to keep the live path on one vendor. This overrides the §12 table
row that named Gemini for live diagnosis. Two consequences worth knowing,
both from DECISIONS.md:
  • The `sarvam-105b` REASONING variant stays banned from request paths (41%
    empty responses, p50 42.8 s). `-conversations` only — enforced by the
    configured default in settings.explain_provider.
  • Sarvam mis-analyses the DUAL, arguing it should be plural (50% false
    accusation vs Gemini's 3%). The prompt below therefore asks for meaning,
    not morphology, and forbids grammatical number claims. A dual-bearing
    line is the one case where this explainer is expected to be weaker than
    the Gemini path the architecture originally specified.

Contract:
  • Explains an ALREADY-AUTHORED line. It never invents Sanskrit — §12 ships
    no ungated Sanskrit, and there is no Vidyut gate on this path. Quoting
    words from the given line is allowed; composing new ones is not.
  • It never grades. Verdicts are Vidyut's (§6.3) and must stay reproducible;
    an explanation that says "you were wrong" would be a second, unauditable
    grader.
  • Fail-closed: no key, timeout, disabled, or empty output → None. The
    caller degrades to the node's own gloss. An LLM outage must never break
    the conversation.
"""

from __future__ import annotations

import json
import logging
import os
import re
from typing import Optional

from app.config import settings
from app.evals.providers import LLMResponse, build_provider

logger = logging.getLogger("shabd.explainer")

# Same reason as services/edge_router.py: the evals Provider reads its key from
# os.environ (evals run as CLI scripts), while the app loads keys into pydantic
# `settings` from backend/.env, where they never reach the process env. Seed
# once at import so a provider built here sees the configured key. Idempotent —
# edge_router does the same and whichever imports first wins.
for _spec_env in ("SARVAM_API_KEY", "GEMINI_API_KEY", "OPENAI_API_KEY",
                  "ANTHROPIC_API_KEY", "OPENROUTER_API_KEY"):
    if not os.environ.get(_spec_env):
        _from_settings = getattr(settings, _spec_env.lower(), "") or ""
        if _from_settings:
            os.environ[_spec_env] = _from_settings


_SYSTEM_PROMPT = """You are a patient Sanskrit tutor's assistant in Sanskritam, a \
learning app. A beginner has asked what a line means. Explain it.

Rules:
- Answer in the language the final instruction names, and no other. This is \
not negotiable: a learner who asked in English cannot read a Hindi answer.
- 2-3 short sentences, maximum 60 words. Plain prose, no markdown, no lists, \
no headings, no backticks, no asterisks, no preamble like "Sure!".
- Give the MEANING first. If the line is short, add a word-by-word gloss.
- You may quote Sanskrit words that appear in the line. NEVER compose a new \
Sanskrit sentence, and never suggest what the learner should say next.
- Do NOT say whether the learner was right or wrong. You are not grading.
- Describe meaning, not grammatical analysis. Do NOT make claims about \
grammatical number (singular / dual / plural) or case endings unless the \
learner explicitly asked about grammar.
- Never use em dashes. Use commas or full stops.
- If you cannot tell what the line means, say so plainly in one sentence."""


# A question that is not about a line on screen ("How do I say hello?", "What
# is sandhi?"). Same rules, with one deliberate difference: a learner asking how
# to say something needs the Sanskrit, so single well-known words and short
# standard phrases may be quoted, but nothing longer is composed.
_GENERAL_PROMPT = """You are a patient Sanskrit tutor's assistant in Sanskritam, a \
learning app. A beginner asks a question about Sanskrit. Answer it.

Rules:
- Answer in the language the final instruction names, and no other. This is \
not negotiable: a learner who asked in English cannot read a Hindi answer.
- 2-3 short sentences, maximum 60 words. Plain prose, no markdown, no lists, \
no headings, no backticks, no asterisks, no preamble like "Sure!".
- Answer only what was asked, simply, for a beginner.
- You may quote a single well-known Sanskrit word or a short standard phrase \
(for example namaste, dhanyavada, svagatam) with its meaning. NEVER compose a \
new Sanskrit sentence; if the question needs one, say you are not sure of the \
exact form.
- Do NOT grade the learner.
- Never use em dashes. Use commas or full stops.
- If the question is not about Sanskrit or learning it, say in one sentence that \
you can only help with Sanskrit.
- If you are not sure, say so plainly in one sentence."""


# Wider Ask answers with a card (HANDOVER 4.4). One JSON object, no markdown.
# Never state a date, tithi or time that is not in FACTS. The server sets
# `when` itself from calculated facts; the model never writes it.
_WIDE_PROMPT = """You are a patient Sanskrit tutor's assistant in Sanskritam, a \
learning app. Answer the learner's question as one JSON object, no markdown.

You may answer about: the Sanskrit language; Sanskrit texts and their ideas; \
Hindu festivals, vratas and rituals and what they mean; the panchang, using \
only the FACTS given; Ayurveda and yoga as traditional practice; stories, \
epics and deities.

Anything else gets one sentence saying what you can help with: news and \
politics, comparing or judging religions, predictions about a person's \
future, medical diagnosis or prescription, legal or money advice, coding.

Calendar facts: never state a date, a tithi or a time that is not in FACTS. \
If the question needs one and FACTS has none, say you cannot calculate that \
yet (in `summary`, with empty sections and terms).

Health: general traditional home practice only. No doses. Nothing for \
infants or pregnancy. Never say something cures a disease. Always fill \
`caution` with one line on when to see a doctor when health is discussed, \
else empty string.

Sanskrit terms: only well-known single words or short standard phrases, in \
Devanagari. Never compose a Sanskrit sentence. Do not transliterate: the \
server adds the roman.

Shape: title of at most 6 words; summary of one sentence; at most 3 \
sections; at most 5 items each, one short sentence per item; at most 4 \
terms. Each term is {"sa": Devanagari, "meaning": short meaning}. \
Sections use style "steps" for ordered practice or "bullets" otherwise. \
No em dashes anywhere. Never use markdown.

Return ONLY this JSON object:
{"title": "", "title_sa": "", "summary": "", \
"sections": [{"heading": "", "style": "bullets", "items": [""]}], \
"terms": [{"sa": "", "meaning": ""}], "caution": ""}"""


_DEVANAGARI = re.compile("[\u0900-\u097F]")
_MARKUP = re.compile(r"[`*_#]+")
# Em (and spaced en) dashes: the app's copy rule is none, and the model emits
# them anyway. Mirrors mobile/src/utils/text.ts plain().
_DASH_LEAD = re.compile(r"^[ \t]*[\u2014\u2013][ \t]*", re.M)
_DASH_TRAIL = re.compile(r"[ \t]*[\u2014\u2013][ \t]*$", re.M)
_DASH_SPACED = re.compile(r"[ \t]+[\u2014\u2013][ \t]+")
_DASH_TIGHT = re.compile(r"(\S)\u2014(\S)")


def reply_language(question: str, bridge_langs=None, fallback: str = "") -> str:
    """Decide which language the explanation must come back in.

    Sarvam ignores a "match the learner's language" rule in the system
    prompt and answers in Hindi regardless (measured 2026-08-30: an English
    question got a Hindi answer). So the choice is made here and handed to
    the model as a direct order in the user message, rather than left to
    its judgement.

    **Fixed 2026-09-22.** This used to end in::

        "Hindi" if "hi" in langs and "en" not in langs else "English"

    and the client hardcoded ``bridge_langs=["en", "hi"]`` at every login, so
    the condition could never fire: the branch returned English for every
    learner who ever used the app, and reordering the list changed nothing.
    The "choice" was a no-op. Two consequences, both now fixed — a Kannada or
    Telugu speaker was silently given English, and Talk's companion path
    spoke that English text through the *Hindi* voice.

    Resolution order now:
      1. The question's own script, via `services/lang_detect.py` — which
         reads all ten of Sarvam's languages, not just Devanagari-or-not.
         Romanized input ("matlab kya hai") still answers in English: someone
         typing in Latin can read it, and this path is deliberately free.
      2. `fallback` — the session's settled language, for the tap-to-explain
         affordance that carries no question at all.
      3. English.
    """
    from app.services import lang_detect

    q = (question or "").strip()
    if q:
        code, how = lang_detect.detect_free(q)
        # "devanagari" with no code means it read as Sanskrit, which is the
        # subject, not a language to answer in.
        if code and how in ("script", "devanagari"):
            return lang_detect.order_phrase(code)
        if _DEVANAGARI.search(q):
            return lang_detect.order_phrase("hi")
        return "English"

    if fallback:
        code = lang_detect.normalize_code(fallback)
        if code:
            return lang_detect.order_phrase(code)

    for raw in (bridge_langs or []):
        code = lang_detect.normalize_code(str(raw))
        if code and code != "en":
            return lang_detect.order_phrase(code)
    return "English"


def strip_markup(text: str) -> str:
    """Remove the markdown the prompt forbids but the model emits anyway."""
    return _MARKUP.sub("", text).strip()


def strip_dashes(text: str) -> str:
    """Replace em dashes with the punctuation the app's copy rule allows."""
    text = _DASH_LEAD.sub("", text)
    text = _DASH_TRAIL.sub("", text)
    text = _DASH_SPACED.sub(", ", text)
    text = _DASH_TIGHT.sub(r"\1, \2", text)
    text = re.sub(r",\s*,", ",", text)
    return re.sub(r",\s*([.;:!?])", r"\1", text).strip()


class Explainer:
    """Generates a short natural-language explanation of a tutor line."""

    def __init__(self, provider_ref: Optional[str] = None) -> None:
        self._provider_ref = provider_ref or settings.explain_provider
        self._provider = None

    def _get_provider(self):
        if self._provider is None:
            self._provider = build_provider(self._provider_ref)
        return self._provider

    @property
    def available(self) -> bool:
        """True when the explainer can plausibly serve a request."""
        if not settings.explain_enabled:
            return False
        try:
            return self._get_provider().configured
        except ValueError:
            return False

    async def explain(
        self,
        line: str,
        *,
        iast: str = "",
        gloss: str = "",
        question: str = "",
        translate_only: bool = False,
        language: str = "English",
        answer_question: bool = False,
    ) -> Optional[str]:
        """Explain `line` to the learner who asked `question`.

        Args:
            line: the tutor's text being asked about (Devanagari).
            iast: the line's IAST transliteration, when authored.
            gloss: the line's authored gloss — the ground truth the model
                should stay consistent with, and the fallback if this fails.
            question: the learner's own words, so the reply matches their
                language and answers what they actually asked.
            translate_only: intent was "translate" — render the line, don't
                teach it.
            language: the language the answer must be written in, resolved
                by reply_language(). An instruction, not a hint.
            answer_question: the ask-anywhere path (POST /explain) sets this
                so a specific question ("How do I say it?") is answered, not
                just turned into "what does the line mean". The conversation
                path leaves it False: its instruction was tuned and measured.

        Returns:
            The explanation text, or None on any failure (fail-closed).
        """
        if not (line or "").strip():
            return None
        if not settings.explain_enabled:
            return None

        if translate_only:
            instruction = (
                f"Translate the line into {language} and stop — do not gloss "
                "individual words."
            )
        elif answer_question and (question or "").strip():
            instruction = "Answer the learner's question about the line."
        else:
            instruction = "Explain what the line means."

        parts = [f"Tutor's line: {line}"]
        if iast:
            parts.append(f"IAST: {iast}")
        if gloss:
            parts.append(f"Authored gloss (this is correct — stay consistent with it): {gloss}")
        parts.append(f"Learner asked: {question or 'What does that mean?'}")
        parts.append(instruction)
        # Last line, so the language order sits closest to the model's turn.
        parts.append(f"Write your entire answer in {language}.")
        return await self._complete(_SYSTEM_PROMPT, "\n".join(parts))

    async def answer(self, question: str, *, language: str = "English") -> Optional[str]:
        """Answer a general question about Sanskrit that is not tied to a line.

        The ask-anywhere sheet takes free questions ("What is sandhi?") from
        any screen. Same fail-closed contract as explain(): None on any
        failure, and the caller refunds the quota it took.
        """
        q = (question or "").strip()
        if not q or not settings.explain_enabled:
            return None
        user = "\n".join([
            f"Learner asked: {q}",
            "Answer the question.",
            f"Write your entire answer in {language}.",
        ])
        return await self._complete(_GENERAL_PROMPT, user)

    async def _complete(self, system: str, user: str) -> Optional[str]:
        """One model call, cleaned. None on any failure (fail-closed)."""
        try:
            provider = self._get_provider()
        except ValueError as exc:
            logger.warning("explainer provider unavailable: %s", exc)
            return None

        try:
            resp: LLMResponse = await provider.complete(
                system,
                user,
                temperature=0.2,
                max_tokens=settings.explain_max_tokens,
            )
        except Exception as exc:  # network/timeout — degrade to the gloss
            logger.warning("explainer call failed: %s", exc)
            return None

        if not resp.ok:
            logger.warning(
                "explainer response not ok on %s: %s",
                provider.label, resp.error or "empty",
            )
            return None

        text = strip_dashes(strip_markup(resp.text or ""))
        if not text:
            return None
        logger.info(
            "explained in %d ms on %s (%d+%d tok)",
            resp.latency_ms, provider.label,
            resp.prompt_tokens, resp.completion_tokens,
        )
        return text

    async def answer_card(
        self,
        question: str,
        *,
        language: str = "English",
        facts: str = "",
        screen_text: str = "",
    ) -> Optional[dict]:
        """Answer a wider question as a shaped card dict, or None.

        Uses _WIDE_PROMPT with ask_card_max_tokens headroom. Parses leniently
        (like tutor._parse_reply), enforces shape limits, strips markup and
        dashes, drops non-Devanagari terms, fills iast via to_iast(). The
        caller sets `when` from calculated FACTS; the model never writes it.
        Broken JSON returns None so the caller falls back to prose.
        """
        q = (question or "").strip()
        if not q or not settings.explain_enabled:
            return None
        parts = [f"Learner asked: {q}"]
        if screen_text:
            parts.append(f"Text on their screen (read on-device, may be partial): {screen_text[:1500]}")
        if facts:
            parts.append(facts)
        parts.append("Answer as one JSON object.")
        parts.append(f"Write your entire answer in {language}.")
        user = "\n".join(parts)
        try:
            provider = self._get_provider()
        except ValueError as exc:
            logger.warning("explainer provider unavailable: %s", exc)
            return None
        try:
            resp: LLMResponse = await provider.complete(
                _WIDE_PROMPT,
                user,
                temperature=0.2,
                max_tokens=settings.ask_card_max_tokens,
                json_mode=True,
            )
        except Exception as exc:
            logger.warning("explainer card call failed: %s", exc)
            return None
        if not resp.ok:
            logger.warning("explainer card not ok on %s: %s", provider.label, resp.error or "empty")
            return None
        raw = parse_card_json(resp.text or "")
        if raw is None:
            return None
        return clip_card(raw)


_DEVA_RUN = re.compile("^[\u0900-\u097F\u1CD0-\u1CFF ]+$")


def _clean_line(s: str, limit: int = 0) -> str:
    t = strip_dashes(strip_markup(str(s or ""))).strip()
    t = re.sub(r"\s+", " ", t)
    if limit and len(t.split()) > limit:
        t = " ".join(t.split()[:limit])
    return t


def parse_card_json(text: str) -> Optional[dict]:
    """Lenient JSON parse for the card prompt, mirroring tutor._parse_reply."""
    data = None
    try:
        data = json.loads(text or "")
    except (json.JSONDecodeError, TypeError):
        m = re.search(r"\{.*\}", text or "", re.DOTALL)
        if m:
            try:
                data = json.loads(m.group(0))
            except json.JSONDecodeError:
                return None
    if not isinstance(data, dict):
        return None
    if not any(k in data for k in ("title", "summary", "sections", "terms")):
        for v in data.values():
            if isinstance(v, dict) and any(k in v for k in ("title", "summary")):
                return v
        return None
    return data


def clip_card(raw: dict) -> dict:
    """Enforce the card shape: strip, clip, drop bad terms, fill iast."""
    from app.services.iast import to_iast as _to_iast

    title = _clean_line(raw.get("title", ""), 6)
    title_sa = _clean_line(raw.get("title_sa", ""))
    # title_sa must be Devanagari when present; else drop it.
    if title_sa and not _DEVA_RUN.match(title_sa):
        title_sa = ""
    try:
        title_iast = _to_iast(title_sa) if title_sa else _clean_line(raw.get("title_iast", ""))
    except Exception:
        title_iast = ""
    summary = _clean_line(raw.get("summary", ""))
    # A refusal stays one line.
    if summary and len(summary.split()) <= 40 and not raw.get("sections") and not raw.get("terms"):
        pass

    sections: list[dict] = []
    for s in (raw.get("sections") or [])[:3]:
        if not isinstance(s, dict):
            continue
        heading = _clean_line(s.get("heading", ""))
        style = str(s.get("style") or "bullets").strip().lower()
        if style not in ("steps", "bullets"):
            style = "bullets"
        items = [_clean_line(i) for i in (s.get("items") or [])[:5]]
        items = [i for i in items if i]
        if heading or items:
            sections.append({"heading": heading, "style": style, "items": items})

    terms: list[dict] = []
    for t in (raw.get("terms") or [])[:4]:
        if not isinstance(t, dict):
            continue
        sa = _clean_line(t.get("sa", ""))
        if not sa or not _DEVA_RUN.match(sa):
            continue
        meaning = _clean_line(t.get("meaning", ""))
        if not meaning:
            continue
        try:
            iast = _to_iast(sa)
        except Exception:
            iast = ""
        terms.append({"sa": sa, "iast": iast, "meaning": meaning})

    caution = _clean_line(raw.get("caution", ""))
    return {
        "title": title,
        "title_sa": title_sa,
        "title_iast": title_iast,
        "summary": summary,
        "sections": sections,
        "terms": terms,
        "caution": caution,
    }


def flatten_card(card: dict, when_text: str = "", when_note: str = "") -> str:
    """Flatten a card to text for explanation, cache and read-aloud."""
    lines: list[str] = []
    title = (card.get("title") or "").strip()
    if title:
        lines.append(title_sa_line(card) or title)
    if when_text:
        lines.append(when_text + (f" ({when_note})" if when_note else ""))
    if card.get("summary"):
        lines.append(str(card["summary"]).strip())
    for s in card.get("sections") or []:
        if s.get("heading"):
            lines.append(str(s["heading"]).strip())
        for i, item in enumerate(s.get("items") or [], 1):
            prefix = f"{i}. " if (s.get("style") == "steps") else "- "
            lines.append(prefix + str(item).strip())
    for t in card.get("terms") or []:
        lines.append(f"{t.get('sa', '')} ({t.get('iast', '')}): {t.get('meaning', '')}".strip())
    if card.get("caution"):
        lines.append(str(card["caution"]).strip())
    return "\n".join(l for l in lines if l)


def title_sa_line(card: dict) -> str:
    title = (card.get("title") or "").strip()
    sa = (card.get("title_sa") or "").strip()
    if title and sa:
        return f"{title} ({sa})"
    return title or sa


_singleton: Optional[Explainer] = None


def get_explainer() -> Explainer:
    """Process-wide Explainer (one provider/client, reused across requests)."""
    global _singleton
    if _singleton is None:
        _singleton = Explainer()
    return _singleton
