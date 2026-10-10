// readingProgress — where the learner left off in each book.
//
// Classic books keep shabd.read.pos as now: { [bookKey]: verseIndex }.
// For a paged book the verse index is saved under positionKey(slug, chapter)
// in the same map, and the last chapter in shabd.read.chapter
// ({ [slug]: chapter }). A saved chapter that no longer exists opens the
// contents, never crashes. Written fire-and-forget on every settled page
// turn (a lost write costs one tap, a blocking write costs a dropped frame).

import AsyncStorage from "@react-native-async-storage/async-storage";

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
  const all = await readAll();
  const v = all[bookKey];
  return typeof v === "number" && v >= 0 ? Math.floor(v) : 0;
}

export async function getReadingPositions(): Promise<Positions> {
  return readAll();
}

export function setReadingPosition(bookKey: string, index: number): void {
  readAll()
    .then((all) => {
      all[bookKey] = Math.max(0, Math.floor(index));
      return AsyncStorage.setItem(KEY, JSON.stringify(all));
    })
    .catch(() => {});
}

/** Last chapter read in a paged book. */
export async function getReadingChapter(slug: string): Promise<string | null> {
  const all = await readChapters();
  const v = all[slug];
  return typeof v === "string" && v ? v : null;
}

export async function getReadingChapters(): Promise<Chapters> {
  return readChapters();
}

export function setReadingChapter(slug: string, chapter: string): void {
  readChapters()
    .then((all) => {
      all[slug] = chapter;
      return AsyncStorage.setItem(CHAPTER_KEY, JSON.stringify(all));
    })
    .catch(() => {});
}

export default {
  getReadingPosition,
  getReadingPositions,
  setReadingPosition,
  getReadingChapter,
  getReadingChapters,
  setReadingChapter,
};
