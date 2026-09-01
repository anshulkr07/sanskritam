// Shabd design system tokens.
// Light theme only (the product is light — see DECISIONS; user explicitly
// rejected dark "AI" aesthetics). Duolingo-inspired: warm paper background,
// a single saturated action color, chunky rounded buttons with solid shadow,
// and a calm ink for text. Everything else derives from these tokens.

export const color = {
  // Paper + surface
  bg: "#FFF8EE", // warm paper
  surface: "#FFFFFF",
  surfaceMuted: "#FBEED9",
  border: "#EFE3CE",

  // Brand — saffron (action) and deep ink (text). Saṃskṛta tutor mood.
  saffron: "#E85B25", // primary action
  saffronDeep: "#C74414", // button bottom shadow
  saffronLight: "#FFE3D3", // selected/active tint
  ink: "#3B2E25", // near-black warm text
  inkSoft: "#7A6A5C", // secondary text
  inkFaint: "#846F57", // disabled text — darkened from #B4A28E for WCAG AA

  // Semantic (fill values — for backgrounds, large display, icons)
  ok: "#2FA84F",
  okBg: "#E3F6E8",
  warn: "#F0A01F",
  warnBg: "#FDF0D7",
  bad: "#E0453A",
  badBg: "#FDE7E5",
  unsure: "#8E7DF0",
  unsureBg: "#EEEBFE",

  // Semantic text variants — body-size text on paper/bg must use these
  okText: "#25833E",
  warnText: "#9D650B",
  badText: "#D92E22",
  unsureText: "#6F59EC",
  saffronText: "#CA4715",
  goldText: "#99680A",

  // Conversation / accent
  tutor: "#5A7D9A", // tutor bubble (muted blue — human, calm)
  tutorBg: "#EAF1F7",
  learner: "#2FA84F", // learner bubble
  learnerBg: "#E3F6E8",

  // Misc
  gold: "#F2B33D", // streak flame / crowns
  white: "#FFFFFF",
};

export const space = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
};

export const font = {
  /** weights available via the loaded typeface (Nunito). */
  sizes: {
    xs: 12,
    sm: 14,
    base: 16,
    md: 18,
    lg: 22,
    xl: 28,
    xxl: 36,
    display: 46,
  },
  weights: {
    regular: "400",
    semibold: "600",
    bold: "700",
    extrabold: "800",
  },
};

// Devanagari script face — Nunito ships no Devanagari glyphs, so every
// Sanskrit/Hindi string was silently falling back to the OS default font.
// Baloo 2 is Google's rounded Indic family (built for Devanagari) and pairs
// visually with Nunito's roundness. Use `script(weight)` wherever text may
// contain Devanagari.
export const scriptFontFamily = {
  regular: "Baloo2_400Regular",
  medium: "Baloo2_500Medium",
  semibold: "Baloo2_600SemiBold",
  bold: "Baloo2_700Bold",
  extrabold: "Baloo2_800ExtraBold",
} as const;

const SCRIPT_WEIGHT_NUM: Record<keyof typeof scriptFontFamily, "400" | "500" | "600" | "700" | "800"> = {
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
  extrabold: "800",
};

export function script(weight: keyof typeof scriptFontFamily = "semibold") {
  return {
    fontFamily: scriptFontFamily[weight],
    fontWeight: SCRIPT_WEIGHT_NUM[weight],
  };
}

export const shadow = {
  // Chunky "Duolingo button" shadow: solid darker copy of the fill below.
  button: {
    shadowColor: color.saffronDeep,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  card: {
    shadowColor: color.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
};

export type Theme = typeof color;

export default { color, space, radius, font, shadow, script, scriptFontFamily };