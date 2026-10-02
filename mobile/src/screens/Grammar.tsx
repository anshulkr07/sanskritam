// Grammar chapters: deep solid tiles, underlined level tabs, solid Continue.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api, type GuideLang } from "../api/client";
import { useAskContext } from "../ask/AskProvider";
import FetchError from "../components/FetchError";
import { Skeleton } from "../components/Skeleton";
import InlineText from "../components/grammar/InlineText";
import LangToggle from "../components/grammar/LangToggle";
import { GUIDE_UI } from "../components/grammar/strings";
import { useGrammarProgress, useGuideLang } from "../hooks/useGuide";
import { useQuery } from "../hooks/useQuery";
import { useTypeScale } from "../hooks/useTypeScale";
import type { TabScreenProps } from "../navigation/types";
import { fetchGuideIndex } from "../services/grammarGuide";
import { haptics } from "../services/haptics";
import { color, fill, fillAt, font, onFill, outline, space } from "../theme";
import { firstAkshara } from "../utils/akshara";

const DEVANAGARI = /[ऀ-ॿ]/;
const norm = (s: string) => s.normalize("NFC").toLowerCase();

export default function GrammarScreen({ navigation }: TabScreenProps<"Grammar">) {
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
    <SafeAreaView style={styles.safe} edges={["top"]}>
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
              <Pressable
                onPress={() => openTopic(lastTopic.id)}
                style={[styles.continue, { backgroundColor: fill.ink }]}
                accessibilityRole="button"
                accessibilityLabel={`${GUIDE_UI.continue[lang]}: ${t(lastTopic.title)}`}
              >
                <Text style={styles.continueEyebrow}>{GUIDE_UI.continue[lang]}</Text>
                <InlineText text={t(lastTopic.title)} lang={lang} style={styles.continueTitle} numberOfLines={2} />
              </Pressable>
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
                  const tone = fillAt(ch.rank);
                  const done = ch.topic_ids.filter((id) => read.has(id)).length;
                  const all = ch.topic_ids.length;
                  return (
                    <Pressable
                      key={ch.id}
                      onPress={() => openChapter(ch.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`${t(ch.title)}. ${done} of ${all} read`}
                      style={[styles.tile, { backgroundColor: fill[tone] }]}
                    >
                      <Text style={styles.tileLetter}>{firstAkshara(ch.title_sa)}</Text>
                      <Text style={styles.tileTitle} numberOfLines={2}>{t(ch.title)}</Text>
                      <Text style={styles.tileSa} numberOfLines={1}>{ch.title_sa}</Text>
                      <View style={styles.tileBar}>
                        <View style={[styles.tileBarFill, { width: `${all ? (done / all) * 100 : 0}%` }]} />
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}

            <View style={styles.toolsRow}>
              {(
                [
                  { icon: "flask-outline", label: "Word Lab", go: () => navigation.navigate("WordLab") },
                  { icon: "musical-notes-outline", label: "Sound map", go: () => navigation.navigate("Varnamala") },
                  { icon: "swap-horizontal-outline", label: "Word order", go: () => navigation.navigate("WordOrder", {}) },
                  { icon: "pulse-outline", label: "Rhythm", go: () => navigation.navigate("Pingala") },
                ] as const
              ).map((tool, i) => (
                <Pressable
                  key={tool.label}
                  onPress={() => { haptics.tap(); tool.go(); }}
                  accessibilityRole="button"
                  accessibilityLabel={tool.label}
                  style={[styles.tool, { backgroundColor: fill[fillAt(i + 2)] }]}
                >
                  <Ionicons name={tool.icon as never} size={22} color={onFill.text} />
                  <Text style={styles.toolText}>{tool.label}</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
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
  continue: { borderRadius: 16, padding: 16, gap: 4 },
  continueEyebrow: { color: onFill.gold, fontSize: 12, fontWeight: "800", textTransform: "uppercase" },
  continueTitle: { color: onFill.text, fontWeight: "800", fontSize: 18 },
  levels: { flexDirection: "row", gap: 16 },
  levelTab: { paddingVertical: 8, alignItems: "center" },
  levelText: { fontWeight: "700", fontSize: 14, color: color.inkSoft },
  levelActive: { color: color.ink, fontWeight: "800" },
  levelLine: { height: 2, backgroundColor: color.ink, alignSelf: "stretch", marginTop: 2 },
  skeletons: { gap: 8 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  tile: { width: "48%", borderRadius: 16, padding: 14, minHeight: 140, overflow: "hidden" },
  tileLetter: { position: "absolute", right: 4, bottom: -10, fontSize: 72, color: onFill.faint, fontWeight: "800" },
  tileTitle: { color: onFill.text, fontWeight: "800", fontSize: 16 },
  tileSa: { color: onFill.soft, fontSize: 13 },
  tileBar: { height: 4, backgroundColor: onFill.faint, borderRadius: 2, marginTop: 8 },
  tileBarFill: { height: 4, backgroundColor: onFill.text, borderRadius: 2 },
  toolsRow: { flexDirection: "row", gap: 8 },
  tool: { flex: 1, borderRadius: 12, minHeight: 72, alignItems: "center", justifyContent: "center", gap: 4 },
  toolText: { color: onFill.text, fontSize: 12, fontWeight: "700" },
});
