// Hook for respecting the OS "Reduce Motion" accessibility setting.
// Reads the setting on mount and subscribes to changes.
// Decorative animations (parallax, confetti, sparkles, breath) should
// gate on this — functional motion (sheet position, progress fill) should
// cut durations to ~40% but still run.
//
// U15-7: OR-ed with the in-app "Reduce motion" override (Settings →
// services/prefs). Many older users never discover the OS setting; the
// app's own toggle must drive the same hook every animation reads.

import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

import { isReducedMotionOverride, subscribePrefs } from "../services/prefs";

/**
 * Returns true when the user has enabled Reduce Motion in their OS settings
 * or in the app's own Settings toggle.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => isReducedMotionOverride(),
  );

  useEffect(() => {
    let alive = true;
    // Read the current OS setting, OR-ed with the app override.
    AccessibilityInfo.isReduceMotionEnabled().then((os) => {
      if (alive) setReduced(os || isReducedMotionOverride());
    });

    // Subscribe to OS changes.
    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (os) => setReduced(os || isReducedMotionOverride()),
    );
    // ...and to the in-app toggle.
    const unsub = subscribePrefs(() => {
      AccessibilityInfo.isReduceMotionEnabled().then((os) => {
        if (alive) setReduced(os || isReducedMotionOverride());
      });
    });

    return () => {
      alive = false;
      sub.remove();
      unsub();
    };
  }, []);

  return reduced;
}

/**
 * Returns a duration that is safe to use in animation calls.
 * When reduce-motion is on and the motion is decorative, returns 0.
 * When reduce-motion is on but the motion is functional, returns ~40% of base.
 * When reduce-motion is off, returns the base duration unchanged.
 */
export function useMotionDuration(base: number, decorative = false): number {
  const reduced = useReducedMotion();
  if (reduced && decorative) return 0;
  if (reduced) return Math.round(base * 0.4);
  return base;
}
