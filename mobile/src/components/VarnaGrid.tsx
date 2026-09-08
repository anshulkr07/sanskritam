// VarnaGrid — the tile grid for the daily-word game वर्ण-बन्धः (U8-4).
//
// Four states per tile (never colour alone, U5-3): exact · near (right place,
// wrong axis) · present (correct char elsewhere) · absent. Each state pairs a
// colour with a glyph/border treatment, and the phonetic axis is named in text
// on tap. The flip reveal is transform-only, per-tile with a 45ms stagger.

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

import type { DailyWordTile } from "../api/client";
import { duration, easing, stagger } from "../motion";
import { color, font, script, space } from "../theme";

export type TileState = DailyWordTile["state"];

interface VarnaGridProps {
  answerLength: number;
  /** rows already submitted, oldest first. */
  rows: { tiles: DailyWordTile[]; guess: string }[];
}

const TILE_BG: Record<TileState, string> = {
  exact: color.ok,
  near: color.warn,
  present: color.tutor,
  absent: color.surfaceMuted,
};

const TILE_BORDER: Record<TileState, string> = {
  exact: color.ok,
  near: color.warn,
  present: color.tutor,
  absent: color.border,
};

const STATE_GLYPH: Record<TileState, string> = {
  exact: "●",
  near: "◐",
  present: "◍",
  absent: "",
};

const AXIS_LABEL: Record<string, string> = {
  place: "place of articulation",
  voicing: "voicing",
  aspiration: "aspiration",
  nasality: "nasality",
};

export default function VarnaGrid({ answerLength, rows }: VarnaGridProps) {
  // Include the current partially-filled row (empty tiles) so the grid is
  // always rectangular and entry tiles reveal the word length up front.
  const shown = [...rows];
  const n = rows.length;

  return (
    <View style={styles.grid} accessible={false}>
      {shown.map((row, r) => (
        <RowTiles key={r} row={row.tiles} rowIndex={r} length={answerLength} />
      ))}
      {n < 1 && <EmptyRow length={answerLength} />}
    </View>
  );
}

function RowTiles({
  row,
  rowIndex,
  length,
}: {
  row: DailyWordTile[];
  rowIndex: number;
  length: number;
}) {
  return (
    <View style={styles.row}>
      {Array.from({ length }).map((_, i) => {
        const t = row[i];
        if (!t) return <View key={i} style={styles.tilePlaceholder} />;
        return <Tile key={i} tile={t} index={i} />;
      })}
    </View>
  );
}

function EmptyRow({ length }: { length: number }) {
  return (
    <View style={styles.row}>
      {Array.from({ length }).map((_, i) => (
        <View key={i} style={styles.tileInput}>
          <Text style={styles.tileEmpty} />
        </View>
      ))}
    </View>
  );
}

function Tile({ tile, index }: { tile: DailyWordTile; index: number }) {
  const flip = useSharedValue(0);
  // Reveal one tile at a time, 45ms stagger, capped (motion.ts §8).
  flip.value = withDelay(
    stagger(index, 45),
    withTiming(1, { duration: duration.quick, easing: easing.entrance }),
  );

  const flipStyle = useAnimatedStyle(() => ({
    transform: [{ rotateX: `${flip.value * 180}deg` }],
    opacity: flip.value,
  }));

  const bg = TILE_BG[tile.state];
  const border = TILE_BORDER[tile.state];
  const glyph = STATE_GLYPH[tile.state];
  const axis = tile.axis ? AXIS_LABEL[tile.axis] ?? tile.axis : null;

  return (
    <Pressable
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={
        axis
          ? `${tile.character} — nearly right, same ${axis}`
          : tile.state === "exact"
            ? `${tile.character} — exact`
            : tile.state === "present"
              ? `${tile.character} — in the word, elsewhere`
              : `${tile.character} — not in the word`
      }
      hitSlop={2}
      style={[styles.tileResult, { backgroundColor: bg, borderColor: border }]}
    >
      <Animated.View style={[styles.flipInner, flipStyle]}>
        <Text style={[styles.tileChar, script("bold")]}>{tile.character}</Text>
        {glyph ? <Text style={styles.tileGlyph}>{glyph}</Text> : null}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  grid: { gap: space.xs },
  row: { flexDirection: "row", gap: space.xs },
  tileResult: {
    flex: 1,
    aspectRatio: 1,
    borderWidth: 2,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  tilePlaceholder: {
    flex: 1,
    aspectRatio: 1,
    borderWidth: 2,
    borderColor: color.border,
    borderRadius: 10,
    backgroundColor: color.surface,
  },
  tileInput: {
    flex: 1,
    aspectRatio: 1,
    borderWidth: 2,
    borderColor: color.border,
    borderRadius: 10,
    backgroundColor: color.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  tileEmpty: {},
  flipInner: { alignItems: "center", justifyContent: "center" },
  tileChar: { fontSize: 22, color: color.white },
  tileGlyph: { fontSize: 9, color: "rgba(255,255,255,0.7)", marginTop: 1 },
});
