// AchievementReveal (U3-4) — the badge moment. A bottom sheet that springs up
// with the motif word-mark, the Sanskrit name, and one Continue button.
//
// Skippable by tapping (§3.7), instant under Reduce Motion (§3.4), fires
// sfx.badgeUnlock + haptics once on mount (U6-2 family). No Lottie art yet —
// the motif renders as a Sanskrit word-mark until owner-supplied lotus /
// kalasha / conch art lands. Do NOT add generic trophy iconography.

import React, { useEffect } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { haptics } from "../services/haptics";
import { sfx } from "../services/sfx";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { color, font, radius, script, shadow, space } from "../theme";
import type { AchievementDef } from "../services/achievements";

export default function AchievementReveal({
  queue,
  onDone,
}: {
  queue: AchievementDef[];
  onDone: () => void;
}) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(reduced ? 1 : 0.6);
  const current = queue[0];

  useEffect(() => {
    if (current) {
      haptics.correct();
      sfx.badgeUnlock();
      if (!reduced) scale.value = withSpring(1, { damping: 12, stiffness: 140 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  if (!current) return null;

  return (
    <Modal transparent animationType={reduced ? "none" : "fade"} onRequestClose={onDone}>
      <Pressable
        style={styles.scrim}
        onPress={onDone}
        accessibilityRole="button"
        accessibilityLabel={`Achievement unlocked: ${current.en}. Dismiss.`}
      >
        <Animated.View style={[styles.card, cardStyle]}>
          <Text style={[styles.motif, script("bold")]}>{current.motif}</Text>
          <Text style={[styles.sa, script("bold")]}>{current.sa}</Text>
          <Text style={styles.en}>{current.en}</Text>
          <Pressable
            onPress={onDone}
            style={styles.btn}
            accessibilityRole="button"
            accessibilityLabel="Continue"
          >
            <Text style={styles.btnText}>Continue</Text>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: "rgba(30,18,8,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: space.lg,
  },
  card: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    padding: space.xl,
    alignItems: "center",
    minWidth: 280,
    ...shadow.card,
  },
  motif: { fontSize: font.sizes.xxl, color: color.saffronText },
  sa: { fontSize: font.sizes.lg, color: color.ink, marginTop: space.sm },
  en: {
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600",
    fontSize: font.sizes.sm,
    color: color.inkSoft,
    marginTop: 4,
  },
  btn: {
    marginTop: space.lg,
    backgroundColor: color.saffron,
    borderRadius: radius.md,
    paddingHorizontal: space.xl,
    minHeight: 44,
    justifyContent: "center",
    ...shadow.button,
  },
  btnText: {
    fontFamily: "Nunito_800ExtraBold",
    fontWeight: "800",
    fontSize: font.sizes.base,
    color: color.white,
  },
});
