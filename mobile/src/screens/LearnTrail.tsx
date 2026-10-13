// Learn — one trail (owner-approved 2026-10-13). Replaces the Course /
// Reference / Practice hub: a stage switcher, the stage's trail (map, or a
// list at large text sizes), a sheet per stop, and a Library one tap away.
// Structure: src/trail/course.ts; progress: src/trail/progress.ts.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api, type LessonSummary } from "../api/client";
import { useGrammarProgress, useGuideLang } from "../hooks/useGuide";
import { useQuery } from "../hooks/useQuery";
import { useTypeScale } from "../hooks/useTypeScale";
import { loadLearnV2DoneMap, setLearnV2LastLesson } from "../learnv2/progress";
import type { TabScreenProps } from "../navigation/types";
import { fetchGuideIndex } from "../services/grammarGuide";
import { haptics } from "../services/haptics";
import { TRAIL, stageStops, type TrailStop, type TrailTool, type TrailUnit } from "../trail/course";
import { loadStageId, loadVisited, markVisited, saveStageId, stageDoneCount, stageStatuses, type TrailFacts } from "../trail/progress";
import { LessonSheet, PracticeSheet, StageSheet } from "../trail/Sheets";
import TrailList from "../trail/TrailList";
import TrailMap from "../trail/TrailMap";
import { T, ui } from "../trail/theme";
import { IconButton, LangSwitch, Medallion } from "../trail/ui";
import { dayStreak, localToday } from "../utils/streak";

const CARD_IDS = TRAIL.flatMap((s) => s.units.flatMap((u) => u.lessons.flatMap((l) => (l.cards ? [l.cards] : []))));

export default function LearnTrailScreen({ navigation }: TabScreenProps<"Learn">) {
  const { lang, setLang } = useGuideLang();
  const { sized, textSize } = useTypeScale();
  const { width } = useWindowDimensions();
  const { read } = useGrammarProgress();
  const guide = useQuery("guide-index", fetchGuideIndex, { ttlMs: 30 * 60_000 });
  const spine = useQuery("path-spine", api.pathSpine, { refetchOnFocus: true });
  const units = useQuery("units", api.units, { refetchOnFocus: true });
  const history = useQuery("progress-history-35", () => api.progressHistory(35), { refetchOnFocus: true });

  const [stageId, setStageId] = useState<string>("s1");
  const [cardsDone, setCardsDone] = useState<Record<string, boolean>>({});
  const [visited, setVisited] = useState<Set<string>>(new Set());
  const [openStop, setOpenStop] = useState<TrailStop | null>(null);
  const [openPractice, setOpenPractice] = useState<TrailUnit | null>(null);
  const [stagesOpen, setStagesOpen] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const scrolledFor = useRef<string | null>(null);
  const firstLoad = useRef(true);

  useFocusEffect(useCallback(() => {
    let alive = true;
    Promise.all([loadLearnV2DoneMap(CARD_IDS), loadVisited(), firstLoad.current ? loadStageId() : Promise.resolve(null)])
      .then(([done, seen, saved]) => {
        if (!alive) return;
        setCardsDone(done);
        setVisited(seen);
        if (firstLoad.current) {
          firstLoad.current = false;
          if (saved && TRAIL.some((s) => s.id === saved)) setStageId(saved);
        }
      });
    return () => { alive = false; };
  }, []));

  const stage = TRAIL.find((s) => s.id === stageId) ?? TRAIL[0];
  const mastery = useMemo(() => {
    const m: Record<string, number> = {};
    for (const n of spine.data?.nodes ?? []) m[n.feature] = n.mastery;
    return m;
  }, [spine.data]);
  const facts: TrailFacts = { cardsDone, topicsRead: read, visited, mastery };
  const statuses = useMemo(() => stageStatuses(stage, facts),
    // facts is rebuilt every render; its parts are the real inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stage, cardsDone, read, visited, mastery]);
  const stops = stageStops(stage);
  const done = stageDoneCount(stage, facts);
  const currentStop = stops.find((s) => statuses.get(s.lesson.id) === "current");
  const streak = history.data ? dayStreak(history.data, localToday()) : 0;
  const asList = textSize === "L" || textSize === "XL";

  const pickStage = (id: string) => {
    setStageId(id);
    saveStageId(id);
    scrolledFor.current = null;
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  const openTool = (tool: TrailTool) => {
    const nav = navigation as unknown as { navigate: (route: string, params?: object) => void };
    if (tool.kind === "paradigm") nav.navigate("Paradigm", { kind: tool.of });
    else if (tool.kind === "book") nav.navigate("Book", { bookKey: tool.bookKey });
    else if (tool.screen === "Vocab" || tool.screen === "WordOrder" || tool.screen === "WordLab") nav.navigate(tool.screen, {});
    else nav.navigate(tool.screen);
  };

  const startStop = (stop: TrailStop) => {
    const l = stop.lesson;
    setOpenStop(null);
    if (l.cards) {
      setLearnV2LastLesson(l.cards);
      navigation.navigate("LearnV2Lesson", { lessonId: l.cards });
    } else if (l.topics.length) {
      markVisited(l.id);
      navigation.navigate("GrammarTopic", { topicId: l.topics[0] });
    } else if (l.tool) {
      markVisited(l.id);
      openTool(l.tool);
    }
  };

  const openNotes = (stop: TrailStop) => {
    setOpenStop(null);
    if (!stop.lesson.cards) markVisited(stop.lesson.id);
    if (stop.lesson.topics[0]) navigation.navigate("GrammarTopic", { topicId: stop.lesson.topics[0] });
  };

  const onPractice = (unit: TrailUnit) => {
    haptics.tap();
    if (unit.graded.length) setOpenPractice(unit);
    else if (unit.practiceTool) openTool(unit.practiceTool);
  };

  const onCurrentY = (y: number) => {
    if (scrolledFor.current === stage.id) return;
    scrolledFor.current = stage.id;
    if (y > 260) requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: y - 220, animated: false }));
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text accessibilityRole="header" style={[styles.title, { fontSize: sized(28) }]}>{lang === "hi" ? "सीखें" : "Learn"}</Text>
          {streak > 0 ? (
            <View style={styles.streak} accessible accessibilityLabel={lang === "hi" ? `${streak} दिन लगातार` : `${streak} day streak`}>
              <Ionicons name="flame" size={17} color="#D9772B" />
              <Text style={[ui("semibold"), { color: T.ink, fontSize: sized(14) }]}>{streak}</Text>
            </View>
          ) : null}
          <IconButton icon="library-outline" label={lang === "hi" ? "पुस्तकालय" : "Library"} onPress={() => navigation.navigate("LearnLibrary", {})} />
          <LangSwitch lang={lang} onChange={setLang} />
        </View>
        <Pressable
          onPress={() => { haptics.tap(); setStagesOpen(true); }}
          accessibilityRole="button"
          accessibilityLabel={`${lang === "hi" ? "चरण" : "Stage"} ${stage.n} / 5: ${stage.title[lang]}. ${done} / ${stops.length}. ${lang === "hi" ? "चरण बदलें" : "Change stage"}`}
          style={styles.stageBtn}
        >
          <Medallion art={stage.art} size={40} ring={stage.color} />
          <View style={{ flex: 1 }}>
            <Text style={[ui("bold"), { color: stage.color, fontSize: sized(11), letterSpacing: 1 }]}>
              {lang === "hi" ? `चरण ${stage.n} / 5` : `STAGE ${stage.n} OF 5`}
            </Text>
            <Text style={[ui("semibold"), { color: T.ink, fontSize: sized(16) }]} numberOfLines={1}>{stage.title[lang]}</Text>
          </View>
          <Text style={[ui("regular"), { color: T.ink2, fontSize: sized(13) }]}>{lang === "hi" ? `${done} / ${stops.length}` : `${done} of ${stops.length}`}</Text>
          <Ionicons name="chevron-down" size={18} color={T.ink2} />
        </Pressable>
      </View>

      <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
        {asList ? (
          <TrailList stage={stage} statuses={statuses} facts={facts} lang={lang} onStop={setOpenStop} onPractice={onPractice} />
        ) : (
          <TrailMap stage={stage} statuses={statuses} facts={facts} width={width} lang={lang}
            onStop={(s) => { haptics.tap(); setOpenStop(s); }} onPractice={onPractice} onCurrentY={onCurrentY} />
        )}
      </ScrollView>

      <LessonSheet
        stop={openStop}
        status={openStop ? statuses.get(openStop.lesson.id) ?? "upcoming" : "upcoming"}
        currentTitle={currentStop?.lesson.title[lang]}
        topics={guide.data?.topics ?? []}
        lang={lang}
        onStart={() => openStop && startStop(openStop)}
        onNotes={() => openStop && openNotes(openStop)}
        onClose={() => setOpenStop(null)}
      />
      <StageSheet
        visible={stagesOpen}
        current={stage}
        facts={facts}
        lang={lang}
        onPick={(s) => { setStagesOpen(false); pickStage(s.id); }}
        onLibrary={() => { setStagesOpen(false); navigation.navigate("LearnLibrary", {}); }}
        onClose={() => setStagesOpen(false)}
      />
      <PracticeSheet
        unit={openPractice}
        stage={stage}
        lessons={(units.data ?? []).flatMap((u) => u.lessons)}
        loading={units.loading}
        failed={units.failed}
        onRetry={units.retry}
        facts={facts}
        lang={lang}
        onLesson={(l: LessonSummary) => { setOpenPractice(null); navigation.navigate("Lesson", { featureId: l.feature_id, lessonId: l.id }); }}
        onAll={() => { const u = openPractice; setOpenPractice(null); if (u) navigation.navigate("Challenge", { features: u.graded }); }}
        onClose={() => setOpenPractice(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.paper },
  header: { paddingHorizontal: 16, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: T.line, backgroundColor: T.paper },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 48 },
  title: { flex: 1, fontFamily: "TiroDevanagariSanskrit_400Regular", color: T.ink },
  streak: { flexDirection: "row", alignItems: "center", gap: 4, height: 32, paddingHorizontal: 9, borderWidth: 1, borderColor: T.line, backgroundColor: T.surface },
  stageBtn: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 56, marginTop: 6, paddingHorizontal: 10, backgroundColor: T.surface, borderWidth: 1, borderColor: T.line },
});
