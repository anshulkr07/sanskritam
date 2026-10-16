// Resolve reviewed teaching artwork through the shared remote asset registry.

import { ImageSourcePropType } from "react-native";

import { LEARNV2_ASSETS } from "../../learnv2/assetMap";

export function resolveGameImage(ref: string | undefined | null): ImageSourcePropType | null {
  if (!ref) return null;
  if (ref.startsWith("learnv2:")) {
    const asset = (LEARNV2_ASSETS as Record<string, { source: ImageSourcePropType } | undefined>)[ref.slice("learnv2:".length)];
    return asset?.source ?? null;
  }
  return { uri: ref };
}
