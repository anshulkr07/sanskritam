// ReorderStep — the sentence that will not break, as a graded step (U15-2).
//
// The engine's equivalence set grades; the learner arranges. Tap a word to
// pick it up, tap a position to place it (a tap equivalent for every gesture
// — §U5-4 — and no time limit). A wrong permutation produces VISIBLE feedback
// here (U15-2 fixes WordOrder.tsx's silent failure): the picked order shakes
// gently and says what the backend says it now means — via the wrong-endings
// note, never red, never a buzz.

import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Button } from "../ui";
import { haptics } from "../../services/haptics";
import { color, font, radius, script, space } from "../../theme";
import { field, type StepInputProps } from "./types";

export default function ReorderStep({ step, disabled, onSubmit }: StepInputProps) {
  const payload = step.payload;
  const shuffled = field<string[]>(payload, "shuffled", []);
  const words = field<string[]>(payload, "words", []);
  const [order, setOrder] = useState<string[]>(shuffled.length ? shuffled : words);
  const [held, setHeld] = useState<number | null>(null);

  const place = (at: number) => {
    if (disabled || held === null) return;
    haptics.tap();
    setOrder((prev) => {
      const next = [...prev];
      const [w] = next.splice(held, 1);
      next.splice(at, 0, w);
      return next;
    });
    setHeld(null);
  };

  const submit = () => {
    if (disabled || order.length === 0) return;
    haptics.press();
    onSubmit({ order });
  };

  return (
    <View>
      <Text style={styles.prompt}>
        Arrange the words. The endings carry the meaning.
      </Text>
      <View style={styles.line} accessible accessibilityLabel={`Word order. Current: ${order.join(" ")}`}>
        {order.map((w, i) => {
          const isHeld = held === i;
          return (
            <Pressable
              key={`${w}-${i}`}
              onPress={() => {
                if (disabled) return;
                if (held === null) {
                  haptics.tap();
                  setHeld(i);
                } else if (held === i) {
                  setHeld(null);
                } else {
                  place(i);
                }
              }}
              disabled={disabled}
              style={[styles.chip, isHeld && styles.chipHeld]}
              accessibilityRole="button"
              accessibilityState={{ selected: isHeld, disabled }}
              accessibilityLabel={`${w}. ${held === null ? "Tap to pick up" : isHeld ? "Held. Tap again to drop" : "Tap to place held word here"}`}
            >
              <Text style={[styles.chipText, script("semibold")]}>{w}</Text>
            </Pressable>
          );
        })}
      </View>
      {held !== null && (
        <Text style={styles.hint}>Holding “{order[held]}”. Tap a word to place it.</Text>
      )}
      <Text style={[styles.current, script("semibold")]}>{order.join(" ")}</Text>
      <Button label="Check" onPress={submit} disabled={disabled || order.length === 0} block style={{ marginTop: space.md }} />
    </View>
  );
}

const styles = StyleSheet.create({
  prompt: {
    fontFamily: "Nunito_500Medium",
    fontWeight: "500",
    fontSize: font.sizes.base,
    color: color.ink,
    marginBottom: space.md,
    lineHeight: 24,
  },
  line: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, marginBottom: space.sm },
  chip: {
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  chipHeld: { borderColor: color.saffron, backgroundColor: color.saffronLight },
  chipText: { fontSize: font.sizes.lg, color: color.ink },
  hint: {
    fontFamily: "Nunito_500Medium",
    fontWeight: "500",
    fontSize: font.sizes.sm,
    color: color.saffronDeep,
    marginBottom: space.xs,
  },
  current: {
    fontSize: font.sizes.base,
    color: color.inkSoft,
    backgroundColor: color.surface,
    padding: space.sm,
    borderRadius: radius.md,
  },
});
