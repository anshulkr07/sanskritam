// LearnV2 lesson player — one card at a time over a Quiet deck.
//
// Gesture contract (rulebook §7, no Tinder semantics): swipe left advances one
// card, swipe right returns one; Back/Next buttons always present; no
// auto-advance, no timer, no audio on entry, no wrap — the last card shows a
// deliberate endpoint. Swiping writes the reading bookmark only: never
// correctness, never mastery. Vertical card content scrolls inside the page;
// horizontal paging never steals that gesture (direction-locked list + inner
// ScrollView). Reduced motion shortens the transition; screen readers get an
// announcement per card.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button, ProgressBar } from "../components/ui";
import { useAskContext } from "../ask/AskProvider";
import { useGuideLang } from "../hooks/useGuide";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { useTypeScale } from "../hooks/useTypeScale";
import LearnV2CardView from "../learnv2/LearnCard";
import { getLearnV2Lesson } from "../learnv2/catalogue";
import {
  getLearnV2LastCard,
  loadLearnV2Visited,
  markLearnV2CardVisited,
  markLearnV2LessonDone,
  setLearnV2LastCard,
} from "../learnv2/progress";
import type { RootStackParamList } from "../navigation/types";
import { haptics } from "../services/haptics";
import { color, font, radius, script, shadow, space } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "LearnV2Lesson">;

export default function LearnV2LessonScreen({ route, navigation }: Props) {
  const { lessonId } = route.params;
  const lesson = getLearnV2Lesson(lessonId);
  const { lang } = useGuideLang();
  const { sized } = useTypeScale();
  const reduced = useReducedMotion();
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<number>>(null);

  const [index, setIndex] = useState(0);
  const [resumed, setResumed] = useState(false);
  const [done, setDone] = useState(false);

  // The guru answers about this lesson when asked from the player.
  useAskContext("lesson", lesson?.titleSa ?? lessonId);

  const total = lesson?.cards.length ?? 0;
  const indices = useMemo(() => Array.from({ length: total }, (_, i) => i), [total]);

  // Resume the device-local bookmark once; jump without animation.
  useEffect(() => {
    if (resumed || total === 0) return;
    setResumed(true);
    getLearnV2LastCard(lessonId).then((saved) => {
      const at = Math.min(Math.max(saved, 0), total - 1);
      if (at > 0) {
        setIndex(at);
        requestAnimationFrame(() => {
          listRef.current?.scrollToIndex({ index: at, animated: false });
        });
      }
    });
    loadLearnV2Visited(
      lessonId,
      (lesson?.cards ?? []).map((c) => c.id),
    ).catch(() => {});
  }, [lessonId, lesson, total, resumed]);

  // Mark the visible card visited (reading only).
  useEffect(() => {
    const card = lesson?.cards[index];
    if (card) markLearnV2CardVisited(lessonId, card.id);
  }, [lessonId, lesson, index]);

  const goTo = useCallback(
    (next: number) => {
      if (!lesson || next < 0 || next >= total) return;
      haptics.tap();
      setIndex(next);
      setLearnV2LastCard(lessonId, next);
      listRef.current?.scrollToIndex({ index: next, animated: !reduced });
      AccessibilityInfo.announceForAccessibility(
        lang === "hi" ? `कार्ड ${next + 1} / ${total}` : `Card ${next + 1} of ${total}`,
      );
    },
    [lesson, lessonId, total, reduced, lang],
  );

  const onViewable = useCallback(
    ({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
      const at = viewableItems[0]?.index;
      if (at != null && at !== index && at >= 0 && at < total) {
        setIndex(at);
        setLearnV2LastCard(lessonId, at);
      }
    },
    [index, lessonId, total],
  );

  const finish = useCallback(() => {
    haptics.correct();
    markLearnV2LessonDone(lessonId);
    setDone(true);
    AccessibilityInfo.announceForAccessibility(lang === "hi" ? "पाठ पूरा पढ़ा गया।" : "Lesson read through.");
  }, [lessonId, lang]);

  const exit = useCallback(() => {
    haptics.tap();
    navigation.goBack();
  }, [navigation]);

  if (!lesson) {
    return (
      <SafeAreaView style={styles.safe} edges={["bottom"]}>
        <View style={styles.body}>
          <Text style={[styles.errorTitle, { fontSize: sized(font.sizes.base) }]}>
            {lang === "hi" ? "यह पाठ उपलब्ध नहीं है।" : "This lesson is not available."}
          </Text>
          <Button label={lang === "hi" ? "वापस" : "Back"} onPress={exit} style={{ marginTop: space.md }} />
        </View>
      </SafeAreaView>
    );
  }

  if (done) {
    return (
      <SafeAreaView style={styles.safe} edges={["bottom"]}>
        <View style={styles.body}>
          <Text style={[styles.doneKicker, { fontSize: sized(font.sizes.xs) }]}>
            {lang === "hi" ? "पाठ समाप्त" : "LESSON READ THROUGH"}
          </Text>
          <Text style={[styles.doneTitle, script("bold"), { fontSize: sized(font.sizes.xl) }]}>{lesson.titleSa}</Text>
          <Text style={[styles.doneSub, { fontSize: sized(font.sizes.base) }]}>
            {lang === "hi" ? lesson.outcome.hi : lesson.outcome.en}
          </Text>
          <Text style={[styles.doneNote, { fontSize: sized(font.sizes.sm) }]}>
            {lang === "hi"
              ? `${total} कार्ड पढ़े। यह पठन है — mastery, XP या review नहीं लिखा गया।`
              : `${total} cards read. This is reading — no mastery, XP or review was written.`}
          </Text>
          <Text style={[styles.doneSources, { fontSize: sized(font.sizes.xs) }]}>
            {lang === "hi" ? lesson.sourcesLabel.hi : lesson.sourcesLabel.en}
          </Text>
          <Button label={lang === "hi" ? "पाठ सूची" : "Lesson list"} onPress={exit} block style={{ marginTop: space.lg }} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <View style={styles.topBar}>
        <Pressable
          onPress={exit}
          style={styles.exitBtn}
          accessibilityRole="button"
          accessibilityLabel={lang === "hi" ? "पाठ बंद करें" : "Close lesson"}
        >
          <Ionicons name="close" size={22} color={color.ink} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.topSa, script("bold"), { fontSize: sized(font.sizes.base) }]} numberOfLines={1}>
            {lesson.titleSa}
          </Text>
          <Text style={[styles.topEn, { fontSize: sized(font.sizes.xs) }]} numberOfLines={1}>
            {lang === "hi" ? lesson.title.hi : lesson.title.en} · {index + 1}/{total}
          </Text>
        </View>
      </View>
      <View style={styles.progressRow}>
        <ProgressBar progress={total === 0 ? 0 : (index + 1) / total} height={8} style={{ flex: 1 }} />
      </View>

      <FlatList
        ref={listRef}
        data={indices}
        keyExtractor={(i) => `${lessonId}-${i}`}
        renderItem={({ index: i }) => (
          <View style={[styles.page, { width }]}>
            <ScrollView
              contentContainerStyle={styles.pageBody}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
            >
              <LearnV2CardView card={lesson.cards[i]} />
              {i === total - 1 && (
                <Button
                  label={lang === "hi" ? "पाठ समाप्त पढ़ें" : "Finish lesson"}
                  onPress={finish}
                  block
                  style={{ marginTop: space.lg }}
                  accessibilityLabel={lang === "hi" ? "पाठ समाप्त पढ़ें" : "Mark lesson read through"}
                />
              )}
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
        accessibilityLabel={
          lang === "hi" ? "पाठ कार्ड। बाएँ या दाएँ स्वाइप करें।" : "Lesson cards. Swipe left or right to move."
        }
      />

      <View style={styles.navRow}>
        <Pressable
          onPress={() => goTo(index - 1)}
          disabled={index === 0}
          style={[styles.navBtn, index === 0 && styles.navDisabled]}
          accessibilityRole="button"
          accessibilityLabel={lang === "hi" ? "पिछला कार्ड" : "Previous card"}
          accessibilityState={{ disabled: index === 0 }}
        >
          <Ionicons name="chevron-back" size={20} color={index === 0 ? color.inkFaint : color.saffron} />
          <Text style={[styles.navText, index === 0 && styles.navTextDisabled]}>{lang === "hi" ? "पीछे" : "Back"}</Text>
        </Pressable>
        <Pressable
          onPress={() => (index >= total - 1 ? finish() : goTo(index + 1))}
          style={styles.navBtn}
          accessibilityRole="button"
          accessibilityLabel={
            index >= total - 1
              ? lang === "hi"
                ? "पाठ समाप्त पढ़ें"
                : "Finish lesson"
              : lang === "hi"
                ? `अगला कार्ड, ${index + 2} / ${total}`
                : `Next card, ${index + 2} of ${total}`
          }
        >
          <Text style={styles.navText}>{index >= total - 1 ? (lang === "hi" ? "समाप्त" : "Finish") : lang === "hi" ? "आगे" : "Next"}</Text>
          <Ionicons name="chevron-forward" size={20} color={color.saffron} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg },
  body: { padding: space.lg, paddingBottom: 120 },
  topBar: { flexDirection: "row", alignItems: "center", gap: space.sm, paddingHorizontal: space.sm, paddingTop: space.xs },
  exitBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  topSa: { color: color.ink },
  topEn: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", color: color.inkSoft },
  progressRow: { flexDirection: "row", paddingHorizontal: space.lg, paddingVertical: space.xs },
  page: { paddingHorizontal: space.lg, paddingVertical: space.sm },
  pageBody: { paddingBottom: space.xl, gap: space.sm },
  errorTitle: { fontFamily: "Nunito_700Bold", fontWeight: "700", color: color.ink },
  doneKicker: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", color: color.saffron, letterSpacing: 1 },
  doneTitle: { color: color.ink, marginTop: space.xs },
  doneSub: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", color: color.ink, marginTop: space.sm, lineHeight: 24 },
  doneNote: { fontFamily: "Nunito_400Regular", fontWeight: "400", color: color.inkSoft, marginTop: space.sm, lineHeight: 22 },
  doneSources: { fontFamily: "Nunito_400Regular", fontWeight: "400", color: color.inkFaint, marginTop: space.sm, lineHeight: 18 },
  navRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: space.lg,
    paddingBottom: space.md,
    gap: space.sm,
  },
  navBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    minHeight: 48,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    backgroundColor: color.surface,
    ...shadow.card,
  },
  navDisabled: { opacity: 0.55 },
  navText: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.base, color: color.saffron },
  navTextDisabled: { color: color.inkFaint },
});
