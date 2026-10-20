import React, { useRef, useState } from "react";
import { PanResponder, StyleSheet, Text, View } from "react-native";
import type { ReaderTheme } from "../../screens/readerTheme";

export default function AppearanceSlider({ label, value, min = 0, max = 1, onChange, theme }: {
  label: string; value: number; min?: number; max?: number; onChange: (value: number) => void; theme: ReaderTheme;
}) {
  const track = useRef<View>(null);
  const [width, setWidth] = useState(1);
  const origin = useRef(0);
  const current = useRef({ min, max, width, onChange });
  current.current = { min, max, width, onChange };
  const change = (x: number) => {
    const c = current.current;
    c.onChange(Math.round((c.min + Math.max(0, Math.min(1, (x - origin.current) / c.width)) * (c.max - c.min)) * 100) / 100);
  };
  const responder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > Math.abs(g.dy),
    onPanResponderGrant: e => {
      const x = e.nativeEvent.pageX;
      track.current?.measureInWindow(left => { origin.current = left; change(x); });
    },
    onPanResponderMove: e => change(e.nativeEvent.pageX),
    onPanResponderTerminationRequest: () => false,
  })).current;
  const fraction = (value - min) / (max - min);
  return <View>
    <View style={styles.labels}><Text style={{ color: theme.text, fontWeight: "600" }}>{label}</Text><Text style={{ color: theme.soft }}>{Math.round(value * 100)}%</Text></View>
    <View ref={track} onLayout={e => setWidth(e.nativeEvent.layout.width)} {...responder.panHandlers}
      style={styles.hit} accessible accessibilityRole="adjustable" accessibilityLabel={label}
      aria-valuemin={Math.round(min * 100)} aria-valuemax={Math.round(max * 100)} aria-valuenow={Math.round(value * 100)}
      accessibilityValue={{ min: Math.round(min * 100), max: Math.round(max * 100), now: Math.round(value * 100) }}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={e => onChange(Math.max(min, Math.min(max, Math.round((value + (e.nativeEvent.actionName === "increment" ? .05 : -.05)) * 100) / 100)))}>
      <View style={[styles.track, { backgroundColor: theme.line }]}><View style={{ height: 5, borderRadius: 3, backgroundColor: theme.accent, width: `${fraction * 100}%` }} /></View>
      <View style={[styles.thumb, { left: `${fraction * 100}%`, backgroundColor: theme.bar, borderColor: theme.accent }]} />
    </View>
  </View>;
}
const styles = StyleSheet.create({ labels: { flexDirection: "row", justifyContent: "space-between", gap: 8 }, hit: { height: 44, justifyContent: "center", marginHorizontal: 10 }, track: { height: 5, borderRadius: 3 }, thumb: { position: "absolute", marginLeft: -10, width: 20, height: 20, borderRadius: 10, borderWidth: 3 } });
