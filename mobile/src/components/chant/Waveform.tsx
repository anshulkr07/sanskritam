// Waveform — the podcast scrubber for one verse.
//
// Bars stand for the verse's chant lines (longer lines get more bars); the
// played prefix is saffron, the rest is border. Tap anywhere to play from
// the line under it — the same jump as tapping a karaoke line, with a
// scrubber's aim. A verse without timed lines still renders (untimed lines
// get one bar each), so the tap-to-seek behaviour never disappears.

import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { color } from "../../theme";

/** Structural line: a real ChantLine satisfies it, and so do the karaoke
 *  fallback lines the screens split from verse text when no chant exists. */
interface WaveformLine {
  i: number;
  start_ms?: number;
  end_ms?: number;
}

const GAP = 2.5;
const MIN_H = 10;
const MAX_H = 40;

export default function Waveform({
  lines,
  fillFrac,
  onSeekLine,
}: {
  lines: WaveformLine[];
  /** How far through the verse, 0..1. */
  fillFrac: number;
  /** Play from this line index. */
  onSeekLine: (line: number) => void;
}) {
  const [width, setWidth] = useState(0);

  const bars = useMemo(() => {
    const out: { line: number; h: number }[] = [];
    lines.forEach((ln) => {
      const dur = Math.max(400, (ln.end_ms || 0) - (ln.start_ms || 0));
      const n = Math.max(3, Math.min(10, Math.round(dur / 600)));
      for (let k = 0; k < n; k++) {
        const seed = out.length * 53 + ln.i * 7 + k;
        out.push({ line: ln.i, h: MIN_H + (seed % (MAX_H - MIN_H + 1)) });
      }
    });
    return out;
  }, [lines]);

  const played = Math.round(Math.max(0, Math.min(1, fillFrac)) * bars.length);
  const inner = Math.max(2, bars.length > 0 && width > 0 ? (width - GAP * (bars.length - 1)) / bars.length : 3);

  if (bars.length === 0) return null;

  return (
    <Pressable
      onPress={(e) => {
        if (width <= 0) return;
        const idx = Math.max(
          0,
          Math.min(bars.length - 1, Math.floor((e.nativeEvent.locationX / width) * bars.length)),
        );
        onSeekLine(bars[idx].line);
      }}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={styles.hit}
      accessibilityRole="adjustable"
      accessibilityLabel="Verse progress. Tap a line to play from it."
    >
      <View style={styles.row}>
        {bars.map((b, i) => (
          <View
            key={i}
            style={{
              width: inner,
              height: b.h,
              borderRadius: 2,
              backgroundColor: i < played ? color.saffron : color.border,
              marginHorizontal: GAP / 2,
            }}
          />
        ))}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: { height: 48, justifyContent: "center" },
  row: { flexDirection: "row", alignItems: "center" },
});
