"""Baseline: pure rule analyzer against all seed challenges. Diagnostic only."""
import os, sys
os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.grading.analyzer import RuleBasedAnalyzer, feature_set_from_results
from app.seeds.challenges import SEED_CHALLENGES

ra = RuleBasedAnalyzer()
ok = fail = 0
fails = []
for ch in SEED_CHALLENGES:
    results = ra.analyze(ch["target_sanskrit"], is_iast=False)
    got = feature_set_from_results(results)
    expected = [set(p.values()) for p in ch["accepted_parses"]]
    got_feats = set(got.values())
    matched = any(got_feats == e for e in expected)
    if matched:
        ok += 1
    else:
        fail += 1
        fails.append((ch["target_sanskrit"], sorted(got_feats), [sorted(e) for e in expected]))

print(f"RULE PATH: {ok}/{ok+fail}")
for f in fails:
    print("FAIL", f[0], "got:", f[1], "expected:", f[2])
