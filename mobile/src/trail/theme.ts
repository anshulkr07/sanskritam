// Learn's look (owner-approved 2026-10-13): paper, ink, one action colour,
// one colour per stage, square corners everywhere (the owner rejected rounded
// buttons). Sanskrit is set in Tiro Devanagari Sanskrit; everything else in
// Mukta, which carries English and Hindi with one set of metrics.
//
// Contrast, computed (WCAG formula) against paper #F8F2E7: ink 14.3, ink2 6.8,
// ink3 4.95, action 5.7, done 4.5 (icons and large text only; small "done"
// text uses doneInk 6.0). White on action 6.4, on done 5.1, on every stage
// colour 6.2 or more.

import { TRAIL } from "./course";

export const T = {
  paper: "#F8F2E7",
  surface: "#FFFCF6",
  line: "#E5D9C6",
  lineStrong: "#D9CCB6",
  ink: "#2A2019",
  ink2: "#5F5245",
  ink3: "#75665A",
  action: "#A63D17",
  done: "#2E7D4F",
  doneInk: "#25683F",
  doneBg: "#EAF3EC",
  wrong: "#B3261E",
  wrongInk: "#9E2219",
  wrongBg: "#FBECEA",
  muted: "#CDBFAA",
  scrim: "rgba(36,26,18,0.48)",
  white: "#FFFFFF",
} as const;

export const F = {
  sa: "TiroDevanagariSanskrit_400Regular",
  regular: "Mukta_400Regular",
  medium: "Mukta_500Medium",
  semibold: "Mukta_600SemiBold",
  bold: "Mukta_700Bold",
} as const;

/** fontFamily + matching fontWeight, so Android never synthesises a weight. */
export function ui(weight: "regular" | "medium" | "semibold" | "bold" = "regular") {
  const w = { regular: "400", medium: "500", semibold: "600", bold: "700" } as const;
  return { fontFamily: F[weight], fontWeight: w[weight] };
}

/** Sanskrit text with room above and below for mātrās and conjuncts. */
export function sa(size: number) {
  return { fontFamily: F.sa, fontWeight: "400" as const, fontSize: size, lineHeight: Math.round(size * 1.6) };
}

export function stageColor(stageId: string): string {
  return TRAIL.find((s) => s.id === stageId)?.color ?? T.action;
}
