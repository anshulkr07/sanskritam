// Grammar — the differentiator's front door (U8-5) + the Learn map.
//
// Two halves, one screen:
//  - Learn: GET /grammar/guide sections (basics → advanced), each card with
//    beginner text, tappable feature chips (→ Lesson), Learn/Practice buttons
//    (→ Lesson step player / Challenge), and a Go-deeper toggle for the
//    intermediate + advanced text. Lesson existence resolves from
//    GET /lessons so the guide never stales.
//  - Proof: the original search field — type a word, get its derivation
//    (U7-1's player) or paradigm (U7-5's table).
//
// Rules that govern this screen:
//  - Render ONLY what GET /grammar/derive/paradigm return; never a rule the
//    backend did not send; never explain a sūtra with an LLM call (§U7).
//  - An underivable input returns an honest "no derivation for this", not an
//    empty screen or a spinner (P9-1.4).
//  - Recent lookups persist locally — a reference with no history is hostile.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import DerivationPlayer from "../components/derivation/DerivationPlayer";
import SandhiVisual from "../components/derivation/SandhiVisual";
import { useAsk } from "../ask/AskProvider";
import ParadigmScreen from "./Paradigm";
import { haptics } from "../services/haptics";
import { api, type GuideSection, type LessonSummary } from "../api/client";
import { useQuery } from "../hooks/useQuery";
import { Button } from "../components/ui";
import type { TabScreenProps } from "../navigation/types";
import { color, font, radius, script, shadow, space } from "../theme";

const RECENT_KEY = "shabd.grammar.recent";

// Small heuristic: a word ending in a vowel is treated as a noun (prātipadika)
// for the derivation/paradigm guess. Verbs are looked up by their dhātu.
function guessKind(word: string): "verb" | "noun" {
  return /[ऀ-ॿ]$/.test(word) ? "noun" : "verb";
}

function LearnSectionCard({
  section,
  lessonsByFeature,
  onLearn,
  onPractice,
  onFeature,
}: {
  section: GuideSection;
  lessonsByFeature: Map<string, LessonSummary>;
  onLearn: (featureId: string) => void;
  onPractice: (features: string[]) => void;
  onFeature: (featureId: string) => void;
}) {
  const [deep, setDeep] = useState(false);
  const firstTeachable = section.feature_ids.find((f) => lessonsByFeature.has(f));
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{section.title_en}</Text>
      {!!section.title_hi && (
        <Text style={[styles.cardSa, script("semibold")]}>{section.title_hi}</Text>
      )}
      <Text style={styles.cardBody}>{section.body_beginner}</Text>
      {section.examples.slice(0, 3).map((ex) => (
        <View key={ex.devanagari} style={styles.exampleRow}>
          <Text style={[styles.exampleDev, script("semibold")]}>{ex.devanagari}</Text>
          <Text style={styles.exampleGloss}>{ex.gloss}</Text>
        </View>
      ))}
      <View style={styles.chipRow}>
        {section.feature_ids.map((f) => {
          const taught = lessonsByFeature.has(f);
          return (
            <Pressable
              key={f}
              onPress={() => {
                haptics.tap();
                onFeature(f);
              }}
              style={[styles.chip, taught && styles.chipTaught]}
              accessibilityRole="button"
              accessibilityLabel={`${f}${taught ? ", has lesson" : ", reference only"}`}
            >
              <Text style={[styles.chipText, taught && styles.chipTextTaught]}>{f}</Text>
            </Pressable>
          );
        })}
      </View>
      {deep && (
        <View>
          {!!section.body_intermediate && (
            <Text style={styles.cardBodyDeep}>{section.body_intermediate}</Text>
          )}
          {!!section.body_advanced && (
            <Text style={styles.cardBodyDeep}>{section.body_advanced}</Text>
          )}
        </View>
      )}
      <Pressable
        onPress={() => {
          haptics.tap();
          setDeep((d) => !d);
        }}
        style={styles.deepToggle}
        accessibilityRole="button"
        accessibilityLabel={deep ? "Show less" : "Go deeper: intermediate and advanced"}
        accessibilityState={{ expanded: deep }}
      >
        <Text style={styles.deepToggleText}>
          {deep ? "Show less" : "Go deeper: intermediate + advanced"}
        </Text>
      </Pressable>
      <View style={styles.cardActions}>
        <Button
          label={firstTeachable ? "Learn" : "No lesson yet"}
          onPress={() => firstTeachable && onLearn(firstTeachable)}
          disabled={!firstTeachable}
        />
        <Button label="Practice" onPress={() => onPractice(section.feature_ids)} />
      </View>
    </View>
  );
}

export default function GrammarScreen({ navigation }: TabScreenProps<"Grammar">) {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [showParadigm, setShowParadigm] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const { setContext } = useAsk();
  const { data: guide } = useQuery("grammar-guide", api.guide);
  const { data: lessons } = useQuery("grammar-lessons", api.lessons);

  const lessonsByFeature = useMemo(() => {
    const m = new Map<string, LessonSummary>();
    for (const l of lessons ?? []) {
      if (!m.has(l.feature_id)) m.set(l.feature_id, l);
      for (const f of l.features ?? []) {
        if (!m.has(f)) m.set(f, l);
      }
    }
    return m;
  }, [lessons]);

  // U11: the ask button asks about the word on screen, not "this screen".
  React.useEffect(() => {
    setContext({ surface: "grammar", subject: submitted ?? "" });
  }, [submitted, setContext]);

  useEffect(() => {
    AsyncStorage.getItem(RECENT_KEY).then((v) => {
      if (v) setRecent(JSON.parse(v));
    });
  }, []);

  const persistRecent = useCallback((word: string) => {
    setRecent((prev) => {
      const next = [word, ...prev.filter((w) => w !== word)].slice(0, 8);
      AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const search = useCallback(
    (text: string) => {
      const word = text.trim();
      if (!word) return;
      haptics.tap();
      setSubmitted(word);
      setShowParadigm(false);
      persistRecent(word);
    },
    [persistRecent],
  );

  const onLearn = useCallback(
    (featureId: string) => {
      const found = lessonsByFeature.get(featureId);
      navigation.navigate("Lesson", {
        featureId,
        lessonId: found?.id,
      });
    },
    [lessonsByFeature, navigation],
  );

  const onPractice = useCallback(
    (features: string[]) => {
      navigation.navigate("Challenge", { features });
    },
    [navigation],
  );

  const kind = submitted ? guessKind(submitted) : "noun";
  const sections = useMemo(
    () => [...(guide?.sections ?? [])].sort((a, b) => a.rank - b.rank),
    [guide],
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Grammar</Text>
        <Text style={styles.subtitle}>Learn the endings, then prove every word.</Text>

        {/* Learn map: basics → advanced */}
        {sections.length > 0 && (
          <View style={styles.learnBlock}>
            <Text style={styles.sectionTitle}>Learn: basics to advanced</Text>
            {sections.map((s) => (
              <LearnSectionCard
                key={s.id}
                section={s}
                lessonsByFeature={lessonsByFeature}
                onLearn={onLearn}
                onPractice={onPractice}
                onFeature={onLearn}
              />
            ))}
          </View>
        )}

        <Text style={styles.sectionTitle}>Prove a word</Text>
        <Text style={styles.proofHint}>
          Derivations and paradigms — every claim proven by the engine.
        </Text>
                {/* Reading lives in its own Read tab now — Grammar stays proof. */}
                {/* Search field */}
        <View style={styles.searchRow}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => search(query)}
            placeholder="Type a word… e.g. भवति or देव"
            placeholderTextColor={color.inkFaint}
            style={[styles.input, script("semibold")]}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            accessibilityLabel="Search a Sanskrit word"
          />
          <Pressable
            onPress={() => search(query)}
            style={styles.searchBtn}
            accessibilityRole="button"
            accessibilityLabel="Search"
          >
            <Ionicons name="search" size={22} color={color.white} />
          </Pressable>
        </View>

        {/* Toggle verb/noun for the submitted word */}
        {submitted && (
          <View style={styles.toggleRow}>
            <Pressable
              onPress={() => { haptics.tap(); setShowParadigm(false); }}
              style={[styles.toggle, !showParadigm && styles.toggleActive]}
              accessibilityRole="button"
              accessibilityLabel={kind === "verb" ? "Show conjugation" : "Show derivation"}
              accessibilityState={{ selected: !showParadigm }}
            >
              <Text style={[styles.toggleText, !showParadigm && styles.toggleTextActive]}>
                {kind === "verb" ? "Conjugation" : "Derivation"}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => { haptics.tap(); setShowParadigm(true); }}
              style={[styles.toggle, showParadigm && styles.toggleActive]}
              accessibilityRole="button"
              accessibilityLabel={kind === "verb" ? "Show lakara grid" : "Show paradigm table"}
              accessibilityState={{ selected: showParadigm }}
            >
              <Text style={[styles.toggleText, showParadigm && styles.toggleTextActive]}>
                {kind === "verb" ? "Lakāra grid" : "Paradigm table"}
              </Text>
            </Pressable>
          </View>
        )}

        {submitted && showParadigm ? (
          <View style={styles.paradigmWrap}>
            <ParadigmScreen
              pratipadika={kind === "noun" ? submitted : undefined}
              dhatu={kind === "verb" ? submitted : undefined}
              title={`${submitted} — full paradigm`}
            />
          </View>
        ) : submitted && /\s/.test(submitted) ? (
          // U4-5: a multi-word query visualises the junction — the surface
          // only Sanskrit can teach, backed by GET /grammar/sandhi.
          <View style={styles.derivWrap}>
            <SandhiVisual joined={submitted} autoPlay />
          </View>
        ) : submitted ? (
          <View style={styles.derivWrap}>
            <DerivationPlayer
              word={submitted}
              kind={kind}
              title={`Why ${submitted}?`}
            />
          </View>
        ) : null}

        {/* Recent lookups */}
        {recent.length > 0 && (
          <View style={styles.recentBlock}>
            <Text style={styles.sectionTitle}>Recent</Text>
            <View style={styles.recentRow}>
              {recent.map((w) => (
                <Pressable
                  key={w}
                  onPress={() => { setQuery(w); search(w); }}
                  style={styles.recentChip}
                  accessibilityRole="button"
                  accessibilityLabel={`Look up ${w} again`}
                >
                  <Text style={[styles.recentText, script("semibold")]}>{w}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg },
  body: { padding: space.lg, paddingBottom: space.xxl },
  title: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.xl, color: color.ink },
  subtitle: { fontFamily: "Nunito_400Regular", fontWeight: "400", fontSize: font.sizes.sm, color: color.inkSoft, marginTop: 2, marginBottom: space.lg, lineHeight: 20 },
  learnBlock: { marginBottom: space.lg },
  card: { backgroundColor: color.surface, borderRadius: radius.lg, padding: space.md, marginBottom: space.md, ...shadow.card },
  cardTitle: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.md, color: color.ink },
  cardSa: { fontSize: font.sizes.base, color: color.saffronDeep, marginTop: 2 },
  cardBody: { fontFamily: "Nunito_400Regular", fontWeight: "400", fontSize: font.sizes.sm, color: color.ink, marginTop: space.xs, lineHeight: 20 },
  cardBodyDeep: { fontFamily: "Nunito_400Regular", fontWeight: "400", fontSize: font.sizes.sm, color: color.inkSoft, marginTop: space.xs, lineHeight: 20 },
  exampleRow: { flexDirection: "row", alignItems: "baseline", gap: space.sm, marginTop: space.xs },
  exampleDev: { fontSize: font.sizes.base, color: color.ink },
  exampleGloss: { fontFamily: "Nunito_400Regular", fontWeight: "400", fontSize: font.sizes.sm, color: color.inkSoft, flex: 1, flexWrap: "wrap" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: space.xs, marginTop: space.sm },
  chip: { borderWidth: 1, borderColor: color.border, borderRadius: radius.pill, paddingHorizontal: space.sm, paddingVertical: 4 },
  chipTaught: { borderColor: color.saffron, backgroundColor: color.saffronLight },
  chipText: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.xs, color: color.inkSoft },
  chipTextTaught: { color: color.saffronDeep },
  deepToggle: { marginTop: space.sm, paddingVertical: 4 },
  deepToggleText: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.sm, color: color.saffron },
  cardActions: { flexDirection: "row", gap: space.sm, marginTop: space.sm },
  proofHint: { fontFamily: "Nunito_400Regular", fontWeight: "400", fontSize: font.sizes.sm, color: color.inkSoft, marginBottom: space.sm },
  searchRow: { flexDirection: "row", alignItems: "center", gap: space.sm, marginBottom: space.md },
  input: {
    flex: 1,
    borderWidth: 2,
    borderColor: color.border,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    fontSize: font.sizes.base,
    color: color.ink,
    backgroundColor: color.surface,
  },
  searchBtn: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: color.saffron, alignItems: "center", justifyContent: "center", ...shadow.button },
  toggleRow: { flexDirection: "row", marginBottom: space.md, backgroundColor: color.surfaceMuted, borderRadius: radius.md, padding: 4 },
  toggle: { flex: 1, paddingVertical: space.xs, borderRadius: radius.sm, alignItems: "center" },
  toggleActive: { backgroundColor: color.surface, ...shadow.card },
  toggleText: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.sm, color: color.inkSoft },
  toggleTextActive: { color: color.saffron },
  derivWrap: { backgroundColor: color.surface, borderRadius: radius.lg, padding: space.md, ...shadow.card },
  paradigmWrap: { marginTop: 0 },
  recentBlock: { marginTop: space.lg },
  sectionTitle: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.md, color: color.ink, marginBottom: space.sm },
  recentRow: { flexDirection: "row", flexWrap: "wrap", gap: space.xs },
  recentChip: { backgroundColor: color.surface, borderRadius: radius.pill, paddingHorizontal: space.md, paddingVertical: space.xs, ...shadow.card },
  recentText: { fontSize: font.sizes.sm, color: color.ink },
});
