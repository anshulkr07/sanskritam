import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { api } from "../api/client";
import { progressStorage, subscribeProgress } from "../services/progressStorage";
import { getLearnV2LastLesson, loadLearnV2DoneMap } from "../learnv2/progress";
import { TRAIL, stageStops } from "../trail/course";
import { color } from "../theme";

type Goal = "speak" | "read" | "recite";
const GOALS: { id: Goal; label: string }[] = [
  { id: "speak", label: "Speak Sanskrit" }, { id: "read", label: "Read texts" }, { id: "recite", label: "Recite" },
];
const CARD_LESSONS = TRAIL.flatMap(s => stageStops(s)).filter(s => s.lesson.cards);

export default function DailyLearningCard({ navigate }: { navigate: (route: string, params?: object) => void }) {
  const [goal, setGoal] = useState<Goal | null>(null);
  const [choosing, setChoosing] = useState(false);
  const [lessonId, setLessonId] = useState<string>();
  const [due, setDue] = useState<number | null>(null);
  const [resume, setResume] = useState<{ bookKey: string; chapter?: string; index?: number } | null>(null);
  useFocusEffect(useCallback(() => {
    let alive = true;
    const load = async () => {
      const [raw, last, done, reading] = await Promise.all([
        progressStorage.getItem("shabd.learning.goal"), getLearnV2LastLesson(),
        loadLearnV2DoneMap(CARD_LESSONS.map(s => s.lesson.cards!)), progressStorage.getItem("shabd.read.resume"),
      ]);
      if (!alive) return;
      setGoal(GOALS.some(g => g.id === raw) ? raw as Goal : null);
      setLessonId(last && !done[last] ? last : CARD_LESSONS.find(s => !done[s.lesson.cards!])?.lesson.cards);
      try { const r = reading ? JSON.parse(reading) : null; setResume(typeof r?.bookKey === "string" ? r : null); }
      catch { setResume(null); }
    };
    void load();
    const unsubscribe = subscribeProgress(() => { void load(); });
    api.reviewDue(1).then(r => { if (alive) setDue(r.due_count); }).catch(() => { if (alive) setDue(null); });
    return () => { alive = false; unsubscribe(); };
  }, []));
  const choose = async (next: Goal) => {
    setGoal(next); setChoosing(false);
    await progressStorage.setItem("shabd.learning.goal", next);
  };
  const continueLearning = () => {
    if (goal === "read") navigate(resume ? "Book" : "Read", resume ?? undefined);
    else if (goal === "recite") navigate("RecitePicker");
    else if (lessonId) navigate("LearnV2Lesson", { lessonId });
    else navigate("Learn");
  };
  return <View style={styles.card}>
    <View style={styles.row}>
      <Text style={styles.title}>Your daily practice</Text>
      {goal && <Pressable onPress={() => setChoosing(v => !v)} accessibilityRole="button" accessibilityLabel="Change learning goal" style={styles.change}><Text style={styles.small}>Change goal</Text></Pressable>}
    </View>
    {!goal || choosing ? <View style={styles.choices}>
      <Text style={styles.text}>What would you like to do first?</Text>
      {GOALS.map(g => <Pressable key={g.id} onPress={() => void choose(g.id)} accessibilityRole="button"
        accessibilityState={{ selected: goal === g.id }} accessibilityLabel={g.label} style={styles.choice}>
        <Text style={styles.choiceText}>{g.label}</Text>
      </Pressable>)}
    </View> : <>
      <Text style={styles.text}>{GOALS.find(g => g.id === goal)?.label} · a little every day</Text>
      <Pressable onPress={continueLearning} accessibilityRole="button" accessibilityLabel="Continue your learning" style={styles.primary}>
        <Text style={styles.choiceText}>{goal === "read" ? resume ? "Continue reading" : "Choose a text" : goal === "recite" ? "Practise a verse" : "Continue learning"}</Text>
      </Pressable>
      <View style={styles.links}>
        <Pressable onPress={() => navigate("DailyReview")} accessibilityRole="button" accessibilityLabel={due === null ? "Open reviews" : `${due} reviews due`} style={styles.link}>
          <Text style={styles.text}>{due === null ? "Review" : due > 0 ? `${due} due for review` : "Reviews complete"}</Text>
        </Pressable>
        <Pressable onPress={() => navigate("Challenge")} accessibilityRole="button" accessibilityLabel="Start a short practice session" style={styles.link}><Text style={styles.text}>Short practice</Text></Pressable>
        <Pressable onPress={() => navigate("Friends")} accessibilityRole="button" accessibilityLabel="Practise with a friend" style={styles.link}><Text style={styles.text}>With a friend</Text></Pressable>
        <Pressable onPress={() => navigate("OfflineLibrary")} accessibilityRole="button" accessibilityLabel="Open saved reading offline" style={styles.link}><Text style={styles.text}>Saved reading</Text></Pressable>
      </View>
    </>}
  </View>;
}
const styles = StyleSheet.create({
  card: { backgroundColor: "#293C35", padding: 16, borderRadius: 20, gap: 12 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" },
  title: { fontFamily: "Nunito_800ExtraBold", fontSize: 20, color: "#FFF8EE" },
  text: { fontFamily: "Nunito_600SemiBold", fontSize: 14, color: "#F2EADB" },
  small: { fontFamily: "Nunito_700Bold", fontSize: 12, color: "#F2EADB" },
  change: { minHeight: 44, justifyContent: "center" },
  primary: { minHeight: 48, borderRadius: 12, backgroundColor: color.saffronBtn, justifyContent: "center", alignItems: "center", padding: 12 },
  choice: { minHeight: 48, borderRadius: 10, borderWidth: 1, borderColor: "#B8C4B9", padding: 12 },
  choiceText: { fontFamily: "Nunito_800ExtraBold", color: "#FFF8EE", fontSize: 15 },
  choices: { gap: 10 }, links: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  link: { minHeight: 44, justifyContent: "center" },
});
