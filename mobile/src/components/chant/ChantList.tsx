// ChantList: karaoke verse cards for one book.

import React from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import type { Shloka } from "../../api/client";
import { fill, onFill } from "../../theme";
import { useTypeScale } from "../../hooks/useTypeScale";

function breakVerse(dev: string): string[] {
  return (dev || "").split(/(?<=[।॥])/).map((s) => s.trim()).filter(Boolean);
}

export default function ChantList({
  verses,
  playingId,
  lineNow,
  pageColor,
  textColor,
  softColor,
  roman,
  onPick,
  onPickLine,
  onLearn,
  listRef,
  onUserScroll,
}: {
  verses: Shloka[];
  playingId: string | null;
  lineNow: number;
  pageColor: string;
  textColor: string;
  softColor: string;
  roman: boolean;
  onPick: (v: Shloka) => void;
  onPickLine: (v: Shloka, line: number) => void;
  onLearn: (v: Shloka) => void;
  listRef: React.RefObject<import("react-native").FlatList | null>;
  onUserScroll: () => void;
}) {
  const { sized } = useTypeScale();
  return (
    <FlatList
      ref={listRef as never}
      data={verses}
      keyExtractor={(v) => v.id}
      onScrollBeginDrag={onUserScroll}
      contentContainerStyle={{ padding: 16, paddingBottom: 140 }}
      renderItem={({ item }) => {
        const playing = item.id === playingId;
        const lines = item.chant?.lines?.length
          ? item.chant.lines
          : breakVerse(item.devanagari).map((text, i) => ({ i, text, kind: "verse" as const, start_ms: 0, end_ms: 0 }));
        return (
          <Pressable
            onPress={() => onPick(item)}
            onLongPress={() => onLearn(item)}
            accessibilityRole="button"
            accessibilityLabel={`Play ${item.source_ref}`}
            style={[
              styles.card,
              playing
                ? { backgroundColor: fill.maroon }
                : { backgroundColor: pageColor, borderBottomColor: softColor, borderBottomWidth: 1 },
            ]}
          >
            <Text style={[styles.ref, { color: playing ? onFill.soft : softColor }]}>{item.source_ref}</Text>
            {lines.map((ln) => (
              <Pressable
                key={ln.i}
                onPress={() => onPickLine(item, ln.i)}
                accessibilityRole="button"
                accessibilityLabel={`Play line ${ln.i + 1} of ${item.source_ref}`}
                style={styles.lineHit}
              >
                <Text
                  style={[
                    styles.line,
                    { fontSize: Math.max(18, sized(22)) },
                    playing && ln.i === lineNow
                      ? { color: onFill.gold, fontWeight: "700" }
                      : playing
                        ? { color: onFill.soft }
                        : { color: textColor },
                  ]}
                >
                  {playing && ln.i === lineNow ? "▶ " : ""}
                  {ln.text}
                </Text>
              </Pressable>
            ))}
            {roman && !!item.iast && (
              <Text style={[styles.roman, { color: playing ? onFill.soft : softColor }]}>{item.iast}</Text>
            )}
            {!item.chant && <Text style={[styles.noChant, { color: softColor }]}>No chant yet</Text>}
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  card: { paddingVertical: 12, paddingHorizontal: 4, gap: 2 },
  ref: { fontSize: 12 },
  lineHit: { minHeight: 44, justifyContent: "center" },
  line: { lineHeight: 34 },
  roman: { fontStyle: "italic", fontSize: 14 },
  noChant: { fontSize: 13 },
});
