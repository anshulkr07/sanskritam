# Whole-course scope, estimate and progress

Audited 12 October 2026 against local source, manifests and image files. This is a planning estimate and implementation audit, not a claim of deployment, full Sanskrit re-verification or completed image generation. The owner's later instructions authorize images for the whole curriculum and allow pens/pencils; they supersede the initial generation hold and the writing-tool exclusion in request revision 1.

Later implementation on 12 October: the owner authorized consolidation. The five-tab navigation and unified Learn catalogue are implemented locally; see [UNIFIED-LEARN-RESULT.md](UNIFIED-LEARN-RESULT.md). The lesson/image estimates below remain estimates for the new teaching format. All existing assessed lessons and reference topics remain accessible.

## Exact existing inventory

| Source | Sections | Lessons/topics | Present state |
| --- | ---: | ---: | --- |
| Path seed | 11 units | 49 lessons | Existing lessons and assessed practice; 60 navigation paintings (11 banners + 49 lesson covers) |
| Grammar guide | 18 chapters | 105 topics | Existing bilingual reference, examples, quizzes and tools; 18 chapter paintings |
| Sandhi manuscript | 1 chapter | 13 lessons / 108 manuscript cards | Six lessons adapted into Learn; seven remain drafts |
| Verse & Rhythm manuscript | 12 modules within one course | 48 lessons | Manuscript exists; none adapted into the live Learn catalogue |
| Learn V2 | 2 current units | 7 lessons / 62 cards | Verb number + six Sandhi lessons; local reading/retrieval, no assessed mastery writes |

Path was counted directly from `SEED_LESSONS`; Grammar directly from `CHAPTER_MODULES` and `TOPICS`; Learn from its local catalogue. The 60 Path assets and 34 hub assets named by their manifests exist. Only 18 of those hub assets are Grammar chapter paintings. Counts are local repository evidence, not a fresh production database audit.

The machine-readable [inventory](whole-course-inventory.json) includes all 105 topic IDs, all 49 Path feature IDs with candidate topic matches, all 13 Sandhi lesson IDs and all 48 Verse lesson titles. Every Path feature has at least one non-reference Grammar topic tag match. This proves candidate coverage only: a tag match does not establish equivalent explanations, practice, scoring or difficulty.

## Proposed single curriculum and estimate

Use **18 top-level sections: 17 teaching chapters plus Quick Reference**. Verse retains its 12 internal modules. The other 11 Path units are an older ordering of overlapping concepts, not 11 additional chapters to append.

Baseline calculation: 105 guide topics − 5 reference sheets − 9 old Sandhi topics − 3 old Verse topics + 13 expanded Sandhi lessons + 48 expanded Verse lessons = **149 guided lesson units**, before splitting dense topics. The current verb-number lesson belongs within Verbs and is not added again. Six individual kāraka roles and separate person/number lessons explain much of the additional lesson count below.

| Chapter | Existing guide topics | Planned guided lessons | Scene illustrations | Native/vector diagrams |
| --- | ---: | ---: | ---: | ---: |
| Start here | 2 | 2–3 | 3–4 | 2–3 |
| Sounds & script | 5 | 5–7 | 3–5 | 10–15 |
| Nouns | 4 | 4–6 | 12–16 | 5–8 |
| Cases & kāraka | 10 | 15–18 | 28–36 | 10–14 |
| Noun families | 9 | 9–12 | 8–12 | 12–18 |
| Pronouns & numbers | 8 | 8–10 | 18–24 | 8–12 |
| Verbs | 5 | 7–10 | 15–21 | 10–15 |
| Tenses & moods | 8 | 8–11 | 18–24 | 8–12 |
| Small words | 5 | 5–6 | 10–14 | 3–5 |
| Sentences | 5 | 5–7 | 12–18 | 8–12 |
| Sandhi | 9 | 13 | 3–5 | 24–36 |
| Compounds | 8 | 8–10 | 14–20 | 10–14 |
| Verb-made words | 6 | 6–8 | 12–18 | 6–10 |
| Prefixes & voice | 4 | 4–6 | 10–14 | 6–8 |
| Word-making suffixes | 6 | 6–8 | 10–16 | 7–10 |
| Verse & Rhythm | 3 | 48 | 8–12 | 60–90 |
| Pāṇini's system | 3 | 3–4 | 2–3 | 6–9 |
| Quick reference | 5 | 5 reference sheets, excluded from lessons | 0 | 5–8 |
| **Total** | **105** | **156–187 lessons + 5 reference sheets** | **186–262** | **200–299** |

Working budget: **about 160–190 lessons and 200–300 scene illustrations**, allowing roughly 10% scope margin above the scene estimate. The chapter allocation is editorial judgment based on teaching outcomes, not a completed card-by-card prompt queue. It assumes a reusable scene can serve several cards, while contrasts such as one/two/many need distinct scenes. Cases, pronouns, actions and tense contrasts account for most scene art; Sandhi and metre account for most diagrams. Navigation paintings, image retries, alternative resolutions and English/Hindi placements are excluded from the teaching-asset estimate. Reuse of existing paintings can reduce generation but has not been credited until teaching suitability is checked.

At approximately 6–10 cards per guided lesson, allow **roughly 950–1,900 teaching/retrieval cards**. The previous 160–200-card statement did not describe the whole curriculum and should not be used as its budget. Some topics need more than ten steps; reference sheets are not turned into artificial lesson cards merely to reach a count.

The 200–300 native/vector diagrams are additional teaching visuals: exact script, endings, rule branches, word order, syllable grouping and scans. They should be implemented with selectable text/native or SVG drawing. They are not another 200–300 AI illustration calls. No estimate here implies one generated image per card.

## Actual progress

- **7 / 156–187 proposed lessons** are in Learn's current card format (roughly 4% by lesson count, not a measure of overall product completion). Existing Path and Grammar content remains reusable source material.
- **6 / 13 Sandhi lessons** adapted; **0 / 48 Verse lessons** adapted.
- **3 PNG scenes generated and delivered**, with matching measured dimensions and SHA-256 hashes. They show one, two and five readers. They are not referenced by the current app asset map.
- **3 older prototype JPG scenes integrated**, showing one, two and three readers. They are separate artworks, not compressed derivatives of the delivered PNGs. Their original baked IAST is imperfect; the rectified renderer clips that caption out and displays verified native labels once.
- **3 ready image requests and 2 draft requests** exist. This is an initial slice queue, not a whole-course queue. Additional verified requests still need authoring from the inventory.
- The existing **78 Path/Grammar navigation paintings** (60 + 18) are available for reuse. They do not make 78 new teaching scenes complete.

## Combining Path and Grammar

**Yes: use one Learn destination** with a guided course, a browsable reference and practice/tools. A chapter should offer its lesson sequence and relevant reference/practice in the same area. Use one stable concept map so a learner does not see the same subject as unrelated courses. Search and “Continue” should open the relevant lesson or reference topic directly.

Preserve the three meanings of progress: server-assessed Path mastery, Grammar read marks, and Learn card bookmarks/completion. An adapter can read their existing IDs and storage without clearing or overwriting anything. Reading a reference or completing a card deck must never award the mastery of an old assessed lesson. The old `Lesson`, `GrammarChapter`, `GrammarTopic`, tools and challenge routes should remain reachable while the unified entry point is introduced.

A navigation consolidation can happen before all content is rewritten **if every existing lesson, topic, tool and assessment remains reachable**. Simply replacing both tabs with today's seven-lesson Learn map would remove access to most content and practice. A complete content replacement is not ready yet.

Implementation sequence:

1. Resolve the inventory's candidate links into explicit concept/lesson/topic/feature mappings; retain all 49 assessment entries and all 105 reference topics.
2. Build the unified Learn entry with course, reference and practice access, search, resume and truthful progress labels.
3. Check old links, back navigation, offline reference, English/Hindi, large text, read marks, bookmarks and assessed mastery. Then consolidate bottom navigation to Home / Learn / Talk / Play / Read.
4. Adapt the remaining chapters and author verified card-level image requests; generate/inspect the full image set in tracked batches.
5. Retire duplicate presentations only once their outcomes, references and assessments are covered. Retain source provenance and compatible old IDs.

The navigation consolidation is now implemented locally. Existing progress IDs/stores are read directly, so no destructive progress migration was needed. Full new-format content replacement and the whole image set are still pending.

## Rectifications made and validation

- Added this full-course inventory and chapter-level estimate, replacing the narrow Sandhi/Verse-only interpretation.
- Corrected delivery-vs-integration provenance: the JPGs and PNGs are distinct scenes.
- Preserved all original images and the permitted writing tools. The card renderer now clips the JPGs at their inspected scene boundaries and puts checked selectable Devanagari/IAST in the art caption area. It removes the redundant copy below the artwork and lets the caption grow with text size.
- Corrected the existing checker’s misleading “69 lesson blocks” output to actual per-lesson card counts. Fixed its undefined variable in the example-source rejection path.
- Added current owner-scope amendments to the handover and image instructions. Historical requests and delivery records remain available; the owner’s pen/pencil permission overrides the old request wording.

Validation results are recorded in `CODEX-RESULT.md`. Source/asset audits and TypeScript checks do not establish Sanskrit accuracy for all unadapted manuscripts or native-device behavior.
