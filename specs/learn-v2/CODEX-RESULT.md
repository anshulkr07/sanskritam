# Codex image generation result

## Lesson integration completed — 13 October 2026

All **203 generated deliveries are now connected to reachable lesson cards in local app code**. The generated reading PNGs replace the older prototype JPGs in the registry. See [IMAGE-INTEGRATION-RESULT.md](IMAGE-INTEGRATION-RESULT.md) and the updated [image-delivery-index.json](image-delivery-index.json). Added 69 illustrated Grammar topic readings, 13 full Sandhi source readings and 48 Verse & Rhythm source readings. The English manuscript readings are labelled; the seven reviewed lessons and assessed course routes are preserved. No new visual review or native-device validation is claimed. Earlier integration-pending statements below describe prior stages and are superseded.

## Completed image production — 13 October 2026

**203 teaching images are generated and saved:** 141 Grammar/foundations scenes, 35 Sandhi scenes, 24 Verse & Rhythm scenes, and the original three reading PNGs. All 200 jobs in `image-production-queue.json` and `manuscript-image-production-queue.json` have ready delivery records; no queued scene jobs remain. All recorded project files exist.

The 200 new scenes are 1536 × 1024 WebP exports in `mobile/assets/learn-v2/`; original generated PNGs are preserved. Pens and pencils are allowed. Prompts, exact source references, captions, dimensions and hashes are recorded in `requests.jsonl`, `deliveries.jsonl`, and [image-delivery-index.json](image-delivery-index.json).

The 141 Grammar scenes and original three reading images were previously visually reviewed. The final 59 Sandhi/Verse images were generated without visual review following the owner's explicit “No need to review the images now” instruction. Their records say `waived_by_owner`; they must not be described as reviewed.

This completes the current source-derived concrete scene generation queues. It does not certify artwork for every lesson or complete the planned native/vector diagrams. Generated deliveries still need app mapping and checked native captions; this report does not claim app integration. Verse contextual scenes intentionally have no invented Sanskrit labels. Sandhi scenery illustrates meaning; native formulas must explain the sound rule.

The sections below document the earlier three-image delivery and 12 October audit and are historical; their image-production counts are superseded by this update.

Navigation/content integration update: [UNIFIED-LEARN-RESULT.md](UNIFIED-LEARN-RESULT.md) records the locally implemented single Learn destination. This image report still describes three generated PNG deliveries, not a completed whole-course image set.

Current whole-course estimate and audit: [WHOLE-COURSE-AUDIT.md](WHOLE-COURSE-AUDIT.md), with all source IDs in [whole-course-inventory.json](whole-course-inventory.json). The estimate is 18 sections, 156–187 guided lessons plus five reference sheets, 186–262 scene illustrations before contingency (budget about 200–300), and 200–299 native/vector diagrams. These are planning estimates, not generated assets.

Generated 12 October 2026 after the owner's explicit instruction to start. Built-in Codex Image Generation was used, with `verbs-card-1.png` from the existing prototype as the style reference. Three 1536 × 1024 reading scenes are in `mobile/assets/learn-v2/`.

The model put the singular caption on all three images, so I removed its caption area from each and composited the verified forms using the project's Devanagari and Roman font files. I checked the final images visually. The rendered Devanagari and IAST are large/primary and smaller/secondary, respectively. Reader counts are one, exactly two and five.

| Asset | Sanskrit | English alt | Path |
| --- | --- | --- | --- |
| `verbs-reading-single` | पठति · paṭhati | One learner reading an open book. | `mobile/assets/learn-v2/verbs-reading-single-v1.png` |
| `verbs-reading-dual` | पठतः · paṭhataḥ | Exactly two learners reading open books. | `mobile/assets/learn-v2/verbs-reading-dual-v1.png` |
| `verbs-reading-plural` | पठन्ति · paṭhanti | Five learners reading open books. | `mobile/assets/learn-v2/verbs-reading-plural-v1.png` |

The starting labels and teaching scope come from the existing `verbs-reading-cards.html` pilot and its approved rulebook. The generated captions were not trusted for linguistic accuracy. Request and delivery records live in `requests.jsonl` and `deliveries.jsonl`, including dimensions, hashes, script labels and accessibility descriptions. No separate `asset-manifest.json` is present.

The 12 October whole-course audit corrects an earlier provenance mistake: `assetMap.ts` references three older prototype JPGs, not derivatives of these PNG deliveries. Their reader counts are one, two and three; the delivered PNGs show one, two and five. The three PNG hashes match `deliveries.jsonl`. The original JPG captions contain imperfect IAST. The renderer now clips their baked captions out and displays the checked Devanagari and IAST once, as selectable native text inside the artwork frame. All original files remain intact. Pens and pencils are permitted by the owner. The other two requests (Sandhi passage and person contrast) remain drafts with unverified labels.

The old `integration-status.jsonl` entries referred to the JPG assets; their shared IDs did not prove that the generated PNG deliveries were integrated. The current inventory records three generated PNG deliveries and three reused JPG integrations separately. No new images were generated in the whole-course audit. Its code rectifications are limited to artwork caption rendering/metadata and the existing catalogue checker.

## Corrected whole-curriculum scope (12 October)

The three reading images are only the first Learn V2 delivery. The broader repository has more teaching material than the Sandhi and Verse & Rhythm manuscripts:

| Surface/source | Teaching inventory | Existing art | New Learn V2 card art |
| --- | ---: | --- | --- |
| Path, `specs/path-art/curriculum.json` | 11 units, 49 released lessons | 11 unit banners and 49 lesson paintings in `mobile/assets/path/` | No card-level illustration inventory yet |
| Grammar guide, `backend/app/services/grammar_guide/` | 18 chapters, 105 topics | 18 chapter paintings in `mobile/assets/hubs/` | No topic-level illustration inventory yet |
| Sandhi pilot manuscript | 13 lessons, 108 teaching cards | Some prototype art and native formula concepts | No delivered Learn V2 art |
| Verse & Rhythm manuscript | 12 modules, 48 lessons | Prototype previews | No delivered Learn V2 art |
| Live Learn V2 | 7 lessons, 62 cards | Three reused prototype JPG scenes; three generated PNG deliveries remain unused | Remaining cards use text/native visuals or await scoped art |

These inventories overlap: Path and Grammar cover some of the same grammar as the new Sandhi and Verse manuscripts. Their counts must not be added as if every entry needs a separate bitmap. A complete Learn V2 image plan must audit every lesson and card across foundations, cases, numbers, persons, genders, tenses, voices, compounds, kāraka, Sandhi and Verse/Rhythm. Existing Path and Grammar paintings may be reused where they teach the same point; exact forms, formulas and metre scans should be drawn as native or vector visuals. The current request log (three ready and two draft entries) is not a full-project image inventory, and no additional Learn V2 images have been delivered yet.

## Audit correction checks

- `npx tsc --noEmit`: passed after the caption/crop changes.
- `node scripts/check-learnv2.mjs`: passed, showing seven lessons / 62 cards, five request records, six append-only integration records (three initial + three provenance corrections), and all referenced assets present.
- Inspected static React Native Web rendering of the actual `LearnV2ExampleArt` component at 320px English/default size, 320px Hindi/XL (1.6), and 390px English/default size, plus the missing-art fallback. Faces, hands and books remain visible; source captions are hidden; native labels appear once; all ten fixture cards have no horizontal overflow. Language/type-scale hooks are fixtures, not a running native app. Saved [HTML](artwork-qa.html), [full screenshot](artwork-qa.png), and [summary screenshot](artwork-qa-summary.png).
- Read all three production JPGs and all three PNG deliveries visually; checked the PNG hashes and all 60 Path / 34 hub manifest paths. No original image file was modified. No new image generation or native-device validation occurred during this audit.
- Consulted the [exact Expo SDK 57 reference](https://docs.expo.dev/versions/v57.0.0/) before mobile code edits, as required by `mobile/AGENTS.md`.
