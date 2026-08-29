"""
Rule-based Sanskrit morphology analyzer for Devanagari and IAST.

FALLBACK analyzer: works 100% offline with no compiled deps.
Structured so a Vidyut-backed analyzer can drop in via the AnalyzerProtocol.

Note on sandhi: this analyzer does NOT perform sandhi splitting on the input.
It grades against both the raw and a naively-split variant (the splitter handles
common vowel sandhis: a+a -> ā, a+i -> e, a+u -> o, etc.). The engine calls the
splitter before analysis. See engine.py for the dual-path logic.
"""

import re
from abc import ABC, abstractmethod
from typing import Optional

# ─── Transliteration helpers ───

DEVANAGARI_TO_IAST: dict[str, str] = {
    "अ": "a", "आ": "ā", "इ": "i", "ई": "ī", "उ": "u", "ऊ": "ū",
    "ऋ": "ṛ", "ॠ": "ṝ", "ऌ": "ḷ", "ॡ": "ḹ",
    "ए": "e", "ऐ": "ai", "ओ": "o", "औ": "au",
    "क": "ka", "ख": "kha", "ग": "ga", "घ": "gha", "ङ": "ṅa",
    "च": "ca", "छ": "cha", "ज": "ja", "झ": "jha", "ञ": "ña",
    "ट": "ṭa", "ठ": "ṭha", "ड": "ḍa", "ढ": "ḍha", "ण": "ṇa",
    "त": "ta", "थ": "tha", "द": "da", "ध": "dha", "न": "na",
    "प": "pa", "फ": "pha", "ब": "ba", "भ": "bha", "म": "ma",
    "य": "ya", "र": "ra", "ल": "la", "व": "va",
    "श": "śa", "ष": "ṣa", "स": "sa", "ह": "ha",
    "ं": "ṃ", "ः": "ḥ", "्": "",
}

# Reverse IAST→Devanagari (partial — just enough for our use)
IAST_TO_DEVANAGARI: dict[str, str] = {
    "a": "अ", "ā": "आ", "i": "इ", "ī": "ई", "u": "उ", "ū": "ऊ",
    "ṛ": "ऋ", "ṝ": "ॠ", "ḷ": "ऌ", "ḹ": "ॡ",
    "e": "ए", "ai": "ऐ", "o": "ओ", "au": "औ",
}

# Samdhi verb stems used internally
_stem_map = {}

iast_to_dev = {v: k for k, v in DEVANAGARI_TO_IAST.items()}


def devanagari_to_iast(text: str) -> str:
    """Convert Devanagari text to IAST romanisation."""
    result = []
    i = 0
    while i < len(text):
        ch = text[i]
        # Check for halant (virama): consonant + ् + vowel/cluster
        if ch in DEVANAGARI_TO_IAST:
            result.append(DEVANAGARI_TO_IAST[ch])
        elif ch == " ":
            result.append(" ")
        elif ch in "।॥":
            result.append(ch)
        elif ord(ch) >= 0x0900 and ord(ch) <= 0x097F:
            # Dependent signs (vowel signs, anusvara, visarga)
            ds_map = {
                "ा": "ā", "ि": "i", "ी": "ī", "ु": "u", "ू": "ū",
                "ृ": "ṛ", "े": "e", "ै": "ai", "ो": "o", "ौ": "au",
                "ं": "ṃ", "ः": "ḥ",
            }
            if ch in ds_map:
                result.append(ds_map[ch])
            elif ch == "्":
                # Halant — skip, it modifies the previous consonant
                pass
            else:
                result.append(ch)
        else:
            result.append(ch)
        i += 1
    return "".join(result)


def iast_to_devanagari(text: str) -> str:
    """Simple IAST to Devanagari conversion (for lookup keys)."""
    result = []
    i = 0
    while i < len(text):
        # Try multi-char IAST digraphs first
        matched = False
        for length in (3, 2, 1):
            if i + length <= len(text):
                chunk = text[i:i+length]
                if chunk in IAST_TO_DEVANAGARI:
                    result.append(IAST_TO_DEVANAGARI[chunk])
                    i += length
                    matched = True
                    break
        if not matched:
            result.append(text[i])
            i += 1
    return "".join(result)


def strip_svara(text: str) -> str:
    """Remove svara (accent) marks from IAST text."""
    return text.replace("́", "").replace("̀", "")


# ─── POS / Word type detection ───

# a-stem masculine endings: -aḥ (nom sg), -au (nom du), -āḥ (nom pl)
# a-stem neuter endings: -am (nom sg), -e (nom du), -āni (nom pl)
# ā-stem feminine endings: -ā (nom sg), -e (nom du), -āḥ (nom pl)

# Present tense endings
PRES_ENDING_MAP: dict[str, str] = {
    "मि": "PRES.1SG", "वः": "PRES.1DU", "मः": "PRES.1PL",
    "सि": "PRES.2SG", "थः": "PRES.2DU", "थ": "PRES.2PL",
    "ति": "PRES.3SG", "तः": "PRES.3DU", "न्ति": "PRES.3PL",
    "ते": "PRES.3SG", "ते": "PRES.3SG",  # ātmanepada some overlap
    "ते": "PRES.3SG", "एते": "PRES.3DU", "न्ते": "PRES.3PL",
    "से": "PRES.2SG", "इथे": "PRES.2DU", "ध्वे": "PRES.2PL",
    "ए": "PRES.1SG", "आवहे": "PRES.1DU", "आमहे": "PRES.1PL",
}

# IAST present endings
PRES_ENDING_IAST: dict[str, str] = {
    "mi": "PRES.1SG", "vaḥ": "PRES.1DU", "maḥ": "PRES.1PL",
    "si": "PRES.2SG", "thaḥ": "PRES.2DU", "tha": "PRES.2PL",
    "ti": "PRES.3SG", "taḥ": "PRES.3DU", "nti": "PRES.3PL",
    "te": "PRES.3SG", "ete": "PRES.3DU", "nte": "PRES.3PL",
    "se": "PRES.2SG", "ithe": "PRES.2DU", "dhve": "PRES.2PL",
    "e": "PRES.1SG", "āvahe": "PRES.1DU", "āmahe": "PRES.1PL",
}

# Noun case endings (a-stem masc/neut)
A_STEM_MASC_ENDINGS: dict[str, str] = {
    "ः": "NOM.SG", "ौ": "NOM.DU", "ाः": "NOM.PL",
    "म्": "ACC.SG", "ौ": "ACC.DU", "ान्": "ACC.PL",
    "ेण": "INSTR.SG", "ाभ्याम्": "INSTR.DU", "ैः": "INSTR.PL",
    "ाय": "DAT.SG", "ाभ्याम्": "DAT.DU", "ेभ्यः": "DAT.PL",
    "ात्": "ABL.SG", "ाभ्याम्": "ABL.DU", "ेभ्यः": "ABL.PL",
    "स्य": "GEN.SG", "योः": "GEN.DU", "ानाम्": "GEN.PL",
    "े": "LOC.SG", "योः": "LOC.DU", "ेषु": "LOC.PL",
    "": "VOC.SG",  # stem alone
}

A_STEM_NEUT_ENDINGS: dict[str, str] = {
    "म्": "NOM.SG", "े": "NOM.DU", "ानि": "NOM.PL",
    "म्": "ACC.SG", "े": "ACC.DU", "ानि": "ACC.PL",
    "ेण": "INSTR.SG", "ाभ्याम्": "INSTR.DU", "ैः": "INSTR.PL",
    "ाय": "DAT.SG", "ाभ्याम्": "DAT.DU", "ेभ्यः": "DAT.PL",
    "ात्": "ABL.SG", "ाभ्याम्": "ABL.DU", "ेभ्यः": "ABL.PL",
    "स्य": "GEN.SG", "योः": "GEN.DU", "ानाम्": "GEN.PL",
    "े": "LOC.SG", "योः": "LOC.DU", "ेषु": "LOC.PL",
}

# IAST a-stem masc endings
A_STEM_MASC_IAST: dict[str, str] = {
    "aḥ": "NOM.SG", "au": "NOM.DU", "āḥ": "NOM.PL",
    "am": "ACC.SG", "au": "ACC.DU", "ān": "ACC.PL",
    "ena": "INSTR.SG", "ābhyām": "INSTR.DU", "aiḥ": "INSTR.PL",
    "āya": "DAT.SG", "ābhyām": "DAT.DU", "ebhyaḥ": "DAT.PL",
    "āt": "ABL.SG", "ābhyām": "ABL.DU", "ebhyaḥ": "ABL.PL",
    "asya": "GEN.SG", "ayoḥ": "GEN.DU", "ānām": "GEN.PL",
    "e": "LOC.SG", "ayoḥ": "LOC.DU", "eṣu": "LOC.PL",
}

A_STEM_NEUT_IAST: dict[str, str] = {
    "am": "NOM.SG", "e": "NOM.DU", "āni": "NOM.PL",
    "am": "ACC.SG", "e": "ACC.DU", "āni": "ACC.PL",
    "ena": "INSTR.SG", "ābhyām": "INSTR.DU", "aiḥ": "INSTR.PL",
    "āya": "DAT.SG", "ābhyām": "DAT.DU", "ebhyaḥ": "DAT.PL",
    "āt": "ABL.SG", "ābhyām": "ABL.DU", "ebhyaḥ": "ABL.PL",
    "asya": "GEN.SG", "ayoḥ": "GEN.DU", "ānām": "GEN.PL",
    "e": "LOC.SG", "ayoḥ": "LOC.DU", "eṣu": "LOC.PL",
}

# IAST ā-stem feminine
A_STEM_FEM_IAST: dict[str, str] = {
    "ā": "NOM.SG", "e": "NOM.DU", "āḥ": "NOM.PL",
    "ām": "ACC.SG", "e": "ACC.DU", "āḥ": "ACC.PL",
    "ayā": "INSTR.SG", "ābhyām": "INSTR.DU", "ābhiḥ": "INSTR.PL",
    "āyai": "DAT.SG", "ābhyām": "DAT.DU", "ābhyaḥ": "DAT.PL",
    "āḥ": "ABL.SG", "ābhyām": "ABL.DU", "ābhyaḥ": "ABL.PL",
    "āyāḥ": "GEN.SG", "ayoḥ": "GEN.DU", "ānām": "GEN.PL",
    "āyām": "LOC.SG", "ayoḥ": "LOC.DU", "āsu": "LOC.PL",
}

# Devanagari ā-stem feminine
A_STEM_FEM_DEV: dict[str, str] = {
    "ा": "NOM.SG", "े": "NOM.DU", "ाः": "NOM.PL",
    "ाम्": "ACC.SG", "े": "ACC.DU", "ाः": "ACC.PL",
    "या": "INSTR.SG", "ाभ्याम्": "INSTR.DU", "ाभिः": "INSTR.PL",
    "यै": "DAT.SG", "ाभ्याम्": "DAT.DU", "ाभ्यः": "DAT.PL",
    "ाः": "ABL.SG", "ाभ्याम्": "ABL.DU", "ाभ्यः": "ABL.PL",
    "याः": "GEN.SG", "योः": "GEN.DU", "ानाम्": "GEN.PL",
    "याम्": "LOC.SG", "योः": "LOC.DU", "ासु": "LOC.PL",
}

# Common verb roots (dhātu) we recognize
KNOWN_ROOTS: dict[str, str] = {
    # Devanagari
    "गम्": "√gam", "गच्छ": "√gam",
    "पठ्": "√paṭh", "पठ": "√paṭh",
    "भव्": "√bhū", "भव": "√bhū",
    "खाद्": "√khād", "खाद": "√khād",
    "पा": "√pā", "पिब": "√pā",
    "दृश्": "√dṛś", "पश्य": "√dṛś",
    "श्रु": "√śru", "शृणु": "√śru",
    "कर्": "√kṛ", "करो": "√kṛ", "कुरु": "√kṛ",
    "वद्": "√vad", "वद": "√vad",
    "लिख्": "√likh", "लिख": "√likh",
    "नय": "√nī", "नी": "√nī",
    "इ": "√i", "ए": "√i",
    "दा": "√dā", "यच्छ": "√dā",
    "स्था": "√sthā", "तिष्ठ": "√sthā",
    "हस्": "√has", "हस": "√has",
    "नृत्": "√nṛt", "नृत": "√nṛt",
    "धाव्": "√dhāv", "धाव": "√dhāv",
    "ज्ञा": "√jñā", "जान": "√jñā",
    # IAST
    "gam": "√gam", "gaccha": "√gam",
    "paṭh": "√paṭh", "patha": "√paṭh",
    "bhav": "√bhū", "bhava": "√bhū",
    "khād": "√khād", "khāda": "√khād",
    "piba": "√pā",
    "paśya": "√dṛś",
    "śṛṇu": "√śru",
    "karo": "√kṛ", "kuru": "√kṛ",
    "vada": "√vad",
    "likha": "√likh",
    "naya": "√nī",
    "yaccha": "√dā",
    "tiṣṭha": "√sthā",
    "hasa": "√has",
    "nṛta": "√nṛt",
    "dhāva": "√dhāv",
    "jāna": "√jñā",
}

# Common noun stems we know
KNOWN_NOUNS: dict[str, str] = {
    # Devanagari
    "ग्राम": "grāma", "बाल": "bāla", "नर": "nara",
    "पुत्र": "putra", "अश्व": "aśva", "देव": "deva",
    "गुरु": "guru", "मित्र": "mitra",
    "फल": "phala", "जल": "jala", "पुस्तक": "pustaka",
    "गेह": "geha", "वन": "vana",
    "बाला": "bālā", "कन्या": "kanyā", "नदी": "nadī",
    "सीता": "sītā", "गङ्गा": "gaṅgā", "लता": "latā",
    "राम": "rāma", "कृष्ण": "kṛṣṇa", "हनुमत्": "hanumat",
    "सूर्य": "sūrya", "चन्द्र": "candra",
    # IAST
    "grāma": "grāma", "bāla": "bāla", "nara": "nara",
    "putra": "putra", "aśva": "aśva", "deva": "deva",
    "guru": "guru", "mitra": "mitra",
    "phala": "phala", "jala": "jala", "pustaka": "pustaka",
    "geha": "geha", "vana": "vana",
    "bālā": "bālā", "kanyā": "kanyā", "nadī": "nadī",
    "sītā": "sītā", "gaṅgā": "gaṅgā", "latā": "latā",
    "rāma": "rāma", "kṛṣṇa": "kṛṣṇa", "hanumat": "hanumat",
    "sūrya": "sūrya", "candra": "candra",
}

# IAST vowels
IAST_VOWELS = {"a", "ā", "i", "ī", "u", "ū", "ṛ", "ṝ", "ḷ", "e", "ai", "o", "au"}

DEV_VOWEL_SIGNS = {"ा", "ि", "ी", "ु", "ू", "ृ", "े", "ै", "ो", "ौ"}

# Sandhi split rules: common vowel sandhis
# When two vowels meet, the first transforms. These are the most common:
SANDHI_MERGE: dict[tuple[str, str], str] = {
    ("a", "a"): "ā",
    ("a", "ā"): "ā",
    ("ā", "a"): "ā",
    ("ā", "ā"): "ā",
    ("a", "i"): "e",
    ("a", "ī"): "e",
    ("ā", "i"): "e",
    ("ā", "ī"): "e",
    ("a", "u"): "o",
    ("a", "ū"): "o",
    ("ā", "u"): "o",
    ("ā", "ū"): "o",
    ("a", "e"): "ai",
    ("ā", "e"): "ai",
    ("a", "o"): "au",
    ("ā", "o"): "au",
}

SANDHI_SPLIT = {v: k for k, v in SANDHI_MERGE.items()}
# Also e < a+i, a+i etc, o < a+u etc
# We'll handle in the splitter logic


def naive_sandhi_split(text: str, is_iast: bool = True) -> list[str]:
    """
    Naive sandhi splitter for common vowel sandhis.
    Attempts to split at likely word boundaries by scanning for sandhi patterns.
    This is intentionally simple — just enough to handle the most common cases
    like grāmam + gacchāmi -> grāmaṃ gacchāmi or grāma + āgacchati -> grāmāgacchati.
    """
    if not is_iast:
        text = devanagari_to_iast(text)

    text = strip_svara(text)
    words = text.split()
    # If already space-separated, return as-is
    if len(words) > 1:
        return words

    # Try splitting at known sandhi boundaries
    result = []
    remaining = text

    # We'll look for patterns like "gramam" + verb-starting word
    # For simplicity, if the text has no spaces, return it as one word
    return [text]


# ─── Analyzer Protocol ───

class AnalyzerResult:
    """Result of analyzing a single word."""
    def __init__(self, word: str, parsed: Optional[dict[str, str]] = None,
                 confidence: float = 0.0, error: Optional[str] = None):
        self.word = word
        self.parsed = parsed or {}  # {word_role: feature}
        self.confidence = confidence  # 0..1
        self.error = error

    @property
    def is_confident(self) -> bool:
        return self.confidence >= 0.5 and self.error is None


class AnalyzerProtocol(ABC):
    """Interface for morphology analyzers. Drop-in for Vidyut later."""

    @abstractmethod
    def analyze(self, text: str, is_iast: bool = False) -> list[AnalyzerResult]:
        """Analyze a sentence, return list of word results."""
        ...


class RuleBasedAnalyzer(AnalyzerProtocol):
    """Rule-based fallback analyzer for common Sanskrit morphology."""

    def analyze(self, text: str, is_iast: bool = False) -> list[AnalyzerResult]:
        """Analyze each word in the text."""
        words = text.strip().split()
        results = []
        for word in words:
            result = self._analyze_word(word, is_iast)
            results.append(result)
        return results

    def _analyze_word(self, word: str, is_iast: bool) -> AnalyzerResult:
        """Analyze a single word."""
        clean = word.strip("।॥,.!?")
        if not clean:
            return AnalyzerResult(word, confidence=0.0, error="empty")

        if is_iast:
            return self._analyze_word_iast(clean)
        else:
            return self._analyze_word_dev(clean)

    def _is_verb(self, stem: str, is_iast: bool = False) -> Optional[str]:
        """Check if stem is a known verb root. Returns the canonical root."""
        if is_iast:
            # Check IAST roots directly
            for k, v in KNOWN_ROOTS.items():
                if stem.startswith(k):
                    return v
            return None
        for k, v in KNOWN_ROOTS.items():
            if stem.startswith(k):
                return v
        return None

    def _analyze_word_iast(self, word: str) -> AnalyzerResult:
        """Analyze an IAST word."""
        # Try verb endings first
        for ending, feature in PRES_ENDING_IAST.items():
            if word.endswith(ending) and len(word) > len(ending) + 1:
                stem = word[:-len(ending)]
                root = KNOWN_ROOTS.get(stem)
                if root:
                    return AnalyzerResult(
                        word, parsed={root: feature}, confidence=0.8
                    )
                # Try longer stem match
                for k, v in KNOWN_ROOTS.items():
                    if stem.startswith(k):
                        return AnalyzerResult(
                            word, parsed={v: feature}, confidence=0.75
                        )
                # Generic verb detection
                if stem.endswith("a") or stem.endswith("ā"):
                    generic_root = f"√{stem[:3]}"
                    return AnalyzerResult(
                        word, parsed={generic_root: feature}, confidence=0.5
                    )

        # Try noun endings (a-stem neuter)
        for ending, feature in A_STEM_NEUT_IAST.items():
            if word.endswith(ending) and len(word) > len(ending) + 1:
                stem = word[:-len(ending)]
                canonical = KNOWN_NOUNS.get(stem)
                if canonical or stem in KNOWN_NOUNS.values():
                    name = canonical or stem
                    return AnalyzerResult(
                        word, parsed={name: feature}, confidence=0.8
                    )

        # Try noun endings (ā-stem feminine)
        for ending, feature in A_STEM_FEM_IAST.items():
            if word.endswith(ending) and len(word) > len(ending) + 1:
                stem = word[:-len(ending)]
                canonical = KNOWN_NOUNS.get(stem)
                if canonical:
                    return AnalyzerResult(
                        word, parsed={canonical: feature}, confidence=0.8
                    )

        # Try noun endings (a-stem masculine)
        for ending, feature in A_STEM_MASC_IAST.items():
            if word.endswith(ending) and len(word) > len(ending) + 1:
                stem = word[:-len(ending)]
                canonical = KNOWN_NOUNS.get(stem)
                if canonical:
                    return AnalyzerResult(
                        word, parsed={canonical: feature}, confidence=0.8
                    )
                # Generic a-stem detection
                if KNOWN_NOUNS.get(stem):
                    return AnalyzerResult(
                        word, parsed={stem: feature}, confidence=0.7
                    )

        # Check if it's a known noun in nominative
        if word in KNOWN_NOUNS:
            # Could be a stem used as vocative or indeclinable
            return AnalyzerResult(
                word, parsed={KNOWN_NOUNS[word]: "NOM.SG"}, confidence=0.5
            )

        # Known root alone? Could be imperative or stem
        for k, v in KNOWN_ROOTS.items():
            if word == k or word.endswith(k):
                return AnalyzerResult(
                    word, parsed={v: "IMP.2SG"}, confidence=0.4
                )

        # Indeclinables / common particles
        if word in {"ca", "eva", "api", "na", "cet", "hi", "tu", "vā",
                     "atha", "iti", "kila", "evam", "yathā", "tathā",
                     "atra", "kva", "kutra", "tatra", "sadā", "nityam",
                     "prati", "pare", "antar", "puñaḥ", "punar"}:
            return AnalyzerResult(word, parsed={word: "INDECL"}, confidence=0.8)

        # Low confidence
        return AnalyzerResult(word, confidence=0.3, error="unrecognized")

    def _analyze_word_dev(self, word: str) -> AnalyzerResult:
        """Analyze a Devanagari word by converting to IAST and re-analyzing."""
        iast = devanagari_to_iast(word)
        result = self._analyze_word_iast(iast)
        # Keep the original word
        result.word = word
        return result


def create_analyzer() -> AnalyzerProtocol:
    """Factory: creates the configured analyzer."""
    from app.config import settings
    if settings.analyzer == "vidyut":
        # Placeholder for future Vidyut-backed analyzer
        raise ImportError("Vidyut analyzer not yet implemented — use ANALYZER=rule")
    return RuleBasedAnalyzer()


analyzer = create_analyzer()


def analyze_sentence(text: str, is_iast: bool = False) -> list[AnalyzerResult]:
    """Convenience: analyze a full sentence, handling sandhi variants."""
    return analyzer.analyze(text, is_iast=is_iast)


def feature_set_from_results(results: list[AnalyzerResult]) -> dict[str, str]:
    """Extract a flat {role -> feature} dict from analysis results,
    only including confident parses."""
    result: dict[str, str] = {}
    for r in results:
        if r.is_confident:
            result.update(r.parsed)
    return result


def is_confident(results: list[AnalyzerResult]) -> bool:
    """Check if ALL words were confidently parsed."""
    return all(r.is_confident for r in results if r.word.strip())