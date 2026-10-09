# Recite handover result (implementing agent, Muse Spark, 2026-10-09)

How each claim was checked: *run* (executed), *read* (code/source), *not verified*.

## Files changed or added

Backend:
- `app/services/chant_text.py` (new): verse_uid (4.1) + chant_lines (4.2).
- `app/models.py`: Shloka.verse_uid + listener; VerseAudio, ReciteAttempt, Competition, CompetitionEntry, LearnerPublic, Certificate, MonthlyWinner. Note: working tree also carries the shelf session's paged-books columns (book/chapter/seq/in_daily, canon_texts.paged); left intact.
- `migrations/versions/e6f7a8b9c0d1_recite_chant.py`, `e6f7a8b9c0d2_recite_attempts.py`, `e6f7a8b9c0d3_competitions.py` (new). Head is now `f8a9b0c1d2e3` (shelf session, revises e6f7a8b9c0d3).
- `app/config.py`: scorer, chant, private-storage, competition settings + env (8.1, 11.9).
- `app/services/storage.py`: store() content_type kw; store_private/read_private/delete_private + PrivateStorageOff (5.4).
- `app/schemas.py`: ChantLine, ChantInfo; ShlokaResponse.verse_uid + chant (5.3).
- `app/routers/shlokas.py`: one-query chant attach for list + today; served = voice + chant_serve_statuses (5.3). Preserved in_daily filter.
- `scripts/chant_export.py` (new, 5.5); `scripts/chant_import.py` (new, 5.6).
- `app/seeds/licences.py`: appended vagdhenu, sushrota, ml-kit-face (5.7). Other session's sa-wikisource expansion left intact.
- `app/services/scorer_client.py` (new, 8.2, fake mode refused in production).
- `app/routers/recite.py` (new, 8.3): POST /recite/score + GET /recite/due.
- `app/services/recite_tips.py` (new, 8.5).
- `app/services/review.py`: due_items/due_count kinds arg (8.6); `routers/review.py` passes step+vocab so old surfaces unchanged.
- `app/routers/me.py`: deletion covers ReciteAttempt, CompetitionEntry, LearnerPublic, Certificate, MonthlyWinner + private audio.
- `app/seeds/competition_pieces.py` (new, 11.2, 20 Gita refs).
- `app/services/competition_rules.py` (new, 11.13).
- `app/services/competitions.py` (new, 11.5/11.6/11.8/11.10 tick).
- `app/routers/competitions.py` (new, 11.4/11.11 learner + admin + tick with X-Test-Now override only when not production).
- `app/routers/certificates.py` (new, 11.7 public HTML).
- `app/main.py`: registered recite, competitions, certificates routers before static mount.
- `app/routers/legal.py`: privacy Recitation section (11.14).
- `deploy/gcp/deploy.sh`: SCORER_URL/KEY, R2/GCS_PRIVATE_BUCKET, ENV, PRIZE_CONTACT_EMAIL env + sanskritam-competition-tick every 15 min (8.1, 11.10).
- Tests: `tests/test_chant_text.py`, `tests/test_verse_audio.py`, `tests/test_chant_import.py`, `tests/test_recite.py`, `tests/test_competitions.py` (new).

GPU (`gpu/`, new): config.py, setup_vast.sh, requirements-tts/asr.txt, tts/render_jobs.py, tts/plan.py, asr/scoring.py, asr/sushrota.py, asr/qc_renders.py, asr/server.py, assemble.py, phase0.py, README.md, Dockerfile.gpu/cpu, tests/test_scoring.py, test_assemble.py, test_render_jobs_plan.py.

Phone:
- `src/api/client.ts`: ChantLine/ChantInfo, Shloka.verse_uid/chant, Competition/Recite types, uploadRecite/uploadCompetitionAttempt, reciteDue/competition*/publicProfile/myCertificates (404-safe).
- `src/recite/chantClock.ts`, `hide.ts`, `bands.ts`, `eyes.ts` (new).
- `src/components/chant/ChantList.tsx`, `ChantPlayer.tsx` (new).
- `src/components/recite/RecitationResult.tsx`, `EyesClosedTest.tsx` (new).
- `src/screens/Recite.tsx` (new: Listen/Practise/Recite), `RecitePicker.tsx` (new), `Contest.tsx`, `ContestResults.tsx`, `MasterBoard.tsx`, `Certificate.tsx`, `ContestRules.tsx` (new).
- `src/screens/Book.tsx`: Read/Chant switch (shabd.read.mode), ChantList + player (prefetch at 70%, repeat verse, 0.75/1/1.25x, follow, maroon/gold karaoke, Learn entry, lock-screen + background audio, mode reset on exit).
- `src/screens/Shloka.tsx`: chant url via playClip else speak; Learn button.
- `src/screens/Play.tsx`: first Competition tile (fill.teal) + Recite row (RecitePicker).
- `src/screens/Home.tsx`: results card after goal ring (ContestResults).
- `src/navigation/types.ts`, `App.tsx`: Recite/RecitePicker/Contest/ContestResults/MasterBoard/Certificate/ContestRules routes.
- `scripts/check-recite.mjs` (new).
- `app.json`: 1.2.0/versionCode 5, expo-audio enableBackgroundPlayback true, camera + microphone texts (7.7, 10.1).
- `package.json`: + @react-native-ml-kit/face-detection 2.0.1, expo-sharing ~57.0.22 (10.1; needs `npx expo install` + new build, not run here).

DECISIONS.md: appended 2026-10-09 Recite entry (11.14).

## What was run, read, not verified

- *Run* 2026-10-09: `backend pytest tests/test_chant_text.py` 5 passed; `test_verse_audio + test_chant_import` pass; `test_recite + test_competitions` 5 passed; recite-related 16 passed incl. iast invariant.
- *Run*: full backend suite 1612 passed, 16 skipped, 4 failed (below; all unrelated to recite code; recite files all pass).
- *Run*: `mobile npx tsc --noEmit` clean; `check-contrast.mjs` pass (maroon/gold 7.76 covered); `check-recite.mjs` 14 passed; `check-kala.mjs` 4106 pass; `a11y-audit.js` 0 issues.
- *Run*: gpu tests 13 passed via backend venv (numpy/soundfile/pytest only imports; torch/NeMo/GPU not needed).
- *Run*: `chant_export --sample 20`: 20 verses, 40 lines, 660 syllables (Gita 8, Hitopadesa 3, Katha 1, Mahabharata 4, Niti 1, Ramayana 1, Subhasita 1, Taittiriya 1). Full export: 1395 verses, vedic 84, non-vedic 1311, 2771 lines, 52359 syllables (book counts in run output).
- *Read*: HANDOVER.md sections 0/2; backend routers/services/mobile files cited above; expo-audio v57 AudioPlayer.remove + setActiveForLockScreen signatures in node_modules (used, not guessed).
- *Not verified*: everything needing GPU/owner (Phase 0 measurements, CER vs 4.36, latency, render quality, thresholds, scorer host, replay threshold, Gita 2.47 >= 90, empty unclear on device, eyes ratios on phone, capture interval, cache emptiness, full competition cycle on device, background/lock-screen on device, push). No machine rented, no deploy/build/commit (*read* app.json/package.json only; packages not installed).
- Pre-existing failures (not caused by recite; concurrent shelf session + date): test_licence_names_exact (shelf rewrote sa-wikisource to CC BY-SA 4.0 + 23 books), test_reader_tiers_shape (tier 2 empty breakdown from reader_passages seed), test_progress history (2026-09-01 outside 35-day window on 2026-10-09), all *run* above. Left untouched per no-revert rule.

## Phases

- Done in tree: Phase 0 code (awaits owner section-14 steps 1-4 + phase0.json), Phase 1 code (awaits owner render/review/import), Phase 2 code (awaits owner scorer + device checks), Phase 3 code (awaits owner build + device checks), Phase 4 code (awaits owner rules/prize/pieces approval + first competition), Phase 5 background play included in app.json/player (needs same 1.2.0 build).
- Owner runbook: gpu/README.md = section 14 copy.

## Phase 0 GPU results (*run* 2026-10-09 on the rented GB10, commit d0b4bab)

Machine used with your permission; ComfyUI left running throughout; nothing
installed into system Python. Setup: `bash gpu/setup_vast.sh` plus the dep
notes now recorded in it.

- NeMo 2.7.3 loads v13b on ARM + container torch 2.10: YES (*run*). Stock
  NeMo cannot: the checkpoint needs AI4Bharat `multilingual` tokenizer
  routing + `multisoftmax` kwarg stripping (`gpu/asr/sushrota.py`, recipe
  from the author's own running HF Space demo, *read* 2026-10-09). The
  `.nemo` is a POSIX tar (not zip). `sa` tokenizer present, model on cuda:0.
- Decoder check: CER 4.47% on all 327 `in_the_wild_test` clips vs author's
  4.36%: within 0.5pp (0.11pp away). ACCEPTANCE PASSES (*run*,
  `~/gpu_out/decoder_check.json`).
- Sample render: 20 verses, 41 parts + 12 reseeds = 53 renders, 229 s audio
  (*run*). RTF ~6.4 wall (contended: ComfyUI at 96%; author's A6000 number
  is 1.24). Full 4 h chant at this contention is ~25 GPU-hours: run the full
  render when ComfyUI is idle.
- QC: 40/53 clean; first takes 37/41 clean, CER mean 0.022. Reseeds fixed
  one CER flag (0.12 clean) and improved another (0.429 to 0.286, still
  flagged). One long line flags short+pause on every seed (threshold vs
  fallback-meter fit; needs your listen).
- Assemble: 20 verses, 20 `.m4a` (1.5 MB), manifest 20 rows, all
  `needs_listen` (meter fallback / vedic / speaker-first). review.html has
  20 rows (*run*).
- Latency (*run*): GPU 10/30/45/60 s clips in 0.49/0.14/0.29/0.49 s, peak
  1.6 GB. CPU/4-threads: 0.48/1.31/2.23/3.33 s. RECOMMENDATION: CPU host
  suffices (45 s in 2.2 s, far under the 25 s timeout); GPU only for
  concurrency. Set `scorer_max_seconds = 45` (unchanged).
- AAC offset measured (*run*): encoded `.m4a` lags the joined wav by 42.7 ms
  (xcorr 0.998). Line timings are ~43 ms early vs the file; acceptable for
  line highlighting.
- Your listening bundle is on your PC at
  `%LOCALAPPDATA%\Temp\opencode\phase0_out\` (review.html + audio/ (20) +
  manifest.jsonl + phase0.json + setup.json); originals in `~/gpu_out/` on
  the machine. Serve locally: `cd phase0_out && python -m http.server`,
  Approve/Reject, Download decisions.
- Still yours: listen to the 20, set QC thresholds
  (`competition_audio_days` n/a here; duration/pause/CER), confirm
  `scorer_max_seconds = 45`, pick scorer host (recommend CPU,
  `gpu/Dockerfile.cpu`), approve rules/prize/pieces.

## Full render + recurring workflow (*run* 2026-10-09, owner-approved)

- Phase 0 accepted as-is: all 20 approved, default QC thresholds kept, CPU
  scorer host. Commits d0b4bab (code), 85581b7 (measurements), 690b6e5
  (workflow). Shared edited files (models, Book, etc.) still uncommitted:
  they interleave with the shelf session's work; left for you to review.
- Full 1,395-verse render launched on the machine (`~/gpu/run_full.sh`:
  render, qc, reseed, qc, assemble; resumable; contended with ComfyUI per
  your call). First attempt caught a truncated `chant_jobs.jsonl` (first
  scp cut 87 KB); re-sent whole (1,496,056 bytes, ends clean) and relaunched.
- Recurring workflow: `gpu/run_full.sh` + `gpu/README.md` "Recurring runs".
  New verses later: `chant_export --skip-served`, same script with
  `JOBS=...`, review, `chant_import --live` to R2/GCS. Supabase Storage is
  not a backend yet (R2/GCS only).

## Defaults as built (owner may change)

competition_results_hour 8; one verse/competition from competition_pieces.py; tie-break earliest best_at; competition_attempts_per_day 10; entry = Google/Apple + public name (3-24, unique ci, reserved list) + 18+ + current rules + recording consent, not banned; competition_audio_days 30; prize_contact_email "" (winner sees in-app contact line); quota_recite_seconds_per_day 900; chant_serve_statuses auto_ok,approved; under-18s blocked from entry only. competition_replay_threshold 0.0 (report only). competition_piece_max_ms 35000. Thresholds face 0.9 / eyes 0.85 / multi 0.1.

## Changed minds / notes

- export is_vedic folds diacritics (else Katha/Mundaka/Isa missed; now 84/1311 exactly as handover).
- AudioPlayer cleanup uses remove() (docs) with release() fallback; lock-screen set/cleared; audio mode reset leaving Chant.
- Recite fake scorer counts aksaras loosely; real path uses scorer lines.
- review /due passes old kinds; verse items only under /recite/due.
- Privacy page flags pre-existing under-13 vs DPDP under-18 clash (unchanged age line, as ordered).

## Open questions for owner

1. Approve rules/privacy wording + fill prize, contact email, piece list (20 Gita refs are placeholders with served-chant + 35s filter at tick).
2. Phase 0: run setup + phase0, send phase0.json; set QC thresholds, scorer_max_seconds, scorer host (GPU/CPU).
3. Full render window (ComfyUI free?) + review decisions + import --live env (R2/GCS, DATABASE_URL).
4. Scorer HTTPS + SCORER_URL/KEY + deploy.sh + build 1.2.0 (camera/face-detection/sharing); run device acceptances (Phases 1-4).
5. Lawyer confirm free-contest + prize position before first prize; keep professor permission email on file.
