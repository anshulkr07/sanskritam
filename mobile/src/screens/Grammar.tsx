// Grammar — the guide's hub: Sanskrit grammar in plain English or Hindi.
//
// Replaces the old single scroll of eight dense cards. Top to bottom: title
// with the English | हिन्दी toggle, one search box (topics + glossary; a
// Devanagari word offers the Word Lab), "Continue" card,
// level chips, collapsible chapter cards listing their topics, and tools.
//
// Rules that govern this screen:
//  - Content only from GET /grammar/guide (services/grammarGuide caches the
//    last good copy for offline reading). Nothing is graded or sent: read
//    marks live on the device.
//  - Keeps useQuery("grammar-lessons", api.lessons) warm — Lesson.tsx peeks
//    that cache for its title.
//  - Every Pressable carries role + label + state; colour never the only
//    signal (read state is an icon and text, level is a word).

import { Ionicons } from "@react-native-vector-icons/ionicons";
import type { IoniconsIconName } from "@react-native-vector-icons/ionicons";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api, type GuideChapter, type GuideLang, type GuideTopicSummary } from "../api/client";
import { useAsk } from "../ask/AskProvider";
import FetchError from "../components/FetchError";
import { Skeleton } from "../components/Skeleton";
import Collapsible from "../components/grammar/Collapsible";
import GlossarySheet from "../components/grammar/GlossarySheet";
import InlineText from "../components/grammar/InlineText";
import LangToggle from "../components/grammar/LangToggle";
import LevelPill, { LEVEL_LABEL } from "../components/grammar/LevelPill";
import { GUIDE_UI } from "../components/grammar/strings";
import { ProgressBar } from "../components/ui";
import { useGrammarProgress, useGuideLang } from "../hooks/useGuide";
import { useQuery } from "../hooks/useQuery";
import { useTypeScale } from "../hooks/useTypeScale";
import type { TabScreenProps } from "../navigation/types";
import { fetchGuideIndex } from "../services/grammarGuide";
import { haptics } from "../services/haptics";
import { color, font, radius, script, shadow, space } from "../theme";

const DEVANAGARI = /[ऀ-ॿ]/;
const norm = (s: string) => s.normalize("NFC").toLowerCase();

function TopicRow({
  topic,
  read,
  lang,
  onPress,
}: {
  topic: GuideTopicSummary;
  read: boolean;
  lang: GuideLang;
  onPress: () => void;
}) {
  const { sized } = useTypeScale();
  const title = topic.title[lang] || topic.title.en;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.topicRow, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${LEVEL_LABEL[topic.level]?.[lang] ?? ""}. ${read ? GUIDE_UI.markedRead[lang] : ""}`}
    >
      <Ionicons
        name={read ? "checkmark-circle" : "ellipse-outline"}
        size={20}
        color={read ? color.okText : color.inkFaint}
      />
      <View style={styles.topicText}>
        <InlineText text={title} lang={lang} style={[styles.topicTitle, { fontSize: sized(font.sizes.base) }]} />
        <InlineText
          text={topic.summary[lang] || topic.summary.en}
          lang={lang}
          style={[styles.topicSummary, { fontSize: sized(font.sizes.sm) }]}
          numberOfLines={2}
        />
        <View style={styles.topicMeta}>
          <LevelPill level={topic.level} lang={lang} />
          <Text style={styles.metaText}>
            {topic.minutes} {GUIDE_UI.minutes[lang]}
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={color.saffron} />
    </Pressable>
  );
}

function ChapterCard({
  chapter,
  topics,
  read,
  lang,
  open,
  onToggle,
  onOpenTopic,
}: {
  chapter: GuideChapter;
  topics: GuideTopicSummary[];
  read: Set<string>;
  lang: GuideLang;
  open: boolean;
  onToggle: () => void;
  onOpenTopic: (id: string) => void;
}) {
  const { sized } = useTypeScale();
  const all = chapter.topic_ids.length;
  const done = chapter.topic_ids.filter((id) => read.has(id)).length;
  const title = chapter.title[lang] || chapter.title.en;
  return (
    <Collapsible
      style={styles.chapter}
      open={open}
      onToggle={onToggle}
      accessibilityLabel={`${title}. ${done} ${GUIDE_UI.of[lang]} ${all} ${GUIDE_UI.read[lang]}`}
      header={
        <View style={styles.chapterHead}>
          <View style={styles.chapterIcon}>
            <Ionicons name={(chapter.icon || "book-outline") as IoniconsIconName} size={22} color={color.saffron} />
          </View>
          <View style={styles.chapterText}>
            <InlineText text={title} lang={lang} style={[styles.chapterTitle, { fontSize: sized(font.sizes.md) }]} />
            <Text style={[script("semibold"), styles.chapterSa, { fontSize: sized(16) }]}>{chapter.title_sa}</Text>
            <InlineText
              text={chapter.blurb[lang] || chapter.blurb.en}
              lang={lang}
              style={[styles.chapterBlurb, { fontSize: sized(font.sizes.sm) }]}
            />
            <View style={styles.progressRow}>
              <ProgressBar progress={all ? done / all : 0} height={6} style={styles.progress} />
              <Text style={[styles.metaText, lang === "hi" && script("semibold")]}>
                {done} / {all} {GUIDE_UI.read[lang]}
              </Text>
            </View>
          </View>
        </View>
      }
    >
      <View style={styles.topicList}>
        {topics.map((tp) => (
          <TopicRow key={tp.id} topic={tp} read={read.has(tp.id)} lang={lang} onPress={() => onOpenTopic(tp.id)} />
        ))}
      </View>
    </Collapsible>
  );
}

export default function GrammarScreen({ navigation }: TabScreenProps<"Grammar">) {
  const { lang, t, setLang } = useGuideLang();
  const ctx = React.useMemo(() => ({ lang, t }), [lang, t]);
  const { sized } = useTypeScale();
  const { read, last, ready } = useGrammarProgress();
  const { setContext } = useAsk();
  const { data: index, loading, failed, retry } = useQuery("guide-index", fetchGuideIndex, { ttlMs: 30 * 60_000 });
  useQuery("grammar-lessons", api.lessons);
  const [query, setQuery] = React.useState("");
  const [level, setLevel] = React.useState(0);
  const [openChapter, setOpenChapter] = React.useState<string | null>(null);
  const [glossaryOpen, setGlossaryOpen] = React.useState(false);

  React.useEffect(() => {
    setContext({ surface: "grammar", subject: "" });
  }, [setContext]);

  // Open the first chapter with something unread, once the guide arrives.
  React.useEffect(() => {
    if (!index || !ready || openChapter !== null) return;
    const firstUnread = index.chapters.find((c) => c.topic_ids.some((id) => !read.has(id)));
    setOpenChapter((firstUnread ?? index.chapters[0])?.id ?? null);
  }, [index, ready, read, openChapter]);

  const topicsById = React.useMemo(
    () => new Map((index?.topics ?? []).map((tp) => [tp.id, tp] as const)),
    [index],
  );

  const q = query.trim();
  const results = React.useMemo(() => {
    if (!index || !q) return [];
    const needle = norm(q);
    const viaGlossary = new Set(
      index.glossary
        .filter((g) => [g.term_sa, g.term_iast, g.meaning.en, g.meaning.hi].some((s) => norm(s).includes(needle)))
        .map((g) => g.topic_id)
        .filter(Boolean),
    );
    return index.topics.filter(
      (tp) =>
        viaGlossary.has(tp.id) ||
        [tp.title.en, tp.title.hi, tp.title_sa, tp.title_iast, tp.summary.en, tp.summary.hi].some((s) =>
          norm(s).includes(needle),
        ),
    );
  }, [index, q]);

  const openTopic = (id: string) => {
    haptics.tap();
    navigation.navigate("GrammarTopic", { topicId: id });
  };

  const lastTopic = last ? topicsById.get(last) : undefined;
  const levels = [0, 1, 2, 3];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={[styles.title, lang === "hi" && script("bold"), { fontSize: sized(font.sizes.xl) }]} accessibilityRole="header">
              {GUIDE_UI.title[lang]}
            </Text>
            <Text style={[styles.subtitle, lang === "hi" && script("regular"), { fontSize: sized(font.sizes.sm) }]}>
              {GUIDE_UI.subtitle[lang]}
            </Text>
          </View>
          <LangToggle lang={lang} onChange={setLang} />
        </View>

        <View style={styles.search}>
          <Ionicons name="search" size={20} color={color.inkSoft} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={GUIDE_UI.searchPlaceholder[lang]}
            placeholderTextColor={color.inkFaint}
            style={[styles.searchInput, script("regular"), { fontSize: sized(font.sizes.base) }]}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            onSubmitEditing={() => {
              if (DEVANAGARI.test(q)) navigation.navigate("WordLab", { word: q });
            }}
            accessibilityLabel={GUIDE_UI.searchPlaceholder[lang]}
          />
          {!!query && (
            <Pressable onPress={() => setQuery("")} hitSlop={10} accessibilityRole="button" accessibilityLabel={GUIDE_UI.close[lang]}>
              <Ionicons name="close-circle" size={20} color={color.inkFaint} />
            </Pressable>
          )}
        </View>

        {q ? (
          <View style={styles.results}>
            {DEVANAGARI.test(q) && (
              <Pressable
                onPress={() => {
                  haptics.tap();
                  navigation.navigate("WordLab", { word: q });
                }}
                style={styles.wordLabRow}
                accessibilityRole="button"
                accessibilityLabel={`${GUIDE_UI.lookUp[lang]} ${q} ${GUIDE_UI.inWordLab[lang]}`}
              >
                <Ionicons name="flask-outline" size={20} color={color.saffron} />
                <Text style={[styles.wordLabText, lang === "hi" && script("semibold")]}>
                  {GUIDE_UI.lookUp[lang]} <Text style={script("bold")}>{q}</Text> {GUIDE_UI.inWordLab[lang]}
                </Text>
                <Ionicons name="arrow-forward" size={18} color={color.saffron} />
              </Pressable>
            )}
            {results.map((tp) => (
              <TopicRow key={tp.id} topic={tp} read={read.has(tp.id)} lang={lang} onPress={() => openTopic(tp.id)} />
            ))}
            {index && results.length === 0 && (
              <Text style={[styles.empty, lang === "hi" && script("regular")]}>{GUIDE_UI.noMatch[lang]}</Text>
            )}
          </View>
        ) : (
          <>
            {lastTopic && (
              <Pressable
                onPress={() => openTopic(lastTopic.id)}
                style={styles.continue}
                accessibilityRole="button"
                accessibilityLabel={`${GUIDE_UI.continue[lang]}: ${t(lastTopic.title)}`}
              >
                <Ionicons name="play-circle" size={28} color={color.saffron} />
                <View style={styles.continueText}>
                  <Text style={[styles.eyebrow, lang === "hi" && script("semibold")]}>{GUIDE_UI.continue[lang]}</Text>
                  <InlineText text={t(lastTopic.title)} lang={lang} style={styles.continueTitle} numberOfLines={2} />
                </View>
                <Ionicons name="chevron-forward" size={18} color={color.saffron} />
              </Pressable>
            )}

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.levels}>
              {levels.map((lv) => {
                const active = level === lv;
                const label = lv === 0 ? GUIDE_UI.all[lang] : LEVEL_LABEL[lv][lang];
                return (
                  <Pressable
                    key={lv}
                    onPress={() => {
                      haptics.tap();
                      setLevel(lv);
                    }}
                    style={[styles.levelChip, active && styles.levelChipActive]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={label}
                  >
                    <Text style={[styles.levelText, lang === "hi" && script("semibold"), active && styles.levelTextActive]}>{label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {loading && !index ? (
              <View style={styles.skeletons} accessible accessibilityLabel="Loading">
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} height={96} radius={radius.lg} />
                ))}
              </View>
            ) : failed && !index ? (
              <FetchError label={GUIDE_UI.loadFailed[lang]} onRetry={retry} retryLabel={GUIDE_UI.retry[lang]} />
            ) : (
              (index?.chapters ?? []).map((ch) => {
                const topics = ch.topic_ids
                  .map((id) => topicsById.get(id))
                  .filter((tp): tp is GuideTopicSummary => !!tp && (level === 0 || tp.level === level));
                if (topics.length === 0) return null;
                return (
                  <ChapterCard
                    key={ch.id}
                    chapter={ch}
                    topics={topics}
                    read={read}
                    lang={lang}
                    open={openChapter === ch.id || level !== 0}
                    onToggle={() => setOpenChapter((cur) => (cur === ch.id ? "" : ch.id))}
                    onOpenTopic={openTopic}
                  />
                );
              })
            )}

            <Text style={[styles.toolsTitle, lang === "hi" && script("bold")]} accessibilityRole="header">
              {GUIDE_UI.tools[lang]}
            </Text>
            <View style={styles.tools}>
              {(
                [
                  { icon: "flask-outline", label: GUIDE_UI.wordLab, go: () => navigation.navigate("WordLab") },
                  { icon: "musical-notes-outline", label: GUIDE_UI.soundMap, go: () => navigation.navigate("Varnamala") },
                  { icon: "swap-horizontal-outline", label: GUIDE_UI.wordOrderLab, go: () => navigation.navigate("WordOrder", {}) },
                  { icon: "pulse-outline", label: GUIDE_UI.rhythm, go: () => navigation.navigate("Pingala") },
                  { icon: "library-outline", label: GUIDE_UI.glossary, go: () => setGlossaryOpen(true) },
                ] as { icon: IoniconsIconName; label: { en: string; hi: string }; go: () => void }[]
              ).map((tool) => (
                <Pressable
                  key={tool.label.en}
                  onPress={() => {
                    haptics.tap();
                    tool.go();
                  }}
                  style={({ pressed }) => [styles.tool, pressed && styles.pressed]}
                  accessibilityRole="button"
                  accessibilityLabel={tool.label[lang]}
                >
                  <Ionicons name={tool.icon} size={24} color={color.saffron} />
                  <Text style={[styles.toolText, lang === "hi" && script("semibold")]}>{tool.label[lang]}</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      <GlossarySheet
        items={index?.glossary ?? []}
        visible={glossaryOpen}
        onClose={() => setGlossaryOpen(false)}
        ctx={ctx}
        searchable
        onOpenTopic={(id) => {
          setGlossaryOpen(false);
          openTopic(id);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg },
  body: { padding: space.lg, paddingBottom: space.xxl, gap: space.md },
  headerRow: { flexDirection: "row", alignItems: "center", gap: space.sm },
  headerText: { flex: 1 },
  title: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", color: color.ink },
  subtitle: { fontFamily: "Nunito_400Regular", fontWeight: "400", color: color.inkSoft, marginTop: 2 },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    borderWidth: 2,
    borderColor: color.border,
    borderRadius: radius.md,
    paddingHorizontal: space.sm,
    backgroundColor: color.surface,
    minHeight: 48,
  },
  searchInput: { flex: 1, color: color.ink, paddingVertical: space.xs },
  results: { gap: space.xs },
  wordLabRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    minHeight: 52,
    backgroundColor: color.saffronLight,
    borderRadius: radius.md,
    paddingHorizontal: space.sm,
  },
  wordLabText: { flex: 1, fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.base, color: color.ink },
  empty: { fontFamily: "Nunito_400Regular", fontWeight: "400", fontSize: font.sizes.sm, color: color.inkSoft, paddingVertical: space.sm },
  continue: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    padding: space.sm,
    borderWidth: 2,
    borderColor: color.saffronLight,
  },
  continueText: { flex: 1 },
  eyebrow: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.xs, color: color.saffronText, textTransform: "uppercase", letterSpacing: 0.6 },
  continueTitle: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.base, color: color.ink },
  levels: { gap: space.xs },
  levelChip: { paddingHorizontal: space.md, minHeight: 36, justifyContent: "center", borderRadius: radius.pill, backgroundColor: color.surfaceMuted },
  levelChipActive: { backgroundColor: color.ink },
  levelText: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.sm, color: color.inkSoft },
  levelTextActive: { color: color.white },
  skeletons: { gap: space.sm },
  chapter: { backgroundColor: color.surface, borderRadius: radius.lg, padding: space.sm, ...shadow.card },
  chapterHead: { flexDirection: "row", gap: space.sm },
  chapterIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: color.saffronLight, alignItems: "center", justifyContent: "center" },
  chapterText: { flex: 1, gap: 2 },
  chapterTitle: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", color: color.ink },
  chapterSa: { color: color.saffronText },
  chapterBlurb: { fontFamily: "Nunito_400Regular", fontWeight: "400", color: color.inkSoft },
  progressRow: { flexDirection: "row", alignItems: "center", gap: space.xs, marginTop: 4 },
  progress: { flex: 1, width: undefined },
  metaText: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: font.sizes.xs, color: color.inkSoft },
  topicList: { marginTop: space.xs, gap: 2 },
  topicRow: { flexDirection: "row", alignItems: "center", gap: space.sm, paddingVertical: space.xs, paddingHorizontal: 4, borderRadius: radius.sm, minHeight: 56 },
  pressed: { backgroundColor: color.surfaceMuted },
  topicText: { flex: 1, gap: 2 },
  topicTitle: { fontFamily: "Nunito_700Bold", fontWeight: "700", color: color.ink },
  topicSummary: { fontFamily: "Nunito_400Regular", fontWeight: "400", color: color.inkSoft },
  topicMeta: { flexDirection: "row", alignItems: "center", gap: space.xs, marginTop: 2 },
  toolsTitle: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.md, color: color.ink, marginTop: space.xs },
  tools: { flexDirection: "row", flexWrap: "wrap", gap: space.xs },
  tool: {
    flexGrow: 1,
    flexBasis: "30%",
    alignItems: "center",
    gap: 4,
    backgroundColor: color.surface,
    borderRadius: radius.md,
    paddingVertical: space.sm,
    minHeight: 72,
    ...shadow.card,
  },
  toolText: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.sm, color: color.ink },
});
