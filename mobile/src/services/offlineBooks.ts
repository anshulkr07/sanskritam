import AsyncStorage from "@react-native-async-storage/async-storage";
import { Directory, File, Paths } from "expo-file-system";
import { Platform } from "react-native";
import type { Shloka } from "../api/client";
import { ensureCommerce, commerceSnapshot } from "./commerce";
import { seal, open, openWithLicence } from "./offlineVault";

export interface OfflineBook { book: string; chapter: string | null; title: string; pages: Shloka[]; savedAt: number; medium?: "book" | "audio" }
const keyFor = (book: string, chapter?: string | null) => `shabd.offline.book.${encodeURIComponent(book)}.${encodeURIComponent(chapter ?? "*")}`;
const AUDIO_KEY = "shabd.offline.audio.v1";
let audio: Record<string, string> = {};
let loaded: Promise<void> | null = null;
const audioExpiry: Record<string, number> = {};
const temporaryFiles = new Set<string>();
function mediaIdentity(url: string) {
  try {
    const token = url.split("/commerce/media?ticket=")[1];
    if (!token) return url;
    const data = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return `${data.row}:${data.kind}:${data.title}`;
  } catch { return url; }
}
export function resetOfflineAudio() {
  audio = {}; loaded = null;
  for (const uri of temporaryFiles) { try { new File(uri).delete(); } catch {} }
  temporaryFiles.clear();
  for (const key of Object.keys(audioExpiry)) delete audioExpiry[key];
}

export function loadOfflineAudio(): Promise<void> {
  return loaded ??= (async () => {
    if (commerceSnapshot()?.enabled === false) {
      const raw = await AsyncStorage.getItem(AUDIO_KEY); audio = raw ? JSON.parse(raw) : {}; return;
    }
    if (Platform.OS === "web") return;
    const directory = new Directory(Paths.document, "reading-audio");
    if (!directory.exists) return;
    for (const file of directory.list()) {
      if (!(file instanceof File) || !file.name.endsWith(".encrypted")) continue;
      const value = JSON.parse(await file.text());
      const original = value.sealed;
      const pack = await openWithLicence<{ bytes: number[]; urls: string[] }>(value);
      if (!pack) { file.delete(); continue; }
      if (value.sealed !== original) file.write(JSON.stringify(value));
      const temporary = new File(Paths.cache, "sanskrit-vault-" + file.name + ".audio");
      temporary.write(new Uint8Array(pack.data.bytes)); temporaryFiles.add(temporary.uri);
      for (const url of pack.data.urls) { const key = mediaIdentity(url); audio[key] = temporary.uri; audioExpiry[key] = pack.expires; }
    }
  })().catch(() => {});
}
export function offlineAudioUrl(url: string): string {
  const key = mediaIdentity(url);
  const local = audio[key] || audio[url];
  if (!local || Platform.OS === "web") return url;
  if (commerceSnapshot()?.enabled !== false && (!audioExpiry[key] || audioExpiry[key] <= Date.now())) return url;
  try { return new File(local).exists ? local : url; } catch { return url; }
}
export async function loadOfflineBook(book: string, chapter?: string | null, medium: "book" | "audio" = "book"): Promise<OfflineBook | null> {
  await loadOfflineAudio();
  try {
    const storageKey = keyFor(medium === "audio" ? book + ":audio" : book, chapter);
    const raw = await AsyncStorage.getItem(storageKey);
    if (!raw) return null;
    const value = JSON.parse(raw);
    if (value.version === 2) {
      const original = value.sealed;
      const data = await open<OfflineBook>(value);
      if (!data) await AsyncStorage.removeItem(storageKey);
      else if (value.sealed !== original) await AsyncStorage.setItem(storageKey, JSON.stringify(value));
      return data;
    }
    if (commerceSnapshot()?.enabled !== false) return null;
    return value;
  }
  catch { return null; }
}
export async function saveOfflineBook(book: string, chapter: string | null, title: string, pages: Shloka[]): Promise<void> {
  if (!pages.length) throw new Error("Open a chapter before saving it.");
  const data = { book, chapter, title, pages, savedAt: Date.now() };
  const state = await ensureCommerce();
  const saved = state.enabled ? await seal(data, book + ":book") : data;
  await AsyncStorage.setItem(keyFor(book, chapter), JSON.stringify(saved));
}
export async function listOfflineBooks(): Promise<OfflineBook[]> {
  const keys = (await AsyncStorage.getAllKeys()).filter(key => key.startsWith("shabd.offline.book."));
  const packs = await Promise.all((await AsyncStorage.multiGet(keys)).map(async ([key, raw]) => {
    try {
      const value = raw ? JSON.parse(raw) : null;
      const original = value?.sealed;
      const pack = value?.version === 2 ? await open<OfflineBook>(value) : commerceSnapshot()?.enabled === false ? value : null;
      if (!pack) await AsyncStorage.removeItem(key);
      else if (value?.sealed !== original) await AsyncStorage.setItem(key, JSON.stringify(value));
      return pack?.book && Array.isArray(pack.pages) ? pack as OfflineBook : null;
    } catch { return null; }
  }));
  return packs.filter((p): p is OfflineBook => p !== null).sort((a, b) => b.savedAt - a.savedAt);
}
export async function downloadBookAudio(pages: Shloka[], book?: string): Promise<number> {
  if (Platform.OS === "web") throw new Error("Audio downloads are available in the mobile app.");
  await loadOfflineAudio();
  const state = await ensureCommerce();
  if (state.enabled && !book) throw new Error("Choose a licensed audiobook before downloading.");
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
    if (state.enabled) {
      const bytes = await file.bytes();
      const encrypted = await seal({ bytes: Array.from(bytes), urls: [url, src] }, book + ":audio");
      const encryptedFile = new File(directory, destination.name + ".encrypted");
      encryptedFile.write(JSON.stringify(encrypted));
      file.delete();
      // Plain playback files live only in the disposable cache.
      const temporary = new File(Paths.cache, destination.name);
      temporary.write(bytes);
      audio[url] = temporary.uri; audio[src] = temporary.uri;
      temporaryFiles.add(temporary.uri);
      const identity = mediaIdentity(url); audio[identity] = temporary.uri;
      audioExpiry[identity] = Math.min(Date.now() + 7 * 86400000, Date.parse(state.member_until! + "Z"));
    } else {
      audio[url] = file.uri; audio[src] = file.uri;
    }
    if (!state.enabled) await AsyncStorage.setItem(AUDIO_KEY, JSON.stringify(audio));
  }
  if (state.enabled && book) {
    const pack: OfflineBook = { book, chapter: null, title: book, pages, savedAt: Date.now(), medium: "audio" };
    await AsyncStorage.setItem(keyFor(book + ":audio", null), JSON.stringify(await seal(pack, book + ":audio")));
  }
  return urls.length;
}

export async function reconcileOfflineAccess() {
  await listOfflineBooks();
  resetOfflineAudio();
  await loadOfflineAudio();
}
