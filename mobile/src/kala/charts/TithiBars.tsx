// TithiBars — how long each of the month's thirty tithis runs.
//
// A tithi is a fixed angle, not a fixed time: the Moon speeds up and slows
// down through the month, so some run under 20 hours and some over 26. One
// bar a tithi, measured from zero, with a line across at 24 hours.
//
// Slide a finger along the bars to read them. The picked bar changes colour
// and wears a cap; the running tithi carries a dot under its bar. To a screen reader the chart is one adjustable control.

import React, { useMemo, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS, useSharedValue } from "react-native-reanimated";

import { color, fill } from "../../theme";
import type { TithiBar } from "../learn";

interface Props {
  bars: TithiBar[];
  /** Index of the bar picked, 0 to 29. */
  selected: number;
  /** Index of the tithi running now. */
  running: number;
  onSelect: (index: number) => void;
  valueText: string;
  height?: number;
}

/** The top of the scale, in hours. */
const TOP = 28;
/** The two halves of the month stand this far apart. */
const HALF_GAP = 8;
const GUTTER = 34;

export default function TithiBars({ bars, selected, running, onSelect, valueText, height = 112 }: Props) {
  const widthShared = useSharedValue(0);
  const last = useSharedValue(-1);
  const count = bars.length;

  const pickRef = useRef(onSelect);
  pickRef.current = onSelect;
  const pick = useMemo(() => (i: number) => pickRef.current(i), []);

  const gesture = useMemo(() => {
    const report = (x: number) => {
      "worklet";
      const w = widthShared.value;
      if (!(w > HALF_GAP) || count === 0) return;
      const slot = (w - HALF_GAP) / count;
      const half = count / 2;
      const raw = x < half * slot ? Math.floor(x / slot) : Math.max(half, Math.floor((x - HALF_GAP) / slot));
      const i = Math.max(0, Math.min(count - 1, raw));
      if (i !== last.value) {
        last.value = i;
        runOnJS(pick)(i);
      }
    };
    const pan = Gesture.Pan()
      .activeOffsetX([-6, 6])
      .failOffsetY([-12, 12])
      .onBegin(() => {
        "worklet";
        last.value = -1;
      })
      .onUpdate((e) => {
        "worklet";
        report(e.x);
      });
    const tap = Gesture.Tap().onEnd((e) => {
      "worklet";
      last.value = -1;
      report(e.x);
    });
    return Gesture.Exclusive(pan, tap);
  }, [count, pick, widthShared, last]);

  const step = (by: number) => onSelect(Math.max(0, Math.min(count - 1, selected + by)));
  const dayLine = height * (1 - 24 / TOP);

  return (
    <View>
      <View style={styles.row}>
        <GestureDetector gesture={gesture}>
          <View
            style={{ flex: 1, height: height + 14 }}
            collapsable={false}
            onLayout={(e) => {
              widthShared.value = e.nativeEvent.layout.width;
            }}
            accessible
            accessibilityRole="adjustable"
            accessibilityLabel="How long each tithi of this month runs"
            accessibilityValue={{ text: valueText }}
            accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
            onAccessibilityAction={(e) => step(e.nativeEvent.actionName === "increment" ? 1 : -1)}
          >
            <View style={[styles.bars, { height }]}>
              {bars.map((b, i) => (
                <View key={b.number} style={[styles.slot, i === count / 2 && styles.halfGap]}>
                  {i === selected && <View style={styles.cap} />}
                  <View
                    style={{
                      height: Math.max(2, (Math.min(TOP, b.hours) / TOP) * height),
                      borderRadius: 2,
                      backgroundColor: i === selected ? color.saffron : i < count / 2 ? fill.slate : fill.ink,
                    }}
                  />
                </View>
              ))}
            </View>
            <View style={[styles.dayLine, { top: dayLine }]} />
            <View style={styles.dots}>
              {bars.map((b, i) => (
                <View key={b.number} style={[styles.slot, styles.dotSlot, i === count / 2 && styles.halfGap]}>
                  {i === running && <View style={styles.dot} />}
                </View>
              ))}
            </View>
          </View>
        </GestureDetector>
        <View style={{ width: GUTTER, height }}>
          <Text style={[styles.dayLabel, { top: dayLine - 8 }]}>24 h</Text>
        </View>
      </View>
      <View style={[styles.halves, { marginRight: GUTTER }]}>
        <Text style={styles.half}>Waxing half</Text>
        <Text style={styles.half}>Waning half</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row" },
  bars: { flexDirection: "row", alignItems: "flex-end" },
  slot: { flex: 1, paddingHorizontal: 1, justifyContent: "flex-end" },
  halfGap: { marginLeft: HALF_GAP },
  // Colour is never the only signal: the picked bar also wears a cap.
  cap: { height: 4, marginBottom: 3, borderRadius: 2, backgroundColor: color.ink },
  // A plain rule: a dashed border on one side does not draw on Android.
  // It is cream with an ink edge, so it shows across the bars and between them.
  dayLine: { position: "absolute", left: 0, right: 0, height: 3, backgroundColor: color.bg, borderBottomWidth: 1, borderBottomColor: color.ink },
  dayLabel: { position: "absolute", left: 6, fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: 11, color: color.inkSoft },
  dots: { flexDirection: "row", height: 14, alignItems: "center" },
  dotSlot: { alignItems: "center", justifyContent: "center" },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: color.ink },
  halves: { flexDirection: "row", justifyContent: "space-around", marginTop: 2 },
  half: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: 12, color: color.inkSoft },
});
