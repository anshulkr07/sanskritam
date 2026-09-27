"""Chapter 3 · The 8 cases, part B — ablative, genitive, locative, upapada,
kāraka. Assembled in ``c03_cases``."""

from __future__ import annotations

from ._cases_common import case_forms_table as _forms
from .model import (
    cell, ex, examples, go_deeper, opt, opt_sa, proof, q, src, sub, table, tc, text,
    tin, tip, topic, w, watch, wild,
)

TOPICS_B = [
    topic(
        "ablative",
        level=1,
        title=("Ablative: from", "पञ्चमी: से (अलग होना)"),
        title_sa="पञ्चमी",
        summary=("The 5th case marks what something moves away from — and what you fear or compare against.",
                 "पञ्चमी बताती है कि कोई चीज़ किससे अलग होती है — और किससे डर या तुलना हो।"),
        term=("पञ्चमी", "the fifth case — from", "पञ्चमी विभक्ति — से (अलगाव)"),
        blocks=[
            text("The ablative answers “from where?”: a leaf falls from a tree, a traveller comes from "
                 "a village. For a-words the singular ends in -āt.",
                 "पञ्चमी 'कहाँ से?' का उत्तर देती है: पेड़ से पत्ता गिरता है, यात्री गाँव से आता है। अ-शब्दों में "
                 "एकवचन का अंत -आत् है।"),
            _forms("Panchami", ("Ablative forms", "पञ्चमी के रूप")),
            examples(
                ex("वृक्षात् पत्रं पतति", "A leaf falls from the tree.", "पेड़ से पत्ता गिरता है।",
                   w("वृक्षात्", "from the tree — 5th case", "पेड़ से — पञ्चमी", sub("वृक्ष", "Pum", "Panchami")),
                   w("पत्रं", "a leaf", "पत्ता", sub("पत्र", "Napumsaka")),
                   w("पतति", "falls", "गिरता है", tin("पत्"))),
                ex("बालकः सिंहात् बिभेति", "The boy is afraid of the lion.", "बालक शेर से डरता है।",
                   w("सिंहात्", "of the lion — what is feared", "शेर से — जिससे डर हो", sub("सिंह", "Pum", "Panchami")),
                   w("बिभेति", "fears", "डरता है", tin("भी"))),
            ),
            tip("Hindi “se” means both “with” and “from”. Sanskrit keeps them apart: the tool is 3rd "
                "case, the starting point is 5th.",
                "हिन्दी का 'से' साधन और अलगाव, दोनों बताता है। संस्कृत इन्हें अलग रखता है: साधन तृतीया में, "
                "जहाँ से अलग हो वह पञ्चमी में।"),
            watch("For ā-feminines the ablative and genitive singular look the same: {{लतायाः}}. The "
                  "sentence tells you whether it means “from” or “of”.",
                  "आ-अंत स्त्रीलिंग शब्दों में पञ्चमी और षष्ठी एकवचन एक-से दिखते हैं: {{लतायाः}}। वाक्य से "
                  "पता चलता है कि अर्थ 'से' है या 'का'।"),
            wild(
                ex("आदित्यात् जायते वृष्टिः", "From the sun comes rain.", "सूर्य से वर्षा उत्पन्न होती है।",
                   w("आदित्यात्", "from the sun — 5th case", "सूर्य से — पञ्चमी", sub("आदित्य", "Pum", "Panchami")),
                   w("जायते", "is born, arises", "उत्पन्न होती है", tin("जन्")),
                   w("वृष्टिः", "rain", "वर्षा", sub("वृष्टि", "Stri")),
                   source=src("Motto of the India Meteorological Department",
                              "भारत मौसम विज्ञान विभाग का आदर्श-वाक्य")),
                ex("असतो मा सद्गमय", "Lead me from the unreal to the real.", "मुझे असत्य से सत्य की ओर ले चलो।",
                   w("असतो", "from the unreal — 5th case", "असत्य से — पञ्चमी",
                     sub("असत्", "Napumsaka", "Panchami", form="असतः")),
                   w("मा", "me", "मुझे"),
                   w("सद्गमय", "lead to the real", "सत्य की ओर ले चलो"),
                   source=src("Bṛhadāraṇyaka Upaniṣad 1.3.28", "बृहदारण्यक उपनिषद् 1.3.28")),
            ),
        ],
        deeper=[
            go_deeper(
                ("Comparing with the ablative", "पञ्चमी से तुलना"),
                text("The ablative also marks what something is compared against: {{जननी जन्मभूमिश्च "
                     "स्वर्गादपि गरीयसी}} “mother and motherland are greater even than heaven”. Here "
                     "{{स्वर्गात्}} means “than heaven”.",
                     "तुलना में भी पञ्चमी आती है: {{जननी जन्मभूमिश्च स्वर्गादपि गरीयसी}} 'माता और मातृभूमि स्वर्ग से "
                     "भी बढ़कर हैं'। यहाँ {{स्वर्गात्}} का अर्थ है 'स्वर्ग से (बढ़कर)'।"),
            ),
        ],
        quiz=[
            q(("“He comes from the house” — {{सः ___ आगच्छति}}", "'वह घर से आता है' — {{सः ___ आगच्छति}}"),
              [opt_sa("गृहात्", sub("गृह", "Napumsaka", "Panchami")),
               opt_sa("गृहेण", sub("गृह", "Napumsaka", "Trtiya")),
               opt_sa("गृहे", sub("गृह", "Napumsaka", "Saptami"))],
              0,
              ("Moving away from a place: 5th case.", "किसी स्थान से अलग होना: पञ्चमी।")),
        ],
        terms=("vibhakti", "karaka"),
        feature_ids=("ABL.SG",),
        related=("genitive", "instrumental"),
    ),
    topic(
        "genitive",
        level=1,
        title=("Genitive: of, 's", "षष्ठी: का, की, के"),
        title_sa="षष्ठी",
        summary=("The 6th case links one noun to another: whose, of what, part of which.",
                 "षष्ठी एक संज्ञा को दूसरी से जोड़ती है: किसका, किस चीज़ का।"),
        term=("षष्ठी", "the sixth case — of", "षष्ठी विभक्ति — का, की, के"),
        blocks=[
            text("The genitive shows a relation between two nouns: ownership, family, part and whole. "
                 "{{रामस्य पुस्तकम्}} is “Rāma's book”. It names no role in the action, which is why "
                 "grammarians keep it apart from the other cases.",
                 "षष्ठी दो संज्ञाओं का सम्बन्ध बताती है: स्वामित्व, रिश्ता, अंग और पूरा। {{रामस्य पुस्तकम्}} = "
                 "'राम की पुस्तक'। यह क्रिया में कोई भूमिका नहीं बताती, इसलिए वैयाकरण इसे बाकी विभक्तियों से "
                 "अलग मानते हैं।"),
            _forms("Sasthi", ("Genitive forms", "षष्ठी के रूप")),
            examples(
                ex("दशरथस्य पुत्रः रामः", "Rāma, the son of Daśaratha", "दशरथ का पुत्र राम",
                   w("दशरथस्य", "of Daśaratha — 6th case", "दशरथ का — षष्ठी", sub("दशरथ", "Pum", "Sasthi")),
                   w("पुत्रः", "son", "पुत्र", sub("पुत्र")),
                   w("रामः", "Rāma", "राम", sub("राम"))),
                ex("गङ्गायाः जलम्", "the water of the Gaṅgā", "गंगा का जल",
                   w("गङ्गायाः", "of the Gaṅgā", "गंगा का", sub("गङ्गा", "Stri", "Sasthi")),
                   w("जलम्", "water", "जल", sub("जल", "Napumsaka"))),
            ),
            tip("The long plural -ānām is easy to hear: {{देवानाम्}} “of the gods”, {{बालकानाम्}} "
                "“of the boys”.",
                "षष्ठी बहुवचन का लम्बा अंत -आनाम् आसानी से सुनाई देता है: {{देवानाम्}} 'देवताओं का', "
                "{{बालकानाम्}} 'बालकों का'।"),
            watch("Unlike Hindi “kā, kī, ke”, the genitive never changes with the noun that follows: "
                  "{{रामस्य}} stays the same before a son, a daughter or a book.",
                  "हिन्दी के 'का, की, के' की तरह षष्ठी आगे की संज्ञा के साथ नहीं बदलती: पुत्र हो, पुत्री हो या "
                  "पुस्तक — {{रामस्य}} ही रहेगा।"),
            wild(
                ex("बलस्य मूलं विज्ञानम्", "Science is the root of strength.", "शक्ति का मूल विज्ञान है।",
                   w("बलस्य", "of strength — 6th case", "शक्ति का — षष्ठी", sub("बल", "Napumsaka", "Sasthi")),
                   w("मूलं", "the root", "मूल, जड़", sub("मूल", "Napumsaka")),
                   w("विज्ञानम्", "science, knowledge", "विज्ञान", sub("विज्ञान", "Napumsaka")),
                   source=src("Motto of DRDO", "डीआरडीओ का आदर्श-वाक्य")),
            ),
        ],
        deeper=[
            go_deeper(
                ("Why the genitive is not a kāraka", "षष्ठी कारक क्यों नहीं"),
                text("Pāṇini's six roles describe how a noun takes part in an action. “Rāma's book” is a "
                     "relation between two things, not a part in an action, so the genitive covers "
                     "“the remaining relations”: {{षष्ठी शेषे}} (2.3.50).",
                     "पाणिनि के छह कारक बताते हैं कि संज्ञा क्रिया में कैसे भाग लेती है। 'राम की पुस्तक' दो वस्तुओं "
                     "का सम्बन्ध है, किसी क्रिया में भूमिका नहीं; इसलिए षष्ठी 'शेष सम्बन्धों' के लिए है: "
                     "{{षष्ठी शेषे}} (2.3.50)।"),
            ),
        ],
        quiz=[
            q(("“The king's palace” = ___ {{प्रासादः}}", "'राजा का महल' = ___ {{प्रासादः}}"),
              [opt_sa("नृपस्य", sub("नृप", "Pum", "Sasthi")), opt_sa("नृपाय", sub("नृप", "Pum", "Caturthi")),
               opt_sa("नृपेण", sub("नृप", "Pum", "Trtiya"))],
              0,
              ("Whose palace? The genitive: {{नृपस्य}}.", "किसका महल? षष्ठी: {{नृपस्य}}।")),
        ],
        terms=("vibhakti",),
        feature_ids=("GEN.SG", "GEN.PL"),
        related=("locative",),
    ),
    topic(
        "locative",
        level=1,
        title=("Locative: in, on, at", "सप्तमी: में, पर"),
        title_sa="सप्तमी",
        summary=("The 7th case marks where or when something happens.",
                 "सप्तमी बताती है कि कुछ कहाँ या कब होता है।"),
        term=("सप्तमी", "the seventh case — in, on, at", "सप्तमी विभक्ति — में, पर"),
        blocks=[
            text("The locative answers “where?” and “when?”: in the house, on the tree, in the morning. "
                 "For a-words the singular ends in -e: {{गृहे}} “at home”, {{प्रातःकाले}} “in the morning”.",
                 "सप्तमी 'कहाँ?' और 'कब?' का उत्तर देती है: घर में, पेड़ पर, सुबह में। अ-शब्दों में एकवचन का अंत "
                 "-ए है: {{गृहे}} 'घर में', {{प्रातःकाले}} 'सुबह के समय'।"),
            _forms("Saptami", ("Locative forms", "सप्तमी के रूप")),
            examples(
                ex("खगाः वृक्षे वसन्ति", "Birds live in the tree.", "पक्षी पेड़ पर रहते हैं।",
                   w("खगाः", "birds", "पक्षी", sub("खग", "Pum", "Prathama", "Bahu")),
                   w("वृक्षे", "in the tree — 7th case", "पेड़ पर — सप्तमी", sub("वृक्ष", "Pum", "Saptami")),
                   w("वसन्ति", "live", "रहते हैं", tin("वस्", "Lat", "Prathama", "Bahu"))),
                ex("नौका जले चलति", "The boat moves on the water.", "नाव पानी पर चलती है।",
                   w("नौका", "boat", "नाव", sub("नौका", "Stri")),
                   w("जले", "on the water — 7th case", "पानी पर — सप्तमी", sub("जल", "Napumsaka", "Saptami")),
                   w("चलति", "moves", "चलती है", tin("चल्"))),
            ),
            tip("The plural -eṣu or -su is a good landmark: {{देवेषु}} “among the gods”, {{कर्मसु}} "
                "“in actions”.",
                "बहुवचन का -एषु या -सु अच्छा पहचान-चिह्न है: {{देवेषु}} 'देवताओं में', {{कर्मसु}} 'कर्मों में'।"),
            wild(
                ex("योगः कर्मसु कौशलम्", "Yoga is skill in action.", "कर्मों में कुशलता ही योग है।",
                   w("योगः", "yoga", "योग", sub("योग")),
                   w("कर्मसु", "in actions — 7th case, plural", "कर्मों में — सप्तमी बहुवचन",
                     sub("कर्मन्", "Napumsaka", "Saptami", "Bahu")),
                   w("कौशलम्", "skill", "कुशलता", sub("कौशल", "Napumsaka")),
                   source=src("Bhagavad Gītā 2.50", "भगवद्गीता 2.50")),
                ex("धर्मक्षेत्रे कुरुक्षेत्रे", "on the field of dharma, on the field of the Kurus",
                   "धर्मक्षेत्र में, कुरुक्षेत्र में",
                   source=src("Bhagavad Gītā 1.1 — its first words", "भगवद्गीता 1.1 — पहले शब्द"),
                   check=sub("कुरुक्षेत्र", "Napumsaka", "Saptami", form="कुरुक्षेत्रे")),
            ),
        ],
        deeper=[
            go_deeper(
                ("“When” clauses with the locative", "सप्तमी से 'जब' वाले वाक्य"),
                text("A noun and a participle both in the locative make a time clause: {{सूर्ये उदिते}} "
                     "“when the sun has risen”. This is the locative absolute, and stories use it all the time.",
                     "संज्ञा और कृदन्त दोनों सप्तमी में हों तो 'जब' का भाव बनता है: {{सूर्ये उदिते}} 'सूर्य उगने पर'। "
                     "इसे सति-सप्तमी कहते हैं; कथाओं में यह बहुत आती है।"),
            ),
        ],
        quiz=[
            q(("“Children play in the garden” — {{बालाः ___ क्रीडन्ति}}", "'बच्चे बगीचे में खेलते हैं' — {{बालाः ___ क्रीडन्ति}}"),
              [opt_sa("उद्याने", sub("उद्यान", "Napumsaka", "Saptami")),
               opt_sa("उद्यानात्", sub("उद्यान", "Napumsaka", "Panchami")),
               opt_sa("उद्यानम्", sub("उद्यान", "Napumsaka", "Dvitiya"))],
              0,
              ("“In” a place: 7th case.", "किसी स्थान 'में': सप्तमी।")),
        ],
        proofs=[
            proof("paradigm", ("See कर्मन्, a consonant stem, in all its forms", "कर्मन् (व्यंजनान्त शब्द) के सारे रूप देखिए"),
                  pratipadika="कर्मन्", linga="Napumsaka"),
        ],
        terms=("vibhakti",),
        feature_ids=("LOC.SG", "LOC.PL"),
        related=("upapada",),
    ),
    topic(
        "upapada",
        level=2,
        title=("Words that demand a case", "उपपद विभक्ति"),
        title_sa="उपपदविभक्तयः",
        summary=("Some words always pull the noun beside them into a fixed case — learn them as pairs.",
                 "कुछ शब्द अपने साथ वाली संज्ञा को हमेशा तय विभक्ति में लाते हैं — इन्हें जोड़ी की तरह सीखिए।"),
        term=("उपपदविभक्तिः", "a case chosen by a nearby word", "पास के शब्द से तय होने वाली विभक्ति"),
        blocks=[
            text("Normally the verb decides a noun's case. But certain small words bring their own rule: "
                 "{{सह}} “with” wants the 3rd case, {{नमः}} “salutation” wants the 4th. School exams test "
                 "these pairs, and they are easy once listed.",
                 "सामान्य रूप से क्रिया संज्ञा की विभक्ति तय करती है। पर कुछ शब्द अपना नियम साथ लाते हैं: {{सह}} "
                 "के साथ तृतीया, {{नमः}} के साथ चतुर्थी। विद्यालय की परीक्षाओं में ये जोड़े पूछे जाते हैं, और सूची "
                 "बना लें तो आसान हैं।"),
            table(
                ("Common pairs", "प्रमुख जोड़े"),
                [("Word", "शब्द"), ("Meaning", "अर्थ"), ("Case", "विभक्ति"), ("Example", "उदाहरण")],
                [
                    ["परितः", tc("all around", "चारों ओर"), tc("2nd", "द्वितीया"),
                     cell("ग्रामं परितः", sub("ग्राम", "Pum", "Dvitiya", form="ग्रामम्"))],
                    ["विना", tc("without", "बिना"), tc("2nd, 3rd or 5th", "द्वितीया, तृतीया या पञ्चमी"),
                     cell("जलं विना", sub("जल", "Napumsaka", "Dvitiya", form="जलम्"))],
                    ["सह", tc("together with", "साथ"), tc("3rd", "तृतीया"),
                     cell("पित्रा सह", sub("पितृ", "Pum", "Trtiya", form="पित्रा"))],
                    ["अलम्", tc("enough of", "बस, पर्याप्त"), tc("3rd", "तृतीया"),
                     cell("कोलाहलेन अलम्", sub("कोलाहल", "Pum", "Trtiya", form="कोलाहलेन"))],
                    ["नमः", tc("salutation to", "को नमस्कार"), tc("4th", "चतुर्थी"),
                     cell("गुरवे नमः", sub("गुरु", "Pum", "Caturthi", form="गुरवे"))],
                    ["स्वस्ति", tc("well-being to", "का कल्याण हो"), tc("4th", "चतुर्थी"),
                     cell("प्रजाभ्यः स्वस्ति", sub("प्रजा", "Stri", "Caturthi", "Bahu", form="प्रजाभ्यः"))],
                    ["बहिः", tc("outside", "बाहर"), tc("5th", "पञ्चमी"),
                     cell("ग्रामात् बहिः", sub("ग्राम", "Pum", "Panchami", form="ग्रामात्"))],
                    ["उपरि", tc("above", "ऊपर"), tc("6th", "षष्ठी"),
                     cell("वृक्षस्य उपरि", sub("वृक्ष", "Pum", "Sasthi", form="वृक्षस्य"))],
                ],
            ),
            tip("Learn each word with a tiny example, not as a rule: “paritaḥ — grāmaṃ paritaḥ”. The "
                "pattern sticks much faster.",
                "हर शब्द को नियम की तरह नहीं, छोटे उदाहरण के साथ याद कीजिए: 'परितः — ग्रामं परितः'। ऐसे जल्दी "
                "याद होता है।"),
            examples(
                ex("रामः सीतया सह वनं गच्छति", "Rāma goes to the forest with Sītā.", "राम सीता के साथ वन जाता है।",
                   w("सीतया", "Sītā — 3rd case because of सह", "सीता — सह के कारण तृतीया", sub("सीता", "Stri", "Trtiya")),
                   w("सह", "with", "साथ")),
                ex("विद्यालयं परितः वृक्षाः सन्ति", "There are trees all around the school.",
                   "विद्यालय के चारों ओर पेड़ हैं।",
                   w("विद्यालयं", "the school — 2nd case because of परितः", "विद्यालय — परितः के कारण द्वितीया",
                     sub("विद्यालय", "Pum", "Dvitiya")),
                   w("परितः", "all around", "चारों ओर"),
                   w("वृक्षाः", "trees", "पेड़", sub("वृक्ष", "Pum", "Prathama", "Bahu")),
                   w("सन्ति", "are", "हैं", tin("अस्", "Lat", "Prathama", "Bahu"))),
            ),
            watch("{{विना}} accepts three cases, all correct: {{जलं विना}}, {{जलेन विना}} and {{जलात् विना}} "
                  "all mean “without water”.",
                  "{{विना}} के साथ तीनों विभक्तियाँ सही हैं: {{जलं विना}}, {{जलेन विना}} और {{जलात् विना}} — "
                  "सबका अर्थ 'पानी के बिना'।"),
            wild(
                ex("शं नो वरुणः", "May Varuṇa be kind to us.", "वरुण हमारे लिए मंगलकारी हों।",
                   w("शं", "well-being, kindness", "कल्याण"),
                   w("नो", "to us", "हमारे लिए"),
                   w("वरुणः", "Varuṇa, lord of the waters", "वरुण, जल के देवता", sub("वरुण")),
                   source=src("Taittirīya Upaniṣad · motto of the Indian Navy",
                              "तैत्तिरीय उपनिषद् · भारतीय नौसेना का आदर्श-वाक्य")),
            ),
        ],
        deeper=[
            go_deeper(
                ("When the verb and the word disagree", "जब क्रिया और शब्द की माँग अलग हो"),
                text("The verb wins. Grammarians put it as {{उपपदविभक्तेः कारकविभक्तिर्बलीयसी}}: {{देवान् "
                     "नमस्करोति}} “salutes the gods” takes the object case because of the verb, while "
                     "{{देवेभ्यः नमः}} takes the 4th.",
                     "क्रिया की चलती है। वैयाकरण कहते हैं {{उपपदविभक्तेः कारकविभक्तिर्बलीयसी}}: {{देवान् नमस्करोति}} "
                     "'देवताओं को नमस्कार करता है' में क्रिया के कारण द्वितीया, पर {{देवेभ्यः नमः}} में चतुर्थी।"),
            ),
        ],
        quiz=[
            q(("Which is correct for “outside the village”?", "'गाँव के बाहर' के लिए कौन-सा सही है?"),
              [opt_sa("ग्रामात् बहिः"), opt_sa("ग्रामं बहिः"), opt_sa("ग्रामे बहिः")],
              0,
              ("{{बहिः}} “outside” takes the 5th case.", "{{बहिः}} 'बाहर' के साथ पञ्चमी आती है।")),
            q(("{{सह}} “with” takes which case?", "{{सह}} 'साथ' के साथ कौन-सी विभक्ति आती है?"),
              [opt("3rd — instrumental", "तृतीया"), opt("2nd — accusative", "द्वितीया"),
               opt("6th — genitive", "षष्ठी")],
              0,
              ("For example {{पित्रा सह}}, {{रामेण सह}}.", "जैसे {{पित्रा सह}}, {{रामेण सह}}।")),
        ],
        terms=("upapada-vibhakti",),
        related=("karaka", "instrumental"),
    ),
    topic(
        "karaka",
        level=2,
        title=("Kāraka: the roles behind the endings", "कारक: विभक्तियों के पीछे की भूमिकाएँ"),
        title_sa="कारकाणि",
        summary=("Six roles in an action — doer, object, means, receiver, source, place — explain which ending a noun gets.",
                 "क्रिया की छह भूमिकाएँ — कर्ता, कर्म, करण, सम्प्रदान, अपादान, अधिकरण — बताती हैं कि संज्ञा को कौन-सी विभक्ति मिलेगी।"),
        term=("कारकम्", "a role in an action", "कारक — क्रिया में भूमिका"),
        minutes=4,
        blocks=[
            text("Cases are the forms; kārakas are the meanings behind them. Pāṇini describes six ways a "
                 "noun can take part in an action, and each has a usual case. That is why Hindi school "
                 "grammar teaches cases under the name kāraka.",
                 "विभक्तियाँ रूप हैं; कारक उनके पीछे के अर्थ हैं। पाणिनि बताते हैं कि संज्ञा छह तरह से किसी क्रिया "
                 "में भाग ले सकती है, और हर भूमिका की एक सामान्य विभक्ति है। इसीलिए हिन्दी व्याकरण में विभक्तियाँ "
                 "'कारक' नाम से पढ़ाई जाती हैं।"),
            table(
                ("The six roles", "छह कारक"),
                [("Role", "कारक"), ("What it is", "क्या है"), ("Usual case", "सामान्य विभक्ति"), ("Example", "उदाहरण")],
                [
                    ["कर्ता", tc("the doer", "काम करने वाला"), tc("1st", "प्रथमा"), cell("रामः", sub("राम"))],
                    ["कर्म", tc("what the action reaches", "जिस पर क्रिया का फल पड़े"), tc("2nd", "द्वितीया"),
                     cell("फलम्", sub("फल", "Napumsaka", "Dvitiya"))],
                    ["करणम्", tc("the means, the tool", "साधन"), tc("3rd", "तृतीया"),
                     cell("हस्तेन", sub("हस्त", "Pum", "Trtiya"))],
                    ["सम्प्रदानम्", tc("the receiver", "जिसे दिया जाए"), tc("4th", "चतुर्थी"),
                     cell("बालकाय", sub("बालक", "Pum", "Caturthi"))],
                    ["अपादानम्", tc("the point of departure", "जिससे अलग हो"), tc("5th", "पञ्चमी"),
                     cell("वृक्षात्", sub("वृक्ष", "Pum", "Panchami"))],
                    ["अधिकरणम्", tc("the place or time", "आधार, स्थान"), tc("7th", "सप्तमी"),
                     cell("गृहे", sub("गृह", "Napumsaka", "Saptami"))],
                ],
            ),
            examples(
                ex("पिता पुत्राय गृहे हस्तेन पुस्तकं ददाति", "At home, the father hands his son a book.",
                   "घर में पिता अपने हाथ से पुत्र को पुस्तक देते हैं।",
                   w("पिता", "father — the doer", "पिता — कर्ता", sub("पितृ")),
                   w("पुत्राय", "to the son — the receiver", "पुत्र को — सम्प्रदान", sub("पुत्र", "Pum", "Caturthi")),
                   w("गृहे", "at home — the place", "घर में — अधिकरण", sub("गृह", "Napumsaka", "Saptami")),
                   w("हस्तेन", "with his hand — the means", "हाथ से — करण", sub("हस्त", "Pum", "Trtiya")),
                   w("पुस्तकं", "a book — the object", "पुस्तक — कर्म", sub("पुस्तक", "Napumsaka", "Dvitiya")),
                   w("ददाति", "gives", "देते हैं", tin("दा"))),
                title=("Five roles in one sentence", "एक वाक्य में पाँच कारक"),
            ),
            watch("Roles explain endings, but an ending alone doesn't prove a role. In a passive sentence "
                  "the doer takes the 3rd case: {{रामेण}} is the kartā in {{रामेण पुस्तकं पठ्यते}}.",
                  "कारक विभक्ति का कारण बताता है, पर केवल विभक्ति से कारक तय नहीं होता। कर्मवाच्य में कर्ता तृतीया में "
                  "आता है: {{रामेण पुस्तकं पठ्यते}} में {{रामेण}} कर्ता है।"),
            tip("If you studied Hindi grammar at school, you already know these names — kartā, karma, "
                "karaṇa, sampradāna, apādāna, adhikaraṇa. Sanskrit is where they come from.",
                "हिन्दी व्याकरण में आपने ये नाम पढ़े होंगे — कर्ता, कर्म, करण, सम्प्रदान, अपादान, अधिकरण। ये संस्कृत "
                "से ही आए हैं।"),
        ],
        deeper=[
            go_deeper(
                ("Where the six are defined", "छह कारक कहाँ परिभाषित हैं"),
                text("Pāṇini defines the roles in 1.4.23–55: {{ध्रुवमपायेऽपादानम्}} “the fixed point in a "
                     "separation is apādāna” (1.4.24), {{साधकतमं करणम्}} “the most effective means is karaṇa” "
                     "(1.4.42). The genitive and vocative stand outside this system.",
                     "पाणिनि ने कारक 1.4.23–55 में परिभाषित किए हैं: {{ध्रुवमपायेऽपादानम्}} 'अलगाव में जो स्थिर रहे, "
                     "वह अपादान' (1.4.24), {{साधकतमं करणम्}} 'जो सबसे प्रभावी साधन हो, वह करण' (1.4.42)। षष्ठी और "
                     "सम्बोधन इस व्यवस्था से बाहर हैं।"),
            ),
        ],
        quiz=[
            q(("In {{बालकः कलमेन लिखति}}, what role does {{कलमेन}} play?",
               "{{बालकः कलमेन लिखति}} में {{कलमेन}} कौन-सा कारक है?"),
              [opt("Karaṇa — the means", "करण — साधन"), opt("Karma — the object", "कर्म"),
               opt("Adhikaraṇa — the place", "अधिकरण — स्थान")],
              0,
              ("The pen is the tool of writing: karaṇa, 3rd case.", "कलम लिखने का साधन है: करण, तृतीया।")),
        ],
        proofs=[
            proof("word-order", ("Move the roles around a sentence", "वाक्य में भूमिकाएँ इधर-उधर करके देखिए"),
                  sentence="रामः फलम् खादति"),
        ],
        terms=("karaka", "vibhakti"),
        feature_ids=("KARAKA-KARTR", "KARAKA-KARMA", "KARAKA-KARANA", "KARAKA-SAMPRADANA",
                     "KARAKA-APADANA", "KARAKA-ADHIKARANA"),
        related=("cases-overview",),
    ),
]
