"""Number Builder numeral engine (handover_games_daily_multiplayer §4.7).

A dedicated, versioned numeral grammar/lexicon service — deliberately NOT the
generic morphology analyser (the p10 audit showed it mis-parses पञ्च as a
vocative). This package:

  • structure.parse_decimal / integer_groups / build_skeleton
        exact decimal-string decomposition into place-value groups; Indian and
        international grouping; sign and up-to-three fractional digits.
  • lexicon  — approved surfaces per language with stable semantic IDs, a
        documented counting convention, and accepted variants.
  • render.compose / render_phrase / parse_phrase
        selections -> expression tree -> phrase; and phrase -> exact decimal
        string (numerical validity). Round-trip is a fixture requirement.
  • scoring.score_prompt
        the 60/25/15 value/structure/language rubric with criterion-level
        evidence, component renormalisation and half-up rounding.

Numbers live as decimal strings end to end. No float is ever constructed from
a canonical prompt value; arithmetic on group values is integer arithmetic.
"""

from __future__ import annotations

# Bumped when the lexicon, the convention or the rubric changes. Prompts and
# results store the version they were issued/scored under, so an in-flight
# ranked period is never reinterpreted silently.
ENGINE_VERSION = "nb-1"

CONVENTION_NOTE = (
    "Counting-citation convention: scale nouns appear once in their citation "
    "form (Sanskrit कोटिः, लक्षम्, सहस्रम्, शतम्; English crore/lakh/thousand/"
    "hundred/million singular after a numeral), coefficients are the 0-99 "
    "citation words, hundreds render as a separate coefficient word "
    "(त्रीणि शतम् / three hundred), the unit group carries no scale word, the "
    "decimal marker is digit-reading (point / दशमंशे) followed by digit words, "
    "and negative numbers prefix ऋणम् / minus. Qualified counting (declined "
    "scale plurals, noun agreement) is a different exercise and out of scope."
)

REVIEW_STATUS = "draft-pending-linguistic-review"

from .structure import (  # noqa: E402
    DecimalNumber,
    build_skeleton,
    display_grouped,
    integer_groups,
    parse_decimal,
    skeleton_fingerprint,
)
from .lexicon import get_lexicon  # noqa: E402
from .render import parse_phrase, phrase_slots_payload, render_phrase  # noqa: E402
from .scoring import score_prompt  # noqa: E402

__all__ = [
    "ENGINE_VERSION",
    "CONVENTION_NOTE",
    "REVIEW_STATUS",
    "DecimalNumber",
    "parse_decimal",
    "integer_groups",
    "build_skeleton",
    "display_grouped",
    "skeleton_fingerprint",
    "get_lexicon",
    "render_phrase",
    "parse_phrase",
    "phrase_slots_payload",
    "score_prompt",
]
