// Path — the journey through Sanskritam's eleven units (U15-3), laid out as a
// poster and rails: a hero card for the unit you are in, then one horizontal
// rail of lesson cards per unit. Each unit has its own colour (theme accents),
// so the path reads as places, not as rows in a list.
//
// P23 made the spine data: GET /units returns eleven ranked units, each with
// its released lessons and per-unit progress. A lesson opens a sheet with
// Learn (the step player) and Practice.
//
// A locked unit stays visible, dimmed, with a lock; tapping one of its cards
// says which unit to finish first. It never navigates.
//
// Resilience (U10-3): a failed fetch shows a retryable error state.
//
// Data (Track C4): units load through useQuery — cached 60s, deduped
// in-flight, refetched on focus (progress changes behind other tabs), never
// setState after unmount. Videos (P24): one cached GET /videos read maps
// unit_id → count; the badge hides while the catalogue loads or fails.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BackHandler,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { api, type LessonSummary, type Unit, type VideoItem } from "../api/client";
import { useAsk } from "../ask/AskProvider";
import FetchError from "../components/FetchError";
import { Skeleton } from "../components/Skeleton";
import { useQuery } from "../hooks/useQuery";
import { useTypeScale } from "../hooks/useTypeScale";
import { haptics } from "../services/haptics";
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
import { plain } from "../utils/text";

const CARD_W = 150;
const CARD_H = 190;

/** Lessons on the path. The server already leaves the staged shelf out; this
 *  also covers a backend from before it did. */
function released(unit: Unit): LessonSummary[] {
  return unit.lessons.filter((l) => !(l.title_en ?? "").startsWith("[staged]") && (l.rank ?? 0) < 900);
}

/** The first Devanagari letter of a title, for the faint mark behind a card. */
function ghostLetter(s: string): string {
  return s.match(/[ऄ-हक़-ॡ]/)?.[0] ?? "";
}

export default function PathScreen({ navigation }: TabScreenProps<"Path">) {
  const { sized } = useTypeScale();
  const { data: units, loading, failed, retry } = useQuery<Unit[]>("units", api.units, {
    refetchOnFocus: true,
  });
  // P24: video counts per unit. A lesson's videos ARE its unit's, so one
  // cached catalogue read serves every card. A failed fetch hides the badges,
  // never the path.
  const { data: allVideos } = useQuery<VideoItem[]>("videos", api.videos, { refetchOnFocus: true });
  const videoCountByUnit = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const v of allVideos ?? []) if (v.unit_id) counts[v.unit_id] = (counts[v.unit_id] ?? 0) + 1;
    return counts;
  }, [allVideos]);

  const [selected, setSelected] = useState<{ lesson: LessonSummary; tone: AccentName } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const list = units ?? [];

  // A unit opens once the previous one has any progress: forward motion
  // without a hard gate that strands a learner.
  const unlocked = useCallback(
    (idx: number) => idx === 0 || ((units?.[idx - 1]?.progress ?? 0) > 0),
    [units],
  );

  // The unit you are in: the first that is not finished and has lessons.
  const currentIndex = useMemo(() => {
    const i = list.findIndex((u) => (u.progress ?? 0) < 1 && released(u).length > 0);
    return i >= 0 ? i : Math.max(0, list.length - 1);
  }, [list]);

  const say = useCallback((text: string) => {
    haptics.tap();
    setNotice(text);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 2600);
  }, []);
  useEffect(
    () => () => {
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    },
    [],
  );

  // The Ask bubble steps aside while the lesson sheet is open: it would sit on
  // top of the Practice tile.
  const { setHiddenBy } = useAsk();
  useEffect(() => {
    setHiddenBy("path-sheet", selected !== null);
    return () => setHiddenBy("path-sheet", false);
  }, [selected, setHiddenBy]);

  // The Android back button closes the sheet before it leaves the tab.
  useFocusEffect(
    useCallback(() => {
      if (!selected) return undefined;
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        setSelected(null);
        return true;
      });
      return () => sub.remove();
    }, [selected]),
  );

  const learn = useCallback(
    (lesson: LessonSummary) => {
      setSelected(null);
      navigation.navigate("Lesson", { featureId: lesson.feature_id, lessonId: lesson.id });
    },
    [navigation],
  );

  const practice = useCallback(
    (lesson: LessonSummary) => {
      setSelected(null);
      navigation.navigate("Challenge", {
        features: lesson.features?.length ? lesson.features : [lesson.feature_id],
      });
    },
    [navigation],
  );

  const current = list[currentIndex];
  const currentLessons = current ? released(current) : [];

  const header = (
    <View>
      <View style={styles.titleRow}>
        <Text style={[styles.title, { fontSize: sized(font.sizes.xl) }]} accessibilityRole="header">
          Path
        </Text>
        {list.length > 0 && (
          <View style={styles.unitChip} accessible accessibilityLabel={`Unit ${currentIndex + 1} of ${list.length}`}>
            <Text style={styles.unitChipText}>
              Unit {currentIndex + 1} of {list.length}
            </Text>
          </View>
        )}
      </View>
      {current && currentLessons.length > 0 && (
        <Hero
          unit={current}
          lesson={currentLessons[0]}
          tone={accentAt(currentIndex)}
          onPress={() => {
            haptics.tap();
            learn(currentLessons[0]);
          }}
        />
      )}
    </View>
  );

  const renderRail = useCallback(
    ({ item: unit, index }: { item: Unit; index: number }) => {
      const lessons = released(unit);
      if (lessons.length === 0) return null;
      const open = unlocked(index);
      const tone = accentAt(index);
      const pct = Math.round((unit.progress ?? 0) * 100);
      const videos = videoCountByUnit[unit.id] ?? 0;
      return (
        <View style={[styles.rail, !open && styles.railLocked]}>
          <View style={styles.railHead}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.railTitle, { fontSize: sized(font.sizes.md) }]} numberOfLines={1}>
                Unit {unit.rank} · <Text style={script("bold")}>{plain(unit.title_hi)}</Text> · {plain(unit.title_en)}
              </Text>
            </View>
            {open ? (
              <Text style={[styles.railPct, { color: accent[tone].fg }]}>{pct}%</Text>
            ) : (
              <Ionicons name="lock-closed" size={16} color={color.inkFaint} accessibilityLabel="Locked" />
            )}
          </View>
          <FlatList
            horizontal
            data={lessons}
            keyExtractor={(l) => l.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.railBody}
            ItemSeparatorComponent={() => <View style={{ width: space.sm }} />}
            renderItem={({ item: lesson, index: n }) => (
              <LessonCard
                lesson={lesson}
                number={n + 1}
                tone={tone}
                locked={!open}
                videos={videos}
                onPress={() => {
                  if (!open) {
                    say(`Finish Unit ${units?.[index - 1]?.rank ?? unit.rank - 1} first`);
                    return;
                  }
                  haptics.tap();
                  setSelected({ lesson, tone });
                }}
              />
            )}
          />
        </View>
      );
    },
    [sized, unlocked, videoCountByUnit, say, units],
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {loading && !units ? (
        <View style={styles.body} accessible accessibilityRole="progressbar" accessibilityLabel="Loading the path">
          <Text style={[styles.title, { fontSize: sized(font.sizes.xl) }]}>Path</Text>
          <Skeleton height={176} radius={radius.lg} style={{ marginTop: space.md }} />
          <Skeleton height={20} width="60%" style={{ marginTop: space.lg }} />
          <View style={{ flexDirection: "row", gap: space.sm, marginTop: space.sm }}>
            <Skeleton width={CARD_W} height={CARD_H} radius={radius.lg} />
            <Skeleton width={CARD_W} height={CARD_H} radius={radius.lg} />
          </View>
        </View>
      ) : failed && !units ? (
        <View style={styles.body}>
          <Text style={[styles.title, { fontSize: sized(font.sizes.xl) }]}>Path</Text>
          <FetchError label="Couldn't load the path." onRetry={retry} />
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(u) => u.id}
          renderItem={renderRail}
          ListHeaderComponent={header}
          contentContainerStyle={styles.list}
          initialNumToRender={4}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={loading && list.length > 0} onRefresh={retry} />}
          accessibilityLabel="Learning path"
        />
      )}

      {notice ? (
        <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(150)} style={styles.notice} pointerEvents="none">
          <Ionicons name="lock-closed" size={14} color={color.white} />
          <Text style={styles.noticeText} accessibilityLiveRegion="polite">
            {notice}
          </Text>
        </Animated.View>
      ) : null}

      {selected ? (
        <LessonSheet
          lesson={selected.lesson}
          tone={selected.tone}
          videos={videoCountByUnit[selected.lesson.unit_id] ?? 0}
          onClose={() => setSelected(null)}
          onLearn={() => learn(selected.lesson)}
          onPractice={() => practice(selected.lesson)}
        />
      ) : null}
    </SafeAreaView>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────

function Hero({
  unit,
  lesson,
  tone,
  onPress,
}: {
  unit: Unit;
  lesson: LessonSummary;
  tone: AccentName;
  onPress: () => void;
}) {
  const pct = Math.round((unit.progress ?? 0) * 100);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.heroWrap, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`Continue unit ${unit.rank}, ${plain(unit.title_en)}. ${plain(lesson.title_en)}. ${pct} percent`}
    >
      <LinearGradient colors={gradientOf(tone)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <Text style={[styles.heroGhost, script("bold")]} aria-hidden>
          {ghostLetter(unit.title_hi)}
        </Text>
        <Text style={styles.heroEyebrow}>Unit {unit.rank}</Text>
        <Text style={[styles.heroSa, script("extrabold")]} numberOfLines={1}>
          {plain(unit.title_hi)}
        </Text>
        <Text style={styles.heroEn} numberOfLines={1}>
          {plain(unit.title_en)}
        </Text>
        <Text style={styles.heroNext} numberOfLines={1}>
          Next: {plain(lesson.title_en)}
        </Text>
        <View style={styles.heroFoot}>
          <View style={styles.heroTrack}>
            <View style={[styles.heroFill, { width: `${pct}%` }]} />
          </View>
          <Text style={styles.heroPct}>{pct}%</Text>
          <View style={styles.heroBtn}>
            <Ionicons name="play" size={15} color={accent[tone].fg} />
            <Text style={[styles.heroBtnText, { color: accent[tone].fg }]}>Continue</Text>
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

// ─── Lesson card ──────────────────────────────────────────────────────

function LessonCard({
  lesson,
  number,
  tone,
  locked,
  videos,
  onPress,
}: {
  lesson: LessonSummary;
  number: number;
  tone: AccentName;
  locked: boolean;
  videos: number;
  onPress: () => void;
}) {
  const sa = plain(lesson.title_hi) || plain(lesson.title_en);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.cardWrap, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityState={{ disabled: locked }}
      accessibilityLabel={`${plain(lesson.title_hi)}, ${plain(lesson.title_en)}. ${lesson.step_count} steps${
        videos > 0 ? `, ${videos} ${videos === 1 ? "video" : "videos"}` : ""
      }${locked ? ". Locked" : ""}`}
    >
      <LinearGradient
        colors={locked ? ["#9A8E80", "#7A6E62"] : gradientOf(tone)}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <Text style={[styles.cardGhost, script("bold")]} aria-hidden>
          {ghostLetter(lesson.title_hi)}
        </Text>
        <View style={styles.cardNum}>
          <Text style={styles.cardNumText}>{number}</Text>
        </View>
        <View style={{ flex: 1 }} />
        <Text style={[styles.cardSa, script("bold")]} numberOfLines={2}>
          {sa}
        </Text>
        <Text style={styles.cardEn} numberOfLines={1}>
          {plain(lesson.title_en)}
        </Text>
        <View style={styles.cardFoot}>
          <Text style={styles.cardSteps}>{lesson.step_count} steps</Text>
          {videos > 0 && (
            <View style={styles.videoBadge}>
              <Ionicons name="play" size={9} color={color.white} />
              <Text style={styles.videoBadgeText}>{videos}</Text>
            </View>
          )}
        </View>
      </LinearGradient>
    </Pressable>
  );
}

// ─── Lesson sheet ─────────────────────────────────────────────────────

function LessonSheet({
  lesson,
  tone,
  videos,
  onClose,
  onLearn,
  onPractice,
}: {
  lesson: LessonSummary;
  tone: AccentName;
  videos: number;
  onClose: () => void;
  onLearn: () => void;
  onPractice: () => void;
}) {
  const t = accent[tone];
  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View entering={FadeIn.duration(140)} exiting={FadeOut.duration(120)} style={StyleSheet.absoluteFill}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" />
      </Animated.View>
      <Animated.View
        entering={SlideInDown.springify().damping(22)}
        exiting={SlideOutDown.duration(160)}
        style={styles.sheet}
      >
        <View style={styles.grabber} />
        <Text style={[styles.sheetSa, script("bold")]}>{plain(lesson.title_hi) || plain(lesson.title_en)}</Text>
        <Text style={styles.sheetEn}>{plain(lesson.title_en)}</Text>
        <View style={styles.chips}>
          <View style={[styles.chip, { backgroundColor: t.bg }]}>
            <Ionicons name="list" size={13} color={t.fg} />
            <Text style={[styles.chipText, { color: t.fg }]}>{lesson.step_count} steps</Text>
          </View>
          {videos > 0 && (
            <View style={[styles.chip, { backgroundColor: t.bg }]}>
              <Ionicons name="play-circle" size={13} color={t.fg} />
              <Text style={[styles.chipText, { color: t.fg }]}>
                {videos} {videos === 1 ? "video" : "videos"}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.tiles}>
          <Pressable
            onPress={onLearn}
            style={({ pressed }) => [styles.tile, { backgroundColor: t.bg }, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={`Learn, ${lesson.step_count} steps`}
          >
            <View style={[styles.tileIcon, { backgroundColor: t.fg }]}>
              <Ionicons name="book" size={20} color={color.white} />
            </View>
            <Text style={[styles.tileTitle, { color: t.fg }]}>Learn</Text>
            <Text style={styles.tileSub}>{lesson.step_count} steps</Text>
          </Pressable>
          <Pressable
            onPress={onPractice}
            style={({ pressed }) => [styles.tile, { backgroundColor: accent.gold.bg }, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Practice, quiz"
          >
            <View style={[styles.tileIcon, { backgroundColor: accent.gold.fg }]}>
              <Ionicons name="flash" size={20} color={color.white} />
            </View>
            <Text style={[styles.tileTitle, { color: accent.gold.fg }]}>Practice</Text>
            <Text style={styles.tileSub}>Quiz</Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg },
  body: { padding: space.lg },
  // 120 at the bottom: the Ask bubble floats over the last rail.
  list: { paddingBottom: 120 },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space.lg,
    paddingTop: space.xs,
    paddingBottom: space.sm,
  },
  title: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.xl, color: color.ink },
  unitChip: { backgroundColor: color.surface, borderRadius: radius.pill, paddingHorizontal: space.md, paddingVertical: 6, ...shadow.card },
  unitChipText: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.xs, color: color.ink },
  pressed: { opacity: 0.92, transform: [{ scale: 0.985 }] },
  // ── hero ──
  heroWrap: { marginHorizontal: space.lg, marginBottom: space.lg, borderRadius: radius.xl, ...shadow.card },
  hero: { borderRadius: radius.xl, padding: space.lg, overflow: "hidden", minHeight: 176 },
  heroGhost: { position: "absolute", right: -6, top: -22, fontSize: 170, lineHeight: 230, color: "rgba(255,255,255,0.10)" },
  heroEyebrow: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.xs, color: color.white, textTransform: "uppercase", letterSpacing: 1 },
  heroSa: { fontSize: 34, lineHeight: 50, color: color.white, marginTop: 2 },
  heroEn: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.base, color: color.white },
  heroNext: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: font.sizes.sm, color: color.white, marginTop: 2 },
  heroFoot: { flexDirection: "row", alignItems: "center", gap: space.xs, marginTop: space.md },
  heroTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.28)", overflow: "hidden" },
  heroFill: { height: 6, borderRadius: 3, backgroundColor: color.white },
  heroPct: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.xs, color: color.white },
  heroBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: color.white, borderRadius: radius.pill, paddingHorizontal: space.md, minHeight: 40, marginLeft: space.xs },
  heroBtnText: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.sm },
  // ── rails ──
  rail: { marginBottom: space.lg },
  railLocked: { opacity: 0.6 },
  railHead: { flexDirection: "row", alignItems: "center", paddingHorizontal: space.lg, marginBottom: space.sm, gap: space.sm },
  railTitle: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", color: color.ink },
  railPct: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.sm },
  railBody: { paddingHorizontal: space.lg },
  // ── card ──
  cardWrap: { width: CARD_W, height: CARD_H, borderRadius: radius.lg, ...shadow.card },
  card: { flex: 1, borderRadius: radius.lg, padding: space.sm + 2, overflow: "hidden" },
  cardGhost: { position: "absolute", right: -8, bottom: 30, fontSize: 96, lineHeight: 140, color: "rgba(255,255,255,0.12)" },
  cardNum: { width: 26, height: 26, borderRadius: 13, backgroundColor: "rgba(255,255,255,0.22)", alignItems: "center", justifyContent: "center" },
  cardNumText: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.xs, color: color.white },
  cardSa: { fontSize: font.sizes.md, lineHeight: 26, color: color.white },
  cardEn: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: font.sizes.xs, color: color.white, marginTop: 2 },
  cardFoot: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: space.xs },
  cardSteps: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 11, color: color.white },
  videoBadge: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "rgba(255,255,255,0.22)", borderRadius: radius.pill, paddingHorizontal: 7, paddingVertical: 2 },
  videoBadgeText: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 10, color: color.white },
  // ── notice ──
  notice: {
    position: "absolute",
    alignSelf: "center",
    bottom: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: color.ink,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: 10,
  },
  noticeText: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.sm, color: color.white },
  // ── sheet ──
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(59,46,37,0.45)" },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: color.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: space.xl,
  },
  grabber: { alignSelf: "center", width: 44, height: 5, borderRadius: radius.pill, backgroundColor: color.border, marginBottom: space.md },
  sheetSa: { fontSize: font.sizes.xl, lineHeight: 42, color: color.ink },
  sheetEn: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: font.sizes.base, color: color.inkSoft },
  chips: { flexDirection: "row", gap: space.xs, marginTop: space.sm },
  chip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: space.sm, paddingVertical: 5, borderRadius: radius.pill },
  chipText: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.xs },
  tiles: { flexDirection: "row", gap: space.sm, marginTop: space.lg },
  tile: { flex: 1, borderRadius: radius.lg, padding: space.md, minHeight: 120, justifyContent: "space-between" },
  tileIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  tileTitle: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.md, marginTop: space.sm },
  tileSub: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: font.sizes.xs, color: color.inkSoft },
});
