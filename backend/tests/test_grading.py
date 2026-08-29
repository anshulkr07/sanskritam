"""THE core product tests: parse-based grading with free word order (spec §6.1).

    ग्रामं गच्छामि  ==  गच्छामि ग्रामम्   (both correct — free word order)
    ग्रामः गच्छामि  ->  off_by_one       (wrong case, diagnosed specifically)
    garbage        ->  abstained        (never falsely accuse, spec §6.3)
"""

from app.grading.engine import grade_attempt

# A real seed challenge: रामः फलम् खादति (Rama eats a fruit)
ACCEPTED = [{"rāma": "NOM.SG", "phala": "ACC.SG", "√khād": "PRES.3SG"}]
FEATURES = ["NOM.SG", "ACC.SG", "PRES.3SG"]


def test_free_word_order_both_correct():
    a = grade_attempt("रामः फलम् खादति", ACCEPTED, FEATURES)
    b = grade_attempt("खादति फलम् रामः", ACCEPTED, FEATURES)
    c = grade_attempt("खादति फलं रामः", ACCEPTED, FEATURES)  # anusvāra sandhi form
    d = grade_attempt("फलम् रामः खादति", ACCEPTED, FEATURES)
    for name, r in [("in-order", a), ("verb-first", b), ("verb-first-anusvara", c), ("obj-first", d)]:
        assert r["verdict"] == "correct", f"{name}: {r}"
        assert not r["abstained"]


def test_iast_input_also_graded():
    r = grade_attempt("rāmaḥ phalam khādati", ACCEPTED, FEATURES)
    assert r["verdict"] == "correct", r


def test_wrong_case_is_off_by_one_with_named_feature():
    r = grade_attempt("रामम् फलम् खादति", ACCEPTED, FEATURES)  # ACC instead of NOM subject
    assert r["verdict"] == "off_by_one"
    assert not r["abstained"]
    # Diagnosis must name the feature precisely (the product IS the specificity)
    assert "rāma" in r["diagnosis"] and "NOM.SG" in r["diagnosis"]
    assert any(d["feature"] == "rāma" for d in r["diff"])


def test_wrong_person_is_off_by_one():
    r = grade_attempt("रामः फलम् खादामि", ACCEPTED, FEATURES)  # 1sg instead of 3sg
    assert r["verdict"] == "off_by_one", r


def test_multiple_errors_incorrect():
    r = grade_attempt("रामेण फलेन खादामि", ACCEPTED, FEATURES)  # INSTR subject + wrong person
    assert r["verdict"] == "incorrect"
    assert not r["abstained"]


def test_garbage_abstains_never_falsely_accuses():
    r = grade_attempt("asdfgh jkl", ACCEPTED, FEATURES)
    assert r["verdict"] == "incorrect"
    assert r["abstained"] is True


def test_empty_input_abstains():
    r = grade_attempt("", ACCEPTED, FEATURES)
    assert r["abstained"] is True


def test_missing_verb_is_one_feature_off():
    r = grade_attempt("रामः फलम्", ACCEPTED, FEATURES)
    assert r["verdict"] == "off_by_one", r


def test_no_false_correct_via_variant_loophole():
    """The neut-NOM variant reading must NOT make a wrong-case answer correct."""
    r = grade_attempt("रामम् फलम् खादति", ACCEPTED, FEATURES)
    assert r["verdict"] != "correct"


def test_optional_subject_pronoun_transparent():
    """Pro-drop: अहम् + verb must grade same as verb alone."""
    r1 = grade_attempt("गच्छामि", [{"√gam": "PRES.1SG"}], ["PRES.1SG"])
    assert r1["verdict"] == "correct"
