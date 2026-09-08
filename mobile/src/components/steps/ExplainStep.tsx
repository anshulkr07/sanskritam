// ExplainStep — the authored kind. Prose, ≤120 words, nothing to answer.
// The body field survives as the lesson's summary; this step does the
// teaching one screen at a time. "Got it" advances without grading —
// attempting an explain step touches neither mastery nor schedule (P23-3).

import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { Button } from "../ui";
import { haptics } from "../../services/haptics";
import { color, font, script, space } from "../../theme";
import { field, type StepInputProps } from "./types";

export default function ExplainStep({ step, disabled, onSubmit }: StepInputProps) {
  const text = field<string>(step.payload, "text", "");
  return (
    <View accessible accessibilityLabel={`Explanation. ${text}`}>
      <Text style={[styles.text, script("regular")]}>{text}</Text>
      <Button
        label={disabled ? "Noted" : "Got it"}
        onPress={() => {
          haptics.tap();
          onSubmit({});
        }}
        disabled={disabled}
        block
        style={{ marginTop: space.lg }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  text: {
    fontSize: font.sizes.base,
    color: color.ink,
    lineHeight: 26,
  },
});
