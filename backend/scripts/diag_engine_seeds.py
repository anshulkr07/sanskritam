"""Baseline 2: full engine (with variants) against all seed challenges."""
import os, sys
os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.grading.engine import grade_attempt
from app.seeds.challenges import SEED_CHALLENGES

ok = fail = 0
fails = []
for ch in SEED_CHALLENGES:
    r = grade_attempt(
        ch["target_sanskrit"].rstrip("।."),
        ch["accepted_parses"],
        ch["features"],
    )
    if r["verdict"] == "correct" and not r["abstained"]:
        ok += 1
    else:
        fail += 1
        fails.append((ch["target_sanskrit"], r["verdict"], r["abstained"],
                      sorted(set(r["parsed_features"].values()))))

print(f"ENGINE (targets vs own accepted_parses): {ok}/{ok+fail}")
for f in fails:
    print("FAIL", f[0], "->", f[1], "abstained:", f[2], "parsed:", f[3])
