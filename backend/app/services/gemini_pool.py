"""Free-tier Gemini keys in front of the paid Vertex route.

Owner decision 2026-10-10: try the free Gemini API quota first, on every
Google account the owner has, and go to paid Vertex only when the free quota
is spent. The same for embeddings.

Each (key, model) pair is a slot with its own quota. Google counts a free
quota per project per model: 5 requests a minute and 20 a day for Gemini 3.8
Flash (AI Studio, 2026-10-10), with the day ending at midnight Pacific time
(12:30 pm IST in summer, 1:30 pm in winter). Slots are tried in the order of
``gemini_free_models`` and, within a model, spread over the keys; an Ask
question that services/ask_route.py has sorted into a lane uses that lane's own
list instead (``gemini_free_models_simple``, ``gemini_free_models_careful``).

A slot is skipped without a call when the app's own count says its minute or
day is full, and after a 429 it is parked until the quota is back: for the
retry time Google names, or until the day's reset when the quota hit was the
daily one. A bad key or model (401, 403, 404, three 400s in a row) is parked
for ten minutes so it does not cost every request a failed call. State lives
in the process: with several Cloud Run instances each keeps its own count, and
the 429 from Google is the authority.

What this does NOT know is whether a key is free. A key from a project with a
billing account (AI Studio shows "Tier 1") is a paid service: its calls are
billed, and here they would be counted as free. Such a key does not belong in
GEMINI_API_KEYS.

Never log a key. Slots are named k1, k2, ... in logs and status.
"""

from __future__ import annotations

import asyncio
import logging
import re
import time
from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Callable, Optional
from zoneinfo import ZoneInfo

from app.config import settings
from app.evals.providers import LLMResponse, ProviderSpec
from app.services.vertex_live import VertexProvider

logger = logging.getLogger("shabd.gemini_pool")

PACIFIC = ZoneInfo("America/Los_Angeles")
API_BASE = "https://generativelanguage.googleapis.com/v1beta"

_BAD_PARK_S = 600           # a bad key or model
_SERVER_PARK_S = 30         # a 5xx or a network error
_MIN_PARK_S = 5
_MAX_MINUTE_PARK_S = 900
_REPEAT_PARK_S = 1800       # a per-minute 429 that keeps coming back
_MAX_FREE_TRIES = 3         # slots tried for one request before paying


def pacific_day(now: float) -> str:
    return datetime.fromtimestamp(now, PACIFIC).date().isoformat()


def next_reset(now: float) -> float:
    """The next midnight in Pacific time, as an epoch second (DST-aware)."""
    dt = datetime.fromtimestamp(now, PACIFIC)
    return (dt + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0).timestamp()


def parse_keys(raw: str) -> list[str]:
    """Keys from a comma- or whitespace-separated string, without repeats."""
    out: list[str] = []
    for k in re.split(r"[,\s;]+", raw or ""):
        k = k.strip().strip("'\"")
        if k and k not in out:
            out.append(k)
    return out


class GeminiApiProvider(VertexProvider):
    """Gemini ``generateContent`` on the Gemini Developer API with one key.

    The request and the answer have the Vertex shape, so only the address and
    the key header differ. The key travels in a header, never in the URL, so
    an HTTP log line cannot carry it."""

    _ERR_CHARS = 2000   # a 429 names its quota and retry time late in the body

    def __init__(self, key: str, model: str, timeout: float = 30.0) -> None:
        spec = ProviderSpec(base_url=API_BASE, env_key="GEMINI_API_KEYS", default_model=model)
        super().__init__("gemini-free", spec, model=model, api_key=key, timeout=timeout)

    @property
    def configured(self) -> bool:
        return bool(self._api_key)

    def _url(self) -> str:
        return f"{API_BASE}/models/{self.model}:generateContent"

    async def _bearer(self) -> str:
        return self._api_key

    def _auth_headers(self, token: str) -> dict:
        return {"x-goog-api-key": token}


@dataclass
class Slot:
    kind: str                      # "chat" | "embed"
    key_no: int                    # 1-based, for logs
    model: str
    key: str = field(repr=False)
    blocked_until: float = 0.0
    why: str = ""
    strikes: int = 0               # in a row: 400s, or per-minute 429s
    day: str = ""
    used_today: int = 0
    stamps: deque = field(default_factory=deque, repr=False)
    provider: object = field(default=None, repr=False)

    @property
    def name(self) -> str:
        return f"k{self.key_no}/{self.model}"


class GeminiPool:
    def __init__(self, keys: list[str], models: list[str], *, rpm: int, rpd: int,
                 embed_models: list[str] = (), embed_rpm: int = 0, embed_rpd: int = 0,
                 clock: Callable[[], float] = time.time,
                 provider_factory: Optional[Callable[[str, str], object]] = None,
                 timeout: float = 30.0) -> None:
        self.clock = clock
        self.limits = {"chat": (rpm, rpd), "embed": (embed_rpm, embed_rpd)}
        self._factory = provider_factory or (lambda key, model: GeminiApiProvider(key, model, timeout))
        self.slots: dict[str, list[Slot]] = {
            "chat": [Slot("chat", i + 1, m, k) for m in models for i, k in enumerate(keys)],
            "embed": [Slot("embed", i + 1, m, k) for m in embed_models for i, k in enumerate(keys)],
        }
        self._turn: dict[tuple[str, str], int] = {}

    # ── choosing ───────────────────────────────────────────────────────────

    def _usable(self, s: Slot, now: float) -> bool:
        if s.blocked_until > now:
            return False
        rpm, rpd = self.limits[s.kind]
        day = pacific_day(now)
        if s.day != day:
            s.day, s.used_today = day, 0
        if rpd and s.used_today >= rpd:
            return False
        if rpm:
            while s.stamps and now - s.stamps[0] >= 60.0:
                s.stamps.popleft()
            if len(s.stamps) >= rpm:
                return False
        return True

    def _ordered(self, kind: str, models: Optional[list[str]] = None) -> list[Slot]:
        """Models in the configured order, or in ``models`` (a model left out of it
        is not used); within a model, the keys in turn."""
        out: list[Slot] = []
        by_model: dict[str, list[Slot]] = {}
        for s in self.slots[kind]:
            by_model.setdefault(s.model, []).append(s)
        for model in (list(by_model) if models is None else [m for m in models if m in by_model]):
            group = by_model[model]
            n = self._turn.get((kind, model), 0) % len(group)
            out.extend(group[n:] + group[:n])
        return out

    def available(self, kind: str = "chat", models: Optional[list[str]] = None) -> bool:
        """Is there a slot a request could use now? Counts nothing."""
        now = self.clock()
        return any(self._usable(s, now) for s in self._ordered(kind, models))

    def acquire(self, kind: str = "chat", models: Optional[list[str]] = None) -> Optional[Slot]:
        """The first usable slot, counted as used; None when every slot is full or parked."""
        now = self.clock()
        for s in self._ordered(kind, models):
            if self._usable(s, now):
                s.stamps.append(now)
                s.used_today += 1
                k = (kind, s.model)
                self._turn[k] = self._turn.get(k, 0) + 1
                return s
        return None

    def provider_for(self, s: Slot):
        if s.provider is None:
            s.provider = self._factory(s.key, s.model)
        return s.provider

    # ── what came back ─────────────────────────────────────────────────────

    def ok(self, s: Slot) -> None:
        s.strikes = 0

    def fail(self, s: Slot, error: str) -> None:
        """Park a slot according to the error text of a failed call."""
        now = self.clock()
        text = error or ""
        m = re.search(r"HTTP (\d{3})", text)
        status = int(m.group(1)) if m else 0
        rpm, rpd = self.limits[s.kind]
        if status == 429:
            lim = re.search(r"limit:\s*(\d+)", text)
            daily = bool(re.search(r"per[\s_]?day|PerDay", text, re.I)) \
                or bool(rpd and lim and int(lim.group(1)) == rpd) \
                or bool(rpd and s.used_today >= rpd)
            if daily:
                s.blocked_until = next_reset(now)
                s.used_today = max(s.used_today, rpd)
                s.why = "daily quota"
            else:
                delay = re.search(r"retryDelay\"?\s*:\s*\"?(\d+(?:\.\d+)?)s|retry in (\d+(?:\.\d+)?)s", text, re.I)
                secs = float(next(g for g in delay.groups() if g)) + 1.0 if delay else 60.0
                s.strikes += 1
                secs = _REPEAT_PARK_S if s.strikes >= 4 else min(max(secs, _MIN_PARK_S), _MAX_MINUTE_PARK_S)
                s.blocked_until = now + secs
                s.why = "minute quota"
        elif status in (401, 403, 404):
            s.blocked_until, s.why = now + _BAD_PARK_S, f"HTTP {status}"
        elif status == 400:
            s.strikes += 1
            if s.strikes >= 3:
                s.blocked_until, s.why = now + _BAD_PARK_S, "HTTP 400 three times"
        else:
            # A timeout, a 5xx ("high demand") or a dropped connection: set the
            # slot aside for 30 s, then 60, 120 ... up to ten minutes while it
            # keeps failing; one good answer starts it over.
            s.strikes += 1
            secs = min(_SERVER_PARK_S * 2 ** (s.strikes - 1), _BAD_PARK_S)
            s.blocked_until, s.why = now + secs, "slow, or a network or server error"
        what = f"HTTP 429 ({s.why})" if status == 429 else text[:160].replace("\n", " ")
        parked = f", parked {s.blocked_until - now:.0f}s" if s.blocked_until > now else ""
        logger.warning("gemini free slot %s: %s%s", s.name, what, parked)

    def status(self) -> list[dict]:
        now = self.clock()
        out = []
        for kind, slots in self.slots.items():
            for s in slots:
                out.append({"kind": kind, "slot": s.name, "used_today": s.used_today,
                            "parked": bool(s.blocked_until > now), "why": s.why if s.blocked_until > now else "",
                            "back_in_s": round(max(0.0, s.blocked_until - now))})
        return out


# ── the pool the app uses ─────────────────────────────────────────────────

_pool: dict = {"sig": None, "pool": None}


def _signature() -> tuple:
    return (settings.gemini_api_keys, settings.gemini_free_models, settings.gemini_free_enabled,
            settings.gemini_free_rpm, settings.gemini_free_rpd, settings.gemini_free_embeddings,
            settings.gemini_free_embed_rpm, settings.gemini_free_embed_rpd, settings.book_search_embed_model)


def get_pool() -> Optional[GeminiPool]:
    """The shared pool, or None when the free tier is off or no key is set."""
    sig = _signature()
    if _pool["sig"] != sig:
        keys = parse_keys(settings.gemini_api_keys)
        pool = None
        if settings.gemini_free_enabled and keys:
            models = [m for m in re.split(r"[,;\s]+", settings.gemini_free_models) if m]
            embed_models = []
            if settings.gemini_free_embeddings and settings.book_search_embed_model.startswith("gemini-embedding"):
                embed_models = [settings.book_search_embed_model]
            pool = GeminiPool(keys, models, rpm=settings.gemini_free_rpm, rpd=settings.gemini_free_rpd,
                              embed_models=embed_models, embed_rpm=settings.gemini_free_embed_rpm,
                              embed_rpd=settings.gemini_free_embed_rpd, timeout=settings.ask_live_timeout_s)
            logger.info("gemini free tier: %d key(s) x %d model(s)", len(keys), len(models))
            for lane in ("simple", "careful"):
                named = lane_models(lane)
                if named is not None and not set(named) & set(models):
                    logger.warning("gemini free tier: lane %r names %s, none of which is in gemini_free_models; "
                                   "those questions go straight to paid", lane, named)
        _pool.update(sig=sig, pool=pool)
    return _pool["pool"]


def reset_pool() -> None:
    _pool.update(sig=None, pool=None)


def lane_models(lane: str) -> Optional[list[str]]:
    """The free models to try, in order, for a kind of question (``simple`` or
    ``careful``, from services/ask_route.py); None, meaning every model in
    ``gemini_free_models`` order, for any other lane or a blank setting."""
    raw = {"simple": settings.gemini_free_models_simple,
           "careful": settings.gemini_free_models_careful}.get(lane)
    return [m for m in re.split(r"[,;\s]+", raw or "") if m] or None


# ── chat: free first, then paid ───────────────────────────────────────────

class TieredGemini:
    """Same ``complete`` / ``stream`` as a provider; free slots first, then ``paid``.

    ``paid=False`` keeps a call on the free tier only (the paid budget is
    spent). ``private=True`` marks a request that carries personal data
    (a birth chart or a match): it goes straight to paid unless
    ``gemini_free_allow_personal`` is set. ``lane`` ("simple" or "careful")
    picks which free models are tried and in what order (``lane_models``);
    the paid route is the same for both."""

    is_tiered = True

    def __init__(self, pool: GeminiPool, paid) -> None:
        self.pool = pool
        self.paid = paid

    @property
    def label(self) -> str:
        return f"gemini-free>{self.paid.label}"

    @property
    def configured(self) -> bool:
        return bool(self.paid.configured) or bool(self.pool.slots["chat"])

    def _free_allowed(self, private: bool) -> bool:
        return not private or settings.gemini_free_allow_personal

    def free_possible(self, private: bool = False, lane: str = "") -> bool:
        return self._free_allowed(private) and self.pool.available("chat", lane_models(lane))

    async def complete(self, system: str, user: str, *, temperature: float = 0.0, max_tokens: int = 512,
                       json_mode: bool = False, paid: bool = True, private: bool = False,
                       lane: str = "") -> LLMResponse:
        timeout = settings.gemini_free_timeout_s or None
        if self._free_allowed(private):
            models = lane_models(lane)
            for _ in range(_MAX_FREE_TRIES):
                slot = self.pool.acquire("chat", models)
                if slot is None:
                    break
                try:
                    resp = await asyncio.wait_for(self.pool.provider_for(slot).complete(
                        system, user, temperature=temperature, max_tokens=max_tokens, json_mode=json_mode), timeout)
                except asyncio.TimeoutError:
                    # The free tier is slow right now; a second free slot would be too.
                    self.pool.fail(slot, f"Timeout: no answer in {timeout:.0f} s")
                    break
                if resp.ok:
                    self.pool.ok(slot)
                    logger.info("gemini free answered on %s (%d ms)", slot.name, resp.latency_ms)
                    return resp
                if (resp.error or "").startswith("Empty response"):
                    break  # the model answered nothing (a filter, a length stop): no quota is at fault
                self.pool.fail(slot, resp.error or "empty")
        if paid:
            return await self.paid.complete(system, user, temperature=temperature, max_tokens=max_tokens,
                                            json_mode=json_mode)
        return LLMResponse(provider="gemini-free", error="no free capacity and the paid route is not allowed")

    async def stream(self, system: str, user: str, *, temperature: float = 0.0, max_tokens: int = 512,
                     json_mode: bool = False, usage: Optional[dict] = None, paid: bool = True,
                     private: bool = False, lane: str = ""):
        """Pieces of the answer. A free slot that fails, or sends nothing within
        ``gemini_free_timeout_s``, before its first piece is replaced by the next
        slot (or by paid after a timeout); one that fails after it cannot be."""
        if usage is None:
            usage = {}
        timeout = settings.gemini_free_timeout_s or None
        if self._free_allowed(private):
            models = lane_models(lane)
            for _ in range(_MAX_FREE_TRIES):
                slot = self.pool.acquire("chat", models)
                if slot is None:
                    break
                usage["free"], usage["label"] = True, f"gemini-free:{slot.model}"
                agen = self.pool.provider_for(slot).stream(
                    system, user, temperature=temperature, max_tokens=max_tokens,
                    json_mode=json_mode, usage=usage)
                slow = False
                try:
                    err = ""
                    first = None
                    try:
                        first = await asyncio.wait_for(agen.__anext__(), timeout)
                    except StopAsyncIteration:
                        err = "empty stream"
                    except asyncio.TimeoutError:
                        err, slow = f"Timeout: no first piece in {timeout:.0f} s", True
                    except Exception as exc:  # noqa: BLE001 — judged by the pool
                        err = str(exc)
                    if first is None:
                        self.pool.fail(slot, err)
                        if slow:
                            break
                        continue
                    yield first
                    async for piece in agen:   # a failure from here on cannot be replaced
                        yield piece
                    self.pool.ok(slot)
                    return
                finally:
                    await agen.aclose()
        if not paid:
            raise RuntimeError("no free capacity and the paid route is not allowed")
        usage["free"], usage["label"] = False, self.paid.label
        async for piece in self.paid.stream(system, user, temperature=temperature, max_tokens=max_tokens,
                                            json_mode=json_mode, usage=usage):
            yield piece
