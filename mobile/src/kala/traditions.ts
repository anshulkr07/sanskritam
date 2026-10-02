// The six calendar traditions the card can speak in.
//
// They are not six calendars. They are one sky read with four choices: whether
// a month follows the Moon or the Sun, where a lunar month ends, when the year
// turns, and which era counts the years. Each tradition below is one setting
// of those choices.

import type { Observer, SolarRule } from "./engine";
import type { RegionalScript } from "./regionalNames";

export type TraditionId = "north" | "deccan" | "gujarat" | "tamil" | "kerala" | "bengal";

/** What the date is written in: Sanskrit in Devanagari, Sanskrit in roman, or
 *  the wall calendar of the learner's own region in its own script. */
export type ScriptChoice = "devanagari" | "roman" | "regional";

export interface KalaPlace {
  lat: number;
  lon: number;
  tz: string;
  label: string;
}

/** The four choices that make one tradition's calendar out of the one sky. */
export interface Knobs {
  /** What a month follows. */
  months: "moon" | "sun";
  /** Where a month ends: at a new moon, a full moon, or when the Sun
   *  changes sign. */
  monthEnd: "newMoon" | "fullMoon" | "sign";
  /** The month that opens the year. */
  yearStart: "chaitra" | "karttika" | "mesha" | "simha";
  /** How the years are counted. */
  era: "vikrama" | "shaka" | "cycle" | "kollam" | "bangabda";
}

export interface Tradition {
  id: TraditionId;
  /** Shown in the chooser. */
  label: string;
  /** One word, for a table. */
  short: string;
  note: string;
  /** Where a lunar month ends in this tradition's Sanskrit date. */
  monthEnd: "purnimanta" | "amanta";
  /** How the year is counted and named. */
  year: "vikrama" | "shaka" | "vikramaKartikadi" | "tamil" | "kollam" | "bangabda";
  /** Present where the wall calendar counts months by the Sun. */
  solar?: {
    rule: SolarRule;
    /** The city the month's first day is worked out for. */
    ref: Observer;
    /** The sign whose month opens the year: 0 Mesha, 4 Simha. */
    yearStartSign: number;
    names: "tamil" | "malayalam" | "bengali";
  };
  /** The script "My script" means here. Absent where it is Devanagari. */
  regional?: RegionalScript;
  /** The place used until the learner chooses one. */
  city: KalaPlace;
  knobs: Knobs;
}

const IST = "Asia/Kolkata";

export const TRADITIONS: Tradition[] = [
  {
    id: "north",
    label: "North India",
    short: "North",
    note: "Month ends at the full moon · Vikrama",
    monthEnd: "purnimanta",
    year: "vikrama",
    city: { label: "New Delhi", lat: 28.6, lon: 77.2, tz: IST },
    knobs: { months: "moon", monthEnd: "fullMoon", yearStart: "chaitra", era: "vikrama" },
  },
  {
    id: "deccan",
    label: "Maharashtra, Karnataka, Telugu states",
    short: "Deccan",
    note: "Month ends at the new moon · Śaka",
    monthEnd: "amanta",
    year: "shaka",
    city: { label: "Mumbai", lat: 19.1, lon: 72.9, tz: IST },
    knobs: { months: "moon", monthEnd: "newMoon", yearStart: "chaitra", era: "shaka" },
  },
  {
    id: "gujarat",
    label: "Gujarat",
    short: "Gujarat",
    note: "Year turns after Diwali · Vikrama",
    monthEnd: "amanta",
    year: "vikramaKartikadi",
    regional: "gujarati",
    city: { label: "Ahmedabad", lat: 23.0, lon: 72.6, tz: IST },
    knobs: { months: "moon", monthEnd: "newMoon", yearStart: "karttika", era: "vikrama" },
  },
  {
    id: "tamil",
    label: "Tamil Nadu",
    short: "Tamil",
    note: "Months follow the Sun · 60-year cycle",
    monthEnd: "amanta",
    year: "tamil",
    solar: { rule: "sunset", ref: { lat: 13.1, lon: 80.3 }, yearStartSign: 0, names: "tamil" },
    regional: "tamil",
    city: { label: "Chennai", lat: 13.1, lon: 80.3, tz: IST },
    knobs: { months: "sun", monthEnd: "sign", yearStart: "mesha", era: "cycle" },
  },
  {
    id: "kerala",
    label: "Kerala",
    short: "Kerala",
    note: "Months follow the Sun · Kollam era",
    monthEnd: "amanta",
    year: "kollam",
    solar: { rule: "aparahna", ref: { lat: 10.0, lon: 76.3 }, yearStartSign: 4, names: "malayalam" },
    regional: "malayalam",
    city: { label: "Kochi", lat: 10.0, lon: 76.3, tz: IST },
    knobs: { months: "sun", monthEnd: "sign", yearStart: "simha", era: "kollam" },
  },
  {
    id: "bengal",
    label: "Bengal",
    short: "Bengal",
    note: "Months follow the Sun · Baṅgābda",
    monthEnd: "amanta",
    year: "bangabda",
    solar: { rule: "nextDay", ref: { lat: 22.6, lon: 88.4 }, yearStartSign: 0, names: "bengali" },
    regional: "bengali",
    city: { label: "Kolkata", lat: 22.6, lon: 88.4, tz: IST },
    knobs: { months: "sun", monthEnd: "sign", yearStart: "mesha", era: "bangabda" },
  },
];

export const DEFAULT_TRADITION: TraditionId = "north";

export function traditionById(id: string | null | undefined): Tradition {
  return TRADITIONS.find((t) => t.id === id) ?? TRADITIONS[0];
}
