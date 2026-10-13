// The Learn trail: 5 stages → 21 units → 97 lessons (owner-approved 2026-10-13,
// specs/learn-trail/STRUCTURE-DRAFT.md). Every Grammar guide topic and every
// graded Path lesson is placed here or in the Library; scripts/check-trail.cjs
// holds that line.
//
// A stop opens, in order of preference: its card lesson (`cards`, a LearnV2
// catalogue id), else its Grammar guide note (`topics[0]`), else an app tool.
// Unit practice is the old Path's server-graded lessons for `graded` features.

export interface TrailText { en: string; hi: string }

export type TrailTool =
  | { kind: "screen"; screen: "Varnamala" | "Writing" | "Pingala" | "Vocab" | "WordLab" | "WordOrder" }
  | { kind: "paradigm"; of: "noun" | "verb" }
  | { kind: "book"; bookKey: string };

export interface TrailLesson {
  id: string;
  title: TrailText;
  minutes: number;
  /** LearnV2 catalogue lesson id: the card lesson this stop plays. */
  cards?: string;
  /** Grammar guide topic ids this lesson is built from (first = its note). */
  topics: string[];
  /** Opened when there is neither a card lesson nor a note yet. */
  tool?: TrailTool;
}

export interface TrailUnit {
  id: string;
  n: number;
  title: TrailText;
  sa?: string;
  /** Painting: "path:<old unit id>" or "hub:<hub key>". */
  art: string;
  lessons: TrailLesson[];
  /** Old Path feature ids practised (server-graded) at the end of the unit. */
  graded: string[];
  /** A tool for units with no graded set. */
  practiceTool?: TrailTool;
}

export interface TrailStage {
  id: string;
  n: number;
  title: TrailText;
  sa: string;
  goal: TrailText;
  color: string;
  art: string;
  units: TrailUnit[];
}

const lesson = (id: string, en: string, hi: string, topics: string[], more: Partial<TrailLesson> = {}): TrailLesson =>
  ({ id, title: { en, hi }, minutes: 5, topics, ...more });

const VARNAMALA: TrailTool = { kind: "screen", screen: "Varnamala" };
const WRITING: TrailTool = { kind: "screen", screen: "Writing" };

export const TRAIL: TrailStage[] = [
  {
    id: "s1", n: 1, sa: "अक्षराणि", color: "#9A4A26", art: "path:u1",
    title: { en: "Letters & sounds", hi: "अक्षर और ध्वनियाँ" },
    goal: { en: "Read any Devanagari word aloud.", hi: "कोई भी देवनागरी शब्द ज़ोर से पढ़ सकें।" },
    units: [
      { id: "unit-1", n: 1, sa: "स्वराः", art: "hub:grammar:sounds", graded: [], practiceTool: VARNAMALA,
        title: { en: "Vowels", hi: "स्वर" },
        lessons: [
          lesson("unit-1-1", "Short and long vowels", "ह्रस्व और दीर्घ स्वर", ["vowels"]),
          lesson("unit-1-2", "ṛ, e, ai, o, au", "ऋ, ए, ऐ, ओ, औ", ["vowels"]),
          lesson("unit-1-3", "Vowel signs on letters", "अक्षरों पर मात्राएँ", [], { tool: WRITING }),
        ] },
      { id: "unit-2", n: 2, sa: "व्यञ्जनानि", art: "path:u1", graded: [], practiceTool: VARNAMALA,
        title: { en: "Consonants", hi: "व्यंजन" },
        lessons: [
          lesson("unit-2-1", "The consonant grid", "व्यंजनों की तालिका", ["consonants"]),
          lesson("unit-2-2", "Breath and voice: क ख ग घ", "साँस और आवाज़: क ख ग घ", ["consonants"]),
          lesson("unit-2-3", "The hum and the breath: अं अः", "अनुस्वार और विसर्ग: अं अः", ["anusvara-visarga"]),
        ] },
      { id: "unit-3", n: 3, art: "hub:grammar:start", graded: [], practiceTool: WRITING,
        title: { en: "Reading words", hi: "शब्द पढ़ना" },
        lessons: [
          lesson("unit-3-1", "Joined letters: क्ष त्र ज्ञ", "संयुक्ताक्षर: क्ष त्र ज्ञ", ["conjuncts"]),
          lesson("unit-3-2", "Roman letters (IAST)", "रोमन लिपि (IAST)", ["reading-roman"]),
          lesson("unit-3-3", "Read your first words", "पहले शब्द पढ़ें", [], { tool: VARNAMALA }),
        ] },
    ],
  },
  {
    id: "s2", n: 2, sa: "वाक्यानि", color: "#1F6670", art: "path:u5",
    title: { en: "First sentences", hi: "पहले वाक्य" },
    goal: { en: "Say who does what, to whom, and how many.", hi: "कह सकें कि कौन क्या करता है, किसको, और कितने लोग।" },
    units: [
      { id: "unit-4", n: 4, sa: "कः किं करोति", art: "path:u2", graded: ["SG", "NOM.SG", "ACC.SG", "PRES.3SG"],
        title: { en: "Who does what", hi: "कौन क्या करता है" },
        lessons: [
          lesson("unit-4-1", "Endings do the work", "काम अंत करता है", ["how-it-works", "stem-ending"]),
          lesson("unit-4-2", "He reads: पठति", "वह पढ़ता है: पठति", ["verb-anatomy"]),
          lesson("unit-4-3", "The doer", "कर्ता", ["nominative-vocative"]),
          lesson("unit-4-4", "The object", "कर्म", ["accusative"]),
          lesson("unit-4-5", "Any word order works", "शब्द-क्रम कोई भी चलेगा", ["word-order"]),
        ] },
      { id: "unit-5", n: 5, sa: "वचनम्", art: "path:u4", graded: ["DU", "PL", "NOM.DU", "NOM.PL", "ACC.DU", "ACC.PL", "PRES.3DU", "PRES.3PL"],
        title: { en: "One, two, many", hi: "एक, दो, अनेक" },
        lessons: [
          lesson("unit-5-1", "One, two and many readers", "एक, दो और अनेक पाठक", [], { cards: "verbs-number", minutes: 8 }),
          lesson("unit-5-2", "Two of anything: the dual", "ठीक दो: द्विवचन", ["number"]),
          lesson("unit-5-3", "Many: the plural", "अनेक: बहुवचन", ["number"]),
          lesson("unit-5-4", "Objects in two and many", "दो और अनेक कर्म", ["accusative"]),
          lesson("unit-5-5", "The verb matches its doer", "क्रिया कर्ता से मेल खाती है", ["subject-verb"]),
        ] },
      { id: "unit-6", n: 6, sa: "अहं त्वं च", art: "path:u5", graded: ["PRES.1SG", "PRES.1DU", "PRES.1PL", "PRES.2PL"],
        title: { en: "I and you", hi: "मैं और तुम" },
        lessons: [
          lesson("unit-6-1", "I and we", "मैं और हम", ["pronoun-i-we"]),
          lesson("unit-6-2", "You", "तुम", ["pronoun-you"]),
          lesson("unit-6-3", "All nine verb forms", "क्रिया के नौ रूप", ["verb-grid"]),
          lesson("unit-6-4", "Polite you: भवान्, भवती", "आदर से आप: भवान्, भवती", ["polite-you"]),
          lesson("unit-6-5", "To be: अस्मि, असि, अस्ति", "होना: अस्मि, असि, अस्ति", ["to-be"]),
        ] },
      { id: "unit-7", n: 7, sa: "लिङ्गम्", art: "path:u7", graded: ["MASC", "FEM", "NEUT"],
        title: { en: "He, she, it", hi: "तीन लिंग" },
        lessons: [
          lesson("unit-7-1", "Three genders", "तीन लिंग पहचानें", ["gender"]),
          lesson("unit-7-2", "सः, सा, तत्", "सः, सा, तत्", ["pronoun-he-she-it"]),
          lesson("unit-7-3", "This one: एषः, एषा, एतत्", "यह: एषः, एषा, एतत्", ["pronoun-this-that"]),
          lesson("unit-7-4", "Adjectives agree", "विशेषण मेल खाते हैं", ["agreement"]),
        ] },
    ],
  },
  {
    id: "s3", n: 3, sa: "विभक्तयः", color: "#3F6B3A", art: "path:u3",
    title: { en: "The eight cases", hi: "आठ विभक्तियाँ" },
    goal: { en: "Say with what, for whom, from where, whose and where.", hi: "कह सकें: किससे, किसके लिए, कहाँ से, किसका और कहाँ।" },
    units: [
      { id: "unit-8", n: 8, art: "path:u3", graded: ["INSTR.SG", "DAT.SG", "ABL.SG", "KARAKA-KARANA", "KARAKA-SAMPRADANA", "KARAKA-APADANA"],
        title: { en: "With, for, from", hi: "किससे, किसके लिए, कहाँ से" },
        lessons: [
          lesson("unit-8-1", "The eight cases at a glance", "आठ विभक्तियाँ एक नज़र में", ["cases-overview"]),
          lesson("unit-8-2", "With and by", "किससे: तृतीया", ["instrumental"]),
          lesson("unit-8-3", "For and to", "किसके लिए: चतुर्थी", ["dative"]),
          lesson("unit-8-4", "From", "कहाँ से: पञ्चमी", ["ablative"]),
        ] },
      { id: "unit-9", n: 9, art: "path:u11", graded: ["GEN.SG", "GEN.PL", "LOC.SG", "LOC.PL", "VOC.SG", "KARAKA-KARTR", "KARAKA-KARMA", "KARAKA-ADHIKARANA"],
        title: { en: "Of, in, and calling out", hi: "किसका, कहाँ, और पुकार" },
        lessons: [
          lesson("unit-9-1", "Whose: of", "किसका: षष्ठी", ["genitive"]),
          lesson("unit-9-2", "In, on, at", "कहाँ: सप्तमी", ["locative"]),
          lesson("unit-9-3", "Calling out: हे राम", "पुकारना: हे राम", ["nominative-vocative"]),
          lesson("unit-9-4", "The roles behind the endings", "अंत के पीछे की भूमिकाएँ: कारक", ["karaka"]),
          lesson("unit-9-5", "Words that ask for a case", "जो शब्द विभक्ति माँगते हैं", ["upapada"]),
        ] },
      { id: "unit-10", n: 10, sa: "शब्दरूपाणि", art: "hub:grammar:families", graded: [], practiceTool: { kind: "paradigm", of: "noun" },
        title: { en: "Noun families", hi: "शब्द-परिवार" },
        lessons: [
          lesson("unit-10-1", "देव and फल", "देव और फल", ["a-masculine", "a-neuter"]),
          lesson("unit-10-2", "लता and नदी", "लता और नदी", ["aa-feminine", "ii-uu-feminine"]),
          lesson("unit-10-3", "कवि, मति, गुरु, धेनु", "कवि, मति, गुरु, धेनु", ["i-stems", "u-stems"]),
          lesson("unit-10-4", "पितृ and मातृ", "पितृ और मातृ", ["r-stems"]),
          lesson("unit-10-5", "राजन्, मनस्, जगत्", "राजन्, मनस्, जगत्", ["consonant-stems"]),
          lesson("unit-10-6", "Odd ones: गो", "अनोखे शब्द: गो", ["odd-nouns"]),
        ] },
      { id: "unit-11", n: 11, sa: "सर्वनामानि सङ्ख्याश्च", art: "hub:grammar:pronouns", graded: [],
        title: { en: "Pronouns & numbers", hi: "सर्वनाम और संख्या" },
        lessons: [
          lesson("unit-11-1", "This and that, in every case", "यह और वह, हर विभक्ति में", ["pronoun-this-that"]),
          lesson("unit-11-2", "Who, what, which", "कौन, क्या, कौन-सा", ["pronoun-who-which"]),
          lesson("unit-11-3", "Numbers 1–10", "संख्याएँ 1–10", ["numbers-1-10"]),
          lesson("unit-11-4", "Big numbers and the time", "बड़ी संख्याएँ और समय", ["numbers-big-time"]),
        ] },
    ],
  },
  {
    id: "s4", n: 4, sa: "कालः क्रिया च", color: "#3A548A", art: "path:u8",
    title: { en: "Time & action", hi: "समय और क्रिया" },
    goal: { en: "Talk about yesterday and tomorrow, ask, and give instructions.", hi: "बीते और आने वाले कल की बात करें, पूछें और निर्देश दें।" },
    units: [
      { id: "unit-12", n: 12, sa: "अव्ययानि", art: "hub:grammar:small-words", graded: ["INDECL"],
        title: { en: "Small words", hi: "अव्यय" },
        lessons: [
          lesson("unit-12-1", "Words that never change", "कभी न बदलने वाले शब्द", ["indeclinables"]),
          lesson("unit-12-2", "च, वा, अपि, एव, तु", "च, वा, अपि, एव, तु", ["joining-words"]),
          lesson("unit-12-3", "Where, when, how?", "कहाँ, कब, कैसे?", ["question-place-time", "questions"]),
          lesson("unit-12-4", "Saying no: न and मा", "मना करना: न और मा", ["na-ma"]),
          lesson("unit-12-5", "इति: quotes and thoughts", "इति: उद्धरण और विचार", ["iti"]),
        ] },
      { id: "unit-13", n: 13, sa: "लकाराः", art: "path:u8", graded: ["IMP.2SG", "IMP.2PL", "IMPF.3SG", "FUT.1SG", "FUT.3SG"],
        title: { en: "Tenses & moods", hi: "काल और भाव" },
        lessons: [
          lesson("unit-13-1", "Ten lakāras at a glance", "दस लकार एक नज़र में", ["lakaras-overview", "present-tense"]),
          lesson("unit-13-2", "Commands: पठ, पठत", "आज्ञा: पठ, पठत", ["command-mood"]),
          lesson("unit-13-3", "The past: अपठत्", "भूतकाल: अपठत्", ["simple-past"]),
          lesson("unit-13-4", "The future: पठिष्यति", "भविष्यत्: पठिष्यति", ["future-tense"]),
          lesson("unit-13-5", "Should, may: पठेत्", "चाहिए: पठेत्", ["should-may"]),
          lesson("unit-13-6", "The story past", "कथा का भूतकाल", ["story-past"]),
        ] },
      { id: "unit-14", n: 14, art: "path:u9", graded: ["PARASMAIPADA", "ATMANEPADA"],
        title: { en: "How verbs are built", hi: "क्रिया कैसे बनती है" },
        lessons: [
          lesson("unit-14-1", "-ti and -te: two sets of endings", "-ति और -ते: दो तरह के अंत", ["two-endings"]),
          lesson("unit-14-2", "The ten verb classes", "दस गण", ["verb-classes"]),
          lesson("unit-14-3", "Prefixes change the meaning", "उपसर्ग अर्थ बदलते हैं", ["prefixes"]),
          lesson("unit-14-4", "The passive: पठ्यते", "कर्मवाच्य: पठ्यते", ["passive"]),
          lesson("unit-14-5", "Making someone do: पाठयति", "करवाना: पाठयति", ["causative"]),
        ] },
      { id: "unit-15", n: 15, sa: "कृदन्ताः", art: "hub:grammar:krdanta", graded: [], practiceTool: { kind: "paradigm", of: "verb" },
        title: { en: "Words made from verbs", hi: "धातु से बने शब्द" },
        lessons: [
          lesson("unit-15-1", "Having done: -त्वा, -य", "करके: -त्वा, -य", ["ktva-lyap"]),
          lesson("unit-15-2", "In order to: -तुम्", "करने के लिए: -तुम्", ["tumun"]),
          lesson("unit-15-3", "Done, has done: -त, -तवत्", "किया हुआ: -त, -तवत्", ["kta-ktavatu"]),
          lesson("unit-15-4", "While doing: -अत्, -मान", "करते हुए: -अत्, -मान", ["present-participles"]),
          lesson("unit-15-5", "Must be done: -तव्य, -अनीय", "करने योग्य: -तव्य, -अनीय", ["gerundives"]),
          lesson("unit-15-6", "Doers and actions: पाठकः", "करने वाला और क्रिया: पाठकः", ["doer-action-nouns"]),
        ] },
    ],
  },
  {
    id: "s5", n: 5, sa: "पठनम्", color: "#8E2F4C", art: "path:u10",
    title: { en: "Reading real Sanskrit", hi: "असली संस्कृत पढ़ना" },
    goal: { en: "Read a verse, split its joins and unpack its compounds.", hi: "श्लोक पढ़ें, उसकी सन्धियाँ अलग करें और समास खोलें।" },
    units: [
      { id: "unit-16", n: 16, sa: "सन्धिः", art: "path:u6", graded: ["VOWEL-SANDHI"],
        title: { en: "Vowels that join", hi: "स्वर सन्धि" },
        lessons: [
          lesson("unit-16-1", "Where words meet", "जहाँ शब्द मिलते हैं", ["sandhi-why"], { cards: "sandhi-boundary", minutes: 8 }),
          lesson("unit-16-2", "Two vowels of one family", "एक परिवार के दो स्वर", ["sandhi-long-vowels"], { cards: "sandhi-like-vowels", minutes: 8 }),
          lesson("unit-16-3", "When a meets a different vowel", "जब अ किसी दूसरे स्वर से मिले", ["sandhi-guna", "sandhi-vrddhi", "guna-vrddhi"], { cards: "sandhi-a-combinations", minutes: 8 }),
          lesson("unit-16-4", "A vowel becomes a glide", "स्वर अर्धस्वर बनता है", ["sandhi-yan"], { cards: "sandhi-glides", minutes: 8 }),
          lesson("unit-16-5", "The special e and o", "ए और ओ का खास नियम", ["sandhi-ayadi"], { cards: "sandhi-e-o", minutes: 7 }),
          lesson("unit-16-6", "When the rule stops", "जब नियम रुक जाता है", [], { cards: "sandhi-protected", minutes: 7 }),
        ] },
      { id: "unit-17", n: 17, art: "hub:grammar:sandhi", graded: ["VISARGA-SANDHI", "ANUSVARA-SANDHI", "CONSONANT-SANDHI"],
        title: { en: "Visarga and consonants", hi: "विसर्ग और व्यंजन सन्धि" },
        lessons: [
          lesson("unit-17-1", "aḥ and āḥ", "अः और आः", ["sandhi-visarga"], { cards: "sandhi-source-a-visarga", minutes: 8 }),
          lesson("unit-17-2", "Visarga beyond aḥ", "अः के अलावा विसर्ग", [], { cards: "sandhi-source-visarga-more", minutes: 8 }),
          lesson("unit-17-3", "Final stops follow their neighbour", "अंतिम व्यंजन पड़ोसी जैसा बनता है", ["sandhi-consonants"], { cards: "sandhi-source-stops", minutes: 10 }),
          lesson("unit-17-4", "Nasals and inserted sounds", "अनुनासिक और जुड़ने वाली ध्वनियाँ", [], { cards: "sandhi-source-nasals", minutes: 10 }),
          lesson("unit-17-5", "Split a join", "सन्धि-विच्छेद", ["sandhi-splitting"], { cards: "sandhi-source-reading", minutes: 8 }),
        ] },
      { id: "unit-18", n: 18, sa: "समासाः", art: "path:u10", graded: ["SAMASA-DVANDVA", "SAMASA-TATPURUSA", "SAMASA-BAHUVRIHI", "SAMASA-AVYAYIBHAVA"],
        title: { en: "Compounds", hi: "समास" },
        lessons: [
          lesson("unit-18-1", "Words inside words", "शब्दों के भीतर शब्द", ["compounds-intro"]),
          lesson("unit-18-2", "Dvandva: X and Y", "द्वन्द्व: यह और वह", ["dvandva"]),
          lesson("unit-18-3", "Tatpuruṣa: X's Y", "तत्पुरुष: इसका वह", ["tatpurusha", "nan-upapada"]),
          lesson("unit-18-4", "Karmadhāraya and dvigu", "कर्मधारय और द्विगु", ["karmadharaya-dvigu"]),
          lesson("unit-18-5", "Bahuvrīhi: one who has", "बहुव्रीहि: जिसके पास है", ["bahuvrihi"]),
          lesson("unit-18-6", "Avyayībhāva", "अव्ययीभाव", ["avyayibhava"]),
          lesson("unit-18-7", "Reading long compounds", "लंबे समास पढ़ना", ["long-compounds"]),
        ] },
      { id: "unit-19", n: 19, sa: "तद्धिताः", art: "hub:grammar:taddhita", graded: [],
        title: { en: "Word-making suffixes", hi: "शब्द बनाने वाले प्रत्यय" },
        lessons: [
          lesson("unit-19-1", "Son of: राघव", "का वंशज: राघव", ["son-of-names"]),
          lesson("unit-19-2", "-ness: -त्व, -ता", "-पन: -त्व, -ता", ["tva-ta"]),
          lesson("unit-19-3", "Having and related: -वत्, -इक", "वाला और संबंधी: -वत्, -इक", ["vat-mat", "ika"]),
          lesson("unit-19-4", "More and most: -तर, -तम", "अधिक और सबसे अधिक: -तर, -तम", ["comparison"]),
          lesson("unit-19-5", "Making feminines", "स्त्रीलिंग बनाना", ["feminine-suffixes"]),
        ] },
      { id: "unit-20", n: 20, sa: "वाक्यम्", art: "hub:grammar:sentences", graded: [],
        title: { en: "Longer sentences", hi: "लंबे वाक्य" },
        lessons: [
          lesson("unit-20-1", "Who… he: यः… सः", "जो… वह: यः… सः", ["relative-clauses"]),
          lesson("unit-20-2", "Having gone, while going", "जाकर, जाते हुए", ["participle-clauses"]),
        ] },
      { id: "unit-21", n: 21, sa: "छन्दः", art: "hub:grammar:verse", graded: [], practiceTool: { kind: "screen", screen: "Pingala" },
        title: { en: "Verse", hi: "छन्द" },
        lessons: [
          lesson("unit-21-1", "Light and heavy syllables", "लघु और गुरु अक्षर", ["light-heavy"]),
          lesson("unit-21-2", "The śloka: four lines of eight", "श्लोक: आठ-आठ अक्षरों के चार चरण", ["shloka"]),
          lesson("unit-21-3", "Read your first Gītā verse", "गीता का पहला श्लोक पढ़ें", [], { tool: { kind: "book", bookKey: "gita" } }),
        ] },
    ],
  },
];

/** Guide topics kept off the trail, in the Library. */
export const LIBRARY_TOPICS = {
  tables: ["ref-case-endings", "ref-verb-endings", "ref-pronouns", "ref-sandhi", "ref-suffixes"],
  advanced: ["aorist-rare", "desiderative", "pingala-binary", "ashtadhyayi", "shiva-sutras", "reading-derivation"],
};

/** Titles for the Library's topic rows while the guide index is not loaded. */
export const LIBRARY_TOPIC_TITLES: Record<string, TrailText> = {
  "ref-case-endings": { en: "Case endings at a glance", hi: "विभक्ति-प्रत्यय एक नज़र में" },
  "ref-verb-endings": { en: "Verb endings at a glance", hi: "क्रिया-प्रत्यय एक नज़र में" },
  "ref-pronouns": { en: "Pronouns at a glance", hi: "सर्वनाम एक नज़र में" },
  "ref-sandhi": { en: "Sandhi on one page", hi: "एक पन्ने पर सन्धि" },
  "ref-suffixes": { en: "Suffix finder", hi: "प्रत्यय खोजें" },
  "aorist-rare": { en: "The aorist, मा, and the rare four", hi: "लुङ्, मा, और दुर्लभ चार" },
  "desiderative": { en: "“Wants to”: desiderative and intensive verbs", hi: "इच्छा और बार-बार: सन्नन्त और यङन्त" },
  "pingala-binary": { en: "Piṅgala's patterns", hi: "पिङ्गल के प्रतिरूप" },
  "ashtadhyayi": { en: "The Aṣṭādhyāyī", hi: "अष्टाध्यायी" },
  "shiva-sutras": { en: "The Śiva sūtras and pratyāhāras", hi: "शिवसूत्र और प्रत्याहार" },
  "reading-derivation": { en: "Reading an engine derivation", hi: "प्रक्रिया पढ़ना" },
};

/** Card readings kept off the trail, in the Library's "Go deeper". */
export const LIBRARY_CARD_UNITS = ["verse-module-"];
export const LIBRARY_CARD_LESSONS = ["sandhi-source-internal", "sandhi-source-retroflex"];

export interface TrailStop {
  stage: TrailStage;
  unit: TrailUnit;
  lesson: TrailLesson;
  /** Position within the stage, from 0. */
  index: number;
}

export function stageStops(stage: TrailStage): TrailStop[] {
  const out: TrailStop[] = [];
  for (const unit of stage.units) for (const l of unit.lessons) out.push({ stage, unit, lesson: l, index: out.length });
  return out;
}

export function findStopByCards(cardsId: string): TrailStop | undefined {
  for (const stage of TRAIL) {
    const hit = stageStops(stage).find((s) => s.lesson.cards === cardsId);
    if (hit) return hit;
  }
  return undefined;
}

export function stopAfter(stop: TrailStop): TrailStop | undefined {
  const stops = stageStops(stop.stage);
  return stops[stop.index + 1];
}

export const TRAIL_COUNTS = (() => {
  const units = TRAIL.flatMap((s) => s.units);
  return { stages: TRAIL.length, units: units.length, lessons: units.reduce((n, u) => n + u.lessons.length, 0) };
})();
