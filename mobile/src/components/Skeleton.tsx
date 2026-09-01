// Skeleton loaders — shimmer placeholders that show the shape of real content
// while it loads. Uses Reanimated for smooth shimmer animation.
// Respects reduce-motion: renders a static block.

import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

import { color, radius, space } from "../theme";
import { useReducedMotion } from "../hooks/useReducedMotion";

interface SkeletonProps {
  width?: number | string;
  height?: number;
  radius?: number;
  style?: any;
}

export function Skeleton({
  width = "100%",
  height = 20,
  radius: r = radius.sm,
  style,
}: SkeletonProps) {
  const reduced = useReducedMotion();
  const shimmer = useSharedValue(0);

  useEffect(() => {
    if (!reduced) {
      shimmer.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
    }
    return () => cancelAnimation(shimmer);
  }, [reduced, shimmer]);

  const animStyle = useAnimatedStyle(() => {
    if (reduced) return {};
    return {
      opacity: 0.4 + shimmer.value * 0.6,
    };
  });

  return (
    <View
      style={[
        styles.base,
        { width: width as any, height, borderRadius: r },
        style,
      ]}
    >
      <Animated.View style={[styles.fill, animStyle]} />
    </View>
  );
}

interface SkeletonGroupProps {
  count: number;
  gap?: number;
  height?: number;
  radius?: number;
}

export function SkeletonGroup({
  count,
  gap = 12,
  height = 20,
  radius: r = radius.sm,
}: SkeletonGroupProps) {
  return (
    <View style={{ gap }}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} height={height} radius={r} />
      ))}
    </View>
  );
}

export function HomeSkeleton() {
  return (
    <View style={styles.homeSkeleton}>
      <View style={styles.homeRow}>
        <Skeleton width={80} height={80} radius={40} />
        <View style={{ flex: 1, gap: 8 }}>
          <Skeleton height={18} />
          <Skeleton height={14} width="60%" />
        </View>
      </View>
      <Skeleton height={64} radius={radius.xl} style={{ marginBottom: space.lg }} />
      <Skeleton height={18} width="50%" style={{ marginBottom: space.sm }} />
      <Skeleton height={16} />
      <Skeleton height={12} width="70%" style={{ marginTop: space.sm }} />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: color.surfaceMuted,
    overflow: "hidden",
  },
  fill: {
    flex: 1,
    backgroundColor: color.surfaceMuted,
  },
  homeSkeleton: {
    padding: space.lg,
    gap: space.md,
  },
  homeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    marginBottom: space.sm,
  },
});