// Haptics service — thin wrapper so screens don't import expo-haptics'
// verbose enum API directly. No-ops on web (haptics don't exist there).

import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

const IS_WEB = Platform.OS === "web";

export const haptics = {
  /** A light tick — tile taps, toggles, minor selection changes. */
  tap: () => {
    if (IS_WEB) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => null);
  },
  /** A firmer bump — primary button presses (Check, Continue). */
  press: () => {
    if (IS_WEB) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => null);
  },
  correct: () => {
    if (IS_WEB) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => null);
  },
  near: () => {
    if (IS_WEB) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => null);
  },
  incorrect: () => {
    if (IS_WEB) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => null);
  },
};

export default haptics;
