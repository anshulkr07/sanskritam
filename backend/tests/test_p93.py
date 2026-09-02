"""P9-3: derive the correct form on a grammatical mismatch — this is an
addition to (never a replacement for) the LLM gloss. Never on `unsure`."""

import pytest

from app.routers.attempts import _attempt_derivation

# a minimal stand-in Challenge-shaped object
class _C:
    target_sanskrit = "रामः फलम् खादति।"


def test_no_derivation_on_correct():
    assert _attempt_derivation("correct", False, _C()) is None


def test_no_derivation_on_unsure_or_abstained():
    assert _attempt_derivation("unsure", False, _C()) is None
    assert _attempt_derivation("incorrect", True, _C()) is None


def test_derivation_present_on_incorrect():
    der = _attempt_derivation("incorrect", False, _C())
    assert der is not None
    assert der["steps"]
    # the derivation is an explanation, not a claim about the learner
    assert der["step_count"] >= 1


def test_derivation_present_on_off_by_one():
    der = _attempt_derivation("off_by_one", False, _C())
    assert der is not None and der["steps"]


def test_underivable_target_never_raises():
    # A target with no recognized Sanskrit word must NOT raise — it either
    # finds a derivation or returns None, but never 500s a lesson (P9-1.4).
    class _C2:
        target_sanskrit = "zzzqqq"
    der = _attempt_derivation("incorrect", False, _C2())
    assert der is None or isinstance(der, dict)


def test_empty_target_is_none():
    class _C3:
        target_sanskrit = ""
    assert _attempt_derivation("incorrect", False, _C3()) is None