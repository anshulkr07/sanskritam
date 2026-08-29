"""Varnamala grid data.

Consonants are the traditional 5x5 sparśa matrix (row = place of articulation,
column = voicing/aspiration) flattened to a single list, plus the 5 nasal
row appended (they complete each row in the traditional layout). Each cell
carries its place so the frontend can rebuild the matrix.

Vowel 'place' values follow the traditional articulation description used in
Siddhānta-Kaumudī style tables: a/ā kanthya, i/ī talavya, u/ū oṣṭha-kanṭha
(labio-velar, rendered oshthya+kanthya), ṛ/ṝ murdhanya, ḷ/ḹ dantya, e/ai
kanthya-talavya (ai diphthong), o/au kanthya-oṣṭhya.
"""

VARNAMALA_DATA = {
    "vowels": [
        {"devanagari": "अ", "iast": "a", "place": "kanthya", "voicing": "voiced", "kind": "vowel"},
        {"devanagari": "आ", "iast": "ā", "place": "kanthya", "voicing": "voiced", "kind": "vowel"},
        {"devanagari": "इ", "iast": "i", "place": "talavya", "voicing": "voiced", "kind": "vowel"},
        {"devanagari": "ई", "iast": "ī", "place": "talavya", "voicing": "voiced", "kind": "vowel"},
        {"devanagari": "उ", "iast": "u", "place": "oshthya_kanthya", "voicing": "voiced", "kind": "vowel"},
        {"devanagari": "ऊ", "iast": "ū", "place": "oshthya_kanthya", "voicing": "voiced", "kind": "vowel"},
        {"devanagari": "ऋ", "iast": "ṛ", "place": "murdhanya", "voicing": "voiced", "kind": "vowel"},
        {"devanagari": "ॠ", "iast": "ṝ", "place": "murdhanya", "voicing": "voiced", "kind": "vowel"},
        {"devanagari": "ऌ", "iast": "ḷ", "place": "dantya", "voicing": "voiced", "kind": "vowel"},
        {"devanagari": "ॡ", "iast": "ḹ", "place": "dantya", "voicing": "voiced", "kind": "vowel"},
        {"devanagari": "ए", "iast": "e", "place": "kanthya_talavya", "voicing": "voiced", "kind": "vowel"},
        {"devanagari": "ऐ", "iast": "ai", "place": "kanthya_talavya", "voicing": "voiced", "kind": "vowel"},
        {"devanagari": "ओ", "iast": "o", "place": "kanthya_oshthya", "voicing": "voiced", "kind": "vowel"},
        {"devanagari": "औ", "iast": "au", "place": "kanthya_oshthya", "voicing": "voiced", "kind": "vowel"},
    ],
    "consonants": [],
    "nasals": [],
    "others": [
        {"devanagari": "य", "iast": "ya", "place": "talavya", "voicing": "approximant", "kind": "semivowel"},
        {"devanagari": "र", "iast": "ra", "place": "murdhanya", "voicing": "approximant", "kind": "semivowel"},
        {"devanagari": "ल", "iast": "la", "place": "dantya", "voicing": "approximant", "kind": "semivowel"},
        {"devanagari": "व", "iast": "va", "place": "oshthya_dantya", "voicing": "approximant", "kind": "semivowel"},
        {"devanagari": "श", "iast": "śa", "place": "talavya", "voicing": "voiceless", "kind": "sibilant"},
        {"devanagari": "ष", "iast": "ṣa", "place": "murdhanya", "voicing": "voiceless", "kind": "sibilant"},
        {"devanagari": "स", "iast": "sa", "place": "dantya", "voicing": "voiceless", "kind": "sibilant"},
        {"devanagari": "ह", "iast": "ha", "place": "kanthya", "voicing": "voiced_aspirate", "kind": "aspirate"},
        {"devanagari": "ं", "iast": "ṃ", "place": None, "voicing": None, "kind": "anusvara"},
        {"devanagari": "ः", "iast": "ḥ", "place": None, "voicing": None, "kind": "visarga"},
    ],
}

# The 4 stops columns: unvoiced, unvoiced+aspirated, voiced, voiced+aspirated
# plus the nasal completes the traditional 5-place row (nasals also listed
# separately in "nasals" for the grid row).
_PLACES = [
    ("kanthya", "क", "ka", "kha", "ga", "gha", "ṅa", "ङ"),
    ("talavya", "ca", "ca", "cha", "ja", "jha", "ña", "ञ"),
    ("murdhanya", "ट", "ṭa", "ṭha", "ḍa", "ḍha", "ṇa", "ण"),
    ("dantya", "त", "ta", "tha", "da", "dha", "na", "न"),
    ("oshthya", "प", "pa", "pha", "ba", "bha", "ma", "म"),
]
# (place, dev_row_letters, iast_row)
_ROWS = [
    ("kanthya", ["क", "ख", "ग", "घ"], ["ka", "kha", "ga", "gha"], "ङ", "ṅa"),
    ("talavya", ["च", "छ", "ज", "झ"], ["ca", "cha", "ja", "jha"], "ञ", "ña"),
    ("murdhanya", ["ट", "ठ", "ड", "ढ"], ["ṭa", "ṭha", "ḍa", "ḍha"], "ण", "ṇa"),
    ("dantya", ["त", "थ", "द", "ध"], ["ta", "tha", "da", "dha"], "न", "na"),
    ("oshthya", ["प", "फ", "ब", "भ"], ["pa", "pha", "ba", "bha"], "म", "ma"),
]
_VOICING = ["voiceless", "voiceless_aspirated", "voiced", "voiced_aspirated"]

for place, dev4, iast4, nasal_dev, nasal_iast in _ROWS:
    for dev, iast, voicing in zip(dev4, iast4, _VOICING):
        VARNAMALA_DATA["consonants"].append({
            "devanagari": dev, "iast": iast, "place": place,
            "voicing": voicing, "kind": "consonant",
        })
    VARNAMALA_DATA["nasals"].append({
        "devanagari": nasal_dev, "iast": nasal_iast, "place": place,
        "voicing": "nasal", "kind": "nasal",
    })
