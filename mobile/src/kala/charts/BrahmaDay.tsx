// BrahmaDay — one kalpa drawn as a day: the Sun's arc from dawn on the left,
// over noon at the top, to dusk on the right, with his night, as long,
// below the horizon.
//
// The arc is cut as the Sūrya Siddhānta cuts the kalpa (1.18-19): fourteen
// Manus, each 71 cycles of the four ages, with a junction as long as the
// first age before the first and after each one. The present Manu's piece
// is gold, those gone are bright, those to come faint. The Sun stands where
// this moment is, and climbs there as `progress` runs 0 to 1.
//
// One image to a screen reader: the lines under it say the same.

import React from "react";
import { View } from "react-native";
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from "react-native-svg";

import { onFill } from "../../theme";
import type { KalpaPiece } from "../basics";
import { arcPath, polar } from "./geometry";

const GONE = "rgba(255,248,238,0.62)";
const COMING = "rgba(255,248,238,0.2)";
const JUNCTION = "rgba(255,248,238,0.08)";
const NIGHT = "rgba(0,0,0,0.22)";
const HALO = "rgba(242,200,121,0.28)";

interface Props {
  width: number;
  pieces: KalpaPiece[];
  /** The present Manu, 1 to 14. */
  manu: number;
  /** How far through the kalpa now is, 0 to 1. */
  at: number;
  progress: number;
  ground: string;
}

/** 0 at dawn (left), 0.5 at noon (top), 1 at dusk (right). */
const toDeg = (s: number) => 270 + 180 * s;

export default function BrahmaDay({ width, pieces, manu, at, progress, ground }: Props) {
  const r = Math.min((width - 40) / 2, 150);
  const cx = width / 2;
  const top = 30;
  const cy = top + r;
  const band = 14;
  const nightDepth = 34;
  const height = cy + nightDepth + 26;
  const sunAt = at * progress;
  const sun = polar(cx, cy, r, toDeg(sunAt));
  const label = (x: number, y: number, text: string, anchor: "start" | "middle" | "end") => (
    <>
      <SvgText x={x} y={y} fill={ground} stroke={ground} strokeWidth={3} fontSize={10.5} fontFamily="Nunito_800ExtraBold" fontWeight="800" textAnchor={anchor}>
        {text}
      </SvgText>
      <SvgText x={x} y={y} fill={onFill.soft} fontSize={10.5} fontFamily="Nunito_800ExtraBold" fontWeight="800" textAnchor={anchor}>
        {text}
      </SvgText>
    </>
  );

  return (
    <View style={{ width, height }} accessible={false} importantForAccessibility="no-hide-descendants">
      <Svg width={width} height={height}>
        {/* His night, as long as the day, below the horizon. */}
        <Rect x={cx - r - 6} y={cy + 4} width={2 * r + 12} height={nightDepth} rx={10} fill={NIGHT} />
        {[0.3, 0.41, 0.52, 0.62, 0.71].map((f, i) => (
          <Circle key={i} cx={cx - r + f * 2 * r} cy={cy + 13 + (i % 2) * 11} r={1.4} fill={onFill.soft} />
        ))}

        {pieces.map((p) => {
          const a0 = toDeg(p.from);
          const a1 = toDeg(p.to);
          const stroke = p.kind === "junction" ? JUNCTION : p.index + 1 < manu ? GONE : p.index + 1 === manu ? onFill.gold : COMING;
          const pad = p.kind === "manu" ? 0.35 : 0;
          return <Path key={`${p.kind}${p.index}`} d={arcPath(cx, cy, r, a0 + pad, a1 - pad)} fill="none" stroke={stroke} strokeWidth={p.kind === "manu" && p.index + 1 === manu ? band + 4 : band} />;
        })}

        <Line x1={cx - r - 14} y1={cy} x2={cx + r + 14} y2={cy} stroke={onFill.text} strokeWidth={2} />

        {/* The Sun, and the path it has climbed. */}
        {sunAt > 0.002 && <Path d={arcPath(cx, cy, r - band / 2 - 7, toDeg(0), toDeg(sunAt))} fill="none" stroke={onFill.gold} strokeWidth={2} strokeDasharray="3 4" />}
        <Circle cx={sun.x} cy={sun.y} r={15} fill={HALO} />
        <Circle cx={sun.x} cy={sun.y} r={9} fill={onFill.gold} stroke={ground} strokeWidth={2} />

        {label(cx, top - 14, "noon", "middle")}
        {label(cx - r + 2, cy + 18, "dawn", "start")}
        {label(cx + r - 2, cy + 18, "dusk", "end")}
        {label(cx, cy + nightDepth + 20, "his night, as long", "middle")}
      </Svg>
    </View>
  );
}
