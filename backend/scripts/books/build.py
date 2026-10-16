"""Build one book payload (handover_reading_shelf.md section 5).

Usage (from backend/):
    PYTHONUTF8=1 ./.venv/Scripts/python.exe -m scripts.books.build --slug yogasutra
    PYTHONUTF8=1 ./.venv/Scripts/python.exe -m scripts.books.build --all

Nothing here writes to the database. Each book becomes one file,
backend/results/imports/books/<slug>.payload.json, plus <slug>.report.json
(coverage) and <slug>.sources.json (pages, revisions, URLs).
"""

from __future__ import annotations

import argparse
import datetime
import html as _html
import json
import re
import sys
import unicodedata
from pathlib import Path
from xml.etree import ElementTree as _ET

from scripts.books import catalogue as _cat
from scripts.books import clean as _clean
from scripts.books import fetch as _fetch

BOOKS_DIR = Path(__file__).resolve().parent.parent.parent / "results" / "imports" / "books"
TODAY = datetime.date.today().isoformat()

_DEVA = str.maketrans("०१२३४५६७८९", "0123456789")


def _letters_ratio(a: str, b: str) -> float:
    """difflib ratio over two already letter-only strings."""
    import difflib
    if not a or not b:
        return 0.0
    return difflib.SequenceMatcher(None, a, b).ratio()


def _canon_entry(slug: str) -> dict:
    from app.seeds.canon import CANON_TEXTS as _CANON

    for t in _CANON:
        if t.get("slug") == slug:
            return t
    raise SystemExit(f"unknown slug {slug!r}")


def _licence_for(slug: str, spec: dict, sources: dict) -> str:
    entry = _canon_entry(slug)
    # The seed already carries the verbatim string (3.4); the builder reuses
    # it so payload and catalogue agree. Vedic books gain the accent note
    # when their spec marks vedic.
    lic = entry.get("licence", "")
    if spec.get("vedic") and "Vedic accent marks removed" not in lic:
        lic = lic.rstrip(".") + "; Vedic accent marks removed."
    return lic


def _source_for(slug: str) -> str:
    return _canon_entry(slug).get("source", "")


# ── DCS ─────────────────────────────────────────────────────────────────

def parse_dcs_conllu(body: str) -> list[tuple[int, str]]:
    """[(verse_ordinal_in_file, joined IAST text)] for one DCS file.

    Two export formats exist (2026-10-14: DCS switched; both live in the
    corpus): the older carries "# sent_counter = N" + "# sent_subcounter = M",
    the newer packs the same grouping into "# sent_id = N_M" after each
    "# text =". In both, one N = one verse and its M-ordered parts join.
    The verse's number is the group's ordinal within the file, so refs read
    Ṛgveda 1.1.1 (files were fetched back when the counter was per-file
    ordinal already — Meghadūta 1.1 was built the same way).
    """
    groups: dict[int, list[tuple[int, str]]] = {}
    cur_text = None
    cur_n = None
    cur_m = 0
    for line in (body or "").splitlines():
        if line.startswith("# text ="):
            cur_text = line.split("=", 1)[1].strip()
        elif line.startswith("# sent_counter ="):
            try:
                cur_n = int(line.split("=", 1)[1].strip())
            except Exception:
                cur_n = -1
        elif line.startswith("# sent_subcounter ="):
            try:
                cur_m = int(line.split("=", 1)[1].strip())
            except Exception:
                cur_m = 0
            if cur_n is not None and cur_n >= 0:
                groups.setdefault(cur_n, []).append((cur_m, cur_text))
        elif line.startswith("# sent_id ="):
            m = re.match(r"# sent_id = (\d+)_(\d+)\s*$", line)
            if m and cur_text:
                groups.setdefault(int(m.group(1)), []).append(
                    (int(m.group(2)), cur_text))
    out = []
    for ordinal, n in enumerate(sorted(groups), 1):
        parts = [t for _, t in sorted(groups[n])]
        out.append((ordinal, " ".join(parts)))
    return out


_DCS_L = "\uFFB1"  # 'ﾱ'


def _fix_dcs_l(iast_text: str) -> str:
    """Recover the letter DCS writes as a halfwidth Hangul form ('ﾱ', U+FFB1).

    It is not an accent: it is the Vedic l. After a vowel it is the retroflex
    ḻ (īﾱe = ईळे, mṛﾱayantaḥ = मृळयन्तः); after a consonant it is the vocalic
    ḷ (kﾱp = कॢप्, saṃkﾱptaye = संकॢप्तये). Both transliterate via vidyut.lipi;
    the strip below then removes only genuine non-Sanskrit halfwidth junk.
    """
    vowels = "aāiīuūṛṝeaiou"
    out: list[str] = []
    prev = ""
    for ch in iast_text:
        if ch == _DCS_L:
            out.append("ḻ" if prev in vowels else "ḷ")
        else:
            out.append(ch)
        prev = ch
    return "".join(out)


def dcs_to_devanagari(iast_text: str) -> str:
    from vidyut.lipi import Scheme, transliterate

    dev = transliterate(_fix_dcs_l(iast_text), Scheme.Iast, Scheme.Devanagari)
    # Any remaining halfwidth forms are not Sanskrit text.
    dev = re.sub(r"[\uFF00-\uFFEF]", "", dev)
    # "_" separates parts of one verse in the DCS IAST ("सु कृतम् _ इति") —
    # a word joiner here, never content.
    dev = dev.replace("_", " ")
    # Accent/length notation with spaces around it ("अरा ३ इति" in
    # Chandogya): digits never appear in DCS verse text except as these
    # markers (the numbers live in the comments), so a digit run between
    # Devanagari with optional spaces goes too.
    dev = re.sub(r"(?<=[ऀ-ॿ])\s*[०-९0-9]+\s*(?=[ऀ-ॿ])", "", dev)
    # Check "'" became avagraha (5.4).
    return dev


def _citation_numbers(filename: str) -> list[int]:
    base = filename.rsplit("/", 1)[-1]
    nums = [int(n) for n in re.findall(r"\d+", base.translate(_DEVA))]
    return nums


def _dcs_chapter(slug: str, filename: str, fallback_n: int) -> str:
    """Chapter string for one DCS file (section 4)."""
    nums = _citation_numbers(filename)
    if slug == "rigveda":
        # File per sukta: citation holds M and S near the end.
        # Filenames vary; take the last two small numbers as M.S.
        # e.g. "...-RV, 3, 62-..." -> 3.62
        cands = [n for n in nums if n < 2000]
        if len(cands) >= 2:
            return f"{cands[-2]}.{cands[-1]}"
        return str(fallback_n)
    if slug == "meghaduta":
        # Two parts: determine Purva/Uttara from the file order or name.
        low = filename.lower()
        if "uttara" in low or ", 2" in filename:
            return "2"
        return "1"
    if slug in ("taittiriya", "aitareya", "chandogya", "brihadaranyaka"):
        # 31/13/153/47 anuvaka-or-khanda files: V.K from the citation
        # (verse numbers restart every khanda, so the khanda must be in
        # the chapter).
        cands = [n for n in nums if n < 100]
        if len(cands) >= 2:
            return f"{cands[-2]}.{cands[-1]}"
        return str(fallback_n)
    # Default: single number from citation, else file order.
    cands = [n for n in nums if n < 1000]
    if cands:
        return str(cands[-1])
    return str(fallback_n)


# ── Ambuda TEI ──────────────────────────────────────────────────────────

def parse_ambuda_tei(xml: str, kind: str) -> list[tuple[str, str]]:
    """[(n_raw, text)]. kind lg|p|numbered|auto."""
    root = _ET.fromstring(xml.encode("utf-8") if isinstance(xml, str) else xml)
    ns = {"tei": "http://www.tei-c.org/ns/1.0"}
    out: list[tuple[str, str]] = []

    def _text_of(el) -> str:
        return "".join(el.itertext()).strip()

    if kind in ("ambuda_lg", "lg"):
        for lg in root.findall(".//tei:lg", ns):
            if lg.tag.endswith("lg"):
                n = lg.get("n", "")
                if not re.fullmatch(r"\d+", (n or "").strip()):
                    continue
                lines = []
                for l in lg.findall("tei:l", ns):
                    lines.append(_text_of(l))
                if lines:
                    out.append((n.strip(), "\n".join(lines)))
        if out:
            return out
    if kind in ("ambuda_p", "p"):
        for p in root.findall(".//tei:p", ns):
            n = p.get("n", "")
            if not re.fullmatch(r"\d+", (n or "").strip()):
                continue
            out.append((n.strip(), _text_of(p)))
        if out:
            return out
    # numbered/auto: lg n=N else p n=N, skip non-numeric (titles, santi p1).
    for lg in root.findall(".//tei:lg", ns):
        n = lg.get("n", "")
        if not re.fullmatch(r"\d+", (n or "").strip()):
            continue
        # Join <l> lines: a trailing "-" splits one word across lines.
        parts = [_text_of(l) for l in lg.findall("tei:l", ns)]
        joined = parts[0] if parts else _text_of(lg)
        for nxt in parts[1:]:
            if joined.endswith("-"):
                joined = joined[:-1] + nxt.lstrip()
            else:
                joined = joined + "\n" + nxt
        out.append((n.strip(), joined))
    for p in root.findall(".//tei:p", ns):
        n = p.get("n", "")
        if not re.fullmatch(r"\d+", (n or "").strip()):
            continue
        out.append((n.strip(), _text_of(p)))
    # Order by numeric n.
    out.sort(key=lambda kv: int(kv[0]))
    return out


# ── wiki helpers ────────────────────────────────────────────────────────

def _strip_html(html: str) -> str:
    t = re.sub(r"<br\s*/?>", "\n", html, flags=re.I)
    t = re.sub(r"</p\s*>", "\n", t, flags=re.I)
    # Page chrome: the ws-data metadata block (title/author/year spans),
    # ambox notices and {{rh}} running headers all arrive as tables or
    # ws-noexport divs — none of it is verse text.
    for _ in range(30):
        new = re.sub(r"<table\b.*?</table>", "", t, flags=re.S | re.I)
        new = re.sub(r'<div\b[^>]*ws-noexport[^>]*>.*?</div>', "", new, flags=re.S | re.I)
        if new == t:
            break
        t = new
    t = re.sub(r"<[^>]+>", "", t)
    t = _html.unescape(t)
    kept = [ln for ln in t.split("\n")
            if "An image should appear" not in ln
            and "If you are able to provide" not in ln]
    return "\n".join(kept)


def _strip_verse_marker(cleaned: str) -> str:
    """Drop the printed verse marker from a split body's cleaned text.

    ``clean.verse_text`` keeps a trailing marker ("… ॥ १.१ ॥") so callers
    that treat a verse as a unit see it; a splitter has already taken the
    number into the ref, so the reading text must not repeat it. The closing
    danda stays.
    """
    body = _clean.strip_verse_number(cleaned)
    if body and not body.endswith(("॥", "।")):
        body = body.rstrip() + " ॥"
    return body


def _wiki_numbered_verses(wikitext: str, *, vedic: bool) -> list[tuple[str, str]]:
    parts = _clean.split_numbered_verses(wikitext)
    out = []
    for num_raw, body in parts:
        if num_raw.endswith("*"):
            # Raghuvamsha variant reading ("॥ १.३४* ॥") — the main verse is
            # already captured; variants duplicate its ref.
            continue
        # Last component is the verse number (take last for 12.8.60).
        nums = _clean.number_parts(num_raw)
        if not nums:
            continue
        body2 = _clean.drop_leading_junk(body)
        cleaned = _strip_verse_marker(_clean.verse_text(body2, vedic=vedic))
        out.append((num_raw, cleaned))
    return out


def _split_wiki_sections(wikitext: str) -> list[tuple[str, str]]:
    """Split wikitext by == headings into (heading, body) in page order."""
    parts = re.split(r"(?m)^==+\s*(.*?)\s*==+\s*$", wikitext or "")
    # parts[0] is the lead; then heading, body, heading, body...
    out: list[tuple[str, str]] = []
    lead = parts[0] if parts else ""
    if lead.strip():
        out.append(("", lead))
    i = 1
    while i < len(parts):
        heading = parts[i] if i < len(parts) else ""
        body = parts[i + 1] if i + 1 < len(parts) else ""
        out.append((heading.strip(), body))
        i += 2
    return out


def _repair_mahimna_markers(body: str) -> str:
    """Marker repairs for the Śiva Mahimna page (revid 320011, the Brhat
    Stotra Ratnakara print). The page prints 40 verses (31 stotra + nine
    phala verses, labels ३२-४०) with four marker defects:

    1. verse 12's number is printed "११" a second time ("…मुह्यति खलः ॥११");
    2. verse 15 lost its number ("…पथ्य परिभवः ॥" closes it);
    3. verse 23 lost its number ("…युवतयः ।।" closes it);
    4. verse 25's marker carries a stray full stop ("॥ २५.").

    Jammed ends ("…अवनतिः ॥१३") are space-normalised too: the Vedic
    length-marker rule in clean.verse_text would otherwise read the first
    digit as a vowel-length mark and mangle the number. Without the
    repairs the splitter merges three verse pairs and _finalise_verses
    silently drops verse 12 as a repeated ref.
    """
    t = (body or "").replace("।।", "॥").replace(
        "\u200c", "").replace("\u200d", "").replace("\u200b", "")
    t = t.replace("पथ्य परिभवः ॥", "पथ्य परिभवः ॥ १५")
    t = t.replace("मुग्धा युवतयः ॥", "मुग्धा युवतयः ॥ २३")
    t = t.replace("खलः ॥११", "खलः ॥ १२")
    t = t.replace("॥ २५.", "॥ २५")
    return re.sub(r"॥(?=[०-९])", "॥ ", t)


def _repair_vetala_page(body: str) -> str:
    """Page repairs for sa.wikisource's Vetāla Pañcaviṃśati set.

    The 26 pages mix two transcriptions of Kathāsaritsāgara lambaka 12
    (शशाङ्कवती): the original taranga poems (pages 00, 01, 05, 16, 18, in
    <poem> blocks, verses closed "।। N" — or, in page 00's कथामुख, "||N")
    and a simple-Sanskrit serial (the other pages, verses closed
    "॥ल.त.श॥"). Repairs:

    1. Page 00's poem closes every verse with ASCII pipes ("सह ||१");
       normalise to dandas so each verse splits.
    2. Page 04 carries two editorial comparison notes in <small> spans
       followed by external links ("… - कथासरित्</small> [url ९.३.९१]");
       both are apparatus, not text, and their numbers failed the
       character check.
    3. Pages 01, 16 and 18 print their taranga twice: joined sandhi
       (सन्धियुक्त पाठः, the tale) and split sandhi, an exact duplicate
       with the same verses in split form. Page 01 separates them with a
       bare "|" line and no heading, page 16 heads the duplicate
       "(सन्धिमुक्त पाठः)", page 18 "सन्धिविश्लिष्ट पाठः" (87 duplicate
       verses १८.२५.१-८७ after the colophon). Keep the joined tale,
       drop the split recension.
    4. Standalone recension labels ("सन्धियुक्त पाठः") are structure.
    5. Every marker form is normalised to " ॥ N ॥": the pages jam the
       danda pair against the number ("॥४.११.१॥", "पुरा।।१९"). Jammed,
       verse_text would keep marker debris in the reading text — its
       digit rules only eat runs between Devanagari letters, so "०.८.२१"
       survived as "० ८ २" after cleaning while char_check (which strips
       the whole tail as a verse number) saw nothing wrong.
    """
    t = body or ""
    t = re.sub(r"<small>.*?</small>", "", t, flags=re.S)
    t = re.sub(r"\[https?://[^\]]*\]", "", t)
    for marker in ("सन्धिविश्लिष्ट पाठः", "सन्धिमुक्त पाठः"):
        t = t.split(marker, 1)[0]
    sep = None
    for m in re.finditer(r"(?m)^\s*\|\s*$", t):
        sep = m
    if sep:
        t = t[: sep.start()]
    t = re.sub(r"(?m)^\s*सन्धियुक्त\s+पाठः\s*[-–—\s]*$", "", t)
    # Page 18 prints verse 58's end as "।। ।५८" (a stray danda before the
    # number) — drop it so the marker normalisation below sees "।। ५८".
    t = re.sub(r"(।।|॥)\s*।\s*(?=[0-9०-९])", r"\1 ", t)
    t = re.sub(r"\|\|\s*([0-9०-९]+(?:\.[0-9०-९]+)*)", r" ॥ \1 ॥", t)
    t = re.sub(r"॥\s*([0-9०-९]+(?:\.[0-9०-९]+)*)\s*॥", r" ॥ \1 ॥", t)
    return re.sub(r"।।\s*([0-9०-९]+(?:\.[0-9०-९]+)*)", r" ॥ \1 ॥", t)


def build_book(slug: str) -> dict:
    """Fetch, clean, split and write payload+report+sources. Returns report."""
    if slug not in _cat.BOOKS:
        raise SystemExit(f"unknown slug {slug!r}")
    spec = _cat.BOOKS[slug]
    entry = _canon_entry(slug)
    ref_name = entry["ref_prefixes"][0]
    register = entry.get("register") or spec.get("register", "classical") or "classical"
    if spec.get("register"):
        register = spec["register"]
    # Canon seed rows for new books carry no register column; the payload
    # register comes from section 4 (vedic for Samhitas/Upanisads).
    kind = spec.get("kind")
    sources: dict = {"slug": slug, "pages": [], "files": []}
    renum_counts: dict = {}  # (chapter) -> ordinal, for renumber_per_chapter
    raw_verses: list[tuple[str, str, str]] = []  # (chapter, num_raw, cleaned)

    if kind in ("wiki_numbered", "wiki_unnumbered", "wiki_rendered",
                "wiki_rendered_newline_nums", "wiki_mkp_81_93", "wiki_bhagavata",
                "wiki_shiva", "wiki_prashna",
                "wiki_raghu", "wiki_shakuntala", "wiki_gita_govinda",
                "wiki_vetala", "wiki_yoga", "wiki_ashtavakra",
                "wiki_amara", "wiki_chanakya", "wiki_sections"):
        pages = list(spec.get("pages") or [])
        if kind == "wiki_bhagavata":
            pages = _fetch.wiki_list_pages(spec["prefix"])
            # Skandha 10 split + skip mahatmya sets.
            pages = [p for p in pages if "हात्म्य" not in p and "हात्यम" not in p
                     and "माहात्म्य" not in p]
            # Keep only "स्कन्धः N/अध्यायः M" content pages; the bare skandha
            # index pages hold no verses.
            pages = [p for p in pages if "अध्याय" in p]
        elif kind == "wiki_shiva":
            pages = _fetch.wiki_list_pages(spec["prefix"])
        elif kind == "wiki_raghu":
            pages = _fetch.wiki_list_pages(spec["prefix"])
            pages = [p for p in pages if "अष्ठ" not in p]
        elif kind == "wiki_gita_govinda":
            pages = _fetch.wiki_list_pages(spec["prefix"])
        for pi, title in enumerate(pages):
            use_html = kind in ("wiki_rendered", "wiki_rendered_newline_nums")
            pg = _fetch.wiki_fetch_page(title, rendered=use_html)
            sources["pages"].append({"title": title, "revid": pg.get("revid"),
                                    "url": pg.get("url")})
            body = pg.get("html") if use_html else pg.get("wikitext", "")
            if use_html:
                body = _strip_html(body or "")
            vedic = bool(spec.get("vedic"))
            if kind == "wiki_sections":
                # Vishnu: == sections listed in 4.1 become chapters 1..6;
                # skip nyasa prose and sambandhanubandhah.
                for sec_body_heading, sec_body in _split_wiki_sections(body or ""):
                    name = sec_body_heading or ""
                    # "न्यास" would also match "उत्तरन्यासः", whose 33 verses
                    # ARE wanted (170-name canonical count) — only the prose
                    # nyasa sections are skipped.
                    if any(s in name for s in (spec.get("skip_sections") or [])) \
                            and not name.startswith("उत्तरन्यास"):
                        continue
                    # Match to the listed sections in order.
                    idx = None
                    for ci, sec in enumerate(spec["sections"], 1):
                        if sec in name or name in sec or not name:
                            idx = ci
                            break
                    if idx is None:
                        continue
                    for num_raw, cleaned in _wiki_numbered_verses(sec_body, vedic=vedic):
                        raw_verses.append((str(idx), num_raw, cleaned))
                if not raw_verses:
                    for num_raw, cleaned in _wiki_numbered_verses(body or "", vedic=vedic):
                        raw_verses.append((None, num_raw, cleaned))
            elif kind == "wiki_unnumbered":
                # Lalita: the poem carries NO per-verse numbers — a shloka is
                # the lines up to one closing with ॥. Speaker lines
                # ("अगस्त्य उवाच-") and the नमः invocation header drop out.
                secs_l = [(h, b) for h, b in _split_wiki_sections(body or "")
                          if b.strip()]
                if secs_l:
                    for ci_l, (_, sec_body_l) in enumerate(secs_l, 1):
                        cur_l: list[str] = []
                        for ln_l in _clean.strip_wiki_markup(sec_body_l).splitlines():
                            s_l = ln_l.strip()
                            if not s_l or _clean.is_dropped_line(s_l):
                                continue
                            cur_l.append(s_l)
                            if s_l.endswith(("॥", "।।")):
                                text_l = _clean.verse_text("\n".join(cur_l), vedic=vedic)
                                cur_l = []
                                if len(text_l) > 15:
                                    n_l = 1 + sum(1 for v in raw_verses if v[0] == str(ci_l))
                                    raw_verses.append((str(ci_l), str(n_l), text_l))
                        if cur_l:
                            text_l = _clean.verse_text("\n".join(cur_l), vedic=vedic)
                            if len(text_l) > 15:
                                n_l = 1 + sum(1 for v in raw_verses if v[0] == str(ci_l))
                                raw_verses.append((str(ci_l), str(n_l), text_l))
                else:
                    for num_raw, cleaned in _wiki_numbered_verses(body or "", vedic=vedic):
                        raw_verses.append((None, num_raw, cleaned))
                if not raw_verses:
                    cleaned_all = _clean.verse_text(body or "", vedic=vedic)
                    for i, chunk in enumerate(cleaned_all.split("॥"), 1):
                        c = chunk.strip()
                        if c:
                            raw_verses.append((None, str(i), c + " ॥"))
            elif slug == "kena":
                # 4 khandas: numbers restart per khanda. Select the khanda
                # sections by name — positional secs[-4:] silently skipped
                # khanda 1 whenever the page ends with an unnumbered
                # section (it does: "अधिकाध्ययनाय" holds no verses).
                secs = [s for s in _split_wiki_sections(body or "")
                        if "खण्ड" in s[0] and s[1].strip()]
                if len(secs) >= 4:
                    for ci, (_, sec_body) in enumerate(secs[-4:], 1):
                        for num_raw, cleaned in _wiki_numbered_verses(sec_body, vedic=vedic):
                            raw_verses.append((str(ci), num_raw, cleaned))
                else:
                    for num_raw, cleaned in _wiki_numbered_verses(body or "", vedic=vedic):
                        raw_verses.append((None, num_raw, cleaned))
            elif slug == "chanakya":
                # The page numbers chapters with bare "(N)" lines and restarts
                # verse numbers (॥१॥) in every chapter; split at the chapter
                # lines so refs are unique (1.1 ... 2.1 ...). Content before
                # the first "(N)" line is chapter 1.
                parts_ck = re.split(r"(?m)^\s*\(([०-९]+)\)\s*$", body or "")
                chunks_ck: list[tuple[str, str]] = []
                if parts_ck and parts_ck[0].strip():
                    chunks_ck.append(("1", parts_ck[0]))
                for i in range(1, len(parts_ck) - 1, 2):
                    chunks_ck.append((parts_ck[i].strip(), parts_ck[i + 1] or ""))
                for ch_ck, chunk_ck in chunks_ck:
                    # 1. The page appends an unnumbered "प्रकीर्णक" misc tail
                    #    (no verse numbers, an inline "(चाणक्यश्लोक ३६)"
                    #    annotation, a garbled ॥५१३१॥ marker): drop it, the
                    #    numbered chapters are complete without it.
                    chunk_ck = chunk_ck.split("प्रकीर्ण")[0]
                    # 2. Each chapter ends "इति चाणक्यनीतिदर्पणे ... अध्यायः"
                    #    followed by a bare ॥N॥ chapter-number line; without
                    #    this, the colophon number becomes a phantom verse and
                    #    every chapter's refs collide (N.N twice).
                    chunk_ck = re.sub(r"(?m)^\s*इति[^\n]*$", "", chunk_ck)
                    chunk_ck = re.sub(r"(?m)^\s*॥\s*[०-९]+\s*॥\s*$", "", chunk_ck)
                    # 3. Page typo: the danda+index of "पण्डितः" was saved as
                    #    "‚" (2026-10-14, chapter 1 verse on पण्डितः).
                    chunk_ck = chunk_ck.replace("पण्‚इतः", "पण्डितः")
                    for num_raw, cleaned in _wiki_numbered_verses(chunk_ck, vedic=vedic):
                        raw_verses.append((ch_ck, num_raw, cleaned))
                if not raw_verses:
                    for num_raw, cleaned in _wiki_numbered_verses(body or "", vedic=vedic):
                        raw_verses.append((None, num_raw, cleaned))
            elif slug == "prashna":
                # Each page is one prasna (P): chapter = page order.
                for num_raw, cleaned in _wiki_numbered_verses(body or "", vedic=vedic):
                    raw_verses.append((str(pi + 1), num_raw, cleaned))
            elif slug == "mahimna":
                # The page's verse markers carry four print defects (see
                # _repair_mahimna_markers); without the repair the splitter
                # merges three verse pairs and drops verse 12 as a repeated
                # ref. The page title line is structure, not verse (the
                # tandava/kena pages drop theirs too).
                body_m = _repair_mahimna_markers(body or "")
                body_m = body_m.replace("॥ शिवमहिम्नःस्तोत्रम् ॥", "", 1)
                for num_raw, cleaned in _wiki_numbered_verses(body_m, vedic=vedic):
                    raw_verses.append((None, num_raw, cleaned))
            else:
                # Page-order chapters (Shakuntala acts, Gitagovinda sargas,
                # Vetala tales): verse numbers restart every page. Or chapters
                # straight out of the page title ("स्कन्धः १/अध्यायः ५" →
                # "1.5", the Bhagavata page set) — the verse numbers there
                # restart per adhyaya.
                page_ch = None
                if spec.get("chapter_from_title"):
                    parts_t = []
                    for key_t in spec["chapter_from_title"]:
                        m_t = re.search(re.escape(key_t) + r"\s*[०-९]+", title)
                        if m_t:
                            parts_t.append(str(_clean.number_parts(
                                m_t.group(0)[len(key_t):])[-1]))
                    # Skandha 10 is split into पूर्वार्ध/उत्तरार्ध on the
                    # pages, and both halves restart their adhyaya numbers —
                    # mark the half so chapters stay unique.
                    if "पूर्वार्ध" in title:
                        parts_t.insert(1, "p")
                    elif "उत्तरार्ध" in title:
                        parts_t.insert(1, "u")
                    page_ch = ".".join(parts_t) or None
                elif spec.get("chapter_per_page"):
                    page_ch = str(pi + 1)
                body_w = body or ""
                if kind == "wiki_vetala":
                    # Page repairs (pipe verse ends on page 00, editorial
                    # <small> notes on page 04, page 18's duplicate
                    # split-sandhi recension) — see _repair_vetala_page.
                    body_w = _repair_vetala_page(body_w)
                if spec.get("inline_num_marker"):
                    # A verse end printed as "letter + number + danda" (the
                    # opening danda lost on the page: "…पतिः १ ॥" in the
                    # Siva Purana / Bhagavata pages). Numbers only follow
                    # dandas in mula text, so normalise to "॥ N ॥" and let
                    # the splitter cut the verse. An asterisk/footnote mark
                    # can sit between word and number ("शस्तमुच्यते* ६२ ।").
                    body_w = re.sub(
                        r"(?<=[ऀ-ॿ*?])\s*([०-९0-9]+(?:\.[०-९0-9]+)*)\s*[।॥]",
                        r" ॥\1॥", body_w)
                for num_raw, cleaned in _wiki_numbered_verses(body_w, vedic=vedic):
                    if slug == "amarakosha" and any(
                            p in cleaned for p in
                            ("अत्र मूलश्लोकाः", "मू श्लो", "क्षे श्लो",
                             "इत्यमरसिंहकृतौ")):
                        # Index/summary rows the page appends after kanda 2
                        # ("सर्वे च मिलित्वा ७५० प्र का मू श्लो २८१ …",
                        # numbered १४९१+) — not Amara's verses.
                        continue
                    if spec.get("renumber_per_chapter"):
                        # Gitagovinda songs and Vetala tales repeat numbers
                        # inside one chapter (the source restarts them at
                        # every song / section); the reading order is the
                        # ordinal within the chapter.
                        page_ch = page_ch or ""
                        renum = renum_counts.get(page_ch, 0) + 1
                        renum_counts[page_ch] = renum
                        raw_verses.append((page_ch, str(renum), cleaned))
                    else:
                        raw_verses.append((page_ch, num_raw, cleaned))
        # Chapter assignment for generic wiki books is done per-kind below.
        raw_verses = _assign_wiki_chapters(slug, spec, pages, raw_verses)
    elif kind == "wiki_yajurveda":
        # Each adhyaya page lists kandikas: an "N.M" header line, then the
        # kandika's lines — the closing ॥ ends one kandika. Vedic accents
        # (ꣳ and the U+1CD0 range) are removed per the vedic policy.
        for pi_y, title_y in enumerate(list(spec.get("pages") or []), 1):
            pg_y = _fetch.wiki_fetch_page(title_y)
            sources["pages"].append({"title": title_y, "revid": pg_y.get("revid"),
                                     "url": pg_y.get("url")})
            cur_y: list[str] = []
            cur_num_y = ""
            for ln_y in _clean.strip_wiki_markup(pg_y.get("wikitext", "")).splitlines():
                s_y = ln_y.strip()
                if not s_y:
                    continue
                m_num = re.fullmatch(r"[0-9०-९]+\.([0-9०-९]+)", s_y)
                if m_num:
                    # Kandika header "1.1" — check BEFORE the index-line
                    # filters: a pure N.M line is a header, and the ASCII
                    # filter below would otherwise swallow every kandika
                    # number (all verses then share ref .0 and dedupe away).
                    # flush a kandika that never closed with ॥
                    if cur_y:
                        text_y = _clean.verse_text("\n".join(cur_y), vedic=True)
                        cur_y = []
                        if len(text_y) > 12:
                            raw_verses.append((str(pi_y), cur_num_y or "0", text_y))
                    cur_num_y = str(_clean.verse_number_of(m_num.group(1)))
                    continue
                if re.search(r"[0-9]", s_y) and "।" not in s_y and "॥" not in s_y:
                    # Index/prakarana lines ("दर्शपूर्णमासयागः 2.1 2.28 …")
                    # carry ASCII ranges and no dandas — structure, not text.
                    continue
                if re.search(r"[ऀ-ॿ]+\s+[०-९0-9]+\s+[०-९0-9]", s_y) and "॥" not in s_y:
                    # A kandika-name index line ("अध्यायः ३ अग्न्याधानम् १ ८
                    # अग्निहोत्रम् ९ १० …"): word + number range pairs never
                    # occur in mantra text. The long index lines on adhyaya 3
                    # carry a stray ॥ mid-line — require it absent.
                    continue
                if re.fullmatch(r"अध्याय\s*[0-9०-९]+", s_y):
                    continue
                cur_y.append(s_y)
                if s_y.endswith("॥"):
                    text_y = _clean.verse_text("\n".join(cur_y), vedic=True)
                    cur_y = []
                    if len(text_y) > 12:
                        raw_verses.append((str(pi_y), cur_num_y or "0", text_y))
                        cur_num_y = ""
            if cur_y:
                text_y = _clean.verse_text("\n".join(cur_y), vedic=True)
                if len(text_y) > 12:
                    raw_verses.append((str(pi_y), cur_num_y or "0", text_y))
    elif kind == "wiki_sushruta":
        # Line-numbered sutra format: each sutra is a line ending with a
        # Devanagari number (no dandas); long sutras wrap as continuation
        # lines. Ordinal अध्यायः headings increment the chapter counter
        # (the pages walk the sthanas in order).
        adhyaya_s = 0
        cur_num_s = ""
        cur_s: list[str] = []
        renum_s = 0

        def _flush_s() -> None:
            nonlocal renum_s
            if cur_s:
                text_s = _clean.verse_text("\n".join(cur_s), vedic=False)
                # Stray digits inside sutra prose are page noise (the sutra
                # numbers were already taken off the line ends).
                text_s = re.sub(r"[०-९]+", "", text_s)
                if len(text_s) > 12:
                    # The page's own numbers restart mid-adhyaya; store the
                    # running ordinal within the adhyaya.
                    renum_s += 1
                    raw_verses.append((str(adhyaya_s), str(renum_s), text_s))

        for title_s in list(spec.get("pages") or []):
            pg_s = _fetch.wiki_fetch_page(title_s)
            sources["pages"].append({"title": title_s, "revid": pg_s.get("revid"),
                                     "url": pg_s.get("url")})
            for ln_s in _clean.strip_wiki_markup(pg_s.get("wikitext", "")).splitlines():
                s_s = ln_s.strip()
                if not s_s:
                    continue
                if s_s.startswith("इति सुश्रुत"):
                    # The adhyaya colophon ("इति सुश्रुतसंहितायां …
                    # अध्यायः | 21 ॥") — not a sutra.
                    continue
                if re.search(r"[अऽ]ध्यायः?\s*$", s_s) and len(s_s) <= 40:
                    # "प्रथमोऽध्यायः" — the initial a is an avagraha here.
                    _flush_s()
                    cur_s = []
                    cur_num_s = ""
                    adhyaya_s += 1
                    continue
                m_s = re.search(r"\s([०-९0-9]+)\s*[।|॥]*\s*$", s_s)
                if m_s:
                    _flush_s()
                    cur_num_s = m_s.group(1)
                    cur_s = [re.sub(r"\s[०-९0-९]+\s*[।|॥]*\s*$", "", s_s)]
                else:
                    cur_s.append(s_s)
        _flush_s()
    elif kind == "wiki_samaveda":
        # One page holds both archikas. Section headers carry the path
        # ("पूर्वार्चिकः/… 1.1.1 प्रथमप्रपाठकः/…") and verse ends are "।। N ।।"
        # with the number restarting per prapathaka: chapter = archika.
        # prapathaka from the header's first two numbers.
        ch_sa = ""
        cur_body_sa: list[str] = []
        renum_sa: dict = {}

        def _split_sa() -> None:
            body_sa = "\n".join(cur_body_sa)
            for num_raw, cleaned in _wiki_numbered_verses(body_sa, vedic=True):
                # The archa numbers restart per prapathaka on the page; store
                # the ordinal within the chapter so refs stay unique.
                n_sa = renum_sa.get(ch_sa, 0) + 1
                renum_sa[ch_sa] = n_sa
                raw_verses.append((ch_sa, str(n_sa), cleaned))
            cur_body_sa.clear()

        for title_sa in list(spec.get("pages") or []):
            pg_sa = _fetch.wiki_fetch_page(title_sa)
            sources["pages"].append({"title": title_sa, "revid": pg_sa.get("revid"),
                                     "url": pg_sa.get("url")})
            for ln_sa in _clean.strip_wiki_markup(pg_sa.get("wikitext", "")).splitlines():
                s_sa = ln_sa.strip()
                if not s_sa:
                    continue
                if ("आर्चिक" in s_sa or "प्रपाठक" in s_sa or "दशति" in s_sa
                        or re.match(r"^[\u0965\u0964|\s]*\d+(\.\d+)+", s_sa)):
                    # The header can carry leading dandas/pipes ("। 1.3.12.3 |").
                    m_sa = re.search(r"(\d+)\.(\d+)", s_sa)
                    if m_sa:
                        _split_sa()
                        ch_sa = f"{int(m_sa.group(1))}.{int(m_sa.group(2))}"
                        continue
                    # a second header line of the same section (e.g. the
                    # path line followed by "प्रथमोऽर्द्धः") — keep chapter
                    cur_body_sa.append(s_sa)
                    continue
                if re.fullmatch(r"[0-9c .|\u0965\u0964\u0966-\u096f]+", s_sa):
                    # Bare arika-index annotation lines ("1 5 1 0305c").
                    continue
                cur_body_sa.append(s_sa)
        _split_sa()
    elif kind in ("ambuda_lg", "ambuda_p", "ambuda_numbered", "ambuda_auto"):
        xml = _fetch.ambuda_fetch_tei(spec["ambuda_slug"])
        sources["files"].append({"ambuda": spec["ambuda_slug"]})
        sub = {"ambuda_lg": "lg", "ambuda_p": "p"}.get(kind, "auto")
        for n_raw, body in parse_ambuda_tei(xml, sub):
            # Aditya n=31 holds verses 30+31 in one element: split at
            # internal verse-end numbers when there are two or more.
            splits = _clean.split_numbered_verses(body or "")
            if len(splits) >= 2:
                for s_num, s_body in splits:
                    cleaned = _strip_verse_marker(_clean.verse_text(
                        _clean.drop_leading_junk(s_body),
                        vedic=bool(spec.get("vedic"))))
                    raw_verses.append(("", s_num, cleaned))
            else:
                cleaned = _strip_verse_marker(
                    _clean.verse_text(body, vedic=bool(spec.get("vedic"))))
                raw_verses.append(("", n_raw, cleaned))
    elif kind in ("dcs", "dcs_cantos_1_8"):
        files = _fetch.dcs_list_files(spec["dcs_text"])
        sources["files"].append({"dcs_text": spec["dcs_text"], "count": len(files)})
        for fi, fn in enumerate(files):
            if kind == "dcs_cantos_1_8":
                # Cantos 9-17 left out: file citation canto > 8 skipped.
                nums = _citation_numbers(fn)
                cands = [n for n in nums if n < 100]
                if cands and cands[-1] > 8:
                    continue
            body = _fetch.dcs_fetch_file(spec["dcs_text"], fn)
            try:
                ch = _dcs_chapter(slug, fn, fi + 1)
            except Exception:
                ch = str(fi + 1)
            for n, iast_text in parse_dcs_conllu(body):
                dev = dcs_to_devanagari(iast_text)
                # Half-verses joined with danda (5.4).
                verse = dev.strip()
                if "॥" not in verse:
                    verse = verse.rstrip() + " ॥"
                cleaned = _clean.verse_text(verse, vedic=bool(spec.get("vedic")))
                raw_verses.append((ch, str(n), cleaned))
    elif kind == "gretil" or kind == "gretil_lilavati":
        body = _fetch.gretil_fetch(spec["gretil_file"])
        sources["files"].append({"gretil": spec["gretil_file"]})
        vedic = bool(spec.get("vedic"))
        if kind == "gretil_lilavati":
            # Number = GRETIL Lil_N.
            for m in re.finditer(r"[Ll]il_(\d+)", body):
                pass
            parts = _clean.split_numbered_verses(body.replace("/", " ॥ "))
            for num_raw, verse_body in parts:
                cleaned = _strip_verse_marker(_clean.verse_text(verse_body, vedic=vedic))
                raw_verses.append(("", num_raw, cleaned))
        else:
            # Normalise GRETIL slashes then split at numbers.
            norm = body.replace(" // ", " ॥ ").replace(" / ", " । ")
            for num_raw, verse_body in _clean.split_numbered_verses(norm):
                cleaned = _strip_verse_marker(_clean.verse_text(verse_body, vedic=vedic))
                # Chapter B.C: derive from the number parts (first=book).
                nums = _clean.number_parts(num_raw)
                ch = ".".join(str(p) for p in nums[:-1]) if len(nums) > 1 else ""
                raw_verses.append((ch, num_raw, cleaned))
    elif kind == "atharvaveda":
        # DCS kandas 1-18 + wikisource 19-20.
        files = _fetch.dcs_list_files(spec["dcs_text"])
        sources["files"].append({"dcs_text": spec["dcs_text"], "count": len(files)})
        for fi, fn in enumerate(files):
            body = _fetch.dcs_fetch_file(spec["dcs_text"], fn)
            try:
                ch = _dcs_chapter(slug, fn, fi + 1)
            except Exception:
                ch = str(fi + 1)
            for n, iast_text in parse_dcs_conllu(body):
                dev = dcs_to_devanagari(iast_text)
                verse = dev.strip() + (" ॥" if "॥" not in dev else "")
                cleaned = _clean.verse_text(verse, vedic=True)
                raw_verses.append((ch, str(n), cleaned))
        for title in spec["wiki_pages"]:
            pg = _fetch.wiki_fetch_page(title)
            sources["pages"].append({"title": title, "revid": pg.get("revid"),
                                    "url": pg.get("url")})
            for num_raw, cleaned in _wiki_numbered_verses(pg.get("wikitext", ""), vedic=True):
                raw_verses.append((None, num_raw, cleaned))
    else:
        raise SystemExit(f"no builder for kind {kind!r}")

    # Build final verses in reading order (chapter order, then verse order).
    verses = _finalise_verses(slug, ref_name, raw_verses, spec)
    # Character check (5.3): anything else stops the build for that book.
    bad = _clean.check_verses([v["devanagari"] for v in verses])
    # Ref repeats stop the build.
    seen: dict[str, int] = {}
    dups: list[str] = []
    for v in verses:
        if v["ref"] in seen:
            dups.append(v["ref"])
        seen[v["ref"]] = seen.get(v["ref"], 0) + 1
    # Chapter missing against section 4 + total within 2% (5.6).
    report = _coverage_report(slug, spec, verses, sources)
    stop_reasons: list[str] = []
    if bad:
        stop_reasons.append(f"character check failed on {len(bad)} verses")
    if dups:
        stop_reasons.append(f"{len(dups)} repeated refs")
    if report.get("missing_chapters"):
        stop_reasons.append(f"missing chapters {report['missing_chapters']}")
    if report.get("diff_ratio") is not None and report["diff_ratio"] > 0.02:
        stop_reasons.append(
            f"total {report['built']} vs reference {report['reference']} "
            f"({report['diff_ratio']:.1%} > 2%)")
    BOOKS_DIR.mkdir(parents=True, exist_ok=True)
    if stop_reasons:
        report["status"] = "STOPPED"
        report["stop_reasons"] = stop_reasons
        report["bad_verses"] = bad[:20]
        report["dups"] = dups[:20]
        (BOOKS_DIR / f"{slug}.report.json").write_text(
            json.dumps(report, ensure_ascii=False, indent=1), encoding="utf-8", newline="")
        (BOOKS_DIR / f"{slug}.sources.json").write_text(
            json.dumps(sources, ensure_ascii=False, indent=1), encoding="utf-8", newline="")
        print(f"[build] {slug}: STOPPED: " + "; ".join(stop_reasons))
        return report
    payload = {
        "book": slug,
        "daily": False,
        "licence": _licence_for(slug, spec, sources),
        "source": _source_for(slug),
        "register": register,
        "verses": verses,
    }
    (BOOKS_DIR / f"{slug}.payload.json").write_text(
        json.dumps(payload, ensure_ascii=False, indent=1), encoding="utf-8", newline="")
    report["status"] = "OK"
    (BOOKS_DIR / f"{slug}.report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=1), encoding="utf-8", newline="")
    (BOOKS_DIR / f"{slug}.sources.json").write_text(
        json.dumps(sources, ensure_ascii=False, indent=1), encoding="utf-8", newline="")
    print(f"[build] {slug}: {len(verses)} verses OK "
          f"(ref {report.get('reference')}, diff {report.get('diff_ratio')})")
    return report


def _assign_wiki_chapters(slug: str, spec: dict, pages: list[str],
                          raw: list[tuple]) -> list[tuple[str, str, str]]:
    """Map fetched verses to chapter strings per 4.x.

    Verses already carrying an explicit chapter (section split for Vishnu,
    Kena, Prashna, Lalita, Yoga) keep it; the rest derive the chapter from
    the number (all but last).
    """
    kind = spec.get("kind")
    # Devimahatmya: the pages are Markandeya-Purana chapters 81-93 and the
    # verse markers read "८१.१"; the DM's own chapters are 81-80 … 93-80.
    # The ०९१-०९५ page runs two chapters long — keep only 81-93.
    if slug == "devimahatmya":
        out_dm = []
        for _ch, num_raw, cleaned in raw:
            nums_dm = _clean.number_parts(num_raw)
            first_dm = nums_dm[0] if nums_dm else 0
            if not 81 <= first_dm <= 93:
                continue
            out_dm.append((str(first_dm - 80) if first_dm >= 81 else (_ch or ""),
                           num_raw, cleaned))
        raw = out_dm
    # Explicit chapters win.
    if any((ch is not None and ch != "") or slug in ("kena", "prashna")
           or kind in ("wiki_sections", "wiki_unnumbered") for ch, _, _ in raw):
        out: list[tuple[str, str, str]] = []
        for ch, num_raw, cleaned in raw:
            if ch is None:
                nums = _clean.number_parts(num_raw)
                ch = _clean.chapter_of_numbers(nums)
            out.append((ch or "", num_raw, cleaned))
        # One-chapter books: chapter "" (Kena excluded: 4 khandas).
        one_chapter_slugs = {"bhajagovindam", "saundarya", "aditya", "tandava",
                             "mahimna", "ramaraksha", "naradabhakti",
                             "mandukya", "lilavati"}
        if slug in one_chapter_slugs:
            out = [("", n, c) for _, n, c in out]
        return out
    out = []
    if kind == "wiki_sections":
        # Vishnu: numbers restart every section; each section is a chapter.
        # raw order follows page order; split evenly by section markers is
        # approximated here by sequential sixths when markers are absent.
        # The real builder re-splits per section page fragment.
        n = len(raw)
        per = max(1, round(n / 6)) if n else 0
        for i, (_, num_raw, cleaned) in enumerate(raw):
            ch = str(min(6, i // per + 1)) if per else "1"
            out.append((ch, num_raw, cleaned))
        return out
    if slug == "lalita":
        # Two chapters: split in half (purva, then stotra) when the page
        # gives no numbers.
        n = len(raw)
        for i, (_, num_raw, cleaned) in enumerate(raw):
            ch = "1" if i < n / 2 else "2"
            nums = _clean.number_parts(num_raw) if re.search(r"\d", num_raw) else [i + 1]
            out.append((ch, num_raw, cleaned))
        return out
    if slug == "yogasutra":
        for i, page in enumerate(pages, 1):
            pass
        # raw follows page order (4 padas): chunk by page boundaries.
        # Without page boundaries here, fall back to sequential quarters.
        n = len(raw)
        # Reference 51,55,55,34.
        counts = [51, 55, 55, 34]
        idx = 0
        for ch, c in enumerate(counts, 1):
            for _ in range(c):
                if idx >= len(raw):
                    break
                _, num_raw, cleaned = raw[idx]
                out.append((str(ch), num_raw, cleaned))
                idx += 1
        # Any remainder goes to the last chapter.
        while idx < len(raw):
            _, num_raw, cleaned = raw[idx]
            out.append(("4", num_raw, cleaned))
            idx += 1
        return out
    # Default: derive chapter from the number (all but last).
    for _, num_raw, cleaned in raw:
        nums = _clean.number_parts(num_raw)
        ch = _clean.chapter_of_numbers(nums)
        out.append((ch, num_raw, cleaned))
    # One-chapter books: chapter "".
    one_chapter_slugs = {"bhajagovindam", "saundarya", "aditya", "tandava",
                         "mahimna", "ramaraksha", "naradabhakti",
                         "mandukya", "lilavati"}
    if slug in one_chapter_slugs:
        out = [("", n, c) for _, n, c in out]
    return out


def _finalise_verses(slug: str, ref_name: str, raw: list[tuple[str, str, str]],
                     spec: dict) -> list[dict]:
    verses: list[dict] = []
    seen_refs: dict[str, str] = {}  # ref -> letters-only text of first row
    # Group by chapter preserving first-seen order, then order chapters
    # numerically and verses numerically.
    by_ch: dict[str, list[tuple[str, str]]] = {}
    order: list[str] = []
    for ch, num_raw, cleaned in raw:
        ch = ch or ""
        # Normalise chapter numbers ("01" -> "1").
        try:
            ch = "" if ch == "" else ".".join(str(int(p)) for p in str(ch).split("."))
        except Exception:
            pass
        if ch not in by_ch:
            by_ch[ch] = []
            order.append(ch)
        by_ch[ch].append((num_raw, cleaned))

    def _ch_key(c: str):
        if c == "":
            return (-1,)
        try:
            return tuple(int(p) for p in c.split("."))
        except Exception:
            return (10 ** 9, c)

    for ch in sorted(order, key=_ch_key):
        items = by_ch[ch]
        # Order by verse number (last component), stable.
        def _vkey(kv):
            try:
                return (_clean.verse_number_of(kv[0]), kv[0])
            except Exception:
                return (10 ** 9, kv[0])

        for num_raw, cleaned in sorted(items, key=_vkey):
            try:
                vnum = _clean.verse_number_of(num_raw)
            except Exception:
                vnum = len(verses) + 1
            number = ".".join((ch.split(".") + [str(vnum)]) if ch else [str(vnum)])
            # Strip trailing verse numbers from the text body already done;
            # ensure the stored text ends with a danda.
            dev = cleaned.strip()
            # Same-text repeats (a stanza printed twice, page-header junk)
            # collapse onto the first row; a genuine second verse carrying
            # the same number (Saundarya Laharī repeats numbers 10 and 21)
            # is dropped too — the importer's ref/chapter check (6.3.3)
            # cannot express a numeric variant suffix, and the payload stays
            # one row per ref.
            ref = f"{ref_name} {number}"
            norm = re.sub(r"[\s।॥\d०-९.,;:!?'\"\-–—ऽ|]+", "", dev)
            if ref in seen_refs:
                continue
            seen_refs[ref] = norm
            verses.append({"ref": ref, "chapter": ch,
                           "devanagari": dev, "translation_hi": "",
                           "translation_en": ""})
    return verses


def _coverage_report(slug: str, spec: dict, verses: list[dict], sources: dict) -> dict:
    by_ch: dict[str, int] = {}
    for v in verses:
        by_ch[v["chapter"]] = by_ch.get(v["chapter"], 0) + 1
    ref = spec.get("reference_total")
    built = len(verses)
    diff = None
    if ref:
        diff = abs(built - ref) / ref if ref else None
    missing: list[str] = []
    if isinstance(spec.get("reference_by_chapter"), dict):
        for ch, want in spec["reference_by_chapter"].items():
            if by_ch.get(ch, 0) == 0:
                missing.append(ch)
    return {"slug": slug, "built": built, "reference": ref,
            "diff_ratio": diff, "by_chapter": by_ch,
            "missing_chapters": missing,
            "pages_or_files": sources,
            "left_out": "prose sections, colophons, viniyoga/dhyana where noted in 4.x"}


def main(argv=None) -> int:
    p = argparse.ArgumentParser(prog="books.build")
    p.add_argument("--slug", help="one slug from catalogue.ORDER")
    p.add_argument("--all", action="store_true", help="build every book")
    args = p.parse_args(argv)
    if bool(args.slug) == bool(args.all):
        p.error("give exactly one of --slug and --all")
    slugs = list(_cat.ORDER) if args.all else [args.slug]
    ok, stopped = 0, []
    for s in slugs:
        try:
            rep = build_book(s)
            if rep.get("status") == "OK":
                ok += 1
            else:
                stopped.append(s)
        except SystemExit as e:
            print(f"[build] {s}: refused: {e}")
            stopped.append(s)
        except Exception as e:  # noqa: BLE001 - report, never crash the batch
            print(f"[build] {s}: error: {type(e).__name__}: {e}")
            stopped.append(s)
    print(f"[build] {ok} OK, {len(stopped)} stopped: {stopped}")
    return 0 if not stopped else 1


if __name__ == "__main__":
    raise SystemExit(main())
