"""Seed data: ~30 laukika Sanskrit challenges with accepted parses.

Correct Sanskrit sentences covering:
- a-stem masc nouns (rāma, bāla, nara, deva, aśva)
- a-stem neuter nouns (phala, jala, vana, pustaka)
- ā-stem fem nouns (sītā, latā, kanyā, gaṅgā)
- present tense verbs (1/2/3 sg, du, pl)
- DUAL number exercises
- Accusative, dative, ablative, locative uses
- Sandhi examples
"""

SEED_CHALLENGES = [
    # ── Level 1: Basic NOM.SG + 3SG verb ──
    {
        "prompt_l1": "Rama eats a fruit.",
        "prompt_lang": "en",
        "target_sanskrit": "रामः फलम् खादति।",
        "target_iast": "rāmaḥ phalam khādati.",
        "features": ["NOM.SG", "ACC.SG", "PRES.3SG"],
        "accepted_parses": [
            {"rāma": "NOM.SG", "phala": "ACC.SG", "√khād": "PRES.3SG"},
        ],
        "register": "laukika",
    },
    {
        "prompt_l1": "The boy goes to the village.",
        "prompt_lang": "en",
        "target_sanskrit": "बालः ग्रामम् गच्छति।",
        "target_iast": "bālaḥ grāmam gacchati.",
        "features": ["NOM.SG", "ACC.SG", "PRES.3SG"],
        "accepted_parses": [
            {"bāla": "NOM.SG", "grāma": "ACC.SG", "√gam": "PRES.3SG"},
        ],
        "register": "laukika",
    },
    {
        "prompt_l1": "Sita drinks water.",
        "prompt_lang": "en",
        "target_sanskrit": "सीता जलम् पिबति।",
        "target_iast": "sītā jalam pibati.",
        "features": ["NOM.SG", "ACC.SG", "PRES.3SG"],
        "accepted_parses": [
            {"sītā": "NOM.SG", "jala": "ACC.SG", "√pā": "PRES.3SG"},
        ],
        "register": "laukika",
    },
    {
        "prompt_l1": "The horse runs.",
        "prompt_lang": "en",
        "target_sanskrit": "अश्वः धावति।",
        "target_iast": "aśvaḥ dhāvati.",
        "features": ["NOM.SG", "PRES.3SG"],
        "accepted_parses": [
            {"aśva": "NOM.SG", "√dhāv": "PRES.3SG"},
        ],
        "register": "laukika",
    },
    {
        "prompt_l1": "The god gives fruit to the man.",
        "prompt_lang": "en",
        "target_sanskrit": "देवः नराय फलम् ददाति।",
        "target_iast": "devaḥ narāya phalam dadāti.",
        "features": ["NOM.SG", "DAT.SG", "ACC.SG", "PRES.3SG"],
        "accepted_parses": [
            {"deva": "NOM.SG", "nara": "DAT.SG", "phala": "ACC.SG", "√dā": "PRES.3SG"},
        ],
        "register": "laukika",
    },
    # ── Level 2: Dual number ──
    {
        "prompt_l1": "The two men read books.",
        "prompt_lang": "en",
        "target_sanskrit": "नरौ पुस्तके पठतः।",
        "target_iast": "narau pustake paṭhataḥ.",
        "features": ["NOM.DU", "ACC.DU", "PRES.3DU"],
        "accepted_parses": [
            {"nara": "NOM.DU", "pustaka": "ACC.DU", "√paṭh": "PRES.3DU"},
            {"nara": "NOM.DU", "pustaka": "LOC.SG", "√paṭh": "PRES.3DU"},
        ],
        "register": "laukika",
    },
    {
        "prompt_l1": "The two boys laugh.",
        "prompt_lang": "en",
        "target_sanskrit": "बालौ हसतः।",
        "target_iast": "bālau hasataḥ.",
        "features": ["NOM.DU", "PRES.3DU"],
        "accepted_parses": [
            {"bāla": "NOM.DU", "√has": "PRES.3DU"},
        ],
        "register": "laukika",
    },
    {
        "prompt_l1": "The two horses run.",
        "prompt_lang": "en",
        "target_sanskrit": "अश्वौ धावतः।",
        "target_iast": "aśvau dhāvataḥ.",
        "features": ["NOM.DU", "PRES.3DU"],
        "accepted_parses": [
            {"aśva": "NOM.DU", "√dhāv": "PRES.3DU"},
        ],
        "register": "laukika",
    },
    # ── Level 3: Plural ──
    {
        "prompt_l1": "The boys go to the village.",
        "prompt_lang": "en",
        "target_sanskrit": "बालाः ग्रामम् गच्छन्ति।",
        "target_iast": "bālāḥ grāmam gacchanti.",
        "features": ["NOM.PL", "ACC.SG", "PRES.3PL"],
        "accepted_parses": [
            {"bāla": "NOM.PL", "grāma": "ACC.SG", "√gam": "PRES.3PL"},
        ],
        "register": "laukika",
    },
    {
        "prompt_l1": "The men come from the village.",
        "prompt_lang": "en",
        "target_sanskrit": "नराः ग्रामात् आगच्छन्ति।",
        "target_iast": "narāḥ grāmāt āgacchanti.",
        "features": ["NOM.PL", "ABL.SG", "PRES.3PL"],
        "accepted_parses": [
            {"nara": "NOM.PL", "grāma": "ABL.SG", "√gam": "PRES.3PL"},
        ],
        "register": "laukika",
    },
    {
        "prompt_l1": "There are fruits in the forest.",
        "prompt_lang": "en",
        "target_sanskrit": "वने फलानि सन्ति।",
        "target_iast": "vane phalāni santi.",
        "features": ["LOC.SG", "NOM.PL", "PRES.3PL"],
        "accepted_parses": [
            {"vana": "LOC.SG", "phala": "NOM.PL", "√as": "PRES.3PL"},
        ],
        "register": "laukika",
    },
    # ── Level 4: 1st and 2nd person verbs ──
    {
        "prompt_l1": "I go to the village.",
        "prompt_lang": "en",
        "target_sanskrit": "ग्रामम् गच्छामि।",
        "target_iast": "grāmam gacchāmi.",
        "features": ["ACC.SG", "PRES.1SG"],
        "accepted_parses": [
            {"grāma": "ACC.SG", "√gam": "PRES.1SG"},
        ],
        "register": "laukika",
    },
    {
        "prompt_l1": "You (sg) eat a fruit.",
        "prompt_lang": "en",
        "target_sanskrit": "फलम् खादसि।",
        "target_iast": "phalam khādasi.",
        "features": ["ACC.SG", "PRES.2SG"],
        "accepted_parses": [
            {"phala": "ACC.SG", "√khād": "PRES.2SG"},
        ],
        "register": "laukika",
    },
    {
        "prompt_l1": "We two go to the village.",
        "prompt_lang": "en",
        "target_sanskrit": "ग्रामम् गच्छावः।",
        "target_iast": "grāmam gacchāvaḥ.",
        "features": ["ACC.SG", "PRES.1DU"],
        "accepted_parses": [
            {"grāma": "ACC.SG", "√gam": "PRES.1DU"},
        ],
        "register": "laukika",
    },
    {
        "prompt_l1": "You two go to the village.",
        "prompt_lang": "en",
        "target_sanskrit": "ग्रामम् गच्छथः।",
        "target_iast": "grāmam gacchathaḥ.",
        "features": ["ACC.SG", "PRES.2DU"],
        "accepted_parses": [
            {"grāma": "ACC.SG", "√gam": "PRES.2DU"},
        ],
        "register": "laukika",
    },
    # ── Level 5: Instrumental and more cases ──
    {
        "prompt_l1": "The man goes with a horse.",
        "prompt_lang": "en",
        "target_sanskrit": "नरः अश्वेन गच्छति।",
        "target_iast": "naraḥ aśvena gacchati.",
        "features": ["NOM.SG", "INSTR.SG", "PRES.3SG"],
        "accepted_parses": [
            {"nara": "NOM.SG", "aśva": "INSTR.SG", "√gam": "PRES.3SG"},
        ],
        "register": "laukika",
    },
    {
        "prompt_l1": "The boy writes in a book.",
        "prompt_lang": "en",
        "target_sanskrit": "बालः पुस्तके लिखति।",
        "target_iast": "bālaḥ pustake likhati.",
        "features": ["NOM.SG", "LOC.SG", "PRES.3SG"],
        "accepted_parses": [
            {"bāla": "NOM.SG", "pustaka": "LOC.SG", "√likh": "PRES.3SG"},
        ],
        "register": "laukika",
    },
    {
        "prompt_l1": "Sita sees the horse.",
        "prompt_lang": "en",
        "target_sanskrit": "सीता अश्वम् पश्यति।",
        "target_iast": "sītā aśvam paśyati.",
        "features": ["NOM.SG", "ACC.SG", "PRES.3SG"],
        "accepted_parses": [
            {"sītā": "NOM.SG", "aśva": "ACC.SG", "√dṛś": "PRES.3SG"},
        ],
        "register": "laukika",
    },
    # ── Level 6: Feminine nouns (ā-stem) ──
    {
        "prompt_l1": "The girl drinks water.",
        "prompt_lang": "en",
        "target_sanskrit": "कन्या जलम् पिबति।",
        "target_iast": "kanyā jalam pibati.",
        "features": ["NOM.SG", "ACC.SG", "PRES.3SG"],
        "accepted_parses": [
            {"kanyā": "NOM.SG", "jala": "ACC.SG", "√pā": "PRES.3SG"},
        ],
        "register": "laukika",
    },
    {
        "prompt_l1": "The Ganges flows to the sea.",
        "prompt_lang": "en",
        "target_sanskrit": "गङ्गा समुद्रम् गच्छति।",
        "target_iast": "gaṅgā samudram gacchati.",
        "features": ["NOM.SG", "ACC.SG", "PRES.3SG"],
        "accepted_parses": [
            {"gaṅgā": "NOM.SG", "samudra": "ACC.SG", "√gam": "PRES.3SG"},
        ],
        "register": "laukika",
    },
    # ── Level 7: Genitive ──
    {
        "prompt_l1": "The boy's book is in the house.",
        "prompt_lang": "en",
        "target_sanskrit": "बालस्य पुस्तकम् गेहे अस्ति।",
        "target_iast": "bālasya pustakam gehe asti.",
        "features": ["GEN.SG", "NOM.SG", "LOC.SG", "PRES.3SG"],
        "accepted_parses": [
            {"bāla": "GEN.SG", "pustaka": "NOM.SG", "geha": "LOC.SG", "√as": "PRES.3SG"},
            {"bāla": "GEN.SG", "pustaka": "ACC.SG", "geha": "LOC.SG", "√as": "PRES.3SG"},
        ],
        "register": "laukika",
    },
    {
        "prompt_l1": "Rama's brother goes to the forest.",
        "prompt_lang": "en",
        "target_sanskrit": "रामस्य भ्राता वनम् गच्छति।",
        "target_iast": "rāmasya bhrātā vanam gacchati.",
        "features": ["GEN.SG", "NOM.SG", "ACC.SG", "PRES.3SG"],
        "accepted_parses": [
            {"rāma": "GEN.SG", "bhrātṛ": "NOM.SG", "vana": "ACC.SG", "√gam": "PRES.3SG"},
        ],
        "register": "laukika",
    },
    # ── Level 8: Neuter nouns ──
    {
        "prompt_l1": "There are fruits in the basket.",
        "prompt_lang": "en",
        "target_sanskrit": "पिटके फलानि सन्ति।",
        "target_iast": "piṭake phalāni santi.",
        "features": ["LOC.SG", "NOM.PL", "PRES.3PL"],
        "accepted_parses": [
            {"piṭaka": "LOC.SG", "phala": "NOM.PL", "√as": "PRES.3PL"},
        ],
        "register": "laukika",
    },
    # ── Level 9: Dual with verbs ──
    {
        "prompt_l1": "The two girls see the two horses.",
        "prompt_lang": "en",
        "target_sanskrit": "कन्ये अश्वौ पश्यतः।",
        "target_iast": "kyane aśvau paśyataḥ.",
        "features": ["NOM.DU", "ACC.DU", "PRES.3DU"],
        "accepted_parses": [
            {"kanyā": "NOM.DU", "aśva": "ACC.DU", "√dṛś": "PRES.3DU"},
        ],
        "register": "laukika",
    },
    {
        "prompt_l1": "Rama and Krishna go to the forest.",
        "prompt_lang": "en",
        "target_sanskrit": "रामकृष्णौ वनम् गच्छतः।",
        "target_iast": "rāmakṛṣṇau vanam gacchataḥ.",
        "features": ["NOM.DU", "ACC.SG", "PRES.3DU"],
        "accepted_parses": [
            {"rāmakṛṣṇa": "NOM.DU", "vana": "ACC.SG", "√gam": "PRES.3DU"},
        ],
        "register": "laukika",
    },
    # ── Level 10: Mixed sentences ──
    {
        "prompt_l1": "We all go home.",
        "prompt_lang": "en",
        "target_sanskrit": "वयम् गेहम् गच्छामः।",
        "target_iast": "vayam geham gacchāmaḥ.",
        "features": ["PRES.1PL", "ACC.SG"],
        "accepted_parses": [
            {"√gam": "PRES.1PL", "geha": "ACC.SG"},
        ],
        "register": "laukika",
    },
    {
        "prompt_l1": "The teacher teaches the students.",
        "prompt_lang": "en",
        "target_sanskrit": "गुरुः शिष्यान् पाठयति।",
        "target_iast": "guruḥ śiṣyān pāṭhayati.",
        "features": ["NOM.SG", "ACC.PL", "PRES.3SG"],
        "accepted_parses": [
            {"guru": "NOM.SG", "śiṣya": "ACC.PL", "√paṭh": "PRES.3SG"},
        ],
        "register": "laukika",
    },
    # ── Hindi prompts ──
    {
        "prompt_l1": "राम फल खाता है।",
        "prompt_lang": "hi",
        "target_sanskrit": "रामः फलम् खादति।",
        "target_iast": "rāmaḥ phalam khādati.",
        "features": ["NOM.SG", "ACC.SG", "PRES.3SG"],
        "accepted_parses": [
            {"rāma": "NOM.SG", "phala": "ACC.SG", "√khād": "PRES.3SG"},
        ],
        "register": "laukika",
    },
    {
        "prompt_l1": "लड़का गाँव जाता है।",
        "prompt_lang": "hi",
        "target_sanskrit": "बालः ग्रामम् गच्छति।",
        "target_iast": "bālaḥ grāmam gacchati.",
        "features": ["NOM.SG", "ACC.SG", "PRES.3SG"],
        "accepted_parses": [
            {"bāla": "NOM.SG", "grāma": "ACC.SG", "√gam": "PRES.3SG"},
        ],
        "register": "laukika",
    },
    {
        "prompt_l1": "सीता पानी पीती है।",
        "prompt_lang": "hi",
        "target_sanskrit": "सीता जलम् पिबति।",
        "target_iast": "sītā jalam pibati.",
        "features": ["NOM.SG", "ACC.SG", "PRES.3SG"],
        "accepted_parses": [
            {"sītā": "NOM.SG", "jala": "ACC.SG", "√pā": "PRES.3SG"},
        ],
        "register": "laukika",
    },
    {
        "prompt_l1": "दो लड़के हँसते हैं।",
        "prompt_lang": "hi",
        "target_sanskrit": "बालौ हसतः।",
        "target_iast": "bālau hasataḥ.",
        "features": ["NOM.DU", "PRES.3DU"],
        "accepted_parses": [
            {"bāla": "NOM.DU", "√has": "PRES.3DU"},
        ],
        "register": "laukika",
    },
    # ─── Classical register (epic/Purāṇic register — separate corpus per spec §4.4) ───
    {
        "prompt_l1": "Rama goes to the forest with Lakshmana.",
        "prompt_lang": "en",
        "target_sanskrit": "रामः सह लक्ष्मणेन वनम् गच्छति।",
        "target_iast": "rāmaḥ saha lakṣmaṇena vanam gacchati.",
        "features": ["NOM.SG", "INSTR.SG", "ACC.SG", "PRES.3SG"],
        "accepted_parses": [
            {"rāma": "NOM.SG", "lakṣmaṇa": "INSTR.SG", "vana": "ACC.SG", "√gam": "PRES.3SG"},
        ],
        "register": "classical",
    },
    {
        "prompt_l1": "In the ocean there is a gem.",
        "prompt_lang": "en",
        "target_sanskrit": "समुद्रे मणिः अस्ति।",
        "target_iast": "samudre maṇiḥ asti.",
        "features": ["LOC.SG", "NOM.SG", "PRES.3SG"],
        "accepted_parses": [
            {"samudra": "LOC.SG", "maṇi": "NOM.SG", "√as": "PRES.3SG"},
        ],
        "register": "classical",
    },
    {
        "prompt_l1": "The light of the sun destroys darkness.",
        "prompt_lang": "en",
        "target_sanskrit": "सूर्यस्य प्रकाशः तमः नश्यति।",
        "target_iast": "sūryasya prakāśaḥ tamaḥ naśyati.",
        "features": ["GEN.SG", "NOM.SG", "PRES.3SG"],
        "accepted_parses": [
            {"sūrya": "GEN.SG", "prakāśa": "NOM.SG", "tama": "NOM.SG", "√naś": "PRES.3SG"},
        ],
        "register": "classical",
    },
    {
        "prompt_l1": "The boy reads the book in the village.",
        "prompt_lang": "en",
        "target_sanskrit": "बालः ग्रामे पुस्तकम् पठति।",
        "target_iast": "bālaḥ grāme pustakam paṭhati.",
        "features": ["NOM.SG", "LOC.SG", "ACC.SG", "PRES.3SG"],
        "accepted_parses": [
            {"bāla": "NOM.SG", "grāma": "LOC.SG", "pustaka": "ACC.SG", "√paṭh": "PRES.3SG"},
        ],
        "register": "classical",
    },
    {
        "prompt_l1": "We walk the path of dharma.",
        "prompt_lang": "en",
        "target_sanskrit": "वयं धर्मं चरामः।",
        "target_iast": "vayaṃ dharmaṃ carāmaḥ.",
        "features": ["ACC.SG", "PRES.1PL"],
        "accepted_parses": [
            {"dharma": "ACC.SG", "√car": "PRES.1PL"},
        ],
        "register": "classical",
    },
    {
        "prompt_l1": "Rama sees Ravana in the city.",
        "prompt_lang": "en",
        "target_sanskrit": "रामः रावणम् नगरे पश्यति।",
        "target_iast": "rāmaḥ rāvaṇam nagare paśyati.",
        "features": ["NOM.SG", "ACC.SG", "LOC.SG", "PRES.3SG"],
        "accepted_parses": [
            {"rāma": "NOM.SG", "rāvaṇa": "ACC.SG", "nagara": "LOC.SG", "√dṛś": "PRES.3SG"},
        ],
        "register": "classical",
    },
]