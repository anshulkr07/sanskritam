"""Word-origin bench: can a model be trusted to say where a word, or a verse, comes from?

Offline measurement tool, NOT request-path code. Modelled on ``scripts/bench_codemix.py``.

Three tests. Each one is scored against a source that is not the model.

A  judge    One word per call. The model says whether the word is borrowed from a
            Sanskrit word, only related to one, or neither. Scored against
            ``tests/fixtures/word_origins/gold.json``, whose labels were read by hand
            from dictionary entries (see ``specs/word-origins-verified.md``).
B  propose  The model lists English words it says come from Sanskrit, leaving out the
            ones we already hold. Every proposal is looked up in the American Heritage
            Dictionary and scored by what the entry prints.
C  cite     The model writes "Do you know" facts, each resting on one verse of the
            Bhagavad-gītā or the Bhāgavata Purāṇa and quoting it. The reference and the
            quotation are compared with the verse page at vedabase.io.

Usage::

    ./.venv/Scripts/python.exe -m scripts.bench_word_origins              # the plan. Costs nothing.
    ./.venv/Scripts/python.exe -m scripts.bench_word_origins --live       # all three tests
    ./.venv/Scripts/python.exe -m scripts.bench_word_origins --live --tests a --limit 8
    ./.venv/Scripts/python.exe -m scripts.bench_word_origins --live --models sarvam:sarvam-105b

``--live`` calls the vendors with the keys in the repo-root ``.env`` and costs money.
Raw replies and scores go to ``results/word_origins_bench/<UTC stamp>.json``.

Exit codes: 0 ok - 1 a model had no key or every call failed
"""

from __future__ import annotations

import argparse
import asyncio
import difflib
import json
import re
import sys
import time
import unicodedata
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# Windows cp1252 consoles cannot encode Devanagari or Cyrillic; force UTF-8.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

import httpx  # noqa: E402

from app.evals.providers import build_provider  # noqa: E402
from app.services.word_check import (  # noqa: E402 — single copy (handover 7.4)
    ahd_etymology,
    classify_ahd,
    fold,
    parse_json,
    parse_list,
)

ROOT = Path(__file__).resolve().parents[1]
GOLD_PATH = ROOT / "tests" / "fixtures" / "word_origins" / "gold.json"
OUT_DIR = ROOT / "results" / "word_origins_bench"

#: Both Sarvam models. ``sarvam-105b`` (the reasoning one) is kept off the Talk request
#: path by config.py because a learner is waiting there; a job that runs once a day has
#: no such limit (owner, 2026-10-02). It reasons at length: on a smoke run of eight
#: words at a 4,000-token limit it spent 85,916 output tokens and one reply was cut off,
#: so the limits below are generous.
DEFAULT_MODELS = (
    "sarvam:sarvam-105b,"
    "sarvam:sarvam-105b-conversations,"
    "openrouter:google/gemini-3.8-flash,"
    "openrouter:google/gemini-3.1-pro-preview"
)

LANG_NAME = {"en": "English", "de": "German", "ru": "Russian"}

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                    "(KHTML, like Gecko) Chrome/126.0 Safari/537.36"}

#: The languages each checked route passes through, by "lang:word" (specs file).
#: Used only for the secondary "route" score of test A.
VIA: dict[str, list[str]] = {
    "en:sugar": ["persian", "arabic", "italian", "latin", "french"],
    "en:jungle": ["hindi"],
    "en:pepper": ["greek", "latin"],
    "en:opal": ["greek", "latin", "french"],
    "en:lilac": ["persian", "arabic", "french"],
    "en:lac": ["middle indic", "arabic", "latin", "french"],
    "en:mandarin": ["malay", "portuguese"],
    "en:Zen": ["middle indic", "chinese", "japanese"],
    "en:sandalwood": ["persian", "greek", "latin", "french"],
    "en:yoga": ["hindi"],
    "en:orange": ["persian", "arabic", "italian", "french"],
    "en:guru": ["hindi"],
    "en:candy": ["arabic", "french"],
    "en:jackal": ["persian", "turkish"],
    "en:crimson": ["arabic"],
    "de:Zucker": ["arabic", "italian"],
    "de:Dschungel": ["hindi", "english"],
    "de:Pfeffer": ["greek", "latin"],
    "de:Opal": ["greek", "latin", "french"],
    "de:lila": ["persian", "arabic", "french"],
    "de:Anilin": ["persian", "arabic", "portuguese"],
    "de:Lack": ["persian", "arabic", "latin", "italian"],
    "de:Mandarin": ["malay", "portuguese"],
    "de:Zen": ["chinese", "japanese"],
    "de:Sandelholz": ["arabic", "greek", "latin", "italian"],
    "de:Guru": ["hindi"],
    "de:Schakal": ["persian"],
    "de:Karmesin": ["persian", "arabic", "italian"],
    "ru:сахар": ["middle indic", "greek"],
    "ru:джунгли": ["hindi"],
    "ru:перец": ["greek", "latin"],
    "ru:опал": ["greek", "latin"],
    "ru:лак": ["arabic", "italian"],
    "ru:мандарин": ["portuguese", "french"],
    "ru:сандал": ["arabic", "greek"],
    "ru:шакал": ["persian"],
}

_MIDDLE_INDIC = ("prakrit", "pali", "middle indic", "middle indo-aryan", "middle indo aryan")
_LANG_ALIASES = {"farsi": "persian", "mandarin chinese": "chinese", "medieval latin": "latin"}


# ─── Text helpers ─────────────────────────────────────────────────────────

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


# fold lives in app.services.word_check (single copy); imported above.


def source_matches(answer: str, accepted: list[str]) -> bool:
    got = fold(answer)
    return bool(got) and any(fold(stem) in got for stem in accepted if stem)


# parse_json and parse_list live in app.services.word_check (single copy).


def norm_verdict(v) -> str:
    s = str(v or "").strip().lower()
    if s in ("borrowed", "loan", "loanword", "borrowing", "derived"):
        return "borrowed"
    if s in ("related", "cognate", "cognates"):
        return "related"
    if s in ("none", "no", "unrelated", "no connection"):
        return "none"
    if s in ("uncertain", "disputed", "unknown", "unclear"):
        return "uncertain"
    return "error"


def norm_confidence(v) -> str:
    s = str(v or "").strip().lower()
    return s if s in ("certain", "probable", "disputed") else ""


def route_languages(route) -> str:
    text = " ".join(str(x) for x in route) if isinstance(route, list) else str(route or "")
    text = text.lower()
    for alias, name in _LANG_ALIASES.items():
        text = text.replace(alias, name)
    return text


def route_complete(route, via: list[str]) -> bool:
    text = route_languages(route)
    for lang in via:
        if lang == "middle indic":
            if not any(m in text for m in _MIDDLE_INDIC):
                return False
        elif lang not in text:
            return False
    return True


# ─── Model calls ──────────────────────────────────────────────────────────

class Meter:
    """Tokens a model used, including failed and truncated attempts."""

    def __init__(self) -> None:
        self.prompt = 0
        self.completion = 0
        self.calls = 0
        self.failed = 0
        self.ms = 0.0

    def add(self, resp) -> None:
        self.prompt += resp.prompt_tokens
        self.completion += resp.completion_tokens
        self.calls += 1
        self.ms += resp.latency_ms


#: The most a model will write in one reply, where the vendor enforces one. The API
#: answered a 12,000-token request with HTTP 400 and this figure (2026-10-02).
MAX_OUTPUT = {"sarvam-105b-conversations": 8000}


async def ask(provider, meter: Meter, system: str, user: str, max_tokens: int,
              ceiling: Optional[int] = None):
    """One completion, retried. A reply cut off by the limit retries with more room, up
    to ``ceiling``; a rate limit waits and tries again without counting as a failure of
    the model."""
    cap = MAX_OUTPUT.get(provider.model)
    if cap:
        max_tokens, ceiling = min(max_tokens, cap), min(ceiling or cap, cap)
    last = None
    faults = 0
    for attempt in range(8):
        resp = await provider.complete(system=system, user=user, temperature=0.0,
                                       max_tokens=max_tokens, json_mode=True)
        meter.add(resp)
        if resp.ok:
            return resp
        last = resp
        err = resp.error or ""
        if "HTTP 429" in err:
            await asyncio.sleep(10.0 * (attempt + 1))
            continue
        faults += 1
        if faults >= 3:
            break
        if "truncated" in err:
            max_tokens = min(int(max_tokens * 2), ceiling or int(max_tokens * 2))
        await asyncio.sleep(2.0 * faults)
    meter.failed += 1
    return last


# ─── Test A: judge one word ───────────────────────────────────────────────

A_SYSTEM = (
    "You are an etymologist. Answer only what standard etymological dictionaries state. "
    "Reply with one JSON object and nothing else."
)

A_USER = """Word: {word}
Language: {language}
Meaning: {gloss}

Is this word historically connected to a Sanskrit word?

Reply as JSON with exactly these keys:
- "verdict": one of
    "borrowed"  : the word descends from a Sanskrit word by borrowing, directly or through other languages
    "related"   : not borrowed; the word and a Sanskrit word are relatives from a common ancestor, or the word comes from a Latin or Greek relative of a Sanskrit word
    "none"      : no accepted connection with a Sanskrit word
    "uncertain" : dictionaries disagree or the origin is unknown
- "sanskrit": the Sanskrit word in IAST, or ""
- "route": for "borrowed", the stops from Sanskrit to {language} in order, as strings like "Persian shakar"; otherwise []
- "confidence": "certain", "probable" or "disputed"
- "note": at most 20 words"""


def score_a(item: dict, reply) -> dict:
    data = reply if isinstance(reply, dict) else {}
    verdict = norm_verdict(data.get("verdict"))
    conf = norm_confidence(data.get("confidence"))
    out = {"verdict": verdict, "confidence": conf, "sanskrit": str(data.get("sanskrit") or ""),
           "route": data.get("route") or [], "note": str(data.get("note") or "")}
    gold = item["gold"]
    if gold == "loan":
        out["ok"] = verdict == "borrowed"
        out["source_ok"] = out["ok"] and source_matches(out["sanskrit"], item.get("sanskrit", []))
        via = VIA.get(f"{item['lang']}:{item['word']}")
        if via is not None:
            out["route_ok"] = out["ok"] and route_complete(out["route"], via)
    elif gold == "related":
        out["ok"] = verdict == "related"
        out["false_loan"] = verdict == "borrowed"
        if item.get("sanskrit"):
            out["source_ok"] = out["ok"] and source_matches(out["sanskrit"], item["sanskrit"])
    elif gold == "not":
        out["ok"] = verdict in ("none", "uncertain")
        out["false_loan"] = verdict == "borrowed"
        out["false_related"] = verdict == "related"
    else:  # disputed
        out["overclaim"] = verdict == "borrowed" and conf == "certain"
        out["false_loan"] = verdict == "borrowed"
    return out


async def run_a(provider, meter: Meter, items: list[dict], sem: asyncio.Semaphore) -> list[dict]:
    done = 0

    async def one(item: dict) -> dict:
        nonlocal done
        async with sem:
            resp = await ask(provider, meter, A_SYSTEM,
                             A_USER.format(word=item["word"], language=LANG_NAME[item["lang"]],
                                           gloss=item["gloss"]),
                             max_tokens=6000, ceiling=12000)
        row = {"lang": item["lang"], "word": item["word"], "gold": item["gold"],
               "hedge": item.get("hedge", ""), "raw": resp.text, "error": resp.error}
        row.update(score_a(item, parse_json(resp.text)))
        done += 1
        if done % 20 == 0:
            print(f"  {provider.label}: {done} of {len(items)} words", flush=True)
        return row

    return list(await asyncio.gather(*(one(i) for i in items)))


def summarise_a(rows: list[dict]) -> dict:
    def pick(gold: str) -> list[dict]:
        return [r for r in rows if r["gold"] == gold]

    loans, related, traps, disputed = pick("loan"), pick("related"), pick("not"), pick("disputed")

    def n(rs: list[dict], key: str) -> int:
        return sum(1 for r in rs if r.get(key))

    with_route = [r for r in loans if "route_ok" in r]
    related_named = [r for r in related if "source_ok" in r]
    return {
        "unparseable": sum(1 for r in rows if r["verdict"] == "error"),
        "loan": {"n": len(loans), "called_borrowed": n(loans, "ok"), "source_right": n(loans, "source_ok"),
                 "route_checked": len(with_route), "route_complete": n(with_route, "route_ok")},
        "related": {"n": len(related), "called_related": n(related, "ok"),
                    "called_borrowed": n(related, "false_loan"),
                    "named_checked": len(related_named), "named_right": n(related_named, "source_ok")},
        "not": {"n": len(traps), "called_borrowed": n(traps, "false_loan"),
                "called_borrowed_certain": sum(1 for r in traps if r.get("false_loan") and r["confidence"] == "certain"),
                "called_related": n(traps, "false_related")},
        "disputed": {"n": len(disputed), "called_borrowed": n(disputed, "false_loan"),
                     "called_borrowed_certain": n(disputed, "overclaim")},
    }


# ─── Test B: propose new words, check each in the dictionary ──────────────

B_SYSTEM = (
    "You are an etymologist. Answer only what standard etymological dictionaries state. "
    "Reply with one JSON array and nothing else."
)

B_USER = """List {n} English words that descend from a Sanskrit word by borrowing, directly or through other languages.
Use words an ordinary English dictionary lists. Do not use any of these, which we already have:
{known}

Reply as a JSON array of {n} objects with exactly these keys:
- "word": the English word
- "sanskrit": the Sanskrit source in IAST
- "route": the stops from Sanskrit to English in order, as strings like "Persian shakar"
- "confidence": "certain" or "probable\""""

# ahd_etymology and classify_ahd live in app.services.word_check (single copy).


async def run_b(provider, meter: Meter, known: list[str], n: int) -> dict:
    resp = await ask(provider, meter, B_SYSTEM, B_USER.format(n=n, known=", ".join(known)),
                     max_tokens=16000, ceiling=24000)
    props = []
    for d in parse_list(resp.text):
        if str(d.get("word") or "").strip():
            props.append({"word": str(d["word"]).strip(), "sanskrit": str(d.get("sanskrit") or ""),
                          "route": d.get("route") or [], "confidence": norm_confidence(d.get("confidence"))})
    return {"raw": resp.text, "error": resp.error, "asked": n, "proposals": props}


def check_b(per_model: dict[str, dict], known: list[str]) -> dict:
    """Look every proposed word up once, then score each model's list."""
    known_set = {k.casefold() for k in known}
    words = sorted({p["word"].casefold() for m in per_model.values() for p in m["proposals"]})
    looked: dict[str, dict] = {}
    with httpx.Client(headers=UA, timeout=30, follow_redirects=True) as client:
        for w in words:
            try:
                segs = ahd_etymology(client, w)
            except Exception as e:  # network
                segs = [f"HTTP error {type(e).__name__}"]
            looked[w] = {"etymology": segs, "label": classify_ahd(segs)}
            time.sleep(0.35)
    for m in per_model.values():
        for p in m["proposals"]:
            key = p["word"].casefold()
            info = looked[key]
            p["ahd"] = info["label"]
            p["etymology"] = info["etymology"]
            p["repeat_of_known"] = key in known_set
            stem = re.sub(r"(h|m|s)$", "", fold(p["sanskrit"]))
            p["source_in_entry"] = bool(stem) and stem in fold(" ".join(info["etymology"]))
    return looked


# ─── Test C: facts that cite a verse ──────────────────────────────────────

C_SYSTEM = (
    "You write short facts for a Sanskrit learning app. Every fact must rest on a verse you quote exactly. "
    "Reply with one JSON array and nothing else."
)

C_USER = """Write {n} "Do you know" facts, each resting on one specific verse of the Bhagavad-gītā, and {n} more, each resting on one specific verse of the Śrīmad-Bhāgavatam (Bhāgavata Purāṇa).

Reply as a JSON array of {total} objects with exactly these keys:
- "text": "bg" or "sb"
- "ref": for bg "chapter.verse" (for example "2.47"); for sb "canto.chapter.verse" (for example "9.3.32")
- "devanagari": the complete verse in Devanagari, exactly as it stands in the text
- "translation": the verse in English, one sentence
- "fact": the fact, one sentence"""

#: The same request for one text at a time, for a model whose reply is capped.
C_USER_ONE = """Write {n} "Do you know" facts, each resting on one specific verse of the {title}.

Reply as a JSON array of {n} objects with exactly these keys:
- "text": "{code}"
- "ref": {ref_hint}
- "devanagari": the complete verse in Devanagari, exactly as it stands in the text
- "translation": the verse in English, one sentence
- "fact": the fact, one sentence"""

_C_TEXTS = (
    ("bg", "Bhagavad-gītā", '"chapter.verse" (for example "2.47")'),
    ("sb", "Śrīmad-Bhāgavatam (Bhāgavata Purāṇa)", '"canto.chapter.verse" (for example "9.3.32")'),
)

_DEV_BLOCK = re.compile(r'class="av-devanagari"(.*?)class="av-verse_text"', re.S)
_VERSE_NO = re.compile(r"॥\s*([०-९]+)\s*॥")
_DEV_DIGITS = str.maketrans("०१२३४५६७८९", "0123456789")


def _page_devanagari(html: str) -> str:
    m = _DEV_BLOCK.search(html)
    if not m:
        return ""
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", m.group(1))).strip()


def _verses_on_page(dev: str) -> dict[int, str]:
    """Split a page that holds several verses on its ॥ n ॥ markers."""
    out: dict[int, str] = {}
    pos = 0
    for m in _VERSE_NO.finditer(dev):
        num = int(m.group(1).translate(_DEV_DIGITS))
        out[num] = dev[pos:m.start()].strip()
        pos = m.end()
    return out


#: "श्रीभगवानुवाच", "अर्जुन उवाच": the line naming the speaker. Some editions print it
#: with the verse and some do not, so it is dropped from both sides before comparing.
_SPEAKER = re.compile(r"^[^।॥]{0,40}?उवाच")


_ROMAN_SPEAKER = re.compile(r"^[^|.]{0,40}?uvāca", re.I)


def _slp_from_roman(text: str) -> str:
    """A verse quoted in roman letters (IAST) instead of Devanagari, in the same form."""
    t = unicodedata.normalize("NFC", (text or "").lower()).replace("ṁ", "ṃ")
    t = _ROMAN_SPEAKER.sub("", t.strip())
    t = re.sub(r"[^a-zāīūṛṝḷḹṅñṭḍṇśṣṃḥ]", "", t)
    try:
        import vidyut.lipi as lipi
        s = lipi.transliterate(t, lipi.Scheme.Iast, lipi.Scheme.Slp1)
    except Exception:
        s = t
    s = re.sub(r"[NYRnm](?=[kKgGcCjJwWqQtTdDpPbB])", "M", s)
    return re.sub(r"[^A-Za-z]", "", s)


def _slp(text: str) -> str:
    """Devanagari letters only, in SLP1, with nasals before stops folded to one sign.

    A quotation with no Devanagari in it at all is read as roman, so a model that
    answered in the wrong script is still judged on the words it quoted."""
    if not _DEVANAGARI.search(text or ""):
        return _slp_from_roman(text)
    t = re.sub(r"(?<=[ऀ-ॿ]):", "ः", text or "")  # the site types a colon for visarga
    t = "".join(ch for ch in t if "ऀ" <= ch <= "ॿ" or ch.isspace())
    t = _SPEAKER.sub("", t.strip())
    kept = "".join(ch for ch in t if "ऀ" <= ch <= "ॿ" and ch not in "।॥०१२३४५६७८९")
    try:
        import vidyut.lipi as lipi
        s = lipi.transliterate(kept, lipi.Scheme.Devanagari, lipi.Scheme.Slp1)
    except Exception:
        s = kept
    s = re.sub(r"[NYRnm](?=[kKgGcCjJwWqQtTdDpPbB])", "M", s)
    return re.sub(r"[^A-Za-z]", "", s)


def _similar(quote: str, verse: str) -> tuple[float, float]:
    """(how alike the two are as wholes, how much of the quote is found in the verse)."""
    a, b = _slp(quote), _slp(verse)
    if not a or not b:
        return 0.0, 0.0
    sm = difflib.SequenceMatcher(None, a, b, autojunk=False)
    inside = sum(blk.size for blk in sm.get_matching_blocks()) / len(a)
    return sm.ratio(), inside


class Vedabase:
    def __init__(self) -> None:
        self.client = httpx.Client(headers=UA, timeout=30, follow_redirects=True)
        self.cache: dict[str, tuple[int, str]] = {}

    def get(self, path: str) -> tuple[int, str]:
        if path not in self.cache:
            time.sleep(0.3)
            try:
                r = self.client.get(f"https://vedabase.io/en/library/{path}/")
                self.cache[path] = (r.status_code, r.text)
            except Exception as e:  # network
                self.cache[path] = (0, f"{type(e).__name__}")
        return self.cache[path]

    def verse(self, book: str, parts: list[int]) -> tuple[str, str]:
        """(status, Devanagari of that verse). status: found | no_such_verse | unreachable."""
        chapter = "/".join(str(p) for p in parts[:-1])
        number = parts[-1]
        code, html = self.get(f"{book}/{chapter}/{number}")
        if code == 200:
            dev = _page_devanagari(html)
            return ("found", _verses_on_page(dev).get(number, dev)) if dev else ("unreachable", "")
        if code != 404:
            return "unreachable", ""
        # Some verses share a page (bg/13/1-2). Find it from the chapter's list.
        code, html = self.get(f"{book}/{chapter}")
        if code != 200:
            return ("no_such_verse", "") if code == 404 else ("unreachable", "")
        for lo, hi in set(re.findall(rf"/library/{book}/{chapter}/(\d+)-(\d+)/", html)):
            if int(lo) <= number <= int(hi):
                code, page = self.get(f"{book}/{chapter}/{lo}-{hi}")
                if code == 200:
                    dev = _page_devanagari(page)
                    return "found", _verses_on_page(dev).get(number, dev)
        return "no_such_verse", ""

    def close(self) -> None:
        self.client.close()


def check_c(vb: Vedabase, fact: dict) -> dict:
    book = str(fact.get("text") or "").strip().lower()
    ref = str(fact.get("ref") or "").strip()
    quote = str(fact.get("devanagari") or "")
    out = {"text": book, "ref": ref, "devanagari": quote,
           "translation": str(fact.get("translation") or ""), "fact": str(fact.get("fact") or "")}
    parts = [int(p) for p in re.findall(r"\d+", ref)]
    want = 2 if book == "bg" else 3
    if book not in ("bg", "sb") or len(parts) != want:
        out.update(status="bad_reference", verdict="bad_reference")
        return out
    status, verse = vb.verse(book, parts)
    out["status"] = status
    if status != "found":
        out["verdict"] = status
        return out
    ratio, inside = _similar(quote, verse)
    out.update(ratio=round(ratio, 3), inside=round(inside, 3), source_verse=verse,
               in_devanagari=bool(_DEVANAGARI.search(quote)))
    # Nearly all of the verse, quoted faithfully, also counts: the page may open with
    # an invocation the quotation leaves out.
    nearly_whole = inside >= 0.92 and len(_slp(quote)) >= 0.75 * len(_slp(verse))
    if ratio >= 0.90 or nearly_whole:
        out["verdict"] = "matches"
    elif inside >= 0.90:
        out["verdict"] = "part_of_verse"
    else:
        out["verdict"] = "does_not_match"
        # Is it the right verse under a neighbouring number?
        for delta in (-2, -1, 1, 2):
            near = parts[:-1] + [parts[-1] + delta]
            if near[-1] < 1:
                continue
            st, other = vb.verse(book, near)
            if st == "found" and _similar(quote, other)[0] >= 0.90:
                out["verdict"] = "wrong_number"
                out["actual_ref"] = ".".join(str(p) for p in near)
                break
    return out


async def run_c(provider, meter: Meter, n: int, split: bool) -> dict:
    """One call for both texts, or with ``split`` one call per text."""
    if not split:
        resp = await ask(provider, meter, C_SYSTEM, C_USER.format(n=n, total=2 * n),
                         max_tokens=16000, ceiling=24000)
        return {"raw": resp.text, "error": resp.error, "asked": 2 * n, "facts": parse_list(resp.text)}
    raws, errors, facts = [], [], []
    for code, title, ref_hint in _C_TEXTS:
        resp = await ask(provider, meter, C_SYSTEM,
                         C_USER_ONE.format(n=n, title=title, code=code, ref_hint=ref_hint),
                         max_tokens=8000, ceiling=16000)
        raws.append(resp.text)
        if resp.error:
            errors.append(resp.error)
        for d in parse_list(resp.text):
            d.setdefault("text", code)
            facts.append(d)
    return {"raw": "\n".join(raws), "error": "; ".join(errors) or None, "asked": 2 * n, "facts": facts}


# ─── Costs ────────────────────────────────────────────────────────────────

def openrouter_prices() -> dict[str, tuple[float, float]]:
    """USD per 1M tokens (input, output) from OpenRouter's own list."""
    try:
        data = httpx.get("https://openrouter.ai/api/v1/models", timeout=30).json().get("data", [])
    except Exception:
        return {}
    return {m["id"]: (float(m["pricing"]["prompt"]) * 1e6, float(m["pricing"]["completion"]) * 1e6)
            for m in data if m.get("id") and m.get("pricing")}


def openrouter_spent(provider) -> Optional[float]:
    try:
        r = httpx.get("https://openrouter.ai/api/v1/credits",
                      headers={"Authorization": f"Bearer {provider._api_key}"}, timeout=30)
        return float(r.json()["data"]["total_usage"]) if r.status_code == 200 else None
    except Exception:
        return None


def cost_line(provider, meter: Meter, prices: dict) -> str:
    if provider.name == "openrouter" and provider.model in prices:
        pin, pout = prices[provider.model]
        usd = (meter.prompt * pin + meter.completion * pout) / 1e6
        return f"${usd:.3f} (from tokens at ${pin:.2f} in, ${pout:.2f} out per 1M)"
    return f"₹{provider.cost_inr(meter.prompt, meter.completion):.2f} (from tokens, table in providers.py)"


# ─── Main ─────────────────────────────────────────────────────────────────

def pick_items(items: list[dict], limit: int) -> list[dict]:
    """Every item, or for a smoke run the first few of each gold class."""
    if limit <= 0:
        return items
    out: list[dict] = []
    per = max(1, limit // 4)
    for gold in ("loan", "related", "not", "disputed"):
        out.extend([i for i in items if i["gold"] == gold][:per])
    return out


async def bench(args) -> int:
    gold = json.loads(GOLD_PATH.read_text(encoding="utf-8"))["items"]
    items = pick_items(gold, args.limit)
    known = sorted({i["word"] for i in gold if i["gold"] == "loan" and i["lang"] == "en"}, key=str.casefold)
    tests = {t.strip().lower() for t in args.tests.split(",") if t.strip()}
    refs = [m.strip() for m in args.models.split(",") if m.strip()]

    print(f"models: {', '.join(refs)}")
    print(f"test A: {len(items)} words per model, one call each" if "a" in tests else "test A: skipped")
    print(f"test B: 1 call per model for {args.propose} proposals, then a dictionary look-up per word" if "b" in tests else "test B: skipped")
    print(f"test C: 1 call per model for {2 * args.facts} facts, then a verse page per fact" if "c" in tests else "test C: skipped")
    if not args.live:
        print("\nPlan only. Add --live to call the vendors (costs money).")
        return 0

    providers = [build_provider(ref, timeout=300.0) for ref in refs]
    if args.extra:
        # Vendor-specific request fields the shared Provider does not know, such as
        # Sarvam's reasoning_effort. Added to every request of this run.
        extra = json.loads(args.extra)
        for p in providers:
            base = p._payload
            p._payload = lambda *a, _base=base, **k: {**_base(*a, **k), **extra}
        print(f"extra request fields: {extra}")
    missing = [p.label for p in providers if not p.configured]
    if missing:
        print(f"no key for: {', '.join(missing)}")
        return 1

    prices = openrouter_prices()
    or_provider = next((p for p in providers if p.name == "openrouter"), None)
    spent_before = openrouter_spent(or_provider) if or_provider else None

    meters = {p.label: Meter() for p in providers}
    result: dict = {"stamp": datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ"),
                    "models": refs, "tests": sorted(tests), "a": {}, "b": {}, "c": {}}

    async def one_model(p) -> None:
        m = meters[p.label]
        sem = asyncio.Semaphore(args.concurrency)
        if "a" in tests:
            rows = await run_a(p, m, items, sem)
            result["a"][p.label] = {"rows": rows, "summary": summarise_a(rows)}
        if "b" in tests:
            result["b"][p.label] = await run_b(p, m, known, args.propose)
        if "c" in tests:
            result["c"][p.label] = await run_c(p, m, args.facts, split=args.split_facts)
        await p.close()

    started = time.perf_counter()
    await asyncio.gather(*(one_model(p) for p in providers))

    if "b" in tests:
        result["b_lookups"] = check_b(result["b"], known)
    if "c" in tests:
        vb = Vedabase()
        try:
            for label, block in result["c"].items():
                block["checked"] = [check_c(vb, f) for f in block["facts"]]
        finally:
            vb.close()

    result["cost"] = {}
    for p in providers:
        m = meters[p.label]
        result["cost"][p.label] = {"calls": m.calls, "failed": m.failed, "prompt_tokens": m.prompt,
                                   "completion_tokens": m.completion, "line": cost_line(p, m, prices)}
    if or_provider and spent_before is not None:
        after = openrouter_spent(or_provider)
        if after is not None:
            result["cost"]["openrouter_account_delta_usd"] = round(after - spent_before, 4)
    result["seconds"] = round(time.perf_counter() - started, 1)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out_path = Path(args.out) if args.out else OUT_DIR / f"{result['stamp']}.json"
    out_path.write_text(json.dumps(result, ensure_ascii=False, indent=1), encoding="utf-8")
    report(result)
    print(f"\nraw replies and scores: {out_path}")
    return 0 if all(meters[p.label].failed < meters[p.label].calls for p in providers) else 1


def report(result: dict) -> None:
    if result["a"]:
        print("\n── A. Judge one word " + "─" * 50)
        for label, block in result["a"].items():
            s = block["summary"]
            lo, re_, no, di = s["loan"], s["related"], s["not"], s["disputed"]
            print(f"\n{label}   (unparseable replies: {s['unparseable']})")
            print(f"  borrowed words ({lo['n']}): called borrowed {lo['called_borrowed']}, "
                  f"right Sanskrit source {lo['source_right']}, "
                  f"route names every stop {lo['route_complete']} of {lo['route_checked']}")
            print(f"  related words ({re_['n']}): called related {re_['called_related']}, "
                  f"wrongly called borrowed {re_['called_borrowed']}, "
                  f"right relative named {re_['named_right']} of {re_['named_checked']}")
            print(f"  not from Sanskrit ({no['n']}): wrongly called borrowed {no['called_borrowed']} "
                  f"({no['called_borrowed_certain']} with 'certain'), called related {no['called_related']}")
            print(f"  dictionaries disagree ({di['n']}): called borrowed {di['called_borrowed']} "
                  f"({di['called_borrowed_certain']} with 'certain')")
            wrong = [r for r in block["rows"] if r.get("false_loan") or (r["gold"] == "loan" and not r.get("source_ok"))]
            for r in wrong:
                print(f"     {r['gold']:8s} {r['lang']} {r['word']:12s} -> {r['verdict']}/{r['confidence'] or '-'} "
                      f"{r['sanskrit']!r} {(r['error'] or '')[:60]}")
    if result["b"]:
        print("\n── B. Propose new English words " + "─" * 39)
        for label, block in result["b"].items():
            props = block["proposals"]
            tally: dict[str, int] = {}
            for p in props:
                tally[p.get("ahd", "?")] = tally.get(p.get("ahd", "?"), 0) + 1
            print(f"\n{label}: {len(props)} proposals  {tally}  {block['error'] or ''}")
            for p in props:
                flag = " (already in our list)" if p.get("repeat_of_known") else ""
                print(f"   {p.get('ahd', '?'):16s} {p['word']:14s} {p['sanskrit']:18s} "
                      f"source in entry: {p.get('source_in_entry')}{flag}")
    if result["c"]:
        print("\n── C. Facts that cite a verse " + "─" * 41)
        for label, block in result["c"].items():
            checked = block.get("checked", [])
            tally = {}
            for c in checked:
                tally[c["verdict"]] = tally.get(c["verdict"], 0) + 1
            print(f"\n{label}: {len(checked)} facts  {tally}  {block['error'] or ''}")
            for c in checked:
                print(f"   {c['verdict']:15s} {c['text']} {c['ref']:9s} ratio={c.get('ratio', '-')} "
                      f"inside={c.get('inside', '-')} {c.get('actual_ref', '')}")
    print("\n── Cost " + "─" * 63)
    for label, c in result["cost"].items():
        if isinstance(c, dict):
            print(f"{label}: {c['calls']} calls, {c['failed']} failed, "
                  f"{c['prompt_tokens']} in + {c['completion_tokens']} out tokens, {c['line']}")
        else:
            print(f"{label}: {c}")
    print(f"wall time: {result.get('seconds')} s")


def merge(paths: list[str], out: str) -> int:
    """Put several result files into one, block by block; a later file wins.

    A run can be redone for one model or one test (a rate limit, a reply cut short)
    without paying again for the rest. No vendor is called and nothing is rescored
    except the test A summaries, which are recomputed from the rows.
    """
    merged: dict = {"stamp": datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ"), "merged_from": paths,
                    "models": [], "tests": ["a", "b", "c"], "a": {}, "b": {}, "c": {}, "b_lookups": {}, "cost": {}}
    for p in paths:
        d = json.loads(Path(p).read_text(encoding="utf-8"))
        for test in ("a", "b", "c"):
            merged[test].update(d.get(test) or {})
        merged["b_lookups"].update(d.get("b_lookups") or {})
        for label, c in (d.get("cost") or {}).items():
            merged["cost"][f"{label}  [{Path(p).stem}]"] = c
    for block in merged["a"].values():
        block["summary"] = summarise_a(block["rows"])
    merged["models"] = sorted(set(merged["a"]) | set(merged["b"]) | set(merged["c"]))
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out_path = Path(out) if out else OUT_DIR / f"merged-{merged['stamp']}.json"
    out_path.write_text(json.dumps(merged, ensure_ascii=False, indent=1), encoding="utf-8")
    report(merged)
    print(f"\nmerged file: {out_path}")
    return 0


def recheck(path: str) -> int:
    """Score a saved result file again from its saved replies. Calls no vendor.

    For when the scoring changes: test A is rescored from each raw reply, and the
    dictionary and verse look-ups of tests B and C are made again.
    """
    p = Path(path)
    d = json.loads(p.read_text(encoding="utf-8"))
    gold_items = json.loads(GOLD_PATH.read_text(encoding="utf-8"))["items"]
    gold = {f"{i['lang']}:{i['word']}": i for i in gold_items}
    known = sorted({i["word"] for i in gold_items if i["gold"] == "loan" and i["lang"] == "en"}, key=str.casefold)
    for block in (d.get("a") or {}).values():
        for row in block["rows"]:
            item = gold.get(f"{row['lang']}:{row['word']}")
            if item:
                row.update(score_a(item, parse_json(row.get("raw") or "")))
        block["summary"] = summarise_a(block["rows"])
    if d.get("b"):
        d["b_lookups"] = check_b(d["b"], known)
    if d.get("c"):
        vb = Vedabase()
        try:
            for block in d["c"].values():
                block["checked"] = [check_c(vb, f) for f in block.get("facts", [])]
        finally:
            vb.close()
    p.write_text(json.dumps(d, ensure_ascii=False, indent=1), encoding="utf-8")
    d.setdefault("cost", {})
    report(d)
    print(f"\nrechecked in place: {p}")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--merge", default="", help="comma-separated result files to merge; calls no vendor")
    ap.add_argument("--recheck", default="", help="a result file to score again from its saved replies; calls no vendor")
    ap.add_argument("--live", action="store_true", help="call the vendors (costs money)")
    ap.add_argument("--models", default=DEFAULT_MODELS, help="comma-separated provider:model refs")
    ap.add_argument("--tests", default="a,b,c", help="which tests to run: a, b, c")
    ap.add_argument("--limit", type=int, default=0, help="test A: only this many words (smoke run)")
    ap.add_argument("--propose", type=int, default=20, help="test B: words to ask for")
    ap.add_argument("--facts", type=int, default=8, help="test C: facts per text")
    ap.add_argument("--concurrency", type=int, default=5, help="parallel calls per model")
    ap.add_argument("--split-facts", action="store_true",
                    help="test C: one call per text, for a model whose reply length is capped")
    ap.add_argument("--extra", default="",
                    help='JSON of extra request fields, for example \'{"reasoning_effort": "low"}\'')
    ap.add_argument("--out", default="", help="results file (default results/word_origins_bench/<stamp>.json)")
    args = ap.parse_args()
    if args.recheck:
        return recheck(args.recheck)
    if args.merge:
        return merge([p.strip() for p in args.merge.split(",") if p.strip()], args.out)
    return asyncio.run(bench(args))


if __name__ == "__main__":
    sys.exit(main())
