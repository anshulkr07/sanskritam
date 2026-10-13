"""Approved numeral surfaces with stable semantic IDs.

Every selectable choice in Number Builder is one of the entries below. An
entry carries: a stable semantic ID ("sa:n:48"), the value it contributes, the
approved surfaces (Devanagari plus Roman for Sanskrit; spelling for English),
the slot contexts it is approved for, and optional accepted variants.

Sources consulted for the Sanskrit inventory (background, not a certificate
of the modern decimal convention — that is recorded in CONVENTION_NOTE and
pending linguistic review, see REVIEW_STATUS in __init__):
  • Whitney, Sanskrit Grammar ch. VI (numerals, compound-numeral sandhi)
  • learnsanskrit.org "Number words" and "Big numbers" guides
Conventions: 21-99 use the classical unit-first construction (48 =
अष्टाचत्वारिंशत्, "eight-forty"); the x9 numbers use the common एकोन-
("one-less") forms as primary (39 = एकोनचत्वारिंशत्) with the unit-first
नव- compounds recorded as accepted variants.
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class Entry:
    semantic_id: str
    value: int
    contexts: tuple[str, ...]  # coef | unit | scale | marker | digit | sign
    surfaces: tuple[dict, ...]  # {"dev": "...", "roman": "..."} for sa; {"text": "..."} for en
    variants: tuple[dict, ...] = field(default=())

    def surface(self, script: str = "dev") -> str:
        for s in self.surfaces:
            if script in s:
                return s[script]
        return ""

    def all_strings(self) -> tuple[str, ...]:
        out: list[str] = []
        for s in (*self.surfaces, *self.variants):
            out.extend(v for v in s.values() if v)
        return tuple(out)


def _sa(n: int, dev: str, roman: str, variants: tuple[tuple[str, str], ...] = ()) -> Entry:
    return Entry(
        semantic_id=f"sa:n:{n}",
        value=n,
        contexts=("coef", "unit", "digit"),
        surfaces=({"dev": dev, "roman": roman},),
        variants=tuple({"dev": d, "roman": r} for d, r in variants),
    )


def _en(n: int, *spellings: str) -> Entry:
    return Entry(
        semantic_id=f"en:n:{n}",
        value=n,
        contexts=("coef", "unit", "digit"),
        surfaces=({"text": spellings[0]},),
        variants=tuple({"text": s} for s in spellings[1:]),
    )


def _scale(lang: str, kind: str, surfaces: tuple[dict, ...]) -> Entry:
    return Entry(
        semantic_id=f"{lang}:scale:{kind}",
        value=1,
        contexts=("scale",),
        surfaces=surfaces,
    )


# ── Sanskrit 0-99 (citation forms) ────────────────────────────────────────────

_SA_TEENS = [
    (0, "शून्यम्", "śūnyam", ()), (1, "एकम्", "ekam", ()), (2, "द्वे", "dve", ()),
    (3, "त्रीणि", "trīṇi", ()), (4, "चत्वारि", "catvāri", ()),
    (5, "पञ्च", "pañca", ()), (6, "षट्", "ṣaṭ", ()), (7, "सप्त", "sapta", ()),
    (8, "अष्ट", "aṣṭa", ()), (9, "नव", "nava", ()), (10, "दश", "daśa", ()),
    (11, "एकादश", "ekādaśa", ()), (12, "द्वादश", "dvādaśa", ()),
    (13, "त्रयोदश", "trayodaśa", ()), (14, "चतुर्दश", "caturdaśa", ()),
    (15, "पञ्चदश", "pañcadaśa", ()), (16, "षोडश", "ṣoḍaśa", ()),
    (17, "सप्तदश", "saptadaśa", ()), (18, "अष्टादश", "aṣṭādaśa", ()),
    (19, "एकोनविंशतिः", "ekonaviṃśatiḥ", (("नवदश", "navadaśa"),)),
]

_SA_TENS = {
    2: "विंशतिः", 3: "त्रिंशत्", 4: "चत्वारिंशत्", 5: "पञ्चाशत्",
    6: "षष्टिः", 7: "सप्ततिः", 8: "अशीतिः", 9: "नवतिः",
}

# x9 primaries: एकोन- ("one less") + the next decade/शतम्, with sandhi.
_EKONA = {
    19: "एकोनविंशतिः", 29: "एकोनत्रिंशत्", 39: "एकोनचत्वारिंशत्",
    49: "एकोनपञ्चाशत्", 59: "एकोनषष्टिः", 69: "एकोनसप्ततिः",
    79: "एकोनाशीतिः", 89: "एकोननवतिः", 99: "एकोनशतम्",
}

# Unit stem blended with the decade that follows (48 = अष्टा + चत्वारिंशत्).
_UNIT_STEM = {
    1: "एक", 2: "द्वा", 3: "त्रय", 4: "चतुर्", 5: "पञ्च", 6: "षट्",
    7: "सप्त", 8: "अष्टा", 9: "नव",
}

# (unit, tens-digit) -> full form, where the blend is irregular. Everything
# else composes as _UNIT_STEM[unit] + _SA_TENS[tens].
_SPECIAL = {
    (3, 2): "त्रयोविंशतिः", (4, 2): "चतुर्विंशतिः", (6, 2): "षड्विंशतिः",
    (3, 3): "त्रयस्त्रिंशत्", (4, 3): "चतुस्त्रिंशत्", (6, 3): "षट्त्रिंशत्",
    (3, 4): "त्रयश्चत्वारिंशत्", (4, 4): "चतुश्चत्वारिंशत्",
    (4, 5): "चतुर्पञ्चाशत्",
    (3, 6): "त्रयष्षष्टिः", (4, 6): "चतुष्षष्टिः",
    (3, 7): "त्रयस्सप्ततिः", (4, 7): "चतुस्सप्ततिः",
    (2, 8): "द्व्यशीतिः", (3, 8): "त्रयोशीतिः", (4, 8): "चतुरशीतिः",
    (5, 8): "पञ्चाशीतिः", (6, 8): "षडशीतिः", (7, 8): "सप्ताशीतिः",
    (8, 8): "अष्टाशीतिः", (9, 8): "नवाशीतिः",
}


def _unit_first(n: int) -> str:
    tens, unit = divmod(n, 10)
    if (unit, tens) in _SPECIAL:
        return _SPECIAL[(unit, tens)]
    return _UNIT_STEM[unit] + _SA_TENS[tens]


def _sa_number(n: int) -> tuple[str, str, tuple[tuple[str, str], ...]]:
    if n < 20:
        _, dev, roman, variants = _SA_TEENS[n]
        return dev, roman, variants
    tens, unit = divmod(n, 10)
    if unit == 0:
        return _SA_TENS[tens], "", ()
    if unit == 9:
        ekona = _EKONA[n]
        unit_first = _unit_first(n)
        return ekona, "", ((unit_first, ""),)
    return _unit_first(n), "", ()


class Romanizer:
    """IAST via the project's single transliteration seam (vidyut lipi).

    The lexicon stores Devanagari; Roman forms are computed once and cached.
    If the analyser is unavailable the Devanagari doubles as the Roman
    surface so a dev environment still renders something readable.
    """

    def __init__(self) -> None:
        self._cache: dict[str, str] = {}

    def __call__(self, dev: str) -> str:
        if dev in self._cache:
            return self._cache[dev]
        try:
            from app.services.iast import to_iast
            roman = to_iast(dev)
        except Exception:
            roman = dev
        if not roman:
            roman = dev
        self._cache[dev] = roman
        return roman


def _build_sa_numbers() -> dict[int, Entry]:
    rom = Romanizer()
    out: dict[int, Entry] = {}
    for n in range(100):
        dev, roman, variants = _sa_number(n)
        roman = roman or rom(dev)
        fixed = tuple((d, r or rom(d)) for d, r in variants)
        out[n] = _sa(n, dev, roman, fixed)
    return out


class Lexicon:
    """All approved surfaces for one language, with lookup indices."""

    def __init__(self, lang: str) -> None:
        self.lang = lang
        self.by_id: dict[str, Entry] = {}
        self.by_value: dict[tuple[str, int], list[Entry]] = {}
        self._longest: list[tuple[str, Entry]] = []

    def add(self, entry: Entry) -> None:
        self.by_id[entry.semantic_id] = entry
        for ctx in entry.contexts:
            self.by_value.setdefault((ctx, entry.value), []).append(entry)
        for s in entry.all_strings():
            self._longest.append((s, entry))
        self._longest.sort(key=lambda t: -len(t[0]))

    def find_by_surface(self, text: str, context: str | None = None) -> Entry | None:
        for surface, entry in self._longest:
            if surface == text or (self.lang == "en" and surface.casefold() == text.casefold()):
                if context is None or context in entry.contexts:
                    return entry
        return None

    def tokenize(self, phrase: str, context: str | None = None) -> list[Entry] | None:
        """Greedy longest-match tokenisation of a phrase; None on any word
        sequence that is not a concatenation of approved surfaces."""
        words = [w for w in phrase.replace(",", " ,").split() if w]
        out: list[Entry] = []
        i = 0
        while i < len(words):
            matched: Entry | None = None
            taken = 0
            for size in (3, 2, 1):
                if i + size > len(words):
                    continue
                e = self.find_by_surface(" ".join(words[i:i + size]), context)
                if e is not None:
                    matched = e
                    taken = size
                    break
            if matched is None:
                return None
            out.append(matched)
            i += taken
        return out

    def entries_for_context(self, context: str) -> list[Entry]:
        return [e for e in self.by_id.values() if context in e.contexts]


def _build_sanskrit() -> Lexicon:
    lx = Lexicon("sa")
    for entry in _build_sa_numbers().values():
        lx.add(entry)
    lx.add(_scale("sa", "hundred", ({"dev": "शतम्", "roman": "śatam"},)))
    lx.add(_scale("sa", "thousand", ({"dev": "सहस्रम्", "roman": "sahasram"},)))
    lx.add(_scale("sa", "lakh", ({"dev": "लक्षम्", "roman": "lakṣam"},)))
    lx.add(_scale("sa", "crore", ({"dev": "कोटिः", "roman": "koṭiḥ"},)))
    lx.add(Entry("sa:marker:decimal", 1, ("marker",), ({"dev": "दशमंशे", "roman": "daśamaṃśe"},)))
    lx.add(Entry("sa:sign:negative", 1, ("sign",), ({"dev": "ऋणम्", "roman": "ṛṇam"},)))
    return lx


def _build_english() -> Lexicon:
    lx = Lexicon("en")
    small = ["zero", "one", "two", "three", "four", "five", "six", "seven",
             "eight", "nine", "ten", "eleven", "twelve", "thirteen",
             "fourteen", "fifteen", "sixteen", "seventeen", "eighteen",
             "nineteen"]
    for n, w in enumerate(small):
        lx.add(_en(n, w))
    tens = {2: "twenty", 3: "thirty", 4: "forty", 5: "fifty", 6: "sixty",
            7: "seventy", 8: "eighty", 9: "ninety"}
    for t, w in tens.items():
        lx.add(_en(t * 10, w))
        for u in range(1, 10):
            lx.add(_en(t * 10 + u, f"{w}-{small[u]}"))
    lx.add(_scale("en", "hundred", ({"text": "hundred"},)))
    lx.add(_scale("en", "thousand", ({"text": "thousand"},)))
    lx.add(_scale("en", "lakh", ({"text": "lakh"},)))
    lx.add(_scale("en", "crore", ({"text": "crore"},)))
    lx.add(_scale("en", "million", ({"text": "million"},)))
    lx.add(Entry("en:marker:decimal", 1, ("marker",), ({"text": "point"},)))
    lx.add(Entry("en:sign:negative", 1, ("sign",), ({"text": "minus"},), ({"text": "negative"},)))
    return lx


_LEXICONS: dict[str, Lexicon] = {}


def get_lexicon(lang: str) -> Lexicon:
    if lang not in ("sa", "en"):
        raise ValueError(f"unsupported answer language {lang!r}")
    if lang not in _LEXICONS:
        _LEXICONS[lang] = _build_sanskrit() if lang == "sa" else _build_english()
    return _LEXICONS[lang]
