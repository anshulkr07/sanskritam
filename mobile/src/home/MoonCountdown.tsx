import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";

import { useReducedMotion } from "../hooks/useReducedMotion";
import { onFill, space } from "../theme";
import { homeMoment, moonCountdown, type MoonMilestone } from "./todayDetails";

export default function MoonCountdown({ moon, now, tz }: { moon: MoonMilestone; now: Date; tz: string }) {
  const reduced = useReducedMotion();
  const glow = useSharedValue(0);
  useEffect(() => {
    cancelAnimation(glow);
    glow.value = reduced ? 0 : withRepeat(withSequence(withTiming(1, { duration: 2200 }), withTiming(0, { duration: 2200 })), -1);
    return () => cancelAnimation(glow);
  }, [glow, reduced]);
  const halo = useAnimatedStyle(() => ({ opacity: 0.15 + glow.value * 0.18, transform: [{ scale: 1 + glow.value * 0.12 }] }));
  return (
    <View style={styles.row}>
      <View style={styles.moon} accessible={false} importantForAccessibility="no-hide-descendants">
        <Animated.View style={[styles.halo, halo]} />
        <Svg width={40} height={40}>
          <Circle cx={20} cy={20} r={12} fill={moon.full ? onFill.text : "#1C2B4F"} stroke={onFill.text} strokeWidth={1} />
        </Svg>
      </View>
      <View style={styles.text}>
        <Text style={styles.title}>{moonCountdown(moon, now, tz)}</Text>
        <Text style={styles.subtitle}>{moon.full ? "Full-moon lunar day" : "New-moon lunar day"}{!moon.underway ? ` · ${homeMoment(moon.at, tz, now)}` : ""}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space.sm, paddingVertical: space.sm, marginTop: space.xs, borderTopWidth: 1, borderTopColor: onFill.faint },
  moon: { width: 40, height: 40, justifyContent: "center", alignItems: "center" },
  halo: { position: "absolute", width: 36, height: 36, borderRadius: 18, backgroundColor: onFill.gold },
  text: { flex: 1, minWidth: 0 },
  title: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 15, lineHeight: 21, color: onFill.text },
  subtitle: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: 12, lineHeight: 18, color: onFill.soft, marginTop: 2 },
});
