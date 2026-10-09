#!/usr/bin/env bash
# Full chant render (handover_recite 14 step 5) + recurring-run workflow.
# Resumable at every stage: re-running skips finished work.
# Logs: full-*.log in this directory. Run in background:
#   nohup bash ~/gpu/run_full.sh > full-runner.log 2>&1 &
# Override inputs: JOBS=... OUT=... bash run_full.sh
set -euo pipefail
cd "$(dirname "$0")"
JOBS="${JOBS:-$HOME/gpu_jobs/chant_jobs.jsonl}"
OUT="${OUT:-$HOME/gpu_out}"
MODEL="$HOME/gpu/models/sushrota_sanskrit_asr_v13b.nemo"

echo "== 1/5 render (first takes)" | tee -a full-run.log
./venv-tts/bin/python tts/render_jobs.py --jobs "$JOBS" --out "$OUT" >> full-render1.log 2>&1
echo "== 2/5 qc" | tee -a full-run.log
./venv-asr/bin/python asr/qc_renders.py --renders "$OUT/renders.jsonl" --jobs "$JOBS" --out "$OUT/qc.jsonl" --model "$MODEL" >> full-qc1.log 2>&1
echo "== 3/5 reseed flagged" | tee -a full-run.log
./venv-tts/bin/python tts/render_jobs.py --jobs "$JOBS" --out "$OUT" --reseed "$OUT/qc.jsonl" >> full-render2.log 2>&1
echo "== 4/5 qc new takes" | tee -a full-run.log
./venv-asr/bin/python asr/qc_renders.py --renders "$OUT/renders.jsonl" --jobs "$JOBS" --out "$OUT/qc.jsonl" --model "$MODEL" >> full-qc2.log 2>&1
echo "== 5/5 assemble" | tee -a full-run.log
./venv-asr/bin/python assemble.py --jobs "$JOBS" --renders "$OUT/renders.jsonl" --qc "$OUT/qc.jsonl" --out "$OUT" >> full-assemble.log 2>&1
echo "DONE $(date -u +%FT%TZ)" | tee -a full-run.log
