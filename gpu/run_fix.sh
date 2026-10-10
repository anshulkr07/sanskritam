#!/usr/bin/env bash
# Re-render the cer-flagged parts of chosen verses with fresh seeds, check them,
# assemble just those verses and archive them: run_fix.sh NAME SEEDS
#   NAME   as given to prepare_fix.py (which must have been run)
#   SEEDS  comma-separated seeds not used before, e.g. 65,66,67,68
# The assembler picks, per part, the lowest-CER take without flags, else the
# lowest CER, among ALL takes (old and new), so a fresh seed can only improve a part.
# Output: ~/gpu_out_NAME (manifest.jsonl, audio/, mapping.json ...) and
# gdrive:sanskritam-chant/runs/NAME. Logs: ~/gpu/fix-NAME-*.log.
set -euo pipefail
NAME="${1:?usage: run_fix.sh NAME SEEDS}"
SEEDS="${2:?usage: run_fix.sh NAME SEEDS}"
cd "$(dirname "$0")"
JOBS="$HOME/gpu_jobs/chant_jobs_$NAME.jsonl"
OUT="$HOME/gpu_out_$NAME"
MODEL="$HOME/gpu/models/sushrota_sanskrit_asr_v13b.nemo"
echo "== 1/4 render fresh seeds $SEEDS $(date -u +%FT%TZ)" | tee -a "fix-$NAME.log"
./venv-tts/bin/python tts/render_jobs.py --jobs "$JOBS" --out "$OUT" --reseed "$OUT/qc.jsonl" \
  --reseed-flags cer --reseed-seeds "$SEEDS" >> "fix-$NAME-render.log" 2>&1
echo "== 2/4 qc the new takes" | tee -a "fix-$NAME.log"
./venv-asr/bin/python asr/qc_renders.py --renders "$OUT/renders.jsonl" --jobs "$JOBS" \
  --out "$OUT/qc.jsonl" --model "$MODEL" >> "fix-$NAME-qc.log" 2>&1
echo "== 3/4 assemble" | tee -a "fix-$NAME.log"
./venv-asr/bin/python assemble.py --jobs "$JOBS" --renders "$OUT/renders.jsonl" --qc "$OUT/qc.jsonl" \
  --out "$OUT" >> "fix-$NAME-assemble.log" 2>&1
echo "== 4/4 archive" | tee -a "fix-$NAME.log"
bash archive.sh "$OUT" "gdrive:sanskritam-chant/runs/$NAME" >> "fix-$NAME-archive.log" 2>&1
echo "DONE $(date -u +%FT%TZ)" | tee -a "fix-$NAME.log"
