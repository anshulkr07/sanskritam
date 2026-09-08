"""Varnamala grid data (Spec E — build order step 5).

Consonants are the traditional 5x5 sparśa matrix (row = place of articulation,
column = voicing/aspiration) flattened to a single list, plus the 5 nasal
row appended (they complete each row in the traditional layout). Each cell
carries its place so the frontend can rebuild the matrix.

Vowel 'place' values follow the traditional articulation description used in
Siddhānta-Kaumudī style tables: a/ā kanthya, i/ī talavya, u/ū oṣṭha-kanṭha
(labio-velar, rendered oshthya+kanthya), ṛ/ṝ murdhanya, ḷ/ḹ dantya, e/ai
kanthya-talavya (ai diphthong), o/au kanthya-oṣṭhya.

Spec E additions: every cell carries a stable ASCII ``id`` (audio filenames
and learner-progress keys — never rename), ``example_devanagari`` /
``example_iast`` / ``example_gloss``, and ``minimal_pairs`` derived by
inverting ``CONTRAST_GROUPS`` (symmetric, order-preserving). ``rii`` / ``li``
/ ``lii`` occur so rarely that no honest example word exists — their example
fields stay empty and clients must render a blank example gracefully.
``am`` / ``ah`` carry the अ-carrier display form in ``devanagari`` plus the
bare combining ``mark`` for clients that render it.
"""

CONTRAST_GROUPS = [
    {
        "id": "dental_retroflex",
        "label": "Dental vs retroflex",
        "pairs": [["ta", "tta"], ["tha", "ttha"], ["da", "dda"],
                  ["dha", "ddha"], ["na", "nna"]],
        "note_en": "English has no retroflex series — curl the tongue tip back to the roof of the mouth.",
    },
    {
        "id": "sibilants",
        "label": "The three sibilants",
        "pairs": [["sha", "ssa"], ["ssa", "sa"], ["sha", "sa"]],
        "note_en": "Most learners collapse these to two or one — the tongue position is what differs, not voicing.",
    },
    {
        "id": "aspiration",
        "label": "Aspirated vs unaspirated",
        "pairs": [["ka", "kha"], ["ga", "gha"], ["ca", "cha"], ["ja", "jha"],
                  ["tta", "ttha"], ["dda", "ddha"], ["ta", "tha"],
                  ["da", "dha"], ["pa", "pha"], ["ba", "bha"]],
        "note_en": "Aspiration is phonemic in Sanskrit but allophonic in English — hold a hand before the mouth and feel the puff.",
    },
    {
        "id": "vowel_length",
        "label": "Short vs long",
        "pairs": [["a", "aa"], ["i", "ii"], ["u", "uu"], ["ri", "rii"]],
        "note_en": "Vowel length changes meaning — hold the long vowel for two beats.",
    },
    {
        "id": "labial",
        "label": "व vs ब",
        "pairs": [["va", "ba"]],
        "note_en": "Merged across much of eastern India — व touches the teeth to the lip, ब closes both lips.",
    },
]


def _with_minimal_pairs(cells: list[dict]) -> list[dict]:
    """Derive each cell's ``minimal_pairs`` by inverting CONTRAST_GROUPS.

    Symmetric (if ta lists tta, tta lists ta) and order-preserving:
    pairs are visited hardest-group-first, so each list is ordered by
    pedagogical priority.
    """
    pairs_of: dict[str, list[str]] = {}
    for group in CONTRAST_GROUPS:
        for x, y in group["pairs"]:
            pairs_of.setdefault(x, [])
            pairs_of.setdefault(y, [])
            if y not in pairs_of[x]:
                pairs_of[x].append(y)
            if x not in pairs_of[y]:
                pairs_of[y].append(x)
    for cell in cells:
        cell["minimal_pairs"] = pairs_of.get(cell["id"], [])
    return cells


_VOWELS = [
    ("a", "अ", "a", "kanthya", "अग्निः", "agniḥ", "fire"),
    ("aa", "आ", "ā", "kanthya", "आकाशः", "ākāśaḥ", "sky"),
    ("i", "इ", "i", "talavya", "इन्द्रः", "indraḥ", "Indra"),
    ("ii", "ई", "ī", "talavya", "ईश्वरः", "īśvaraḥ", "lord"),
    ("u", "उ", "u", "oshthya_kanthya", "उदकम्", "udakam", "water"),
    ("uu", "ऊ", "ū", "oshthya_kanthya", "ऊर्मिः", "ūrmiḥ", "wave"),
    ("ri", "ऋ", "ṛ", "murdhanya", "ऋषिः", "ṛṣiḥ", "seer"),
    ("rii", "ॠ", "ṝ", "murdhanya", "", "", ""),
    ("li", "ऌ", "ḷ", "dantya", "", "", ""),
    ("lii", "ॡ", "ḹ", "dantya", "", "", ""),
    ("e", "ए", "e", "kanthya_talavya", "एकम्", "ekam", "one"),
    ("ai", "ऐ", "ai", "kanthya_talavya", "ऐरावतः", "airāvataḥ", "Indra's elephant"),
    ("o", "ओ", "o", "kanthya_oshthya", "ओष्ठः", "oṣṭhaḥ", "lip"),
    ("au", "औ", "au", "kanthya_oshthya", "औषधम्", "auṣadham", "medicine"),
]

# (id, dev, iast, example_dev, example_iast, example_gloss)
_STOPS = [
    ("ka", "क", "ka", "कमलम्", "kamalam", "lotus"),
    ("kha", "ख", "kha", "खगः", "khagaḥ", "bird"),
    ("ga", "ग", "ga", "गजः", "gajaḥ", "elephant"),
    ("gha", "घ", "gha", "घटः", "ghaṭaḥ", "pot"),
    ("nga", "ङ", "ṅa", "अङ्गम्", "aṅgam", "limb"),
    ("ca", "च", "ca", "चन्द्रः", "candraḥ", "moon"),
    ("cha", "छ", "cha", "छत्रम्", "chatram", "umbrella"),
    ("ja", "ज", "ja", "जलम्", "jalam", "water"),
    ("jha", "झ", "jha", "झषः", "jhaṣaḥ", "fish"),
    ("nya", "ञ", "ña", "पञ्च", "pañca", "five"),
    ("tta", "ट", "ṭa", "पटः", "paṭaḥ", "cloth"),
    ("ttha", "ठ", "ṭha", "कण्ठः", "kaṇṭhaḥ", "throat"),
    ("dda", "ड", "ḍa", "डमरुः", "ḍamaruḥ", "drum"),
    ("ddha", "ढ", "ḍha", "मूढः", "mūḍhaḥ", "foolish"),
    ("nna", "ण", "ṇa", "गणः", "gaṇaḥ", "group"),
    ("ta", "त", "ta", "तरुः", "taruḥ", "tree"),
    ("tha", "थ", "tha", "रथः", "rathaḥ", "chariot"),
    ("da", "द", "da", "दन्तः", "dantaḥ", "tooth"),
    ("dha", "ध", "dha", "धनम्", "dhanam", "wealth"),
    ("na", "न", "na", "नदी", "nadī", "river"),
    ("pa", "प", "pa", "पत्रम्", "patram", "leaf"),
    ("pha", "फ", "pha", "फलम्", "phalam", "fruit"),
    ("ba", "ब", "ba", "बलम्", "balam", "strength"),
    ("bha", "भ", "bha", "भानुः", "bhānuḥ", "sun"),
    ("ma", "म", "ma", "मित्रम्", "mitram", "friend"),
]

_STOP_PLACE = {
    "ka": "kanthya", "kha": "kanthya", "ga": "kanthya", "gha": "kanthya",
    "nga": "kanthya",
    "ca": "talavya", "cha": "talavya", "ja": "talavya", "jha": "talavya",
    "nya": "talavya",
    "tta": "murdhanya", "ttha": "murdhanya", "dda": "murdhanya",
    "ddha": "murdhanya", "nna": "murdhanya",
    "ta": "dantya", "tha": "dantya", "da": "dantya", "dha": "dantya",
    "na": "dantya",
    "pa": "oshthya", "pha": "oshthya", "ba": "oshthya", "bha": "oshthya",
    "ma": "oshthya",
}

_STOP_VOICING = {
    "ka": "voiceless", "kha": "voiceless_aspirated", "ga": "voiced",
    "gha": "voiced_aspirated", "nga": "nasal",
    "ca": "voiceless", "cha": "voiceless_aspirated", "ja": "voiced",
    "jha": "voiced_aspirated", "nya": "nasal",
    "tta": "voiceless", "ttha": "voiceless_aspirated", "dda": "voiced",
    "ddha": "voiced_aspirated", "nna": "nasal",
    "ta": "voiceless", "tha": "voiceless_aspirated", "da": "voiced",
    "dha": "voiced_aspirated", "na": "nasal",
    "pa": "voiceless", "pha": "voiceless_aspirated", "ba": "voiced",
    "bha": "voiced_aspirated", "ma": "nasal",
}

_NASAL_IDS = {"nga", "nya", "nna", "na", "ma"}

# (id, dev, iast, place, voicing, kind, example_dev, example_iast, gloss, mark)
_OTHERS = [
    ("ya", "य", "ya", "talavya", "approximant", "semivowel", "यज्ञः", "yajñaḥ", "sacrifice", ""),
    ("ra", "र", "ra", "murdhanya", "approximant", "semivowel", "रविः", "raviḥ", "sun", ""),
    ("la", "ल", "la", "dantya", "approximant", "semivowel", "लता", "latā", "creeper", ""),
    ("va", "व", "va", "oshthya_dantya", "approximant", "semivowel", "वनम्", "vanam", "forest", ""),
    ("sha", "श", "śa", "talavya", "voiceless", "sibilant", "शिवः", "śivaḥ", "Śiva", ""),
    ("ssa", "ष", "ṣa", "murdhanya", "voiceless", "sibilant", "षट्", "ṣaṭ", "six", ""),
    ("sa", "स", "sa", "dantya", "voiceless", "sibilant", "सूर्यः", "sūryaḥ", "sun", ""),
    ("ha", "ह", "ha", "kanthya", "voiced_aspirate", "aspirate", "हस्तः", "hastaḥ", "hand", ""),
    ("am", "अं", "aṃ", None, None, "anusvara", "संस्कृतम्", "saṃskṛtam", "Sanskrit", "ं"),
    ("ah", "अः", "aḥ", None, None, "visarga", "रामः", "rāmaḥ", "Rāma", "ः"),
]


def _build() -> dict:
    vowels = [
        {"id": vid, "devanagari": dev, "iast": iast, "place": place,
         "voicing": "voiced", "kind": "vowel",
         "example_devanagari": exd, "example_iast": exi, "example_gloss": exg}
        for vid, dev, iast, place, exd, exi, exg in _VOWELS
    ]
    consonants = [
        {"id": vid, "devanagari": dev, "iast": iast,
         "place": _STOP_PLACE[vid], "voicing": _STOP_VOICING[vid],
         "kind": "consonant",
         "example_devanagari": exd, "example_iast": exi, "example_gloss": exg}
        for vid, dev, iast, exd, exi, exg in _STOPS
        if vid not in _NASAL_IDS
    ]
    nasals = [
        {"id": vid, "devanagari": dev, "iast": iast,
         "place": _STOP_PLACE[vid], "voicing": "nasal",
         "kind": "nasal",
         "example_devanagari": exd, "example_iast": exi, "example_gloss": exg}
        for vid, dev, iast, exd, exi, exg in _STOPS
        if vid in _NASAL_IDS
    ]
    others = [
        {"id": vid, "devanagari": dev, "iast": iast, "place": place,
         "voicing": voicing, "kind": kind,
         "example_devanagari": exd, "example_iast": exi, "example_gloss": exg,
         "mark": mark}
        for vid, dev, iast, place, voicing, kind, exd, exi, exg, mark in _OTHERS
    ]
    all_cells = vowels + consonants + nasals + others
    _with_minimal_pairs(all_cells)
    return {
        "vowels": vowels,
        "consonants": consonants,
        "nasals": nasals,
        "others": others,
    }


VARNAMALA_DATA = _build()
