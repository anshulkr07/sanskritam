// VerdictSheet — the reward/feedback moment. A fixed bottom sheet that
// slides up with the verdict, fires haptics + a chime, and puts Continue
// directly under the thumb (no scrolling to find out what happened).
// Render inside a `position: relative` full-screen container; this overlays
// via `position: absolute`.

import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { haptics } from "../services/haptics";
import { sfx } from "../services/sfx";
import { color, font, radius, script, shadow, space } from "../theme";
import type { Verdict } from "../api/client";
import { Button } from "./ui";

interface VerdictSheetProps {
  visible: boolean;
  verdict: Verdict | null;
  abstained?: boolean;
  diagnosis?: string;
  targetSanskrit?: string;
  targetIast?: string;
  continueLabel: string;
  onContinue: () => void;
}

const TONE = {
  correct: { bg: color.okBg, fg: color.ok, title: "✓ Correct!" },
  off_by_one: { bg: color.warnBg, fg: color.warn, title: "≈ So close" },
  unsure: { bg: color.unsureBg, fg: color.unsure, title: "Hmm, uncertain" },
  incorrect: { bg: color.badBg, fg: color.bad, title: "✗ Not quite" },
} as const;

export default function VerdictSheet({
  visible,
  verdict,
  abstained,
  diagnosis,
  targetSanskrit,
  targetIast,
  continueLabel,
  onContinue,
}: VerdictSheetProps) {
  const translateY = useRef(new Animated.Value(220)).current;

  useEffect(() => {
    if (visible && verdict) {
      const isUnsure = verdict === "unsure" || abstained;
      if (verdict === "correct") {
        haptics.correct();
        sfx.correct();
      } else if (verdict === "off_by_one" || isUnsure) {
        haptics.near();
        sfx.near();
      } else {
        haptics.incorrect();
        sfx.incorrect();
      }
      Animated.timing(translateY, {
        toValue: 0,
        duration: 260,
        easing: Easing.out(Easing.back(1.1)),
        useNativeDriver: true,
      }).start();
    } else {
      translateY.setValue(220);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, verdict]);

  if (!visible || !verdict) return null;

  const isUnsure = verdict === "unsure" || !!abstained;
  const tone = isUnsure ? TONE.unsure : TONE[verdict];
  const showTarget = verdict !== "correct" && !isUnsure;

  return (
    <Animated.View
      style={[styles.wrap, { backgroundColor: tone.bg, transform: [{ translateY }] }]}
      pointerEvents="box-none"
    >
      <SafeAreaView edges={["bottom"]}>
        <View style={styles.body}>
          <Text style={[styles.title, { color: tone.fg }]}>{tone.title}</Text>
          <Text style={styles.diagnosis}>
            {isUnsure
              ? "I couldn't tell confidently — no penalty. Try listening again and repeating."
              : diagnosis || "Let's move on."}
          </Text>

          {showTarget && !!targetSanskrit && (
            <View style={styles.target}>
              <Text style={styles.targetHint}>The target:</Text>
              <Text style={[styles.targetSanskrit, script("bold")]}>{targetSanskrit}</Text>
              {!!targetIast && <Text style={styles.targetIast}>{targetIast}</Text>}
            </View>
          )}

          <Button
            label={continueLabel}
            tone={verdict === "correct" ? "ok" : "primary"}
            onPress={onContinue}
            block
            style={{ marginTop: space.md }}
          />
        </View>
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    ...shadow.card,
  },
  body: { padding: space.lg },
  title: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.lg, marginBottom: space.xs },
  diagnosis: { fontFamily: "Nunito_500Medium", fontWeight: "500", fontSize: font.sizes.base, color: color.ink, lineHeight: 22 },
  target: { marginTop: space.md },
  targetHint: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.sm, color: color.inkSoft, marginBottom: 4 },
  targetSanskrit: { fontSize: font.sizes.lg, color: color.ink },
  targetIast: { fontFamily: "Nunito_500Medium", fontWeight: "500", fontSize: font.sizes.base, color: color.inkSoft },
});
