// Circle geometry for the Kāla charts.
//
// One convention everywhere: 0 degrees is the top of the circle and angles
// run clockwise, the way a clock face and the Home card's tithi ring read.

export interface Point {
  x: number;
  y: number;
}

/** A point on a circle of radius `r` round (cx, cy). */
export function polar(cx: number, cy: number, r: number, deg: number): Point {
  const a = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

const f = (n: number) => n.toFixed(2);

/** How far to sweep from `a` to `b`: never negative, never a closed circle
 *  (an arc whose ends meet draws nothing). */
function sweepOf(a: number, b: number): number {
  return Math.min(359.99, Math.max(0, b - a));
}

/** A stroked arc from `a` to `b` degrees. */
export function arcPath(cx: number, cy: number, r: number, a: number, b: number): string {
  const sweep = sweepOf(a, b);
  const p0 = polar(cx, cy, r, a);
  const p1 = polar(cx, cy, r, a + sweep);
  return `M ${f(p0.x)} ${f(p0.y)} A ${f(r)} ${f(r)} 0 ${sweep > 180 ? 1 : 0} 1 ${f(p1.x)} ${f(p1.y)}`;
}

/** A filled piece of a ring between radii `r0` and `r1`. */
export function sectorPath(cx: number, cy: number, r0: number, r1: number, a: number, b: number): string {
  const sweep = sweepOf(a, b);
  const large = sweep > 180 ? 1 : 0;
  const o0 = polar(cx, cy, r1, a);
  const o1 = polar(cx, cy, r1, a + sweep);
  const i1 = polar(cx, cy, r0, a + sweep);
  const i0 = polar(cx, cy, r0, a);
  return (
    `M ${f(o0.x)} ${f(o0.y)} A ${f(r1)} ${f(r1)} 0 ${large} 1 ${f(o1.x)} ${f(o1.y)} ` +
    `L ${f(i1.x)} ${f(i1.y)} A ${f(r0)} ${f(r0)} 0 ${large} 0 ${f(i0.x)} ${f(i0.y)} Z`
  );
}

/** A filled wedge from the centre out to radius `r`. */
export function wedgePath(cx: number, cy: number, r: number, a: number, b: number): string {
  const sweep = sweepOf(a, b);
  const p0 = polar(cx, cy, r, a);
  const p1 = polar(cx, cy, r, a + sweep);
  return `M ${f(cx)} ${f(cy)} L ${f(p0.x)} ${f(p0.y)} A ${f(r)} ${f(r)} 0 ${sweep > 180 ? 1 : 0} 1 ${f(p1.x)} ${f(p1.y)} Z`;
}

/** The segment a place on the ring falls in. `at` runs 0 to 1 round the
 *  ring; segments are given by where each one ends. */
export function segmentAt(ends: number[], at: number): number {
  const x = at - Math.floor(at);
  for (let i = 0; i < ends.length; i++) if (x < ends[i]) return i;
  return Math.max(0, ends.length - 1);
}
