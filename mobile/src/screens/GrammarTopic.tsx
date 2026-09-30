// GrammarTopic — one grammar-guide page, in English or Hindi.
//
// One idea per page, top to bottom: where you are, the Sanskrit term, the idea
// in one line, the teaching blocks, "Go deeper", a quick check, the engine
// proof, key terms, a lesson or practice link, and previous/next. Reading
// writes nothing to the server — the "understood" mark and the last topic
// live on the device (services/grammarGuide).
//
// Rules carried: content only from GET /grammar/guide/topics/{id} (§U7 — no
// claim the backend did not send); Practice only for features that have
// graded challenges; Lesson links skip `[staged]` lessons; every Pressable has
// role + label; the 18pt Sanskrit floor via sized().

import { Ionicons } from "@react-native-vector-icons/ionicons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api, type GuideGlossaryItem, type LessonSummary } from "../api/client";
import { useAskContext } from "../ask/AskProvider";
import FetchError from "../components/FetchError";
import { Skeleton } from "../components/Skeleton";
import BlockRenderer, { SanskritLine } from "../components/grammar/BlockRenderer";
import Collapsible from "../components/grammar/Collapsible";
import GlossarySheet from "../components/grammar/GlossarySheet";
import InlineText from "../components/grammar/InlineText";
import LangToggle from "../components/grammar/LangToggle";
import LevelPill from "../components/grammar/LevelPill";
import ProofPanel from "../components/grammar/ProofPanel";
import QuickCheck from "../components/grammar/QuickCheck";
import { GUIDE_UI } from "../components/grammar/strings";
import { Button } from "../components/ui";
import { useGrammarProgress, useGuideLang } from "../hooks/useGuide";
import { useQuery } from "../hooks/useQuery";
import { useTypeScale } from "../hooks/useTypeScale";
import type { RootStackParamList } from "../navigation/types";
import { fetchGuideTopic, setLastTopic, setTopicRead } from "../services/grammarGuide";
import { haptics } from "../services/haptics";
import { color, font, radius, script, shadow, space } from "../theme";
import { announce } from "../utils/announce";

type Props = NativeStackScreenProps<RootStackParamList, "GrammarTopic">;

// Taught as explanation only — no graded challenges exist for these, so a
// Practice button would open an empty session (test_grammar_guide CONCEPT_ONLY).
const CONCEPT_ONLY = new Set(["FEM", "INDECL"]);
const isGradable = (f: string) => !CONCEPT_ONLY.has(f) && !f.startsWith("KARAKA-") && !f.startsWith("SAMASA-");

function lessonFor(features: string[], lessons: LessonSummary[] | null): LessonSummary | undefined {
  if (!lessons) return undefined;
  const curated = lessons.filter((l) => !l.title_en.startsWith("[staged]"));
  for (const f of features) {
    const hit = curated.find((l) => l.feature_id === f);
    if (hit) return hit;
  }
  return undefined;
}

function Section({ title, icon, lang, children }: { title: string; icon: React.ComponentProps<typeof Ionicons>["name"]; lang: "en" | "hi"; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Ionicons name={icon} size={18} color={color.saffron} />
        <Text style={[styles.sectionTitle, lang === "hi" && script("bold")]} accessibilityRole="header">
          {title}
        </Text>
      </View>
      {children}
    </View>
  );
}

export default function GrammarTopicScreen({ route, navigation }: Props) {
  const { topicId } = route.params;
  const { lang, t, setLang } = useGuideLang();
  const ctx = React.useMemo(() => ({ lang, t }), [lang, t]);
  const { sized } = useTypeScale();
  const { read } = useGrammarProgress();
  const scrollRef = React.useRef<ScrollView>(null);
  const [term, setTerm] = React.useState<GuideGlossaryItem | null>(null);

  const { data: topic, loading, failed, retry } = useQuery(
    `guide-topic:${topicId}`,
    () => fetchGuideTopic(topicId),
    { ttlMs: 30 * 60_000 },
  );
  // Same key and shape Grammar.tsx has always filled (Lesson.tsx peeks it).
  const { data: lessons } = useQuery("grammar-lessons", api.lessons);

  React.useEffect(() => {
    setLastTopic(topicId);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [topicId]);

  useAskContext("grammar", topic ? (topic.term?.sa ?? topic.title_sa ?? "") : "");

  React.useLayoutEffect(() => {
    navigation.setOptions({
      title: topic ? t(topic.chapter.title) : GUIDE_UI.title[lang],
      headerRight: () => <LangToggle lang={lang} onChange={setLang} />,
    });
  }, [navigation, topic, lang, t, setLang]);

  const goTo = (id: string) => {
    haptics.tap();
    navigation.setParams({ topicId: id });
  };

  const isRead = read.has(topicId);
  const lesson = topic ? lessonFor(topic.feature_ids, lessons) : undefined;
  const practice = topic ? topic.feature_ids.filter(isGradable) : [];

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {loading && !topic ? (
          <View style={styles.skeletons} accessible accessibilityLabel="Loading">
            <Skeleton width="45%" height={14} />
            <Skeleton width="85%" height={28} />
            <Skeleton height={90} />
            <Skeleton height={160} />
          </View>
        ) : failed && !topic ? (
          <FetchError label={GUIDE_UI.loadFailed[lang]} onRetry={retry} retryLabel={GUIDE_UI.retry[lang]} />
        ) : topic ? (
          <>
            <Text style={[styles.eyebrow, lang === "hi" && script("semibold")]}>
              {t(topic.chapter.title)} · {topic.chapter.position} {GUIDE_UI.of[lang]} {topic.chapter.count}
            </Text>
            <InlineText
              text={t(topic.title)}
              lang={lang}
              style={[styles.title, lang === "hi" && script("bold"), { fontSize: sized(font.sizes.xl) }]}
            />
            <View style={styles.metaRow}>
              <LevelPill level={topic.level} lang={lang} />
              <Text style={styles.meta}>
                {topic.minutes} {GUIDE_UI.minutes[lang]}
              </Text>
              {isRead && (
                <View style={styles.readMark} accessible accessibilityLabel={GUIDE_UI.markedRead[lang]}>
                  <Ionicons name="checkmark-circle" size={16} color={color.okText} />
                  <Text style={[styles.readText, lang === "hi" && script("semibold")]}>{GUIDE_UI.markedRead[lang]}</Text>
                </View>
              )}
            </View>

            {topic.term && (
              <View style={styles.term}>
                <SanskritLine node={topic.term} ctx={ctx} size={28} meaning={topic.term.meaning} />
                <InlineText text={t(topic.term.meaning)} lang={lang} style={[styles.termMeaning, { fontSize: sized(font.sizes.base) }]} />
              </View>
            )}

            <View style={styles.oneLine}>
              <Text style={[styles.oneLineLabel, lang === "hi" && script("bold")]}>{GUIDE_UI.inOneLine[lang]}</Text>
              <InlineText text={t(topic.summary)} lang={lang} style={[styles.oneLineText, { fontSize: sized(font.sizes.md) }]} />
            </View>

            {topic.blocks.map((block, i) => (
              <BlockRenderer key={`${topicId}-b${i}`} block={block} ctx={ctx} />
            ))}

            {topic.deeper.length > 0 && (
              <Section title={GUIDE_UI.goDeeper[lang]} icon="layers-outline" lang={lang}>
                {topic.deeper.map((d, i) => (
                  <Collapsible
                    key={`${topicId}-d${i}`}
                    style={styles.deeper}
                    accessibilityLabel={`${GUIDE_UI.goDeeper[lang]}: ${t(d.title)}`}
                    header={<InlineText text={t(d.title)} lang={lang} style={styles.deeperTitle} />}
                  >
                    <View style={styles.deeperBody}>
                      {d.blocks.map((block, j) => (
                        <BlockRenderer key={j} block={block} ctx={ctx} />
                      ))}
                    </View>
                  </Collapsible>
                ))}
              </Section>
            )}

            {topic.quiz.length > 0 && (
              <Section title={GUIDE_UI.quickCheck[lang]} icon="help-circle-outline" lang={lang}>
                <QuickCheck key={topicId} items={topic.quiz} ctx={ctx} />
              </Section>
            )}

            {topic.proofs.length > 0 && (
              <Section title={GUIDE_UI.seeItProved[lang]} icon="flask-outline" lang={lang}>
                {topic.proofs.map((p, i) => (
                  <ProofPanel key={`${topicId}-p${i}`} proof={p} ctx={ctx} />
                ))}
              </Section>
            )}

            {topic.terms.length > 0 && (
              <Section title={GUIDE_UI.keyTerms[lang]} icon="bookmark-outline" lang={lang}>
                <View style={styles.chips}>
                  {topic.terms.map((g) => (
                    <Pressable
                      key={g.id}
                      onPress={() => {
                        haptics.tap();
                        setTerm(g);
                      }}
                      style={styles.chip}
                      accessibilityRole="button"
                      accessibilityLabel={`${g.term_iast}: ${t(g.meaning)}`}
                    >
                      <Text style={[script("semibold"), styles.chipSa, { fontSize: sized(18, { sanskrit: true }) }]}>{g.term_sa}</Text>
                      <Text style={styles.chipIast}>{g.term_iast}</Text>
                    </Pressable>
                  ))}
                </View>
              </Section>
            )}

            {(lesson || practice.length > 0) && (
              <View style={styles.actions}>
                {lesson && (
                  <Button
                    label={GUIDE_UI.learnInLesson[lang]}
                    size="md"
                    block
                    onPress={() => navigation.navigate("Lesson", { featureId: lesson.feature_id, lessonId: lesson.id })}
                  />
                )}
                {practice.length > 0 && (
                  <Button
                    label={GUIDE_UI.practice[lang]}
                    tone="neutral"
                    size="md"
                    block
                    onPress={() => navigation.navigate("Challenge", { features: practice })}
                  />
                )}
              </View>
            )}

            {topic.related.length > 0 && (
              <Section title={GUIDE_UI.related[lang]} icon="git-network-outline" lang={lang}>
                {topic.related.map((r) => (
                  <Pressable
                    key={r.id}
                    onPress={() => goTo(r.id)}
                    style={styles.related}
                    accessibilityRole="link"
                    accessibilityLabel={t(r.title)}
                  >
                    <InlineText text={t(r.title)} lang={lang} style={styles.relatedText} />
                    <Ionicons name="arrow-forward" size={16} color={color.saffron} />
                  </Pressable>
                ))}
              </Section>
            )}

            <Button
              label={isRead ? GUIDE_UI.markedRead[lang] : GUIDE_UI.markRead[lang]}
              tone={isRead ? "ok" : "primary"}
              icon={<Ionicons name={isRead ? "checkmark-circle" : "checkmark-circle-outline"} size={20} color={color.white} />}
              block
              onPress={() => {
                const next = !isRead;
                setTopicRead(topicId, next);
                if (next) {
                  haptics.correct();
                  announce(GUIDE_UI.markedRead[lang]);
                }
              }}
              accessibilityState={{ checked: isRead }}
            />

            <View style={styles.navRow}>
              {topic.prev ? (
                <Pressable
                  onPress={() => goTo(topic.prev!.id)}
                  style={[styles.navCard, styles.navLeft]}
                  accessibilityRole="link"
                  accessibilityLabel={`${GUIDE_UI.previous[lang]}: ${t(topic.prev.title)}`}
                >
                  <Text style={[styles.navLabel, lang === "hi" && script("semibold")]}>← {GUIDE_UI.previous[lang]}</Text>
                  <InlineText text={t(topic.prev.title)} lang={lang} style={styles.navTitle} numberOfLines={2} />
                </Pressable>
              ) : (
                <View style={styles.navSpacer} />
              )}
              {topic.next ? (
                <Pressable
                  onPress={() => goTo(topic.next!.id)}
                  style={[styles.navCard, styles.navRight]}
                  accessibilityRole="link"
                  accessibilityLabel={`${GUIDE_UI.next[lang]}: ${t(topic.next.title)}`}
                >
                  <Text style={[styles.navLabel, styles.navLabelRight, lang === "hi" && script("semibold")]}>
                    {GUIDE_UI.next[lang]} →
                  </Text>
                  <InlineText text={t(topic.next.title)} lang={lang} style={[styles.navTitle, styles.navTitleRight]} numberOfLines={2} />
                </Pressable>
              ) : (
                <View style={styles.navSpacer} />
              )}
            </View>
          </>
        ) : null}
      </ScrollView>

      <GlossarySheet
        items={term ? [term] : []}
        visible={!!term}
        onClose={() => setTerm(null)}
        ctx={ctx}
        onOpenTopic={(id) => {
          setTerm(null);
          if (id !== topicId) goTo(id);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg },
  body: { padding: space.lg, paddingBottom: 120, gap: space.md },
  skeletons: { gap: space.sm },
  eyebrow: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.xs, color: color.saffronText, textTransform: "uppercase", letterSpacing: 0.6 },
  title: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", color: color.ink, marginTop: -space.xs },
  metaRow: { flexDirection: "row", alignItems: "center", gap: space.xs, marginTop: -space.xs },
  meta: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: font.sizes.xs, color: color.inkSoft },
  readMark: { flexDirection: "row", alignItems: "center", gap: 3 },
  readText: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.xs, color: color.okText },
  term: { backgroundColor: color.surface, borderRadius: radius.lg, padding: space.md, gap: 4, ...shadow.card },
  termMeaning: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", color: color.inkSoft },
  oneLine: { borderLeftWidth: 4, borderLeftColor: color.saffron, paddingLeft: space.sm, gap: 2 },
  oneLineLabel: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.xs, color: color.saffronText, textTransform: "uppercase", letterSpacing: 0.6 },
  oneLineText: { fontFamily: "Nunito_700Bold", fontWeight: "700", color: color.ink, lineHeight: 26 },
  section: { gap: space.xs, marginTop: space.xs },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: 6 },
  sectionTitle: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.md, color: color.ink },
  deeper: { backgroundColor: color.surface, borderRadius: radius.md, paddingHorizontal: space.sm, borderWidth: 1, borderColor: color.border },
  deeperTitle: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.base, color: color.ink },
  deeperBody: { gap: space.sm, paddingBottom: space.sm },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.xs },
  chip: { backgroundColor: color.surface, borderRadius: radius.md, paddingHorizontal: space.sm, paddingVertical: 6, borderWidth: 1, borderColor: color.border, minHeight: 44 },
  chipSa: { color: color.saffronText },
  chipIast: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: font.sizes.xs, color: color.inkSoft, fontStyle: "italic" },
  actions: { gap: space.xs },
  related: { flexDirection: "row", alignItems: "center", gap: space.xs, minHeight: 44, backgroundColor: color.surface, borderRadius: radius.md, paddingHorizontal: space.sm },
  relatedText: { flex: 1, fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.sm, color: color.ink },
  navRow: { flexDirection: "row", gap: space.sm },
  navCard: { flex: 1, backgroundColor: color.surface, borderRadius: radius.md, padding: space.sm, minHeight: 64, ...shadow.card },
  navLeft: {},
  navRight: { alignItems: "flex-end" },
  navSpacer: { flex: 1 },
  navLabel: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.xs, color: color.saffronText },
  navLabelRight: { textAlign: "right" },
  navTitle: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.sm, color: color.ink },
  navTitleRight: { textAlign: "right" },
});
