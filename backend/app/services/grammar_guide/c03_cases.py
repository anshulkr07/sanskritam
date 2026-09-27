"""Chapter 3 · The 8 cases — one topic per case, plus upapada and kāraka.

Split across ``_c03a`` (overview → dative) and ``_c03b`` (ablative → kāraka)
to keep each file reviewable."""

from __future__ import annotations

from ._c03a import TOPICS_A
from ._c03b import TOPICS_B
from .model import chapter

CHAPTER = chapter(
    "cases",
    title=("The 8 cases", "आठ विभक्तियाँ"),
    title_sa="विभक्तयः",
    blurb=("How an ending tells you who did what, to whom, with what, and where.",
           "अंत कैसे बताता है कि किसने, किसको, किससे, कहाँ क्या किया।"),
    icon="git-branch-outline",
)

TOPICS = TOPICS_A + TOPICS_B
