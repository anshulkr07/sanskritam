// CycleRings — five cycles, one inside the next, each filled to where the
// present moment stands in it: the day and night from sunrise, the month
// from the new moon, the year from Caitra, the Kali age and the kalpa.
//
// Innermost is the shortest. Each ring starts at the top and fills
// clockwise; the dot is now. `progress` (0 to 1) draws them in together.
//
// One image to a screen reader: the rows under it say the same.

import React from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, Path, Text as SvgText } from "react-native-svg";

import { onFill } from "../../theme";
import { arcPath, polar } from "./geometry";

const BASE = "rgba(255,248,238,0.16)";

interface Props {
  size: number;
  /** Inner to outer. A null fraction draws the ring empty. */
  rings: { label: string; fraction: number | null }[];
  progress: number;
  /** The panel's colour, for the dot's rim and the labels' halo. */
  ground: string;
  children?: React.ReactNode;
}

export default function CycleRings({ size, rings, progress, ground, children }: Props) {
  const c = size / 2;
  const outer = c - 8;
  const inner = size * 0.2;
  const step = rings.length > 1 ? (outer - inner) / (rings.length - 1) : 0;
  const stroke = Math.max(5, Math.min(9, step * 0.42));

  return (
    <View style={{ width: size, height: size }} accessible={false} importantForAccessibility="no-hide-descendants">
      <Svg width={size} height={size}>
        {rings.map((ring, i) => {
          const r = inner + i * step;
          const sweep = ring.fraction === null ? 0 : Math.max(0, Math.min(1, ring.fraction)) * 360 * progress;
          const dot = polar(c, c, r, sweep);
          return (
            <React.Fragment key={ring.label}>
              <Circle cx={c} cy={c} r={r} fill="none" stroke={BASE} strokeWidth={stroke} />
              {sweep > 0.4 && <Path d={arcPath(c, c, r, 0, sweep)} fill="none" stroke={onFill.gold} strokeWidth={stroke} strokeLinecap="round" />}
              {ring.fraction !== null && <Circle cx={dot.x} cy={dot.y} r={stroke * 0.62 + 1.5} fill={onFill.text} stroke={ground} strokeWidth={2} />}
            </React.Fragment>
          );
        })}
        {rings.map((ring, i) => {
          const r = inner + i * step;
          return (
            <React.Fragment key={`l${ring.label}`}>
              <SvgText x={c - 7} y={c - r + 3.5} fill={ground} stroke={ground} strokeWidth={3.5} fontSize={10} fontFamily="Nunito_800ExtraBold" fontWeight="800" textAnchor="end">
                {ring.label}
              </SvgText>
              <SvgText x={c - 7} y={c - r + 3.5} fill={onFill.text} fontSize={10} fontFamily="Nunito_800ExtraBold" fontWeight="800" textAnchor="end">
                {ring.label}
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>
      {children ? <View style={[styles.centre, { padding: size / 2 - inner + stroke }]}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  centre: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center", pointerEvents: "none" },
});
