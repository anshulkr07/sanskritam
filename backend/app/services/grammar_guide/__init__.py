"""Grammar guide — the Grammar tab's bilingual, engine-checked teaching layer.

Chapters → topics → typed blocks, authored as data in ``c00_*.py`` onwards
(``model.py`` is the vocabulary). Served by GET /grammar/guide (the index) and
GET /grammar/guide/topics/{id}. Static by design: no DB, no quota, no vendor —
the same rule as every /grammar/* route (P9/P11).

The builder, run once per process:

* validates structure (unique ids, known block kinds, resolvable references),
* derives IAST for every Sanskrit string from lipi (P7-13 — never typed),
* marks each table form's ending for highlighting,
* strips server-only engine ``check`` specs, leaving ``checked: true``,
* attaches a pre-rendered ``audio_url`` to strings listed in
  ``audio_manifest.json`` — no manifest entry, no field, no dead button.
"""

from __future__ import annotations

import copy
import hashlib
import json
import unicodedata
from functools import lru_cache
from pathlib import Path
from typing import Any, Callable, Iterator, Optional

from . import (
    c00_start, c01_sounds, c02_nouns, c03_cases, c04_families, c05_pronouns, c06_verbs,
    c07_tenses, c08_small_words, c09_sentences, c10_sandhi, c11_compounds, c12_krdanta,
    c13_voice, c14_taddhita, c15_verse, c16_panini, c17_reference,
)
from .glossary import GLOSSARY
from .model import split_ending

CHAPTER_MODULES = (
    c00_start,
    c01_sounds,
    c02_nouns,
    c03_cases,
    c04_families,
    c05_pronouns,
    c06_verbs,
    c07_tenses,
    c08_small_words,
    c09_sentences,
    c10_sandhi,
    c11_compounds,
    c12_krdanta,
    c13_voice,
    c14_taddhita,
    c15_verse,
    c16_panini,
    c17_reference,
)

BLOCK_KINDS = frozenset({"text", "analogy", "callout", "steps", "examples", "wild",
                         "formula", "table"})
PROOF_TYPES = frozenset({"derive", "paradigm", "sandhi", "word-order", "scansion"})
LEVELS = (1, 2, 3)
MANIFEST_PATH = Path(__file__).with_name("audio_manifest.json")


class GuideError(ValueError):
    """Authored content is structurally invalid — fails at build, never mid-request."""


def normalize_sa(text: str) -> str:
    return " ".join(unicodedata.normalize("NFC", text or "").split())


def audio_key(text: str) -> str:
    """Manifest key for one Sanskrit string (voice settings live in the entry)."""
    return hashlib.sha1(normalize_sa(text).encode("utf-8")).hexdigest()[:20]


def load_manifest() -> dict[str, dict]:
    if not MANIFEST_PATH.exists():
        return {}
    return json.loads(MANIFEST_PATH.read_text(encoding="utf-8") or "{}")


def _walk(node: Any, fn: Callable[[dict], None]) -> None:
    """Apply ``fn`` to every dict carrying a Sanskrit ``sa`` string."""
    if isinstance(node, dict):
        if isinstance(node.get("sa"), str):
            fn(node)
        for value in list(node.values()):
            _walk(value, fn)
    elif isinstance(node, list):
        for value in node:
            _walk(value, fn)


def iter_raw_topics() -> Iterator[tuple[dict, dict]]:
    for module in CHAPTER_MODULES:
        for t in module.TOPICS:
            yield module.CHAPTER, t


def iter_checks() -> Iterator[tuple[str, str, dict]]:
    """``(topic_id, shown Sanskrit, check)`` for every engine claim."""
    for _, t in iter_raw_topics():
        found: list[dict] = []
        _walk(t, lambda n: found.append(n) if n.get("check") else None)
        for n in found:
            yield t["id"], n["sa"], n["check"]


def iter_sanskrit() -> list[str]:
    """Every unique Sanskrit string a learner can hear, in guide order."""
    seen: dict[str, None] = {}
    for _, t in iter_raw_topics():
        _walk(t, lambda n: seen.setdefault(normalize_sa(n["sa"]), None))
    for g in GLOSSARY:
        seen.setdefault(normalize_sa(g["term_sa"]), None)
    return [s for s in seen if s]


def _audio_urls() -> dict[str, str]:
    """Manifest entries the running storage can actually serve.

    The manifest ships inside ``app/`` but rendered WAVs live in object
    storage, which the container image does not include. On local storage a
    missing file therefore means no button — never a speaker icon that 404s.
    GCS is trusted as written (the renderer uploads before it records)."""
    manifest = load_manifest()
    if not manifest:
        return {}
    from app.services.storage import LocalStorage, get_storage

    storage = get_storage()
    local = isinstance(storage, LocalStorage)
    return {key: storage.url(entry["path"]) for key, entry in manifest.items()
            if entry.get("path") and (not local or storage.exists(entry["path"]))}


def _validate_topic(t: dict, where: str) -> None:
    for key in ("id", "level", "title", "title_sa", "summary", "blocks"):
        if not t.get(key) and t.get(key) != 0:
            raise GuideError(f"{where}: missing {key}")
    if t["level"] not in LEVELS:
        raise GuideError(f"{where}: level must be one of {LEVELS}")
    blocks = list(t["blocks"]) + [b for d in t["deeper"] for b in d["blocks"]]
    for b in blocks:
        if b.get("kind") not in BLOCK_KINDS:
            raise GuideError(f"{where}: unknown block kind {b.get('kind')!r}")
    for p in t["proofs"]:
        if p.get("type") not in PROOF_TYPES:
            raise GuideError(f"{where}: unknown proof type {p.get('type')!r}")
    for i, item in enumerate(t["quiz"]):
        if not 0 <= item["answer"] < len(item["options"]):
            raise GuideError(f"{where}: quiz {i} answer out of range")


def _finish(node: dict, audio_urls: dict[str, str]) -> None:
    from app.services.iast import to_iast

    node["iast"] = to_iast(node["sa"])
    if node.pop("check", None):
        node["checked"] = True
    url = audio_urls.get(audio_key(node["sa"]))
    if url:
        node["audio_url"] = url


def _ref(t: dict) -> dict:
    return {"id": t["id"], "title": t["title"], "title_sa": t["title_sa"]}


_SUMMARY_KEYS = ("id", "chapter_id", "rank", "level", "title", "title_sa", "title_iast",
                 "summary", "minutes", "feature_ids")


def _summary(t: dict) -> dict:
    return {**{k: t[k] for k in _SUMMARY_KEYS}, "has_quiz": bool(t["quiz"])}


@lru_cache(maxsize=1)
def _build() -> dict[str, Any]:
    from app.services.iast import to_iast

    audio_urls = _audio_urls()
    glossary = {g["id"]: copy.deepcopy(g) for g in GLOSSARY}
    if len(glossary) != len(GLOSSARY):
        raise GuideError("duplicate glossary id")

    chapters: list[dict] = []
    topics: dict[str, dict] = {}
    order: list[str] = []
    for rank, module in enumerate(CHAPTER_MODULES):
        ch = module.CHAPTER
        ids: list[str] = []
        for t_rank, raw in enumerate(module.TOPICS):
            t = copy.deepcopy(raw)
            _validate_topic(t, f"{ch['id']}/{t.get('id')}")
            if t["id"] in topics:
                raise GuideError(f"duplicate topic id {t['id']}")
            t["chapter_id"], t["rank"] = ch["id"], t_rank
            topics[t["id"]] = t
            order.append(t["id"])
            ids.append(t["id"])
        chapters.append({
            "id": ch["id"], "rank": rank, "title": ch["title"], "title_sa": ch["title_sa"],
            "title_iast": to_iast(ch["title_sa"]), "blurb": ch["blurb"], "icon": ch["icon"],
            "topic_ids": ids,
        })
    chapter_by_id = {c["id"]: c for c in chapters}

    for t in topics.values():
        for ref in list(t["terms"]):
            if ref not in glossary:
                raise GuideError(f"{t['id']}: unknown glossary term {ref!r}")
        for ref in t["related"]:
            if ref not in topics:
                raise GuideError(f"{t['id']}: unknown related topic {ref!r}")
        for block in list(t["blocks"]) + [b for d in t["deeper"] for b in d["blocks"]]:
            if block["kind"] == "table" and block.get("stem"):
                for row in block["rows"]:
                    for c in row:
                        parts = split_ending(c["sa"], block["stem"]) if "sa" in c else None
                        if parts:
                            c["split"] = parts
        _walk(t, lambda n: _finish(n, audio_urls))
        t["title_iast"] = to_iast(t["title_sa"])

    for g in glossary.values():
        g["term_iast"] = to_iast(g["term_sa"])
        if g["topic_id"] not in topics:
            g["topic_id"] = ""
        url = audio_urls.get(audio_key(g["term_sa"]))
        if url:
            g["audio_url"] = url

    full: dict[str, dict] = {}
    for i, tid in enumerate(order):
        t = topics[tid]
        ch = chapter_by_id[t["chapter_id"]]
        full[tid] = {
            **_summary(t),
            "chapter": {"id": ch["id"], "title": ch["title"], "title_sa": ch["title_sa"],
                        "position": t["rank"] + 1, "count": len(ch["topic_ids"])},
            "term": t.get("term"),
            "blocks": t["blocks"],
            "deeper": t["deeper"],
            "quiz": t["quiz"],
            "proofs": t["proofs"],
            "terms": [glossary[g] for g in t["terms"]],
            "related": [_ref(topics[r]) for r in t["related"]],
            "prev": _ref(topics[order[i - 1]]) if i > 0 else None,
            "next": _ref(topics[order[i + 1]]) if i + 1 < len(order) else None,
            "attribution": t["attribution"],
        }

    raw = json.dumps([[m.CHAPTER, m.TOPICS] for m in CHAPTER_MODULES] + [GLOSSARY],
                     ensure_ascii=False, sort_keys=True, default=str)
    digest = hashlib.sha1((raw + json.dumps(sorted(audio_urls.items()))).encode("utf-8"))
    index = {
        "version": "guide-" + digest.hexdigest()[:12],
        "chapters": chapters,
        "topics": [_summary(topics[tid]) for tid in order],
        "glossary": list(glossary.values()),
    }
    return {"index": index, "topics": full}


def guide_index() -> dict:
    return _build()["index"]


def guide_topic(topic_id: str) -> Optional[dict]:
    return _build()["topics"].get(topic_id)


def reset_cache() -> None:
    """Rebuild on next request (tests, and after an audio render)."""
    _build.cache_clear()
