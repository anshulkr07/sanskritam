// The basics cards of Kāla: one for time itself, then one for each line of
// "You are here", in the same order, largest span first. Each card says what
// its word means, where the present moment stands in it, and how it works,
// in short steps (kala/topics/*), and points to the chapter that goes further.
//
// The facts are read at the sources listed in kala/basics.ts.

import type { FillName } from "../theme";
import type { ChapterId, TopicId } from "./learn";
import { AYANAS, SPANS, WORDS, type SanskritName } from "./sanskritNames";
import { romanName } from "./today";

export type { TopicId };

export interface TopicMeta {
  id: TopicId;
  title: string;
  /** The Sanskrit word the card teaches. */
  word: SanskritName;
  /** What the word means, in a few words. */
  meaning: string;
  tone: FillName;
  /** The card's one line on the Kāla page. */
  hook: string;
  /** The chapter that goes further, if one does. */
  chapter: ChapterId | null;
}

export const TOPICS: TopicMeta[] = [
  {
    id: "kala",
    title: "Time",
    word: WORDS.kala,
    meaning: "Time: from kal, to count",
    tone: "maroon",
    hook: "Cycles inside cycles, from a day to a kalpa.",
    chapter: "clock",
  },
  {
    id: "kalpa",
    title: "The kalpa",
    word: SPANS[2],
    meaning: "A day of Brahmā",
    tone: "slate",
    hook: "One day of Brahmā: 4,320 million years.",
    chapter: "yugas",
  },
  {
    id: "manvantara",
    title: "The manvantara",
    word: SPANS[1],
    meaning: "The age of one Manu",
    tone: "teal",
    hook: "Fourteen Manus to a kalpa. This is the seventh's age.",
    chapter: "yugas",
  },
  {
    id: "yuga",
    title: "The yugas",
    word: WORDS.yuga,
    meaning: "An age",
    tone: "rose",
    hook: "Four ages, named after the four throws of a die.",
    chapter: "yugas",
  },
  {
    id: "ayana",
    title: "The Sun's two halves",
    word: WORDS.ayana,
    meaning: "A going, a course",
    tone: "gold",
    hook: `${romanName(AYANAS[0])} and ${romanName(AYANAS[1])}: the Sun's northward and southward halves.`,
    chapter: "year",
  },
  {
    id: "ritu",
    title: "The seasons",
    word: WORDS.ritu,
    meaning: "A season",
    tone: "sage",
    hook: "Six seasons of two months each.",
    chapter: "year",
  },
  {
    id: "masa",
    title: "The months",
    word: WORDS.masa,
    meaning: "A month, and the Moon",
    tone: "saffron",
    hook: "Twelve months, each named after a star.",
    chapter: "year",
  },
  {
    id: "paksha",
    title: "The two halves",
    word: WORDS.paksha,
    meaning: "A wing, a side",
    tone: "slate",
    hook: "The bright half and the dark half of a month.",
    chapter: "moon",
  },
  {
    id: "tithi",
    title: "The tithi",
    word: WORDS.tithi,
    meaning: "A lunar day",
    tone: "teal",
    hook: "The Moon gains 12° on the Sun.",
    chapter: "moon",
  },
  {
    id: "vara",
    title: "The weekday",
    word: WORDS.vara,
    meaning: "A day's turn",
    tone: "maroon",
    hook: "Seven days, named after seven lights in the sky.",
    chapter: "today",
  },
  {
    id: "nakshatra",
    title: "The stars",
    word: WORDS.nakshatra,
    meaning: "A star on the Moon's path",
    tone: "rose",
    hook: "Twenty-seven stars on the Moon's path, about one a day.",
    chapter: "moon",
  },
];

export function topicById(id: string | null | undefined): TopicMeta {
  return TOPICS.find((t) => t.id === id) ?? TOPICS[0];
}
