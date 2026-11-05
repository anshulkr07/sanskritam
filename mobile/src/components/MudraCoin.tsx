// Mudrā, the app's coin: the flat seal (owner's pick, 2026-11-06), a gold disc
// with one struck ring and ॐ. Drawn, not a picture, so it stays sharp at
// every size; flat, so it reads even at 14 px.

import React from "react";
import { StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import Svg, { Circle, G, Path } from "react-native-svg";

import { T, ui } from "../trail/theme";

export const COIN = { face: "#E9B949", ring: "#B07F12", mark: "#5C3A06" };

// ॐ as the owner approved it on the design canvas: Noto Serif Devanagari Bold
// (SIL Open Font License 1.1), traced to a path so the app needs no extra
// font and every phone draws the same shape. Set at font-size 48, centred on
// x = 50 with its baseline at y = 67, in the coin's 100 x 100 box.
const OM_PATH = "M63.06 62.68L63.06 62.68Q61.28 62.68 59.67 61.91Q58.06 61.14 56.67 59.82Q55.28 58.50 54.22 56.92L54.22 56.92L56.38 55.05Q57.44 56.10 58.54 56.80Q59.65 57.50 61.04 57.50L61.04 57.50Q62.24 57.50 63.13 56.92Q64.02 56.34 64.59 55.36Q65.17 54.38 65.46 53.22Q65.74 52.07 65.74 50.87L65.74 50.87Q65.74 49.62 65.41 48.50Q65.07 47.37 64.40 46.67Q63.73 45.98 62.77 45.98L62.77 45.98Q61.86 45.98 61.14 46.60Q60.42 47.22 59.79 48.21Q59.17 49.19 58.50 50.27Q57.82 51.35 56.98 52.36Q56.14 53.37 54.99 53.99Q53.84 54.62 52.21 54.62L52.21 54.62Q50.19 54.62 48.54 53.70Q46.88 52.79 45.34 51.16L45.34 51.16L46.06 50.15Q46.59 50.39 47.22 50.61Q47.84 50.82 48.51 50.82L48.51 50.82Q50.14 50.82 51.22 50.10Q52.30 49.38 53.10 48.28Q53.89 47.18 54.58 45.90Q55.28 44.63 56.10 43.53Q56.91 42.42 58.04 41.70Q59.17 40.98 60.85 40.98L60.85 40.98Q62.72 40.98 64.40 41.99Q66.08 43 67.38 44.68L67.38 44.68Q68.77 46.41 69.63 48.59Q70.50 50.78 70.50 53.42L70.50 53.42Q70.50 55.96 69.63 58.07Q68.77 60.18 67.11 61.43Q65.46 62.68 63.06 62.68ZM43.95 67.05L43.95 67.05Q40.74 67.05 38.10 65.32Q35.46 63.59 33.34 60.38Q31.23 57.16 29.55 52.60L29.55 52.60L32.43 51.40Q33.73 54.57 35.19 56.78Q36.66 58.98 38.36 60.14Q40.06 61.29 42.13 61.29L42.13 61.29Q44.43 61.29 45.70 60.04Q46.98 58.79 46.98 56.97L46.98 56.97Q46.98 55.58 46.30 54.30Q45.63 53.03 44.29 51.93L44.29 51.93L46.40 51.16Q47.50 51.88 48.34 52.67Q49.18 53.46 49.81 54.38L49.81 54.38Q50.86 55.58 51.39 57.06Q51.92 58.55 51.92 60.04L51.92 60.04Q51.92 62.15 50.89 63.71Q49.86 65.27 48.06 66.16Q46.26 67.05 43.95 67.05ZM41.60 54.71L41.60 54.71L38.67 49.34Q42.94 48.09 44.86 46.70Q46.78 45.30 46.78 44.06L46.78 44.06Q46.78 43.05 46.11 42.59Q45.44 42.14 44.38 42.14L44.38 42.14Q43.14 42.14 41.48 42.69Q39.82 43.24 38.14 44.10L38.14 44.10L35.17 38.39Q36.90 37.53 38.65 37.12Q40.40 36.71 42.03 36.71L42.03 36.71Q43.95 36.71 45.66 37.60Q47.36 38.49 48.75 40.17L48.75 40.17Q49.71 41.37 50.29 42.86Q50.86 44.34 50.86 45.93L50.86 45.93Q50.86 48.86 48.68 50.90Q46.50 52.94 41.60 54.71ZM55.81 37.91L55.81 37.91Q53.07 37.91 50.94 36.76Q48.80 35.61 47.34 33.62Q45.87 31.62 45.10 29.03L45.10 29.03L48.13 27.93Q49.04 30.57 50.65 32.06Q52.26 33.54 54.85 33.54L54.85 33.54Q57.34 33.54 58.90 32.03Q60.46 30.52 61.04 27.40L61.04 27.40L66.37 28.84Q65.84 31.62 64.45 33.66Q63.06 35.70 60.90 36.81Q58.74 37.91 55.81 37.91ZM54.75 31.48L54.75 31.48Q53.60 31.48 52.90 30.83Q52.21 30.18 52.21 28.84L52.21 28.84Q52.21 27.50 52.90 26.85Q53.60 26.20 54.75 26.20L54.75 26.20Q55.90 26.20 56.58 26.85Q57.25 27.50 57.25 28.84L57.25 28.84Q57.25 30.18 56.58 30.83Q55.90 31.48 54.75 31.48Z";

export default function MudraCoin({ size = 20, style }: { size?: number; style?: StyleProp<ViewStyle> }) {
  // The design sets the sign a little larger on small coins, as it did with text.
  const [scale, baseline] = size >= 48 ? [1, 67] : size >= 28 ? [50 / 48, 68] : [54 / 48, 69];
  return (
    <View style={[{ width: size, height: size }, style]} accessible accessibilityLabel="Mudrā">
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Circle cx={50} cy={50} r={48} fill={COIN.face} />
        <Circle cx={50} cy={50} r={40} fill="none" stroke={COIN.ring} strokeWidth={size >= 48 ? 3 : size >= 28 ? 4 : 5} />
        <G transform={`translate(50 ${baseline}) scale(${scale}) translate(-50 -67)`}>
          <Path d={OM_PATH} fill={COIN.mark} />
        </G>
      </Svg>
    </View>
  );
}

/** A Mudrā amount: the coin and the number, e.g. a price or a balance. */
export function MudraAmount({
  amount,
  size = 16,
  textStyle,
  style,
}: {
  amount: number;
  size?: number;
  textStyle?: StyleProp<TextStyle>;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.amount, style]} accessible accessibilityLabel={`${amount} Mudrā`}>
      <MudraCoin size={size} />
      <Text style={[styles.amountText, { fontSize: size }, textStyle]}>{amount.toLocaleString("en-IN")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  amount: { flexDirection: "row", alignItems: "center", gap: 6 },
  amountText: { ...ui("bold"), color: T.ink, fontVariant: ["tabular-nums"] },
});
