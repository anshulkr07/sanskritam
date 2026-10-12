// chantClock: which chant line is sounding at tMs.
// Between lines keep the previous line lit until the next starts.

import type { ChantLine } from "../api/client";

export function lineAt(lines: ChantLine[], tMs: number): number {
  if (!lines.length) return -1;
  const sorted = [...lines].sort((a, b) => a.start_ms - b.start_ms);
  let at = -1;
  for (let i = 0; i < sorted.length; i++) {
    if (tMs >= sorted[i].start_ms) at = sorted[i].i;
    else break;
  }
  return at;
}

/** The nearest verse before or after `from` that has a chant, or -1. */
export function nextChantIndex(verses: { chant?: unknown }[], from: number, dir: 1 | -1): number {
  let i = from + dir;
  while (i >= 0 && i < verses.length) {
    if (verses[i]?.chant) return i;
    i += dir;
  }
  return -1;
}

export type AfterFinish = { kind: "repeat" } | { kind: "next"; index: number } | { kind: "stop" };

export type RepeatMode = "off" | "verse" | "chapter";

/** Cycle order of the Repeat button: off -> verse -> chapter -> off. */
export const REPEAT_ORDER: RepeatMode[] = ["off", "verse", "chapter"];

/** What the player does when verse `idx` ends: Repeat plays it again,
 *  otherwise the next verse with a chant. At the last one Repeat Chapter
 *  wraps to the first verse with a chant, otherwise it stops. */
export function afterFinish(
  repeat: RepeatMode,
  verses: { chant?: unknown }[],
  idx: number,
): AfterFinish {
  if (repeat === "verse") return { kind: "repeat" };
  const n = nextChantIndex(verses, idx, 1);
  if (n >= 0) return { kind: "next", index: n };
  if (repeat === "chapter") {
    const first = nextChantIndex(verses, -1, 1);
    if (first >= 0) return { kind: "next", index: first };
  }
  return { kind: "stop" };
}

/** How far through chant line `line` the playback at `tMs` is, 0..1.
 *  Syllable-level timing is not measured (per-line data only), so the
 *  fill is uniform across the line's span: the caller's syllable-weighted
 *  split (aksharaCount) refines it per akṣara. */
export function lineFill(
  line: { start_ms: number; end_ms: number } | undefined,
  tMs: number,
): number {
  if (!line) return 0;
  const { start_ms: s, end_ms: e } = line;
  if (!(e > s)) return tMs >= s ? 1 : 0;
  if (tMs <= s) return 0;
  if (tMs >= e) return 1;
  return (tMs - s) / (e - s);
}

/** Rough akṣara count of Devanagari `text`, for weighting the fluid fill:
 *  halant-joined consonants (kṣ, tr, …) count once, dependent vowel signs
 *  and dandas/numbers/space count not at all. Falls back to 1 so a line
 *  never divides by zero. */
export function aksharaCount(text: string): number {
  const t = text || "";
  // Drop the consonant a halant joins onto the previous one (k + ् + ṣ -> k).
  const joined = t.replace(/्[ऀ-ॿ]/g, "");
  // Drop dependent signs, dandas, digits and space.
  const bare = joined.replace(/[०-९।॥\s\u0900-\u0903\u093A-\u094F\u0951-\u0957\u0962\u0963]/g, "");
  const letters = bare.match(/[\u0904-\u0939\u0958-\u0961]/g);
  if (letters && letters.length) return letters.length;
  return t.trim() ? 1 : 0;
}
