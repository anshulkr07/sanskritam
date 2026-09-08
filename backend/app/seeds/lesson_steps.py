"""P23 · Lesson steps seed — the teaching inside each lesson.

A lesson used to be a body of prose with a Practice button: nothing between
opening it and leaving it was answered, so nothing in it could be graded.
The step is the fix. ``kind`` selects the client renderer and the server
grader; ``payload`` feeds the renderer; ``grading`` is the contract an
answer is checked against.

Kinds fall in two families:

- **authored** — ``explain`` (prose, ≤120 words). ``payload`` holds the
  text; ``grading`` is empty, because there is nothing to answer.
- **generated** — ``grid_fill``, ``derive_next``, ``sandhi_split``,
  ``sandhi_join``, ``scan_metre``, ``reorder``, ``contrast``. ``payload``
  carries generator arguments under ``gen``; the exercise itself is produced
  at serve time by ``services/exercise_gen.py``. Generated steps need no
  review queue: the engine that poses the question is the engine that marks
  it, so a wrong item cannot be authored into existence.

Idempotent by (lesson_id, rank): the seed looks lessons up by feature_id,
so re-runs add nothing and retune nothing taught.
"""

from __future__ import annotations

import logging

logger = logging.getLogger("shabd.seed.lesson_steps")

EXPLAIN_CAP_WORDS = 120


def _explain(text: str) -> str:
    """First paragraph, capped at 120 words — today's bodies are ~600, and
    the body survives as the lesson's summary while the step does the
    teaching (U15-1)."""
    first = (text or "").split("\n\n")[0].strip()
    words = first.split()
    if len(words) > EXPLAIN_CAP_WORDS:
        words = words[:EXPLAIN_CAP_WORDS]
    return " ".join(words)


# feature_id -> generated steps after the opening explain.
# (kind, params, grading-features)
GENERATED: dict[str, list[tuple[str, dict, list[str]]]] = {
    "SG": [
        ("grid_fill", {"pratipadika": "बालक", "linga": "Pum", "blanks": 2}, ["SG"]),
        ("contrast", {"pratipadika": "बालक", "linga": "Pum"}, ["SG"]),
        ("scan_metre", {"text": "धर्मक्षेत्रे कुरुक्षेत्रे समवेता युयुत्सवः"}, ["SG"]),
    ],
    "NOM.SG": [
        ("grid_fill", {"pratipadika": "बालक", "linga": "Pum", "blanks": 2}, ["NOM.SG"]),
        ("contrast", {"pratipadika": "बालक", "linga": "Pum"}, ["NOM.SG"]),
    ],
    "ACC.SG": [
        ("grid_fill", {"pratipadika": "बालक", "linga": "Pum", "blanks": 2}, ["ACC.SG"]),
        ("contrast", {"pratipadika": "बालक", "linga": "Pum"}, ["ACC.SG"]),
    ],
    "PRES.3SG": [
        ("derive_next", {"dhatu": "पठ्", "lakara": "Lat",
                         "purusha": "Prathama", "vacana": "Eka"}, ["PRES.3SG"]),
        ("reorder", {"sentence": "बालकः ग्रामं गच्छति"}, ["NOM.SG", "ACC.SG"]),
    ],
    "INSTR.SG": [
        ("grid_fill", {"pratipadika": "बालक", "linga": "Pum", "blanks": 2}, ["INSTR.SG"]),
        ("contrast", {"pratipadika": "बालक", "linga": "Pum"}, ["INSTR.SG"]),
    ],
    "DAT.SG": [
        ("grid_fill", {"pratipadika": "बालक", "linga": "Pum", "blanks": 2}, ["DAT.SG"]),
        ("contrast", {"pratipadika": "बालक", "linga": "Pum"}, ["DAT.SG"]),
    ],
    "ABL.SG": [
        ("grid_fill", {"pratipadika": "बालक", "linga": "Pum", "blanks": 2}, ["ABL.SG"]),
        ("contrast", {"pratipadika": "बालक", "linga": "Pum"}, ["ABL.SG"]),
    ],
    "GEN.SG": [
        ("grid_fill", {"pratipadika": "बालक", "linga": "Pum", "blanks": 2}, ["GEN.SG"]),
        ("contrast", {"pratipadika": "बालक", "linga": "Pum"}, ["GEN.SG"]),
    ],
    "LOC.SG": [
        ("grid_fill", {"pratipadika": "बालक", "linga": "Pum", "blanks": 2}, ["LOC.SG"]),
        ("contrast", {"pratipadika": "बालक", "linga": "Pum"}, ["LOC.SG"]),
    ],
    "VOC.SG": [
        ("grid_fill", {"pratipadika": "बालक", "linga": "Pum", "blanks": 2}, ["VOC.SG"]),
        ("contrast", {"pratipadika": "बालक", "linga": "Pum"}, ["VOC.SG"]),
    ],
    # The one lesson the old model could not express: sandhi as f(a,b)→c,
    # run forwards and backwards with the same engine call grading both.
    "VOWEL-SANDHI": [
        ("sandhi_split", {"joined": "तथेति"}, ["VOWEL-SANDHI"]),
        ("sandhi_join", {"first": "तथा", "second": "इति"}, ["VOWEL-SANDHI"]),
        ("reorder", {"sentence": "रामः फलम् खादति"}, ["NOM.SG", "ACC.SG"]),
    ],
    # ── U8 More Tenses (2026-09-08 curation). Verb drills are derive_next:    # the derivation proves itself, so no reviewer is needed — but every
    # (dhatu, lakara) pair below was measured derive-exact first
    # (derive_u8.txt). Roots outside the measured-safe set (gam, vad, as,
    # jñā, dhāv, sthā, nī, sev, labh, han, dṛś, kṛ) must NOT be added here
    # without re-measuring: several derive wrong forms or nothing at all.
    "IMP.2PL": [
        ("derive_next", {"dhatu": "पठ्", "lakara": "Lot",
                         "purusha": "Madhyama", "vacana": "Bahu"}, ["IMP.2PL"]),
        ("derive_next", {"dhatu": "लिख्", "lakara": "Lot",
                         "purusha": "Madhyama", "vacana": "Bahu"}, ["IMP.2PL"]),
    ],
    "IMPF.3SG": [
        ("derive_next", {"dhatu": "पठ्", "lakara": "Lan",
                         "purusha": "Prathama", "vacana": "Eka"}, ["IMPF.3SG"]),
        ("derive_next", {"dhatu": "भू", "lakara": "Lan",
                         "purusha": "Prathama", "vacana": "Eka"}, ["IMPF.3SG"]),
    ],
    "FUT.1SG": [
        ("derive_next", {"dhatu": "पठ्", "lakara": "Lrt",
                         "purusha": "Prathama", "vacana": "Eka"}, ["FUT.3SG"]),
        ("derive_next", {"dhatu": "भू", "lakara": "Lrt",
                         "purusha": "Uttama", "vacana": "Eka"}, ["FUT.1SG"]),
    ],
    # ── U4 Numbers (2026-09-08 curation). Number drills are the paradigm
    # grid itself: grid_fill blanks land anywhere in the 8×3 (seed-fixed,
    # round-trip verified), contrast pairs sg/du/pl off the tensor. Blanks
    # are NOT targeted at dual cells — targeting would need generator
    # changes; the grid as a whole teaches numbers. Same verb-safety rule
    # as U8: paṭh/bhū only (gam/vad/as unmeasurable or wrong).
    "DU": [
        ("grid_fill", {"pratipadika": "बालक", "linga": "Pum", "blanks": 2},
         ["DU"]),
        ("contrast", {"pratipadika": "बालक", "linga": "Pum"}, ["DU"]),
    ],
    "NOM.PL": [
        ("grid_fill", {"pratipadika": "बालक", "linga": "Pum", "blanks": 2},
         ["NOM.PL"]),
        ("contrast", {"pratipadika": "बालक", "linga": "Pum"}, ["NOM.PL"]),
    ],
    "GEN.PL": [
        ("grid_fill", {"pratipadika": "बालक", "linga": "Pum", "blanks": 2},
         ["GEN.PL"]),
        ("contrast", {"pratipadika": "बालक", "linga": "Pum"}, ["GEN.PL"]),
    ],
    # ── U7 Genders (2026-09-08 curation). Neuter drills run on the
    # Napumsaka paradigm (measured exact); masculine reuses the Pum grid
    # with 3 blanks so the item differs from U2's blanks-2 drills. NO
    # Stri drills: feminine ā-stems misderive (कन्या→कन्याः) and must not
    # be posed until the engine is fixed — FEM stays unclaimed.
    "NEUT": [
        ("grid_fill", {"pratipadika": "फल", "linga": "Napumsaka", "blanks": 2},
         ["NEUT"]),
        ("contrast", {"pratipadika": "फल", "linga": "Napumsaka"}, ["NEUT"]),
    ],
    "MASC": [
        ("grid_fill", {"pratipadika": "बालक", "linga": "Pum", "blanks": 3},
         ["MASC"]),
        ("contrast", {"pratipadika": "बालक", "linga": "Pum"}, ["MASC"]),
    ],
    # ── U5 Persons (2026-09-08 curation). All 18 cells measured exact on
    # paṭh/bhū (derive_u579.txt); 1st/2nd persons here, 3rd in U2/U4.
    "PRES.1SG": [
        ("derive_next", {"dhatu": "पठ्", "lakara": "Lat",
                         "purusha": "Uttama", "vacana": "Eka"}, ["PRES.1SG"]),
        ("derive_next", {"dhatu": "पठ्", "lakara": "Lat",
                         "purusha": "Madhyama", "vacana": "Eka"}, ["PRES.2SG"]),
    ],
    "PRES.1DU": [
        ("derive_next", {"dhatu": "पठ्", "lakara": "Lat",
                         "purusha": "Uttama", "vacana": "Dvi"}, ["PRES.1DU"]),
        ("derive_next", {"dhatu": "भू", "lakara": "Lat",
                         "purusha": "Madhyama", "vacana": "Dvi"}, ["PRES.2DU"]),
    ],
    # ── U9 Voices (2026-09-08 curation). Pada follows the root (no pada
    # param): dhāv always derives ātmanepada, paṭh parasmaipada. sev/labh
    # (ātmanepada-only) are unsupported: never add them unmeasured.
    "ATMANEPADA": [
        ("derive_next", {"dhatu": "धाव्", "lakara": "Lat",
                         "purusha": "Prathama", "vacana": "Eka"},
         ["ATMANEPADA"]),
        ("derive_next", {"dhatu": "पठ्", "lakara": "Lat",
                         "purusha": "Prathama", "vacana": "Eka"},
         ["PARASMAIPADA"]),
    ],
}


def seed_lesson_steps(db) -> dict[str, int]:
    """Insert the opening explain plus generated steps for every seeded
    lesson. Skips ranks that already exist; returns {"steps": N added}."""
    from app.models import Lesson, LessonStep

    added = 0
    for lesson in db.query(Lesson).all():
        rank = 0
        has = {(s.lesson_id, s.rank) for s in
               db.query(LessonStep).filter(LessonStep.lesson_id == lesson.id).all()}
        if (lesson.id, rank) not in has:
            db.add(LessonStep(
                lesson_id=lesson.id, rank=rank, kind="explain",
                payload={"text": _explain(lesson.body or "")},
                grading={},
            ))
            added += 1
        for i, (kind, params, features) in enumerate(
                GENERATED.get(lesson.feature_id, []), start=1):
            if (lesson.id, i) in has:
                continue
            db.add(LessonStep(
                lesson_id=lesson.id, rank=i, kind=kind,
                # The seed is the item's identity: fixed per step, so a step
                # is reproducible for spaced review (P23-5) and for tests.
                payload={"gen": {"kind": kind, "params": params,
                                 "seed": 1000 + i * 17}},
                grading={"features": features},
            ))
            added += 1
    db.flush()
    logger.info("LessonSteps: %d added", added)
    return {"steps": added}
