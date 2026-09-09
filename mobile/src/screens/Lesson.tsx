// Lesson — the step player (U15-1 / P23).
//
// Rewrite: no longer a ScrollView of prose. A sequence — one step at a time,
// a progress indicator, a check, a verdict, next. The loop shape reuses
// Challenge.tsx's vocabulary: the ProgressBar + "n/N", the VerdictSheet
// slide-up, haptics.correct/near/incorrect, announceForAccessibility on every
// verdict (inside VerdictSheet). Do not invent a second one.
//
// The `body` field survives as the lesson's summary — a collapsible card at
// the top. It is no longer the teaching; the steps do the teaching.
//
// Entry: { lessonId } (new, from Path units) or { featureId } (legacy —
// resolves to the lesson first). Completion routes to Practice (Challenge)
// with the lesson's full feature span.

import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api, type Lesson, type LessonStep, type StepAttempt, type VideoItem } from "../api/client";
import { useAsk } from "../ask/AskProvider";
import { Button, ProgressBar } from "../components/ui";
import { Skeleton } from "../components/Skeleton";
import StepRenderer from "../components/steps/StepRenderer";
import VerdictSheet from "../components/VerdictSheet";
import VideoSection from "../components/VideoSection";
import type { RootStackParamList } from "../navigation/types";
import { color, font, radius, script, shadow, space } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Lesson">;

export default function LessonScreen({ navigation, route }: Props) {
  const { featureId, lessonId: lessonIdParam } = route.params;
  const { open, setContext, setSuppressed } = useAsk();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [lessonId, setLessonId] = useState<string | null>(lessonIdParam ?? null);
  const [steps, setSteps] = useState<LessonStep[]>([]);
  // P24: the lesson's watch-first videos. Enhancement only — a failed fetch
  // hides the section, never the lesson (§5.5: render correctly with video
  // missing). Watching writes nothing (no attempt endpoint by design).
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [index, setIndex] = useState(0);
  const [missing, setMissing] = useState(false);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<StepAttempt | null>(null);
  const [done, setDone] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setFailed(false);
    setMissing(false);
    setResult(null);
    setDone(false);
    setIndex(0);
    (async () => {
      try {
        let lid = lessonIdParam ?? null;
        let meta: Lesson | null = null;
        if (!lid) {
          try {
            meta = await api.lesson(featureId);
            lid = meta.feature_id ? (meta as unknown as { id?: string }).id ?? null : null;
          } catch (e: unknown) {
            if ((e as { status?: number })?.status === 404) setMissing(true);
            else setFailed(true);
            return;
          }
        }
        if (!lid) {
          setMissing(true);
          return;
        }
        setLessonId(lid);
        if (!meta) {
          // Meta for the header: find this lesson in the list.
          const all = await api.lessons();
          const found = all.find((l) => l.id === lid);
          if (found) {
            meta = {
              feature_id: found.feature_id,
              unit_id: found.unit_id,
              rank: found.rank,
              title_en: found.title_en,
              title_hi: found.title_hi,
              body: "",
              examples: [],
              visual_type: "none",
              visual_data: {},
              audio_url: "",
              register: found.register,
            };
          }
        }
        setLesson(meta);
        const fetched = await api.lessonSteps(lid);
        if (!fetched.length) setMissing(true);
        else setSteps(fetched);
        // Videos resolve through the lesson's unit; failure hides the
        // section rather than failing the lesson.
        try {
          setVideos(await api.lessonVideos(lid));
        } catch {
          setVideos([]);
        }
      } catch {
        setFailed(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [featureId, lessonIdParam]);

  useEffect(load, [load]);

  // U11: the ask button asks about the lesson while no verdict is showing.
  useEffect(() => {
    setContext({ surface: "lesson", subject: lesson?.title_hi ?? "" });
  }, [lesson?.title_hi, setContext]);
  useEffect(() => {
    setSuppressed(result !== null);
  }, [result, setSuppressed]);

  const current = steps[index] ?? null;
  const answered = result !== null;

  const submit = useCallback(
    async (answer: Record<string, unknown>) => {
      if (!lessonId || !current || busy || answered) return;
      setBusy(true);
      try {
        const res = await api.attemptStep(lessonId, current.rank, answer);
        setResult(res);
      } catch {
        // A network failure is a system failure, never a verdict — stay on
        // the step with inputs intact so the learner can retry.
        setResult(null);
      } finally {
        setBusy(false);
      }
    },
    [lessonId, current, busy, answered],
  );

  const advance = useCallback(() => {
    setResult(null);
    if (index + 1 >= steps.length) {
      setDone(true);
      return;
    }
    setIndex((i) => i + 1);
  }, [index, steps.length]);

  const onPractice = useCallback(() => {
    // The lesson's full feature span continues into Challenge (U14-3).
    // Legacy entry ({ featureId } with no loaded lesson) falls back to the
    // route param so Practice stays open.
    const feats = lesson?.feature_id ? [lesson.feature_id] : featureId ? [featureId] : undefined;
    navigation.navigate("Challenge", { features: feats });
  }, [navigation, lesson?.feature_id, featureId]);

  const askAbout = useCallback(() => {
    open({ surface: "lesson", subject: lesson?.title_hi ?? featureId });
  }, [open, lesson?.title_hi, featureId]);

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {loading && !steps.length ? (
          <>
            <Skeleton style={{ height: 26, width: 200 }} />
            <Skeleton style={{ height: 120, marginTop: space.md }} />
            <Skeleton style={{ height: 80, marginTop: space.sm }} />
          </>
        ) : missing ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>No lesson here yet.</Text>
            <Text style={styles.errorSub}>Practice is still open — the lesson for this unit is being written.</Text>
            <Button label="Practice anyway" onPress={onPractice} style={{ marginTop: space.md }} />
          </View>
        ) : failed || !current ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Couldn't load the lesson.</Text>
            <Text style={styles.errorSub}>Check your connection — your progress is safe.</Text>
            <Button label="Retry" onPress={load} style={{ marginTop: space.md }} />
          </View>
        ) : done ? (
          <View style={styles.doneWrap}>
            <Text style={styles.doneTitle}>Lesson complete.</Text>
            <Text style={styles.doneSub}>
              {steps.length} steps · your reviews are scheduled.
            </Text>
            <Button label="Practice" onPress={onPractice} block style={{ marginTop: space.lg }} />
          </View>
        ) : (
          <>
            <Text style={styles.kicker}>{lesson?.unit_id.toUpperCase() ?? ""} · LEARN</Text>
            <Text style={[styles.titleSa, script("extrabold")]}>{lesson?.title_hi ?? ""}</Text>
            {!!lesson?.title_en && <Text style={styles.titleEn}>{lesson.title_en}</Text>}

            {/* Session progress — Challenge's vocabulary. */}
            <View style={styles.progressRow}>
              <ProgressBar progress={index / steps.length} style={{ flex: 1 }} />
              <Text
                style={styles.progressLabel}
                accessibilityLabel={`Step ${index + 1} of ${steps.length}`}
              >
                {index + 1}/{steps.length}
              </Text>
            </View>

            {/* P24: watch-first videos sit above the summary. */}
            {videos.length > 0 && <VideoSection videos={videos} />}

            {/* The body survives as the summary — not the teaching. */}
            {!!lesson?.body && (
              <Pressable
                onPress={() => setSummaryOpen((s) => !s)}
                style={styles.summaryToggle}
                accessibilityRole="button"
                accessibilityState={{ expanded: summaryOpen }}
                accessibilityLabel={summaryOpen ? "Hide lesson summary" : "Show lesson summary"}
              >
                <Text style={styles.summaryToggleText}>
                  {summaryOpen ? "Hide the summary" : "What is this lesson about?"}
                </Text>
              </Pressable>
            )}
            {!!lesson?.body && summaryOpen && (
              <View style={styles.summaryCard}>
                {lesson.body.split("\n\n").map((para, i) => (
                  <Text key={i} style={styles.para}>
                    {para}
                  </Text>
                ))}
              </View>
            )}

            {/* One step at a time. */}
            <View style={styles.stepWrap} key={`${lessonId}-${current.rank}`}>
              <StepRenderer step={current} disabled={answered || busy} onSubmit={submit} />
            </View>

            <Pressable
              onPress={askAbout}
              style={styles.askRow}
              accessibilityRole="button"
              accessibilityLabel="Ask the guru about this lesson"
            >
              <Text style={styles.askText}>Confused? Ask the guru about this step.</Text>
            </Pressable>
          </>
        )}
      </ScrollView>

      <VerdictSheet
        visible={answered}
        verdict={result?.verdict ?? null}
        abstained={result?.abstained}
        continueLabel={index + 1 >= steps.length ? "Finish" : "Next"}
        onContinue={advance}
      />
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
    marginBottom: space.sm,
  },
  progressRow: { flexDirection: "row", alignItems: "center", gap: space.sm, marginVertical: space.md },
  progressLabel: {
    fontFamily: "Nunito_700Bold",
    fontWeight: "700",
    fontSize: font.sizes.sm,
    color: color.inkSoft,
    minWidth: 36,
    textAlign: "right",
  },
  summaryToggle: { minHeight: 44, justifyContent: "center", marginBottom: space.xs },
  summaryToggleText: {
    fontFamily: "Nunito_700Bold",
    fontWeight: "700",
    fontSize: font.sizes.sm,
    color: color.saffron,
  },
  summaryCard: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    padding: space.md,
    marginBottom: space.md,
    ...shadow.card,
  },
  para: {
    fontFamily: "Nunito_400Regular",
    fontWeight: "400",
    fontSize: font.sizes.base,
    color: color.ink,
    lineHeight: 24,
    marginBottom: space.sm,
  },
  stepWrap: { marginTop: space.sm },
  askRow: { minHeight: 44, justifyContent: "center", marginTop: space.md },
  askText: {
    fontFamily: "Nunito_500Medium",
    fontWeight: "500",
    fontSize: font.sizes.sm,
    color: color.inkSoft,
  },
  doneWrap: { alignItems: "center", paddingVertical: space.xl },
  doneTitle: {
    fontFamily: "Nunito_800ExtraBold",
    fontWeight: "800",
    fontSize: font.sizes.xl,
    color: color.ink,
  },
  doneSub: {
    fontFamily: "Nunito_500Medium",
    fontWeight: "500",
    fontSize: font.sizes.base,
    color: color.inkSoft,
    marginTop: 4,
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
