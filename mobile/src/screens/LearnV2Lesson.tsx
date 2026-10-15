// Lesson player — one card at a time, in Learn's look (owner-approved
// 2026-10-13). Swipe or Continue moves one card; Back returns one; no
// auto-advance, no timer, no wrap. The first answer to each check is counted
// for the finish screen. Finishing marks the lesson read on the device and
// posts it once to the server (POST /progress/card-lesson): the first finish
// earns XP, every finish marks the day for the streak.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import type { NativeStackNavigationProp, NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, FlatList, Linking, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "../api/client";
import FetchError from "../components/FetchError";
import { Skeleton } from "../components/Skeleton";
import { useAskContext } from "../ask/AskProvider";
import { useGuideLang } from "../hooks/useGuide";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { useTypeScale } from "../hooks/useTypeScale";
import { useQuery } from "../hooks/useQuery";
import LearnV2CardView from "../learnv2/LearnCard";
import { getLearnV2Lesson } from "../learnv2/catalogue";
import { loadCardLesson } from "../learnv2/loadLesson";
import type { LearnV2Lesson } from "../learnv2/types";
import { getLearnV2LastCard, loadLearnV2Visited, markLearnV2CardVisited, markLearnV2LessonDone, setLearnV2LastCard, setLearnV2LastLesson } from "../learnv2/progress";
import type { RootStackParamList } from "../navigation/types";
import { haptics } from "../services/haptics";
import { loadGrammarProgress, setLastTopic, setTopicRead } from "../services/grammarGuide";
import { findStopByCards, stopAfter } from "../trail/course";
import { isStopDone, loadTrailCardDoneMap, loadVisited } from "../trail/progress";
import { toolName } from "../trail/text";
import { T, sa, ui } from "../trail/theme";
import { IconButton, LangSwitch, PrimaryButton, Segments, TextButton } from "../trail/ui";
import { dayStreak, localToday } from "../utils/streak";

type Props = NativeStackScreenProps<RootStackParamList, "LearnV2Lesson">;

interface Finish {
  xp: number | null;
  todayXp: number | null;
  goalXp: number | null;
  goalMet: boolean;
  streak: number;
  unitDone: boolean[];
}

export default function LearnV2LessonScreen({ route, navigation }: Props) {
  return <CardLessonScreen lessonId={route.params.lessonId} navigation={navigation} />;
}

type LessonNavigation = NativeStackNavigationProp<RootStackParamList>;

/** Both the trail and every guide topic use this entry, including future topics. */
export function CardLessonScreen({ lessonId, navigation }: { lessonId: string; navigation: LessonNavigation }) {
  const { lang } = useGuideLang();
  const authored = getLearnV2Lesson(lessonId);
  const query = useQuery(`card-lesson:${lessonId}`, () => loadCardLesson(lessonId), { ttlMs: 30 * 60_000 });
  const lesson = authored ?? query.data;
  if (!lesson) return <SafeAreaView style={styles.safe}>
    <View style={styles.topBar}><IconButton icon="close" label={lang === "hi" ? "बंद करें" : "Close"} onPress={() => navigation.goBack()} /></View>
    <View style={styles.page}>
      {query.failed ? <FetchError label={lang === "hi" ? "पाठ लोड नहीं हुआ।" : "Could not load this lesson."} retryLabel={lang === "hi" ? "फिर कोशिश करें" : "Try again"} onRetry={query.retry} />
        : <View accessible accessibilityLabel={lang === "hi" ? "पाठ लोड हो रहा है" : "Loading lesson"} style={{ gap: 16 }}><Skeleton height={28} /><Skeleton height={180} /><Skeleton height={90} /></View>}
    </View>
  </SafeAreaView>;
  return <LessonPlayer key={lessonId} lesson={lesson} navigation={navigation} />;
}

function LessonPlayer({ lesson, navigation }: { lesson: LearnV2Lesson; navigation: LessonNavigation }) {
  const lessonId = lesson.id;
  const stop = useMemo(() => findStopByCards(lessonId), [lessonId]);
  const next = stop ? stopAfter(stop) : undefined;
  const accent = stop?.stage.color ?? T.action;
  const { lang, setLang } = useGuideLang();
  const hi = lang === "hi";
  const { sized } = useTypeScale();
  const reduced = useReducedMotion();
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<number>>(null);
  const answers = useRef<Record<string, boolean>>({});
  const completing = useRef(false);

  const [index, setIndex] = useState(0);
  const [resumed, setResumed] = useState(false);
  const [finish, setFinish] = useState<Finish | null>(null);

  useAskContext("lesson", lesson?.titleSa ?? lessonId);

  const total = lesson?.cards.length ?? 0;
  const indices = useMemo(() => Array.from({ length: total }, (_, i) => i), [total]);
  const checks = lesson?.cards.filter((c) => c.practice).length ?? 0;

  useEffect(() => {
    setLearnV2LastLesson(lessonId);
    if (lesson.topicIds?.[0]) void setLastTopic(lesson.topicIds[0]);
  }, [lessonId, lesson.topicIds]);

  useEffect(() => {
    if (resumed || total === 0) return;
    setResumed(true);
    getLearnV2LastCard(lessonId).then((saved) => {
      const at = Math.min(Math.max(saved, 0), total - 1);
      if (at > 0) {
        setIndex(at);
        requestAnimationFrame(() => listRef.current?.scrollToIndex({ index: at, animated: false }));
      }
    });
    loadLearnV2Visited(lessonId, (lesson?.cards ?? []).map((c) => c.id)).catch(() => {});
  }, [lessonId, lesson, total, resumed]);

  useEffect(() => {
    const card = lesson?.cards[index];
    if (card) markLearnV2CardVisited(lessonId, card.id);
  }, [lessonId, lesson, index]);

  const goTo = useCallback((to: number) => {
    if (!lesson || to < 0 || to >= total) return;
    haptics.tap();
    setIndex(to);
    setLearnV2LastCard(lessonId, to);
    listRef.current?.scrollToIndex({ index: to, animated: !reduced });
    AccessibilityInfo.announceForAccessibility(hi ? `कार्ड ${to + 1} / ${total}` : `Card ${to + 1} of ${total}`);
  }, [lesson, lessonId, total, reduced, hi]);

  const onViewable = useCallback(({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
    const at = viewableItems[0]?.index;
    if (at != null && at >= 0 && at < total) {
      setIndex(at);
      setLearnV2LastCard(lessonId, at);
    }
  }, [lessonId, total]);

  const complete = useCallback(async () => {
    if (completing.current) return;
    completing.current = true;
    haptics.correct();
    await loadTrailCardDoneMap();
    await markLearnV2LessonDone(lessonId);
    setLearnV2LastCard(lessonId, 0);
    // Opening or swiping never completes a lesson; finishing updates both views.
    for (const topicId of lesson.topicIds ?? []) await setTopicRead(topicId, true);
    AccessibilityInfo.announceForAccessibility(hi ? "पाठ पूरा।" : "Lesson complete.");
    const right = Object.values(answers.current).filter(Boolean).length;
    // The finish screen shows at once from device data; XP and the streak
    // fill in when the server answers (never block on a slow network).
    const [cardsDone, visited, grammar] = await Promise.all([
      loadTrailCardDoneMap(),
      loadVisited(),
      loadGrammarProgress(),
    ]);
    const facts = { cardsDone: { ...cardsDone, [lessonId]: true }, topicsRead: grammar.read, visited, mastery: {} };
    setFinish({
      xp: null, todayXp: null, goalXp: null, goalMet: false, streak: 0,
      unitDone: stop ? stop.unit.lessons.map((l) => isStopDone({ ...stop, lesson: l }, facts)) : [],
    });
    const server = await api.cardLessonDone({ lesson_id: lessonId, checks_right: right, checks_total: checks }).catch(() => null);
    const history = server ? await api.progressHistory(35).catch(() => null) : null;
    if (server) {
      setFinish((f) => f && {
        ...f,
        xp: server.xp, todayXp: server.today_xp, goalXp: server.goal_xp, goalMet: !!server.goal_met,
        streak: history ? dayStreak(history, localToday()) : 0,
      });
    }
  }, [lessonId, lesson.topicIds, hi, checks, stop]);

  const goNext = () => {
    if (!next) { navigation.goBack(); return; }
    const l = next.lesson;
    navigation.replace("LearnV2Lesson", { lessonId: l.cards });
  };

  const openActivity = () => {
    const tool = stop?.lesson.tool;
    if (!tool) return;
    if (tool.kind === "book") navigation.navigate("Book", { bookKey: tool.bookKey });
    else if (tool.kind === "paradigm") navigation.navigate("Paradigm", { kind: tool.of });
    else if (tool.screen === "Vocab" || tool.screen === "WordOrder" || tool.screen === "WordLab") navigation.navigate(tool.screen, {});
    else navigation.navigate(tool.screen);
  };

  if (finish) {
    const right = Object.values(answers.current).filter(Boolean).length;
    return (
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.topBar}>
          <IconButton icon="close" label={hi ? "बंद करें" : "Close"} onPress={() => navigation.goBack()} />
        </View>
        <ScrollView contentContainerStyle={styles.doneBody}>
          <View style={styles.emblem}><Ionicons name="checkmark" size={46} color={T.white} /></View>
          <Text accessibilityRole="header" style={[styles.doneTitle, { fontSize: sized(32) }]}>{hi ? "पाठ पूरा" : "Lesson complete"}</Text>
          <Text style={[sa(sized(22)), { color: T.ink2, textAlign: "center" }]}>{lesson.titleSa}</Text>

          <View style={styles.stats}>
            <Stat value={String(total)} label={hi ? "कार्ड" : "cards"} />
            {checks ? <Stat value={hi ? `${right} / ${checks}` : `${right} of ${checks}`} label={hi ? "सही जाँच" : "checks right"} divider /> : null}
            {finish.xp != null ? <Stat value={`+${finish.xp}`} label="XP" divider accent /> : null}
          </View>

          {stop ? (
            <View style={styles.panel}>
              <Text style={[ui("bold"), { color: accent, fontSize: sized(12), letterSpacing: 1 }]}>
                {hi ? `इकाई ${stop.unit.n} · ${stop.unit.title.hi}` : `UNIT ${stop.unit.n} · ${stop.unit.title.en.toUpperCase()}`}
              </Text>
              <View style={styles.markRow}>
                {stop.unit.lessons.map((l, i) => (
                  <View key={l.id} style={[styles.mark, finish.unitDone[i] && { backgroundColor: T.done, borderColor: T.done }]}>
                    {finish.unitDone[i] ? <Ionicons name="checkmark" size={15} color={T.white} /> : <Text style={[ui("semibold"), { color: T.ink3, fontSize: 13 }]}>{i + 1}</Text>}
                  </View>
                ))}
              </View>
              <Text style={[ui("regular"), { color: T.ink, fontSize: sized(14.5) }]}>
                {hi ? `${finish.unitDone.filter(Boolean).length} / ${stop.unit.lessons.length} पाठ पढ़े।` : `${finish.unitDone.filter(Boolean).length} of ${stop.unit.lessons.length} lessons read.`}
              </Text>
            </View>
          ) : null}

          {finish.streak > 0 ? (
            <View style={[styles.panel, styles.streakRow]}>
              <Ionicons name="flame" size={22} color="#D9772B" />
              <View>
                <Text style={[ui("semibold"), { color: T.ink, fontSize: sized(16) }]}>{hi ? `${finish.streak} दिन लगातार` : `${finish.streak}-day streak`}</Text>
                {finish.todayXp != null ? (
                  <Text style={[ui("regular"), { color: T.ink2, fontSize: sized(13.5) }]}>
                    {finish.goalMet ? (hi ? "आज का लक्ष्य पूरा" : "Today's goal is done") : hi ? `आज ${finish.todayXp} / ${finish.goalXp} XP` : `${finish.todayXp} of ${finish.goalXp} XP today`}
                  </Text>
                ) : null}
              </View>
            </View>
          ) : null}

          <View style={{ gap: 2 }}>
            <Text selectable style={[ui("regular"), { color: T.ink3, fontSize: sized(13), lineHeight: sized(19) }]}>{hi ? lesson.sourcesLabel.hi : lesson.sourcesLabel.en}</Text>
            {lesson.sourceUrls?.map((url, i) => (
              <Pressable key={url} accessibilityRole="link" onPress={() => { void Linking.openURL(url).catch(() => {}); }} style={{ paddingVertical: 6 }}>
                <Text style={[ui("medium"), { color: T.action, fontSize: sized(13.5) }]}>{hi ? "स्रोत" : "Source"} {i + 1} · {safeHost(url)}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
        <View style={styles.bottom}>
          {stop?.lesson.tool ? <PrimaryButton label={(hi ? "अभ्यास: " : "Practise: ") + toolName(stop.lesson.tool, lang)} onPress={openActivity} /> : null}
          {stop?.unit.graded.length ? <PrimaryButton label={hi ? "अभ्यास करें" : "Practise what you learned"}
            onPress={() => navigation.navigate("Challenge", { features: stop.unit.graded })} /> : null}
          {next ? <PrimaryButton label={(hi ? "आगे: " : "Next: ") + next.lesson.title[lang]} onPress={goNext} /> : null}
          <TextButton label={hi ? "मार्ग पर लौटें" : "Back to the trail"} onPress={() => navigation.goBack()} />
        </View>
      </SafeAreaView>
    );
  }

  const last = index >= total - 1;
  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.topBar}>
        <IconButton icon="close" label={hi ? "पाठ बंद करें" : "Close lesson"} onPress={() => navigation.goBack()} />
        <Segments total={total} filled={index + 1} color={accent} />
        <Text style={[ui("regular"), { color: T.ink2, fontSize: sized(13), minWidth: 40, textAlign: "right" }]}>{index + 1}/{total}</Text>
      </View>
      <View style={{ paddingHorizontal: 16, paddingBottom: 8, flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Text numberOfLines={1} style={[ui("semibold"), { flex: 1, color: T.ink2, fontSize: sized(14) }]}>{lesson.title[lang]}</Text>
        <LangSwitch lang={lang} onChange={setLang} />
      </View>

      <FlatList
        ref={listRef}
        data={indices}
        keyExtractor={(i) => `${lessonId}-${i}`}
        renderItem={({ index: i }) => (
          <View style={{ width }}>
            <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false} nestedScrollEnabled>
              <LearnV2CardView card={lesson.cards[i]} accent={accent}
                onAnswer={(ok) => { if (!(lesson.cards[i].id in answers.current)) answers.current[lesson.cards[i].id] = ok; }} />
            </ScrollView>
          </View>
        )}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialNumToRender={3}
        maxToRenderPerBatch={3}
        windowSize={3}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        onViewableItemsChanged={onViewable}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
        accessibilityLabel={hi ? "पाठ कार्ड। बाएँ या दाएँ स्वाइप करें।" : "Lesson cards. Swipe left or right to move."}
      />

      <View style={styles.bottomRow}>
        <Pressable onPress={() => goTo(index - 1)} disabled={index === 0} accessibilityRole="button"
          accessibilityLabel={hi ? "पिछला कार्ड" : "Previous card"} accessibilityState={{ disabled: index === 0 }}
          style={[styles.back, index === 0 && { opacity: 0.4 }]}>
          <Ionicons name="chevron-back" size={22} color={T.ink} />
        </Pressable>
        <PrimaryButton style={{ flex: 1 }} label={last ? (hi ? "पाठ पूरा करें" : "Finish lesson") : hi ? "आगे" : "Continue"}
          accessibilityLabel={last ? (hi ? "पाठ पूरा करें" : "Finish lesson") : hi ? `अगला कार्ड, ${index + 2} / ${total}` : `Next card, ${index + 2} of ${total}`}
          onPress={() => (last ? void complete() : goTo(index + 1))} />
      </View>
    </SafeAreaView>
  );
}

function safeHost(url: string): string {
  try { return new URL(url).hostname; } catch { return url; }
}

function Stat({ value, label, divider, accent }: { value: string; label: string; divider?: boolean; accent?: boolean }) {
  const { sized } = useTypeScale();
  return (
    <View style={[styles.stat, divider && { borderLeftWidth: 1, borderLeftColor: T.line }]}>
      <Text style={[ui("bold"), { color: accent ? T.action : T.ink, fontSize: sized(24) }]}>{value}</Text>
      <Text style={[ui("regular"), { color: T.ink2, fontSize: sized(13.5) }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.paper },
  topBar: { flexDirection: "row", alignItems: "center", gap: 8, paddingLeft: 4, paddingRight: 16, minHeight: 52 },
  page: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32 },
  bottomRow: { flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, borderTopWidth: 1, borderTopColor: T.line, backgroundColor: T.paper },
  back: { width: 52, height: 52, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: T.lineStrong, backgroundColor: T.surface },
  doneBody: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24, gap: 14, alignItems: "stretch" },
  emblem: { alignSelf: "center", width: 96, height: 96, alignItems: "center", justifyContent: "center", backgroundColor: T.done, borderWidth: 8, borderColor: T.doneBg },
  doneTitle: { fontFamily: "TiroDevanagariSanskrit_400Regular", color: T.ink, textAlign: "center", marginTop: 8 },
  stats: { flexDirection: "row", paddingVertical: 12, backgroundColor: T.surface, borderWidth: 1, borderColor: T.line },
  stat: { flex: 1, alignItems: "center" },
  panel: { gap: 10, padding: 14, backgroundColor: T.surface, borderWidth: 1, borderColor: T.line },
  markRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  mark: { width: 30, height: 30, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: T.muted },
  streakRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  bottom: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8, gap: 2, borderTopWidth: 1, borderTopColor: T.line },
});
