# Generated image integration — 13 October 2026

## Implemented

All **203 generated teaching deliveries** are connected in app code to reachable lesson cards. `assetMap.ts` now uses literal requires of the delivered PNG/WebP files, including the original three PNG reading illustrations instead of the older JPG prototypes. The originals remain intact.

The existing seven reviewed card lessons and their order/progress IDs remain intact. Added **130 source-reading lessons / 629 cards**: 69 illustrated Grammar topics (141 scenes), all 13 Sandhi manuscript lessons (108 cards / 35 scenes), and all 48 Verse & Rhythm manuscript lessons (380 cards / 24 scenes). The total accessible card catalogue is 137 lessons / 691 cards, including the original seven lessons / 62 cards. These counts describe reading lessons, not newly assessed lessons or independent grammatical verification.

Grammar reading lessons retain the existing bilingual guide examples and summaries. Sandhi and Verse preserve the existing English manuscripts and explicitly announce English fallback in Hindi mode. The manuscripts are marked as source readings; they are not represented as reviewed bilingual or graded lessons. Their full original source files now live in this project, with referenced source URLs available at the lesson endpoint. Required qualifications stay on the main cards. No invented Sanskrit captions were added to contextual Verse scenes.

`TeachingArt.tsx` clips the source caption panel and renders selectable Devanagari plus smaller IAST in a native caption area that grows with type size. Accessible image descriptions are supplied; failed image loads retain the caption/text equivalent. Exact source labels match Grammar reference example images; Sandhi's existing introductory cards also pick matching art where both scripts agree. Formula/metre text stays native.

The unified Learn chapters include the matching illustrated readings. Existing assessed course/practice routes remain available. Reading uses the existing local bookmark/read-through state and does not call grading or mastery endpoints.

## Open locally

Learn → Illustrated card lessons, then choose a Grammar reading, Sandhi full source reading, or Verse & Rhythm module. The same readings also appear in the corresponding Learn chapter. Grammar reference topics show the matching illustration beside their source example. The verb-number lesson uses the generated one/two/five-reader PNGs.

## Evidence and limits

- All 203 deliveries have card mappings recorded in [image-delivery-index.json](image-delivery-index.json) and append-only `integration-status.jsonl` entries with exact paths/hashes.
- TypeScript compilation: `npx tsc --noEmit` passed after the final integration edits (exit 0).
- No tests or new image/UI review were run. The owner waived review of the final 59 images; those records remain `waived_by_owner`. Earlier reviewed images retain their provenance.
- This is local code integration. No native-device rendering check, deployment, or independent linguistic audit of the full manuscripts is claimed. Complete precise native/vector diagram production remains separate work.

## Main files

`mobile/src/learnv2/{assetMap,sourceReadings,catalogue,types,unified,validate}.ts`, `TeachingArt.tsx`, `LearnCard.tsx`; Grammar `BlockRenderer.tsx` and `GrammarTopic.tsx`; `LearnV2Lesson.tsx` and `LearnV2Map.tsx`.

The reproducible data builder is [build-image-integration.py](build-image-integration.py). It builds the static registry/source readings from local delivery records and manuscript copies without changing image files or calling a generation provider.
