// TopicEmblem — the small picture on each basics card on the Kāla page.
//
// One plain drawing per card, in the card's own cream and gold, of the idea
// its page animates: rings inside rings for time, the Sun on the arc of
// Brahmā's day, fourteen Manus, a die, the Sun's swing north and south, six
// seasons, a full moon by its star, the bright and dark halves, the Moon's
// 12-degree lead, the weekday star and the ring of 27. Decoration only: the
// card's text says what it is.

import React from "react";
import { View } from "react-native";
import Svg, { Circle, Line, Path, Rect } from "react-native-svg";

import { onFill } from "../../theme";
import type { TopicId } from "../learn";
import { arcPath, polar, sectorPath, wedgePath } from "./geometry";

const SOFT = "rgba(255,248,238,0.45)";
const FAINT = "rgba(255,248,238,0.22)";
const SHADE = "rgba(0,0,0,0.28)";

function heptagram(cx: number, cy: number, r: number): string {
  // The seven by height round the circle, joined every third: the order of
  // the week (kala/basics.ts dayLords).
  let d = "";
  for (let i = 0; i <= 7; i++) {
    const p = polar(cx, cy, r, ((i * 3) % 7) * (360 / 7));
    d += `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)} `;
  }
  return d + "Z";
}

function Body({ id }: { id: TopicId }) {
  switch (id) {
    case "kala":
      return (
        <>
          {[23, 16, 9].map((r) => (
            <Circle key={r} cx={28} cy={28} r={r} fill="none" stroke={FAINT} strokeWidth={3} />
          ))}
          <Path d={arcPath(28, 28, 23, 0, 160)} fill="none" stroke={onFill.gold} strokeWidth={3} />
          <Path d={arcPath(28, 28, 16, 0, 250)} fill="none" stroke={onFill.gold} strokeWidth={3} />
          <Path d={arcPath(28, 28, 9, 0, 90)} fill="none" stroke={onFill.gold} strokeWidth={3} />
          <Circle cx={28} cy={28} r={2.5} fill={onFill.text} />
        </>
      );
    case "kalpa": {
      const sun = polar(28, 42, 22, 270 + 180 * 0.46);
      return (
        <>
          <Path d={arcPath(28, 42, 22, 270, 450)} fill="none" stroke={SOFT} strokeWidth={2} strokeDasharray="3 3" />
          <Line x1={2} y1={42} x2={54} y2={42} stroke={onFill.text} strokeWidth={2} />
          <Rect x={4} y={44} width={48} height={8} rx={3} fill={SHADE} />
          <Circle cx={sun.x} cy={sun.y} r={8} fill="rgba(242,200,121,0.3)" />
          <Circle cx={sun.x} cy={sun.y} r={5} fill={onFill.gold} />
        </>
      );
    }
    case "manvantara":
      return (
        <>
          {Array.from({ length: 14 }, (_, i) => {
            const row = Math.floor(i / 7);
            const x = 7 + (i % 7) * 7;
            const y = row === 0 ? 21 : 35;
            const n = i + 1;
            return n === 7 ? (
              <Circle key={n} cx={x} cy={y} r={4} fill={onFill.gold} />
            ) : (
              <Circle key={n} cx={x} cy={y} r={2.6} fill={n < 7 ? onFill.text : "none"} stroke={n < 7 ? "none" : SOFT} strokeWidth={1.2} />
            );
          })}
        </>
      );
    case "yuga":
      return (
        <>
          <Rect x={11} y={11} width={34} height={34} rx={7} fill={onFill.text} />
          {[
            [20, 20],
            [36, 20],
            [20, 36],
            [36, 36],
          ].map(([x, y]) => (
            <Circle key={`${x}${y}`} cx={x} cy={y} r={3.4} fill={SHADE} />
          ))}
        </>
      );
    case "ayana": {
      let d = "";
      for (let i = 0; i <= 24; i++) {
        const x = 4 + (i / 24) * 48;
        const y = 28 + 15 * Math.cos((i / 24) * 2 * Math.PI);
        d += `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)} `;
      }
      return (
        <>
          <Line x1={4} y1={28} x2={52} y2={28} stroke={FAINT} strokeWidth={1.5} strokeDasharray="2 3" />
          <Path d={d} fill="none" stroke={onFill.text} strokeWidth={2.2} />
          <Circle cx={28} cy={13} r={5} fill={onFill.gold} />
        </>
      );
    }
    case "ritu":
      return (
        <>
          {Array.from({ length: 6 }, (_, i) => (
            <Path key={i} d={sectorPath(28, 28, 12, 24, i * 60 + 3, (i + 1) * 60 - 3)} fill={i === 2 ? onFill.gold : i % 2 === 0 ? SOFT : FAINT} />
          ))}
        </>
      );
    case "masa":
      return (
        <>
          <Circle cx={24} cy={31} r={16} fill={onFill.text} />
          <Circle cx={24} cy={31} r={16} fill="none" stroke={SOFT} strokeWidth={1} />
          <Path d="M 47 7 L 48.6 12.4 L 54 14 L 48.6 15.6 L 47 21 L 45.4 15.6 L 40 14 L 45.4 12.4 Z" fill={onFill.gold} />
        </>
      );
    case "paksha":
      return (
        <>
          <Circle cx={28} cy={28} r={19} fill={SHADE} stroke={SOFT} strokeWidth={1.2} />
          <Path d="M 28 9 A 19 19 0 0 1 28 47 Z" fill={onFill.text} />
        </>
      );
    case "tithi": {
      const moon = polar(28, 30, 21, 72);
      return (
        <>
          <Path d={wedgePath(28, 30, 21, 0, 72)} fill="rgba(242,200,121,0.32)" />
          <Line x1={28} y1={30} x2={28} y2={9} stroke={SOFT} strokeWidth={1.4} strokeDasharray="2 2" />
          <Line x1={28} y1={30} x2={moon.x} y2={moon.y} stroke={onFill.text} strokeWidth={1.6} />
          <Circle cx={28} cy={5} r={4} fill={onFill.gold} />
          <Circle cx={28} cy={30} r={3.4} fill={onFill.text} />
          <Circle cx={moon.x} cy={moon.y} r={4.6} fill={onFill.text} />
        </>
      );
    }
    case "vara":
      return (
        <>
          <Path d={heptagram(28, 28, 22)} fill="none" stroke={onFill.text} strokeWidth={1.6} strokeLinejoin="round" />
          {Array.from({ length: 7 }, (_, i) => {
            const p = polar(28, 28, 22, i * (360 / 7));
            return <Circle key={i} cx={p.x} cy={p.y} r={i === 3 ? 4 : 2.6} fill={i === 3 ? onFill.gold : onFill.text} />;
          })}
        </>
      );
    case "nakshatra":
      return (
        <>
          {Array.from({ length: 27 }, (_, i) => {
            const a = i * (360 / 27);
            const p0 = polar(28, 28, 18, a);
            const p1 = polar(28, 28, 24, a);
            return <Line key={i} x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y} stroke={i % 3 === 0 ? onFill.text : SOFT} strokeWidth={1.4} />;
          })}
          <Circle cx={polar(28, 28, 21, 130).x} cy={polar(28, 28, 21, 130).y} r={4.4} fill={onFill.gold} />
        </>
      );
    default:
      return null;
  }
}

export default function TopicEmblem({ id, size = 48 }: { id: TopicId; size?: number }) {
  return (
    <View style={{ width: size, height: size }} accessible={false} importantForAccessibility="no-hide-descendants">
      <Svg width={size} height={size} viewBox="0 0 56 56">
        <Body id={id} />
      </Svg>
    </View>
  );
}
