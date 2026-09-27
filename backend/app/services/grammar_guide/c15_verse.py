"""Chapter 15 · Verse & rhythm — light and heavy syllables, the śloka, and
Piṅgala's counting of patterns. Every weight pattern shown was produced by
the scansion engine; it does not name metres reliably, so the metre rules
are taught here and never attributed to it."""

from __future__ import annotations

from .model import (
    cell, chapter, ex, fact, go_deeper, opt, proof, q, src, table, tc, text, tip, topic, watch,
    wild,
)

CHAPTER = chapter(
    "verse",
    title=("Verse & rhythm", "छन्द और लय"),
    title_sa="छन्दः",
    blurb=("Light and heavy syllables, the śloka, and the counting behind every metre.",
           "लघु और गुरु अक्षर, श्लोक, और हर छन्द के पीछे की गिनती।"),
    icon="musical-notes-outline",
)


def _pattern(weights: str) -> dict:
    """``"GGLG"`` → a text cell reading “H H L H” / “गु गु ल गु”."""
    return tc(" ".join("H" if c == "G" else "L" for c in weights),
              " ".join("गु" if c == "G" else "ल" for c in weights))


TOPICS = [
    topic(
        "light-heavy",
        level=2,
        title=("Light and heavy syllables", "लघु और गुरु अक्षर"),
        title_sa="लघुगुरू",
        summary=("A syllable is heavy if its vowel is long, or if ṃ, ḥ or two consonants follow. Otherwise it is light.",
                 "अक्षर गुरु है यदि उसका स्वर दीर्घ हो, या उसके बाद ं, ः या दो व्यंजन हों। नहीं तो लघु।"),
        term=("गुरुः", "a heavy syllable — two beats", "गुरु अक्षर — दो मात्राएँ"),
        blocks=[
            text("Sanskrit verse is built from time, not stress. A **light** syllable takes one beat, a **heavy** one two. "
                 "A syllable is heavy when its vowel is long (ā ī ū e ai o au), or when its short vowel is followed by "
                 "ṃ, ḥ, or two consonants.",
                 "संस्कृत पद्य समय (मात्रा) से बनता है, ज़ोर से नहीं। **लघु** अक्षर एक मात्रा का, **गुरु** दो का। अक्षर गुरु है "
                 "जब उसका स्वर दीर्घ हो (आ ई ऊ ए ऐ ओ औ), या उसके ह्रस्व स्वर के बाद ं, ः या दो व्यंजन आएँ।"),
            table(
                ("Weighing words", "शब्दों को तौलिए"),
                [("Word", "शब्द"), ("Pattern", "क्रम"), ("Why", "क्यों")],
                [
                    [cell("गुरु"), _pattern("LL"), tc("two short vowels", "दो ह्रस्व स्वर")],
                    [cell("राम"), _pattern("GL"), tc("rā has a long vowel", "रा में दीर्घ स्वर")],
                    [cell("रामः"), _pattern("GG"), tc("ḥ makes the last syllable heavy", "ः अंतिम अक्षर को गुरु बनाता है")],
                    [cell("धर्म"), _pattern("GL"), tc("a short a, but r + m follow", "ह्रस्व अ, पर बाद में र् + म")],
                    [cell("नमस्ते"), _pattern("LGG"), tc("ma is heavy before s + t", "स् + त से पहले म गुरु")],
                    [cell("संस्कृतम्"), _pattern("GLL"), tc("saṃ is heavy because of ṃ", "सं अनुस्वार के कारण गुरु")],
                ],
            ),
            tip("This is the मात्रा count of Hindi poetry: laghu = 1, guru = 2. A doha is counted exactly this way.",
                "यही हिन्दी कविता की मात्रा-गणना है: लघु = 1, गुरु = 2। दोहा ठीक इसी तरह गिना जाता है।"),
            watch("A short vowel can make a heavy syllable. In {{धर्म}} the a is short, yet the syllable is heavy because "
                  "two consonants follow.",
                  "ह्रस्व स्वर भी गुरु अक्षर बना सकता है। {{धर्म}} में अ ह्रस्व है, फिर भी अक्षर गुरु है क्योंकि बाद में दो "
                  "व्यंजन हैं।"),
        ],
        quiz=[
            q(("Which syllable of {{नमस्ते}} is heavy even though its vowel is short?",
               "{{नमस्ते}} का कौन-सा अक्षर ह्रस्व स्वर होते हुए भी गुरु है?"),
              [opt("ma — two consonants follow", "म — बाद में दो व्यंजन"), opt("na — the first one", "न — पहला"),
               opt("none of them", "कोई नहीं")],
              0,
              ("s + t after ma make it heavy.", "म के बाद स् + त उसे गुरु बनाते हैं।")),
        ],
        proofs=[
            proof("scansion", ("Weigh a Gītā line", "गीता की एक पंक्ति तौलिए"),
                  text="धर्मक्षेत्रे कुरुक्षेत्रे समवेता युयुत्सवः"),
        ],
        terms=("laghu-guru", "chandas", "akshara"),
        related=("shloka", "conjuncts"),
    ),
    topic(
        "shloka",
        level=2,
        title=("The śloka: 4 × 8", "श्लोक: 4 × 8"),
        title_sa="अनुष्टुप्",
        summary=("Four quarters of eight syllables. The 5th is light, the 6th heavy, and the 7th alternates.",
                 "आठ-आठ अक्षरों के चार चरण। पाँचवाँ लघु, छठा गुरु, और सातवाँ बारी-बारी से।"),
        term=("अनुष्टुप्", "the śloka metre", "अनुष्टुप् छन्द"),
        blocks=[
            text("Most of the Gītā, the Rāmāyaṇa and the Mahābhārata is in one metre, the **śloka**. It has four "
                 "quarters of eight syllables. Only three positions are fixed: the 5th is light, the 6th heavy, and the "
                 "7th is heavy in quarters 1 and 3 but light in 2 and 4.",
                 "गीता, रामायण और महाभारत का अधिकांश भाग एक ही छन्द, **श्लोक**, में है। इसमें आठ-आठ अक्षरों के चार चरण "
                 "होते हैं। केवल तीन स्थान तय हैं: पाँचवाँ लघु, छठा गुरु, और सातवाँ पहले-तीसरे चरण में गुरु पर दूसरे-चौथे में लघु।"),
            table(
                ("Gītā 1.1, quarter by quarter", "गीता 1.1, चरण-दर-चरण"),
                [("Quarter", "चरण"), ("Pattern", "क्रम"), ("Syllables 5 · 6 · 7", "अक्षर ५ · ६ · ७")],
                [
                    [cell("धर्मक्षेत्रे कुरुक्षेत्रे"), _pattern("GGGGLGGG"), tc("light · heavy · heavy", "ल · गु · गु")],
                    [cell("समवेता युयुत्सवः"), _pattern("LLGGLGLG"), tc("light · heavy · light", "ल · गु · ल")],
                    [cell("मामकाः पाण्डवाश्चैव"), _pattern("GLGGLGGL"), tc("light · heavy · heavy", "ल · गु · गु")],
                    [cell("किमकुर्वत सञ्जय"), _pattern("LLGLLGLL"), tc("light · heavy · light", "ल · गु · ल")],
                ],
                note=("The last syllable of a quarter may be either weight.", "चरण का अंतिम अक्षर लघु या गुरु, कुछ भी हो सकता है।"),
            ),
            wild(
                ex("श्लोके षष्ठं गुरु ज्ञेयं सर्वत्र लघु पञ्चमम्। द्विचतुष्पादयोर्ह्रस्वं सप्तमं दीर्घमन्ययोः॥",
                   "In a śloka the sixth is heavy and the fifth always light; the seventh is short in quarters two and four, long in the others.",
                   "श्लोक में छठा अक्षर गुरु और पाँचवाँ सदा लघु जानो; सातवाँ दूसरे-चौथे चरण में ह्रस्व, बाकी दो में दीर्घ।",
                   source=src("Traditional definition of the śloka", "श्लोक का पारम्परिक लक्षण")),
                ex("मा निषाद प्रतिष्ठां त्वमगमः शाश्वतीः समाः।",
                   "O hunter, may you find no rest for endless years.", "हे निषाद, तुम्हें अनन्त वर्षों तक प्रतिष्ठा न मिले।",
                   source=src("Vālmīki Rāmāyaṇa, Bālakāṇḍa 2.15 — told as the first śloka", "वाल्मीकि रामायण, बालकाण्ड 2.15 — आदि-श्लोक")),
            ),
            fact("The definition verse obeys its own rule: scan it and the 5th, 6th and 7th syllables fall exactly where "
                 "it says.",
                 "लक्षण-श्लोक स्वयं अपने नियम का पालन करता है: तौलिए, पाँचवाँ, छठा और सातवाँ अक्षर ठीक वहीं पड़ते हैं जहाँ वह कहता है।"),
        ],
        quiz=[
            q(("In every quarter of a śloka, the 6th syllable is…", "श्लोक के हर चरण में छठा अक्षर…"),
              [opt("heavy", "गुरु"), opt("light", "लघु"), opt("either", "कुछ भी")],
              0,
              ("षष्ठं गुरु — the 6th is always heavy.", "षष्ठं गुरु — छठा सदा गुरु।")),
        ],
        proofs=[
            proof("scansion", ("Scan the first śloka", "आदि-श्लोक को तौलिए"), text="मा निषाद प्रतिष्ठां त्वमगमः शाश्वतीः समाः"),
        ],
        terms=("anushtubh", "laghu-guru"),
        related=("pingala-binary",),
    ),
    topic(
        "pingala-binary",
        level=3,
        title=("Piṅgala's patterns", "पिंगल के प्रस्तार"),
        title_sa="प्रस्तारः",
        summary=("With two kinds of syllable, three syllables make 8 patterns — Piṅgala named each with one letter.",
                 "दो तरह के अक्षरों से तीन अक्षर 8 क्रम बनाते हैं — पिंगल ने हर एक को एक अक्षर का नाम दिया।"),
        term=("गणः", "a group of three syllables", "गण — तीन अक्षरों का समूह"),
        blocks=[
            text("Piṅgala's {{छन्दःशास्त्रम्}}, over two thousand years old, treats every metre as a string of two "
                 "symbols, light and heavy. He showed how to list all patterns of a given length and how many there "
                 "are: each extra syllable doubles them, so three syllables give eight.",
                 "पिंगल का {{छन्दःशास्त्रम्}}, जो दो हज़ार वर्ष से भी पुराना है, हर छन्द को दो चिह्नों — लघु और गुरु — की लड़ी "
                 "मानता है। उन्होंने बताया कि किसी लम्बाई के सारे क्रम कैसे गिनाएँ और वे कितने हैं: हर नया अक्षर उन्हें दुगना "
                 "करता है, इसलिए तीन अक्षर आठ क्रम देते हैं।"),
            table(
                ("The eight groups of three", "तीन अक्षरों के आठ गण"),
                [("Group", "गण"), ("Pattern", "क्रम"), ("Read it in", "कहाँ से")],
                [
                    [cell("य"), _pattern("LGG"), cell("यमाता")],
                    [cell("म"), _pattern("GGG"), cell("मातारा")],
                    [cell("त"), _pattern("GGL"), cell("ताराज")],
                    [cell("र"), _pattern("GLG"), cell("राजभा")],
                    [cell("ज"), _pattern("LGL"), cell("जभान")],
                    [cell("भ"), _pattern("GLL"), cell("भानस")],
                    [cell("न"), _pattern("LLL"), cell("नसल")],
                    [cell("स"), _pattern("LLG"), cell("सलगा")],
                ],
                note=("Every group is the letter and the two syllables after it in {{यमाताराजभानसलगाः}}.",
                      "हर गण {{यमाताराजभानसलगाः}} में वह अक्षर और उसके बाद के दो अक्षर है।"),
            ),
            tip("The memory word {{यमाताराजभानसलगाः}} contains all eight patterns, each starting one syllable later.",
                "स्मरण-शब्द {{यमाताराजभानसलगाः}} में आठों क्रम हैं, हर एक पिछले से एक अक्षर आगे शुरू होता है।"),
        ],
        deeper=[
            go_deeper(
                ("A triangle of numbers", "संख्याओं का त्रिकोण"),
                text("To count how many patterns have exactly one, two or three heavy syllables, Halāyudha's tenth-century "
                     "commentary on Piṅgala draws a triangle of numbers, the {{मेरुप्रस्तारः}}, in which each number is "
                     "the sum of the two above it. Europe knows the same figure as Pascal's triangle, from the "
                     "seventeenth century.",
                     "यह गिनने के लिए कि कितने क्रमों में ठीक एक, दो या तीन गुरु हों, पिंगल पर हलायुध की दसवीं शताब्दी की टीका "
                     "संख्याओं का एक त्रिकोण, {{मेरुप्रस्तारः}}, बनाती है, जिसमें हर संख्या ऊपर की दो संख्याओं का जोड़ है। यूरोप "
                     "इसी आकृति को सत्रहवीं शताब्दी के पास्कल त्रिकोण के नाम से जानता है।"),
                level=3,
            ),
        ],
        quiz=[
            q(("How many light/heavy patterns do four syllables make?", "चार अक्षर लघु-गुरु के कितने क्रम बनाते हैं?"),
              [opt("16", "१६"), opt("8", "८"), opt("12", "१२")],
              0,
              ("Each syllable doubles the count: 2 × 2 × 2 × 2.", "हर अक्षर गिनती दुगनी करता है: 2 × 2 × 2 × 2।")),
        ],
        proofs=[
            proof("scansion", ("Scan the memory word", "स्मरण-शब्द को तौलिए"), text="यमाताराजभानसलगाः"),
        ],
        terms=("chandas", "laghu-guru"),
        related=("light-heavy",),
    ),
]
