"""Chapter 16 · Pāṇini's system — the Aṣṭādhyāyī, the Śiva sūtras and
pratyāhāras, and how to read the engine's step-by-step derivations. The
derivation steps quoted here are the engine's own, for रामेण."""

from __future__ import annotations

from .model import (
    cell, chapter, fact, formula, krd, opt, opt_sa, proof, q, snd, steps, sub, table, tc, text,
    tip, topic, watch,
)

CHAPTER = chapter(
    "panini",
    title=("Pāṇini's system", "पाणिनि की व्यवस्था"),
    title_sa="पाणिनीयम्",
    blurb=("Four thousand short rules that generate Sanskrit — and how to read them.",
           "चार हज़ार छोटे नियम जो संस्कृत शब्द रचते हैं — और उन्हें कैसे पढ़ें।"),
    icon="library-outline",
)


def _code(dotted: str) -> dict:
    """A sūtra number in both scripts: 6.1.87 / ६.१.८७."""
    return tc(dotted, dotted.translate(str.maketrans("0123456789", "०१२३४५६७८९")))


TOPICS = [
    topic(
        "ashtadhyayi",
        level=3,
        title=("The Aṣṭādhyāyī", "अष्टाध्यायी"),
        title_sa="अष्टाध्यायी",
        summary=("Pāṇini described all of Sanskrit in about 4,000 sūtras, in eight chapters of four quarters each.",
                 "पाणिनि ने पूरी संस्कृत को लगभग 4,000 सूत्रों में बाँधा — आठ अध्याय, हर अध्याय में चार पाद।"),
        term=("सूत्रम्", "a short rule", "सूत्र — छोटा नियम"),
        blocks=[
            text("Around the 5th or 4th century BCE, Pāṇini of Gandhāra wrote the {{अष्टाध्यायी}} “eight chapters”. "
                 "Its sūtras are so compressed that a whole rule can be two words. A number like 6.1.87 means "
                 "chapter 6, quarter 1, sūtra 87.",
                 "लगभग ईसा पूर्व पाँचवीं या चौथी शताब्दी में गान्धार के पाणिनि ने {{अष्टाध्यायी}} 'आठ अध्याय' रची। इसके सूत्र "
                 "इतने संक्षिप्त हैं कि पूरा नियम दो शब्दों का हो सकता है। 6.1.87 जैसी संख्या का अर्थ है अध्याय 6, पाद 1, सूत्र 87।"),
            table(
                ("Rules you have already used", "नियम जो आप पहले ही बरत चुके हैं"),
                [("Number", "संख्या"), ("Sūtra", "सूत्र"), ("What it does", "क्या करता है"), ("Example", "उदाहरण")],
                [
                    [_code("6.1.101"), cell("अकः सवर्णे दीर्घः"), tc("like vowels merge long", "समान स्वर मिलकर दीर्घ"),
                     cell("विद्यालयः", snd("विद्या", "आलयः"))],
                    [_code("6.1.87"), cell("आद्गुणः"), tc("a + i/u → e/o", "अ + इ/उ → ए/ओ"), cell("नरेन्द्रः", snd("नर", "इन्द्रः"))],
                    [_code("6.1.88"), cell("वृद्धिरेचि"), tc("a + e/o → ai/au", "अ + ए/ओ → ऐ/औ"), cell("सदैव", snd("सदा", "एव"))],
                    [_code("6.1.77"), cell("इको यणचि"), tc("i/u/ṛ → y/v/r before a vowel", "स्वर से पहले इ/उ/ऋ → य्/व्/र्"),
                     cell("इत्यादि", snd("इति", "आदि"))],
                    [_code("6.1.78"), cell("एचोऽयवायावः"), tc("e/o/ai/au → ay/av/āy/āv", "ए/ओ/ऐ/औ → अय्/अव्/आय्/आव्"),
                     cell("नयनम्", krd("नी", "lyuw", linga="Napumsaka", vibhakti="Prathama", vacana="Eka"))],
                    [_code("8.4.2"), cell("अट्कुप्वाङ्नुम्व्यवायेऽपि"), tc("n → ṇ after r or ṣ", "र या ष के बाद न् → ण्"),
                     cell("रामेण", sub("राम", "Pum", "Trtiya"))],
                ],
            ),
            fact("Tradition honours three sages of grammar: Pāṇini, Kātyāyana, who added notes, and Patañjali, whose "
                 "Great Commentary explains both.",
                 "परम्परा व्याकरण के तीन मुनियों को मानती है: पाणिनि; कात्यायन, जिन्होंने वार्त्तिक जोड़े; और पतञ्जलि, जिनका "
                 "महाभाष्य दोनों की व्याख्या करता है।"),
            tip("The linguist Leonard Bloomfield called this grammar one of the greatest monuments of human intelligence.",
                "भाषाविज्ञानी लियोनार्ड ब्लूमफ़ील्ड ने इस व्याकरण को मानव बुद्धि के सबसे महान स्मारकों में गिना।"),
        ],
        quiz=[
            q(("What does the number 8.4.2 point to?", "संख्या 8.4.2 किसकी ओर इशारा करती है?"),
              [opt("chapter 8, quarter 4, sūtra 2", "अध्याय 8, पाद 4, सूत्र 2"), opt("page 842", "पृष्ठ 842"),
               opt("the 842nd word", "842वाँ शब्द")],
              0,
              ("Chapter · quarter · sūtra.", "अध्याय · पाद · सूत्र।")),
        ],
        terms=("sutra", "vyakarana"),
        related=("shiva-sutras", "how-it-works"),
    ),
    topic(
        "shiva-sutras",
        level=3,
        title=("The Śiva sūtras and pratyāhāras", "माहेश्वर सूत्र और प्रत्याहार"),
        title_sa="माहेश्वरसूत्राणि",
        summary=("Fourteen lines list every sound; अच् means “all vowels”, हल् “all consonants”.",
                 "चौदह पंक्तियों में सारी ध्वनियाँ; अच् का अर्थ 'सभी स्वर', हल् का 'सभी व्यंजन'।"),
        term=("प्रत्याहारः", "a shorthand for a group of sounds", "प्रत्याहार — ध्वनि-समूह का संक्षिप्त नाम"),
        blocks=[
            text("Before any rule, Pāṇini lists the sounds in 14 short lines — said to come from the drum of Śiva. The "
                 "last consonant of each line is only a **tag**. Take a sound and a later tag, and you name every sound "
                 "in between: {{अच्}} = a to the tag c = all vowels.",
                 "किसी भी नियम से पहले पाणिनि ध्वनियों को 14 छोटी पंक्तियों में गिनाते हैं — कहा जाता है, शिव के डमरू से निकली। "
                 "हर पंक्ति का अंतिम व्यंजन केवल एक **चिह्न** (इत्) है। कोई ध्वनि और आगे का कोई चिह्न लीजिए, बीच की सारी "
                 "ध्वनियों का नाम बन जाता है: {{अच्}} = अ से च् चिह्न तक = सभी स्वर।"),
            table(
                ("The fourteen lines", "चौदह सूत्र"),
                [("Line", "सूत्र"), ("Sounds", "ध्वनियाँ")],
                [
                    [cell("अइउण्"), tc("a i u", "अ इ उ")],
                    [cell("ऋऌक्"), tc("ṛ ḷ", "ऋ ऌ")],
                    [cell("एओङ्"), tc("e o", "ए ओ")],
                    [cell("ऐऔच्"), tc("ai au", "ऐ औ")],
                    [cell("हयवरट्"), tc("h y v r", "ह य व र")],
                    [cell("लण्"), tc("l", "ल")],
                    [cell("ञमङणनम्"), tc("ñ m ṅ ṇ n", "ञ म ङ ण न")],
                    [cell("झभञ्"), tc("jh bh", "झ भ")],
                    [cell("घढधष्"), tc("gh ḍh dh", "घ ढ ध")],
                    [cell("जबगडदश्"), tc("j b g ḍ d", "ज ब ग ड द")],
                    [cell("खफछठथचटतव्"), tc("kh ph ch ṭh th c ṭ t", "ख फ छ ठ थ च ट त")],
                    [cell("कपय्"), tc("k p", "क प")],
                    [cell("शषसर्"), tc("ś ṣ s", "श ष स")],
                    [cell("हल्"), tc("h", "ह")],
                ],
                note=("The final consonant of each line is a tag, not one of the sounds.",
                      "हर पंक्ति का अंतिम व्यंजन चिह्न है, ध्वनियों में नहीं गिना जाता।"),
            ),
            table(
                ("Shorthands in the rules", "नियमों में प्रत्याहार"),
                [("Shorthand", "प्रत्याहार"), ("Covers", "किन्हें"), ("Used in", "कहाँ")],
                [
                    [cell("अच्"), tc("all vowels", "सभी स्वर"), cell("इको यणचि")],
                    [cell("हल्"), tc("all consonants", "सभी व्यंजन"), tc("many rules", "अनेक नियम")],
                    [cell("इक्"), tc("i u ṛ ḷ", "इ उ ऋ ऌ"), cell("इको यणचि")],
                    [cell("यण्"), tc("y v r l", "य व र ल"), cell("इको यणचि")],
                    [cell("एच्"), tc("e o ai au", "ए ओ ऐ औ"), cell("एचोऽयवायावः")],
                    [cell("अक्"), tc("a i u ṛ ḷ", "अ इ उ ऋ ऌ"), cell("अकः सवर्णे दीर्घः")],
                ],
            ),
            formula("इति", "आदि", "इत्यादि", "इको यणचि: an इक् sound before an अच् becomes its यण्",
                    "इको यणचि: अच् से पहले इक् ध्वनि अपना यण् बन जाती है", check=snd("इति", "आदि")),
            watch("{{ह}} appears twice, in lines 5 and 14, so a shorthand's range depends on which tag you stop at.",
                  "{{ह}} दो बार आता है, पाँचवें और चौदहवें सूत्र में, इसलिए प्रत्याहार की सीमा इस पर निर्भर है कि किस चिह्न पर रुकें।"),
        ],
        quiz=[
            q(("What does {{अच्}} stand for?", "{{अच्}} किसका नाम है?"),
              [opt("all vowels", "सभी स्वर"), opt("all consonants", "सभी व्यंजन"), opt("a and c", "अ और च")],
              0,
              ("From अ to the tag च् in ऐऔच्.", "अ से ऐऔच् के च् चिह्न तक।")),
        ],
        terms=("pratyahara", "svara", "vyanjana"),
        related=("reading-derivation", "vowels"),
    ),
    topic(
        "reading-derivation",
        level=3,
        title=("Reading an engine derivation", "इंजन की प्रक्रिया पढ़ना"),
        title_sa="प्रक्रिया",
        summary=("Each step names a sūtra and shows the word so far — from bare stem to finished form.",
                 "हर चरण एक सूत्र बताता है और अब तक बना शब्द दिखाता है — मूल से पूरे रूप तक।"),
        term=("प्रक्रिया", "a derivation, step by step", "प्रक्रिया — चरण-दर-चरण शब्द-निर्माण"),
        blocks=[
            steps(
                ("Start at the top: the bare stem or root, and the sūtra that names it.",
                 "ऊपर से शुरू कीजिए: मूल शब्द या धातु, और उसे नाम देने वाला सूत्र।"),
                ("Watch the ending arrive, then its tag letters drop away.",
                 "प्रत्यय आते देखिए, फिर उसके चिह्न-अक्षर हटते देखिए।"),
                ("The last steps are sound changes — sandhi, n → ṇ — that give the finished word.",
                 "अंतिम चरण ध्वनि-परिवर्तन हैं — सन्धि, न् → ण् — जो पूरा शब्द देते हैं।"),
            ),
            table(
                ("How the grammar engine builds रामेण", "व्याकरण-इंजन रामेण कैसे बनाता है"),
                [("Sūtra", "सूत्र"), ("Word so far", "अब तक"), ("What happened", "क्या हुआ")],
                [
                    [_code("1.2.45"), cell("राम"), tc("राम is a noun stem", "राम प्रातिपदिक है")],
                    [_code("4.1.2"), cell("राम + टा"), tc("the 3rd-case ending टा is added", "तृतीया का प्रत्यय टा जुड़ा")],
                    [_code("1.3.9"), cell("राम + आ"), tc("the tag ṭ drops off", "चिह्न ट् हटा")],
                    [_code("7.1.12"), cell("राम + इन"), tc("after a, टा becomes इन", "अ के बाद टा, इन बनता है")],
                    [_code("6.1.87"), cell("रामेन"), tc("a + i → e", "अ + इ → ए")],
                    [_code("8.4.2"), cell("रामेण", sub("राम", "Pum", "Trtiya")), tc("n → ṇ after r", "र के बाद न् → ण्")],
                ],
                note=("Some steps in the player only label a piece and change nothing you can see; they are left out here.",
                      "प्लेयर के कुछ चरण केवल किसी अंश को नाम देते हैं और दिखने में कुछ नहीं बदलते; वे यहाँ छोड़ दिए गए हैं।"),
            ),
            tip("Open the proof below and step through it yourself — every step names its sūtra.",
                "नीचे का प्रमाण खोलिए और खुद चरण-दर-चरण चलिए — हर चरण अपना सूत्र बताता है।"),
        ],
        quiz=[
            q(("Which step turns रामेन into रामेण?", "कौन-सा चरण रामेन को रामेण बनाता है?"),
              [opt("8.4.2", "८.४.२"), opt("6.1.87", "६.१.८७"), opt("4.1.2", "४.१.२")],
              0,
              ("8.4.2 changes n to ṇ after r.", "8.4.2 र के बाद न् को ण् बनाता है।")),
        ],
        proofs=[
            proof("derive", ("Step through रामेण", "रामेण चरण-दर-चरण देखिए"),
                  pratipadika="राम", linga="Pum", vibhakti="Trtiya", vacana="Eka"),
            proof("derive", ("Step through भवति", "भवति चरण-दर-चरण देखिए"),
                  dhatu="भू", lakara="Lat", purusha="Prathama", vacana="Eka"),
        ],
        terms=("sutra", "pratyaya", "pratipadika"),
        related=("ashtadhyayi", "instrumental"),
    ),
]
