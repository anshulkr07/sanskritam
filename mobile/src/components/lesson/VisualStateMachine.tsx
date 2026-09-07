// VisualStateMachine — the U14-2 `state_machine` renderer: verb conjugation
// as a state diagram. First pass per the handover: the existing derivation
// step list with lakāra labels (no custom SVG renderer until the pedagogy
// demands it). States are the lakāras, the current one is highlighted, and
// the note carries the teaching line. Presentational — states arrive
// pre-computed in `visual_data`.

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@react-native-vector-icons/ionicons";

import { color, font, radius, script, space } from "../../theme";

export interface StateMachineData {
  states?: string[];
  current?: string;
  note?: string;
}

export default function VisualStateMachine({ data }: { data: StateMachineData }) {
  const states = data.states ?? [];
  if (states.length === 0) return null;
  return (
    <View style={styles.wrap} accessible accessibilityLabel="Conjugation states">
      {states.map((s, i) => {
        const active = s === data.current;
        return (
          <View key={s}>
            <View style={[styles.state, active && styles.stateActive]}>
              <Ionicons
                name={active ? "radio-button-on" : "radio-button-off"}
                size={16}
                color={active ? color.saffron : color.inkFaint}
              />
              <Text style={[styles.stateText, script("semibold"), active && styles.stateTextActive]}>
                {s}
              </Text>
              {active && (
                <View style={styles.now}>
                  <Text style={styles.nowText}>now</Text>
                </View>
              )}
            </View>
            {i < states.length - 1 && <View style={styles.link} />}
          </View>
        );
      })}
      {data.note ? <Text style={styles.note}>{data.note}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: space.md },
  state: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    backgroundColor: color.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    minHeight: 48,
  },
  stateActive: { borderColor: color.saffron, borderWidth: 2, backgroundColor: color.saffronLight },
  stateText: { fontSize: font.sizes.base, color: color.ink, flex: 1 },
  stateTextActive: { color: color.saffronDeep },
  now: { backgroundColor: color.saffron, borderRadius: radius.pill, paddingHorizontal: space.sm, paddingVertical: 2 },
  nowText: {
    fontFamily: "Nunito_800ExtraBold",
    fontWeight: "800",
    fontSize: font.sizes.xs,
    color: color.white,
    textTransform: "uppercase",
  },
  link: { width: 2, height: 10, backgroundColor: color.border, marginLeft: 26, borderRadius: 1 },
  note: {
    fontFamily: "Nunito_400Regular",
    fontWeight: "400",
    fontSize: font.sizes.sm,
    color: color.inkSoft,
    marginTop: space.sm,
    lineHeight: 20,
  },
});
