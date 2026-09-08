// Haptics service — thin wrapper so screens don't import expo-haptics'
// verbose enum API directly. No-ops on web (haptics don't exist there).
//
// Honours the Settings toggle (services/prefs): when the learner turns
// haptics off, every call below is silent.

import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

import { isHapticsEnabled } from "./prefs";

const IS_WEB = Platform.OS === "web";

function allowed(): boolean {
  return !IS_WEB && isHapticsEnabled();
}

export const haptics = {
  /** A light tick — tile taps, toggles, minor selection changes. */
  tap: () => {
    if (!allowed()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => null);
  },
  /** A firmer bump — primary button presses (Check, Continue). */
  press: () => {
    if (!allowed()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => null);
  },
  correct: () => {
    if (!allowed()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => null);
  },
  near: () => {
    if (!allowed()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => null);
  },
  incorrect: () => {
    if (!allowed()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => null);
  },
};

export default haptics;
