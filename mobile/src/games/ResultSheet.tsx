// ResultSheet: score, best, New best, points, Play again and Done.

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { color, fill, font, onFill, space } from "../theme";
import { haptics } from "../services/haptics";

export default function ResultSheet({
  score,
  best,
  isBest,
  xp,
  onAgain,
  onDone,
}: {
  score: number;
  best: number;
  isBest: boolean;
  xp: number;
  onAgain: () => void;
  onDone: () => void;
}) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Done</Text>
      <Text style={styles.score}>{score}</Text>
      <Text style={styles.best}>
        Best {best}
        {isBest ? " · New best" : ""}
      </Text>
      <Text style={styles.xp}>+{xp} XP</Text>
      <View style={styles.row}>
        <Pressable
          onPress={() => {
            haptics.tap();
            onAgain();
          }}
          accessibilityRole="button"
          accessibilityLabel="Play again"
          style={styles.primary}
        >
          <Text style={styles.primaryText}>Play again</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            haptics.tap();
            onDone();
          }}
          accessibilityRole="button"
          accessibilityLabel="Done"
          style={styles.secondary}
        >
          <Text style={styles.secondaryText}>Done</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: fill.ink, borderRadius: 16, padding: space.lg, gap: 8, alignItems: "center" },
  title: { color: onFill.text, fontWeight: "800", fontSize: font.sizes.md },
  score: { color: onFill.text, fontWeight: "800", fontSize: 44 },
  best: { color: onFill.soft, fontSize: 14 },
  xp: { color: onFill.gold, fontWeight: "800", fontSize: 16 },
  row: { flexDirection: "row", gap: 8, marginTop: 8 },
  primary: { backgroundColor: color.saffronBtn, borderRadius: 12, minHeight: 48, paddingHorizontal: 20, justifyContent: "center" },
  primaryText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  secondary: { borderWidth: 1.5, borderColor: onFill.text, borderRadius: 12, minHeight: 48, paddingHorizontal: 20, justifyContent: "center" },
  secondaryText: { color: onFill.text, fontWeight: "700", fontSize: 16 },
});
