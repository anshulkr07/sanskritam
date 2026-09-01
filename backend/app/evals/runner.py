"""Async eval runner: fan out cases across providers, score, aggregate.

Every response is cached on disk keyed by (provider, model, case, prompt). Reruns
after a scorer change therefore cost nothing, which matters when the budget is a
fixed pot of credits rather than a metered account. Delete the cache dir (or pass
no_cache=True) to force real calls.
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import os
import re
import statistics
import time
from dataclasses import dataclass, field
from typing import Iterable, Optional

from app.evals.providers import LLMResponse, Provider
from app.evals.scorers import CaseScore, score_case
from app.evals.tasks import EvalCase

logger = logging.getLogger("shabd.evals.runner")

DEFAULT_CACHE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".cache")


# ─── Records ───

@dataclass
class RunRecord:
    """One (provider, case) pair: what was asked, what came back, how it scored."""

    provider: str
    model: str
    case_id: str
    task: str
    response: LLMResponse
    score: Optional[CaseScore]
    cost_inr: float

    def to_dict(self) -> dict:
        return {
            "provider": self.provider,
            "model": self.model,
            "case_id": self.case_id,
            "task": self.task,
            "cost_inr": round(self.cost_inr, 6),
            "response": self.response.to_dict(),
            "score": self.score.to_dict() if self.score else None,
        }


@dataclass
class ProviderSummary:
    provider: str
    model: str
    n_cases: int = 0
    n_errors: int = 0
    metrics: dict[str, float] = field(default_factory=dict)
    per_task: dict[str, dict[str, float]] = field(default_factory=dict)
    cost_inr: float = 0.0
    latency_p50: float = 0.0
    latency_p95: float = 0.0
    n_live: int = 0          # responses actually fetched (not cache hits)
    prompt_tokens: int = 0
    completion_tokens: int = 0

    @property
    def label(self) -> str:
        return f"{self.provider}:{self.model}"

    @property
    def cost_per_accepted_inr(self) -> Optional[float]:
        """Rupees per sentence that actually clears the Vidyut gate.

        This is the number that decides deployment. A cheap model that fails the
        gate half the time is not cheap: every rejection is a regeneration, so
        real cost scales with 1/gate_pass, not with the sticker token price.
        """
        gate = self.per_task.get("generate", {}).get("gate_pass")
        gen_cases = self.per_task.get("generate", {}).get("_n", 0)
        if not gate or not gen_cases:
            return None
        accepted = gate * gen_cases
        if accepted <= 0:
            return None
        # Attribute only the generate-task share of spend.
        gen_cost = self.per_task.get("generate", {}).get("_cost", 0.0)
        return gen_cost / accepted

    def to_dict(self) -> dict:
        return {
            "provider": self.provider,
            "model": self.model,
            "n_cases": self.n_cases,
            "n_errors": self.n_errors,
            "metrics": {k: round(v, 4) for k, v in self.metrics.items()},
            "per_task": {
                t: {k: round(v, 4) for k, v in m.items()}
                for t, m in self.per_task.items()
            },
            "cost_inr": round(self.cost_inr, 4),
            "cost_per_accepted_inr": (
                round(self.cost_per_accepted_inr, 6)
                if self.cost_per_accepted_inr is not None else None
            ),
            "n_live": self.n_live,
            "latency_p50_ms": round(self.latency_p50, 1),
            "latency_p95_ms": round(self.latency_p95, 1),
            "prompt_tokens": self.prompt_tokens,
            "completion_tokens": self.completion_tokens,
        }


# ─── Cache ───

def _safe_name(s: str) -> str:
    """Make a string usable as a filename.

    OpenRouter model ids always contain a slash (google/gemini-2.5-flash), which
    turns the cache path into a nested directory that does not exist. The write
    then failed as a swallowed OSError, so those responses were silently never
    cached and every rerun spent money again.
    """
    return re.sub(r"[^A-Za-z0-9._-]", "_", s)


def _cache_key(provider: Provider, case: EvalCase) -> str:
    h = hashlib.sha256()
    h.update(provider.label.encode("utf-8"))
    h.update(b"\0")
    h.update(case.system.encode("utf-8"))
    h.update(b"\0")
    h.update(case.user.encode("utf-8"))
    name = _safe_name(f"{provider.name}-{provider.model}-{case.id}")
    return f"{name}-{h.hexdigest()[:16]}.json"


def _cache_load(cache_dir: str, key: str) -> Optional[LLMResponse]:
    path = os.path.join(cache_dir, key)
    if not os.path.isfile(path):
        return None
    try:
        with open(path, encoding="utf-8") as fh:
            resp = LLMResponse.from_dict(json.load(fh))
        resp.cached = True
        return resp
    except (OSError, ValueError, TypeError):
        return None


def _cache_store(cache_dir: str, key: str, resp: LLMResponse) -> None:
    # Never cache failures — a transient 429 or timeout must not become a
    # permanent "this model scored 0" on every subsequent run.
    if not resp.ok:
        return
    os.makedirs(cache_dir, exist_ok=True)
    try:
        with open(os.path.join(cache_dir, key), "w", encoding="utf-8") as fh:
            json.dump(resp.to_dict(), fh, ensure_ascii=False)
    except OSError as e:
        logger.debug("cache write failed: %s", e)


# ─── Runner ───

async def _run_one(provider: Provider, case: EvalCase, sem: asyncio.Semaphore,
                   cache_dir: Optional[str], max_tokens: int,
                   temperature: float, retries: int) -> RunRecord:
    key = _cache_key(provider, case) if cache_dir else None
    if key:
        cached = _cache_load(cache_dir, key)
        if cached is not None:
            return _finish(provider, case, cached)

    async with sem:
        resp = LLMResponse(provider=provider.name, model=provider.model,
                           error="not attempted")
        for attempt in range(retries + 1):
            resp = await provider.complete(
                case.system, case.user,
                temperature=temperature,
                max_tokens=max_tokens,
                json_mode=case.json_mode,
            )
            if resp.ok:
                break
            # Retry only transient-looking failures; a 400 will fail identically.
            err = (resp.error or "").lower()
            transient = any(s in err for s in
                            ("429", "500", "502", "503", "504", "timeout", "timedout",
                             "connect", "readerror", "remoteprotocol"))
            if not transient or attempt == retries:
                break
            await asyncio.sleep(1.5 * (2 ** attempt))

    if key and resp.ok:
        _cache_store(cache_dir, key, resp)
    return _finish(provider, case, resp)


def _finish(provider: Provider, case: EvalCase, resp: LLMResponse) -> RunRecord:
    score = score_case(case, resp.text) if resp.ok else None
    return RunRecord(
        provider=provider.name,
        model=provider.model,
        case_id=case.id,
        task=case.task,
        response=resp,
        score=score,
        cost_inr=provider.cost_inr(resp.prompt_tokens, resp.completion_tokens),
    )


async def run_provider(provider: Provider, cases: list[EvalCase], *,
                       concurrency: int = 4, cache_dir: Optional[str] = DEFAULT_CACHE_DIR,
                       max_tokens: int = 512, temperature: float = 0.0,
                       retries: int = 2,
                       progress: Optional[callable] = None) -> list[RunRecord]:
    sem = asyncio.Semaphore(concurrency)
    tasks = [
        _run_one(provider, c, sem, cache_dir, max_tokens, temperature, retries)
        for c in cases
    ]
    records: list[RunRecord] = []
    for coro in asyncio.as_completed(tasks):
        rec = await coro
        records.append(rec)
        if progress:
            progress(rec, len(records), len(tasks))
    try:
        await provider.close()
    except Exception:
        pass
    # as_completed returns out of order; restore case order for stable output.
    order = {c.id: i for i, c in enumerate(cases)}
    records.sort(key=lambda r: order.get(r.case_id, 0))
    return records


def summarize(provider_label: str, records: list[RunRecord]) -> ProviderSummary:
    provider, _, model = provider_label.partition(":")
    s = ProviderSummary(provider=provider, model=model)
    s.n_cases = len(records)
    latencies: list[float] = []
    by_task: dict[str, list[CaseScore]] = {}
    task_cost: dict[str, float] = {}
    task_total: dict[str, int] = {}

    for rec in records:
        s.cost_inr += rec.cost_inr
        s.prompt_tokens += rec.response.prompt_tokens
        s.completion_tokens += rec.response.completion_tokens
        task_cost[rec.task] = task_cost.get(rec.task, 0.0) + rec.cost_inr
        task_total[rec.task] = task_total.get(rec.task, 0) + 1
        if not rec.response.cached:
            s.n_live += 1
            if rec.response.latency_ms:
                latencies.append(rec.response.latency_ms)
        if rec.score is None:
            s.n_errors += 1
            continue
        by_task.setdefault(rec.task, []).append(rec.score)

    if latencies:
        latencies.sort()
        s.latency_p50 = statistics.median(latencies)
        idx = min(len(latencies) - 1, int(round(0.95 * (len(latencies) - 1))))
        s.latency_p95 = latencies[idx]

    # Iterate over every task ATTEMPTED, not just those with scores. Quality
    # metrics average over the replies that came back, so a model whose calls
    # truncate is scored only on the ones it managed to finish — survivorship
    # bias that flatters exactly the models that fail most. `yield_rate` is the
    # denominator that makes those columns readable, and a task where every call
    # failed must still appear rather than vanishing from the table.
    for task, total in task_total.items():
        scores = by_task.get(task, [])
        keys = {k for sc in scores for k in sc.metrics}
        agg = {}
        for k in keys:
            vals = [sc.metrics[k] for sc in scores if k in sc.metrics]
            agg[k] = sum(vals) / len(vals) if vals else 0.0
        agg["yield_rate"] = len(scores) / total if total else 0.0
        agg["_n"] = float(len(scores))
        agg["_n_total"] = float(total)
        agg["_cost"] = task_cost.get(task, 0.0)
        s.per_task[task] = agg

    # Headline metrics, one per task, chosen to be the product-relevant one.
    headline = {
        "generate": "gate_pass",
        "diagnose": "full_diagnosis",
        "translate": "content_f1",
    }
    for task, key in headline.items():
        if task in s.per_task and key in s.per_task[task]:
            s.metrics[key] = s.per_task[task][key]
    if "diagnose" in s.per_task and "false_accusation" in s.per_task["diagnose"]:
        s.metrics["false_accusation"] = s.per_task["diagnose"]["false_accusation"]
    return s


async def run_suite(providers: list[Provider], cases: list[EvalCase], *,
                    concurrency: int = 4, cache_dir: Optional[str] = DEFAULT_CACHE_DIR,
                    max_tokens: int = 512, temperature: float = 0.0,
                    retries: int = 2,
                    progress: Optional[callable] = None
                    ) -> tuple[list[ProviderSummary], list[RunRecord]]:
    """Run every case against every provider. Providers run sequentially so a
    rate limit on one does not distort another's latency numbers."""
    summaries: list[ProviderSummary] = []
    all_records: list[RunRecord] = []
    for provider in providers:
        started = time.perf_counter()
        records = await run_provider(
            provider, cases, concurrency=concurrency, cache_dir=cache_dir,
            max_tokens=max_tokens, temperature=temperature, retries=retries,
            progress=progress,
        )
        all_records.extend(records)
        summaries.append(summarize(provider.label, records))
        logger.info("%s: %d cases in %.1fs", provider.label, len(records),
                    time.perf_counter() - started)
    return summaries, all_records


def write_jsonl(path: str, records: Iterable[RunRecord]) -> None:
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    with open(path, "w", encoding="utf-8") as fh:
        for rec in records:
            fh.write(json.dumps(rec.to_dict(), ensure_ascii=False) + "\n")
