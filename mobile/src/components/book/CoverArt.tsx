// CoverArt: a painted cover when the book has one, otherwise a vector cover.
// Painted covers exist as 600x900 webp in assets/covers (2:3). The frame ends
// at 71% height; the lower 29% is empty ground carrying the Devanagari title.

import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Path, Rect } from "react-native-svg";

import { coverColour, coverForeground, paintedCover } from "./covers";
import { useTypeScale } from "../../hooks/useTypeScale";
import { script } from "../../theme";

export default function CoverArt({
  bookKey,
  titleSa,
  width = 104,
}: {
  bookKey: string;
  titleSa: string;
  width?: number;
}) {
  const { sized } = useTypeScale();
  const height = Math.round((width * 3) / 2);
  const painted = paintedCover(bookKey);
  const colour = coverColour(bookKey);
  const fg = coverForeground(bookKey);
  // The title scales with the cover: 15 at the shelf's 100 wide, smaller on thumbnails.
  const titleSize = sized(Math.max(9, Math.round(width * 0.15)));

  if (painted) {
    // The whole cover is drawn; the title is set on its empty lower ground.
    const groundH = Math.round(height * 0.29);
    return (
      <View style={[styles.box, { width, height, backgroundColor: colour }]}>
        <Image source={painted} style={{ width, height }} resizeMode="cover" accessibilityIgnoresInvertColors />
        <View style={[styles.ground, { height: groundH }]}>
          <Text
            style={[script("bold"), { color: fg, fontSize: titleSize, lineHeight: Math.round(titleSize * 1.45), textAlign: "center", paddingHorizontal: Math.round(width * 0.08) }]}
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
          >
            {titleSa}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.box, { width, height, backgroundColor: colour }]}>
      <View style={styles.spine} />
      <View style={styles.motif}>
        <Svg width={48} height={48} viewBox="0 0 48 48">
          <Circle cx={24} cy={24} r={16} stroke={fg} strokeWidth={2} fill="none" opacity={0.9} />
          <Line x1={24} y1={8} x2={24} y2={16} stroke={fg} strokeWidth={2} />
          <Line x1={24} y1={32} x2={24} y2={40} stroke={fg} strokeWidth={2} />
          <Line x1={8} y1={24} x2={16} y2={24} stroke={fg} strokeWidth={2} />
          <Line x1={32} y1={24} x2={40} y2={24} stroke={fg} strokeWidth={2} />
          <Path d="M18 30 L24 18 L30 30 Z" stroke={fg} strokeWidth={2} fill="none" />
          <Rect x={14} y={34} width={20} height={2} fill={fg} opacity={0.7} />
        </Svg>
      </View>
      <Text
        style={[script("bold"), { color: fg, fontSize: titleSize, lineHeight: Math.round(titleSize * 1.45), textAlign: "center", paddingHorizontal: 8 }]}
        numberOfLines={2}
      >
        {titleSa}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // Square corners, as everywhere in Read and Learn (owner, 2026-10-13).
  box: { overflow: "hidden", position: "relative" },
  ground: { position: "absolute", left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
  spine: { position: "absolute", left: 0, top: 0, bottom: 0, width: 8, backgroundColor: "rgba(0,0,0,0.22)" },
  motif: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 12 },
});
