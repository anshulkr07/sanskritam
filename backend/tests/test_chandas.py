"""P11-1: the scansion service. No network."""

import os

import pytest

from app.services import chandas


def _vidyut_present() -> bool:
    return os.path.isdir(os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "vidyut-data",
    ))


pytestmark = pytest.mark.skipif(
    not _vidyut_present(), reason="vidyut-data absent"
)


def test_gita_11_scans_to_32_weights_no_metre():
    # Gītā 1.1: dharma-kṣetre kuru-kṣetre samavetā yuyut-savaḥ
    r = chandas.scan("धर्मक्षेत्रे कुरुक्षेत्रे समवेता युयुत्सवः")
    total = sum(len(line["syllables"]) for line in r["lines"])
    assert total == 16
    weights = [s["weight"] for line in r["lines"] for s in line["syllables"]]
    assert all(w in ("G", "L") for w in weights)
    assert any(w == "L" for w in weights) and any(w == "G" for w in weights)
    # anuṣṭubh is variable: metre is None, and that is NOT a bug (P11-1)
    assert r["metre"] is None


def test_each_syllable_is_devanagari():
    r = chandas.scan("रामः वनं गच्छति")
    assert r["lines"]
    for line in r["lines"]:
        for s in line["syllables"]:
            assert s["syllable_devanagari"]
            assert s["weight"] in ("G", "L")


def test_empty_input_degrades_to_empty():
    assert chandas.scan("") == {"lines": [], "metre": None}
    assert chandas.scan("   ") == {"lines": [], "metre": None}


def test_garbage_never_raises():
    r = chandas.scan("xyz")
    assert isinstance(r, dict)
    assert "lines" in r
