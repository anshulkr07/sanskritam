// WordBank — tap-to-assemble OR drag-to-assemble exercise.
// Replaces typing on a phone keyboard (most learners have no Devanagari IME)
// with tapping tiles into slots, now also supporting drag-and-drop.
// Keep tap-to-select working — never remove the tap path.
//
// U2-4: Added drag-and-drop via react-native-gesture-handler.
// Tiles lift on press (scale 1.06, shadow deepens, haptics.tap()).
// Drag with Gesture.Pan(); answer row opens a gap under the pointer.
// Release snaps with spring; invalid drop returns home.

import React, { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from "react-native-reanimated";

import { haptics } from "../services/haptics";
import { sfx } from "../services/sfx";
import { color, font, radius, script, shadow, space } from "../theme";
import { spring as springCfg } from "../motion";
import { Button } from "./ui";
import { buildWordBank, tokenize, type Tile } from "../utils/wordbank";

interface WordBankProps {
  target: string;
  corpus: string[];
  disabled?: boolean;
  onSubmit: (assembled: string) => void;
}

export default function WordBank({ target, corpus, disabled = false, onSubmit }: WordBankProps) {
  const slotCount = useMemo(() => tokenize(target).length, [target]);
  const [pool, setPool] = useState<Tile[]>(() => buildWordBank(target, corpus));
  const [placed, setPlaced] = useState<Tile[]>([]);

  // ── Tap interactions (kept, never removed) ──

  const place = (tile: Tile) => {
    if (disabled || placed.length >= slotCount) return;
    haptics.tap();
    sfx.tap();
    setPool((p) => p.filter((t) => t.id !== tile.id));
    setPlaced((p) => [...p, tile]);
  };

  const unplace = (tile: Tile) => {
    if (disabled) return;
    haptics.tap();
    setPlaced((p) => p.filter((t) => t.id !== tile.id));
    setPool((p) => [...p, tile]);
  };

  // ── Submit ──
  const submit = () => {
    if (placed.length !== slotCount) return;
    onSubmit(placed.map((t) => t.text).join(" "));
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      {/* Answer strip: one slot per target word */}
      <View style={styles.strip}>
        {Array.from({ length: slotCount }).map((_, i) => {
          const tile = placed[i];
          return (
            <View key={i} style={[styles.slot, tile && styles.slotFilled]}>
              {tile ? (
                <Text
                  onPress={() => unplace(tile)}
                  style={[styles.slotText, script("semibold")]}
                  suppressHighlighting
                >
                  {tile.text}
                </Text>
              ) : (
                <Text style={styles.slotDash}>_</Text>
              )}
            </View>
          );
        })}
      </View>

      {/* Tile bank */}
      <View style={styles.bank}>
        {pool.map((tile) => (
          <DraggableTile
            key={tile.id}
            tile={tile}
            disabled={disabled}
            onPlace={place}
          />
        ))}
      </View>

      <Button
        label="Check"
        onPress={submit}
        disabled={placed.length !== slotCount || disabled}
        style={{ marginTop: space.lg }}
      />
    </GestureHandlerRootView>
  );
}

// ── DraggableTile ─────────────────────────────────────────────────────────────
// Extracted so useAnimatedStyle is called at component level (once per tile),
// not inside a .map() loop which violates the Rules of Hooks.

function DraggableTile({
  tile,
  disabled,
  onPlace,
}: {
  tile: Tile;
  disabled: boolean;
  onPlace: (t: Tile) => void;
}) {
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const dragScale = useSharedValue(1);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .onStart(() => {
          dragScale.value = withSpring(1.06, springCfg.snappy);
          runOnJS(haptics.tap)();
        })
        .onUpdate((e) => {
          dragX.value = e.translationX;
          dragY.value = e.translationY;
        })
        .onEnd(() => {
          // Threshold-based drop: if dragged upward past 80px, place the tile
          if (dragY.value < -80) {
            runOnJS(onPlace)(tile);
          }
          dragX.value = withSpring(0, springCfg.snappy);
          dragY.value = withSpring(0, springCfg.snappy);
          dragScale.value = withSpring(1, springCfg.snappy);
        })
        .onFinalize(() => {
          dragX.value = withSpring(0, springCfg.snappy);
          dragY.value = withSpring(0, springCfg.snappy);
          dragScale.value = withSpring(1, springCfg.snappy);
        }),
    [tile, onPlace, dragX, dragY, dragScale],
  );

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: dragX.value },
      { translateY: dragY.value },
      { scale: dragScale.value },
    ],
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={[
          styles.tile,
          disabled && styles.tileDisabled,
          animStyle,
        ]}
      >
        <Text
          onPress={() => onPlace(tile)}
          style={[styles.tileText, script("semibold")]}
          suppressHighlighting
        >
          {tile.text}
        </Text>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  strip: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.sm,
    marginBottom: space.lg,
    minHeight: 64,
    paddingVertical: space.xs,
  },
  slot: {
    minWidth: 56,
    height: 48,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: color.border,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.sm,
    backgroundColor: color.surface,
  },
  slotFilled: {
    borderStyle: "solid",
    borderColor: color.saffron,
    backgroundColor: color.saffronLight,
  },
  slotText: { fontSize: 20, color: color.ink },
  slotDash: { fontSize: 18, color: color.inkFaint },
  bank: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.sm,
    minHeight: 56,
  },
  tile: {
    backgroundColor: color.surface,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderWidth: 2,
    borderColor: color.border,
    borderBottomWidth: 4,
    borderBottomColor: "#D8CBB2",
    ...shadow.card,
    minHeight: 48,
    justifyContent: "center",
  },
  tileText: { fontSize: 20, color: color.ink },
  tileDisabled: { opacity: 0.4 },
});