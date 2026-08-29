"""Adaptive engine invariants: abstention must be emotionally free.

    unsure  ->  streak unchanged, mastery unchanged, ratio unchanged
    correct ->  ratio drifts up but NEVER past the user's sanskrit_ratio_setting
    user PATCH /me owns the setting; the system may only move the effective
    ratio UNDER that ceiling (two writers, one owner per value).
"""

from types import SimpleNamespace

from app.adaptive import update_mastery, update_streak


def _learner(streak=3, mastery=None, ratio=0.3, setting=None):
    return SimpleNamespace(
        streak=streak,
        feature_mastery=mastery or {},
        sanskrit_ratio=ratio,
        sanskrit_ratio_setting=setting,
        script_ratio=0.3,
    )


# ─── unsure changes nothing ───

def test_unsure_streak_unchanged():
    ln = _learner(streak=5)
    assert update_streak(ln, "unsure") == 5
    assert ln.streak == 5


def test_unsure_mastery_and_ratio_unchanged():
    ln = _learner(streak=5, mastery={"NOM.SG": 0.5}, ratio=0.4, setting=0.6)
    before = dict(ln.feature_mastery)
    before_ratio = ln.sanskrit_ratio
    update_mastery(ln, ["NOM.SG", "ACC.SG"], "unsure", abstained=True)
    assert ln.feature_mastery == before
    assert ln.sanskrit_ratio == before_ratio


def test_unsure_with_abstained_false_is_still_a_noop():
    """'unsure' must be a no-op regardless of the abstained flag."""
    ln = _learner(streak=2, mastery={"NOM.SG": 0.5})
    update_mastery(ln, ["NOM.SG"], "unsure", abstained=False)
    assert ln.feature_mastery == {"NOM.SG": 0.5}


def test_off_by_one_keeps_streak():
    ln = _learner(streak=4)
    update_streak(ln, "off_by_one")
    assert ln.streak == 4


def test_incorrect_still_resets_streak():
    ln = _learner(streak=4)
    update_streak(ln, "incorrect")
    assert ln.streak == 0


# ─── user setting is the ceiling ───

def test_ratio_never_exceeds_user_setting():
    """35 correct answers from 0.3 with ceiling 0.5 must stop at 0.5."""
    ln = _learner(ratio=0.3, setting=0.5)
    for _ in range(35):
        update_mastery(ln, [], "correct", abstained=False)
    assert ln.sanskrit_ratio == 0.5


def test_legacy_row_without_setting_cannot_drift():
    """setting=None (legacy row): current ratio is its own ceiling — the
    system must not drift sanskrit_ratio without a user-granted ceiling."""
    ln = _learner(ratio=0.3, setting=None)
    update_mastery(ln, [], "correct", abstained=False)
    assert ln.sanskrit_ratio == 0.3
    ln.sanskrit_ratio_setting = 0.9
    update_mastery(ln, [], "correct", abstained=False)
    assert ln.sanskrit_ratio == 0.32


def test_ratio_descends_below_ceiling_on_incorrect():
    ln = _learner(ratio=0.4, setting=0.8)
    update_mastery(ln, [], "incorrect", abstained=False)
    assert ln.sanskrit_ratio == 0.39


def test_correct_still_increases_mastery():
    ln = _learner(mastery={"NOM.SG": 0.5})
    update_mastery(ln, ["NOM.SG"], "correct", abstained=False)
    assert ln.feature_mastery["NOM.SG"] > 0.5
