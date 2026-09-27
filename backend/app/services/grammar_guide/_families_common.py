"""Full noun tables for chapter 4: 8 cases × 3 numbers, every cell engine-checked.

Forms are written out as authored data (one line per case, three forms each)
and verified cell by cell in tests — never computed at import."""

from __future__ import annotations

from typing import Optional

from .model import cell, sub, table, tad, tc, tin

CASE_ROWS = (
    (("Nominative", "प्रथमा"), "Prathama"),
    (("Accusative", "द्वितीया"), "Dvitiya"),
    (("Instrumental", "तृतीया"), "Trtiya"),
    (("Dative", "चतुर्थी"), "Caturthi"),
    (("Ablative", "पञ्चमी"), "Panchami"),
    (("Genitive", "षष्ठी"), "Sasthi"),
    (("Locative", "सप्तमी"), "Saptami"),
    (("Vocative", "सम्बोधन"), "Sambodhana"),
)
NUMBERS = ("Eka", "Dvi", "Bahu")


def noun_table(stem: str, linga: str, lines: list[str], caption: tuple[str, str], *,
               stem_type: Optional[str] = None, note: Optional[tuple[str, str]] = None,
               taddhita: Optional[tuple[str, str]] = None, highlight: bool = True) -> dict:
    """``lines``: space-separated ``"sg du pl"`` strings, nominative first —
    eight lines, or seven for pronouns (they have no vocative).

    ``taddhita=(base, suffix)`` checks each cell as a derived word (भग + matup
    for भगवत्) instead of as a plain stem. ``highlight=False`` for pronouns,
    whose forms are different words (अहम्, माम्, मया) with no shared ending."""
    if len(lines) not in (len(CASE_ROWS) - 1, len(CASE_ROWS)):
        raise ValueError(f"{stem}: expected 7 or 8 case lines, got {len(lines)}")

    def check(vibhakti: str, number: str) -> dict:
        if taddhita:
            return tad(taddhita[0], taddhita[1], linga, vibhakti, number, stem_type=stem_type)
        return sub(stem, linga, vibhakti, number, stem_type=stem_type)

    rows = []
    for ((en, hi), vibhakti), line in zip(CASE_ROWS, lines):
        forms = line.split()
        if len(forms) != 3:
            raise ValueError(f"{stem} {vibhakti}: expected three forms, got {line!r}")
        rows.append([tc(en, hi)] + [cell(f, check(vibhakti, n)) for f, n in zip(forms, NUMBERS)])
    return table(caption, [("Case", "विभक्ति"), ("One", "एकवचन"), ("Two", "द्विवचन"), ("Many", "बहुवचन")],
                 rows, stem=stem if highlight else None, note=note)


PERSON_ROWS = (
    (("he, she, it", "वह (प्रथम पुरुष)"), "Prathama"),
    (("you", "तुम (मध्यम पुरुष)"), "Madhyama"),
    (("I, we", "मैं, हम (उत्तम पुरुष)"), "Uttama"),
)


def verb_table(root: str, lakara: str, lines: list[str], caption: tuple[str, str], *,
               stem: Optional[str] = None, note: Optional[tuple[str, str]] = None,
               prayoga: Optional[str] = None, prefixes: Optional[list[str]] = None,
               sanadi: Optional[list[str]] = None, gana: Optional[str] = None) -> dict:
    """A 3 × 3 verb grid. ``lines``: three space-separated ``"sg du pl"``
    strings — he/she/it, you, I — each cell checked as a conjugated form.
    ``stem`` (e.g. पठ) marks the endings for highlighting."""
    if len(lines) != len(PERSON_ROWS):
        raise ValueError(f"{root} {lakara}: expected {len(PERSON_ROWS)} person lines, got {len(lines)}")
    rows = []
    for ((en, hi), purusha), line in zip(PERSON_ROWS, lines):
        forms = line.split()
        if len(forms) != 3:
            raise ValueError(f"{root} {lakara} {purusha}: expected three forms, got {line!r}")
        rows.append([tc(en, hi)] + [
            cell(f, tin(root, lakara, purusha, n, prayoga=prayoga, prefixes=prefixes, sanadi=sanadi, gana=gana))
            for f, n in zip(forms, NUMBERS)
        ])
    return table(caption, [("Person", "पुरुष"), ("One", "एकवचन"), ("Two", "द्विवचन"), ("Many", "बहुवचन")],
                 rows, stem=stem, note=note)
