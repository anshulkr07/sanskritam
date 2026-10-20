import type { Shloka } from "../api/client";
import { getProgressOwner, progressStorage } from "./progressStorage";

import { READ_PREFIX, mergeReadRecords } from "./bookActivityRecords";

const PREFIX = "shabd.read.page.v1.";
export type PageActivity = { chapter: string | null; id: string; ref: string; index: number; read: boolean; bookmarked: boolean };
export type BookActivity = Record<string, PageActivity[]>;
export const pageId = (verse: Shloka) => verse.source_ref || verse.verse_uid || verse.id;
const keyFor = (book: string, chapter: string | null, id: string, kind: string) =>
  PREFIX + [book, chapter ?? "", id, kind].map(encodeURIComponent).join(".");
// Sparse bookmarks have independent keys; read pages use compact 64-page
// chunks merged as a union during sync. Neither overwrites the other.
export async function savePageActivity(book: string, chapter: string | null, verse: Shloka, index: number, kind: "read" | "bookmark", enabled = true) {
  const owner = getProgressOwner();
  if (kind === "read") {
    const key = READ_PREFIX + [book, chapter ?? "", String(Math.floor(index / 64))].map(encodeURIComponent).join(".");
    const value = JSON.stringify({ book, chapter, pages: [[pageId(verse), index]] });
    await progressStorage.updateItem(key, old => old ? mergeReadRecords(old, value) : value, owner);
    return;
  }
  const value = { book, chapter, id: pageId(verse), ref: verse.source_ref, index, enabled };
  await progressStorage.setItem(keyFor(book, chapter, value.id, kind), JSON.stringify(value), owner);
}
export async function getBookActivity(): Promise<BookActivity> {
  const keys = (await progressStorage.getAllKeys()).filter(key => key.startsWith(PREFIX) || key.startsWith(READ_PREFIX));
  const result: BookActivity = {};
  const pages = new Map<string, PageActivity>();
  for (const [key, raw] of await progressStorage.multiGet(keys)) {
    if (!raw) continue;
    try {
      const value = JSON.parse(raw);
      if (key.startsWith(READ_PREFIX)) {
        if (typeof value.book !== "string" || !Array.isArray(value.pages)) continue;
        for (const row of value.pages) {
          if (!Array.isArray(row) || typeof row[0] !== "string" || !Number.isInteger(row[1]) || row[1] < 0) continue;
          const identity = JSON.stringify([value.book, value.chapter, row[0]]);
          let page = pages.get(identity);
          if (!page) { page = { chapter: value.chapter || null, id: row[0], ref: row[0], index: row[1], read: true, bookmarked: false }; pages.set(identity, page); (result[value.book] ??= []).push(page); }
          page.read = true;
        }
        continue;
      }
      if (typeof value.book !== "string" || typeof value.id !== "string" || !Number.isInteger(value.index) || value.index < 0) continue;
      const identity = JSON.stringify([value.book, value.chapter, value.id]);
      let page = pages.get(identity);
      if (!page) {
        page = { chapter: value.chapter || null, id: value.id, ref: value.ref || "", index: value.index, read: false, bookmarked: false };
        pages.set(identity, page); (result[value.book] ??= []).push(page);
      }
      if (key.endsWith(".read")) page.read = value.enabled === true;
      if (key.endsWith(".bookmark")) page.bookmarked = value.enabled === true;
    } catch { /* Ignore invalid sync records. */ }
  }
  return result;
}
