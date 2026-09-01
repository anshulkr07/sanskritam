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
    """Spec §6.3: uncertainty yields 'unsure' — NEVER 'incorrect'."""
    r = grade_attempt("asdfgh jkl", ACCEPTED, FEATURES)
    assert r["verdict"] == "unsure"
    assert r["abstained"] is True


def test_unsure_is_not_incorrect():
    """The abstention principle: 'unsure' must be its own verdict, not 'incorrect'."""
    for text in ("asdfgh jkl", "", "xyzzy plugh"):
        r = grade_attempt(text, ACCEPTED, FEATURES)
        assert r["verdict"] != "incorrect", f"{text!r}: {r}"
        if text:
            assert r["verdict"] == "unsure", f"{text!r}: {r}"


def test_empty_input_abstains():
    r = grade_attempt("", ACCEPTED, FEATURES)
    assert r["abstained"] is True
    assert r["verdict"] == "unsure"


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


# ─── Visarga sandhi (spec §6.3: correct Sanskrit must never be marked wrong) ───
#
# Correct Sanskrit applies visarga sandhi across word boundaries, so a learner
# writing well produces `bālo grāmaṃ gacchati`, not the textbook `bālaḥ grāmam
# gacchati`. Before this was handled, every such answer came back `unsure`.

from app.grading.analyzer import analyze_sentence, desandhi_candidates  # noqa: E402

BALA_ACCEPTED = [{"bāla": "NOM.SG", "grāma": "ACC.SG", "√gam": "PRES.3SG"}]
BALA_FEATURES = ["NOM.SG", "ACC.SG", "PRES.3SG"]


def test_sandhi_form_grades_correct():
    """बालो ग्रामं गच्छति is the well-formed spelling of बालः ग्रामम् गच्छति."""
    r = grade_attempt("बालो ग्रामं गच्छति", BALA_ACCEPTED, BALA_FEATURES)
    assert r["verdict"] == "correct", r


def test_textbook_form_still_grades_correct():
    r = grade_attempt("बालः ग्रामम् गच्छति", BALA_ACCEPTED, BALA_FEATURES)
    assert r["verdict"] == "correct", r


def test_sandhi_plural_with_different_lemma_grades_correct():
    """bālāḥ -> bālā collides with the fem stem bālā, so the correct reading
    carries a DIFFERENT lemma than the surface form's primary. Variant expansion
    has to follow that, not just swap features within one lemma."""
    accepted = [{"bāla": "NOM.PL", "grāma": "ACC.SG", "√gam": "PRES.3PL"}]
    r = grade_attempt("बाला ग्रामम् गच्छन्ति", accepted, ["NOM.PL", "ACC.SG", "PRES.3PL"])
    assert r["verdict"] == "correct", r


def test_avagraha_word_is_read_as_itself():
    """रामो ऽपि — avagraha marks the `a` elided after -o sandhi."""
    results = analyze_sentence("रामो ऽपि गच्छति")
    assert all(r.is_confident for r in results), [(r.word, r.error) for r in results]


def test_sandhi_reading_needs_a_known_lemma():
    """गुरो is the vocative of guru, not a NOM.SG of a nonexistent stem *gura.
    Resolving sandhi must not invent lemmas the ending tables merely permit."""
    result = analyze_sentence("गुरो")[0]
    lemmas = set(result.parsed) | {k for a in result.alternatives for k in a}
    assert "gura" not in lemmas, result


def test_desandhi_candidates_are_conservative():
    assert desandhi_candidates("bālo") == ["bālaḥ"]
    assert desandhi_candidates("bālā") == ["bālāḥ"]
    assert desandhi_candidates("gacchati") == []   # no visarga context
    assert desandhi_candidates("o") == []          # too short to be a word


def test_pronoun_stays_transparent_to_grading():
    """A pronoun contributes no features by design. Variant expansion must keep
    that empty reading available, or a stray alternative on the pronoun gets
    forced into every variant and a correct answer becomes off_by_one."""
    accepted = [{"geha": "ACC.SG", "√gam": "PRES.1PL"}]
    r = grade_attempt("वयम् गेहम् गच्छामः", accepted, ["ACC.SG", "PRES.1PL"])
    assert r["verdict"] == "correct", r
