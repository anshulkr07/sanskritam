// Vocab — the vocabulary screen (U14-4 / P22-5).
//
// Reached from a Play-tab card (never a seventh tab — U8-1). A topic
// selector (the 10 situation slugs) above a frequency-ordered word list.
// Each card: Devanagari + IAST large, gloss, gender, stem, tap-to-ask
// (ask-anywhere sheet). Audio plays from a pre-rendered URL when the row
// carries one — none of the seeded rows do yet, so no play button renders
// rather than a dead one (§2.11: a silent empty result is a bug).

import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import React, { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api, type VocabTopic, type VocabWord } from "../api/client";
import { useAsk } from "../ask/AskProvider";
import { Button, EmptyState } from "../components/ui";
import { Skeleton, SkeletonGroup } from "../components/Skeleton";
import type { RootStackParamList } from "../navigation/types";
import { color, font, radius, script, shadow, space } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Vocab">;

export default function VocabScreen({ route }: Props) {
  const { open } = useAsk();
  const [topics, setTopics] = useState<VocabTopic[]>([]);
  const [topic, setTopic] = useState(route.params?.topic ?? "family");
  const [words, setWords] = useState<VocabWord[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.vocabTopics().then((d) => setTopics(d.topics)).catch(() => {});
  }, []);

  const load = useCallback(
    (slug: string) => {
      setTopic(slug);
      setLoading(true);
      setFailed(false);
      api
        .vocab(slug)
        .then(setWords)
        .catch(() => {
          setWords(null);
          setFailed(true);
        })
        .finally(() => setLoading(false));
    },
    [],
  );

  useEffect(() => {
    load(route.params?.topic ?? "family");
  }, [load, route.params?.topic]);

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.title}>Words</Text>
        <Text style={styles.subtitle}>The most-used words first, by topic.</Text>

        {/* Topic selector — horizontal chips, ≥44pt touch rows nearby. */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.topics}>
          {topics.map((t) => {
            const active = t.slug === topic;
            return (
              <Pressable
                key={t.slug}
                onPress={() => load(t.slug)}
                style={[styles.chip, active && styles.chipActive]}
                accessibilityRole="button"
                accessibilityLabel={`${t.title}`}
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{t.title}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {loading && !words ? (
          <SkeletonGroup count={5} height={76} radius={radius.lg} />
        ) : failed || !words ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Couldn't load the words.</Text>
            <Text style={styles.errorSub}>Check your connection and try again.</Text>
            <Button label="Retry" onPress={() => load(topic)} style={{ marginTop: space.md }} />
          </View>
        ) : words.length === 0 ? (
          <EmptyState title="No words here yet." hint="This topic's list is being written." />
        ) : (
          words.map((w) => (
            <Pressable
              key={`${w.topic}-${w.devanagari}`}
              onPress={() => open({ surface: "vocab", subject: w.devanagari })}
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
              accessibilityRole="button"
              accessibilityLabel={`${w.devanagari}. ${w.gloss}. Ask about this word.`}
            >
              <View style={styles.cardMain}>
                <Text style={[styles.sa, script("bold")]}>{w.devanagari}</Text>
                <Text style={styles.iast}>{w.iast}</Text>
                <Text style={styles.gloss}>{w.gloss}</Text>
                {(w.gender || w.stem) && (
                  <Text style={styles.meta}>
                    {[w.gender, w.stem ? `stem ${w.stem}` : ""].filter(Boolean).join(" · ")}
                  </Text>
                )}
              </View>
              <Ionicons name="help-circle-outline" size={20} color={color.saffron} />
            </Pressable>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg },
  body: { padding: space.lg, paddingBottom: space.xxl * 2 },
  title: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.xl, color: color.ink },
  subtitle: {
    fontFamily: "Nunito_400Regular",
    fontWeight: "400",
    fontSize: font.sizes.sm,
    color: color.inkSoft,
    marginBottom: space.md,
    lineHeight: 20,
  },
  topics: { marginBottom: space.md, marginHorizontal: -space.lg, paddingHorizontal: space.lg },
  chip: {
    backgroundColor: color.surface,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.border,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    marginRight: space.sm,
    minHeight: 44,
    justifyContent: "center",
  },
  chipActive: { backgroundColor: color.saffron, borderColor: color.saffron },
  chipText: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.sm, color: color.ink },
  chipTextActive: { color: color.white },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    padding: space.md,
    marginBottom: space.sm,
    ...shadow.card,
  },
  cardPressed: { transform: [{ translateY: 2 }] },
  cardMain: { flex: 1 },
  sa: { fontSize: font.sizes.lg, color: color.ink },
  iast: {
    fontFamily: "Nunito_500Medium",
    fontWeight: "500",
    fontSize: font.sizes.sm,
    color: color.inkSoft,
    marginTop: 2,
  },
  gloss: {
    fontFamily: "Nunito_400Regular",
    fontWeight: "400",
    fontSize: font.sizes.base,
    color: color.ink,
    marginTop: 2,
  },
  meta: {
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600",
    fontSize: font.sizes.xs,
    color: color.inkFaint,
    marginTop: 4,
  },
  errorCard: { backgroundColor: color.surface, borderRadius: radius.lg, padding: space.lg, ...shadow.card },
  errorTitle: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.base, color: color.ink },
  errorSub: {
    fontFamily: "Nunito_400Regular",
    fontWeight: "400",
    fontSize: font.sizes.sm,
    color: color.inkSoft,
    marginTop: 4,
  },
});
