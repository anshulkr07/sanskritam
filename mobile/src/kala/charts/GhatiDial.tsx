// GhatiDial — a clock face of sixty ghatikas that starts at sunrise.
//
// The outer ring is the day and night: sunrise at the top, one turn by the
// next sunrise, sixty marks of 24 minutes each. The inner ring is the
// ghatika now running, one turn in sixty palas. The middle carries the
// count.
//
// One image to a screen reader: the readout under the dial says the same.

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Path, Text as SvgText } from "react-native-svg";

import { onFill } from "../../theme";
import { arcPath, polar } from "./geometry";

interface Props {
  size: number;
  /** Ghatikas since sunrise, with the fraction: 0 to 60. */
  ghatikas: number;
  /** Palas into the running ghatika, with the fraction: 0 to 60. */
  palas: number;
  /** The panel's own colour, to ring the marker with. */
  ground: string;
  /** The middle: the count, and a word under it. */
  count: string;
  caption: string;
  /** The face the count is set in. */
  countFace: { fontFamily?: string; fontWeight?: "400" | "500" | "600" | "700" | "800" };
}

const BASE = "rgba(255,248,238,0.16)";
const TICK = "rgba(255,248,238,0.55)";

export default function GhatiDial({ size, ghatikas, palas, ground, count, caption, countFace }: Props) {
  const c = size / 2;
  const R = c - 38;
  const inner = R - 20;
  const day = Math.max(0, Math.min(60, ghatikas)) * 6;
  const turn = Math.max(0, Math.min(60, palas)) * 6;
  const end = polar(c, c, R, day);

  return (
    <View style={{ width: size, height: size }} accessible={false} importantForAccessibility="no-hide-descendants">
      <Svg width={size} height={size}>
        {Array.from({ length: 60 }, (_, i) => {
          const major = i % 5 === 0;
          const p0 = polar(c, c, R + 9, i * 6);
          const p1 = polar(c, c, R + (major ? 16 : 12), i * 6);
          return <Line key={i} x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y} stroke={TICK} strokeWidth={major ? 1.6 : 1} />;
        })}
        {[0, 15, 30, 45].map((n) => {
          const p = polar(c, c, R + 27, n * 6);
          return (
            <SvgText key={n} x={p.x} y={p.y + 4} fill={onFill.soft} fontSize={11} fontFamily="Nunito_700Bold" fontWeight="700" textAnchor="middle">
              {n}
            </SvgText>
          );
        })}

        <Circle cx={c} cy={c} r={R} fill="none" stroke={BASE} strokeWidth={10} />
        {day > 0.2 && <Path d={arcPath(c, c, R, 0, day)} fill="none" stroke={onFill.gold} strokeWidth={10} />}
        <Circle cx={end.x} cy={end.y} r={8} fill={onFill.text} stroke={ground} strokeWidth={3} />

        <Circle cx={c} cy={c} r={inner} fill="none" stroke={BASE} strokeWidth={5} />
        {turn > 0.2 && <Path d={arcPath(c, c, inner, 0, turn)} fill="none" stroke={onFill.text} strokeWidth={5} strokeLinecap="round" />}
      </Svg>
      <View style={styles.centre}>
        <Text style={[styles.count, countFace]}>{count}</Text>
        <Text style={styles.caption}>{caption}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centre: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center", pointerEvents: "none" },
  count: { fontSize: 46, lineHeight: 60, color: onFill.text },
  caption: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: 12.5, color: onFill.soft, marginTop: -4 },
});
