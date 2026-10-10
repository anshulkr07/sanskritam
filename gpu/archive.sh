#!/usr/bin/env bash
# Keep a finished run safe and mapped: archive.sh OUT DEST
#   OUT   the run's output folder (manifest.jsonl, audio/, qc.jsonl ...)
#   DEST  an rclone destination, e.g. gdrive:sanskritam-chant/main
#
# 1. make_mapping.py checks the run is whole and writes OUT/mapping.json
#    (verse_uid -> file -> the storage key chant_import will use);
# 2. rclone copies what is worth keeping: manifest, mapping, review page,
#    qc.jsonl, renders.jsonl and audio/*.m4a (not renders/*.wav: 700 MB, and
#    reproducible from the jobs file);
# 3. rclone check proves the copy.
# The include patterns start with / so they match only OUT's own top level (the
# dashboard's dash/audio previews are not part of a run).
# Stops at the first failure; nothing in OUT is changed except mapping.json.
set -euo pipefail
OUT="${1:?usage: archive.sh OUT DEST}"
DEST="${2:?usage: archive.sh OUT DEST}"
cd "$(dirname "$0")"
./venv-asr/bin/python make_mapping.py "$OUT"
rclone copy "$OUT" "$DEST" --checksum --transfers 4 \
  --include "/manifest.jsonl" --include "/mapping.json" --include "/review.html" \
  --include "/qc.jsonl" --include "/renders.jsonl" --include "/audio/*.m4a"
rclone check "$OUT" "$DEST" --one-way \
  --include "/manifest.jsonl" --include "/mapping.json" --include "/review.html" \
  --include "/qc.jsonl" --include "/renders.jsonl" --include "/audio/*.m4a"
echo "archived $OUT -> $DEST at $(date -u +%FT%TZ)"
