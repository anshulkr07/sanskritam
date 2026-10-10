"""QC rules that need no model, so a CPU machine and the tests can import them.

Length check. A render record carries the *line's* syllable count, but a long
line is rendered in parts (the export splits at 44+ syllables), and each part
is only its share of the line. Comparing a part's length with the whole line's
expected length flagged every part of every split line as "short" (276 of 276
on 2026-10-09: the two halves together ran 0.95 of the expected length, a
normal chant). The expectation is therefore the part's share of the line's,
shared out by akshara count.
"""

from __future__ import annotations

SHORT_BELOW = 0.55
LONG_ABOVE = 1.8


def part_share(part_counts: list[int], part_j: int) -> float:
    """The part's share (0..1) of its line, by akshara count."""
    total = sum(part_counts)
    if len(part_counts) <= 1 or total <= 0 or not (0 <= part_j < len(part_counts)):
        return 1.0
    return part_counts[part_j] / total


def expected_seconds(line_syllables: float, sec_per_syll: float, part_counts: list[int], part_j: int) -> float:
    """How long this part should run, from the metre's pace."""
    return float(line_syllables) * float(sec_per_syll) * part_share(part_counts, part_j)


def length_flag(seconds: float, expected: float) -> str | None:
    """"short", "long" or None."""
    if expected <= 0:
        return None
    if seconds < SHORT_BELOW * expected:
        return "short"
    if seconds > LONG_ABOVE * expected:
        return "long"
    return None
