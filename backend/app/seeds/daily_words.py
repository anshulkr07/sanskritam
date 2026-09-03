"""Curated daily words for the varṇamālā guessing game (P12-1).

Words are curated from the common-noun layer of the learner's known vocabulary
— never generated at request time. Each entry carries a writer date it is
active on, the Devanagari answer, an IAST gloss, and a difficulty band so the
same learner-local date always resolves to the same puzzle (HANDOVER §2.8).

These are deliberately short, well-known words whose characters live in the
sparśa grid (so varna-distance scoring is meaningful) or the common vowel set.
"""

from datetime import date, timedelta

# (devanagari, iast, clue/bridge gloss, difficulty)
_CURATED: list[tuple[str, str, str, str]] = [
    ("कमल", "kamala", "lotus", "easy"),
    ("गज", "gaja", "elephant", "easy"),
    ("जल", "jala", "water", "easy"),
    ("पुस्तक", "pustaka", "book", "easy"),
    ("नगर", "nagara", "town", "easy"),
    ("बालक", "bālaka", "boy", "easy"),
    ("बालिका", "bālikā", "girl", "easy"),
    ("मित्र", "mitra", "friend", "easy"),
    ("गुरु", "guru", "teacher", "easy"),
    ("विद्या", "vidyā", "knowledge", "medium"),
    ("सूर्य", "sūrya", "sun", "medium"),
    ("चन्द्र", "candra", "moon", "medium"),
    ("तारा", "tārā", "star", "medium"),
    ("पर्वत", "parvata", "mountain", "medium"),
    ("वृक्ष", "vṛkṣa", "tree", "medium"),
    ("ग्राम", "grāma", "village", "medium"),
    ("समुद्र", "samudra", "ocean", "hard"),
    ("आकाश", "ākāśa", "sky", "medium"),
    ("वायु", "vāyu", "wind", "medium"),
    ("अग्नि", "agni", "fire", "medium"),
    ("भारत", "bhārata", "India", "easy"),
    ("संस्कृत", "saṃskṛta", "Sanskrit", "hard"),
    ("माता", "mātā", "mother", "easy"),
    ("पिता", "pitā", "father", "easy"),
    ("भ्राता", "bhrātā", "brother", "hard"),
    ("सखा", "sakhā", "friend", "medium"),
    ("राजा", "rājā", "king", "easy"),
    ("देव", "deva", "god", "easy"),
    ("पुष्प", "puṣpa", "flower", "medium"),
    ("फल", "phala", "fruit", "easy"),
]

ANCHOR = date(2026, 9, 2)


def seed_daily_words(db) -> None:
    """Idempotently seed a daily word for a rolling window of dates.

    The window starts at ANCHOR and extends ANCHOR + len(_CURATED) - 1, so the
    puzzle for any learner-local date >= ANCHOR that falls inside the window is
    a curated row. Beyond the window the service still resolves deterministically
    (P12-1) by cycling the curated list; the seed just makes the first month
    of dates concrete database rows.
    """
    from app.models import DailyWord

    existing = db.query(DailyWord).count()
    if existing > 0:
        return

    for i, (dev, iast, clue, diff) in enumerate(_CURATED):
        d = ANCHOR + timedelta(days=i)
        db.add(
            DailyWord(
                date=d.isoformat(),
                answer=dev,
                answer_iast=iast,
                clue=clue,
                difficulty=diff,
            )
        )
