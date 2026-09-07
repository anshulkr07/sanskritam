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
]

PROVENANCE = (
    "original Sanskritam lessons 2026-09-07; examples Vidyut-verified at "
    "seed time; no third-party text"
)


def seed_lessons(db) -> dict[str, int]:
    """Idempotent lesson seed (P22-1/P22-3): insert by ``feature_id``, verify
    every example against the engine, drop what the engine cannot reproduce.
    Returns {"lessons": N added, "examples_dropped": M}."""
    from app.models import Lesson
    from app.services import iast as _iast
    from app.services.lessons import verify_example

    added = 0
    dropped = 0
    for row in SEED_LESSONS:
        existing = db.query(Lesson).filter(
            Lesson.feature_id == row["feature_id"]).first()
        if existing:
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
            provenance=PROVENANCE,
        ))
        added += 1
    return {"lessons": added, "examples_dropped": dropped}
