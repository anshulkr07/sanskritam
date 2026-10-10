# GPU folder: chant rendering (Vagdhenu) + scoring (Su-srota)

Runbook copy of handover_recite.md section 14, kept current.

## 1. Machine
GB10 already rented (`ssh spark`). 235 GB free, needs about 30 GB.
GPU shared with ComfyUI. Run Phase 0 alongside it. Start full render when
ComfyUI batch is done. Never pip install into system Python. Never stop ComfyUI.

## 2. Copy
Copy repo `gpu/` and `chant_jobs.jsonl` (from `python -m scripts.chant_export`)
to the machine. Never copy `.env` or keys.

```
cd backend && PYTHONUTF8=1 python -m scripts.chant_export --out ../gpu_jobs/chant_jobs.jsonl
python -m scripts.chant_export --out ../gpu_jobs/chant_jobs_sample.jsonl --sample 20
scp -r gpu chant_jobs.jsonl spark:~/
```

## 3. Setup
`bash gpu/setup_vast.sh` (20 to 40 min, not verified).

## 4. Phase 0
```
python gpu/phase0.py --jobs chant_jobs_sample.jsonl --out gpu_out
```
Needs renders first for the sample:
```
venv-tts/bin/python gpu/tts/render_jobs.py --jobs chant_jobs_sample.jsonl --out gpu_out
venv-asr/bin/python gpu/asr/qc_renders.py --renders gpu_out/renders.jsonl --jobs chant_jobs_sample.jsonl --out gpu_out/qc.jsonl
```
Send `gpu_out/phase0.json` back. Listen in `gpu_out/review.html`
(`cd gpu_out && python -m http.server`).

## 5. Render everything (tmux)
```
venv-tts/bin/python gpu/tts/render_jobs.py --jobs chant_jobs.jsonl --out gpu_out
venv-asr/bin/python gpu/asr/qc_renders.py --renders gpu_out/renders.jsonl --jobs chant_jobs.jsonl --out gpu_out/qc.jsonl
venv-tts/bin/python gpu/tts/render_jobs.py --jobs chant_jobs.jsonl --out gpu_out --reseed gpu_out/qc.jsonl
venv-asr/bin/python gpu/asr/qc_renders.py --renders gpu_out/renders.jsonl --jobs chant_jobs.jsonl --out gpu_out/qc.jsonl
venv-asr/bin/python gpu/assemble.py --jobs chant_jobs.jsonl --renders gpu_out/renders.jsonl --qc gpu_out/qc.jsonl --out gpu_out
```
Estimate: 3.5 to 4.5 h chant, 4.5 to 5.5 GPU-h for one take, plus reseeds.

## 6. Review and import: see handover section 14 step 6.

## Recurring runs (new/changed verses later)

Same flow, incremental. Every machine stage is resumable. Two options narrow
the export to what a run has not seen:

- `--skip-served` leaves out verses that already have an `approved`/`auto_ok`
  chant in the database.
- `--exclude-jobs FILE[,FILE]` leaves out verses already in an earlier jobs
  file. Use it when a render run is in flight or not yet imported, for verses
  whose text changed after the export (the 2026-10-09 Mahabharata re-numbering
  left 193 dead jobs and 187 new verses) and for books added since.

**Give every run its own `OUT`.** `assemble.py` rewrites `manifest.jsonl` and
`review.html` in the folder it is given, so a second run into the same folder
would replace the first run's manifest.

```
# On your PC:
cd backend
python -m scripts.chant_export --out ../gpu_jobs/chant_new.jsonl --exclude-jobs ../gpu_jobs/chant_jobs.jsonl
scp ../gpu_jobs/chant_new.jsonl spark:~/gpu_jobs/
# On the machine (same script, its own jobs file and its own output folder):
JOBS=~/gpu_jobs/chant_new.jsonl OUT=~/gpu_out_new nohup bash ~/gpu/run_full.sh > full-runner.log 2>&1 &
# Back on your PC: review, then import (uploads to the configured store).
scp -r spark:~/gpu_out_new ./gpu_out_new   # or copy just manifest+audio+review.html
cd gpu_out_new && python -m http.server  # review.html, Download decisions
cd backend && python -m scripts.chant_import --manifest ../gpu_out_new/manifest.jsonl --audio ../gpu_out_new/audio --decisions ../gpu_out_new/decisions.json
python -m scripts.chant_import --manifest ../gpu_out_new/manifest.jsonl --audio ../gpu_out_new/audio --decisions ../gpu_out_new/decisions.json --live
```

A verse's chant is found by its `verse_uid`, a hash of its reference and text.
If a verse's text is edited after it was exported, its chant stops matching
(the import skips it as unknown); export it again.

## Keeping a run, and what a run needs (2026-10-10)

**Step 6, archive.** Set `ARCHIVE_TO=gdrive:sanskritam-chant/runs/<name>` and
`run_full.sh` ends by running `archive.sh`: `make_mapping.py` checks the run is
whole (every manifest row has a non-empty audio file, no file on two verses, no
verse twice, every line inside its audio) and writes `mapping.json`; `rclone`
copies the manifest, mapping, `review.html`, `qc.jsonl`, `renders.jsonl` and
`audio/*.m4a` (not the 700 MB of `renders/*.wav`, which the jobs file
reproduces), then `rclone check` proves the copy. A run that is not whole is
not archived and the step fails loudly.

`mapping.json` maps every verse: `verse_uid` -> `source_ref`, `file`, the
storage `key` (`chant/<voice>/<file>`, the one `chant_import` uses), `bytes`,
`duration_ms`, `qc_status`, `qc_reasons`.

**What earns a new seed.** `RESEED_FLAGS` (default `cer,repeats`). A new seed
changes what the model says, not how long it takes or where it pauses; measured
on 80 reseeded parts, 32 of 49 `cer` parts came out clean and 0 of 31 `pause` or
length-flagged ones. Set it empty to reseed on any flag.

**The length check.** `qc_rules.py`: a part is judged against its share of the
line (a long line is rendered in parts). Before this, all 276 parts of the 138
split lines of the first full run were flagged `short` and every verse holding
one would have gone to you as `needs_listen`.

**Finishing the stopped run.** `prepare_resume.py` (idempotent), then
`queue_resume.sh`: the stopped full run on live verses only, then the 187
BORI-numbered Mahabharata verses, then the 811 verses of the paged books. Each
run has its own `OUT` and its own Drive folder (`runs/main`, `runs/mbh_bori`,
`runs/paged`). Progress: `~/gpu/queue-resume.log`. Stop it by PID, not
`pkill -f` (the pattern can match its own shell).

**To R2 (or GCS) once credentials are set** (`AUDIO_STORAGE=r2` and `R2_*` in
the environment, as in production):

```
# files only, under the keys the import will use; no database rows:
python -m scripts.chant_import --manifest M --audio A --live --upload-only
# after you have listened (decisions.json from review.html), the rows:
python -m scripts.chant_import --manifest M --audio A --decisions D --live
```

The second command finds the files already stored and only records the rows
(verse_uid -> url, line times, status).

**Re-rendering chosen verses (`prepare_fix.py`, `run_fix.sh`).** For verses that
need another try (2026-10-10: 20 verses whose speech check still differed after
the usual three reseeds): `python prepare_fix.py VERSES.json NAME` gathers their
jobs, takes and QC rows into `~/gpu_out_NAME`; `bash run_fix.sh NAME 65,66,67,68`
renders fresh seeds for the `cer`-flagged parts, checks them, assembles only
those verses and archives them to `runs/NAME`. The assembler keeps the best
take among all of them, so a fresh seed can only improve a part. A fix run
holds the *newer* audio for verses that are also in an earlier run: **import it
last** (`chant_import` upserts by verse and voice, so the later import wins), with
its own `decisions.json`.

**One final set (`backend/scripts/chant_merge.py`).** Several runs can hold the
same verse (a fix run has the newer audio). Merge them, oldest first, into one
folder with one manifest, one decisions file and only the audio that is used:

```
cd backend
python -m scripts.chant_merge --out ../chant_runs/final   "main=../chant_runs/main|../chant_runs/decisions.json"   "mbh_bori=../chant_runs/mbh_bori|../chant_runs/decisions.json"   "paged=../chant_runs/paged|../chant_runs/decisions.json"   "fix1=../chant_runs/fix1|../chant_runs/fix1_decisions.json"   "fix2=../chant_runs/fix2|../chant_runs/fix2_decisions.json"
python -m scripts.chant_import --manifest ../chant_runs/final/manifest.jsonl --audio ../chant_runs/final/audio   --decisions ../chant_runs/final/decisions.json --live --match-relabelled          # rows (after the deploy)
python -m scripts.chant_import --manifest ... --audio ... --live --upload-only --match-relabelled   # files only
```

A decision belongs to the audio it was made on: an approval of an old take is not
carried over to a re-rendered one. The merge refuses a missing audio file or one
file on two verses, and writes `mapping.json` after the same checks as `archive.sh`.

**A verse whose reference changed after the export.** The `verse_uid` hashes the
reference and the text, so when a seed correction renames a verse (Ramayana
1.2.14 became 1.2.15 on 2026-10-09; the app applies it at start-up) its audio no
longer matches. Add `--match-relabelled` to the import: a manifest verse the
database no longer has is filed under the one database verse with the same
sung text, and only then (text that differs is never matched; two candidates
means it is left alone). Use it on every import.

**Reading a finished run from your PC** (about a minute for 115 MB):

```
mkdir -p chant_runs/main
ssh spark 'cd ~/gpu_out && tar cf - manifest.jsonl mapping.json review.html qc.jsonl renders.jsonl audio' | tar xf - -C chant_runs/main
```

Storage: `--live` uploads through the configured backend (`AUDIO_STORAGE=r2`
+ `R2_*` for Cloudflare R2, zero egress; or `gcs`). Verse rows go to
whichever database `DATABASE_URL` points at. Supabase Storage is not a
backend yet (R2/GCS only); say the word and it gets one.

## 7. Scorer
Run `gpu/asr/server.py` (or Dockerfile.gpu) on a datacenter GPU host, or
Dockerfile.cpu on CPU if fast enough. HTTPS in front (Cloudflare Tunnel).
Never expose 8090 openly. Set SCORER_URL + SCORER_KEY in backend deploy env.

## Tests (CPU only)
`python -m pytest -q tests` in a scratch venv with only numpy, soundfile, pytest.
Must not need torch, NeMo or GPU.
