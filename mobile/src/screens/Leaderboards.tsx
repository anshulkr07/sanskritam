// Leaderboards (design option B, owner-picked 2026-10-14): your standing
// first, then the top of the board and the players around you.
//
// Today | This week | This month as tabs; the board (all games or one game)
// and Everyone | Friends as two pickers. The standing card says where you
// are, out of how many, how many games counted and how far it is to pass
// the next rank, all read off the board the server sends (the top 50 and
// your own row). Ties share a rank. "Around you" needs your neighbours in
// that top 50; further down, the card still shows your own row.
//
// The stack header already says "Leaderboards" with a back arrow, so the
// screen draws no bar of its own.
//
// Games | Recitation (handover_games_daily_multiplayer §9): recitation
// standings never mix with game points. Recitation has This week (the weekly
// three-verse set; ranked = all three verses in) and This month (the average
// of the month's weekly totals), each per division. There is no daily
// recitation event, so there is no Today tab for it.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api, type Division } from "../api/client";
import { playApi, type Leaderboard, type LeaderRow } from "../games/v2/client";
import { CREAM, CREAM_FAINT, GOLD, T, softOn, ui } from "../read/look";
import { ProgressLine } from "../read/ui";
import { haptics } from "../services/haptics";

type Track = "games" | "recitation";

type Props = {
  navigation: { goBack: () => void };
  route?: { params?: { period?: "daily" | "weekly" | "monthly"; board?: string; track?: Track; division?: Division } };
};

type RecRow = LeaderRow & { of?: number; pending?: number };

type Period = "daily" | "weekly" | "monthly";

const PERIODS: { key: Period; label: string; card: string }[] = [
  { key: "daily", label: "Today", card: "TODAY" },
  { key: "weekly", label: "This week", card: "THIS WEEK" },
  { key: "monthly", label: "This month", card: "THIS MONTH" },
];

const BOARDS: { key: string; label: string }[] = [
  { key: "combined", label: "All games" },
  { key: "rush", label: "Rush" },
  { key: "smriti", label: "Smriti" },
  { key: "varna-jaal", label: "Varna Jaal" },
  { key: "daily-word", label: "Daily word" },
  { key: "word-groups", label: "Word Groups" },
  { key: "pada-path", label: "Pada Path" },
  { key: "number", label: "Number" },
];

const REC_PERIODS: { key: Period; label: string; card: string }[] = [
  { key: "weekly", label: "This week", card: "THIS WEEK" },
  { key: "monthly", label: "This month", card: "THIS MONTH" },
];

const DIVISIONS: { key: Division; label: string }[] = [
  { key: "standard", label: "Standard" },
  { key: "beginner", label: "Beginner" },
];

const SCOPES: { key: "everyone" | "friends"; label: string }[] = [
  { key: "everyone", label: "Everyone" },
  { key: "friends", label: "Friends" },
];

// Medal squares for the top three: deep fills, cream numbers on them.
const MEDAL = ["#8A5608", "#4F5B6B", "#8A4B22"];
const CARD = "#17535C";

export default function LeaderboardsScreen({ route }: Props) {
  const [track, setTrack] = useState<Track>(route?.params?.track ?? "games");
  const [period, setPeriod] = useState<Period>(route?.params?.period ?? (route?.params?.track === "recitation" ? "weekly" : "daily"));
  const [board, setBoard] = useState<string>(route?.params?.board ?? "combined");
  const [scope, setScope] = useState<"everyone" | "friends">("everyone");
  const [division, setDivision] = useState<Division>(route?.params?.division ?? "standard");
  const [data, setData] = useState<Leaderboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [picker, setPicker] = useState<"board" | "scope" | "division" | null>(null);
  const [all, setAll] = useState(false);
  const [explain, setExplain] = useState(false);
  const rec = track === "recitation";
  const periods = rec ? REC_PERIODS : PERIODS;

  const load = useCallback(() => {
    setLoading(true);
    setErr(null);
    const req: Promise<Leaderboard> = rec
      ? api.competitionStandings(period === "monthly" ? "monthly" : "weekly", division) as unknown as Promise<Leaderboard>
      : playApi.leaderboard({ period, board, scope, limit: 50 });
    req
      .then(setData)
      .catch((e) => setErr(e instanceof Error ? e.message : "Couldn't load the board."))
      .finally(() => setLoading(false));
  }, [rec, period, board, scope, division]);

  const switchTrack = (t: Track) => {
    if (t === track) return;
    haptics.tap();
    setTrack(t);
    setPeriod(t === "recitation" ? "weekly" : "daily");
    setExplain(false);
  };

  useEffect(() => {
    load();
    setAll(false);
  }, [load]);

  const boardLabel = BOARDS.find((b) => b.key === board)?.label ?? "All games";
  const scopeLabel = SCOPES.find((s) => s.key === scope)?.label ?? "Everyone";
  const divisionLabel = DIVISIONS.find((d) => d.key === division)?.label ?? "Standard";
  const periodMeta = periods.find((p) => p.key === period) ?? periods[0];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.track} accessibilityRole="tablist">
        {(["games", "recitation"] as const).map((t) => (
          <Pressable accessibilityLabel={t === "games" ? "Games standings" : "Recitation standings"}
            key={t}
            onPress={() => switchTrack(t)}
            accessibilityRole="tab"
            accessibilityState={{ selected: track === t }}
            style={[styles.trackBtn, track === t && styles.trackOn]}
          >
            <Text style={[styles.trackText, track === t && styles.trackTextOn]}>{t === "games" ? "Games" : "Recitation"}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.tabs} accessibilityRole="tablist">
        {periods.map((p) => {
          const on = p.key === period;
          return (
            <Pressable accessibilityLabel={p.label}
              key={p.key}
              onPress={() => {
                haptics.tap();
                setPeriod(p.key);
              }}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              style={[styles.tab, on && styles.tabOn]}
            >
              <Text style={[styles.tabText, on && styles.tabTextOn]}>{p.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.pickers}>
        {rec ? (
          <PickerButton label={`${divisionLabel} division`} a11y={`Division: ${divisionLabel}. Change`} onPress={() => setPicker("division")} />
        ) : (
          <>
            <PickerButton label={boardLabel} a11y={`Board: ${boardLabel}. Change board`} onPress={() => setPicker("board")} />
            <PickerButton label={scopeLabel} a11y={`Showing ${scopeLabel}. Change`} onPress={() => setPicker("scope")} />
          </>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {loading && <Text style={styles.state}>Loading the board.</Text>}
        {!loading && err && (
          <View style={styles.stateBox}>
            <Ionicons name="cloud-offline-outline" size={24} color={T.ink3} />
            <Text style={styles.state}>{err}</Text>
            <Pressable accessibilityLabel="Try again" onPress={load} accessibilityRole="button" style={styles.retry}>
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        )}
        {!loading && !err && data && (
          <>
            <Standing
              data={data}
              title={`YOUR STANDING ${periodMeta.card}`}
              combined={board === "combined"}
              rec={rec ? (period === "monthly" ? "monthly" : "weekly") : null}
              explainOpen={explain}
              onExplain={() => setExplain((v) => !v)}
            />
            {explain && <Explain data={data} combined={board === "combined"} rec={rec ? (period === "monthly" ? "monthly" : "weekly") : null} />}
            {data.empty ? (
              <View style={styles.stateBox}>
                <Ionicons name="sparkles-outline" size={24} color={T.ink3} />
                <Text style={styles.state}>
                  {rec
                    ? period === "monthly"
                      ? "No recitation results in this month yet."
                      : "Nobody has recited all three of this week's verses yet."
                    : scope === "friends"
                      ? "None of your friends has played a ranked round in this period yet."
                      : "No one has played a ranked round in this period yet. Be the first."}
                </Text>
              </View>
            ) : (
              <Boards data={data} all={all} onAll={() => setAll((v) => !v)} />
            )}
          </>
        )}
      </ScrollView>

      <Picker
        visible={picker !== null}
        title={picker === "scope" ? "Show" : picker === "division" ? "Division" : "Board"}
        options={picker === "scope" ? SCOPES : picker === "division" ? DIVISIONS : BOARDS}
        value={picker === "scope" ? scope : picker === "division" ? division : board}
        onPick={(k) => {
          haptics.tap();
          if (picker === "scope") setScope(k as "everyone" | "friends");
          else if (picker === "division") setDivision(k as Division);
          else setBoard(k);
          setPicker(null);
        }}
        onClose={() => setPicker(null)}
      />
    </SafeAreaView>
  );
}

function PickerButton({ label, a11y, onPress }: { label: string; a11y: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      style={styles.pickerBtn}
    >
      <Text style={styles.pickerText}>{label}</Text>
      <Ionicons name="chevron-down" size={16} color={T.ink} />
    </Pressable>
  );
}

/** "6 h 12 m", "48 m", or null when the period has closed. */
function timeLeft(iso: string): string | null {
  const end = Date.parse(iso);
  if (!Number.isFinite(end)) return null;
  const min = Math.max(0, Math.round((end - Date.now()) / 60000));
  if (min <= 0) return null;
  const d = Math.floor(min / 1440);
  const h = Math.floor((min % 1440) / 60);
  const m = min % 60;
  if (d > 0) return `${d} d ${h} h`;
  return h > 0 ? `${h} h ${m} m` : `${m} m`;
}

function fmt(n: number): string {
  return n.toLocaleString("en-IN");
}

/** The teal card: rank, out of how many, points, games, the gap upward. */
function Standing({
  data,
  title,
  combined,
  rec,
  explainOpen,
  onExplain,
}: {
  data: Leaderboard;
  title: string;
  combined: boolean;
  rec: "weekly" | "monthly" | null;
  explainOpen: boolean;
  onExplain: () => void;
}) {
  const soft = softOn(CARD);
  const meRaw = (data.me ?? data.rows.find((r) => r.is_me) ?? null) as RecRow | null;
  if (rec && meRaw && !meRaw.rank) {
    // In the weekly set but not ranked yet: not every verse is in.
    const left = data.frozen ? null : timeLeft(data.period_end);
    return (
      <View style={styles.card}>
        <Text style={[styles.cardEyebrow, { color: GOLD }]}>{title}</Text>
        <Text style={styles.unranked}>
          {meRaw.participation} of {meRaw.of ?? 3} verses in. Recite all of them to get a rank.
        </Text>
        <Text style={[styles.cardFootSide, { color: soft, marginTop: 8 }]}>
          Total so far {fmt(meRaw.score)} (missing verses count as zero){left ? ` · closes in ${left}` : ""}
        </Text>
      </View>
    );
  }
  const me = meRaw;
  const left = data.frozen ? null : timeLeft(data.period_end);
  // The nearest row ranked above you, and what it takes to pass it.
  const above = me ? [...data.rows].reverse().find((r) => r.rank < me.rank) ?? null : null;
  const gap = me && above ? above.score - me.score + 1 : 0;

  return (
    <View style={styles.card} accessibilityLabel={me ? `Your rank ${me.rank} of ${data.total}, ${me.score} points` : "Not ranked yet"}>
      <View style={styles.cardTop}>
        <Text style={[styles.cardEyebrow, { color: GOLD }]}>{title}</Text>
        <Pressable onPress={onExplain} accessibilityRole="button" accessibilityState={{ expanded: explainOpen }} hitSlop={10}>
          <Text style={[styles.cardLink, { color: CREAM }]}>{rec ? "How scores work" : "How points work"}</Text>
        </Pressable>
      </View>
      {me ? (
        <>
          <View style={styles.rankRow}>
            <Text style={styles.rankBig}>#{me.rank}</Text>
            {data.total > 0 && (
              <Text style={[styles.rankOf, { color: soft }]}>
                of {fmt(data.total)} player{data.total === 1 ? "" : "s"}
              </Text>
            )}
          </View>
          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text style={styles.statNum}>{fmt(me.score)}</Text>
              <Text style={[styles.statLabel, { color: soft }]}>{rec === "weekly" ? "week total" : rec === "monthly" ? "monthly average" : "points"}</Text>
            </View>
            <View style={[styles.stat, styles.statRight]}>
              <Text style={styles.statNum}>{rec === "weekly" ? `${me.participation} of ${(me as RecRow).of ?? 3}` : combined && !rec ? `${me.participation} of 3` : fmt(me.participation)}</Text>
              <Text style={[styles.statLabel, { color: soft }]}>{rec === "weekly" ? "verses in" : rec === "monthly" ? "weeks finished" : combined ? "games counted" : "rounds played"}</Text>
            </View>
          </View>
          <View style={styles.cardFoot}>
            <Text style={styles.cardFootMain}>
              {me.rank === 1 ? "You lead the board" : above ? (rec ? `${fmt(Math.round((above.score - me.score) * 10) / 10)} behind #${above.rank}` : `${fmt(gap)} point${gap === 1 ? "" : "s"} to pass #${above.rank}`) : ""}
            </Text>
            <Text style={[styles.cardFootSide, { color: soft }]}>{left ? `Resets in ${left}` : "Final standings"}</Text>
          </View>
          {above && above.score > 0 && (
            <ProgressLine frac={me.score / above.score} fillColor={CREAM} trackColor={CREAM_FAINT} style={{ marginTop: 8 }} />
          )}
        </>
      ) : (
        <>
          <Text style={styles.unranked}>{rec === "weekly" ? "Recite all three of this week's verses to get on the board." : rec === "monthly" ? "Finish a weekly competition to get on this table." : "Play a ranked round to get on the board."}</Text>
          <Text style={[styles.cardFootSide, { color: soft, marginTop: 8 }]}>{left ? `Resets in ${left}` : "Final standings"}</Text>
        </>
      )}
    </View>
  );
}

function Explain({ data, combined, rec }: { data: Leaderboard; combined: boolean; rec: "weekly" | "monthly" | null }) {
  if (rec) {
    return (
      <View style={styles.explain}>
        <Text style={styles.explainText}>
          Each recitation is scored out of 100: words 60, order 20, flow 15 and pace 5. Your score for a verse is your best
          counted recitation of it, and your week total is the average of the week's three verses. Only people who have
          recited all three are ranked.
          {rec === "monthly" ? " The monthly table averages your weekly totals for the weeks that close this month; a week you started but did not finish counts as zero." : ""}
          {" "}Equal scores share a rank. Times are India Standard Time.
        </Text>
        {data.frozen ? <Text style={styles.explainText}>This period has closed and the standings are frozen.</Text> : null}
      </View>
    );
  }
  return (
    <View style={styles.explain}>
      <Text style={styles.explainText}>
        {combined
          ? "All games adds up your best ranked result from three different games (up to 3,000). Each game allows three ranked rounds a day; your best counts."
          : "This board counts your best ranked results in this game. Each game allows three ranked rounds a day."}{" "}
        Equal scores share a rank. Days run on India Standard Time and reset at midnight IST.
      </Text>
      {data.frozen ? <Text style={styles.explainText}>This period has closed and the standings are frozen.</Text> : null}
    </View>
  );
}

/** Top of the board (or the whole list) and the players around you. */
function Boards({ data, all, onAll }: { data: Leaderboard; all: boolean; onAll: () => void }) {
  const meIdx = data.rows.findIndex((r) => r.is_me);
  const around = useMemo(() => {
    if (meIdx < 3) return [];
    return data.rows.slice(Math.max(3, meIdx - 1), meIdx + 3);
  }, [data.rows, meIdx]);
  const top = all ? data.rows : data.rows.slice(0, 3);
  const more = data.total > 3 || data.rows.length > 3;

  return (
    <>
      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle} accessibilityRole="header">
            {all ? "Standings" : "Top of the board"}
          </Text>
          {more && (
            <Pressable onPress={onAll} accessibilityRole="button" hitSlop={10}>
              <Text style={styles.sectionLink}>
                {all ? "Show less" : data.rows.length < data.total ? `See top ${data.rows.length}` : `See all ${data.total}`}
              </Text>
            </Pressable>
          )}
        </View>
        <View style={styles.rule} />
        {top.map((r) => (
          <Row key={r.learner_id} row={r} />
        ))}
      </View>
      {!all && around.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { marginBottom: 4 }]} accessibilityRole="header">
            Around you
          </Text>
          <View style={styles.rule} />
          {around.map((r) => (
            <Row key={r.learner_id} row={r} />
          ))}
        </View>
      )}
    </>
  );
}

function Row({ row }: { row: LeaderRow }) {
  const medal = row.rank <= 3 ? MEDAL[row.rank - 1] : null;
  return (
    <View
      style={[styles.row, row.is_me && styles.rowMe]}
      accessible
      accessibilityLabel={`Rank ${row.rank}: ${row.is_me ? "you" : row.name}, ${row.score} points`}
    >
      {medal ? (
        <View style={[styles.medal, { backgroundColor: medal }]}>
          <Text style={styles.medalText}>{row.rank}</Text>
        </View>
      ) : (
        <Text style={[styles.rank, row.is_me && { color: T.action }]}>{row.rank}</Text>
      )}
      <Text style={[styles.name, row.is_me && styles.nameMe]} numberOfLines={1}>
        {row.is_me ? "You" : row.name}
      </Text>
      <Text style={styles.score}>{fmt(row.score)}</Text>
    </View>
  );
}

function Picker({
  visible,
  title,
  options,
  value,
  onPick,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: { key: string; label: string }[];
  value: string;
  onPick: (key: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
        <Pressable style={styles.sheet} onPress={() => {}} accessible={false}>
          <Text style={styles.sheetTitle} accessibilityRole="header">
            {title}
          </Text>
          {options.map((o) => {
            const on = o.key === value;
            return (
              <Pressable
                key={o.key}
                onPress={() => onPick(o.key)}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                style={styles.option}
              >
                <Text style={[styles.optionText, on && styles.optionTextOn]}>{o.label}</Text>
                {on && <Ionicons name="checkmark" size={20} color={T.action} />}
              </Pressable>
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.paper },
  track: { flexDirection: "row", marginHorizontal: 16, marginTop: 10, marginBottom: 6, borderWidth: 1.5, borderColor: T.ink },
  trackBtn: { flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center" },
  trackOn: { backgroundColor: T.ink },
  trackText: { ...ui("semibold"), fontSize: 15, color: T.ink },
  trackTextOn: { color: T.paper },
  tabs: { flexDirection: "row", gap: 26, marginHorizontal: 16, borderBottomWidth: 1, borderBottomColor: T.line },
  tab: { minHeight: 44, justifyContent: "center", borderBottomWidth: 3, borderBottomColor: "transparent", marginBottom: -1 },
  tabOn: { borderBottomColor: T.action },
  tabText: { ...ui("medium"), fontSize: 16, color: T.ink3 },
  tabTextOn: { ...ui("semibold"), color: T.ink },
  pickers: { flexDirection: "row", gap: 10, marginHorizontal: 16, marginTop: 12 },
  pickerBtn: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: T.lineStrong,
  },
  pickerText: { ...ui("semibold"), fontSize: 14.5, color: T.ink },
  body: { padding: 16, paddingBottom: 48 },
  state: { ...ui("regular"), fontSize: 15, color: T.ink2, textAlign: "center", marginTop: 12 },
  stateBox: { alignItems: "center", gap: 8, paddingVertical: 28, paddingHorizontal: 24 },
  retry: { borderWidth: 1.5, borderColor: T.ink, minHeight: 44, paddingHorizontal: 20, justifyContent: "center" },
  retryText: { ...ui("semibold"), fontSize: 15, color: T.ink },
  card: { backgroundColor: CARD, paddingHorizontal: 18, paddingTop: 14, paddingBottom: 18 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  cardEyebrow: { ...ui("bold"), fontSize: 12, letterSpacing: 1.4, flexShrink: 1 },
  cardLink: { ...ui("semibold"), fontSize: 13, textDecorationLine: "underline" },
  rankRow: { flexDirection: "row", alignItems: "baseline", gap: 12, marginTop: 2 },
  rankBig: { ...ui("bold"), fontSize: 52, lineHeight: 60, color: CREAM, fontVariant: ["tabular-nums"] },
  rankOf: { ...ui("regular"), fontSize: 15 },
  stats: { flexDirection: "row", marginTop: 10, borderTopWidth: 1, borderBottomWidth: 1, borderColor: CREAM_FAINT },
  stat: { flex: 1, paddingVertical: 10 },
  statRight: { paddingLeft: 16, borderLeftWidth: 1, borderLeftColor: CREAM_FAINT },
  statNum: { ...ui("bold"), fontSize: 21, lineHeight: 26, color: CREAM, fontVariant: ["tabular-nums"] },
  statLabel: { ...ui("regular"), fontSize: 12.5 },
  cardFoot: { flexDirection: "row", justifyContent: "space-between", gap: 12, marginTop: 12 },
  cardFootMain: { ...ui("semibold"), fontSize: 13.5, color: CREAM, flexShrink: 1 },
  cardFootSide: { ...ui("regular"), fontSize: 13 },
  unranked: { ...ui("semibold"), fontSize: 18, lineHeight: 25, color: CREAM, marginTop: 10 },
  explain: { borderWidth: 1, borderColor: T.line, backgroundColor: T.surface, padding: 14, gap: 6, marginTop: 10 },
  explainText: { ...ui("regular"), fontSize: 14, lineHeight: 21, color: T.ink2 },
  section: { marginTop: 22 },
  sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 },
  sectionTitle: { ...ui("bold"), fontSize: 17, color: T.ink },
  sectionLink: { ...ui("semibold"), fontSize: 14, color: T.action },
  rule: { height: 1, backgroundColor: T.line },
  row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 50, borderBottomWidth: 1, borderBottomColor: T.line },
  rowMe: { borderWidth: 1.5, borderColor: T.ink, backgroundColor: T.surface, paddingHorizontal: 8, marginHorizontal: -8 },
  medal: { width: 28, height: 28, alignItems: "center", justifyContent: "center" },
  medalText: { ...ui("bold"), fontSize: 14, color: CREAM },
  rank: { ...ui("bold"), width: 28, textAlign: "center", fontSize: 15, color: T.ink2, fontVariant: ["tabular-nums"] },
  name: { ...ui("semibold"), flex: 1, fontSize: 15, color: T.ink },
  nameMe: { ...ui("bold") },
  score: { ...ui("bold"), fontSize: 15.5, color: T.ink, fontVariant: ["tabular-nums"] },
  scrim: { flex: 1, backgroundColor: T.scrim, justifyContent: "flex-end" },
  sheet: { backgroundColor: T.paper, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 28 },
  sheetTitle: { ...ui("bold"), fontSize: 19, color: T.ink, marginBottom: 6 },
  option: { minHeight: 50, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: T.line },
  optionText: { ...ui("regular"), fontSize: 16, color: T.ink },
  optionTextOn: { ...ui("semibold"), color: T.action },
});
