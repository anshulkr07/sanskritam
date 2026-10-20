// Shared card contract: reviewed custom decks ship in the catalogue, and
// complete guide topics are adapted from their existing typed API content.
// Display conversion never invents Sanskrit, translations or engine results.
//
// One point per card. No "A closer look", expandable note, disclosure or any
// optional-detail control: essential qualifications live in `body` itself.
// Swipe advances reading position only — never mastery, XP or reviews.

import type { GuideBlock, GuideExample, GuideProof, GuideSanskrit } from "../api/client";

export type LearnV2Lang = "en" | "hi";

export interface LearnV2Text {
  en: string;
  hi: string;
}

/** A Sanskrit example with everything the card needs to teach it. */
export interface LearnV2Example {
  /** Devanagari, dominant visual, rendered large. */
  sa: string;
  /** Roman IAST directly beneath, about half the height. Never from memory:
   *  every string below was cross-checked (see specs/learn-v2/sources.jsonl). */
  iast: string;
  /** Immediate meaning/reason — stays with the example on the same card. */
  gloss: LearnV2Text;
  /** Devanagari boundary formula, e.g. "आ + अ → आ". Native text, not a bitmap. */
  formula?: string;
  /** Accessible equivalent of the visual (screen readers, inspection). */
  alt: LearnV2Text;
}

export type LearnV2CardKind = "teach" | "anchor" | "practice" | "summary";

export interface LearnV2Choice {
  label: LearnV2Text;
  correct: boolean;
}

export interface LearnV2Card {
  id: string;
  kind: LearnV2CardKind;
  title: LearnV2Text;
  /** 25–55 English words (Hindi mirrors); qualifications merged in plainly. */
  body: LearnV2Text;
  example?: LearnV2Example;
  /** 2–4 short rows for contrasts (sa/iast/gloss each). */
  rows?: { sa: string; iast: string; gloss: LearnV2Text }[];
  /** Formation steps, e.g. root → stem → verb. */
  steps?: { sa: string; iast: string; label: LearnV2Text }[];
  /** Local retrieval: choices + why the answer is so. Never graded server-side. */
  practice?: {
    prompt: LearnV2Text;
    choices: LearnV2Choice[];
    explain: LearnV2Text;
  };
  /** Production asset id (see assetMap). Absent = native diagram/text only. */
  assetId?: string;
  /** Decorative chapter opener; teaching remains native text and diagrams. */
  openingArt?: "sandhi" | "metre";
  /** Multiple contextual images can support one source passage. */
  assetIds?: string[];
  /** New technical term introduced on this card, with its plain explanation. */
  term?: { sa: string; iast: string; meaning: LearnV2Text };
  /** Complete guide content, paginated without losing audio, word glosses or cells. */
  guide?: {
    topicId: string;
    /** Decorative chapter artwork on the topic's opening card only. */
    chapterId?: string;
    block?: Extract<GuideBlock, { kind: "table" }>;
    example?: GuideExample;
    sanskrit?: GuideSanskrit;
    sounds?: GuideSanskrit[];
    proof?: GuideProof;
  };
}

export interface LearnV2Lesson {
  id: string;
  rank: number;
  unit: LearnV2Text;
  title: LearnV2Text;
  titleSa: string;
  titleIast: string;
  outcome: LearnV2Text;
  minutes: number;
  prereqIds: string[];
  cards: LearnV2Card[];
  sourcesLabel: LearnV2Text;
  /** Preserved manuscript/reference reading; not a reviewed graded lesson. */
  sourceReading?: boolean;
  sourceLanguage?: "en" | "bilingual";
  sourceUrls?: string[];
  chapterId?: string;
  /** Source topics marked read only when the complete deck is finished. */
  topicIds?: string[];
}

export interface LearnV2Unit {
  id: string;
  rank: number;
  title: LearnV2Text;
  titleSa: string;
  lessonIds: string[];
}
