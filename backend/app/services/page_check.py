"""The evidence check behind daily content.

A card the daily pipeline writes (services/daily_content.py) links to one web
page as its source. This module decides, by code and with no model, whether a
page may be that source:

* the page must be on a trusted site: a dictionary, a language academy, a
  university, a scholarly publisher or a library of Sanskrit texts. Wikipedia,
  Wiktionary, blogs, forums and question sites never count;
* the page must open, and its robots.txt must allow it;
* for a word, the page must print the word, and print the Sanskrit stem next
  to a word that means "Sanskrit", not merely as a relative ("akin to");
* for a fact, the page must carry the quoted verse.

Nothing a page says is stored: only its address, its site and the verdict.

No network in tests: :class:`PageFetcher` takes a ``download`` function.
What has been run: the unit tests in tests/test_page_check.py, on made-up
pages. The checks have not been run against the live sites.
"""

from __future__ import annotations

import difflib
import html
import logging
import re
import time
import unicodedata
from dataclasses import dataclass
from typing import Callable, Iterable, Optional
from urllib import robotparser
from urllib.parse import urlsplit

from app.services.word_check import fold

logger = logging.getLogger("shabd.page_check")

BOT_NAME = "SanskritamBot"

# ─── Which sites count ──────────────────────────────────────────────────────

#: Never evidence, whatever else is true of the page.
BLOCKED_HOSTS = (
    "wikipedia.org", "wiktionary.org", "wikimedia.org", "wikisource.org",
    "wikiquote.org", "wikidata.org", "quora.com", "reddit.com", "blogspot.",
    "wordpress.", "medium.com", "substack.com", "facebook.com", "youtube.com",
    "pinterest.", "twitter.com", "x.com", "instagram.com", "tiktok.com",
    "stackexchange.com", "stackoverflow.com", "answers.com", "brainly.",
    "scribd.com", "tumblr.com", "hinative.com", "fandom.com", "tripod.com",
    "weebly.com", "wixsite.com", "linkedin.com",
)

#: Sites trusted as evidence: dictionaries of record, language academies,
#: scholarly publishers and libraries of Sanskrit texts. A host matches an
#: entry when it is that name or a subdomain of it. This list is a judgement,
#: not a measurement; CONTENT_EXTRA_TRUSTED_HOSTS adds to it without a deploy
#: of code. Universities and government bodies are matched by rule below.
TRUSTED_HOSTS = frozenset({
    # English
    "ahdictionary.com", "merriam-webster.com", "oed.com", "collinsdictionary.com",
    # German
    "dwds.de", "duden.de",
    # French
    "cnrtl.fr", "dictionnaire-academie.fr", "larousse.fr", "lerobert.com",
    # Spanish, Catalan, Galician
    "rae.es", "iec.cat", "diccionari.cat", "academia.gal",
    # Italian
    "treccani.it",
    # Portuguese
    "priberam.org", "infopedia.pt", "michaelis.uol.com.br", "aulete.com.br",
    # Dutch
    "etymologiebank.nl", "ivdnt.org", "vandale.nl",
    # Nordic
    "svenska.se", "saob.se", "naob.no", "ordbokene.no", "ordnet.dk", "kotus.fi",
    # Slavic and neighbours
    "gufo.me", "gramota.ru", "pwn.pl", "wsjp.pl", "cas.cz", "dexonline.ro",
    # Greek, Hebrew
    "greek-language.gr", "hebrew-academy.org.il",
    # Turkish, Persian, Arabic
    "nisanyansozluk.com", "vajehyab.com", "dohadictionary.org", "iranicaonline.org",
    # South and South-East Asia
    "sealang.net", "tamilvu.org",
    # East Asia
    "kotobank.jp", "zdic.net",
    # Scholarly publishers and reference works
    "brill.com", "brillonline.com", "degruyter.com", "cambridge.org",
    "oxfordreference.com", "jstor.org", "starlingdb.org",
    # German universities that host Sanskrit lexica and texts
    "uni-koeln.de", "uni-goettingen.de", "uni-frankfurt.de", "uni-heidelberg.de",
    "uni-hamburg.de",
    # Libraries of Sanskrit texts
    "sanskritdocuments.org", "vedabase.io", "valmikiramayan.net",
    "sacred-texts.com", "ambuda.org",
})

#: A university or a government body, by the shape of its name.
_INSTITUTION = re.compile(
    r"(?:^|\.)(?:edu|gov)$"
    r"|(?:^|\.)(?:edu|ac|gov|gob|go|gouv|nic)\.[a-z]{2}$"
)

#: How a site is named on a card. A host not listed is shown by its name.
SITE_NAMES = {
    "ahdictionary.com": "American Heritage Dictionary",
    "merriam-webster.com": "Merriam-Webster",
    "oed.com": "Oxford English Dictionary",
    "dwds.de": "Digitales Wörterbuch der deutschen Sprache",
    "duden.de": "Duden",
    "cnrtl.fr": "Trésor de la langue française (CNRTL)",
    "dictionnaire-academie.fr": "Dictionnaire de l'Académie française",
    "dle.rae.es": "Diccionario de la lengua española (RAE)",
    "treccani.it": "Treccani",
    "dicionario.priberam.org": "Dicionário Priberam",
    "infopedia.pt": "Infopédia",
    "etymologiebank.nl": "Etymologiebank",
    "gufo.me": "Vasmer's dictionary, at gufo.me",
    "nisanyansozluk.com": "Nişanyan Sözlük",
    "vajehyab.com": "Vajehyab",
    "kbbi.kemdikbud.go.id": "Kamus Besar Bahasa Indonesia",
    "prpm.dbp.gov.my": "Pusat Rujukan Persuratan Melayu",
    "kotobank.jp": "Kotobank",
    "dsal.uchicago.edu": "Digital Dictionaries of South Asia",
    "sanskrit-lexicon.uni-koeln.de": "Cologne Digital Sanskrit Dictionaries",
    "gretil.sub.uni-goettingen.de": "GRETIL, Göttingen",
    "sanskritdocuments.org": "Sanskrit Documents",
    "vedabase.io": "Vedabase",
    "valmikiramayan.net": "Valmiki Ramayana",
    "titus.uni-frankfurt.de": "TITUS, Frankfurt",
    "iranicaonline.org": "Encyclopaedia Iranica",
}


def host_of(url: str) -> str:
    """The host of an address, lower case, without a leading ``www.``."""
    try:
        host = (urlsplit((url or "").strip()).hostname or "").lower()
    except ValueError:
        return ""
    return host[4:] if host.startswith("www.") else host


def is_blocked(host: str) -> bool:
    h = (host or "").lower()
    for bad in BLOCKED_HOSTS:
        if bad.endswith("."):
            # "blogspot." matches blogspot.com and blogspot.in alike.
            if h.startswith(bad) or ("." + bad) in h:
                return True
        elif h == bad or h.endswith("." + bad):
            return True
    return False


def is_trusted(host: str, extra: Iterable[str] = ()) -> bool:
    """True when a page on this host may be cited. Blocked always loses."""
    h = (host or "").lower()
    if not h or is_blocked(h):
        return False
    names = set(TRUSTED_HOSTS) | {e.strip().lower() for e in extra if e and e.strip()}
    if any(h == name or h.endswith("." + name) for name in names):
        return True
    return bool(_INSTITUTION.search(h))


def site_name(host: str) -> str:
    h = (host or "").lower()
    if h in SITE_NAMES:
        return SITE_NAMES[h]
    for name, label in SITE_NAMES.items():
        if h.endswith("." + name):
            return label
    return h


def usable_url(url: str, extra: Iterable[str] = ()) -> str:
    """Why an address cannot be used, or "" when it can."""
    u = (url or "").strip()
    if not u.lower().startswith(("http://", "https://")) or len(u) > 500:
        return "no_url"
    host = host_of(u)
    if not host:
        return "no_url"
    if is_blocked(host):
        return "blocked_site"
    if not is_trusted(host, extra):
        return "untrusted_site"
    return ""


# ─── Opening a page ─────────────────────────────────────────────────────────

@dataclass
class Page:
    url: str
    final_url: str = ""
    code: int = 0  # 0 when the request itself failed
    text: str = ""  # the visible text, NFC
    note: str = ""  # why there is no text


def page_text(raw: str) -> str:
    """The text a reader sees: scripts, styles and tags removed, NFC."""
    raw = re.sub(r"(?is)<(script|style|noscript)\b.*?</\1>", " ", raw or "")
    text = html.unescape(re.sub(r"<[^>]+>", " ", raw))
    return unicodedata.normalize("NFC", re.sub(r"\s+", " ", text)).strip()


_META_CHARSET = re.compile(rb"charset\s*=\s*[\"']?([A-Za-z0-9_\-]+)", re.I)


def _decode(body: bytes, content_type: str) -> str:
    m = re.search(r"charset=([A-Za-z0-9_\-]+)", content_type or "", re.I)
    name = m.group(1) if m else ""
    if not name:
        m2 = _META_CHARSET.search(body[:4096])
        name = m2.group(1).decode("ascii", "ignore") if m2 else "utf-8"
    try:
        return body.decode(name, errors="replace")
    except LookupError:
        return body.decode("utf-8", errors="replace")


#: download(url) -> (status, content type, body bytes, final address)
Download = Callable[[str], tuple[int, str, bytes, str]]


class PageFetcher:
    """Opens pages politely: one named client, robots.txt obeyed, one request
    a host every ``spacing_s`` seconds, a size limit, and a deadline after
    which nothing more is fetched."""

    def __init__(
        self,
        contact: str = "",
        download: Optional[Download] = None,
        extra_trusted: Iterable[str] = (),
        spacing_s: float = 1.2,
        timeout_s: float = 12.0,
        max_bytes: int = 8_000_000,
        deadline: Optional[float] = None,
        clock: Callable[[], float] = time.monotonic,
        sleep: Callable[[float], None] = time.sleep,
    ) -> None:
        about = f"citation check; {contact}" if contact else "citation check"
        self.user_agent = f"{BOT_NAME}/1.0 ({about})"
        self.extra_trusted = tuple(extra_trusted)
        self.spacing_s = spacing_s
        self.timeout_s = timeout_s
        self.max_bytes = max_bytes
        self.deadline = deadline
        self._clock = clock
        self._sleep = sleep
        self._download = download or self._http_download
        self._client = None
        self._last_hit: dict[str, float] = {}
        self._robots: dict[str, Optional[robotparser.RobotFileParser]] = {}
        self._pages: dict[str, Page] = {}

    # -- transport ---------------------------------------------------------

    def _http_download(self, url: str) -> tuple[int, str, bytes, str]:
        import httpx  # lazy: tests pass their own download

        if self._client is None:
            self._client = httpx.Client(
                headers={"User-Agent": self.user_agent, "Accept-Language": "en;q=0.9,*;q=0.5"},
                timeout=httpx.Timeout(self.timeout_s, connect=8.0),
                follow_redirects=True,
            )
        with self._client.stream("GET", url) as r:
            chunks: list[bytes] = []
            size = 0
            for chunk in r.iter_bytes():
                chunks.append(chunk)
                size += len(chunk)
                if size > self.max_bytes:
                    break
            return r.status_code, r.headers.get("content-type", ""), b"".join(chunks), str(r.url)

    def close(self) -> None:
        if self._client is not None:
            try:
                self._client.close()
            except Exception:
                pass
            self._client = None

    def out_of_time(self) -> bool:
        return self.deadline is not None and self._clock() >= self.deadline

    def _wait_turn(self, host: str) -> None:
        last = self._last_hit.get(host)
        if last is not None:
            wait = self.spacing_s - (self._clock() - last)
            if wait > 0:
                self._sleep(wait)
        self._last_hit[host] = self._clock()

    # -- robots.txt --------------------------------------------------------

    def _allowed(self, url: str) -> bool:
        parts = urlsplit(url)
        host = (parts.hostname or "").lower()
        if host not in self._robots:
            rules: Optional[robotparser.RobotFileParser] = None
            self._wait_turn(host)
            try:
                code, ctype, body, _final = self._download(f"{parts.scheme}://{parts.netloc}/robots.txt")
            except Exception:
                code, ctype, body = 0, "", b""
            if code == 200:
                rules = robotparser.RobotFileParser()
                rules.parse(_decode(body, ctype).splitlines())
            elif 400 <= code < 500:
                # No robots.txt: nothing is disallowed.
                rules = robotparser.RobotFileParser()
                rules.parse([])
            # Any other answer leaves rules None: the site could not say, so
            # nothing on it is fetched in this run.
            self._robots[host] = rules
        rules = self._robots[host]
        if rules is None:
            return False
        return rules.can_fetch(BOT_NAME, url)

    # -- one page ----------------------------------------------------------

    def get(self, url: str) -> Page:
        url = (url or "").strip()
        if url in self._pages:
            return self._pages[url]
        why = usable_url(url, self.extra_trusted)
        if why:
            return Page(url=url, note=why)
        if self.out_of_time():
            # Not remembered: the next run may have time for it.
            return Page(url=url, note="out_of_time")
        page = self._get(url)
        self._pages[url] = page
        return page

    def _get(self, url: str) -> Page:
        host = (urlsplit(url).hostname or "").lower()
        try:
            if not self._allowed(url):
                return Page(url=url, note="robots_disallow")
            self._wait_turn(host)
            code, ctype, body, final = self._download(url)
        except Exception as e:  # DNS, TLS, timeout
            return Page(url=url, note=f"error_{type(e).__name__}")
        final = final or url
        # A redirect may leave the trusted site: judge where the page really is.
        why = usable_url(final, self.extra_trusted)
        if why:
            return Page(url=url, final_url=final, code=code, note=f"redirect_{why}")
        if code != 200:
            return Page(url=url, final_url=final, code=code, note=f"http_{code}")
        low = (ctype or "").lower()
        if low and "html" not in low and "text" not in low:
            return Page(url=url, final_url=final, code=code, note="not_text")
        return Page(url=url, final_url=final, code=code, text=page_text(_decode(body, ctype)))


# ─── Does the page say the word comes from Sanskrit? ────────────────────────

#: A word that means "Sanskrit", in the languages and shorthands dictionaries
#: use ("aind." is German altindisch, "др.-инд." Russian, "S." Platts).
MARK = re.compile(
    r"sanskrit|sánscr|sanscr|sanskr|sânscr|sanskriet|sanskerta|sansekerta|sanscrit|sanskryt"
    r"|aind\.|altind|др\.-инд|древнеинд|санскр|\bskt\b|\bskr\b|\bskt\.|\bsk\."
    r"|สันสกฤต|梵|サンスクリット|산스크리트|संस्कृत|\bसं\.|সংস্কৃত|ਸੰਸਕ੍ਰਿਤ|સંસ્કૃત"
    r"|سنسکریت|سانسکریت|سنسكريت|سنسکرت|சமஸ்கிருத|ஸம்ஸ்கிருத|வடமொழி|సంస్కృత|ಸಂಸ್ಕೃತ|സംസ്കൃത"
    r"|\[s\. |\bs\. \S",
    re.I,
)

#: Words that make the Sanskrit form a relative, not a source.
_COGNATE = re.compile(
    r"akin to|cognate|compare|related to|\bcf\.|\bcp\.|\bvgl\.|verwandt|entspricht"
    r"|\bср\.|родств|сравн|\bcfr\.|comparar|confronta|vergelijk|verwant|apparenté|rapproch",
    re.I,
)

#: Words that hedge the statement that follows them.
_HEDGE = re.compile(
    r"(?:probably|perhaps|possibly|maybe|uncertain|doubtful|vielleicht|wohl|wahrscheinlich"
    r"|вероятно|возможно|peut-être|probablement|sans doute|quizá|probablemente|forse"
    r"|probabilmente|talvez|provavelmente|waarschijnlijk|mogelijk|muhtemelen|belki)"
    r"[^.;\]]{0,160}$",
    re.I,
)

_SPLIT = re.compile(r"[\s,;:()\[\]{}<>\"“”‘’«»/|=+*·•…]+")
#: Scripts written without spaces between words: a word is found by
#: containment there, by whole-word match everywhere else.
_UNSPACED = re.compile(r"[฀-໿က-႟ក-៿ༀ-࿿぀-ヿ㐀-鿿]")
_ARABIC_MARKS = re.compile(r"[ً-ْٰـ]")


def _plain(text: str) -> str:
    return _ARABIC_MARKS.sub("", unicodedata.normalize("NFC", text or "")).casefold()


def contains_word(text: str, word: str) -> bool:
    """True when the page prints the word (whole word where words are spaced)."""
    w = _plain(word).strip()
    if not w:
        return False
    t = _plain(text)
    if _UNSPACED.search(w):
        return w in t
    return re.search(r"(?<![^\W\d_])" + re.escape(w) + r"(?![^\W\d_])", t) is not None


def stem_forms(sanskrit: str, as_printed: str = "") -> list[str]:
    """The comparison forms of the claimed stem.

    ``as_printed`` (what the model says the page prints) is used only when it
    is plainly the same word as the claimed stem; otherwise a page printing a
    different Sanskrit word could confirm the card.
    """
    def first_word(form: str) -> str:
        return (form or "").strip().split(",")[0].split(" ")[0]

    def one(form: str) -> str:
        return fold(first_word(form))

    stem = one(sanskrit)
    out = [stem] if len(stem) >= 3 else []
    # Older dictionaries write the palatal sibilant ś as ç (Vasmer, Platts).
    old_style = fold(unicodedata.normalize("NFC", first_word(sanskrit)).replace("ś", "c").replace("Ś", "c"))
    if out and old_style != stem:
        out.append(old_style)
    printed = one(as_printed)
    if out and len(printed) >= 3 and printed not in out:
        if difflib.SequenceMatcher(None, printed, stem).ratio() >= 0.8:
            out.append(printed)
    return out


def _token_is_stem(token: str, stem: str) -> bool:
    if token == stem:
        return True
    # A case ending or a stem vowel after the stem: yogaḥ, jaṅgalam, mātar-.
    if token.startswith(stem) and len(token) - len(stem) <= 2:
        return True
    return len(stem) >= 5 and stem.startswith(token) and len(stem) - len(token) <= 1


def check_word_text(text: str, word: str, roman: str, sanskrit: str, as_printed: str = "") -> dict:
    """Judge one page against one word. Pure.

    Returns ``{"verdict", "hedged"}``, and for ``confirmed`` also ``at``,
    where on the page the word "Sanskrit" stands. Verdicts: ``confirmed``;
    ``word_not_on_page``; ``no_sanskrit_on_page``; ``no_stem_near_sanskrit``;
    ``cognate_only`` (the stem stands only after "akin to", "cf." and the
    like); ``no_stem`` (the claimed stem is too short to check).
    """
    stems = stem_forms(sanskrit, as_printed)
    if not stems:
        return {"verdict": "no_stem", "hedged": False}
    if not (contains_word(text, word) or contains_word(text, roman)):
        return {"verdict": "word_not_on_page", "hedged": False}
    marks = list(MARK.finditer(text))[:120]
    if not marks:
        return {"verdict": "no_sanskrit_on_page", "hedged": False}
    saw_cognate = False
    for m in marks:
        # The stem stands after the word "Sanskrit" in almost every
        # dictionary; a short reach back covers the ones that put it before.
        window = text[max(0, m.start() - 60): m.end() + 300]
        tokens = [fold(tok) for tok in _SPLIT.split(window) if tok]
        if not any(_token_is_stem(tok, stem) for tok in tokens if tok for stem in stems):
            continue
        before = text[max(0, m.start() - 200): m.start()]
        if _COGNATE.search(before[-40:]):
            saw_cognate = True
            continue
        return {"verdict": "confirmed", "hedged": bool(_HEDGE.search(before)), "at": m.start()}
    return {"verdict": "cognate_only" if saw_cognate else "no_stem_near_sanskrit", "hedged": False}


def excerpt(text: str, at: int, before: int = 300, after: int = 500) -> str:
    """The stretch of a page around one place, for a reader to judge."""
    return (text or "")[max(0, at - before): at + after].strip()


def hops_on_page(text: str, hops: list[dict]) -> list[dict]:
    """The stops the page itself prints, in the order given.

    A stop counts when the page prints its form as a word. The caller shows a
    route's stops only when every one of them is here.
    """
    out = []
    for hop in hops or []:
        form = str((hop or {}).get("form") or "").strip()
        lang = str((hop or {}).get("lang") or "").strip()
        if form and lang and contains_word(text, form):
            out.append({"lang": lang, "form": form})
    return out


# ─── Does the page carry the verse? ─────────────────────────────────────────

_DEVANAGARI = re.compile(r"[ऀ-ॿ]")
_SPEAKER = re.compile(r"^[^।॥]{0,40}?उवाच")
_ROMAN_SPEAKER = re.compile(r"^[^|.]{0,40}?uvāca", re.I)
_NASAL = re.compile(r"[NYRnm](?=[kKgGcCjJwWqQtTdDpPbB])")


def _slp_from_roman(text: str, quote: bool = False) -> str:
    """Roman (IAST) text as bare SLP1 letters, nasals before stops folded."""
    t = unicodedata.normalize("NFC", (text or "").lower()).replace("ṁ", "ṃ")
    if quote:
        t = _ROMAN_SPEAKER.sub("", t.strip())
    t = re.sub(r"[^a-zāīūṛṝḷḹṅñṭḍṇśṣṃḥ]", "", t)
    try:
        import vidyut.lipi as lipi
        s = lipi.transliterate(t, lipi.Scheme.Iast, lipi.Scheme.Slp1)
    except Exception:
        s = t
    return re.sub(r"[^A-Za-z]", "", _NASAL.sub("M", s))


def _slp_from_devanagari(text: str, quote: bool = False) -> str:
    """Devanagari letters as bare SLP1, nasals before stops folded."""
    t = re.sub(r"(?<=[ऀ-ॿ]):", "ः", text or "")  # some sites type a colon for visarga
    t = "".join(ch for ch in t if "ऀ" <= ch <= "ॿ" or ch.isspace())
    if quote:
        # "श्रीभगवानुवाच": some editions print the speaker with the verse.
        t = _SPEAKER.sub("", t.strip())
    kept = "".join(ch for ch in t if "ऀ" <= ch <= "ॿ" and ch not in "।॥०१२३४५६७८९")
    try:
        import vidyut.lipi as lipi
        s = lipi.transliterate(kept, lipi.Scheme.Devanagari, lipi.Scheme.Slp1)
    except Exception:
        s = kept
    return re.sub(r"[^A-Za-z]", "", _NASAL.sub("M", s))


def verse_letters(quote: str) -> str:
    """The quoted verse as bare SLP1 letters ("" when it is not Devanagari)."""
    if not _DEVANAGARI.search(quote or ""):
        return ""
    return _slp_from_devanagari(quote, quote=True)


def verse_share(quote: str, text: str, k: int = 10) -> float:
    """How much of the quoted verse the page carries, 0 to 1.

    The quote is cut into every run of ``k`` letters; the share is how many of
    those runs stand on the page, read once as Devanagari and once as roman.
    One wrong letter in a verse of 64 syllables costs about a tenth.
    """
    q = verse_letters(quote)
    if len(q) < k * 2:
        return 0.0
    runs = {q[i:i + k] for i in range(len(q) - k + 1)}
    best = 0.0
    dev_part = "".join(ch for ch in (text or "") if "ऀ" <= ch <= "ॿ")
    for page in (_slp_from_devanagari(dev_part) if dev_part else "", _slp_from_roman(text)):
        if page:
            best = max(best, sum(1 for r in runs if r in page) / len(runs))
    return round(best, 3)


def _words_only(text: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[^\w\s]", " ", (text or "").lower())).strip()


def copies_page(passage: str, text: str, n: int = 8) -> bool:
    """True when the passage repeats ``n`` words in a row from the page."""
    words = _words_only(passage).split()
    if len(words) < n:
        return False
    page = " " + _words_only(text) + " "
    return any((" " + " ".join(words[i:i + n]) + " ") in page for i in range(len(words) - n + 1))
