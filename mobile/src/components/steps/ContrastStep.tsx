// ContrastStep — minimal pairs off the paradigm tensor (U15-2).
//
// Two forms that differ by one ending (बालके vs बालकेन): pick the role.
// Small, new, and the cheapest graded step in the phase — feature comparison
// grades it, so no reviewer ever sees it.

import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Button } from "../ui";
import { haptics } from "../../services/haptics";
import { color, font, radius, script, space } from "../../theme";
import { field, prose, type StepInputProps } from "./types";

interface Form {
  form: string;
  vibhakti: string;
  vacana: string;
}

export default function ContrastStep({ step, disabled, onSubmit }: StepInputProps) {
  const payload = step.payload;
  const a = field<Form>(payload, "a", { form: "", vibhakti: "", vacana: "" });
  const b = field<Form>(payload, "b", { form: "", vibhakti: "", vacana: "" });
  const prompt = prose(payload, "prompt", "Which form is which?");
  const [pick, setPick] = useState<"a" | "b" | null>(null);

  const submit = () => {
    if (!pick || disabled) return;
    haptics.press();
    onSubmit({ pick });
  };

  return (
    <View>
      <Text style={styles.prompt}>{prompt}</Text>
      <View style={styles.row}>
        {(
          [
            { key: "a", f: a },
            { key: "b", f: b },
          ] as const
        ).map(({ key, f }) => {
          const active = pick === key;
          return (
            <Pressable
              key={key}
              onPress={() => {
                if (disabled) return;
                haptics.tap();
                setPick(key);
              }}
              disabled={disabled}
              style={[styles.card, active && styles.cardActive]}
              accessibilityRole="radio"
              accessibilityState={{ selected: active, disabled }}
              accessibilityLabel={`${f.form}. Option ${key === "a" ? "one" : "two"}`}
            >
              <Text style={[styles.form, script("bold")]}>{f.form}</Text>
              <Text style={styles.sub}>
                {f.vibhakti} · {f.vacana}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Button
        label="Check"
        onPress={submit}
        disabled={!pick || disabled}
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
  row: { flexDirection: "row", gap: space.md },
  card: {
    flex: 1,
    alignItems: "center",
    padding: space.lg,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: color.border,
    backgroundColor: color.surface,
    minHeight: 96,
    justifyContent: "center",
  },
  cardActive: { borderColor: color.saffron, backgroundColor: color.saffronLight },
  form: { fontSize: font.sizes.xl, color: color.ink },
  sub: {
    fontFamily: "Nunito_500Medium",
    fontWeight: "500",
    fontSize: font.sizes.sm,
    color: color.inkSoft,
    marginTop: 4,
  },
});
