# Learn v2: shared handover for Muse Spark and Codex

Prepared 12 October 2026, Asia/Calcutta. Workspace: `C:/Users/AnshulKumar/PycharmProjects/sanskrit`.

## Latest image handover — 13 October 2026

All current concrete scene generation queues are complete: **203 saved teaching deliveries** (141 Grammar/foundations, 35 Sandhi, 24 Verse & Rhythm, three original reading images). See [CODEX-RESULT.md](CODEX-RESULT.md) and [image-delivery-index.json](image-delivery-index.json). The final 59 images skipped visual review at the owner's explicit request; older instructions requiring inspection are superseded for this batch. App integration and checked native captions remain pending; precise formulas/metre diagrams remain native/vector work. Earlier three-ready-image counts below are historical.

## Owner's later scope amendment — 12 October 2026

The subsequent “lets implement it then” instruction authorizes combining Path and Grammar under Learn. The unified entry and five-tab navigation are now implemented locally; see [UNIFIED-LEARN-RESULT.md](UNIFIED-LEARN-RESULT.md). Earlier instructions below to retain separate visible tabs describe the original comparison build and are superseded. Keep existing assessment/reference routes, source content and progress accessible during the full content/image expansion.

The owner has explicitly started image generation for the whole learning curriculum, including Path/Grammar foundations and advanced topics as well as Sandhi and Verse & Rhythm. The initial generation hold and slice-only reading below are superseded. Pens and pencils are allowed. Codex inspects results and regenerates failures without asking the owner to perform manual QA. Read [WHOLE-COURSE-AUDIT.md](WHOLE-COURSE-AUDIT.md) and [whole-course-inventory.json](whole-course-inventory.json) for the full scope, estimates, current progress and proposed unified Learn destination. The current three ready requests are only the first batch. The original comparison build remains the historical rationale for separate tabs; the owner is now evaluating consolidation. Do not interpret the seven-lesson Learn catalogue as a complete replacement for existing content or assessed practice.

## Owner's instructions and objective

1. Muse starts a separate implementation task and builds a new learning destination. Call the new tab **Learn** (`LearnV2` internally). Keep Path and Grammar visible, working and substantially unchanged. The owner will compare tomorrow and decide what to delete later.
2. Use trustworthy, reusable source content and record its provenance. Existing verified material comes first; openly licensed external material fills gaps.
3. Codex generates lesson illustrations under the owner's explicit start instruction, already supplied and expanded to the whole curriculum on 12 October. The original pre-start generation hold is lifted.
4. The 6–7-hour overnight window is a scope budget, not guaranteed runtime or a demand to keep making changes after completion.

Deliver a working Learn tab with a coherent course map, connected teaching cards, purposeful illustrations and practice. The owner can compare Path, Grammar and Learn in the same app. Old progress remains intact; Learn has separate resume state. Sanskrit is checked and content is sourced.

First finish a representative slice: introductory verb number plus selected Sandhi lessons. Then adapt the existing full Sandhi pilot and expand beginner foundations as time allows. Historical handovers give context, not permission to remove old destinations, change versions or deploy. Preparing these files has not dispatched Muse or started image generation.

## Responsibilities and file ownership

| Owner | Responsibility | Owned files |
| --- | --- | --- |
| Muse Spark | Implementation, lesson editing, sources, checks, illustration requests and asset integration | Learn code/content; `coverage.md`; `requests.jsonl`; `sources.jsonl`; `integration-status.jsonl`; `MUSE-RESULT.md` |
| Codex | Image generation after owner start, inspection and delivery | `deliveries.jsonl`; `CODEX-RESULT.md`; new files in `mobile/assets/learn-v2/` |
| Owner | Start generation, compare destinations and choose later removals | Human instructions |

Do not edit another worker's owned file during active work. Coordination is through shared files read while each worker is active; it does not provide automatic wakeups, cross-agent calls or automatic Metro rebuilds. If Muse uses another machine, the owner must transfer the manifests/assets.

## Inspect before implementation

- Applicable AGENTS.md instructions. `mobile/AGENTS.md` requires exact versioned Expo documentation before coding.
- `HANDOVER.md`, `LESSON_OVERHAUL.md`, `CURRICULUM.md`, `DECISIONS.md`; verify historical findings against current code.
- `mobile/src/navigation/MainTabs.tsx`, `types.ts`, `mobile/App.tsx`; current themes, font scaling, accessibility and Reduce Motion helpers.
- Path, Lesson, Grammar, GrammarChapter and GrammarTopic screens; their step player, assessment, progress and caching systems.
- `backend/app/services/grammar_guide/` and its model/builder/verifier; `backend/app/seeds/lessons.py`, `lesson_steps.py`, `units.py`, `licences.py`; licences endpoint and screen.
- Tests including `test_grammar_guide.py`, `test_p23_lesson_overhaul.py`, `test_lesson_practice_kinds.py` and any others affected by changes.

## Accepted prototypes and teaching direction

Prototype folder:
`C:/Users/AnshulKumar/.codex/visualizations/2026/10/10/01a12792-a234-7a80-b6bf-fe778750afd9/`

Read `sanskrit-teaching-cards-rulebook.md` fully for context. Owner's 12 October revision supersedes its expandable-note recommendation: do not add “A closer look” or any expandable detail control. Keep the Quiet deck as the base and use anchored visuals where multi-step analysis benefits. Essential qualifications stay on the main teaching path.

- `sandhi-card-chapter.html`, `sandhi-chapter-content.md`, `sandhi-chapter-data.json`: authored pilot with 13 lessons and 108 cards. Audit and adapt it; it is not automatically production-ready. Inspect `sandhi-verification.json` and reproduce relevant checks.
- `sandhi-illustrated-formulas.html`: explicit formulas with purposeful visuals.
- `verbs-reading-cards.html`: eight-card scoped lesson on reading, root/stem and singular/dual/plural.
- `verse-rhythm-course-content.md` and previews: secondary expansion after the slice works. Re-author long sections into meaningful steps instead of mechanically splitting paragraphs.
- Existing JPGs are art candidates. Copy chosen production assets into the repo. Shipped code must not depend on a user's absolute preview path.

## Data sources and verification

Use these sources in order:

1. Existing engine-checked bilingual grammar guide, lessons and prototype manuscripts. Preserve provenance and recheck changed forms/rules/translations.
2. Project Vidyut tooling for paradigms, derivation and transliteration where supported. An engine check proves a specific morphological claim; it does not prove a whole sentence's meaning, idiomatic use, pedagogy or every Sandhi rule.
3. learnsanskrit.org for missing explanations/examples. Adapt into original short sequences and natural Hindi explanations. Do not scrape whole pages into giant cards.
4. Other primary material only when needed, after verifying exact edition/file rights. Public accessibility is not a reuse licence; an ancient text and a modern transcription/translation can have different terms.

Starting references checked 12 October 2026:

- [Vowel Sandhi, learnsanskrit.org](https://learnsanskrit.org/guide/sandhi/vowel-sandhi/): footer identifies CC BY 4.0. Verify each actual page used, credit the author/source as provided, link the licence and identify adaptation/translation.
- [learnsanskrit guide](https://learnsanskrit.org/guide/): curriculum source; check the individual pages used.
- [Vidyut repository](https://github.com/ambuda-org/vidyut): MIT engine repository. Check individual datasets' terms rather than applying the code licence to every data source.

Muse records lesson/card-level provenance in `sources.jsonl`. The adjacent example file demonstrates the format. Distinguish existing_project, adapted_external, engine_generated and original_explanation. Record source URL/file, section, author if established, licence and its evidence, access date, adaptation notes and actual verification results. Unknown rights or unsupported grammatical claims remain drafts. Don't invent metadata or label an entire lesson verified because one table passed.

Use the existing licence registry/credits UI where appropriate, plus an accessible Sources/Credits action in Learn. Preserve credit when moving content. URLs identify relevant actual pages.

Every introduced technical term needs a plain explanation. New Sanskrit comes from a checked source/engine, not model memory. Derive IAST with existing tooling and inspect it. Check spelling, segmentation, number, person, meaning and rule conditions; record unresolved issues. New English/Hindi explanations also need an accuracy review.

## Additive architecture and progress

- Create separate LearnV2 map and lesson-player routes. Do not replace Lesson, Path, GrammarChapter or GrammarTopic.
- Keep all six existing tabs and add Learn. Review the seven-tab bar at 320/360dp and larger fonts with accessible names and adequate targets. Do not solve crowding by hiding/relocating Path or Grammar.
- Put new teaching components/content in a Learn namespace. Reuse stable pure helpers, theme tokens, audio, API clients and transliteration. Avoid shared behavior changes that alter old screens.
- New reading/resume state uses versioned `shabd.learnv2.*` keys. Do not clear, migrate or repurpose old progress. Reading completion differs from assessed mastery.
- Reuse assessment endpoints only when the lesson maps truthfully to existing features. Avoid duplicate submissions/XP; swipe never advances mastery. If a grading contract is insufficient, implement scoped practice and document tracking limits.
- Prefer validated static content where supported. Add backend fields/endpoints only if necessary; preserve compatibility and do not mutate production data.
- Missing art must not cause invalid imports, broken URIs or blank lessons. Keep meaningful text/examples available while illustrations are pending.

## Teaching and visuals

Usually 6–10 short cards per lesson, adjusted to the outcome. One point per card; examples and their immediate reasons stay together. Observe a concrete example, notice a pattern, explain it, vary it, address misconceptions and retrieve/apply it. Avoid repeated filler, dense tables and disconnected videos. Do not add an “A closer look” control, expandable note, or similar optional-disclosure feature. Put necessary explanations directly into the lesson's cards.

Devanagari is the dominant visual in each script-bearing illustration: show it large and clear, with optional Roman IAST directly beneath at about half its height. The script should be visible in the artwork area, not relegated to a caption after the image. Prefer Muse to composite verified native text over a reserved image region so spelling remains selectable and accurate; Codex supplies the scene and art direction. If lettering is baked into an image, inspect every glyph and provide accessible text equivalents. Avoid repeating the same label a second time below the artwork unless that repetition has a specific teaching purpose.

Verb pictures must distinguish exactly one, exactly two and a clear plural group. Reading must look like reading. Teach person separately from number. Sandhi formulas must be explicit, with checked examples and relevant conditions. Do not imply every adjacent vowel pair always merges.

Use each medium for a purpose. Rich backgrounds, photography, illustration and diagrams are allowed; not everything is a white cutout or watercolour. Images should explain an action/count/contrast/mechanism. Some formulas and interactive highlights are better native/SVG than AI bitmaps.

## File-based image coordination

Read [CODEX-IMAGES.md](CODEX-IMAGES.md). Muse writes complete, verified request records to `requests.jsonl` early. Codex reads it after owner authorization and delivers inspected files plus `deliveries.jsonl` entries. Each JSONL line is a complete object. The `.example.jsonl` files are templates, never live queues.

Use stable asset IDs and revision numbers. Amend requests by appending a higher revision; don't rename IDs underneath integration. Deliveries reference the exact request revision. Codex writes the file first, then its ready record. Muse builds a static asset map from existing ready files; no guessed runtime require paths. Pending art has a useful fallback.

One writer per log. Muse records acceptance/rejection and integration in its own `integration-status.jsonl`, leaving Codex's delivery log intact. Workers read the other log between active work stages; filesystem updates do not themselves trigger turns. A delivery marked ready is inspected art, not proof that an app has integrated it.

Record conventions:

- Requests: `status` is draft, ready or cancelled; `verification.status` must be passed for generation. A higher revision supersedes lower revisions for the same asset_id, including cancellation. Priority 1 is the working slice, 2 the next released lessons, 3 later drafts. Resolve `reference_paths` relative to the workspace unless explicitly absolute local references.
- Deliveries: `status` is ready or rejected, with immutable asset_version and the exact request_revision. Record actual measured dimensions and SHA-256, not the example values. Integration uses a ready version for the requested revision after Muse inspects it.
- Integration records: asset_id, request_revision, asset_version, accepted/rejected/integrated state, reason, affected card IDs and date. Rejected art stays out of the static import registry.
- Content records: draft or verified, with evidence per claim/card. A live catalogue includes only validated content and truthful metadata. `.example.jsonl` has example_only status and is excluded from every consumer.
- Reading a complete JSONL file and selecting current revisions must tolerate an incomplete final line during a concurrent append: retry later and do not consume that line. Writers flush completed records; never treat a partially written request as ready.

## Boundaries

Capture starting Git status and preserve extensive uncommitted work. No reset/clean/stash, unrelated deletion, commits, version changes, backend deployment, EAS builds, OTA publishing or production-data edits. No paid API generation by Muse. Codex generation remains held until the owner's explicit start instruction; planning is not generation authorization.

Keep keys private. New dependencies only when necessary. Verify Expo SDK 57 APIs. No fabricated device checks, source verification or test outcomes. New audio generation is outside scope; reuse available audio and hide unavailable controls.

## Morning acceptance

- Path and Grammar remain functional with previous routes/content/progress. Learn opens independently.
- Verb and Sandhi slice works from map to teaching/practice to exit/resume. Full-pilot imported/draft status is clear.
- New lessons have provenance, accessible credit and accurate scripts; unresolved claims remain drafts.
- Back/Next, swipe, vertical scroll, screen readers, Hindi/English, larger text, supported themes and reduced motion behave correctly. There is no closer-look/disclosure control.
- Pending/delivered images render safely; included art demonstrates the intended teaching fact with correct labels/crop.
- Appropriate type, contrast and backend checks pass, or actual baseline/task failures are identified precisely.
- Muse writes MUSE-RESULT.md with scope, files, checks, screenshots, preview steps and pending work. Codex writes CODEX-RESULT.md only after actually generating images.

No old tab is deleted during hand-back. The owner chooses later consolidation.
