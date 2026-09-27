"""Chapter 2 · Nouns — stem + ending, gender, number, agreement."""

from __future__ import annotations

from .model import (
    analogy, cell, chapter, ex, examples, go_deeper, opt, opt_sa, proof, q, snd, src,
    sub, table, tc, text, tin, tip, topic, w, watch, wild,
)

CHAPTER = chapter(
    "nouns",
    title=("Nouns", "संज्ञा"),
    title_sa="नामपदानि",
    blurb=("Stems, endings, gender and number — how a noun is built.",
           "मूल शब्द, विभक्ति, लिंग और वचन — संज्ञा कैसे बनती है।"),
    icon="cube-outline",
)

TOPICS = [
    topic(
        "stem-ending",
        level=1,
        title=("Stem + ending", "मूल शब्द + अंत"),
        title_sa="प्रातिपदिकम्",
        summary=("Every noun is a stem plus an ending: the stem gives the meaning, the ending gives the job.",
                 "हर संज्ञा मूल शब्द और अंत से बनती है: मूल शब्द अर्थ देता है, अंत उसका काम बताता है।"),
        term=("प्रातिपदिकम्", "stem — a noun before its ending", "प्रातिपदिक — विभक्ति लगने से पहले का शब्द"),
        blocks=[
            text("A dictionary lists {{देव}} “god”, but a sentence never uses it bare. It always adds "
                 "an ending: {{देवः}} when the god does something, {{देवम्}} when something is done to "
                 "him, {{देवाय}} when something is for him. Same stem, different jobs.",
                 "शब्दकोश में {{देव}} 'देवता' लिखा मिलता है, पर वाक्य में यह अकेला कभी नहीं आता। इसके साथ "
                 "हमेशा कोई अंत जुड़ता है: देवता कुछ करे तो {{देवः}}, उसके प्रति कुछ किया जाए तो {{देवम्}}, "
                 "उसके लिए कुछ हो तो {{देवाय}}। मूल शब्द वही, काम अलग-अलग।"),
            table(
                ("One stem, many jobs", "एक मूल शब्द, कई काम"),
                [("Form", "रूप"), ("Job", "काम"), ("Meaning", "अर्थ")],
                [
                    [cell("देवः", sub("देव")), tc("the doer", "कर्ता"), tc("the god (does)", "देवता (करता है)")],
                    [cell("देवम्", sub("देव", "Pum", "Dvitiya")), tc("the one acted on", "कर्म"),
                     tc("the god (is seen)", "देवता को")],
                    [cell("देवेन", sub("देव", "Pum", "Trtiya")), tc("by, with", "साधन"), tc("by the god", "देवता के द्वारा")],
                    [cell("देवाय", sub("देव", "Pum", "Caturthi")), tc("for, to", "किसके लिए"),
                     tc("for the god", "देवता के लिए")],
                    [cell("देवस्य", sub("देव", "Pum", "Sasthi")), tc("of", "सम्बन्ध"), tc("the god's", "देवता का")],
                ],
                stem="देव",
            ),
            analogy("English does this with a handful of words: he, him, his. Sanskrit does it with "
                    "every noun, and for more jobs.",
                    "हिन्दी में संज्ञा के साथ 'ने, को, का' अलग से लगते हैं। संस्कृत में हर संज्ञा खुद ही अपना "
                    "रूप बदल लेती है।"),
            examples(
                ex("गजः जलं पिबति", "The elephant drinks water.", "हाथी पानी पीता है।",
                   w("गजः", "elephant — the doer", "हाथी — कर्ता", sub("गज")),
                   w("जलं", "water — the thing drunk", "पानी — कर्म", sub("जल", "Napumsaka", "Dvitiya")),
                   w("पिबति", "drinks", "पीता है", tin("पा"))),
                ex("बालकः पुस्तकं पठति", "The boy reads a book.", "बालक पुस्तक पढ़ता है।",
                   w("बालकः", "boy — the doer", "बालक — कर्ता", sub("बालक")),
                   w("पुस्तकं", "book — the thing read", "पुस्तक — कर्म", sub("पुस्तक", "Napumsaka", "Dvitiya")),
                   w("पठति", "reads", "पढ़ता है", tin("पठ्"))),
                title=("Spot the stem", "मूल शब्द पहचानिए"),
            ),
            tip("Meet a new word? Cover its last syllable. What is left is usually the stem you would "
                "look up in a dictionary.",
                "नया शब्द मिले तो उसका आखिरी अक्षर ढँक दीजिए। जो बचे, वही अक्सर वह मूल शब्द है जो शब्दकोश में मिलेगा।"),
            wild(
                ex("विद्यालयः", "a school — vidyā “learning” + ālaya “home”", "विद्यालय — विद्या + आलय 'घर'",
                   source=src("An everyday word in Hindi and Sanskrit", "हिन्दी और संस्कृत का रोज़ का शब्द"),
                   check=snd("विद्या", "आलयः")),
            ),
        ],
        deeper=[
            go_deeper(
                ("The textbook names", "पाठ्यपुस्तक वाले नाम"),
                text("Pāṇini calls the bare stem {{प्रातिपदिकम्}}, and a noun wearing its ending a "
                     "{{सुबन्तम्}} — “ending in sup”, sup being his label for all 21 noun endings. You will "
                     "meet these names in school books; the idea is simply stem + ending.",
                     "पाणिनि बिना अंत वाले शब्द को {{प्रातिपदिकम्}} और अंत लगे शब्द को {{सुबन्तम्}} कहते हैं — "
                     "'सुप् पर अंत होने वाला', जहाँ 'सुप्' सभी 21 संज्ञा-विभक्तियों का नाम है। पाठ्यपुस्तकों में "
                     "ये नाम मिलेंगे; बात बस इतनी है: मूल शब्द + अंत।"),
            ),
        ],
        quiz=[
            q(("In {{देवाय}}, which part is the ending?", "{{देवाय}} में अंत कौन-सा भाग है?"),
              [opt_sa("-आय"), opt_sa("देव-"), opt_sa("दे-")],
              0,
              ("{{देव}} is the stem; -āya means “for”.", "{{देव}} मूल शब्द है; -आय का अर्थ है 'के लिए'।")),
            q(("Which is the bare stem you would find in a dictionary?",
               "शब्दकोश में कौन-सा मूल रूप मिलेगा?"),
              [opt_sa("गज"), opt_sa("गजः"), opt_sa("गजम्")],
              0,
              ("A stem has no ending; {{गजः}} and {{गजम्}} are working forms.",
               "मूल रूप में कोई अंत नहीं होता; {{गजः}} और {{गजम्}} वाक्य में काम करने वाले रूप हैं।")),
        ],
        terms=("pratipadika", "subanta", "pratyaya"),
        feature_ids=("NOM.SG", "ACC.SG"),
        related=("gender", "number"),
    ),
    topic(
        "gender",
        level=1,
        title=("Gender: masculine, feminine, neuter", "लिंग: पुंलिंग, स्त्रीलिंग, नपुंसकलिंग"),
        title_sa="लिङ्गानि",
        summary=("Every noun has a gender — masculine, feminine or neuter — and it decides the endings.",
                 "हर संज्ञा का एक लिंग होता है — पुंलिंग, स्त्रीलिंग या नपुंसकलिंग — और वही उसके रूप तय करता है।"),
        term=("लिङ्गम्", "gender", "लिंग"),
        blocks=[
            text("Sanskrit has three genders, and gender belongs to the word, not the thing: {{जलम्}} "
                 "“water” is neuter, {{नदी}} “river” is feminine, and {{दाराः}} “wife” is grammatically "
                 "masculine and plural. Learn each noun together with its gender.",
                 "संस्कृत में तीन लिंग हैं, और लिंग शब्द का गुण है, वस्तु का नहीं: {{जलम्}} 'पानी' नपुंसकलिंग है, "
                 "{{नदी}} स्त्रीलिंग, और {{दाराः}} 'पत्नी' व्याकरण में पुंलिंग बहुवचन है! इसलिए हर शब्द उसके "
                 "लिंग के साथ सीखिए।"),
            table(
                ("The dictionary form hints at gender", "मूल रूप से लिंग का संकेत"),
                [("Gender", "लिंग"), ("Usual ending", "सामान्य अंत"), ("Example", "उदाहरण"), ("Example", "उदाहरण")],
                [
                    [tc("masculine", "पुंलिंग"), tc("-aḥ", "-अः"), cell("गजः", sub("गज")), cell("वृक्षः", sub("वृक्ष"))],
                    [tc("feminine", "स्त्रीलिंग"), tc("-ā or -ī", "-आ या -ई"),
                     cell("लता", sub("लता", "Stri")), cell("नदी", sub("नदी", "Stri"))],
                    [tc("neuter", "नपुंसकलिंग"), tc("-am", "-अम्"),
                     cell("फलम्", sub("फल", "Napumsaka")), cell("जलम्", sub("जल", "Napumsaka"))],
                ],
            ),
            watch("Endings only hint. {{कविः}} “poet” ends in -iḥ and is masculine; {{मतिः}} “thought” "
                  "also ends in -iḥ and is feminine. When in doubt, check the dictionary.",
                  "अंत सिर्फ़ संकेत देते हैं। {{कविः}} 'कवि' -इः पर खत्म होता है और पुंलिंग है; {{मतिः}} "
                  "'बुद्धि' भी -इः पर खत्म होता है पर स्त्रीलिंग है। संदेह हो तो शब्दकोश देखिए।"),
            examples(
                ex("मित्रम्", "a friend — neuter!", "मित्र — नपुंसकलिंग!", check=sub("मित्र", "Napumsaka")),
                ex("सूर्यः", "the sun — masculine", "सूर्य — पुंलिंग", check=sub("सूर्य")),
                ex("भूमिः", "the earth — feminine", "भूमि — स्त्रीलिंग", check=sub("भूमि", "Stri")),
                ex("पुस्तकम्", "a book — neuter", "पुस्तक — नपुंसकलिंग (हिन्दी में स्त्रीलिंग)",
                   check=sub("पुस्तक", "Napumsaka")),
                title=("Gender is a label on the word", "लिंग शब्द पर लगा चिह्न है"),
            ),
            analogy("German does the same: das Mädchen “the girl” is neuter. Gender is a label that tells "
                    "the other words in the sentence how to agree.",
                    "हिन्दी में भी लिंग शब्द का होता है: 'दही' पुंलिंग है और 'पुस्तक' स्त्रीलिंग — इसमें कोई "
                    "तर्क नहीं, बस आदत है। संस्कृत में भी यही है, बस लिंग तीन हैं।"),
            wild(
                ex("अहिंसा परमो धर्मः", "Non-violence is the highest dharma.", "अहिंसा परम धर्म है।",
                   w("अहिंसा", "non-violence — feminine", "अहिंसा — स्त्रीलिंग", sub("अहिंसा", "Stri")),
                   w("परमो", "highest — masculine, to match dharma", "परम — धर्म के अनुसार पुंलिंग",
                     sub("परम", form="परमः")),
                   w("धर्मः", "dharma — masculine", "धर्म — पुंलिंग", sub("धर्म")),
                   source=src("Mahābhārata", "महाभारत")),
            ),
        ],
        deeper=[
            go_deeper(
                ("Where feminine words come from", "स्त्रीलिंग शब्द कैसे बनते हैं"),
                text("Many feminines are made from a masculine by adding -ā or -ī: {{बालः}} → {{बाला}} "
                     "“girl”, {{देवः}} → {{देवी}} “goddess”, {{पुत्रः}} → {{पुत्री}} “daughter”. The chapter "
                     "on word-making suffixes has the full story.",
                     "बहुत-से स्त्रीलिंग शब्द पुंलिंग में -आ या -ई जोड़कर बनते हैं: {{बालः}} → {{बाला}} 'बालिका', "
                     "{{देवः}} → {{देवी}}, {{पुत्रः}} → {{पुत्री}}। शब्द बनाने वाले प्रत्ययों के अध्याय में पूरी "
                     "बात है।"),
            ),
        ],
        quiz=[
            q(("What gender is {{फलम्}}?", "{{फलम्}} का लिंग क्या है?"),
              [opt("Neuter", "नपुंसकलिंग"), opt("Masculine", "पुंलिंग"), opt("Feminine", "स्त्रीलिंग")],
              0,
              ("-am in the dictionary form marks most neuter a-words.",
               "मूल रूप में -अम् ज़्यादातर नपुंसकलिंग अ-शब्दों का चिह्न है।")),
            q(("{{मित्रम्}} “friend” is neuter. What does that tell you?",
               "{{मित्रम्}} 'मित्र' नपुंसकलिंग है। इससे क्या पता चलता है?"),
              [opt("Gender belongs to the word, not the person", "लिंग शब्द का होता है, व्यक्ति का नहीं"),
               opt("A friend is a thing", "मित्र कोई वस्तु है"),
               opt("It is a mistake", "यह गलती है")],
              0,
              ("Grammatical gender is simply a label on the word.", "व्याकरण का लिंग शब्द पर लगा एक चिह्न भर है।")),
        ],
        proofs=[
            proof("paradigm", ("See a feminine noun in all its forms", "एक स्त्रीलिंग शब्द के सारे रूप देखिए"),
                  pratipadika="लता", linga="Stri"),
        ],
        terms=("linga",),
        feature_ids=("MASC", "FEM", "NEUT"),
        related=("agreement",),
    ),
    topic(
        "number",
        level=1,
        title=("One, two, many", "एकवचन, द्विवचन, बहुवचन"),
        title_sa="वचनानि",
        summary=("Sanskrit counts in its endings — and keeps a special form for exactly two.",
                 "संस्कृत अपने अंतों में गिनती करता है — और ठीक दो के लिए अलग रूप रखता है।"),
        term=("वचनम्", "number", "वचन"),
        blocks=[
            text("English has singular and plural. Sanskrit adds a third number, the dual, for exactly "
                 "two: two eyes, two hands, a pair of friends. The verb changes too, so the whole "
                 "sentence agrees on how many.",
                 "हिन्दी और अंग्रेज़ी में एकवचन और बहुवचन होते हैं। संस्कृत में तीसरा वचन भी है — द्विवचन, "
                 "ठीक दो के लिए: दो आँखें, दो हाथ, दो मित्र। क्रिया भी बदलती है, इसलिए पूरा वाक्य संख्या पर "
                 "सहमत रहता है।"),
            table(
                ("Three numbers", "तीन वचन"),
                [("How many", "संख्या"), ("Noun", "संज्ञा"), ("Verb", "क्रिया"), ("Meaning", "अर्थ")],
                [
                    [tc("one", "एक"), cell("बालकः", sub("बालक")), cell("पठति", tin("पठ्")),
                     tc("the boy reads", "बालक पढ़ता है")],
                    [tc("two", "दो"), cell("बालकौ", sub("बालक", "Pum", "Prathama", "Dvi")),
                     cell("पठतः", tin("पठ्", "Lat", "Prathama", "Dvi")), tc("the two boys read", "दो बालक पढ़ते हैं")],
                    [tc("many", "बहुत"), cell("बालकाः", sub("बालक", "Pum", "Prathama", "Bahu")),
                     cell("पठन्ति", tin("पठ्", "Lat", "Prathama", "Bahu")), tc("the boys read", "बालक पढ़ते हैं")],
                ],
                stem="बालक",
            ),
            tip("The dual ending -au is easy to spot: {{बालकौ}}, {{रामलक्ष्मणौ}}. See -au at the end of "
                "a masculine word and think “two”.",
                "द्विवचन का -औ आसानी से पहचाना जाता है: {{बालकौ}}, {{रामलक्ष्मणौ}}। पुंलिंग शब्द के अंत में "
                "-औ दिखे तो सोचिए 'दो'।"),
            examples(
                ex("नेत्रे", "the two eyes", "दोनों आँखें", check=sub("नेत्र", "Napumsaka", "Prathama", "Dvi")),
                ex("हस्तौ", "the two hands", "दोनों हाथ", check=sub("हस्त", "Pum", "Prathama", "Dvi")),
                ex("फलानि", "fruits — more than two", "कई फल", check=sub("फल", "Napumsaka", "Prathama", "Bahu")),
            ),
            watch("Hindi and English habits make us use the plural for two. In Sanskrit that is wrong: "
                  "two boys is {{बालकौ}}, never {{बालकाः}}.",
                  "हिन्दी की आदत से हम दो के लिए भी बहुवचन लगा देते हैं। संस्कृत में यह गलत है: दो बालक = "
                  "{{बालकौ}}, {{बालकाः}} नहीं।"),
            wild(
                ex("रामलक्ष्मणौ", "Rāma and Lakṣmaṇa — two people, so dual", "राम और लक्ष्मण — दो लोग, इसलिए द्विवचन",
                   source=src("Rāmāyaṇa", "रामायण"), check=sub("रामलक्ष्मण", "Pum", "Prathama", "Dvi")),
                ex("सर्वे भवन्तु सुखिनः", "May all be happy.", "सब सुखी हों।",
                   w("सर्वे", "all — plural", "सब — बहुवचन", sub("सर्व", "Pum", "Prathama", "Bahu")),
                   w("भवन्तु", "may they be", "हों", tin("भू", "Lot", "Prathama", "Bahu")),
                   w("सुखिनः", "happy — plural", "सुखी — बहुवचन", sub("सुखिन्", "Pum", "Prathama", "Bahu")),
                   source=src("Traditional prayer", "पारम्परिक प्रार्थना")),
            ),
        ],
        deeper=[
            go_deeper(
                ("Where forms merge", "जहाँ रूप एक हो जाते हैं"),
                text("The dual shares forms between jobs: {{बालकौ}} is both “two boys do” and “two boys "
                     "are acted on”. Neuter nouns use one form for doer and object in every number. The "
                     "Noun families chapter shows the full tables.",
                     "द्विवचन में कई काम एक ही रूप से होते हैं: {{बालकौ}} का अर्थ 'दो बालक (करते हैं)' भी है और "
                     "'दो बालकों को' भी। नपुंसकलिंग में कर्ता और कर्म का रूप हर वचन में एक होता है। पूरी "
                     "तालिकाएँ शब्दरूप वाले अध्याय में हैं।"),
            ),
        ],
        quiz=[
            q(("How do you say “the two boys read”?", "'दो बालक पढ़ते हैं' कैसे कहेंगे?"),
              [opt_sa("बालकौ पठतः"), opt_sa("बालकाः पठन्ति"), opt_sa("बालकः पठति")],
              0,
              ("Exactly two takes the dual on both the noun and the verb.",
               "ठीक दो के लिए संज्ञा और क्रिया दोनों द्विवचन में आती हैं।")),
        ],
        proofs=[
            proof("paradigm", ("See all three numbers of बालक", "बालक के तीनों वचन देखिए"),
                  pratipadika="बालक", linga="Pum"),
        ],
        terms=("vacana",),
        feature_ids=("SG", "DU", "PL", "NOM.DU", "NOM.PL"),
        related=("agreement",),
    ),
    topic(
        "agreement",
        level=1,
        title=("Adjectives agree", "विशेषण संज्ञा के साथ चलता है"),
        title_sa="विशेषणम्",
        summary=("A describing word copies its noun's gender, number and case.",
                 "गुण बताने वाला शब्द अपनी संज्ञा का लिंग, वचन और विभक्ति अपना लेता है।"),
        term=("विशेषणम्", "adjective", "विशेषण"),
        blocks=[
            text("A Sanskrit adjective is not fixed. It takes the gender, number and case of the noun it "
                 "describes, so the two match like a pair of shoes. That is how you can tell which noun "
                 "an adjective belongs to, even when they stand apart.",
                 "संस्कृत में विशेषण एक-सा नहीं रहता। वह उसी लिंग, वचन और विभक्ति में आता है जिसमें उसकी "
                 "संज्ञा है — जैसे जूतों की जोड़ी। इसी से पता चलता है कि विशेषण किस संज्ञा का है, भले दोनों "
                 "दूर-दूर हों।"),
            examples(
                ex("सुन्दरः बालकः", "a handsome boy", "सुंदर बालक",
                   w("सुन्दरः", "handsome — masculine, one", "सुंदर — पुंलिंग, एकवचन", sub("सुन्दर")),
                   w("बालकः", "boy", "बालक", sub("बालक"))),
                ex("सुन्दरी बालिका", "a pretty girl", "सुंदर बालिका",
                   w("सुन्दरी", "pretty — feminine, one", "सुंदर — स्त्रीलिंग, एकवचन", sub("सुन्दरी", "Stri")),
                   w("बालिका", "girl", "बालिका", sub("बालिका", "Stri"))),
                ex("सुन्दराणि फलानि", "lovely fruits", "सुंदर फल (कई)",
                   w("सुन्दराणि", "lovely — neuter, many", "सुंदर — नपुंसकलिंग, बहुवचन",
                     sub("सुन्दर", "Napumsaka", "Prathama", "Bahu")),
                   w("फलानि", "fruits", "फल", sub("फल", "Napumsaka", "Prathama", "Bahu"))),
                title=("Matching pairs", "मेल खाते जोड़े"),
            ),
            watch("An adjective matches the noun's grammar, not its look. {{कविः}} ends in -iḥ, but “a "
                  "fine poet” is {{उत्तमः कविः}} — masculine -aḥ, because kavi is masculine.",
                  "विशेषण संज्ञा के व्याकरण से मेल खाता है, उसके रूप से नहीं। {{कविः}} -इः पर खत्म होता है, पर "
                  "'उत्तम कवि' = {{उत्तमः कविः}} — पुंलिंग -अः, क्योंकि कवि पुंलिंग है।"),
            tip("Adjectives decline exactly like nouns with the same ending. Know {{देव}}, {{लता}} and "
                "{{फल}}, and you can already decline most adjectives.",
                "विशेषण के रूप उसी अंत वाली संज्ञा जैसे ही चलते हैं। {{देव}}, {{लता}} और {{फल}} के रूप आते "
                "हों, तो ज़्यादातर विशेषण भी आ जाएँगे।"),
            wild(
                ex("सत्यं शिवं सुन्दरम्", "the true, the good, the beautiful — three neuter words in step",
                   "सत्य, शिव, सुन्दर — एक साथ चलते तीन नपुंसकलिंग शब्द",
                   source=src("Popular phrase · motto of Doordarshan", "प्रचलित वाक्य · दूरदर्शन का आदर्श-वाक्य"),
                   check=sub("सुन्दर", "Napumsaka", form="सुन्दरम्")),
                ex("नभःस्पृशं दीप्तम्", "touching the sky, blazing — two describing words, same case",
                   "आकाश को छूता हुआ, दीप्तिमान — दो विशेषण, एक-सी विभक्ति",
                   source=src("Bhagavad Gītā 11.24 · motto of the Indian Air Force",
                              "भगवद्गीता 11.24 · भारतीय वायुसेना का आदर्श-वाक्य"),
                   check=sub("दीप्त", "Pum", "Dvitiya", form="दीप्तम्")),
            ),
        ],
        deeper=[
            go_deeper(
                ("Free order, safe meaning", "क्रम स्वतंत्र, अर्थ सुरक्षित"),
                text("Because an adjective carries the same ending as its noun, poets can pull the two "
                     "apart: {{सुन्दरी गच्छति बालिका}} still means “the pretty girl goes”. Verse uses this "
                     "freedom all the time.",
                     "विशेषण में संज्ञा वाला ही अंत होने के कारण कवि दोनों को अलग रख सकते हैं: {{सुन्दरी गच्छति "
                     "बालिका}} का अर्थ फिर भी 'सुंदर बालिका जाती है' ही है। छन्दों में यह स्वतंत्रता बार-बार "
                     "दिखती है।"),
            ),
        ],
        quiz=[
            q(("“A big tree” = ___ {{वृक्षः}}. Which word fits?", "'बड़ा पेड़' = ___ {{वृक्षः}}। कौन-सा शब्द आएगा?"),
              [opt_sa("विशालः", sub("विशाल")), opt_sa("विशाला", sub("विशाल", "Stri")),
               opt_sa("विशालम्", sub("विशाल", "Napumsaka"))],
              0,
              ("{{वृक्षः}} is masculine, one, the doer — so the adjective is {{विशालः}}.",
               "{{वृक्षः}} पुंलिंग, एकवचन, कर्ता है — इसलिए विशेषण {{विशालः}} होगा।")),
        ],
        terms=("visheshana",),
        feature_ids=("MASC", "FEM", "NEUT"),
        related=("gender", "number"),
    ),
]
