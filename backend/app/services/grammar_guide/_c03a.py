"""Chapter 3 · The 8 cases, part A — overview, nominative/vocative, accusative,
instrumental, dative. Assembled in ``c03_cases``."""

from __future__ import annotations

from ._cases_common import case_forms_table as _forms
from .model import (
    analogy, cell, ex, examples, go_deeper, opt, opt_sa, proof, q, snd, src, sub,
    table, tad, tc, text, tin, tip, topic, w, watch, wild,
)


TOPICS_A = [
    topic(
        "cases-overview",
        level=1,
        title=("The 8 cases at a glance", "आठों विभक्तियाँ एक नज़र में"),
        title_sa="विभक्तयः",
        summary=("Eight sets of endings tell you a noun's job: doer, object, tool, receiver, source, owner, place — and the call.",
                 "आठ विभक्तियाँ संज्ञा का काम बताती हैं: कर्ता, कर्म, साधन, पाने वाला, जहाँ से अलग हो, सम्बन्ध, स्थान — और पुकार।"),
        term=("विभक्तिः", "case — the ending that shows a word's job", "विभक्ति — शब्द का काम बताने वाला अंत"),
        minutes=4,
        blocks=[
            text("Sanskrit has eight cases. Each is a set of endings that answers one question about a "
                 "noun: who? whom? with what? for whom? from where? whose? where? — plus a form for "
                 "calling out. Textbooks number them first to seventh, with the vocative added.",
                 "संस्कृत में आठ विभक्तियाँ हैं। हर विभक्ति संज्ञा के बारे में एक प्रश्न का उत्तर देती है: कौन? "
                 "किसको? किससे? किसके लिए? कहाँ से? किसका? कहाँ? — और एक रूप पुकारने के लिए। पाठ्यपुस्तकें "
                 "इन्हें प्रथमा से सप्तमी तक गिनती हैं, साथ में सम्बोधन।"),
            table(
                ("The eight cases of राम", "राम शब्द की आठ विभक्तियाँ"),
                [("Case", "विभक्ति"), ("Question", "प्रश्न"), ("Form", "रूप"), ("Meaning", "अर्थ")],
                [
                    [tc("1 · nominative", "प्रथमा"), tc("who does it?", "कौन?"),
                     cell("रामः", sub("राम")), tc("Rāma (does)", "राम (करता है)")],
                    [tc("2 · accusative", "द्वितीया"), tc("whom? where to?", "किसको? कहाँ?"),
                     cell("रामम्", sub("राम", "Pum", "Dvitiya")), tc("Rāma, as the object", "राम को")],
                    [tc("3 · instrumental", "तृतीया"), tc("with or by what?", "किससे? किसके द्वारा?"),
                     cell("रामेण", sub("राम", "Pum", "Trtiya")), tc("by, with Rāma", "राम से, राम के द्वारा")],
                    [tc("4 · dative", "चतुर्थी"), tc("for whom?", "किसके लिए?"),
                     cell("रामाय", sub("राम", "Pum", "Caturthi")), tc("for, to Rāma", "राम के लिए")],
                    [tc("5 · ablative", "पञ्चमी"), tc("from where?", "कहाँ से?"),
                     cell("रामात्", sub("राम", "Pum", "Panchami")), tc("from Rāma", "राम से (अलग होना)")],
                    [tc("6 · genitive", "षष्ठी"), tc("whose?", "किसका?"),
                     cell("रामस्य", sub("राम", "Pum", "Sasthi")), tc("Rāma's", "राम का")],
                    [tc("7 · locative", "सप्तमी"), tc("where? in or on what?", "कहाँ? किसमें?"),
                     cell("रामे", sub("राम", "Pum", "Saptami")), tc("in, on Rāma", "राम में, राम पर")],
                    [tc("vocative", "सम्बोधन"), tc("calling out", "पुकार"),
                     cell("राम", sub("राम", "Pum", "Sambodhana")), tc("O Rāma!", "हे राम!")],
                ],
                stem="राम",
            ),
            analogy("English puts little words in front: to, with, for, from, of, in. Sanskrit moves them "
                    "to the end of the noun and fuses them in.",
                    "हिन्दी के परसर्ग याद कीजिए — ने, को, से, के लिए, का, में, हे। संस्कृत में ये अलग शब्द नहीं, "
                    "संज्ञा के अंत में ही जुड़े रहते हैं।"),
            examples(
                ex("रामः ग्रामात् वनं गच्छति", "Rāma goes from the village to the forest.", "राम गाँव से वन जाता है।",
                   w("रामः", "Rāma — the doer (1st)", "राम — कर्ता (प्रथमा)", sub("राम")),
                   w("ग्रामात्", "from the village (5th)", "गाँव से (पञ्चमी)", sub("ग्राम", "Pum", "Panchami")),
                   w("वनं", "to the forest (2nd)", "वन को (द्वितीया)", sub("वन", "Napumsaka", "Dvitiya")),
                   w("गच्छति", "goes", "जाता है", tin("गम्"))),
                title=("One sentence, three cases", "एक वाक्य, तीन विभक्तियाँ"),
            ),
            tip("Don't learn eight new ideas at once. The nominative and accusative carry most "
                "sentences; learn those first, then add one case at a time.",
                "आठ नई बातें एक साथ मत सीखिए। ज़्यादातर वाक्य प्रथमा और द्वितीया से चलते हैं; पहले उन्हें "
                "सीखिए, फिर एक-एक करके बाकी।"),
            wild(
                ex("श्रीगणेशाय नमः", "Salutation to Śrī Gaṇeśa — the 4th case, “to”", "श्री गणेश को नमस्कार — चतुर्थी",
                   source=src("Opening line of countless books and letters", "अनगिनत पुस्तकों और पत्रों की पहली पंक्ति"),
                   check=sub("श्रीगणेश", "Pum", "Caturthi", form="श्रीगणेशाय")),
            ),
        ],
        deeper=[
            go_deeper(
                ("Numbers, not names", "नाम नहीं, क्रमांक"),
                text("Pāṇini never called the cases “accusative” or “dative”. He numbered them — "
                     "{{प्रथमा}}, {{द्वितीया}}, {{तृतीया}} and so on — and described their meanings through "
                     "a separate system of roles, kāraka, which has its own topic in this chapter.",
                     "पाणिनि ने विभक्तियों को 'कर्म' या 'सम्प्रदान' जैसे नाम नहीं दिए। उन्होंने क्रमांक दिए — "
                     "{{प्रथमा}}, {{द्वितीया}}, {{तृतीया}} आदि — और उनके अर्थ एक अलग व्यवस्था से बताए: कारक, "
                     "जिसका अपना पाठ इसी अध्याय में है।"),
            ),
        ],
        quiz=[
            q(("Which form means “for Rāma”?", "'राम के लिए' कौन-सा रूप है?"),
              [opt_sa("रामाय", sub("राम", "Pum", "Caturthi")), opt_sa("रामस्य", sub("राम", "Pum", "Sasthi")),
               opt_sa("रामेण", sub("राम", "Pum", "Trtiya"))],
              0,
              ("-āya is the 4th case: for, to.", "-आय चतुर्थी है: के लिए, को।")),
            q(("In {{रामः ग्रामात् वनं गच्छति}}, where does Rāma set out from?",
               "{{रामः ग्रामात् वनं गच्छति}} में राम कहाँ से चलता है?"),
              [opt("the village", "गाँव से"), opt("the forest", "वन से"), opt("his house", "अपने घर से")],
              0,
              ("{{ग्रामात्}} is the 5th case, “from”.", "{{ग्रामात्}} पञ्चमी है — 'से (अलग होना)'।")),
        ],
        proofs=[
            proof("paradigm", ("See राम in all 24 forms", "राम के सभी 24 रूप देखिए"), pratipadika="राम", linga="Pum"),
        ],
        terms=("vibhakti", "karaka"),
        feature_ids=("NOM.SG", "ACC.SG", "INSTR.SG", "DAT.SG", "ABL.SG", "GEN.SG", "LOC.SG", "VOC.SG"),
        related=("nominative-vocative", "karaka"),
    ),
    topic(
        "nominative-vocative",
        level=1,
        title=("Nominative & vocative: the doer and the call", "प्रथमा और सम्बोधन: कर्ता और पुकार"),
        title_sa="प्रथमा सम्बोधनं च",
        summary=("The 1st case names who does the action; the vocative calls someone by name.",
                 "प्रथमा बताती है कि काम कौन कर रहा है; सम्बोधन किसी को नाम से पुकारता है।"),
        term=("प्रथमा", "the first case — the doer", "प्रथमा विभक्ति — कर्ता"),
        blocks=[
            text("The nominative is the subject of an active sentence, and the name of a thing on its "
                 "own. The vocative is what you call across a room: “Rāma!”. For a-words it is simply "
                 "the bare stem.",
                 "प्रथमा सक्रिय वाक्य का कर्ता है, और अकेले किसी वस्तु का नाम भी। सम्बोधन वह रूप है जिससे हम "
                 "किसी को पुकारते हैं: 'हे राम!'। अ-अंत वाले शब्दों में यह बस मूल शब्द ही होता है।"),
            table(
                ("Nominative and vocative", "प्रथमा और सम्बोधन"),
                [("Word", "शब्द"), ("Nominative", "प्रथमा"), ("Vocative", "सम्बोधन")],
                [
                    [tc("Rāma", "राम"), cell("रामः", sub("राम")), cell("राम", sub("राम", "Pum", "Sambodhana"))],
                    [tc("Sītā", "सीता"), cell("सीता", sub("सीता", "Stri")),
                     cell("सीते", sub("सीता", "Stri", "Sambodhana"))],
                    [tc("Hari", "हरि"), cell("हरिः", sub("हरि")), cell("हरे", sub("हरि", "Pum", "Sambodhana"))],
                    [tc("guru, teacher", "गुरु"), cell("गुरुः", sub("गुरु")), cell("गुरो", sub("गुरु", "Pum", "Sambodhana"))],
                ],
            ),
            examples(
                ex("रामः वनं गच्छति", "Rāma goes to the forest.", "राम वन जाता है।",
                   w("रामः", "Rāma — the doer", "राम — कर्ता", sub("राम")),
                   w("वनं", "to the forest", "वन को", sub("वन", "Napumsaka", "Dvitiya")),
                   w("गच्छति", "goes", "जाता है", tin("गम्"))),
                ex("हे कृष्ण, अत्र आगच्छ", "O Kṛṣṇa, come here!", "हे कृष्ण, यहाँ आओ!",
                   w("कृष्ण", "O Kṛṣṇa — vocative", "हे कृष्ण — सम्बोधन", sub("कृष्ण", "Pum", "Sambodhana")),
                   w("अत्र", "here", "यहाँ"),
                   w("आगच्छ", "come!", "आओ", tin("गम्", "Lot", "Madhyama", prefixes=["आ"]))),
            ),
            tip("“This is a book” needs no verb in Sanskrit — just two nominatives: {{एतत् पुस्तकम्}}.",
                "'यह पुस्तक है' के लिए संस्कृत में क्रिया नहीं चाहिए — बस दो प्रथमा: {{एतत् पुस्तकम्}}।"),
            watch("Neuter nouns look the same in the nominative and accusative: {{फलम्}} can be the doer "
                  "or the thing acted on. The rest of the sentence decides.",
                  "नपुंसकलिंग में प्रथमा और द्वितीया एक-से दिखते हैं: {{फलम्}} कर्ता भी हो सकता है और कर्म भी। "
                  "बाकी वाक्य से तय होता है।"),
            wild(
                ex("वयं रक्षामः", "We protect.", "हम रक्षा करते हैं।",
                   w("वयं", "we — nominative", "हम — प्रथमा", sub("अस्मद्", "Pum", "Prathama", "Bahu")),
                   w("रक्षामः", "protect", "रक्षा करते हैं", tin("रक्ष्", "Lat", "Uttama", "Bahu")),
                   source=src("Motto of the Indian Coast Guard", "भारतीय तटरक्षक बल का आदर्श-वाक्य")),
            ),
        ],
        deeper=[
            go_deeper(
                ("The nominative in passive sentences", "कर्मवाच्य में प्रथमा"),
                text("In a passive sentence the thing acted on moves into the nominative: {{रामेण पुस्तकं "
                     "पठ्यते}} “the book is read by Rāma”. The nominative marks what the verb agrees with, "
                     "which is not always the doer.",
                     "कर्मवाच्य में कर्म प्रथमा में आ जाता है: {{रामेण पुस्तकं पठ्यते}} 'राम द्वारा पुस्तक पढ़ी "
                     "जाती है'। प्रथमा वह बताती है जिससे क्रिया मेल खाती है — वह हर बार कर्ता नहीं होता।"),
            ),
        ],
        quiz=[
            q(("How do you call out to Sītā?", "सीता को कैसे पुकारेंगे?"),
              [opt_sa("हे सीते"), opt_sa("हे सीता"), opt_sa("हे सीतायाः")],
              0,
              ("ā-feminines end in -e when you call: {{सीते}}.", "आ-अंत स्त्रीलिंग शब्द सम्बोधन में -ए पर खत्म होते हैं: {{सीते}}।")),
        ],
        proofs=[
            proof("derive", ("Watch रामः being built", "रामः बनते हुए देखिए"),
                  pratipadika="राम", linga="Pum", vibhakti="Prathama", vacana="Eka"),
        ],
        terms=("vibhakti", "sambodhana"),
        feature_ids=("NOM.SG", "VOC.SG"),
        related=("accusative",),
    ),
    topic(
        "accusative",
        level=1,
        title=("Accusative: the object and the goal", "द्वितीया: कर्म और गंतव्य"),
        title_sa="द्वितीया",
        summary=("The 2nd case marks what the action is done to, and where you are going.",
                 "द्वितीया बताती है कि क्रिया किस पर हो रही है, और आप कहाँ जा रहे हैं।"),
        term=("द्वितीया", "the second case — the object", "द्वितीया विभक्ति — कर्म"),
        blocks=[
            text("The accusative marks the direct object — the thing eaten, seen or read — and the "
                 "destination after verbs of motion: {{ग्रामं गच्छति}} “goes to the village”. For "
                 "a-words the singular ending is -m.",
                 "द्वितीया प्रत्यक्ष कर्म बताती है — जो खाया, देखा या पढ़ा जाए — और गति वाली क्रियाओं के बाद "
                 "गंतव्य भी: {{ग्रामं गच्छति}} 'गाँव जाता है'। अ-शब्दों में एकवचन का अंत -म् है।"),
            _forms("Dvitiya", ("Accusative forms", "द्वितीया के रूप")),
            examples(
                ex("सः ग्रामं गच्छति", "He goes to the village.", "वह गाँव जाता है।",
                   w("सः", "he", "वह", sub("तद्")),
                   w("ग्रामं", "to the village — the goal", "गाँव को — गंतव्य", sub("ग्राम", "Pum", "Dvitiya")),
                   w("गच्छति", "goes", "जाता है", tin("गम्"))),
                ex("रामः सीतां पश्यति", "Rāma sees Sītā.", "राम सीता को देखता है।",
                   w("रामः", "Rāma", "राम", sub("राम")),
                   w("सीतां", "Sītā — the object", "सीता को — कर्म", sub("सीता", "Stri", "Dvitiya")),
                   w("पश्यति", "sees", "देखता है", tin("दृश्"))),
            ),
            watch("In Hindi the object sometimes takes “ko” and sometimes doesn't. In Sanskrit the "
                  "object always takes the accusative ending.",
                  "हिन्दी में कर्म के साथ कभी 'को' लगता है, कभी नहीं: 'राम फल खाता है' में 'को' नहीं है। "
                  "संस्कृत में कर्म हमेशा द्वितीया में ही आता है।"),
            tip("Some words always call for the accusative: {{ग्रामं परितः}} “all around the village”. "
                "See the topic on words that demand a case.",
                "कुछ शब्दों के साथ हमेशा द्वितीया आती है: {{ग्रामं परितः}} 'गाँव के चारों ओर'। 'उपपद विभक्ति' "
                "वाला पाठ देखिए।"),
            wild(
                ex("योगक्षेमं वहाम्यहम्", "I carry their welfare.", "मैं उनका योग-क्षेम वहन करता हूँ।",
                   w("योगक्षेमं", "welfare — the object", "योग-क्षेम — कर्म", sub("योगक्षेम", "Napumsaka", "Dvitiya")),
                   w("वहाम्यहम्", "I carry", "मैं वहन करता हूँ"),
                   source=src("Bhagavad Gītā 9.22 · motto of LIC", "भगवद्गीता 9.22 · एलआईसी का आदर्श-वाक्य"),
                   check=snd("वहामि", "अहम्", joined="वहाम्यहम्")),
            ),
        ],
        deeper=[
            go_deeper(
                ("Verbs with two objects", "दो कर्म वाली क्रियाएँ"),
                text("A few verbs take two accusatives, a person and a thing: {{शिष्यं धर्मं ब्रूते}} "
                     "“tells the pupil about dharma”. Pāṇini groups these verbs in a single rule (1.4.51).",
                     "कुछ क्रियाओं के साथ दो कर्म आते हैं — व्यक्ति और वस्तु: {{शिष्यं धर्मं ब्रूते}} 'शिष्य को "
                     "धर्म बताता है'। पाणिनि ने ऐसी क्रियाएँ एक ही नियम (1.4.51) में गिनाई हैं।"),
            ),
        ],
        quiz=[
            q(("Fill the gap: {{बालकः ___ पठति}} “the boy reads a book”.",
               "रिक्त स्थान भरिए: {{बालकः ___ पठति}} 'बालक पुस्तक पढ़ता है'।"),
              [opt_sa("पुस्तकम्", sub("पुस्तक", "Napumsaka", "Dvitiya")),
               opt_sa("पुस्तकेन", sub("पुस्तक", "Napumsaka", "Trtiya")),
               opt_sa("पुस्तकस्य", sub("पुस्तक", "Napumsaka", "Sasthi"))],
              0,
              ("The thing read is the object: 2nd case.", "जो पढ़ा जा रहा है वह कर्म है: द्वितीया।")),
        ],
        terms=("vibhakti",),
        feature_ids=("ACC.SG", "ACC.DU", "ACC.PL"),
        related=("instrumental", "upapada"),
    ),
    topic(
        "instrumental",
        level=1,
        title=("Instrumental: with and by", "तृतीया: से और के द्वारा"),
        title_sa="तृतीया",
        summary=("The 3rd case marks the tool, the means, the companion — and the doer of a passive sentence.",
                 "तृतीया साधन, माध्यम, साथी — और कर्मवाच्य का कर्ता — बताती है।"),
        term=("तृतीया", "the third case — by, with", "तृतीया विभक्ति — से, के द्वारा"),
        blocks=[
            text("Use the instrumental for what you do something with — a pen, a bus, your hand — and, "
                 "with {{सह}}, for who you are with. For a-words it ends in -ena: {{हस्तेन}} “with "
                 "the hand”.",
                 "जिस साधन से काम हो — कलम, बस, हाथ — उसके लिए तृतीया आती है; और {{सह}} के साथ, जिसके साथ "
                 "आप हों उसके लिए भी। अ-शब्दों में इसका अंत -एन है: {{हस्तेन}} 'हाथ से'।"),
            _forms("Trtiya", ("Instrumental forms", "तृतीया के रूप")),
            examples(
                ex("रामः बाणेन रावणं हन्ति", "Rāma strikes Rāvaṇa with an arrow.", "राम बाण से रावण को मारता है।",
                   w("बाणेन", "with an arrow — the tool", "बाण से — साधन", sub("बाण", "Pum", "Trtiya")),
                   w("रावणं", "Rāvaṇa — the object", "रावण को — कर्म", sub("रावण", "Pum", "Dvitiya")),
                   w("हन्ति", "strikes", "मारता है", tin("हन्"))),
                ex("रामः लक्ष्मणेन सह वनं गच्छति", "Rāma goes to the forest with Lakṣmaṇa.",
                   "राम लक्ष्मण के साथ वन जाता है।",
                   w("लक्ष्मणेन", "Lakṣmaṇa — 3rd case with सह", "लक्ष्मण — सह के साथ तृतीया",
                     sub("लक्ष्मण", "Pum", "Trtiya")),
                   w("सह", "together with", "साथ")),
            ),
            tip("{{सह}} “together with” always takes the instrumental: {{पित्रा सह}} “with father”.",
                "{{सह}} 'साथ' के साथ हमेशा तृतीया आती है: {{पित्रा सह}} 'पिता के साथ'।"),
            watch("“By” also marks the doer of a passive sentence: {{रामेण पुस्तकं पठ्यते}} “the book is "
                  "read by Rāma”.",
                  "कर्मवाच्य में कर्ता भी तृतीया में आता है: {{रामेण पुस्तकं पठ्यते}} 'राम द्वारा पुस्तक पढ़ी जाती है'।"),
            wild(
                ex("विद्ययाऽमृतमश्नुते", "Through knowledge one attains immortality.",
                   "विद्या से अमृत (अमरत्व) प्राप्त होता है।",
                   w("विद्यया", "through knowledge — 3rd case", "विद्या से — तृतीया", sub("विद्या", "Stri", "Trtiya")),
                   w("अमृतम्", "immortality", "अमृत", sub("अमृत", "Napumsaka", "Dvitiya")),
                   w("अश्नुते", "attains", "प्राप्त करता है", tin("अश्")),
                   source=src("Īśa Upaniṣad 11 · motto of NCERT", "ईशोपनिषद् 11 · एनसीईआरटी का आदर्श-वाक्य")),
            ),
        ],
        deeper=[
            go_deeper(
                ("Cause and manner", "कारण और ढंग"),
                text("The instrumental can also give a reason or a manner: {{दुःखेन}} “out of sorrow”, "
                     "{{सुखेन}} “comfortably”, {{कष्टेन}} “with difficulty”. Many such forms work like adverbs.",
                     "तृतीया कारण या ढंग भी बताती है: {{दुःखेन}} 'दुःख से', {{सुखेन}} 'आराम से', {{कष्टेन}} "
                     "'कठिनाई से'। ऐसे कई रूप क्रिया-विशेषण की तरह काम करते हैं।"),
            ),
        ],
        quiz=[
            q(("“He goes by bus” ({{लोकयानम्}} = bus). Which form fits?",
               "'वह बस से जाता है' ({{लोकयानम्}} = बस)। कौन-सा रूप आएगा?"),
              [opt_sa("लोकयानेन", sub("लोकयान", "Napumsaka", "Trtiya")),
               opt_sa("लोकयानाय", sub("लोकयान", "Napumsaka", "Caturthi")),
               opt_sa("लोकयाने", sub("लोकयान", "Napumsaka", "Saptami"))],
              0,
              ("The means of travel is a tool: 3rd case.", "यात्रा का साधन भी साधन है: तृतीया।")),
        ],
        proofs=[
            proof("derive", ("See why it is रामेण, not रामेन", "देखिए रामेण क्यों, रामेन क्यों नहीं"),
                  pratipadika="राम", linga="Pum", vibhakti="Trtiya", vacana="Eka"),
        ],
        terms=("vibhakti", "upapada-vibhakti"),
        feature_ids=("INSTR.SG",),
        related=("dative", "upapada"),
    ),
    topic(
        "dative",
        level=1,
        title=("Dative: for and to", "चतुर्थी: के लिए और को"),
        title_sa="चतुर्थी",
        summary=("The 4th case marks the receiver or the purpose: who or what something is for.",
                 "चतुर्थी पाने वाले या उद्देश्य को बताती है: कुछ किसके लिए है।"),
        term=("चतुर्थी", "the fourth case — for, to", "चतुर्थी विभक्ति — के लिए, को"),
        blocks=[
            text("The dative answers “for whom?” and “for what purpose?”. With {{ददाति}} “gives” it "
                 "marks the receiver, and it follows {{नमः}} “salutation”. For a-words the singular "
                 "ends in -āya.",
                 "चतुर्थी 'किसके लिए?' और 'किस उद्देश्य से?' का उत्तर देती है। {{ददाति}} 'देता है' के साथ यह "
                 "पाने वाले को बताती है, और {{नमः}} 'नमस्कार' के साथ भी आती है। अ-शब्दों में एकवचन का अंत -आय है।"),
            _forms("Caturthi", ("Dative forms", "चतुर्थी के रूप")),
            examples(
                ex("गुरुः शिष्याय पुस्तकं ददाति", "The teacher gives the pupil a book.", "गुरु शिष्य को पुस्तक देते हैं।",
                   w("शिष्याय", "to the pupil — the receiver", "शिष्य को — पाने वाला", sub("शिष्य", "Pum", "Caturthi")),
                   w("पुस्तकं", "a book — the thing given", "पुस्तक — कर्म", sub("पुस्तक", "Napumsaka", "Dvitiya")),
                   w("ददाति", "gives", "देता है", tin("दा"))),
                ex("सः विद्यायै पठति", "He studies for the sake of learning.", "वह विद्या के लिए पढ़ता है।",
                   w("विद्यायै", "for learning — the purpose", "विद्या के लिए — उद्देश्य", sub("विद्या", "Stri", "Caturthi"))),
            ),
            tip("Hindi “ko” covers both the object and the receiver. Sanskrit splits them: the thing "
                "given is 2nd case, the person who gets it is 4th.",
                "हिन्दी का 'को' कर्म और पाने वाले, दोनों के लिए आता है। संस्कृत इन्हें अलग करता है: दी जाने "
                "वाली वस्तु द्वितीया में, पाने वाला चतुर्थी में।"),
            watch("{{रोचते}} “is pleasing” puts the person pleased in the dative: {{बालकाय मोदकं रोचते}} "
                  "“the boy likes sweets”.",
                  "{{रोचते}} 'अच्छा लगता है' के साथ जिसे अच्छा लगे वह चतुर्थी में आता है: {{बालकाय मोदकं रोचते}} "
                  "'बालक को लड्डू अच्छा लगता है'।"),
            wild(
                ex("ॐ नमो भगवते वासुदेवाय", "Om, salutation to Lord Vāsudeva.", "ॐ, भगवान वासुदेव को नमस्कार।",
                   w("भगवते", "to the Lord — 4th case", "भगवान को — चतुर्थी",
                     tad("भग", "matup", "Pum", "Caturthi")),
                   w("वासुदेवाय", "to Vāsudeva", "वासुदेव को", sub("वासुदेव", "Pum", "Caturthi")),
                   source=src("The twelve-syllable mantra", "द्वादशाक्षर मन्त्र")),
            ),
        ],
        deeper=[
            go_deeper(
                ("Sampradāna: the one who receives", "सम्प्रदान: पाने वाला"),
                text("In Pāṇini's system the receiver of a gift plays the sampradāna role (1.4.32), and the "
                     "dative is its usual ending. The Kāraka topic shows how all six roles map onto cases.",
                     "पाणिनि की व्यवस्था में दान पाने वाला 'सम्प्रदान' कारक है (1.4.32), और उसकी सामान्य विभक्ति "
                     "चतुर्थी है। कारक वाले पाठ में छहों कारक और उनकी विभक्तियाँ दी गई हैं।"),
            ),
        ],
        quiz=[
            q(("“Salutation to the guru” = {{नमः}} + ?", "'गुरु को नमस्कार' = {{नमः}} + ?"),
              [opt_sa("गुरवे", sub("गुरु", "Pum", "Caturthi")), opt_sa("गुरुम्", sub("गुरु", "Pum", "Dvitiya")),
               opt_sa("गुरोः", sub("गुरु", "Pum", "Sasthi"))],
              0,
              ("{{नमः}} takes the 4th case: {{गुरवे नमः}}.", "{{नमः}} के साथ चतुर्थी आती है: {{गुरवे नमः}}।")),
        ],
        proofs=[
            proof("paradigm", ("See गुरु in all its forms", "गुरु के सारे रूप देखिए"), pratipadika="गुरु", linga="Pum"),
        ],
        terms=("vibhakti", "karaka"),
        feature_ids=("DAT.SG",),
        related=("ablative", "karaka"),
    ),
]
