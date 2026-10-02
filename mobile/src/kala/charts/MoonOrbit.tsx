// MoonOrbit — the month as a circle the learner can turn.
//
// The Sun stands at the top and the Earth in the middle. The Moon rides a
// ring cut into thirty equal pieces, one for each tithi, starting from the
// Sun and running clockwise like the ring on the Home card. The wedge from
// the Sun's direction round to the Moon is the angle that makes the tithi:
// drag the Moon and the wedge, the tithi and the shape of the Moon all
// follow.
//
// The half of the little Moon that faces the Sun is always the lit half, so
// the phase seen from the Earth explains itself.
//
// To a screen reader the diagram is one adjustable control that steps a
// tithi at a time; the buttons under it do the same.

import React from "react";
import { View } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import Svg, { Circle, Line, Path, Text as SvgText } from "react-native-svg";

import { onFill } from "../../theme";
import { arcPath, polar, sectorPath, wedgePath } from "./geometry";
import { useRingGesture } from "./useRingGesture";

interface Props {
  size: number;
  /** The Moon's angle from the Sun, 0 to 360. */
  angle: number;
  /** The finger moved the Moon to this angle. */
  onAngle: (deg: number) => void;
  onRelease?: () => void;
  /** One step for a screen reader: a tithi forward or back. */
  onStep: (by: 1 | -1) => void;
  /** What a screen reader says the control holds now. */
  valueText: string;
}

/** The Moon's unlit side on a slate fill. */
const SHADE = "#1C2B4F";
const BRIGHT_HALF = "rgba(255,248,238,0.30)";
const DARK_HALF = "rgba(255,248,238,0.14)";
const WEDGE = "rgba(242,200,121,0.24)";

export default function MoonOrbit({ size, angle, onAngle, onRelease, onStep, valueText }: Props) {
  const c = size / 2;
  const outer = c - 30;
  const inner = outer - 26;
  const mid = (outer + inner) / 2;
  const a = ((angle % 360) + 360) % 360;
  const running = Math.floor(a / 12) % 30;
  const moon = polar(c, c, mid, a);
  const moonR = 13;

  const gesture = useRingGesture({ size, inner: inner - 22, outer: outer + 22, onAngle, onEnd: onRelease });

  const sun = polar(c, c, outer + 17, 0);
  const rays = Array.from({ length: 8 }, (_, i) => i * 45);

  return (
    <GestureDetector gesture={gesture}>
      <View
        style={{ width: size, height: size }}
        collapsable={false}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="The Moon's place in its month"
        accessibilityValue={{ text: valueText }}
        accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
        onAccessibilityAction={(e) => onStep(e.nativeEvent.actionName === "increment" ? 1 : -1)}
      >
        <Svg width={size} height={size}>
          {/* The Sun, beyond the ring at the top. */}
          {rays.map((r) => {
            const p0 = polar(sun.x, sun.y, 9, r);
            const p1 = polar(sun.x, sun.y, 12.5, r);
            return <Line key={r} x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y} stroke={onFill.gold} strokeWidth={1.6} strokeLinecap="round" />;
          })}
          <Circle cx={sun.x} cy={sun.y} r={6.5} fill={onFill.gold} />

          {/* Thirty tithis: the bright half down the right, the dark half up the left. */}
          {Array.from({ length: 30 }, (_, i) => (
            <Path
              key={i}
              d={sectorPath(c, c, inner, outer, i * 12 + 0.7, (i + 1) * 12 - 0.7)}
              fill={i === running ? onFill.gold : i < 15 ? BRIGHT_HALF : DARK_HALF}
            />
          ))}

          {/* The angle that makes the tithi. */}
          {a > 0.5 && <Path d={wedgePath(c, c, inner - 5, 0, a)} fill={WEDGE} />}
          <Line x1={c} y1={c} x2={c} y2={c - inner + 5} stroke={onFill.soft} strokeWidth={1} strokeDasharray="3 4" />
          <Line x1={c} y1={c} x2={polar(c, c, inner - 5, a).x} y2={polar(c, c, inner - 5, a).y} stroke={onFill.text} strokeWidth={1.4} />
          {a > 14 && <Path d={arcPath(c, c, 24, 0, a)} fill="none" stroke={onFill.gold} strokeWidth={1.6} />}

          <SvgText x={c} y={c - inner + 24} fill={onFill.soft} fontSize={10.5} fontFamily="Nunito_700Bold" fontWeight="700" textAnchor="middle">
            new moon
          </SvgText>
          <SvgText x={c} y={c + inner - 16} fill={onFill.soft} fontSize={10.5} fontFamily="Nunito_700Bold" fontWeight="700" textAnchor="middle">
            full moon
          </SvgText>

          {/* The Earth. */}
          <Circle cx={c} cy={c} r={7} fill={onFill.text} />

          {/* The Moon: its sunward half lit, wherever it stands. */}
          <Circle cx={moon.x} cy={moon.y} r={moonR + 7} fill="rgba(255,248,238,0.16)" />
          <Circle cx={moon.x} cy={moon.y} r={moonR} fill={SHADE} />
          <Path d={`M ${moon.x - moonR} ${moon.y} A ${moonR} ${moonR} 0 0 1 ${moon.x + moonR} ${moon.y} Z`} fill={onFill.text} />
          <Circle cx={moon.x} cy={moon.y} r={moonR} fill="none" stroke={onFill.text} strokeWidth={1.5} />
        </Svg>
      </View>
    </GestureDetector>
  );
}
