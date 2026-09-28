// inkRecogniser.ts — the on-device recogniser seam (U12-2 / §2.16).
//
// OWNER DECISION (2026-09-05): recognition is Google ML Kit Digital Ink — an
// ON-DEVICE model. Cloud Vision is disqualified by §2.16, not competing with
// it. Two tiers, both on-device, never a cloud fallback (that would reverse
// the owner decision the privacy rule encodes):
//   1. The native module (dev build) classifies open handwriting.
//   2. Until that lands — Expo Go, web, iOS — the local template fallback
//      (strokeMatcher.ts) verifies the copy against the authored P20-2
//      paths. It can only ever answer the reference letter or abstain, so
//      the server grades correct-or-unsure, never wrong.

import type { InkRecogniser } from "../components/writing/WritingCanvas";
import type { StrokePath } from "../api/client";
import { matchWriting } from "./strokeMatcher";

/**
 * The local adapter is wired here: `shabd-digital-ink`, a small Expo module
 * in mobile/modules/ wrapping the native ML Kit Digital Ink API directly.
 * A community package was vetted first (2026-09-15) and rejected — every
 * published RN wrapper owns its own drawing-pad view and exposes
 * `recognize()` with no stroke args, which would force rewriting
 * WritingCanvas around it. The local module takes OUR strokes, so the
 * canvas, the Skia/gesture stack, and the §2.16 contract stay untouched:
 *
 *   const out = await recognize("hi", strokes); // [{text, score}]
 *
 * The adapter contract is deliberately narrow: points in, {text, confidence}
 * out, nothing transmitted. Keep it that way (§2.16 is an invariant, and
 * routing around on-device recognition for accuracy reverses an owner
 * decision — see §11).
 */
/**
 * Tier 2: the local template fallback. Verifies the copy against the
 * reference the canvas pushes via setReference — returns the reference text
 * with a similarity confidence, or an empty abstention that the server
 * grades `unsure`. Never names a different letter, never transmits.
 */
function matcherAdapter(): InkRecogniser {
  let refText = "";
  let refPaths: StrokePath[] = [];
  return {
    ready: true,
    statusNote: "",
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

// Devanagari model for ML Kit Digital Ink (Downloadable model, fetched on
// first use via Play Services, then fully offline).
const LANGUAGE_TAG = "hi";

export function getInkRecogniser(): InkRecogniser {
  try {
    // require (not import) so the app runs in Expo Go / JS bundles where the
    // native module does not exist yet: src/index.ts calls
    // requireNativeModule at load, which throws there — caught below.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require("shabd-digital-ink");
    if (mod?.recognize && mod?.downloadModel) {
      return localAdapter(mod);
    }
  } catch {
    // module not present or native not linked — local fallback below
  }
  return matcherAdapter();
}

type LocalModule = {
  downloadModel: (languageTag: string) => Promise<boolean>;
  recognize: (
    languageTag: string,
    strokes: { x: number; y: number }[][],
  ) => Promise<{ text: string; score?: number }[]>;
};

function localAdapter(mod: LocalModule): InkRecogniser {
  // The model downloads once (network) then works offline. First use kicks
  // the download and reports no attempt — the learner just taps Check again.
  let model: "unknown" | "downloading" | "ready" | "failed" = "unknown";
  return {
    ready: true,
    statusNote: "",
    async recognise(strokes) {
      if (strokes.length === 0) return null;
      if (model === "failed") return null;
      if (model !== "ready") {
        if (model !== "unknown") return null; // download in flight
        model = "downloading";
        try {
          model = (await mod.downloadModel(LANGUAGE_TAG)) ? "ready" : "failed";
        } catch {
          model = "failed";
        }
        if (model !== "ready") return null;
      }
      try {
        // Points pass through in the canvas VIEW=100 space — ML Kit works
        // in any consistent coordinate space.
        const out = await mod.recognize(LANGUAGE_TAG, strokes);
        const best = out?.[0];
        if (!best?.text) return null;
        return {
          text: best.text,
          confidence: typeof best.score === "number" ? best.score : 0,
        };
      } catch {
        return null;
      }
    },
  };
}
