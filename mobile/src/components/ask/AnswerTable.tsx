// AnswerTable — the table kind: a set of like things to list or compare.
//
// The header row is in the section-head style, rows have hairlines on the
// cream page, a cell with Devanagari is at 18pt or more, and the table
// scrolls horizontally when the columns do not fit. Each row is one
// accessible element whose label joins its cells.

import React, { useState } from "react";
import { LayoutChangeEvent, ScrollView, StyleSheet, Text, View } from "react-native";

import type { AskTable } from "../../api/client";
import { color, font, sanskritText, space } from "../../theme";
import { plain } from "../../utils/text";

const DEVA = /[ऀ-ॿ]/;

/** Columns never drop below this, so dates and names stay readable. */
const MIN_COL = 80;

export default function AnswerTable({ table }: { table: AskTable }) {
  const cols = table.columns ?? [];
  const rows = table.rows ?? [];
  const n = Math.max(cols.length, ...rows.map((r) => r.length), 0);

  // Column widths are explicit and shared by every row. Flexed cells
  // (`flex: 1` with `minWidth`) clamp at the minimum and overflow the row
  // without widening it, so the scroll content never grew past the screen:
  // trailing columns were painted off the edge with nothing to scroll.
  const [frame, setFrame] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setFrame(e.nativeEvent.layout.width);
  const inner = Math.max(0, frame - 2 * 16);
  const colW = n > 0 ? Math.max(MIN_COL, Math.floor((inner - space.sm * (n - 1)) / n)) : MIN_COL;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator
      nestedScrollEnabled
      accessibilityLabel="Answer table"
      style={styles.scroll}
      contentContainerStyle={styles.content}
      onLayout={onLayout}
    >
      <View style={styles.table}>
        {cols.length > 0 && (
          <View style={styles.row}>
            {cols.map((c, i) => (
              <Text key={i} style={[styles.cell, styles.head, { width: colW }]}>
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
                <Text key={j} style={[styles.cell, sa && styles.cellSa, { width: colW }]} selectable={!sa}>
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
