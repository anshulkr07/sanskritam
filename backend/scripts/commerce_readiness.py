"""Read-only readiness/economics report. Does not call providers or modify databases."""
import argparse
import json
import math
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.commerce.catalogue import PRODUCTS, ACTION_RATES, TITLE_PRICES, REGIONAL_MEMBERSHIPS


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--usage-database", type=Path, help="Explicit local SQLite file, opened mode=ro; no env database is used")
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    report = {"generated_at": datetime.now(timezone.utc).isoformat(), "live_sales_ready": False,
              "products": PRODUCTS, "regional_memberships": REGIONAL_MEMBERSHIPS, "title_prices": TITLE_PRICES,
              "ai_starting_rates": ACTION_RATES, "target_max_provider_inr_per_credit": .1,
              "measured_live_action_bounds": None,
              "blockers": ["Store products, payment agreements and identity credentials must be configured",
                           "Apple/Google sandbox and physical-device purchases must pass",
                           "AI cost evidence must establish a bounded worst case for each action",
                           "Private media origin configuration and preview clipping must pass",
                           "AdMob consent/SSV and country reward routes must be configured before activation"]}
    # Conservative cost illustration, not a measured or verified action bound.
    voice_example = 3 * (30 / 60) + 1000 * (30 / 10000) + 8 * .1
    report["illustrative_voice_bound"] = {"inr_per_minute": voice_example,
        "credits_per_minute_at_target": math.ceil(math.ceil(voice_example / .1) / 4) * 4,
        "assumptions": "3 STT passes, 1000 synthesized characters/minute, 8 LLM calls at ₹0.10; excludes additional providers",
        "verified": False}
    report["redemption_sensitivity"] = [
        {"product": key, "credits": p["credits"], "illustrative_net_inr_at_70_percent": round(p["inr"] * .7, 2),
         "max_provider_cost_inr_at_target": round(p["credits"] * .1, 2),
         "contribution_before_fixed_costs_and_referrals": round(p["inr"] * .7 - p["credits"] * .1, 2)}
        for key, p in PRODUCTS.items() if p["credits"]]
    if args.usage_database:
        uri = args.usage_database.resolve().as_uri() + "?mode=ro"
        with sqlite3.connect(uri, uri=True) as db:
            report["observed_usage"] = [dict(zip(["surface", "kind", "events", "units"], r)) for r in
                db.execute("SELECT surface, kind, count(*), sum(amount) FROM usage_events GROUP BY surface, kind")]
            report["observation_limit"] = "Aggregate historical vendor units, not per-action worst-case evidence; no user content or identifiers exported."
    text = json.dumps(report, ensure_ascii=False, indent=2)
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(text + "\n", encoding="utf-8")
        print(args.output)
    else:
        print(text)


if __name__ == "__main__":
    main()
