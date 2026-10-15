// readingProgress — where the learner left off in each book.
//
// Positions and chapters have individual account-scoped keys so concurrent
// writes and device sync do not overwrite unrelated books. Legacy position
// and chapter maps remain readable. A saved chapter that no longer exists opens the
// contents, never crashes. Written fire-and-forget on every settled page
// turn (a lost write costs one tap, a blocking write costs a dropped frame).

import { progressStorage as AsyncStorage } from "./progressStorage";

const KEY = "shabd.read.pos";
const CHAPTER_KEY = "shabd.read.chapter";

type Positions = Record<string, number>;
type Chapters = Record<string, string>;

async function readAll(): Promise<Positions> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object") return parsed as Positions;
  } catch {
    /* corrupt or missing — start fresh */
  }
  return {};
}

async function readChapters(): Promise<Chapters> {
  try {
    const raw = await AsyncStorage.getItem(CHAPTER_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object") return parsed as Chapters;
  } catch {
    /* corrupt or missing — start fresh */
  }
  return {};
}

export async function getReadingPosition(bookKey: string): Promise<number> {
  const saved = await AsyncStorage.getItem(`shabd.read.position.${bookKey}`);
  if (saved !== null && Number.isFinite(Number(saved))) return Math.max(0, Math.floor(Number(saved)));
  const all = await readAll();
  const v = all[bookKey];
  return typeof v === "number" && v >= 0 ? Math.floor(v) : 0;
}

export async function getReadingPositions(): Promise<Positions> {
  const all = await readAll();
  const prefix = "shabd.read.position.";
  for (const [key, value] of await AsyncStorage.multiGet((await AsyncStorage.getAllKeys()).filter(k => k.startsWith(prefix)))) {
    if (value !== null && Number.isFinite(Number(value))) all[key.slice(prefix.length)] = Math.max(0, Math.floor(Number(value)));
  }
  return all;
}

export function setReadingPosition(bookKey: string, index: number): void {
  void AsyncStorage.setItem(`shabd.read.position.${bookKey}`, String(Math.max(0, Math.floor(index)))).catch(() => {});
  void AsyncStorage.setItem("shabd.read.last", bookKey).catch(() => {});
}

/** Last chapter read in a paged book. */
export async function getReadingChapter(slug: string): Promise<string | null> {
  const saved = await AsyncStorage.getItem(`shabd.read.lastChapter.${slug}`);
  if (saved) return saved;
  const all = await readChapters();
  const v = all[slug];
  return typeof v === "string" && v ? v : null;
}

export async function getReadingChapters(): Promise<Chapters> {
  const all = await readChapters();
  const prefix = "shabd.read.lastChapter.";
  for (const [key, value] of await AsyncStorage.multiGet((await AsyncStorage.getAllKeys()).filter(k => k.startsWith(prefix)))) {
    if (value) all[key.slice(prefix.length)] = value;
  }
  return all;
}

export function setReadingChapter(slug: string, chapter: string): void {
  void AsyncStorage.setItem(`shabd.read.lastChapter.${slug}`, chapter).catch(() => {});
}

export default {
  getReadingPosition,
  getReadingPositions,
  setReadingPosition,
  getReadingChapter,
  getReadingChapters,
  setReadingChapter,
};
