# Sanskritam — The Lesson Overhaul (P23 · U15)

**Audience:** an implementing coding agent (DeepSeek-V4-Flash / Hermes).
**Written:** 2026-09-08.
**Companion docs:** [`HANDOVER.md`](HANDOVER.md) (backend), [`UI_HANDOVER.md`](UI_HANDOVER.md)
(client, motion, mascot), [`CURRICULUM.md`](CURRICULUM.md) (content strategy),
[`DECISIONS.md`](DECISIONS.md) (the record).

This document supersedes nothing. It adds one phase to each side — **P23** on
the backend, **U15** on the client — and it exists because the audit below
found that the teaching layer is the one part of this product that was
specified as a page and built as a page.

> **Status 2026-09-08 (later): IMPLEMENTED.** P23-1…P23-6 and U15-1…U15-7
> are landed and verified: backend 557 → **589** (33 P23 tests),
> `alembic head c1d2e3f4a5b6` (up→down→up green), `tsc` 0 errors, a11y audit
> 0 issues, dev-DB smoke (units → steps → correct attempt → mastery +
> due_at) green. What remains OWNER work by design: the review queue (P8-0),
> the learnsanskrit adaptation pass (P23-4 tooling landed, curation is the
> owner's), and running the stager against the real checkout. Section
> footnotes marked **[LANDED]** record what each item became; the spec text
> is unchanged.

---

## 1. The finding

The app has a world-class engine, a real design system, and two or three
teaching surfaces that are genuinely state of the art. `Varnamala.tsx` taps a
varṇa and animates a mid-sagittal cross-section of the mouth whose tongue path
is rebuilt on the UI thread from a nine-number constriction profile.
`GuruNative.tsx` does viseme lip-sync off Devanagari across 26 layered plates.
`DerivationPlayer` scrubs a prakriyā and animates only the changed span, with a
Reduce-Motion ladder behind it.

And then `mobile/src/screens/Lesson.tsx` is 207 lines that render prose
paragraphs, one static table, two or three example rows, and a Practice button.
**Every tappable thing on it does the same one thing: it opens the Ask sheet.**
The answer to "I don't understand this" is "go ask the model."

`VisualGrid.tsx:3-5` states the constraint without flinching — *"rendered
PRESENTATIONALLY … The client never derives forms — every cell is display
text."* The live engine is one screen away in `Paradigm.tsx` and the lesson does
not call it.

### Measured

| | |
|---|---|
| Lessons | **10** — Units 1–3 of a planned 11 |
| Kinds of interaction on a lesson | **1** (open the Ask sheet) |
| Graded exercise types in the whole app | **2** (`"wordbank" \| "typed"`, `Challenge.tsx:41`) |
| Vocabulary | 60 words; **7** have example sentences |
| Challenges | 264 rows, **33 approved**, 231 pending |
| Features reachable by a learner | **24 of 37** — nine have rows and zero approvals, all four sandhi among them |
| `visual_type` usage | 8 `grid`, 1 `state_machine`, **0 `tree`** |
| Lessons with audio | **0** |

---

## 2. Four root causes

**2.1 The curriculum's atom is a grammatical tag, not a concept.**
`Lesson.feature_id` was a UNIQUE foreign key to `features.id` — one lesson per
tag, forever. There was no `units` table; `unit_id` was a bare `String(16)`.
CURRICULUM.md §6.2's eleven-unit spine existed in prose and nowhere else, and
`Path.tsx` rendered a flat rank-ordered list of tags instead. The consequence is
structural: **"sandhi is f(a,b)→c" could not be one lesson, because sandhi is
four tags.**

**2.2 Teaching and practice were separated, and only practice was graded.**
`Play.tsx:7-9` says it out loud: *"Play is exploration, not assessment. Nothing
launched from here writes mastery EXCEPT Challenges."* The two best pattern
surfaces in the product — the paradigm tensor and word-order — were excluded
from progress **by design**. A learner reads prose with no feedback, then
answers eight questions with feedback. The interactive parts teach nothing the
system tracks; the tracked part is a quiz.

**2.3 Nothing generates exercises from the engine, so content is review-bound.**
Vidyut derives ~180 forms per root and 24 cells per stem, splits any sandhi,
scans any metre. Exercises nonetheless come from a 37-row seed plus an LLM
authoring pipeline whose output needs human review — and HANDOVER records *"the
pipeline is now two weeks ahead of the reviewer."* The engine is used to
**verify** content and never to **generate** it.

> **This is the load-bearing insight of this document.** An engine-generated
> exercise needs no review queue, because the engine that poses the question is
> the engine that marks it. A sandhi split produced by
> `sandhi.split_candidates` and graded by the same call cannot be wrong in the
> way an LLM-drafted sentence can. **The interactive-teaching problem and the
> content-bottleneck problem have one solution.**

**2.4 The best ideas were written down and never built.**
`HANDOVER.md:944-951` on **Piṅgala as binary** — prosody as an exhaustive
enumeration of two states, mātrāmeru as the Fibonacci sequence, *"a learner who
has played it has been manipulating binary strings for a week without being told
so. Revealing that costs one screen."* Not built. It is precisely the
mathematics-to-teach-Sanskrit idea the product is asking for, argued for in our
own docs, and it needs no reviewer.

---

## 3. The licence answer — CURRICULUM.md open question #1 is closed

`CURRICULUM.md:314` recorded: *"Can we use learnsanskrit.org content directly
(what exact license, what format is the source in)?"* — blocking lesson-text
extraction. That block is why `seeds/lessons.py:3-6` states the ten lessons are
original prose *"so no third-party licence applies"*, and why Units 4–11 have
none.

**Checked 2026-09-08.** The learnsanskrit.org guide carries:

> "This page is available under a CC BY 4.0 International license."

The site code is separately in the public domain. The guide is 17 core lessons
plus ~77 topic sections — Sounds · Sandhi · Nominals 1–2 · Verbs 1–3 ·
Uninflected words · Suffixes · Compounds · Sentences · Devanagari — plus
appendices, stored as **SML**, a custom lightweight markup, under `content/` in
`github.com/sanskrit/learnsanskrit.org`.

**Answer: yes, with attribution.** ~100 pages of beginner→advanced pedagogy,
legally adaptable, covering exactly the missing units and both domains
CURRICULUM.md §3.2 flags as missing (samāsa, kāraka).

⚠ **The obligation is real, it already exists, and we cannot currently
discharge it.** `Settings.tsx`'s "Licences and credits" row is
`onPress={() => {}}` — a live row with a chevron that does nothing.

This is not a new problem created by learnsanskrit. We already ship
MIT-licensed `vidyut-data` (ashtadhyayi.com + Ambuda) and a CC BY-SA 3.0
sa.wikisource transcription, and `CanonText.licence` already stores a per-text
licence string for **twelve** texts that no screen renders. CC BY 4.0 does not
create the obligation; it makes the existing one impossible to keep ignoring.

The fix is **P23-4a** (a licence registry, backend) plus **U15-7** (the screen
that renders it, client). §6's P23-4a explains why the gate is a *release*
gate and not a task dependency — an earlier draft of this document made it a
task dependency and the result was a cycle.

---

## 4. Decisions locked (owner, 2026-09-08)

1. **Learner: both, adult-first.** Calm, precise, respectful. Pattern
   discovery, derivation proofs, spaced review. Playful but not cartoonish —
   streaks, mastery crowns, timed pattern drills. No mascot-driven narrative;
   the Guru stays a teacher, not a cartoon (UI_HANDOVER §3's invariant holds
   unchanged).
2. **Full rebuild of the lesson model.** Units → Lessons → typed, gradable
   Steps. Not an enrichment of the prose page.
3. **Adapt learnsanskrit.org under CC BY 4.0, with attribution.** Adapt, do not
   copy verbatim; per-row `provenance` and `attribution`.
4. **Reverse the Play rule.** Pattern work counts toward mastery. The paradigm
   tensor, sandhi and word-order become gradable step kinds. Play keeps the same
   components as an ungraded sandbox.

---

## 5. Ownership

| Phase | Owner |
|---|---|
| **U1 — the mascot (the Rive file)** | **Claude**, unchanged — do not touch |
| **P23 — backend: units, steps, generator, scheduler** | **Hermes** |
| **U15 — client: the step player and its renderers** | **Hermes** |
| Content curation + the learnsanskrit adaptation pass | **Owner**, with P23-4 tooling |

---

## 6. P23 — backend

### P23-1 · The spine as data — **LANDED 2026-09-08**

Already on disk. Verified: `alembic upgrade head` ran clean from `b7c8d9e0f1a2`
(the dev DB was three revisions behind and had **no** `lessons` table at all),
and the upgrade → downgrade → upgrade round-trip is green.

- `backend/app/models.py` — new `Unit`, new `LessonStep`; `Lesson` reshaped.
- `backend/migrations/versions/f1a2b3c4d5e6_p23_lesson_steps.py` — the P23-1
  intermediate (head is now `c1d2e3f4a5b6`, P23 registry + review).
- `backend/app/seeds/units.py` — the eleven units, idempotent, retunes copy.
- `backend/app/seeds/seed.py` — `seed_units(db)` runs **before**
  `seed_lessons(db)`; the foreign key requires it.

`lessons.feature_id` is **no longer UNIQUE** and is joined by `features` (JSON).
`lessons.unit_id` now has a real FK to `units.id`. `lessons` gained
`attribution`. The migration drops the UNIQUE via `batch_alter_table` with an
explicit `copy_from` that omits it — rows are copied, nothing is deleted;
§2.13's additive rule holds.

`Unit.layer` carries CURRICULUM.md §6.1's three-layer model and is the whole
pedagogical argument in one column: **0** the alphabet as a mathematical set,
**1** word formation as functions, **2** sentence construction as relations.

> The migration hard-codes the eleven unit rows rather than importing
> `seeds/units.py`. That duplication is deliberate: **a migration is a frozen
> snapshot and must never import application code.** `seeds/units.py` is the
> live source and retunes titles and blurbs on every boot; the migration does
> not. Add a test asserting the two id/rank lists agree (P23-6).

### P23-2 · The exercise generator — **the centre of this phase**

**New:** `backend/app/services/exercise_gen.py`, `backend/app/routers/exercises.py`

An exercise is **not a row**. It is identified by `(kind, params, seed)` and
regenerated on demand. Two functions:

```
generate(kind, params, seed) -> dict   # renderable; the answer is NOT in it
grade(kind, params, seed, answer) -> Verdict
```

`grade` regenerates the same item from the same seed and compares. **No exercise
table, no stored answer, no review queue.** The seed is the item's identity —
which is also what makes a step reproducible for spaced review (P23-5) and what
makes the whole thing testable.

Kinds, and the engine call behind each. Every one of these functions already
exists and is already tested:

| kind | generated by | graded by |
|---|---|---|
| `grid_fill` | `prakriya.paradigm(pratipadika, linga)` → 8×3, blank N derivable cells | the same paradigm |
| `derive_next` | `prakriya.derive(...)` → hide step *k*, offer sūtra options | the derivation's own step list |
| `sandhi_split` | `sandhi.split_candidates(joined)` → top both-valid candidate | the same call |
| `sandhi_join` | the `sandhi_join` branch already in `services/lessons.py:53-67` — **dead code today, no seed uses it** | same |
| `scan_metre` | `chandas.scan(text)` → syllables, weights withheld | the L/G sequence |
| `reorder` | `word_order.equivalent_orders(sentence)`; distractors from `word_order._wrong_endings` | the equivalence set |
| `contrast` | minimal pairs off the paradigm tensor (बालके vs बालकेन) | feature comparison |

**Invariants — do not negotiate these:**

- **Determinism.** `random.Random(seed)`, never the module-level `random`. Same
  seed, same item, on every process and every machine. A test must pin this.
- **Abstention.** When the engine returns nothing, the verdict is `unsure` and
  `abstained: True` — **never `incorrect`.** This is the codebase's oldest
  principle (`adaptive.py:54-57`; UI_HANDOVER §3: *"An `unsure` that reads as a
  mistake is the most damaging bug in this document"*). A learner is never
  marked wrong because our engine was uncertain.
- **Verdict vocabulary is the existing one:** `correct | off_by_one | incorrect
  | unsure`. Do not invent a fifth.
- **Local computation, no quota.** These are vidyut calls — no vendor, no
  metering. HANDOVER is explicit: never add metering to a grammar route.
- **Never generate for samāsa or kāraka yet.** The analyzer cannot derive them
  (P22-2), `tests/test_p22_lessons.py:99-100` asserts no band claims them, and a
  generator that emits an ungradable item is worse than a gap.

> **[LANDED 2026-09-08.]** `services/exercise_gen.py` + `routers/exercises.py`
> (`POST /exercises/generate|grade`, `GET /exercises/kinds`). Phone constraint:
> grid_fill blanks ship engine-drawn choice chips; sandhi_join ships
> true-vs-raw-vs-reversed options graded exact. `tests/test_p23_lesson_overhaul.py`:
> determinism (incl. cross-process), round-trip ×7, abstention, closed verdicts.

### P23-3 · Serving lessons as steps

**Files:** `routers/lessons.py`, `services/lessons.py`, `schemas.py`

Today there is exactly one lesson endpoint, `GET /lessons/{feature_id}`, and
**no list endpoint, no unit index, and no completion POST**. A client can only
fetch a lesson if it already knows a feature id.

Add:

| Method | Path | Returns |
|---|---|---|
| GET | `/units` | the eleven units, ranked, each with its lessons and per-unit progress |
| GET | `/lessons` | list, filterable by `unit_id` |
| GET | `/lessons/{id}/steps` | the ordered steps, each already `generate`d where its kind is generated |
| POST | `/lessons/{id}/steps/{rank}/attempt` | grades one step, writes mastery **and** the review schedule |

Keep `GET /lessons/{feature_id}` working — `Path.tsx` and the `has_lesson`
contract (P22-4) depend on it. Its 404 is honest and must stay honest.

> **[LANDED 2026-09-08.]** All four endpoints live in `routers/lessons.py`;
> `attempt` writes mastery (via the frozen `adaptive.update_mastery`) AND the
> review schedule in one commit. 11 lessons / 35 steps seeded
> (`seeds/lesson_steps.py`), including the U6 sandhi lesson spanning 4 tags.

### P23-4a · The licence registry — **gated on nothing, do it first**

**New:** a `content_sources` table + migration, `backend/app/seeds/licences.py`,
`GET /licences`.

One row per source we take anything from:

| column | holds |
|---|---|
| `key` | the stable id content rows reference — `learnsanskrit`, `vidyut-data`, `sa-wikisource`, `original` |
| `name` | display name |
| `url` | where it came from |
| `licence` | named exactly — `CC BY 4.0`, `MIT`, `CC BY-SA 3.0`, `public domain` |
| `credit` | the credit line, rendered **verbatim**; a paraphrased credit is not a credit |
| `taken` | one line on what we actually used |

Seed it with what we ship **today**, before any import: `vidyut-data` (MIT),
`sa-wikisource` (CC BY-SA 3.0, the Īśā transcription), the public-domain śloka
sources, and `original` for our own prose. `CanonText.licence` already carries
twelve per-text strings — fold them in or point them at registry keys. **Do not
keep two registries.**

Content rows stop carrying free text. `Lesson.attribution` (and
`VocabWord.provenance`, `ReaderPassage.provenance`) hold a **registry key**, so
"is everything attributed?" becomes a join rather than a reading exercise.

#### Why this is a separate item — the dependency was circular

An earlier draft said *"U15-7 must ship before any CC BY content lands"* and
marked U15-7 as blocking P23-4. **That could not be built.** The licences
screen renders which sources, licences and credit lines we use — which is
exactly what P23-4 was going to write. U15-7 blocked P23-4, and U15-7 needed
P23-4's output. It was also a cross-lane block: a client screen halting a
backend importer, serialising the phase for no reason.

Split three ways, the cycle disappears:

- **P23-4a** (registry) — gated on nothing. It is *authored*, not imported.
- **U15-7** (screen) — gated on P23-4a's endpoint. It renders; it decides nothing.
- **P23-4** (import) — gated on P23-4a, because it must write a registry key.
  **Not** gated on U15-7: running an importer distributes nothing.

**The real gate is a release gate, and unlike a task edge it is enforceable:**

1. A test asserts every distinct attribution key in every content table
   resolves in the registry. Unattributed content becomes a red test, not
   something someone has to remember.
2. No build ships content whose registry entry requires attribution unless that
   build contains the licences screen. One release-checklist line.

**Importing is not publishing.** The obligation attaches when a learner sees
the content, so that is where the gate belongs.

> **[LANDED 2026-09-08.]** Registry = `content_sources` + migration
> `c1d2e3f4a5b6` + `seeds/licences.py` (5 rows) + `GET /licences`; every
> pre-registry free-text provenance backfilled to keys (lessons, vocab,
> reader, canon `source_key`); the attribution-resolves test is red-on-gap.

### P23-4 · The learnsanskrit.org adaptation pass

**New:** `backend/scripts/import_learnsanskrit.py`
**Gated on:** P23-4a (it must write a registry key). **Not gated on U15-7.**

Model it on `scripts/import_text.py`, which is already the right shape: dry-run
by default, **refuses to run without a per-text licence in the payload**
(`:91`), idempotent by source key, forbids TTS on import. Reuse that discipline
exactly.

- Parse SML from `content/`; map the ~94 sections onto the eleven units.
- **Adapt, do not copy.** Every row carries a P23-4a registry **key**, not a
  free-text credit — the registry owns the wording, the row owns the pointer.
- The engine-verification rule survives unchanged
  (`services/lessons.py::verify_example`): a lesson may not claim a form Vidyut
  cannot reproduce. The measured drops that justified it — वद् → वन्दते, गम्
  unresolvable, feminine ā-stems — stay dropped.
- Output lands in `results/imports/`. **That directory does not exist in this
  working tree**, although `seeds/canon.py:65` claims an Īśopaniṣad import
  happened there — reconcile that before adding a second importer.

> **[TOOLING LANDED 2026-09-08; curation is owner's.]**
> `scripts/import_learnsanskrit.py` (SML-tolerant staging, unit map, CC BY 4.0
> gate, idempotent by `learnsanskrit:<section>`, no TTS, staged JSON for the
> adaptation pass). Tested with a fake tree (refusal + idempotent live run).
> Not yet run against the real checkout — that run IS the adaptation pass.

### P23-5 · A real scheduler

**Files:** `backend/app/adaptive.py` (currently marked **[FROZEN]**), new
`ReviewItem` table + migration.

`adaptive.py` is "SM-2-inspired" in name only: one `0..1` score per feature in a
JSON blob, fixed `+0.15 / −0.10` deltas, selection = "nearest 0.6". **No due
dates, no intervals, no time decay, no item-level memory.** A learner returning
after a month sees exactly the state they left.

`research/tech-research.md:326-409` already researched and recommended **FSRS**
(MIT, `pip install fsrs`, ships an optimizer, *"each feature = one card"*). It
was never picked up. Pick it up.

`ReviewItem`: learner × item × `due_at` × stability × difficulty × lapses. **An
item is a step instance or a vocab word, not just a feature tag** — that is the
whole point.

⚠ **Fix this first, it is a live bug.** `routers/writing.py:131` writes
`{"attempts": n, "correct": n, "ef": 2.5}` into `learner.feature_mastery` under
the key `write:<iast>`. That makes `feature_mastery` a **heterogeneous dict** —
floats for grammar features, dicts for writing keys. Both
`adaptive.update_mastery` and `grammar.get_path_spine` (`grammar.py:125`,
`float(mastery_map.get(...))`) would mishandle a `write:` key if they ever
received one. The `ef` field is written and **never read anywhere**. Move
writing progress out of `feature_mastery` as part of this work.

> **[LANDED 2026-09-08.]** `review_items` + `services/review.py` (FSRS
> contract, no new dependency — `adaptive.py` untouched; `GET /review/due`
> feeds Home's honest count) + `learners.writing_mastery` with lazy migration
> of legacy `write:` keys. Scheduler test pins growth-on-recall and
> lapse-shortens-interval.

### P23-6 · Tests

- Step CRUD and ordering; the `uq_step_lesson_rank` constraint holds.
- **Generator determinism**: same seed → byte-identical item, twice, in two
  processes.
- **Round-trip**: every generated exercise, for every kind, grades `correct`
  against its own generated answer. This is the test that replaces a reviewer.
- **Abstention**: an engine miss yields `unsure`, never `incorrect`.
- Engine provenance holds for every seeded example.
- **Attribution resolves**: every distinct attribution key in `lessons`,
  `vocab_words` and `reader_passages` matches a `content_sources` row. This is
  the test that replaces remembering.
- FSRS advances `due_at` correctly; a lapse shortens the interval.
- The migration's eleven units and `seeds/units.py` agree on ids and ranks.
- No band and no generator claims a samāsa or kāraka feature.

> **[LANDED 2026-09-08 — all nine hold.]** `tests/test_p23_lesson_overhaul.py`
> (33 tests) + the P23 seed content (11 lessons, 35 steps, 5 registry rows).

---

## 7. U15 — client

### U15-1 · `Lesson.tsx` becomes a step player

Rewrite. It stops being a `ScrollView` of prose and becomes a sequence: one step
at a time, a progress indicator, a check, a verdict, next. `Challenge.tsx`
already has the loop shape — the `ProgressBar` + "3/8", the `VerdictSheet`
slide-up, `haptics.correct/near/incorrect`, `announceForAccessibility` on every
verdict. **Reuse that vocabulary; do not invent a second one.**

The `body` field survives as the lesson's summary. It is no longer the teaching.

> **[LANDED 2026-09-08.]** `Lesson.tsx` rewritten as specified (Challenge's
> loop vocabulary; collapsible summary; network failure keeps the step).

### U15-2 · One renderer per step kind

`mobile/src/components/steps/`. Each reuses a component that already exists —
this phase is mostly wiring, not new drawing:

| kind | reuses |
|---|---|
| `explain` | prose block, **≤120 words** (today's bodies are ~600) |
| `grid_fill` | `Paradigm.tsx` + `VisualGrid.tsx`, **made writable** |
| `derive_next` | `DerivationPlayer` + `SutraCard` |
| `sandhi_split` / `sandhi_join` | `SandhiVisual` |
| `build` | `WordBank` (already has drag via `Gesture.Pan()`) |
| `articulate` | `VocalTract` + mic → `varna_distance` |
| `scan_metre` | `ScansionStrip` — **165 lines, currently imported by nothing** |
| `reorder` | `WordOrder.tsx` — **needs the drag it self-declares as missing** |
| `contrast` | new, small: two forms, pick the role |
| `read` | `Reader.tsx` tap-to-parse |

`WordOrder.tsx` today: *"Drag-to-reorder not on this build; tap a word to cycle
its position"*, and a wrong permutation produces **no visible feedback at all**.
Fix both as part of this.

> **[LANDED 2026-09-08.]** `components/steps/` (10 renderers + switch:
> `Explain`/`GridFill`/`DeriveNext`/`Sandhi` (split+join)/`ScanMetre`/`Reorder`/
> `Contrast` graded + `Build` (WordBank)/`Articulate` (VocalTract)/`Read`
> (passage) as ungraded practice) as specified; WordOrder uses tap-to-place
> with a violet visible-feedback note. Practice kinds attempt as no-ops
> backend-side (`PRACTICE_KINDS`: correct, graded False — `test_lesson_
> practice_kinds.py`); `tsc` 0, a11y 0 issues.

### U15-3 · Path becomes units

`Path.tsx` renders eleven units from `GET /units`, each expanding to its
lessons. Locked nodes stop being tappable — they are currently `opacity: 0.5`
and still pressable.

> **[LANDED 2026-09-08.]** As specified; locked = `disabled` + announced.

### U15-4 · Reverse the Play rule

Play keeps every card as an ungraded sandbox door, but the same components now
appear as graded steps inside lessons. Update the header copy — it currently
promises the opposite. Fix the stale `built: false` on the Daily-word card
(`DailyWord.tsx` exists and is reachable from Home).

> **[LANDED 2026-09-08.]** As specified, plus Sandhi + Pingala cards.

### U15-5 · Home routes into the lesson

Home's primary CTA goes straight to `Challenge`, skipping lessons entirely. Give
it "continue Unit N" and, once P23-5 lands, an honest "42 due today".

> **[LANDED 2026-09-08.]** As specified (`GET /review/due` count shown).

### U15-6 · The mathematics layer

Each maps to an engine call, so all of it is gradable. This is the part the
product is actually asking for:

- **The 5×5 grid as a coordinate system.** Every sound is (place, effort);
  sandhi rules become *moves on the grid*. `VocalTract` already draws both axes.
- **Declension as a tensor** the learner fills, ending patterns colour-linked
  across stem types — `Paradigm.tsx` already tints rows by shared ending.
- **Conjugation as five turnable dials.** `VisualStateMachine.tsx` exists and
  renders a static radio list; make the dials turn and re-derive live.
- **Sandhi as f(a,b)→c** — a function machine run forwards and backwards.
- **Compounds as tree-building** — `VisualTree.tsx` exists and is used by
  **zero** lessons.
- **Piṅgala as binary** — light/heavy enumeration, mātrāmeru → Fibonacci. One
  screen (§2.4). No reviewer needed.

> **[LANDED 2026-09-08.]** `Pingala.tsx` (2^n patterns + meru) + coordinate
> caption on Varṇamālā + five dials on derive steps + sandhi join-tree.
> Compounds-as-trees still waits on the analyzer (no samāsa exercises).
> Caveat (audited 2026-09-08): Pingala's "try it on a real verse" is static
> navigation to `Lesson {featureId:SG}` — no live scan call behind it.

### U15-7 · Licences and credits — gated on P23-4a only

`Settings.tsx`'s row is `onPress={() => {}}`. Build the screen; it renders
`GET /licences` (P23-4a) and nothing else. Per source: the name, what we took,
the licence named exactly, and the credit line **verbatim**.

It does **not** block P23-4 — see §6's P23-4a. What it gates is the *release*
of attributed content, not the import that produces it. Ship it early anyway:
it is small, it is owed for content we already ship today, and it is the
cheapest item in this phase.

> **[LANDED 2026-09-08.]** `Licences.tsx` + wired Settings row (via the drawer
> parent) + `services/prefs` making the haptics/reduce-motion toggles real.

---

## 8. Invariants this phase must not break

Everything in `UI_HANDOVER.md` §3 still holds. Specifically:

- Light theme only. `script()` on every Devanagari node. 18pt floor for Sanskrit
  body text.
- **`unsure` is never red and never reads as a failure.**
- Every animation survives Reduce Motion — `DerivationPlayer` shows how.
- `node mobile/scripts/a11y-audit.js` stays at **0 issues**. Every new step
  renderer needs role + label + an `announceForAccessibility` on its verdict.
- **No hearts, no energy, no lives.** A schema guard test asserts these can
  never appear unnoticed.

---

## 9. What NOT to build

1. **Do not ship "Vedic Mathematics."** `HANDOVER.md:953` — the sixteen-sūtra
   system is Bharati Krishna Tirtha's, published 1965, and its claimed Vedic
   provenance is not substantiated. An unsupported provenance claim in the maths
   layer discredits the derivation drawer three screens away.
2. **P10 numerals stay stopped.** 8 of 30 misparse confidently — the dangerous
   mode §2.2 cannot catch.
3. **No leaderboards without an owner decision.** UI_HANDOVER:964-972 — a
   competitive ranking sits awkwardly with a guru-śiṣya framing, and the audience
   includes elderly scholars. Product identity, not UI.
4. **No samāsa/kāraka exercises** until the analyzer can derive them.
5. **No RAG.** Still explicitly owner-gated.
6. **Do not put curriculum in the APK** (CURRICULUM.md §9) — the varṇamālā audio
   bank remains the only exception.

---

## 10. Verification

```
cd backend && alembic current        # expect c1d2e3f4a5b6
cd backend && python -c "from app.seeds.seed import run_seed; run_seed()"
cd backend && pytest                 # 589 today — none may regress
cd mobile && npx tsc --noEmit        # 0 errors today
node mobile/scripts/a11y-audit.js    # 0 issues today (manual; not in package.json)
```

Run the seed **before** you judge content volume: migrating created the tables
empty, and `pytest` will not tell you, because the suite builds its own
throwaway DB via `init_db()` (Alembic upgrade to head + drift check) and never
touches `app.db`.

Then run the app (`start_mob.ps1`) and walk: Path → Unit → Lesson → each step
kind → verdict → Practice. Confirm per-step grading writes mastery *and*
`due_at`. **A green suite does not mean a working app** — HANDOVER has said so
since the beginning, and the dev DB sitting three migrations behind with no
`lessons` table is what that warning looks like in practice.

---

## 11. Known state, so you do not rediscover it

- [FIXED 2026-09-08] **`Challenge.tsx:123`** — the rotation-index bug is fixed
  (`completed % len`). **`Settings.tsx`'s dead toggles** now drive
  `services/prefs` (haptics gates the service; the reduce-motion override ORs
  into `useReducedMotion`; `loadPrefs` runs at boot).
- [SUPERSEDED 2026-09-08] The dev-DB paragraph below described the state P23-1
  found. The DB is now at head `c1d2e3f4a5b6` with `units` 11, `lessons` 11,
  `lesson_steps` 35, `content_sources` 5. The warning stands: boot the app or
  run the seed before concluding anything is missing.

- **`backend/app.db` was three migrations behind head** (`b7c8d9e0f1a2`) with no
  `lessons`, `vocab_words`, `reader_passages` or `canon_texts` table. The entire
  P22 curriculum had never been materialised. P23-1 ran `alembic upgrade head`,
  so the **schema** is now current — but the tables are **empty**, because
  `run_seed()` has not run since. As of 2026-09-08: `units` 11 (inserted by the
  migration itself), `lessons` 0, `vocab_words` 0, `reader_passages` 0,
  `canon_texts` 0, and `features` 37 against a seed file of 47 — the ten
  samāsa/kāraka rows have never landed locally. **Boot the app or run the seed
  before you conclude anything is missing.**
- `services/feature_derivation.py` is real Vidyut code reachable only from a
  script and a test — **wired to no router**.
- `reader_passages` is not authored content: 36 rows recycled from the challenge
  and śloka tables (`TIER_PASSAGES_PER_TIER = 12`), against a stated target of
  150.
- Dead client code, ~765 lines: `SessionShell.tsx` (220), `ScansionStrip.tsx`
  (165), `guru/Guru.tsx` + `GuruScene.tsx` (380, dormant Rive — the `.riv`
  export is behind a paid plan). U15-2 revives `ScansionStrip`.
- **Skia, Lottie and expo-blur ship in the bundle with zero imports.**
- `Challenge.tsx:123` — `(completed % len + filterFeatures.length) % len` adds a
  feature count to a rotation index. Almost certainly a bug.
- `Settings.tsx` writes `shabd.pref.haptics` and `shabd.pref.reducedMotion`;
  **nothing reads either key.** Two toggles that do nothing.
- `SessionComplete.tsx:111` computes `xpDisplay` and never uses it, reading a
  Reanimated shared value during render. The documented XP roll-up never
  happens. `SessionComplete` is in `RootStackParamList` but never registered as
  a `Stack.Screen`.
- [FIXED 2026-09-08] **FlatList where volume lives** — Path units, Vocab
  words and the Reader index are `FlatList` now (headers stay put via
  `ListHeaderComponent`). Nested lesson rows and the reading page are
  untouched — small counts, no virtualization needed.
- [FIXED 2026-09-08] **First data layer** — `services/apiCache.ts` (60s GET
  cache + in-flight dedupe) + `hooks/useQuery.ts` (lifecycle: no setState
  after unmount, opt-in refetch-on-focus, retry). Path/Vocab/Reader
  migrated; Home/Lesson/Challenge keep bare fetch — migrate per screen.
  True request cancellation is still open (`api/client.ts` takes no signal).
- `useTypeScale().sized()` is applied in **2 of 19 screens**, so the S/M/L/XL
  setting silently does nothing almost everywhere. (Path/Vocab/Reader +
  ReadStep since: pattern is `{ fontSize: sized(px[, { sanskrit: true }]) }` —
  fan out per screen inside the U5 device pass.)
- Handwriting recognition is a permanent stub — both ML Kit adapters return
  `UNAVAILABLE` because the modules are not in `package.json`.
