# Books and audiobooks roadmap

Date: 16 October 2026  
Status: agreed direction; implementation checklist  
Baseline: [16 October content audit](../results/content-audit-20261016/README.md)

## 1. Order of work

Follow this document from top to bottom:

1. Obtain and publish the books in Sanskrit Devanagari.
2. Produce and verify Roman Sanskrit (IAST) for those books.
3. Add written meanings, starting with English and Hindi, then further languages.
4. Prepare the Sanskrit audiobook corpus and decide how each passage should be spoken or chanted.
5. Produce, review and publish Sanskrit audio, including metre-aware chanting where appropriate.
6. Add spoken English and Hindi meanings using Sarvam or another provider selected at that stage.

**A missing translation, Roman layer or recording must not hold up a valid Devanagari book.** The existing importer already derives IAST, so keep that working during text imports; phase 2 is the coverage/quality checkpoint, not a reason to postpone an automatic conversion.

Finish and account for the book corpus before starting the meanings programme. Finish the written-meaning phase before starting the new audiobook programme. Preserve existing meanings and audio throughout. Audio work begins with verified verses, not a bulk TTS job.

## 2. What “all books” means

Start with every one of the **51 existing catalogue entries**, including empty placeholders, blocked builds and books that currently contain selections. A catalogue cover or a nonzero row count does not make a book complete.

For a named complete work, aim for the complete chosen edition. For an anthology, define its contents explicitly. When a catalogue selection expands to a whole book, preserve its existing references and reader links through an explicit mapping. Record unavailable chapters as gaps rather than declaring a fragment complete.

After the existing catalogue, work through the researched expansion list in section 4. Before execution, turn families such as “other Purāṇas” and “minor Upaniṣads” into a named, finite inventory with editions and source status. Freeze that inventory for a batch; discoveries go into the next batch so completion can be measured.

Use the existing requirement that imported sources permit commercial and non-commercial use. If a source is unsuitable, find an acceptable transcription, an eligible scan for OCR, or permission. A blocked title stays visible in the tracker while the next title proceeds.

## 3. Phase 1 — Devanagari books first

### 3.1 Establish the tracking and import discipline

- [x] Refresh production/local counts before starting; the baseline below is a dated snapshot (`results/corpus/prod-counts-2026-10-16.json`).
- [x] Maintain one record per book/edition: slug, title, intended contents, source URL/revision, transcription rights, chapter inventory, expected units, extracted units, validated units and production units (`backend/scripts/books/tracker.py` → `results/corpus/tracker.{json,md}`).
- [x] Track states separately: source needed, source found, fetched, extracted, validation blocked, ready to import, imported, production verified, complete or partial with recorded gaps (tracker states + per-book `unit_notes`).
- [x] Count canonical references and chapters separately from raw database rows. Sentence chunks, prose units, half-verses and duplicate rows must not inflate verse completeness (tracker `units` vs `rows`; per-book unit notes for rigveda, samaveda, sushruta, gitagovinda, amarakosha, vetala, devimahatmya, chanakya).
- [x] Keep raw source material and source-specific reports. Fix structural extraction errors without silently rewriting Sanskrit or deleting meaningful accents/pluta marks to satisfy a character whitelist (`*.sources.json` pages/revisions/files kept; the six blocked builds fail validation rather than being whitelist-rewritten).
- [x] Reconcile the small existing classic local/prod differences individually; production contains meanings and audio absent locally, so do not overwrite it with the local database (`results/corpus/classic-reconciliation.{json,md}` + `classic-reconciliation-decisions.md`; 8 local rows repaired from prod with `backend/app.db.bak-20261016-015816-classic-sync`).
- [x] Preserve stable verse identities, existing translations, audio links and saved positions when correcting text or references. Record mappings when an identity must change (local ids kept in `apply_local_classic_sync.py`; mappings table in the decisions file).
- [x] Keep text import independent of TTS and meaning generation. No provider call should occur because a book was imported or opened (`scripts/import_text.py` imports text only).
- [x] Use the existing backup, dry-run, import and read-only production verification workflow for each accepted batch (prod reads `SET TRANSACTION READ ONLY`; local sync backed up then applied; `scripts/prod_import.py` dry-run default).

### 3.2 Finish the locally prepared backlog

Work in this order; if a title needs a source/editorial decision, record the blocker and continue down the list.

| Order | Book | Baseline and next action |
|---|---|---|
| 1 | Kaṭha Upaniṣad | Done 2026-10-16: 119 verses imported from the reviewed completion (GRETIL 40 + DCS; DCS 1.2.17–26 renumbered to 1.2.16–25, 2 typos repaired via `--replace-refs`, the 2 affected chants reattached). Reports: `results/imports/katha-complete-fixed.payload.report.json` and `.prod-report.json`; production verified. Next: order 2 (Muṇḍaka). |
| 2 | Muṇḍaka Upaniṣad | Done 2026-10-16: 64 verses imported from the reviewed completion (sa.wikisource CC BY-SA 4.0); the six chapter openings' glued-in colophon/heading front matter dropped in `fix_mundaka_payload.py` (3.1.1 and its five relatives), 3.1.6's four rows (two fragments, two complete, each chanted) left as written. Reports: `results/imports/mundaka-complete-fixed.payload.report.json` and `.prod-report.json`; production verified. Next: order 3 (Śiva Mahimna Stotra). |
| 3 | Śiva Mahimna Stotra | Done 2026-10-16: 40 verses imported from the sa.wikisource print (CC BY-SA 4.0, revid 320011) — the 31 stotra verses plus nine phala verses; the page's four marker defects (verse 12 printed ११ twice, verses 15 and 23 unnumbered, verse 25 with a stray dot) repaired by `_repair_mahimna_markers` in the builder (the old 37-row stop rested on a stale report). Reports: `results/imports/mahimna.payload.report.json` and `.prod-report.json`; production verified. Next: order 4 (Vetāla Pañcaviṃśati). |
| 4 | Vetāla Pañcaviṃśati | Repair the 2,610-row build; four failing rows; verify story/prose boundaries. |
| 5 | Raghuvaṃśa | Repair three failing rows and reconcile 1,678 candidate rows against the older 1,567 reference count/variants. |
| 6 | Śukla Yajurveda | Repair eight failing rows in the 1,979-row attempt; check chapter coverage and Vedic notation. |
| 7 | Bhāgavata Purāṇa | Repair two failing rows in the 12,960-row attempt; verify all skandhas/chapters rather than accepting the total alone. |
| 8 | Śiva Purāṇa | Repair ten failing rows in the 30,377-row attempt; verify saṃhitā/chapter structure and numbering. |

These are candidate build counts, not accepted canonical verse totals. Older handovers have different numbers; use the latest report and freshly checked source.

### 3.3 Fill the empty catalogue entries

- [ ] Atharvaveda: fetch/build the planned DCS kāṇḍas 1–18 and Wikisource 19–20; reconcile boundaries and coverage across sources.
- [ ] Caraka Saṃhitā: choose an acceptable source, implement extraction, and replace the index-only state with readable content.
- [ ] Siṃhāsana Dvātriṃśikā: choose the edition/source and build the text, including prose where present.
- [ ] Garuḍa Purāṇa: resolve the current source restriction or obtain an acceptable alternative, then build/import.
- [ ] Arthaśāstra: resolve the source restriction, then extract books, chapters, prose and verses faithfully.
- [ ] Līlāvatī: resolve the source restriction and repair the rejected attempt: 170 rows versus 272 expected, 93 repeated references and 20 failing rows.

### 3.4 Complete and audit the books already present

- [ ] Audit every populated title in the 51-entry inventory below. Presence in production is not a completeness certificate.
- [ ] Expand Rāmāyaṇa and Mahābhārata from selections to complete chosen editions, in chapter/parvan batches. First revise the old bulk-import restriction that conflates text import with TTS expense; preserve the rule that text import never generates audio.
- [ ] Complete the intended contents of Hitopadeśa, Pañcatantra and Nītiśataka; define the Subhāṣita/Bhartṛhari anthology contents and whether its constituent works should have separate catalogue entries.
- [ ] Verify the intended canto/act coverage of Kumārasambhava and Śākuntala; verse-only extraction must not silently omit intended prose or later sections.
- [ ] Check Ṛgveda sentence-level DCS rows against canonical ṛc references. Preserve/map existing identities if replacing segmentation.
- [ ] Review known source/count differences in Sāmaveda, Saundarya Laharī, Devī Māhātmya, Amarakośa and Chāṇakya Nīti; retain edition notes and record real gaps.
- [ ] Check every remaining book against its source chapter inventory, including opening/closing passages and any omitted prose, headings or variants relevant to the chosen edition.
- [ ] Verify shelf → contents → chapter → passage access in production; use chapter pagination for large books and keep bulk imports outside the daily-verse/game pools.

### 3.5 Phase 1 completion checkpoint

Every title in the current batch has validated Devanagari readable in production, with provenance, contents and stable references. A title that cannot yet be sourced has a specific recorded blocker and remains pending; do not label the batch fully complete while those titles are unresolved. Meanings and audio are not part of this checkpoint.

## 4. Expand the Sanskrit inventory

After the existing catalogue backlog, create named book records and source plans for the following researched groups, then apply phase 1 to each batch:

- [ ] Kṛṣṇa Yajurveda / Taittirīya Saṃhitā, distinct from Śukla Yajurveda and Taittirīya Upaniṣad.
- [ ] Kauṣītaki and Maitrāyaṇīya Upaniṣads, followed by an explicit inventory of the remaining Muktikā 108; avoid counting already included principal Upaniṣads twice.
- [ ] Brāhmaṇas and Āraṇyakas: enumerate works/recensions individually before extraction.
- [ ] Remaining Mahāpurāṇas: enumerate the 18, identify existing coverage and add missing works. Devī Māhātmya alone does not make the whole Mārkaṇḍeya Purāṇa complete.
- [ ] Harivaṃśa.
- [ ] Brahmasūtra; track commentaries as separate works/editions rather than mixing them with the root text.
- [ ] Additional books discovered during sourcing, in a named subsequent batch.

The earlier [source survey](../research/scripture-sources-survey.md) is a starting point. Recheck source availability, edition and rights during implementation; its research notes are not completed imports.

## 5. Phase 2 — Roman Sanskrit

- [ ] Generate IAST deterministically from the validated Devanagari using the existing transliteration pipeline.
- [ ] Backfill missing IAST without overwriting correct Sanskrit, references, translations or audio.
- [ ] Verify coverage for every passage, including prose, punctuation, avagraha, anusvāra/visarga and Vedic notation where retained.
- [ ] Check representative conversions from each source/recension and keep transliteration tests for actual edge cases.
- [ ] Keep Devanagari primary and Roman optional in the reader; ensure large paged books have the same support.
- [ ] Record the conversion version so Sanskrit corrections can trigger targeted IAST regeneration.

**Checkpoint:** every accepted Sanskrit passage in the batch has verified IAST. Roman transliteration is not an English translation. Existing production coverage was 100% on the audit date; new books must retain that coverage.

## 6. Phase 3 — written meanings by language

Begin after Sanskrit book coverage and Roman verification for the agreed inventory.

- [ ] Create independent language coverage/status per book and canonical passage; start with English and Hindi, then add named further languages.
- [ ] Select sources or an authoring/translation process per language, keeping edition alignment, attribution and rights with each translation.
- [ ] Distinguish a sourced translation, a generated study meaning and a reviewed meaning. A populated string alone is not a reviewed translation.
- [ ] Preserve existing sourced meanings and fill only missing language slots. Fix the current endpoint behavior where existing English prevents missing Hindi from being filled.
- [ ] Align translations to canonical passage IDs; support prose and multi-verse translation units where sentence meaning crosses verse boundaries.
- [ ] Review meaning, omissions, proper names and ambiguous readings against the Sanskrit. Do not treat morphological stem labels as bilingual word meanings.
- [ ] Fill whole books in resumable batches; do not depend on readers opening verses to complete the corpus.
- [ ] Show available languages consistently in classic and paged readers and offline packs; record unavailable languages explicitly.
- [ ] Track completion of English and Hindi separately. Additional languages repeat this process without blocking a completed language.

**Checkpoint:** the agreed book batch has reviewed written English and Hindi meanings aligned to its Sanskrit, with other languages tracked independently. Record any unresolved passages explicitly before advancing the batch to audio.

## 7. Phase 4 — audiobook preparation and chanting decisions

Start with the accepted Sanskrit corpus. Do not send all imported rows directly to a renderer.

- [ ] Build a manifest of canonical passages by book, chapter and order, tied to a Sanskrit text hash/version. Exclude duplicate half-verses and alternate database rows from default narration.
- [ ] Classify passages: metrical verse, Vedic passage, sūtra/prose, title/speaker label or other structural material.
- [ ] Detect candidate chandas for metrical verses; verify pāda boundaries, syllable quantities and exceptions. “Metered chanting” here means chanting to poetic metre.
- [ ] Choose and record delivery per passage: plain Sanskrit reading, metre-aware chanting, or specialist/tradition-specific Vedic recitation.
- [ ] Treat uncertain metre and source corruption as review items. Do not force prose/sūtras into a verse tune or claim accent-sensitive Vedic recitation from text that has lost its accents.
- [ ] Choose book-level pronunciation, voice, pace, pauses and treatment of speaker labels, with passage-level exceptions where needed.
- [ ] Compare the manifest with existing audio: reusable, missing, stale after a text correction, awaiting review, or requiring a different chant treatment.
- [ ] Refresh the baseline of 18 `needs_listen` records and the served record without a current matching row; resolve them before scheduling replacement renders.
- [ ] Estimate duration and provider/GPU cost from the approved manifests, then render a representative sample for each delivery style before scaling.

**Checkpoint:** every narratable passage has validated text, identity, ordering and an explicit delivery decision; unknown metre remains marked for review.

## 8. Phase 5 — Sanskrit audiobook production and release

- [ ] Reuse matching approved audio; generate only missing or explicitly rejected/stale passages.
- [ ] Use resumable per-book/chapter render batches with separate output folders and versioned manifests.
- [ ] Check pronunciation, completeness, metre/delivery, silence, clipping and line timing. Automated checks support listening review; they do not establish correct chanting by themselves.
- [ ] Keep unapproved renders out of served coverage. Upload accepted assets and import metadata with the existing review/import workflow.
- [ ] Publish voiced counts, total passage counts, duration and completeness per book/chapter from the backend.
- [ ] Add chapter-aware paged audiobook discovery and navigation. Adding covers to Audio home alone is insufficient because the current audiobook screen loads without a paged chapter.
- [ ] Make partial coverage visible, and define skip/stop behavior for missing audio. A book with one chant must not look like a complete audiobook.
- [ ] Verify resume, read-along, chapter transitions, background/lock-screen playback and offline behavior on supported devices.
- [ ] Verify production object availability, verse UID/text-version matches and durations after import.

Existing paged audio to revisit first: Bhaja Govindam, Āditya Hṛdayam, Rāmarakṣā, Nārada Bhakti Sūtra, Māṇḍūkya, Meghadūta, Yoga Sūtra and Aṣṭāvakra Gītā. These had 798 served row matches in total at baseline, but were excluded from Audio home.

**Checkpoint:** the agreed audiobook batch has accepted Sanskrit recordings for its full intended contents, accurate coverage labels and verified playback. Partial books remain marked partial.

## 9. Phase 6 — spoken English and Hindi meanings

- [ ] Use the reviewed written meanings from phase 3 as narration input. This phase voices meanings; it does not invent new translations.
- [ ] Evaluate Sarvam and alternatives at implementation time with the same English/Hindi samples; select by pronunciation, intelligibility, pacing, voice quality, cost and available usage terms.
- [ ] Keep English and Hindi narration as separate tracks from Sanskrit recitation, each tied to translation ID, language, text hash, provider, voice and generation settings.
- [ ] Decide controls for Sanskrit only, meaning only, and Sanskrit followed by the selected meaning, including book/chapter continuity and pauses.
- [ ] Generate samples, review them, then render missing narration in resumable batches. Reuse cached audio; regenerate only after an approved translation/voice change.
- [ ] Support narration units covering multiple verses where the written meaning is shared; do not repeat the same explanation after every verse accidentally.
- [ ] Review pronunciation of Sanskrit names within English/Hindi narration and verify alignment to the intended passage.
- [ ] Expose separate Sanskrit, English-audio and Hindi-audio coverage and download controls; verify storage, playback and background behavior.

**Checkpoint:** English and Hindi meaning narration is available for the agreed batch, accurately aligned, separately selectable and based on the approved written text. Further languages follow the same process.

## 10. Existing catalogue checklist

Baseline production snapshot from 16 October 2026. Each unchecked row means “verify/finish Devanagari coverage,” not “nothing exists.” Raw rows can differ from canonical verse counts. This table covers all 51 catalogue entries; section 4 adds the expansion inventory.

| Done | Slug | Book | Production rows | Phase 1 starting point |
|---|---|---|---:|---|
| [ ] | `gita` | Bhagavad Gītā | 706 | Present; verify edition, chapters and canonical coverage |
| [ ] | `hito` | Hitopadeśa (selections) | 108 | Complete chosen work or define anthology contents |
| [ ] | `niti` | Nītiśataka (selections) | 100 | Complete chosen work or define anthology contents |
| [ ] | `isha` | Īśopaniṣad (complete) | 18 | Present; verify edition, chapters and canonical coverage |
| [x] | `katha` | Kaṭhopaniṣad (complete) | 42 | Done 2026-10-16: 119 verses (GRETIL 40 + DCS completion) imported locally and in production; 2 chants reattached; per-book state in `results/corpus/tracker.json`. |
| [ ] | `ramayana` | Rāmāyaṇa (selections) | 62 | Complete chosen work or define anthology contents |
| [ ] | `mahabharata` | Mahābhārata (selections) | 194 | Complete chosen work or define anthology contents |
| [ ] | `pancha` | Pañcatantra (selections) | 35 | Complete chosen work or define anthology contents |
| [ ] | `subhashita` | Subhāṣita anthology (selections) | 89 | Complete chosen work or define anthology contents |
| [x] | `mundaka` | Muṇḍaka Upaniṣad (complete) | 23 | Done 2026-10-16: 64 verses (sa.wikisource completion; front matter of the six chapter openings dropped) imported locally and in production; 3.1.6's four rows left as written; per-book state in `results/corpus/tracker.json`. |
| [ ] | `ayurveda` | Caraka Saṃhitā (indexed) | 0 | Source and build index-only title |
| [ ] | `simhasana` | Siṃhāsana Dvātriṃśikā (selections) | 0 | Source and build index-only title |
| [ ] | `vishnusahasranama` | Viṣṇu Sahasranāma | 170 | Present; verify edition, chapters and canonical coverage |
| [ ] | `lalita` | Lalitā Sahasranāma | 236 | Present; verify edition, chapters and canonical coverage |
| [ ] | `bhajagovindam` | Bhaja Govindam | 31 | Present; verify edition, chapters and canonical coverage |
| [ ] | `saundarya` | Saundarya Laharī | 98 | Present; verify edition, chapters and canonical coverage |
| [ ] | `aditya` | Āditya Hṛdayam | 31 | Present; verify edition, chapters and canonical coverage |
| [ ] | `tandava` | Śiva Tāṇḍava Stotra | 16 | Present; verify edition, chapters and canonical coverage |
| [x] | `mahimna` | Śiva Mahimna Stotra | 40 | Done 2026-10-16: 40 verses (sa.wikisource Brhat Stotra Ratnakara print; the page's four marker defects repaired by the builder) imported locally and in production; per-book state in `results/corpus/tracker.json`. |
| [ ] | `ramaraksha` | Rāmarakṣā Stotra | 38 | Present; verify edition, chapters and canonical coverage |
| [ ] | `naradabhakti` | Nārada Bhakti Sūtra | 84 | Present; verify edition, chapters and canonical coverage |
| [ ] | `devimahatmya` | Devī Māhātmya | 588 | Present; verify edition, chapters and canonical coverage |
| [ ] | `bhagavata` | Bhāgavata Purāṇa | 0 | Repair rejected build and verify completeness |
| [ ] | `shivapurana` | Śiva Purāṇa | 0 | Repair rejected build and verify completeness |
| [ ] | `garuda` | Garuḍa Purāṇa | 0 | Resolve source restriction; build/repair |
| [ ] | `rigveda` | Ṛgveda | 11,766 | Present; verify edition, chapters and canonical coverage |
| [ ] | `samaveda` | Sāmaveda | 1,902 | Present; verify edition, chapters and canonical coverage |
| [ ] | `yajurveda` | Śukla Yajurveda (Vājasaneyi Mādhyandina) | 0 | Repair rejected build and verify completeness |
| [ ] | `atharvaveda` | Atharvaveda (Śaunaka) | 0 | Fetch/build planned sources |
| [ ] | `kena` | Kena Upaniṣad | 35 | Present; verify edition, chapters and canonical coverage |
| [ ] | `prashna` | Praśna Upaniṣad | 66 | Present; verify edition, chapters and canonical coverage |
| [ ] | `mandukya` | Māṇḍūkya Upaniṣad | 12 | Present; verify edition, chapters and canonical coverage |
| [ ] | `taittiriya` | Taittirīya Upaniṣad | 209 | Present; verify edition, chapters and canonical coverage |
| [ ] | `aitareya` | Aitareya Upaniṣad | 138 | Present; verify edition, chapters and canonical coverage |
| [ ] | `shvetashvatara` | Śvetāśvatara Upaniṣad | 166 | Present; verify edition, chapters and canonical coverage |
| [ ] | `chandogya` | Chāndogya Upaniṣad | 1,185 | Present; verify edition, chapters and canonical coverage |
| [ ] | `brihadaranyaka` | Bṛhadāraṇyaka Upaniṣad | 1,243 | Present; verify edition, chapters and canonical coverage |
| [ ] | `meghaduta` | Meghadūta | 122 | Present; verify edition, chapters and canonical coverage |
| [ ] | `kumarasambhava` | Kumārasambhava | 613 | Present; verify edition, chapters and canonical coverage |
| [ ] | `raghuvamsha` | Raghuvaṃśa | 0 | Repair rejected build and verify completeness |
| [ ] | `shakuntala` | Abhijñānaśākuntala (verses) | 192 | Present; verify edition, chapters and canonical coverage |
| [ ] | `gitagovinda` | Gītagovinda | 272 | Present; verify edition, chapters and canonical coverage |
| [ ] | `vetala` | Vetāla Pañcaviṃśati (Somadeva) | 0 | Repair rejected build and verify completeness |
| [ ] | `yogasutra` | Yoga Sūtra | 195 | Present; verify edition, chapters and canonical coverage |
| [ ] | `hathayoga` | Haṭhayogapradīpikā | 395 | Present; verify edition, chapters and canonical coverage |
| [ ] | `ashtavakra` | Aṣṭāvakra Gītā | 298 | Present; verify edition, chapters and canonical coverage |
| [ ] | `sushruta` | Suśruta Saṃhitā | 7,582 | Present; verify edition, chapters and canonical coverage |
| [ ] | `arthashastra` | Arthaśāstra | 0 | Resolve source restriction; build/repair |
| [ ] | `lilavati` | Līlāvatī | 0 | Resolve source restriction; build/repair |
| [ ] | `amarakosha` | Amarakośa | 3,127 | Present; verify edition, chapters and canonical coverage |
| [ ] | `chanakya` | Chāṇakya Nīti | 343 | Present; verify edition, chapters and canonical coverage |

## 11. Resume and handover

At the end of each working session, update this file or a linked per-book tracker with the completed checkboxes, source/report paths, exact chapters imported, remaining blockers and the next unchecked action. Verify production before recording a production completion. Preserve the language/audio phase order above even when a later task is easier.

Implementation references:

- [Machine-readable baseline](../results/content-audit-20261016/inventory.json)
- [Catalogue seeds](../backend/app/seeds/canon.py)
- [Book source/build specifications](../backend/scripts/books/catalogue.py)
- [Book builder](../backend/scripts/books/build.py)
- [Classic completion builders](../backend/scripts/build_classic_fixes.py)
- [Text importer](../backend/scripts/import_text.py)
- [Production import wrapper](../backend/scripts/prod_import.py)
- [Chant workflow](../gpu/README.md) and [render history](../handover_recite_result.md); recheck infrastructure before use because old machine instructions may be stale.
