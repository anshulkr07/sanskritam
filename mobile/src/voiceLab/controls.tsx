// The two controls the live call's settings panel uses: a row of choices,
// and a value moved by a slider or by its two step buttons. Both are
// accessible: the slider is adjustable, and every step button is a real
// button with its own label. Kept out of the screens so VoiceSession reads
// as the call itself.

import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTypeScale } from "../hooks/useTypeScale";
import { color, fill, onFill, radius, space } from "../theme";

export function Choices({
  label,
  values,
  selected,
  onChange,
}: {
  label: string;
  values: string[];
  selected: string;
  onChange: (value: string) => void;
}) {
  const { sized } = useTypeScale();
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { fontSize: sized(15) }]}>{label}</Text>
      <View style={styles.choices} accessibilityRole="radiogroup" accessibilityLabel={label}>
        {values.map((value) => {
          const on = selected === value;
          return (
            <Pressable
              key={value}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={value}
              onPress={() => onChange(value)}
              style={({ pressed }) => [styles.choice, on && styles.choiceOn, pressed && styles.pressed]}
            >
              <Text style={[styles.choiceText, on && styles.choiceTextOn, { fontSize: sized(13.5) }]}>{value}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function NumberControl({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  const [width, setWidth] = useState(1);
  const commit = (next: number) => onChange(Math.min(max, Math.max(min, Number(next.toFixed(2)))));
  const changeAt = (x: number) =>
    commit(min + Math.round(((Math.max(0, Math.min(width, x)) / width) * (max - min)) / step) * step);
  return (
    <View style={styles.field}>
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label}`}
          style={({ pressed }) => [styles.step, pressed && styles.pressed]}
          onPress={() => commit(value - step)}
        >
          <Text style={styles.stepText}>−</Text>
        </Pressable>
        <View
          style={styles.slider}
          onLayout={(event) => setWidth(Math.max(1, event.nativeEvent.layout.width))}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={label}
          accessibilityValue={{ min, max, now: value }}
          accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
          onAccessibilityAction={(event) =>
            commit(value + (event.nativeEvent.actionName === "increment" ? step : -step))
          }
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderGrant={(event) => changeAt(event.nativeEvent.locationX)}
          onResponderMove={(event) => changeAt(event.nativeEvent.locationX)}
        >
          <View style={styles.track} />
          <View style={[styles.thumb, { left: `${((value - min) / (max - min)) * 100}%` }]} />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label}`}
          style={({ pressed }) => [styles.step, pressed && styles.pressed]}
          onPress={() => commit(value + step)}
        >
          <Text style={styles.stepText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginVertical: space.xs, gap: space.xs },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.sm },
  label: { color: color.ink, fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: 15 },
  value: { color: color.inkSoft, fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: 14 },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: space.xs },
  choice: {
    minHeight: 44,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
    borderRadius: radius.sm,
  },
  choiceOn: { backgroundColor: fill.ink, borderColor: fill.ink },
  choiceText: { color: color.ink, fontFamily: "Nunito_600SemiBold", fontWeight: "600" },
  choiceTextOn: { color: onFill.text, fontFamily: "Nunito_700Bold", fontWeight: "700" },
  pressed: { opacity: 0.85 },
  step: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
    borderRadius: radius.sm,
  },
  stepText: { color: color.ink, fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 18 },
  slider: { flex: 1, height: 44, justifyContent: "center", marginHorizontal: space.xs },
  track: { height: 4, backgroundColor: color.border, borderRadius: 2 },
  thumb: { position: "absolute", width: 22, height: 22, borderRadius: 11, backgroundColor: fill.ink, marginLeft: -11 },
});
