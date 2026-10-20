# Learn follow-up status, 20 October 2026

## Owner sign-off

The owner explicitly approved all current choices, confirmed dialogue review,
and reported that Sanskrit scholars completed review. The current 238 authored
lessons are marked `scholar_ok`. The exact statement and per-lesson material
hashes are recorded in `../learn-story/owner-approval-20261020.json`.
All 44 approved video selections are imported into local unit YAML; `approval.json`
records the chosen fields. Blank clip bounds play the full videos. The local
story-course default is now on, preserving explicit saved per-device overrides.
No commit, deployment, OTA or app build was performed. This records content
approval, not a claim that phone or screen-reader testing was performed.
All 41 distinct approved videos returned public player status `OK` and embedding
allowed in the post-approval metadata check. Native playback is still unverified.

## Implemented in this follow-up

- Researched a 44-unit video shortlist. Following the owner's preference,
  The Sanskrit Channel is selected for 12 units and alternatives for 32. Its
  public catalog of 1,041 video records and 17 candidate player pages were
  inspected. Four membership-only candidates were excluded. All 41 distinct
  selected URLs return publisher metadata. The 10 distinct preferred-channel
  selections return public/embeddable metadata. The live sheet and XLSX retain
  the earlier alternatives, identify partial coverage and long clips,
  allow replacement URLs/titles/channels and clip bounds. The original Pending
  choices are now Approved following owner sign-off. Partial matches remain
  disclosed. Independent viewing is not claimed.
- Added an XLSX/CSV importer with a dry run, explicit Approved-only selection,
  stable unit IDs, duplicate/URL/clip validation, preservation of unrelated
  unit content and idempotent reimports. All 44 approved choices are now imported.
- Added the three `verb.rare-four` rules (3.3.15, 3.3.173, 3.3.139) to a
  separate Pāṇini-depth teaching card in `aor.four`.
- Used `teach.formula` for the existing guṇa sandhi teaching.
- Added four optional `episode` lessons: `who.reading`, `num.reading`,
  `past.reading`, `kss.reading`. All 19 Sanskrit sentences and word glosses
  reuse existing course passages with their engine claims. The KSS excerpt
  was also checked at GRETIL against 4.3.64a, 72b–74. Each has two bilingual
  comprehension checks. Unit sheets open them in the shared player.
- Added optional `unit.reading` references to the backend/mobile contract,
  lesson lookup and state. Readings save completion without changing the
  required road, completion totals, ghosts or leaves. Cached older indexes
  remain supported. The prerequisite checker does not let optional readings
  provide required skills for later lessons.
- Structured 34 already-narrated Sanskrit utterances into attributed dialogue
  with bilingual glosses, preserving the original narration and all artwork
  fields. Carried over 32 existing engine claims. Dialogue coverage is now
  **75 of 143 story cards**. No new Sanskrit utterance was composed.
- Reclassified existing revision material into `optional` (quarter-final
  metrical weight), `blocked` (pragṛhya) and `splitting` (padaccheda method)
  sections. Rules and teaching references are preserved.
- Added two concrete engine exercises: a distinct singular/dual noun contrast
  in `nf1.deva` and a guṇa join in `vs.guna`. Tests pin the generated forms
  to the authored bilingual prompts, avoiding ambiguous syncretic pairs.
- Reading word glosses now appear next to the selected sentence, with a
  selected control, close action and polite accessibility live region.
- Unit sheets now show the unit's learning skills. The first lesson card
  shows human-readable prerequisites and learning goals in English/Hindi.
- Linked all 60 selected app paintings at the final check to the backend image registry from
  their matching provenance. Both local variant hashes, dimensions, recorded
  text review and discarded-original status are checked before synchronization.
  Regression coverage prevents backend/app registry drift. Public delivery
  verification is recorded by the earlier artwork publisher, not rerun here.
  The incremental artwork publisher now synchronizes this registry after
  verified delivery and original cleanup, so later deliveries stay linked.
- Removed unused `postAttempts`, `postTestOut` and `heldWeight` exports.
  Completion still uses the existing ordered offline outbox for attempts,
  progress and test-out. Real FastAPI replay tests pass.
- Added bounded retries for Windows temporary-directory cleanup and transient
  screenshot-file write failures. The latter was reproduced as `UNKNOWN`
  during a browser run; permanent errors still fail the check.
- Improved the optional video renderer with a minimum usable embed size and
  an external YouTube button, including inline failure feedback. No autoplay
  or watching rewards were added. Real video playback awaits approved media.
- Updated four stale tests to the current production contracts: safety text
  remains prepended, generation can be paused, and the shared Gemini ceiling
  returns a structured 429 before any provider call. Added a paused-generation
  regression test. No production safety or spending limit was relaxed.

## Findings clarified

- Seven Sanskrit recovered-leaf tales already exist and are linked from
  `LeafPage` into the shared card player. There are now **four optional unit
  episodes** as well. Forty units do not yet have a separate episode.
- **68 of 143 story cards** have no structured spoken line. The owner has
  reviewed and approved the current dialogue/narration; future additions need
  their own content review.
- `episode.beats` is explicitly the authors' plot outline. The backend pack
  deliberately sends only `episode.summary`; it does not ship these spoilers
  to phones. It should not acquire a learner screen just to make a field used.
- Planned-unit UI remains useful for future units. All 44 current units are
  ready, so no current unit needs a Coming soon stop.
- The existing ghost rows already conditionally omit the portrait container
  when portrait is null. That fix was present in the initial working tree;
  this follow-up does not claim to have authored it.

## Still open

- Native app playback checks for the imported videos. The owner approved the
  current choices and blank clip bounds, including the contextual KSS video
  and long workshops. No exact clip timestamps were invented.
- Additional per-unit Sanskrit episode authoring and structured dialogue expansion.
- `sandhi_split` and `derive_next`
  remain deliberately excluded because of the generator/display defects
  recorded in the implementation specification. They must not be restored
  merely to increase exercise-kind coverage.
- Native Android/iOS phone testing and TalkBack/VoiceOver testing. Browser
  phone-width testing is separate evidence. Content review is signed off.
- The local default is on following owner approval. Existing saved selections
  are preserved. Deployment/build/distribution and native acceptance testing
  remain separate, unperformed steps.
- The release-mode engine/content check now passes with no errors or warnings.
  Artwork work completed elsewhere; the registry now has 188 verified selections
  and no missing picture references. This is not a claim to have generated them here.

## Validation

- Final curriculum, reading/API, exercise-prompt, video importer and artwork
  parity tests: **41 passed** after approval integration, including positive
  release validation and synthetic unreviewed/missing-picture rejection.
- Affected backend modules: **148 passed**.
- Video importer and artwork parity: **16 passed**, including re-run after
  ensuring invalid-input cases exercise their own validation guards.
- `python -m app.curriculum check --engine`: **0 errors, 0 warnings**.
- TypeScript: `npx tsc --noEmit` passed after the final renderer change.
- Legacy trail checks passed with the owner-approved story default enabled.
  The browser checks confirm the new default and persisted explicit false/true
  overrides across reloads, as well as theme persistence.
- Artwork cache checks passed.
- Real FastAPI offline completion/test-out/review replay passed.
- Browser verification covered light/dark, flag/theme persistence, offline
  reload, the shared lesson player, first-verdict grading, gates, four widgets,
  Hindi enlarged text and 320/360/430/tablet/landscape layouts. The final browser
  harness uses 16 fixture lessons and 130 cards, including all four new
  reading episodes, their real word glosses, the three revision sections and
  the two newly linked engine exercises. All four episodes completed through
  the shared player and sent ordered progress/attempts posts. Wrong and correct
  engine answers were exercised. Sanskrit passages fit at 320/430px, and word
  meanings now appear beside the selected sentence. This does not establish
  native playback of every course lesson or screen-reader conformance.
- Full backend run: **2,130 passed, 16 skipped, 1 failed** in 449.94 seconds.
  The sole failure was `test_generator_deterministic_across_processes`: its
  child Python processes used Windows CP1252 when printing Sanskrit. Both
  child invocations now use `-X utf8`, and the parent decodes UTF-8 explicitly.
  The affected lesson-overhaul module plus importer/parity module then passed
  **51 tests**. The full suite was not run a second time after this test-only
  subprocess fix.
- The final browser re-run passed with no browser errors after the word-gloss
  placement change. The optional reading endpoint, ETag and saved-completion
  behavior passed an additional FastAPI test without advancing the road.
- The earlier browser re-run passed with no browser errors after the screenshot
  write-retry change. Backend/app artwork parity and local delivery hashes
  passed for the 60 selections present at that earlier check. The publisher hook was syntax-checked;
  this follow-up did not upload new artwork to exercise it in production.

Changes were made in an already-dirty workspace. Existing reader, theme, boot,
artwork and other lesson fixes were preserved. No deployment was performed.
