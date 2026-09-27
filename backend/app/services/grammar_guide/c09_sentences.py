"""Chapter 9 · Sentences — free word order, verb agreement, questions,
यः…सः relative sentences, and participle / "when" clauses."""

from __future__ import annotations

from .model import (
    cell, chapter, ex, examples, go_deeper, krd, opt, opt_sa, proof, q, snd, src, sub, table,
    tc, text, tin, tip, topic, w, watch, wild,
)

CHAPTER = chapter(
    "sentences",
    title=("Sentences", "वाक्य"),
    title_sa="वाक्यम्",
    blurb=("Word order, agreement, questions and clauses — putting words together.",
           "शब्द-क्रम, मेल, प्रश्न और उपवाक्य — शब्दों को जोड़कर वाक्य बनाना।"),
    icon="chatbubbles-outline",
)

TOPICS = [
    topic(
        "word-order",
        level=1,
        title=("Free word order", "स्वतंत्र शब्द-क्रम"),
        title_sa="पदक्रमः",
        summary=("The endings show who does what, so Sanskrit words can come in almost any order.",
                 "विभक्तियाँ बताती हैं कि कौन क्या करता है, इसलिए संस्कृत में शब्द लगभग किसी भी क्रम में आ सकते हैं।"),
        term=("वाक्यम्", "sentence", "वाक्य"),
        blocks=[
            text("In English, “Rāma eats fruit” and “fruit eats Rāma” mean different things — order decides. In "
                 "Sanskrit the ending decides: -ḥ marks the doer, -m the object. Shuffle the words and the meaning "
                 "stays.",
                 "अंग्रेज़ी में शब्दों का क्रम अर्थ तय करता है। संस्कृत में विभक्ति तय करती है: -ः कर्ता बताता है, -म् कर्म। "
                 "शब्द इधर-उधर कीजिए, अर्थ वही रहेगा।"),
            examples(
                ex("रामः फलं खादति", "Rāma eats fruit.", "राम फल खाता है।",
                   w("रामः", "Rāma — the doer (-ḥ)", "राम — कर्ता (-ः)", sub("राम")),
                   w("फलं", "fruit — the object (-m)", "फल — कर्म (-म्)", sub("फल", "Napumsaka", "Dvitiya", form="फलम्")),
                   w("खादति", "eats", "खाता है", tin("खाद्"))),
                ex("फलं रामः खादति", "Rāma eats fruit — same meaning.", "राम फल खाता है — अर्थ वही।"),
                ex("खादति रामः फलम्", "Rāma eats fruit — still the same.", "राम फल खाता है — फिर भी वही।"),
                title=("One sentence, three orders", "एक वाक्य, तीन क्रम"),
            ),
            tip("The everyday order is doer – object – verb, like Hindi: {{रामः फलं खादति}} = राम फल खाता है. Use "
                "it when you write; expect any order when you read verse.",
                "रोज़मर्रा का क्रम कर्ता – कर्म – क्रिया है, हिन्दी जैसा: {{रामः फलं खादति}} = राम फल खाता है। लिखते समय "
                "यही क्रम रखिए; पद्य पढ़ते समय कोई भी क्रम मिल सकता है।"),
            watch("Order is free, but endings are not. {{रामं फलः खादति}} would mean “the fruit eats Rāma”.",
                  "क्रम स्वतंत्र है, विभक्तियाँ नहीं। {{रामं फलः खादति}} का अर्थ होगा 'फल राम को खाता है'।"),
        ],
        quiz=[
            q(("Which sentence means “the boy reads a book”?", "किस वाक्य का अर्थ है 'बालक पुस्तक पढ़ता है'?"),
              [opt_sa("पुस्तकं बालकः पठति"), opt_sa("बालकं पुस्तकः पठति"), opt_sa("बालकम् पुस्तकम् पठति")],
              0,
              ("-ḥ on बालकः marks the reader, whatever the order.", "बालकः का -ः पढ़ने वाले को बताता है, क्रम चाहे जो हो।")),
        ],
        proofs=[
            proof("word-order", ("Shuffle a sentence yourself", "खुद वाक्य का क्रम बदलकर देखिए"),
                  sentence="बालकः पुस्तकं पठति"),
        ],
        terms=("vibhakti", "karaka"),
        feature_ids=("KARAKA-KARTR", "KARAKA-KARMA"),
        related=("subject-verb", "karaka"),
    ),
    topic(
        "subject-verb",
        level=1,
        title=("The verb matches its doer", "क्रिया कर्ता से मेल खाती है"),
        title_sa="कर्तृक्रियान्वयः",
        summary=("The verb takes the doer's person and number — one boy पठति, many boys पठन्ति.",
                 "क्रिया कर्ता का पुरुष और वचन लेती है — एक बालक पठति, कई बालक पठन्ति।"),
        term=("अन्वयः", "agreement, fitting words together", "अन्वय — शब्दों का आपस में मेल"),
        blocks=[
            text("A verb copies two things from its doer: **person** (he, you or I) and **number** (one, two or "
                 "many). Unlike Hindi, it never shows gender — a boy and a girl both {{पठति}}.",
                 "क्रिया अपने कर्ता से दो बातें लेती है: **पुरुष** (वह, तुम या मैं) और **वचन** (एक, दो या अनेक)। "
                 "हिन्दी की तरह इसमें लिंग नहीं दिखता — बालक भी {{पठति}}, बालिका भी {{पठति}}।"),
            table(
                ("Doer and verb together", "कर्ता और क्रिया साथ-साथ"),
                [("Doer", "कर्ता"), ("Verb", "क्रिया"), ("Meaning", "अर्थ")],
                [
                    [cell("बालकः", sub("बालक")), cell("पठति", tin("पठ्")), tc("the boy reads", "बालक पढ़ता है")],
                    [cell("बालकौ", sub("बालक", "Pum", "Prathama", "Dvi")),
                     cell("पठतः", tin("पठ्", "Lat", "Prathama", "Dvi")), tc("the two boys read", "दो बालक पढ़ते हैं")],
                    [cell("बालकाः", sub("बालक", "Pum", "Prathama", "Bahu")),
                     cell("पठन्ति", tin("पठ्", "Lat", "Prathama", "Bahu")), tc("the boys read", "बालक पढ़ते हैं")],
                    [cell("बालिका", sub("बालिका", "Stri")), cell("पठति", tin("पठ्")), tc("the girl reads", "बालिका पढ़ती है")],
                    [cell("त्वम्", sub("युष्मद्")), cell("पठसि", tin("पठ्", "Lat", "Madhyama")), tc("you read", "तुम पढ़ते हो")],
                    [cell("वयम्", sub("अस्मद्", "Pum", "Prathama", "Bahu")),
                     cell("पठामः", tin("पठ्", "Lat", "Uttama", "Bahu")), tc("we read", "हम पढ़ते हैं")],
                ],
            ),
            examples(
                ex("बालकाः उद्याने क्रीडन्ति", "The boys play in the garden.", "बालक बगीचे में खेलते हैं।",
                   w("बालकाः", "boys — many", "बालक — बहुवचन", sub("बालक", "Pum", "Prathama", "Bahu")),
                   w("उद्याने", "in the garden", "बगीचे में", sub("उद्यान", "Napumsaka", "Saptami")),
                   w("क्रीडन्ति", "play — many", "खेलते हैं — बहुवचन", tin("क्रीड्", "Lat", "Prathama", "Bahu"))),
                ex("वृक्षात् पत्राणि पतन्ति", "Leaves fall from the tree.", "पेड़ से पत्ते गिरते हैं।",
                   w("वृक्षात्", "from the tree", "पेड़ से", sub("वृक्ष", "Pum", "Panchami")),
                   w("पत्राणि", "leaves — the doer", "पत्ते — कर्ता", sub("पत्र", "Napumsaka", "Prathama", "Bahu")),
                   w("पतन्ति", "fall", "गिरते हैं", tin("पत्", "Lat", "Prathama", "Bahu"))),
            ),
            watch("Only the doer counts. In {{बालकः पुस्तकानि पठति}} the books are many, but one boy reads, so the "
                  "verb stays {{पठति}}.",
                  "केवल कर्ता गिना जाता है। {{बालकः पुस्तकानि पठति}} में पुस्तकें अनेक हैं, पर पढ़ने वाला एक है, इसलिए "
                  "क्रिया {{पठति}} ही रहती है।"),
            tip("Two doers joined by {{च}} take a dual verb: {{रामः सीता च गच्छतः}}.",
                "{{च}} से जुड़े दो कर्ता हों तो क्रिया द्विवचन में: {{रामः सीता च गच्छतः}}।"),
        ],
        quiz=[
            q(("“The girls read” = बालिकाः …", "'बालिकाएँ पढ़ती हैं' = बालिकाः …"),
              [opt_sa("पठन्ति", tin("पठ्", "Lat", "Prathama", "Bahu")), opt_sa("पठति", tin("पठ्")),
               opt_sa("पठामः", tin("पठ्", "Lat", "Uttama", "Bahu"))],
              0,
              ("Many doers, he-form: {{पठन्ति}}.", "अनेक कर्ता, प्रथम पुरुष: {{पठन्ति}}।")),
        ],
        terms=("purusha", "vacana"),
        feature_ids=("PRES.3SG", "PRES.3DU", "PRES.3PL"),
        related=("verb-grid", "agreement"),
    ),
    topic(
        "questions",
        level=1,
        title=("Asking questions", "प्रश्न पूछना"),
        title_sa="प्रश्नवाक्यम्",
        summary=("Use a question word like किम् or कुत्र, or start a yes-no question with अपि.",
                 "किम् या कुत्र जैसा प्रश्न-शब्द लगाइए, या हाँ-ना वाले प्रश्न की शुरुआत अपि से कीजिए।"),
        term=("प्रश्नः", "question", "प्रश्न"),
        blocks=[
            text("Sanskrit has no question mark in old writing, so a question announces itself. Either a question "
                 "word does the work — {{किम्}} “what”, {{कः}} “who”, {{कुत्र}} “where” — or {{अपि}} at the start "
                 "turns a statement into a yes-no question.",
                 "पुराने लेखन में प्रश्न-चिह्न नहीं होता, इसलिए प्रश्न खुद को बताता है। या तो प्रश्न-शब्द यह काम करता है — "
                 "{{किम्}} 'क्या', {{कः}} 'कौन', {{कुत्र}} 'कहाँ' — या शुरुआत में {{अपि}} कथन को हाँ-ना वाला प्रश्न बना "
                 "देता है।"),
            examples(
                ex("तव नाम किम्", "What is your name?", "तुम्हारा नाम क्या है?",
                   w("तव", "your", "तुम्हारा", sub("युष्मद्", "Pum", "Sasthi")),
                   w("नाम", "name", "नाम", sub("नामन्", "Napumsaka")),
                   w("किम्", "what", "क्या", sub("किम्", "Napumsaka"))),
                ex("कः अस्ति", "Who is there?", "कौन है?",
                   w("कः", "who", "कौन", sub("किम्")),
                   w("अस्ति", "is", "है", tin("अस्"))),
                ex("अपि त्वं गच्छसि", "Are you going?", "क्या तुम जा रहे हो?",
                   w("अपि", "turns it into a question", "प्रश्न बनाता है"),
                   w("त्वं", "you", "तुम", sub("युष्मद्", form="त्वम्")),
                   w("गच्छसि", "go (you)", "जाते हो", tin("गम्", "Lat", "Madhyama"))),
            ),
            table(
                ("कः, का, किम् — “who, what” by gender", "कः, का, किम् — लिंग के अनुसार 'कौन, क्या'"),
                [("Gender", "लिंग"), ("Word", "शब्द"), ("Asks about", "किसके बारे में")],
                [
                    [tc("masculine", "पुंलिंग"), cell("कः", sub("किम्")), tc("a man, or a masculine noun", "पुरुष या पुंलिंग शब्द")],
                    [tc("feminine", "स्त्रीलिंग"), cell("का", sub("किम्", "Stri")), tc("a woman, or a feminine noun", "स्त्री या स्त्रीलिंग शब्द")],
                    [tc("neuter", "नपुंसकलिंग"), cell("किम्", sub("किम्", "Napumsaka")), tc("a thing — “what”", "कोई वस्तु — 'क्या'")],
                ],
            ),
            watch("{{अपि}} means “also” after a word but asks a question at the start: {{अहम् अपि}} “me too”, "
                  "{{अपि कुशलम्}} “all well?”.",
                  "{{अपि}} किसी शब्द के बाद 'भी' है, पर वाक्य की शुरुआत में प्रश्न पूछता है: {{अहम् अपि}} 'मैं भी', "
                  "{{अपि कुशलम्}} 'सब ठीक है?'।"),
            tip("{{किम्}} at the start also asks yes-no: {{किं त्वं पठसि}} “are you reading?”.",
                "शुरुआत में {{किम्}} भी हाँ-ना वाला प्रश्न पूछता है: {{किं त्वं पठसि}} 'क्या तुम पढ़ रहे हो?'।"),
        ],
        quiz=[
            q(("Asking “who?” about a woman:", "किसी स्त्री के बारे में 'कौन?' पूछना:"),
              [opt_sa("का", sub("किम्", "Stri")), opt_sa("कः", sub("किम्")), opt_sa("किम्", sub("किम्", "Napumsaka"))],
              0,
              ("The question word takes the gender of the person asked about.", "प्रश्न-शब्द उसी का लिंग लेता है जिसके बारे में पूछा जाए।")),
        ],
        terms=("avyaya", "sarvanama"),
        feature_ids=("INDECL",),
        related=("question-place-time", "pronoun-who-which"),
    ),
    topic(
        "relative-clauses",
        level=2,
        title=("“Who… he”: यः … सः sentences", "'जो… वह': यः … सः वाक्य"),
        title_sa="यत्तदोः सम्बन्धः",
        summary=("Sanskrit links two ideas with a pair: यः “who” … सः “he”, यत्र “where” … तत्र “there”.",
                 "संस्कृत दो बातों को जोड़ी से जोड़ती है: यः 'जो' … सः 'वह', यत्र 'जहाँ' … तत्र 'वहाँ'।"),
        term=("यः … सः", "who … he", "जो … वह"),
        blocks=[
            text("Hindi says “jo padhta hai, vah jaanta hai”. Sanskrit builds the same way: a य-word opens the first "
                 "part, a त-word answers it. {{यः पठति सः जानाति}} “he who reads, knows”.",
                 "हिन्दी कहती है 'जो पढ़ता है, वह जानता है'। संस्कृत ठीक वैसे ही बनाती है: य-शब्द पहला हिस्सा खोलता है, "
                 "त-शब्द उसका उत्तर देता है। {{यः पठति सः जानाति}} 'जो पढ़ता है, वह जानता है'।"),
            table(
                ("Pairs that answer each other", "एक-दूसरे का उत्तर देने वाली जोड़ियाँ"),
                [("Opens", "खोलता है"), ("Answers", "उत्तर"), ("Meaning", "अर्थ")],
                [
                    [cell("यः", sub("यद्")), cell("सः", sub("तद्")), tc("who … he", "जो … वह")],
                    [cell("या", sub("यद्", "Stri")), cell("सा", sub("तद्", "Stri")), tc("who … she", "जो … वह (स्त्री)")],
                    [cell("यत्", sub("यद्", "Napumsaka")), cell("तत्", sub("तद्", "Napumsaka")), tc("what … that", "जो … वह (वस्तु)")],
                    ["यत्र", "तत्र", tc("where … there", "जहाँ … वहाँ")],
                    ["यदा", "तदा", tc("when … then", "जब … तब")],
                    ["यथा", "तथा", tc("as … so", "जैसा … वैसा")],
                ],
            ),
            examples(
                ex("यः पठति सः जानाति", "He who reads, knows.", "जो पढ़ता है, वह जानता है।",
                   w("यः", "who", "जो", sub("यद्")),
                   w("पठति", "reads", "पढ़ता है", tin("पठ्")),
                   w("सः", "he", "वह", sub("तद्")),
                   w("जानाति", "knows", "जानता है", tin("ज्ञा"))),
                ex("यथा राजा तथा प्रजा", "As the king, so the people.", "जैसा राजा, वैसी प्रजा।",
                   w("यथा", "as", "जैसा"),
                   w("राजा", "king", "राजा", sub("राजन्")),
                   w("तथा", "so", "वैसा"),
                   w("प्रजा", "the people", "प्रजा", sub("प्रजा", "Stri"))),
            ),
            wild(
                ex("यत्र नार्यस्तु पूज्यन्ते रमन्ते तत्र देवताः", "Where women are honoured, there the gods rejoice.",
                   "जहाँ नारियों का सम्मान होता है, वहाँ देवता प्रसन्न रहते हैं।",
                   w("यत्र", "where", "जहाँ"),
                   w("नार्यस्तु", "women, indeed — नार्यः + तु", "नारियाँ तो — नार्यः + तु", snd("नार्यः", "तु")),
                   w("पूज्यन्ते", "are honoured", "पूजी जाती हैं", tin("पूज्", "Lat", "Prathama", "Bahu", prayoga="Karmani")),
                   w("रमन्ते", "rejoice", "प्रसन्न रहते हैं", tin("रम्", "Lat", "Prathama", "Bahu")),
                   w("तत्र", "there", "वहाँ"),
                   w("देवताः", "the gods", "देवता", sub("देवता", "Stri", "Prathama", "Bahu")),
                   source=src("Manusmṛti 3.56", "मनुस्मृति 3.56")),
                ex("यतो धर्मस्ततो जयः", "Where there is dharma, there is victory.", "जहाँ धर्म है, वहाँ विजय है।",
                   w("यतो", "from where — यतः", "जहाँ से — यतः"),
                   w("धर्मस्ततो", "dharma, from there — धर्मः + ततः", "धर्म, वहाँ से — धर्मः + ततः", snd("धर्मः", "ततः", joined="धर्मस्ततः")),
                   w("जयः", "victory", "विजय", sub("जय")),
                   source=src("Mahābhārata · motto of the Supreme Court of India", "महाभारत · भारत के सर्वोच्च न्यायालय का आदर्श-वाक्य")),
            ),
            watch("The य-word and the त-word each take the case their own half needs: {{यस्य पुस्तकं तस्मै ददामि}} "
                  "“I give it to the one whose book it is”.",
                  "य-शब्द और त-शब्द अपने-अपने हिस्से की ज़रूरत के हिसाब से विभक्ति लेते हैं: {{यस्य पुस्तकं तस्मै ददामि}} "
                  "'जिसकी पुस्तक है, उसे देता हूँ'।"),
        ],
        quiz=[
            q(("Complete: यत्र धर्मः … जयः", "पूरा कीजिए: यत्र धर्मः … जयः"),
              [opt_sa("तत्र"), opt_sa("तदा"), opt_sa("तथा")],
              0,
              ("{{यत्र}} “where” is answered by {{तत्र}} “there”.", "{{यत्र}} 'जहाँ' का उत्तर {{तत्र}} 'वहाँ' है।")),
        ],
        terms=("sarvanama", "avyaya"),
        related=("pronoun-who-which", "participle-clauses"),
    ),
    topic(
        "participle-clauses",
        level=3,
        title=("“Having gone”, “while going”, “when he had gone”", "'जाकर', 'जाते हुए', 'जब वह चला गया'"),
        title_sa="कृदन्तवाक्यानि",
        summary=("Instead of “and then” or “when”, Sanskrit packs a second action into one verb-made word.",
                 "'और फिर' या 'जब' की जगह संस्कृत दूसरी क्रिया को धातु से बने एक शब्द में समेट देती है।"),
        term=("गत्वा", "having gone", "जाकर"),
        blocks=[
            text("Three shapes do most of the work. {{गत्वा}} “having gone” finishes one action before the main verb. "
                 "{{गच्छन्}} “while going” runs alongside it and agrees with its doer. And a noun plus participle in the "
                 "7th case sets the scene: {{रामे वनं गते}} “when Rāma had gone to the forest”.",
                 "तीन रूप ज़्यादातर काम करते हैं। {{गत्वा}} 'जाकर' — मुख्य क्रिया से पहले एक काम पूरा। {{गच्छन्}} 'जाते हुए' — "
                 "साथ-साथ चलता है और अपने कर्ता से मेल खाता है। और सप्तमी में संज्ञा + कृदन्त पृष्ठभूमि बताते हैं: {{रामे वनं "
                 "गते}} 'जब राम वन चले गए'।"),
            examples(
                ex("बालकः गृहं गत्वा भोजनं खादति", "Having gone home, the boy eats his meal.", "बालक घर जाकर भोजन खाता है।",
                   w("गृहं", "home", "घर", sub("गृह", "Napumsaka", "Dvitiya", form="गृहम्")),
                   w("गत्वा", "having gone", "जाकर", krd("गम्", "ktvA")),
                   w("भोजनं", "meal", "भोजन", sub("भोजन", "Napumsaka", "Dvitiya", form="भोजनम्")),
                   w("खादति", "eats", "खाता है", tin("खाद्"))),
                ex("बालिका गच्छन्ती गायति", "The girl sings as she walks.", "बालिका चलते-चलते गाती है।",
                   w("बालिका", "the girl", "बालिका", sub("बालिका", "Stri")),
                   w("गच्छन्ती", "while going — feminine, like बालिका", "जाते हुए — बालिका जैसा स्त्रीलिंग",
                     krd("गम्", "Satf", linga="Stri", vibhakti="Prathama", vacana="Eka")),
                   w("गायति", "sings", "गाती है", tin("गै"))),
                ex("रामे वनं गते दशरथः दुःखी अभवत्", "When Rāma had gone to the forest, Daśaratha grieved.",
                   "राम के वन चले जाने पर दशरथ दुःखी हुए।",
                   w("रामे", "Rāma — 7th case", "राम — सप्तमी", sub("राम", "Pum", "Saptami")),
                   w("गते", "gone — 7th case, like रामे", "गए हुए — रामे जैसी सप्तमी",
                     krd("गम्", "kta", linga="Pum", vibhakti="Saptami", vacana="Eka")),
                   w("दुःखी", "sad", "दुःखी", sub("दुःखिन्")),
                   w("अभवत्", "became", "हुए", tin("भू", "Lan"))),
            ),
            tip("Read a {{-त्वा}} word as “and then”: {{गत्वा खादति}} = goes and then eats.",
                "{{-त्वा}} वाले शब्द को 'और फिर' की तरह पढ़िए: {{गत्वा खादति}} = जाता है और फिर खाता है।"),
        ],
        deeper=[
            go_deeper(
                ("The scene-setting 7th case", "पृष्ठभूमि बताने वाली सप्तमी"),
                text("Grammarians call {{रामे वनं गते}} a {{सति सप्तमी}}: “in the state of Rāma having gone”. The noun "
                     "and its participle always match in case, gender and number, and they sit apart from the main "
                     "sentence, whose doer is someone else.",
                     "वैयाकरण {{रामे वनं गते}} को {{सति सप्तमी}} कहते हैं: 'राम के चले जाने की स्थिति में'। संज्ञा और उसका "
                     "कृदन्त हमेशा विभक्ति, लिंग और वचन में मेल खाते हैं, और मुख्य वाक्य से अलग रहते हैं, जिसका कर्ता कोई "
                     "और होता है।"),
                examples(
                    ex("गुरौ आगते शिष्याः उत्तिष्ठन्ति", "When the teacher has come, the students stand up.",
                       "गुरु के आने पर शिष्य खड़े हो जाते हैं।",
                       w("गुरौ", "the teacher — 7th case", "गुरु — सप्तमी", sub("गुरु", "Pum", "Saptami")),
                       w("आगते", "come — 7th case", "आए हुए — सप्तमी",
                         krd("गम्", "kta", linga="Pum", vibhakti="Saptami", vacana="Eka", prefixes=["आ"])),
                       w("शिष्याः", "students", "शिष्य", sub("शिष्य", "Pum", "Prathama", "Bahu")),
                       w("उत्तिष्ठन्ति", "stand up", "खड़े होते हैं", tin("स्था", "Lat", "Prathama", "Bahu", prefixes=["उद्"]))),
                ),
                level=3,
            ),
        ],
        quiz=[
            q(("“Having read” is…", "'पढ़कर' है…"),
              [opt_sa("पठित्वा", krd("पठ्", "ktvA")), opt_sa("पठन्", krd("पठ्", "Satf", linga="Pum", vibhakti="Prathama", vacana="Eka")),
               opt_sa("पठितुम्", krd("पठ्", "tumun"))],
              0,
              ("-tvā finishes an action first: {{पठित्वा}}.", "-त्वा पहले पूरा हुआ काम बताता है: {{पठित्वा}}।")),
        ],
        terms=("vibhakti",),
        related=("ktva-lyap", "present-participles"),
    ),
]
