"""Chapter 5 · Pronouns & numbers, part B — who/which, polite “you”, numbers
1–10, bigger numbers and telling time. Assembled in ``c05_pronouns``.

Engine gaps respected here: the engine cannot derive masculine भवत् (it
declines it as a plain consonant stem), so those forms are shown unchecked;
neuter इदानि/त्रिणि are engine errors and are never displayed."""

from __future__ import annotations

from ._families_common import noun_table
from .model import (
    cell, ex, examples, fact, go_deeper, opt, opt_sa, q, src, sub, table, tc, text, tin,
    tip, topic, w, watch, wild,
)

TOPICS_B = [
    topic(
        "pronoun-who-which",
        level=1,
        title=("Who, what, which: किम् and यद्", "कौन, क्या, जो: किम् और यद्"),
        title_sa="किम् यद् च",
        summary=("किम् asks “who? what?”; यद् answers back as “who, which” and pairs with तद् “that”.",
                 "किम् पूछता है 'कौन? क्या?'; यद् 'जो' के अर्थ में आता है और तद् 'वह' के साथ जोड़ी बनाता है।"),
        term=("कः", "who? (masculine)", "कौन? (पुंलिंग)", sub("किम्")),
        blocks=[
            text("{{किम्}} declines just like तद्, with k in place of t: {{कः}}, {{का}}, {{किम्}}. {{यद्}} does the "
                 "same with y — {{यः}}, {{या}}, {{यत्}} — and means “who” or “which” in the sense of “the one "
                 "who”. It almost always has a तद् partner.",
                 "{{किम्}} के रूप तद् जैसे ही हैं, बस त की जगह क: {{कः}}, {{का}}, {{किम्}}। {{यद्}} य के साथ यही "
                 "करता है — {{यः}}, {{या}}, {{यत्}} — और इसका अर्थ है 'जो'। इसके साथ लगभग हमेशा तद् की जोड़ी "
                 "होती है।"),
            noun_table("किम्", "Pum", [
                "कः कौ के", "कम् कौ कान्", "केन काभ्याम् कैः", "कस्मै काभ्याम् केभ्यः",
                "कस्मात् काभ्याम् केभ्यः", "कस्य कयोः केषाम्", "कस्मिन् कयोः केषु",
            ], ("कः “who?” — masculine", "कः 'कौन?' — पुंलिंग"), highlight=False),
            table(
                ("Question words that never change", "कभी न बदलने वाले प्रश्न-शब्द"),
                [("Word", "शब्द"), ("Meaning", "अर्थ")],
                [
                    ["कुत्र", tc("where?", "कहाँ?")],
                    ["कदा", tc("when?", "कब?")],
                    ["कथम्", tc("how?", "कैसे?")],
                    ["किमर्थम्", tc("why? for what?", "क्यों? किसलिए?")],
                    ["कति", tc("how many?", "कितने?")],
                ],
            ),
            examples(
                ex("कः अत्र आगच्छति", "Who is coming here?", "यहाँ कौन आ रहा है?",
                   w("कः", "who", "कौन", sub("किम्")),
                   w("अत्र", "here", "यहाँ"),
                   w("आगच्छति", "comes", "आता है", tin("गम्", prefixes=["आ"]))),
                ex("किं करोषि", "What are you doing?", "तुम क्या कर रहे हो?",
                   w("किं", "what", "क्या", sub("किम्", "Napumsaka", "Dvitiya")),
                   w("करोषि", "you do", "करते हो", tin("कृ", "Lat", "Madhyama"))),
                ex("यः पठति सः जानाति", "The one who reads, knows.", "जो पढ़ता है, वह जानता है।",
                   w("यः", "who, the one who", "जो", sub("यद्")),
                   w("पठति", "reads", "पढ़ता है", tin("पठ्")),
                   w("सः", "he, that one", "वह", sub("तद्")),
                   w("जानाति", "knows", "जानता है", tin("ज्ञा"))),
            ),
            tip("Hindi works the same way: “jo… vo…”. Sanskrit's {{यः… सः…}} is the ancestor of that "
                "pattern.",
                "हिन्दी में भी यही ढाँचा है: 'जो… वह…'। संस्कृत का {{यः… सः…}} उसी का पूर्वज है।"),
            wild(
                ex("यतो धर्मस्ततो जयः", "Where there is dharma, there is victory.", "जहाँ धर्म है, वहाँ विजय है।",
                   w("यतो", "from where, where", "जहाँ"),
                   w("धर्मस्", "dharma", "धर्म", sub("धर्म", form="धर्मः")),
                   w("ततो", "from there, there", "वहाँ"),
                   w("जयः", "victory", "विजय", sub("जय")),
                   source=src("Mahābhārata · motto of the Supreme Court of India",
                              "महाभारत · भारत के सर्वोच्च न्यायालय का आदर्श-वाक्य")),
            ),
        ],
        deeper=[
            go_deeper(
                ("Pairs built from य and त", "य और त से बनी जोड़ियाँ"),
                table(
                    ("Relative and answering words", "सम्बन्ध-वाचक और उत्तर देने वाले शब्द"),
                    [("Relative", "सम्बन्ध"), ("Answer", "उत्तर"), ("Meaning", "अर्थ")],
                    [
                        ["यत्र", "तत्र", tc("where… there", "जहाँ… वहाँ")],
                        ["यदा", "तदा", tc("when… then", "जब… तब")],
                        ["यथा", "तथा", tc("as… so", "जैसे… वैसे")],
                        ["यावत्", "तावत्", tc("as long as… so long", "जब तक… तब तक")],
                    ],
                ),
            ),
        ],
        quiz=[
            q(("“Who (a woman) is singing?” = ___ {{गायति}}", "'कौन (स्त्री) गा रही है?' = ___ {{गायति}}"),
              [opt_sa("का", sub("किम्", "Stri")), opt_sa("कः", sub("किम्")), opt_sa("किम्", sub("किम्", "Napumsaka"))],
              0,
              ("A woman takes the feminine: {{का}}.", "स्त्री के लिए स्त्रीलिंग: {{का}}।")),
        ],
        terms=("sarvanama",),
        related=("pronoun-he-she-it",),
    ),
    topic(
        "polite-you",
        level=2,
        title=("Polite “you”: भवान्, भवती", "आदर वाला 'आप': भवान्, भवती"),
        title_sa="भवत्",
        summary=("For respect, say भवान् (to a man) or भवती (to a woman) — and use the he-form of the verb.",
                 "आदर के लिए भवान् (पुरुष से) या भवती (स्त्री से) कहिए — और क्रिया प्रथम पुरुष में रखिए।"),
        term=("भवती", "you (polite, to a woman)", "आप (स्त्री के लिए)", sub("भवती", "Stri")),
        blocks=[
            text("Spoken Sanskrit uses {{भवान्}} for “you” when speaking politely to a man and {{भवती}} to a "
                 "woman — like Hindi “aap”. Grammatically they are he/she words, so the verb is the "
                 "third-person form: {{भवान् कुत्र गच्छति}}.",
                 "बोलचाल की संस्कृत में आदर से पुरुष को {{भवान्}} और स्त्री को {{भवती}} कहते हैं — जैसे हिन्दी का "
                 "'आप'। व्याकरण में ये 'वह' वाले शब्द हैं, इसलिए क्रिया प्रथम पुरुष में आती है: {{भवान् कुत्र गच्छति}}।"),
            table(
                ("The polite forms", "आदर वाले रूप"),
                [("Speaking to", "किससे"), ("One", "एकवचन"), ("Two", "द्विवचन"), ("Many", "बहुवचन")],
                [
                    [tc("men (masculine)", "पुरुष (पुंलिंग)"), "भवान्", "भवन्तौ", "भवन्तः"],
                    [tc("women (feminine)", "स्त्रियाँ (स्त्रीलिंग)"),
                     cell("भवती", sub("भवती", "Stri")),
                     cell("भवत्यौ", sub("भवती", "Stri", "Prathama", "Dvi")),
                     cell("भवत्यः", sub("भवती", "Stri", "Prathama", "Bahu"))],
                ],
                note=("Masculine भवत् is shown without the engine mark: the engine does not derive it yet.",
                      "पुंलिंग भवत् के रूप बिना इंजन-चिह्न के हैं: इंजन अभी इन्हें नहीं बनाता।"),
            ),
            examples(
                ex("भवान् कुत्र गच्छति", "Where are you going, sir?", "आप कहाँ जा रहे हैं?",
                   w("भवान्", "you (polite, to a man)", "आप (पुरुष के लिए)"),
                   w("कुत्र", "where", "कहाँ"),
                   w("गच्छति", "goes — third-person form", "जाते हैं — प्रथम पुरुष का रूप", tin("गम्"))),
                ex("भवती किं पठति", "What are you reading, madam?", "आप क्या पढ़ रही हैं?",
                   w("भवती", "you (polite, to a woman)", "आप (स्त्री के लिए)", sub("भवती", "Stri")),
                   w("किं", "what", "क्या", sub("किम्", "Napumsaka", "Dvitiya")),
                   w("पठति", "reads — third-person form", "पढ़ती हैं — प्रथम पुरुष का रूप", tin("पठ्"))),
            ),
            watch("Don't mix the two “you”s: {{त्वं पठसि}} and {{भवान् पठति}} are both right, but "
                  "{{भवान् पठसि}} is wrong.",
                  "दोनों 'तुम/आप' को मिलाइए नहीं: {{त्वं पठसि}} और {{भवान् पठति}} दोनों सही हैं, पर {{भवान् पठसि}} "
                  "गलत है।"),
        ],
        quiz=[
            q(("Politely: “Do you speak Sanskrit, madam?” — {{भवती संस्कृतं ___}}",
               "आदर से: 'क्या आप संस्कृत बोलती हैं?' — {{भवती संस्कृतं ___}}"),
              [opt_sa("वदति", tin("वद्")), opt_sa("वदसि", tin("वद्", "Lat", "Madhyama")),
               opt_sa("वदामि", tin("वद्", "Lat", "Uttama"))],
              0,
              ("भवती takes the third-person verb: {{वदति}}.", "भवती के साथ प्रथम पुरुष की क्रिया: {{वदति}}।")),
        ],
        terms=("sarvanama",),
        feature_ids=("PRES.3SG",),
        related=("pronoun-you",),
    ),
    topic(
        "numbers-1-10",
        level=1,
        title=("Numbers 1–10", "संख्याएँ 1–10"),
        title_sa="सङ्ख्याः",
        summary=("One to four change with gender and case; five to ten keep one shape for every gender.",
                 "एक से चार तक लिंग और विभक्ति से बदलते हैं; पाँच से दस तक सब लिंगों में एक-से रहते हैं।"),
        term=("सङ्ख्या", "number, counting word", "संख्या", sub("सङ्ख्या", "Stri")),
        blocks=[
            text("Sanskrit numbers behave like adjectives. {{एक}} “one” is singular, {{द्वि}} “two” is always "
                 "dual, and from three on they are plural. One to four even have separate feminine forms: "
                 "{{त्रयः बालकाः}} “three boys” but {{तिस्रः बालिकाः}} “three girls”.",
                 "संस्कृत संख्याएँ विशेषण की तरह चलती हैं। {{एक}} एकवचन है, {{द्वि}} हमेशा द्विवचन, और तीन से आगे "
                 "बहुवचन। एक से चार तक के स्त्रीलिंग रूप भी अलग हैं: {{त्रयः बालकाः}} 'तीन बालक' पर {{तिस्रः "
                 "बालिकाः}} 'तीन बालिकाएँ'।"),
            table(
                ("One to four, by gender", "एक से चार, लिंग के अनुसार"),
                [("Number", "संख्या"), ("Masculine", "पुंलिंग"), ("Feminine", "स्त्रीलिंग"), ("Neuter", "नपुंसकलिंग")],
                [
                    [tc("1", "1 (एक)"), cell("एकः", sub("एक")), cell("एका", sub("एक", "Stri")),
                     cell("एकम्", sub("एक", "Napumsaka"))],
                    [tc("2", "2 (दो)"), cell("द्वौ", sub("द्वि", "Pum", "Prathama", "Dvi")),
                     cell("द्वे", sub("द्वि", "Stri", "Prathama", "Dvi")),
                     cell("द्वे", sub("द्वि", "Napumsaka", "Prathama", "Dvi"))],
                    [tc("3", "3 (तीन)"), cell("त्रयः", sub("त्रि", "Pum", "Prathama", "Bahu")),
                     cell("तिस्रः", sub("त्रि", "Stri", "Prathama", "Bahu")),
                     cell("त्रीणि", sub("त्रि", "Napumsaka", "Prathama", "Bahu"))],
                    [tc("4", "4 (चार)"), cell("चत्वारः", sub("चतुर्", "Pum", "Prathama", "Bahu")),
                     cell("चतस्रः", sub("चतुर्", "Stri", "Prathama", "Bahu")),
                     cell("चत्वारि", sub("चतुर्", "Napumsaka", "Prathama", "Bahu"))],
                ],
                note=("Numbers are written 1 2 3 or with Devanagari digits: १ २ ३ ४ ५ ६ ७ ८ ९ ०.",
                      "अंक 1 2 3 या देवनागरी अंकों में लिखे जाते हैं: १ २ ३ ४ ५ ६ ७ ८ ९ ०।"),
            ),
            table(
                ("Five to ten — one shape for all genders", "पाँच से दस — सब लिंगों में एक रूप"),
                [("Number", "संख्या"), ("Sanskrit", "संस्कृत")],
                [
                    [tc("5", "5 (पाँच)"), cell("पञ्च", sub("पञ्चन्", "Pum", "Prathama", "Bahu"))],
                    [tc("6", "6 (छह)"), cell("षट्", sub("षष्", "Pum", "Prathama", "Bahu"))],
                    [tc("7", "7 (सात)"), cell("सप्त", sub("सप्तन्", "Pum", "Prathama", "Bahu"))],
                    [tc("8", "8 (आठ)"), cell("अष्ट", sub("अष्टन्", "Pum", "Prathama", "Bahu"))],
                    [tc("9", "9 (नौ)"), cell("नव", sub("नवन्", "Pum", "Prathama", "Bahu"))],
                    [tc("10", "10 (दस)"), cell("दश", sub("दशन्", "Pum", "Prathama", "Bahu"))],
                ],
            ),
            examples(
                ex("त्रयः बालकाः", "three boys", "तीन बालक",
                   w("त्रयः", "three — masculine", "तीन — पुंलिंग", sub("त्रि", "Pum", "Prathama", "Bahu")),
                   w("बालकाः", "boys", "बालक", sub("बालक", "Pum", "Prathama", "Bahu"))),
                ex("तिस्रः बालिकाः", "three girls", "तीन बालिकाएँ",
                   w("तिस्रः", "three — feminine", "तीन — स्त्रीलिंग", sub("त्रि", "Stri", "Prathama", "Bahu")),
                   w("बालिकाः", "girls", "बालिकाएँ", sub("बालिका", "Stri", "Prathama", "Bahu"))),
                ex("चत्वारि फलानि", "four fruits", "चार फल",
                   w("चत्वारि", "four — neuter", "चार — नपुंसकलिंग", sub("चतुर्", "Napumsaka", "Prathama", "Bahu")),
                   w("फलानि", "fruits", "फल", sub("फल", "Napumsaka", "Prathama", "Bahu"))),
            ),
            watch("From five up, the word doesn't change for gender — {{पञ्च बालकाः}}, {{पञ्च बालिकाः}} — but it "
                  "still changes for case: {{पञ्चभिः}} “with five”.",
                  "पाँच से आगे शब्द लिंग से नहीं बदलता — {{पञ्च बालकाः}}, {{पञ्च बालिकाः}} — पर विभक्ति से अब भी बदलता "
                  "है: {{पञ्चभिः}} 'पाँच के साथ'।"),
            wild(
                ex("पञ्चतन्त्रम्", "Pañcatantra — “five books” of fables", "पञ्चतन्त्र — कथाओं के 'पाँच तन्त्र'",
                   source=src("Classic book of fables", "प्रसिद्ध कथा-ग्रन्थ"),
                   check=sub("पञ्चतन्त्र", "Napumsaka")),
                ex("दशरथः", "Daśaratha — “one with ten chariots”, Rāma's father", "दशरथ — 'जिसके दस रथ हों', राम के पिता",
                   source=src("Rāmāyaṇa", "रामायण"), check=sub("दशरथ")),
            ),
        ],
        deeper=[
            go_deeper(
                ("Numbers in every case", "संख्याएँ हर विभक्ति में"),
                text("Numbers take case endings like any noun: {{द्वाभ्याम्}} “with two”, {{त्रयाणाम्}} “of three”, "
                     "{{चतुर्षु}} “among four”, {{पञ्चानाम्}} “of five”. The plural genitive -ānām is the easiest "
                     "to spot.",
                     "संख्याओं में भी संज्ञा की तरह विभक्ति लगती है: {{द्वाभ्याम्}} 'दो के साथ', {{त्रयाणाम्}} 'तीन का', "
                     "{{चतुर्षु}} 'चार में', {{पञ्चानाम्}} 'पाँच का'। षष्ठी बहुवचन का -आनाम् सबसे आसानी से पहचाना जाता है।"),
                examples(
                    ex("त्रयाणाम्", "of three", "तीन का", check=sub("त्रि", "Pum", "Sasthi", "Bahu")),
                    ex("चतुर्षु", "among four", "चार में", check=sub("चतुर्", "Pum", "Saptami", "Bahu")),
                ),
            ),
        ],
        quiz=[
            q(("“Three girls” = ___ {{बालिकाः}}", "'तीन बालिकाएँ' = ___ {{बालिकाः}}"),
              [opt_sa("तिस्रः", sub("त्रि", "Stri", "Prathama", "Bahu")),
               opt_sa("त्रयः", sub("त्रि", "Pum", "Prathama", "Bahu")),
               opt_sa("त्रीणि", sub("त्रि", "Napumsaka", "Prathama", "Bahu"))],
              0,
              ("बालिका is feminine, and three has its own feminine: {{तिस्रः}}.",
               "बालिका स्त्रीलिंग है, और तीन का अपना स्त्रीलिंग रूप है: {{तिस्रः}}।")),
        ],
        terms=("vacana",),
        feature_ids=("NOM.PL",),
        related=("numbers-big-time",),
    ),
    topic(
        "numbers-big-time",
        level=2,
        title=("Bigger numbers, ordinals and telling time", "बड़ी संख्याएँ, क्रम-सूचक और समय"),
        title_sa="सङ्ख्याः समयश्च",
        summary=("From eleven up numbers are built from smaller ones; “first, second…” are ordinary adjectives; and time uses वादनम्.",
                 "ग्यारह से आगे संख्याएँ छोटी संख्याओं से बनती हैं; 'पहला, दूसरा…' सामान्य विशेषण हैं; और समय 'वादनम्' से बताया जाता है।"),
        term=("वादनम्", "o'clock — literally “striking”", "बजे — शब्दशः 'बजना'", sub("वादन", "Napumsaka")),
        minutes=5,
        blocks=[
            text("Big numbers are single nouns: {{विंशतिः}} “twenty” is feminine, {{शतम्}} “a hundred” and "
                 "{{सहस्रम्}} “a thousand” are neuter. Ordinals are plain adjectives that agree with their "
                 "noun: {{प्रथमः}} “first”, {{द्वितीयः}} “second”, {{तृतीयः}} “third”.",
                 "बड़ी संख्याएँ स्वतंत्र संज्ञाएँ हैं: {{विंशतिः}} 'बीस' स्त्रीलिंग है, {{शतम्}} 'सौ' और {{सहस्रम्}} "
                 "'हज़ार' नपुंसकलिंग। क्रम-सूचक शब्द सामान्य विशेषण हैं जो संज्ञा से मेल खाते हैं: {{प्रथमः}} 'पहला', "
                 "{{द्वितीयः}} 'दूसरा', {{तृतीयः}} 'तीसरा'।"),
            table(
                ("Landmark numbers", "प्रमुख संख्याएँ"),
                [("Number", "संख्या"), ("Sanskrit", "संस्कृत")],
                [
                    [tc("11", "11 (ग्यारह)"), cell("एकादश", sub("एकादशन्", "Pum", "Prathama", "Bahu"))],
                    [tc("20", "20 (बीस)"), cell("विंशतिः", sub("विंशति", "Stri"))],
                    [tc("100", "100 (सौ)"), cell("शतम्", sub("शत", "Napumsaka"))],
                    [tc("1000", "1000 (हज़ार)"), cell("सहस्रम्", sub("सहस्र", "Napumsaka"))],
                ],
            ),
            table(
                ("First to fifth", "पहला से पाँचवाँ"),
                [("English", "हिन्दी"), ("Masculine", "पुंलिंग"), ("Feminine", "स्त्रीलिंग")],
                [
                    [tc("first", "पहला"), cell("प्रथमः", sub("प्रथम")), cell("प्रथमा", sub("प्रथमा", "Stri"))],
                    [tc("second", "दूसरा"), cell("द्वितीयः", sub("द्वितीय")), cell("द्वितीया", sub("द्वितीया", "Stri"))],
                    [tc("third", "तीसरा"), cell("तृतीयः", sub("तृतीय")), cell("तृतीया", sub("तृतीया", "Stri"))],
                    [tc("fourth", "चौथा"), cell("चतुर्थः", sub("चतुर्थ")), cell("चतुर्थी", sub("चतुर्थी", "Stri"))],
                    [tc("fifth", "पाँचवाँ"), cell("पञ्चमः", sub("पञ्चम")), cell("पञ्चमी", sub("पञ्चमी", "Stri"))],
                ],
            ),
            fact("The case names are ordinals: {{प्रथमा}} “the first (case)”, {{द्वितीया}} “the second”, up to "
                 "{{सप्तमी}} “the seventh”.",
                 "विभक्तियों के नाम क्रम-सूचक ही हैं: {{प्रथमा}} 'पहली (विभक्ति)', {{द्वितीया}} 'दूसरी', {{सप्तमी}} "
                 "'सातवीं' तक।"),
            table(
                ("Telling time", "समय बताना"),
                [("Time", "समय"), ("Sanskrit", "संस्कृत")],
                [
                    [tc("5 o'clock", "पाँच बजे"), "पञ्चवादनम्"],
                    [tc("quarter past 5", "सवा पाँच"), "सपादपञ्चवादनम्"],
                    [tc("half past 5", "साढ़े पाँच"), "सार्धपञ्चवादनम्"],
                    [tc("quarter to 5", "पौने पाँच"), "पादोनपञ्चवादनम्"],
                ],
                note=("Ask the time with {{कति वादनम्}} “what o'clock?”.", "समय पूछिए: {{कति वादनम्}} 'कितने बजे हैं?'"),
            ),
            tip("The time words are the same four Hindi uses: sa-pāda “with a quarter” = सवा, sārdha “with a half” "
                "= साढ़े, pādona “less a quarter” = पौने.",
                "समय के ये शब्द वही हैं जो हिन्दी में हैं: सपाद 'चौथाई के साथ' = सवा, सार्ध 'आधे के साथ' = साढ़े, "
                "पादोन 'चौथाई कम' = पौने।"),
            examples(
                ex("सः प्रथमः छात्रः", "He is the first student.", "वह पहला छात्र है।",
                   w("सः", "he", "वह", sub("तद्")),
                   w("प्रथमः", "first — masculine, to match छात्रः", "पहला — छात्रः के अनुसार पुंलिंग", sub("प्रथम")),
                   w("छात्रः", "student", "छात्र", sub("छात्र"))),
            ),
        ],
        quiz=[
            q(("How do you say “half past five”?", "'साढ़े पाँच' कैसे कहेंगे?"),
              [opt_sa("सार्धपञ्चवादनम्"), opt_sa("सपादपञ्चवादनम्"), opt_sa("पादोनपञ्चवादनम्")],
              0,
              ("sārdha means “with a half”.", "सार्ध का अर्थ है 'आधे के साथ' (साढ़े)।")),
        ],
        terms=("vacana",),
        related=("numbers-1-10",),
    ),
]
