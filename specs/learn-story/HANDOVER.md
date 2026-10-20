# Handover: building the story course

For the implementing models (Sonnet, Sol, GLM Flash). The design and every
rule are in [`IMPLEMENTATION.md`](IMPLEMENTATION.md); this file is the work
list. The backend engine, checker, API, shared card player and app screens are
built. The current course has 238 authored lessons, including four optional
readings, and all picture references are delivered. Native phone/screen-reader
acceptance and additional optional readings remain open. See also
`../learn-video-review-20261020/STATUS.md`.

## Read first (in this order)

1. `IMPLEMENTATION.md` sections 0–2 (what exists, what the learner sees).
2. The canvas (ask the owner for access):
   https://claude.ai/artifact/BsDPPpUVBzpiikswSoPANB. Boards "Learn home",
   "Tap a unit", "Journey map", the lesson boards, unit end / leaves / ghosts.
3. The reference unit: `backend/app/curriculum/content/acts/act-1/vowels/`
   (unit.yaml, 4 scenes, revision, check) and `content/prologue/`.
4. `mobile/src/story/types.ts`: exactly what the app receives.
5. `mobile/AGENTS.md` (Devanagari first; every lesson in the shared card
   player) and `specs/artwork/ARTWORK.md` (pictures).

## Rules for every task

- **Do not commit, push, deploy the backend, publish an OTA or start an EAS
  build** unless the owner asks in the conversation. Leave changes in the
  working tree and say what you changed.
- Say how you checked each claim: run, read, or not verified.
- Never change `schema.py`, `pack.py`, `widgets.py` or the API shapes
  without updating `mobile/src/story/types.ts` and `tests/test_curriculum.py`
  in the same change.
- Sanskrit: never invent it, never "fix" the engine's output. Put an engine
  claim (`check:`) on every example the engine can derive. A real quote only
  from a text you opened (DCS, a GRETIL text file, the engine's sūtrapāṭha),
  with its reference. No Wikipedia, Wiktionary or blogs.
- Display: Devanagari first, IAST smaller and secondary; Tiro Devanagari
  Sanskrit for Sanskrit, Mukta for English/Hindi; square corners; Learn's
  action colour `#A63D17` on paper `#F8F2E7` (dark tokens in
  IMPLEMENTATION 10.4). No "AI-written" or "checked by" notes anywhere.
- Hindi is written natively, never machine-literal; English and Hindi both
  complete.
- No audio, no Sarvam, no picture-choice exercises, no avatar animation.
- Accessibility: every control has a label; every widget works by tapping
  (drag is optional); respect reduced motion; text scales.

## Commands

```bash
cd backend
PYTHONUTF8=1 ./.venv/Scripts/python.exe -X utf8 -m app.curriculum check --engine
PYTHONUTF8=1 ./.venv/Scripts/python.exe -X utf8 -m app.curriculum stats
PYTHONUTF8=1 ./.venv/Scripts/python.exe -X utf8 -m pytest tests/test_curriculum.py -q
PYTHONUTF8=1 ./.venv/Scripts/python.exe -X utf8 -m app.curriculum images --missing --out ../specs/learn-story/images/requests.jsonl
```

```bash
cd mobile
node node_modules/typescript/bin/tsc --noEmit
```

Windows notes: without `PYTHONUTF8=1` Devanagari printing crashes; many
mobile files are CRLF in the working tree, so edit them with an editor tool
rather than raw multi-line text matching.

---

## Track A: the app

Build in this order; each task ends with `tsc` clean. Visual tasks also end
with screenshots at 360 px width in light and dark (the web-preview entry
recipe: a temporary `mobile/<name>-preview.tsx` that renders the screen with
fixture JSON; delete it afterwards).

Fixtures: dump the real pack once and use it everywhere:

```bash
cd backend
PYTHONUTF8=1 ./.venv/Scripts/python.exe -X utf8 -c "import json; from app.curriculum import load, build, CONTENT_DIR; p = build(load(CONTENT_DIR)); json.dump({'index': p.index, 'lessons': p.lessons}, open('../mobile/src/story/__fixtures__/pack.json', 'w', encoding='utf-8'), ensure_ascii=False)"
```

### A1 · Flag and entry (GLM Flash / Sol)
- `mobile/src/story/flags.ts`: `STORY_COURSE_DEFAULT = true` following the
  owner's 20 October 2026 approval; a per-device
  override in AsyncStorage (`story.flag.v1`), read once at start. Preserve
  explicit saved on/off choices. Content/scholar sign-off is recorded in
  `owner-approval-20261020.json`; new Sanskrit needs its own review.
- Settings: a row "Try the new Learn (preview)" that flips the override.
  The app is not public yet, so the row can show for everyone; the owner
  decides when it goes.
- `navigation/MainTabs.tsx`: Learn renders `StoryHome` when the flag is on,
  `LearnTrailScreen` otherwise. Add stack routes `StoryMap`, `StoryLesson
  {lessonId}`, `StoryUnitEnd {unitId}`, `StoryLeaves`, `StoryGhosts`,
  `StoryCast`, `StoryReview` to `navigation/types.ts`.
- Done when: flipping the switch swaps the Learn tab without a restart.

### A2 · Data layer (Sonnet)
- `story/api.ts`: `getIndex()`, `getLesson(id, hash)`, `getState()`,
  `postAttempts(body)`, `postTestOut(body)`, `getReview()`; use the existing
  `request` from `api/client.ts`. Index with `If-None-Match`.
- `story/cache.ts`: AsyncStorage keys `story.index.v1`,
  `story.lesson.<id>.<hash>` (delete other hashes of the same id),
  `story.finished.v1` (local finishes), `story.outbox.v1` (queued writes,
  in order; retry with backoff; drop after 7 days).
- Prefetch the current and next two lessons and their pictures (the
  existing `services/artworkCache.ts`).
- Done when: with the network off after one online launch, the home, map
  and the next lesson open.

### A3 · Story state in TypeScript (Sonnet)
- `story/state.ts`: a line-for-line port of `backend/app/curriculum/state.py`
  (`courseOrder`, `derive`).
- `mobile/scripts/check-story.mjs` (pattern: the other `check-*.mjs`
  scripts; transpile with `typescript.transpileModule`): run the same cases
  as `tests/test_curriculum.py` (start at prologue; check needed, revision
  not; freeing; coming soon) on the fixture index.
- Done when: the script passes.

### A4 · Theme (GLM Flash / Sol)
- `story/theme.ts`: light and dark tokens exactly as IMPLEMENTATION 10.4,
  `useStoryTheme()` returning the active set; Settings → Learn → Appearance
  (Light · Dark), stored as `story.appearance.v1`.
- Do not touch `mobile/app.json` (`userInterfaceStyle` stays "light"; Match
  phone comes with the next native build, owner's call).
- Done when: every story screen and card reads colours only from
  `useStoryTheme()` (no hex literals in story files outside theme.ts).

### A5 · Text (Sonnet)
- `story/text.tsx`: `<Bi value={…}/>` picks Hindi or English
  (`useGuideLang`), renders `{{…}}` inline in the Sanskrit face and `**…**`
  bold; `<Sa sa iast size roman/>` renders Devanagari with IAST below
  (hidden when `roman` is off).
- Done when: the vowels lessons' texts render with no literal braces.

### A6 · Card renderers in the shared player (Sonnet)
- Extend the shared player (`screens/LearnV2Lesson.tsx` → `LessonPlayer`);
  do not fork it. Add `story/cards/*` renderers chosen by `card.kind`:
  story (picture, narration, lines with speaker chip, quote with source),
  teach (body, term, rows, steps, formula, examples), table, summary,
  reading (tap a word for its gloss), revision (sections, tags, "seen in
  scene N" link, "new here" badge, rows paged about six per screen), video.
- Pictures: contain fitting with explicit measured size; until
  `delivered`, a paper placeholder with the alt text; dim in dark mode.
- `depth: "panini"` cards are skipped unless Settings → Learn → Pāṇini depth
  (`story.panini.v1`, default off).
- Sources: a small "Sources" line on the last card (title, licence).
- Done when: every card of `vowels.*` and `prologue` renders (fixtures).

### A7 · Practice and gates (Sonnet)
- `story/grade.ts` (pure, tested in `check-story.mjs`): choice, type (NFC,
  trim; compare with `accept`), order, match, engine (by exercise kind; an
  abstained item is skipped, never marked wrong).
- UI: choice buttons; type with tile tray (tap tiles to build; backspace;
  the system keyboard as an alternative); order (tap tokens into slots;
  drag optional); match (tap left then right); feedback = the picked
  option's `why`, then `explain`.
- `roman: "after"` hides all IAST in the card until answered.
- Gate: Continue disabled until solved; after each answer show
  `story.success`/`story.failure` as a story beat; retry until solved.
- Record each practice card's first verdict; at the lesson's end:
  `POST /progress/card-lesson` then `POST /learn/attempts` (through the
  outbox).
- Done when: vowels.short can be completed and both posts appear in the
  outbox / reach the backend.

### A8 · Widgets, first four (Sonnet; mouth_map can go to GLM Flash)
The reference unit needs these. Shapes: `types.ts` (`*Built`); behaviour:
IMPLEMENTATION 4.7.
- `mouth_map`: an SVG side view of the head with six regions (throat,
  palate, roof, teeth, lips, nose); letters as buttons; two-way highlight;
  place names from `place_names` in the guide language.
- `mark_words`: words as toggle chips; "Check" shows found/missed/wrong.
- `rhythm_tapper`: one syllable at a time; tap = light (L), press and hold
  over 350 ms = heavy (G); show the pattern as ◡ (L) and — (G); when
  finished, compare with `scan[].weights` and show the metre name if any.
  Reduced motion: no pulsing.
- `letter_builder`: base letters as targets; signs and halves as chips; tap
  a chip then a base (or drag); show the join large with its IAST from the
  `iast` map; tick off `targets`.
- Done when: each works on its vowels card in light and dark at 360 px.

### A9 · Learn home (Sonnet)
IMPLEMENTATION 2.2 and the "Learn home" board: hero picture with act chip,
Map button and the speech bubble; the road ahead (react-native-svg); next
scene block with Continue and "I know these letters: take the unit check";
three tiles. When the road stops at a planned unit: the "being written"
state. Done when: matches the board in both themes with fixture state at
three points (new learner, mid-unit, unit done).

### A10 · Journey map and unit sheet (Sonnet)
IMPLEMENTATION 2.3–2.4, boards "Journey map" and "Tap a unit". Act sections
in a virtualised list; the road drawn per act with the formula in 2.3; map
backdrops at full width fading into paper (never cropped); opens scrolled to
"you are here"; the act overview scrolls to an act. The unit sheet as a
bottom sheet with the scenes list, revision, check ("Take it now") and
video. Done when: all 44 units render (43 as coming soon) and tapping
navigates correctly.

### A11 · Unit end, leaves, ghosts, cast (Sonnet / GLM Flash)
Compare the state before and after a finish: a newly freed ghost → unit end
(freed picture, freed line with gloss, clue, XP); a newly recovered leaf →
leaf screen. Collections from the index + state. Done when: finishing the
vowels check on fixtures shows Dhūmaka freed.

### A12 · Review and test-out (Sonnet)
- Review tile → `GET /learn/review` → the cards in the player (gates as
  plain practice) → `POST /learn/attempts` with the review verdicts.
- "Take it now" / "I know these" → the unit check; on ≥80% →
  `POST /progress/card-lesson` (check) → `POST /learn/test-out` → unit end.
- Done when: both flows work against a local backend (test client or dev
  server) and offline queueing does not lose them.

### A13 · The other eight widgets (Sonnet; one per task)
Same done-criteria as A8. **All twelve widgets are built (2026-10-20)** in
`mobile/src/story/widgets/` and used by written lessons: form_explorer,
role_arrows, word_shuffle, time_slider (past.augment, future.sya),
word_factory (the five participle lessons), sandhi_mixer (the eleven sandhi
lessons), compound_unpacker (six compound lessons) and derivation_stepper
(pg.it, pg.prakriya). No card shows "coming soon".

---

## Track B: content

Every unit follows IMPLEMENTATION section 11 and the reference unit.
**Write in course order** (later units may `need` earlier skills). Each
unit is one task; the planned `unit.yaml` already holds its skills, sūtras,
episode summary, beats and planned lesson titles: turn each planned lesson
into a lesson file, move its id from `planned` to `lessons`, add the
revision and the check, then `status: ready` only when the checker passes.

Checklist per unit (all must hold):
- [ ] Bible: the ghost (waits_for, freed line with gloss, clue to the next
      unit) and any new character/place, with looks.
- [ ] Each scene: story first; one idea per teach card; practice + explore ≥
      40% of core cards; one gate that moves the story; summary last; 8–14
      cards; pictures on story cards (briefs per IMPLEMENTATION 4.8).
- [ ] Every Sanskrit example under an engine claim when derivable.
- [ ] Revision: core, plus conditions / exceptions / optional / blocked /
      splitting as the chapter has them (`new_here` + example for anything
      no scene showed), mistakes, panini, quick_sheet.
- [ ] Check: 6–12 items, every skill, the freeing gate last.
- [ ] English and Hindi complete; Devanagari first in English text.
- [ ] `check --engine` 0 errors; `pytest tests/test_curriculum.py` passes;
      `review: engine_ok` set on each lesson.
- [ ] A list of anything you were unsure of, for the scholar.

### B1 · Act I, units 2–4 (Sonnet; the owner or Opus reviews)
consonants (Chāyikā), joined-letters (Nidrālu), reading (Maunī). Script
units: use `roman: after` where IAST would give answers away; the
mouth_map and letter_builder widgets (halves for conjuncts).

### B2 · Leaf 1 tale (Opus or the owner)
`content/tales/leaf-1.yaml` (template `tale`), referenced from the bible's
`leaf-1.tale`. Our own short story of the parrot who learned the letters,
using only words a learner can read after Act I, every word glossed, every
inflected word under an engine claim.

### B3 · Acts II–V (Sonnet per unit; Opus for the leaf tales and every real quote)
In course order. Leaf tales 2–7 retell Kathāsaritsāgara chapters (1.6, 1.2,
1.4, 1.5, 1.7–1.8, 4.3): the retelling is ours; any line quoted from the
text is read at the DCS text first and cited.

### B4 · Videos (GLM Flash / Sol)
For each ready unit, one optional YouTube video under 6 minutes (or a
`start`/`end` clip of a longer lecture) that teaches the unit's topic
correctly. Check that embedding is allowed (the video plays in the
existing player). Record in `unit.yaml`: `video: {youtube_id, channel,
title, start?, end?}`. List the candidates for the owner; the owner picks.

---

## Track C: pictures

### C1 · Requests (GLM Flash)
Run the `images --missing` command; hand `requests.jsonl` to the owner
(ChatGPT generation is the owner's tool) with a one-line prompt template per
row: style + brief + cast looks + place look + "Text, exactly: …" + ratio.
Owner update 2026-10-20: audit briefs for useful writing even when an old
`text_in_image` list is empty; record the intended strings and regenerate
earlier blank tags, pages, ledgers and inscriptions. See ARTWORK.md.

### C2 · Verify and deliver (Sonnet)
`specs/learn-story/images/deliver.py` (model it on
`specs/isha-art-20261016/publish_isha.py`):
1. Input: a folder of `<id>.png` from ChatGPT.
2. Proofread every intended written form against the NFC source list and
   inspect the optimized phone image. Independent OCR can assist. Record
   the actual verification method; correct mismatches before replacement.
3. Reject invented script, unintended writing and watermarks.
4. Phone WebP (within 768 × 1536, q80) and tablet WebP (within 1536 × 1536,
   q88), never upscaled; R2 keys `learn/<id>-<sha8>.webp`; immutable cache
   headers; verify both URLs (status, bytes, dimensions, CDN HIT).
5. Append to `backend/app/curriculum/content/images/deliveries.yaml`
   (`id, phone, tablet, width, height, sha256, text_verified, prompt`).
6. Delete the originals only after step 4 passes.
The original 23-picture scope was completed and expanded in the 2026-10-20
follow-up. See `specs/learn-art-20261020/README.md` for all 183 canonical
picture IDs plus five map fallbacks, exact text reviews and delivery evidence.
Scholar review remains a separate release requirement.

---

## Who does what

| Task | Suited to |
|---|---|
| A1, A4, B4, C1 | GLM Flash / Sol |
| A2, A3, A5–A13, C2, B1 drafts, B3 scenes | Sonnet |
| B2, quotes in B3, leaf tales, any change to the blueprints or checker | Opus or the owner |
| Scholar review (`scholar_ok`) | a Sanskrit scholar |

When a task needs a decision the docs do not settle, stop and ask the owner;
do not guess on Sanskrit, story canon or anything user-visible.
