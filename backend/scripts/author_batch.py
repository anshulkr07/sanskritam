"""Batch authoring runner — convert SCENARIO_BRIEFS into dialogue scenarios.

Usage:
    python -m scripts.author_batch --dry-run                  # DEFAULT. Costs nothing.
    python -m scripts.author_batch --live --limit 5           # author 5 briefs
    python -m scripts.author_batch --live --slug greeting-first-meeting
    python -m scripts.author_batch --live --render --limit 5  # also pre-render audio
    python -m scripts.author_batch --report                   # gate stats, no calls
"""

import argparse
import asyncio
import json
import logging
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

# Ensure backend is importable
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# Windows consoles default to cp1252, which cannot encode ₹ (U+20B9): the
# estimate tracebacks halfway through printing. Force UTF-8 on stdout.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from app.config import settings
from app.db import init_db, SessionLocal
from app.models import DialogueScenario
from app.seeds.briefs import SCENARIO_BRIEFS

logger = logging.getLogger("shabd.author_batch")

# ── Cost estimates (₹) ─────────────────────────────────
# Rates per architecture.md §4.1: Bulbul v3 bills ₹30/10K characters.
COST_PER_LLM_CALL = 0.0055  # ₹/draft call (sarvam-105b-conversations)
COST_PER_TTS_CHAR = 0.003   # ₹/character
# Measured, not guessed: the 30 speakable nodes of the seeded scenario average
# 37 chars (median 40, max 75). Only the `devanagari` line is sent to TTS —
# the gloss is display-only (scripts/build_render_items.py:38).
CHARS_PER_TURN = 37


def _load_estimates(briefs: list[dict]) -> dict:
    """Compute dry-run estimates: LLM calls, TTS chars, ₹.

    LLM and TTS are reported separately because conflating them overstates
    what ``--live`` actually spends:

    * **LLM** — one ``draft_turns`` call per brief, and that is this script's
      entire spend. ``gate_drafts`` is pure Vidyut and costs nothing.
    * **TTS** — this script renders no audio (``--render`` is a stub); that is
      a downstream ``scripts.render_sarvam`` step. The figure is carried here
      so the cost of a *usable* scenario set is visible in one place.
    """
    n_briefs = len(briefs)
    n_turns_total = sum(b.get("n_turns", 8) for b in briefs)
    n_dual_briefs = sum(1 for b in briefs if "DU" in " ".join(b.get("target_features", [])))
    n_llm_calls = n_briefs  # one draft call each; dual routes to Gemini, still one call
    est_tts_chars = n_turns_total * CHARS_PER_TURN
    return {
        "n_briefs": n_briefs,
        "n_turns_total": n_turns_total,
        "n_dual_briefs": n_dual_briefs,
        "n_llm_calls": n_llm_calls,
        "est_tts_chars": est_tts_chars,
        "est_cost_llm_rs": round(n_llm_calls * COST_PER_LLM_CALL, 2),
        "est_cost_tts_rs": round(est_tts_chars * COST_PER_TTS_CHAR, 2),
        "est_total_rs": round(n_llm_calls * COST_PER_LLM_CALL + est_tts_chars * COST_PER_TTS_CHAR, 2),
    }


def _print_estimate(estimates: dict) -> None:
    """Print a human-readable cost estimate."""
    print("=" * 60)
    print("  BATCH AUTHORING — DRY RUN ESTIMATE")
    print("=" * 60)
    print(f"  Briefs:            {estimates['n_briefs']}")
    print(f"  Total turns:       {estimates['n_turns_total']}")
    print(f"  Dual briefs:       {estimates['n_dual_briefs']}  (routed to Gemini)")
    print("-" * 60)
    print("  THIS SCRIPT SPENDS:")
    print(f"    LLM calls:       {estimates['n_llm_calls']}  (1 draft/brief; the Vidyut gate is free)")
    print(f"    LLM cost:        ₹{estimates['est_cost_llm_rs']}")
    print("-" * 60)
    print("  DOWNSTREAM RENDER (scripts.render_sarvam — NOT run by this script):")
    print(f"    TTS chars:       ~{estimates['est_tts_chars']}  (~{CHARS_PER_TURN}/turn, estimated)")
    print(f"    TTS cost:        ~₹{estimates['est_cost_tts_rs']}  (₹30/10K chars)")
    print("-" * 60)
    print(f"  FULL COST OF A PLAYABLE SCENARIO SET: ~₹{estimates['est_total_rs']}")
    print("=" * 60)
    print("  This is a DRY RUN — no network calls, no changes.")
    print("  Pass --live to author. NOTE: --render is a stub and renders")
    print("  nothing; use scripts.render_sarvam for audio.")
    print("=" * 60)


async def _run_brief(brief: dict, render: bool = False, replace: bool = False) -> dict:
    """Author a single brief and return the result."""
    from app.services.authoring import run_authoring

    n_turns = brief.get("n_turns", 8)
    has_dual = "DU" in " ".join(brief.get("target_features", []))
    provider_override = brief.get("prefer_provider", "")

    # Run authoring
    db = SessionLocal()
    try:
        result = await run_authoring(
            brief=brief,
            n_turns=n_turns,
            with_dual=has_dual,
            dry_run=False,
            replace=replace,
            db=db,
        )
    except Exception as e:
        result = {"error": str(e), "title": brief.get("title", "?"), "slug": brief.get("slug", "?")}
    finally:
        db.close()

    if render and result.get("scenario_id") and result.get("n_nodes", 0) > 0:
        # TODO: Actually render audio — requires Bulbul client
        pass

    return result


async def _run_batch(
    briefs: list[dict],
    render: bool = False,
    limit: int = 0,
    replace: bool = False,
) -> list[dict]:
    """Run a batch of briefs sequentially (API calls, not parallel)."""
    if limit > 0:
        briefs = briefs[:limit]
    results = []
    for brief in briefs:
        logger.info("Authoring: %s (%s)", brief.get("slug", "?"), brief.get("title", "?"))
        result = await _run_brief(brief, render=render, replace=replace)
        result["slug"] = brief.get("slug", "?")
        results.append(result)

        # Write per-brief result file
        results_dir = Path(settings.db_path).parent / "results" / "authoring"
        results_dir.mkdir(parents=True, exist_ok=True)
        out_path = results_dir / f"{brief.get('slug', 'unknown')}.json"
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(result, f, default=str, indent=2)

    return results


def _print_summary(results: list[dict]) -> None:
    """Print a summary table of the batch results."""
    total = len(results)
    succeeded = sum(1 for r in results if r.get("scenario_id"))
    failed = sum(1 for r in results if r.get("error"))
    skipped = total - succeeded - failed
    n_nodes = sum(r.get("n_nodes", 0) for r in results)
    n_edges = sum(r.get("n_edges", 0) for r in results)
    n_failures = sum(r.get("n_failed", 0) for r in results)

    print()
    print("=" * 60)
    print("  BATCH AUTHORING — SUMMARY")
    print("=" * 60)
    print(f"  Total briefs:    {total}")
    print(f"  Succeeded:        {succeeded}")
    print(f"  Failed:           {failed}")
    print(f"  Skipped:          {skipped}")
    print(f"  Total nodes:      {n_nodes}")
    print(f"  Total edges:      {n_edges}")
    print(f"  Gate failures:    {n_failures}")
    print()
    for r in results:
        status = "✓" if r.get("scenario_id") else ("✗" if r.get("error") else "—")
        slug = r.get("slug", "?")
        nodes = r.get("n_nodes", 0)
        fails = r.get("n_failed", 0)
        err = r.get("error", "")
        print(f"  {status} {slug:30s} nodes={nodes:2d} fails={fails:2d} {err}")
    print("=" * 60)


async def _report() -> None:
    """Print gate statistics from existing results (no calls)."""
    results_dir = Path(settings.db_path).parent / "results" / "authoring"
    if not results_dir.exists():
        print("No results directory found. Run authoring first.")
        return

    n_total = 0
    n_passed = 0
    n_failed_gate = 0
    for path in sorted(results_dir.glob("*.json")):
        with open(path) as f:
            data = json.load(f)
        n_total += data.get("n_gated", 0)
        n_failed_gate += data.get("n_failed", 0)

    n_passed = n_total - n_failed_gate
    pass_rate = round(n_passed / n_total, 2) if n_total > 0 else 0

    print()
    print("=" * 60)
    print("  AUTHORING REPORT — Gate Statistics")
    print("=" * 60)
    print(f"  Total drafts gated:  {n_total}")
    print(f"  Passed:               {n_passed}")
    print(f"  Failed:               {n_failed_gate}")
    print(f"  Gate pass rate:       {pass_rate:.0%}")
    print("=" * 60)


def main():
    parser = argparse.ArgumentParser(description="Batch authoring runner")
    parser.add_argument("--live", action="store_true", help="Execute authoring (default: dry-run)")
    parser.add_argument("--dry-run", action="store_true", help="Explicit dry run")
    parser.add_argument("--limit", type=int, default=0, help="Max briefs to process")
    parser.add_argument("--slug", type=str, default="", help="Single brief slug to run")
    parser.add_argument("--render", action="store_true", help="Also pre-render audio")
    parser.add_argument("--replace", action="store_true", help="Replace existing scenarios")
    parser.add_argument("--report", action="store_true", help="Print gate statistics (no calls)")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")

    # Resolve which briefs to process
    if args.slug:
        briefs = [b for b in SCENARIO_BRIEFS if b.get("slug") == args.slug]
        if not briefs:
            print(f"Error: no brief with slug '{args.slug}'")
            sys.exit(1)
    else:
        briefs = list(SCENARIO_BRIEFS)

    if args.limit > 0:
        briefs = briefs[:args.limit]

    # Report mode
    if args.report:
        asyncio.run(_report())
        return

    # Check live mode
    is_live = args.live and not args.dry_run

    if not is_live:
        estimates = _load_estimates(briefs)
        _print_estimate(estimates)
        return

    # Live mode
    if not settings.sarvam_api_key:
        print("Error: SARVAM_API_KEY is not set. Refusing to run --live.")
        sys.exit(1)

    init_db()
    results = asyncio.run(_run_batch(
        briefs, render=args.render, limit=args.limit, replace=args.replace
    ))
    _print_summary(results)

    return results


if __name__ == "__main__":
    main()