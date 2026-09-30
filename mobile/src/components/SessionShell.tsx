// SessionShell — the top-level chrome for any exercise session.
// Uses Reanimated for smooth animated progress. Provides:
// - Close X (with confirm in tutor voice)
// - Animated progress track
// - Streak pill (optional)
// - Primary action pinned to bottom safe area
//
// U2-1: Created per UI_HANDOVER.md spec.

import React, { useCallback, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { Ionicons } from "@react-native-vector-icons/ionicons";

import { color, font, radius, shadow, space } from "../theme";
import { spring as springCfg } from "../motion";
import { haptics } from "../services/haptics";
import { Card } from "./ui";

interface SessionShellProps {
  progress: number; // 0..1 — animates on spring
  onQuit: () => void; // confirms before discarding progress
  hearts?: number; // omit → no hearts
  streak?: number; // optional streak pill
  children: React.ReactNode;
  primaryAction?: React.ReactNode; // pinned at bottom
}

export default function SessionShell({
  progress,
  onQuit,
  streak,
  children,
  primaryAction,
}: SessionShellProps) {
  const [confirming, setConfirming] = useState(false);
  const animProgress = useSharedValue(progress);

  // Spring to new progress value
  animProgress.value = withSpring(progress, springCfg.snappy);

  const barStyle = useAnimatedStyle(() => ({
    width: `${Math.max(0, Math.min(1, animProgress.value)) * 100}%`,
  }));

  const onQuitPress = useCallback(() => {
    haptics.press();
    setConfirming(true);
  }, []);

  const confirmQuit = useCallback(() => {
    setConfirming(false);
    onQuit();
  }, [onQuit]);

  const cancelQuit = useCallback(() => {
    setConfirming(false);
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable onPress={onQuitPress} style={styles.closeBtn} accessibilityRole="button" accessibilityLabel="Quit session">
          <Ionicons name="close" size={22} color={color.inkSoft} />
        </Pressable>
        <View style={styles.trackWrap}>
          <View style={styles.track}>
            <Animated.View style={[styles.fill, barStyle]} />
          </View>
        </View>
        {streak !== undefined && (
          <View style={styles.streakPill}>
            <Ionicons name="flame" size={14} color={color.saffron} />
            <Text style={styles.streakNum}>{streak}</Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.body}>{children}</View>

      {/* Confirmation sheet */}
      {confirming && (
        <View style={styles.confirmOverlay}>
          <Card style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>Leave this session?</Text>
            <Text style={styles.confirmHint}>
              Your progress is saved.
            </Text>
            <View style={styles.confirmRow}>
              <Pressable onPress={cancelQuit} style={styles.cancelBtn} accessibilityRole="button" accessibilityLabel="Stay in session">
                <Text style={styles.cancelBtnText}>Stay</Text>
              </Pressable>
              <Pressable onPress={confirmQuit} style={styles.quitBtn} accessibilityRole="button" accessibilityLabel="Leave session">
                <Text style={styles.quitBtnText}>Leave</Text>
              </Pressable>
            </View>
          </Card>
        </View>
      )}

      {/* Primary action pinned to bottom */}
      {primaryAction && <View style={styles.bottomBar}>{primaryAction}</View>}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    gap: space.sm,
    backgroundColor: color.bg,
    borderBottomWidth: 1,
    borderBottomColor: color.border,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: color.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  trackWrap: { flex: 1 },
  track: {
    height: 12,
    borderRadius: 6,
    backgroundColor: color.border,
    overflow: "hidden",
  },
  fill: {
    height: 12,
    borderRadius: 6,
    backgroundColor: color.saffron,
  },
  streakPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: color.surface,
    borderRadius: 999,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    gap: 3,
    ...shadow.card,
  },
  streakNum: {
    fontFamily: "Nunito_800ExtraBold",
    fontWeight: "800",
    fontSize: font.sizes.sm,
    color: color.ink,
  },
  body: { flex: 1 },
  bottomBar: {
    padding: space.md,
    backgroundColor: color.surface,
    borderTopWidth: 1,
    borderTopColor: color.border,
  },
  confirmOverlay: {
    position: "absolute",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
    padding: space.lg,
  },
  confirmCard: { width: "100%", maxWidth: 320, padding: space.lg },
  confirmTitle: {
    fontFamily: "Nunito_800ExtraBold",
    fontWeight: "800",
    fontSize: font.sizes.md,
    color: color.ink,
    marginBottom: space.xs,
  },
  confirmHint: {
    fontFamily: "Nunito_400Regular",
    fontWeight: "400",
    fontSize: font.sizes.sm,
    color: color.inkSoft,
    lineHeight: 20,
    marginBottom: space.lg,
  },
  confirmRow: { flexDirection: "row", gap: space.sm },
  cancelBtn: {
    flex: 1,
    paddingVertical: space.md,
    borderRadius: radius.md,
    backgroundColor: color.surfaceMuted,
    alignItems: "center",
  },
  cancelBtnText: {
    fontFamily: "Nunito_700Bold",
    fontWeight: "700",
    fontSize: font.sizes.base,
    color: color.ink,
  },
  quitBtn: {
    flex: 1,
    paddingVertical: space.md,
    borderRadius: radius.md,
    backgroundColor: color.bad,
    alignItems: "center",
  },
  quitBtnText: {
    fontFamily: "Nunito_700Bold",
    fontWeight: "700",
    fontSize: font.sizes.base,
    color: color.white,
  },
});