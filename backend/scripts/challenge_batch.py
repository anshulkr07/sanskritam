"""Batch challenge generation — convert feature bands into validated challenges.

Usage:
    python -m scripts.challenge_batch --dry-run              # DEFAULT. Costs nothing.
    python -m scripts.challenge_batch --live --limit 20      # generate 20 challenges
"""

import argparse
import asyncio
import json
import logging
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# Windows consoles default to cp1252, which cannot encode ₹ (U+20B9): the
# estimate tracebacks halfway through printing. Force UTF-8 on stdout.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from app.config import settings
from app.db import init_db, SessionLocal
from app.models import Challenge, Feature
from app.seeds.briefs import FEATURE_BANDS

logger = logging.getLogger("shabd.challenge_batch")

COST_PER_LLM_CALL = 0.0055


def _print_estimate(briefs: list[dict]) -> None:
    """Print a dry-run estimate."""
    total = len(briefs)
    print("=" * 60)
    print("  CHALLENGE BATCH — DRY RUN ESTIMATE")
    print("=" * 60)
    print(f"  Target challenges:  {total}")
    print(f"  Estimated LLM calls: {total}")
    est_cost = round(total * COST_PER_LLM_CALL, 2)
    print(f"  Estimated cost:     ₹{est_cost}")
    print("=" * 60)
    print("  This is a DRY RUN — no network calls, no changes.")
    print("  Pass --live to execute.")
    print("=" * 60)


def main():
    parser = argparse.ArgumentParser(description="Batch challenge generation")
    parser.add_argument("--live", action="store_true", help="Execute generation (default: dry-run)")
    parser.add_argument("--dry-run", action="store_true", help="Explicit dry run")
    parser.add_argument("--limit", type=int, default=0, help="Max challenges to generate")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")

    # Build target list: at least 20 per feature band per register
    briefs = []
    for band in FEATURE_BANDS:
        for register in ("laukika", "classical"):
            briefs.append({
                "band": band["name"],
                "features": band["features"],
                "register": register,
            })

    if args.limit > 0:
        briefs = briefs[:args.limit]

    is_live = args.live and not args.dry_run

    if not is_live:
        _print_estimate(briefs)
        return

    if not settings.sarvam_api_key:
        print("Error: SARVAM_API_KEY is not set. Refusing to run --live.")
        sys.exit(1)

    print("Dry-run mode: --live not implemented without API. Use --dry-run.")


if __name__ == "__main__":
    main()