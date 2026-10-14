import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Path, Text as SvgText } from "react-native-svg";
import Animated, { FadeIn } from "react-native-reanimated";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { color, fill, font } from "../theme";

function minuteAt(iso: string, tz: string): number | null {
  try {
    const d = new Date(iso);
    if (!Number.isFinite(d.getTime())) return null;
    const parts = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(d);
    return Number(parts.find(p => p.type === "hour")?.value) * 60 + Number(parts.find(p => p.type === "minute")?.value);
  } catch { return null; }
}
const point = (minutes: number, r = 62) => {
  const a = minutes / 1440 * Math.PI * 2 - Math.PI / 2;
  return { x: 82 + Math.cos(a) * r, y: 82 + Math.sin(a) * r };
};

/** A 24-hour dial: each arc is a published window, the hand is local time. */
export default function MuhuratClock({ times, tz, place }: { times: { key: string; s: string; e: string }[]; tz: string; place: string }) {
  const reduced = useReducedMotion();
  const [now, setNow] = useState(() => new Date().toISOString());
  useEffect(() => { const timer = setInterval(() => setNow(new Date().toISOString()), 60000); return () => clearInterval(timer); }, []);
  const minute = minuteAt(now, tz);
  const hand = point(minute ?? 0, 44);
  return <Animated.View entering={reduced ? undefined : FadeIn.duration(650)} style={styles.wrap}>
    <Svg width={164} height={164} viewBox="0 0 164 164" accessible={false}>
      <Circle cx={82} cy={82} r={62} fill="none" stroke={color.border} strokeWidth={8} />
      {times.filter(t => !["rahu", "bhadra", "tithi"].includes(t.key)).map((t, i) => {
        const s = minuteAt(t.s, tz), e = minuteAt(t.e, tz);
        if (s == null || e == null) return null;
        const duration = (e - s + 1440) % 1440;
        const a = point(s), b = point(e);
        if (!duration) return <Circle key={i} cx={a.x} cy={a.y} r={4} fill={fill.saffron} />;
        return <Path key={i} d={`M ${a.x} ${a.y} A 62 62 0 ${duration > 720 ? 1 : 0} 1 ${b.x} ${b.y}`} fill="none" stroke={fill.saffron} strokeWidth={8} strokeLinecap="round" />;
      })}
      {[0, 6, 12, 18].map(h => { const p = point(h * 60, 76); return <SvgText key={h} x={p.x} y={p.y + 3} textAnchor="middle" fill={color.inkSoft} fontSize={10}>{h === 0 ? "12 AM" : h === 12 ? "12 PM" : h === 6 ? "6 AM" : "6 PM"}</SvgText>; })}
      {minute != null && <Line x1={82} y1={82} x2={hand.x} y2={hand.y} stroke={color.ink} strokeWidth={2} />}
      <Circle cx={82} cy={82} r={4} fill={color.ink} />
    </Svg>
    <View style={{ flex: 1, gap: 6 }}><Text style={styles.title}>Your day's rhythm</Text><Text style={styles.copy}>{place}</Text><Text style={styles.copy}>Orange arcs mark the listed practice windows. The hand shows the time here now.</Text></View>
  </Animated.View>;
}
const styles = StyleSheet.create({ wrap: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 }, title: { fontFamily: "Nunito_800ExtraBold", color: color.ink, fontSize: font.sizes.base }, copy: { fontFamily: "Nunito_600SemiBold", color: color.inkSoft, fontSize: font.sizes.sm, lineHeight: 20 } });
