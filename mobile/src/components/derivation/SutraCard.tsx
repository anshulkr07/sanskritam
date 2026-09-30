// SutraCard — the numbered-rule card for the animated derivation (U7-1).
// Shared so U4-5 (sandhi visualisation) and U7-2 (proof drawer) reuse it
// instead of writing a second implementation. Rule code in mono, sūtra in
// Devanagari beneath. Bookkeeping steps (form unchanged) render dimmed.

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInRight,
} from "react-native-reanimated";

import { color, font, radius, script, space } from "../../theme";
import { duration } from "../../motion";

interface SutraCardProps {
  code: string;
  sutraDevanagari: string;
  dimmed?: boolean; // a bookkeeping step (form did not change)
  index?: number;
}

export default function SutraCard({
  code,
  sutraDevanagari,
  dimmed = false,
  index = 0,
}: SutraCardProps) {
  return (
    <Animated.View
      entering={SlideInRight.duration(duration.base)}
      exiting={FadeOut.duration(duration.quick)}
      style={[styles.card, dimmed && styles.dimmed]}
      accessible
      accessibilityLabel={`Sūtra ${code}. ${sutraDevanagari}`}
      accessibilityRole="text"
    >
      <Text style={styles.code}>{code}</Text>
      <Text style={[styles.sutra, script("semibold")]} numberOfLines={2}>
        {sutraDevanagari || "-"}
      </Text>
      {dimmed ? <Text style={styles.note}>no change</Text> : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.surface,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderLeftWidth: 3,
    borderLeftColor: color.saffron,
    marginVertical: space.xs,
    minHeight: 52,
  },
  dimmed: {
    opacity: 0.55,
    borderLeftColor: color.inkFaint,
  },
  code: {
    fontFamily: "monospace",
    fontSize: font.sizes.sm,
    color: color.saffronText,
    fontWeight: "700",
  },
  sutra: {
    fontSize: font.sizes.base,
    color: color.ink,
    marginTop: 2,
  },
  note: {
    fontSize: font.sizes.xs,
    color: color.inkFaint,
    marginTop: 2,
  },
});
