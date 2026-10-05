// SunSwing — the Sun's swing north and south across one calendar year.
//
// The curve is how far north or south of the equator the Sun stands, from
// the engine's Sun, January on the left. Its top and bottom are the
// solstices, where the Sun itself turns. The shaded stretch is the
// almanac's northward half, from the Sun's entry into Makara to its entry
// into Karka, which comes some 24 or 25 days after each turn. The Sun runs along
// the curve to today as `progress` goes 0 to 1.
//
// One image to a screen reader: the lines under it say the same.

import React from "react";
import { View } from "react-native";
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from "react-native-svg";

import { onFill } from "../../theme";
import type { AyanaModel } from "../basics";

const SHADE = "rgba(242,200,121,0.20)";
const AXIS = "rgba(255,248,238,0.3)";
const MONTH_INITIALS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

interface Props {
  width: number;
  model: AyanaModel;
  progress: number;
  ground: string;
  /** Labels for the two sign entries, Makara first. */
  entryLabels: [string, string];
}

export default function SunSwing({ width, model, progress, ground, entryLabels }: Props) {
  const height = 200;
  const left = 56;
  const right = 8;
  const top = 26;
  const bottom = 26;
  const plotW = width - left - right;
  const plotH = height - top - bottom;
  const mid = top + plotH / 2;
  const amp = plotH / 2 - 8;
  const x = (at01: number) => left + at01 * plotW;
  const y = (dec: number) => mid - (dec / 23.44) * amp;
  const decAt = (at01: number) => {
    const c = model.curve;
    const f = Math.max(0, Math.min(c.length - 1.0001, at01 * (c.length - 1)));
    const i = Math.floor(f);
    return c[i].dec + (c[i + 1].dec - c[i].dec) * (f - i);
  };

  const path = model.curve.map((p, i) => `${i === 0 ? "M" : "L"} ${x(p.at01).toFixed(1)} ${y(p.dec).toFixed(1)}`).join(" ");
  const makara = model.entries.find((e) => e.sign === 9);
  const karka = model.entries.find((e) => e.sign === 3);
  const sunAt = model.now01 * progress;
  const year = model.start.getUTCFullYear();
  const span = model.end.getTime() - model.start.getTime();
  const monthAt = (m: number) => (Date.UTC(year, m, 1) - model.start.getTime()) / span;

  const text = (tx: number, ty: number, s: string, anchor: "start" | "middle" | "end", fill: string = onFill.soft) => (
    <>
      <SvgText x={tx} y={ty} fill={ground} stroke={ground} strokeWidth={3} fontSize={10} fontFamily="Nunito_800ExtraBold" fontWeight="800" textAnchor={anchor}>
        {s}
      </SvgText>
      <SvgText x={tx} y={ty} fill={fill} fontSize={10} fontFamily="Nunito_800ExtraBold" fontWeight="800" textAnchor={anchor}>
        {s}
      </SvgText>
    </>
  );

  return (
    <View style={{ width, height }} accessible={false} importantForAccessibility="no-hide-descendants">
      <Svg width={width} height={height}>
        {makara && karka && <Rect x={x(makara.at01)} y={top} width={x(karka.at01) - x(makara.at01)} height={plotH} fill={SHADE} />}
        {makara && <Line x1={x(makara.at01)} y1={top - 4} x2={x(makara.at01)} y2={top + plotH} stroke={onFill.gold} strokeWidth={1.2} strokeDasharray="3 3" />}
        {karka && <Line x1={x(karka.at01)} y1={top - 4} x2={x(karka.at01)} y2={top + plotH} stroke={onFill.gold} strokeWidth={1.2} strokeDasharray="3 3" />}
        {makara && text(x(makara.at01) + 3, top - 8, entryLabels[0], "start", onFill.text)}
        {karka && text(x(karka.at01) + 3, top - 8, entryLabels[1], "start", onFill.text)}

        <Line x1={left} y1={mid} x2={left + plotW} y2={mid} stroke={AXIS} strokeWidth={1} strokeDasharray="2 4" />
        {text(left - 6, top + 12, "north", "end")}
        {text(left - 6, mid + 3.5, "equator", "end")}
        {text(left - 6, top + plotH - 4, "south", "end")}

        <Path d={path} fill="none" stroke={onFill.text} strokeWidth={2.4} />

        {model.turns.map((t) => (
          <Circle key={t.at01} cx={x(t.at01)} cy={y(decAt(t.at01))} r={5} fill={ground} stroke={onFill.text} strokeWidth={2} />
        ))}

        {MONTH_INITIALS.map((m, i) => (
          <React.Fragment key={i}>
            <Line x1={x(monthAt(i))} y1={top + plotH} x2={x(monthAt(i))} y2={top + plotH + 4} stroke={AXIS} strokeWidth={1} />
            <SvgText x={x((monthAt(i) + monthAt(i + 1)) / 2)} y={height - 8} fill={onFill.soft} fontSize={10} fontFamily="Nunito_700Bold" fontWeight="700" textAnchor="middle">
              {m}
            </SvgText>
          </React.Fragment>
        ))}

        <Line x1={x(sunAt)} y1={top} x2={x(sunAt)} y2={top + plotH} stroke={onFill.soft} strokeWidth={1} />
        <Circle cx={x(sunAt)} cy={y(decAt(sunAt))} r={12} fill="rgba(242,200,121,0.3)" />
        <Circle cx={x(sunAt)} cy={y(decAt(sunAt))} r={7.5} fill={onFill.gold} stroke={ground} strokeWidth={2} />
      </Svg>
    </View>
  );
}
