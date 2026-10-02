// SegmentRing — a ring cut into pieces, one of which is picked.
//
// The year wheel (twelve or thirteen lunar months), the four ages (4:3:2:1)
// and the Moon's 27 stars are all this: pieces of a turn, sized by what they
// measure, read clockwise from the top. The picked piece stands out from the
// ring as well as changing colour, so it is not told by colour alone. A
// marker shows where the present moment falls.
//
// Touch the ring, or drag round it, to pick a piece. To a screen reader it
// is one adjustable control that steps a piece at a time.

import React from "react";
import { StyleSheet, View } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import Svg, { Circle, Line, Path, Text as SvgText } from "react-native-svg";

import { onFill } from "../../theme";
import { polar, sectorPath, segmentAt } from "./geometry";
import { useRingGesture } from "./useRingGesture";

export interface RingSegment {
  /** Where the piece starts and ends, 0 to 1 round the ring. */
  from: number;
  to: number;
  /** Drawn a little stronger than its neighbours (an added month, say). */
  strong?: boolean;
}

interface Props {
  size: number;
  /** How thick the ring is. */
  thickness?: number;
  /** Room left outside the ring for tick labels. */
  margin?: number;
  segments: RingSegment[];
  selected: number;
  onSelect: (index: number) => void;
  /** Where now falls, 0 to 1 round the ring. */
  marker?: number | null;
  /** Small labelled ticks outside the ring. */
  ticks?: { at: number; label: string }[];
  /** A thin inner ring of bands (the seasons): `on` is the one to pick out. */
  bands?: { from: number; to: number; on: boolean }[];
  /** The panel's own colour, for the gaps. */
  ground: string;
  accessibilityLabel: string;
  valueText: string;
  /** Drawn in the middle. */
  children?: React.ReactNode;
}

const BASE = "rgba(255,248,238,0.26)";
const STRONG = "rgba(255,248,238,0.52)";
const BAND = "rgba(255,248,238,0.16)";
const BAND_ON = "rgba(255,248,238,0.60)";
const POP = 6;

export default function SegmentRing({
  size,
  thickness = 34,
  margin = 12,
  segments,
  selected,
  onSelect,
  marker = null,
  ticks = [],
  bands = [],
  ground,
  accessibilityLabel,
  valueText,
  children,
}: Props) {
  const c = size / 2;
  const outer = c - margin - POP;
  const inner = outer - thickness;
  const count = segments.length;
  // A gap of about 2dp between pieces, whatever the ring's size.
  const gap = (2 / (2 * Math.PI * outer)) * 360;

  const ends = segments.map((s) => s.to);
  const gesture = useRingGesture({
    size,
    inner: inner - 14,
    outer: outer + POP + 16,
    onAngle: (deg) => {
      const i = segmentAt(ends, deg / 360);
      if (i !== selected) onSelect(i);
    },
  });

  const step = (by: number) => onSelect((((selected + by) % count) + count) % count);

  return (
    <GestureDetector gesture={gesture}>
      <View
        style={{ width: size, height: size }}
        collapsable={false}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={accessibilityLabel}
        accessibilityValue={{ text: valueText }}
        accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
        onAccessibilityAction={(e) => step(e.nativeEvent.actionName === "increment" ? 1 : -1)}
      >
        <Svg width={size} height={size}>
          {segments.map((s, i) => {
            const on = i === selected;
            const a0 = s.from * 360 + gap / 2;
            const a1 = s.to * 360 - gap / 2;
            if (a1 <= a0) return null;
            return (
              <Path
                key={i}
                d={sectorPath(c, c, on ? inner - 2 : inner, on ? outer + POP : outer, a0, a1)}
                fill={on ? onFill.gold : s.strong ? STRONG : BASE}
              />
            );
          })}

          {bands.map((b, i) => (
            <Path
              key={`b${i}`}
              d={sectorPath(c, c, inner - 12, inner - 6, b.from * 360 + gap / 2, b.to * 360 - gap / 2)}
              fill={b.on ? BAND_ON : BAND}
            />
          ))}

          {ticks.map((t, i) => {
            const a = t.at * 360;
            const p0 = polar(c, c, outer + 2, a);
            const p1 = polar(c, c, outer + POP + 3, a);
            const label = polar(c, c, outer + POP + 14, a);
            return (
              <React.Fragment key={`t${i}`}>
                <Line x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y} stroke={onFill.text} strokeWidth={1.4} />
                <SvgText x={label.x} y={label.y + 3.5} fill={onFill.soft} fontSize={9.5} fontFamily="Nunito_700Bold" fontWeight="700" textAnchor="middle">
                  {t.label}
                </SvgText>
              </React.Fragment>
            );
          })}

          {marker !== null && (
            <>
              <Line
                x1={polar(c, c, inner - 3, marker * 360).x}
                y1={polar(c, c, inner - 3, marker * 360).y}
                x2={polar(c, c, outer + POP + 1, marker * 360).x}
                y2={polar(c, c, outer + POP + 1, marker * 360).y}
                stroke={ground}
                strokeWidth={5}
              />
              <Line
                x1={polar(c, c, inner - 3, marker * 360).x}
                y1={polar(c, c, inner - 3, marker * 360).y}
                x2={polar(c, c, outer + POP + 1, marker * 360).x}
                y2={polar(c, c, outer + POP + 1, marker * 360).y}
                stroke={onFill.text}
                strokeWidth={2}
              />
              <Circle cx={polar(c, c, inner - 3, marker * 360).x} cy={polar(c, c, inner - 3, marker * 360).y} r={4} fill={onFill.text} stroke={ground} strokeWidth={1.5} />
            </>
          )}
        </Svg>

        {children ? (
          <View style={[styles.centre, { padding: margin + POP + thickness + (bands.length > 0 ? 18 : 8) }]}>{children}</View>
        ) : null}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  centre: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center", pointerEvents: "none" },
});
