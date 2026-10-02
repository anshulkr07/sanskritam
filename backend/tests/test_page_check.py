"""The evidence check (services/page_check.py). No network.

Every page here is made up in the shape dictionaries use; no dictionary text
is pasted into the repo. The Sanskrit verse is one the app already seeds.
"""

from __future__ import annotations

from app.services import page_check as pc


# ─── Which sites count ──────────────────────────────────────────────────────

def test_wikipedia_blogs_and_forums_never_count():
    for url in (
        "https://en.wikipedia.org/wiki/Sugar",
        "https://en.wiktionary.org/wiki/sugar",
        "https://sa.wikisource.org/wiki/x",
        "https://someone.blogspot.com/2020/01/sugar.html",
        "https://myblog.wordpress.com/sugar",
        "https://www.quora.com/Where-does-sugar-come-from",
        "https://www.reddit.com/r/etymology",
        "https://medium.com/@x/sugar",
    ):
        assert pc.usable_url(url) == "blocked_site", url
        assert not pc.is_trusted(pc.host_of(url)), url


def test_dictionaries_universities_and_academies_count():
    for url in (
        "https://ahdictionary.com/word/search.html?q=sugar",
        "https://www.dwds.de/wb/etymwb/Zucker",
        "https://www.cnrtl.fr/etymologie/sucre",
        "https://dle.rae.es/azucar",
        "https://dsal.uchicago.edu/cgi-bin/app/platts_query.py?qs=x",
        "https://kbbi.kemdikbud.go.id/entri/gula",
        "https://prpm.dbp.gov.my/cari1?keyword=x",
        "http://gretil.sub.uni-goettingen.de/gretil/x.htm",
        "https://www.gitasupersite.iitk.ac.in/srimad",
        "https://vedabase.io/en/library/bg/2/47/",
    ):
        assert pc.usable_url(url) == "", url


def test_an_unknown_site_is_not_trusted_until_it_is_added():
    url = "https://www.some-word-site.com/sugar"
    assert pc.usable_url(url) == "untrusted_site"
    assert pc.usable_url(url, extra=["some-word-site.com"]) == ""
    # Adding a host can never un-block a blocked one.
    assert pc.usable_url("https://en.wikipedia.org/wiki/x", extra=["wikipedia.org"]) == "blocked_site"
    assert pc.usable_url("ftp://dwds.de/x") == "no_url"
    assert pc.usable_url("") == "no_url"


def test_site_name():
    assert pc.site_name("dle.rae.es") == "Diccionario de la lengua española (RAE)"
    assert pc.site_name("www2.dwds.de") == "Digitales Wörterbuch der deutschen Sprache"
    assert pc.site_name("dict.example.edu") == "dict.example.edu"


# ─── The word check ─────────────────────────────────────────────────────────

_LOAN = ("madeupword n. A sweet test thing. [Middle Madeup sukre, from Old Madeup shakar, "
         "from Sanskrit śarkarā, grit, ground sugar.]")


def test_word_and_stem_on_page_confirms():
    got = pc.check_word_text(_LOAN, "madeupword", "", "śarkarā")
    assert got == {"verdict": "confirmed", "hedged": False, "at": _LOAN.index("Sanskrit")}
    assert pc.excerpt(_LOAN, got["at"], before=5, after=17) == "from Sanskrit śarkarā,"
    # The stem however it is romanised, and with a case ending on the page.
    page = "madeupword. From Sanskrit yogaḥ, a yoking."
    assert pc.check_word_text(page, "madeupword", "", "yoga")["verdict"] == "confirmed"
    assert pc.check_word_text(page, "Madeupword", "", "yoga")["verdict"] == "confirmed"


def test_a_relative_is_not_a_source():
    page = "madeupword n. A test parent. [Old Madeup modor; akin to Sanskrit mātā, mother.]"
    assert pc.check_word_text(page, "madeupword", "", "mātā")["verdict"] == "cognate_only"
    german = "Madeupwort. Urverwandt sind lat. mater, vgl. aind. mātā."
    assert pc.check_word_text(german, "Madeupwort", "", "mātā")["verdict"] == "cognate_only"


def test_a_hedged_entry_is_marked():
    page = "madeupword n. A test fruit. [Probably ultimately from Sanskrit nāraṅgaḥ.]"
    got = pc.check_word_text(page, "madeupword", "", "nāraṅga")
    assert (got["verdict"], got["hedged"]) == ("confirmed", True)
    # A hedge about something later in the entry does not count.
    page = "madeupword n. [From Sanskrit nāraṅgaḥ.] Its later sense is probably a pun."
    assert pc.check_word_text(page, "madeupword", "", "nāraṅga")["hedged"] is False


def test_pages_that_do_not_say_it():
    assert pc.check_word_text(_LOAN, "otherword", "", "śarkarā")["verdict"] == "word_not_on_page"
    latin = "madeupword n. [From Latin testum.]"
    assert pc.check_word_text(latin, "madeupword", "", "śarkarā")["verdict"] == "no_sanskrit_on_page"
    other = "madeupword n. [From Sanskrit candanam.]"
    assert pc.check_word_text(other, "madeupword", "", "śarkarā")["verdict"] == "no_stem_near_sanskrit"
    # A stem of two letters cannot be told from noise.
    assert pc.check_word_text("go. From Sanskrit go.", "go", "", "go")["verdict"] == "no_stem"


def test_the_stem_must_stand_near_the_word_sanskrit():
    filler = " filler" * 80
    page = f"madeupword n. Sanskrit is an old language.{filler} The form śarkarā is unrelated."
    assert pc.check_word_text(page, "madeupword", "", "śarkarā")["verdict"] == "no_stem_near_sanskrit"


def test_a_longer_word_is_not_the_stem():
    page = "madeupword n. [From Sanskrit nautical terms, loosely.]"
    assert pc.check_word_text(page, "madeupword", "", "nau")["verdict"] == "no_stem_near_sanskrit"


def test_as_printed_only_counts_when_it_is_the_same_word():
    page = "madeupword n. [From Sanskrit candanam.]"
    # The model says the page prints "candanam" for a card that claims śarkarā.
    got = pc.check_word_text(page, "madeupword", "", "śarkarā", as_printed="candanam")
    assert got["verdict"] == "no_stem_near_sanskrit"
    # A spelling of the same stem is accepted.
    assert pc.stem_forms("śarkarā", "sarkkara") == ["sarkara", "carkara", "sarkkara"]
    assert pc.stem_forms("yoga", "yogaḥ") == ["yoga", "yogah"]


def test_other_scripts_and_shorthands():
    german = "Madeupwort n. entlehnt aus pers. šakar, dieses aus aind. śárkarā 'Grieß'."
    assert pc.check_word_text(german, "Madeupwort", "", "śarkarā")["verdict"] == "confirmed"
    # Older dictionaries write ś as ç or c̨.
    russian = "выдумка. Через перс. šakar из др.-инд. c̨árkarā."
    assert pc.check_word_text(russian, "выдумка", "", "śarkarā")["verdict"] == "confirmed"
    russian = "выдумка. Через перс. šakar из др.-инд. śarkarā."
    assert pc.check_word_text(russian, "выдумка", "vydumka", "śarkarā")["verdict"] == "confirmed"
    spanish = "inventada. Del sánscr. śarkarā."
    assert pc.check_word_text(spanish, "inventada", "", "śarkarā")["verdict"] == "confirmed"


def test_whole_word_match_and_unspaced_scripts():
    assert pc.contains_word("the principal thing", "pal") is False
    assert pc.contains_word("a pal, indeed", "pal") is True
    assert pc.contains_word("PAL.", "pal") is True
    # Thai is written without spaces: the word is found inside the run.
    assert pc.contains_word("คำว่าภาษาแปลว่า", "ภาษา") is True
    assert pc.contains_word("anything", "") is False


def test_hops_on_page():
    hops = [{"lang": "Old Madeup", "form": "shakar"}, {"lang": "Middle Madeup", "form": "sukre"}]
    assert pc.hops_on_page(_LOAN, hops) == hops
    missing = hops + [{"lang": "Arabic", "form": "sukkar"}]
    assert pc.hops_on_page(_LOAN, missing) == hops


# ─── The verse check ────────────────────────────────────────────────────────

def _verses():
    from app.seeds.shlokas import SEED_SLOKAS

    long_enough = [s["devanagari"] for s in SEED_SLOKAS if len(s["devanagari"]) > 60]
    return long_enough[0], long_enough[1]


def test_verse_on_a_devanagari_page():
    verse, other = _verses()
    page = f"Chapter heading. {verse} A translation follows in English."
    assert pc.verse_share(verse, page) == 1.0
    assert pc.verse_share(verse, f"Chapter heading. {other}") < 0.5


def test_verse_on_a_roman_page():
    from app.services.iast import to_iast

    verse, other = _verses()
    page = f"<p>1.1 {to_iast(verse)} //</p> some notes in English"
    assert pc.verse_share(verse, pc.page_text(page)) >= 0.9
    assert pc.verse_share(verse, to_iast(other)) < 0.5


def test_a_quote_that_is_not_devanagari_or_too_short_scores_nothing():
    verse, _ = _verses()
    assert pc.verse_share("dharmakshetre kurukshetre", verse) == 0.0
    assert pc.verse_share(verse[:6], verse) == 0.0


def test_copies_page():
    page = "The page says: one who acts without longing for the fruit of the act is free."
    assert pc.copies_page("One who acts without longing for the fruit of the act, they say.", page)
    assert not pc.copies_page("Act, and let go of what the act may bring you.", page)
    assert not pc.copies_page("too short", page)


def test_page_text_drops_scripts_and_tags():
    raw = "<html><script>var x = 'Sanskrit';</script><style>p{}</style><p>From&nbsp;Latin <b>testum</b>.</p></html>"
    assert pc.page_text(raw) == "From Latin testum ."


# ─── Opening pages ──────────────────────────────────────────────────────────

class _Web:
    """A made-up web: address -> (status, content type, body, final address)."""

    def __init__(self, pages: dict, robots: dict | None = None):
        self.pages = pages
        self.robots = robots or {}
        self.calls: list[str] = []

    def __call__(self, url: str):
        self.calls.append(url)
        if url.endswith("/robots.txt"):
            host = url.split("/")[2]
            if host in self.robots:
                return 200, "text/plain", self.robots[host].encode(), url
            return 404, "text/plain", b"", url
        if url not in self.pages:
            return 404, "text/html", b"", url
        entry = self.pages[url]
        if isinstance(entry, tuple):
            return entry
        return 200, "text/html; charset=utf-8", entry.encode("utf-8"), url


def _fetcher(web, **kw):
    return pc.PageFetcher(contact="owner@example.org", download=web, sleep=lambda s: None, **kw)


def test_fetcher_names_itself_and_reads_a_page():
    web = _Web({"https://www.dwds.de/wb/etymwb/X": "<p>Hallo</p>"})
    f = _fetcher(web)
    assert f.user_agent.startswith("SanskritamBot/1.0") and "owner@example.org" in f.user_agent
    page = f.get("https://www.dwds.de/wb/etymwb/X")
    assert (page.code, page.text, page.note) == (200, "Hallo", "")
    # A second ask is answered from memory: one robots.txt and one page fetched.
    f.get("https://www.dwds.de/wb/etymwb/X")
    assert web.calls == ["https://www.dwds.de/robots.txt", "https://www.dwds.de/wb/etymwb/X"]


def test_fetcher_never_opens_a_blocked_or_unknown_site():
    web = _Web({})
    f = _fetcher(web)
    assert f.get("https://en.wikipedia.org/wiki/Sugar").note == "blocked_site"
    assert f.get("https://www.some-word-site.com/sugar").note == "untrusted_site"
    assert f.get("not an address").note == "no_url"
    assert web.calls == []


def test_fetcher_obeys_robots_txt():
    web = _Web(
        {"https://www.duden.de/rechtschreibung/X": "<p>x</p>", "https://www.duden.de/open/X": "<p>y</p>"},
        robots={"www.duden.de": "User-agent: *\nDisallow: /rechtschreibung/\n"},
    )
    f = _fetcher(web)
    assert f.get("https://www.duden.de/rechtschreibung/X").note == "robots_disallow"
    assert f.get("https://www.duden.de/open/X").text == "y"
    assert "https://www.duden.de/rechtschreibung/X" not in web.calls


def test_fetcher_treats_a_broken_robots_txt_as_no():
    def download(url):
        if url.endswith("/robots.txt"):
            return 503, "text/plain", b"", url
        return 200, "text/html", b"<p>x</p>", url

    f = pc.PageFetcher(download=download, sleep=lambda s: None)
    assert f.get("https://www.dwds.de/wb/X").note == "robots_disallow"


def test_fetcher_judges_where_a_redirect_lands():
    web = _Web({
        "https://www.dwds.de/wb/X": (200, "text/html", b"<p>x</p>", "https://en.wikipedia.org/wiki/X"),
        "https://www.dwds.de/wb/Y": (404, "text/html", b"", "https://www.dwds.de/wb/Y"),
        "https://www.dwds.de/wb/Z": (200, "application/pdf", b"%PDF", "https://www.dwds.de/wb/Z"),
    })
    f = _fetcher(web)
    assert f.get("https://www.dwds.de/wb/X").note == "redirect_blocked_site"
    assert f.get("https://www.dwds.de/wb/Y").note == "http_404"
    assert f.get("https://www.dwds.de/wb/Z").note == "not_text"


def test_fetcher_spaces_requests_to_one_host_and_stops_at_the_deadline():
    now = [0.0]
    slept: list[float] = []

    def sleep(s):
        slept.append(s)
        now[0] += s

    web = _Web({"https://www.dwds.de/wb/A": "<p>a</p>", "https://www.dwds.de/wb/B": "<p>b</p>"})
    f = pc.PageFetcher(download=web, sleep=sleep, clock=lambda: now[0], spacing_s=1.2, deadline=100.0)
    f.get("https://www.dwds.de/wb/A")
    f.get("https://www.dwds.de/wb/B")
    # robots.txt, A and B are three requests to one host: two waits.
    assert len(slept) == 2 and all(abs(s - 1.2) < 1e-9 for s in slept)
    now[0] = 100.0
    assert f.out_of_time()
    assert f.get("https://www.dwds.de/wb/C").note == "out_of_time"


def test_fetcher_survives_a_failed_request():
    def download(url):
        if url.endswith("/robots.txt"):
            return 404, "", b"", url
        raise TimeoutError("slow")

    f = pc.PageFetcher(download=download, sleep=lambda s: None)
    assert f.get("https://www.dwds.de/wb/X").note == "error_TimeoutError"
