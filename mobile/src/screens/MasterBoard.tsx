// MasterBoard: this month, last month, all time, winner line.

import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { api } from "../api/client";
import { color } from "../theme";
import { plain } from "../utils/text";

export default function MasterBoardScreen() {
  const [tab, setTab] = useState<"month" | "last" | "all">("month");
  const [rows, setRows] = useState<{ rank: number; public_name: string; wins: number; seconds: number; thirds: number }[]>([]);
  const [winner, setWinner] = useState<{ public_name: string; wins: number; claim_code: string } | null>(null);

  useEffect(() => {
    const month = tab === "all" ? "all" : undefined;
    api.competitionMaster(month).then((r) => {
      setRows(r.rows ?? []);
      setWinner(r.winner ?? null);
    }).catch(() => {});
  }, [tab]);

  return (
    <ScrollView contentContainerStyle={styles.body}>
      <Text style={styles.title} accessibilityRole="header">Master board</Text>
      <View style={styles.tabs}>
        {(["month", "last", "all"] as const).map((t) => (
          <Pressable
            key={t}
            onPress={() => setTab(t)}
            accessibilityRole="button"
            accessibilityLabel={t}
            accessibilityState={{ selected: tab === t }}
            style={[styles.tab, tab === t && { backgroundColor: color.ink }]}
          >
            <Text style={[styles.tabText, tab === t && { color: "#FFF8EE" }]}>{t}</Text>
          </Pressable>
        ))}
      </View>
      {!!winner && (
        <Text style={styles.winner}>Winner: {plain(winner.public_name)} {winner.wins} wins {winner.claim_code ? `code ${winner.claim_code}` : ""}</Text>
      )}
      {rows.map((r) => (
        <Text key={r.rank} style={styles.row}>{r.rank}. {plain(r.public_name)} {r.wins} wins</Text>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16, gap: 8, paddingBottom: 120 },
  title: { fontSize: 22, fontWeight: "800", color: color.ink },
  tabs: { flexDirection: "row", gap: 8 },
  tab: { minHeight: 44, paddingHorizontal: 16, justifyContent: "center", borderRadius: 12, borderWidth: 1.5, borderColor: "#D9C9AE" },
  tabText: { color: color.ink, fontWeight: "700" },
  winner: { fontSize: 14, color: color.ink },
  row: { fontSize: 14, color: color.ink, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#EFE3CE" },
});
