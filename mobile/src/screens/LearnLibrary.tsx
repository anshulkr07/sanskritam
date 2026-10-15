// Library — everything that is not on the trail, one tap from it: the quick
// tables, all 18 Grammar guide chapters, the practice tools, the English
// metre manuscript and the advanced notes. `section: "verse"` lists the metre
// course itself.

import { Ionicons, type IoniconsIconName } from "@react-native-vector-icons/ionicons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, type ImageSourcePropType } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useGrammarProgress, useGuideLang } from "../hooks/useGuide";
import { useQuery } from "../hooks/useQuery";
import { useTypeScale } from "../hooks/useTypeScale";
import { LEARNV2_LESSONS, LEARNV2_UNITS } from "../learnv2/catalogue";
import type { RootStackParamList } from "../navigation/types";
import { fetchGuideIndex } from "../services/grammarGuide";
import { haptics } from "../services/haptics";
import { LIBRARY_CARD_LESSONS, LIBRARY_TOPIC_TITLES, LIBRARY_TOPICS, TRAIL, type TrailLesson } from "../trail/course";
import { T, sa, ui } from "../trail/theme";
import { IconButton, LangSwitch, Overline } from "../trail/ui";
import { PaintedThumbnail } from "../components/artwork/PaintedBackground";
import { hubArtwork } from "../components/artwork/hubs";
import { getLearnV2Asset } from "../learnv2/assetMap";

type Props = NativeStackScreenProps<RootStackParamList, "LearnLibrary">;

const TOOLS: { route: string; params?: object; icon: IoniconsIconName; en: string; hi: string }[] = [
  { route: "Varnamala", icon: "grid-outline", en: "Sound map", hi: "ध्वनि नक्शा" },
  { route: "Writing", icon: "create-outline", en: "Writing", hi: "लेखन" },
  { route: "WordLab", params: {}, icon: "flask-outline", en: "Word Lab", hi: "शब्द प्रयोगशाला" },
  { route: "WordOrder", params: {}, icon: "swap-horizontal-outline", en: "Word order", hi: "शब्द क्रम" },
  { route: "Paradigm", params: { kind: "noun" }, icon: "apps-outline", en: "Noun forms", hi: "संज्ञा रूप" },
  { route: "Paradigm", params: { kind: "verb" }, icon: "keypad-outline", en: "Verb forms", hi: "क्रिया रूप" },
  { route: "Pingala", icon: "pulse-outline", en: "Rhythm", hi: "लय" },
  { route: "Vocab", params: {}, icon: "book-outline", en: "Vocabulary", hi: "शब्दावली" },
  { route: "Challenge", params: {}, icon: "flag-outline", en: "Challenges", hi: "चुनौतियाँ" },
];

const norm = (s: string) => s.normalize("NFC").toLowerCase();
function lessonArtwork(id?: string): ImageSourcePropType | undefined {
  const lesson = LEARNV2_LESSONS.find((l) => l.id === id);
  const card = lesson?.cards.find((c) => c.assetId || c.assetIds?.length);
  const assetId = card?.assetId ?? card?.assetIds?.[0];
  return (assetId ? getLearnV2Asset(assetId)?.source : undefined)
    ?? hubArtwork(id?.startsWith("verse-") ? "learn:verse" : "learn:library");
}
const TOOL_ART: Record<string, string> = {
  Varnamala: "tool:sound-map", Writing: "tool:writing", WordLab: "tool:word-lab",
  WordOrder: "tool:word-order", Paradigm: "practice:paradigms", Pingala: "tool:rhythm",
  Vocab: "practice:words", Challenge: "practice:challenges",
};

export default function LearnLibraryScreen({ navigation, route }: Props) {
  const { lang, t, setLang } = useGuideLang();
  const { sized } = useTypeScale();
  const { read } = useGrammarProgress();
  const guide = useQuery("guide-index", fetchGuideIndex, { ttlMs: 30 * 60_000 });
  const [query, setQuery] = useState("");
  const hi = lang === "hi";
  const verse = route.params?.section === "verse";
  const nav = navigation as unknown as { navigate: (r: string, p?: object) => void };
  const topics = guide.data?.topics ?? [];
  const topicArtwork = (id: string) => {
    const chapter = guide.data?.chapters.find((ch) => ch.topic_ids.includes(id));
    return hubArtwork(chapter ? `grammar:${chapter.id}` : "learn:advanced");
  };
  const topicTitle = (id: string) => {
    const tp = topics.find((x) => x.id === id);
    return tp ? t(tp.title) : LIBRARY_TOPIC_TITLES[id]?.[lang] ?? id;
  };

  const openLesson = (l: TrailLesson) => {
    navigation.navigate("LearnV2Lesson", { lessonId: l.cards });
  };

  const q = norm(query.trim());
  const lessonHits = q
    ? TRAIL.flatMap((s) => s.units.flatMap((u) => u.lessons)).filter((l) => norm(`${l.title.en} ${l.title.hi}`).includes(q) && (l.cards || l.topics.length))
    : [];
  const topicHits = q
    ? topics.filter((tp) => norm(`${tp.id} ${tp.title.en} ${tp.title.hi} ${tp.title_sa} ${tp.title_iast} ${tp.summary.en} ${tp.summary.hi}`).includes(q))
    : [];

  const Row = ({ title, sub, onPress, saTitle, artwork }: { title: string; sub?: string; onPress: () => void; saTitle?: boolean; artwork?: ImageSourcePropType }) => (
    <Pressable onPress={() => { haptics.tap(); onPress(); }} accessibilityRole="button" accessibilityLabel={sub ? `${title}. ${sub}` : title} style={styles.row}>
      {artwork && <PaintedThumbnail source={artwork} />}
      <View style={{ flex: 1 }}>
        <Text style={[saTitle ? sa(sized(18)) : ui("regular"), { color: T.ink, fontSize: sized(saTitle ? 18 : 16) }]}>{title}</Text>
        {sub ? <Text style={[ui("regular"), { color: T.ink2, fontSize: sized(13.5) }]}>{sub}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color={T.ink3} />
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.head}>
        <IconButton icon="chevron-back" label={hi ? "वापस" : "Back"} onPress={() => navigation.goBack()} />
        <Text accessibilityRole="header" style={[styles.title, { fontSize: sized(26) }]}>
          {verse ? (hi ? "छन्द और लय" : "Metre and rhythm") : hi ? "पुस्तकालय" : "Library"}
        </Text>
        <LangSwitch lang={lang} onChange={setLang} />
      </View>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {verse ? (
          <>
            <Text style={[ui("regular"), { color: T.ink2, fontSize: sized(15), lineHeight: sized(22) }]}>
              {hi ? "48 पठन, मूल अंग्रेज़ी पांडुलिपि से। 12 भाग।" : "48 readings from the English manuscript, in 12 parts."}
            </Text>
            {LEARNV2_UNITS.filter((u) => u.id.startsWith("verse-module-")).map((u, i) => (
              <View key={u.id} style={styles.section}>
                <Overline text={`${hi ? "भाग" : "Part"} ${i + 1} · ${u.title[lang].replace(/^Verse & Rhythm: /, "")}`} />
                {u.lessonIds.map((id) => {
                  const l = LEARNV2_LESSONS.find((x) => x.id === id);
                  return l ? <Row key={id} artwork={lessonArtwork(id)} title={l.title[lang]} sub={hi ? `${l.cards.length} कार्ड` : `${l.cards.length} cards`} onPress={() => navigation.navigate("LearnV2Lesson", { lessonId: id })} /> : null;
                })}
              </View>
            ))}
          </>
        ) : (
          <>
            <View style={styles.search}>
              <Ionicons name="search" size={18} color={T.ink2} />
              <TextInput value={query} onChangeText={setQuery} placeholder={hi ? "पाठ, नोट्स, शब्द खोजें" : "Search lessons, notes, words"}
                placeholderTextColor={T.ink3} autoCorrect={false} accessibilityLabel={hi ? "पुस्तकालय में खोजें" : "Search the library"}
                style={[styles.input, ui("regular"), { fontSize: sized(16) }]} />
            </View>
            {q ? (
              <View style={styles.section}>
                {lessonHits.length ? <Overline text={hi ? "पाठ" : "Lessons"} /> : null}
                {lessonHits.map((l) => <Row key={l.id} artwork={lessonArtwork(l.cards)} title={l.title[lang]} onPress={() => openLesson(l)} />)}
                {topicHits.length ? <Overline text={hi ? "व्याकरण नोट्स" : "Grammar notes"} /> : null}
                {topicHits.slice(0, 40).map((tp) => <Row key={tp.id} artwork={topicArtwork(tp.id)} title={t(tp.title)} sub={tp.title_sa} onPress={() => navigation.navigate("GrammarTopic", { topicId: tp.id })} />)}
                {!lessonHits.length && !topicHits.length ? <Text style={[ui("regular"), { color: T.ink2, fontSize: sized(15) }]}>{hi ? "कुछ नहीं मिला।" : "Nothing found."}</Text> : null}
              </View>
            ) : (
              <>
                <View style={styles.section}>
                  <Overline text={hi ? "तालिकाएँ" : "Tables"} />
                  {LIBRARY_TOPICS.tables.map((id) => <Row key={id} artwork={hubArtwork("learn:tables")} title={topicTitle(id)} onPress={() => navigation.navigate("GrammarTopic", { topicId: id })} />)}
                </View>

                <View style={styles.section}>
                  <Overline text={hi ? `व्याकरण नोट्स · ${guide.data?.chapters.length ?? 18} अध्याय` : `Grammar notes · ${guide.data?.chapters.length ?? 18} chapters`} />
                  {(guide.data?.chapters ?? []).map((ch) => {
                    const count = ch.topic_ids.length;
                    const done = ch.topic_ids.filter((id) => read.has(id)).length;
                    return <Row key={ch.id} artwork={hubArtwork(`grammar:${ch.id}`)} title={t(ch.title)} sub={hi ? `${count} विषय${done ? ` · ${done} पढ़े` : ""}` : `${count} topics${done ? ` · ${done} read` : ""}`}
                      onPress={() => navigation.navigate("GrammarChapter", { chapterId: ch.id })} />;
                  })}
                  {guide.loading && !guide.data ? <Text style={[ui("regular"), { color: T.ink2, fontSize: sized(14) }]}>{hi ? "लोड हो रहा है…" : "Loading…"}</Text> : null}
                  {guide.failed && !guide.data ? <Row title={hi ? "लोड नहीं हुआ। फिर से कोशिश करें" : "Could not load. Retry"} onPress={guide.retry} /> : null}
                  <Row artwork={hubArtwork("learn:library")} title={hi ? "पूरा संदर्भ: स्तर, प्रश्नोत्तरी, शब्दकोश" : "The full reference: levels, quizzes, glossary"} onPress={() => navigation.navigate("Grammar")} />
                </View>

                <View style={styles.section}>
                  <Overline text={hi ? "उपकरण" : "Tools"} />
                  <View style={styles.tools}>
                    {TOOLS.map((tool) => (
                      <Pressable key={tool.en} onPress={() => { haptics.tap(); nav.navigate(tool.route, tool.params); }} accessibilityRole="button"
                        accessibilityLabel={hi ? tool.hi : tool.en} style={styles.tool}>
                        <PaintedThumbnail source={hubArtwork(TOOL_ART[tool.route])} />
                        <Text style={[ui("semibold"), { flex: 1, color: T.ink, fontSize: sized(15) }]}>{hi ? tool.hi : tool.en}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                <View style={styles.section}>
                  <Overline text={hi ? "और गहराई में" : "Go deeper"} />
                  <Row artwork={hubArtwork("learn:verse")} title={hi ? "छन्द और लय: पूरा पाठ्यक्रम" : "Metre and rhythm, the full course"} sub={hi ? "48 पठन · अंग्रेज़ी पांडुलिपि" : "48 readings · English manuscript"}
                    onPress={() => navigation.navigate("LearnLibrary", { section: "verse" })} />
                  {LIBRARY_CARD_LESSONS.map((id) => {
                    const l = LEARNV2_LESSONS.find((x) => x.id === id);
                    return l ? <Row key={id} artwork={lessonArtwork(id)} title={l.title[lang]} sub={hi ? `सन्धि · ${l.cards.length} कार्ड` : `Sandhi · ${l.cards.length} cards`} onPress={() => navigation.navigate("LearnV2Lesson", { lessonId: id })} /> : null;
                  })}
                </View>

                <View style={styles.section}>
                  <Overline text={hi ? "उन्नत" : "Advanced"} />
                  {LIBRARY_TOPICS.advanced.map((id) => <Row key={id} artwork={hubArtwork("learn:advanced")} title={topicTitle(id)} onPress={() => navigation.navigate("GrammarTopic", { topicId: id })} />)}
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.paper },
  head: { flexDirection: "row", alignItems: "center", gap: 4, paddingLeft: 6, paddingRight: 16, minHeight: 56, borderBottomWidth: 1, borderBottomColor: T.line },
  title: { flex: 1, fontFamily: "TiroDevanagariSanskrit_400Regular", color: T.ink },
  body: { padding: 16, paddingBottom: 48, gap: 22 },
  search: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 48, paddingHorizontal: 12, backgroundColor: T.surface, borderWidth: 1, borderColor: T.lineStrong },
  input: { flex: 1, color: T.ink, paddingVertical: 8 },
  section: { gap: 2 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 48, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: T.line },
  tools: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 },
  tool: { flexBasis: "48%", flexGrow: 1, flexDirection: "row", alignItems: "center", gap: 8, minHeight: 70, paddingHorizontal: 8, backgroundColor: T.surface, borderWidth: 1, borderColor: T.line },
});
