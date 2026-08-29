"""Negative tests: wrong answers must stay wrong. Guards the variant logic."""
import os, sys
os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.grading.engine import grade_attempt
from app.seeds.challenges import SEED_CHALLENGES

# (target substring, wrong attempt, expected verdict)
CASES = [
    ("रामः फलम् खादति", "रामम् फलम् खादति", "off_by_one"),   # wrong case on subject
    ("रामः फलम् खादति", "रामः फलम् पिबति", "incorrect"),     # wrong verb entirely
    ("बालः ग्रामम् गच्छति", "बालः ग्रामे गच्छति", "off_by_one"),  # ACC -> LOC
    ("बालः ग्रामम् गच्छति", "बालः ग्रामम् गच्छामि", "off_by_one"),  # wrong person
    ("सीता जलम् पिबति", "सीता जलम्", "off_by_one"),          # missing verb = one feature off (§6.1)
    ("बालः ग्रामम् गच्छति", "asdfgh", "incorrect"),          # garbage
]

by_key = {}
for ch in SEED_CHALLENGES:
    by_key[ch["target_sanskrit"].rstrip("।.")] = ch

ok = fail = 0
for target, attempt, want in CASES:
    ch = by_key.get(target)
    if ch is None:
        print("SKIP (no seed):", target)
        continue
    r = grade_attempt(attempt, ch["accepted_parses"], ch["features"])
    got = r["verdict"]
    status = "OK " if got == want else "BAD"
    if got == want:
        ok += 1
    else:
        fail += 1
    print(f"{status} {attempt!r:40} want={want:10} got={got:10} abstained={r['abstained']} diag={r['diagnosis'][:60]}")

print(f"NEGATIVE: {ok}/{ok+fail} as expected")
