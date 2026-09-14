"""Lesson seeds for Units 1–3 (P22-1 / P22-3 / CURRICULUM.md §6.2).

PROVENANCE (P22-3 §6): these lessons are ORIGINAL Sanskritam prose, authored
2026-09-07 — no text is copied from learnsanskrit.org or any other source, so
no third-party licence applies. If a future pass adapts external prose, the
exact licence goes in each row's ``provenance`` before any copy lands here.

Every example carries ``derivation_params`` (a prakriya.derive call) and is
stored ONLY when the engine reproduces the surface form exactly
(``services/lessons.py::verify_example``). Measured engine gaps stay out of
the lessons rather than being worked around: feminine ā-stems (कन्या →
कन्याः), वद् (→ वन्दते) and गम् (unresolvable) were all dropped by the
equality check during authoring, so no lesson below uses them. IAST is
lipi-derived at seed time (P7-13).
"""

from __future__ import annotations

# One row per lesson: (feature_id, unit_id, rank, titles, body, examples,
# visual_type, visual_data, register).
#
# visual_data shapes (U14-2 renders them presentationally — pre-computed here):
# - grid: {"columns": [...], "rows": [[cell, ...]]} — declension / varṇa cells
# - state_machine: {"states": [...], "current": ...} — lakāra states
# - tree / none: {} — derivation trees reuse the stored example derivations
SEED_LESSONS: list[dict] = [
    # ── Unit 1 · Sounds ──────────────────────────────────────────────
    {
        "feature_id": "SG",
        "unit_id": "u1",
        "rank": 0,
        "title_en": "Sounds first, then singulars",
        "title_hi": "प्रथमं वर्णाः, तत एकवचनम्",
        "body": (
            "Before a single ending, meet the sounds. Sanskrit does not list its "
            "letters — it grids them. Five rows by where the sound is made "
            "(kaṇṭhya throat → tālavya palate → mūrdhanya roof → dantya teeth → "
            "oṣṭhya lips), each row running unvoiced → voiced → nasal. Learn the "
            "grid and you learn the mouth: क ख ग घ ङ is one row, one place, one "
            "growing hum.\n\n"
            "Now listen to what one row of endings does. बालकः (one boy), "
            "बालकौ (two boys), बालकाः (many boys): the stem never moves, only "
            "the ending sings — -ः, -ौ, -ाः. Number lives in the sound change, "
            "not in a separate word. That is the whole Layer 1 idea: forms are "
            "functions of stem plus ending.\n\n"
            "Practice move: say the three aloud and feel where -ौ rounds the "
            "lips after the open -ः. When the grid below is familiar, tap Learn "
            "on the next node — First Words puts these sounds to work."
        ),
        "examples": [
            {"devanagari": "बालकः", "gloss": "one boy — the -ḥ ending",
             "derivation_params": {"pratipadika": "बालक", "linga": "Pum", "vibhakti": "Prathama", "vacana": "Eka"}},
            {"devanagari": "बालकौ", "gloss": "two boys — the -au ending",
             "derivation_params": {"pratipadika": "बालक", "linga": "Pum", "vibhakti": "Prathama", "vacana": "Dvi"}},
            {"devanagari": "बालकाः", "gloss": "many boys — the -āḥ ending",
             "derivation_params": {"pratipadika": "बालक", "linga": "Pum", "vibhakti": "Prathama", "vacana": "Bahu"}},
        ],
        "visual_type": "grid",
        "visual_data": {
            "kind": "varna",
            "columns": ["unvoiced", "voiced", "nasal"],
            "rows": [
                ["क", "ग", "ङ"],
                ["च", "ज", "ञ"],
                ["ट", "ड", "ण"],
                ["त", "द", "न"],
                ["प", "ब", "म"],
            ],
        },
        "register": "laukika",
    },
    # ── Unit 2 · First Words ─────────────────────────────────────────
    {
        "feature_id": "NOM.SG",
        "unit_id": "u2",
        "rank": 0,
        "title_en": "What is a case?",
        "title_hi": "विभक्तिः किम्?",
        "body": (
            "English says 'the boy' and 'the boy!' with the same word and trusts "
            "word order to do the work. Sanskrit puts the work into the ending. "
            "बालकः means 'the boy' AS THE DOER — the -ः (prathamā vibhakti, "
            "nominative singular) marks who acts. Change the ending and you "
            "change the job, even if the word stays first in the sentence.\n\n"
            "The doer has a deeper name: kartṛ (the agent, P22-2). When the "
            "engine says NOM.SG it is naming the ending; when the lesson says "
            "kartṛ it is naming the role — the one who does. Endings are form, "
            "kāraka is meaning, and Sanskrit keeps the two in lockstep.\n\n"
            "Three doers below, all masculine a-stems, all ending -ः. Say each "
            "and ask: who acts? बालकः पठति — the BOY reads. The ending told "
            "you before the verb arrived."
        ),
        "examples": [
            {"devanagari": "बालकः", "gloss": "the boy (does something)",
             "derivation_params": {"pratipadika": "बालक", "linga": "Pum", "vibhakti": "Prathama", "vacana": "Eka"}},
            {"devanagari": "रामः", "gloss": "Rāma (does something)",
             "derivation_params": {"pratipadika": "राम", "linga": "Pum", "vibhakti": "Prathama", "vacana": "Eka"}},
            {"devanagari": "चन्द्रः", "gloss": "the moon (shines)",
             "derivation_params": {"pratipadika": "चन्द्र", "linga": "Pum", "vibhakti": "Prathama", "vacana": "Eka"}},
        ],
        "visual_type": "grid",
        "visual_data": {
            "kind": "declension",
            "stem": "बालक",
            "columns": ["eka (one)", "dvi (two)", "bahu (many)"],
            "rows": [["बालकः", "बालकौ", "बालकाः"]],
            "highlight": "बालकः",
        },
        "register": "laukika",
    },
    {
        "feature_id": "ACC.SG",
        "unit_id": "u2",
        "rank": 1,
        "title_en": "The object: whom the action reaches",
        "title_hi": "कर्म — क्रिया यं प्राप्नोति",
        "body": (
            "बालकः फलम् पठति is nonsense and the endings prove it: -ः marks the "
            "doer, -म् marks the done-to. फलम् (phalam, dvitīyā vibhakti, "
            "accusative singular) is the object — karma, the thing the action "
            "reaches. बालकः फलम् खादति: the boy eats THE FRUIT. Swap the "
            "endings — बालकम् फलः — and you have said the fruit eats the boy, "
            "in perfectly good Sanskrit.\n\n"
            "Neuter a-stems like फल show -म् in both nominative and accusative "
            "singular (फलम् अस्ति vs फलम् खादति) — the verb disambiguates, not "
            "the ending. Masculine a-stems are kinder: -ः does, -म् is done to. "
            "Hold that pair; half of Unit 3 is its echo.\n\n"
            "Practice move: take any nominative below, flip -ः to -म्, and say "
            "who now receives the action."
        ),
        "examples": [
            {"devanagari": "बालकम्", "gloss": "the boy (as object)",
             "derivation_params": {"pratipadika": "बालक", "linga": "Pum", "vibhakti": "Dvitiya", "vacana": "Eka"}},
            {"devanagari": "फलम्", "gloss": "the fruit (as object)",
             "derivation_params": {"pratipadika": "फल", "linga": "Napumsaka", "vibhakti": "Dvitiya", "vacana": "Eka"}},
            {"devanagari": "गृहम्", "gloss": "the house (as object)",
             "derivation_params": {"pratipadika": "गृह", "linga": "Napumsaka", "vibhakti": "Dvitiya", "vacana": "Eka"}},
        ],
        "visual_type": "grid",
        "visual_data": {
            "kind": "declension",
            "stem": "बालक",
            "columns": ["kartṛ (does)", "karma (done-to)"],
            "rows": [["बालकः", "बालकम्"]],
            "highlight": "बालकम्",
        },
        "register": "laukika",
    },
    {
        "feature_id": "PRES.3SG",
        "unit_id": "u2",
        "rank": 2,
        "title_en": "What is a verb?",
        "title_hi": "क्रिया किम्?",
        "body": (
            "A Sanskrit verb is a small machine with five dials: root (dhātu), "
            "tense-mood (lakāra), person (puruṣa), number (vacana), voice "
            "(pada). पठति = √paṭh (read) + Lat (present) + prathama-puruṣa "
            "(third person) + eka (singular): 'he/she/it reads'. One word, five "
            "facts, zero ambiguity.\n\n"
            "Third person singular is the dictionary face of every verb — the "
            "form lessons quote and the form you meet first. Note the ending "
            "-ति; it will return in every person-number cell of Unit 5 wearing "
            "different clothes (-सि you, -ामि I).\n\n"
            "The derivation below is the proof: each step names its sūtra, so "
            "the form is not asserted but shown. Tap any step — the engine "
            "derived it for free, and no model was asked."
        ),
        "examples": [
            {"devanagari": "पठति", "gloss": "he/she reads",
             "derivation_params": {"dhatu": "पठ्", "lakara": "Lat", "purusha": "Prathama", "vacana": "Eka"}},
            {"devanagari": "लिखति", "gloss": "he/she writes",
             "derivation_params": {"dhatu": "लिख्", "lakara": "Lat", "purusha": "Prathama", "vacana": "Eka"}},
            {"devanagari": "स्मरति", "gloss": "he/she remembers",
             "derivation_params": {"dhatu": "स्मृ", "lakara": "Lat", "purusha": "Prathama", "vacana": "Eka"}},
        ],
        "visual_type": "state_machine",
        "visual_data": {
            "kind": "lakara",
            "states": ["Lat (present)", "Lot (imperative)", "Lan (past)"],
            "current": "Lat (present)",
            "note": "Unit 8 opens the other states; every one reuses these five dials.",
        },
        "register": "laukika",
    },
    # ── Unit 3 · More Cases ──────────────────────────────────────────
    {
        "feature_id": "INSTR.SG",
        "unit_id": "u3",
        "rank": 0,
        "title_en": "With what? The instrument",
        "title_hi": "केन? करणम्",
        "body": (
            "बालकेन — 'with/by the boy', tṛtīyā vibhakti (instrumental "
            "singular). The -ेन ending answers 'with what?' and 'by whom?': "
            "लेखन्या लिखति (writes with a pen), रामेण सह (together WITH Rāma — "
            "saha governs the instrumental, a favourite exam trap).\n\n"
            "Its kāraka is karaṇa, the instrument — the thing the agent uses. "
            "kartṛ acts (nominative), karaṇa serves (instrumental): रामः बाणेन "
            "विध्यति, Rāma pierces WITH AN ARROW. Two endings, two roles, one "
            "sentence.\n\n"
            "Sound note: -ः → -ेन lengthens and nasalises. Say बालकः, बालकेन "
            "back to back — the mouth moves front and the nose joins in."
        ),
        "examples": [
            {"devanagari": "बालकेन", "gloss": "by/with the boy",
             "derivation_params": {"pratipadika": "बालक", "linga": "Pum", "vibhakti": "Trtiya", "vacana": "Eka"}},
            {"devanagari": "रामेण", "gloss": "by/with Rāma",
             "derivation_params": {"pratipadika": "राम", "linga": "Pum", "vibhakti": "Trtiya", "vacana": "Eka"}},
        ],
        "visual_type": "grid",
        "visual_data": {
            "kind": "declension", "stem": "बालक",
            "columns": ["kartṛ", "karma", "karaṇa"],
            "rows": [["बालकः", "बालकम्", "बालकेन"]],
            "highlight": "बालकेन",
        },
        "register": "laukika",
    },
    {
        "feature_id": "DAT.SG",
        "unit_id": "u3",
        "rank": 1,
        "title_en": "For whom? The recipient",
        "title_hi": "कस्मै? सम्प्रदानम्",
        "body": (
            "बालकाय — 'for/to the boy', caturthī vibhakti (dative singular). "
            "The -ाय ending marks the destination of giving, telling, sending: "
            "बालकाय फलम् ददाति, (someone) gives a fruit TO THE BOY.\n\n"
            "Its kāraka is sampradāna, the recipient — the one the action is "
            "for. Full triple below in miniature: giver (nominative), gift "
            "(accusative), recipient (dative). Three endings, zero prepositions, "
            "zero word-order dependence.\n\n"
            "Sound note: -ाय is a diphthong glide — hold it as one syllable, "
            "not two. बालकाय scans short-long, which Unit 6 will make you feel."
        ),
        "examples": [
            {"devanagari": "बालकाय", "gloss": "for/to the boy",
             "derivation_params": {"pratipadika": "बालक", "linga": "Pum", "vibhakti": "Caturthi", "vacana": "Eka"}},
            {"devanagari": "रामाय", "gloss": "for/to Rāma",
             "derivation_params": {"pratipadika": "राम", "linga": "Pum", "vibhakti": "Caturthi", "vacana": "Eka"}},
        ],
        "visual_type": "grid",
        "visual_data": {
            "kind": "declension", "stem": "बालक",
            "columns": ["kartṛ", "karma", "sampradāna"],
            "rows": [["बालकः", "फलम्", "बालकाय"]],
            "highlight": "बालकाय",
        },
        "register": "laukika",
    },
    {
        "feature_id": "ABL.SG",
        "unit_id": "u3",
        "rank": 2,
        "title_en": "From where? The source",
        "title_hi": "कस्मात्? अपादानम्",
        "body": (
            "बालकात् — 'from the boy', pañcamī vibhakti (ablative singular). "
            "The -ात् ending marks the fixed point something leaves: गृहात् "
            "गच्छति, (someone) goes FROM THE HOUSE. Motion away, fear (बिभेति), "
            "protection — all govern the ablative.\n\n"
            "Its kāraka is apādāna, the source — the point of departure, "
            "distinct from karaṇa (the instrument of travel) and adhikaraṇa "
            "(the ground travelled). Sanskrit splits 'from/with/on' three ways "
            "where English leans on one tired preposition.\n\n"
            "Sound note: final -त् is unreleased — the tongue touches and "
            "stops, no puff. बालकात् ends in a full stop made by the mouth."
        ),
        "examples": [
            {"devanagari": "बालकात्", "gloss": "from the boy",
             "derivation_params": {"pratipadika": "बालक", "linga": "Pum", "vibhakti": "Panchami", "vacana": "Eka"}},
            {"devanagari": "रामात्", "gloss": "from Rāma",
             "derivation_params": {"pratipadika": "राम", "linga": "Pum", "vibhakti": "Panchami", "vacana": "Eka"}},
        ],
        "visual_type": "grid",
        "visual_data": {
            "kind": "declension", "stem": "बालक",
            "columns": ["karaṇa (with)", "apādāna (from)"],
            "rows": [["बालकेन", "बालकात्"]],
            "highlight": "बालकात्",
        },
        "register": "laukika",
    },
    {
        "feature_id": "GEN.SG",
        "unit_id": "u3",
        "rank": 3,
        "title_en": "Whose? Belonging",
        "title_hi": "कस्य? सम्बन्धः",
        "body": (
            "बालकस्य — 'of the boy / the boy's', ṣaṣṭhī vibhakti (genitive "
            "singular). The -स्य ending marks belonging and relation: रामस्य "
            "पुस्तकम्, RĀMA'S BOOK. It also marks the rememberer (स्मरति with "
            "genitive, a classic idiom) and part-from-whole.\n\n"
            "Strictly, the genitive is not a kāraka — Pāṇini's kāraka sūtras "
            "(1.4.23–55) leave it out, because belonging is a relation between "
            "things, not a role in an action. That is worth knowing early: not "
            "every ending is an action-role, and the grammar is honest about "
            "which are.\n\n"
            "Sound note: -स्य keeps the stem vowel short — बालकस्य, four even "
            "beats. It is the commonest ending in classical text; learn its "
            "shape cold."
        ),
        "examples": [
            {"devanagari": "बालकस्य", "gloss": "of the boy / the boy's",
             "derivation_params": {"pratipadika": "बालक", "linga": "Pum", "vibhakti": "Sasthi", "vacana": "Eka"}},
            {"devanagari": "रामस्य", "gloss": "of Rāma / Rāma's",
             "derivation_params": {"pratipadika": "राम", "linga": "Pum", "vibhakti": "Sasthi", "vacana": "Eka"}},
        ],
        "visual_type": "none",
        "visual_data": {},
        "register": "laukika",
    },
    {
        "feature_id": "LOC.SG",
        "unit_id": "u3",
        "rank": 4,
        "title_en": "Where? The ground of action",
        "title_hi": "कुत्र? अधिकरणम्",
        "body": (
            "बालके — 'in/on the boy' (better: 'in the boy's place'), saptamī "
            "vibhakti (locative singular). The -े ending marks where the action "
            "sits: गृहे पठति, (someone) reads IN THE HOUSE; रामे विश्वासः, "
            "trust IN RĀMA.\n\n"
            "Its kāraka is adhikaraṇa, the locus — the ground under the action. "
            "Pair it with apādāna (Unit 3, previous lesson): गृहात् गृहं "
            "गच्छति would be FROM the house (ablative) TO the house "
            "(accusative), while गृहे तिष्ठति is rest IN it (locative). "
            "Motion-from, motion-to, rest-in: three endings, three physics.\n\n"
            "Sound note: -े is the same vowel as the instrumental's -ेन minus "
            "the nose. बालके vs बालकेन — minimal pair, maximal meaning."
        ),
        "examples": [
            {"devanagari": "बालके", "gloss": "in/on the boy",
             "derivation_params": {"pratipadika": "बालक", "linga": "Pum", "vibhakti": "Saptami", "vacana": "Eka"}},
            {"devanagari": "रामे", "gloss": "in Rāma",
             "derivation_params": {"pratipadika": "राम", "linga": "Pum", "vibhakti": "Saptami", "vacana": "Eka"}},
        ],
        "visual_type": "grid",
        "visual_data": {
            "kind": "declension", "stem": "बालक",
            "columns": ["apādāna (from)", "karma (to)", "adhikaraṇa (in)"],
            "rows": [["बालकात्", "बालकम्", "बालके"]],
            "highlight": "बालके",
        },
        "register": "laukika",
    },
    {
        "feature_id": "VOC.SG",
        "unit_id": "u3",
        "rank": 5,
        "title_en": "Calling out: the address",
        "title_hi": "सम्बोधनम् — आह्वानम्",
        "body": (
            "बालक! — 'O boy!', sambodhana (vocative singular). The address "
            "drops the -ः and calls the bare stem: राम → राम! सीता → सीते! It "
            "is the only 'case' that does not join the sentence's action — you "
            "cannot be the object of your own sentence while being called.\n\n"
            "Pāṇini agrees it is special: the vocative shares the nominative's "
            "machinery (same stem, same number) and differs only at the last "
            "step. The derivation below shows that shared trunk — compare it "
            "with the NOM.SG lesson's steps and spot where the two part ways.\n\n"
            "Practice move: address everything today. पुस्तक! (O book!) — "
            "wrong number of syllables for majesty, right habit for endings. "
            "Unit 3 ends here; Unit 4 multiplies everything by three numbers."
        ),
        "examples": [
            {"devanagari": "बालक", "gloss": "O boy!",
             "derivation_params": {"pratipadika": "बालक", "linga": "Pum", "vibhakti": "Sambodhana", "vacana": "Eka"}},
            {"devanagari": "राम", "gloss": "O Rāma!",
             "derivation_params": {"pratipadika": "राम", "linga": "Pum", "vibhakti": "Sambodhana", "vacana": "Eka"}},
        ],
        "visual_type": "grid",
        "visual_data": {
            "kind": "declension", "stem": "बालक",
            "columns": ["addressing", "acting"],
            "rows": [["बालक!", "बालकः"]],
            "highlight": "बालक!",
        },
        "register": "laukika",
    },
    # ── Unit 6 · Sandhi as one lesson (P23) ───────────────────────────
    # The lesson the old model could not express: one lesson per tag meant
    # "sandhi is f(a,b)→c" could never be a single lesson, because sandhi is
    # four tags. feature_id leads with VOWEL-SANDHI; features spans all four.
    {
        "feature_id": "VOWEL-SANDHI",
        "features": ["VOWEL-SANDHI", "VISARGA-SANDHI", "ANUSVARA-SANDHI",
                     "CONSONANT-SANDHI"],
        "unit_id": "u6",
        "rank": 0,
        "title_en": "Sandhi is a function: f(a, b) → c",
        "title_hi": "सन्धिः — द्वयोः मेलने कार्यम्",
        "body": (
            "Where two sounds meet, Sanskrit does not leave them side by "
            "side — it computes. तथा + इति is not written तथाइति; the "
            "meeting of आ and इ yields ए, giving तथेति. That is a function: "
            "two inputs, one output, no exceptions at this address.\n\n"
            "Every sandhi is the same shape with different wiring. A vowel "
            "meeting a vowel (तथा + इति → तथेति), a visarga meeting a hard "
            "consonant (रामः + च → रामश्च), a final म् before a consonant "
            "(गङ्गम् + उदकम् → गङ्गोदकम्): f(a,b)→c in each case, run "
            "forwards to join and backwards to split.\n\n"
            "The steps below run the machine both ways. Split the join, "
            "then join the split — the same engine call grades both, so a "
            "wrong item cannot be authored into existence."
        ),
        "examples": [
            {"devanagari": "तथेति", "gloss": "तथा + इति — 'thus' + 'so'",
             "sandhi_join": "तथेति"},
            {"devanagari": "रामश्च", "gloss": "रामः + च — 'Rāma' + 'and'",
             "sandhi_join": "रामश्च"},
        ],
        "visual_type": "none",
        "visual_data": {},
        "register": "laukika",
    },
    # ── Unit 8 · More Tenses (2026-09-08 curation, owner-approved packet
    # results/u8-curation-packet.md) ─────────────────────────────────────
    # Adapted (not copied) from learnsanskrit.org under CC BY 4.0 — hence
    # per-row provenance + registry attribution below, NOT the module
    # PROVENANCE. Every verb form was measured derive-exact (derive_u8.txt);
    # roots outside the measured-safe set must not be added without
    # re-measuring (gam/vad/as/jñā/dhāv/sthā/nī/sev/labh/han/dṛś/kṛ all
    # fail or misderive). loṭ drills the 2nd plural: singulars derive with
    # -tāt, not the classroom short form.
    {
        "feature_id": "IMP.2PL",
        "features": ["IMP.2PL"],
        "unit_id": "u8",
        "rank": 0,
        "title_en": "Orders to many: the imperative",
        "title_hi": "आज्ञा — यूयं पठत",
        "body": (
            "Present-tense endings and order-giving endings are cousins. "
            "पठन्ति (they read) and पठत (read! — to all of you) share a stem "
            "and a rhythm; the ending does the commanding. Sanskrit gives "
            "orders the way it does everything else: by inflecting, not by "
            "adding a word like 'please' or 'do'.\n\n"
            "The plural order is the honest one to learn first. बालकाः पुस्तकं "
            "पठत — boys, read the book. छात्राः अत्र लिखत — students, write "
            "here. यूयं गृहं चलत — all of you, go home. One ending, -त, turns "
            "any classroom verb into a command for many.\n\n"
            "The singular order exists too — you will hear the short पठ (read!) "
            "in real speech, and third-person orders let one person send another "
            "(let him read). This lesson drills the plural, because that is the "
            "form the derivation engine below can prove step by step. Learn पठत "
            "cold and the singulars will feel like abbreviations of it, which is "
            "historically what they are."
        ),
        "examples": [
            {"devanagari": "पठत", "gloss": "read! (to many)",
             "derivation_params": {"dhatu": "पठ्", "lakara": "Lot", "purusha": "Madhyama", "vacana": "Bahu"}},
            {"devanagari": "लिखत", "gloss": "write! (to many)",
             "derivation_params": {"dhatu": "लिख्", "lakara": "Lot", "purusha": "Madhyama", "vacana": "Bahu"}},
            {"devanagari": "चलत", "gloss": "walk! / go! (to many)",
             "derivation_params": {"dhatu": "चल्", "lakara": "Lot", "purusha": "Madhyama", "vacana": "Bahu"}},
        ],
        "visual_type": "none",
        "visual_data": {},
        "register": "laukika",
        "provenance": "learnsanskrit:guide-verbs-1-the-command-mood",
        "attribution": "learnsanskrit",
    },
    {
        "feature_id": "IMPF.3SG",
        "features": ["IMPF.3SG"],
        "unit_id": "u8",
        "rank": 1,
        "title_en": "What already happened: the imperfect",
        "title_hi": "अनद्यतनभूतम्",
        "body": (
            "Past time wears a prefix. Every ordinary-past verb begins with अ — "
            "the augment — pinned to the front of the stem: पठति (he reads) "
            "becomes अपठत् (he read), भवति (he is) becomes अभवत् (he was), "
            "पिबति (he drinks) becomes अपिबत् (he drank). Grammarians say this "
            "tense means 'before today'; in practice stories use it for any "
            "finished past, which is why it is the storyteller's tense.\n\n"
            "The endings shrink, too. Present -ति loses its vowel and voice to "
            "become past -त्; -न्ति becomes -न्. So the past is marked twice — "
            "once at the front (अ) and once at the back (short ending) — which "
            "makes it the easiest tense to spot on the page: if it starts with "
            "अ and ends blunt, it already happened.\n\n"
            "Prefixes (upasargas like परि) go IN FRONT of the augment, and "
            "sandhi-heavy stems wait for later units. Here the verbs stand "
            "alone, the way the engine below derives them: augment, stem, "
            "short ending, nothing else."
        ),
        "examples": [
            {"devanagari": "अपठत्", "gloss": "he/she read",
             "derivation_params": {"dhatu": "पठ्", "lakara": "Lan", "purusha": "Prathama", "vacana": "Eka"}},
            {"devanagari": "अभवत्", "gloss": "he/she was, became",
             "derivation_params": {"dhatu": "भू", "lakara": "Lan", "purusha": "Prathama", "vacana": "Eka"}},
            {"devanagari": "अपिबत्", "gloss": "he/she drank",
             "derivation_params": {"dhatu": "पा", "lakara": "Lan", "purusha": "Prathama", "vacana": "Eka"}},
        ],
        "visual_type": "none",
        "visual_data": {},
        "register": "laukika",
        "provenance": "learnsanskrit:guide-verbs-1-the-ordinary-past-tense",
        "attribution": "learnsanskrit",
    },
    {
        "feature_id": "FUT.1SG",
        "features": ["FUT.1SG", "FUT.3SG"],
        "unit_id": "u8",
        "rank": 2,
        "title_en": "What will happen: the future",
        "title_hi": "भविष्यत्",
        "body": (
            "The future is the present with an infix. Take the root, strengthen "
            "its vowel, and slide -इष्य- between stem and ending: पठ् becomes "
            "पठिष्यति (he will read), भू becomes भविष्यति (he will be). First "
            "person works the same way: पठिष्यामि (I will read), भविष्यामि (I "
            "will be).\n\n"
            "The endings are the ones you already know from the present tense "
            "(-ति, -ामि), so the only new thing is the infix. That is the whole "
            "lesson, and it is why the future is the kindest tense: one infix, "
            "familiar endings, and every form below is machine-proved. Try पा "
            "yourself before scrolling: present पिबति, future…? पास्यति (he will "
            "drink) — the derivation below proves every step, so check your "
            "guess against it.\n\n"
            "A few roots attach -स्य- directly with no इ, and consonant-final "
            "roots trigger sandhi fireworks (the guide's labh→lapsya, "
            "budh→bhotsya). Those roots are outside what our engine derives "
            "today, so they wait in the staged shelf — this lesson drills only "
            "the -इष्य- family, which covers the verbs you already know."
        ),
        "examples": [
            {"devanagari": "पठिष्यति", "gloss": "he/she will read",
             "derivation_params": {"dhatu": "पठ्", "lakara": "Lrt", "purusha": "Prathama", "vacana": "Eka"}},
            {"devanagari": "भविष्यति", "gloss": "he/she will be",
             "derivation_params": {"dhatu": "भू", "lakara": "Lrt", "purusha": "Prathama", "vacana": "Eka"}},
            {"devanagari": "पठिष्यामि", "gloss": "I will read",
             "derivation_params": {"dhatu": "पठ्", "lakara": "Lrt", "purusha": "Uttama", "vacana": "Eka"}},
        ],
        "visual_type": "none",
        "visual_data": {},
        "register": "laukika",
        "provenance": "learnsanskrit:guide-verbs-2-the-simple-future-tense",
        "attribution": "learnsanskrit",
    },
    # ── Unit 4 · Numbers (2026-09-08 curation, owner-approved packet
    # results/u4-curation-packet.md) ────────────────────────────────────
    # Original Sanskritam prose (no staged base: the one staged U4 row is
    # numeral vocabulary, parked with the P10 quarantine). Dual/plural only
    # on engine-exact forms (derive_u4.txt). Vidyut liṅga codes are Pum/Stri/
    # Napumsaka — "Neut" is NOT a member and silently defaulted to Pum
    # (caught 2026-09-08; _enum_member now warns). Feminine ā-stems still
    # misderive (कन्या→कन्याः) so no feminine surface forms appear anywhere
    # in U4; neuter works with the correct code.
    # 3rd-person agreement only; 1st/2nd dual persons belong to U5.
    {
        "feature_id": "DU",
        "features": ["DU", "NOM.DU", "ACC.DU", "PRES.3DU"],
        "unit_id": "u4",
        "rank": 0,
        "title_en": "Two is special: the dual",
        "title_hi": "द्विवचनम्",
        "body": (
            "English counts one, two, many with three separate words, and Hindi "
            "does the same. Sanskrit counts in the ending. One boy is बालकः, two "
            "boys is बालकौ, many boys is बालकाः — the stem never moves. And the "
            "verb agrees: पठति (he reads), पठतः (those two read), पठन्ति (they "
            "read). Number lives in every word of the sentence at once.\n\n"
            "The dual has a signature worth memorizing on day one: its nominative "
            "and accusative are IDENTICAL. बालकौ means 'two boys' whether they act "
            "or are acted upon — one form, two jobs. Hear the -au: lips round, "
            "sound stretches, exactly two.\n\n"
            "Your languages merged the dual away — English lost it a thousand "
            "years ago and Hindi never had it — so this row will feel strange for "
            "a week. That strangeness is the lesson. Drill the triple aloud until "
            "-au feels like exactly-two the way -s feels like more-than-one."
        ),
        "examples": [
            {"devanagari": "बालकौ", "gloss": "two boys (do something)",
             "derivation_params": {"pratipadika": "बालक", "linga": "Pum", "vibhakti": "Prathama", "vacana": "Dvi"}},
            {"devanagari": "पठतः", "gloss": "those two read",
             "derivation_params": {"dhatu": "पठ्", "lakara": "Lat", "purusha": "Prathama", "vacana": "Dvi"}},
            {"devanagari": "गजौ", "gloss": "two elephants",
             "derivation_params": {"pratipadika": "गज", "linga": "Pum", "vibhakti": "Prathama", "vacana": "Dvi"}},
            {"devanagari": "फले", "gloss": "two fruits (subject or object)",
             "derivation_params": {"pratipadika": "फल", "linga": "Napumsaka", "vibhakti": "Prathama", "vacana": "Dvi"}},
        ],
        "visual_type": "grid",
        "visual_data": {
            "kind": "declension",
            "stem": "बालक",
            "columns": ["eka (one)", "dvi (two)", "bahu (many)"],
            "rows": [["बालकः", "बालकौ", "बालकाः"]],
            "highlight": "बालकौ",
        },
        "register": "laukika",
    },
    {
        "feature_id": "NOM.PL",
        "features": ["NOM.PL", "ACC.PL", "PRES.3PL"],
        "unit_id": "u4",
        "rank": 1,
        "title_en": "Many: the plural",
        "title_hi": "बहुवचनम्",
        "body": (
            "If the dual is strange, the plural is home. Doers end in -āḥ: बालकाः "
            "(boys, acting). Undergoers end in -ān: बालकान् (boys, acted upon). And "
            "the verb swells to match: पठन्ति (they read). After the dual's "
            "syncretism this is refreshingly explicit — every job has its own "
            "sound.\n\n"
            "Drill the full triple until it is muscle: बालकः, बालकौ, बालकाः — and "
            "underneath it the verbs: पठति, पठतः, पठन्ति. Say them in order, one "
            "breath each. You are hearing what English needs three different "
            "sentences to say, carried entirely by endings.\n\n"
            "Next lesson spends the plural's remaining cases: whose (बालकानाम्) "
            "and where (बालकेषु). The nominative and accusative you already own "
            "are the easy half; the oblique half is where plurals earn their keep."
        ),
        "examples": [
            {"devanagari": "बालकाः", "gloss": "boys (acting)",
             "derivation_params": {"pratipadika": "बालक", "linga": "Pum", "vibhakti": "Prathama", "vacana": "Bahu"}},
            {"devanagari": "बालकान्", "gloss": "boys (acted upon)",
             "derivation_params": {"pratipadika": "बालक", "linga": "Pum", "vibhakti": "Dvitiya", "vacana": "Bahu"}},
            {"devanagari": "पठन्ति", "gloss": "they read",
             "derivation_params": {"dhatu": "पठ्", "lakara": "Lat", "purusha": "Prathama", "vacana": "Bahu"}},
        ],
        "visual_type": "grid",
        "visual_data": {
            "kind": "declension",
            "stem": "बालक",
            "columns": ["eka (one)", "dvi (two)", "bahu (many)"],
            "rows": [["बालकः", "बालकौ", "बालकाः"]],
            "highlight": "बालकाः",
        },
        "register": "laukika",
    },
    {
        "feature_id": "GEN.PL",
        "features": ["GEN.PL", "LOC.PL"],
        "unit_id": "u4",
        "rank": 2,
        "title_en": "Whose and where, for many",
        "title_hi": "षष्ठी-सप्तमी",
        "body": (
            "Two plural endings do heavy lifting. बालकानाम् means 'of the boys' — "
            "the -ānām ending is the longest in the language and impossible to "
            "miss, which is convenient, because possession is everywhere. बालकेषु "
            "means 'among the boys' or 'in the boys' — the -eṣu ending marks "
            "where, and it sounds nothing like the singular's -e, so your ear "
            "gets a clean signal.\n\n"
            "Neuters follow the same road: फलानाम्, of the fruits. Learn the "
            "pattern once on masculines and it transfers for free — that transfer "
            "is the whole Layer 1 bet paying off.\n\n"
            "You now own every number in the nominative, accusative, genitive and "
            "locative. The remaining plural cases arrive with their singulars "
            "already behind you; persons — who speaks, the full nine-cell grid — "
            "are Unit 5."
        ),
        "examples": [
            {"devanagari": "बालकानाम्", "gloss": "of the boys / the boys'",
             "derivation_params": {"pratipadika": "बालक", "linga": "Pum", "vibhakti": "Sasthi", "vacana": "Bahu"}},
            {"devanagari": "बालकेषु", "gloss": "among / in the boys",
             "derivation_params": {"pratipadika": "बालक", "linga": "Pum", "vibhakti": "Saptami", "vacana": "Bahu"}},
            {"devanagari": "फलानाम्", "gloss": "of the fruits",
             "derivation_params": {"pratipadika": "फल", "linga": "Napumsaka", "vibhakti": "Sasthi", "vacana": "Bahu"}},
        ],
        "visual_type": "grid",
        "visual_data": {
            "kind": "declension",
            "stem": "बालक",
            "columns": ["eka (one)", "dvi (two)", "bahu (many)"],
            "rows": [["बालकस्य", "बालकयोः", "बालकानाम्"]],
            "highlight": "बालकानाम्",
        },
        "register": "laukika",
    },
    # ── Unit 7 · Genders (2026-09-08 curation, packets in results/) ────
    # Original Sanskritam prose (no staged base). Two hard engine walls
    # shape this unit: (1) vidyut liṅga codes are Pum/Stri/Napumsaka —
    # "Neut" silently defaulted to Pum (caught, _enum_member warns);
    # (2) feminine ā-stems genuinely misderive (कन्या→कन्याः), so NO
    # feminine surface form appears anywhere here (P22 precedent: drop,
    # don't work around). Neuter works with the right code. FEM stays
    # the last zero-coverage feature; its concept lives in both bodies.
    {
        "feature_id": "NEUT",
        "features": ["NEUT"],
        "unit_id": "u7",
        "rank": 0,
        "title_en": "It changes everything: neuter",
        "title_hi": "नपुंसकम्",
        "body": (
            "The third gender changes the most visible ending first. A "
            "neuter a-stem cites itself with -म्, not -ः: फलम् (a fruit), "
            "मित्रम् (a friend). And like the dual it merges jobs: फलम् "
            "does and undergoes, फले is two fruits as subject and as "
            "object, फलानि is many. One neuter row, three endings to learn "
            "— -म्, -े, -ानि.\n\n"
            "Compare cell by cell with the masculine row you know: -ः/-म्, "
            "-ौ/-े, -ाः/-ानि. Every cell that tells subject from object "
            "differs, which is why the grid below matters more here than "
            "anywhere: read the neuter row across, then down the masculine "
            "one, and feel where they split.\n\n"
            "Dictionaries label every noun पुं, स्त्री or नपुं — check the "
            "label before you decline, because gender decides the ending. "
            "Feminine drills wait on our engine (its ā-stems misderive "
            "today); the pattern is real, the automation is not, and this "
            "app does not drill what it cannot grade."
        ),
        "examples": [
            {"devanagari": "फलम्", "gloss": "a fruit",
             "derivation_params": {"pratipadika": "फल", "linga": "Napumsaka", "vibhakti": "Prathama", "vacana": "Eka"}},
            {"devanagari": "फले", "gloss": "two fruits",
             "derivation_params": {"pratipadika": "फल", "linga": "Napumsaka", "vibhakti": "Prathama", "vacana": "Dvi"}},
            {"devanagari": "फलानि", "gloss": "fruits",
             "derivation_params": {"pratipadika": "फल", "linga": "Napumsaka", "vibhakti": "Prathama", "vacana": "Bahu"}},
        ],
        "visual_type": "grid",
        "visual_data": {
            "kind": "declension",
            "stem": "फल",
            "columns": ["eka (one)", "dvi (two)", "bahu (many)"],
            "rows": [["फलम्", "फले", "फलानि"]],
            "highlight": "फलम्",
        },
        "register": "laukika",
    },
    {
        "feature_id": "MASC",
        "features": ["MASC"],
        "unit_id": "u7",
        "rank": 1,
        "title_en": "Masculine, and how you know",
        "title_hi": "पुंलिङ्गम्",
        "body": (
            "Most a-stems you have met are masculine, and now that fact has "
            "a name: पुंलिङ्ग. The dictionary label tells you before you "
            "decline — बालकः, रामः, गजः all wear -ः because all three are "
            "marked पुं. Gender is not meaning (a bridge can be masculine); "
            "it is grammar, and the label is the whole trick.\n\n"
            "Gender's job is agreement: adjectives and participles take "
            "their noun's gender, number and case together. You will drill "
            "that properly when the feminine engine lands; for now, learn "
            "the masculine instances cold, because every agreement rule "
            "you meet later keys off patterns like these.\n\n"
            "Other stem families (i-stems, u-stems, consonant stems) follow "
            "the same eight-cases-times-three-numbers logic with different "
            "endings — later units. The a-stem row below is the reference "
            "row everything else varies from."
        ),
        "examples": [
            {"devanagari": "बालकः", "gloss": "the boy (does)",
             "derivation_params": {"pratipadika": "बालक", "linga": "Pum", "vibhakti": "Prathama", "vacana": "Eka"}},
            {"devanagari": "रामः", "gloss": "Rāma (does)",
             "derivation_params": {"pratipadika": "राम", "linga": "Pum", "vibhakti": "Prathama", "vacana": "Eka"}},
            {"devanagari": "गजः", "gloss": "the elephant (does)",
             "derivation_params": {"pratipadika": "गज", "linga": "Pum", "vibhakti": "Prathama", "vacana": "Eka"}},
        ],
        "visual_type": "grid",
        "visual_data": {
            "kind": "declension",
            "stem": "बालक",
            "columns": ["eka (one)", "dvi (two)", "bahu (many)"],
            "rows": [["बालकः", "बालकौ", "बालकाः"]],
            "highlight": "बालकः",
        },
        "register": "laukika",
    },
    # ── Unit 5 · Persons (2026-09-08 curation) ─────────────────────────
    # Original prose (staged verb-class rows stay staged: gaṇa is a future
    # unit). All 18 (puruṣa × vacana) cells measured exact on paṭh/bhū
    # (derive_u579.txt). 3rd-person cells taught in U2/U4; these lessons
    # own 1st/2nd persons, dual persons included.
    {
        "feature_id": "PRES.1SG",
        "features": ["PRES.1SG", "PRES.2SG"],
        "unit_id": "u5",
        "rank": 0,
        "title_en": "Who speaks: I and you",
        "title_hi": "अहं त्वम्",
        "body": (
            "Verbs carry their subject inside them. पठामि means 'I read' "
            "with no pronoun needed — the -ामि says I. पठसि means 'you "
            "read' — the -सि says you. पठति, which you know, says he/she "
            "with -ति. Three endings, three speakers, one stem.\n\n"
            "The full system is a nine-cell grid: three persons (first I/we, "
            "second you, third he/they) times three numbers (one/two/many). "
            "Learn the corners first — -ामि, -सि, -ति — and the rest is "
            "pattern: every cell is person-plus-number, nothing else.\n\n"
            "Next lesson fills the dual row: we-two and you-two, the persons "
            "your languages never built words for."
        ),
        "examples": [
            {"devanagari": "पठामि", "gloss": "I read",
             "derivation_params": {"dhatu": "पठ्", "lakara": "Lat", "purusha": "Uttama", "vacana": "Eka"}},
            {"devanagari": "पठसि", "gloss": "you read",
             "derivation_params": {"dhatu": "पठ्", "lakara": "Lat", "purusha": "Madhyama", "vacana": "Eka"}},
            {"devanagari": "भवामि", "gloss": "I am, become",
             "derivation_params": {"dhatu": "भू", "lakara": "Lat", "purusha": "Uttama", "vacana": "Eka"}},
        ],
        "visual_type": "none",
        "visual_data": {},
        "register": "laukika",
    },
    {
        "feature_id": "PRES.1DU",
        "features": ["PRES.1DU", "PRES.2DU"],
        "unit_id": "u5",
        "rank": 1,
        "title_en": "We-two and you-two",
        "title_hi": "आवां युवाम्",
        "body": (
            "The dual reaches the verb's person endings too. पठावः — we two "
            "read. पठथः — you two read. भवावः — we two are. The endings -ावः "
            "and -थः do for persons exactly what -ौ did for nouns in Unit 4: "
            "they mean exactly-two, no more.\n\n"
            "Agreement crosses word classes: बालकौ पठतः — two boys (dual "
            "noun) take the dual verb (those two read). Get the noun's "
            "number wrong and the verb betrays you; get both right and the "
            "sentence locks together with an audible click.\n\n"
            "With this lesson the grid is nearly full: first and second "
            "persons in all three numbers, third person from Units 2 and 4. "
            "Plural persons ride the same nine cells — -ामः, -थ, -न्ति — "
            "pattern you can now read without being taught."
        ),
        "examples": [
            {"devanagari": "पठावः", "gloss": "we two read",
             "derivation_params": {"dhatu": "पठ्", "lakara": "Lat", "purusha": "Uttama", "vacana": "Dvi"}},
            {"devanagari": "पठथः", "gloss": "you two read",
             "derivation_params": {"dhatu": "पठ्", "lakara": "Lat", "purusha": "Madhyama", "vacana": "Dvi"}},
            {"devanagari": "भवावः", "gloss": "we two are, become",
             "derivation_params": {"dhatu": "भू", "lakara": "Lat", "purusha": "Uttama", "vacana": "Dvi"}},
        ],
        "visual_type": "none",
        "visual_data": {},
        "register": "laukika",
    },
    # ── Unit 9 · Voices (2026-09-08 curation) ──────────────────────────
    # Original prose (staged ātmanepada-endings row stays staged: endings
    # detail for later). dhāv (ubhayapada) derives ātmanepada in every
    # lakāra; paṭh derives parasmaipada; derive() takes no pada param —
    # pada follows the root. sev/labh (ātmanepada-only) are unsupported:
    # dropped. This is ATMANEPADA's first coverage anywhere (P7-12: derive,
    # do not prompt).
    {
        "feature_id": "ATMANEPADA",
        "features": ["ATMANEPADA", "PARASMAIPADA"],
        "unit_id": "u9",
        "rank": 0,
        "title_en": "For others, for self: the two voices",
        "title_hi": "द्वे पदे",
        "body": (
            "Every verb speaks in one of two voices. परस्मैपद is the voice "
            "for another: पठति — he reads (the action goes outward, to the "
            "book, the world). आत्मनेपद is the voice for self: धावते — he "
            "runs (the action stays with the runner). Same sentence shape, "
            "different direction — and the ending tells you which: -ति "
            "outward, -ते selfward.\n\n"
            "Some verbs take both voices (ubhayapada): धाव् runs either way, "
            "and here you see its ātmanepada face throughout — धावते, धावस्व. "
            "That is an engine limit stated plainly, not a grammar claim: "
            "the patterns below prove what they show and nothing else.\n\n"
            "From here on, every verb you meet wears its voice openly. Watch "
            "endings in the reader: -ते/-े against -ति/-न्ति, and ask of each "
            "new verb — for another, or for self?"
        ),
        "examples": [
            {"devanagari": "धावते", "gloss": "he runs",
             "derivation_params": {"dhatu": "धाव्", "lakara": "Lat", "purusha": "Prathama", "vacana": "Eka"}},
            {"devanagari": "धावस्व", "gloss": "run!",
             "derivation_params": {"dhatu": "धाव्", "lakara": "Lot", "purusha": "Madhyama", "vacana": "Eka"}},
            {"devanagari": "पठति", "gloss": "he reads",
             "derivation_params": {"dhatu": "पठ्", "lakara": "Lat", "purusha": "Prathama", "vacana": "Eka"}},
        ],
        "visual_type": "none",
        "visual_data": {},
        "register": "laukika",
    },
    # ── Grammar-guide expansion: basics → advanced, full taxonomy ──────
    # Original Sanskritam prose (2026-09-14). Every derivable example uses
    # only engine-exact forms measured on 2026-09-14 (path/bhu/likh + balaka/
    # rama/gaja/phala/grha; lot-2sg teaches the engine form -tat, noting the
    # classroom short form). Concept-only lessons (FEM/INDECL/SAMASA/KARAKA
    # + sandhi splits) carry prose illustrations with no derivation claim,
    # so verify_example stores them with derivation None and the steps seed
    # gives them an explain step only — never a graded item the engine
    # cannot mark (P23-2 rule).
    {
        "feature_id": "PL",
        "features": ["PL"],
        "unit_id": "u4",
        "rank": 3,
        "title_en": "Many as an idea: what plural means",
        "title_hi": "बहुत्वम् — बहुवचनस्य भावः",
        "body": (
            "Before the plural endings, meet the plural idea. Sanskrit number "
            "is not a word like 'many' — it is a shape inside every noun and "
            "verb. बालकः (one), बालकौ (two), बालकाः (many): same stem, three "
            "counts. The verb mirrors it: पठति, पठतः, पठन्ति.\n\n"
            "Plural is the unmarked many: three or more, mixed groups, and "
            "respectful address. Its endings are the longest and loudest — "
            "-ाः, -ान्, -ानाम्, -ेषु — so your ear learns them first and your "
            "mouth trusts them.\n\n"
            "This lesson owns the idea; the next four own the plural cases "
            "one by one. Say the triple aloud until -ाः feels like many the "
            "way -s does in English."
        ),
        "examples": [
            {"devanagari": "बालकाः", "gloss": "boys (acting)",
             "derivation_params": {"pratipadika": "बालक", "linga": "Pum", "vibhakti": "Prathama", "vacana": "Bahu"}},
            {"devanagari": "बालकान्", "gloss": "boys (acted upon)",
             "derivation_params": {"pratipadika": "बालक", "linga": "Pum", "vibhakti": "Dvitiya", "vacana": "Bahu"}},
            {"devanagari": "पठन्ति", "gloss": "they read",
             "derivation_params": {"dhatu": "पठ्", "lakara": "Lat", "purusha": "Prathama", "vacana": "Bahu"}},
        ],
        "visual_type": "grid",
        "visual_data": {
            "kind": "declension", "stem": "बालक",
            "columns": ["eka (one)", "dvi (two)", "bahu (many)"],
            "rows": [["बालकः", "बालकौ", "बालकाः"]],
            "highlight": "बालकाः",
        },
        "register": "laukika",
    },
    {
        "feature_id": "NOM.DU",
        "features": ["NOM.DU"],
        "unit_id": "u4",
        "rank": 4,
        "title_en": "Two who act: nominative dual",
        "title_hi": "द्वौ कर्तारौ — प्रथमा द्विवचनम्",
        "body": (
            "बालकौ पठतः — TWO boys read. The -ौ ending marks the doers when "
            "they are exactly two: nominative dual, prathamā dvi-vacana. No "
            "word for 'two' is needed; the ending counts.\n\n"
            "Neuters join with -े: फले — two fruits (doing). Masculines take "
            "-ौ, neuters -े, and the verb takes -तः. Three words, one count, "
            "locked by agreement.\n\n"
            "Contrast with the plural doers (बालकाः, -ाः) and the singular "
            "doer (बालकः, -ः). Two has its own vowel, and after this lesson "
            "your ear will never lend it to many."
        ),
        "examples": [
            {"devanagari": "बालकौ", "gloss": "two boys (acting)",
             "derivation_params": {"pratipadika": "बालक", "linga": "Pum", "vibhakti": "Prathama", "vacana": "Dvi"}},
            {"devanagari": "गजौ", "gloss": "two elephants (acting)",
             "derivation_params": {"pratipadika": "गज", "linga": "Pum", "vibhakti": "Prathama", "vacana": "Dvi"}},
            {"devanagari": "फले", "gloss": "two fruits (subject)",
             "derivation_params": {"pratipadika": "फल", "linga": "Napumsaka", "vibhakti": "Prathama", "vacana": "Dvi"}},
        ],
        "visual_type": "grid",
        "visual_data": {
            "kind": "declension", "stem": "बालक",
            "columns": ["eka (one)", "dvi (two)", "bahu (many)"],
            "rows": [["बालकः", "बालकौ", "बालकाः"]],
            "highlight": "बालकौ",
        },
        "register": "laukika",
    },
    {
        "feature_id": "ACC.DU",
        "features": ["ACC.DU"],
        "unit_id": "u4",
        "rank": 5,
        "title_en": "Two undergone: accusative dual",
        "title_hi": "द्वौ कर्मणी — द्वितीया द्विवचनम्",
        "body": (
            "बालकौ पश्यति — (someone) sees TWO boys. Same -ौ as the doers: "
            "accusative dual, dvitīyā dvi-vacana, is identical to the "
            "nominative dual for every stem. One form, two jobs — the dual's "
            "famous syncretism.\n\n"
            "The verb tells you who acts; the sentence tells you who is "
            "acted upon. बालकौ पठतः (two boys read) vs बालकौ पश्यति "
            "((he) sees two boys): same noun, different verb, different role.\n\n"
            "Neuters agree: फले पश्यति — (he) sees two fruits. Learn the "
            "merger cold; exams love to test whether you panic at it."
        ),
        "examples": [
            {"devanagari": "बालकौ", "gloss": "two boys (acted upon)",
             "derivation_params": {"pratipadika": "बालक", "linga": "Pum", "vibhakti": "Dvitiya", "vacana": "Dvi"}},
            {"devanagari": "फले", "gloss": "two fruits (object)",
             "derivation_params": {"pratipadika": "फल", "linga": "Napumsaka", "vibhakti": "Dvitiya", "vacana": "Dvi"}},
        ],
        "visual_type": "grid",
        "visual_data": {
            "kind": "declension", "stem": "बालक",
            "columns": ["kartṛ dvi (two do)", "karma dvi (two done-to)"],
            "rows": [["बालकौ", "बालकौ"]],
            "highlight": "बालकौ",
        },
        "register": "laukika",
    },
    {
        "feature_id": "ACC.PL",
        "features": ["ACC.PL"],
        "unit_id": "u4",
        "rank": 6,
        "title_en": "Many undergone: accusative plural",
        "title_hi": "बहून् — द्वितीया बहुवचनम्",
        "body": (
            "बालकान् पश्यति — (he) sees MANY boys. The -ान् ending marks many "
            "undergoers: accusative plural, dvitīyā bahu-vacana. Against the "
            "doers' -ाः it is unmistakable: -ाः acts, -ान् is acted upon.\n\n"
            "Neuters merge again: फलानि — many fruits, subject or object. "
            "Masculines split cleanly, neuters do not — the same transfer you "
            "learned in the neuter lesson, now in the plural.\n\n"
            "Drill the pair until it is reflex: बालकाः पठन्ति (boys read) vs "
            "बालकान् पश्यति ((he) sees boys). The verb agrees with the doer; "
            "the ending tells you who is not."
        ),
        "examples": [
            {"devanagari": "बालकान्", "gloss": "boys (acted upon)",
             "derivation_params": {"pratipadika": "बालक", "linga": "Pum", "vibhakti": "Dvitiya", "vacana": "Bahu"}},
            {"devanagari": "फलानि", "gloss": "many fruits (subject or object)",
             "derivation_params": {"pratipadika": "फल", "linga": "Napumsaka", "vibhakti": "Dvitiya", "vacana": "Bahu"}},
        ],
        "visual_type": "grid",
        "visual_data": {
            "kind": "declension", "stem": "बालक",
            "columns": ["kartṛ bahu (many do)", "karma bahu (many done-to)"],
            "rows": [["बालकाः", "बालकान्"]],
            "highlight": "बालकान्",
        },
        "register": "laukika",
    },
    {
        "feature_id": "LOC.PL",
        "features": ["LOC.PL"],
        "unit_id": "u4",
        "rank": 7,
        "title_en": "Among many: locative plural",
        "title_hi": "बहुषु — सप्तमी बहुवचनम्",
        "body": (
            "बालकेषु — among / in the boys. The -ेषु ending marks where among "
            "many: locative plural, saptamī bahu-vacana. गृहेषु — in the "
            "houses. One ending, every plural ground.\n\n"
            "Against the singular's -े (बालके) it is longer, heavier, and "
            "impossible to confuse once heard: -े rests in one, -ेषु rests "
            "among many.\n\n"
            "Pair with the genitive plural you know (बालकानाम्, of the boys): "
            "-ानाम् owns, -ेषु locates. The oblique plural is now complete."
        ),
        "examples": [
            {"devanagari": "बालकेषु", "gloss": "among / in the boys",
             "derivation_params": {"pratipadika": "बालक", "linga": "Pum", "vibhakti": "Saptami", "vacana": "Bahu"}},
            {"devanagari": "गृहेषु", "gloss": "in the houses",
             "derivation_params": {"pratipadika": "गृह", "linga": "Napumsaka", "vibhakti": "Saptami", "vacana": "Bahu"}},
        ],
        "visual_type": "grid",
        "visual_data": {
            "kind": "declension", "stem": "बालक",
            "columns": ["eka (in one)", "bahu (among many)"],
            "rows": [["बालके", "बालकेषु"]],
            "highlight": "बालकेषु",
        },
        "register": "laukika",
    },
    {
        "feature_id": "PRES.1PL",
        "features": ["PRES.1PL"],
        "unit_id": "u5",
        "rank": 2,
        "title_en": "We (many) speak: first plural",
        "title_hi": "वयं वदामः — उत्तम बहुवचनम्",
        "body": (
            "पठामः — WE read (many of us). The -ामः ending says first person "
            "plural: present, uttama-puruṣa, bahu-vacana. Against -ामि (I) and "
            "-ावः (we two) it completes the we-row: one, two, many.\n\n"
            "भवामः — we are, we become. Same row, same endings, new root. The "
            "person-number grid is root-independent: learn the endings once, "
            "carry them everywhere.\n\n"
            "Agreement locks it: वयं पठामः — we read. Drop the pronoun (Sanskrit "
            "usually does) and the verb still says we: पठामः alone is a full "
            "sentence."
        ),
        "examples": [
            {"devanagari": "पठामः", "gloss": "we read",
             "derivation_params": {"dhatu": "पठ्", "lakara": "Lat", "purusha": "Uttama", "vacana": "Bahu"}},
            {"devanagari": "भवामः", "gloss": "we are, become",
             "derivation_params": {"dhatu": "भू", "lakara": "Lat", "purusha": "Uttama", "vacana": "Bahu"}},
        ],
        "visual_type": "none",
        "visual_data": {},
        "register": "laukika",
    },
    {
        "feature_id": "PRES.2PL",
        "features": ["PRES.2PL"],
        "unit_id": "u5",
        "rank": 3,
        "title_en": "You (many) speak: second plural",
        "title_hi": "यूयं वदथ — मध्यम बहुवचनम्",
        "body": (
            "पठथ — YOU read (all of you). The -थ ending says second person "
            "plural: present, madhyama-puruṣa, bahu-vacana. Teachers live in "
            "this ending: पठत (read! many) orders it, पठथ states it.\n\n"
            "भवथ — you are. यूयं भवथ — you (many) are. The classroom's "
            "commonest verb, now in its commonest address.\n\n"
            "Finish the you-row aloud: पठसि (you one), पठथः (you two), पठथ "
            "(you many). Three counts, one listener-role, zero pronouns needed."
        ),
        "examples": [
            {"devanagari": "पठथ", "gloss": "you (many) read",
             "derivation_params": {"dhatu": "पठ्", "lakara": "Lat", "purusha": "Madhyama", "vacana": "Bahu"}},
            {"devanagari": "भवथ", "gloss": "you (many) are",
             "derivation_params": {"dhatu": "भू", "lakara": "Lat", "purusha": "Madhyama", "vacana": "Bahu"}},
        ],
        "visual_type": "none",
        "visual_data": {},
        "register": "laukika",
    },
    {
        "feature_id": "PRES.3PL",
        "features": ["PRES.3PL"],
        "unit_id": "u5",
        "rank": 4,
        "title_en": "They speak: third plural",
        "title_hi": "ते वदन्ति — प्रथम बहुवचनम्",
        "body": (
            "पठन्ति — THEY read. The -न्ति ending says third person plural: "
            "present, prathama-puruṣa, bahu-vacana. बालकाः पठन्ति — the boys "
            "read: plural noun, plural verb, audible agreement.\n\n"
            "This is the dictionary row's far end: पठति (he), पठतः (those "
            "two), पठन्ति (they). One root, three counts, the whole story of "
            "number in miniature.\n\n"
            "With this lesson the nine-cell present grid is full: every person "
            "you met in Units 2–5 now stands in all three numbers."
        ),
        "examples": [
            {"devanagari": "पठन्ति", "gloss": "they read",
             "derivation_params": {"dhatu": "पठ्", "lakara": "Lat", "purusha": "Prathama", "vacana": "Bahu"}},
            {"devanagari": "लिखन्ति", "gloss": "they write",
             "derivation_params": {"dhatu": "लिख्", "lakara": "Lat", "purusha": "Prathama", "vacana": "Bahu"}},
        ],
        "visual_type": "none",
        "visual_data": {},
        "register": "laukika",
    },
    {
        "feature_id": "PRES.3DU",
        "features": ["PRES.3DU"],
        "unit_id": "u5",
        "rank": 5,
        "title_en": "Those two speak: third dual",
        "title_hi": "तौ वदतः — प्रथम द्विवचनम्",
        "body": (
            "पठतः — THOSE TWO read. The -तः ending says third person dual: "
            "present, prathama-puruṣa, dvi-vacana. बालकौ पठतः — two boys read: "
            "dual noun, dual verb, the click of agreement.\n\n"
            "Against -ति (he) and -न्ति (they) it is the middle child: longer "
            "than one, shorter than many, exactly two.\n\n"
            "This completes the third-person row and the dual persons begun "
            "in Unit 4. From here, every new lakāra reuses this nine-cell map."
        ),
        "examples": [
            {"devanagari": "पठतः", "gloss": "those two read",
             "derivation_params": {"dhatu": "पठ्", "lakara": "Lat", "purusha": "Prathama", "vacana": "Dvi"}},
            {"devanagari": "भवतः", "gloss": "those two are",
             "derivation_params": {"dhatu": "भू", "lakara": "Lat", "purusha": "Prathama", "vacana": "Dvi"}},
        ],
        "visual_type": "none",
        "visual_data": {},
        "register": "laukika",
    },
    {
        "feature_id": "IMP.2SG",
        "features": ["IMP.2SG"],
        "unit_id": "u8",
        "rank": 3,
        "title_en": "Order one: the singular imperative",
        "title_hi": "आज्ञा — त्वं पठ",
        "body": (
            "Orders to one person wear -तात् in the engine's proof: पठतात् — "
            "read! (to one). The classroom short form पठ (read!) is what you "
            "will hear in speech; the -तात् form is what the derivation below "
            "proves step by step. Same command, two faces: short for the mouth, "
            "long for the proof.\n\n"
            "Plural orders you know (पठत, read! many) share the stem and the "
            "command-force; only the ending narrows from many to one.\n\n"
            "Practice move: give every verb you know a singular order, then "
            "check the long form below. When -तात् is familiar, the short "
            "forms will feel like abbreviations — which historically they are."
        ),
        "examples": [
            {"devanagari": "पठतात्", "gloss": "read! (to one, full form; short: पठ)",
             "derivation_params": {"dhatu": "पठ्", "lakara": "Lot", "purusha": "Madhyama", "vacana": "Eka"}},
            {"devanagari": "लिखतात्", "gloss": "write! (to one, full form; short: लिख)",
             "derivation_params": {"dhatu": "लिख्", "lakara": "Lot", "purusha": "Madhyama", "vacana": "Eka"}},
        ],
        "visual_type": "none",
        "visual_data": {},
        "register": "laukika",
    },
    {
        "feature_id": "FUT.3SG",
        "features": ["FUT.3SG"],
        "unit_id": "u8",
        "rank": 4,
        "title_en": "He will: third future",
        "title_hi": "सः करिष्यति — भविष्यत् प्रथमः",
        "body": (
            "पठिष्यति — he WILL read. The -िष्य- infix plus -ति says future, "
            "third person, singular: lṛṭ, prathama, eka. भविष्यति — he will be. "
            "Same infix, same endings as the present you know.\n\n"
            "Against पठति (reads) and अपठत् (read) it is the third time-state: "
            "present, past, future — three prefixes and infixes, one stem.\n\n"
            "This closes the tense quartet that carries most speech: present, "
            "imperative, past, future. The remaining lakāras refine; these four "
            "suffice."
        ),
        "examples": [
            {"devanagari": "पठिष्यति", "gloss": "he will read",
             "derivation_params": {"dhatu": "पठ्", "lakara": "Lrt", "purusha": "Prathama", "vacana": "Eka"}},
            {"devanagari": "भविष्यति", "gloss": "he will be",
             "derivation_params": {"dhatu": "भू", "lakara": "Lrt", "purusha": "Prathama", "vacana": "Eka"}},
        ],
        "visual_type": "none",
        "visual_data": {},
        "register": "laukika",
    },
    {
        "feature_id": "PARASMAIPADA",
        "features": ["PARASMAIPADA"],
        "unit_id": "u9",
        "rank": 1,
        "title_en": "Outward voice: parasmaipada",
        "title_hi": "परस्मैपदम् — परार्था क्रिया",
        "body": (
            "पठति — he reads (for another). The -ति family is parasmaipada, "
            "the outward voice: the action goes to the book, the world, the "
            "other. Most verbs you met first live here.\n\n"
            "Against धावते (he runs, for self) the pair is minimal: -ति "
            "outward, -ते selfward. Same sentence shape, opposite direction.\n\n"
            "Dictionaries mark every root परस्मैपदी, आत्मनेपदी, or उभयपदी "
            "(both). Check the label before you conjugate — voice, like gender, "
            "is a property of the root, not a choice of the moment."
        ),
        "examples": [
            {"devanagari": "पठति", "gloss": "he reads (outward)",
             "derivation_params": {"dhatu": "पठ्", "lakara": "Lat", "purusha": "Prathama", "vacana": "Eka"}},
            {"devanagari": "लिखति", "gloss": "he writes (outward)",
             "derivation_params": {"dhatu": "लिख्", "lakara": "Lat", "purusha": "Prathama", "vacana": "Eka"}},
        ],
        "visual_type": "none",
        "visual_data": {},
        "register": "laukika",
    },
    {
        "feature_id": "FEM",
        "features": ["FEM"],
        "unit_id": "u7",
        "rank": 2,
        "title_en": "Feminine: the pattern, honestly held",
        "title_hi": "स्त्रीलिङ्गम् — सूत्रं, न तु सिद्धरूपम्",
        "body": (
            "Feminine (stri-linga) is real grammar with a missing machine. The "
            "pattern exists — long-a stems, i-stems, and agreement just like "
            "the masculine and neuter rows — but our derivation engine "
            "misderives its flagship forms today, so this app does not drill "
            "what it cannot grade.\n\n"
            "What to carry forward: gender is a dictionary label (pum, stri, "
            "napumsaka), agreement copies gender-number-case together, and the "
            "eight-cases-times-three-numbers logic never changes — only the "
            "endings do.\n\n"
            "This lesson is read-only by design: no graded steps, no mastery "
            "claims. When the engine lands, feminine drills slot in here "
            "without moving any other lesson."
        ),
        "examples": [],
        "visual_type": "none",
        "visual_data": {},
        "register": "laukika",
    },
    {
        "feature_id": "INDECL",
        "features": ["INDECL"],
        "unit_id": "u3",
        "rank": 6,
        "title_en": "Words that never change: avyaya",
        "title_hi": "अव्ययम् — विकारहीनं पदम्",
        "body": (
            "Some words never inflect: च (and), एव (only), अत्र (here), तत्र "
            "(there), सह (with). No case, no number, no tense — avyaya, the "
            "indeclinable. The analyzer tags them INDECL and grading ignores "
            "them, because there is nothing to get wrong.\n\n"
            "Two traps: सह governs the instrumental (रामेण सह, with Rama — "
            "the noun still declines), and तत्र/अत्र locate without a case "
            "ending at all.\n\n"
            "This lesson is read-only: recognise the small words so the big "
            "endings stand out. No graded steps — recognition, not production."
        ),
        "examples": [
            {"devanagari": "च", "gloss": "and (never changes)"},
            {"devanagari": "अत्र", "gloss": "here (never changes)"},
        ],
        "visual_type": "none",
        "visual_data": {},
        "register": "laukika",
    },
    {
        "feature_id": "VISARGA-SANDHI",
        "features": ["VISARGA-SANDHI"],
        "unit_id": "u6",
        "rank": 1,
        "title_en": "The breathing that changes: visarga",
        "title_hi": "विसर्गसन्धिः",
        "body": (
            "Final -ः is a breath, and the next sound reshapes it. Before a "
            "hard consonant it hardens (रामः + च → रामश्च); before a voiced "
            "sound or अ it softens to -ो (बालः + गच्छति → बालो गच्छति); before "
            "other vowels it vanishes into the stem.\n\n"
            "Same f(a,b)→c as vowel sandhi, different wiring: the left input "
            "is always the breath. Run the steps below both ways — split the "
            "join, join the split.\n\n"
            "Advanced note: the -ो form is why nominatives look different in "
            "connected text than in dictionaries. Dictionaries cite the pause "
            "form (-ः); sentences show the computed form (-ो/-श्/-). Read the "
            "computation, not the citation."
        ),
        "examples": [
            {"devanagari": "रामश्च", "gloss": "रामः + च — Rama and",
             "sandhi_join": "रामश्च"},
        ],
        "visual_type": "none",
        "visual_data": {},
        "register": "laukika",
    },
    {
        "feature_id": "ANUSVARA-SANDHI",
        "features": ["ANUSVARA-SANDHI"],
        "unit_id": "u6",
        "rank": 2,
        "title_en": "The nose takes over: anusvara",
        "title_hi": "अनुस्वारसन्धिः",
        "body": (
            "Final -म् before a consonant becomes the dot: गङ्गम् + उदकम् "
            "computes toward गङ्गोदकम्, and many prints write the nasal as "
            "ं before stops. The nose anticipates the next mouth-shape.\n\n"
            "Same machine as ever: two inputs, one output, reversible in the "
            "steps below. Split first (what were the two words?), then join "
            "(what does the meeting make?).\n\n"
            "Advanced note: manuscripts vary between -म् and -ं in exactly "
            "this position. Both spell the same computation; the splitter "
            "below accepts the joined form either way."
        ),
        "examples": [
            {"devanagari": "गङ्गोदकम्", "gloss": "गङ्गा + उदकम् — Ganga water",
             "sandhi_join": "गङ्गोदकम्"},
        ],
        "visual_type": "none",
        "visual_data": {},
        "register": "laukika",
    },
    {
        "feature_id": "CONSONANT-SANDHI",
        "features": ["CONSONANT-SANDHI"],
        "unit_id": "u6",
        "rank": 3,
        "title_en": "Stops meet stops: consonant sandhi",
        "title_hi": "व्यञ्जनसन्धिः",
        "body": (
            "When two stops meet, voicing and aspiration assimilate: the first "
            "consonant takes the character of the second. The rule is phonetic, "
            "not memorised per word — feel the throat: voiced before voiced, "
            "unvoiced before unvoiced.\n\n"
            "The steps below drill the same two directions as every sandhi "
            "lesson: split the surface, join the parts. The engine grades both, "
            "so no false rule can be authored in.\n\n"
            "Advanced note: internal sandhi (inside one word, e.g. labh + sya) "
            "waits for a later unit. Here only word-junction consonants are "
            "drilled — the boundary with a space on each side."
        ),
        "examples": [
            {"devanagari": "तथेति", "gloss": "तथा + इति — worked example of junction",
             "sandhi_join": "तथेति"},
        ],
        "visual_type": "none",
        "visual_data": {},
        "register": "laukika",
    },
    {
        "feature_id": "SAMASA-DVANDVA",
        "features": ["SAMASA-DVANDVA"],
        "unit_id": "u10",
        "rank": 0,
        "title_en": "Both-and: dvandva compounds",
        "title_hi": "द्वन्द्वः — रामलक्ष्मणौ",
        "body": (
            "Dvandva joins equals with and: राम-लक्ष्मणौ — Rama and Lakshmana "
            "(two). Neither word governs; the compound is plural or dual of "
            "the pair. Gender follows the last member; number counts members.\n\n"
            "Recognition move: two stems, one ending, and-meaning. If you can "
            "split it into X and Y with nothing left over, it is dvandva.\n\n"
            "Read-only by design: the analyzer names endings, not compound "
            "types, so this lesson explains without grading. Splitter practice "
            "in the reader will make it instinct."
        ),
        "examples": [
            {"devanagari": "रामलक्ष्मणौ", "gloss": "Rama and Lakshmana (two)"},
        ],
        "visual_type": "none",
        "visual_data": {},
        "register": "laukika",
    },
    {
        "feature_id": "SAMASA-TATPURUSA",
        "features": ["SAMASA-TATPURUSA"],
        "unit_id": "u10",
        "rank": 1,
        "title_en": "Of-him: tatpurusha compounds",
        "title_hi": "तत्पुरुषः — राजपुत्रः",
        "body": (
            "Tatpurusha is a case-relation packed into one word: राज-पुत्रः — "
            "the king's son (son OF the king, genitive inside). The first "
            "member would wear a case ending if freed; inside, the ending "
            "drops and the relation stays implied.\n\n"
            "Recognition move: paraphrase with a case — of, to, in, by. If the "
            "paraphrase needs one, and the last member carries the sentence's "
            "ending, it is tatpurusha.\n\n"
            "Read-only: no graded steps until the analyzer types compounds. "
            "The reader marks every tatpurusha you meet from here on."
        ),
        "examples": [
            {"devanagari": "राजपुत्रः", "gloss": "the king's son (of-the-king son)"},
        ],
        "visual_type": "none",
        "visual_data": {},
        "register": "laukika",
    },
    {
        "feature_id": "SAMASA-BAHUVRIHI",
        "features": ["SAMASA-BAHUVRIHI"],
        "unit_id": "u10",
        "rank": 2,
        "title_en": "One-who-has: bahuvrihi compounds",
        "title_hi": "बहुव्रीहिः — पीताम्बरः",
        "body": (
            "Bahuvrihi points outward: पीत-अम्बरः — yellow-garmented (one WHO "
            "HAS yellow garments). The compound does not mean its parts; it "
            "means the possessor of its parts. Adjective outside, noun inside.\n\n"
            "Recognition move: ask who. If the answer is a third thing that "
            "has A-B (not A-B itself), it is bahuvrihi. Agreement follows the "
            "possessor, not the parts.\n\n"
            "Read-only: the classic exam trap (tatpurusha vs bahuvrihi on the "
            "same surface) is explained here and drilled later, when grading "
            "can be honest."
        ),
        "examples": [
            {"devanagari": "पीताम्बरः", "gloss": "yellow-garmented one (who has yellow cloth)"},
        ],
        "visual_type": "none",
        "visual_data": {},
        "register": "laukika",
    },
    {
        "feature_id": "SAMASA-AVYAYIBHAVA",
        "features": ["SAMASA-AVYAYIBHAVA"],
        "unit_id": "u10",
        "rank": 3,
        "title_en": "Never-declined: avyayibhava compounds",
        "title_hi": "अव्ययीभावः — उपगङ्गम्",
        "body": (
            "Avyayibhava begins with a particle and never declines: उप-गङ्गम् — "
            "near the Ganga. First member an avyaya (upa, prati, anu), whole "
            "compound an avyaya: no case, no number, fixed -म्.\n\n"
            "Recognition move: particle first, frozen ending, adverb-meaning "
            "(where/when/how). If it cannot be a subject or object, suspect "
            "avyayibhava.\n\n"
            "Read-only: one page, one idea, zero grading. Spot them in the "
            "reader; they never hide."
        ),
        "examples": [
            {"devanagari": "उपगङ्गम्", "gloss": "near the Ganga (indeclinable)"},
        ],
        "visual_type": "none",
        "visual_data": {},
        "register": "laukika",
    },
    {
        "feature_id": "KARAKA-KARTR",
        "features": ["KARAKA-KARTR"],
        "unit_id": "u11",
        "rank": 0,
        "title_en": "Who does: kartr, the agent",
        "title_hi": "कर्तृकारकम् — यः करोति",
        "body": (
            "Kartr is the doer — the one the action belongs to. रामः पठति: "
            "Rama reads; Rama is kartr, and the nominative (-ः) carries him. "
            "Form is the ending; meaning is the role; karaka names the meaning.\n\n"
            "Every sentence has one (even passive ones, re-dressed). Find the "
            "verb, ask who, and the -ः word answers.\n\n"
            "Read-only: thenoun below is engine-derived (the FORM is proved); "
            "the ROLE label is the teaching. Grading of roles waits on the "
            "analyzer; recognition starts now."
        ),
        "examples": [
            {"devanagari": "रामः", "gloss": "Rama (as doer, kartr)",
             "derivation_params": {"pratipadika": "राम", "linga": "Pum", "vibhakti": "Prathama", "vacana": "Eka"}},
            {"devanagari": "बालकः", "gloss": "the boy (as doer, kartr)",
             "derivation_params": {"pratipadika": "बालक", "linga": "Pum", "vibhakti": "Prathama", "vacana": "Eka"}},
        ],
        "visual_type": "none",
        "visual_data": {},
        "register": "laukika",
    },
    {
        "feature_id": "KARAKA-KARMA",
        "features": ["KARAKA-KARMA"],
        "unit_id": "u11",
        "rank": 1,
        "title_en": "What is reached: karma, the object",
        "title_hi": "कर्मकारकम् — यत् क्रियते",
        "body": (
            "Karma is what the action reaches: फलम् in बालकः फलम् खादति (the "
            "boy eats the FRUIT). Accusative (-म्) carries it. Swap endings and "
            "you swap fate: the fruit eats the boy — same words, good Sanskrit, "
            "bad lunch.\n\n"
            "Ask what after the verb; the -म् word answers. Neuters show -म् "
            "for subject and object alike — the verb, not the ending, decides.\n\n"
            "Read-only: forms below are engine-proved; the karma label is the "
            "lesson. Production drills live in the accusative lessons."
        ),
        "examples": [
            {"devanagari": "फलम्", "gloss": "the fruit (as object, karma)",
             "derivation_params": {"pratipadika": "फल", "linga": "Napumsaka", "vibhakti": "Dvitiya", "vacana": "Eka"}},
            {"devanagari": "बालकम्", "gloss": "the boy (as object, karma)",
             "derivation_params": {"pratipadika": "बालक", "linga": "Pum", "vibhakti": "Dvitiya", "vacana": "Eka"}},
        ],
        "visual_type": "none",
        "visual_data": {},
        "register": "laukika",
    },
    {
        "feature_id": "KARAKA-KARANA",
        "features": ["KARAKA-KARANA"],
        "unit_id": "u11",
        "rank": 2,
        "title_en": "With what: karana, the instrument",
        "title_hi": "करणकारकम् — येन क्रियते",
        "body": (
            "Karana is the instrument — what the doer uses. बाणेन in रामः "
            "बाणेन विध्यति (Rama pierces WITH AN ARROW): instrumental (-ेन) "
            "carries it. Pen, arrow, hand, word — tools are karana.\n\n"
            "Ask with-what / by-whom after the verb; the -ेन word answers. "
            "सह (with) governs it: रामेण सह — together WITH Rama.\n\n"
            "Read-only: the -ेन forms below are engine-proved. Production "
            "lives in the instrumental lesson; here the role is the point."
        ),
        "examples": [
            {"devanagari": "बालकेन", "gloss": "with/by the boy (karana)",
             "derivation_params": {"pratipadika": "बालक", "linga": "Pum", "vibhakti": "Trtiya", "vacana": "Eka"}},
            {"devanagari": "रामेण", "gloss": "with/by Rama (karana)",
             "derivation_params": {"pratipadika": "राम", "linga": "Pum", "vibhakti": "Trtiya", "vacana": "Eka"}},
        ],
        "visual_type": "none",
        "visual_data": {},
        "register": "laukika",
    },
    {
        "feature_id": "KARAKA-SAMPRADANA",
        "features": ["KARAKA-SAMPRADANA"],
        "unit_id": "u11",
        "rank": 3,
        "title_en": "For whom: sampradana, the recipient",
        "title_hi": "सम्प्रदानकारकम् — यस्मै दीयते",
        "body": (
            "Sampradana is the recipient — whom the action is for. बालकाय in "
            "बालकाय फलम् ददाति ((he) gives fruit TO THE BOY): dative (-ाय) "
            "carries him. Giving, telling, sending end here.\n\n"
            "The triple in miniature: giver (nominative), gift (accusative), "
            "recipient (dative). Three endings, zero prepositions.\n\n"
            "Read-only: -ाय forms below are engine-proved. Production lives in "
            "the dative lesson."
        ),
        "examples": [
            {"devanagari": "बालकाय", "gloss": "for/to the boy (sampradana)",
             "derivation_params": {"pratipadika": "बालक", "linga": "Pum", "vibhakti": "Caturthi", "vacana": "Eka"}},
            {"devanagari": "रामाय", "gloss": "for/to Rama (sampradana)",
             "derivation_params": {"pratipadika": "राम", "linga": "Pum", "vibhakti": "Caturthi", "vacana": "Eka"}},
        ],
        "visual_type": "none",
        "visual_data": {},
        "register": "laukika",
    },
    {
        "feature_id": "KARAKA-APADANA",
        "features": ["KARAKA-APADANA"],
        "unit_id": "u11",
        "rank": 4,
        "title_en": "From where: apadana, the source",
        "title_hi": "अपादानकारकम् — यस्मात् अपैति",
        "body": (
            "Apadana is the fixed point something leaves: गृहात् in गृहात् "
            "गच्छति ((he) goes FROM THE HOUSE). Ablative (-ात्) carries it. "
            "Motion away, fear, protection — all depart from here.\n\n"
            "Against karana (with) and adhikarana (in): from, with, in — three "
            "endings, three physics. English leans on one preposition; Sanskrit "
            "splits three ways.\n\n"
            "Read-only: -ात् forms below are engine-proved. Production lives in "
            "the ablative lesson."
        ),
        "examples": [
            {"devanagari": "बालकात्", "gloss": "from the boy (apadana)",
             "derivation_params": {"pratipadika": "बालक", "linga": "Pum", "vibhakti": "Panchami", "vacana": "Eka"}},
            {"devanagari": "रामात्", "gloss": "from Rama (apadana)",
             "derivation_params": {"pratipadika": "राम", "linga": "Pum", "vibhakti": "Panchami", "vacana": "Eka"}},
        ],
        "visual_type": "none",
        "visual_data": {},
        "register": "laukika",
    },
    {
        "feature_id": "KARAKA-ADHIKARANA",
        "features": ["KARAKA-ADHIKARANA"],
        "unit_id": "u11",
        "rank": 5,
        "title_en": "Where: adhikarana, the locus",
        "title_hi": "अधिकरणकारकम् — यत्र क्रिया",
        "body": (
            "Adhikarana is the ground the action sits on: गृहे in गृहे पठति "
            "((he) reads IN THE HOUSE). Locative (-े) carries it. Rest-in, as "
            "against motion-from (apadana) and motion-to (karma).\n\n"
            "गृहात् गृहं गच्छति (from the house to the house) vs गृहे तिष्ठति "
            "(stays in it): three endings, three physics, one root.\n\n"
            "Read-only: -े forms below are engine-proved. This closes the "
            "karaka six and the Layer-2 sentence model: roles explain endings."
        ),
        "examples": [
            {"devanagari": "बालके", "gloss": "in the boy's place (adhikarana)",
             "derivation_params": {"pratipadika": "बालक", "linga": "Pum", "vibhakti": "Saptami", "vacana": "Eka"}},
            {"devanagari": "रामे", "gloss": "in Rama (adhikarana)",
             "derivation_params": {"pratipadika": "राम", "linga": "Pum", "vibhakti": "Saptami", "vacana": "Eka"}},
        ],
        "visual_type": "none",
        "visual_data": {},
        "register": "laukika",
    },
]

PROVENANCE = (
    "original Sanskritam lessons 2026-09-07; examples Vidyut-verified at "
    "seed time; no third-party text"
)


def seed_lessons(db) -> dict[str, int]:
    """Idempotent lesson seed (P22-1/P22-3, P23 attribution): insert by
    ``feature_id``, verify every example against the engine, drop what the
    engine cannot reproduce. ``features`` spans the lesson's full tag set
    (default: the lead tag); ``attribution`` is a P23-4a registry KEY, so
    "is everything attributed?" is a join, not a reading exercise.
    Existing rows are backfilled (features/attribution) without touching
    their teaching content. Returns {"lessons": N added, ...}."""
    from app.models import Lesson
    from app.services import iast as _iast
    from app.services.lessons import verify_example

    added = 0
    dropped = 0
    backfilled = 0
    for row in SEED_LESSONS:
        features = list(row.get("features") or [row["feature_id"]])
        existing = db.query(Lesson).filter(
            Lesson.feature_id == row["feature_id"]).first()
        if existing:
            changed = False
            if not existing.features:
                existing.features = features
                changed = True
            if not existing.attribution:
                existing.attribution = "original"
                changed = True
            if changed:
                backfilled += 1
            continue
        kept: list[dict] = []
        for ex in row.get("examples", []):
            v = verify_example(dict(ex))
            if v is None:
                dropped += 1
                continue
            v["iast"] = _iast.to_iast(v["devanagari"])
            kept.append(v)
        db.add(Lesson(
            feature_id=row["feature_id"],
            features=features,
            unit_id=row["unit_id"],
            rank=row.get("rank", 0),
            title_en=row.get("title_en", ""),
            title_hi=row.get("title_hi", ""),
            body=row.get("body", ""),
            examples=kept,
            visual_type=row.get("visual_type", "none"),
            visual_data=row.get("visual_data", {}),
            audio_url=row.get("audio_url", ""),
            register=row.get("register", "laukika"),
            # Per-row provenance for adapted rows (U8: learnsanskrit CC BY
            # rows carry their registry key); originals keep the module PROVENANCE.
            provenance=row.get("provenance", PROVENANCE),
            attribution=row.get("attribution", "original"),
        ))
        added += 1
    # Flush so the steps seed (same session, autoflush off) can see the rows.
    db.flush()
    return {"lessons": added, "examples_dropped": dropped,
            "backfilled": backfilled}
