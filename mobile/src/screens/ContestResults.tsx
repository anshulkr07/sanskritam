// ContestResults: top 3 in deep fills, then 4 to 10, then you, then certificate.

import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import type { RootStackParamList } from "../navigation/types";
import { api } from "../api/client";
import { color, fill, onFill } from "../theme";
import { plain } from "../utils/text";

type Props = NativeStackScreenProps<RootStackParamList, "ContestResults">;

const TOP_FILL = [fill.gold, fill.slate, fill.rose] as const;
const TOP_WORD = ["First place", "Second place", "Third place"] as const;

export default function ContestResultsScreen({ navigation, route }: Props) {
  const id = (route.params as { id?: string } | undefined)?.id ?? "";
  const [rows, setRows] = useState<{ rank: number; public_name: string; percent: number }[]>([]);
  const [me, setMe] = useState<{ rank: number | null; percent: number | null; certificate_code: string | null } | null>(null);

  useEffect(() => {
    api.competitionResults(id).then((r) => {
      setRows(r.rows ?? []);
      setMe(r.me ?? null);
    }).catch(() => {});
  }, [id]);

  return (
    <ScrollView contentContainerStyle={styles.body}>
      <Text style={styles.title} accessibilityRole="header">Results</Text>
      {rows.slice(0, 3).map((r, i) => (
        <View key={r.rank} style={[styles.top, { backgroundColor: TOP_FILL[i] }]}>
          <Text style={[styles.topPlace, { color: onFill.text }]}>{TOP_WORD[i]}</Text>
          <Text style={[styles.topName, { color: onFill.text }]}>{plain(r.public_name)} {r.percent}%</Text>
        </View>
      ))}
      {rows.slice(3, 10).map((r) => (
        <Text key={r.rank} style={styles.row}>{r.rank}. {plain(r.public_name)} {r.percent}%</Text>
      ))}
      {!!me && <Text style={styles.you}>You: rank {me.rank ?? "-"} {me.percent ?? "-"}%</Text>}
      {!!me?.certificate_code && (
        <Pressable
          onPress={() => (navigation as never as { navigate: (r: string, p?: object) => void }).navigate("Certificate", { code: me.certificate_code as string })}
          accessibilityRole="button"
          accessibilityLabel="Open certificate"
          style={styles.cert}
        >
          <Text style={styles.certText}>Certificate</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16, gap: 8, paddingBottom: 120 },
  title: { fontSize: 22, fontWeight: "800", color: color.ink },
  top: { borderRadius: 12, padding: 12 },
  topPlace: { fontWeight: "800" },
  topName: { fontSize: 15 },
  row: { fontSize: 14, color: color.ink, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#EFE3CE" },
  you: { fontWeight: "800", color: color.ink },
  cert: { minHeight: 48, alignItems: "center", justifyContent: "center", backgroundColor: fill.ink, borderRadius: 12 },
  certText: { color: onFill.text, fontWeight: "800" },
});
