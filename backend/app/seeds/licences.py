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
    # The URL was github.com/don-cross/astronomy-engine, which is a 404. The
    # project lives at cosinekitty/astronomy (its own package metadata, and
    # the page itself, checked 2026-10-01). The app now bundles the JavaScript
    # build of the same release for the Home tithi card (mobile/src/kala).
    ("astronomy-engine",
     "astronomy-engine (Don Cross)",
     "https://github.com/cosinekitty/astronomy",
     "MIT",
     "Hindu calendar math (sunrise, tithi, festivals) computed with astronomy-engine, MIT licence.",
     "Tithi, nakshatra, yoga, karana and festival dates for Ask answers, and today's date on Home."),
    # P24 · lesson-video sources. Embed rows play through YouTube's own
    # player (views and ads accrue to the creator); link rows are course
    # pages, playlists, or NC-licensed material that must never be embedded
    # in a commercial app. One row per channel/source, as ever.
    ("yt-nptel",
     "NPTEL Spoken Sanskrit (IIT Kharagpur)",
     "https://nptel.ac.in/courses/109105135",
     "CC BY-NC-SA (course); YouTube Standard (embed)",
     "Spoken Sanskrit lectures by Prof. Anuradha Choudry (IIT Kharagpur) via NPTEL. Course page linked; individual lectures embedded via the official YouTube player.",
     "Lesson videos for sounds, verbs and spoken Sanskrit (Units 1–2, 5)."),
    ("yt-tattvam",
     "Tattvam (Varnamala series)",
     "https://www.youtube.com/@tattvam",
     "YouTube Standard (official embed)",
     "Varnamala series by Tattvam on YouTube, embedded via the official player; all views and ads accrue to the creator.",
     "Lesson videos for sounds and pronunciation (Unit 1)."),
    ("yt-ubc",
     "UBC Sanskrit (Introductory Sanskrit)",
     "https://blogs.ubc.ca/ubcsanskrit/",
     "YouTube Standard (official embed)",
     "Introductory Sanskrit lectures by UBC Sanskrit on YouTube, embedded via the official player; all views and ads accrue to the creator.",
     "Lesson video for the vibhaktis (Unit 3)."),
    ("yt-sanskritstudio",
     "SanskritStudio",
     "https://www.youtube.com/@sanskritstudio4515",
     "YouTube Standard (official embed)",
     "Sanskrit lessons by SanskritStudio on YouTube, embedded via the official player; all views and ads accrue to the creator.",
     "Lesson video for first verbs and nominal sentences (Unit 2)."),
    ("yt-yourhindicoach",
     "Your Hindi Coach (Learn Sanskrit Through English)",
     "https://www.youtube.com/@YourHindiCoach",
     "YouTube Standard (official embed)",
     "Learn Sanskrit Through English series by Your Hindi Coach on YouTube, embedded via the official player; all views and ads accrue to the creator.",
     "Lesson video for the sixth case (Unit 3)."),
    ("yt-mamta-ojha",
     "Mamta Ojha (Sanskrit grammar, Hindi medium)",
     "https://www.youtube.com/@MamtaOjha9",
     "YouTube Standard (official embed)",
     "Sanskrit grammar lessons by Mamta Ojha on YouTube, embedded via the official player; all views and ads accrue to the creator.",
     "Hindi-medium lesson video for the future tense (Unit 8)."),
    ("yt-vibha-mam",
     "Vibha Mam Sanskrit Classes (Hindi medium)",
     "https://www.youtube.com/@VibhaMam",
     "YouTube Standard (official embed)",
     "Sanskrit grammar lessons by Vibha Mam Sanskrit Classes on YouTube, embedded via the official player; all views and ads accrue to the creator.",
     "Hindi-medium lesson video for atmanepada and voices (Unit 9)."),
    ("yt-magnet-brains",
     "Magnet Brains (school Sanskrit, Hindi medium)",
     "https://www.youtube.com/@MagnetBrainsEducation",
     "YouTube Standard (official embed)",
     "School Sanskrit grammar by Magnet Brains on YouTube, embedded via the official player; all views and ads accrue to the creator.",
     "Hindi-medium lesson videos for sandhi and samasa (Units 6, 10)."),
    ("yt-vyoma",
     "Vyoma Samskrta Pathasala",
     "https://www.youtube.com/@vyoma-samskrta-pathasala",
     "YouTube Standard (official embed)",
     "Sanskrit lessons by Vyoma Samskrta Pathasala on YouTube, embedded via the official player; all views and ads accrue to the creator. Course pages linked, never copied.",
     "Lesson video for samaasa types (Unit 10); vibhakti course link (Unit 11)."),
    ("yt-successcds",
     "SuccessCDs Education (Hindi medium)",
     "https://www.youtube.com/playlist?list=PL9vL8QnJ37pIIWno5umex4-HTNCt239wA",
     "YouTube Standard (official embed)",
     "Sandhi lessons by SuccessCDs Education on YouTube; playlist linked, not copied.",
     "Sandhi playlist link (Unit 6)."),
    ("epgp",
     "e-PG Pathshala Sanskrit (INFLIBNET / UGC)",
     "https://epgp.inflibnet.ac.in/",
     "open access (link-out)",
     "Post-graduate Sanskrit modules on e-PG Pathshala (INFLIBNET Centre, UGC); linked, not copied.",
     "Advanced grammar link for learners who outgrow the app (Unit 8+)."),
    ("yt-samskritabharati",
     "Samskrita Bharati (official channel)",
     "https://www.youtube.com/@SamskritBharati",
     "YouTube Standard (official embed)",
     "Pravesha beginner course by Samskrita Bharati on YouTube; playlist linked, not copied.",
     "Pravesha Level-1 playlist link (Unit 1)."),
    ("yt-sanskritsense",
     "Sanskrit Sense",
     "https://www.youtube.com/@SanskritSense",
     "YouTube Standard (official embed)",
     "Counting tutorials by Sanskrit Sense on YouTube, embedded via the official player; all views and ads accrue to the creator.",
     "Lesson videos for Sanskrit numbers (Unit 4)."),
    ("yt-namaste-sanskrit",
     "Namaste Sanskrit (Simplified Sanskrit)",
     "https://www.youtube.com/@namastesanskrit",
     "YouTube Standard (official embed)",
     "Simplified Sanskrit series by Namaste Sanskrit on YouTube, embedded via the official player; all views and ads accrue to the creator.",
     "Lesson video for numbers 1-10 and their variations (Unit 4)."),
    ("yt-mpes",
     "MPES Classes",
     "https://www.youtube.com/@mpesclasses",
     "YouTube Standard (official embed)",
     "Sanskrit declension lessons by MPES Classes on YouTube, embedded via the official player; all views and ads accrue to the creator.",
     "Lesson video for the masculine a-stem paradigm (Unit 7)."),
    ("yt-apna-classes",
     "APNA CLASSES (Hindi medium)",
     "https://www.youtube.com/@apnaclass11",
     "YouTube Standard (official embed)",
     "Sanskrit grammar tricks by APNA CLASSES on YouTube, embedded via the official player; all views and ads accrue to the creator.",
     "Hindi-medium lesson video for shabd roop (Unit 7)."),
    ("yt-vakratunda",
     "Vakratunda Sanskrit Classes by Sonali (Hindi medium)",
     "https://www.youtube.com/@VakratundabySonali",
     "YouTube Standard (official embed)",
     "Karaka lessons by Vakratunda Sanskrit Classes on YouTube, embedded via the official player; all views and ads accrue to the creator.",
     "Hindi-medium lesson video for karaka rules (Unit 11)."),
    # Word journey (handover_language 4.4): dictionaries of record behind each
    # card. Licence text for all six is "cited, not copied": word histories
    # are checked against the entry, no dictionary text is reproduced.
    ("mw",
     "Monier-Williams Sanskrit-English Dictionary (1899), Cologne Digital Sanskrit Dictionaries",
     "https://www.sanskrit-lexicon.uni-koeln.de/",
     "cited, not copied",
     "Word histories checked against Monier-Williams Sanskrit-English Dictionary (1899), Cologne Digital Sanskrit Dictionaries. No dictionary text is reproduced.",
     "Word journey: the Sanskrit word, its meaning and where it is cited."),
    ("ahd",
     "The American Heritage Dictionary of the English Language, Fifth Edition",
     "https://ahdictionary.com/",
     "cited, not copied",
     "Word histories checked against The American Heritage Dictionary of the English Language, Fifth Edition. No dictionary text is reproduced.",
     "Word journey: the route of each English word."),
    ("pfeifer",
     "Wolfgang Pfeifer et al., Etymologisches Wörterbuch des Deutschen (1993), in the Digitales Wörterbuch der deutschen Sprache",
     "https://www.dwds.de/",
     "cited, not copied",
     "Word histories checked against Wolfgang Pfeifer et al., Etymologisches Wörterbuch des Deutschen (1993), in the Digitales Wörterbuch der deutschen Sprache. No dictionary text is reproduced.",
     "Word journey: the route of each German word."),
    ("duden",
     "Duden online",
     "https://www.duden.de/",
     "cited, not copied",
     "Word histories checked against Duden online. No dictionary text is reproduced.",
     "Word journey: the route of each German word."),
    ("vasmer",
     "Этимологический словарь русского языка Макса Фасмера",
     "https://gufo.me/dict/vasmer",
     "cited, not copied",
     "Word histories checked against Этимологический словарь русского языка Макса Фасмера. No dictionary text is reproduced.",
     "Word journey: the route of each Russian word."),
    ("platts",
     "Platts, A dictionary of Urdu, classical Hindi, and English (1884), Digital Dictionaries of South Asia",
     "https://dsal.uchicago.edu/dictionaries/platts/",
     "cited, not copied",
     "Word histories checked against Platts, A dictionary of Urdu, classical Hindi, and English (1884), Digital Dictionaries of South Asia. No dictionary text is reproduced.",
     "Word journey: the route of each Hindi word."),
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
