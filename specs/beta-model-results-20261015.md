# Sanskrit beta and model comparison — 15 October 2026

## Decision

Keep Gemini Flash as the existing answer baseline. Gemma via Sarvam V2 is the
strongest candidate from this sample for a fast composed voice tutor, but is
available as a Voice Lab choice rather than silently replacing production.
Retain the existing Sarvam conversational V1 route. Do not route every request
to a reasoning model merely because the account has access.

Implementation and the free/paid launch proposal are in
[the experience plan](experience-improvements-20261015.md).

## Budget and evidence

The cumulative conservative accounted upper bound is **INR 43.26494 Sarvam and
USD 0.6039462 Google**, against the owner's INR 300 / USD 2 caps. This is a
local reservation ledger, not a vendor invoice; actual charges may be lower.
Timeouts and calls without reported usage retain their full reservation.
The runner does not reset allowances between invocations. No further paid tests
are necessary for this change.

Raw artifacts are at repository-root `results/beta-20261015/`:

- `budget.json`: cumulative ledger, including retries and streaming reservations.
- `report.json`: individual prompts/results, checks, latency, speech transcripts,
  and voice output before/after adding the grammar-engine context.
- `sanskrit-0.wav` through `sanskrit-2.wav`: synthetic native-Sanskrit smoke audio.
- `daily-loop-phone.png`: actual new components at 390 × 844 in Chromium.
- `web-build/`: locally exported application bundle.

The runner is `backend/scripts/bench_beta_routes.py`. It reserves before calls,
uses an exclusive lock, bounds tokens/time, and preserves completed results.
It does not write learner data to a production database or change cloud billing.

## Comparison

The authored sample contains 29 cases: 12 generation, 13 diagnosis, and 4
translation cases, including singular/dual/plural controls. Each model also had
six successive tutor turns with mixed scripts/languages, and three grounded Gita
passage explanations. Existing case caches can be reused during resumption.

“Returned cases” means a nonempty response without a provider error. It is not
an accuracy score. “LLM tutor replies” excludes the tutor's degraded fallback.
The grounded checks require exact source quotation, exact reference, and a
nonempty summary; interpretation still requires human review.

| Model / route | Returned authored cases | LLM tutor replies | Tutor median | Grounded checks |
| --- | ---: | ---: | ---: | ---: |
| Sarvam 105B conversations / V1 | 29/29 | 6/6 | 0.78 s | 3/3 |
| Sarvam 105B / V2 | 13/29 | 0/6 | 11.14 s | 1/3 |
| Gemma4 / V2 | 29/29 | 6/6 | 0.83 s | 3/3 |
| DeepSeek V4.1 Flash / V2 | 26/29 | 6/6 | 7.99 s | 3/3 |
| GLM 5.3 / V2 | 29/29 | 6/6 | 4.13 s | 0/3 |
| Gemini 3.8 Flash / Vertex | 25/29 | 6/6 | 6.95 s | 3/3 |
| Gemini 3.7 Flash / Vertex | 26/29 | 6/6 | 3.32 s | 2/3 |

All six tutor-contract checks passed except Sarvam V2 105B (5/6). That apparent
5/6 masks six degraded replies; contract-only scoring is insufficient.

Specific findings:

- Gemma completed all authored cases. Generated grammar features fully matched
  in 11/12 cases; the basic Sanskrit gate passed 12/12. Existing conversational
  V1 fully matched features in 10/12 and passed that gate 12/12.
- Sarvam V2 105B exhausted its bounded output allowance without visible content
  on 16 authored cases. Giving it a much larger reasoning budget would change
  cost and latency; this sample does not establish that the model is incapable.
- DeepSeek had two 45-second timeouts and one output-limit failure. GLM had a
  generated Sanskrit gate failure and returned literal placeholder ellipses in
  grounded JSON. Successful transport alone does not establish useful teaching.
- Gemini 3.8 had four authored-case timeouts. Gemini 3.7 had two timeouts and
  one 429; another grounded request timed out. These small sequential runs are
  affected by service load and quota. They are not a controlled throughput test.
- Tutor guards preserved accepted inputs, including script variants. The sample
  is too small to certify dialects, every grammar error, or pedagogical quality.
- The grounded prompts use supplied corpus text and meaning. They do not test
  live web research, every commentary tradition, OCR, or all Ask app behavior.

## Native speech and actual streaming

Three synthetic source sentences completed native Bulbul v3 synthesis and STT.
One transcript matched verbatim. The other two rendered final `म्` as anusvara
before the next consonant (`ग्रामम्` → `ग्रामं`, `जलम्` → `जलं`). Exact-string
mismatch here is not sufficient evidence of a pronunciation error. WAV durations
were approximately 2.73, 2.65 and 2.05 seconds. Human listening is still required.

The streaming pass ran the actual composed Voice Lab session: LLM SSE → clause
splitting → Bulbul native-Sanskrit WebSocket → PCM output. Input was authored
text, not a microphone recording. Filler phrases were disabled to measure actual
reply output. The grammar engine's acceptance/context was added after the first
pass showed unnecessary corrections of a correct sentence.

| Reply model | Final streamed output | Time to complete |
| --- | ---: | ---: |
| Sarvam conversational V1 | 19 audio chunks | 3.10 s |
| Sarvam 105B V2 | 20 audio chunks | 16.48 s |
| Gemma4 V2 | 12 audio chunks | 1.69 s |
| DeepSeek V2 | 25 audio chunks | 7.16 s |
| GLM V2 | 37 audio chunks | 4.09 s |

These are whole-turn completion times, not first-audio latency. Reply lengths
differ. Every final pass emitted audio and completed; this does not make every
reply correct. Sarvam 105B emitted romanized text despite the Devanagari prompt,
and GLM's Sanskrit phrasing still needs review. The previous raw pass remains
in the report. Gemma's retest continued the conversation without correcting the
accepted input. One retest does not prove the problem is eliminated globally.

Sarvam V2 chat is additive; only content deltas are spoken, never reasoning.
Voice Lab now exposes these five reply models for composed pipelines. Gemini
native Live remains a separate experiment. The Responses endpoint was reviewed
but is not required by this implementation and was not separately load-tested.

## Local verification

- Mobile TypeScript: passed.
- Playback regression: passed, including every game-route synthesis block,
  language-code normalization, transport focus, pause/resume and stale completion.
- Progress regression: passed, including migration, simultaneous writes, account
  isolation, offline persistence and stale-response protection.
- Offline reading: passed chapter isolation, restart persistence, audio URL
  deduplication, missing-file fallback and download-limit checks with mocked files.
- Recitation: 110 checks passed. Existing call-audio and contrast checks passed.
- Chromium duplex audio: passed, including pause/resume, chunks arriving while
  paused, interruption, capture cleanup and restart.
- Browser UI: passed goal selection, real due count, lesson routing, visible
  floating controls, pause/resume/minimize/expand, and controls inside a dialog.
- Expo web export: passed. This is a local build, not a deployment.
- Focused backend suites cover native speech, V1/V2 routing, content-only SSE,
  learning-state merging/access control, budgets, evaluation, and audio rendering.
  Final combined result: **166 passed**.
- Final REST TTS-default/cache/quota/budget regression run: **50 passed** (overlaps
  the focused suite). Mobile API and backend request defaults both use `sa-IN`.

The broad backend run initially reported **2,008 passed, 16 skipped, 7 failed**.
The native-speech expectation and filler ordering were fixed and retested. The
Windows subprocess encoding check passes with `PYTHONUTF8=1`.

A focused corpus rerun still reports **32 passed, 4 failed**. These concern
separate pre-existing corpus/catalogue changes and were left for that work:

1. `test_clean_wiki_markup`: Latin `b` is stripped although the test expects it.
2. `test_a_verse_that_opens_with_atha_and_carries_its_number_is_kept`: number lost.
3. `test_the_verse_number_keeps_its_separator`: separator/number changed.
4. `test_13_canon_seed_51_rows`: test expects Plus for a now-free catalogue entry.

Do not describe the entire repository as passing. Physical Android/iOS,
Bluetooth, background interruptions, store purchases, managed Voice Agents and
human pronunciation evaluation remain future release checks. The backend's new
`20261015_learning_state` migration must be applied through the normal deployment
before relying on cross-device sync. This initial evaluation stopped before
publication; the subsequent owner-authorized deployment, migration and OTA are
recorded in [the release record](production-release-20261015.md).
