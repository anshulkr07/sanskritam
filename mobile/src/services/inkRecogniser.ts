// inkRecogniser.ts — the on-device recogniser seam (U12-2 / §2.16).
//
// OWNER DECISION (2026-09-05): recognition is Google ML Kit Digital Ink — an
// ON-DEVICE model. Cloud Vision is disqualified by §2.16, not competing with
// it. The native module needs a config plugin + dev build; until that lands,
// `getInkRecogniser()` returns the HONEST unavailable adapter and the canvas
// says so, rather than faking a verdict or (worse) shipping strokes to a
// server. Never add a cloud fallback here — that would reverse the owner
// decision the privacy rule encodes.

import type { InkRecogniser } from "../components/writing/WritingCanvas";

/**
 * The ML Kit adapter is wired here when the native module ships:
 *
 *   import { DigitalInkRecognizer } from "@react-native-ml-kit/digital-ink";
 *   const rec = new DigitalInkRecognizer("sa"); // or "hi"
 *   await rec.recognise(strokePoints);
 *
 * The adapter contract is deliberately narrow: points in, {text, confidence}
 * out, nothing transmitted. Keep it that way (§2.16 is an invariant, and
 * routing around on-device recognition for accuracy reverses an owner
 * decision — see §11).
 */
const UNAVAILABLE: InkRecogniser = {
  ready: false,
  statusNote:
    "Handwriting recognition needs a dev build with the on-device ML Kit module. " +
    "The strokes you draw stay on this device and are never uploaded.",
  recognise: async () => null,
};

export function getInkRecogniser(): InkRecogniser {
  try {
    // require (not import) so the app runs in Expo Go / JS bundles where the
    // native module does not exist yet.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mlkit = require("@react-native-ml-kit/digital-ink");
    if (mlkit?.DigitalInkRecognizer) {
      return mlkitAdapter(mlkit);
    }
  } catch {
    // module not present — honest unavailable adapter below
  }
  return UNAVAILABLE;
}

type MlKitModule = {
  DigitalInkRecognizer: new (languageTag: string) => {
    recognize: (points: unknown) => Promise<{ results: { text: string; score: number }[] }>;
    close?: () => void;
  };
};

function mlkitAdapter(mlkit: MlKitModule): InkRecogniser {
  return {
    ready: true,
    statusNote: "",
    async recognise(strokes) {
      try {
        // ML Kit's RN wrapper accepts {points: [{x, y}], ...} stroke objects.
        const ink = strokes.map((points) => ({
          points: points.map((p) => ({ x: p.x, y: p.y })),
        }));
        const rec = new mlkit.DigitalInkRecognizer("hi"); // Devanagari model
        const out = await rec.recognize(ink);
        rec.close?.();
        const best = out?.results?.[0];
        if (!best) return null;
        return { text: best.text, confidence: best.score ?? 0 };
      } catch {
        return null;
      }
    },
  };
}
