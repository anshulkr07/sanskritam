# Sanskritam Games: daily play, multiplayer, rankings and recitation

**Implementation brief for Sol or another implementing model**  
**Date:** 13 October 2026, Asia/Kolkata  
**Status:** Product direction approved by the owner. This document is the requested implementation plan; no application implementation is claimed here.

## 1. Mandate and scope

Build the complete experience described below. The owner approved the previous proposal and explicitly expanded it: introduce new word games, add a number-speaking game built from multiple dropdowns rather than a conventional MCQ, support English too, and cover almost everything in this delivery rather than leaving major features for the future.

The desired loop is: open Play, see today's rank and goal, enjoy a short game alone or with others, learn from the result, improve today's combined score, and share an attractive challenge that brings another person into the app.

Required deliverables:

- Seven finished games: Smriti, Shabda Rush, Varna Jaal, Daily Word, Word Groups, Pada Path and Number Builder.
- Solo, same-device multiplayer and real online multiplayer across the seven games, with game-appropriate rules.
- Private rooms, public quick matches, friend relationships, rematches and weekly cooperative friend goals.
- Combined daily, weekly and monthly game leaderboards; separate recitation competition standings.
- A redesigned Play hub, game setup, boards, results, leaderboards and competition journey.
- A complete Listen → Practise → Recite experience, countdown, reliable finish gesture, live speech transcription, component scores and multiple shlokas per competition.
- Reviewed content, illustrations, audio, rotation tools and content-quality checks.
- Score/rank/challenge sharing, install landing pages, verified app links and attribution that distinguishes measurable events from estimates.
- Server-validated ranking, reconnect behaviour, migration, accessibility, tests and operational documentation.
- Monetisation foundations: content-pack/cosmetic metadata and integration with existing entitlements if available. Free ranked participation remains fully competitive.

Implementation phases below are dependencies within this delivery, not permission to stop after an MVP. External credentials, linguistic review and device access are real dependencies: complete the independent work, list exactly what remains unverified, and do not label placeholders or disabled core features as finished.

This brief does not authorise purchases, advertising campaigns, new cash-prize commitments or production deployment. Prepare reviewable code, assets, migrations, configuration and runbooks. Actual paid store products/ads are not required: the owner's revenue objective was explicitly prospective.

## 2. Repository orientation and verified starting points

Read current files before editing; paths here are repository-relative. Follow applicable AGENTS.md instructions. `mobile/AGENTS.md` requires checking exact Expo v57 documentation before code changes. Inspect architecture.md, DECISIONS.md and relevant handovers, but apply this newly approved product direction where it supersedes old game/competition requirements. Preserve unrelated work.

The working tree already contained changes to mobile navigation, several game screens, reading screens and layout checks when this brief was prepared. Do not reset, overwrite or assume ownership of those changes. Recheck the diff because other work may continue.

| Area | Existing entry points / findings |
| --- | --- |
| Play | `mobile/src/screens/Play.tsx`; four games, rotating Today's challenge and duplicated practice entry points. Replace that experience deliberately. |
| Shared game UI | `mobile/src/games/GameShell.tsx`, `ResultSheet.tsx`, `api.ts`; reuse or refactor, not a second competing design system. |
| Existing games | `mobile/src/screens/Smriti.tsx`, `ShabdaRush.tsx`, `VarnaJaal.tsx`, `DailyWord.tsx`, `PracticeRound.tsx`. |
| Game server | `backend/app/routers/games.py`, `backend/app/services/games.py`, `backend/app/seeds/game_pools.py`, `GameResult` in `backend/app/models.py`. |
| Ranking defect | `/games/result` selects highest raw score as best for every game. Smriti submits move count, where fewer is better. It also trusts client-reported results. Fix both before public ranking. |
| Smriti | Text pairs only; card objects contain a Roman subtitle that the inspected board does not render. Letter fallback can repeat Devanagari instead of Roman. `/deck` requires 40 items irrespective of a smaller usable set. |
| Varna Jaal | Hit testing assumes four equal regions, while actual cells have padding/gaps and percentage widths. Investigate with device reproduction; this is a likely cause, not a confirmed diagnosis. Candidate selection takes the first eligible words before board randomisation, limiting variety. |
| Recitation | `mobile/src/screens/Recite.tsx`, `RecitePicker.tsx`, `components/recite/RecitationResult.tsx`, `EyesClosedTest.tsx`, `src/recite/*`. |
| Scoring | `backend/app/services/recite_scoring.py` aligns recognised aksharas; it does not score timing or prove phonetic correctness. `scorer_client.py` currently includes a Sarvam path. Inspect current routing rather than assuming older GPU handovers describe production. |
| Competitions | `backend/app/routers/competitions.py`, `services/competitions.py`, `services/competition_rules.py`, `seeds/competition_pieces.py`; generator stores one piece, and Play/Contest choose `pieces[0]`. Seed references alone do not guarantee available approved audio. |
| Numerals | `backend/scripts/p10_numeral_audit.py` and `tests/test_p10_numeral_audit.py` record incomplete numeral coverage and confident misparses. Do not use the general morphology analyser as the sole number-game judge. Existing teaching material is in `services/grammar_guide/_c05b.py`. |
| Sharing | Reuse suitable capture/share patterns from `mobile/src/screens/ParvaPage.tsx`, DailyWord and `mobile/src/config.ts`; inspect current store URLs. view-shot, SVG QR and expo-sharing are already dependencies. |
| Persistence | `backend/app/db.py` supports SQLite locally and PostgreSQL through DATABASE_URL. Use transactional shared persistence for production multiplayer; SQLite-only tests are insufficient evidence. |
| Architecture | Hosted speech APIs remain the default. Do not add a local ASR/forced-alignment model to solve this brief. Deterministic signal processing is distinct from model inference. Preserve existing unrelated speech/face-check functionality. |

The unknown labels recalled as “spa.w / ela.wa” were not located exactly during review. Do not claim a proven cause. Audit raw linguistic notation, source abbreviations, enum values, missing icon glyphs and encoding, and record actual examples found.

## 3. Play hub and visual direction

Retain the warm existing palette and appropriate artwork. Replace repetitive cards and generic pill-heavy layouts with layouts appropriate to each activity. Rounded corners are not themselves the problem; hierarchy, spacing, interaction and content quality are.

Top of Play:

1. A prominent **Your rank today** card: rank, ranked points, change since last visit and period end time. Before play, say “Play a ranked round to get your rank”; never fabricate a position.
2. A compact personal goal: **Complete 3 rounds**, plus streak. Goal progress and ranked points are different values and must be labelled.
3. **Play with friends** and **Quick match**, followed by a clear game collection.
4. An active recitation competition with its title, number of verses, progress and closing time.
5. A weekly friend goal with actual progress, displayed only after participation is chosen.

Specialised grammar exercises move to Learn/Practice. Preserve existing routes and appropriate discovery links. Do not delete useful grammar capabilities or duplicate entire practice sections in Play.

Every game uses a consistent, short setup: mode, optional friends/room, difficulty for casual play, then one primary Play button. Remember previous casual settings. Ranked rounds clearly show their fixed rules before starting. Use a first-use demonstration inside the board, not repeated instruction walls.

Visual deliverables include concrete screens for hub, setup, every board, lobby, countdown, results, all leaderboard tabs and all recitation stages. Produce screenshots from implemented screens at 360px and 390px phone widths, large text and a tablet width. Keep touch targets at least 48 logical pixels where practical, adequate script line height and safe-area padding. Check TalkBack/VoiceOver, contrast, reduced motion and non-colour status cues. Avoid overlays, including the Ask bubble, covering playable areas.

The leaderboard should have a restrained top-three treatment, legible rows, avatars, points, period controls, Friends/Everyone filters and a pinned “You” row when outside the viewport. Ties, empty boards, loading, offline snapshots and zero results need designed states. Show a score explanation when points are tapped.

## 4. The seven games

### 4.1 Smriti: pictures, words and sounds

- Main deck: match an illustration with a card showing the Sanskrit word in Devanagari and Roman transliteration. English/Hindi meanings are optional learning support.
- Do not silently label Hindi vocabulary as Sanskrit. The owner's mango example expresses the desired word-picture mechanic; use a verified Sanskrit mango lemma, with “aam / आम” only as an explicitly labelled Hindi gloss if included.
- Additional decks: script-to-Roman letters, word-to-meaning and sound-to-picture. Use readable illustrations/photos with consistent treatment; emoji alone are insufficient.
- Casual boards: 6, 8 or 10 pairs; fit without awkward clipping. Announce whose turn it is in local play; a correct match grants another turn.
- Local/private turn-taking: one shared board, most pairs wins, then fewer failed turns, otherwise shared victory.
- Ranked/live race: separate boards with equal content and layout seed; opponents see progress, never hidden card identities. Server authorises reveals and enforces flip limits. All clients receiving the full hidden deck is acceptable only for explicitly unranked local play.
- Solo personal records compare moves within the same pair count and deck type. Do not compare a 6-pair game directly with a 10-pair game.

### 4.2 Shabda Rush: vocabulary sprint

- Ten short prompts per ranked round; a balanced mix of word-meaning, picture-word and audio-word tasks.
- Correctness dominates; speed provides at most 10% of the score. Audio timing starts after a common server-controlled presentation allowance, not before playback is possible.
- Use reviewed, genuinely distinct distractors. Provide a short explanation and audio after the round.
- Solo, pass-and-play using equivalent unseen packs, and live simultaneous play. A local player's turn must not expose the next player's answers.

### 4.3 Varna Jaal: accessible word search

- Casual 3×3 introduction and 4×4 standard; use complete aksharas, preserving vowel marks and conjuncts. Ranked uses a fixed board specification.
- Use measured cell rectangles for hit testing. Account for padding, gaps, scrolling, safe areas and orientation; do not divide the whole container into approximate regions.
- Visible connecting path, enlarged current selection, subtle haptics, reversible backtracking, tap-in-order and explicit submit. Cancelled gestures must not submit a word.
- Prevent parent scrolling while an intentional board drag is active, without trapping accessibility scrolling. Test all bottom-row cells and diagonals on a physical phone.
- Choose fresh words before placement; validate every required word has a legal path. Rotate topics and difficulty, not only tile positions.
- Solo, local equivalent-board turns, live race on equivalent/same boards with opponent progress. No points spam from repeated “word found” and final-result calls.

### 4.4 Daily Word: a short daily ritual

- Preserve akshara-based input and phonetic feedback. Improve explanation of feedback, persistence and spoiler-free result sharing.
- One ranked daily puzzle, six guesses. Persist progress on the server so reinstall/device switching cannot reset attempts.
- Solo daily result contributes once to the daily aggregate. Local and live editions use fresh Duel puzzles, clearly labelled, so they do not reveal the daily solution.
- Duel rounds are casual for the combined daily ladder; Daily Word's sole ranked contribution remains its daily puzzle. This exception must be visible in setup and results.

### 4.5 NEW: Word Groups

- Find related Sanskrit words: concrete themes first, then synonyms, opposites and reviewed grammatical relationships.
- Beginner casual board: 9 tiles, 3 groups of 3. Standard ranked: 16 tiles, 4 groups of 4. Select tiles then submit a group; do not make it a four-option quiz.
- Four incorrect group submissions end a standard round. A valid solved group locks in place and reveals its explanation.
- Roman display toggle, optional bridge glosses for casual learners. Ranked display/help rules are fixed and explicit.
- Only curated puzzles with a reviewed partition and no unhandled plausible alternate grouping. Validate unique word identities and duplicate surface forms.
- Solo, local alternating group submissions and live independent-board races. A private/local shared-board match uses solved-group count; ranked live uses the same score rubric as solo.

### 4.6 NEW: Pada Path — build the phrase

- Assemble 4–8 word tiles into a short sentence or verse line; offer both tap-to-place and drag-to-place.
- Two labelled content types: **Build a sentence** and **Restore this verse**. Sanskrit allows multiple valid sentence orders; accept all reviewed equivalent sentences and never mark a grammatical alternative wrong merely for differing from a preferred order. A quotation can legitimately require its prescribed sequence.
- Explain the resulting sentence, play audio and show useful meaning after submission. Keep redundant words and ambiguous tile duplicates out unless explicitly tested.
- Five prompts per standard round, with a controlled mix. Partial credit comes from required grammatical/semantic relations for sentences and correct adjacency for quotations, not a naive index comparison for every sentence.
- Solo, equivalent-pack local turns and live simultaneous play.

### 4.7 NEW: Number Builder — speak the number

Public name: **Number Builder**, with a linguistically reviewed Sanskrit subtitle. The mechanic is composing a spoken phrase through multiple dropdowns, not choosing one complete answer from four options.

#### Number prompt and language modes

Support all of these in this delivery:

- Sanskrit construction with Devanagari and Roman shown together in choices.
- English construction as a real playable mode, not merely English digits or UI labels.
- Indian grouping and international grouping for display; English reading conventions are selectable in casual play. Sanskrit initially follows one documented modern counting convention using reviewed scale terms.
- English/Hindi interface instructions independent of answer language.
- Integers from 0 through 999,999,999 and decimals with up to three fractional digits, including the owner's exact `104847322.34`. Negative values are included in advanced casual practice. Do not market arbitrary-size support beyond the tested range.
- Difficulty progression: 0–20, 21–99, hundreds/thousands, lakhs/crores, then decimals/negatives. Ranked packs use fixed, balanced difficulty and answer language, not a user-selected easier mode.
- English-only play is included but has its own language-filtered standings; the main Sanskrit daily total receives Sanskrit-mode results only. Never combine easier English and Sanskrit results without a distinct ruleset.

Store numbers as decimal strings plus sign/integer/fraction fields. Use integer/Decimal arithmetic on the server; no binary floating-point conversion of the canonical prompt. Preserve fractional zeros and requested reading precision. `.04` must retain zero before four; `.340` has three spoken fractional digits in digit-reading mode.

#### Mandatory worked example

For `104847322.34`:

- International display: `104,847,322.34`.
- Indian display: `10,48,47,322.34`.
- English international: “one hundred four million eight hundred forty-seven thousand three hundred twenty-two point three four.” Accept reviewed British/Indian uses of “and” as equivalent.
- English Indian: “ten crore forty-eight lakh forty-seven thousand three hundred twenty-two point three four.”
- Sanskrit semantic decomposition: `10 × 10^7 + 48 × 10^5 + 47 × 10^3 + 3 × 10^2 + 22 + 3/10 + 4/100`.

The decomposition is exact; it is not itself a certified Sanskrit utterance. Create and review the actual Sanskrit lexicon, inflected scale phrases, compound alternatives and decimal marker before publishing the answer. Do not concatenate dictionary stems and claim that produces idiomatic Sanskrit. Large-number naming systems and numeral inflection vary; specify the convention in the content record. The sources in §16 establish cardinal/scale background, not a universally authoritative modern decimal pronunciation.

Dropdown phrase skeleton, shown here using semantic labels rather than unreviewed Sanskrit:

```text
[ten] [crore] | [forty-eight] [lakh] | [forty-seven] [thousand]
| [three hundred] [twenty-two] | [decimal marker] [three] [four]
```

In Sanskrit mode each bracket displays the reviewed Sanskrit surface form plus its Roman form. English mode displays English words. Slots expand according to the number's real structure. Omit zero-valued integer groups; preserve zero digits in the fraction. Zero itself remains a valid complete number. Optional sign slot appears only for negative-number packs.

On a phone, show the large number at the top, a phrase preview and stacked place-value groups. Opening a dropdown opens a substantial selection sheet with 4–8 plausible choices, script/roman text, generous rows and a clear selected state. Never open a 100-item native picker. Options begin unselected and must not visually reveal the correct choice. Where a coefficient requires multiple reviewed pieces, allow multiple small slots rather than a huge menu.

Casual guided mode may highlight the relevant digits and explain units/tens/scales. Ranked mode uses neutral group labels, fixed assistance rules and no live correctness marks. Submit once to lock a ranked answer. After submission show the assembled reading, component breakdown, correct alternative and **Hear the number**. Normal and slower playback must actually work. An optional spoken repeat is practice-only and does not gate the dropdown score.

#### Language engine and review contract

- Add a dedicated versioned numeral grammar/lexicon service. Reuse proven transliteration helpers but do not grade these selections through the generic morphology analyser.
- Represent each choice by a stable semantic ID plus approved surfaces, language, coefficient/scale value, grammatical context and optional accepted variants.
- Compose a structured number-expression tree, render it, and parse it back to the exact decimal string. Numerical value and linguistic validity are separate checks.
- Standalone counting, decimal digit names and noun-qualified quantities require different contexts. Do not accept every gender/case form indiscriminately. Noun-counting exercises are not required for this release.
- In decimal digit mode `.34` is “point three four”, not “point thirty-four”. A fractions reading would be a separate explicit exercise; do not silently mix the two.
- Review the 0–99 inventory, hundreds, thousands, lakh/crore scale constructions, zero, negative marker and decimal marker with source references. Store accepted alternatives and explain the taught convention.
- Check existing numeral audit regressions, including पञ्च. Maintain a golden fixture for the owner's example with full Sanskrit/IAST/audio once reviewed. This fixture is a release requirement, not a future task.

#### Number scoring: exact, partial and fair

Each submitted prompt is worth 100 points before conversion to the common 0–1000 game score:

| Component | Weight | Rule |
| --- | ---: | --- |
| Correct values / numeral choices | 60 | Average correctness of semantic coefficient groups and each fractional digit; a complex split coefficient still has the same total weight as one coefficient group. |
| Scale, order and structure | 25 | Average correct scale assignments, descending integer structure, decimal marker placement and sign when applicable. Do not give free credit for slots the UI prefilled. |
| Valid spoken construction | 15 | Reviewed contextual form/compound/agreement checks for the selected phrase. Accepted variants receive equal credit. |

Define `C`, `S`, `L` in [0,1], then `score = round(60*C + 25*S + 15*L)`. If a component has no actual assessed decisions in a very simple prompt, remove it from the denominator and renormalise active weights to 100. The scored decisions and weights are fixed when the server issues the prompt. An entirely blank answer always scores 0.

Examples for a prompt where all three components are active:

- Fully correct accepted reading: 100.
- One of five equally weighted value decisions wrong, with structure and assessed forms otherwise valid: `C=.8, S=1, L=1` → 88.
- All value decisions correct but only half the scale/structure decisions correct: `C=1, S=.5, L=1` → 88 after documented half-up rounding.
- Recognised alternative spelling/compound representing the same valid reading: 100.
- Reversed fractional digits reduce value credit; the decimal marker/order structure is assessed separately. A scale error must lower structure credit even when its coefficient is right.

Avoid an unexplained double penalty for the same error: return criterion-level evidence. A grammar failure caused solely by a wrong scale can be grouped into that scale's diagnosis. Document these dependencies in rubric fixtures.

Five prompts per standard ranked round, equally weighted: `roundScore = 10 × mean(promptScore)`, rounded once at the end. No speed bonus for Number Builder; fluent construction is the goal. Timers in multiplayer bound the round, not language worthiness. Unanswered prompts score 0 after a genuine player timeout; server failure voids the affected round. Hints move a Number Builder prompt into practice and its ranked allocation is handled as specified in §5.

All three modes are required. Local play uses separate unseen equivalent sets. Live players construct independently, submit simultaneously and see component results after everyone submits or the shared deadline passes. Showing complete correct answers early would leak the round.

## 5. One points system without unlimited farming

Keep **game score**, **ranked points**, **learning XP**, **personal goal** and **match wins** distinct in the data and UI.

Defaults for this delivery:

- A standard ranked result is 0–1000 within each game, using versioned server rubrics below.
- Today's combined points are the sum of the best ranked results from **three distinct games**, at most 3000. If fewer than three have been played, sum those available.
- Each game except Daily Word allows three ranked rounds per competition day; keep the best. New ranked rounds use unseen equivalent packs. Daily Word has one puzzle with six guesses.
- Extra play remains available for practice, local matches, friend goals and casual online play. Results clearly show whether they changed rank.
- Starting a ranked round reserves an allocation. A client abandon consumes it after timeout; verified server failures release it. Hints/reveal before final submission consume that started allocation and convert its result to practice, preventing an answer-peeking retry loophole.
- Start/submit/events are authenticated and idempotent. No extra points from replays, double taps, retries or submitting another learner's session.
- Local guests and pass-and-play do not write to public rankings. Online ranked contributions count only from the canonical individual-board/pack variant with its normal attempt allocation. Shared-turn private variants remain casual.
- Public ranked mode uses fixed round specifications and a published difficulty mix. Learners can freely change difficulty in casual modes. Maintain separate ruleset/answer-language filters where necessary; do not silently merge incompatible scores.

Initial rubric definitions, to validate for comparable challenge in playtesting:

| Game | Standard 0–1000 rubric |
| --- | --- |
| Smriti | For P pairs, M committed two-card attempts and K pairs found: `600*(K/P) + 400*(K/P)*min(1, K/max(M,1))`; bound/round at finish. A flawless completed board is 1000. |
| Rush | Mean over 10 questions of `900*correct + 100*correct*speedFactor`, with speedFactor in [0,1] from server timing. Wrong/blank receives 0. |
| Varna Jaal | `900*(uniqueRequiredFound/requiredCount) + 100*completionSpeedFactor` only if all required words found. Casual hints cannot improve ranked results. |
| Daily Word | Solved on guess 1–6 gives 1000, 900, 800, 700, 600, 500; unsuccessful gives 0 ranked points but still counts as completed participation for the goal. |
| Word Groups | `250*groupsSolved - 25*incorrectSubmissions`, clamped to 0–1000. Four wrong submissions end the round. |
| Pada Path | Mean prompt correctness/partial-credit score ×10; five equally weighted prompts. No speed bonus. |
| Number Builder | §4.7: five equally weighted 100-point prompt results ×10; no speed bonus. |

Before release, playtest game-to-game difficulty; revise v1 thresholds if a game is systematically an easy source of 1000. Freeze the rubric for a ranked period. Do not alter an ongoing period's scoring silently.

Weekly score = sum of that week's daily points. Monthly score = sum of that month's daily points, not sum of weeks crossing month boundaries. Equal totals receive equal competition ranks (1, 2, 2, 4). Use stable IDs only for display order within ties, not hidden winner selection. Show participation count and period boundaries.

Use **Asia/Kolkata** boundaries for shared Play rankings: day 00:00–24:00, week Monday–Sunday, calendar month. Display a localised countdown and an explicit IST explanation. The rank result belongs to the server-issued day; a round started before close may finish within its fixed deadline plus a maximum 2-minute submission grace. No indefinite carryover. Freeze standings after grace and validation jobs finish.

Personal Games goal is three completed valid rounds per Play day, at any difficulty and in any mode; each local participant can see a local goal, but only the signed-in player's legitimate participation affects their account. Do not award all guests' progress to the host. Maintain the existing general learning goal separately and label both. Preserve a current streak before today's goal is due; do not show zero just because the user has not played yet today. Offline practice contributes once after deduplicated sync but never backfills competitive rankings.

## 6. Multiplayer and friends

### Modes and match lifecycle

- Same device: 2–4 named local players; no extra accounts required. Private online rooms: 2–8 authenticated players; quick match initially groups 2–4 compatible players.
- Rooms have an expiring code/link, host controls, ready states, selected game/rules, shared countdown, round progress, result and rematch vote. Host transfer before start; a host disconnect during play must not kill the match.
- Quick match filters by game, ruleset, answer language and broad experience band. Widen only compatible bands after 15 seconds; after 30 seconds offer waiting, inviting a friend or solo. Never show bots as people. Public matchmaking is part of delivery even if the audience is initially small.
- State machine: `lobby → countdown → active → resolving → results → rematch/closed`; define cancellation, timeout, disconnect and server-restart transitions.
- Use server time and answer deadlines. Client timestamps alone cannot award speed points. Prefetch assets and confirm readiness before countdown; bound network grace consistently.
- Reconnect within 30 seconds restores the authorised state and acknowledged actions. The round clock continues. After grace, use a clear forfeit/timeout result; it must not create more ranked attempts.
- Recover active sessions across app backgrounding and server worker replacement. A server outage produces voided/recoverable results, not a fabricated loss.
- Never transmit correct answers/hidden layouts to opponents. Reveal only the information that player is currently entitled to see. Do not publish number selections, tile guesses or correct solutions before lock-in.

### Technical requirements

Use authenticated WebSockets for live events, existing HTTP APIs for setup/history and transactional database writes for final results. Support multi-worker production instances with shared room state/event coordination; Redis or an equivalent shared system may be added with explicit deployment configuration. An in-process dictionary demo is not completion. SQLite can remain a local development option.

Use short-lived connection tickets or the existing secure auth mechanism; never put long-lived tokens in public invite URLs. Check room membership and session ownership on every action. Events carry protocol version, match ID, player ID, sequence number and idempotency key. Clients can request a snapshot after a missed sequence. Limit message size, action frequency, room creation and expensive speech connections.

Critical events: joined/left, ready, countdown, round start, action accepted/rejected, progress, partial/final result, reconnect snapshot, match finished and rematch. Persist enough state to reconcile duplicate/out-of-order events. Shared state must be authoritative; pub/sub delivery alone is not a database.

### Friends and cooperative goals

Add friend invitation/acceptance/removal, aliases, block/report and friend-only leaderboards. Do not require contact-book access or add public free-text chat. Limit multiplayer communication to preset reactions for this scope.

Weekly friend goal: opt-in pair, 20 completed rounds together, at least five by each player, counting at most five per person per day. Qualifying rounds require meaningful participation, not opening/abandoning a game. Reward a badge/cosmetic, never ranked points. Allow invite/accept/decline, progress, completion and next week's state. A friend request is not consent to promotional messages. Notifications are opt-in, quiet-hours aware and limited to useful invitations/results/goal completion.

## 7. Recitation: one coherent learning and competition flow

### Listen

Show verse, source, meaning and optional Roman text with one reliable audio player. Tapping a line plays that line; full verse, repeat and speed controls must actually honour their settings. Stop/remove the prior player before starting another. Replace sleep-based line sequencing with playback completion events. Remember position and allow direct progression into practice.

### Practise

One selected line or short passage at a time. Listen, then record after countdown, then see feedback, then retry or continue. Consolidate repeated record/play/hide controls. Text visibility has explicit choices (shown, partly hidden, hidden) with a clear effect. A practice attempt within a competition context must remain practice; entering from a contest must not automatically submit every line recording as a ranked competition attempt.

### Recite

Show short instructions before starting, then an uncluttered recording surface. Countdown is visible and audible/haptic. Ask for microphone/camera access during preflight, not halfway through countdown. An eyes-closed rule belongs to the labelled memory-competition mode; normal practice does not require it.

Mandatory sequence for eyes-closed mode:

1. Preflight microphone and camera/face-check availability; teach the stop gesture once with a rehearsal.
2. Start → 3, 2, 1 → “Close your eyes; begin after the tone.” Allow a documented brief eye-closing settling interval before scored speech begins.
3. Record with a large full recording-area stop target and a separate accessible Stop control. Text shown during ranked memory recitation never reveals the reference verse. Live recognised speech may be displayed, clearly provisional, but no correct-word coaching.
4. On tap/accessible stop: freeze the scoring interval and stop the eye check immediately, then play a finish sound/haptic and say “Finished. You can open your eyes.” Audio cues outside the interval must not contaminate recognition.
5. Show processing state, then component feedback, replay, retry and next verse. Opening eyes after stop must never invalidate the attempt.

Manual stop is the default. Long silence may prompt an optional finish control in ordinary practice, but must not silently terminate an eyes-closed performance. At the maximum duration, end with the same unmistakable cue. Handle calls, headphones, audio-route changes, backgrounding, permissions and missing native modules explicitly. Never fake a successful eye check or describe it as proof of memorisation. Preserve an accessible, clearly described alternative path in competition rules.

### Live STT and audio handling

Implement real interim transcription using a supported hosted streaming API through the backend, with final transcript reconciliation. Sarvam currently documents a realtime Sanskrit endpoint; recheck its exact contract during implementation (§16). A network spinner or post-upload transcript is not “live STT”.

The current file recorder is not proof of streaming PCM support. Verify Expo v57 capture capabilities; if necessary, add a narrowly scoped compatible native audio capture adapter/development build that supplies timestamped PCM chunks and a final recording from the same source. Avoid two competing microphone sessions. Test on actual Android and iOS builds; Expo Go alone is insufficient.

Bound buffering and reconnects. Continue local recording if provisional captions fail, state that clearly, and retry final upload using the same attempt ID. Final scoring must use the full audio, not duplicated partial strings. Do not feed the reference verse to a generative corrector that replaces what the learner actually said. Keep provider keys server-side and meter speech seconds rather than recharging upload retries.

## 8. Recitation scoring and transparent feedback

Use a versioned 100-point rubric:

- **Recognised syllable/content accuracy: 60** — evidence of correctly spoken expected content, accounting for omissions, substitutions and extra material. Name this honestly; STT agreement is not a definitive phonetic assessment.
- **Sequence: 20** — expected progression of word/akshara occurrences; reordered/repeated chunks lose credit. Preserve duplicate-word identity during alignment.
- **Continuity: 15** — excessive internal pauses, fragmented words and restarts; ignore leading/trailing silence and allow documented phrase-boundary breathing.
- **Rhythm/flow: 5** — stable phrase pacing relative to a reviewed delivery profile, with tolerance for slower speakers. Do not grade melody, accent conformity or absolute speed as correctness.

Separate content matching from order deliberately: a bounded occurrence-aware multiset measure can support content coverage, while monotonic alignment measures sequence. Never let repeating one expected word satisfy multiple different words. Cap the combined result by demonstrated coverage so fluent humming or one perfect line of a long verse cannot score highly. Publish the actual equations and fixtures in the implementation result, not just labels for four arbitrary numbers.

Timing must come from recorded audio timestamps and measured voice activity, not network arrival gaps or transcript punctuation. Use server-side deterministic audio analysis and hosted timestamp information as available. Phrase timestamps do not imply word/phoneme alignment. A signal-envelope rhythm measure must be calibrated and presented as pacing feedback, not precise Sanskrit metre analysis. Support legitimate verse-specific rests and multiple accepted spoken styles; do not compare all users to one exact voice waveform.

Start calibration with at least 60 consented/licensed recordings from at least 10 speakers, including clean speech, natural slow speech, long misplaced pauses, wrong order, omissions, restarts and noisy/unusable input. Have reviewed human quality labels and pairwise comparisons. Target at least 90% correct ordering of clearly good versus deliberately disrupted recordings, and report results by speaker/device. Adjust thresholds before freezing the rubric.

Mandatory counterexample: a clean ordered “Ram aa gaye ghar” must outrank the same words scrambled and fragmented with long pauses. This Hindi phrase is a test of scoring behaviour, not production Sanskrit curriculum. Include equivalent real Sanskrit fixtures. A slower but continuous correct recitation should not receive a large penalty merely for speed.

If recognition/audio evidence is insufficient, return **unclear/unscored** with a retry reason, not a false zero or invented pronunciation diagnosis. Practice may show only available components with an explicit incomplete total. Ranked recitation requires all components under the same scoring version; do not renormalise missing components differently per contestant. Missing rhythm capability is a release blocker for the full rubric, not permission to give everyone 5/5.

Result UI: total, four component bars, one or two specific improvement suggestions, transcript with expected/heard comparison and audio replay. Timestamped jumping is available only at the precision actually supported. Preserve original attempts and rubric version for review and reproducibility.

## 9. Multiple-shloka competitions

Keep recitation standings distinct from game points; allow Daily/Weekly/Monthly period controls inside each track. Games rank is the default on Play. Recitation has weekly events plus monthly aggregate standings, with daily best/activity views where useful; do not pretend a daily event exists if none is scheduled.

- Launch weekly competitions with three prescribed shlokas: short, medium and longer. Supply beginner and standard divisions with separate leaderboards; freeze a participant's division at entry for the event.
- Every entrant in a division completes the same set. They may practise and submit pieces in any order, but cannot choose only easy verses for a comparable overall rank.
- Store best eligible attempt per participant, event and piece; event total is the mean of all three best scores. Until complete, show “2 of 3 submitted” and provisional progress outside the final ranked table. Never average only submitted verses.
- Keep the existing overall counted-attempt cap as the initial default: 10 counted attempts per day across pieces. Reserve before recording; release on server/provider failure. Document treatment of unclear audio separately from deliberate invalid attempts and limit abuse.
- Weekly totals use a fixed scoring version and prescribed set. Monthly recitation standings average completed weekly event scores whose closing date is in the month; uncompleted events count as zero after closing. Before close, show provisional eligibility/denominator clearly. Ties share rank; any certificate/prize tie resolution must be published.
- Preflight the full event's text, meaning, pronunciation/recitation audio, duration limits and scoring availability before scheduling. Never advertise an event with missing media or unavailable required checks.
- Choose pieces using difficulty, length, content diversity and recent exposure. Include all eligible published sources, not a hard-coded first verse. Prepare at least eight scheduled weeks from reviewed inventory without repeating a piece within four weeks per division where supply allows.
- Update entry, rules, per-piece progress, standings, certificates, results history, privacy and retention together. Current rules describe two events weekly and one verse; old history remains readable under its original rules.
- Do not silently reinterpret old results using the new average. Add a rules version and cut over at an event boundary.
- Certificates are included. Preserve existing promised rewards; do not invent new cash prizes or change existing commitments by accident. Prepare any existing monthly-winner integration for the new explicitly documented rules.

## 10. Content supply and language quality

Minimum release inventory, verified usable rather than merely seeded:

| Content | Minimum |
| --- | ---: |
| Reviewed vocabulary concepts | 300 across at least 12 everyday topics |
| Distinct illustrated concepts | 100, each linked to reviewed Sanskrit, Roman, bridge gloss and audio |
| Word Groups boards | 120 reviewed boards: at least 30 beginner and 90 standard, enough for three distinct standard boards per day across a 30-day rotation |
| Pada Path prompts | 150 reviewed prompts, including 50 quotations and 100 short sentences with accepted alternatives |
| Competition-ready shlokas | 30 with complete text/source/meaning and usable reviewed audio |
| Numeral fixtures | Complete 0–99 table plus at least 200 large-number/zero/decimal/variant fixtures, including the owner's example |
| Daily rotation | 30 days of ready game packs and 8 weeks of competition schedules verified by preflight |

Use one reusable content schema: stable concept ID, Sanskrit display form, IAST, beginner Roman if offered, English/Hindi meaning, topic, difficulty, image/audio references, source/licence, reviewer/status, accepted variants and version. Do not confuse stems/lemmas with meanings. A morphological engine accepting a form does not verify an illustration, translation or puzzle's pedagogy. Track per-learner exposure: never repeat a solved prompt in that day's remaining ranked attempts. Recombining vocabulary into a new board is acceptable; reshuffling the same solved Word Groups partition is not a new puzzle.

Provide import/update tooling, preview, validation, publish/unpublish, inventory counts and depletion alerts using the existing admin approach. Distinguish draft, automatically validated and reviewed content. Authoring models may draft material, but do not call it reviewed without evidence. Cache audio/assets; no LLM request is needed for each turn of a normal word/number game.

Number pronunciation audio needs reviewed reusable chunks or cached full readings with natural boundaries; publish only combinations verified for the taught convention. Audio failures do not make a correct dropdown answer wrong.

Audit learner-facing odd strings across game prompts, results and explanations: raw `NOM.SG`-type enums, SLP1/WX-style strings, source shorthand, mojibake and missing icon fonts. Convert to readable labels/IAST where appropriate; retain an explanation affordance for legitimate terms. Do not globally replace characters such as `w` or strip diacritics indiscriminately. Include a regression fixture for every confirmed bad label.

## 11. Sharing, invites and installation

Create designed share cards for an individual result, today's combined rank, weekly/monthly rank, match win, Number Builder accomplishment and recitation completion. Support square 1080×1080 and story 1080×1920 output, a preview, optional name visibility, date/period, result, small app brand, QR and short URL. Avoid revealing active daily puzzle solutions or private opponents' identities.

Use the native share sheet with compatible image/link payloads; test WhatsApp, Instagram and Facebook on device. Offer copy link and save image when a destination cannot accept both image and caption. Do not promise direct Story posting or clickable image text universally. A share-sheet dismissal is not proof that something was posted.

Use HTTPS first-party links with Android App Links and iOS Universal Links. Provide the association files and navigation handlers. Installed app: route to the correct game/challenge/room/results. Uninstalled: public mobile landing page with accurate store buttons, safe preview and invite code. Closed rooms show a useful rematch/new-room option.

Include a lightweight browser sample for Smriti or Number Builder on the landing page, followed by an install/join action. It is not ranked, exposes no secret live answers and does not require an account. This is part of the conversion flow, not a separate full web application.

Do not build on Firebase Dynamic Links; the service has been shut down (§16). Verified app links alone do not preserve state through installation. Implement supported install-referrer handling where available and a cross-platform fallback: reopen the original link or enter the short code. Do not claim seamless iOS deferred linking without a tested mechanism. Use existing project hosting; a separately purchased service is not a prerequisite.

Measure share opened, link opened, sample started/completed, store-click, attributable first launch, invite redeemed and first game completed. Store-click is not an install; unverifiable attribution stays unknown. Public share tokens are opaque, scoped and revocable, with no account identifiers or access tokens embedded. Expiring room invites and longer-lived public achievement links use different lifetimes.

## 12. Backend and data contracts

Adapt existing models and routers; the following are responsibilities, not a demand for these exact class names:

- `GameDefinition` and `RulesetVersion`: game/modes, ranked rubric, difficulty/language constraints and content requirements.
- `ContentPack` / `PuzzleInstance`: immutable content version, generated instance and answer key held server-side.
- `GameSession` / `AttemptEvent`: player, mode, issued day, allocation, seed/pack reference, start/deadline, validated actions and terminal state.
- `GameScore` / `DailyContribution`: raw metrics, 0–1000 result, chosen best, top-three aggregate and validation state. Unique constraints prevent duplicate awards.
- `LiveMatch` / `MatchParticipant`: membership, state version, deadlines, reconnect state and final result.
- `Friendship`, `Block`, `FriendGoal`, `FriendGoalContribution` with invitation states and idempotent contributions.
- Extend competition entries with per-piece attempts/results, division, rules version and immutable final snapshots.
- `ShareLink` and minimal attribution events; content review/media manifests; optional entitlement-aware cosmetic/pack catalog.

Representative API surface: Play summary; games catalog; start ranked/practice session; submit action/answer; finish/resume session; personal history; leaderboard period/filter; create/join/ready/leave room; matchmaking enqueue/cancel; WebSocket ticket/snapshot; friends/invites/goals; recitation session/stream/finalise; contest pieces/submissions; share-link create/revoke/resolve; admin content preflight/publish. Design and document concrete schemas before wiring screens.

Every result includes its rules/content versions, raw breakdown, ranked eligibility/reason, point change and new personal/period state. Honour ownership/auth across HTTP and sockets. Validate range, finite values, membership, event order and deadlines. Never accept an arbitrary client total as the truth. Ranked answer keys must not be shipped in public content responses.

Use atomic transactions for best-score/top-three/period updates or an append-only ledger with idempotent rebuilds. Add indexes for period, game, language, division, participant and score. Paginate leaderboard rows; fetch “me” independently. Test concurrent finish calls on PostgreSQL. A job can rebuild boards and freeze completed periods from authoritative attempts.

Migrate additively. Preserve historical raw scores and label them legacy/unranked; do not backfill unvalidated client scores into the new competitive tables. Maintain old-client compatibility where feasible, but an old result endpoint must never bypass new ranked validation. Minimum compatible versions may be required for ranked play. Use feature flags for safe staged rollout while fully implementing each required feature.

Include new data in account deletion, retention and block enforcement. Keep private audio private and align retention with disclosed competition rules. Logs must not contain audio payloads, auth tokens or unnecessary transcripts. Use aliases for public boards; do not expose email addresses.

## 13. Performance, operations and monetisation foundations

Instrument match-join failures, connection drops, score-validation failures, duplicate rejection, ASR uncertainty, scoring latency, missing assets and content exhaustion. Track activation, next-day/seven-day return, completed games, rematch rate, sharing and attributable invite conversion. These are measurement goals, not promises that adding games guarantees retention.

Initial performance targets on a documented test environment: cached Play/leaderboard API p95 below 500ms; match action acknowledgement p95 below 500ms under 150ms simulated RTT; caption updates normally within 2 seconds of spoken chunks; final score normally within 10 seconds after upload/end. Show truthful progress if these targets are exceeded. Publish measured results and environment rather than asserting compliance from unit tests.

Load-test at least 100 concurrent two-player rooms, with duplicate events, a worker restart and intermittent disconnects. Bound socket/audio buffers and add backpressure. Provide deployment configuration, database migration order, shared-state dependencies, health checks, periodic job configuration and rollback steps. Recompute/restore rankings after a failed job without double-awarding XP.

Ship metadata and screens for earned cosmetics, unlockable content packs and private group tools, integrating existing entitlements if present. Core daily games, accessible controls, ranked attempts and fair scoring must not require payment. No purchasable points, speed benefits, retry advantages or competitive hints. Do not show fake purchase buttons if there is no billing integration; catalog/earned items can be complete without launching paid products. The external store product setup remains a business activation step, not an excuse to defer gameplay.

## 14. Implementation order and acceptance gates

| Phase | Work | Gate before progressing |
| --- | --- | --- |
| A — foundations | Re-read current worktree, preserve ongoing edits, reproduce defects, define UI routes/content schemas/rubrics, numeral fixtures and compatibility strategy. | Concrete screen flows, schemas and audited baseline; no claim that existing bugs are fixed by restyling. |
| B — content and solo games | Build content tooling/assets; repair four games; implement Word Groups, Pada Path and Number Builder; common polished setup/results. | All seven games playable; number example and edge cases pass; touch/typography checks on phone. |
| C — daily and social scoring | Session validation, allocations, top-three aggregate, period boards, streaks/goals, friends and cooperative goal. | Idempotence, ties, period boundaries, cheating/retry cases and migrations tested. |
| D — multiplayer | Local modes, rooms, sockets, reconnection, public matchmaking and rematch across the game catalog. | Real two-device play, shared-state multi-worker tests and low-population fallback pass. |
| E — recitation | Audio flow, countdown, streaming capture/STT, component rubric, multi-piece events, rules/results/certificates. | Reviewed scoring calibration and on-device eyes-close/start/stop paths; no mock scorer used as production evidence. |
| F — sharing and completion | Cards, landing sample, verified links, attribution, monetisation foundations, load/accessibility checks and runbook. | End-to-end installed/uninstalled sharing checks; screenshots and operational evidence; required features complete. |

Work may interleave where dependencies allow. These phases all belong to this brief. Do not stop after C and describe D–F as a future roadmap.

## 15. Verification checklist and final hand-back

### Automated checks

- Numerals: exact round-trip values; 0, 1, 19, 20, 21, 48, 99, 100, 101, 1000, 100001, 10000000, 104847322.34, 999999999.999, -12.04, 0.04, 10.00 and 100.340. Test both digit scripts, grouping, accepted forms, wrong scale, blank slots and precise fractional zeros.
- Number scoring: the examples in §4.7; deterministic rounding; no free score from fixed labels; valid synonyms; hint eligibility; partial results from a timeout; English/Sanskrit board separation.
- Every game: finish/abandon/retry/restore, double submission, missing/slow assets, equivalent multiplayer inputs and game-specific score monotonicity. Smriti fewer moves never produces a worse score at equal completion.
- Content: no duplicate identities, answer leakage, ambiguous distractors or invalid unsolvable boards; minimum inventories and required media exist; sentence alternatives and numeral variants tested.
- Rankings: top three distinct games, three allocations, Daily Word exception, ties, day/week/month edges, leap/month boundaries, late finish grace, device/timezone changes, concurrent submissions and replay attacks.
- Multiplayer: join/leave/host loss, membership enforcement, out-of-order messages, reconnection, forfeit, rematch, cancelled queue, worker restart and no duplicate point awards.
- Recitation: natural versus disruptive pauses, wrong sequence, repeated words, partial verse, noise/silence, unavailable evidence, caption reconciliation, camera cutoff and provider timeout retry.
- Migration/compatibility: legacy history retained, old endpoints unranked, account deletion includes new records, all existing affected tests still pass.

Use the existing backend pytest setup and mobile TypeScript checks plus meaningful game/rubric/integration tests. Consult current scripts rather than inventing commands. Do not rely on tests that only assert that a component contains the same constant used by its implementation.

### Manual/device checks

- Complete every game solo, local and live. Exercise both Android and iOS development builds with at least two real devices for online play.
- Touch every Varna Jaal bottom-row cell, drag diagonally, undo/backtrack, scroll surrounding content and cancel a gesture without submission.
- Build the owner's full number using dropdowns on a small phone; verify no clipped choices, hidden last rows or keyboard obstruction. Hear the reviewed Sanskrit and both English readings.
- Record/practise/retry; perform an eyes-closed recitation without needing to visually locate Stop; open eyes after the finish cue without invalidation.
- Enter a three-shloka event, complete pieces out of order, inspect provisional/final standing and receive a valid certificate.
- Share square/story cards to WhatsApp, Instagram, Facebook and one additional available destination. Test missing destination app, cancelled share, copied link, expired room, cold/warm app links and uninstalled flow.
- Test first-use empty ranking, daily reset, no opponents, offline play/sync, captions unavailable, microphone refusal, large text, screen reader and reduced motion.

### Definition of done

Deliver implementation plus a result document that maps every requirement to changed files and evidence. Separate **implemented**, **tested**, **externally blocked** and **not verified**. Include migration/run commands, configuration variable names without secrets, content/media counts, sources/licences, scoring version/equations, real screenshots, device matrix, measured performance and remaining owner-only activation steps.

No feature is complete because a route/button exists. No live multiplayer claim without independent clients. No live STT claim from a transcript shown only after recording. No reviewed-content claim from unchecked generation. No public ranking built from client-invented totals. No “beautiful UI” claim without inspecting actual rendered screens and touch behaviour.

## 16. Research and implementation references

Accessed 13 October 2026. These informed the proposed formats and constraints; recommendations and numerical targets in this brief are product decisions, not findings that guarantee growth.

- [Quizlet study modes](https://help.quizlet.com/hc/en-us/articles/360030841732-Studying-on-Quizlet): reference for image/audio learning material, timed matching and individual/team live play.
- [Kahoot scoring](https://support.kahoot.com/hc/en-us/articles/115002303908-How-points-work): reference for separating correctness and response-speed incentives. Our chosen rubrics are original product rules.
- [Duolingo social features](https://blog.duolingo.com/friends-social-features/): reference for friend encouragement and cooperative weekly goals.
- [Research on Connections-style group puzzles](https://arxiv.org/abs/2407.11240): background on category grouping and generated puzzle quality. Use original Sanskrit puzzles, not copied NYT boards, branding or artwork.
- [Learn Sanskrit: number words](https://learnsanskrit.org/guide/nominals/number-words/), [large numbers](https://www.learnsanskrit.org/ends/numbers/big/), and [Whitney, Sanskrit Grammar chapter VI](https://en.wikisource.org/wiki/Sanskrit_Grammar_(Whitney)/Chapter_VI): sources to consult for numeral inflection, compounds and scales. Obtain a specific reviewed modern decimal convention in addition; these links do not by themselves certify it.
- [Sarvam realtime STT](https://docs.sarvam.ai/api/api-guides-tutorials/speech-to-text/realtime-streaming): documents real interim events, Sanskrit, supported PCM formats and final segment timestamps. [REST STT reference](https://docs.sarvam.ai/api-reference/speech-to-text/transcribe) distinguishes chunk timestamps; verify current response shapes rather than inferring word alignment from marketing claims.
- [Expo v57 Sharing](https://docs.expo.dev/versions/v57.0.0/sdk/sharing/): compatible native sharing and web limitations. Consult v57 audio/camera documentation before implementing capture changes.
- [Android app links](https://developer.android.com/training/app-links): verified-link navigation requirements; implementation also needs Apple's current Universal Links documentation.
- [Firebase Dynamic Links shutdown FAQ](https://firebase.google.com/support/dynamic-links-faq): do not introduce a dependency on the discontinued service.

## 17. Suggested instruction to the implementing model

> Implement handover_games_daily_multiplayer.md in this repository. The owner approved the full product direction, including the two new word games and Number Builder with English/Sanskrit dropdown construction. Complete all phases; they are an implementation sequence, not a backlog. Start by reading current repository guidance and diffs, preserve unrelated changes, and validate the existing app/API contracts. Deliver polished working screens, reviewed content, server-validated scores, all multiplayer modes, leaderboards, the rebuilt recitation/competition flow, sharing/install paths, tests and a truthful result handover. Resolve routine choices yourself. If a genuine external dependency prevents verification, complete independent work and identify the precise dependency; do not fake completion or quietly remove the requirement.
