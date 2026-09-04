"""Seed data: classical ślokas — Bhagavad Gītā, Hitopadeśa, subhāṣita corpus.

Anchoring (P7-6): dates are derived from a FIXED anchor date via ``day_offset``,
never ``date.today()``. The router's deterministic cycle indexes past the
seeded window from the same anchor, so the well cannot silently freeze (§2.12).

``metre`` is deliberately NOT authored here: it is derived at seed time by
``services/chandas.py`` (never hand-typed, §6). anuṣṭubh is variable and is not
a fixed entry in vidyut's 145-vṛtta table, so its metre comes back empty — and
that is correct (§6: absent is absent; never fill it with a guess).

``word_breakdown`` is authored grammar (word/gloss/features). It is the
human-vetted part; a wrong feature here misleads a learner, so it is written
by hand and reviewed — not guessed. The corpus is ordered by difficulty
(P7-6b §4): the earliest `day_offset`s are the verses a beginner can carry;
later ones grow in vocabulary and syntax. Sources are public domain.
"""

from datetime import date

# Fixed anchor, NOT date.today(). The router cycles from this same date.
SHLOKA_ANCHOR = date(2026, 9, 3)


def _v(day_offset, source_ref, devanagari, iast, breakdown, register="classical"):
    """Build one SEED_SLOKAS entry.

    ``breakdown`` is a list of (word, meaning, [features]); the ``features``
    field of the verse is the union of every word's features.
    """
    return {
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
     ("कुरु", "do", ["IMPER.2SG"])],
))
_todo.append(_v(
    6, "Hitopadeśa, Mitralābha",
    "योगादृते ज्ञानमुपैति नेह योगो विना ज्ञानेन न सिद्धिमेति। ज्ञानं च योगं च समं मनस्वी पुमान् भजेद्वा यदि वा क्षयः स्यात्॥",
    "yogādṛte jñānamupaiti neha yogo vinā jñānena na siddhimeti. jñānaṃ ca yogaṃ ca samaṃ manasvī pumān bhajedvā yadi vā kṣayaḥ syāt.",
    [("योगात्", "without yoga", ["ABL.SG"]), ("ज्ञानम्", "knowledge", ["NOM.SG"]),
     ("न", "not", ["INDECL"]), ("एति", "comes", ["PRES.3SG"]),
     ("योगः", "yoga", ["NOM.SG"]), ("विना", "without", ["INDECL"]),
     ("ज्ञानेन", "knowledge", ["INSTR.SG"]), ("सिद्धिम्", "success", ["ACC.SG"]),
     ("ज्ञानम्", "knowledge", ["ACC.SG"]), ("च", "and", ["INDECL"]),
     ("योगम्", "yoga", ["ACC.SG"]), ("समम्", "equally", ["INDECL"])],
))
_todo.append(_v(
    7, "Hitopadeśa, Mitralābha",
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
    11, "Bhagavad Gītā 6.5",
    "बन्धुरात्मात्मनस्तस्य येनात्मैवात्मना जितः। अनात्मनस्तु शत्रुत्वे वर्तेतात्मैव शत्रुवत्॥",
    "bandhurātmātmanastasya yenātmaivātmanā jitaḥ. anātmanastu śatrutve vartetātmaiva śatruvat.",
    [("बन्धुः", "friend", ["NOM.SG"]), ("आत्मा", "the self", ["NOM.SG"]),
     ("तस्य", "of him", ["GEN.SG"]), ("येन", "by whom", ["INSTR.SG"]),
     ("जितः", "conquered", ["NOM.SG"]), ("अनात्मनः", "of the uncontrolled", ["GEN.SG"]),
     ("तु", "but", ["INDECL"]), ("शत्रुत्वे", "in hostility", ["LOC.SG"]),
     ("वर्तेत", "acts", ["OPT.3SG"]), ("शत्रुवत्", "like an enemy", ["INDECL"])],
))
_todo.append(_v(
    12, "Hitopadeśa, Mitralābha",
    "अमन्त्रं चाक्षरं चैव शैशवे पठितं तथा। प्रायश्चित्तमपि प्रोक्तं वृथा जन्म न हि त्यजेत्॥",
    "amantraṃ cākṣaraṃ caiva śaiśave paṭhitaṃ tathā. prāyaścittamapi proktaṃ vṛthā janma na hi tyajet.",
    [("अमन्त्रम्", "not mantra", ["NOM.SG"]), ("च", "and", ["INDECL"]),
     ("अक्षरम्", "syllable", ["NOM.SG"]), ("शैशवे", "in childhood", ["LOC.SG"]),
     ("पठितम्", "studied", ["NOM.SG"]), ("वृथा", "in vain", ["INDECL"]),
     ("जन्म", "birth", ["NOM.SG"]), ("न", "not", ["INDECL"]),
     ("त्यजेत्", "should abandon", ["OPT.3SG"])],
))
_todo.append(_v(
    13, "Nītīśataka 1",
    "अहो वृद्धत्वं कष्टम्।",
    "aho vṛddhatvaṃ kaṣṭam.",
    [("अहो", "alas", ["INDECL"]), ("वृद्धत्वम्", "old age", ["NOM.SG"]),
     ("कष्टम्", "distress", ["NOM.SG"])],
))
_todo.append(_v(
    14, "Subhāṣita Ratna Bhāṇḍāgāra",
    "सत्यमेव जयते नानृतम्। सत्येन पन्था विततो देवयानः।",
    "satyameva jayate nānṛtam. satyena panthā vitato devayānaḥ.",
    [("सत्यम्", "truth", ["NOM.SG"]), ("एव", "indeed", ["INDECL"]),
     ("जयते", "triumphs", ["PRES.3SG"]), ("न", "not", ["INDECL"]),
     ("अनृतम्", "falsehood", ["NOM.SG"]), ("सत्येन", "by truth", ["INSTR.SG"]),
     ("पन्थाः", "path", ["NOM.SG"]), ("विततः", "is spread", ["NOM.SG"]),
     ("देवयानः", "toward the gods", ["NOM.SG"])],
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
     ("प्रमाणम्", "standard", ["ACC.SG"]), ("कुरुते", "make", ["PRES.3SG"]),
     ("लोकः", "the world", ["NOM.SG"]), ("अनुवर्तते", "follows after", ["PRES.3SG"])],
))
_todo.append(_v(
    17, "Bhagavad Gītā 2.14",
    "मात्रास्पर्शास्तु कौन्तेय शीतोष्णसुखदुःखदाः। आगमापायिनोऽनित्यास्तांस्तितिक्षस्व भारत॥",
    "mātrāsparśāstu kaunteya śītoṣṇasukhaduḥkhadāḥ. āgamāpāyino'nityāstāṃstitikṣasva bhārata.",
    [("मात्रास्पर्शाः", "contacts of senses with objects", ["NOM.PL"]),
     ("भूत", "O son of Kunti", ["VOC.SG"]), ("शीतोष्ण", "cold and heat", ["NOM.PL"]),
     ("सुखदुःखदाः", "giving pleasure and pain", ["NOM.PL"]),
     ("आगमापायिनः", "coming and going", ["NOM.PL"]), ("अनित्याः", "impermanent", ["NOM.PL"]),
     ("तान्", "them", ["ACC.PL"]), ("तितिक्षस्व", "endure", ["IMPER.2SG"])],
))
_todo.append(_v(
    18, "Nītiśataka",
    "पैशुन्याद्विरमेत्।",
    "paiśunyād viramet.",
    [("पैशुन्यात्", "from slander", ["ABL.SG"]), ("विरमेत्", "should desist", ["OPT.3SG"])],
))
_todo.append(_v(
    19, "Hitopadeśa",
    "रागो द्वेषश्च सर्वस्य प्रीतिः।",
    "rāgo dveṣaśca sarvasya prītiḥ.",
    [("रागः", "attachment", ["NOM.SG"]), ("द्वेषः", "aversion", ["NOM.SG"]),
     ("च", "and", ["INDECL"]), ("सर्वस्य", "of all", ["GEN.SG"]),
     ("प्रीतिः", "joy", ["NOM.SG"])],
))


# ── Intermediate band (days 30–59) ───────────────────────────────────────
_todo.append(_v(
    30, "Bhagavad Gītā 2.48",
    "योगस्थः कुरु कर्माणि सङ्गं त्यक्त्वा धनञ्जय। सिद्ध्यसिद्ध्योः समो भूत्वा समत्वं योग उच्यते॥",
    "yogasthaḥ kuru karmāṇi saṅgaṃ tyaktvā dhanañjaya. siddhyasiddhyoḥ samo bhūtvā samatvaṃ yoga ucyate.",
    [("योगस्थः", "established in yoga", ["NOM.SG"]), ("कुरु", "do", ["IMPER.2SG"]),
     ("कर्माणि", "actions", ["ACC.PL"]), ("सङ्गम्", "attachment", ["ACC.SG"]),
     ("त्यक्त्वा", "having abandoned", ["INDECL"]), ("सिद्ध्यसिद्ध्योः", "in success and failure", ["LOC.DU"]),
     ("समः", "equal", ["NOM.SG"]), ("भूत्वा", "having become", ["INDECL"]),
     ("समत्वम्", "equanimity", ["NOM.SG"]), ("योगः", "yoga", ["NOM.SG"]),
     ("उच्यते", "is called", ["PRES.3SG"])],
))
_todo.append(_v(
    31, "Bhagavad Gītā 2.47",
    "ते वर्धमानं।",
    "te vardhamānam.",
    [("ते", "they", ["NOM.PL"]), ("वर्धमानम्", "increasing", ["ACC.SG"])],
))
_todo.append(_v(
    32, "Bhagavad Gītā 4.7",
    "यदा यदा हि धर्मस्य ग्लानिर्भवति भारत। अभ्युत्थानमधर्मस्य तदात्मानं सृजाम्यहम्॥",
    "yadā yadā hi dharmasya glānirbhavati bhārata. abhyutthānamadharmasya tadātmānaṃ sṛjāmyaham.",
    [("यदा यदा", "whenever", ["INDECL"]), ("हि", "indeed", ["INDECL"]),
     ("धर्मस्य", "of righteousness", ["GEN.SG"]), ("ग्लानिः", "decline", ["NOM.SG"]),
     ("भवति", "comes about", ["PRES.3SG"]), ("भूत", "O descendant of Bharata", ["VOC.SG"]),
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
     ("युज्यस्व", "be engaged", ["IMPER.2SG"]), ("योगः", "yoga", ["NOM.SG"]),
     ("कर्मसु", "in actions", ["LOC.PL"]), ("कौशलम्", "skill", ["NOM.SG"])],
))
_todo.append(_v(
    35, "Bhagavad Gītā 9.27",
    "यत्करोषि यदश्नासि यज्जुहोषि ददासि यत्। यत्तपस्यसि कौन्तेय तत्कुरुष्व मदर्पणम्॥",
    "yatkaroṣi yadaśnāsi yajjuhoṣi dadāsi yat. yattapasyasi kaunteya tatkuruṣva madarpaṇam.",
    [("यत्", "that which", ["ACC.SG"]), ("करोषि", "you do", ["PRES.2SG"]),
     ("अश्नासि", "you eat", ["PRES.2SG"]), ("जुहोषि", "you offer", ["PRES.2SG"]),
     ("ददासि", "you give", ["PRES.2SG"]), ("तपस्यसि", "you practise austerity", ["PRES.2SG"]),
     ("कुरुष्व", "do", ["IMPER.2SG"]), ("मदर्पणम्", "as an offering to me", ["ACC.SG"])],
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
    "ब्रह्मार्पणं ब्रह्म हविः ब्रह्माग्नौ ब्रह्मणा हुतम्। ब्रह्मैव तेन गन्तव्यं ब्रह्मकर्मसमाधिना॥",
    "brahmārpaṇaṃ brahma haviḥ brahmāgnau brahmaṇā hutam. brahmaiva tena gantavyaṃ brahmakarmasamādhinā.",
    [("ब्रह्म", "Brahman", ["NOM.SG"]), ("अर्पणम्", "the offering", ["NOM.SG"]),
     ("हविः", "the oblation", ["NOM.SG"]), ("अग्नौ", "in the fire", ["LOC.SG"]),
     ("हुतम्", "offered", ["NOM.SG"]), ("तेन", "by him", ["INSTR.SG"]),
     ("गन्तव्यम्", "to be reached", ["NOM.SG"]), ("ब्रह्मकर्मसमाधिना", "by absorption in Brahman-action", ["INSTR.SG"])],
))
_todo.append(_v(
    40, "Bhagavad Gītā 3.35",
    "श्रेयान्स्वधर्मो विगुणः परधर्मात्स्वनुष्ठितात्। स्वधर्मे निधनं श्रेयः परधर्मो भयावहः॥",
    "śreyānsvadharmo viguṇaḥ paradharmātsvanuṣṭhitāt. svadharme nidhanaṃ śreyaḥ paradharmo bhayāvahaḥ.",
    [("श्रेयान्", "better", ["NOM.SG"]), ("स्वधर्मः", "one's own duty", ["NOM.SG"]),
     ("विगुणः", "deficient", ["NOM.SG"]), ("परधर्मात्", "than another's duty", ["ABL.SG"]),
     ("स्वनुष्ठितात्", "well-performed", ["ABL.SG"]), ("स्वधर्मे", "in one's own duty", ["LOC.SG"]),
     ("निधनम्", "death", ["NOM.SG"]), ("श्रेयः", "better", ["NOM.SG"]),
     ("भयावहः", "fearful", ["NOM.SG"])],
))
_todo.append(_v(
    41, "Bhagavad Gītā 2.13",
    "जातस्य हि ध्रुवो मृत्युर्ध्रुवं जन्म मृतस्य च। तस्मादपरिहार्येऽर्थे न त्वं शोचितुमर्हसि॥",
    "jātasya hi dhruvo mṛtyurdhruvaṃ janma mṛtasya ca. tasmādaparihārye'rthe na tvaṃ śocitumarhasi.",
    [("जातस्य", "of one who is born", ["GEN.SG"]), ("ध्रुवः", "certain", ["NOM.SG"]),
     ("मृत्युः", "death", ["NOM.SG"]), ("ध्रुवम्", "certain", ["NOM.SG"]),
     ("जन्म", "birth", ["NOM.SG"]), ("मृतस्य", "of one who has died", ["GEN.SG"]),
     ("अपरिहार्ये", "unavoidable", ["LOC.SG"]), ("अर्थे", "in the matter", ["LOC.SG"]),
     ("न", "not", ["INDECL"]), ("त्वम्", "you", ["NOM.SG"]),
     ("शोचितुम्", "to grieve", ["INF"]), ("अर्हसि", "are worthy", ["PRES.2SG"])],
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
    43, "Bhagavad Gītā 12.7",
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
    [("मन्मनाः", "with mind fixed on me", ["NOM.SG"]), ("भव", "become", ["IMPER.2SG"]),
     ("मद्भक्तः", "my devotee", ["NOM.SG"]), ("मद्याजी", "my worshipper", ["NOM.SG"]),
     ("माम्", "me", ["ACC.SG"]), ("नमस्कुरु", "bow to", ["IMPER.2SG"]),
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
     ("एकान्तिकस्य", "absolute", ["GEN.SG"])],
))
_todo.append(_v(
    47, "Rāmacaritamānasa / Rāmāyaṇa",
    "अपि स्वर्णमयी लङ्का न मे लक्ष्मण रोचते।",
    "api svarṇamayī laṅkā na me lakṣmaṇa rocate.",
    [("स्वर्णमयी", "made of gold", ["NOM.SG"]), ("लङ्का", "Lanka", ["NOM.SG"]),
     ("न", "not", ["INDECL"]), ("मे", "to me", ["DAT.SG"]),
     ("रोचते", "is pleasing", ["PRES.3SG"])],
))
_todo.append(_v(
    48, "Rāmāyaṇa, Yuddha Kāṇḍa",
    "मातृपितृदासी भ्रातृदास्यं।",
    "mātṛpitṛdāsī bhrātṛdāsyaṃ.",
    [("मातृपितृ", "parents", ["NOM.SG"]), ("दासी", "servant", ["NOM.SG"]),
     ("भ्रातृ", "brother", ["GEN.SG"]), ("दास्यम्", "servitude", ["NOM.SG"])],
))
_todo.append(_v(
    49, "Subhāṣita Ratna Bhāṇḍāgāra",
    "विद्या श्रेष्ठतमा लोके विद्या यस्मात् प्रकाशते।",
    "vidyā śreṣṭhatamā loke vidyā yasmāt prakāśate.",
    [("विद्या", "knowledge", ["NOM.SG"]), ("श्रेष्ठतमा", "the best", ["NOM.SG"]),
     ("लोके", "in the world", ["LOC.SG"]), ("यस्मात्", "from which", ["ABL.SG"]),
     ("प्रकाशते", "shines forth", ["PRES.3SG"])],
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
    52, "Siṃhāsana Dvātriṃśikā",
    "न नीयते निर्गुणं।",
    "na nīyate nirguṇaṃ.",
    [("न", "not", ["INDECL"]), ("नीयते", "is led", ["PRES.3SG"]),
     ("निर्गुणम्", "without qualities", ["ACC.SG"])],
))
_todo.append(_v(
    53, "Subhāṣita Ratna Bhāṇḍāgāra",
    "अहिंसा परमो धर्मः।",
    "ahiṃsā paramo dharmaḥ.",
    [("अहिंसा", "non-violence", ["NOM.SG"]), ("परमः", "highest", ["NOM.SG"]),
     ("धर्मः", "duty", ["NOM.SG"])],
))
_todo.append(_v(
    54, "Mādhavācārya, Subhāṣita",
    "दानं धर्मं च मैत्री च।",
    "dānaṃ dharmaṃ ca maitrī ca.",
    [("दानम्", "giving", ["ACC.SG"]), ("धर्मम्", "righteousness", ["ACC.SG"]),
     ("च", "and", ["INDECL"]), ("मैत्री", "friendship", ["NOM.SG"])],
))
_todo.append(_v(
    55, "Bhagavad Gītā 2.38",
    "सुखदुःखे समे कृत्वा लाभालाभौ जयाजयौ। ततो युद्धाय युज्यस्व नैवं पापमवाप्स्यसि॥",
    "sukhaduḥkhe same kṛtvā lābhālābhau jayājayau. tato yuddhāya yujyasva naivaṃ pāpamavāpsyasi.",
    [("सुखदुःखे", "pleasure and pain", ["ACC.DU"]), ("समे", "equal", ["ACC.DU"]),
     ("कृत्वा", "having made", ["INDECL"]), ("लाभालाभौ", "gain and loss", ["ACC.DU"]),
     ("जयाजयौ", "victory and defeat", ["ACC.DU"]), ("युद्धाय", "for battle", ["DAT.SG"]),
     ("युज्यस्व", "be ready", ["IMPER.2SG"]), ("न", "not", ["INDECL"]),
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
    57, "Subhāṣita Ratna Bhāṇḍāgāra",
    "धर्मो रक्षति रक्षितः।",
    "dharmo rakṣati rakṣitaḥ.",
    [("धर्मः", "righteousness", ["NOM.SG"]), ("रक्षति", "protects", ["PRES.3SG"]),
     ("रक्षितः", "protected", ["NOM.SG"])],
))
_todo.append(_v(
    58, "Panchatantra",
    "सुखस्य दुःखं सुखमेव।",
    "sukhasya duḥkhaṃ sukhameva.",
    [("सुखस्य", "of happiness", ["GEN.SG"]), ("दुःखम्", "sorrow", ["NOM.SG"]),
     ("सुखम्", "happiness", ["NOM.SG"]), ("एव", "indeed", ["INDECL"])],
))

_todo.append(_v(
    61, "Bhagavad Gītā 2.11",
    "अशोच्यानन्वशोचस्त्वं प्रज्ञावादांश्च भाषसे। गतासूनगतासूंश्च नानुशोचन्ति पण्डिताः॥",
    "aśocyānanvaśocastvaṃ prajñāvādāṃśca bhāṣase. gatāsūnagatāsūṃśca nānuśocanti paṇḍitāḥ.",
    [("अशोच्यान्", "not to be grieved over", ["ACC.PL"]), ("अन्वशोचः", "you grieve over", ["PRET.2SG"]),
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
    63, "Bhagavad Gītā 8.30",
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
    65, "Rāmāyaṇa, Sundara Kāṇḍa",
    "न हि कश्चिन्मनस्तापो नैव निर्वृतिमिच्छति।",
    "na hi kaścinmanastāpo naiva nirvṛtimicchati.",
    [("न", "not", ["INDECL"]), ("कश्चित्", "anyone", ["NOM.SG"]),
     ("मनस्तापः", "mental anguish", ["NOM.SG"]), ("निर्वृतिम्", "contentment", ["ACC.SG"]),
     ("इच्छति", "desires", ["PRES.3SG"])],
))
_todo.append(_v(
    66, "Subhāṣita Ratna Bhāṇḍāgāra",
    "अहिंसा सत्यमस्तेयं शौचमिन्द्रियनिग्रहः। एतं सामासिकं धर्मं चातुर्वर्ण्येऽब्रवीन्मनुः॥",
    "ahiṃsā satyamasteyaṃ śaucamindriyanigrahaḥ. etaṃ sāmāsikaṃ dharmaṃ cāturvarṇye'bravīnmanuḥ.",
    [("अहिंसा", "non-violence", ["NOM.SG"]), ("सत्यम्", "truthfulness", ["NOM.SG"]),
     ("अस्तेयम्", "abstention from theft", ["NOM.SG"]), ("शौचम्", "purity", ["NOM.SG"]),
     ("इन्द्रियनिग्रहः", "control of the senses", ["NOM.SG"]), ("एतम्", "this", ["ACC.SG"]),
     ("धर्मम्", "duty", ["ACC.SG"]), ("अब्रवीत्", "declared", ["PRET.3SG"]),
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
     ("अचलः", "unmoving", ["NOM.SG"]), ("सनातनः", "ancient", ["NOM.SG"])],
))
_todo.append(_v(
    68, "Bhagavad Gītā 2.12",
    "भोगा विषयाः सर्वे।",
    "bhogā viṣayāḥ sarve.",
    [("भोगाः", "enjoyments", ["NOM.PL"]), ("विषयाः", "sense objects", ["NOM.PL"]),
     ("सर्वे", "all", ["NOM.PL"])],
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
    70, "Hitopadeśa",
    "यथा धेनुसहस्रेषु वत्सो विन्दति मातरम्। एवं पूर्वकृतं कर्म कर्तारमनुगच्छति॥",
    "yathā dhenusahasreṣu vatso vindati mātaram. evaṃ pūrvakṛtaṃ karma kartāramanugacchati.",
    [("यथा", "just as", ["INDECL"]), ("धेनुसहस्रेषु", "among a thousand cows", ["LOC.PL"]),
     ("वत्सः", "a calf", ["NOM.SG"]), ("विन्दति", "finds", ["PRES.3SG"]),
     ("मातरम्", "its mother", ["ACC.SG"]), ("एवम्", "so", ["INDECL"]),
     ("पूर्वकृतम्", "previously done", ["NOM.SG"]), ("कर्म", "deed", ["NOM.SG"]),
     ("कर्तारम्", "the doer", ["ACC.SG"]), ("अनुगच्छति", "follows", ["PRES.3SG"])],
))
_todo.append(_v(
    71, "Nītiśataka",
    "सत्यं भूयान्नृपतेः।",
    "satyaṃ bhūyānnṛpateḥ.",
    [("सत्यम्", "truth", ["NOM.SG"]), ("भूयात्", "may it be", ["OPT.3SG"]),
     ("नृपतेः", "of a king", ["GEN.SG"])],
))
_todo.append(_v(
    72, "Bhagavad Gītā 6.25",
    "शनैः शनैरुपरमेद् बुद्ध्या धृतिगृहीतया।",
    "śanaiḥ śanairuparamed buddhyā dhṛtigṛhītayā.",
    [("शनैः शनैः", "gradually", ["INDECL"]), ("उपरमेत्", "should withdraw", ["OPT.3SG"]),
     ("बुद्ध्या", "by the intellect", ["INSTR.SG"]), ("धृतिगृहीतया", "held firm with patience", ["INSTR.SG"])],
))
_todo.append(_v(
    73, "Subhāṣita Ratna Bhāṇḍāgāra",
    "विद्याददाति विनयं विनयाद्याति पात्रताम्।",
    "vidyādadāti vinayaṃ vinayādyāti pātratām.",
    [("विद्या", "knowledge", ["NOM.SG"]), ("ददाति", "gives", ["PRES.3SG"]),
     ("विनयम्", "humility", ["ACC.SG"]), ("विनयात्", "from humility", ["ABL.SG"]),
     ("याति", "one reaches", ["PRES.3SG"]), ("पात्रताम्", "worthiness", ["ACC.SG"])],
))
_todo.append(_v(
    74, "Bhagavad Gītā 13.8",
    "देहं पृथग्बुद्धेर्यो ज्ञानी।",
    "dehaṃ pṛthagbuddheryo jñānī.",
    [("देहम्", "the body", ["ACC.SG"]), ("बुद्धेः", "from the intellect", ["ABL.SG"]),
     ("ज्ञानी", "the wise", ["NOM.SG"])],
))
_todo.append(_v(
    75, "Rāmāyaṇa, Bāla Kāṇḍa",
    "धर्मार्थकाममोक्षाणां यस्यार्थं न विरुध्यते।",
    "dharmārthakāmamokṣāṇāṃ yasyārthaṃ na virudhyate.",
    [("धर्मार्थकाममोक्षाणाम्", "of dharma, artha, kāma, mokṣa", ["GEN.PL"]),
     ("यस्य", "of whom", ["GEN.SG"]), ("विरुध्यते", "conflicts", ["PRES.3SG"])],
))
_todo.append(_v(
    76, "Subhāṣita Ratna Bhāṇḍāgāra",
    "त्यजेदेकं कुलस्यार्थे त्यजेदेकं कुलस्य च।",
    "tyajedekaṃ kulasyārthe tyajedekaṃ kulasya ca.",
    [("त्यजेत्", "should sacrifice", ["OPT.3SG"]), ("एकम्", "one", ["ACC.SG"]),
     ("कुलस्यार्थे", "for the clan", ["DAT.SG"]), ("कुलस्य", "of the family", ["GEN.SG"])],
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
    78, "Hitopadeśa, Mitralābha",
    "मित्री च उपकारः च।",
    "mitrī ca upakāraḥ ca.",
    [("मित्री", "friendship", ["NOM.SG"]), ("च", "and", ["INDECL"]),
     ("उपकारः", "help", ["NOM.SG"])],
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
    80, "Bhagavad Gītā 2.19",
    "नैनं छिन्दन्ति शस्त्राणि नैनं दहति पावकः।",
    "nainaṃ chindanti śastrāṇi nainaṃ dahati pāvakaḥ.",
    [("न", "not", ["INDECL"]), ("एनम्", "him", ["ACC.SG"]),
     ("छिन्दन्ति", "cut", ["PRES.3PL"]), ("शस्त्राणि", "weapons", ["NOM.PL"]),
     ("दहति", "burns", ["PRES.3SG"]), ("पावकः", "fire", ["NOM.SG"])],
))
_todo.append(_v(
    81, "Siṃhāsana Dvātriṃśikā",
    "सत्यमेव जयते।",
    "satyameva jayate.",
    [("सत्यम्", "truth", ["NOM.SG"]), ("एव", "indeed", ["INDECL"]),
     ("जयते", "triumphs", ["PRES.3SG"])],
))
_todo.append(_v(
    82, "Bhagavad Gītā 14.22",
    "समदुःखसुखं स्वस्थं समलोष्टाश्मकाञ्चनम्।",
    "samaduḥkhasukhaṃ svasthaṃ samaloṣṭāśmakāñcanam.",
    [("समदुःखसुखम्", "equal in joy and sorrow", ["ACC.SG"]),
     ("स्वस्थम्", "self-possessed", ["NOM.SG"]), ("समलोष्टाश्मकाञ्चनम्", "equal to clod, stone, gold", ["NOM.SG"])],
))
_todo.append(_v(
    83, "Panchatantra",
    "व्यर्थं श्रमस्तु।",
    "vyarthaṃ śramastu.",
    [("व्यर्थम्", "fruitless", ["NOM.SG"]), ("श्रमः", "effort", ["NOM.SG"]),
     ("तु", "but", ["INDECL"])],
))
_todo.append(_v(
    84, "Bhagavad Gītā 6.29",
    "सर्वभूतस्थितं यो मां भजत्येकत्वमास्थितः।",
    "sarvabhūtasthitaṃ yo māṃ bhajatyekatvamāsthitaḥ.",
    [("सर्वभूतस्थितम्", "dwelling in all beings", ["ACC.SG"]), ("यः", "who", ["NOM.SG"]),
     ("माम्", "me", ["ACC.SG"]), ("भजति", "worships", ["PRES.3SG"]),
     ("एकत्वमास्थितः", "established in unity", ["NOM.SG"])],
))
_todo.append(_v(
    85, "Subhāṣita Ratna Bhāṇḍāgāra",
    "स्वदेशे न कृतं कार्यं।",
    "svadeśe na kṛtaṃ kāryaṃ.",
    [("स्वदेशे", "in one's own land", ["LOC.SG"]), ("न", "not", ["INDECL"]),
     ("कृतम्", "done", ["NOM.SG"]), ("कार्यम्", "work", ["NOM.SG"])],
))
_todo.append(_v(
    86, "Bhagavad Gītā 2.27",
    "जातस्य हि ध्रुवो मृत्युः।",
    "jātasya hi dhruvo mṛtyuḥ.",
    [("जातस्य", "of the born", ["GEN.SG"]), ("ध्रुवः", "certain", ["NOM.SG"]),
     ("मृत्युः", "death", ["NOM.SG"])],
))
_todo.append(_v(
    87, "Hitopadeśa",
    "विद्या विवादाय विपद्।",
    "vidyā vivādāya vipad.",
    [("विद्या", "learning", ["NOM.SG"]), ("विवादाय", "for disputation", ["DAT.SG"]),
     ("विपत्", "calamity", ["NOM.SG"])],
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
    90, "Bhagavad Gītā 9.31",
    "अनन्याश्चिन्तयन्तो मां ये जनाः पर्युपासते।",
    "ananyāścintayanto māṃ ye janāḥ paryupāsate.",
    [("अनन्याः", "without other thought", ["NOM.PL"]), ("चिन्तयन्तः", "meditating", ["PRS.PART"]),
     ("माम्", "me", ["ACC.SG"]), ("ये", "who", ["NOM.PL"]),
     ("जनाः", "people", ["NOM.PL"]), ("पर्युपासते", "worship", ["PRES.3PL"])],
))
_todo.append(_v(
    91, "Nītīśataka",
    "सन्तोषः परमो लाभः।",
    "santoṣaḥ paramo lābhaḥ.",
    [("सन्तोषः", "contentment", ["NOM.SG"]), ("परमः", "highest", ["NOM.SG"]),
     ("लाभः", "gain", ["NOM.SG"])],
))
_todo.append(_v(
    92, "Panchatantra",
    "एकः कर्ता।",
    "ekaḥ kartā.",
    [("एकः", "one", ["NOM.SG"]), ("कर्ता", "agent", ["NOM.SG"])],
))
_todo.append(_v(
    93, "Subhāṣita Ratna Bhāṇḍāgāra",
    "उद्यमेन हि सिध्यन्ति कार्याणि न मनोरथैः।",
    "udyamena hi sidhyanti kāryāṇi na manorathaiḥ.",
    [("उद्यमेन", "by effort", ["INSTR.SG"]), ("सिध्यन्ति", "are accomplished", ["PRES.3PL"]),
     ("कार्याणि", "tasks", ["NOM.PL"]), ("न", "not", ["INDECL"]),
     ("मनोरथैः", "by wishing", ["INSTR.PL"])],
))
_todo.append(_v(
    94, "Bhagavad Gītā 2.17",
    "क्षरः सर्वाणि भूतानि।",
    "kṣaraḥ sarvāṇi bhūtāni.",
    [("क्षरः", "mutable", ["NOM.SG"]), ("सर्वाणि", "all", ["NOM.PL"]),
     ("भूतानि", "beings", ["NOM.PL"])],
))
_todo.append(_v(
    95, "Hitopadeśa, Mitralābha",
    "यस्मिन् देशे न सम्मानं।",
    "yasmin deśe na sammānaṃ.",
    [("यस्मिन्", "in which", ["LOC.SG"]), ("देशे", "place", ["LOC.SG"]),
     ("न", "not", ["INDECL"]), ("सम्मानम्", "honour", ["NOM.SG"])],
))
_todo.append(_v(
    96, "Subhāṣita Ratna Bhāṇḍāgāra",
    "न तृष्णया विना शान्तिः।",
    "na tṛṣṇayā vinā śāntiḥ.",
    [("न", "not", ["INDECL"]), ("तृष्णया", "without craving", ["INSTR.SG"]),
     ("विना", "without", ["INDECL"]), ("शान्तिः", "peace", ["NOM.SG"])],
))
_todo.append(_v(
    97, "Bhagavad Gītā 5.24",
    "सुखं त्वनिष्टम्।",
    "sukhaṃ tvanīṣṭam.",
    [("सुखम्", "happiness", ["NOM.SG"]), ("अनिष्टम्", "unwished", ["NOM.SG"])],
))
_todo.append(_v(
    98, "Panchatantra",
    "अबुद्धिः किं न कारयेत्।",
    "abuddhiḥ kiṃ na kārayet.",
    [("अबुद्धिः", "lack of sense", ["NOM.SG"]), ("किम्", "what", ["NOM.SG"]),
     ("न", "not", ["INDECL"]), ("कारयेत्", "would bring about", ["OPT.3SG"])],
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
    [("नियतम्", "dutiful", ["ACC.SG"]), ("कुरु", "do", ["IMPER.2SG"]),
     ("कर्म", "action", ["ACC.SG"]), ("त्वम्", "you", ["NOM.SG"]),
     ("ज्यायः", "better", ["NOM.SG"]), ("अकर्मणः", "than inaction", ["ABL.SG"]),
     ("शरीरयात्रा", "maintenance of the body", ["NOM.SG"]),
     ("प्रसिध्येत्", "would succeed", ["OPT.3SG"]), ("अकर्मणः", "from inaction", ["ABL.SG"])],
))
_todo.append(_v(
    21, "Bhagavad Gītā 6.31",
    "मनो यदत्र विनियुक्तम्।",
    "mano yadatra viniyuktam.",
    [("मनः", "the mind", ["NOM.SG"]), ("यत्", "which", ["NOM.SG"]),
     ("विनियुक्तम्", "engaged", ["NOM.SG"])],
))
_todo.append(_v(
    22, "Subhāṣita Ratna Bhāṇḍāgāra",
    "आलस्यं हि मनुष्याणां शरीरस्थो महान् रिपुः।",
    "ālāsyaṃ hi manuṣyāṇāṃ śarīrastho mahān ripuḥ.",
    [("आलस्यम्", "laziness", ["NOM.SG"]), ("मनुष्याणाम्", "of men", ["GEN.PL"]),
     ("शरीरस्थः", "residing in the body", ["NOM.SG"]), ("महान्", "great", ["NOM.SG"]),
     ("रिपुः", "enemy", ["NOM.SG"])],
))
_todo.append(_v(
    23, "Hitopadeśa, Mitralābha",
    "परीक्ष्य च गुणान्यस्य मित्रं कुर्वीत।",
    "parīkṣya ca guṇānyasya mitraṃ kurvīta.",
    [("परीक्ष्य", "having examined", ["INDECL"]), ("गुणान्", "virtues", ["ACC.PL"]),
     ("अस्य", "of him", ["GEN.SG"]), ("मित्रम्", "friend", ["ACC.SG"]),
     ("कुर्वीत", "should make", ["OPT.3SG"])],
))
_todo.append(_v(
    24, "Bhagavad Gītā 2.47",
    "सिद्ध्यसिद्ध्योः समो भूत्वा।",
    "siddhyasiddhyoḥ samo bhūtvā.",
    [("सिद्ध्यसिद्ध्योः", "in success and failure", ["LOC.DU"]),
     ("समः", "equal", ["NOM.SG"]), ("भूत्वा", "having become", ["INDECL"])],
))
_todo.append(_v(
    25, "Subhāṣita Ratna Bhāṇḍāgāra",
    "यदा यदा हि मूढस्य।",
    "yadā yadā hi mūḍhasya.",
    [("यदा यदा", "whenever", ["INDECL"]), ("मूढस्य", "of the foolish", ["GEN.SG"])],
))
_todo.append(_v(
    26, "Nītiśataka",
    "जन्मान्तरसहस्रेषु पुण्यात्।",
    "janmāntarasahasreṣu puṇyāt.",
    [("जन्मान्तरसहस्रेषु", "in thousands of births", ["LOC.PL"]),
     ("पुण्यात्", "from merit", ["ABL.SG"])],
))
_todo.append(_v(
    27, "Panchatantra",
    "स्वदेशमनुरज्यन्ते।",
    "svadeśamanurajyante.",
    [("स्वदेशम्", "one's own land", ["ACC.SG"]), ("अनुरज्यन्ते", "they are devoted to", ["PRES.3PL"])],
))
_todo.append(_v(
    28, "Subhāṣita Ratna Bhāṇḍāgāra",
    "विद्या परा सत्यधर्मे।",
    "vidyā parā satyadharme.",
    [("विद्या", "knowledge", ["NOM.SG"]), ("परा", "supreme", ["NOM.SG"]),
     ("सत्यधर्मे", "in truth and duty", ["LOC.SG"])],
))
_todo.append(_v(
    29, "Bhagavad Gītā 12.4",
    "सर्वधर्मान्परित्यज्य मामेकं शरणं व्रज।",
    "sarvadharmānparityajya māmekaṃ śaraṇaṃ vraja.",
    [("सर्वधर्मान्", "all dharmas", ["ACC.PL"]), ("परित्यज्य", "having relinquished", ["INDECL"]),
     ("माम्", "to me", ["ACC.SG"]), ("एकम्", "alone", ["ACC.SG"]),
     ("शरणम्", "for refuge", ["ACC.SG"]), ("व्रज", "go", ["IMPER.2SG"])],
))

SEED_SLOKAS = list(_todo)
assert len(SEED_SLOKAS) >= 90, f"expected >=90 shlokas, got {len(SEED_SLOKAS)}"
# day_offset values must be distinct (each date maps to exactly one verse).
assert len({s["day_offset"] for s in SEED_SLOKAS}) == len(SEED_SLOKAS)