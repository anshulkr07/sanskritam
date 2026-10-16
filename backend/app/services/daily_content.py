"""Daily content: the word journey and the "Do you know" fact, kept stocked.

Nothing here is on a learner's request path. ``POST /admin/content/tick``
(routers/daily_content.py) calls :func:`tick`, a scheduler calls that
endpoint, and each call moves the work one bounded step:

    propose   one Vertex batch job: Gemini Flash lists words that go back to
              Sanskrit, a few languages a run, or facts that rest on a verse
    cite      a second batch job: for each candidate the model names the web
              pages that state it
    check     code opens those pages (services/page_check.py) and keeps a
              candidate only when a page on a trusted site carries it
    judge     words only, a third batch job: the model reads the passage the
              check found and says whether it gives the Sanskrit word as the
              source or only as a relative ("akin to")
    store     the card is written to the database with the next free day and
              a link to that page

A run starts by itself when fewer than ``content_*_stock_days`` future days
are filled, so there is no approval step and no deploy between a word being
found and a learner seeing it. A candidate with no confirming page gets no
card.

Rules that hold throughout:

* Gemini is reached only through Vertex AI batch jobs with the service
  account (owner decision 2026-10-02). No OpenRouter, no online call, and no
  Google Search grounding: its terms forbid storing or collecting links.
* Sanskrit is never taken from the model as written. A word's stem must be a
  stem the Vidyut kosha lists, and its Devanagari and roman forms are made by
  vidyut.lipi. A verse is shown only if the page carries it.
* The model's own wording (meanings, the fact, the explanation) is checked
  for length, for dashes and for copying the page, not for truth. The card
  says so.

What has been run: tests/test_daily_content.py, with a stand-in Vertex client
and made-up pages. The propose and cite prompts were run once on Vertex on
2026-10-02 without the last key of each (168 words in 14 languages, 32 facts;
200 page requests answered). The check step has never been run against live
sites and the judge prompt has never been run at all, so how many candidates
survive is not known.
"""

from __future__ import annotations

import json
import logging
import re
import time
import unicodedata
import uuid
import zlib
from collections import Counter
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Callable, Optional
from urllib.parse import quote

from sqlalchemy.exc import IntegrityError

from app.config import settings
from app.services import page_check as pc
from app.services.vertex_batch import (
    build_request_line,
    gcs_object_name,
    is_terminal_state,
    sum_tokens,
    to_jsonl,
)
from app.services.word_check import fold, parse_json, parse_list

logger = logging.getLogger("shabd.daily_content")

KINDS = ("facts", "words")
AUTO_BATCH = "auto"
PAGE_CHECKED = "page"

LANGS_PER_RUN = 8
WORDS_PER_LANG = 12
GROUPS_PER_RUN = 3
FACTS_PER_GROUP = 8

#: A verse counts as carried by a page when this share of it stands there.
MIN_VERSE_SHARE = 0.9
#: After a run fails, wait this long before starting another of its kind.
RETRY_AFTER_S = 6 * 3600
#: A kind rests this long after a run that made new cards, and this long
#: after one that made none, so an unlucky stretch cannot spend all day.
MIN_GAP_S = 6 * 3600
EMPTY_GAP_S = 24 * 3600
#: Google queues a batch job for up to 72 hours; past this a run is given up.
MAX_WAIT_S = 80 * 3600
#: Two overlapping ticks: the second leaves the run alone for this long.
LOCK_S = 150
#: A step that keeps failing for reasons that may pass (the network, Vertex
#: answering 5xx) is tried again on the next tick, this many times in a row.
MAX_ERRORS = 12


class RunFailed(Exception):
    """The run cannot go on: its batch job ended badly or never finished."""

_OK_STATES = ("JOB_STATE_SUCCEEDED", "JOB_STATE_PARTIALLY_SUCCEEDED")

#: Tokens one request is expected to cost, (prompt, output with reasoning),
#: for the estimate made before a job is sent. The cite figure is the Vertex
#: run of 2026-10-02 (200 requests: 39,740 prompt, 35,087 reply and 241,433
#: reasoning tokens); the propose figure is a guess on the high side.
_EXPECTED_TOKENS = {"propose": (900, 8000), "cite": (250, 1600), "judge": (600, 1600)}

# ─── The languages ──────────────────────────────────────────────────────────

#: (code, English name, Indo-Aryan). A run asks for the next few in turn, so
#: every language comes round; the last request of each run is open to any
#: language not listed. For an Indo-Aryan language a word may also descend
#: from the Sanskrit word instead of being borrowed.
LANGUAGES: tuple[tuple[str, str, bool], ...] = (
    ("en", "English", False), ("hi", "Hindi", True), ("de", "German", False),
    ("fa", "Persian", False), ("fr", "French", False), ("id", "Indonesian", False),
    ("ru", "Russian", False), ("ta", "Tamil", False), ("es", "Spanish", False),
    ("th", "Thai", False), ("ar", "Arabic", False), ("bn", "Bengali", True),
    ("it", "Italian", False), ("ja", "Japanese", False), ("pt", "Portuguese", False),
    ("ms", "Malay", False), ("tr", "Turkish", False), ("mr", "Marathi", True),
    ("nl", "Dutch", False), ("km", "Khmer", False), ("ur", "Urdu", True),
    ("zh", "Chinese", False), ("te", "Telugu", False), ("sw", "Swahili", False),
    ("el", "Greek", False), ("ne", "Nepali", True), ("jv", "Javanese", False),
    ("pl", "Polish", False), ("gu", "Gujarati", True), ("my", "Burmese", False),
    ("sv", "Swedish", False), ("kn", "Kannada", False), ("ko", "Korean", False),
    ("pa", "Punjabi", True), ("lo", "Lao", False), ("he", "Hebrew", False),
    ("ml", "Malayalam", False), ("vi", "Vietnamese", False), ("si", "Sinhala", True),
    ("uk", "Ukrainian", False), ("tl", "Tagalog", False), ("or", "Odia", True),
    ("bo", "Tibetan", False), ("da", "Danish", False), ("as", "Assamese", True),
    ("mn", "Mongolian", False), ("no", "Norwegian", False), ("ps", "Pashto", False),
    ("cs", "Czech", False), ("sd", "Sindhi", True), ("fi", "Finnish", False),
    ("ku", "Kurdish", False), ("hu", "Hungarian", False), ("ro", "Romanian", False),
    ("dv", "Dhivehi", True), ("uz", "Uzbek", False), ("ca", "Catalan", False),
    ("hy", "Armenian", False), ("su", "Sundanese", False), ("ka", "Georgian", False),
    ("bg", "Bulgarian", False), ("sr", "Serbian", False), ("mg", "Malagasy", False),
    ("az", "Azerbaijani", False), ("kk", "Kazakh", False), ("tg", "Tajik", False),
    ("hr", "Croatian", False), ("lt", "Lithuanian", False), ("am", "Amharic", False),
    ("ceb", "Cebuano", False), ("ks", "Kashmiri", True), ("mai", "Maithili", True),
)

#: Where facts are drawn from, a few groups a run, in turn.
FACT_GROUPS: tuple[str, ...] = (
    "the principal Upaniṣads (Īśa, Kena, Kaṭha, Praśna, Muṇḍaka, Māṇḍūkya, Taittirīya, "
    "Aitareya, Chāndogya, Bṛhadāraṇyaka, Śvetāśvatara)",
    "the Bhagavad-gītā",
    "works of science: the Suśruta-saṃhitā, the Caraka-saṃhitā, the Āryabhaṭīya, "
    "the Sūrya-siddhānta, the Bṛhat-saṃhitā and the Līlāvatī",
    "the Bhāgavata Purāṇa (Śrīmad-Bhāgavatam)",
    "the Vālmīki Rāmāyaṇa",
    "the Ṛgveda",
    "the Mahābhārata",
    "the Purāṇas other than the Bhāgavata (Viṣṇu, Mārkaṇḍeya, Matsya, Vāyu, Garuḍa, Agni)",
    "the Yoga-sūtra, the Sāṃkhya-kārikā, the Nyāya-sūtra and the Brahma-sūtra",
    "the Atharvaveda and the Yajurveda",
    "the Arthaśāstra, the Manu-smṛti, the Hitopadeśa, the Pañcatantra and Bhartṛhari",
    "Kālidāsa and the classical poets",
    "the Nāṭyaśāstra, Pāṇini's Aṣṭādhyāyī and works on language, metre and music",
)

# ─── The prompts ────────────────────────────────────────────────────────────
# The first sentences of each are the ones run on Vertex on 2026-10-02. The
# keys "sanskrit_gloss" and "explanation", the structured "route" and the
# open-language request were added after that run and have not been run.

WORD_SYSTEM = (
    "You are an etymologist. Answer only what standard etymological dictionaries state. "
    "Reply with one JSON array and nothing else."
)

_WORD_KEYS = """Reply as a JSON array of objects with exactly these keys:
- "word": the word, in the normal script of its language
- "roman": the word in roman letters ("" if it is already in roman letters)
- "gloss": what the word means today, in English, at most 8 words
- "sanskrit": the Sanskrit word it goes back to, as a stem in IAST with diacritics (for example "śarkarā")
- "sanskrit_gloss": what the Sanskrit word means, in English, at most 8 words
- "route": the stops between the Sanskrit word and this word, from the Sanskrit side outward, as a list of objects with "lang" and "form" (for example {{"lang": "Persian", "form": "shakar"}}); [] if it came straight from Sanskrit
- "confidence": "certain" if dictionaries state this origin plainly, "probable" if they hedge"""

WORD_USER = (
    "List {n} {language} words that go back to a Sanskrit word, by borrowing (directly or "
    "through other languages){descent}. Use ordinary words that a general dictionary of "
    "{language} lists, written in the normal script of {language}. Leave out proper names, "
    "and leave out words used only for Indian religion or yoga.\n\n" + _WORD_KEYS + "{known}"
)

WORD_USER_OPEN = (
    "List {n} words, from languages other than these: {listed}, that go back to a Sanskrit "
    "word by borrowing (directly or through other languages). Use ordinary words that a "
    "general dictionary of the language lists, written in the normal script of the language. "
    "Leave out proper names, and leave out words used only for Indian religion or yoga.\n\n"
    + _WORD_KEYS
    + '\n- "language": the English name of the language\n'
    '- "lang_code": its ISO 639 code, in lower case'
)

WORD_CITE_SYSTEM = (
    "You point to dictionary pages. Name only pages you are confident exist. "
    "Reply with one JSON object and nothing else."
)

WORD_CITE_USER = """Word: {word} ({language}), meaning "{gloss}".
Stated origin: Sanskrit {sanskrit}.

Name up to 3 web pages on which a dictionary or a scholarly reference work states the origin of this word. Give only pages you are confident exist, on the sites of dictionaries, language academies, universities or scholarly publishers. Never Wikipedia, Wiktionary, blogs, forums or question-and-answer sites. Prefer a dictionary of {language} itself.

Reply as one JSON object: {{"pages": [{{"url": "...", "site": "...", "says": "...", "sanskrit_as_printed": "..."}}]}}
"says" is what the page states about the origin, in at most 20 words of your own. "sanskrit_as_printed" is the Sanskrit form exactly as that page prints it. If you know no such page, reply {{"pages": []}}."""

JUDGE_SYSTEM = (
    "You read a passage from a dictionary and say what it states. Use only the passage you "
    "are given. Reply with one JSON object and nothing else."
)

JUDGE_USER = """Word: {word} ({language})
Sanskrit word: {sanskrit}

Passage from {site}:
<<<
{excerpt}
>>>

Does this passage state that the word comes from the Sanskrit word, by borrowing (directly or through other languages) or by descent from it? A word that the passage only compares with the Sanskrit word, or calls related, akin or cognate to it, does not come from it.

Reply as one JSON object: {{"verdict": "source" or "relative" or "not stated", "hedged": true or false}}
"hedged" is true when the passage itself calls the origin probable, possible or uncertain."""

FACT_SYSTEM = (
    "You are an evidence-led editor for a Sanskrit learning app. Make each card a genuinely "
    "surprising insight about language, mathematics, astronomy, medicine as historical practice, "
    "poetics, music or an unusual idea in a named text. Avoid generic devotional or moral verses. "
    "Every claim must be supported by the exact passage you quote. Never claim an ancient passage "
    "predicted or measured a modern scientific result unless the passage and reliable scholarship "
    "establish that exact claim. Never repeat viral quotations or calculations as fact. Reply with "
    "one JSON array and nothing else."
)

FACT_USER = """Write {n} "Do you know" cards for a curious adult reader, each resting on one specific verse or sentence of {group}. Choose details that make the reader want to learn more: a precise linguistic pattern, a mathematical or metrical method, an unusual observation, or an unexpected idea. Do not return a random verse followed by a generic moral. Say what the passage actually describes, and clearly separate that from any later interpretation.

Do not use these popular but unsupported claims: the Hanuman Cālīsā gives a verified ancient measurement of the Earth–Sun distance; a text states an exact Moon–Earth diameter/distance ratio of 108; Albert Einstein made an untraceable quotation praising the Vedas; Piṅgala discovered Fibonacci's sequence in its later named form. A passage about a pattern is not proof of a modern scientific measurement or of historical influence.

Reply as a JSON array of {n} objects with exactly these keys:
- "text": the name of the text, with diacritics (for example "Bhagavad-gītā")
- "ref": where the passage stands in that text, as numbers (for example "2.47" or "9.3.32")
- "devanagari": the complete verse or sentence in Devanagari, exactly as it stands in the text
- "translation": the passage in English, in your own words, one or two sentences
- "fact": the fact, one sentence, saying only what the passage supports
- "explanation": two or three sentences, in your own words, on what the passage says and why it is of interest
- "claim_kind": "the text says this", "tradition reads it this way" or "modern interpretation"{known}"""

FACT_CITE_SYSTEM = (
    "You point to pages that carry a Sanskrit text. Name only pages you are confident exist. "
    "Reply with one JSON object and nothing else."
)

FACT_CITE_USER = """Text: {text} {ref}
Passage: {devanagari}

Name up to 3 web pages that carry this passage of the Sanskrit text itself. Give only pages you are confident exist, on the sites of universities, scholarly text libraries or publishers of the text (for example GRETIL, Sanskrit Documents, Vedabase, TITUS). Never Wikipedia, Wikisource, blogs, forums or question-and-answer sites.

Reply as one JSON object: {{"pages": [{{"url": "...", "site": "...", "ref_on_page": "..."}}]}}
If you know no such page, reply {{"pages": []}}."""

# ─── Addresses that need no model ───────────────────────────────────────────
# Each was opened by hand for this project on 2026-10-01 or 2026-10-02
# (specs/word-origins-verified.md). They are tried before the pages the model
# names, and pass or fail the same check.

_WORD_URLS: dict[str, tuple[str, ...]] = {
    "en": ("https://ahdictionary.com/word/search.html?q={w}",),
    "de": ("https://www.dwds.de/wb/etymwb/{w}", "https://www.duden.de/rechtschreibung/{w}"),
    "ru": ("https://gufo.me/dict/vasmer/{w}",),
    "hi": ("https://dsal.uchicago.edu/cgi-bin/app/platts_query.py?qs={w}&searchhws=yes",),
}


def word_urls(lang: str, word: str) -> list[str]:
    w = unicodedata.normalize("NFC", (word or "").strip())
    if not w:
        return []
    if lang == "ru":
        w = w.replace("ё", "е")  # the site writes ё as е in its addresses
    return [t.format(w=quote(w, safe="")) for t in _WORD_URLS.get(lang, ())]


def verse_urls(text_name: str, ref: str) -> list[str]:
    name = fold(text_name)
    nums = re.findall(r"\d+", ref or "")
    if "bhagavadgita" in name and len(nums) == 2:
        return [f"https://vedabase.io/en/library/bg/{nums[0]}/{nums[1]}/"]
    if "bhagavata" in name and len(nums) == 3:
        return [f"https://vedabase.io/en/library/sb/{nums[0]}/{nums[1]}/{nums[2]}/"]
    return []


# ─── Small text rules ───────────────────────────────────────────────────────

_SCRIPTS: tuple[tuple[int, int, str], ...] = (
    (0x0400, 0x052F, "cyrillic"), (0x0370, 0x03FF, "greek"), (0x0590, 0x05FF, "hebrew"),
    (0x0600, 0x06FF, "arabic"), (0x0750, 0x077F, "arabic"), (0x0780, 0x07BF, "thaana"),
    (0x0900, 0x097F, "devanagari"), (0x0980, 0x09FF, "bengali"), (0x0A00, 0x0A7F, "gurmukhi"),
    (0x0A80, 0x0AFF, "gujarati"), (0x0B00, 0x0B7F, "odia"), (0x0B80, 0x0BFF, "tamil"),
    (0x0C00, 0x0C7F, "telugu"), (0x0C80, 0x0CFF, "kannada"), (0x0D00, 0x0D7F, "malayalam"),
    (0x0D80, 0x0DFF, "sinhala"), (0x0E00, 0x0E7F, "thai"), (0x0E80, 0x0EFF, "lao"),
    (0x0F00, 0x0FFF, "tibetan"), (0x1000, 0x109F, "myanmar"), (0x10A0, 0x10FF, "georgian"),
    (0x1200, 0x137F, "ethiopic"), (0x1780, 0x17FF, "khmer"), (0x0530, 0x058F, "armenian"),
    (0x1800, 0x18AF, "mongolian"), (0x3040, 0x30FF, "kana"), (0x3400, 0x9FFF, "han"),
    (0xAC00, 0xD7AF, "hangul"),
)


def script_of(word: str) -> str:
    """The script a word is written in, read from its first letter."""
    for ch in word or "":
        if not ch.isalpha():
            continue
        cp = ord(ch)
        if cp < 0x0250 or 0x1E00 <= cp <= 0x1EFF:
            return "latin"
        for lo, hi, name in _SCRIPTS:
            if lo <= cp <= hi:
                return name
        return "other"
    return "other"


def clean(text, limit: int = 0) -> str:
    """One line of model wording made safe to show: NFC, single spaces, and
    no em dash or spaced en dash (the copy rule)."""
    t = unicodedata.normalize("NFC", str(text or ""))
    t = t.replace(" — ", ", ").replace("—", ", ").replace(" – ", ", ")
    t = re.sub(r"\s+", " ", t).strip()
    return t[:limit].rstrip() if limit and len(t) > limit else t


def _words(text: str) -> int:
    return len((text or "").split())


def _utc_today() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def _age_s(when) -> float:
    if when is None:
        return 0.0
    if when.tzinfo is None:
        when = when.replace(tzinfo=timezone.utc)
    return (datetime.now(timezone.utc) - when).total_seconds()


# ─── Sanskrit: the stem gate and the forms shown ────────────────────────────

_DEVANAGARI = re.compile(r"[ऀ-ॿ]")


def stem_key(sanskrit: str, stems: set[str]) -> str:
    """The SLP1 stem behind what the model wrote, or "" when the kosha lists
    no such stem. A first-case ending (ḥ, m) is tried without it."""
    form = (sanskrit or "").strip().split(",")[0].split(" ")[0].strip(".;:()[]\"'-· ")
    if not form:
        return ""
    try:
        import vidyut.lipi as lipi
        source = lipi.Scheme.Devanagari if _DEVANAGARI.search(form) else lipi.Scheme.Iast
        slp = (lipi.transliterate(unicodedata.normalize("NFC", form), source, lipi.Scheme.Slp1) or "").strip()
    except Exception:
        return ""
    if not re.fullmatch(r"[A-Za-z]{2,40}", slp):
        return ""
    for cand in (slp, slp[:-1] if slp[-1] in "Hm" else ""):
        if cand and cand in stems:
            return cand
    return ""


def sanskrit_forms(mw_key: str) -> tuple[str, str]:
    """(Devanagari, roman) for a stem, made by lipi. Raises when lipi is missing."""
    import vidyut.lipi as lipi

    from app.services.iast import to_iast

    dev = lipi.transliterate(mw_key, lipi.Scheme.Slp1, lipi.Scheme.Devanagari)
    return dev, to_iast(dev)


def _kosha_stems() -> set[str]:
    import os

    from app.grading.analyzer import get_vidyut_data_dir
    from app.services.word_check import load_kosha_stems

    return load_kosha_stems(os.path.join(get_vidyut_data_dir(), "kosha"))


_IAST_ASCII = str.maketrans({
    "ā": "a", "ī": "i", "ū": "u", "ṛ": "ri", "ṝ": "ri", "ḷ": "l", "ḹ": "l", "ṃ": "m",
    "ḥ": "h", "ṅ": "n", "ñ": "n", "ṭ": "t", "ḍ": "d", "ṇ": "n", "ś": "sh", "ṣ": "sh",
})


def _slug(text: str) -> str:
    t = unicodedata.normalize("NFC", (text or "").lower()).translate(_IAST_ASCII)
    t = "".join(ch for ch in unicodedata.normalize("NFD", t) if not unicodedata.combining(ch))
    return re.sub(r"[^a-z0-9]+", "", t)


def route_id(origin_id: str, lang: str, word: str, roman: str) -> str:
    slug = _slug(word) or _slug(roman)
    if not slug:
        slug = "u" + format(zlib.crc32(word.encode("utf-8")), "08x")
    return f"{origin_id}.{lang}.{slug}"[:64]


def fact_ref_key(text_name: str, ref: str, devanagari: str) -> str:
    """What makes two facts the same passage: the text and its numbers, or,
    for a passage cited without numbers, how it begins."""
    nums = ".".join(re.findall(r"\d+", ref or ""))
    tail = nums or pc.verse_letters(devanagari)[:40]
    return f"{fold(text_name)}:{tail}"[:160]


_CLAIM = (("text says", "text"), ("tradition", "tradition"), ("modern", "modern"))


def claim_kind(value: str) -> str:
    v = (value or "").lower()
    for needle, kind in _CLAIM:
        if needle in v:
            return kind
    return ""


# ─── Requests ───────────────────────────────────────────────────────────────

def word_propose_lines(langs: list[tuple[str, str, bool]], known: dict[str, list[str]],
                       n: int = WORDS_PER_LANG) -> list[dict]:
    lines = []
    for code, name, indo in langs:
        avoid = known.get(code) or []
        user = WORD_USER.format(
            n=n, language=name,
            descent=", or by descent from it within the Indo-Aryan family" if indo else "",
            known=("\n\nDo not use these words: " + ", ".join(avoid[:300])) if avoid else "",
        )
        lines.append(build_request_line(f"w-{code}", WORD_SYSTEM, user))
    listed = ", ".join(name for _c, name, _i in LANGUAGES)
    lines.append(build_request_line("w-open", WORD_SYSTEM, WORD_USER_OPEN.format(n=n, listed=listed)))
    return lines


def word_cite_lines(items: list[dict]) -> list[dict]:
    return [
        build_request_line(
            it["key"], WORD_CITE_SYSTEM,
            WORD_CITE_USER.format(word=it["word"], language=it["lang_name"],
                                  gloss=it["gloss"], sanskrit=it["sanskrit"]),
            max_tokens=4000,
        )
        for it in items
    ]


def word_judge_lines(pending: list[dict]) -> list[dict]:
    return [
        build_request_line(
            p["item"]["key"], JUDGE_SYSTEM,
            JUDGE_USER.format(word=p["item"]["word"], language=p["item"]["lang_name"],
                              sanskrit=p["item"]["sanskrit"], site=p["result"]["host"],
                              excerpt=p.get("excerpt", "")),
            max_tokens=2000,
        )
        for p in pending
    ]


def read_judgement(reply_text: str) -> tuple[str, bool]:
    """(source | relative | not stated | "", hedged) from a judge reply."""
    data = parse_json(reply_text or "")
    if not isinstance(data, dict):
        return "", False
    verdict = str(data.get("verdict") or "").strip().lower()
    if verdict not in ("source", "relative", "not stated"):
        return "", False
    return verdict, data.get("hedged") is True


def fact_propose_lines(groups: list[str], known_refs: list[str], n: int = FACTS_PER_GROUP) -> list[dict]:
    known = ("\n\nDo not use these passages: " + "; ".join(known_refs[:200])) if known_refs else ""
    return [
        build_request_line(f"f-{i}", FACT_SYSTEM, FACT_USER.format(n=n, group=group, known=known))
        for i, group in enumerate(groups)
    ]


def fact_cite_lines(items: list[dict]) -> list[dict]:
    return [
        build_request_line(
            it["key"], FACT_CITE_SYSTEM,
            FACT_CITE_USER.format(text=it["text"], ref=it["ref"], devanagari=it["devanagari"]),
            max_tokens=4000,
        )
        for it in items
    ]


# ─── Reading replies ────────────────────────────────────────────────────────

def parse_pages(reply_text: str) -> list[dict]:
    """Up to three pages from a cite reply: ``[{"url", "as_printed"}]``."""
    data = parse_json(reply_text or "")
    pages = data.get("pages") if isinstance(data, dict) else data
    out = []
    for p in pages if isinstance(pages, list) else []:
        if not isinstance(p, dict):
            continue
        url = str(p.get("url") or "").strip()
        if url:
            out.append({"url": url[:500], "as_printed": clean(p.get("sanskrit_as_printed"), 80)})
    return out[:3]


def read_word_proposals(
    replies: dict[str, str],
    langs: list[tuple[str, str, bool]],
    taken: dict[str, set[str]],
    stems: set[str],
) -> tuple[list[dict], Counter]:
    """Candidates worth a page request, and why the others were dropped.

    ``taken`` maps a language to the words already live or turned down.
    """
    by_code = {code: name for code, name, _indo in langs}
    items: list[dict] = []
    dropped: Counter = Counter()
    seen: set[tuple[str, str]] = set()
    for key in sorted(replies):
        code = key[2:] if key.startswith("w-") else ""
        for d in parse_list(replies[key] or ""):
            if code == "open":
                lang = str(d.get("lang_code") or "").strip().lower()
                lang_name = clean(d.get("language"), 32)
                if not re.fullmatch(r"[a-z]{2,8}", lang) or not lang_name:
                    dropped["no_language"] += 1
                    continue
            elif code in by_code:
                lang, lang_name = code, by_code[code]
            else:
                continue
            word = unicodedata.normalize("NFC", str(d.get("word") or "")).strip()
            if not word or len(word) > 64 or " " in word.strip():
                dropped["bad_word"] += 1
                continue
            folded = word.casefold()
            if (lang, folded) in seen or folded in taken.get(lang, set()):
                dropped["already_known"] += 1
                continue
            seen.add((lang, folded))
            gloss = clean(d.get("gloss"), 160)
            sa_gloss = clean(d.get("sanskrit_gloss"), 200)
            if not gloss or not sa_gloss or _words(gloss) > 12 or _words(sa_gloss) > 12:
                dropped["bad_gloss"] += 1
                continue
            sanskrit = clean(d.get("sanskrit"), 80)
            mw_key = stem_key(sanskrit, stems)
            if not mw_key:
                # Not a ban: the kosha is not complete, and the model may
                # name the stem better another day.
                dropped["stem_not_in_kosha"] += 1
                continue
            route = []
            for hop in d.get("route") if isinstance(d.get("route"), list) else []:
                if isinstance(hop, dict):
                    hop_lang, form = clean(hop.get("lang"), 40), clean(hop.get("form"), 64)
                    if hop_lang and form:
                        route.append({"lang": hop_lang, "form": form})
            items.append({
                "key": f"i{len(items):03d}", "lang": lang, "lang_name": lang_name,
                "word": word, "roman": clean(d.get("roman"), 64), "gloss": gloss,
                "sanskrit": sanskrit, "mw_key": mw_key, "sanskrit_gloss": sa_gloss,
                "route": route[:6],
                "probable": "probab" in str(d.get("confidence") or "").lower(),
            })
    return items, dropped


def read_fact_proposals(
    replies: dict[str, str], taken_refs: set[str], taken_verses: set[str],
) -> tuple[list[dict], Counter]:
    items: list[dict] = []
    dropped: Counter = Counter()
    seen: set[str] = set()
    for key in sorted(replies):
        for d in parse_list(replies[key] or ""):
            text_name = clean(d.get("text"), 120)
            ref = clean(d.get("ref"), 64)
            dev = "".join(
                ch for ch in unicodedata.normalize("NFC", str(d.get("devanagari") or ""))
                if "ऀ" <= ch <= "ॿ" or ch in " \n"
            )
            dev = re.sub(r"[ \t]+", " ", dev).strip()
            letters = pc.verse_letters(dev)
            if not text_name or len(letters) < 24 or len(dev) > 700:
                dropped["bad_passage"] += 1
                continue
            kind = claim_kind(str(d.get("claim_kind") or ""))
            fact = clean(d.get("fact"))
            translation = clean(d.get("translation"))
            explanation = clean(d.get("explanation"))
            if (not kind or not fact or not translation
                    or _words(fact) > 45 or _words(translation) > 90 or _words(explanation) > 110):
                dropped["bad_wording"] += 1
                continue
            ref_key = fact_ref_key(text_name, ref, dev)
            if ref_key in seen or ref_key in taken_refs or letters[:60] in taken_verses:
                dropped["already_known"] += 1
                continue
            seen.add(ref_key)
            taken_verses = taken_verses | {letters[:60]}
            items.append({
                "key": f"i{len(items):03d}", "text": text_name, "ref": ref, "ref_key": ref_key,
                "devanagari": dev, "translation": translation, "fact": fact,
                "explanation": explanation, "claim_kind": kind,
            })
    return items, dropped


# ─── The check ──────────────────────────────────────────────────────────────

def _summarise(notes: list[str]) -> str:
    """One verdict for a candidate no page confirmed.

    A page that opened and said something else outranks a page that could not
    be opened, which outranks having no usable page at all.
    """
    read = [n for n in notes if not n.startswith(("cannot_open", "no_url", "blocked", "untrusted"))]
    if read:
        for want in ("cognate_only", "translation_copies_page"):
            if want in read:
                return want
        return read[0]
    if any(n.startswith("cannot_open") for n in notes):
        return "cannot_open"
    return "no_trusted_page"


def check_word(item: dict, fetcher: pc.PageFetcher) -> dict:
    """Find one trusted page that carries this word and its Sanskrit source."""
    cands = [(u, "") for u in word_urls(item["lang"], item["word"])]
    cands += [(p["url"], p.get("as_printed", "")) for p in item.get("pages", [])]
    notes: list[str] = []
    hosts: list[tuple[str, str]] = []
    tried: set[str] = set()
    for url, as_printed in cands:
        if url in tried:
            continue
        tried.add(url)
        page = fetcher.get(url)
        host = pc.host_of(page.final_url or url)
        if page.note == "out_of_time":
            return {"verdict": "out_of_time"}
        if not page.text:
            note = page.note if page.note in ("no_url", "blocked_site", "untrusted_site") else "cannot_open"
            notes.append(note)
            hosts.append((host, page.note or "empty"))
            continue
        got = pc.check_word_text(page.text, item["word"], item.get("roman", ""), item["sanskrit"], as_printed)
        hosts.append((host, got["verdict"]))
        if got["verdict"] == "confirmed":
            claimed = item.get("route") or []
            found = pc.hops_on_page(page.text, claimed)
            return {
                "verdict": "confirmed", "hedged": got["hedged"], "hosts": hosts,
                "url": page.final_url or url, "host": host,
                # A route's stops are shown only when the page prints them all.
                "hops": found if len(found) == len(claimed) else [],
                "excerpt": pc.excerpt(page.text, got["at"]),
            }
        notes.append(got["verdict"])
    return {"verdict": _summarise(notes), "hosts": hosts}


def check_fact(item: dict, fetcher: pc.PageFetcher) -> dict:
    """Find one trusted page that carries the quoted verse."""
    cands = verse_urls(item["text"], item["ref"]) + [p["url"] for p in item.get("pages", [])]
    notes: list[str] = []
    hosts: list[tuple[str, str]] = []
    tried: set[str] = set()
    for url in cands:
        if url in tried:
            continue
        tried.add(url)
        page = fetcher.get(url)
        host = pc.host_of(page.final_url or url)
        if page.note == "out_of_time":
            return {"verdict": "out_of_time"}
        if not page.text:
            note = page.note if page.note in ("no_url", "blocked_site", "untrusted_site") else "cannot_open"
            notes.append(note)
            hosts.append((host, page.note or "empty"))
            continue
        share = pc.verse_share(item["devanagari"], page.text)
        if share < MIN_VERSE_SHARE:
            notes.append("verse_not_on_page")
            hosts.append((host, "verse_not_on_page"))
            continue
        # Our wording must be ours: a translation lifted from the page is the
        # publisher's, not the app's.
        if any(pc.copies_page(item.get(f, ""), page.text) for f in ("translation", "explanation", "fact")):
            notes.append("translation_copies_page")
            hosts.append((host, "translation_copies_page"))
            continue
        hosts.append((host, "confirmed"))
        return {"verdict": "confirmed", "share": share, "hosts": hosts,
                "url": page.final_url or url, "host": host}
    return {"verdict": _summarise(notes), "hosts": hosts}


#: Verdicts that say something about the candidate itself. The others (a page
#: that would not open, a run out of time) leave it free to be proposed again.
_BANNING = frozenset({
    "cognate_only", "word_not_on_page", "no_sanskrit_on_page", "no_stem_near_sanskrit",
    "no_stem", "no_trusted_page", "verse_not_on_page", "translation_copies_page",
    "origin_withdrawn", "judged_relative", "judged_not_stated",
})

# ─── The database ───────────────────────────────────────────────────────────

def stock_days(db, kind: str, today: str) -> int:
    """How many days after today already have a card."""
    from app.models import FactCard, WordOrigin

    model = WordOrigin if kind == "words" else FactCard
    return (
        db.query(model)
        .filter(model.status == "approved", model.scheduled_date > today)
        .count()
    )


def next_free_date(db, kind: str, today: str) -> str:
    """The first day from today on that no card of this kind holds."""
    from app.models import FactCard, WordOrigin

    model = WordOrigin if kind == "words" else FactCard
    held = {
        d for (d,) in db.query(model.scheduled_date).filter(model.scheduled_date >= today).all() if d
    }
    day = date.fromisoformat(today)
    while day.isoformat() in held:
        day += timedelta(days=1)
    return day.isoformat()


def taken_words(db) -> dict[str, set[str]]:
    """Per language, every word already live or turned down (case folded)."""
    from app.models import ContentRejection, WordRoute

    out: dict[str, set[str]] = {}
    for lang, word in db.query(WordRoute.lang, WordRoute.word).all():
        if lang and word:
            out.setdefault(lang, set()).add(word.casefold())
    rows = db.query(ContentRejection.lang, ContentRejection.key).filter(ContentRejection.kind == "words").all()
    for lang, key in rows:
        if lang and key:
            out.setdefault(lang, set()).add(key)
    # Words turned down by hand before the pipeline existed
    # (app/seeds/word_origins/rejected.json: mango, ginger, ananas, ...).
    try:
        from app.services.word_pipeline import rejected_words_by_lang

        for lang, words in rejected_words_by_lang().items():
            out.setdefault(lang, set()).update(words)
    except Exception:
        logger.warning("daily content: rejected.json could not be read")
    return out


def reject(db, kind: str, lang: str, key: str, reason: str, detail: str = "") -> None:
    """Remember a candidate that failed, once. No page text is stored."""
    from app.models import ContentRejection

    key = (key or "")[:160]
    if not key:
        return
    exists = (
        db.query(ContentRejection.id)
        .filter(ContentRejection.kind == kind, ContentRejection.lang == (lang or ""), ContentRejection.key == key)
        .first()
    )
    if exists is None:
        db.add(ContentRejection(kind=kind, lang=lang or "", key=key, reason=reason[:64], detail=detail[:500]))


def store_word(db, item: dict, result: dict, today: str) -> str:
    """Write a confirmed word. Returns new_origin, new_route, duplicate or
    origin_withdrawn."""
    from app.models import WordOrigin, WordRoute
    from app.services.romanize import romanize_ru

    mw_key = item["mw_key"]
    origin = db.query(WordOrigin).filter(WordOrigin.mw_key == mw_key).first()
    made = "new_route"
    if origin is not None and (origin.status or "") != "approved":
        # Someone took this Sanskrit word down; a new route must not bring it back.
        return "origin_withdrawn"
    if origin is None:
        dev, iast = sanskrit_forms(mw_key)
        base = (_slug(iast) or _slug(mw_key) or "word")[:28]
        oid, n = base, 1
        while db.query(WordOrigin.id).filter(WordOrigin.id == oid).first() is not None:
            n += 1
            oid = f"{base}-{n}"
        origin = WordOrigin(
            id=oid, batch=AUTO_BATCH, rank=0,
            scheduled_date=next_free_date(db, "words", today),
            mw_key=mw_key[:64], sanskrit_dev=dev[:64], sanskrit_iast=iast[:64],
            display_dev="", display_iast="", gloss=item["sanskrit_gloss"][:200],
            attested="", note="", status="approved",
        )
        db.add(origin)
        db.flush()
        made = "new_origin"
    lang, word = item["lang"][:8], item["word"][:64]
    clash = (
        db.query(WordRoute.id)
        .filter(WordRoute.origin_id == origin.id, WordRoute.lang == lang, WordRoute.word == word)
        .first()
    )
    rid = route_id(origin.id, lang, word, item.get("roman", ""))
    if clash is not None or db.query(WordRoute.id).filter(WordRoute.id == rid).first() is not None:
        return "duplicate"
    script = script_of(word)
    if script == "latin":
        roman = ""
    elif lang == "ru":
        roman = romanize_ru(word)
    else:
        roman = item.get("roman", "")
    rank = db.query(WordRoute).filter(WordRoute.origin_id == origin.id).count()
    db.add(WordRoute(
        id=rid, origin_id=origin.id, rank=rank, lang=lang, lang_name=item["lang_name"][:32],
        word=word, script=script[:16], roman=roman[:64], gloss=item["gloss"][:160],
        kind="loan",
        confidence="probable" if (result.get("hedged") or item.get("probable")) else "certain",
        hops=list(result.get("hops") or []), source_keys=[], lookup=word[:120],
        checked_on=today, source_url=result["url"][:500],
        source_site=pc.site_name(result["host"])[:120], checked_by=PAGE_CHECKED,
        status="approved",
    ))
    db.flush()
    return made


def store_fact(db, item: dict, result: dict, today: str) -> str:
    from app.models import FactCard
    from app.services.iast import to_iast

    if db.query(FactCard.id).filter(FactCard.ref_key == item["ref_key"]).first() is not None:
        return "duplicate"
    db.add(FactCard(
        scheduled_date=next_free_date(db, "facts", today),
        fact=item["fact"], claim_kind=item["claim_kind"], text_name=item["text"][:120],
        ref=item["ref"][:64], ref_key=item["ref_key"], devanagari=item["devanagari"],
        iast=to_iast(item["devanagari"]), translation=item["translation"],
        explanation=item.get("explanation", ""), source_url=result["url"][:500],
        source_site=pc.site_name(result["host"])[:120], verse_match=float(result.get("share") or 0.0),
        checked_on=today, made_by=AUTO_BATCH, status="approved",
    ))
    db.flush()
    return "new_fact"


# ─── Money ──────────────────────────────────────────────────────────────────

def _batch_inr(prompt_tokens: float, output_tokens: float) -> float:
    """Rupees for batch work: half the list price (Google's batch page)."""
    from app.services.quota import gemini_cost_inr

    return gemini_cost_inr(prompt_tokens, output_tokens) / 2


def spent_inr(db, hours: int = 24) -> float:
    """What the pipeline's batch jobs cost in the last ``hours``, by the
    token counts Vertex returned with each finished job."""
    from app.models import ContentJob

    since = datetime.now(timezone.utc) - timedelta(hours=hours)
    total = 0.0
    for (stats, when) in db.query(ContentJob.stats, ContentJob.created_at).all():
        if when is None or (when if when.tzinfo else when.replace(tzinfo=timezone.utc)) < since:
            continue
        for step in ("propose", "cite", "judge"):
            t = (stats or {}).get(f"{step}_tokens") or {}
            total += _batch_inr(
                t.get("prompt_tokens", 0), t.get("candidates_tokens", 0) + t.get("thoughts_tokens", 0)
            )
    return total


def affordable(db, step: str, requests: int) -> bool:
    """True when a batch job of this size fits under both ceilings: the
    pipeline's own, and what is left of the service-wide Gemini budget (which
    does not see batch spend, so the pipeline's own spend is added to it)."""
    from app.services.quota import gemini_headroom_inr

    prompt, output = _EXPECTED_TOKENS[step]
    estimate = _batch_inr(prompt * requests, output * requests)
    spent = spent_inr(db)
    own = settings.content_daily_budget_inr
    if own > 0 and spent + estimate > own:
        return False
    return spent + estimate <= gemini_headroom_inr(db)


# ─── Vertex and the page fetcher, from settings ─────────────────────────────

def vertex_from_settings():
    """The Vertex client, or None when no service-account key is configured."""
    from app.services.vertex_batch import VertexBatchClient

    info = None
    path = ""
    if settings.vertex_credentials_json.strip():
        try:
            info = json.loads(settings.vertex_credentials_json)
        except ValueError:
            logger.warning("VERTEX_CREDENTIALS_JSON is not valid JSON")
            return None
    else:
        if not settings.vertex_credentials_path.strip():
            return None
        p = Path(settings.vertex_credentials_path)
        if not p.is_absolute():
            p = (Path(__file__).resolve().parents[2] / p).resolve()
        if not p.is_file():
            return None
        path = str(p)
    return VertexBatchClient(
        credentials_path=path, credentials_info=info,
        project=(info or {}).get("project_id") or settings.vertex_project,
        bucket=settings.vertex_batch_bucket, prefix=settings.vertex_batch_prefix,
        location=settings.vertex_location, model=settings.word_origins_model,
    )


def _extra_trusted() -> list[str]:
    return [h for h in (settings.content_extra_trusted_hosts or "").split(",") if h.strip()]


# ─── The run ────────────────────────────────────────────────────────────────

def _set(job, **fields) -> None:
    for name, value in fields.items():
        setattr(job, name, value)
    job.updated_at = datetime.now(timezone.utc)


def _finish(db, job, stage: str, error: str = "") -> None:
    _set(job, stage=stage, active_key=None, error=error[:2000], locked_until=0)
    db.commit()


def _lock(db, job) -> bool:
    from app.models import ContentJob

    now = int(time.time())
    got = (
        db.query(ContentJob)
        .filter(ContentJob.id == job.id, (ContentJob.locked_until.is_(None)) | (ContentJob.locked_until < now))
        .update({"locked_until": now + LOCK_S}, synchronize_session=False)
    )
    db.commit()
    db.refresh(job)
    return got == 1


def _submit(vertex, run_id: str, step: str, lines: list[dict]) -> str:
    obj = gcs_object_name(vertex.prefix, run_id, step, "input.jsonl")
    vertex.upload_input(obj, to_jsonl(lines))
    return str(vertex.create_job(run_id, step, obj).get("name") or "")


def _replies(vertex, job) -> Optional[dict]:
    """The finished batch job's replies by key; None while it still runs.
    Raises when the job ended badly."""
    vjob = vertex.get_job(job.job_name)
    state = str(vjob.get("state") or "")
    if not is_terminal_state(state):
        if _age_s(job.created_at) > MAX_WAIT_S:
            raise RunFailed(f"batch job still {state or 'unknown'} after {MAX_WAIT_S // 3600} hours")
        return None
    if state not in _OK_STATES:
        raise RunFailed(f"batch job ended {state}")
    parsed = vertex.collect_predictions(vjob)
    totals = sum_tokens(parsed)
    stats = dict(job.stats or {})
    stats[f"{job.stage}_tokens"] = totals
    job.stats = stats
    return {k: v.get("text", "") for k, v in parsed.items() if v.get("status") == "ok"}


def _start(db, kind: str, vertex, today: str, stock: int) -> dict:
    from app.models import ContentJob, ContentRejection, FactCard

    turn = db.query(ContentJob).filter(ContentJob.kind == kind).count()
    if kind == "words":
        if not _kosha_stems():
            return {"state": "no_kosha", "stock": stock}
        start = (turn * LANGS_PER_RUN) % len(LANGUAGES)
        langs = [LANGUAGES[(start + i) % len(LANGUAGES)] for i in range(LANGS_PER_RUN)]
        taken = taken_words(db)
        lines = word_propose_lines(langs, {c: sorted(taken.get(c, set())) for c, _n, _i in langs})
        payload = {"langs": [list(lang) for lang in langs]}
    else:
        start = (turn * GROUPS_PER_RUN) % len(FACT_GROUPS)
        groups = [FACT_GROUPS[(start + i) % len(FACT_GROUPS)] for i in range(GROUPS_PER_RUN)]
        refs = [f"{t} {r}".strip() for t, r in db.query(FactCard.text_name, FactCard.ref).all()]
        refs += [k for (k,) in db.query(ContentRejection.detail).filter(ContentRejection.kind == "facts").all() if k]
        lines = fact_propose_lines(groups, refs)
        payload = {"groups": groups}

    if not affordable(db, "propose", len(lines)):
        return {"state": "over_budget", "stock": stock}
    # The stamp says when; the tail keeps two runs in one second apart.
    run_id = f"{kind}-{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')}-{uuid.uuid4().hex[:4]}"
    job = ContentJob(id=run_id, kind=kind, active_key=kind, stage="propose", payload=payload, stats={})
    db.add(job)
    try:
        db.commit()
    except IntegrityError:
        # Another tick started this kind a moment ago.
        db.rollback()
        return {"state": "busy"}
    try:
        _set(job, job_name=_submit(vertex, run_id, "propose", lines))
        db.commit()
    except Exception as e:
        logger.exception("daily content: could not start %s", run_id)
        _finish(db, job, "failed", f"{type(e).__name__}: {e}")
        return {"state": "failed", "run": run_id}
    return {"state": "submitted", "run": run_id, "requests": len(lines), "stock": stock}


def _after_propose(db, job, vertex) -> Optional[dict]:
    from app.models import ContentRejection, FactCard

    replies = _replies(vertex, job)
    if replies is None:
        return {"state": "running", "run": job.id, "stage": "propose"}
    if job.kind == "words":
        langs = [tuple(lang) for lang in (job.payload or {}).get("langs", [])]
        items, dropped = read_word_proposals(replies, langs, taken_words(db), _kosha_stems())
        lines = word_cite_lines(items)
    else:
        taken_refs = {k for (k,) in db.query(FactCard.ref_key).all() if k}
        taken_refs |= {
            k for (k,) in db.query(ContentRejection.key).filter(ContentRejection.kind == "facts").all()
        }
        verses = {pc.verse_letters(d or "")[:60] for (d,) in db.query(FactCard.devanagari).all()}
        items, dropped = read_fact_proposals(replies, taken_refs, verses)
        lines = fact_cite_lines(items)
    stats = dict(job.stats or {})
    stats.update({"proposed": len(items) + sum(dropped.values()), "dropped": dict(dropped), "candidates": len(items)})
    if not items:
        _set(job, stats=stats)
        _finish(db, job, "done")
        return {"state": "done", "run": job.id, "confirmed": 0}
    _set(job, stats=stats)
    db.commit()
    if not affordable(db, "cite", len(lines)):
        # The run waits at this step and is tried again on a later tick; the
        # proposals stay in the bucket and are read again then.
        return {"state": "over_budget", "run": job.id, "stage": "propose"}
    name = _submit(vertex, job.id, "cite", lines)
    _set(job, stage="cite", job_name=name, payload={"items": items})
    db.commit()
    return None


def _after_cite(db, job, vertex) -> Optional[dict]:
    replies = _replies(vertex, job)
    if replies is None:
        return {"state": "running", "run": job.id, "stage": "cite"}
    items = []
    for it in (job.payload or {}).get("items", []):
        items.append({**it, "pages": parse_pages(replies.get(it["key"], ""))})
    _set(job, stage="check", payload={"items": items, "cursor": 0})
    db.commit()
    return None


def _check(db, job, vertex, fetcher: pc.PageFetcher, today: str) -> Optional[dict]:
    payload = dict(job.payload or {})
    items = payload.get("items", [])
    cursor = int(payload.get("cursor", 0))
    # Words the page check passed, waiting for the judge.
    pending = list(payload.get("pending", []))
    stats = dict(job.stats or {})
    verdicts = Counter(stats.get("verdicts", {}))
    sites = Counter(stats.get("sites", {}))
    stored = Counter(stats.get("stored", {}))
    words = job.kind == "words"
    while cursor < len(items) and not fetcher.out_of_time():
        item = items[cursor]
        result = check_word(item, fetcher) if words else check_fact(item, fetcher)
        verdict = result["verdict"]
        if verdict == "out_of_time":
            break
        if verdict == "confirmed" and words:
            pending.append({
                "item": {k: v for k, v in item.items() if k != "pages"},
                "result": {k: result[k] for k in ("url", "host", "hedged", "hops")},
                "excerpt": result.get("excerpt", ""),
            })
            verdict = "page_ok"
        elif verdict == "confirmed":
            try:
                outcome = store_fact(db, item, result, today)
            except Exception:
                # One candidate that cannot be written must not sink the run.
                db.rollback()
                logger.exception("daily content: could not store fact %s", item.get("key"))
                outcome, verdict = "", "store_error"
            if outcome:
                stored[outcome] += 1
        verdicts[verdict] += 1
        for host, note in result.get("hosts", []):
            if host:
                sites[f"{host} {note}"] += 1
        if verdict in _BANNING:
            if words:
                reject(db, "words", item["lang"], item["word"].casefold(), verdict)
            else:
                reject(db, "facts", "", item["ref_key"], verdict, f"{item['text']} {item['ref']}".strip())
        cursor += 1
        stats.update({"verdicts": dict(verdicts), "sites": dict(sites), "stored": dict(stored)})
        _set(job, payload={"items": items, "cursor": cursor, "pending": pending}, stats=stats)
        db.commit()
    if cursor < len(items):
        return {"state": "checking", "run": job.id, "checked": cursor, "of": len(items)}
    if not pending:
        _set(job, payload={})
        _finish(db, job, "done")
        return {"state": "done", "run": job.id, "confirmed": verdicts.get("confirmed", 0), "of": len(items)}
    if vertex is None:
        return {"state": "not_configured", "run": job.id}
    lines = word_judge_lines(pending)
    if not affordable(db, "judge", len(lines)):
        return {"state": "over_budget", "run": job.id, "stage": "check"}
    name = _submit(vertex, job.id, "judge", lines)
    _set(job, stage="judge", job_name=name, payload={"pending": pending})
    db.commit()
    return None


def _after_judge(db, job, vertex, today: str) -> dict:
    """Store the words whose passage gives the Sanskrit word as the source."""
    replies = _replies(vertex, job)
    if replies is None:
        return {"state": "running", "run": job.id, "stage": "judge"}
    stats = dict(job.stats or {})
    verdicts = Counter(stats.get("verdicts", {}))
    stored = Counter(stats.get("stored", {}))
    for entry in (job.payload or {}).get("pending", []):
        item, result = entry["item"], dict(entry["result"])
        judged, hedged = read_judgement(replies.get(item["key"], ""))
        if judged == "source":
            result["hedged"] = bool(result.get("hedged") or hedged)
            try:
                outcome = store_word(db, item, result, today)
                final = outcome if outcome == "origin_withdrawn" else "confirmed"
                stored[outcome] += 1
            except Exception:
                # One candidate that cannot be written must not sink the run.
                db.rollback()
                logger.exception("daily content: could not store word %s", item.get("key"))
                final = "store_error"
        else:
            final = {"relative": "judged_relative", "not stated": "judged_not_stated"}.get(judged, "judge_no_answer")
        verdicts[final] += 1
        if final in _BANNING:
            reject(db, "words", item["lang"], item["word"].casefold(), final)
        db.commit()
    stats.update({"verdicts": dict(verdicts), "stored": dict(stored)})
    # The passages were held only for the judge: nothing a page says is kept.
    _set(job, payload={}, stats=stats)
    _finish(db, job, "done")
    return {"state": "done", "run": job.id, "confirmed": verdicts.get("confirmed", 0),
            "of": int(stats.get("candidates", 0))}


def _advance(db, kind: str, vertex, fetcher: pc.PageFetcher, today: str) -> dict:
    from app.models import ContentJob

    job = db.query(ContentJob).filter(ContentJob.active_key == kind).first()
    if job is None:
        stock = stock_days(db, kind, today)
        target = settings.content_words_stock_days if kind == "words" else settings.content_facts_stock_days
        if stock >= target:
            return {"state": "stocked", "stock": stock}
        if vertex is None:
            return {"state": "not_configured", "stock": stock}
        last = (
            db.query(ContentJob).filter(ContentJob.kind == kind).order_by(ContentJob.created_at.desc()).first()
        )
        if last is not None and last.stage == "failed" and _age_s(last.updated_at) < RETRY_AFTER_S:
            return {"state": "waiting_after_failure", "run": last.id, "stock": stock}
        if last is not None and last.stage == "done":
            made = (last.stats or {}).get("stored", {})
            gap = MIN_GAP_S if (made.get("new_origin") or made.get("new_fact")) else EMPTY_GAP_S
            if _age_s(last.updated_at) < gap:
                return {"state": "resting", "run": last.id, "stock": stock}
        return _start(db, kind, vertex, today, stock)

    job_id = job.id
    if not _lock(db, job):
        return {"state": "busy", "run": job_id}
    try:
        if job.stage in ("propose", "cite", "judge") and vertex is None:
            return {"state": "not_configured", "run": job_id}
        # Each step returns None when it finished and the next may begin in
        # this same tick, or what to report when the run must wait.
        out = None
        if job.stage == "propose":
            out = _after_propose(db, job, vertex)
        if out is None and job.stage == "cite":
            out = _after_cite(db, job, vertex)
        if out is None and job.stage == "check":
            out = _check(db, job, vertex, fetcher, today)
        if out is None and job.stage == "judge":
            out = _after_judge(db, job, vertex, today)
        if out is None:
            out = {"state": job.stage, "run": job_id}
        if (job.stats or {}).get("errors"):
            _set(job, stats={**job.stats, "errors": 0})
            db.commit()
        return out
    except Exception as e:
        db.rollback()
        logger.exception("daily content: run %s could not take its step", job_id)
        job = db.query(ContentJob).filter(ContentJob.id == job_id).first()
        if job is None:
            return {"state": "failed", "run": job_id}
        errors = int((job.stats or {}).get("errors", 0)) + 1
        if isinstance(e, RunFailed) or errors >= MAX_ERRORS:
            _finish(db, job, "failed", f"{type(e).__name__}: {e}")
            return {"state": "failed", "run": job_id}
        # Likely to pass (the network, a 5xx from Vertex): the run stays where
        # it is and the next tick tries the same step again.
        _set(job, stats={**(job.stats or {}), "errors": errors}, error=f"{type(e).__name__}: {e}"[:2000])
        db.commit()
        return {"state": "error", "run": job_id, "errors": errors}
    finally:
        try:
            live = db.query(ContentJob).filter(ContentJob.id == job_id).first()
            if live is not None and live.locked_until:
                live.locked_until = 0
                db.commit()
        except Exception:
            db.rollback()


def tick(
    db,
    vertex=None,
    fetcher: Optional[pc.PageFetcher] = None,
    today: Optional[str] = None,
    budget_s: float = 75.0,
    clock: Callable[[], float] = time.monotonic,
) -> dict:
    """Move both kinds of daily content one step. Safe to call at any time
    and as often as wanted; it stops fetching pages after ``budget_s``."""
    today = today or _utc_today()
    own_fetcher = fetcher is None
    if vertex is None:
        vertex = vertex_from_settings()
    if fetcher is None:
        fetcher = pc.PageFetcher(
            contact=settings.legal_contact_email, extra_trusted=_extra_trusted(),
            deadline=clock() + budget_s, clock=clock,
        )
    out: dict = {"date": today}
    try:
        for kind in KINDS:
            try:
                out[kind] = _advance(db, kind, vertex, fetcher, today)
            except Exception as e:
                db.rollback()
                logger.exception("daily content: %s tick failed", kind)
                out[kind] = {"state": "error", "error": type(e).__name__}
    finally:
        if own_fetcher:
            fetcher.close()
    return out


# ─── Reading: the fact of the day ───────────────────────────────────────────

def _fact_of(rows: list, day: str):
    """The one fact a day shows out of these rows (see fact_for_day)."""
    if not rows:
        return None
    reviewed = [row for row in rows if getattr(row, "made_by", "") == "reviewed"]
    if reviewed:
        # The reviewed launch collection replaces generic legacy verses.
        # A later generated collection must pass an editorial release first.
        offset = (date.fromisoformat(day) - date(2026, 9, 1)).days
        return reviewed[offset % len(reviewed)]
    if rows[-1].scheduled_date == day:
        return rows[-1]
    try:
        offset = (date.fromisoformat(day) - date.fromisoformat(rows[0].scheduled_date)).days
    except ValueError:
        return rows[-1]
    return rows[offset % len(rows)]


def fact_for_day(db, day: str):
    """The fact for a learner's local day: the one dated that day, else the
    earlier ones in turn, so a day is never blank once any fact exists."""
    from app.models import FactCard

    rows = (
        db.query(FactCard)
        .filter(FactCard.status == "approved", FactCard.scheduled_date <= day)
        .order_by(FactCard.scheduled_date)
        .all()
    )
    return _fact_of(rows, day)


def recent_facts(db, day: str, limit: int = 6) -> list:
    """The facts the most recent days have shown, newest day first, each card
    once. History follows the same turn-taking as fact_for_day: ordering by
    ``scheduled_date`` would list cards a day has not reached yet (or hide the
    one today shows)."""
    from app.models import FactCard

    rows = (
        db.query(FactCard)
        .filter(FactCard.status == "approved", FactCard.scheduled_date <= day)
        .order_by(FactCard.scheduled_date)
        .all()
    )
    if not rows:
        return []
    out: list = []
    seen: set[str] = set()
    end = date.fromisoformat(day)
    # One full turn of the rotation covers every card, and the extra days
    # absorb the days whose own dated card takes the slot.
    for back in range(len(rows) + limit):
        earlier = (end - timedelta(days=back)).isoformat()
        row = _fact_of([r for r in rows if (r.scheduled_date or "9999") <= earlier], earlier)
        if row is None or row.id in seen:
            continue
        seen.add(row.id)
        out.append(row)
        if len(out) >= limit:
            break
    return out


# ─── The owner's view ───────────────────────────────────────────────────────

def status(db, today: Optional[str] = None) -> dict:
    from app.models import ContentJob, ContentRejection, FactCard, WordOrigin, WordRoute

    today = today or _utc_today()
    runs = db.query(ContentJob).order_by(ContentJob.created_at.desc()).limit(10).all()
    return {
        "date": today,
        "configured": vertex_from_settings() is not None,
        "words": {
            "stock_days": stock_days(db, "words", today),
            "target_days": settings.content_words_stock_days,
            "origins": db.query(WordOrigin).filter(WordOrigin.status == "approved").count(),
            "page_checked_routes": db.query(WordRoute).filter(WordRoute.checked_by == PAGE_CHECKED).count(),
            "turned_down": db.query(ContentRejection).filter(ContentRejection.kind == "words").count(),
        },
        "facts": {
            "stock_days": stock_days(db, "facts", today),
            "target_days": settings.content_facts_stock_days,
            "cards": db.query(FactCard).filter(FactCard.status == "approved").count(),
            "turned_down": db.query(ContentRejection).filter(ContentRejection.kind == "facts").count(),
        },
        "runs": [
            {"run": r.id, "kind": r.kind, "stage": r.stage, "in_flight": r.active_key is not None,
             "error": r.error or "", "stats": r.stats or {}}
            for r in runs
        ],
    }


def withdraw(db, kind: str, item_id: str) -> bool:
    """Take one card down at once. The row is kept, never deleted, and its
    day is freed. ``kind`` is fact, word (a whole Sanskrit word) or route."""
    from app.models import FactCard, WordOrigin, WordRoute

    model = {"fact": FactCard, "word": WordOrigin, "route": WordRoute}.get(kind)
    if model is None:
        return False
    row = db.query(model).filter(model.id == item_id).first()
    if row is None:
        return False
    row.status = "withdrawn"
    if kind != "route":
        row.scheduled_date = None
    if kind == "fact":
        reject(db, "facts", "", row.ref_key or "", "withdrawn", f"{row.text_name} {row.ref}".strip())
    elif kind == "route":
        reject(db, "words", row.lang or "", (row.word or "").casefold(), "withdrawn")
    else:
        for r in db.query(WordRoute).filter(WordRoute.origin_id == row.id).all():
            reject(db, "words", r.lang or "", (r.word or "").casefold(), "withdrawn")
    db.commit()
    return True
