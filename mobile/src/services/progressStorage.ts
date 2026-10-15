import AsyncStorage from "@react-native-async-storage/async-storage";

type Entry = { value: string; updated_ms: number };
type Session = { owner: string; entries: Record<string, Entry>; ready: Promise<void>; queue: Promise<void> };
const listeners = new Set<() => void>();
const allowed = (key: string) => /^(shabd\.(learnv2|trail|read|story)\.|shabd\.grammar\.(read|last)$|shabd\.learning\.goal$)/.test(key);
const storageKey = (owner: string) => `shabd.learning.state.${owner}`;
let session: Session | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;
let syncing = false;
const notify = () => listeners.forEach(fn => fn());

export function subscribeProgress(listener: () => void): () => void {
  listeners.add(listener); return () => { listeners.delete(listener); };
}

export function setProgressOwner(owner: string | null): void {
  if (session?.owner === owner) return;
  if (timer) clearTimeout(timer);
  if (!owner) { session = null; notify(); return; }
  const next: Session = { owner, entries: {}, ready: Promise.resolve(), queue: Promise.resolve() };
  session = next;
  next.ready = (async () => {
    try {
      const raw = await AsyncStorage.getItem(storageKey(owner));
      if (raw) next.entries = JSON.parse(raw);
      // Only the first account on this installation inherits unscoped legacy
      // bookmarks. Signing into another account never copies those marks.
      const migrated = await AsyncStorage.getItem("shabd.learning.legacyOwner");
      if (!migrated) {
        await AsyncStorage.setItem("shabd.learning.legacyOwner", owner);
        const keys = (await AsyncStorage.getAllKeys()).filter(allowed);
        for (const [key, value] of await AsyncStorage.multiGet(keys)) {
          if (value !== null && !next.entries[key]) next.entries[key] = { value, updated_ms: 1 };
        }
        await persist(next);
      }
    } catch { /* offline/read-only storage still allows an in-memory session */ }
    if (session === next) { notify(); void syncLearningProgress(); }
  })();
}

async function persist(target: Session) {
  await AsyncStorage.setItem(storageKey(target.owner), JSON.stringify(target.entries));
}

function schedule() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => { void syncLearningProgress(); }, 2000);
}

export async function syncLearningProgress(): Promise<void> {
  const target = session;
  if (!target || syncing) return;
  syncing = true;
  try {
    await target.ready;
    await target.queue;
    if (session !== target) return;
    const sent = { ...target.entries };
    const { request } = await import("../api/client");
    if (session !== target) return;
    const result = await request<{ entries: Record<string, Entry> }>("/me/learning-state", {
      method: "PUT", body: JSON.stringify({ entries: sent }),
    }, true);
    if (session !== target) return;
    for (const [key, entry] of Object.entries(result.entries)) {
      if (!allowed(key) || typeof entry.value !== "string" || !Number.isFinite(entry.updated_ms)) continue;
      if (!target.entries[key] || entry.updated_ms > target.entries[key].updated_ms || target.entries[key] === sent[key]) target.entries[key] = entry;
    }
    await persist(target); notify();
  } catch { /* old servers and offline sessions retain all local progress */ }
  finally { syncing = false; if (session && session !== target) schedule(); }
}

async function current(): Promise<Session | null> {
  const target = session;
  await target?.ready;
  return target === session ? target : current();
}

export const progressStorage = {
  async getItem(key: string): Promise<string | null> {
    if (!allowed(key)) return AsyncStorage.getItem(key);
    const target = await current();
    return target?.entries[key]?.value ?? null;
  },
  async setItem(key: string, value: string): Promise<void> {
    if (!allowed(key)) return AsyncStorage.setItem(key, value);
    const target = await current();
    if (!target) return;
    target.queue = target.queue.catch(() => {}).then(async () => {
      const old = target.entries[key];
      target.entries[key] = { value, updated_ms: Math.max(Date.now(), (old?.updated_ms ?? 0) + 1) };
      await persist(target);
    });
    await target.queue;
    if (session === target) { notify(); schedule(); }
  },
  async multiGet(keys: string[]): Promise<[string, string | null][]> {
    return Promise.all(keys.map(async key => [key, await progressStorage.getItem(key)] as [string, string | null]));
  },
  async getAllKeys(): Promise<string[]> {
    return Object.keys((await current())?.entries ?? {});
  },
};
