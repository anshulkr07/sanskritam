import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import React, { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { api } from "../api/client";
import { progressStorage, subscribeProgress } from "../services/progressStorage";
import { getLearnV2LastLesson } from "../learnv2/progress";
import { TRAIL, stageStops } from "../trail/course";
import { loadTrailCardDoneMap } from "../trail/progress";
import { color, fill, font, onFill, radius, space } from "../theme";

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
      const [raw, last, reading] = await Promise.all([
        progressStorage.getItem("shabd.learning.goal"), getLearnV2LastLesson(),
        progressStorage.getItem("shabd.read.resume"),
      ]);
      const done = await loadTrailCardDoneMap(last ? [last] : []);
      if (!alive) return;
      setGoal(GOALS.some(g => g.id === raw) ? raw as Goal : null);
      setLessonId(last && !done[last] ? last : CARD_LESSONS.find(s => !done[s.lesson.cards])?.lesson.cards);
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
    <View style={styles.heading}>
      <View style={styles.icon}><Ionicons name="flash-outline" size={17} color={onFill.text} /></View>
      <View style={styles.headingText}>
        <Text style={styles.title}>Your daily practice</Text>
        <Text style={styles.subtitle}>{goal ? `${GOALS.find(g => g.id === goal)?.label} · a little every day` : "Speak, read or recite"}</Text>
      </View>
      {!!goal && <Pressable onPress={() => setChoosing(v => !v)} accessibilityRole="button" accessibilityLabel="Change learning goal" style={styles.edit}>
        <Text style={styles.editText}>{choosing ? "Close" : "Change"}</Text>
      </Pressable>}
    </View>
    {!goal || choosing ? <View style={styles.body}>
      <Text style={styles.copy}>What would you like to do first?</Text>
      <View style={styles.choices}>
        {GOALS.map(g => <Pressable key={g.id} onPress={() => void choose(g.id)} accessibilityRole="button"
          accessibilityState={{ selected: goal === g.id }} accessibilityLabel={g.label}
          style={[styles.choice, goal === g.id && styles.choiceOn]}>
          <Text style={styles.choiceText}>{g.label}</Text>
        </Pressable>)}
      </View>
    </View> : <View style={styles.body}>
      <Pressable onPress={continueLearning} accessibilityRole="button" accessibilityLabel="Continue your learning" style={styles.primary}>
        <Text style={styles.primaryText}>{goal === "read" ? resume ? "Continue reading" : "Choose a text" : goal === "recite" ? "Practise a verse" : "Continue learning"}</Text>
        <Ionicons name="arrow-forward" size={16} color={onFill.text} />
      </Pressable>
      <View style={styles.links}>
        <Pressable onPress={() => navigate("DailyReview")} accessibilityRole="button" accessibilityLabel={due === null ? "Open reviews" : `${due} reviews due`} style={styles.link}>
          <Text style={styles.linkText}>{due === null ? "Review" : due > 0 ? `${due} due for review` : "Reviews complete"}</Text>
        </Pressable>
        <Pressable onPress={() => navigate("Challenge")} accessibilityRole="button" accessibilityLabel="Start a short practice session" style={styles.link}><Text style={styles.linkText}>Short practice</Text></Pressable>
        <Pressable onPress={() => navigate("Friends")} accessibilityRole="button" accessibilityLabel="Practise with a friend" style={styles.link}><Text style={styles.linkText}>With a friend</Text></Pressable>
        <Pressable onPress={() => navigate("OfflineLibrary")} accessibilityRole="button" accessibilityLabel="Open saved reading offline" style={styles.link}><Text style={styles.linkText}>Saved reading</Text></Pressable>
      </View>
    </View>}
  </View>;
}
const styles = StyleSheet.create({
  card: { borderRadius: radius.sm, overflow: "hidden", backgroundColor: fill.sage, marginBottom: space.sm },
  heading: { flexDirection: "row", alignItems: "center", gap: space.sm, paddingHorizontal: space.md, paddingVertical: space.sm, borderBottomWidth: 1, borderColor: onFill.faint },
  icon: { width: 32, height: 32, borderRadius: 6, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,248,238,0.14)" },
  headingText: { flex: 1 },
  title: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.base, color: onFill.text },
  subtitle: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: font.sizes.xs, color: onFill.soft, marginTop: 1 },
  edit: { minWidth: 44, minHeight: 44, justifyContent: "center", alignItems: "center" },
  editText: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.sm, color: onFill.text },
  body: { padding: space.md },
  copy: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: font.sizes.sm, color: onFill.soft },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: space.xs, marginTop: space.sm },
  choice: { minHeight: 40, justifyContent: "center", borderRadius: 8, borderWidth: 1, borderColor: "rgba(255,248,238,0.55)", paddingHorizontal: space.sm },
  choiceOn: { backgroundColor: "rgba(255,248,238,0.14)", borderColor: onFill.text },
  choiceText: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", color: onFill.text, fontSize: font.sizes.sm },
  primary: { minHeight: 46, borderRadius: 8, backgroundColor: color.saffronBtn, flexDirection: "row", gap: space.xs, justifyContent: "center", alignItems: "center", paddingHorizontal: space.md },
  primaryText: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", color: onFill.text, fontSize: font.sizes.base },
  links: { flexDirection: "row", flexWrap: "wrap", gap: space.md, marginTop: space.xs },
  link: { minHeight: 40, justifyContent: "center" },
  linkText: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.sm, color: onFill.soft, textDecorationLine: "underline" },
});
