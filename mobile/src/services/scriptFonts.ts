// Register the face for ONE Indic script, on demand.
//
// Talk became multilingual on 2026-09-22: the tutor replies in whichever of
// Sarvam's ten Indian languages the learner actually used. That is ten
// scripts, and `useFonts` in App.tsx is eager — registering all ten at boot
// delays the splash screen for nine faces the learner will never see, since
// in practice a learner uses exactly one.
//
// So the Sanskrit face (the app's core content) is bundled eagerly in
// App.tsx, and the learner's own script is registered here the first time a
// turn comes back in it. Until then the text renders in the platform font —
// which is a complete, correct Noto face for every one of these scripts on
// both iOS and Android, so nothing is ever blank or boxed. It simply is not
// our face yet, for the few hundred ms that takes.
//
// Honest about what this does and does not save: Metro resolves every
// `require` below at bundle time, so the .ttf files ship either way. What is
// deferred is REGISTRATION with the OS text engine, and that is what blocks
// the splash.

import * as Font from "expo-font";

type ScriptKey =
  | "devanagari" | "kannada" | "telugu" | "tamil" | "malayalam"
  | "bengali" | "gujarati" | "gurmukhi" | "oriya" | "latin";

/**
 * Script key -> the font map `Font.loadAsync` wants.
 *
 * Thunks, not values: a bare `require` at module scope would pull all nine
 * .ttf files into the initial Metro chunk and undo the point of this module.
 * "latin" is absent on purpose — Nunito already covers it.
 */
const LOADERS: Partial<Record<ScriptKey, () => Record<string, number>>> = {
  devanagari: () => ({
    NotoSansDevanagari_400Regular:
      require("@expo-google-fonts/noto-sans-devanagari/400Regular/NotoSansDevanagari_400Regular.ttf"),
  }),
  kannada: () => ({
    NotoSansKannada_400Regular:
      require("@expo-google-fonts/noto-sans-kannada/400Regular/NotoSansKannada_400Regular.ttf"),
  }),
  telugu: () => ({
    NotoSansTelugu_400Regular:
      require("@expo-google-fonts/noto-sans-telugu/400Regular/NotoSansTelugu_400Regular.ttf"),
  }),
  tamil: () => ({
    NotoSansTamil_400Regular:
      require("@expo-google-fonts/noto-sans-tamil/400Regular/NotoSansTamil_400Regular.ttf"),
  }),
  malayalam: () => ({
    NotoSansMalayalam_400Regular:
      require("@expo-google-fonts/noto-sans-malayalam/400Regular/NotoSansMalayalam_400Regular.ttf"),
  }),
  bengali: () => ({
    NotoSansBengali_400Regular:
      require("@expo-google-fonts/noto-sans-bengali/400Regular/NotoSansBengali_400Regular.ttf"),
  }),
  gujarati: () => ({
    NotoSansGujarati_400Regular:
      require("@expo-google-fonts/noto-sans-gujarati/400Regular/NotoSansGujarati_400Regular.ttf"),
  }),
  gurmukhi: () => ({
    NotoSansGurmukhi_400Regular:
      require("@expo-google-fonts/noto-sans-gurmukhi/400Regular/NotoSansGurmukhi_400Regular.ttf"),
  }),
  oriya: () => ({
    NotoSansOriya_400Regular:
      require("@expo-google-fonts/noto-sans-oriya/400Regular/NotoSansOriya_400Regular.ttf"),
  }),
};

/** Scripts already registered, so a re-render never re-registers. */
const loaded = new Set<string>();
/** In-flight loads, so two turns arriving together share one registration. */
const inFlight = new Map<string, Promise<boolean>>();

export function isScriptLoaded(scriptKey: string): boolean {
  return scriptKey === "latin" || loaded.has(scriptKey);
}

/**
 * Register the face for `scriptKey`, once.
 *
 * Resolves `true` when the face is usable (or was already), `false` when it
 * could not be registered — which is NOT an error state: the caller keeps
 * rendering in the platform font, and the learner sees correct text either
 * way. Never rejects, because a missing font must never take a turn down.
 */
export async function ensureScriptFont(scriptKey: string): Promise<boolean> {
  if (!scriptKey || scriptKey === "latin") return true;
  if (loaded.has(scriptKey)) return true;

  const existing = inFlight.get(scriptKey);
  if (existing) return existing;

  const loader = LOADERS[scriptKey as ScriptKey];
  if (!loader) return false;

  const task = (async () => {
    try {
      await Font.loadAsync(loader());
      loaded.add(scriptKey);
      return true;
    } catch (err) {
      // Degrade silently to the platform font. Worth a console line because
      // a font that never loads is a real (if cosmetic) regression.
      console.warn(`[scriptFonts] could not register ${scriptKey}:`, err);
      return false;
    } finally {
      inFlight.delete(scriptKey);
    }
  })();

  inFlight.set(scriptKey, task);
  return task;
}
