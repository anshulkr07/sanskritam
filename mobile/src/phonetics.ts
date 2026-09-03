// Phonetics — the articulation model behind the Varṇamālā vocal-tract animation.
//
// The varṇamālā is ordered by WHERE in the mouth a sound is made. This module
// turns the two fields the API already gives us (`place` and `voicing`, per
// HANDOVER P11-4: do not invent articulation data) into everything the
// animation needs: a tongue shape, a velum position, a voicing window and an
// airflow burst.
//
// Geometry note. The tract is drawn as a bent tube. ROOF and FLOOR both run
// larynx → lips and are resampled by arc length to the same N points, so index
// i on one corresponds to index i on the other. The tongue surface at i is
// then simply lerp(FLOOR[i], ROOF[i], constriction[i]) — a constriction of 1
// IS full closure, which is what makes each varga's contact land exactly on
// its place marker. Poses are therefore 9 numbers, not hand-drawn paths, and
// they interpolate cleanly.

// ── Place colours (used everywhere place is referenced) ────────────────

export const PLACE_COLORS: Record<string, string> = {
  kanthya:   "#CA4715", // throat · saffron
  talavya:   "#25833E", // palate · green
  murdhanya: "#5A7D9A", // retroflex · blue
  dantya:    "#6F59EC", // teeth · violet
  oshthya:   "#99680A", // lips · gold
};

export const PLACE_LABEL: Record<string, { sa: string; en: string; where: string }> = {
  kanthya:   { sa: "कण्ठ्य", en: "Throat",    where: "the soft palate" },
  talavya:   { sa: "तालव्य", en: "Palate",    where: "the hard palate" },
  murdhanya: { sa: "मूर्धन्य", en: "Retroflex", where: "the ridge behind your teeth" },
  dantya:    { sa: "दन्त्य",  en: "Teeth",     where: "the back of your teeth" },
  oshthya:   { sa: "ओष्ठ्य",  en: "Lips",      where: "both lips" },
};

export const PLACE_ORDER = ["kanthya", "talavya", "murdhanya", "dantya", "oshthya"];

// ── Tract geometry ────────────────────────────────────────────────────

export const N = 56; // sample count; kept modest because a worklet rebuilds
                     // the tongue path from these on every frame.

// Control points, viewBox 300×260, head facing right (throat left, lips right).
const ROOF_RAW: [number, number][] = [
  [46, 232], [43, 198], [42, 164], [45, 134], [54, 110], [72, 94], [100, 84],
  [132, 81], [162, 83], [188, 92], [209, 107], [224, 126], [234, 142],
];
const FLOOR_RAW: [number, number][] = [
  [96, 232], [98, 208], [102, 192], [112, 180], [130, 174], [158, 173],
  [184, 176], [204, 181], [220, 180], [232, 170],
];

/** Resample a polyline to `n` points spaced evenly by arc length. */
function resample(pts: [number, number][], n: number): [number, number][] {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  }
  const total = cum[cum.length - 1];
  const out: [number, number][] = [];
  for (let k = 0; k < n; k++) {
    const target = (total * k) / (n - 1);
    let i = 1;
    while (i < cum.length - 1 && cum[i] < target) i++;
    const t = (target - cum[i - 1]) / (cum[i] - cum[i - 1] || 1);
    out.push([
      pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t,
      pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t,
    ]);
  }
  return out;
}

const roof = resample(ROOF_RAW, N);
const floor = resample(FLOOR_RAW, N);

// Flat arrays: cheaper to capture in a Reanimated worklet than nested ones.
export const ROOF_X = roof.map((p) => p[0]);
export const ROOF_Y = roof.map((p) => p[1]);
export const FLOOR_X = floor.map((p) => p[0]);
export const FLOOR_Y = floor.map((p) => p[1]);

/** Point on the roof at index fraction `f` (0 = larynx, 1 = lips). */
export function roofAt(f: number): [number, number] {
  const i = Math.max(0, Math.min(N - 1, Math.round(f * (N - 1))));
  return [ROOF_X[i], ROOF_Y[i]];
}

/** The tongue spans this slice of the tube; behind it is the pharyngeal wall. */
export const I0 = 0.42;
export const I1 = 0.97;

/** Where each place sits along the roof. Labials are the tube's mouth. */
export const PLACE_I: Record<string, number> = {
  kanthya: 0.50, talavya: 0.65, murdhanya: 0.79, dantya: 0.91,
};
export const VELUM_I = 0.44;

// ── Constriction profiles ─────────────────────────────────────────────
// Nine stations across the tongue. 0 = resting on the floor of the mouth,
// 1 = pressed against the roof. Each varga peaks at 1 on its own place.

export const STATIONS = [0.42, 0.50, 0.58, 0.65, 0.72, 0.79, 0.86, 0.93, 1.00];

export const PROFILES: Record<string, number[]> = {
  rest:      [0.18, 0.24, 0.27, 0.28, 0.28, 0.27, 0.25, 0.22, 0.18],
  kanthya:   [0.62, 1.00, 0.70, 0.46, 0.34, 0.28, 0.25, 0.22, 0.18],
  talavya:   [0.26, 0.50, 0.86, 1.00, 0.78, 0.44, 0.30, 0.24, 0.18],
  murdhanya: [0.18, 0.24, 0.30, 0.44, 0.72, 1.00, 0.62, 0.30, 0.18],
  dantya:    [0.18, 0.22, 0.26, 0.32, 0.44, 0.66, 0.88, 1.00, 0.58],
  oshthya:   [0.18, 0.22, 0.25, 0.26, 0.26, 0.25, 0.24, 0.22, 0.18],
};

// ── Turning a varṇa into an articulation ──────────────────────────────

export type Manner = "stop" | "nasal" | "fricative" | "approximant" | "vowel";

export interface Articulation {
  /** One of PLACE_ORDER — the row of the sparśa grid. */
  place: string;
  /** Nine-station tongue target, already capped for the manner. */
  profile: number[];
  manner: Manner;
  voiced: boolean;
  aspirated: boolean;
  nasal: boolean;
  /** True when the lips do the closing (प-varga, and rounded vowels). */
  labial: boolean;
  rounded: boolean;
}

/** How close a manner lets the tongue get to the roof. Only stops seal. */
const MANNER_CAP: Record<Manner, number> = {
  stop: 1.0, nasal: 1.0, fricative: 0.86, approximant: 0.62, vowel: 0.45,
};

const MANNER_BY_KIND: Record<string, Manner> = {
  consonant: "stop", nasal: "nasal", vowel: "vowel",
  semivowel: "approximant", sibilant: "fricative", aspirate: "fricative",
};

export interface VarnaLike {
  place: string | null;
  voicing: string | null;
  kind: string;
}

/**
 * Derive an articulation from a varṇamālā row, or null when the character has
 * no place at all (anusvāra, visarga) and there is nothing honest to draw.
 *
 * Compound vowel places ("oshthya_kanthya" for u) name both the tongue
 * position and the lip posture; we take the last segment for the tongue and
 * treat any oshthya segment as lip rounding.
 */
export function articulationFor(c: VarnaLike): Articulation | null {
  if (!c.place) return null;
  const parts = c.place.split("_");
  const place = parts[parts.length - 1];
  if (!PROFILES[place]) return null;

  const manner = MANNER_BY_KIND[c.kind] ?? "stop";
  const v = c.voicing ?? "";
  const nasal = manner === "nasal";
  const aspirated = v.includes("aspirat");
  const voiced = nasal || manner === "vowel" || manner === "approximant"
    || v.startsWith("voiced");

  const cap = MANNER_CAP[manner];
  const profile = PROFILES[place].map((x) => Math.min(x, cap));

  return {
    place, profile, manner, voiced, aspirated, nasal,
    labial: place === "oshthya" && manner !== "vowel",
    rounded: parts.includes("oshthya"),
  };
}

/** One-line description of what the mouth is doing — the caption under the diagram. */
export function articulationSummary(a: Articulation, char: string): string {
  const where = PLACE_LABEL[a.place]?.where ?? a.place;
  const voice = a.voiced ? "with the voice on" : "with the voice off";
  if (a.nasal) return `${char} — closed at ${where}, but the soft palate drops and the sound goes out through the nose.`;
  if (a.manner === "stop") {
    return `${char} — a full stop at ${where}, released ${a.aspirated ? "with a puff of breath" : "cleanly"}, ${voice}.`;
  }
  if (a.manner === "fricative") return `${char} — a narrow gap at ${where}; the air hisses through, ${voice}.`;
  if (a.manner === "approximant") return `${char} — the tongue comes near ${where} without touching, ${voice}.`;
  return `${char} — the tongue shapes the space near ${where}; the air flows freely, ${voice}.`;
}

// ── The gesture over time ─────────────────────────────────────────────
// One clock t ∈ [0,1] drives every channel. These are the phonetics of the
// thing, kept here (rather than inside the component) so they can be reasoned
// about and tested on their own. All are worklets: Reanimated calls them on
// the UI thread once per frame.

export interface ArticFlags {
  nasal: boolean;
  voiced: boolean;
  aspirated: boolean;
  labial: boolean;
  stop: boolean;
}

export function flagsOf(a: Articulation): ArticFlags {
  return {
    nasal: a.nasal, voiced: a.voiced, aspirated: a.aspirated,
    labial: a.labial, stop: a.manner === "stop",
  };
}

/** Ramp 0→1 across [a,b], clamped. */
export function seg(t: number, a: number, b: number): number {
  "worklet";
  return Math.max(0, Math.min(1, (t - a) / (b - a)));
}
/** Triangle pulse: rises a→peak, falls peak→b, zero outside. */
export function pulse(t: number, a: number, peak: number, b: number): number {
  "worklet";
  if (t < a || t > b) return 0;
  return t < peak ? seg(t, a, peak) : 1 - seg(t, peak, b);
}

/** A continuant has nothing to burst, so it holds its posture like a nasal. */
function isHeld(f: ArticFlags): boolean {
  "worklet";
  return f.nasal || !f.stop;
}

/** Articulator travel: rest → place → rest. */
export function articAt(t: number, f: ArticFlags): number {
  "worklet";
  const held = isHeld(f);
  const holdEnd = held ? 0.74 : 0.52;
  const backEnd = held ? 0.92 : 0.70;
  return t < 0.26 ? seg(t, 0, 0.26) : t < holdEnd ? 1 : 1 - seg(t, holdEnd, backEnd);
}
/** Pressure behind a sealed oral closure. Nasals vent it; continuants never build it. */
export function pressAt(t: number, f: ArticFlags): number {
  "worklet";
  return isHeld(f) ? 0 : pulse(t, 0.26, 0.5, 0.56);
}
/** Air leaving the mouth. Aspirates keep it up long after the burst. */
export function airAt(t: number, f: ArticFlags): number {
  "worklet";
  if (f.nasal) return 0;
  if (!f.stop) return pulse(t, 0.26, 0.5, 0.86) * 0.6;
  return f.aspirated ? pulse(t, 0.5, 0.6, 0.86) : pulse(t, 0.5, 0.55, 0.66);
}
/**
 * Vocal-fold buzz. This is the ग/क contrast: a voiced stop is already humming
 * during the closure, a voiceless one only starts well after the release.
 */
export function voiceAt(t: number, f: ArticFlags): number {
  "worklet";
  const out = 1 - seg(t, 0.87, 1);
  if (f.nasal) return seg(t, 0.14, 0.24) * out;
  if (f.voiced) return seg(t, 0.22, 0.32) * out;
  return seg(t, 0.6, 0.7) * out;
}
/** Soft palate. Only nasals drop it, opening the route to the nose. */
export function velumAt(t: number, f: ArticFlags): number {
  "worklet";
  return f.nasal ? seg(t, 0.1, 0.3) * (1 - seg(t, 0.86, 1)) : 0;
}
/** 0 approach · 1 closure · 2 release · 3 after · 4 rest. Drives the caption. */
export function phaseAt(t: number, f: ArticFlags): number {
  "worklet";
  if (t < 0.26) return 0;
  if (t < (isHeld(f) ? 0.74 : 0.5)) return 1;
  if (t < 0.66) return 2;
  if (t < 0.88) return 3;
  return 4;
}
