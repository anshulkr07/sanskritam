// The portrait plate on a companion's box.
//
// No portrait paintings are bundled yet, so every companion draws the same
// calm figure instead: a head and shoulders with two quiet halo arcs, in the
// group's own deep colour on paper, or in cream on the group's colour. Add a
// real image in companionImages.ts and it replaces the drawing everywhere,
// at every size, with no other change.

import React from "react";
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

import { fill, onFill } from "../theme";
import { categoryOf, type Companion } from "./companions";
import { companionImage } from "./companionImages";

export default function CompanionPortrait({
  companion,
  size,
  variant = "plate",
  radius,
  style,
}: {
  companion: Companion;
  /** The square's side, in points. */
  size: number;
  /** plate: the group's colour behind a cream figure. medallion: cream behind the group's colour. */
  variant?: "plate" | "medallion";
  /** Corner rounding; by default a square tile with soft corners. */
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const tone = fill[categoryOf(companion).tone];
  const image = companionImage(companion.id);
  const corner = radius ?? (variant === "medallion" ? size / 2 : Math.round(size * 0.24));
  const background = variant === "plate" ? tone : onFill.text;
  const figure = variant === "plate" ? onFill.text : tone;
  const halo = variant === "plate" ? onFill.faint : `${tone}26`;

  return (
    <View
      style={[styles.plate, { width: size, height: size, borderRadius: corner, backgroundColor: background }, style]}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      {image ? (
        <Image source={image} resizeMode="cover" style={StyleSheet.absoluteFill} accessible={false} />
      ) : (
        <Svg width={size} height={size} viewBox="0 0 100 100">
          <Circle cx={50} cy={46} r={40} fill="none" stroke={halo} strokeWidth={3} />
          <Circle cx={50} cy={46} r={29} fill="none" stroke={halo} strokeWidth={2} />
          <Circle cx={50} cy={39} r={15.5} fill={figure} />
          <Path d="M15 100 C 15 78 30 65 50 65 C 70 65 85 78 85 100 Z" fill={figure} />
        </Svg>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  plate: { overflow: "hidden" },
});
