// Sanskritam design system tokens.
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
//
// NOTE: Baloo 2 is a DISPLAY face. It is right for headings, counters and
// chips, and wrong for a paragraph of Sanskrit — see `sanskritFace` below,
// which is what Talk uses for the line the learner is meant to read.
export const scriptFontFamily = {
  regular: "Baloo2_400Regular",
  medium: "Baloo2_500Medium",
  semibold: "Baloo2_600SemiBold",
  bold: "Baloo2_700Bold",
  extrabold: "Baloo2_800ExtraBold",
} as const;

// ── Sanskrit body face ───────────────────────────────────────────────────
// Tiro Devanagari Sanskrit, which is drawn specifically for Sanskrit: it
// carries the conjuncts (क्ष्, ज्ञ्, त्र्) and the vowel-sign positioning that
// a rounded UI face like Baloo 2 approximates badly at body size. The owner's
// report was "the fonts they return are very bad", and Baloo 2 set at 16pt
// with a 24pt line box — matras clipping against the line above — is what
// that describes.
//
// Deliberately scoped to Talk for now. `script()` has ~100 call sites across
// the app; swapping the global face is a separate, deliberate change.
// Regular only. The italic is a separate 700 KB file and Sanskrit has no
// italic convention, so App.tsx imports the regular by its exact subpath and
// never loads the italic — naming it here would be a footgun that renders as
// the OS fallback mid-paragraph.
export const sanskritFace = {
  regular: "TiroDevanagariSanskrit_400Regular",
} as const;

// ── Native-language faces, keyed by the `native_script` the server sends ──
// Registered lazily by services/scriptFonts.ts: a learner uses ONE of these,
// and registering ten Indic faces at boot delays the splash for nine nobody
// will see. `undefined` means "the platform's own font", which is a correct
// and complete Noto face for every one of these scripts on both iOS and
// Android — so a script whose face has not finished loading still renders
// properly, it just is not ours yet.
export const nativeScriptFace: Record<string, string | undefined> = {
  devanagari: "NotoSansDevanagari_400Regular",
  kannada: "NotoSansKannada_400Regular",
  telugu: "NotoSansTelugu_400Regular",
  tamil: "NotoSansTamil_400Regular",
  malayalam: "NotoSansMalayalam_400Regular",
  bengali: "NotoSansBengali_400Regular",
  gujarati: "NotoSansGujarati_400Regular",
  gurmukhi: "NotoSansGurmukhi_400Regular",
  oriya: "NotoSansOriya_400Regular",
  latin: undefined,
};

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

/**
 * The face for a line of Sanskrit the learner is meant to READ — not a chip,
 * not a counter. Pairs with a generous line height: Devanagari needs vertical
 * room above the baseline for its matras and below it for its conjuncts, and
 * the default ~1.2x line box clips both.
 */
export function sanskritText(size: number = font.sizes.lg) {
  return {
    fontFamily: sanskritFace.regular,
    fontSize: size,
    lineHeight: Math.round(size * 1.75),
  };
}

/**
 * The face for the learner's own language, whichever script the server said
 * it was. Falls back to the platform font, which renders every script we
 * support correctly — so this is never blank, only sometimes not ours yet.
 */
export function nativeText(scriptKey: string, size: number = font.sizes.md) {
  return {
    fontFamily: nativeScriptFace[scriptKey],
    fontSize: size,
    lineHeight: Math.round(size * 1.65),
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