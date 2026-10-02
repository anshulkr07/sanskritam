// DayWheel — the learner's civil day as one turn of a 24-hour dial.
//
// Midnight sits at the bottom and noon at the top, so the daylight arc lies
// across the top the way the Sun crosses the sky. Outside the ring run the
// day's named stretches: a solid line for a good one, a broken line for one
// that is avoided, so the two are told apart by shape and not by colour
// alone. A marker rides the ring at the present moment.
//
// Drawn on a deep fill. The whole wheel is one image to a screen reader: the
// rows under it say everything it shows.

import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import Svg, { Circle, G, Line, Path, Text as SvgText } from "react-native-svg";

import { useReducedMotion } from "../../hooks/useReducedMotion";
import { duration, easing } from "../../motion";
import { onFill } from "../../theme";
import type { WindowKey } from "../engine";
import { arcPath, polar } from "./geometry";

export interface WheelWindow {
  key: WindowKey;
  good: boolean;
  /** Minutes since the place's midnight. */
  from: number;
  to: number;
}

interface Props {
  size: number;
  /** Minutes since the place's midnight. */
  sunrise: number;
  sunset: number;
  windows: WheelWindow[];
  now: number;
  /** The stretch picked out in the list below, if any. */
  selected: WindowKey | null;
  /** The panel's own colour, to ring the marker with. */
  ground: string;
  /** The centre: the time now, and what is running. */
  time: string;
  state: string;
}

const NIGHT = "rgba(255,248,238,0.16)";
const TICK = "rgba(255,248,238,0.55)";
const RING = 16;

/** Where a minute of the day sits on the dial: midnight at the bottom. */
function degOf(minutes: number): number {
  return (minutes / 1440) * 360 + 180;
}

export default function DayWheel({ size, sunrise, sunset, windows, now, selected, ground, time, state }: Props) {
  const reduced = useReducedMotion();
  const c = size / 2;
  const R = c - 34;
  const track = R + 17;

  // The marker sweeps round from midnight once, then follows the minutes.
  const target = degOf(now);
  const turn = useSharedValue(reduced ? target : 180);
  useEffect(() => {
    turn.value = reduced ? target : withTiming(target, { duration: duration.telling, easing: easing.standard });
  }, [turn, reduced, target]);
  const handStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.value}deg` }] }));

  const hours = Array.from({ length: 24 }, (_, h) => h);

  return (
    <View style={{ width: size, height: size }} accessible={false} importantForAccessibility="no-hide-descendants">
      <Svg width={size} height={size}>
        <Circle cx={c} cy={c} r={R} fill="none" stroke={NIGHT} strokeWidth={RING} />
        <Path d={arcPath(c, c, R, degOf(sunrise), degOf(sunset))} fill="none" stroke={onFill.gold} strokeWidth={RING} />

        {hours.map((h) => {
          const major = h % 6 === 0;
          const a = degOf(h * 60);
          const p0 = polar(c, c, R - RING / 2 - 3, a);
          const p1 = polar(c, c, R - RING / 2 - (major ? 10 : 6), a);
          return <Line key={h} x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y} stroke={TICK} strokeWidth={major ? 1.6 : 1} />;
        })}
        {[0, 6, 12, 18].map((h) => {
          const p = polar(c, c, R - RING / 2 - 21, degOf(h * 60));
          return (
            <SvgText key={h} x={p.x} y={p.y + 4} fill={onFill.soft} fontSize={11} fontFamily="Nunito_700Bold" fontWeight="700" textAnchor="middle">
              {h}
            </SvgText>
          );
        })}

        {windows.map((w) => {
          const on = selected === w.key;
          const dim = selected !== null && !on;
          return (
            <Path
              key={w.key}
              d={arcPath(c, c, track, degOf(w.from), degOf(w.to))}
              fill="none"
              stroke={on ? onFill.gold : onFill.text}
              strokeWidth={on ? 9 : 6}
              strokeDasharray={w.good ? undefined : "3 3"}
              opacity={dim ? 0.35 : 1}
            />
          );
        })}

        {[sunrise, sunset].map((m, i) => {
          const p = polar(c, c, R, degOf(m));
          return <Circle key={i} cx={p.x} cy={p.y} r={3.5} fill={onFill.text} />;
        })}
      </Svg>

      <Animated.View style={[styles.layer, handStyle]}>
        <Svg width={size} height={size}>
          <G>
            <Line x1={c} y1={c - 50} x2={c} y2={c - R + RING / 2 + 2} stroke={onFill.text} strokeWidth={1.5} />
            <Circle cx={c} cy={c - R} r={8} fill={onFill.text} stroke={ground} strokeWidth={3} />
          </G>
        </Svg>
      </Animated.View>

      <View style={[styles.layer, styles.centre]}>
        <Text style={styles.time}>{time}</Text>
        <Text style={styles.state} numberOfLines={1}>
          {state}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { ...StyleSheet.absoluteFill, pointerEvents: "none" },
  centre: { alignItems: "center", justifyContent: "center" },
  time: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 26, color: onFill.text },
  state: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: 12.5, color: onFill.soft, maxWidth: 84, textAlign: "center" },
});
