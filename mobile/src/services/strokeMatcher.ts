// strokeMatcher.ts — the no-native fallback for ink recognition (U12-2).
//
// When the on-device ML Kit module is absent (Expo Go, web, iOS before its
// native module ships), drawing practice still works: the Writing screen is
// a COPY task — the reference letter is known — so this verifies shape
// similarity against the authored P20-2 stroke paths instead of classifying
// open handwriting. Pure TypeScript, zero dependencies, runs anywhere.
//
// Honesty properties (§3.3, P20-3):
//   • Returns the reference text with a similarity confidence, or null when
//     there is nothing to judge. It can NEVER name a different letter, so
//     the server can only ever grade correct-or-unsure — `wrong` is
//     structurally unreachable through this path (see grade_writing).
//   • Runs entirely on-device: points in, score out. Nothing transmitted,
//     same contract as the ML Kit adapter (§2.16).
//   • Calibrated so a faithful copy clears the ink correct floor (0.80) and
//     everything sloppy lands below it as `unsure` — never a false correct.

export interface MatchPoint {
  x: number;
  y: number;
}

export interface MatchRefStroke {
  d: string;
  dir: "ltr" | "rtl" | "ttb" | "btt";
}

export interface MatchResult {
  /** 0..1 shape similarity, mapped to the same confidence scale ML Kit uses. */
  confidence: number;
}

const RESAMPLE_N = 32;
const CURVE_STEPS = 12;
// Reversed stroke order costs a little (stroke direction is taught) but is
// not failure — beginners reverse all the time.
const REVERSE_PENALTY = 1.1;
// Missing/extra strokes and wrong direction cost this much each, in the same
// units as mean point distance over unit-normalised strokes.
const MISSING_COST = 0.3;
const EXTRA_COST = 0.25;
// NOTE: no stroke-direction check. The authored `dir` disagrees with naive
// displacement on diagonals (an up-right hook is authored "ltr"), and ML Kit
// itself cannot see stroke order — shape parity with the native path is the
// honest target. Order is taught by the player and ghost, not graded here.
// Cost at which confidence hits zero. Tuned in the scratch harness against
// real P20-2 seed paths: faithful copies sit ~0.05-0.15, sloppy ~0.3+.
const ZERO_AT_COST = 0.5;

function cubic(
  p0: MatchPoint,
  p1: MatchPoint,
  p2: MatchPoint,
  p3: MatchPoint,
  t: number,
): MatchPoint {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
  };
}

/**
 * Flatten one SVG path `d` (M/L/C/Z, as authored in stroke_data.py) to a
 * point list. Returns null when the path cannot be parsed — the caller then
 * has no basis for comparison and abstains.
 */
export function parsePathD(d: string): MatchPoint[] | null {
  try {
    const tokens = d.match(/[MLCZ]|-?\d+(?:\.\d+)?/g);
    if (!tokens || tokens.length === 0) return null;
    const pts: MatchPoint[] = [];
    let cur: MatchPoint = { x: 0, y: 0 };
    let subStart: MatchPoint = { x: 0, y: 0 };
    let i = 0;
    const num = (): number | null => {
      if (i >= tokens.length) return null;
      const t = tokens[i];
      if (/^[MLCZ]$/.test(t)) return null;
      i += 1;
      return parseFloat(t);
    };
    while (i < tokens.length) {
      const cmd = tokens[i++];
      if (cmd === "M" || cmd === "L") {
        const x = num();
        const y = num();
        if (x === null || y === null) return null;
        cur = { x, y };
        if (cmd === "M") subStart = cur;
        pts.push({ ...cur });
      } else if (cmd === "C") {
        const x1 = num();
        const y1 = num();
        const x2 = num();
        const y2 = num();
        const x = num();
        const y = num();
        if (x1 === null || y1 === null || x2 === null || y2 === null || x === null || y === null) {
          return null;
        }
        const p0 = { ...cur };
        const p1 = { x: x1, y: y1 };
        const p2 = { x: x2, y: y2 };
        const p3 = { x, y };
        for (let s = 1; s <= CURVE_STEPS; s++) {
          pts.push(cubic(p0, p1, p2, p3, s / CURVE_STEPS));
        }
        cur = p3;
      } else if (cmd === "Z") {
        pts.push({ ...subStart });
        cur = { ...subStart };
      } else {
        return null;
      }
    }
    return pts.length >= 2 ? pts : null;
  } catch {
    return null;
  }
}

function pathLength(pts: MatchPoint[]): number {
  let len = 0;
  for (let i = 1; i < pts.length; i++) {
    len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  }
  return len;
}

/** Uniform arc-length resample to N points (the $1-recognizer staple). */
function resample(pts: MatchPoint[], n: number): MatchPoint[] {
  if (pts.length === 0) return [];
  const total = pathLength(pts);
  if (total === 0) return Array.from({ length: n }, () => ({ ...pts[0] }));
  const step = total / (n - 1);
  const out: MatchPoint[] = [{ ...pts[0] }];
  let acc = 0;
  let prev = { ...pts[0] };
  let i = 1;
  while (out.length < n - 1 && i < pts.length) {
    const seg = Math.hypot(pts[i].x - prev.x, pts[i].y - prev.y);
    if (acc + seg >= step) {
      const t = (step - acc) / seg;
      const p = { x: prev.x + t * (pts[i].x - prev.x), y: prev.y + t * (pts[i].y - prev.y) };
      out.push(p);
      prev = p;
      acc = 0;
    } else {
      acc += seg;
      prev = { ...pts[i] };
      i += 1;
    }
  }
  while (out.length < n) out.push({ ...pts[pts.length - 1] });
  return out;
}

/**
 * One shared normalisation per sample (centre bbox, uniform scale): relative
 * layout between strokes (stem vs hook vs bindu) is part of the letter, so
 * strokes must NOT be normalised independently.
 */
function normalizeAll(strokes: MatchPoint[][]): MatchPoint[][] {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const s of strokes) {
    for (const p of s) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
  }
  if (!isFinite(minX)) return strokes;
  const span = Math.max(maxX - minX, maxY - minY, 1e-6);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  return strokes.map((s) => s.map((p) => ({ x: (p.x - cx) / span, y: (p.y - cy) / span })));
}

function meanDist(a: MatchPoint[], b: MatchPoint[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += Math.hypot(a[i].x - b[i].x, a[i].y - b[i].y);
  }
  return sum / a.length;
}

function shapeDist(a: MatchPoint[], b: MatchPoint[]): number {
  const fwd = meanDist(a, b);
  const rev = meanDist(a, [...b].reverse()) * REVERSE_PENALTY;
  return Math.min(fwd, rev);
}

/**
 * Score learner strokes against the reference. Returns null only when there
 * is no basis for comparison (no strokes, no parseable reference) — every
 * real attempt gets a confidence and lets the server grade correct-or-unsure.
 */
export function matchWriting(
  learner: MatchPoint[][],
  ref: MatchRefStroke[],
): MatchResult | null {
  const cleanLearner = learner.filter((s) => s.length >= 2);
  if (cleanLearner.length === 0) return null;
  const refPts = ref
    .map((r) => ({ pts: parsePathD(r.d), dir: r.dir }))
    .filter((r): r is { pts: MatchPoint[]; dir: MatchRefStroke["dir"] } => r.pts !== null);
  if (refPts.length === 0) return null;

  const normLearner = normalizeAll(cleanLearner).map((s) => resample(s, RESAMPLE_N));
  const normRef = normalizeAll(refPts.map((r) => r.pts)).map((s) => resample(s, RESAMPLE_N));

  // Greedy assignment: each learner stroke takes its nearest free reference.
  const taken = new Array<boolean>(normRef.length).fill(false);
  let sum = 0;
  let matched = 0;
  for (let li = 0; li < normLearner.length; li++) {
    let best = -1;
    let bestD = Infinity;
    for (let ri = 0; ri < normRef.length; ri++) {
      if (taken[ri]) continue;
      const d = shapeDist(normLearner[li], normRef[ri]);
      if (d < bestD) {
        bestD = d;
        best = ri;
      }
    }
    if (best < 0) break; // more learner strokes than reference: extras below
    taken[best] = true;
    matched += 1;
    sum += bestD;
  }
  const missing = normRef.length - matched;
  const extra = normLearner.length - matched;
  const cost = (sum + missing * MISSING_COST + extra * EXTRA_COST) /
    Math.max(normRef.length, 1);
  const confidence = Math.max(0, Math.min(1, 1 - cost / ZERO_AT_COST));
  return { confidence };
}
