import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { color, fill, font, onFill } from "../theme";

/** Tiny worked examples make the cited mathematical claims inspectable. */
export default function InsightProof({ id }: { id: string }) {
  const [beats, setBeats] = useState(4);
  if (id === "curated-arya-pi") return <View style={styles.box}><Text style={styles.label}>Try the arithmetic</Text><Text style={styles.math}>(104 × 8 + 62,000) ÷ 20,000</Text><Text style={styles.answer}>= 3.1416</Text></View>;
  if (id === "curated-prosody-binary") return <View style={styles.box}><Text style={styles.label}>All eight patterns of three syllables</Text><View style={styles.patterns}>{Array.from({ length: 8 }, (_, i) => <Text key={i} style={styles.pattern}>{i.toString(2).padStart(3, "0").split("").map(b => b === "0" ? "⏑" : "—").join(" ")}</Text>)}</View><Text style={styles.note}>⏑ short · — long</Text></View>;
  if (id !== "curated-prosody-fibonacci") return null;
  const count = (n: number): number => n < 2 ? 1 : count(n - 1) + count(n - 2);
  return <View style={styles.box}><Text style={styles.label}>Count patterns by duration</Text><View style={styles.patterns}>{[2,3,4,5,6].map(n => <Pressable key={n} onPress={() => setBeats(n)} accessibilityRole="button" accessibilityLabel={`Count rhythms of ${n} beats`} accessibilityState={{ selected: beats === n }} style={[styles.choice, beats === n && { backgroundColor: fill.ink }]}><Text style={[styles.note, beats === n && { color: onFill.text }]}>{n} beats</Text></Pressable>)}</View><Text style={styles.answer}>{count(beats)} patterns</Text><Text style={styles.note}>{count(beats - 1)} ending short + {count(beats - 2)} ending long</Text></View>;
}
const styles = StyleSheet.create({ box: { padding: 16, borderLeftWidth: 3, borderLeftColor: color.saffron, backgroundColor: color.surface, marginTop: 18, gap: 10 }, label: { fontFamily: "Nunito_800ExtraBold", color: color.ink }, math: { fontFamily: "Nunito_600SemiBold", color: color.ink, fontSize: 17 }, answer: { fontFamily: "Nunito_800ExtraBold", color: color.saffronText, fontSize: 24 }, patterns: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, pattern: { width: "45%", color: color.ink, fontSize: 20 }, note: { fontFamily: "Nunito_600SemiBold", color: color.inkSoft, fontSize: font.sizes.sm }, choice: { minHeight: 44, paddingHorizontal: 12, justifyContent: "center", borderWidth: 1, borderColor: color.border } });
