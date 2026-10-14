import type { StrokePath } from "../../api/client";
import { parsePathD } from "../../services/strokeMatcher";

/** Fit all paths together, preserving proportions and centring long words. */
export function fitWritingPaths(paths: StrokePath[]): StrokePath[] {
  const points = paths.flatMap(p => parsePathD(p.d) ?? []);
  if (!points.length) return [];
  const xs = points.map(p => p.x), ys = points.map(p => p.y);
  const left = Math.min(...xs), right = Math.max(...xs), top = Math.min(...ys), bottom = Math.max(...ys);
  const scale = Math.min(82 / Math.max(right - left, 1), 76 / Math.max(bottom - top, 1));
  const dx = 50 - (left + right) / 2 * scale, dy = 50 - (top + bottom) / 2 * scale;
  return paths.map(p => {
    const tokens = p.d.match(/[MLCZ]|-?\d+(?:\.\d+)?/g) ?? [];
    let axis = 0;
    return { ...p, d: tokens.map(t => {
      if (/^[MLCZ]$/.test(t)) { axis = 0; return t; }
      return (Number(t) * scale + (axis++ % 2 === 0 ? dx : dy)).toFixed(2);
    }).join(" ") };
  });
}
export function writingPathLength(d: string): number {
  const points = parsePathD(d) ?? [];
  return points.slice(1).reduce((length, p, i) => length + Math.hypot(p.x - points[i].x, p.y - points[i].y), 0);
}
export function writingFontSize(text: string): number {
  const glyphs = Array.from(text).filter(c => !/[ािीुूृॄेैोौंँः्]/.test(c)).length;
  return Math.max(12, Math.min(58, 82 / Math.max(1, glyphs * 0.68)));
}
