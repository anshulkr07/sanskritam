// Vocab — the vocabulary screen (U14-4 / P22-5).
//
// Reached from a Play-tab card (never a seventh tab — U8-1). A topic
// selector (the 10 situation slugs) above a frequency-ordered word list.
// Each card: Devanagari + IAST large, gloss, gender, stem, tap-to-ask
// (ask-anywhere sheet). Audio plays from a pre-rendered URL when the row
// carries one — none of the seeded rows do yet, so no play button renders
// rather than a dead one (§2.11: a silent empty result is a bug).
//
// Data (Track C4): topics + words load through useQuery — cached 60s,
// deduped in-flight, never setState after unmount. The word list is a
// FlatList (the 60-word seed grows to 500); the topic chips stay a small
// horizontal ScrollView in the list header.

import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import React, { useCallback, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api, type VocabTopic, type VocabWord } from "../api/client";
import { useQuery } from "../hooks/useQuery";
import { useTypeScale } from "../hooks/useTypeScale";
import { useAsk } from "../ask/AskProvider";
import { Button, EmptyState } from "../components/ui";
import { Skeleton, SkeletonGroup } from "../components/Skeleton";
import type { RootStackParamList } from "../navigation/types";
import { color, font, radius, script, shadow, space } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Vocab">;

export default function VocabScreen({ route }: Props) {
  const { open } = useAsk();
  const { sized } = useTypeScale();
  // null = no topic chosen yet: follow the route param, else the first
  // loaded topic — never a hardcoded "family" that may not exist.
  const [topic, setTopic] = useState<string | null>(route.params?.topic ?? null);

  // A Play card can route here with a new topic while mounted — follow it.
  const paramTopic = route.params?.topic;
  React.useEffect(() => {
    if (paramTopic) setTopic(paramTopic);
  }, [paramTopic]);

  const topicsQ = useQuery<{ topics: VocabTopic[] }>("vocab-topics", api.vocabTopics);
  const topics = topicsQ.data?.topics ?? [];
  // Default to the first real topic once the list lands.
  React.useEffect(() => {
    if (topic == null && topics.length > 0) setTopic(topics[0].slug);
  }, [topic, topics]);
  const activeTopic = topic ?? topics[0]?.slug ?? "";
  const wordsQ = useQuery<VocabWord[]>(
    `vocab-${activeTopic || "none"}`,
    () => (activeTopic ? api.vocab(activeTopic) : Promise.resolve([])),
  );
  const words = wordsQ.data;
  const loading = wordsQ.loading;
  const failed = wordsQ.failed;

  const ask = useCallback(
    (w: VocabWord) => open({ surface: "vocab", subject: w.devanagari }),
    [open],
  );

  const renderWord = useCallback(
    ({ item: w }: { item: VocabWord }) => (
      <Pressable
        key={`${w.topic}-${w.devanagari}`}
        onPress={() => ask(w)}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        accessibilityRole="button"
        accessibilityLabel={`${w.devanagari}. ${w.gloss}. Ask about this word.`}
      >
        <View style={styles.cardMain}>
          <Text style={[styles.sa, script("bold"), { fontSize: sized(font.sizes.lg, { sanskrit: true }) }]}>{w.devanagari}</Text>
          <Text style={[styles.iast, { fontSize: sized(font.sizes.sm) }]}>{w.iast}</Text>
          <Text style={[styles.gloss, { fontSize: sized(font.sizes.base) }]}>{w.gloss}</Text>
          {(w.gender || w.stem) && (
            <Text style={styles.meta}>
              {[w.gender, w.stem ? `stem ${w.stem}` : ""].filter(Boolean).join(" · ")}
            </Text>
          )}
        </View>
        <Ionicons name="help-circle-outline" size={20} color={color.saffron} />
      </Pressable>
    ),
    [ask, sized],
  );

  const header = (
    <View>
      <Text style={[styles.title, { fontSize: sized(font.sizes.xl) }]}>Words</Text>
      <Text style={[styles.subtitle, { fontSize: sized(font.sizes.sm) }]}>The most-used words first, by topic.</Text>

      {/* Topic selector — horizontal chips, ≥44pt touch rows nearby. */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.topics}>
        {topics.map((t) => {
          const active = t.slug === activeTopic;
          return (
            <Pressable
              key={t.slug}
              onPress={() => setTopic(t.slug)}
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
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      {loading && !words ? (
        <ScrollView contentContainerStyle={styles.body}>
          {header}
          <SkeletonGroup count={5} height={76} radius={radius.lg} />
        </ScrollView>
      ) : failed || !words ? (
        <ScrollView contentContainerStyle={styles.body}>
          {header}
          <View style={styles.errorCard}>
            <Text style={[styles.errorTitle, { fontSize: sized(font.sizes.base) }]}>Couldn't load the words.</Text>
            <Text style={[styles.errorSub, { fontSize: sized(font.sizes.sm) }]}>Check your connection and try again.</Text>
            <Button label="Retry" onPress={wordsQ.retry} style={{ marginTop: space.md }} />
          </View>
        </ScrollView>
      ) : (
        <FlatList
          data={words}
          keyExtractor={(w) => `${w.topic}-${w.devanagari}`}
          renderItem={renderWord}
          contentContainerStyle={styles.body}
          ListHeaderComponent={header}
          ListEmptyComponent={
            <EmptyState title="No words here yet." hint="This topic's list is being written." />
          }
          initialNumToRender={12}
          accessibilityLabel="Vocabulary words"
        />
      )}
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
