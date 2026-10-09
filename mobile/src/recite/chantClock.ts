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
