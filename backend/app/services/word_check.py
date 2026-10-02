"""Word journey dictionary check (handover_language 7.4).

Single copy of the working helpers first proven in
``scripts/bench_word_origins.py``: :func:`fold`, :func:`parse_json`,
:func:`parse_list`, :func:`ahd_etymology`, :func:`classify_ahd`. The bench
imports them from here so there is one copy.

Plus the pipeline additions the bench does not have:

* cross-reference following (once, never twice),
* the Sanskrit gate (printed form -> SLP1 stem -> kosha stem list),
* the display-form check (first-case singular via the kosha).

No network in tests: every function that reads the dictionary takes the
HTTP client (or a fetch function) as a parameter. Live runs are the CLI in
``scripts/word_origins.py``, which sleeps one second between requests and
saves every fetched entry in the working folder.
"""

from __future__ import annotations

import json
import logging
import re
import unicodedata
from pathlib import Path
from typing import Callable, Optional

logger = logging.getLogger("shabd.word_check")

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                    "(KHTML, like Gecko) Chrome/126.0 Safari/537.36"}

AHD_SEARCH_URL = "https://ahdictionary.com/word/search.html"

# ─── Text helpers (moved verbatim from scripts/bench_word_origins.py) ───────

_DEVANAGARI = re.compile(r"[ऀ-ॿ]")


def _to_roman(text: str) -> str:
    """Devanagari to IAST with vidyut.lipi, so an answer given in the script still scores."""
    if not _DEVANAGARI.search(text or ""):
        return text or ""
    try:
        import vidyut.lipi as lipi
        return lipi.transliterate(text, lipi.Scheme.Devanagari, lipi.Scheme.Iast)
    except Exception:  # lipi missing: score on what we have rather than crash a paid run
        return text


def fold(text: str) -> str:
    """One comparison form for a Sanskrit stem however it was romanised.

    śarkarā, sharkara and शर्करा all become ``sarkara``; kṛmi and krimi both become
    ``krmi``. Applied to gold and answer alike, so its quirks cancel out.
    """
    s = unicodedata.normalize("NFD", _to_roman(text).lower())
    s = "".join(ch for ch in s if not unicodedata.combining(ch))
    s = s.replace("sh", "s").replace("ch", "c").replace("ee", "i").replace("oo", "u")
    s = s.replace("aa", "a").replace("w", "v")
    s = re.sub(r"r[iu](?=[^aeiou]|$)", "r", s)  # vocalic r written ri / ru
    return re.sub(r"[^a-z]", "", s)


def parse_json(text: str):
    """The first JSON object or array in a reply, tolerating code fences and chatter."""
    t = (text or "").strip()
    t = re.sub(r"^```(?:json)?\s*", "", t)
    t = re.sub(r"\s*```\s*$", "", t)
    starts = [i for i in (t.find("{"), t.find("[")) if i >= 0]
    if not starts:
        return None
    start = min(starts)
    end = max(t.rfind("}"), t.rfind("]"))
    if end <= start:
        return None
    try:
        return json.loads(t[start:end + 1])
    except Exception:
        return None


def parse_list(text: str) -> list[dict]:
    """The objects of a reply that should be a list.

    JSON mode makes some models wrap the list in an object ({"data": [...]}), and a
    reply cut off by the token limit ends mid-object. Neither should read as "the model
    proposed nothing": unwrap the first, and from the second keep every object that is
    complete.
    """
    data = parse_json(text)
    if isinstance(data, dict):
        data = next((v for v in data.values() if isinstance(v, list)), [data])
    if isinstance(data, list):
        return [d for d in data if isinstance(d, dict)]
    out: list[dict] = []
    depth, begin, in_str, esc = 0, -1, False, False
    for i, ch in enumerate(text or ""):
        if in_str:
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == '"':
                in_str = False
            continue
        if ch == '"':
            in_str = True
        elif ch == "{":
            if depth == 0:
                begin = i
            depth += 1
        elif ch == "}" and depth > 0:
            depth -= 1
            if depth == 0 and begin >= 0:
                try:
                    obj = json.loads(text[begin:i + 1])
                    if isinstance(obj, dict):
                        out.append(obj)
                except Exception:
                    pass
    return out


# ─── The dictionary (moved verbatim, then extended with cross-refs) ─────────

_ETY = re.compile(r'<div class="etyseg">(.*?)</div>', re.S)
_HEDGE = re.compile(r"(probably|perhaps|possibly)[^.;\]]{0,160}Sanskrit", re.I)
_FROM_SANSKRIT = re.compile(r"(from|\[)\s*Sanskrit", re.I)


def ahd_etymology(client, word: str) -> list[str]:
    """The word history: text of each ``<div class="etyseg">``.

    ``client`` is an httpx-like client with ``.get(url, params=...)``. A
    non-200 answer returns ``["HTTP <status>"]`` so the caller can label it
    ``no_etymology`` without a special case.
    """
    r = client.get(AHD_SEARCH_URL, params={"q": word})
    if r.status_code != 200:
        return [f"HTTP {r.status_code}"]
    segs = [re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", m.group(1))).strip()
            for m in _ETY.finditer(r.text)]
    return segs


def classify_ahd(segs: list[str]) -> str:
    """What the dictionary says, before a person reads it. One of:
    sanskrit, sanskrit_hedged, akin_only, not_sanskrit, no_etymology."""
    if not segs or segs[0].startswith("HTTP "):
        return "no_etymology"
    with_sa = [s for s in segs if "Sanskrit" in s]
    if not with_sa:
        return "not_sanskrit"
    best = "akin_only"
    for s in with_sa:
        if not _FROM_SANSKRIT.search(s):
            continue
        if _HEDGE.search(s):
            best = "sanskrit_hedged" if best != "sanskrit" else best
        else:
            best = "sanskrit"
    return best


# ─── Cross-references: followed once, never twice ───────────────────────────

_SEE_REF = re.compile(r"\bsee\s+([A-Za-z][A-Za-z'\-]*)\b", re.I)
_PLUS_REF = re.compile(r"\b([A-Z][A-Z'\-]{1,})\s*\+\s*([A-Z][A-Z'\-]{1,})\b")


def extract_cross_refs(segs: list[str]) -> list[str]:
    """Words this entry points at instead of giving a history.

    Handles ``see LAC`` and ``SANDAL + WOOD`` shapes. Returns deduplicated
    uppercase-guarded candidates in first-seen order.
    """
    out: list[str] = []
    for s in segs or []:
        for m in _SEE_REF.finditer(s):
            w = m.group(1).strip(".,;:()[]")
            if w and w.lower() not in ("also", "under", "above", "below"):
                key = w.lower()
                if key not in [x.lower() for x in out]:
                    out.append(w)
        for m in _PLUS_REF.finditer(s):
            for w in (m.group(1), m.group(2)):
                w = w.strip(".,;:()[]")
                if w and w.lower() not in [x.lower() for x in out]:
                    out.append(w)
    # Keep only plausible headwords: alphabetic, at least 2 chars.
    return [w for w in out if re.fullmatch(r"[A-Za-z'\-]{2,}", w)]


def is_cross_ref_only(segs: list[str]) -> bool:
    """True when the entry gives no history of its own, only a pointer.

    Either there are no segments at all, or none names Sanskrit and at
    least one pointer was found.
    """
    if not segs:
        return False
    if any("Sanskrit" in s for s in segs):
        return False
    return bool(extract_cross_refs(segs))


def fetch_with_crossref(
    client,
    word: str,
    fetch_fn: Optional[Callable[[object, str], list[str]]] = None,
) -> tuple[list[str], list[str]]:
    """Fetch ``word``, following a cross-reference exactly once.

    Returns ``(segments_to_use, followed_words)``. When the first fetch
    is a pointer (``see LAC`` / ``SANDAL + WOOD``), each named entry is
    fetched once and their texts are used. A second-level pointer is NOT
    followed again, which also bounds loops (A -> B -> A).
    """
    fetch = fetch_fn or ahd_etymology
    first = fetch(client, word) or []
    if not is_cross_ref_only(first):
        return first, []
    refs = extract_cross_refs(first)[:4]
    # Never fetch the same word twice in this call (A -> A, A -> B -> A).
    seen = {word.casefold()}
    combined: list[str] = []
    followed: list[str] = []
    for ref in refs:
        if ref.casefold() in seen:
            continue
        seen.add(ref.casefold())
        try:
            segs = fetch(client, ref) or []
        except Exception:
            segs = []
        followed.append(ref)
        for s in segs:
            if s not in combined:
                combined.append(s)
    # If nothing came back, keep the original pointer text (labelled later).
    return (combined if combined else first), followed


# ─── The Sanskrit gate ──────────────────────────────────────────────────────

# The first token after the word "Sanskrit": yogaḥ, jaṅgalam, śarkarā.
# Trailing punctuation stripped by the caller.
_SANSKRIT_FORM = re.compile(
    r"Sanskrit\s+([A-Za-z\u0100-\u1EFF\u2018\u2019'\-·]+)",
)


def sanskrit_printed_form(entry_texts: list[str] | str) -> str:
    """The form the entry prints after 'Sanskrit' (first case: yogaḥ ...)."""
    text = " ".join(entry_texts) if isinstance(entry_texts, list) else (entry_texts or "")
    m = _SANSKRIT_FORM.search(text)
    if not m:
        return ""
    return m.group(1).strip(".,;:()[]\"'· ")


def stem_from_printed_form(printed: str) -> str:
    """Printed first-case form -> SLP1 stem: lipi, then drop final H or m.

    yogaḥ -> yoga, jaṅgalam -> jaNgala, śarkarā -> SarkarA. Returns "" when
    lipi cannot transliterate.
    """
    form = (printed or "").strip(".,;:()[]\"'· ")
    if not form:
        return ""
    try:
        import vidyut.lipi as lipi
        slp = lipi.transliterate(form, lipi.Scheme.Iast, lipi.Scheme.Slp1)
    except Exception:
        return ""
    slp = (slp or "").strip()
    if slp.endswith("H") or slp.endswith("m"):
        slp = slp[:-1]
    return slp


_KOSHA_STEMS: Optional[set[str]] = None


def default_kosha_dir() -> str:
    """Backend-relative Vidyut kosha directory."""
    here = Path(__file__).resolve()
    backend = here.parents[2]  # app/services/word_check.py -> backend/
    return str(backend / "vidyut-data" / "kosha")


def load_kosha_stems(kosha_dir: Optional[str] = None) -> set[str]:
    """All kosha stem texts: Basic pratipadika.text + Krdanta lemma.

    On the shipped data this is 205,233 stems in about 7 seconds. The
    result is cached per process; pass an explicit small set in tests.
    """
    global _KOSHA_STEMS
    if _KOSHA_STEMS is not None:
        return _KOSHA_STEMS
    d = kosha_dir or default_kosha_dir()
    try:
        from vidyut.kosha import Kosha
        kosha = Kosha(d)
        texts: set[str] = set()
        for entry in kosha.pratipadikas():
            try:
                if "Basic" in type(entry).__name__:
                    texts.add(entry.pratipadika.text)
                else:
                    texts.add(entry.lemma)
            except Exception:
                continue
        _KOSHA_STEMS = texts
        return texts
    except Exception as e:  # missing data: gate degrades to needs-a-look
        logger.warning("kosha stems unavailable at %s: %s", d, e)
        return set()


def gate_sanskrit(
    printed_form: str,
    stem_set: Optional[set[str]] = None,
    kosha_dir: Optional[str] = None,
) -> tuple[str, bool]:
    """Gate a printed Sanskrit form. Returns (mw_key, found).

    ``mw_key`` is the SLP1 stem when it is in the kosha stem list, else "".
    A miss means "needs a look", not rejection: the kosha is not complete
    (rājā, sthaga, dvār are missing). Seven invented sources from the
    Sarvam run all failed this gate.
    """
    stem = stem_from_printed_form(printed_form)
    if not stem:
        return "", False
    stems = stem_set if stem_set is not None else load_kosha_stems(kosha_dir)
    if stem in stems:
        return stem, True
    return "", False


def is_first_case_singular(display_slp1: str, stem_slp1: str, kosha=None) -> bool:
    """True when the kosha confirms ``display`` as Prathama Eka of ``stem``.

    What was run: ``Kosha("vidyut-data/kosha").get("mAtA")`` and looked for
    an entry whose repr holds ``Subanta``, ``text='mAtf'``, ``Prathama`` and
    ``Vacana.Eka``. A hit can be a verb form, so all four are checked.
    ``kosha`` may be a real Kosha or a test double with ``.get(form)``.
    """
    if not display_slp1 or not stem_slp1:
        return False
    try:
        entries = kosha.get(display_slp1) if kosha is not None else None
    except Exception:
        return False
    if entries is None:
        try:
            from vidyut.kosha import Kosha
            entries = Kosha(default_kosha_dir()).get(display_slp1)
        except Exception:
            return False
    want = f"text='{stem_slp1}'"
    for entry in entries or []:
        try:
            r = repr(entry)
        except Exception:
            continue
        if "Subanta" in r and want in r and "Prathama" in r and "Eka" in r:
            return True
    return False


# ─── One-word check ─────────────────────────────────────────────────────────

def check_word(
    word: str,
    segs: list[str],
    stem_set: Optional[set[str]] = None,
) -> dict:
    """Classify one fetched entry and gate its Sanskrit stem.

    Returns ``{word, label, printed, mw_key, stem_found, status, reason}``
    where ``status`` is ``pass`` (sanskrit + stem found), ``needs_look``
    (hedged, or stem miss), or ``rejected`` (akin_only / not_sanskrit /
    no_etymology).
    """
    label = classify_ahd(segs or [])
    if label in ("akin_only", "not_sanskrit", "no_etymology"):
        return {
            "word": word, "label": label, "printed": "",
            "mw_key": "", "stem_found": False,
            "status": "rejected", "reason": label,
        }
    printed = sanskrit_printed_form(segs or [])
    if not printed:
        return {
            "word": word, "label": label, "printed": "",
            "mw_key": "", "stem_found": False,
            "status": "needs_look", "reason": "no_sanskrit_form_in_entry",
        }
    mw_key, found = gate_sanskrit(printed, stem_set)
    if not found:
        return {
            "word": word, "label": label, "printed": printed,
            "mw_key": "", "stem_found": False,
            "status": "needs_look", "reason": "stem_not_in_kosha",
        }
    if label == "sanskrit_hedged":
        return {
            "word": word, "label": label, "printed": printed,
            "mw_key": mw_key, "stem_found": True,
            "status": "needs_look", "reason": "hedged",
        }
    return {
        "word": word, "label": label, "printed": printed,
        "mw_key": mw_key, "stem_found": True,
        "status": "pass", "reason": "",
    }
