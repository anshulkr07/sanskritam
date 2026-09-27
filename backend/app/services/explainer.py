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
- If you cannot tell what the line means, say so plainly in one sentence."""


_DEVANAGARI = re.compile("[\u0900-\u097F]")
_MARKUP = re.compile(r"[`*_#]+")


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

        Returns:
            The explanation text, or None on any failure (fail-closed).
        """
        if not (line or "").strip():
            return None
        if not settings.explain_enabled:
            return None

        parts = [f"Tutor's line: {line}"]
        if iast:
            parts.append(f"IAST: {iast}")
        if gloss:
            parts.append(f"Authored gloss (this is correct — stay consistent with it): {gloss}")
        parts.append(f"Learner asked: {question or 'What does that mean?'}")
        parts.append(
            f"Translate the line into {language} and stop — do not gloss "
            "individual words." if translate_only
            else "Explain what the line means."
        )
        # Last line, so the language order sits closest to the model's turn.
        parts.append(f"Write your entire answer in {language}.")
        user = "\n".join(parts)

        try:
            provider = self._get_provider()
        except ValueError as exc:
            logger.warning("explainer provider unavailable: %s", exc)
            return None

        try:
            resp: LLMResponse = await provider.complete(
                _SYSTEM_PROMPT,
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

        text = strip_markup(resp.text or "")
        if not text:
            return None
        logger.info(
            "explained in %d ms on %s (%d+%d tok)",
            resp.latency_ms, provider.label,
            resp.prompt_tokens, resp.completion_tokens,
        )
        return text


_singleton: Optional[Explainer] = None


def get_explainer() -> Explainer:
    """Process-wide Explainer (one provider/client, reused across requests)."""
    global _singleton
    if _singleton is None:
        _singleton = Explainer()
    return _singleton
