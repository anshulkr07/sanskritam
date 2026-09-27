"""Chapter 0 · Start here — what grammar means here, and how to read the guide."""

from __future__ import annotations

from .model import (
    analogy, cell, chapter, ex, examples, go_deeper, opt, proof, q, snd, src, sub,
    table, tc, text, tin, tip, topic, w, watch, wild,
)

CHAPTER = chapter(
    "start",
    title=("Start here", "यहाँ से शुरू करें"),
    title_sa="आरम्भः",
    blurb=("What Sanskrit grammar is, and how to read this guide.",
           "संस्कृत व्याकरण क्या है, और इस गाइड को कैसे पढ़ें।"),
    icon="sparkles-outline",
)

TOPICS = [
    topic(
        "how-it-works",
        level=1,
        title=("How Sanskrit grammar works", "संस्कृत व्याकरण कैसे काम करता है"),
        title_sa="व्याकरणम्",
        summary=("A Sanskrit word carries its job in its ending, so the words can go in almost any order.",
                 "संस्कृत शब्द का काम उसके अंत में छिपा होता है, इसलिए शब्द लगभग किसी भी क्रम में आ सकते हैं।"),
        term=("व्याकरणम्", "grammar — literally “taking apart”", "व्याकरण — शब्दशः 'अलग करके देखना'"),
        minutes=3,
        blocks=[
            text("English shows who does what through word order: “the boy sees the dog” is not "
                 "“the dog sees the boy”. Sanskrit keeps that information inside each word, at its "
                 "end. Change the ending and the meaning changes. Move the word and nothing changes.",
                 "हिन्दी में 'कौन क्या करता है' यह 'ने', 'को', 'से' जैसे छोटे शब्दों से पता चलता है। "
                 "संस्कृत में यही जानकारी शब्द के अंत में जुड़ी रहती है। अंत बदलिए तो अर्थ बदल जाएगा; "
                 "शब्द की जगह बदलिए तो कुछ नहीं बदलेगा।"),
            examples(
                ex("बालकः फलं खादति", "The boy eats a fruit.", "बालक फल खाता है।",
                   w("बालकः", "the boy — the one doing it", "बालक — काम करने वाला", sub("बालक")),
                   w("फलं", "a fruit — the thing eaten", "फल — जो खाया जा रहा है",
                     sub("फल", "Napumsaka", "Dvitiya")),
                   w("खादति", "eats", "खाता है", tin("खाद्"))),
                ex("फलं बालकः खादति", "Same words, new order — still “the boy eats a fruit”.",
                   "वही शब्द, नया क्रम — अर्थ फिर भी 'बालक फल खाता है'।"),
                ex("खादति बालकः फलम्", "Verb first — the meaning still holds.",
                   "क्रिया पहले — अर्थ फिर भी वही।"),
                title=("One sentence, three orders", "एक वाक्य, तीन क्रम"),
            ),
            analogy("Think of each ending as a name badge. One word wears “doer”, another wears "
                    "“thing done to”. Shuffle the people around the room and the badges still tell "
                    "you who is who.",
                    "हिन्दी में हम 'राम ने', 'राम को', 'घर में' कहते हैं — काम बताने वाला शब्द अलग से लगता है। "
                    "संस्कृत में वही काम शब्द के अंत में जुड़ जाता है: {{रामः}}, {{रामम्}}, {{गृहे}}।"),
            text("Three big ideas run through the whole language: **endings** (how one word takes "
                 "many forms), **sandhi** (how sounds merge where words meet) and **compounds** "
                 "(how words join into one long word). Each gets its own chapter here.",
                 "पूरी भाषा तीन बड़ी बातों पर चलती है: **विभक्ति और प्रत्यय** (एक शब्द के कई रूप कैसे "
                 "बनते हैं), **सन्धि** (शब्द मिलने पर ध्वनियाँ कैसे जुड़ती हैं) और **समास** (कई शब्द "
                 "मिलकर एक लम्बा शब्द कैसे बनते हैं)। इस गाइड में हर एक का अपना अध्याय है।"),
            wild(
                ex("नमस्ते", "“I bow to you” — the everyday greeting", "'आपको नमन' — रोज़ का अभिवादन",
                   source=src("Everyday greeting", "रोज़ का अभिवादन")),
                ex("योगः", "yoga — joining, discipline", "योग — जुड़ना, साधना",
                   source=src("A Sanskrit word used worldwide", "दुनिया भर में प्रचलित संस्कृत शब्द"),
                   check=sub("योग")),
                ex("सत्यमेव जयते", "Truth alone wins.", "सत्य की ही जीत होती है।",
                   source=src("Muṇḍaka Upaniṣad 3.1.6 · national motto of India",
                              "मुण्डक उपनिषद् 3.1.6 · भारत का राष्ट्रीय आदर्श-वाक्य"),
                   check=snd("सत्यम्", "एव", joined="सत्यमेव")),
            ),
            tip("Don't memorise anything yet. First learn to notice endings — the tables in later "
                "chapters will then make sense quickly.",
                "अभी कुछ भी रटने की ज़रूरत नहीं। पहले शब्दों के अंत पर ध्यान देना सीखिए — आगे की "
                "तालिकाएँ फिर जल्दी समझ आएँगी।"),
        ],
        deeper=[
            go_deeper(
                ("Why is it called vyākaraṇa?", "इसे व्याकरण क्यों कहते हैं?"),
                text("{{व्याकरणम्}} comes from vi + ā + kṛ, “to take apart”. Grammar here means "
                     "splitting a word into its root and suffixes to see why it looks the way it "
                     "does. Around the 4th century BCE, Pāṇini wrote nearly 4,000 short rules that "
                     "do exactly this. The engine inside this app follows his rules.",
                     "{{व्याकरणम्}} शब्द वि + आ + कृ से बना है — 'अलग-अलग करके देखना'। यहाँ व्याकरण का "
                     "अर्थ है शब्द को धातु और प्रत्ययों में तोड़कर समझना कि वह ऐसा क्यों दिखता है। "
                     "लगभग चौथी शताब्दी ईसा पूर्व में पाणिनि ने करीब 4,000 छोटे नियम लिखे जो ठीक यही "
                     "करते हैं। इस ऐप का इंजन उन्हीं नियमों पर चलता है।"),
            ),
        ],
        quiz=[
            q(("In {{बालकः फलं खादति}}, what happens if you swap the first two words?",
               "{{बालकः फलं खादति}} में पहले दो शब्दों की जगह बदलने पर क्या होगा?"),
              [opt("Nothing — it still means the boy eats a fruit", "कुछ नहीं — अर्थ वही रहेगा"),
               opt("It means the fruit eats the boy", "अर्थ होगा कि फल बालक को खाता है"),
               opt("It turns into a question", "यह प्रश्न बन जाएगा")],
              0,
              ("The endings already mark who eats and what is eaten, so the order is free.",
               "अंत पहले ही बता देते हैं कि कौन खा रहा है और क्या खाया जा रहा है, इसलिए क्रम "
               "बदलने से अर्थ नहीं बदलता।")),
            q(("Where does a Sanskrit word show its job in the sentence?",
               "संस्कृत शब्द वाक्य में अपना काम कहाँ दिखाता है?"),
              [opt("In its ending", "अपने अंत में"),
               opt("In its position", "अपनी जगह से"),
               opt("In a separate little word", "एक अलग छोटे शब्द से")],
              0,
              ("The ending carries the job; the position is free.",
               "काम शब्द के अंत में होता है; जगह स्वतंत्र है।")),
        ],
        proofs=[
            proof("word-order", ("Try to break a sentence", "वाक्य का अर्थ बिगाड़कर देखिए"),
                  sentence="रामः फलम् खादति"),
        ],
        terms=("vyakarana", "vibhakti", "sandhi", "samasa"),
        feature_ids=("NOM.SG", "ACC.SG"),
        related=("reading-roman",),
    ),
    topic(
        "reading-roman",
        level=1,
        title=("Reading romanized Sanskrit", "रोमन अक्षरों में संस्कृत पढ़ना"),
        title_sa="लिप्यन्तरणम्",
        summary=("Every Sanskrit word here is also spelled in Roman letters. A handful of marks is all you need.",
                 "यहाँ हर संस्कृत शब्द रोमन अक्षरों में भी लिखा है। बस कुछ चिह्न समझ लीजिए।"),
        term=("लिप्यन्तरणम्", "transliteration — writing in another script",
              "लिप्यन्तरण — दूसरी लिपि में लिखना"),
        minutes=4,
        blocks=[
            text("Under each Devanagari word you'll see its IAST spelling — the standard way to write "
                 "Sanskrit in Roman letters. It is exact: one letter is always one sound, so you never "
                 "have to guess how to say a word.",
                 "हर देवनागरी शब्द के नीचे उसकी IAST वर्तनी दी गई है — रोमन अक्षरों में संस्कृत लिखने का "
                 "मानक तरीका। इसमें एक अक्षर हमेशा एक ही ध्वनि होता है। अगर आप देवनागरी आराम से पढ़ते "
                 "हैं, तो यह पाठ छोड़ सकते हैं।"),
            table(
                ("The five marks", "पाँच चिह्न"),
                [("Mark", "चिह्न"), ("What it means", "मतलब"), ("Example", "उदाहरण")],
                [
                    [tc("ā ī ū — a line on top", "ā ī ū — ऊपर रेखा"),
                     tc("a long vowel: hold it twice as long", "दीर्घ स्वर: दुगुना लम्बा बोलिए"),
                     cell("रामः", sub("राम"))],
                    [tc("ṭ ḍ ṇ ṣ — a dot below", "ṭ ḍ ṇ ṣ — नीचे बिंदु"),
                     tc("tongue curled back to the roof of the mouth", "जीभ मुड़कर तालु के ऊपरी भाग को छुए"),
                     cell("गणेशः", sub("गणेश"))],
                    [tc("ś — a mark on s", "ś — s पर निशान"),
                     tc("“sh”, as in shine", "'श' की ध्वनि"),
                     cell("शिवः", sub("शिव"))],
                    [tc("ṃ — a dot under m", "ṃ — m के नीचे बिंदु"),
                     tc("a nasal hum (anusvāra)", "नाक से गूँज (अनुस्वार)"),
                     cell("संस्कृतम्", sub("संस्कृत", "Napumsaka"))],
                    [tc("ḥ — a dot under h", "ḥ — h के नीचे बिंदु"),
                     tc("a soft echo of breath (visarga)", "हल्की साँस की गूँज (विसर्ग)"),
                     cell("कृष्णः", sub("कृष्ण"))],
                ],
            ),
            table(
                ("Letters that fool English readers", "जो अक्षर अंग्रेज़ी पढ़ने वालों को भ्रमित करते हैं"),
                [("Written", "लिखा"), ("Say", "बोलिए"), ("Example", "उदाहरण")],
                [
                    [tc("c", "c (च)"), tc("“ch” as in church — never k", "'च' — कभी 'क' नहीं"),
                     cell("चन्द्रः", sub("चन्द्र"))],
                    [tc("kh, th, bh…", "kh, th, bh… (ख, थ, भ…)"),
                     tc("the letter with a puff of breath — th is not the “th” of “the”",
                        "महाप्राण: साँस के झोंके के साथ — th = 'थ'"),
                     cell("भारतम्", sub("भारत", "Napumsaka"))],
                    [tc("ṛ", "ṛ (ऋ)"), tc("a vowel, a quick “ri”", "स्वर 'ऋ', जल्दी से 'रि' जैसा"),
                     cell("पितृ")],
                    [tc("a", "a (अ)"), tc("short, like the u in “but”", "'अ' — छोटा"),
                     cell("अहम्", sub("अस्मद्"))],
                ],
            ),
            watch("ā is the long “aa” of “father”; plain a is short, like “but”. Read "
                  "rāma as “raa-muh”, not “ramma”.",
                  "ā = 'आ' और a = 'अ'। rāma को 'रा-म' पढ़िए, 'रम्मा' नहीं।"),
            tip("Where you see a speaker button beside Sanskrit, tap it to hear the word.",
                "जहाँ संस्कृत शब्द के पास स्पीकर का बटन दिखे, उसे दबाकर शब्द सुनिए।"),
        ],
        deeper=[
            go_deeper(
                ("Why not just write “Krishna”?", "सीधे 'Krishna' क्यों न लिखें?"),
                text("Everyday spellings like Krishna or Shiva lose information: they cannot show long "
                     "vowels, or the difference between ṣ and ś. IAST keeps every sound, so the "
                     "spelling you read and the word the engine checks are always the same word.",
                     "'Krishna' या 'Shiva' जैसी आम वर्तनी में जानकारी खो जाती है — न दीर्घ स्वर दिखते हैं, "
                     "न ष और श का अंतर। IAST हर ध्वनि को बचाकर रखता है, इसलिए आप जो पढ़ते हैं और इंजन "
                     "जिसकी जाँच करता है, वह हमेशा एक ही शब्द होता है।"),
            ),
        ],
        quiz=[
            q(("Which mark shows a long vowel?", "कौन-सा चिह्न दीर्घ स्वर दिखाता है?"),
              [opt("ā — a line on top", "ā — ऊपर रेखा"),
               opt("ṭ — a dot below", "ṭ — नीचे बिंदु"),
               opt("ś — a mark on s", "ś — s पर निशान")],
              0,
              ("A line on top makes the vowel twice as long: a → ā.",
               "ऊपर की रेखा स्वर को दुगुना लम्बा करती है: a → ā।")),
            q(("How do you say the c in candra?", "candra में c कैसे बोलेंगे?"),
              [opt("“ch”, as in church", "'च' की तरह"),
               opt("“k”, as in cat", "'क' की तरह"),
               opt("“s”, as in sun", "'स' की तरह")],
              0,
              ("In IAST, c is always “ch”: candra = {{चन्द्र}}.",
               "IAST में c हमेशा 'च' होता है: candra = {{चन्द्र}}।")),
        ],
        terms=("lipyantarana", "anusvara", "visarga"),
        related=("how-it-works",),
    ),
]
