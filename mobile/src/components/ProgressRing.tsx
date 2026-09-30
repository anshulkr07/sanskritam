// A circular progress ring. Static geometry, no animation: it is read at a
// glance on Home and Progress, and a spinning fill says nothing more.

import React from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { color } from "../theme";

export default function ProgressRing({
  progress,
  size = 64,
  stroke = 7,
  tint = color.saffron,
  track = color.border,
  children,
  style,
}: {
  /** 0..1 */
  progress: number;
  size?: number;
  stroke?: number;
  tint?: string;
  track?: string;
  children?: React.ReactNode;
  style?: ViewStyle;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, progress));
  return (
    <View style={[{ width: size, height: size }, style]}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        {p > 0 && (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={tint}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${c * p} ${c}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        )}
      </Svg>
      <View style={styles.center} pointerEvents="none">
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, alignItems: "center", justifyContent: "center" },
});
