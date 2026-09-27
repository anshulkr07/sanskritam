"""Chapter 14 · Word-making suffixes (taddhita) — “son of” names, -tva/-tā,
-vat/-mat, -ika, comparatives and superlatives, and feminine suffixes. Every
derived word was built by the engine from its base noun and suffix."""

from __future__ import annotations

from .model import (
    cell, chapter, ex, examples, formula, krd, opt, opt_sa, proof, q, snd, src, sub, table, tad, tc,
    text, tip, topic, w, watch, wild,
)

CHAPTER = chapter(
    "taddhita",
    title=("Word-making suffixes", "शब्द बनाने वाले प्रत्यय"),
    title_sa="तद्धिताः",
    blurb=("रघु → राघव, धर्म → धार्मिक, बुद्धि → बुद्धिमान् — new words from old nouns.",
           "रघु → राघव, धर्म → धार्मिक, बुद्धि → बुद्धिमान् — पुरानी संज्ञाओं से नए शब्द।"),
    icon="color-wand-outline",
)

TOPICS = [
    topic(
        "son-of-names",
        level=1,
        title=("“Son of” names: राघव, कौन्तेय", "'का पुत्र' वाले नाम: राघव, कौन्तेय"),
        title_sa="अपत्यार्थकाः",
        summary=("Strengthen the first vowel and add -a, -i or -eya: रघु → राघवः “descendant of Raghu” — Rāma.",
                 "पहला स्वर बढ़ाइए और -अ, -इ या -एय जोड़िए: रघु → राघवः 'रघु का वंशज' — राम।"),
        term=("तद्धितः", "a suffix that makes words from nouns", "तद्धित — संज्ञा से शब्द बनाने वाला प्रत्यय"),
        blocks=[
            text("Epics name heroes by family. Take a parent's name, raise its **first vowel** to vṛddhi (a → ā, i → ai, "
                 "u → au) and add a suffix: {{रघु}} → {{राघवः}}, {{कुन्ती}} → {{कौन्तेयः}}. Kṛṣṇa calls Arjuna "
                 "{{कौन्तेय}} again and again in the Gītā.",
                 "महाकाव्य नायकों को कुल से पुकारते हैं। माता या पिता का नाम लीजिए, उसके **पहले स्वर** की वृद्धि कीजिए (अ → आ, "
                 "इ → ऐ, उ → औ) और प्रत्यय जोड़िए: {{रघु}} → {{राघवः}}, {{कुन्ती}} → {{कौन्तेयः}}। गीता में कृष्ण अर्जुन को "
                 "बार-बार {{कौन्तेय}} कहते हैं।"),
            table(
                ("Names from parents", "माता-पिता के नाम से बने नाम"),
                [("Parent", "मूल नाम"), ("Descendant", "वंशज"), ("Who", "कौन")],
                [
                    ["रघु", cell("राघवः", tad("रघु", "aR")), tc("Rāma, of Raghu's line", "राम, रघुवंशी")],
                    ["पाण्डु", cell("पाण्डवः", tad("पाण्डु", "aR")), tc("a son of Pāṇḍu", "पाण्डु-पुत्र")],
                    ["वसुदेव", cell("वासुदेवः", tad("वसुदेव", "aR")), tc("Kṛṣṇa, son of Vasudeva", "कृष्ण, वसुदेव-पुत्र")],
                    ["दशरथ", cell("दाशरथिः", tad("दशरथ", "iY")), tc("Rāma, son of Daśaratha", "राम, दशरथ-पुत्र")],
                    ["कुन्ती", cell("कौन्तेयः", tad("कुन्ती", "Qak")), tc("Arjuna, son of Kuntī", "अर्जुन, कुन्ती-पुत्र")],
                    ["गङ्गा", cell("गाङ्गेयः", tad("गङ्गा", "Qak")), tc("Bhīṣma, son of Gaṅgā", "भीष्म, गंगा-पुत्र")],
                    ["पृथा", cell("पार्थः", tad("पृथा", "aR")), tc("Arjuna, son of Pṛthā", "अर्जुन, पृथा-पुत्र")],
                    ["जनक", cell("जानकी", tad("जनक", "aR", "Stri")), tc("Sītā, daughter of Janaka", "सीता, जनक-पुत्री")],
                ],
            ),
            formula("रघु", "अ", "राघवः", "first vowel a → ā (vṛddhi), final u → av, then -a",
                    "पहले स्वर अ की वृद्धि → आ, अंतिम उ → अव्, फिर -अ", check=tad("रघु", "aR")),
            wild(
                ex("मात्रास्पर्शास्तु कौन्तेय शीतोष्णसुखदुःखदाः", "Contacts with the senses, O son of Kuntī, bring cold and heat, joy and pain.",
                   "हे कुन्ती-पुत्र, इन्द्रियों के विषय-संयोग सर्दी-गर्मी और सुख-दुःख देते हैं।",
                   w("कौन्तेय", "O son of Kuntī", "हे कौन्तेय", tad("कुन्ती", "Qak", "Pum", "Sambodhana")),
                   source=src("Bhagavad Gītā 2.14", "भगवद्गीता 2.14")),
            ),
            tip("The same move makes “follower of”: {{शैवः}} from शिव, {{वैष्णवः}} from विष्णु — and {{मानवः}} “human”, "
                "a child of Manu.",
                "यही ढर्रा 'का अनुयायी' भी बनाता है: शिव से {{शैवः}}, विष्णु से {{वैष्णवः}} — और {{मानवः}} 'मनुष्य', मनु की सन्तान।"),
        ],
        quiz=[
            q(("The son of Pāṇḍu is…", "पाण्डु का पुत्र है…"),
              [opt_sa("पाण्डवः", tad("पाण्डु", "aR")), opt_sa("पाण्डुः", sub("पाण्डु")), opt_sa("पण्डवः")],
              0,
              ("First vowel a → ā, final u → av, + a.", "पहला अ → आ, अंतिम उ → अव्, + अ।")),
        ],
        proofs=[
            proof("derive", ("Watch राघवः being built", "राघवः बनते हुए देखिए"),
                  pratipadika="रघु", taddhita="aR", linga="Pum", vibhakti="Prathama", vacana="Eka"),
        ],
        terms=("taddhita", "vrddhi"),
        feature_ids=("MASC",),
        related=("tva-ta", "guna-vrddhi"),
    ),
    topic(
        "tva-ta",
        level=1,
        title=("-tva and -tā: “-ness”", "-त्व और -ता: 'पन'"),
        title_sa="त्वतलौ",
        summary=("मनुष्य → मनुष्यत्वम् “humanity”, मित्र → मित्रता “friendship”. -tva is neuter, -tā feminine.",
                 "मनुष्य → मनुष्यत्वम् 'मनुष्यता', मित्र → मित्रता। -त्व नपुंसकलिंग है, -ता स्त्रीलिंग।"),
        term=("-त्वम्", "“-ness”, “-hood”", "'-पन', '-ता'"),
        blocks=[
            text("Add **-tva** or **-tā** to any noun or adjective to get the quality itself: {{देवत्वम्}} “godhood”, "
                 "{{लघुता}} “lightness”. Nothing else changes. -tva words are neuter; -tā words are feminine.",
                 "किसी भी संज्ञा या विशेषण में **-त्व** या **-ता** जोड़िए, गुण का नाम बन जाता है: {{देवत्वम्}} 'देवत्व', "
                 "{{लघुता}} 'हल्कापन'। और कुछ नहीं बदलता। -त्व वाले शब्द नपुंसकलिंग हैं; -ता वाले स्त्रीलिंग।"),
            table(
                ("Qualities", "गुणवाचक शब्द"),
                [("Base", "मूल"), ("Word", "शब्द"), ("Meaning", "अर्थ")],
                [
                    ["मनुष्य", cell("मनुष्यत्वम्", tad("मनुष्य", "tva", "Napumsaka")), tc("humanity", "मनुष्यत्व")],
                    ["देव", cell("देवत्वम्", tad("देव", "tva", "Napumsaka")), tc("godhood", "देवत्व")],
                    ["मित्र", cell("मित्रता", tad("मित्र", "tal", "Stri")), tc("friendship", "मित्रता")],
                    ["सुन्दर", cell("सुन्दरता", tad("सुन्दर", "tal", "Stri")), tc("beauty", "सुंदरता")],
                    ["लघु", cell("लघुता", tad("लघु", "tal", "Stri")), tc("lightness, smallness", "लघुता")],
                ],
            ),
            tip("Hindi uses both freely — मनुष्यता and मनुष्यत्व, मित्रता and मित्रत्व. They mean the same.",
                "हिन्दी दोनों को खुलकर बरतती है — मनुष्यता और मनुष्यत्व, मित्रता और मित्रत्व। अर्थ एक ही है।"),
            watch("Gender follows the suffix, not the base: {{देवः}} is masculine but {{देवत्वम्}} is neuter.",
                  "लिंग प्रत्यय से तय होता है, मूल शब्द से नहीं: {{देवः}} पुंलिंग है पर {{देवत्वम्}} नपुंसकलिंग।"),
        ],
        quiz=[
            q(("What gender is {{मित्रता}} “friendship”?", "{{मित्रता}} का लिंग क्या है?"),
              [opt("feminine — it ends in -tā", "स्त्रीलिंग — अंत -ता"), opt("masculine like मित्र", "मित्र जैसा पुंलिंग"),
               opt("neuter", "नपुंसकलिंग")],
              0,
              ("-tā words are feminine.", "-ता वाले शब्द स्त्रीलिंग होते हैं।")),
        ],
        terms=("taddhita", "linga"),
        feature_ids=("NEUT", "FEM"),
        related=("vat-mat",),
    ),
    topic(
        "vat-mat",
        level=2,
        title=("-vat and -mat: “having”", "-वत् और -मत्: 'वाला'"),
        title_sa="मतुप्",
        summary=("धन → धनवान् “wealthy”, बुद्धि → बुद्धिमान् “intelligent”, and श्रीमान् / श्रीमती.",
                 "धन → धनवान् 'धनी', बुद्धि → बुद्धिमान्, और श्रीमान् / श्रीमती।"),
        term=("मतुप्", "the “having” suffix -mat / -vat", "मतुप् — 'वाला' अर्थ का -मत् / -वत्"),
        blocks=[
            text("**-mat** means “having”: {{बुद्धिमान्}} “having intelligence”. After a or ā, and after some other "
                 "sounds, the m turns to v: {{धनवान्}} “having wealth”. The masculine ends in -ān, the feminine in -atī.",
                 "**-मत्** का अर्थ है 'वाला': {{बुद्धिमान्}} 'बुद्धि वाला'। अ या आ के बाद, और कुछ अन्य ध्वनियों के बाद, म् "
                 "व् बन जाता है: {{धनवान्}} 'धन वाला'। पुंलिंग -आन् पर खत्म होता है, स्त्रीलिंग -अती पर।"),
            table(
                ("Having…", "…वाला"),
                [("Base", "मूल"), ("Masculine", "पुंलिंग"), ("Feminine", "स्त्रीलिंग")],
                [
                    ["श्री", cell("श्रीमान्", tad("श्री", "matup")), cell("श्रीमती", tad("श्री", "matup", "Stri"))],
                    ["बुद्धि", cell("बुद्धिमान्", tad("बुद्धि", "matup")), cell("बुद्धिमती", tad("बुद्धि", "matup", "Stri"))],
                    ["गुण", cell("गुणवान्", tad("गुण", "matup")), cell("गुणवती", tad("गुण", "matup", "Stri"))],
                    ["धन", cell("धनवान्", tad("धन", "matup")), tc("not used", "प्रयोग नहीं")],
                    ["बल", cell("बलवान्", tad("बल", "matup")), tc("not used", "प्रयोग नहीं")],
                    ["भग", cell("भगवान्", tad("भग", "matup")), tc("not used", "प्रयोग नहीं")],
                ],
                note=("{{भगवान्}} is literally “the one who has good fortune” — the Lord.",
                      "{{भगवान्}} का शाब्दिक अर्थ 'भग (ऐश्वर्य) वाला' — ईश्वर।"),
            ),
            tip("श्रीमान् and श्रीमती, the Hindi titles for Mr and Mrs, are simply “the one with śrī” — honoured.",
                "हिन्दी की उपाधियाँ श्रीमान् और श्रीमती का अर्थ है 'श्री (शोभा) वाला/वाली' — सम्मानित।"),
            watch("These decline like consonant stems, not like देव: {{भगवान्}}, {{भगवन्तम्}}, {{भगवता}}. See the odd-nouns topic.",
                  "इनके रूप देव जैसे नहीं, व्यंजनान्त शब्दों जैसे चलते हैं: {{भगवान्}}, {{भगवन्तम्}}, {{भगवता}}। अनोखे शब्दों वाला विषय देखिए।"),
        ],
        quiz=[
            q(("“strong, having strength” =", "'बल वाला' ="),
              [opt_sa("बलवान्", tad("बल", "matup")), opt_sa("बलमान्"), opt_sa("बलत्वम्")],
              0,
              ("After a, -mat becomes -vat.", "अ के बाद -मत् -वत् बन जाता है।")),
        ],
        terms=("taddhita",),
        related=("ika", "odd-nouns"),
    ),
    topic(
        "ika",
        level=2,
        title=("-ika: “related to”", "-इक: 'से सम्बन्धित'"),
        title_sa="ठक्",
        summary=("धर्म → धार्मिक “religious”, इतिहास → ऐतिहासिक “historical”. First vowel up, -ika added.",
                 "धर्म → धार्मिक, इतिहास → ऐतिहासिक। पहला स्वर बढ़ता है, -इक जुड़ता है।"),
        term=("-इकः", "“related to, belonging to”", "'से सम्बन्धित'"),
        blocks=[
            text("This is the suffix behind most Hindi adjectives of this kind. Strengthen the **first** vowel of the "
                 "noun and add **-ika**: {{समाज}} → {{सामाजिकः}}, {{नीति}} → {{नैतिकः}}.",
                 "हिन्दी के ऐसे ज़्यादातर विशेषण इसी प्रत्यय से बने हैं। संज्ञा के **पहले** स्वर की वृद्धि कीजिए और **-इक** "
                 "जोड़िए: {{समाज}} → {{सामाजिकः}}, {{नीति}} → {{नैतिकः}}।"),
            table(
                ("Hindi adjectives from -ika", "-इक से बने हिन्दी विशेषण"),
                [("Noun", "संज्ञा"), ("Adjective", "विशेषण"), ("Meaning", "अर्थ")],
                [
                    ["धर्म", cell("धार्मिकः", tad("धर्म", "Wak")), tc("religious", "धार्मिक")],
                    ["वेद", cell("वैदिकः", tad("वेद", "Wak")), tc("Vedic", "वैदिक")],
                    ["इतिहास", cell("ऐतिहासिकः", tad("इतिहास", "Wak")), tc("historical", "ऐतिहासिक")],
                    ["नीति", cell("नैतिकः", tad("नीति", "Wak")), tc("moral", "नैतिक")],
                    ["समाज", cell("सामाजिकः", tad("समाज", "Wak")), tc("social", "सामाजिक")],
                    ["अर्थ", cell("आर्थिकः", tad("अर्थ", "Wak")), tc("economic", "आर्थिक")],
                    ["विज्ञान", cell("वैज्ञानिकः", tad("विज्ञान", "Wak")), tc("scientific, a scientist", "वैज्ञानिक")],
                    ["दिन", cell("दैनिकम्", tad("दिन", "Wak", "Napumsaka")), tc("daily", "दैनिक")],
                ],
            ),
            examples(
                ex("भारतीयः", "Indian — भारत + -īya, another “related to” suffix", "भारतीय — भारत + -ईय, एक और 'सम्बन्धित' प्रत्यय",
                   check=tad("भारत", "Ca")),
            ),
            tip("Spot the pattern backwards: an adjective starting with ā, ai or au and ending in -ik usually hides a "
                "simpler noun — ऐतिहासिक ← इतिहास.",
                "उल्टा पहचानिए: आ, ऐ या औ से शुरू होकर -इक पर खत्म होने वाला विशेषण प्रायः किसी सरल संज्ञा से बना है — "
                "ऐतिहासिक ← इतिहास।"),
        ],
        quiz=[
            q(("“social” from समाज =", "समाज से 'सामाजिक' ="),
              [opt_sa("सामाजिकः", tad("समाज", "Wak")), opt_sa("समाजिकः"), opt_sa("सामाजत्वम्")],
              0,
              ("The first vowel a → ā, then -ika.", "पहला अ → आ, फिर -इक।")),
        ],
        terms=("taddhita", "vrddhi", "visheshana"),
        related=("comparison",),
    ),
    topic(
        "comparison",
        level=2,
        title=("-tara/-tama and -īyas/-iṣṭha: “more”, “most”", "-तर/-तम और -ईयस्/-इष्ठ: 'अधिक', 'सबसे अधिक'"),
        title_sa="तरप्तमपौ",
        summary=("प्रिय “dear” → प्रियतरः “dearer” → प्रियतमः “dearest”. Older words use -īyas/-iṣṭha: श्रेष्ठः “best”.",
                 "प्रिय → प्रियतरः 'अधिक प्रिय' → प्रियतमः 'सबसे प्रिय'। पुराने शब्द -ईयस्/-इष्ठ लेते हैं: श्रेष्ठः।"),
        term=("-तमः", "“-est”, the most", "'सबसे', सर्वोच्च"),
        blocks=[
            text("Two pairs make comparisons. **-tara** “more” and **-tama** “most” go on almost anything: "
                 "{{प्रियतरः}}, {{प्रियतमः}}. An older pair, **-īyas** and **-iṣṭha**, attach to a short set of common "
                 "adjectives and often change them: {{गुरु}} → {{गरीयान्}}, {{गरिष्ठः}}.",
                 "तुलना के दो जोड़े हैं। **-तर** 'अधिक' और **-तम** 'सबसे' लगभग हर शब्द पर लगते हैं: {{प्रियतरः}}, {{प्रियतमः}}। "
                 "पुराना जोड़ा **-ईयस्** और **-इष्ठ** कुछ आम विशेषणों पर लगता है और उन्हें बदल भी देता है: {{गुरु}} → "
                 "{{गरीयान्}}, {{गरिष्ठः}}।"),
            table(
                ("More and most", "अधिक और सबसे अधिक"),
                [("Base", "मूल"), ("More", "अधिक"), ("Most", "सबसे अधिक")],
                [
                    ["प्रिय", cell("प्रियतरः", tad("प्रिय", "tarap")), cell("प्रियतमः", tad("प्रिय", "tamap"))],
                    ["लघु", cell("लघीयान्", tad("लघु", "Iyasun")), cell("लघिष्ठः", tad("लघु", "izWan"))],
                    ["गुरु", cell("गरीयान्", tad("गुरु", "Iyasun")), cell("गरिष्ठः", tad("गुरु", "izWan"))],
                    ["प्रशस्य", cell("श्रेयान्", tad("प्रशस्य", "Iyasun")), cell("श्रेष्ठः", tad("प्रशस्य", "izWan"))],
                ],
                note=("{{श्रेष्ठः}} “best” is the superlative of प्रशस्य “praiseworthy” — the base changes completely.",
                      "{{श्रेष्ठः}} 'सबसे अच्छा' प्रशस्य 'प्रशंसनीय' का सर्वोच्च रूप है — मूल पूरी तरह बदल जाता है।"),
            ),
            wild(
                ex("जननी जन्मभूमिश्च स्वर्गादपि गरीयसी", "Mother and motherland are greater even than heaven.",
                   "जननी और जन्मभूमि स्वर्ग से भी बढ़कर हैं।",
                   w("जननी", "mother", "माता", sub("जननी", "Stri")),
                   w("स्वर्गादपि", "even than heaven — स्वर्गात् + अपि", "स्वर्ग से भी — स्वर्गात् + अपि", snd("स्वर्गात्", "अपि")),
                   w("गरीयसी", "greater — feminine of गरीयान्", "बढ़कर — गरीयान् का स्त्रीलिंग", tad("गुरु", "Iyasun", "Stri")),
                   source=src("Popular verse, often attributed to the Rāmāyaṇa", "प्रसिद्ध श्लोक, प्रायः रामायण का बताया जाता है")),
            ),
            tip("“Than” uses the 5th case: {{स्वर्गात्}} “than heaven”, like Hindi “से”.",
                "'से बढ़कर' के लिए पञ्चमी: {{स्वर्गात्}} 'स्वर्ग से', हिन्दी के 'से' जैसा।"),
        ],
        quiz=[
            q(("“dearest” =", "'सबसे प्रिय' ="),
              [opt_sa("प्रियतमः", tad("प्रिय", "tamap")), opt_sa("प्रियतरः", tad("प्रिय", "tarap")), opt_sa("प्रियता")],
              0,
              ("-tama is “most”.", "-तम = 'सबसे'।")),
        ],
        terms=("taddhita", "visheshana"),
        related=("feminine-suffixes", "ablative"),
    ),
    topic(
        "feminine-suffixes",
        level=2,
        title=("Making feminines: -ā, -ī, -ānī", "स्त्रीलिंग बनाना: -आ, -ई, -आनी"),
        title_sa="स्त्रीप्रत्ययाः",
        summary=("बाल → बाला, कुमार → कुमारी, इन्द्र → इन्द्राणी. Three suffixes cover most feminine nouns.",
                 "बाल → बाला, कुमार → कुमारी, इन्द्र → इन्द्राणी। तीन प्रत्यय ज़्यादातर स्त्रीलिंग शब्द बनाते हैं।"),
        term=("स्त्रीप्रत्ययः", "a suffix that makes a feminine", "स्त्री-प्रत्यय"),
        blocks=[
            text("Most masculine a-words make a feminine with **-ā**: {{बालः}} → {{बाला}}. Many take **-ī** instead: "
                 "{{कुमारः}} → {{कुमारी}}, {{देवः}} → {{देवी}}. For the wife of a god or a title, **-ānī**: "
                 "{{इन्द्राणी}}, {{भवानी}}.",
                 "ज़्यादातर पुंलिंग अ-शब्द **-आ** से स्त्रीलिंग बनाते हैं: {{बालः}} → {{बाला}}। कई **-ई** लेते हैं: "
                 "{{कुमारः}} → {{कुमारी}}, {{देवः}} → {{देवी}}। किसी देवता की पत्नी या उपाधि के लिए **-आनी**: {{इन्द्राणी}}, "
                 "{{भवानी}}।"),
            table(
                ("Masculine and feminine", "पुंलिंग और स्त्रीलिंग"),
                [("Suffix", "प्रत्यय"), ("Masculine", "पुंलिंग"), ("Feminine", "स्त्रीलिंग")],
                [
                    [tc("-ā", "-आ"), cell("बालः", sub("बाल")), cell("बाला", sub("बाला", "Stri"))],
                    [tc("-ā", "-आ"), cell("अश्वः", sub("अश्व")), cell("अश्वा", sub("अश्वा", "Stri"))],
                    [tc("-ī", "-ई"), cell("कुमारः", sub("कुमार")), cell("कुमारी", sub("कुमारी", "Stri"))],
                    [tc("-ī", "-ई"), cell("देवः", sub("देव")), cell("देवी", sub("देवी", "Stri"))],
                    [tc("-ānī", "-आनी"), cell("इन्द्रः", sub("इन्द्र")), cell("इन्द्राणी", sub("इन्द्राणी", "Stri"))],
                    [tc("-ānī", "-आनी"), cell("आचार्यः", sub("आचार्य")), cell("आचार्याणी", sub("आचार्याणी", "Stri"))],
                ],
            ),
            examples(
                ex("गुणवती", "virtuous (woman) — -vat takes -ī", "गुणवती — -वत् में -ई", check=tad("गुण", "matup", "Stri")),
                ex("पठन्ती", "reading (woman) — -at takes -ī", "पढ़ती हुई — -अत् में -ई",
                   check=krd("पठ्", "Satf", linga="Stri", vibhakti="Prathama", vacana="Eka")),
                ex("जानकी", "Janaka's daughter — vṛddhi and -ī", "जनक की पुत्री — वृद्धि और -ई", check=tad("जनक", "aR", "Stri")),
            ),
            watch("{{आचार्याणी}} is the teacher's wife; a woman who is herself a teacher is {{आचार्या}}.",
                  "{{आचार्याणी}} आचार्य की पत्नी है; जो स्त्री स्वयं आचार्य हो, वह {{आचार्या}}।"),
        ],
        quiz=[
            q(("The feminine of कुमारः is…", "कुमारः का स्त्रीलिंग है…"),
              [opt_sa("कुमारी", sub("कुमारी", "Stri")), opt_sa("कुमारा"), opt_sa("कुमाराणी")],
              0,
              ("कुमार takes -ī.", "कुमार -ई लेता है।")),
        ],
        terms=("linga", "taddhita"),
        feature_ids=("FEM",),
        related=("aa-feminine", "ii-uu-feminine"),
    ),
]
