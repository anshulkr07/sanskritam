// Resolve game image references to bundled assets.
// "learnv2:<asset id>" → the reviewed LearnV2 teaching image (offline-safe,
// no URL needed; require() returns a number RN Image accepts directly);
// anything else is treated as a remote URI.

import { ImageSourcePropType } from "react-native";

import { LEARNV2_ASSETS } from "../../learnv2/assetMap";

export function resolveGameImage(ref: string | undefined | null): ImageSourcePropType | null {
  if (!ref) return null;
  if (ref.startsWith("learnv2:")) {
    const asset = (LEARNV2_ASSETS as Record<string, { source: number } | undefined>)[ref.slice("learnv2:".length)];
    return asset ? (asset.source as unknown as ImageSourcePropType) : null;
  }
  return { uri: ref };
}
