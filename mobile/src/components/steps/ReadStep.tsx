// ReadStep — read a passage, as ungraded practice (U15-2).
//
// Reading is a reference posture (U13-3): no verdict, no streak, no score.
// The backend no-ops read attempts, so finishing the passage simply moves
// the lesson forward. Payload: { devanagari, iast?, gloss?, prompt? }.

import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { haptics } from "../../services/haptics";
import { useTypeScale } from "../../hooks/useTypeScale";
import { Button } from "../ui";
import { color, font, script, space } from "../../theme";
import { field, type StepInputProps } from "./types";

export default function ReadStep({ step, disabled, onSubmit }: StepInputProps) {
  const payload = step.payload;
  const devanagari = field<string>(payload, "devanagari", "");
  const iast = field<string>(payload, "iast", "");
  const gloss = field<string>(payload, "gloss", "");
  const prompt = field<string>(payload, "prompt", "Read this.");
  const { sized } = useTypeScale();

  const cont = () => {
    if (disabled) return;
    haptics.press();
    onSubmit({ read: true });
  };

  return (
    <View>
      <Text style={styles.prompt}>{prompt}</Text>
      <Text
        style={styles.practice}
        accessibilityRole="text"
        accessibilityLabel="Reading. Reading is not graded."
      >
        Reading — not graded.
      </Text>
      <View style={styles.card}>
        {!!devanagari && (
          <Text
            style={[styles.dev, script("semibold"), { fontSize: sized(20, { sanskrit: true }) }]}
            accessibilityRole="text"
            accessibilityLabel={devanagari}
          >
            {devanagari}
          </Text>
        )}
        {!!iast && (
          <Text style={styles.iast} accessibilityRole="text" accessibilityLabel={iast}>
            {iast}
          </Text>
        )}
        {!!gloss && <Text style={styles.gloss}>{gloss}</Text>}
      </View>
      <Button label="Continue" onPress={cont} disabled={disabled} block style={{ marginTop: space.md }} />
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
  practice: {
    fontFamily: "Nunito_500Medium",
    fontWeight: "500",
    fontSize: font.sizes.sm,
    color: color.inkSoft,
    marginBottom: space.md,
  },
  card: {
    padding: space.lg,
    borderRadius: 12,
    backgroundColor: color.surface,
    borderWidth: 2,
    borderColor: color.border,
  },
  dev: { color: color.ink, lineHeight: 32 },
  iast: {
    fontFamily: "Nunito_500Medium",
    fontWeight: "500",
    fontSize: font.sizes.base,
    color: color.inkSoft,
    marginTop: space.sm,
  },
  gloss: {
    fontFamily: "Nunito_500Medium",
    fontWeight: "500",
    fontSize: font.sizes.sm,
    color: color.inkSoft,
    marginTop: space.sm,
  },
});
