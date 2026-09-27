"""Chapter 5 · Pronouns & numbers, part A — I/we, you, he/she/it, this/that.
Assembled in ``c05_pronouns``. Every table form was printed by the engine
before it was written here, and each cell carries its check."""

from __future__ import annotations

from ._families_common import noun_table
from .model import (
    cell, ex, examples, go_deeper, opt, opt_sa, proof, q, snd, src, sub, table, tc,
    text, tin, tip, topic, w, watch, wild,
)

TOPICS_A = [
    topic(
        "pronoun-i-we",
        level=1,
        title=("I and we: अस्मद्", "मैं और हम: अस्मद्"),
        title_sa="अस्मद्",
        summary=("अहम् “I” changes completely from case to case — but never for gender.",
                 "अहम् 'मैं' हर विभक्ति में पूरी तरह बदल जाता है — पर लिंग से कभी नहीं।"),
        term=("अहम्", "I", "मैं", sub("अस्मद्")),
        blocks=[
            text("The word for “I” has no gender: a man, a woman and a child all say {{अहम्}}. Its forms "
                 "change a lot — {{माम्}} “me”, {{मम}} “my”, {{मया}} “by me” — and there is a dual for "
                 "“we two”: {{आवाम्}}.",
                 "'मैं' के शब्द का कोई लिंग नहीं: पुरुष, स्त्री, बच्चा — सब {{अहम्}} कहते हैं। इसके रूप बहुत बदलते "
                 "हैं — {{माम्}} 'मुझे', {{मम}} 'मेरा', {{मया}} 'मेरे द्वारा' — और 'हम दो' के लिए द्विवचन भी है: "
                 "{{आवाम्}}।"),
            noun_table("अस्मद्", "Pum", [
                "अहम् आवाम् वयम्", "माम् आवाम् अस्मान्", "मया आवाभ्याम् अस्माभिः", "मह्यम् आवाभ्याम् अस्मभ्यम्",
                "मत् आवाभ्याम् अस्मत्", "मम आवयोः अस्माकम्", "मयि आवयोः अस्मासु",
            ], ("अस्मद् “I · we two · we”", "अस्मद् 'मैं · हम दो · हम'"), highlight=False),
            tip("Short forms stand in for some cases: {{मा}} “me”, {{मे}} “to me, my”, {{नः}} “us, our”. "
                "They never start a sentence: {{शं नो वरुणः}} “may Varuṇa be kind to us”.",
                "कुछ विभक्तियों के छोटे रूप भी हैं: {{मा}} 'मुझे', {{मे}} 'मुझे, मेरा', {{नः}} 'हमें, हमारा'। ये "
                "वाक्य की शुरुआत में कभी नहीं आते: {{शं नो वरुणः}} 'वरुण हमारे लिए मंगलकारी हों'।"),
            examples(
                ex("अहं छात्रः अस्मि", "I am a student.", "मैं छात्र हूँ।",
                   w("अहं", "I", "मैं", sub("अस्मद्")),
                   w("छात्रः", "a student", "छात्र", sub("छात्र")),
                   w("अस्मि", "am", "हूँ", tin("अस्", "Lat", "Uttama"))),
                ex("मम नाम रामः", "My name is Rāma.", "मेरा नाम राम है।",
                   w("मम", "my", "मेरा", sub("अस्मद्", "Pum", "Sasthi")),
                   w("नाम", "name", "नाम", sub("नामन्", "Napumsaka")),
                   w("रामः", "Rāma", "राम", sub("राम"))),
                ex("वयं भारतीयाः", "We are Indians.", "हम भारतीय हैं।",
                   w("वयं", "we", "हम", sub("अस्मद्", "Pum", "Prathama", "Bahu")),
                   w("भारतीयाः", "Indians", "भारतीय", sub("भारतीय", "Pum", "Prathama", "Bahu"))),
            ),
            watch("The verb must match: “I” takes the ending -mi, so {{अहं पठामि}}, never {{अहं पठति}}.",
                  "क्रिया भी मेल खाए: 'मैं' के साथ -मि वाला रूप, इसलिए {{अहं पठामि}}, {{अहं पठति}} कभी नहीं।"),
            wild(
                ex("वयं रक्षामः", "We protect.", "हम रक्षा करते हैं।",
                   source=src("Motto of the Indian Coast Guard", "भारतीय तटरक्षक बल का आदर्श-वाक्य"),
                   check=sub("अस्मद्", "Pum", "Prathama", "Bahu", form="वयम्")),
                ex("असतो मा सद्गमय", "Lead me from the unreal to the real — मा is the short “me”.",
                   "मुझे असत्य से सत्य की ओर ले चलो — मा 'मुझे' का छोटा रूप है।",
                   source=src("Bṛhadāraṇyaka Upaniṣad 1.3.28", "बृहदारण्यक उपनिषद् 1.3.28")),
            ),
        ],
        deeper=[
            go_deeper(
                ("Why “I” has no gender", "'मैं' का लिंग क्यों नहीं"),
                text("Speaker and listener are always present, so their gender never needs marking. That is "
                     "why {{अस्मद्}} and {{युष्मद्}} have a single set of forms, while “he, she, it” splits "
                     "into three.",
                     "बोलने वाला और सुनने वाला हमेशा सामने होते हैं, इसलिए उनका लिंग बताने की ज़रूरत नहीं। इसीलिए "
                     "{{अस्मद्}} और {{युष्मद्}} के रूप एक ही हैं, जबकि 'वह' तीन लिंगों में बँटता है।"),
            ),
        ],
        quiz=[
            q(("“My book” = ___ {{पुस्तकम्}}", "'मेरी पुस्तक' = ___ {{पुस्तकम्}}"),
              [opt_sa("मम", sub("अस्मद्", "Pum", "Sasthi")), opt_sa("माम्", sub("अस्मद्", "Pum", "Dvitiya")),
               opt_sa("मया", sub("अस्मद्", "Pum", "Trtiya"))],
              0,
              ("“My” is the genitive {{मम}}.", "'मेरा' षष्ठी है: {{मम}}।")),
        ],
        proofs=[
            proof("derive", ("Watch अहम् being built", "अहम् बनते हुए देखिए"),
                  pratipadika="अस्मद्", linga="Pum", vibhakti="Prathama", vacana="Eka"),
        ],
        terms=("sarvanama",),
        feature_ids=("PRES.1SG",),
        related=("pronoun-you",),
    ),
    topic(
        "pronoun-you",
        level=1,
        title=("You: युष्मद्", "तुम: युष्मद्"),
        title_sa="युष्मद्",
        summary=("त्वम् “you” works exactly like अहम् — one set of forms, no gender.",
                 "त्वम् 'तुम' ठीक अहम् की तरह चलता है — रूप एक, लिंग नहीं।"),
        term=("त्वम्", "you (one person)", "तुम", sub("युष्मद्")),
        blocks=[
            text("Put the two tables side by side and the pattern jumps out: {{मया}} and {{त्वया}}, {{मम}} and "
                 "{{तव}}, {{मयि}} and {{त्वयि}}. Learn one and you nearly have the other. Polite “you” is a "
                 "different word, {{भवान्}}.",
                 "दोनों तालिकाएँ साथ रखिए, ढाँचा साफ़ दिखेगा: {{मया}} और {{त्वया}}, {{मम}} और {{तव}}, {{मयि}} और "
                 "{{त्वयि}}। एक सीख ली, तो दूसरी लगभग आ गई। आदर वाला 'आप' अलग शब्द है: {{भवान्}}।"),
            noun_table("युष्मद्", "Pum", [
                "त्वम् युवाम् यूयम्", "त्वाम् युवाम् युष्मान्", "त्वया युवाभ्याम् युष्माभिः",
                "तुभ्यम् युवाभ्याम् युष्मभ्यम्", "त्वत् युवाभ्याम् युष्मत्", "तव युवयोः युष्माकम्",
                "त्वयि युवयोः युष्मासु",
            ], ("युष्मद् “you · you two · you all”", "युष्मद् 'तुम · तुम दो · तुम सब'"), highlight=False),
            tip("Short forms: {{त्वा}} “you”, {{ते}} “to you, your”, {{वः}} “to you all, your”. The Gītā's "
                "{{कर्मण्येवाधिकारस्ते}} ends in {{ते}}: “your right is to action alone”.",
                "छोटे रूप: {{त्वा}} 'तुम्हें', {{ते}} 'तुम्हें, तुम्हारा', {{वः}} 'तुम सबको, तुम्हारा'। गीता का "
                "{{कर्मण्येवाधिकारस्ते}} {{ते}} पर खत्म होता है: 'तुम्हारा अधिकार केवल कर्म पर है'।"),
            examples(
                ex("त्वं कुत्र गच्छसि", "Where are you going?", "तुम कहाँ जा रहे हो?",
                   w("त्वं", "you", "तुम", sub("युष्मद्")),
                   w("कुत्र", "where", "कहाँ"),
                   w("गच्छसि", "go (you)", "जाते हो", tin("गम्", "Lat", "Madhyama"))),
                ex("तव नाम किम्", "What is your name?", "तुम्हारा नाम क्या है?",
                   w("तव", "your", "तुम्हारा", sub("युष्मद्", "Pum", "Sasthi")),
                   w("नाम", "name", "नाम", sub("नामन्", "Napumsaka")),
                   w("किम्", "what", "क्या", sub("किम्", "Napumsaka"))),
                ex("यूयं पठथ", "You all read.", "तुम सब पढ़ते हो।",
                   w("यूयं", "you all", "तुम सब", sub("युष्मद्", "Pum", "Prathama", "Bahu")),
                   w("पठथ", "read (you all)", "पढ़ते हो", tin("पठ्", "Lat", "Madhyama", "Bahu"))),
            ),
            watch("“You” takes the you-form of the verb: {{त्वं पठसि}}. With polite {{भवान्}} the verb goes "
                  "back to the he-form: {{भवान् पठति}}.",
                  "'तुम' के साथ मध्यम पुरुष की क्रिया: {{त्वं पठसि}}। आदर वाले {{भवान्}} के साथ क्रिया प्रथम "
                  "पुरुष में: {{भवान् पठति}}।"),
            wild(
                ex("त्वमेव माता च पिता त्वमेव", "You alone are mother, and you alone are father.",
                   "तुम ही माता हो और तुम ही पिता हो।",
                   source=src("Traditional prayer", "पारम्परिक प्रार्थना"),
                   check=snd("त्वम्", "एव", joined="त्वमेव")),
            ),
        ],
        deeper=[
            go_deeper(
                ("Why “you” is the “middle” person", "'तुम' मध्यम पुरुष क्यों"),
                text("Sanskrit counts persons from the far end: prathama “first” is he or she, madhyama "
                     "“middle” is you, uttama “last” is I. The names run opposite to English, but the idea is "
                     "the same three persons.",
                     "संस्कृत पुरुषों को दूर से गिनता है: प्रथम पुरुष = वह, मध्यम पुरुष = तुम, उत्तम पुरुष = मैं। नाम "
                     "अंग्रेज़ी से उल्टे हैं, पर बात वही तीन पुरुषों की है।"),
            ),
        ],
        quiz=[
            q(("“With you” = ?", "'तुम्हारे साथ' = ?"),
              [opt_sa("त्वया सह"), opt_sa("तव सह"), opt_sa("त्वाम् सह")],
              0,
              ("{{सह}} takes the 3rd case: {{त्वया सह}}.", "{{सह}} के साथ तृतीया: {{त्वया सह}}।")),
        ],
        terms=("sarvanama",),
        feature_ids=("PRES.2SG",),
        related=("pronoun-i-we",),
    ),
    topic(
        "pronoun-he-she-it",
        level=1,
        title=("He, she, it: तद्", "वह: तद्"),
        title_sa="तद्",
        summary=("तद् means both “he / she / it” and “that”, in three genders: सः, सा, तत्.",
                 "तद् का अर्थ 'वह' भी है और 'वह (दूर वाला)' भी — तीन लिंगों में: सः, सा, तत्।"),
        term=("सः", "he; that (masculine)", "वह (पुंलिंग)", sub("तद्")),
        blocks=[
            text("Sanskrit has no separate word for “he”. It uses {{तद्}} “that”, which takes the gender of "
                 "what it points to: {{सः}} for a man or masculine noun, {{सा}} for a woman or feminine "
                 "noun, {{तत्}} for a neuter thing.",
                 "संस्कृत में 'वह (पुरुष)' के लिए अलग शब्द नहीं। {{तद्}} 'वह' का ही प्रयोग होता है, जो जिसकी ओर "
                 "संकेत करे उसका लिंग ले लेता है: पुरुष या पुंलिंग शब्द के लिए {{सः}}, स्त्री या स्त्रीलिंग के लिए "
                 "{{सा}}, नपुंसकलिंग वस्तु के लिए {{तत्}}।"),
            noun_table("तद्", "Pum", [
                "सः तौ ते", "तम् तौ तान्", "तेन ताभ्याम् तैः", "तस्मै ताभ्याम् तेभ्यः",
                "तस्मात् ताभ्याम् तेभ्यः", "तस्य तयोः तेषाम्", "तस्मिन् तयोः तेषु",
            ], ("सः “he, that” — masculine", "सः 'वह' — पुंलिंग"), highlight=False),
            noun_table("तद्", "Stri", [
                "सा ते ताः", "ताम् ते ताः", "तया ताभ्याम् ताभिः", "तस्यै ताभ्याम् ताभ्यः",
                "तस्याः ताभ्याम् ताभ्यः", "तस्याः तयोः तासाम्", "तस्याम् तयोः तासु",
            ], ("सा “she, that” — feminine", "सा 'वह' — स्त्रीलिंग"), highlight=False),
            tip("Neuter {{तत्}} shares every form from the instrumental down with masculine सः: {{तेन}}, "
                "{{तस्मै}}, {{तस्मिन्}}.",
                "नपुंसकलिंग {{तत्}} के तृतीया से नीचे के सब रूप पुंलिंग सः जैसे हैं: {{तेन}}, {{तस्मै}}, {{तस्मिन्}}।"),
            examples(
                ex("सः बालकः पठति", "That boy reads.", "वह बालक पढ़ता है।",
                   w("सः", "that — masculine", "वह — पुंलिंग", sub("तद्")),
                   w("बालकः", "boy", "बालक", sub("बालक")),
                   w("पठति", "reads", "पढ़ता है", tin("पठ्"))),
                ex("सा बालिका गायति", "That girl sings.", "वह बालिका गाती है।",
                   w("सा", "that — feminine", "वह — स्त्रीलिंग", sub("तद्", "Stri")),
                   w("बालिका", "girl", "बालिका", sub("बालिका", "Stri")),
                   w("गायति", "sings", "गाती है", tin("गै"))),
                ex("तत् फलं मधुरम्", "That fruit is sweet.", "वह फल मीठा है।",
                   w("तत्", "that — neuter", "वह — नपुंसकलिंग", sub("तद्", "Napumsaka")),
                   w("फलं", "fruit", "फल", sub("फल", "Napumsaka")),
                   w("मधुरम्", "sweet", "मीठा", sub("मधुर", "Napumsaka"))),
            ),
            watch("{{सः}} drops its visarga before a consonant: {{स गच्छति}} “he goes”. School books often "
                  "keep {{सः}} for clarity; read both the same way.",
                  "{{सः}} व्यंजन से पहले अपना विसर्ग छोड़ देता है: {{स गच्छति}} 'वह जाता है'। पाठ्यपुस्तकें स्पष्टता "
                  "के लिए अक्सर {{सः}} ही लिखती हैं; दोनों को एक-सा पढ़िए।"),
            wild(
                ex("सोऽहम्", "I am That.", "मैं वही हूँ।",
                   w("सः", "that", "वह", sub("तद्")),
                   w("अहम्", "I", "मैं", sub("अस्मद्")),
                   source=src("Meditation phrase", "ध्यान का मन्त्र")),
            ),
        ],
        deeper=[
            go_deeper(
                ("One word for “he” and “that”", "'वह' के दोनों अर्थ एक शब्द में"),
                text("Because {{तद्}} really means “that”, it can stand beside a noun — {{सः बालकः}} “that boy” "
                     "— or alone as “he”. Readers decide from context, just as Hindi “vah” does both jobs.",
                     "{{तद्}} का असल अर्थ 'वह (दूर वाला)' है, इसलिए यह संज्ञा के साथ भी आता है — {{सः बालकः}} "
                     "'वह बालक' — और अकेले भी 'वह' के अर्थ में। जैसे हिन्दी का 'वह' दोनों काम करता है।"),
            ),
        ],
        quiz=[
            q(("“She reads” = ___ {{पठति}}", "'वह (स्त्री) पढ़ती है' = ___ {{पठति}}"),
              [opt_sa("सा", sub("तद्", "Stri")), opt_sa("सः", sub("तद्")), opt_sa("तत्", sub("तद्", "Napumsaka"))],
              0,
              ("A woman takes the feminine: {{सा}}.", "स्त्री के लिए स्त्रीलिंग: {{सा}}।")),
        ],
        proofs=[
            proof("paradigm", ("See तद् in all its masculine forms", "तद् के सभी पुंलिंग रूप देखिए"),
                  pratipadika="तद्", linga="Pum"),
        ],
        terms=("sarvanama", "linga"),
        feature_ids=("PRES.3SG",),
        related=("pronoun-this-that",),
    ),
    topic(
        "pronoun-this-that",
        level=2,
        title=("This and that: एतद्, इदम्, अदस्", "यह और वह: एतद्, इदम्, अदस्"),
        title_sa="एतद् इदम् अदस्",
        summary=("Two words mean “this” — एषः and अयम् — and a rarer one, असौ, means “that one over there”.",
                 "'यह' के लिए दो शब्द हैं — एषः और अयम् — और 'वह (उधर वाला)' के लिए कम मिलने वाला असौ।"),
        term=("अयम्", "this (masculine)", "यह (पुंलिंग)", sub("इदम्")),
        blocks=[
            text("{{एतद्}} “this” is simply तद् with e- in front: {{एषः}}, {{एषा}}, {{एतत्}}. {{इदम्}} also means "
                 "“this” but is irregular: {{अयम्}}, {{इयम्}}, {{इदम्}}. {{अदस्}} points far away: {{असौ}} "
                 "“that one yonder”.",
                 "{{एतद्}} 'यह' बस तद् के आगे ए- लगाकर बनता है: {{एषः}}, {{एषा}}, {{एतत्}}। {{इदम्}} का अर्थ भी 'यह' "
                 "है पर यह अनियमित है: {{अयम्}}, {{इयम्}}, {{इदम्}}। {{अदस्}} दूर की ओर संकेत करता है: {{असौ}} "
                 "'वह (उधर वाला)'।"),
            table(
                ("“This” and “that” at a glance", "'यह' और 'वह' एक नज़र में"),
                [("Word", "शब्द"), ("Masculine", "पुंलिंग"), ("Feminine", "स्त्रीलिंग"), ("Neuter", "नपुंसकलिंग")],
                [
                    [tc("this (एतद्)", "यह (एतद्)"), cell("एषः", sub("एतद्")), cell("एषा", sub("एतद्", "Stri")),
                     cell("एतत्", sub("एतद्", "Napumsaka"))],
                    [tc("this (इदम्)", "यह (इदम्)"), cell("अयम्", sub("इदम्")), cell("इयम्", sub("इदम्", "Stri")),
                     cell("इदम्", sub("इदम्", "Napumsaka"))],
                    [tc("that, he / she / it (तद्)", "वह (तद्)"), cell("सः", sub("तद्")), cell("सा", sub("तद्", "Stri")),
                     cell("तत्", sub("तद्", "Napumsaka"))],
                    [tc("that over there (अदस्)", "वह, उधर वाला (अदस्)"), cell("असौ", sub("अदस्")),
                     cell("असौ", sub("अदस्", "Stri")), cell("अदः", sub("अदस्", "Napumsaka"))],
                ],
            ),
            noun_table("इदम्", "Pum", [
                "अयम् इमौ इमे", "इमम् इमौ इमान्", "अनेन आभ्याम् एभिः", "अस्मै आभ्याम् एभ्यः",
                "अस्मात् आभ्याम् एभ्यः", "अस्य अनयोः एषाम्", "अस्मिन् अनयोः एषु",
            ], ("अयम् “this” — masculine, irregular", "अयम् 'यह' — पुंलिंग, अनियमित"), highlight=False),
            watch("{{एषः}} has ṣ, not s: the e- in front turns s into ṣ. Like सः, it drops its visarga "
                  "before a consonant: {{एष बालकः}}.",
                  "{{एषः}} में ष है, स नहीं: आगे का ए स को ष बना देता है। सः की तरह यह भी व्यंजन से पहले विसर्ग छोड़ "
                  "देता है: {{एष बालकः}}।"),
            examples(
                ex("एषः मम भ्राता", "This is my brother.", "यह मेरा भाई है।",
                   w("एषः", "this — masculine", "यह — पुंलिंग", sub("एतद्")),
                   w("मम", "my", "मेरा", sub("अस्मद्", "Pum", "Sasthi")),
                   w("भ्राता", "brother", "भाई", sub("भ्रातृ"))),
                ex("इयं मम माता", "This is my mother.", "यह मेरी माता है।",
                   w("इयं", "this — feminine", "यह — स्त्रीलिंग", sub("इदम्", "Stri")),
                   w("माता", "mother", "माता", sub("मातृ", "Stri"))),
                ex("एतत् पुस्तकम्", "This is a book.", "यह पुस्तक है।",
                   w("एतत्", "this — neuter", "यह — नपुंसकलिंग", sub("एतद्", "Napumsaka")),
                   w("पुस्तकम्", "a book", "पुस्तक", sub("पुस्तक", "Napumsaka"))),
            ),
            wild(
                ex("अयं निजः परो वेति", "“This one is mine, that one a stranger” — so the small-minded count.",
                   "'यह अपना है, वह पराया' — ऐसी गिनती छोटे मन वाले करते हैं।",
                   w("अयं", "this one", "यह", sub("इदम्")),
                   w("निजः", "one's own", "अपना", sub("निज")),
                   w("परो", "other, a stranger", "पराया", sub("पर", form="परः")),
                   source=src("Mahā Upaniṣad 6.71", "महा उपनिषद् 6.71")),
            ),
        ],
        deeper=[
            go_deeper(
                ("एषः or अयम्?", "एषः या अयम्?"),
                text("Grammarians say {{एतद्}} points at something very near or just mentioned, and {{इदम्}} at "
                     "something present before you. In practice both translate as “this”; poets often choose "
                     "by rhythm.",
                     "वैयाकरण कहते हैं {{एतद्}} बहुत पास या अभी बताई गई वस्तु की ओर, और {{इदम्}} सामने उपस्थित वस्तु "
                     "की ओर संकेत करता है। व्यवहार में दोनों का अर्थ 'यह' ही है; कवि अक्सर लय देखकर चुनते हैं।"),
            ),
        ],
        quiz=[
            q(("“This girl” = ?", "'यह बालिका' = ?"),
              [opt_sa("इयं बालिका"), opt_sa("अयं बालिका"), opt_sa("इदं बालिका")],
              0,
              ("बालिका is feminine, so “this” is {{इयम्}} (or {{एषा}}).",
               "बालिका स्त्रीलिंग है, इसलिए 'यह' = {{इयम्}} (या {{एषा}})।")),
        ],
        terms=("sarvanama",),
        related=("pronoun-he-she-it",),
    ),
]
