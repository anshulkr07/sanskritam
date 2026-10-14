export type LabConfig = {
  pipeline: 1 | 2 | 3 | 4; persona: "guru" | "mother" | "friend" | "scholar";
  tts_model: "bulbul:v3" | "bulbul:v4-flash"; speaker: string;
  language: "hi-IN" | "te-IN" | "kn-IN" | "mr-IN";
  pace: number; pitch: number; loudness: number; temperature: number;
  emotion: string; thinking_budget: number; web_search: boolean; filler_phrases: boolean;
  transliterate: boolean; visarga_expansion: boolean; schwa_fix: boolean;
  open_provider: "edge_tts_prosody" | "ai4bharat_indic_parler"; live_model: string;
};
export const BASE_CONFIG: LabConfig = {
  pipeline: 1, persona: "guru", tts_model: "bulbul:v3", speaker: "ashutosh", language: "te-IN",
  pace: 0.88, pitch: -2, loudness: 1, temperature: 0.6, emotion: "calm, authoritative, encouraging",
  thinking_budget: 0, web_search: false, filler_phrases: true, transliterate: true,
  visarga_expansion: true, schwa_fix: true, open_provider: "edge_tts_prosody", live_model: "gemini-3.8-live",
};
export const PRESETS: Record<LabConfig["persona"], LabConfig> = {
  guru: BASE_CONFIG,
  mother: { ...BASE_CONFIG, persona: "mother", pipeline: 2, speaker: "te-IN-ShrutiNeural", pace: 0.95, pitch: 1, emotion: "warm, affectionate, gentle" },
  friend: { ...BASE_CONFIG, persona: "friend", pipeline: 3, speaker: "Puck", pace: 1.05, pitch: 0, web_search: true, emotion: "energetic, witty, casual" },
  scholar: { ...BASE_CONFIG, persona: "scholar", pipeline: 4, tts_model: "bulbul:v4-flash", speaker: "shubh_hi_devotional", language: "kn-IN", thinking_budget: 1024, web_search: true, emotion: "thoughtful, precise" },
};
export const PERSONA_NAMES = { guru: "आचार्यः · Guru", mother: "माता · Mother", friend: "मित्रम् · Friend", scholar: "विद्वान् · Scholar" };
export const PIPELINES = ["Sarvam + script routing", "Sarvam + open TTS", "Gemini native voice", "Sarvam + Gemini search"];
export function voices(c: LabConfig): string[] {
  if (c.pipeline === 3) return ["Puck", "Charon", "Kore", "Fenrir", "Aoede", "Leda", "Orus", "Zephyr"];
  if (c.pipeline === 2) return c.open_provider === "ai4bharat_indic_parler" ? ["Aryan", "Leela"] :
    ["hi-IN-SwaraNeural", "hi-IN-MadhurNeural", "te-IN-ShrutiNeural", "te-IN-MohanNeural", "kn-IN-SapnaNeural", "mr-IN-AarohiNeural"];
  return c.tts_model === "bulbul:v3" ? ["ashutosh", "aditya", "shubh", "advait", "ritu", "priya", "rohan", "kavya", "meera"] :
    ["shubh_hi_devotional", "shubh_enhi_ads", "simran_en_customer"];
}
