import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import type { Shloka } from "../api/client";
import { hasOfflineAudio, loadOfflineAudio, resetOfflineAudio, saveProtectedAudio } from "./protectedAudio";

export interface OfflineBook { book: string; chapter: string | null; title: string; pages: Shloka[]; savedAt: number; medium?: "book" | "audio" }
const keyFor = (book: string, chapter?: string | null) => `shabd.offline.book.${encodeURIComponent(book)}.${encodeURIComponent(chapter ?? "*")}`;
export { loadOfflineAudio, resetOfflineAudio } from "./protectedAudio";
export async function loadOfflineBook(book: string, chapter?: string | null, medium: "book" | "audio" = "book"): Promise<OfflineBook | null> {
  void loadOfflineAudio().catch(() => {});
  try {
    const raw = await AsyncStorage.getItem(keyFor(medium === "audio" ? book + ":audio" : book, chapter));
    const value = raw ? JSON.parse(raw) : null;
    return value?.book && Array.isArray(value.pages) ? value : null;
  } catch { return null; }
}
export async function saveOfflineBook(book: string, chapter: string | null, title: string, pages: Shloka[]): Promise<void> {
  if (!pages.length) throw new Error("Open a chapter before saving it.");
  await AsyncStorage.setItem(keyFor(book, chapter), JSON.stringify({ book, chapter, title, pages, savedAt: Date.now() }));
}
export async function listOfflineBooks(): Promise<OfflineBook[]> {
  const keys = (await AsyncStorage.getAllKeys()).filter(key => key.startsWith("shabd.offline.book."));
  return (await AsyncStorage.multiGet(keys)).flatMap(([, raw]) => {
    try { const p = raw ? JSON.parse(raw) : null; return p?.book && Array.isArray(p.pages) ? [p as OfflineBook] : []; }
    catch { return []; }
  }).sort((a, b) => b.savedAt - a.savedAt);
}
export async function downloadBookAudio(pages: Shloka[], book?: string): Promise<number> {
  if (Platform.OS === "web") throw new Error("Audio downloads are available in the mobile app.");
  await loadOfflineAudio();
  const { BASE_URL } = await import("../config");
  const urls = [...new Set(pages.flatMap(p => [p.chant?.url, p.audio_url].filter((u): u is string => !!u)))];
  if (!urls.length) throw new Error("This chapter has no prepared audio yet.");
  if (urls.length > 100) throw new Error("Choose a smaller chapter for audio downloads.");
  let bytes = 0;
  for (const url of urls) {
    const src = url.startsWith("http") ? url : `${BASE_URL}${url}`;
    if (hasOfflineAudio(url) || hasOfflineAudio(src)) continue;
    const head = await fetch(src, { method: "HEAD" });
    const length = Number(head.headers.get("Content-Length"));
    if (!head.ok || !length || bytes + length > 100 * 1024 * 1024) throw new Error("Audio download is unavailable or exceeds 100 MB. Text is saved.");
    bytes += await saveProtectedAudio(url, src, 100 * 1024 * 1024 - bytes);
  }
  if (book) await AsyncStorage.setItem(keyFor(book + ":audio", null), JSON.stringify({ book, chapter: null, title: book, pages, savedAt: Date.now(), medium: "audio" }));
  return urls.length;
}
export async function reconcileOfflineAccess() { resetOfflineAudio(); await loadOfflineAudio(); }
