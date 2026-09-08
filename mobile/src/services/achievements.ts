// Achievements (U3-4) — milestones that suit THIS product, revealed with
// Sanskrit visual motifs (lotus, kalasha, conch, lamp, pair) — never generic
// trophy icons.
//
// v1 bookkeeping is local (AsyncStorage): each event is recorded at the
// moment it happens (session complete, sloka studied, pronunciation attempt,
// dual correct, streak seen). No backend, no network, no new dependencies.
// The reveal moment (AchievementReveal) fires sfx.badgeUnlock + haptics.
//
// Badge art (Lottie lotus/kalasha/conch) is owner-supplied art, not code:
// the reveal renders the motif as a Sanskrit word-mark + Confetti until art
// lands. Do NOT build a leaderboard here — U3-5 leagues are ask-first.

import AsyncStorage from "@react-native-async-storage/async-storage";

export interface AchievementDef {
  id: string;
  sa: string;      // Sanskrit name — the headline
  en: string;      // one-line gloss
  motif: string;   // Sanskrit motif word-mark: kamalam | kalasha | shankha | deepa | yugma
  hint: string;    // how to earn it
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: "prathama-samvada",
    sa: "प्रथमः संवादः",
    en: "First conversation completed",
    motif: "शङ्खः",
    hint: "Finish one guided conversation",
  },
  {
    id: "prathama-sloka",
    sa: "प्रथमः श्लोकः",
    en: "First śloka studied",
    motif: "कमलम्",
    hint: "Open a verse in the reader",
  },
  {
    id: "sparsha-pancaka",
    sa: "स्पर्शपञ्चकम्",
    en: "All 25 sparśa consonants attempted",
    motif: "कलशः",
    hint: "Practise every stop consonant row",
  },
  {
    id: "sapta-dina",
    sa: "सप्तदिनम्",
    en: "7-day streak",
    motif: "दीपः",
    hint: "Practise seven days in a row",
  },
  {
    id: "dvivacana-prathama",
    sa: "द्विवचनम्",
    en: "First dual-number sentence correct",
    motif: "युग्मम्",
    hint: "Answer one dual sentence correctly",
  },
];

// The 25 sparśa targets (Devanagari) for sparsha-pancaka.
export const SPARSHA_25 = [
  "क", "ख", "ग", "घ", "ङ",
  "च", "छ", "ज", "झ", "ञ",
  "ट", "ठ", "ड", "ढ", "ण",
  "त", "थ", "द", "ध", "न",
  "प", "फ", "ब", "भ", "म",
];

export type AchievementEvent =
  | { type: "conversation_complete" }
  | { type: "sloka_studied" }
  | { type: "pronunciation_attempt"; target: string }
  | { type: "streak"; days: number }
  | { type: "dual_correct" };

const UNLOCKED_KEY = "shabd.ach.unlocked";
const SPARSHA_KEY = "shabd.ach.sparsha";

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function getUnlocked(): Promise<Record<string, string>> {
  return readJson<Record<string, string>>(UNLOCKED_KEY, {});
}

export async function getSparshaCoverage(): Promise<string[]> {
  return readJson<string[]>(SPARSHA_KEY, []);
}

/**
 * Record one event. Returns the defs newly unlocked by THIS event (usually
 * zero or one) so the caller can reveal immediately. Idempotent: an already
 * unlocked achievement never re-fires.
 */
export async function recordEvent(event: AchievementEvent): Promise<AchievementDef[]> {
  const unlocked = await getUnlocked();
  const fresh: AchievementDef[] = [];
  const grant = async (id: string) => {
    if (!unlocked[id]) {
      unlocked[id] = new Date().toISOString();
      await AsyncStorage.setItem(UNLOCKED_KEY, JSON.stringify(unlocked)).catch(() => {});
      const def = ACHIEVEMENTS.find((a) => a.id === id);
      if (def) fresh.push(def);
    }
  };

  switch (event.type) {
    case "conversation_complete":
      await grant("prathama-samvada");
      break;
    case "sloka_studied":
      await grant("prathama-sloka");
      break;
    case "dual_correct":
      await grant("dvivacana-prathama");
      break;
    case "streak":
      if (event.days >= 7) await grant("sapta-dina");
      break;
    case "pronunciation_attempt": {
      if (!SPARSHA_25.includes(event.target)) break;
      const seen = new Set(await getSparshaCoverage());
      seen.add(event.target);
      await AsyncStorage.setItem(SPARSHA_KEY, JSON.stringify([...seen])).catch(() => {});
      if (SPARSHA_25.every((t) => seen.has(t))) await grant("sparsha-pancaka");
      break;
    }
  }
  return fresh;
}

export default { ACHIEVEMENTS, SPARSHA_25, recordEvent, getUnlocked, getSparshaCoverage };
