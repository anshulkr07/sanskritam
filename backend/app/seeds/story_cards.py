"""The Sanskrit story deck — Discover Sanskrit (backend-driven, read-only).

~40 swipeable cards in 7 chapters, from "what is Sanskrit?" to
sandhi/samāsa/kāraka. All prose here is ORIGINAL (written for Sanskritam,
``attribution="original"``) — adapted in spirit from the learnsanskrit.org
pedagogy but never copied, so no third-party licence applies. If a card is
ever adapted from learnsanskrit verbatim, its ``attribution`` must move to
the ``learnsanskrit`` registry key (P23-4a rule).

Rules carried over from the lesson seeds:
- IAST is derived from lipi at seed time, never hand-typed (P7-13).
- ``deep_link`` is a client route name from STORY_DEEP_LINKS or "none".
- One idea per card, body ≤120 words. Reading a card writes nothing.
"""

from __future__ import annotations

import logging

logger = logging.getLogger("shabd.seed.story")

# Client route names a card may dive into. Tabs and stack screens only —
# never a URL, never a lesson uuid (lesson ids are seed-generated; use
# "Path" for lesson CTAs). The test pins this set against the router.
STORY_DEEP_LINKS = frozenset({
    "none",
    "Conversation", "DailyWord", "Grammar", "Lesson", "Paradigm", "Path",
    "Pingala", "Play", "Read", "Shloka", "Varnamala", "Vocab", "WordOrder",
    "Writing",
})

# (id, rank, title_en, title_hi, blurb)
CHAPTERS: list[tuple[str, int, str, str, str]] = [
    ("s0", 0, "What is Sanskrit?", "संस्कृतं किम्?",
     "A language you already half-know — and where it lives today."),
    ("s1", 1, "How old is it?", "कियत् पुरातनम्?",
     "Three thousand years, from memory to manuscript to phone."),
    ("s2", 2, "Sounds & script", "वर्णाः लिपिश्च",
     "An alphabet arranged like a map of your own mouth."),
    ("s3", 3, "First words", "प्रथमशब्दाः",
     "Roots, endings, and your first Sanskrit sentence."),
    ("s4", 4, "The grammar machine", "व्याकरणयन्त्रम्",
     "Sandhi, 24 noun forms, 180 verb forms — as functions."),
    ("s5", 5, "Building sentences", "वाक्यरचना",
     "Free word order, six roles, words inside words."),
    ("s6", 6, "Beauty & what's next", "सौन्दर्यम् अग्रे च",
     "Metre, binary counting, and where you go from here."),
]

# (id, chapter, rank, title_en, title_hi, body,
#  example_dev, example_gloss, deep_link, deep_link_label)
CARDS: list[tuple] = [
    # ── s0 · What is Sanskrit? ──────────────────────────────────────
    ("s0c1", "s0", 0, "A language you already half-know", "परिचितं नाम",
     "Hindi, Marathi and Bengali share an Indo-Aryan heritage with Sanskrit. "
     "English mother and Sanskrit माता are distant cousins from an older "
     "language, not a borrowing from Sanskrit. Other Indian languages, "
     "including Tamil and Kannada, have borrowed much Sanskrit vocabulary "
     "while belonging to a different language family. Learning Sanskrit "
     "helps you notice both kinds of connection.",
     "माता", "mother", "none", ""),
    ("s0c2", "s0", 1, "Who speaks it today?", "के वदन्ति?",
     "Sanskrit never died. It is spoken in villages like Mattur, taught in "
     "thousands of schools, broadcast in radio news, and chatted in by "
     "lakhs of learners. People order tea, argue cricket, and flirt — in "
     "Sanskrit. This app teaches that living, spoken Sanskrit first.",
     "नमस्ते", "hello — I bow to you", "Conversation", "Hear it spoken"),
    ("s0c3", "s0", 2, "Three registers", "त्रयः प्रकाराः",
     "Sanskrit comes in three registers. Vedic is the ancient mantra style "
     "of the Vedas. Classical is the polished language of the epics and "
     "Kālidāsa. Spoken Sanskrit is today's living conversation. They share "
     "much grammar, but Vedic also has forms and accent patterns that "
     "Classical Sanskrit does not use. Start with the spoken register "
     "and explore the classics as you grow.",
     "", "", "Read", "Browse the reader"),
    ("s0c4", "s0", 3, "Why learn it?", "किमर्थम्?",
     "For the mantras you chant without knowing the words. For the Gītā, "
     "the stories, and two thousand years of science and philosophy in the "
     "original. And for a strange side-effect learners report: because "
     "Sanskrit is so precise, it sharpens every other language you speak.",
     "", "", "none", ""),
    ("s0c5", "s0", 4, "How this story works", "कथाक्रमः",
     "Swipe through about 40 cards, from zero to real grammar: how old "
     "Sanskrit is, how its sounds fit your mouth, how words are built, and "
     "how sentences click together. Cards with a button dive straight into "
     "the app — the mouth-map, the paradigm grid, a lesson. Finish here and "
     "the learning Path takes over.",
     "", "", "Path", "Peek at the Path"),
    ("s0c6", "s0", 5, "Your first sentence", "प्रथमं वाक्यम्",
     "Here is a whole Sanskrit sentence, and you can already read its shape: "
     "अहं छात्रः — aham chātraḥ — I am a student. Two words. अहम् means I, "
     "छात्रः means student. No verb needed for I am — Sanskrit often drops "
     "it. Say it out loud. You have started.",
     "अहं छात्रः", "I am a student", "none", ""),
    # ── s1 · How old is it? ─────────────────────────────────────────
    ("s1c1", "s1", 0, "Older than Rome", "रोमात् पुरातनम्",
     "The oldest Sanskrit hymns, the Vedas, were composed around 1500 BCE — "
     "before Rome existed, before the pyramids were a thousand years old. "
     "For centuries they were never written down at all. They were "
     "memorised, syllable-perfect, and passed mouth to ear for a hundred "
     "generations.",
     "अग्निमीळे", "I praise Agni (Ṛgveda 1.1.1)", "Read", "See old verses"),
    ("s1c2", "s1", 1, "Memorised, not written", "कण्ठस्थम्",
     "Vedic students preserved texts with error-checking recitation patterns "
     "— forward, backward, criss-cross — so a single slipped syllable would "
     "stand out. Modern recordings of this chanting match manuscripts "
     "written two thousand years later. It may be history's most reliable "
     "data transfer.",
     "", "", "none", ""),
    ("s1c3", "s1", 2, "Pāṇini, the programmer", "पाणिनिः",
     "Around 400 BCE, the scholar Pāṇini wrote the Aṣṭādhyāyī: nearly 4,000 "
     "tiny rules that generate correct Sanskrit the way code generates "
     "output. Feed in a root and a tense; out comes the word. This app's "
     "grammar engine is built on his system — when it derives a form for "
     "you, you are watching Pāṇini run.",
     "", "", "Grammar", "Open the grammar reference"),
    ("s1c4", "s1", 3, "Epics and poets", "इतिहासकाव्ये",
     "Then came the stories: the Rāmāyaṇa and Mahābhārata, the plays of "
     "Kālidāsa, hundreds of works on medicine, astronomy, music and logic. "
     "Classical Sanskrit became the shared language of ideas across Asia — "
     "carried to China, Tibet and Java along with Buddhism.",
     "", "", "Read", "Browse the reader"),
    ("s1c5", "s1", 4, "How it changed", "परिवर्तनम्",
     "Languages drift. Vedic Sanskrit's complex sounds simplified; everyday "
     "speech became the Prakrits, which grew into Hindi, Marathi, Bengali "
     "and more. Classical Sanskrit stayed frozen as the language of "
     "learning — like Latin in Europe — while its daughters kept changing. "
     "That is why Hindi आग and Sanskrit अग्नि both mean fire.",
     "अग्निः", "fire", "none", ""),
    ("s1c6", "s1", 5, "Sanskrit today", "अद्यतनम्",
     "Today Sanskrit is an official language of India, examined in schools, "
     "chanted in temples — and spoken, on purpose, by a growing revival "
     "movement. You are joining it. We begin with the spoken language, "
     "because a language you can chat in is a language you will keep.",
     "", "", "Conversation", "Try a conversation"),
    # ── s2 · Sounds & script ────────────────────────────────────────
    ("s2c1", "s2", 0, "Written in Devanagari", "देवनागरी",
     "Sanskrit is written left-to-right in Devanagari — the same script as "
     "Hindi and Marathi. It is phonetic: each letter is exactly one sound, "
     "always. Learn the letters once and you can read every word aloud, "
     "even before you know what it means.",
     "क", "ka — the first consonant", "Writing", "Trace the letters"),
    ("s2c2", "s2", 1, "Thirteen vowels", "त्रयोदश स्वराः",
     "Sanskrit vowels come in short-long pairs: अ/आ, इ/ई, उ/ऊ. Length "
     "changes meaning, the way ship and sheep differ in English — so the "
     "script gives long vowels their own letters. Train your ear on length "
     "early; it pays off in every verse you will ever read.",
     "अ · आ", "short a · long ā", "Varnamala", "See the mouth-map"),
    ("s2c3", "s2", 2, "The 5×5 grid", "पञ्चविंशतिः",
     "The consonants are not a list — they are a grid. Five rows by WHERE "
     "the tongue touches (throat, palate, roof, teeth, lips), five columns "
     "by HOW (plain, breathed, voiced, voiced-breathed, nasal). क ख ग घ ङ "
     "is one row: same place, five efforts. Learn the grid and you learn "
     "the whole system at once.",
     "क ख ग घ ङ", "one full row: throat sounds", "Varnamala", "See the mouth-map"),
    ("s2c4", "s2", 3, "Curl your tongue: त vs ट", "त ट भेदः",
     "English has one t. Sanskrit has two: dental त (tongue on teeth, like "
     "French) and retroflex ट (tongue curled back to the roof). Mixing them "
     "makes real words collide — पतः means he falls, पटः means a cloth. "
     "Your tongue tip is the instrument; the grid tells it where to go.",
     "पतः · पटः", "he falls · a cloth", "Varnamala", "Hear the contrast"),
    ("s2c5", "s2", 4, "Three s-sounds", "त्रयः सकाराः",
     "Sanskrit keeps three hisses English merges into one: dental स, palatal "
     "श, retroflex ष. Most learners hear one and must train up to three. "
     "Drill them inside words rather than alone — the ear catches contrasts "
     "faster with context around them.",
     "स · श · ष", "sa · śa · ṣa", "Varnamala", "Hear the contrast"),
    ("s2c6", "s2", 5, "Breathe: क vs ख", "महाप्राणाः",
     "Every Sanskrit stop comes in plain and breathed pairs: क/ख, ग/घ, "
     "च/छ. Hold a palm before your lips — ख should puff air, क should not. "
     "In English this puff is automatic; in Sanskrit it changes the word, "
     "so it must become deliberate.",
     "क · ख", "ka · kha (with a puff)", "Varnamala", "Practise the pairs"),
    # ── s3 · First words ────────────────────────────────────────────
    ("s3c1", "s3", 0, "Roots: the seeds", "धातवः",
     "Every Sanskrit verb grows from a root — a tiny seed of meaning called "
     "a dhātu. √gam means to go; √paṭh means to read; √likh means to write. "
     "About two thousand roots generate nearly every action word you will "
     "meet. Learn a root and you own its whole family.",
     "गम्", "√gam — to go", "none", ""),
    ("s3c2", "s3", 1, "Endings do the work of word order", "विभक्तिः",
     "English needs word order to say who did what. Sanskrit puts the job "
     "in the ending: ग्रामं means to-the-village no matter where it sits in "
     "the sentence. Move the words around and the meaning does not move. "
     "These endings are called vibhakti — eight cases, and they run the "
     "whole language.",
     "ग्रामं गच्छामि", "I go to the village", "Path", "Learn this in Unit 2"),
    ("s3c3", "s3", 2, "One, two, many", "एकं द्वे बहूनि",
     "Sanskrit counts three numbers, not two. Singular for one, plural for "
     "many — and dual, a special form used only for exactly two. Eyes, "
     "hands, parents, two friends: all dual. English and Hindi lost theirs "
     "long ago, so the dual feels exotic at first and natural within a week.",
     "नेत्रे", "two eyes (dual)", "Path", "Learn this in Unit 4"),
    ("s3c4", "s3", 3, "He, she, it grammars", "लिङ्गानि",
     "Every noun has a gender — masculine, feminine or neuter — and the "
     "gender picks which set of endings the word takes. The good news: the "
     "stem usually predicts the pattern, so you learn families, not words. "
     "Boy, girl, fruit: three genders in one breath.",
     "बालः · बाला · फलम्", "boy · girl · fruit", "Paradigm", "See the full grid"),
    ("s3c5", "s3", 4, "Your first words", "शब्दसंग्रहः",
     "Start with words you can use today: water, food, house, friend, book. "
     "Sanskrit words are generous — each one unlocks cousins across Indian "
     "languages. The app teaches the most-used words first, grouped by "
     "topic, always with example sentences.",
     "जलम्", "water", "Vocab", "Learn words by topic"),
    ("s3c6", "s3", 5, "Say it: I drink water", "पिबामि",
     "Verbs carry their subject inside them: पिबामि means I-drink, no extra "
     "word for I needed. So अहं जलं पिबामि — I water drink — is your first "
     "full action sentence. Three words, and you have used a case ending "
     "and a verb ending without breaking a sweat.",
     "अहं जलं पिबामि", "I drink water", "Conversation", "Say it out loud"),
    # ── s4 · The grammar machine ────────────────────────────────────
    ("s4c1", "s4", 0, "Grammar is a machine", "सूत्रयन्त्रम्",
     "Here is the liberating secret: Sanskrit grammar is not a pile of "
     "exceptions. It is a small set of rules applied in order — input plus "
     "rule equals output. Pāṇini wrote it like an algorithm 2,400 years "
     "before computers. Every grid and derivation in this app is that "
     "machine made visible.",
     "", "", "Grammar", "Open the grammar reference"),
    ("s4c2", "s4", 1, "Sandhi: sounds shake hands", "सन्धिः",
     "When two sounds meet at a word boundary, they blend: विद्या + आलयः "
     "becomes विद्यालयः (school). This blending is called sandhi, and it is "
     "a function — same inputs, same output, every time. Written Sanskrit "
     "shows the blended result, so reading means learning to un-blend.",
     "विद्यालयः", "school (vidyā + ālayaḥ)", "Play", "Play with sandhi"),
    ("s4c3", "s4", 2, "Four sandhi families", "चतस्रः सन्धयः",
     "Sandhi comes in four families: vowel meets vowel, the -ḥ ending "
     "(visarga) before a new word, the -ṃ nasal (anusvāra), and consonant "
     "meetings. Each family has a handful of rules, and the engine splits "
     "and joins all of them — run any pair forwards and backwards.",
     "रामः + उवाच", "Rāmaḥ + uvāca → Rāma uvāca", "Play", "Play with sandhi"),
    ("s4c4", "s4", 3, "One noun, 24 forms", "चतुर्विंशतिः",
     "Take a stem like बाल (boy). Eight cases times three numbers gives a "
     "grid of 24 cells — and the whole grid is predictable from the stem "
     "type. Fill it once and you can decline thousands of nouns. The app's "
     "paradigm grid lets you prove every cell, not memorise it.",
     "बालः · बालम् · बालेन", "boy: nom · acc · instr", "Paradigm", "See the full grid"),
    ("s4c5", "s4", 4, "One root, up to 180 forms", "धातुरूपाणि",
     "Verbs are five dials: root, tense, person, number, voice. Turn them "
     "and the form re-derives — गच्छामि (I go), गच्छसि (you go), गच्छति "
     "(he goes): one root, three persons, same pattern. Ten tenses exist; "
     "the first four carry most daily speech.",
     "गच्छामि · गच्छसि · गच्छति", "I / you / he goes", "Paradigm", "Turn the dials"),
    ("s4c6", "s4", 5, "Doing it for yourself", "आत्मनेपदम्",
     "Sanskrit verbs come in two voices: parasmaipada — the action goes to "
     "another — and ātmanepada — the fruit of the action returns to the "
     "doer. Reading for yourself leans one way; teaching another leans the "
     "other. The ending tells you who benefits.",
     "पठति · सेवते", "he reads (para) · he serves (ātm)", "Path", "Learn this in Unit 9"),
    ("s4c7", "s4", 6, "Tenses are time machines", "लकाराः",
     "Sanskrit has ten lakāras — verb systems for present, pasts, futures, "
     "commands, wishes and prayers. You need four to hold a conversation; "
     "the rest colour stories and blessings. The future is the friendliest: "
     "spot -ṣya- inside and you are looking ahead.",
     "गमिष्यामि", "I will go", "Path", "Learn this in Unit 8"),
    # ── s5 · Building sentences ─────────────────────────────────────
    ("s5c1", "s5", 0, "Free word order", "मुक्तक्रमः",
     "Because endings carry the roles, Sanskrit word order is free: ग्रामं "
     "गच्छामि and गच्छामि ग्रामम् mean exactly the same thing. Order is "
     "used for emphasis, rhythm and style — never for basic meaning. Try "
     "breaking a sentence by shuffling it; if the endings survive, so does "
     "the sense.",
     "ग्रामं गच्छामि", "I go to the village", "WordOrder", "Shuffle a sentence"),
    ("s5c2", "s5", 1, "Why that ending? Kāraka", "कारकम्",
     "Behind the eight cases sit six kārakas — the roles words play: who "
     "acts, what is affected, with what, for whom, from where, where. The "
     "kāraka is the WHY behind every ending. Learn the six roles and cases "
     "stop being memorisation and start being logic.",
     "रामः वनं गच्छति", "Rāma goes to the forest", "Path", "Learn this in Unit 11"),
    ("s5c3", "s5", 2, "Words that swallow words", "समासः",
     "Sanskrit loves compounds: whole phrases fused into one long word. "
     "राजपुत्रः is rāja + putraḥ — king's-son, prince. Classical texts are "
     "dense with them, and the reader in this app splits them back apart "
     "so you can see the seams.",
     "राजपुत्रः", "prince (king's son)", "Read", "Meet compounds in the wild"),
    ("s5c4", "s5", 3, "Four compound families", "चत्वारः समासाः",
     "Compounds come in four great families: dvandva lists things (Sītā and "
     "Rāma), tatpuruṣa nests one thing inside another (king's son), "
     "bahuvrīhi describes someone (lotus-eyed), avyayībhāva freezes into an "
     "adverb. One of them — Sītā-and-Rāma as a pair — even takes the dual.",
     "सीतारामौ", "Sītā and Rāma (pair)", "Read", "Meet compounds in the wild"),
    ("s5c5", "s5", 4, "Build your own sentence", "वाक्यं रचय",
     "You now own the pieces: pick a doer, pick an action, aim it at an "
     "object — अहं जलं पिबामि. Change one ending and the meaning pivots; "
     "shuffle the order and it holds. The conversation hall is where "
     "sentences become speech.",
     "अहं जलं पिबामि", "I drink water", "Conversation", "Say it out loud"),
    # ── s6 · Beauty & what's next ───────────────────────────────────
    ("s6c1", "s6", 0, "Poetry with a pulse", "छन्दः",
     "Sanskrit verse runs on metre — chandas: strict patterns of light and "
     "heavy syllables, like a heartbeat under the words. The Gītā's verses "
     "march in anuṣṭubh, eight syllables a quarter. Once you feel the beat, "
     "verses memorise themselves.",
     "धर्मक्षेत्रे कुरुक्षेत्रे", "On the field of dharma (Gītā 1.1)", "Shloka", "Read today's verse"),
    ("s6c2", "s6", 1, "Piṅgala counted in binary", "पिङ्गलः",
     "Two thousand years before computers, the scholar Piṅgala enumerated "
     "metres with light and heavy syllables — a binary system. Listing all "
     "patterns of length n gives 2ⁿ rows, and his mountain of numbers "
     "(mātrāmeru) hides the Fibonacci sequence. Play with it: you will do "
     "binary arithmetic without noticing.",
     "", "", "Pingala", "Count like Piṅgala"),
    ("s6c3", "s6", 2, "One verse a day", "दिनश्लोकः",
     "Fluency is built from rituals, not marathons. The app serves one "
     "verse daily — text, meaning, word-by-word breakdown — and a daily "
     "word puzzle scored on the mouth-map. Small, daily, spoken aloud: "
     "that is the whole method.",
     "", "", "Shloka", "Read today's verse"),
    ("s6c4", "s6", 3, "Your path starts at the mouth", "अग्रे पन्थाः",
     "You have the whole map now: sounds, words, the grammar machine, "
     "sentences, verse. The Path turns it into skill — eleven units from "
     "the mouth-map to the sentence, each step graded as you go. Start at "
     "Unit 1. Your tongue already knows the way.",
     "", "", "Path", "Start Unit 1"),
]


def seed_story(db) -> dict[str, int]:
    """Idempotent story-deck seed. Inserts missing chapters/cards and retunes
    copy on every boot (wording is copy; ids/ranks are structure). IAST is
    derived from lipi, never hand-typed."""
    from app.models import StoryCard, StoryChapter
    from app.services import iast

    added_ch = updated_ch = added_c = updated_c = 0
    for cid, rank, title_en, title_hi, blurb in CHAPTERS:
        row = db.query(StoryChapter).filter(StoryChapter.id == cid).first()
        if row is None:
            db.add(StoryChapter(id=cid, rank=rank, title_en=title_en,
                                title_hi=title_hi, blurb=blurb))
            added_ch += 1
        elif (row.rank, row.title_en, row.title_hi, row.blurb) != (
                rank, title_en, title_hi, blurb):
            row.rank, row.title_en, row.title_hi, row.blurb = (
                rank, title_en, title_hi, blurb)
            updated_ch += 1
    db.flush()

    for (cid, ch, rank, ten, thi, body,
         ex_dev, ex_gloss, link, link_label) in CARDS:
        try:
            ex_iast = iast.to_iast(ex_dev) if ex_dev else ""
        except Exception:  # noqa: BLE001 — display-only; never block the seed
            ex_iast = ""
        row = db.query(StoryCard).filter(StoryCard.id == cid).first()
        if row is None:
            db.add(StoryCard(
                id=cid, chapter_id=ch, rank=rank,
                title_en=ten, title_hi=thi, body=body,
                example_dev=ex_dev, example_iast=ex_iast,
                example_gloss=ex_gloss, deep_link=link,
                deep_link_label=link_label, attribution="original"))
            added_c += 1
        elif (row.chapter_id, row.rank, row.title_en, row.title_hi,
              row.body, row.example_dev, row.example_iast,
              row.example_gloss, row.deep_link, row.deep_link_label) != (
                ch, rank, ten, thi, body, ex_dev, ex_iast,
                ex_gloss, link, link_label):
            row.chapter_id, row.rank = ch, rank
            row.title_en, row.title_hi, row.body = ten, thi, body
            row.example_dev, row.example_iast = ex_dev, ex_iast
            row.example_gloss = ex_gloss
            row.deep_link, row.deep_link_label = link, link_label
            row.attribution = "original"
            updated_c += 1
    db.flush()
    logger.info("Story: %d+%d chapters, %d+%d cards",
                added_ch, updated_ch, added_c, updated_c)
    return {"chapters_added": added_ch, "chapters_updated": updated_ch,
            "cards_added": added_c, "cards_updated": updated_c}
