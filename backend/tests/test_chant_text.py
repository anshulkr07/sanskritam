"""Tests for services/chant_text.py (handover_recite 4.2, 5.9)."""

from app.services.chant_text import chant_lines, verse_uid


def test_verse_uid_stable_and_distinct():
    a = verse_uid("Bhagavad Gītā 1.1", "धर्मक्षेत्रे कुरुक्षेत्रे")
    b = verse_uid("Bhagavad Gītā 1.1", "धर्मक्षेत्रे कुरुक्षेत्रे")
    c = verse_uid("Bhagavad Gītā 1.2", "धर्मक्षेत्रे कुरुक्षेत्रे")
    assert a == b and len(a) == 16
    assert a != c


def test_gita_speaker_and_number():
    # Bhagavad Gītā 1.1 (real row).
    dev = "धृतराष्ट्र उवाच ।\nधर्मक्षेत्रे कुरुक्षेत्रे समवेता युयुत्सवः ।\nमामकाः पाण्डवाश्चैव किमकुर्वत सञ्जय ॥ १ ॥"
    lines = chant_lines(dev)
    assert lines[0]["kind"] == "speaker"
    assert lines[0]["tts"].endswith("उवाच")
    # Verse number folded into previous line's display text.
    assert "१" in lines[-1]["text"]
    assert all(ln["parts"] for ln in lines)
    assert [ln["i"] for ln in lines] == list(range(len(lines)))


def test_hitopadesa_one_line():
    # One-line Hitopadeśa shape with । and ॥.
    dev = "परोपकारार्थमिदं शरीरम्।"
    lines = chant_lines(dev)
    assert len(lines) == 1
    assert lines[0]["kind"] == "verse"
    assert lines[0]["syllables"] > 0


def test_brackets_zwj_long_line():
    dev = "यतः प्रवृत्तिर्भूतानां (पाठः) येन सर्वमिदं ततम्। स्वकर्मणा तमभ्यर्च्य सिद्धिं विन्दति मानवः॥"
    lines = chant_lines(dev)
    assert all("(" not in ln["tts"] and ")" not in ln["tts"] for ln in lines)
    # Long line splits into parts.
    long_dev = " ".join(["धर्मक्षेत्रे"] * 30) + "।"
    long_lines = chant_lines(long_dev)
    assert len(long_lines) == 1
    assert len(long_lines[0]["parts"]) >= 2
    assert long_lines[0]["syllables"] > 44


def test_empty_and_number_alone():
    assert chant_lines("") == []
    assert chant_lines("॥ ४७ ॥") == []
    # TTS strips accents/joiners.
    lines = chant_lines("सत्यं वद। धर्मं चर। स्वाध्यायान्मा प्रमदः।")
    assert len(lines) == 3
