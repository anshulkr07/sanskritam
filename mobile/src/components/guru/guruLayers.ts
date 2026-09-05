/**
 * Sanskritam — Guru rig geometry, native renderer.
 *
 * Every number here is lifted from the Rive file and verified against it, so
 * the native version composites identically. Coordinates are in **artboard
 * units** on a 600 x 600 stage; the renderer multiplies by k = size / 600.
 *
 * All plates are the source art at 45%, which is why every `w`/`h` below is
 * `sourcePixels * 0.45`. The bundled PNGs are 0.6x the source (1.33x the
 * artboard size), which covers a ~220 pt bubble on a 3x screen. If you render
 * bigger than that, re-export the plates at a higher scale — nothing else
 * changes.
 */

export const ART = 600;

/** Rotation pivots. A group is drawn as a full ART-sized box centred on its
 *  pivot, so rotating the box rotates about the pivot — same as Rive's nodes. */
export const PIVOT = {
  root:  [300, 300] as const,
  head:  [300, 377.85] as const,
  jaw:   [300, 272.55] as const,
  mala:  [300, 373.35] as const,
  jataL: [214.05, 194.25] as const,
  jataR: [388.43, 194.25] as const,
};

export type Layer = { src: number; cx: number; cy: number; w: number; h: number };

const A = (p: string) => p;

export const LAYERS = {
  glow:      { src: require('../../../assets/guru/glow.png'),       cx: 300,    cy: 300,    w: 620,    h: 620 },
  body:      { src: require('../../../assets/guru/body.png'),       cx: 300,    cy: 300,    w: 564.3,  h: 564.3 },
  mala:      { src: require('../../../assets/guru/mala.png'),       cx: 302.93, cy: 463.35, w: 182.25, h: 200.7 },
  headCore:  { src: require('../../../assets/guru/head_core.png'),  cx: 304.5,  cy: 181.87, w: 223.2,  h: 301.95 },
  jataL:     { src: require('../../../assets/guru/jata_l.png'),     cx: 214.05, cy: 233.15, w: 45.9,   h: 79.65 },
  jataR:     { src: require('../../../assets/guru/jata_r.png'),     cx: 388.43, cy: 233.15, w: 46.35,  h: 79.65 },
  jaw:       { src: require('../../../assets/guru/jaw.png'),        cx: 305.4,  cy: 331.5,  w: 221.4,  h: 117 },
  facePatch: { src: require('../../../assets/guru/face_patch.png'), cx: 304.05, cy: 204.60, w: 135,    h: 49.5 },
  irisL:     { src: require('../../../assets/guru/iris_l.png'),     cx: 269.62, cy: 215.18, w: 15.75,  h: 15.75 },
  irisR:     { src: require('../../../assets/guru/iris_r.png'),     cx: 337.12, cy: 215.18, w: 15.75,  h: 15.75 },
  lashL:     { src: require('../../../assets/guru/lash_l.png'),     cx: 267.82, cy: 213.60, w: 39.15,  h: 12.6 },
  lashR:     { src: require('../../../assets/guru/lash_r.png'),     cx: 338.93, cy: 213.38, w: 39.15,  h: 12.15 },
  browL:     { src: require('../../../assets/guru/brow_l.png'),     cx: 264.0,  cy: 193.12, w: 55.8,   h: 25.65 },
  browR:     { src: require('../../../assets/guru/brow_r.png'),     cx: 342.75, cy: 198.75, w: 58.5,   h: 36.9 },
} satisfies Record<string, Layer>;

/** Eyelids. Anchored at the TOP of the socket and revealed downward by
 *  animating height, so the plate squashes rather than slides. */
export const LIDS = [
  { src: require('../../../assets/guru/lid_l.png'), cx: 267.82, top: 200.60, w: 46, h: 26 },
  { src: require('../../../assets/guru/lid_r.png'), cx: 338.93, top: 200.38, w: 46, h: 26 },
];

/** Mouth plates, all at the same spot inside head_group. Index matches
 *  `Viseme` in viseme.ts: 1 ee, 2 aa, 3 aah, 4 oh, 5 oo, 6 fv. Index 0 is
 *  "no plate" — the base art already has a closed mouth. */
export const VISEMES = [
  require('../../../assets/guru/v_ee.png'),
  require('../../../assets/guru/v_aa.png'),
  require('../../../assets/guru/v_aah.png'),
  require('../../../assets/guru/v_oh.png'),
  require('../../../assets/guru/v_oo.png'),
  require('../../../assets/guru/v_fv.png'),
];
export const VISEME_BOX = { cx: 303.60, cy: 292.35, w: 126, h: 85.5 };

/** Hand gestures, children of the root (they do not follow the head).
 *  `arc` is the sideways offset at full extension — the hand swings in
 *  rather than sliding straight up. Travel is 100 artboard units. */
export const GESTURES = [
  { src: require('../../../assets/guru/h_anjali.png'), cx: 299.33, cy: 455.70, w: 324.45, h: 252.9, arc: 0 },
  { src: require('../../../assets/guru/h_abhaya.png'), cx: 140.70, cy: 436.35, w: 162.9,  h: 291.6, arc: -22 },
  { src: require('../../../assets/guru/h_offer.png'),  cx: 476.40, cy: 494.40, w: 135,    h: 175.5, arc: 22 },
  { src: require('../../../assets/guru/h_point.png'),  cx: 139.12, cy: 424.20, w: 128.25, h: 315.9, arc: -22 },
];
export const GESTURE_TRAVEL = 100;

/**
 * The response curves, copied from the .riv converters. `ki` is the shared
 * intensity term: 0 -> 60% amplitude, 50 -> 100%, 100 -> 140%.
 */
export const ki = (intensity01: number) => 0.6 + intensity01 * 100 * 0.008;
export const HEAD_DEG   = 0.12;    // headTurn (-100..100) -> degrees
export const IRIS_DX    = 0.035;   // gazeX -> artboard units
export const IRIS_DY    = 0.02;    // gazeY
export const BROW_L_DY  = 0.027;   // browRaise -> upward units (negated)
export const BROW_R_DY  = 0.03105; // right brow travels 15% further — the asymmetry is deliberate

/**
 * Box for a pivoted group: an ART-sized square whose centre sits on the pivot,
 * so rotating it rotates about that pivot — the same thing Rive's nodes do.
 *
 * `left`/`top` in RN are relative to the **parent view**, not the artboard, so
 * a nested group has to subtract its parent's pivot. Getting this wrong is
 * silent and looks like the art coming apart: with the parent term omitted,
 * `jaw_group` and both `jata_group`s rendered 77.85 units low, which dropped
 * the jaw off the face and exposed the hole in the body plate behind it.
 *
 * The root's parent is the component box, whose top-left is artboard (0, 0) —
 * that is the same as a parent pivot of (300, 300), which is why PIVOT.root
 * is the default.
 */
export const groupBox = (
  px: number, py: number, k: number,
  parentPx: number = ART / 2, parentPy: number = ART / 2,
) => ({
  position: 'absolute' as const,
  left: (px - parentPx) * k,
  top: (py - parentPy) * k,
  width: ART * k,
  height: ART * k,
});

/** Place a layer by its centre, inside a group whose pivot is (px, py). */
export const place = (l: { cx: number; cy: number; w: number; h: number }, px: number, py: number, k: number) => ({
  position: 'absolute' as const,
  left: (l.cx - (px - ART / 2)) * k - (l.w * k) / 2,
  top:  (l.cy - (py - ART / 2)) * k - (l.h * k) / 2,
  width: l.w * k,
  height: l.h * k,
});
