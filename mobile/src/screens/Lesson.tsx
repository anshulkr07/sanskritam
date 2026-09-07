// Lesson — the learning surface between Path and Challenge (U14-1 / P22).
//
// Flow: Path node (has_lesson) → Lesson → Practice (Challenge). Shows the
// lesson body, 2–3 tappable Vidyut-verified examples (tap → ask-anywhere
// with the word as subject; the learner never types context), and the
// visual area (U14-2: grid | tree | state_machine, rendered from the
// backend's pre-computed visual_data — the derivation engine is never
// called client-side). A "Practice" button routes to the Challenge screen.
//
// Rules honoured: script() on every Devanagari node (§3.2); Skeleton while
// loading + retryable failure state (U10-3), honest "no lesson yet" on 404;
// no verdict/streak/score anywhere on this screen.

import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import React, { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api, type Lesson } from "../api/client";
import { useAsk } from "../ask/AskProvider";
import { Button, EmptyState } from "../components/ui";
import { Skeleton } from "../components/Skeleton";
import VisualGrid, { type GridData } from "../components/lesson/VisualGrid";
import VisualTree, { type TreeData } from "../components/lesson/VisualTree";
import VisualStateMachine, {
  type StateMachineData,
} from "../components/lesson/VisualStateMachine";
import type { RootStackParamList } from "../navigation/types";
import { color, font, radius, script, shadow, space } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Lesson">;

export default function LessonScreen({ navigation, route }: Props) {
  const { featureId } = route.params;
  const { open } = useAsk();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [missing, setMissing] = useState(false);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    setFailed(false);
    setMissing(false);
    api
      .lesson(featureId)
      .then(setLesson)
      .catch((e: { status?: number }) => {
        setLesson(null);
        if (e?.status === 404) setMissing(true);
        else setFailed(true);
      })
      .finally(() => setLoading(false));
  }, [featureId]);

  useEffect(load, [load]);

  // A node with a lesson routes here before the challenge (U14-3); the
  // Practice button continues the same feature filter into Challenge.
  const onPractice = useCallback(() => {
    navigation.navigate("Challenge", { features: [featureId] });
  }, [navigation, featureId]);

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.body}>
        {loading && !lesson ? (
          <>
            <Skeleton style={{ height: 26, width: 200 }} />
            <Skeleton style={{ height: 120, marginTop: space.md }} />
            <Skeleton style={{ height: 80, marginTop: space.sm }} />
          </>
        ) : missing ? (
          <EmptyState
            title="No lesson here yet."
            hint="Practice is still open — the lesson for this unit is being written."
          />
        ) : failed || !lesson ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Couldn't load the lesson.</Text>
            <Text style={styles.errorSub}>Check your connection — your progress is safe.</Text>
            <Button label="Retry" onPress={load} style={{ marginTop: space.md }} />
          </View>
        ) : (
          <>
            <Text style={styles.kicker}>{lesson.unit_id.toUpperCase()} · LEARN</Text>
            <Text style={[styles.titleSa, script("extrabold")]}>{lesson.title_hi}</Text>
            <Text style={styles.titleEn}>{lesson.title_en}</Text>

            {lesson.body.split("\n\n").map((para, i) => (
              <Text key={i} style={styles.para}>
                {para}
              </Text>
            ))}

            {/* The visual area — one renderer per visual_type (U14-2). */}
            {lesson.visual_type === "grid" && (
              <VisualGrid data={lesson.visual_data as GridData} />
            )}
            {lesson.visual_type === "tree" && (
              <VisualTree data={lesson.visual_data as TreeData} />
            )}
            {lesson.visual_type === "state_machine" && (
              <VisualStateMachine data={lesson.visual_data as StateMachineData} />
            )}

            {/* Verified examples — each tapable into ask-anywhere. */}
            {lesson.examples.length > 0 && (
              <View style={styles.examples}>
                <Text style={styles.examplesTitle}>Try these</Text>
                {lesson.examples.map((ex) => (
                  <Pressable
                    key={ex.devanagari}
                    onPress={() => open({ surface: "lesson", subject: ex.devanagari })}
                    style={({ pressed }) => [styles.example, pressed && styles.examplePressed]}
                    accessibilityRole="button"
                    accessibilityLabel={`${ex.devanagari}. ${ex.gloss}. Ask about this form.`}
                  >
                    <Text style={[styles.exampleSa, script("bold")]}>{ex.devanagari}</Text>
                    <Text style={styles.exampleIast}>{ex.iast}</Text>
                    <Text style={styles.exampleGloss}>{ex.gloss}</Text>
                    <Ionicons name="help-circle-outline" size={18} color={color.saffron} />
                  </Pressable>
                ))}
              </View>
            )}

            <Button label="Practice" onPress={onPractice} block style={{ marginTop: space.xl }} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg },
  body: { padding: space.lg, paddingBottom: space.xxl * 2 },
  kicker: {
    fontFamily: "Nunito_800ExtraBold",
    fontWeight: "800",
    fontSize: font.sizes.xs,
    color: color.saffron,
    letterSpacing: 1,
    marginBottom: 4,
  },
  titleSa: { fontSize: font.sizes.xl, color: color.ink },
  titleEn: {
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600",
    fontSize: font.sizes.base,
    color: color.inkSoft,
    marginTop: 2,
    marginBottom: space.md,
  },
  para: {
    fontFamily: "Nunito_400Regular",
    fontWeight: "400",
    fontSize: font.sizes.base,
    color: color.ink,
    lineHeight: 24,
    marginBottom: space.md,
  },
  examples: { marginTop: space.lg },
  examplesTitle: {
    fontFamily: "Nunito_800ExtraBold",
    fontWeight: "800",
    fontSize: font.sizes.base,
    color: color.ink,
    marginBottom: space.sm,
  },
  example: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    padding: space.md,
    marginBottom: space.sm,
    ...shadow.card,
  },
  examplePressed: { transform: [{ translateY: 2 }] },
  exampleSa: { fontSize: font.sizes.lg, color: color.ink, flex: 1 },
  exampleIast: {
    fontFamily: "Nunito_500Medium",
    fontWeight: "500",
    fontSize: font.sizes.sm,
    color: color.inkSoft,
  },
  exampleGloss: {
    fontFamily: "Nunito_400Regular",
    fontWeight: "400",
    fontSize: font.sizes.sm,
    color: color.inkSoft,
    flex: 1,
  },
  errorCard: { backgroundColor: color.surface, borderRadius: radius.lg, padding: space.lg, ...shadow.card },
  errorTitle: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.base, color: color.ink },
  errorSub: {
    fontFamily: "Nunito_400Regular",
    fontWeight: "400",
    fontSize: font.sizes.sm,
    color: color.inkSoft,
    marginTop: 4,
  },
});
