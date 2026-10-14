// The Read tab's shelves: which books sit in which row, for Books and Audio.

import { plain } from "../utils/text";

/** A book's English title for shelves and players: the catalogue's
 *  "(selections)" / "(complete)" / "(indexed)" tail is said by the line
 *  under it ("40 selected"), so it is dropped here. */
export function shelfTitle(titleEn: string): string {
  return plain(titleEn).replace(/\s*\((?:selections|complete|indexed)\)\s*$/i, "");
}

export const RAIL_DEFS: { title: string; slugs: string[] }[] = [
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

/** The Audio shelf's filter chips: fewer, broader groups than the rails. */
export type AudioGroup = "Scriptures" | "Stotras" | "Poetry" | "Wisdom";

const GROUP_OF_RAIL: Record<string, AudioGroup> = {
  Scriptures: "Scriptures",
  Vedas: "Scriptures",
  "Upaniṣads": "Scriptures",
  "Purāṇas": "Scriptures",
  Stotras: "Stotras",
  "Poetry and drama": "Poetry",
  "Stories and wisdom": "Wisdom",
  "Yoga, Āyurveda and śāstra": "Wisdom",
};

export const AUDIO_GROUPS: AudioGroup[] = ["Scriptures", "Stotras", "Poetry", "Wisdom"];

export function audioGroupOf(slug: string): AudioGroup {
  const rail = RAIL_DEFS.find((r) => r.slugs.includes(slug));
  return (rail && GROUP_OF_RAIL[rail.title]) || "Wisdom";
}

/** Study order across the rails, for books that need one list. */
export const SHELF_ORDER: string[] = RAIL_DEFS.flatMap((r) => r.slugs);
