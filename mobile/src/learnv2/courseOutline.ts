// Chapter identities and curriculum links from the existing guide and 49 released seed lessons.
// Feature placement selects a home chapter; it does not award or transfer mastery.
import type { Loc } from "../api/client";

export interface CourseChapter {
  id: string; title: Loc; titleSa: string; blurb: Loc; topicIds: string[]; featureIds: string[];
}

export const COURSE_CHAPTERS: CourseChapter[] = [
  {
    "id": "start",
    "title": {
      "en": "Start here",
      "hi": "यहाँ से शुरू करें"
    },
    "titleSa": "आरम्भः",
    "blurb": {
      "en": "What Sanskrit grammar is, and how to read this guide.",
      "hi": "संस्कृत व्याकरण क्या है, और इस गाइड को कैसे पढ़ें।"
    },
    "topicIds": [
      "how-it-works",
      "reading-roman"
    ],
    "featureIds": []
  },
  {
    "id": "sounds",
    "title": {
      "en": "Sounds & script",
      "hi": "ध्वनि और लिपि"
    },
    "titleSa": "वर्णाः",
    "blurb": {
      "en": "An alphabet laid out like a map of your mouth.",
      "hi": "एक वर्णमाला जो आपके मुँह के नक्शे की तरह सजी है।"
    },
    "topicIds": [
      "vowels",
      "consonants",
      "anusvara-visarga",
      "conjuncts",
      "guna-vrddhi"
    ],
    "featureIds": [
      "SG"
    ]
  },
  {
    "id": "nouns",
    "title": {
      "en": "Nouns",
      "hi": "संज्ञा"
    },
    "titleSa": "नामपदानि",
    "blurb": {
      "en": "Stems, endings, gender and number — how a noun is built.",
      "hi": "मूल शब्द, विभक्ति, लिंग और वचन — संज्ञा कैसे बनती है।"
    },
    "topicIds": [
      "stem-ending",
      "gender",
      "number",
      "agreement"
    ],
    "featureIds": [
      "DU",
      "NEUT",
      "MASC",
      "PL",
      "FEM"
    ]
  },
  {
    "id": "cases",
    "title": {
      "en": "The 8 cases",
      "hi": "आठ विभक्तियाँ"
    },
    "titleSa": "विभक्तयः",
    "blurb": {
      "en": "How an ending tells you who did what, to whom, with what, and where.",
      "hi": "अंत कैसे बताता है कि किसने, किसको, किससे, कहाँ क्या किया।"
    },
    "topicIds": [
      "cases-overview",
      "nominative-vocative",
      "accusative",
      "instrumental",
      "dative",
      "ablative",
      "genitive",
      "locative",
      "upapada",
      "karaka"
    ],
    "featureIds": [
      "NOM.SG",
      "ACC.SG",
      "INSTR.SG",
      "DAT.SG",
      "ABL.SG",
      "GEN.SG",
      "LOC.SG",
      "VOC.SG",
      "NOM.PL",
      "GEN.PL",
      "NOM.DU",
      "ACC.DU",
      "ACC.PL",
      "LOC.PL",
      "KARAKA-KARTR",
      "KARAKA-KARMA",
      "KARAKA-KARANA",
      "KARAKA-SAMPRADANA",
      "KARAKA-APADANA",
      "KARAKA-ADHIKARANA"
    ]
  },
  {
    "id": "families",
    "title": {
      "en": "Noun families",
      "hi": "शब्दरूप"
    },
    "titleSa": "शब्दरूपाणि",
    "blurb": {
      "en": "Full tables for every common kind of noun, each form checked.",
      "hi": "हर आम प्रकार की संज्ञा की पूरी तालिका, हर रूप जाँचा हुआ।"
    },
    "topicIds": [
      "a-masculine",
      "a-neuter",
      "aa-feminine",
      "i-stems",
      "u-stems",
      "ii-uu-feminine",
      "r-stems",
      "consonant-stems",
      "odd-nouns"
    ],
    "featureIds": []
  },
  {
    "id": "pronouns",
    "title": {
      "en": "Pronouns & numbers",
      "hi": "सर्वनाम और संख्या"
    },
    "titleSa": "सर्वनामानि सङ्ख्याश्च",
    "blurb": {
      "en": "I, you, he, this, who — and how to count in Sanskrit.",
      "hi": "मैं, तुम, वह, यह, कौन — और संस्कृत में गिनती।"
    },
    "topicIds": [
      "pronoun-i-we",
      "pronoun-you",
      "pronoun-he-she-it",
      "pronoun-this-that",
      "pronoun-who-which",
      "polite-you",
      "numbers-1-10",
      "numbers-big-time"
    ],
    "featureIds": []
  },
  {
    "id": "verbs",
    "title": {
      "en": "Verbs",
      "hi": "क्रिया"
    },
    "titleSa": "क्रियापदानि",
    "blurb": {
      "en": "Roots, endings, the nine-form grid and the ten verb classes.",
      "hi": "धातु, प्रत्यय, नौ रूपों की सारणी और दस गण।"
    },
    "topicIds": [
      "verb-anatomy",
      "verb-grid",
      "two-endings",
      "verb-classes",
      "to-be"
    ],
    "featureIds": [
      "PRES.3SG",
      "PRES.1SG",
      "PRES.1DU",
      "ATMANEPADA",
      "PRES.1PL",
      "PRES.2PL",
      "PRES.3PL",
      "PRES.3DU",
      "PARASMAIPADA"
    ]
  },
  {
    "id": "tenses",
    "title": {
      "en": "Tenses & moods",
      "hi": "काल और भाव"
    },
    "titleSa": "लकाराः",
    "blurb": {
      "en": "Present, command, past, future — and the rarer six.",
      "hi": "वर्तमान, आज्ञा, भूत, भविष्यत् — और बाकी छह लकार।"
    },
    "topicIds": [
      "lakaras-overview",
      "present-tense",
      "command-mood",
      "simple-past",
      "future-tense",
      "should-may",
      "story-past",
      "aorist-rare"
    ],
    "featureIds": [
      "IMP.2PL",
      "IMPF.3SG",
      "FUT.1SG",
      "IMP.2SG",
      "FUT.3SG"
    ]
  },
  {
    "id": "small-words",
    "title": {
      "en": "Small words",
      "hi": "अव्यय"
    },
    "titleSa": "अव्ययानि",
    "blurb": {
      "en": "And, also, here, today, not — words that never change.",
      "hi": "और, भी, यहाँ, आज, नहीं — कभी न बदलने वाले शब्द।"
    },
    "topicIds": [
      "indeclinables",
      "joining-words",
      "question-place-time",
      "na-ma",
      "iti"
    ],
    "featureIds": [
      "INDECL"
    ]
  },
  {
    "id": "sentences",
    "title": {
      "en": "Sentences",
      "hi": "वाक्य"
    },
    "titleSa": "वाक्यम्",
    "blurb": {
      "en": "Word order, agreement, questions and clauses — putting words together.",
      "hi": "शब्द-क्रम, मेल, प्रश्न और उपवाक्य — शब्दों को जोड़कर वाक्य बनाना।"
    },
    "topicIds": [
      "word-order",
      "subject-verb",
      "questions",
      "relative-clauses",
      "participle-clauses"
    ],
    "featureIds": []
  },
  {
    "id": "sandhi",
    "title": {
      "en": "Sandhi: sounds that merge",
      "hi": "सन्धि: मिलती ध्वनियाँ"
    },
    "titleSa": "सन्धिः",
    "blurb": {
      "en": "Why विद्या + आलय becomes विद्यालय — and how to take joins apart again.",
      "hi": "विद्या + आलय विद्यालय क्यों बनता है — और जुड़े शब्दों को फिर से कैसे अलग करें।"
    },
    "topicIds": [
      "sandhi-why",
      "sandhi-long-vowels",
      "sandhi-guna",
      "sandhi-vrddhi",
      "sandhi-yan",
      "sandhi-ayadi",
      "sandhi-visarga",
      "sandhi-consonants",
      "sandhi-splitting"
    ],
    "featureIds": [
      "VOWEL-SANDHI",
      "VISARGA-SANDHI",
      "ANUSVARA-SANDHI",
      "CONSONANT-SANDHI"
    ]
  },
  {
    "id": "compounds",
    "title": {
      "en": "Compounds",
      "hi": "समास"
    },
    "titleSa": "समासाः",
    "blurb": {
      "en": "पीताम्बर, राजपुरुष, यथाशक्ति — how Sanskrit packs a phrase into one word.",
      "hi": "पीताम्बर, राजपुरुष, यथाशक्ति — संस्कृत एक वाक्यांश को एक शब्द में कैसे समेटती है।"
    },
    "topicIds": [
      "compounds-intro",
      "dvandva",
      "tatpurusha",
      "karmadharaya-dvigu",
      "nan-upapada",
      "bahuvrihi",
      "avyayibhava",
      "long-compounds"
    ],
    "featureIds": [
      "SAMASA-DVANDVA",
      "SAMASA-TATPURUSA",
      "SAMASA-BAHUVRIHI",
      "SAMASA-AVYAYIBHAVA"
    ]
  },
  {
    "id": "krdanta",
    "title": {
      "en": "Verb-made words",
      "hi": "धातु से बने शब्द"
    },
    "titleSa": "कृदन्ताः",
    "blurb": {
      "en": "“Having gone”, “to go”, “gone”, “going”, “goer” — one root, many words.",
      "hi": "'जाकर', 'जाने के लिए', 'गया', 'जाता हुआ', 'जाने वाला' — एक धातु, अनेक शब्द।"
    },
    "topicIds": [
      "ktva-lyap",
      "tumun",
      "kta-ktavatu",
      "present-participles",
      "gerundives",
      "doer-action-nouns"
    ],
    "featureIds": []
  },
  {
    "id": "voice",
    "title": {
      "en": "Prefixes & voice",
      "hi": "उपसर्ग और वाच्य"
    },
    "titleSa": "उपसर्गाः वाच्यानि च",
    "blurb": {
      "en": "आ-गच्छति, पठ्-य-ते, गम्-अय-ति — small additions that change who does what.",
      "hi": "आ-गच्छति, पठ्-य-ते, गम्-अय-ति — छोटे जोड़ जो अर्थ और कर्ता बदल देते हैं।"
    },
    "topicIds": [
      "prefixes",
      "passive",
      "causative",
      "desiderative"
    ],
    "featureIds": []
  },
  {
    "id": "taddhita",
    "title": {
      "en": "Word-making suffixes",
      "hi": "शब्द बनाने वाले प्रत्यय"
    },
    "titleSa": "तद्धिताः",
    "blurb": {
      "en": "रघु → राघव, धर्म → धार्मिक, बुद्धि → बुद्धिमान् — new words from old nouns.",
      "hi": "रघु → राघव, धर्म → धार्मिक, बुद्धि → बुद्धिमान् — पुरानी संज्ञाओं से नए शब्द।"
    },
    "topicIds": [
      "son-of-names",
      "tva-ta",
      "vat-mat",
      "ika",
      "comparison",
      "feminine-suffixes"
    ],
    "featureIds": []
  },
  {
    "id": "verse",
    "title": {
      "en": "Verse & rhythm",
      "hi": "छन्द और लय"
    },
    "titleSa": "छन्दः",
    "blurb": {
      "en": "Light and heavy syllables, the śloka, and the counting behind every metre.",
      "hi": "लघु और गुरु अक्षर, श्लोक, और हर छन्द के पीछे की गिनती।"
    },
    "topicIds": [
      "light-heavy",
      "shloka",
      "pingala-binary"
    ],
    "featureIds": []
  },
  {
    "id": "panini",
    "title": {
      "en": "Pāṇini's system",
      "hi": "पाणिनि की व्यवस्था"
    },
    "titleSa": "पाणिनीयम्",
    "blurb": {
      "en": "Four thousand short rules that generate Sanskrit — and how to read them.",
      "hi": "चार हज़ार छोटे नियम जो संस्कृत शब्द रचते हैं — और उन्हें कैसे पढ़ें।"
    },
    "topicIds": [
      "ashtadhyayi",
      "shiva-sutras",
      "reading-derivation"
    ],
    "featureIds": []
  },
  {
    "id": "reference",
    "title": {
      "en": "Quick reference",
      "hi": "त्वरित सन्दर्भ"
    },
    "titleSa": "सारः",
    "blurb": {
      "en": "The tables you will come back to: endings, pronouns, sandhi and suffixes.",
      "hi": "बार-बार देखी जाने वाली तालिकाएँ: प्रत्यय, सर्वनाम, सन्धि और शब्द-रचना।"
    },
    "topicIds": [
      "ref-case-endings",
      "ref-verb-endings",
      "ref-pronouns",
      "ref-sandhi",
      "ref-suffixes"
    ],
    "featureIds": []
  }
];
