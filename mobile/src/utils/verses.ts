// Canonical verse ordering + book grouping for the Read tab.
//
// GET /shlokas arrives in DATE order (seed day_offset) — the order a beginner
// band was authored in, not the order a book reads in. A book reads
// chapter-by-chapter: Gītā 2.11 before Gītā 2.47 before Gītā 3.8, whatever
// dates they carry. This module parses source_refs ("Bhagavad Gītā 2.47",
// "Mundaka Upaniṣad 3.1.6", "Hitopadeśa, Mitralābha") into sortable keys and
// groups verses under their canon books (matched by ref_prefixes exactly the
// way the backend's /canon counts them, so shelf counts and contents agree).

import type { CanonText, ReaderPassage, Shloka } from "../api/client";

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

/** "Bhagavad Gītā 18.66" → "Bhagavad Gītā 18.66"; "" when the ref has no number.
 *  The backend counts a book's verses by the same key (routers/canon.py). */
export function verseKey(ref: string): string {
  const { book, nums } = parseRef(ref);
  return nums.length > 0 ? `${book} ${nums.join(".")}` : "";
}

function devanagariLength(v: Shloka): number {
  return (v.devanagari ?? "").replace(/[^ऀ-ॿ]|[।॥]/g, "").length;
}

/** The row to show when several carry one verse: the fullest text, then one
 *  with a stored meaning, then the earliest date. */
function fuller(a: Shloka, b: Shloka): boolean {
  const la = devanagariLength(a);
  const lb = devanagariLength(b);
  if (la !== lb) return la > lb;
  const ma = Boolean((a.translation_en || a.translation_hi || "").trim());
  const mb = Boolean((b.translation_en || b.translation_hi || "").trim());
  if (ma !== mb) return ma;
  if (a.date !== b.date) return a.date < b.date;
  return a.id < b.id;
}

/**
 * One entry per verse. The daily verses hold half-verses under the verse's
 * number and an imported text holds the whole verse under the same number
 * (Gītā 18.66 is both), so a book would list it twice. A reference with no
 * number ("Sūkti: Subhāṣita") is shared by different sayings and never merged.
 */
export function oneVersePerRef(verses: Shloka[]): Shloka[] {
  const best = new Map<string, Shloka>();
  for (const v of verses) {
    const k = verseKey(v.source_ref);
    if (!k) continue;
    const had = best.get(k);
    if (!had || fuller(v, had)) best.set(k, v);
  }
  return verses.filter((v) => {
    const k = verseKey(v.source_ref);
    return !k || best.get(k) === v;
  });
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
    verses: sortVerses(oneVersePerRef(buckets.get(t.slug) ?? []), bookOf),
  }));
  if (orphans.length > 0) {
    groups.push({ text: null, verses: sortVerses(oneVersePerRef(orphans), bookOf) });
  }
  return groups;
}

export const ALL_BOOK = "all";
export const OTHER_BOOK = "other";

/**
 * The pages of one book, in reading order: what the contents page lists and
 * what the reading page turns through, so an index from one opens the same
 * verse in the other. "all" is every row; "other" the rows no canon text
 * claims; anything else a canon slug. Null when there is no such book.
 * Graded tiers are not verses; see ``tierVerses``.
 */
export function bookVerses(key: string, verses: Shloka[], canon: CanonText[]): Shloka[] | null {
  if (key === ALL_BOOK) return sortVerses(verses, makeBookOf(canon));
  const groups = groupByBook(verses, canon);
  const g = key === OTHER_BOOK
    ? groups.find((x) => x.text === null)
    : groups.find((x) => x.text?.slug === key);
  return g ? g.verses : null;
}

/** A graded tier's passages as pages (U14-5 / P22-6). */
export function tierVerses(rows: ReaderPassage[]): Shloka[] {
  return rows.map((p, i) => ({
    id: `tier${p.tier}-${i}`,
    date: "",
    source_ref: `Graded Tier ${p.tier} · verse ${i + 1}`,
    devanagari: p.devanagari,
    iast: p.iast,
    metre: "",
    word_breakdown: p.word_breakdown,
    features: p.features,
    audio_url: "",
  }));
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
    // "Gītā 2.47" sits in chapter 2; "Īśopaniṣad 5" has no chapters at all.
    const label = nums.length > 1 ? `Chapter ${nums[0]}` : "Verses";
    const last = out[out.length - 1];
    if (last && last.label === label) last.verses.push(v);
    else out.push({ label, verses: [v] });
  }
  return out;
}

// "अर्जुन उवाच", and joined as in "श्रीभगवानुवाच" (the vowel sign ु).
const SPEAKER = /(?:उ|ु)वाच$/;

/** First pāda for preview lines: everything up to the first daṇḍa, passing
 *  over a speaker line ("सञ्जय उवाच", "श्रीभगवानुवाच"), which names who
 *  speaks rather than starting the verse. */
export function firstLine(devanagari: string): string {
  const parts = (devanagari ?? "")
    .split(/[।॥\n]+/)
    .map((p) => p.replace(/[०-९\d\s.]+$/u, "").trim())
    .filter(Boolean);
  return parts.find((p) => !SPEAKER.test(p)) ?? parts[0] ?? "";
}

/** The speaker line a verse opens with ("अर्जुन उवाच"), or "" for none. */
export function speakerOf(devanagari: string): string {
  const first = ((devanagari ?? "").split(/[।॥\n]+/)[0] ?? "").trim();
  return SPEAKER.test(first) ? first : "";
}

export default {
  normalizeRef,
  parseRef,
  matchBook,
  makeBookOf,
  compareVerses,
  sortVerses,
  verseKey,
  oneVersePerRef,
  groupByBook,
  bookVerses,
  tierVerses,
  groupByChapter,
  firstLine,
};
