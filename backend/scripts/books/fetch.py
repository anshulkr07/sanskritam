"""Fetchers for the four sources (handover_reading_shelf.md 5.2).

Cache everything under backend/results/imports/cache/<source>/. A cached
response is never fetched again. The raw response is written, not a cleaned
one.
"""

from __future__ import annotations

import json
import time
import urllib.parse
import urllib.request
from pathlib import Path

RESULTS = Path(__file__).resolve().parent.parent.parent / "results" / "imports" / "cache"
UA = "SanskritamBot/1.0 (reader corpus builder; contact: dev@sanskritam.example)"
WIKI_API = "https://sa.wikisource.org/w/api.php"


def _cache_path(source: str, name: str) -> Path:
    p = RESULTS / source / (name + ".json")
    p.parent.mkdir(parents=True, exist_ok=True)
    return p


def _http_get_json(url: str, params: dict | None = None) -> dict:
    q = ("?" + urllib.parse.urlencode(params)) if params else ""
    req = urllib.request.Request(WIKI_API + q if url == "wiki" else url + q,
                                 headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode("utf-8"))


def _http_get_text(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        raw = r.read()
    try:
        return raw.decode("utf-8")
    except UnicodeDecodeError:
        return raw.decode("utf-8", errors="replace")


def _sleep_between_calls() -> None:
    time.sleep(4)


# ── sa.wikisource ─────────────────────────────────────────────────────

def wiki_list_pages(prefix: str) -> list[str]:
    """All page titles starting with prefix (follow continue). Cached."""
    cp = _cache_path("sa-wikisource", "list-" + prefix.replace("/", "-"))
    if cp.exists():
        return json.loads(cp.read_text(encoding="utf-8"))
    titles: list[str] = []
    cont: dict = {}
    while True:
        params = {"action": "query", "list": "allpages", "apprefix": prefix,
                  "aplimit": "500", "apnamespace": "0", "format": "json"}
        params.update(cont)
        data = _http_get_json("wiki", params)
        for p in ((data.get("query") or {}).get("allpages") or []):
            titles.append(p.get("title", ""))
        cont = data.get("continue") or {}
        if not cont:
            break
        _sleep_between_calls()
    cp.write_text(json.dumps(titles, ensure_ascii=False, indent=1), encoding="utf-8", newline="")
    return titles


def wiki_fetch_page(title: str, *, rendered: bool = False) -> dict:
    """One page: wikitext+revid, or rendered HTML for transclusions.

    Returns {"title", "revid", "wikitext"|"html", "url"}. Cached raw.
    Waits 4s between calls; on 429 waits 20/40/60s then raises.
    """
    safe = title.replace("/", "-")
    kind = "html" if rendered else "wiki"
    cp = _cache_path("sa-wikisource", f"{kind}-{safe}")
    if cp.exists():
        return json.loads(cp.read_text(encoding="utf-8"))
    waits = [20, 40, 60]
    attempt = 0
    while True:
        try:
            if rendered:
                params = {"action": "parse", "page": title, "prop": "text|revid",
                          "redirects": "1", "format": "json"}
            else:
                params = {"action": "parse", "page": title,
                          "prop": "wikitext|revid", "redirects": "1", "format": "json"}
            data = _http_get_json("wiki", params)
            parse = data.get("parse") or {}
            if not parse:
                # An error response ("missingtitle", rate-limit HTML) would
                # otherwise be cached as an empty page and silently poison
                # every later build (seen 2026-10-14: 40 empty Yajurveda
                # pages fetched under ASCII-digit titles).
                raise RuntimeError(
                    f"wiki parse failed for {title!r}: {str(data)[:150]}")
            out = {"title": title, "revid": parse.get("revid"),
                   "url": f"https://sa.wikisource.org/wiki/{urllib.parse.quote(title)}"}
            if rendered:
                out["html"] = ((parse.get("text") or {}).get("*") or "")
            else:
                out["wikitext"] = (parse.get("wikitext") or {}).get("*") or ""
            cp.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8", newline="")
            _sleep_between_calls()
            return out
        except urllib.error.HTTPError as e:
            if getattr(e, "code", None) == 429 and attempt < len(waits):
                time.sleep(waits[attempt])
                attempt += 1
                continue
            raise


# ── DCS ───────────────────────────────────────────────────────────────

def _github_json(url: str) -> dict | list:
    cp = _cache_path("dcs", "gh-" + urllib.parse.quote(url, safe=""))
    if cp.exists():
        return json.loads(cp.read_text(encoding="utf-8"))
    req = urllib.request.Request(url, headers={"User-Agent": UA,
                                               "Accept": "application/vnd.github+json"})
    with urllib.request.urlopen(req, timeout=30) as r:
        data = json.loads(r.read().decode("utf-8"))
    cp.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8", newline="")
    time.sleep(1)
    return data


def dcs_list_files(text: str) -> list[str]:
    """File names of one DCS text (only .conllu, skip .conllu_parsed)."""
    root = _github_json(
        "https://api.github.com/repos/OliverHellwig/sanskrit/contents/dcs/data/conllu")
    files_sha = None
    if isinstance(root, list):
        for e in root:
            if e.get("name") == "files":
                files_sha = e.get("sha")
                break
    if not files_sha:
        # Fallback: the contents API directly under files/ (may truncate).
        raise RuntimeError("dcs: cannot find files sha")
    tree = _github_json(f"https://api.github.com/repos/OliverHellwig/sanskrit/git/trees/{files_sha}")
    text_sha = None
    for e in (tree.get("tree") or []):
        if e.get("path") == text:
            text_sha = e.get("sha")
            break
    if not text_sha:
        raise RuntimeError(f"dcs: no text {text!r}")
    subtree = _github_json(
        f"https://api.github.com/repos/OliverHellwig/sanskrit/git/trees/{text_sha}")
    out = []
    for e in (subtree.get("tree") or []):
        p = e.get("path", "")
        if p.endswith(".conllu") and not p.endswith(".conllu_parsed"):
            out.append(p)
    return sorted(out)


def dcs_fetch_file(text: str, filename: str) -> str:
    """Raw .conllu text, cached."""
    cp = _cache_path("dcs", f"{text}-{filename}".replace("/", "-"))
    if cp.exists():
        return cp.read_text(encoding="utf-8")
    url = ("https://raw.githubusercontent.com/OliverHellwig/sanskrit/master/"
           "dcs/data/conllu/files/" + urllib.parse.quote(f"{text}/{filename}"))
    body = _http_get_text(url)
    cp.write_text(body, encoding="utf-8", newline="")
    time.sleep(1)
    return body


# ── Ambuda ────────────────────────────────────────────────────────────

def ambuda_metadata() -> dict:
    cp = _cache_path("ambuda", "metadata")
    if cp.exists():
        return json.loads(cp.read_text(encoding="utf-8"))
    body = _http_get_text("https://ambuda.org/texts/downloads/metadata.json")
    cp.write_text(body, encoding="utf-8", newline="")
    return json.loads(body)


def ambuda_check_licence(slug: str) -> None:
    meta = ambuda_metadata()
    entry = None
    if isinstance(meta, dict):
        # metadata.json is keyed by slug in recent dumps, else a list.
        entry = meta.get(slug)
        if entry is None and isinstance(meta.get("texts"), list):
            for t in meta["texts"]:
                if isinstance(t, dict) and t.get("slug") == slug:
                    entry = t
                    break
    lic = (entry or {}).get("license", "") if isinstance(entry, dict) else ""
    if lic != "CC0 1.0":
        raise SystemExit(f"ambuda {slug!r}: licence is {lic!r}, need 'CC0 1.0'")


def ambuda_fetch_tei(slug: str) -> str:
    """Raw TEI XML, cached. Refuses non-CC0 texts."""
    ambuda_check_licence(slug)
    cp = _cache_path("ambuda", slug)
    xml_path = cp.with_suffix(".xml")
    if xml_path.exists():
        return xml_path.read_text(encoding="utf-8")
    body = _http_get_text(f"https://ambuda.org/texts/downloads/{slug}.xml")
    xml_path.write_text(body, encoding="utf-8", newline="")
    return body


# ── GRETIL ────────────────────────────────────────────────────────────

def gretil_fetch(name: str) -> str:
    """Raw GRETIL plaintext, cached."""
    cp = _cache_path("gretil", name)
    if cp.exists():
        return cp.read_text(encoding="utf-8")
    url = ("https://gretil.sub.uni-goettingen.de/gretil/corpustei/"
           f"transformations/plaintext/{name}.txt")
    body = _http_get_text(url)
    cp.write_text(body, encoding="utf-8", newline="")
    return body
