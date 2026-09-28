// prefs — user-facing preference flags with persistence (U15-7).
//
// Settings wrote shabd.pref.haptics and shabd.pref.reducedMotion and nothing
// read either key — two toggles that did nothing (LESSON_OVERHAUL §11). This
// module owns both flags: persisted to AsyncStorage, readable synchronously
// after load, with a subscription so mounted screens react to a toggle.

import AsyncStorage from "@react-native-async-storage/async-storage";

export const PREF_KEYS = {
  sound: "shabd.pref.sound",
  haptics: "shabd.pref.haptics",
  reducedMotion: "shabd.pref.reducedMotion",
  textSize: "shabd.pref.textSize",
  guideLang: "shabd.pref.guideLang",
} as const;

let hapticsEnabled = true;
let reducedMotionOverride = false;
// Grammar guide language. null = never chosen: the screen falls back to the
// learner's bridge languages until the toggle is used.
let guideLang: "en" | "hi" | null = null;

type Listener = () => void;
const listeners = new Set<Listener>();

function notify(): void {
  for (const l of listeners) {
    try {
      l();
    } catch {
      /* a dead listener never breaks a toggle */
    }
  }
}

export function subscribePrefs(l: Listener): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

/** Load persisted flags at startup; safe to call repeatedly. */
export async function loadPrefs(): Promise<void> {
  try {
    const [h, r, g] = await Promise.all([
      AsyncStorage.getItem(PREF_KEYS.haptics),
      AsyncStorage.getItem(PREF_KEYS.reducedMotion),
      AsyncStorage.getItem(PREF_KEYS.guideLang),
    ]);
    if (h !== null) hapticsEnabled = h !== "false";
    if (r !== null) reducedMotionOverride = r === "true";
    if (g === "en" || g === "hi") guideLang = g;
    notify();
  } catch {
    /* storage unavailable — defaults stand */
  }
}

export function isHapticsEnabled(): boolean {
  return hapticsEnabled;
}

export function setHapticsEnabled(v: boolean): void {
  hapticsEnabled = v;
  AsyncStorage.setItem(PREF_KEYS.haptics, v ? "true" : "false").catch(() => null);
  notify();
}

export function isReducedMotionOverride(): boolean {
  return reducedMotionOverride;
}

export function setReducedMotionOverride(v: boolean): void {
  reducedMotionOverride = v;
  AsyncStorage.setItem(PREF_KEYS.reducedMotion, v ? "true" : "false").catch(() => null);
  notify();
}

/** The grammar guide's language, or null when the learner never chose one. */
export function getGuideLang(): "en" | "hi" | null {
  return guideLang;
}

export function setGuideLang(v: "en" | "hi"): void {
  guideLang = v;
  AsyncStorage.setItem(PREF_KEYS.guideLang, v).catch(() => null);
  notify();
}
