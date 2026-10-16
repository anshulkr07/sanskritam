import type { ImageURISource } from "react-native";
import manifest from "./remoteManifest.json";

type ArtworkEntry = { uri: string; width: number; height: number; bytes: number };
const entries = manifest as Record<string, ArtworkEntry>;

/** Public, content-versioned artwork. No image bytes are bundled by this registry. */
export function remoteArtwork(key: string): ImageURISource {
  const entry = entries[key];
  if (!entry) throw new Error(`Missing artwork manifest entry: ${key}`);
  return { uri: entry.uri, width: entry.width, height: entry.height };
}

export const artworkOrigin = Object.values(entries)[0]?.uri.split("/art/")[0] ?? "";
