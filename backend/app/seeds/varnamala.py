"""Varnamala grid data."""

VARNAMALA_DATA = {
    "vowels": [
        {"devanagari": "अ", "iast": "a", "place": "kanthya", "voicing": "voiced", "kind": "vowel"},
        {"devanagari": "आ", "iast": "ā", "place": "kanthya", "voicing": "voiced", "kind": "vowel"},
        {"devanagari": "इ", "iast": "i", "place": "talavya", "voicing": "voiced", "kind": "vowel"},
        {"devanagari": "ई", "iast": "ī", "place": "talavya", "voicing": "voiced", "kind": "vowel"},
        {"devanagari": "उ", "iast": "u", "place": "oshthya", "voicing": "voiced", "kind": "vowel"},
        {"devanagari": "ऊ", "iast": "ū", "place": "oshthya", "voicing": "voiced", "kind": "vowel"},
        {"devanagari": "ऋ", "iast": "ṛ", "place": "murdhanya", "voicing": "voiced", "kind": "vowel"},
        {"devanagari": "ॠ", "iast": "ṝ", "place": "murdhanya", "voicing": "voiced", "kind": "vowel"},
        {"devanagari": "ऌ", "iast": "ḷ", "place": "dantya", "voicing": "voiced", "kind": "vowel"},
        {"devanagari": "ॡ", "iast": "ḹ", "place": "dantya", "voicing": "voiced", "kind": "vowel"},
        {"devanagari": "ए", "iast": "e", "place": "talavya", "voicing": "voiced", "kind": "vowel"},
        {"devanagari": "ऐ", "iast": "ai", "place": "talavya", "voicing": "voiced", "kind": "vowel"},
        {"devanagari": "ओ", "iast": "o", "place": "oshthya", "voicing": "voiced", "kind": "vowel"},
        {"devanagari": "औ", "iast": "au", "place": "oshthya", "voicing": "voiced", "kind": "vowel"},
    ],
    "consonants": [
        # Kanthya (velar) — ka kha ga gha ṅa
        [
            {"devanagari": "क", "iast": "ka", "place": "kanthya", "voicing": "voiceless", "kind": "consonant"},
            {"devanagari": "ख", "iast": "kha", "place": "kanthya", "voicing": "voiceless_aspirated", "kind": "consonant"},
            {"devanagari": "ग", "iast": "ga", "place": "kanthya", "voicing": "voiced", "kind": "consonant"},
            {"devanagari": "घ", "iast": "gha", "place": "kanthya", "voicing": "voiced_aspirated", "kind": "consonant"},
            {"devanagari": "ङ", "iast": "ṅa", "place": "kanthya", "voicing": "nasal", "kind": "nasal"},
        ],
        # Talavya (palatal) — ca cha ja jha ña
        [
            {"devanagari": "च", "iast": "ca", "place": "talavya", "voicing": "voiceless", "kind": "consonant"},
            {"devanagari": "छ", "iast": "cha", "place": "talavya", "voicing": "voiceless_aspirated", "kind": "consonant"},
            {"devanagari": "ज", "iast": "ja", "place": "talavya", "voicing": "voiced", "kind": "consonant"},
            {"devanagari": "झ", "iast": "jha", "place": "talavya", "voicing": "voiced_aspirated", "kind": "consonant"},
            {"devanagari": "ञ", "iast": "ña", "place": "talavya", "voicing": "nasal", "kind": "nasal"},
        ],
        # Murdhanya (retroflex) — ṭa ṭha ḍa ḍha ṇa
        [
            {"devanagari": "ट", "iast": "ṭa", "place": "murdhanya", "voicing": "voiceless", "kind": "consonant"},
            {"devanagari": "ठ", "iast": "ṭha", "place": "murdhanya", "voicing": "voiceless_aspirated", "kind": "consonant"},
            {"devanagari": "ड", "iast": "ḍa", "place": "murdhanya", "voicing": "voiced", "kind": "consonant"},
            {"devanagari": "ढ", "iast": "ḍha", "place": "murdhanya", "voicing": "voiced_aspirated", "kind": "consonant"},
            {"devanagari": "ण", "iast": "ṇa", "place": "murdhanya", "voicing": "nasal", "kind": "nasal"},
        ],
        # Dantya (dental) — ta tha da dha na
        [
            {"devanagari": "त", "iast": "ta", "place": "dantya", "voicing": "voiceless", "kind": "consonant"},
            {"devanagari": "थ", "iast": "tha", "place": "dantya", "voicing": "voiceless_aspirated", "kind": "consonant"},
            {"devanagari": "द", "iast": "da", "place": "dantya", "voicing": "voiced", "kind": "consonant"},
            {"devanagari": "ध", "iast": "dha", "place": "dantya", "voicing": "voiced_aspirated", "kind": "consonant"},
            {"devanagari": "न", "iast": "na", "place": "dantya", "voicing": "nasal", "kind": "nasal"},
        ],
        # Oshthya (labial) — pa pha ba bha ma
        [
            {"devanagari": "प", "iast": "pa", "place": "oshthya", "voicing": "voiceless", "kind": "consonant"},
            {"devanagari": "फ", "iast": "pha", "place": "oshthya", "voicing": "voiceless_aspirated", "kind": "consonant"},
            {"devanagari": "ब", "iast": "ba", "place": "oshthya", "voicing": "voiced", "kind": "consonant"},
            {"devanagari": "भ", "iast": "bha", "place": "oshthya", "voicing": "voiced_aspirated", "kind": "consonant"},
            {"devanagari": "म", "iast": "ma", "place": "oshthya", "voicing": "nasal", "kind": "nasal"},
        ],
    ],
    "nasals": [
        {"devanagari": "ङ", "iast": "ṅa", "place": "kanthya", "voicing": "nasal", "kind": "nasal"},
        {"devanagari": "ञ", "iast": "ña", "place": "talavya", "voicing": "nasal", "kind": "nasal"},
        {"devanagari": "ण", "iast": "ṇa", "place": "murdhanya", "voicing": "nasal", "kind": "nasal"},
        {"devanagari": "न", "iast": "na", "place": "dantya", "voicing": "nasal", "kind": "nasal"},
        {"devanagari": "म", "iast": "ma", "place": "oshthya", "voicing": "nasal", "kind": "nasal"},
    ],
    "others": [
        {"devanagari": "य", "iast": "ya", "place": "talavya", "voicing": "approximant", "kind": "semivowel"},
        {"devanagari": "र", "iast": "ra", "place": "murdhanya", "voicing": "approximant", "kind": "semivowel"},
        {"devanagari": "ल", "iast": "la", "place": "dantya", "voicing": "approximant", "kind": "semivowel"},
        {"devanagari": "व", "iast": "va", "place": "oshthya", "voicing": "approximant", "kind": "semivowel"},
        {"devanagari": "श", "iast": "śa", "place": "talavya", "voicing": "voiceless", "kind": "sibilant"},
        {"devanagari": "ष", "iast": "ṣa", "place": "murdhanya", "voicing": "voiceless", "kind": "sibilant"},
        {"devanagari": "स", "iast": "sa", "place": "dantya", "voicing": "voiceless", "kind": "sibilant"},
        {"devanagari": "ह", "iast": "ha", "place": "kanthya", "voicing": "voiced", "kind": "fricative"},
        {"devanagari": "ं", "iast": "ṃ", "place": "nasal", "voicing": "nasal", "kind": "anusvara"},
        {"devanagari": "ः", "iast": "ḥ", "place": "kanthya", "voicing": "voiceless", "kind": "visarga"},
    ],
}