// Screen-reader verdict announcements (U5-1).
//
// Verdict surfaces already carry accessibilityRole="alert" + live regions,
// which TalkBack announces. VoiceOver needs an explicit announcement, so every
// verdict moment also calls announceForAccessibility exactly once. Copy says
// the SYSTEM failed to hear on unsure — never that the learner failed (§3.3).

import { AccessibilityInfo } from "react-native";

export type AnnounceVerdictKind =
  | "correct"
  | "off_by_one"
  | "incorrect"
  | "unsure"
  | "near"
  | "wrong";

const COPY: Record<AnnounceVerdictKind, string> = {
  correct: "Correct. Well done.",
  off_by_one: "So close. One ending to fix.",
  incorrect: "Not yet. Here it is.",
  unsure: "Couldn't hear that clearly.",
  near: "Close. Try once more.",
  wrong: "That looks like a different letter. Compare with the reference.",
};

export function announceVerdict(kind: AnnounceVerdictKind): void {
  try {
    AccessibilityInfo.announceForAccessibility(COPY[kind] ?? COPY.unsure);
  } catch {
    /* screen reader unavailable — visual verdict still shows */
  }
}

export function announce(text: string): void {
  try {
    AccessibilityInfo.announceForAccessibility(text);
  } catch {
    /* non-fatal */
  }
}

export default { announceVerdict, announce };
