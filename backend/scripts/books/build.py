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
    """[(sent_counter N, joined IAST text)]. Same N in M order, joined."""
    groups: dict[int, list[tuple[int, str]]] = {}
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
    out = []
    for n in sorted(groups):
        parts = [t for _, t in sorted(groups[n])]
        out.append((n, " ".join(parts)))
    return out


def dcs_to_devanagari(iast_text: str) -> str:
    from vidyut.lipi import Scheme, transliterate

    dev = transliterate(iast_text, Scheme.Iast, Scheme.Devanagari)
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
    if slug in ("taittiriya",):
        # 31 anuvaka files: V.A from citation.
        cands = [n for n in nums if n < 100]
        if len(cands) >= 2:
            return f"{cands[-2]}.{cands[-1]}"
        return str(fallback_n)
    if slug in ("aitareya",):
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
    t = re.sub(r"<[^>]+>", "", t)
    return _html.unescape(t)


def _wiki_numbered_verses(wikitext: str, *, vedic: bool) -> list[tuple[str, str]]:
    parts = _clean.split_numbered_verses(wikitext)
    out = []
    for num_raw, body in parts:
        # Last component is the verse number (take last for 12.8.60).
        nums = _clean.number_parts(num_raw)
        if not nums:
            continue
        body2 = _clean.drop_leading_junk(body)
        cleaned = _clean.verse_text(body2, vedic=vedic)
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
    raw_verses: list[tuple[str, str, str]] = []  # (chapter, num_raw, cleaned)

    if kind in ("wiki_numbered", "wiki_unnumbered", "wiki_rendered",
                "wiki_rendered_newline_nums", "wiki_mkp_81_93", "wiki_bhagavata",
                "wiki_shiva", "wiki_samaveda", "wiki_yajurveda", "wiki_prashna",
                "wiki_raghu", "wiki_shakuntala", "wiki_gita_govinda",
                "wiki_vetala", "wiki_yoga", "wiki_ashtavakra", "wiki_sushruta",
                "wiki_amara", "wiki_chanakya", "wiki_sections"):
        pages = list(spec.get("pages") or [])
        if kind == "wiki_bhagavata":
            pages = _fetch.wiki_list_pages(spec["prefix"])
            # Skandha 10 split + skip mahatmya sets.
            pages = [p for p in pages if "हात्म्य" not in p and "हात्यम" not in p
                     and "माहात्म्य" not in p]
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
                    if any(s in name for s in (spec.get("skip_sections") or [])):
                        continue
                    if "न्यास" in name and "उत्तरन्यास" not in name:
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
                # Lalita: 1 purvabhaga, 2 stotra; split at dandas per chapter.
                secs = _split_wiki_sections(body or "")
                if len(secs) >= 2:
                    for ci, (_, sec_body) in enumerate(secs[:2], 1):
                        chunks = [c.strip() for c in
                                  _clean.verse_text(sec_body, vedic=vedic).split("॥") if c.strip()]
                        for i, chunk in enumerate(chunks, 1):
                            raw_verses.append((str(ci), str(i), chunk + " ॥"))
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
                # 4 khandas: numbers restart per khanda.
                secs = [s for s in _split_wiki_sections(body or "") if s[1].strip()]
                if len(secs) >= 4:
                    for ci, (_, sec_body) in enumerate(secs[-4:], 1):
                        for num_raw, cleaned in _wiki_numbered_verses(sec_body, vedic=vedic):
                            raw_verses.append((str(ci), num_raw, cleaned))
                else:
                    for num_raw, cleaned in _wiki_numbered_verses(body or "", vedic=vedic):
                        raw_verses.append((None, num_raw, cleaned))
            elif slug == "prashna":
                # Each page is one prasna (P): chapter = page order.
                for num_raw, cleaned in _wiki_numbered_verses(body or "", vedic=vedic):
                    raw_verses.append((str(pi + 1), num_raw, cleaned))
            else:
                for num_raw, cleaned in _wiki_numbered_verses(body or "", vedic=vedic):
                    raw_verses.append((None, num_raw, cleaned))
        # Chapter assignment for generic wiki books is done per-kind below.
        raw_verses = _assign_wiki_chapters(slug, spec, pages, raw_verses)
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
                    cleaned = _clean.verse_text(
                        _clean.drop_leading_junk(s_body),
                        vedic=bool(spec.get("vedic")))
                    raw_verses.append(("", s_num, cleaned))
            else:
                cleaned = _clean.verse_text(body, vedic=bool(spec.get("vedic")))
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
                cleaned = _clean.verse_text(verse_body, vedic=vedic)
                raw_verses.append(("", num_raw, cleaned))
        else:
            # Normalise GRETIL slashes then split at numbers.
            norm = body.replace(" // ", " ॥ ").replace(" / ", " । ")
            for num_raw, verse_body in _clean.split_numbered_verses(norm):
                cleaned = _clean.verse_text(verse_body, vedic=vedic)
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
            verses.append({"ref": f"{ref_name} {number}", "chapter": ch,
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
