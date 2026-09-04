"""Batch challenge generation (P7-4) — feature bands into validated challenges.

Reuses the P7-4 service (draft -> Vidyut gate -> persist). ``--limit`` controls
how many (band, register) groups are processed, each producing ``--per-group``
challenges (default 50). ``accepted_parses`` are always derived by analyzing
the target — never hand-written.

Usage:
    python -m scripts.challenge_batch --dry-run              # DEFAULT. Costs nothing.
    python -m scripts.challenge_batch --dry-run --limit 2 --per-group 5
    python -m scripts.challenge_batch --live --limit 1 --per-group 5   # 1 band×register
    python -m scripts.challenge_batch --live --limit 10 --per-group 50  # the ~500 target
"""

import argparse
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# Windows cp1252 consoles cannot encode some chars; force UTF-8 on stdout.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from app.config import settings
from app.seeds.briefs import FEATURE_BANDS
from app.services.challenge_authoring import author_challenge_batch

logger = logging.getLogger("shabd.challenge_batch")

COST_PER_LLM_CALL = 0.0055


def build_groups(limit: int = 0):
    groups = []
    for band in FEATURE_BANDS:
        for register in ("laukika", "classical"):
            groups.append((band["name"], band["features"], register))
    if limit > 0:
        groups = groups[:limit]
    return groups


def main():
    parser = argparse.ArgumentParser(description="Batch challenge generation (P7-4)")
    parser.add_argument("--live", action="store_true", help="Execute generation (default: dry-run)")
    parser.add_argument("--dry-run", action="store_true", help="Explicit dry run")
    parser.add_argument("--limit", type=int, default=0, help="Max (band, register) groups to process")
    parser.add_argument("--per-group", type=int, default=50, help="Challenges per group (default 50)")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")

    groups = build_groups(args.limit)
    is_live = args.live and not args.dry_run
    per_group = max(1, args.per_group)
    total = len(groups) * per_group

    if not is_live:
        print("=" * 60)
        print("  CHALLENGE BATCH — DRY RUN ESTIMATE")
        print("=" * 60)
        print(f"  Groups (band x register): {len(groups)}")
        print(f"  Challenges per group:     {per_group}")
        print(f"  Target challenges:        {total}")
        print(f"  Estimated LLM calls:      {total}")
        print(f"  Estimated cost:           ₹{round(total * COST_PER_LLM_CALL, 2)}")
        print("=" * 60)
        print("  This is a DRY RUN — no network calls, no changes.")
        print("  Pass --live to execute.")
        print("=" * 60)
        return

    if not settings.sarvam_api_key:
        print("Error: SARVAM_API_KEY is not set. Refusing to run --live.")
        sys.exit(1)

    print(f"Generating {per_group} challenges x {len(groups)} groups = ~{total} targets (live)\n")
    total_inserted = 0
    total_drafted = 0
    total_passed = 0
    total_failed = 0
    for idx, (band_name, features, register) in enumerate(groups, 1):
        res = author_challenge_batch(features, register, per_group, dry_run=False)
        total_drafted += res["n_gated"]
        total_passed += res["n_passed"]
        total_failed += res["n_failed"]
        total_inserted += res["n_inserted"]
        pass_rate = round(res["n_passed"] / max(1, res["n_gated"]) * 100)
        print(f"  [{idx}/{len(groups)}] band={band_name} register={register:9s} "
              f"target={per_group:3d} gated={res['n_gated']:3d} "
              f"passed={res['n_passed']:3d} ({pass_rate}%) inserted={res['n_inserted']}")

    print("\n" + "=" * 60)
    print("  BATCH CHALLENGE — SUMMARY")
    print("=" * 60)
    print(f"  Groups:            {len(groups)}")
    print(f"  Gated:             {total_drafted}")
    print(f"  Passed:            {total_passed}")
    print(f"  Inserted:          {total_inserted}")
    print(f"  Failed (backlog):  {total_failed}")
    rate = round(total_passed / max(1, total_drafted) * 100)
    print(f"  Overall pass rate: {rate}%")
    print("=" * 60)


if __name__ == "__main__":
    main()