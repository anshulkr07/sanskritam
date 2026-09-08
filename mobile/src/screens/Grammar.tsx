// Grammar — the differentiator's front door (U8-5). A search field: type a
// word, get its derivation (U7-1's player) or its paradigm (U7-5's table).
// This is the in-app form of the public viewer that HANDOVER P11-6 keeps
// owner-gated — same components, no deployment question.
//
// Rules that govern this screen:
//  - Render ONLY what GET /grammar/derive/paradigm return; never a rule the
//    backend did not send; never explain a sūtra with an LLM call (§U7).
//  - An underivable input returns an honest "no derivation for this", not an
//    empty screen or a spinner (P9-1.4).
//  - Recent lookups persist locally — a reference with no history is hostile.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import DerivationPlayer from "../components/derivation/DerivationPlayer";
import SandhiVisual from "../components/derivation/SandhiVisual";
import { useAsk } from "../ask/AskProvider";
import ParadigmScreen from "./Paradigm";
import type { TabScreenProps } from "../navigation/types";
import { haptics } from "../services/haptics";
import { color, font, radius, script, shadow, space } from "../theme";

type Props = TabScreenProps<"Grammar">;

const RECENT_KEY = "shabd.grammar.recent";

// Small heuristic: a word ending in a vowel is treated as a noun (prātipadika)
// for the derivation/paradigm guess. Verbs are looked up by their dhātu.
function guessKind(word: string): "verb" | "noun" {
  return /[ऀ-ॿ]$/.test(word) ? "noun" : "verb";
}

export default function GrammarScreen({ navigation }: Props) {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [showParadigm, setShowParadigm] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const { setContext } = useAsk();

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

  const kind = submitted ? guessKind(submitted) : "noun";

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Grammar</Text>
                <Text style={styles.subtitle}>Derivations and paradigms — every claim proven.</Text>

                {/* U13/P21: enter the canon reader. Reading is never graded (U13-3). */}
                <Pressable
                  onPress={() => { haptics.tap(); navigation.navigate("Reader"); }}
                  style={({ pressed }) => [styles.readerCard, pressed && styles.readerCardPressed]}
                  accessibilityRole="button"
                  accessibilityLabel="Open the reader — a scroll of verses you can tap word by word"
                >
                  <View style={styles.readerIcon}>
                    <Ionicons name="library-outline" size={22} color={color.saffron} />
                  </View>
                  <View style={styles.readerText}>
                    <Text style={styles.readerTitle}>Read</Text>
                    <Text style={styles.readerSub}>Open a verse and tap any word.</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={color.inkSoft} />
                </Pressable>

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
    readerCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: space.sm,
      backgroundColor: color.surface,
      borderRadius: radius.lg,
      padding: space.md,
      marginBottom: space.md,
      ...shadow.card,
    },
    readerCardPressed: { transform: [{ translateY: 2 }] },
    readerIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: color.saffronLight, alignItems: "center", justifyContent: "center" },
    readerText: { flex: 1 },
    readerTitle: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.base, color: color.ink },
    readerSub: { fontFamily: "Nunito_400Regular", fontWeight: "400", fontSize: font.sizes.sm, color: color.inkSoft, marginTop: 2 },
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
