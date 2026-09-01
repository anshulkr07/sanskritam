// TutorFull — the full-body mascot (raised hand, saṃskṛtam book). Used
// wherever there's room to show the whole figure rather than the circular
// conversation badge (TutorAvatar): the home path header and the lesson
// completion screen. A soft ground shadow keeps him from looking like he's
// floating; `celebrate` triggers the same sparkle-burst language as the
// circular avatar's "celebrating" state for visual consistency.

import React, { useEffect, useRef } from "react";
import { Image, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { color } from "../theme";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const TUTOR_FULL_IMG = require("../../assets/avatar/tutor-full.png");

interface TutorFullProps {
  height?: number;
  celebrate?: boolean;
}

function Sparkles({ active, size }: { active: boolean; size: number }) {
  const sparkle = useSharedValue(0);
  const prevActive = useRef(active);

  useEffect(() => {
    if (active && !prevActive.current) {
      sparkle.value = 0;
      sparkle.value = withSequence(
        withTiming(1, { duration: 700, easing: Easing.out(Easing.ease) }),
        withTiming(0, { duration: 500, easing: Easing.in(Easing.ease) }),
      );
    }
    prevActive.current = active;
  }, [active, sparkle]);

  const angles = [20, 65, 115, 160, 200, 250, 300, 340];
  const particleStyles = angles.map((angle) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useAnimatedStyle(() => {
      const dist = interpolate(sparkle.value, [0, 1], [0, size * 0.55]);
      const rad = (angle * Math.PI) / 180;
      return {
        position: "absolute" as const,
        top: size * 0.3,
        left: size / 2,
        width: 7,
        height: 7,
        borderRadius: 3.5,
        backgroundColor: color.gold,
        opacity: interpolate(sparkle.value, [0, 0.4, 1], [0, 1, 0]),
        transform: [
          { translateX: Math.cos(rad) * dist },
          { translateY: Math.sin(rad) * dist },
        ],
      };
    }),
  );

  return (
    <>
      {particleStyles.map((s, i) => (
        <Animated.View key={i} style={s} pointerEvents="none" />
      ))}
    </>
  );
}

export default function TutorFull({ height = 200, celebrate = false }: TutorFullProps) {
  const breathe = useSharedValue(0);
  const sway = useSharedValue(0);
  const bounce = useSharedValue(0);

  useEffect(() => {
    breathe.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2600, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
    sway.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 3400, easing: Easing.inOut(Easing.ease) }),
        withTiming(-1, { duration: 3400, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
  }, [breathe, sway]);

  useEffect(() => {
    if (celebrate) {
      bounce.value = 0;
      bounce.value = withSequence(
        withDelay(150, withSpring(1, { damping: 4, stiffness: 180 })),
        withDelay(300, withSpring(0, { damping: 8, stiffness: 150 })),
      );
    }
  }, [celebrate, bounce]);

  const width = height * (667 / 1000); // source aspect ratio

  const figureStyle = useAnimatedStyle(() => {
    const breatheScale = interpolate(breathe.value, [0, 1], [1, 1.015]);
    const bounceScale = interpolate(bounce.value, [0, 1], [1, 1.08]);
    const tiltDeg = interpolate(sway.value, [-1, 0, 1], [-1.5, 0, 1.5]);
    return {
      transform: [
        { scale: breatheScale * bounceScale },
        { rotate: `${tiltDeg}deg` },
      ],
    };
  });

  return (
    <View style={[styles.wrap, { width: width + 40, height: height + 24 }]}>
      <Sparkles active={celebrate} size={width} />
      <Animated.View style={[{ width, height }, figureStyle]}>
        <Image source={TUTOR_FULL_IMG} style={{ width, height }} resizeMode="contain" />
      </Animated.View>
      <View style={[styles.groundShadow, { width: width * 0.55 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "flex-end" },
  groundShadow: {
    height: 14,
    borderRadius: 999,
    backgroundColor: color.ink,
    opacity: 0.08,
    marginTop: -6,
  },
});
