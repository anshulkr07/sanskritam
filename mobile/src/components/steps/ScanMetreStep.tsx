// ScanMetreStep — Piṅgala's door (U15-2, U15-6).
//
// The engine scans the verse; weights are WITHHELD. The learner taps each
// syllable light (laghu) or heavy (guru) — the binary encoding made touchable
// before it is ever named. One weight off across the verse is near
// (off_by_one), named server-side. Colour never carries the weight alone:
// every syllable states L/G in text (§U5-3).

import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Button } from "../ui";
import { haptics } from "../../services/haptics";
import { color, font, radius, script, space } from "../../theme";
import { field, type StepInputProps } from "./types";

export default function ScanMetreStep({ step, disabled, onSubmit }: StepInputProps) {
  const payload = step.payload;
  const text = field<string>(payload, "text", "");
  const syllables = field<string[][]>(payload, "syllables", []);
  const flat = useMemo(() => syllables.flat(), [syllables]);
  const [marks, setMarks] = useState<Record<number, "L" | "G">>({});

  const complete = flat.length > 0 && flat.every((_, i) => marks[i]);

  const submit = () => {
    if (!complete || disabled) return;
    haptics.press();
    // Re-nest into lines to match the engine's weight shape.
    const weights: string[][] = [];
    let k = 0;
    for (const line of syllables) {
      weights.push(line.map((_, j) => marks[k + j] ?? ""));
      k += line.length;
    }
    onSubmit({ weights });
  };

  return (
    <View>
      <Text style={styles.prompt}>
        Mark every syllable — <Text style={styles.mark}>L</Text> light,{" "}
        <Text style={styles.mark}>G</Text> heavy:
      </Text>
      <Text style={[styles.verse, script("semibold")]}>{text}</Text>
      <View style={styles.strip} accessible accessibilityLabel={`${flat.length} syllables to mark`}>
        {flat.map((syl, i) => {
          const m = marks[i];
          return (
            <Pressable
              key={i}
              onPress={() => {
                if (disabled) return;
                haptics.tap();
                setMarks((prev) => ({ ...prev, [i]: prev[i] === "L" ? "G" : "L" }));
              }}
              disabled={disabled}
              style={[styles.syl, m === "G" && styles.sylHeavy, m === "L" && styles.sylLight]}
              accessibilityRole="button"
              accessibilityState={{ disabled }}
              accessibilityLabel={`${syl}. ${m ? (m === "G" ? "heavy" : "light") : "unmarked"}. Tap to mark.`}
            >
              <View style={[styles.bar, m === "G" && styles.barHeavy]} />
              <Text style={[styles.sylText, script("semibold")]}>{syl}</Text>
              <Text style={styles.weight}>{m ?? "·"}</Text>
            </Pressable>
          );
        })}
      </View>
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
    marginBottom: space.sm,
    lineHeight: 24,
  },
  mark: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800" },
  verse: { fontSize: font.sizes.lg, color: color.saffronText, marginBottom: space.md },
  strip: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  syl: {
    alignItems: "center",
    minWidth: 56,
    minHeight: 64,
    padding: space.xs,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  sylHeavy: { borderColor: color.saffron },
  sylLight: { borderColor: color.border },
  bar: { width: 20, height: 6, borderRadius: 3, backgroundColor: color.border, marginBottom: 4 },
  barHeavy: { height: 16, backgroundColor: color.saffron },
  sylText: { fontSize: font.sizes.base, color: color.ink },
  weight: {
    fontFamily: "Nunito_800ExtraBold",
    fontWeight: "800",
    fontSize: font.sizes.xs,
    color: color.inkSoft,
  },
});
