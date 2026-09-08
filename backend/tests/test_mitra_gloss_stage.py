"""Mitrasaṃgraha gloss induction: gates, matching, strict acceptance.

No network, no checkouts — inline TSV samples in tmp files.
"""

from scripts.mitra_gloss_stage import (
    apply_acceptance,
    catalogue_gate,
    collect_pairs,
    english_tokens,
    fold_diacritics,
    induce_candidates,
    merge_plurals,
)


def _write(tmp_path, name, text):
    p = tmp_path / name
    p.write_text(text, encoding="utf-8")
    return p


def test_catalogue_gate_keeps_exact_cc0_only(tmp_path):
    cat = _write(tmp_path, "cat.tsv",
                 "Filename\tTitle\tLicense\tSentence_Pairs\n"
                 "a.tsv\tA\tcc0\t10\n"
                 "b.tsv\tB\tcc0 BY-NC-ND 3.0\t5\n"
                 "c.tsv\tC\tcc0?\t3\n"
                 "d.tsv\tD\t\t2\n")
    assert catalogue_gate(cat) == {"a.tsv"}


def test_english_tokens_lowercase_stopwords_ascii():
    toks = english_tokens("The King, and kings")
    assert "the" not in toks and "and" not in toks
    assert "king" in toks and "kings" in toks


def test_english_tokens_fold_diacritics_and_drop_fragments():
    assert "brahma" in english_tokens("Brahmā himself")
    assert "parvati" in english_tokens("Pârvati (the mountain's daughter)")
    # Reference abbreviations and contractions never become glosses.
    assert english_tokens("see ch. 12, v. 5; K. o'er R.") == ["see"]


def test_merge_plurals_folds_only_when_bare_attested():
    assert merge_plurals({"king": 2, "kings": 3}) == {"king": 5}
    assert merge_plurals({"kings": 3, "glass": 1}) == {"kings": 3, "glass": 1}


def test_fold_diacritics():
    assert fold_diacritics("Brahmā") == "Brahma"
    assert fold_diacritics("Kṛṣṇa") == "Krsna"


def test_candidates_rank_by_pair_support():
    en = ["the king saw the river", "the king praised the priest",
          "old king of the city", "the beggar wept"]
    res = induce_candidates(en)
    assert res["pairs"] == 4
    assert res["candidates"][0] == {"token": "king", "support": 3}


def test_candidates_empty_when_thin():
    assert induce_candidates(["the king wept"]) == {"pairs": 1, "candidates": []}


def _row(iast, pairs, top_token, top_support):
    return {"iast": iast, "gloss": "",
            "_cands": {"pairs": pairs,
                       "candidates": [{"token": top_token, "support": top_support},
                                      {"token": "other", "support": 1}]}}


def test_acceptance_auto_accepts_strong_rare_token():
    rows = [_row("rājā", 25, "king", 24)]
    apply_acceptance(rows)
    assert rows[0]["gloss"] == "king"
    assert rows[0]["gloss_confidence"] == "high"


def test_acceptance_rejects_background_echo_but_keeps_dominant():
    rows = [_row("uvāca", 25, "said", 24),   # genuine verb of saying
            _row("kṛtaṃ", 25, "said", 11),   # contextual echo
            _row("satyaṃ", 25, "said", 12),
            _row("te", 25, "lord", 10),
            _row("hariḥ", 25, "lord", 18),
            _row("x1", 25, "said", 9), _row("x2", 25, "said", 8),
            _row("x3", 25, "said", 9), _row("x4", 25, "said", 8),
            _row("x5", 25, "said", 9), _row("x6", 25, "lord", 9),
            _row("x7", 25, "said", 8), _row("x8", 25, "said", 9)]
    apply_acceptance(rows)
    by = {r["iast"]: r for r in rows}
    assert by["uvāca"]["gloss"] == "said"  # 0.96 beats the background bar
    assert by["kṛtaṃ"]["gloss"] == "" and by["kṛtaṃ"]["gloss_confidence"] == "low"
    assert by["satyaṃ"]["gloss"] == ""
    assert by["te"]["gloss"] == ""          # 0.40 lord-echo
    assert by["hariḥ"]["gloss"] == "lord"   # 0.72 clears it
    assert by["kṛtaṃ"]["gloss_candidates"][0]["background"] is True


def test_acceptance_needs_five_pairs():
    rows = [_row("tiktā", 5, "bitter", 4)]
    apply_acceptance(rows)
    assert rows[0]["gloss"] == ""  # 4/5 = 0.80 but support < 5: candidates only


def test_acceptance_caps_inflated_plural_support():
    rows = [_row("palaṃ", 11, "pala", 16)]  # merger overflow, not 16 real pairs
    apply_acceptance(rows)
    assert rows[0]["gloss"] == "pala"  # still clears on capped 1.0
    assert rows[0]["gloss_support"] == 16  # raw support kept for curation


def test_collect_pairs_skips_ncnd_tree_and_ungated(tmp_path):
    mitra = tmp_path / "data"
    (mitra / "cc-by-sa").mkdir(parents=True)
    (mitra / "cc-by-nc-nd").mkdir(parents=True)
    (mitra / "cc-by-sa" / "a.tsv").write_text(
        "bālaḥ grāmaṃ gacchati\tThe boy goes to the village.\n", encoding="utf-8")
    (mitra / "cc-by-nc-nd" / "evil.tsv").write_text(
        "bālaḥ\tthe trapped boy\n", encoding="utf-8")
    (mitra / "cc-by-sa" / "rogue.tsv").write_text(
        "bālaḥ\tthe rogue boy\n", encoding="utf-8")
    out = collect_pairs(mitra, {"a.tsv"}, {"bālaḥ"})
    assert out["index"]["bālaḥ"] == ["The boy goes to the village."]
    assert out["used_files"] == 1
    assert len(out["skipped"]) == 2  # nc-nd tree + catalogue gate


def test_collect_pairs_caps_per_lemma(tmp_path):
    mitra = tmp_path / "m"
    mitra.mkdir()
    (mitra / "a.tsv").write_text(
        "".join(f"ca word{i}\tEnglish sentence number {i} here.\n" for i in range(40)),
        encoding="utf-8")
    out = collect_pairs(mitra, {"a.tsv"}, {"ca"})
    assert len(out["index"]["ca"]) == 25
