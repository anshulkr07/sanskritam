"""Chapter 4 · Noun families, part B — -ī/-ū feminines, -ṛ nouns, consonant
stems, odd nouns. Assembled in ``c04_families``."""

from __future__ import annotations

from ._families_common import noun_table
from .model import (
    ex, examples, go_deeper, krd, opt_sa, proof, q, src, sub, tad, text, tin, tip,
    topic, w, watch, wild,
)

TOPICS_B = [
    topic(
        "ii-uu-feminine",
        level=2,
        title=("-ī and -ū feminines: नदी, वधू", "ईकारान्त और ऊकारान्त स्त्रीलिंग: नदी, वधू"),
        title_sa="नदी वधूश्च",
        summary=("Long-vowel feminines: नदी has no visarga in the nominative, वधू does — the rest runs side by side.",
                 "दीर्घ स्वर वाले स्त्रीलिंग शब्द: नदी की प्रथमा में विसर्ग नहीं, वधू में है — बाकी रूप साथ-साथ चलते हैं।"),
        blocks=[
            text("Feminines in long ī — {{नदी}} “river”, {{देवी}} “goddess”, {{पुत्री}} “daughter” — turn ī "
                 "into y before vowels: {{नद्या}}, {{नद्यै}}. Long-ū words like {{वधू}} “bride” turn ū into v "
                 "the same way: {{वध्वा}}, {{वध्वै}}.",
                 "दीर्घ ई वाले स्त्रीलिंग शब्द — {{नदी}}, {{देवी}}, {{पुत्री}} — स्वर से पहले ई को य बना देते हैं: "
                 "{{नद्या}}, {{नद्यै}}। दीर्घ ऊ वाले {{वधू}} जैसे शब्द उसी तरह ऊ को व बनाते हैं: {{वध्वा}}, {{वध्वै}}।"),
            noun_table("नदी", "Stri", [
                "नदी नद्यौ नद्यः", "नदीम् नद्यौ नदीः", "नद्या नदीभ्याम् नदीभिः", "नद्यै नदीभ्याम् नदीभ्यः",
                "नद्याः नदीभ्याम् नदीभ्यः", "नद्याः नद्योः नदीनाम्", "नद्याम् नद्योः नदीषु", "नदि नद्यौ नद्यः",
            ], ("नदी “river” — all 24 forms", "नदी — सभी 24 रूप")),
            noun_table("वधू", "Stri", [
                "वधूः वध्वौ वध्वः", "वधूम् वध्वौ वधूः", "वध्वा वधूभ्याम् वधूभिः", "वध्वै वधूभ्याम् वधूभ्यः",
                "वध्वाः वधूभ्याम् वधूभ्यः", "वध्वाः वध्वोः वधूनाम्", "वध्वाम् वध्वोः वधूषु", "वधु वध्वौ वध्वः",
            ], ("वधू “bride” — all 24 forms", "वधू — सभी 24 रूप")),
            watch("Not every ī-word goes like नदी: {{लक्ष्मीः}}, {{श्रीः}} and {{धीः}} keep a visarga in the "
                  "nominative. When a dictionary gives the nominative, trust it.",
                  "हर ई-शब्द नदी जैसा नहीं चलता: {{लक्ष्मीः}}, {{श्रीः}} और {{धीः}} की प्रथमा में विसर्ग रहता है। "
                  "शब्दकोश प्रथमा दे, तो उसी पर भरोसा कीजिए।"),
            examples(
                ex("देव्यै", "for the goddess", "देवी के लिए", check=sub("देवी", "Stri", "Caturthi")),
                ex("पुत्र्याः", "of the daughter", "पुत्री का", check=sub("पुत्री", "Stri", "Sasthi")),
                ex("लक्ष्मीः", "Lakṣmī — with visarga", "लक्ष्मी — विसर्ग के साथ", check=sub("लक्ष्मी", "Stri")),
                title=("Words like नदी — and one that isn't", "नदी जैसे शब्द — और एक अलग"),
            ),
            wild(
                ex("गङ्गे च यमुने चैव गोदावरि सरस्वति", "O Gaṅgā, Yamunā, Godāvarī, Sarasvatī…",
                   "हे गंगे, यमुने, गोदावरि, सरस्वति…",
                   source=src("Prayer invoking the sacred rivers", "पवित्र नदियों का आवाहन करने वाली प्रार्थना"),
                   check=sub("सरस्वती", "Stri", "Sambodhana", form="सरस्वति")),
            ),
        ],
        deeper=[
            go_deeper(
                ("Why नदी has no visarga", "नदी में विसर्ग क्यों नहीं"),
                text("नदी ends in a feminine suffix, ṅīp. Pāṇini's rule {{हल्ङ्याब्भ्यो दीर्घात् सुतिस्यपृक्तं हल्}} "
                     "(6.1.68) drops the nominative s after it — so {{नदी}}, not {{नदीः}}. In Lakṣmī the ī "
                     "belongs to the stem itself, so the s stays.",
                     "नदी स्त्री-प्रत्यय ङीप् पर खत्म होता है। पाणिनि का नियम {{हल्ङ्याब्भ्यो दीर्घात् सुतिस्यपृक्तं हल्}} "
                     "(6.1.68) उसके बाद प्रथमा का स् हटा देता है — इसलिए {{नदी}}, {{नदीः}} नहीं। लक्ष्मी में ई मूल "
                     "शब्द का हिस्सा है, इसलिए वहाँ स् रहता है।"),
            ),
        ],
        quiz=[
            q(("“In the river” = ?", "'नदी में' = ?"),
              [opt_sa("नद्याम्", sub("नदी", "Stri", "Saptami")), opt_sa("नदीम्", sub("नदी", "Stri", "Dvitiya")),
               opt_sa("नद्या", sub("नदी", "Stri", "Trtiya"))],
              0,
              ("The locative singular is -yām: {{नद्याम्}}.", "सप्तमी एकवचन -याम् है: {{नद्याम्}}।")),
        ],
        proofs=[
            proof("derive", ("Watch नदी lose its visarga", "देखिए नदी का विसर्ग कैसे हटता है"),
                  pratipadika="नदी", linga="Stri", vibhakti="Prathama", vacana="Eka"),
        ],
        terms=("shabdarupa", "linga"),
        feature_ids=("FEM",),
        related=("aa-feminine",),
    ),
    topic(
        "r-stems",
        level=2,
        title=("-ṛ nouns: पितृ and मातृ", "ऋकारान्त शब्द: पितृ और मातृ"),
        title_sa="ऋकारान्तशब्दाः",
        summary=("Family words and doer words end in -ṛ; the ṛ becomes ar, ār or r depending on the ending.",
                 "परिवार के शब्द और 'करने वाले' शब्द -ऋ पर खत्म होते हैं; ऋ प्रत्यय के अनुसार अर्, आर् या र् बनता है।"),
        minutes=4,
        blocks=[
            text("Family words — {{पितृ}} “father”, {{मातृ}} “mother”, {{भ्रातृ}} “brother” — and doer words "
                 "like {{कर्तृ}} “maker” end in ṛ. The ṛ shows up as ar before strong endings ({{पितरम्}}) "
                 "and as r before vowels ({{पित्रा}}).",
                 "परिवार के शब्द — {{पितृ}}, {{मातृ}}, {{भ्रातृ}} — और {{कर्तृ}} 'करने वाला' जैसे शब्द ऋ पर खत्म "
                 "होते हैं। मजबूत प्रत्ययों से पहले ऋ 'अर्' बनता है ({{पितरम्}}) और स्वर से पहले 'र्' ({{पित्रा}})।"),
            noun_table("पितृ", "Pum", [
                "पिता पितरौ पितरः", "पितरम् पितरौ पितॄन्", "पित्रा पितृभ्याम् पितृभिः", "पित्रे पितृभ्याम् पितृभ्यः",
                "पितुः पितृभ्याम् पितृभ्यः", "पितुः पित्रोः पितॄणाम्", "पितरि पित्रोः पितृषु", "पितः पितरौ पितरः",
            ], ("पितृ “father” — all 24 forms", "पितृ 'पिता' — सभी 24 रूप")),
            noun_table("मातृ", "Stri", [
                "माता मातरौ मातरः", "मातरम् मातरौ मातॄः", "मात्रा मातृभ्याम् मातृभिः", "मात्रे मातृभ्याम् मातृभ्यः",
                "मातुः मातृभ्याम् मातृभ्यः", "मातुः मात्रोः मातॄणाम्", "मातरि मात्रोः मातृषु", "मातः मातरौ मातरः",
            ], ("मातृ “mother” — all 24 forms", "मातृ 'माता' — सभी 24 रूप"),
                note=("मातृ differs from पितृ only in the accusative plural: {{मातॄः}} against {{पितॄन्}}.",
                      "मातृ, पितृ से केवल द्वितीया बहुवचन में अलग है: {{मातॄः}} बनाम {{पितॄन्}}।")),
            watch("Doer words take a long ā in their strong forms: “makers” is {{कर्तारः}}, while “fathers” is "
                  "{{पितरः}}. Family words keep the short a.",
                  "करने वाले शब्दों के मजबूत रूपों में लम्बा आ आता है: 'करने वाले' = {{कर्तारः}}, जबकि 'पिता "
                  "(बहुवचन)' = {{पितरः}}। परिवार वाले शब्दों में छोटा अ रहता है।"),
            examples(
                ex("कर्ता", "a doer, a maker", "करने वाला, कर्ता",
                   check=krd("कृ", "tfc", linga="Pum", vibhakti="Prathama", vacana="Eka")),
                ex("कर्तारः", "makers — note the long ā", "करने वाले — लम्बे आ पर ध्यान दें",
                   check=krd("कृ", "tfc", linga="Pum", vibhakti="Prathama", vacana="Bahu")),
                ex("भ्रातरम्", "the brother, as the object", "भाई को", check=sub("भ्रातृ", "Pum", "Dvitiya")),
                title=("Doers and family", "कर्ता-शब्द और परिवार"),
            ),
            wild(
                ex("मातृदेवो भव", "Treat your mother as a god.", "माता को देवता मानो।",
                   w("मातृदेवो", "one whose god is mother", "जिसके लिए माता देवता है"),
                   w("भव", "be!", "बनो", tin("भू", "Lot", "Madhyama")),
                   source=src("Taittirīya Upaniṣad 1.11.2", "तैत्तिरीय उपनिषद् 1.11.2")),
            ),
        ],
        deeper=[
            go_deeper(
                ("Why the stem shifts", "मूल रूप क्यों बदलता है"),
                text("Sanskrit gives some endings a strong stem and others a weak one. For ṛ-words the strong "
                     "stem is -ar (-ār for doers) and the weak one is -r. Pāṇini's {{ऋतो ङिसर्वनामस्थानयोः}} "
                     "(7.3.110) is the rule behind {{पितरि}} “in the father”.",
                     "संस्कृत कुछ प्रत्ययों के लिए मजबूत और कुछ के लिए कमज़ोर रूप देता है। ऋ-शब्दों में मजबूत रूप "
                     "-अर् (कर्ता-शब्दों में -आर्) और कमज़ोर -र् है। पाणिनि का नियम {{ऋतो ङिसर्वनामस्थानयोः}} "
                     "(7.3.110) ही {{पितरि}} 'पिता में' बनाता है।"),
            ),
        ],
        quiz=[
            q(("“With the mother” = ?", "'माता के साथ' = ?"),
              [opt_sa("मात्रा", sub("मातृ", "Stri", "Trtiya")), opt_sa("मातरम्", sub("मातृ", "Stri", "Dvitiya")),
               opt_sa("मातुः", sub("मातृ", "Stri", "Sasthi"))],
              0,
              ("Before the vowel ending ā, ṛ becomes r: {{मात्रा}}.", "स्वर-प्रत्यय आ से पहले ऋ, र् बनता है: {{मात्रा}}।")),
        ],
        proofs=[
            proof("paradigm", ("Tap any form to see how it is built", "किसी भी रूप को छूकर देखिए वह कैसे बना"),
                  pratipadika="पितृ", linga="Pum"),
        ],
        terms=("shabdarupa",),
        feature_ids=("MASC", "FEM"),
        related=("consonant-stems",),
    ),
    topic(
        "consonant-stems",
        level=3,
        title=("Consonant stems: राजन्, मनस्, जगत्, वाच्", "व्यञ्जनान्त शब्द: राजन्, मनस्, जगत्, वाच्"),
        title_sa="व्यञ्जनान्तशब्दाः",
        summary=("Stems ending in a consonant take the endings directly, so sandhi shows at every join.",
                 "व्यंजन पर खत्म होने वाले शब्दों में प्रत्यय सीधे जुड़ते हैं, इसलिए हर जोड़ पर सन्धि दिखती है।"),
        minutes=5,
        blocks=[
            text("{{राजन्}} “king”, {{मनस्}} “mind”, {{जगत्}} “world” and {{वाच्}} “speech” show the basic case "
                 "endings most clearly: -ā, -e, -aḥ, -i. Where an ending starting with a consonant meets the "
                 "stem, sandhi steps in: {{मनोभिः}}, {{वाग्भिः}}.",
                 "{{राजन्}}, {{मनस्}}, {{जगत्}} और {{वाच्}} जैसे शब्दों में मूल विभक्ति-प्रत्यय सबसे साफ़ दिखते हैं: "
                 "-आ, -ए, -अः, -इ। जहाँ व्यंजन से शुरू होने वाला प्रत्यय जुड़ता है, वहाँ सन्धि होती है: {{मनोभिः}}, "
                 "{{वाग्भिः}}।"),
            noun_table("राजन्", "Pum", [
                "राजा राजानौ राजानः", "राजानम् राजानौ राज्ञः", "राज्ञा राजभ्याम् राजभिः", "राज्ञे राजभ्याम् राजभ्यः",
                "राज्ञः राजभ्याम् राजभ्यः", "राज्ञः राज्ञोः राज्ञाम्", "राजनि राज्ञोः राजसु", "राजन् राजानौ राजानः",
            ], ("राजन् “king”", "राजन् 'राजा'"),
                note=("The locative singular can also be {{राज्ञि}}.", "सप्तमी एकवचन {{राज्ञि}} भी होता है।")),
            noun_table("मनस्", "Napumsaka", [
                "मनः मनसी मनांसि", "मनः मनसी मनांसि", "मनसा मनोभ्याम् मनोभिः", "मनसे मनोभ्याम् मनोभ्यः",
                "मनसः मनोभ्याम् मनोभ्यः", "मनसः मनसोः मनसाम्", "मनसि मनसोः मनःसु", "मनः मनसी मनांसि",
            ], ("मनस् “mind”", "मनस् 'मन'")),
            examples(
                ex("जगति", "in the world", "संसार में", check=sub("जगत्", "Napumsaka", "Saptami")),
                ex("जगद्भिः", "by the worlds — t becomes d", "संसारों से — त् का द्", check=sub("जगत्", "Napumsaka", "Trtiya", "Bahu")),
                ex("वाचा", "by speech", "वाणी से", check=sub("वाच्", "Stri", "Trtiya")),
                ex("वाक्", "speech — final c becomes k", "वाणी — अंत का च् क् बन जाता है", check=sub("वाच्", "Stri")),
                title=("Two more", "दो और"),
            ),
            watch("राजन् drops its a in weak forms, and j + ñ fuse into ज्ञ: {{राज्ञा}} “by the king”, {{राज्ञः}} "
                  "“of the king”.",
                  "राजन् कमज़ोर रूपों में अपना अ खो देता है, और ज् + ञ मिलकर ज्ञ बनते हैं: {{राज्ञा}} 'राजा द्वारा', "
                  "{{राज्ञः}} 'राजा का'।"),
            tip("{{आत्मन्}} “self” goes like राजन् but keeps its a before vowels: {{आत्मना}}, {{आत्मने}}.",
                "{{आत्मन्}} 'आत्मा' राजन् की तरह चलता है, पर स्वर से पहले अ बनाए रखता है: {{आत्मना}}, {{आत्मने}}।"),
            wild(
                ex("मन एव मनुष्याणां कारणं बन्धमोक्षयोः", "The mind alone is the cause of bondage and freedom.",
                   "मनुष्यों के बंधन और मोक्ष का कारण मन ही है।",
                   w("मन", "the mind (मनः before एव)", "मन (एव से पहले मनः)", sub("मनस्", "Napumsaka", form="मनः")),
                   w("मनुष्याणां", "of people", "मनुष्यों का", sub("मनुष्य", "Pum", "Sasthi", "Bahu")),
                   source=src("Amṛtabindu Upaniṣad 2", "अमृतबिन्दु उपनिषद् 2")),
            ),
        ],
        deeper=[
            go_deeper(
                ("Strong and weak stems", "मजबूत और कमज़ोर रूप"),
                text("Consonant stems often have two or three shapes. {{राजन्}} is strong in the first five forms "
                     "({{राजा}}…{{राजानम्}}), middle before consonant endings ({{राजभिः}}) and weakest before "
                     "vowels ({{राज्ञा}}). This one idea unlocks most tables that look irregular.",
                     "व्यंजनान्त शब्दों के अक्सर दो-तीन रूप होते हैं। {{राजन्}} पहले पाँच रूपों में मजबूत है "
                     "({{राजा}}…{{राजानम्}}), व्यंजन-प्रत्ययों से पहले मध्यम ({{राजभिः}}) और स्वर-प्रत्ययों से पहले "
                     "सबसे कमज़ोर ({{राज्ञा}})। यह एक बात समझ ली, तो ज़्यादातर 'अजीब' तालिकाएँ समझ आ जाती हैं।"),
            ),
        ],
        quiz=[
            q(("“Of the king” = ?", "'राजा का' = ?"),
              [opt_sa("राज्ञः", sub("राजन्", "Pum", "Sasthi")), opt_sa("राजस्य"),
               opt_sa("राजानम्", sub("राजन्", "Pum", "Dvitiya"))],
              0,
              ("राजन् is not an a-word: the genitive is {{राज्ञः}}, never {{राजस्य}}.",
               "राजन् अ-शब्द नहीं है: षष्ठी {{राज्ञः}} है, {{राजस्य}} नहीं।")),
        ],
        proofs=[
            proof("paradigm", ("Tap any form to see how it is built", "किसी भी रूप को छूकर देखिए वह कैसे बना"),
                  pratipadika="राजन्", linga="Pum"),
        ],
        terms=("shabdarupa", "sandhi"),
        related=("odd-nouns",),
    ),
    topic(
        "odd-nouns",
        level=3,
        title=("Odd ones: गो and the -vat words", "अनोखे शब्द: गो और -वत् वाले शब्द"),
        title_sa="विशेषशब्दाः",
        summary=("A few everyday nouns follow their own rules — गो “cow” and words like भगवत् are the ones you meet most.",
                 "कुछ रोज़ के शब्द अपने नियम चलाते हैं — गो 'गाय' और भगवत् जैसे शब्द सबसे ज़्यादा मिलते हैं।"),
        minutes=4,
        blocks=[
            text("{{गो}} “cow” looks simple but keeps changing shape: {{गौः}}, {{गाम्}}, {{गवा}}, {{गोषु}}. Words "
                 "made with -vat or -mat “having” — {{भगवत्}} “the Lord”, {{श्रीमत्}} “glorious” — add n in their "
                 "strong forms: {{भगवान्}}, {{भगवन्तम्}}.",
                 "{{गो}} 'गाय' सरल दिखता है पर बार-बार रूप बदलता है: {{गौः}}, {{गाम्}}, {{गवा}}, {{गोषु}}। -वत् या "
                 "-मत् 'वाला' से बने शब्द — {{भगवत्}} 'भगवान', {{श्रीमत्}} 'श्रीमान' — मजबूत रूपों में न जोड़ते हैं: "
                 "{{भगवान्}}, {{भगवन्तम्}}।"),
            noun_table("गो", "Pum", [
                "गौः गावौ गावः", "गाम् गावौ गाः", "गवा गोभ्याम् गोभिः", "गवे गोभ्याम् गोभ्यः",
                "गोः गोभ्याम् गोभ्यः", "गोः गवोः गवाम्", "गवि गवोः गोषु", "गौः गावौ गावः",
            ], ("गो “cow, ox”", "गो 'गाय, बैल'")),
            noun_table("भगवत्", "Pum", [
                "भगवान् भगवन्तौ भगवन्तः", "भगवन्तम् भगवन्तौ भगवतः", "भगवता भगवद्भ्याम् भगवद्भिः",
                "भगवते भगवद्भ्याम् भगवद्भ्यः", "भगवतः भगवद्भ्याम् भगवद्भ्यः", "भगवतः भगवतोः भगवताम्",
                "भगवति भगवतोः भगवत्सु", "भगवन् भगवन्तौ भगवन्तः",
            ], ("भगवत् “the Lord” — built from भग + -vat", "भगवत् 'भगवान' — भग + -वत् से बना"),
                taddhita=("भग", "matup")),
            watch("Don't decline भगवत् like an a-word. As the doer it is {{भगवान्}}; calling out, it is {{भगवन्}}.",
                  "भगवत् को अ-शब्द की तरह न चलाइए। कर्ता के रूप में {{भगवान्}}; पुकारते समय {{भगवन्}}।"),
            examples(
                ex("गवाम्", "of the cows", "गायों का", check=sub("गो", "Pum", "Sasthi", "Bahu")),
                ex("श्रीमान्", "glorious one; also “Mr.”", "श्रीमान", check=tad("श्री", "matup", stem_type="nyap")),
                ex("धनवान्", "a wealthy man", "धनवान", check=tad("धन", "matup")),
            ),
            wild(
                ex("श्रीभगवानुवाच", "The Blessed Lord said:", "श्री भगवान बोले:",
                   w("भगवान्", "the Lord — the doer", "भगवान — कर्ता", tad("भग", "matup")),
                   w("उवाच", "said", "बोले", tin("वच्", "Lit")),
                   source=src("Bhagavad Gītā — the line before Kṛṣṇa speaks",
                              "भगवद्गीता — श्रीकृष्ण के वचनों से पहले की पंक्ति")),
            ),
        ],
        deeper=[
            go_deeper(
                ("Why गो is odd", "गो अनोखा क्यों"),
                text("गो ends in the vowel o, which almost no other noun does. Depending on the ending its o turns "
                     "into au, āv or av ({{गौः}}, {{गावौ}}, {{गवा}}) — the vowel ladder from the Sounds chapter at work.",
                     "गो 'ओ' स्वर पर खत्म होता है, जो लगभग किसी और संज्ञा में नहीं होता। प्रत्यय के अनुसार ओ, औ, आव् या "
                     "अव् बनता है ({{गौः}}, {{गावौ}}, {{गवा}}) — ध्वनि वाले अध्याय की स्वर-सीढ़ी यहीं काम करती है।"),
            ),
        ],
        quiz=[
            q(("“The cow” as the object = ?", "'गाय को' = ?"),
              [opt_sa("गाम्", sub("गो", "Pum", "Dvitiya")), opt_sa("गोम्"), opt_sa("गवम्")],
              0,
              ("The accusative singular of गो is the surprising {{गाम्}}.", "गो की द्वितीया एकवचन अनोखी है: {{गाम्}}।")),
        ],
        proofs=[
            proof("derive", ("Watch भगवान् being built", "भगवान् बनते हुए देखिए"),
                  pratipadika="भग", taddhita="matup", linga="Pum", vibhakti="Prathama", vacana="Eka"),
        ],
        terms=("shabdarupa", "guna", "vrddhi"),
        related=("consonant-stems",),
    ),
]
