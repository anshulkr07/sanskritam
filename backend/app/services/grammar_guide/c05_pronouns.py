"""Chapter 5 · Pronouns & numbers — I, you, he/she/it, this/that; then
who/which, polite “you” and numbers.

Split across ``_c05a`` (personal and demonstrative pronouns) and ``_c05b``
(question words, polite “you”, numbers) to keep each file reviewable."""

from __future__ import annotations

from ._c05a import TOPICS_A
from ._c05b import TOPICS_B
from .model import chapter

CHAPTER = chapter(
    "pronouns",
    title=("Pronouns & numbers", "सर्वनाम और संख्या"),
    title_sa="सर्वनामानि सङ्ख्याश्च",
    blurb=("I, you, he, this, who — and how to count in Sanskrit.",
           "मैं, तुम, वह, यह, कौन — और संस्कृत में गिनती।"),
    icon="people-outline",
)

TOPICS = TOPICS_A + TOPICS_B
