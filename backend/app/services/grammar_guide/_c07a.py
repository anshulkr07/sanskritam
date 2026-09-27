"""Chapter 7 · Tenses & moods, part A — the ten lakāras at a glance, present,
command, simple past. Assembled in ``c07_tenses``. Grid forms were printed by
the engine before they were written here; each cell carries its check."""

from __future__ import annotations

from ._families_common import verb_table
from .model import (
    cell, ex, examples, go_deeper, opt, opt_sa, proof, q, src, sub, table, tc, text, tin,
    tip, topic, w, watch, wild,
)

TOPICS_A = [
    topic(
        "lakaras-overview",
        level=1,
        title=("The 10 tenses and moods at a glance", "दसों लकार एक नज़र में"),
        title_sa="दश लकाराः",
        summary=("Sanskrit marks time and mood with ten verb systems; four of them carry most everyday speech.",
                 "संस्कृत काल और भाव को दस लकारों से बताता है; रोज़ की ज़्यादातर बातचीत इनमें से चार से चलती है।"),
        term=("लकारः", "tense or mood", "लकार — काल या भाव"),
        minutes=4,
        blocks=[
            text("Pāṇini named each tense and mood with a code word beginning with l: {{लट्}}, {{लोट्}}, {{लङ्}} and so "
                 "on. Grammar books still use these names, so they are shown here — but each one also has a plain "
                 "meaning, and that is what to learn first.",
                 "पाणिनि ने हर काल और भाव को ल से शुरू होने वाला एक कूट-नाम दिया: {{लट्}}, {{लोट्}}, {{लङ्}} आदि। "
                 "व्याकरण की पुस्तकें आज भी यही नाम लेती हैं, इसलिए ये यहाँ दिए हैं — पर हर एक का सरल अर्थ भी है, और "
                 "पहले वही सीखिए।"),
            table(
                ("All ten, with भू “be” in the he-form", "दसों लकार, भू 'होना' के प्रथम पुरुष एकवचन के साथ"),
                [("Name", "नाम"), ("What it means", "अर्थ"), ("with भू", "भू के साथ")],
                [
                    ["लट्", tc("present — is, does", "वर्तमान काल — है, करता है"), cell("भवति", tin("भू", "Lat"))],
                    ["लोट्", tc("command or wish — let it be!", "आज्ञा या इच्छा — हो!"), cell("भवतु", tin("भू", "Lot"))],
                    ["लङ्", tc("simple past — was", "भूतकाल — था"), cell("अभवत्", tin("भू", "Lan"))],
                    ["लृट्", tc("future — will be", "भविष्यत् काल — होगा"), cell("भविष्यति", tin("भू", "Lrt"))],
                    ["विधिलिङ्", tc("should, may, would", "चाहिए, शायद, सम्भावना"), cell("भवेत्", tin("भू", "VidhiLin"))],
                    ["लिट्", tc("story past — long ago, unseen", "परोक्ष भूत — बहुत पहले, बिना देखे"),
                     cell("बभूव", tin("भू", "Lit"))],
                    ["लुङ्", tc("aorist — was, happened", "सामान्य भूत — हुआ"), cell("अभूत्", tin("भू", "Lun"))],
                    ["लुट्", tc("distant future — will be (later)", "दूर भविष्यत् — बाद में होगा"),
                     cell("भविता", tin("भू", "Lut"))],
                    ["आशीर्लिङ्", tc("blessing — may it be", "आशीर्वाद — ऐसा हो"), cell("भूयात्", tin("भू", "AshirLin"))],
                    ["लृङ्", tc("conditional — would have been", "संकेत — होता तो"), cell("अभविष्यत्", tin("भू", "Lrn"))],
                ],
            ),
            tip("Present, command, simple past and future carry most everyday Sanskrit. Learn those four well; "
                "meet the other six in reading.",
                "वर्तमान, आज्ञा, भूतकाल और भविष्यत् — रोज़ की ज़्यादातर संस्कृत इन्हीं चार से चलती है। इन्हें पक्का "
                "कीजिए; बाकी छह पढ़ते-पढ़ते मिल जाएँगे।"),
            examples(
                ex("सः पठति", "He reads.", "वह पढ़ता है।", check=tin("पठ्", form="पठति")),
                ex("सः पठतु", "Let him read.", "वह पढ़े।", check=tin("पठ्", "Lot", form="पठतु")),
                ex("सः अपठत्", "He read.", "उसने पढ़ा।", check=tin("पठ्", "Lan", form="अपठत्")),
                ex("सः पठिष्यति", "He will read.", "वह पढ़ेगा।", check=tin("पठ्", "Lrt", form="पठिष्यति")),
                title=("The everyday four with पठ्", "पठ् के साथ रोज़ के चार"),
            ),
        ],
        deeper=[
            go_deeper(
                ("Why the names start with l", "नाम ल से क्यों शुरू होते हैं"),
                text("In Pāṇini's system every tense suffix is first a placeholder “l”, later replaced by the real "
                     "ending. The vowel and silent letters after l — laṭ, liṭ, luṭ, lṛṭ, leṭ, loṭ; laṅ, liṅ, luṅ, lṛṅ — "
                     "tell the rules which one it is. The ṭ-names are the “primary” ones, the ṅ-names the rest.",
                     "पाणिनि की व्यवस्था में हर काल-प्रत्यय पहले 'ल' नाम का स्थान-धारी होता है, जो बाद में असली प्रत्यय से "
                     "बदलता है। ल के बाद के स्वर और इत्-वर्ण — लट्, लिट्, लुट्, लृट्, लेट्, लोट्; लङ्, लिङ्, लुङ्, लृङ् — "
                     "नियमों को बताते हैं कि कौन-सा लकार है।"),
            ),
        ],
        quiz=[
            q(("Which lakāra gives commands and wishes?", "कौन-सा लकार आज्ञा और इच्छा बताता है?"),
              [opt("लोट् (loṭ)", "लोट्"), opt("लट् (laṭ)", "लट्"), opt("लृट् (lṛṭ)", "लृट्")],
              0,
              ("{{लोट्}} is the command mood: {{भवतु}} “let it be”.", "{{लोट्}} आज्ञा का लकार है: {{भवतु}} 'हो'।")),
        ],
        proofs=[
            proof("paradigm", ("See भू in the command mood", "भू को लोट् लकार में देखिए"), dhatu="भू", lakara="Lot"),
        ],
        terms=("lakara", "dhatu"),
        feature_ids=("PRES.3SG", "IMP.2SG", "IMPF.3SG", "FUT.3SG"),
        related=("present-tense",),
    ),
    topic(
        "present-tense",
        level=1,
        title=("Present: laṭ", "वर्तमान काल: लट्"),
        title_sa="लट्-लकारः",
        summary=("The present covers “does”, “is doing” and “will do soon” — and with स्म it even means “did”.",
                 "वर्तमान काल 'करता है', 'कर रहा है' और 'जल्द करेगा' — सब बताता है; और स्म के साथ 'करता था' भी।"),
        term=("लट्", "the present tense", "वर्तमान काल"),
        blocks=[
            text("{{गच्छति}} can mean “goes”, “is going” or, with a time word, “is about to go”. Sanskrit doesn't split "
                 "these the way English does. The grid is the one you already know from पठ्.",
                 "{{गच्छति}} का अर्थ 'जाता है', 'जा रहा है' या समय-सूचक शब्द के साथ 'जाने वाला है' — कुछ भी हो सकता "
                 "है। संस्कृत इन्हें अंग्रेज़ी की तरह अलग नहीं करता। सारणी वही है जो पठ् में सीखी।"),
            verb_table("गम्", "Lat", ["गच्छति गच्छतः गच्छन्ति", "गच्छसि गच्छथः गच्छथ", "गच्छामि गच्छावः गच्छामः"],
                       ("गम् “go” — present", "गम् 'जाना' — वर्तमान"), stem="गच्छ"),
            tip("Add {{स्म}} after a present verb to speak of the past: {{सः पठति स्म}} “he used to read”. Spoken "
                "Sanskrit and stories use this all the time.",
                "वर्तमान क्रिया के बाद {{स्म}} लगाइए, अर्थ भूतकाल का हो जाता है: {{सः पठति स्म}} 'वह पढ़ता था'। बोलचाल और "
                "कहानियों में इसका बहुत प्रयोग होता है।"),
            examples(
                ex("अहं विद्यालयं गच्छामि", "I go to school.", "मैं विद्यालय जाता हूँ।",
                   w("अहं", "I", "मैं", sub("अस्मद्")),
                   w("विद्यालयं", "to school", "विद्यालय", sub("विद्यालय", "Pum", "Dvitiya")),
                   w("गच्छामि", "go (I)", "जाता हूँ", tin("गम्", "Lat", "Uttama"))),
                ex("श्वः ते आगच्छन्ति", "They are coming tomorrow.", "वे कल आ रहे हैं।",
                   w("श्वः", "tomorrow", "कल (आने वाला)"),
                   w("ते", "they", "वे", sub("तद्", "Pum", "Prathama", "Bahu")),
                   w("आगच्छन्ति", "come (they)", "आते हैं", tin("गम्", "Lat", "Prathama", "Bahu", prefixes=["आ"]))),
            ),
            wild(
                ex("योगक्षेमं वहाम्यहम्", "I carry their welfare.", "मैं उनका योग-क्षेम वहन करता हूँ।",
                   w("वहामि", "carry (I) — present", "वहन करता हूँ — वर्तमान", tin("वह्", "Lat", "Uttama")),
                   w("अहम्", "I", "मैं", sub("अस्मद्")),
                   source=src("Bhagavad Gītā 9.22 · motto of LIC", "भगवद्गीता 9.22 · एलआईसी का आदर्श-वाक्य")),
            ),
        ],
        quiz=[
            q(("“He used to read” = ?", "'वह पढ़ता था' = ?"),
              [opt_sa("सः पठति स्म"), opt_sa("सः पठिष्यति"), opt_sa("सः पठतु")],
              0,
              ("A present verb with {{स्म}} speaks of the past.", "वर्तमान क्रिया के साथ {{स्म}} भूतकाल बताता है।")),
        ],
        proofs=[
            proof("paradigm", ("See the present grid for पठ्", "पठ् की वर्तमान सारणी देखिए"), dhatu="पठ्", lakara="Lat"),
        ],
        terms=("lakara", "purusha"),
        feature_ids=("PRES.3SG", "PRES.1SG", "PRES.3PL"),
        related=("command-mood",),
    ),
    topic(
        "command-mood",
        level=1,
        title=("Commands and wishes: loṭ", "आज्ञा और इच्छा: लोट्"),
        title_sa="लोट्-लकारः",
        summary=("लोट् gives orders (गच्छ “go!”), polite requests and wishes (सुखिनः भवन्तु “may they be happy”).",
                 "लोट् आज्ञा देता है (गच्छ 'जाओ!'), विनम्र अनुरोध करता है और शुभकामना बताता है (सुखिनः भवन्तु 'सुखी हों')।"),
        term=("लोट्", "the command mood", "आज्ञार्थक लकार"),
        blocks=[
            text("The command mood tells someone to act — {{पठ}} “read!” — or wishes something for a third person — "
                 "{{पठतु}} “let him read”. With “I” and “we” it proposes: {{पठाम}} “let's read”.",
                 "आज्ञा का लकार किसी को काम करने को कहता है — {{पठ}} 'पढ़ो!' — या किसी और के लिए इच्छा बताता है — {{पठतु}} "
                 "'वह पढ़े'। 'मैं' और 'हम' के साथ यह प्रस्ताव बनता है: {{पठाम}} 'चलो, पढ़ें'।"),
            verb_table("पठ्", "Lot", ["पठतु पठताम् पठन्तु", "पठ पठतम् पठत", "पठानि पठाव पठाम"],
                       ("पठ् “read” — command mood", "पठ् 'पढ़ना' — आज्ञा"), stem="पठ"),
            watch("The “you, one person” command is the bare stem with no ending: {{पठ}}, {{गच्छ}}, {{वद}}.",
                  "'तुम (एक)' की आज्ञा में कोई अंत नहीं लगता, बस मूल रूप: {{पठ}}, {{गच्छ}}, {{वद}}।"),
            examples(
                ex("अत्र आगच्छ", "Come here!", "यहाँ आओ!",
                   w("अत्र", "here", "यहाँ"),
                   w("आगच्छ", "come (you)", "आओ", tin("गम्", "Lot", "Madhyama", prefixes=["आ"]))),
                ex("सत्यं वद", "Speak the truth.", "सच बोलो।",
                   w("सत्यं", "the truth", "सत्य", sub("सत्य", "Napumsaka", "Dvitiya")),
                   w("वद", "speak", "बोलो", tin("वद्", "Lot", "Madhyama"))),
                ex("सर्वे भवन्तु सुखिनः", "May all be happy.", "सब सुखी हों।",
                   w("भवन्तु", "may they be — wish", "हों — शुभकामना", tin("भू", "Lot", "Prathama", "Bahu"))),
            ),
            tip("In spoken Sanskrit, {{मा}} before a command means “don't”: {{मा गच्छ}} “don't go”.",
                "बोलचाल की संस्कृत में आज्ञा से पहले {{मा}} का अर्थ 'मत' होता है: {{मा गच्छ}} 'मत जाओ'।"),
            wild(
                ex("तमसो मा ज्योतिर्गमय", "Lead me from darkness to light.", "मुझे अंधकार से प्रकाश की ओर ले चलो।",
                   w("गमय", "lead — a command (causative)", "ले चलो — आज्ञा (प्रेरणार्थक)",
                     tin("गम्", "Lot", "Madhyama", sanadi=["Nic"])),
                   source=src("Bṛhadāraṇyaka Upaniṣad 1.3.28", "बृहदारण्यक उपनिषद् 1.3.28")),
            ),
        ],
        quiz=[
            q(("“Read! (you all)” = ?", "'पढ़ो! (तुम सब)' = ?"),
              [opt_sa("पठत", tin("पठ्", "Lot", "Madhyama", "Bahu")), opt_sa("पठ", tin("पठ्", "Lot", "Madhyama")),
               opt_sa("पठन्तु", tin("पठ्", "Lot", "Prathama", "Bahu"))],
              0,
              ("You, many, command: -ta.", "तुम सब, आज्ञा: -त।")),
        ],
        proofs=[
            proof("derive", ("Watch पठतु being built", "पठतु बनते हुए देखिए"),
                  dhatu="पठ्", lakara="Lot", purusha="Prathama", vacana="Eka", expect="पठतु"),
        ],
        terms=("lakara",),
        feature_ids=("IMP.2SG", "IMP.2PL"),
        related=("simple-past",),
    ),
    topic(
        "simple-past",
        level=1,
        title=("Simple past: laṅ", "भूतकाल: लङ्"),
        title_sa="लङ्-लकारः",
        summary=("The everyday past adds an a- in front of the verb: पठति “reads” → अपठत् “read”.",
                 "रोज़ का भूतकाल क्रिया के आगे अ- जोड़ता है: पठति 'पढ़ता है' → अपठत् 'पढ़ा'।"),
        term=("लङ्", "the simple past", "अनद्यतन भूतकाल"),
        blocks=[
            text("To say something happened, put an a- in front and use short endings: {{अपठत्}} “he read”, {{अपठम्}} “I "
                 "read”. That front a- is called the augment. Strictly, laṅ is for the past before today; everyday "
                 "Sanskrit uses it for the past in general.",
                 "कुछ हो चुका है यह बताने के लिए क्रिया के आगे अ- लगाइए और छोटे अंत: {{अपठत्}} 'उसने पढ़ा', {{अपठम्}} 'मैंने "
                 "पढ़ा'। आगे वाले इस अ को आगम कहते हैं। शास्त्र में लङ् आज से पहले के भूत के लिए है; बोलचाल में सामान्य "
                 "भूतकाल के लिए आता है।"),
            verb_table("पठ्", "Lan", ["अपठत् अपठताम् अपठन्", "अपठः अपठतम् अपठत", "अपठम् अपठाव अपठाम"],
                       ("पठ् “read” — simple past", "पठ् 'पढ़ना' — भूतकाल")),
            watch("With a prefix, the a- goes between the prefix and the root: आ + गच्छत् → {{आगच्छत्}} “he came”.",
                  "उपसर्ग हो तो अ- उपसर्ग और धातु के बीच आता है: आ + गच्छत् → {{आगच्छत्}} 'वह आया'।"),
            examples(
                ex("सः गृहम् आगच्छत्", "He came home.", "वह घर आया।",
                   w("सः", "he", "वह", sub("तद्")),
                   w("गृहम्", "home", "घर", sub("गृह", "Napumsaka", "Dvitiya")),
                   w("आगच्छत्", "came", "आया", tin("गम्", "Lan", prefixes=["आ"]))),
                ex("वने सिंहः अवसत्", "A lion lived in the forest.", "वन में एक शेर रहता था।",
                   w("वने", "in the forest", "वन में", sub("वन", "Napumsaka", "Saptami")),
                   w("सिंहः", "a lion", "शेर", sub("सिंह")),
                   w("अवसत्", "lived", "रहता था", tin("वस्", "Lan"))),
                ex("अहं पत्रम् अलिखम्", "I wrote a letter.", "मैंने पत्र लिखा।",
                   w("पत्रम्", "a letter", "पत्र", sub("पत्र", "Napumsaka", "Dvitiya")),
                   w("अलिखम्", "wrote (I)", "लिखा", tin("लिख्", "Lan", "Uttama"))),
            ),
            tip("A simpler past: a present verb plus {{स्म}}, or the past participle {{गतः}} “gone” — both are in later "
                "chapters and very common in speech.",
                "आसान भूतकाल: वर्तमान क्रिया + {{स्म}}, या भूत कृदन्त {{गतः}} 'गया' — दोनों आगे के अध्यायों में हैं और "
                "बोलचाल में बहुत आते हैं।"),
        ],
        deeper=[
            go_deeper(
                ("Three pasts", "तीन भूतकाल"),
                text("Sanskrit has three past systems: {{लङ्}} (ordinary past, before today), {{लुङ्}} (the aorist, recent or "
                     "general past) and {{लिट्}} (the perfect, for things long ago that the speaker didn't witness — the "
                     "tense of epics: {{उवाच}} “said”). Everyday speech mostly uses laṅ.",
                     "संस्कृत में भूतकाल के तीन लकार हैं: {{लङ्}} (सामान्य भूत, आज से पहले), {{लुङ्}} (हाल का या सामान्य भूत) "
                     "और {{लिट्}} (परोक्ष भूत, बहुत पहले की ऐसी बात जो वक्ता ने नहीं देखी — महाकाव्यों का लकार: {{उवाच}} "
                     "'बोले')। बोलचाल में ज़्यादातर लङ् ही आता है।"),
            ),
        ],
        quiz=[
            q(("“I read (past)” = ?", "'मैंने पढ़ा' = ?"),
              [opt_sa("अपठम्", tin("पठ्", "Lan", "Uttama")), opt_sa("अपठत्", tin("पठ्", "Lan")),
               opt_sa("पठामि", tin("पठ्", "Lat", "Uttama"))],
              0,
              ("I + simple past: {{अपठम्}}.", "मैं + भूतकाल: {{अपठम्}}।")),
        ],
        proofs=[
            proof("derive", ("Watch the augment a- appear in अपठत्", "अपठत् में आगम अ- जुड़ते देखिए"),
                  dhatu="पठ्", lakara="Lan", purusha="Prathama", vacana="Eka", expect="अपठत्"),
        ],
        terms=("lakara",),
        feature_ids=("IMPF.3SG",),
        related=("future-tense",),
    ),
]
