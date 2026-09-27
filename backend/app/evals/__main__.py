"""CLI: python -m app.evals --providers sarvam,gemini --tasks generate,diagnose

Reads API keys from the environment (or backend/.env):
  SARVAM_API_KEY  GEMINI_API_KEY  OPENAI_API_KEY  ANTHROPIC_API_KEY  OPENROUTER_API_KEY

Windows PowerShell 5.1 has no `&&` operator — chain with `;` instead:
  cd D:\Projects\Shabdackend; .venv\Scripts\python -m app.evals --providers sarvam
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys

from app.evals.cli_env import force_utf8_stdio, load_dotenv
from app.evals.providers import build_provider, load_pricing
from app.evals.report import render_failures, render_leaderboard, render_markdown
from app.evals.runner import DEFAULT_CACHE_DIR, run_suite, write_jsonl
from app.evals.tasks import TASK_BUILDERS, build_cases


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="python -m app.evals",
        description="Benchmark LLMs on Sanskrit generation, diagnosis and translation.",
    )
    p.add_argument("--providers", default="openrouter",
                   help="comma-separated, each 'name' or 'name:model' "
                        "(e.g. openrouter:google/gemini-3.7-flash,sarvam:sarvam-105b)")
    p.add_argument("--tasks", default="generate,diagnose",
                   help=f"comma-separated from: {', '.join(TASK_BUILDERS)}")
    p.add_argument("--limit", type=int, default=None,
                   help="use only the first N seed challenges (cheap smoke run)")
    p.add_argument("--concurrency", type=int, default=4)
    p.add_argument("--max-tokens", type=int, default=4096)
    p.add_argument("--temperature", type=float, default=0.0)
    p.add_argument("--retries", type=int, default=2)
    p.add_argument("--no-cache", action="store_true",
                   help="ignore and do not write the response cache")
    p.add_argument("--cache-dir", default=DEFAULT_CACHE_DIR)
    p.add_argument("--pricing", default=None,
                   help="JSON file overriding INR-per-1M-token pricing")
    p.add_argument("--out", default=None,
                   help="write per-case JSONL results here")
    p.add_argument("--markdown", default=None, help="write the leaderboard as Markdown")
    p.add_argument("--show-failures", type=int, default=0,
                   help="print up to N failing cases with raw model output")
    p.add_argument("--failures-task", default="generate",
                   help="which task's failures to print")
    p.add_argument("--dry-run", action="store_true",
                   help="build and print the cases, make no API calls")
    return p


async def _main(args) -> int:
    load_dotenv()
    if args.pricing:
        load_pricing(args.pricing)

    tasks = [t.strip() for t in args.tasks.split(",") if t.strip()]
    cases = build_cases(tasks, limit=args.limit)
    if not cases:
        print("No cases built.", file=sys.stderr)
        return 1

    by_task: dict[str, int] = {}
    for c in cases:
        by_task[c.task] = by_task.get(c.task, 0) + 1
    print(f"{len(cases)} cases: " + ", ".join(f"{k}={v}" for k, v in sorted(by_task.items())))

    if args.dry_run:
        for c in cases[:10]:
            print(f"\n--- {c.id} [{c.task}] ---\n{c.user}\n  gold: {json.dumps(c.gold, ensure_ascii=False)[:200]}")
        if len(cases) > 10:
            print(f"\n... and {len(cases) - 10} more")
        return 0

    refs = [r.strip() for r in args.providers.split(",") if r.strip()]
    providers = []
    for ref in refs:
        try:
            prov = build_provider(ref)
        except ValueError as e:
            print(f"error: {e}", file=sys.stderr)
            return 2
        if not prov.configured:
            print(f"skipping {prov.label}: {prov.spec.env_key} not set", file=sys.stderr)
            continue
        providers.append(prov)

    if not providers:
        print("No configured providers. Set an API key and retry.", file=sys.stderr)
        return 2

    print(f"providers: {', '.join(p.label for p in providers)}\n")

    state = {"label": ""}

    def progress(rec, done, total):
        label = f"{rec.provider}:{rec.model}"
        if state["label"] != label:
            state["label"] = label
            print(f"\n  {label}")
        mark = "." if rec.score else "!"
        end = "\n" if done == total else ""
        print(mark, end=end, flush=True)

    summaries, records = await run_suite(
        providers, cases,
        concurrency=args.concurrency,
        cache_dir=None if args.no_cache else args.cache_dir,
        max_tokens=args.max_tokens,
        temperature=args.temperature,
        retries=args.retries,
        progress=progress,
    )

    print("\n\n" + render_leaderboard(summaries))

    if args.show_failures:
        print(f"\n\n--- failures ({args.failures_task}) ---")
        print(render_failures(records, limit=args.show_failures, task=args.failures_task))

    if args.out:
        write_jsonl(args.out, records)
        print(f"\nper-case results -> {args.out}")
    if args.markdown:
        os.makedirs(os.path.dirname(os.path.abspath(args.markdown)), exist_ok=True)
        with open(args.markdown, "w", encoding="utf-8") as fh:
            fh.write(render_markdown(summaries) + "\n")
        print(f"leaderboard -> {args.markdown}")

    return 0


def main() -> int:
    force_utf8_stdio()
    args = build_parser().parse_args()
    try:
        return asyncio.run(_main(args))
    except KeyboardInterrupt:
        print("\ninterrupted", file=sys.stderr)
        return 130


if __name__ == "__main__":
    raise SystemExit(main())
