"""Chapter 7 · Tenses & moods — the ten lakāras, everyday four first.

Split across ``_c07a`` (overview, present, command, simple past) and
``_c07b`` (future, should/may, perfect, aorist and the rare four)."""

from __future__ import annotations

from ._c07a import TOPICS_A
from ._c07b import TOPICS_B
from .model import chapter

CHAPTER = chapter(
    "tenses",
    title=("Tenses & moods", "काल और भाव"),
    title_sa="लकाराः",
    blurb=("Present, command, past, future — and the rarer six.",
           "वर्तमान, आज्ञा, भूत, भविष्यत् — और बाकी छह लकार।"),
    icon="time-outline",
)

TOPICS = TOPICS_A + TOPICS_B
