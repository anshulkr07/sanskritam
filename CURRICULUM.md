# Sanskritam — Curriculum Plan

**Date:** 2026-09-07
**Status:** data strategy. Documents what content exists, what is missing, where it comes from, and how it is stored.
**Updated 2026-09-08:** open question #1 is ANSWERED (§10) and the 11-unit spine is now DATA, not prose — see
[`LESSON_OVERHAUL.md`](LESSON_OVERHAUL.md) P23-1 (`units` table, migration `f1a2b3c4d5e6`).
**Companion docs:** [`architecture.md`](architecture.md) (the spec), [`DECISIONS.md`](DECISIONS.md) (decisions), [`research/tech-research.md`](research/tech-research.md) (tech findings).

---

## 1. The core problem

The app has a world-class computational Sanskrit engine (Vidyut) and a feature taxonomy (~40 features). Clicking a Path node goes straight to a challenge. There is **no lesson content** — no explanation of what sandhi IS, why a vibhakti exists, or how a word was formed. The engine can derive, verify, split, and analyze practically any form. It cannot teach a learner what any of it means.

This document lays out what data is needed, where it comes from, and how it is stored — before any code is written.

---

## 2. Register coverage: what "learn Sanskrit" means here

Sanskrit spans three registers. All three are grammatically covered by Pāṇini's system (Vidyut handles all three), but the **pedagogy is weighted**.

| Register | Engine support | Curriculum depth | Role in the app |
|---|---|---|---|
| **Laukika** (today's spoken Sanskrit) | Full | Deep — core loop | Conversation, challenges, the tutor |
| **Classical** (epics, śloka, Pāṇinian) | Full | Medium — reading + recitation | Daily śloka, grammar reference, reader |
| **Vedic** (mantra, Vedic grammar) | Partial — has data, unvalidated | Thin, by design | Sliver inside daily śloka; not a scripture library |

**Locked decision from architecture.md §1:** Sanskritam is **not** a scripture library. The app is a spoken-Sanskrit tutor. Vedic is present as a register tag on corpus content, not as a full Vedic curriculum. This is a product scope decision, not a data gap.

**What Vidyut covers across all three registers:**

- 2,000+ dhātus (verb roots) from 5 traditional sources, with svara marks and gaṇa classification
- ~4,000 sūtras of the Aṣṭādhyāyī + commentaries (Kaumudī, Kāśikā) + vārttikas
- Liṅgānuśāsanam (gender rules), Phiṭ-sūtras (accent), Uṇādipatha (suffixes)
- 1,200+ meters from Vṛttaratnākara
- ~100M-entry kosha (dictionary)
- All 10 lakāras including the Vedic-specific Leṭ, plus the accent system
- Sandhi rules (4 types)

---

## 3. Data completeness: what exists vs. what is missing

### 3.1 Engine data — COMPLETE and world-class

Already in the repo (`backend/vidyut-data/`), MIT-licensed from ashtadhyayi.com + Ambuda.

| Dataset | Files | Size | Purpose |
|---|---|---|---|
| Dhātupāṭha | `prakriya/dhatupatha.tsv`, `ganasutras.tsv` | 2,000+ roots | Verb derivation, conjugation tables |
| Sūtrapāṭha | `prakriya/sutrapatha.tsv` | ~4,000 sūtras | Derivation steps, sūtra display |
| Commentaries | `prakriya/kaumudi.tsv`, `kashika.tsv` | — | Traditional explanations |
| Gender rules | `prakriya/linganushasanam.tsv` | — | Gender classification |
| Accent rules | `prakriya/phit-sutras.tsv` | — | Svara patterns |
| Sandhi rules | `sandhi/rules.csv` | — | Splitter/joiner |
| Meters | `chandas/meters.tsv` | 1,200+ | Metre analysis |
| Dictionary | `kosha/padas.fst`, `registry.msgpack` | ~100M entries | Word lookup, morphological tagging |
| Suffixes | `prakriya/unadipatha.tsv`, `varttikas.tsv` | — | Secondary derivation |

### 3.2 Feature taxonomy — SKELETON EXISTS, two gaps

The seeded features (`backend/app/seeds/features.py`) cover ~40 features across 6 domains:

| Domain | Features | Status |
|---|---|---|
| Cases (vibhakti) | NOM, ACC, INSTR, DAT, ABL, GEN, LOC, VOC — all singular + dual + plural combos | Present |
| Numbers (vacana) | SG, DU, PL | Present |
| Tenses (lakāra) | PRES.1SG through PRES.3PL, IMP.2SG | Present (only 2 lakāras) |
| Voices (pada) | PARASMAIPADA, ATMANEPADA | Present |
| Genders (liṅga) | MASC, FEM, NEUT | Present |
| Sandhi | VOWEL, VISARGA, ANUSVARA, CONSONANT | Present |
| **Samāsa (compounds)** | — | **MISSING** |
| **Kāraka (thematic relations)** | — | **MISSING** |

**Missing domain 1 — Samāsa (compounds):** Sanskrit compounds are a core feature of the language, especially for reading classical texts. The 4 main types (dvandva, tatpuruṣa, bahuvrīhi, avyayībhāva) are not in the feature taxonomy, have no challenges, and have no lessons. This is a **blocker for the Reader surface** (U13) — classical texts are dense with compounds.

**Missing domain 2 — Kāraka (thematic relations):** The 6 kārakas (kartṛ, karma, karaṇa, sampradāna, apādāna, adhikaraṇa) explain *why* a vibhakti is used. They are the bridge between form and meaning. Currently absent from the taxonomy. This is a **blocker for the "why was I wrong?" explanation system** — the explainer can name the vibhakti, but cannot explain the semantic role.

### 3.3 Pedagogical content — MISSING (the main gap)

| Layer | Engine can handle it? | Content exists? | Source |
|---|---|---|---|
| **Lesson text** (explaining what each feature is) | N/A | No | Extract from learnsanskrit.org (open source) |
| **Curriculum spine** (ordered sequence of units) | N/A | No — features.py has ranks, but no unit structure | Design here (§5) |
| **Vocabulary curriculum** (structured by frequency/topic) | Dictionary exists | No | Sanskrit WordNet (CC BY-SA 4.0) + DCS frequency |
| **Graded reading** (simple → complex texts) | Vidyut can segment | No | DCS corpus (open access), Samskrita Bharati readers |
| **Samāsa lessons** | Vidyut can segment | Not in taxonomy | Ashtadhyayi 2.1-2.2 + DCS compound-annotated texts |
| **Kāraka lessons** | Vidyut has the data | Not in taxonomy | Ashtadhyayi 1.4.23-55 + DCS examples |
| **Cultural context** (śloka explanations) | N/A | Partial — 96 shlokas seeded, no explanations | Architecture.md §4.4 corpus sources |

---

## 4. Open-source data sources

### 4.1 Already in the repo (MIT-licensed, from Ambuda / ashtadhyayi.com)

See §3.1 above. This is the computational engine and it is complete.

### 4.2 Curriculum content (needs extraction/structuring)

| Source | License | What it has | What to extract |
|---|---|---|---|
| **learnsanskrit.org** (GitHub: sanskrit/learnsanskrit.org) | **CC BY 4.0** (guide); code public domain — verified 2026-09-08 | Complete beginner-to-advanced lessons, grammar explanations, exercises | Lesson text for each feature, curriculum structure, exercise patterns |
| **Sanskrit WordNet** (IIT Bombay, CFILT) | CC BY-SA 4.0 | 66,930 words, 46,440 synsets, semantic relations | Vocabulary curriculum grouped by topic, word families, synonyms/antonyms |
| **Digital Corpus of Sanskrit** (DCS, Heidelberg) | Open access, on GitHub (cltk/sanskrit_text_dcs) | 650,000+ lines of sandhi-split, morphologically analyzed text from 2,500+ years | Graded reading material, example sentences with full parse, frequency data |
| **GRETIL** (Göttingen) | Open access | Machine-readable Sanskrit texts from all periods | Raw text corpus for the classical index (RAG) |
| **Sanskrit Documents** (sanskritdocuments.org) | Open access | Grammar tables, declension charts, learning materials | Reference tables, grammar summaries |
| **ashtadhyayi.com** | MIT (same source as Vidyut data) | Interactive Aṣṭādhyāyī with sūtras, commentaries, examples | Supplementary sūtra explanations |

### 4.3 Corpus for the grounded-guru / RAG (future)

| Source | License | Content | For |
|---|---|---|---|
| **DCS** | Open access | 4.8M tagged words, full parse | Classical index (grammar, śloka) |
| **GRETIL** | Open access | Full texts | Classical index (epics, śāstra) |
| **Mitrasaṃgraha** | Sanskrit sources mostly CC0; English translations CC BY-SA (2 files BY-NC-ND — excluded) | ~390K pairs, per-text licences in `final_catalog.tsv` | Gloss induction ONLY (≤3-word glosses; never ship translation sentences) |
| **Samskrita Bharati readers** | Internet Archive (verify per item) | Graded laukika stories | Laukika index (conversation, challenges) |
| **Balamodini stories** | Internet Archive (verify per item) | Simple stories | Laukika index (beginner reading) |

**Licence care (per architecture.md §4.4):** verify per item on Internet Archive — an uploader name is not a licence. CC0 translations (Griffith 1896, Ganguly, Bühler) are Victorian and often inaccurate; use as source text, not as authoritative meaning.

### 4.4 Video — embedded, never hosted (researched 2026-09-09)

**There is no openly licensed Sanskrit video course.** Tested directly against YouTube's Creative Commons filter (`&sp=EgIwAQ%3D%3D`): "learn sanskrit" returns **3** results, "sanskrit grammar lesson" returns **2**. That is the entire CC BY corpus — scattered one-offs, no course. Video is therefore the one content class we **embed and never own**, which inverts §4.2's extract-and-adapt model.

The usable sources are first-party uploads on official institutional channels. The embed right comes from YouTube's ToS, not from the uploader's site terms — which is why Vyoma qualifies here despite its site forbidding non-personal download.

| Source | Licence | Covers | Units |
|---|---|---|---|
| **Spoken Sanskrit** Basic/Intermediate/Advanced (Choudry, IIT Kharagpur) | Standard YouTube, official NPTEL IIT-KGP channel | vibhakti, tenses, 10 lakāras, sandhi, passive voice; ~20 lectures each | 3, 4, 5, 6, 8, 9 |
| **Introduction to Pāṇinian grammar** (Kulkarni, IIT Bombay) — `noc22_hs35` / `109101189` | Standard YouTube, official NPTEL | Wk 2 pratyāhāra; Wk 5–7 sound properties; Wk 9 dhātu/prātipadika; **Wk 10 kāraka, vibhakti, apādāna, sampradāna, adhikaraṇa, karaṇa, karma, kartā** | 1, 11 |
| **समास samāsa in Pāṇinian grammar I & II** — `noc23_hs65` / `noc23_hs79` | Standard YouTube, official NPTEL | two dedicated courses on compounds | 10 |
| **Samskrita Bharati Pravesha** | Standard YouTube, own channel | varṇamāla *with pronunciation*; graded beginner course | 1 |
| The Sanskrit Channel / Vyoma | Standard YouTube, own channels | 1000+ videos, published syllabus | broad |

**All eleven units are covered.** Wk 2's pratyāhāra is an unusually exact fit for §6.1's Layer 0 — *"alphabet as a mathematical set"* is what a pratyāhāra **is**. But that course states *"INTENDED AUDIENCE: Linguists, Indologists"*, so it is a meta-level treatment, not a beginner lesson: **Samskrita Bharati for the Unit 1 pronunciation lesson, NPTEL Wk 2 later as the conceptual payoff.** Unit 1 therefore wants two videos at different ranks.

**Excluded, and why:**

| Source | Why not |
|---|---|
| **NPTEL for re-hosting** | Its Terms of Use say *"All rights in the Site and its content, if not expressly granted, are reserved by NPTEL"*; SWAYAM's say materials are *"for your personal use… only"*; the footer says CC BY-NC-SA. The widespread "NPTEL is CC BY-SA" belief traces to a **Creative Commons wiki page last edited 2019-12-20** and is contradicted by all three live sources. Embed only. |
| IA `sanskrit_teaching` (120-lecture "Central Sanskrit University" course) | Raw metadata has **no `licenseurl` and no `rights` field**; uploaded by a private individual, not by CSU. Exactly the §4.3 trap. |
| e-PG Pathshala, NCERT/DIKSHA, IGNCA on IA | CC BY-NC / BY-NC-ND — NonCommercial, same bar as Q2. |
| GODL-India | Genuinely permits commercial use, but covers NDSAP datasets on the OGD platform, not educational video. No Sanskrit video is published under it. |
| Coursera / edX / MIT / Harvard | **No Sanskrit MOOC exists.** Leiden's is Indo-European linguistics with one Sanskrit week, and it is paid. |

**Unverified:** Vidya-mitra / INFLIBNET is described by secondary sources as CC BY-SA; the host did not resolve during research. It is the only remaining lead that would yield *ownable, offline-capable* video, and matters only if offline video is ever wanted.

---

## 5. Storage architecture: four kinds of data, four homes

This is the "where does it live" answer. It is derived from architecture.md §2 (cost gradient), §4.6 (retrieval), and §14 (platform).

### 5.1 Engine fuel — server memory, loaded once

| What | Size | Where | Why |
|---|---|---|---|
| Vidyut data (dhatupatha, sutras, kosha, sandhi, meters) | ~200MB extracted | Server filesystem, loaded into RAM at startup | It's the grammar engine's reference. Already at `backend/vidyut-data/`. Loaded once, read millions of times. |

### 5.2 Curriculum content — structured DB, served via API

| What | Size | Where | Why |
|---|---|---|---|
| Lessons (text, examples, metadata) | KBs—MBs | SQLite → Postgres, `lessons` table | Queryable, versionable, retunable without app release |
| Unit structure (spine ordering) | KBs | DB, `units` table (`lessons.unit_id` FK; audited 2026-09-08 — no `unit_lesson` join) | The curriculum is retuned constantly in year one |
| Challenges (seed + generated) | KBs | DB, `challenges` table | Already exists; will grow with samāsa/kāraka content |
| Dialogue graph (conversation nodes) | KBs | DB, `dialogue_*` tables | Already exists |
| Vocabulary (word lists) | KBs—MBs | DB, `vocab_words` table | Frequency-sorted, topic-grouped |
| Graded reading (sentences with parse) | KBs—MBs | DB, `reader_passages` table | Indexed by difficulty, register, features exercised |

**Why not in the APK:** The curriculum changes constantly in year one. The architecture already locks the learner model server-side (§8) specifically so retuning doesn't need an app release. The same logic applies to lesson content.

### 5.3 Audio — object storage + CDN

| What | Size | Where | Why |
|---|---|---|---|
| Pre-rendered TTS (every lesson, challenge, śloka, dialogue node) | GBs — the largest tier | Object storage (GCS/S3), CDN, content-hashed filenames | The whole cost model (§2) depends on pre-render + CDN. Pre-rendered audio is an owned asset, not a cache — it survives losing the vendor. |
| Varṇamālā reference audio (~60–120 clips) | A few MB | Inside the APK bundle | Offline-capable (§13). The only audio that ships with the app. |
| Live TTS (open conversation, learner's name, error corrections) | N/A | Synthesised on demand, never stored | The "cannot be pre-rendered" short list (§12) |

### 5.4 Corpus (for the grounded-guru / RAG — future)

| What | Size | Where | Why |
|---|---|---|---|
| Embeddings of corpus sentences | Depends on corpus size | Flat file in memory (v1) → pgvector (v2) | Architecture.md §4.6: **no production vector database in v1.** The corpus is thousands of sentences, not millions of documents. A flat file of embeddings in RAM answers all three callers (authoring, explanations, open conversation) in single-digit ms. Reach for pgvector when the corpus outgrows RAM. |

### 5.5 Video — the fifth kind, and the one with no home (2026-09-09)

| What | Size | Where | Why |
|---|---|---|---|
| Third-party lesson video | 0 bytes | **Nowhere.** A `provider` + `provider_video_id` reference only | YouTube's Developer Policies III.E.1.a forbid us to *"download, import, backup, cache, or store copies of YouTube audiovisual content without YouTube's prior written approval."* Storing it is the violation. |

This is the exception to §5.3's rule that pre-rendered media is *"an owned asset, not a cache — it survives losing the vendor."* Embedded video is the opposite: **rented, and it does not survive.** A creator can delete, privatise or region-lock a video at any moment, and embedding can be disabled independently of the video staying public.

That asymmetry is a design constraint, not a footnote: **every lesson must render correctly with its video missing**, and the fallback path (link-out via `expo-web-browser`, already a dependency) is built at the same time as the player, not after.
| Raw corpus text | MBs—GBs | Server filesystem | Chunked verse-by-verse via Vidyut, never by characters. |

**Two indexes, never merged** (§4.4):
- **Classical index** (DCS, GRETIL, epics) — serves daily śloka, grammar reference, the grounded-guru
- **Laukika index** (Samskrita Bharati, Balamodini) — serves conversation, challenges

The split is enforced at the retrieval layer, not by prompt. Crossing registers requires writing new code, not forgetting an instruction.

**Embeddings vendor:** Gemini (Sarvam has no embeddings endpoint — probed 2026-08-29, `/v1/embeddings` and `/embeddings` both 404). Keeps the vendor count at two.

**Open risk (§4.6):** Sanskrit embedding quality is unmeasured. Does a classical query ever retrieve laukika? That crossover is the one thing the two-index split exists to prevent, and nothing tests it yet. Measure before building the grounded-guru feature.

---

## 6. Curriculum structure: 11 units, 3 layers

### 6.1 The three layers of Sanskrit learning

Sanskrit can be taught as a mathematical system because Pāṇini's grammar IS a formal system. The curriculum is organized into three conceptual layers, each building on the last:

**Layer 0 — The Alphabet as a Mathematical Set**

The Sanskrit alphabet is not a random list. It is a 5×5 grid of consonants organized by place of articulation (velar → palatal → retroflex → dental → labial) with systematic relationships within each row (unvoiced → voiced → nasal). Teaching the alphabet as a grid rather than a list makes the patterns visible. Every varṇa carries `sthana` (place) and `prayatna` (effort) so feedback can name the actual articulator.

**Layer 1 — Word Formation as Functions**

- Sandhi = f(a, b) → c (phonetic transformation rules)
- Noun declension = (stem, vibhakti, vacana, liṅga) → form (a tensor of 24 cells per stem type)
- Verb conjugation = (dhātu, lakāra, puruṣa, vacana, pada) → form (a state machine of up to 180 forms per root)

**Layer 2 — Sentence Construction as Relations**

- Kāraka = semantic roles mapped to vibhakti (agent → NOM, object → ACC, etc.)
- Samāsa = word composition operations (A+B, B-of-A, one-who-has-A-B)
- Syntax = free word order with morphological agreement

### 6.2 Unit progression

| Unit | Layer | Content | Features | New content needed |
|---|---|---|---|---|
| **1. Sounds** | 0 | Varṇamāla, vowel/consonant classification, pronunciation, the 5×5 grid | varna coverage | Lesson text for phonetic classification |
| **2. First Words** | 1 | NOM.SG, ACC.SG, PRES.3SG, basic sentences with a-stem nouns | NOM.SG, ACC.SG, PRES.3SG | Lesson: "what is a case?" / "what is a verb?" |
| **3. More Cases** | 1 | INSTR.SG, DAT.SG, ABL.SG, GEN.SG, LOC.SG, VOC.SG | All 8 vibhakti-singular | Lesson: each vibhakti's meaning + examples |
| **4. Numbers** | 1 | Dual, Plural, all case+number combinations | DU, PL, NOM.DU, ACC.DU, NOM.PL, ACC.PL, GEN.PL, LOC.PL | Lesson: "Sanskrit has 3 numbers, not 2" |
| **5. Persons** | 1 | All 3 persons × 3 numbers in present tense | PRES.1SG through PRES.3PL | Lesson: puruṣa system, the 9-cell grid |
| **6. Sandhi** | 1 | Vowel, visarga, anusvāra, consonant sandhi — rules as functions | VOWEL-SANDHI, VISARGA-SANDHI, ANUSVARA-SANDHI, CONSONANT-SANDHI | Lesson: "sandhi is f(a,b)→c" with visual examples |
| **7. Genders** | 1 | Masculine, feminine, neuter declension patterns across stem types | MASC, FEM, NEUT | Lesson: liṅga system, stem-type patterns |
| **8. More Tenses** | 1 | Imperative, imperfect, future — the first 4 lakāras | IMP.2SG + new lakāra features | Lesson: "lakāras are time states and mood states" |
| **9. Voices** | 1 | Parasmaipada vs ātmanepada, when to use which | PARASMAIPADA, ATMANEPADA | Lesson: pada system, transitive vs reflexive |
| **10. Compounds** | 2 | Samāsa: dvandva, tatpuruṣa, bahuvrīhi, avyayībhāva | **NEW features** | **NEW: samāsa taxonomy, lessons, challenges** |
| **11. Kāraka** | 2 | The 6 thematic relations: kartṛ, karma, karaṇa, sampradāna, apādāna, adhikaraṇa | **NEW features** | **NEW: kāraka taxonomy, lessons, challenges** |

**Future units (post-v1):**

- Secondary derivation (taddhita suffixes)
- The remaining 6 lakāras (aorist, perfect, optative, benedictive, conditional, Vedic subjunctive)
- Vedic grammar differences
- Advanced sandhi (internal sandhi, spontaneous sandhi)
- Metre (chandas) for śloka recitation

### 6.3 The Lesson content type — new data model

Each Path node today goes directly to a challenge. The flow should be:

```
Lesson → Practice → Challenge
```

The **Lesson** is a new content type. Minimal schema:

| Field | Type | Purpose |
|---|---|---|
| `id` | string | Unique identifier |
| `feature_id` | string | FK to the feature it teaches |
| `unit_id` | string | FK to the unit it belongs to |
| `rank` | int | Order within the unit |
| `title_en` | string | English title ("What is a Vibhakti?") |
| `title_hi` | string | Sanskrit title ("विभक्तिः किम्?") |
| `body` | markdown | The lesson text (200–500 words) |
| `examples` | JSON array | 2–3 example sentences with parse |
| `visual_type` | enum | `grid` (declension), `tree` (sandhi), `state_machine` (conjugation), `none` |
| `visual_data` | JSON | Data to render the visual (Vidyut can generate this) |
| `audio_url` | string | Pre-rendered spoken version of the lesson |
| `register` | enum | `laukika` / `classical` |

**Source for lesson text:** Adapt from learnsanskrit.org (open source), verified against the Vidyut engine. Every claim in a lesson must be derivable by Vidyut — if the engine can't produce the form, the lesson cannot claim it.

---

## 7. Vocabulary and reading

### 7.1 Vocabulary curriculum

**Source:** Sanskrit WordNet (CC BY-SA 4.0) — 66,930 words, 46,440 synsets.

**Extraction plan:**

1. Cross-reference WordNet lemmas against DCS frequency data to find the top 500 most frequent words
2. Group by topic (family, food, travel, etc.) — the 10 situation slugs from `briefs.py` provide the topic structure
3. Create vocabulary lists that grow with the unit progression (Unit 2 gets 50 food/family words, Unit 4 gets 100 more, etc.)
4. Each word entry carries: Devanagari, IAST, meaning, gender, stem, and 2–3 example sentences from DCS

### 7.2 Graded reading

**Source:** DCS corpus (650,000+ lines, fully parsed).

**Extraction plan:**

1. Filter DCS for sentences up to 5 words, all words in the top 500 frequency list
2. Grade by: sentence length, number of features present, compound presence, register
3. Create a progressive reading path: 50 simple sentences (Unit 2–3) → 50 with sandhi (Unit 6) → 50 with compounds (Unit 10)
4. Each sentence carries: Devanagari, IAST, word-by-word breakdown, and the full Vidyut parse

---

## 8. The grounded-guru: future RAG connection

The user's eventual goal: connect the talking guru to Mahabharata, Ramayana, and other texts for grounded, cited answers.

### 8.1 What already exists for this

- **Two-index architecture** (§4.4) — classical index (DCS, GRETIL, epics) and laukika index, never merged. The classical index is where the epics live.
- **Vidyut segmentation** (§4.6) — the chunker that splits sandhi-fused text. Verse is chunked by verse; prose by sentence.
- **Gemini embeddings** — the vendor (Sarvam has no embeddings endpoint).
- **The ask engine** (U11) — already wired to `AskProvider` with `surface` and `subject` context. The ask button on the Grammar screen asks about the word on screen.

### 8.2 What needs to be built (future)

1. **Ingest the epics** — raw text → Vidyut segmentation → verse-by-verse chunks → Gemini embeddings → classical index
2. **Retrieval quality measurement** — the open risk from architecture.md §4.6: does a classical query ever retrieve laukika? Measure before shipping.
3. **Grounded answer pipeline** — user question → embed → retrieve top-k verses → Gemini Flash composes answer with citations → Vidyut validates any Sanskrit in the answer
4. **Licence clearance** — the CC0 translations (Griffith, Ganguly, Bühler) are Victorian-era and inaccurate. Use Sanskrit source text + Vidyut parse, not the translations as authority.

### 8.3 When

**Not now.** The curriculum (lessons, units, vocabulary, graded reading) is the prerequisite. The grounded-guru is a premium feature that depends on the corpus being ingested and the retrieval quality being measured. Architecture.md §4.6 explicitly says the corpus is small enough for a flat file of embeddings in RAM — no vector database is needed until the corpus outgrows RAM. That threshold is the bookshelf of epics, which is the trigger for pgvector.

---

## 9. What NOT to build

These are locked decisions from architecture.md, carried forward here:

1. **Not a scripture library.** Teach spoken Sanskrit first. The epics are a reading/retrieval feature, not a full curriculum.
2. **No local models.** The grounded-guru uses Gemini embeddings + Gemini Flash, both hosted APIs. No self-hosted inference.
3. **No PDF-based content delivery.** PDF is a dead format for a learning app. Content is structured, queryable, and served via API.
4. **No curriculum in the APK** (except the varṇamālā audio bank). The curriculum changes too fast; the APK is too slow to update.
5. **No vector database in v1.** A flat file of embeddings in RAM answers all three RAG callers today. pgvector comes when the corpus outgrows RAM.

---

## 10. Open questions

| # | Question | Blocks |
|---|---|---|
| ~~1~~ | **ANSWERED 2026-09-08.** The guide states *"This page is available under a CC BY 4.0 International license"*; the site code is public domain. Source format is **SML**, a custom lightweight markup, under `content/`. ~100 pages: 17 core lessons + ~77 topic sections + appendices. **Usable with attribution** — and the attribution surface must ship first (`Settings.tsx`'s "Licences and credits" row is a no-op today). See `LESSON_OVERHAUL.md` §3 and P23-4. | ~~Lesson text extraction~~ — unblocked |
| 2 | **ANSWERED 2026-09-08 — do NOT ingest without written permission.** The doc's "CC BY-SA 4.0" was wrong. The Sanskrit WordNet site states the WordNet under **GNU GPL 3.0**, the lexicon under **GNU FDL**, "freely available for **research purposes only**", commercial use by written request; the IWN-En GitHub export (with Sanskrit synsets) is **CC BY-NC-SA 4.0**. Every variant is NonCommercial/research-only + copyleft/share-alike — unusable in a commercial app as-is. Options: (a) write CFILT (pb@cse.iitb.ac.in) for commercial permission, or (b) drop WordNet and build vocab-500 from DCS frequency (CC BY 3.0, Q3) + the approved pool. Owner decision. | Vocabulary curriculum |
| 3 | **ANSWERED 2026-09-08 — yes, the GitHub export suffices.** `cltk/sanskrit_text_dcs` holds hundreds of verse-numbered texts; DCS itself is **CC BY 3.0 Unported** (attribution only, commercial OK — impressum, Hellwig). Two caveats: the export is **IAST transliteration**, so convert IAST→Devanāgarī via `lipi` (deterministic, ₹0) before Vidyut parses; and it is **classical register** — laukika graded reading still needs Samskrita Bharati readers (verify licence per item). No raw dump needed. | Graded reading |
| 4 | Samāsa: does Vidyut's cheda module segment compounds reliably enough for auto-grading samāsa challenges? The cheda is "experimental" per tech-research.md. **2026-09-15:** `prakriya` has no samāsa derivation either, so the grammar guide's Compounds chapter teaches compound analyses as reference — only the sandhi joins, the declined compound and each word of the spelled-out analysis are engine-checked. Grading remains open. | Samāsa unit |
| 5 | Kāraka: does the kosha tag kāraka roles, or only vibhakti? If not, kāraka grading requires a new Vidyut feature or a heuristic. | Kāraka unit |
| 6 | Lesson internationalization: bridge languages are English + Hindi at launch (§1). Do lessons need Hindi versions from day one, or is English-first acceptable? **Partly answered 2026-09-15:** the Grammar tab's guide is fully bilingual from day one — every string authored in English *and* Hindi (not translated word for word), with a persisted toggle; a lint test fails any missing language. Lessons themselves are still English-first. | Lesson authoring |
| 7 | When does the corpus cross the RAM threshold that triggers pgvector? Depends on how many epic texts are ingested. | RAG infrastructure |
| ~~9~~ | **Not a question — a fix, 2026-09-15.** Feminine -ā/-ī/-ū stems were declined as if masculine (`Pratipadika.basic`: लता → लताः). `prakriya.derive` now uses nyāp for them, so FEM forms (लताम्, लतायै, नद्याः) are engine-derivable for lessons, exercises and grading. | ~~FEM steps~~ — unblocked |
| 8 | **ANSWERED 2026-09-09 — embed, never host; free section, no ads on it.** No openly licensed Sanskrit video course exists (§4.4), so video is embedded from official institutional channels under YouTube's ToS rather than adopted like learnsanskrit.org. Two independent gates: YouTube's Developer Policies III.F.3.a (*"API Clients must not charge users to watch content in an embedded YouTube player"* — hence the video section is free and unpaywalled) and App Store review 5.2.3, which is a *reviewer* risk rather than a legal one and is low for video-inside-an-owned-lesson. **Permission is not required to embed**; keep an evidence file and escalate only on an actual rejection. See `DECISIONS.md` 2026-09-09 and `HANDOVER.md` §2.17. | ~~Video content~~ — unblocked |

---

## 11. Summary

| Layer | Status | Action |
|---|---|---|
| Engine (Vidyut) | Done | Nothing — it's already best-in-class |
| Feature taxonomy | Good skeleton, 2 gaps | Add samāsa and kāraka features |
| Lesson content | **22 lessons (Units 1–5 + U7–U9 + U6 sandhi, owner-curated 2026-09-08) in 65 gradable steps** | A lesson is a sequence of steps, not prose — `LESSON_OVERHAUL.md` (P23/U15, landed 2026-09-08); packets: `results/u4/u5/u7/u8/u9-curation-packet.md` |
| Unit structure | **Landed 2026-09-08** | `units` table + `seeds/units.py`; `Unit.layer` carries §6.1's three layers; Path renders units |
| Exercise generation | **Landed 2026-09-08** | `services/exercise_gen.py`: 7 engine-backed kinds, no table, no review queue — the engine that poses marks |
| Review schedule | **Landed 2026-09-08** | `review_items` (item-level due dates, stability, lapses); Home shows the honest due count |
| Licence registry | **Landed 2026-09-08** | `content_sources` (5 rows); every content row points at a key; `GET /licences` + screen |
| Vocabulary | Shipped (87 words: 60 original + 27 DCS, all with glosses) + 439 staged candidates | Curation continues per-word (WordNet STOP — Q2; Mitrasaṃgraha gloss-only) |
| Graded reading | Seeded (3 tiers from servable content) | Extract from DCS, grade by complexity |
| Audio | Pipeline exists | Pre-render lessons as they are authored |
| Corpus (RAG) | Deferred | Flat file in memory now; pgvector + epic ingestion later |