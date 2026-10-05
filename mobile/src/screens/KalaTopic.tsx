// KalaTopic — one basics card of Kāla, opened full page.
//
// The same frame as a chapter (KalaChapter): where you are, the title, the
// Sanskrit word on a deep fill with what it means, the card's one line,
// then the card's own chart and steps (kala/topics), a way into the chapter
// that goes further, and a bar to the next card.
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
import { chapterById } from "../kala/chapters";
import AyanaTopic from "../kala/topics/AyanaTopic";
import KalpaTopic from "../kala/topics/KalpaTopic";
import ManvantaraTopic from "../kala/topics/ManvantaraTopic";
import MasaTopic from "../kala/topics/MasaTopic";
import NakshatraTopic from "../kala/topics/NakshatraTopic";
import PakshaTopic from "../kala/topics/PakshaTopic";
import RituTopic from "../kala/topics/RituTopic";
import TimeTopic from "../kala/topics/TimeTopic";
import TithiTopic from "../kala/topics/TithiTopic";
import type { TopicProps } from "../kala/topics/types";
import VaraTopic from "../kala/topics/VaraTopic";
import YugaTopic from "../kala/topics/YugaTopic";
import { TOPICS, topicById, type TopicId } from "../kala/topics";
import { labelOn, Sa } from "../kala/ui";
import { useToday } from "../kala/useToday";
import type { RootStackParamList } from "../navigation/types";
import { haptics } from "../services/haptics";
import { romanName } from "../kala/today";
import { color, fill, font, onFill, space } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "KalaTopic">;

const BODIES: Record<TopicId, React.ComponentType<TopicProps>> = {
  kala: TimeTopic,
  kalpa: KalpaTopic,
  manvantara: ManvantaraTopic,
  yuga: YugaTopic,
  ayana: AyanaTopic,
  ritu: RituTopic,
  masa: MasaTopic,
  paksha: PakshaTopic,
  tithi: TithiTopic,
  vara: VaraTopic,
  nakshatra: NakshatraTopic,
};

/** The page's side padding: 16dp, as everywhere (HANDOVER section 2). */
const SIDE = space.md;

export default function KalaTopicScreen({ route, navigation }: Props) {
  const meta = topicById(route.params.topic);
  const index = TOPICS.indexOf(meta);
  const next = index + 1 < TOPICS.length ? TOPICS[index + 1] : null;
  const chapter = meta.chapter ? chapterById(meta.chapter) : null;
  const focused = useIsFocused();
  const today = useToday(focused);
  const { width } = useWindowDimensions();
  const { sized } = useTypeScale();
  const scrollRef = React.useRef<ScrollView>(null);

  useAskContext("calendar", meta.word.nom);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [meta.id]);

  const Body = BODIES[meta.id];
  const label = labelOn(meta.tone);

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.progressTrack} accessible={false}>
          <View style={[styles.progressFill, { backgroundColor: fill[meta.tone], width: `${((index + 1) / TOPICS.length) * 100}%` }]} />
        </View>
        <Text style={[styles.eyebrow, { color: fill[meta.tone] }]}>
          Basics · {index + 1} of {TOPICS.length}
        </Text>
        <Text style={[styles.title, { fontSize: sized(font.sizes.xl) }]} accessibilityRole="header">
          {meta.title}
        </Text>

        <View style={[styles.term, { backgroundColor: fill[meta.tone] }]} accessible accessibilityLabel={`${romanName(meta.word)}: ${meta.meaning}.`}>
          <Sa size={30} weight="bold" on="fill">
            {meta.word.nom}
          </Sa>
          <Text style={[styles.termRoman, { color: label }]}>{meta.word.nomIast}</Text>
          <Text style={[styles.termMeaning, { fontSize: sized(font.sizes.base) }]}>{meta.meaning}</Text>
        </View>

        <Text style={[styles.summary, { fontSize: sized(17), lineHeight: Math.round(sized(17) * 1.5) }]}>{meta.hook}</Text>

        {today.failed ? (
          <View style={styles.failed}>
            <Text style={styles.failedText}>Couldn't work out today's date.</Text>
            <Button label="Try again" size="md" onPress={today.retry} />
          </View>
        ) : (
          <Body
            key={`${meta.id}${route.params.month ?? ""}`}
            today={today}
            tone={meta.tone}
            width={width - 2 * SIDE}
            month={route.params.month}
            scrollToTop={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}
          />
        )}

        {chapter && (
          <Pressable
            onPress={() => {
              haptics.tap();
              navigation.navigate("KalaChapter", { chapter: chapter.id });
            }}
            style={({ pressed }) => [styles.further, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={`Go further: the chapter ${chapter.title}`}
          >
            <View style={styles.furtherText}>
              <Text style={styles.furtherLabel}>Go further</Text>
              <Text style={styles.furtherTitle}>Chapter: {chapter.title}</Text>
            </View>
            <Text style={styles.furtherArrow} accessible={false}>
              ›
            </Text>
          </Pressable>
        )}

        <Pressable
          onPress={() => {
            haptics.tap();
            if (next) navigation.setParams({ topic: next.id, month: undefined });
            else navigation.navigate("Kala");
          }}
          style={({ pressed }) => [styles.nextBar, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={next ? `Next: ${next.title}` : "Back to Kāla"}
        >
          <Text style={styles.nextLabel}>{next ? "Next" : "Done"}</Text>
          <Text style={styles.nextTitle} numberOfLines={1}>
            {next ? next.title : "Back to Kāla"}
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
  further: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    minHeight: 60,
    marginTop: space.md,
    paddingHorizontal: space.md,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: color.ink,
  },
  furtherText: { flex: 1, minWidth: 0 },
  furtherLabel: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 11.5, letterSpacing: 0.6, textTransform: "uppercase", color: color.inkSoft },
  furtherTitle: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 16, color: color.ink },
  furtherArrow: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 28, color: color.ink, marginTop: -4 },
  nextBar: { borderRadius: 12, padding: space.md, gap: 2, backgroundColor: fill.ink, minHeight: 64, justifyContent: "center" },
  pressed: { opacity: 0.85 },
  nextLabel: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", color: onFill.gold, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6 },
  nextTitle: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", color: onFill.text, fontSize: 16 },
});
