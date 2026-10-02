// Which face a calendar string is set in, by the script it is written in.

import type { TextStyle } from "react-native";

import { nativeScriptFace, sanskritFace, script } from "../theme";
import type { TextScript } from "./today";

export function faceFor(s: TextScript): TextStyle {
  switch (s) {
    case "sanskrit":
      // A line of Sanskrit the learner is meant to read.
      return { fontFamily: sanskritFace.regular };
    case "devanagari":
      // A Devanagari label or number.
      return script("semibold");
    case "roman":
      return { fontFamily: "Nunito_800ExtraBold", fontWeight: "800" };
    default:
      // The learner's own script: registered on demand, the platform's face
      // until then (services/scriptFonts.ts).
      return { fontFamily: nativeScriptFace[s] };
  }
}

/** True for the four scripts whose faces are registered on demand. */
export function isRegionalScript(s: TextScript): s is "gujarati" | "tamil" | "malayalam" | "bengali" {
  return s === "gujarati" || s === "tamil" || s === "malayalam" || s === "bengali";
}
