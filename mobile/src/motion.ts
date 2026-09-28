// Motion token system — one source of truth for every animation duration, easing,
// and spring config in the app. No magic numbers anywhere after U0-3.
// Import from this module exclusively; never inline a duration.

import { Easing } from "react-native-reanimated";

export const duration = {
  instant: 100,   // state flips that must feel free — chip select
  quick:   180,   // tile pickup, button depress, chip
  base:    260,   // the default: sheets, fades, most transitions
  slow:    400,   // screen transitions, sheet with content
  turn:    520,   // a book page turned by a button — one unhurried leaf
  telling: 650,   // deliberate reveals — a śloka line, a badge
} as const;

export const easing = {
  standard:  Easing.bezier(0.2, 0, 0, 1),        // most things
  entrance:  Easing.out(Easing.cubic),            // arriving
  exit:      Easing.in(Easing.cubic),             // leaving
  overshoot: Easing.out(Easing.back(1.2)),        // playful arrivals
} as const;

export const spring = {
  snappy: { damping: 20, stiffness: 300, mass: 0.8 },  // UI response
  bouncy: { damping: 10, stiffness: 200, mass: 1.0 },  // celebration
  gentle: { damping: 18, stiffness: 120, mass: 1.0 },  // mascot, ambient
} as const;

/** Stagger delay for list items. Cap the index so long lists don't crawl. */
export const stagger = (i: number, step = 45, max = 6) =>
  Math.min(i, max) * step;