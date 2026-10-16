import manifest from "./verseManifest.json";

export type VerseArtworkVariant = { uri: string; width: number; height: number; bytes: number };
export type VerseArtworkEntry = {
  source_ref: string;
  focalPoint: number[];
  safeRegion: { x: number; y: number; width: number; height: number };
  alt: string;
  variants: { phone: VerseArtworkVariant; tablet: VerseArtworkVariant };
};
const entries = manifest as Record<string, VerseArtworkEntry>;

export function verseArtworkFor(ref: string): VerseArtworkEntry | undefined {
  const normalized = ref.normalize("NFC").trim().replace(/\s+/g, " ");
  const exact = entries[normalized];
  if (exact) return exact;
  const isha = /^(?:Īśā Upaniṣad|Isha Upanishad|Ishopanishad)\s+(?:1\.)?(\d+)$/.exec(normalized);
  return isha ? entries[`Īśopaniṣad ${Number(isha[1])}`] : undefined;
}

/** Cover only when its visible rectangle still contains the authored safe region. */
export function artworkFit(width: number, height: number, imageWidth: number, imageHeight: number, safe: VerseArtworkEntry["safeRegion"]): "cover" | "contain" {
  if (width <= 0 || height <= 0 || imageWidth <= 0 || imageHeight <= 0) return "contain";
  const scale = Math.max(width / imageWidth, height / imageHeight);
  const visibleWidth = width / (imageWidth * scale);
  const visibleHeight = height / (imageHeight * scale);
  const left = (1 - visibleWidth) / 2;
  const top = (1 - visibleHeight) / 2;
  return safe.x >= left && safe.y >= top && safe.x + safe.width <= left + visibleWidth && safe.y + safe.height <= top + visibleHeight ? "cover" : "contain";
}
