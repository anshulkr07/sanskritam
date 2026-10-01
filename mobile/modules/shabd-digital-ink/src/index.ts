// shabd-digital-ink — JS side of the local Expo module.
//
// On-device Digital Ink recognition (Google ML Kit) for the writing
// practice screen. One function per seam in inkRecogniser.ts:
//
//   downloadModel("hi")  — fetch the Devanagari model on first use
//                          (Play Services / ML Kit download, ~tens of MB,
//                          needs network once, then fully offline).
//   recognize("hi", strokes) — strokes in, [{text, score}] out.
//                          Nothing leaves the device.
//
// A missing native module must be HARMLESS, not fatal. `requireNativeModule`
// throws at load time when the native code is absent (Expo Go, or a release
// build whose archive skipped the Kotlin source), and Metro's
// `guardedLoadModule` reports any error thrown while loading a module to
// `ErrorUtils.reportFatalError` BEFORE the caller's try/catch can see it —
// in a release build that is a fatal crash. So a lazy `require()` wrapped in
// try/catch is NOT a guard for a native module. This file therefore uses
// `requireOptionalNativeModule`, which returns `null` instead of throwing,
// and every exported function rejects with a clear error when `Native` is
// null. Callers check `isAvailable` first and fall back to the template
// matcher without ever touching the native side.

import { requireOptionalNativeModule } from "expo-modules-core";

export interface InkPoint {
  x: number;
  y: number;
}

export interface InkCandidate {
  text: string;
  /** 0..1 recogniser confidence. ML Kit may omit it — callers treat missing as 0. */
  score: number;
}

interface NativeModuleShape {
  downloadModel(languageTag: string): Promise<boolean>;
  getDownloadedModels(): Promise<string[]>;
  deleteModel(languageTag: string): Promise<boolean>;
  recognize(languageTag: string, strokes: InkPoint[][]): Promise<InkCandidate[]>;
}

const Native = requireOptionalNativeModule<NativeModuleShape>("ShabdDigitalInk");

/** True when the native handwriting module is linked in this build. */
export const isAvailable = Native != null;

function needNative(): NativeModuleShape {
  if (!Native) {
    throw new Error(
      "ShabdDigitalInk is not available in this build; use the offline matcher instead.",
    );
  }
  return Native;
}

export async function downloadModel(languageTag: string): Promise<boolean> {
  return needNative().downloadModel(languageTag);
}

export async function getDownloadedModels(): Promise<string[]> {
  return needNative().getDownloadedModels();
}

export async function deleteModel(languageTag: string): Promise<boolean> {
  return needNative().deleteModel(languageTag);
}

export async function recognize(
  languageTag: string,
  strokes: InkPoint[][],
): Promise<InkCandidate[]> {
  return needNative().recognize(languageTag, strokes);
}

export default { downloadModel, getDownloadedModels, deleteModel, recognize, isAvailable };
