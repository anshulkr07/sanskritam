"""Chapter 4 · Noun families — full tables for every common kind of noun.

Split across ``_c04a`` (-a, -ā, -i, -u) and ``_c04b`` (-ī/-ū, -ṛ, consonant
stems, odd nouns) to keep each file reviewable."""

from __future__ import annotations

from ._c04a import TOPICS_A
from ._c04b import TOPICS_B
from .model import chapter

CHAPTER = chapter(
    "families",
    title=("Noun families", "शब्दरूप"),
    title_sa="शब्दरूपाणि",
    blurb=("Full tables for every common kind of noun, each form checked.",
           "हर आम प्रकार की संज्ञा की पूरी तालिका, हर रूप जाँचा हुआ।"),
    icon="grid-outline",
)

TOPICS = TOPICS_A + TOPICS_B
