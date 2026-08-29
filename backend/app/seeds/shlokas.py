"""Seed data: classical shloka items — Bhagavad Gītā verses with word breakdown."""

from datetime import date, timedelta

SEED_SLOKAS = [
    {
        "date": (date.today() - timedelta(days=2)).isoformat(),
        "source_ref": "Bhagavad Gītā 2.47",
        "devanagari": "मा फलेषु कदाचन मा कर्मफलहेतुर्भूः।",
        # Full verse: कर्मण्येवाधिकारस्ते मा फलेषु कदाचन। मा कर्मफलहेतुर्भूर्मा ते सङ्गोऽस्त्वकर्मणि॥
        "iast": "mā phaleṣu kadācana mā karmaphalaheturbhūḥ.",
        "metre": "anuṣṭubh",
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
        "date": (date.today() - timedelta(days=1)).isoformat(),
        "source_ref": "Bhagavad Gītā 2.13",
        "devanagari": "देहिनोऽस्मिन्यथा देहे कौमारं यौवनं जरा। तथा देहान्तरप्राप्तिर्धीरस्तत्र न मुह्यति॥",
        "iast": "dehino'smin yathā dehe kaumāraṃ yauvanaṃ jarā. tathā dehāntaraprāptirdhīrastatra na muhyati.",
        "metre": "anuṣṭubh",
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
        "date": date.today().isoformat(),
        "source_ref": "Bhagavad Gītā 18.46",
        "devanagari": "यतः प्रवृत्तिर्भूतानां येन सर्वमिदं ततम्। स्वकर्मणा तमभ्यर्च्य सिद्धिं विन्दति मानवः॥",
        "iast": "yataḥ pravṛttirbhūtānāṃ yena sarvamidaṃ tatam. svakarmaṇā tamabhyarcya siddhiṃ vindati mānavaḥ.",
        "metre": "anuṣṭubh",
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
]