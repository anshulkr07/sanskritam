"""Uniform LLM provider adapters for the eval harness.

Every provider is reduced to one call shape::

    resp = await provider.complete(system=..., user=..., json_mode=True)

so tasks and scorers never branch on vendor. Sarvam, Gemini and OpenAI all
speak the OpenAI chat-completions schema (Sarvam and Gemini both publish
compatibility endpoints), so they share the base `Provider`; Anthropic's
`/v1/messages` differs enough to warrant its own subclass.

Adding a provider = one `ProviderSpec` entry in `REGISTRY`.
"""

from __future__ import annotations

import json
import logging
import os
import re
import time
from dataclasses import dataclass, field
from typing import Optional

import httpx

logger = logging.getLogger("shabd.evals.providers")


# ─── Response envelope ───

@dataclass
class LLMResponse:
    """One completion, with everything the scorers and the cost model need."""

    text: str = ""
    prompt_tokens: int = 0
    completion_tokens: int = 0
    latency_ms: float = 0.0
    model: str = ""
    provider: str = ""
    error: Optional[str] = None
    cached: bool = False

    @property
    def ok(self) -> bool:
        return self.error is None and bool(self.text.strip())

    def to_dict(self) -> dict:
        return {
            "text": self.text,
            "prompt_tokens": self.prompt_tokens,
            "completion_tokens": self.completion_tokens,
            "latency_ms": round(self.latency_ms, 1),
            "model": self.model,
            "provider": self.provider,
            "error": self.error,
            "cached": self.cached,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "LLMResponse":
        fields = ("text", "prompt_tokens", "completion_tokens", "latency_ms",
                  "model", "provider", "error", "cached")
        return cls(**{k: d[k] for k in fields if k in d})


# ─── Pricing ───
#
# INR per 1M tokens, (input, output). These move often and are NOT authoritative
# — treat the cost column as an order-of-magnitude comparison, and update this
# table from each vendor's pricing page before quoting a number to anyone.
# Override at runtime with --pricing pricing.json

PRICING_INR_PER_1M: dict[str, tuple[float, float]] = {
    "sarvam-105b": (25.0, 75.0),
    "sarvam-105b-conversations": (25.0, 75.0),
    "sarvam-30b": (10.0, 30.0),
    "gemini-2.5-flash": (26.0, 210.0),
    "gemini-2.5-pro": (105.0, 840.0),
    "gemini-2.0-flash": (9.0, 34.0),
    "google/gemini-3.7-flash": (26.0, 210.0),
    "gpt-4o": (210.0, 840.0),
    "gpt-4o-mini": (13.0, 50.0),
    "claude-sonnet-4-5": (250.0, 1250.0),
    "claude-haiku-4-5": (84.0, 420.0),
}

# Used for unknown models so cost is never silently reported as zero.
_DEFAULT_PRICE = (50.0, 200.0)


def price_for(model: str) -> tuple[float, float]:
    """Look up (input, output) INR per 1M tokens for a model id.

    Falls back to the segment after the last slash, so aggregator ids resolve to
    the underlying model: openrouter's `google/gemini-2.5-flash` reuses the
    `gemini-2.5-flash` row instead of silently landing on the generic default and
    making the INR columns incomparable between providers.
    """
    if model in PRICING_INR_PER_1M:
        return PRICING_INR_PER_1M[model]
    base = model.rsplit("/", 1)[-1]
    if base in PRICING_INR_PER_1M:
        return PRICING_INR_PER_1M[base]
    # Aggregators often suffix a variant (":free", ":nitro", "-preview").
    base = re.split(r"[:@]", base)[0]
    if base in PRICING_INR_PER_1M:
        return PRICING_INR_PER_1M[base]
    logger.warning(
        "no pricing for %r — using default %s INR/1M; add it to PRICING_INR_PER_1M "
        "or pass --pricing before comparing cost columns", model, _DEFAULT_PRICE
    )
    return _DEFAULT_PRICE


# ─── Registry ───

@dataclass
class ProviderSpec:
    base_url: str
    env_key: str
    default_model: str
    auth: str = "bearer"       # bearer | sarvam | anthropic
    kind: str = "openai"       # openai | anthropic
    extra_headers: dict = field(default_factory=dict)


REGISTRY: dict[str, ProviderSpec] = {
    # Sarvam accepts `api-subscription-key` and also `Authorization: Bearer`
    # for OpenAI-compatible tooling. sarvam-m (24B) is deprecated — do not add it.
    "sarvam": ProviderSpec(
        base_url="https://api.sarvam.ai/v1",
        env_key="SARVAM_API_KEY",
        default_model="sarvam-105b",
        auth="sarvam",
    ),
    "gemini": ProviderSpec(
        base_url="https://generativelanguage.googleapis.com/v1beta/openai",
        env_key="GEMINI_API_KEY",
        default_model="gemini-2.5-flash",
    ),
    "openai": ProviderSpec(
        base_url="https://api.openai.com/v1",
        env_key="OPENAI_API_KEY",
        default_model="gpt-4o-mini",
    ),
    "anthropic": ProviderSpec(
        base_url="https://api.anthropic.com/v1",
        env_key="ANTHROPIC_API_KEY",
        default_model="claude-sonnet-4-5",
        auth="anthropic",
        kind="anthropic",
        extra_headers={"anthropic-version": "2023-06-01"},
    ),
    "openrouter": ProviderSpec(
        base_url="https://openrouter.ai/api/v1",
        env_key="OPENROUTER_API_KEY",
        default_model="google/gemini-3.7-flash",
        extra_headers={
            "HTTP-Referer": "https://shabd.dev",
            "X-Title": "Shabd",
        },
    ),
}


# ─── Base provider ───

def _key_from_settings(env_key: str) -> str:
    """Fall back to pydantic-settings for a provider API key.

    ``.env`` is read by pydantic-settings into the settings object and is
    never exported to ``os.environ``, so an env-only lookup finds nothing in
    normal operation: every provider reports ``configured=False``. Callers
    that fail closed by design — ``explainer`` degrading to the authored
    gloss, ``edge_router`` falling through to the escape path — then degrade
    permanently and invisibly, and an authoring batch reports a 0% gate pass
    rate that is really "no key".

    pydantic-settings runs with ``env_prefix=""``, so the lowercased env var
    name is the settings field name.
    """
    try:
        from app.config import settings  # local import: no cycle at module load
    except Exception:
        return ""
    return str(getattr(settings, env_key.lower(), "") or "")


class Provider:
    """OpenAI-chat-completions-shaped provider."""

    def __init__(self, name: str, spec: ProviderSpec, model: Optional[str] = None,
                 api_key: Optional[str] = None, timeout: float = 90.0) -> None:
        self.name = name
        self.spec = spec
        self.model = model or spec.default_model
        self._api_key = (api_key or os.environ.get(spec.env_key, "")
                         or _key_from_settings(spec.env_key))
        self._timeout = timeout
        self._http: Optional[httpx.AsyncClient] = None

    @property
    def label(self) -> str:
        return f"{self.name}:{self.model}"

    @property
    def configured(self) -> bool:
        return bool(self._api_key)

    # ── transport ──

    def _headers(self) -> dict:
        h = dict(self.spec.extra_headers)
        if self.spec.auth == "sarvam":
            h["api-subscription-key"] = self._api_key
            h["Authorization"] = f"Bearer {self._api_key}"
        elif self.spec.auth == "anthropic":
            h["x-api-key"] = self._api_key
        else:
            h["Authorization"] = f"Bearer {self._api_key}"
        return h

    async def _client(self) -> httpx.AsyncClient:
        if self._http is None or self._http.is_closed:
            self._http = httpx.AsyncClient(
                base_url=self.spec.base_url,
                headers=self._headers(),
                timeout=self._timeout,
            )
        return self._http

    async def close(self) -> None:
        if self._http and not self._http.is_closed:
            await self._http.aclose()

    # ── cost ──

    def cost_inr(self, prompt_tokens: int, completion_tokens: int) -> float:
        pin, pout = price_for(self.model)
        return (prompt_tokens * pin + completion_tokens * pout) / 1_000_000

    # ── completion ──

    def _endpoint(self) -> str:
        return "/chat/completions"

    def _payload(self, system: str, user: str, temperature: float,
                 max_tokens: int, json_mode: bool) -> dict:
        payload: dict = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if json_mode:
            payload["response_format"] = {"type": "json_object"}
        return payload

    def _parse(self, body: dict) -> tuple[str, int, int]:
        choice = (body.get("choices") or [{}])[0]
        text = ((choice.get("message") or {}).get("content")) or ""
        usage = body.get("usage") or {}
        return (
            text,
            int(usage.get("prompt_tokens") or 0),
            int(usage.get("completion_tokens") or 0),
        )

    async def complete(self, system: str, user: str, *, temperature: float = 0.0,
                       max_tokens: int = 512, json_mode: bool = False) -> LLMResponse:
        if not self.configured:
            return LLMResponse(provider=self.name, model=self.model,
                               error=f"{self.spec.env_key} not set")

        started = time.perf_counter()
        try:
            client = await self._client()
            resp = await client.post(
                self._endpoint(),
                json=self._payload(system, user, temperature, max_tokens, json_mode),
            )
            elapsed = (time.perf_counter() - started) * 1000
            if resp.status_code != 200:
                return LLMResponse(provider=self.name, model=self.model, latency_ms=elapsed,
                                   error=f"HTTP {resp.status_code}: {resp.text[:300]}")
            text, pt, ct = self._parse(resp.json())
            
            if not text.strip():
                # Handle Sarvam (or others) silently emitting empty content due to length cuts
                choice = (resp.json().get("choices") or [{}])[0]
                reason = choice.get("finish_reason")
                if reason == "length":
                    err = f"Empty response (truncated by max_tokens limit)"
                elif reason:
                    err = f"Empty response (finish_reason: {reason})"
                else:
                    err = "Empty response"
                # Carry the token counts through. A truncated reply still burned a
                # full max_tokens of generation and was billed for it; dropping the
                # usage here made 30 failed Sarvam calls look free and understated
                # its real cost by roughly half.
                return LLMResponse(provider=self.name, model=self.model,
                                   prompt_tokens=pt, completion_tokens=ct,
                                   latency_ms=elapsed, error=err)
                
            return LLMResponse(text=text, prompt_tokens=pt, completion_tokens=ct,
                               latency_ms=elapsed, model=self.model, provider=self.name)
        except Exception as e:  # network, timeout, malformed JSON
            elapsed = (time.perf_counter() - started) * 1000
            return LLMResponse(provider=self.name, model=self.model, latency_ms=elapsed,
                               error=f"{type(e).__name__}: {e}")


class AnthropicProvider(Provider):
    """Anthropic /v1/messages — different envelope, same interface."""

    def _endpoint(self) -> str:
        return "/messages"

    def _payload(self, system: str, user: str, temperature: float,
                 max_tokens: int, json_mode: bool) -> dict:
        # Anthropic has no response_format; the task layer already asks for JSON
        # in the system prompt, so json_mode is intentionally ignored here.
        return {
            "model": self.model,
            "system": system,
            "messages": [{"role": "user", "content": user}],
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

    def _parse(self, body: dict) -> tuple[str, int, int]:
        blocks = body.get("content") or []
        text = "".join(b.get("text", "") for b in blocks if b.get("type") == "text")
        usage = body.get("usage") or {}
        return (
            text,
            int(usage.get("input_tokens") or 0),
            int(usage.get("output_tokens") or 0),
        )


# ─── Construction ───

def build_provider(ref: str, api_key: Optional[str] = None) -> Provider:
    """Build a provider from "name" or "name:model".

    build_provider("sarvam")            -> sarvam-105b
    build_provider("sarvam:sarvam-30b") -> sarvam-30b
    """
    name, _, model = ref.partition(":")
    name = name.strip().lower()
    if name not in REGISTRY:
        raise ValueError(
            f"Unknown provider {name!r}. Known: {', '.join(sorted(REGISTRY))}"
        )
    spec = REGISTRY[name]
    cls = AnthropicProvider if spec.kind == "anthropic" else Provider
    return cls(name, spec, model=model.strip() or None, api_key=api_key)


def load_pricing(path: str) -> None:
    """Merge a JSON {model: [input_per_1m, output_per_1m]} override into the table."""
    with open(path, encoding="utf-8") as fh:
        data = json.load(fh)
    for model, pair in data.items():
        PRICING_INR_PER_1M[model] = (float(pair[0]), float(pair[1]))
