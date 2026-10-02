// The six chapters of Kāla: what each is called, its colour, the Sanskrit
// word it teaches and the one line it opens with.
//
// Copy rule (HANDOVER section 0): no paragraphs. A chapter gets a title, a
// term and one line; everything else is a chart with short labels.

import type { FillName } from "../theme";
import type { ChapterId } from "./learn";
import { UNITS, WORDS } from "./sanskritNames";

export type { ChapterId };

export interface ChapterMeta {
  id: ChapterId;
  title: string;
  /** The Sanskrit word on the chapter's tile. */
  word: string;
  tone: FillName;
  /** The term the chapter opens with. */
  term: { sa: string; iast: string; meaning: string } | null;
  /** The chapter's idea in one line. */
  summary: string;
}

export const CHAPTERS: ChapterMeta[] = [
  {
    id: "today",
    title: "Today",
    word: WORDS.adya.nom,
    tone: "teal",
    term: { sa: WORDS.panchanga.nom, iast: WORDS.panchanga.nomIast, meaning: "The five limbs of a day" },
    summary: "Five readings name a day: the weekday, and four set by the Moon and the Sun.",
  },
  {
    id: "moon",
    title: "The Moon",
    word: WORDS.chandra.nom,
    tone: "slate",
    term: { sa: WORDS.tithi.nom, iast: WORDS.tithi.nomIast, meaning: "A lunar day" },
    summary: "A tithi lasts as long as the Moon takes to gain 12 degrees on the Sun.",
  },
  {
    id: "clock",
    title: "The clock",
    word: UNITS[3].nom,
    tone: "maroon",
    term: { sa: UNITS[3].nom, iast: UNITS[3].nomIast, meaning: "24 minutes, a sixtieth of the day" },
    summary: `The day begins at sunrise and runs for sixty ${UNITS[3].iast}s.`,
  },
  {
    id: "year",
    title: "The year",
    word: WORDS.samvatsara.nom,
    tone: "sage",
    term: { sa: WORDS.samvatsara.nom, iast: WORDS.samvatsara.nomIast, meaning: "A year" },
    summary: "Twelve moons run about 11 days short of the Sun's year, so every few years a month is added.",
  },
  {
    id: "yugas",
    title: "The yugas",
    word: WORDS.yuga.pl,
    tone: "rose",
    term: { sa: WORDS.yuga.nom, iast: WORDS.yuga.nomIast, meaning: "An age" },
    summary: "Four ages in the ratio 4 : 3 : 2 : 1 make one cycle of 4,320,000 years.",
  },
  {
    id: "calendars",
    title: "Six calendars",
    word: WORDS.panchanga.pl,
    tone: "gold",
    term: null,
    summary: "One sky, read with four choices.",
  },
];

export function chapterById(id: string | null | undefined): ChapterMeta {
  return CHAPTERS.find((c) => c.id === id) ?? CHAPTERS[0];
}

/** The app that will go deeper into the sky. Until it has a store page the
 *  hub shows nothing about it: set `url` and the strip appears. */
export const DEEPER_APP: { title: string; line: string; url: string | null } = {
  title: "Go deeper",
  line: "More on the sky and its calendars, in its own app.",
  url: null,
};
