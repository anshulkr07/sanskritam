import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, type LessonStep, type StepAttempt } from "../api/client";
import StepRenderer from "../components/steps/StepRenderer";
import VerdictSheet from "../components/VerdictSheet";
import { Button } from "../components/ui";
import { invalidateCache } from "../services/apiCache";
import { color } from "../theme";

type Item = { key: string; lessonId: string; step: LessonStep };
export default function DailyReview({ navigation }: { navigation: { goBack(): void } }) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState<StepAttempt | null>(null);
  const [at, setAt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    let alive = true;
    setLoading(true); setError("");
    void (async () => {
      try {
        const due = await api.reviewDue(20);
        const parsed = due.items.filter(i => i.kind === "step").map(i => {
          const match = /^step:(.+):(\d+)$/.exec(i.item_key);
          return match ? { key: i.item_key, lessonId: match[1], rank: Number(match[2]) } : null;
        }).filter((i): i is NonNullable<typeof i> => !!i);
        const lessons = new Map<string, LessonStep[]>();
        for (const id of new Set(parsed.map(i => i.lessonId))) lessons.set(id, await api.lessonSteps(id));
        const resolved = parsed.flatMap(i => {
          const step = lessons.get(i.lessonId)?.find(s => s.rank === i.rank);
          return step ? [{ key: i.key, lessonId: i.lessonId, step }] : [];
        });
        if (alive) { setItems(resolved); setAt(0); }
      } catch { if (alive) setError("Couldn't load reviews. Check your connection and retry."); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [nonce]);
  const item = items[at];
  const submit = async (answer: Record<string, unknown>) => {
    if (!item || busy || attempt) return;
    setBusy(true); setError("");
    try { setAttempt(await api.attemptStep(item.lessonId, item.step.rank, answer)); invalidateCache("units"); invalidateCache("review"); }
    catch { setError("Couldn't save that attempt. Your answer is still here. Retry."); }
    finally { setBusy(false); }
  };
  return <SafeAreaView style={styles.safe} edges={["bottom"]}>
    <ScrollView contentContainerStyle={styles.body}>
      <Text style={styles.title}>{loading ? "Loading reviews…" : !item ? "You're ready for today" : `Review ${at + 1} of ${items.length}`}</Text>
      {!!error && <><Text accessibilityRole="alert" style={styles.text}>{error}</Text>{!item && <Button label="Retry" onPress={() => setNonce(n => n + 1)} />}</>}
      {!loading && item && <StepRenderer key={item.key} step={item.step} disabled={busy || !!attempt} onSubmit={answer => void submit(answer)} />}
      {!loading && !item && !error && <Text style={styles.text}>{items.length ? "Your reviewed items have been scheduled again." : "No lesson reviews are due. Come back after your next practice."}</Text>}
      <Button label="Back to learning" onPress={() => navigation.goBack()} />
    </ScrollView>
    <VerdictSheet visible={!!attempt} verdict={attempt?.verdict ?? null} abstained={attempt?.abstained} continueLabel="Continue"
      onContinue={() => { setAttempt(null); setAt(n => n + 1); }} />
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg }, body: { padding: 16, paddingBottom: 120, gap: 20 },
  title: { fontFamily: "Nunito_800ExtraBold", fontSize: 24, color: color.ink },
  text: { fontFamily: "Nunito_600SemiBold", fontSize: 16, color: color.ink },
});
