"""Feature taxonomy data — ~40 features covering cases, numbers, tenses, voices, sandhi."""

SEED_FEATURES = [
    # ── Cases (8) ──
    {"id": "NOM.SG", "kind": "case", "rank": 10, "label_en": "Nominative Singular", "label_hi": "प्रथमा विभक्ति (एकवचन)"},
    {"id": "ACC.SG", "kind": "case", "rank": 11, "label_en": "Accusative Singular", "label_hi": "द्वितीया विभक्ति (एकवचन)"},
    {"id": "INSTR.SG", "kind": "case", "rank": 12, "label_en": "Instrumental Singular", "label_hi": "तृतीया विभक्ति (एकवचन)"},
    {"id": "DAT.SG", "kind": "case", "rank": 13, "label_en": "Dative Singular", "label_hi": "चतुर्थी विभक्ति (एकवचन)"},
    {"id": "ABL.SG", "kind": "case", "rank": 14, "label_en": "Ablative Singular", "label_hi": "पञ्चमी विभक्ति (एकवचन)"},
    {"id": "GEN.SG", "kind": "case", "rank": 15, "label_en": "Genitive Singular", "label_hi": "षष्ठी विभक्ति (एकवचन)"},
    {"id": "LOC.SG", "kind": "case", "rank": 16, "label_en": "Locative Singular", "label_hi": "सप्तमी विभक्ति (एकवचन)"},
    {"id": "VOC.SG", "kind": "case", "rank": 17, "label_en": "Vocative Singular", "label_hi": "सम्बोधन (एकवचन)"},

    # ── Numbers (3) ──
    {"id": "SG", "kind": "number", "rank": 20, "label_en": "Singular (eka-vacana)", "label_hi": "एकवचन"},
    {"id": "DU", "kind": "number", "rank": 21, "label_en": "Dual (dvi-vacana)", "label_hi": "द्विवचन"},
    {"id": "PL", "kind": "number", "rank": 22, "label_en": "Plural (bahu-vacana)", "label_hi": "बहुवचन"},

    # ── Combined case+number (most common) ──
    {"id": "NOM.DU", "kind": "case", "rank": 23, "label_en": "Nominative Dual", "label_hi": "प्रथमा द्विवचन"},
    {"id": "ACC.DU", "kind": "case", "rank": 24, "label_en": "Accusative Dual", "label_hi": "द्वितीया द्विवचन"},
    {"id": "NOM.PL", "kind": "case", "rank": 25, "label_en": "Nominative Plural", "label_hi": "प्रथमा बहुवचन"},
    {"id": "ACC.PL", "kind": "case", "rank": 26, "label_en": "Accusative Plural", "label_hi": "द्वितीया बहुवचन"},
    {"id": "GEN.PL", "kind": "case", "rank": 27, "label_en": "Genitive Plural", "label_hi": "षष्ठी बहुवचन"},
    {"id": "LOC.PL", "kind": "case", "rank": 28, "label_en": "Locative Plural", "label_hi": "सप्तमी बहुवचन"},

    # ── Present tense (3 persons × 3 numbers) ──
    {"id": "PRES.1SG", "kind": "tense", "rank": 30, "label_en": "Present 1st Person Singular", "label_hi": "वर्तमान उत्तमपुरुष एकवचन"},
    {"id": "PRES.2SG", "kind": "tense", "rank": 31, "label_en": "Present 2nd Person Singular", "label_hi": "वर्तमान मध्यमपुरुष एकवचन"},
    {"id": "PRES.3SG", "kind": "tense", "rank": 32, "label_en": "Present 3rd Person Singular", "label_hi": "वर्तमान प्रथमपुरुष एकवचन"},
    {"id": "PRES.1DU", "kind": "tense", "rank": 33, "label_en": "Present 1st Person Dual", "label_hi": "वर्तमान उत्तमपुरुष द्विवचन"},
    {"id": "PRES.2DU", "kind": "tense", "rank": 34, "label_en": "Present 2nd Person Dual", "label_hi": "वर्तमान मध्यमपुरुष द्विवचन"},
    {"id": "PRES.3DU", "kind": "tense", "rank": 35, "label_en": "Present 3rd Person Dual", "label_hi": "वर्तमान प्रथमपुरुष द्विवचन"},
    {"id": "PRES.1PL", "kind": "tense", "rank": 36, "label_en": "Present 1st Person Plural", "label_hi": "वर्तमान उत्तमपुरुष बहुवचन"},
    {"id": "PRES.2PL", "kind": "tense", "rank": 37, "label_en": "Present 2nd Person Plural", "label_hi": "वर्तमान मध्यमपुरुष बहुवचन"},
    {"id": "PRES.3PL", "kind": "tense", "rank": 38, "label_en": "Present 3rd Person Plural", "label_hi": "वर्तमान प्रथमपुरुष बहुवचन"},

    # ── Imperative ──
    {"id": "IMP.2SG", "kind": "tense", "rank": 40, "label_en": "Imperative 2nd Singular", "label_hi": "आज्ञा मध्यमपुरुष एकवचन"},

    # ── Voices (2) ──
    {"id": "PARASMAIPADA", "kind": "voice", "rank": 50, "label_en": "Parasmaipada (active)", "label_hi": "परस्मैपद"},
    {"id": "ATMANEPADA", "kind": "voice", "rank": 51, "label_en": "Ātmanepada (middle)", "label_hi": "आत्मनेपद"},

    # ── Genders (3) ──
    {"id": "MASC", "kind": "gender", "rank": 60, "label_en": "Masculine (puṃ-linga)", "label_hi": "पुंलिङ्ग"},
    {"id": "FEM", "kind": "gender", "rank": 61, "label_en": "Feminine (strī-linga)", "label_hi": "स्त्रीलिङ्ग"},
    {"id": "NEUT", "kind": "gender", "rank": 62, "label_en": "Neuter (napuṃsaka-linga)", "label_hi": "नपुंसकलिङ्ग"},

    # ── Sandhi types (4) ──
    {"id": "VOWEL-SANDHI", "kind": "sandhi", "rank": 70, "label_en": "Vowel Sandhi", "label_hi": "स्वरसन्धि"},
    {"id": "VISARGA-SANDHI", "kind": "sandhi", "rank": 71, "label_en": "Visarga Sandhi", "label_hi": "विसर्गसन्धि"},
    {"id": "ANUSVARA-SANDHI", "kind": "sandhi", "rank": 72, "label_en": "Anusvāra Sandhi", "label_hi": "अनुस्वारसन्धि"},
    {"id": "CONSONANT-SANDHI", "kind": "sandhi", "rank": 73, "label_en": "Consonant Sandhi", "label_hi": "व्यञ्जनसन्धि"},

    # ── Indeclinables ──
    {"id": "INDECL", "kind": "other", "rank": 80, "label_en": "Indeclinable (avyaya)", "label_hi": "अव्यय"},
]