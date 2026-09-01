// Home — one tab among several now (see MainTabs.tsx). Conversation, Daily
// Śloka, and Varṇamālā used to be buried here as path nodes; they're each
// their own tab now, so Home only owns what's actually Home's: the mascot
// greeting, today's stats, and the entry point into a practice session.

import React, { useEffect, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import Animated, {
  Easing,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
} from "react-native-reanimated";

import type { LearnerProfile } from "../api/client";
import { Card, ProgressBar } from "../components/ui";
import TutorFull from "../components/TutorFull";
import { haptics } from "../services/haptics";
import { useAuth } from "../store/auth";
import type { TabScreenProps } from "../navigation/types";
import { color, font, radius, script, shadow, space } from "../theme";

type Props = TabScreenProps<"Home">;

export default function HomeScreen({ navigation }: Props) {
  const { learner, refresh } = useAuth();
  const [profile, setProfile] = useState<LearnerProfile | null>(learner);

  useEffect(() => {
    refresh().then(setProfile);
  }, [refresh]);

  const streak = profile?.streak ?? 0;
  const ratio = profile?.sanskrit_ratio ?? 0.3;
  const ratioPct = Math.round(ratio * 100);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Top bar */}
      <View style={styles.topbar}>
        <View style={styles.pill}>
          <Ionicons name="flame" size={16} color={color.saffron} />
          <Text style={styles.pillNum}>{streak}</Text>
        </View>
        <View style={styles.pill}>
          <Ionicons name="language" size={14} color={color.inkSoft} />
          <Text style={styles.pillNum}>{ratioPct}%</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {/* Mascot greeting */}
        <View style={styles.greetRow}>
          <TutorFull height={110} />
          <View style={styles.greetBubble}>
            <Text style={[styles.greeting, script("extrabold")]}>नमस्ते, {profile?.display_name ?? "learner"}!</Text>
            <Text style={styles.subline}>Ready for today's practice?</Text>
          </View>
        </View>

        {/* Practice entry point */}
        <PracticeNode onPress={() => navigation.navigate("Challenge", {})} />

        {/* Level progress */}
        <Card style={styles.levelCard}>
          <View style={styles.levelRow}>
            <Text style={styles.levelTitle}>Level 1 · First words</Text>
          </View>
          <ProgressBar progress={Math.min(1, ratio + 0.2)} />
          <Text style={styles.levelCaption}>
            {ratioPct}% Sanskrit in your tutor's speech — it grows as you do.
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Practice CTA: the one thing Home actually launches ────────────────────

function PracticeNode({ onPress }: { onPress: () => void }) {
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
    return () => cancelAnimation(pulse);
  }, [pulse]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  return (
    <Pressable
      onPress={() => { haptics.tap(); onPress(); }}
      style={({ pressed }) => [styles.practice, pressed && styles.practicePressed]}
    >
      <Animated.View style={[styles.practiceIcon, pulseStyle]}>
        <Ionicons name="create" size={30} color={color.white} />
      </Animated.View>
      <View style={styles.practiceText}>
        <Text style={styles.practiceLabel}>Start practice</Text>
        <Text style={styles.practiceHint}>8 adaptive exercises · word bank + typing</Text>
      </View>
      <Ionicons name="chevron-forward" size={22} color={color.white} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg },
  topbar: { flexDirection: "row", justifyContent: "flex-end", paddingHorizontal: space.lg, paddingVertical: space.sm, gap: space.sm },
  pill: { flexDirection: "row", alignItems: "center", backgroundColor: color.surface, borderRadius: 999, paddingHorizontal: space.md, paddingVertical: space.xs, gap: 4, ...shadow.card },
  pillNum: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.sm, color: color.ink },
  body: { padding: space.lg },
  greetRow: { flexDirection: "row", alignItems: "center", gap: space.sm, marginBottom: space.lg },
  greetBubble: { flex: 1, backgroundColor: color.surface, borderRadius: radius.lg, padding: space.md, ...shadow.card },
  greeting: { fontSize: font.sizes.md, color: color.ink },
  subline: { fontFamily: "Nunito_400Regular", fontWeight: "400", fontSize: font.sizes.sm, color: color.inkSoft, marginTop: 2, lineHeight: 20 },
  practice: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    backgroundColor: color.saffron,
    borderRadius: radius.xl,
    padding: space.md,
    marginBottom: space.lg,
    ...shadow.button,
  },
  practicePressed: { transform: [{ translateY: 2 }] },
  practiceIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  practiceText: { flex: 1 },
  practiceLabel: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.md, color: color.white },
  practiceHint: { fontFamily: "Nunito_500Medium", fontWeight: "500", fontSize: font.sizes.sm, color: "rgba(255,255,255,0.9)", marginTop: 2 },
  levelCard: { marginTop: space.sm },
  levelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: space.sm },
  levelTitle: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.base, color: color.ink },
  levelCaption: { fontFamily: "Nunito_400Regular", fontWeight: "400", fontSize: font.sizes.sm, color: color.inkSoft, marginTop: space.sm },
});
