// Pure helpers for paged books (handover_reading_shelf.md 7.2). No React.

import type { PagedChapter } from "../api/client";

export function isPaged(text: { paged?: boolean }): boolean {
  return text.paged === true;
}

export interface Section {
  section: string;
  chapters: PagedChapter[];
}

/** Group chapters by section, keeping order. */
export function sectionsOf(chapters: PagedChapter[]): Section[] {
  const out: Section[] = [];
  const bySection = new Map<string, PagedChapter[]>();
  for (const c of chapters ?? []) {
    const key = c.section ?? "";
    if (!bySection.has(key)) {
      bySection.set(key, []);
      out.push({ section: key, chapters: bySection.get(key)! });
    }
    bySection.get(key)!.push(c);
  }
  return out;
}

export function nextChapter(
  chapters: PagedChapter[],
  current: string,
): PagedChapter | null {
  const i = (chapters ?? []).findIndex((c) => c.chapter === current);
  if (i < 0 || i + 1 >= (chapters ?? []).length) return null;
  return chapters[i + 1];
}

export function prevChapter(
  chapters: PagedChapter[],
  current: string,
): PagedChapter | null {
  const i = (chapters ?? []).findIndex((c) => c.chapter === current);
  if (i <= 0) return null;
  return chapters[i - 1];
}

/** The chapter as it shows ("3.62"); a one-chapter book has no label. */
export function chapterLabel(chapter: string): string {
  if (!chapter) return "";
  return chapter;
}

export function positionKey(slug: string, chapter: string): string {
  return `${slug}#${chapter}`;
}

export function parsePositionKey(key: string): { slug: string; chapter: string } {
  const i = key.indexOf("#");
  if (i < 0) return { slug: key, chapter: "" };
  return { slug: key.slice(0, i), chapter: key.slice(i + 1) };
}

export default {
  isPaged,
  sectionsOf,
  nextChapter,
  prevChapter,
  chapterLabel,
  positionKey,
  parsePositionKey,
};
