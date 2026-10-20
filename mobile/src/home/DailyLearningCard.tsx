// Home's daily practice (owner's pick, 2026-10-20, option P3): two tiles in
// the Daily tiles' own shape (Next lesson, Review), and under them one bar
// back into the verse last read. What each shows comes from dailyPractice.ts,
// in whichever Learn mode the learner chose (Story or Simple).

import { Ionicons } from "@react-native-vector-icons/ionicons";
import type { IoniconsIconName } from "@react-native-vector-icons/ionicons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Skeleton } from "../components/Skeleton";
import { haptics } from "../services/haptics";
import { fill, font, onFill, sanskritText, space } from "../theme";
import { useStoryPractice, type PracticeData } from "./dailyPractice";

type Navigate = (route: string, params?: object) => void;

export default function DailyLearningCard({ navigate }: { navigate: Navigate }) {
  return <PracticeTiles data={useStoryPractice(navigate)} />;
}

function PracticeTiles({ data }: { data: PracticeData }) {
  const { state, lesson, due, reading } = data;
  const lessonLabel =
    state === "ready" && lesson ? `Next lesson: ${lesson.title}. ${lesson.meta}`
      : state === "complete" ? "Course complete. Open Learn"
        : state === "error" ? "Couldn't load your lesson. Open Learn"
          : "Next lesson";
  const reviewLabel = due === null ? "Open reviews" : due > 0 ? `${due} ${due === 1 ? "card" : "cards"} due for review` : "Reviews done for today";
  return (
    <View style={styles.wrap}>
      <View style={styles.pair}>
        <Tile
          tone={fill.sage}
          icon="book-outline"
          label="Next lesson"
          a11y={lessonLabel}
          onPress={state === "ready" && lesson ? lesson.open : data.openLearn}
        >
          {state === "loading" ? (
            <Skeleton height={44} />
          ) : state === "ready" && lesson ? (
            <>
              {!!lesson.titleSa && (
                <Text style={[sanskritText(20), styles.sa]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                  {lesson.titleSa}
                </Text>
              )}
              <Text style={styles.title} numberOfLines={2}>{lesson.title}</Text>
              {!!lesson.meta && <Text style={styles.meta} numberOfLines={2}>{lesson.meta}</Text>}
            </>
          ) : (
            <>
              <Text style={styles.title}>{state === "complete" ? "Course complete" : "Couldn't load"}</Text>
              <Text style={styles.meta}>{state === "complete" ? "Revisit any lesson in Learn" : "Tap to open Learn"}</Text>
            </>
          )}
        </Tile>
        <Tile tone={fill.teal} icon="refresh" label="Review" a11y={reviewLabel} onPress={data.openReview}>
          {due === null ? (
            <Text style={styles.title}>Open reviews</Text>
          ) : due > 0 ? (
            <>
              <Text style={styles.count}>{due}</Text>
              <Text style={styles.title}>{due === 1 ? "card due today" : "cards due today"}</Text>
            </>
          ) : (
            <>
              <Ionicons name="checkmark" size={28} color={onFill.text} />
              <Text style={styles.title}>Nothing due today</Text>
            </>
          )}
        </Tile>
      </View>
      {reading && (
        <Pressable
          onPress={() => {
            haptics.tap();
            reading.open();
          }}
          style={({ pressed }) => [styles.bar, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={reading.label}
        >
          <Ionicons name="bookmark-outline" size={18} color={onFill.gold} />
          <Text style={styles.barText} numberOfLines={1}>{reading.label}</Text>
          <Ionicons name="chevron-forward" size={16} color={onFill.text} />
        </Pressable>
      )}
    </View>
  );
}

function Tile({
  tone,
  icon,
  label,
  a11y,
  onPress,
  children,
}: {
  tone: string;
  icon: IoniconsIconName;
  label: string;
  a11y: string;
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.tile, { backgroundColor: tone }, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={a11y}
    >
      <View style={styles.head}>
        <View style={styles.icon}>
          <Ionicons name={icon} size={14} color={onFill.text} />
        </View>
        <Text style={styles.label}>{label}</Text>
      </View>
      <View style={styles.body}>{children}</View>
    </Pressable>
  );
}

// Matches Home's Daily tiles (styles.dailyTile and friends in Home.tsx).
const styles = StyleSheet.create({
  wrap: { marginBottom: space.md },
  pair: { flexDirection: "row", gap: space.sm },
  tile: { flex: 1, borderRadius: 10, padding: space.md, minHeight: 150 },
  head: { flexDirection: "row", alignItems: "center", gap: 6 },
  icon: { width: 24, height: 24, borderRadius: 5, alignItems: "center", justifyContent: "center", backgroundColor: fill.ink },
  label: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.sm, color: onFill.gold },
  body: { flex: 1, justifyContent: "flex-end", marginTop: space.sm },
  sa: { color: onFill.text },
  title: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: 13, lineHeight: 18, color: onFill.text },
  meta: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: font.sizes.xs, lineHeight: 16, color: onFill.soft, marginTop: 2 },
  count: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 32, lineHeight: 36, color: onFill.text },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 48,
    marginTop: space.sm,
    paddingHorizontal: space.md,
    borderRadius: 10,
    backgroundColor: fill.ink,
  },
  barText: { flex: 1, fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.sm, color: onFill.text },
  pressed: { opacity: 0.9, transform: [{ scale: 0.985 }] },
});
