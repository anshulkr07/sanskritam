// MoonDial — the Moon as it looks now, inside a ring of the month's thirty
// tithis with the running one lit.
//
// The ring reads like a clock face: the first tithi starts at the top and
// they run clockwise, bright half down the right, dark half up the left. The
// Moon's shape comes from moonShape.ts.

import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import Svg, { Circle, Path } from "react-native-svg";

import { useReducedMotion } from "../hooks/useReducedMotion";
import { duration, easing } from "../motion";
import { onFill } from "../theme";
import { litPath } from "./moonShape";

/** The Moon's unlit side, on a slate fill: a darker slate, not black. */
const MOON_SHADE = "#1C2B4F";
const RING = "rgba(255,248,238,0.30)";
const RING_STROKE = 3.5;
const RING_GAP = 1.8;

interface Props {
  /** The Moon's angle from the Sun, 0 to 360. */
  elongation: number;
  /** The running tithi, 1 to 30. */
  tithiNumber: number;
  size?: number;
}

export default function MoonDial({ elongation, tithiNumber, size = 76 }: Props) {
  const reduced = useReducedMotion();
  const c = size / 2;
  const r = c - 5;
  const circumference = 2 * Math.PI * r;
  const segment = circumference / 30;
  const dash = segment - RING_GAP;
  const moonR = Math.round(size * 0.29);
  const turn = (tithiNumber - 1) * 12;

  // The marker travels round the ring to today's tithi once, on arrival.
  // Decorative, so Reduce Motion places it at once.
  const angle = useSharedValue(reduced ? turn : 0);
  useEffect(() => {
    angle.value = reduced ? turn : withTiming(turn, { duration: duration.telling, easing: easing.standard });
  }, [angle, reduced, turn]);
  const markerStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${angle.value}deg` }] }));

  return (
    <View style={{ width: size, height: size }} accessible={false} importantForAccessibility="no-hide-descendants">
      <Svg width={size} height={size}>
        <Circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          stroke={RING}
          strokeWidth={RING_STROKE}
          strokeDasharray={`${dash} ${RING_GAP}`}
          strokeDashoffset={-RING_GAP / 2}
          transform={`rotate(-90 ${c} ${c})`}
        />
        <Circle cx={c} cy={c} r={moonR} fill={MOON_SHADE} />
        <Path d={litPath(elongation, moonR, c, c)} fill={onFill.text} />
      </Svg>
      <Animated.View style={[styles.marker, markerStyle]}>
        <Svg width={size} height={size}>
          {/* The first tithi's segment, at the top. The wrapper turns it into place. */}
          <Circle
            cx={c}
            cy={c}
            r={r}
            fill="none"
            stroke={onFill.gold}
            strokeWidth={RING_STROKE}
            strokeDasharray={`${dash} ${circumference}`}
            strokeDashoffset={-RING_GAP / 2}
            transform={`rotate(-90 ${c} ${c})`}
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  marker: { ...StyleSheet.absoluteFill, pointerEvents: "none" },
});
