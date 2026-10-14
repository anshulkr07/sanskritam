# Scripture sources survey — gaps in DB vs. what's legally available online

Date: 2026-10-14. Two sub-investigations: (1) exact verse inventory queried from `backend/app.db` (+ `handover_reading_shelf_result.md`), (2) license check of online repositories. Goal per owner: for each missing book, know whether we can get **Sanskrit (Devanagari) + roman (optional) + Hindi/English meaning** under a usable license — scraping only as a later fallback.

**Key pipeline fact:** our paged-book builder **derives IAST from Devanagari** automatically (Vidyut word-breakdown too). So the roman layer is never a blocker — any clean Devanagari source gives us all three text layers except translation.

**Key policy facts (already in our code):**
- `backend/app/seeds/licences.py`: GRETIL = CC BY-NC-SA 4.0, **free shelf only**; GRETIL / sanskritdocuments / TITUS / Muktabodha / Vedabase are **never** a source for a Plus book.
- `routers/canon.py` notes: bulk-importing the whole Mahābhārata is explicitly forbidden (TTS cost).

---

## 1. Baseline — what's already in the DB (2,200 verses)

| Status | Books |
|---|---|
| **Full, complete** | Bhagavad Gītā (700, +EN+HI, MIT dataset), Īśopaniṣad (18), Aṣṭāvakra Gītā (298), Yoga Sūtra (195), Meghadūta (122), Nārada Bhakti Sūtra (84), Rāmarakṣā (38), Āditya Hṛdayam (31), Bhaja Govindam (31), Māṇḍūkya Up. (12) |
| **Selections only** | Mahābhārata (194 of ~75k), Rāmāyaṇa (63 of ~24k), Hitopadeśa (108), Nītiśataka (104), Vairāgya+Śṛṅgāra śatakas (82), Katha Up. (40/120), Pañcatantra (35), Muṇḍaka Up. (23/64), Manusmṛti (5), Taittirīya/Brhadāraṇyaka/Mokṣopāya (1 each) |
| **Built but never imported** (stoppages, see `books/*.report.json`) | katha-complete (120), mundaka-complete (64), chanakya (361), kena (26), lilavati (170), tandava (13) — **quick wins already built** |

## 2. Gap list — what is NOT in the DB, and where it can come from

### 2a. Vedas — 0 verses imported (all 4 are catalogue-only rows)

| Text (our slug, verses planned) | Sanskrit Devanagari | English | Hindi |
|---|---|---|---|
| Ṛgveda (`rigveda`, 10,552) | ✅ sa.wikisource (CC BY-SA 4.0); GRETIL Van Nooten/Holland + Aufrecht (NC — free shelf); **VedaWeb Cologne (CC BY 4.0, cleanest)** | ✅ Griffith 1896 + Müller SBE 32 — public domain (sacred-texts.com) | ❌ no clean open source (see §3) |
| Sāmaveda (`samaveda`, 1,875) | ⚠️ GRETIL (NC); sa.wikisource partial (CC BY-SA 4.0) | ✅ Griffith 1895 PD | ❌ |
| Śukla Yajurveda (`yajurveda`, 1,975) | ⚠️ GRETIL Vājasaneyi (NC); sa.wikisource (CC BY-SA) | ✅ Griffith 1899 PD | ❌ |
| Kṛṣṇa Yajurveda (Taittirīya Saṃhitā) — **not even in catalogue** | ⚠️ GRETIL (partly via TITUS = restricted); sanskritdocuments has it but terms are personal-study only | ✅ Keith 1914 SBE PD | ❌ |
| Atharvaveda (`atharvaveda`, 5,650) | ⚠️ GRETIL both recensions (NC) | ✅ Griffith 1895-96 + Bloomfield SBE 42 PD | ❌ |
| Brāhmaṇas / Āraṇyakas — **not catalogued at all** | ⚠️ GRETIL (Aitareya, Śatapatha, Kauṣītaki, Pañcaviṃśa, Gopatha…) | ✅ Śatapatha: Eggeling SBE PD; Aitareya: Keith PD | ❌ |

**Verdict:** Ṛgveda is importable *today* with clean licenses (Sanskrit CC BY-SA / CC BY + English PD + auto-IAST). The other three Vedas have GRETIL-only Sanskrit → usable on the **free shelf only** per our policy. Hindi is the universal gap (§3).

### 2b. Upaniṣads — 2 full, 2 partial, 7 catalogued with zero verses, 2+95 not catalogued

Principal 13 status: Īśā ✅ full · Katha ⚠️ 40/120 (120 built, unimported) · Muṇḍaka ⚠️ 23/64 (64 built, unimported) · Māṇḍūkya ✅ full · **Kena, Praśna, Taittirīya, Aitareya, Chāndogya, Brhadāraṇyaka, Śvetāśvatara — catalogue rows only** · Kauṣītaki, Maitrāyaṇīya — not catalogued · the other ~95 of the Muktikā 108 — not catalogued.

| Layer | Best sources |
|---|---|
| Sanskrit | sa.wikisource (CC BY-SA 4.0) for the principal ones; Ambuda has **80 Upaniṣads** with per-text licenses in the TEI header (our 4 Ambuda imports were CC0; SARIT-derived = CC BY-SA 3.0; GRETIL-derived = CC BY-NC-SA); sanskritdocuments has ~150 incl. Śaṅkara-bhāṣya but terms = personal study only |
| English | ✅ Max Müller SBE vols 1 & 15 covers the principal Upaniṣads — public domain (sacred-texts); Aiyar's *Thirty Minor Upaniṣads* 1914 PD for minors |
| Hindi | ❌ Gita Supersite has Hindi for all of them but **no stated terms** (modern translations = copyrighted) → not clean |

**Verdict:** all 13 principal Upaniṣads are doable now with clean licenses (sa-wikisource/Ambuda-clean + Müller EN + auto-IAST). The 95 minor ones: Ambuda per-text headers, case-by-case.

### 2c. Purāṇas — 0 verses; only 3 of 18 Mahāpurāṇas even catalogued

Catalogued: Bhāgavata (14,067), Śiva, Garuḍa (11,957, marked GRETIL/free), plus Devī Māhātmya (587). **Not catalogued:** the other 15 (Agni, Brahma, Brahmāṇḍa, Kūrma, Liṅga, Mārkaṇḍeya, Matsya, Nārada, Padma, Skanda, Vāmana, Varāha, Vāyu, Viṣṇu…).

| Layer | Best sources |
|---|---|
| Sanskrit | GRETIL has ~19 Purāṇas incl. Bhāgavata/Śiva/Garuḍa (CC BY-NC-SA → free shelf only); sa.wikisource coverage partial (CC BY-SA 4.0) |
| English | ✅ Viṣṇu (Wilson 1840), Garuḍa (Wood & Subrahmanyam 1911), Devī Bhāgavata (Vijñānānanda 1921) — PD. ❌ **Bhāgavata and Śiva Purāṇa have no verified clean/PD complete English translation** (Prabhupāda = Vedabase-adjacent, banned; Motilal translations copyrighted) |
| Hindi | ❌ Gita Press Bhāgavata/Śiva Purāṇa = free-to-read but copyrighted |

**Verdict:** Sanskrit layer fine via GRETIL (free shelf); Devī Māhātmya is easy on all clean layers (small, Sanskrit on wikisource, old PD English translations). The two big catalogued Purāṇas (Bhāgavata, Śiva) are blocked on translations — only Sanskrit+IAST is cleanly available.

### 2d. Epics — full texts absent (and Mahābhārata bulk import is against our own policy)

- **Rāmāyaṇa full:** Sanskrit — sa.wikisource CC BY-SA; GRETIL southern recension (NC); IIT-K valmiki.iitk.ac.in = Baroda Critical Edition, **rights unstated** (avoid). English — M.N. Dutt 1891-94 PD (we already use it), Griffith PD. Hindi — Gita Press copyrighted; Rāmacaritamānasa (different work, Tulsidas) original is PD.
- **Mahābhārata full:** Sanskrit — GRETIL full 18 parvans + Harivaṃśa (NC); sa.wikisource CC BY-SA. English — Ganguli 1883-96 PD. **But our canon.py note forbids bulk import (TTS cost) — keep to curated selections.**
- Harivaṃśa: GRETIL; not catalogued.

### 2e. Stotras & rest of catalogue (all zero verses, all small/quick)

| Text | Sanskrit clean source | English | Notes |
|---|---|---|---|
| Viṣṇu Sahasranāma (170) | sa.wikisource / Ambuda | PD translations abundant | easy |
| Lalitā Sahasranāma | sa.wikisource / sanskritdocuments (restricted) | older PD translations exist | easy |
| Saundarya Laharī | sa.wikisource | PD prose/poetry translations exist | easy |
| Śiva Tāṇḍava (13) | **already built** (tandava payload, stopped) | — | re-import |
| Śiva Mahimna | sa.wikisource | PD | easy |
| Kumārasambhava, Raghuvaṃśa, Śākuntala, Gītagovinda, Vetāla Pañcaviṃśati | GRETIL (NC) / SARIT per-text CC BY-SA 3.0 | kāvya translations mostly 20th-c. copyrighted; check en.wikisource per text | Meghadūta precedent: DCS **CC BY 4.0** |
| Haṭhayogapradīpikā | GRETIL (NC) | Pancham Sinh 1915 PD | |
| Arthaśāstra (marked GRETIL/free) | GRETIL | Shamasastry 1915 PD | |
| Līlāvatī (272, GRETIL/free) | **already built** (170/272, stopped) | — | finish re-import |
| Amarakośa (3,134) | GRETIL | — | reference work, no translation needed? |
| Chāṇakya Nīti (345) | **already built** (361 vs 345 ref mismatch, stopped) | — | resolve count, re-import |
| Caraka / Suśruta Saṃhitā | GRETIL; SARIT has both with per-text CC | older translations mixed | big medical texts, index-only row |
| Brahmasūtra — **not catalogued** | GRETIL (+ Śaṅkara-bhāṣya) | Thibaut SBE 34/38/48 PD | natural addition |

## 3. The Hindi layer — the real gap everywhere

Checked: hi.wikisource (sparse), Gita Supersite (Hindi for Gītā/Upaniṣads/Rāmāyaṇa but **no terms posted; modern translations copyrighted**), Geeta Press ebooks (free-to-read, explicitly copyrighted), Vedic Heritage Portal vedicheritage.gov.in (all-4-Veda Hindi, government, free PDFs, **no open license**), Arya Samaj/Dayananda Veda-bhāṣyas (public domain by age — but only scanned, scattered on archive.org, needs OCR).

**Conclusion:** there is no clean, open-licensed Hindi translation corpus for Vedas/Purāṇas/Upaniṣads online. Practical paths, in order:
1. PD-scan OCR (Dayananda for Vedas; pre-1940s Hindi translations on archive.org) — legal, labor-heavy.
2. Ask permission (Gita Press / IGNCA) — slow, uncertain.
3. Scrape-then-ask-later (owner's stated fallback) — legally fragile, keep off Plus shelf.
4. Ship Sanskrit+IAST+EN now; Hindi as a later layer per book (Gītā already has HI — precedent is the MIT dataset).

## 4. Source-by-source license reference

| Source | License | Sanskrit | Roman | EN | HI | Use for |
|---|---|---|---|---|---|---|
| sa.wikisource | CC BY-SA 4.0 | ✅ | (derive) | — | — | default Sanskrit source |
| Ambuda | per-text TEI header (CC0 / CC BY-SA 3.0 / CC BY-NC-SA) | ✅ | ✅ site view | rare | rare | stotras, Upaniṣads |
| GRETIL | "reference only, terms as source" + CC BY-NC-SA 4.0 (TEI set) | ✅ (biggest corpus) | ✅ ITRANS `_u` files | — | — | free shelf only |
| sacred-texts / en.wikisource | public-domain pre-1929 translations (hosting CC BY-SA) | some | some | ✅ | — | English layer |
| DCS | CC BY 4.0 | ✅ | (derive) | — | — | kāvya/epic (already used) |
| SARIT | per-text, mostly CC BY-SA 3.0 | ✅ | ✅ IAST view | — | — | śāstra, Caraka/Suśruta |
| VedaWeb (Cologne) | Rigveda corpus CC BY 4.0 | ✅ | ✅ | — | — | Ṛgveda |
| MuseMesh/sansar corpus (HF) | per-record SPDX, compilation CC BY 4.0, **GRETIL excluded** | ✅ bulk | — | — | — | commercial-safe bulk alternative |
| sanskritdocuments | informal personal-study policy | ✅ | ✅ | links | links | reference only, don't import |
| IIT-K Gita/Valmiki supersites | unstated; modern translations copyrighted | ✅ | — | ✅* | ✅* | *not usable for import |
| Geeta Press | free-to-read, copyrighted | — | — | — | ✅* | *not usable for import |
| Dead ends | — | holybooks.com (redirects to a parked store), veda-hymns.com (DNS dead), vedaweb.ub-frankfurt (moved to Cologne) | | | | |

## 5. Recommended order of attack

1. **Re-import the 6 already-built books** (katha, mundaka, chanakya, kena, lilavati, tandava) — zero new sourcing.
2. **Ṛgveda** — the only Veda with fully-clean licensing (VedaWeb CC BY 4.0 / sa-wikisource + Griffith EN PD); no Hindi though.
3. **7 principal Upaniṣads** (Kena, Praśna, Taittirīya, Aitareya, Chāndogya, Brhadāraṇyaka, Śvetāśvatara) — sa-wikisource + Müller EN PD.
4. **Small stotras + Devī Māhātmya** — easy clean wins.
5. **Purāṇas Sanskrit-only** (Bhāgavata, Śiva, Garuḍa) — GRETIL free shelf; accept EN/HI absent.
6. **Hindi layer** — needs a separate decision (§3); scraping fallback per owner.
