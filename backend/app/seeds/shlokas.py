"""Seed data: classical ślokas — the Gītā, the epics, Upaniṣads, Manu, the
Hitopadeśa and Pañcatantra, Bhartṛhari.

Sources (checked 2026-10-02). A reference here is one the text was read at,
in an e-text of GRETIL (gretil.sub.uni-goettingen.de) unless said otherwise,
and its numbering and wording are that e-text's, also where a saying is
better known in another wording (Manusmṛti 2.121, Mahābhārata 12.316.6,
Rāmāyaṇa 5.10.10):

- Bhagavad Gītā: ``sa_bhagavadgItA-4comm`` and ``sa_bhagavadgItA-comm``.
- Mahābhārata: the BORI critical text (``mbh_NN_u``), book.chapter.verse.
- Rāmāyaṇa: ``sa_rAmAyaNa`` (the critical text), book.chapter.verse.
- Manusmṛti: ``sa_manusmRti`` (Kullūka's text).
- Hitopadeśa: ``sa_nArAyaNa-hitopadeza``; "Prastāvikā" is its opening
  section (hit_0.N there), 1 is the Mitralābha.
- Pañcatantra: ``sa_viSNuzarman-paJcatantra`` (Jha's edition, 1991).
- Nītiśataka, Vairāgyaśataka: ``sa_bhatRhari-zatakatraya`` (Chaukhamba
  numbering).
- Īśā, Kaṭha, Taittirīya, Bṛhadāraṇyaka: the GRETIL e-text of each. Kaṭha
  1.3.N is vallī 3 of that file, which counts the six vallīs straight through.
- Mokṣopāya: ``sa_mokSopAya``.
- Muṇḍaka Upaniṣad: not on GRETIL; read in the sanskritdocuments.org e-text.

"Subhāṣita" and "Subhāṣita Ratna Bhāṇḍāgāra" mark a saying whose place in a
text was NOT found: days 7, 8, 47, 69, 79, 89 and 99. The lines are well
known; the attribution is not checked.

Anchoring (P7-6): dates are derived from a FIXED anchor date via ``day_offset``,
never ``date.today()``. The router's deterministic cycle indexes past the
seeded window from the same anchor, so the well cannot silently freeze (§2.12).

``metre`` is deliberately NOT authored here: it is derived at seed time by
``services/chandas.py`` (never hand-typed, §6). anuṣṭubh is variable and is not
a fixed entry in vidyut's 145-vṛtta table, so its metre comes back empty — and
that is correct (§6: absent is absent; never fill it with a guess).

``word_breakdown`` is authored grammar (word/gloss/features). It is the
human-vetted part; a wrong feature here misleads a learner, so it is written
by hand and reviewed — not guessed. The breakdowns of the 33 entries that
carry ``was=[(…, False)]`` were written on 2026-10-02 with the verse and have
NOT yet been read by a second person. The corpus is ordered by difficulty
(P7-6b §4): the earliest `day_offset`s are the verses a beginner can carry;
later ones grow in vocabulary and syntax. Sources are public domain.
"""

from datetime import date

# Fixed anchor, NOT date.today(). The router cycles from this same date.
SHLOKA_ANCHOR = date(2026, 9, 3)


def _v(day_offset, source_ref, devanagari, iast, breakdown, register="classical", was=()):
    """Build one SEED_SLOKAS entry.

    ``breakdown`` is a list of (word, meaning, [features]); the ``features``
    field of the verse is the union of every word's features.

    ``was`` lists what this day carried before a correction, as
    (old Devanagari, same_verse) pairs, so that a database seeded earlier is
    repaired in place (seeds/seed.py::_correct_seed_rows). ``same_verse`` is
    True when the old text was this verse misspelt and its stored meaning
    still fits, False when it was other text and the meaning must go.
    """
    return {
        "was": list(was),
        "day_offset": day_offset,
        "source_ref": source_ref,
        "devanagari": devanagari,
        "iast": iast,
        "word_breakdown": [
            {"word": w, "meaning": m, "features": f} for (w, m, f) in breakdown
        ],
        "features": sorted({f for (_, _, fs) in breakdown for f in fs}),
        "register": register,
        "audio_url": "",
    }


_todo = []  # filled below by _v() calls


# ── Beginner band (days 0–29) — short, familiar vocabulary ──────────────
_todo.append(_v(
    0, "Bhagavad Gītā 2.47",
    "कर्मण्येवाधिकारस्ते मा फलेषु कदाचन। मा कर्मफलहेतुर्भूर्मा ते सङ्गोऽस्त्वकर्मणि॥",
    "karmaṇyevādhikāraste mā phaleṣu kadācana. mā karmaphalaheturbhūrmā te saṅgo'stvakarmaṇi.",
    [("कर्मणि", "in action", ["LOC.SG"]), ("एव", "indeed", ["INDECL"]),
     ("अधिकारः", "right", ["NOM.SG"]), ("ते", "your", ["GEN.SG"]),
     ("मा", "not", ["INDECL"]), ("फलेषु", "in the fruits", ["LOC.PL"]),
     ("कदाचन", "ever", ["INDECL"]), ("अकर्मणि", "in inaction", ["LOC.SG"])],
))
_todo.append(_v(
    1, "Bhagavad Gītā 2.13",
    "देहिनोऽस्मिन्यथा देहे कौमारं यौवनं जरा। तथा देहान्तरप्राप्तिर्धीरस्तत्र न मुह्यति॥",
    "dehino'smin yathā dehe kaumāraṃ yauvanaṃ jarā. tathā dehāntaraprāptirdhīrastatra na muhyati.",
    [("देहिनः", "of the embodied", ["GEN.SG"]), ("अस्मिन्", "in this", ["LOC.SG"]),
     ("देहे", "in the body", ["LOC.SG"]), ("कौमारम्", "childhood", ["NOM.SG"]),
     ("यौवनम्", "youth", ["NOM.SG"]), ("जरा", "old age", ["NOM.SG"]),
     ("देहान्तरप्राप्तिः", "attainment of another body", ["NOM.SG"]),
     ("धीरः", "the wise", ["NOM.SG"]), ("मुह्यति", "is deluded", ["PRES.3SG"])],
))
_todo.append(_v(
    2, "Bhagavad Gītā 18.46",
    "यतः प्रवृत्तिर्भूतानां येन सर्वमिदं ततम्। स्वकर्मणा तमभ्यर्च्य सिद्धिं विन्दति मानवः॥",
    "yataḥ pravṛttirbhūtānāṃ yena sarvamidaṃ tatam. svakarmaṇā tamabhyarcya siddhiṃ vindati mānavaḥ.",
    [("यतः", "from whom", ["ABL.SG"]), ("प्रवृत्तिः", "the origin", ["NOM.SG"]),
     ("भूतानाम्", "of all beings", ["GEN.PL"]), ("सर्वम्", "all", ["NOM.SG"]),
     ("इदम्", "this", ["NOM.SG"]), ("ततम्", "is pervaded", ["NOM.SG"]),
     ("स्वकर्मणा", "by one's own duty", ["INSTR.SG"]), ("तम्", "him", ["ACC.SG"]),
     ("सिद्धिम्", "perfection", ["ACC.SG"]), ("विन्दति", "attains", ["PRES.3SG"]),
     ("मानवः", "a human", ["NOM.SG"])],
))
_todo.append(_v(
    3, "Bhagavad Gītā 2.20",
    "न जायते म्रियते वा कदाचिन्नायं भूत्वा भविता वा न भूयः। अजो नित्यः शाश्वतोऽयं पुराणो न हन्यते हन्यमाने शरीरे॥",
    "na jāyate mriyate vā kadācin nāyaṃ bhūtvā bhavitā vā na bhūyaḥ. ajo nityaḥ śāśvato'yaṃ purāṇo na hanyate hanyamāne śarīre.",
    [("न", "not", ["INDECL"]), ("जायते", "is born", ["PRES.3SG"]),
     ("म्रियते", "dies", ["PRES.3SG"]), ("अजः", "unborn", ["NOM.SG"]),
     ("नित्यः", "eternal", ["NOM.SG"]), ("शाश्वतः", "everlasting", ["NOM.SG"]),
     ("अयम्", "this", ["NOM.SG"]), ("पुराणः", "ancient", ["NOM.SG"]),
     ("हन्यते", "is slain", ["PRES.3SG"]), ("हन्यमाने", "being slain", ["LOC.SG"]),
     ("शरीरे", "in the body", ["LOC.SG"])],
))
_todo.append(_v(
    4, "Bhagavad Gītā 2.56",
    "दुःखेष्वनुद्विग्नमनाः सुखेषु विगतस्पृहः। वीतरागभयक्रोधः स्थितधीर्मुनिरुच्यते॥",
    "duḥkheṣvanudvignamanāḥ sukheṣu vigataspṛhaḥ. vītarāgabhayakrodhaḥ sthitadhīrmunirucyate.",
    [("दुःखेषु", "in sorrows", ["LOC.PL"]), ("अनुद्विग्नमनाः", "untroubled-minded", ["NOM.SG"]),
     ("सुखेषु", "in pleasures", ["LOC.PL"]), ("विगतस्पृहः", "free of longing", ["NOM.SG"]),
     ("वीतरागभयक्रोधः", "free from passion, fear, anger", ["NOM.SG"]),
     ("स्थितधीः", "steady-minded", ["NOM.SG"]), ("मुनिः", "a sage", ["NOM.SG"]),
     ("उच्यते", "is called", ["PRES.3SG"])],
))
_todo.append(_v(
    5, "Bhagavad Gītā 18.63",
    "इति ते ज्ञानमाख्यातं गुह्याद्गुह्यतरं मया। विमृश्यैतदशेषेण यथेच्छसि तथा कुरु॥",
    "iti te jñānamākhyātaṃ guhyād guhyataraṃ mayā. vimṛśyaitad aśeṣeṇa yathecchasi tathā kuru.",
    [("ज्ञानम्", "knowledge", ["NOM.SG"]), ("आख्यातम्", "imparted", ["NOM.SG"]),
     ("गुह्यात्", "than the secret", ["ABL.SG"]), ("गुह्यतरम्", "more secret", ["NOM.SG"]),
     ("मया", "by me", ["INSTR.SG"]), ("विमृश्य", "having reflected", ["INDECL"]),
     ("एतत्", "this", ["ACC.SG"]), ("इच्छसि", "you wish", ["PRES.2SG"]),
     ("कुरु", "do", ["IMP.2SG"])],
))
_todo.append(_v(
    6, "Taittirīya Upaniṣad 1.11.1",
    "सत्यं वद। धर्मं चर। स्वाध्यायान्मा प्रमदः।",
    "satyaṃ vada. dharmaṃ cara. svādhyāyānmā pramadaḥ.",
    [("सत्यम्", "the truth", ["ACC.SG"]), ("वद", "speak", ["IMP.2SG"]),
     ("धर्मम्", "what is right", ["ACC.SG"]), ("चर", "practise", ["IMP.2SG"]),
     ("स्वाध्यायात्", "from your own study", ["ABL.SG"]), ("मा", "do not", ["INDECL"]),
     ("प्रमदः", "be careless", ["AOR.2SG"])],
    was=[("योगादृते ज्ञानमुपैति नेह योगो विना ज्ञानेन न सिद्धिमेति। ज्ञानं च योगं च समं मनस्वी पुमान् भजेद्वा यदि वा क्षयः स्यात्॥", False)],
))
_todo.append(_v(
    7, "Subhāṣita",
    "परोपकारार्थमिदं शरीरम्।",
    "paropakārārthamidaṃ śarīram.",
    [("परोपकारार्थम्", "for the sake of helping others", ["ACC.SG"]),
     ("इदम्", "this", ["NOM.SG"]), ("शरीरम्", "body", ["NOM.SG"])],
))
_todo.append(_v(
    8, "Subhāṣita Ratna Bhāṇḍāgāra",
    "अपि स्वर्णमयी लङ्का न मे लक्ष्मण रोचते। जननी जन्मभूमिश्च स्वर्गादपि गरीयसी॥",
    "api svarṇamayī laṅkā na me lakṣmaṇa rocate. jananī janmabhūmiśca svargādapi garīyasī.",
    [("स्वर्णमयी", "made of gold", ["NOM.SG"]), ("लङ्का", "Lanka", ["NOM.SG"]),
     ("न", "not", ["INDECL"]), ("मे", "to me", ["DAT.SG"]),
     ("रोचते", "is pleasing", ["PRES.3SG"]), ("जननी", "mother", ["NOM.SG"]),
     ("जन्मभूमिः", "birthplace", ["NOM.SG"]), ("स्वर्गात्", "than heaven", ["ABL.SG"]),
     ("गरीयसी", "superior", ["NOM.SG"])],
))
_todo.append(_v(
    9, "Bhagavad Gītā 6.5",
    "उद्धरेदात्मनात्मानं नात्मानमवसादयेत्। आत्मैव ह्यात्मनो बन्धुरात्मैव रिपुरात्मनः॥",
    "uddhared ātmanātmānaṃ nātmānamavasādayet. ātmaiva hyātmano bandhurātmaiva ripurātmanaḥ.",
    [("उद्धरेत्", "should lift up", ["OPT.3SG"]), ("आत्मना", "by oneself", ["INSTR.SG"]),
     ("आत्मानम्", "oneself", ["ACC.SG"]), ("न", "not", ["INDECL"]),
     ("अवसादयेत्", "should degrade", ["OPT.3SG"]), ("आत्मा", "the self", ["NOM.SG"]),
     ("बन्धुः", "friend", ["NOM.SG"]), ("आत्मनः", "of the self", ["GEN.SG"]),
     ("रिपुः", "enemy", ["NOM.SG"])],
))
_todo.append(_v(
    10, "Bhagavad Gītā 2.22",
    "वासांसि जीर्णानि यथा विहाय नवानि गृह्णाति नरोऽपराणि। तथा शरीराणि विहाय जीर्णान्यन्यानि संयाति नवानि देही॥",
    "vāsāṃsi jīrṇāni yathā vihāya navāni gṛhṇāti naro'parāṇi. tathā śarīrāṇi vihāya jīrṇānyanyāni saṃyāti navāni dehī.",
    [("वासांसि", "garments", ["ACC.PL"]), ("जीर्णानि", "worn out", ["ACC.PL"]),
     ("यथा", "just as", ["INDECL"]), ("विहाय", "having cast off", ["INDECL"]),
     ("नवानि", "new", ["ACC.PL"]), ("गृह्णाति", "takes", ["PRES.3SG"]),
     ("नरः", "a man", ["NOM.SG"]), ("शरीराणि", "bodies", ["ACC.PL"]),
     ("अन्यानि", "other", ["ACC.PL"]), ("संयाति", "obtains", ["PRES.3SG"]),
     ("देही", "the embodied", ["NOM.SG"])],
))
_todo.append(_v(
    11, "Bhagavad Gītā 6.6",
    "बन्धुरात्मात्मनस्तस्य येनात्मैवात्मना जितः। अनात्मनस्तु शत्रुत्वे वर्तेतात्मैव शत्रुवत्॥",
    "bandhurātmātmanastasya yenātmaivātmanā jitaḥ. anātmanastu śatrutve vartetātmaiva śatruvat.",
    [("बन्धुः", "friend", ["NOM.SG"]), ("आत्मा", "the self", ["NOM.SG"]),
     ("तस्य", "of him", ["GEN.SG"]), ("येन", "by whom", ["INSTR.SG"]),
     ("जितः", "conquered", ["NOM.SG"]), ("अनात्मनः", "of the uncontrolled", ["GEN.SG"]),
     ("तु", "but", ["INDECL"]), ("शत्रुत्वे", "in hostility", ["LOC.SG"]),
     ("वर्तेत", "acts", ["OPT.3SG"]), ("शत्रुवत्", "like an enemy", ["INDECL"])],
))
_todo.append(_v(
    12, "Bṛhadāraṇyaka Upaniṣad 1.3.28",
    "असतो मा सद्गमय। तमसो मा ज्योतिर्गमय। मृत्योर्मामृतं गमय।",
    "asato mā sadgamaya. tamaso mā jyotirgamaya. mṛtyormāmṛtaṃ gamaya.",
    [("असतः", "from the unreal", ["ABL.SG"]), ("मा", "me", ["ACC.SG"]),
     ("सत्", "to the real", ["ACC.SG"]), ("गमय", "lead", ["IMP.2SG"]),
     ("तमसः", "from darkness", ["ABL.SG"]), ("ज्योतिः", "to light", ["ACC.SG"]),
     ("मृत्योः", "from death", ["ABL.SG"]), ("अमृतम्", "to the deathless", ["ACC.SG"])],
    was=[("अमन्त्रं चाक्षरं चैव शैशवे पठितं तथा। प्रायश्चित्तमपि प्रोक्तं वृथा जन्म न हि त्यजेत्॥", False)],
))
_todo.append(_v(
    13, "Nītiśataka 13",
    "येषां न विद्या न तपो न दानं ज्ञानं न शीलं न गुणो न धर्मः। ते मर्त्यलोके भुवि भारभूता मनुष्यरूपेण मृगाश्चरन्ति॥",
    "yeṣāṃ na vidyā na tapo na dānaṃ jñānaṃ na śīlaṃ na guṇo na dharmaḥ. te martyaloke bhuvi bhārabhūtā manuṣyarūpeṇa mṛgāścaranti..",
    [("येषाम्", "of whom", ["GEN.PL"]), ("न", "not", ["INDECL"]),
     ("विद्या", "learning", ["NOM.SG"]), ("तपः", "discipline", ["NOM.SG"]),
     ("दानम्", "giving", ["NOM.SG"]), ("ज्ञानम्", "knowledge", ["NOM.SG"]),
     ("शीलम्", "good conduct", ["NOM.SG"]), ("गुणः", "virtue", ["NOM.SG"]),
     ("धर्मः", "dharma", ["NOM.SG"]), ("ते", "they", ["NOM.PL"]),
     ("मर्त्यलोके", "in the world of mortals", ["LOC.SG"]), ("भुवि", "on the earth", ["LOC.SG"]),
     ("भारभूताः", "being a burden", ["NOM.PL"]), ("मनुष्यरूपेण", "in human form", ["INSTR.SG"]),
     ("मृगाः", "beasts", ["NOM.PL"]), ("चरन्ति", "roam", ["PRES.3PL"])],
    was=[("अहो वृद्धत्वं कष्टम्।", False)],
))
_todo.append(_v(
    14, "Mundaka Upaniṣad 3.1.6",
    "सत्यमेव जयते नानृतम्। सत्येन पन्था विततो देवयानः।",
    "satyameva jayate nānṛtam. satyena panthā vitato devayānaḥ.",
    [("सत्यम्", "truth", ["NOM.SG"]), ("एव", "indeed", ["INDECL"]),
     ("जयते", "triumphs", ["PRES.3SG"]), ("न", "not", ["INDECL"]),
     ("अनृतम्", "falsehood", ["NOM.SG"]), ("सत्येन", "by truth", ["INSTR.SG"]),
     ("पन्थाः", "path", ["NOM.SG"]), ("विततः", "is spread", ["NOM.SG"]),
     ("देवयानः", "leading to the gods", ["NOM.SG"])],
))
_todo.append(_v(
    15, "Mundaka Upaniṣad 3.1.6",
    "सत्यमेव जयते नानृतं सत्येन पन्था विततो देवयानः। येनाक्रमन्त्यृषयो ह्याप्तकामा यत्र तत् सत्यस्य परमं निधानम्॥",
    "satyameva jayate nānṛtaṃ satyena panthā vitato devayānaḥ. yenākramanty ṛṣayo hyāptakāmā yatra tat satyasya paramaṃ nidhānam.",
    [("सत्यम्", "truth", ["NOM.SG"]), ("एव", "indeed", ["INDECL"]),
     ("जयते", "triumphs", ["PRES.3SG"]), ("अनृतम्", "falsehood", ["NOM.SG"]),
     ("सत्येन", "by truth", ["INSTR.SG"]), ("पन्थाः", "path", ["NOM.SG"]),
     ("विततः", "is spread", ["NOM.SG"]), ("ऋषयः", "the seers", ["NOM.PL"]),
     ("आप्तकामाः", "whose desires are fulfilled", ["NOM.PL"]),
     ("सत्यस्य", "of truth", ["GEN.SG"]), ("परमम्", "highest", ["NOM.SG"]),
     ("निधानम्", "abode", ["NOM.SG"])],
))
_todo.append(_v(
    16, "Bhagavad Gītā 3.21",
    "यद्यदाचरति श्रेष्ठस्तत्तदेवेतरो जनः। स यत्प्रमाणं कुरुते लोकस्तदनुवर्तते॥",
    "yadyadācarati śreṣṭhastattadevetaro janaḥ. sa yatpramāṇaṃ kurute lokastadanuvartate.",
    [("यत् यत्", "whatever", ["ACC.SG"]), ("आचरति", "does", ["PRES.3SG"]),
     ("श्रेष्ठः", "the best", ["NOM.SG"]), ("तत् तत्", "that very thing", ["ACC.SG"]),
     ("इतरः", "other", ["NOM.SG"]), ("जनः", "people", ["NOM.SG"]),
     ("प्रमाणम्", "standard", ["ACC.SG"]), ("कुरुते", "makes", ["PRES.3SG"]),
     ("लोकः", "the world", ["NOM.SG"]), ("अनुवर्तते", "follows after", ["PRES.3SG"])],
))
_todo.append(_v(
    17, "Bhagavad Gītā 2.14",
    "मात्रास्पर्शास्तु कौन्तेय शीतोष्णसुखदुःखदाः। आगमापायिनोऽनित्यास्तांस्तितिक्षस्व भारत॥",
    "mātrāsparśāstu kaunteya śītoṣṇasukhaduḥkhadāḥ. āgamāpāyino'nityāstāṃstitikṣasva bhārata.",
    [("मात्रास्पर्शाः", "contacts of senses with objects", ["NOM.PL"]),
     ("तु", "but", ["INDECL"]), ("कौन्तेय", "O son of Kunti", ["VOC.SG"]),
     ("शीतोष्णसुखदुःखदाः", "giving cold and heat, pleasure and pain", ["NOM.PL"]),
     ("आगमापायिनः", "coming and going", ["NOM.PL"]), ("अनित्याः", "impermanent", ["NOM.PL"]),
     ("तान्", "them", ["ACC.PL"]), ("तितिक्षस्व", "endure", ["IMP.2SG"]),
     ("भारत", "O descendant of Bharata", ["VOC.SG"])],
))
_todo.append(_v(
    18, "Manusmṛti 4.138",
    "सत्यं ब्रूयात्प्रियं ब्रूयान्न ब्रूयात्सत्यमप्रियम्। प्रियं च नानृतं ब्रूयादेष धर्मः सनातनः॥",
    "satyaṃ brūyātpriyaṃ brūyānna brūyātsatyamapriyam. priyaṃ ca nānṛtaṃ brūyādeṣa dharmaḥ sanātanaḥ..",
    [("सत्यम्", "what is true", ["ACC.SG"]), ("ब्रूयात्", "one should say", ["OPT.3SG"]),
     ("प्रियम्", "what is pleasant", ["ACC.SG"]), ("न", "not", ["INDECL"]),
     ("अप्रियम्", "unpleasant", ["ACC.SG"]), ("च", "and", ["INDECL"]),
     ("अनृतम्", "untrue", ["ACC.SG"]), ("एषः", "this", ["NOM.SG"]),
     ("धर्मः", "dharma", ["NOM.SG"]), ("सनातनः", "everlasting", ["NOM.SG"])],
    was=[("पैशुन्याद्विरमेत्।", False)],
))
_todo.append(_v(
    19, "Hitopadeśa 1.71",
    "अयं निजः परो वेति गणना लघुचेतसाम्। उदारचरितानां तु वसुधैव कुटुम्बकम्॥",
    "ayaṃ nijaḥ paro veti gaṇanā laghucetasām. udāracaritānāṃ tu vasudhaiva kuṭumbakam..",
    [("अयम्", "this one", ["NOM.SG"]), ("निजः", "one's own", ["NOM.SG"]),
     ("परः", "a stranger", ["NOM.SG"]), ("वा", "or", ["INDECL"]), ("इति", "thus", ["INDECL"]),
     ("गणना", "the reckoning", ["NOM.SG"]), ("लघुचेतसाम्", "of the small-minded", ["GEN.PL"]),
     ("उदारचरितानाम्", "of those of generous conduct", ["GEN.PL"]), ("तु", "but", ["INDECL"]),
     ("वसुधा", "the earth", ["NOM.SG"]), ("एव", "itself", ["INDECL"]),
     ("कुटुम्बकम्", "a family", ["NOM.SG"])],
    was=[("रागो द्वेषश्च सर्वस्य प्रीतिः।", False)],
))


# ── Intermediate band (days 30–59) ───────────────────────────────────────
_todo.append(_v(
    30, "Bhagavad Gītā 2.48",
    "योगस्थः कुरु कर्माणि सङ्गं त्यक्त्वा धनञ्जय। सिद्ध्यसिद्ध्योः समो भूत्वा समत्वं योग उच्यते॥",
    "yogasthaḥ kuru karmāṇi saṅgaṃ tyaktvā dhanañjaya. siddhyasiddhyoḥ samo bhūtvā samatvaṃ yoga ucyate.",
    [("योगस्थः", "established in yoga", ["NOM.SG"]), ("कुरु", "do", ["IMP.2SG"]),
     ("कर्माणि", "actions", ["ACC.PL"]), ("सङ्गम्", "attachment", ["ACC.SG"]),
     ("त्यक्त्वा", "having abandoned", ["INDECL"]), ("सिद्ध्यसिद्ध्योः", "in success and failure", ["LOC.DU"]),
     ("समः", "equal", ["NOM.SG"]), ("भूत्वा", "having become", ["INDECL"]),
     ("समत्वम्", "equanimity", ["NOM.SG"]), ("योगः", "yoga", ["NOM.SG"]),
     ("उच्यते", "is called", ["PRES.3SG"])],
))
_todo.append(_v(
    31, "Īśopaniṣad 1",
    "ईशा वास्यमिदं सर्वं यत्किञ्च जगत्यां जगत्। तेन त्यक्तेन भुञ्जीथा मा गृधः कस्यस्विद्धनम्॥",
    "īśā vāsyamidaṃ sarvaṃ yatkiñca jagatyāṃ jagat. tena tyaktena bhuñjīthā mā gṛdhaḥ kasyasviddhanam..",
    [("ईशा", "by the Lord", ["INSTR.SG"]), ("वास्यम्", "to be pervaded", ["NOM.SG"]),
     ("इदम्", "this", ["NOM.SG"]), ("सर्वम्", "all", ["NOM.SG"]),
     ("यत् किञ्च", "whatever", ["NOM.SG"]), ("जगत्याम्", "in the world", ["LOC.SG"]),
     ("जगत्", "a moving thing", ["NOM.SG"]), ("तेन", "by that", ["INSTR.SG"]),
     ("त्यक्तेन", "by letting go", ["INSTR.SG"]), ("भुञ्जीथाः", "you should enjoy", ["OPT.2SG"]),
     ("मा", "do not", ["INDECL"]), ("गृधः", "covet", ["AOR.2SG"]),
     ("कस्य स्वित्", "anyone's", ["GEN.SG"]), ("धनम्", "wealth", ["ACC.SG"])],
    was=[("ते वर्धमानं।", False)],
))
_todo.append(_v(
    32, "Bhagavad Gītā 4.7",
    "यदा यदा हि धर्मस्य ग्लानिर्भवति भारत। अभ्युत्थानमधर्मस्य तदात्मानं सृजाम्यहम्॥",
    "yadā yadā hi dharmasya glānirbhavati bhārata. abhyutthānamadharmasya tadātmānaṃ sṛjāmyaham.",
    [("यदा यदा", "whenever", ["INDECL"]), ("हि", "indeed", ["INDECL"]),
     ("धर्मस्य", "of righteousness", ["GEN.SG"]), ("ग्लानिः", "decline", ["NOM.SG"]),
     ("भवति", "comes about", ["PRES.3SG"]), ("भारत", "O descendant of Bharata", ["VOC.SG"]),
     ("अभ्युत्थानम्", "rise", ["NOM.SG"]), ("अधर्मस्य", "of unrighteousness", ["GEN.SG"]),
     ("तदा", "then", ["INDECL"]), ("आत्मानम्", "myself", ["ACC.SG"]),
     ("सृजामि", "I create", ["PRES.1SG"]), ("अहम्", "I", ["NOM.SG"])],
))
_todo.append(_v(
    33, "Bhagavad Gītā 4.8",
    "परित्राणाय साधूनां विनाशाय च दुष्कृताम्। धर्मसंस्थापनार्थाय सम्भवामि युगे युगे॥",
    "paritrāṇāya sādhūnāṃ vināśāya ca duṣkṛtām. dharmasaṃsthāpanārthāya sambhavāmi yuge yuge.",
    [("परित्राणाय", "for the protection", ["DAT.SG"]), ("साधूनाम्", "of the good", ["GEN.PL"]),
     ("विनाशाय", "for the destruction", ["DAT.SG"]), ("दुष्कृताम्", "of the evil-doers", ["GEN.PL"]),
     ("धर्मसंस्थापनार्थाय", "for re-establishing dharma", ["DAT.SG"]),
     ("सम्भवामि", "I appear", ["PRES.1SG"]), ("युगे युगे", "in every age", ["LOC.SG"])],
))
_todo.append(_v(
    34, "Bhagavad Gītā 2.50",
    "बुद्धियुक्तो जहातीह उभे सुकृतदुष्कृते। तस्माद्योगाय युज्यस्व योगः कर्मसु कौशलम्॥",
    "buddhiyukto jahātīha ubhe sukṛtaduṣkṛte. tasmādyogāya yujyasva yogaḥ karmasu kauśalam.",
    [("बुद्धियुक्तः", "endowed with wisdom", ["NOM.SG"]), ("जहाति", "abandons", ["PRES.3SG"]),
     ("उभे", "both", ["ACC.DU"]), ("सुकृतदुष्कृते", "good and evil deeds", ["ACC.DU"]),
     ("तस्मात्", "therefore", ["INDECL"]), ("योगाय", "to yoga", ["DAT.SG"]),
     ("युज्यस्व", "be engaged", ["IMP.2SG"]), ("योगः", "yoga", ["NOM.SG"]),
     ("कर्मसु", "in actions", ["LOC.PL"]), ("कौशलम्", "skill", ["NOM.SG"])],
))
_todo.append(_v(
    35, "Bhagavad Gītā 9.27",
    "यत्करोषि यदश्नासि यज्जुहोषि ददासि यत्। यत्तपस्यसि कौन्तेय तत्कुरुष्व मदर्पणम्॥",
    "yatkaroṣi yadaśnāsi yajjuhoṣi dadāsi yat. yattapasyasi kaunteya tatkuruṣva madarpaṇam.",
    [("यत्", "that which", ["ACC.SG"]), ("करोषि", "you do", ["PRES.2SG"]),
     ("अश्नासि", "you eat", ["PRES.2SG"]), ("जुहोषि", "you offer", ["PRES.2SG"]),
     ("ददासि", "you give", ["PRES.2SG"]), ("तपस्यसि", "you practise austerity", ["PRES.2SG"]),
     ("कुरुष्व", "do", ["IMP.2SG"]), ("मदर्पणम्", "as an offering to me", ["ACC.SG"])],
))
_todo.append(_v(
    36, "Bhagavad Gītā 12.13",
    "अद्वेष्टा सर्वभूतानां मैत्रः करुण एव च। निर्ममो निरहङ्कारः समदुःखसुखः क्षमी॥",
    "adveṣṭā sarvabhūtānāṃ maitraḥ karuṇa eva ca. nirmamo nirahaṅkāraḥ samaduḥkhasukhaḥ kṣamī.",
    [("अद्वेष्टा", "free of hatred", ["NOM.SG"]), ("सर्वभूतानाम्", "toward all beings", ["GEN.PL"]),
     ("मैत्रः", "friendly", ["NOM.SG"]), ("करुणः", "compassionate", ["NOM.SG"]),
     ("निर्ममः", "without possessiveness", ["NOM.SG"]), ("निरहङ्कारः", "without ego", ["NOM.SG"]),
     ("समदुःखसुखः", "equal in pain and pleasure", ["NOM.SG"]), ("क्षमी", "forgiving", ["NOM.SG"])],
))


# ── Advanced band (days 60–…) ───────────────────────────────────────────
_todo.append(_v(
    60, "Bhagavad Gītā 4.24",
    "ब्रह्मार्पणं ब्रह्म हविर्ब्रह्माग्नौ ब्रह्मणा हुतम्। ब्रह्मैव तेन गन्तव्यं ब्रह्मकर्मसमाधिना॥",
    "brahmārpaṇaṃ brahma havirbrahmāgnau brahmaṇā hutam. brahmaiva tena gantavyaṃ brahmakarmasamādhinā.",
    [("ब्रह्म", "Brahman", ["NOM.SG"]), ("अर्पणम्", "the offering", ["NOM.SG"]),
     ("हविः", "the oblation", ["NOM.SG"]), ("अग्नौ", "in the fire", ["LOC.SG"]),
     ("हुतम्", "offered", ["NOM.SG"]), ("तेन", "by him", ["INSTR.SG"]),
     ("गन्तव्यम्", "to be reached", ["NOM.SG"]), ("ब्रह्मकर्मसमाधिना", "by absorption in Brahman-action", ["INSTR.SG"])],
    # The text joins the words: havir brahmāgnau.
    was=[("ब्रह्मार्पणं ब्रह्म हविः ब्रह्माग्नौ ब्रह्मणा हुतम्। ब्रह्मैव तेन गन्तव्यं ब्रह्मकर्मसमाधिना॥", True)],
))
_todo.append(_v(
    40, "Bhagavad Gītā 3.35",
    "श्रेयान्स्वधर्मो विगुणः परधर्मात्स्वनुष्ठितात्। स्वधर्मे निधनं श्रेयः परधर्मो भयावहः॥",
    "śreyānsvadharmo viguṇaḥ paradharmātsvanuṣṭhitāt. svadharme nidhanaṃ śreyaḥ paradharmo bhayāvahaḥ.",
    [("श्रेयान्", "better", ["NOM.SG"]), ("स्वधर्मः", "one's own duty", ["NOM.SG"]),
     ("विगुणः", "deficient", ["NOM.SG"]), ("परधर्मात्", "than another's duty", ["ABL.SG"]),
     ("स्वनुष्ठितात्", "well-performed", ["ABL.SG"]), ("स्वधर्मे", "in one's own duty", ["LOC.SG"]),
     ("निधनम्", "death", ["NOM.SG"]), ("श्रेयः", "better", ["NOM.SG"]),
     ("भयावहः", "bringing danger", ["NOM.SG"])],
))
_todo.append(_v(
    41, "Bhagavad Gītā 2.27",
    "जातस्य हि ध्रुवो मृत्युर्ध्रुवं जन्म मृतस्य च। तस्मादपरिहार्येऽर्थे न त्वं शोचितुमर्हसि॥",
    "jātasya hi dhruvo mṛtyurdhruvaṃ janma mṛtasya ca. tasmādaparihārye'rthe na tvaṃ śocitumarhasi.",
    [("जातस्य", "of one who is born", ["GEN.SG"]), ("ध्रुवः", "certain", ["NOM.SG"]),
     ("मृत्युः", "death", ["NOM.SG"]), ("ध्रुवम्", "certain", ["NOM.SG"]),
     ("जन्म", "birth", ["NOM.SG"]), ("मृतस्य", "of one who has died", ["GEN.SG"]),
     ("अपरिहार्ये", "unavoidable", ["LOC.SG"]), ("अर्थे", "in the matter", ["LOC.SG"]),
     ("न", "not", ["INDECL"]), ("त्वम्", "you", ["NOM.SG"]),
     ("शोचितुम्", "to grieve", ["INF"]), ("अर्हसि", "you ought", ["PRES.2SG"])],
))
_todo.append(_v(
    42, "Bhagavad Gītā 4.38",
    "न हि ज्ञानेन सदृशं पवित्रमिह विद्यते। तत्स्वयं योगसंसिद्धः कालेनात्मनि विन्दति॥",
    "na hi jñānena sadṛśaṃ pavitramiha vidyate. tatsvayaṃ yogasaṃsiddhaḥ kālenātmani vindati.",
    [("न", "not", ["INDECL"]), ("ज्ञानेन", "with knowledge", ["INSTR.SG"]),
     ("सदृशम्", "equal", ["NOM.SG"]), ("पवित्रम्", "purifying", ["NOM.SG"]),
     ("विद्यते", "exists", ["PRES.3SG"]), ("योगसंसिद्धः", "perfected in yoga", ["NOM.SG"]),
     ("कालेन", "in time", ["INSTR.SG"]), ("आत्मनि", "in the self", ["LOC.SG"]),
     ("विन्दति", "finds", ["PRES.3SG"])],
))
_todo.append(_v(
    43, "Bhagavad Gītā 10.11",
    "तेषामेवानुकम्पार्थमहमज्ञानजं तमः। नाशयाम्यात्मभावस्थो ज्ञानदीपेन भास्वता॥",
    "teṣāmevānukampārthamahamajñānajaṃ tamaḥ. nāśayāmyātmabhāvastho jñānadīpena bhāsvatā.",
    [("तेषाम्", "of them", ["GEN.PL"]), ("अनुकम्पार्थम्", "out of compassion", ["INDECL"]),
     ("अहम्", "I", ["NOM.SG"]), ("अज्ञानजम्", "born of ignorance", ["ACC.SG"]),
     ("तमः", "darkness", ["ACC.SG"]), ("नाशयामि", "I destroy", ["PRES.1SG"]),
     ("ज्ञानदीपेन", "by the lamp of knowledge", ["INSTR.SG"]), ("भास्वता", "radiant", ["INSTR.SG"])],
))
_todo.append(_v(
    44, "Bhagavad Gītā 5.29",
    "भोक्तारं यज्ञतपसां सर्वलोकमहेश्वरम्। सुहृदं सर्वभूतानां ज्ञात्वा मां शान्तिमृच्छति॥",
    "bhoktāraṃ yajñatapasāṃ sarvalokamaheśvaram. suhṛdaṃ sarvabhūtānāṃ jñātvā māṃ śāntimṛcchati.",
    [("भोक्तारम्", "the enjoyer", ["ACC.SG"]), ("यज्ञतपसाम्", "of sacrifices and austerities", ["GEN.PL"]),
     ("सर्वलोकमहेश्वरम्", "the great lord of all worlds", ["ACC.SG"]),
     ("सुहृदम्", "the friend", ["ACC.SG"]), ("सर्वभूतानाम्", "of all beings", ["GEN.PL"]),
     ("ज्ञात्वा", "having known", ["INDECL"]), ("माम्", "me", ["ACC.SG"]),
     ("शान्तिम्", "peace", ["ACC.SG"]), ("ऋच्छति", "attains", ["PRES.3SG"])],
))
_todo.append(_v(
    45, "Bhagavad Gītā 9.34",
    "मन्मना भव मद्भक्तो मद्याजी मां नमस्कुरु। मामेवैष्यसि युक्त्वैवमात्मानं मत्परायणः॥",
    "manmanā bhava madbhakto madyājī māṃ namaskuru. māmevaiṣyasi yuktvaivamātmānaṃ matparāyaṇaḥ.",
    [("मन्मनाः", "with mind fixed on me", ["NOM.SG"]), ("भव", "become", ["IMP.2SG"]),
     ("मद्भक्तः", "my devotee", ["NOM.SG"]), ("मद्याजी", "my worshipper", ["NOM.SG"]),
     ("माम्", "me", ["ACC.SG"]), ("नमस्कुरु", "bow to", ["IMP.2SG"]),
     ("माम्", "me", ["ACC.SG"]), ("एष्यसि", "you will come to", ["FUT.2SG"]),
     ("आत्मानम्", "yourself", ["ACC.SG"]), ("मत्परायणः", "resolved to me", ["NOM.SG"])],
))
_todo.append(_v(
    46, "Bhagavad Gītā 14.27",
    "ब्रह्मणो हि प्रतिष्ठाहममृतस्याव्ययस्य च। शाश्वतस्य च धर्मस्य सुखस्यैकान्तिकस्य च॥",
    "brahmaṇo hi pratiṣṭhāhamamṛtasyāvyayasya ca. śāśvatasya ca dharmasya sukhasyaikāntikasya ca.",
    [("ब्रह्मणः", "of Brahman", ["GEN.SG"]), ("प्रतिष्ठा", "the foundation", ["NOM.SG"]),
     ("अहम्", "I", ["NOM.SG"]), ("अमृतस्य", "of the immortal", ["GEN.SG"]),
     ("अव्ययस्य", "of the imperishable", ["GEN.SG"]), ("शाश्वतस्य", "of the eternal", ["GEN.SG"]),
     ("धर्मस्य", "of dharma", ["GEN.SG"]), ("सुखस्य", "of happiness", ["GEN.SG"]),
     ("ऐकान्तिकस्य", "absolute", ["GEN.SG"])],
))
_todo.append(_v(
    47, "Subhāṣita",
    "अपि स्वर्णमयी लङ्का न मे लक्ष्मण रोचते।",
    "api svarṇamayī laṅkā na me lakṣmaṇa rocate.",
    [("स्वर्णमयी", "made of gold", ["NOM.SG"]), ("लङ्का", "Lanka", ["NOM.SG"]),
     ("न", "not", ["INDECL"]), ("मे", "to me", ["DAT.SG"]),
     ("रोचते", "is pleasing", ["PRES.3SG"])],
))
_todo.append(_v(
    48, "Rāmāyaṇa 6.10.16",
    "सुलभाः पुरुषा राजन्सततं प्रियवादिनः। अप्रियस्य तु पथ्यस्य वक्ता श्रोता च दुर्लभः॥",
    "sulabhāḥ puruṣā rājansatataṃ priyavādinaḥ. apriyasya tu pathyasya vaktā śrotā ca durlabhaḥ..",
    [("सुलभाः", "easy to find", ["NOM.PL"]), ("पुरुषाः", "men", ["NOM.PL"]),
     ("राजन्", "O king", ["VOC.SG"]), ("सततम्", "always", ["INDECL"]),
     ("प्रियवादिनः", "who say what pleases", ["NOM.PL"]),
     ("अप्रियस्य", "of what is unpleasant", ["GEN.SG"]), ("तु", "but", ["INDECL"]),
     ("पथ्यस्य", "of what is wholesome", ["GEN.SG"]), ("वक्ता", "a speaker", ["NOM.SG"]),
     ("श्रोता", "a hearer", ["NOM.SG"]), ("च", "and", ["INDECL"]),
     ("दुर्लभः", "hard to find", ["NOM.SG"])],
    was=[("मातृपितृदासी भ्रातृदास्यं।", False)],
))
_todo.append(_v(
    49, "Hitopadeśa, Prastāvikā 4",
    "सर्वद्रव्येषु विद्यैव द्रव्यमाहुरनुत्तमम्। अहार्यत्वादनर्घत्वादक्षयत्वाच्च सर्वदा॥",
    "sarvadravyeṣu vidyaiva dravyamāhuranuttamam. ahāryatvādanarghatvādakṣayatvācca sarvadā..",
    [("सर्वद्रव्येषु", "among all possessions", ["LOC.PL"]), ("विद्या", "knowledge", ["NOM.SG"]),
     ("एव", "alone", ["INDECL"]), ("द्रव्यम्", "a possession", ["ACC.SG"]),
     ("आहुः", "they call", ["PRES.3PL"]), ("अनुत्तमम्", "unsurpassed", ["ACC.SG"]),
     ("अहार्यत्वात्", "because it cannot be taken away", ["ABL.SG"]),
     ("अनर्घत्वात्", "because it is beyond price", ["ABL.SG"]),
     ("अक्षयत्वात्", "because it never runs out", ["ABL.SG"]), ("च", "and", ["INDECL"]),
     ("सर्वदा", "always", ["INDECL"])],
    was=[("विद्या श्रेष्ठतमा लोके विद्या यस्मात् प्रकाशते।", False)],
))
_todo.append(_v(
    50, "Bhagavad Gītā 6.6",
    "बन्धुरात्मात्मनस्तस्य येनात्मैवात्मना जितः।",
    "bandhurātmātmanastasya yenātmaivātmanā jitaḥ.",
    [("बन्धुः", "friend", ["NOM.SG"]), ("आत्मा", "the self", ["NOM.SG"]),
     ("तस्य", "of him", ["GEN.SG"]), ("येन", "by whom", ["INSTR.SG"]),
     ("जितः", "conquered", ["NOM.SG"])],
))
_todo.append(_v(
    51, "Bhagavad Gītā 2.20",
    "अजो नित्यः शाश्वतोऽयं पुराणो न हन्यते हन्यमाने शरीरे।",
    "ajo nityaḥ śāśvato'yaṃ purāṇo na hanyate hanyamāne śarīre.",
    [("अजः", "unborn", ["NOM.SG"]), ("नित्यः", "eternal", ["NOM.SG"]),
     ("शाश्वतः", "everlasting", ["NOM.SG"]), ("अयम्", "this", ["NOM.SG"]),
     ("पुराणः", "ancient", ["NOM.SG"]), ("न", "not", ["INDECL"]),
     ("हन्यते", "is slain", ["PRES.3SG"]), ("हन्यमाने", "being slain", ["LOC.SG"]),
     ("शरीरे", "in the body", ["LOC.SG"])],
))
_todo.append(_v(
    52, "Nītiśataka 12",
    "साहित्यसङ्गीतकलाविहीनः साक्षात्पशुः पुच्छविषाणहीनः। तृणं न खादन्नपि जीवमानस्तद्भागधेयं परमं पशूनाम्॥",
    "sāhityasaṅgītakalāvihīnaḥ sākṣātpaśuḥ pucchaviṣāṇahīnaḥ. tṛṇaṃ na khādannapi jīvamānastadbhāgadheyaṃ paramaṃ paśūnām..",
    [("साहित्यसङ्गीतकलाविहीनः", "without literature, music and art", ["NOM.SG"]),
     ("साक्षात्", "plainly", ["INDECL"]), ("पशुः", "a beast", ["NOM.SG"]),
     ("पुच्छविषाणहीनः", "lacking tail and horns", ["NOM.SG"]), ("तृणम्", "grass", ["ACC.SG"]),
     ("न", "not", ["INDECL"]), ("खादन्", "eating", ["NOM.SG"]), ("अपि", "even", ["INDECL"]),
     ("जीवमानः", "living", ["NOM.SG"]), ("तत्", "that", ["NOM.SG"]),
     ("भागधेयम्", "good fortune", ["NOM.SG"]), ("परमम्", "great", ["NOM.SG"]),
     ("पशूनाम्", "of the beasts", ["GEN.PL"])],
    was=[("न नीयते निर्गुणं।", False)],
))
_todo.append(_v(
    53, "Mahābhārata 1.11.12",
    "अहिंसा परमो धर्मः।",
    "ahiṃsā paramo dharmaḥ.",
    [("अहिंसा", "non-violence", ["NOM.SG"]), ("परमः", "highest", ["NOM.SG"]),
     ("धर्मः", "duty", ["NOM.SG"])],
))
_todo.append(_v(
    54, "Mahābhārata 5.39.58",
    "अक्रोधेन जयेत्क्रोधमसाधुं साधुना जयेत्। जयेत्कदर्यं दानेन जयेत्सत्येन चानृतम्॥",
    "akrodhena jayetkrodhamasādhuṃ sādhunā jayet. jayetkadaryaṃ dānena jayetsatyena cānṛtam..",
    [("अक्रोधेन", "by not being angry", ["INSTR.SG"]),
     ("जयेत्", "one should conquer", ["OPT.3SG"]), ("क्रोधम्", "anger", ["ACC.SG"]),
     ("असाधुम्", "the bad man", ["ACC.SG"]), ("साधुना", "by goodness", ["INSTR.SG"]),
     ("कदर्यम्", "the miser", ["ACC.SG"]), ("दानेन", "by giving", ["INSTR.SG"]),
     ("सत्येन", "by truth", ["INSTR.SG"]), ("च", "and", ["INDECL"]),
     ("अनृतम्", "untruth", ["ACC.SG"])],
    was=[("दानं धर्मं च मैत्री च।", False)],
))
_todo.append(_v(
    55, "Bhagavad Gītā 2.38",
    "सुखदुःखे समे कृत्वा लाभालाभौ जयाजयौ। ततो युद्धाय युज्यस्व नैवं पापमवाप्स्यसि॥",
    "sukhaduḥkhe same kṛtvā lābhālābhau jayājayau. tato yuddhāya yujyasva naivaṃ pāpamavāpsyasi.",
    [("सुखदुःखे", "pleasure and pain", ["ACC.DU"]), ("समे", "equal", ["ACC.DU"]),
     ("कृत्वा", "having made", ["INDECL"]), ("लाभालाभौ", "gain and loss", ["ACC.DU"]),
     ("जयाजयौ", "victory and defeat", ["ACC.DU"]), ("युद्धाय", "for battle", ["DAT.SG"]),
     ("युज्यस्व", "be ready", ["IMP.2SG"]), ("न", "not", ["INDECL"]),
     ("पापम्", "sin", ["ACC.SG"]), ("अवाप्स्यसि", "will obtain", ["FUT.2SG"])],
))
_todo.append(_v(
    56, "Bhagavad Gītā 2.47",
    "कर्मण्येवाधिकारस्ते।",
    "karmaṇyevādhikāraste.",
    [("कर्मणि", "in action", ["LOC.SG"]), ("एव", "indeed", ["INDECL"]),
     ("अधिकारः", "right", ["NOM.SG"]), ("ते", "your", ["GEN.SG"])],
))
_todo.append(_v(
    57, "Manusmṛti 8.15",
    "धर्मो रक्षति रक्षितः।",
    "dharmo rakṣati rakṣitaḥ.",
    [("धर्मः", "righteousness", ["NOM.SG"]), ("रक्षति", "protects", ["PRES.3SG"]),
     ("रक्षितः", "protected", ["NOM.SG"])],
))
_todo.append(_v(
    58, "Mahābhārata 12.26.23",
    "सुखस्यानन्तरं दुःखं दुःखस्यानन्तरं सुखम्। न नित्यं लभते दुःखं न नित्यं लभते सुखम्॥",
    "sukhasyānantaraṃ duḥkhaṃ duḥkhasyānantaraṃ sukham. na nityaṃ labhate duḥkhaṃ na nityaṃ labhate sukham..",
    [("सुखस्य", "of happiness", ["GEN.SG"]), ("अनन्तरम्", "right after", ["INDECL"]),
     ("दुःखम्", "sorrow", ["NOM.SG"]), ("दुःखस्य", "of sorrow", ["GEN.SG"]),
     ("सुखम्", "happiness", ["NOM.SG"]), ("न", "not", ["INDECL"]),
     ("नित्यम्", "always", ["INDECL"]), ("लभते", "one meets with", ["PRES.3SG"]),
     ("दुःखम्", "sorrow", ["ACC.SG"]), ("सुखम्", "happiness", ["ACC.SG"])],
    was=[("सुखस्य दुःखं सुखमेव।", False)],
))

_todo.append(_v(
    61, "Bhagavad Gītā 2.11",
    "अशोच्यानन्वशोचस्त्वं प्रज्ञावादांश्च भाषसे। गतासूनगतासूंश्च नानुशोचन्ति पण्डिताः॥",
    "aśocyānanvaśocastvaṃ prajñāvādāṃśca bhāṣase. gatāsūnagatāsūṃśca nānuśocanti paṇḍitāḥ.",
    [("अशोच्यान्", "not to be grieved over", ["ACC.PL"]), ("अन्वशोचः", "you have grieved for", ["IMPF.2SG"]),
     ("त्वम्", "you", ["NOM.SG"]), ("प्रज्ञावादान्", "words of wisdom", ["ACC.PL"]),
     ("भाषसे", "you speak", ["PRES.2SG"]), ("गतासून्", "whose life is gone", ["ACC.PL"]),
     ("न", "not", ["INDECL"]), ("अनुशोचन्ति", "grieve over", ["PRES.3PL"]),
     ("पण्डिताः", "the wise", ["NOM.PL"])],
))
_todo.append(_v(
    62, "Bhagavad Gītā 4.7",
    "यदा यदा हि धर्मस्य ग्लानिर्भवति भारत।",
    "yadā yadā hi dharmasya glānirbhavati bhārata.",
    [("यदा यदा", "whenever", ["INDECL"]), ("हि", "indeed", ["INDECL"]),
     ("धर्मस्य", "of righteousness", ["GEN.SG"]), ("ग्लानिः", "decline", ["NOM.SG"]),
     ("भवति", "comes about", ["PRES.3SG"])],
))
_todo.append(_v(
    63, "Bhagavad Gītā 8.8",
    "अभ्यासयोगयुक्तेन चेतसा नान्यगामिना। परमं पुरुषं दिव्यं याति पार्थानुचिन्तयन्॥",
    "abhyāsayogayuktena cetasā nānyagāminā. paramaṃ puruṣaṃ divyaṃ yāti pārthānucintayan.",
    [("अभ्यासयोगयुक्तेन", "united by the yoga of practice", ["INSTR.SG"]),
     ("चेतसा", "with the mind", ["INSTR.SG"]), ("नान्यगामिना", "not going elsewhere", ["INSTR.SG"]),
     ("परमम्", "supreme", ["ACC.SG"]), ("पुरुषम्", "person", ["ACC.SG"]),
     ("दिव्यम्", "divine", ["ACC.SG"]), ("याति", "goes", ["PRES.3SG"]),
     ("अनुचिन्तयन्", "meditating", ["PRS.PART"])],
))
_todo.append(_v(
    64, "Bhagavad Gītā 9.4",
    "मया ततमिदं सर्वं जगदव्यक्तमूर्तिना। मत्स्थानि सर्वभूतानि न चाहं तेष्ववस्थितः॥",
    "mayā tatamidaṃ sarvaṃ jagadavyaktamūrtinā. matsthāni sarvabhūtāni na cāhaṃ teṣvavasthitaḥ.",
    [("मया", "by me", ["INSTR.SG"]), ("ततम्", "is pervaded", ["NOM.SG"]),
     ("इदम्", "this", ["NOM.SG"]), ("सर्वम्", "whole", ["NOM.SG"]),
     ("जगत्", "world", ["NOM.SG"]), ("अव्यक्तमूर्तिना", "with unmanifest form", ["INSTR.SG"]),
     ("मत्स्थानि", "abiding in me", ["NOM.PL"]), ("भूतानि", "beings", ["NOM.PL"]),
     ("तेषु", "in them", ["LOC.PL"]), ("अवस्थितः", "situated", ["NOM.SG"])],
))
_todo.append(_v(
    65, "Rāmāyaṇa 5.10.10",
    "अनिर्वेदः श्रियो मूलमनिर्वेदः परं सुखम्। भूयस्तावद्विचेष्यामि न यत्र विचयः कृतः॥",
    "anirvedaḥ śriyo mūlamanirvedaḥ paraṃ sukham. bhūyastāvadviceṣyāmi na yatra vicayaḥ kṛtaḥ..",
    [("अनिर्वेदः", "not losing heart", ["NOM.SG"]), ("श्रियः", "of good fortune", ["GEN.SG"]),
     ("मूलम्", "the root", ["NOM.SG"]), ("परम्", "the highest", ["NOM.SG"]),
     ("सुखम्", "happiness", ["NOM.SG"]), ("भूयः", "again", ["INDECL"]),
     ("तावत्", "then", ["INDECL"]), ("विचेष्यामि", "I shall search", ["FUT.1SG"]),
     ("न", "not", ["INDECL"]), ("यत्र", "where", ["INDECL"]), ("विचयः", "a search", ["NOM.SG"]),
     ("कृतः", "made", ["NOM.SG"])],
    was=[("न हि कश्चिन्मनस्तापो नैव निर्वृतिमिच्छति।", False)],
))
_todo.append(_v(
    66, "Manusmṛti 10.63",
    "अहिंसा सत्यमस्तेयं शौचमिन्द्रियनिग्रहः। एतं सामासिकं धर्मं चातुर्वर्ण्येऽब्रवीन्मनुः॥",
    "ahiṃsā satyamasteyaṃ śaucamindriyanigrahaḥ. etaṃ sāmāsikaṃ dharmaṃ cāturvarṇye'bravīnmanuḥ.",
    [("अहिंसा", "non-violence", ["NOM.SG"]), ("सत्यम्", "truthfulness", ["NOM.SG"]),
     ("अस्तेयम्", "abstention from theft", ["NOM.SG"]), ("शौचम्", "purity", ["NOM.SG"]),
     ("इन्द्रियनिग्रहः", "control of the senses", ["NOM.SG"]), ("एतम्", "this", ["ACC.SG"]),
     ("धर्मम्", "duty", ["ACC.SG"]), ("अब्रवीत्", "declared", ["IMPF.3SG"]),
     ("मनुः", "Manu", ["NOM.SG"])],
))
_todo.append(_v(
    67, "Bhagavad Gītā 2.24",
    "अच्छेद्योऽयमदाह्योऽयमक्लेद्योऽशोष्य एव च। नित्यः सर्वगतः स्थाणुरचलोऽयं सनातनः॥",
    "acchedyo'yamadāhyo'yamakledyo'śoṣya eva ca. nityaḥ sarvagataḥ sthāṇuracalo'yaṃ sanātanaḥ.",
    [("अच्छेद्यः", "unbreakable", ["NOM.SG"]), ("अयम्", "this", ["NOM.SG"]),
     ("अदाह्यः", "unburnable", ["NOM.SG"]), ("अक्लेद्यः", "unmoistenable", ["NOM.SG"]),
     ("अशोष्यः", "undryable", ["NOM.SG"]), ("नित्यः", "eternal", ["NOM.SG"]),
     ("सर्वगतः", "all-pervading", ["NOM.SG"]), ("स्थाणुः", "immovable", ["NOM.SG"]),
     ("अचलः", "unmoving", ["NOM.SG"]), ("सनातनः", "everlasting", ["NOM.SG"])],
))
_todo.append(_v(
    68, "Vairāgyaśataka 7",
    "भोगा न भुक्ता वयमेव भुक्तास्तपो न तप्तं वयमेव तप्ताः। कालो न यातो वयमेव यातास्तृष्णा न जीर्णा वयमेव जीर्णाः॥",
    "bhogā na bhuktā vayameva bhuktāstapo na taptaṃ vayameva taptāḥ. kālo na yāto vayameva yātāstṛṣṇā na jīrṇā vayameva jīrṇāḥ..",
    [("भोगाः", "pleasures", ["NOM.PL"]), ("न", "not", ["INDECL"]),
     ("भुक्ताः", "consumed", ["NOM.PL"]), ("वयम्", "we", ["NOM.PL"]),
     ("एव", "ourselves", ["INDECL"]), ("तपः", "austerity", ["NOM.SG"]),
     ("तप्तम्", "practised", ["NOM.SG"]), ("तप्ताः", "scorched", ["NOM.PL"]),
     ("कालः", "time", ["NOM.SG"]), ("यातः", "gone", ["NOM.SG"]), ("याताः", "gone", ["NOM.PL"]),
     ("तृष्णा", "craving", ["NOM.SG"]), ("जीर्णा", "worn out", ["NOM.SG"]),
     ("जीर्णाः", "worn out", ["NOM.PL"])],
    was=[("भोगा विषयाः सर्वे।", False)],
))
_todo.append(_v(
    69, "Subhāṣita Ratna Bhāṇḍāgāra",
    "परोपकाराय फलन्ति वृक्षाः परोपकाराय वहन्ति नद्यः। परोपकाराय दुहन्ति गावः परोपकारार्थमिदं शरीरम्॥",
    "paropakārāya phalanti vṛkṣāḥ paropakārāya vahanti nadyaḥ. paropakārāya duhanti gāvaḥ paropakārārthamidaṃ śarīram.",
    [("परोपकाराय", "for the benefit of others", ["DAT.SG"]), ("फलन्ति", "bear fruit", ["PRES.3PL"]),
     ("वृक्षाः", "trees", ["NOM.PL"]), ("वहन्ति", "flow", ["PRES.3PL"]),
     ("नद्यः", "rivers", ["NOM.PL"]), ("दुहन्ति", "give milk", ["PRES.3PL"]),
     ("गावः", "cows", ["NOM.PL"]), ("शरीरम्", "body", ["NOM.SG"])],
))
_todo.append(_v(
    70, "Mahābhārata 13.7.22",
    "यथा धेनुसहस्रेषु वत्सो विन्दति मातरम्। एवं पूर्वकृतं कर्म कर्तारमनुगच्छति॥",
    "yathā dhenusahasreṣu vatso vindati mātaram. evaṃ pūrvakṛtaṃ karma kartāramanugacchati.",
    [("यथा", "just as", ["INDECL"]), ("धेनुसहस्रेषु", "among a thousand cows", ["LOC.PL"]),
     ("वत्सः", "a calf", ["NOM.SG"]), ("विन्दति", "finds", ["PRES.3SG"]),
     ("मातरम्", "its mother", ["ACC.SG"]), ("एवम्", "so", ["INDECL"]),
     ("पूर्वकृतम्", "previously done", ["NOM.SG"]), ("कर्म", "deed", ["NOM.SG"]),
     ("कर्तारम्", "the doer", ["ACC.SG"]), ("अनुगच्छति", "follows", ["PRES.3SG"])],
))
_todo.append(_v(
    71, "Nītiśataka 27",
    "प्रारभ्यते न खलु विघ्नभयेन नीचैः प्रारभ्य विघ्नविहता विरमन्ति मध्याः। विघ्नैः पुनः पुनरपि प्रतिहन्यमानाः प्रारब्धमुत्तमजना न परित्यजन्ति॥",
    "prārabhyate na khalu vighnabhayena nīcaiḥ prārabhya vighnavihatā viramanti madhyāḥ. vighnaiḥ punaḥ punarapi pratihanyamānāḥ prārabdhamuttamajanā na parityajanti..",
    [("प्रारभ्यते", "is begun", ["PRES.3SG"]), ("न", "not", ["INDECL"]),
     ("खलु", "indeed", ["INDECL"]), ("विघ्नभयेन", "from fear of obstacles", ["INSTR.SG"]),
     ("नीचैः", "by the low", ["INSTR.PL"]), ("प्रारभ्य", "having begun", ["INDECL"]),
     ("विघ्नविहताः", "struck by obstacles", ["NOM.PL"]), ("विरमन्ति", "give up", ["PRES.3PL"]),
     ("मध्याः", "the middling", ["NOM.PL"]), ("विघ्नैः", "by obstacles", ["INSTR.PL"]),
     ("पुनः पुनः", "again and again", ["INDECL"]), ("अपि", "even", ["INDECL"]),
     ("प्रतिहन्यमानाः", "being beaten back", ["NOM.PL"]),
     ("प्रारब्धम्", "what was begun", ["ACC.SG"]), ("उत्तमजनाः", "the best people", ["NOM.PL"]),
     ("परित्यजन्ति", "abandon", ["PRES.3PL"])],
    was=[("सत्यं भूयान्नृपतेः।", False)],
))
_todo.append(_v(
    72, "Bhagavad Gītā 6.25",
    "शनैः शनैरुपरमेद् बुद्ध्या धृतिगृहीतया।",
    "śanaiḥ śanairuparamed buddhyā dhṛtigṛhītayā.",
    [("शनैः शनैः", "gradually", ["INDECL"]), ("उपरमेत्", "should withdraw", ["OPT.3SG"]),
     ("बुद्ध्या", "by the intellect", ["INSTR.SG"]), ("धृतिगृहीतया", "held firm with patience", ["INSTR.SG"])],
))
_todo.append(_v(
    73, "Hitopadeśa, Prastāvikā 6",
    "विद्या ददाति विनयं विनयाद्याति पात्रताम्।",
    "vidyā dadāti vinayaṃ vinayādyāti pātratām.",
    [("विद्या", "knowledge", ["NOM.SG"]), ("ददाति", "gives", ["PRES.3SG"]),
     ("विनयम्", "humility", ["ACC.SG"]), ("विनयात्", "from humility", ["ABL.SG"]),
     ("याति", "one reaches", ["PRES.3SG"]), ("पात्रताम्", "worthiness", ["ACC.SG"])],
    # vidyā dadāti are two words.
    was=[("विद्याददाति विनयं विनयाद्याति पात्रताम्।", True)],
))
_todo.append(_v(
    74, "Kaṭha Upaniṣad 1.3.14",
    "उत्तिष्ठत जाग्रत प्राप्य वरान्निबोधत। क्षुरस्य धारा निशिता दुरत्यया दुर्गं पथस्तत्कवयो वदन्ति॥",
    "uttiṣṭhata jāgrata prāpya varānnibodhata. kṣurasya dhārā niśitā duratyayā durgaṃ pathastatkavayo vadanti..",
    [("उत्तिष्ठत", "arise", ["IMP.2PL"]), ("जाग्रत", "awake", ["IMP.2PL"]),
     ("प्राप्य", "having reached", ["INDECL"]), ("वरान्", "the best teachers", ["ACC.PL"]),
     ("निबोधत", "learn", ["IMP.2PL"]), ("क्षुरस्य", "of a razor", ["GEN.SG"]),
     ("धारा", "the edge", ["NOM.SG"]), ("निशिता", "sharpened", ["NOM.SG"]),
     ("दुरत्यया", "hard to cross", ["NOM.SG"]), ("दुर्गम्", "the hard going", ["ACC.SG"]),
     ("पथः", "of the path", ["GEN.SG"]), ("तत्", "that", ["ACC.SG"]),
     ("कवयः", "the wise", ["NOM.PL"]), ("वदन्ति", "say", ["PRES.3PL"])],
    was=[("देहं पृथग्बुद्धेर्यो ज्ञानी।", False)],
))
_todo.append(_v(
    75, "Rāmāyaṇa 1.2.14",
    "मा निषाद प्रतिष्ठां त्वमगमः शाश्वतीः समाः। यत्क्रौञ्चमिथुनादेकमवधीः काममोहितम्॥",
    "mā niṣāda pratiṣṭhāṃ tvamagamaḥ śāśvatīḥ samāḥ. yatkrauñcamithunādekamavadhīḥ kāmamohitam..",
    [("मा", "not", ["INDECL"]), ("निषाद", "O hunter", ["VOC.SG"]),
     ("प्रतिष्ठाम्", "a resting place", ["ACC.SG"]), ("त्वम्", "you", ["NOM.SG"]),
     ("अगमः", "may you reach", ["AOR.2SG"]), ("शाश्वतीः", "everlasting", ["ACC.PL"]),
     ("समाः", "years", ["ACC.PL"]), ("यत्", "since", ["INDECL"]),
     ("क्रौञ्चमिथुनात्", "from a pair of krauñca birds", ["ABL.SG"]), ("एकम्", "one", ["ACC.SG"]),
     ("अवधीः", "you killed", ["AOR.2SG"]), ("काममोहितम्", "lost in love", ["ACC.SG"])],
    was=[("धर्मार्थकाममोक्षाणां यस्यार्थं न विरुध्यते।", False)],
))
_todo.append(_v(
    76, "Mahābhārata 1.107.32",
    "त्यजेदेकं कुलस्यार्थे ग्रामस्यार्थे कुलं त्यजेत्। ग्रामं जनपदस्यार्थे आत्मार्थे पृथिवीं त्यजेत्॥",
    "tyajedekaṃ kulasyārthe grāmasyārthe kulaṃ tyajet. grāmaṃ janapadasyārthe ātmārthe pṛthivīṃ tyajet.",
    [("त्यजेत्", "one should give up", ["OPT.3SG"]), ("एकम्", "one person", ["ACC.SG"]),
     ("कुलस्य", "of the family", ["GEN.SG"]), ("अर्थे", "for the sake", ["LOC.SG"]),
     ("ग्रामस्य", "of the village", ["GEN.SG"]), ("कुलम्", "the family", ["ACC.SG"]),
     ("ग्रामम्", "the village", ["ACC.SG"]), ("जनपदस्य", "of the country", ["GEN.SG"]),
     ("आत्मार्थे", "for the sake of the self", ["LOC.SG"]),
     ("पृथिवीम्", "the earth", ["ACC.SG"])],
    # The old line repeated its first quarter in place of the second.
    was=[("त्यजेदेकं कुलस्यार्थे त्यजेदेकं कुलस्य च।", False)],
))
_todo.append(_v(
    77, "Bhagavad Gītā 2.18",
    "अन्तवन्त इमे देहा नित्यस्योक्ताः शरीरिणः।",
    "antavanta ime dehā nityasyoktāḥ śarīriṇaḥ.",
    [("अन्तवन्तः", "perishable", ["NOM.PL"]), ("इमे", "these", ["NOM.PL"]),
     ("देहाः", "bodies", ["NOM.PL"]), ("नित्यस्य", "of the eternal", ["GEN.SG"]),
     ("शरीरिणः", "of the embodied", ["GEN.SG"])],
))
_todo.append(_v(
    78, "Hitopadeśa 1.72",
    "न कश्चित्कस्यचिन्मित्रं न कश्चित्कस्यचिद्रिपुः। व्यवहारेण मित्राणि जायन्ते रिपवस्तथा॥",
    "na kaścitkasyacinmitraṃ na kaścitkasyacidripuḥ. vyavahāreṇa mitrāṇi jāyante ripavastathā..",
    [("न", "not", ["INDECL"]), ("कश्चित्", "anyone", ["NOM.SG"]),
     ("कस्यचित्", "of anyone", ["GEN.SG"]), ("मित्रम्", "a friend", ["NOM.SG"]),
     ("रिपुः", "an enemy", ["NOM.SG"]), ("व्यवहारेण", "by dealings", ["INSTR.SG"]),
     ("मित्राणि", "friends", ["NOM.PL"]), ("जायन्ते", "come to be", ["PRES.3PL"]),
     ("रिपवः", "enemies", ["NOM.PL"]), ("तथा", "likewise", ["INDECL"])],
    was=[("मित्री च उपकारः च।", False)],
))
_todo.append(_v(
    79, "Subhāṣita Ratna Bhāṇḍāgāra",
    "जननी जन्मभूमिश्च स्वर्गादपि गरीयसी।",
    "jananī janmabhūmiśca svargādapi garīyasī.",
    [("जननी", "mother", ["NOM.SG"]), ("जन्मभूमिः", "birthplace", ["NOM.SG"]),
     ("च", "and", ["INDECL"]), ("स्वर्गात्", "than heaven", ["ABL.SG"]),
     ("गरीयसी", "more venerable", ["NOM.SG"])],
))
_todo.append(_v(
    80, "Bhagavad Gītā 2.23",
    "नैनं छिन्दन्ति शस्त्राणि नैनं दहति पावकः।",
    "nainaṃ chindanti śastrāṇi nainaṃ dahati pāvakaḥ.",
    [("न", "not", ["INDECL"]), ("एनम्", "him", ["ACC.SG"]),
     ("छिन्दन्ति", "cut", ["PRES.3PL"]), ("शस्त्राणि", "weapons", ["NOM.PL"]),
     ("दहति", "burns", ["PRES.3SG"]), ("पावकः", "fire", ["NOM.SG"])],
))
_todo.append(_v(
    81, "Mundaka Upaniṣad 3.1.6",
    "सत्यमेव जयते।",
    "satyameva jayate.",
    [("सत्यम्", "truth", ["NOM.SG"]), ("एव", "indeed", ["INDECL"]),
     ("जयते", "triumphs", ["PRES.3SG"])],
))
_todo.append(_v(
    82, "Bhagavad Gītā 14.24",
    "समदुःखसुखः स्वस्थः समलोष्टाश्मकाञ्चनः।",
    "samaduḥkhasukhaḥ svasthaḥ samaloṣṭāśmakāñcanaḥ.",
    [("समदुःखसुखः", "the same in sorrow and joy", ["NOM.SG"]),
     ("स्वस्थः", "abiding in oneself", ["NOM.SG"]),
     ("समलोष्टाश्मकाञ्चनः", "to whom a clod, a stone and gold are alike", ["NOM.SG"])],
    # The verse is in the nominative; the old line had altered endings.
    was=[("समदुःखसुखं स्वस्थं समलोष्टाश्मकाञ्चनम्।", False)],
))
_todo.append(_v(
    83, "Pañcatantra 1.392",
    "उद्योगिनं पुरुषसिंहमुपैति लक्ष्मीर्दैवेन देयमिति कापुरुषा वदन्ति। दैवं निहत्य कुरु पौरुषमात्मशक्त्या यत्ने कृते यदि न सिध्यति कोऽत्र दोषः॥",
    "udyoginaṃ puruṣasiṃhamupaiti lakṣmīrdaivena deyamiti kāpuruṣā vadanti. daivaṃ nihatya kuru pauruṣamātmaśaktyā yatne kṛte yadi na sidhyati ko'tra doṣaḥ..",
    [("उद्योगिनम्", "the man of effort", ["ACC.SG"]),
     ("पुरुषसिंहम्", "a lion among men", ["ACC.SG"]), ("उपैति", "comes to", ["PRES.3SG"]),
     ("लक्ष्मीः", "fortune", ["NOM.SG"]), ("दैवेन", "by fate", ["INSTR.SG"]),
     ("देयम्", "to be given", ["NOM.SG"]), ("इति", "thus", ["INDECL"]),
     ("कापुरुषाः", "cowards", ["NOM.PL"]), ("वदन्ति", "say", ["PRES.3PL"]),
     ("दैवम्", "fate", ["ACC.SG"]), ("निहत्य", "having struck down", ["INDECL"]),
     ("कुरु", "do", ["IMP.2SG"]), ("पौरुषम्", "manly effort", ["ACC.SG"]),
     ("आत्मशक्त्या", "with your own strength", ["INSTR.SG"]), ("यत्ने", "effort", ["LOC.SG"]),
     ("कृते", "when made", ["LOC.SG"]), ("यदि", "if", ["INDECL"]), ("न", "not", ["INDECL"]),
     ("सिध्यति", "it succeeds", ["PRES.3SG"]), ("कः", "what", ["NOM.SG"]),
     ("अत्र", "here", ["INDECL"]), ("दोषः", "fault", ["NOM.SG"])],
    was=[("व्यर्थं श्रमस्तु।", False)],
))
_todo.append(_v(
    84, "Bhagavad Gītā 6.31",
    "सर्वभूतस्थितं यो मां भजत्येकत्वमास्थितः।",
    "sarvabhūtasthitaṃ yo māṃ bhajatyekatvamāsthitaḥ.",
    [("सर्वभूतस्थितम्", "dwelling in all beings", ["ACC.SG"]), ("यः", "who", ["NOM.SG"]),
     ("माम्", "me", ["ACC.SG"]), ("भजति", "worships", ["PRES.3SG"]),
     ("एकत्वम्", "oneness", ["ACC.SG"]), ("आस्थितः", "resting in", ["NOM.SG"])],
))
_todo.append(_v(
    85, "Pañcatantra 2.57",
    "कोऽतिभारः समर्थानां किं दूरं व्यवसायिनाम्। को विदेशः सविद्यानां कः परः प्रियवादिनाम्॥",
    "ko'tibhāraḥ samarthānāṃ kiṃ dūraṃ vyavasāyinām. ko videśaḥ savidyānāṃ kaḥ paraḥ priyavādinām..",
    [("कः", "what", ["NOM.SG"]), ("अतिभारः", "too heavy a load", ["NOM.SG"]),
     ("समर्थानाम्", "for the able", ["GEN.PL"]), ("किम्", "what", ["NOM.SG"]),
     ("दूरम्", "far", ["NOM.SG"]), ("व्यवसायिनाम्", "for the resolute", ["GEN.PL"]),
     ("विदेशः", "a foreign land", ["NOM.SG"]), ("सविद्यानाम्", "for the learned", ["GEN.PL"]),
     ("परः", "a stranger", ["NOM.SG"]),
     ("प्रियवादिनाम्", "for those who speak kindly", ["GEN.PL"])],
    was=[("स्वदेशे न कृतं कार्यं।", False)],
))
_todo.append(_v(
    86, "Bhagavad Gītā 2.27",
    "जातस्य हि ध्रुवो मृत्युः।",
    "jātasya hi dhruvo mṛtyuḥ.",
    [("जातस्य", "of the born", ["GEN.SG"]), ("ध्रुवः", "certain", ["NOM.SG"]),
     ("मृत्युः", "death", ["NOM.SG"])],
))
_todo.append(_v(
    87, "Hitopadeśa 3.121",
    "यस्य नास्ति स्वयं प्रज्ञा शास्त्रं तस्य करोति किम्। लोचनाभ्यां विहीनस्य दर्पणः किं करिष्यति॥",
    "yasya nāsti svayaṃ prajñā śāstraṃ tasya karoti kim. locanābhyāṃ vihīnasya darpaṇaḥ kiṃ kariṣyati..",
    [("यस्य", "of whom", ["GEN.SG"]), ("न", "not", ["INDECL"]),
     ("अस्ति", "there is", ["PRES.3SG"]), ("स्वयम्", "of his own", ["INDECL"]),
     ("प्रज्ञा", "understanding", ["NOM.SG"]), ("शास्त्रम्", "book-learning", ["NOM.SG"]),
     ("तस्य", "for him", ["GEN.SG"]), ("करोति", "does", ["PRES.3SG"]),
     ("किम्", "what", ["ACC.SG"]), ("लोचनाभ्याम्", "of both eyes", ["INSTR.DU"]),
     ("विहीनस्य", "of one deprived", ["GEN.SG"]), ("दर्पणः", "a mirror", ["NOM.SG"]),
     ("करिष्यति", "will do", ["FUT.3SG"])],
    was=[("विद्या विवादाय विपद्।", False)],
))
_todo.append(_v(
    88, "Bhagavad Gītā 5.18",
    "विद्याविनयसंपन्ने ब्राह्मणे गवि हस्तिनि।",
    "vidyāvinayasaṃpanne brāhmaṇe gavi hastini.",
    [("विद्याविनयसंपन्ने", "endowed with learning and humility", ["LOC.SG"]),
     ("ब्राह्मणे", "in a brahmin", ["LOC.SG"]), ("गवि", "in a cow", ["LOC.SG"]),
     ("हस्तिनि", "in an elephant", ["LOC.SG"])],
))
_todo.append(_v(
    89, "Subhāṣita Ratna Bhāṇḍāgāra",
    "आचार्यात् पादमादत्ते।",
    "ācāryāt pādamādatte.",
    [("आचार्यात्", "from the teacher", ["ABL.SG"]), ("पादम्", "a quarter", ["ACC.SG"]),
     ("आदत्ते", "takes", ["PRES.3SG"])],
))
_todo.append(_v(
    90, "Bhagavad Gītā 9.22",
    "अनन्याश्चिन्तयन्तो मां ये जनाः पर्युपासते।",
    "ananyāścintayanto māṃ ye janāḥ paryupāsate.",
    [("अनन्याः", "without other thought", ["NOM.PL"]), ("चिन्तयन्तः", "meditating", ["PRS.PART"]),
     ("माम्", "me", ["ACC.SG"]), ("ये", "who", ["NOM.PL"]),
     ("जनाः", "people", ["NOM.PL"]), ("पर्युपासते", "worship", ["PRES.3PL"])],
))
_todo.append(_v(
    91, "Mokṣopāya 2.16.19",
    "सन्तोषः परमो लाभः।",
    "santoṣaḥ paramo lābhaḥ.",
    [("सन्तोषः", "contentment", ["NOM.SG"]), ("परमः", "highest", ["NOM.SG"]),
     ("लाभः", "gain", ["NOM.SG"])],
))
_todo.append(_v(
    92, "Pañcatantra 1.420",
    "उपदेशो हि मूर्खाणां प्रकोपाय न शान्तये। पयःपानं भुजङ्गानां केवलं विषवर्धनम्॥",
    "upadeśo hi mūrkhāṇāṃ prakopāya na śāntaye. payaḥpānaṃ bhujaṅgānāṃ kevalaṃ viṣavardhanam..",
    [("उपदेशः", "advice", ["NOM.SG"]), ("हि", "indeed", ["INDECL"]),
     ("मूर्खाणाम्", "to fools", ["GEN.PL"]), ("प्रकोपाय", "for anger", ["DAT.SG"]),
     ("न", "not", ["INDECL"]), ("शान्तये", "for calm", ["DAT.SG"]),
     ("पयःपानम्", "the drinking of milk", ["NOM.SG"]), ("भुजङ्गानाम्", "of snakes", ["GEN.PL"]),
     ("केवलम्", "only", ["INDECL"]), ("विषवर्धनम्", "an increase of venom", ["NOM.SG"])],
    was=[("एकः कर्ता।", False)],
))
_todo.append(_v(
    93, "Hitopadeśa, Prastāvikā 36",
    "उद्यमेन हि सिध्यन्ति कार्याणि न मनोरथैः।",
    "udyamena hi sidhyanti kāryāṇi na manorathaiḥ.",
    [("उद्यमेन", "by effort", ["INSTR.SG"]), ("सिध्यन्ति", "are accomplished", ["PRES.3PL"]),
     ("कार्याणि", "tasks", ["NOM.PL"]), ("न", "not", ["INDECL"]),
     ("मनोरथैः", "by wishing", ["INSTR.PL"])],
))
_todo.append(_v(
    94, "Bhagavad Gītā 15.16",
    "क्षरः सर्वाणि भूतानि।",
    "kṣaraḥ sarvāṇi bhūtāni.",
    [("क्षरः", "mutable", ["NOM.SG"]), ("सर्वाणि", "all", ["NOM.PL"]),
     ("भूतानि", "beings", ["NOM.PL"])],
))
_todo.append(_v(
    95, "Hitopadeśa 1.108",
    "यस्मिन् देशे न सम्मानो न वृत्तिर्न च बान्धवः। न च विद्यागमः कश्चित् तं देशं परिवर्जयेत्॥",
    "yasmin deśe na sammāno na vṛttirna ca bāndhavaḥ. na ca vidyāgamaḥ kaścit taṃ deśaṃ parivarjayet.",
    [("यस्मिन्", "in which", ["LOC.SG"]), ("देशे", "in a country", ["LOC.SG"]),
     ("न", "not", ["INDECL"]), ("सम्मानः", "respect", ["NOM.SG"]),
     ("वृत्तिः", "a livelihood", ["NOM.SG"]), ("बान्धवः", "a kinsman", ["NOM.SG"]),
     ("विद्यागमः", "the gaining of knowledge", ["NOM.SG"]), ("कश्चित्", "any", ["NOM.SG"]),
     ("तम्", "that", ["ACC.SG"]), ("देशम्", "country", ["ACC.SG"]),
     ("परिवर्जयेत्", "one should leave", ["OPT.3SG"])],
    # The old line was the first quarter with a wrong ending.
    was=[("यस्मिन् देशे न सम्मानं।", False)],
))
_todo.append(_v(
    96, "Manusmṛti 2.94",
    "न जातु कामः कामानामुपभोगेन शाम्यति। हविषा कृष्णवर्त्मेव भूय एवाभिवर्धते॥",
    "na jātu kāmaḥ kāmānāmupabhogena śāmyati. haviṣā kṛṣṇavartmeva bhūya evābhivardhate..",
    [("न", "not", ["INDECL"]), ("जातु", "ever", ["INDECL"]), ("कामः", "desire", ["NOM.SG"]),
     ("कामानाम्", "of the things desired", ["GEN.PL"]), ("उपभोगेन", "by enjoying", ["INSTR.SG"]),
     ("शाम्यति", "is quieted", ["PRES.3SG"]), ("हविषा", "by an offering of ghee", ["INSTR.SG"]),
     ("कृष्णवर्त्मा", "fire", ["NOM.SG"]), ("इव", "like", ["INDECL"]),
     ("भूयः", "more", ["INDECL"]), ("एव", "only", ["INDECL"]),
     ("अभिवर्धते", "it grows", ["PRES.3SG"])],
    was=[("न तृष्णया विना शान्तिः।", False)],
))
_todo.append(_v(
    97, "Manusmṛti 4.160",
    "सर्वं परवशं दुःखं सर्वमात्मवशं सुखम्। एतद्विद्यात्समासेन लक्षणं सुखदुःखयोः॥",
    "sarvaṃ paravaśaṃ duḥkhaṃ sarvamātmavaśaṃ sukham. etadvidyātsamāsena lakṣaṇaṃ sukhaduḥkhayoḥ..",
    [("सर्वम्", "everything", ["NOM.SG"]), ("परवशम्", "in another's power", ["NOM.SG"]),
     ("दुःखम्", "sorrow", ["NOM.SG"]), ("आत्मवशम्", "in one's own power", ["NOM.SG"]),
     ("सुखम्", "happiness", ["NOM.SG"]), ("एतत्", "this", ["ACC.SG"]),
     ("विद्यात्", "one should know", ["OPT.3SG"]), ("समासेन", "in brief", ["INSTR.SG"]),
     ("लक्षणम्", "the mark", ["ACC.SG"]), ("सुखदुःखयोः", "of happiness and sorrow", ["GEN.DU"])],
    was=[("सुखं त्वनिष्टम्।", False)],
))
_todo.append(_v(
    98, "Pañcatantra 1.237",
    "यस्य बुद्धिर्बलं तस्य निर्बुद्धेस्तु कुतो बलम्। वने सिंहो मदोन्मत्तः शशकेन निपातितः॥",
    "yasya buddhirbalaṃ tasya nirbuddhestu kuto balam. vane siṃho madonmattaḥ śaśakena nipātitaḥ..",
    [("यस्य", "who has", ["GEN.SG"]), ("बुद्धिः", "wit", ["NOM.SG"]),
     ("बलम्", "strength", ["NOM.SG"]), ("तस्य", "his", ["GEN.SG"]),
     ("निर्बुद्धेः", "of the witless", ["GEN.SG"]), ("तु", "but", ["INDECL"]),
     ("कुतः", "from where", ["INDECL"]), ("वने", "in the forest", ["LOC.SG"]),
     ("सिंहः", "a lion", ["NOM.SG"]), ("मदोन्मत्तः", "drunk with pride", ["NOM.SG"]),
     ("शशकेन", "by a hare", ["INSTR.SG"]), ("निपातितः", "was brought down", ["NOM.SG"])],
    was=[("अबुद्धिः किं न कारयेत्।", False)],
))
_todo.append(_v(
    99, "Subhāṣita Ratna Bhāṇḍāgāra",
    "विद्या मित्रं प्रवासेषु भार्या मित्रं गृहेषु च।",
    "vidyā mitraṃ pravāseṣu bhāryā mitraṃ gṛheṣu ca.",
    [("विद्या", "knowledge", ["NOM.SG"]), ("मित्रम्", "friend", ["NOM.SG"]),
     ("प्रवासेषु", "in travel", ["LOC.PL"]), ("भार्या", "wife", ["NOM.SG"]),
     ("गृहेषु", "in homes", ["LOC.PL"]), ("च", "and", ["INDECL"])],
))

_todo.append(_v(
    20, "Bhagavad Gītā 3.8",
    "नियतं कुरु कर्म त्वं कर्म ज्यायो ह्यकर्मणः। शरीरयात्रापि च ते न प्रसिध्येदकर्मणः॥",
    "niyataṃ kuru karma tvaṃ karma jyāyo hyakarmaṇaḥ. śarīrayātrāpi ca te na prasidhyedakarmaṇaḥ.",
    [("नियतम्", "prescribed", ["ACC.SG"]), ("कुरु", "do", ["IMP.2SG"]),
     ("कर्म", "action", ["ACC.SG"]), ("त्वम्", "you", ["NOM.SG"]),
     ("ज्यायः", "better", ["NOM.SG"]), ("अकर्मणः", "than inaction", ["ABL.SG"]),
     ("शरीरयात्रा", "maintenance of the body", ["NOM.SG"]),
     ("प्रसिध्येत्", "would succeed", ["OPT.3SG"]), ("अकर्मणः", "from inaction", ["ABL.SG"])],
))
_todo.append(_v(
    21, "Kaṭha Upaniṣad 1.3.3",
    "आत्मानं रथिनं विद्धि शरीरं रथमेव तु। बुद्धिं तु सारथिं विद्धि मनः प्रग्रहमेव च॥",
    "ātmānaṃ rathinaṃ viddhi śarīraṃ rathameva tu. buddhiṃ tu sārathiṃ viddhi manaḥ pragrahameva ca..",
    [("आत्मानम्", "the self", ["ACC.SG"]), ("रथिनम्", "the rider in the chariot", ["ACC.SG"]),
     ("विद्धि", "know", ["IMP.2SG"]), ("शरीरम्", "the body", ["ACC.SG"]),
     ("रथम्", "the chariot", ["ACC.SG"]), ("एव", "indeed", ["INDECL"]), ("तु", "and", ["INDECL"]),
     ("बुद्धिम्", "the intellect", ["ACC.SG"]), ("सारथिम्", "the charioteer", ["ACC.SG"]),
     ("मनः", "the mind", ["ACC.SG"]), ("प्रग्रहम्", "the reins", ["ACC.SG"]),
     ("च", "and", ["INDECL"])],
    was=[("मनो यदत्र विनियुक्तम्।", False)],
))
_todo.append(_v(
    22, "Nītiśataka 86",
    "आलस्यं हि मनुष्याणां शरीरस्थो महान् रिपुः।",
    "ālāsyaṃ hi manuṣyāṇāṃ śarīrastho mahān ripuḥ.",
    [("आलस्यम्", "laziness", ["NOM.SG"]), ("मनुष्याणाम्", "of men", ["GEN.PL"]),
     ("शरीरस्थः", "residing in the body", ["NOM.SG"]), ("महान्", "great", ["NOM.SG"]),
     ("रिपुः", "enemy", ["NOM.SG"])],
))
_todo.append(_v(
    23, "Hitopadeśa 1.73",
    "आपत्सु मित्रं जानीयाद्रणे शूरमृणे शुचिम्। भार्यां क्षीणेषु वित्तेषु व्यसनेषु च बान्धवान्॥",
    "āpatsu mitraṃ jānīyādraṇe śūramṛṇe śucim. bhāryāṃ kṣīṇeṣu vitteṣu vyasaneṣu ca bāndhavān..",
    [("आपत्सु", "in hard times", ["LOC.PL"]), ("मित्रम्", "a friend", ["ACC.SG"]),
     ("जानीयात्", "one should know", ["OPT.3SG"]), ("रणे", "in battle", ["LOC.SG"]),
     ("शूरम्", "a brave man", ["ACC.SG"]), ("ऋणे", "in debt", ["LOC.SG"]),
     ("शुचिम्", "an honest man", ["ACC.SG"]), ("भार्याम्", "a wife", ["ACC.SG"]),
     ("क्षीणेषु", "when gone", ["LOC.PL"]), ("वित्तेषु", "riches", ["LOC.PL"]),
     ("व्यसनेषु", "in misfortunes", ["LOC.PL"]), ("च", "and", ["INDECL"]),
     ("बान्धवान्", "kinsmen", ["ACC.PL"])],
    was=[("परीक्ष्य च गुणान्यस्य मित्रं कुर्वीत।", False)],
))
_todo.append(_v(
    24, "Bhagavad Gītā 2.48",
    "सिद्ध्यसिद्ध्योः समो भूत्वा।",
    "siddhyasiddhyoḥ samo bhūtvā.",
    [("सिद्ध्यसिद्ध्योः", "in success and failure", ["LOC.DU"]),
     ("समः", "equal", ["NOM.SG"]), ("भूत्वा", "having become", ["INDECL"])],
))
_todo.append(_v(
    25, "Mahābhārata 3.2.15",
    "शोकस्थानसहस्राणि भयस्थानशतानि च। दिवसे दिवसे मूढमाविशन्ति न पण्डितम्॥",
    "śokasthānasahasrāṇi bhayasthānaśatāni ca. divase divase mūḍhamāviśanti na paṇḍitam..",
    [("शोकस्थानसहस्राणि", "a thousand occasions for grief", ["NOM.PL"]),
     ("भयस्थानशतानि", "a hundred occasions for fear", ["NOM.PL"]), ("च", "and", ["INDECL"]),
     ("दिवसे दिवसे", "day after day", ["LOC.SG"]), ("मूढम्", "the fool", ["ACC.SG"]),
     ("आविशन्ति", "take hold of", ["PRES.3PL"]), ("न", "not", ["INDECL"]),
     ("पण्डितम्", "the wise man", ["ACC.SG"])],
    was=[("यदा यदा हि मूढस्य।", False)],
))
_todo.append(_v(
    26, "Manusmṛti 2.121",
    "अभिवादनशीलस्य नित्यं वृद्धोपसेविनः। चत्वारि तस्य वर्धन्ते आयुर्धर्मो यशो बलम्॥",
    "abhivādanaśīlasya nityaṃ vṛddhopasevinaḥ. catvāri tasya vardhante āyurdharmo yaśo balam..",
    [("अभिवादनशीलस्य", "of one whose habit is to greet with respect", ["GEN.SG"]),
     ("नित्यम्", "always", ["INDECL"]),
     ("वृद्धोपसेविनः", "of one who serves the elders", ["GEN.SG"]),
     ("चत्वारि", "four things", ["NOM.PL"]), ("तस्य", "of him", ["GEN.SG"]),
     ("वर्धन्ते", "grow", ["PRES.3PL"]), ("आयुः", "length of life", ["NOM.SG"]),
     ("धर्मः", "merit", ["NOM.SG"]), ("यशः", "fame", ["NOM.SG"]),
     ("बलम्", "strength", ["NOM.SG"])],
    was=[("जन्मान्तरसहस्रेषु पुण्यात्।", False)],
))
_todo.append(_v(
    27, "Pañcatantra 2.58",
    "विद्वत्त्वं च नृपत्वं च नैव तुल्यं कदाचन। स्वदेशे पूज्यते राजा विद्वान् सर्वत्र पूज्यते॥",
    "vidvattvaṃ ca nṛpatvaṃ ca naiva tulyaṃ kadācana. svadeśe pūjyate rājā vidvān sarvatra pūjyate..",
    [("विद्वत्त्वम्", "being learned", ["NOM.SG"]), ("च", "and", ["INDECL"]),
     ("नृपत्वम्", "being a king", ["NOM.SG"]), ("न", "not", ["INDECL"]),
     ("एव", "at all", ["INDECL"]), ("तुल्यम्", "equal", ["NOM.SG"]),
     ("कदाचन", "ever", ["INDECL"]), ("स्वदेशे", "in his own country", ["LOC.SG"]),
     ("पूज्यते", "is honoured", ["PRES.3SG"]), ("राजा", "a king", ["NOM.SG"]),
     ("विद्वान्", "a learned man", ["NOM.SG"]), ("सर्वत्र", "everywhere", ["INDECL"])],
    was=[("स्वदेशमनुरज्यन्ते।", False)],
))
_todo.append(_v(
    28, "Mahābhārata 12.316.6",
    "नास्ति विद्यासमं चक्षुर्नास्ति विद्यासमं तपः। नास्ति रागसमं दुःखं नास्ति त्यागसमं सुखम्॥",
    "nāsti vidyāsamaṃ cakṣurnāsti vidyāsamaṃ tapaḥ. nāsti rāgasamaṃ duḥkhaṃ nāsti tyāgasamaṃ sukham..",
    [("न", "not", ["INDECL"]), ("अस्ति", "there is", ["PRES.3SG"]),
     ("विद्यासमम्", "equal to knowledge", ["NOM.SG"]), ("चक्षुः", "an eye", ["NOM.SG"]),
     ("तपः", "austerity", ["NOM.SG"]), ("रागसमम्", "equal to attachment", ["NOM.SG"]),
     ("दुःखम्", "sorrow", ["NOM.SG"]), ("त्यागसमम्", "equal to letting go", ["NOM.SG"]),
     ("सुखम्", "happiness", ["NOM.SG"])],
    was=[("विद्या परा सत्यधर्मे।", False)],
))
_todo.append(_v(
    29, "Bhagavad Gītā 18.66",
    "सर्वधर्मान्परित्यज्य मामेकं शरणं व्रज।",
    "sarvadharmānparityajya māmekaṃ śaraṇaṃ vraja.",
    [("सर्वधर्मान्", "all dharmas", ["ACC.PL"]), ("परित्यज्य", "having relinquished", ["INDECL"]),
     ("माम्", "to me", ["ACC.SG"]), ("एकम्", "alone", ["ACC.SG"]),
     ("शरणम्", "for refuge", ["ACC.SG"]), ("व्रज", "go", ["IMP.2SG"])],
))

SEED_SLOKAS = list(_todo)
assert len(SEED_SLOKAS) >= 90, f"expected >=90 shlokas, got {len(SEED_SLOKAS)}"
# day_offset values must be distinct (each date maps to exactly one verse).
assert len({s["day_offset"] for s in SEED_SLOKAS}) == len(SEED_SLOKAS)
# A text a day used to carry must not be any day's text now: the correction
# step removes what was stored under a retired text.
_texts = {s["devanagari"] for s in SEED_SLOKAS}
assert not [old for s in SEED_SLOKAS for (old, _same) in s["was"] if old in _texts]