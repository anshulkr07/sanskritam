"""Shared case tables for chapter 3: देव / फल / लता in one case, three numbers.

The forms are written out (authored data, never computed at import) and each
cell carries its engine check, so the verifier proves every one."""

from __future__ import annotations

from .model import cell, sub, table

_STEMS = (("देव", "Pum"), ("फल", "Napumsaka"), ("लता", "Stri"))
_NUMBERS = ("Eka", "Dvi", "Bahu")

CASE_FORMS = {
    "Dvitiya": (("देवम्", "देवौ", "देवान्"), ("फलम्", "फले", "फलानि"), ("लताम्", "लते", "लताः")),
    "Trtiya": (("देवेन", "देवाभ्याम्", "देवैः"), ("फलेन", "फलाभ्याम्", "फलैः"), ("लतया", "लताभ्याम्", "लताभिः")),
    "Caturthi": (("देवाय", "देवाभ्याम्", "देवेभ्यः"), ("फलाय", "फलाभ्याम्", "फलेभ्यः"),
                 ("लतायै", "लताभ्याम्", "लताभ्यः")),
    "Panchami": (("देवात्", "देवाभ्याम्", "देवेभ्यः"), ("फलात्", "फलाभ्याम्", "फलेभ्यः"),
                 ("लतायाः", "लताभ्याम्", "लताभ्यः")),
    "Sasthi": (("देवस्य", "देवयोः", "देवानाम्"), ("फलस्य", "फलयोः", "फलानाम्"), ("लतायाः", "लतयोः", "लतानाम्")),
    "Saptami": (("देवे", "देवयोः", "देवेषु"), ("फले", "फलयोः", "फलेषु"), ("लतायाम्", "लतयोः", "लतासु")),
}


def case_forms_table(case: str, caption: tuple[str, str]) -> dict:
    rows = []
    for (stem, linga), forms in zip(_STEMS, CASE_FORMS[case]):
        rows.append([cell(stem)] + [cell(form, sub(stem, linga, case, number))
                                    for form, number in zip(forms, _NUMBERS)])
    return table(caption, [("Stem", "मूल शब्द"), ("One", "एकवचन"), ("Two", "द्विवचन"), ("Many", "बहुवचन")],
                 rows)
