// RoomLobby: private rooms (create/join by code), quick-match queue with the
// 15s band-widening and 30s "play solo instead" offer, ready states, shared
// countdown, and the live game surface that renders over the WebSocket.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BASE_URL } from "../config";
import { matchApi, wsUrl, type MatchSnapshot } from "../games/v2/client";
import { GameTopBar } from "../games/v2/parts";
import { usePlayMatchSocket } from "../games/v2/useMatchSocket";
import { useCatalogGame } from "../games/v2/useCatalog";
import { color, fill, font, onFill, radius, script, space } from "../theme";
import { haptics } from "../services/haptics";

type Props = {
  navigation: { goBack: () => void; navigate: (r: string, p?: object) => void };
  route?: { params?: { matchId?: string; code?: string } };
};

export default function RoomLobbyScreen({ navigation, route }: Props) {
  const [mode, setMode] = useState<"pick" | "create" | "join" | "queue">("pick");
  const [gameKey, setGameKey] = useState<string>("smriti");
  const [code, setCode] = useState(route?.params?.code ?? "");
  const [answerLang, setAnswerLang] = useState<"sa" | "en">("sa");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snap, setSnap] = useState<MatchSnapshot | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [waited, setWaited] = useState(0);
  const game = useCatalogGame(gameKey);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const onEvent = useCallback((type: string, payload: Record<string, unknown>) => {
    if (type === "countdown") setCountdown(Number(payload.seconds ?? 5));
    if (type === "start") { setCountdown(0); }
    if (type === "results" || type === "settled") setCountdown(null);
  }, []);

  const { send, status: wsStatus } = usePlayMatchSocket({
    matchId: snap?.match_id ?? null,
    ticket: snap?.ticket,
    onEvent,
    onSnapshot: (s) => setSnap(s as unknown as MatchSnapshot),
  });

  // resume an active match on entry
  useEffect(() => {
    if (route?.params?.matchId) {
      setBusy(true);
      matchApi.resume().then((r) => {
        if (r.match) {
          setSnap({ ...r.match, ticket: r.match.ticket });
          setMode("pick");
        } else if (route.params?.matchId) {
          return matchApi.snapshot(route.params.matchId).then(setSnap);
        }
      }).catch(() => setError("Couldn't find that match."))
        .finally(() => setBusy(false));
    }
  }, [route?.params?.matchId]);

  // queue polling with the widen-at-15s and offer-solo-at-30s promises
  useEffect(() => {
    if (mode !== "queue") return;
    const tick = async () => {
      try {
        const st = await matchApi.queueStatus();
        setWaited(st.waited_seconds ?? 0);
        if (st.matched && st.match_id) {
          const s = await matchApi.snapshot(st.match_id);
          setSnap(s);
          setMode("pick");
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch { /* keep waiting */ }
    };
    void tick();
    pollRef.current = setInterval(tick, 1500);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [mode]);

  useEffect(() => {
    if (countdown != null && countdown > 0) {
      const t = setTimeout(() => setCountdown((c) => (c ?? 1) - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [countdown]);

  const create = async () => {
    setBusy(true); setError(null);
    try {
      const s = await matchApi.createRoom({ game: gameKey, answer_lang: answerLang });
      const t = await matchApi.ticket(s.match_id);
      setSnap({ ...s, ticket: t.ticket });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't create the room.");
    } finally { setBusy(false); }
  };

  const join = async () => {
    setBusy(true); setError(null);
    try {
      const s = await matchApi.joinRoom(code.trim().toUpperCase());
      const t = await matchApi.ticket(s.match_id);
      setSnap({ ...s, ticket: t.ticket });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Room not found.");
    } finally { setBusy(false); }
  };

  const enqueue = async () => {
    setBusy(true); setError(null);
    try {
      await matchApi.enqueue({ game: gameKey, answer_lang: answerLang });
      setMode("queue");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't join the queue.");
    } finally { setBusy(false); }
  };

  const leave = () => {
    Alert.alert("Leave this match?", snap?.status === "lobby" ? "The room stays open for others." : "Leaving mid-play counts as a forfeit.", [
      { text: "Stay", style: "cancel" },
      {
        text: "Leave", style: "destructive", onPress: () => {
          if (snap) void matchApi.leave(snap.match_id);
          setSnap(null); setMode("pick"); navigation.goBack();
        },
      },
    ]);
  };

  // ── In a match ────────────────────────────────────────────────────────────
  if (snap) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <GameTopBar title={snap.kind === "quick" ? "Quick match" : "Room"} sa={snap.code ? `Code ${snap.code}` : undefined}
          onClose={leave}
          right={<Text style={styles.wsState}>{wsStatus === "open" ? "live" : wsStatus}</Text>} />
        {countdown != null && countdown > 0 && (
          <View style={styles.countdown} accessible accessibilityLabel={`Starting in ${countdown}`}>
            <Text style={styles.countdownNum}>{countdown}</Text>
            <Text style={styles.countdownLabel}>Get ready…</Text>
          </View>
        )}
        {countdown === 0 && (
          <View style={styles.activeNote}>
            <Text style={styles.activeNoteText}>Playing {game?.title ?? snap.game} — make your moves in the game screen.</Text>
          </View>
        )}
        <ScrollView contentContainerStyle={styles.body}>
          <Text style={styles.section}>Players</Text>
          {snap.players.map((p) => (
            <View key={p.learner_id} style={styles.playerRow}>
              <Ionicons name={p.connected ? "radio" : "radio-outline"} size={16}
                color={p.connected ? color.okText : color.inkFaint} />
              <Text style={styles.playerName}>{p.alias}{p.is_host ? " · host" : ""}</Text>
              <Text style={styles.playerState}>
                {p.forfeited ? "forfeit" : snap.status === "lobby" ? (p.ready ? "ready" : "waiting") : `${p.score}`}
              </Text>
            </View>
          ))}
          {snap.status === "lobby" && (
            <>
              <Pressable onPress={() => { haptics.tap(); send({ type: "ready", ready: true }); }}
                accessibilityRole="button" accessibilityLabel="Ready" style={styles.primary}>
                <Text style={styles.primaryText}>Ready</Text>
              </Pressable>
              <Text style={styles.codeShare}>Share this code with a friend: {snap.code}</Text>
            </>
          )}
          {snap.status === "results" && snap.result && (
            <View style={styles.results}>
              <Text style={styles.section}>Results</Text>
              {snap.result.standings.map((s) => (
                <View key={s.learner_id} style={styles.playerRow}>
                  <Text style={styles.rank}>{s.rank}.</Text>
                  <Text style={styles.playerName}>{s.alias}{s.forfeited ? " (forfeit)" : ""}</Text>
                  <Text style={styles.score}>{s.score}</Text>
                </View>
              ))}
              <Text style={styles.casualNote}>{snap.result.note}</Text>
              <Pressable onPress={() => void matchApi.rematch(snap.match_id).then((r) => {
                if (r.rematch) {
                  void matchApi.ticket(r.rematch).then((t) =>
                    matchApi.snapshot(r.rematch!).then((s2) => setSnap({ ...s2, ticket: t.ticket })));
                }
              }).catch(() => {})} accessibilityRole="button" accessibilityLabel="Rematch" style={styles.primary}>
                <Text style={styles.primaryText}>Rematch</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Entry modes ───────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <GameTopBar title="Play with others" sa="सह-क्रीडा" onClose={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.section}>Choose a game</Text>
        <View style={styles.gameRow}>
          {["smriti", "rush", "varna-jaal", "word-groups", "pada-path", "number"].map((k) => (
            <Pressable key={k} onPress={() => { haptics.tap(); setGameKey(k); }}
              accessibilityRole="button" accessibilityLabel={k}
              accessibilityState={{ selected: gameKey === k }}
              style={[styles.gameChip, gameKey === k && styles.gameChipOn]}>
              <Text style={[styles.gameChipText, gameKey === k && styles.gameChipTextOn]}>{k.replace("-", " ")}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.langRow}>
          <Text style={styles.langLabel}>Answer language</Text>
          {(["sa", "en"] as const).map((l) => (
            <Pressable key={l} onPress={() => setAnswerLang(l)} accessibilityRole="button"
              accessibilityLabel={l === "sa" ? "Sanskrit" : "English"}
              accessibilityState={{ selected: answerLang === l }}
              style={[styles.langChip, answerLang === l && styles.gameChipOn]}>
              <Text style={[styles.gameChipText, answerLang === l && styles.gameChipTextOn]}>{l === "sa" ? "संस्कृतम्" : "English"}</Text>
            </Pressable>
          ))}
        </View>

        {mode === "pick" && (
          <>
            <Pressable onPress={() => { haptics.tap(); setMode("create"); }} accessibilityRole="button"
              accessibilityLabel="Create a private room" style={styles.primary}>
              <Ionicons name="add-circle-outline" size={20} color={onFill.text} />
              <Text style={styles.primaryText}>Create a room</Text>
            </Pressable>
            <Pressable onPress={() => { haptics.tap(); setMode("join"); }} accessibilityRole="button"
              accessibilityLabel="Join with a code" style={styles.secondary}>
              <Ionicons name="key-outline" size={20} color={color.ink} />
              <Text style={styles.secondaryText}>Join with a code</Text>
            </Pressable>
            <Pressable onPress={() => void enqueue()} disabled={busy} accessibilityRole="button"
              accessibilityLabel="Quick match" style={styles.secondary}>
              <Ionicons name="flash" size={20} color={color.ink} />
              <Text style={styles.secondaryText}>Quick match</Text>
            </Pressable>
            <Text style={styles.fine}>
              Private rooms host 2–8 players. Quick match groups 2–4 compatible players —
              never bots. Online matches are friendly play; ranked points come from solo ranked rounds.
            </Text>
          </>
        )}
        {mode === "create" && (
          <>
            <Text style={styles.rulesText}>{game?.rules_text}</Text>
            <Pressable onPress={() => void create()} disabled={busy} accessibilityRole="button"
              accessibilityLabel="Create room" style={styles.primary}>
              <Text style={styles.primaryText}>{busy ? "Creating…" : "Create room"}</Text>
            </Pressable>
          </>
        )}
        {mode === "join" && (
          <>
            <TextInput value={code} onChangeText={(t) => setCode(t.toUpperCase())} placeholder="ROOM CODE"
              placeholderTextColor={color.inkFaint} maxLength={6} autoCapitalize="characters"
              accessibilityLabel="Room code" style={styles.codeInput} />
            <Pressable onPress={() => void join()} disabled={busy || code.length < 4} accessibilityRole="button"
              accessibilityLabel="Join room" style={[styles.primary, code.length < 4 && styles.disabled]}>
              <Text style={styles.primaryText}>Join</Text>
            </Pressable>
          </>
        )}
        {mode === "queue" && (
          <View style={styles.queueBox}>
            <Ionicons name="hourglass" size={22} color={color.saffronText} />
            <Text style={styles.queueText}>
              {waited < 15 ? "Looking for players with your game and language…" :
                waited < 30 ? "Widening the search…" : "Still searching — you can keep waiting, invite a friend, or play solo."}
            </Text>
            <Text style={styles.queueWait}>{waited}s</Text>
            <Pressable onPress={() => { void matchApi.cancelQueue(); setMode("pick"); }}
              accessibilityRole="button" accessibilityLabel="Cancel" style={styles.secondary}>
              <Text style={styles.secondaryText}>Cancel</Text>
            </Pressable>
          </View>
        )}
        {!!error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg },
  body: { padding: space.lg, gap: space.md },
  section: { fontWeight: "800", fontSize: 18, color: color.ink },
  gameRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  gameChip: { borderWidth: 1.5, borderColor: color.border, borderRadius: radius.pill, paddingHorizontal: space.md, minHeight: 40, justifyContent: "center", backgroundColor: color.surface },
  gameChipOn: { backgroundColor: fill.ink, borderColor: fill.ink },
  gameChipText: { color: color.ink, fontWeight: "700", fontSize: font.sizes.sm },
  gameChipTextOn: { color: onFill.text },
  langRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  langLabel: { fontWeight: "700", color: color.inkSoft, marginRight: 4, fontSize: font.sizes.sm },
  langChip: { borderWidth: 1.5, borderColor: color.border, borderRadius: radius.pill, paddingHorizontal: space.md, minHeight: 40, justifyContent: "center" },
  rulesText: { color: color.inkSoft, lineHeight: 22 },
  primary: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: color.saffronBtn, borderRadius: radius.md, minHeight: 52, paddingHorizontal: space.lg },
  primaryText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  secondary: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1.5, borderColor: color.ink, borderRadius: radius.md, minHeight: 52, paddingHorizontal: space.lg },
  secondaryText: { color: color.ink, fontWeight: "700", fontSize: 16 },
  fine: { color: color.inkSoft, fontSize: font.sizes.sm, lineHeight: 21 },
  codeInput: { borderWidth: 2, borderColor: color.border, borderRadius: radius.md, minHeight: 56, textAlign: "center", fontSize: 24, fontWeight: "800", letterSpacing: 6, color: color.ink },
  disabled: { opacity: 0.5 },
  error: { color: color.badText, fontSize: font.sizes.sm, textAlign: "center" },
  queueBox: { alignItems: "center", gap: space.md, padding: space.lg },
  queueText: { color: color.inkSoft, textAlign: "center", lineHeight: 22 },
  queueWait: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 30, color: color.ink, fontVariant: ["tabular-nums"] },
  countdown: { alignItems: "center", paddingVertical: space.xl },
  countdownNum: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 72, color: color.saffronText },
  countdownLabel: { color: color.inkSoft, fontWeight: "700" },
  activeNote: { backgroundColor: color.saffronLight, borderRadius: radius.md, padding: space.md, marginHorizontal: space.lg },
  activeNoteText: { color: color.ink, fontWeight: "700" },
  playerRow: { flexDirection: "row", alignItems: "center", gap: space.sm, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: color.border },
  playerName: { flex: 1, fontWeight: "700", color: color.ink },
  playerState: { color: color.inkSoft, fontVariant: ["tabular-nums"] },
  rank: { fontWeight: "800", color: color.inkSoft, width: 24 },
  score: { fontWeight: "800", color: color.ink, fontVariant: ["tabular-nums"] },
  codeShare: { textAlign: "center", color: color.inkSoft, fontSize: font.sizes.sm },
  results: { gap: 6 },
  casualNote: { color: color.inkSoft, fontSize: font.sizes.xs, lineHeight: 18 },
  wsState: { fontSize: font.sizes.xs, color: color.inkFaint, marginRight: space.sm },
});
