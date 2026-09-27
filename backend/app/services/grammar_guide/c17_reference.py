"""Chapter 17 · Quick reference — case endings, verb endings, pronouns, sandhi
on one page, and a suffix finder. Every cell repeats a form already checked
elsewhere in the guide, and is checked again here."""

from __future__ import annotations

from ._families_common import CASE_ROWS, noun_table, verb_table
from .model import (
    cell, chapter, krd, sub, snd, table, tad, tc, text, tin, tip, topic,
)

CHAPTER = chapter(
    "reference",
    title=("Quick reference", "त्वरित सन्दर्भ"),
    title_sa="सारः",
    blurb=("The tables you will come back to: endings, pronouns, sandhi and suffixes.",
           "बार-बार देखी जाने वाली तालिकाएँ: प्रत्यय, सर्वनाम, सन्धि और शब्द-रचना।"),
    icon="document-text-outline",
)

_P = dict(linga="Pum", vibhakti="Prathama", vacana="Eka")
_N = dict(linga="Napumsaka", vibhakti="Prathama", vacana="Eka")

_SINGULAR = [
    "देवः फलम् लता", "देवम् फलम् लताम्", "देवेन फलेन लतया", "देवाय फलाय लतायै",
    "देवात् फलात् लतायाः", "देवस्य फलस्य लतायाः", "देवे फले लतायाम्", "देव फल लते",
]
_PLURAL = [
    "देवाः फलानि लताः", "देवान् फलानि लताः", "देवैः फलैः लताभिः", "देवेभ्यः फलेभ्यः लताभ्यः",
    "देवेभ्यः फलेभ्यः लताभ्यः", "देवानाम् फलानाम् लतानाम्", "देवेषु फलेषु लतासु", "देवाः फलानि लताः",
]
_STEMS = (("देव", "Pum"), ("फल", "Napumsaka"), ("लता", "Stri"))


def _three_genders(lines: list[str], number: str, caption: tuple[str, str]) -> dict:
    rows = []
    for ((en, hi), vibhakti), line in zip(CASE_ROWS, lines):
        rows.append([tc(en, hi)] + [cell(f, sub(stem, linga, vibhakti, number))
                                    for f, (stem, linga) in zip(line.split(), _STEMS)])
    return table(caption, [("Case", "विभक्ति"), ("देव · masc.", "देव · पुं."), ("फल · neut.", "फल · नपुं."),
                           ("लता · fem.", "लता · स्त्री.")], rows)


def _rule(en: str, hi: str, first: str, second: str, joined: str) -> list:
    return [tc(en, hi), cell(f"{first} + {second}"), cell(joined, snd(first, second))]


def _suffix(ending: str, ending_hi: str, en: str, hi: str, word: str, check: dict) -> list:
    return [tc(ending, ending_hi), tc(en, hi), cell(word, check)]


TOPICS = [
    topic(
        "ref-case-endings",
        level=1,
        title=("Case endings at a glance", "विभक्ति-प्रत्यय एक नज़र में"),
        title_sa="सुप्प्रत्ययाः",
        summary=("The three most common noun families — देव, फल, लता — in every case, singular and plural.",
                 "तीन सबसे आम शब्द-परिवार — देव, फल, लता — हर विभक्ति में, एकवचन और बहुवचन।"),
        blocks=[
            text("Most nouns you read follow one of these three columns. Find the column for your word's gender and "
                 "ending, then read down to the case you need.",
                 "पढ़ने में आने वाली ज़्यादातर संज्ञाएँ इन तीन स्तम्भों में से किसी एक पर चलती हैं। अपने शब्द के लिंग और अंत "
                 "का स्तम्भ चुनिए, फिर नीचे उस विभक्ति तक पढ़िए।"),
            _three_genders(_SINGULAR, "Eka", ("Singular — one", "एकवचन")),
            _three_genders(_PLURAL, "Bahu", ("Plural — many", "बहुवचन")),
            tip("Dual forms are few: देवौ, देवाभ्याम्, देवयोः cover all eight cases of देव.",
                "द्विवचन के रूप कम हैं: देवौ, देवाभ्याम्, देवयोः — देव की आठों विभक्तियाँ।"),
        ],
        feature_ids=("NOM.SG", "ACC.SG", "INSTR.SG", "DAT.SG", "ABL.SG", "GEN.SG", "LOC.SG", "VOC.SG"),
        related=("cases-overview", "a-masculine"),
    ),
    topic(
        "ref-verb-endings",
        level=1,
        title=("Verb endings at a glance", "क्रिया-प्रत्यय एक नज़र में"),
        title_sa="तिङ्प्रत्ययाः",
        summary=("The present tense in both ending sets, and पठ् in the five tenses and moods you will use most.",
                 "दोनों प्रत्यय-समूहों में वर्तमान काल, और सबसे ज़्यादा काम आने वाले पाँच लकारों में पठ्।"),
        blocks=[
            verb_table("पठ्", "Lat", ["पठति पठतः पठन्ति", "पठसि पठथः पठथ", "पठामि पठावः पठामः"],
                       ("-ti set — पठ् “read”, present", "परस्मैपद — पठ्, वर्तमान"), stem="पठ"),
            verb_table("सेव्", "Lat", ["सेवते सेवेते सेवन्ते", "सेवसे सेवेथे सेवध्वे", "सेवे सेवावहे सेवामहे"],
                       ("-te set — सेव् “serve”, present", "आत्मनेपद — सेव्, वर्तमान"), stem="सेव"),
            table(
                ("पठ् in five tenses — “he …”", "पाँच लकारों में पठ् — 'वह …'"),
                [("Tense or mood", "लकार"), ("Form", "रूप"), ("Meaning", "अर्थ")],
                [
                    [tc("present", "लट् — वर्तमान"), cell("पठति", tin("पठ्")), tc("he reads", "पढ़ता है")],
                    [tc("simple past", "लङ् — भूत"), cell("अपठत्", tin("पठ्", "Lan")), tc("he read", "पढ़ा")],
                    [tc("future", "लृट् — भविष्यत्"), cell("पठिष्यति", tin("पठ्", "Lrt")), tc("he will read", "पढ़ेगा")],
                    [tc("command", "लोट् — आज्ञा"), cell("पठतु", tin("पठ्", "Lot")), tc("let him read", "पढ़े")],
                    [tc("should", "विधिलिङ् — चाहिए"), cell("पठेत्", tin("पठ्", "VidhiLin")), tc("he should read", "पढ़ना चाहिए")],
                ],
            ),
        ],
        feature_ids=("PRES.3SG", "PRES.2SG", "PRES.1SG", "PRES.3PL", "IMPF.3SG", "FUT.3SG"),
        related=("verb-grid", "lakaras-overview"),
    ),
    topic(
        "ref-pronouns",
        level=1,
        title=("Pronouns at a glance", "सर्वनाम एक नज़र में"),
        title_sa="सर्वनामरूपाणि",
        summary=("I and you in every case, plus the everyday “he, she, it”, “who” and “which” words.",
                 "मैं और तुम हर विभक्ति में, साथ में रोज़ के 'वह', 'कौन' और 'जो' शब्द।"),
        blocks=[
            noun_table("अस्मद्", "Pum", [
                "अहम् आवाम् वयम्", "माम् आवाम् अस्मान्", "मया आवाभ्याम् अस्माभिः", "मह्यम् आवाभ्याम् अस्मभ्यम्",
                "मत् आवाभ्याम् अस्मत्", "मम आवयोः अस्माकम्", "मयि आवयोः अस्मासु",
            ], ("I · we two · we", "मैं · हम दो · हम"), highlight=False),
            noun_table("युष्मद्", "Pum", [
                "त्वम् युवाम् यूयम्", "त्वाम् युवाम् युष्मान्", "त्वया युवाभ्याम् युष्माभिः",
                "तुभ्यम् युवाभ्याम् युष्मभ्यम्", "त्वत् युवाभ्याम् युष्मत्", "तव युवयोः युष्माकम्",
                "त्वयि युवयोः युष्मासु",
            ], ("you · you two · you all", "तुम · तुम दो · तुम सब"), highlight=False),
            table(
                ("By gender — the doer form", "लिंग के अनुसार — कर्ता का रूप"),
                [("Word", "शब्द"), ("Masculine", "पुंलिंग"), ("Feminine", "स्त्रीलिंग"), ("Neuter", "नपुंसकलिंग")],
                [
                    [tc("he, she, it", "वह"), cell("सः", sub("तद्")), cell("सा", sub("तद्", "Stri")),
                     cell("तत्", sub("तद्", "Napumsaka"))],
                    [tc("who, what", "कौन, क्या"), cell("कः", sub("किम्")), cell("का", sub("किम्", "Stri")),
                     cell("किम्", sub("किम्", "Napumsaka"))],
                    [tc("who, which", "जो"), cell("यः", sub("यद्")), cell("या", sub("यद्", "Stri")),
                     cell("यत्", sub("यद्", "Napumsaka"))],
                ],
            ),
        ],
        related=("pronoun-i-we", "pronoun-he-she-it"),
    ),
    topic(
        "ref-sandhi",
        level=2,
        title=("Sandhi on one page", "एक पन्ने पर सन्धि"),
        title_sa="सन्धिसारः",
        summary=("Every rule from the sandhi chapter with one real example each.",
                 "सन्धि अध्याय का हर नियम, एक-एक असली उदाहरण के साथ।"),
        blocks=[
            table(
                ("Vowels", "स्वर सन्धि"),
                [("Rule", "नियम"), ("Parts", "भाग"), ("Joined", "जुड़ा रूप")],
                [
                    _rule("like vowels → long", "समान स्वर → दीर्घ", "विद्या", "आलयः", "विद्यालयः"),
                    _rule("a + i/u → e/o", "अ + इ/उ → ए/ओ", "नर", "इन्द्रः", "नरेन्द्रः"),
                    _rule("a + ṛ → ar", "अ + ऋ → अर्", "महा", "ऋषिः", "महर्षिः"),
                    _rule("a + e/o → ai/au", "अ + ए/ओ → ऐ/औ", "सदा", "एव", "सदैव"),
                    _rule("i/u/ṛ + vowel → y/v/r", "इ/उ/ऋ + स्वर → य्/व्/र्", "इति", "आदि", "इत्यादि"),
                    _rule("e + a → e’", "ए + अ → एऽ", "वने", "अत्र", "वनेऽत्र"),
                ],
            ),
            table(
                ("Visarga and consonants", "विसर्ग और व्यंजन सन्धि"),
                [("Rule", "नियम"), ("Parts", "भाग"), ("Joined", "जुड़ा रूप")],
                [
                    _rule("ḥ + t → st", "ः + त → स्त", "नमः", "ते", "नमस्ते"),
                    _rule("ḥ + c → śc", "ः + च → श्च", "रामः", "च", "रामश्च"),
                    _rule("-aḥ + soft → -o", "-अः + कोमल → -ओ", "रामः", "गच्छति", "रामो गच्छति"),
                    _rule("-aḥ + a → -o’", "-अः + अ → -ओऽ", "सः", "अहम्", "सोऽहम्"),
                    _rule("-iḥ + soft → -ir", "-इः + कोमल → -इर्", "हरिः", "गच्छति", "हरिर्गच्छति"),
                    _rule("-aḥ + other vowel → -a", "-अः + अन्य स्वर → -अ", "रामः", "इति", "राम इति"),
                    _rule("t + vowel → d", "त् + स्वर → द्", "जगत्", "ईशः", "जगदीशः"),
                    _rule("t + j → jj", "त् + ज → ज्ज", "सत्", "जनः", "सज्जनः"),
                    _rule("t + n → nn", "त् + न → न्न", "जगत्", "नाथः", "जगन्नाथः"),
                    _rule("m + consonant → ṃ", "म् + व्यंजन → ं", "सम्", "सारः", "संसारः"),
                ],
            ),
        ],
        feature_ids=("VOWEL-SANDHI", "VISARGA-SANDHI", "CONSONANT-SANDHI", "ANUSVARA-SANDHI"),
        related=("sandhi-why", "sandhi-splitting"),
    ),
    topic(
        "ref-suffixes",
        level=2,
        title=("Suffix finder", "प्रत्यय-खोजक"),
        title_sa="प्रत्ययसारः",
        summary=("See an ending you don't recognise? Look it up here: what it makes, with an example.",
                 "कोई अनजाना अंत दिखा? यहाँ देखिए: वह क्या बनाता है, उदाहरण के साथ।"),
        blocks=[
            table(
                ("Endings on verb roots", "धातु पर लगने वाले प्रत्यय"),
                [("Ending", "प्रत्यय"), ("Makes", "बनाता है"), ("Example", "उदाहरण")],
                [
                    _suffix("-tvā", "-त्वा", "having done", "करके", "गत्वा", krd("गम्", "ktvA")),
                    _suffix("-ya", "-य", "having done, after a prefix", "करके, उपसर्ग के बाद", "आगत्य",
                            krd("गम्", "ktvA", prefixes=["आ"])),
                    _suffix("-tum", "-तुम्", "to do", "करने के लिए", "गन्तुम्", krd("गम्", "tumun")),
                    _suffix("-ta", "-त", "done, gone", "किया हुआ, गया हुआ", "गतः", krd("गम्", "kta", **_P)),
                    _suffix("-tavat", "-तवत्", "has done", "कर चुका", "गतवान्", krd("गम्", "ktavatu", **_P)),
                    _suffix("-at", "-अत्", "doing", "करता हुआ", "पठन्", krd("पठ्", "Satf", **_P)),
                    _suffix("-māna", "-मान", "doing (-te verbs)", "करता हुआ (आत्मनेपद)", "वर्धमानः", krd("वृध्", "SAnac", **_P)),
                    _suffix("-tavya", "-तव्य", "should be done", "करना चाहिए", "कर्तव्यम्", krd("कृ", "tavya", **_N)),
                    _suffix("-anīya", "-अनीय", "worth doing", "करने योग्य", "दर्शनीयम्", krd("दृश्", "anIyar", **_N)),
                    _suffix("-tṛ", "-तृ", "the doer", "करने वाला", "कर्ता", krd("कृ", "tfc", **_P)),
                    _suffix("-aka", "-अक", "the doer", "करने वाला", "पाठकः", krd("पठ्", "Rvul", **_P)),
                    _suffix("-ana", "-अन", "the action", "क्रिया का नाम", "भोजनम्", krd("भुज्", "lyuw", **_N)),
                    _suffix("-ya- -te", "-य- -ते", "is done (passive)", "किया जाता है (कर्मवाच्य)", "पठ्यते",
                            tin("पठ्", prayoga="Karmani")),
                    _suffix("-aya-", "-अय-", "makes someone do", "करवाता है", "पाठयति", tin("पठ्", sanadi=["Nic"])),
                ],
            ),
            table(
                ("Endings on nouns", "संज्ञा पर लगने वाले प्रत्यय"),
                [("Ending", "प्रत्यय"), ("Makes", "बनाता है"), ("Example", "उदाहरण")],
                [
                    _suffix("-a with vṛddhi", "-अ, वृद्धि के साथ", "son of, follower of", "पुत्र, अनुयायी", "राघवः", tad("रघु", "aR")),
                    _suffix("-eya", "-एय", "son of (a mother)", "माता का पुत्र", "कौन्तेयः", tad("कुन्ती", "Qak")),
                    _suffix("-tva", "-त्व", "-ness (neuter)", "-पन (नपुंसक)", "देवत्वम्", tad("देव", "tva", "Napumsaka")),
                    _suffix("-tā", "-ता", "-ness (feminine)", "-पन (स्त्री)", "मित्रता", tad("मित्र", "tal", "Stri")),
                    _suffix("-vat / -mat", "-वत् / -मत्", "having", "वाला", "धनवान्", tad("धन", "matup")),
                    _suffix("-ika", "-इक", "related to", "से सम्बन्धित", "धार्मिकः", tad("धर्म", "Wak")),
                    _suffix("-tara", "-तर", "more", "अधिक", "प्रियतरः", tad("प्रिय", "tarap")),
                    _suffix("-tama", "-तम", "most", "सबसे अधिक", "प्रियतमः", tad("प्रिय", "tamap")),
                    _suffix("-iṣṭha", "-इष्ठ", "most (older set)", "सबसे (पुराना ढर्रा)", "श्रेष्ठः", tad("प्रशस्य", "izWan")),
                ],
            ),
        ],
        related=("ktva-lyap", "son-of-names"),
    ),
]
