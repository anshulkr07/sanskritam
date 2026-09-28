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
// Throws when the native module is absent (Expo Go) — callers must
// require() inside try/catch and fall back to the unavailable adapter.

import { requireNativeModule } from "expo-modules-core";

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

const Native = requireNativeModule<NativeModuleShape>("ShabdDigitalInk");

export async function downloadModel(languageTag: string): Promise<boolean> {
  return Native.downloadModel(languageTag);
}

export async function getDownloadedModels(): Promise<string[]> {
  return Native.getDownloadedModels();
}

export async function deleteModel(languageTag: string): Promise<boolean> {
  return Native.deleteModel(languageTag);
}

export async function recognize(
  languageTag: string,
  strokes: InkPoint[][],
): Promise<InkCandidate[]> {
  return Native.recognize(languageTag, strokes);
}

export default { downloadModel, getDownloadedModels, deleteModel, recognize };
