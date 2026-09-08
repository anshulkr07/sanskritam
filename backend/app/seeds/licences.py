"""P23-4a · The licence registry seed — authored, not imported.

One row per source we take anything from. Gated on nothing (LESSON_OVERHAUL
§6): this file is written by hand, so it needs no importer, no download, no
review. The importer (P23-4) and the licences screen (U15-7) both read what
this writes.

Licence names are exact (``CC BY 4.0`` — not "CC-BY" or "Creative Commons").
Credit lines are rendered VERBATIM by the client; a paraphrased credit is
not a credit.
"""

from __future__ import annotations

import logging

logger = logging.getLogger("shabd.seed.licences")

# (key, name, url, licence, credit, taken)
CONTENT_SOURCES: list[tuple[str, str, str, str, str, str]] = [
    ("original",
     "Sanskritam original",
     "",
     "original",
     "Lessons, examples and glosses written for Sanskritam.",
     "The ten Units 1–3 lessons, seed challenges, dialogue and daily words."),
    ("learnsanskrit",
     "learnsanskrit.org guide",
     "https://learnsanskrit.org",
     "CC BY 4.0",
     "Lesson text adapted from the learnsanskrit.org guide, used under CC BY 4.0.",
     "Adapted (not copied) pedagogy for Units 4–11; every adapted row points here."),
    ("vidyut-data",
     "vidyut-data (ashtadhyayi.com + Ambuda)",
     "https://ashtadhyayi.com",
     "MIT",
     "Grammar engine data from vidyut-data (ashtadhyayi.com, Ambuda), MIT licence.",
     "Dhātupāṭha, sūtras, sandhi rules, metres and the kosha behind every derivation."),
    ("sa-wikisource",
     "Sanskrit Wikisource transcription",
     "https://sa.wikisource.org",
     "CC BY-SA 3.0",
     "Transcription from Sanskrit Wikisource contributors, used under CC BY-SA 3.0.",
     "The Īśopaniṣad transcription imported as the Vedic slice (P21-4)."),
    ("public-domain",
     "Public-domain Sanskrit sources",
     "",
     "public domain",
     "Ancient Sanskrit texts in the public domain.",
     "Śloka verses (Gītā, anthologised stotras) whose authorship predates copyright."),
    ("dcs",
     "Digital Corpus of Sanskrit (Heidelberg)",
     "https://www.sanskrit-linguistics.org/dcs/",
     "CC BY 3.0",
     "Sanskrit text from the Digital Corpus of Sanskrit by Oliver Hellwig, used under CC BY 3.0; English glosses induced from Mitrasaṃgraha translations (see mitrasamgraha).",
     "Frequency-ranked vocabulary headwords (Devanagari via lipi) for the P22-5 expansion."),
    ("mitrasamgraha",
     "Mitrasaṃgraha Sanskrit–English bitext (Dharmamitra)",
     "https://github.com/dharmamitra/mitrasamgraha-dataset",
     "CC BY-SA 4.0",
     "Short English glosses induced from Mitrasaṃgraha classical translations (CC BY-SA files only; NC-ND files excluded); no translation sentence ships.",
     "Gloss signal behind the DCS vocabulary expansion (P22-5 WordNet alternative)."),
]


def seed_content_sources(db) -> dict[str, int]:
    """Idempotent registry seed. Retunes wording on every boot (copy, not
    structure) and never deletes a row an importer may already point at."""
    from app.models import ContentSource

    added = 0
    updated = 0
    for key, name, url, licence, credit, taken in CONTENT_SOURCES:
        row = db.query(ContentSource).filter(ContentSource.key == key).first()
        if row is None:
            db.add(ContentSource(key=key, name=name, url=url, licence=licence,
                                 credit=credit, taken=taken))
            added += 1
            continue
        if (row.name, row.url, row.licence, row.credit, row.taken) != (
                name, url, licence, credit, taken):
            row.name, row.url, row.licence = name, url, licence
            row.credit, row.taken = credit, taken
            updated += 1
    db.flush()
    logger.info("ContentSources: %d added, %d retuned", added, updated)
    return {"added": added, "updated": updated}
