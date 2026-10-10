// useReaderBooks: build shelf books from verses, canon and graded tiers.
// Shared by Reader (shelf + contents) and the fullscreen Book screen.

import { useMemo } from "react";

import type { CanonText, Shloka } from "../api/client";
import { groupByBook, makeBookOf, parseRef, sortVerses } from "../utils/verses";
import { coverColour, coverForeground, COVER_COLOURS } from "../components/book/covers";

export interface ReaderBook {
  key: string;
  titleEn: string;
  titleSa: string;
  verses: Shloka[];
  planned: number | null;
  colour: string;
  foreground: string;
}

const RAILS: { title: string; slugs: string[] }[] = [
  { title: "Scriptures", slugs: ["gita", "isha", "katha", "mundaka", "ramayana", "mahabharata"] },
  { title: "Stories and wisdom", slugs: ["hito", "pancha", "niti", "subhashita", "simhasana", "ayurveda", "vetala", "chanakya"] },
  { title: "Graded reading", slugs: ["graded-1", "graded-2", "graded-3"] },
  { title: "Vedas", slugs: ["rigveda", "samaveda", "yajurveda", "atharvaveda"] },
  { title: "Upaniṣads", slugs: ["kena", "prashna", "mandukya", "taittiriya", "aitareya", "shvetashvatara", "chandogya", "brihadaranyaka"] },
  { title: "Purāṇas", slugs: ["bhagavata", "shivapurana", "garuda", "devimahatmya"] },
  { title: "Stotras", slugs: ["vishnusahasranama", "lalita", "bhajagovindam", "saundarya", "aditya", "tandava", "mahimna", "ramaraksha", "naradabhakti"] },
  { title: "Poetry and drama", slugs: ["meghaduta", "kumarasambhava", "raghuvamsha", "shakuntala", "gitagovinda"] },
  { title: "Yoga, Āyurveda and śāstra", slugs: ["yogasutra", "hathayoga", "ashtavakra", "sushruta", "arthashastra", "lilavati", "amarakosha"] },
];

export function useReaderBooks(
  verses: Shloka[] | undefined,
  canon: CanonText[] | undefined,
  tiers: { tier: number; label: string }[] = [],
): { books: ReaderBook[]; rails: { title: string; books: ReaderBook[] }[]; byKey: Map<string, ReaderBook> } {
  return useMemo(() => {
    const bookOf = makeBookOf(canon ?? []);
    const groups = groupByBook(verses ?? [], canon ?? []);
    const books: ReaderBook[] = [];

    const canonBySlug = new Map((canon ?? []).map((c) => [c.slug, c]));
    const pushBook = (key: string, titleEn: string, titleSa: string, list: Shloka[], planned: number | null) => {
      const sorted = sortVerses(list, bookOf);
      books.push({
        key,
        titleEn,
        titleSa,
        verses: sorted,
        planned,
        colour: coverColour(key),
        foreground: coverForeground(key),
      });
    };

    // Canon books in study order.
    const grouped = new Map(groups.map((g) => [g.text?.slug ?? "other", g.verses]));
    const ordered = [...(canon ?? [])].sort((a, b) => (a.study_order ?? 999) - (b.study_order ?? 999));
    for (const c of ordered) {
      const list = grouped.get(c.slug) ?? [];
      pushBook(c.slug, c.title_en || c.slug, c.title_sa || c.slug, list, c.verses_planned ?? null);
    }

    // Graded tiers.
    for (const t of tiers) {
      const key = `graded-${t.tier}`;
      pushBook(key, t.label, COVER_COLOURS[key]?.titleSa ?? t.label, [], null);
    }

    // All verses and Other (unclaimed) and Sayings (Sukti prefix).
    const all = sortVerses(verses ?? [], bookOf);
    const sayings = all.filter((v) => (v.source_ref || "").startsWith("Sūkti") || (v.source_ref || "").startsWith("Sukti"));
    const other = all.filter((v) => {
      const m = bookOf(v.source_ref);
      return !m && !sayings.includes(v);
    });
    if (!canonBySlug.has("all")) pushBook("all", "All verses", "सर्वम्", all, null);
    if (!canonBySlug.has("other")) pushBook("other", "Other verses", "अन्यत्", other, null);
    if (sayings.length > 0) pushBook("sayings", "Sayings", "सूक्तयः", sayings, null);

    const byKey = new Map(books.map((b) => [b.key, b]));
    const inRails = new Set(RAILS.flatMap((r) => r.slugs));
    const rails = RAILS.map((r) => ({ title: r.title, books: r.slugs.map((s) => byKey.get(s)).filter((b): b is ReaderBook => !!b) }));
    const more = books.filter((b) => !inRails.has(b.key));
    if (more.length > 0) rails.push({ title: "More", books: more });

    return { books, rails, byKey };
  }, [verses, canon, tiers]);
}

export function chapterOf(ref: string): string {
  const { book, nums } = parseRef(ref);
  if (nums.length > 0) return `${book} ${nums[0]}`;
  return book;
}
