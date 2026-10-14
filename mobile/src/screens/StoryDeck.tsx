// StoryDeck — Introduction to Sanskrit, the swipeable basics→advanced story.
//
// ~40 backend-driven cards in 7 chapters, from "what is Sanskrit?" to
// sandhi/samāsa/kāraka. Horizontal paging (swipe left/right) PLUS Prev/Next
// buttons — swipe is never the only path (Reduce Motion, screen readers).
// Cards with a dive-deeper button route into screens that already exist.
//
// Read-only: paging writes no mastery and no review rows. The only write is
// the device-local bookmark (services/storyProgress).
//
// Rules: light theme only; script() on every Devanagari node; 18pt floor
// for Sanskrit body text (sized(..., { sanskrit: true })); every Pressable
// carries role + label; page changes are announced for screen readers.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView, useSafeAreaFrame } from "react-native-safe-area-context";

import { api, type StoryCard } from "../api/client";
import { Button, ProgressBar } from "../components/ui";
import { Skeleton } from "../components/Skeleton";
import { useQuery } from "../hooks/useQuery";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { useTypeScale } from "../hooks/useTypeScale";
import type { RootStackParamList } from "../navigation/types";
import { haptics } from "../services/haptics";
import { getStoryIndex, setStoryIndex, completeStory } from "../services/storyProgress";
import { color, font, radius, script, shadow, space } from "../theme";
import { plain } from "../utils/text";

type Props = NativeStackScreenProps<RootStackParamList, "Story">;

interface FlatCard {
  key: string;
  chapterEyebrow: string;
  card: StoryCard;
}

// Tab destinations resolve through the MainTabs navigator; stack screens
// resolve directly. (Precedent: Play.tsx navigates tabs by bare name with
// `as never`; from a stack screen the path goes through MainTabs.)
const TAB_TARGETS = new Set(["Conversation", "Learn", "Play", "Read"]);

export default function StoryDeckScreen({ navigation }: Props) {
  const { sized } = useTypeScale();
  const reduced = useReducedMotion();
  const { width } = useSafeAreaFrame();
  const listRef = useRef<FlatList<FlatCard>>(null);
  const [index, setIndex] = useState(0);
  const visibleIndex = useRef(0);
  visibleIndex.current = index;
  const [resumed, setResumed] = useState(false);
  const { data: chapters, loading, failed, retry } = useQuery(
    "story-chapters",
    api.storyChapters,
  );

  const flat: FlatCard[] = useMemo(() => {
    if (!chapters) return [];
    const out: FlatCard[] = [];
    for (const ch of chapters) {
      for (const card of ch.cards) {
        out.push({
          key: card.id,
          chapterEyebrow: `Chapter ${ch.rank + 1} · ${ch.title_en}`,
          card,
        });
      }
    }
    return out;
  }, [chapters]);

  const total = flat.length;
  useEffect(() => {
    if (total) listRef.current?.scrollToOffset({ offset: visibleIndex.current * width, animated: false });
  }, [width, total]);

  // Resume the device-local bookmark once the cards have loaded.
  useEffect(() => {
    if (resumed || flat.length === 0) return;
    setResumed(true);
    getStoryIndex().then((saved) => {
      const at = Math.min(saved, flat.length - 1);
      if (at > 0) {
        setIndex(at);
        // Jump without animation on mount — the learner asked to resume,
        // not to watch a fast-forward.
        requestAnimationFrame(() => {
          listRef.current?.scrollToIndex({ index: at, animated: false });
        });
      }
    });
  }, [flat, resumed]);

  const goTo = useCallback(
    (next: number) => {
      if (next < 0 || next >= total) return;
      haptics.tap();
      setIndex(next);
      setStoryIndex(next);
      listRef.current?.scrollToIndex({ index: next, animated: !reduced });
      AccessibilityInfo.announceForAccessibility(`Card ${next + 1} of ${total}`);
    },
    [total, reduced],
  );

  const onViewable = useCallback(
    ({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
      const at = viewableItems[0]?.index;
      if (at != null && at !== visibleIndex.current) {
        visibleIndex.current = at;
        setIndex(at);
        setStoryIndex(at);
      }
    },
    [],
  );

  const goDeep = useCallback(
    (target: string, actionLabel = "") => {
      if (!target || target === "none") return;
      haptics.tap();
      // The old Path screen is now the Learn trail.
      const link = target === "Path" ? "Learn" : target;
      // The story's sandhi cards used to point at the whole Play tab.
      // Send their specific action to the existing two-word sandhi tool.
      if (link === "Play" && actionLabel.toLowerCase().includes("sandhi")) {
        navigation.navigate("SandhiPractice");
        return;
      }
      if (TAB_TARGETS.has(link)) {
        // Stack → tab: route through the MainTabs navigator. The cast is
        // the same `as never` precedent Play.tsx uses for tab targets.
        (navigation.navigate as unknown as (s: string, p?: object) => void)(
          "MainTabs",
          { screen: "Tabs", params: { screen: link } },
        );
        return;
      }
      switch (link) {
        case "Paradigm":
          navigation.navigate("Paradigm", { kind: "noun" });
          break;
        case "WordOrder":
          navigation.navigate("WordOrder", {});
          break;
        case "Sandhi":
          navigation.navigate("SandhiPractice");
          break;
        case "Vocab":
          navigation.navigate("Vocab", {});
          break;
        case "Varnamala":
        case "Grammar":
        case "Writing":
        case "Shloka":
        case "Pingala":
        case "DailyWord":
          navigation.navigate(link as never);
          break;
        default:
          break;
      }
    },
    [navigation],
  );

  const renderCard = useCallback(
    ({ item }: { item: FlatCard }) => (
      <StoryPage
        item={item}
        pageWidth={width}
        onDeepLink={goDeep}
      />
    ),
    [width, goDeep],
  );

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      {loading && flat.length === 0 ? (
        <View style={styles.body} accessible accessibilityRole="progressbar" accessibilityLabel="Loading the Sanskrit story">
          <Text style={[styles.kicker, { fontSize: sized(font.sizes.sm) }]}>Introduction to Sanskrit</Text>
          <Skeleton style={{ height: 220, marginTop: space.sm }} />
          <Skeleton style={{ height: 48, marginTop: space.sm }} />
        </View>
      ) : failed && flat.length === 0 ? (
        <View style={styles.body}>
          <Text style={[styles.kicker, { fontSize: sized(font.sizes.sm) }]}>Introduction to Sanskrit</Text>
          <View style={[styles.errorCard, shadow.card]}>
            <Text style={[styles.errorTitle, { fontSize: sized(font.sizes.base) }]}>Couldn't load the story.</Text>
            <Text style={[styles.errorSub, { fontSize: sized(font.sizes.sm) }]}>
              Check your connection and try again.
            </Text>
            <Button cornerRadius={4} label="Retry" onPress={retry} style={{ marginTop: space.md }} />
          </View>
        </View>
      ) : (
        <>
          <View style={styles.progressRow}>
            <Text style={[styles.counter, { fontSize: sized(font.sizes.sm) }]}>
              {total === 0 ? "…" : `${index + 1}/${total}`}
            </Text>
            <View style={styles.barWrap}>
              <ProgressBar progress={total === 0 ? 0 : (index + 1) / total} height={8} />
            </View>
          </View>
          <FlatList
            ref={listRef}
            data={flat}
            keyExtractor={(it) => it.key}
            renderItem={renderCard}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialNumToRender={3}
            maxToRenderPerBatch={3}
            windowSize={3}
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
            onViewableItemsChanged={onViewable}
            viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
            accessibilityLabel="Sanskrit story cards. Swipe left or right to move."
          />
          <View style={styles.navRow}>
            <Pressable
              onPress={() => goTo(index - 1)}
              disabled={index === 0}
              style={[styles.navBtn, index === 0 && styles.navDisabled]}
              accessibilityRole="button"
              accessibilityLabel="Previous card"
              accessibilityState={{ disabled: index === 0 }}
            >
              <Ionicons name="chevron-back" size={20} color={index === 0 ? color.inkFaint : color.saffron} />
              <Text style={[styles.navText, index === 0 && styles.navTextDisabled]}>Back</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                if (index >= total - 1) {
                  void completeStory().then(() => navigation.goBack());
                } else goTo(index + 1);
              }}
              disabled={total === 0}
              style={styles.navBtn}
              accessibilityRole="button"
              accessibilityLabel={index >= total - 1 ? "Finish introduction" : `Next card, ${index + 2} of ${total}`}
              accessibilityState={{ disabled: total === 0 }}
            >
              <Text style={styles.navText}>{index >= total - 1 ? "Finish" : "Next"}</Text>
              <Ionicons name="chevron-forward" size={20} color={index >= total - 1 ? color.inkFaint : color.saffron} />
            </Pressable>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

function StoryPage({
  item,
  pageWidth,
  onDeepLink,
}: {
  item: FlatCard;
  pageWidth: number;
  onDeepLink: (link: string, label?: string) => void;
}) {
  const { sized } = useTypeScale();
  const { card } = item;
  const hasExample = card.example_dev.length > 0;
  const hasLink = card.deep_link !== "none";
  return (
    <ScrollView style={{ width: pageWidth }} contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
      <View style={[styles.card, shadow.card]}>
        <Text style={[styles.eyebrow, { fontSize: sized(font.sizes.xs) }]}>{item.chapterEyebrow}</Text>
        <Text style={[styles.titleSa, script("bold"), { fontSize: sized(font.sizes.lg, { sanskrit: true }) }]}>
          {card.title_hi}
        </Text>
        <Text style={[styles.titleEn, { fontSize: sized(font.sizes.md) }]}>{plain(card.title_en)}</Text>
        <Text style={[styles.cardBody, { fontSize: sized(font.sizes.base) }]}>{plain(card.body)}</Text>
        {hasExample && (
          <View style={styles.exampleBox}>
            <Text style={[styles.exampleDev, script("semibold"), { fontSize: sized(font.sizes.lg, { sanskrit: true }) }]}>
              {card.example_dev}
            </Text>
            {card.example_iast.length > 0 && (
              <Text style={[styles.exampleIast, { fontSize: sized(font.sizes.sm) }]}>{card.example_iast}</Text>
            )}
            {card.example_gloss.length > 0 && (
              <Text style={[styles.exampleGloss, { fontSize: sized(font.sizes.sm) }]}>{plain(card.example_gloss)}</Text>
            )}
          </View>
        )}
        {hasLink && (
          <Button cornerRadius={4}
            label={card.deep_link_label || "Explore"}
            onPress={() => onDeepLink(card.deep_link, card.deep_link_label)}
            tone="neutral"
            size="md"
            block
            style={{ marginTop: space.md }}
            accessibilityLabel={`${card.deep_link_label || "Explore"}. Opens related practice.`}
          />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg },
  body: { padding: space.lg, paddingBottom: 120 },
  kicker: {
    fontFamily: "Nunito_800ExtraBold",
    fontWeight: "800",
    color: color.saffron,
  },
  errorCard: {
    backgroundColor: color.surface,
    borderRadius: 4,
    padding: space.lg,
    marginTop: space.sm,
  },
  errorTitle: {
    fontFamily: "Nunito_700Bold",
    fontWeight: "700",
    color: color.ink,
  },
  errorSub: {
    fontFamily: "Nunito_400Regular",
    fontWeight: "400",
    color: color.inkSoft,
    marginTop: 4,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
  },
  counter: {
    fontFamily: "Nunito_700Bold",
    fontWeight: "700",
    color: color.inkSoft,
    minWidth: 52,
  },
  barWrap: { flex: 1 },
  page: { paddingHorizontal: space.lg, paddingVertical: space.md, justifyContent: "center" },
  card: {
    backgroundColor: color.surface,
    borderRadius: 4,
    padding: space.lg,
  },
  eyebrow: {
    fontFamily: "Nunito_700Bold",
    fontWeight: "700",
    color: color.saffron,
    marginBottom: space.xs,
  },
  titleSa: { color: color.ink },
  titleEn: {
    fontFamily: "Nunito_800ExtraBold",
    fontWeight: "800",
    color: color.ink,
    marginTop: 2,
  },
  cardBody: {
    fontFamily: "Nunito_400Regular",
    fontWeight: "400",
    color: color.ink,
    marginTop: space.sm,
    lineHeight: 24,
  },
  exampleBox: {
    backgroundColor: color.surfaceMuted,
    borderRadius: 4,
    padding: space.md,
    marginTop: space.md,
  },
  exampleDev: { color: color.ink },
  exampleIast: {
    fontFamily: "Nunito_500Medium",
    fontStyle: "italic",
    fontWeight: "500",
    color: color.inkSoft,
    marginTop: 2,
  },
  exampleGloss: {
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600",
    color: color.inkSoft,
    marginTop: 2,
  },
  navRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: space.lg,
    paddingBottom: space.md,
  },
  navBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    minHeight: 44,
    paddingHorizontal: space.md,
    borderRadius: 4,
    backgroundColor: color.surface,
    ...shadow.card,
  },
  navDisabled: { opacity: 0.55 },
  navText: {
    fontFamily: "Nunito_700Bold",
    fontWeight: "700",
    fontSize: font.sizes.base,
    color: color.saffron,
  },
  navTextDisabled: { color: color.inkFaint },
});
