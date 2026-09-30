// VarnaGrid — the checked rows of the daily-word game वर्ण-बन्धः (U8-4).
//
// One tile per akṣara (or per code point for the typing fallback). Four states,
// never colour alone (U5-3): exact · near (one step away on the mouth-map, or a
// vowel of the other length) · present (in the word, elsewhere) · absent. Each
// pairs a colour with a glyph, and a near tile names what differs.
//
// The reveal is a flip from edge-on to face-on, started from an effect one tile
// at a time. (It used to rotate 0 to 180 degrees, which left every letter
// upside down, and it set its shared value while rendering.)

import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

import type { DailyWordTile } from "../api/client";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { duration, easing, stagger } from "../motion";
import { accent, color, radius, script, space } from "../theme";

export type TileState = DailyWordTile["state"];

export interface GridRow {
  tiles: DailyWordTile[];
}

export const TILE_BG: Record<TileState, string> = {
  exact: accent.sage.from,
  near: accent.gold.from,
  present: accent.slate.from,
  absent: color.surfaceMuted,
};

export const STATE_GLYPH: Record<TileState, string> = {
  exact: "●",
  near: "◐",
  present: "◍",
  absent: "○",
};

const STATE_WORD: Record<TileState, string> = {
  exact: "right",
  near: "close",
  present: "in the word, elsewhere",
  absent: "not in the word",
};

const AXIS_SHORT: Record<string, string> = {
  place: "place",
  voicing: "voice",
  aspiration: "breath",
  nasality: "nasal",
  length: "length",
};

const AXIS_LONG: Record<string, string> = {
  place: "place of articulation",
  voicing: "voicing",
  aspiration: "aspiration",
  nasality: "nasality",
  length: "vowel length",
};

interface Props {
  /** How many tiles a row has. */
  slots: number;
  /** Rows already checked, oldest first. */
  rows: GridRow[];
}

export default function VarnaGrid({ slots, rows }: Props) {
  return (
    <View style={styles.grid} accessible={false}>
      {rows.map((row, r) => (
        <View key={r} style={styles.row}>
          {Array.from({ length: slots }).map((_, i) => {
            const t = row.tiles[i];
            return t ? <Tile key={i} tile={t} index={i} slots={slots} /> : <View key={i} style={[styles.tile, styles.empty]} />;
          })}
        </View>
      ))}
    </View>
  );
}

export function tileFontSize(slots: number): number {
  return slots <= 3 ? 30 : slots <= 5 ? 26 : 22;
}

function Tile({ tile, index, slots }: { tile: DailyWordTile; index: number; slots: number }) {
  const reduced = useReducedMotion();
  const flip = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) {
      flip.value = 1;
      return;
    }
    // Reveal one tile at a time (motion.ts §8).
    flip.value = withDelay(stagger(index, 60), withTiming(1, { duration: duration.base, easing: easing.entrance }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const flipStyle = useAnimatedStyle(() => ({
    opacity: 0.2 + 0.8 * flip.value,
    transform: [{ perspective: 500 }, { rotateX: `${(1 - flip.value) * 90}deg` }],
  }));

  const absent = tile.state === "absent";
  const ink = absent ? color.ink : color.white;
  const axis = tile.axis ? AXIS_LONG[tile.axis] ?? tile.axis : null;

  return (
    <Animated.View
      style={[styles.tile, { backgroundColor: TILE_BG[tile.state] }, flipStyle]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${tile.character}, ${STATE_WORD[tile.state]}${axis && tile.state === "near" ? `, differs in ${axis}` : ""}`}
    >
      <Text style={[styles.char, script("bold"), { color: ink, fontSize: tileFontSize(slots), lineHeight: tileFontSize(slots) * 1.5 }]}>
        {tile.character}
      </Text>
      <Text style={[styles.cue, { color: absent ? color.inkSoft : "rgba(255,255,255,0.92)" }]}>
        {STATE_GLYPH[tile.state]}
        {tile.state === "near" && tile.axis ? ` ${AXIS_SHORT[tile.axis] ?? tile.axis}` : ""}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  grid: { gap: space.xs },
  row: { flexDirection: "row", gap: space.xs, justifyContent: "center" },
  tile: {
    flex: 1,
    maxWidth: 76,
    aspectRatio: 1,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: { backgroundColor: color.surface, borderWidth: 2, borderColor: color.border },
  char: { textAlign: "center" },
  cue: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 10, marginTop: -4 },
});
