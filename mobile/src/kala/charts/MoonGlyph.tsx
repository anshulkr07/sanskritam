// MoonGlyph — a small Moon at a given angle from the Sun.

import React from "react";
import { View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

import { litPath } from "../moonShape";

interface Props {
  /** The Moon's angle from the Sun, 0 to 360. */
  elongation: number;
  size: number;
  /** The lit part and the unlit part. */
  lit: string;
  shade: string;
}

export default function MoonGlyph({ elongation, size, lit, shade }: Props) {
  const c = size / 2;
  const r = c - 1;
  return (
    <View style={{ width: size, height: size }} accessible={false} importantForAccessibility="no-hide-descendants">
      <Svg width={size} height={size}>
        <Circle cx={c} cy={c} r={r} fill={shade} />
        <Path d={litPath(elongation, r, c, c)} fill={lit} />
      </Svg>
    </View>
  );
}
