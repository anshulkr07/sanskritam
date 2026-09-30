// Step input contract (U15-2) — one renderer per step kind.
//
// Each renderer owns its input UI and a Check button; the Lesson player owns
// the verdict moment (VerdictSheet vocabulary — ProgressBar + "n/N",
// slide-up sheet, haptics.correct/near/incorrect, announceForAccessibility
// on every verdict). Reuse that vocabulary; do not invent a second one.
//
// Rules every renderer honours: script() on every Devanagari node (§3.2);
// unsure is never red (§3.3 — renderers never render verdicts at all, the
// player does); role + label on every input (a11y audit stays 0); every
// animation survives Reduce Motion.

import type { LessonStep } from "../../api/client";
import { plain } from "../../utils/text";

export interface StepInputProps {
  step: LessonStep;
  /** True once an answer is submitted — inputs lock, Check hides. */
  disabled: boolean;
  /** The renderer calls this with the gradable answer; the player POSTs it. */
  onSubmit: (answer: Record<string, unknown>) => void;
}

/** Safely read a field off the untyped step payload. */
export function field<T>(payload: Record<string, unknown>, key: string, fallback: T): T {
  const v = payload[key];
  return (v === undefined || v === null ? fallback : v) as T;
}

/** A prose field (a prompt, a gloss, a paragraph of teaching), with em dashes
 *  removed: the app's copy rule reaches text that arrives from the server. Not
 *  for Sanskrit fields, which are data. */
export function prose(payload: Record<string, unknown>, key: string, fallback = ""): string {
  return plain(field<string>(payload, key, fallback));
}
