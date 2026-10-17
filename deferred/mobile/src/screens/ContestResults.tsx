// ContestResults: a finished competition's final table. Weekly sets show one
// division at a time (yours first); the top three get certificates.

import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import type { RootStackParamList } from "../navigation/types";
import { api, type Division } from "../api/client";
import { T, ui } from "../read/look";
import { plain } from "../utils/text";

type Props = NativeStackScreenProps<RootStackParamList, "ContestResults">;

const MEDAL = ["#8A5608", "#4F5B6B", "#8A4B22"];
const PLACE = ["First place", "Second place", "Third place"];

export default function ContestResultsScreen({ navigation, route }: Props) {
  const id = (route.params as { id?: string } | undefined)?.id ?? "";
  const [division, setDivision] = useState<Division | undefined>(undefined);
  const [isSet, setIsSet] = useState(false);
  const [rows, setRows] = useState<{ rank: number; public_name: string; percent: number }[]>([]);
  const [me, setMe] = useState<{ rank: number | null; percent: number | null; certificate_code: string | null; division?: Division } | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    setState("loading");
    api.competitionResults(id, division).then((r) => {
      setRows(r.rows ?? []);
      setMe(r.me ?? null);
      setIsSet(!!r.is_set);
      if (!division && r.division) setDivision(r.division);
      setState("ok");
    }).catch(() => setState("error"));
  }, [id, division]);

  return (
    <ScrollView style={{ backgroundColor: T.paper }} contentContainerStyle={styles.page}>
      <Text style={styles.h1} accessibilityRole="header">Results</Text>
      {isSet && (
        <View style={styles.segment} accessibilityRole="radiogroup">
          {(["standard", "beginner"] as const).map((d) => (
            <Pressable accessibilityLabel={d === "standard" ? "Standard division" : "Beginner division"} key={d} onPress={() => setDivision(d)} accessibilityRole="radio"
              accessibilityState={{ checked: division === d }} style={[styles.segBtn, division === d && styles.segOn]}>
              <Text style={[styles.segText, division === d && styles.segTextOn]}>{d === "standard" ? "Standard" : "Beginner"}</Text>
            </Pressable>
          ))}
        </View>
      )}
      {state === "loading" && <Text style={styles.small}>Loading…</Text>}
      {state === "error" && <Text style={styles.small}>Results are not out yet, or could not be loaded.</Text>}
      {state === "ok" && rows.length === 0 && <Text style={styles.small}>Nobody finished in this division.</Text>}
      {rows.slice(0, 3).map((r, i) => (
        <View key={`top-${i}`} style={[styles.top, { backgroundColor: MEDAL[Math.min(r.rank, 3) - 1] ?? MEDAL[2] }]}>
          <Text style={styles.topPlace}>{PLACE[Math.min(r.rank, 3) - 1] ?? `#${r.rank}`}</Text>
          <Text style={styles.topName}>{plain(r.public_name)} · {r.percent}</Text>
        </View>
      ))}
      {rows.slice(3, 10).map((r, i) => (
        <View key={`row-${i}`} style={styles.row}>
          <Text style={styles.rank}>{r.rank}</Text>
          <Text style={styles.name} numberOfLines={1}>{plain(r.public_name)}</Text>
          <Text style={styles.score}>{r.percent}</Text>
        </View>
      ))}
      {!!me && (me.division == null || me.division === division || !isSet) && (
        <Text style={styles.you}>
          You: {me.rank ? `#${me.rank}` : "not ranked (not every verse was in)"}{me.percent != null ? ` · ${me.percent}` : ""}
        </Text>
      )}
      {!!me?.certificate_code && (
        <Pressable accessibilityLabel="Open your certificate"
          onPress={() => (navigation as never as { navigate: (r: string, p?: object) => void }).navigate("Certificate", { code: me.certificate_code as string })}
          accessibilityRole="button"
          style={styles.cert}
        >
          <Text style={styles.certText}>Open your certificate</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, gap: 10, paddingBottom: 120 },
  h1: { ...ui("bold"), fontSize: 24, color: T.ink },
  small: { ...ui("regular"), fontSize: 14, color: T.ink2 },
  segment: { flexDirection: "row", borderWidth: 1.5, borderColor: T.ink },
  segBtn: { flex: 1, minHeight: 46, alignItems: "center", justifyContent: "center" },
  segOn: { backgroundColor: T.ink },
  segText: { ...ui("semibold"), fontSize: 15, color: T.ink },
  segTextOn: { color: T.paper },
  top: { padding: 14, gap: 2 },
  topPlace: { ...ui("bold"), fontSize: 13, letterSpacing: 1, color: "#FFF8EE" },
  topName: { ...ui("semibold"), fontSize: 17, color: "#FFF8EE" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 46, borderBottomWidth: 1, borderBottomColor: T.line },
  rank: { ...ui("bold"), width: 28, textAlign: "center", color: T.ink2 },
  name: { ...ui("semibold"), flex: 1, fontSize: 15, color: T.ink },
  score: { ...ui("bold"), fontSize: 15, color: T.ink },
  you: { ...ui("bold"), fontSize: 15, color: T.ink, marginTop: 6 },
  cert: { minHeight: 52, alignItems: "center", justifyContent: "center", backgroundColor: T.action },
  certText: { ...ui("bold"), fontSize: 16, color: T.white },
});
