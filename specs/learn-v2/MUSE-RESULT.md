# MUSE-RESULT — Learn v2 implementation (Muse Spark, 12 Oct 2026)

> Later audit correction, 12 October: this is the original implementation hand-back, not the current full-course progress report. See [WHOLE-COURSE-AUDIT.md](WHOLE-COURSE-AUDIT.md) and [CODEX-RESULT.md](CODEX-RESULT.md). Codex has delivered three generated PNG scenes; the app's three integrated JPG scenes are different prototype artworks, not duplicates or derivatives of those PNGs. The owner has authorized whole-course generation, including pens/pencils. The current caption renderer removes baked/duplicate labels. Original validation results below remain historical, not newly rerun claims.

## Scope delivered

A working **Learn** tab (`LearnV2` internally), fully additive. Path and
Grammar are untouched in behaviour, routes, content and progress; the owner
can compare all three destinations in one app. Old progress keys are never
read, written, migrated or cleared.

- **Live catalogue: 7 lessons, 62 cards**, all validated static content:
  - `verbs-number` (10 cards: 8 teach + 2 retrieval) — one / exactly two /
    three-or-more readers: पठति / पठतः / पठन्ति, stem + ending splits.
  - `sandhi-boundary` (9), `sandhi-like-vowels` (9),
    `sandhi-a-combinations` (9), `sandhi-glides` (9) — the vowel-sandhi arc.
  - `sandhi-e-o` (8), `sandhi-protected` (8) — internal vs external e/o and
    pragṛhya/prefix/augment exceptions.
- Every lesson: one point per card, example + immediate reason together,
  observe → notice → explain → vary → misconception → apply → retrieve →
  scoped summary. **No “A closer look”, expandable note, disclosure or any
  optional-detail control anywhere** (owner 12 Oct revision); essential
  qualifications from the pilot notes are merged into main card bodies.
- Slice-first ordering kept: verbs-number + like-vowels work end to end;
  the rest of the vowel pilot follows as validated lessons.
- Drafts (NOT shipped, no button leads to them): consonant/visarga/internal/
  retroflex/reading sandhi chapters, Devanagari/person foundations, and the
  48-lesson verse-rhythm manuscript (needs step re-authoring, not splitting).

## Decisions taken (no owner question asked)

1. **Static catalogue, no backend change.** `mobile/src/learnv2/catalogue.ts`
   ships validated content in the bundle; compatibility preserved, no
   production-data mutation. The licence registry already covers learnsanskrit
   (CC BY 4.0), Whitney (public domain) and vidyut-data (MIT).
2. **Sandhi visuals are native, not bitmaps.** Formulas, boundary tiles and
   decision maps render as text/SVG per the handover's preference; the only
   production photos are the three approved verb scenes (1 / exactly 2 /
   group). Missing art always falls back to the native block — never a broken
   import, URI or blank lesson.
3. **Practice is local retrieval.** Multiple-choice with immediate bilingual
   feedback; writes nothing (no mastery/XP/reviews/submissions). Swipe and
   Back/Next move reading position only. Tracking limits are stated on the map
   and the lesson endpoint.
4. **Seven-tab bar keeps Path and Grammar.** `iconsOnly` now below 410dp or
   font scale ≥ 1.4, smaller labels below 430dp; every tab keeps an
   accessibility label. Learn uses the `library` icon pair.
5. **Progress is versioned and separate** (`shabd.learnv2.*`): last lesson,
   last card, visited cards, done flags. Reading completion ≠ mastery.
6. **Light theme only**, per the app's design system (the prototype dark
   styles were not carried over). 18pt Sanskrit floor via `sized()`.
7. Existing PNG duplicates under `mobile/assets/learn-v2/` left alone; the
   smaller same-scene JPGs are the integrated production files.

## Files

New: `mobile/src/learnv2/{types,catalogue,progress,assetMap,validate,
LearnCard,sources}.ts`, `mobile/src/screens/{LearnV2Map,LearnV2Lesson}.tsx`,
`mobile/scripts/check-learnv2.mjs`, `backend/tests/test_learnv2_specs.py`,
`mobile/assets/learn-v2/verbs-reading-{single,dual,plural}-v1.jpg`,
`specs/learn-v2/{coverage.md,sources.jsonl,requests.jsonl,
integration-status.jsonl,MUSE-RESULT.md}` (this file).
Edited (additive only): `mobile/src/navigation/{types,MainTabs}.tsx`,
`mobile/App.tsx` (Learn tab + `LearnV2Lesson` stack route).
Untouched: Lesson/Path/Grammar/GrammarTopic/GrammarChapter screens and
players, all progress keys, backend app code, versions, deploys.

## Checks (3 rounds, all green at hand-back)

- `npx tsc --noEmit` (mobile): clean. Round 1 caught two of my own import
  mistakes (fixed); baseline files were already clean.
- `node scripts/check-learnv2.mjs`: passes — 7 lessons, no disclosure
  strings, prereqs resolve, 7 verified source records, 5 request records
  (ready ⇒ verified), 3 integration records, all asset requires exist,
  versioned keys only. Round 1 caught checker bugs (unit vs lesson census,
  specs path); fixed and re-greened twice since.
- `node scripts/check-contrast.mjs`: all tokens pass (untouched palette).
- Backend: `test_learnv2_specs.py` 3 passed (new); full suite
  `1757 passed, 16 skipped` (~7 min; recite-audio/sarvam deselected —
  credentials/network dependent); `test_p23_lesson_overhaul.py` 34 passed
  with 1 deselect.
- **Known baseline failure (not mine):**
  `test_generator_deterministic_across_processes` fails on this Windows
  machine because any Devanagari `print()` hits cp1252 stdout encoding
  (reproduced with a one-line snippet; no backend/app file of mine is
  involved — backend/app edits pre-date this task per starting git status).

## Provenance / verification

Per-card records in `specs/learn-v2/sources.jsonl` (7 verified):
learnsanskrit.org Core-verbs/Present/Vowel-sandhi pages (CC BY 4.0, footer
checked 12 Oct 2026) and Whitney §§109–149 (public domain). Verification was
manual review against the cited sections; IAST derived from the checked
sources, never memory. Unresolved-claims policy honoured: ṛ rows marked
rare/reference, internal ay/av labelled schematic, prefix/augment forms
labelled specialist, no everyday words invented.

## Illustration requests / assets

`requests.jsonl`: 3 ready (verbs single/dual/plural, verification passed,
production JPGs integrated) + 2 drafts (future reading/passage and
verbs-person art — verification pending, **not queued**; no generation
occurred or was requested). `integration-status.jsonl`: 3 integrated (v1,
12 Oct 2026, affected cards listed). No rejected art. No Codex delivery yet
(expected — generation starts only on owner instruction); pending art renders
the native fallback.

## Preview steps (owner compare path)

1. `cd mobile && npx expo start` → open the app → **Learn** tab (7th).
2. Map shows Beginnings (verbs-number) + How-words-join (6 sandhi lessons),
   resume card, per-lesson sizes, locked prereqs, Sources & credits sheet.
3. Open `verbs-number`: photo + native overlay (large पठति, half-height
   paṭhati), Back/Next + swipe, anchored dual/plural analysis, 2 retrieval
   cards, Finish → read-through endpoint (states no mastery written).
4. Compare the same concept in Path (e.g. sandhi/verb lessons), Grammar
   (vowel-sandhi topics) and Learn; toggle EN/हिं; try larger text (XL),
   reduced motion, and a narrow (320dp) layout.
5. Re-run: `npx tsc --noEmit`, `node scripts/check-contrast.mjs`,
   `node scripts/check-learnv2.mjs`, backend `pytest tests/test_learnv2_specs.py`.

## Screenshots

None captured — no emulator/device run was available in this environment;
no device-only behaviour is claimed. Layout was reviewed by code against
the 320/360dp, large-type, theme and reduced-motion contracts.

## Pending / limits

- No generated Sandhi art (by design); native diagrams ship instead.
- No audio; pronunciation must come from a competent speaker.
- No device run, no screenshots; gesture thresholds (55px / 1.5 axis ratio
  from the rulebook) need on-device tuning.
- Remaining pilot + foundations + verse-rhythm stay drafts in `coverage.md`.
- `CODEX-RESULT.md` / `deliveries.jsonl` are Codex-owned; untouched.
- No commit, no version change, no deploy, no old-tab removal (owner decides).
