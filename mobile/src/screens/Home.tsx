// Home — the daily hub (U8-2). The day streak, the greeting with today's XP
// goal beside it, the daily cards (today's tithi, the word's journey, the
// śloka and the word) and the explore tiles. Lessons start from the Path tab;
// the week's history is on Progress. Śloka and Varṇamālā are stack screens
// reached from here, not tabs (U8-1).
//
// Every number here comes from the server and says what it is, except the
// tithi card, which the phone works out itself (src/kala). While it loads
// a skeleton holds its place, never a fake 0 (U9-4). A failed card offers
// retry in place (U10-3). The streak is DAYS, computed from the activity
// history: learner.streak from /me is a run of correct answers, not days.

import { DrawerActions, useFocusEffect, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import type { IoniconsIconName } from "@react-native-vector-icons/ionicons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from "react-native-reanimated";

import { api, type DailyWordPuzzle, type ProgressDaily, type ProgressDay, type Shloka } from "../api/client";
import ProgressRing from "../components/ProgressRing";
import { Skeleton } from "../components/Skeleton";
import { Gesture, GuruNative } from "../components/guru";
import { cachedGet } from "../services/apiCache";
import { useAskContext } from "../ask/AskProvider";
import TithiCard from "../kala/TithiCard";
import WordCard from "../words/WordCard";
import FactCard from "../facts/FactCard";
import { haptics } from "../services/haptics";
import { getStoryIndex } from "../services/storyProgress";
import { useAuth } from "../store/auth";
import { DrawerToggle } from "../navigation/DrawerToggle";
import { duration, stagger } from "../motion";
import type { TabScreenProps } from "../navigation/types";
import { accent, color, font, gradientOf, radius, script, shadow, space, type AccentName } from "../theme";
import { firstName } from "../utils/name";
import { dayStreak, localToday } from "../utils/streak";
import { plain } from "../utils/text";

type Props = TabScreenProps<"Home">;
type LoadState = "loading" | "ok" | "error";

export default function HomeScreen({ navigation }: Props) {
  const { learner, refresh } = useAuth();
  const rootNav = useNavigation();
  const [shloka, setShloka] = useState<Shloka | null>(null);
  // "This screen" in Ask reads what is registered here plus on-device OCR.
  useAskContext("home", shloka?.devanagari ?? "");
  const [shlokaState, setShlokaState] = useState<LoadState>("loading");
  const [dailyWord, setDailyWord] = useState<DailyWordPuzzle | null>(null);
  const [wordState, setWordState] = useState<LoadState>("loading");
  const [storyTotal, setStoryTotal] = useState<number | null>(null);
  const [storyAt, setStoryAt] = useState(0);
  // Today's XP and the day history the streak is computed from.
  const [today, setToday] = useState<{ daily: ProgressDaily; history: ProgressDay[] } | null>(null);
  const [todayFailed, setTodayFailed] = useState(false);
  const [compLast, setCompLast] = useState<{ my_rank: number | null; competition: { id: string } } | null>(null);

  // The profile normally arrives with the session; fetch it only if missing.
  useEffect(() => {
    if (!learner) refresh().catch(() => null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadShloka = useCallback(() => {
    setShlokaState("loading");
    // Same key as the Shloka screen, so opening the card renders from memory.
    cachedGet("shloka-today", api.todayShloka)
      .then((s) => {
        setShloka(s);
        setShlokaState("ok");
      })
      .catch(() => setShlokaState("error"));
  }, []);

  const loadWord = useCallback(() => {
    setWordState("loading");
    cachedGet("daily-word", api.dailyWord)
      .then((w) => {
        setDailyWord(w);
        setWordState("ok");
      })
      .catch(() => setWordState("error"));
  }, []);

  const loadToday = useCallback(() => {
    setTodayFailed(false);
    Promise.all([api.progressDaily(), api.progressHistory(90)])
      .then(([daily, history]) => setToday({ daily, history }))
      .catch(() => setTodayFailed(true));
  }, []);

  useEffect(() => {
    loadShloka();
    // Cached under the key the story deck reads.
    cachedGet("story-chapters", api.storyChapters)
      .then((chs) => setStoryTotal(chs.reduce((n, c) => n + c.cards.length, 0)))
      .catch(() => setStoryTotal(null));
  }, [loadShloka]);

  // XP, the daily word and the story bookmark all move while Home sits
  // behind other screens, so they refresh every time Home regains focus.
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      loadToday();
      loadWord();
      getStoryIndex().then((i) => alive && setStoryAt(i));
      api.competitionCurrent().then((c) => {
        if (alive && c.last) setCompLast(c.last as never);
        else if (alive) setCompLast(null);
      }).catch(() => {});
      return () => {
        alive = false;
      };
    }, [loadToday, loadWord]),
  );

  const openDrawer = useCallback(() => {
    haptics.tap();
    // The drawer wraps the tab navigator, so its parent is the drawer.
    rootNav.dispatch(DrawerActions.openDrawer());
  }, [rootNav]);

  const todayKey = today?.daily.date ?? localToday();
  const streak = today ? dayStreak(today.history, todayKey) : null;

  const name = firstName(learner?.display_name);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.topbar}>
          <DrawerToggle onPress={openDrawer} />
          {streak != null && <StreakChip days={streak} />}
        </View>

        <View style={styles.greetRow}>
          <GuruNative state="idle" size={72} gesture={Gesture.Anjali} />
          <View style={styles.greetText}>
            <Text style={[styles.hello, script("semibold")]}>नमस्ते</Text>
            {learner ? (
              <Text style={styles.name} numberOfLines={1}>
                {name || "friend"}
              </Text>
            ) : (
              <Skeleton height={26} width={120} style={{ marginTop: 4 }} />
            )}
          </View>
          <TodayGoal today={today} failed={todayFailed} onRetry={loadToday} />
        </View>

        {!!compLast && (
          <Pressable
            onPress={() => (navigation as never as { navigate: (r: string, p?: object) => void }).navigate("ContestResults", { id: compLast.competition.id })}
            accessibilityRole="button"
            accessibilityLabel={`Results are out, you came ${compLast.my_rank ?? ""}`}
            style={styles.compCard}
          >
            <Text style={styles.compText}>Results are out: you came {compLast.my_rank ?? "-"}</Text>
          </Pressable>
        )}

        <Entrance index={0}>
          <Text style={styles.section}>Daily</Text>
          {/* Today's date in the learner's calendar, worked out on the phone. */}
          <TithiCard />
          {/* Today's word journey. Hides itself when there is nothing today. */}
          <WordCard />
          {/* Today's "Do you know". Hides itself when there is no fact yet. */}
          <FactCard />
          <View style={styles.pair}>
            <ShlokaTile
              shloka={shloka}
              state={shlokaState}
              onPress={() => (shlokaState === "error" ? loadShloka() : navigation.navigate("Shloka"))}
            />
            <WordTile
              word={dailyWord}
              state={wordState}
              onPress={() => (wordState === "error" ? loadWord() : navigation.navigate("DailyWord"))}
            />
          </View>
        </Entrance>

        <Entrance index={1}>
          <Text style={styles.section}>Explore</Text>
          <View style={styles.grid}>
            <ExploreTile
              tone="gold"
              icon="grid"
              title="Alphabet"
              sa="वर्णमाला"
              onPress={() => navigation.navigate("Varnamala")}
            />
            <ExploreTile
              tone="slate"
              icon="create"
              title="Write"
              sa="लेखनम्"
              onPress={() => navigation.navigate("Writing")}
            />
            <ExploreTile
              tone="saffron"
              icon="compass"
              title="Discover"
              sa="परिचयः"
              meta={storyTotal && storyAt > 0 ? `${Math.min(storyAt + 1, storyTotal)}/${storyTotal}` : undefined}
              onPress={() => navigation.navigate("Story")}
            />
            <ExploreTile
              tone="sage"
              icon="book"
              title="Words"
              sa="शब्दाः"
              onPress={() => navigation.navigate("Vocab", {})}
            />
          </View>
        </Entrance>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Entrance stagger ─────────────────────────────────────────────────

function Entrance({ index, children }: { index: number; children: React.ReactNode }) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(12);
  useEffect(() => {
    const delay = stagger(index, 45, 6);
    opacity.value = withDelay(delay, withTiming(1, { duration: duration.base }));
    translateY.value = withDelay(delay, withTiming(0, { duration: duration.base }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

// ─── Streak chip ──────────────────────────────────────────────────────

function StreakChip({ days }: { days: number }) {
  const label = `${days} ${days === 1 ? "day" : "days"}`;
  return (
    <View style={styles.streak} accessible accessibilityLabel={`${label} streak`}>
      <Ionicons name="flame" size={16} color={days > 0 ? color.saffron : color.inkFaint} />
      <Text style={styles.streakText}>{label}</Text>
    </View>
  );
}

// ─── Today's goal ─────────────────────────────────────────────────────
// Sits at the right of the greeting: today's XP against the daily goal.

function TodayGoal({
  today,
  failed,
  onRetry,
}: {
  today: { daily: ProgressDaily } | null;
  failed: boolean;
  onRetry: () => void;
}) {
  if (!today) {
    return failed ? (
      <Pressable onPress={onRetry} style={styles.goal} accessibilityRole="button" accessibilityLabel="Couldn't load today's goal. Retry">
        <View style={styles.goalRetry}>
          <Ionicons name="refresh" size={22} color={color.saffronText} />
        </View>
        <Text style={[styles.goalLabel, { color: color.saffronText }]}>Retry</Text>
      </Pressable>
    ) : (
      <View style={styles.goal}>
        <Skeleton width={GOAL_RING} height={GOAL_RING} radius={GOAL_RING / 2} />
        <Skeleton height={12} width={56} />
      </View>
    );
  }
  const { xp, goal_xp: goal, goal_met: met } = today.daily;
  const target = goal || 50;
  return (
    <View style={styles.goal} accessible accessibilityLabel={`Today: ${xp} of ${target} XP${met ? ", goal met" : ""}`}>
      <ProgressRing progress={xp / target} size={GOAL_RING} stroke={7} tint={met ? color.okText : color.saffron}>
        <Text style={styles.ringNum}>{xp}</Text>
        <Text style={styles.ringUnit}>/ {target} XP</Text>
      </ProgressRing>
      <Text style={[styles.goalLabel, met && { color: color.okText }]}>{met ? "Goal met" : "Today's goal"}</Text>
    </View>
  );
}


// ─── Daily tiles ──────────────────────────────────────────────────────

function ShlokaTile({ shloka, state, onPress }: { shloka: Shloka | null; state: LoadState; onPress: () => void }) {
  const first = shloka?.devanagari?.split(/[।\n]/)[0]?.trim() ?? "";
  return (
    <DailyTile tone="rose" icon="musical-notes" label="Śloka" onPress={onPress}>
      {state === "loading" ? (
        <Skeleton height={40} />
      ) : state === "error" ? (
        <Text style={styles.tileMuted}>Couldn't load. Tap to retry.</Text>
      ) : first ? (
        <Text style={[styles.verse, script("semibold")]} numberOfLines={2}>
          {first}
        </Text>
      ) : (
        <Text style={styles.tileMuted}>No verse today.</Text>
      )}
    </DailyTile>
  );
}

function WordTile({ word, state, onPress }: { word: DailyWordPuzzle | null; state: LoadState; onPress: () => void }) {
  let body: React.ReactNode;
  if (state === "loading") body = <Skeleton height={40} />;
  else if (state === "error") body = <Text style={styles.tileMuted}>Couldn't load. Tap to retry.</Text>;
  else if (!word || !word.available) body = <Text style={styles.tileMuted}>No word today.</Text>;
  else if (word.solved)
    body = (
      <>
        <Text style={[styles.verse, script("bold")]}>{word.revealed?.answer ?? "Solved"}</Text>
        <Text style={[styles.tileMeta, { color: accent.teal.fg }]}>Solved</Text>
      </>
    );
  else if (word.finished) body = <Text style={styles.tileMuted}>Played. New word tomorrow.</Text>;
  else
    body = (
      <>
        {!!word.clue && (
          <Text style={styles.clue} numberOfLines={1}>
            “{plain(word.clue)}”
          </Text>
        )}
        <Text style={[styles.tileMeta, { color: accent.teal.fg }]}>
          {word.guesses_used > 0 ? `${word.guesses_used}/${word.max_guesses} tries` : "Find the word"}
        </Text>
      </>
    );
  return (
    <DailyTile tone="teal" icon="extension-puzzle" label="Daily word" onPress={onPress}>
      {body}
    </DailyTile>
  );
}

function DailyTile({
  tone,
  icon,
  label,
  onPress,
  children,
}: {
  tone: AccentName;
  icon: IoniconsIconName;
  label: string;
  onPress: () => void;
  children: React.ReactNode;
}) {
  const t = accent[tone];
  return (
    <Pressable
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.dailyTile, { backgroundColor: t.bg }, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={styles.dailyHead}>
        <View style={[styles.dailyIcon, { backgroundColor: t.fg }]}>
          <Ionicons name={icon} size={14} color={color.white} />
        </View>
        <Text style={[styles.dailyLabel, { color: t.fg }]}>{label}</Text>
      </View>
      <View style={styles.dailyBody}>{children}</View>
    </Pressable>
  );
}

// ─── Explore tiles ────────────────────────────────────────────────────

function ExploreTile({
  tone,
  icon,
  title,
  sa,
  meta,
  onPress,
}: {
  tone: AccentName;
  icon: IoniconsIconName;
  title: string;
  sa: string;
  meta?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.explore, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={meta ? `${title}, ${meta}` : title}
    >
      <View style={styles.exploreTop}>
        <LinearGradient colors={gradientOf(tone)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.exploreIcon}>
          <Ionicons name={icon} size={22} color={color.white} />
        </LinearGradient>
        {meta && <Text style={styles.exploreMeta}>{meta}</Text>}
      </View>
      <Text style={styles.exploreTitle}>{title}</Text>
      <Text style={[styles.exploreSa, script("semibold"), { color: accent[tone].fg }]}>{sa}</Text>
    </Pressable>
  );
}

// The goal ring at the right of the greeting, a little smaller than the guru.
const GOAL_RING = 68;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg },
  // 120 at the bottom: the Ask bubble floats over the last row.
  body: { paddingHorizontal: space.lg, paddingTop: space.xs, paddingBottom: 120 },
  topbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 44 },
  streak: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: color.surface,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: 7,
    ...shadow.card,
  },
  streakText: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.sm, color: color.ink },
  greetRow: { flexDirection: "row", alignItems: "center", gap: space.md, marginTop: space.sm, marginBottom: space.lg },
  compCard: { minHeight: 56, justifyContent: "center", paddingHorizontal: space.md, borderRadius: radius.lg, backgroundColor: "#17535C", marginBottom: space.sm },
  compText: { color: "#FFF8EE", fontWeight: "800" },
  greetText: { flex: 1 },
  hello: { fontSize: font.sizes.md, lineHeight: 26, color: color.inkSoft },
  name: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 28, color: color.ink, marginTop: -2 },
  goal: { alignItems: "center", gap: 4 },
  goalRetry: {
    width: GOAL_RING,
    height: GOAL_RING,
    borderRadius: GOAL_RING / 2,
    backgroundColor: color.surface,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.card,
  },
  goalLabel: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.xs, color: color.inkSoft },
  ringNum: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.md, color: color.ink, lineHeight: 20 },
  ringUnit: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: 10, color: color.inkSoft, lineHeight: 12 },
  section: {
    fontFamily: "Nunito_800ExtraBold",
    fontWeight: "800",
    fontSize: font.sizes.md,
    color: color.ink,
    marginBottom: space.sm,
  },
  pair: { flexDirection: "row", gap: space.sm, marginBottom: space.lg },
  dailyTile: { flex: 1, borderRadius: radius.lg, padding: space.md, minHeight: 128 },
  dailyHead: { flexDirection: "row", alignItems: "center", gap: 6 },
  dailyIcon: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  dailyLabel: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.sm },
  dailyBody: { flex: 1, justifyContent: "flex-end", marginTop: space.sm },
  verse: { fontSize: font.sizes.md, lineHeight: 28, color: color.ink },
  clue: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.md, color: color.ink },
  tileMeta: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.xs, marginTop: 2 },
  tileMuted: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: font.sizes.sm, color: color.inkSoft },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: space.sm },
  explore: {
    width: "48.5%",
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    padding: space.md,
    ...shadow.card,
  },
  exploreTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: space.sm },
  exploreIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  exploreTitle: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.base, color: color.ink },
  exploreSa: { fontSize: font.sizes.sm, lineHeight: 20 },
  exploreMeta: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.xs, color: color.inkSoft },
  pressed: { opacity: 0.9, transform: [{ scale: 0.985 }] },
});
