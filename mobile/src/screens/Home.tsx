// Home — the daily hub (U8-2). Greeting, today's progress (XP ring, day
// streak, the week), the lesson to continue, the two daily cards (śloka and
// word) and the explore tiles. Śloka and Varṇamālā are stack screens reached
// from here, not tabs (U8-1).
//
// Every number here comes from the server and says what it is. While it loads
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

import {
  api,
  type DailyWordPuzzle,
  type LessonSummary,
  type ProgressDaily,
  type ProgressDay,
  type Shloka,
  type Unit,
} from "../api/client";
import ProgressRing from "../components/ProgressRing";
import { Skeleton } from "../components/Skeleton";
import { Gesture, GuruNative } from "../components/guru";
import { cachedGet } from "../services/apiCache";
import { haptics } from "../services/haptics";
import { getStoryIndex } from "../services/storyProgress";
import { useAuth } from "../store/auth";
import { DrawerToggle } from "../navigation/DrawerToggle";
import { duration, stagger } from "../motion";
import type { TabScreenProps } from "../navigation/types";
import {
  accent,
  accentAt,
  color,
  font,
  gradientOf,
  radius,
  script,
  shadow,
  space,
  type AccentName,
} from "../theme";
import { firstName } from "../utils/name";
import { dayStreak, lastSevenDays, localToday } from "../utils/streak";
import { plain } from "../utils/text";

type Props = TabScreenProps<"Home">;
type LoadState = "loading" | "ok" | "error";

export default function HomeScreen({ navigation }: Props) {
  const { learner, refresh } = useAuth();
  const rootNav = useNavigation();
  const [shloka, setShloka] = useState<Shloka | null>(null);
  const [shlokaState, setShlokaState] = useState<LoadState>("loading");
  const [dailyWord, setDailyWord] = useState<DailyWordPuzzle | null>(null);
  const [wordState, setWordState] = useState<LoadState>("loading");
  // U15-5: Home routes into the lesson (first unfinished unit), plus the
  // review count. A failed fetch leaves these null and the card hides.
  const [units, setUnits] = useState<Unit[] | null>(null);
  const [dueCount, setDueCount] = useState<number | null>(null);
  const [storyTotal, setStoryTotal] = useState<number | null>(null);
  const [storyAt, setStoryAt] = useState(0);
  // Today's XP and the day history the streak is computed from.
  const [today, setToday] = useState<{ daily: ProgressDaily; history: ProgressDay[] } | null>(null);
  const [todayFailed, setTodayFailed] = useState(false);

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
    // Cached under the keys Path ("units") and the story deck read.
    cachedGet("units", api.units)
      .then(setUnits)
      .catch(() => setUnits(null));
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
      api
        .reviewDue(1)
        .then((d) => alive && setDueCount(d.due_count ?? null))
        .catch(() => {});
      getStoryIndex().then((i) => alive && setStoryAt(i));
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
  const week = today ? lastSevenDays(today.history, todayKey) : null;

  // Continue where the learner is: the first unit not yet complete.
  const continueTarget: { unit: Unit; lesson: LessonSummary; index: number } | null = (() => {
    if (!units || units.length === 0) return null;
    let index = units.findIndex((u) => (u.progress ?? 0) < 1 && u.lessons.length > 0);
    if (index < 0) index = units.length - 1;
    const unit = units[index];
    return unit.lessons.length > 0 ? { unit, lesson: unit.lessons[0], index } : null;
  })();

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
        </View>

        <Entrance index={0}>
          <TodayCard today={today} failed={todayFailed} week={week} onRetry={loadToday} />
        </Entrance>

        {continueTarget && (
          <Entrance index={1}>
            <ContinueCard
              unit={continueTarget.unit}
              lesson={continueTarget.lesson}
              tone={accentAt(continueTarget.index)}
              dueCount={dueCount}
              onPress={() =>
                navigation.navigate("Lesson", {
                  featureId: continueTarget.lesson.feature_id,
                  lessonId: continueTarget.lesson.id,
                })
              }
            />
          </Entrance>
        )}

        <Entrance index={2}>
          <Text style={styles.section}>Daily</Text>
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

        <Entrance index={3}>
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

// ─── Today card ───────────────────────────────────────────────────────

function TodayCard({
  today,
  failed,
  week,
  onRetry,
}: {
  today: { daily: ProgressDaily } | null;
  failed: boolean;
  week: ReturnType<typeof lastSevenDays> | null;
  onRetry: () => void;
}) {
  if (!today) {
    return (
      <View style={[styles.card, styles.todayRow]}>
        {failed ? (
          <Pressable onPress={onRetry} style={styles.todayRetry} accessibilityRole="button" accessibilityLabel="Retry">
            <Ionicons name="refresh" size={18} color={color.saffronText} />
            <Text style={styles.retryText}>Couldn't load today. Tap to retry.</Text>
          </Pressable>
        ) : (
          <>
            <Skeleton width={72} height={72} radius={36} />
            <View style={{ flex: 1, gap: space.xs }}>
              <Skeleton height={18} width="50%" />
              <Skeleton height={14} width="35%" />
              <Skeleton height={22} width="90%" />
            </View>
          </>
        )}
      </View>
    );
  }
  const { xp, goal_xp: goal, goal_met: met } = today.daily;
  const target = goal || 50;
  return (
    <View
      style={[styles.card, styles.todayRow]}
      accessible
      accessibilityLabel={`Today: ${xp} of ${target} XP${met ? ", goal met" : ""}`}
    >
      <ProgressRing progress={xp / target} size={72} stroke={8} tint={met ? color.okText : color.saffron}>
        <Text style={styles.ringNum}>{xp}</Text>
        <Text style={styles.ringUnit}>XP</Text>
      </ProgressRing>
      <View style={{ flex: 1 }}>
        <Text style={styles.todayTitle}>{met ? "Goal met today" : "Today's goal"}</Text>
        <Text style={styles.todaySub}>
          {xp} of {target} XP
        </Text>
        {week && (
          <View style={styles.week}>
            {week.map((d) => (
              <View key={d.key} style={styles.weekDay}>
                <View style={[styles.dot, d.active && styles.dotOn, d.isToday && styles.dotToday]}>
                  {d.active && <Ionicons name="checkmark" size={11} color={color.white} />}
                </View>
                <Text style={[styles.weekLabel, d.isToday && styles.weekLabelToday]}>{d.label}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Continue card ────────────────────────────────────────────────────

function ContinueCard({
  unit,
  lesson,
  tone,
  dueCount,
  onPress,
}: {
  unit: Unit;
  lesson: LessonSummary;
  tone: AccentName;
  dueCount: number | null;
  onPress: () => void;
}) {
  const pct = Math.round((unit.progress ?? 0) * 100);
  const titleSa = plain(lesson.title_hi || unit.title_hi);
  return (
    <Pressable
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.continueWrap, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`Continue unit ${unit.rank}, ${plain(unit.title_en)}: ${plain(lesson.title_en)}`}
    >
      <LinearGradient colors={gradientOf(tone)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.continue}>
        <Text style={[styles.continueGhost, script("bold")]} aria-hidden>
          {unit.title_hi.slice(0, 1)}
        </Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.continueEyebrow}>Continue · Unit {unit.rank}</Text>
          <Text style={[styles.continueSa, script("bold")]} numberOfLines={1}>
            {titleSa}
          </Text>
          <Text style={styles.continueEn} numberOfLines={1}>
            {plain(lesson.title_en)}
          </Text>
          <View style={styles.continueMeta}>
            <View style={styles.continueTrack}>
              <View style={[styles.continueFill, { width: `${pct}%` }]} />
            </View>
            <Text style={styles.continuePct}>{pct}%</Text>
            {dueCount != null && dueCount > 0 && (
              <View style={styles.duePill}>
                <Text style={styles.dueText}>{dueCount} to review</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.play}>
          <Ionicons name="play" size={22} color={accent[tone].fg} style={{ marginLeft: 3 }} />
        </View>
      </LinearGradient>
    </Pressable>
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
  greetText: { flex: 1 },
  hello: { fontSize: font.sizes.md, lineHeight: 26, color: color.inkSoft },
  name: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 28, color: color.ink, marginTop: -2 },
  card: { backgroundColor: color.surface, borderRadius: radius.lg, padding: space.md, ...shadow.card },
  todayRow: { flexDirection: "row", alignItems: "center", gap: space.md, marginBottom: space.md, minHeight: 104 },
  todayRetry: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.xs, minHeight: 72 },
  retryText: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.sm, color: color.saffronText },
  ringNum: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.md, color: color.ink, lineHeight: 20 },
  ringUnit: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: 10, color: color.inkSoft, lineHeight: 12 },
  todayTitle: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.base, color: color.ink },
  todaySub: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: font.sizes.sm, color: color.inkSoft, marginTop: 1 },
  week: { flexDirection: "row", justifyContent: "space-between", marginTop: space.sm },
  weekDay: { alignItems: "center", gap: 3 },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: color.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  dotOn: { backgroundColor: color.saffronBtn },
  dotToday: { borderWidth: 2, borderColor: color.ink },
  weekLabel: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: 10, color: color.inkFaint },
  weekLabelToday: { color: color.ink },
  continueWrap: { marginBottom: space.lg, borderRadius: radius.lg, ...shadow.card },
  continue: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    borderRadius: radius.lg,
    padding: space.md,
    paddingVertical: space.lg,
    overflow: "hidden",
  },
  continueGhost: {
    position: "absolute",
    right: 56,
    top: -18,
    fontSize: 120,
    lineHeight: 170,
    color: "rgba(255,255,255,0.10)",
  },
  continueEyebrow: {
    fontFamily: "Nunito_800ExtraBold",
    fontWeight: "800",
    fontSize: font.sizes.xs,
    color: color.white,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  continueSa: { fontSize: font.sizes.lg, lineHeight: 32, color: color.white, marginTop: 4 },
  continueEn: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: font.sizes.sm, color: color.white },
  continueMeta: { flexDirection: "row", alignItems: "center", gap: space.xs, marginTop: space.sm },
  continueTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.28)", overflow: "hidden" },
  continueFill: { height: 6, borderRadius: 3, backgroundColor: color.white },
  continuePct: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.xs, color: color.white },
  duePill: { backgroundColor: "rgba(255,255,255,0.2)", borderRadius: radius.pill, paddingHorizontal: space.xs, paddingVertical: 2 },
  dueText: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: 11, color: color.white },
  play: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: color.white,
    alignItems: "center",
    justifyContent: "center",
  },
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
