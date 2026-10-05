// Kāla — time, as Sanskrit counts it. The hub behind the Home card.
//
// From the top: "Start here", eleven basics cards in a sideways row (time
// itself, then one for each line of "You are here", largest span first);
// the twelve months, each named after a star, with the learner's month
// marked; the six chapters, each tile carrying one live reading; and last
// "You are here", the present moment named at ten scales from the kalpa
// down to the star the Moon is in, each in the seventh case the way a date
// is spoken. Each of its lines opens the basics card that explains it, so a
// newcomer meets the words before the summary that uses them.
//
// Everything is worked out on the phone (kala/useToday): no network, no
// location permission, nothing sent anywhere.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import { useIsFocused } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, FadeInRight } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAskContext } from "../ask/AskProvider";
import { Button } from "../components/ui";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { useTypeScale } from "../hooks/useTypeScale";
import CalendarSheet from "../kala/CalendarSheet";
import { monthCards } from "../kala/basics";
import { CHAPTERS, DEEPER_APP, type ChapterId, type ChapterMeta } from "../kala/chapters";
import { MonthCard, TopicCard, useCardWidths } from "../kala/HubCards";
import { hubStats, ladder, traditionMonth, type HubStats } from "../kala/learn";
import { TOPICS, topicById, type TopicId } from "../kala/topics";
import { UNITS, WORDS } from "../kala/sanskritNames";
import { traditionById } from "../kala/traditions";
import { Ghost, labelOn, Panel, Sa, SectionLabel, useDeferred } from "../kala/ui";
import { useToday } from "../kala/useToday";
import { duration, stagger } from "../motion";
import type { RootStackParamList } from "../navigation/types";
import { haptics } from "../services/haptics";
import { color, fill, onFill, script, space } from "../theme";
import { firstAkshara } from "../utils/akshara";

type Props = NativeStackScreenProps<RootStackParamList, "Kala">;

/** The line of live reading each tile carries. */
function statFor(id: ChapterId, stats: HubStats | null, clockText: (d: Date) => string, tradition: string): string {
  if (id === "calendars") return `Yours: ${tradition}`;
  if (!stats) return "";
  switch (id) {
    case "today":
      return stats.sunEvent ? `${stats.sunEvent.kind === "sunset" ? "Sunset" : "Sunrise"} ${clockText(stats.sunEvent.at)}` : "";
    case "moon":
      return `${stats.litPercent}% lit`;
    case "clock":
      return stats.ghatika === null ? "" : `${stats.ghatika} ${UNITS[3].iast} since sunrise`;
    case "year":
      return `${stats.yearMonths} months this year`;
    default:
      return `Kali ${stats.kali}`;
  }
}

export default function KalaScreen({ navigation }: Props) {
  const focused = useIsFocused();
  const today = useToday(focused);
  const reduced = useReducedMotion();
  const { sized } = useTypeScale();
  const [sheetOpen, setSheetOpen] = useState(false);

  // Changing tradition retakes the reading: the last one stays up meanwhile.
  const held = useRef(today.snap);
  if (today.snap) held.current = today.snap;
  const snap = today.snap ?? held.current;

  const rows = useMemo(() => (snap ? ladder(snap) : null), [snap]);
  const nowRef = useRef(today.now);
  nowRef.current = today.now;
  const minute = Math.floor(today.now.getTime() / 60000);
  const { value: stats } = useDeferred(() => (snap ? hubStats(snap, nowRef.current) : null), [snap, minute]);

  useAskContext("calendar", WORDS.kala.nom);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={() => {
            haptics.tap();
            setSheetOpen(true);
          }}
          accessibilityRole="button"
          accessibilityLabel="Your calendar"
          style={styles.headerButton}
        >
          <Ionicons name="options-outline" size={22} color={color.ink} />
        </Pressable>
      ),
    });
  }, [navigation]);

  const open = (id: ChapterId) => {
    haptics.tap();
    navigation.navigate("KalaChapter", { chapter: id });
  };
  const openTopic = (topic: TopicId, month?: number) => {
    haptics.tap();
    navigation.navigate("KalaTopic", month === undefined ? { topic } : { topic, month });
  };

  const tradition = traditionById(today.prefs.tradition);
  const current = snap ? traditionMonth(snap) : null;
  const currentKey = current ? `${current.month}${current.adhika ? "a" : ""}` : "";
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const months = useMemo(() => monthCards(current), [currentKey]);

  // The months row opens on the month now, once it is known.
  const cardWidths = useCardWidths();
  const monthsRef = useRef<ScrollView>(null);
  const monthsPlaced = useRef(false);
  const placeMonths = useCallback(() => {
    if (monthsPlaced.current || !current) return;
    monthsPlaced.current = true;
    const x = Math.max(0, (current.month - 0.35) * (cardWidths.month + ROW_GAP));
    monthsRef.current?.scrollTo({ x, animated: false });
  }, [current, cardWidths.month]);

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <SectionLabel style={styles.firstLabel}>Start here</SectionLabel>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.row}
          contentContainerStyle={styles.rowContent}
          snapToInterval={cardWidths.topic + ROW_GAP}
          decelerationRate="fast"
        >
          {TOPICS.map((t, i) => (
            <Animated.View key={t.id} style={styles.rowCard} entering={reduced ? undefined : FadeInRight.delay(stagger(i, 60, 4)).duration(duration.slow)}>
              <TopicCard meta={t} index={i} onPress={() => openTopic(t.id)} />
            </Animated.View>
          ))}
        </ScrollView>

        <SectionLabel>The twelve months</SectionLabel>
        <ScrollView
          ref={monthsRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.row}
          contentContainerStyle={styles.rowContent}
          snapToInterval={cardWidths.month + ROW_GAP}
          decelerationRate="fast"
          onContentSizeChange={placeMonths}
        >
          {months.map((m) => (
            <MonthCard key={m.index} month={m} onPress={() => openTopic("masa", m.index)} />
          ))}
        </ScrollView>

        <SectionLabel>Six chapters</SectionLabel>
        <View style={styles.grid}>
          {CHAPTERS.map((c) => (
            <Tile key={c.id} meta={c} stat={statFor(c.id, stats, today.clockText, tradition.short)} onPress={() => open(c.id)} sized={sized} />
          ))}
        </View>

        <Panel tone="ink" style={styles.here}>
          <View style={styles.hereHead}>
            <Text style={styles.eyebrow} accessibilityRole="header">
              You are here
            </Text>
            <Sa size={18} on="fill" style={styles.hereWord}>
              {WORDS.kala.nom}
            </Sa>
          </View>

          {today.failed ? (
            <View style={styles.failed}>
              <Text style={styles.failedText}>Couldn't work out today's date.</Text>
              <Button label="Try again" size="md" onPress={today.retry} />
            </View>
          ) : !rows ? (
            <Ghost lines={6} />
          ) : (
            rows.map((r, i) => {
              // The dots shrink as the spans do: a kalpa down to a day.
              const dot = Math.max(4, 12 - i);
              return (
                <Animated.View key={r.key} entering={reduced ? undefined : FadeInDown.delay(stagger(i, 40, 10)).duration(duration.base)}>
                  <Pressable
                    onPress={() => openTopic(r.key)}
                    style={({ pressed }) => [styles.rung, pressed && styles.pressed]}
                    accessibilityRole="button"
                    accessibilityLabel={`${r.gloss}.`}
                    accessibilityHint={`Opens the card on ${topicById(r.key).title.replace(/^The /, "the ")}`}
                  >
                    <View style={styles.dotBox}>
                      {i > 0 && <View style={styles.threadTop} />}
                      {i < rows.length - 1 && <View style={styles.threadBottom} />}
                      <View style={{ width: dot, height: dot, borderRadius: dot / 2, backgroundColor: onFill.gold }} />
                    </View>
                    <Sa size={19} on="fill" style={styles.rungSa}>
                      {r.sa}
                    </Sa>
                    <Text style={styles.rungGloss} numberOfLines={2}>
                      {r.gloss}
                    </Text>
                  </Pressable>
                </Animated.View>
              );
            })
          )}

          <Pressable
            onPress={() => {
              haptics.tap();
              setSheetOpen(true);
            }}
            style={({ pressed }) => [styles.placeRow, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={`${tradition.label}, ${today.place.place.label}. Change your calendar or place.`}
          >
            <Ionicons name="location-outline" size={18} color={onFill.text} />
            <Text style={styles.placeText} numberOfLines={1}>
              {tradition.short} · {today.place.place.label}
            </Text>
            <Text style={styles.change}>Change</Text>
          </Pressable>
        </Panel>
        <Text style={[styles.hereNote, { fontSize: sized(13) }]}>Tap a line to open its card.</Text>

        {DEEPER_APP.url !== null && (
          <Pressable
            onPress={() => {
              haptics.tap();
              if (DEEPER_APP.url) void Linking.openURL(DEEPER_APP.url).catch(() => null);
            }}
            style={({ pressed }) => [styles.deeper, pressed && styles.pressed]}
            accessibilityRole="link"
            accessibilityLabel={`${DEEPER_APP.title}. ${DEEPER_APP.line}`}
          >
            <View style={styles.deeperText}>
              <Text style={styles.deeperTitle}>{DEEPER_APP.title}</Text>
              <Text style={styles.deeperLine}>{DEEPER_APP.line}</Text>
            </View>
            <Ionicons name="open-outline" size={20} color={onFill.text} />
          </Pressable>
        )}
      </ScrollView>

      <CalendarSheet visible={sheetOpen} place={today.place} onPlaceChanged={today.refreshPlace} onClose={() => setSheetOpen(false)} />
    </SafeAreaView>
  );
}

function Tile({ meta, stat, onPress, sized }: { meta: ChapterMeta; stat: string; onPress: () => void; sized: (pt: number) => number }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.tile, { backgroundColor: fill[meta.tone] }, pressed && styles.tilePressed]}
      accessibilityRole="button"
      accessibilityLabel={`${meta.title}.${stat ? ` ${stat}.` : ""}`}
    >
      <Text style={[styles.tileMark, script("bold")]} accessible={false} importantForAccessibility="no">
        {firstAkshara(meta.word)}
      </Text>
      <Text style={[styles.tileTitle, { fontSize: sized(16) }]}>{meta.title}</Text>
      <Sa size={18} on="fill" style={styles.tileWord} numberOfLines={1}>
        {meta.word}
      </Sa>
      <Text style={[styles.tileStat, { color: labelOn(meta.tone) }]} numberOfLines={2}>
        {stat}
      </Text>
    </Pressable>
  );
}

/** The gap between cards in a sideways row. */
const ROW_GAP = 12;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg },
  firstLabel: { marginTop: space.xs },
  // The rows run to the screen's edges and line up with the page inside.
  row: { marginHorizontal: -space.md, flexGrow: 0 },
  rowContent: { paddingHorizontal: space.md, gap: ROW_GAP },
  // Every card in a row takes the height of the tallest.
  rowCard: { alignSelf: "stretch" },
  hereNote: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", color: color.inkSoft },
  body: { paddingHorizontal: space.md, paddingTop: space.xs, paddingBottom: 120, gap: space.sm },
  headerButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },

  here: { paddingBottom: space.xs, marginTop: space.sm },
  hereHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 2 },
  eyebrow: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 12, letterSpacing: 0.9, textTransform: "uppercase", color: onFill.gold },
  hereWord: { color: onFill.soft },
  rung: { flexDirection: "row", alignItems: "center", minHeight: 44, gap: space.xs },
  pressed: { opacity: 0.75 },
  dotBox: { width: 18, alignSelf: "stretch", alignItems: "center", justifyContent: "center" },
  threadTop: { position: "absolute", top: 0, bottom: "50%", width: 1.5, backgroundColor: onFill.faint },
  threadBottom: { position: "absolute", top: "50%", bottom: 0, width: 1.5, backgroundColor: onFill.faint },
  rungSa: { flexShrink: 1 },
  rungGloss: { flex: 1, minWidth: 84, textAlign: "right", fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: 13, lineHeight: 17, color: onFill.soft },
  placeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    minHeight: 48,
    marginTop: space.xs,
    borderTopWidth: 1,
    borderTopColor: onFill.faint,
  },
  placeText: { flex: 1, fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: 13.5, color: onFill.text },
  change: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 14, color: onFill.gold },
  failed: { gap: space.sm, paddingVertical: space.md },
  failedText: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: 15, color: onFill.text },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  tile: { width: "48%", flexGrow: 1, borderRadius: 16, padding: 14, minHeight: 132, overflow: "hidden" },
  tilePressed: { opacity: 0.92, transform: [{ scale: 0.985 }] },
  tileMark: { position: "absolute", right: 6, bottom: -18, fontSize: 76, lineHeight: 104, color: onFill.faint },
  tileTitle: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", color: onFill.text },
  tileWord: { color: onFill.soft },
  tileStat: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 12.5, marginTop: "auto", paddingTop: space.xs },

  deeper: { flexDirection: "row", alignItems: "center", gap: space.sm, borderRadius: 16, padding: space.md, backgroundColor: fill.ink, minHeight: 64 },
  deeperText: { flex: 1, minWidth: 0 },
  deeperTitle: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 12, letterSpacing: 0.9, textTransform: "uppercase", color: onFill.gold },
  deeperLine: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: 15, color: onFill.text },
});
