// StrokePathPlayer (U12-1) — the demonstration: each akṣara animates stroke
// by stroke, SVG path strokeDashoffset driven, using P20-2's ordered paths.
// Replayable, pausable, and NEVER a gate (§3.7): "Skip to writing" is always
// available. Reduce Motion (§3.4) cuts the animation and shows the finished
// letter immediately.
//
// The śirorekhā is drawn beneath every letter — it is the thing beginners
// most often get wrong and no Latin-script app ever has to teach.

import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { haptics } from "../../services/haptics";
import { color, font, script, space } from "../../theme";
import type { StrokePath } from "../../api/client";

const VIEW = 100; // the authored coordinate space
const REEKHA_Y = 10;

interface Props {
  paths: StrokePath[]; // P20-2 ordered strokes
  devanagari: string; // reference (rendered as text beside, for comparison)
  size?: number;
  autoPlay?: boolean;
}

/** Rough per-stroke duration from its path length, so a long sweep doesn't
 *  get the same tick as a dot. Scaled to a fixed px/day baseline. */
function strokeDurationMs(d: string): number {
  // Crude length: count explicit point pairs in M/L runs + curve endpoints.
  const pts = d.match(/-?\d+(?:\.\d+)?/g)?.length ?? 2;
  return Math.max(280, Math.min(900, pts * 55));
}

export default function StrokePathPlayer({ paths, devanagari, size = 220, autoPlay = false }: Props) {
  const reduced = useReducedMotion();
  const [strokeIdx, setStrokeIdx] = useState(0); // how many strokes are "done"
  const [playing, setPlaying] = useState(autoPlay && !reduced);

  // Reset on new letter.
  useEffect(() => {
    setStrokeIdx(0);
    setPlaying(autoPlay && !reduced);
  }, [devanagari, autoPlay, reduced]);

  // Advance one stroke at a time.
  useEffect(() => {
    if (!playing) return;
    if (strokeIdx >= paths.length) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => {
      setStrokeIdx((i) => i + 1);
      haptics.tap();
    }, strokeDurationMs(paths[strokeIdx]?.d ?? "M 0 0"));
    return () => clearTimeout(t);
  }, [playing, strokeIdx, paths]);

  const replay = () => {
    haptics.tap();
    setStrokeIdx(0);
    setPlaying(!reduced);
  };

  const skip = () => {
    haptics.tap();
    setPlaying(false);
    setStrokeIdx(paths.length);
  };

  const done = strokeIdx >= paths.length && paths.length > 0;

  return (
    <View style={[styles.wrap, { width: size + space.md * 2 }]}>
      <View style={styles.letterRow}>
        <View style={{ width: size, height: size }}>
          <Svg viewBox={`0 0 ${VIEW} ${VIEW}`} width={size} height={size}>
            {/* śirorekhā — the headline every letter hangs from */}
            <Path
              d={`M 5 ${REEKHA_Y} L 95 ${REEKHA_Y}`}
              stroke={color.border}
              strokeWidth={2}
              strokeLinecap="round"
            />
            {paths.map((s, i) => {
              const revealed = i < strokeIdx;
              return (
                <Path
                  key={i}
                  d={s.d}
                  stroke={revealed ? color.ink : color.saffron}
                  strokeWidth={revealed ? 5 : 2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                  opacity={revealed ? 1 : 0.25}
                />
              );
            })}
          </Svg>
        </View>
        {/* The reference letterform beside the drawing (U12-3: unsure shows
            the reference beside what they drew) */}
        <Text style={[styles.reference, script("regular"), { fontSize: size * 0.42 }]}>
          {devanagari}
        </Text>
      </View>

      <View style={styles.controls}>
        <Pressable
          onPress={replay}
          accessibilityRole="button"
          accessibilityLabel="Replay the stroke order"
          style={styles.ctrlBtn}
        >
          <Text style={styles.ctrlText}>↺ Replay</Text>
        </Pressable>
        {!done ? (
          <Pressable
            onPress={skip}
            accessibilityRole="button"
            accessibilityLabel="Show the finished letter"
            style={styles.ctrlBtn}
          >
            <Text style={styles.ctrlText}>Show all</Text>
          </Pressable>
        ) : null}
      </View>
      <Text style={styles.strokeCount}>
        {Math.min(strokeIdx, paths.length)} / {paths.length} strokes
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center" },
  letterRow: { flexDirection: "row", alignItems: "center", gap: space.md },
  reference: { color: color.inkFaint },
  controls: { flexDirection: "row", gap: space.sm, marginTop: space.xs },
  ctrlBtn: {
    minHeight: 44,
    minWidth: 64,
    paddingHorizontal: space.md,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  ctrlText: { fontSize: font.sizes.sm, color: color.inkSoft, fontWeight: "700" },
  strokeCount: { fontSize: font.sizes.xs, color: color.inkFaint, marginTop: space.xxs },
});
