/**
 * Sanskritam — Guru presentation profiles
 *
 * The same rig has to work at two very different sizes:
 *   • a 10-20% chat-window avatar (roughly 90-150 px on a phone), and
 *   • a full-screen "stage" presentation (400-900 px).
 *
 * Motion that reads beautifully at 600 px is literally sub-pixel at 110 px.
 * These numbers are not guesses — they were measured by rendering the rig at
 * each size and counting how many pixels change by more than 24 levels when a
 * single input is driven to full:
 *
 *   input            110px   160px   220px   320px   420px   600px
 *   headTurn 100      1449    3087    5825   12165   20702   41658
 *   mouthOpen 100      112     248     481    1052    1836    3706
 *   mala 3deg          249     534    1036    2121    3667    7495
 *   browRaise 100       59     110     167     308     489     918
 *   jata 4deg           46     120     282     619    1017    1879
 *   gazeX 100           17      27      51      97     159     315
 *   gazeY 100            6      22      39      84     140     254
 *
 * Below roughly 15 changed pixels a motion is invisible once it is moving.
 * So at chat-avatar size the eyes are decorative and the head is the only
 * thing the user can actually read — which is why `gazeToHead` exists: in
 * compact mode a look-at target is spent on the neck instead of the irises.
 */

export type GuruPresentation = 'compact' | 'standard' | 'stage';

export interface PresentationProfile {
  /** `intensity` fed to the rig (0..1). The .riv scales every bound response
   *  by (0.6 + intensity * 0.8), so 0.5 is neutral, 1 is +40%, 0 is -40%. */
  intensity: number;
  /** Fraction of a look-at target that is spent on head rotation. */
  gazeToHead: number;
  /** Multiplier on the iris travel itself. */
  gazeScale: number;
  /** Multiplier on brow travel. */
  browScale: number;
  /** Amplitude of the always-on head micro-drift, in headTurn units (0..1). */
  driftAmplitude: number;
  /** Seconds between ambient saccades: [min, max]. */
  saccadeInterval: [number, number];
  /** Chance a saccade returns to the mood's resting direction rather than
   *  striking out somewhere new. Without this he stares off at 2 s a time;
   *  with it he gets the natural look-away / look-back rhythm. */
  returnBias: number;
  /** Hz the director writes at. Lower is cheaper and invisible when small. */
  tickHz: number;
  /** Shortest a mouth shape is held, ms. Measured at 110 px, the two subtlest
   *  plates (`ee` 77 and `aa` 65 changed pixels) sit near the brow-raise
   *  threshold — legible, but only if they stay put long enough to register.
   *  Rapid subtle changes at small size read as noise, not speech. */
  visemeMinMs: number;
}

const PROFILES: Record<GuruPresentation, PresentationProfile> = {
  // Chat bubble. Eyes and brows are below the perception floor, so most of a
  // look-at target is spent on the neck: a full look turns the head ~10 deg
  // here versus ~5.5 deg at full size. Drift is larger for the same reason —
  // at 110 px a 0.09 drift is a third of a pixel, i.e. nothing.
  compact: {
    intensity: 0.95,
    gazeToHead: 0.62,
    gazeScale: 1.0,
    browScale: 1.0,
    driftAmplitude: 0.16,
    saccadeInterval: [1.6, 4.0],
    returnBias: 0.5,
    tickHz: 24,
    visemeMinMs: 90,
  },
  // Lesson panel / card. Everything reads; nothing needs help.
  standard: {
    intensity: 0.5,
    gazeToHead: 0.46,
    gazeScale: 1.0,
    browScale: 1.0,
    driftAmplitude: 0.11,
    saccadeInterval: [1.3, 3.6],
    returnBias: 0.45,
    tickHz: 30,
    visemeMinMs: 70,
  },
  // Full screen. The head angle stays about the same as `standard` — the
  // character's proportions do not change with the viewport, so the angle
  // that reads well at 300 px still reads well at 700 px. What changes is
  // that the eyes are now highly legible, so *they* carry the look and the
  // head follows less: 0.42 instead of 0.62. That is the naturalistic
  // direction, and it is only affordable when the irises are visible.
  stage: {
    intensity: 0.55,
    gazeToHead: 0.42,
    gazeScale: 1.0,
    browScale: 0.9,
    driftAmplitude: 0.095,
    saccadeInterval: [1.2, 3.4],
    returnBias: 0.42,
    tickHz: 30,
    visemeMinMs: 55,
  },
};

/** Rendered edge length in px -> which profile to use. */
export function presentationFor(sizePx: number): GuruPresentation {
  if (sizePx < 180) return 'compact';
  if (sizePx < 400) return 'standard';
  return 'stage';
}

export function profileFor(p: GuruPresentation): PresentationProfile {
  return PROFILES[p];
}
