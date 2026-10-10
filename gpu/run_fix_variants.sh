#!/usr/bin/env bash
# Like run_fix.sh, for verses that keep failing the same way: several render
# variants, then one check, one assembly, one archive: run_fix_variants.sh NAME
# Reads ~/gpu_out_NAME/variants.txt, one variant per line:
#     JOBS_FILE  METER|-  SEEDS
# e.g.  ~/gpu_jobs/chant_jobs_fix2_a.jsonl anushtubh 73,74,75,76
# METER "-" keeps the detected metre. A forced metre is a different pace and
# prosody reference (the verse stays marked unknown_meter). Seeds must differ
# between variants of the same part (a take's file is named by seed).
# The assembler keeps the lowest-CER clean take among all takes, old and new.
set -euo pipefail
NAME="${1:?usage: run_fix_variants.sh NAME}"
cd "$(dirname "$0")"
OUT="$HOME/gpu_out_$NAME"
JOBS="$HOME/gpu_jobs/chant_jobs_$NAME.jsonl"
MODEL="$HOME/gpu/models/sushrota_sanskrit_asr_v13b.nemo"
while read -r jobs meter seeds; do
  [ -z "${jobs:-}" ] && continue
  jobs="${jobs/#\~/$HOME}"
  extra=()
  [ "$meter" != "-" ] && extra=(--force-meter "$meter")
  echo "== render $(basename "$jobs") metre=$meter seeds=$seeds $(date -u +%FT%TZ)" | tee -a "fix-$NAME.log"
  ./venv-tts/bin/python tts/render_jobs.py --jobs "$jobs" --out "$OUT" --reseed "$OUT/qc.jsonl" \
    --reseed-flags cer --reseed-seeds "$seeds" "${extra[@]}" >> "fix-$NAME-render.log" 2>&1
done < "$OUT/variants.txt"
echo "== qc the new takes" | tee -a "fix-$NAME.log"
./venv-asr/bin/python asr/qc_renders.py --renders "$OUT/renders.jsonl" --jobs "$JOBS" \
  --out "$OUT/qc.jsonl" --model "$MODEL" >> "fix-$NAME-qc.log" 2>&1
echo "== assemble" | tee -a "fix-$NAME.log"
./venv-asr/bin/python assemble.py --jobs "$JOBS" --renders "$OUT/renders.jsonl" --qc "$OUT/qc.jsonl" \
  --out "$OUT" >> "fix-$NAME-assemble.log" 2>&1
echo "== archive" | tee -a "fix-$NAME.log"
bash archive.sh "$OUT" "gdrive:sanskritam-chant/runs/$NAME" >> "fix-$NAME-archive.log" 2>&1
echo "DONE $(date -u +%FT%TZ)" | tee -a "fix-$NAME.log"
