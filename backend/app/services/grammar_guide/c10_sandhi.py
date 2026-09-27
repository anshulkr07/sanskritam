"""Chapter 10 · Sandhi — why sounds merge; the vowel rules (long, guṇa,
vṛddhi, y/v/r, ay/av and ऽ); visarga; consonants; and how to split a join.

Every join is checked against the sandhi rule table. The ay/av family is
checked through the engine's own word-building (नी + अन → नयनम्), where the
rule actually fires."""

from __future__ import annotations

from .model import (
    cell, chapter, ex, examples, formula, go_deeper, krd, opt, opt_sa, proof, q, snd, src, steps,
    sub, table, tc, text, tip, topic, w, watch, wild,
)

CHAPTER = chapter(
    "sandhi",
    title=("Sandhi: sounds that merge", "सन्धि: मिलती ध्वनियाँ"),
    title_sa="सन्धिः",
    blurb=("Why विद्या + आलय becomes विद्यालय — and how to take joins apart again.",
           "विद्या + आलय विद्यालय क्यों बनता है — और जुड़े शब्दों को फिर से कैसे अलग करें।"),
    icon="git-merge-outline",
)


def _row(first: str, second: str, joined: str, en: str, hi: str) -> list:
    return [cell(f"{first} + {second}"), cell(joined, snd(first, second)), tc(en, hi)]


TOPICS = [
    topic(
        "sandhi-why",
        level=1,
        title=("Why sounds merge", "ध्वनियाँ क्यों मिलती हैं"),
        title_sa="सन्धिः",
        summary=("When two words meet, their edge sounds blend — the way “want to” becomes “wanna”.",
                 "जब दो शब्द मिलते हैं, तो उनकी किनारे की ध्वनियाँ घुल-मिल जाती हैं — जैसे बोलते समय शब्द जुड़ जाते हैं।"),
        term=("सन्धिः", "joining — sounds merging where words meet", "सन्धि — शब्दों के मिलने पर ध्वनियों का जुड़ना"),
        blocks=[
            text("Say “want to” fast and you get “wanna”. Sanskrit does this on purpose and **writes it down**: "
                 "{{विद्या}} + {{आलयः}} becomes {{विद्यालयः}} “school”. You already know dozens of sandhi words from "
                 "Hindi.",
                 "जल्दी बोलने पर शब्द आपस में जुड़ जाते हैं। संस्कृत यह जान-बूझकर करती है और **लिखती भी है**: {{विद्या}} + "
                 "{{आलयः}} = {{विद्यालयः}}। हिन्दी से आप ऐसे दर्जनों सन्धि-शब्द पहले से जानते हैं।"),
            formula("विद्या", "आलयः", "विद्यालयः", "ā + ā → ā: “abode of learning”, a school",
                    "आ + आ → आ: 'विद्या का घर', विद्यालय", check=snd("विद्या", "आलयः")),
            table(
                ("Hindi words that are sandhi", "हिन्दी के सन्धि-शब्द"),
                [("Parts", "भाग"), ("Joined", "जुड़ा रूप"), ("Meaning", "अर्थ")],
                [
                    _row("हिम", "आलयः", "हिमालयः", "abode of snow — the Himālaya", "बर्फ़ का घर — हिमालय"),
                    _row("सूर्य", "उदयः", "सूर्योदयः", "sunrise", "सूर्य का उदय"),
                    _row("महा", "आत्मा", "महात्मा", "great soul", "महान आत्मा"),
                    _row("सु", "आगतम्", "स्वागतम्", "welcome — “well come”", "स्वागत — 'भले आए'"),
                    _row("नमः", "ते", "नमस्ते", "salutation to you", "तुम्हें नमस्कार"),
                    _row("सत्", "आचारः", "सदाचारः", "good conduct", "अच्छा आचरण"),
                ],
            ),
            text("There are three families, named by the sound that changes: **vowel** sandhi, **visarga** sandhi "
                 "(the ḥ) and **consonant** sandhi. This chapter takes them one at a time.",
                 "सन्धि के तीन परिवार हैं, बदलने वाली ध्वनि के नाम पर: **स्वर** सन्धि, **विसर्ग** सन्धि (ः) और **व्यंजन** "
                 "सन्धि। यह अध्याय इन्हें एक-एक करके समझाता है।"),
            wild(
                ex("सत्यमेव जयते", "Truth alone wins — सत्यम् + एव run together.", "सत्य की ही जीत होती है — सत्यम् + एव जुड़ गए।",
                   source=src("Muṇḍaka Upaniṣad 3.1.6 · national motto of India", "मुण्डक उपनिषद् 3.1.6 · भारत का राष्ट्रीय आदर्श-वाक्य"),
                   check=snd("सत्यम्", "एव", joined="सत्यमेव")),
            ),
        ],
        quiz=[
            q(("Join: विद्या + आलयः", "सन्धि कीजिए: विद्या + आलयः"),
              [opt_sa("विद्यालयः", snd("विद्या", "आलयः")), opt_sa("विद्याआलयः"), opt_sa("विद्येलयः")],
              0,
              ("Two ā sounds merge into one long ā.", "दो आ मिलकर एक दीर्घ आ बनते हैं।")),
        ],
        proofs=[
            proof("sandhi", ("Split a joined word", "जुड़े शब्द को अलग करके देखिए"), joined="विद्यालयः"),
        ],
        terms=("sandhi", "svara"),
        feature_ids=("VOWEL-SANDHI",),
        related=("sandhi-long-vowels", "sandhi-splitting"),
    ),
    topic(
        "sandhi-long-vowels",
        level=1,
        title=("Like vowels become long", "समान स्वर मिलकर दीर्घ"),
        title_sa="दीर्घसन्धिः",
        summary=("a + a → ā, i + i → ī, u + u → ū — short or long, two like vowels make one long one.",
                 "अ + अ → आ, इ + इ → ई, उ + उ → ऊ — ह्रस्व हों या दीर्घ, दो समान स्वर मिलकर एक दीर्घ स्वर बनते हैं।"),
        term=("दीर्घसन्धिः", "the “long” join", "दीर्घ सन्धि"),
        blocks=[
            text("When a word ends in a vowel and the next begins with **the same** vowel, short or long, they fuse "
                 "into its long form. It is the easiest sandhi to spot: a long vowel in the middle of a compound.",
                 "जब एक शब्द किसी स्वर पर खत्म हो और अगला **उसी** स्वर से शुरू हो — ह्रस्व या दीर्घ — तो दोनों मिलकर उसका "
                 "दीर्घ रूप बन जाते हैं। यह सबसे आसानी से पहचानी जाने वाली सन्धि है: समास के बीच में दीर्घ स्वर।"),
            table(
                ("The long join", "दीर्घ सन्धि"),
                [("Parts", "भाग"), ("Joined", "जुड़ा रूप"), ("Rule", "नियम")],
                [
                    _row("देव", "आलयः", "देवालयः", "a + ā → ā · temple", "अ + आ → आ · मन्दिर"),
                    _row("हिम", "आलयः", "हिमालयः", "a + ā → ā · Himālaya", "अ + आ → आ · हिमालय"),
                    _row("रवि", "इन्द्रः", "रवीन्द्रः", "i + i → ī · Ravīndra", "इ + इ → ई · रवीन्द्र"),
                    _row("कवि", "ईश्वरः", "कवीश्वरः", "i + ī → ī · lord of poets", "इ + ई → ई · कवियों में श्रेष्ठ"),
                    _row("गुरु", "उपदेशः", "गुरूपदेशः", "u + u → ū · the teacher's advice", "उ + उ → ऊ · गुरु का उपदेश"),
                    _row("भानु", "उदयः", "भानूदयः", "u + u → ū · sunrise", "उ + उ → ऊ · सूर्योदय"),
                ],
            ),
            tip("Hindi keeps these words whole: रवीन्द्र, हिमालय, देवालय. Seeing ī or ū mid-word is a strong hint "
                "of two i's or u's.",
                "हिन्दी ये शब्द जैसे-के-तैसे रखती है: रवीन्द्र, हिमालय, देवालय। शब्द के बीच ई या ऊ दिखे तो दो इ या दो उ "
                "का पक्का संकेत है।"),
            watch("Only **like** vowels do this. a + i does something else — see the next topic.",
                  "यह केवल **समान** स्वरों में होता है। अ + इ कुछ और करता है — अगला विषय देखिए।"),
        ],
        quiz=[
            q(("Join: गुरु + उपदेशः", "सन्धि कीजिए: गुरु + उपदेशः"),
              [opt_sa("गुरूपदेशः", snd("गुरु", "उपदेशः")), opt_sa("गुरोपदेशः"), opt_sa("गुर्वुपदेशः")],
              0,
              ("u + u → ū.", "उ + उ → ऊ।")),
        ],
        terms=("sandhi",),
        feature_ids=("VOWEL-SANDHI",),
        related=("sandhi-guna",),
    ),
    topic(
        "sandhi-guna",
        level=1,
        title=("a + i → e, a + u → o", "अ + इ → ए, अ + उ → ओ"),
        title_sa="गुणसन्धिः",
        summary=("a or ā before i/ī gives e; before u/ū gives o; before ṛ gives ar: नर + इन्द्र → नरेन्द्र.",
                 "अ या आ के बाद इ/ई हो तो ए; उ/ऊ हो तो ओ; ऋ हो तो अर्: नर + इन्द्र → नरेन्द्र।"),
        term=("गुणसन्धिः", "the guṇa join", "गुण सन्धि"),
        blocks=[
            text("When a or ā meets i or u, the two vowels blend into one middle sound: **e** or **o**. Try it: say "
                 "“a-i” quickly and your mouth lands on e. Before ṛ, the result is ar.",
                 "जब अ या आ, इ या उ से मिलता है, तो दोनों मिलकर एक बीच की ध्वनि बनाते हैं: **ए** या **ओ**। बोलकर देखिए: "
                 "'अ-इ' जल्दी बोलें तो मुँह ए पर पहुँचता है। ऋ से पहले परिणाम अर् होता है।"),
            table(
                ("The guṇa join", "गुण सन्धि"),
                [("Parts", "भाग"), ("Joined", "जुड़ा रूप"), ("Rule", "नियम")],
                [
                    _row("नर", "इन्द्रः", "नरेन्द्रः", "a + i → e · Narendra, lord of men", "अ + इ → ए · नरेन्द्र"),
                    _row("गण", "ईशः", "गणेशः", "a + ī → e · Gaṇeśa, lord of the hosts", "अ + ई → ए · गणेश"),
                    _row("महा", "ईशः", "महेशः", "ā + ī → e · Maheśa", "आ + ई → ए · महेश"),
                    _row("सूर्य", "उदयः", "सूर्योदयः", "a + u → o · sunrise", "अ + उ → ओ · सूर्योदय"),
                    _row("गङ्गा", "उदकम्", "गङ्गोदकम्", "ā + u → o · Ganges water", "आ + उ → ओ · गंगाजल"),
                    _row("महा", "ऋषिः", "महर्षिः", "ā + ṛ → ar · great sage", "आ + ऋ → अर् · महर्षि"),
                ],
            ),
            examples(
                ex("परमेश्वरः", "the supreme lord — परम + ईश्वरः", "परमेश्वर — परम + ईश्वरः", check=snd("परम", "ईश्वरः")),
                ex("यथेष्टम्", "as much as you like — यथा + इष्टम्", "जितना चाहें — यथा + इष्टम्", check=snd("यथा", "इष्टम्")),
                ex("महोत्सवः", "a great festival — महा + उत्सवः", "महोत्सव — महा + उत्सवः", check=snd("महा", "उत्सवः")),
            ),
            tip("This is the same e and o you met as guṇa in the sounds chapter — sandhi and word-building use one "
                "set of vowel grades.",
                "यह वही ए और ओ है जो ध्वनियों वाले अध्याय में गुण के रूप में मिला था — सन्धि और शब्द-रचना स्वरों की एक "
                "ही श्रेणी काम में लेती हैं।"),
        ],
        quiz=[
            q(("Join: गण + ईशः", "सन्धि कीजिए: गण + ईशः"),
              [opt_sa("गणेशः", snd("गण", "ईशः")), opt_sa("गणीशः"), opt_sa("गणैशः")],
              0,
              ("a + ī → e.", "अ + ई → ए।")),
        ],
        terms=("sandhi", "guna"),
        feature_ids=("VOWEL-SANDHI",),
        related=("sandhi-vrddhi", "guna-vrddhi"),
    ),
    topic(
        "sandhi-vrddhi",
        level=2,
        title=("a + e → ai, a + o → au", "अ + ए → ऐ, अ + ओ → औ"),
        title_sa="वृद्धिसन्धिः",
        summary=("a or ā before e/ai gives ai; before o/au gives au: सदा + एव → सदैव.",
                 "अ या आ के बाद ए/ऐ हो तो ऐ; ओ/औ हो तो औ: सदा + एव → सदैव।"),
        term=("वृद्धिसन्धिः", "the vṛddhi join", "वृद्धि सन्धि"),
        blocks=[
            text("If a or ā meets a vowel that is already e, ai, o or au, the result climbs one grade higher: **ai** "
                 "or **au**. The most famous example is in India's foreign-policy motto, {{वसुधैव कुटुम्बकम्}}.",
                 "अगर अ या आ किसी ऐसे स्वर से मिले जो पहले से ए, ऐ, ओ या औ है, तो परिणाम एक श्रेणी ऊपर जाता है: **ऐ** या "
                 "**औ**। सबसे प्रसिद्ध उदाहरण {{वसुधैव कुटुम्बकम्}} में है।"),
            table(
                ("The vṛddhi join", "वृद्धि सन्धि"),
                [("Parts", "भाग"), ("Joined", "जुड़ा रूप"), ("Rule", "नियम")],
                [
                    _row("सदा", "एव", "सदैव", "ā + e → ai · always", "आ + ए → ऐ · सदा ही"),
                    _row("एक", "एकम्", "एकैकम्", "a + e → ai · one by one", "अ + ए → ऐ · एक-एक"),
                    _row("महा", "ओघः", "महौघः", "ā + o → au · a great flood", "आ + ओ → औ · बड़ी बाढ़"),
                    _row("वन", "औषधिः", "वनौषधिः", "a + au → au · forest herb", "अ + औ → औ · जंगली औषधि"),
                ],
            ),
            wild(
                ex("वसुधैव कुटुम्बकम्", "The world is one family.", "सारी पृथ्वी एक परिवार है।",
                   w("वसुधैव", "the earth indeed — वसुधा + एव", "पृथ्वी ही — वसुधा + एव", snd("वसुधा", "एव")),
                   w("कुटुम्बकम्", "a family", "परिवार", sub("कुटुम्बक", "Napumsaka")),
                   source=src("Mahā Upaniṣad 6.71", "महोपनिषद् 6.71")),
            ),
            watch("{{सदैव}} is not “sadā-iva”. The second word is {{एव}} “indeed”; i would give e, not ai.",
                  "{{सदैव}} 'सदा-इव' नहीं है। दूसरा शब्द {{एव}} 'ही' है; इ से ए बनता, ऐ नहीं।"),
        ],
        quiz=[
            q(("Join: एक + एकम्", "सन्धि कीजिए: एक + एकम्"),
              [opt_sa("एकैकम्", snd("एक", "एकम्")), opt_sa("एकेकम्"), opt_sa("एकायकम्")],
              0,
              ("a + e → ai.", "अ + ए → ऐ।")),
        ],
        terms=("sandhi", "vrddhi"),
        feature_ids=("VOWEL-SANDHI",),
        related=("sandhi-yan",),
    ),
    topic(
        "sandhi-yan",
        level=1,
        title=("i → y, u → v, ṛ → r before a vowel", "स्वर से पहले इ → य्, उ → व्, ऋ → र्"),
        title_sa="यण्सन्धिः",
        summary=("Before a different vowel, i/ī turns into y, u/ū into v, ṛ into r: इति + आदि → इत्यादि.",
                 "किसी भिन्न स्वर से पहले इ/ई य् बन जाता है, उ/ऊ व्, ऋ र्: इति + आदि → इत्यादि।"),
        term=("यण्सन्धिः", "the y-v-r join", "यण् सन्धि"),
        blocks=[
            text("An i, u or ṛ followed by a **different** vowel slides into its consonant twin: i → y, u → v, "
                 "ṛ → r. Say “i-a” quickly and you hear “ya” — the rule just writes that down.",
                 "इ, उ या ऋ के बाद कोई **भिन्न** स्वर आए तो वह अपने व्यंजन-रूप में बदल जाता है: इ → य्, उ → व्, ऋ → र्। "
                 "'इ-आ' जल्दी बोलिए तो 'या' सुनाई देता है — नियम बस उसे लिख देता है।"),
            table(
                ("The y-v-r join", "यण् सन्धि"),
                [("Parts", "भाग"), ("Joined", "जुड़ा रूप"), ("Rule", "नियम")],
                [
                    _row("इति", "आदि", "इत्यादि", "i + ā → yā · and so on", "इ + आ → या · इत्यादि"),
                    _row("प्रति", "एकम्", "प्रत्येकम्", "i + e → ye · each one", "इ + ए → ये · प्रत्येक"),
                    _row("अति", "उत्तमः", "अत्युत्तमः", "i + u → yu · excellent", "इ + उ → यु · अति उत्तम"),
                    _row("सु", "आगतम्", "स्वागतम्", "u + ā → vā · welcome", "उ + आ → वा · स्वागत"),
                    _row("अनु", "अयः", "अन्वयः", "u + a → va · connection", "उ + अ → व · अन्वय"),
                    _row("पितृ", "आज्ञा", "पित्राज्ञा", "ṛ + ā → rā · father's command", "ऋ + आ → रा · पिता की आज्ञा"),
                ],
            ),
            wild(
                ex("कर्मण्येवाधिकारस्ते", "Your right is to the work alone.", "तुम्हारा अधिकार केवल कर्म पर है।",
                   w("कर्मण्येव", "in action alone — कर्मणि + एव", "कर्म में ही — कर्मणि + एव", snd("कर्मणि", "एव")),
                   source=src("Bhagavad Gītā 2.47", "भगवद्गीता 2.47")),
                ex("योगक्षेमं वहाम्यहम्", "I carry their welfare.", "मैं उनका योगक्षेम वहन करता हूँ।",
                   w("वहाम्यहम्", "carry, I — वहामि + अहम्", "वहन करता हूँ मैं — वहामि + अहम्", snd("वहामि", "अहम्")),
                   source=src("Bhagavad Gītā 9.22 · motto of LIC", "भगवद्गीता 9.22 · एलआईसी का आदर्श-वाक्य")),
            ),
            tip("A y or v right after a consonant, in the middle of a word, often hides an i or u: {{प्रत्येक}} → "
                "प्रति + एक.",
                "शब्द के बीच किसी व्यंजन के ठीक बाद य् या व् दिखे तो अक्सर वहाँ इ या उ छिपा होता है: {{प्रत्येक}} → प्रति + एक।"),
        ],
        quiz=[
            q(("Join: सु + आगतम्", "सन्धि कीजिए: सु + आगतम्"),
              [opt_sa("स्वागतम्", snd("सु", "आगतम्")), opt_sa("सूगतम्"), opt_sa("सोगतम्")],
              0,
              ("u before a different vowel becomes v.", "भिन्न स्वर से पहले उ, व् बनता है।")),
        ],
        terms=("sandhi",),
        feature_ids=("VOWEL-SANDHI",),
        related=("sandhi-ayadi",),
    ),
    topic(
        "sandhi-ayadi",
        level=2,
        title=("e/o + vowel → ay/av, and the ऽ sign", "ए/ओ + स्वर → अय्/अव्, और ऽ चिह्न"),
        title_sa="अयादिसन्धिः",
        summary=("e, o, ai, au before a vowel open up into ay, av, āy, āv. Before a, e and o swallow it and leave ऽ.",
                 "स्वर से पहले ए, ओ, ऐ, औ खुलकर अय्, अव्, आय्, आव् बन जाते हैं। अ से पहले ए और ओ उसे निगल जाते हैं और ऽ छोड़ते हैं।"),
        term=("ऽ", "avagraha — marks a swallowed a", "अवग्रह — लुप्त अ का चिह्न"),
        blocks=[
            text("Inside words, e, o, ai and au break open before a vowel: e → ay, o → av, ai → āy, au → āv. That is "
                 "why {{नी}} “lead” gives {{नयनम्}} “eye” and {{भू}} gives {{भवनम्}} “building”.",
                 "शब्दों के भीतर स्वर से पहले ए, ओ, ऐ और औ खुल जाते हैं: ए → अय्, ओ → अव्, ऐ → आय्, औ → आव्। इसीलिए {{नी}} "
                 "'ले जाना' से {{नयनम्}} 'आँख' और {{भू}} से {{भवनम्}} बनता है।"),
            table(
                ("e, o, ai, au open up", "ए, ओ, ऐ, औ खुल जाते हैं"),
                [("Parts", "भाग"), ("Word", "शब्द"), ("Rule", "नियम")],
                [
                    [cell("ने + अनम्"), cell("नयनम्", krd("नी", "lyuw", linga="Napumsaka", vibhakti="Prathama", vacana="Eka")),
                     tc("e + a → aya · eye", "ए + अ → अय · नयन")],
                    [cell("भो + अनम्"), cell("भवनम्", krd("भू", "lyuw", linga="Napumsaka", vibhakti="Prathama", vacana="Eka")),
                     tc("o + a → ava · building", "ओ + अ → अव · भवन")],
                    [cell("नै + अकः"), cell("नायकः", krd("नी", "Rvul", linga="Pum", vibhakti="Prathama", vacana="Eka")),
                     tc("ai + a → āya · leader", "ऐ + अ → आय · नायक")],
                    _row("पौ", "अकः", "पावकः", "au + a → āva · fire, the purifier", "औ + अ → आव · पावक, अग्नि"),
                    [cell("हरे + ए"), cell("हरये", sub("हरि", "Pum", "Caturthi")), tc("e + e → aye · to Hari", "ए + ए → अये · हरि को")],
                ],
            ),
            formula("वने", "अत्र", "वनेऽत्र", "e + a → e’: the a disappears, ऽ marks the spot",
                    "ए + अ → एऽ: अ लुप्त हो जाता है, ऽ उसकी जगह बताता है", check=snd("वने", "अत्र")),
            watch("{{ऽ}} is not pronounced. {{वनेऽत्र}} is read “vane’tra” — the sign only tells you an a was there.",
                  "{{ऽ}} बोला नहीं जाता। {{वनेऽत्र}} को 'वनेत्र' पढ़ते हैं — चिह्न केवल बताता है कि यहाँ अ था।"),
            tip("You will meet ऽ most often after o: {{सोऽहम्}} “I am that” is सः + अहम् — see the visarga topic.",
                "ऽ सबसे ज़्यादा ओ के बाद मिलेगा: {{सोऽहम्}} 'वह मैं हूँ' = सः + अहम् — विसर्ग वाला विषय देखिए।"),
        ],
        quiz=[
            q(("What does ऽ in {{वनेऽत्र}} stand for?", "{{वनेऽत्र}} में ऽ किसका चिह्न है?"),
              [opt("A lost a", "लुप्त अ का"), opt("A long pause", "लम्बे विराम का"), opt("A nasal sound", "नासिक्य ध्वनि का")],
              0,
              ("वने + अत्र: the a of अत्र was swallowed.", "वने + अत्र: अत्र का अ लुप्त हो गया।")),
        ],
        terms=("sandhi",),
        feature_ids=("VOWEL-SANDHI",),
        related=("sandhi-visarga",),
    ),
    topic(
        "sandhi-visarga",
        level=1,
        title=("What happens to ḥ", "विसर्ग (ः) का क्या होता है"),
        title_sa="विसर्गसन्धिः",
        summary=("A final ḥ turns into s, ś, r or o — or vanishes — depending on the next sound.",
                 "अंतिम ः अगली ध्वनि के हिसाब से स्, श्, र् या ओ बन जाता है — या गायब हो जाता है।"),
        term=("विसर्गः", "the final ḥ", "विसर्ग — अंतिम ः"),
        blocks=[
            text("So many words end in ḥ — {{रामः}}, {{नमः}}, {{हरिः}} — that its changes are everywhere. Four "
                 "patterns cover almost all of them; the table shows each with a real word.",
                 "इतने सारे शब्द ः पर खत्म होते हैं — {{रामः}}, {{नमः}}, {{हरिः}} — कि इसके बदलाव हर जगह दिखते हैं। चार "
                 "नियम लगभग सब समझा देते हैं; तालिका हर एक को असली शब्द के साथ दिखाती है।"),
            table(
                ("Four fates of ḥ", "विसर्ग के चार रूप"),
                [("Parts", "भाग"), ("Joined", "जुड़ा रूप"), ("Rule", "नियम")],
                [
                    _row("नमः", "ते", "नमस्ते", "before t → s", "त से पहले → स्"),
                    _row("रामः", "च", "रामश्च", "before c → ś", "च से पहले → श्"),
                    _row("रामः", "गच्छति", "रामो गच्छति", "-aḥ before a soft sound → -o", "कोमल ध्वनि से पहले -अः → -ओ"),
                    _row("सः", "अहम्", "सोऽहम्", "-aḥ before a → -o’", "अ से पहले -अः → -ओऽ"),
                    _row("हरिः", "गच्छति", "हरिर्गच्छति", "-iḥ, -uḥ before a soft sound → -r", "कोमल ध्वनि से पहले -इः, -उः → -र्"),
                    _row("रामः", "इति", "राम इति", "-aḥ before other vowels → dropped", "अन्य स्वरों से पहले -अः → लोप"),
                    _row("देवाः", "अपि", "देवा अपि", "-āḥ before a soft sound → dropped", "कोमल ध्वनि से पहले -आः → लोप"),
                ],
                note=("“Soft” sounds are vowels, g j ḍ d b, the nasals, y r l v and h.",
                      "'कोमल' ध्वनियाँ: स्वर, ग ज ड द ब, नासिक्य, य र ल व और ह।"),
            ),
            wild(
                ex("धर्मो रक्षति रक्षितः", "Dharma protects those who protect it — धर्मः + रक्षति → धर्मो.",
                   "रक्षा किया गया धर्म रक्षा करता है — धर्मः + रक्षति → धर्मो।",
                   source=src("Manusmṛti 8.15 · motto of R&AW", "मनुस्मृति 8.15 · रॉ का आदर्श-वाक्य"),
                   check=snd("धर्मः", "रक्षति", joined="धर्मोरक्षति")),
                ex("असतो मा सद्गमय", "Lead me from untruth to truth — असतः + मा → असतो मा.",
                   "मुझे असत्य से सत्य की ओर ले चलो — असतः + मा → असतो मा।",
                   source=src("Bṛhadāraṇyaka Upaniṣad 1.3.28", "बृहदारण्यक उपनिषद् 1.3.28"),
                   check=snd("असतः", "मा", joined="असतो मा")),
            ),
            tip("Hindi keeps several: मनोरथ (मनः + रथ), दुर्जन (दुः + जन), निर्धन (निः + धन), निश्चल (निः + चल).",
                "हिन्दी में कई शब्द बचे हैं: मनोरथ (मनः + रथ), दुर्जन (दुः + जन), निर्धन (निः + धन), निश्चल (निः + चल)।"),
        ],
        deeper=[
            go_deeper(
                ("The same rule inside Hindi words", "हिन्दी शब्दों के भीतर वही नियम"),
                examples(
                    ex("मनोरथः", "wish — मनः + रथः", "मनोरथ — मनः + रथः", check=snd("मनः", "रथः")),
                    ex("दुर्जनः", "a wicked person — दुः + जनः", "दुर्जन — दुः + जनः", check=snd("दुः", "जनः")),
                    ex("निर्धनः", "without wealth — निः + धनः", "निर्धन — निः + धनः", check=snd("निः", "धनः")),
                    ex("निश्चलः", "unmoving — निः + चलः", "निश्चल — निः + चलः", check=snd("निः", "चलः")),
                    ex("पुनरागच्छ", "come again — पुनः + आगच्छ", "फिर आओ — पुनः + आगच्छ", check=snd("पुनः", "आगच्छ")),
                ),
            ),
        ],
        quiz=[
            q(("Join: रामः + च", "सन्धि कीजिए: रामः + च"),
              [opt_sa("रामश्च", snd("रामः", "च")), opt_sa("रामो च"), opt_sa("रामर्च")],
              0,
              ("Before c, ḥ becomes ś.", "च से पहले ः, श् बनता है।")),
        ],
        terms=("visarga", "sandhi"),
        feature_ids=("VISARGA-SANDHI",),
        related=("sandhi-consonants", "anusvara-visarga"),
    ),
    topic(
        "sandhi-consonants",
        level=2,
        title=("Consonants that change", "बदलने वाले व्यंजन"),
        title_sa="व्यञ्जनसन्धिः",
        summary=("A final consonant takes on the voice, place or nasal quality of the next sound: सत् + जन → सज्जन.",
                 "अंतिम व्यंजन अगली ध्वनि की घोषता, स्थान या नासिकता ले लेता है: सत् + जन → सज्जन।"),
        term=("व्यञ्जनसन्धिः", "consonant sandhi", "व्यंजन सन्धि"),
        blocks=[
            text("A word-final consonant copies its neighbour. It becomes **voiced** before a voiced sound (t → d), "
                 "turns **nasal** before a nasal (t → n), or **doubles** the next sound (t + c → cc). A final m before "
                 "a consonant becomes ṃ.",
                 "शब्द के अंत का व्यंजन अपने पड़ोसी की नकल करता है। घोष ध्वनि से पहले **घोष** बनता है (त् → द्), नासिक्य से "
                 "पहले **नासिक्य** (त् → न्), या अगली ध्वनि जैसा **दुगना** हो जाता है (त् + च → च्च)। व्यंजन से पहले अंतिम "
                 "म्, ं बन जाता है।"),
            table(
                ("Consonant joins", "व्यंजन सन्धि"),
                [("Parts", "भाग"), ("Joined", "जुड़ा रूप"), ("Rule", "नियम")],
                [
                    _row("जगत्", "ईशः", "जगदीशः", "t → d before a vowel · lord of the world", "स्वर से पहले त् → द् · जगदीश"),
                    _row("दिक्", "गजः", "दिग्गजः", "k → g before g · elephant of a quarter", "ग से पहले क् → ग् · दिग्गज"),
                    _row("सत्", "जनः", "सज्जनः", "t + j → jj · a good person", "त् + ज → ज्ज · सज्जन"),
                    _row("सत्", "चित्", "सच्चित्", "t + c → cc · being and awareness", "त् + च → च्च · सच्चित्"),
                    _row("तत्", "लीनः", "तल्लीनः", "t + l → ll · absorbed in it", "त् + ल → ल्ल · तल्लीन"),
                    _row("जगत्", "नाथः", "जगन्नाथः", "t → n before n · lord of the world", "न से पहले त् → न् · जगन्नाथ"),
                    _row("वाक्", "मयम्", "वाङ्मयम्", "k → ṅ before m · literature", "म से पहले क् → ङ् · वाङ्मय"),
                    _row("उत्", "हारः", "उद्धारः", "t + h → ddh · rescue", "त् + ह → द्ध · उद्धार"),
                    _row("सम्", "सारः", "संसारः", "m → ṃ before a consonant · the world", "व्यंजन से पहले म् → ं · संसार"),
                ],
            ),
            wild(
                ex("असतो मा सद्गमय", "Lead me from untruth to truth — सत् + गमय → सद्गमय.",
                   "मुझे असत्य से सत्य की ओर ले चलो — सत् + गमय → सद्गमय।",
                   source=src("Bṛhadāraṇyaka Upaniṣad 1.3.28", "बृहदारण्यक उपनिषद् 1.3.28"),
                   check=snd("सत्", "गमय", joined="सद्गमय")),
            ),
            tip("In print, a final म् before a consonant is usually written ं: {{अहं गच्छामि}} = अहम् + गच्छामि.",
                "छपाई में व्यंजन से पहले अंतिम म् प्रायः ं लिखा जाता है: {{अहं गच्छामि}} = अहम् + गच्छामि।"),
        ],
        quiz=[
            q(("Join: सत् + जनः", "सन्धि कीजिए: सत् + जनः"),
              [opt_sa("सज्जनः", snd("सत्", "जनः")), opt_sa("सत्जनः"), opt_sa("सद्जनः")],
              0,
              ("t before j becomes j: jj.", "ज से पहले त् भी ज् बन जाता है: ज्ज।")),
        ],
        terms=("sandhi", "vyanjana"),
        feature_ids=("CONSONANT-SANDHI", "ANUSVARA-SANDHI"),
        related=("sandhi-splitting",),
    ),
    topic(
        "sandhi-splitting",
        level=2,
        title=("How to split a sandhi", "सन्धि-विच्छेद कैसे करें"),
        title_sa="सन्धिविच्छेदः",
        summary=("Work backwards: find the tell-tale sound, undo the rule, and check both halves are real words.",
                 "उल्टा चलिए: पहचान वाली ध्वनि खोजिए, नियम उलटिए, और देखिए कि दोनों हिस्से असली शब्द हैं।"),
        term=("सन्धिविच्छेदः", "splitting a join", "सन्धि-विच्छेद"),
        blocks=[
            steps(
                ("Look for a clue: a long vowel, e/o, y or v after a consonant, or ś/s/r/o at a word boundary.",
                 "संकेत खोजिए: दीर्घ स्वर, ए/ओ, व्यंजन के बाद य् या व्, या शब्द-सीमा पर श्/स्/र्/ओ।"),
                ("Undo the rule that could produce it. e might be a + i; ā might be a + a.",
                 "वह नियम उलटिए जिससे यह बन सकता है। ए = अ + इ हो सकता है; आ = अ + अ।"),
                ("Check that both halves are words you know. If not, try the next possible rule.",
                 "देखिए कि दोनों हिस्से पहचाने हुए शब्द हैं। न हों, तो अगला संभव नियम आज़माइए।"),
            ),
            table(
                ("Clues and what they hide", "संकेत और उनमें छिपी बात"),
                [("You see", "दिखता है"), ("Split", "विच्छेद"), ("Clue", "संकेत")],
                [
                    [cell("सूर्योदयः", snd("सूर्य", "उदयः")), cell("सूर्य + उदयः"), tc("o may be a + u", "ओ = अ + उ हो सकता है")],
                    [cell("इत्यादि", snd("इति", "आदि")), cell("इति + आदि"), tc("y before a vowel may be i", "स्वर से पहले य् = इ हो सकता है")],
                    [cell("नमस्ते", snd("नमः", "ते")), cell("नमः + ते"), tc("s before t may be ḥ", "त से पहले स् = ः हो सकता है")],
                    [cell("जगदीशः", snd("जगत्", "ईशः")), cell("जगत् + ईशः"), tc("d before a vowel may be t", "स्वर से पहले द् = त् हो सकता है")],
                ],
            ),
            watch("One join can have more than one honest split. Meaning decides: {{महात्मा}} is महा + आत्मा "
                  "“great soul”, not महात् + मा.",
                  "एक जोड़ के एक से ज़्यादा विच्छेद संभव हैं। अर्थ तय करता है: {{महात्मा}} = महा + आत्मा 'महान आत्मा', "
                  "महात् + मा नहीं।"),
            tip("Try the Word Lab: type a joined word and see every split the rules allow.",
                "शब्द-प्रयोगशाला आज़माइए: जुड़ा शब्द लिखिए और नियमों से संभव हर विच्छेद देखिए।"),
        ],
        quiz=[
            q(("Split {{गणेशः}}:", "{{गणेशः}} का विच्छेद:"),
              [opt_sa("गण + ईशः"), opt_sa("गणे + शः"), opt_sa("गण + एशः")],
              0,
              ("e = a + ī, and गण “host” + ईश “lord” are both words.", "ए = अ + ई, और गण + ईश दोनों शब्द हैं।")),
        ],
        proofs=[
            proof("sandhi", ("Split सूर्योदयः", "सूर्योदयः का विच्छेद देखिए"), joined="सूर्योदयः"),
            proof("sandhi", ("Split नमस्ते", "नमस्ते का विच्छेद देखिए"), joined="नमस्ते"),
        ],
        terms=("sandhi",),
        feature_ids=("VOWEL-SANDHI", "VISARGA-SANDHI", "CONSONANT-SANDHI"),
        related=("sandhi-why", "compounds-intro"),
    ),
]
