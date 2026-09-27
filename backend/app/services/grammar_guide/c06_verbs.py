"""Chapter 6 · Verbs — anatomy and roots, the 9-cell grid, the two ending sets,
the ten verb classes, and “to be”. Every grid form was printed by the engine
before it was written here, and each cell carries its check."""

from __future__ import annotations

from ._families_common import verb_table
from .model import (
    cell, chapter, ex, examples, formula, go_deeper, krd, opt, opt_sa, proof, q, src,
    sub, table, tc, text, tin, tip, topic, w, watch, wild,
)

CHAPTER = chapter(
    "verbs",
    title=("Verbs", "क्रिया"),
    title_sa="क्रियापदानि",
    blurb=("Roots, endings, the nine-form grid and the ten verb classes.",
           "धातु, प्रत्यय, नौ रूपों की सारणी और दस गण।"),
    icon="flash-outline",
)

TOPICS = [
    topic(
        "verb-anatomy",
        level=1,
        title=("Anatomy of a verb", "क्रिया की बनावट"),
        title_sa="तिङन्तम्",
        summary=("One Sanskrit verb packs a root, a tense and a person-and-number ending into one word: पठति = he reads.",
                 "एक संस्कृत क्रिया में धातु, काल और पुरुष-वचन सब एक शब्द में होते हैं: पठति = वह पढ़ता है।"),
        term=("धातुः", "root — the core of a verb", "धातु — क्रिया का मूल"),
        blocks=[
            text("Take {{पठति}} “he reads”. Its core is the root {{पठ्}} “read”; an -a- is added for the present, "
                 "and -ti says “he, she or it — one person”. Change the ending and you change who is reading: "
                 "{{पठामि}} “I read”.",
                 "{{पठति}} 'वह पढ़ता है' को लीजिए। इसका मूल धातु {{पठ्}} 'पढ़ना' है; वर्तमान काल के लिए -अ- जुड़ता है, "
                 "और -ति बताता है 'वह, एक व्यक्ति'। अंत बदलिए, पढ़ने वाला बदल जाएगा: {{पठामि}} 'मैं पढ़ता हूँ'।"),
            formula("पठ्", "ति", "पठति", "root + ending, with -a- between → he reads",
                    "धातु + प्रत्यय, बीच में -अ- → वह पढ़ता है", check=tin("पठ्")),
            table(
                ("Roots you will meet first", "पहले मिलने वाली धातुएँ"),
                [("Root", "धातु"), ("Meaning", "अर्थ"), ("He / she does", "वह करता है")],
                [
                    ["भू", tc("be, become", "होना"), cell("भवति", tin("भू"))],
                    ["गम्", tc("go", "जाना"), cell("गच्छति", tin("गम्"))],
                    ["पठ्", tc("read", "पढ़ना"), cell("पठति", tin("पठ्"))],
                    ["वद्", tc("speak", "बोलना"), cell("वदति", tin("वद्"))],
                    ["दृश्", tc("see", "देखना"), cell("पश्यति", tin("दृश्"))],
                    ["कृ", tc("do, make", "करना"), cell("करोति", tin("कृ"))],
                    ["स्था", tc("stand, stay", "ठहरना"), cell("तिष्ठति", tin("स्था"))],
                    ["पा", tc("drink", "पीना"), cell("पिबति", tin("पा"))],
                ],
            ),
            watch("Many roots change shape in the present: {{गम्}} → {{गच्छति}}, {{दृश्}} → {{पश्यति}}, {{स्था}} → "
                  "{{तिष्ठति}}. Dictionaries list the root, so learn the two together.",
                  "कई धातुएँ वर्तमान काल में रूप बदलती हैं: {{गम्}} → {{गच्छति}}, {{दृश्}} → {{पश्यति}}, {{स्था}} → "
                  "{{तिष्ठति}}। शब्दकोश धातु देते हैं, इसलिए दोनों साथ सीखिए।"),
            tip("Sanskrit books cite a verb in its he-form of the present — {{भवति}} — rather than as “to be”.",
                "संस्कृत पुस्तकें क्रिया को वर्तमान काल के 'वह' वाले रूप में बताती हैं — {{भवति}} — 'होना' जैसे रूप में नहीं।"),
            wild(
                ex("धर्मो रक्षति रक्षितः", "Dharma protects those who protect it.",
                   "जो धर्म की रक्षा करता है, धर्म उसकी रक्षा करता है।",
                   w("धर्मो", "dharma", "धर्म", sub("धर्म", form="धर्मः")),
                   w("रक्षति", "protects — root रक्ष्", "रक्षा करता है — धातु रक्ष्", tin("रक्ष्")),
                   w("रक्षितः", "protected", "रक्षित", krd("रक्ष्", "kta", linga="Pum", vibhakti="Prathama", vacana="Eka")),
                   source=src("Manusmṛti 8.15 · motto of R&AW", "मनुस्मृति 8.15 · रॉ का आदर्श-वाक्य")),
            ),
        ],
        deeper=[
            go_deeper(
                ("Subanta and tiṅanta", "सुबन्त और तिङन्त"),
                text("Pāṇini calls a conjugated verb a {{तिङन्तम्}} — “ending in tiṅ”, his name for the 18 verb endings "
                     "(nine of the -ti set, nine of the -te set). Nouns are subanta, verbs tiṅanta: every Sanskrit word "
                     "is one or the other, or an indeclinable.",
                     "पाणिनि रूप-युक्त क्रिया को {{तिङन्तम्}} कहते हैं — 'तिङ् पर अंत होने वाला', जहाँ तिङ् 18 क्रिया-प्रत्ययों "
                     "का नाम है (नौ परस्मैपद, नौ आत्मनेपद)। संज्ञा सुबन्त है, क्रिया तिङन्त: हर संस्कृत शब्द इनमें से एक है, "
                     "या फिर अव्यय।"),
            ),
        ],
        quiz=[
            q(("What is the root of {{गच्छति}}?", "{{गच्छति}} की धातु क्या है?"),
              [opt_sa("गम्"), opt_sa("गच्छ्"), opt_sa("गा")],
              0,
              ("{{गच्छति}} comes from {{गम्}} “go”; the present stem changes shape.",
               "{{गच्छति}} {{गम्}} 'जाना' से बनता है; वर्तमान में रूप बदल जाता है।")),
        ],
        proofs=[
            proof("derive", ("Watch पठति being built", "पठति बनते हुए देखिए"),
                  dhatu="पठ्", lakara="Lat", purusha="Prathama", vacana="Eka"),
        ],
        terms=("dhatu", "pratyaya"),
        feature_ids=("PRES.3SG",),
        related=("verb-grid",),
    ),
    topic(
        "verb-grid",
        level=1,
        title=("The 9-cell grid: person × number", "नौ खानों की सारणी: पुरुष × वचन"),
        title_sa="पुरुषवचनानि",
        summary=("Every tense has nine forms: three persons times three numbers.",
                 "हर काल में नौ रूप होते हैं: तीन पुरुष × तीन वचन।"),
        term=("पुरुषः", "person — he, you, I", "पुरुष — वह, तुम, मैं"),
        blocks=[
            text("A verb ending tells you two things at once: who (he, you, I) and how many (one, two, many). "
                 "That makes a 3 × 3 grid. Learn it for {{पठ्}} and you can conjugate most common roots in the present.",
                 "क्रिया का अंत एक साथ दो बातें बताता है: कौन (वह, तुम, मैं) और कितने (एक, दो, बहुत)। इससे 3 × 3 की "
                 "सारणी बनती है। {{पठ्}} की सारणी सीख ली, तो ज़्यादातर आम धातुओं का वर्तमान काल आ जाएगा।"),
            verb_table("पठ्", "Lat", ["पठति पठतः पठन्ति", "पठसि पठथः पठथ", "पठामि पठावः पठामः"],
                       ("पठ् “read” — present tense", "पठ् 'पढ़ना' — वर्तमान काल"), stem="पठ"),
            table(
                ("Endings to remember", "याद रखने वाले अंत"),
                [("Person", "पुरुष"), ("One", "एकवचन"), ("Two", "द्विवचन"), ("Many", "बहुवचन")],
                [
                    [tc("he, she, it", "वह"), "-ति", "-तः", "-अन्ति"],
                    [tc("you", "तुम"), "-सि", "-थः", "-थ"],
                    [tc("I, we", "मैं, हम"), "-आमि", "-आवः", "-आमः"],
                ],
            ),
            watch("The names run backwards: Sanskrit's “first person” (prathama puruṣa) is he or she, and its "
                  "“last person” (uttama puruṣa) is I.",
                  "नाम उल्टे हैं: संस्कृत का प्रथम पुरुष 'वह' है, और उत्तम पुरुष 'मैं'।"),
            examples(
                ex("त्वं किं पठसि", "What are you reading?", "तुम क्या पढ़ रहे हो?",
                   w("त्वं", "you", "तुम", sub("युष्मद्")),
                   w("पठसि", "read (you, one)", "पढ़ते हो", tin("पठ्", "Lat", "Madhyama"))),
                ex("आवां गच्छावः", "We two are going.", "हम दोनों जा रहे हैं।",
                   w("आवां", "we two", "हम दोनों", sub("अस्मद्", "Pum", "Prathama", "Dvi")),
                   w("गच्छावः", "go (we two)", "जाते हैं", tin("गम्", "Lat", "Uttama", "Dvi"))),
                ex("ते क्रीडन्ति", "They are playing.", "वे खेल रहे हैं।",
                   w("ते", "they", "वे", sub("तद्", "Pum", "Prathama", "Bahu")),
                   w("क्रीडन्ति", "play (they)", "खेलते हैं", tin("क्रीड्", "Lat", "Prathama", "Bahu"))),
            ),
            wild(
                ex("उत्तिष्ठत जाग्रत", "Arise, awake!", "उठो, जागो!",
                   w("उत्तिष्ठत", "arise (you all)", "उठो (तुम सब)",
                     tin("स्था", "Lot", "Madhyama", "Bahu", prefixes=["उद्"])),
                   w("जाग्रत", "awake (you all)", "जागो (तुम सब)"),
                   source=src("Kaṭha Upaniṣad 1.3.14", "कठ उपनिषद् 1.3.14")),
            ),
        ],
        deeper=[
            go_deeper(
                ("Why the pronoun is often dropped", "सर्वनाम अक्सर क्यों छूट जाता है"),
                text("The ending already says who, so the pronoun is often left out: {{पठामि}} alone means “I read”. "
                     "Add {{अहम्}} only for emphasis.",
                     "अंत पहले ही बता देता है कि कौन, इसलिए सर्वनाम अक्सर छोड़ दिया जाता है: अकेला {{पठामि}} = 'मैं पढ़ता "
                     "हूँ'। ज़ोर देने के लिए ही {{अहम्}} जोड़िए।"),
            ),
        ],
        quiz=[
            q(("“We (many) read” = ?", "'हम (बहुत) पढ़ते हैं' = ?"),
              [opt_sa("पठामः", tin("पठ्", "Lat", "Uttama", "Bahu")), opt_sa("पठावः", tin("पठ्", "Lat", "Uttama", "Dvi")),
               opt_sa("पठन्ति", tin("पठ्", "Lat", "Prathama", "Bahu"))],
              0,
              ("I or we, many: -āmaḥ.", "मैं/हम, बहुवचन: -आमः।")),
        ],
        proofs=[
            proof("paradigm", ("See the grid for गम्", "गम् की सारणी देखिए"), dhatu="गम्", lakara="Lat"),
        ],
        terms=("purusha", "vacana"),
        feature_ids=("PRES.1SG", "PRES.2SG", "PRES.3SG", "PRES.1DU", "PRES.2DU", "PRES.3DU",
                     "PRES.1PL", "PRES.2PL", "PRES.3PL"),
        related=("two-endings",),
    ),
    topic(
        "two-endings",
        level=2,
        title=("Two sets of endings: -ti and -te", "दो प्रत्यय-समूह: -ति और -ते"),
        title_sa="परस्मैपदम् आत्मनेपदं च",
        summary=("Some roots take -ti endings, some take -te endings, and some take both.",
                 "कुछ धातुओं में -ति वाले प्रत्यय लगते हैं, कुछ में -ते वाले, और कुछ में दोनों।"),
        term=("आत्मनेपदम्", "the -te set of endings", "आत्मनेपद — -ते वाले प्रत्यय"),
        blocks=[
            text("Sanskrit has two sets of verb endings. {{पठति}} uses the -ti set, called parasmaipada; "
                 "{{सेवते}} “serves” uses the -te set, called ātmanepada. Which set a root takes is mostly fixed, "
                 "so learn it along with the root.",
                 "संस्कृत में क्रिया के दो प्रत्यय-समूह हैं। {{पठति}} में -ति वाला समूह है, जिसे परस्मैपद कहते हैं; "
                 "{{सेवते}} 'सेवा करता है' में -ते वाला समूह, जिसे आत्मनेपद कहते हैं। कौन-सी धातु कौन-सा समूह लेगी, यह "
                 "ज़्यादातर तय है, इसलिए धातु के साथ ही सीखिए।"),
            verb_table("सेव्", "Lat", ["सेवते सेवेते सेवन्ते", "सेवसे सेवेथे सेवध्वे", "सेवे सेवावहे सेवामहे"],
                       ("सेव् “serve” — the -te endings", "सेव् 'सेवा करना' — आत्मनेपद"), stem="सेव"),
            table(
                ("Side by side", "साथ-साथ"),
                [("Person", "पुरुष"), ("-ti set", "परस्मैपद"), ("-te set", "आत्मनेपद")],
                [
                    [tc("he, she", "वह"), cell("पठति", tin("पठ्")), cell("लभते", tin("लभ्"))],
                    [tc("you", "तुम"), cell("पठसि", tin("पठ्", "Lat", "Madhyama")),
                     cell("लभसे", tin("लभ्", "Lat", "Madhyama"))],
                    [tc("I", "मैं"), cell("पठामि", tin("पठ्", "Lat", "Uttama")), cell("लभे", tin("लभ्", "Lat", "Uttama"))],
                ],
            ),
            tip("Some roots take both: {{करोति}} and {{कुरुते}} both mean “does”. Traditionally -te hints that the "
                "action is for oneself.",
                "कुछ धातुएँ दोनों लेती हैं: {{करोति}} और {{कुरुते}} दोनों का अर्थ 'करता है'। परम्परा से -ते का भाव है "
                "कि काम अपने लिए है।"),
            examples(
                ex("सः फलं लभते", "He gets a fruit.", "उसे फल मिलता है।",
                   w("सः", "he", "वह", sub("तद्")),
                   w("फलं", "a fruit", "फल", sub("फल", "Napumsaka", "Dvitiya")),
                   w("लभते", "gets — -te ending", "पाता है — आत्मनेपद", tin("लभ्"))),
                ex("अहं गुरुं सेवे", "I serve the teacher.", "मैं गुरु की सेवा करता हूँ।",
                   w("अहं", "I", "मैं", sub("अस्मद्")),
                   w("गुरुं", "the teacher", "गुरु की", sub("गुरु", "Pum", "Dvitiya")),
                   w("सेवे", "serve (I) — -te ending", "सेवा करता हूँ — आत्मनेपद", tin("सेव्", "Lat", "Uttama"))),
            ),
            wild(
                ex("वन्दे मातरम्", "I bow to the Mother.", "मैं माँ को नमन करता हूँ।",
                   w("वन्दे", "I bow — the -te set, “I” form", "नमन करता हूँ — आत्मनेपद, उत्तम पुरुष",
                     tin("वन्द्", "Lat", "Uttama")),
                   w("मातरम्", "to the mother", "माँ को", sub("मातृ", "Stri", "Dvitiya")),
                   source=src("Bankim Chandra Chattopadhyay, Ānandamaṭh · India's national song",
                              "बंकिमचन्द्र चट्टोपाध्याय, आनन्दमठ · भारत का राष्ट्रगीत")),
            ),
        ],
        deeper=[
            go_deeper(
                ("What the names mean", "नामों का अर्थ"),
                text("{{परस्मैपदम्}} means “a word for another” and {{आत्मनेपदम्}} “a word for oneself”. The old idea: "
                     "{{यजति}} “performs a sacrifice for someone”, {{यजते}} “sacrifices for himself”. In later Sanskrit the "
                     "choice is mostly fixed per root.",
                     "{{परस्मैपदम्}} का अर्थ 'दूसरे के लिए शब्द' और {{आत्मनेपदम्}} 'अपने लिए शब्द'। पुराना विचार: {{यजति}} "
                     "'किसी और के लिए यज्ञ करता है', {{यजते}} 'अपने लिए यज्ञ करता है'। बाद की संस्कृत में यह ज़्यादातर धातु "
                     "के साथ तय हो गया।"),
            ),
        ],
        quiz=[
            q(("Which verb uses the -te endings?", "किस क्रिया में आत्मनेपद के प्रत्यय हैं?"),
              [opt_sa("लभते", tin("लभ्")), opt_sa("पठति", tin("पठ्")), opt_sa("गच्छति", tin("गम्"))],
              0,
              ("-te marks ātmanepada: {{लभते}}.", "-ते आत्मनेपद का चिह्न है: {{लभते}}।")),
        ],
        proofs=[
            proof("derive", ("Watch सेवते being built", "सेवते बनते हुए देखिए"),
                  dhatu="सेव्", lakara="Lat", purusha="Prathama", vacana="Eka"),
        ],
        terms=("parasmaipada", "atmanepada"),
        feature_ids=("PARASMAIPADA", "ATMANEPADA"),
        related=("verb-classes",),
    ),
    topic(
        "verb-classes",
        level=2,
        title=("The 10 verb classes", "धातुओं के दस गण"),
        title_sa="दश गणाः",
        summary=("Roots fall into ten classes by how they build the present stem; four of them just add -a-.",
                 "धातुएँ वर्तमान रूप बनाने के ढंग से दस गणों में बँटी हैं; इनमें चार गण बस -अ- जोड़ते हैं।"),
        term=("गणः", "verb class", "गण — धातु-वर्ग"),
        minutes=4,
        blocks=[
            text("Before the endings go on, each root builds a present stem, and there are ten ways to do it. "
                 "Classes 1, 4, 6 and 10 simply add an a-sound and behave like {{पठति}}. The other six change the "
                 "root in their own ways — learn those slowly.",
                 "प्रत्यय लगने से पहले हर धातु वर्तमान का रूप बनाती है, और इसके दस ढंग हैं। पहला, चौथा, छठा और दसवाँ "
                 "गण सीधे 'अ' जोड़ते हैं और {{पठति}} जैसे चलते हैं। बाकी छह धातु को अपने-अपने ढंग से बदलते हैं — इन्हें "
                 "धीरे-धीरे सीखिए।"),
            table(
                ("One root from each class", "हर गण से एक धातु"),
                [("Class", "गण"), ("Root", "धातु"), ("He / she does", "वह करता है"), ("Meaning", "अर्थ")],
                [
                    [tc("1 · bhū", "1 · भ्वादि"), "भू", cell("भवति", tin("भू")), tc("becomes", "होता है")],
                    [tc("2 · ad", "2 · अदादि"), "अद्", cell("अत्ति", tin("अद्")), tc("eats", "खाता है")],
                    [tc("3 · hu", "3 · जुहोत्यादि"), "हु", cell("जुहोति", tin("हु")), tc("offers into fire", "आहुति देता है")],
                    [tc("4 · div", "4 · दिवादि"), "नृत्", cell("नृत्यति", tin("नृत्")), tc("dances", "नाचता है")],
                    [tc("5 · su", "5 · स्वादि"), "सु", cell("सुनोति", tin("सु")), tc("presses out", "निचोड़ता है")],
                    [tc("6 · tud", "6 · तुदादि"), "तुद्", cell("तुदति", tin("तुद्")), tc("strikes", "चोट करता है")],
                    [tc("7 · rudh", "7 · रुधादि"), "रुध्", cell("रुणद्धि", tin("रुध्")), tc("blocks", "रोकता है")],
                    [tc("8 · tan", "8 · तनादि"), "तन्", cell("तनोति", tin("तन्")), tc("stretches", "फैलाता है")],
                    [tc("9 · krī", "9 · क्र्यादि"), "क्री", cell("क्रीणाति", tin("क्री")), tc("buys", "खरीदता है")],
                    [tc("10 · cur", "10 · चुरादि"), "चुर्", cell("चोरयति", tin("चुर्")), tc("steals", "चुराता है")],
                ],
            ),
            tip("Most everyday verbs in stories belong to the -a- classes (1, 4, 6, 10). Master those first.",
                "कथाओं की ज़्यादातर रोज़मर्रा की क्रियाएँ 'अ' वाले गणों (1, 4, 6, 10) की होती हैं। पहले इन्हें पक्का कीजिए।"),
            examples(
                ex("बालिका नृत्यति", "The girl dances — class 4.", "बालिका नाचती है — चौथा गण।",
                   w("बालिका", "girl", "बालिका", sub("बालिका", "Stri")),
                   w("नृत्यति", "dances", "नाचती है", tin("नृत्"))),
                ex("सः वस्त्रं क्रीणाति", "He buys cloth — class 9.", "वह कपड़ा खरीदता है — नौवाँ गण।",
                   w("सः", "he", "वह", sub("तद्")),
                   w("वस्त्रं", "cloth", "कपड़ा", sub("वस्त्र", "Napumsaka", "Dvitiya")),
                   w("क्रीणाति", "buys", "खरीदता है", tin("क्री"))),
            ),
        ],
        deeper=[
            go_deeper(
                ("Why dictionaries print a class number", "शब्दकोश में गण-संख्या क्यों"),
                text("The Dhātupāṭha, Pāṇini's list of about 2,000 roots, is arranged in these ten classes, each named "
                     "after its first root: bhvādi “bhū and the rest”, adādi “ad and the rest”. An entry like √kṛ (8) "
                     "tells you the class, and so the present stem.",
                     "धातुपाठ — पाणिनि की लगभग 2,000 धातुओं की सूची — इन्हीं दस गणों में सजा है, और हर गण का नाम उसकी पहली "
                     "धातु से है: भ्वादि 'भू आदि', अदादि 'अद् आदि'। √कृ (8) जैसी प्रविष्टि गण बताती है, और उसी से वर्तमान रूप।"),
            ),
        ],
        quiz=[
            q(("Which class just adds -a-, like पठति?", "कौन-सा गण पठति की तरह बस -अ- जोड़ता है?"),
              [opt("Class 6 (tud)", "छठा गण (तुदादि)"), opt("Class 3 (hu)", "तीसरा गण (जुहोत्यादि)"),
               opt("Class 7 (rudh)", "सातवाँ गण (रुधादि)")],
              0,
              ("Classes 1, 4, 6 and 10 add -a-.", "पहला, चौथा, छठा और दसवाँ गण -अ- जोड़ते हैं।")),
        ],
        terms=("gana", "dhatu"),
        related=("to-be",),
    ),
    topic(
        "to-be",
        level=1,
        title=("“To be”: अस्ति, and sentences without it", "'होना': अस्ति, और बिना क्रिया के वाक्य"),
        title_sa="अस्",
        summary=("अस्ति means “is”, but Sanskrit usually leaves it out: अहं छात्रः = I am a student.",
                 "अस्ति का अर्थ 'है', पर संस्कृत इसे अक्सर छोड़ देता है: अहं छात्रः = मैं छात्र हूँ।"),
        term=("अस्ति", "is, exists", "है", tin("अस्")),
        blocks=[
            text("The root {{अस्}} “be” gives {{अस्ति}} “is”, {{सन्ति}} “are” and {{अस्मि}} “am”. But in simple “X is Y” "
                 "sentences Sanskrit normally drops it: {{अहं छात्रः}} “I am a student”, {{एतत् पुस्तकम्}} “this is a book”.",
                 "धातु {{अस्}} 'होना' से {{अस्ति}} 'है', {{सन्ति}} 'हैं' और {{अस्मि}} 'हूँ' बनते हैं। पर 'क ख है' जैसे सरल "
                 "वाक्यों में संस्कृत इसे आमतौर पर छोड़ देता है: {{अहं छात्रः}} 'मैं छात्र हूँ', {{एतत् पुस्तकम्}} 'यह पुस्तक है'।"),
            verb_table("अस्", "Lat", ["अस्ति स्तः सन्ति", "असि स्थः स्थ", "अस्मि स्वः स्मः"],
                       ("अस् “be” — present", "अस् 'होना' — वर्तमान")),
            examples(
                ex("अहं छात्रः", "I am a student.", "मैं छात्र हूँ।",
                   w("अहं", "I", "मैं", sub("अस्मद्")),
                   w("छात्रः", "student", "छात्र", sub("छात्र"))),
                ex("वृक्षे खगाः सन्ति", "There are birds in the tree.", "पेड़ पर पक्षी हैं।",
                   w("वृक्षे", "in the tree", "पेड़ पर", sub("वृक्ष", "Pum", "Saptami")),
                   w("खगाः", "birds", "पक्षी", sub("खग", "Pum", "Prathama", "Bahu")),
                   w("सन्ति", "are, exist", "हैं", tin("अस्", "Lat", "Prathama", "Bahu"))),
                ex("कुत्र असि", "Where are you?", "तुम कहाँ हो?",
                   w("कुत्र", "where", "कहाँ"),
                   w("असि", "are (you)", "हो", tin("अस्", "Lat", "Madhyama"))),
            ),
            tip("Use {{अस्ति}} when you mean “there is” or “exists”: {{गृहे जलम् अस्ति}} “there is water in the house”.",
                "'है, मौजूद है' के अर्थ में {{अस्ति}} लगाइए: {{गृहे जलम् अस्ति}} 'घर में पानी है'।"),
            wild(
                ex("आसीद्राजा नलो नाम", "There was a king named Nala.", "नल नाम का एक राजा था।",
                   w("आसीत्", "there was", "था", tin("अस्", "Lan")),
                   w("राजा", "a king", "राजा", sub("राजन्")),
                   w("नलो", "Nala", "नल", sub("नल", form="नलः")),
                   w("नाम", "by name", "नाम से"),
                   source=src("Mahābhārata — the opening of the Nala story", "महाभारत — नल-कथा की पहली पंक्ति")),
            ),
        ],
        deeper=[
            go_deeper(
                ("“Was” and “will be”", "'था' और 'होगा'"),
                text("“Was” is {{आसीत्}}, the simple past of अस्, and “will be” is {{भविष्यति}}, borrowed from {{भू}}. "
                     "Stories open with {{आसीत्}} the way English ones open with “once upon a time”.",
                     "'था' = {{आसीत्}}, अस् का भूतकाल, और 'होगा' = {{भविष्यति}}, जो {{भू}} से लिया जाता है। कहानियाँ "
                     "{{आसीत्}} से वैसे ही शुरू होती हैं जैसे 'एक समय की बात है'।"),
                examples(
                    ex("आसीत्", "was", "था", check=tin("अस्", "Lan")),
                    ex("भविष्यति", "will be", "होगा", check=tin("भू", "Lrt")),
                ),
            ),
        ],
        quiz=[
            q(("Which sentence needs no verb?", "किस वाक्य में क्रिया ज़रूरी नहीं?"),
              [opt_sa("रामः राजा"), opt_sa("रामः गच्छति"), opt_sa("रामः वदति")],
              0,
              ("“Rāma is king” — an “X is Y” sentence can drop अस्ति.",
               "'राम राजा है' — 'क ख है' वाले वाक्य में अस्ति छोड़ा जा सकता है।")),
        ],
        terms=("dhatu",),
        feature_ids=("PRES.3SG", "PRES.3PL"),
        related=("verb-anatomy",),
    ),
]
