import AsyncStorage from "@react-native-async-storage/async-storage";
import { Directory, File, Paths } from "expo-file-system";
import { Platform } from "react-native";
import type { Shloka } from "../api/client";

export interface OfflineBook { book: string; chapter: string | null; title: string; pages: Shloka[]; savedAt: number }
const keyFor = (book: string, chapter?: string | null) => `shabd.offline.book.${encodeURIComponent(book)}.${encodeURIComponent(chapter ?? "*")}`;
const AUDIO_KEY = "shabd.offline.audio.v1";
let audio: Record<string, string> = {};
let loaded: Promise<void> | null = null;

export function loadOfflineAudio(): Promise<void> {
  return loaded ??= AsyncStorage.getItem(AUDIO_KEY).then(raw => { audio = raw ? JSON.parse(raw) : {}; }).catch(() => {});
}
export function offlineAudioUrl(url: string): string {
  const local = audio[url];
  if (!local || Platform.OS === "web") return url;
  try { return new File(local).exists ? local : url; } catch { return url; }
}
export async function loadOfflineBook(book: string, chapter?: string | null): Promise<OfflineBook | null> {
  await loadOfflineAudio();
  try { const raw = await AsyncStorage.getItem(keyFor(book, chapter)); return raw ? JSON.parse(raw) : null; }
  catch { return null; }
}
export async function saveOfflineBook(book: string, chapter: string | null, title: string, pages: Shloka[]): Promise<void> {
  if (!pages.length) throw new Error("Open a chapter before saving it.");
  await AsyncStorage.setItem(keyFor(book, chapter), JSON.stringify({ book, chapter, title, pages, savedAt: Date.now() }));
}
export async function listOfflineBooks(): Promise<OfflineBook[]> {
  const keys = (await AsyncStorage.getAllKeys()).filter(key => key.startsWith("shabd.offline.book."));
  return (await AsyncStorage.multiGet(keys)).flatMap(([, raw]) => {
    try { const pack = raw ? JSON.parse(raw) : null; return pack?.book && Array.isArray(pack.pages) ? [pack as OfflineBook] : []; }
    catch { return []; }
  }).sort((a, b) => b.savedAt - a.savedAt);
}
export async function downloadBookAudio(pages: Shloka[]): Promise<number> {
  if (Platform.OS === "web") throw new Error("Audio downloads are available in the mobile app.");
  await loadOfflineAudio();
  const { BASE_URL } = await import("../config");
  const urls = [...new Set(pages.flatMap(p => [p.chant?.url, p.audio_url].filter((u): u is string => !!u)))];
  if (!urls.length) throw new Error("This chapter has no prepared audio yet.");
  if (urls.length > 100) throw new Error("Choose a smaller chapter for audio downloads.");
  const directory = new Directory(Paths.document, "reading-audio");
  directory.create({ idempotent: true, intermediates: true });
  let bytes = 0;
  for (const url of urls) {
    if (offlineAudioUrl(url) !== url) continue;
    const src = url.startsWith("http") ? url : `${BASE_URL}${url}`;
    const head = await fetch(src, { method: "HEAD" });
    const length = Number(head.headers.get("Content-Length"));
    if (!head.ok || !length || bytes + length > 100 * 1024 * 1024) throw new Error("Audio download is unavailable or exceeds 100 MB. Text is saved.");
    bytes += length;
    // A stable filename without provider URLs, credentials or user details.
    let hash = 2166136261;
    for (let i = 0; i < src.length; i++) hash = Math.imul(hash ^ src.charCodeAt(i), 16777619);
    const destination = new File(directory, `${(hash >>> 0).toString(16)}-${src.length}.audio`);
    const file = await File.downloadFileAsync(src, destination, { idempotent: true });
    audio[url] = file.uri;
    audio[src] = file.uri;
    await AsyncStorage.setItem(AUDIO_KEY, JSON.stringify(audio));
  }
  return urls.length;
}
