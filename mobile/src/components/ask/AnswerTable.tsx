// AnswerTable — the table kind: a set of like things to list or compare.
//
// The header row is in the section-head style, rows have hairlines on the
// cream page, a cell with Devanagari is at 18pt or more, and the table
// scrolls horizontally when the columns do not fit. Each row is one
// accessible element whose label joins its cells.

import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import type { AskTable } from "../../api/client";
import { color, font, sanskritText, space } from "../../theme";
import { plain } from "../../utils/text";

const DEVA = /[ऀ-ॿ]/;

export default function AnswerTable({ table }: { table: AskTable }) {
  const cols = table.columns ?? [];
  const rows = table.rows ?? [];
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator
      accessibilityLabel="Answer table"
      style={styles.scroll}
      contentContainerStyle={styles.content}
    >
      <View style={styles.table}>
        {cols.length > 0 && (
          <View style={styles.row}>
            {cols.map((c, i) => (
              <Text key={i} style={[styles.cell, styles.head]}>
                {plain(c)}
              </Text>
            ))}
          </View>
        )}
        {rows.map((row, i) => (
          <View
            key={i}
            style={styles.row}
            accessible
            accessibilityRole="text"
            accessibilityLabel={row.map((c) => plain(c)).join(", ")}
          >
            {row.map((c, j) => {
              const text = plain(c);
              const sa = DEVA.test(text);
              return (
                <Text key={j} style={[styles.cell, sa && styles.cellSa]} selectable={!sa}>
                  {sa ? c : text}
                </Text>
              );
            })}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { marginHorizontal: -16, paddingHorizontal: 16 },
  content: { flexGrow: 1, minWidth: "100%" },
  table: { minWidth: "100%" },
  row: {
    flexDirection: "row",
    gap: space.sm,
    borderBottomWidth: 1,
    borderBottomColor: color.border,
    paddingVertical: 8,
  },
  cell: {
    flex: 1,
    minWidth: 80,
    fontFamily: "Nunito_500Medium",
    fontWeight: "500",
    fontSize: font.sizes.sm,
    color: color.ink,
    lineHeight: 21,
  },
  cellSa: { ...sanskritText(18), color: color.ink },
  head: {
    fontFamily: "Nunito_800ExtraBold",
    fontWeight: "800",
    fontSize: 11,
    color: color.inkSoft,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
});
