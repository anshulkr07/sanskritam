// Hook for respecting the OS "Reduce Motion" accessibility setting.
// Reads the setting on mount and subscribes to changes.
// Decorative animations (parallax, confetti, sparkles, breath) should
// gate on this — functional motion (sheet position, progress fill) should
// cut durations to ~40% but still run.

import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

/**
 * Returns true when the user has enabled Reduce Motion in their OS settings.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    // Read the current setting
    AccessibilityInfo.isReduceMotionEnabled().then(setReduced);

    // Subscribe to changes
    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduced,
    );

    return () => sub.remove();
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