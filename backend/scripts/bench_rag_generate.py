"""Book-search (RAG) comparison, stage 2: the models answer.

Every model gets the same thing for each question: the production Ask
prompt (services/ask_live.system_prompt + user_message) with the verses the
search found, frozen in results/rag_full_20261009/retrieval_gemini.json.
Temperature 0.4 and the card in JSON mode, as in production.

    .venv/Scripts/python.exe scripts/bench_rag_generate.py main
    .venv/Scripts/python.exe scripts/bench_rag_generate.py repeats
    .venv/Scripts/python.exe scripts/bench_rag_generate.py ttft
    ... --only gemini_flash,deepseek_flash

Answers are saved one file per call under answers/<model>/; a rerun skips
what is already answered (and retries what failed with --retry-errors).
Every call is priced into ledger.jsonl at the rates in RATES, read from each
vendor's own page on 2026-10-09. The run stops starting new calls once the
ledger reaches CAP_INR.
"""

from __future__ import annotations

import argparse
import asyncio
import contextvars
import hashlib
import json
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "scripts"))

from bench_rag_full import OUT, ledger  # noqa: E402  (loads .env, settings)

import httpx  # noqa: E402

from app.config import settings  # noqa: E402
from app.evals.providers import LLMResponse, build_provider  # noqa: E402
from app.services import ask_live  # noqa: E402
from rag_bench_cases import CASES, HARD, LANG  # noqa: E402

CAP_INR = 490.0
# The app's own conversion (services/quota.py): ₹100 to the dollar, rounded
# up on purpose, so rupee figures for dollar-priced models are a ceiling.
USD_INR = 100.0
TEMPERATURE = 0.4
BASE_MAX = settings.ask_live_max_tokens  # 2400, production
TTFT_CASES = ["A01", "A07", "B03", "C01", "C05", "D04", "E02", "E06", "F01", "F03"]

OR_OFF = {"enabled": False, "exclude": True}
MODELS = {
    "gemma_free": {"ref": "openrouter:google/gemma-4-31b-it:free", "free": True, "or_reasoning": OR_OFF},
    "gemma_paid": {"ref": "openrouter:google/gemma-4-31b-it", "or_reasoning": OR_OFF},
    "nemotron_free": {"ref": "openrouter:nvidia/nemotron-3-super-120b-a12b:free", "free": True, "or_reasoning": OR_OFF},
    "gpt6_luna": {"ref": "openrouter:openai/gpt-6-luna", "or_reasoning": OR_OFF},
    "qwen38_flash": {"ref": "openrouter:qwen/qwen3.8-flash", "or_reasoning": OR_OFF},
    "deepseek_flash": {"ref": "openrouter:deepseek/deepseek-v4.1-flash", "or_reasoning": OR_OFF},
    "gemini_flash": {"ref": "vertex:gemini-3.8-flash", "thinking": 0},
    "gemini_flash_lite": {"ref": "vertex:gemini-3.5-flash-lite", "thinking": 0},
    # Pro thinks with up to 2,048 tokens and costs about ₹3.8 an answer, so it
    # answers the 60 main questions only (main_only), within the ₹500 budget.
    "gemini_pro": {"ref": "vertex:gemini-3.1-pro-preview", "thinking": 2048, "max": BASE_MAX + 2048,
                   "main_only": True},
    # sarvam-105b reasons before it answers and its reasoning counts against
    # max_tokens: at 6,000 tokens it returned nothing, and on "low" effort it
    # still reasoned for 5,457 tokens (smoke run, 2026-10-09). The
    # conversations model does not reason.
    "sarvam_105b": {"ref": "sarvam:sarvam-105b", "max": 10000, "concurrency": 3,
                    "extra": {"reasoning_effort": "low"}},
    "sarvam_conv": {"ref": "sarvam:sarvam-105b-conversations", "concurrency": 3},
    # Gemini 3.7 Flash on the free Gemini API keys (GEMINI_API_KEYS), through the
    # same pool the app uses: 5 requests a minute and 20 a day per key and model,
    # so 60 questions need all of three keys' day. Stops when the quota is spent
    # and resumes where it left off on the next run (answers already written are kept).
    "gemini_37_free": {"ref": "gemfree:gemini-3.7-flash", "gemfree": True, "concurrency": 3},
    # The reasoning check: the four leading cheap models again, thinking on,
    # on every question any of the four did not get fully right (stage
    # "reasoning", answers_reasoning/). Reasoning counts against max_tokens.
    "gemini_flash_think": {"ref": "vertex:gemini-3.8-flash", "thinking": 1024, "max": BASE_MAX + 1024,
                           "variant_of": "gemini_flash"},
    "deepseek_flash_think": {"ref": "openrouter:deepseek/deepseek-v4.1-flash", "or_reasoning": {"effort": "low"},
                             "max": BASE_MAX + 2048, "variant_of": "deepseek_flash"},
    "qwen38_flash_think": {"ref": "openrouter:qwen/qwen3.8-flash", "or_reasoning": {"enabled": True},
                           "max": BASE_MAX + 2048, "variant_of": "qwen38_flash"},
    "gpt6_luna_think": {"ref": "openrouter:openai/gpt-6-luna", "or_reasoning": {"effort": "low"},
                        "max": BASE_MAX + 2048, "variant_of": "gpt6_luna"},
}

_or = json.loads((OUT / "openrouter_catalog_snapshot.json").read_text(encoding="utf-8"))
OR_SRC = "OpenRouter /api/v1/models, fetched 2026-10-09"
VERTEX_SRC = "cloud.google.com/vertex-ai/generative-ai/pricing, read 2026-10-09 (global, standard)"
SARVAM_SRC = "sarvam.ai/api-pricing, read 2026-10-09"
RATES = {
    "gemini_flash": ("USD", 0.75, 3.75, VERTEX_SRC + "; introductory price through 2026-12-31"),
    "gemini_flash_lite": ("USD", 0.30, 2.50, VERTEX_SRC),
    "gemini_pro": ("USD", 2.00, 12.00, VERTEX_SRC + "; prompts up to 200k tokens"),
    "sarvam_105b": ("INR", 29.28, 73.20, SARVAM_SRC),
    "sarvam_conv": ("INR", 29.28, 73.20, SARVAM_SRC),
}
RATES["gemini_37_free"] = ("USD", 0.0, 0.0, "Gemini API free tier (AI Studio keys), read 2026-10-10: no charge")
RATES["gemini_37_vertex"] = ("USD", 0.75, 3.75, VERTEX_SRC + "; Gemini 3.7 Flash, the same introductory price as 3.8 Flash")
for _label, _m in MODELS.items():
    if _m["ref"].startswith("openrouter:"):
        _p = _or[_m["ref"].partition(":")[2]]["pricing"]
        RATES[_label] = ("USD", float(_p["prompt"]) * 1e6, float(_p["completion"]) * 1e6, OR_SRC)
for _label, _m in MODELS.items():
    if _m.get("variant_of") and _label not in RATES:
        RATES[_label] = RATES[_m["variant_of"]]
# Embeddings (Vertex, online): Gemini Embedding $0.00015 per 1,000 input
# tokens; older text embeddings $0.000025 per 1,000 characters.
EMBED_RATES = {"gemini-embedding-001": ("USD", 0.15, "tokens"), "text-multilingual-embedding-002": ("USD", 0.025, "chars")}


def cost_inr(label: str, tin: int, tout: int) -> float:
    cur, rin, rout, _ = RATES[label]
    c = (tin * rin + tout * rout) / 1e6
    return c * USD_INR if cur == "USD" else c


def ledger_spent() -> float:
    total = 0.0
    p = OUT / "ledger.jsonl"
    if not p.exists():
        return 0.0
    for line in p.read_text(encoding="utf-8").splitlines():
        e = json.loads(line)
        if "cost_inr" in e:
            total += e["cost_inr"]
        elif e.get("model") in EMBED_RATES:
            cur, rate, unit = EMBED_RATES[e["model"]]
            n = e.get("tokens_in", 0) if unit == "tokens" else e.get("chars", 0)
            total += n * rate / 1e6 * USD_INR
    return total


# ── prompts ────────────────────────────────────────────────────────────────

def frozen_retrieval() -> dict:
    data = json.loads((OUT / "retrieval_gemini.json").read_text(encoding="utf-8"))
    return {r["id"]: r for r in data["results"]}


def prompt_for(c: dict, block: str) -> tuple[str, str]:
    system = ask_live.system_prompt(block)
    user = ask_live.user_message(
        c["question"], LANG[c["lang"]], history=[tuple(h) for h in c["history"]],
        facts=c["facts"], chart=c["chart"], screen_text=c["screen_text"], books=block,
    )
    return system, user


# ── providers ──────────────────────────────────────────────────────────────

_usage = contextvars.ContextVar("or_usage", default=None)


class FreePoolProvider:
    """One free-tier Gemini model across every key in GEMINI_API_KEYS, then Vertex.

    Waits a little for a free minute slot; when every key's day is spent (or every
    slot is parked for long) the call goes to Vertex, as the app would send it.
    The answer says which road it took in ``provider``: gemini-free or vertex."""

    configured = True

    def __init__(self, model: str, timeout: float) -> None:
        from app.services import gemini_pool as gp

        keys = gp.parse_keys(settings.gemini_api_keys)
        if not keys:
            raise SystemExit("GEMINI_API_KEYS is empty")
        self.model = model
        self.paid = build_provider(f"vertex:{model}", timeout=timeout)
        self.label = f"gemini-free:{model}"
        self.pool = gp.GeminiPool(keys, [model], rpm=settings.gemini_free_rpm, rpd=settings.gemini_free_rpd,
                                  timeout=timeout)

    async def complete(self, system, user, *, temperature=0.0, max_tokens=512, json_mode=False):
        while True:
            slot = self.pool.acquire("chat")
            if slot is None:
                now = self.pool.clock()
                wait = min(s.blocked_until for s in self.pool.slots["chat"]) - now
                full = [s for s in self.pool.slots["chat"] if s.used_today >= settings.gemini_free_rpd]
                if wait > 900 or len(full) == len(self.pool.slots["chat"]):
                    return await self.paid.complete(system, user, temperature=temperature,
                                                    max_tokens=max_tokens, json_mode=json_mode)
                await asyncio.sleep(min(max(wait, 1.0), 20.0) if wait > 0 else 2.0)
                continue
            resp = await self.pool.provider_for(slot).complete(
                system, user, temperature=temperature, max_tokens=max_tokens, json_mode=json_mode)
            if resp.ok:
                self.pool.ok(slot)
                return resp
            self.pool.fail(slot, resp.error or "empty")
            if (resp.error or "").startswith("Empty response"):
                return resp
            # a 429, a 503 or a timeout: the next slot, or the same one later

    async def close(self) -> None:
        await self.paid.close()
        for slot in self.pool.slots["chat"]:
            if slot.provider is not None:
                await slot.provider.close()


def make_provider(label: str):
    m = MODELS[label]
    if m["ref"].startswith("gemfree:"):
        return FreePoolProvider(m["ref"].partition(":")[2], m.get("timeout", 120))
    p = build_provider(m["ref"], timeout=m.get("timeout", 180))
    if m.get("extra"):
        payload_x = p._payload

        def payload_extra(*a, **k):
            return {**payload_x(*a, **k), **m["extra"]}

        p._payload = payload_extra
    if m["ref"].startswith("openrouter:"):
        payload0, parse0 = p._payload, p._parse

        def payload(*a, **k):
            body = payload0(*a, **k)
            body["reasoning"] = m["or_reasoning"]
            body["usage"] = {"include": True}  # OpenRouter then reports what it billed
            return body

        def parse(body):
            box = _usage.get()
            if box is not None:
                box["usage"] = body.get("usage")
                box["provider"] = body.get("provider")
            return parse0(body)

        p._payload, p._parse = payload, parse
    if m["ref"].startswith("vertex:"):
        body0 = p._body

        def vbody(*a, **k):
            b = body0(*a, **k)
            b["generationConfig"]["thinkingConfig"] = {"thinkingBudget": m["thinking"]}
            return b

        p._body = vbody
    return p


def max_tokens(label: str) -> int:
    return MODELS[label].get("max", BASE_MAX)


RETRYABLE = ("HTTP 429", "HTTP 500", "HTTP 502", "HTTP 503", "HTTP 504", "Timeout", "ConnectError",
             "ReadError", "RemoteProtocolError", "WriteError", "PoolTimeout")

_free_lock = asyncio.Lock()
_free_last = [0.0]


async def _pace_free() -> None:
    # OpenRouter's free models share one limit of 20 requests a minute.
    async with _free_lock:
        wait = 3.6 - (time.monotonic() - _free_last[0])
        if wait > 0:
            await asyncio.sleep(wait)
        _free_last[0] = time.monotonic()


async def call(label: str, p, system: str, user: str) -> tuple[LLMResponse, list, dict]:
    attempts = []
    box: dict = {}
    for i in range(4):
        if MODELS[label].get("free"):
            await _pace_free()
        box = {}
        _usage.set(box)
        r = await p.complete(system, user, temperature=TEMPERATURE, max_tokens=max_tokens(label), json_mode=True)
        attempts.append({"error": (r.error or "")[:200], "ms": round(r.latency_ms)})
        if not r.error or not any(s in r.error for s in RETRYABLE) or i == 3:
            return r, attempts, box
        await asyncio.sleep((15, 40, 90)[i])
    return r, attempts, box


# ── one stage ──────────────────────────────────────────────────────────────

def answer_path(label: str, cid: str, run: int, stage: str = "main") -> Path:
    folder = {"reasoning": "answers_reasoning", "control": "answers_control"}.get(stage, "answers")
    return OUT / folder / label / f"{cid}__r{run}.json"


async def run_stage(stage: str, labels: list[str], retry_errors: bool, only_cases: set[str]) -> None:
    frozen = frozen_retrieval()
    prompts_dir = OUT / "prompts"
    prompts_dir.mkdir(parents=True, exist_ok=True)
    jobs: dict[str, list[tuple[dict, int]]] = {}
    for label in labels:
        if stage in ("main", "reasoning", "control"):
            jobs[label] = [(c, 0) for c in CASES]
        else:
            jobs[label] = [(c, run) for run in (1, 2) for c in CASES if c["id"] in HARD]
        if only_cases:
            jobs[label] = [(c, run) for c, run in jobs[label] if c["id"] in only_cases]

    unavailable: set[str] = set()
    fails_in_row: dict[str, int] = {}

    async def one_model(label: str) -> None:
        p = make_provider(label)
        sem = asyncio.Semaphore(1 if MODELS[label].get("free") else MODELS[label].get("concurrency", 4))

        async def one(c: dict, run: int) -> None:
            path = answer_path(label, c["id"], run, stage)
            if path.exists():
                old = json.loads(path.read_text(encoding="utf-8"))
                if not (retry_errors and old.get("error")):
                    return
            async with sem:
                if label in unavailable:
                    return
                if ledger_spent() + cost_inr(label, 8000, max_tokens(label)) > CAP_INR:
                    print(f"{label} {c['id']} r{run}: skipped, budget cap reached", flush=True)
                    return
                block = frozen[c["id"]]["block"]
                system, user = prompt_for(c, block)
                (prompts_dir / f"{c['id']}.txt").write_text(user, encoding="utf-8")
                r, attempts, box = await call(label, p, system, user)
                # A free-key answer costs nothing; the same model answered by Vertex is paid.
                cost = cost_inr("gemini_37_vertex" if (MODELS[label].get("gemfree") and r.provider == "vertex")
                                else label, r.prompt_tokens, r.completion_tokens)
                billed = ((box.get("usage") or {}).get("cost")) if box else None
                row = {
                    "label": label, "ref": MODELS[label]["ref"], "case": c["id"], "run": run, "stage": stage,
                    "text": r.text, "error": r.error, "prompt_tokens": r.prompt_tokens,
                    "completion_tokens": r.completion_tokens, "latency_ms": round(r.latency_ms),
                    "attempts": attempts, "cost_inr": round(cost, 5), "openrouter_billed_usd": billed,
                    "openrouter_usage": (box or {}).get("usage"), "served_by": (box or {}).get("provider"),
                    "road": r.provider, "temperature": TEMPERATURE, "max_tokens": max_tokens(label),
                    "thinking_budget": MODELS[label].get("thinking"), "or_reasoning": MODELS[label].get("or_reasoning"),
                    "system_sha": hashlib.sha256(system.encode()).hexdigest()[:12],
                }
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text(json.dumps(row, ensure_ascii=False, indent=1), encoding="utf-8")
                ledger({"stage": stage, "model": label, "case": c["id"], "run": run,
                        "tokens_in": r.prompt_tokens, "tokens_out": r.completion_tokens,
                        "cost_inr": round(cost, 5), "error": bool(r.error)})
                print(f"{label:17s} {c['id']} r{run} {r.latency_ms / 1000:6.1f}s in {r.prompt_tokens:5d} "
                      f"out {r.completion_tokens:5d} ₹{cost:.3f} {('ERR ' + r.error[:90]) if r.error else ''}",
                      flush=True)
                if MODELS[label].get("free") or MODELS[label].get("gemfree"):
                    fails_in_row[label] = fails_in_row.get(label, 0) + 1 if r.error else 0
                    if fails_in_row[label] >= 4:
                        unavailable.add(label)
                        print(f"{label}: 4 failures in a row, marked unavailable", flush=True)

        try:
            await asyncio.gather(*(one(c, run) for c, run in jobs[label]))
        finally:
            await p.close()

    await asyncio.gather(*(one_model(label) for label in labels))
    if unavailable:
        (OUT / f"unavailable_{stage}.json").write_text(json.dumps(sorted(unavailable)), encoding="utf-8")
    print(f"stage {stage} done; ledger now ₹{ledger_spent():.2f}", flush=True)


# ── time to the first piece of the answer (streamed) ───────────────────────

async def _stream_openai(p, label: str, system: str, user: str) -> dict:
    body = p._payload(system, user, TEMPERATURE, max_tokens(label), True)
    body["stream"] = True
    body["stream_options"] = {"include_usage": True}
    url = p.spec.base_url.rstrip("/") + "/chat/completions"
    started = time.perf_counter()
    first = None
    text = ""
    usage = {}
    async with httpx.AsyncClient(timeout=150) as client:
        async with client.stream("POST", url, headers=p._headers(), json=body) as resp:
            if resp.status_code != 200:
                return {"error": f"HTTP {resp.status_code}: {(await resp.aread())[:200]!r}"}
            async for line in resp.aiter_lines():
                if not line.startswith("data:"):
                    continue
                data = line[5:].strip()
                if data == "[DONE]":
                    break
                try:
                    chunk = json.loads(data)
                except json.JSONDecodeError:
                    continue
                if chunk.get("usage"):
                    usage = chunk["usage"]
                for ch in chunk.get("choices") or []:
                    piece = (ch.get("delta") or {}).get("content") or ""
                    if piece:
                        if first is None:
                            first = time.perf_counter()
                        text += piece
    end = time.perf_counter()
    return {"first_ms": round((first - started) * 1000) if first else None, "total_ms": round((end - started) * 1000),
            "prompt_tokens": int(usage.get("prompt_tokens") or 0), "completion_tokens": int(usage.get("completion_tokens") or 0),
            "chars": len(text), "billed_usd": usage.get("cost")}


async def _stream_vertex(p, label: str, system: str, user: str) -> dict:
    started = time.perf_counter()
    first = None
    usage: dict = {}
    n = 0
    async for piece in p.stream(system, user, temperature=TEMPERATURE, max_tokens=max_tokens(label),
                                json_mode=True, usage=usage):
        if first is None:
            first = time.perf_counter()
        n += len(piece)
    end = time.perf_counter()
    return {"first_ms": round((first - started) * 1000) if first else None, "total_ms": round((end - started) * 1000),
            "prompt_tokens": usage.get("prompt_tokens", 0), "completion_tokens": usage.get("output_tokens", 0), "chars": n}


async def run_ttft(labels: list[str]) -> None:
    frozen = frozen_retrieval()
    cases = [c for c in CASES if c["id"] in TTFT_CASES]

    async def one_model(label: str) -> None:
        p = make_provider(label)
        try:
            for c in cases:
                path = OUT / "ttft" / label / f"{c['id']}.json"
                if path.exists():
                    continue
                if ledger_spent() + cost_inr(label, 8000, max_tokens(label)) > CAP_INR:
                    print(f"{label} ttft {c['id']}: skipped, budget cap reached", flush=True)
                    return
                if MODELS[label].get("free"):
                    await _pace_free()
                system, user = prompt_for(c, frozen[c["id"]]["block"])
                try:
                    if MODELS[label]["ref"].startswith("vertex:"):
                        r = await _stream_vertex(p, label, system, user)
                    else:
                        r = await _stream_openai(p, label, system, user)
                except Exception as exc:  # noqa: BLE001
                    r = {"error": f"{type(exc).__name__}: {str(exc)[:200]}"}
                cost = cost_inr(label, r.get("prompt_tokens", 0), r.get("completion_tokens", 0))
                r.update(label=label, case=c["id"], cost_inr=round(cost, 5))
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text(json.dumps(r, indent=1), encoding="utf-8")
                ledger({"stage": "ttft", "model": label, "case": c["id"], "tokens_in": r.get("prompt_tokens", 0),
                        "tokens_out": r.get("completion_tokens", 0), "cost_inr": round(cost, 5),
                        "error": bool(r.get("error"))})
                print(f"{label:17s} ttft {c['id']} first {r.get('first_ms')} ms total {r.get('total_ms')} ms "
                      f"{r.get('error', '')}", flush=True)
        finally:
            await p.close()

    await asyncio.gather(*(one_model(label) for label in labels))
    print(f"ttft done; ledger now ₹{ledger_spent():.2f}", flush=True)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("stage", choices=["main", "repeats", "ttft", "reasoning", "control", "spent"])
    ap.add_argument("--only", default="")
    ap.add_argument("--retry-errors", action="store_true")
    ap.add_argument("--cases", default="", help="only these case ids (a smoke run)")
    args = ap.parse_args()
    if (settings.database_url or "").strip():
        raise SystemExit("DATABASE_URL is set; unset it.")
    if args.stage == "control" and not args.only:
        raise SystemExit("control needs --only (the plain models) and --cases")
    if args.stage == "reasoning":
        default = [k for k, m in MODELS.items() if m.get("variant_of")]
    else:
        default = [k for k, m in MODELS.items() if not m.get("variant_of")
                   and (args.stage == "main" or not m.get("main_only"))]
    labels = [x for x in args.only.split(",") if x] or default
    for label in labels:
        if label not in MODELS:
            raise SystemExit(f"unknown model {label}")
    (OUT / "manifest_generation.json").write_text(json.dumps({
        "models": MODELS, "rates": RATES, "embed_rates": EMBED_RATES, "usd_inr": USD_INR, "cap_inr": CAP_INR,
        "temperature": TEMPERATURE, "base_max_tokens": BASE_MAX, "hard": HARD, "ttft_cases": TTFT_CASES,
        "retrieval": "retrieval_gemini.json (gemini-embedding-001, top 6)",
    }, ensure_ascii=False, indent=1), encoding="utf-8")
    if args.stage == "spent":
        print(f"₹{ledger_spent():.2f}")
    elif args.stage == "ttft":
        asyncio.run(run_ttft(labels))
    else:
        asyncio.run(run_stage(args.stage, labels, args.retry_errors, {x for x in args.cases.split(",") if x}))


if __name__ == "__main__":
    main()
