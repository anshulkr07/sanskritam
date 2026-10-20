"""Where the mouth makes each letter (स्थान), for the mouth-map widget.

The standard six places of the Sanskrit phonetic tradition: throat, palate,
the roof of the mouth (tongue curled back), teeth, lips and nose. ए ऐ use
throat + palate, ओ औ throat + lips, व teeth + lips; the nasals of the five
rows add the nose to their row's place; anusvāra is the nose alone.

The app never decides this: the builder ships ``places`` for every letter a
mouth-map card shows, from this table.
"""

from __future__ import annotations

PLACE_IDS = ("kantha", "talu", "murdha", "danta", "oshtha", "nasika")

#: Learner-facing names of the places (English, Hindi, Sanskrit).
PLACE_NAMES = {
    "kantha": {"en": "throat", "hi": "कण्ठ (गला)", "sa": "कण्ठः"},
    "talu": {"en": "palate", "hi": "तालु", "sa": "तालु"},
    "murdha": {"en": "roof of the mouth, tongue curled back", "hi": "मूर्धा (मुँह की छत)", "sa": "मूर्धा"},
    "danta": {"en": "teeth", "hi": "दाँत", "sa": "दन्ताः"},
    "oshtha": {"en": "lips", "hi": "होंठ", "sa": "ओष्ठौ"},
    "nasika": {"en": "nose", "hi": "नाक", "sa": "नासिका"},
}

_ROWS = {
    "kantha": "अ आ क ख ग घ ङ ह ः",
    "talu": "इ ई च छ ज झ ञ य श",
    "murdha": "ऋ ॠ ट ठ ड ढ ण र ष",
    "danta": "ऌ ॡ त थ द ध न ल स",
    "oshtha": "उ ऊ प फ ब भ म",
}

PLACES: dict[str, list[str]] = {}
for _place, _letters in _ROWS.items():
    for _letter in _letters.split():
        PLACES.setdefault(_letter, []).append(_place)
for _letter in ("ङ", "ञ", "ण", "न", "म"):
    PLACES[_letter].append("nasika")
PLACES.update({
    "ए": ["kantha", "talu"], "ऐ": ["kantha", "talu"],
    "ओ": ["kantha", "oshtha"], "औ": ["kantha", "oshtha"],
    "व": ["danta", "oshtha"],
    "ं": ["nasika"],
})

#: Dependent vowel signs (मात्राएँ) and the vowel each one writes.
VOWEL_SIGNS = {
    "ा": "आ", "ि": "इ", "ी": "ई", "ु": "उ", "ू": "ऊ", "ृ": "ऋ", "ॄ": "ॠ",
    "ॢ": "ऌ", "े": "ए", "ै": "ऐ", "ो": "ओ", "ौ": "औ",
}

VIRAMA = "्"


def places_for(letters: list[str]) -> dict[str, list[str]]:
    """Places for each letter; a letter that is not in the table is left
    out (the checker reports it)."""
    return {x: PLACES[x] for x in letters if x in PLACES}
