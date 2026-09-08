// GridFillStep — declension as a tensor the learner fills (U15-2, U15-6).
//
// Reuses Paradigm.tsx + VisualGrid.tsx's presentation, MADE WRITABLE: blank
// cells offer the engine's own forms as choice chips (correct + distractors
// from the same table — no Devanagari keyboard needed, no typing). Ending
// patterns stay colour-linked across the row exactly as Paradigm tints them.
// One Check for the whole grid; off_by_one names the missed cell server-side.

import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Button } from "../ui";
import { haptics } from "../../services/haptics";
import { color, font, radius, script, space } from "../../theme";
import { field, type StepInputProps } from "./types";

interface BlankCell {
  vibhakti: string;
  vacana: string;
  form: string | null;
  blank: boolean;
}

interface BlankOptions {
  vibhakti: string;
  vacana: string;
  choices: string[];
}

export default function GridFillStep({ step, disabled, onSubmit }: StepInputProps) {
  const payload = step.payload;
  const pratipadika = field<string>(payload, "pratipadika", "");
  const cells = field<BlankCell[]>(payload, "cells", []);
  const blanks = field<BlankOptions[]>(payload, "blanks", []);
  const [picks, setPicks] = useState<Record<string, string>>({});

  const keyOf = (vibhakti: string, vacana: string) => `${vibhakti}.${vacana}`;
  const optionsByKey = useMemo(() => {
    const m: Record<string, string[]> = {};
    for (const b of blanks) m[keyOf(b.vibhakti, b.vacana)] = b.choices ?? [];
    return m;
  }, [blanks]);

  const complete = blanks.length > 0 && blanks.every((b) => picks[keyOf(b.vibhakti, b.vacana)]);

  const submit = () => {
    if (!complete || disabled) return;
    haptics.press();
    onSubmit({
      cells: blanks.map((b) => ({
        vibhakti: b.vibhakti,
        vacana: b.vacana,
        form: picks[keyOf(b.vibhakti, b.vacana)],
      })),
    });
  };

  return (
    <View>
      <Text style={styles.prompt}>
        Fill the missing forms of{" "}
        <Text style={[styles.stem, script("bold")]}>{pratipadika}</Text>.
      </Text>
      {cells.filter((c) => c.blank).map((c) => {
        const key = keyOf(c.vibhakti, c.vacana);
        const options = optionsByKey[key] ?? [];
        return (
          <View key={key} style={styles.blankBlock} accessible accessibilityLabel={`Missing form: ${c.vibhakti}, ${c.vacana}`}>
            <Text style={styles.blankTitle}>
              {c.vibhakti} · {c.vacana}
            </Text>
            <View style={styles.chips}>
              {options.map((opt) => {
                const active = picks[key] === opt;
                return (
                  <Pressable
                    key={opt}
                    onPress={() => {
                      if (disabled) return;
                      haptics.tap();
                      setPicks((p) => ({ ...p, [key]: opt }));
                    }}
                    disabled={disabled}
                    style={[styles.chip, active && styles.chipActive]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active, disabled }}
                    accessibilityLabel={`${opt}. ${c.vibhakti} ${c.vacana}`}
                  >
                    <Text style={[styles.chipText, script("semibold"), active && styles.chipTextActive]}>
                      {opt}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      })}
      <Button
        label="Check"
        onPress={submit}
        disabled={!complete || disabled}
        block
        style={{ marginTop: space.md }}
      />
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
  stem: { fontSize: font.sizes.lg, color: color.ink },
  blankBlock: { marginBottom: space.md },
  blankTitle: {
    fontFamily: "Nunito_700Bold",
    fontWeight: "700",
    fontSize: font.sizes.sm,
    color: color.inkSoft,
    marginBottom: space.xs,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
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
  chipActive: { borderColor: color.saffron, backgroundColor: color.saffronLight },
  chipText: { fontSize: font.sizes.lg, color: color.ink },
  chipTextActive: { color: color.saffronDeep },
});
