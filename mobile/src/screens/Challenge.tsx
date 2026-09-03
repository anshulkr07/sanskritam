// Challenge — the Duolingo-style learning loop, now a real *session* of
// SESSION_LENGTH exercises rather than an endless single-question quiz.
// Alternates word-bank (tap tiles — no Devanagari keyboard needed) with
// typed answers, grades through the same /attempts endpoint either way, and
// ends on a completion screen. Verdicts: correct (celebrate + advance),
// off_by_one (near — retry the SAME exercise), unsure (never wrong, advance),
// incorrect (show target, advance).

import { Ionicons } from "@react-native-vector-icons/ionicons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useCallback, useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api, type AttemptResponse, type Challenge } from "../api/client";
import TutorFull from "../components/TutorFull";
import VerdictSheet from "../components/VerdictSheet";
import WordBank from "../components/WordBank";
import SessionComplete from "../screens/SessionComplete";
import { haptics } from "../services/haptics";
import { speak } from "../services/speech";
import { Button, Card, ProgressBar } from "../components/ui";
import type { RootStackParamList } from "../navigation/types";
import { color, font, radius, script, shadow, space } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Challenge">;

const SESSION_LENGTH = 8;
type ExerciseMode = "wordbank" | "typed";

function modeForIndex(i: number): ExerciseMode {
  return i % 2 === 0 ? "wordbank" : "typed";
}

export default function ChallengeScreen({ navigation, route }: Props) {
  const [completed, setCompleted] = useState(0); // resolved exercises (excludes off_by_one retries)
  const [correctCount, setCorrectCount] = useState(0);
  const [sessionDone, setSessionDone] = useState(false);

  // U8-0: a Path launch narrows the session to the unit's feature bands.
  // When set, serve only challenges carrying at least one of those features
  // (the adaptive /challenges/next path otherwise ignores the filter).
  const filterFeatures = route.params?.features ?? [];

  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [corpus, setCorpus] = useState<string[]>([]);
  const [filteredPool, setFilteredPool] = useState<Challenge[] | null>(filterFeatures.length ? [] : null);
  const [loading, setLoading] = useState(true);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<AttemptResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [exerciseKey, setExerciseKey] = useState(0); // bump to reshuffle WordBank

  // Distractor pool for the word bank — every other target sentence in this
  // register, fetched once. A retry/failure just leaves the pool empty and
  // the word bank falls back to target-only tiles.
  useEffect(() => {
    api
      .listChallenges("laukika")
      .then((list) => {
        setCorpus(list.map((c) => c.target_sanskrit));
        if (filterFeatures.length) {
          setFilteredPool(
            list.filter((c) => (c.features ?? []).some((f) => filterFeatures.includes(f))),
          );
        }
      })
      .catch(() => setCorpus([]));
  }, []);

  const loadNext = useCallback(async () => {
    setLoading(true);
    setResult(null);
    setAnswer("");
    setExerciseKey((k) => k + 1);
    try {
      // U8-0: when a feature filter is active, serve from the narrowed pool
      // rather than the global adaptive pick, so a Path unit actually teaches
      // its band. Fall back to the adaptive pick if the pool is empty.
      if (filteredPool && filteredPool.length > 0) {
        const idx = (completed % filteredPool.length + filterFeatures.length) % filteredPool.length;
        setChallenge(filteredPool[idx]);
      } else {
        const c = await api.nextChallenge("laukika", "text");
        setChallenge(c);
      }
    } catch {
      setChallenge(null);
    } finally {
      setLoading(false);
    }
  }, [filteredPool, completed, filterFeatures.length]);

  useEffect(() => {
    loadNext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitAnswer = useCallback(
    async (text: string) => {
      if (!challenge || !text.trim() || busy) return;
      setBusy(true);
      try {
        const res = await api.submitAttempt(challenge.id, text.trim());
        setResult(res);
        if (res.verdict === "correct") setCorrectCount((c) => c + 1);
      } catch {
        setResult(null);
      } finally {
        setBusy(false);
      }
    },
    [challenge, busy],
  );

  const playPrompt = useCallback(async () => {
    if (!challenge) return;
    haptics.tap();
    try {
      await speak(challenge.prompt_l1, "hi");
    } catch {
      /* audio unavailable */
    }
  }, [challenge]);

  const advance = useCallback(() => {
    if (result?.verdict === "off_by_one") {
      // "So close" — retry the same exercise with a reshuffled word bank.
      setResult(null);
      setAnswer("");
      setExerciseKey((k) => k + 1);
      return;
    }
    const next = completed + 1;
    if (next >= SESSION_LENGTH) {
      setCompleted(next);
      setSessionDone(true);
      return;
    }
    setCompleted(next);
    loadNext();
  }, [result, completed, loadNext]);

  // ── Session complete ──────────────────────────────────────────────────
  if (sessionDone) {
    const xp = correctCount * 10 + SESSION_LENGTH * 2;
    // Navigate to SessionComplete screen
    return (
      <SessionComplete
        correctCount={correctCount}
        totalCount={SESSION_LENGTH}
        xpEarned={xp}
        streakDays={0}
        onOneMore={() => {
          setCompleted(0);
          setCorrectCount(0);
          setSessionDone(false);
          loadNext();
        }}
        onDone={() => navigation.goBack()}
      />
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}><Text style={styles.loading}>Loading a challenge…</Text></View>
      </SafeAreaView>
    );
  }

  if (!challenge) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.loading}>No challenges right now.</Text>
          <Button label="Try again" onPress={loadNext} style={{ alignSelf: "center", marginTop: space.md }} />
        </View>
      </SafeAreaView>
    );
  }

  const answered = !!result;
  const mode = modeForIndex(completed);
  const continueLabel =
    result?.verdict === "off_by_one" ? "Try again" : result?.verdict === "correct" ? "Continue" : "Next";

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {/* Session progress */}
        <View style={styles.progressRow}>
          <ProgressBar progress={completed / SESSION_LENGTH} style={{ flex: 1 }} />
          <Text style={styles.progressLabel} accessibilityLabel={`Exercise ${completed + 1} of ${SESSION_LENGTH}`}>{completed + 1}/{SESSION_LENGTH}</Text>
        </View>

        {/* Prompt */}
        <Card>
          <Text onPress={playPrompt} style={styles.chip} suppressHighlighting>
            <Ionicons name="headset" size={13} color={color.saffron} />  Tap to hear
          </Text>
          <Text style={[styles.prompt, script("extrabold")]}>{challenge.prompt_l1}</Text>
          <Text style={styles.promptLang}>[ {challenge.prompt_lang} ]</Text>
        </Card>

        {mode === "wordbank" ? (
          <View style={styles.exerciseBlock}>
            <Text style={styles.tip}>Tap the words in order.</Text>
            <WordBank
              key={exerciseKey}
              target={challenge.target_sanskrit}
              corpus={corpus}
              disabled={answered || busy}
              onSubmit={submitAnswer}
            />
          </View>
        ) : (
          <View style={styles.exerciseBlock}>
            <Text style={styles.tip}>
              Type the Sanskrit in {challenge.prompt_lang === "hi" ? "(Devanagari)" : "Devanagari or IAST"}.
            </Text>
            <Card muted={answered}>
              <Text style={styles.inputLabel}>Your answer</Text>
              <TextInput
                value={answer}
                onChangeText={setAnswer}
                editable={!answered && !busy}
                placeholder="e.g. रामः फलम् खादति"
                placeholderTextColor={color.inkFaint}
                style={[styles.input, script("semibold")]}
                autoCorrect={false}
                multiline
              />
              {!answered && (
                <Button
                  label="Check"
                  onPress={() => submitAnswer(answer)}
                  disabled={!answer.trim() || busy}
                  loading={busy}
                  style={{ marginTop: space.md }}
                />
              )}
            </Card>
          </View>
        )}
      </ScrollView>

      <VerdictSheet
        visible={answered}
        verdict={result?.verdict ?? null}
        abstained={result?.abstained}
        diagnosis={result?.diagnosis}
        targetSanskrit={challenge.target_sanskrit}
        targetIast={challenge.target_iast}
        continueLabel={continueLabel}
        onContinue={advance}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: space.lg },
  loading: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: font.sizes.md, color: color.inkSoft },
  body: { padding: space.lg, paddingBottom: space.xxl * 2 },
  progressRow: { flexDirection: "row", alignItems: "center", gap: space.sm, marginBottom: space.lg },
  progressLabel: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.sm, color: color.inkSoft, minWidth: 36, textAlign: "right" },
  chip: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.sm, color: color.saffron, marginBottom: space.sm },
  prompt: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.lg, color: color.ink, lineHeight: 30 },
  promptLang: { fontFamily: "Nunito_500Medium", fontWeight: "500", fontSize: font.sizes.sm, color: color.inkFaint, marginTop: 4 },
  exerciseBlock: { marginTop: space.lg },
  tip: { fontFamily: "Nunito_400Regular", fontWeight: "400", fontSize: font.sizes.sm, color: color.inkSoft, marginBottom: space.sm },
  inputLabel: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.sm, color: color.inkSoft, marginBottom: space.sm },
  input: {
    borderWidth: 2,
    borderColor: color.border,
    borderRadius: radius.md,
    padding: space.md,
    fontSize: 20,
    color: color.ink,
    minHeight: 64,
    textAlignVertical: "top",
    backgroundColor: color.surface,
  },
  completeWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: space.xl },
  completeTitle: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.xl, color: color.ink, marginTop: space.lg },
  completeSub: { fontFamily: "Nunito_500Medium", fontWeight: "500", fontSize: font.sizes.base, color: color.inkSoft, marginTop: 4 },
  completeStatRow: { flexDirection: "row", gap: space.xl, marginTop: space.xl, backgroundColor: color.surface, borderRadius: radius.lg, padding: space.lg, ...shadow.card },
  completeStat: { alignItems: "center" },
  completeStatValue: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.xxl, color: color.ink },
  completeStatLabel: { fontFamily: "Nunito_500Medium", fontWeight: "500", fontSize: font.sizes.xs, color: color.inkSoft, marginTop: 2 },
});
