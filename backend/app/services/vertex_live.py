"""Gemini online through Vertex AI, with the service account.

``services/vertex_batch.py`` is the batch road (content written ahead of
time, half price, minutes to hours). This is the other road: one request, one
answer, for a learner who is waiting. It shares the key and the project with
the batch client and nothing else.

Proven 2026-10-02 (run), ``gemini-3.8-flash``, location ``global``:

* ``POST https://aiplatform.googleapis.com/v1/projects/<project>/locations/
  <location>/publishers/google/models/<model>:generateContent`` answers 200
  for the service account in ``vertex_credentials.json``.
* Left alone the model reasons first: 457 reasoning tokens for a 90 token
  answer, 5.8 s. Reasoning is billed as output. With ``thinkingConfig:
  {thinkingBudget: 0}`` the same answer came back in 1.9 s with no reasoning
  tokens, so that is what is sent. ``thinkingLevel: "minimal"`` is refused
  (400); ``"low"`` is accepted.
* Tokens are in ``usageMetadata``: ``promptTokenCount``,
  ``candidatesTokenCount`` and, when it reasons, ``thoughtsTokenCount``.

The class has the same ``complete()`` shape as every other provider in
``evals/providers.py`` and is built by ``build_provider("vertex:<model>")``.
Callers that spend through it must meter with ``services/quota.py``, kind
``gemini_inr``. Never log the token or the key.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import time
from typing import Optional

import httpx

from app.config import settings
from app.evals.providers import LLMResponse, Provider, ProviderSpec

logger = logging.getLogger("shabd.vertex_live")

# A token lasts an hour; fetch a new one well before that.
_TOKEN_TTL_S = 45 * 60


def credentials_info() -> Optional[dict]:
    """The service-account key as a dict, from the env JSON or the key file.

    None when neither is there, or when what is there does not parse. The
    JSON string wins: that is how a host with no key file (Cloud Run) gets it.
    """
    raw = (settings.vertex_credentials_json or "").strip()
    if raw:
        try:
            info = json.loads(raw)
        except json.JSONDecodeError:
            logger.warning("VERTEX_CREDENTIALS_JSON is set but is not JSON")
            return None
        return info if isinstance(info, dict) else None
    path = (settings.vertex_credentials_path or "").strip()
    if path and os.path.isfile(path):
        try:
            with open(path, encoding="utf-8") as fh:
                info = json.load(fh)
        except (OSError, json.JSONDecodeError):
            logger.warning("Vertex key file could not be read")
            return None
        return info if isinstance(info, dict) else None
    return None


def _fetch_token(info: dict) -> str:
    """OAuth token for the service account. Blocking; never logged."""
    import google.auth.transport.requests  # lazy: only a live call needs google-auth
    from google.oauth2 import service_account

    creds = service_account.Credentials.from_service_account_info(
        info, scopes=["https://www.googleapis.com/auth/cloud-platform"]
    )
    creds.refresh(google.auth.transport.requests.Request())
    return creds.token


class VertexProvider(Provider):
    """Gemini ``generateContent`` on Vertex AI. Same interface as ``Provider``."""

    def __init__(self, name: str, spec: ProviderSpec, model: Optional[str] = None,
                 api_key: Optional[str] = None, timeout: float = 30.0) -> None:
        super().__init__(name, spec, model=model, api_key=api_key, timeout=timeout)
        self._token = ""
        self._token_at = 0.0
        self._token_lock = asyncio.Lock()

    @property
    def configured(self) -> bool:
        return credentials_info() is not None

    def _url(self) -> str:
        return (
            f"{self.spec.base_url}/projects/{settings.vertex_project}"
            f"/locations/{settings.vertex_location}"
            f"/publishers/google/models/{self.model}:generateContent"
        )

    async def _bearer(self) -> str:
        async with self._token_lock:
            if self._token and time.monotonic() - self._token_at < _TOKEN_TTL_S:
                return self._token
            info = credentials_info()
            if info is None:
                raise RuntimeError("no Vertex credentials")
            # google-auth refreshes over blocking HTTP: keep it off the loop.
            self._token = await asyncio.to_thread(_fetch_token, info)
            self._token_at = time.monotonic()
            return self._token

    def _body(self, system: str, user: str, temperature: float,
              max_tokens: int, json_mode: bool) -> dict:
        config: dict = {
            "temperature": temperature,
            "maxOutputTokens": max_tokens,
            # Reasoning is billed as output and tripled the wait (see above).
            "thinkingConfig": {"thinkingBudget": 0},
        }
        if json_mode:
            config["responseMimeType"] = "application/json"
        return {
            "systemInstruction": {"parts": [{"text": system}]},
            "contents": [{"role": "user", "parts": [{"text": user}]}],
            "generationConfig": config,
        }

    async def stream(self, system: str, user: str, *, temperature: float = 0.0,
                     max_tokens: int = 512, json_mode: bool = False,
                     usage: Optional[dict] = None):
        """The answer as it is written: yields text pieces in order.

        ``streamGenerateContent?alt=sse`` sends one ``data:`` line per piece;
        the token counts arrive with the last ones, and are written into
        ``usage`` (``prompt_tokens``, ``output_tokens``, reasoning included)
        so the caller can settle what it reserved. Raises on an HTTP error or
        a broken connection; the caller decides what to refund.
        """
        if not self.configured:
            raise RuntimeError("Vertex credentials not set")
        token = await self._bearer()
        if self._http is None or self._http.is_closed:
            self._http = httpx.AsyncClient(timeout=self._timeout)
        url = self._url().replace(":generateContent", ":streamGenerateContent") + "?alt=sse"
        body = self._body(system, user, temperature, max_tokens, json_mode)
        async with self._http.stream("POST", url, headers={"Authorization": f"Bearer {token}"},
                                     json=body) as resp:
            if resp.status_code != 200:
                if resp.status_code in (401, 403):
                    self._token = ""
                detail = (await resp.aread())[:300]
                raise RuntimeError(f"HTTP {resp.status_code}: {detail!r}")
            async for line in resp.aiter_lines():
                if not line.startswith("data:"):
                    continue
                try:
                    chunk = json.loads(line[5:].strip())
                except json.JSONDecodeError:
                    continue
                meta = chunk.get("usageMetadata") or {}
                if usage is not None and meta:
                    usage["prompt_tokens"] = int(meta.get("promptTokenCount") or 0)
                    usage["output_tokens"] = (int(meta.get("candidatesTokenCount") or 0)
                                              + int(meta.get("thoughtsTokenCount") or 0))
                for cand in chunk.get("candidates") or []:
                    for part in (cand.get("content") or {}).get("parts") or []:
                        text = (part or {}).get("text")
                        if text and not (part or {}).get("thought"):
                            yield text

    async def complete(self, system: str, user: str, *, temperature: float = 0.0,
                       max_tokens: int = 512, json_mode: bool = False) -> LLMResponse:
        if not self.configured:
            return LLMResponse(provider=self.name, model=self.model,
                               error="Vertex credentials not set")

        started = time.perf_counter()
        try:
            token = await self._bearer()
            if self._http is None or self._http.is_closed:
                self._http = httpx.AsyncClient(timeout=self._timeout)
            resp = await self._http.post(
                self._url(),
                headers={"Authorization": f"Bearer {token}"},
                json=self._body(system, user, temperature, max_tokens, json_mode),
            )
            elapsed = (time.perf_counter() - started) * 1000
            if resp.status_code != 200:
                if resp.status_code in (401, 403):
                    self._token = ""  # a revoked or expired token is not reused
                return LLMResponse(provider=self.name, model=self.model, latency_ms=elapsed,
                                   error=f"HTTP {resp.status_code}: {resp.text[:300]}")
            body = resp.json()
            usage = body.get("usageMetadata") or {}
            prompt_tokens = int(usage.get("promptTokenCount") or 0)
            # Reasoning tokens are billed at the output price.
            output_tokens = (int(usage.get("candidatesTokenCount") or 0)
                             + int(usage.get("thoughtsTokenCount") or 0))
            cand = (body.get("candidates") or [{}])[0] or {}
            parts = (cand.get("content") or {}).get("parts") or []
            text = "".join(str((p or {}).get("text") or "") for p in parts
                           if not (p or {}).get("thought"))
            if not text.strip():
                # Google bills a 200 whatever it holds, so the tokens ride along.
                reason = cand.get("finishReason") or "no candidates"
                return LLMResponse(provider=self.name, model=self.model,
                                   prompt_tokens=prompt_tokens, completion_tokens=output_tokens,
                                   latency_ms=elapsed, error=f"Empty response (finishReason: {reason})")
            return LLMResponse(text=text, prompt_tokens=prompt_tokens,
                               completion_tokens=output_tokens, latency_ms=elapsed,
                               model=self.model, provider=self.name)
        except Exception as e:  # network, timeout, malformed JSON, token refresh
            elapsed = (time.perf_counter() - started) * 1000
            return LLMResponse(provider=self.name, model=self.model, latency_ms=elapsed,
                               error=f"{type(e).__name__}: {e}")
