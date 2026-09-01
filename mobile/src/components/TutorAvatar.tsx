// TutorAvatar — the visual face of the Shabd tutor (architecture §12 extension).
//
// A stylized 2D character illustration animated with react-native-reanimated.
// Six states: idle, speaking, thinking, listening, celebrating, encouraging.
// "speaking" drives a small mouth-shaped overlay that flutters open on an
// irregular rhythm for as long as TTS audio is actually playing, plus a
// head bob + sway and emanating sound rings. This is not phoneme-accurate
// lip-sync — Bulbul doesn't return viseme timing — but it's timed to real
// playback duration rather than a fixed loop, which is what actually reads
// as "talking" at this size.
//
// No new API calls, no local models, zero marginal cost.

import React, { useEffect, useRef } from "react";
import { Image, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";

import { color } from "../theme";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const TUTOR_IMG = require("../../assets/avatar/tutor-portrait.png");

export type AvatarState =
  | "idle"
  | "speaking"
  | "thinking"
  | "listening"
  | "celebrating"
  | "encouraging";

interface TutorAvatarProps {
  state: AvatarState;
  size?: number;
}

// ── Ring burst (sound waves while speaking) ──────────────────────────────────

function SpeakingRings({ size, active }: { size: number; active: boolean }) {
  const ring1 = useSharedValue(0);
  const ring2 = useSharedValue(0);
  const ring3 = useSharedValue(0);

  useEffect(() => {
    if (active) {
      ring1.value = 0;
      ring1.value = withRepeat(
        withTiming(1, { duration: 1500, easing: Easing.out(Easing.ease) }),
        -1,
        false,
      );
      ring2.value = 0;
      ring2.value = withDelay(
        400,
        withRepeat(
          withTiming(1, { duration: 1500, easing: Easing.out(Easing.ease) }),
          -1,
          false,
        ),
      );
      ring3.value = 0;
      ring3.value = withDelay(
        800,
        withRepeat(
          withTiming(1, { duration: 1500, easing: Easing.out(Easing.ease) }),
          -1,
          false,
        ),
      );
    } else {
      cancelAnimation(ring1);
      cancelAnimation(ring2);
      cancelAnimation(ring3);
      ring1.value = withTiming(0, { duration: 300 });
      ring2.value = withTiming(0, { duration: 300 });
      ring3.value = withTiming(0, { duration: 300 });
    }
  }, [active, ring1, ring2, ring3]);

  const makeRingStyle = (val: SharedValue<number>) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useAnimatedStyle(() => ({
      position: "absolute" as const,
      width: size,
      height: size,
      borderRadius: size / 2,
      borderWidth: 2,
      borderColor: color.saffron,
      opacity: interpolate(val.value, [0, 1], [0.5, 0]),
      transform: [{ scale: interpolate(val.value, [0, 1], [1, 1.6]) }],
    }));

  const r1Style = makeRingStyle(ring1);
  const r2Style = makeRingStyle(ring2);
  const r3Style = makeRingStyle(ring3);

  if (!active) return null;

  return (
    <>
      <Animated.View style={r1Style} pointerEvents="none" />
      <Animated.View style={r2Style} pointerEvents="none" />
      <Animated.View style={r3Style} pointerEvents="none" />
    </>
  );
}

// ── Thinking dots ────────────────────────────────────────────────────────────

function ThinkingDots({ active }: { active: boolean }) {
  const dot1 = useSharedValue(0);
  const dot2 = useSharedValue(0);
  const dot3 = useSharedValue(0);

  useEffect(() => {
    if (active) {
      const bounce = (delay: number) =>
        withDelay(
          delay,
          withRepeat(
            withSequence(
              withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) }),
              withTiming(0, { duration: 400, easing: Easing.in(Easing.ease) }),
            ),
            -1,
            false,
          ),
        );
      dot1.value = bounce(0);
      dot2.value = bounce(150);
      dot3.value = bounce(300);
    } else {
      cancelAnimation(dot1);
      cancelAnimation(dot2);
      cancelAnimation(dot3);
      dot1.value = withTiming(0, { duration: 200 });
      dot2.value = withTiming(0, { duration: 200 });
      dot3.value = withTiming(0, { duration: 200 });
    }
  }, [active, dot1, dot2, dot3]);

  const dotStyle = (val: SharedValue<number>) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useAnimatedStyle(() => ({
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: color.saffron,
      marginHorizontal: 3,
      opacity: interpolate(val.value, [0, 1], [0.3, 1]),
      transform: [{ translateY: interpolate(val.value, [0, 1], [0, -8]) }],
    }));

  const d1 = dotStyle(dot1);
  const d2 = dotStyle(dot2);
  const d3 = dotStyle(dot3);

  if (!active) return null;

  return (
    <View style={styles.dotsContainer}>
      <Animated.View style={d1} />
      <Animated.View style={d2} />
      <Animated.View style={d3} />
    </View>
  );
}

// ── Sparkle burst (celebrate) ────────────────────────────────────────────────

function CelebrationSparkles({ active, size }: { active: boolean; size: number }) {
  const sparkle = useSharedValue(0);

  useEffect(() => {
    if (active) {
      sparkle.value = 0;
      sparkle.value = withSequence(
        withTiming(1, { duration: 600, easing: Easing.out(Easing.ease) }),
        withTiming(0, { duration: 400, easing: Easing.in(Easing.ease) }),
      );
    } else {
      cancelAnimation(sparkle);
      sparkle.value = 0;
    }
  }, [active, sparkle]);

  const particleStyle = (angle: number) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useAnimatedStyle(() => {
      const dist = interpolate(sparkle.value, [0, 1], [0, size * 0.5]);
      const rad = (angle * Math.PI) / 180;
      return {
        position: "absolute" as const,
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: color.gold,
        opacity: interpolate(sparkle.value, [0, 0.5, 1], [0, 1, 0]),
        transform: [
          { translateX: Math.cos(rad) * dist },
          { translateY: Math.sin(rad) * dist },
        ],
      };
    });

  const angles = [0, 45, 90, 135, 180, 225, 270, 315];
  const particleStyles = angles.map((a) => particleStyle(a));

  if (!active) return null;

  return (
    <>
      {particleStyles.map((s, i) => (
        <Animated.View key={i} style={s} pointerEvents="none" />
      ))}
    </>
  );
}

// ── Listening pulse ring ─────────────────────────────────────────────────────

function ListeningPulse({ active, size }: { active: boolean; size: number }) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (active) {
      pulse.value = 0;
      pulse.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 800, easing: Easing.out(Easing.ease) }),
          withTiming(0, { duration: 800, easing: Easing.in(Easing.ease) }),
        ),
        -1,
        false,
      );
    } else {
      cancelAnimation(pulse);
      pulse.value = withTiming(0, { duration: 300 });
    }
  }, [active, pulse]);

  const pulseStyle = useAnimatedStyle(() => ({
    position: "absolute" as const,
    width: size + 16,
    height: size + 16,
    borderRadius: (size + 16) / 2,
    borderWidth: 3,
    borderColor: color.bad,
    opacity: interpolate(pulse.value, [0, 1], [0.15, 0.5]),
    transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 1.15]) }],
  }));

  if (!active) return null;

  return <Animated.View style={pulseStyle} pointerEvents="none" />;
}

// ── Talking mouth (faux lip-sync) ────────────────────────────────────────────
// A small shape at the illustration's mouth position that flutters open at
// irregular intervals — real syllables aren't evenly spaced, so a metronome
// reads as fake. Driven purely by JS-thread setTimeout, not a fixed
// withRepeat loop, so it can vary duration and target height per beat.

function TalkingMouth({ active, imgSize }: { active: boolean; imgSize: number }) {
  const openAmt = useSharedValue(0);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    if (active) {
      const flutter = () => {
        if (cancelled) return;
        const target = 0.2 + Math.random() * 0.8;
        const duration = 65 + Math.random() * 85;
        openAmt.value = withTiming(target, { duration, easing: Easing.inOut(Easing.quad) });
        timer = setTimeout(flutter, duration);
      };
      flutter();
    } else {
      cancelAnimation(openAmt);
      openAmt.value = withTiming(0, { duration: 150 });
    }

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [active, openAmt]);

  const mouthWidth = imgSize * 0.12;
  const closedH = imgSize * 0.012;
  const openH = imgSize * 0.075;

  const mouthStyle = useAnimatedStyle(() => ({
    position: "absolute" as const,
    left: imgSize * 0.5 - mouthWidth / 2,
    top: imgSize * 0.445,
    width: mouthWidth,
    height: interpolate(openAmt.value, [0, 1], [closedH, openH]),
    borderRadius: mouthWidth * 0.35,
    backgroundColor: "#3D1A12",
    opacity: interpolate(openAmt.value, [0, 1], [0.5, 0.88]),
  }));

  return <Animated.View style={mouthStyle} pointerEvents="none" />;
}

// ── Main avatar ──────────────────────────────────────────────────────────────

export default function TutorAvatar({ state, size = 120 }: TutorAvatarProps) {
  const prevStateRef = useRef(state);

  // Core animation values
  const breathe = useSharedValue(0);
  const headBob = useSharedValue(0);
  const sway = useSharedValue(0);
  const celebBounce = useSharedValue(0);
  const nodAnim = useSharedValue(0);
  const tiltAnim = useSharedValue(0);
  const glowOpacity = useSharedValue(0);

  // ─ Breathing: always on ─
  useEffect(() => {
    breathe.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─ State-driven animations ─
  useEffect(() => {
    const prev = prevStateRef.current;
    prevStateRef.current = state;

    // Head bob + sway (speaking) — a little more animated than a plain bob,
    // like someone actually emphasizing words, not a bobblehead metronome.
    if (state === "speaking") {
      headBob.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 320, easing: Easing.inOut(Easing.ease) }),
          withTiming(-1, { duration: 320, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
      sway.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
          withTiming(-1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
      glowOpacity.value = withTiming(1, { duration: 300 });
    } else {
      cancelAnimation(headBob);
      cancelAnimation(sway);
      headBob.value = withTiming(0, { duration: 200 });
      sway.value = withTiming(0, { duration: 200 });
      if (prev === "speaking") {
        glowOpacity.value = withTiming(0, { duration: 400 });
      }
    }

    // Celebration bounce
    if (state === "celebrating") {
      celebBounce.value = 0;
      celebBounce.value = withSequence(
        withSpring(1, { damping: 4, stiffness: 200 }),
        withDelay(400, withSpring(0, { damping: 8, stiffness: 150 })),
      );
      glowOpacity.value = withSequence(
        withTiming(1, { duration: 200 }),
        withDelay(800, withTiming(0, { duration: 400 })),
      );
    }

    // Encouraging nod
    if (state === "encouraging") {
      nodAnim.value = 0;
      nodAnim.value = withSequence(
        withTiming(1, { duration: 250 }),
        withTiming(0, { duration: 250 }),
        withTiming(1, { duration: 250 }),
        withTiming(0, { duration: 250 }),
      );
    }

    // Thinking tilt
    if (state === "thinking") {
      tiltAnim.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
          withTiming(-1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
    } else {
      cancelAnimation(tiltAnim);
      tiltAnim.value = withTiming(0, { duration: 300 });
    }

    // Listening — lean forward slightly
    if (state === "listening") {
      glowOpacity.value = withTiming(0.6, { duration: 300 });
    } else if (prev === "listening") {
      glowOpacity.value = withTiming(0, { duration: 400 });
    }
  }, [state, headBob, sway, celebBounce, nodAnim, tiltAnim, glowOpacity]);

  // ─ Composed animated style ─
  const avatarStyle = useAnimatedStyle(() => {
    const breatheScale = interpolate(breathe.value, [0, 1], [1, 1.02]);
    const bobY = interpolate(headBob.value, [-1, 0, 1], [3, 0, -3]);
    const swayX = interpolate(sway.value, [-1, 0, 1], [-2, 0, 2]);
    const bounceScale = interpolate(celebBounce.value, [0, 1], [1, 1.15]);
    const nodY = interpolate(nodAnim.value, [0, 1], [0, 4]);
    const tiltDeg = interpolate(tiltAnim.value, [-1, 0, 1], [-4, 0, 4]);

    return {
      transform: [
        { scale: breatheScale * bounceScale },
        { translateY: bobY + nodY },
        { translateX: swayX },
        { rotate: `${tiltDeg}deg` },
      ],
    };
  });

  // ─ Glow ring ─
  const glowStyle = useAnimatedStyle(() => ({
    position: "absolute" as const,
    width: size + 8,
    height: size + 8,
    borderRadius: (size + 8) / 2,
    borderWidth: 2.5,
    borderColor: color.saffron,
    opacity: glowOpacity.value * 0.6,
  }));

  const imgSize = size - 8; // padding inside the ring

  return (
    <View style={[styles.wrapper, { width: size + 20, height: size + 20 }]}>
      {/* Background glow for active states */}
      <Animated.View style={glowStyle} />

      {/* Listening pulse */}
      <ListeningPulse active={state === "listening"} size={size} />

      {/* Sound rings (speaking) */}
      <View accessibilityElementsHidden={true}>
        <SpeakingRings size={size} active={state === "speaking"} />
      </View>

      {/* Celebration sparkles */}
      <View accessibilityElementsHidden={true}>
        <CelebrationSparkles active={state === "celebrating"} size={size} />
      </View>

      {/* Character image */}
      <Animated.View
        style={[
          styles.imageContainer,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
          avatarStyle,
        ]}
      >
        <View style={{ width: imgSize, height: imgSize }}>
          <Image
            source={TUTOR_IMG}
            style={{
              width: imgSize,
              height: imgSize,
              borderRadius: imgSize / 2,
            }}
            resizeMode="cover"
          />
          <TalkingMouth active={state === "speaking"} imgSize={imgSize} />
        </View>
      </Animated.View>

      {/* Thinking dots */}
      <ThinkingDots active={state === "thinking"} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  imageContainer: {
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.surfaceMuted,
    borderWidth: 3,
    borderColor: color.saffron,
  },
  dotsContainer: {
    position: "absolute",
    bottom: -4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    shadowColor: color.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
});
