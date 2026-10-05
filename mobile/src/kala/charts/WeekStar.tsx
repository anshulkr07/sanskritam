// WeekStar — where the order of the week comes from.
//
// The seven stand round the circle as the Sūrya Siddhānta lists them, from
// the highest down (12.31): Saturn at the top, then clockwise Jupiter, Mars,
// the Sun, Venus, Mercury, the Moon. The lord of each day is the fourth on
// from the last, counting the last as one (12.78), so the line jumps three
// places at a time and draws a seven-pointed star that visits them in the
// order of the week. It draws itself, a day at a time, as `progress` runs 0
// to 1. Today's lord is gold.
//
// One image to a screen reader: the rows under it say the same.

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line } from "react-native-svg";

import { onFill, script } from "../../theme";
import { BY_HEIGHT, dayLords, GRAHAS_EN } from "../basics";
import { GRAHAS } from "../sanskritNames";
import { polar } from "./geometry";

const BASE = "rgba(255,248,238,0.18)";

interface Props {
  size: number;
  /** 0 Sunday. */
  today: number;
  progress: number;
  ground: string;
}

export default function WeekStar({ size, today, progress, ground }: Props) {
  const c = size / 2;
  const R = c - 50;
  const at = (weekday: number) => polar(c, c, R, BY_HEIGHT.indexOf(weekday) * (360 / 7));
  // Sunday to Saturday and back to Sunday: seven lines.
  const lords = dayLords();
  const order = [...lords.slice(1), lords[0], lords[1]];
  const drawn = progress * 7;

  return (
    <View style={{ width: size, height: size }} accessible={false} importantForAccessibility="no-hide-descendants">
      <Svg width={size} height={size}>
        <Circle cx={c} cy={c} r={R} fill="none" stroke={BASE} strokeWidth={1.5} />
        {order.slice(0, 7).map((w, i) => {
          if (drawn <= i) return null;
          const a = at(w);
          const b = at(order[i + 1]);
          const f = Math.min(1, drawn - i);
          return <Line key={i} x1={a.x} y1={a.y} x2={a.x + (b.x - a.x) * f} y2={a.y + (b.y - a.y) * f} stroke={onFill.text} strokeWidth={2} strokeLinecap="round" />;
        })}
        {BY_HEIGHT.map((w) => {
          const p = at(w);
          const isToday = w === today;
          return <Circle key={w} cx={p.x} cy={p.y} r={isToday ? 9 : 6.5} fill={isToday ? onFill.gold : onFill.text} stroke={ground} strokeWidth={2.5} />;
        })}
      </Svg>
      {BY_HEIGHT.map((w) => {
        const p = polar(c, c, R + 30, BY_HEIGHT.indexOf(w) * (360 / 7));
        const isToday = w === today;
        return (
          <View key={w} style={[styles.label, { left: p.x - 44, top: p.y - 22 }]}>
            <Text style={[styles.sa, script("semibold"), isToday && styles.today]}>{GRAHAS[w].nom}</Text>
            <Text style={[styles.en, isToday && styles.today]}>{GRAHAS_EN[w].replace(/^The /, "")}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { position: "absolute", width: 88, alignItems: "center" },
  sa: { fontSize: 18, lineHeight: 26, color: onFill.text },
  en: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: 11, color: onFill.soft, marginTop: -4 },
  today: { color: onFill.gold },
});
