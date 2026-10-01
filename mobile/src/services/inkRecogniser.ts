// inkRecogniser.ts — the on-device recogniser seam (U12-2 / §2.16).
//
// OWNER DECISION (2026-09-05): recognition is Google ML Kit Digital Ink — an
// ON-DEVICE model. Cloud Vision is disqualified by §2.16, not competing with
// it. Two tiers, both on-device, never a cloud fallback (that would reverse
// the owner decision the privacy rule encodes):
//   1. The native module (dev build) classifies open handwriting.
//   2. The local template matcher (strokeMatcher.ts) verifies the copy against
//      the authored P20-2 paths. It can only ever answer the reference letter
//      or abstain, so the server grades correct-or-unsure, never wrong.
//
// The model downloads once (Play Services) and then works offline. The
// download starts when the writing screen opens (prepare()), the canvas shows
// "Preparing handwriting…" until it lands, and if it cannot be fetched the
// template matcher answers instead. A Check tap never silently does nothing.

import type { InkRecogniser, InkStatus } from "../components/writing/WritingCanvas";
import type { StrokePath } from "../api/client";
import { matchWriting } from "./strokeMatcher";

// Devanagari model for ML Kit Digital Ink.
const LANGUAGE_TAG = "hi";

/** Compare letters, not encodings: NFC, no spaces, no dandas. */
function norm(s: string): string {
  return (s ?? "").normalize("NFC").replace(/[\s।॥]/g, "");
}

/**
 * Turn ML Kit's ranked candidates into the {text, confidence} the server
 * grades.
 *
 * ML Kit gives NO score for its text models: Google's guide says "Only shape
 * classifiers provide scores", and the native module maps the missing score
 * to 0. The server marks a letter correct only at confidence >= 0.80, so
 * passing the raw score through would grade every attempt "unsure", drawn
 * correctly or not. Confidence is derived from where the target letter sits
 * in the ranked list instead:
 *   - top candidate is the target  -> 0.92 (correct)
 *   - target is 2nd or 3rd         -> 0.70 (below the floor: unsure)
 *   - otherwise                    -> 0.40 (below the wrong floor: unsure)
 * A mismatch is never confident enough to be graded "wrong", which keeps the
 * abstention rule: when the recogniser and the learner disagree, the
 * recogniser is the one that yields.
 */
export function confidenceFromCandidates(
  candidates: { text: string }[] | null | undefined,
  target: string,
): { text: string; confidence: number } | null {
  const list = (candidates ?? []).map((c) => norm(c.text)).filter(Boolean);
  if (list.length === 0) return null;
  const want = norm(target);
  const at = want ? list.indexOf(want) : -1;
  if (at === 0) return { text: want, confidence: 0.92 };
  if (at > 0 && at < 3) return { text: want, confidence: 0.7 };
  return { text: list[0], confidence: 0.4 };
}

function makeStatus(initial: InkStatus) {
  let status = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => status,
    set(next: InkStatus) {
      if (next === status) return;
      status = next;
      listeners.forEach((l) => l());
    },
    subscribe(l: () => void) {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
  };
}

/**
 * The local template matcher. Verifies the copy against the reference the
 * canvas pushes via setReference: returns the reference text with a
 * similarity confidence, or an empty abstention that the server grades
 * `unsure`. Never names a different letter, never transmits.
 */
function matcherAdapter(): InkRecogniser {
  let refText = "";
  let refPaths: StrokePath[] = [];
  const st = makeStatus("ready");
  return {
    getStatus: st.get,
    subscribe: st.subscribe,
    prepare() {},
    setReference(devanagari, paths) {
      refText = devanagari;
      refPaths = paths ?? [];
    },
    async recognise(strokes) {
      if (strokes.length === 0) return null;
      if (!refText || refPaths.length === 0) return { text: "", confidence: 0 };
      const m = matchWriting(strokes, refPaths);
      if (!m) return { text: "", confidence: 0 };
      return { text: refText, confidence: m.confidence };
    },
  };
}

type LocalModule = {
  downloadModel: (languageTag: string) => Promise<boolean>;
  recognize: (
    languageTag: string,
    strokes: { x: number; y: number }[][],
  ) => Promise<{ text: string; score?: number }[]>;
};

/**
 * The native adapter: `shabd-digital-ink`, a small Expo module in
 * mobile/modules/ wrapping the ML Kit Digital Ink API. It takes OUR strokes,
 * so the canvas, the gesture stack and the §2.16 contract stay untouched:
 * points in, {text, confidence} out, nothing transmitted. Keep it that way.
 */
function localAdapter(mod: LocalModule): InkRecogniser {
  const st = makeStatus("preparing");
  const matcher = matcherAdapter();
  let refText = "";
  let started = false;
  let modelReady = false;

  return {
    getStatus: st.get,
    subscribe: st.subscribe,
    prepare() {
      if (started) return;
      started = true;
      mod
        .downloadModel(LANGUAGE_TAG)
        .then((ok) => {
          modelReady = !!ok;
        })
        .catch(() => {
          modelReady = false;
          started = false; // the next prepare() (screen open) tries again
        })
        .finally(() => st.set("ready"));
    },
    setReference(devanagari, paths) {
      refText = devanagari;
      matcher.setReference?.(devanagari, paths);
    },
    async recognise(strokes) {
      if (strokes.length === 0) return null;
      if (!modelReady) return matcher.recognise(strokes);
      try {
        // Points pass through in the canvas's 100-unit space; ML Kit works in
        // any consistent coordinate space.
        const out = await mod.recognize(LANGUAGE_TAG, strokes);
        return confidenceFromCandidates(out, refText) ?? matcher.recognise(strokes);
      } catch {
        return matcher.recognise(strokes);
      }
    },
  };
}

export function getInkRecogniser(): InkRecogniser {
  // NOTE: a lazy require() in try/catch is NOT a guard for a native module.
  // Metro's guardedLoadModule reports any error thrown while LOADING a module
  // to ErrorUtils.reportFatalError before the caller's catch can see it, and
  // in a release build that is fatal (Write crash, 2026-10-01). The module's
  // own index.ts uses requireOptionalNativeModule (returns null, never
  // throws), so loading it here is always safe; the isAvailable flag tells us
  // whether the native side is actually linked.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require("shabd-digital-ink");
  if (mod?.isAvailable && mod?.recognize && mod?.downloadModel) {
    return localAdapter(mod);
  }
  return matcherAdapter();
}
