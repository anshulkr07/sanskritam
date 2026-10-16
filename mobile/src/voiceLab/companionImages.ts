// Portrait images for the Voice companions.
//
// One square painting per companion, keyed by companion id. Nothing is
// bundled yet, so every companion currently draws the silhouette placeholder
// in CompanionPortrait — the app is never left with an empty box.
//
// To add a face: keep the image square, drop it in mobile/assets/voice/, and
// map it here, e.g.
//   rahul: require("../../assets/voice/rahul.png"),
// A companion may also point at a larger remote master through
// ArtworkImage's registry instead; small portraits belong in the bundle.
//
// Keep the portrait a portrait: the name, the role and the words stay real
// app text, set by the screens, never baked into the picture.

import type { ImageSourcePropType } from "react-native";

export const COMPANION_IMAGES: Partial<Record<string, ImageSourcePropType>> = {};

export function companionImage(id: string): ImageSourcePropType | undefined {
  return COMPANION_IMAGES[id];
}
