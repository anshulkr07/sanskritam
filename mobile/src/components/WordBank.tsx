// WordBank — tap-to-assemble exercise. Replaces typing on a phone keyboard
// (most learners have no Devanagari IME) with tapping tiles into slots.
// Mount a fresh instance per challenge via `key` so the shuffle re-rolls.

import React, { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { haptics } from "../services/haptics";
import { sfx } from "../services/sfx";
import { color, font, radius, script, shadow, space } from "../theme";
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

  const submit = () => {
    // No haptics.press() here — the shared Button already fires a tap on press.
    if (placed.length !== slotCount) return;
    onSubmit(placed.map((t) => t.text).join(" "));
  };

  return (
    <View>
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
          <Text
            key={tile.id}
            onPress={() => place(tile)}
            style={[styles.tile, script("semibold"), disabled && styles.tileDisabled]}
            suppressHighlighting
          >
            {tile.text}
          </Text>
        ))}
      </View>

      <Button
        label="Check"
        onPress={submit}
        disabled={placed.length !== slotCount || disabled}
        style={{ marginTop: space.lg }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.sm,
    marginBottom: space.lg,
    minHeight: 52,
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
  },
  tile: {
    fontSize: 20,
    color: color.ink,
    backgroundColor: color.surface,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: color.border,
    borderBottomWidth: 4,
    borderBottomColor: "#D8CBB2",
    ...shadow.card,
  },
  tileDisabled: { opacity: 0.4 },
});
