"""Chapter 13 · Prefixes & voice — upasargas, active → passive, causative,
and desiderative / intensive verbs. Every verb here was derived by the
engine with its prefixes, voice or derived-verb suffix."""

from __future__ import annotations

from .model import (
    cell, chapter, ex, examples, formula, krd, opt, opt_sa, proof, q, snd, src, sub, table, tc,
    text, tin, tip, topic, w, watch, wild,
)

CHAPTER = chapter(
    "voice",
    title=("Prefixes & voice", "उपसर्ग और वाच्य"),
    title_sa="उपसर्गाः वाच्यानि च",
    blurb=("आ-गच्छति, पठ्-य-ते, गम्-अय-ति — small additions that change who does what.",
           "आ-गच्छति, पठ्-य-ते, गम्-अय-ति — छोटे जोड़ जो अर्थ और कर्ता बदल देते हैं।"),
    icon="swap-horizontal-outline",
)

_P = dict(linga="Pum", vibhakti="Prathama", vacana="Eka")

TOPICS = [
    topic(
        "prefixes",
        level=1,
        title=("Prefixes change the meaning", "उपसर्ग अर्थ बदलते हैं"),
        title_sa="उपसर्गः",
        summary=("आ + गच्छति “goes” = आगच्छति “comes”. Twenty-two small prefixes bend a root's meaning.",
                 "आ + गच्छति 'जाता है' = आगच्छति 'आता है'। बाईस छोटे उपसर्ग धातु का अर्थ मोड़ देते हैं।"),
        term=("उपसर्गः", "verb prefix", "उपसर्ग"),
        blocks=[
            text("A prefix sits before a root and shifts its meaning — sometimes a little, sometimes completely. "
                 "{{गच्छति}} “goes”, {{आगच्छति}} “comes”, {{अवगच्छति}} “understands”. The endings don't change at all.",
                 "उपसर्ग धातु से पहले लगकर उसका अर्थ बदलता है — कभी थोड़ा, कभी पूरी तरह। {{गच्छति}} 'जाता है', "
                 "{{आगच्छति}} 'आता है', {{अवगच्छति}} 'समझता है'। प्रत्यय बिल्कुल नहीं बदलते।"),
            table(
                ("One root, many prefixes: गम् “go”", "एक धातु, अनेक उपसर्ग: गम् 'जाना'"),
                [("Prefix", "उपसर्ग"), ("Verb", "क्रिया"), ("Meaning", "अर्थ")],
                [
                    ["आ", cell("आगच्छति", tin("गम्", prefixes=["आ"])), tc("comes", "आता है")],
                    ["अव", cell("अवगच्छति", tin("गम्", prefixes=["अव"])), tc("understands", "समझता है")],
                    ["अनु", cell("अनुगच्छति", tin("गम्", prefixes=["अनु"])), tc("follows", "पीछे चलता है")],
                    ["उप", cell("उपगच्छति", tin("गम्", prefixes=["उप"])), tc("approaches", "पास जाता है")],
                    ["निर्", cell("निर्गच्छति", tin("गम्", prefixes=["निस्"])), tc("goes out", "बाहर निकलता है")],
                    ["अप", cell("अपगच्छति", tin("गम्", prefixes=["अप"])), tc("goes away", "दूर जाता है")],
                    ["प्रति", cell("प्रतिगच्छति", tin("गम्", prefixes=["प्रति"])), tc("goes back", "लौटता है")],
                ],
            ),
            examples(
                ex("अनुभवति", "experiences — अनु + भू “be”", "अनुभव करता है — अनु + भू", check=tin("भू", prefixes=["अनु"])),
                ex("उपविशति", "sits down — उप + विश् “enter”", "बैठता है — उप + विश्", check=tin("विश्", prefixes=["उप"])),
                ex("विस्मरति", "forgets — वि + स्मृ “remember”", "भूल जाता है — वि + स्मृ", check=tin("स्मृ", prefixes=["वि"])),
                ex("उत्तिष्ठति", "stands up — उद् + स्था “stand”", "उठता है — उद् + स्था", check=tin("स्था", prefixes=["उद्"])),
                title=("Meanings that move far", "दूर तक बदलते अर्थ"),
            ),
            wild(
                ex("उपसर्गेण धात्वर्थो बलादन्यत्र नीयते। प्रहाराहारसंहारविहारपरिहारवत्॥",
                   "A prefix forcibly carries a root's meaning elsewhere — as in prahāra, āhāra, saṃhāra, vihāra, parihāra.",
                   "उपसर्ग धातु के अर्थ को बलपूर्वक कहीं और ले जाता है — जैसे प्रहार, आहार, संहार, विहार, परिहार।",
                   w("नीयते", "is carried", "ले जाया जाता है", tin("नी", prayoga="Karmani")),
                   source=src("Traditional verse of the grammarians", "वैयाकरणों का पारम्परिक श्लोक")),
            ),
            table(
                ("हृ “carry” + five prefixes", "हृ 'ले जाना' + पाँच उपसर्ग"),
                [("Prefix", "उपसर्ग"), ("Noun", "संज्ञा"), ("Meaning", "अर्थ")],
                [
                    ["प्र", cell("प्रहारः", krd("हृ", "GaY", prefixes=["प्र"], **_P)), tc("a blow", "चोट, प्रहार")],
                    ["आ", cell("आहारः", krd("हृ", "GaY", prefixes=["आ"], **_P)), tc("food", "भोजन, आहार")],
                    ["सम्", cell("संहारः", krd("हृ", "GaY", prefixes=["सम्"], **_P)), tc("destruction", "विनाश, संहार")],
                    ["वि", cell("विहारः", krd("हृ", "GaY", prefixes=["वि"], **_P)), tc("roaming, a retreat", "भ्रमण, विहार")],
                    ["परि", cell("परिहारः", krd("हृ", "GaY", prefixes=["परि"], **_P)), tc("avoiding", "त्याग, परिहार")],
                ],
            ),
            watch("In the past tense the a- goes **after** the prefix: {{आगच्छत्}} “came” = आ + अ + गच्छत्.",
                  "भूतकाल (लङ्) में अ- उपसर्ग के **बाद** आता है: {{आगच्छत्}} 'आया' = आ + अ + गच्छत्।"),
        ],
        quiz=[
            q(("{{अवगच्छति}} means…", "{{अवगच्छति}} का अर्थ है…"),
              [opt("understands", "समझता है"), opt("comes", "आता है"), opt("goes out", "बाहर जाता है")],
              0,
              ("अव + गम् shifted from “go” to “understand”.", "अव + गम् का अर्थ 'जाना' से 'समझना' हो गया।")),
        ],
        proofs=[
            proof("derive", ("Watch आगच्छति being built", "आगच्छति बनते हुए देखिए"),
                  dhatu="गम्", lakara="Lat", purusha="Prathama", vacana="Eka", prefixes="आ"),
        ],
        terms=("upasarga", "dhatu"),
        related=("passive", "doer-action-nouns"),
    ),
    topic(
        "passive",
        level=2,
        title=("Active → passive", "कर्तृवाच्य → कर्मवाच्य"),
        title_sa="कर्मवाच्यम्",
        summary=("रामः पुस्तकं पठति → रामेण पुस्तकं पठ्यते: the doer takes the 3rd case, the verb gets -ya- and -te.",
                 "रामः पुस्तकं पठति → रामेण पुस्तकं पठ्यते: कर्ता तृतीया में, क्रिया में -य- और -ते।"),
        term=("कर्मवाच्यम्", "passive voice — the object leads", "कर्मवाच्य — कर्म प्रधान"),
        blocks=[
            text("Three changes make a passive. The **doer** moves to the 3rd case ({{रामः}} → {{रामेण}}). The "
                 "**object** moves to the 1st case. The **verb** adds -ya- and takes -te endings, agreeing with the "
                 "object: {{पठ्यते}}.",
                 "कर्मवाच्य बनाने के तीन बदलाव हैं। **कर्ता** तृतीया में जाता है ({{रामः}} → {{रामेण}})। **कर्म** प्रथमा में आता "
                 "है। **क्रिया** में -य- जुड़ता है और -ते वाले प्रत्यय लगते हैं, जो कर्म से मेल खाते हैं: {{पठ्यते}}।"),
            examples(
                ex("रामः पुस्तकं पठति", "Rāma reads the book. (active)", "राम पुस्तक पढ़ता है। (कर्तृवाच्य)",
                   w("रामः", "Rāma — doer, 1st case", "राम — कर्ता, प्रथमा", sub("राम")),
                   w("पठति", "reads", "पढ़ता है", tin("पठ्"))),
                ex("रामेण पुस्तकं पठ्यते", "The book is read by Rāma. (passive)", "राम द्वारा पुस्तक पढ़ी जाती है। (कर्मवाच्य)",
                   w("रामेण", "by Rāma — 3rd case", "राम द्वारा — तृतीया", sub("राम", "Pum", "Trtiya")),
                   w("पुस्तकं", "the book — 1st case now", "पुस्तक — अब प्रथमा", sub("पुस्तक", "Napumsaka", form="पुस्तकम्")),
                   w("पठ्यते", "is read", "पढ़ी जाती है", tin("पठ्", prayoga="Karmani"))),
                ex("बालकेन फलानि खाद्यन्ते", "The fruits are eaten by the boy.", "बालक द्वारा फल खाए जाते हैं।",
                   w("बालकेन", "by the boy", "बालक द्वारा", sub("बालक", "Pum", "Trtiya")),
                   w("फलानि", "fruits — many", "फल — बहुवचन", sub("फल", "Napumsaka", "Prathama", "Bahu")),
                   w("खाद्यन्ते", "are eaten — plural, like फलानि", "खाए जाते हैं — फलानि जैसा बहुवचन",
                     tin("खाद्", "Lat", "Prathama", "Bahu", prayoga="Karmani"))),
            ),
            table(
                ("Active and passive side by side", "कर्तृवाच्य और कर्मवाच्य साथ-साथ"),
                [("Root", "धातु"), ("Active", "कर्तृवाच्य"), ("Passive", "कर्मवाच्य")],
                [
                    ["गम्", cell("गच्छति", tin("गम्")), cell("गम्यते", tin("गम्", prayoga="Karmani"))],
                    ["कृ", cell("करोति", tin("कृ")), cell("क्रियते", tin("कृ", prayoga="Karmani"))],
                    ["दृश्", cell("पश्यति", tin("दृश्")), cell("दृश्यते", tin("दृश्", prayoga="Karmani"))],
                    ["श्रु", cell("शृणोति", tin("श्रु")), cell("श्रूयते", tin("श्रु", prayoga="Karmani"))],
                    ["वच्", cell("वक्ति", tin("वच्")), cell("उच्यते", tin("वच्", prayoga="Karmani"))],
                    ["गै", cell("गायति", tin("गै")), cell("गीयते", tin("गै", prayoga="Karmani"))],
                    ["लिख्", cell("लिखति", tin("लिख्")), cell("लिख्यते", tin("लिख्", prayoga="Karmani"))],
                ],
            ),
            watch("The passive stem is built on the root, not the present stem: {{पश्यति}} but {{दृश्यते}}, {{वक्ति}} but "
                  "{{उच्यते}}.",
                  "कर्मवाच्य धातु से बनता है, वर्तमान-रूप से नहीं: {{पश्यति}} पर {{दृश्यते}}, {{वक्ति}} पर {{उच्यते}}।"),
            tip("With no object, the passive is impersonal: {{मया हस्यते}} “laughing is done by me” = I laugh. "
                "Grammar calls this {{भाववाच्यम्}}.",
                "कर्म न हो तो कर्मवाच्य भाववाच्य बन जाता है: {{मया हस्यते}} 'मुझसे हँसा जाता है'। इसे {{भाववाच्यम्}} कहते हैं।"),
        ],
        quiz=[
            q(("Passive of {{कविः ग्रन्थं लिखति}}:", "{{कविः ग्रन्थं लिखति}} का कर्मवाच्य:"),
              [opt_sa("कविना ग्रन्थः लिख्यते"), opt_sa("कविः ग्रन्थः लिख्यते"), opt_sa("कविना ग्रन्थं लिखति")],
              0,
              ("Doer → 3rd case, object → 1st case, verb → -yate.", "कर्ता → तृतीया, कर्म → प्रथमा, क्रिया → -यते।")),
        ],
        proofs=[
            proof("paradigm", ("See the full passive grid of पठ्", "पठ् के कर्मवाच्य के सारे रूप देखिए"),
                  dhatu="पठ्", lakara="Lat", prayoga="Karmani"),
        ],
        terms=("vacya", "atmanepada", "karaka"),
        feature_ids=("ATMANEPADA",),
        related=("causative", "instrumental"),
    ),
    topic(
        "causative",
        level=2,
        title=("Causative: “makes someone do”", "प्रेरणार्थक: 'करवाना'"),
        title_sa="णिजन्तम्",
        summary=("पठति “reads” → पाठयति “makes read, teaches”. Strengthen the root and add -aya-.",
                 "पठति 'पढ़ता है' → पाठयति 'पढ़ाता है'। धातु का स्वर बढ़ाइए और -अय- जोड़िए।"),
        term=("णिच्", "the causative suffix -aya-", "णिच् — प्रेरणार्थक -अय-"),
        blocks=[
            text("To say “make someone do it”, strengthen the root's vowel and add **-aya-**: {{पठति}} “reads” → "
                 "{{पाठयति}} “makes read, teaches”. It is Hindi's पढ़ना → पढ़ाना, करना → कराना.",
                 "'किसी से करवाना' कहने के लिए धातु का स्वर बढ़ाइए और **-अय-** जोड़िए: {{पठति}} 'पढ़ता है' → {{पाठयति}} "
                 "'पढ़ाता है'। यह हिन्दी का पढ़ना → पढ़ाना, करना → कराना है।"),
            table(
                ("Doing and making do", "करना और करवाना"),
                [("Root", "धातु"), ("Does", "करता है"), ("Makes do", "करवाता है")],
                [
                    ["पठ्", cell("पठति", tin("पठ्")), cell("पाठयति", tin("पठ्", sanadi=["Nic"]))],
                    ["कृ", cell("करोति", tin("कृ")), cell("कारयति", tin("कृ", sanadi=["Nic"]))],
                    ["गम्", cell("गच्छति", tin("गम्")), cell("गमयति", tin("गम्", sanadi=["Nic"]))],
                    ["दृश्", cell("पश्यति", tin("दृश्")), cell("दर्शयति", tin("दृश्", sanadi=["Nic"]))],
                    ["पा", cell("पिबति", tin("पा")), cell("पाययति", tin("पा", sanadi=["Nic"]))],
                    ["स्था", cell("तिष्ठति", tin("स्था")), cell("स्थापयति", tin("स्था", sanadi=["Nic"]))],
                    ["भुज्", tc("eats", "खाता है"), cell("भोजयति", tin("भुज्", sanadi=["Nic"]))],
                ],
            ),
            examples(
                ex("शिक्षकः छात्रं पाठयति", "The teacher teaches the student.", "शिक्षक छात्र को पढ़ाता है।",
                   w("शिक्षकः", "teacher", "शिक्षक", sub("शिक्षक")),
                   w("छात्रं", "the student — made to read", "छात्र को — जिससे पढ़वाया जाए", sub("छात्र", "Pum", "Dvitiya", form="छात्रम्")),
                   w("पाठयति", "makes read, teaches", "पढ़ाता है", tin("पठ्", sanadi=["Nic"]))),
                ex("माता पुत्रं भोजयति", "The mother feeds her son.", "माता पुत्र को भोजन कराती है।",
                   w("माता", "mother", "माता", sub("मातृ", "Stri")),
                   w("पुत्रं", "son", "पुत्र को", sub("पुत्र", "Pum", "Dvitiya", form="पुत्रम्")),
                   w("भोजयति", "makes eat, feeds", "खिलाती है", tin("भुज्", sanadi=["Nic"]))),
            ),
            wild(
                ex("तमसो मा ज्योतिर्गमय", "Lead me from darkness to light.", "मुझे अंधकार से प्रकाश की ओर ले चलो।",
                   w("तमसो", "from darkness — तमसः", "अंधकार से — तमसः", snd("तमसः", "मा", joined="तमसो मा")),
                   w("ज्योतिर्गमय", "to light, make me go — ज्योतिः + गमय", "प्रकाश की ओर ले चलो — ज्योतिः + गमय",
                     snd("ज्योतिः", "गमय")),
                   source=src("Bṛhadāraṇyaka Upaniṣad 1.3.28", "बृहदारण्यक उपनिषद् 1.3.28")),
            ),
            formula("गम्", "अय", "गमय", "go + make → “make go, lead!”", "जाना + करवाना → 'ले चलो!'",
                    check=tin("गम्", "Lot", "Madhyama", sanadi=["Nic"])),
        ],
        quiz=[
            q(("“makes see, shows” =", "'दिखाता है' ="),
              [opt_sa("दर्शयति", tin("दृश्", sanadi=["Nic"])), opt_sa("पश्यति", tin("दृश्")), opt_sa("दृश्यते", tin("दृश्", prayoga="Karmani"))],
              0,
              ("दृश् + causative → {{दर्शयति}}.", "दृश् + णिच् → {{दर्शयति}}।")),
        ],
        terms=("nijanta", "guna", "vrddhi"),
        related=("desiderative", "passive"),
    ),
    topic(
        "desiderative",
        level=3,
        title=("“Wants to”: desiderative and intensive verbs", "'चाहना': सन्नन्त और यङन्त क्रियाएँ"),
        title_sa="सन्नन्तं यङन्तं च",
        summary=("पिबति “drinks” → पिपासति “wants to drink, is thirsty”. Reduplicate the root and add -sa-.",
                 "पिबति 'पीता है' → पिपासति 'पीना चाहता है, प्यासा है'। धातु को दोहराइए और -स- जोड़िए।"),
        term=("सन्", "the desiderative suffix -sa-", "सन् — इच्छार्थक -स-"),
        blocks=[
            text("Sanskrit can build “wants to do” into the verb: repeat the first syllable of the root and add "
                 "**-sa-**. {{पिपासति}} “wants to drink”, {{जिज्ञासते}} “wants to know”. Hindi keeps the nouns: "
                 "पिपासा “thirst”, जिज्ञासा “curiosity”.",
                 "संस्कृत 'करना चाहता है' को क्रिया में ही बना सकती है: धातु का पहला अक्षर दोहराइए और **-स-** जोड़िए। "
                 "{{पिपासति}} 'पीना चाहता है', {{जिज्ञासते}} 'जानना चाहता है'। हिन्दी संज्ञाएँ रखती है: पिपासा, जिज्ञासा।"),
            table(
                ("Does and wants to do", "करता है और करना चाहता है"),
                [("Root", "धातु"), ("Wants to…", "…चाहता है"), ("Meaning", "अर्थ")],
                [
                    ["पा", cell("पिपासति", tin("पा", sanadi=["San"])), tc("wants to drink, is thirsty", "पीना चाहता है")],
                    ["गम्", cell("जिगमिषति", tin("गम्", sanadi=["San"])), tc("wants to go", "जाना चाहता है")],
                    ["पठ्", cell("पिपठिषति", tin("पठ्", sanadi=["San"])), tc("wants to read", "पढ़ना चाहता है")],
                    ["ज्ञा", cell("जिज्ञासते", tin("ज्ञा", sanadi=["San"])), tc("wants to know", "जानना चाहता है")],
                ],
            ),
            examples(
                ex("जिज्ञासुः", "one who wants to know, a seeker", "जानने की इच्छा रखने वाला", check=sub("जिज्ञासु")),
            ),
            text("A second pattern, the **intensive**, means “does again and again” or “does intensely”: "
                 "{{देदीप्यते}} “blazes brightly”, familiar from Hindi देदीप्यमान.",
                 "दूसरा ढर्रा, **यङन्त**, 'बार-बार करना' या 'ज़ोर से करना' बताता है: {{देदीप्यते}} 'खूब चमकता है', "
                 "जो हिन्दी के देदीप्यमान से परिचित है।"),
            table(
                ("Intensive verbs", "यङन्त क्रियाएँ"),
                [("Root", "धातु"), ("Intensive", "यङन्त"), ("Meaning", "अर्थ")],
                [
                    ["दीप्", cell("देदीप्यते", tin("दीप्", sanadi=["Yan"])), tc("blazes brightly", "खूब चमकता है")],
                    ["भू", cell("बोभूयते", tin("भू", sanadi=["Yan"])), tc("becomes again and again", "बार-बार होता है")],
                ],
            ),
            watch("These verbs are rare in everyday Sanskrit; you will mostly meet their nouns and adjectives.",
                  "रोज़ की संस्कृत में ये क्रियाएँ कम मिलती हैं; ज़्यादातर इनकी संज्ञाएँ और विशेषण ही दिखेंगे।"),
        ],
        quiz=[
            q(("{{जिगमिषति}} means…", "{{जिगमिषति}} का अर्थ है…"),
              [opt("wants to go", "जाना चाहता है"), opt("makes go", "भेजता है"), opt("is gone", "जाया जाता है")],
              0,
              ("Reduplication + -sa-: desire.", "द्वित्व + -स-: इच्छा।")),
        ],
        terms=("dhatu",),
        related=("causative", "verb-classes"),
    ),
]
