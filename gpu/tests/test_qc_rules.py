"""The length check judges a part against its share of the line (qc_rules.py)."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from asr import qc_rules as R  # noqa: E402


def test_one_part_line_is_judged_whole():
    exp = R.expected_seconds(16, 0.326, [16], 0)
    assert abs(exp - 5.216) < 1e-9
    assert R.length_flag(4.45, exp) is None          # a normal Anushtubh line
    assert R.length_flag(2.0, exp) == "short"
    assert R.length_flag(10.0, exp) == "long"


def test_a_part_is_judged_against_its_own_share():
    # The measured case: a 44-syllable line split in two, 22 aksharas each,
    # rendered at the normal pace. Judged against the whole line each half
    # ran 0.47 of "expected" and flagged short; against its share it is fine.
    whole = 44 * 0.326
    half = 0.95 * whole / 2
    assert R.length_flag(half, whole) == "short"                       # the old check
    exp = R.expected_seconds(44, 0.326, [22, 22], 0)
    assert abs(exp - whole / 2) < 1e-9
    assert R.length_flag(half, exp) is None                            # the new one


def test_unequal_parts_share_by_akshara_count():
    assert R.part_share([30, 10], 0) == 0.75
    assert R.part_share([30, 10], 1) == 0.25
    assert R.part_share([10], 0) == 1.0
    assert R.part_share([], 0) == 1.0
    assert R.part_share([0, 0], 1) == 1.0          # nothing to share by: whole line
    assert R.part_share([5, 5], 7) == 1.0          # a part index the line does not have


def test_a_genuinely_short_part_still_flags():
    exp = R.expected_seconds(44, 0.326, [22, 22], 1)
    assert R.length_flag(0.4 * exp, exp) == "short"
    assert R.length_flag(2.0 * exp, exp) == "long"
    assert R.length_flag(5.0, 0.0) is None
