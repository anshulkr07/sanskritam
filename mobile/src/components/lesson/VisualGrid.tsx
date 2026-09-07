// VisualGrid — the U14-2 `grid` renderer: a declension table or a varṇa
// matrix, rendered PRESENTATIONALLY from the backend's pre-computed
// `visual_data` (P22-1). The client never derives forms — every cell is
// display text. Cells are tappable: tapping opens the ask-anywhere sheet
// with the cell as subject (tap a cell → ask-anywhere, U14-2).

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAsk } from "../../ask/AskProvider";
import { color, font, radius, script, space } from "../../theme";

export interface GridData {
  kind?: string;
  columns?: string[];
  rows?: string[][];
  highlight?: string;
  stem?: string;
}

export default function VisualGrid({ data }: { data: GridData }) {
  const { open } = useAsk();
  const columns = data.columns ?? [];
  const rows = data.rows ?? [];
  if (rows.length === 0) return null;
  return (
    <View style={styles.wrap} accessible accessibilityLabel="Inflection grid">
      {columns.length > 0 && (
        <View style={styles.row}>
          <View style={styles.corner} />
          {columns.map((c) => (
            <View key={c} style={styles.headCell}>
              <Text style={styles.headText} numberOfLines={2}>
                {c}
              </Text>
            </View>
          ))}
        </View>
      )}
      {rows.map((row, i) => (
        <View key={i} style={styles.row}>
          {row.map((cell, j) => {
            const hot = data.highlight === cell;
            return (
              <Pressable
                key={`${i}-${j}`}
                onPress={() => open({ surface: "lesson", subject: cell })}
                style={[styles.cell, hot && styles.cellHot]}
                accessibilityRole="button"
                accessibilityLabel={`${cell}. Ask about this form.`}
              >
                <Text style={[styles.cellText, script("bold"), hot && styles.cellTextHot]}>
                  {cell}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: space.md },
  row: { flexDirection: "row", gap: 6, marginBottom: 6 },
  corner: { flex: 0, width: 0 },
  headCell: { flex: 1, paddingVertical: 4 },
  headText: {
    fontFamily: "Nunito_700Bold",
    fontWeight: "700",
    fontSize: font.sizes.xs,
    color: color.inkSoft,
    textAlign: "center",
  },
  cell: {
    flex: 1,
    backgroundColor: color.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border,
    paddingVertical: space.sm,
    paddingHorizontal: 4,
    alignItems: "center",
    minHeight: 48,
    justifyContent: "center",
  },
  cellHot: { borderColor: color.saffron, borderWidth: 2, backgroundColor: color.saffronLight },
  cellText: { fontSize: font.sizes.base, color: color.ink, textAlign: "center" },
  cellTextHot: { color: color.saffronDeep },
});
