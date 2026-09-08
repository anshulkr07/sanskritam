# Spec E — Varṇamālā + pronunciation surface (build order step 5)

> **Status (audited 2026-09-08): §2–4 unbuilt.** The display grid
> (`GET /grammar/varnamala`) + client articulation map + pronunciation mic are
> live; the data extensions below (ids, example words, minimal pairs, contrast
> groups, progress endpoints) are not. `_PLACES` `ca`/`च` bug still in tree.

## Context

Sanskritam (`D:\Projects\Shabd`) backend, FastAPI + SQLAlchemy, Python 3.11, Windows/git-bash, venv `backend/.venv`.

Implements **architecture.md §13**. This is the entry surface and it is currently missing entirely: a learner who cannot pronounce त versus ट cannot be graded fairly on anything else, and a diaspora learner who cannot read Devanagari has no way into the app at all.

**Read §13 and §6.2 before starting.** The two constraints that shape this surface:

- **API-only. No local models, anywhere** (§1). Audio is Bulbul; recognition is Saaras. Nothing self-hosted.
- **No true forced alignment exists for us** (§6.2). No hosted API returns phone-level alignments, so pronunciation "grading" can only be transcript-vs-known-target comparison. That is why v1 below ships **no automated scoring at all**.

## What already exists

`backend/app/seeds/varnamala.py` holds a display-only grid (`VARNAMALA_DATA`, grouped `vowels`/`consonants`/`nasals`/`others`) served at `GET /grammar/varnamala` via `app/routers/grammar.py`, with tests in `tests/test_content.py`. It has devanagari, iast, place, voicing, kind — and **no ids, no example words, no minimal pairs, no audio**. Extend it; do not start over, and keep `/grammar/varnamala` working since tests depend on it.

Note: `_PLACES` in that file is dead code (referenced only by its own definition) and contains a bug — the `talavya` row has `"ca"` where `"च"` belongs. Delete it rather than fixing it.

## 1. Data — extend `app/seeds/varnamala.py`

Add to every cell: `id`, `example_devanagari`, `example_iast`, `example_gloss`, `minimal_pairs`.

**Ids are stable, ASCII, and permanent.** They become audio filenames and the keys of learner progress, so a rename silently orphans a learner's history. Retroflex = doubled first letter, which is what keeps `ta`/`tta` and `sa`/`ssa` apart.

### Vowels (svara) — 14

| id | dev | IAST | place | example | gloss |
| --- | --- | --- | --- | --- | --- |
| `a` | अ | a | kanthya | अग्निः agniḥ | fire |
| `aa` | आ | ā | kanthya | आकाशः ākāśaḥ | sky |
| `i` | इ | i | talavya | इन्द्रः indraḥ | Indra |
| `ii` | ई | ī | talavya | ईश्वरः īśvaraḥ | lord |
| `u` | उ | u | oshthya_kanthya | उदकम् udakam | water |
| `uu` | ऊ | ū | oshthya_kanthya | ऊर्मिः ūrmiḥ | wave |
| `ri` | ऋ | ṛ | murdhanya | ऋषिः ṛṣiḥ | seer |
| `rii` | ॠ | ṝ | murdhanya | — | — |
| `li` | ऌ | ḷ | dantya | — | — |
| `lii` | ॡ | ḹ | dantya | — | — |
| `e` | ए | e | kanthya_talavya | एकम् ekam | one |
| `ai` | ऐ | ai | kanthya_talavya | ऐरावतः airāvataḥ | Indra's elephant |
| `o` | ओ | o | kanthya_oshthya | ओष्ठः oṣṭhaḥ | lip |
| `au` | औ | au | kanthya_oshthya | औषधम् auṣadham | medicine |

`rii`, `li` and `lii` occur so rarely in attested Sanskrit that no honest example word exists — `ḹ` is purely theoretical. **Leave the example fields empty. Do not invent a word to fill the column,** and make sure the client renders a blank example gracefully.

### Stops (sparśa) — 5 vargas × 5

Column order is the traditional one: voiceless, voiceless-aspirated, voiced, voiced-aspirated, nasal.

| varga (place) | 1 | 2 | 3 | 4 | 5 (nasal) |
| --- | --- | --- | --- | --- | --- |
| kanthya | `ka` क | `kha` ख | `ga` ग | `gha` घ | `nga` ङ |
| talavya | `ca` च | `cha` छ | `ja` ज | `jha` झ | `nya` ञ |
| murdhanya | `tta` ट | `ttha` ठ | `dda` ड | `ddha` ढ | `nna` ण |
| dantya | `ta` त | `tha` थ | `da` द | `dha` ध | `na` न |
| oshthya | `pa` प | `pha` फ | `ba` ब | `bha` भ | `ma` म |

Example words: `ka` कमलम् kamalam lotus · `kha` खगः khagaḥ bird · `ga` गजः gajaḥ elephant · `gha` घटः ghaṭaḥ pot · `nga` अङ्गम् aṅgam limb · `ca` चन्द्रः candraḥ moon · `cha` छत्रम् chatram umbrella · `ja` जलम् jalam water · `jha` झषः jhaṣaḥ fish · `nya` पञ्च pañca five · `tta` पटः paṭaḥ cloth · `ttha` कण्ठः kaṇṭhaḥ throat · `dda` डमरुः ḍamaruḥ drum · `ddha` मूढः mūḍhaḥ foolish · `nna` गणः gaṇaḥ group · `ta` तरुः taruḥ tree · `tha` रथः rathaḥ chariot · `da` दन्तः dantaḥ tooth · `dha` धनम् dhanam wealth · `na` नदी nadī river · `pa` पत्रम् patram leaf · `pha` फलम् phalam fruit · `ba` बलम् balam strength · `bha` भानुः bhānuḥ sun · `ma` मित्रम् mitram friend

`nga` and `nya` never begin a word, which is why their examples are medial.

### Semivowels, sibilants, ayogavāha — 10

| id | dev | IAST | place | kind | example | gloss |
| --- | --- | --- | --- | --- | --- | --- |
| `ya` | य | ya | talavya | semivowel | यज्ञः yajñaḥ | sacrifice |
| `ra` | र | ra | murdhanya | semivowel | रविः raviḥ | sun |
| `la` | ल | la | dantya | semivowel | लता latā | creeper |
| `va` | व | va | oshthya_dantya | semivowel | वनम् vanam | forest |
| `sha` | श | śa | talavya | sibilant | शिवः śivaḥ | Śiva |
| `ssa` | ष | ṣa | murdhanya | sibilant | षट् ṣaṭ | six |
| `sa` | स | sa | dantya | sibilant | सूर्यः sūryaḥ | sun |
| `ha` | ह | ha | kanthya | aspirate | हस्तः hastaḥ | hand |
| `am` | अं | aṃ | — | anusvara | संस्कृतम् saṃskṛtam | Sanskrit |
| `ah` | अः | aḥ | — | visarga | रामः rāmaḥ | Rāma |

For `am`/`ah` carry both forms: `devanagari` as the अ-carrier display form above, plus `mark` (`ं`, `ः`) for clients that render the bare combining mark. The existing file stores only the bare mark — that displays badly on its own.

**Total: 49 varṇas** (14 vowels + 25 stops + 10 semivowels/sibilants/
ayogavāha — the traditional 48 plus ḹ, which is purely theoretical but
tabled with an empty example like ṝ/ḷ).

## 2. Contrast groups — the drill sets

§13: the alphabet is already sorted by place of articulation, so every वर्ग row *is* a controlled minimal-pair set. Add a `CONTRAST_GROUPS` constant, ordered hardest-first, and derive each cell's `minimal_pairs` by inverting it (symmetric, order-preserving).

| id | label | pairs | why it is hard |
| --- | --- | --- | --- |
| `dental_retroflex` | Dental vs retroflex | ta/tta, tha/ttha, da/dda, dha/ddha, na/nna | Absent from English. Hindi and Marathi speakers have it; English-first learners must build it |
| `sibilants` | The three sibilants | sha/ssa, ssa/sa, sha/sa | Collapses to two or one in most learners' L1 |
| `aspiration` | Aspirated vs unaspirated | ka/kha, ga/gha, ca/cha, ja/jha, tta/ttha, dda/ddha, ta/tha, da/dha, pa/pha, ba/bha | Phonemic in Sanskrit, allophonic in English — learners hear one sound |
| `vowel_length` | Short vs long | a/aa, i/ii, u/uu, ri/rii | Changes meaning; easy to hear, hard to produce |
| `labial` | व vs ब | va/ba | Merged across much of eastern India |

Give each group a `note_en` explaining the difficulty in one sentence — it is learner-facing copy, not a code comment.

## 3. Audio bank

**Path convention, not a stored column.** This is static reference content that never changes at runtime, so derive `audio_url` at serve time rather than adding a table:

```
/audio/varnamala/{id}.wav           the akṣara itself
/audio/varnamala/{id}_example.wav   the example word
```

49 varṇas × 2 ≈ 98 clips (minus 3 empty examples = 95) — the bank §13 sizes, small enough to ship in the app bundle and work offline at zero marginal cost.

Render with the existing `scripts/render_sarvam.py` (Bulbul). Add `scripts/build_varnamala_items.py` emitting the `{id, text, lang}` item file it consumes. Render `hi-IN` today and re-run with `--sa-language sa-IN` once the Sarvam beta flag lands — flag change, no code change.

Serving: mount a static dir (`/audio` → `media/`) so the Expo client can fetch over LAN in dev. There is currently no static mount in `app/main.py`.

**Listen before rendering all 96.** Bulbul's Sanskrit is unheard (architecture.md §10) and an isolated akṣara is the least natural thing you can ask a TTS model to say — a model trained on connected speech may produce something unusable for `ङ` or `ऋ` in isolation. Render the five hardest first (`nga`, `nya`, `ri`, `ssa`, `ah`), listen, and only then batch. If isolated akṣaras come out badly, fall back to example-word audio only and say so.

## 4. API

- `GET /varnamala` — full grid with ids, examples, `minimal_pairs`, both `audio_url`s, plus `contrast_groups`. Keep `GET /grammar/varnamala` working unchanged for existing clients.
- `GET /varnamala/progress` — the learner's per-varṇa coverage.
- `POST /varnamala/practice` — `{varna_id, heard: bool, recorded: bool}`. Records a rep. **Returns no verdict** (see scope below).

Progress storage: add `varna_progress` JSON to `Learner` (`{varna_id: {reps, last_ts}}`), mirroring how `feature_mastery` already works. New Alembic migration; the chain head is `5f6a7b8c9d0e`. Do not add a `Varna` table — the varṇamālā is static reference data.

## 5. Scope for v1 — read this twice

**Ship the drill. Ship no scoring.**

v1 is: play reference audio → learner records an attempt → **play both back for self-comparison** → track coverage. That is already useful, and it carries **zero false-accusation risk**.

Do **not** build automated pronunciation scoring in this pass. Per §6.2 we cannot do true forced alignment, and per §13 the contrasts that matter are exactly where recogniser confidence is lowest. A learner wrongly told they mispronounced something loses trust permanently (§6.3), and on isolated akṣaras we cannot yet tell "said it wrong" from "recogniser misheard".

When scoring is added later it goes in **one contrast at a time, hardest last, each only after it clears a measured confidence bar on real learner audio** — and it drills the contrast inside a word (`पटः`) rather than on a bare letter wherever pedagogy allows, so the recogniser has context to work with.

## Constraints

- **No local models, no GPU, no torch.** Add nothing to `requirements.txt`.
- Do not modify `grading/`, `adaptive.py`, `turn_loop.py`, or the conversation routers.
- Keep `GET /grammar/varnamala` and `tests/test_content.py` green.
- Windows/git-bash: pure Python, no shell-only tricks. Write UTF-8 explicitly — Devanagari through a Windows console needs `PYTHONIOENCODING=utf-8`.

## Tests

- All 48 ids unique and stable; every cell has devanagari + iast + id.
- `minimal_pairs` is symmetric — if `ta` lists `tta`, then `tta` lists `ta`.
- Every id referenced in `CONTRAST_GROUPS` resolves to a real varṇa.
- The five places of articulation are present with IAST labels (existing invariant).
- `rii`/`li`/`lii` have empty examples and the endpoint still serves them.
- `POST /varnamala/practice` increments reps and returns no verdict field.
- Existing `tests/test_content.py` still passes unchanged.
