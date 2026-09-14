// Canonical verse ordering + book grouping for the Read tab.
//
// GET /shlokas arrives in DATE order (seed day_offset) — the order a beginner
// band was authored in, not the order a book reads in. A book reads
// chapter-by-chapter: Gītā 2.11 before Gītā 2.47 before Gītā 3.8, whatever
// dates they carry. This module parses source_refs ("Bhagavad Gītā 2.47",
// "Mundaka Upaniṣad 3.1.6", "Hitopadeśa, Mitralābha") into sortable keys and
// groups verses under their canon books (matched by ref_prefixes exactly the
// way the backend's /canon counts them, so shelf counts and contents agree).

import type { CanonText, Shloka } from "../api/client";

export interface ParsedRef {
  /** The book/canto part, spelling-normalised. */
  book: string;
  /** Trailing numeric address, e.g. [2, 47] for "Gītā 2.47". Empty when none. */
  nums: number[];
}

/** Authoring variants collapse to one book name. Longer patterns first. */
const SPELL_FIX: Array<[RegExp, string]> = [
  [/Nītīśataka/g, "Nītiśataka"],
  [/Nītī\b/g, "Nīti"],
];

export function normalizeRef(ref: string): string {
  let out = (ref ?? "").trim().replace(/\s+/g, " ");
  for (const [re, to] of SPELL_FIX) out = out.replace(re, to);
  return out;
}

const TRAILING_NUMS = /^(.+?)\s+(\d+(?:\.\d+)*)\s*$/;

export function parseRef(raw: string): ParsedRef {
  const ref = normalizeRef(raw);
  const m = TRAILING_NUMS.exec(ref);
  if (!m) return { book: ref, nums: [] };
  return { book: m[1].trim(), nums: m[2].split(".").map((n) => parseInt(n, 10)) };
}

/**
 * Which canon book a verse belongs to — the same substring match the backend
 * uses for verses_imported, so a book's shelf count always equals the verses
 * its contents page shows. Null = no canon text claims it.
 */
export function matchBook(ref: string, canon: CanonText[]): CanonText | null {
  const norm = normalizeRef(ref);
  for (const t of canon) {
    const prefs = t.ref_prefixes ?? [];
    if (prefs.some((p) => !!p && norm.includes(p))) return t;
  }
  return null;
}

export type BookOf = (ref: string) => CanonText | null;

export function makeBookOf(canon: CanonText[]): BookOf {
  return (ref) => matchBook(ref, canon);
}

function compareNumArrays(a: number[], b: number[]): number {
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const x = a[i] ?? -1;
    const y = b[i] ?? -1;
    if (x !== y) return x - y;
  }
  return 0;
}

/**
 * Canonical order: the book's study_order, then the book name (stable across
 * books no canon row claims), then the numeric address (2.4 < 2.11 < 2.47 —
 * never lexicographic), then date, then id. Total: no two verses tie.
 */
export function compareVerses(a: Shloka, b: Shloka, bookOf: BookOf): number {
  const ba = bookOf(a.source_ref);
  const bb = bookOf(b.source_ref);
  const oa = ba?.study_order ?? 999;
  const ob = bb?.study_order ?? 999;
  if (oa !== ob) return oa - ob;
  const pa = parseRef(a.source_ref);
  const pb = parseRef(b.source_ref);
  if (pa.book !== pb.book) return pa.book < pb.book ? -1 : 1;
  const nc = compareNumArrays(pa.nums, pb.nums);
  if (nc !== 0) return nc;
  if (a.date !== b.date) return a.date < b.date ? -1 : 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

export function sortVerses(verses: Shloka[], bookOf: BookOf): Shloka[] {
  return [...verses].sort((a, b) => compareVerses(a, b, bookOf));
}

export interface BookGroup {
  /** The canon row, or null for verses no book claims ("Other verses"). */
  text: CanonText | null;
  verses: Shloka[];
}

/**
 * The shelf's books in study order, each holding its verses in canonical
 * order. Empty books are KEPT (the shelf marks them "coming soon") — a book
 * disappearing until its import lands is how the reader looked incomplete.
 */
export function groupByBook(verses: Shloka[], canon: CanonText[]): BookGroup[] {
  const bookOf = makeBookOf(canon);
  const buckets = new Map<string, Shloka[]>();
  const orphans: Shloka[] = [];
  for (const v of verses) {
    const t = bookOf(v.source_ref);
    if (!t) {
      orphans.push(v);
      continue;
    }
    const list = buckets.get(t.slug);
    if (list) list.push(v);
    else buckets.set(t.slug, [v]);
  }
  const groups: BookGroup[] = canon.map((t) => ({
    text: t,
    verses: sortVerses(buckets.get(t.slug) ?? [], bookOf),
  }));
  if (orphans.length > 0) {
    groups.push({ text: null, verses: sortVerses(orphans, bookOf) });
  }
  return groups;
}

export interface ChapterGroup {
  /** e.g. "Chapter 2", or "Verses" when the ref carries no number. */
  label: string;
  verses: Shloka[];
}

/** A book's index: consecutive runs of the leading address number. */
export function groupByChapter(verses: Shloka[]): ChapterGroup[] {
  const out: ChapterGroup[] = [];
  for (const v of verses) {
    const { nums } = parseRef(v.source_ref);
    const label = nums.length > 0 ? `Chapter ${nums[0]}` : "Verses";
    const last = out[out.length - 1];
    if (last && last.label === label) last.verses.push(v);
    else out.push({ label, verses: [v] });
  }
  return out;
}

/** First pāda for preview lines: everything up to the first daṇḍa. */
export function firstLine(devanagari: string): string {
  return ((devanagari ?? "").split(/।\s*/)[0] || "").trim();
}

export default {
  normalizeRef,
  parseRef,
  matchBook,
  makeBookOf,
  compareVerses,
  sortVerses,
  groupByBook,
  groupByChapter,
  firstLine,
};
