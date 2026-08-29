"""
Sanskrit morphology analyzer — hybrid Vidyut + rule-based.

Uses vidyut.lipi for reliable Devanagari⇔IAST transliteration (critical fix).
Uses vidyut.cheda.Chedaka for supplementary analysis.
Falls back to rule-based analysis using corrected stem extraction.
"""

import logging
import os
from abc import ABC, abstractmethod
from typing import Optional

logger = logging.getLogger("shabd.analyzer")

# ─── Vidyut integration (lazy import to handle import-time unavailability) ───

_HAS_VIDYUT = False
_lipi = None
_Chedaka_cls = None

try:
    import vidyut.lipi as _lipi
    from vidyut.cheda import Chedaka as _Chedaka_cls
    from vidyut import download_data as _download_data
    _HAS_VIDYUT = True
except ImportError:
    pass


def get_vidyut_data_dir() -> str:
    from app.config import settings  # local import avoids circular import at module load
    vidyut_dir = os.environ.get("VIDYUT_DATA_DIR", "") or getattr(settings, "vidyut_data_dir", "")
    if not vidyut_dir:
        # analyzer.py lives at backend/app/grading/analyzer.py — three dirnames up = backend/
        vidyut_dir = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
            "vidyut-data",
        )
    return vidyut_dir


def ensure_vidyut_data(data_dir: str = None) -> str:
    if data_dir is None:
        data_dir = get_vidyut_data_dir()
    if not os.path.isdir(data_dir) or not os.path.isdir(os.path.join(data_dir, "cheda")):
        logger.info("Downloading Vidyut data to %s", data_dir)
        os.makedirs(data_dir, exist_ok=True)
        _download_data(data_dir)
        logger.info("Vidyut data downloaded to %s", data_dir)
    return data_dir


# ─── Transliteration (vidyut.lipi) ───

def devanagari_to_iast(text: str) -> str:
    if _lipi is not None:
        try:
            return _lipi.transliterate(text.strip(), _lipi.Scheme.Devanagari, _lipi.Scheme.Iast)
        except Exception as e:
            logger.debug("vidyut.lipi Dev→IAST failed for %r: %s", text, e)
    return text


def iast_to_devanagari(text: str) -> str:
    if _lipi is not None:
        try:
            return _lipi.transliterate(text.strip(), _lipi.Scheme.Iast, _lipi.Scheme.Devanagari)
        except Exception as e:
            logger.debug("vidyut.lipi IAST→Dev failed for %r: %s", text, e)
    return text


def normalize_to_slp1(text: str) -> str:
    if _lipi is None:
        return text
    has_dev = any(0x0900 <= ord(c) <= 0x097F for c in text)
    iast_diacritics = set("āīūṛṝḷḹṃḥñṭḍṇśṣ")
    has_iast = any(c in iast_diacritics for c in text)
    if has_dev:
        return _lipi.transliterate(text, _lipi.Scheme.Devanagari, _lipi.Scheme.Slp1)
    elif has_iast:
        dev = _lipi.transliterate(text, _lipi.Scheme.Iast, _lipi.Scheme.Devanagari)
        return _lipi.transliterate(dev, _lipi.Scheme.Devanagari, _lipi.Scheme.Slp1)
    return text


def slp1_to_iast(text: str) -> str:
    if _lipi is not None:
        try:
            dev = _lipi.transliterate(text.strip(), _lipi.Scheme.Slp1, _lipi.Scheme.Devanagari)
            return _lipi.transliterate(dev, _lipi.Scheme.Devanagari, _lipi.Scheme.Iast)
        except Exception as e:
            logger.debug("vidyut.lipi SLP1→IAST failed for %r: %s", text, e)
    return text


def detect_script(text: str) -> str:
    if not text:
        return "unknown"
    if any(0x0900 <= ord(c) <= 0x097F for c in text):
        return "dev"
    return "iast"


def strip_svara(text: str) -> str:
    return text.replace("́", "").replace("̀", "")


# ─── Known stems ───

# Other-stem noun table (u-stem masc like guru, bhrātṛ-type handled ad hoc)
# Gender registry: known-gender stems exclude readings from other genders.
# e.g. `rāmam` cannot be neut NOM ('rāma' is masculine); `phalam` cannot be
# masc ACC. Without this, wrong-case attempts pass via neut variants.
NOUN_GENDER: dict[str, str] = {
    # masculine a-stems
    "grāma": "masc", "bāla": "masc", "nara": "masc", "putra": "masc", "aśva": "masc",
    "deva": "masc", "guru": "masc", "rāma": "masc", "kṛṣṇa": "masc", "hanumat": "masc",
    "sūrya": "masc", "candra": "masc", "samudra": "masc", "piṭaka": "masc", "śiṣya": "masc",
    "rāmakṛṣṇa": "masc", "bhrātṛ": "masc",
    # neuter a-stems
    "phala": "neut", "jala": "neut", "pustaka": "neut", "geha": "neut", "vana": "neut",
    # feminine ā-stems
    "bālā": "fem", "kanyā": "fem", "nadī": "fem", "sītā": "fem", "gaṅgā": "fem", "latā": "fem",
    # classical-register stems
    "lakṣmaṇa": "masc", "maṇi": "masc", "prakāśa": "masc", "rāvaṇa": "masc",
    "nagara": "neut", "dharma": "masc", "tamas": "masc", "tamaḥ": "masc",
}

KNOWN_NOUNS: dict[str, str] = {
    # a-stem masc
    "grāma": "grāma", "bāla": "bāla", "nara": "nara",
    "putra": "putra", "aśva": "aśva", "deva": "deva",
    "guru": "guru", "mitra": "mitra",
    "rāma": "rāma", "kṛṣṇa": "kṛṣṇa", "hanumat": "hanumat",
    "sūrya": "sūrya", "candra": "candra",
    "samudra": "samudra", "piṭaka": "piṭaka",
    "śiṣya": "śiṣya",
    "rāmakṛṣṇa": "rāmakṛṣṇa",
    "lakṣmaṇa": "lakṣmaṇa", "maṇi": "maṇi", "prakāśa": "prakāśa",
    "rāvaṇa": "rāvaṇa", "nagara": "nagara", "dharma": "dharma",
    "tamas": "tamas", "tamaḥ": "tamas",
    "śiṣya": "śiṣya",
    # a-stem neut
    "phala": "phala", "jala": "jala", "pustaka": "pustaka",
    "geha": "geha", "vana": "vana",
    # ā-stem fem
    "bālā": "bālā", "kanyā": "kanyā", "nadī": "nadī",
    "sītā": "sītā", "gaṅgā": "gaṅgā", "latā": "latā",
    # other
    "bhrātṛ": "bhrātṛ", "bhrātā": "bhrātṛ", "bhrātaram": "bhrātṛ",
    "guru": "guru",
}

KNOWN_ROOTS: dict[str, str] = {
    "gam": "√gam", "gaccha": "√gam", "gacchā": "√gam",
    "paṭh": "√paṭh", "patha": "√paṭh",
    "bhav": "√bhū", "bhava": "√bhū",
    "khād": "√khād", "khāda": "√khād",
    "pā": "√pā", "piba": "√pā",
    "dṛś": "√dṛś", "paśya": "√dṛś",
    "śru": "√śru", "śṛṇu": "√śru",
    "kṛ": "√kṛ", "karo": "√kṛ", "kuru": "√kṛ",
    "vad": "√vad", "vada": "√vad",
    "likh": "√likh", "likha": "√likh",
    "nī": "√nī", "naya": "√nī",
    "dā": "√dā", "yaccha": "√dā", "dada": "√dā", "dadā": "√dā",
    "sthā": "√sthā", "tiṣṭha": "√sthā",
    "has": "√has", "hasa": "√has",
    "nṛt": "√nṛt", "nṛta": "√nṛt",
    "dhāv": "√dhāv", "dhāva": "√dhāv",
    "jñā": "√jñā", "jāna": "√jñā",
    "as": "√as", "asti": "√as", "santi": "√as", "sa": "√as",
    "paṭh": "√paṭh", "pāṭhaya": "√paṭh",
    "āgam": "√gam", "āgaccha": "√gam", "āgacchā": "√gam",
    "naś": "√naś", "naśya": "√naś", "nasya": "√naś",
    "car": "√car", "cara": "√car",
    "rakṣ": "√rakṣ", "rakṣa": "√rakṣ",
}

# IAST endings for a-stem masculine nouns
A_STEM_MASC: list[tuple[str, str, str]] = [
    ("aḥ", "NOM.SG", "a"), ("au", "NOM.DU", "a"), ("āḥ", "NOM.PL", "a"),
    ("am", "ACC.SG", "a"), ("au", "ACC.DU", "a"), ("ān", "ACC.PL", "a"),
    ("ena", "INSTR.SG", "a"), ("ābhyām", "INSTR.DU", "a"), ("aiḥ", "INSTR.PL", "a"),
    ("āya", "DAT.SG", "a"), ("ābhyām", "DAT.DU", "a"), ("ebhyaḥ", "DAT.PL", "a"),
    ("āt", "ABL.SG", "a"), ("ābhyām", "ABL.DU", "a"), ("ebhyaḥ", "ABL.PL", "a"),
    ("asya", "GEN.SG", "a"), ("ayoḥ", "GEN.DU", "a"), ("ānām", "GEN.PL", "a"),
    ("e", "LOC.SG", "a"), ("ayoḥ", "LOC.DU", "a"), ("eṣu", "LOC.PL", "a"),
]

A_STEM_NEUT: list[tuple[str, str, str]] = [
    ("am", "NOM.SG", "a"), ("e", "NOM.DU", "a"), ("āni", "NOM.PL", "a"),
    ("am", "ACC.SG", "a"), ("e", "ACC.DU", "a"), ("āni", "ACC.PL", "a"),
    ("ena", "INSTR.SG", "a"), ("ābhyām", "INSTR.DU", "a"), ("aiḥ", "INSTR.PL", "a"),
    ("āya", "DAT.SG", "a"), ("ābhyām", "DAT.DU", "a"), ("ebhyaḥ", "DAT.PL", "a"),
    ("āt", "ABL.SG", "a"), ("ābhyām", "ABL.DU", "a"), ("ebhyaḥ", "ABL.PL", "a"),
    ("asya", "GEN.SG", "a"), ("ayoḥ", "GEN.DU", "a"), ("ānām", "GEN.PL", "a"),
    ("e", "LOC.SG", "a"), ("ayoḥ", "LOC.DU", "a"), ("eṣu", "LOC.PL", "a"),
]
# NOTE: neut NOM/ACC are syncretic in every number (am/e/āni) — both readings are
# kept and the alternatives mechanism resolves them against accepted_parses.

A_STEM_FEM: list[tuple[str, str, str]] = [
    ("ā", "NOM.SG", "ā"), ("e", "NOM.DU", "ā"), ("āḥ", "NOM.PL", "ā"),
    ("ām", "ACC.SG", "ā"), ("e", "ACC.DU", "ā"), ("āḥ", "ACC.PL", "ā"),
    ("ayā", "INSTR.SG", "ā"), ("ābhyām", "INSTR.DU", "ā"), ("ābhiḥ", "INSTR.PL", "ā"),
    ("āyai", "DAT.SG", "ā"), ("ābhyām", "DAT.DU", "ā"), ("ābhyaḥ", "DAT.PL", "ā"),
    ("āḥ", "ABL.SG", "ā"), ("ābhyām", "ABL.DU", "ā"), ("ābhyaḥ", "ABL.PL", "ā"),
    ("āyāḥ", "GEN.SG", "ā"), ("ayoḥ", "GEN.DU", "ā"), ("ānām", "GEN.PL", "ā"),
    ("āyām", "LOC.SG", "ā"), ("ayoḥ", "LOC.DU", "ā"), ("āsu", "LOC.PL", "ā"),
]

# I-stem masculine (maṇiḥ, agniḥ, hariḥ...): NOM.SG -iḥ, ACC.SG -im, INSTR -inā,
# DAT/ABL/GEN -aye/-iḥ/-es..., LOC -au; NOM/ACC.PL -ayaḥ/-īn, LOC.PL -iṣu
I_STEM_MASC: list[tuple[str, str, str]] = [
    ("iḥ", "NOM.SG", "i"), ("ī", "NOM.DU", "i"), ("ayaḥ", "NOM.PL", "i"),
    ("im", "ACC.SG", "i"), ("ī", "ACC.DU", "i"), ("īn", "ACC.PL", "i"),
    ("inā", "INSTR.SG", "i"), ("ibhyām", "INSTR.DU", "i"), ("ibhiḥ", "INSTR.PL", "i"),
    ("aye", "DAT.SG", "i"), ("ibhyām", "DAT.DU", "i"), ("ibhyaḥ", "DAT.PL", "i"),
    ("es", "ABL.SG", "i"), ("ibhyām", "ABL.DU", "i"), ("ibhyaḥ", "ABL.PL", "i"),
    ("es", "GEN.SG", "i"), ("yos", "GEN.DU", "i"), ("īnām", "GEN.PL", "i"),
    ("au", "LOC.SG", "i"), ("yos", "LOC.DU", "i"), ("iṣu", "LOC.PL", "i"),
]

PRES_ENDING_IAST: dict[str, str] = {
    "mi": "PRES.1SG", "vaḥ": "PRES.1DU", "maḥ": "PRES.1PL",
    "si": "PRES.2SG", "thaḥ": "PRES.2DU", "tha": "PRES.2PL",
    "ti": "PRES.3SG", "taḥ": "PRES.3DU", "nti": "PRES.3PL",
    "te": "PRES.3SG", "ete": "PRES.3DU", "nte": "PRES.3PL",
    "se": "PRES.2SG", "ithe": "PRES.2DU", "dhve": "PRES.2PL",
    "e": "PRES.1SG", "āvahe": "PRES.1DU", "āmahe": "PRES.1PL",
}

INDECLINABLES = {
    "ca", "eva", "api", "na", "cet", "hi", "tu", "vā",
    "atha", "iti", "kila", "evam", "yathā", "tathā",
    "atra", "kva", "kutra", "tatra", "sadā", "nityam",
    "prati", "pare", "antar", "punaḥ", "punar",
    "saha",  # postposition "with" — governs INSTR but is itself uninflected
}

# Personal pronouns: parsed as PRON (transparent to grading). Sanskrit is
# pro-drop — subject pronouns are optional and never the exercise target,
# so attempts with or without them grade identically. Feature "PRON" is
# skipped by the engine's feature-set builders.
PRONOUNS = {
    "aham": "PRON", "vayam": "PRON", "āvām": "PRON",
    "tvam": "PRON", "yūyam": "PRON", "yuvām": "PRON",
    "saḥ": "PRON", "sā": "PRON", "te": "PRON",
}

# Vidyut enum → feature string maps
_VIBAKTI_MAP = {
    "praTamA": "NOM", "dvitIyA": "ACC", "tftIyA": "INSTR",
    "caturTI": "DAT", "paYcamI": "ABL", "zazWI": "GEN",
    "saptamI": "LOC", "samboDanam": "VOC",
}
_VACANA_MAP = {"eka": "SG", "dvi": "DU", "bahu": "PL"}
_LAKARA_MAP = {
    "la~w": "PRES", "la\\N": "IMPF", "lft": "FUT",
    "lo~w": "IMP", "ASIrli~N": "OPT", "vidhi~li~N": "OPT",
    "lu~N": "AOR", "li~w": "PERF",
}
_PURUSHA_MAP = {"praTama": "3", "maDyama": "2", "uttama": "1"}


# ─── Analyzer Protocol ───

class AnalyzerResult:
    def __init__(self, word: str, parsed: Optional[dict] = None,
                 confidence: float = 0.0, error: Optional[str] = None,
                 alternatives: Optional[list[dict]] = None):
        self.word = word
        self.parsed = parsed or {}
        self.confidence = confidence
        self.error = error
        # Alternate valid readings for morphologically ambiguous surface forms
        # (e.g. `au` is both NOM.DU and ACC.DU for a-stems). Never false-accuse:
        # if ANY reading matches, the answer is right.
        self.alternatives = alternatives or []

    @property
    def is_confident(self) -> bool:
        return self.confidence >= 0.5 and self.error is None

    def __repr__(self):
        return f"AnalyzerResult({self.word!r}, parsed={self.parsed}, conf={self.confidence}, err={self.error})"


class AnalyzerProtocol(ABC):
    @abstractmethod
    def analyze(self, text: str, is_iast: bool = False) -> list[AnalyzerResult]:
        ...


# ─── Rule-based analyzer with corrected stem extraction ───

class RuleBasedAnalyzer(AnalyzerProtocol):
    """Word-level analyzer with vidyut.lipi transliteration + correct stem extraction."""

    def analyze(self, text: str, is_iast: bool = False) -> list[AnalyzerResult]:
        # `is_iast` is accepted for protocol compatibility; script is
        # auto-detected per word (see _analyze_word), so mixed-script
        # sentences (e.g. "रामः phalam khādati") are handled word by word.
        words = text.strip().split()
        results = []
        for word in words:
            results.append(self._analyze_word(word))
        return results

    def _analyze_word(self, word: str, is_iast: bool = False) -> AnalyzerResult:
        clean = word.strip("।॥,.!?")
        if not clean:
            return AnalyzerResult(word, confidence=0.0, error="empty")
        # Per-word script detection: mixed-script input (code-switching) must
        # not force IAST words through the Devanagari path or vice versa.
        # The `is_iast` flag is only a hint and never overrides the word's
        # actual script.
        if detect_script(clean) == "dev":
            return self._analyze_word_dev(clean)
        return self._analyze_word_iast(clean)

    def _analyze_word_dev(self, word: str) -> AnalyzerResult:
        iast = devanagari_to_iast(word)
        # Word-final anusvāra (फलं) is the sandhi form of final m (फलम्).
        if iast.endswith("ṃ"):
            result = self._analyze_word_iast(iast[:-1] + "m")
        else:
            result = self._analyze_word_iast(iast)
        result.word = word
        return result

    def _reconstitute_stem(self, stripped: str, append_vowel: str) -> str:
        """Reconstitute the stem after stripping: stripped + append_vowel.
        Special case: if stripped is empty (word == ending), use vowel stem directly."""
        if not stripped:
            return append_vowel
        return stripped + append_vowel

    def _analyze_word_iast(self, word: str) -> AnalyzerResult:
        """Analyze an IAST word."""
        # 0) Indeclinables and pronouns FIRST — they must never be caught by
        #    ending analysis (e.g. `vayam` would match `-am` ACC.SG otherwise)
        if word in INDECLINABLES:
            return AnalyzerResult(word, parsed={word: "INDECL"}, confidence=0.8)
        if word in PRONOUNS:
            return AnalyzerResult(word, parsed={word: "PRON"}, confidence=0.8)

        # 1) Verb endings (sorted by length descending)
        for ending, feature in sorted(PRES_ENDING_IAST.items(), key=lambda x: -len(x[0])):
            if word.endswith(ending) and len(word) > len(ending):
                stem = word[:-len(ending)]
                # Exact match
                root = KNOWN_ROOTS.get(stem)
                if root:
                    return AnalyzerResult(word, parsed={root: feature}, confidence=0.8)
                # Stem ending in ā might correspond to a root ending in a
                if stem.endswith('ā') and len(stem) > 1:
                    alt_stem = stem[:-1] + 'a'
                    if alt_stem in KNOWN_ROOTS:
                        return AnalyzerResult(word, parsed={KNOWN_ROOTS[alt_stem]: feature}, confidence=0.75)
                # Partial prefix match — requires >=3 chars and the stem must
                # NOT be a known noun reconstitution (guard: `samudre` would
                # otherwise "verb-match" via the 2-char prefix `sa`).
                noun_guard = None  # (reconstitutable check below is the guard)
                reconstitutable = any(
                    (stem + v) in KNOWN_NOUNS for v in ("a", "ā", "i", "u")
                )
                if not reconstitutable:
                    for k, v in sorted(KNOWN_ROOTS.items(), key=lambda x: -len(x[0])):
                        if stem.startswith(k) and len(k) >= 3:
                            return AnalyzerResult(word, parsed={v: feature}, confidence=0.75)
                # Very common: gacchāmi -> stem gacchā -> try gaccha
                if stem in ('gacchā', 'gacche', 'gaccho'):
                    return AnalyzerResult(word, parsed={'√gam': feature}, confidence=0.75)

        # 2) Noun endings — collect ALL candidate readings (morphological ambiguity:
        #    `au`/`e` are both NOM.DU and ACC.DU; `oḥ` is ABL.SG and GEN.SG for a-stems;
        #    `-ām` is ACC.SG(fem) and GEN.PL). Emit every candidate as an alternative so
        #    grading never falsely accuses a correct answer (abstention principle).
        all_endings = []
        for ending, feature, stem_vowel in A_STEM_MASC:
            all_endings.append((ending, feature, stem_vowel, 'masc'))
        for ending, feature, stem_vowel in A_STEM_NEUT:
            all_endings.append((ending, feature, stem_vowel, 'neut'))
        for ending, feature, stem_vowel in A_STEM_FEM:
            all_endings.append((ending, feature, stem_vowel, 'fem'))
        for ending, feature, stem_vowel in I_STEM_MASC:
            all_endings.append((ending, feature, stem_vowel, 'masc'))

        known_candidates: list[tuple[str, str]] = []   # (role, feature) with known stems
        generic_candidates: list[tuple[str, str]] = [] # (stem, feature) unknown stems
        for ending, feature, stem_vowel, gender in all_endings:
            if word.endswith(ending) and len(word) > len(ending):
                raw_stem = word[:-len(ending)]
                stem = self._reconstitute_stem(raw_stem, stem_vowel)
                # Gender filter: a known-gender stem cannot take another
                # gender's endings (rāmam is never a neut NOM reading).
                g = NOUN_GENDER.get(stem)
                if g is not None and g != gender:
                    continue
                if stem in KNOWN_NOUNS:
                    known_candidates.append((KNOWN_NOUNS[stem], feature))
                else:
                    generic_candidates.append((stem, feature))

        # Deduplicate (role, feature) pairs, keep first-seen order
        def _dedup(cands):
            seen = set()
            out = []
            for c in cands:
                if c not in seen:
                    seen.add(c)
                    out.append(c)
            return out
        known_candidates = _dedup(known_candidates)
        generic_candidates = _dedup(generic_candidates)

        if known_candidates:
            role, feature = known_candidates[0]
            return AnalyzerResult(
                word, parsed={role: feature}, confidence=0.8,
                alternatives=[{r: f} for r, f in known_candidates[1:]],
            )
        if generic_candidates:
            stem, feature = generic_candidates[0]
            return AnalyzerResult(
                word, parsed={stem: feature}, confidence=0.7,
                alternatives=[{r: f} for r, f in generic_candidates[1:]],
            )

        # 2b) u-stem masculine (guruḥ, śiṣyuḥ, vṛkṣuḥ...): `-uḥ` NOM.SG — not in a-stem tables
        if word.endswith("uḥ") and len(word) > 2:
            stem = word[:-2] + "u"
            if stem in KNOWN_NOUNS:
                return AnalyzerResult(word, parsed={KNOWN_NOUNS[stem]: "NOM.SG"}, confidence=0.8)

        # 3) Known noun bare stem
        if word in KNOWN_NOUNS:
            return AnalyzerResult(word, parsed={KNOWN_NOUNS[word]: "NOM.SG"}, confidence=0.5)

        # 4) Known root alone
        for k, v in KNOWN_ROOTS.items():
            if word == k:
                return AnalyzerResult(word, parsed={v: "IMP.2SG"}, confidence=0.4)

        # 5) Indeclinables
        if word in INDECLINABLES:
            return AnalyzerResult(word, parsed={word: "INDECL"}, confidence=0.8)
        # 5b) Personal pronouns — transparent to grading (pro-drop language;
        # subject pronouns are optional and never the exercise target)
        if word in PRONOUNS:
            return AnalyzerResult(word, parsed={word: "PRON"}, confidence=0.8)
        if word == "vayam":
            return AnalyzerResult(word, parsed={"vayam": "PRON"}, confidence=0.8)

        return AnalyzerResult(word, confidence=0.3, error="unrecognized")


# ─── Vidyut-backed analyzer ───

class VidyutAnalyzer(AnalyzerProtocol):
    def __init__(self, data_dir: str = None):
        self._rule = RuleBasedAnalyzer()
        self._chedaka = None
        if _Chedaka_cls is not None:
            try:
                data_dir = ensure_vidyut_data(data_dir)
                self._chedaka = _Chedaka_cls(data_dir)
            except Exception as e:
                logger.warning("VidyutAnalyzer: Chedaka init failed: %s", e)

    def analyze(self, text: str, is_iast: bool = False) -> list[AnalyzerResult]:
        clean = text.strip("।॥,.!?")
        if not clean:
            return [AnalyzerResult(text, confidence=0.0, error="empty")]

        # Try hybrid: use Chedaka for word segmentation, rule for fallback
        if self._chedaka is not None:
            try:
                return self._hybrid_analyze(clean)
            except Exception as e:
                logger.debug("Hybrid failed (%s) — using rule", e)

        script = detect_script(clean)
        return self._rule.analyze(clean, is_iast=(script == "iast"))
        # Note: RuleBasedAnalyzer.analyze re-detects per word, so mixed-script
        # sentences (e.g. "रामः phalam khādati") are handled word by word.

    def _hybrid_analyze(self, text: str) -> list[AnalyzerResult]:
        """Per-word analysis: rule engine primary, Chedaka as a cross-check.

        Design note (verified empirically): Chedaka run on a FULL SENTENCE
        over-segments — it reanalyzes finite verbs as nouns when context
        confuses it (khādati → KAd LOC.SG) and adds phantom vocatives.
        Standalone per-word, it is usually right. So: every word is analyzed
        by the rule engine first; Chedaka's reading is added as an
        ALTERNATIVE (never overriding), and only when the rule engine is
        NOT confident does Chedaka's reading become primary.
        """
        script = detect_script(text)
        words = text.split()
        results: list[AnalyzerResult] = []

        for word in words:
            raw = word.strip("।॥,.!?")
            if not raw:
                continue

            # 1) Rule engine first (correct transliteration, curated tables)
            rule_result = self._rule._analyze_word(raw, is_iast=(script == "iast"))

            # 2) Chedaka cross-check on the single word
            chedaka_result = self._analyze_word_with_chedaka(raw)

            if rule_result.is_confident:
                if chedaka_result is not None and chedaka_result.is_confident:
                    chedaka_parsed = chedaka_result.parsed
                    if chedaka_parsed and chedaka_parsed != rule_result.parsed:
                        rule_result.alternatives.append(chedaka_parsed)
                results.append(rule_result)
            elif chedaka_result is not None and chedaka_result.is_confident:
                results.append(chedaka_result)
            else:
                results.append(rule_result if rule_result.confidence > 0 else
                               AnalyzerResult(raw, confidence=0.0, error="unrecognized"))

        return results if results else [AnalyzerResult(text, confidence=0.0, error="no_words")]

    def _analyze_word_with_chedaka(self, word: str) -> Optional[AnalyzerResult]:
        """Analyze a SINGLE word with Chedaka (no sentence context)."""
        if self._chedaka is None:
            return None
        try:
            slp1 = normalize_to_slp1(word)
            tokens = list(self._chedaka.run(slp1))
            # A clean single-word parse yields exactly one meaningful token
            meaningful = [t for t in tokens if t.data is not None]
            if len(meaningful) != 1:
                return None
            return self._try_extract(meaningful[0])
        except Exception:
            return None

    def _try_extract(self, token) -> Optional[AnalyzerResult]:
        data = token.data
        if data is None:
            return None
        type_name = type(data).__name__
        if "Tinanta" in type_name:
            return self._extract_verb(token, data)
        elif "Subanta" in type_name:
            return self._extract_noun(token, data)
        return None

    def _extract_verb(self, token, data) -> Optional[AnalyzerResult]:
        try:
            de = data.dhatu_entry
            ct = de.clean_text
            lemma = slp1_to_iast(ct)
            tense = _LAKARA_MAP.get(str(data.lakara))
            person = _PURUSHA_MAP.get(str(data.purusha))
            number = _VACANA_MAP.get(str(data.vacana))
            if tense and person and number:
                feature = f"{tense}.{person}{number}"
                role = KNOWN_ROOTS.get(lemma, f"√{lemma}")
                return AnalyzerResult(token.text, parsed={role: feature}, confidence=0.85)
        except Exception:
            pass
        return None

    def _extract_noun(self, token, data) -> Optional[AnalyzerResult]:
        try:
            pe = data.pratipadika_entry
            lemma_raw = None
            if hasattr(pe, 'clean_text') and pe.clean_text:
                lemma_raw = pe.clean_text
            elif hasattr(pe, 'lemma') and pe.lemma:
                lemma_raw = pe.lemma
            elif hasattr(pe, 'pratipadika'):
                pp = pe.pratipadika
                lemma_raw = pp.text if hasattr(pp, 'text') else str(pp)
            if not lemma_raw:
                return None
            lemma = slp1_to_iast(lemma_raw)
            case_feat = _VIBAKTI_MAP.get(str(data.vibhakti))
            num_feat = _VACANA_MAP.get(str(data.vacana))
            if case_feat and num_feat:
                feature = f"{case_feat}.{num_feat}"
                role = KNOWN_NOUNS.get(lemma, lemma)
                return AnalyzerResult(token.text, parsed={role: feature}, confidence=0.85)
        except Exception:
            pass
        return None


# ─── Factory ───

analyzer_instance = None


def create_analyzer() -> AnalyzerProtocol:
    global analyzer_instance
    if analyzer_instance is not None:
        return analyzer_instance
    from app.config import settings
    if settings.analyzer == "vidyut":
        if _Chedaka_cls is None:
            logger.warning("vidyut not installed — falling back to rule")
            analyzer_instance = RuleBasedAnalyzer()
        else:
            try:
                analyzer_instance = VidyutAnalyzer(data_dir=get_vidyut_data_dir())
            except Exception as e:
                logger.warning("VidyutAnalyzer failed (%s) — using rule", e)
                analyzer_instance = RuleBasedAnalyzer()
    else:
        analyzer_instance = RuleBasedAnalyzer()
    return analyzer_instance


analyzer = create_analyzer()


def analyze_sentence(text: str, is_iast: bool = False) -> list[AnalyzerResult]:
    return analyzer.analyze(text, is_iast=is_iast)


NON_CONTENT_FEATURES = {"INDECL", "PRON"}  # transparent to grading


def feature_set_from_results(results: list[AnalyzerResult]) -> dict[str, str]:
    result: dict[str, str] = {}
    for r in results:
        if r.is_confident:
            for role, feat in r.parsed.items():
                if feat not in NON_CONTENT_FEATURES:
                    result[role] = feat
    return result


def feature_set_variants(results: list[AnalyzerResult]) -> list[dict[str, str]]:
    """All valid feature-set readings of the sentence, given per-word alternatives.

    Morphologically ambiguous forms (au/e/oḥ/ām...) legitimately parse several
    ways. Grading must accept the attempt if ANY reading matches an accepted
    parse — ambiguity must never falsely accuse (abstention principle).
    Cross-product can explode, so cap it: primary reading plus one swap per
    ambiguous word at a time is sufficient for our challenge lengths.
    """
    base: dict[str, str] = {}
    ambiguous: list[list[tuple[str, str]]] = []  # per word: [(role, feat), ...] beyond primary
    for r in results:
        if not r.is_confident:
            continue
        for role, feat in r.parsed.items():
            if feat not in NON_CONTENT_FEATURES:
                base[role] = feat
        opts = []
        for alt in r.alternatives:
            for role, feat in alt.items():
                if role in base or role in dict(opts):
                    opts.append((role, feat))
        if opts:
            ambiguous.append(opts)

    variants = [base]
    for opts in ambiguous:
        new_variants = []
        for v in variants:
            for role, feat in opts:
                w = dict(v)
                w[role] = feat
                new_variants.append(w)
        variants.extend(new_variants)
        if len(variants) > 32:
            variants = variants[:32]
    # Deduplicate by feature-set key
    seen = set()
    out = []
    for v in variants:
        key = frozenset(v.items())
        if key not in seen:
            seen.add(key)
            out.append(v)
    return out


def is_confident(results: list[AnalyzerResult]) -> bool:
    if not results:
        return False
    return all(r.is_confident for r in results)