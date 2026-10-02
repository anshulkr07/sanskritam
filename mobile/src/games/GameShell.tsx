// GameShell: top row with close, progress/time bar and number; score and combo row.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { color, font, space } from "../theme";

export default function GameShell({
  title,
  progress,
  progressLabel,
  score,
  combo,
  onClose,
  children,
}: {
  title: string;
  progress: number;
  progressLabel: string;
  score: number;
  combo?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.root}>
      <View style={styles.top}>
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={`Close ${title}`} style={styles.close}>
          <Ionicons name="close" size={24} color={color.ink} />
        </Pressable>
        <View style={styles.barWrap}>
          <View style={styles.bar}>
            <View style={[styles.barFill, { width: `${Math.max(0, Math.min(1, progress)) * 100}%` }]} />
          </View>
          <Text style={styles.barLabel}>{progressLabel}</Text>
        </View>
      </View>
      <View style={styles.scoreRow}>
        <Text style={styles.score}>{score}</Text>
        {!!combo && <Text style={styles.combo}>{combo}</Text>}
      </View>
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg, paddingHorizontal: 16, paddingTop: 12, gap: 8 },
  top: { flexDirection: "row", alignItems: "center", gap: space.sm },
  close: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  barWrap: { flex: 1, gap: 2 },
  bar: { height: 8, borderRadius: 4, backgroundColor: color.border, overflow: "hidden" },
  barFill: { height: 8, backgroundColor: color.saffronBtn },
  barLabel: { fontSize: 12, color: color.inkSoft, fontWeight: "600" },
  scoreRow: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  score: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 28, color: color.ink },
  combo: { fontSize: 14, color: color.saffronText, fontWeight: "700" },
  body: { flex: 1, gap: 12 },
});
