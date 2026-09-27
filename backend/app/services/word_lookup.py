"""Word Lab lookup — “what form is this word?” (grammar-tab rebuild §5).

The rule-based analyzer proposes readings; the engine decides. A reading is
shown only when prakriya regenerates the exact typed word from it, so the
analyzer's guesses (रामेण → a stem *ram, गुरवे → a locative of *gurava) never
reach a learner unverified. Stems the analyzer clips are repaired by trying
a few spellings (ram → rama) — the re-derivation still has the final say.

Static and local: no DB, no quota, no model (the same rule as every
/grammar/* route). Never raises: a word nobody can explain gets no
candidates, and the Word Lab falls back to its manual controls.
"""

from __future__ import annotations

import logging
import re
from typing import Iterable, Optional

from app.grading.analyzer import AnalyzerResult, analyze_sentence, iast_to_devanagari
from app.services import prakriya
from app.services.iast import to_iast
from app.services.sandhi import is_known_word

logger = logging.getLogger("shabd.word_lookup")

# Analyzer feature codes → vidyut member names. Shared with ask_engine.
VIBHAKTI_BY_CASE = {
    "NOM": "Prathama", "ACC": "Dvitiya", "INSTR": "Trtiya", "DAT": "Caturthi",
    "ABL": "Panchami", "GEN": "Sasthi", "LOC": "Saptami", "VOC": "Sambodhana",
}
VACANA_BY_NUMBER = {"SG": "Eka", "DU": "Dvi", "PL": "Bahu"}
PURUSHA_BY_DIGIT = {"3": "Prathama", "2": "Madhyama", "1": "Uttama"}

LINGAS = ("Pum", "Stri", "Napumsaka")
LAKARAS = ("Lat", "Lan", "Lrt", "Lot", "VidhiLin")
PERSONAL_PRONOUNS = ("अस्मद्", "युष्मद्")
PRONOUN_STEMS = PERSONAL_PRONOUNS + ("तद्", "एतद्", "इदम्", "किम्", "यद्", "सर्व")
MAX_CANDIDATES = 3

_DEVANAGARI = re.compile(r"[ऀ-ॿ]")
_VERB_FEATURE = re.compile(r"^[A-Z]+\.(\d)(SG|DU|PL)$")

_CASE = {
    "Prathama": ("nominative", "प्रथमा"), "Dvitiya": ("accusative", "द्वितीया"),
    "Trtiya": ("instrumental", "तृतीया"), "Caturthi": ("dative", "चतुर्थी"),
    "Panchami": ("ablative", "पञ्चमी"), "Sasthi": ("genitive", "षष्ठी"),
    "Saptami": ("locative", "सप्तमी"), "Sambodhana": ("vocative", "सम्बोधन"),
}
_NUMBER = {"Eka": ("singular", "एकवचन"), "Dvi": ("dual", "द्विवचन"), "Bahu": ("plural", "बहुवचन")}
_GENDER = {"Pum": ("masculine", "पुंलिंग"), "Stri": ("feminine", "स्त्रीलिंग"),
           "Napumsaka": ("neuter", "नपुंसकलिंग")}
_LAKARA = {
    "Lat": ("present", "लट् (वर्तमान)"), "Lan": ("simple past", "लङ् (भूत)"),
    "Lrt": ("future", "लृट् (भविष्यत्)"), "Lot": ("command", "लोट् (आज्ञा)"),
    "VidhiLin": ("should", "विधिलिङ् (चाहिए)"),
}
_PERSON = {"Prathama": ("he, she, it", "प्रथम पुरुष"), "Madhyama": ("you", "मध्यम पुरुष"),
           "Uttama": ("I, we", "उत्तम पुरुष")}


def _norm(text: str) -> str:
    """Comparison form: punctuation trimmed, final ं read as म्."""
    s = (text or "").strip().strip("।॥,.!?").strip()
    return s[:-1] + "म्" if s.endswith("ं") else s


def _to_dev(iast: str) -> str:
    out = iast_to_devanagari(iast) or ""
    return out if _DEVANAGARI.search(out) else ""


def _stem_variants(stem_iast: str) -> list[str]:
    """The analyzer's stem plus the spellings it tends to clip."""
    s = stem_iast
    out = [s]
    if s and s[-1] not in "aāiīuūṛṝeo":
        out.append(s + "a")  # ram → rama
    if s.endswith(("ya", "yā")):
        out.append(s[:-2] + "ī")  # nadya → nadī
    if s.endswith(("va", "vā")):
        out.append(s[:-2] + "ū")  # vadhva → vadhū
    if s.endswith("a"):
        out.append(s[:-1] + "ā")
    elif s.endswith("ā"):
        out.append(s[:-1] + "a")
    return list(dict.fromkeys(out))


_NOT_STEM_FINAL = frozenset("्ेैोौंःँ")


def _noun_stems(word: str, stem_iast: str) -> list[str]:
    """Devanagari stems to try: the analyzer's (with the spellings it clips),
    then each prefix of the typed word that could end a stem (रामेण → राम)."""
    stems = [d for d in (_to_dev(v) for v in _stem_variants(stem_iast)) if d]
    stems += [word[:i] for i in range(len(word) - 1, 1, -1) if word[i - 1] not in _NOT_STEM_FINAL]
    return list(dict.fromkeys(stems))


def _lingas_for(stem: str) -> tuple[str, ...]:
    """-ā, -ī and -ū stems are feminine; masculine ones (हाहा) are too rare to offer."""
    return ("Stri",) if stem.endswith(("ा", "ी", "ू")) else LINGAS


def _matching_cells(grid: dict, word: str) -> list[dict]:
    return [c for row in grid.get("rows", []) for c in row
            if c and c.get("form") and _norm(c["form"]) == word]


def _noun_candidate(word: str, stem: str, linga: str, fallback: Optional[dict] = None) -> Optional[dict]:
    cells = [{"vibhakti": c["vibhakti"], "vacana": c["vacana"], "form": c["form"]}
             for c in _matching_cells(prakriya.paradigm(pratipadika=stem, linga=linga), word)]
    if not cells and fallback:
        cells = [fallback]  # an optional form the grid's first choice hides
    if not cells:
        return None
    personal = stem in PERSONAL_PRONOUNS
    slots_en = " or ".join(f"{_CASE[c['vibhakti']][0]} {_NUMBER[c['vacana']][0]}" for c in cells)
    slots_hi = " या ".join(f"{_CASE[c['vibhakti']][1]} {_NUMBER[c['vacana']][1]}" for c in cells)
    gender_en, gender_hi = ("", "") if personal else (f" · {_GENDER[linga][0]}", f" · {_GENDER[linga][1]}")
    first = cells[0]
    return {
        "kind": "pronoun" if stem in PRONOUN_STEMS else "noun",
        "lemma": stem, "lemma_iast": to_iast(stem), "linga": linga, "lakara": None,
        "readings": [{"vibhakti": c["vibhakti"], "vacana": c["vacana"]} for c in cells],
        "plain": {"en": f"{stem}{gender_en} · {slots_en}", "hi": f"{stem}{gender_hi} · {slots_hi}"},
        "derive_params": {"pratipadika": stem, "linga": linga, "vibhakti": first["vibhakti"],
                          "vacana": first["vacana"], "expect": first["form"]},
    }


def _noun_candidates(word: str, stem_iast: str, feature: str) -> Iterable[dict]:
    case, _, number = feature.partition(".")
    vibhakti, vacana = VIBHAKTI_BY_CASE.get(case), VACANA_BY_NUMBER.get(number)
    if not vibhakti or not vacana:
        return
    for stem in _noun_stems(word, stem_iast):
        for linga in _lingas_for(stem):
            forms = prakriya.derive_forms(pratipadika=stem, linga=linga, vibhakti=vibhakti, vacana=vacana)
            match = next((f for f in forms if _norm(f) == word), None)
            if match:
                c = _noun_candidate(word, stem, linga, {"vibhakti": vibhakti, "vacana": vacana, "form": match})
                if c:
                    yield c


def _verb_candidate(root: str, lakara: str, cells: list[dict]) -> dict:
    slots_en = " or ".join(f"{_PERSON[c['purusha']][0]} · {_NUMBER[c['vacana']][0]}" for c in cells)
    slots_hi = " या ".join(f"{_PERSON[c['purusha']][1]} · {_NUMBER[c['vacana']][1]}" for c in cells)
    first = cells[0]
    return {
        "kind": "verb", "lemma": root, "lemma_iast": to_iast(root), "linga": None, "lakara": lakara,
        "readings": [{"purusha": c["purusha"], "vacana": c["vacana"]} for c in cells],
        "plain": {"en": f"√{root} · {_LAKARA[lakara][0]} · {slots_en}",
                  "hi": f"√{root} · {_LAKARA[lakara][1]} · {slots_hi}"},
        "derive_params": {"dhatu": root, "lakara": lakara, "purusha": first["purusha"],
                          "vacana": first["vacana"], "expect": first["form"]},
    }


def _verb_candidates(word: str, root_iast: str, feature: str) -> Iterable[dict]:
    root = _to_dev(root_iast)
    if not root:
        return
    found = False
    # The analyzer only knows present endings (पठिष्यति reads as “PRES”), so
    # search every common tense's grid for the typed word.
    for lakara in LAKARAS:
        cells = [{"purusha": c["vibhakti"].split(".")[0], "vacana": c["vacana"], "form": c["form"]}
                 for c in _matching_cells(prakriya.paradigm(dhatu=root, lakara=lakara), word)]
        if cells:
            found = True
            yield _verb_candidate(root, lakara, cells)
    m = _VERB_FEATURE.match(feature)
    if found or not m:
        return
    purusha, vacana = PURUSHA_BY_DIGIT.get(m.group(1)), VACANA_BY_NUMBER.get(m.group(2))
    if not purusha or not vacana:
        return
    for lakara in LAKARAS:
        forms = prakriya.derive_forms(dhatu=root, lakara=lakara, purusha=purusha, vacana=vacana)
        match = next((f for f in forms if _norm(f) == word), None)
        if match:
            yield _verb_candidate(root, lakara, [{"purusha": purusha, "vacana": vacana, "form": match}])


def _pronoun_candidates(word: str) -> Iterable[dict]:
    for stem in PRONOUN_STEMS:
        for linga in ("Pum",) if stem in PERSONAL_PRONOUNS else LINGAS:
            c = _noun_candidate(word, stem, linga)
            if c:
                yield c


def _indeclinable(word: str) -> dict:
    return {
        "kind": "indeclinable", "lemma": word, "lemma_iast": to_iast(word), "linga": None,
        "lakara": None, "readings": [],
        "plain": {"en": f"{word} · indeclinable — never changes", "hi": f"{word} · अव्यय — रूप नहीं बदलता"},
        "derive_params": {},
    }


def _rank(candidates: list[dict]) -> list[dict]:
    """Dictionary stems first. Any stem derives *some* word, so a real noun
    (गुरु) pushes out invented ones (गुरव) that happen to produce the same form."""
    known = {c["lemma"] for c in candidates if c["kind"] == "noun" and is_known_word(c["lemma"])}
    if known:
        candidates = [c for c in candidates if c["kind"] != "noun" or c["lemma"] in known]
    return candidates


def _readings(results: list[AnalyzerResult]) -> list[tuple[str, str]]:
    """Every (stem, feature) the analyzer offers — primary reading first."""
    out: list[tuple[str, str]] = []
    for r in results:
        for parsed in [r.parsed, *r.alternatives]:
            for stem, feature in (parsed or {}).items():
                if isinstance(feature, str) and (stem, feature) not in out:
                    out.append((stem, feature))
    return out


def lookup(word: str) -> dict:
    """``{word, iast, candidates}`` — each candidate re-derives ``word`` exactly."""
    clean = _norm(word)
    out: dict = {"word": clean, "iast": to_iast(clean) if clean else "", "candidates": []}
    if not clean or len(clean.split()) != 1:
        return out
    try:
        results = [r for r in analyze_sentence(clean) if isinstance(r, AnalyzerResult)]
        readings = _readings(results)
        candidates: list[dict] = []
        seen: set[tuple] = set()

        def add(c: dict) -> None:
            key = (c["kind"], c["lemma"], c["linga"], c["lakara"])
            if key not in seen:
                seen.add(key)
                candidates.append(c)

        indeclinable = any(feature == "INDECL" for _, feature in readings)
        if indeclinable:
            add(_indeclinable(clean))
        for stem, feature in readings:
            if feature == "PRON":
                source: Iterable[dict] = _pronoun_candidates(clean)
            elif stem.startswith("√"):
                source = _verb_candidates(clean, stem[1:], feature)
            elif "." in feature and not indeclinable:
                source = _noun_candidates(clean, stem, feature)
            else:
                continue
            for c in source:
                add(c)
        out["candidates"] = _rank(candidates)[:MAX_CANDIDATES]
    except Exception as e:  # noqa: BLE001 - lookups degrade, never raise
        logger.warning("word lookup failed for %r: %s", clean, e)
    return out
