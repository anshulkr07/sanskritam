// Read and Audio share Learn's look (paper, ink, one action colour, square
// corners; Mukta for the interface, Tiro for Sanskrit). Audio adds each
// book's deep cover colour as a ground, always with cream type on it, never
// ink. Softer cream and gold are used only where they still hold 4.5:1 on
// that ground (computed below, WCAG formula); otherwise text stays full cream.

export { T, ui, sa } from "../trail/theme";

export const CREAM = "#FFF8EE";
export const GOLD = "#F2C879";
/** Tracks and hairlines on a cover colour; never text. */
export const CREAM_FAINT = "rgba(255,248,238,0.22)";

type RGB = [number, number, number];

function rgb(hex: string): RGB {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB;
}

function luminance([r, g, b]: RGB): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contrast(a: RGB, b: RGB): number {
  const x = luminance(a);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

const cache = new Map<string, { soft: string; accent: string }>();

function tones(fill: string): { soft: string; accent: string } {
  const hit = cache.get(fill);
  if (hit) return hit;
  const bg = rgb(fill);
  const cream = rgb(CREAM);
  // The lightest cream tint that still reads at 4.5:1 (0.82 on deep grounds).
  let soft = CREAM;
  for (const a of [0.82, 0.88, 0.94]) {
    const mixed = cream.map((c, i) => c * a + bg[i] * (1 - a)) as RGB;
    if (contrast(mixed, bg) >= 4.5) {
      soft = `rgba(255,248,238,${a})`;
      break;
    }
  }
  const accent = contrast(rgb(GOLD), bg) >= 4.5 ? GOLD : CREAM;
  const out = { soft, accent };
  cache.set(fill, out);
  return out;
}

/** Secondary text on a cover colour: a softer cream where it still passes. */
export function softOn(fill: string): string {
  return tones(fill).soft;
}

/** Small labels and the sounding word on a cover colour: gold where it
 *  passes, else cream (an underline then does the marking). */
export function accentOn(fill: string): string {
  return tones(fill).accent;
}
