# Teaching course implementation

Owner authorization: 20 October 2026. Implementation and technical verification updated 21 October 2026.

The course now has structured teaching coverage across all **44 units and 138 main lessons**, including revision, optional depth and assessment feedback. Sanskrit, translations, tables and controls remain live app content. Existing cards and progress identifiers are retained; one articulation activity was added.

## Delivered coverage

- **279 teaching cards:** all 188 core and 91 optional depth cards have teaching figures.
- **1,325 teaching figures**, including **675 revision-rule explanations** and **44 unit rereadings**. Shared explanations recur where needed; this is a placement count, not 1,325 independent concepts or paintings.
- **158 complete live tables** offer a focused phone view and a complete reference view. Every source cell remains available.
- **932 practice cards** have post-answer teaching figures, withheld before an answer.
- **33 new paintings**, **66 optimized WebPs**, bringing the selected artwork registry to **221 paintings**. Every new painting has a lesson consumer. Unit lessons use 180 distinct paintings, including shared assets.
- **44 unit checkpoints** offer reading/decoding with help closed, followed by meaning and analysis. These reuse actual unit examples; they are not newly authored unseen passages.

| Act | Units | Main lessons | All unit lessons | Figure placements | Distinct paintings used |
|---|---:|---:|---:|---:|---:|
| I | 4 | 17 | 25 | 173 | 26 |
| II | 14 | 46 | 76 | 479 | 72 |
| III | 13 | 36 | 63 | 372 | 49 |
| IV | 11 | 35 | 57 | 257 | 39 |
| V | 2 | 4 | 9 | 44 | 4 |

Paintings shared between acts are counted in each act. See [the complete lesson inventory](LESSON-INVENTORY.md) and [machine-readable evidence](delivery-inventory.json).

## Teaching behavior

Figures support multiple illustrations, exact counts, speaker/listener groups, near/far reference, event timelines, relationship graphs, matrices, progressive worked examples, source reading, sound ranges and metrical strips. Images use measured bounds and contain fitting. Phones use a vertical layout; larger text also keeps figures vertical on tablets.

Worked explanations can be stepped through, compared and reopened without spending an answer-reveal hint. Example selection, word analysis and folded revision explanations reduce repeated scrolling while keeping the full source available. Learners can close reading support and try independently.

Articulation cues separate place, voicing, aspiration and nasal airflow. Sandhi and derivation views identify exact changed grapheme spans. Metre views align syllables, weights, reasons and mātrā totals; a fragment match is distinguished from identifying a whole verse. The fourteen Śiva-sūtra rows distinguish phonemes from excluded markers.

New paintings cover controlled counts, actions, spatial relations, donor/gift/recipient, desire versus action, causing an action, simultaneous and sequential actions, companions, vocabulary and sound contrasts. All visible writing was checked against the intended text. [Contact sheet](artwork/review/contact-sheet.webp), [provenance](artwork/deliveries.json), [delivery verification](artwork/verification.json).

## Source and release review

The preservation audit confirms that original cards, examples, tables, answers and qualifications remain available. Six original text fields were deliberately corrected: relative/correlative case selection and long-compound analysis, including repeated copies. [Before/after records and sources](grammar-review.json).

Three edited lessons — `pn.who`, `pn.revision`, `c2.long` — are marked `engine_ok`, without inherited scholar approval. The existing release gate still requires independent Sanskrit sign-off for them. A [separate feature correction](feature-corrections.json) removes gender labels incorrectly inferred from the engine parameters for अस्मद्/युष्मद्.

The 574 named planning jobs guided formats and coverage. A figure count does not establish that every proposed job has been independently reviewed or that learning effectiveness has been demonstrated. Schematic mouth cues and audio still need specialist/learner evaluation. Broader unseen-reading progression, learner studies and advanced pathways are not established by this technical pass.

## Verification

- Structure and engine: **0 errors, 0 warnings**; no missing course artwork.
- Course/backend suite: **42 passed**. After the pronoun-label correction, **17 focused tests passed**, including its additional regression test.
- TypeScript, story logic/grading/offline-cache checks, lossless grapheme comparisons, artwork caching/fitting and public-data contracts passed.
- Browser: **47 representative lesson payloads**, **186 source cards**, **240 figures**, **363 step transitions**; English/Hindi, Light/Dark, 320/360/430/768px, text scale 1.6. A subsequent focused pass covered folded revisions, complete example access and decoded image readiness. [Full results](browser/verification.json), [focused results](browser/focused-verification.json).
- Android and iOS Hermes exports passed. Their asset inventories contain **zero selected remote painting derivatives**. [Export results](browser/native-exports.json).
- All 66 new derivatives were rechecked for bytes, hashes, dimensions, WebP encoding, recorded public verification and CDN HIT. Temporary originals and rejected intermediate PNGs were discarded after successful delivery.

Browser tests use production teaching components with web adapters for native platform services. No physical-device installation, APK build, independent scholar approval or learner efficacy study is claimed.

Repeatable checks:

```powershell
python specs/learn-art-20261020/teaching-course-plan/implementation/audit_delivery.py
python backend/scripts/sync_story_artwork.py --check
# From backend:
.venv/Scripts/python.exe -m app.curriculum check --engine
# From mobile:
npx tsc --noEmit
node scripts/check-story.mjs
node scripts/check-artwork.cjs
node scripts/check-teaching.mjs
node scripts/check-teaching.mjs --visual
```
