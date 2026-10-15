export type LabConfig = {
  pipeline: 1 | 2 | 3 | 4; persona: "guru" | "mother" | "friend" | "scholar";
  tts_model: "bulbul:v3" | "bulbul:v4-flash"; speaker: string;
  llm_model: "sarvam-105b-conversations" | "sarvam-105b" | "gemma4" | "deepseekv4.1-flash" | "glm5.3";
  language: "sa-IN" | "hi-IN" | "te-IN" | "kn-IN" | "mr-IN";
  pace: number; pitch: number; loudness: number; temperature: number;
  emotion: string; thinking_budget: number; web_search: boolean; filler_phrases: boolean;
  transliterate: boolean; visarga_expansion: boolean; schwa_fix: boolean;
  open_provider: "edge_tts_prosody" | "ai4bharat_indic_parler"; live_model: string;
};
export const BASE_CONFIG: LabConfig = {
  pipeline: 1, persona: "guru", tts_model: "bulbul:v3", llm_model: "sarvam-105b-conversations", speaker: "ashutosh", language: "sa-IN",
  pace: 0.88, pitch: -2, loudness: 1, temperature: 0.6, emotion: "calm, authoritative, encouraging",
  thinking_budget: 0, web_search: false, filler_phrases: true, transliterate: false,
  visarga_expansion: false, schwa_fix: false, open_provider: "edge_tts_prosody", live_model: "gemini-3.8-live",
};
export const PRESETS: Record<LabConfig["persona"], LabConfig> = {
  guru: BASE_CONFIG,
  mother: { ...BASE_CONFIG, persona: "mother", speaker: "priya", pace: 0.95, pitch: 1, emotion: "warm, affectionate, gentle" },
  friend: { ...BASE_CONFIG, persona: "friend", pipeline: 3, speaker: "Puck", pace: 1.05, pitch: 0, web_search: true, emotion: "energetic, witty, casual" },
  scholar: { ...BASE_CONFIG, persona: "scholar", pipeline: 4, thinking_budget: 1024, web_search: true, emotion: "thoughtful, precise" },
};
export const PERSONA_NAMES = { guru: "आचार्यः · Guru", mother: "माता · Mother", friend: "मित्रम् · Friend", scholar: "विद्वान् · Scholar" };
export const PIPELINES = ["Sarvam Sanskrit voice", "Sarvam + open TTS", "Gemini native voice", "Sarvam + Gemini search"];
export function voices(c: LabConfig): string[] {
  if (c.pipeline === 3) return ["Puck", "Charon", "Kore", "Fenrir", "Aoede", "Leda", "Orus", "Zephyr"];
  if (c.pipeline === 2) return c.open_provider === "ai4bharat_indic_parler" ? ["Aryan", "Leela"] :
    ["hi-IN-SwaraNeural", "hi-IN-MadhurNeural", "te-IN-ShrutiNeural", "te-IN-MohanNeural", "kn-IN-SapnaNeural", "mr-IN-AarohiNeural"];
  return c.tts_model === "bulbul:v3" ? ["ashutosh", "aditya", "shubh", "advait", "ritu", "priya", "rohan", "kavya", "meera"] :
    ["shubh_hi_devotional", "shubh_enhi_ads", "simran_en_customer"];
}
