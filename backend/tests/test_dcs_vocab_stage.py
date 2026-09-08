"""DCS vocab staging: tokenizer, converter, and parse-drop rules.

No network, no DCS checkout needed — tests use inline IAST samples and tmp
files. The live run is `scripts/dcs_vocab_stage.py --dir <corpora>`.
"""

import json

from scripts.dcs_vocab_stage import frequency, stage_word, tokenize


def test_tokenize_strips_verse_refs_and_folds_case(tmp_path):
    text = "oṃ pañcātmakaṃ pañcasu vartamānaṃ / (1.1)\ntaṃ saptadhātuṃ // (1.2)"
    toks = tokenize(text)
    assert "oṃ" in toks and "pañcātmakaṃ" in toks and "taṃ" in toks
    assert not any(ch.isdigit() or ch in "()/." for t in toks for ch in t)
    assert toks == [t.lower() for t in toks]
    assert all(len(t) > 1 for t in toks)


def test_tokenize_drops_single_char_debris():
    assert "a" not in tokenize("a yaḥ saḥ")
    assert "yaḥ" in tokenize("a yaḥ saḥ")


def test_frequency_counts_and_indexes(tmp_path):
    (tmp_path / "x.txt").write_text(
        "bālaḥ grāmaṃ gacchati / (1.1)\nbālaḥ paśyati // (1.2)\n",
        encoding="utf-8")
    counts, index = frequency(tmp_path)
    assert counts["bālaḥ"] == 2
    assert len(index["bālaḥ"]) == 2
    assert counts["gacchati"] == 1


def test_frequency_skips_unreadable_file(tmp_path):
    (tmp_path / "bad.txt").write_bytes(b"\xff\xfe\x00bad")
    (tmp_path / "ok.txt").write_text("bālaḥ / (1.1)\n", encoding="utf-8")
    counts, _ = frequency(tmp_path)
    assert counts["bālaḥ"] == 1


def test_stage_word_parses_known_form():
    row = stage_word("bālaḥ", 42, ["bālaḥ grāmaṃ gacchati"])
    assert row is not None
    assert row["devanagari"] == "बालकः" or row["devanagari"]
    assert row["lemma"] and row["freq"] == 42
    # Curation-owned fields stay empty — never guessed.
    assert row["gender"] == "" and row["stem"] == ""
    assert row["gloss"] == "" and row["topic"] is None
    assert row["provenance"].startswith("dcs:")
    assert row["source_key"] == "dcs"
    assert all(ex["gloss"] == "" and ex["devanagari"] for ex in row["examples"])


def test_stage_word_drops_unparsable():
    assert stage_word("zzzzqqqq", 1, []) is None


def test_staged_json_shape(tmp_path):
    row = stage_word("bālaḥ", 7, [])
    assert row is not None
    blob = json.dumps([row], ensure_ascii=False)
    back = json.loads(blob)[0]
    assert set(back) == {"rank", "iast", "devanagari", "lemma", "freq",
                         "gender", "stem", "gloss", "topic", "examples",
                         "provenance", "source_key", "licence"}
