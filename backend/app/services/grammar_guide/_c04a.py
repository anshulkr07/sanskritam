"""Chapter 4 · Noun families, part A — -a masculine, -a neuter, -ā feminine,
-i and -u stems. Assembled in ``c04_families``."""

from __future__ import annotations

from ._families_common import noun_table
from .model import (
    analogy, ex, examples, go_deeper, opt, opt_sa, proof, q, src, sub, text, tin, tip,
    topic, w, watch, wild,
)

TOPICS_A = [
    topic(
        "a-masculine",
        level=1,
        title=("-a masculine nouns: देव", "अकारान्त पुंलिंग: देव"),
        title_sa="अकारान्तपुंलिङ्गशब्दाः",
        summary=("The most common noun family. Learn देव and thousands of words like it follow.",
                 "सबसे आम शब्द-परिवार। देव के रूप सीख लिए, तो हज़ारों ऐसे शब्द अपने आप आ जाएँगे।"),
        term=("शब्दरूपम्", "noun table — all the forms of one noun", "शब्दरूप — एक शब्द के सभी रूप"),
        minutes=4,
        blocks=[
            text("Masculine nouns ending in short a — {{देव}}, {{राम}}, {{बालक}}, {{वृक्ष}} — all follow "
                 "one pattern. It is the first table every student learns, and the one you will use most.",
                 "अ पर खत्म होने वाले पुंलिंग शब्द — {{देव}}, {{राम}}, {{बालक}}, {{वृक्ष}} — सब एक ही ढाँचे पर "
                 "चलते हैं। हर विद्यार्थी सबसे पहले यही तालिका सीखता है, और यही सबसे ज़्यादा काम आती है।"),
            noun_table("देव", "Pum", [
                "देवः देवौ देवाः", "देवम् देवौ देवान्", "देवेन देवाभ्याम् देवैः", "देवाय देवाभ्याम् देवेभ्यः",
                "देवात् देवाभ्याम् देवेभ्यः", "देवस्य देवयोः देवानाम्", "देवे देवयोः देवेषु", "देव देवौ देवाः",
            ], ("देव “god” — all 24 forms", "देव 'देवता' — सभी 24 रूप")),
            tip("Read the table in columns, not rows. Many cells repeat: the dual has only three "
                "distinct forms, and the dative and ablative plural are identical.",
                "तालिका को पंक्तियों में नहीं, स्तम्भों में पढ़िए। कई रूप दोहराते हैं: द्विवचन में केवल तीन अलग "
                "रूप हैं, और चतुर्थी-पञ्चमी बहुवचन एक-से हैं।"),
            watch("After r or ṣ, n turns into ṇ: {{देवेन}} but {{रामेण}}, {{देवानाम्}} but {{वृक्षाणाम्}}.",
                  "र या ष के बाद न, ण बन जाता है: {{देवेन}} पर {{रामेण}}, {{देवानाम्}} पर {{वृक्षाणाम्}}।"),
            examples(
                ex("रामेण", "by Rāma — ṇ after r", "राम के द्वारा — र के बाद ण", check=sub("राम", "Pum", "Trtiya")),
                ex("वृक्षाणाम्", "of the trees — ṇ after ṣ", "पेड़ों का — ष के बाद ण",
                   check=sub("वृक्ष", "Pum", "Sasthi", "Bahu")),
                ex("बालकेभ्यः", "for the boys", "बालकों के लिए", check=sub("बालक", "Pum", "Caturthi", "Bahu")),
                title=("Same pattern, other words", "वही ढाँचा, दूसरे शब्द"),
            ),
            wild(
                ex("रामो राजमणिः सदा विजयते", "Rāma, jewel among kings, is ever victorious.",
                   "राजाओं में मणि, राम सदा विजयी होते हैं।",
                   source=src("Rāmarakṣā Stotra", "रामरक्षा स्तोत्र"), check=sub("राम", form="रामः")),
            ),
        ],
        deeper=[
            go_deeper(
                ("Doer and object split in the plural", "बहुवचन में कर्ता और कर्म अलग"),
                text("In the plural, a-masculines keep doer and object apart: {{देवाः}} do, {{देवान्}} are "
                     "acted on. Neuter and feminine a-words don't make that split, so watch the verb there.",
                     "बहुवचन में अ-पुंलिंग शब्द कर्ता और कर्म को अलग रखते हैं: {{देवाः}} करते हैं, {{देवान्}} पर "
                     "क्रिया होती है। नपुंसकलिंग और स्त्रीलिंग शब्दों में यह अंतर नहीं, वहाँ क्रिया पर ध्यान दीजिए।"),
            ),
        ],
        quiz=[
            q(("Which form means “among the trees”?", "'पेड़ों में' कौन-सा रूप है?"),
              [opt_sa("वृक्षेषु", sub("वृक्ष", "Pum", "Saptami", "Bahu")),
               opt_sa("वृक्षैः", sub("वृक्ष", "Pum", "Trtiya", "Bahu")),
               opt_sa("वृक्षाणाम्", sub("वृक्ष", "Pum", "Sasthi", "Bahu"))],
              0,
              ("-eṣu is the locative plural.", "-एषु सप्तमी बहुवचन है।")),
        ],
        proofs=[
            proof("paradigm", ("Tap any form to see how it is built", "किसी भी रूप को छूकर देखिए वह कैसे बना"),
                  pratipadika="देव", linga="Pum"),
        ],
        terms=("shabdarupa", "vibhakti", "vacana"),
        feature_ids=("MASC", "NOM.PL", "ACC.PL", "GEN.PL", "LOC.PL"),
        related=("a-neuter",),
    ),
    topic(
        "a-neuter",
        level=1,
        title=("-a neuter nouns: फल", "अकारान्त नपुंसकलिंग: फल"),
        title_sa="अकारान्तनपुंसकलिङ्गशब्दाः",
        summary=("Neuter a-words share most endings with देव — only the doer, object and call forms differ.",
                 "नपुंसकलिंग अ-शब्दों के ज़्यादातर रूप देव जैसे हैं — बस कर्ता, कर्म और सम्बोधन अलग हैं।"),
        term=("नपुंसकलिङ्गम्", "neuter gender", "नपुंसकलिंग"),
        blocks=[
            text("Compare {{फल}} with {{देव}}: from the instrumental down, the two tables are identical. "
                 "Only the nominative, accusative and vocative change — and in those, doer and object "
                 "look the same.",
                 "{{फल}} को {{देव}} से मिलाइए: तृतीया से नीचे दोनों तालिकाएँ एक जैसी हैं। केवल प्रथमा, द्वितीया "
                 "और सम्बोधन बदलते हैं — और उनमें कर्ता और कर्म के रूप एक-से होते हैं।"),
            noun_table("फल", "Napumsaka", [
                "फलम् फले फलानि", "फलम् फले फलानि", "फलेन फलाभ्याम् फलैः", "फलाय फलाभ्याम् फलेभ्यः",
                "फलात् फलाभ्याम् फलेभ्यः", "फलस्य फलयोः फलानाम्", "फले फलयोः फलेषु", "फल फले फलानि",
            ], ("फल “fruit” — all 24 forms", "फल — सभी 24 रूप")),
            analogy("Think of फल as देव in a different hat: the same body from the third row down, a "
                    "different top.",
                    "फल को ऐसे समझिए जैसे देव ने दूसरी टोपी पहन ली हो: तीसरी पंक्ति से नीचे सब वैसा ही, बस ऊपर का "
                    "हिस्सा अलग।"),
            examples(
                ex("ज्ञानम्", "knowledge", "ज्ञान", check=sub("ज्ञान", "Napumsaka")),
                ex("पुस्तकानि", "books", "पुस्तकें", check=sub("पुस्तक", "Napumsaka", "Prathama", "Bahu")),
                ex("वनेषु", "in the forests", "वनों में", check=sub("वन", "Napumsaka", "Saptami", "Bahu")),
                title=("Common neuter a-words", "आम नपुंसकलिंग अ-शब्द"),
            ),
            watch("Because {{फलम्}} is both doer and object, “the fruit falls” and “eats the fruit” use the "
                  "same word. The verb tells you which is meant.",
                  "{{फलम्}} कर्ता भी है और कर्म भी, इसलिए 'फल गिरता है' और 'फल खाता है' में एक ही शब्द आता है। "
                  "क्रिया बताती है कि कौन-सा अर्थ है।"),
            wild(
                ex("सत्यमेव जयते", "Truth alone wins.", "सत्य की ही जीत होती है।",
                   w("सत्यम्", "truth — neuter, the doer", "सत्य — नपुंसकलिंग, कर्ता", sub("सत्य", "Napumsaka")),
                   w("एव", "alone, only", "ही"),
                   w("जयते", "wins", "जीतता है"),
                   source=src("Muṇḍaka Upaniṣad 3.1.6 · national motto of India",
                              "मुण्डक उपनिषद् 3.1.6 · भारत का राष्ट्रीय आदर्श-वाक्य")),
            ),
        ],
        deeper=[
            go_deeper(
                ("A note on जयते", "जयते पर एक बात"),
                text("In classical Sanskrit “wins” is {{जयति}}, and that is what the engine derives. The "
                     "Upaniṣad's {{जयते}} uses the other set of verb endings, an older usage. Mottos keep old "
                     "grammar — enjoy it, but write {{जयति}}.",
                     "शास्त्रीय संस्कृत में 'जीतता है' = {{जयति}}, और इंजन ठीक यही बनाता है। उपनिषद् का {{जयते}} "
                     "दूसरे प्रत्यय-समूह का पुराना प्रयोग है। आदर्श-वाक्य पुराना व्याकरण सँजोते हैं — उसका आनंद "
                     "लीजिए, पर लिखिए {{जयति}}।"),
                examples(ex("जयति", "wins — the classical form", "जीतता है — शास्त्रीय रूप", check=tin("जि"))),
            ),
        ],
        quiz=[
            q(("Which is “fruits” as the doer?", "'फल' (बहुवचन, कर्ता) कौन-सा रूप है?"),
              [opt_sa("फलानि", sub("फल", "Napumsaka", "Prathama", "Bahu")), opt_sa("फलाः"),
               opt_sa("फले", sub("फल", "Napumsaka", "Prathama", "Dvi"))],
              0,
              ("The neuter plural ends in -āni.", "नपुंसकलिंग बहुवचन -आनि पर खत्म होता है।")),
        ],
        proofs=[
            proof("paradigm", ("Tap any form to see how it is built", "किसी भी रूप को छूकर देखिए वह कैसे बना"),
                  pratipadika="फल", linga="Napumsaka"),
        ],
        terms=("shabdarupa", "linga"),
        feature_ids=("NEUT",),
        related=("a-masculine", "aa-feminine"),
    ),
    topic(
        "aa-feminine",
        level=1,
        title=("-ā feminine nouns: लता", "आकारान्त स्त्रीलिंग: लता"),
        title_sa="आकारान्तस्त्रीलिङ्गशब्दाः",
        summary=("Feminine words in -ā follow लता, with long, clear endings that are easy to spot.",
                 "आ पर खत्म होने वाले स्त्रीलिंग शब्द लता की तरह चलते हैं; इनके अंत लम्बे और साफ़ पहचाने जाते हैं।"),
        term=("स्त्रीलिङ्गम्", "feminine gender", "स्त्रीलिंग"),
        blocks=[
            text("{{लता}} “creeper”, {{सीता}}, {{विद्या}} “learning”, {{बालिका}} “girl” — feminine ā-words "
                 "are everywhere. Their endings are longer than देव's, which makes them easy to recognise: "
                 "-ayā, -āyai, -āyāḥ, -āyām.",
                 "{{लता}}, {{सीता}}, {{विद्या}}, {{बालिका}} — आ-अंत स्त्रीलिंग शब्द हर जगह मिलते हैं। इनके अंत देव "
                 "से लम्बे हैं, इसलिए पहचानना आसान है: -अया, -आयै, -आयाः, -आयाम्।"),
            noun_table("लता", "Stri", [
                "लता लते लताः", "लताम् लते लताः", "लतया लताभ्याम् लताभिः", "लतायै लताभ्याम् लताभ्यः",
                "लतायाः लताभ्याम् लताभ्यः", "लतायाः लतयोः लतानाम्", "लतायाम् लतयोः लतासु", "लते लते लताः",
            ], ("लता “creeper” — all 24 forms", "लता 'बेल' — सभी 24 रूप")),
            watch("{{लतायाः}} means both “from the creeper” and “of the creeper”. And the vocative is "
                  "{{लते}}: you call {{सीते}}, not {{सीता}}.",
                  "{{लतायाः}} का अर्थ 'बेल से' भी है और 'बेल का' भी। सम्बोधन {{लते}} है: पुकारते समय {{सीते}}, "
                  "{{सीता}} नहीं।"),
            examples(
                ex("विद्यया", "by learning", "विद्या से", check=sub("विद्या", "Stri", "Trtiya")),
                ex("बालिकायै", "for the girl", "बालिका के लिए", check=sub("बालिका", "Stri", "Caturthi")),
                ex("कथासु", "in the stories", "कथाओं में", check=sub("कथा", "Stri", "Saptami", "Bahu")),
                title=("Words like लता", "लता जैसे शब्द"),
            ),
            wild(
                ex("विद्या ददाति विनयम्", "Learning gives humility.", "विद्या विनय देती है।",
                   w("विद्या", "learning — feminine, the doer", "विद्या — स्त्रीलिंग, कर्ता", sub("विद्या", "Stri")),
                   w("ददाति", "gives", "देती है", tin("दा")),
                   w("विनयम्", "humility", "विनय, नम्रता", sub("विनय", "Pum", "Dvitiya")),
                   source=src("Hitopadeśa", "हितोपदेश")),
            ),
        ],
        deeper=[
            go_deeper(
                ("Where the extra yā comes from", "अतिरिक्त 'या' कहाँ से आता है"),
                text("Before the dative, ablative, genitive and locative singular endings, ā-feminines "
                     "insert yā: latā + e → {{लतायै}}. Pāṇini's rule {{याडापः}} (7.3.113) adds exactly this "
                     "syllable. Open the proof below to watch it happen.",
                     "चतुर्थी, पञ्चमी, षष्ठी और सप्तमी एकवचन के प्रत्ययों से पहले आ-स्त्रीलिंग शब्दों में 'या' जुड़ता "
                     "है: लता + ए → {{लतायै}}। पाणिनि का नियम {{याडापः}} (7.3.113) ठीक यही अक्षर जोड़ता है। नीचे "
                     "प्रमाण खोलकर देखिए।"),
            ),
        ],
        quiz=[
            q(("How do you call out “O Sītā!”?", "'हे सीता!' कैसे पुकारेंगे?"),
              [opt_sa("सीते", sub("सीता", "Stri", "Sambodhana")), opt_sa("सीता", sub("सीता", "Stri")),
               opt_sa("सीताम्", sub("सीता", "Stri", "Dvitiya"))],
              0,
              ("The vocative of ā-feminines ends in -e.", "आ-स्त्रीलिंग शब्दों का सम्बोधन -ए पर खत्म होता है।")),
        ],
        proofs=[
            proof("derive", ("Watch लतायै being built", "लतायै बनते हुए देखिए"),
                  pratipadika="लता", linga="Stri", vibhakti="Caturthi", vacana="Eka"),
        ],
        terms=("shabdarupa", "linga"),
        feature_ids=("FEM",),
        related=("ii-uu-feminine",),
    ),
    topic(
        "i-stems",
        level=2,
        title=("-i nouns: कवि and मति", "इकारान्त शब्द: कवि और मति"),
        title_sa="इकारान्तशब्दाः",
        summary=("Words in -i strengthen their vowel before some endings: kavi → kavaye, kaveḥ.",
                 "इ-अंत शब्दों में कुछ प्रत्ययों से पहले स्वर बलवान होता है: कवि → कवये, कवेः।"),
        blocks=[
            text("Masculine {{कवि}} “poet” and feminine {{मति}} “thought” share most forms. The i grows to e "
                 "in the dative, ablative and genitive singular — {{कवये}}, {{कवेः}} — and the locative "
                 "singular ends in -au: {{कवौ}}.",
                 "पुंलिंग {{कवि}} और स्त्रीलिंग {{मति}} के ज़्यादातर रूप एक जैसे हैं। चतुर्थी, पञ्चमी और षष्ठी "
                 "एकवचन में इ बढ़कर ए बनता है — {{कवये}}, {{कवेः}} — और सप्तमी एकवचन -औ पर खत्म होता है: {{कवौ}}।"),
            noun_table("कवि", "Pum", [
                "कविः कवी कवयः", "कविम् कवी कवीन्", "कविना कविभ्याम् कविभिः", "कवये कविभ्याम् कविभ्यः",
                "कवेः कविभ्याम् कविभ्यः", "कवेः कव्योः कवीनाम्", "कवौ कव्योः कविषु", "कवे कवी कवयः",
            ], ("कवि “poet” — masculine", "कवि — पुंलिंग")),
            noun_table("मति", "Stri", [
                "मतिः मती मतयः", "मतिम् मती मतीः", "मत्या मतिभ्याम् मतिभिः", "मतये मतिभ्याम् मतिभ्यः",
                "मतेः मतिभ्याम् मतिभ्यः", "मतेः मत्योः मतीनाम्", "मतौ मत्योः मतिषु", "मते मती मतयः",
            ], ("मति “thought” — feminine", "मति 'बुद्धि' — स्त्रीलिंग"),
                note=("Feminine i-words may also take ā-style endings: {{मत्यै}}, {{मत्याः}}, {{मत्याम्}}.",
                      "स्त्रीलिंग इ-शब्दों में आ-जैसे अंत भी चलते हैं: {{मत्यै}}, {{मत्याः}}, {{मत्याम्}}।")),
            watch("The instrumental singular shows the gender: masculine {{कविना}} with -nā, feminine "
                  "{{मत्या}} with -yā.",
                  "तृतीया एकवचन से लिंग पता चलता है: पुंलिंग {{कविना}} (-ना), स्त्रीलिंग {{मत्या}} (-या)।"),
            examples(
                ex("हरिः", "Hari — a masculine i-word", "हरि — इ-अंत पुंलिंग", check=sub("हरि")),
                ex("भूमौ", "on the earth", "धरती पर", check=sub("भूमि", "Stri", "Saptami")),
                ex("अग्नये", "to Agni, the fire", "अग्नि को", check=sub("अग्नि", "Pum", "Caturthi")),
            ),
            wild(
                ex("अग्नये स्वाहा", "Offered to Agni.", "अग्नि को समर्पित।",
                   w("अग्नये", "to Agni — 4th case", "अग्नि को — चतुर्थी", sub("अग्नि", "Pum", "Caturthi")),
                   w("स्वाहा", "hail, offered", "स्वाहा, समर्पित"),
                   source=src("Words spoken at a fire offering", "हवन में बोले जाने वाले शब्द")),
            ),
        ],
        deeper=[
            go_deeper(
                ("पति and सखि break the pattern", "पति और सखि अलग चलते हैं"),
                text("Two common i-words are irregular: {{पति}} “husband, lord” has {{पत्या}} and {{पत्ये}}, and "
                     "{{सखि}} “friend” has {{सखा}} and {{सखायौ}}. Learn them as exceptions.",
                     "दो आम इ-शब्द अनियमित हैं: {{पति}} के रूप {{पत्या}}, {{पत्ये}} होते हैं, और {{सखि}} 'मित्र' के "
                     "{{सखा}}, {{सखायौ}}। इन्हें अपवाद की तरह याद कीजिए।"),
            ),
        ],
        quiz=[
            q(("“In the poet” = ?", "'कवि में' = ?"),
              [opt_sa("कवौ", sub("कवि", "Pum", "Saptami")), opt_sa("कवे", sub("कवि", "Pum", "Sambodhana")),
               opt_sa("कवेः", sub("कवि", "Pum", "Sasthi"))],
              0,
              ("The locative singular of i-words ends in -au.", "इ-शब्दों की सप्तमी एकवचन -औ पर खत्म होती है।")),
        ],
        proofs=[
            proof("paradigm", ("See कवि built form by form", "कवि के रूप बनते हुए देखिए"), pratipadika="कवि", linga="Pum"),
        ],
        terms=("guna", "shabdarupa"),
        feature_ids=("MASC", "FEM"),
        related=("u-stems", "guna-vrddhi"),
    ),
    topic(
        "u-stems",
        level=2,
        title=("-u nouns: गुरु, मधु, धेनु", "उकारान्त शब्द: गुरु, मधु, धेनु"),
        title_sa="उकारान्तशब्दाः",
        summary=("u-words mirror i-words: u grows to o, and the locative ends in -au.",
                 "उ-शब्द इ-शब्दों का प्रतिबिम्ब हैं: उ बढ़कर ओ बनता है, और सप्तमी -औ पर खत्म होती है।"),
        blocks=[
            text("Swap i for u in the कवि table and you have {{गुरु}}: {{गुरवे}}, {{गुरोः}}, {{गुरौ}}. Neuter "
                 "u-words like {{मधु}} “honey” add n before vowel endings: {{मधुना}}, {{मधुने}}.",
                 "कवि की तालिका में इ की जगह उ रखिए, गुरु बन जाएगा: {{गुरवे}}, {{गुरोः}}, {{गुरौ}}। {{मधु}} 'शहद' "
                 "जैसे नपुंसकलिंग उ-शब्द स्वर वाले प्रत्ययों से पहले न जोड़ते हैं: {{मधुना}}, {{मधुने}}।"),
            noun_table("गुरु", "Pum", [
                "गुरुः गुरू गुरवः", "गुरुम् गुरू गुरून्", "गुरुणा गुरुभ्याम् गुरुभिः", "गुरवे गुरुभ्याम् गुरुभ्यः",
                "गुरोः गुरुभ्याम् गुरुभ्यः", "गुरोः गुर्वोः गुरूणाम्", "गुरौ गुर्वोः गुरुषु", "गुरो गुरू गुरवः",
            ], ("गुरु “teacher” — masculine", "गुरु — पुंलिंग")),
            noun_table("मधु", "Napumsaka", [
                "मधु मधुनी मधूनि", "मधु मधुनी मधूनि", "मधुना मधुभ्याम् मधुभिः", "मधुने मधुभ्याम् मधुभ्यः",
                "मधुनः मधुभ्याम् मधुभ्यः", "मधुनः मधुनोः मधूनाम्", "मधुनि मधुनोः मधुषु", "मधु मधुनी मधूनि",
            ], ("मधु “honey” — neuter", "मधु 'शहद' — नपुंसकलिंग")),
            tip("Feminine {{धेनु}} “cow” goes like गुरु, with extra ā-style options: {{धेन्वै}}, {{धेन्वाः}}.",
                "स्त्रीलिंग {{धेनु}} 'गाय' गुरु जैसा चलता है, साथ में आ-जैसे विकल्प भी: {{धेन्वै}}, {{धेन्वाः}}।"),
            examples(
                ex("गुरवे नमः", "Salutation to the teacher.", "गुरु को नमस्कार।",
                   w("गुरवे", "to the teacher", "गुरु को", sub("गुरु", "Pum", "Caturthi")),
                   w("नमः", "salutation", "नमस्कार")),
                ex("साधुभिः", "with good people", "सज्जनों के साथ", check=sub("साधु", "Pum", "Trtiya", "Bahu")),
                ex("वस्तूनि", "things", "वस्तुएँ", check=sub("वस्तु", "Napumsaka", "Prathama", "Bahu")),
            ),
            wild(
                ex("गुरुर्ब्रह्मा गुरुर्विष्णुः", "The guru is Brahmā, the guru is Viṣṇu.",
                   "गुरु ही ब्रह्मा हैं, गुरु ही विष्णु हैं।",
                   source=src("Guru Stotra", "गुरु स्तोत्र"), check=sub("गुरु", form="गुरुः")),
            ),
        ],
        deeper=[
            go_deeper(
                ("Why गुरुणा has ṇ", "गुरुणा में ण क्यों"),
                text("The masculine instrumental adds nā, and the r of guru turns that n into ṇ — the same "
                     "rule as {{रामेण}}. {{साधुना}} has no r before it, so it keeps n.",
                     "पुंलिंग तृतीया में 'ना' जुड़ता है, और गुरु का र उस न को ण बना देता है — वही नियम जो {{रामेण}} "
                     "में है। {{साधुना}} में पहले र नहीं, इसलिए न ही रहता है।"),
            ),
        ],
        quiz=[
            q(("“Of the teachers” = ?", "'गुरुओं का' = ?"),
              [opt_sa("गुरूणाम्", sub("गुरु", "Pum", "Sasthi", "Bahu")), opt_sa("गुरोः", sub("गुरु", "Pum", "Sasthi")),
               opt_sa("गुरुषु", sub("गुरु", "Pum", "Saptami", "Bahu"))],
              0,
              ("The genitive plural lengthens u and adds -nām: {{गुरूणाम्}}.",
               "षष्ठी बहुवचन में उ दीर्घ होता है और -नाम् जुड़ता है: {{गुरूणाम्}}।")),
        ],
        proofs=[
            proof("paradigm", ("See गुरु built form by form", "गुरु के रूप बनते हुए देखिए"), pratipadika="गुरु", linga="Pum"),
        ],
        terms=("guna", "shabdarupa"),
        feature_ids=("MASC", "NEUT"),
        related=("i-stems",),
    ),
]
