// KalaChapter — one chapter of Kāla.
//
// The frame is the grammar guide's (GrammarTopic): where you are, the title,
// the Sanskrit term on a deep fill, the idea in one line, then the chapter's
// own charts, then a bar to the next chapter. The six bodies live in
// kala/chapters and are given the same live reading the Home card uses.
//
// Nothing here talks to the server: the whole section works offline.

import { useIsFocused } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAskContext } from "../ask/AskProvider";
import { Button } from "../components/ui";
import { useTypeScale } from "../hooks/useTypeScale";
import { CHAPTERS, chapterById, type ChapterId } from "../kala/chapters";
import CalendarsChapter from "../kala/chapters/CalendarsChapter";
import ClockChapter from "../kala/chapters/ClockChapter";
import MoonChapter from "../kala/chapters/MoonChapter";
import TodayChapter from "../kala/chapters/TodayChapter";
import type { ChapterProps } from "../kala/chapters/types";
import YearChapter from "../kala/chapters/YearChapter";
import YugaChapter from "../kala/chapters/YugaChapter";
import { labelOn, Sa } from "../kala/ui";
import { useToday } from "../kala/useToday";
import type { RootStackParamList } from "../navigation/types";
import { haptics } from "../services/haptics";
import { color, fill, font, onFill, space } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "KalaChapter">;

const BODIES: Record<ChapterId, React.ComponentType<ChapterProps>> = {
  today: TodayChapter,
  moon: MoonChapter,
  clock: ClockChapter,
  year: YearChapter,
  yugas: YugaChapter,
  calendars: CalendarsChapter,
};

/** The page's side padding: 16dp, as everywhere (HANDOVER section 2). */
const SIDE = space.md;

export default function KalaChapterScreen({ route, navigation }: Props) {
  const meta = chapterById(route.params.chapter);
  const index = CHAPTERS.indexOf(meta);
  const next = index + 1 < CHAPTERS.length ? CHAPTERS[index + 1] : null;
  const focused = useIsFocused();
  const today = useToday(focused);
  const { width } = useWindowDimensions();
  const { sized } = useTypeScale();
  const scrollRef = React.useRef<ScrollView>(null);

  useAskContext("calendar", meta.term?.sa ?? "");

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [meta.id]);

  const Body = BODIES[meta.id];
  const label = labelOn(meta.tone);

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.progressTrack} accessible={false}>
          <View style={[styles.progressFill, { backgroundColor: fill[meta.tone], width: `${((index + 1) / CHAPTERS.length) * 100}%` }]} />
        </View>
        <Text style={[styles.eyebrow, { color: fill[meta.tone] }]}>
          Chapter {index + 1} of {CHAPTERS.length}
        </Text>
        <Text style={[styles.title, { fontSize: sized(font.sizes.xl) }]} accessibilityRole="header">
          {meta.title}
        </Text>

        {meta.term && (
          <View style={[styles.term, { backgroundColor: fill[meta.tone] }]} accessible accessibilityLabel={`${meta.term.iast}: ${meta.term.meaning}.`}>
            <Sa size={30} weight="bold" on="fill">
              {meta.term.sa}
            </Sa>
            <Text style={[styles.termRoman, { color: label }]}>{meta.term.iast}</Text>
            <Text style={[styles.termMeaning, { fontSize: sized(font.sizes.base) }]}>{meta.term.meaning}</Text>
          </View>
        )}

        <Text style={[styles.summary, { fontSize: sized(17), lineHeight: Math.round(sized(17) * 1.5) }]}>{meta.summary}</Text>

        {today.failed ? (
          <View style={styles.failed}>
            <Text style={styles.failedText}>Couldn't work out today's date.</Text>
            <Button label="Try again" size="md" onPress={today.retry} />
          </View>
        ) : (
          <Body key={meta.id} today={today} tone={meta.tone} width={width - 2 * SIDE} />
        )}

        <Pressable
          onPress={() => {
            haptics.tap();
            if (next) navigation.setParams({ chapter: next.id });
            else navigation.navigate("Kala");
          }}
          style={({ pressed }) => [styles.nextBar, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={next ? `Next: ${next.title}` : "Back to all chapters"}
        >
          <Text style={styles.nextLabel}>{next ? "Next" : "Done"}</Text>
          <Text style={styles.nextTitle} numberOfLines={1}>
            {next ? next.title : "All chapters"}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg },
  body: { paddingHorizontal: SIDE, paddingTop: space.sm, paddingBottom: 120, gap: space.sm },
  progressTrack: { height: 3, backgroundColor: color.border, borderRadius: 2, overflow: "hidden" },
  progressFill: { height: 3, borderRadius: 2 },
  eyebrow: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.xs, textTransform: "uppercase", letterSpacing: 0.6 },
  title: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", color: color.ink, marginTop: -space.xs },
  term: { borderRadius: 12, padding: space.md, gap: 2 },
  termRoman: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: 13, fontStyle: "italic" },
  termMeaning: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", color: onFill.text },
  summary: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", color: color.ink },
  failed: { gap: space.sm, paddingVertical: space.md },
  failedText: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: 15, color: color.ink },
  nextBar: { borderRadius: 12, padding: space.md, gap: 2, backgroundColor: fill.ink, marginTop: space.md, minHeight: 64, justifyContent: "center" },
  pressed: { opacity: 0.85 },
  nextLabel: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", color: onFill.gold, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6 },
  nextTitle: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", color: onFill.text, fontSize: 16 },
});
