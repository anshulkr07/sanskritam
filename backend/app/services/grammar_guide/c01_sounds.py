"""Chapter 1 · Sounds & script — vowels, the consonant grid, ṃ/ḥ, clusters, guṇa/vṛddhi."""

from __future__ import annotations

from .model import (
    analogy, cell, chapter, ex, examples, go_deeper, opt, opt_sa, proof, q, snd, src,
    sub, table, tad, tc, text, tin, tip, topic, w, watch, wild,
)

CHAPTER = chapter(
    "sounds",
    title=("Sounds & script", "ध्वनि और लिपि"),
    title_sa="वर्णाः",
    blurb=("An alphabet laid out like a map of your mouth.",
           "एक वर्णमाला जो आपके मुँह के नक्शे की तरह सजी है।"),
    icon="musical-notes-outline",
)

TOPICS = [
    topic(
        "vowels",
        level=1,
        title=("Vowels, short and long", "स्वर — ह्रस्व और दीर्घ"),
        title_sa="स्वराः",
        summary=("Vowels come in short and long pairs, and the length can change a word's meaning.",
                 "स्वर ह्रस्व और दीर्घ जोड़ों में आते हैं, और लम्बाई बदलने से शब्द का अर्थ बदल सकता है।"),
        term=("स्वरः", "vowel", "स्वर"),
        blocks=[
            text("A vowel is a sound you can hold with your mouth open. Most Sanskrit vowels come in "
                 "pairs — short and long — and four are always long. A long vowel lasts about twice "
                 "as long as a short one.",
                 "स्वर वह ध्वनि है जिसे मुँह खोलकर देर तक बोला जा सकता है। ज़्यादातर संस्कृत स्वर जोड़ों "
                 "में आते हैं — ह्रस्व (छोटा) और दीर्घ (लम्बा) — और चार स्वर हमेशा दीर्घ होते हैं। दीर्घ "
                 "स्वर ह्रस्व से लगभग दुगुना लम्बा बोला जाता है।"),
            table(
                ("The vowels", "स्वर"),
                [("Short", "ह्रस्व"), ("Long", "दीर्घ"), ("Sounds like", "कैसी ध्वनि")],
                [
                    ["अ", "आ", tc("u in “but” / a in “father”", "अ / आ")],
                    ["इ", "ई", tc("i in “sit” / ee in “see”", "इ / ई")],
                    ["उ", "ऊ", tc("u in “put” / oo in “moon”", "उ / ऊ")],
                    ["ऋ", "ॠ", tc("a quick “ri” / the same, held", "जल्दी से 'रि' / वही, लम्बा")],
                    [tc("(none)", "(नहीं)"), "ए", tc("ay in “say”", "'ए'")],
                    [tc("(none)", "(नहीं)"), "ऐ", tc("ai in “aisle”", "'ऐ' — 'अइ' जैसा")],
                    [tc("(none)", "(नहीं)"), "ओ", tc("o in “go”", "'ओ'")],
                    [tc("(none)", "(नहीं)"), "औ", tc("ow in “now”", "'औ' — 'अउ' जैसा")],
                ],
            ),
            text("After a consonant, a vowel is written as a small sign (a mātrā) on the letter. "
                 "Short a needs no sign at all: {{क}} already reads “ka”.",
                 "व्यंजन के बाद स्वर एक छोटी मात्रा बनकर अक्षर पर लगता है। ह्रस्व अ की कोई मात्रा नहीं: "
                 "{{क}} अपने आप 'क' पढ़ा जाता है।"),
            table(
                ("Vowel signs on क", "क पर मात्राएँ"),
                [("Vowel", "स्वर"), ("With क", "क के साथ")],
                [["अ", "क"], ["आ", "का"], ["इ", "कि"], ["ई", "की"], ["उ", "कु"], ["ऊ", "कू"],
                 ["ऋ", "कृ"], ["ए", "के"], ["ऐ", "कै"], ["ओ", "को"], ["औ", "कौ"]],
            ),
            examples(
                ex("दिनम्", "a day — short i", "दिन — ह्रस्व इ", check=sub("दिन", "Napumsaka")),
                ex("दीनः", "a poor, humble person — long ī", "दीन व्यक्ति — दीर्घ ई", check=sub("दीन")),
                ex("कुलम्", "a family — short u", "कुल, परिवार — ह्रस्व उ", check=sub("कुल", "Napumsaka")),
                ex("कूलम्", "a riverbank — long ū", "नदी का किनारा — दीर्घ ऊ", check=sub("कूल", "Napumsaka")),
                title=("Length changes meaning", "लम्बाई से अर्थ बदलता है"),
            ),
            watch("ए and ओ are always long in Sanskrit, even though they have no short partner. "
                  "Don't clip them.",
                  "संस्कृत में ए और ओ हमेशा दीर्घ होते हैं, भले उनका कोई ह्रस्व जोड़ा न हो। इन्हें छोटा न करें।"),
            wild(
                ex("ॐ", "Om — the sacred syllable, a + u + m", "ॐ — पवित्र अक्षर: अ + उ + म्",
                   source=src("Begins prayers and mantras", "प्रार्थनाओं और मन्त्रों का आरम्भ")),
            ),
        ],
        deeper=[
            go_deeper(
                ("Why ṛ counts as a vowel", "ऋ स्वर क्यों है"),
                text("In {{ऋ}} the r sound itself carries the syllable, like the “r” in an American "
                     "“bird”. Sanskrit treats it as a vowel, and it behaves like one when words meet: "
                     "{{पितृ}} + {{आज्ञा}} → {{पित्राज्ञा}} “a father's command”. The very rare {{ऌ}} "
                     "does the same with l.",
                     "{{ऋ}} में 'र' की ध्वनि ही अक्षर को थामती है। संस्कृत इसे स्वर मानता है, और शब्दों के "
                     "मिलने पर यह स्वर की तरह ही बदलता है: {{पितृ}} + {{आज्ञा}} → {{पित्राज्ञा}} "
                     "'पिता की आज्ञा'। बहुत कम मिलने वाला {{ऌ}} 'ल' के साथ यही करता है।"),
            ),
        ],
        quiz=[
            q(("Which pair differs only in vowel length?", "कौन-सा जोड़ा केवल स्वर की लम्बाई में अलग है?"),
              [opt_sa("दिनम् · दीनः"), opt_sa("कुलम् · कमलम्"), opt_sa("नदी · नगरम्")],
              0,
              ("{{दिनम्}} has short i and {{दीनः}} long ī — and they mean different things.",
               "{{दिनम्}} में ह्रस्व इ है और {{दीनः}} में दीर्घ ई — और दोनों का अर्थ अलग है।")),
            q(("How is {{क}} + {{ई}} written?", "{{क}} + {{ई}} कैसे लिखेंगे?"),
              [opt_sa("की"), opt_sa("कि"), opt_sa("के")],
              0,
              ("Long ī is the sign that stands after the letter: {{की}}.",
               "दीर्घ ई की मात्रा अक्षर के बाद लगती है: {{की}}।")),
        ],
        terms=("svara",),
        related=("consonants", "guna-vrddhi"),
    ),
    topic(
        "consonants",
        level=1,
        title=("The consonant grid", "व्यंजनों की सारणी"),
        title_sa="व्यञ्जनानि",
        summary=("Consonants are arranged by where the mouth makes them — throat to lips — in a neat 5 × 5 grid.",
                 "व्यंजन इस क्रम में सजे हैं कि मुँह में वे कहाँ बनते हैं — गले से होंठों तक — एक सुंदर 5 × 5 सारणी में।"),
        term=("व्यञ्जनम्", "consonant", "व्यंजन"),
        minutes=4,
        blocks=[
            text("Say क, च, ट, त, प and feel the sound move forward: throat, palate, roof of the "
                 "mouth, teeth, lips. The alphabet follows your mouth. Each row then runs plain, "
                 "breathy, voiced, voiced with breath, and nasal.",
                 "क, च, ट, त, प बोलकर देखिए — ध्वनि आगे बढ़ती है: कण्ठ, तालु, मूर्धा, दाँत, होंठ। वर्णमाला "
                 "आपके मुँह के क्रम में चलती है। हर पंक्ति का क्रम है: अल्पप्राण, महाप्राण, घोष, घोष-महाप्राण "
                 "और नासिक्य।"),
            table(
                ("The five rows", "पाँच वर्ग"),
                [("Where", "स्थान"), ("plain", "अल्पप्राण"), ("breathy", "महाप्राण"),
                 ("voiced", "घोष"), ("voiced + breath", "घोष-महाप्राण"), ("nasal", "नासिक्य")],
                [
                    [tc("throat", "कण्ठ"), "क", "ख", "ग", "घ", "ङ"],
                    [tc("palate", "तालु"), "च", "छ", "ज", "झ", "ञ"],
                    [tc("roof, tongue curled back", "मूर्धा"), "ट", "ठ", "ड", "ढ", "ण"],
                    [tc("teeth", "दाँत"), "त", "थ", "द", "ध", "न"],
                    [tc("lips", "होंठ"), "प", "फ", "ब", "भ", "म"],
                ],
            ),
            table(
                ("The rest", "शेष व्यंजन"),
                [("Kind", "प्रकार"), ("Letters", "वर्ण")],
                [
                    [tc("semivowels", "अन्तःस्थ"), "य र ल व"],
                    [tc("hissing sounds and h", "ऊष्म"), "श ष स ह"],
                ],
            ),
            analogy("Think of a keyboard: each row is one place in the mouth, and every row uses the "
                    "same five keys. Learn the pattern of one row and you know all five.",
                    "हारमोनियम के सप्तक की तरह सोचिए: हर पंक्ति मुँह का एक स्थान है, और हर पंक्ति में वही "
                    "पाँच सुर बजते हैं। एक पंक्ति का ढाँचा समझ लिया, तो पाँचों समझ आ गईं।"),
            examples(
                ex("करः", "a hand; a ray of light — plain k", "हाथ; किरण — अल्पप्राण क", check=sub("कर")),
                ex("खरः", "a donkey — breathy kh", "गधा — महाप्राण ख", check=sub("खर")),
                ex("पलम्", "a moment — plain p", "पल, क्षण — अल्पप्राण प", check=sub("पल", "Napumsaka")),
                ex("फलम्", "a fruit — breathy ph", "फल — महाप्राण फ", check=sub("फल", "Napumsaka")),
                title=("A puff of breath makes a new word", "साँस का झोंका नया शब्द बना देता है"),
            ),
            wild(
                ex("गङ्गा", "Gaṅgā — the nasal of the k-row stands before ग", "गङ्गा — ग से पहले उसी वर्ग का नासिक्य ङ",
                   source=src("The river Ganga", "गंगा नदी"), check=sub("गङ्गा", "Stri")),
                ex("पञ्चतन्त्रम्", "Pañcatantra, “five books” — ञ before च", "पञ्चतन्त्र, 'पाँच तन्त्र' — च से पहले ञ",
                   source=src("The classic book of fables", "प्रसिद्ध कथा-ग्रन्थ"),
                   check=sub("पञ्चतन्त्र", "Napumsaka")),
            ),
            tip("Open the Sound map in this app and tap any letter to see where the mouth makes it.",
                "इस ऐप में वर्णमाला खोलिए और किसी भी वर्ण को छूकर देखिए कि मुँह में वह कहाँ बनता है।"),
        ],
        deeper=[
            go_deeper(
                ("Why the order matters for grammar", "व्याकरण में यह क्रम क्यों ज़रूरी है"),
                text("Rules name whole rows and columns at once. A voiceless letter turns voiced before "
                     "a voiced one: {{सत्}} + {{गमय}} → {{सद्गमय}}. A nasal takes the row of the letter "
                     "after it, which is why Gaṅgā is written with ङ. The grid is the map these rules read.",
                     "नियम पूरे वर्ग या स्तम्भ को एक साथ बताते हैं। घोष वर्ण से पहले अघोष वर्ण घोष बन जाता है: "
                     "{{सत्}} + {{गमय}} → {{सद्गमय}}। नासिक्य अगले वर्ण के वर्ग का हो जाता है, इसीलिए गङ्गा में "
                     "ङ लिखा जाता है। ये नियम इसी सारणी को पढ़कर चलते हैं।"),
                examples(
                    ex("असतो मा सद्गमय", "Lead me from the unreal to the real.", "मुझे असत्य से सत्य की ओर ले चलो।",
                       source=src("Bṛhadāraṇyaka Upaniṣad 1.3.28", "बृहदारण्यक उपनिषद् 1.3.28"),
                       check=snd("सत्", "गमय", joined="सद्गमय")),
                ),
            ),
        ],
        quiz=[
            q(("Which letter is made at the lips?", "कौन-सा वर्ण होंठों से बनता है?"),
              [opt_sa("म"), opt_sa("न"), opt_sa("ङ")],
              0,
              ("{{म}} is in the lip row: प फ ब भ म.", "{{म}} ओष्ठ्य वर्ग में है: प फ ब भ म।")),
            q(("What does the h in bh add?", "bh में h क्या जोड़ता है?"),
              [opt("A puff of breath", "साँस का झोंका (महाप्राण)"),
               opt("A new vowel", "एक नया स्वर"),
               opt("Nothing — it is silent", "कुछ नहीं — यह मौन है")],
              0,
              ("bh is {{भ}}, the breathy partner of {{ब}}.", "bh = {{भ}}, जो {{ब}} का महाप्राण रूप है।")),
        ],
        terms=("vyanjana", "sthana"),
        related=("vowels", "anusvara-visarga"),
    ),
    topic(
        "anusvara-visarga",
        level=1,
        title=("ṃ and ḥ: the hum and the breath", "अनुस्वार और विसर्ग"),
        title_sa="अनुस्वारविसर्गौ",
        summary=("Two small marks finish many words: a dot for a nasal hum and two dots for a soft breath.",
                 "दो छोटे चिह्न बहुत-से शब्दों को पूरा करते हैं: नाक की गूँज के लिए एक बिंदु, हल्की साँस के लिए दो बिंदु।"),
        term=("विसर्गः", "visarga — the soft breath ḥ", "विसर्ग — हल्की साँस की ध्वनि"),
        blocks=[
            text("The dot above a letter, as in {{अं}}, is anusvāra (ṃ): a hum through the nose. The "
                 "two dots, as in {{अः}}, are visarga (ḥ): a light breath that echoes the vowel before "
                 "it, so {{रामः}} ends in a soft “ha”.",
                 "अक्षर के ऊपर का बिंदु, जैसे {{अं}}, अनुस्वार (ṃ) है — नाक से गूँज। दो बिंदु, जैसे {{अः}}, "
                 "विसर्ग (ḥ) हैं — हल्की साँस जो पिछले स्वर को दोहराती है, इसलिए {{रामः}} के अंत में धीमा-सा "
                 "'ह' सुनाई देता है।"),
            table(
                ("Where you meet them", "ये कहाँ मिलते हैं"),
                [("Word", "शब्द"), ("Ends with", "अंत में"), ("Meaning", "अर्थ")],
                [
                    [cell("रामः", sub("राम")), tc("visarga ḥ", "विसर्ग ः"), tc("Rāma, doing something", "राम (कर्ता)")],
                    [cell("रामम्", sub("राम", "Pum", "Dvitiya")), tc("m, before a pause", "म्, रुकने से पहले"),
                     tc("Rāma, as the object", "राम को")],
                    [cell("रामं पश्यति"), tc("ṃ, before another consonant", "ं, अगले व्यंजन से पहले"),
                     tc("sees Rāma", "राम को देखता है")],
                    [cell("नमः"), tc("visarga ḥ", "विसर्ग ः"), tc("a bow, a salutation", "नमस्कार")],
                ],
            ),
            watch("A final म् becomes ं when a consonant follows: {{सत्यम्}} + {{वद}} → {{सत्यं वद}}. "
                  "It is the same word, not a spelling mistake.",
                  "अंत का म् अगले व्यंजन से पहले ं बन जाता है: {{सत्यम्}} + {{वद}} → {{सत्यं वद}}। शब्द वही "
                  "है, यह वर्तनी की गलती नहीं।"),
            examples(
                ex("सत्यं वद", "Speak the truth.", "सच बोलो।",
                   w("सत्यं", "the truth", "सत्य", sub("सत्य", "Napumsaka", "Dvitiya")),
                   w("वद", "speak!", "बोलो", tin("वद्", "Lot", "Madhyama")),
                   source=src("Taittirīya Upaniṣad 1.11.1", "तैत्तिरीय उपनिषद् 1.11.1")),
                ex("धर्मं चर", "Live by dharma.", "धर्म का आचरण करो।",
                   w("धर्मं", "dharma, what is right", "धर्म", sub("धर्म", "Pum", "Dvitiya")),
                   w("चर", "practise!", "आचरण करो", tin("चर्", "Lot", "Madhyama")),
                   source=src("Taittirīya Upaniṣad 1.11.1", "तैत्तिरीय उपनिषद् 1.11.1")),
            ),
            wild(
                ex("नमः शिवाय", "Salutation to Śiva.", "शिव को नमस्कार।",
                   w("नमः", "salutation", "नमस्कार"),
                   w("शिवाय", "to Śiva", "शिव को", sub("शिव", "Pum", "Caturthi")),
                   source=src("The five-syllable mantra", "पञ्चाक्षर मन्त्र")),
            ),
        ],
        deeper=[
            go_deeper(
                ("Visarga changes before other sounds", "विसर्ग अगली ध्वनि से बदलता है"),
                text("ḥ is a pause sound. Inside a sentence it adapts to what follows: {{नमः}} + {{ते}} → "
                     "{{नमस्ते}}, {{रामः}} + {{च}} → {{रामश्च}}. The Sandhi chapter walks through every case.",
                     "ः रुकने की ध्वनि है। वाक्य के बीच में यह अगली ध्वनि के अनुसार बदलता है: {{नमः}} + {{ते}} → "
                     "{{नमस्ते}}, {{रामः}} + {{च}} → {{रामश्च}}। सन्धि वाले अध्याय में सब स्थितियाँ समझाई गई हैं।"),
            ),
        ],
        quiz=[
            q(("Why is it {{सत्यं वद}} and not {{सत्यम् वद}}?", "{{सत्यं वद}} क्यों, {{सत्यम् वद}} क्यों नहीं?"),
              [opt("A final m turns into ṃ before a consonant", "व्यंजन से पहले अंत का म् अनुस्वार बन जाता है"),
               opt("They are two different words", "ये दो अलग शब्द हैं"),
               opt("It is a spelling mistake", "यह वर्तनी की गलती है")],
              0,
              ("Same word, adapted to the sound that follows.", "शब्द वही है, बस अगली ध्वनि के अनुसार बदला है।")),
        ],
        terms=("anusvara", "visarga"),
        feature_ids=("ANUSVARA-SANDHI", "VISARGA-SANDHI"),
        related=("consonants",),
    ),
    topic(
        "conjuncts",
        level=2,
        title=("Joined letters", "संयुक्ताक्षर"),
        title_sa="संयुक्ताक्षराणि",
        summary=("When consonants meet with no vowel between them, they are written as one joined letter.",
                 "जब व्यंजनों के बीच कोई स्वर नहीं होता, तो वे जुड़कर एक संयुक्त अक्षर बन जाते हैं।"),
        term=("संयोगः", "consonant cluster", "संयोग — व्यंजनों का मेल"),
        blocks=[
            text("Every consonant letter carries a built-in a: {{क}} is “ka”. To show a consonant with "
                 "no vowel, add the small stroke called virāma: {{क्}}. When another consonant follows, "
                 "the two usually fuse into one shape.",
                 "हर व्यंजन अक्षर में 'अ' छिपा रहता है: {{क}} = 'क'। बिना स्वर का व्यंजन दिखाने के लिए नीचे "
                 "हलन्त लगाते हैं: {{क्}}। उसके बाद दूसरा व्यंजन आए, तो दोनों अक्सर जुड़कर एक आकार बन जाते हैं।"),
            table(
                ("Clusters you will see often", "अक्सर दिखने वाले संयुक्ताक्षर"),
                [("Parts", "भाग"), ("Joined", "संयुक्त"), ("In a word", "शब्द में")],
                [
                    ["क् + ष", "क्ष", cell("क्षेत्रम्", sub("क्षेत्र", "Napumsaka"))],
                    ["त् + र", "त्र", cell("मित्रम्", sub("मित्र", "Napumsaka"))],
                    ["ज् + ञ", "ज्ञ", cell("ज्ञानम्", sub("ज्ञान", "Napumsaka"))],
                    ["श् + र", "श्र", cell("श्रीः", sub("श्री", "Stri"))],
                    ["द् + य", "द्य", cell("विद्या", sub("विद्या", "Stri"))],
                    ["र् + म", "र्म", cell("धर्मः", sub("धर्म"))],
                ],
            ),
            watch("{{ज्ञ}} is said “gya” in much of India and “jña” elsewhere, but it is always ज् + ञ. "
                  "And र before a consonant shrinks to a hook on top: र् + म → {{र्म}}.",
                  "{{ज्ञ}} को कहीं 'ग्य' और कहीं 'ज्ञ' बोलते हैं, पर यह हमेशा ज् + ञ है। और व्यंजन से पहले "
                  "आया र ऊपर रेफ बन जाता है: र् + म → {{र्म}}।"),
            wild(
                ex("कर्मण्येवाधिकारस्ते", "Your right is to the action alone.", "तुम्हारा अधिकार केवल कर्म पर है।",
                   source=src("Bhagavad Gītā 2.47", "भगवद्गीता 2.47"),
                   check=snd("कर्मणि", "एव", joined="कर्मण्येव")),
            ),
        ],
        deeper=[
            go_deeper(
                ("Light and heavy syllables", "लघु और गुरु अक्षर"),
                text("A syllable is heavy if its vowel is long, or if two consonants follow it. In "
                     "{{धर्मः}} the syllable dhar is heavy because r and m follow. Sanskrit verse is built "
                     "from this light–heavy rhythm.",
                     "अक्षर गुरु (भारी) होता है अगर उसका स्वर दीर्घ हो, या उसके बाद दो व्यंजन आएँ। {{धर्मः}} "
                     "में 'धर्' गुरु है, क्योंकि उसके बाद र् और म आते हैं। संस्कृत छन्द इसी लघु–गुरु लय से बनते हैं।"),
            ),
        ],
        quiz=[
            q(("What are the parts of {{क्ष}}?", "{{क्ष}} किन वर्णों से बना है?"),
              [opt_sa("क् + ष"), opt_sa("क + श"), opt_sa("ख + स")],
              0,
              ("{{क्ष}} = क् + ष, as in {{क्षेत्रम्}} “field”.", "{{क्ष}} = क् + ष, जैसे {{क्षेत्रम्}} 'खेत'।")),
        ],
        proofs=[
            proof("scansion", ("See the light and heavy syllables", "लघु और गुरु अक्षर देखिए"),
                  text="धर्मक्षेत्रे कुरुक्षेत्रे समवेता युयुत्सवः"),
        ],
        terms=("akshara", "samyoga"),
        related=("consonants",),
    ),
    topic(
        "guna-vrddhi",
        level=2,
        title=("Guṇa and vṛddhi: vowels that grow", "गुण और वृद्धि: बढ़ने वाले स्वर"),
        title_sa="गुणवृद्धी",
        summary=("Vowels strengthen in two steps. Learn the ladder and whole families of words line up.",
                 "स्वर दो सीढ़ियों में बलवान होते हैं। यह सीढ़ी समझ लीजिए, शब्दों के पूरे परिवार साफ़ दिखने लगेंगे।"),
        term=("वृद्धिः", "vṛddhi — the strongest grade of a vowel", "वृद्धि — स्वर का सबसे बलवान रूप"),
        blocks=[
            text("Many words are made by strengthening a vowel. The plain vowel is the base, guṇa is "
                 "one step up and vṛddhi is two. Once you know the ladder, {{शिव}} and {{शैव}} "
                 "(“a follower of Śiva”) are clearly family.",
                 "बहुत-से शब्द स्वर को बलवान बनाकर बनते हैं। सामान्य स्वर आधार है, गुण एक सीढ़ी ऊपर और वृद्धि "
                 "दो सीढ़ी ऊपर। यह सीढ़ी समझ ली, तो {{शिव}} और {{शैव}} ('शिव का उपासक') का रिश्ता साफ़ दिख जाता है।"),
            table(
                ("The vowel ladder", "स्वरों की सीढ़ी"),
                [("Base", "मूल"), ("Guṇa", "गुण"), ("Vṛddhi", "वृद्धि")],
                [["अ", "अ", "आ"], ["इ / ई", "ए", "ऐ"], ["उ / ऊ", "ओ", "औ"], ["ऋ", "अर्", "आर्"]],
            ),
            examples(
                ex("राघवः", "Rāghava — a descendant of Raghu (a → ā, u → av)", "राघव — रघु का वंशज",
                   check=tad("रघु", "aR")),
                ex("पाण्डवः", "Pāṇḍava — a son of Pāṇḍu", "पाण्डव — पाण्डु का पुत्र", check=tad("पाण्डु", "aR")),
                ex("वैष्णवः", "Vaiṣṇava — a follower of Viṣṇu (i → ai)", "वैष्णव — विष्णु का उपासक (इ → ऐ)",
                   check=tad("विष्णु", "aR")),
                ex("गौरवम्", "gaurava — dignity, from guru (u → au)", "गौरव — गुरु होने का भाव (उ → औ)",
                   check=tad("गुरु", "aR", "Napumsaka")),
                ex("भवति", "“becomes” — the ū of bhū grows to o, then av", "'होता है' — भू का ऊ पहले ओ, फिर अव् बनता है",
                   check=tin("भू")),
                title=("One word, grown", "एक शब्द, बढ़ा हुआ"),
            ),
            analogy("Like good, better, best — three grades of one idea. Sanskrit does it inside the vowel.",
                    "जैसे 'अच्छा, और अच्छा, सबसे अच्छा' — एक ही बात के तीन स्तर। संस्कृत यही काम स्वर के भीतर करता है।"),
        ],
        deeper=[
            go_deeper(
                ("Guṇa is also a sandhi", "गुण एक सन्धि भी है"),
                text("When a meets i or u where two words join, they merge into the guṇa vowel: "
                     "{{नर}} + {{इन्द्रः}} → {{नरेन्द्रः}}, {{गण}} + {{ईशः}} → {{गणेशः}}. That is why so many "
                     "Indian names contain e and o.",
                     "जब दो शब्दों के मिलने पर अ के बाद इ या उ आए, तो दोनों मिलकर गुण स्वर बन जाते हैं: "
                     "{{नर}} + {{इन्द्रः}} → {{नरेन्द्रः}}, {{गण}} + {{ईशः}} → {{गणेशः}}। इसीलिए इतने भारतीय "
                     "नामों में ए और ओ मिलते हैं।"),
            ),
        ],
        quiz=[
            q(("What is the guṇa of {{उ}}?", "{{उ}} का गुण क्या है?"),
              [opt_sa("ओ"), opt_sa("औ"), opt_sa("ऊ")],
              0,
              ("u → o is guṇa; au is vṛddhi.", "उ → ओ गुण है; औ वृद्धि है।")),
            q(("{{शिव}} → {{शैव}} is which step?", "{{शिव}} → {{शैव}} कौन-सी सीढ़ी है?"),
              [opt("Vṛddhi: i → ai", "वृद्धि: इ → ऐ"), opt("Guṇa: i → e", "गुण: इ → ए"),
               opt("No change", "कोई बदलाव नहीं")],
              0,
              ("ai is the top grade of i.", "ऐ, इ का सबसे ऊँचा रूप है।")),
        ],
        terms=("guna", "vrddhi"),
        related=("vowels",),
    ),
]
