import React, { useState } from "react";
import { Image, StyleSheet, View, type ImageSourcePropType } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

// Decorative paintings never take touches or duplicate a card's accessible label.
export default function PaintedBackground({ source, banner = false }: { source?: ImageSourcePropType; banner?: boolean }) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  if (!source) return null;
  // Fit a 2:1 painting to the banner height, preserving faces in shallow cards.
  // Its quiet left edge meets a dark fill when the card is wider than the art.
  const width = size.height * 2;
  return <View style={[StyleSheet.absoluteFill, banner && { backgroundColor: "#18120C" }]} pointerEvents="none" aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
    onLayout={banner ? event => setSize({ width: event.nativeEvent.layout.width, height: event.nativeEvent.layout.height }) : undefined}>
    <Image source={source} accessible={false} resizeMode="cover" style={[s.image, banner && size.width > 0 && { width, left: size.width - width }]} />
    {banner && width < size.width && <LinearGradient colors={["#18120C", "rgba(24,18,12,0)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ position: "absolute", top: 0, bottom: 0, left: size.width - width, width: 48 }} />}
    {banner ? <LinearGradient colors={["rgba(24,18,12,0.86)", "rgba(24,18,12,0.58)", "rgba(24,18,12,0.10)"]} locations={[0, 0.56, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
      : <LinearGradient colors={["rgba(24,18,12,0.14)", "rgba(24,18,12,0.06)", "rgba(24,18,12,0.82)", "rgba(24,18,12,0.96)"]} locations={[0, 0.32, 0.64, 1]} style={StyleSheet.absoluteFill} />}
  </View>;
}

export function PaintedThumbnail({ source }: { source?: ImageSourcePropType }) {
  return <View style={s.thumb} pointerEvents="none" aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    {source && <Image source={source} accessible={false} resizeMode="cover" style={[s.image, { height: "125%" }]} />}
  </View>;
}
const s = StyleSheet.create({
  image: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%" },
  thumb: { width: 48, height: 48, borderRadius: 10, overflow: "hidden", backgroundColor: "#3B2E25" },
});
