# Learn trail: structure (approved)

Drafted and approved by the owner on 13 October 2026 ("yes to all", plus square corners everywhere). Built the same day: the structure lives in `mobile/src/trail/course.ts` and `mobile/scripts/check-trail.cjs` guards it; see the 2026-10-13 entry in DECISIONS.md. Until a lesson is rebuilt as cards, its stop opens the Grammar note listed here. Visual mockups of the same structure: https://claude.ai/artifact/RBKLutZW8H1r1W6X5b3gPn

**5 stages · 21 units · 97 lessons.** A lesson is 6–10 cards (about 5 minutes). Each unit ends with practice: the old Path's graded lessons where they exist, otherwise a local review or an existing tool.

Status of the 97 lessons: **7 ready** (a card lesson exists), **87 rebuild** (the Grammar guide topic or a manuscript has the content; turn it into cards), **3 new** (write from scratch).

Images on hand = Learn V2 teaching images already mapped to that topic or lesson in `specs/learn-v2/image-delivery-index.json`.

## Stage 1 · Letters & sounds · अक्षराणि

**Goal:** Read any Devanagari word aloud.

### Unit 1 · Vowels · स्वराः

| # | Lesson | Built from | Images on hand | Status |
|---|---|---|---|---|
| 1 | Short and long vowels | guide: `vowels` | 4 | rebuild |
| 2 | ṛ, e, ai, o, au | guide: `vowels` | 4 | rebuild |
| 3 | Vowel signs on letters | — | — | new |

Practice: Sound map, Writing (existing tools)

### Unit 2 · Consonants · व्यञ्जनानि

| # | Lesson | Built from | Images on hand | Status |
|---|---|---|---|---|
| 1 | The consonant grid | guide: `consonants` | 3 | rebuild |
| 2 | Breath and voice: क ख ग घ | guide: `consonants` | 3 | rebuild |
| 3 | The hum and the breath: अं अः | guide: `anusvara-visarga` | — | rebuild |

Practice: Sound map, Writing (existing tools)

### Unit 3 · Reading words

| # | Lesson | Built from | Images on hand | Status |
|---|---|---|---|---|
| 1 | Joined letters: क्ष त्र ज्ञ | guide: `conjuncts` | — | rebuild |
| 2 | Roman letters (IAST) | guide: `reading-roman` | — | rebuild |
| 3 | Read your first words | — | — | new |

Practice: Writing (existing tool)

## Stage 2 · First sentences · वाक्यानि

**Goal:** Say who does what, to whom, and how many.

### Unit 4 · Who does what · कः किं करोति

| # | Lesson | Built from | Images on hand | Status |
|---|---|---|---|---|
| 1 | Endings do the work | guide: `how-it-works`, `stem-ending` | 3 | rebuild |
| 2 | He reads: पठति | guide: `verb-anatomy` | — | rebuild |
| 3 | The doer | guide: `nominative-vocative` | 2 | rebuild |
| 4 | The object | guide: `accusative` | 2 | rebuild |
| 5 | Any word order works | guide: `word-order` | 1 | rebuild |

Graded practice (old Path, server-scored): `SG` Sounds first, then singulars · `NOM.SG` What is a case? · `ACC.SG` The object: whom the action reaches · `PRES.3SG` What is a verb?

### Unit 5 · One, two, many · वचनम्

| # | Lesson | Built from | Images on hand | Status |
|---|---|---|---|---|
| 1 | One, two and many readers | cards: `verbs-number` | 3 | ready |
| 2 | Two of anything: the dual | guide: `number` | 3 | rebuild |
| 3 | Many: the plural | guide: `number` | 3 | rebuild |
| 4 | Objects in two and many | guide: `accusative` | 2 | rebuild |
| 5 | The verb matches its doer | guide: `subject-verb` | 2 | rebuild |

Graded practice (old Path, server-scored): `DU` Two is special: the dual · `PL` Many as an idea: what plural means · `NOM.DU` Two who act: nominative dual · `NOM.PL` Many: the plural · `ACC.DU` Two undergone: accusative dual · `ACC.PL` Many undergone: accusative plural · `PRES.3DU` Those two speak: third dual · `PRES.3PL` They speak: third plural

### Unit 6 · I and you · अहं त्वं च

| # | Lesson | Built from | Images on hand | Status |
|---|---|---|---|---|
| 1 | I and we | guide: `pronoun-i-we` | 3 | rebuild |
| 2 | You | guide: `pronoun-you` | 3 | rebuild |
| 3 | All nine verb forms | guide: `verb-grid` | 3 | rebuild |
| 4 | Polite you: भवान्, भवती | guide: `polite-you` | 2 | rebuild |
| 5 | To be: अस्मि, असि, अस्ति | guide: `to-be` | 3 | rebuild |

Graded practice (old Path, server-scored): `PRES.1SG` Who speaks: I and you · `PRES.1DU` We-two and you-two · `PRES.1PL` We (many) speak: first plural · `PRES.2PL` You (many) speak: second plural

### Unit 7 · He, she, it · लिङ्गम्

| # | Lesson | Built from | Images on hand | Status |
|---|---|---|---|---|
| 1 | Three genders | guide: `gender` | 3 | rebuild |
| 2 | सः, सा, तत् | guide: `pronoun-he-she-it` | 3 | rebuild |
| 3 | This one: एषः, एषा, एतत् | guide: `pronoun-this-that` | 3 | rebuild |
| 4 | Adjectives agree | guide: `agreement` | 3 | rebuild |

Graded practice (old Path, server-scored): `MASC` Masculine, and how you know · `FEM` Feminine: the pattern, honestly held · `NEUT` It changes everything: neuter

## Stage 3 · The eight cases · विभक्तयः

**Goal:** Say with what, for whom, from where, whose and where.

### Unit 8 · With, for, from

| # | Lesson | Built from | Images on hand | Status |
|---|---|---|---|---|
| 1 | The eight cases at a glance | guide: `cases-overview` | 1 | rebuild |
| 2 | With and by | guide: `instrumental` | 1 | rebuild |
| 3 | For and to | guide: `dative` | 2 | rebuild |
| 4 | From | guide: `ablative` | 2 | rebuild |

Graded practice (old Path, server-scored): `INSTR.SG` With what? The instrument · `DAT.SG` For whom? The recipient · `ABL.SG` From where? The source · `KARAKA-KARANA` With what: karana, the instrument · `KARAKA-SAMPRADANA` For whom: sampradana, the recipient · `KARAKA-APADANA` From where: apadana, the source

### Unit 9 · Of, in, and calling out

| # | Lesson | Built from | Images on hand | Status |
|---|---|---|---|---|
| 1 | Whose: of | guide: `genitive` | 2 | rebuild |
| 2 | In, on, at | guide: `locative` | 2 | rebuild |
| 3 | Calling out: हे राम | guide: `nominative-vocative` | 2 | rebuild |
| 4 | The roles behind the endings | guide: `karaka` | 1 | rebuild |
| 5 | Words that ask for a case | guide: `upapada` | 2 | rebuild |

Graded practice (old Path, server-scored): `GEN.SG` Whose? Belonging · `GEN.PL` Whose and where, for many · `LOC.SG` Where? The ground of action · `LOC.PL` Among many: locative plural · `VOC.SG` Calling out: the address · `KARAKA-KARTR` Who does: kartr, the agent · `KARAKA-KARMA` What is reached: karma, the object · `KARAKA-ADHIKARANA` Where: adhikarana, the locus

### Unit 10 · Noun families · शब्दरूपाणि

| # | Lesson | Built from | Images on hand | Status |
|---|---|---|---|---|
| 1 | देव and फल | guide: `a-masculine`, `a-neuter` | 2 | rebuild |
| 2 | लता and नदी | guide: `aa-feminine`, `ii-uu-feminine` | 2 | rebuild |
| 3 | कवि, मति, गुरु, धेनु | guide: `i-stems`, `u-stems` | 4 | rebuild |
| 4 | पितृ and मातृ | guide: `r-stems` | 3 | rebuild |
| 5 | राजन्, मनस्, जगत् | guide: `consonant-stems` | — | rebuild |
| 6 | Odd ones: गो | guide: `odd-nouns` | 1 | rebuild |

Practice: Noun forms (existing tool)

### Unit 11 · Pronouns & numbers · सर्वनामानि सङ्ख्याश्च

| # | Lesson | Built from | Images on hand | Status |
|---|---|---|---|---|
| 1 | This and that, in every case | guide: `pronoun-this-that` | 3 | rebuild |
| 2 | Who, what, which | guide: `pronoun-who-which` | 3 | rebuild |
| 3 | Numbers 1–10 | guide: `numbers-1-10` | 3 | rebuild |
| 4 | Big numbers and the time | guide: `numbers-big-time` | 1 | rebuild |

Practice: review of the unit's checks (no graded set exists)

## Stage 4 · Time & action · कालः क्रिया च

**Goal:** Talk about yesterday and tomorrow, ask, and give instructions.

### Unit 12 · Small words · अव्ययानि

| # | Lesson | Built from | Images on hand | Status |
|---|---|---|---|---|
| 1 | Words that never change | guide: `indeclinables` | 2 | rebuild |
| 2 | च, वा, अपि, एव, तु | guide: `joining-words` | 2 | rebuild |
| 3 | Where, when, how? | guide: `question-place-time`, `questions` | 3 | rebuild |
| 4 | Saying no: न and मा | guide: `na-ma` | 3 | rebuild |
| 5 | इति: quotes and thoughts | guide: `iti` | 2 | rebuild |

Graded practice (old Path, server-scored): `INDECL` Words that never change: avyaya

### Unit 13 · Tenses & moods · लकाराः

| # | Lesson | Built from | Images on hand | Status |
|---|---|---|---|---|
| 1 | Ten lakāras at a glance | guide: `lakaras-overview`, `present-tense` | 6 | rebuild |
| 2 | Commands: पठ, पठत | guide: `command-mood` | 1 | rebuild |
| 3 | The past: अपठत् | guide: `simple-past` | 3 | rebuild |
| 4 | The future: पठिष्यति | guide: `future-tense` | 2 | rebuild |
| 5 | Should, may: पठेत् | guide: `should-may` | 2 | rebuild |
| 6 | The story past | guide: `story-past` | 2 | rebuild |

Graded practice (old Path, server-scored): `IMP.2SG` Order one: the singular imperative · `IMP.2PL` Orders to many: the imperative · `IMPF.3SG` What already happened: the imperfect · `FUT.1SG` What will happen: the future · `FUT.3SG` He will: third future

### Unit 14 · How verbs are built

| # | Lesson | Built from | Images on hand | Status |
|---|---|---|---|---|
| 1 | -ti and -te: two sets of endings | guide: `two-endings` | 2 | rebuild |
| 2 | The ten verb classes | guide: `verb-classes` | 2 | rebuild |
| 3 | Prefixes change the meaning | guide: `prefixes` | 2 | rebuild |
| 4 | The passive: पठ्यते | guide: `passive` | 3 | rebuild |
| 5 | Making someone do: पाठयति | guide: `causative` | 2 | rebuild |

Graded practice (old Path, server-scored): `PARASMAIPADA` Outward voice: parasmaipada · `ATMANEPADA` For others, for self: the two voices

### Unit 15 · Words made from verbs · कृदन्ताः

| # | Lesson | Built from | Images on hand | Status |
|---|---|---|---|---|
| 1 | Having done: -त्वा, -य | guide: `ktva-lyap` | 1 | rebuild |
| 2 | In order to: -तुम् | guide: `tumun` | 2 | rebuild |
| 3 | Done, has done: -त, -तवत् | guide: `kta-ktavatu` | 3 | rebuild |
| 4 | While doing: -अत्, -मान | guide: `present-participles` | 2 | rebuild |
| 5 | Must be done: -तव्य, -अनीय | guide: `gerundives` | 1 | rebuild |
| 6 | Doers and actions: पाठकः | guide: `doer-action-nouns` | — | rebuild |

Practice: review of the unit's checks (no graded set exists)

## Stage 5 · Reading real Sanskrit · पठनम्

**Goal:** Read a verse, split its joins and unpack its compounds.

### Unit 16 · Vowels that join · सन्धिः

| # | Lesson | Built from | Images on hand | Status |
|---|---|---|---|---|
| 1 | Where words meet | guide: `sandhi-why`; cards: `sandhi-boundary` | — | ready |
| 2 | Two vowels of one family | guide: `sandhi-long-vowels`; cards: `sandhi-like-vowels` | — | ready |
| 3 | When a meets a different vowel | guide: `sandhi-guna`, `sandhi-vrddhi`, `guna-vrddhi`; cards: `sandhi-a-combinations` | 1 | ready |
| 4 | A vowel becomes a glide | guide: `sandhi-yan`; cards: `sandhi-glides` | — | ready |
| 5 | The special e and o | guide: `sandhi-ayadi`; cards: `sandhi-e-o` | — | ready |
| 6 | When the rule stops | cards: `sandhi-protected` | — | ready |

Graded practice (old Path, server-scored): `VOWEL-SANDHI` Sandhi is a function: f(a, b) → c

### Unit 17 · Visarga and consonants

| # | Lesson | Built from | Images on hand | Status |
|---|---|---|---|---|
| 1 | aḥ and āḥ | guide: `sandhi-visarga`; cards: `sandhi-source-a-visarga` | — | rebuild |
| 2 | Visarga beyond aḥ | cards: `sandhi-source-visarga-more` | 2 | rebuild |
| 3 | Final stops follow their neighbour | guide: `sandhi-consonants`; cards: `sandhi-source-stops` | 4 | rebuild |
| 4 | Nasals and inserted sounds | cards: `sandhi-source-nasals` | 2 | rebuild |
| 5 | Split a join | guide: `sandhi-splitting`; cards: `sandhi-source-reading` | 1 | rebuild |

Graded practice (old Path, server-scored): `VISARGA-SANDHI` The breathing that changes: visarga · `ANUSVARA-SANDHI` The nose takes over: anusvara · `CONSONANT-SANDHI` Stops meet stops: consonant sandhi

### Unit 18 · Compounds · समासाः

| # | Lesson | Built from | Images on hand | Status |
|---|---|---|---|---|
| 1 | Words inside words | guide: `compounds-intro` | — | rebuild |
| 2 | Dvandva: X and Y | guide: `dvandva` | 3 | rebuild |
| 3 | Tatpuruṣa: X's Y | guide: `tatpurusha`, `nan-upapada` | 2 | rebuild |
| 4 | Karmadhāraya and dvigu | guide: `karmadharaya-dvigu` | — | rebuild |
| 5 | Bahuvrīhi: one who has | guide: `bahuvrihi` | 1 | rebuild |
| 6 | Avyayībhāva | guide: `avyayibhava` | — | rebuild |
| 7 | Reading long compounds | guide: `long-compounds` | — | rebuild |

Graded practice (old Path, server-scored): `SAMASA-DVANDVA` Both-and: dvandva compounds · `SAMASA-TATPURUSA` Of-him: tatpurusha compounds · `SAMASA-BAHUVRIHI` One-who-has: bahuvrihi compounds · `SAMASA-AVYAYIBHAVA` Never-declined: avyayibhava compounds

### Unit 19 · Word-making suffixes · तद्धिताः

| # | Lesson | Built from | Images on hand | Status |
|---|---|---|---|---|
| 1 | Son of: राघव | guide: `son-of-names` | — | rebuild |
| 2 | -ness: -त्व, -ता | guide: `tva-ta` | — | rebuild |
| 3 | Having and related: -वत्, -इक | guide: `vat-mat`, `ika` | — | rebuild |
| 4 | More and most: -तर, -तम | guide: `comparison` | — | rebuild |
| 5 | Making feminines | guide: `feminine-suffixes` | 1 | rebuild |

Practice: review of the unit's checks (no graded set exists)

### Unit 20 · Longer sentences

| # | Lesson | Built from | Images on hand | Status |
|---|---|---|---|---|
| 1 | Who… he: यः… सः | guide: `relative-clauses` | 1 | rebuild |
| 2 | Having gone, while going | guide: `participle-clauses` | 3 | rebuild |

Practice: review of the unit's checks (no graded set exists)

### Unit 21 · Verse · छन्दः

| # | Lesson | Built from | Images on hand | Status |
|---|---|---|---|---|
| 1 | Light and heavy syllables | guide: `light-heavy`; cards: `verse-05`, `verse-06`, `verse-07`, `verse-08` | 7 | rebuild |
| 2 | The śloka: four lines of eight | guide: `shloka`; cards: `verse-17`, `verse-18`, `verse-20` | — | rebuild |
| 3 | Read your first Gītā verse | — | — | new |

Practice: Rhythm (existing tool)

## Library (off the trail)

- **Tables:** `ref-case-endings`, `ref-verb-endings`, `ref-pronouns`, `ref-sandhi`, `ref-suffixes`
- **Grammar notes:** all 18 chapters and 105 topics stay readable as the reference; each trail lesson links to its topic.
- **Tools:** Sound map, Writing, Word Lab, Word order, Noun forms, Verb forms, Rhythm, Vocabulary, Challenges.
- **Go deeper:** the 48-lesson Verse & Rhythm manuscript (`verse-01` … `verse-48`, English), `sandhi-source-internal`, `sandhi-source-retroflex`.
- **Advanced:** `aorist-rare`, `desiderative`, `pingala-binary`, `ashtadhyayi`, `shiva-sutras`, `reading-derivation`

## Checks run on this draft

- Grammar guide topics placed (trail or Library): 105 of 105.
- Old Path graded lessons placed: 49 of 49, duplicates: 0.
- Card lesson ids referenced that exist in the catalogue source: 69 of 69.
