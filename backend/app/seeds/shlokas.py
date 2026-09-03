"""Seed data: classical ślokas — Bhagavad Gītā verses with word breakdown.

Anchoring (P7-6): dates are derived from a FIXED anchor date via ``day_offset``,
never ``date.today()``. The router's deterministic cycle indexes past the
seeded window from the same anchor, so the well cannot silently freeze (§2.12).

``metre`` is deliberately NOT authored here: it is derived at seed time by
``services/chandas.py`` (never hand-typed, §6). anuṣṭubh is variable and is not
a fixed entry in vidyut's 145-vṛtta table, so its metre comes back empty — and
that is correct (§6: absent is absent; never fill it with a guess).

``word_breakdown`` is authored grammar (word/gloss/features). It is the
human-vetted part; a wrong feature here misleads a learner, so it is written
by hand and reviewed — not guessed.
"""

from datetime import date

# Fixed anchor, NOT date.today(). The router cycles from this same date.
SHLOKA_ANCHOR = date(2026, 9, 3)

# Each verse gets date = SHLOKA_ANCHOR + day_offset.
SEED_SLOKAS = [
    {
        "day_offset": 0,
        "source_ref": "Bhagavad Gītā 2.47",
        "devanagari": "कर्मण्येवाधिकारस्ते मा फलेषु कदाचन। मा कर्मफलहेतुर्भूर्मा ते सङ्गोऽस्त्वकर्मणि॥",
        "iast": "karmaṇyevādhikāraste mā phaleṣu kadācana. mā karmaphalaheturbhūrmā te saṅgo'stvakarmaṇi.",
        "word_breakdown": [
            {"word": "कर्मणि", "meaning": "in action", "features": ["LOC.SG"]},
            {"word": "एव", "meaning": "indeed", "features": ["INDECL"]},
            {"word": "अधिकारः", "meaning": "right", "features": ["NOM.SG"]},
            {"word": "ते", "meaning": "your", "features": ["GEN.SG"]},
            {"word": "मा", "meaning": "not", "features": ["INDECL"]},
            {"word": "फलेषु", "meaning": "in the fruits", "features": ["LOC.PL"]},
            {"word": "कदाचन", "meaning": "ever", "features": ["INDECL"]},
        ],
        "features": ["LOC.SG", "LOC.PL", "GEN.SG", "NOM.SG", "INDECL"],
        "register": "classical",
        "audio_url": "",
    },
    {
        "day_offset": 1,
        "source_ref": "Bhagavad Gītā 2.13",
        "devanagari": "देहिनोऽस्मिन्यथा देहे कौमारं यौवनं जरा। तथा देहान्तरप्राप्तिर्धीरस्तत्र न मुह्यति॥",
        "iast": "dehino'smin yathā dehe kaumāraṃ yauvanaṃ jarā. tathā dehāntaraprāptirdhīrastatra na muhyati.",
        "word_breakdown": [
            {"word": "देहिनः", "meaning": "of the embodied", "features": ["GEN.SG"]},
            {"word": "अस्मिन्", "meaning": "in this", "features": ["LOC.SG"]},
            {"word": "देहे", "meaning": "in the body", "features": ["LOC.SG"]},
            {"word": "कौमारम्", "meaning": "childhood", "features": ["NOM.SG"]},
            {"word": "यौवनम्", "meaning": "youth", "features": ["NOM.SG"]},
            {"word": "जरा", "meaning": "old age", "features": ["NOM.SG"]},
        ],
        "features": ["GEN.SG", "LOC.SG", "NOM.SG"],
        "register": "classical",
        "audio_url": "",
    },
    {
        "day_offset": 2,
        "source_ref": "Bhagavad Gītā 18.46",
        "devanagari": "यतः प्रवृत्तिर्भूतानां येन सर्वमिदं ततम्। स्वकर्मणा तमभ्यर्च्य सिद्धिं विन्दति मानवः॥",
        "iast": "yataḥ pravṛttirbhūtānāṃ yena sarvamidaṃ tatam. svakarmaṇā tamabhyarcya siddhiṃ vindati mānavaḥ.",
        "word_breakdown": [
            {"word": "यतः", "meaning": "from whom", "features": ["ABL.SG"]},
            {"word": "प्रवृत्तिः", "meaning": "the origin", "features": ["NOM.SG"]},
            {"word": "भूतानाम्", "meaning": "of all beings", "features": ["GEN.PL"]},
            {"word": "स्वकर्मणा", "meaning": "by one's own duty", "features": ["INSTR.SG"]},
            {"word": "अभ्यर्च्य", "meaning": "worshipping", "features": ["INDECL"]},
            {"word": "सिद्धिम्", "meaning": "perfection", "features": ["ACC.SG"]},
            {"word": "विन्दति", "meaning": "attains", "features": ["PRES.3SG"]},
            {"word": "मानवः", "meaning": "a human", "features": ["NOM.SG"]},
        ],
        "features": ["ABL.SG", "NOM.SG", "GEN.PL", "INSTR.SG", "ACC.SG", "PRES.3SG"],
        "register": "classical",
        "audio_url": "",
    },
    {
        "day_offset": 3,
        "source_ref": "Bhagavad Gītā 2.20",
        "devanagari": "न जायते म्रियते वा कदाचिन्नायं भूत्वा भविता वा न भूयः। अजो नित्यः शाश्वतोऽयं पुराणो न हन्यते हन्यमाने शरीरे॥",
        "iast": "na jāyate mriyate vā kadācin nāyaṃ bhūtvā bhavitā vā na bhūyaḥ. ajo nityaḥ śāśvato'yaṃ purāṇo na hanyate hanyamāne śarīre.",
        "word_breakdown": [
            {"word": "जायते", "meaning": "is born", "features": ["PRES.3SG"]},
            {"word": "म्रियते", "meaning": "dies", "features": ["PRES.3SG"]},
            {"word": "अजः", "meaning": "unborn", "features": ["NOM.SG"]},
            {"word": "नित्यः", "meaning": "eternal", "features": ["NOM.SG"]},
            {"word": "शाश्वतः", "meaning": "everlasting", "features": ["NOM.SG"]},
            {"word": "पुराणः", "meaning": "ancient", "features": ["NOM.SG"]},
            {"word": "हन्यते", "meaning": "is slain", "features": ["PRES.3SG"]},
            {"word": "शरीरे", "meaning": "in the body", "features": ["LOC.SG"]},
        ],
        "features": ["PRES.3SG", "NOM.SG", "LOC.SG"],
        "register": "classical",
        "audio_url": "",
    },
    {
        "day_offset": 4,
        "source_ref": "Bhagavad Gītā 2.56",
        "devanagari": "दुःखेष्वनुद्विग्नमनाः सुखेषु विगतस्पृहः। वीतरागभयक्रोधः स्थितधीर्मुनिरुच्यते॥",
        "iast": "duḥkheṣvanudvignamanāḥ sukheṣu vigataspṛhaḥ. vītarāgabhayakrodhaḥ sthitadhīrmunirucyate.",
        "word_breakdown": [
            {"word": "दुःखेषु", "meaning": "in sorrows", "features": ["LOC.PL"]},
            {"word": "अनुद्विग्नमनाः", "meaning": "untroubled-minded", "features": ["NOM.SG"]},
            {"word": "सुखेषु", "meaning": "in pleasures", "features": ["LOC.PL"]},
            {"word": "विगतस्पृहः", "meaning": "free of longing", "features": ["NOM.SG"]},
            {"word": "वीतरागभयक्रोधः", "meaning": "free from passion, fear, anger", "features": ["NOM.SG"]},
            {"word": "स्थितधीः", "meaning": "steady-minded", "features": ["NOM.SG"]},
            {"word": "मुनिः", "meaning": "a sage", "features": ["NOM.SG"]},
            {"word": "उच्यते", "meaning": "is called", "features": ["PRES.3SG"]},
        ],
        "features": ["LOC.PL", "NOM.SG", "PRES.3SG"],
        "register": "classical",
        "audio_url": "",
    },
    {
        "day_offset": 5,
        "source_ref": "Bhagavad Gītā 18.63",
        "devanagari": "इति ते ज्ञानमाख्यातं गुह्याद्गुह्यतरं मया। विमृश्यैतदशेषेण यथेच्छसि तथा कुरु॥",
        "iast": "iti te jñānamākhyātaṃ guhyād guhyataraṃ mayā. vimṛśyaitad aśeṣeṇa yathecchasi tathā kuru.",
        "word_breakdown": [
            {"word": "ज्ञानम्", "meaning": "knowledge", "features": ["NOM.SG"]},
            {"word": "आख्यातम्", "meaning": "imparted", "features": ["NOM.SG"]},
            {"word": "गुह्याद्", "meaning": "than the secret", "features": ["ABL.SG"]},
            {"word": "गुह्यतरम्", "meaning": "more secret", "features": ["NOM.SG"]},
            {"word": "मया", "meaning": "by me", "features": ["INSTR.SG"]},
            {"word": "विमृश्य", "meaning": "having reflected", "features": ["INDECL"]},
            {"word": "इच्छसि", "meaning": "you wish", "features": ["PRES.2SG"]},
            {"word": "कुरु", "meaning": "do", "features": ["IMPER.2SG"]},
        ],
        "features": ["NOM.SG", "ABL.SG", "INSTR.SG", "PRES.2SG", "IMPER.2SG"],
        "register": "classical",
        "audio_url": "",
    },
]