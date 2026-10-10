"""Set up a re-render of chosen verses with fresh seeds (venv-asr python, on the box).

Usage:  python prepare_fix.py VERSES.json NAME

VERSES.json is [{"uid": ..., "run": "main"|"mbh_bori"|"paged"}, ...]. This writes

    ~/gpu_jobs/chant_jobs_NAME.jsonl     the jobs of just those verses
    ~/gpu_out_NAME/renders.jsonl         every take already rendered for them
    ~/gpu_out_NAME/qc.jsonl              and every QC row of those takes

so the reseed plan knows which seeds were tried and what was flagged, and the
assembler, run on this folder, sees all the takes (the old ones are referenced
by their original paths). Nothing in the original runs is changed. Run
run_fix.sh NAME next.
"""

import json
import sys
from pathlib import Path

home = Path.home()
RUNS = {
    "main": (home / "gpu_out", home / "gpu_jobs" / "chant_jobs_live.jsonl"),
    "mbh_bori": (home / "gpu_out_mbh", home / "gpu_jobs" / "chant_jobs_mbh_bori.jsonl"),
    "paged": (home / "gpu_out_paged", home / "gpu_jobs" / "chant_jobs_paged.jsonl"),
    # an earlier fix run: verses that still need another try
    "fix1": (home / "gpu_out_fix1", home / "gpu_jobs" / "chant_jobs_fix1.jsonl"),
}
verses = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
name = sys.argv[2]
out = home / f"gpu_out_{name}"
out.mkdir(exist_ok=True)
if (out / "renders.jsonl").exists():
    sys.exit(f"{out} already prepared; remove it to start over")

wanted: dict[str, set[str]] = {}
for v in verses:
    wanted.setdefault(v["run"], set()).add(v["uid"])

jobs_out, renders_out, qc_out = [], [], []
for run, uids in wanted.items():
    root, jobs_path = RUNS[run]
    for line in jobs_path.read_text(encoding="utf-8").splitlines():
        if line.strip() and json.loads(line)["verse_uid"] in uids:
            jobs_out.append(line)
    for line in (root / "renders.jsonl").read_text(encoding="utf-8").splitlines():
        if line.strip() and json.loads(line)["verse_uid"] in uids:
            renders_out.append(line)
    for line in (root / "qc.jsonl").read_text(encoding="utf-8").splitlines():
        if line.strip() and json.loads(line)["verse_uid"] in uids:
            qc_out.append(line)

(home / "gpu_jobs" / f"chant_jobs_{name}.jsonl").write_text("".join(l + "\n" for l in jobs_out), encoding="utf-8")
(out / "renders.jsonl").write_text("".join(l + "\n" for l in renders_out), encoding="utf-8")
(out / "qc.jsonl").write_text("".join(l + "\n" for l in qc_out), encoding="utf-8")
print(f"{name}: {len(jobs_out)} verses (of {len(verses)} asked), {len(renders_out)} existing takes, {len(qc_out)} QC rows -> {out}")
if len(jobs_out) != len(verses):
    sys.exit("some verses were not found in their run's jobs file")
