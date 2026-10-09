// RecitationResult: percent, counts, akshara columns, tips.

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { ReciteResult } from "../../api/client";
import { toDisplay } from "../../recite/bands";
import { color, fill } from "../../theme";
import { plain } from "../../utils/text";

const SYM = { ok: "✓", fix: "✗", unclear: "?" } as const;
const SYM_COLOR = { ok: fill.ok, fix: fill.bad, unclear: "#2F4677" } as const;

export default function RecitationResult({
  result,
  onPlayMine,
  onPlayLine,
}: {
  result: ReciteResult;
  onPlayMine: () => void;
  onPlayLine: () => void;
}) {
  if (result.status === "unclear") {
    return (
      <View style={styles.root}>
        <Text style={styles.percent} accessibilityRole="header">Unclear, try again</Text>
      </View>
    );
  }
  const rows = toDisplay(result.lines);
  return (
    <View style={styles.root}>
      <Text style={styles.percent} accessibilityRole="header">{result.percent}%</Text>
      <Text style={styles.counts}>
        {result.counts.ok} right, {result.counts.fix} to fix, {result.counts.unclear} unclear
      </Text>
      {result.lines.map((ln, li) => (
        <View
          key={ln.i}
          accessible
          accessibilityRole="text"
          accessibilityLabel={rows[li]?.label ?? `Line ${ln.i + 1}`}
          style={styles.line}
        >
          {ln.aksharas.map((a, i) => (
            <View key={i} style={styles.ak}>
              <Text style={[styles.t, { fontSize: 18 }]}>{a.t}</Text>
              <Text style={[styles.sym, { color: SYM_COLOR[a.band] }]}>{SYM[a.band]}</Text>
              {a.band === "fix" && !!a.heard && (
                <Text style={styles.heard}>heard: {a.heard}</Text>
              )}
            </View>
          ))}
        </View>
      ))}
      {(result.tips ?? []).map((t, i) => (
        <Text key={i} style={styles.tip}>{plain(t.text)}</Text>
      ))}
      <View style={styles.btnRow}>
        <Pressable onPress={onPlayMine} accessibilityRole="button" accessibilityLabel="Play my recording" style={styles.btn}>
          <Text style={styles.btnText}>Play mine</Text>
        </Pressable>
        <Pressable onPress={onPlayLine} accessibilityRole="button" accessibilityLabel="Play the line" style={styles.btn}>
          <Text style={styles.btnText}>Play line</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 8, paddingVertical: 8 },
  percent: { fontSize: 32, fontWeight: "800", color: color.ink },
  counts: { fontSize: 14, color: color.inkSoft },
  line: { flexDirection: "row", flexWrap: "wrap", gap: 6, paddingVertical: 4 },
  ak: { alignItems: "center", minWidth: 28 },
  t: { color: color.ink },
  sym: { fontSize: 14, fontWeight: "800" },
  heard: { fontSize: 11, color: color.inkSoft },
  tip: { fontSize: 14, color: color.ink },
  btnRow: { flexDirection: "row", gap: 8 },
  btn: { minHeight: 44, justifyContent: "center", paddingHorizontal: 16, borderWidth: 1.5, borderColor: "#D9C9AE", borderRadius: 12 },
  btnText: { fontWeight: "700", color: color.ink },
});
