// The companions behind the Voice tab.
//
// The tab used to open straight into one Live Voice Lab with four personas
// (Guru, Mother, Friend, Scholar). It now opens on the groups first — a
// teacher, friends, family, and the subjects: yoga, āyurveda, jyotiṣa,
// itihāsa, kathā — and each group holds named companions with their own
// voice, pace and manner. Picking one opens the same Live Voice Lab, tuned
// for that companion.
//
// The backend still accepts exactly the four personas it always had
// (guru, mother, friend, scholar) and a fixed config shape with no extra
// keys, so a companion here is *presentation plus a LabConfig*: `persona` is
// the closest of the four, and the rest of the character is carried by
// `emotion`, which the server already appends to its spoken instruction.
// Nothing in this file asks the server to accept anything new.

import type { FillName } from "../theme";
import { BASE_CONFIG, LabConfig, voices } from "./config";

export type VoiceCategoryId =
  | "guru"
  | "mitra"
  | "parivara"
  | "yoga"
  | "ayurveda"
  | "jyotisha"
  | "itihasa"
  | "katha";

/** One line a learner can try saying, in Devanagari with its English. */
export type Saying = { sa: string; en: string };

export type Companion = {
  id: string;
  /** The name in Devanagari, the way the app writes Sanskrit names. */
  deva: string;
  /** The same name in Roman letters. */
  roman: string;
  /** What this companion is for, as "देवनागरी · english". */
  role: string;
  /** The one quality that makes this companion themselves. */
  quality: string;
  /** How they sound — two or three short chips on the card. */
  voice: string[];
  /** The lab configuration this companion speaks with. */
  config: LabConfig;
};

export type VoiceCategory = {
  id: VoiceCategoryId;
  /** Devanagari name, as the card shows it. */
  deva: string;
  /** English name, for the card and the screen header. */
  en: string;
  /** One line under the name on the hub card. */
  hook: string;
  /** Two or three lines on the group's own page. */
  intro: string;
  /** The group's colour, from the app's deep-fill family. */
  tone: FillName;
  /** The companions, in the order they appear. */
  people: Companion[];
  /** Anything a learner must know before talking here. */
  caution?: string;
  /** Lines to try, shown on the group's page. */
  sayings: Saying[];
};

// ─── config builders ──────────────────────────────────────────────────────
// One per voice route, so a preset only states what makes it itself.

/** Sarvam bulbul — the Sanskrit voice. The default for teaching. */
const say = (speaker: string, emotion: string, extra: Partial<LabConfig> = {}): LabConfig => ({
  ...BASE_CONFIG,
  pipeline: 1,
  speaker,
  emotion,
  ...extra,
});

/** The same voice with a search-backed reply (pipeline 4): dates, texts, dishes, the sky. */
const look = (speaker: string, emotion: string, extra: Partial<LabConfig> = {}): LabConfig => ({
  ...BASE_CONFIG,
  pipeline: 4,
  speaker,
  thinking_budget: 1536,
  web_search: true,
  emotion,
  ...extra,
});

/** Gemini's native voice: quickest back and forth, for peers and practice partners. */
const peer = (speaker: string, emotion: string, extra: Partial<LabConfig> = {}): LabConfig => ({
  ...BASE_CONFIG,
  pipeline: 3,
  speaker,
  pitch: 0,
  pace: 1,
  web_search: true,
  emotion,
  ...extra,
});

/** Open TTS (edge) in an Indian language — the app's other Sanskrit-capable route. */
const open = (speaker: string, language: LabConfig["language"], emotion: string, extra: Partial<LabConfig> = {}): LabConfig => ({
  ...BASE_CONFIG,
  pipeline: 2,
  speaker,
  language,
  open_provider: "edge_tts_prosody",
  emotion,
  ...extra,
});

// ─── the groups ───────────────────────────────────────────────────────────

export const VOICE_CATEGORIES: VoiceCategory[] = [
  {
    id: "guru",
    deva: "गुरुः",
    en: "Guru",
    hook: "Learn it the right way",
    intro:
      "Teachers of the language itself: grammar, endings, chanting and correction. They speak slowly, one rule at a time, and make you say the sentence again.",
    tone: "saffron",
    sayings: [
      { sa: "कथम् असि, आचार्य?", en: "How are you, teacher?" },
      { sa: "इदं वाक्यं शुद्धम्?", en: "Is this sentence correct?" },
      { sa: "शनैः उच्चारयतु", en: "Please say it slowly" },
      { sa: "पुनः वदतु", en: "Say it again" },
    ],
    people: [
      {
        id: "somadeva",
        deva: "सोमदेवः",
        roman: "Somadeva",
        role: "व्याकरणम् · grammar",
        quality: "Corrects one rule at a time, then has you say it again.",
        voice: ["deep", "unhurried", "corrects gently"],
        config: say("ashutosh", "calm, authoritative, encouraging", { pace: 0.88, pitch: -2 }),
      },
      {
        id: "yashodhara",
        deva: "यशोधरः",
        roman: "Yaśodhara",
        role: "उच्चारणम् · recitation",
        quality: "Chants a line slowly, then listens while you chant it back.",
        voice: ["slow", "clear visarga", "repeats"],
        config: say("shubh", "precise, unhurried, encouraging", { pace: 0.76, pitch: -1, visarga_expansion: true }),
      },
      {
        id: "kaumudi",
        deva: "कौमुदी",
        roman: "Kaumudī",
        role: "प्रारम्भः · beginners",
        quality: "Keeps the Sanskrit simple and slows down when you are stuck.",
        voice: ["simple", "patient", "beginner"],
        config: say("priya", "warm, simple, beginner-friendly, encouraging", { pace: 0.82, pitch: 1, temperature: 0.5 }),
      },
      {
        id: "maitreyi",
        deva: "मैत्रेयी",
        roman: "Maitreyī",
        role: "शास्त्रम् · the rules",
        quality: "Answers why, and names the sūtra that decides it.",
        voice: ["measured", "cites the rule", "looks it up"],
        config: look("meera", "patient, exact, scholarly, cites the shastra", { pace: 0.9, pitch: -1 }),
      },
    ],
  },
  {
    id: "mitra",
    deva: "मित्रम्",
    en: "Friend",
    hook: "Talk about your day",
    intro:
      "Peers who talk the way friends do — the week, films, exams, food — in easy spoken Sanskrit. Nothing is corrected here unless you ask.",
    tone: "teal",
    sayings: [
      { sa: "कथम् असि?", en: "How are you?" },
      { sa: "अद्य किम् अकरोः?", en: "What did you do today?" },
      { sa: "त्वं किं शृणोषि?", en: "What are you listening to?" },
      { sa: "श्वः किं करिष्यसि?", en: "What will you do tomorrow?" },
    ],
    people: [
      {
        id: "rahul",
        deva: "राहुलः",
        roman: "Rahul",
        role: "क्रीडा · games & tech",
        quality: "Talks phones, cricket and games — and argues back for fun.",
        voice: ["quick", "witty", "casual"],
        config: peer("Puck", "energetic, witty, casual, teasing", { pace: 1.05, temperature: 0.8 }),
      },
      {
        id: "atharva",
        deva: "अथर्वः",
        roman: "Atharva",
        role: "अध्ययनम् · study life",
        quality: "Student talk: exams, timetable, and getting the work done.",
        voice: ["upbeat", "curious", "study"],
        config: peer("Fenrir", "bright, curious, encouraging, everyday", { temperature: 0.75 }),
      },
      {
        id: "seema",
        deva: "सीमा",
        roman: "Seemā",
        role: "चलच्चित्रम् · films & songs",
        quality: "Films, songs and stories about people; never short of talk.",
        voice: ["chatty", "warm", "laughs"],
        config: peer("Kore", "chatty, warm, friendly", { temperature: 0.85 }),
      },
      {
        id: "mohini",
        deva: "मोहिनी",
        roman: "Mohinī",
        role: "काव्यम् · words & verse",
        quality: "Plays with words and hands you one line of verse to try.",
        voice: ["poetic", "playful", "imaginative"],
        config: say("ritu", "playful, poetic, gentle", { pace: 0.95, pitch: 2, temperature: 0.9 }),
      },
      {
        id: "palak",
        deva: "पलक",
        roman: "Palak",
        role: "प्रतिदिनम् · everyday",
        quality: "Food, travel, the week — and she asks about you.",
        voice: ["bright", "friendly", "asks back"],
        config: peer("Aoede", "bright, friendly, curious, light", { pace: 1.02 }),
      },
    ],
  },
  {
    id: "parivara",
    deva: "परिवारः",
    en: "Family",
    hook: "Warm and simple",
    intro:
      "The people who speak to you slowly and simply — your mother, your grandmother, your elder sister. Short sentences, household words, no scolding.",
    tone: "rose",
    sayings: [
      { sa: "कथम् असि?", en: "How are you?" },
      { sa: "अद्य किं पक्वम्?", en: "What was cooked today?" },
      { sa: "मम भोजनम् इष्टम्", en: "I liked my meal" },
      { sa: "श्वः किं करिष्यसि?", en: "What will you do tomorrow?" },
    ],
    people: [
      {
        id: "mata",
        deva: "माता",
        roman: "Mātā",
        role: "माता · mother",
        quality: "Asks about your day and your meals, in the simplest Sanskrit.",
        voice: ["affectionate", "simple", "short replies"],
        config: {
          ...BASE_CONFIG,
          persona: "mother",
          speaker: "priya",
          pace: 0.95,
          pitch: 1,
          emotion: "warm, affectionate, gentle, asks about their day",
        },
      },
      {
        id: "ajji",
        deva: "अज्जी",
        roman: "Ajjī",
        role: "अज्जी · grandmother",
        quality: "Goes slow, repeats herself kindly, and tells you to eat well.",
        voice: ["tender", "slow", "low"],
        config: {
          ...BASE_CONFIG,
          persona: "mother",
          speaker: "kavya",
          pace: 0.78,
          pitch: -3,
          temperature: 0.5,
          emotion: "tender, patient, unhurried, uses the simplest words",
        },
      },
      {
        id: "didi",
        deva: "दीदी",
        roman: "Dīdī",
        role: "दीदी · elder sister",
        quality: "Teases you a little, then helps you finish the sentence.",
        voice: ["cheerful", "teasing", "helps"],
        config: {
          ...BASE_CONFIG,
          persona: "friend",
          pipeline: 3,
          speaker: "Leda",
          pitch: 0,
          pace: 1,
          web_search: false,
          emotion: "warm, teasing, encouraging, like an elder sister",
        },
      },
    ],
  },
  {
    id: "yoga",
    deva: "योगः",
    en: "Yoga",
    hook: "Body, breath, stillness",
    intro:
      "Move and breathe with a teacher, or sit with the Yoga Sūtra and its ideas. Pace yourself: they will ask how your body feels before they ask for more.",
    tone: "sage",
    caution: "This is teaching, not treatment. Nothing here replaces a doctor or a trained teacher in the room — and stop if something hurts.",
    sayings: [
      { sa: "आसनं दर्शयतु", en: "Show me the pose" },
      { sa: "श्वासक्रमं बोधयतु", en: "Teach me the breathing" },
      { sa: "अद्य किम् अभ्यसेयम्?", en: "What should I practise today?" },
      { sa: "क्षम्यताम्, कष्टम् अस्ति", en: "Sorry, that hurts" },
    ],
    people: [
      {
        id: "gita",
        deva: "गीता",
        roman: "Gītā",
        role: "आसनम् · āsana",
        quality: "Guides one movement and one breath at a time.",
        voice: ["calm", "slow", "one step"],
        config: open("te-IN-ShrutiNeural", "te-IN", "calm, encouraging, unhurried, gives one instruction at a time", { pace: 0.85 }),
      },
      {
        id: "nityananda",
        deva: "नित्यानन्दः",
        roman: "Nityānanda",
        role: "दर्शनम् · philosophy",
        quality: "Patañjali's yoga in plain words — the mind, the breath, the practice.",
        voice: ["quiet", "contemplative", "looks it up"],
        config: look("advait", "quiet, contemplative, exact", { pace: 0.84, pitch: -2 }),
      },
      {
        id: "arjun",
        deva: "अर्जुनः",
        roman: "Arjuna",
        role: "अभ्यासः · practice",
        quality: "Practises with you and counts the rounds when you flag.",
        voice: ["bright", "motivating", "quick"],
        config: peer("Charon", "bright, motivating, level-headed", { web_search: false }),
      },
    ],
  },
  {
    id: "ayurveda",
    deva: "आयुर्वेदः",
    en: "Āyurveda",
    hook: "Food, seasons, routine",
    intro:
      "The kitchen and the day: what to eat in this season, when to sleep, how the three doṣas are reasoned about — read honestly from the classical texts.",
    tone: "gold",
    caution: "Traditional health teaching, not a diagnosis or a prescription. For illness, see a doctor.",
    sayings: [
      { sa: "ऋतौ किं खादेयम्?", en: "What should I eat this season?" },
      { sa: "अद्य किं पिबेयम्?", en: "What should I drink today?" },
      { sa: "मम निद्रा न सम्यक्", en: "My sleep is not good" },
      { sa: "मम शिरः पीड्यते", en: "I have a headache" },
    ],
    people: [
      {
        id: "shankara",
        deva: "शङ्करः",
        roman: "Śaṅkara",
        role: "दिनचर्या · routine",
        quality: "Food, sleep and seasons — and straight to a doctor when it is illness.",
        voice: ["practical", "careful", "looks it up"],
        config: look("rohan", "warm, careful, practical, never diagnoses", { pace: 0.9, pitch: -2 }),
      },
      {
        id: "kamala",
        deva: "कमला",
        roman: "Kamalā",
        role: "पाकः · the kitchen",
        quality: "What to cook when the weather turns, from her own kitchen.",
        voice: ["homely", "seasonal", "recipes"],
        config: open("mr-IN-AarohiNeural", "mr-IN", "homely, patient, practical, seasonal", { pace: 0.9, pitch: 1 }),
      },
      {
        id: "saral",
        deva: "सरलः",
        roman: "Sarala",
        role: "मूलतत्त्वम् · the basics",
        quality: "The three doṣas and the day's rhythm, from the textbook.",
        voice: ["clear", "patient", "basics"],
        config: say("aditya", "clear, patient, teaching, beginner-friendly", { pace: 0.95, temperature: 0.5 }),
      },
    ],
  },
  {
    id: "jyotisha",
    deva: "ज्योतिषम्",
    en: "Jyotiṣa",
    hook: "Time, sky, calendar",
    intro:
      "The traditional sky, worked out rather than foretold: today's tithi and nakṣatra, a good muhūrta for a journey, the year's festivals and how the arithmetic is done.",
    tone: "slate",
    caution: "Teaching and calendar work only. Your companions here make no predictions, and nothing about health, money or marriage.",
    sayings: [
      { sa: "अद्य का तिथिः?", en: "What is today's tithi?" },
      { sa: "अद्य चन्द्रः कस्मिन् नक्षत्रे?", en: "Which nakṣatra is the Moon in today?" },
      { sa: "श्वः शुभः मुहूर्तः कः?", en: "What is a good muhūrta tomorrow?" },
      { sa: "ग्रहान् बोधयतु", en: "Teach me about the planets" },
    ],
    people: [
      {
        id: "devadatta",
        deva: "देवदत्तः",
        roman: "Devadatta",
        role: "पञ्चाङ्गम् · calendar",
        quality: "Works out today's tithi, nakṣatra and muhūrta — and shows how.",
        voice: ["measured", "traditional", "looks it up"],
        config: look("ashutosh", "measured, traditional, explains the calculation", { pace: 0.84, pitch: -3 }),
      },
      {
        id: "rohini",
        deva: "रोहिणी",
        roman: "Rohiṇī",
        role: "नक्षत्रम् · the night sky",
        quality: "Describes the Moon's path and the twenty-seven nakṣatras.",
        voice: ["quiet", "descriptive", "poetic"],
        config: open("kn-IN-SapnaNeural", "kn-IN", "quiet, descriptive, poetic, teaching", { pace: 0.9 }),
      },
      {
        id: "varaha",
        deva: "वराहः",
        roman: "Varāha",
        role: "स्रोतः · the sources",
        quality: "Where this knowledge comes from — the books, the astronomy, the names.",
        voice: ["scholarly", "precise", "looks it up"],
        config: look("meera", "scholarly, historical, precise", { pace: 0.92, pitch: 1 }),
      },
    ],
  },
  {
    id: "itihasa",
    deva: "इतिहासः",
    en: "Itihāsa",
    hook: "Kings, texts, stones",
    intro:
      "The past told plainly: dynasties and dates you can place on a map, temples and inscriptions, and the manuscripts the knowledge survived in.",
    tone: "maroon",
    caution: "Where the evidence is thin, a good historian says so. Ask where something comes from.",
    sayings: [
      { sa: "इतिहासस्य कथां कथयतु", en: "Tell me a story from history" },
      { sa: "कदा एतत् अभवत्?", en: "When did this happen?" },
      { sa: "कस्मिन् ग्रन्थे लिखितम्?", en: "In which text is it written?" },
      { sa: "सः देशः कुत्र अस्ति?", en: "Where is that region?" },
    ],
    people: [
      {
        id: "vikrama",
        deva: "विक्रमः",
        roman: "Vikrama",
        role: "राजवंशाः · dynasties",
        quality: "Kings, dynasties and dates you can place on a map.",
        voice: ["engaged", "dates & maps", "looks it up"],
        config: peer("Orus", "engaged, factual, clear about dates and places", { pace: 0.95 }),
      },
      {
        id: "mira",
        deva: "मीरा",
        roman: "Mīrā",
        role: "शिलालेखाः · inscriptions",
        quality: "Temples, stones and what the inscriptions actually say.",
        voice: ["careful", "evidence", "looks it up"],
        config: peer("Zephyr", "curious, careful, evidence-first", { pace: 1 }),
      },
      {
        id: "bhaskara",
        deva: "भास्करः",
        roman: "Bhāskara",
        role: "ग्रन्थाः · manuscripts",
        quality: "What was written, when, and how it survived to us.",
        voice: ["thoughtful", "precise", "scholarly"],
        config: say("shubh", "thoughtful, precise, scholarly", { pace: 0.86, pitch: -2 }),
      },
    ],
  },
  {
    id: "katha",
    deva: "कथा",
    en: "Kathā",
    hook: "Stories, told well",
    intro:
      "The epics and the fables, in scenes short enough to follow, with a pause to ask what happens next. Good for the end of the day.",
    tone: "ink",
    sayings: [
      { sa: "कथां कथयतु", en: "Tell me a story" },
      { sa: "ततः किम् अभवत्?", en: "What happened next?" },
      { sa: "मम श्रवणं रोचते", en: "I like listening" },
      { sa: "अन्यां कथां श्रावयतु", en: "Let me hear another story" },
    ],
    people: [
      {
        id: "amara",
        deva: "अमरः",
        roman: "Amara",
        role: "इतिहास-कथा · epics",
        quality: "The epics, told steadily, one scene at a time.",
        voice: ["storyteller", "unhurried", "vivid"],
        config: say("ashutosh", "storytelling, unhurried, vivid but simple", { pace: 0.8, pitch: -3, temperature: 0.7 }),
      },
      {
        id: "lakshmi",
        deva: "लक्ष्मी",
        roman: "Lakṣmī",
        role: "पञ्चतन्त्रम् · fables",
        quality: "Animals and fables for children — and she asks what comes next.",
        voice: ["playful", "gentle", "for children"],
        config: say("priya", "playful, gentle, asks questions", { pace: 0.92, pitch: 2, temperature: 0.8 }),
      },
      {
        id: "canakya",
        deva: "चाणक्यः",
        roman: "Cāṇakya",
        role: "सुभाषितम् · maxims",
        quality: "One nīti verse, then what it means for your day.",
        voice: ["terse", "witty", "looks it up"],
        config: {
          ...look("advait", "terse, witty, one maxim at a time", { pace: 0.92, pitch: -1 }),
          thinking_budget: 1280,
        },
      },
    ],
  },
];

// ─── lookups ──────────────────────────────────────────────────────────────

const BY_ID = new Map<string, { companion: Companion; category: VoiceCategory }>(
  VOICE_CATEGORIES.flatMap((category) => category.people.map((companion) => [companion.id, { companion, category }] as const)),
);

export const COMPANION_COUNT = BY_ID.size;

/** The companion a saved id (or a bad link) resolves to. */
export const DEFAULT_COMPANION_ID = "somadeva";

export function companionById(id?: string): Companion | undefined {
  return id ? BY_ID.get(id)?.companion : undefined;
}

export function categoryById(id?: string): VoiceCategory | undefined {
  return VOICE_CATEGORIES.find((category) => category.id === id);
}

/** The group a companion belongs to: tone, name and sayings live there. */
export function categoryOf(companion: Companion): VoiceCategory {
  return BY_ID.get(companion.id)?.category ?? VOICE_CATEGORIES[0];
}

export function firstCompanionOf(category: VoiceCategory): Companion {
  return category.people[0];
}

/** The role line as its Devanagari and English halves, so a card can set the
 *  Sanskrit larger than the English beside it (the app's Devanagari floor). */
export function roleParts(role: string): { sa: string; en: string } {
  const [sa, en = ""] = role.split(" · ");
  return { sa, en };
}

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

/**
 * The config a call opens with. Guards the server's own limits (its model
 * would reject an out-of-range preset outright), and falls back to a voice
 * the chosen pipeline actually has if a preset ever names one it does not.
 * The sandbox may still be edited freely afterwards.
 */
export function presetFor(companion: Companion): LabConfig {
  const config: LabConfig = { ...companion.config };
  config.pace = clamp(config.pace, 0.5, 2);
  config.pitch = clamp(config.pitch, -12, 12);
  config.loudness = clamp(config.loudness, 0.3, 2);
  config.temperature = clamp(config.temperature, 0.1, 1);
  config.thinking_budget = Math.round(clamp(config.thinking_budget, 0, 4096));
  if (config.pipeline === 3) config.pitch = 0;
  const allowed = voices(config);
  if (!allowed.includes(config.speaker)) config.speaker = allowed[0];
  return config;
}
