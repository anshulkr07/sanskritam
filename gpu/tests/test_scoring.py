"""CPU tests for asr/scoring.py (no model)."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from asr import scoring as S  # noqa: E402


def test_canon_marks_digits_dandas():
    assert S.canon("कर्म ॥ ४७ ॥") == "कर्म"
    # Doubled combining mark collapses.
    assert S.canon("कर्म") == S.canon("कर्म")
    # Word-final m+virama -> anusvara.
    assert "ं" in S.canon("धर्मम् ॥")
    assert "म्" not in S.canon("धर्मम् ॥").replace("ं", "")


def test_aksharas_real():
    aks = S.aksharas("कर्म योग")
    assert aks and all(a.strip() for a in aks)
    # Spaces dropped.
    assert " " not in "".join(aks).replace("र्म", "र्म")


def test_align_match_sub_del():
    assert S.align(["क", "र्म"], ["क", "र्म"]) == [("match", ""), ("match", "")]
    assert S.align(["क"], ["ख"]) == [("sub", "ख")]
    assert S.align(["क", "ख"], ["क"]) == [("match", ""), ("del", "")]
    # Insertions ignored: extra hyp token yields no extra op.
    assert len(S.align(["क"], ["क", "ख"])) == 1


def test_bands_strict_liberal():
    ref = ["क", "र्म", "य"]
    h0 = ["क", "र्म", "य"]
    h1 = ["क", "म", "य"]
    strict = S.bands(ref, [h0, h0, h0], strict=True)
    assert [b["band"] for b in strict] == ["green", "green", "green"]
    strict2 = S.bands(ref, [h1, h1, h1], strict=True)
    assert strict2[1]["band"] == "red"
    # Mixed: strict amber, liberal green (one match suffices).
    mixed = S.bands(ref, [h0, h1, h1], strict=True)
    assert mixed[1]["band"] == "amber"
    lib = S.bands(ref, [h0, h1, h1], strict=False)
    assert lib[1]["band"] == "green"


def test_percent():
    b = [{"band": "green"}, {"band": "red"}, {"band": "amber"}, {"band": "green"}]
    assert abs(S.percent(b, True) - 0.5) < 1e-9
    assert abs(S.percent(b, False) - (2 / 3)) < 1e-9
    assert S.percent([], True) == 0.0


def test_score_two_lines_and_unclear():
    ref = ["कर्म योग", "धर्म क्षेत्र"]
    hyps = ["कर्म योग", "कर्म योग", "कर्म योग"]
    # Build decodes equal to canon of refs so all green.
    r = S.score(ref, ref + ["x"][:0] or ref[:1] + ref[1:] + ref[:1], strict=True)
    assert r["status"] in ("scored", "unclear")
    # Unclear: too few reference aksharas.
    u = S.score(["क"], ["क", "क", "क"])
    assert u["status"] == "unclear" and u["lines"] == []
    # Unclear: hypo too short.
    u2 = S.score(["कर्म योग धर्म"], ["क", "क", "क"])
    assert u2["status"] == "unclear"


def test_cer():
    assert S.cer("कर्म", "कर्म") == 0.0
    c = S.cer("कर्म", "धर्म")
    assert 0.0 < c <= 1.0
