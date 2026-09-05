"""LLM edge-router for conversation bridge turns.

The dialogue graph's bridge edges are keyed by small canned phrase lists
("हाँ", "haan", "yes", …). Real learners reply in free romanized Hinglish —
"Haa", "Ji", "haan ji", "ok sure" — and the phrase-list matcher turns every
one of those into an escape. Per product decision (2026-08-30) every bridge
turn is routed by an LLM instead: the model sees the tutor's node, the
candidate edges with their phrases/glosses, and the learner's utterance, and
picks ONE edge id (or none).

Contract:
  • Bridge edges ONLY. sa-edges never reach the router — grading Sanskrit
    morphology stays with the deterministic Vidyut grader (§6.3 verdicts must
    be reproducible; the LLM must never assign verdicts).
  • The router PICKS an edge; it does not grade, translate, or reply. Output
    is a JSON {"edge": "<id>" | null} and nothing else.
  • Fail-closed: any error (no key, timeout, unparseable output, invalid edge
    id) returns None and the deterministic escape path handles the turn. An
    LLM outage must never break the conversation — the phrase matcher ran
    before the router existed and still catches the seeded phrases.
  • Strictly sarvam-105b-conversations via app.evals.providers (the reasoning
    variant is banned from request paths; DECISIONS.md). No Gemini.
"""

from __future__ import annotations

import json
import logging
import os
from typing import Any, Optional

from app.config import settings
from app.evals.providers import LLMResponse, build_provider
from app.models import DialogueEdge

logger = logging.getLogger("shabd.edge_router")

# The evals Provider reads its key from os.environ (evals run as CLI scripts
# with exported env). The app instead loads keys into pydantic `settings` from
# backend/.env — they never reach the process env. Seed it once here so the
# router (and any provider built later) sees the configured key.
for _spec_env in ("SARVAM_API_KEY", "GEMINI_API_KEY", "OPENAI_API_KEY",
                  "ANTHROPIC_API_KEY", "OPENROUTER_API_KEY"):
    if not os.environ.get(_spec_env):
        _from_settings = getattr(settings, _spec_env.lower(), "") or ""
        if _from_settings:
            os.environ[_spec_env] = _from_settings

_SYSTEM_PROMPT = """You are the intent router for Sanskritam, a Sanskrit learning app. \
A learner is in a guided dialogue. The tutor just said a line, and the learner \
replied — in ANY language or script (Sanskrit, Hindi, English, romanized \
Hinglish like "haan", "haa", "ji", "nahi", "ok").

Your ONLY job: decide which one of the listed candidate replies the learner's \
utterance is closest to in MEANING. Match meaning, not spelling: "haa", \
"haan", "haan ji", "ji", "yes", "ok", "ready" can all mean agreement; \
"nahi", "nahin", "no", "not yet" mean refusal.

Output rules:
- Reply with ONE JSON object and NOTHING else: {"edge": "<edge_id>"} — the id \
of the single best matching candidate. If NO candidate matches the utterance's \
meaning, reply {"edge": null}.
- NEVER invent an id that is not in the list. NEVER explain. NEVER translate. \
No markdown, no prose, no wrappers.
- Empty or gibberish utterances: {"edge": null}."""


class EdgeRouter:
    """Routes a learner utterance to one of a node's outgoing bridge edges."""

    def __init__(self, provider_ref: Optional[str] = None) -> None:
        self._provider_ref = provider_ref or settings.turn_router_provider
        self._provider = None

    def _get_provider(self):
        if self._provider is None:
            self._provider = build_provider(self._provider_ref)
        return self._provider

    @property
    def available(self) -> bool:
        """True when the router can plausibly serve a turn (key configured)."""
        try:
            return self._get_provider().configured
        except ValueError:
            return False

    async def route(
        self,
        transcript: str,
        tutor_text: str,
        edges: list[DialogueEdge],
    ) -> Optional[DialogueEdge]:
        """Pick the outgoing edge whose expected response the utterance matches.

        Args:
            transcript: the learner's utterance (any language/script).
            tutor_text: the current node's line (Devanagari), for context.
            edges: the node's outgoing BRIDGE edges (sa-edges are the caller's
                job — passing them here is a programming error and is refused).

        Returns:
            The chosen DialogueEdge, or None on no-match / any failure.
            Fail-closed: callers fall back to the deterministic path.
        """
        if not edges:
            return None
        for e in edges:
            if e.lang != "bridge":
                raise ValueError(
                    f"edge {e.id} has lang={e.lang!r}; the router owns bridge edges only"
                )

        if not settings.turn_router_enabled:
            return None

        candidates = [
            {
                "edge_id": e.id,
                "expected_replies": list(e.expected_phrases or []),
                "sample_text": e.expected_text or "",
            }
            for e in edges
        ]
        user = (
            f"Tutor just said: {tutor_text}\n"
            f"Learner replied: {transcript}\n"
            f"Candidate replies (choose one edge_id, or null):\n"
            f"{json.dumps(candidates, ensure_ascii=False)}\n"
            f'JSON only: {{"edge": "<edge_id>"}} or {{"edge": null}}'
        )

        try:
            provider = self._get_provider()
        except ValueError as exc:
            logger.warning("edge-router provider unavailable: %s", exc)
            return None

        try:
            resp: LLMResponse = await provider.complete(
                _SYSTEM_PROMPT,
                user,
                temperature=0.0,
                max_tokens=settings.turn_router_max_tokens,
                json_mode=True,
            )
        except Exception as exc:  # network/timeout — never take the turn down
            logger.warning("edge-router call failed: %s", exc)
            return None

        if not resp.ok:
            logger.warning(
                "edge-router response not ok on %s: %s",
                provider.label, resp.error or "empty",
            )
            return None

        return self._parse_choice(resp.text, edges)

    def _parse_choice(
        self, text: str, edges: list[DialogueEdge]
    ) -> Optional[DialogueEdge]:
        """Extract {"edge": id|null} and validate the id against the candidates.

        Invalid/unknown ids are treated as no-match (fail-closed), not as a
        guess, so a hallucinated id can never advance the graph. Sarvam
        -conversations occasionally wraps the payload in envelope structures
        ('{"data": {"edge": ...}}') or pads whitespace; _deep_edge walks any
        nesting to find the "edge" key, and quoted-string payloads
        ('"e_yes"') are matched against the candidate ids directly.
        """
        data: Any = None
        try:
            data = json.loads(text)
        except json.JSONDecodeError:
            import re

            m = re.search(r"\{.*\}", text, re.DOTALL)
            if m:
                try:
                    data = json.loads(m.group(0))
                except json.JSONDecodeError:
                    data = None

        def _deep_edge(obj: Any) -> Optional[str]:
            """Find the 'edge' value in obj or (Sarvam wrapper quirk) one level
            of nested dicts — probes observed '{"data": {"edge": ...}}'."""
            if isinstance(obj, dict):
                if "edge" in obj:
                    v = obj["edge"]
                    return v if isinstance(v, str) else None
                for v in obj.values():
                    found = _deep_edge(v)
                    if found is not None:
                        return found
            return None

        edge_id = _deep_edge(data) if data is not None else None

        # Some Sarvam responses emit the bare quoted id ( '{"e_yes"…' ): if the
        # whole payload is not a dict, try matching the text to a candidate id.
        if not edge_id:
            for e in edges:
                if e.id in text:
                    edge_id = e.id
                    break

        if not edge_id or not isinstance(edge_id, str):
            return None  # explicit null → genuine no-match

        by_id = {e.id: e for e in edges}
        chosen = by_id.get(edge_id)
        if chosen is None:
            logger.warning(
                "edge-router returned unknown edge id %r — ignoring", edge_id[:64]
            )
            return None
        return chosen


# Module-level singleton (provider construction is cheap but the httpx client
# is reused across turns, same pattern as services/sarvam.py).
_singleton: Optional[EdgeRouter] = None


def get_edge_router() -> EdgeRouter:
    global _singleton
    if _singleton is None:
        _singleton = EdgeRouter()
    return _singleton
