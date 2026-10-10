"""Which free Gemini model a question goes to first.

Owner decision 2026-10-10: Gemini 3.7 Flash first, on the free keys, for the
kinds of question where the 60-question test showed it as good as 3.8 Flash;
3.8 Flash for the kinds where it was worse. Paid Vertex is always 3.8.

The test (backend/results/rag_full_20261009, run 2026-10-10, answers marked
blind by Claude, one run per question, book search on) gave 3.7 and 3.8 the same
score on the plain questions (books, grammar, Hindi and English, no trap) and
put 3.7 behind on the risky ones: where a verse is from, a verse reference that
may not exist, a book the app does not hold, a conversation or a calendar
fact in play, little evidence from the books. ``lane`` below separates the two
from what the request holds. Run over the 60 test questions it sent 37 to
"simple" (3.7 0.986, 3.8 0.986) and 23 to "careful" (3.7 0.783, 3.8 0.935), so
3.7 on the first group and 3.8 on the second would have scored 0.967, the same
as 3.8 on all 60. Those figures are on the questions the rule was written from,
so they say how well it fits them, not how well it will do on new ones; the
check is results/rag_full_20261009/route_check.py. Whenever book search is off
the test does not apply, and every question is careful.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Sequence

SIMPLE = "simple"
CAREFUL = "careful"

# A hit counts as evidence when the question names its reference, quotes its
# words, or means something close to it (the test's plain questions all had a
# top hit at 0.69 or more; the weather question 0.56).
_EVIDENCE_SIMILARITY = 0.68

_GRAMMAR = re.compile(
    r"sandhi|सन्धि|संधि|\bwhat case\b|case and number|\btense\b|conjugat|declen|verb forms?\b"
    r"|vibhakti|विभक्ति|learner wrote",
    re.IGNORECASE,
)

# Questions that ask where a verse is from, which text says something, or
# whether a claim is right: the ones the test's traps were made of.
_WHERE_FROM = re.compile(
    r"\bwhich\s+(?:\w+\s+){0,2}(?:text|upanishad|verse|shloka|ramayana|gita|purana|book|passage|sutra|work)\b"
    r"|\bwhere\s+(?:in|does|do|is|can)\b"
    r"|\bfrom\s+(?:the\s+)?\w+(?:\s+\w+)?\s+or\b"
    r"|\bis\s+['‘\"“]"
    r"|\bquote\b|\bright\?|\bprove[sd]?\b"
    r"|kahan se|kaun se|कहाँ से|कहां से|किस\s+(?:ग्रंथ|ग्रन्थ|उपनिषद|श्लोक|पुस्तक|पाठ)",
    re.IGNORECASE,
)


@dataclass(frozen=True)
class Route:
    lane: str     # "simple" | "careful"
    why: str      # for the log


def lane(
    question: str,
    *,
    history: Sequence = (),
    facts: str = "",
    chart: str = "",
    match: str = "",
    hits: Sequence = (),
    books_named: Sequence = (),
    refs_asked: Sequence = (),
    searched: bool = True,
) -> Route:
    """The lane for one question. ``hits``, ``books_named`` and ``refs_asked``
    are what services/book_search.py found; ``searched`` is False when it did
    not run (off, or failed before it found anything)."""
    if not searched:
        return Route(CAREFUL, "no book search")
    if history or facts or chart or match:
        return Route(CAREFUL, "conversation or calendar context")
    if _GRAMMAR.search(question):
        return Route(SIMPLE, "grammar")
    if refs_asked:
        return Route(CAREFUL, "verse reference asked")
    if _WHERE_FROM.search(question):
        return Route(CAREFUL, "origin or truth of a claim asked")
    # A named book with no verse of its own among the hits is a book the app
    # does not hold (Chāṇakya Nīti, Kena): nothing to ground an answer on.
    if books_named and not any("book" in h.why for h in hits):
        return Route(CAREFUL, "book not held")
    if not any(h.similarity >= _EVIDENCE_SIMILARITY or "sanskrit" in h.why or "ref" in h.why for h in hits[:3]):
        return Route(CAREFUL, "weak evidence")
    return Route(SIMPLE, "plain")
