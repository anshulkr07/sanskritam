// SessionComplete — celebration screen shown after a practice session finishes.
// Staggered animation sequence: guru blessing pose, headline, XP counter roll-up,
// stat row, streak flame, actions. Uses motion tokens from motion.ts.
// Respects reduce-motion.
//
// U2-3: Created per UI_HANDOVER.md spec.

import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  Easing,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  withSpring,
} from "react-native-reanimated";

import { color, font, radius, script, shadow, space } from "../theme";
import { duration, easing, spring as springCfg } from "../motion";
import { Button, Card } from "../components/ui";
import Confetti from "../components/Confetti";
import { Gesture, GuruNative } from "../components/guru";
import { useReducedMotion } from "../hooks/useReducedMotion";

interface SessionCompleteProps {
  correctCount: number;
  totalCount: number;
  streakDays?: number;
  freezeUsed?: boolean;
  xpEarned?: number;
  isPersonalBest?: boolean;
  onOneMore: () => void;
  onDone: () => void;
}

export default function SessionComplete({
  correctCount,
  totalCount,
  streakDays = 0,
  freezeUsed = false,
  xpEarned,
  isPersonalBest = false,
  onOneMore,
  onDone,
}: SessionCompleteProps) {
  const reduced = useReducedMotion();
  const accuracy = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
  const xp = xpEarned ?? correctCount * 10 + totalCount * 2;

  // Staggered entrance values
  const guruOpacity = useSharedValue(reduced ? 1 : 0);
  const guruScale = useSharedValue(reduced ? 1 : 0.6);
  const headlineOpacity = useSharedValue(reduced ? 1 : 0);
  const headlineY = useSharedValue(reduced ? 0 : 20);
  const xpOpacity = useSharedValue(reduced ? 1 : 0);
  const xpCount = useSharedValue(reduced ? xp : 0);
  const statOpacity = useSharedValue(reduced ? 1 : 0);
  const statY = useSharedValue(reduced ? 0 : 16);
  const actionOpacity = useSharedValue(reduced ? 1 : 0);

  const isGood = correctCount >= totalCount * 0.7;

  useEffect(() => {
    if (reduced) return;
    // Guru enters
    guruOpacity.value = withTiming(1, { duration: duration.telling, easing: easing.entrance });
    guruScale.value = withSpring(1, springCfg.gentle);

    // Headline
    headlineOpacity.value = withDelay(300, withTiming(1, { duration: duration.base, easing: easing.entrance }));
    headlineY.value = withDelay(300, withTiming(0, { duration: duration.base, easing: easing.entrance }));

    // XP counter rolls up
    xpOpacity.value = withDelay(600, withTiming(1, { duration: duration.quick }));
    xpCount.value = withDelay(700, withTiming(xp, { duration: 800, easing: Easing.out(Easing.cubic) }));

    // Stat row
    statOpacity.value = withDelay(900, withTiming(1, { duration: duration.base, easing: easing.entrance }));
    statY.value = withDelay(900, withTiming(0, { duration: duration.base, easing: easing.entrance }));

    // Actions
    actionOpacity.value = withDelay(1200, withTiming(1, { duration: duration.base }));
  }, [reduced, xp, guruOpacity, guruScale, headlineOpacity, headlineY, xpOpacity, xpCount, statOpacity, statY, actionOpacity]);

  const guruStyle = useAnimatedStyle(() => ({
    opacity: guruOpacity.value,
    transform: [{ scale: guruScale.value }],
  }));

  const headlineStyle = useAnimatedStyle(() => ({
    opacity: headlineOpacity.value,
    transform: [{ translateY: headlineY.value }],
  }));

  const xpStyle = useAnimatedStyle(() => ({
    opacity: xpOpacity.value,
  }));

  const statStyle = useAnimatedStyle(() => ({
    opacity: statOpacity.value,
    transform: [{ translateY: statY.value }],
  }));

  const actionStyle = useAnimatedStyle(() => ({
    opacity: actionOpacity.value,
  }));

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <Confetti active={isGood && !reduced} />

      <View style={styles.body}>
        {/* Guru blessing */}
        <Animated.View style={[styles.guruWrap, guruStyle]}>
          <GuruNative size={190} state={isGood ? "celebrating" : "encouraging"} gesture={Gesture.Abhaya} />
        </Animated.View>

        {/* Headline */}
        <Animated.View style={[styles.headlineWrap, headlineStyle]}>
          <Text style={[styles.headlineSanskrit, script("extrabold")]}>
            {isGood ? "साधु!" : "शुभम्"}
          </Text>
          <Text style={styles.headlineGloss}>
            {isGood ? "Excellent practice!" : "Good effort!"}
          </Text>
        </Animated.View>

        {/* XP Counter */}
        <Animated.View style={[styles.xpWrap, xpStyle]}>
          <Text style={styles.xpValue}>+{xp}</Text>
          <Text style={styles.xpLabel}>XP earned</Text>
        </Animated.View>

        {/* Stats row */}
        <Animated.View style={[styles.statRow, statStyle]}>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: color.ok }]}>{accuracy}%</Text>
            <Text style={styles.statLabel}>Accuracy</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{correctCount}</Text>
            <Text style={styles.statLabel}>New words</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{totalCount}</Text>
            <Text style={styles.statLabel}>Exercises</Text>
          </View>
        </Animated.View>

        {/* Streak */}
        {streakDays > 0 && (
          <View style={styles.streakBanner}>
            <Text style={styles.streakFlame}>🔥</Text>
            <Text style={[styles.streakDay, script("bold")]}>
              {streakDays}-day streak{freezeUsed ? " (saved by freeze)" : ""}
            </Text>
          </View>
        )}

        {/* Personal best badge */}
        {isPersonalBest && (
          <View style={styles.pbBadge}>
            <Text style={styles.pbText}>🏆 Personal best!</Text>
          </View>
        )}

        {/* Actions */}
        <Animated.View style={[styles.actionRow, actionStyle]}>
          <Button label="One more" tone="primary" onPress={onOneMore} block style={{ flex: 1 }} />
          <Button label="Done" tone="neutral" onPress={onDone} block style={{ flex: 1 }} />
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg },
  body: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: space.xl,
    gap: space.md,
  },
  guruWrap: { marginBottom: space.sm },
  headlineWrap: { alignItems: "center" },
  headlineSanskrit: { fontSize: font.sizes.xxl, color: color.ink, lineHeight: 44 },
  headlineGloss: { fontFamily: "Nunito_500Medium", fontWeight: "500", fontSize: font.sizes.base, color: color.inkSoft, marginTop: 2 },
  xpWrap: { alignItems: "center", marginBottom: space.xs },
  xpValue: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.display, color: color.gold },
  xpLabel: { fontFamily: "Nunito_500Medium", fontWeight: "500", fontSize: font.sizes.sm, color: color.inkSoft },
  statRow: { flexDirection: "row", gap: space.xl, backgroundColor: color.surface, borderRadius: radius.lg, padding: space.lg, ...shadow.card },
  stat: { alignItems: "center" },
  statValue: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.xl, color: color.ink },
  statLabel: { fontFamily: "Nunito_500Medium", fontWeight: "500", fontSize: font.sizes.xs, color: color.inkSoft, marginTop: 2 },
  streakBanner: { flexDirection: "row", alignItems: "center", gap: space.xs, backgroundColor: color.surfaceMuted, borderRadius: radius.pill, paddingHorizontal: space.md, paddingVertical: space.sm },
  streakFlame: { fontSize: 18 },
  streakDay: { fontSize: font.sizes.sm, color: color.ink },
  pbBadge: { backgroundColor: color.gold, borderRadius: radius.pill, paddingHorizontal: space.md, paddingVertical: space.xs, opacity: 0.9 },
  pbText: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.sm, color: color.white },
  actionRow: { flexDirection: "row", gap: space.sm, marginTop: space.md, alignSelf: "stretch" },
});