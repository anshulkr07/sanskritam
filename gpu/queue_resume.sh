#!/usr/bin/env bash
# Finish the chant renders, one run after another, each archived to Drive when
# it is done (run_full.sh step 6):
#   main      the stopped full run, live verses only (steps 1-5 finish it)
#   mbh_bori  the 187 BORI-numbered Mahabharata verses
#   paged     the 811 verses of the eight paged books built so far
# Run prepare_resume.py first (it is idempotent). Started 2026-10-10.
# Stop it by PID (a pkill pattern can match its own shell); progress: queue-resume.log.
cd "$(dirname "$0")"
LOG=queue-resume.log
step() { echo "== $* $(date -u +%FT%TZ)" >> "$LOG"; }
run() {
  step "$1 start"
  if JOBS="$2" OUT="$3" ARCHIVE_TO="gdrive:sanskritam-chant/runs/$1" bash run_full.sh >> "queue-$1.log" 2>&1; then
    step "$1 done"
  else
    step "$1 FAILED"
  fi
}
run main     "$HOME/gpu_jobs/chant_jobs_live.jsonl"      "$HOME/gpu_out"
run mbh_bori "$HOME/gpu_jobs/chant_jobs_mbh_bori.jsonl"  "$HOME/gpu_out_mbh"
run paged    "$HOME/gpu_jobs/chant_jobs_paged.jsonl"     "$HOME/gpu_out_paged"
step "queue finished"
