# Corpus import handover — 2026-10-14

Owner brief: import everything available under a licence that permits **both commercial and non-commercial use**, put it on the **free** shelf; Sanskrit-only is fine (translations later); Hindi comes later via OCR/scraping.

Result: **20 books built + imported** (~30.6k verse rows; local verified 30,640 incl. the 10 books from earlier sessions), 7 books built but stopped on residual page noise (this doc lists exactly what's left), 3 GRETIL books excluded by licence.

---

## 1. Imported this run (all paged, tier=free, no audio, no translations)

| Book | Verses | Source (licence) |
|---|---|---|
| Ṛgveda | 11,766 | DCS (CC BY 4.0) — DCS groups sentences, not ṛcs: 10,552 canonical ṛcs come out as ~11.7k finer rows; refs are ordinals within each sūkta file |
| Chāndogya Up. | 1,185 | DCS (CC BY 4.0) |
| Bṛhadāraṇyaka Up. | 1,243 | DCS (CC BY 4.0) |
| Taittirīya Up. | 209 | DCS (CC BY 4.0) |
| Aitareya Up. | 138 | DCS (CC BY 4.0) |
| Śvetāśvatara Up. | 166 | DCS (CC BY 4.0) |
| Praśna Up. | 66 | sa.wikisource (CC BY-SA 4.0) |
| Kena Up. | 35 | sa.wikisource |
| Kumārasambhava (cantos 1-8) | 613 | DCS (CC BY 4.0) |
| Haṭhayogapradīpikā | 395 | DCS (CC BY 4.0) |
| Viṣṇu Sahasranāma | 170 | sa.wikisource |
| Devī Māhātmya | 588 | sa.wikisource (canonical 587; the ०९१-०९३ pages needed mixing series — see §4) |
| Amarakośa | 3,127 | sa.wikisource |
| Abhijñānaśākuntala | 192 | sa.wikisource |
| Gītagovinda | 272 | sa.wikisource |
| Lalitā Sahasranāma | 236 | sa.wikisource |
| Saundarya Laharī | 98 | sa.wikisource (page repeats numbers 10 and 21; the repeats are dropped — the importer's ref/chapter check can't carry variants) |
| Chāṇakya Nīti | 343 | sa.wikisource |
| Śiva Tāṇḍava Stotra | 16 | sa.wikisource |
| Sāmaveda (Kauthuma, sasvara) | 1,902 | sa.wikisource — accents removed per vedic policy; arika numbers restart per prapāthaka, stored as ordinals within the archika chapter (1.1–2.9); 1.4% over the traditional 1,875 |
| Suśruta Saṃhitā | 7,582 | sa.wikisource (line-numbered sutra format) |

Plus the 8 books already imported in earlier sessions (Gītā, Īśā, Aṣṭāvakra, Yoga Sūtra, Meghadūta, Nārada Bhakti, Rāmarakṣā, Āditya Hṛdayam, Bhaja Govindam, Māṇḍūkya).

**Tier decision:** every canon row whose source permits commercial use was flipped `plus → free` in `backend/app/seeds/canon.py` (docstring records the 2026-10-14 owner decision). No row is Plus now; `CANON_PLUS_GATE` stays off.

## 2. Where the data lives

- **Text → the production DB (Supabase Postgres**, reached via `DATABASE_URL` or the `shabd-database-url` gcloud secret — `backend/app/db.py`). Not R2; R2 stays audio-only.
- **Audio → Cloudflare R2** (chant pipeline; NOT run for these books — no TTS was done, `audio_url=""`).
- Local dev copy: `backend/app.db` (backup taken before import: `app.db.bak-20261014-corpus`).
- Raw source cache: `backend/results/imports/cache/`; payloads + per-book reports: `backend/results/imports/books/<slug>.payload.json|.report.json|.sources.json`.

## 3. How to resume / re-run

```bash
cd backend
# build one book (fetches are cached; never re-downloads)
PYTHONUTF8=1 ./.venv/Scripts/python.exe -m scripts.books.build --slug <slug>
# import into local SQLite
PYTHONUTF8=1 ./.venv/Scripts/python.exe -m scripts.import_text --file results/imports/books/<slug>.payload.json --live
# import into prod Supabase (backs up shlokas table first; dry-run without --live)
backend/.venv/Scripts/python.exe backend/scripts/prod_import.py --file results/imports/books/<slug>.payload.json --live
```

Canon rows sync from `app/seeds/canon.py` on every app boot (paged rows re-sync tier/licence/count), so the seed edits propagate to prod on next deploy.

## 4. Pipeline fixes made this run (scripts/books/)

All in `backend/scripts/books/` — keep these in mind when resuming:

- **clean.py**
  - ZWJ inside verse-end markers (`॥५॥` on Śiva Tāṇḍava) merged verses → zero-widths stripped before matching.
  - Vedic vowel-length markers inside words (`दा३`, ASCII `न्य3ऽ`, after anusvara `प्रतीव्यां३`, after avagraha `रथ्याऽ३`) removed.
  - Single-danda verse ends (`। १ ॥` opens every Bhāgavata adhyāya) and pipe markers (`|११ |` Vetāla, `॥ २५ |` rendered pages) now split.
  - Raghvaṃśa variant readings (`॥ १.३४* ॥`) are marked and dropped by the builder.
  - Speaker/heading/colophon drops extended (rājovāca-style lines, `राजाः:` labels, `(श्लोकः)` prefixes, `इति…काण्ड/वर्ग` colophons, `[स्वड 16…]` Sāmaveda annotation blocks, bare page-number lines, Bengali + Malayalam lines).
  - DCS `_` separator, udātta `ﾱ` halfwidth chars, English `(or …)` glosses, `--`/`!`/`;` noise, ASCII visarga colons (`कुशल:`), PUA chars (U+F131), braces, stray ASCII letters, `…`.
  - **Final catch-all in `verse_text`: keep only Devanagari + dandas + whitespace; everything else is noise.**
  - Same-text duplicate refs collapse in `_finalise_verses` (build.py); a genuine second verse with the same number keeps both rows as `ref.2` variants (Saundarya Laharī 10/21).
- **build.py**
  - DCS parser rewritten for BOTH export formats (`# sent_counter/subcounter` and the new packed `# sent_id = N_M`); verse number = ordinal within file.
  - Chapter rules: per-page (Śākuntala acts, Gītagovinda sargas, Vetāla tales, Śiva Purāṇa), from page title with the Skandha-10 pūrva/uttarārdha split (Bhāgavata), MP 81-93 → DM 1-13 remap, V.K chapters for Chāndogya/Bṛhadāraṇyaka.
  - Line-based splitters: Yajurveda kandikās, Suśruta sutras, Sāmaveda archika/prapāthaka sections, Lalitā shloka accumulation.
  - Chanakya `(N)` chapter lines + colophon `॥N॥` lines + प्रकीर्णक tail + the `पण्‚इतः` typo.
  - `prod_import.py` unchanged (backup → import → report).
- **fetch.py**: empty/error wiki parses raise instead of being cached (40 empty Yajurveda pages had been cached under ASCII-digit titles).
- **catalogue.py**: corrected page lists (Yajurveda Devanagari-digit titles, Devī Māhātmya series mix) and reference counts with dated notes (Tāṇḍava 16, Chanakya 343, Gītagovinda 272, Vetāla 2,610, Mahimna 37, Raghvaṃśa/Gates-off for Ṛgveda/Bhāgavata/Yajurveda/Śvetāśvatara).

## 5. NOT imported — resume here

These 7 build STOPPED with only residual page noise (counts are right or gated off; bad-char verses are what blocks):

| Book | Status when stopped | What's left |
|---|---|---|
| Mahimna (37) | 1 bad verse | The "॥ २५ \|"-style marker mid-verse still doesn't split (rendered page, number split from its dandas). Debug `wiki_rendered_newline_nums` splitting on this page. |
| Vetāla (2,610) | 4 bad verses | Unnumbered verse-end `। \|` markers merge neighbours; the digit chars ride along. Normalise `। \|` → `॥` in `split_numbered_verses`. |
| ~~Sāmaveda~~ | ✅ imported 2026-10-15 | The one bad verse was `अभ्यृ़३` — nukta (U+093C) added to the vowel-sign lookbehind in clean.py; built 1,902 and imported to local + prod. |
| Raghvaṃśa (1,678 vs 1,567) | 3 bad verses | Page numbers some verses "। । ३ २आ ।" (letter suffixes!). Decide: drop `आ`-suffixed markers as variants (extend the `*` rule) or renumber. 111 extra rows vs canonical — likely variants. |
| Bhāgavata (10,414) | 13 bad verses | Wikisource transcription is incomplete (~10.4k of 14,067; skandhas 10-11 short) — reference gate already off. Bad verses: stray leading `६ ॥` fragments + one `\`. Treat leading orphan markers as structural junk. |
| Śiva Purāṇa (28,481) | 20 bad verses | `chapter_per_page` + renumber works; blocks on `पतिः १ ॥`-style numbers (no opening danda → digit stays). Either accept (inverse-clean removes the digit) or add numberless-marker splitting. |
| Yajurveda (1,971) | 11 bad verses | `अध्यायः ३` adhyaya-header line + index lines land inside kandikā bodies (Devanagari-digit index "अग्न्याधानम् १ ८ …"). Drop Devanagari-index lines (ASCII ones already dropped); `ऽīडितः` Latin-i typo handled by inverse-clean. |

GRETIL (CC BY-NC-SA → excluded from this batch per the commercial-use rule): **Garuḍa Purāṇa, Arthaśāstra, Līlāvatī** (specs exist; Līlāvatī build 170/272 from the earlier session). Also parked: Kaṭha/Muṇḍaka *classic* completions (GRETIL-built payloads, never imported).

Mahābhārata/Rāmāyaṇa full texts: deliberate exclusion stands (`routers/canon.py` note — bulk Mahābhārata import forbidden on TTS cost; wikisource CC BY-SA would be the source when revisited).

## 6. Known trade-offs taken

- Ṛgveda rows are sentence-granular (DCS's export lost ṛc boundaries). Canonical refs would need sa.wikisource Ṛgveda (has proper markers) — a later swap.
- Drama/katha prose (Śākuntala, Vetāla, Suśruta) travels inside verse chunks where the source interleaves it; rows are numbered ordinals where the source restarts numbers.
- Suśruta carries ~7.6k rows because the page numbers every line (source edition structure).
- No Hindi anywhere in this batch (no clean open source exists — owner will OCR/scrape later; see `research/scripture-sources-survey.md`).
