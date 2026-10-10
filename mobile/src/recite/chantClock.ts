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

/** What the player does when verse `idx` ends: Repeat plays it again,
 *  otherwise the next verse with a chant, and at the last one it stops. */
export function afterFinish(
  repeat: "off" | "verse",
  verses: { chant?: unknown }[],
  idx: number,
): AfterFinish {
  if (repeat === "verse") return { kind: "repeat" };
  const n = nextChantIndex(verses, idx, 1);
  return n >= 0 ? { kind: "next", index: n } : { kind: "stop" };
}
