"""Grammar guide — the static Learn map for the Grammar tab.

The Grammar tab used to be search-only: type a word, get a derivation.
The guide adds the teaching layer above it: basics → advanced, one section
per concept family, each card linking to the Path lessons that drill it
and the proof endpoints that derive it.

Static by design: no DB, no quota, no vendor — the same rule as every
/grammar/* route (P9/P11). Lesson existence (has_lesson) is resolved by
the client from GET /units + GET /grammar/path; the guide only names the
feature_ids so the client can deep-link Learn/Practice.
"""

from __future__ import annotations

GUIDE_VERSION = "2026-09-14-full-taxonomy"

GUIDE_SECTIONS: list[dict] = [
    {
        "id": "tags",
        "rank": 0,
        "title_en": "What is this code? ACC.SG, PRES.1SG…",
        "title_hi": "सङ्केतः किम्?",
        "unit_ids": ["u2"],
        "feature_ids": ["NOM.SG", "ACC.SG", "PRES.3SG"],
        "body_beginner": (
            "Nouns read as CASE.NUMBER — ACC.SG means accusative (object) "
            "singular. Verbs read as TENSE.PERSON+NUMBER — PRES.1SG means "
            "present, 1st person, singular. The verb root wears √, e.g. √gam."
        ),
        "body_intermediate": (
            "8 cases (vibhakti: NOM/ACC/INSTR/DAT/ABL/GEN/LOC/VOC) × 3 numbers "
            "(vacana: SG/DU/PL) name every noun ending; lakāra + puruṣa + "
            "vacana name every verb. PRON/INDECL never inflect and never grade."
        ),
        "body_advanced": (
            "Tags mirror Pāṇini: vibhakti (prathamā→saptamī + sambodhana), "
            "vacana (eka/dvi/bahu), lakāra (laṭ/laṅ/lṛṭ/loṭ…), puruṣa "
            "(uttama/madhyama/prathama). The grader compares feature SETS, "
            "not strings — free word order grades identical."
        ),
        "examples": [
            {"devanagari": "ग्रामं गच्छामि", "gloss": "grāma:ACC.SG + √gam:PRES.1SG — I go to the village"},
            {"devanagari": "गच्छामि ग्रामम्", "gloss": "same features, different order — still correct"},
        ],
        "proof": {"type": "word-order", "params": {"sentence": "बालकः ग्रामं गच्छति"}},
    },
    {
        "id": "cases",
        "rank": 1,
        "title_en": "Cases: the 8 vibhakti",
        "title_hi": "विभक्तयः — अष्टौ",
        "unit_ids": ["u2", "u3"],
        "feature_ids": ["NOM.SG", "ACC.SG", "INSTR.SG", "DAT.SG", "ABL.SG", "GEN.SG", "LOC.SG", "VOC.SG"],
        "body_beginner": (
            "Endings do the work English gives to word order and prepositions. "
            "-ḥ does, -म् is done-to, -ेन means with/by, -ाय means for/to, "
            "-ात् means from, -स्य means of, -े means in, bare stem calls out."
        ),
        "body_intermediate": (
            "One stem, eight jobs: बालकः/बालकम्/बालकेन/बालकाय/बालकात्/"
            "बालकस्य/बालके/बालक. Neuter -म् merges subject+object; saha "
            "governs the instrumental; genitive is relation, not action-role."
        ),
        "body_advanced": (
            "Kāraka explains vibhakti (u11): kartṛ→NOM, karma→ACC, karaṇa→INSTR, "
            "sampradāna→DAT, apādāna→ABL, adhikaraṇa→LOC. ṣaṣṭhī and sambodhana "
            "stand outside kāraka. Every claim below derives in the paradigm."
        ),
        "examples": [
            {"devanagari": "बालकः फलम् खादति", "gloss": "the boy (NOM) eats the fruit (ACC)"},
            {"devanagari": "रामेण सह", "gloss": "with Rama — saha + INSTR"},
            {"devanagari": "बालकाय फलम् ददाति", "gloss": "gives fruit TO the boy (DAT)"},
        ],
        "proof": {"type": "paradigm", "params": {"pratipadika": "बालक", "linga": "Pum"}},
    },
    {
        "id": "numbers",
        "rank": 2,
        "title_en": "Numbers: one, two, many",
        "title_hi": "वचनानि — एक द्वि बहु",
        "unit_ids": ["u4"],
        "feature_ids": ["SG", "DU", "PL", "NOM.DU", "ACC.DU", "NOM.PL", "ACC.PL", "GEN.PL", "LOC.PL"],
        "body_beginner": (
            "Sanskrit counts in the ending: बालकः (one), बालकौ (two), बालकाः "
            "(many). Verbs agree: पठति, पठतः, पठन्ति. Dual -ौ means exactly two."
        ),
        "body_intermediate": (
            "Dual nominative = accusative (बालकौ does and undergoes). Plurals "
            "split clean: -ाः do, -ान् undergo, -ानाम् own, -ेषु locate. "
            "Neuters merge NOM/ACC in every number (-म्/-े/-ानि)."
        ),
        "body_advanced": (
            "Number is a tensor with case and gender: 8×3 per stem family, "
            "syncretism only where taught (dual NOM/ACC, neuter NOM/ACC). "
            "Agreement crosses word classes — mismatched number betrays you."
        ),
        "examples": [
            {"devanagari": "बालकौ पठतः", "gloss": "two boys read — dual noun + dual verb"},
            {"devanagari": "बालकानाम्", "gloss": "of the boys — longest ending, GEN.PL"},
            {"devanagari": "बालकेषु", "gloss": "among the boys — LOC.PL"},
        ],
        "proof": {"type": "paradigm", "params": {"pratipadika": "बालक", "linga": "Pum"}},
    },
    {
        "id": "verbs",
        "rank": 3,
        "title_en": "Verbs: 9 persons × 4 core tenses",
        "title_hi": "क्रियाः — पुरुषाः लकाराश्च",
        "unit_ids": ["u2", "u5", "u8"],
        "feature_ids": ["PRES.1SG", "PRES.2SG", "PRES.3SG", "PRES.1DU", "PRES.2DU", "PRES.3DU", "PRES.1PL", "PRES.2PL", "PRES.3PL", "IMP.2SG", "IMP.2PL", "IMPF.3SG", "FUT.1SG", "FUT.3SG"],
        "body_beginner": (
            "One verb holds five facts: root + tense + person + number + voice. "
            "पठति = √paṭh + present + he + one. -ामि is I, -सि is you, -ति is he."
        ),
        "body_intermediate": (
            "Nine-cell present grid (3 persons × 3 numbers), then orders "
            "(पठत many, पठतात् one — short पठ in speech), past with अ- "
            "(अपठत्), future with -िष्य- (पठिष्यति). Endings transfer across roots."
        ),
        "body_advanced": (
            "Lakāra is time+m Mood: laṭ/lan/lṛṭ/loṭ carry most speech; six more "
            "refine. Third singular is the citation form. Every form below "
            "derives with its sūtra — tap any step."
        ),
        "examples": [
            {"devanagari": "पठामि पठसि पठति", "gloss": "I / you / he reads"},
            {"devanagari": "अपठत्", "gloss": "he read — अ augment + short ending"},
            {"devanagari": "पठिष्यति", "gloss": "he will read — -िष्य- infix"},
        ],
        "proof": {"type": "derive", "params": {"dhatu": "पठ्", "lakara": "Lat", "purusha": "Prathama", "vacana": "Eka"}},
    },
    {
        "id": "gender-voice",
        "rank": 4,
        "title_en": "Gender, voice & the small words",
        "title_hi": "लिङ्गे पदे अव्यये च",
        "unit_ids": ["u7", "u9", "u3"],
        "feature_ids": ["MASC", "FEM", "NEUT", "PARASMAIPADA", "ATMANEPADA", "INDECL"],
        "body_beginner": (
            "Nouns have gender (neuter cites with -म्: फलम्), verbs have voice "
            "(-ति outward, -ते selfward), small words never change (च, एव, अत्र)."
        ),
        "body_intermediate": (
            "Gender is a dictionary label driving agreement; voice follows the "
            "root (dhāv→-ते, paṭh→-ति); avyaya are skipped by grading — "
            "nothing to get wrong."
        ),
        "body_advanced": (
            "Feminine ā-stems are concept-only until the engine derives them — "
            "no drills, no false grades. Pada and liṅga are root properties, "
            "never momentary choices."
        ),
        "examples": [
            {"devanagari": "फलम् फले फलानि", "gloss": "neuter row: one / two / many"},
            {"devanagari": "पठति धावते", "gloss": "reads (outward) vs runs (selfward)"},
            {"devanagari": "रामेण सह", "gloss": "small word सह + INSTR noun"},
        ],
        "proof": {"type": "paradigm", "params": {"pratipadika": "फल", "linga": "Napumsaka"}},
    },
    {
        "id": "sandhi",
        "rank": 5,
        "title_en": "Sandhi: f(a,b) → c",
        "title_hi": "सन्धिः — मेलने कार्यम्",
        "unit_ids": ["u6"],
        "feature_ids": ["VOWEL-SANDHI", "VISARGA-SANDHI", "ANUSVARA-SANDHI", "CONSONANT-SANDHI"],
        "body_beginner": (
            "Where sounds meet, Sanskrit computes: तथा + इति → तथेति. "
            "Run it forwards (join) and backwards (split) — same machine both ways."
        ),
        "body_intermediate": (
            "Vowel meets vowel, visarga meets consonant (रामः+च→रामश्च), "
            "final -म् nasalises, stops assimilate. Dictionaries cite pause "
            "forms; sentences show computed forms."
        ),
        "body_advanced": (
            "Internal sandhi (labh+sya→lapsya) waits; junction sandhi drills "
            "here. The splitter grades both directions, so no false rule can "
            "be authored in."
        ),
        "examples": [
            {"devanagari": "तथेति", "gloss": "तथा + इति"},
            {"devanagari": "रामश्च", "gloss": "रामः + च"},
            {"devanagari": "गङ्गोदकम्", "gloss": "गङ्गा + उदकम्"},
        ],
        "proof": {"type": "sandhi", "params": {"joined": "तथेति"}},
    },
    {
        "id": "samasa",
        "rank": 6,
        "title_en": "Compounds: words compose",
        "title_hi": "समासाः — पदरचना",
        "unit_ids": ["u10"],
        "feature_ids": ["SAMASA-DVANDVA", "SAMASA-TATPURUSA", "SAMASA-BAHUVRIHI", "SAMASA-AVYAYIBHAVA"],
        "body_beginner": (
            "Two words become one: रामलक्ष्मणौ (both-and), राजपुत्रः (of-the-king "
            "son), पीताम्बरः (one-who-has), उपगङ्गम् (near, never declines)."
        ),
        "body_intermediate": (
            "Dvandva = X and Y; tatpuruṣa = case-relation packed (paraphrase "
            "with of/to/in/by); bahuvrīhi = possessor outside; avyayībhāva = "
            "frozen adverb."
        ),
        "body_advanced": (
            "Read-only until the analyzer types compounds: explanation without "
            "grading. The reader marks every compound you meet — recognition "
            "first, production later."
        ),
        "examples": [
            {"devanagari": "रामलक्ष्मणौ", "gloss": "Rama and Lakshmana — dvandva"},
            {"devanagari": "राजपुत्रः", "gloss": "king's son — tatpuruṣa"},
            {"devanagari": "पीताम्बरः", "gloss": "yellow-garmented one — bahuvrīhi"},
        ],
        "proof": {"type": "sandhi", "params": {"joined": "रामश्च"}},
    },
    {
        "id": "karaka",
        "rank": 7,
        "title_en": "Kāraka: why the ending is there",
        "title_hi": "कारकाणि — कस्माद् विभक्तिः",
        "unit_ids": ["u11"],
        "feature_ids": ["KARAKA-KARTR", "KARAKA-KARMA", "KARAKA-KARANA", "KARAKA-SAMPRADANA", "KARAKA-APADANA", "KARAKA-ADHIKARANA"],
        "body_beginner": (
            "Endings are form; roles are meaning. Who does (kartṛ→-ः), what is "
            "reached (karma→-म्), with what (karaṇa→-ेन), for whom "
            "(sampradāna→-ाय), from where (apādāna→-ात्), where "
            "(adhikaraṇa→-े)."
        ),
        "body_intermediate": (
            "Full triple: giver (NOM), gift (ACC), recipient (DAT). Motion-from "
            "vs motion-to vs rest-in: -ात् vs -म् vs -े. Genitive (of) stands "
            "outside kāraka — relation between things, not role in action."
        ),
        "body_advanced": (
            "Pāṇini 1.4.23–55 defines the six; vibhakti realises them. Roles "
            "explain endings, endings never prove roles alone — the verb "
            "arbitrates. Read-only here; production lives in the case lessons."
        ),
        "examples": [
            {"devanagari": "रामः बाणेन विध्यति", "gloss": "Rama (kartr) pierces with an arrow (karaṇa)"},
            {"devanagari": "बालकाय फलम् ददाति", "gloss": "gives fruit to the boy (sampradāna)"},
            {"devanagari": "गृहे तिष्ठति", "gloss": "stays in the house (adhikaraṇa)"},
        ],
        "proof": {"type": "word-order", "params": {"sentence": "रामः फलम् खादति"}},
    },
]
