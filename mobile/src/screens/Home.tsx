// Home — the daily hub (U8-2). The screen the learner opens first: the mascot
// greeting, then four cards — Continue (primary), Today's śloka, The daily
// word, and a deliberately-quiet Varṇamālā reference. Śloka and Varṇamālā are
// reached from here (they are cards, not tabs, since U8-1).
//
// Rules: cards stagger in once per mount, capped at 6 (§8); every card states
// its status in text, not colour alone (§U5-3); a data-less card shows a
// skeleton, never a spinner or a collapsed row that shifts layout on arrival.

import { DrawerActions, useFocusEffect, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import React, { useCallback, useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withDelay,
} from "react-native-reanimated";

import { api, type DailyWordPuzzle, type LessonSummary, type Shloka, type Unit } from "../api/client";
import { Card, ProgressBar } from "../components/ui";
import { Skeleton } from "../components/Skeleton";
import { Gesture, GuruNative } from "../components/guru";
import { cachedGet } from "../services/apiCache";
import { haptics } from "../services/haptics";
import { getStoryIndex } from "../services/storyProgress";
import { useAuth } from "../store/auth";
import { DrawerToggle } from "../navigation/AppDrawer";
import { duration, stagger } from "../motion";
import type { TabScreenProps } from "../navigation/types";
import { color, font, radius, script, shadow, space } from "../theme";

type Props = TabScreenProps<"Home">;

export default function HomeScreen({ navigation }: Props) {
  const { learner, refresh } = useAuth();
  const rootNav = useNavigation();
  // The profile comes from auth context: AuthProvider filled it from /me while
  // restoring the session (or from the login response), so Home issues no
  // second /me on mount — and later refresh() calls elsewhere land here too.
  const profile = learner;
  const [shloka, setShloka] = useState<Shloka | null>(null);
  const [shlokaLoading, setShlokaLoading] = useState(true);
  const [shlokaError, setShlokaError] = useState(false);
  const [dailyWord, setDailyWord] = useState<DailyWordPuzzle | null>(null);
  const [dailyLoading, setDailyLoading] = useState(true);
  const [dailyError, setDailyError] = useState(false);
  // U15-5: Home routes into the lesson — "continue Unit N" plus, once P23-5
  // landed, an honest "N due today" from the review schedule.
  const [units, setUnits] = useState<Unit[] | null>(null);
  const [unitsFailed, setUnitsFailed] = useState(false);
  // null = still loading (never render a fake 0); a failed fetch stays null
  // so the due text hides instead of pretending nothing is due.
  const [dueCount, setDueCount] = useState<number | null>(null);
  const [profileLoading, setProfileLoading] = useState(!learner);
  // Story deck (Discover Sanskrit) — total cards for the hero status line.
  // null = loading/failed; the hero then shows no fake count.
  const [storyTotal, setStoryTotal] = useState<number | null>(null);
  const [storyAt, setStoryAt] = useState(0);

  useEffect(() => {
    if (learner) return;
    let alive = true;
    setProfileLoading(true);
    refresh()
      .catch(() => null)
      .finally(() => {
        if (alive) setProfileLoading(false);
      });
    return () => {
      alive = false;
    };
    // Only a missing profile is fetched; one that arrives later needs nothing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh]);

  // U10-3: a failed fetch says so and offers retry — a catch that silently
  // leaves an empty card is indistinguishable from a card with no content.
  const loadShloka = useCallback(() => {
    setShlokaLoading(true);
    setShlokaError(false);
    // Same key as the Shloka screen, so opening the card renders from memory.
    cachedGet("shloka-today", api.todayShloka)
      .then(setShloka)
      .catch(() => {
        setShloka(null);
        setShlokaError(true);
      })
      .finally(() => setShlokaLoading(false));
  }, []);

  const loadDaily = useCallback(() => {
    setDailyLoading(true);
    setDailyError(false);
    cachedGet("daily-word", api.dailyWord)
      .then(setDailyWord)
      .catch(() => {
        setDailyWord(null);
        setDailyError(true);
      })
      .finally(() => setDailyLoading(false));
  }, []);

  useEffect(() => {
    loadShloka();
    loadDaily();
    // Cached under the keys Path ("units") and the story deck
    // ("story-chapters") read, so both open from memory after Home.
    cachedGet("units", api.units).then((u) => { setUnits(u); setUnitsFailed(false); }).catch(() => { setUnits(null); setUnitsFailed(true); });
    api.reviewDue(1).then((d) => setDueCount(d.due_count ?? null)).catch(() => setDueCount(null));
    cachedGet("story-chapters", api.storyChapters)
      .then((chs) => setStoryTotal(chs.reduce((n, c) => n + c.cards.length, 0)))
      .catch(() => setStoryTotal(null));
  }, [loadShloka, loadDaily]);

  // The story bookmark advances while Home sits mounted behind other tabs —
  // re-read it every time Home regains focus so Resume never goes stale.
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      getStoryIndex().then((i) => {
        if (alive) setStoryAt(i);
      });
      return () => {
        alive = false;
      };
    }, []),
  );

  const openDrawer = useCallback(() => {
    haptics.tap();
    // The drawer wraps the tab navigator, so its parent is the drawer.
    rootNav.dispatch(DrawerActions.openDrawer());
  }, [rootNav]);

  // Pills show nothing fake: while the profile is loading (or failed and
  // absent) they render a skeleton-width placeholder, never 0 or 30%.
  const streak: number | null = profile?.streak ?? null;
  const ratio: number | null = profile?.sanskrit_ratio ?? null;
  const ratioPct = ratio == null ? null : Math.round(ratio * 100);
  const profilePending = profileLoading && profile == null;

  // U15-5: continue where the learner is — first unfinished unit, else review.
  const continueTarget: { unit: Unit; lesson: LessonSummary } | null = (() => {
    if (!units || units.length === 0) return null;
    for (const u of units) {
      if ((u.progress ?? 0) < 1 && u.lessons.length > 0) {
        return { unit: u, lesson: u.lessons[0] };
      }
    }
    const last = units[units.length - 1];
    if (last.lessons.length > 0) return { unit: last, lesson: last.lessons[0] };
    return null;
  })();

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Top bar with hamburger */}
      <View style={styles.topbar}>
        <DrawerToggle onPress={openDrawer} />
        <View style={{ flex: 1 }} />
        {profilePending ? (
          <>
            <View style={styles.pill}><Skeleton style={{ height: 14, width: 28 }} /></View>
            <View style={styles.pill}><Skeleton style={{ height: 14, width: 40 }} /></View>
          </>
        ) : (
          <>
            <View style={styles.pill}>
              <Ionicons name="flame" size={16} color={color.saffron} />
              <Text style={styles.pillNum}>{streak ?? "—"}</Text>
            </View>
            <View style={styles.pill}>
              <Ionicons name="language" size={14} color={color.inkSoft} />
              <Text style={styles.pillNum}>{ratioPct == null ? "—" : `${ratioPct}%`}</Text>
            </View>
          </>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {/* Mascot greeting */}
        <View style={styles.greetRow}>
          <GuruNative state="idle" size={110} gesture={Gesture.Anjali} />
          <View style={styles.greetBubble}>
            {profilePending ? (
              <Skeleton style={{ height: 20, width: 140 }} />
            ) : (
              <Text style={[styles.greeting, script("extrabold")]}>नमस्ते, {profile?.display_name || "learner"}!</Text>
            )}
            <Text style={styles.subline}>Ready for today's practice?</Text>
          </View>
        </View>

        {/* Cards — stagger in once per mount, capped at 6 (§8) */}
        {/* Hero — the story deck. The old Continue-Unit CTA lived here;
            the deck takes the slot; continuing the Path survives as the slim
            secondary row inside the hero so no route is lost. */}
        <Entrance index={0}>
          {units === null && !unitsFailed && storyTotal === null ? (
            <Skeleton style={{ height: 88, marginBottom: space.lg }} />
          ) : (
            <StoryHero
              total={storyTotal}
              at={storyAt}
              target={continueTarget}
              dueCount={dueCount}
              onOpen={() => navigation.navigate("Story")}
              onLesson={(lesson) =>
                navigation.navigate("Lesson", { featureId: lesson.feature_id, lessonId: lesson.id })
              }
            />
          )}
        </Entrance>

        <Entrance index={1}>
          <ShlokaCard
            shloka={shloka}
            loading={shlokaLoading}
            error={shlokaError}
            onRetry={loadShloka}
            onPress={() => navigation.navigate("Shloka")}
          />
        </Entrance>

        <Entrance index={2}>
          <DailyWordCard
            word={dailyWord}
            loading={dailyLoading}
            error={dailyError}
            onRetry={loadDaily}
            onPress={() => navigation.navigate("DailyWord")}
          />
        </Entrance>

        <Entrance index={3}>
          <VarnamalaCard onPress={() => navigation.navigate("Varnamala")} />
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

// ─── Story hero (Discover Sanskrit) ─────────────────────────────────────
// Home's primary CTA is the swipeable story, not a unit: total cards with a
// Resume position from the device-local bookmark. The Path's continue target
// survives as a slim secondary row — the route is kept, the hero slot is
// the story's.

function StoryHero({
  total,
  at,
  target,
  dueCount,
  onOpen,
  onLesson,
}: {
  total: number | null;
  at: number;
  target: { unit: Unit; lesson: LessonSummary } | null;
  dueCount: number | null;
  onOpen: () => void;
  onLesson: (lesson: LessonSummary) => void;
}) {
  const started = at > 0;
  const status =
    total == null ? "the story, zero to grammar" : started ? `${at + 1}/${total} · Resume` : `${total} cards · Start`;
  const dueText = dueCount != null && dueCount > 0 ? ` · ${dueCount} due today` : "";
  return (
    <View style={{ marginBottom: space.lg }}>
      <Pressable
        onPress={() => {
          haptics.tap();
          onOpen();
        }}
        style={({ pressed }) => [styles.practice, pressed && styles.practicePressed]}
        accessibilityRole="button"
        accessibilityLabel={`Discover Sanskrit. ${status}`}
      >
        <View style={styles.practiceIcon}>
          <Ionicons name="compass" size={30} color={color.white} />
        </View>
        <View style={styles.practiceText}>
          <Text style={styles.practiceLabel}>Discover Sanskrit</Text>
          <Text style={styles.practiceHint}>From zero to grammar · {status}</Text>
        </View>
        <Ionicons name="chevron-forward" size={22} color={color.white} />
      </Pressable>
      {target && (
        <Pressable
          onPress={() => {
            haptics.tap();
            onLesson(target.lesson);
          }}
          style={({ pressed }) => [styles.resumeRow, pressed && styles.practicePressed]}
          accessibilityRole="button"
          accessibilityLabel={`Continue Unit ${target.unit.rank}, ${target.unit.title_en}${dueCount != null && dueCount > 0 ? `, ${dueCount} reviews due` : ""}`}
        >
          <Ionicons name="book-outline" size={16} color={color.saffron} />
          <Text style={styles.resumeText} numberOfLines={1}>
            Continue Unit {target.unit.rank} — {target.lesson.title_en}
            {dueText}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={color.inkFaint} />
        </Pressable>
      )}
    </View>
  );
}

// ─── Today's śloka card ───────────────────────────────────────────────

function ShlokaCard({
  shloka,
  loading,
  error,
  onRetry,
  onPress,
}: {
  shloka: Shloka | null;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  onPress: () => void;
}) {
  const rawFirst = shloka?.devanagari?.split(/।|\n/)[0]?.trim() ?? "";
  const firstLine = rawFirst;
  const showVerse = rawFirst.length > 0;
  return (
    <HomeCard
      title="Today's śloka"
      status={loading ? "loading" : error ? "error" : shloka ? "read" : "unavailable"}
      statusText={loading ? "…" : error ? "couldn't load" : shloka ? "daily verse" : "none yet"}
      onPress={onPress}
      icon="book"
    >
      {loading ? (
        <Skeleton style={{ height: 28, marginTop: 4 }} />
      ) : shloka && showVerse ? (
        <Text style={[styles.cardBody, script("semibold")]} numberOfLines={1}>
          {firstLine}{firstLine.endsWith("।") || firstLine.endsWith("॥") ? "" : "।"}
        </Text>
      ) : error ? (
        <RetryInline onRetry={onRetry} label="Couldn't reach the verse." />
      ) : (
        <Text style={styles.cardMuted}>A verse will appear here daily.</Text>
      )}
    </HomeCard>
  );
}

// ─── Daily word card ──────────────────────────────────────────────────

function DailyWordCard({
  word,
  loading,
  error,
  onRetry,
  onPress,
}: {
  word: DailyWordPuzzle | null;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  onPress: () => void;
}) {
  const solvedStreak = word?.streak ?? 0;
  const statusText = loading
    ? "…"
    : error
      ? "couldn't load"
      : word?.solved
        ? (solvedStreak > 0 ? `solved · ${solvedStreak} day streak` : "solved")
        : word?.status === "finished"
          ? "finished"
          : word
            ? "open"
            : "unavailable";
  return (
    <HomeCard
      title="Daily word"
      status={loading ? "loading" : error ? "error" : word ? (word.solved ? "solved" : "open") : "unavailable"}
      statusText={statusText}
      onPress={onPress}
      icon="extension-puzzle"
    >
      <View style={styles.dailyRow}>
        {loading ? (
          <Skeleton style={{ height: 24, width: 120 }} />
        ) : word ? (
          <>
            {word.solved ? (
              <Text style={[styles.cardBody, script("semibold")]}>{word.revealed?.answer ?? "Solved"}</Text>
            ) : (
              <Text style={styles.cardMuted}>
                {word.status === "finished"
                  ? "See how it went."
                  : word.word_length > 0
                    ? `A ${word.word_length}-sound word.`
                    : "A daily word."}
              </Text>
            )}
            {solvedStreak > 0 && (
              <View style={styles.unlockBadge}>
                <Ionicons name="flame" size={13} color={color.saffron} />
                <Text style={styles.unlockBadgeText}>{solvedStreak}</Text>
              </View>
            )}
          </>
        ) : error ? (
          <RetryInline onRetry={onRetry} label="Couldn't reach the word." />
        ) : (
          <Text style={styles.cardMuted}>One word a day, scored on the mouth-map.</Text>
        )}
      </View>
    </HomeCard>
  );
}

// U10-3: shared inline retry row — states the failure in text, offers retry,
// never reads as a verdict or a punishment.
function RetryInline({ onRetry, label }: { onRetry: () => void; label: string }) {
  return (
    <View style={styles.retryRow}>
      <Text style={styles.retryLabel}>{label}</Text>
      <Pressable
        onPress={onRetry}
        accessibilityRole="button"
        accessibilityLabel={`Retry: ${label}`}
        style={styles.retryBtn}
        hitSlop={8}
      >
        <Ionicons name="refresh" size={13} color={color.saffron} />
        <Text style={styles.retryBtnText}>Retry</Text>
      </Pressable>
    </View>
  );
}

// ─── Varṇamālā card (deliberately the quietest) ─────────────────────

function VarnamalaCard({ onPress }: { onPress: () => void }) {
  return (
    <HomeCard
      title="Varṇamālā"
      status="reference"
      statusText="alphabet"
      onPress={onPress}
      icon="language"
    >
      <Text style={styles.cardMuted}>The mouth-map of Sanskrit.</Text>
    </HomeCard>
  );
}

// ─── Shared card shell ───────────────────────────────────────────────

function HomeCard({
  title,
  status,
  statusText,
  icon,
  onPress,
  children,
}: {
  title: string;
  status: string;
  statusText: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={() => { haptics.tap(); onPress(); }}
      style={({ pressed }) => [styles.card, pressed && styles.practicePressed]}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${statusText}`}
    >
      <View style={styles.cardHeader}>
        <Ionicons name={icon} size={18} color={color.saffron} />
        <Text style={styles.cardTitle}>{title}</Text>
        <View style={[styles.statusDot, status === "solved" && styles.statusSolved]} />
        <Text style={styles.cardStatus}>{statusText}</Text>
      </View>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg },
  topbar: { flexDirection: "row", alignItems: "center", paddingHorizontal: space.lg, paddingVertical: space.sm, gap: space.sm },
  pill: { flexDirection: "row", alignItems: "center", backgroundColor: color.surface, borderRadius: 999, paddingHorizontal: space.md, paddingVertical: space.xs, gap: 4, ...shadow.card },
  pillNum: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.sm, color: color.ink },
  body: { padding: space.lg, paddingBottom: space.xxl },
  greetRow: { flexDirection: "row", alignItems: "center", gap: space.sm, marginBottom: space.lg },
  greetBubble: { flex: 1, backgroundColor: color.surface, borderRadius: radius.lg, padding: space.md, ...shadow.card },
  greeting: { fontSize: font.sizes.md, color: color.ink },
  subline: { fontFamily: "Nunito_400Regular", fontWeight: "400", fontSize: font.sizes.sm, color: color.inkSoft, marginTop: 2, lineHeight: 20 },
  practice: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    backgroundColor: color.saffron,
    borderRadius: radius.xl,
    padding: space.md,
    marginBottom: space.lg,
    ...shadow.button,
  },
  practicePressed: { transform: [{ translateY: 2 }] },
  practiceIcon: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center", justifyContent: "center",
  },
  practiceText: { flex: 1 },
  practiceLabel: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.md, color: color.white },
  practiceHint: { fontFamily: "Nunito_500Medium", fontWeight: "500", fontSize: font.sizes.sm, color: "rgba(255,255,255,0.9)", marginTop: 2 },
  resumeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    marginTop: space.sm,
    minHeight: 48,
    ...shadow.card,
  },
  resumeText: {
    flex: 1,
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600",
    fontSize: font.sizes.sm,
    color: color.inkSoft,
  },
  card: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    padding: space.md,
    marginBottom: space.md,
    ...shadow.card,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  cardTitle: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.base, color: color.ink, flex: 1 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: color.border },
  statusSolved: { backgroundColor: color.ok },
  cardStatus: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: font.sizes.xs, color: color.inkSoft },
  cardBody: { fontSize: font.sizes.md, color: color.ink, marginTop: 4 },
  cardMuted: { fontFamily: "Nunito_400Regular", fontWeight: "400", fontSize: font.sizes.sm, color: color.inkSoft, marginTop: 4 },
  dailyRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  retryRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flex: 1, gap: space.sm },
  retryLabel: {
    fontFamily: "Nunito_400Regular",
    fontWeight: "400",
    fontSize: font.sizes.sm,
    color: color.inkSoft,
    flex: 1,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minHeight: 44,
    paddingHorizontal: space.sm,
    borderRadius: radius.md,
    backgroundColor: color.surfaceMuted,
  },
  retryBtnText: {
    fontFamily: "Nunito_700Bold",
    fontWeight: "700",
    fontSize: font.sizes.sm,
    color: color.saffron,
  },
  unlockBadge: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: color.surfaceMuted, borderRadius: radius.pill, paddingHorizontal: space.sm, paddingVertical: 2 },
  unlockBadgeText: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.xs, color: color.saffron },
});
