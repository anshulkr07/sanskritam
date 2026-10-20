# The Burnt Book (दग्धा बृहत्कथा): the story course

How the new Learn tab is built: one course, from the first vowel to Pāṇini,
told as one mystery story, played like a game, with lessons as data that can
be added or removed without touching code.

Written 2026-10-19. Read this before any work on the story course. The task
list for implementing agents is [`HANDOVER.md`](HANDOVER.md). The designs are
on the canvas: https://claude.ai/artifact/BsDPPpUVBzpiikswSoPANB (private to
the owner; sources in the git-ignored `mobile/.expo/learn-story-canvas/`).

---

## 0. Status (2026-10-20)

How each claim was checked: **run** = executed here; **read** = read in the
code or at the source; **not verified** = not checked.

| Piece | State | Checked |
|---|---|---|
| Blueprints (`backend/app/curriculum/schema.py`), loader, checker, engine checks, pack builder, story state | built | run: `tests/test_curriculum.py`, 19 tests pass |
| The whole course: prologue, 44 units (5 acts), 234 lessons (scenes, revisions, checks, 7 leaf tales), 2,074 cards | written, `review: engine_ok` (no scholar has read any lesson) | run: `python -m app.curriculum check --engine` → 0 errors, 0 warnings; `stats`; `tests/test_curriculum.py` 19 pass |
| Syllabus: 5 acts, 44 units (44 ready), 137 skills | written | run: checker; sūtra numbers resolve in the engine's sūtrapāṭha |
| `/learn/*` API (index, lessons, state, attempts, review, test-out) | built, registered in `app/main.py` | run: endpoint tests with the test client |
| App contract `mobile/src/story/types.ts` | written | run: `npx tsc --noEmit` clean |
| App screens, widgets, theme | **not built** | see HANDOVER.md |
| Pictures | **none generated**; 183 requests ready as written briefs (`python -m app.curriculum images`); the app shows a placeholder until delivered; `check --release` fails on every undelivered image | run |
| Scholar review of any Sanskrit | **none yet**; `check --release` fails on all 234 lessons (`review is engine_ok; a release needs scholar_ok`) | run |
| Backend deploy, app build, OTA | **not done** (owner only) | — |

Nothing here is committed. Nothing is live.

---

## 1. Decisions (owner, final)

1. **One course for everyone, basics to Pāṇini.** Classical, Pāṇinian and
   modern Sanskrit; beginners, intermediates, advanced. No placement test:
   everyone starts at the prologue; those who know go faster ("I know this"
   inside a scene, test-out of a unit by its check).
2. **One big story.** "The Burnt Book": a mystery rooted in the real legend of
   Guṇāḍhya's Bṛhatkathā (Kathāsaritsāgara 1.8), with temples, a library,
   ghosts (gentle), mantras, siddhis and their moral limits, devas. Every unit
   frees one ghost; every part recovers one leaf of the burnt book.
3. **Scene first, with a map.** The Learn home shows the current scene; a
   painted journey map explains where the learner is. The earlier "story map"
   and "story book" homes were rejected as dull; the book survives as the unit
   sheet's list of scenes.
4. **Lessons are data built on blueprints.** Add, move or remove a lesson or a
   unit by editing YAML; the checker refuses anything that breaks the rules.
5. **Revision is a whole lesson per unit and holds everything** about the
   chapter, including conditions and exceptions no scene showed (marked "new
   here", always with an example).
6. **Pictures everywhere, made in ChatGPT.** They may contain writing; a
   verifier compares the writing with the brief. No picture-choice exercises
   ("tap the matching picture"). The Sanskrit on a card is always live text,
   never only inside a picture.
7. **Interactive explorables, not avatar animation.** No Rive/avatars. Twelve
   hands-on widgets (section 4.7).
8. **No audio, no Sarvam** in this course.
9. **An optional YouTube video per unit,** after the unit, earning nothing.
10. **Light and dark themes.**
11. Square corners; Learn's action colour `#A63D17` on paper `#F8F2E7`;
    Tiro Devanagari Sanskrit for Sanskrit, Mukta for English and Hindi;
    Devanagari first, IAST secondary (see `mobile/AGENTS.md`).
12. Sources: only what we may use commercially (`original`, public domain,
    CC0, CC BY, CC BY-SA, MIT); primary sources only (the text itself, a
    dictionary of record, a paper actually opened), never Wikipedia or blogs.

---

## 2. What the learner sees

### 2.1 First run
The prologue (4 story cards): Guṇāḍhya writes the book in his blood; the
ghosts who heard it were freed; he burns six tales leaf by leaf; today a
half-burnt leaf glows for you. Every quote is real (KSS 1.8, read at the DCS
text). Then scene 1 of Vowels starts.

### 2.2 Learn home (canvas: "Learn home")
Top to bottom:
1. **The current scene's picture**, full width at its own ratio (4:3, never
   cropped; paper fill around it in dark). Top left: the act chip
   ("प्रथमः अङ्कः · Act I · The Leaf", act colour square). Top right: **Map**.
   Bottom left over the picture: a speech bubble from the scene's first
   spoken line (portrait + Sanskrit + gloss), taken from the next lesson's
   first story card that has `lines`.
2. **The road ahead** (tappable, opens the map): the current unit as a
   horizontal road. One diamond per required stop (scenes, then the check);
   done stops filled green, the current one large in the action colour, the
   rest outlined; under each a short Devanagari label (the scene's
   `title_sa`, or its first Sanskrit row); at the end the unit's ghost,
   greyed until freed. Header: "UNIT 2 OF 4 · व्यञ्जनानि · CONSONANTS".
3. **The next scene**: "SCENE 3 OF 5 · 6 MIN", `title_sa` large, English
   title, one line from the unit's story so far, **Continue the story**
   (primary), and a text button **I know these letters: take the unit check**.
4. Three tiles: **Leaves n/7**, **Freed n** (ghosts), **Review n** (due).

When the road stops at a planned unit: the hero shows the last freed
ghost's freed picture, "The next part of the story is being written", and
Review stays available.

### 2.3 Journey map (canvas: "Journey map")
A vertical scroll, one painted region per act:
- Sticky header: course title, close.
- **Act overview**: five tiles (I–V) with act colour, `title_sa`, units
  done/total; the current act outlined. Tap scrolls to the act.
- Legend: done, you are here, ahead, coming soon (dotted), ghost, leaf.
- The prologue as a row ("Read again").
- Each act: its painted backdrop (`act.map`, 9:16, placed at full width at
  the region's top and fading into paper; never cropped or stretched), a
  banner (`title_sa`, title, place, goal, "n of m units done"), then the road:
  a winding path the app draws (a gentle S-curve down the left third), one
  stop per unit, a card per stop to the right of the road:
  - done: `title_sa` + title, "Done · <ghost> freed", ghost portrait glowing;
  - current: border in the action colour, "YOU ARE HERE", scene n of m,
    segment bar, the ghost's `waits_for`, ghost portrait greyed;
  - ahead: faint card, scene count, ghost greyed;
  - planned: dashed card, "Coming soon", dotted road.
  - At each part's end: the leaf card ("END OF PART 1 · LEAF 1 OF 7",
    `title_sa`, title, "Still burnt: free the ghosts of this part to recover
    it", or the leaf picture when recovered; tap opens the leaf tale).
- Tap a unit card → the unit sheet. The map opens scrolled to "you are here".

The road positions are computed, never stored: stop *i* sits at
`y = top + i * pitch`, `x = 58 + 22 * sin(i * π / 2)` (pitch 150 pt at
default text size, more when the card grows). Adding a unit just adds a stop.

### 2.4 Unit sheet (canvas: "Tap a unit")
A bottom sheet (square top corners, drag handle, 85% height):
- "ACT I · UNIT 2 OF 4", `title_sa` + title, close.
- The ghost: portrait, "Chāyikā is waiting", `waits_for`, "freed when you
  pass the unit check" (freed: the freed line in Sanskrit with its gloss).
- **The story so far** (`episode.summary`).
- **Scenes** (the story book): numbered rows, done ✓ / current (highlighted,
  "Up next") / ahead; each opens that lesson. Done scenes stay replayable.
- **Everything about <unit>** (revision; open any time).
- **The check** ("Read her name · frees Chāyikā") with **Take it now**.
- **Video** (only when the unit has one; after the unit; optional).
- Footer: **Continue: scene n**.

### 2.5 Inside a lesson
Every lesson opens in the **shared swipeable card player** (the one in
`mobile/src/screens/LearnV2Lesson.tsx`; `mobile/AGENTS.md` requires it):
Continue/Back, a progress bar, one card at a time. Story cards show the
picture, narration, spoken lines (speaker chip with portrait; Sanskrit large,
IAST small, gloss) and quotes (with their reference). Practice gives
immediate feedback (`why` for the wrong option picked, then `explain`). A
**gate** puzzle holds the story: Continue is disabled until it is solved;
then its `story.success` (or `failure`, and a retry) shows as a story beat.
"Pāṇini" cards appear only when Pāṇini depth is on (Settings; default off).
The last card is the summary; finishing posts the lesson.

### 2.6 End of a unit
After the check: the ghost's freed picture, the freed line (Sanskrit, IAST,
gloss), the clue line, "Ghost freed", XP, then back to the home with the
next unit's road. When it was the part's last unit: **leaf recovered**
(leaf picture, title, "read the tale" when the tale exists).

### 2.7 Collections
- **Leaves** (7): recovered leaves bright and readable; others burnt.
- **Ghosts**: every ghost of ready units; freed ones with portrait and freed
  line; waiting ones greyed with `waits_for`.
- **Cast**: characters with portraits and roles (from the index).

### 2.8 Review
Every practice card answered in a lesson joins the spaced-review schedule
(`kind = "learn"`). The Review tile opens a session of due cards rendered by
the same card renderers (gates behave as normal practice there).

---

## 3. Architecture

```
backend/app/curriculum/content/**.yaml      ← authors and agents edit only this
        │  loader.load()        file → blueprint objects (+ load issues)
        ▼
schema.py (pydantic, extra="forbid")        ← the blueprints
        │  validate.validate()  structure, story, coverage, order, text, images
        │  engine.run()         every Sanskrit claim, exercise and widget input
        ▼
pack.build()  → index + one payload per shippable lesson (IAST, sūtra text,
        │       widget data, answer variants; never claims/briefs/beats)
        ▼
app/routers/learn.py  /learn/index · /lessons/{id} · /state · /attempts ·
        │             /review · /test-out   (+ POST /progress/card-lesson)
        ▼
mobile/src/story/  cache by ETag/hash → screens → shared card player
```

Content ships with a **backend deploy** (the app fetches the index and caches
lessons by hash): no app build, no OTA for new or fixed lessons. A new card
kind or widget needs app code (OTA).

`get_pack()` builds once per process. The first build pays engine start-up
(≈7 s here, mostly loading the analyzer the backend loads anyway); a rebuild
takes 0.06 s (run). CI runs the same checks in `tests/test_curriculum.py`.

---

## 4. The content model

The full shapes are `backend/app/curriculum/schema.py` (the source of truth)
and its JSON Schema `specs/learn-story/content.schema.json` (regenerate with
`python -m app.curriculum schema --out ../specs/learn-story/content.schema.json`).

### 4.1 Files

```
content/
  course.yaml                      Course: title, prologue id, acts in order
  bible.yaml                       Bible: style, characters, places, ghosts, leaves
  images/deliveries.yaml           ImageDelivery list (written by the image step)
  prologue/prologue.yaml           Lesson (template prologue)
  tales/<lesson-id>.yaml           Lesson (template tale), one per leaf tale
  acts/<act-id>/act.yaml           Act: parts (each: leaf + units in order)
  acts/<act-id>/<unit-id>/unit.yaml
  acts/<act-id>/<unit-id>/<lesson-id>.yaml
```
Folder and file names must equal the ids. Order lives only in the parent's
list. Ids are meaning-based (`vowels.short`, never `lesson-3`); lesson ids are
at most 32 characters (they are `GameResult.mode` and the client cache key).
**Never rename a published lesson id**: progress is keyed by it.

### 4.2 Hierarchy and what each level owns

| Level | Owns | Story role |
|---|---|---|
| Course | prologue, acts | the burnt book |
| Act (5) | place, colour, goal, map backdrop, parts | a region of the map |
| Part (7 leaves; Act II and IV have two parts) | one leaf, units | ends by recovering a leaf |
| Unit (44) | ghost, episode (story so far + authors' beats), skills, lessons, revision, check, video | one chapter, one ghost freed |
| Lesson | template, cards, teaches/needs, sources, review status | one scene (or revision, check, tale) |
| Card | one kind (below) | one beat |

### 4.3 Templates (rules the checker enforces)

| Template | Rule |
|---|---|
| `prologue` | two or more story cards, nothing else |
| `scene` | 5–20 cards (aim 8–14); opens with a story card; at least one teach card; ends with a summary; practice + explore at least 30% of core cards (aim 40%); every skill in `teaches` tagged on some card |
| `episode` | reading cards and practice |
| `revision` | revision sections and practice only; sections in this order: core, conditions, exceptions, optional, blocked, splitting, mistakes, panini, quick_sheet; must have core and quick_sheet |
| `check` | practice only; at least 6 items; every unit skill at least once |
| `tale` | reading cards (a leaf's tale, read in Sanskrit) |

A unit that is `ready` needs its ghost, lessons, revision and check; each of
its skills must be taught by a lesson, practised, and present in the check
(a skill with no revision row is a warning). Lessons may declare `needs`
skills; each must be taught earlier in course order (planned lessons count,
so the syllabus can be written ahead of the scenes).

### 4.4 Card kinds

| Kind | Fields (besides id, title, image, depth, skills, sutras) |
|---|---|
| `story` | narration (≤70 words), lines (speaker + Sanskrit + gloss, or plain text), quote (Sanskrit, gloss, **source required**) |
| `teach` | body (≤60 words), examples, rows (2–4 contrasts), steps (a formation left to right), formula, term |
| `table` | caption, columns, rows of cells (Sanskrit or text, highlight), note |
| `explore` | widget, prompt, params (4.7), `roman` |
| `practice` | mode, prompt, explain, options / answers + tiles / tokens / pairs / exercise, `gate` + story result, `roman` |
| `summary` | points |
| `reading` | passage of sentences with tap-to-gloss words |
| `revision` | section, rows (4.6) |
| `video` | YouTube id, channel, start/end seconds |

`depth: panini` marks extra-depth cards (shown only with Pāṇini depth on;
they do not count toward the practice share). `sutras: ["1.2.27"]` cite rules;
the builder ships each with its Devanagari text from the engine's
sūtrapāṭha; the Śiva sūtras are `SS.1`–`SS.14`.

### 4.5 Practice modes (graded on the phone)

| Mode | Data | Correct when |
|---|---|---|
| `choice` | options (Sanskrit or text), exactly one `correct`; optional `why` per wrong option | the correct option is picked |
| `type` | `answers` (+ builder's `accept` with pause variants); optional `tiles` (answer pieces + decoys) | the joined tiles or the typed text (NFC, spaces trimmed) is in `accept` |
| `order` | `tokens` in the right order (shuffle for display; a shuffle equal to the answer is reshuffled) | the order matches |
| `match` | `pairs` of left/right options | every pair joined right |
| `engine` | `exercise` built by the engine with its answer | `answer` matches (per exercise kind) |

Rules: the first answer is the graded one (retries allowed, feedback each
time); a gate must end solved (retry until right, with the failure beat
after each miss). `roman: "after"` hides every IAST in the card until it is
answered (script lessons, where IAST gives the answer away). Picture-choice
exercises are not allowed.

### 4.6 Revision rows
`{skill, formula, rule, example, sutras, tag: core|good|rare, taught_in |
new_here}`. `taught_in` is `"<lesson>#<card>"` (the app shows "seen in
scene N" and links it). `new_here: true` marks a rule no scene showed; it
must carry an example. The client pages rows about six per screen.

### 4.7 The twelve widgets

Params are typed (`*Params` in `schema.py`, `WIDGET_PARAMS`); the checker
parses them, so a misspelt key fails. The builder adds what the engine must
supply (`widgets.compute`), plus an `iast` map for every Sanskrit string the
widget can display. Every widget must work by tapping (drag is a shortcut,
never the only way), with reduced motion respected and screen-reader labels.

| Widget | Author gives | Builder adds | The learner |
|---|---|---|---|
| `letter_builder` | bases, signs, halves, targets | IAST of every possible join | taps or drags a vowel sign / half letter onto a base; sees the joined akṣara (Unicode join, e.g. क + ि = कि, क् + ष = क्ष) and its IAST; ticks off targets |
| `mouth_map` | letters | `places` per letter, `place_names` | taps a letter → its place(s) light on a side view of the mouth (throat, palate, roof, teeth, lips, nose); taps a place → its letters |
| `form_explorer` | stems (stem, linga) or roots (dhātu, lakāras); optional row/column limits | full grids from the engine (`paradigms`) | switches case/number (or person/number/tense) and watches the form change; the changed ending highlighted |
| `role_arrows` | sentence words with roles (+ claims), meaning | — | draws (taps) an arrow from each noun to the verb and names its role |
| `time_slider` | forms (label, Sanskrit, meaning, claim) | — | slides one sentence past → present → future |
| `word_shuffle` | words, meaning | — | reorders freely; the meaning stays (free word order) |
| `sandhi_mixer` | pairs (first, second, joined, sūtras) | — (each pair checked against the sandhi table) | drops one word on the other to join; pulls apart to split; sees the rule |
| `compound_unpacker` | compound, parts, kind, vigraha, meaning | — (scholar review: the engine does not check compounds) | splits the compound and builds its meaning tree |
| `word_factory` | roots (dhātu, gloss), suffixes (kṛt name, label) | `results` from the engine | snaps a suffix onto a root and gets the word |
| `mark_words` | passage, targets | — | taps every matching word |
| `rhythm_tapper` | lines | `scan` (syllables, L/G weights, metre name) from the engine | taps light, holds heavy; the pattern and the metre's name appear |
| `derivation_stepper` | target, spec (a claim) | `steps` (sūtra, text, result) from the engine | steps through the derivation one sūtra at a time |

### 4.8 Pictures
`image: {id, brief, alt, text_in_image, ratio, cast, place}` on any card;
portraits (`characters[].portrait`, 1:1), freed scenes (`ghosts[].freed_image`,
4:3), leaves (`leaves[].image`, 3:4) and map backdrops (`acts[].map`, 9:16,
no text). Ids are unique across the course. The brief says who, what, where,
and what must be visible; the bible supplies the fixed style and every cast
member's and place's look. `text_in_image` lists every string the picture
must show, exactly; map backdrops carry none. See section 9.

### 4.9 Review status
`draft` → `engine_ok` (all its engine claims pass; the author sets it after
`check --engine`) → `scholar_ok` (a Sanskrit scholar signed off). A release
build (`check --release`) refuses anything below `scholar_ok` in a shipped
lesson, and any picture not delivered (or with unverified text).

---

## 5. The checker

`python -m app.curriculum check [--engine] [--release]` (run from `backend/`
with `PYTHONUTF8=1`). Exit 1 on any error. What it enforces, beyond 4.3:

- **Load**: YAML parses; every file fits its blueprint (`extra="forbid"`:
  unknown keys fail, which also catches an unquoted comma splitting a
  `{en: …, hi: …}` value); folder/file names equal ids; ids unique.
- **Structure**: acts listed in the course exist and every act is listed;
  units sit in their act's folder and in exactly one part; each leaf ends
  one part; lessons are used once (by a unit, the prologue or a leaf tale).
- **Bible**: characters, places, ghosts unique; each ghost is a character of
  kind ghost and names the unit whose `ghost` it is; leaves numbered 1..7.
- **Text**: English never empty; Hindi present (error in ready units and
  shipped lessons, warning in planned units), not a copy of the English, not
  mostly Latin letters.
- **Sanskrit**: every Sanskrit field is Devanagari only and NFC.
- **Sūtras**: every reference exists in the engine's sūtrapāṭha or SS.1–14.
- **Cards**: teach body ≤60 words, narration ≤70 (warnings); story lines are
  Sanskrit + gloss or plain text, by a bible character; choice has exactly
  one correct option; `type` tiles can build `answers[0]` (each tile once);
  match sides are Sanskrit or text; a gate has its story result; widget
  params fit their shape (plus: mark_words targets are in the passage,
  letter_builder targets can be built, mouth_map letters have places,
  form_explorer takes stems or roots, …).
- **Revision rows**: `taught_in` xor `new_here`; `taught_in` points at a real
  card (another unit's card is a warning); `new_here` needs an example.
- **Coverage and order**: 4.3.
- **Images**: ids unique, cast and place in the bible, alt text in both
  languages, briefs not trivially short; release: delivered and verified.
- **Licences**: only `ALLOWED_LICENCES`.
- **Engine (`--engine`)**: every `check` on Sanskrit (examples, words, rows,
  cells, lines, sentences, practice answers, widget words, sandhi pairs,
  derivation targets) is derived by the engine exactly (optional forms and
  pause forms allowed); every engine exercise generates a real item with an
  answer; every widget's engine inputs (grids, results, scans, derivations)
  are makeable. A claim the engine cannot derive is cut or left without a
  claim for the scholar, never written around.

`python -m app.curriculum stats` prints counts; `images` prints picture
requests; `schema` writes the JSON Schema.

---

## 6. The pack (what phones receive)

- **Index**: course (+ prologue summary), acts (place, colour, goal, map
  picture, parts → leaf (+ tale summary, picture) and units → title, status,
  story so far, ghost (names, waits_for, freed line, clue, portrait, freed
  picture), skills (+ sūtras), lesson summaries (ready units only), planned
  lesson titles, revision, check, video), finale leaves, characters (+
  portraits), `version`.
- **Lesson**: header, sources, cards. Every Sanskrit string gains IAST; sūtra
  refs become `{ref, sa, iast}`; `type` answers gain `accept` (final ं/म्,
  ः/स्/र् pause variants); engine exercises are generated with their answers;
  explore params are built (4.7); pictures become `{id, alt, ratio,
  delivered, phone?, tablet?, width?, height?}`.
- **Never shipped**: engine claims, picture briefs/text lists/cast, authors'
  episode beats, lessons of planned units.
- **Hashes**: each lesson has `hash` (sha1 of its payload, 12 hex); the index
  `version` covers the index and every lesson hash. Same content → same hash
  (run: a second build is identical).

The TypeScript contract is `mobile/src/story/types.ts`. Change both together.

---

## 7. API

All under `/learn`; JSON; Learn content needs no sign-in.

| Method | Path | Auth | Returns |
|---|---|---|---|
| GET | `/learn/index` | none | the index; `ETag: "<version>"`; `If-None-Match` → 304 |
| GET | `/learn/lessons/{id}` | none | one lesson; `ETag: "<hash>"`; 304; 404 unknown |
| GET | `/learn/state` | learner | story state (section 8) + `version` |
| POST | `/learn/attempts` | learner | `{lesson_id, results: [{card_id, verdict}]}` → `{scheduled}`; practice cards only; `unsure` schedules nothing; ≤60 results; 404 unknown lesson |
| GET | `/learn/review?limit=12` | learner | `{due_count, items: [{item_key, lesson_id, lesson_title, due_at, card}]}`; cards removed from content are skipped |
| POST | `/learn/test-out` | learner | `{unit_id, checks_right, checks_total}` → `{finished: [lesson ids]}`; needs the unit's check finished, ≥80% right, and the unit to be the learner's current one (409 otherwise); marks its lessons finished with no XP |

Finishing a lesson stays **`POST /progress/card-lesson {lesson_id,
checks_right, checks_total}`** (first finish earns `CARD_LESSON_XP`; every
finish marks the day; a `GameResult` row with game `card-lesson`, mode =
lesson id). The story state is derived from those rows. Review items use
`ReviewItem` with key `learn:<lesson>#<card>` and kind `learn`.

**Order in the app when a lesson ends:** POST `/progress/card-lesson` →
POST `/learn/attempts` → GET `/learn/state` (or derive locally) → show any
unit end / leaf recovered. Offline: queue both POSTs (keep order; retry with
backoff; drop after 7 days) and derive the state locally.

---

## 8. Story state (derived, never stored)

From the set of finished lesson ids (`app/curriculum/state.py`; port it to
TypeScript for offline use and test it against the same cases):

- Course order: prologue → for each act → part → unit: its lessons, its
  revision (not required), its check. A planned unit is one "coming soon"
  stop that ends the road.
- A unit is **done** when its lessons and its check are finished; its ghost
  is **freed** then. A leaf is **recovered** when every unit of its part is
  done. The **current** stop is the first unfinished required stop.
- Test-out finishes a unit's lessons without XP (section 7).

---

## 9. Pictures (ChatGPT)

The owner's choice (2026-10-19): pictures are generated in **ChatGPT**, may
contain writing, and a verifier checks that writing. This extends
`specs/artwork/ARTWORK.md` for Learn (recorded there); everything else in
that policy applies: one generation per picture, phone-first composition
with the subject grouped in the centre, contain fitting, phone/tablet WebP
derivatives, content-hashed R2 keys behind `https://cdn.vedicvalor.com` with
immutable caching, verified public URLs, originals discarded after delivery.

1. **Requests**: `python -m app.curriculum images --missing --out
   ../specs/learn-story/images/requests.jsonl` → one JSON line per picture:
   id, ratio, the bible's style, brief, the look of every cast member and the
   place, `text_in_image`, alt.
2. **Generate** in ChatGPT: prompt = style + brief + cast looks + place look +
   "Text: exactly …" (only when `text_in_image` is not empty) + ratio. Save
   as `<id>.png` in a temporary folder.
3. **Verify text** (pictures with `text_in_image`): read the Devanagari back
   with Gemini vision (the owner's existing Gemini setup), compare NFC
   strings exactly with `text_in_image`; then a human glance. Any mismatch
   → regenerate. Pictures without text: reject any lettering, fake script
   or watermark.
4. **Review**: cast consistent with the bible (Dādī's spectacles and sari,
   Śuka's ring, ghosts kind and luminous, "you" never showing a face).
5. **Deliver**: WebP phone (fit within 768 × 1536, q80) and tablet (fit
   within 1536 × 1536, q88), never upscaled; upload under
   `learn/<id>-<sha8>.webp`; verify both URLs (status, bytes, dimensions,
   CDN HIT on repeat); append to `content/images/deliveries.yaml`:
   `{id, phone, tablet, width, height, sha256, text_verified, prompt}`.
6. Delete the original PNG. Keep the prompt and hashes (in deliveries.yaml).

Until delivered, a card shows a paper placeholder with the alt text; the
lesson works without pictures.

---

## 10. The app

### 10.1 Where it lives
`mobile/src/story/` (new): `types.ts` (done), `api.ts`, `cache.ts`,
`state.ts`, `theme.ts`, `text.tsx` (inline markup), `screens/`
(`StoryHome.tsx`, `JourneyMap.tsx`, `UnitSheet.tsx`, `UnitEnd.tsx`,
`LeafShelf.tsx`, `Ghosts.tsx`, `StoryReview.tsx`), `cards/` (one renderer per
kind), `widgets/` (one file per widget), `grade.ts`.

### 10.2 Switching the Learn tab
A flag `STORY_COURSE` (remote config or a build-time constant in
`app.json` extra, default **off**). Off: today's trail (`LearnTrail`) as now.
On: the Learn tab renders `StoryHome`. The old trail's lessons remain
reachable from Learn's Library until the owner retires them. No progress
migration: the story course starts at the prologue for everyone (owner
decision: no placement; test-out makes it fast).

### 10.3 Data
- `GET /learn/index` with `If-None-Match`; cache the JSON (AsyncStorage key
  `story.index.v1`). On launch: show the cached index at once, revalidate.
- Lessons: fetch by id with the summary's `hash` as the cache key
  (`story.lesson.<id>.<hash>`); prefetch the current and next two lessons
  and their pictures (artwork cache, at most three downloads in flight).
- State: `GET /learn/state` when online; otherwise derive locally from the
  locally recorded finishes (`state.ts`, a port of `state.py`).
- Writes: section 7, queued offline.

### 10.4 Theme (light and dark)
Tokens (Learn's light set is the current `mobile/src/trail/theme.ts`; dark
computed for WCAG AA on `#17130F`, run):

| Token | Light | Dark | Dark contrast on paper |
|---|---|---|---|
| paper | #F8F2E7 | #17130F | — |
| surface | #FFFCF6 | #221C17 | — |
| line / lineStrong | #E5D9C6 / #D9CCB6 | #3A3029 / #4A3E34 | — |
| ink | #2A2019 | #F3EADB | 15.5 |
| ink2 | #5F5245 | #CDBFAA | 10.2 |
| ink3 | #75665A | #A89886 | 6.6 |
| action (button fill, white text) | #A63D17 | #A63D17 | white on it 6.4 |
| actionText (links, outlines) | #A63D17 | #E8875C | 7.1 |
| done / doneInk | #2E7D4F / #25683F | #4E9E6C / #7CC79A | 5.7 / 9.2 |
| wrongInk | #9E2219 | #F08A80 | 7.6 |
| ochre (leaves) | #9A4A26 | #E09A6A | 7.9 |
| indigo (ghosts) | #3A548A | #8EA6D8 | 7.6 |

Act colours are used as accents (banners, squares), never as text on dark.
Pictures in dark: `brightness(0.85)`-equivalent dim overlay, never inverted.

The switch: Settings → Learn → Appearance: **Light · Dark** now (OTA-safe,
stored per device). **Match phone** needs `userInterfaceStyle: "automatic"`
in `mobile/app.json` (today `"light"`, read) and a native build; add it with
the next build, then default to Match phone.

### 10.5 Screens
Follow the canvas boards exactly (sizes, order, copy patterns). Each screen's
data comes from the index + state:
- **StoryHome**: section 2.2. The scene picture = the first story card
  picture of the current lesson (fetch the lesson; until it loads show the
  act's map picture or paper).
- **JourneyMap**: section 2.3. One `FlatList` of act sections (virtualised;
  44+ units).
- **UnitSheet**: section 2.4.
- **Prologue**: the prologue lesson in the card player, auto-opened on first
  run (state.current = prologue).
- **UnitEnd / LeafRecovered**: section 2.6, shown after the lesson that
  completes a unit or a part (compare state before and after).
- **LeafShelf, Ghosts, Cast**: section 2.7.
- **StoryReview**: due cards from `/learn/review` in the card player.

### 10.6 The card player
Extend the shared player; do not fork it. Add a renderer per kind in
`story/cards/`, chosen by `card.kind`. Rules:
- Sanskrit in Tiro Devanagari Sanskrit; IAST below in Mukta, smaller, ink3.
- `{{…}}` in learner text renders inline in the Sanskrit face; `**…**` bold.
- Hindi when the guide language is Hindi, else English (the existing
  `useGuideLang`).
- `depth: "panini"` cards are skipped unless Pāṇini depth is on.
- A gate disables Continue until solved; show the story result as a beat.
- Pictures: contain, explicit measured size, placeholder until delivered.
- Revision cards: page rows ~6 per screen; tags as small labels (core,
  good to know, rare); "seen in scene N" links; "new here" badge.
- Video cards / unit video: the existing YouTube player
  (`react-native-youtube-iframe`), `start`/`end` honoured, no XP, after the
  unit (YouTube Developer Policies III.F.3: no rewards for watching).

### 10.7 Grading
Local, per 4.5. Normalise to NFC; compare `accept`. Record each practice
card's first verdict (`correct`/`incorrect`) for `/learn/attempts`. Never
show a "wrong" for anything the engine marked unsure (engine exercises:
`abstained` items are skipped).

### 10.8 "I know this"
In a scene: jumps to the first practice card (the scene still counts as
finished only when its practice is done). On the home and the unit sheet:
opens the unit check; a pass (≥80%) calls `/learn/test-out` and plays the
unit end.

---

## 11. Writing content

1. Write the unit's **episode** first (summary + 3–5 beats) and its **skills**;
   the bible must already have its ghost (with `waits_for`, freed line,
   clue) and any new character or place.
2. Write each **scene** as the reference unit does (`acts/act-1/vowels/`):
   story card(s) → one idea per teach card, each followed by something to
   do → a gate puzzle that moves the story → summary. Practice + explore at
   least 40% of core cards. Put every Sanskrit example under an engine claim
   when the engine can derive it.
3. Write the **revision** lesson with every rule of the chapter, including
   what the scenes skipped (`new_here` + example), mistakes, Pāṇini rows and
   a quick sheet.
4. Write the **check**: 6–12 items, every skill, ending with the gate that
   frees the ghost.
5. Hindi written natively (not word for word), both languages complete.
6. Real quotes only from texts read at the source (DCS, GRETIL text files,
   the engine's sūtrapāṭha); the reference goes in `quote.source`.
7. Run `check --engine`; fix every error; set `review: engine_ok`.
8. Scholar review → `scholar_ok`. Then set the unit `status: ready`.

Story bible rules: ghosts are gentle and luminous, never frightening;
siddhis are real in the tradition but never the goal (Yoga Sūtra 3.37: they
are obstacles to samādhi); devas are treated with reverence; Lubdhaka is
greedy, never demonic; "you" never shows a face.

---

## 12. Migration and release

1. Backend deploy with the course (flag off in the app: nothing changes for
   users; `/learn/*` simply exists).
2. App OTA with the story screens behind the flag; turn it on for the owner's
   device first.
3. Owner plays Vowels end to end on a phone, light and dark.
4. Act I written and reviewed → flag on for everyone.
5. The old trail stays in the Library until the story course covers its
   material; then the owner decides its removal.

---

## 13. Phases and acceptance

| Phase | Done when |
|---|---|
| 0 Engine + reference unit (this work) | checker and tests pass; canvas approved |
| 1 App shell | Vowels playable end to end on a phone: prologue → 4 scenes (4 widgets: mouth_map, mark_words, rhythm_tapper, letter_builder) → revision → check → Dhūmaka freed; light and dark; offline after first load; attempts reach review |
| 2 Act I complete | consonants, joined-letters, reading units ready; leaf-1 tale; all Act I pictures delivered and verified; scholar review of Act I |
| 3 Acts II–V | units written in course order, each passing `check --engine`; remaining widgets built as their first unit needs them |
| 4 Retire the trail | owner decision |

---

## 14. Known gaps and risks

- **No Sanskrit is scholar-reviewed yet**; everything is `draft` (run).
- The engine cannot check compounds (samāsa), kāraka roles, pluta (३) or
  uṇādi words; such content needs the scholar. (`तितउ` was cut: the engine
  derives `तितो`; run.)
- The Śiva sūtra "drum" legend (Nandikeśvara) and the brahmarākṣasa
  grammar legend are **not verified** at a primary source; neither is used.
- Picture text accuracy depends on the verifier; ChatGPT often misdraws
  Devanagari. Keep `text_in_image` short.
- The checker enforces shape and the engine claims, not teaching quality.
  Two limits found in the last pass (run, 2026-10-20):
  - `verify(SN(first, second, joined))` passes any split whose parts simply
    join to the surface (स + ज्जनः passes for सज्जनः). A sandhi claim proves
    the junction obeys a rule, not that the two words are real; the words
    are the scholar's to confirm.
  - The engine exercise `sandhi_split` chose arbitrary splits (सज्जनः →
    स + ज्जनः), so all 16 uses were replaced by authored choice cards whose
    wrong options are checked to fail the rule table. Do not use
    `sandhi_split` or `derive_next` (the app shows only random sūtra codes
    for it) until the generator is fixed. `reorder`, `grid_fill` and
    `scan_metre` were audited and hold.
- All twelve explore widgets are built and every one is used by written
  lessons (2026-10-20; run: count of widgets across the content: mark_words
  123, sandhi_mixer 11, mouth_map 7, rhythm_tapper 6, compound_unpacker 6,
  word_factory 5, letter_builder 3, form_explorer 3, role_arrows 2,
  time_slider 2, derivation_stepper 2, word_shuffle 1). Before this pass
  `mark_words` was 123 of 145 explore cards because the other widgets were
  unbuilt and I avoided them; the handover had assigned them to units.
  `compound_unpacker` kinds, parts and phrases are authored (the engine cannot
  check compounds) and need the scholar. `word_shuffle` takes an authored `not_first` list
  (च in who.order) because the word-order engine accepts any permutation,
  including ones that open with च; that list is for the scholar to confirm.
- Words the engine cannot derive were typed literally and wait for the
  scholar: numerals, adverbs and particles, compounds (samāsa), kāraka
  roles, avagraha joins, e/o + vowel sandhi examples, the weekday names, and
  usage notes. Real verses are quoted only where they were read at the source
  (DCS, CC BY 4.0; GRETIL, CC BY-NC-SA 4.0, read in memory and not saved);
  the Nītiśataka and Īśā-commentary e-texts are marked unproofread by GRETIL
  itself.
- Metre claims rest on `app.services.chandas` (vidyut-chandas, whose table
  comes from the Vṛttaratnākara via Shreevatsa Rajagopalan's project) and on
  counts made by hand from its weights; the textbook rules taught (the
  anuṣṭubh places five to seven, the Āryā quarters of 12-18-12-15 mātrās, that
  anusvāra and visarga make a vowel heavy) were checked against real verses
  scanned by the engine but were not read in a primary treatise on metre.
- `Match phone` dark mode needs a native build (10.4).
- Content volume: the index grows with units (≈77 KB uncompressed now, run);
  gzip is on.

---

## 15. Why this design (research read earlier in this work)

- Retrieval practice and spacing are the most useful study techniques
  (Dunlosky et al. 2013; Roediger & Karpicke 2006) → practice ≥40%, review.
- Guidance helps novices and hinders experts (Kalyuga 2003, expertise
  reversal) → test-out, "I know this", Pāṇini depth off by default.
- Four strands (Nation 2007): meaning-focused input (the story, tales),
  output (type/order), language focus (teach/revision), fluency (review).
- Games help when the learning is the game mechanic (Habgood & Ainsworth
  2011, intrinsic integration) → gates are the lesson's own skill; narrative
  helps when it carries the content (Naul & Liu 2019).
- Gamification effects are real but modest (Sailer & Homner 2020) → story and
  collection, no leaderboards inside Learn.
- Short videos hold attention (Guo et al. 2014: under 6 minutes) → one
  optional clip per unit, clipped with start/end.
- Virtual manipulatives and explorable explanations (Moyer-Packenham &
  Westenskow 2016; PhET's implicit scaffolding; Bret Victor) → the widgets.
