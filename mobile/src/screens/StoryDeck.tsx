// StoryDeck — Discover Sanskrit, the swipeable basics→advanced story.
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
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api, type StoryCard } from "../api/client";
import { Button, ProgressBar } from "../components/ui";
import { Skeleton } from "../components/Skeleton";
import { useQuery } from "../hooks/useQuery";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { useTypeScale } from "../hooks/useTypeScale";
import type { RootStackParamList } from "../navigation/types";
import { haptics } from "../services/haptics";
import { getStoryIndex, setStoryIndex } from "../services/storyProgress";
import { color, font, radius, script, shadow, space } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Story">;

interface FlatCard {
  key: string;
  chapterEyebrow: string;
  card: StoryCard;
}

// Tab destinations resolve through the MainTabs navigator; stack screens
// resolve directly. (Precedent: Play.tsx navigates tabs by bare name with
// `as never`; from a stack screen the path goes through MainTabs.)
const TAB_TARGETS = new Set(["Conversation", "Path", "Play", "Grammar", "Read"]);

export default function StoryDeckScreen({ navigation }: Props) {
  const { sized } = useTypeScale();
  const reduced = useReducedMotion();
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<FlatCard>>(null);
  const [index, setIndex] = useState(0);
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
      if (at != null && at !== index) {
        setIndex(at);
        setStoryIndex(at);
      }
    },
    [index],
  );

  const goDeep = useCallback(
    (link: string) => {
      if (!link || link === "none") return;
      haptics.tap();
      if (TAB_TARGETS.has(link)) {
        // Stack → tab: route through the MainTabs navigator. The cast is
        // the same `as never` precedent Play.tsx uses for tab targets.
        (navigation.navigate as unknown as (s: string, p?: object) => void)(
          "MainTabs",
          { screen: link },
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
        case "Vocab":
          navigation.navigate("Vocab", {});
          break;
        case "Varnamala":
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
          <Text style={[styles.kicker, { fontSize: sized(font.sizes.sm) }]}>Discover Sanskrit</Text>
          <Skeleton style={{ height: 220, marginTop: space.sm }} />
          <Skeleton style={{ height: 48, marginTop: space.sm }} />
        </View>
      ) : failed && flat.length === 0 ? (
        <View style={styles.body}>
          <Text style={[styles.kicker, { fontSize: sized(font.sizes.sm) }]}>Discover Sanskrit</Text>
          <View style={[styles.errorCard, shadow.card]}>
            <Text style={[styles.errorTitle, { fontSize: sized(font.sizes.base) }]}>Couldn't load the story.</Text>
            <Text style={[styles.errorSub, { fontSize: sized(font.sizes.sm) }]}>
              Check your connection — your bookmark is safe.
            </Text>
            <Button label="Retry" onPress={retry} style={{ marginTop: space.md }} />
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
              onPress={() => goTo(index + 1)}
              disabled={index >= total - 1}
              style={[styles.navBtn, index >= total - 1 && styles.navDisabled]}
              accessibilityRole="button"
              accessibilityLabel={index >= total - 1 ? "Last card" : `Next card, ${index + 2} of ${total}`}
              accessibilityState={{ disabled: index >= total - 1 }}
            >
              <Text style={[styles.navText, index >= total - 1 && styles.navTextDisabled]}>Next</Text>
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
  onDeepLink: (link: string) => void;
}) {
  const { sized } = useTypeScale();
  const { card } = item;
  const hasExample = card.example_dev.length > 0;
  const hasLink = card.deep_link !== "none";
  return (
    <View style={[styles.page, { width: pageWidth }]}>
      <View style={[styles.card, shadow.card]}>
        <Text style={[styles.eyebrow, { fontSize: sized(font.sizes.xs) }]}>{item.chapterEyebrow}</Text>
        <Text style={[styles.titleSa, script("bold"), { fontSize: sized(font.sizes.lg, { sanskrit: true }) }]}>
          {card.title_hi}
        </Text>
        <Text style={[styles.titleEn, { fontSize: sized(font.sizes.md) }]}>{card.title_en}</Text>
        <Text style={[styles.cardBody, { fontSize: sized(font.sizes.base) }]}>{card.body}</Text>
        {hasExample && (
          <View style={styles.exampleBox}>
            <Text style={[styles.exampleDev, script("semibold"), { fontSize: sized(font.sizes.lg, { sanskrit: true }) }]}>
              {card.example_dev}
            </Text>
            {card.example_iast.length > 0 && (
              <Text style={[styles.exampleIast, { fontSize: sized(font.sizes.sm) }]}>{card.example_iast}</Text>
            )}
            {card.example_gloss.length > 0 && (
              <Text style={[styles.exampleGloss, { fontSize: sized(font.sizes.sm) }]}>{card.example_gloss}</Text>
            )}
          </View>
        )}
        {hasLink && (
          <Button
            label={card.deep_link_label || "Explore"}
            onPress={() => onDeepLink(card.deep_link)}
            tone="neutral"
            size="md"
            block
            style={{ marginTop: space.md }}
            accessibilityLabel={`${card.deep_link_label || "Explore"}. Opens related practice.`}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg },
  body: { padding: space.lg, paddingBottom: space.xxl * 2 },
  kicker: {
    fontFamily: "Nunito_800ExtraBold",
    fontWeight: "800",
    color: color.saffron,
  },
  errorCard: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
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
    borderRadius: radius.xl,
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
    borderRadius: radius.lg,
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
    borderRadius: radius.md,
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
