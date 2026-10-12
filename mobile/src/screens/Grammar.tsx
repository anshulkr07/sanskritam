// Grammar chapters: painted tiles, underlined level tabs, and a reading banner.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api, type GuideChapter, type GuideLang, type GuideTopicSummary } from "../api/client";
import { useAskContext } from "../ask/AskProvider";
import FetchError from "../components/FetchError";
import { Skeleton } from "../components/Skeleton";
import InlineText from "../components/grammar/InlineText";
import LangToggle from "../components/grammar/LangToggle";
import { GUIDE_UI } from "../components/grammar/strings";
import { useGrammarProgress, useGuideLang } from "../hooks/useGuide";
import { useQuery } from "../hooks/useQuery";
import { useTypeScale } from "../hooks/useTypeScale";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { fetchGuideIndex } from "../services/grammarGuide";
import { haptics } from "../services/haptics";
import { color, fill, fillAt, font, onFill, outline, script } from "../theme";
import { firstAkshara } from "../utils/akshara";
import PaintedBackground from "../components/artwork/PaintedBackground";
import { hubArtwork } from "../components/artwork/hubs";
const norm = (s: string) => s.normalize("NFC").toLowerCase();

export default function GrammarScreen({ navigation }: NativeStackScreenProps<RootStackParamList, "Grammar">) {
  const { lang, t, setLang } = useGuideLang();
  const { sized } = useTypeScale();
  const { read, last, ready } = useGrammarProgress();
  useAskContext("grammar", "");
  const { data: index, loading, failed, retry } = useQuery("guide-index", fetchGuideIndex, { ttlMs: 30 * 60_000 });
  useQuery("grammar-lessons", api.lessons);
  const [query, setQuery] = React.useState("");
  const [level, setLevel] = React.useState(0);

  const topicsById = React.useMemo(() => new Map((index?.topics ?? []).map((tp) => [tp.id, tp] as const)), [index]);
  const q = query.trim();
  const results = React.useMemo(() => {
    if (!index || !q) return [];
    const needle = norm(q);
    return index.topics.filter((tp) =>
      [tp.title.en, tp.title.hi, tp.title_sa, tp.title_iast, tp.summary.en, tp.summary.hi].some((s) => norm(s).includes(needle)),
    );
  }, [index, q]);

  const openTopic = (id: string) => {
    haptics.tap();
    navigation.navigate("GrammarTopic", { topicId: id });
  };
  const openChapter = (id: string) => {
    haptics.tap();
    (navigation as unknown as { navigate: (r: string, p: object) => void }).navigate("GrammarChapter", { chapterId: id });
  };

  const lastTopic = last ? topicsById.get(last) : undefined;
  const levels = [0, 1, 2, 3];
  const levelName = (lv: number, l: GuideLang) => (lv === 0 ? GUIDE_UI.all[l] : ["", "Beginner", "Intermediate", "Advanced"][lv]);

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.headerRow}>
          <Text style={[styles.title, { fontSize: sized(font.sizes.xl) }]} accessibilityRole="header">{GUIDE_UI.title[lang]}</Text>
          <LangToggle lang={lang} onChange={setLang} />
        </View>

        <View style={styles.search}>
          <Ionicons name="search" size={20} color={color.inkSoft} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={GUIDE_UI.searchPlaceholder[lang]}
            placeholderTextColor={color.inkFaint}
            style={[styles.searchInput, { fontSize: sized(font.sizes.base) }]}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            accessibilityLabel={GUIDE_UI.searchPlaceholder[lang]}
          />
        </View>

        {q ? (
          <View style={styles.results}>
            {results.map((tp) => (
              <Pressable key={tp.id} onPress={() => openTopic(tp.id)} accessibilityRole="button" accessibilityLabel={t(tp.title)} style={styles.resultRow}>
                <Text style={styles.resultTitle}>{t(tp.title)}</Text>
                <Ionicons name="chevron-forward" size={18} color={color.inkFaint} />
              </Pressable>
            ))}
          </View>
        ) : (
          <>
            {lastTopic && (
              <GrammarContinueCard
                topic={lastTopic}
                lang={lang}
                onPress={() => openTopic(lastTopic.id)}
              />
            )}

            <View style={styles.levels}>
              {levels.map((lv) => {
                const active = level === lv;
                return (
                  <Pressable key={lv} onPress={() => { haptics.tap(); setLevel(lv); }} accessibilityRole="button" accessibilityState={{ selected: active }} accessibilityLabel={levelName(lv, lang)} style={styles.levelTab}>
                    <Text style={[styles.levelText, active && styles.levelActive]}>{levelName(lv, lang)}</Text>
                    {active && <View style={styles.levelLine} />}
                  </Pressable>
                );
              })}
            </View>

            {loading && !index ? (
              <View style={styles.skeletons}>
                {[0, 1, 2, 3].map((i) => <Skeleton key={i} height={120} radius={16} />)}
              </View>
            ) : failed && !index ? (
              <FetchError label={GUIDE_UI.loadFailed[lang]} onRetry={retry} retryLabel={GUIDE_UI.retry[lang]} />
            ) : (
              <View style={styles.grid}>
                {(index?.chapters ?? []).map((ch) => {
                  const topics = ch.topic_ids.map((id) => topicsById.get(id)).filter((x): x is NonNullable<typeof x> => !!x && (level === 0 || x.level === level));
                  if (topics.length === 0) return null;
                  const done = ch.topic_ids.filter((id) => read.has(id)).length;
                  return (
                    <GrammarChapterCard
                      key={ch.id}
                      chapter={ch}
                      lang={lang}
                      done={done}
                      onPress={() => openChapter(ch.id)}
                    />
                  );
                })}
              </View>
            )}

            <View style={styles.toolsRow}>
              {(
                [
                  { key: "word-lab", icon: "flask-outline", label: "Word Lab", go: () => navigation.navigate("WordLab") },
                  { key: "sound-map", icon: "musical-notes-outline", label: "Sound map", go: () => navigation.navigate("Varnamala") },
                  { key: "word-order", icon: "swap-horizontal-outline", label: "Word order", go: () => navigation.navigate("WordOrder", {}) },
                  { key: "rhythm", icon: "pulse-outline", label: "Rhythm", go: () => navigation.navigate("Pingala") },
                ] as const
              ).map((tool, i) => (
                <GrammarToolCard
                  key={tool.label}
                  toolKey={tool.key}
                  icon={tool.icon}
                  label={tool.label}
                  index={i}
                  onPress={() => { haptics.tap(); tool.go(); }}
                />
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// The preview renders these same cards with bilingual curriculum fixtures.
export function GrammarChapterCard({ chapter, lang, done, onPress }: { chapter: GuideChapter; lang: GuideLang; done: number; onPress: () => void }) {
  const artwork = hubArtwork(`grammar:${chapter.id}`);
  const all = chapter.topic_ids.length;
  const title = chapter.title[lang] || chapter.title.en;
  return <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${title}. ${done} of ${all} read`} style={[styles.tile, { backgroundColor: fill[fillAt(chapter.rank)] }]}>
    <PaintedBackground source={artwork} />
    {!artwork && <Text style={styles.tileLetter} aria-hidden>{firstAkshara(chapter.title_sa)}</Text>}
    <View style={{ flex: 1 }} />
    <Text style={[styles.tileTitle, lang === "hi" && script("bold")]} numberOfLines={3}>{title}</Text>
    <Text style={[styles.tileSa, script("regular")]} numberOfLines={1}>{chapter.title_sa}</Text>
    <View style={styles.tileBar}><View style={[styles.tileBarFill, { width: `${all ? (done / all) * 100 : 0}%` }]} /></View>
  </Pressable>;
}

export function GrammarContinueCard({ topic, lang, onPress }: { topic: GuideTopicSummary; lang: GuideLang; onPress: () => void }) {
  const title = topic.title[lang] || topic.title.en;
  return <Pressable onPress={onPress} style={[styles.continue, { backgroundColor: fill.ink }]} accessibilityRole="button" accessibilityLabel={`${GUIDE_UI.continue[lang]}: ${title}`}>
    <PaintedBackground source={hubArtwork("grammar:continue")} banner />
    <Text style={styles.continueEyebrow}>{GUIDE_UI.continue[lang]}</Text>
    <InlineText text={title} lang={lang} style={styles.continueTitle} numberOfLines={3} />
  </Pressable>;
}

export function GrammarToolCard({ toolKey, icon, label, index, onPress }: { toolKey: string; icon: string; label: string; index: number; onPress: () => void }) {
  return <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={[styles.tool, { backgroundColor: fill[fillAt(index + 2)] }]}>
    <PaintedBackground source={hubArtwork(`tool:${toolKey}`)} />
    <Ionicons name={icon as never} size={22} color={onFill.text} />
    <Text style={styles.toolText}>{label}</Text>
  </Pressable>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg },
  body: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 120, gap: 12 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", color: color.ink },
  search: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1.5, borderColor: outline, borderRadius: 12, paddingHorizontal: 12, backgroundColor: color.white, minHeight: 48 },
  searchInput: { flex: 1, color: color.ink, paddingVertical: 8 },
  results: { gap: 2 },
  resultRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: color.border },
  resultTitle: { flex: 1, fontWeight: "700", color: color.ink, fontSize: 16 },
  continue: { borderRadius: 16, padding: 16, gap: 4, minHeight: 132, overflow: "hidden" },
  continueEyebrow: { color: onFill.gold, fontSize: 12, fontWeight: "800", textTransform: "uppercase" },
  continueTitle: { color: onFill.text, fontWeight: "800", fontSize: 18, maxWidth: "68%" },
  levels: { flexDirection: "row", gap: 16 },
  levelTab: { paddingVertical: 8, alignItems: "center" },
  levelText: { fontWeight: "700", fontSize: 14, color: color.inkSoft },
  levelActive: { color: color.ink, fontWeight: "800" },
  levelLine: { height: 2, backgroundColor: color.ink, alignSelf: "stretch", marginTop: 2 },
  skeletons: { gap: 8 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  tile: { width: "47.5%", borderRadius: 16, padding: 14, height: 208, overflow: "hidden" },
  tileLetter: { position: "absolute", right: 4, bottom: -10, fontSize: 72, color: onFill.faint, fontWeight: "800" },
  tileTitle: { color: onFill.text, fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 16, lineHeight: 24 },
  tileSa: { color: onFill.text, fontSize: 13, lineHeight: 22 },
  tileBar: { height: 4, backgroundColor: onFill.faint, borderRadius: 2, marginTop: 8 },
  tileBarFill: { height: 4, backgroundColor: onFill.text, borderRadius: 2 },
  toolsRow: { flexDirection: "row", gap: 8 },
  tool: { flex: 1, borderRadius: 12, minHeight: 112, alignItems: "center", justifyContent: "flex-end", padding: 8, gap: 4, overflow: "hidden" },
  toolText: { color: onFill.text, fontSize: 12, fontWeight: "700" },
});
