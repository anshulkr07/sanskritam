"""Chapter 12 · Verb-made words (kṛdanta) — -tvā/-ya, -tum, -ta/-tavat,
-at/-māna, -tavya/-anīya/-ya, and doer and action nouns. Every form here was
derived by the engine from its root and suffix."""

from __future__ import annotations

from .model import (
    cell, chapter, ex, examples, formula, krd, opt, opt_sa, proof, q, snd, src, sub, table, tc,
    text, tin, tip, topic, w, watch, wild,
)

CHAPTER = chapter(
    "krdanta",
    title=("Verb-made words", "धातु से बने शब्द"),
    title_sa="कृदन्ताः",
    blurb=("“Having gone”, “to go”, “gone”, “going”, “goer” — one root, many words.",
           "'जाकर', 'जाने के लिए', 'गया', 'जाता हुआ', 'जाने वाला' — एक धातु, अनेक शब्द।"),
    icon="construct-outline",
)

_P = dict(linga="Pum", vibhakti="Prathama", vacana="Eka")
_F = dict(linga="Stri", vibhakti="Prathama", vacana="Eka")
_N = dict(linga="Napumsaka", vibhakti="Prathama", vacana="Eka")

TOPICS = [
    topic(
        "ktva-lyap",
        level=1,
        title=("-tvā and -ya: “having done”", "-त्वा और -य: 'करके'"),
        title_sa="क्त्वा ल्यप् च",
        summary=("गत्वा = having gone. With a prefix the ending is -ya instead: आगत्य = having come.",
                 "गत्वा = जाकर। उपसर्ग लगा हो तो अंत -य होता है: आगत्य = आकर।"),
        term=("गत्वा", "having gone", "जाकर"),
        blocks=[
            text("Add **-tvā** to a root and you get “having done it” — Hindi's “-kar”. It never changes form. If the "
                 "verb has a prefix, the ending becomes **-ya**: {{गत्वा}} “having gone”, but {{आगत्य}} “having come”.",
                 "धातु में **-त्वा** जोड़िए, अर्थ होगा 'करके' — हिन्दी का '-कर'। इसका रूप कभी नहीं बदलता। क्रिया में उपसर्ग हो "
                 "तो अंत **-य** हो जाता है: {{गत्वा}} 'जाकर', पर {{आगत्य}} 'आकर'।"),
            table(
                ("-tvā without a prefix", "बिना उपसर्ग: -त्वा"),
                [("Root", "धातु"), ("Having…", "…करके"), ("Meaning", "अर्थ")],
                [
                    ["गम्", cell("गत्वा", krd("गम्", "ktvA")), tc("having gone", "जाकर")],
                    ["पठ्", cell("पठित्वा", krd("पठ्", "ktvA")), tc("having read", "पढ़कर")],
                    ["कृ", cell("कृत्वा", krd("कृ", "ktvA")), tc("having done", "करके")],
                    ["दृश्", cell("दृष्ट्वा", krd("दृश्", "ktvA")), tc("having seen", "देखकर")],
                    ["श्रु", cell("श्रुत्वा", krd("श्रु", "ktvA")), tc("having heard", "सुनकर")],
                    ["पा", cell("पीत्वा", krd("पा", "ktvA")), tc("having drunk", "पीकर")],
                ],
            ),
            table(
                ("-ya after a prefix", "उपसर्ग के बाद: -य"),
                [("Prefix + root", "उपसर्ग + धातु"), ("Having…", "…करके"), ("Meaning", "अर्थ")],
                [
                    ["आ + गम्", cell("आगत्य", krd("गम्", "ktvA", prefixes=["आ"])), tc("having come", "आकर")],
                    ["प्र + आप्", cell("प्राप्य", krd("आप्", "ktvA", prefixes=["प्र"])), tc("having obtained", "पाकर")],
                    ["उद् + स्था", cell("उत्थाय", krd("स्था", "ktvA", prefixes=["उद्"])), tc("having stood up", "उठकर")],
                    ["उप + विश्", cell("उपविश्य", krd("विश्", "ktvA", prefixes=["उप"])), tc("having sat down", "बैठकर")],
                    ["प्र + नम्", cell("प्रणम्य", krd("नम्", "ktvA", prefixes=["प्र"])), tc("having bowed", "प्रणाम करके")],
                ],
            ),
            examples(
                ex("रामः फलं खादित्वा जलं पिबति", "Having eaten the fruit, Rāma drinks water.", "राम फल खाकर पानी पीता है।",
                   w("खादित्वा", "having eaten", "खाकर", krd("खाद्", "ktvA")),
                   w("जलं", "water", "पानी", sub("जल", "Napumsaka", "Dvitiya", form="जलम्")),
                   w("पिबति", "drinks", "पीता है", tin("पा"))),
            ),
            wild(
                ex("उत्तिष्ठत जाग्रत प्राप्य वरान्निबोधत", "Arise, awake; having found the great ones, learn.",
                   "उठो, जागो, और श्रेष्ठ जनों को पाकर ज्ञान प्राप्त करो।",
                   w("उत्तिष्ठत", "arise, all of you", "उठो", tin("स्था", "Lot", "Madhyama", "Bahu", prefixes=["उद्"])),
                   w("प्राप्य", "having obtained", "पाकर", krd("आप्", "ktvA", prefixes=["प्र"])),
                   w("वरान्निबोधत", "the best ones — learn! वरान् + निबोधत", "श्रेष्ठों को — जानो! वरान् + निबोधत",
                     snd("वरान्", "निबोधत")),
                   source=src("Kaṭha Upaniṣad 1.3.14 · Swami Vivekananda's call", "कठोपनिषद् 1.3.14 · स्वामी विवेकानन्द का आह्वान")),
            ),
            watch("The doer of the -tvā action is the doer of the main verb. {{गत्वा खादति}}: the same person goes and eats.",
                  "-त्वा वाली क्रिया का कर्ता वही है जो मुख्य क्रिया का। {{गत्वा खादति}}: जाने वाला और खाने वाला एक ही है।"),
        ],
        quiz=[
            q(("“Having come” (आ + गम्) is…", "'आकर' (आ + गम्) है…"),
              [opt_sa("आगत्य", krd("गम्", "ktvA", prefixes=["आ"])), opt_sa("आगत्वा"), opt_sa("गत्वा", krd("गम्", "ktvA"))],
              0,
              ("With a prefix, -tvā becomes -ya.", "उपसर्ग के साथ -त्वा, -य बन जाता है।")),
        ],
        proofs=[
            proof("derive", ("Watch गत्वा being built", "गत्वा बनते हुए देखिए"), dhatu="गम्", krt="ktvA"),
        ],
        terms=("krdanta", "avyaya", "upasarga"),
        feature_ids=("INDECL",),
        related=("tumun", "participle-clauses"),
    ),
    topic(
        "tumun",
        level=1,
        title=("-tum: “to do”", "-तुम्: 'करने के लिए'"),
        title_sa="तुमुन्",
        summary=("पठितुम् = to read. Use it for purpose: “he goes to school to study”.",
                 "पठितुम् = पढ़ने के लिए। उद्देश्य बताने के लिए: 'वह पढ़ने के लिए विद्यालय जाता है'।"),
        term=("तुमुन्", "the -tum ending: “in order to”", "तुमुन् — '-ने के लिए'"),
        blocks=[
            text("**-tum** turns a root into “to do it” and, like -tvā, never changes. It answers “what for?”: "
                 "{{पठितुम्}} “to read”, {{गन्तुम्}} “to go”.",
                 "**-तुम्** धातु को '-ने के लिए' बना देता है और -त्वा की तरह कभी नहीं बदलता। यह 'किसलिए?' का उत्तर देता है: "
                 "{{पठितुम्}} 'पढ़ने के लिए', {{गन्तुम्}} 'जाने के लिए'।"),
            table(
                ("Common -tum forms", "आम -तुम् रूप"),
                [("Root", "धातु"), ("To…", "…ने के लिए"), ("Meaning", "अर्थ")],
                [
                    ["पठ्", cell("पठितुम्", krd("पठ्", "tumun")), tc("to read", "पढ़ने के लिए")],
                    ["गम्", cell("गन्तुम्", krd("गम्", "tumun")), tc("to go", "जाने के लिए")],
                    ["कृ", cell("कर्तुम्", krd("कृ", "tumun")), tc("to do", "करने के लिए")],
                    ["दृश्", cell("द्रष्टुम्", krd("दृश्", "tumun")), tc("to see", "देखने के लिए")],
                    ["खाद्", cell("खादितुम्", krd("खाद्", "tumun")), tc("to eat", "खाने के लिए")],
                    ["क्रीड्", cell("क्रीडितुम्", krd("क्रीड्", "tumun")), tc("to play", "खेलने के लिए")],
                ],
            ),
            examples(
                ex("सः पठितुं विद्यालयं गच्छति", "He goes to school to study.", "वह पढ़ने के लिए विद्यालय जाता है।",
                   w("पठितुं", "to study", "पढ़ने के लिए", krd("पठ्", "tumun", form="पठितुम्")),
                   w("विद्यालयं", "to school", "विद्यालय", sub("विद्यालय", "Pum", "Dvitiya", form="विद्यालयम्")),
                   w("गच्छति", "goes", "जाता है", tin("गम्"))),
                ex("बालकाः क्रीडितुम् उद्यानं गच्छन्ति", "The children go to the park to play.", "बच्चे खेलने के लिए बगीचे जाते हैं।",
                   w("क्रीडितुम्", "to play", "खेलने के लिए", krd("क्रीड्", "tumun")),
                   w("उद्यानं", "to the park", "बगीचे", sub("उद्यान", "Napumsaka", "Dvitiya", form="उद्यानम्")),
                   w("गच्छन्ति", "go", "जाते हैं", tin("गम्", "Lat", "Prathama", "Bahu"))),
            ),
            formula("गम्", "तुम्", "गन्तुम्", "m → n before t: “to go”", "त से पहले म् → न्: 'जाने के लिए'",
                    check=krd("गम्", "tumun")),
            tip("Before -tum some roots add i: {{पठितुम्}}, {{खादितुम्}}; others don't: {{गन्तुम्}}, {{कर्तुम्}}. The "
                "-ta form usually follows the same pattern: {{पठितः}}, {{गतः}}.",
                "-तुम् से पहले कुछ धातुएँ इ जोड़ती हैं: {{पठितुम्}}, {{खादितुम्}}; कुछ नहीं: {{गन्तुम्}}, {{कर्तुम्}}। -त वाला "
                "रूप प्रायः इसी ढर्रे पर चलता है: {{पठितः}}, {{गतः}}।"),
        ],
        quiz=[
            q(("“to see” =", "'देखने के लिए' ="),
              [opt_sa("द्रष्टुम्", krd("दृश्", "tumun")), opt_sa("दृष्ट्वा", krd("दृश्", "ktvA")), opt_sa("पश्यति", tin("दृश्"))],
              0,
              ("-tum gives purpose; -tvā gives “having seen”.", "-तुम् उद्देश्य बताता है; -त्वा 'देखकर'।")),
        ],
        terms=("krdanta", "avyaya"),
        feature_ids=("INDECL",),
        related=("kta-ktavatu",),
    ),
    topic(
        "kta-ktavatu",
        level=2,
        title=("-ta and -tavat: “gone”, “has gone”", "-त और -तवत्: 'गया', 'गया है'"),
        title_sa="क्त क्तवतू",
        summary=("गतः “gone” and गतवान् “has gone” are the easiest way to talk about the past.",
                 "गतः 'गया हुआ' और गतवान् 'गया' — भूतकाल कहने का सबसे आसान तरीका।"),
        term=("क्तः", "the past participle in -ta", "क्त — भूतकालिक कृदन्त, -त"),
        blocks=[
            text("**-ta** makes a past participle: {{पठितः}} “read”, {{गतः}} “gone”. With an object it is passive: "
                 "{{रामेण पुस्तकं पठितम्}} “the book was read by Rāma”. **-tavat** is its active twin: {{रामः पुस्तकं "
                 "पठितवान्}} “Rāma read the book”. Both act as adjectives and match their noun in gender.",
                 "**-त** भूतकालिक कृदन्त बनाता है: {{पठितः}} 'पढ़ा हुआ', {{गतः}} 'गया हुआ'। कर्म के साथ यह कर्मवाच्य है: "
                 "{{रामेण पुस्तकं पठितम्}} 'राम ने पुस्तक पढ़ी'। **-तवत्** इसका कर्तृवाच्य जोड़ीदार है: {{रामः पुस्तकं "
                 "पठितवान्}}। दोनों विशेषण की तरह अपनी संज्ञा के लिंग से मेल खाते हैं।"),
            table(
                ("By gender", "लिंग के अनुसार"),
                [("Form", "रूप"), ("Masculine", "पुंलिंग"), ("Feminine", "स्त्रीलिंग"), ("Neuter", "नपुंसकलिंग")],
                [
                    [tc("-ta · gone", "-त · गया हुआ"), cell("गतः", krd("गम्", "kta", **_P)),
                     cell("गता", krd("गम्", "kta", **_F)), cell("गतम्", krd("गम्", "kta", **_N))],
                    [tc("-tavat · has gone", "-तवत् · गया"), cell("गतवान्", krd("गम्", "ktavatu", **_P)),
                     cell("गतवती", krd("गम्", "ktavatu", **_F)), cell("गतवत्", krd("गम्", "ktavatu", **_N))],
                ],
            ),
            examples(
                ex("रामः पुस्तकं पठितवान्", "Rāma read the book.", "राम ने पुस्तक पढ़ी।",
                   w("पठितवान्", "has read — masculine, like रामः", "पढ़ी — पुंलिंग, रामः जैसा", krd("पठ्", "ktavatu", **_P))),
                ex("सीता पुस्तकं पठितवती", "Sītā read the book.", "सीता ने पुस्तक पढ़ी।",
                   w("सीता", "Sītā", "सीता", sub("सीता", "Stri")),
                   w("पठितवती", "has read — feminine, like सीता", "पढ़ी — स्त्रीलिंग, सीता जैसा", krd("पठ्", "ktavatu", **_F))),
                ex("रामेण पुस्तकं पठितम्", "The book was read by Rāma.", "राम द्वारा पुस्तक पढ़ी गई।",
                   w("रामेण", "by Rāma", "राम द्वारा", sub("राम", "Pum", "Trtiya")),
                   w("पठितम्", "read — neuter, like पुस्तकम्", "पढ़ी गई — नपुंसक, पुस्तकम् जैसा", krd("पठ्", "kta", **_N))),
            ),
            tip("Spoken modern Sanskrit uses {{-तवान्}} / {{-तवती}} for almost every past: {{अहं भोजनं कृतवान्}} “I ate”.",
                "आधुनिक बोलचाल की संस्कृत लगभग हर भूतकाल के लिए {{-तवान्}} / {{-तवती}} बरतती है: {{अहं भोजनं कृतवान्}} "
                "'मैंने भोजन किया'।"),
            wild(
                ex("धर्मो रक्षति रक्षितः", "Dharma, when protected, protects.", "रक्षा किया गया धर्म रक्षा करता है।",
                   w("रक्षितः", "protected — -ta", "रक्षित — -त", krd("रक्ष्", "kta", **_P)),
                   source=src("Manusmṛti 8.15 · motto of R&AW", "मनुस्मृति 8.15 · रॉ का आदर्श-वाक्य")),
            ),
        ],
        quiz=[
            q(("“She went” =", "'वह गई' ="),
              [opt_sa("सा गतवती"), opt_sa("सा गतवान्"), opt_sa("सा गतम्")],
              0,
              ("Feminine doer → {{गतवती}}.", "स्त्रीलिंग कर्ता → {{गतवती}}।")),
        ],
        terms=("krdanta", "linga"),
        feature_ids=("MASC", "FEM", "NEUT"),
        related=("present-participles", "simple-past"),
    ),
    topic(
        "present-participles",
        level=2,
        title=("-at and -māna: “while doing”", "-अत् और -मान: 'करता हुआ'"),
        title_sa="शतृ शानच्",
        summary=("पठन् “reading”, सेवमानः “serving” — describe someone in the middle of an action.",
                 "पठन् 'पढ़ता हुआ', सेवमानः 'सेवा करता हुआ' — किसी को काम करते हुए बताना।"),
        term=("शतृ", "the -at participle (for -ti verbs)", "शतृ — -अत् वाला कृदन्त (परस्मैपद क्रियाओं के लिए)"),
        blocks=[
            text("-ti verbs make “while doing” with **-at**: {{पठन्}} “reading” (masculine), {{पठन्ती}} (feminine). "
                 "-te verbs use **-māna**: {{सेवमानः}} “serving”. They are adjectives, so they match their noun.",
                 "परस्मैपद (-ति) क्रियाएँ 'करता हुआ' **-अत्** से बनाती हैं: {{पठन्}} 'पढ़ता हुआ', {{पठन्ती}} 'पढ़ती हुई'। "
                 "आत्मनेपद (-ते) क्रियाएँ **-मान** से: {{सेवमानः}} 'सेवा करता हुआ'। ये विशेषण हैं, इसलिए संज्ञा से मेल खाते हैं।"),
            table(
                ("“While doing” by gender", "लिंग के अनुसार 'करता हुआ'"),
                [("Root", "धातु"), ("Masculine", "पुंलिंग"), ("Feminine", "स्त्रीलिंग"), ("Neuter", "नपुंसकलिंग")],
                [
                    ["पठ्", cell("पठन्", krd("पठ्", "Satf", **_P)), cell("पठन्ती", krd("पठ्", "Satf", **_F)),
                     cell("पठत्", krd("पठ्", "Satf", **_N))],
                    ["गम्", cell("गच्छन्", krd("गम्", "Satf", **_P)), cell("गच्छन्ती", krd("गम्", "Satf", **_F)), tc("not used", "प्रयोग नहीं")],
                    ["कृ", cell("कुर्वन्", krd("कृ", "Satf", **_P)), cell("कुर्वती", krd("कृ", "Satf", **_F)), tc("not used", "प्रयोग नहीं")],
                    ["वृध्", cell("वर्धमानः", krd("वृध्", "SAnac", **_P)), cell("वर्धमाना", krd("वृध्", "SAnac", **_F)), tc("not used", "प्रयोग नहीं")],
                ],
            ),
            examples(
                ex("पठन् बालकः हसति", "The boy laughs as he reads.", "बालक पढ़ते-पढ़ते हँसता है।",
                   w("पठन्", "reading", "पढ़ता हुआ", krd("पठ्", "Satf", **_P)),
                   w("बालकः", "boy", "बालक", sub("बालक")),
                   w("हसति", "laughs", "हँसता है", tin("हस्"))),
                ex("गायन्ती बालिका", "a girl who is singing", "गाती हुई बालिका",
                   w("गायन्ती", "singing — feminine", "गाती हुई — स्त्रीलिंग", krd("गै", "Satf", **_F)),
                   w("बालिका", "girl", "बालिका", sub("बालिका", "Stri"))),
            ),
            tip("{{वर्धमानः}} “growing, prospering” is the name of Mahāvīra, and {{सन्}} “being” is behind {{सज्जनः}} "
                "“a good person”.",
                "{{वर्धमानः}} 'बढ़ता हुआ' महावीर का नाम है, और {{सन्}} 'होता हुआ' ही {{सज्जनः}} 'भला व्यक्ति' के मूल में है।"),
        ],
        quiz=[
            q(("“a boy who is going” =", "'जाता हुआ बालक' ="),
              [opt_sa("गच्छन् बालकः"), opt_sa("गच्छन्ती बालकः"), opt_sa("गत्वा बालकः")],
              0,
              ("Masculine noun, masculine participle.", "पुंलिंग संज्ञा, पुंलिंग कृदन्त।")),
        ],
        terms=("krdanta", "parasmaipada", "atmanepada"),
        related=("gerundives", "participle-clauses"),
    ),
    topic(
        "gerundives",
        level=2,
        title=("-tavya, -anīya, -ya: “should be done”", "-तव्य, -अनीय, -य: 'करने योग्य'"),
        title_sa="कृत्यप्रत्ययाः",
        summary=("कर्तव्यम् “to be done, duty”, दर्शनीयम् “worth seeing”, पेयम् “drinkable”.",
                 "कर्तव्यम् 'करने योग्य, कर्तव्य', दर्शनीयम् 'देखने योग्य', पेयम् 'पीने योग्य'।"),
        term=("कर्तव्यम्", "what ought to be done — duty", "कर्तव्य — जो करना चाहिए"),
        blocks=[
            text("Three suffixes mean “ought to be done” or “worth doing”: **-tavya**, **-anīya** and **-ya**. Hindi "
                 "is full of them: कर्तव्य, दर्शनीय, पूजनीय, कार्य, पेय.",
                 "तीन प्रत्ययों का अर्थ 'करना चाहिए' या 'करने योग्य' है: **-तव्य**, **-अनीय** और **-य**। हिन्दी इनसे भरी है: "
                 "कर्तव्य, दर्शनीय, पूजनीय, कार्य, पेय।"),
            table(
                ("Worth doing", "करने योग्य"),
                [("Suffix", "प्रत्यय"), ("Word", "शब्द"), ("Meaning", "अर्थ")],
                [
                    [tc("-tavya", "-तव्य"), cell("कर्तव्यम्", krd("कृ", "tavya", **_N)), tc("to be done, duty", "कर्तव्य")],
                    [tc("-tavya", "-तव्य"), cell("पठितव्यम्", krd("पठ्", "tavya", **_N)), tc("to be read", "पढ़ने योग्य")],
                    [tc("-tavya", "-तव्य"), cell("वक्तव्यम्", krd("वच्", "tavya", **_N)), tc("to be said, a statement", "वक्तव्य")],
                    [tc("-anīya", "-अनीय"), cell("करणीयम्", krd("कृ", "anIyar", **_N)), tc("to be done", "करणीय")],
                    [tc("-anīya", "-अनीय"), cell("दर्शनीयम्", krd("दृश्", "anIyar", **_N)), tc("worth seeing", "दर्शनीय")],
                    [tc("-anīya", "-अनीय"), cell("पूजनीयः", krd("पूज्", "anIyar", **_P)), tc("worthy of worship", "पूजनीय")],
                    [tc("-ya", "-य"), cell("कार्यम्", krd("कृ", "Ryat", **_N)), tc("work, a task", "कार्य")],
                    [tc("-ya", "-य"), cell("पेयम्", krd("पा", "yat", **_N)), tc("a drink", "पेय")],
                ],
            ),
            examples(
                ex("त्वया पुस्तकं पठितव्यम्", "You should read the book.", "तुम्हें पुस्तक पढ़नी चाहिए।",
                   w("त्वया", "by you", "तुम्हारे द्वारा", sub("युष्मद्", "Pum", "Trtiya")),
                   w("पुस्तकं", "the book", "पुस्तक", sub("पुस्तक", "Napumsaka", form="पुस्तकम्")),
                   w("पठितव्यम्", "should be read", "पढ़ी जानी चाहिए", krd("पठ्", "tavya", **_N))),
            ),
            watch("These are passive: the one who should act goes in the 3rd case — {{त्वया}} “by you”, not {{त्वम्}}.",
                  "ये कर्मवाच्य हैं: जिसे करना चाहिए वह तृतीया में आता है — {{त्वया}}, {{त्वम्}} नहीं।"),
        ],
        quiz=[
            q(("“worth seeing” =", "'देखने योग्य' ="),
              [opt_sa("दर्शनीयम्", krd("दृश्", "anIyar", **_N)), opt_sa("दृष्टम्"), opt_sa("द्रष्टुम्", krd("दृश्", "tumun"))],
              0,
              ("-anīya: “worth doing”.", "-अनीय: 'करने योग्य'।")),
        ],
        terms=("krdanta",),
        related=("doer-action-nouns", "passive"),
    ),
    topic(
        "doer-action-nouns",
        level=2,
        title=("Doers and actions: कर्ता, पाठक, भोजन", "कर्ता और क्रिया: कर्ता, पाठक, भोजन"),
        title_sa="कर्तृकर्मनामानि",
        summary=("-tṛ and -aka make “the one who does”; -ana and -a make “the doing”.",
                 "-तृ और -अक 'करने वाला' बनाते हैं; -अन और -अ 'करना' (क्रिया का नाम) बनाते हैं।"),
        term=("कर्ता", "the doer", "कर्ता — करने वाला"),
        blocks=[
            text("Most Hindi nouns of this kind come straight from Sanskrit roots. **-tṛ** and **-aka** make the doer: "
                 "{{नेता}} “leader”, {{गायकः}} “singer”. **-ana** and **-a** name the action itself: {{भोजनम्}} "
                 "“eating, a meal”, {{त्यागः}} “giving up”.",
                 "हिन्दी की ऐसी ज़्यादातर संज्ञाएँ सीधे संस्कृत धातुओं से आई हैं। **-तृ** और **-अक** करने वाला बनाते हैं: "
                 "{{नेता}}, {{गायकः}}। **-अन** और **-अ** स्वयं क्रिया का नाम देते हैं: {{भोजनम्}} 'खाना, भोजन', {{त्यागः}}।"),
            table(
                ("The doer", "करने वाला"),
                [("Root", "धातु"), ("-tṛ", "-तृ"), ("-aka", "-अक")],
                [
                    ["कृ", cell("कर्ता", krd("कृ", "tfc", **_P)), cell("कारकः", krd("कृ", "Rvul", **_P))],
                    ["नी", cell("नेता", krd("नी", "tfc", **_P)), cell("नायकः", krd("नी", "Rvul", **_P))],
                    ["दा", cell("दाता", krd("दा", "tfc", **_P)), tc("not used", "प्रयोग नहीं")],
                    ["पठ्", tc("not used", "प्रयोग नहीं"), cell("पाठकः", krd("पठ्", "Rvul", **_P))],
                    ["गै", tc("not used", "प्रयोग नहीं"), cell("गायकः", krd("गै", "Rvul", **_P))],
                    ["लिख्", tc("not used", "प्रयोग नहीं"), cell("लेखकः", krd("लिख्", "Rvul", **_P))],
                ],
            ),
            table(
                ("The action", "क्रिया का नाम"),
                [("Root", "धातु"), ("Word", "शब्द"), ("Meaning", "अर्थ")],
                [
                    ["भुज्", cell("भोजनम्", krd("भुज्", "lyuw", **_N)), tc("eating, a meal", "भोजन")],
                    ["दा", cell("दानम्", krd("दा", "lyuw", **_N)), tc("giving, a gift", "दान")],
                    ["ज्ञा", cell("ज्ञानम्", krd("ज्ञा", "lyuw", **_N)), tc("knowing, knowledge", "ज्ञान")],
                    ["गम्", cell("गमनम्", krd("गम्", "lyuw", **_N)), tc("going", "गमन")],
                    ["त्यज्", cell("त्यागः", krd("त्यज्", "GaY", **_P)), tc("giving up", "त्याग")],
                    ["भू", cell("भावः", krd("भू", "GaY", **_P)), tc("being, feeling", "भाव")],
                ],
            ),
            watch("The doer words take vṛddhi or guṇa of the root vowel: पठ् → {{पाठकः}}, नी → {{नायकः}}, कृ → {{कारकः}}.",
                  "करने वाले शब्दों में धातु का स्वर वृद्धि या गुण लेता है: पठ् → {{पाठकः}}, नी → {{नायकः}}, कृ → {{कारकः}}।"),
            tip("{{कर्ता}} declines like {{पिता}}: {{कर्तारम्}}, {{कर्त्रा}} — see the ṛ-stems topic.",
                "{{कर्ता}} के रूप {{पिता}} जैसे चलते हैं: {{कर्तारम्}}, {{कर्त्रा}} — ऋ-अंत शब्दों वाला विषय देखिए।"),
        ],
        quiz=[
            q(("“reader” from पठ् =", "पठ् से 'पढ़ने वाला' ="),
              [opt_sa("पाठकः", krd("पठ्", "Rvul", **_P)), opt_sa("पठनम्", krd("पठ्", "lyuw", **_N)), opt_sa("पठितः", krd("पठ्", "kta", **_P))],
              0,
              ("-aka makes the doer.", "-अक करने वाला बनाता है।")),
        ],
        terms=("krdanta", "pratyaya"),
        related=("prefixes", "r-stems"),
    ),
]
