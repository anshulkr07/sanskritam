# Recite: chanted verses, karaoke, learn and recite, competitions: handover

Written 2026-10-09 by Claude for the implementing agent (Muse Spark in opencode). You arrive with no
context, so this file carries all of it. It is long on purpose. Work through section 13 in order, one
phase at a time, and run every check it lists before you start the next phase.

**What "verified" means here.** Each fact below says how it was checked: *run* (executed, with the
date), *read* (read in the code or at the source, with the date) or *not verified*. Do the same in your
hand-back (section 15). The owner treats an unverified claim stated as fact as a lie.

**Read first.** `HANDOVER.md` section 0 (rules) and section 2 (look). They still apply and are
summarised in section 0 below.

**Who does what.**
- You: code, scripts, tests, text drafts, and the hand-back.
- The owner: renting GPUs on vast.ai and running the GPU scripts (section 14 is their runbook; if they
  give you an SSH command to a machine they rented, you may run section 14 there), listening to audio,
  uploading audio, deploying the backend, building the app, committing.
- You never rent a machine, spend money, deploy, build, publish or commit.

---

## 0. Rules for this work

- **Don't commit, don't deploy, don't run an EAS build, don't run `eas update`, don't rent or start GPU
  machines.** Leave changes in the working tree.
- **Other sessions' work is in the tree.** `backend/app/seeds/canon.py` and
  `backend/app/seeds/licences.py` have uncommitted changes, and `backend/scripts/build_mahabharata_payload.py`
  is new and untracked (another session's Mahābhārata import). Don't revert, reformat or reorder them. In
  `licences.py` you only append rows.
- **Both directions keep working.** The app already on phones (1.1.0) must keep working against the new
  backend, and the new app must work against today's backend until the owner deploys. Every new request
  field is optional, every new response field is read defensively, and a missing endpoint (404) hides
  the feature with one line. Nothing crashes.
- **Copy rule.** No em dashes and no spaced en dashes in anything a user can read, including
  `accessibilityLabel`. No explanatory paragraphs: a title, short labels, one-line errors that say what
  happened and what to do. Server text shown as prose goes through `plain()` (`mobile/src/utils/text.ts`).
  Exception: the competition rules screen and the privacy page are legal text (sections 11.13 and 11.14);
  write them as short numbered points.
- **Look rule.** A coloured surface is a deep solid fill (`fill.*` in `mobile/src/theme.ts`) with cream
  text (`onFill.*`). Never use the pale tints (`accent.*.bg`, `color.saffronLight`, `color.okBg`,
  `color.unsureBg`, `color.warnBg`, `color.surfaceMuted`) as a background. Plain content sits on the page
  with hairlines. No lists of rounded pills. No coloured left bar on a rounded card. 16dp side padding.
- **Accessibility.** Every `Pressable` has a role and a label. Targets are at least 44dp. Colour is never
  the only signal. Sanskrit is never below 18pt (`sized()` in `hooks/useTypeScale.tsx`). Every animation
  has a Reduce Motion path (`hooks/useReducedMotion.ts`). An "unclear" result is never shown as a mistake.
- **No AI notes in the UI.** Never add "written by AI", "checked by a model" or similar (owner, 2026-10-03).
- **Never write Sanskrit from memory.** Every Devanagari string a user sees comes from the database
  (`shlokas.devanagari`), an engine (`vidyut`) or a named source. UI labels are English. This includes
  certificates.
- **Privacy.**
  - Raw audio is not kept (the rule in DECISIONS.md since 2026-08). The one exception this work adds: the
    best competition recording of a person who agreed to it, kept privately until `competition_audio_days`
    after results, then deleted (section 11.4). Practice recordings and camera images are never stored.
  - Camera frames never leave the phone. Each photo taken for the eyes-closed check is deleted right after
    it is read.
  - Never log audio, transcripts or camera numbers together with a learner's name. Log ids and counts.
- **Money rule.** Competitions are free to enter, always. Never tie entry, attempts, points or prizes to
  Plus or any purchase, and never give Plus learners more attempts or any other edge in a competition. A
  paid entry with a prize makes the competition an "online money game" under India's Promotion and
  Regulation of Online Gaming Act, 2025, whether it is won by skill or not, and Google Play bans paying for a
  chance at a prize (section 2.7). Plus may sell learning features (more practice scoring, for example);
  that is a subscription, not a stake.
- **Leave alone:** Kāla (`mobile/src/kala/`, `screens/Kala*.tsx`), kundli and gun milan
  (`services/kundli.py`, `services/milan.py`), the Ask verse checks (`services/ask_sources.py`), the Ask
  streaming protocol, and Talk.
- **Stack.** Expo SDK 57, React Native 0.86.3, new architecture on, Reanimated 4.5.1. Read the versioned
  docs before using any Expo API: https://docs.expo.dev/versions/v57.0.0/ (`mobile/AGENTS.md` says so).
- **Checks before every hand-back:**
  - `cd backend && PYTHONUTF8=1 ./.venv/Scripts/python.exe -m pytest -q` (the venv has Vidyut; the system
    Python does not).
  - `cd mobile && npx tsc --noEmit`
  - `cd mobile && node scripts/check-contrast.mjs`, `node scripts/check-kala.mjs`,
    `node scripts/a11y-audit.js`, and the new `node scripts/check-recite.mjs` (section 9.8).
  - `cd gpu && python -m pytest -q tests` in a scratch venv that has only `numpy`, `soundfile` and
    `pytest` (section 6.10). These tests must not need torch, NeMo or a GPU.
  - Starting the real backend rewrites `backend/app.db`. Back it up and restore it by checksum, or test
    through `TestClient` with a temp `DB_PATH` the way `backend/tests/conftest.py` does.
  - Long heredocs fail in Git Bash: write scripts to a file and run the file. Python on Windows writes CRLF
    in text mode; open repo files with `newline=""`.

---

## 1. What the owner decided

On 2026-10-08 and 2026-10-09, in conversation with Claude. Their words, lightly tidied:

| # | Decision |
|---|---|
| 1 | "Professor told I can use it." Prof. Prathosh A P (IISc Bengaluru) agreed in writing to the use of his chant voice (Vāgdhenu) and his speech recogniser (Su-śrotā) in this paid app, including for the Upaniṣads. The owner holds that email. You credit him as in section 5.8. |
| 2 | "Vagdhenu is better than sarvam. He chants in metre while sarvam randomly reads the verses." Verses are chanted by Vāgdhenu. Sarvam stays for everything else: Talk, Hindi and English audio, grammar audio, letters. |
| 3 | "Recite and score will be built too." |
| 4 | "We will rent GPU on vast.ai." The DECISIONS.md rule "no local models, no GPU box, API-only voice" is set aside for this work ("forget about decisions.md rules for now"). Record that in DECISIONS.md (section 11.14). |
| 5 | "Lets build something like tarteel for our shlokas", inside this app, not a new app. |
| 6 | "Every verse chanted with each line lit up ... for every book we have in karaoke style ... toggle between read mode (our current) and karaoke mode ... with auto scrolling." The owner's reference is a screenshot of the Bhāgavata-VāNi app: verse cards one under another, the playing verse highlighted, the line being sung in colour, a player bar at the bottom. |
| 7 | "Not only geeta challenge, every phrase. So, user can choose to learn something. Can listen to it, to practice, enter practice mode, where he/she needs to turn on front camera, close eyes and recite the shloka, we give him a score and tell where to improve or if its perfect." |
| 8 | The camera test is required "to get into leaderboard". "Certificates only for top 3." |
| 9 | "The competitions will run from Thursday to Saturday night and results and certificates to be given on Sunday morning. While the next competition will run from Sunday to Wednesday and same way." |
| 10 | "A master live leaderboard is maintained for most competition winner and prize is given to them monthly." |

**Not decided yet.** Build these with the default shown, as a setting where one is named, and list them
again in your hand-back so the owner can choose:

| Question | Default you build | Setting |
|---|---|---|
| Results time | 08:00 IST | `competition_results_hour` |
| What is recited in a competition | one verse, taken in order from a rotation list (11.2) | `backend/app/seeds/competition_pieces.py` |
| Tie-break | whoever reached the tied best score first ranks higher | code |
| Attempts | 10 counted attempts a day per person per competition | `competition_attempts_per_day` |
| Who may enter | signed in with Google or Apple; a public name; confirms they are 18 or over; accepts the rules and the keeping of their best recording | code and rules text |
| How long a competition recording is kept | 30 days after results | `competition_audio_days` |
| Monthly prize | announced in the app; the winner claims it by email with a code | `prize_contact_email` |
| Practice scoring | free; 15 minutes of recitation a day per person | `quota_recite_seconds_per_day` |
| Chant audio served without the owner listening | rows that passed the automatic checks (`auto_ok`) | `chant_serve_statuses` |
| Under-18s | cannot enter competitions yet; they can learn and practise | rules text |

---

## 2. What exists today

### 2.1 Verses (local `backend/app.db`, *run* read-only 2026-10-08 and 2026-10-09)

- `shlokas` has 1,395 rows: Gītā 706, Mahābhārata 200, Hitopadeśa 108, Nītiśataka 104, Rāmāyaṇa 63,
  Vairāgyaśataka 48, Kaṭhopaniṣad 40, Pañcatantra 35, Śṛṅgāraśataka 34, Muṇḍaka 23, Īśopaniṣad 19, and a
  few others. Production may differ; the export (5.5) reads whichever database it is pointed at.
- `audio_url` is empty on every row. Verse audio today is Bulbul speaking through the Hindi voice:
  `screens/Shloka.tsx` calls `speak(devanagari, "sa")`, and the backend maps Sanskrit to
  `tts_sanskrit_code = "hi-IN"` (`backend/app/config.py:70`). Bulbul's Sanskrit voice is still refused:
  `sa-IN` answers 400 "Please request beta access" (*run* 2026-10-08).
- `id` is random per database (`uuid.uuid4().hex[:16]` in `scripts/import_text.py`), so the same verse has
  a different `id` on the owner's PC and in production. `source_ref` is not unique (15 refs repeat). Use
  `verse_uid` (4.1) to match verses across databases.
- Text shape: 678 verses use newlines between lines (the Gītā); the rest separate lines with `।` and `॥` on
  one line. 680 carry a verse number in Devanagari digits (`॥ ४७ ॥`). 32 lines are speaker lines
  (`अर्जुन उवाच` 22, `सञ्जय उवाच` 9, `धृतराष्ट्र उवाच` 1). No Latin letters.
- Metre (*run* 2026-10-09 with Vāgdhenu's own detector, `render_core.detect_meter_key`, with vidyut doing
  the transliteration and speaker lines removed):
  - Of the 1,311 non-Vedic verses, 1,099 are in a metre Vāgdhenu has a reference chant for (anuṣṭubh is
    most of them, then śārdūlavikrīḍita, upajāti, vasantatilakā, indravajrā, vaṃśastha, upendravajrā).
  - 206 are not recognised and 6 are in metres with no reference (mandākrāntā 4, hariṇī 2). These 212
    still render, with Vāgdhenu's fallback reference, but must be listened to (6.5). Not recognised, by
    book: Gītā 67, Nītiśataka 44, Mahābhārata 34, Vairāgyaśataka 26, Śṛṅgāraśataka 14, Hitopadeśa 11,
    Pañcatantra 9, others 7.
  - The 84 Upaniṣad verses are Vedic (6.5).
- Size: 2,597 non-Vedic lines, 49,131 syllables; the longest line has 84 syllables; 138 lines have more than
  44. At Vāgdhenu's 0.26 to 0.33 s per syllable that is about 3.5 to 4.5 hours of chant.

### 2.2 The reading page (*read* 2026-10-09)

- `mobile/src/screens/Book.tsx` is the fullscreen reader: one verse per page with a page curl
  (`components/book/PageCurlBook`). A middle tap shows a top bar (back, title, `Aa`, contents, Ask) and a
  bottom slider. Themes light, sepia, dark (`screens/readerTheme.ts`), five sizes, a Roman switch, a Word by
  word sheet. Storage keys `shabd.read.theme`, `shabd.read.size`.
- Verses come from `GET /shlokas` (`api.listShlokas`) and are grouped into books by `bookVerses` in
  `utils/verses.ts`. Route params: `Book: { bookKey: string; index?: number }`.
- `breakVerse()` splits after each daṇḍa, so `॥ ४७ ॥` becomes its own line and a speaker line is a line.

### 2.3 Audio, recording, camera on the phone (*read* 2026-10-09)

- `expo-audio ~57.0.4`. `services/speech.ts` plays through `createAudioPlayer` and listens to
  `playbackStatusUpdate`; `playClip(url)` plays a pre-rendered file.
- From the v57 docs: `seekTo(seconds)`; `setPlaybackRate(rate, pitchCorrectionQuality)` (rate 0.1 to 2.0 on
  Android; the quality argument is iOS only); `loop`; `currentTime` and `duration` in seconds;
  `createAudioPlayer(source, { updateInterval })` sets how often status updates come (default 500 ms).
  Background play needs the config plugin's `enableBackgroundPlayback` (the app sets it `false`,
  `mobile/app.json` plugins), `setAudioModeAsync({ shouldPlayInBackground: true, interruptionMode: "doNotMix" })`
  and `player.setActiveForLockScreen(true, { title, artist })`. On Android, playback stops after about three
  minutes in the background without lock-screen controls.
- Recording: `hooks/useVoiceInput.ts` records 16 kHz mono AAC in `.m4a` at 32 kbps. expo-audio has no WAV
  output on Android (the v57 docs list `default, 3gp, mpeg4, amrnb, amrwb, aac_adts, mpeg2ts, webm`), so the
  server decodes `.m4a` with ffmpeg. `RecordingOptions.isMeteringEnabled` gives a level you can use to stop on
  silence.
- Camera: `expo-camera ~57.0.4` is installed; its plugin text in `app.json` is "Allow Sanskritam to
  photograph your handwriting so it can be read on this device". `CameraView` has `facing="front"` and
  `animateShutter`; `takePictureAsync` has `quality`, `skipProcessing` (skips the orientation fix and may give
  the wrong orientation) and `shutterSound` (default true). expo-camera has no face detection.
- `@react-native-ml-kit/text-recognition ^2.0.0` is installed and used by `services/photoRecogniser.ts`
  (it checks `NativeModules.TextRecognition` before use). Its sibling `@react-native-ml-kit/face-detection`
  2.0.1 (MIT, same repo `a7medev/react-native-ml-kit`) is not installed. Its API (*read* in its `index.ts`):
  `FaceDetection.detect(imageURL, { performanceMode: "fast", classificationMode: "all", contourMode: "all" })`
  returns faces with `leftEyeOpenProbability`, `rightEyeOpenProbability` and lip contours
  (`upperLipBottom`, `lowerLipTop`). It reads an image file on the device. Contours come only for the most
  prominent face.
- `react-native-view-shot 5.1.0` is installed (the Ask sheet uses `captureRef`). `expo-sharing` is not
  installed (57.0.22 is the latest on npm). React Native's `Share` cannot send a file on Android, so sharing
  a certificate image needs expo-sharing.
- Push does not reach phones yet (*read* 2026-10-04; on 2026-10-09 still no `googleServicesFile` in
  `app.json` and no notification permission request in `mobile/src`). Nothing in this work may depend on
  push.
- Native changes need a new build (the owner's). `runtimeVersion` follows the app version; the app is 1.1.0,
  versionCode 4.

### 2.4 Backend (*read* 2026-10-09)

- FastAPI and SQLAlchemy. Alembic migrations live in `backend/migrations/versions/`; the current head is
  `d4e5f6a7b8ca` (`d4e5f6a7b8ca_ask_answers.py`).
- Production: Cloud Run, 1 GiB, 1 CPU, 1 to 2 instances, 120 s timeout (`deploy/gcp/deploy.sh`). A Cloud
  Scheduler job calls `POST /admin/content/tick` every 30 minutes with `X-Admin-Token`; copy that block for
  the competition tick (11.10).
- `require_admin` in `app/auth.py` checks the `X-Admin-Token` header.
- `services/storage.py`: `get_storage()` returns Local, GCS or R2; `store(data, path)` always sends
  `audio/wav` as the content type; local files are served at `/audio` from `storage/audio`
  (`app/main.py`).
- `services/review.py`: `schedule_review(db, learner_id, item_key, kind, verdict, abstained=False, now=None)`
  with verdicts `correct | off_by_one | incorrect | unsure`. `due_items` and `due_count` read every kind.
  `ReviewItem.kind` is 16 characters, `item_key` 128.
- `services/entitlement.py`: `ALWAYS_FREE`, `PREMIUM_FEATURES`, `has_entitlement`.
- `services/pronunciation.py`: contrast classes (retroflex/dental, aspirated/plain, sibilants, vowel length)
  and their messages.
- `services/activity.py`: `record_activity(db, learner, xp=..., ...)` feeds the goal ring and calendar.
- `Learner` has `display_name` (often the real name from Google), `google_sub`, `apple_sub`, `timezone`.
  It has no age and no email.
- DECISIONS.md (2026-09): "no leaderboards without an owner decision". The owner has now decided (section 1).

### 2.5 Vāgdhenu, the chant voice (*read* at GitHub and Hugging Face 2026-10-08 and 2026-10-09)

- Code: `prathoshap/vagdhenu`, Apache-2.0, main at `c18927a8a77775753e32248177a5a6bea1019a12`
  (2026-07-19). Weights: Hugging Face `prathoshap/vagdhenu`, Apache-2.0, revision
  `0b8b7474c1899471b3d2b6a3ee919ab6c9373ebc`. Built on AI4Bharat IndicF5 (MIT) and NVIDIA BigVGAN-v2 (MIT);
  the MIT notices are in that repo's `THIRD_PARTY_NOTICES.md`.
- Setup (`scripts/setup.sh`): Python 3.10, a CUDA 12.1 GPU, `torch==2.4.1` and `torchaudio==2.4.1` from the
  cu121 index, then its `requirements.txt` (IndicF5 from git at a fixed commit, `transformers==4.46.3`,
  `numpy==1.26.4`, `librosa==0.11.0`, `indic-transliteration`, and others), a clone of NVIDIA BigVGAN on
  `PYTHONPATH`, then `python scripts/download_weights.py` into `models/`.
- API (`src/render_core.py`):
  - `Renderer(voice_path, voc_path, bank_path, device="cuda", vocab_file=None, speed=0.90, nfe=64, cfg=3.0, gap=0.55, gap_halant=0.20)`
    loads the models once.
  - `render_one(text, meter, seed=60, no_sandhi=True, speed=None, sps=None)` returns
    `(24000, float32 audio)`. `text` may be a list of pieces. Each piece is synthesised on its own, trimmed
    by `gate()`, and the pieces are joined with 0.55 s of silence (0.75 s after a piece that ends in a
    virāma). Called with a list of one piece, it returns that piece alone, trimmed.
  - `split_padas(text)` splits on newlines, then on daṇḍas. `detect_meter_key(text)` returns a metre name
    or `""`. An unknown metre falls back to `vasantatilaka`.
  - The voice file is `models/voice_steer_ema_2026-06-17.pt`, the vocoder `models/voc_bigvgan_EMA_2026-06-11.pth`,
    the bank `src/reference_bank/bank.json`.
- Reference bank: anuṣṭubh, pramāṇikā, vasantatilakā, upajāti, indravajrā, upendravajrā, vaṃśastha,
  rathoddhatā, śālinī, indravaṃśā, drutavilambita, bhujaṅgaprayāta, mālinī, śārdūlavikrīḍita, sragdharā,
  vrutta-1, and two prose references (`gadya`, `gadya_mbtn`). Each entry has `sec_per_syll` (0.255 to 0.437).
- Speed (its `docs/TECH_REPORT.md`): about 449M parameters; real-time factor 1.24 at nfe 64 and 0.63 at
  nfe 32 on an RTX A6000; about 22 minutes per half-verse on CPU, so a GPU is required; peak memory 2.5 GB.
  On the owner's Windows PC (CPU) 9.9 s of chant took 368 s (*run* 2026-10-04).
- Known faults and the author's own fixes (TECH_REPORT):
  - Syllable drops, an extra pause of about 0.3 s inside a line, and doubled consonants all depend on the
    seed. He re-renders flagged lines with seeds 61, 63 and 64 and keeps the best one.
  - A duration check catches collapsed renders. A Sanskrit speech-recogniser check is "the ONLY detector
    for gemination/drops/mispronunciation". MFA alignment was dropped as low value. Flagged clips are never
    dropped automatically.
  - Most real defects come from the source text (numbering, brackets, zero-width joiners, typos), so clean
    the text first.
  - More than four repeats of the same syllable cannot be rendered. Pieces much longer than about 25 s
    degrade.
  - His Bhāgavatam build wrote a `timings.json` per chapter with each half-verse's start and end, for
    karaoke. Section 6.6 does the same.
- The author's requests (project page and model card): "Please use it only for non-Vedic chants" (the owner
  reports he has since agreed to the Upaniṣads); it is his own voice, so do not imitate or clone it; credit
  Vāgdhenu.

### 2.6 Su-śrotā, the recogniser (*read* 2026-10-08 and 2026-10-09)

- Weights: Hugging Face `prathoshap/sushrota-sanskrit-asr`, revision
  `5452d080bbffa62ff879e3ddd53b42dfa7a1db64`, files `sushrota_sanskrit_asr_v13b.nemo` (the deployed one)
  and `sushrota_sanskrit_asr_v5.nemo`. No licence of its own; the owner has the author's permission
  (section 1). Base: AI4Bharat `indicconformer_stt_sa_hybrid_ctc_rnnt_large` (MIT), named in his
  `scripts/finetune_ctc.py`. About 129M parameters.
- His NeMo was 2.7.3 (his scripts load the base from `.cache/torch/NeMo/NeMo_2.7.3/`). `nemo_toolkit` 2.7.3
  is on PyPI (2026-04-23, Python 3.10 or later). Whether 2.7.3 loads the `.nemo` file is *not verified*;
  Phase 0 checks it.
- Usage (his model card): `EncDecHybridRNNTCTCBPEModel.restore_from(path)`, `.eval()`; then
  `enc, _ = M.forward(input_signal=sig, input_signal_length=sl)` and
  `lp = M.ctc_decoder(encoder_output=enc)[0]`; keep the columns `[5632] + range(4096, 4352)` (blank, then the
  256 Sanskrit tokens); re-normalise with a log-softmax over those 257 columns; greedy argmax; collapse
  repeats; drop blanks; map `id - 1` through `M.tokenizer.tokenizers_dict["sa"].ids_to_tokens([id - 1])`;
  join; replace `▁` with a space. Input is 16 kHz mono float32.
- Results (his model card, his test sets): real-user recordings (327 clips) CER 4.36%; Bhāgavata chant
  about 6.0%; Vedānta prose about 7.2%.
- His tutor's scoring (`docs/VAGBODHINI_2026-07-13.md` and `vagbodhini/app_practice.py` in
  `prathoshap/sushrota-sanskrit-asr`): three greedy decodes from one forward pass with blank penalties 0, 3
  and 6; both sides canonicalised; each decode aligned to the reference by akṣara edit distance; strict and
  liberal bands; abstain ("unclear") rather than accuse; 0.3 s of silence added before and after (the model
  drops onsets otherwise); input capped at 30 s. Write our own code from section 6.4. You may read his to
  understand it.
- His dataset `prathoshap/sushrota-sanskrit-asr-data` (CC-BY-4.0) has a 327-clip `in_the_wild_test` split.
  Phase 0 uses it to check our decoder against his 4.36%.

### 2.7 App store rules for contests (*read* 2026-10-09)

- Apple App Review Guidelines:
  - 5.3.1: "Sweepstakes and contests must be sponsored by the developer of the app."
  - 5.3.2: "Official rules for sweepstakes, contests, and raffles must be presented in the app and make
    clear that Apple is not a sponsor or involved in the activity in any manner."
  - 2.5.14: explicit user consent, and a clear visual and/or audible indication, when recording with the
    camera or microphone.
  - 5.1.2(vi): data from camera face tools may not be used for marketing, advertising or data mining.
- Google Play, "Real-Money Gambling, Games, and Contests":
  - It prohibits "Games that accept money in exchange for an opportunity to win a physical or monetary
    prize" outside licensed gambling.
  - Sweepstakes in non-game apps must state a fixed number of winners, a fixed entry deadline and a prize
    award date per promotion, and publish official rules in the app.
- So we need: free entry, a rules screen, a fixed number of winners and fixed dates, explicit camera and
  microphone consent, and a visible and audible signal while recording.

- India's Promotion and Regulation of Online Gaming Act, 2025 (Act 32 of 2025, *read* 2026-10-09 in the
  copy on meity.gov.in; India Code's copy timed out):
  - s.2(1)(g): an "online money game" is "an online game, irrespective of whether such game is based on
    skill, chance, or both, played by a user by paying fees, depositing money or other stakes in expectation
    of winning which entails monetary and other enrichment in return of money or other stakes".
  - s.2(1)(j): "other stakes" include credits, coins or tokens bought with money.
  - s.2(1)(i): an "online social game" involves no stakes. It "may allow access through payment of a
    subscription fee or one-time access fee, provided that such payment is not in the nature of a stake or
    wager".
  - s.5 prohibits offering an online money game, and s.9 punishes that with up to three years in prison, a
    fine of up to one crore rupees, or both. s.1(2) applies the Act to services offered in India even when
    they are run from abroad.
  - Commentary says the Act came into force on 1 May 2026. That date is *not verified*: the commencement
    notification was not opened.
- So skill does not exempt a paid-entry contest with prizes. A free contest with prizes, and a subscription
  that is not a stake, are outside these definitions. A lawyer should confirm before any prize goes out.

### 2.8 DPDP Act 2023 (*read* 2026-10-04, the MeitY PDF)

A child is anyone under 18 (s.2(f)). Processing a child's data needs verifiable parental consent (s.9(1)).
No tracking, behavioural monitoring or targeted advertising aimed at children (s.9(3)). A public
leaderboard with names, plus a camera check, is processing. That is why under-18s don't enter competitions
in this version (section 1).

---

## 3. The whole thing in one picture

```
 owner's PC                          vast.ai GPU machine                        production
 ──────────                          ───────────────────                        ──────────
 backend/scripts/chant_export.py ──► chant_jobs.jsonl
                                     gpu/tts/render_jobs.py    (Vāgdhenu, venv-tts)
                                     gpu/asr/qc_renders.py     (Su-śrotā, venv-asr)
                                     gpu/tts/render_jobs.py --reseed   (flagged lines only)
                                     gpu/asr/qc_renders.py     (again, for the new takes)
                                     gpu/assemble.py ──► gpu_out/audio/*.m4a, manifest.jsonl, review.html
 owner listens in review.html ◄──────
 backend/scripts/chant_import.py ─────────────────────────────────────────────► audio files (R2/GCS)
                                                                                 verse_audio rows
                                                                                 GET /shlokas carries `chant`
 phone: Read, Chant mode (karaoke); Learn: Listen, Practise, Recite
 phone ─► POST /recite/score ─► backend ─► gpu/asr/server.py (the scorer, on a GPU or CPU host) ─► result
 phone ─► POST /competitions/{id}/attempts (audio + camera numbers) ─► same scorer ─► entry, leaderboard
 Cloud Scheduler ─► POST /admin/competitions/tick every 15 min ─► open, close, publish, certificates, monthly winner
```

No database or storage keys ever go to the GPU machine. Audio comes back to the owner's PC and is uploaded
from there.

---

## 4. Shared definitions

### 4.1 `verse_uid`

A stable 16-character id for a verse, the same on every database:

```python
import hashlib, re, unicodedata

def verse_uid(source_ref: str, devanagari: str) -> str:
    norm = re.sub(r"\s+", " ", unicodedata.normalize("NFC", devanagari or "")).strip()
    key = (source_ref or "").strip() + "|" + norm
    return hashlib.sha1(key.encode("utf-8")).hexdigest()[:16]
```

*Run* 2026-10-09 on the local database: 1,395 rows give 1,395 distinct values. If a verse's text is
corrected, its `verse_uid` changes and its old chant no longer attaches. That is intended: the audio must
match the text.

### 4.2 Chant lines

One function decides the lines. The export uses it (what is rendered), the API sends it (what the phone
highlights) and scoring uses it (what is compared). Put it in `backend/app/services/chant_text.py`: pure,
no database.

```python
def chant_lines(devanagari: str) -> list[dict]:
    """[{"i": 0, "text": "...", "tts": "...", "parts": ["..."], "kind": "verse", "syllables": 16}, ...]"""
```

1. Split the text on `\n`, then split each piece after every `।` or `॥` with
   `re.split(r"(?<=[।॥])", piece)` (the same split as `breakVerse` in `Book.tsx`). Strip each piece and drop
   empty ones.
2. `core(p)` is `p` with everything removed except Devanagari letters and signs (`U+0900..U+0963` and
   `U+0971..U+097F`). This drops daṇḍas (`U+0964`, `U+0965`), Devanagari digits (`U+0966..U+096F`), spaces,
   `/` and punctuation. A piece whose `core` is empty is a verse number (`॥ ४७ ॥`, `॥ १/१/२॥`): append it,
   after a space, to the previous line's `text` so the display keeps it, and make no line of it. If there is
   no previous line, drop it.
3. `tts(p)`:
   - remove `(...)` and `[...]` together with their content;
   - remove ZWJ `U+200D`, ZWNJ `U+200C`, and Vedic accent marks (`U+0951..U+0954`, `U+1CD0..U+1CFF`,
     `U+A8E0..U+A8FF`);
   - keep only `U+0900..U+0963`, `U+0971..U+097F` and spaces;
   - collapse spaces and strip.

   The avagraha `ऽ` (`U+093D`) stays; Vāgdhenu skips it. If `tts` is empty, treat the piece as a verse number
   (step 2).
4. `kind` is `"speaker"` when `tts` matches `^(?:\S+ ){0,3}\S*उवाच$` (for example `अर्जुन उवाच`, or a joined
   form ending in `उवाच`). Otherwise it is `"verse"`.
5. `syllables`: count akṣaras. Each independent vowel (`U+0905..U+0914`) counts one, and so does each
   consonant (`U+0915..U+0939`) that is not followed by a virāma `्`. This is Vāgdhenu's own `n_aksharas`
   rule.
6. `parts`: if `syllables` is 44 or fewer, `parts = [tts]`. Otherwise split `tts` at spaces into two halves
   whose syllable counts are as even as possible, then repeat on any half that is still over 44. A single
   word over 44 stays whole (Vāgdhenu renders whole compounds up to about 68 syllables). The display keeps
   one line; the renderer renders each part on its own; the line's timing covers all its parts.
7. `i` is the index of the line after verse numbers are folded in.

Tests (in `backend/tests/test_chant_text.py`): a Gītā verse with a speaker line and `॥ ४७ ॥`; a one-line
Hitopadeśa verse with `।` and `॥`; brackets; ZWJ; a line over 44 syllables; an empty string; a verse number
alone. Take the inputs from real rows of `backend/app.db` (copy the strings into the test with a comment
naming the `source_ref`); never type Sanskrit from memory.

### 4.3 Bands and percent

- Each reference akṣara gets one band: `ok` (said right), `fix` (said wrong) or `unclear` (the recogniser
  is not sure). The scorer's own names are `green`, `red`, `amber`; the backend maps them.
- Strict percent = ok / (ok + fix + unclear). Liberal percent = ok / (ok + fix). Competitions use strict.
- A result is `unclear` as a whole (no percent) when fewer than 3 akṣaras were judged or the recogniser heard
  fewer than 2 akṣaras.

---

## 5. Backend, part A: chant audio

### 5.1 Migration

One new Alembic revision after `d4e5f6a7b8ca`:

- `shlokas.verse_uid`: `String(16)`, nullable, indexed. The migration fills it for every existing row with
  4.1. Add a SQLAlchemy `before_insert` and `before_update` listener on `Shloka` that sets
  `verse_uid = verse_uid(source_ref, devanagari)`, so every import script gets it without changes.
- New table `verse_audio`:

| column | type | notes |
|---|---|---|
| id | Integer, primary key, autoincrement | |
| verse_uid | String(16), not null, index | |
| voice | String(48), not null | `"vagdhenu-steer-2026-06-17"` |
| url | String(512), not null | public URL from storage |
| duration_ms | Integer, not null | |
| lines | JSON, not null | `[{"i", "text", "kind", "start_ms", "end_ms"}]` |
| meter | String(32), default `""` | what was used, for example `anushtubh` or `vasantatilaka (fallback)` |
| qc_status | String(16), not null | `auto_ok`, `needs_listen`, `approved`, `rejected` |
| qc_reasons | JSON, default `[]` | for example `["unknown_meter", "cer_line_2"]` |
| source_commit | String(48), default `""` | the Vāgdhenu commit used |
| created_at, updated_at | DateTime | |

  Unique on `(verse_uid, voice)`. Model class `VerseAudio` in `app/models.py`, next to `Shloka`.

### 5.2 `services/chant_text.py`

Section 4.2 plus `verse_uid` (4.1). No imports from the rest of the app except `re`, `unicodedata` and
`hashlib`, so the export script and the tests can use it alone.

### 5.3 `/shlokas` carries the chant

- `app/schemas.py` `ShlokaResponse` gets two optional fields: `verse_uid: str = ""` and
  `chant: ChantInfo | None = None`, where
  `ChantInfo = {url, duration_ms, voice, lines: [{i, text, kind, start_ms, end_ms}]}`.
- In `routers/shlokas.py`, `list_shlokas` loads every served `VerseAudio` row once into a dict by
  `verse_uid` (one query, not one per verse) and attaches `chant` to each verse that has one. Served means
  `voice == settings.chant_voice` and `qc_status` in `settings.chant_serve_statuses` (default
  `"auto_ok,approved"`). `/shlokas/today` attaches it the same way.
- Old phones ignore the new fields. Check that `test_shlokas*` tests still pass and add one that a verse
  with a `needs_listen` row gets no `chant`.

### 5.4 Storage

- `StorageBackend.store(data, path, content_type="audio/wav")`: add the keyword to the abstract method and
  to all three backends (GCS `upload_from_string(data, content_type=content_type)`, R2
  `ContentType=content_type`, Local ignores it). Existing callers stay unchanged. Chant files are `.m4a`
  with `audio/mp4`.
- Private storage, for competition recordings only (11.4):
  - `store_private(data, path, content_type) -> str` (returns a key), `read_private(key) -> bytes`,
    `delete_private(key) -> None`.
  - Local: under `storage/private/`. It must not be under `storage/audio`, which `main.py` serves publicly.
  - R2: a separate bucket `settings.r2_private_bucket`. GCS: `settings.gcs_private_bucket`.
  - If the private bucket for the selected backend is empty, `store_private` raises `PrivateStorageOff`.
    The caller then keeps no audio and marks the entry `no_audio` (11.4).
  - Never build a public URL for a private key. The owner hears recordings only through the admin endpoint
    (11.11).

### 5.5 `backend/scripts/chant_export.py`

```
python -m scripts.chant_export --out ../gpu_jobs/chant_jobs.jsonl [--books "Bhagavad Gītā,Hitopadeśa"] [--sample 20] [--skip-served]
```

- It reads `shlokas` from the configured database: local SQLite by default; the owner points it at
  production with `DATABASE_URL`.
- Writes one JSON line per verse:
  `{"verse_uid", "source_ref", "book", "vedic", "lines": chant_lines(...)}`.
  - `book` comes from the same parsing as `utils/verses.ts` `parseRef` (port the regex: trailing numbers
    removed, `SPELL_FIX` applied).
  - `vedic` is true for books starting with Kaṭhopaniṣad, Mundaka, Muṇḍaka, Īśopaniṣad, Taittirīya,
    Bṛhadāraṇyaka, or any later book whose canon entry the owner marks Vedic. Keep this as a list at the
    top of the script.
- `--skip-served` leaves out verses that already have a `verse_audio` row with an `approved` or `auto_ok`
  status for `settings.chant_voice`.
- `--sample N` picks N verses that cover, in this order: a verse with a speaker line, a line over 44
  syllables, each metre in 2.1 (at least one each), one unrecognised verse, one Vedic verse, then the rest
  at random with a fixed seed. Phase 0 uses this.
- Prints counts by book, by Vedic, and the number of lines and syllables. It writes nothing to the database.

### 5.6 `backend/scripts/chant_import.py`

```
python -m scripts.chant_import --manifest ../gpu_out/manifest.jsonl --audio ../gpu_out/audio [--decisions ../gpu_out/decisions.json] [--live]
```

- Dry run by default: it reads the manifest, checks each `verse_uid` exists in `shlokas` (by computing
  4.1 over the rows), checks each audio file exists, and prints what it would do. It spends nothing and
  writes nothing.
- With `--live`:
  - stores each file through `get_storage().store(bytes, f"chant/{voice}/{file}", content_type="audio/mp4")`;
  - upserts `verse_audio` by `(verse_uid, voice)`;
  - applies `decisions.json` (`{"<verse_uid>": "approved" | "rejected"}`) over the manifest's `qc_status`.
- A manifest line whose `verse_uid` is not in the database is skipped and listed: the text changed since
  the export.
- Idempotent: a re-run with the same files re-uploads nothing. Storage paths are content-hashed (6.6);
  check with `exists()` first.

### 5.7 Licence rows

Append to `backend/app/seeds/licences.py`, in its tuple format `(key, name, url, licence, credit, taken)`:

- `vagdhenu`: name "Vāgdhenu", url `https://github.com/prathoshap/vagdhenu`, licence `Apache-2.0`, credit
  "Verses chanted with Vāgdhenu by Prof. Prathosh A P, Indian Institute of Science, Bengaluru. Built on
  AI4Bharat IndicF5 (MIT) and NVIDIA BigVGAN-v2 (MIT).", taken "The chanting voice for verse audio."
- `sushrota`: name "Su-śrotā", url `https://huggingface.co/prathoshap/sushrota-sanskrit-asr`, licence
  `used with the author's permission`, credit "Recitations are checked with Su-śrotā by Prof. Prathosh A P,
  Indian Institute of Science, Bengaluru, built on AI4Bharat IndicConformer (MIT).", taken "Speech
  recognition for scoring recitations."
- `ml-kit-face`: name "Google ML Kit face detection", url `https://developers.google.com/ml-kit`, licence
  `ML Kit terms`, credit "Eyes-closed check runs on your phone with Google ML Kit.", taken "On-device face
  and eye detection." Add this one in Phase 3, when the package goes in.

The owner reviews the wording. Licence names follow the file's own rule ("named exactly").

### 5.8 Credit in the app

- The Licences screen shows the rows above.
- The Chant mode player bar (7.4) shows a one-line credit under the controls: "Chant: Vāgdhenu, IISc".
  Tapping it opens the Licences screen.

### 5.9 Tests

- `test_chant_text.py` (4.2).
- `test_verse_audio.py`:
  - the migration fills `verse_uid` the same as 4.1;
  - an inserted Shloka gets `verse_uid` from the listener;
  - `/shlokas` attaches `chant` for `auto_ok` and `approved` rows only, and only for `settings.chant_voice`;
  - an old-style response still validates.
- `test_chant_import.py`: dry run touches nothing; `--live` with a fake storage upserts rows, skips unknown
  `verse_uid`s, applies decisions, and is idempotent.

---

## 6. The GPU folder: `gpu/`

New top-level folder. It runs on the rented machine. Two virtual environments, because Vāgdhenu pins
`torch==2.4.1`, `transformers==4.46.3` and `numpy==1.26.4` and NeMo may not accept those:

```
gpu/
  README.md                 the runbook (copy section 14 here, kept current)
  setup_vast.sh             creates venv-tts and venv-asr, clones and downloads everything, checks ffmpeg
  config.py                 seeds, gaps, thresholds, voice name, pinned commits (one place)
  tts/render_jobs.py        venv-tts: Vāgdhenu renders, one wav per line part per seed
  asr/sushrota.py           venv-asr: load the model, posteriors, greedy decode with a blank penalty
  asr/scoring.py            pure: canonicalise, akṣaras, align, bands, percent, CER (no torch)
  asr/qc_renders.py         venv-asr: CER and the other checks for every render
  asr/server.py             venv-asr: the scorer service (FastAPI)
  assemble.py               numpy + soundfile + ffmpeg: choose takes, join, time lines, encode, manifest, review.html
  phase0.py                 measurements for Phase 0
  Dockerfile.gpu, Dockerfile.cpu   the scorer as a container
  requirements-tts.txt, requirements-asr.txt
  tests/                    CPU-only tests (6.10)
```

Pin in `gpu/config.py`:

```python
VAGDHENU_REPO = "https://github.com/prathoshap/vagdhenu.git"
VAGDHENU_COMMIT = "c18927a8a77775753e32248177a5a6bea1019a12"
VAGDHENU_HF = "prathoshap/vagdhenu"
VAGDHENU_HF_REVISION = "0b8b7474c1899471b3d2b6a3ee919ab6c9373ebc"
SUSHROTA_HF = "prathoshap/sushrota-sanskrit-asr"
SUSHROTA_HF_REVISION = "5452d080bbffa62ff879e3ddd53b42dfa7a1db64"
SUSHROTA_FILE = "sushrota_sanskrit_asr_v13b.nemo"
VOICE = "vagdhenu-steer-2026-06-17"
FIRST_SEED = 60
RESEEDS = [61, 63, 64]
GAP_S = 0.55
GAP_HALANT_EXTRA_S = 0.20
LEAD_S = 0.20
TAIL_S = 0.50
```

**The owner's machine (*run* over SSH 2026-10-09, host alias `spark`, vast.ai instance 54803678).**

The machine:
- an NVIDIA GB10, the DGX Spark chip, on an ARM CPU (`aarch64`) with 20 cores;
- 121 GiB of memory shared between the CPU and the GPU;
- Ubuntu 24.04, inside NVIDIA's PyTorch container;
- system Python 3.12.3 with `torch 2.10.0a0+...nv25.11` (CUDA 13.0, compute capabilities up to sm_120),
  `torchaudio 2.9.1`, `numpy 2.1.0`, `transformers 5.19.0`, `librosa 0.11.0`, `soundfile 0.13.1`;
- `ffmpeg 6.1.1` and `uv`;
- 235 GB free on `/`.

What else is running on it:
- ComfyUI (`/root/comfy/ComfyUI`, port 8188 on localhost), with about 47 GB of GPU memory and the GPU at
  96%;
- the owner's batch scripts under `/root/new`.

Four consequences:
- Vāgdhenu's `torch==2.4.1` cu121 has no ARM CUDA build. Use the container's torch.
- ComfyUI runs on the system Python, so installing Vāgdhenu's pins (`transformers==4.46.3`, `numpy==1.26.4`)
  into the system Python could break it. **Never `pip install` into the system Python on this machine.
  Never stop, restart or kill ComfyUI or the owner's scripts.**
- Our jobs share the GPU with ComfyUI and will run slower while it renders. Phase 0 is small enough to run
  alongside it. Start the full render when the owner says the GPU is free.
- Whether Vāgdhenu (written for Python 3.10 and torch 2.4) and NeMo 2.7.3 run on Python 3.12 with torch
  2.10 on ARM is *not verified*. Phase 0 finds out.

`setup_vast.sh` (for the GB10; keep the generic x86 path from Vāgdhenu's own `setup.sh` as a fallback in
the README):
1. Check `nvidia-smi`, `ffmpeg` and `uv`. Print the system torch version. If torch is not importable,
   stop: this script expects NVIDIA's container.
2. Make each venv with `uv venv --python /usr/bin/python3.12 --system-site-packages`, so it sees the
   container's torch and torchaudio. Never install `torch` or `torchaudio` into either venv: if a
   requirement asks for one, install that requirement with `--no-deps` and add its other deps by hand.
3. venv-tts:
   - clone Vāgdhenu at `VAGDHENU_COMMIT` and NVIDIA BigVGAN;
   - install its `requirements.txt` without torch, IndicF5 included;
   - first try the container's numpy 2.1 instead of `numpy==1.26.4`, and pin `transformers==4.46.3` inside
     the venv only;
   - download only `voice_steer_ema_2026-06-17.pt`, `voc_bigvgan_EMA_2026-06-11.pth` and `vocab.txt` at
     `VAGDHENU_HF_REVISION` (pass `revision=` to `hf_hub_download` in a small copy of his
     `download_weights.py`; don't edit his clone). The second voice (`voice_armA`, 1.35 GB) is not needed.
   - If `torchaudio.load` fails (torchaudio 2.9 changed its file loading; *not verified* here), say so in
     the hand-back and propose the smallest fix, for example loading the reference clip with `soundfile`
     in our wrapper.
4. venv-asr:
   - `nemo_toolkit[asr]==2.7.3` without torch, plus `fastapi`, `uvicorn`, `python-multipart`,
     `huggingface_hub`;
   - download only `SUSHROTA_FILE` at `SUSHROTA_HF_REVISION` (523 MB; skip the 523 MB `_v5` file).
   - If NeMo 2.7.3 will not install or load the file on ARM, try the NeMo version the container's own
     documentation names, and report what worked.
5. Write the versions of everything into `gpu_out/setup.json`.

Disk (*read* on Hugging Face 2026-10-09):
- model files about 2.4 GB:
  - Vāgdhenu voice 1.35 GB and vocoder 0.45 GB;
  - Su-śrotā 0.52 GB;
  - Vocos 0.05 GB;
  - BigVGAN's base files, at least the 0.45 GB generator (its repo is 3.8 GB in all; check what
    `from_pretrained` actually fetches);
- the 327-clip test split, 0.06 GB;
- renders about 1 GB (16-bit WAV at 24 kHz for about 4 hours of chant, plus re-renders);
- finished `.m4a` about 0.12 GB;
- the two venvs, a few GB (*not verified*).

Plan for 30 GB. The machine has 235 GB free.
4. Print versions of torch, NeMo and CUDA into `gpu_out/setup.json`.

### 6.1 `tts/render_jobs.py` (venv-tts)

```
python tts/render_jobs.py --jobs chant_jobs.jsonl --out gpu_out [--reseed gpu_out/qc.jsonl] [--limit N]
```

- Add the Vāgdhenu clone's `src/` to `sys.path` and import `render_core`. Make one `Renderer` with the
  defaults in 2.5 and `device="cuda"`.
- For each job (verse), pick the metre with `render_core.detect_meter_key("\n".join(line["tts"] for line
  in lines if line["kind"] == "verse"))`. If it returns `""` or a name not in the bank, use
  `"vasantatilaka"` and record `meter_fallback: true`.
- For each line, for each part, call `renderer.render_one([part], meter, seed=FIRST_SEED)`. Write
  `gpu_out/renders/<verse_uid>/<line_i>_<part_j>_s<seed>.wav` (24 kHz float, `soundfile`).
- Append one line per render to `gpu_out/renders.jsonl`:
  `{verse_uid, line_i, part_j, seed, meter, meter_fallback, path, seconds, syllables, sec_per_syll}`.
  `sec_per_syll` is the bank entry's value for the metre used (read `bank.json`).
- Resumable: skip a render whose wav already exists.
- `--reseed qc.jsonl` renders only the parts `qc_renders.py` flagged, with each seed in `RESEEDS` not yet
  tried.
- Print progress every 20 renders, and the real-time factor (render seconds / audio seconds).
- Speaker lines render with the verse's metre reference like any other line. Vedic verses render the same
  way, with `vedic: true` carried into the manifest (6.5).

### 6.2 `asr/sushrota.py` (venv-asr)

- `load(path, device)` returns the model in eval mode on `cuda` or `cpu`.
- `posteriors(model, wav16k: np.ndarray) -> np.ndarray` returns a `[T, 257]` log-probability array:
  1. pad 0.3 s of zeros before and after;
  2. forward, then `ctc_decoder`;
  3. take the columns `[5632] + list(range(4096, 4352))`;
  4. log-softmax over those 257 columns.

  Cap the input at `MAX_SECONDS` from settings (Phase 0 decides it; start at 45).
- `greedy(P, blank_penalty) -> str`:
  1. subtract `blank_penalty` from column 0;
  2. argmax per frame, collapse repeats, drop 0;
  3. map `c - 1` through the Sanskrit tokenizer (`tokenizers_dict["sa"].ids_to_tokens`);
  4. join and replace `▁` with a space.
- `to_16k_mono(path_or_bytes) -> np.ndarray` decodes anything (`.m4a`, `.wav`) with ffmpeg into 16 kHz
  mono float32: `ffmpeg -nostdin -i pipe:0 -ac 1 -ar 16000 -f f32le pipe:1`, run as a subprocess with
  stdin and stdout pipes and no temp file.

### 6.3 Rules for scoring code

`asr/scoring.py` is pure Python and numpy, and has no torch. The scorer service and the QC both use it.
The backend never imports it (the backend talks to the service).

### 6.4 The scoring method (`asr/scoring.py`)

Write these functions. Each one is short.

```python
def canon(s: str) -> str
    # NFC; collapse a combining mark (category Mn or Mc) repeated twice in a row into one;
    # word-final म् becomes ं  (re.sub(r"म्(?=\s|[।॥]|$)", "ं", s));
    # replace digits (0-9 and ०-९), daṇḍas, avagraha ऽ, ॐ and Vedic accents with a space;
    # remove every character that is not U+0900..U+097F or a space; collapse spaces; strip.

def aksharas(s: str) -> list[str]
    # Split canon text into akṣaras: a base letter (U+0904..U+0939, U+0958..U+0961, U+0972..U+097F)
    # starts a new akṣara unless the previous character is the virāma ्; everything else
    # (marks, virāma, nukta, anusvāra, visarga) joins the current akṣara. Spaces are dropped
    # (they are word ends, not akṣaras).

def align(ref: list[str], hyp: list[str]) -> list[tuple[str, str]]
    # Levenshtein with cost 1 for substitution, deletion, insertion. Backtrack to give, for each
    # reference akṣara, ("match", "") or ("sub", heard_akshara) or ("del", ""). Insertions are not
    # reported. When several paths tie, prefer match, then sub, then del.

def bands(ref: list[str], hyps: list[list[str]], strict: bool) -> list[dict]
    # hyps are the akṣaras of the three decodes (blank penalties 0, 3, 6).
    # For each reference akṣara, look at its op in all three alignments:
    # strict:  green if all three match; red if none matches; otherwise amber.
    # liberal: green if any matches; red if all three are "sub" with the same heard akṣara;
    #          otherwise amber.
    # Return [{"t": akshara, "band": "green" | "red" | "amber", "heard": first sub's heard or ""}].

def percent(b: list[dict], strict: bool) -> float
    # strict: green / (green + red + amber); liberal: green / (green + red); 0.0 when the divisor is 0.

def score(reference_lines: list[str], P_decodes: list[str], strict: bool = True) -> dict
    # reference_lines are the units' tts strings. Cluster each line separately, keep the line
    # lengths, concatenate for alignment, then split the bands back by line.
    # Whole-result "unclear" when fewer than 3 reference akṣaras or the penalty-0 decode has fewer
    # than 2 akṣaras.
    # Returns {"status", "lines": [[band...], ...], "percent_strict", "percent_liberal",
    #          "n": {"green", "red", "amber"}, "heard": decode_at_penalty_0}

def cer(ref: str, hyp: str) -> float
    # Character error rate on canon() text with all spaces removed: Levenshtein / len(ref).
```

Tests (6.10) use hand-made akṣara lists and decodes, so they need no model.

### 6.5 `asr/qc_renders.py` and the checks

```
python asr/qc_renders.py --renders gpu_out/renders.jsonl --jobs chant_jobs.jsonl --out gpu_out/qc.jsonl
```

For every render not yet checked:

1. **Duration.** `expected = syllables * sec_per_syll`. Flag `short` if `seconds < 0.55 * expected` and
   `long` if `seconds > 1.8 * expected`.
2. **Pause inside the line.** Take RMS over 20 ms windows. Flag `pause` if a run of windows below 0.012
   lasts 0.25 s or more, ignoring the first and last 0.15 s.
3. **Recogniser.** Resample to 16 kHz, compute `posteriors`, `greedy(P, 0)`, then
   `cer(part_tts, decode)`. Flag `cer` if over 0.10.
4. **Repeats.** If the part has an akṣara repeated more than 4 times in a row, flag `repeats` (Vāgdhenu
   cannot render it). Don't reseed it.

Write `{verse_uid, line_i, part_j, seed, flags: [...], cer, seconds}` per render.

A part is done when one take has no flags, or when every seed in `RESEEDS` has been tried. The thresholds
are first guesses. Phase 0 sets them after the owner listens (13, Phase 0).

### 6.6 `assemble.py`

```
python assemble.py --jobs chant_jobs.jsonl --renders gpu_out/renders.jsonl --qc gpu_out/qc.jsonl --out gpu_out
```

For each verse whose parts are all done:

1. **Choose a take per part.** Among the takes with no flags, take the lowest `cer`; on a tie, the lower
   seed. If none is clean, take the lowest `cer` anyway and record why.
2. **Join.**
   - Start with `LEAD_S` of silence.
   - For each line in order, add its parts with `GAP_S` between parts. Add `GAP_HALANT_EXTRA_S` more when
     the previous part ends in a virāma, the same rule as Vāgdhenu's.
   - Put `GAP_S` between lines (plus the virāma extra), then `TAIL_S` at the end.
3. **Time the lines.** `start_ms` is where the line's first part starts and `end_ms` where its last part
   ends, in the joined audio. Integers.
4. **Encode.** `ffmpeg -y -f f32le -ar 24000 -ac 1 -i pipe:0 -af loudnorm=I=-16:TP=-1.5:LRA=11 -ar 24000 -ac 1 -c:a aac -b:a 64k out.m4a`.
   - Name the file `<verse_uid>-<first 12 hex of sha256 of the m4a bytes>.m4a` and put it in
     `gpu_out/audio/`.
   - The AAC encoder adds a few tens of milliseconds at the start (*not verified* by measurement). Line
     timings are for highlighting a line, so that is acceptable. Note the measured offset in the hand-back
     if you can measure it.
5. **qc_status.** `needs_listen` when any of these holds: the metre fell back; the verse is Vedic; any
   part kept a flag; any line has `kind == "speaker"` and is the verse's first line (listen to one of
   each, then the owner decides). Otherwise `auto_ok`. Keep every reason in `qc_reasons`.
6. **Manifest.** Write one line to `gpu_out/manifest.jsonl`:
   `{verse_uid, source_ref, voice, meter, file, duration_ms, lines: [{i, text, kind, start_ms, end_ms}], qc_status, qc_reasons, vedic, source_commit}`.

Then write `gpu_out/review.html`, a single static page with no network calls:

- One row per verse whose `qc_status` is `needs_listen`, plus a random 5% of the `auto_ok` rows (fixed
  seed). Each row has the reference, the reasons, an `<audio>` player for `audio/<file>`, the lines with
  their times, and Approve / Reject buttons.
- The choices save in `localStorage` and a "Download decisions" button writes `decisions.json`
  (`{"<verse_uid>": "approved" | "rejected"}`). The page must work when opened from
  `python -m http.server` in `gpu_out/`.

### 6.7 `asr/server.py`: the scorer service

FastAPI, one worker, model loaded once at startup.

- `GET /health`: returns `{"ok": true, "model": SUSHROTA_FILE, "revision": SUSHROTA_HF_REVISION, "device": "cuda" | "cpu"}`.
- `POST /score` (multipart):
  - fields: `file` (audio, at most 2 MB), `reference` (the unit's tts lines joined with `\n`), `mode`
    (`strict` | `liberal`), `ref_audio_url` (optional, 11.4);
  - header `X-Scorer-Key` must equal the env `SCORER_KEY`, or the call gets 401;
  - decode with `to_16k_mono`; refuse with 413 audio longer than `MAX_SECONDS`;
  - one `posteriors`, three `greedy` decodes, `scoring.score`;
  - returns `{"ok": true, "status", "lines", "percent_strict", "percent_liberal", "n", "heard", "duration_ms", "replay_similarity": null | float, "model": "sushrota-v13b"}`.
- `replay_similarity`, only when `ref_audio_url` is given:
  - download the reference once and cache it in memory by URL;
  - compute log-mel features for both clips with librosa;
  - DTW-align them (`librosa.sequence.dtw` on cosine distance);
  - return the mean cosine similarity along the path, from 0 to 1.

  It is reported, never used to refuse (11.4).
- Never write the audio to disk. Never log the transcript. Log one line per call:
  `score dur_ms=... ms=... status=...`.
- `Dockerfile.gpu`: from an official PyTorch CUDA 12.1 runtime image, with ffmpeg, venv-asr requirements
  and the model file baked in. `Dockerfile.cpu`: from `python:3.10-slim` with the CPU torch wheels. Both run
  `uvicorn asr.server:app --host 0.0.0.0 --port 8090`.

### 6.8 `phase0.py`

It writes `gpu_out/phase0.json` with:

1. **Renders.** The first 20 jobs from `chant_export --sample 20`: seconds, render time, real-time factor,
   flags, CER.
2. **Decoder check.** Download `in_the_wild_test` from `prathoshap/sushrota-sanskrit-asr-data`. Decode each
   clip with `greedy(P, 0)` and compute CER with `scoring.cer` against its `text`. Report the mean.
   His figure is 4.36%. If ours is more than 0.5 points away, our decoding differs from his: stop and
   report.
3. **Latency.** Time `/score`-equivalent calls on 10 s, 30 s, 45 s and 60 s clips (cut from the test
   split), on the GPU and then on CPU only (`CUDA_VISIBLE_DEVICES=""`, 4 threads). Report seconds per call
   and peak memory.

### 6.9 `gpu/README.md`

Copy section 14 here, kept current, and add the exact commands as you wrote them.

### 6.10 CPU tests (`gpu/tests/`)

- `test_scoring.py`:
  - `canon`: doubled marks, word-final म्, digits, daṇḍas, accents;
  - `aksharas` on real strings copied from the database;
  - `align` (match, sub, del, insertions ignored);
  - `bands`, strict and liberal, including all three unclear cases;
  - `percent`, `score` with two lines, the whole-result unclear rule, `cer`.
- `test_assemble.py`:
  - with synthetic sine-wave "renders" written to a temp folder, check the gaps and lead/tail lengths;
  - check `start_ms` and `end_ms` for one and two parts per line and for a virāma ending;
  - check the chosen take (lowest CER without flags, else lowest CER);
  - check `qc_status` reasons;
  - check that `review.html` lists `needs_listen` rows.

  Mock ffmpeg: a flag `--no-encode` writes the joined wav instead.
- `test_render_jobs_plan.py`: the reseed planning reads `qc.jsonl` and plans only flagged parts with untried
  seeds. Import the planning function without importing torch; keep it in its own module.

---

## 7. Phone, part A: Chant mode in the reading page

### 7.1 Types (`mobile/src/api/client.ts`)

```ts
export interface ChantLine { i: number; text: string; kind: "verse" | "speaker"; start_ms: number; end_ms: number }
export interface ChantInfo { url: string; duration_ms: number; voice: string; lines: ChantLine[] }
// Shloka gains:
verse_uid?: string;
chant?: ChantInfo | null;
```

### 7.2 The switch

- In `Book.tsx`'s top bar, before `Aa`, add a two-way switch "Read | Chant". Use secondary buttons; the
  selected one is solid `fill.ink` with cream text. Save the choice in AsyncStorage `shabd.read.mode`.
- Show the switch only when at least one verse in this book has `chant`.
- In Chant mode the page-curl reader is replaced by `ChantList` (7.3). Switching back keeps the current
  verse, so Read opens at the verse that was playing.

### 7.3 `components/chant/ChantList.tsx`

- A `FlatList` of the book's verses, one card per verse, in the book's order (the same `pages` array Book
  already builds).
- Each card shows the reference (small, `theme.soft`) and the lines. Use `chant.lines[].text` when present,
  otherwise `breakVerse()`. Show the Roman line under each line when the Roman switch is on and the verse
  has `iast`. Keep it simple: the whole verse's `iast` under the last line.
- The playing verse's card is a deep fill: `fill.maroon` with `onFill.text`.
  - The line being sung is `onFill.gold`, weight 700, with a small "▶" glyph before it, so colour is not
    the only signal.
  - Its other lines are `onFill.soft`.
  - The gold-on-maroon pair is in the HANDOVER.md contrast table (7.76:1). Add it to `check-contrast.mjs` if
    it is not there yet.
- Other cards are plain on the reader page colour, with a hairline between cards. Text uses the reader
  theme (light, sepia, dark) and the reader size.
- A verse without `chant` shows a short label "No chant yet" under the reference, and the player skips it.
- Tapping a card plays that verse from the start. Tapping a line plays from that line's `start_ms`.
- Long-press a card to open Learn for that verse (9).

### 7.4 The player (`components/chant/ChantPlayer.tsx` and `recite/chantClock.ts`)

- One `createAudioPlayer(url, { updateInterval: 100 })` per verse. On `playbackStatusUpdate`, convert
  `currentTime` to milliseconds and find the line with `start_ms <= t < end_ms`.
  - Between lines, keep the previous line lit until the next line starts.
  - The line search is a pure function in `src/recite/chantClock.ts` (tested in 9.8).
- On `didJustFinish`:
  - repeat mode "verse" plays the verse again;
  - otherwise play the next verse that has `chant`, after a 0.8 s pause.
- When a verse is 70% through, create the next verse's player so it starts without a gap. Release players
  you no longer need with the release method the v57 docs give (check the docs; don't guess the name).
- The bar sits at the bottom on the reader page colour, with a hairline above. Controls (each 44dp, all
  labelled):
  - Previous verse, Play/Pause, Next verse;
  - Repeat (off, verse);
  - Speed (cycles 0.75×, 1×, 1.25×; uses `setPlaybackRate`);
  - Learn (opens 9 for the playing verse).

  Under the controls: the credit line (5.8).
- Leaving the screen pauses and releases everything.

### 7.5 Auto-scroll

- When the playing verse changes, scroll so its card sits about a third from the top (`scrollToIndex` with
  `viewPosition: 0.3`), animated unless Reduce Motion is on.
- If the learner scrolls by hand, stop following. Show a "Follow" button in the bar; tapping it scrolls back
  and follows again.
- `getItemLayout` is not possible (cards differ in height). Use `onScrollToIndexFailed` to scroll to an
  estimated offset and retry once.

### 7.6 The daily verse

In `Shloka.tsx`, `play()` plays `shloka.chant.url` with `playClip` when present. Otherwise it calls
`speak()` as today. Do the same for the line play buttons there: seek to the line's `start_ms` and pause at
its `end_ms`.

### 7.7 Background play (Phase 5, needs a build)

- In the `expo-audio` plugin in `app.json`, set `enableBackgroundPlayback` to `true`.
- In Chant mode, before playing, call `setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: "doNotMix" })`.
- On the playing player, call `setActiveForLockScreen(true, { title: source_ref, artist: book title })`
  (the v57 docs). Clear the lock-screen controls when Chant mode ends.
- Talk and the letters keep today's audio mode: set it back when leaving Chant mode.

---

## 8. Backend, part B: scoring recitations

### 8.1 Settings (`app/config.py`)

```python
scorer_url: str = ""            # https://... of gpu/asr/server.py; "fake" = canned results (tests and dev only)
scorer_key: str = ""            # sent as X-Scorer-Key; never logged
scorer_timeout_s: float = 25.0
scorer_max_seconds: int = 45    # Phase 0 may change it
quota_recite_seconds_per_day: int = 900
chant_voice: str = "vagdhenu-steer-2026-06-17"
chant_serve_statuses: str = "auto_ok,approved"
private_storage: str = "local"  # local | r2 | gcs | off
r2_private_bucket: str = ""
gcs_private_bucket: str = ""
```

Add `SCORER_URL`, `SCORER_KEY`, `R2_PRIVATE_BUCKET` and `GCS_PRIVATE_BUCKET` to the deploy script's env
and secret wiring the way `ADMIN_TOKEN` is wired. The owner fills in the values.

### 8.2 `services/scorer_client.py`

`async def score(audio: bytes, reference_lines: list[str], strict: bool, ref_audio_url: str = "") -> dict`
posts to `{scorer_url}/score` with httpx, the key header and the timeout. Errors are `ScorerError` (a
timeout, a connection error, or any non-200).

`scorer_url == "fake"`:
- every akṣara is green except the third, which is red with heard `"त"`;
- if the reference has fewer than 3 akṣaras, the status is `unclear`.

Allowed only when `settings.env` is a dev or test value. Refuse it in production. (Find how the app tells
dev from production; if nothing does, add `env: str = "dev"` and have the deploy script set
`ENV=production`.)

### 8.3 `POST /recite/score` (new `routers/recite.py`)

Multipart fields:
- `file`;
- `verse_uid`;
- `unit`: `"verse"`, `"line:<i>"` or `"lines:<a>-<b>"`;
- `mode`: `strict` (default) or `liberal`;
- `purpose`: `practise` or `recite`;
- `hide_level`: 0 to 3, information only.

1. Find the Shloka by `verse_uid` (indexed column). Return 404 if there is none.
2. Build the unit's reference from `chant_lines(shloka.devanagari)`. For `"verse"`, use every line except
   `kind == "speaker"`; for lines, use those indices.
3. Daily cap: sum `duration_ms` of the learner's `recite_attempts` for their local day
   (`services/localtime.py`). When it is over `quota_recite_seconds_per_day`, answer 429 with
   `{"detail": "Daily recitation time used up. Try again tomorrow.", "retry_after_s": ...}`.
   Use `services/audio_meta.estimate_seconds` for the upload's length.
4. If `scorer_url` is empty, answer 503 `{"detail": "Scoring is not available yet"}`.
5. Call the scorer. On `ScorerError`, answer 503 `{"detail": "Scoring is busy. Try again."}` and store
   nothing.
6. Map the bands (`green` to `ok`, `red` to `fix`, `amber` to `unclear`). Add tips (8.5), then store a
   `recite_attempts` row (8.4) without the audio. The audio bytes are dropped when the request ends.
7. If `purpose == "recite"` and `unit == "verse"`, schedule the review (8.6) and record activity: XP 10 for
   strict ≥ 90, XP 5 for 70 to 89, and nothing for lower or unclear.
8. Response:

```json
{
  "status": "scored",
  "percent": 93.8,
  "mode": "strict",
  "counts": {"ok": 30, "fix": 1, "unclear": 1},
  "lines": [{"i": 0, "aksharas": [{"t": "क", "band": "ok"}, {"t": "र्म", "band": "fix", "heard": "म"}]}],
  "tips": [{"kind": "retroflex_vs_dental", "text": "..."}],
  "perfect": false,
  "heard": "...",
  "review": {"verdict": "correct", "due_at": "2026-10-12T08:00:00+00:00"}
}
```

`status` is `"scored"` or `"unclear"` (then `percent` is null and `lines` is empty). `perfect` is true only
when strict percent is 100 and there is no `unclear` akṣara.

### 8.4 `recite_attempts` table (same migration family; a second revision is fine)

| column | type |
|---|---|
| id | Integer, primary key |
| learner_id | String(64), FK learners, index |
| verse_uid | String(16), index |
| unit | String(16) |
| purpose | String(16), `practise`, `recite` or `competition` |
| mode | String(8) |
| status | String(8), `scored` or `unclear` |
| percent | Float, nullable |
| n_ok, n_fix, n_unclear | Integer |
| bands | String(512): one character per reference akṣara, `o`, `f` or `u`, for the mistake history |
| duration_ms | Integer |
| competition_id | String(64), nullable, index |
| camera | JSON, nullable (11.4) |
| counted | Boolean, default false (competition only) |
| flags | JSON, default `[]` |
| created_at | DateTime, index |

No audio and no transcript in this table. Account deletion (`DELETE /me`) must delete these rows: follow
how `routers/me.py` deletes the learner's other rows.

### 8.5 Tips (`services/recite_tips.py`)

From the bands and heard akṣaras, at most three tips, most frequent first:

- If the target and heard akṣaras differ only by a pair in one of `pronunciation.SCORABLE_CONTRASTS`, use
  that contrast's kind and a short message. Write new messages; the old ones mention one letter, *ta*.
  For example: "Retroflex sounds: curl the tongue back for ट ठ ड ढ ण". The Devanagari in a tip comes from
  `SCORABLE_CONTRASTS`, never typed.
- Missing akṣaras, three or more in a run: "You skipped part of line 2."
- More than 20% `unclear`: "Some parts were hard to hear. Try a quieter place, closer to the phone."
- `perfect`: one tip, "Perfect".

### 8.6 The review schedule for verses

- On `recite` + `verse`, call `schedule_review(db, learner.id, f"verse:{verse_uid}", "verse", verdict)`.
  Verdict is `correct` at strict ≥ 90, `off_by_one` at 70 to 89, `incorrect` below 70, and `unsure`
  (nothing scheduled) when the result is unclear.
- `due_items` and `due_count` get an optional `kinds` argument. Their callers (`routers/review.py` and Home)
  pass the old kinds, so `GET /review/due` and the Home count do not change. Old phones never see
  `"verse"` items.
- `GET /recite/due` returns the learner's due verse items with `verse_uid`, `source_ref`, `due_at`, and the
  last strict percent from `recite_attempts`.

### 8.7 Tests (`backend/tests/test_recite.py`)

With `scorer_url = "fake"`:
- a scored verse;
- a line unit;
- the speaker line left out of a verse unit;
- an unclear result;
- 404 for an unknown `verse_uid`;
- 503 when `scorer_url` is empty and when the client raises;
- 429 after the cap (fake `duration_ms` rows);
- the review row and its verdicts;
- `/review/due` unchanged for old kinds;
- `/recite/due`;
- the tips;
- no audio stored anywhere (assert the storage was not called);
- account deletion removes attempts.

---

## 9. Phone, part B: the Learn screen

### 9.1 Route

`Recite: { verseUid: string; competitionId?: string; start?: "listen" | "practise" | "recite" }`, registered
in `App.tsx` next to `Book`, title "Learn". File `screens/Recite.tsx`; pieces in `components/recite/`;
pure helpers in `src/recite/`.

Entry points:
- Book: in Read mode, a "Learn" button next to Word by word; in Chant mode, the player bar button and a
  long-press on a card.
- Shloka (daily verse): a "Learn" button.
- Play hub: a new "Recite" tile, which opens `RecitePicker` (9.7).
- Competition screen (11.12).

The screen loads the verse from the `reader-verses` query that Book already uses: find it by `verse_uid`.

### 9.2 Three steps

A three-way switch at the top: Listen, Practise, Recite. Secondary buttons; the selected one is solid
`fill.ink`.

### 9.3 Listen

- The verse, lines from `chant.lines`.
- A big Play button plays the whole chant. Tapping a line plays just that line: seek to `start_ms`, pause
  at `end_ms + 150` ms.
- A "Line ×3" toggle repeats each line three times before the next.
- Speed as in 7.4.
- Without `chant`, show "No chant yet for this verse" and offer Practise and Recite anyway (scoring needs no
  chant).

### 9.4 Practise (text shown, line by line)

- For each line:
  1. Play the line.
  2. Record.
  3. Stop on tap or after 2.5 s of silence (metering).
  4. Send `unit = "line:<i>"`, `purpose = "practise"`.
  5. Show the result (9.6).
  6. Next line.
- At the end, "Whole verse" records the full verse (`unit = "verse"`, `purpose = "practise"`).
- **Hide words**, a four-step control, the Tarteel idea. The masking is a pure function in
  `src/recite/hide.ts`. Words are separated by spaces.
  - 0: the whole text;
  - 1: every second word replaced by its first akṣara and a dotted line;
  - 2: every word shown as its first akṣara only;
  - 3: nothing.

### 9.5 Recite (from memory)

- The text is hidden. Show the reference and the number of lines only.
- One recording for the whole verse, `unit = "verse"`, `purpose = "recite"`.
- If the chant is longer than 35 s, record and score it in two halves at the middle line boundary, and add
  the counts.
- "Eyes-closed test" switch (Phase 3; hidden until the native module exists): when on, the recording runs
  inside `EyesClosedTest` (10). For practice it is optional; for competitions it is required.
- After the result: "Try again", "Listen", and the next due verse when the learner came from the due list.

### 9.6 The result view (`components/recite/RecitationResult.tsx`)

- **Top.** The percent, large (or "Unclear, try again" for an unclear result), and the counts: "30 right ·
  1 to fix · 1 unclear". Not as pills: one line of text.
- **The text.** Each akṣara is a small column: the akṣara (Sanskrit, at least 18pt) and under it a symbol:
  - `✓` ok, in `fill.ok` colour;
  - `✗` fix, in `fill.bad` colour;
  - `?` unclear, in `fill.slate` colour.

  Under a `fix` akṣara, show "heard: X" in small text. Colour is never the only signal: the symbol carries
  it. Lines wrap.
- **Tips**: up to three lines of text.
- **Buttons**: "Play mine" (the local recording, before it is deleted) and "Play line" (the chant for the
  first line with a mistake).
- The accessibility label of each line reads: "Line 2: 14 right, 1 to fix, heard म for र्म".
- Delete the local recording file when the learner leaves the result.

### 9.7 `RecitePicker` (from the Play tile)

- Two sections. "Due to revise" comes from `GET /recite/due`; hide it on 404. "Recently practised" comes
  from local storage `shabd.recite.recent`, the last 10 `verse_uid`s.
- Under them, a "Choose a verse" button opens the Read shelf.
- Plain rows on the page with hairlines.

### 9.8 Pure helpers and `mobile/scripts/check-recite.mjs`

- `src/recite/chantClock.ts`: `lineAt(lines, tMs)`, with the "keep the previous line between lines" rule.
- `src/recite/hide.ts`: `mask(text, level)`. It splits on spaces only, and its akṣara split mirrors 6.4
  `aksharas`.
- `src/recite/bands.ts`: maps a response to display rows and accessibility labels.
- `check-recite.mjs` transpiles these with the project's `typescript` (`ts.transpileModule`, the way
  `check-kala.mjs` does) and asserts cases. Use strings copied from real verses, never typed from memory.
  Add it to the checks list in your hand-back.

### 9.9 Recording

- Use the `useVoiceInput.ts` preset (16 kHz mono AAC, `.m4a`), with `isMeteringEnabled: true` for the
  silence stop.
- Upload multipart with `FileSystem.uploadAsync` the way `uploadPronunciation` does (copy its shape).
- A red dot and a running timer show while recording. A short tone at the start and at the end comes from
  `expo-audio` with a bundled tone file. Apple 2.5.14 wants a visible or audible sign; give both.

---

## 10. Phone, part C: the eyes-closed test (Phase 3, needs a build)

### 10.1 Packages and config

- `npx expo install @react-native-ml-kit/face-detection` (2.0.1; check that it resolves for SDK 57) and
  `npx expo install expo-sharing` (for certificates, 11.7).
- In `app.json`:
  - change the `expo-camera` plugin text to "Allow Sanskritam to use the camera to read your handwriting and
    to check your eyes are closed while you recite. Photos stay on this phone.";
  - add `microphonePermission` to the same plugin with "Allow Sanskritam to hear your recitation so it can
    be scored.";
  - set `version` to `1.2.0` and `android.versionCode` to `5`.
- Say in your hand-back that this needs a new build. Don't build.
- At runtime, check `NativeModules.FaceDetection` before use, the way `photoRecogniser.ts` checks
  `TextRecognition`. If it is missing (an old build), the test shows "Update the app to use this", and
  competition entry is unavailable.

### 10.2 Consent first

The first time, show a sheet with these lines and two buttons, "Agree" and "Not now". Save
`shabd.recite.cameraConsent`. Ask the system camera and microphone permissions only after "Agree".
1. "The front camera checks that your eyes stay closed while you recite."
2. "Photos are read on this phone and deleted at once. No photo or video leaves your phone."
3. "Your recording is sent to be scored."

### 10.3 Before starting

1. A small front-camera preview (mirrored) at the top, so the learner can prop the phone and frame their
   face.
2. Every 700 ms, take a photo and run detection (10.4) until one face is found with both eyes open
   (probability over 0.6).
3. Then show "Ready" and a Start button.
4. Start plays a three-beep countdown, then a bell. From the bell, the learner recites with eyes closed.
5. It ends on a tap anywhere on the screen (a full-screen pressable, label "Finish") or after 4 s of
   silence. A second bell sounds at the end.

### 10.4 During the recitation

A loop, one photo at a time, never two at once:

1. `takePictureAsync({ quality: 0.2, shutterSound: false })` with `animateShutter={false}` on the
   `CameraView`. Leave `skipProcessing` false. The docs say `true` may give the wrong orientation; Phase 3
   measures both on the owner's phone and keeps `true` only if detection still works.
2. `FaceDetection.detect(uri, { performanceMode: "fast", classificationMode: "all", contourMode: "all" })`.
3. Delete the file at once (`expo-file-system` `deleteAsync`, idempotent).
4. Record a sample `{ t, faces, leftOpen, rightOpen, mouthGap }`.
   - `mouthGap` = the distance between the lip contours' midpoints (`upperLipBottom` and `lowerLipTop`)
     divided by the face frame height.
   - When a probability is missing, it is `null`.
5. Wait until 700 ms after the previous capture began, then loop.

### 10.5 The numbers sent

`src/recite/eyes.ts` (pure, tested in `check-recite.mjs`) turns the samples into:

```json
{"samples": 41, "interval_ms": 700, "face_ratio": 0.98, "eyes_closed_ratio": 0.93,
 "multi_face_ratio": 0.0, "mouth_moving_ratio": 0.71, "app_version": "1.2.0"}
```

- `face_ratio`: samples with exactly one face / all samples.
- `eyes_closed_ratio`: samples where both probabilities are present and both are below 0.3 / all samples.
  A missing probability counts as not closed.
- `multi_face_ratio`: samples with more than one face / all samples.
- `mouth_moving_ratio`: windows of 3 samples in which `mouthGap` changes by more than 0.02 / all windows.
  It is only a signal for the owner's review (11.4).

### 10.6 Pass rule (server side, 11.4)

`face_ratio >= 0.9`, `eyes_closed_ratio >= 0.85`, `multi_face_ratio <= 0.1`. The thresholds are settings
(11.9). The phone shows the outcome after the bell:
- "Eyes stayed closed";
- or "Your eyes opened. This try is not counted for the leaderboard";
- or "Face not seen. Prop the phone so the camera sees you."

### 10.7 What this check is and is not

It runs on the phone, so a changed app could fake the numbers. The owner's review of top entries (11.6) is
the backstop. Say so in the rules ("Entries may be checked"). An eyes-closed check cannot be passed by a
learner who cannot close their eyes or whose eyes are not detected. The rules give a contact for an
exception (11.13).

---

## 11. Competitions

### 11.1 Schedule

All times are in `competition_tz`, default `Asia/Kolkata`. Use `zoneinfo`; `tzdata` is in requirements.

| Kind | Opens | Closes | Results and certificates |
|---|---|---|---|
| `weekend` | Thursday 00:00 | Saturday 23:59:59 | Sunday `competition_results_hour`:00 (default 08:00) |
| `midweek` | Sunday 00:00 | Wednesday 23:59:59 | Thursday `competition_results_hour`:00 |

Store `opens_at`, `closes_at` and `results_at` in UTC. The phone shows times in the phone's time zone and
adds "IST" when that differs. Slug: `"<opening date>-<kind>"`, for example `2026-10-15-weekend`.

### 11.2 What is recited

- One verse per competition by default (`pieces` is a list, so several are possible later).
- `backend/app/seeds/competition_pieces.py` holds an ordered list of `source_ref`s.
  - The owner edits it. Start it with 20 well-known verses that already have chant audio and whose chant is
    35 s or shorter. Choose them from the database, not from memory.
  - The tick takes the next one not yet used, matching by `source_ref` and taking the row with served
    chant.
- The owner can override with the admin endpoint (11.11).
- If no piece is available, the tick creates no competition and logs a warning. The app then shows no
  competition, not an error.

### 11.3 Who may enter

Checked on every attempt:
- The learner is signed in with Google or Apple (`google_sub` or `apple_sub` not null). A guest sees "Sign
  in to enter".
- The learner has a public profile (11.9 `learner_public`) with:
  - a `public_name`: 3 to 24 characters; letters of any script, digits, space, `.`, `-`, `_`; unique
    ignoring case; not in a small reserved list (`admin`, `sanskritam`, `moderator`, `support`);
  - `age_confirmed_at` set (the learner ticked "I am 18 or older");
  - `rules_version` equal to the current rules version (11.13);
  - `recordings_consent_at` set ("Keep my best recording until 30 days after the results, so entries can be
    checked").
- Not `banned`.

### 11.4 Attempts and what counts

`POST /competitions/{id}/attempts` (multipart: `file`, `verse_uid`, `camera` as a JSON string, `hidden`
true/false):

1. Check the competition is `open` (else 409 "This competition has closed"). Check `verse_uid` is a piece.
   Check eligibility (else 403 with which step is missing: `sign_in`, `public_name`, `age`, `rules`,
   `consent`, `banned`). Check today's counted attempts are under `competition_attempts_per_day`
   (else 429).
2. Score as in 8.3 with `purpose = "competition"`, strict mode, `unit = "verse"`. Pass the verse's chant URL
   as `ref_audio_url`.
3. **Counted** only if all hold:
   - the result is scored;
   - `hidden` is true;
   - the camera numbers pass (10.6);
   - the app version is at least 1.2.0.

   Store the attempt with `counted` and a `why_not` reason when not counted (`unclear`, `text_shown`,
   `eyes_open`, `no_face`, `two_faces`, `old_app`).
4. If counted and better than the entry's best, update the entry:
   - `best_percent`, `best_at`, `best_attempt_id`;
   - flags from this attempt: `mouth_still` when `mouth_moving_ratio < 0.3`; `replay_suspect` when
     `replay_similarity` is over `competition_replay_threshold`, a threshold that stays 0 (off) until the
     owner sets it after Phase 4 measures it.
5. Recording: on a new best, store the audio with `store_private(bytes, f"competitions/{competition_id}/{entry_id}.m4a", "audio/mp4")`.
   - Delete the previous best's key.
   - If private storage is off, set the entry flag `no_audio` and carry on.
6. Response: the 8.3 result plus `{"counted", "why_not", "best_percent", "rank", "is_new_best"}`.

### 11.5 Leaderboard and tie-break

- Rank the entries with a counted best, not disqualified: by `best_percent` descending, then `best_at`
  ascending (whoever reached the score first ranks higher). Ranks are 1, 2, 3, ... with no shared ranks
  (the tie-break settles every tie).
- `GET /competitions/{id}/leaderboard?limit=50` returns
  `{"status", "rows": [{"rank", "public_name", "percent"}], "me": {"rank", "percent"} | null}`.
  Cache each competition's rows in memory for 30 s.
- The phone refreshes it every 60 s while the screen is open.

### 11.6 Results, hold and review

At `results_at` the tick publishes:

1. If any of the top 3 entries has a flag (`mouth_still`, `replay_suspect`, `no_audio`) that the owner has
   not cleared, set the status to `held`. The app shows "Results are being checked". Nothing is published.
2. Otherwise:
   - write `final_rank` on every entry;
   - create certificates for ranks 1 to 3 (11.7);
   - set the status to `published`.

The admin endpoints (11.11) let the owner listen, clear a flag, disqualify (`disqualified`, `dq_reason`)
and publish a held competition. Disqualifying re-ranks the rest before certificates are made.

### 11.7 Certificates

- **Table** `certificates`:
  - `code`, primary key: 10 characters of base32 from `secrets.token_bytes(7)`, upper case, no padding;
  - `kind`: `competition` or `monthly`;
  - `competition_id` (nullable for monthly), `month` (for example `2026-10`, nullable);
  - `learner_id`, `rank`, `public_name`, `piece_ref`, `issued_at`.
- **Phone**, `screens/Certificate.tsx`:
  - The page is cream with a deep `fill.maroon` border band. Large text: "Certificate" and
    "First place", "Second place" or "Third place". Then the public name, the competition ("Weekend
    competition, 15 to 17 October 2026"), and the verse in Devanagari from the database with its reference.
  - At the bottom: "Verify at <BASE_URL>/certificates/<code>".
  - "Share" uses `captureRef` (react-native-view-shot) to make a PNG, then `Sharing.shareAsync(uri)`
    (expo-sharing). Delete the temp file after sharing.
- **Server**: `GET /certificates/{code}` serves a small public HTML page, built like `routers/legal.py`'s
  pages: the name, the place, the competition, the date, "Issued by Sanskritam". It shows a 404 page for an
  unknown code. Register this route before the static `/` mount.

### 11.8 Master leaderboard and the monthly prize

- `GET /competitions/master?month=YYYY-MM` (default: this month in `competition_tz`) returns
  `{"month", "rows": [{"rank", "public_name", "wins", "seconds", "thirds"}], "me": ... | null, "winner": ... | null}`.
  - It counts final ranks in competitions whose `results_at` falls in that month.
  - Order: wins, then second places, then third places (all descending), then the earliest first win.
- After a month ends, the tick records the winner in `monthly_winners` (`month` primary key, `learner_id`,
  `public_name`, `wins`, `claim_code`, `created_at`) and creates a monthly certificate.
- The winner sees, on the master board and on Home: "You won October 2026. To claim your prize, email
  <prize_contact_email> with code <claim_code>." If `prize_contact_email` is empty, show "We will contact
  you in the app." Never hardcode an address.
- All-time: the same table over all months, without a winner.

### 11.9 Tables (migration)

- `competitions`:
  - `id`, `slug` (unique), `kind`;
  - `opens_at`, `closes_at`, `results_at`;
  - `pieces` (JSON list of `source_ref` and `verse_uid` pairs);
  - `status`: `scheduled`, `open`, `closed`, `held` or `published`;
  - `rules_version`, `created_at`, `published_at`.
- `competition_entries`:
  - `id`, `competition_id`, `learner_id`, `public_name` (a copy taken at entry);
  - `best_percent`, `best_at`, `best_attempt_id`, `attempts_counted`;
  - `flags` (JSON), `flags_cleared` (JSON), `disqualified`, `dq_reason`;
  - `final_rank`, `audio_key`, `created_at`, `updated_at`.
  - Unique on `(competition_id, learner_id)`.
- `learner_public`: `learner_id` (primary key, FK), `public_name` (unique index on its lower-case form),
  `age_confirmed_at`, `rules_version`, `rules_accepted_at`, `recordings_consent_at`, `banned`,
  `created_at`.
- `certificates` (11.7) and `monthly_winners` (11.8).

Settings:

```python
competition_tz: str = "Asia/Kolkata"
competition_results_hour: int = 8
competition_attempts_per_day: int = 10
competition_audio_days: int = 30
competition_min_face_ratio: float = 0.9
competition_min_eyes_closed_ratio: float = 0.85
competition_max_multi_face_ratio: float = 0.1
competition_replay_threshold: float = 0.0   # 0 = report only, until measured
competition_piece_max_ms: int = 35000
competition_rules_version: str = "2026-10-1"
prize_contact_email: str = ""
```

Account deletion removes the learner's `learner_public`, entries, certificates, attempts and private audio.
Published final ranks of others stay as they are.

### 11.10 The tick (`services/competitions.py`, `POST /admin/competitions/tick`)

Idempotent. Every function takes `now` (UTC) so tests can move time. In order:

1. `ensure_next(now)`: make sure a competition exists for the window that contains `now` and for the next
   window. Create each from the rotation (11.2) as `scheduled`.
2. `open_due(now)`: `scheduled` with `opens_at <= now` becomes `open`.
3. `close_due(now)`: `open` with `closes_at <= now` becomes `closed`.
4. `publish_due(now)`: `closed` with `results_at <= now` goes through 11.6.
5. `month_end(now)`: if a month has ended and has no `monthly_winners` row, compute and store it (11.8).
6. `purge(now)`: delete the private audio of entries whose competition's `results_at` is more than
   `competition_audio_days` ago. Clear `audio_key`.

Return a summary of counts. In `deploy/gcp/deploy.sh`, add a second Scheduler job, `sanskritam-competition-tick`,
calling `${URL}/admin/competitions/tick` every 15 minutes, in the same create-or-update form as the
content tick. The owner runs deploy.sh.

### 11.11 Endpoints

Learner (all need a learner token):
- `GET /competitions/current` returns `{"open": Competition | null, "next": Competition | null, "last": {"competition", "my_rank", "certificate_code"} | null}`.
  - A Competition is
    `{"id", "slug", "kind", "opens_at", "closes_at", "results_at", "status", "pieces": [{"source_ref", "verse_uid"}], "me": {"best_percent", "rank", "attempts_today", "attempts_left"} | null}`.
  - `last` is the most recent published competition the learner entered.
- `GET /competitions/{id}/leaderboard` (11.5).
- `GET /me/public-profile` and `PUT /me/public-profile` with
  `{"public_name", "age_confirmed", "rules_version", "recordings_consent"}`. Return 422 with a reason for a
  bad or taken name.
- `POST /competitions/{id}/attempts` (11.4).
- `GET /competitions/{id}/results`: top 10 with final ranks, `me`, and certificate codes for the top 3.
- `GET /competitions/master` (11.8).
- `GET /me/certificates`.
- Public: `GET /certificates/{code}` (HTML).

Admin (all need `X-Admin-Token`):
- `POST /admin/competitions`: `{"kind", "opens_at", "pieces": [source_ref...]}`. Creates or replaces a
  `scheduled` competition.
- `GET /admin/competitions/{id}/review`: the top 10 entries with `best_percent`, the camera numbers of the
  best attempt, flags, and an audio link to the endpoint below.
- `GET /admin/competitions/{id}/entries/{entry_id}/audio`: streams the private recording.
- `POST /admin/competitions/{id}/clear-flags` with `{entry_id}`.
- `POST /admin/competitions/{id}/disqualify` with `{entry_id, reason}`.
- `POST /admin/competitions/{id}/publish`.
- `POST /admin/public-names/{learner_id}/reset` (moderation: clears the name; the learner must choose
  again).
- `POST /admin/competitions/tick`.

Also give the owner a page at `GET /admin/review`: static HTML with a token field. It fetches the review
JSON with the header and shows audio players and the buttons. The token is never put in a URL.

### 11.12 Phone screens

- **Play hub** (`screens/Play.tsx`): a new first tile, a deep fill (`fill.teal`).
  - When a competition is open: "Competition", the piece's reference, "Closes in 1 d 4 h", your best and
    rank, and two buttons, "Learn" and "Enter".
  - Between competitions: "Next competition opens Thursday".
  - When results are newly out: "Results are out" and your place.
  - Hide the tile on 404.
  - Add the "Recite" tile (9.7) too.
- **Contest** (`screens/Contest.tsx`, route `Contest: { id?: string }`):
  - the piece (Devanagari) with Listen;
  - times;
  - your best and the attempts left today;
  - "Learn this verse" (opens Recite in practice);
  - "Enter" (runs the eligibility steps in order, then opens Recite with `competitionId` and `start: "recite"`,
    where the eyes-closed test is required);
  - the live leaderboard (top 50; your row as a deep fill);
  - links to the rules and the master board.
- **Eligibility steps** (sheets, one at a time): sign in, public name, "I am 18 or older", the rules (a
  scroll and "I accept"), the recordings consent. Each is saved to the server before the next.
- **ContestResults** (`screens/ContestResults.tsx`): the top 3 as three rows with deep fills (first
  `fill.gold`, second `fill.slate`, third `fill.rose`, each with a place label in words, not only colour),
  then ranks 4 to 10, then your place, then "Certificate" for a top-3 learner.
- **MasterBoard** (`screens/MasterBoard.tsx`): this month, last month, all-time; the winner line (11.8).
- **Certificate** (11.7). **ContestRules** (11.13).
- **Home**: when `GET /competitions/current` has `last` published within 3 days, a card "Results are out:
  you came 2nd" opens ContestResults. Keep Home's existing order; put it after the goal ring.

### 11.13 Rules text (`ContestRules` and `GET /competitions/rules`)

Store the text on the server (`services/competition_rules.py`) with `competition_rules_version`, so the
owner can edit it without an app update. The phone shows it as numbered points. Draft (the owner must
approve and fill the blanks):

1. Sanskritam runs these competitions. Apple and Google are not sponsors and are not involved in any way.
2. Entry is free. No purchase is needed, and buying Plus does not help you win.
3. Open to people aged 18 or over who sign in with Google or Apple. One account per person.
4. Two competitions a week, in Indian Standard Time:
   - Thursday 00:00 to Saturday 23:59, results on Sunday at 08:00;
   - Sunday 00:00 to Wednesday 23:59, results on Thursday at 08:00.
5. Each competition has a set verse. Recite it from memory with the text hidden and your eyes closed. The
   front camera checks your eyes on your phone; no photo leaves your phone.
6. Each recitation is scored by speech recognition, syllable by syllable. Your best counted score is your
   entry. If two scores are equal, whoever reached it first ranks higher.
7. You may make up to 10 counted attempts a day.
8. The top 3 in each competition get a certificate. The person with the most first places in a calendar
   month wins that month's prize: ____. We announce the winner in the app within 3 days of the month end
   and send the prize within ____ days.
9. Your best recording is kept until 30 days after the results so entries can be checked, then deleted.
10. Entries may be checked. Playing a recording, someone else reciting, reading the text, or using more than
    one account means disqualification. Our decision is final.
11. If you cannot take the eyes-closed check for a reason such as a disability, write to ____ and we will
    find another way.
12. Questions: ____.

### 11.14 Privacy page and DECISIONS.md

- `routers/legal.py` privacy page: add a section "Recitation and competitions" with these points (the owner
  approves the wording):
  1. Recordings are sent to our scoring server and deleted after scoring.
  2. Competition entrants' best recordings are kept for 30 days after results.
  3. Camera photos for the eyes-closed check are read on the phone and deleted at once; none leaves it.
  4. The public name and scores are shown on leaderboards.
  5. Competitions are for people aged 18 and over.

  The page today says the app is not for under-13s (*read* 2026-10-04). Flag that clash with DPDP in your
  hand-back. Don't change the age line yourself.
- Add a DECISIONS.md entry at the end, "2026-10-xx: Recite, chanted verses and competitions", recording:
  - section 1;
  - the self-hosted models on rented GPUs (the reversal of the API-only rule, "for now", owner's words);
  - the one raw-audio exception;
  - leaderboards now decided;
  - the licences and the professor's permission;
  - the defaults in section 1 that are still the owner's to change.

### 11.15 Tests (`backend/tests/test_competitions.py`)

Use a fixed clock (`now` arguments). Use real `zoneinfo` with `Asia/Kolkata` and convert by hand in the
test comments.

- **Windows**: a Wednesday 23:59 IST is still midweek; Thursday 00:00 opens the weekend competition;
  Saturday 23:59:59 is open; Sunday 00:00 is closed and the midweek one opens; results at Sunday 08:00 and
  Thursday 08:00.
- **ensure_next** creates exactly two and is idempotent.
- **Eligibility**: each step's 403.
- **Counted rules**: hidden false, eyes open, two faces, unclear, old app, the daily limit.
- **Best and rank**: the tie-break by `best_at`.
- **Hold**: flags in the top 3 hold; clearing them publishes.
- **Disqualify** re-ranks; certificates go to ranks 1 to 3 only.
- **Monthly**: the winner is chosen by wins, then seconds, then thirds, then the earliest first win.
- **Purge** deletes private audio after the configured days.
- **Account deletion** removes the learner's competition data.
- The public certificate page returns 200 and 404.
- The fake scorer is used throughout; no real network.

---

## 12. Not in this work

- Tanpura drone. It needs a recording the owner has the rights to; the one in Bhāgavata-VāNi's repo has no
  licence.
- Vedic svara chanting. Vāgdhenu has no svaras.
- Highlighting syllable by syllable. Lines only.
- The graded reader tiers (`graded-1..3`): they are prose sentences, and Vāgdhenu's prose voice drops
  word-initial syllables (a comment in the author's tutor code).
- An under-18 parental-consent flow. Payments of prizes in the app. Push notifications (results show in the
  app; wire push when the owner fixes FCM). A separate app.
- Voice matching between attempts (speaker identity). Any use of the camera beyond eyes open or closed and
  face count.
- Changing Talk, Ask, letters or grammar audio. They stay on Sarvam.

---

## 13. Order of work and checks

Finish a phase, run all checks in section 0, write a short note in `handover_recite_result.md`, then start
the next phase. If the owner has not run the GPU part of a phase, carry on with the parts that do not need
it and say so.

**Phase 0: foundations (you), then measurements (owner on vast.ai)**
1. `chant_text.py`, `verse_uid`, the migration for `shlokas.verse_uid` and `verse_audio`, and their tests.
2. `chant_export.py` with `--sample`. Run it on the local database and put the counts in the hand-back.
3. `gpu/` folder: config, `setup_vast.sh`, `asr/scoring.py` with its tests, `asr/sushrota.py`,
   `tts/render_jobs.py`, `asr/qc_renders.py`, `assemble.py`, `phase0.py`, README.
4. The owner runs section 14 steps 1 to 4 and sends `phase0.json` back.
5. **Acceptance:**
   - our CER on `in_the_wild_test` is within 0.5 points of 4.36%;
   - the 20 sample verses render;
   - the owner listens to the sample and sets the QC thresholds;
   - `scorer_max_seconds` is set from the latency numbers;
   - the owner picks the scorer host (GPU or CPU, 14 step 7).

**Phase 1: chanted verses and karaoke**
1. `/shlokas` `chant`, storage `content_type`, `chant_import.py`, licence rows, and their tests.
2. Phone: types, the Read and Chant switch, `ChantList`, `ChantPlayer`, auto-scroll, the daily verse change,
   `chantClock.ts`, `check-recite.mjs`.
3. The owner renders all books (14 step 5), reviews, imports.
4. **Acceptance:**
   - with at least 20 imported verses on a local backend, Chant mode plays a book end to end, skipping
     verses without chant;
   - the lit line changes within 150 ms of each `start_ms` (log `currentTime` at each change in a dev build
     and compare);
   - the switch remembers its mode; Reduce Motion scrolls without animation; the old app is unaffected
     (`/shlokas` still validates for it).

**Phase 2: scoring and the Learn screen**
1. The scorer service and Dockerfiles. `scorer_client.py` (with fake mode), `/recite/score`,
   `recite_attempts`, tips, the review schedule, `/recite/due`, and their tests.
2. Phone: the Recite screen (Listen, Practise with Hide words, Recite), the result view, RecitePicker, the
   Play tile, the entry points.
3. **Acceptance:**
   - all tests pass with the fake scorer;
   - against the owner's running scorer, a correct recitation of Gītā 2.47 by the owner scores 90 or more;
   - the same recitation with one line skipped shows that line's akṣaras as "to fix";
   - an empty recording is unclear, never a low score.

   (The owner does these on a phone; record what they report.)

**Phase 3: the eyes-closed test**
1. Packages, `app.json` changes, version 1.2.0 and versionCode 5, consent, pre-check, the loop, `eyes.ts`
   with its checks.
2. The owner builds and tries on a phone.
3. **Acceptance:**
   - the measured capture-and-detect interval on the owner's phone (report it);
   - eyes closed for a whole recitation gives `eyes_closed_ratio` of 0.85 or more;
   - opening the eyes for half the time gives less than 0.85;
   - covering the camera gives `face_ratio` near 0;
   - no photo files remain in the cache folder afterwards (list it).

**Phase 4: competitions**
1. Tables, the tick, endpoints, admin endpoints and page, certificates, master board, rules and privacy
   drafts, deploy.sh job, DECISIONS entry, and their tests.
2. Phone: Play tile, Contest, eligibility steps, ContestResults, MasterBoard, Certificate, ContestRules,
   Home card.
3. **Acceptance:**
   - the time-travel tests pass;
   - on a local backend with a fake scorer and a test clock (an admin-only `now` override, allowed only
     when not production), a full cycle runs: open, three learners' attempts, close, hold on a flag, clear,
     publish, certificates, the master board;
   - measure `replay_similarity` for (a) the chant played from a second phone into the recording phone and
     (b) the owner reciting, ten of each, and report both so the owner can set
     `competition_replay_threshold`.

**Phase 5: polish (when the owner asks)**
Background play and lock-screen controls (7.7). Push, once FCM is wired.

---

## 14. For the owner: runbook

1. **The machine.** Use the GB10 you already rent (`ssh spark`; section 6 lists what is on it). It has the
   disk (235 GB free; this needs about 30 GB) and the memory (about 64 GB free; this needs under 10 GB).
   - Its GPU is shared with ComfyUI. Run Phase 0 alongside it. Start the full render when your ComfyUI
     batch is done, or accept that both run slower.
   - Nothing on it has to stop.
   - For the scorer, which receives users' voices, choose a datacenter host, not a home machine. Check
     which kind this host is in its vast.ai listing.
2. **Copy** the repo's `gpu/` folder and `chant_jobs.jsonl` (from `python -m scripts.chant_export`) to the
   machine. Never copy `.env`, `vertex_credentials.json` or any key.
3. **Set up.** `bash gpu/setup_vast.sh` (about 20 to 40 minutes, *not verified*).
4. **Phase 0.** `python gpu/phase0.py --jobs chant_jobs_sample.jsonl --out gpu_out`, then send
   `gpu_out/phase0.json` back. Listen to the 20 sample verses in `gpu_out/review.html`
   (`cd gpu_out && python -m http.server`, then open the address it prints).
5. **Render everything.** In `tmux`:
   1. `render_jobs`;
   2. `qc_renders`;
   3. `render_jobs --reseed`;
   4. `qc_renders`;
   5. `assemble`.

   The README has the exact lines. Estimate (arithmetic from 2.1 and 2.5, *not verified* on the rented
   card): about 3.5 to 4.5 hours of chant, so about 4.5 to 5.5 GPU-hours for one take of every line at the
   A6000's speed, plus reseeds for the flagged share (about 5% in the author's Bhāgavatam run).
6. **Review and import.** Download `gpu_out/` to your PC.
   1. Open `review.html` the same way, approve or reject, and download `decisions.json`.
   2. Then `cd backend && python -m scripts.chant_import --manifest ../gpu_out/manifest.jsonl --audio ../gpu_out/audio --decisions ../gpu_out/decisions.json`
      (dry run).
   3. Then the same with `--live`, using your R2 settings and pointing `DATABASE_URL` at production when
      you are ready.
7. **Scorer.** After Phase 0's latency numbers, run `gpu/asr/server.py` (or `Dockerfile.gpu`) on a
   datacenter GPU host, or `Dockerfile.cpu` on a CPU host if CPU was fast enough.
   - Put HTTPS in front of it, for example a Cloudflare Tunnel. Never expose port 8090 openly.
   - Set `SCORER_URL` and `SCORER_KEY` in the backend's deploy env.
8. **Deploy** the backend (it runs the migrations), then run `deploy.sh` so the competition tick job exists.
9. **Build** the app (1.2.0) when Phase 3 is in. The camera test and certificate sharing need it.
10. **Before the first competition:**
    - approve the rules and privacy text;
    - set `prize_contact_email`;
    - fill the piece list;
    - decide the defaults in section 1;
    - keep the professor's permission email on file.

---

## 15. Hand-back

Write `handover_recite_result.md` next to this file, and update it after each phase:
- every file changed or added;
- what was *run* (tests with counts, the checks, the export counts, anything measured), what was *read*,
  and what is *not verified*;
- which phases are done and which wait for the owner (with the exact step in section 14);
- every default from section 1 as built, so the owner can change it;
- anything in this file you changed your mind about, and why;
- open questions for the owner.

---

## Sources checked

Read on 2026-10-08 and 2026-10-09 unless marked:
- https://prathosh.in/sanskrit-complinguistics.html, https://prathosh.in/vagdhenu/ (the "non-Vedic chants"
  request), https://prathosh.in/vagbodhini/
- https://github.com/prathoshap/vagdhenu: `README.md`, `LICENSE`, `src/render_core.py`, `src/render.py`,
  `src/limits.py`, `src/tts_meter.py`, `src/reference_bank/bank.json`, `scripts/setup.sh`,
  `requirements.txt`, `docs/TECH_REPORT.md`
- https://huggingface.co/prathoshap/vagdhenu (card, `THIRD_PARTY_NOTICES.md`)
- https://github.com/prathoshap/sushrota-sanskrit-asr: `README.md`, `docs/VAGBODHINI_2026-07-13.md`,
  `vagbodhini/app_practice.py`, `scripts/finetune_ctc.py`, `scripts/cpu_bench.py`
- https://huggingface.co/prathoshap/sushrota-sanskrit-asr (card),
  https://huggingface.co/datasets/prathoshap/sushrota-sanskrit-asr-data (card)
- https://huggingface.co/ai4bharat/indicconformer_stt_sa_hybrid_ctc_rnnt_large (MIT, gated)
- https://pypi.org/project/nemo-toolkit/ (2.7.3 exists)
- https://docs.expo.dev/versions/v57.0.0/sdk/audio/, https://docs.expo.dev/versions/v57.0.0/sdk/camera/
- https://github.com/a7medev/react-native-ml-kit: `face-detection/index.ts`, Android module; npm
  `@react-native-ml-kit/face-detection` 2.0.1, `expo-sharing` 57.0.22
- https://developer.apple.com/app-store/review/guidelines/ (5.3, 2.5.14, 5.1.2)
- https://support.google.com/googleplay/android-developer/answer/9877032 (Real-Money Gambling, Games, and
  Contests)
- The DPDP Act 2023, MeitY PDF (read 2026-10-04)
- The Promotion and Regulation of Online Gaming Act, 2025, as published on 22 August 2025:
  https://www.meity.gov.in/static/uploads/2025/08/dd5d971e6e54b3949f57cee34c8e5026.pdf (sections 1, 2, 5,
  9). The India Code copy (https://www.indiacode.nic.in/bitstream/123456789/22148/1/a2025-32.pdf) timed
  out.
- Hugging Face file sizes (API, `?blobs=true`) for `prathoshap/vagdhenu`, `prathoshap/sushrota-sanskrit-asr`,
  `prathoshap/sushrota-sanskrit-asr-data`, `nvidia/bigvgan_v2_24khz_100band_256x`, `charactr/vocos-mel-24khz`
- The owner's vast.ai machine over SSH, with read-only commands only (`nvidia-smi`, `free`, `df`, `ps`,
  versions), 2026-10-09
- This repo's code as cited in each section
