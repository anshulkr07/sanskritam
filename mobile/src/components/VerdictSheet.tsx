// VerdictSheet — the reward/feedback moment. A fixed bottom sheet that
// slides up with the verdict, fires haptics + a chime, and puts Continue
// directly under the thumb (no scrolling to find out what happened).
// Render inside a `position: relative` full-screen container; this overlays
// via `position: absolute`.
//
// U0-4: migrated from legacy react-native Animated to Reanimated.
// Uses motion tokens from motion.ts.

import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from "react-native-reanimated";

import { haptics } from "../services/haptics";
import { sfx } from "../services/sfx";
import { announceVerdict } from "../utils/announce";
import { color, font, radius, script, shadow, space } from "../theme";
import { duration, easing, spring as springCfg } from "../motion";
import type { Verdict } from "../api/client";
import { Button } from "./ui";

interface VerdictSheetProps {
  visible: boolean;
  verdict: Verdict | null;
  abstained?: boolean;
  diagnosis?: string;
  /** P9-3 grammar_note from POST /attempts — explains the MEANING of the
   * missed ending on off_by_one (derivation answers the form). Shown only
   * on a confident grammatical miss, never on unsure. */
  grammarNote?: string | null;
  targetSanskrit?: string;
  targetIast?: string;
  continueLabel: string;
  onContinue: () => void;
}

const TONE = {
  correct:    { bg: color.okBg, fg: color.okText, title: "✓ Correct!" },
  off_by_one: { bg: color.warnBg, fg: color.warnText, title: "≈ So close" },
  unsure:     { bg: color.unsureBg, fg: color.unsureText, title: "Hmm, uncertain" },
  incorrect:  { bg: color.badBg, fg: color.badText, title: "✗ Not quite" },
} as const;

export default function VerdictSheet({
  visible,
  verdict,
  abstained,
  diagnosis,
  grammarNote,
  targetSanskrit,
  targetIast,
  continueLabel,
  onContinue,
}: VerdictSheetProps) {
  const translateY = useSharedValue(220);

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
      // U5-1: VoiceOver needs an explicit announcement (the alert role +
      // live region cover TalkBack). Unsure announces the SYSTEM's failure.
      announceVerdict(isUnsure ? "unsure" : verdict);
      // Use the motion tokens — overshoot preserves the existing Easing.back feel
      translateY.value = withTiming(0, {
        duration: duration.base,
        easing: easing.overshoot,
      });
    } else {
      translateY.value = 220;
    }
  }, [visible, verdict, abstained, translateY]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!visible || !verdict) return null;

  const isUnsure = verdict === "unsure" || !!abstained;
  const tone = isUnsure ? TONE.unsure : TONE[verdict];
  const showTarget = verdict !== "correct" && !isUnsure;

  return (
    <Animated.View
      style={[styles.wrap, { backgroundColor: tone.bg }, sheetStyle]}
      pointerEvents="box-none"
      accessibilityRole="alert"
      accessibilityLabel={`Verdict: ${verdict === "correct" ? "correct" : verdict === "off_by_one" ? "close" : verdict === "unsure" ? "uncertain" : "incorrect"}`}
      accessibilityLiveRegion="polite"
    >
      <SafeAreaView edges={["bottom"]}>
        <View style={styles.body}>
          <Text style={[styles.title, { color: tone.fg }]} accessibilityRole="header">{tone.title}</Text>
          <Text style={styles.diagnosis}>
            {isUnsure
              ? "I couldn't tell confidently — no penalty. Try listening again and repeating."
              : diagnosis || "Let's move on."}
          </Text>
          {!isUnsure && !!grammarNote && (
            <View style={styles.grammarNote}>
              <Text style={styles.grammarNoteLabel}>Why this ending?</Text>
              <Text style={styles.grammarNoteText}>{grammarNote}</Text>
            </View>
          )}

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
  grammarNote: {
    marginTop: space.sm,
    backgroundColor: color.surface,
    borderRadius: radius.md,
    padding: space.sm,
  },
  grammarNoteLabel: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.sm, color: color.saffronDeep, marginBottom: 2 },
  grammarNoteText: { fontFamily: "Nunito_500Medium", fontWeight: "500", fontSize: font.sizes.sm, color: color.ink, lineHeight: 20 },
  target: { marginTop: space.md },
  targetHint: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.sm, color: color.inkSoft, marginBottom: 4 },
  targetSanskrit: { fontSize: font.sizes.lg, color: color.ink },
  targetIast: { fontFamily: "Nunito_500Medium", fontWeight: "500", fontSize: font.sizes.base, color: color.inkSoft },
});