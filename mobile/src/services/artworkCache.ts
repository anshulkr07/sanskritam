import { Directory, File, Paths } from "expo-file-system";
import { Platform } from "react-native";
import { artworkOrigin } from "../components/artwork/remoteArtwork";

const MAX_BYTES = 100 * 1024 * 1024;
const pending = new Map<string, Promise<string>>();
const active = new Map<string, number>();
const touched = new Map<string, number>();
let directory: Directory | undefined;
let sequence = 0;
let running = 0;
const waiting: (() => void)[] = [];

function cacheDirectory(): Directory {
  directory ??= new Directory(Paths.cache, "public-artwork-v1");
  if (!directory.exists) directory.create({ intermediates: true, idempotent: true });
  return directory;
}

export function isManagedArtwork(uri: string): boolean {
  return !!artworkOrigin && uri.startsWith(artworkOrigin + "/art/");
}

function filename(uri: string): string {
  const name = uri.split("?")[0].split("/").pop() ?? "";
  // All generated manifests use content hashes. Reject arbitrary paths/URLs.
  if (!/^[a-f0-9]{24}\.(webp|png|jpe?g|avif|gif|svg)$/i.test(name)) throw new Error("Invalid artwork cache key");
  return name;
}

export function retainArtwork(uri: string): () => void {
  if (!isManagedArtwork(uri)) return () => {};
  const name = filename(uri);
  active.set(name, (active.get(name) ?? 0) + 1);
  return () => {
    const count = (active.get(name) ?? 1) - 1;
    if (count > 0) active.set(name, count); else active.delete(name);
  };
}

function prune(): void {
  const files = cacheDirectory().list().filter((f): f is File => f instanceof File && !f.name.endsWith(".part"));
  let total = files.reduce((sum, file) => sum + (file.size ?? 0), 0);
  if (total <= MAX_BYTES) return;
  files.sort((a, b) => (touched.get(a.name) ?? a.modificationTime ?? 0) - (touched.get(b.name) ?? b.modificationTime ?? 0));
  for (const file of files) {
    if (total <= MAX_BYTES) break;
    if (active.has(file.name)) continue;
    const bytes = file.size ?? 0;
    file.delete(); touched.delete(file.name); total -= bytes;
  }
}

async function download(uri: string): Promise<string> {
  if (running >= 3) await new Promise<void>(resolve => waiting.push(resolve));
  else running += 1;
  let temporary: File | undefined;
  try {
    const name = filename(uri);
    const destination = new File(cacheDirectory(), name);
    if (!destination.exists || !destination.size) {
      temporary = new File(cacheDirectory(), `${name}.${++sequence}.part`);
      await File.downloadFileAsync(uri, temporary, { idempotent: true });
      if (!temporary.exists || !temporary.size) throw new Error("Empty artwork download");
      temporary.move(destination);
      temporary = undefined;
    }
    touched.set(name, Date.now());
    try { prune(); } catch { /* Cache housekeeping must never block reading. */ }
    return destination.uri;
  } finally {
    try { if (temporary?.exists) temporary.delete(); } finally {
      const next = waiting.shift();
      if (next) next(); else running -= 1;
    }
  }
}

/** Network failure is handled by the native Image's usual onError fallback. */
export async function cachedArtworkUri(uri: string): Promise<string> {
  if (Platform.OS === "web" || !isManagedArtwork(uri)) return uri;
  const name = filename(uri);
  const cached = new File(cacheDirectory(), name);
  if (cached.exists && cached.size) { touched.set(name, Date.now()); return cached.uri; }
  const existing = pending.get(uri);
  if (existing) return existing;
  const promise = download(uri).finally(() => pending.delete(uri));
  pending.set(uri, promise);
  return promise;
}

export function prefetchArtwork(uris: string[]): void {
  for (const uri of [...new Set(uris)]) void cachedArtworkUri(uri).catch(() => {});
}
