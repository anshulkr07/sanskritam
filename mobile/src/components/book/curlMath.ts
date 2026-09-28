// curlMath — the geometry and the shader of a turning paper page (Read tab).
//
// Pure: no Skia runtime and no React Native, so every platform's bundle can
// import it. CurlLayer.native compiles CURL_SKSL; PageCurlBook drives
// curlGeometry from the pan gesture on the UI thread.
//
// The model is the cylinder curl. The sheet is held at its right edge and the
// held point travels to f. Everything past the crease wraps half-way round a
// cylinder of radius r lying on the page, then carries on flat on top, face
// down. With the crease at m = (g + f)/2 − dir·πr/2 the held edge lands under
// the finger: the page is held, not pushed. Two limits keep it a bound book
// rather than a loose sheet — the crease never crosses the spine (x = 0)
// inside the page, and never tilts past 30°.

import type { SkImage } from "@shopify/react-native-skia";
import type { SharedValue } from "react-native-reanimated";

/** A page snapshot, as the curl draws it. */
export type SheetImage = SkImage;

/**
 * The back of a sheet: rgb (0–1), then how much of the printed side shows
 * through it — paper lets a little ink through, a cover board none.
 */
export type SheetBack = [number, number, number, number];

/** One frame of a turn, in dp — everything the shader needs to know. */
export interface CurlShape {
  /** A point on the crease. */
  axis: [number, number];
  /** Unit vector across the crease, pointing into the part that lifts. */
  dir: [number, number];
  /** Cylinder radius; 0 = lying flat. */
  radius: number;
}

export interface CurlLayerProps {
  width: number;
  height: number;
  /** The sheet being turned; null draws nothing. */
  image: SharedValue<SheetImage | null>;
  shape: SharedValue<CurlShape>;
  back: SharedValue<SheetBack>;
}

/** How much ink shows through the back of a paper page. */
export const SHOW_THROUGH = 0.07;
/** Darkness of the curl's shadow on the page below. */
export const CURL_SHADOW = 0.28;

const MAX_TILT = Math.tan(Math.PI / 6);

/** The widest curl for a page this wide — wider pages bend in wider arcs. */
export function curlRadiusFor(width: number): number {
  "worklet";
  return Math.max(18, Math.min(44, width * 0.12));
}

/** Travel at which the whole sheet has passed the spine: fully turned. */
export function fullTravel(width: number, maxRadius: number): number {
  "worklet";
  return -(2 * width + 2 * maxRadius);
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  "worklet";
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/** The steepest crease that keeps both ends of the spine, (0,0) and (0,H), flat. */
function clampSlope(slope: number, mx: number, my: number, height: number): number {
  "worklet";
  if (mx <= 0) return 0;
  let lo = -MAX_TILT;
  let hi = MAX_TILT;
  // Top end: mx + my·s ≥ 0.
  if (my > 0) lo = Math.max(lo, -mx / my);
  else if (my < 0) hi = Math.min(hi, -mx / my);
  // Bottom end: mx − (H − my)·s ≥ 0.
  const below = height - my;
  if (below > 0) hi = Math.min(hi, mx / below);
  else if (below < 0) lo = Math.max(lo, mx / below);
  return lo > hi ? 0 : Math.max(lo, Math.min(hi, slope));
}

/**
 * One frame of a turn.
 * @param grabY  where the sheet was taken hold of (the hold snaps to the right edge)
 * @param travel horizontal travel of the held edge: 0 = flat … fullTravel() = gone
 * @param lift   vertical finger travel since the hold
 */
export function curlGeometry(
  width: number,
  height: number,
  grabY: number,
  travel: number,
  lift: number,
  maxRadius: number,
): CurlShape {
  "worklet";
  const t = Math.min(0, travel);
  if (width <= 0 || height <= 0 || t > -0.5) {
    // Lying flat: the crease sits just past the right edge, so nothing lifts.
    return { axis: [width + 1, grabY], dir: [1, 0], radius: 0 };
  }
  const reach = Math.min(1, -t / width);
  const fx = width + t;
  // Held low, the bottom corner leads; held high, the top one does.
  const fy = grabY + 0.5 * lift - 0.35 * (grabY - height / 2) * reach;
  const dist = Math.hypot(width - fx, grabY - fy);
  // The curl grows in from nothing (no jump under the thumb) and tightens as
  // the sheet travels, the way paper does.
  const radius =
    maxRadius * smoothstep(0, 0.08 * width, dist) * (1 - 0.4 * Math.min(1, -t / (2 * width)));
  const half = (Math.PI * radius) / 2;
  const cx = (width + fx) / 2;
  const cy = (grabY + fy) / 2;
  let dx = (width - fx) / dist;
  let dy = (grabY - fy) / dist;
  let mx = cx - dx * half;
  let my = cy - dy * half;
  // Bound, not loose. Clamping the slope moves the crease point a little, so
  // settle it twice (what is left is under 2dp at a corner).
  for (let pass = 0; pass < 2; pass++) {
    const slope = clampSlope(dy / dx, mx, my, height);
    const n = Math.sqrt(1 + slope * slope);
    dx = 1 / n;
    dy = slope / n;
    mx = cx - dx * half;
    my = cy - dy * half;
  }
  return { axis: [mx, my], dir: [dx, dy], radius };
}

// The sheet, drawn per pixel p (dp) with d = signed distance across the crease:
//   d < 0      flat page, with the folded-back part lying face down on top
//              (hovering, so its edge casts a soft shadow on the page)
//   0 ≤ d ≤ r  the cylinder: its back surface over its front surface
//   d > r      no sheet — only the curl's shadow on the live page below
// Each surface samples the snapshot at the point of paper that ends up at p.
// The back of the sheet is paper with the ink faintly showing through —
// mirrored for free, since it is the same point seen from behind.
export const CURL_SKSL = `
uniform shader page;
uniform vec2 pageSize;
uniform vec2 axis;
uniform vec2 dir;
uniform float radius;
uniform vec3 backTint;
uniform float showThrough;
uniform float shadow;

const float PI = 3.14159265;

float inside(vec2 q) {
  vec2 edge = min(q, pageSize - q);
  return clamp(min(edge.x, edge.y) + 0.5, 0.0, 1.0);
}

half4 face(vec2 q, float light) {
  float c = inside(q);
  if (c <= 0.0) {
    return half4(0.0);
  }
  half4 ink = page.eval(q);
  return half4(ink.rgb * light, ink.a) * c;
}

half4 reverse(vec2 q, float light) {
  float c = inside(q);
  if (c <= 0.0) {
    return half4(0.0);
  }
  half4 ink = page.eval(q);
  vec3 seen = backTint;
  if (ink.a > 0.0) {
    seen = ink.rgb / ink.a;
  }
  vec3 paper = mix(backTint, seen, showThrough) * light;
  return half4(paper * ink.a, ink.a) * c;
}

half4 stack(half4 top, half4 under) {
  return top + under * (1.0 - top.a);
}

half4 main(vec2 p) {
  float d = dot(p - axis, dir);
  if (radius < 0.5) {
    if (d >= 0.0) {
      return half4(0.0);
    }
    return stack(reverse(p - dir * (2.0 * d), 0.96), face(p, 1.0));
  }
  if (d < 0.0) {
    float nearFold = exp(d / radius);
    vec2 q = p + dir * (PI * radius - 2.0 * d);
    vec2 edge = min(q, pageSize - q);
    float gap = max(0.0, -min(edge.x, edge.y));
    float lit = 1.0 - shadow * 0.6 * exp(-gap / radius);
    return stack(
      reverse(q, 1.0 - 0.08 * nearFold),
      face(p, (1.0 - 0.06 * nearFold) * lit));
  }
  float fall = 1.0 - smoothstep(radius, radius * 2.5, d);
  half4 shade = half4(0.0, 0.0, 0.0,
    shadow * fall * fall * inside(p + dir * (PI * radius * 0.5 - d)));
  if (d > radius + 0.5) {
    return shade;
  }
  float a = asin(min(d, radius) / radius);
  half4 curl = stack(
    reverse(p + dir * (radius * (PI - a) - d), 0.8 + 0.22 * cos(a)),
    face(p + dir * (radius * a - d), 1.0 - 0.3 * sin(a) * sin(a)));
  return stack(curl * clamp(radius + 0.5 - d, 0.0, 1.0), shade);
}
`;
