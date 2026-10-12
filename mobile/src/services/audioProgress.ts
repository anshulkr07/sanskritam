// audioProgress — where the learner left off listening, and the audiobook
// autoplay preference.
//
// Mirror of readingProgress (shabd.read.*): one map under shabd.listen.pos
// holding { index, chapter, updated } per bookKey, written fire-and-forget —
// a lost write costs one resume, a blocking write costs a dropped frame.
// `updated` (not key order) picks the Continue-listening book, because
// JSON key order freezes at first insertion.

import AsyncStorage from "@react-native-async-storage/async-storage";

const POS_KEY = "shabd.listen.pos";
const AUTOPLAY_KEY = "shabd.listen.autoplay";

export interface ListenPosition {
  /** Verse index in the book's page list (useBookPages order). */
  index: number;
  /** Paged-book chapter id, when the listen was inside one. */
  chapter: string | null;
  /** Epoch ms of the last save. */
  updated: number;
}

type Positions = Record<string, ListenPosition>;

async function readAll(): Promise<Positions> {
  try {
    const raw = await AsyncStorage.getItem(POS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object") return parsed as Positions;
  } catch {
    /* corrupt or missing — start fresh */
  }
  return {};
}

export async function getListenPosition(bookKey: string): Promise<ListenPosition | null> {
  const all = await readAll();
  const v = all[bookKey];
  if (!v || typeof v.index !== "number" || v.index < 0) return null;
  return { index: Math.floor(v.index), chapter: v.chapter ?? null, updated: v.updated ?? 0 };
}

export async function getListenPositions(): Promise<Positions> {
  return readAll();
}

/** The most recently saved listen across all books, with its key. */
export async function getLastListen(): Promise<{ bookKey: string; pos: ListenPosition } | null> {
  const all = await readAll();
  let best: { bookKey: string; pos: ListenPosition } | null = null;
  for (const [bookKey, pos] of Object.entries(all)) {
    if (typeof pos?.index !== "number" || pos.index < 0) continue;
    if (!best || (pos.updated ?? 0) > best.pos.updated) {
      best = { bookKey, pos: { index: Math.floor(pos.index), chapter: pos.chapter ?? null, updated: pos.updated ?? 0 } };
    }
  }
  return best;
}

export function setListenPosition(bookKey: string, index: number, chapter: string | null = null): void {
  readAll()
    .then((all) => {
      all[bookKey] = { index: Math.max(0, Math.floor(index)), chapter, updated: Date.now() };
      return AsyncStorage.setItem(POS_KEY, JSON.stringify(all));
    })
    .catch(() => {});
}

export function clearListenPosition(bookKey: string): void {
  readAll()
    .then((all) => {
      delete all[bookKey];
      return AsyncStorage.setItem(POS_KEY, JSON.stringify(all));
    })
    .catch(() => {});
}

// ── Autoplay preference ──────────────────────────────────────────────

export async function getAutoplay(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(AUTOPLAY_KEY);
    return raw === null ? true : raw === "1";
  } catch {
    return true;
  }
}

export function setAutoplay(on: boolean): void {
  AsyncStorage.setItem(AUTOPLAY_KEY, on ? "1" : "0").catch(() => {});
}

// ── Listen mode (verse / meaning / both), persisted per book ─────────

export type ListenMode = "verse" | "meaning" | "both";

const MODE_KEY = "shabd.listen.mode";

export async function getListenMode(bookKey: string): Promise<ListenMode> {
  try {
    const raw = await AsyncStorage.getItem(MODE_KEY);
    if (!raw) return "verse";
    const parsed = JSON.parse(raw) as Record<string, ListenMode>;
    const v = parsed[bookKey];
    return v === "meaning" || v === "both" ? v : "verse";
  } catch {
    return "verse";
  }
}

export function setListenMode(bookKey: string, mode: ListenMode): void {
  getListenMode(bookKey)
    .then((cur) => {
      if (cur === mode) return;
      return AsyncStorage.getItem(MODE_KEY)
        .then((raw) => {
          const parsed = raw ? (JSON.parse(raw) as Record<string, ListenMode>) : {};
          parsed[bookKey] = mode;
          return AsyncStorage.setItem(MODE_KEY, JSON.stringify(parsed));
        })
        .catch(() => {});
    })
    .catch(() => {});
}

export default {
  getListenPosition,
  getListenPositions,
  getLastListen,
  setListenPosition,
  clearListenPosition,
  getAutoplay,
  setAutoplay,
  getListenMode,
  setListenMode,
};
