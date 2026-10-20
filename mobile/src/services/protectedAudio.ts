import AsyncStorage from "@react-native-async-storage/async-storage";
import { AESEncryptionKey, AESSealedData, aesDecryptAsync, aesEncryptAsync, CryptoDigestAlgorithm, digestStringAsync, randomUUID } from "expo-crypto";
import { Directory, File, Paths } from "expo-file-system";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const LEGACY_KEY = "shabd.offline.audio.v1";
const PREFIX = "shabd.offline.audio.v2.";
type Entry = { uri: string; format: "aes-gcm-v1" };
type Session = { owner: string; id: Promise<string>; entries: Record<string, Entry>; ready?: Promise<void>; key?: Promise<AESEncryptionKey>; queue: Promise<unknown>; loaded: boolean };
let session: Session | null = null;
const releases = new Set<() => void>();
const invalidations = new Set<() => void>();
let cleaned = false;
const encryptedDirectory = () => { const d = new Directory(Paths.document, "protected-reading-audio"); d.create({ idempotent: true, intermediates: true }); return d; };
const playbackDirectory = () => { const d = new Directory(Paths.cache, "protected-audio-playback"); d.create({ idempotent: true, intermediates: true }); return d; };
const inside = (uri: string, directory: Directory) => uri.startsWith(directory.uri.replace(/\/$/, "") + "/") && !uri.includes("..");

export function setOfflineAudioOwner(owner: string | null): void {
  if (Platform.OS === "web") return;
  if (session?.owner === owner) return;
  resetOfflineAudio();
  session = owner ? { owner, id: digestStringAsync(CryptoDigestAlgorithm.SHA256, owner), entries: {}, queue: Promise.resolve(), loaded: false } : null;
  if (session) void loadOfflineAudio().catch(() => {});
}
export function onOfflineAudioInvalidated(callback: () => void) { invalidations.add(callback); return () => { invalidations.delete(callback); }; }
export function resetOfflineAudio(): void {
  for (const callback of invalidations) { try { callback(); } catch { /* Continue clearing other players. */ } }
  for (const release of [...releases]) { try { release(); } catch { /* The next startup also clears private playback files. */ } }
  if (session) { session.ready = undefined; session.entries = {}; session.loaded = false; }
}
function current(): Session {
  if (!session) throw new Error("Sign in to use saved audio.");
  return session;
}
async function keyFor(s: Session): Promise<AESEncryptionKey> {
  return s.key ??= (async () => {
    const name = `shabd.audio.key.${await s.id}`;
    const stored = await SecureStore.getItemAsync(name);
    if (stored) return AESEncryptionKey.import(stored, "hex");
    const key = await AESEncryptionKey.generate();
    await SecureStore.setItemAsync(name, await key.encoded("hex"), { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY });
    return key;
  })().catch(error => { s.key = undefined; throw error; });
}
async function persist(s: Session) { await AsyncStorage.setItem(PREFIX + await s.id, JSON.stringify(s.entries)); }
async function seal(s: Session, bytes: Uint8Array): Promise<Entry> {
  const data = await aesEncryptAsync(bytes, await keyFor(s));
  const file = new File(encryptedDirectory(), `${randomUUID()}.sba`);
  try { file.write(await data.combined()); return { uri: file.uri, format: "aes-gcm-v1" }; }
  catch (error) { if (file.exists) file.delete(); throw error; }
}
export async function loadOfflineAudio(): Promise<void> {
  if (Platform.OS === "web" || !session) return;
  const s = session;
  return s.ready ??= (async () => {
    if (!cleaned) {
      cleaned = true;
      // A crash can leave a private playback file; remove it at next startup.
      for (const file of playbackDirectory().list()) if (file instanceof File) file.delete();
    }
    const raw = await AsyncStorage.getItem(PREFIX + await s.id);
    try { s.entries = raw ? JSON.parse(raw) : {}; } catch { s.entries = {}; }
    // Upgrade old plaintext packs in place, keeping only authenticated ciphertext.
    const legacyRaw = await AsyncStorage.getItem(LEGACY_KEY);
    if (!legacyRaw) { s.loaded = true; return; }
    let legacy: Record<string, string>;
    try { legacy = JSON.parse(legacyRaw); } catch { s.loaded = true; return; }
    const converted = new Map<string, Entry>();
    const oldDirectory = new Directory(Paths.document, "reading-audio");
    for (const [url, uri] of Object.entries(legacy)) {
      if (session !== s) return;
      if (typeof uri !== "string" || !inside(uri, oldDirectory)) continue;
      const file = new File(uri);
      if (!file.exists) continue;
      let entry = converted.get(uri);
      if (!entry) { entry = await seal(s, await file.bytes()); converted.set(uri, entry); }
      s.entries[url] = entry;
    }
    await persist(s);
    await AsyncStorage.removeItem(LEGACY_KEY);
    for (const uri of converted.keys()) { const old = new File(uri); if (old.exists) old.delete(); }
    s.loaded = true;
  })().catch(error => { s.ready = undefined; throw error; });
}
export function needsOfflineAudioResolution(url: string): boolean {
  return Platform.OS !== "web" && !!session && (!session.loaded || hasOfflineAudio(url));
}
export function hasOfflineAudio(url: string): boolean {
  const entry = session?.entries[url];
  return !!entry && entry.format === "aes-gcm-v1" && inside(entry.uri, encryptedDirectory()) && new File(entry.uri).exists;
}
export async function saveProtectedAudio(url: string, absoluteUrl: string, maxBytes: number): Promise<number> {
  const s = current();
  await loadOfflineAudio();
  // Serialise map writes, including concurrent chapter downloads.
  const save = async () => {
    if (session !== s) throw new Error("Account changed. Retry the download.");
    if (hasOfflineAudio(url) || hasOfflineAudio(absoluteUrl)) return 0;
    const response = await fetch(absoluteUrl);
    if (!response.ok) throw new Error("Couldn't download the recording. Retry.");
    const declared = Number(response.headers.get("Content-Length"));
    if (declared > maxBytes) throw new Error("Audio exceeds the download limit.");
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (!bytes.length || bytes.length > maxBytes) throw new Error("Audio is empty or exceeds the download limit.");
    const entry = await seal(s, bytes);
    if (session !== s) { new File(entry.uri).delete(); throw new Error("Account changed. Retry the download."); }
    const previous = { ...s.entries };
    s.entries[url] = entry; s.entries[absoluteUrl] = entry;
    try { await persist(s); } catch (error) { s.entries = previous; new File(entry.uri).delete(); throw error; }
    return bytes.length;
  };
  const pending = s.queue.then(save, save);
  s.queue = pending.catch(() => {});
  return pending;
}
export type AudioLease = { uri: string; release: () => void };
export async function resolveOfflineAudio(url: string): Promise<AudioLease> {
  const fallback = { uri: url, release: () => {} };
  if (Platform.OS === "web" || !session) return fallback;
  const s = session;
  await loadOfflineAudio();
  if (session !== s) throw new Error("Audio session changed.");
  const entry = s.entries[url];
  if (!entry || !hasOfflineAudio(url)) return fallback;
  const sealed = AESSealedData.fromCombined(await new File(entry.uri).bytes());
  const bytes = await aesDecryptAsync(sealed, await keyFor(s));
  if (session !== s) throw new Error("Audio session changed.");
  const file = new File(playbackDirectory(), `${randomUUID()}.audio`);
  file.write(bytes);
  const release = () => { try { if (file.exists) file.delete(); } finally { releases.delete(release); } };
  releases.add(release);
  return { uri: file.uri, release };
}
