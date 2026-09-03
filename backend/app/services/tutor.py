"""Free-form conversation tutor: Sarvam speaks, Vidyut decides what is true.

Replaces the dialogue graph's edge matching on the live turn path (product
decision 2026-09-02). The graph could only accept the ONE sentence its author
enumerated per question, so "aham anshul asmi" — correct Sanskrit, correct
answer — was rejected, and the learner was asked the same question forever.

The division of labour is the one this codebase already uses for authoring
(`services/authoring.py`), pointed at the runtime instead:

  • **Vidyut decides grammar.** It analyses the learner's utterance and the
    model's proposed reply. It is the only thing here allowed to say a form is
    right or wrong — §6.3's abstention principle holds, so "unknown" is never
    reported as "wrong".
  • **Sarvam decides what to say next.** It never assigns a verdict; it is
    handed Vidyut's reading and writes the tutor's turn around it.

Guardrail, in order:
  1. The learner's utterance is analysed BEFORE the model sees it, and the
     analysis is passed in as fact. The model cannot overrule it.
  2. The model's Sanskrit is analysed AFTER it comes back. Sanskrit that does
     not clear the health check is never spoken to a learner — one retry at a
     simpler register, then the turn degrades to the bridge language.

Both directions tolerate unknown words. `is_confident()` demands EVERY word
parse, which no sentence containing a name can do — that strictness is exactly
what rejected the owner's own name. `sanskrit_health` asks the weaker, correct
question instead: is anything here actually *malformed*?
"""

from __future__ import annotations

import json
import logging
import re
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

logger = logging.getLogger("shabd.tutor")

# How much of a line must parse cleanly before we are willing to speak it.
# A one-name-in-five-words sentence sits at 0.8; genuine word salad falls far
# below. Tuned to admit proper nouns, not to admit broken grammar.
_HEALTH_FLOOR = 0.6

# Turns of history handed to the model. The whole conversation is short by
# design; this only guards a runaway session's prompt size.
_HISTORY_TURNS = 16

# High-frequency Hindi forms that are not Sanskrit words. The analyser cannot
# tell the two apart in Devanagari — it declines "मुझे" as readily as "रामः" —
# so a line of Hindi sails through the health check and gets spoken to the
# learner as Sanskrit. Observed live: the model answered entirely in Hindi in
# the "sanskrit" field and the app rendered it twice, once as each half of the
# turn. These particular forms never occur in Sanskrit, so one hit is decisive.
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


@dataclass
class SanskritHealth:
    """Vidyut's read of a line: how much of it parsed, and what it found."""

    ok: bool = False
    ratio: float = 0.0                              # confidently-parsed share
    features: dict[str, str] = field(default_factory=dict)
    unparsed: list[str] = field(default_factory=list)
    empty: bool = True
    looks_sanskrit: bool = False

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
                "analyser matches stems and will happily force Hindi or "
                "English words into Sanskrit endings, so there is no usable "
                "analysis of this line. Reply to what they MEANT, offer them "
                "the Sanskrit for it, and correct nothing."
            )
        bits = [f"Vidyut parsed {round(self.ratio * 100)}% of the words."]
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
    # "√gam") or a Sanskrit pronoun: a Hindi or English line yields noun
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
    )


@dataclass
class TutorReply:
    """One tutor turn, after the gate has had its say."""

    sanskrit: str = ""
    iast: str = ""
    bridge: str = ""
    correction: str = ""
    understood: bool = True
    done: bool = False
    source: str = "llm"       # "llm" | "llm_bridge_only" | "degraded"
    learner: SanskritHealth = field(default_factory=SanskritHealth)


_SYSTEM_PROMPT = """You are a warm, patient Sanskrit conversation tutor in Shabd. \
You are having a real conversation with ONE learner, not running a quiz.

HOW YOU TEACH
- EVERY turn must contain at least one real Sanskrit sentence in "sanskrit" — \
this is a Sanskrit app and a turn with no Sanskrit in it has taught nothing. \
Keep it short: one question or one statement is enough. Use "bridge" for the \
support around it, sized to the Sanskrit share requested below.
- The ONLY exception: when the learner asks what something means, or is \
clearly lost, you may answer in their language alone.
- Ask ONE short question per turn and build on what the learner actually said. \
If they told you their name, use it. Never re-ask a question they answered.
- Read the learner's line carefully before responding to it. Answering a \
sentence they did not write is worse than answering slowly.
- Keep Sanskrit to short, classical, beginner forms. Prefer forms a first-year \
learner meets: nominative, accusative, locative, ablative, present tense.

WHAT COUNTS AS A CORRECT ANSWER
- ANY reply that is grammatical and makes sense is correct. There is no single \
expected sentence. "aham rāmaḥ asmi", "aham anshul asmi", "mama nāma anshul" \
are ALL correct answers to "bhavān kaḥ?".
- Names, places, and modern words inside a Sanskrit frame are CORRECT. Never \
tell a learner their own name is a mistake.
- The learner may answer in their own language, or mix languages. That is fine \
and is not an error — reply to what they meant, and offer the Sanskrit for it.

GRAMMAR IS NOT YOURS TO JUDGE
- You are given a Vidyut morphological analysis of the learner's line. Correct \
a form ONLY when that analysis shows it is wrong. Words listed as unreadable \
are names or borrowings — accept them silently.
- The analysis is imperfect and sometimes misreads a correct word. If it \
disagrees with what the learner obviously meant, trust the learner and say \
nothing. A wrong correction costs far more than a missed one.
- If the analysis found nothing at all, ask them to try again in different \
words. Do NOT guess that they were wrong.
- At most ONE correction per turn, short and specific, and only when it matters. \
When in doubt, say nothing and keep the conversation moving.
- "correction" is for ERRORS ONLY. Leave it EMPTY when the learner was right. \
Never use it to confirm that a form is correct, to restate what they said, or \
to narrate the analysis — praise belongs in "bridge", if anywhere.

OUTPUT — one JSON object, nothing else, no markdown:
{"sanskrit": "<your Sanskrit, Devanagari, may be empty>",
 "bridge": "<your line in the learner's language, may be empty>",
 "correction": "<one short grammar note, or empty>",
 "understood": true,
 "done": false}

"sanskrit" and "bridge" are two halves of ONE turn, not translations of each \
other — bridge carries what Sanskrit alone would not land.

- "sanskrit" must contain ONLY Sanskrit. Hindi and English belong in \
"bridge". If this turn is entirely in the learner's language, leave "sanskrit" \
EMPTY — do not put Hindi there.
- NEVER put the same sentence in both fields. The learner sees both, and \
repeating yourself reads as a bug.

Set "done": true only when the learner says goodbye."""

_RETRY_NUDGE = """Your previous reply's Sanskrit did not pass the grammar \
checker and was discarded. Reply again using SHORTER, simpler Sanskrit — a \
three-or-four word sentence in standard classical forms — or leave "sanskrit" \
empty and say it in the learner's language instead."""


class ConversationTutor:
    """Runs one free-form turn: analyse, ask the model, gate what comes back."""

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

    async def reply(
        self,
        *,
        transcript: str,
        history: list[dict[str, str]],
        situation: str,
        target_features: list[str],
        bridge_langs: list[str],
        ratio: float,
        opening: bool = False,
    ) -> TutorReply:
        """Produce the tutor's next turn.

        `transcript` is the learner's utterance ("" on the opening turn).
        Returns a TutorReply whose Sanskrit has already passed the gate, or
        which carries none at all. Never raises.
        """
        health = sanskrit_health(transcript) if not opening else SanskritHealth()

        user = self._build_user_prompt(
            transcript=transcript,
            health=health,
            history=history,
            situation=situation,
            target_features=target_features,
            bridge_langs=bridge_langs,
            ratio=ratio,
            opening=opening,
        )

        reply = await self._call_and_gate(user, health)
        reply.learner = health
        return reply

    async def _call_and_gate(
        self, user: str, health: SanskritHealth
    ) -> TutorReply:
        """One call, then a second only if the gate rejected live Sanskrit."""
        for attempt in (0, 1):
            system = _SYSTEM_PROMPT if attempt == 0 else _SYSTEM_PROMPT + "\n\n" + _RETRY_NUDGE
            raw = await self._complete(system, user)
            if raw is None:
                return TutorReply(
                    bridge="I lost my train of thought there — say that again?",
                    source="degraded",
                    understood=False,
                )

            parsed = _parse_reply(raw)
            if parsed is None:
                logger.warning("tutor reply was not JSON: %r", raw[:200])
                continue

            sanskrit = (parsed.get("sanskrit") or "").strip()
            bridge = (parsed.get("bridge") or "").strip()
            correction = (parsed.get("correction") or "").strip()

            # The model sometimes fills both halves with the same text, or
            # answers entirely in Hindi and labels it Sanskrit. Either way the
            # turn has one line, not two — rendering both showed the learner
            # the same sentence twice.
            if sanskrit and (sanskrit == bridge or _is_bridge_language(sanskrit)):
                sanskrit, bridge = "", bridge or sanskrit

            if not sanskrit:
                # Nothing to gate. A bridge-only turn is a legitimate move.
                if not bridge:
                    continue
                return TutorReply(
                    bridge=bridge,
                    correction=correction,
                    understood=bool(parsed.get("understood", True)),
                    done=bool(parsed.get("done", False)),
                    source="llm_bridge_only",
                )

            gate = sanskrit_health(sanskrit)
            if gate.ok:
                return TutorReply(
                    sanskrit=sanskrit,
                    bridge=bridge,
                    correction=correction,
                    understood=bool(parsed.get("understood", True)),
                    done=bool(parsed.get("done", False)),
                    source="llm",
                )

            logger.info(
                "tutor Sanskrit failed the gate (ratio=%.2f unparsed=%s): %r",
                gate.ratio, gate.unparsed, sanskrit[:80],
            )
            if attempt == 0:
                continue

            # Second failure: keep the turn, drop the Sanskrit. Speaking
            # ungated Sanskrit to a learner is the one thing never allowed.
            if bridge:
                return TutorReply(
                    bridge=bridge,
                    correction=correction,
                    understood=bool(parsed.get("understood", True)),
                    done=bool(parsed.get("done", False)),
                    source="llm_bridge_only",
                )

        return TutorReply(
            bridge="Let's try that once more — say it however you like.",
            source="degraded",
            understood=False,
        )

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
        bridge_langs: list[str],
        ratio: float,
        opening: bool,
    ) -> str:
        lang = "Hindi" if "hi" in (bridge_langs or []) else "English"
        lines = [
            f"Learner's language: {lang}.",
            f"Sanskrit share for this turn: about {round(ratio * 100)}%.",
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

        if opening:
            lines.append(
                "\nThis is the FIRST turn. Greet the learner and ask one easy "
                "opening question. There is nothing to correct yet."
            )
        else:
            lines.append(f"\nThe learner just said: {transcript}")
            lines.append(f"Vidyut's analysis of that line: {health.as_prompt_fact()}")

        lines.append('\nReply with the JSON object only.')
        return "\n".join(x for x in lines if x)


def _parse_reply(text: str) -> Optional[dict[str, Any]]:
    """Extract the reply object, tolerating Sarvam's occasional wrappers."""
    data: Any = None
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        m = re.search(r"\{.*\}", text, re.DOTALL)
        if m:
            try:
                data = json.loads(m.group(0))
            except json.JSONDecodeError:
                return None
    if not isinstance(data, dict):
        return None
    # Same envelope quirk edge_router._deep_edge guards against.
    if "sanskrit" not in data and "bridge" not in data:
        for v in data.values():
            if isinstance(v, dict) and ("sanskrit" in v or "bridge" in v):
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
    """Recent turns, flattened to what the model needs to not repeat itself."""
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
