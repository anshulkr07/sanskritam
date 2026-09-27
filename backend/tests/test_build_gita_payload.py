"""P21-5 — the Gītā payload builder (scripts/build_gita_payload.py).

Converts the MIT-licensed deepakrakshit/bhagavad-gita-dataset (700 verses,
Devanagari + IAST + Hindi + English) into an import_text payload. These tests
run on a tiny synthetic slice of the dataset shape — no network.

What the builder must guarantee:
- Every verse carries the source licence (§6: no licence, no import).
- Refs use the existing corpus format "Bhagavad Gītā <c>.<v>" so the 51
  seeded Gītā rows dedupe against the import (§2.14: judge by DISTINCT rows).
- Hindi + English translations ride in translation_hi / translation_en
  (the migration e4f5a6b7c8d9 columns); explanations are NOT dropped —
  they ride in the payload and land nowhere for now (reader shows translation).
- Register is "classical" (the Gītā is epic-classical, not Vedic).
"""

import json

from scripts.build_gita_payload import (
    DATASET_LICENCE,
    build_payload,
    build_payload_from_dir,
)


def _chapter(chapter_no, verses):
    return {
        "chapter_number": chapter_no,
        "chapter_title": {"sanskrit": "अर्जुनविषादयोग", "iast": "arjuna-visada-yoga"},
        "total_verses": len(verses),
        "verses": verses,
    }


def _verse(chapter, verse_no):
    return {
        "chapter": chapter,
        "verse_number": verse_no,
        "global_verse_id": (chapter - 1) * 47 + verse_no,
        "speaker": "Sri Bhagavan",
        "sanskrit": {
            "devanagari": "धृतराष्ट्र उवाच।",
            "iast": "dhṛtarāṣṭra uvāca",
        },
        "hindi": {"translation": "धृतराष्ट्र ने कहा।", "explanation": "..."},
        "english": {"translation": "Dhṛtarāṣṭra said.", "explanation": "..."},
    }


def test_build_payload_maps_verse_shape_and_licence():
    payload = build_payload([_chapter(1, [_verse(1, 1), _verse(1, 2)])])
    assert payload["licence"] == DATASET_LICENCE
    assert payload["register"] == "classical"
    assert "bhagavad-gita-dataset" in payload["source"] and "MIT" in payload["licence"]
    assert len(payload["verses"]) == 2
    v = payload["verses"][0]
    assert v["ref"] == "Bhagavad Gītā 1.1"
    assert v["devanagari"] == "धृतराष्ट्र उवाच।"
    # The dataset's own IAST is recorded as provenance (iast_src) — never
    # re-typed. The ROW's iast is lipi-derived downstream in import_text.
    assert v["iast_src"] == "dhṛtarāṣṭra uvāca"
    assert v["translation_hi"] == "धृतराष्ट्र ने कहा।"
    assert v["translation_en"] == "Dhṛtarāṣṭra said."


def test_build_payload_skips_empty_verse_text():
    broken = _verse(1, 3)
    broken["sanskrit"]["devanagari"] = ""
    payload = build_payload([_chapter(1, [broken, _verse(1, 4)])])
    assert [v["ref"] for v in payload["verses"]] == ["Bhagavad Gītā 1.4"]


def test_build_payload_over_dataset_files():
    """End-to-end over the real downloaded dataset (present when the ETL ran)."""
    import pathlib

    data_dir = pathlib.Path(__file__).resolve().parent.parent / "results/imports/source_data/bhagavad-gita-dataset/dataset"
    files = sorted(data_dir.glob("chapter_*.json"))
    if not files:
        import pytest
        pytest.skip("dataset not downloaded")
    payload = build_payload_from_dir(data_dir)
    assert len(payload["verses"]) == 700
    refs = [v["ref"] for v in payload["verses"]]
    assert len(set(refs)) == 700  # §2.14: distinct refs
    assert refs[0] == "Bhagavad Gītā 1.1" and refs[-1] == "Bhagavad Gītā 18.78"
