"""The curriculum spine — eleven units (P23-1 / CURRICULUM.md §6.2).

The spine used to be a document. ``Lesson.unit_id`` was a bare string, so
nothing in the system could enumerate the units, order them, or say which
conceptual layer each belongs to — the Path rendered a flat list of
grammatical tags instead, and "Unit 6: Sandhi" existed only in prose.

``layer`` is CURRICULUM.md §6.1's three-layer model, and it is the whole
pedagogical argument in one column:

- **0 — the alphabet as a mathematical set.** Not a list of letters: a 5×5
  grid indexed by place of articulation and effort.
- **1 — word formation as functions.** sandhi = f(a,b)→c; declension =
  (stem, vibhakti, vacana, liṅga) → form, a 24-cell tensor; conjugation =
  five dials over ~180 forms.
- **2 — sentence construction as relations.** kāraka maps meaning to
  ending; samāsa composes words.

Migration ``f1a2b3c4d5e6`` inserts the same eleven rows so that
``lessons.unit_id`` has something to point at the moment its foreign key
lands. That duplication is deliberate: a migration is a frozen snapshot and
must never import application code. This module is the live source — it
retunes titles and blurbs on every boot; the migration does not.
"""

from __future__ import annotations

import logging

logger = logging.getLogger("shabd.seed.units")

# (id, rank, layer, title_en, title_hi, blurb)
SEED_UNITS: list[tuple[str, int, int, str, str, str]] = [
    ("u1",  1, 0, "Sounds",      "वर्णाः",
     "The alphabet is a 5×5 grid, not a list."),
    ("u2",  2, 1, "First Words", "प्रथमशब्दाः",
     "One ending does the work English gives to word order."),
    ("u3",  3, 1, "More Cases",  "अन्यविभक्तयः",
     "Six more endings, six more questions answered."),
    ("u4",  4, 1, "Numbers",     "वचनानि",
     "Sanskrit counts one, two, many — not one and many."),
    ("u5",  5, 1, "Persons",     "पुरुषाः",
     "Three persons × three numbers: a nine-cell grid."),
    ("u6",  6, 1, "Sandhi",      "सन्धिः",
     "Where sounds meet, a function decides what happens."),
    ("u7",  7, 1, "Genders",     "लिङ्गानि",
     "Stem type predicts the whole paradigm."),
    ("u8",  8, 1, "More Tenses", "लकाराः",
     "Ten lakāras; the first four carry most speech."),
    ("u9",  9, 1, "Voices",      "पदे",
     "Who the action returns to decides the ending set."),
    ("u10", 10, 2, "Compounds",  "समासाः",
     "Words compose: A+B, B-of-A, one-who-has-A-B."),
    ("u11", 11, 2, "Kāraka",     "कारकाणि",
     "The six roles that explain why a vibhakti is there."),
]

UNIT_IDS = [u[0] for u in SEED_UNITS]


def seed_units(db) -> dict[str, int]:
    """Idempotent unit seed. Inserts missing units and retunes the titles and
    blurbs of ones already present — the spine's ORDER is structural and
    stable, but its wording is copy and changes without a release."""
    from app.models import Unit

    added = 0
    updated = 0
    for (uid, rank, layer, title_en, title_hi, blurb) in SEED_UNITS:
        row = db.query(Unit).filter(Unit.id == uid).first()
        if row is None:
            db.add(Unit(id=uid, rank=rank, layer=layer, title_en=title_en,
                        title_hi=title_hi, blurb=blurb))
            added += 1
            continue
        if (row.rank, row.layer, row.title_en, row.title_hi, row.blurb) != (
                rank, layer, title_en, title_hi, blurb):
            row.rank, row.layer = rank, layer
            row.title_en, row.title_hi, row.blurb = title_en, title_hi, blurb
            updated += 1
    db.flush()
    logger.info("Units: %d added, %d retuned", added, updated)
    return {"added": added, "updated": updated}
