# Reading shelf: 39 whole books and the Plus lock: handover

Written 2026-10-09 by Claude for the implementing agent (Muse Spark in opencode). You arrive with no
context, so this file carries all of it. Do the work in the order of section 10, run every check
yourself and put the outputs in your hand-back (section 14). Claude then re-runs them as an
independent check.

**What "verified" means here.** Every fact below says how it was checked: *run* (executed),
*read* (read in the code or at the source) or *not verified*. Do the same in your hand-back. The
owner treats an unverified claim stated as fact as a lie.

**Read first.** `HANDOVER.md` section 0 and `handover_ask_answers.md` section 0. Their rules apply
here and are repeated in section 0 below.

**The short version.**

1. 39 new books go on the Read shelf, whole. Each comes from a source whose licence is written down.
   36 of them come from sources that allow commercial use (Ambuda CC0 1.0, the Digital Corpus of
   Sanskrit CC BY 4.0, Sanskrit Wikisource CC BY-SA 4.0) and are **Plus** books. 3 of them
   (Garuḍa Purāṇa, Arthaśāstra, Līlāvatī) have only a non-commercial source and are **free**
   books (owner's rule, section 1).
2. The Plus lock is built now and switched **off** (`CANON_PLUS_GATE=false`). When the owner turns
   it on, a free learner reads the first chapter of each Plus book (a book with one chapter: its
   first 5 verses).
3. The reader today downloads every verse in one call. That cannot carry 60,000+ verses. New books
   are served one chapter at a time by two new endpoints. The 12 books already on the shelf keep
   their current path and behave exactly as today.
4. New books never feed the daily verse, the games or the graded reader.
5. Two existing free books are completed (Kaṭha, Muṇḍaka) and the Mahābhārata selections are taken
   again from a BORI source, because the 7 October import carries the wrong verse numbers.

---

## 0. Rules for this work

- **Don't commit, don't deploy, don't run an EAS build, don't run `eas update`, don't run
  `scripts/prod_import.py --live`.** The owner does all five. Leave the changes in the working tree.
- **Both directions keep working.** A phone already out (it calls `GET /shlokas` and `GET /canon`)
  must see exactly what it sees today when it talks to the new backend. The new phone must work
  against today's backend (it then shows the 12 old books only). Every new request parameter is
  optional; every new response field is read defensively.
- **Never write Sanskrit from memory.** Every verse comes from a named source file, fetched by code.
  Never type a verse, never "fix" a verse by hand, never fill a gap from memory or from a model. A
  gap is reported, not filled. Devanagari titles in section 4 were generated with `vidyut.lipi`
  (*run*); copy them, don't retype them.
- **Licences.** Every book records its source's licence verbatim (section 3). GRETIL,
  sanskritdocuments.org, TITUS, Muktabodha, Vedabase and any page without a licence are never a
  source for a Plus book. GRETIL may be used as a *measuring stick* (verse counts, numbering) for
  any book, and as the text source only for the 3 free books named in section 4.
- **Primary sources only.** No Wikipedia, blogs or search summaries for any fact. Sanskrit
  Wikisource is used here only as a transcription source with a stated licence, never as evidence.
- **Copy rule (UI).** No em dashes and no spaced en dashes in anything a user can read, including
  `accessibilityLabel`. No explanatory paragraphs in the UI. Server text shown as prose goes
  through `plain()` (`mobile/src/utils/text.ts`).
- **Look rule.** A coloured surface is a deep solid fill with cream text, never a pale tint. Plain
  content sits on the cream page with hairlines. No lists of rounded pills. 16dp side padding.
- **Accessibility.** Every `Pressable` has a role and a label, targets are at least 44dp, colour is
  never the only signal (a lock is an icon plus words), Sanskrit is never below 18pt (`sized()`),
  every animation has a Reduce Motion path.
- **No AI notes in the UI** (owner, 2026-10-03). No "written by AI" or similar text anywhere.
- **No audio on import.** Imported rows ship `audio_url == ""` (§6 of `LESSON_OVERHAUL.md`; the
  import test asserts it). Do not render TTS for any of these books.
- **Leave alone:** the Kāla screens, Ask, kundli and milan, `services/ask_sources.py` logic, the
  graded reader's choice of passages, the daily word.
- **Database safety.** Starting the real backend runs `run_seed()` and rewrites rows in
  `backend/app.db`. Before any live import: `cp backend/app.db backend/app.db.bak-20261009-books`
  (or a later date) and say so in the hand-back. Use `TestClient` with a temp `DB_PATH` for probes,
  the way `backend/tests/conftest.py` does.
- **Windows notes.** Run Python as `PYTHONUTF8=1 ./.venv/Scripts/python.exe` from `backend/` (the
  venv has Vidyut; the system Python does not). Python on Windows writes CRLF in text mode: open
  repo files with `newline=""`. Git Bash heredocs mangle backslashes: write scripts to a file and run
  the file.
- **Checks before hand-back:**
  - `cd backend && PYTHONUTF8=1 ./.venv/Scripts/python.exe -m pytest -q`
  - `cd mobile && npx tsc --noEmit`
  - `cd mobile && node scripts/check-contrast.mjs`, `node scripts/a11y-audit.js`,
    `node scripts/check-kala.mjs`, and the new `node scripts/check-paged.mjs` (section 7.8)

---

## 1. What the owner decided (2026-10-09)

Asked in chat on 2026-10-09; the answers are the owner's own.

| Question | Owner's answer |
|---|---|
| Which books | All the books Claude listed: the owner's list (Viṣṇu Sahasranāma, Bhāgavatam, Śiva Purāṇa, Garuḍa Purāṇa, the four Vedas, the Upaniṣads, Suśruta, Chāṇakya Nīti) plus Claude's additions. Vedic Maths and Bhaviṣya Mālikā are left out (below). |
| Paid or free | "If they allow commercial licenses, we put them inside the paid plan. If any book doesn't allow commercial one (search for the alternative now) and if you still don't find it, we keep it in free section." |
| When the lock turns on | When buying Plus works. Build the lock now behind a server switch that is off. |
| What a free learner reads of a Plus book | The first chapter of each book; a book with one chapter gives its first 5 verses. |
| The 12 books already on the shelf | Unchanged. The licence rule applies to new books only. |
| Big books | Whole texts, not selections. |

**Left out, with the reason** (from Claude's answer the same day, which the owner accepted):
- *Vedic Mathematics* (Bhāratī Kṛṣṇa Tīrtha, 1965): an English arithmetic book, not a Sanskrit
  text. Its own front matter (Manjula Trivedi's memoir, p. xxxv of the Motilal Banarsidass reprint
  on archive.org) says the sixteen formulas are "not to be found in the present recensions of
  Atharvaveda" [*read*]. Līlāvatī is on the list instead.
- *Bhaviṣya Mālikā*: written in Odia, not Sanskrit [*read*: an Odia printed copy on archive.org].

---

## 2. Where things stand

All of this was *run* or *read* on 2026-10-09 against the local tree and `backend/app.db`.

- **The corpus.** `shlokas` holds 1,395 rows, dates 2026-09-03 to 2030-07-08 [*run*]. The daily
  verse is the row whose `date` equals the learner's local day, else a deterministic cycle over
  all rows (`routers/shlokas.py`, `_select_shloka`) [*read*].
- **The reader.** `GET /shlokas` returns every row with its `word_breakdown` (about 1.25 KB a row
  locally) and the phone downloads all of it once (`mobile/src/screens/Reader.tsx`,
  `api.listShlokas`) [*read*, *run*]. Books are matched to rows by **substring** of
  `ref_prefixes`, on the server (`routers/canon.py`, `canon_report`) and on the phone
  (`mobile/src/utils/verses.ts`, `matchBook`) [*read*].
- **The canon.** `backend/app/seeds/canon.py` has 12 rows, all `tier: "free"`. `CanonText.tier`
  (`free|plus`) exists and nothing reads it for gating [*read*].
- **The paid plan.** `backend/app/services/entitlement.py` has the seam
  `has_entitlement(learner, feature, db)`, tiers `free|plus|institutional`, and no store wired, so
  every learner is free [*read*]. `"reader"` is in `ALWAYS_FREE`; that stays (it is the graded
  reader and the 12 old books).
- **The importer.** `backend/scripts/import_text.py`: dry-run by default, refuses a payload with
  no licence, dedupes by `source_ref` across the whole table, runs Vidyut on every verse, skips a
  verse with fewer than 2 confidently analysed words unless `--min-words 0`, and dates new rows one
  per day after the newest date [*read*].
- **Other code that reads every shloka row** [*read*]: `seeds/reader_passages.py:129` (graded
  reader tiers, at every boot), `services/games.py:58` (word pairs), `seeds/seed.py:336,352,360`
  (boot repairs), `services/ask_sources.py:212-215` (verse checks, cached by row count),
  `scripts/prod_import.py` (production import; its `FIELDS` list names the copied columns).
- **The Mahābhārata import of 2026-10-07 is mis-numbered.** `scripts/build_mahabharata_payload.py`
  (untracked) takes Udyoga 33–34 from sa.wikisource and labels them as BORI numbers. That
  sa.wikisource text is not the BORI edition: its Udyoga 33 runs to about 130 verses where BORI
  has 104, and its 5.33.101 is a different verse from BORI's 5.33.101 [*run*, against GRETIL's BORI
  e-text]. The 193 rows are in the local `app.db` (200 Mahābhārata rows) [*run*] and not in
  production (there is no `mahabharata.payload.prod-report.json`) [*read*]. A backup taken before
  that import exists: `backend/app.db.bak-20261007-mahabharata` [*read*]. Section 8.3 fixes it.
- **The licence registry** (`backend/app/seeds/licences.py`) lists `sa-wikisource` as CC BY-SA 3.0;
  the site states CC BY-SA 4.0 (API `meta=siteinfo&siprop=rightsinfo`) [*run*]. It lists `dcs` as
  CC BY 3.0; the DCS repository says CC BY 4.0 (`dcs/data/readme.md`,
  `dcs/data/conllu/readme.md`) [*read*]. Section 6.10 fixes both.
- **Alembic** has one head today, `d4e5f6a7b8ca` [*run*]. Migrations run at startup through
  `app/db.py` [*read*].
- **Backend tests touching this area:** `test_p21_canon.py`, `test_p21_import.py`,
  `test_shloka_reader.py`, `test_p14_entitlement.py`, `test_p22_vocab_reader.py` [*read*].

---

## 3. Sources and licences

### 3.1 The four sources

| Key | Source | Licence (where it is stated) | Used for |
|---|---|---|---|
| `ambuda` | Ambuda, `https://ambuda.org` | CC0 1.0. Stated per text in `https://ambuda.org/texts/downloads/metadata.json` (`"license": "CC0 1.0"`) and in each TEI header (`<availability>`: "Distributed by Ambuda under a Creative Commons CC0 1.0 Universal Licence (public domain)") [*read*] | 4 Plus books |
| `dcs` | Digital Corpus of Sanskrit (Oliver Hellwig), `https://github.com/OliverHellwig/sanskrit`, folder `dcs/data/conllu/files/` | CC BY 4.0, stated in `dcs/data/readme.md` and `dcs/data/conllu/readme.md`. Requested citation: "Oliver Hellwig: Digital Corpus of Sanskrit (DCS). 2010-2021." [*read*] | 10 Plus books, the Kaṭha completion, the Mahābhārata fix |
| `sa-wikisource` | Sanskrit Wikisource, `https://sa.wikisource.org` | CC BY-SA 4.0, stated by the site (`rightsinfo`) [*run*] | 23 Plus books, the Muṇḍaka completion |
| `gretil` | GRETIL, SUB Göttingen, `https://gretil.sub.uni-goettingen.de` | CC BY-NC-SA 4.0, stated in the header of every file opened (18 files) [*read*] | the 3 free books only |

**Never a text source:** sanskritdocuments.org (its files say "not to be copied or reposted for
promotion of any website or individuals or for commercial purpose without permission"; the
Chāṇakya file read 2026-10-09), TITUS, Muktabodha, Vedabase (BBT), wisdomlib, Gita Press PDFs,
archive.org OCR, any site that states no licence.

**Ambuda texts:** only those whose `metadata.json` entry says `"license": "CC0 1.0"`. Ambuda's
downloads page says some of its texts come from a GRETIL snapshot; 17 TEI headers carry GRETIL's
non-commercial statement [*run*]. Those are not usable for Plus, and none of them is used here.

### 3.2 Copies of non-commercial files

A page that says CC BY-SA but reproduces a GRETIL file cannot pass on a licence the file never
had. Two sa.wikisource texts show it, so they are treated as GRETIL texts (free shelf, text taken
from GRETIL directly):

- **Garuḍa Purāṇa.** The sa.wikisource chapter pages repeat GRETIL's own chapter header
  ("श्रीगरुडमहापुराणम् १०८" for GRETIL's "śrīgaruḍamahāpurāṇam- 108") and its reference format
  ("॥ १,१०८.१ ॥" for GRETIL's "garp_1,108.1") [*read*].
- **Arthaśāstra.** sa.wikisource's compound hyphens ("अर्थ-शास्त्राणि पूर्व-आचार्यैः") sit exactly
  where GRETIL's e-text puts its compound dots ("artha.śāstrāṇi pūrva.ācāryaiḥ"), with Kangle's
  numbering [*read*]. Both copies follow R. P. Kangle's edition (University of Bombay, 2nd ed.
  1969, per GRETIL's header) [*read*].

Weaker signs, left for the owner (section 13): sa.wikisource's Amarakośa uses the same half-line
numbering as GRETIL's copy ("1.0.1"), and its Devī Māhātmya uses chapter.verse numbering like
GRETIL's with a note "81(78)" that matches GRETIL's count for chapter 81 [*read*]. These two stay
Plus on the stated licence.

### 3.3 What each licence asks of the app

- **CC BY 4.0 and CC BY-SA 4.0:** credit the source, name the licence, link it, and say what was
  changed. The licences screen (registry rows, section 6.10) and the per-book licence string carry
  this. For CC BY-SA the changed text is itself CC BY-SA 4.0. Both licences forbid adding terms
  that stop a recipient from reusing the text ("No downstream restrictions", CC BY-SA 4.0 legal
  code section 2(a)(5)) [*read*]: do not add any app term that forbids copying these verses. The
  Plus lock decides who receives a chapter; it is not a term on what a reader may do with it.
- **CC0 1.0:** nothing is required. Credit Ambuda anyway.
- **CC BY-NC-SA 4.0 (GRETIL):** credit, licence, share-alike, and non-commercial. The owner's rule
  puts these books on the free shelf. Section 13 notes the remaining risk for the owner.

### 3.4 The licence string each book carries

`CanonText.licence` and the payload's `licence` are the same verbatim string. Use these templates,
filled in by the builder (section 5):

- sa.wikisource: `Text: public domain (ancient); transcription: sa.wikisource.org, pages "<first page title>" and <n> more, revisions recorded in results/imports/books/<slug>.sources.json (CC BY-SA 4.0), accessed <YYYY-MM-DD>. Changes: wiki markup removed, verses split and numbered as described in handover_reading_shelf.md[; Vedic accent marks removed].`
- DCS: `Text: public domain (ancient); text: Digital Corpus of Sanskrit, Oliver Hellwig (github.com/OliverHellwig/sanskrit, dcs/data/conllu/files/<Text>), CC BY 4.0, accessed <YYYY-MM-DD>. Changes: IAST converted to Devanagari with vidyut.lipi; half-verses joined.`
- Ambuda: `Text: public domain (ancient); text: Ambuda (ambuda.org/texts/<slug>), CC0 1.0, <edition from the TEI sourceDesc if any>, accessed <YYYY-MM-DD>.`
- GRETIL: `Text: public domain (ancient); transcription: GRETIL <file name>, <edition from its header>, CC BY-NC-SA 4.0 (non-commercial), accessed <YYYY-MM-DD>. Free shelf only.`

---

## 4. The books

Every new book is a **paged** book (section 6): `paged: true`, `depth: "full"`, `in_daily: false`
on its rows, and one `ref` name that starts every `source_ref` (the ref name is also the single
entry of `ref_prefixes`). `register` is `vedic` for the Saṃhitās and Upaniṣads and `classical`
for everything else. `study_order` runs 13 to 51 in the order of the tables.

A **ref** is `<ref name> <n>[.<n>]*` with ASCII digits. The **chapter** of a ref is every number
but the last, joined by "." (a one-number ref has chapter ""). Reference counts are measuring
sticks: *run* = counted on 2026-10-09 from the file named.

### 4.1 Stotras and short works (Plus)

| slug | title_en | title_sa | ref name | source | chapters | reference count |
|---|---|---|---|---|---|---|
| vishnusahasranama | Viṣṇu Sahasranāma | विष्णुसहस्रनामस्तोत्रम् | Viṣṇu Sahasranāma | sa.wikisource `विष्णुसहस्रनामस्तोत्रम्‌` (the title ends in U+200C) | one per section with numbered verses, in page order: मूलपाठः=1, अथ ध्यानम्=2, स्तोत्रम्‌=3, उत्तरन्यासः=4, उपसंहारश्लोकाः=5, पर्यायोपसंहारश्लोकाः=6; skip the न्यास sections (prose) and सम्बद्धानुबन्धाः | 170 numbered verse ends on the page [*run*]; the names section starts "विश्वं विष्णुर्वषट्कारो" [*read*] |
| lalita | Lalitā Sahasranāma | ललितासहस्रनामस्तोत्रम् | Lalitā Sahasranāma | sa.wikisource `ललितासहस्रनामस्तोत्रम्` | 1 = section "॥ पूर्वभागः ॥"; 2 = section "श्री ललितासहस्रनामस्तोत्रम्" (its dhyāna verses, then the names from "ॐ श्रीमाता श्रीमहाराज्ञी") | none: the page has no verse numbers [*run*]; number verses 1..n per chapter in page order and report n |
| bhajagovindam | Bhaja Govindam | भजगोविन्दम् | Bhaja Govindam | Ambuda `mohamudgara` (Works of Sri Sankaracharya vol. 18, Sri Vani Vilas Press 1910) | one | 31 `<lg>` verses [*run*] |
| saundarya | Saundarya Laharī | सौन्दर्यलहरी | Saundarya Laharī | sa.wikisource `सौन्दर्यलहरी` (a transclusion: read the rendered text, section 5.3) | one | 100 expected; 95 numbered ends found in the rendered page [*run*]; GRETIL has 103 [*run*] |
| aditya | Āditya Hṛdayam | आदित्यहृदयम् | Āditya Hṛdayam | Ambuda `adityahrdayam` | one | 31 [*run*]. Not in the critical Rāmāyaṇa (searched GRETIL's by name and first line) [*run*]: never label it with a Rāmāyaṇa number |
| tandava | Śiva Tāṇḍava Stotra | शिवताण्डवस्तोत्रम् | Śiva Tāṇḍava Stotra | sa.wikisource `शिवताण्डवस्तोत्रम्` | one | 13 numbered ends before removing U+200D [*run*]; report the count after cleaning |
| mahimna | Śiva Mahimna Stotra | शिवमहिम्नःस्तोत्रम् | Śiva Mahimna Stotra | sa.wikisource `शिवमहिम्नःस्तोत्रम्` (transclusion of Bṛhat Stotra Ratnākara, 1953 print: rendered text) | one | verse ends look like "॥ १" with no closing mark [*run*]; GRETIL's critical text has 31 [*run*], the printed popular version is longer: report |
| ramaraksha | Rāmarakṣā Stotra | रामरक्षास्तोत्रम् | Rāmarakṣā Stotra | Ambuda `ramarakshastotram` | one | 38 numbered verses [*run*]; the unnumbered viniyoga and dhyāna passages are left out |
| naradabhakti | Nārada Bhakti Sūtra | नारदभक्तिसूत्रम् | Nārada Bhakti Sūtra | sa.wikisource `नारदभक्तिसूत्रम्` | one | 84 [*run*] |

### 4.2 Purāṇas and the Devī Māhātmya

| slug | title_en | title_sa | ref name | source | tier | chapters | reference count |
|---|---|---|---|---|---|---|---|
| devimahatmya | Devī Māhātmya | देवीमाहात्म्यम् | Devī Māhātmya | sa.wikisource Mārkaṇḍeya Purāṇa chapters 81–93 (pages `मार्कण्डेयपुराणम्/अध्यायः ८१` and the range pages `…/अध्यायः ८१-९०`, `…/अध्यायः ९१-९३`; take each chapter once) | plus | chapter = MkP chapter minus 80 (1..13); verse = the page's number after the "." in "॥ ८१.१ ॥" | 587 verses, by chapter 78, 70, 44, 38, 79, 19, 26, 61, 39, 27, 51, 38, 17 (GRETIL `sa_mArkaNDeyapurANa1-93`) [*run*]; first verse "सावर्णिः सूर्यतनयो" [*read*] |
| bhagavata | Bhāgavata Purāṇa | श्रीमद्भागवतपुराणम् | Bhāgavata Purāṇa | sa.wikisource `श्रीमद्भागवतपुराणम्/स्कन्धः S/अध्यायः C`; skandha 10 is split into `/स्कन्धः १०/पूर्वार्धः/अध्यायः C` and `/उत्तरार्धः/अध्यायः C`; skip the two māhātmya page sets | plus | S.C | 335 chapters (skandhas 19, 10, 33, 31, 26, 19, 15, 24, 24, 90, 31, 13) and 14,067 verses (GRETIL `sa_bhAgavatapurANa`) [*run*]; sa.wikisource has all 335 chapter pages [*run*]. Spot checks: 2.9.32 "अहमेवासमेवाग्रे", 8.3.2 "ॐ नमो भगवते तस्मै", 10.31.1 "जयति तेऽधिकं" [*run* in GRETIL] |
| shivapurana | Śiva Purāṇa | शिवपुराणम् | Śiva Purāṇa | sa.wikisource, pages under `शिवपुराणम्/संहिता N (...)/` (and `/खण्डः K (...)/` for the Rudra Saṃhitā, `/पूर्व भागः/` and `/उत्तर भागः/` for the Vāyavīya) | plus | N.C for saṃhitās 1, 3, 4, 5, 6; 2.K.C for the Rudra Saṃhitā; 7.B.C for the Vāyavīya (B=1 pūrva, 2 uttara) | Vidyeśvara Saṃhitā: 25 chapters, 1,539 verses (GRETIL book 1) [*run*]. Chapter pages found per part [*run*]: Vidyeśvara 29, Sṛṣṭi 25, Satī 43, Pārvatī 55, Kumāra 20, Yuddha 61, Śatarudra 42, Koṭirudra 47, Umā 51, Kailāsa 23, Vāyavīya 35 + 41. Some are duplicates: reconcile each part against its index page (`विषयानुक्रमणिका`) and report |
| garuda | Garuḍa Purāṇa | गरुडपुराणम् | Garuḍa Purāṇa | **GRETIL** `sa_garuDapurANa` (section 3.2) | **free** | P.C (P=1 Ācāra, 2 Preta or Dharma, 3 Brahma or Mokṣa) | 317 chapters (239, 49, 29) and 11,957 verses [*run*]; first chapter of the Nītisāra is 1.108, "नीतिसारं प्रवक्ष्यामि" [*run*] |

### 4.3 Vedas (Plus, register `vedic`, accents removed)

| slug | title_en | title_sa | ref name | source | chapters | reference count |
|---|---|---|---|---|---|---|
| rigveda | Ṛgveda | ऋग्वेदः | Ṛgveda | DCS `Ṛgveda` | M.S (maṇḍala.sūkta) | 1,028 sūktas (191, 43, 62, 58, 87, 75, 104, 103, 114, 191) and 10,552 verses (GRETIL Aufrecht) [*run*]; DCS has all 1,028 sūkta files [*run*]. Spot checks: 3.62.10 "तत्सवितुर्वरेण्यं", 7.59.12 "त्र्यम्बकं यजामहे", 10.90.1 "सहस्रशीर्षा पुरुषः", 10.129.1 "नासदासीन्नो सदासीत्", 10.191.2 "सं गच्छध्वं" [*run* in GRETIL] |
| samaveda | Sāmaveda | सामवेदः | Sāmaveda | sa.wikisource `सामवेदः/कौथुमीया/संहिता/सस्वरा पूर्णा` (one page, 213,906 characters, 10,513 accent marks) [*run*] | 1.P for the Pūrvārcika prapāṭhakas, 2.P for the Uttarārcika prapāṭhakas; verse = running number (section 5.4) | Pūrvārcika runs 1 to 650 [*run*]; the Uttarārcika headers give running ranges, the first "2.1.1 (651 - 712)" [*run*]. Count GRETIL `sa_sAmavedasaMhitA` and report both |
| yajurveda | Śukla Yajurveda (Vājasaneyi Mādhyandina) | शुक्लयजुर्वेदः | Śukla Yajurveda | sa.wikisource `शुक्लयजुर्वेदः/अध्यायः ०१` … `४०` | A (adhyāya); verse = the "A.M" number line before each mantra | 40 adhyāya pages [*run*]; 16.1 "नमस् ते रुद्र मन्यव" [*read*]. Count GRETIL's Vājasaneyi Saṃhitā (find the link in `gretil.html`) and report |
| atharvaveda | Atharvaveda (Śaunaka) | अथर्ववेदः | Atharvaveda | DCS `Atharvaveda (Śaunaka)` for kāṇḍas 1–18, sa.wikisource `अथर्ववेदः/अथर्ववेद: काण्डं 19` and `… काण्डं 20` for 19–20 | K.S | DCS has kāṇḍas 1–18 complete (519 sūktas) and only 3 sūktas of 19 [*run*]; sa.wikisource kāṇḍa 19 has 449 and kāṇḍa 20 has 958 numbered verse ends [*run*]; GRETIL Śaunaka: 20 kāṇḍas, 724 sūktas, 5,650 verse refs [*run*] |

### 4.4 Upaniṣads (Plus, register `vedic`)

| slug | title_en | title_sa | ref name | source | chapters | reference count |
|---|---|---|---|---|---|---|
| kena | Kena Upaniṣad | केनोपनिषद् | Kena Upaniṣad | sa.wikisource `केनोपनिषत्` | K (khaṇḍa) | 35 numbered ends on the page [*run*] |
| prashna | Praśna Upaniṣad | प्रश्नोपनिषद् | Praśna Upaniṣad | sa.wikisource `प्रश्नोपनिषत्/प्रथमः प्रश्नः` … `षष्ठः प्रश्नः` | P | 1st 16, 2nd 13 numbered [*run*]; count the rest |
| mandukya | Māṇḍūkya Upaniṣad | माण्डूक्योपनिषद् | Māṇḍūkya Upaniṣad | Ambuda `mandukyopanishat` (Īśādi viṃśottaraśatopaniṣadaḥ, ed. Nārāyaṇa Rāma Ācārya, Nirṇayasāgara 1948) | one | 12 mantras `<p n="1">`…`<p n="12">` [*run*]; leave out the śānti `<p n="p1">` |
| taittiriya | Taittirīya Upaniṣad | तैत्तिरीयोपनिषद् | Taittirīya Upaniṣad | DCS `Taittirīyopaniṣad` | V.A (vallī.anuvāka) | 31 anuvākas (12, 9, 10) [*run*] |
| aitareya | Aitareya Upaniṣad | ऐतरेयोपनिषद् | Aitareya Upaniṣad | DCS `Aitareyopaniṣad` | A.K | 13 sections [*run*] |
| shvetashvatara | Śvetāśvatara Upaniṣad | श्वेताश्वतरोपनिषद् | Śvetāśvatara Upaniṣad | DCS `Śvetāśvataropaniṣad` | A | 6 adhyāyas [*run*] |
| chandogya | Chāndogya Upaniṣad | छान्दोग्योपनिषद् | Chāndogya Upaniṣad | DCS `Chāndogyopaniṣad` | P.K | 153 khaṇḍa files [*run*]; report any missing khaṇḍa |
| brihadaranyaka | Bṛhadāraṇyaka Upaniṣad | बृहदारण्यकोपनिषद् | Bṛhadāraṇyaka Upaniṣad | DCS `Bṛhadāraṇyakopaniṣad` | A.B | 47 brāhmaṇas [*run*] |

The local table already has one seed row each called "Taittirīya Upaniṣad …" and "Bṛhadāraṇyaka
Upaniṣad …" (classic daily verses) [*run*]. They stay; section 6.3 keeps a paged import from
treating them as duplicates.

### 4.5 Poetry, drama and stories (Plus)

| slug | title_en | title_sa | ref name | source | chapters | reference count |
|---|---|---|---|---|---|---|
| meghaduta | Meghadūta | मेघदूतम् | Meghadūta | DCS `Meghadūta` | 1 = Pūrvamegha, 2 = Uttaramegha | 67 + 55 = 122 [*run*]; 1.1 "कश्चित्कान्ताविरहगुरुणा" [*read*] |
| kumarasambhava | Kumārasambhava | कुमारसम्भवम् | Kumārasambhava | DCS `Kumārasaṃbhava` (cantos 1–8, Kālidāsa's own; the later cantos 9–17 are left out) | C | 613 (60, 64, 76, 46, 86, 95, 95, 91) (GRETIL) [*run*] |
| raghuvamsha | Raghuvaṃśa | रघुवंशम् | Raghuvaṃśa | sa.wikisource `रघुवंशम्/<ordinal> सर्गः` (19 pages; ignore the misspelt duplicates `अष्ठमः` and `अष्ठादशः`) | C | 1,567 (95, 75, 70, 87, 76, 86, 71, 95, 82, 87, 93, 104, 79, 87, 103, 86, 81, 53, 57) (GRETIL) [*run*]; 8.1 "अथ तस्य विवाहकौतुकं" [*read*] |
| shakuntala | Abhijñānaśākuntala (verses) | अभिज्ञानशाकुन्तलम् | Abhijñānaśākuntala | sa.wikisource `अभिज्ञानशाकुन्तलम्/प्रथमोऽङ्कः` … `सप्तमोऽङ्कः` | A (act) | the play's numbered verses only (prose and Prakrit dialogue left out): 194 (31, 18, 25, 22, 31, 32, 35) (GRETIL) [*run*]; sa.wikisource act 1 has 31 and act 4 has 22 [*run*] |
| gitagovinda | Gītagovinda | गीतगोविन्दम् | Gītagovinda | sa.wikisource `गीतगोविन्दम्/<sarga page>` (12 pages linked from `गीतगोविन्दम्`) | S (sarga) | GRETIL counts 264 units in 12 sargas [*run*]; sa.wikisource sarga 1 has 51 and sarga 2 has 20 numbered ends [*run*]: the two count song stanzas differently, report both |
| vetala | Vetāla Pañcaviṃśati (Somadeva) | वेतालपञ्चविंशतिः | Vetāla Pañcaviṃśati | sa.wikisource `वेतालपञ्चविंशति 00` … `25` (Kathāsaritsāgara 12.8–32) | T (story 0–25; 0 is the frame story) | GRETIL's Kathāsaritsāgara Vetāla file: 26 taraṅgas, 2,175 verses [*run*]. The page numbers verses two ways ("।। ५९" and "12.8.६०") [*run*]: take the last number |

### 4.6 Yoga, Āyurveda, śāstra and wisdom

| slug | title_en | title_sa | ref name | source | tier | chapters | reference count |
|---|---|---|---|---|---|---|---|
| yogasutra | Yoga Sūtra | योगसूत्रम् | Yoga Sūtra | sa.wikisource `योगसूत्रम्/पादः १` … `४` | plus | P | 195 (51, 55, 55, 34) (GRETIL) [*run*]; pāda 1 has 51 on the page; pādas 2–4 end with "।। २.१ ।।" [*run*]; 1.2 "योगश्चित्तवृत्तिनिरोधः" [*read*] |
| hathayoga | Haṭhayogapradīpikā | हठयोगप्रदीपिका | Haṭhayogapradīpikā | DCS `Haṭhayogapradīpikā` (4 upadeśas) | plus | U | 392 (70, 78, 130, 114) (GRETIL) [*run*] |
| ashtavakra | Aṣṭāvakra Gītā | अष्टावक्रगीता | Aṣṭāvakra Gītā | sa.wikisource `अष्टावक्रगीता` (one page, numbers "॥१- १॥") | plus | C | 298 in 20 chapters (GRETIL and the page agree) [*run*] |
| sushruta | Suśruta Saṃhitā | सुश्रुतसंहिता | Suśruta Saṃhitā | sa.wikisource pages under `सुश्रुतसंहिता/` (section 5.4 lists the non-overlapping set) | plus | T.C (T: 1 Sūtra, 2 Nidāna, 3 Śārīra, 4 Cikitsā, 5 Kalpa, 6 Uttara) | 186 chapters: 46, 16, 10, 40, 8, 66 (DCS chapter list) [*run*]. DCS is complete by chapter but not by verse (its Sū. 16 stops before the nose passage) [*run*], so DCS is the measuring stick, not the text |
| arthashastra | Arthaśāstra | अर्थशास्त्रम् | Arthaśāstra | **GRETIL** `sa_kauTilya-arthazAstra` (Kangle 1969, section 3.2) | **free** | B.C | count its references and report; Kangle has 15 books [*not verified*] |
| lilavati | Līlāvatī | लीलावती | Līlāvatī | **GRETIL** `sa_bhAskara-lIlAvatI` | **free** | one (number = GRETIL's `Lil_N`) | 272 (GRETIL) [*run*]. sa.wikisource's copy is raw OCR of a 1938 edition mixed with the editor's notes and later verses [*read*]: unusable |
| amarakosha | Amarakośa | अमरकोशः | Amarakośa | sa.wikisource `अमरकोशः/प्रथमकाण्डम्`, `/द्वितीयकाण्डम्`, `/तृतीयकाण्डम्` | plus | K.V (kāṇḍa.varga); the verse number is the half-line number | 3,134 half-lines (608, 1,494, 1,032) (GRETIL) [*run*]; sa.wikisource kāṇḍa 1 has 608 and kāṇḍa 3 has 1,031 [*run*] |
| chanakya | Chāṇakya Nīti | चाणक्यनीतिदर्पणः | Chāṇakya Nīti | sa.wikisource `चाणक्यनीतिदर्पणः` (all 17 chapters; **not** the page `चाणक्यनीतिः`, which stops at chapter 15) | plus | C | 345 verses in 17 chapters (17, 20, 22, 20, 24, 22, 21, 23, 14, 20, 18, 23, 20, 20, 19, 20, 22) by sanskritdocuments' numbering, used only as a count [*run*]; the page has 361 numbered ends including chapter-end markers [*run*]; 17.1 "पुस्तकप्रत्ययाधीतं" [*read*] |

### 4.7 Rails on the shelf

`mobile/src/hooks/useReaderBooks.ts`, `RAILS`. Keep the three existing rails as they are and add:

| Rail title | slugs |
|---|---|
| Vedas | rigveda, samaveda, yajurveda, atharvaveda |
| Upaniṣads | kena, prashna, mandukya, taittiriya, aitareya, shvetashvatara, chandogya, brihadaranyaka |
| Purāṇas | bhagavata, shivapurana, garuda, devimahatmya |
| Stotras | vishnusahasranama, lalita, bhajagovindam, saundarya, aditya, tandava, mahimna, ramaraksha, naradabhakti |
| Poetry and drama | meghaduta, kumarasambhava, raghuvamsha, shakuntala, gitagovinda |
| Yoga, Āyurveda and śāstra | yogasutra, hathayoga, ashtavakra, sushruta, arthashastra, lilavati, amarakosha |

Add `vetala` and `chanakya` to the end of the existing "Stories and wisdom" rail.

---

## 5. Building the payloads

Nothing in this section writes to the database. Each book becomes one file,
`backend/results/imports/books/<slug>.payload.json`, plus `<slug>.report.json` (coverage) and
`<slug>.sources.json` (pages, revisions, URLs). `results/` is git-ignored [*read*].

### 5.1 Files to create

```
backend/scripts/books/__init__.py
backend/scripts/books/fetch.py      # the four fetchers, all cached
backend/scripts/books/clean.py      # text cleaning and verse splitting (pure functions)
backend/scripts/books/catalogue.py  # one entry per book: the tables in section 4 as data
backend/scripts/books/build.py      # python -m scripts.books.build --slug X | --all
backend/tests/test_book_builders.py # unit tests for clean.py and the DCS/Ambuda parsers
```

Run from `backend/`: `PYTHONUTF8=1 ./.venv/Scripts/python.exe -m scripts.books.build --slug yogasutra`.

### 5.2 Fetching

- **Cache everything** under `backend/results/imports/cache/<source>/`. A cached response is never
  fetched again. Write the raw response, not a cleaned one.
- **sa.wikisource:** `https://sa.wikisource.org/w/api.php`. Page lists:
  `action=query&list=allpages&apprefix=<prefix>&aplimit=500&apnamespace=0` (follow `continue`).
  Page text: `action=parse&page=<title>&prop=wikitext|revid&redirects=1&format=json`. Pages that
  are a `<pages index=… />` transclusion (Saundarya Laharī, Śiva Mahimna) have no verses in their
  wikitext: use `prop=text` (rendered HTML) and strip the HTML. Wait 4 seconds between calls. On
  HTTP 429 wait 20, 40, then 60 seconds; after that stop and report. The API answered 429 after
  about ten quick calls on 2026-10-09 [*run*]. Send the User-Agent the existing builder uses:
  `SanskritamBot/1.0 (reader corpus builder; contact: dev@sanskritam.example)`. Record each page's
  `revid` in `<slug>.sources.json`.
- **DCS:** list a text's files with the git trees API, because the contents API stops at 1,000
  entries [*run*]: `GET https://api.github.com/repos/OliverHellwig/sanskrit/contents/dcs/data/conllu`
  gives the sha of `files`; `GET …/git/trees/<that sha>` gives each text's sha; `GET …/git/trees/<text sha>`
  lists its files. Download
  `https://raw.githubusercontent.com/OliverHellwig/sanskrit/master/dcs/data/conllu/files/<Text>/<file>`
  (URL-encode the path). Use only files ending `.conllu`; skip `.conllu_parsed` duplicates.
- **Ambuda:** `https://ambuda.org/texts/downloads/<slug>.xml` (TEI). The `.txt` URL is 404 for
  some texts [*run*]. Check `"license": "CC0 1.0"` for the slug in
  `https://ambuda.org/texts/downloads/metadata.json` before use; stop if it is anything else.
- **GRETIL:** `https://gretil.sub.uni-goettingen.de/gretil/corpustei/transformations/plaintext/<name>.txt`
  (https works, no robots file needed) [*run*].

### 5.3 Cleaning (one function, `clean.verse_text`)

Apply in this order to every verse, whatever the source:

1. Unicode NFC.
2. Remove wiki markup: `{{…}}` templates, `[[File:…]]`, `[[a|b]]` → `b`, `[[a]]` → `a`, `<ref>…</ref>`,
   every HTML tag (`<poem>`, `<span …>`, `<br>`, `<BR>`), `'''`, `''`, and `:`/`;`/`*`/`#` at the
   start of a line.
3. Remove U+200C and U+200D (both appear in these pages [*run*]).
4. Drop any line that contains a Bengali-script character (U+0980–U+09FF): the Chāṇakya page
   repeats its titles in Bengali [*run*].
5. Vedic marks (Sāmaveda, Yajurveda and any page that has them): replace U+A8F3 (ꣳ) with U+0902
   (ं); then delete U+0951–U+0954, U+1CD0–U+1CFF and U+A8E0–U+A8F2. Say "Vedic accent marks
   removed" in the book's licence string (section 3.4) and keep the raw page in the cache so a
   later pass can add accents back.
6. Turn "।।" into "॥". Turn "| " used as a danda into "।" only when the source uses it that way
   (GRETIL uses "/" and "//": turn " / " into " । " and " // " into " ॥ ").
7. Collapse whitespace; keep one line break between half-verses; put " ॥" at the end if the verse
   has none.

After cleaning, a verse may contain only: Devanagari letters and signs U+0900–U+097F except the
Devanagari digits, U+0964 and U+0965 (dandas), U+093D (avagraha), spaces and line breaks. Strip
the verse number off the end before this check. **Anything else stops the build for that book**
and the report lists the first 20 offending verses: Latin letters, "{", "|", "<", "=", "(", ")",
"[", stray digits, Bengali.

### 5.4 Splitting into verses, per source

- **sa.wikisource and GRETIL pages (numbered verses).** A verse ends at a verse number: "॥"
  followed by a number and "॥" (or a newline for Śiva Mahimna). The number may be Devanagari or
  ASCII and may be "१", "१.२", "८१.१", "१,१०८.१", "१- १", "12.8.६०". The verse's own number is the
  **last** component. The text since the previous verse end is the verse. A "॥" with no number
  inside a verse is a half-verse end and stays in the verse. Drop a line before the verse that is
  only a speaker ("… उवाच", "… ऊचुः", with or without "।" or "—"), only a heading ("॥ अथ … ॥",
  "… अध्यायः", "… सर्गः"), or a colophon ("इति … सम्पूर्णम्", "इति श्री…").
- **Unnumbered pages** (Lalitā). Split at every "॥" after cleaning; number 1..n in each chapter.
- **DCS (`.conllu`).** Read the `# text = …` lines with their `# sent_counter = N` and
  `# sent_subcounter = M`. All lines with the same N are one verse, in M order: join them with
  " । " and end with " ॥". The verse number is N [*run*: Meghadūta and Kaṭha use subcounter 1 and
  2 for the two halves of a verse]. Turn IAST into Devanagari with
  `vidyut.lipi.transliterate(text, Scheme.Iast, Scheme.Devanagari)`; check that "'" became "ऽ".
  The chapter numbers come from the file name's citation (`Su, Sū., 16`, `ṚV, 3, 62`,
  `MBh, 5, 33`).
- **Ambuda TEI.** `<lg n="N">`: join its `<l>` lines with line breaks. `<p n="N">`: one verse.
  Skip elements whose `n` is not a number (titles, the śānti `p1`).
- **Sāmaveda (one page).** The Pūrvārcika numbers verses 1 to 650 directly ("।।649", "।।650")
  [*run*]. Each Uttarārcika section header gives its running range, the first being
  "2.1.1 (651 - 712)", and the verses inside count from 1 ("।।1 ।।") [*run*]: running number =
  range start − 1 + n. Remove the group markers such as "1(ती)।।". The chapter is the prapāṭhaka
  ("1.P" or "2.P") from the header labels ("पूर्वार्चिकः/…/1.1.1 प्रथमप्रपाठकः",
  "उत्तरार्चिकः/प्रथमप्रपाठकः/…"). If the running numbers are not 1..N with no gaps and no
  repeats, stop and report.
- **Śukla Yajurveda.** Each mantra is preceded by its own line "A.M" in ASCII ("16.1") [*run*].
- **Suśruta Saṃhitā.** Use exactly these pages [*run*: the page list has overlapping duplicates]:
  `सूत्रस्थानम्/अध्याय ०१-१५`, `सूत्रस्थानम्/अध्याय १६-३०`, `सूत्रस्थानम्/अध्याय ३१-४६`,
  `निदानस्थानम्`, `शारीरस्थानम्`, `चिकित्सास्थानम्/अध्याय ०१-२०`, `चिकित्सास्थानम्/अध्याय २१-४०`,
  `कल्पस्थानम्`, `उत्तरतन्त्रम्/अध्याय ०१-२०`, `उत्तरतन्त्रम्/अध्याय २१-४०`,
  `उत्तरतन्त्रम्/अध्याय ४१-६६` (all under `सुश्रुतसंहिता/`). Chapters start at a heading line
  ";प्रथमोऽध्यायः", "===प्रथमोऽध्यायः===", ";षोडशोऽध्यायः" and so on; lines are ":text N" with the
  sentence number at the end [*run*]. If a sthāna's chapter count is not the DCS count (46, 16, 10,
  40, 8, 66), stop and report which chapters are missing; do not fill them from DCS.
- **Viṣṇu Sahasranāma.** Chapters are the page's `== … ==` sections listed in 4.1; numbers restart
  in every section [*run*], which is why each section is its own chapter.

### 5.5 The payload

Same shape as today's payloads, plus three keys:

```json
{
  "book": "yogasutra",
  "daily": false,
  "licence": "<the string from 3.4>",
  "source": "Yoga Sūtra (sa.wikisource.org, CC BY-SA 4.0)",
  "register": "classical",
  "verses": [
    {"ref": "Yoga Sūtra 1.1", "chapter": "1", "devanagari": "अथ योगानुशासनम् ॥", "translation_hi": "", "translation_en": ""}
  ]
}
```

Verses are in reading order (chapter order, then verse order). Translations stay empty: meanings
are written once on demand by the existing `GET /shlokas/{id}/meaning`.

### 5.6 The coverage report (`<slug>.report.json`) and when to stop

For every book the builder writes: verses per chapter, the reference count per chapter where
section 4 has one, the differences, missing and repeated verse numbers, verses that failed the
character check, what was left out (prose sections, colophons, viniyoga) and the pages or files
used. Then:

- **Stop that book** (no payload) when: the character check fails; a ref repeats; a chapter is
  missing against section 4; or the total differs from the reference by more than 2%. Put it in
  the hand-back with the report.
- **Carry on** with a difference of 2% or less, and list it.
- Never fill a gap from another source or by hand. A second source for missing verses is the
  owner's decision.

---

## 6. Backend

### 6.1 Migration

New file in `backend/migrations/versions/`, one new 12-hex revision id (grep that it is unused),
`down_revision` = the single head (`alembic heads`; `d4e5f6a7b8ca` on 2026-10-09). Follow the
pattern of `e4f5a6b7c8d9_reader_translations.py`.

```python
op.add_column("shlokas", sa.Column("book", sa.String(64), nullable=True))
op.add_column("shlokas", sa.Column("chapter", sa.String(64), nullable=False, server_default=""))
op.add_column("shlokas", sa.Column("seq", sa.Integer(), nullable=False, server_default="0"))
op.add_column("shlokas", sa.Column("in_daily", sa.Boolean(), nullable=False, server_default=sa.true()))
op.create_index("ix_shlokas_book_chapter_seq", "shlokas", ["book", "chapter", "seq"])
op.add_column("canon_texts", sa.Column("paged", sa.Boolean(), nullable=False, server_default=sa.false()))
```

`downgrade()` drops the index and the five columns. Check that a fresh database upgrades from
empty, that today's `app.db` (copied to a temp path) upgrades, and that `alembic heads` shows one
head. PostgreSQL is not available here: say "not run on PostgreSQL" in the hand-back.

### 6.2 Models (`backend/app/models.py`)

`Shloka`: `book` (String 64, nullable), `chapter` (String 64, default ""), `seq` (Integer, default
0), `in_daily` (Boolean, default True), with the same server defaults as the migration.
`CanonText`: `paged` (Boolean, default False). Update both docstrings: a paged book's rows have
`book` = its slug and `in_daily` = False; its verses are served by chapter (section 6.6), never
by `GET /shlokas`. Update `CanonText`'s "Everything reads FREE" sentence: tier `plus` books lock
behind `CANON_PLUS_GATE` (owner, 2026-10-09).

### 6.3 Importer (`backend/scripts/import_text.py`)

Classic payloads (no `book` key) behave exactly as today, and their rows get `in_daily=True`. A
payload with `book` is a paged import:

1. Refuse unless `book` is a slug in `app.seeds.canon.CANON_TEXTS` with `"paged": True`.
2. Refuse unless `daily` is present and `false`.
3. Refuse the whole payload if any verse's `ref` does not start with the book's ref name plus a
   space, does not end in numbers, or its `chapter` is not the chapter of its ref (section 4).
   Print the first 20 failures.
4. Duplicates are checked **within the book only** (`Shloka.book == slug`), not across the table:
   the seed already holds classic rows called "Taittirīya Upaniṣad …" and "Bṛhadāraṇyaka Upaniṣad
   …" [*run*].
5. `--min-words` defaults to 0 for a paged import (a scripture with holes is worse than a verse
   without word analysis, the rule the Gītā import already follows). If `analyze_sentence` raises,
   keep the verse with `word_breakdown=[]` and `features=[]` and list its ref in the report under
   `no_breakdown`. A paged import never skips a verse.
6. Row fields: `book=slug`, `chapter` from the verse, `seq` = its 1-based position in the payload,
   `in_daily=False`, `date` = the import day (ISO) for every row of the run (the schedule does not
   move), `audio_url=""`, `register` from the payload.
7. Commit every 500 rows and print progress every 500. Print verses per second at the end.
8. The report adds `book`, `chapters` and `no_breakdown`.

Tests (section 9) cover each refusal, the within-book dedupe, the kept verse on analyzer failure,
and that a classic import still dates rows after the newest date.

### 6.4 Daily verse, the reader list and everything else that reads all rows

Add `Shloka.in_daily.is_(True)` to:

- `routers/shlokas.py`: both queries in `_select_shloka` (exact day and cycle) and `list_shlokas`.
  Old phones then see exactly today's list.
- `services/content_well.py`: the Shloka count used for runway.
- `routers/canon.py`: the refs used for classic counts in `canon_report`.
- `seeds/reader_passages.py:129`: the graded reader must keep choosing from the same verses.
- `services/games.py:58`: games use the classic corpus only.
- `seeds/seed.py:336`, `:352`, `:360`: the boot repairs are for seed rows.

Leave `services/ask_sources.py` reading every row (a verse check gains from more text) and
`routers/explain.py:174` (a lookup by exact text). Report in the hand-back how long the first
`_held_rows` build takes with all books imported.

### 6.5 Canon seed (`backend/app/seeds/canon.py`)

- Add the 39 rows of section 4 to `CANON_TEXTS`, each with `"paged": True`, `"depth": "full"`,
  `"tier"` as in section 4, `"verses_planned"` = the reference count (or the built count where
  section 4 has none), `"ref_prefixes": [ref name]`, `"source"`, `"licence"` (3.4), `"notes"`,
  and `"source_key"` (`ambuda`, `dcs`, `sa-wikisource`, `gretil`).
- `seed_canon` today adds `source_key` with an if/else and passes `**t` to `CanonText`. Change it to
  take `source_key` and `paged` from the dict (keep the old if/else as the fallback for rows
  without them) so `**t` does not pass a key twice.
- Generalise the Mahābhārata retune into a small list of slugs whose fields are re-applied on
  every boot: `mahabharata`, `katha`, `mundaka`, `ayurveda` (section 8). Keep it idempotent.
- `ayurveda` row: Suśruta is now its own book, so set its `ref_prefixes` to `["Caraka"]` and its
  `title_en` to "Caraka Saṃhitā (indexed)". It stays catalogue-only and free.

### 6.6 Endpoints (`backend/app/routers/canon.py`)

**`GET /canon`** keeps its shape. Without a query parameter it returns only `paged == False` rows
(old phones). With `?include=paged` it returns every row and adds to each:
`"paged": bool`, `"locked": bool` (6.7). For paged rows `verses_imported` is one
`SELECT book, COUNT(*) … WHERE in_daily = false GROUP BY book` for all books, not the substring
loop.

**`GET /canon/{slug}/chapters`** (auth like `/canon`; 404 for an unknown slug or a non-paged book):

```json
{"slug": "rigveda", "title_en": "Ṛgveda", "title_sa": "ऋग्वेदः", "tier": "plus", "locked": false,
 "preview": {"chapter": "1.1", "verses": null},
 "chapters": [{"chapter": "1.1", "section": "1", "count": 9, "first_ref": "Ṛgveda 1.1.1", "locked": false}]}
```

Chapters in order of their smallest `seq`. `section` is the first number of a chapter with two or
more numbers, else "". `preview.verses` is 5 for a one-chapter book, else null.

**`GET /canon/{slug}/verses?chapter=<chapter>`** (an empty `chapter` is valid for one-chapter
books; 404 for an unknown chapter):

```json
{"slug": "rigveda", "chapter": "3.62", "locked": false, "locked_after": null,
 "verses": [ /* ShlokaResponse objects, the same shape GET /shlokas returns, ordered by seq */ ]}
```

A locked chapter returns `"locked": true` and `"verses": []`. A locked one-chapter book returns
its first 5 verses and `"locked_after": 5`.

### 6.7 The Plus lock

- `backend/app/config.py`: `canon_plus_gate: bool = False` (env `CANON_PLUS_GATE`), with a comment:
  owner decision 2026-10-09, turned on when buying Plus works.
- `backend/app/services/entitlement.py`: add `"canon_plus"` to `PREMIUM_FEATURES` and a line in the
  docstring (owner decision 2026-10-09). Nothing else there changes.
- New `backend/app/services/canon_access.py`:

```python
def plus_locked(db, learner, text) -> bool:
    """True when this learner may read only the preview of this book."""
    if not settings.canon_plus_gate:
        return False
    if (text.tier or "free") != "plus":
        return False
    return not has_entitlement(learner, "canon_plus", db)
```

  plus `preview_chapter(db, text) -> str` (the chapter with the smallest `seq`) and
  `verse_open(db, learner, text, shloka) -> bool` (open when not locked, or in the preview chapter,
  or for a one-chapter book among the first 5 by `seq`).
- `GET /shlokas/{id}/meaning`: when the row has a `book` and `verse_open` is False, answer 403
  `{"detail": "Part of Plus"}` before any model call.
- The gate is off by default, so with no environment change nothing is locked for anyone.

### 6.8 Production import script (`backend/scripts/prod_import.py`)

Add `book`, `chapter`, `seq` and `in_daily` to `FIELDS` so its backup and restore keep them.
Don't run it live: section 13 gives the owner the commands.

### 6.9 Size and speed

Report in the hand-back: rows per book after import, `app.db` size before and after, total import
time, the time of `GET /canon?include=paged`, of the chapters call for `rigveda` and `bhagavata`,
and of the largest single chapter's verses call, all through `TestClient`.

### 6.10 Licence registry (`backend/app/seeds/licences.py`)

- `sa-wikisource`: licence `CC BY-SA 4.0` [*run*: site rightsinfo]; credit "Transcriptions from
  Sanskrit Wikisource contributors (sa.wikisource.org), used under CC BY-SA 4.0."; `taken` lists
  the Īśopaniṣad, the Muṇḍaka completion and the 23 books. The Īśā canon row's own string says
  3.0; leave it and list it in the hand-back.
- `dcs`: licence `CC BY 4.0` [*read*]; credit "Text and data from the Digital Corpus of Sanskrit by
  Oliver Hellwig (2010-2021), used under CC BY 4.0." (keep the Mitrasaṃgraha sentence); `taken`
  adds the 10 books, the Kaṭha completion and the Mahābhārata selections.
- New `ambuda`: name "Ambuda (ambuda.org)", url `https://ambuda.org`, licence `CC0 1.0`, credit
  "Texts from Ambuda (ambuda.org), released under CC0 1.0.", taken "Bhaja Govindam, Āditya
  Hṛdayam, Rāmarakṣā Stotra, Māṇḍūkya Upaniṣad."
- New `gretil`: name "GRETIL (Göttingen Register of Electronic Texts in Indian Languages)", url
  `https://gretil.sub.uni-goettingen.de`, licence `CC BY-NC-SA 4.0`, credit "Texts from GRETIL,
  SUB Göttingen, used under CC BY-NC-SA 4.0 on the free shelf.", taken "Garuḍa Purāṇa,
  Arthaśāstra, Līlāvatī." Do not repoint the existing books that already name GRETIL in their
  licence strings (Kaṭha, Nītiśataka, Pañcatantra, Bhartṛhari); list them in the hand-back.

---

## 7. Mobile

Read the Expo 57 docs before using any Expo API (`mobile/AGENTS.md`).

### 7.1 API client (`mobile/src/api/client.ts`)

- `CanonText` gains optional `paged?: boolean` and `locked?: boolean`.
- `api.canon` calls `/canon?include=paged`. An old backend ignores the parameter and returns the
  classic rows without `paged` (FastAPI ignores unknown query parameters) [*not verified*: prove
  it with a test against today's router].
- New `api.canonChapters(slug)` and `api.canonVerses(slug, chapter)` with the shapes of 6.6.

### 7.2 Pure helpers (`mobile/src/utils/paged.ts`, no React)

`isPaged(text)`, `sectionsOf(chapters)` (group by `section`, keeping order), `nextChapter(chapters,
current)`, `prevChapter(chapters, current)`, `chapterLabel(chapter)` (shows the chapter as it is,
"3.62"; a one-chapter book has no label), `positionKey(slug, chapter)` (`${slug}#${chapter}`).

### 7.3 Shelf (`Reader.tsx`, `useReaderBooks.ts`)

- Classic books: unchanged, still built from `GET /shlokas`.
- Paged books: a cover with `verses_imported` from `/canon` (no verse list needed), the rails of
  4.7, and the word "Plus" on the cover only when `locked` is true. A paged book with 0 verses shows
  "Soon" like a classic one.
- Add `COVER_COLOURS` entries for the 39 slugs in `components/book/covers.ts` (colour, foreground,
  `titleSa` from section 4), chosen from the existing palette so `check-contrast.mjs` passes. No
  painted covers: the vector cover is the fallback.

### 7.4 Contents of a paged book

Fetch `canonChapters(slug)`. Show the cover, "Open book" (first chapter) or "Continue" (the saved
chapter and verse), then the chapters grouped by `section` (a SectionList). A locked chapter shows
a lock icon and has the label "Chapter 3.62, Plus". Loading and failure follow U10-3: a failed fetch
says "Couldn't load this book. Try again." with a retry, never an empty list or an endless skeleton.

### 7.5 Reading a paged book

Fetch `canonVerses(slug, chapter)` and give its verses to the existing `PageCurlBook`, in `Reader.tsx`
and in the full-screen `Book.tsx` (route params become `{ bookKey: string; index?: number;
chapter?: string }` in `navigation/types.ts`). After the last verse of a chapter show a page with
"Next chapter" (and the next chapter's label); before the first, "Previous chapter". The slider
moves within the chapter. A chapter load that fails shows "Couldn't load this chapter. Try again."
Everything else about the page (word chips, Ask button, curl, Reduce Motion) is unchanged.

### 7.6 Locked chapters and the preview

Tapping a locked chapter, or reaching `locked_after`, opens a sheet: title "Part of Plus", one line
"This chapter opens with Plus.", one button "Close". No purchase button yet: the store work adds it.
With the gate off nothing is locked, so this sheet never shows today.

### 7.7 Reading position

Classic books keep `shabd.read.pos` as now. For a paged book save the verse index under
`positionKey(slug, chapter)` in the same map, and the last chapter in a new key
`shabd.read.chapter` (`{ [slug]: chapter }`). A saved chapter that no longer exists opens the
contents, never crashes.

### 7.8 Checks

- New `mobile/scripts/check-paged.mjs`: transpile `src/utils/paged.ts` with the project's
  `typescript` the way `check-kala.mjs` loads its module, and assert: sections keep order;
  next/previous at both ends return null; a one-chapter book has no label; `positionKey` round-trips.
- `npx tsc --noEmit`, `node scripts/check-contrast.mjs`, `node scripts/a11y-audit.js`,
  `node scripts/check-kala.mjs`.
- On screen: use the one-screen web preview trick in `reference` notes if it still works (a
  temporary entry in `mobile/`, deleted afterwards), or say plainly that nothing was seen on a
  phone. The owner checks on the phone.

---

## 8. Existing books

### 8.1 Kaṭha Upaniṣad: complete it (free, classic)

Build `results/imports/katha-complete.payload.json` from DCS `Kaṭhopaniṣad` (6 vallī files)
[*run*]. Today's refs are adhyāya.vallī.verse, "Kaṭhopaniṣad 1.1.10" [*run*]: map DCS vallīs 1–3 to
1.1–1.3 and 4–6 to 2.1–2.3. No `book` key (classic import, `in_daily=True`, dates continue as
today). Run with `--min-words 0`. The 40 rows already there are kept; if the importer reports
"mismatched" for any of them, list them and stop (do not use `--fix-existing`). Update the `katha`
canon row: title "Kaṭhopaniṣad (complete)", `depth: "full"`, `verses_planned` = the built count,
licence string naming both GRETIL (the 40 existing rows) and DCS (the rest). It stays free.

### 8.2 Muṇḍaka Upaniṣad: complete it (free, classic)

Same way, from sa.wikisource `मुण्डकोपनिषत्` (64 numbered verses) [*run*], refs "Mundaka Upaniṣad
M.K.N" as today [*run*]. Update the `mundaka` row the same way (`depth: "full"`).

### 8.3 Mahābhārata: re-source the Vidura Nīti from BORI numbering (free, classic)

1. Back up `app.db`.
2. Delete the 193 rows of the 2026-10-07 import: rows whose `source_ref` is in
   `results/imports/mahabharata.payload.json` **and** whose `devanagari` equals that payload's text
   for the ref. Count them first; stop if the count is not 193. Never touch the 7 seeded rows
   (`1.11.12, 1.107.32, 3.2.15, 5.39.58, 12.26.23, 12.316.6, 13.7.22`); 5.39.58 is BORI's
   "akrodhena jayet krodham" [*run*].
3. Rewrite `scripts/build_mahabharata_payload.py` to read DCS `Mahābhārata` files
   `Mahābhārata-0696-MBh, 5, 33-5709.conllu` and `Mahābhārata-0697-MBh, 5, 34-5710.conllu`: 104 and
   83 verses, none missing [*run*]. That gives 187 rows; with the 7 seeded rows the book holds 194.
4. Licence string: the DCS template of 3.4. `source_key` becomes `dcs`. `verses_planned` 194. Its
   notes keep the warning about never bulk-importing the epic.
5. Classic import, `--min-words 0`. The deleted rows' dates leave a gap in the daily schedule in
   2030; the cycle fallback covers those days. Say so in the hand-back.

---

## 9. Tests

Add `backend/tests/test_paged_books.py` and extend the existing canon and import tests:

1. Migration: one Alembic head; upgrade from empty works.
2. Import refusals: book not in the catalogue; `daily` missing or true; a ref outside the book's
   name; a wrong chapter. Each refuses the whole payload and writes nothing.
3. Within-book dedupe: a paged ref equal to a classic row's ref is imported; a repeat inside the
   book is skipped.
4. Analyzer failure keeps the verse with an empty breakdown and lists it.
5. A classic import is unchanged: `in_daily=True`, dates after the newest date.
6. `GET /shlokas/today` never returns a paged row, on an exact date (a paged row dated today) or on
   the cycle path.
7. `GET /shlokas` excludes paged rows; its response is identical before and after a paged import.
8. `GET /canon` without `include` returns only classic rows, field for field as before.
   `?include=paged` adds paged rows with counts.
9. Chapters in `seq` order with counts; verses in `seq` order; 404s for an unknown slug, a classic
   slug and an unknown chapter.
10. Lock: gate off, nothing locked. Gate on and a free learner: the first chapter open, the others
    locked with empty verses; a one-chapter book gives 5 verses and `locked_after` 5. A learner
    provisioned `plus` through `entitlement.provision`: everything open. A `free`-tier paged book
    (garuda, arthashastra, lilavati): never locked.
11. `GET /shlokas/{id}/meaning` answers 403 for a locked verse when the gate is on, and never calls
    the model for it.
12. Graded reader passages, games and the runway count are the same with and without paged rows.
13. Canon seed: 51 rows; every row's `source_key` exists in the registry; every licence string is
    non-empty; `tier` is `plus` exactly for rows keyed `ambuda`, `dcs` or `sa-wikisource` among the
    new ones and `free` for `gretil`; the 12 old rows keep `tier: free`.
14. No ref name of a paged book contains a classic `ref_prefixes` entry, and no classic prefix
    contains a paged ref name. ("Suśruta" is why the `ayurveda` prefixes change in 6.5.)
15. `test_book_builders.py`: cleaning (each rule of 5.3, with small inline strings), number
    parsing in every form of 5.4, the DCS join, the Ambuda TEI parse, the Sāmaveda running number,
    and the character check rejecting Latin, Bengali and markup.

---

## 10. Order of work

Stop at each "stop" line until its checks pass.

1. **Backend plumbing** (6.1–6.8, 6.10, the `ayurveda` change in 6.5) with tests 1–14 against
   fixture payloads. No book data yet. *Stop:* full backend suite green.
2. **Builders** (section 5) and `test_book_builders.py`. Build every payload, then read the
   coverage reports. *Stop:* list which books pass and which stop (5.6).
3. **Local import**, after backing up `app.db`: the books that passed, one at a time, dry run then
   `--live`, smallest first. Then 8.1, 8.2, 8.3. *Stop:* row counts per book equal the payloads;
   `GET /shlokas` byte-identical to before; the daily verse for 2026-10-10 unchanged.
4. **Mobile** (section 7). *Stop:* all mobile checks green.
5. **Hand-back** (section 14).

---

## 11. Acceptance

- Every book in section 4 is imported, or has a stop report saying exactly why not.
- For every imported book: rows equal the payload; no verse repeats; every verse passes the
  character check; the total is within 2% of the reference count; the spot checks in section 4 are
  found at their numbers.
- An old phone (classic `/canon`, `/shlokas`, `/shlokas/today`) gets byte-identical responses
  before and after the whole import (save the responses before step 3 and diff them).
- With `CANON_PLUS_GATE` unset, no chapter of any book is locked for any learner.
- The 12 old books show on the new phone exactly as before.

---

## 12. Not in this work

- Buying Plus (store, receipts, the upgrade button). The lock waits for it.
- Audio for any new book.
- Translations: meanings come from the existing on-demand route.
- Accented Vedic text (the raw pages stay in the cache for later).
- Kumārasambhava cantos 9–17, the Taittirīya Saṃhitā and the Paippalāda Atharvaveda.
- Moving the old GRETIL-sourced books to the `gretil` registry key.

---

## 13. For the owner, not for you

- **Deploy.** The migration runs when the backend starts. Then the imports, one payload at a time,
  dry run first:
  `backend/.venv/Scripts/python.exe backend/scripts/prod_import.py --file results/imports/books/<slug>.payload.json`
  then the same with `--live`. Paged payloads set `--min-words 0` themselves.
- **The lock.** Leave `CANON_PLUS_GATE` unset until buying works, then set it to `true` in the Cloud
  Run environment.
- **Decisions waiting:**
  - Garuḍa Purāṇa, Arthaśāstra and Līlāvatī are on the free shelf with a non-commercial (GRETIL)
    licence, by your rule. A free shelf inside a paid app may still count as commercial use under
    CC BY-NC-SA; asking GRETIL for permission would settle it. The existing free books from GRETIL
    (Kaṭha, Nītiśataka, Pañcatantra, Bhartṛhari) are in the same position.
  - Arthaśāstra: every e-text found follows R. P. Kangle's 1969 critical edition; whether that
    edition is still in copyright was not checked.
  - Devī Māhātmya and Amarakośa are Plus on sa.wikisource's stated licence, but their numbering
    matches GRETIL's copies, so they may share an origin with a non-commercial file (3.2).
  - Vedic accent marks are removed for now.
  - Viṣṇu Sahasranāma's first chapter (its preamble) is its free preview, by the first-chapter rule.
  - Whole Vedas and Purāṇas mean many more first-time meaning calls; the ₹200 a day Gemini ceiling
    still bounds the spend.

---

## 14. Hand-back

Write `handover_reading_shelf_result.md` next to this file:

- every file changed or added;
- what was *run* (tests with counts, every book's coverage numbers against section 4, import
  counts and times, the old-phone response diff, endpoint timings, `app.db` sizes), what was *read*,
  and what is *not verified* (PostgreSQL, the phone);
- every book that stopped, with its report;
- the backups taken;
- anything in this file you disagreed with, and why.

---

## Sources checked (2026-10-09, by Claude)

- **Ambuda:** `metadata.json` (344 texts, 202 with `"license": "CC0 1.0"`), `tei-headers.xml` (299
  CC0 statements, 17 GRETIL statements), the TEI files of `mohamudgara` and `mandukyopanishat`, the
  text exports of `adityahrdayam` and `ramarakshastotram` [*run*].
- **DCS:** both readme files (CC BY 4.0); file lists of every text named in section 4 through the
  git trees API; sample files of Suśruta Sū. 16, Meghadūta, Kaṭha; verse counters of MBh 5.33 and
  5.34 [*run*].
- **sa.wikisource:** `rightsinfo` (CC BY-SA 4.0); page lists and sample pages for every
  sa.wikisource book in section 4 [*run*].
- **GRETIL:** `gretil.html` (801 plaintext files listed); the licence header of 18 files (all CC
  BY-NC-SA 4.0); verse counts used in section 4; BORI Mahābhārata books 5 and 13 [*run*].
- **CC BY-SA 4.0 legal code** at creativecommons.org: the "No downstream restrictions" clause and
  the definition of Effective Technological Measures [*read*].
- **Vedic Mathematics:** the archive.org OCR text of the Motilal Banarsidass reprint [*read*].
- **Bhaviṣya Mālikā:** archive.org item `achyutananda-malika-o-hadudasanka-malika-` (Odia) [*read*].
- **sanskritdocuments.org:** `chANakyanItikrama.itx`, its terms and its 345 verse numbers [*run*].
