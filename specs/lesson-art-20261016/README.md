# Learn lesson artwork — 16 October 2026

Added 20 new illustrations using the built-in ImageGen tool. The exact prompts,
selected original paths, final asset paths, bilingual descriptions, and reviewed
source-example matches are in [manifest.json](./manifest.json). All production
assets are saved in `mobile/assets/learn-v2/lesson-*-v1.webp` as 900 × 600 WebPs.
The selected full-resolution originals are preserved in the ignored local
`results/lesson-art-20261016/originals/` directory.

The new scenes illustrate questions and introductions, a teacher's arrival,
friendship, forests, speech, a royal attendant, honest conduct, learning,
storytelling, three mangoes, four friends, forgetting, returning, stillness,
wealth, helpful neighbours, an Indian artisan, and a king setting an example.
Images contain no baked teaching text. Sanskrit and translations stay native,
selectable, and accessible, alongside the complete source teaching material.

The explicit registry connects 26 source examples to the new artwork and 12
more examples to suitable existing paintings. Those reuse decisions are in
[reused-art.json](./reused-art.json). It covers reordered sentences and existing
scenes that previously were reachable only from another topic. Matching uses
the topic ID and both exact Sanskrit and IAST fields; unrelated examples do not
inherit a teaching picture. Existing direct image matches take precedence.

All 105 guide topics now show their existing chapter painting on the opening
card, including topics without a technical term. The complete portrait is shown
without cropping. Chapter illustrations are decorative; teaching scenes have
English and Hindi descriptions. Tables, quizzes and abstract rules retain their
native presentation. This does not add a unique picture to every card: the
initial audit found 140 unmapped source examples/passages and this pass fills
38 of those gaps; other passages continue to use their source text and diagrams.

Rebuild with `backend/.venv/Scripts/python.exe specs/lesson-art-20261016/build.py`.
The builder preserves originals, writes the optimized assets and static require
registry, and produces the [artwork contact sheet](./contact.jpg).

Validation passed:

- `node scripts/check-lesson-art.cjs`: 20 new scenes, 38 exact mappings against
  the current backend guide, all 105 opening cards, asset files, descriptions,
  full-scene dimensions, and preservation of existing mappings.
- `node scripts/check-card-lessons.cjs`: all 105 topics, 1,609 cards and 97 trail
  lessons preserve their source material and progress migration.
- `node scripts/check-learnv2.mjs` and `npx tsc --noEmit --pretty false`.
- Production components rendered in 20 English/Hindi preview views using
  `LESSON_ART_QA=1 node scripts/render-card-lessons.cjs`.
- Browser inspection at 390 px and 320 px: loaded illustrations, native Sanskrit,
  translations, source word glosses and audio controls; no horizontal overflow
  in the checked narrow-screen card. [English](./card-en-390.jpg),
  [Hindi](./card-hi-390.jpg), [opening](./opening-390.jpg),
  [narrow screen](./card-320.jpg).

Changes are local to the checkout; no production update was published.
