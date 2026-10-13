// Contest: the set verse, times, best, leaderboard, entry.

import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import React, { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import type { RootStackParamList } from "../navigation/types";
import { ApiError, api, type Competition, type Shloka } from "../api/client";
import { useQuery } from "../hooks/useQuery";
import { color, fill, onFill, sanskritText } from "../theme";
import { plain } from "../utils/text";

type Props = NativeStackScreenProps<RootStackParamList, "Contest">;

export default function ContestScreen({ navigation }: Props) {
  const [comp, setComp] = useState<Competition | null>(null);
  const [nextMsg, setNextMsg] = useState("");
  const [lastMsg, setLastMsg] = useState("");
  const [lastId, setLastId] = useState("");
  const [board, setBoard] = useState<{ rank: number; public_name: string; percent: number }[]>([]);
  const [meRank, setMeRank] = useState<string>("");
  const [gateMsg, setGateMsg] = useState("");
  const { data: verses } = useQuery("reader-verses", api.listShlokas, { ttlMs: 30 * 60_000 });

  const load = useCallback(() => {
    api.competitionCurrent()
      .then((c) => {
        setComp(c.open);
        setNextMsg(c.next?.opens_at ? `Next opens ${c.next.opens_at}` : "");
        if (c.last) {
          setLastMsg(`Last: rank ${c.last.my_rank ?? "-"}${c.last.certificate_code ? ", certificate ready" : ""}`);
          setLastId(c.last.competition?.id ?? "");
        } else {
          setLastMsg("");
          setLastId("");
        }
      })
      .catch(() => setComp(null));
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!comp) return;
    api.competitionLeaderboard(comp.id).then((b) => {
      setBoard(b.rows ?? []);
      setMeRank(b.me ? `You: rank ${b.me.rank}, ${b.me.percent}%` : "");
    }).catch(() => {});
    const t = setInterval(() => {
      api.competitionLeaderboard(comp.id).then((b) => {
        setBoard(b.rows ?? []);
        setMeRank(b.me ? `You: rank ${b.me.rank}, ${b.me.percent}%` : "");
      }).catch(() => {});
    }, 60000);
    return () => clearInterval(t);
  }, [comp]);

  const pieceUid = comp?.pieces?.[0]?.verse_uid ?? "";
  const verse: Shloka | undefined = (verses ?? []).find((v) => v.verse_uid === pieceUid);

  const enter = async () => {
    setGateMsg("");
    try {
      const [p, r] = await Promise.all([api.publicProfile(), api.competitionRules().catch(() => ({ version: "" }))]);
      if (!p.public_name || !p.age_confirmed || !p.rules_version || !p.recordings_consent) {
        navigation.navigate("ContestRules" as never);
        return;
      }
      if (r.version && p.rules_version !== r.version) {
        navigation.navigate("ContestRules" as never);
        return;
      }
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return;
      setGateMsg("Could not check entry. Check your connection and try again.");
      return;
    }
    if (comp) {
      // Enter goes to the first unsubmitted piece (single-piece events: the piece).
      const nextPiece = (comp.pieces ?? []).find(
        (p) => !comp.me?.piece_results?.[p.source_ref]) ?? comp.pieces?.[0];
      const v = nextPiece
        ? (verses ?? []).find((x) => x.verse_uid === nextPiece.verse_uid) ?? verse
        : verse;
      if (v) {
        (navigation as never as { navigate: (r: string, p?: object) => void }).navigate("Recite", {
          verseUid: v.verse_uid ?? v.id, competitionId: comp.id, start: "recite",
        });
      }
    }
  };

  if (!comp) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Competition</Text>
        <Text style={styles.hint}>{nextMsg || "No competition open right now."}</Text>
        {!!lastMsg && <Text style={styles.hint}>{lastMsg}</Text>}
        {!!lastId && (
          <Pressable
            onPress={() => (navigation as never as { navigate: (r: string, p?: object) => void }).navigate("ContestResults", { id: lastId })}
            accessibilityRole="button"
            accessibilityLabel="Open last results"
            style={styles.sec}
          >
            <Text style={styles.secText}>Last results</Text>
          </Pressable>
        )}
      </View>
    );
  }

  // Multi-shloka set events (handover_games_daily_multiplayer §9): every
  // entrant completes the same prescribed set, pieces in any order. Show all
  // pieces with per-piece progress; the event total is the mean of all of
  // them, so an incomplete set stays provisional.
  const isSet = (comp?.pieces?.length ?? 0) > 1;

  return (
    <ScrollView contentContainerStyle={styles.body}>
      <Text style={styles.title} accessibilityRole="header">Competition</Text>
      {isSet ? (
        <>
          <Text style={styles.hint}>
            This week's set: {comp.pieces.length} verses · submit each in any order.
            {"\n"}Your total is the average across all of them.
          </Text>
          {comp.pieces.map((p, i) => {
            const v = (verses ?? []).find((x) => x.verse_uid === p.verse_uid);
            const submitted = !!comp.me?.piece_results?.[p.source_ref];
            return (
              <Pressable
                key={p.verse_uid || i}
                onPress={() => {
                  if (v) {
                    (navigation as never as { navigate: (r: string, params?: object) => void }).navigate("Recite", {
                      verseUid: v.verse_uid ?? v.id, competitionId: comp.id, start: submitted ? "practise" : "recite",
                    });
                  }
                }}
                accessibilityRole="button"
                accessibilityLabel={`${submitted ? "Submitted" : "Recite"} verse ${p.source_ref}`}
                style={styles.pieceRow}
              >
                <Ionicons name={submitted ? "checkmark-circle" : "ellipse-outline"} size={18}
                  color={submitted ? "#2C5F50" : color.inkFaint} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.pieceRef}>{p.source_ref}</Text>
                  {v && <Text style={[sanskritText(14), { color: color.inkSoft }]} numberOfLines={1}>{v.devanagari}</Text>}
                </View>
                <Ionicons name="chevron-forward" size={16} color={color.inkFaint} />
              </Pressable>
            );
          })}
        </>
      ) : (
        <>
          <Text style={styles.ref}>{comp.pieces?.[0]?.source_ref ?? ""}</Text>
          {verse && <Text style={[sanskritText(20), { color: color.ink }]}>{verse.devanagari}</Text>}
        </>
      )}
      <Text style={styles.hint}>Closes {comp.closes_at}</Text>
      {!!comp.me && <Text style={styles.hint}>Best {comp.me.best_percent ?? "-"} rank {comp.me.rank ?? "-"}</Text>}
      <Text style={styles.hint}>Attempts left today {comp.me?.attempts_left ?? "-"}</Text>
      <View style={styles.row}>
        <Pressable
          onPress={() => {
            if (verse) {
              (navigation as never as { navigate: (r: string, p?: object) => void }).navigate("Recite", {
                verseUid: verse.verse_uid ?? verse.id, start: "listen",
              });
            }
          }}
          accessibilityRole="button"
          accessibilityLabel="Learn this verse"
          style={styles.sec}
        >
          <Text style={styles.secText}>Learn this verse</Text>
        </Pressable>
        <Pressable onPress={() => void enter()} accessibilityRole="button" accessibilityLabel="Enter" style={styles.pri}>
          <Text style={styles.priText}>Enter</Text>
        </Pressable>
      </View>
      {!!gateMsg && <Text style={styles.hint}>{gateMsg}</Text>}
      <Text style={styles.section}>Leaderboard</Text>
      {board.map((r) => (
        <Text key={r.rank} style={styles.rowText}>{r.rank}. {plain(r.public_name)} {r.percent}%</Text>
      ))}
      {!!meRank && <Text style={[styles.rowText, { fontWeight: "800" }]}>{meRank}</Text>}
      <Pressable
        onPress={() => navigation.navigate("ContestRules" as never)}
        accessibilityRole="button"
        accessibilityLabel="Competition rules"
        style={styles.link}
      >
        <Text style={styles.linkText}>Rules</Text>
      </Pressable>
      <Pressable
        onPress={() => navigation.navigate("MasterBoard" as never)}
        accessibilityRole="button"
        accessibilityLabel="Master board"
        style={styles.link}
      >
        <Text style={styles.linkText}>Master board</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pieceRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: color.border, minHeight: 56 },
  pieceRef: { fontWeight: "800", color: color.ink, fontSize: 16 },
  body: { padding: 16, gap: 8, paddingBottom: 120 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  title: { fontSize: 22, fontWeight: "800", color: color.ink },
  ref: { fontSize: 13, color: color.inkSoft },
  hint: { fontSize: 14, color: color.inkSoft },
  row: { flexDirection: "row", gap: 8 },
  pri: { minHeight: 48, flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: fill.teal, borderRadius: 12 },
  priText: { color: onFill.text, fontWeight: "800" },
  sec: { minHeight: 48, flex: 1, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "#D9C9AE", borderRadius: 12 },
  secText: { color: color.ink, fontWeight: "700" },
  section: { fontSize: 16, fontWeight: "800", color: color.ink, marginTop: 8 },
  rowText: { fontSize: 14, color: color.ink, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#EFE3CE" },
  link: { minHeight: 44, justifyContent: "center" },
  linkText: { color: color.ink, fontWeight: "700" },
});
