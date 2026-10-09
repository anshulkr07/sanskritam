// bands: map a recite response to display rows + accessibility labels.

import type { ReciteLine } from "../api/client";

export interface DisplayLine {
  i: number;
  ok: number;
  fix: number;
  unclear: number;
  label: string;
}

export function toDisplay(lines: ReciteLine[]): DisplayLine[] {
  return lines.map((ln) => {
    const ok = ln.aksharas.filter((a) => a.band === "ok").length;
    const fix = ln.aksharas.filter((a) => a.band === "fix").length;
    const unclear = ln.aksharas.filter((a) => a.band === "unclear").length;
    const heard = ln.aksharas.find((a) => a.band === "fix" && a.heard);
    const label = `Line ${ln.i + 1}: ${ok} right, ${fix} to fix${heard?.heard ? `, heard ${heard.heard} for ${heard.t}` : ""}`;
    return { i: ln.i, ok, fix, unclear, label };
  });
}
