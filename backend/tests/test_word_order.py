"""P11-3: the word-order service. No network, no DB.

Equivalence is decided by the SAME analyze_sentence + feature_set_variants the
grader uses — never hand-written permutation rules (HANDOVER P11-3.2).
"""

from app.services.word_order import equivalent_orders


def test_three_word_sentence_returns_equivalent_orders():
    r = equivalent_orders("बालः ग्रामं गच्छति")
    assert r["words"] == ["बालः", "ग्रामं", "गच्छति"]
    assert len(r["equivalent_orders"]) >= 1
    # the original order is always equivalent to itself
    assert ["बालः", "ग्रामं", "गच्छति"] in r["equivalent_orders"]
    # every returned permutation is genuinely a permutation
    for order in r["equivalent_orders"]:
        assert sorted(order) == sorted(r["words"])


def test_per_word_carries_role():
    r = equivalent_orders("बालः ग्रामं गच्छति")
    roles = {w["word"]: w["role"] for w in r["per_word"]}
    assert "बालः" in roles
    assert "ग्रामं" in roles
    assert "गच्छति" in roles
    # every word has an ending that carries its role
    assert all(w["ending"] for w in r["per_word"])


def test_wrong_endings_change_meaning():
    r = equivalent_orders("बालः ग्रामं गच्छति")
    assert r["wrong_endings"]
    for w in r["wrong_endings"]:
        assert w["word"]
        assert w["wrong_ending"]
        assert w["effect"]


def test_length_cap_is_explicit_refusal_not_empty():
    long_sentence = " ".join(["देवः"] * 6)
    r = equivalent_orders(long_sentence)
    assert r["refused"] is not None
    assert "too many words" in r["refused"]
    assert r["equivalent_orders"] == []
    # NOTE: the refusal is distinct from an empty result (invariant §2.11)
    assert len(r["words"]) == 6


def test_empty_degrades():
    r = equivalent_orders("")
    assert r["words"] == []
    assert r["refused"] is None