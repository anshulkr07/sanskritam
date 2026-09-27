"""Authoring vocabulary for the grammar guide.

A chapter module is plain data — ``CHAPTER`` and ``TOPICS`` — built with the
helpers below so a hundred bilingual topics stay readable.

Rules the helpers encode:

* Every learner-facing string is a ``Loc`` ``{"en", "hi"}``. The Hindi is
  written for Hindi readers, not translated word for word, and never passes
  through lipi.
* Sanskrit is a bare Devanagari ``sa`` string. Its IAST is added by the
  builder from lipi (P7-13) — never typed here.
* A ``check`` is an engine claim about the Sanskrit it sits on. The verifier
  runs every one in tests; the builder strips it and leaves ``checked: true``.
* Inline markup inside a Loc is only ``**bold**`` and ``{{संस्कृत}}``.
"""

from __future__ import annotations

from typing import Any, Optional, Sequence, Union

Loc = dict[str, str]
Pair = tuple[str, str]
Node = dict[str, Any]


def L(en: str, hi: str) -> Loc:
    return {"en": en, "hi": hi}


def _clean(d: dict) -> dict:
    return {k: v for k, v in d.items() if v is not None and v != [] and v != ()}


# ─── Engine claims (server-only) ───

def sub(stem: str, linga: str = "Pum", vibhakti: str = "Prathama", vacana: str = "Eka", *,
        form: Optional[str] = None, stem_type: Optional[str] = None) -> Node:
    """A declined noun, pronoun or adjective: stem + gender + case + number."""
    return _clean({"type": "subanta", "stem": stem, "linga": linga, "vibhakti": vibhakti,
                   "vacana": vacana, "form": form, "stem_type": stem_type})


def tin(dhatu: str, lakara: str = "Lat", purusha: str = "Prathama", vacana: str = "Eka", *,
        form: Optional[str] = None, prayoga: Optional[str] = None,
        sanadi: Optional[Sequence[str]] = None, prefixes: Optional[Sequence[str]] = None,
        gana: Optional[str] = None) -> Node:
    """A conjugated verb."""
    return _clean({"type": "tinanta", "dhatu": dhatu, "lakara": lakara, "purusha": purusha,
                   "vacana": vacana, "form": form, "prayoga": prayoga,
                   "sanadi": list(sanadi) if sanadi else None,
                   "prefixes": list(prefixes) if prefixes else None, "gana": gana})


def krd(dhatu: str, krt: str, *, linga: Optional[str] = None, vibhakti: Optional[str] = None,
        vacana: Optional[str] = None, form: Optional[str] = None,
        prefixes: Optional[Sequence[str]] = None, gana: Optional[str] = None) -> Node:
    """A word made from a verb root with a kṛt suffix (गत्वा, गतः)."""
    return _clean({"type": "krdanta", "dhatu": dhatu, "krt": krt, "linga": linga,
                   "vibhakti": vibhakti, "vacana": vacana, "form": form,
                   "prefixes": list(prefixes) if prefixes else None, "gana": gana})


def tad(stem: str, taddhita: str, linga: str = "Pum", vibhakti: str = "Prathama",
        vacana: str = "Eka", *, form: Optional[str] = None,
        stem_type: Optional[str] = None) -> Node:
    """A word made from a noun with a taddhita suffix (राघवः)."""
    return _clean({"type": "taddhita", "stem": stem, "taddhita": taddhita, "linga": linga,
                   "vibhakti": vibhakti, "vacana": vacana, "form": form,
                   "stem_type": stem_type})


def snd(first: str, second: str, *, joined: Optional[str] = None) -> Node:
    """A sandhi join: ``first + second`` → the shown form (or ``joined``)."""
    return _clean({"type": "sandhi", "first": first, "second": second, "joined": joined})


# ─── Sanskrit nodes ───

def sa(text_: str, check: Optional[Node] = None) -> Node:
    return _clean({"sa": text_, "check": check})


def w(text_: str, en: str, hi: str, check: Optional[Node] = None) -> Node:
    """One word of an example with its gloss."""
    return _clean({"sa": text_, "gloss": L(en, hi), "check": check})


def src(en: str, hi: str) -> Loc:
    return L(en, hi)


def ex(text_: str, en: str, hi: str, *words: Node, source: Optional[Loc] = None,
       check: Optional[Node] = None) -> Node:
    """A Sanskrit example: the text, its meaning, optional word-by-word gloss."""
    return _clean({"sa": text_, "meaning": L(en, hi), "words": list(words),
                   "source": source, "check": check})


# ─── Blocks ───

def text(en: str, hi: str) -> Node:
    return {"kind": "text", "text": L(en, hi)}


def analogy(en: str, hi: str) -> Node:
    """"Think of it like…" — written natively in each language."""
    return {"kind": "analogy", "text": L(en, hi)}


def _callout(tone: str, en: str, hi: str) -> Node:
    return {"kind": "callout", "tone": tone, "text": L(en, hi)}


def tip(en: str, hi: str) -> Node:
    return _callout("tip", en, hi)


def watch(en: str, hi: str) -> Node:
    return _callout("watch", en, hi)


def fact(en: str, hi: str) -> Node:
    return _callout("fact", en, hi)


def steps(*items: Pair) -> Node:
    return {"kind": "steps", "items": [L(*p) for p in items]}


def examples(*items: Node, title: Optional[Pair] = None) -> Node:
    return _clean({"kind": "examples", "title": L(*title) if title else None,
                   "items": list(items)})


def wild(*items: Node) -> Node:
    """"Spot it in the wild": mottos, verses, names — each with a source."""
    return {"kind": "wild", "items": list(items)}


def formula(a: str, b: str, result: str, en: str, hi: str, *,
            check: Optional[Node] = None) -> Node:
    """A sound or word equation: a + b → result."""
    return {"kind": "formula", "a": sa(a), "b": sa(b), "result": sa(result, check),
            "rule": L(en, hi)}


def tc(en: str, hi: str) -> Node:
    """A table cell holding explanation text rather than Sanskrit."""
    return {"text": L(en, hi)}


def cell(text_: str, check: Optional[Node] = None) -> Node:
    return sa(text_, check)


def table(caption: Pair, columns: Sequence[Pair], rows: Sequence[Sequence[Union[str, Node]]], *,
          stem: Optional[str] = None, note: Optional[Pair] = None) -> Node:
    """A table. Plain strings in ``rows`` are Sanskrit cells. With ``stem`` the
    builder marks each form's ending for highlighting."""
    norm = [[cell(c) if isinstance(c, str) else c for c in row] for row in rows]
    return _clean({"kind": "table", "caption": L(*caption), "columns": [L(*c) for c in columns],
                   "rows": norm, "stem": stem, "note": L(*note) if note else None})


# ─── Topic furniture ───

def opt(en: str, hi: str) -> Node:
    return {"text": L(en, hi)}


def opt_sa(text_: str, check: Optional[Node] = None) -> Node:
    return sa(text_, check)


def q(prompt: Pair, options: Sequence[Node], answer: int, explain: Pair) -> Node:
    """A quick-check question. Local only — it never grades or writes."""
    return {"prompt": L(*prompt), "options": list(options), "answer": answer,
            "explain": L(*explain)}


def proof(kind: str, label: Pair, **params: str) -> Node:
    """An engine widget; ``params`` are the matching /grammar/* query params."""
    return {"type": kind, "label": L(*label), "params": params}


def go_deeper(title: Pair, *blocks: Node, level: int = 2) -> Node:
    return {"title": L(*title), "level": level, "blocks": list(blocks)}


def topic(id: str, *, level: int, title: Pair, title_sa: str, summary: Pair,
          blocks: Sequence[Node], term: Optional[tuple] = None, minutes: int = 3,
          deeper: Sequence[Node] = (), quiz: Sequence[Node] = (),
          proofs: Sequence[Node] = (), terms: Sequence[str] = (),
          feature_ids: Sequence[str] = (), related: Sequence[str] = (),
          attribution: str = "original") -> Node:
    term_node = None
    if term:
        term_node = _clean({"sa": term[0], "meaning": L(term[1], term[2]),
                            "check": term[3] if len(term) > 3 else None})
    return {
        "id": id, "level": level, "title": L(*title), "title_sa": title_sa,
        "summary": L(*summary), "term": term_node, "minutes": minutes,
        "blocks": list(blocks), "deeper": list(deeper), "quiz": list(quiz),
        "proofs": list(proofs), "terms": list(terms), "feature_ids": list(feature_ids),
        "related": list(related), "attribution": attribution,
    }


def chapter(id: str, *, title: Pair, title_sa: str, blurb: Pair, icon: str) -> Node:
    return {"id": id, "title": L(*title), "title_sa": title_sa, "blurb": L(*blurb),
            "icon": icon}


def gl(id: str, term_sa: str, en: str, hi: str, topic: str = "") -> Node:
    """A glossary entry: a Sanskrit grammar term in plain language."""
    return {"id": id, "term_sa": term_sa, "meaning": L(en, hi), "topic_id": topic}


# ─── Devanagari text helpers ───

_COMBINING = frozenset(
    [chr(c) for c in range(0x0900, 0x0904)] + ["़"]
    + [chr(c) for c in range(0x093e, 0x094d)] + ["्"]
    + [chr(c) for c in range(0x0951, 0x0958)] + ["ॢ", "ॣ", "‌", "‍"]
)
# Signs that can start a highlighted span without detaching from their letter.
_SPACING_TAIL = ("ः", "ं", "ा", "ी")


def aksharas(text_: str) -> list[str]:
    """Split Devanagari into written syllables (a letter, its conjuncts and signs)."""
    out: list[str] = []
    for ch in text_:
        if out and (ch in _COMBINING or out[-1].endswith("्")):
            out[-1] += ch
        else:
            out.append(ch)
    return out


def split_ending(form: str, stem: str) -> Optional[list[str]]:
    """``देवाय`` against ``देव`` → ``["देव", "ाय"]`` for highlighting.

    Splits at a written-syllable boundary, or just before a spacing sign
    (ः ं ा ी) so no vowel sign is ever orphaned from its letter. None when
    the form adds nothing to the stem.
    """
    if not form or not stem:
        return None
    a, b = aksharas(form), aksharas(stem)
    n = 0
    while n < len(a) and n < len(b) and a[n] == b[n]:
        n += 1
    head, tail = "".join(a[:n]), "".join(a[n:])
    if n < len(a) and n < len(b) and a[n].startswith(b[n]):
        rest = a[n][len(b[n]):]
        if rest.startswith(_SPACING_TAIL):
            head += b[n]
            tail = rest + "".join(a[n + 1:])
    # No shared start (a verb in a noun table) or nothing added: no highlight.
    return [head, tail] if head and tail else None


def pause_form(text_: str) -> str:
    """Comparison form of a word: dandas trimmed, final ं read as म्."""
    s = text_.strip().strip("।॥").strip()
    if s.endswith("ं"):
        s = s[:-1] + "म्"
    return s


def visarga_form(text_: str) -> str:
    """Final स्/र् read as visarga — how the sandhi table writes ḥ."""
    s = pause_form(text_)
    for tail in ("स्", "र्"):
        if s.endswith(tail):
            return s[: -len(tail)] + "ः"
    return s
