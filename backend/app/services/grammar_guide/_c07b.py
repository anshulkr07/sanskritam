"""Chapter 7 · Tenses & moods, part B — future, “should / may”, story past,
aorist and the rare four. Assembled in ``c07_tenses``.

मा शुचः (Gītā 18.66) is shown unchecked: मा with the aorist drops the augment,
and the engine derives the augmented form (अशोचीः) instead."""

from __future__ import annotations

from ._families_common import verb_table
from .model import (
    cell, ex, examples, go_deeper, opt_sa, proof, q, src, table, tc, text, tin, tip,
    topic, w, watch, wild,
)

TOPICS_B = [
    topic(
        "future-tense",
        level=1,
        title=("Future: lṛṭ", "भविष्यत् काल: लृट्"),
        title_sa="लृट्-लकारः",
        summary=("The future adds -sya- or -iṣya- before the present endings: पठति → पठिष्यति “will read”.",
                 "भविष्यत् काल में वर्तमान के अंत से पहले -स्य- या -इष्य- जुड़ता है: पठति → पठिष्यति 'पढ़ेगा'।"),
        term=("लृट्", "the simple future", "सामान्य भविष्यत् काल"),
        blocks=[
            text("The future is easy once you know the present: insert {{इष्य}} (or {{स्य}}) and keep the familiar "
                 "endings. {{पठिष्यति}} “he will read”, {{पठिष्यामि}} “I will read”.",
                 "वर्तमान आता हो तो भविष्यत् आसान है: {{इष्य}} (या {{स्य}}) जोड़िए और वही पुराने अंत रखिए। {{पठिष्यति}} 'वह "
                 "पढ़ेगा', {{पठिष्यामि}} 'मैं पढ़ूँगा'।"),
            verb_table("पठ्", "Lrt", ["पठिष्यति पठिष्यतः पठिष्यन्ति", "पठिष्यसि पठिष्यथः पठिष्यथ",
                                      "पठिष्यामि पठिष्यावः पठिष्यामः"],
                       ("पठ् “read” — future", "पठ् 'पढ़ना' — भविष्यत्"), stem="पठिष्य"),
            watch("Whether a root takes -iṣya- or plain -sya- comes with the root: {{पठिष्यति}} but {{दास्यति}} “will "
                  "give”, {{करिष्यति}} “will do”.",
                  "धातु -इष्य- लेगी या सीधा -स्य-, यह धातु के साथ ही आता है: {{पठिष्यति}} पर {{दास्यति}} 'देगा', "
                  "{{करिष्यति}} 'करेगा'।"),
            examples(
                ex("श्वः अहं ग्रामं गमिष्यामि", "Tomorrow I will go to the village.", "कल मैं गाँव जाऊँगा।",
                   w("श्वः", "tomorrow", "कल"),
                   w("ग्रामं", "to the village", "गाँव"),
                   w("गमिष्यामि", "will go (I)", "जाऊँगा", tin("गम्", "Lrt", "Uttama"))),
                ex("सः किं करिष्यति", "What will he do?", "वह क्या करेगा?",
                   w("करिष्यति", "will do", "करेगा", tin("कृ", "Lrt"))),
                ex("सा पुस्तकं दास्यति", "She will give the book.", "वह पुस्तक देगी।",
                   w("दास्यति", "will give", "देगी", tin("दा", "Lrt"))),
            ),
        ],
        deeper=[
            go_deeper(
                ("The distant future: luṭ", "दूर भविष्यत्: लुट्"),
                text("A second future, {{लुट्}}, is for a time beyond today: {{पठिता}} “he will read (later)”. It is built "
                     "like an agent noun and is rare in speech; read it, don't worry about using it.",
                     "एक दूसरा भविष्यत्, {{लुट्}}, आज के बाद के समय के लिए है: {{पठिता}} 'वह (बाद में) पढ़ेगा'। यह कर्ता-शब्द "
                     "की तरह बनता है और बोलचाल में कम आता है; पढ़ने में पहचानिए, प्रयोग की चिंता मत कीजिए।"),
                examples(ex("पठिता", "will read (later)", "(बाद में) पढ़ेगा", check=tin("पठ्", "Lut"))),
            ),
        ],
        quiz=[
            q(("“I will read” = ?", "'मैं पढ़ूँगा' = ?"),
              [opt_sa("पठिष्यामि", tin("पठ्", "Lrt", "Uttama")), opt_sa("पठिष्यति", tin("पठ्", "Lrt")),
               opt_sa("अपठम्", tin("पठ्", "Lan", "Uttama"))],
              0,
              ("-iṣya- for the future, -āmi for “I”.", "भविष्यत् के लिए -इष्य-, 'मैं' के लिए -आमि।")),
        ],
        proofs=[
            proof("derive", ("Watch पठिष्यति being built", "पठिष्यति बनते हुए देखिए"),
                  dhatu="पठ्", lakara="Lrt", purusha="Prathama", vacana="Eka"),
        ],
        terms=("lakara",),
        feature_ids=("FUT.1SG", "FUT.3SG"),
        related=("should-may",),
    ),
    topic(
        "should-may",
        level=2,
        title=("“Should, may”: vidhiliṅ", "'चाहिए, सम्भव है': विधिलिङ्"),
        title_sa="विधिलिङ्-लकारः",
        summary=("विधिलिङ् gives advice, rules and possibilities: पठेत् “he should read”.",
                 "विधिलिङ् सलाह, नियम और सम्भावना बताता है: पठेत् 'उसे पढ़ना चाहिए'।"),
        term=("विधिलिङ्", "the potential mood — should, may", "विधि और सम्भावना का लकार"),
        blocks=[
            text("This mood is the voice of advice and rules — {{पठेत्}} “one should read” — and of maybe: {{यदि वर्षा "
                 "भवेत्}} “if it should rain”. Its sign is an e- before the ending.",
                 "यह लकार सलाह और नियम का स्वर है — {{पठेत्}} 'पढ़ना चाहिए' — और सम्भावना का भी: {{यदि वर्षा भवेत्}} "
                 "'यदि वर्षा हो'। इसकी पहचान अंत से पहले का ए है।"),
            verb_table("पठ्", "VidhiLin", ["पठेत् पठेताम् पठेयुः", "पठेः पठेतम् पठेत", "पठेयम् पठेव पठेम"],
                       ("पठ् “read” — should, may", "पठ् 'पढ़ना' — विधिलिङ्"), stem="पठ"),
            examples(
                ex("छात्रः प्रतिदिनं पठेत्", "A student should study every day.", "छात्र को रोज़ पढ़ना चाहिए।",
                   w("प्रतिदिनं", "every day", "प्रतिदिन"),
                   w("पठेत्", "should read", "पढ़े, पढ़ना चाहिए", tin("पठ्", "VidhiLin"))),
                ex("यदि वर्षा भवेत्", "If it should rain…", "यदि वर्षा हो…",
                   w("भवेत्", "should happen", "हो", tin("भू", "VidhiLin"))),
            ),
            tip("Hindi uses the same idea with “chāhie”: {{पठेत्}} is close to “padhnā chāhie”.",
                "हिन्दी का 'चाहिए' यही भाव देता है: {{पठेत्}} लगभग 'पढ़ना चाहिए'।"),
            wild(
                ex("सत्यं ब्रूयात् प्रियं ब्रूयात्", "One should speak what is true; one should speak what is pleasant.",
                   "सत्य बोलना चाहिए, प्रिय बोलना चाहिए।",
                   w("ब्रूयात्", "should speak", "बोलना चाहिए", tin("ब्रू", "VidhiLin")),
                   source=src("Manusmṛti 4.138", "मनुस्मृति 4.138")),
            ),
        ],
        quiz=[
            q(("Which form means “he should go”?", "'उसे जाना चाहिए' कौन-सा रूप है?"),
              [opt_sa("गच्छेत्", tin("गम्", "VidhiLin")), opt_sa("गच्छतु", tin("गम्", "Lot")),
               opt_sa("गमिष्यति", tin("गम्", "Lrt"))],
              0,
              ("The e before the ending marks “should”.", "अंत से पहले का ए 'चाहिए' का चिह्न है।")),
        ],
        terms=("lakara",),
        related=("story-past",),
    ),
    topic(
        "story-past",
        level=2,
        title=("Story past: liṭ, the perfect", "परोक्ष भूत: लिट्"),
        title_sa="लिट्-लकारः",
        summary=("The perfect doubles the start of the root — बभूव, उवाच — and tells of events long ago.",
                 "लिट् धातु की शुरुआत दोहराता है — बभूव, उवाच — और बहुत पहले की घटनाएँ बताता है।"),
        term=("लिट्", "the perfect — distant past", "परोक्ष भूतकाल"),
        blocks=[
            text("Epics narrate in the perfect. It repeats the first sound of the root — bhū → {{बभूव}} “became”, paṭh → "
                 "{{पपाठ}} “read” — and is used for things the speaker did not see. You will read it far more than "
                 "you will use it.",
                 "महाकाव्य लिट् में कथा कहते हैं। यह धातु की पहली ध्वनि दोहराता है — भू → {{बभूव}} 'हुआ', पठ् → {{पपाठ}} "
                 "'पढ़ा' — और उन बातों के लिए आता है जो वक्ता ने स्वयं नहीं देखीं। इसे प्रयोग से कहीं ज़्यादा पढ़ने में "
                 "पाएँगे।"),
            verb_table("भू", "Lit", ["बभूव बभूवतुः बभूवुः", "बभूविथ बभूवथुः बभूव", "बभूव बभूविव बभूविम"],
                       ("भू “be, become” — perfect", "भू 'होना' — लिट्")),
            watch("{{बभूव}} is both “he became” and “I became” — context tells you which.",
                  "{{बभूव}} का अर्थ 'वह हुआ' भी है और 'मैं हुआ' भी — संदर्भ से पता चलता है।"),
            examples(
                ex("पपाठ", "he read (long ago)", "उसने पढ़ा (बहुत पहले)", check=tin("पठ्", "Lit", form="पपाठ")),
                ex("उवाच", "he said", "वे बोले", check=tin("वच्", "Lit", form="उवाच")),
            ),
            wild(
                ex("श्रीभगवानुवाच", "The Blessed Lord said:", "श्री भगवान बोले:",
                   w("उवाच", "said — the perfect of वच्", "बोले — वच् का लिट्", tin("वच्", "Lit")),
                   source=src("Bhagavad Gītā — before Kṛṣṇa speaks", "भगवद्गीता — श्रीकृष्ण के वचनों से पहले")),
            ),
        ],
        quiz=[
            q(("Where will you meet the perfect most?", "लिट् सबसे ज़्यादा कहाँ मिलेगा?"),
              [opt_sa("रामायणे महाभारते च"), opt_sa("दैनिकसंवादे"), opt_sa("आज्ञासु")],
              0,
              ("Epic narration uses it: {{उवाच}}, {{बभूव}}.", "महाकाव्यों की कथा में: {{उवाच}}, {{बभूव}}।")),
        ],
        proofs=[
            proof("derive", ("Watch the doubling in बभूव", "बभूव में द्वित्व देखिए"),
                  dhatu="भू", lakara="Lit", purusha="Prathama", vacana="Eka"),
        ],
        terms=("lakara",),
        related=("aorist-rare",),
    ),
    topic(
        "aorist-rare",
        level=3,
        title=("The aorist, मा, and the rare four", "लुङ्, मा, और चार कम मिलने वाले लकार"),
        title_sa="लुङ् इतरे च",
        summary=("The aorist is another past; मा with it means “don't”; and four rarer moods complete the ten.",
                 "लुङ् एक और भूतकाल है; उसके साथ मा का अर्थ 'मत'; और चार कम मिलने वाले लकार दस पूरे करते हैं।"),
        term=("लुङ्", "the aorist", "सामान्य भूतकाल"),
        minutes=4,
        blocks=[
            text("The aorist {{अभूत्}} “was, happened” and {{अगमः}} “you went” report a past event plainly. Its most "
                 "useful job today is the prohibition: {{मा}} + the aorist without its a- means “do not”.",
                 "लुङ् — {{अभूत्}} 'हुआ', {{अगमः}} 'तुम गए' — भूतकाल की घटना सीधे बताता है। आज इसका सबसे उपयोगी काम निषेध "
                 "है: {{मा}} + बिना अ- का लुङ् = 'मत'।"),
            table(
                ("The rare four, with भू", "चार कम मिलने वाले लकार, भू के साथ"),
                [("Name", "नाम"), ("Meaning", "अर्थ"), ("Form", "रूप")],
                [
                    ["लुट्", tc("distant future", "दूर भविष्यत्"), cell("भविता", tin("भू", "Lut"))],
                    ["आशीर्लिङ्", tc("blessing — may it be", "आशीर्वाद — ऐसा हो"), cell("भूयात्", tin("भू", "AshirLin"))],
                    ["लृङ्", tc("conditional — would have been", "संकेत — होता तो"), cell("अभविष्यत्", tin("भू", "Lrn"))],
                    ["लेट्", tc("Vedic subjunctive — only in the Vedas", "वैदिक लकार — केवल वेदों में"),
                     cell("भवाति", tin("भू", "Let"))],
                ],
            ),
            examples(
                ex("अभूत्", "was, happened", "हुआ", check=tin("भू", "Lun", form="अभूत्")),
                ex("अगमः", "you went", "तुम गए", check=tin("गम्", "Lun", "Madhyama", form="अगमः")),
                ex("यदि वर्षा अभविष्यत्", "Had it rained…", "यदि वर्षा होती…",
                   w("अभविष्यत्", "would have happened", "होता", tin("भू", "Lrn"))),
            ),
            watch("In {{मा शुचः}} “do not grieve” the aorist loses its a-: it is {{शुचः}}, not {{अशुचः}}. Only मा does this.",
                  "{{मा शुचः}} 'शोक मत करो' में लुङ् का अ- हट जाता है: {{शुचः}}, {{अशुचः}} नहीं। ऐसा केवल मा के साथ होता है।"),
            wild(
                ex("मा शुचः", "Do not grieve.", "शोक मत करो।",
                   source=src("Bhagavad Gītā 18.66", "भगवद्गीता 18.66")),
            ),
        ],
        quiz=[
            q(("“Do not grieve” uses मा with which lakāra?", "'शोक मत करो' में मा किस लकार के साथ है?"),
              [opt_sa("लुङ्"), opt_sa("लृट्"), opt_sa("लिट्")],
              0,
              ("मा takes the aorist without its a-.", "मा के साथ बिना अ- का लुङ् आता है।")),
        ],
        terms=("lakara",),
        related=("lakaras-overview",),
    ),
]
