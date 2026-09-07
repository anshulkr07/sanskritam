// VisualTree — the U14-2 `tree` renderer: a numbered derivation/sandhi tree.
// Reuses U7-1's SutraCard for step rendering (never a second derivation
// renderer — UI_HANDOVER U11-2 rule). Steps come pre-computed from the
// backend (P22-1 stores them on the lesson example); the client only lists
// them. Falls back to a plain numbered node list for {nodes} payloads.

import React from "react";
import { StyleSheet, Text, View } from "react-native";

import SutraCard from "../derivation/SutraCard";
import { color, font, script, space } from "../../theme";

export interface TreeData {
  steps?: { code: string; sutra_devanagari?: string; sutra_text?: string; result?: string }[];
  nodes?: string[];
}

export default function VisualTree({ data }: { data: TreeData }) {
  const steps = data.steps ?? [];
  const nodes = data.nodes ?? [];
  if (steps.length === 0 && nodes.length === 0) return null;
  return (
    <View style={styles.wrap} accessible accessibilityLabel="Derivation steps">
      {steps.map((s, i) => (
        <View key={i} style={styles.stepRow}>
          <Text style={styles.num}>{i + 1}</Text>
          <View style={styles.card}>
            <SutraCard
              code={s.code}
              sutraDevanagari={s.sutra_devanagari ?? ""}
              index={i}
            />
            {s.result ? (
              <Text style={[styles.result, script("semibold")]}>→ {s.result}</Text>
            ) : null}
          </View>
        </View>
      ))}
      {nodes.map((n, i) => (
        <View key={`n-${i}`} style={styles.stepRow}>
          <Text style={styles.num}>{steps.length + i + 1}</Text>
          <Text style={[styles.node, script("semibold")]}>{n}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: space.md },
  stepRow: { flexDirection: "row", gap: space.sm, alignItems: "flex-start", marginBottom: space.xs },
  num: {
    fontFamily: "Nunito_800ExtraBold",
    fontWeight: "800",
    fontSize: font.sizes.sm,
    color: color.saffron,
    minWidth: 20,
    textAlign: "center",
    paddingTop: space.sm,
  },
  card: { flex: 1 },
  result: { fontSize: font.sizes.base, color: color.ink, marginTop: 2, marginLeft: space.sm },
  node: { fontSize: font.sizes.base, color: color.ink, flex: 1, paddingTop: space.sm },
});
