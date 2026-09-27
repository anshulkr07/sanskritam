"""Chapter 8 · Small words — indeclinables (avyaya): what they are, joining words,
question / place / time words, न and मा, and इति.

Avyaya have no forms for the engine to derive, so the words themselves are
shown unchecked; the nouns and verbs around them carry their checks."""

from __future__ import annotations

from .model import (
    cell, chapter, ex, examples, formula, go_deeper, krd, opt, opt_sa, q, snd, src, sub,
    table, tc, text, tin, tip, topic, w, watch, wild,
)

CHAPTER = chapter(
    "small-words",
    title=("Small words", "अव्यय"),
    title_sa="अव्ययानि",
    blurb=("And, also, here, today, not — words that never change.",
           "और, भी, यहाँ, आज, नहीं — कभी न बदलने वाले शब्द।"),
    icon="link-outline",
)

TOPICS = [
    topic(
        "indeclinables",
        level=1,
        title=("Words that never change", "कभी न बदलने वाले शब्द"),
        title_sa="अव्ययम्",
        summary=("Some words — च “and”, अत्र “here”, शीघ्रम् “quickly” — never take endings. Learn them once.",
                 "कुछ शब्द — च 'और', अत्र 'यहाँ', शीघ्रम् 'जल्दी' — कभी रूप नहीं बदलते। एक बार सीख लीजिए।"),
        term=("अव्ययम्", "indeclinable — a word with no endings", "अव्यय — जिसके रूप नहीं बदलते"),
        blocks=[
            text("Nouns and verbs change their endings, but a large group of small words never does. Grammar calls "
                 "them {{अव्यय}}, “unchanging”. Joining words, place and time words, question words and many adverbs "
                 "are all avyaya.",
                 "संज्ञा और क्रिया के अंत बदलते हैं, पर छोटे शब्दों का एक बड़ा समूह कभी नहीं बदलता। व्याकरण इन्हें {{अव्यय}} "
                 "कहता है — 'न बदलने वाले'। जोड़ने वाले शब्द, स्थान और समय के शब्द, प्रश्न-शब्द और बहुत-से क्रिया-विशेषण — "
                 "सब अव्यय हैं।"),
            table(
                ("Kinds of small words", "छोटे शब्दों के प्रकार"),
                [("Kind", "प्रकार"), ("Examples", "उदाहरण"), ("Meaning", "अर्थ")],
                [
                    [tc("joining", "जोड़ने वाले"), "च · वा · अपि", tc("and · or · also", "और · या · भी")],
                    [tc("place", "स्थान"), "अत्र · तत्र · सर्वत्र", tc("here · there · everywhere", "यहाँ · वहाँ · सब जगह")],
                    [tc("time", "समय"), "अद्य · श्वः · ह्यः", tc("today · tomorrow · yesterday", "आज · आने वाला कल · बीता कल")],
                    [tc("question", "प्रश्न"), "कुत्र · कदा · कथम्", tc("where · when · how", "कहाँ · कब · कैसे")],
                    [tc("manner", "रीति"), "शीघ्रम् · शनैः · उच्चैः", tc("quickly · slowly · loudly", "जल्दी · धीरे · ऊँचे स्वर में")],
                    [tc("negation", "निषेध"), "न · मा", tc("not · don't", "नहीं · मत")],
                ],
            ),
            examples(
                ex("रामः सीता च वनं गच्छतः", "Rāma and Sītā go to the forest.", "राम और सीता वन जाते हैं।",
                   w("रामः", "Rāma", "राम", sub("राम")),
                   w("सीता", "Sītā", "सीता", sub("सीता", "Stri")),
                   w("च", "and", "और"),
                   w("गच्छतः", "go (the two)", "जाते हैं", tin("गम्", "Lat", "Prathama", "Dvi"))),
                ex("अद्य अहं शीघ्रं गच्छामि", "Today I am going quickly.", "आज मैं जल्दी जा रहा हूँ।",
                   w("अद्य", "today", "आज"),
                   w("शीघ्रं", "quickly", "जल्दी"),
                   w("गच्छामि", "go (I)", "जाता हूँ", tin("गम्", "Lat", "Uttama"))),
            ),
            tip("An avyaya has nothing to agree with, so its form can never be wrong. If a word never changes in your "
                "reading, you have found one.",
                "अव्यय को किसी से मेल नहीं खाना होता, इसलिए उसका रूप कभी गलत नहीं होता। पढ़ते हुए कोई शब्द कभी न बदले, "
                "तो समझिए वह अव्यय है।"),
            wild(
                ex("सत्यमेव जयते", "Truth alone wins — एव “alone” is an avyaya.", "सत्य की ही जीत होती है — एव 'ही' अव्यय है।",
                   source=src("Muṇḍaka Upaniṣad 3.1.6 · national motto of India",
                              "मुण्डक उपनिषद् 3.1.6 · भारत का राष्ट्रीय आदर्श-वाक्य"),
                   check=snd("सत्यम्", "एव", joined="सत्यमेव")),
            ),
        ],
        deeper=[
            go_deeper(
                ("Pāṇini's definition", "पाणिनि की परिभाषा"),
                text("Pāṇini lists indeclinables in groups, starting with {{स्वरादिनिपातमव्ययम्}} (1.1.37): words like "
                     "svar and the particles. Some forms that look inflected are avyaya too — {{गत्वा}} “having gone” and "
                     "{{पठितुम्}} “to read” never change.",
                     "पाणिनि अव्ययों को समूहों में गिनाते हैं, जिसकी शुरुआत {{स्वरादिनिपातमव्ययम्}} (1.1.37) से है: स्वर् जैसे "
                     "शब्द और निपात। कुछ रूप-वाले-से दिखने वाले शब्द भी अव्यय हैं — {{गत्वा}} 'जाकर' और {{पठितुम्}} 'पढ़ने के "
                     "लिए' कभी नहीं बदलते।"),
                examples(
                    ex("गत्वा", "having gone", "जाकर", check=krd("गम्", "ktvA")),
                    ex("पठितुम्", "to read", "पढ़ने के लिए", check=krd("पठ्", "tumun")),
                ),
            ),
        ],
        quiz=[
            q(("Which word never changes its form?", "कौन-सा शब्द कभी रूप नहीं बदलता?"),
              [opt_sa("अत्र"), opt_sa("रामः", sub("राम")), opt_sa("गच्छति", tin("गम्"))],
              0,
              ("{{अत्र}} “here” is an avyaya.", "{{अत्र}} 'यहाँ' अव्यय है।")),
        ],
        terms=("avyaya",),
        feature_ids=("INDECL",),
        related=("joining-words",),
    ),
    topic(
        "joining-words",
        level=1,
        title=("Joining words: च, वा, अपि, एव, तु", "जोड़ने वाले शब्द: च, वा, अपि, एव, तु"),
        title_sa="च वा अपि एव तु",
        summary=("Sanskrit puts “and” after the words it joins: रामः कृष्णः च = Rāma and Kṛṣṇa.",
                 "संस्कृत में 'और' जोड़े जाने वाले शब्दों के बाद आता है: रामः कृष्णः च = राम और कृष्ण।"),
        term=("च", "and — placed after what it joins", "और — जोड़े जाने वाले शब्द के बाद"),
        blocks=[
            text("The linking words have a fixed place: they come after the word they belong to, never first. {{रामः "
                 "कृष्णः च}} “Rāma and Kṛṣṇa”, {{अहम् अपि}} “I too”, {{सत्यम् एव}} “truth alone”.",
                 "जोड़ने वाले शब्दों की जगह तय है: ये जिस शब्द से जुड़े हों उसके बाद आते हैं, कभी सबसे पहले नहीं। {{रामः "
                 "कृष्णः च}} 'राम और कृष्ण', {{अहम् अपि}} 'मैं भी', {{सत्यम् एव}} 'सत्य ही'।"),
            table(
                ("Five you will use every day", "रोज़ काम आने वाले पाँच"),
                [("Word", "शब्द"), ("Meaning", "अर्थ"), ("Example", "उदाहरण")],
                [
                    ["च", tc("and", "और"), "फलं जलं च"],
                    ["वा", tc("or", "या"), "चायं वा दुग्धं वा"],
                    ["अपि", tc("also, even", "भी"), "अहम् अपि"],
                    ["एव", tc("only, indeed — adds emphasis", "ही — ज़ोर देता है"), "त्वम् एव"],
                    ["तु", tc("but, as for", "तो, लेकिन"), "अहं तु न गच्छामि"],
                ],
            ),
            examples(
                ex("अहम् अपि आगच्छामि", "I am coming too.", "मैं भी आ रहा हूँ।",
                   w("अहम्", "I", "मैं", sub("अस्मद्")),
                   w("अपि", "too, also", "भी"),
                   w("आगच्छामि", "come (I)", "आता हूँ", tin("गम्", "Lat", "Uttama", prefixes=["आ"]))),
                ex("सः तु न पठति", "He, though, does not read.", "वह तो नहीं पढ़ता।",
                   w("तु", "but, though", "तो"),
                   w("न", "not", "नहीं"),
                   w("पठति", "reads", "पढ़ता है", tin("पठ्"))),
            ),
            watch("{{च}} often joins the word before it by sandhi: {{रामः}} + {{च}} → {{रामश्च}}. Spot the -ś- and you "
                  "have found the च.",
                  "{{च}} अक्सर पिछले शब्द से सन्धि करके जुड़ता है: {{रामः}} + {{च}} → {{रामश्च}}। -श्- दिखे, तो वहीं च है।"),
            wild(
                ex("त्वमेव माता च पिता त्वमेव", "You alone are mother, and father.", "तुम ही माता और पिता हो।",
                   w("एव", "alone, only", "ही"),
                   w("च", "and", "और"),
                   source=src("Traditional prayer", "पारम्परिक प्रार्थना"),
                   check=snd("त्वम्", "एव", joined="त्वमेव")),
            ),
        ],
        quiz=[
            q(("Where does च go in “fruit and water”?", "'फल और पानी' में च कहाँ आएगा?"),
              [opt_sa("फलं जलं च"), opt_sa("च फलं जलम्"), opt_sa("फलं च च जलम्")],
              0,
              ("च follows the words it joins.", "च जोड़े जाने वाले शब्दों के बाद आता है।")),
        ],
        terms=("avyaya",),
        feature_ids=("INDECL",),
        related=("question-place-time",),
    ),
    topic(
        "question-place-time",
        level=1,
        title=("Question, place and time words", "प्रश्न, स्थान और समय के शब्द"),
        title_sa="कुत्र कदा कथम्",
        summary=("A small set of words asks and answers where, when and how — the backbone of everyday talk.",
                 "कुछ छोटे शब्द कहाँ, कब और कैसे पूछते और बताते हैं — रोज़ की बातचीत की रीढ़।"),
        term=("कुत्र", "where?", "कहाँ?"),
        blocks=[
            text("Question words and their answers come in families. {{कुत्र}} “where?” is answered by {{अत्र}} “here” "
                 "or {{तत्र}} “there”; {{कदा}} “when?” by {{अद्य}} “today”, {{श्वः}} “tomorrow” or {{इदानीम्}} “now”.",
                 "प्रश्न-शब्द और उनके उत्तर परिवारों में आते हैं। {{कुत्र}} 'कहाँ?' का उत्तर {{अत्र}} 'यहाँ' या {{तत्र}} "
                 "'वहाँ'; {{कदा}} 'कब?' का उत्तर {{अद्य}} 'आज', {{श्वः}} 'कल' या {{इदानीम्}} 'अब'।"),
            table(
                ("Ask and answer", "पूछिए और बताइए"),
                [("Question", "प्रश्न"), ("Answers", "उत्तर"), ("Meaning", "अर्थ")],
                [
                    ["कुत्र", "अत्र · तत्र · सर्वत्र · कुत्रापि",
                     tc("where? — here, there, everywhere, anywhere", "कहाँ? — यहाँ, वहाँ, सब जगह, कहीं भी")],
                    ["कदा", "अद्य · श्वः · ह्यः · इदानीम् · सदा",
                     tc("when? — today, tomorrow, yesterday, now, always", "कब? — आज, आने वाला कल, बीता कल, अब, सदा")],
                    ["कथम्", "एवम् · शीघ्रम् · शनैः",
                     tc("how? — like this, quickly, slowly", "कैसे? — ऐसे, जल्दी, धीरे")],
                    ["किमर्थम्", "अतः · तस्मात्", tc("why? — therefore, for that reason", "क्यों? — इसलिए, उस कारण")],
                ],
            ),
            examples(
                ex("भवान् कुत्र गच्छति", "Where are you going?", "आप कहाँ जा रहे हैं?",
                   w("कुत्र", "where", "कहाँ"),
                   w("गच्छति", "go (polite you)", "जाते हैं", tin("गम्"))),
                ex("अहं श्वः आगमिष्यामि", "I will come tomorrow.", "मैं कल आऊँगा।",
                   w("श्वः", "tomorrow", "कल"),
                   w("आगमिष्यामि", "will come (I)", "आऊँगा", tin("गम्", "Lrt", "Uttama", prefixes=["आ"]))),
                ex("कथम् अस्ति भवान्", "How are you?", "आप कैसे हैं?",
                   w("कथम्", "how", "कैसे"),
                   w("अस्ति", "is", "हैं", tin("अस्"))),
            ),
            watch("Sanskrit has two words where Hindi has one: {{श्वः}} is “tomorrow” and {{ह्यः}} is “yesterday”; Hindi "
                  "says kal for both.",
                  "जहाँ हिन्दी में एक शब्द है, संस्कृत में दो हैं: {{श्वः}} = आने वाला कल, {{ह्यः}} = बीता हुआ कल; हिन्दी "
                  "दोनों के लिए 'कल' कहती है।"),
            tip("Add {{अपि}} to a question word for “any-”: {{कुत्रापि}} “anywhere”, {{कदापि}} “ever”. With न: {{कदापि न}} "
                "“never”.",
                "प्रश्न-शब्द में {{अपि}} जोड़िए तो 'कोई भी' का भाव: {{कुत्रापि}} 'कहीं भी', {{कदापि}} 'कभी भी'। न के साथ: "
                "{{कदापि न}} 'कभी नहीं'।"),
        ],
        quiz=[
            q(("“Yesterday” in Sanskrit is…", "संस्कृत में 'बीता हुआ कल' है…"),
              [opt_sa("ह्यः"), opt_sa("श्वः"), opt_sa("अद्य")],
              0,
              ("{{ह्यः}} yesterday, {{श्वः}} tomorrow, {{अद्य}} today.", "{{ह्यः}} बीता कल, {{श्वः}} आने वाला कल, {{अद्य}} आज।")),
        ],
        terms=("avyaya",),
        feature_ids=("INDECL",),
        related=("na-ma",),
    ),
    topic(
        "na-ma",
        level=1,
        title=("Saying no: न and मा", "निषेध: न और मा"),
        title_sa="न मा च",
        summary=("न negates a statement; मा forbids — “don't!”.", "न किसी कथन को नकारता है; मा मना करता है — 'मत!'।"),
        term=("न", "not", "नहीं"),
        blocks=[
            text("Put {{न}} before the verb to say “not”: {{सः न पठति}} “he does not read”. To tell someone not to do "
                 "something, use {{मा}}: {{मा गच्छ}} “don't go”. {{न}} states a fact; {{मा}} gives an order.",
                 "क्रिया से पहले {{न}} लगाइए, अर्थ 'नहीं': {{सः न पठति}} 'वह नहीं पढ़ता'। किसी को कुछ करने से रोकना हो तो "
                 "{{मा}}: {{मा गच्छ}} 'मत जाओ'। {{न}} तथ्य बताता है; {{मा}} आदेश देता है।"),
            examples(
                ex("अहं मांसं न खादामि", "I don't eat meat.", "मैं मांस नहीं खाता।",
                   w("मांसं", "meat", "मांस", sub("मांस", "Napumsaka", "Dvitiya")),
                   w("न", "not", "नहीं"),
                   w("खादामि", "eat (I)", "खाता हूँ", tin("खाद्", "Lat", "Uttama"))),
                ex("मा चिन्तय", "Don't worry.", "चिंता मत करो।",
                   w("मा", "don't", "मत"),
                   w("चिन्तय", "worry, think (you)", "सोचो", tin("चिन्त्", "Lot", "Madhyama"))),
                ex("अहं न जानामि", "I don't know.", "मैं नहीं जानता।",
                   w("न", "not", "नहीं"),
                   w("जानामि", "know (I)", "जानता हूँ", tin("ज्ञा", "Lat", "Uttama"))),
            ),
            watch("Don't use {{न}} for commands: “don't go” is {{मा गच्छ}}, not {{न गच्छ}}.",
                  "आदेश में {{न}} मत लगाइए: 'मत जाओ' = {{मा गच्छ}}, {{न गच्छ}} नहीं।"),
            tip("{{नहि}} is an emphatic “surely not”, and {{नैव}} (न + एव) means “not at all”.",
                "{{नहि}} ज़ोरदार 'बिल्कुल नहीं' है, और {{नैव}} (न + एव) का अर्थ 'ज़रा भी नहीं'।"),
            wild(
                ex("अहिंसा परमो धर्मः", "Non-violence is the highest dharma — a-hiṃsā is “not harming”.",
                   "अहिंसा परम धर्म है — अ-हिंसा यानी 'हिंसा न करना'।",
                   source=src("Mahābhārata", "महाभारत"), check=sub("अहिंसा", "Stri", form="अहिंसा")),
            ),
        ],
        deeper=[
            go_deeper(
                ("“Not” inside a word: a-, an-", "शब्द के भीतर 'नहीं': अ-, अन्-"),
                text("Inside a word, “not” is the prefix a- before a consonant and an- before a vowel: {{अहिंसा}} "
                     "“non-violence”, {{असत्यम्}} “untruth”, {{अनन्तः}} “endless”. These are compounds — see the "
                     "Compounds chapter.",
                     "शब्द के भीतर 'नहीं' का भाव व्यंजन से पहले अ- और स्वर से पहले अन्- से आता है: {{अहिंसा}}, {{असत्यम्}} "
                     "'झूठ', {{अनन्तः}} 'जिसका अंत न हो'। ये समास हैं — समास वाला अध्याय देखिए।"),
                examples(
                    ex("असत्यम्", "untruth", "असत्य, झूठ", check=sub("असत्य", "Napumsaka")),
                    ex("अनन्तः", "endless", "अनंत", check=sub("अनन्त")),
                ),
            ),
        ],
        quiz=[
            q(("“Don't speak” = ?", "'मत बोलो' = ?"),
              [opt_sa("मा वद"), opt_sa("न वद"), opt_sa("न वदति")],
              0,
              ("A “don't” command takes {{मा}}.", "'मत' वाले आदेश में {{मा}} आता है।")),
        ],
        terms=("avyaya",),
        feature_ids=("INDECL",),
        related=("iti",),
    ),
    topic(
        "iti",
        level=2,
        title=("इति: quotes and thoughts", "इति: उद्धरण और विचार"),
        title_sa="इति",
        summary=("Sanskrit has no quotation marks: इति closes whatever someone said or thought.",
                 "संस्कृत में उद्धरण-चिह्न नहीं होते: इति बताता है कि किसी की कही या सोची बात यहाँ खत्म हुई।"),
        term=("इति", "thus — closes a quote or a thought", "इति — उद्धरण या विचार का अंत"),
        blocks=[
            text("Where English uses quotation marks, Sanskrit puts {{इति}} “thus” after the words: {{नमस्ते इति सः वदति}} "
                 "“he says ‘namaste’”. It also marks thoughts and names: {{रामः इति नाम}} “the name Rāma”.",
                 "जहाँ अंग्रेज़ी उद्धरण-चिह्न लगाती है, संस्कृत शब्दों के बाद {{इति}} 'ऐसा' लगाता है: {{नमस्ते इति सः वदति}} "
                 "'वह नमस्ते कहता है'। यह विचार और नाम भी बताता है: {{रामः इति नाम}} 'राम नाम'।"),
            examples(
                ex("गच्छामि इति सः अवदत्", "“I am going,” he said.", "'मैं जा रहा हूँ,' उसने कहा।",
                   w("गच्छामि", "I am going — his words", "मैं जा रहा हूँ — उसके शब्द", tin("गम्", "Lat", "Uttama")),
                   w("इति", "closes the quote", "उद्धरण का अंत"),
                   w("अवदत्", "said", "कहा", tin("वद्", "Lan"))),
                ex("वर्षा भविष्यति इति चिन्तयामि", "I think it will rain.", "मुझे लगता है कि वर्षा होगी।",
                   w("भविष्यति", "will be", "होगी", tin("भू", "Lrt")),
                   w("इति", "marks the thought", "विचार का अंत"),
                   w("चिन्तयामि", "think (I)", "सोचता हूँ", tin("चिन्त्", "Lat", "Uttama"))),
            ),
            formula("तथा", "इति", "तथेति", "ā + i → e: the quote marker hides inside the word",
                    "आ + इ → ए: इति शब्द के भीतर छिप जाता है", check=snd("तथा", "इति")),
            watch("{{इति}} joins by sandhi, so look for a hidden one wherever a word ends in -eti or -ity-: {{तथेति}}, "
                  "{{इत्यादि}} “and so on”.",
                  "{{इति}} सन्धि से जुड़ता है, इसलिए -एति या -इत्य- दिखे तो छिपा इति खोजिए: {{तथेति}}, {{इत्यादि}} 'इत्यादि, आदि'।"),
            tip("{{इति}} also ends books and chapters: many manuscripts close with {{इति शुभम्}} “thus, all is well”.",
                "{{इति}} पुस्तक और अध्याय के अंत में भी आता है: बहुत-सी पाण्डुलिपियाँ {{इति शुभम्}} से खत्म होती हैं।"),
        ],
        quiz=[
            q(("What does इति do in {{नमस्ते इति वदति}}?", "{{नमस्ते इति वदति}} में इति क्या करता है?"),
              [opt("It closes the quoted word", "उद्धृत शब्द का अंत बताता है"), opt("It means “and”", "इसका अर्थ 'और' है"),
               opt("It makes a question", "यह प्रश्न बनाता है")],
              0,
              ("इति works like closing quotation marks.", "इति उद्धरण-चिह्न बंद करने जैसा काम करता है।")),
        ],
        terms=("avyaya", "sandhi"),
        feature_ids=("INDECL",),
        related=("indeclinables",),
    ),
]
