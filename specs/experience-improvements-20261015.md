# Sanskritam: experience improvements and model evaluation

Owner decisions: 15 October 2026. This document consolidates the app review,
implementation, launch economics, and the work deliberately reserved for later.

## Scope agreed for this change

- Use the newly enabled Bulbul v3 Sanskrit beta (`sa-IN`) for Sanskrit speech.
  Continue accepting multiple input languages and speaking bridge-language text
  in its own language. Do not route Hindi explanations through Sanskrit TTS.
- Remove speech synthesis from games, including card flips.
- Provide a floating pause/resume/minimize control for spoken and recorded audio.
- Evaluate Sarvam conversational V1, Sarvam V2, Gemma, DeepSeek, GLM, and Gemini
  Flash before deciding whether to change the working answer provider.
- Keep the existing Practice, conversation, and Voice surfaces separate.
- Keep all seven navigation tabs.
- Implement the daily learning loop and its supporting progress/offline behavior.
- Production billing is accepted as configured. Testing has a cumulative maximum
  of **INR 300 Sarvam and USD 2 Google Cloud** for this work.
- Initial implementation stopped before publication. The owner subsequently
  authorized commit, push, backend deployment and production OTA; see
  [the release record](production-release-20261015.md). No new native build was requested.

## Implemented locally

### Native Sanskrit speech

- Backend Sanskrit TTS defaults to `sa-IN`; the deployment script explicitly
  applies that setting on the owner's next deployment.
- The authoring pipeline and the three audio-render scripts default to Sanskrit.
- Voice Lab offers `sa-IN` and defaults composed speech to native Bulbul v3.
  Guru, Mother, and Scholar presets no longer use Hindi/Telugu/Kannada to imitate
  Sanskrit. Friend retains its separate Gemini native-audio experiment.
- Native Sanskrit bypasses visarga expansion, schwa hints, and transliteration.
  Legacy experimental voices remain available only when explicitly selected.
- Talk's multiple-language recognition path is retained. TTS access does not
  prove that Sanskrit auto-detection has stopped translating away learner errors.
- Existing stored recordings are not regenerated in bulk. These are historical
  audio assets, not new TTS requests; a full re-render requires its own budget.
- Sanskrit reading is not advertised as accurate Vedic chanting. Existing chant
  recordings remain separate from generated spoken reading.

### Games

- Memory-card flips no longer trigger `playLetter` or live TTS.
- Number Builder no longer requests synthesized speech or offers its ineffective
  synthesis button.
- A central speech policy blocks live synthesis on the game routes, including
  a pending request trying to start playback after navigation into a game.
- Explicit playback of an existing listening-question recording remains allowed;
  it does not synthesize a card or answer. Short feedback sounds remain effects.
- General learning challenges remain learning exercises; their explicit prompt
  playback now uses the actual prompt language instead of always Hindi.

### Shared floating audio transport

- Speech, alphabet clips, reading/chant playback, individual recitation lines,
  verse practice, community voice notes, embedded lesson videos, and streaming
  Voice Lab replies register with one transport.
- Controls remain visible while paused, offer resume, and minimize to a compact
  control. Expanding does not restart audio or make a provider request.
- Ownership tokens prevent a late completion from hiding a newer player's bar.
- Starting another source pauses the previous registered source.
- Speech backstop timers stop while playback is paused.
- Streamed-audio pause preserves the Web Audio timeline. Additional incoming
  chunks do not automatically resume it. Resume plays from the existing queue.
- The Ask sheet places controls above its composer. The Ask bubble leaves room
  for the audio bar. The older chant mini-player does not duplicate the new bar.
- Native dialogs use a shared modal wrapper with their own audio controls, since
  an app-root overlay cannot appear above a separate native modal window.
- Community calls retain their existing call controls; a call is not a replayable
  recording. Brief notification rings and UI/recitation cues remain effects.
- Native handset audio, Bluetooth, background interruption, and layout still need
  release-device verification. Browser audio checks do not certify handset echo
  cancellation or a Sanskrit teacher's pronunciation assessment.

### Daily learning loop

- Home asks the learner to choose Speak Sanskrit, Read texts, or Recite.
- The daily card offers Continue learning, Continue reading, or Practise a verse.
- Reading resumes the saved book, chapter, and verse. Lessons resume an unfinished
  card lesson or offer the next unread lesson.
- A separate daily review screen loads real due lesson steps and submits them
  through the existing grading/scheduling endpoint. It does not invent mastery.
- A card lesson offers practice using its unit's actual grammar features.
- Short practice retains the existing adaptive challenge selector.
- Friend practice links to the existing opt-in weekly cooperative goal; no AI
  messages are automatically posted to a group or sent to another person.
- Read completion and visited tools are tracked separately from graded mastery.
  Reading alone is not evidence that the learner can use the grammar.

### Progress and offline use

- Lesson read marks, trail visits, story bookmarks, grammar read marks, reading
  positions, and the selected learning goal are scoped to the learner account.
- A small authenticated learning-state endpoint reconciles these marks. Reading
  positions use individual book/chapter keys; trail visits merge as a union.
- Old unscoped bookmarks migrate to the first account on this installation only.
  They are not copied into every subsequent account.
- Local writes survive network errors; synchronization retries on later writes
  and when the app returns to the foreground. Old servers can return 404 without
  discarding local progress. Late responses cannot overwrite another account.
- A cached profile preserves an existing login during a network outage.
- Book controls offer Save text offline and, for prepared chants, Download audio.
  Saving does not ask an LLM or synthesize any audio.
- Saved reading has its own screen reachable from Home. A downloaded chapter
  can open without the live catalogue, including after restarting the app.
- Audio downloads are explicit, use device document storage, and reject more
  than 100 clips or over 100 MB in one request. Unavailable/unknown download sizes
  leave saved text available. Downloaded audio is preferred when its file exists.
- Grade submission still requires connectivity. Failed submissions preserve input;
  offline reading does not pretend to award server-confirmed XP or mastery.

Backend migration: `20261015_learning_state` (adds nullable JSON on Learner).
Run the normal owner-managed backend deployment before relying on cloud sync.

## Model evaluation

Runner: `backend/scripts/bench_beta_routes.py`.
Output: `results/beta-20261015/` at the repository root.
Summary: `specs/beta-model-results-20261015.md` after the run completes.

Models are evaluated on existing authored cases, not Sanskrit invented for this
change: generation, deliberate errors, correct-answer controls including duals,
translation, and successive tutor turns. A second pass evaluates grounded passage
explanations using the local corpus. Exact quote/reference checks do not establish
the correctness of every interpretation; the saved prose remains reviewable.

The V2 adapter is additive (`sarvam_v2:<model>`). It preserves V1 conversational
traffic and uses low reasoning effort for DeepSeek/GLM. No default answer-provider
switch is made from this small sample; Gemini Flash remains the answer baseline.
Composed Voice Lab pipelines expose the five Sarvam reply models for comparison.
Accepted learner sentences carry the grammar engine's context into streaming
prompts so the model is instructed not to invent corrections. This remains a
prompt safeguard, not proof that every response is grammatically correct.

The ledger reserves a conservative upper bound before each live call. Completed
calls with reported usage reconcile to a conservative token-priced amount;
timeouts/missing usage retain the full reservation. Reasoning tokens and retries
count. Both bounds are enforced cumulatively across reruns, with an exclusive
runner lock. Do not delete the ledger to reset the testing allowance.

Commands, from `backend/`:

```powershell
.venv/Scripts/python.exe -B -m scripts.bench_beta_routes
.venv/Scripts/python.exe -B -u -m scripts.bench_beta_routes --live
.venv/Scripts/python.exe -B -u -m scripts.bench_beta_routes --live --answers-only
.venv/Scripts/python.exe -B -u -m scripts.bench_beta_routes --live --voice-stream-only
```

Completed testing is conservatively accounted at INR 43.27 Sarvam / USD 0.61
Google. Detailed outcomes and remaining test failures are in the results document.

## Launch model reserved for later

The INR 25,000 Sarvam balance is a one-time launch resource. The three Google
benefits provide USD 10/account/month; count only credits actually redeemed to
the billing account serving a workload. Prices must remain viable without them.

Recommended initial commercial test, not implemented or published:

| Capability | Free | Proposed Plus, INR 299/month |
| --- | --- | --- |
| Lessons, grammar, vocabulary, existing free texts, prepared practice | Included | Included |
| Live tutoring | 10 welcome replies once, then 5/month | 100 replies/billing month |
| Newly generated text Ask answers | 5/month | 50/month |
| Stored explanations and deterministic grammar help | Included | Included |
| Personal review | Standard scheduled practice | Session correction summaries and targeted follow-up |
| Heavy voice/research | Separate future allowance | Separate future allowance |

A replay and a failed request should not consume another learner reply. Exact
recording/output limits and scoring allowances require real-user usage data.
Do not advertise unlimited live AI, an annual plan, or a lifetime AI plan yet.

Illustrative unit economics, before salaries/marketing: INR 209 usable receipts
per INR 299 subscriber after a 30% planning reserve; INR 70 average paid-user
variable cost; INR 5 average active-free-user cost; INR 1,500 fixed costs/month.

| Monthly active users | Paying conversion | Monthly operating balance |
| --- | --- | --- |
| 500 | 5% | INR -400 |
| 1,000 | 2% | INR -3,620 |
| 1,000 | 5% | INR +700 |
| 1,000 | 10% | INR +7,900 |

These are assumptions, not measured demand or guaranteed margins. At 1,000 users,
5% conversion, INR 120/paid user and INR 10/free user instead, the balance is
INR -6,550. Full allowance usage must be priced and tested before launch.

Suggested Sarvam launch allocation: INR 1,000 evaluation, INR 3,000 priority
reusable audio, INR 1,000 content/OCR, INR 15,000 live usage, INR 5,000 reserve.
At INR 100/day the live portion lasts 150 days; at INR 300/day, 50 days, before
grant expiry. Startup programme terms can differ from purchased-credit expiry.

## Future work

1. Store purchase verification, renewals, restores, refunds, account entitlements,
   monthly allowances, top-ups, and a usage/paywall UI. Existing records alone do
   not constitute a working subscription system.
2. Production monthly spend controls and atomic vendor reservations, separate
   free/paid/content budgets, and measured streaming/interrupt/retry accounting.
   Production billing settings have intentionally not been changed in this task.
3. Shared persistent server-side TTS deduplication and versioned native-Sanskrit
   audio packs; regenerate popular historical Hindi-based assets under a separate
   explicit rendering budget rather than spending this testing allowance.
4. A richer personalized game playlist based on recent mistakes. Ranked games
   must retain equal rules and difficulty across players.
5. Multi-device conflict UI if needed, offline grading submission with idempotent
   reconciliation, and download removal/storage management. No synthetic mastery.
6. Longer human-reviewed model evaluation, native-Sanskrit listening tests, real
   beginner accents/noise/code-switching, and physical Android/Bluetooth tests.
7. Doc Agents for licensed Hindi reader/commentary OCR with source/page retention
   and editorial review before import. Existing books are largely Sanskrit-only:
   local audit found 30,640 rows, English on 1,148, Hindi on 700.
8. A managed Voice Agents comparison only if Sanskrit availability and educational
   validation are satisfactory. Its React Native SDK does not remove the need to
   test mobile audio. Public pay-as-you-go rate was INR 3.50/minute when reviewed.
9. Konkani, Maithili and Sindhi as additional speech/explanation languages first;
   complete courses need separate content, scripts, grading and evaluation.
10. Navigation reconsideration is explicitly deferred. All seven tabs remain.

## Verification record

Updated with final command results and live-budget totals in the model-results
document. All ordinary automated tests use isolated databases and mocked vendors.
The live comparison is the only intended paid provider testing in this task.

## Sources checked

- [Sarvam V2 models](https://docs.sarvam.ai/api-reference/chat/models-v2)
- [Sarvam V2 chat](https://docs.sarvam.ai/api-reference/chat/chat-completions-v2)
- [Sarvam Responses: stateless, store=false](https://docs.sarvam.ai/api-reference/responses/create)
- [Sarvam pricing](https://docs.sarvam.ai/api/getting-started/pricing)
- [Sarvam Bulbul](https://docs.sarvam.ai/api/getting-started/models/bulbul)
- [Sarvam Voice Agents pricing](https://docs.sarvam.ai/voice-agents/pricing)
- [Sarvam Doc Agents](https://docs.sarvam.ai/docai/getting-started/overview)
- [Sarvam startup programme](https://www.sarvam.ai/startup-program)
- [Google benefit credits](https://developers.google.com/profile/help/benefits?hl=en)
- [Google Cloud Run pricing](https://cloud.google.com/run/pricing)
- [Google model pricing](https://cloud.google.com/gemini-enterprise-agent-platform/generative-ai/pricing)
- [Google Play fees](https://support.google.com/googleplay/android-developer/answer/112622?hl=en)
- [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/)
- [Expo SDK 57 audio](https://docs.expo.dev/versions/v57.0.0/sdk/audio/)
