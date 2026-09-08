// FetchError (U10-3) — shared retryable failure state. A failed fetch says so
// and offers retry: a card that is empty forever because a promise rejected
// is indistinguishable from a card with no content (§2.11, one layer out).
// Never renders a verdict; a network failure during an attempt must never read
// as a wrong answer.

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { color, font, radius, shadow, space } from "../theme";

export default function FetchError({
  label,
  onRetry,
  retryLabel = "Retry",
}: {
  label: string;
  onRetry: () => void;
  retryLabel?: string;
}) {
  return (
    <View style={styles.wrap} accessible accessibilityRole="alert" accessibilityLabel={`${label} ${retryLabel}`}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        onPress={onRetry}
        style={styles.btn}
        accessibilityRole="button"
        accessibilityLabel={retryLabel}
        hitSlop={8}
      >
        <Text style={styles.btnText}>{retryLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", padding: space.lg, gap: space.sm },
  label: {
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600",
    fontSize: font.sizes.sm,
    color: color.inkSoft,
    textAlign: "center",
  },
  btn: {
    backgroundColor: color.surface,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    minHeight: 44,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: color.saffron,
    ...shadow.button,
  },
  btnText: {
    fontFamily: "Nunito_800ExtraBold",
    fontWeight: "800",
    fontSize: font.sizes.sm,
    color: color.saffronText,
  },
});
