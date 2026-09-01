// Confetti — particle burst for celebration moments.
// Uses a simple Reanimated-based approach since full Skia Canvas
// integration needs more testing. ~40 particles with gravity animation.
// Skipped entirely under reduce-motion.
//
// The CelebrationSparkles in TutorAvatar/TutorFull already provide
// the particle language. This adds a lightweight overlay burst.

import React, { useEffect, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  interpolate,
} from "react-native-reanimated";

import { useReducedMotion } from "../hooks/useReducedMotion";

interface ConfettiProps {
  active: boolean;
  particleCount?: number;
}

const COLORS = ["#E85B25", "#F2B33D", "#2FA84F", "#FFD700", "#FF6347", "#FFF"];

function Particle({
  index,
  total,
  active,
}: {
  index: number;
  total: number;
  active: boolean;
}) {
  const progress = useSharedValue(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (active && !reduced) {
      const delay = index * (1400 / total) * 0.3;
      progress.value = 0;
      progress.value = withDelay(
        delay,
        withTiming(1, { duration: 1200, easing: Easing.out(Easing.ease) }),
      );
    } else {
      progress.value = 0;
    }
  }, [active, index, total, progress, reduced]);

  const color = COLORS[index % COLORS.length];
  const angle = (index / total) * 360;
  const rad = (angle * Math.PI) / 180;
  const dist = 40 + (index % 5) * 20;

  const style = useAnimatedStyle(() => ({
    position: "absolute" as const,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: color,
    opacity: interpolate(progress.value, [0, 0.3, 1], [0, 1, 0]),
    transform: [
      { translateX: Math.cos(rad) * dist * progress.value },
      { translateY: -20 + Math.sin(rad) * dist * progress.value },
      { rotate: `${angle * progress.value}deg` },
    ],
  }));

  if (!active || reduced) return null;

  return <Animated.View style={style} pointerEvents="none" />;
}

export default function Confetti({
  active,
  particleCount = 24,
}: ConfettiProps) {
  if (!active) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {Array.from({ length: particleCount }).map((_, i) => (
        <Particle key={i} index={i} total={particleCount} active={active} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 50,
  },
});