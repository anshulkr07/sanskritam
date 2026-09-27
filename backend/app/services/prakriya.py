"""
Pāṇinian derivation service — the differentiator.

Wraps ``vidyut.prakriya`` (a rule-based Rust library + data file, already a
dependency — this is linguistics, not inference, and so does NOT violate the
no-local-models invariant §2.7) to produce deterministic, offline, ₹0
derivations of Sanskrit word forms, complete with the numbered sūtra that made
each step.

This is LOCAL computation. No vendor call, no quota, no network. Any router
that consumes this must NOT add metering — see P9-2.

2026-09-15 (grammar guide): the service now reaches the rest of the engine —
passive/impersonal voice, sanādi (causative/desiderative), upasargas, kṛt and
taddhita suffixes — and fixes two ways it taught wrong Sanskrit:

* Feminine ā/ī stems were built with ``Pratipadika.basic``, which declines
  them like consonant-final stems (लता → लताः, लता for लतया). They now use
  ``Pratipadika.nyap``; visarga-type stems (लक्ष्मीः, श्रीः, वधूः) stay basic.
* ``_find_dhatu`` matched roots by string prefix on the accented upadeśa, so
  वद् resolved to vand (vadi~) and गम् (ga\\mx~) to nothing. Lookup now goes
  through a surface-form index (accents and it-markers stripped, idit nasal
  and ṣ/ṇ-upadeśa restored), with an explicit gaṇa or upadeśa to pin a root.
"""

from __future__ import annotations

import logging
import os
from typing import Optional, Sequence

from app.grading.analyzer import slp1_to_iast  # noqa: F401  transliteration helpers live here
import vidyut.lipi as _lipi

logger = logging.getLogger("shabd.prakriya")

# ─── Module-level state: load once ───

_HAS_PRAKRIYA = False
_vyakarana = None
_data = None
by_code: dict[str, list[str]] = {}
_dhatus: list = []                    # every Dhatu, dhātupāṭha order
_by_surface: dict[str, list] = {}     # surface root (SLP1) -> [Dhatu]

try:
    from vidyut.prakriya import (
        Data,
        Gana,
        Krt,
        Lakara,
        Linga,
        Pada,
        Pratipadika,
        Prayoga,
        Purusha,
        Sanadi,
        Taddhita,
        Vacana,
        Vibhakti,
        Vyakarana,
    )
    _HAS_PRAKRIYA = True
except ImportError:  # pragma: no cover - vidyut is a hard dep; guard for safety
    Data = Gana = Krt = Lakara = Linga = Pada = Pratipadika = Prayoga = None
    Purusha = Sanadi = Taddhita = Vacana = Vibhakti = Vyakarana = None


def _data_dir() -> str:
    from app.config import settings
    override = os.environ.get("VIDYUT_DATA_DIR", "") or getattr(settings, "vidyut_data_dir", "")
    if override:
        return override
    # this file: backend/app/services/prakriya.py — three up = backend/
    return os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
        "vidyut-data",
        "prakriya",
    )


def _s2d(text: str) -> str:
    """SLP1 → Devanagari using analyzer.py's single transliteration path."""
    return _lipi.transliterate(text, _lipi.Scheme.Slp1, _lipi.Scheme.Devanagari)


def _d2slp(text: str) -> str:
    """Devanagari → SLP1 using analyzer.py's single transliteration path."""
    return _lipi.transliterate(text, _lipi.Scheme.Devanagari, _lipi.Scheme.Slp1)


def _has_devanagari(text: str) -> bool:
    return any("ऀ" <= ch <= "ॿ" for ch in text)


# ─── Root lookup ───

_VOWELS = frozenset("aAiIuUfFxXeEoO")
_HOMORGANIC_NASAL = {
    **{c: "N" for c in "kKgGN"},
    **{c: "Y" for c in "cCjJY"},
    **{c: "R" for c in "wWqQR"},
    **{c: "n" for c in "tTdDn"},
    **{c: "m" for c in "pPbBm"},
}

# Roots listed in more than one gaṇa, resolved to the sense a learner means
# when they type the bare root (कृ = karoti, not kṛṇoti "to hurt").
_PREFERRED_GANA = {
    "kf": "Tanadi", "jan": "Divadi", "as": "Adadi", "su": "Svadi",
    "jYA": "Kryadi", "aS": "Svadi", "yuj": "Rudhadi", "ruD": "Rudhadi",
    "hf": "Bhvadi", "pA": "Bhvadi", "sad": "Bhvadi", "vac": "Adadi",
    "vad": "Bhvadi", "ji": "Bhvadi", "BU": "Bhvadi", "tan": "Tanadi",
    "Ap": "Svadi",
}


def _root_surface(aupadeshika: str) -> str:
    """The form a learner types for an upadeśa: ``ga\\mx~`` → ``gam``.

    Strips accent marks, the ḍu/ṭu/ñi prefixes and the final it-vowel (or
    it-consonant); an idit root gains its nasal (``vadi~`` → ``vand``); a
    ṣopadeśa/ṇopadeśa root is restored (``zWA`` → ``sTA``, ``RI`` → ``nI``).
    """
    s = aupadeshika.replace("\\", "").replace("^", "")
    for pre in ("qu", "wu", "Yi"):
        if s.startswith(pre) and len(s) > 3:
            s = s[2:]
            break
    if "~" in s:
        i = s.index("~")
        it, rest, stem = s[i - 1], s[i + 1:], s[: i - 1]
        if it == "i" and not rest.startswith("r") and stem and stem[-1] not in _VOWELS:
            stem = stem[:-1] + _HOMORGANIC_NASAL.get(stem[-1], "M") + stem[-1]
        s = stem
    else:
        while len(s) > 1 and s[-1] in "Yz":
            s = s[:-1]
    if s.startswith("z") and len(s) > 1:
        s = "s" + s[1:]
        if s.startswith("sW"):
            s = "sT" + s[2:]
        elif s.startswith("sR"):
            s = "sn" + s[2:]
        elif s.startswith("sw"):
            s = "st" + s[2:]
    if s.startswith("R"):
        s = "n" + s[1:]
    return s


def _load() -> None:
    """Idempotent module init. Safe to call repeatedly."""
    global _vyakarana, _data, by_code, _dhatus, _by_surface
    if _vyakarana is not None:
        return
    _data = Data(_data_dir())
    _vyakarana = Vyakarana()
    # 5,152 entries, possible code collisions (documented in HANDOVER P9-1.2).
    # Index as code -> list of texts; a lookup returns ALL of them joined.
    for s in _data.load_sutras():
        by_code.setdefault(s.code, []).append(s.text)
    # The dhātupāṭha was re-parsed twice per lookup; parse it once here.
    _dhatus = [e.dhatu for e in _data.load_dhatu_entries()]
    for d in _dhatus:
        _by_surface.setdefault(_root_surface(d.aupadeshika), []).append(d)
    logger.info("prakriya loaded: %d sutra entries, %d dhatus", len(by_code), len(_dhatus))


def _strict_member(enum_cls, name: Optional[str]):
    """Resolve an enum member by exact name, or None. For suffix names
    (Krt/Taddhita/Sanadi/Gana) a silent default would derive a different
    word entirely, so an unknown name degrades to no derivation."""
    if not name or enum_cls is None:
        return None
    member = getattr(enum_cls, name, None)
    if member is None:
        logger.warning("unknown %s %r — no derivation", getattr(enum_cls, "__name__", enum_cls), name)
    return member


def _find_dhatu(devanagari: Optional[str] = None, gana: Optional[str] = None,
                aupadeshika: Optional[str] = None):
    """Resolve a root to a ``Dhatu``.

    ``aupadeshika`` (exact SLP1 upadeśa) wins; otherwise the Devanagari root is
    matched exactly, then by surface form, then — legacy — by prefix. ``gana``
    (a Gana member name) filters every stage.
    """
    if not _HAS_PRAKRIYA:
        return None
    _load()
    want = None
    if gana:
        want = _strict_member(Gana, gana)
        if want is None:
            return None

    def ok(d) -> bool:
        return want is None or d.gana == want

    if aupadeshika:
        return next((d for d in _dhatus if d.aupadeshika == aupadeshika and ok(d)), None)
    if not devanagari:
        return None
    query = _d2slp(devanagari.strip())
    # The learner's usual sense first: ज्ञा is also spelled plainly in gaṇa 1
    # (ज्ञाति), so an exact-spelling match must not beat the preferred gaṇa.
    if want is None and query in _PREFERRED_GANA:
        preferred = next((d for d in _by_surface.get(query, [])
                          if d.gana.name == _PREFERRED_GANA[query]), None)
        if preferred is not None:
            return preferred
    exact = next((d for d in _dhatus if d.aupadeshika == query and ok(d)), None)
    if exact is not None:
        return exact
    candidates = [d for d in _by_surface.get(query, []) if ok(d)]
    if candidates:
        if want is None and len(candidates) > 1:
            preferred = _PREFERRED_GANA.get(query)
            for d in candidates:
                if preferred and d.gana.name == preferred:
                    return d
            primary = [d for d in candidates if d.gana.name != "Curadi"]
            if primary:
                return primary[0]
        return candidates[0]
    return next((d for d in _dhatus if d.aupadeshika.startswith(query) and ok(d)), None)


def _enum_member(enum_cls, name: str, default):
    """Resolve an enum member by name, defaulting when absent/invalid.

    The fallback LOUDLY warns: a misspelled code (e.g. linga="Neut" —
    vidyut's member is "Napumsaka") otherwise silently derives the wrong
    gender/pada/lakāra, and content built on it teaches wrong Sanskrit.
    Found 2026-09-08 via phala→phalau (correct: phale)."""
    import logging

    if not name or enum_cls is None:
        return default
    member = getattr(enum_cls, name, None)
    if member is None:
        logging.getLogger("shabd.prakriya").warning(
            "unknown %s %r — defaulting (check vidyut member names)",
            getattr(enum_cls, "__name__", enum_cls), name)
    return member if member is not None else default


# ─── Stems ───

# ī-final feminines that decline with visarga (लक्ष्मीः), and the one short
# stem that does not (स्त्री).
_BASIC_I_STEMS = frozenset({"lakzmI", "tarI", "tantrI", "avI"})
_NYAP_STEMS = frozenset({"strI"})


def _syllables(slp: str) -> int:
    return sum(1 for ch in slp if ch in _VOWELS)


def auto_stem_type(stem_slp: str, linga: Optional[str]) -> str:
    """``nyap`` for feminine ā-stems and polysyllabic ī-stems, else ``basic``."""
    if linga != "Stri" or not stem_slp:
        return "basic"
    if stem_slp in _NYAP_STEMS:
        return "nyap"
    if stem_slp in _BASIC_I_STEMS:
        return "basic"
    if stem_slp.endswith("A"):
        return "nyap"
    if stem_slp.endswith("I") and _syllables(stem_slp) > 1:
        return "nyap"
    return "basic"


def _make_pratipadika(stem: str, linga: Optional[str], stem_type: Optional[str]):
    slp = _d2slp(stem.strip())
    kind = stem_type or auto_stem_type(slp, linga)
    return Pratipadika.nyap(slp) if kind == "nyap" else Pratipadika.basic(slp)


# Kṛt suffixes whose output is an indeclinable (gatvā, paṭhitum).
_AVYAYA_KRT = frozenset({"ktvA", "tumun", "lyap", "Ramul", "kamul"})
_SANADI_ALIASES = {"Nic": "Ric", "San": "san", "Yan": "yaN", "YanLuk": "yaNluk"}


def _with_modifiers(dhatu, prefixes: Optional[Sequence[str]], sanadi: Optional[Sequence[str]]):
    if prefixes:
        pre = [_d2slp(p) if _has_devanagari(p) else p for p in prefixes if p]
        if pre:
            dhatu = dhatu.with_prefixes(pre)
    if sanadi:
        members = []
        for name in sanadi:
            m = _strict_member(Sanadi, _SANADI_ALIASES.get(name, name))
            if m is None:
                return None
            members.append(m)
        dhatu = dhatu.with_sanadi(members)
    return dhatu


def _subanta(pratipadika, linga, vibhakti, vacana):
    return Pada.Subanta(
        pratipadika=pratipadika,
        linga=_enum_member(Linga, linga, Linga.Pum),
        vibhakti=_enum_member(Vibhakti, vibhakti, Vibhakti.Prathama),
        vacana=_enum_member(Vacana, vacana, Vacana.Eka),
    )


def _build_pada(*, dhatu, lakara, purusha, vacana, pratipadika, linga, vibhakti,
                gana, aupadeshika, prayoga, sanadi, prefixes, krt, taddhita,
                stem_type, avyaya):
    if dhatu or aupadeshika:
        d = _find_dhatu(dhatu, gana=gana, aupadeshika=aupadeshika)
        if d is None:
            return None
        d = _with_modifiers(d, prefixes, sanadi)
        if d is None:
            return None
        if krt:
            k = _strict_member(Krt, krt)
            if k is None:
                return None
            stem = Pratipadika.krdanta(d, k)
            as_avyaya = avyaya if avyaya is not None else krt in _AVYAYA_KRT
            if as_avyaya:
                return Pada.make_avyaya(stem)
            return _subanta(stem, linga, vibhakti, vacana)
        return Pada.Tinanta(
            dhatu=d,
            prayoga=_enum_member(Prayoga, prayoga, Prayoga.Kartari),
            lakara=_enum_member(Lakara, lakara, Lakara.Lat),
            purusha=_enum_member(Purusha, purusha, Purusha.Prathama),
            vacana=_enum_member(Vacana, vacana, Vacana.Eka),
        )
    if pratipadika:
        if taddhita:
            t = _strict_member(Taddhita, taddhita)
            if t is None:
                return None
            # The base's own gender is not the derived word's: judge ā/ī
            # stems as feminine (कुन्ती → कौन्तेय) unless told otherwise.
            base = _make_pratipadika(pratipadika, "Stri", stem_type)
            stem = Pratipadika.taddhitanta(base, t)
        else:
            stem = _make_pratipadika(pratipadika, linga, stem_type)
        if avyaya:
            return Pada.make_avyaya(stem)
        return _subanta(stem, linga, vibhakti, vacana)
    return None


def _derive_results(**kw) -> list:
    if not _HAS_PRAKRIYA:
        return []
    _load()
    pada = _build_pada(**kw)
    if pada is None:
        return []
    return list(_vyakarana.derive(pada) or [])


_DERIVE_KEYS = ("dhatu", "lakara", "purusha", "vacana", "pratipadika", "linga",
                "vibhakti", "gana", "aupadeshika", "prayoga", "sanadi",
                "prefixes", "krt", "taddhita", "stem_type", "avyaya")


def derive_forms(**params) -> list[str]:
    """Every form the engine derives for ``params`` (optional forms included,
    e.g. देवात्/देवाद्), in Devanagari. Same parameters as :func:`derive`."""
    kw = {k: params.get(k) for k in _DERIVE_KEYS}
    try:
        return sorted({_s2d(p.text) for p in _derive_results(**kw)})
    except Exception as e:  # noqa: BLE001 - degrade, never raise
        logger.warning("derive_forms failed for %r: %s", params, e)
        return []


# ─── Paradigm grid (P11-5) ───

# 8 vibhakti × 3 vacana for nouns (subanta); the lakāra grid for verbs.
_VIBHAKTI_ORDER = ["Prathama", "Dvitiya", "Trtiya", "Caturthi",
                   "Panchami", "Sasthi", "Saptami", "Sambodhana"]
_VACANA_ORDER = ["Eka", "Dvi", "Bahu"]
_LAKARA_ORDER = ["Lat", "Lot", "Lan", "Lrt", "Lun", "Lit", "VidhiLin"]

# in-process cache: paradigms never change and are wasteful to recompute
_paradigm_cache: dict[tuple, dict] = {}


def _tuple(values: Optional[Sequence[str]]) -> tuple:
    return tuple(values) if values else ()


def paradigm(pratipadika: Optional[str] = None, linga: Optional[str] = None,
             dhatu: Optional[str] = None, lakara: Optional[str] = None, *,
             gana: Optional[str] = None, aupadeshika: Optional[str] = None,
             prayoga: Optional[str] = None, sanadi: Optional[Sequence[str]] = None,
             prefixes: Optional[Sequence[str]] = None,
             stem_type: Optional[str] = None) -> dict:
    """Return a full paradigm grid; each cell carries its own derivation.

    Noun (prātipadika + liṅga) → 8 vibhakti × 3 vacana. Verb (dhātu + lakāra)
    → up to 9 person×number cells. A cell that fails to derive is ``null`` and
    the rest of the table still renders (never fail a whole table on one cell).
    """
    if dhatu or aupadeshika:
        return _tinanta_paradigm(dhatu, lakara, gana=gana, aupadeshika=aupadeshika,
                                 prayoga=prayoga, sanadi=sanadi, prefixes=prefixes)
    return _subanta_paradigm(pratipadika, linga, stem_type=stem_type)


def _subanta_paradigm(pratipadika: Optional[str], linga: Optional[str], *,
                      stem_type: Optional[str] = None) -> dict:
    empty = {"rows": [], "kind": "subanta"}
    if not pratipadika:
        return empty
    key = ("sub", pratipadika, linga or "Pum", stem_type)
    if key in _paradigm_cache:
        return _paradigm_cache[key]
    rows = []
    for vibhakti in _VIBHAKTI_ORDER[:8]:
        row = []
        for vacana in _VACANA_ORDER:
            der = derive(pratipadika=pratipadika, linga=linga,
                         vibhakti=vibhakti, vacana=vacana, stem_type=stem_type)
            row.append({
                "vibhakti": vibhakti,
                "vacana": vacana,
                "form": der["result"] or None,
                "derivation": der if der["steps"] else None,
            })
        rows.append(row)
    out = {"rows": rows, "kind": "subanta"}
    _paradigm_cache[key] = out
    return out


def _tinanta_paradigm(dhatu: Optional[str], lakara: Optional[str], *,
                      gana: Optional[str] = None, aupadeshika: Optional[str] = None,
                      prayoga: Optional[str] = None,
                      sanadi: Optional[Sequence[str]] = None,
                      prefixes: Optional[Sequence[str]] = None) -> dict:
    empty = {"rows": [], "kind": "tinanta"}
    if not dhatu and not aupadeshika:
        return empty
    laka = lakara or "Lat"
    key = ("tin", dhatu, laka, gana, aupadeshika, prayoga, _tuple(sanadi), _tuple(prefixes))
    if key in _paradigm_cache:
        return _paradigm_cache[key]
    rows = []
    for purusha in ["Prathama", "Madhyama", "Uttama"]:
        row = []
        for vacana in _VACANA_ORDER:
            der = derive(dhatu=dhatu, lakara=laka, purusha=purusha, vacana=vacana,
                         gana=gana, aupadeshika=aupadeshika, prayoga=prayoga,
                         sanadi=sanadi, prefixes=prefixes)
            row.append({
                "vibhakti": f"{purusha}.{vacana}",
                "vacana": vacana,
                "form": der["result"] or None,
                "derivation": der if der["steps"] else None,
            })
        rows.append(row)
    out = {"rows": rows, "kind": "tinanta"}
    _paradigm_cache[key] = out
    return out


def derive(dhatu: Optional[str] = None, lakara: Optional[str] = None,
           purusha: Optional[str] = None, vacana: Optional[str] = None,
           pratipadika: Optional[str] = None, linga: Optional[str] = None,
           vibhakti: Optional[str] = None, *,
           gana: Optional[str] = None, aupadeshika: Optional[str] = None,
           prayoga: Optional[str] = None, sanadi: Optional[Sequence[str]] = None,
           prefixes: Optional[Sequence[str]] = None, krt: Optional[str] = None,
           taddhita: Optional[str] = None, stem_type: Optional[str] = None,
           avyaya: Optional[bool] = None, expect: Optional[str] = None) -> dict:
    """Derive a word form, returning its full prakriyā.

    Accepts *either* a verb (dhātu + lakāra + puruṣa + vacana, optionally with
    ``prayoga``, ``sanadi`` and ``prefixes``; ``gana``/``aupadeshika`` pin the
    root) *or* a noun (prātipadika + liṅga + vibhakti + vacana). ``krt`` turns
    the root into a kṛdanta and ``taddhita`` the stem into a taddhitānta, both
    declined as nouns unless they are indeclinable (``avyaya``). When the
    engine offers optional forms, ``expect`` picks the one to show.

    An underivable or unknown input returns ``{result: "", step_count: 0,
    steps: []}`` — it never raises, so a grammar sidebar can never 500 a lesson
    (P9-1.4 / degrade-like-localtime).
    """
    empty = {"result": "", "step_count": 0, "steps": []}
    if not _HAS_PRAKRIYA:
        return empty
    try:
        results = _derive_results(
            dhatu=dhatu, lakara=lakara, purusha=purusha, vacana=vacana,
            pratipadika=pratipadika, linga=linga, vibhakti=vibhakti, gana=gana,
            aupadeshika=aupadeshika, prayoga=prayoga, sanadi=sanadi,
            prefixes=prefixes, krt=krt, taddhita=taddhita, stem_type=stem_type,
            avyaya=avyaya,
        )
        if not results:
            return empty
        if (dhatu or aupadeshika) and not krt:
            # Ubhayapada roots derive both pada sets; cite the parasmaipada
            # one (1.3.78 शेषात् कर्तरि परस्मैपदम्) — वदति, not वदते.
            results.sort(key=lambda p: 0 if any(s.code == "1.3.78" for s in p.history) else 1)
        prakriya = results[0]
        if expect:
            target = _d2slp(expect.strip().strip("।॥").strip())
            prakriya = next((p for p in results if p.text == target), prakriya)
        steps = []
        for step in prakriya.history:
            intermediate = " + ".join(step.result)
            sutra_texts = by_code.get(step.code, [])
            steps.append({
                "code": step.code,
                "sutra_text": sutra_texts[0] if sutra_texts else "",
                "sutra_devanagari": _s2d(sutra_texts[0]) if sutra_texts else "",
                "result": _s2d(intermediate),
            })
        return {
            "result": _s2d(prakriya.text),
            "step_count": len(steps),
            "steps": steps,
        }
    except Exception as e:  # noqa: BLE001 - degrade, never raise
        logger.warning("derive failed for dhatu=%r pratipadika=%r: %s", dhatu, pratipadika, e)
        return empty
