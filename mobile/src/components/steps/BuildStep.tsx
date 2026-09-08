// BuildStep — assemble a sentence from tiles, as ungraded practice (U15-2).
//
// Reuses WordBank (tap-to-place kept, drag via Gesture.Pan). Practice is
// never assessment: the backend no-ops build attempts (correct, graded
// False, mastery/schedule untouched), so arranging is drill, not a quiz.
// Payload: { sentence, corpus?, prompt? }.

import React from "react";
import { StyleSheet, Text, View } from "react-native";

import WordBank from "../WordBank";
import { haptics } from "../../services/haptics";
import { color, font, script, space } from "../../theme";
import { field, type StepInputProps } from "./types";

export default function BuildStep({ step, disabled, onSubmit }: StepInputProps) {
  const payload = step.payload;
  const sentence = field<string>(payload, "sentence", "");
  const corpus = field<string[]>(payload, "corpus", []);
  const prompt = field<string>(payload, "prompt", "Arrange the words.");

  if (!sentence.trim()) {
    return (
      <View>
        <Text style={styles.prompt}>{prompt}</Text>
        <Text style={styles.note}>Nothing to arrange yet — continue.</Text>
      </View>
    );
  }

  return (
    <View>
      <Text style={styles.prompt}>{prompt}</Text>
      <Text
        style={styles.practice}
        accessibilityRole="text"
        accessibilityLabel="Practice. Arranging words is not graded."
      >
        Practice — arranging is not graded.
      </Text>
      <View style={styles.bank}>
        <WordBank
          target={sentence}
          corpus={corpus}
          disabled={disabled}
          onSubmit={(assembled: string) => {
            haptics.press();
            onSubmit({ assembled });
          }}
        />
      </View>
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
  bank: { marginTop: space.sm },
  note: {
    fontFamily: "Nunito_500Medium",
    fontWeight: "500",
    fontSize: font.sizes.base,
    color: color.inkSoft,
  },
});
