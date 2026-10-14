// Audio shelf arithmetic: how long a book or chapter sounds, read off each
// verse's chant (duration_ms), and how to say it. Plain TS, no React.

import type { Shloka } from "../api/client";
import { groupByChapter, parseRef } from "../utils/verses";

/** Total chant length of these verses, ms. Verses without a chant add 0. */
export function chantMs(verses: Shloka[]): number {
  let ms = 0;
  for (const v of verses) ms += v.chant?.duration_ms ?? 0;
  return ms;
}

/** How many of these verses have a chant. */
export function voicedCount(verses: Shloka[]): number {
  let n = 0;
  for (const v of verses) if (v.chant) n += 1;
  return n;
}

/** "2 h 13 min", "38 min", "3 min", "under 1 min". */
export function fmtLong(ms: number): string {
  const min = Math.round(ms / 60000);
  if (ms > 0 && min < 1) return "under 1 min";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** "0:04", "8:52", "1:02:03". */
export function fmtClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

export interface AudioChapter {
  label: string;
  /** The chapter number as written in the references ("2"), or null. */
  num: number | null;
  /** Flat index of the chapter's first verse in the book's page list. */
  start: number;
  verses: Shloka[];
  ms: number;
}

/** The book's chapters with where each starts and how long it sounds. */
export function audioChapters(pages: Shloka[]): AudioChapter[] {
  let start = 0;
  return groupByChapter(pages).map((ch) => {
    const nums = parseRef(ch.verses[0]?.source_ref ?? "").nums;
    const out = {
      label: ch.label,
      num: nums.length > 1 ? nums[0] : null,
      start,
      verses: ch.verses,
      ms: chantMs(ch.verses),
    };
    start += ch.verses.length;
    return out;
  });
}

/** Which chapter holds flat index i, and the position inside it. */
export function chapterAt(chapters: AudioChapter[], i: number): { chapter: AudioChapter | null; pos: number } {
  for (const ch of chapters) {
    if (i >= ch.start && i < ch.start + ch.verses.length) return { chapter: ch, pos: i - ch.start };
  }
  return { chapter: chapters[0] ?? null, pos: 0 };
}

/** ms of chant left in i's chapter, counting verse i itself. */
export function msLeftInChapter(chapters: AudioChapter[], i: number): number {
  const { chapter, pos } = chapterAt(chapters, i);
  return chapter ? chantMs(chapter.verses.slice(pos)) : 0;
}

/** "2.47" for a verse with chapter and number, else its last number or ref. */
export function addressOf(v: Shloka | undefined): string {
  if (!v) return "";
  const { nums } = parseRef(v.source_ref);
  return nums.length > 0 ? nums.join(".") : v.source_ref;
}
