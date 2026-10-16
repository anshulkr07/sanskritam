import React, { useState } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import { ArtworkImage } from "./ArtworkImage";
import { artworkFit, verseArtworkFor } from "./verseArtwork";

/** Image fitting depends on the page rectangle, never on a device-name/orientation list. */
export default function VerseArtworkBackground({ sourceRef, opacity, onReady }: { sourceRef: string; opacity: number; onReady?: () => void }) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const window = useWindowDimensions();
  const art = verseArtworkFor(sourceRef);
  if (!art || opacity <= 0) return null;
  const variant = Math.min(window.width, window.height) >= 600 ? art.variants.tablet : art.variants.phone;
  return <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill} onLayout={event => setSize(event.nativeEvent.layout)}>
    <ArtworkImage source={variant} resizeMode={artworkFit(size.width, size.height, variant.width, variant.height, art.safeRegion)} accessible={false} onLoadEnd={onReady} style={[StyleSheet.absoluteFill, { opacity }]} />
  </View>;
}
