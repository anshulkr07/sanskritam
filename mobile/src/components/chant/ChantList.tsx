// ChantList: karaoke verse cards for one book.

import React, { memo, useMemo, useRef } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import type { Shloka } from "../../api/client";
import { fill, onFill } from "../../theme";
import { useTypeScale } from "../../hooks/useTypeScale";
import { plain } from "../../utils/text";

function breakVerse(dev: string): string[] {
  return (dev || "").split(/(?<=[।॥])/).map((s) => s.trim()).filter(Boolean);
}

const VerseCard = memo(function VerseCard({
  item,
  playing,
  lineNow,
  fillFrac,
  pageColor,
  textColor,
  softColor,
  roman,
  sized,
  onPick,
  onPickLine,
  onLearn,
}: {
  item: Shloka;
  playing: boolean;
  lineNow: number;
  /** 0..1 fluid fill of the sounding line (meaningful only when playing). */
  fillFrac: number;
  pageColor: string;
  textColor: string;
  softColor: string;
  roman: boolean;
  sized: (n: number) => number;
  onPick: (v: Shloka) => void;
  onPickLine: (v: Shloka, line: number) => void;
  onLearn: (v: Shloka) => void;
}) {
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
      {lines.map((ln) => {
        const lit = playing && ln.i === lineNow;
        return (
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
                lit
                  ? { color: onFill.gold, fontWeight: "700" }
                  : playing
                    ? { color: onFill.soft }
                    : { color: textColor },
              ]}
            >
              {lit ? "▶ " : ""}
              {ln.text}
            </Text>
            {lit && (
              <View style={styles.fillTrack}>
                <View style={[styles.fillBar, { width: `${Math.round(fillFrac * 100)}%` }]} />
              </View>
            )}
          </Pressable>
        );
      })}
      {roman && !!item.iast && (
        <Text style={[styles.roman, { color: playing ? onFill.soft : softColor }]}>{item.iast}</Text>
      )}
      {!!item.translation_en && (
        <Text style={[styles.meaning, { color: playing ? onFill.soft : softColor }]}>
          {plain(item.translation_en)}
        </Text>
      )}
      {!item.chant && <Text style={[styles.noChant, { color: softColor }]}>No chant yet</Text>}
    </Pressable>
  );
});

export default function ChantList({
  verses,
  playingId,
  lineNow,
  fillFrac,
  pageColor,
  textColor,
  softColor,
  roman,
  onPick,
  onPickLine,
  onLearn,
  listRef,
  onUserScroll,
  /** Center the list on this verse with one neighbour each side. */
  focusIndex,
}: {
  verses: Shloka[];
  playingId: string | null;
  lineNow: number;
  fillFrac: number;
  pageColor: string;
  textColor: string;
  softColor: string;
  roman: boolean;
  onPick: (v: Shloka) => void;
  onPickLine: (v: Shloka, line: number) => void;
  onLearn: (v: Shloka) => void;
  listRef: React.RefObject<import("react-native").FlatList | null>;
  onUserScroll: () => void;
  focusIndex?: number | null;
}) {
  const { sized } = useTypeScale();
  // The card to scroll to may not be drawn yet, so its place is unknown.
  const failedAt = useRef<{ index: number; at: number } | null>(null);
  // Focused previous/current/next view: the verse in focus with one
  // neighbour each side. Picks still carry the full verse, so playback and
  // Learn work exactly as in the full list.
  const data = useMemo(() => {
    if (focusIndex === undefined || focusIndex === null) return verses;
    const at = Math.min(Math.max(focusIndex, 0), Math.max(0, verses.length - 1));
    return verses.slice(Math.max(0, at - 1), Math.min(verses.length, at + 2));
  }, [verses, focusIndex]);
  return (
    <FlatList
      ref={listRef as never}
      onScrollToIndexFailed={(info) => {
        // Go to an estimate (cards are about the average height), then try the
        // exact card once more. A second failure for the same card stays at the estimate.
        const last = failedAt.current;
        const again = last !== null && last.index === info.index && Date.now() - last.at < 2000;
        failedAt.current = { index: info.index, at: Date.now() };
        listRef.current?.scrollToOffset({ offset: Math.max(0, info.averageItemLength * info.index), animated: false });
        if (again) return;
        setTimeout(() => {
          try {
            listRef.current?.scrollToIndex({ index: info.index, viewPosition: 0.3, animated: false });
          } catch { /* stays at the estimate */ }
        }, 120);
      }}
      data={data}
      keyExtractor={(v) => v.id}
      onScrollBeginDrag={onUserScroll}
      contentContainerStyle={{ padding: 16, paddingBottom: 140 }}
      renderItem={({ item }) => (
        <VerseCard
          item={item}
          playing={item.id === playingId}
          lineNow={lineNow}
          fillFrac={item.id === playingId ? fillFrac : 0}
          pageColor={pageColor}
          textColor={textColor}
          softColor={softColor}
          roman={roman}
          sized={sized}
          onPick={onPick}
          onPickLine={onPickLine}
          onLearn={onLearn}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  card: { paddingVertical: 12, paddingHorizontal: 4, gap: 2 },
  ref: { fontSize: 12 },
  lineHit: { minHeight: 44, justifyContent: "center" },
  line: { lineHeight: 34 },
  fillTrack: { height: 3, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.25)", marginTop: 2, overflow: "hidden" },
  fillBar: { height: 3, borderRadius: 2, backgroundColor: onFill.gold },
  roman: { fontStyle: "italic", fontSize: 14 },
  meaning: { fontSize: 14, lineHeight: 21, marginTop: 2 },
  noChant: { fontSize: 13 },
});
