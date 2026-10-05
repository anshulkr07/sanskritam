"""Checks the verses and links an Ask answer cites, before anyone sees them.

Owner instruction 2026-10-05: answers need not come only from the books the
app holds; "if the internet has authentic information, then show it." The
model writes the answer and names its verses and pages. Code then checks
them, with the tools the daily pipeline uses (services/page_check.py), read
letter by letter at the pipeline's own bar (``verse_share`` 0.9):

1. a verse the app holds (the shlokas table) stands, with the app's own
   reference;
2. a Gītā, Bhāgavata or Īśopaniṣad verse is read on its own Vedabase page,
   built by code from the reference, so its chapter and verse are checked
   too;
3. a verse from another text in ``LIBRARY`` is looked for in that whole text
   on GRETIL (Göttingen) or sanskritdocuments.org. That proves it is in the
   text, not where: the reference keeps the text's name and loses its
   numbers;
4. the page the model named, when it is on a trusted site, is tried last,
   on the same terms as 3.

A link stands when it is on a trusted site, robots.txt allows it and the page
opens. On 2026-10-05 the model's own addresses were dead in five of five
tries (all HTTP 404), which is why code builds addresses wherever it can.

Anything that fails is removed. Nothing is marked as unchecked: the owner
does not want such notes in the app (2026-10-03), so what cannot be checked
is simply not shown. The prose of the answer stays.

Not used: Google Search grounding. Its terms (Google Cloud Service Specific
Terms 20(k), read 2026-10-05) forbid storing grounded answers beyond the
asker's own chat history and forbid modifying them, which rules out both the
stored answers and these checks; it also bills $14 per 1,000 searches.

Pages are opened in worker threads, one per site so a site is never hit in
parallel, under one deadline per answer. Page text is held in memory (whole
texts for half a day, within a size cap) and never written anywhere.
"""

from __future__ import annotations

import logging
import re
import threading
import time
from collections import OrderedDict
from concurrent.futures import ThreadPoolExecutor, wait
from dataclasses import dataclass
from typing import Optional

from sqlalchemy.orm import Session

from app.config import settings
from app.models import Shloka
from app.services import page_check as pc

logger = logging.getLogger("shabd.ask_sources")

#: The daily pipeline's bar (services/daily_content.py MIN_VERSE_SHARE).
MIN_VERSE_SHARE = 0.9
_RUN = 10

# ── where a verse can be checked ──────────────────────────────────────────

_GRETIL = "https://gretil.sub.uni-goettingen.de/gretil/corpustei/transformations/"
_MBH = "https://gretil.sub.uni-goettingen.de/gretil/1_sanskr/2_epic/mbh/mbh_{:02d}_u.htm"

#: Texts the checker can read whole: (pattern on the reference, GRETIL file
#: name or a full address). File names from gretil.sub.uni-goettingen.de/
#: gretil.html, each opened 2026-10-05. Specific names before general ones:
#: "Devī Gītā" must not fall to the Bhagavad Gītā.
LIBRARY: list[tuple[str, str]] = [
    (r"devi\s*g[iī]t|devī\s*gītā|देवीगीता", "sa_devIgItA"),
    (r"a[sṣ]h?[tṭ][aā]vakra|अष्टावक्र", "sa_aSTAvakragItA"),
    (r"g[iī]ta\s*govind|गीतगोविन्द", "sa_jayadeva-gItagovinda"),
    (r"r[iṛ]g\s*-?\s*veda|rigved|ऋग्वेद", "sa_Rgveda-edAufrecht"),
    (r"s[aā]ma\s*-?\s*veda|सामवेद", "sa_sAmavedasaMhitA"),
    (r"paippal", "sa_paippalAdasaMhitA"),
    (r"\b[iī][sś]h?a(v[aā]sya)?\s*(up|उप)|^[iī][sś]h?opani|ईश", "sa_IzopaniSad-or-IzAvAsyopaniSadkANva-recension-comm"),
    (r"ka[tṭ]h?a?\s*-?\s*up|ka[tṭ]hopani|कठ", "sa_kathopaniSad"),
    (r"pra[sś]h?na|प्रश्न", "sa_praznopaniSad-comm"),
    (r"m[aā][nṇ][dḍ][uū]kya|माण्डूक्य|माण्डुक्य", "sa_mANDUkyopaniSad-comm"),
    (r"mu[nṇ][dḍ]aka|मुण्डक", "https://sanskritdocuments.org/doc_upanishhat/mundaka.html"),
    (r"taittir|तैत्तिरीय", "sa_taittirIyopaniSad-zaMkarabhASya"),
    (r"aitareya|ऐतरेय", "sa_aitareyopaniSad-comm"),
    (r"ch?h?[aā]ndogya|छान्दोग्य", "sa_chAndogyopaniSad-comm"),
    (r"b[rṛ]i?had[aā]ra[nṇ]yaka|बृहदारण्यक", "sa_bRhadAraNyakopaniSadkANva-recension-comm"),
    (r"[sś]h?v?et[aā][sś]h?vatara|श्वेताश्वतर", "sa_zvetAzvataropaniSad"),
    (r"yoga\s*-?\s*s[uū]tra|patañjali|patanjali|योगसूत्र|पातञ्जल", "sa_pataJjali-yogasUtra"),
    (r"ha[tṭ]ha\s*-?\s*yoga|हठयोग", "sa_svAtmArAma-haThayogapradIpikA"),
    (r"s[uū]rya\s*-?\s*siddh[aā]nta|सूर्यसिद्धान्त", "sa_sUryasiddhAnta"),
    (r"[aā]ryabha[tṭ][iī]ya|आर्यभटीय", "sa_AryabhaTa-AryabhaTIya"),
    (r"br[aā]hma\s*-?\s*sphu[tṭ]a|ब्राह्मस्फुट", "sa_brahmagupta-brAhmasphuTasiddhAnta"),
    (r"l[iī]l[aā]vat[iī]|लीलावती", "sa_bhAskara-lIlAvatI"),
    (r"b[iī]ja\s*-?\s*ga[nṇ]ita|बीजगणित", "sa_bhAskara-bIjagaNita"),
    (r"[aā]pastamba.*[sś]h?ulba|आपस्तम्ब", "sa_ApastambazulbasUtra"),
    (r"ved[aā][nṅ]ga\s*-?\s*jyoti|वेदाङ्गज्योतिष", "sa_lagadha-RgvedavedAGgajyotiSa"),
    (r"b[rṛ]i?hat\s*-?\s*sa[mṃ]hit|बृहत्संहिता", "sa_varAhamihira-bRhatsaMhitA"),
    (r"manu\s*-?\s*sm|manusm|manu\b|मनुस्मृति", "sa_manusmRti"),
    (r"ch?araka|चरक", "sa_agniveza-carakasaMhitA-parts-comm"),
    (r"a[sṣ]h?[tṭ][aā][nṅ]ga\s*-?\s*h[rṛ]i?daya|अष्टाङ्गहृदय", "sa_vAgbhaTa-aSTAGgahRdayasUtra"),
    (r"r[aā]m[aā]ya[nṇ]a|रामायण", "sa_rAmAyaNa"),
    (r"vi[sṣ]h?[nṇ]u\s*-?\s*pur[aā][nṇ]|विष्णुपुराण", "sa_viSNupurANa"),
    (r"m[aā]rka[nṇ][dḍ]eya|dev[iī]\s*m[aā]h[aā]tmya|durg[aā]\s*sapta|मार्कण्डेय|देवीमाहात्म्य|सप्तशती", "sa_mArkaNDeyapurANa1-93"),
    (r"garu[dḍ]a|गरुड", "sa_garuDapurANa"),
    (r"agni\s*-?\s*pur[aā][nṇ]|अग्निपुराण", "sa_agnipurANa"),
    (r"[sś]h?iva\s*-?\s*pur[aā][nṇ]|शिवपुराण", "sa_zivapurANabooks-1-and-7"),
    (r"brahma\s*-?\s*s[uū]tra|ब्रह्मसूत्र", "sa_bAdarAyaNa-brahmasUtra"),
    (r"viveka\s*-?\s*c[uū][dḍ][aā]ma[nṇ]i|विवेकचूडामणि", "sa_zaMkara-vivekacuDAmaNi"),
    (r"s[aā][mṃn]khya\s*-?\s*k[aā]rik|सांख्यकारिका|साङ्ख्यकारिका", "sa_IzvarakRSNa-sAMkhyakArikA"),
    (r"artha\s*-?\s*[sś]h?[aā]stra|अर्थशास्त्र", "sa_kauTilya-arthazAstra"),
    (r"n[aā][tṭ]ya\s*-?\s*[sś]h?[aā]stra|नाट्यशास्त्र", "sa_bharata-nATyazAstra-1-1618-303335-37"),
    (r"hariva[mṃ][sś]h?a|हरिवंश", "sa_harivaMza"),
    (r"amara\s*-?\s*ko[sś]h?a|अमरकोश", "sa_amarasiMha-nAmaliGgAnuzAsana"),
    (r"bh[aā]gavata|भागवत", "sa_bhAgavatapurANa"),
    (r"bhagavad|g[iī]t[aā]|गीता", "sa_bhagavadgItA-comm"),
]
_LIBRARY = [(re.compile(p, re.I), target) for p, target in LIBRARY]

_GITA = re.compile(r"bhagavad|g[iī]t[aā]|गीता", re.I)
_NOT_THE_GITA = re.compile(r"dev[iī]\s*g|a[sṣ]h?[tṭ][aā]vakra|govind|uttara\s*g|अष्टावक्र|देवीगीता", re.I)
_BHAGAVATA = re.compile(r"bh[aā]gavata|भागवत", re.I)
_ISHA = re.compile(r"\b[iī][sś]h?a(v[aā]sya)?\s*(up|उप)|^[iī][sś]h?opani|ईशोपनिषद|ईशावास्य", re.I)
_MAHABHARATA = re.compile(r"mah[aā]bh[aā]rata|महाभारत|\bmbh\b", re.I)
_DEVA_DIGITS = str.maketrans("०१२३४५६७८९", "0123456789")
#: Where a reference's numbering starts: digits, or a numbering word then
#: digits. Names like "Yoga Sutra" or "Sundara Kāṇḍa" keep their words.
_NUMBERING = re.compile(
    r"[\s,;:(]*(?:(?:verse|chapter|canto|mandala|maṇḍala|sukta|sūkta|adhyaya|adhyāya|shloka|"
    r"śloka|sloka|mantra|valli|vallī|prapathaka|anuvaka|book|part|section|श्लोक|अध्याय|मण्डल|"
    r"सूक्त|मन्त्र|स्कन्ध)\s*)?\d.*$",
    re.I,
)


@dataclass
class Route:
    """One way to check a verse: the page to read, the page to show, and
    whether reading it also checks the verse's number."""

    fetch: str
    show: str
    exact: bool


def _numbers(ref: str) -> list[int]:
    return [int(n) for n in re.findall(r"\d+", (ref or "").translate(_DEVA_DIGITS))]


def ref_urls(ref: str) -> list[str]:
    """Per-verse pages code can build from a reference: Vedabase numbers the
    Gītā, the Bhāgavata and the Īśopaniṣad one verse to a page."""
    nums = _numbers(ref)
    r = ref or ""
    if _BHAGAVATA.search(r) and len(nums) >= 3:
        return [f"https://vedabase.io/en/library/sb/{nums[0]}/{nums[1]}/{nums[2]}/"]
    if _GITA.search(r) and not _NOT_THE_GITA.search(r) and not _MAHABHARATA.search(r) and len(nums) >= 2:
        return [f"https://vedabase.io/en/library/bg/{nums[0]}/{nums[1]}/"]
    if _ISHA.search(r) and len(nums) == 1 and 1 <= nums[0] <= 18:
        return [f"https://vedabase.io/en/library/iso/{nums[0]}/"]
    return []


def library_urls(ref: str) -> list[tuple[str, str]]:
    """(page to read, page to show) for the whole text a reference names."""
    r = ref or ""
    nums = _numbers(r)
    if _MAHABHARATA.search(r) and nums and 1 <= nums[0] <= 18:
        url = _MBH.format(nums[0])
        return [(url, url)]
    for pattern, target in _LIBRARY:
        if pattern.search(r):
            if target.startswith("http"):
                return [(target, target)]
            return [(f"{_GRETIL}plaintext/{target}.txt", f"{_GRETIL}html/{target}.htm")]
    return []


def text_name(ref: str) -> str:
    """The reference without its numbers: "Kaṭha Upaniṣad 1.2.23" -> "Kaṭha Upaniṣad"."""
    name = _NUMBERING.sub("", (ref or "").translate(_DEVA_DIGITS)).strip(" ,;:-–(")
    return name or (ref or "").strip()


def verse_routes(verse: dict) -> list[Route]:
    ref = verse.get("ref", "")
    routes = [Route(u, u, True) for u in ref_urls(ref)]
    routes += [Route(f, s, False) for f, s in library_urls(ref)]
    own = (verse.get("url") or "").strip()
    if own and not pc.usable_url(own, extra_trusted()):
        routes.append(Route(own, own, False))
    seen: set[str] = set()
    out = []
    for r in routes:
        if r.fetch not in seen:
            seen.add(r.fetch)
            out.append(r)
    return out[:3]


def extra_trusted() -> list[str]:
    raw = f"{settings.content_extra_trusted_hosts},{settings.ask_extra_trusted_hosts}"
    return [h.strip() for h in raw.split(",") if h.strip()]


# ── verses the app holds ──────────────────────────────────────────────────

#: The held verses as bare letters, rebuilt when the table's size changes.
_held: dict = {"count": -1, "rows": []}


def _held_rows(db: Session) -> list[tuple[str, str, str]]:
    count = db.query(Shloka).count()
    if count != _held["count"]:
        rows = []
        for row in db.query(Shloka.id, Shloka.devanagari, Shloka.source_ref).all():
            letters = pc._slp_from_devanagari(row.devanagari or "")
            if letters:
                rows.append((str(row.id), letters, row.source_ref or ""))
        _held.update(count=count, rows=rows)
    return _held["rows"]


#: A quotation shorter than two runs ("tarati śokam ātmavit", 19 letters)
#: stands only when the page carries all of it, unbroken. Its last letter
#: may differ, because sandhi changes word-final sounds: the Chāndogya has
#: "tarati śokam ātmavid iti" (7.1.3, GRETIL, checked 2026-10-05).
_SHORT_MIN = 12


def _share(quote_letters: str, *pages: str) -> float:
    """``page_check.verse_share`` on letters already made."""
    q = quote_letters
    if len(q) < _RUN * 2:
        if len(q) >= _SHORT_MIN and any(q[:-1] in page for page in pages if page):
            return 1.0
        return 0.0
    runs = {q[i:i + _RUN] for i in range(len(q) - _RUN + 1)}
    best = 0.0
    for page in pages:
        if page:
            best = max(best, sum(1 for r in runs if r in page) / len(runs))
    return best


def stored_verse(db: Session, sa: str) -> Optional[tuple[str, str]]:
    """(shloka id, reference) of the app's own row carrying this verse."""
    q = pc.verse_letters(sa)
    if len(q) < _SHORT_MIN:
        return None
    first, last = q[:_RUN], q[-_RUN:]
    for sid, letters, ref in _held_rows(db):
        if first not in letters and last not in letters:
            continue
        if _share(q, letters) >= MIN_VERSE_SHARE:
            return sid, ref
    return None


def mark_stored(db: Session, card: dict) -> None:
    """Verses the app already holds pass with no network; marked in place."""
    for v in card.get("verses") or []:
        hit = stored_verse(db, v.get("sa", ""))
        if hit is not None:
            v["_held"] = True
            v["shloka_id"], ref = hit
            v["ref"] = ref or v.get("ref", "")


# ── opening pages ─────────────────────────────────────────────────────────

class _PageCache:
    """Recently opened pages and their letters, capped by total size."""

    def __init__(self, max_chars: int = 30_000_000, ttl_s: float = 12 * 3600.0) -> None:
        self.max_chars, self.ttl_s = max_chars, ttl_s
        self._items: OrderedDict[str, tuple[float, pc.Page, Optional[tuple[str, str]]]] = OrderedDict()
        self._lock = threading.Lock()

    def get(self, url: str) -> Optional[pc.Page]:
        with self._lock:
            hit = self._items.get(url)
            if hit is None or time.monotonic() - hit[0] > self.ttl_s:
                return None
            self._items.move_to_end(url)
            return hit[1]

    def put(self, url: str, page: pc.Page) -> None:
        with self._lock:
            self._items[url] = (time.monotonic(), page, None)
            self._items.move_to_end(url)
            self._trim()

    def letters(self, url: str, page: pc.Page) -> tuple[str, str]:
        """The page as bare letters, read as Devanagari and as roman, once."""
        with self._lock:
            hit = self._items.get(url)
            if hit is not None and hit[2] is not None:
                return hit[2]
        dev = "".join(ch for ch in page.text if "ऀ" <= ch <= "ॿ")
        made = (pc._slp_from_devanagari(dev) if dev else "", pc._slp_from_roman(page.text))
        with self._lock:
            if url in self._items:
                stamp, p, _ = self._items[url]
                self._items[url] = (stamp, p, made)
                self._trim()
        return made

    def clear(self) -> None:
        with self._lock:
            self._items.clear()

    def _trim(self) -> None:
        def size(item):
            _, p, lt = item
            return len(p.text) + (len(lt[0]) + len(lt[1]) if lt else 0)
        total = sum(size(i) for i in self._items.values())
        while total > self.max_chars and len(self._items) > 1:
            _, old = self._items.popitem(last=False)
            total -= size(old)


_pages = _PageCache()
_robots: dict = {}


def _open_site(urls: list[str], deadline: float, download=None) -> dict[str, pc.Page]:
    """Open one site's pages in order, politely, until the deadline."""
    fetcher = pc.PageFetcher(
        contact=settings.legal_contact_email,
        download=download,
        extra_trusted=extra_trusted(),
        timeout_s=max(1.0, min(8.0, deadline - time.monotonic())),
        deadline=deadline,
    )
    fetcher._robots = _robots  # one robots.txt read per site per process
    out: dict[str, pc.Page] = {}
    try:
        for url in urls:
            hit = _pages.get(url)
            if hit is not None:
                out[url] = hit
                continue
            page = fetcher.get(url)
            out[url] = page
            if page.text:
                _pages.put(url, page)
    finally:
        fetcher.close()
    return out


def open_pages(urls: list[str], budget_s: float, download=None) -> dict[str, pc.Page]:
    """Open every address, one worker per site, within ``budget_s`` seconds."""
    by_site: dict[str, list[str]] = {}
    for u in dict.fromkeys(urls):
        by_site.setdefault(pc.host_of(u), []).append(u)
    if not by_site:
        return {}
    deadline = time.monotonic() + budget_s
    pages: dict[str, pc.Page] = {}
    pool = ThreadPoolExecutor(max_workers=min(4, len(by_site)))
    try:
        futures = [pool.submit(_open_site, group, deadline, download) for group in by_site.values()]
        done, _late = wait(futures, timeout=budget_s + 1.0)
        for f in done:
            try:
                pages.update(f.result())
            except Exception as exc:  # noqa: BLE001 — a site failing drops its links only
                logger.info("source check worker failed: %s", type(exc).__name__)
    finally:
        pool.shutdown(wait=False, cancel_futures=True)
    return pages


# ── the check ─────────────────────────────────────────────────────────────

def check_card(card: dict, budget_s: Optional[float] = None, download=None) -> dict:
    """Keep only the verses and links that check out. Blocking: run it in a
    worker thread. Returns counts for the log."""
    budget = settings.ask_source_check_s if budget_s is None else budget_s
    verses = card.get("verses") or []
    sources = card.get("sources") or []
    wanted: list[str] = []
    for v in verses:
        if not v.get("_held"):
            v["_routes"] = verse_routes(v)
            wanted += [r.fetch for r in v["_routes"]]
    for s in sources:
        url = (s.get("url") or "").strip()
        if url and not pc.usable_url(url, extra_trusted()):
            wanted.append(url)
    pages = open_pages(wanted, budget, download) if wanted and budget > 0 else {}

    kept_verses = []
    for v in verses:
        routes = v.pop("_routes", [])
        if v.pop("_held", False):
            v["url"], v["site"] = "", "Sanskritam"
            kept_verses.append(v)
            continue
        letters = pc.verse_letters(v.get("sa", ""))
        for route in routes:
            page = pages.get(route.fetch)
            if page is None or not page.text:
                continue
            if _share(letters, *_pages.letters(route.fetch, page)) >= MIN_VERSE_SHARE:
                show = route.show if route.show != route.fetch else (page.final_url or route.fetch)
                v["url"], v["site"] = show, pc.site_name(pc.host_of(show))
                if not route.exact:
                    v["ref"] = text_name(v.get("ref", ""))
                kept_verses.append(v)
                break

    kept_sources = []
    seen: set[str] = {v["url"] for v in kept_verses if v.get("url")}
    for s in sources:
        url = (s.get("url") or "").strip()
        page = pages.get(url)
        if page is None or page.code != 200 or len(page.text) < 200:
            continue
        final = page.final_url or url
        if final in seen:
            continue
        seen.add(final)
        kept_sources.append({"title": s.get("title") or pc.site_name(pc.host_of(final)),
                             "url": final, "site": pc.site_name(pc.host_of(final))})

    counts = {
        "verses": len(verses), "verses_kept": len(kept_verses),
        "sources": len(sources), "sources_kept": len(kept_sources),
        "pages": len(pages),
    }
    card["verses"] = kept_verses
    card["sources"] = kept_sources
    return counts
