// readingProgress — where the learner left off in each book.
//
// One JSON object in AsyncStorage: { [bookKey]: verseIndex }. Written
// fire-and-forget on every settled page turn (a lost write costs one tap, a
// blocking write costs a dropped frame mid-flip). Reads clamp to range at the
// call site — the corpus only grows, but a book's list can shrink under a
// canon filter change, and a stale index must open the shelf, never crash.

import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "shabd.read.pos";

type Positions = Record<string, number>;

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

export default { getReadingPosition, getReadingPositions, setReadingPosition };
