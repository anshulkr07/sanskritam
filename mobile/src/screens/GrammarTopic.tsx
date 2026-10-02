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
import { useAsk, useAskContext } from "../ask/AskProvider";
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
import { color, fill, fillAt, font, onFill, radius, script, shadow, space, type FillName } from "../theme";
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
  const { setHiddenBy, open } = useAsk();
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
  const tone: FillName = fillAt(topicId.length % 6);
  const ctx = React.useMemo(() => ({ lang, t, tone }), [lang, t, tone]);

  React.useEffect(() => {
    setLastTopic(topicId);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [topicId]);

  // Hide the floating Ask bubble on this screen: tables plus a bubble overlap.
  // The header carries the Ask entry instead.
  React.useEffect(() => {
    setHiddenBy("grammar-topic", true);
    return () => setHiddenBy("grammar-topic", false);
  }, [setHiddenBy]);

  useAskContext("grammar", topic ? (topic.term?.sa ?? topic.title_sa ?? "") : "");

  React.useLayoutEffect(() => {
    navigation.setOptions({
      title: topic ? t(topic.chapter.title) : GUIDE_UI.title[lang],
      headerRight: () => (
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Pressable
            onPress={() => open()}
            accessibilityRole="button"
            accessibilityLabel="Ask about this topic"
            style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={22} color={color.ink} />
          </Pressable>
          <LangToggle lang={lang} onChange={setLang} />
        </View>
      ),
    });
  }, [navigation, topic, lang, t, setLang, open]);

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
            <View style={styles.progressTrack} accessible={false}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: fill[tone],
                    width: `${topic.chapter.count ? (topic.chapter.position / topic.chapter.count) * 100 : 0}%`,
                  },
                ]}
              />
            </View>
            <Text style={[styles.eyebrow, lang === "hi" && script("semibold"), { color: fill[tone] }]}>
              {lang === "hi" ? `पाठ ${topic.chapter.position} / ${topic.chapter.count}` : `Topic ${topic.chapter.position} of ${topic.chapter.count}`}
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
              <View style={[styles.term, { backgroundColor: fill[tone] }]}>
                <Text style={[styles.termSa, { fontSize: sized(30) }]}>{topic.term.sa}</Text>
                <Text style={styles.termRoman}>{topic.term.iast}</Text>
                <InlineText text={t(topic.term.meaning)} lang={lang} style={[styles.termMeaning, { fontSize: sized(font.sizes.base) }]} />
              </View>
            )}

            <InlineText text={t(topic.summary)} lang={lang} style={[styles.oneLineText, { fontSize: sized(17) }]} />

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

            <Pressable
              onPress={() => {
                const next = !isRead;
                setTopicRead(topicId, next);
                if (next) {
                  haptics.correct();
                  announce(GUIDE_UI.markedRead[lang]);
                }
              }}
              accessibilityRole="button"
              accessibilityLabel={isRead ? GUIDE_UI.markedRead[lang] : GUIDE_UI.markRead[lang]}
              accessibilityState={{ checked: isRead }}
              style={styles.markRead}
            >
              <Text style={styles.markReadText}>{isRead ? GUIDE_UI.markedRead[lang] : GUIDE_UI.markRead[lang]}</Text>
            </Pressable>

            {topic.next ? (
              <Pressable
                onPress={() => {
                  setTopicRead(topicId, true);
                  goTo(topic.next!.id);
                }}
                style={[styles.nextBar, { backgroundColor: fill.ink }]}
                accessibilityRole="button"
                accessibilityLabel={`${GUIDE_UI.next[lang]}: ${t(topic.next.title)}`}
              >
                <Text style={styles.nextLabel}>{GUIDE_UI.next[lang]}</Text>
                <InlineText text={t(topic.next.title)} lang={lang} style={styles.nextTitle} numberOfLines={1} />
              </Pressable>
            ) : null}
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
  progressTrack: { height: 3, backgroundColor: color.border, borderRadius: 2, overflow: "hidden" },
  progressFill: { height: 3, borderRadius: 2 },
  eyebrow: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.xs, textTransform: "uppercase", letterSpacing: 0.6 },
  title: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", color: color.ink, marginTop: -space.xs },
  metaRow: { flexDirection: "row", alignItems: "center", gap: space.xs, marginTop: -space.xs },
  meta: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: font.sizes.xs, color: color.inkSoft },
  readMark: { flexDirection: "row", alignItems: "center", gap: 3 },
  readText: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.xs, color: color.okText },
  term: { borderRadius: 12, padding: space.md, gap: 4 },
  termSa: { color: onFill.text, fontWeight: "800" },
  termRoman: { color: onFill.soft, fontSize: 13, fontStyle: "italic" },
  termMeaning: { fontWeight: "600", color: onFill.text },
  oneLineText: { fontWeight: "800", color: color.ink, lineHeight: 26 },
  markRead: { borderWidth: 1.5, borderColor: color.ink, borderRadius: 12, minHeight: 48, alignItems: "center", justifyContent: "center" },
  markReadText: { fontWeight: "700", color: color.ink, fontSize: 16 },
  nextBar: { borderRadius: 12, padding: space.md, gap: 2 },
  nextLabel: { color: onFill.gold, fontSize: 12, fontWeight: "800", textTransform: "uppercase" },
  nextTitle: { color: onFill.text, fontWeight: "800", fontSize: 16 },
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
