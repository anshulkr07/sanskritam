// Sanskritam design system tokens.
// Warm paper background, saffron for action and the brand, a calm ink for
// text, and an accent family (teal, sage, rose, gold, slate) for categories
// and hero cards. Everything else derives from these.
//
// Light and dark (owner, 2026-10-20: "an app wise dark mode for every
// component and page"). The exported objects below are the live palette.
// src/Boot.tsx reads the learner's choice and calls applyScheme() BEFORE
// App.tsx and its screens are first required, so every module-level
// StyleSheet already holds the right colours; changing the choice in
// Settings restarts the JS (services/colorScheme.ts). Never cache a token in
// a module that Boot imports, or it keeps the light value.
//
// Dark is the same warm family at night: brown-black paper (#17130F, the
// Learn course's dark paper), cream ink, lighter accent text. The deep fills
// with cream text keep their colour in both. Dark values were checked with
// the WCAG formula: every text token is >= 4.5:1 on bg, surface and
// surfaceMuted; every accent fg >= 4.5:1 on bg and on its own tile.

export type SchemeName = "light" | "dark";

const LIGHT_COLOR = {
  // Paper + surface
  bg: "#FFF8EE", // warm paper
  surface: "#FFFFFF",
  surfaceMuted: "#FBEED9",
  border: "#EFE3CE",

  // Brand: saffron (action) and deep ink (text). Matches the app icon.
  saffron: "#E85B25", // brand, icons, tab tint
  saffronBtn: "#D2461F", // fill behind white text (4.53:1; #E85B25 is 3.53:1)
  saffronDeep: "#C74414", // shadow colour for saffron fills
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
  tutorText: "#3F627F", // tutor body text on paper (6.1:1; #5A7D9A is 4.12:1)
  tutorBg: "#EAF1F7",
  learner: "#2FA84F", // learner bubble
  learnerBg: "#E3F6E8",

  // Misc
  gold: "#F2B33D", // streak flame / crowns
  white: "#FFFFFF", // text and icons on fills; never a page or card ground
};

const DARK_COLOR: typeof LIGHT_COLOR = {
  bg: "#17130F",
  surface: "#221C17",
  surfaceMuted: "#2B231D",
  border: "#3A3029",
  saffron: "#F07A45",
  saffronBtn: "#D2461F",
  saffronDeep: "#000000",
  saffronLight: "#3A2418",
  ink: "#F3EADB",
  inkSoft: "#CDBFAA",
  inkFaint: "#A89886",
  ok: "#4E9E6C",
  okBg: "#1C2A20",
  warn: "#F0A01F",
  warnBg: "#2E2410",
  bad: "#E8594E",
  badBg: "#331A17",
  unsure: "#9C8DF2",
  unsureBg: "#24203A",
  okText: "#7CC79A",
  warnText: "#E8B04A",
  badText: "#F08A80",
  unsureText: "#B3A6F7",
  saffronText: "#F0956A",
  goldText: "#E3B85C",
  tutor: "#7E9DB8",
  tutorText: "#A9C2D8",
  tutorBg: "#1D2731",
  learner: "#4E9E6C",
  learnerBg: "#1C2A20",
  gold: "#F2B33D",
  white: "#FFFFFF",
};

export const color = { ...LIGHT_COLOR };

// ── Accent family ────────────────────────────────────────────────────────
// One accent per card or category, never a rainbow inside one card.
//   fg    text or icon on `bg` or on paper (>= 4.6:1 on both)
//   bg    a pale tint for tiles (a dark tint in dark)
//   from/to  a gradient for white text; BOTH stops are >= 4.5:1 against white,
//            so text can sit anywhere on the card. Run scripts/check-contrast.mjs
//            after touching any value here.
type Accent = { fg: string; bg: string; from: string; to: string };
const LIGHT_ACCENT = {
  saffron: { fg: "#B23D10", bg: "#FFE3D3", from: "#D2461F", to: "#B23D10" },
  teal: { fg: "#1F6E73", bg: "#DDEFEE", from: "#1F7A7C", to: "#17535C" },
  sage: { fg: "#44703F", bg: "#E5EEDC", from: "#4A7F44", to: "#35603C" },
  rose: { fg: "#AE3F5A", bg: "#F9E1E5", from: "#C04D6E", to: "#962F4E" },
  gold: { fg: "#8E6108", bg: "#FBEFD2", from: "#9F640D", to: "#8A5608" },
  slate: { fg: "#3C5A8E", bg: "#E3E9F4", from: "#4F6AA3", to: "#2F4677" },
} satisfies Record<string, Accent>;
const DARK_ACCENT: Record<keyof typeof LIGHT_ACCENT, Accent> = {
  saffron: { fg: "#F0956A", bg: "#3A2418", from: "#D2461F", to: "#B23D10" },
  teal: { fg: "#7CC4C4", bg: "#15302F", from: "#1F7A7C", to: "#17535C" },
  sage: { fg: "#9CC48F", bg: "#1E2B1C", from: "#4A7F44", to: "#35603C" },
  rose: { fg: "#E68DA3", bg: "#341A22", from: "#C04D6E", to: "#962F4E" },
  gold: { fg: "#E3B85C", bg: "#33280F", from: "#9F640D", to: "#8A5608" },
  slate: { fg: "#9DB2DD", bg: "#1C2436", from: "#4F6AA3", to: "#2F4677" },
};
export const accent: Record<keyof typeof LIGHT_ACCENT, Accent> = {
  saffron: { ...LIGHT_ACCENT.saffron },
  teal: { ...LIGHT_ACCENT.teal },
  sage: { ...LIGHT_ACCENT.sage },
  rose: { ...LIGHT_ACCENT.rose },
  gold: { ...LIGHT_ACCENT.gold },
  slate: { ...LIGHT_ACCENT.slate },
};

export type AccentName = keyof typeof accent;

/** Deep solid fills. Text on them is onFill.text.
 *
 * October 2026 look rule: a coloured surface is a deep solid fill with cream
 * text on it. Never use accent.*.bg, color.saffronLight, color.tutorBg,
 * color.learnerBg, color.okBg, color.unsureBg, color.warnBg or
 * color.surfaceMuted as the background of a card, panel, bubble, tile, chip
 * or button. Plain content sits directly on the cream page.
 */
const LIGHT_FILL = {
  saffron: "#B23D10",
  teal: "#17535C",
  sage: "#35603C",
  rose: "#962F4E",
  gold: "#8A5608",
  slate: "#2F4677",
  ink: "#3B2E25",
  maroon: "#5E2216",
  ok: "#25833E",
  bad: "#B3261E",
};
// Same fills at night, except ink: #3B2E25 is nearly the dark paper, so it
// lifts a step (cream on it is still 11:1).
const DARK_FILL: typeof LIGHT_FILL = { ...LIGHT_FILL, ink: "#40342B" };
export const fill = { ...LIGHT_FILL };
export type FillName = keyof typeof fill;
export const FILL_CYCLE: FillName[] = ["saffron", "teal", "sage", "rose", "gold", "slate"];
export const fillAt = (i: number): FillName => FILL_CYCLE[((i % 6) + 6) % 6];
export const onFill = {
  text: "#FFF8EE",
  soft: "rgba(255,248,238,0.78)",
  faint: "rgba(255,248,238,0.20)", // watermark letters, progress tracks
  gold: "#F2C879", // small labels; NOT on saffron, gold or ok fills (see table)
} as const;
/** 1.5dp outline for inputs and outlined buttons on paper. */
export let outline = "#D9C9AE";

/** Units take these in turn, so neighbours never share a colour. */
export const ACCENT_CYCLE: AccentName[] = ["saffron", "teal", "sage", "rose", "gold", "slate"];

/** The i-th accent in the cycle, for lists (units, tiles). */
export function accentAt(i: number): AccentName {
  return ACCENT_CYCLE[((i % ACCENT_CYCLE.length) + ACCENT_CYCLE.length) % ACCENT_CYCLE.length];
}

/** [from, to] for expo-linear-gradient. */
export function gradientOf(name: AccentName): [string, string] {
  return [accent[name].from, accent[name].to];
}

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
  // A soft lift under filled buttons. The old solid under-shadow (a hard
  // darker copy of the fill) read as template UI, so buttons are flat now.
  button: {
    shadowColor: LIGHT_COLOR.saffronDeep,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 3,
  },
  card: {
    shadowColor: LIGHT_COLOR.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
};

export type Theme = typeof color;

// ── Scheme ───────────────────────────────────────────────────────────────

let current: SchemeName = "light";

/** True when the app was started dark. Stable for the life of the JS. */
export function isDarkScheme(): boolean {
  return current === "dark";
}

/**
 * Swap the live palette. Boot calls it once, before any screen module is
 * required; calling it later changes inline styles only, never the
 * StyleSheets already made, so the app restarts instead (colorScheme.ts).
 */
export function applyScheme(name: SchemeName): void {
  current = name;
  const dark = name === "dark";
  Object.assign(color, dark ? DARK_COLOR : LIGHT_COLOR);
  const accents = dark ? DARK_ACCENT : LIGHT_ACCENT;
  for (const key of Object.keys(accent) as AccentName[]) Object.assign(accent[key], accents[key]);
  Object.assign(fill, dark ? DARK_FILL : LIGHT_FILL);
  outline = dark ? "#4A3E34" : "#D9C9AE";
  shadow.button.shadowColor = dark ? "#000000" : LIGHT_COLOR.saffronDeep;
  shadow.button.shadowOpacity = dark ? 0.35 : 0.18;
  shadow.card.shadowColor = dark ? "#000000" : LIGHT_COLOR.ink;
  shadow.card.shadowOpacity = dark ? 0.3 : 0.06;
}

export default { color, accent, space, radius, font, shadow, script, scriptFontFamily };