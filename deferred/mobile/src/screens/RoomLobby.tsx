// RoomLobby: private rooms (create/join by code), quick-match queue with the
// 15s band-widening and 30s "play solo instead" offer, ready states, shared
// countdown, and the live game surface that renders over the WebSocket.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { usePreventRemove, type NavigationAction } from "@react-navigation/native";

import { matchApi, type MatchSnapshot } from "../games/v2/client";
import { GameTopBar } from "../games/v2/parts";
import { usePlayMatchSocket } from "../games/v2/useMatchSocket";
import { useCatalogGame } from "../games/v2/useCatalog";
import { color, fill, font, onFill, radius, space } from "../theme";
import { haptics } from "../services/haptics";
import { useAuth } from "../store/auth";
import LiveMatchGame from "../games/v2/LiveMatchGame";

type Props = {
  navigation: {
    goBack: () => void;
    navigate: (r: string, p?: object) => void;
    setOptions: (o: { headerShown?: boolean }) => void;
    dispatch: (action: NavigationAction) => void;
  };
  route?: { params?: { matchId?: string; code?: string; mode?: "friends" | "quick" } };
};

const SOLO_ROUTES: Record<string, string> = {
  smriti: "Smriti", rush: "ShabdaRush", "varna-jaal": "VarnaJaal",
  "word-groups": "WordGroups", "pada-path": "PadaPath", number: "NumberBuilder",
};

export default function RoomLobbyScreen({ navigation, route }: Props) {
  const { learner } = useAuth();
  const [mode, setMode] = useState<"pick" | "create" | "join" | "queue" | "quick">(
    route?.params?.code ? "join" : route?.params?.mode === "quick" ? "quick" : "pick");
  const [gameKey, setGameKey] = useState<string>("smriti");
  const [code, setCode] = useState(route?.params?.code ?? "");
  const [answerLang, setAnswerLang] = useState<"sa" | "en">("sa");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snap, setSnap] = useState<MatchSnapshot | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [waited, setWaited] = useState(0);
  const [revision, setRevision] = useState(0);
  const game = useCatalogGame(snap?.game ?? gameKey);
  const leaving = useRef(false);
  const changed = useCallback(() => setRevision((r) => r + 1), []);
  const acceptSnapshot = useCallback((s: MatchSnapshot) => {
    setSnap((current) => current?.match_id === s.match_id && current.seq > s.seq ? current : s);
  }, []);

  const onEvent = useCallback((type: string, payload: Record<string, unknown>) => {
    if (type === "error") {
      setError(String(payload.detail ?? "Couldn't update the match."));
      return;
    }
    // Events carry changes, not a full snapshot. Refresh readiness, host and
    // match status so both devices show the same controls.
    if (type !== "ack" && type !== "pong") setRevision((r) => r + 1);
  }, []);

  const { send, status: wsStatus } = usePlayMatchSocket({
    matchId: snap?.match_id ?? null,
    ticket: snap?.ticket,
    onEvent,
    onSnapshot: (s) => acceptSnapshot(s as unknown as MatchSnapshot),
  });

  const matchId = snap?.match_id;
  useEffect(() => {
    if (!matchId) return;
    let cancelled = false;
    let fetching = false;
    const refresh = async () => {
      if (fetching) return;
      fetching = true;
      try {
        let s = await matchApi.snapshot(matchId);
        if (s.rematch_id) s = await matchApi.snapshot(s.rematch_id);
        if (!cancelled) acceptSnapshot(s);
      } catch { /* the socket reconnect and the next poll can recover */ }
      finally { fetching = false; }
    };
    void refresh();
    const timer = setInterval(() => void refresh(), 1500);
    return () => { cancelled = true; clearInterval(timer); };
  }, [matchId, revision, acceptSnapshot]);

  // In a match the screen's own bar (code, live state, a Leave that asks
  // first) replaces the stack header; outside one, the stack header alone.
  const inMatch = snap !== null;
  useEffect(() => {
    navigation.setOptions({ headerShown: !inMatch });
  }, [navigation, inMatch]);

  // resume an active match on entry
  useEffect(() => {
    if (route?.params?.code) return;
    let cancelled = false;
    setBusy(true);
    const load = route?.params?.matchId
      ? matchApi.snapshot(route.params.matchId)
      : matchApi.resume().then((r) => r.match);
    void load.then((s) => {
      if (!cancelled && s) { acceptSnapshot(s); setMode("pick"); }
    }).catch(() => { if (!cancelled) setError("Couldn't check for an existing match. Try again."); })
      .finally(() => { if (!cancelled) setBusy(false); });
    return () => { cancelled = true; };
  }, [route?.params?.matchId, route?.params?.code, acceptSnapshot]);

  // queue polling with the widen-at-15s and offer-solo-at-30s promises
  useEffect(() => {
    if (mode !== "queue") return;
    let cancelled = false;
    let fetching = false;
    const tick = async () => {
      if (fetching) return;
      fetching = true;
      try {
        const st = await matchApi.queueStatus();
        if (cancelled) return;
        setWaited(st.waited_seconds ?? 0);
        if (st.matched && st.match_id) {
          const s = await matchApi.snapshot(st.match_id);
          if (cancelled) return;
          acceptSnapshot(s);
          setMode("pick");
        } else if (!st.waiting) {
          setMode("quick");
          setError("The search ended. Tap Find match to try again.");
        }
      } catch { /* keep waiting */ }
      finally { fetching = false; }
    };
    void tick();
    const timer = setInterval(tick, 1500);
    return () => { cancelled = true; clearInterval(timer); };
  }, [mode, acceptSnapshot]);

  useEffect(() => {
    if ((snap?.status !== "countdown" && snap?.status !== "active") || !snap.deadline) {
      setCountdown(null);
      return;
    }
    const deadline = Date.parse(snap.deadline);
    const tick = () => setCountdown(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    tick();
    const timer = setInterval(tick, 250);
    return () => clearInterval(timer);
  }, [snap?.status, snap?.deadline]);

  const startMatch = async () => {
    if (!snap || busy) return;
    haptics.tap();
    setBusy(true); setError(null);
    try {
      await matchApi.start(snap.match_id);
      setSnap((current) => current?.match_id === snap.match_id
        ? { ...current, status: "countdown" } : current);
      setRevision((r) => r + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't start the match.");
    } finally { setBusy(false); }
  };

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
      const r = await matchApi.enqueue({ game: gameKey, answer_lang: answerLang });
      if (r.matched && r.match_id) acceptSnapshot(await matchApi.snapshot(r.match_id));
      else { setWaited(0); setMode("queue"); }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't join the queue.");
    } finally { setBusy(false); }
  };

  const exitMatch = async () => {
    if (!snap) return;
    setBusy(true); setError(null);
    try {
      await matchApi.leave(snap.match_id);
      leaving.current = true;
      setSnap(null); setMode("pick"); navigation.goBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't leave. Please try again.");
    } finally { setBusy(false); }
  };

  const leave = () => {
    if (snap?.status === "results" || snap?.status === "closed") { void exitMatch(); return; }
    Alert.alert("Leave this match?", snap?.status === "lobby" ? "The room stays open for others." : "Leaving mid-play counts as a forfeit.", [
      { text: "Stay", style: "cancel" },
      {
        text: "Leave", style: "destructive", onPress: () => void exitMatch(),
      },
    ]);
  };

  const rematch = async () => {
    if (!snap || busy) return;
    setBusy(true); setError(null);
    try {
      const r = await matchApi.rematch(snap.match_id);
      if (r.rematch) acceptSnapshot(await matchApi.snapshot(r.rematch));
      else { acceptSnapshot(await matchApi.snapshot(snap.match_id)); }
    } catch (e) { setError(e instanceof Error ? e.message : "Couldn't request a rematch."); }
    finally { setBusy(false); }
  };

  usePreventRemove(!!snap || mode === "queue", ({ data }) => {
    if (leaving.current) { navigation.dispatch(data.action); return; }
    if (snap) { leave(); }
    else if (mode === "queue") {
      void matchApi.cancelQueue().then(() => {
        leaving.current = true; navigation.dispatch(data.action);
      }).catch(() => setError("Couldn't cancel the search. Try again."));
    }
  });

  // ── In a match ────────────────────────────────────────────────────────────
  if (snap) {
    const isHost = snap.host === learner?.id;
    const everyoneReady = snap.players.length >= 2 && snap.players.every((p) => p.ready);
    const canStart = everyoneReady && !busy && wsStatus === "open";
    const me = snap.players.find((p) => p.learner_id === learner?.id);
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <GameTopBar title={snap.kind === "quick" ? "Quick match" : "Room"} sa={snap.code ? `Code ${snap.code}` : undefined}
          onClose={leave}
          right={<Text style={styles.wsState}>{wsStatus === "open" ? "live" : wsStatus}</Text>} />
        {snap.status === "countdown" && countdown != null && countdown > 0 && (
          <View style={styles.countdown} accessible accessibilityLabel={`Starting in ${countdown}`}>
            <Text style={styles.countdownNum}>{countdown}</Text>
            <Text style={styles.countdownLabel}>Get ready…</Text>
          </View>
        )}
        {snap.status === "active" && !snap.own_done && snap.pack ? (
          <>
            <View style={styles.livePlayers}>
              <Text style={styles.playerState}>Time left: {Math.floor((countdown ?? 0) / 60)}:{String((countdown ?? 0) % 60).padStart(2, "0")}</Text>
              {snap.players.map((p) => <Text key={p.learner_id} style={styles.playerState}>
                {p.alias}: {p.score}{p.forfeited ? " · left" : !p.connected ? " · reconnecting" : ""}
              </Text>)}
            </View>
            <LiveMatchGame key={snap.match_id} snapshot={snap} onLeave={leave}
              onChanged={changed} connected={wsStatus === "open"} />
            {!!error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}
          </>
        ) : <ScrollView contentContainerStyle={styles.body}>
          {snap.status === "active" && snap.own_done && <Text style={styles.fine}>
            Your round is complete. Waiting for the other players…
          </Text>}
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
                disabled={!!me?.ready || wsStatus !== "open"}
                accessibilityRole="button" accessibilityLabel="Ready"
                accessibilityState={{ disabled: !!me?.ready || wsStatus !== "open" }}
                style={[styles.primary, (me?.ready || wsStatus !== "open") && styles.disabled]}>
                <Text style={styles.primaryText}>{me?.ready ? "You're ready" : "Ready"}</Text>
              </Pressable>
              {isHost ? (
                <>
                  <Pressable onPress={() => void startMatch()} disabled={!canStart}
                    accessibilityRole="button" accessibilityLabel="Start match"
                    accessibilityState={{ disabled: !canStart, busy }}
                    style={[styles.primary, !canStart && styles.disabled]}>
                    <Text style={styles.primaryText}>{busy ? "Starting…" : "Start match"}</Text>
                  </Pressable>
                  <Text style={styles.codeShare}>
                    {snap.players.length < 2 ? "Waiting for another player to join." :
                      !everyoneReady ? "Everyone needs to tap Ready before you can start." :
                        "Everyone is ready. Start the match when you're ready."}
                  </Text>
                </>
              ) : (
                <Text style={styles.codeShare}>The host will start once everyone is ready.</Text>
              )}
              <Text style={styles.codeShare}>Share this code with a friend: {snap.code}</Text>
            </>
          )}
          {!!error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}
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
              <Pressable onPress={() => void rematch()} disabled={busy || !!snap.rematch_voted}
                accessibilityRole="button" accessibilityLabel="Rematch"
                style={[styles.primary, (busy || snap.rematch_voted) && styles.disabled]}>
                <Text style={styles.primaryText}>{snap.rematch_voted ? "Waiting for rematch votes…" : "Rematch"}</Text>
              </Pressable>
              <Pressable onPress={() => void exitMatch()} disabled={busy} accessibilityRole="button"
                accessibilityLabel="Done" style={styles.secondary}><Text style={styles.secondaryText}>Done</Text></Pressable>
            </View>
          )}
        </ScrollView>}
      </SafeAreaView>
    );
  }

  // ── Entry modes ───────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* The stack header already says "Play with others" with a back arrow. */}
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

        {mode === "quick" && (
          <Pressable onPress={() => void enqueue()} disabled={busy} accessibilityRole="button"
            accessibilityLabel="Find match" style={styles.primary}>
            <Text style={styles.primaryText}>{busy ? "Connecting…" : "Find match"}</Text>
          </Pressable>
        )}
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
              Private rooms host 2–8 players. Quick match pairs you with another compatible player.
              Online matches are friendly play; ranked points come from solo ranked rounds.
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
            {waited >= 30 && <Pressable disabled={busy} accessibilityRole="button"
              accessibilityLabel="Play solo instead" style={styles.primary}
              onPress={() => {
                setBusy(true);
                void matchApi.cancelQueue().then(() => {
                  setMode("quick");
                  const route = SOLO_ROUTES[gameKey];
                  if (route) navigation.navigate(route);
                }).catch(() => setError("Couldn't end the search. Try again.")).finally(() => setBusy(false));
              }}><Text style={styles.primaryText}>Play solo instead</Text></Pressable>}
            <Pressable onPress={() => { setBusy(true); void matchApi.cancelQueue().then(() => {
              setMode("quick");
            }).catch(() => setError("Couldn't cancel the search. Try again.")).finally(() => setBusy(false)); }}
              disabled={busy}
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
  livePlayers: { flexDirection: "row", flexWrap: "wrap", gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.sm },
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
