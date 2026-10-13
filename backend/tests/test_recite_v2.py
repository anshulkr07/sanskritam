"""Recitation rubric v2 behaviour (brief §8, including the mandatory
counterexample and calibration-ordering target)."""

from __future__ import annotations

from app.services.recite_scoring_v2 import (
    Segment, score_v2, synthetic_segments,
)

VERSE = ["कर्मण्येवाधिकारस्ते मा फलेषु कदाचन",
         "मा कर्मफलहेतुर्भूर्मा ते सङ्गोऽस्त्वकर्मणि"]


def _clean():
    return synthetic_segments(" ".join(VERSE), wps=2.8)


def test_clean_ordered_beats_scrambled_fragmented():
    clean = score_v2(VERSE, _clean())
    scrambled = score_v2(VERSE, synthetic_segments(
        " ".join(VERSE), wps=2.8, scramble=True, fragment=True, pause_every=1, pause_s=3.0))
    assert clean.status == "scored" and scrambled.status == "scored"
    assert clean.total > scrambled.total + 15, (clean.total, scrambled.total)
    # the counterexample from the brief, in Hindi, is a scoring-behaviour test
    hi = ["राम आ गए घर"]
    good = score_v2(hi, synthetic_segments("राम आ गए घर", wps=2.5))
    bad = score_v2(hi, synthetic_segments(
        "राम आ गए घर", wps=1.2, scramble=True, fragment=True, pause_every=1, pause_s=4.0))
    assert good.total > bad.total


def test_slow_but_continuous_not_heavily_penalised():
    fast = score_v2(VERSE, synthetic_segments(" ".join(VERSE), wps=3.2))
    slow = score_v2(VERSE, synthetic_segments(" ".join(VERSE), wps=1.7))
    assert fast.status == "scored" and slow.status == "scored"
    # slower delivery loses little — rhythm is 5 points with a gentle taper
    assert fast.total - slow.total <= 6


def test_coverage_caps_the_total():
    one_line = [VERSE[0]]
    full = score_v2(VERSE, synthetic_segments(" ".join(VERSE), wps=2.8))
    partial = score_v2(VERSE, synthetic_segments(VERSE[0], wps=2.8))
    assert partial.status == "scored"
    assert partial.total < full.total * 0.75, (partial.total, full.total)


def test_repeated_word_cannot_cover_multiple():
    # "फलं फलं फलं फलं" covers only the occurrences it actually matches.
    ref = ["फलं ग्रामं रामं बालं"]
    hyp = ["फलं फलं फलं फलं"]
    r = score_v2(ref, synthetic_segments(hyp[0], wps=2.5))
    assert r.evidence["coverage"] < 0.5


def test_unclear_not_invented_zero():
    r = score_v2(VERSE, [Segment(text="")])
    assert r.status == "unclear" and r.total is None
    r2 = score_v2(VERSE, [Segment(text="उं")])
    assert r2.status == "unclear"


def test_components_sum_and_shape():
    r = score_v2(VERSE, _clean())
    c = r.components
    assert set(c) == {"content", "sequence", "continuity", "rhythm"}
    assert abs((c["content"] + c["sequence"] + c["continuity"] + c["rhythm"])
               - r.total) <= 2


def test_long_internal_pauses_hurt_continuity_not_content():
    smooth = score_v2(VERSE, synthetic_segments(" ".join(VERSE), wps=2.8))
    paused = score_v2(VERSE, synthetic_segments(
        " ".join(VERSE), wps=2.8, pause_every=2, pause_s=4.0))
    assert paused.components["content"] >= smooth.components["content"] - 1
    assert paused.components["continuity"] < smooth.components["continuity"]


def test_calibration_ordering_target():
    """The brief's calibration bar, in fixture form: clearly good recordings
    must order above deliberately disrupted ones (≥90% target maps to: every
    clean fixture outranks its disrupted twin here)."""
    cases = [
        ("रामो वनं गच्छति सिता सह", 3.0, 1.5),
        ("सत्यं वद धर्मं चर सत्यं वद", 3.0, 1.5),
        ("वसुधैव कुटुम्बकम् जगत् एकम्", 3.0, 1.5),
    ]
    ok = 0
    for line, wps, pause in cases:
        good = score_v2([line], synthetic_segments(line, wps=wps))
        disrupted = score_v2([line], synthetic_segments(
            line, wps=wps, scramble=True, fragment=True, pause_every=1, pause_s=pause))
        if good.total > disrupted.total:
            ok += 1
    assert ok == len(cases)
