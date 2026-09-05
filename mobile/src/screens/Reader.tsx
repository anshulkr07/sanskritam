// Reader — the canon, made readable (U13 / HANDOVER P21-1).
//
// Two postures, one screen:
//   • INDEX — a vertical scroll of collapsed verse cards (the list is the
//     contents page, not a pager; U13-1). Tap a card to read it.
//   • READING — one verse as a full page, with a 3D page-turn to the
//     adjacent verse (PageFlip, U13). Reading is a book: fold, turn, unfold.
//
// Tap a word inside a page for its gloss + features straight from the
// word_breakdown the backend already ships, and use the Ask sheet for a
// deeper engine/model answer — both local/₹0 paths before any LLM.
//
// Reading, not drilling (U13-3): no verdict, no streak, no score, no meter of
// any kind. Someone reading the Gītā at night is not in a session.
//
// Rules this screen honours:
//   - The corpus comes from GET /shlokas (date-ordered, instrumented).
//   - Words are rendered from word_breakdown, NOT split from the verse text —
//     sandhi fuses boundaries, and the breakdown is the trustworthy tokeniser.
//   - A failed fetch says so and offers retry (U10-3) — never a silent empty
//     list and never an infinite skeleton.
//   - Every text that may hold Sanskrit uses script() (§3.2).
//   - No TTS in the list (P21: audio goes only on what is studied).
//   - Page-turns are cosmetic: skippable (§3.7) and absent under Reduce Motion
//     (§3.4). The content swap is what matters, never blocked by the flip.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import React, { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import { api, type Shloka, type WordBreakdown } from "../api/client";
import { useAsk } from "../ask/AskProvider";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { EmptyState, Button } from "../components/ui";
import { Skeleton, SkeletonGroup } from "../components/Skeleton";
import PageFlip from "../components/PageFlip";
import { color, font, radius, script, shadow, space } from "../theme";

function ReaderSkeleton() {
  return (
    <>
      <Skeleton width={160} height={14} radius={radius.sm} style={{ marginBottom: space.md }} />
      <SkeletonGroup count={4} height={70} radius={radius.lg} />
    </>
  );
}

export default function ReaderScreen() {
  const [verses, setVerses] = useState<Shloka[] | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  // null = index posture; set = reading posture at that verse index.
  const [pageIndex, setPageIndex] = useState<number | null>(null);
  const [flipDir, setFlipDir] = useState<"forward" | "back">("forward");
  const [selected, setSelected] = useState<WordBreakdown | null>(null);
  const reduced = useReducedMotion();
  const { open } = useAsk();

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    api
      .listShlokas()
      .then(setVerses)
      .catch(() => {
        setError(true);
        setVerses(null);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ScrollView contentContainerStyle={styles.body}>
          <ReaderSkeleton />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (error || !verses || verses.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.center}>
          <EmptyState
            title={error ? "Couldn't load the reader." : "Nothing to read yet."}
            hint={error ? "Check your connection and try again." : "Verses will appear here."}
          />
          {error && <Button label="Try again" tone="primary" onPress={load} style={{ marginTop: space.md }} />}
        </View>
      </SafeAreaView>
    );
  }

  // READING posture — the verse as a page you flip through.
  if (pageIndex !== null) {
    const verse = verses[pageIndex];
    const hasPrev = pageIndex > 0;
    const hasNext = pageIndex < verses.length - 1;

    const go = (dir: "forward" | "back") => {
      const next = dir === "forward" ? pageIndex + 1 : pageIndex - 1;
      if (next < 0 || next >= verses.length) return;
      setSelected(null);
      setFlipDir(dir);
      setPageIndex(next);
    };

    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        {/* Reading header — back to the index, and the source/position. */}
        <View style={styles.readHeader}>
          <Pressable
            onPress={() => setPageIndex(null)}
            style={styles.headerBtn}
            accessibilityRole="button"
            accessibilityLabel="Back to the list of verses"
          >
            <Ionicons name="arrow-back" size={20} color={color.saffron} />
            <Text style={styles.headerBtnText}>List</Text>
          </Pressable>
          <Text style={styles.readPos}>
            {pageIndex + 1} / {verses.length}
          </Text>
          <View style={styles.headerBtnSpacer} />
        </View>

        {/* The page — folds and turns as pageIndex changes. */}
        <View style={styles.pageArea}>
          <PageFlip pageKey={verse.id} direction={flipDir} reducedMotion={reduced}>
            <ReaderPage
              verse={verse}
              selected={selected}
              onWordTap={(w) => {
                setSelected(w);
                open({ surface: "shloka", subject: w.word });
              }}
              onAskVerse={() => open({ surface: "shloka", subject: verse.devanagari })}
            />
          </PageFlip>
        </View>

        {/* Turn controls — tap the edges, or the buttons. ≥44pt (U5-4). */}
        <View style={styles.turnRow}>
          <Pressable
            onPress={() => go("back")}
            disabled={!hasPrev}
            style={[styles.turnBtn, !hasPrev && styles.turnBtnDisabled]}
            accessibilityRole="button"
            accessibilityLabel="Previous verse"
            accessibilityState={{ disabled: !hasPrev }}
          >
            <Ionicons name="chevron-back" size={22} color={hasPrev ? color.saffron : color.inkFaint} />
            <Text style={[styles.turnText, !hasPrev && styles.turnTextDisabled]}>Previous</Text>
          </Pressable>
          <Pressable
            onPress={() => go("forward")}
            disabled={!hasNext}
            style={[styles.turnBtn, !hasNext && styles.turnBtnDisabled]}
            accessibilityRole="button"
            accessibilityLabel="Next verse"
            accessibilityState={{ disabled: !hasNext }}
          >
            <Text style={[styles.turnText, !hasNext && styles.turnTextDisabled]}>Next</Text>
            <Ionicons name="chevron-forward" size={22} color={hasNext ? color.saffron : color.inkFaint} />
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // INDEX posture — the list of collapsed cards.
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.title}>Read</Text>
        <Text style={styles.subtitle}>
          Tap a verse to read it; in the page, tap any word or flip to the next.
        </Text>

        {verses.map((v, i) => {
          const firstLine = v.devanagari.split(/।\s*/)[0] || "";
          return (
            <Pressable
              key={v.id}
              onPress={() => {
                setPageIndex(i);
                setSelected(null);
                setFlipDir("forward");
              }}
              style={({ pressed }) => [styles.verseCard, pressed && styles.verseCardPressed]}
              accessibilityRole="button"
              accessibilityHint="Opens the verse as a page"
              accessibilityLabel={`${v.source_ref}. ${firstLine}।`}
            >
              <View style={styles.cardText}>
                <Text style={styles.cardSource}>{v.source_ref}</Text>
                <Text style={[styles.cardPreview, script("bold")]} numberOfLines={1}>
                  {firstLine}।
                </Text>
              </View>
              <View style={styles.cardIcon}>
                <Ionicons name="book" size={16} color={color.saffron} />
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

// ───────────────────────────────────────────────────────────────────────────

function ReaderPage({
  verse,
  selected,
  onWordTap,
  onAskVerse,
}: {
  verse: Shloka;
  selected: WordBreakdown | null;
  onWordTap: (w: WordBreakdown) => void;
  onAskVerse: () => void;
}) {
  const words = verse.word_breakdown ?? [];

  return (
    <View style={styles.page}>
      <Text style={styles.pageSource}>{verse.source_ref}</Text>
      <ScrollView style={styles.pageScroll} contentContainerStyle={styles.pageBody}>
        {words.length > 0 ? (
          <Text style={[styles.verse, script("bold")]}>
            {words.map((w, i) => {
              const active = selected?.word === w.word;
              return (
                <React.Fragment key={`${w.word}-${i}`}>
                  {i > 0 ? <Text> </Text> : null}
                  <Text
                    onPress={() => onWordTap(w)}
                    style={[styles.wordSpan, active && styles.wordSpanActive]}
                    accessibilityRole="button"
                    accessibilityLabel={`Tap to see ${w.word}. ${w.meaning ?? ""}`}
                    accessibilityState={{ selected: active }}
                  >
                    {w.word}
                  </Text>
                </React.Fragment>
              );
            })}
          </Text>
        ) : (
          <Text style={[styles.verse, script("bold")]}>{verse.devanagari}</Text>
        )}
        <Text style={styles.iast}>{verse.iast}</Text>

        {/* Selected-word gloss — straight from the row, ₹0 and instant. */}
        {selected && (
          <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(120)} style={styles.gloss}>
            <Text style={[styles.glossWord, script("bold")]}>{selected.word}</Text>
            {selected.meaning ? <Text style={styles.glossMeaning}>{selected.meaning}</Text> : null}
            {selected.features && selected.features.length > 0 ? (
              <View style={styles.featRow}>
                {selected.features.map((f) => (
                  <View key={f} style={styles.featChip}>
                    <Text style={styles.featText}>{f}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </Animated.View>
        )}

        <Pressable
          onPress={onAskVerse}
          style={styles.askVerse}
          accessibilityRole="button"
          accessibilityLabel="Ask about this whole verse"
        >
          <Ionicons name="help-circle-outline" size={16} color={color.saffronText} />
          <Text style={styles.askVerseText}>Ask about this verse</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: space.lg },
  body: { padding: space.lg, paddingBottom: space.xxl * 2 },
  title: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.xl, color: color.ink },
  subtitle: {
    fontFamily: "Nunito_400Regular",
    fontWeight: "400",
    fontSize: font.sizes.sm,
    color: color.inkSoft,
    marginTop: 2,
    marginBottom: space.lg,
    lineHeight: 20,
  },

  // Index cards
  verseCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    padding: space.md,
    marginBottom: space.sm,
    minHeight: 60,
    ...shadow.card,
  },
  verseCardPressed: { transform: [{ translateY: 2 }] },
  cardText: { flex: 1, marginRight: space.sm },
  cardSource: {
    fontFamily: "Nunito_800ExtraBold",
    fontWeight: "800",
    fontSize: font.sizes.xs,
    color: color.saffron,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  cardPreview: { fontSize: font.sizes.base, color: color.ink },
  cardIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: color.saffronLight, alignItems: "center", justifyContent: "center" },

  // Reading header
  readHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: space.xs,
  },
  headerBtn: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 44, minWidth: 64 },
  headerBtnText: { color: color.saffronText, fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.sm },
  headerBtnSpacer: { width: 64 },
  readPos: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.sm, color: color.inkSoft },

  // Page + its pad
  pageArea: { flex: 1, paddingHorizontal: space.lg },
  page: {
    flex: 1,
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    ...shadow.card,
  },
  pageScroll: { flex: 1 },
  pageBody: { padding: space.lg, paddingBottom: space.xl },
  pageSource: {
    fontFamily: "Nunito_800ExtraBold",
    fontWeight: "800",
    fontSize: font.sizes.xs,
    color: color.saffron,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
  },
  verse: { fontSize: font.sizes.xl, color: color.ink, lineHeight: 46 },
  wordSpan: { borderRadius: 6, padding: 2 },
  wordSpanActive: { backgroundColor: color.saffronLight, color: color.saffronDeep },
  iast: {
    fontFamily: "Nunito_500Medium",
    fontWeight: "500",
    fontSize: font.sizes.base,
    color: color.inkSoft,
    marginTop: space.md,
    lineHeight: 22,
  },
  gloss: {
    marginTop: space.lg,
    backgroundColor: color.bg,
    borderRadius: radius.md,
    padding: space.md,
    borderLeftWidth: 3,
    borderLeftColor: color.saffron,
  },
  glossWord: { fontSize: font.sizes.lg, color: color.ink },
  glossMeaning: {
    fontFamily: "Nunito_400Regular",
    fontWeight: "400",
    fontSize: font.sizes.base,
    color: color.ink,
    marginTop: 4,
    lineHeight: 22,
  },
  featRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: space.sm },
  featChip: { backgroundColor: color.surfaceMuted, borderRadius: radius.pill, paddingHorizontal: space.sm, paddingVertical: 3 },
  featText: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.xs, color: color.inkSoft },
  askVerse: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: space.md,
    minHeight: 44,
    alignSelf: "flex-start",
  },
  askVerseText: { color: color.saffronText, fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.sm },

  // Turn controls
  turnRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    gap: space.md,
  },
  turnBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    paddingHorizontal: space.lg,
    minHeight: 52,
    flex: 1,
    justifyContent: "center",
    ...shadow.card,
  },
  turnBtnDisabled: { opacity: 0.5 },
  turnText: { color: color.saffronText, fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.base },
  turnTextDisabled: { color: color.inkFaint },
});