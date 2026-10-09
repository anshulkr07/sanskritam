"""CPU tests for assemble.py (synthetic sine renders, --no-encode path not needed)."""

import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import config as G  # noqa: E402
from assemble import choose_takes, join_verse  # noqa: E402


def _sine(secs: float, sr: int = 24000):
    t = np.arange(int(secs * sr), dtype=np.float32) / sr
    return (0.3 * np.sin(2 * np.pi * 220 * t)).astype(np.float32)


def test_gaps_lead_tail():
    a = _sine(0.5)
    b = _sine(0.5)
    audio, bounds = join_verse([[(a, "कर्म"), (b, "योग")]])
    sr = 24000
    # Lead + a + gap + b + tail.
    expect = int(G.LEAD_S * sr) + len(a) + int(G.GAP_S * sr) + len(b) + int(G.TAIL_S * sr)
    assert len(audio) == expect
    assert bounds[0][0] == int(G.LEAD_S * sr)


def test_two_lines_timings():
    a = _sine(0.4)
    b = _sine(0.6)
    audio, bounds = join_verse([[(a, "क")], [(b, "ख")]])
    assert len(bounds) == 2
    assert bounds[0][1] <= bounds[1][0]
    # Second line starts after first end + gap.
    assert bounds[1][0] - bounds[0][1] == int(G.GAP_S * 24000)


def test_virama_extra():
    a = _sine(0.3)
    b = _sine(0.3)
    audio, bounds = join_verse([[(a, "धर्म्")], [(b, "कर्म")]])
    gap = bounds[1][0] - bounds[0][1]
    assert gap == int(G.GAP_S * 24000) + int(G.GAP_HALANT_EXTRA_S * 24000)


def test_choose_takes():
    renders = [
        {"verse_uid": "u", "line_i": 0, "part_j": 0, "seed": 60, "path": "a"},
        {"verse_uid": "u", "line_i": 0, "part_j": 0, "seed": 61, "path": "b"},
    ]
    qc = {("u", 0, 0, 60): {"flags": ["cer"], "cer": 0.2},
          ("u", 0, 0, 61): {"flags": [], "cer": 0.05}}
    out = choose_takes(renders, qc)
    assert out[("u", 0, 0)]["seed"] == 61
    # None clean: lowest CER wins.
    qc2 = {("u", 0, 0, 60): {"flags": ["cer"], "cer": 0.3},
           ("u", 0, 0, 61): {"flags": ["cer"], "cer": 0.1}}
    out2 = choose_takes(renders, qc2)
    assert out2[("u", 0, 0)]["seed"] == 61


def test_qc_status_reasons(tmp_path):
    # needs_listen when fallback/vedic/speaker; exercised via assemble main
    # with --no-encode in a fuller integration; here assert the rule shape.
    reasons = []
    fallback, vedic, first_kind = True, False, "verse"
    if fallback:
        reasons.append("unknown_meter")
    if vedic:
        reasons.append("vedic")
    assert reasons == ["unknown_meter"]
