// photoRecogniser.ts — the on-device OCR seam for paper handwriting (U12-4).
//
// OWNER DECISION (2026-09-05): photographed handwriting is read by ML Kit
// Text Recognition v2 — an ON-DEVICE model. Cloud Vision is disqualified by
// §2.16, not competing with it. Same contract as inkRecogniser.ts: the native
// module needs a config plugin + dev build; until that lands,
// `getPhotoRecogniser()` returns the HONEST unavailable adapter and the
// capture UI says so, rather than faking a verdict or uploading the photo.
// Never add a cloud fallback here — that would reverse the owner decision.

export interface PhotoRecogniser {
  ready: boolean;
  statusNote: string;
  /** Read one photo. Returns null when unreadable — the caller treats that
   *  as `unsure`, never as failure (P20-4 biases hard toward unsure). */
  recognise: (imageUri: string) => Promise<{ text: string; confidence: number } | null>;
}

/**
 * The ML Kit adapter is wired to `@react-native-ml-kit/text-recognition`
 * (installed, on-device Text Recognition v2) with the Devanagari script.
 * Needs a dev build (native linking + prebuild); in Expo Go the native
 * module is absent and this returns UNAVAILABLE below.
 *
 * The adapter contract is deliberately narrow: a uri in, {text, confidence}
 * out, image discarded by the caller immediately after. Nothing transmitted.
 * Keep it that way (§2.16, §11).
 */
const UNAVAILABLE: PhotoRecogniser = {
  ready: false,
  statusNote:
    "Reading from paper needs a dev build with the on-device text module. " +
    "On-device photo reading is not available in this build.",
  recognise: async () => null,
};

export function getPhotoRecogniser(): PhotoRecogniser {
  try {
    // require (not import) so the app runs where the native module does not
    // exist yet. Must be a STATIC literal require — Metro/Expo's bundler
    // statically resolves require() and rejects a dynamic require(name) at
    // build time (same seam pattern as inkRecogniser.ts).
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { NativeModules } = require("react-native");
    // No native linking (Expo Go / web) — honest unavailable adapter.
    // The module's JS proxy throws a linking error on call, so gate on the
    // native module's presence instead of letting `ready` lie.
    if (!NativeModules?.TextRecognition) return UNAVAILABLE;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require("@react-native-ml-kit/text-recognition");
    const TR = mod?.default ?? mod;
    const script = mod?.TextRecognitionScript?.DEVANAGARI ?? "Devanagari";
    if (TR?.recognize && typeof TR.recognize === "function") {
      return {
        ready: true,
        statusNote: "",
        async recognise(imageUri: string) {
          try {
            // On-device OCR, Devanagari script. The result carries no
            // confidence, so report a neutral 0.5 and let the server bias
            // the photo path toward unsure (P20-4).
            const out = await TR.recognize(imageUri, script);
            const text =
              typeof out?.text === "string" ? out.text.trim() : "";
            if (!text) return null;
            return { text, confidence: 0.5 };
          } catch {
            return null;
          }
        },
      };
    }
    const adapter = ocrAdapter(mod);
    if (adapter) return adapter;
  } catch {
    // module not present or native not linked — honest unavailable adapter
  }
  return UNAVAILABLE;
}

function ocrAdapter(mod: unknown): PhotoRecogniser | null {
  if (!mod || typeof mod !== "object") return null;
  const m = mod as Record<string, unknown>;
  // Accept several export shapes; all must be on-device per the module docs.
  const fn =
    (typeof m.recognize === "function" && (m.recognize as (...a: unknown[]) => unknown)) ||
    (typeof m.recognise === "function" && (m.recognise as (...a: unknown[]) => unknown)) ||
    (typeof m.default === "function" && (m.default as (...a: unknown[]) => unknown)) ||
    null;
  if (!fn) return null;
  return {
    ready: true,
    statusNote: "",
    async recognise(imageUri: string) {
      try {
        const out = (await fn(imageUri)) as
          | { text?: string; confidence?: number; blocks?: { text?: string }[] }
          | { text?: string; confidence?: number; blocks?: { text?: string }[] }[]
          | null;
        if (!out) return null;
        const first = Array.isArray(out) ? out[0] : out;
        if (!first) return null;
        const text =
          (typeof first.text === "string" && first.text.trim()) ||
          (Array.isArray(first.blocks)
            ? first.blocks.map((b) => b?.text ?? "").join(" ").trim()
            : "");
        if (!text) return null;
        const confidence =
          typeof first.confidence === "number" ? first.confidence : 0.5;
        return { text, confidence };
      } catch {
        return null;
      }
    },
  };
}
