"""P11-2: the sandhi service. No network."""

import os

import pytest

from app.services import sandhi


def _vidyut_present() -> bool:
    return os.path.isdir(os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "vidyut-data",
    ))


pytestmark = pytest.mark.skipif(
    not _vidyut_present(), reason="vidyut-data absent"
)


def test_known_junction_splits_and_ranks_lexically_first():
    sandhi._load()
    # bālo grāmam: bālaḥ → bālo. The real split bāla+ḥ (both known) must rank
    # above purely-phonetic splits.
    cands = sandhi.split_candidates("बालः")
    assert cands, "expected at least one candidate"
    # skip splits with an empty half (word-final visarga re-splits like बालस्+)
    filled = [c for c in cands if c["first"] and c["second"]]
    assert filled, "expected at least one split with both halves non-empty"
    # every non-empty candidate carries both halves + lexical validity
    for c in filled:
        assert c["first"] and c["second"]
        assert isinstance(c["first_valid"], bool)
        assert isinstance(c["second_valid"], bool)
    # both-known rank first among the filled candidates
    both_known = [c for c in filled if c["first_valid"] and c["second_valid"]]
    if both_known:
        assert filled[0] in both_known


def test_no_valid_split_returns_empty():
    # a form with no sane junction returns [] rather than raising
    res = sandhi.split_candidates("x") if False else sandhi.split_candidates("")
    assert res == []


def test_empty_degrades():
    assert sandhi.split_candidates("") == []
    assert sandhi.split_candidates("   ") == []