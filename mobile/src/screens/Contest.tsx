// Contest: this week's recitation competition (handover_games_daily_multiplayer
// §9). Weekly three-verse sets: pick a division (fixed once you submit),
// see your three verses with your best score on each, recite them in any
// order, and follow the division's standings. Your week total is the average
// of all three, so it stays provisional ("2 of 3") until all are in. Older
// single-verse events still show as one verse.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import React, { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import type { RootStackParamList } from "../navigation/types";
import { ApiError, api, type Competition, type CompetitionPiece, type Division, type Shloka } from "../api/client";
import { useQuery } from "../hooks/useQuery";
import { T, sa, ui } from "../read/look";
import { plain } from "../utils/text";

type Props = NativeStackScreenProps<RootStackParamList, "Contest">;
type Nav = { navigate: (r: string, p?: object) => void };

const DIV_KEY = "shabd.contest.division.";
const LENGTH_LABEL: Record<string, string> = { short: "Short", medium: "Medium", longer: "Longer" };

/** "Mon 12 Oct, 12:00 am" in India time (the competition clock). */
export function istLabel(iso: string, withTime = false): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  const opts: Intl.DateTimeFormatOptions = {
    timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  };
  try {
    return new Intl.DateTimeFormat("en-IN", opts).format(new Date(t));
  } catch {
    return new Date(t).toDateString();
  }
}

export function timeLeft(iso: string, now = Date.now()): string {
  const end = Date.parse(iso);
  if (!Number.isFinite(end) || end <= now) return "";
  const min = Math.round((end - now) / 60000);
  const d = Math.floor(min / 1440);
  const h = Math.floor((min % 1440) / 60);
  if (d > 0) return `${d} d ${h} h left`;
  return h > 0 ? `${h} h ${min % 60} m left` : `${min % 60} m left`;
}

export default function ContestScreen({ navigation }: Props) {
  const nav = navigation as unknown as Nav;
  const [comp, setComp] = useState<Competition | null>(null);
  const [next, setNext] = useState<Competition | null>(null);
  const [last, setLast] = useState<{ id: string; rank: number | null; cert: boolean } | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [division, setDivision] = useState<Division>("standard");
  const [board, setBoard] = useState<{ rank: number | null; public_name: string; percent: number; is_me?: boolean }[]>([]);
  const [boardMe, setBoardMe] = useState<{ rank: number | null; percent: number; submitted?: number; total?: number; complete?: boolean } | null>(null);
  const [gateMsg, setGateMsg] = useState("");
  const { data: verses } = useQuery("reader-verses", api.listShlokas, { ttlMs: 30 * 60_000 });

  const loadBoard = useCallback((c: Competition, d: Division) => {
    api.competitionLeaderboard(c.id, 5, c.is_set ? d : undefined).then((b) => {
      setBoard(b.rows ?? []);
      setBoardMe(b.me ?? null);
    }).catch(() => { setBoard([]); setBoardMe(null); });
  }, []);

  const load = useCallback(() => {
    setFailed(false);
    api.competitionCurrent()
      .then(async (c) => {
        setComp(c.open);
        setNext(c.next);
        setLast(c.last ? { id: c.last.competition?.id ?? "", rank: c.last.my_rank, cert: !!c.last.certificate_code } : null);
        let d: Division = "standard";
        if (c.open?.me?.division) d = c.open.me.division;
        else if (c.open) {
          const saved = await AsyncStorage.getItem(DIV_KEY + c.open.id).catch(() => null);
          if (saved === "beginner") d = "beginner";
        }
        setDivision(d);
        if (c.open) loadBoard(c.open, d);
      })
      .catch(() => setFailed(true))
      .finally(() => setLoaded(true));
  }, [loadBoard]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const chooseDivision = (d: Division) => {
    if (!comp || comp.me?.division) return;
    setDivision(d);
    void AsyncStorage.setItem(DIV_KEY + comp.id, d).catch(() => {});
    loadBoard(comp, d);
  };

  const ensureEntered = async (): Promise<boolean> => {
    setGateMsg("");
    try {
      const [p, r] = await Promise.all([api.publicProfile(), api.competitionRules().catch(() => ({ version: "" }))]);
      if (!p.public_name || !p.age_confirmed || !p.rules_version || !p.recordings_consent || (r.version && p.rules_version !== r.version)) {
        navigation.navigate("ContestRules" as never);
        return false;
      }
      return true;
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) setGateMsg("Sign in with Google or Apple to enter.");
      else setGateMsg("Could not check your entry. Check your connection and try again.");
      return false;
    }
  };

  const verseFor = (p: CompetitionPiece): Shloka | undefined => (verses ?? []).find((v) => v.verse_uid === p.verse_uid);

  const recite = async (p: CompetitionPiece) => {
    if (!comp || !(await ensureEntered())) return;
    const v = verseFor(p);
    nav.navigate("Recite", { verseUid: v?.verse_uid ?? p.verse_uid, competitionId: comp.id, start: "recite", division });
  };

  const learn = (p: CompetitionPiece) => {
    const v = verseFor(p);
    nav.navigate("Recite", { verseUid: v?.verse_uid ?? p.verse_uid, start: "listen" });
  };

  if (!loaded) {
    return <View style={styles.center}><Text style={styles.body}>Loading the competition…</Text></View>;
  }

  if (!comp) {
    return (
      <ScrollView style={{ backgroundColor: T.paper }} contentContainerStyle={styles.page}>
        <Text style={styles.h1}>Recitation competition</Text>
        <Text style={styles.body}>
          {failed ? "Could not load the competition. Check your connection." :
            next?.opens_at ? `No competition is open. The next one opens ${istLabel(next.opens_at, true)} (India time).` :
              "No competition is open right now."}
        </Text>
        {failed && (
          <Pressable accessibilityLabel="Try again" onPress={load} accessibilityRole="button" style={styles.secondary}>
            <Text style={styles.secondaryText}>Try again</Text>
          </Pressable>
        )}
        {!!last?.id && (
          <Pressable accessibilityLabel="Last results" onPress={() => nav.navigate("ContestResults", { id: last.id })} accessibilityRole="button" style={styles.secondary}>
            <Text style={styles.secondaryText}>Last results{last.rank ? ` · you were #${last.rank}` : ""}{last.cert ? " · certificate ready" : ""}</Text>
          </Pressable>
        )}
        <Links nav={nav} navigation={navigation} />
      </ScrollView>
    );
  }

  const isSet = !!comp.is_set;
  const pieces = isSet
    ? comp.pieces.filter((p) => !p.division || p.division === division)
    : comp.pieces;
  const results = comp.me?.piece_results ?? {};
  const progress = comp.me?.set_progress;
  const submitted = pieces.filter((p) => results[p.source_ref]).length;
  const locked = !!comp.me?.division;
  const left = timeLeft(comp.closes_at);

  return (
    <ScrollView style={{ backgroundColor: T.paper }} contentContainerStyle={styles.page}>
      <Text style={styles.eyebrow}>THIS WEEK'S COMPETITION</Text>
      <Text style={styles.h1}>{isSet ? "Three verses, from memory" : "Recite the verse from memory"}</Text>
      <Text style={styles.small}>
        {istLabel(comp.opens_at)} – {istLabel(comp.closes_at)}{left ? ` · ${left}` : ""}. Results {istLabel(comp.results_at, true)} (India time).
      </Text>

      {isSet && (
        <View style={styles.block}>
          <Text style={styles.label}>YOUR DIVISION</Text>
          <View style={styles.segment} accessibilityRole="radiogroup">
            {(["standard", "beginner"] as const).map((d) => (
              <Pressable accessibilityLabel={d === "standard" ? "Standard division" : "Beginner division"} key={d} onPress={() => chooseDivision(d)} disabled={locked && d !== division}
                accessibilityRole="radio" accessibilityState={{ checked: division === d, disabled: locked && d !== division }}
                style={[styles.segBtn, division === d && styles.segOn]}>
                <Text style={[styles.segText, division === d && styles.segTextOn]}>{d === "standard" ? "Standard" : "Beginner"}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.small}>
            {locked
              ? "Fixed for this week: you have already submitted a verse."
              : "Beginner has three shorter verses. Choose before your first recitation; it stays fixed for the week."}
          </Text>
        </View>
      )}

      <View style={styles.block}>
        {pieces.map((p, i) => {
          const v = verseFor(p);
          const best = results[p.source_ref]?.percent;
          const firstLine = (v?.chant?.lines?.[0]?.text ?? v?.devanagari ?? "").split("\n")[0];
          return (
            <View key={`${p.verse_uid}-${i}`} style={styles.piece}>
              <View style={styles.pieceHead}>
                <Ionicons name={best != null ? "checkmark-circle" : "ellipse-outline"} size={22} color={best != null ? T.done : T.ink3} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.pieceRef}>{p.length ? `${LENGTH_LABEL[p.length] ?? p.length} · ` : ""}{p.source_ref}</Text>
                  {!!firstLine && <Text style={[sa(16), { color: T.ink2 }]} numberOfLines={1}>{firstLine}</Text>}
                </View>
                <Text style={styles.pieceScore}>{best != null ? Math.round(best) : "—"}</Text>
              </View>
              <View style={styles.row}>
                <Pressable onPress={() => learn(p)} accessibilityRole="button" accessibilityLabel={`Learn ${p.source_ref}`} style={[styles.secondary, { flex: 1 }]}>
                  <Text style={styles.secondaryText}>Learn</Text>
                </Pressable>
                <Pressable onPress={() => void recite(p)} accessibilityRole="button" accessibilityLabel={`Recite ${p.source_ref} for the competition`}
                  disabled={(comp.me?.attempts_left ?? 1) <= 0}
                  style={[styles.primary, { flex: 1 }, (comp.me?.attempts_left ?? 1) <= 0 && styles.disabled]}>
                  <Text style={styles.primaryText}>{best != null ? "Recite again" : "Recite"}</Text>
                </Pressable>
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.card}>
        {isSet ? (
          <>
            <Text style={styles.cardBig}>{submitted} of {pieces.length} verses</Text>
            <Text style={styles.cardText}>
              {progress?.complete
                ? `Week total ${progress.provisional_total}${comp.me?.rank ? ` · rank #${comp.me.rank}` : ""}`
                : "Your total is the average of all three, so it counts once all three are in."}
            </Text>
          </>
        ) : (
          <Text style={styles.cardBig}>Best {comp.me?.best_percent ?? "—"}{comp.me?.rank ? ` · rank #${comp.me.rank}` : ""}</Text>
        )}
        <Text style={styles.cardText}>Counted attempts left today: {comp.me?.attempts_left ?? "—"}</Text>
      </View>
      {!!gateMsg && <Text style={styles.error}>{gateMsg}</Text>}

      <View style={styles.block}>
        <Text style={styles.h2}>{isSet ? `${division === "beginner" ? "Beginner" : "Standard"} standings` : "Standings"}</Text>
        {board.length === 0 ? (
          <Text style={styles.small}>{isSet ? "Nobody has finished all three verses yet." : "No counted recitations yet."}</Text>
        ) : (
          board.map((r, i) => (
            <View key={`${r.rank}-${i}`} style={[styles.boardRow, r.is_me && styles.boardMe]}>
              <Text style={styles.boardRank}>{r.rank ?? "–"}</Text>
              <Text style={styles.boardName} numberOfLines={1}>{r.is_me ? "You" : plain(r.public_name)}</Text>
              <Text style={styles.boardScore}>{r.percent}</Text>
            </View>
          ))
        )}
        {boardMe && !boardMe.complete && isSet && (
          <Text style={styles.small}>You: {boardMe.submitted ?? 0} of {boardMe.total ?? 3} submitted, not ranked yet.</Text>
        )}
        <Pressable accessibilityLabel="Full standings and the monthly table" onPress={() => nav.navigate("Leaderboards", { track: "recitation", period: "weekly", division })}
          accessibilityRole="button" style={styles.secondary}>
          <Text style={styles.secondaryText}>Full standings and the monthly table</Text>
        </Pressable>
      </View>
      <Links nav={nav} navigation={navigation} lastId={last?.id} />
    </ScrollView>
  );
}

function Links({ nav, navigation, lastId }: { nav: Nav; navigation: Props["navigation"]; lastId?: string }) {
  return (
    <View style={styles.links}>
      <Pressable accessibilityLabel="Rules and entry" onPress={() => navigation.navigate("ContestRules" as never)} accessibilityRole="button" style={styles.link}>
        <Text style={styles.linkText}>Rules and entry</Text>
      </Pressable>
      {!!lastId && (
        <Pressable accessibilityLabel="Last week's results" onPress={() => nav.navigate("ContestResults", { id: lastId })} accessibilityRole="button" style={styles.link}>
          <Text style={styles.linkText}>Last week's results</Text>
        </Pressable>
      )}
      <Pressable accessibilityLabel="Past monthly winners" onPress={() => navigation.navigate("MasterBoard" as never)} accessibilityRole="button" style={styles.link}>
        <Text style={styles.linkText}>Past monthly winners</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, gap: 14, paddingBottom: 120 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: T.paper },
  eyebrow: { ...ui("bold"), fontSize: 12, letterSpacing: 1.4, color: T.action },
  h1: { ...ui("bold"), fontSize: 24, lineHeight: 30, color: T.ink },
  h2: { ...ui("bold"), fontSize: 18, color: T.ink },
  body: { ...ui("regular"), fontSize: 15, lineHeight: 22, color: T.ink },
  small: { ...ui("regular"), fontSize: 13, lineHeight: 19, color: T.ink2 },
  label: { ...ui("bold"), fontSize: 12, letterSpacing: 1.2, color: T.ink3 },
  block: { gap: 8 },
  row: { flexDirection: "row", gap: 8 },
  segment: { flexDirection: "row", borderWidth: 1.5, borderColor: T.ink },
  segBtn: { flex: 1, minHeight: 46, alignItems: "center", justifyContent: "center" },
  segOn: { backgroundColor: T.ink },
  segText: { ...ui("semibold"), fontSize: 15, color: T.ink },
  segTextOn: { color: T.paper },
  piece: { gap: 10, padding: 12, backgroundColor: T.surface, borderWidth: 1, borderColor: T.line },
  pieceHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  pieceRef: { ...ui("bold"), fontSize: 15, color: T.ink },
  pieceScore: { ...ui("bold"), fontSize: 22, color: T.ink, fontVariant: ["tabular-nums"], minWidth: 40, textAlign: "right" },
  primary: { minHeight: 48, alignItems: "center", justifyContent: "center", backgroundColor: T.action, paddingHorizontal: 12 },
  primaryText: { ...ui("bold"), fontSize: 15, color: T.white },
  secondary: { minHeight: 48, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: T.ink, paddingHorizontal: 12 },
  secondaryText: { ...ui("semibold"), fontSize: 15, color: T.ink, textAlign: "center" },
  disabled: { backgroundColor: T.muted },
  card: { backgroundColor: "#17535C", padding: 16, gap: 4 },
  cardBig: { ...ui("bold"), fontSize: 20, color: "#FFF8EE" },
  cardText: { ...ui("regular"), fontSize: 14, lineHeight: 20, color: "rgba(255,248,238,0.88)" },
  error: { ...ui("medium"), fontSize: 15, color: T.wrongInk },
  boardRow: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 46, borderBottomWidth: 1, borderBottomColor: T.line },
  boardMe: { backgroundColor: T.surface, borderWidth: 1.5, borderColor: T.ink, paddingHorizontal: 8, marginHorizontal: -8 },
  boardRank: { ...ui("bold"), width: 28, textAlign: "center", fontSize: 15, color: T.ink2 },
  boardName: { ...ui("semibold"), flex: 1, fontSize: 15, color: T.ink },
  boardScore: { ...ui("bold"), fontSize: 15, color: T.ink, fontVariant: ["tabular-nums"] },
  links: { gap: 0, marginTop: 4 },
  link: { minHeight: 44, justifyContent: "center" },
  linkText: { ...ui("semibold"), fontSize: 15, color: T.action },
});
