"""Chapter 11 · Compounds — words inside words: dvandva, tatpuruṣa,
karmadhāraya and dvigu, “not-X” and “X-maker”, bahuvrīhi, avyayībhāva,
and reading long compounds.

The engine has no compound analysis, so every breakdown here is reference
material. What is checked is real: the join (sandhi), the declined compound,
and each word of the spelled-out analysis."""

from __future__ import annotations

from .model import (
    cell, chapter, ex, examples, fact, go_deeper, krd, opt, opt_sa, q, snd, src, steps, sub, table,
    tc, text, tin, tip, topic, w, watch, wild,
)

CHAPTER = chapter(
    "compounds",
    title=("Compounds", "समास"),
    title_sa="समासाः",
    blurb=("पीताम्बर, राजपुरुष, यथाशक्ति — how Sanskrit packs a phrase into one word.",
           "पीताम्बर, राजपुरुष, यथाशक्ति — संस्कृत एक वाक्यांश को एक शब्द में कैसे समेटती है।"),
    icon="layers-outline",
)

_REFERENCE = fact(
    "Breakdowns in this chapter are reference. The joins and each word are checked; the compound analysis "
    "itself is not.",
    "इस अध्याय के विग्रह सन्दर्भ के लिए हैं। सन्धि और हर शब्द जाँचे गए हैं; समास का विश्लेषण स्वयं नहीं।")

TOPICS = [
    topic(
        "compounds-intro",
        level=1,
        title=("Words inside words", "शब्दों के भीतर शब्द"),
        title_sa="समासः",
        summary=("A compound joins words into one, drops the inner endings, and keeps only the last one's ending.",
                 "समास कई शब्दों को एक बनाता है, भीतर की विभक्तियाँ हटा देता है, और केवल अंतिम शब्द की विभक्ति रखता है।"),
        term=("समासः", "compound — “putting together”", "समास — 'एक साथ रखना'"),
        blocks=[
            text("{{राज्ञः पुरुषः}} “the king's man” can be squeezed into one word, {{राजपुरुषः}}. The first word loses "
                 "its ending, the words fuse, and only the last word declines. Spelling a compound back out is called "
                 "{{विग्रहः}}.",
                 "{{राज्ञः पुरुषः}} 'राजा का आदमी' को एक शब्द में समेटा जा सकता है: {{राजपुरुषः}}। पहला शब्द अपनी विभक्ति "
                 "छोड़ देता है, शब्द जुड़ जाते हैं, और केवल अंतिम शब्द के रूप चलते हैं। समास को फिर से खोलकर लिखना "
                 "{{विग्रहः}} कहलाता है।"),
            examples(
                ex("राज्ञः पुरुषः → राजपुरुषः", "the king's man → king's-man", "राजा का पुरुष → राजपुरुष",
                   w("राज्ञः", "of the king", "राजा का", sub("राजन्", "Pum", "Sasthi")),
                   w("पुरुषः", "man", "पुरुष", sub("पुरुष")),
                   w("राजपुरुषः", "the compound, one word", "समास, एक शब्द", sub("राजपुरुष"))),
            ),
            table(
                ("The four big families", "चार बड़े परिवार"),
                [("Family", "प्रकार"), ("Example", "उदाहरण"), ("Idea", "भाव")],
                [
                    [tc("dvandva — “and”", "द्वन्द्व — 'और'"), cell("रामलक्ष्मणौ", sub("रामलक्ष्मण", "Pum", "Prathama", "Dvi")),
                     tc("Rāma and Lakṣmaṇa", "राम और लक्ष्मण")],
                    [tc("tatpuruṣa — “X's Y”", "तत्पुरुष — 'X का Y'"), cell("देशभक्तिः", sub("देशभक्ति", "Stri")),
                     tc("devotion to the country", "देश की भक्ति")],
                    [tc("bahuvrīhi — “one who has”", "बहुव्रीहि — 'जिसके पास हो'"), cell("पीताम्बरः", sub("पीताम्बर")),
                     tc("the one in yellow clothes — Kṛṣṇa", "पीले वस्त्र वाले — कृष्ण")],
                    [tc("avyayībhāva — adverb", "अव्ययीभाव — क्रिया-विशेषण"), cell("प्रतिदिनम्"),
                     tc("every day", "हर दिन")],
                ],
            ),
            _REFERENCE,
        ],
        quiz=[
            q(("In a compound, which word keeps its ending?", "समास में किस शब्द की विभक्ति बचती है?"),
              [opt("Only the last", "केवल अंतिम"), opt("Only the first", "केवल पहले"), opt("All of them", "सबकी")],
              0,
              ("राजपुरुषः: राजन् lost its ending, पुरुषः kept it.", "राजपुरुषः: राजन् की विभक्ति गई, पुरुषः की बची।")),
        ],
        terms=("samasa", "vibhakti"),
        feature_ids=("SAMASA-TATPURUSA",),
        related=("dvandva", "sandhi-why"),
    ),
    topic(
        "dvandva",
        level=1,
        title=("Dvandva: “X and Y”", "द्वन्द्व: 'X और Y'"),
        title_sa="द्वन्द्वः",
        summary=("Pairs and lists: रामलक्ष्मणौ “Rāma and Lakṣmaṇa”. Two people take a dual ending.",
                 "जोड़े और सूचियाँ: रामलक्ष्मणौ 'राम और लक्ष्मण'। दो व्यक्तियों पर द्विवचन।"),
        term=("द्वन्द्वः", "a pair — an “and” compound", "द्वन्द्व — 'और' वाला समास"),
        blocks=[
            text("A dvandva lists equals and replaces {{च}} “and”. Its ending counts everyone inside: two people "
                 "take the dual, three or more the plural.",
                 "द्वन्द्व बराबर के शब्दों को गिनाता है और {{च}} 'और' की जगह लेता है। इसकी विभक्ति भीतर के सबको गिनती है: "
                 "दो व्यक्ति हों तो द्विवचन, तीन या अधिक हों तो बहुवचन।"),
            examples(
                ex("रामलक्ष्मणौ", "Rāma and Lakṣmaṇa — two, so dual", "राम और लक्ष्मण — दो, इसलिए द्विवचन",
                   check=sub("रामलक्ष्मण", "Pum", "Prathama", "Dvi")),
                ex("मातापितरौ", "mother and father", "माता-पिता", check=sub("मातापितृ", "Pum", "Prathama", "Dvi")),
                ex("सुखदुःखे", "joy and sorrow", "सुख-दुःख", check=sub("सुखदुःख", "Napumsaka", "Prathama", "Dvi")),
            ),
            wild(
                ex("योगक्षेमं वहाम्यहम्", "I carry their getting and keeping — yoga and kṣema as one unit.",
                   "मैं उनका योग और क्षेम वहन करता हूँ — दोनों एक इकाई की तरह।",
                   w("योगक्षेमं", "gaining and keeping", "प्राप्ति और रक्षा", sub("योगक्षेम", "Pum", "Dvitiya", form="योगक्षेमम्")),
                   w("वहाम्यहम्", "I carry — वहामि + अहम्", "मैं वहन करता हूँ — वहामि + अहम्", snd("वहामि", "अहम्")),
                   source=src("Bhagavad Gītā 9.22 · motto of LIC", "भगवद्गीता 9.22 · एलआईसी का आदर्श-वाक्य")),
            ),
            tip("Hindi writes these with a hyphen — माता-पिता, सुख-दुःख — which is exactly the dvandva idea.",
                "हिन्दी इन्हें योजक-चिह्न से लिखती है — माता-पिता, सुख-दुःख — यही द्वन्द्व का भाव है।"),
            _REFERENCE,
        ],
        quiz=[
            q(("Why is it रामलक्ष्मणौ and not रामलक्ष्मणः?", "रामलक्ष्मणौ क्यों, रामलक्ष्मणः क्यों नहीं?"),
              [opt("Two people, so dual", "दो व्यक्ति, इसलिए द्विवचन"), opt("Rāma is older", "राम बड़े हैं"),
               opt("Sandhi changed it", "सन्धि ने बदला")],
              0,
              ("A dvandva's ending counts its members.", "द्वन्द्व की विभक्ति सदस्यों को गिनती है।")),
        ],
        terms=("samasa", "vacana"),
        feature_ids=("SAMASA-DVANDVA",),
        related=("tatpurusha",),
    ),
    topic(
        "tatpurusha",
        level=1,
        title=("Tatpuruṣa: “X's Y”, “Y for X”", "तत्पुरुष: 'X का Y', 'X के लिए Y'"),
        title_sa="तत्पुरुषः",
        summary=("The last word is the main one; the first word hides a case: राष्ट्रपतिः = lord of the nation.",
                 "अंतिम शब्द मुख्य है; पहले शब्द में कोई विभक्ति छिपी है: राष्ट्रपतिः = राष्ट्र का पति।"),
        term=("तत्पुरुषः", "a compound where the last word leads", "तत्पुरुष — जिसमें अंतिम शब्द प्रधान हो"),
        blocks=[
            text("In a tatpuruṣa, the **last** word is what the compound is: a {{राष्ट्रपतिः}} is a kind of lord. The "
                 "first word stands in some case to it — “of”, “for”, “in”, “by” — and you restore that case when you "
                 "spell it out.",
                 "तत्पुरुष में **अंतिम** शब्द बताता है कि वस्तु क्या है: {{राष्ट्रपतिः}} एक प्रकार का पति (स्वामी) है। पहला "
                 "शब्द उससे किसी विभक्ति में जुड़ा है — 'का', 'के लिए', 'में', 'से' — और विग्रह करते समय वही विभक्ति लौट आती है।"),
            table(
                ("Spelling tatpuruṣas out", "तत्पुरुष का विग्रह"),
                [("Compound", "समास"), ("Spelled out", "विग्रह"), ("Meaning", "अर्थ")],
                [
                    [cell("राष्ट्रपतिः", sub("राष्ट्रपति")), cell("राष्ट्रस्य पतिः"), tc("lord of the nation — president", "राष्ट्र का पति — राष्ट्रपति")],
                    [cell("देशभक्तिः", sub("देशभक्ति", "Stri")), cell("देशस्य भक्तिः"), tc("devotion to the country", "देश की भक्ति")],
                    [cell("गजाननः", sub("गजानन")), cell("गजस्य आननम्"), tc("elephant's face — Gaṇeśa", "हाथी का मुख — गणेश")],
                    [cell("विद्यालयः", sub("विद्यालय")), cell("विद्यायाः आलयः"), tc("house of learning — school", "विद्या का आलय")],
                    [cell("गुरुकुलम्", sub("गुरुकुल", "Napumsaka")), cell("गुरोः कुलम्"), tc("the teacher's household", "गुरु का कुल")],
                ],
            ),
            examples(
                ex("राष्ट्रस्य पतिः", "lord of the nation", "राष्ट्र का स्वामी",
                   w("राष्ट्रस्य", "of the nation — 6th case", "राष्ट्र का — षष्ठी", sub("राष्ट्र", "Napumsaka", "Sasthi")),
                   w("पतिः", "lord, master", "स्वामी", sub("पति"))),
                ex("गजस्य आननम्", "the elephant's face", "हाथी का मुख",
                   w("गजस्य", "of the elephant", "हाथी का", sub("गज", "Pum", "Sasthi")),
                   w("आननम्", "face", "मुख", sub("आनन", "Napumsaka"))),
            ),
            watch("{{गजाननः}} as a name means Gaṇeśa, the one **with** an elephant face. The same word can be read as "
                  "a tatpuruṣa or, as a name, a bahuvrīhi.",
                  "नाम के रूप में {{गजाननः}} का अर्थ गणेश — हाथी के मुख **वाले**। एक ही शब्द तत्पुरुष भी पढ़ा जा सकता है और, "
                  "नाम के रूप में, बहुव्रीहि भी।"),
            _REFERENCE,
        ],
        quiz=[
            q(("देशभक्तिः spelled out is…", "देशभक्तिः का विग्रह है…"),
              [opt_sa("देशस्य भक्तिः"), opt_sa("देशः भक्तिः च"), opt_sa("देशः यस्य सः")],
              0,
              ("“Devotion of the country” — a 6th-case tatpuruṣa.", "'देश की भक्ति' — षष्ठी तत्पुरुष।")),
        ],
        terms=("samasa", "vibhakti"),
        feature_ids=("SAMASA-TATPURUSA",),
        related=("karmadharaya-dvigu", "genitive"),
    ),
    topic(
        "karmadharaya-dvigu",
        level=2,
        title=("Karmadhāraya and dvigu", "कर्मधारय और द्विगु"),
        title_sa="कर्मधारयः द्विगुः च",
        summary=("An adjective + noun (नीलोत्पलम् “blue lotus”), or a number + noun (त्रिभुवनम् “the three worlds”).",
                 "विशेषण + संज्ञा (नीलोत्पलम् 'नीला कमल'), या संख्या + संज्ञा (त्रिभुवनम् 'तीनों लोक')।"),
        term=("कर्मधारयः", "describer + described in one word", "कर्मधारय — विशेषण और विशेष्य एक शब्द में"),
        blocks=[
            text("Two special tatpuruṣas. In a **karmadhāraya** the first word describes the second: {{नीलम् उत्पलम्}} "
                 "→ {{नीलोत्पलम्}}. It can also compare: {{घनश्यामः}} “dark as a rain-cloud”. When the first word is "
                 "a number, the compound is a **dvigu**: {{त्रिभुवनम्}}.",
                 "ये दो विशेष तत्पुरुष हैं। **कर्मधारय** में पहला शब्द दूसरे का विशेषण है: {{नीलम् उत्पलम्}} → "
                 "{{नीलोत्पलम्}}। यह उपमा भी दे सकता है: {{घनश्यामः}} 'मेघ जैसा साँवला'। पहला शब्द संख्या हो तो समास "
                 "**द्विगु** कहलाता है: {{त्रिभुवनम्}}।"),
            table(
                ("Describing and counting", "विशेषण और गिनती"),
                [("Compound", "समास"), ("Join or spelled out", "सन्धि या विग्रह"), ("Meaning", "अर्थ")],
                [
                    [cell("नीलोत्पलम्", snd("नील", "उत्पलम्")), cell("नीलम् उत्पलम्"), tc("blue lotus", "नीला कमल")],
                    [cell("महोत्सवः", snd("महा", "उत्सवः")), cell("महान् उत्सवः"), tc("great festival", "बड़ा उत्सव")],
                    [cell("परमेश्वरः", snd("परम", "ईश्वरः")), cell("परमः ईश्वरः"), tc("supreme lord", "परम ईश्वर")],
                    [cell("घनश्यामः", sub("घनश्याम")), cell("घनः इव श्यामः"), tc("dark as a cloud — Kṛṣṇa", "मेघ जैसा साँवला — कृष्ण")],
                    [cell("नरसिंहः", sub("नरसिंह")), cell("नरः सिंहः इव"), tc("man-lion", "नर जो सिंह जैसा है")],
                    [cell("त्रिभुवनम्", sub("त्रिभुवन", "Napumsaka")), cell("त्रयाणां भुवनानां समाहारः"), tc("the three worlds", "तीनों लोकों का समूह")],
                    [cell("पञ्चवटी", sub("पञ्चवटी", "Stri")), cell("पञ्चानां वटानां समाहारः"), tc("a grove of five banyans", "पाँच वटों का समूह")],
                ],
            ),
            examples(
                ex("त्रयाणां भुवनानाम्", "of the three worlds", "तीनों लोकों का",
                   w("त्रयाणां", "of three", "तीनों का", sub("त्रि", "Napumsaka", "Sasthi", "Bahu", form="त्रयाणाम्")),
                   w("भुवनानाम्", "of worlds", "लोकों का", sub("भुवन", "Napumsaka", "Sasthi", "Bahu"))),
            ),
            tip("Hindi is full of dvigus: नवरात्र “nine nights”, सप्तर्षि “seven sages”, त्रिलोक “three worlds”.",
                "हिन्दी द्विगु से भरी है: नवरात्र 'नौ रातें', सप्तर्षि 'सात ऋषि', त्रिलोक 'तीन लोक'।"),
            _REFERENCE,
        ],
        quiz=[
            q(("त्रिभुवनम् is a dvigu because…", "त्रिभुवनम् द्विगु है क्योंकि…"),
              [opt("its first word is a number", "इसका पहला शब्द संख्या है"), opt("it has two words", "इसमें दो शब्द हैं"),
               opt("it names a person", "यह किसी व्यक्ति का नाम है")],
              0,
              ("त्रि “three” + भुवन “world”.", "त्रि 'तीन' + भुवन 'लोक'।")),
        ],
        terms=("samasa", "visheshana"),
        feature_ids=("SAMASA-TATPURUSA",),
        related=("nan-upapada", "numbers-1-10"),
    ),
    topic(
        "nan-upapada",
        level=2,
        title=("“Not-X” and “X-maker”", "'अ-X' और 'X-कार'"),
        title_sa="नञ्-उपपदसमासौ",
        summary=("a-/an- means “not” (असत्यम्); a verb-ending last word makes a doer (कुम्भकारः “pot-maker”).",
                 "अ-/अन्- का अर्थ 'नहीं' (असत्यम्); अंतिम शब्द क्रिया से बना हो तो करने वाला बनता है (कुम्भकारः 'कुम्हार')।"),
        term=("नञ्", "the “not” in a- / an-", "नञ् — अ- / अन्- वाला 'नहीं'"),
        blocks=[
            text("Put **a-** before a consonant or **an-** before a vowel, and a word flips to its opposite: {{सत्यम्}} "
                 "→ {{असत्यम्}}, {{अन्तः}} → {{अनन्तः}}. Separately, a root at the end makes a “doer of X”: {{कुम्भकारः}} "
                 "is one who makes pots.",
                 "व्यंजन से पहले **अ-** या स्वर से पहले **अन्-** लगाइए, शब्द उल्टा हो जाता है: {{सत्यम्}} → {{असत्यम्}}, "
                 "{{अन्तः}} → {{अनन्तः}}। अलग से, अंत में धातु हो तो 'X करने वाला' बनता है: {{कुम्भकारः}} यानी घड़े बनाने वाला।"),
            table(
                ("Not-X", "नञ् समास"),
                [("Word", "शब्द"), ("Opposite", "विलोम"), ("Meaning", "अर्थ")],
                [
                    [cell("सत्यम्", sub("सत्य", "Napumsaka")), cell("असत्यम्", sub("असत्य", "Napumsaka")), tc("untruth", "झूठ")],
                    [cell("ज्ञानम्", sub("ज्ञान", "Napumsaka")), cell("अज्ञानम्", sub("अज्ञान", "Napumsaka")), tc("ignorance", "अज्ञान")],
                    [cell("अन्तः", sub("अन्त")), cell("अनन्तः", sub("अनन्त")), tc("endless", "जिसका अंत न हो")],
                ],
            ),
            table(
                ("X-maker, X-born, X-knower", "X-कार, X-ज, X-ज्ञ"),
                [("Compound", "समास"), ("Spelled out", "विग्रह"), ("Meaning", "अर्थ")],
                [
                    [cell("कुम्भकारः", sub("कुम्भकार")), cell("कुम्भं करोति इति"), tc("pot-maker, potter", "कुम्हार")],
                    [cell("जलजम्", sub("जलज", "Napumsaka")), cell("जले जायते इति"), tc("water-born — a lotus", "जल में जन्मा — कमल")],
                    [cell("पङ्कजम्", sub("पङ्कज", "Napumsaka")), cell("पङ्के जायते इति"), tc("mud-born — a lotus", "कीचड़ में जन्मा — कमल")],
                    [cell("सर्वज्ञः", sub("सर्वज्ञ")), cell("सर्वं जानाति इति"), tc("all-knowing", "सब जानने वाला")],
                ],
            ),
            examples(
                ex("कुम्भं करोति", "makes a pot", "घड़ा बनाता है",
                   w("कुम्भं", "pot", "घड़ा", sub("कुम्भ", "Pum", "Dvitiya", form="कुम्भम्")),
                   w("करोति", "makes", "बनाता है", tin("कृ"))),
            ),
            _REFERENCE,
        ],
        quiz=[
            q(("“Not-end”, endless:", "'जिसका अंत न हो':"),
              [opt_sa("अनन्तः", sub("अनन्त")), opt_sa("अअन्तः"), opt_sa("नान्तः")],
              0,
              ("Before a vowel, “not” is an-: अन् + अन्तः.", "स्वर से पहले 'नहीं' = अन्-: अन् + अन्तः।")),
        ],
        terms=("samasa",),
        feature_ids=("SAMASA-TATPURUSA",),
        related=("bahuvrihi", "na-ma"),
    ),
    topic(
        "bahuvrihi",
        level=1,
        title=("Bahuvrīhi: “the one who has…”", "बहुव्रीहि: 'जिसका/जिसके…'"),
        title_sa="बहुव्रीहिः",
        summary=("A bahuvrīhi describes someone else: नीलकण्ठः is not a blue throat but the one who has one — Śiva.",
                 "बहुव्रीहि किसी तीसरे का वर्णन करता है: नीलकण्ठः नीला गला नहीं, बल्कि नीले गले वाला — शिव।"),
        term=("बहुव्रीहिः", "“much-rice” — one who has much rice", "बहुव्रीहि — 'बहुत धान वाला'"),
        blocks=[
            text("The name itself is an example: {{बहुव्रीहिः}} “much rice” means a man **who has** much rice. Neither "
                 "word is the thing described. Spell it out with {{यस्य}} “whose”: {{पीतम् अम्बरं यस्य सः}} “he whose "
                 "garment is yellow”.",
                 "नाम खुद उदाहरण है: {{बहुव्रीहिः}} 'बहुत धान' यानी वह व्यक्ति **जिसके पास** बहुत धान है। कोई भी शब्द "
                 "वर्णित वस्तु नहीं है। विग्रह {{यस्य}} 'जिसका' से कीजिए: {{पीतम् अम्बरं यस्य सः}} 'पीला है वस्त्र जिसका, वह'।"),
            table(
                ("Names of gods are bahuvrīhis", "देवताओं के नाम बहुव्रीहि हैं"),
                [("Name", "नाम"), ("Join", "सन्धि"), ("The one who…", "वह जिसका…")],
                [
                    [cell("पीताम्बरः", sub("पीताम्बर")), cell("पीत + अम्बरः", snd("पीत", "अम्बरः", joined="पीताम्बरः")),
                     tc("wears yellow — Kṛṣṇa", "पीला वस्त्र — कृष्ण")],
                    [cell("नीलकण्ठः", sub("नीलकण्ठ")), cell("नील + कण्ठः"), tc("has a blue throat — Śiva", "नीला कण्ठ — शिव")],
                    [cell("लम्बोदरः", sub("लम्बोदर")), cell("लम्ब + उदरः", snd("लम्ब", "उदरः", joined="लम्बोदरः")),
                     tc("has a big belly — Gaṇeśa", "बड़ा उदर — गणेश")],
                    [cell("दशाननः", sub("दशानन")), cell("दश + आननः", snd("दश", "आननः", joined="दशाननः")),
                     tc("has ten faces — Rāvaṇa", "दस मुख — रावण")],
                    [cell("चक्रपाणिः", sub("चक्रपाणि")), cell("चक्र + पाणिः"), tc("holds a discus — Viṣṇu", "हाथ में चक्र — विष्णु")],
                    [cell("महात्मा", sub("महात्मन्")), cell("महा + आत्मा", snd("महा", "आत्मा", joined="महात्मा")),
                     tc("has a great soul", "महान आत्मा")],
                ],
            ),
            examples(
                ex("पीतम् अम्बरं यस्य सः", "he whose garment is yellow", "पीला है वस्त्र जिसका, वह",
                   w("पीतम्", "yellow", "पीला", sub("पीत", "Napumsaka")),
                   w("अम्बरं", "garment", "वस्त्र", sub("अम्बर", "Napumsaka", form="अम्बरम्")),
                   w("यस्य", "whose", "जिसका", sub("यद्", "Pum", "Sasthi")),
                   w("सः", "he", "वह", sub("तद्"))),
            ),
            watch("The same letters can be two compounds. {{नीलकण्ठः}} “a blue throat” is a karmadhāraya; as Śiva, "
                  "“the one with a blue throat”, it is a bahuvrīhi.",
                  "एक ही शब्द दो समास हो सकता है। {{नीलकण्ठः}} 'नीला गला' कर्मधारय है; शिव के अर्थ में, 'नीले गले वाले', "
                  "बहुव्रीहि।"),
            _REFERENCE,
        ],
        quiz=[
            q(("दशाननः means…", "दशाननः का अर्थ है…"),
              [opt("the one with ten faces", "दस मुख वाला"), opt("ten faces", "दस मुख"), opt("the tenth face", "दसवाँ मुख")],
              0,
              ("A bahuvrīhi points to someone else — Rāvaṇa.", "बहुव्रीहि किसी और की ओर इशारा करता है — रावण।")),
        ],
        terms=("samasa",),
        feature_ids=("SAMASA-BAHUVRIHI",),
        related=("avyayibhava", "relative-clauses"),
    ),
    topic(
        "avyayibhava",
        level=2,
        title=("Avyayībhāva: compound adverbs", "अव्ययीभाव: क्रिया-विशेषण समास"),
        title_sa="अव्ययीभावः",
        summary=("A small word like यथा or प्रति + a noun makes an adverb that never changes: यथाशक्ति, प्रतिदिनम्.",
                 "यथा या प्रति जैसा छोटा शब्द + संज्ञा मिलकर न बदलने वाला क्रिया-विशेषण बनाते हैं: यथाशक्ति, प्रतिदिनम्।"),
        term=("अव्ययीभावः", "a compound that becomes an indeclinable", "अव्ययीभाव — अव्यय बन जाने वाला समास"),
        blocks=[
            text("Here the **first** word leads, and it is an indeclinable: {{यथा}} “according to”, {{प्रति}} “every”, "
                 "{{निर्}} “without”. The whole compound becomes an adverb and never changes again.",
                 "यहाँ **पहला** शब्द प्रधान है, और वह अव्यय है: {{यथा}} 'के अनुसार', {{प्रति}} 'हर', {{निर्}} 'बिना'। पूरा "
                 "समास क्रिया-विशेषण बन जाता है और फिर कभी नहीं बदलता।"),
            table(
                ("Everyday adverb compounds", "रोज़ के अव्ययीभाव"),
                [("Compound", "समास"), ("Built from", "किससे बना"), ("Meaning", "अर्थ")],
                [
                    [cell("यथाशक्ति"), cell("यथा + शक्तिम्", sub("शक्ति", "Stri", "Dvitiya", form="शक्तिम्")),
                     tc("as far as one can", "शक्ति के अनुसार")],
                    [cell("प्रतिदिनम्"), cell("प्रति + दिनम्", sub("दिन", "Napumsaka", "Dvitiya", form="दिनम्")),
                     tc("every day", "हर दिन")],
                    [cell("यथासमयम्"), cell("यथा + समयम्"), tc("on time", "समय के अनुसार")],
                    [cell("निर्विघ्नम्"), cell("निर् + विघ्नम्"), tc("without obstacles", "बिना बाधा के")],
                    [cell("आजीवनम्"), cell("आ + जीवनम्"), tc("lifelong", "जीवन भर")],
                ],
            ),
            tip("Hindi uses these as they are: प्रतिदिन, यथाशक्ति, आजीवन, यथासंभव.",
                "हिन्दी इन्हें जैसे-के-तैसे प्रयोग करती है: प्रतिदिन, यथाशक्ति, आजीवन, यथासंभव।"),
            _REFERENCE,
        ],
        quiz=[
            q(("Which word is an avyayībhāva?", "कौन-सा शब्द अव्ययीभाव है?"),
              [opt_sa("प्रतिदिनम्"), opt_sa("राजपुरुषः", sub("राजपुरुष")), opt_sa("नीलकण्ठः", sub("नीलकण्ठ"))],
              0,
              ("प्रति leads and the whole word never changes.", "प्रति प्रधान है और पूरा शब्द कभी नहीं बदलता।")),
        ],
        terms=("samasa", "avyaya"),
        feature_ids=("SAMASA-AVYAYIBHAVA",),
        related=("long-compounds", "indeclinables"),
    ),
    topic(
        "long-compounds",
        level=3,
        title=("Reading long compounds", "लम्बे समास पढ़ना"),
        title_sa="दीर्घसमासाः",
        summary=("Undo the sandhi, find the last word, then work leftwards one pair at a time.",
                 "सन्धि खोलिए, अंतिम शब्द खोजिए, फिर एक-एक जोड़ी करके बाईं ओर चलिए।"),
        term=("विग्रहः", "spelling a compound out", "विग्रह — समास को खोलना"),
        blocks=[
            steps(
                ("Undo the joins so each piece stands alone.", "सन्धि खोलिए ताकि हर टुकड़ा अलग दिखे।"),
                ("Start from the last word — it carries the ending and usually the main idea.",
                 "अंतिम शब्द से शुरू कीजिए — विभक्ति उसी पर है और प्रायः मुख्य भाव भी।"),
                ("Attach the word before it, decide the relation (of, and, having…), and repeat leftwards.",
                 "उससे पहले का शब्द जोड़िए, सम्बन्ध तय कीजिए ('का', 'और', 'वाला'…), और बाईं ओर दोहराइए।"),
            ),
            table(
                ("श्रीमद्भगवद्गीता, piece by piece", "श्रीमद्भगवद्गीता, टुकड़ा-टुकड़ा"),
                [("Step", "चरण"), ("Sanskrit", "संस्कृत"), ("Meaning", "अर्थ")],
                [
                    [tc("the joins", "सन्धियाँ"), cell("श्रीमत् + भगवत्", snd("श्रीमत्", "भगवत्", joined="श्रीमद्भगवत्")),
                     tc("t → d before bh", "भ से पहले त् → द्")],
                    [tc("last word", "अंतिम शब्द"), cell("गीता", krd("गै", "kta", linga="Stri", vibhakti="Prathama", vacana="Eka")),
                     tc("song — “what is sung”", "गीत — 'जो गाया गया'")],
                    [tc("add one", "एक जोड़िए"), cell("भगवद्गीता", snd("भगवत्", "गीता")), tc("the Lord's song", "भगवान का गीत")],
                    [tc("add one more", "एक और"), cell("श्रीमद्भगवद्गीता", sub("श्रीमद्भगवद्गीता", "Stri")),
                     tc("the glorious Lord's song", "श्रीमान भगवान का गीत")],
                ],
            ),
            wild(
                ex("धर्मक्षेत्रे कुरुक्षेत्रे", "On the field of dharma, the field of the Kurus.", "धर्म के क्षेत्र में, कुरुओं के क्षेत्र में।",
                   w("धर्मक्षेत्रे", "in the field of dharma", "धर्मक्षेत्र में", sub("धर्मक्षेत्र", "Napumsaka", "Saptami")),
                   w("कुरुक्षेत्रे", "in the field of the Kurus", "कुरुक्षेत्र में", sub("कुरुक्षेत्र", "Napumsaka", "Saptami")),
                   source=src("Bhagavad Gītā 1.1", "भगवद्गीता 1.1")),
                ex("नभःस्पृशं दीप्तम्", "Touching the sky, blazing.", "आकाश को छूता हुआ, दीप्त।",
                   w("नभःस्पृशं", "sky-touching — नभः + स्पृशम्", "आकाश-स्पर्शी — नभः + स्पृशम्",
                     snd("नभः", "स्पृशम्", joined="नभःस्पृशम्")),
                   source=src("Bhagavad Gītā 11.24 · motto of the Indian Air Force", "भगवद्गीता 11.24 · भारतीय वायुसेना का आदर्श-वाक्य")),
            ),
            _REFERENCE,
        ],
        deeper=[
            go_deeper(
                ("Why Sanskrit loves long compounds", "संस्कृत को लम्बे समास क्यों प्रिय हैं"),
                text("Classical prose writers such as Bāṇa built compounds of a dozen words or more; one word could hold "
                     "a whole description. Poets used them for sound and density, and commentators then spent pages "
                     "spelling them out. Modern official Hindi still coins them: {{राष्ट्रपतिभवनम्}}.",
                     "बाण जैसे शास्त्रीय गद्यकारों ने दर्जन-भर या उससे अधिक शब्दों के समास रचे; एक शब्द में पूरा वर्णन समा "
                     "जाता था। कवियों ने ध्वनि और सघनता के लिए इन्हें अपनाया, और टीकाकारों ने इन्हें खोलने में पन्ने भरे। "
                     "आधुनिक सरकारी हिन्दी आज भी ऐसे शब्द गढ़ती है: {{राष्ट्रपतिभवनम्}}।"),
                examples(
                    ex("राष्ट्रपतिभवनम्", "the President's house", "राष्ट्रपति का भवन",
                       check=sub("राष्ट्रपतिभवन", "Napumsaka")),
                ),
                level=3,
            ),
        ],
        quiz=[
            q(("Where do you start reading a long compound?", "लम्बा समास पढ़ना कहाँ से शुरू करें?"),
              [opt("From the last word", "अंतिम शब्द से"), opt("From the first word", "पहले शब्द से"),
               opt("From the longest word", "सबसे लम्बे शब्द से")],
              0,
              ("The last word carries the ending and the main idea.", "अंतिम शब्द पर विभक्ति और मुख्य भाव होता है।")),
        ],
        terms=("samasa", "sandhi"),
        feature_ids=("SAMASA-TATPURUSA",),
        related=("compounds-intro", "sandhi-splitting"),
    ),
]
