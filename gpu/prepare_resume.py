"""One-off, 2026-10-10: get the stopped full run ready to finish (venv-asr python).

The run was stopped in step 3 (reseed). Before it is finished:

1. chant_jobs_live.jsonl = chant_jobs.jsonl without the 193 Mahabharata 5.33/5.34
   verses of the wiki-sourced text (the database now holds the BORI-numbered
   text; those 193 will not import, so nothing more is spent on them).
2. qc.jsonl rows for the parts of split lines are dropped (the original is kept
   as qc.jsonl.before-qcfix), so step 2 judges them again with the corrected
   length rule: all 276 of them had been flagged "short" wrongly.
3. The two half-started delta folders are removed (only a few renders from a
   run that was stopped; a wav cut off mid-write would be taken for finished).

Safe to run twice: it does nothing once qc.jsonl.before-qcfix exists.
"""

import json
import re
import shutil
import sys
from pathlib import Path

home = Path.home()
full = home / "gpu_jobs" / "chant_jobs.jsonl"
live = home / "gpu_jobs" / "chant_jobs_live.jsonl"
out = home / "gpu_out"
qc = out / "qc.jsonl"
backup = out / "qc.jsonl.before-qcfix"

if backup.exists():
    print("already prepared:", backup)
    sys.exit(0)

jobs = [json.loads(l) for l in full.read_text(encoding="utf-8").splitlines() if l.strip()]


def dead(j):
    return j["book"] == "Mahābhārata" and re.search(r"5\.3[34]\.", j["source_ref"]) is not None


keep = [j for j in jobs if not dead(j)]
live.write_text("".join(json.dumps(j, ensure_ascii=False) + "\n" for j in keep), encoding="utf-8")
print(f"live jobs: {len(keep)} verses ({len(jobs) - len(keep)} dropped) -> {live}")

split = {(j["verse_uid"], ln["i"]) for j in jobs for ln in j["lines"] if len(ln.get("parts", [])) > 1}
rows = [l for l in qc.read_text(encoding="utf-8").splitlines() if l.strip()]
kept = [l for l in rows if (json.loads(l)["verse_uid"], json.loads(l)["line_i"]) not in split]
shutil.copy2(qc, backup)
tmp = qc.with_suffix(".jsonl.new")
tmp.write_text("".join(l + "\n" for l in kept), encoding="utf-8")
tmp.replace(qc)
print(f"qc.jsonl: {len(rows)} rows -> {len(kept)} (dropped {len(rows) - len(kept)} rows of split lines; original in {backup.name})")

for d in ("gpu_out_mbh", "gpu_out_paged"):
    p = home / d
    if p.exists():
        n = sum(1 for _ in (p / "renders.jsonl").open()) if (p / "renders.jsonl").exists() else 0
        shutil.rmtree(p)
        print(f"removed half-started {d} ({n} renders)")
