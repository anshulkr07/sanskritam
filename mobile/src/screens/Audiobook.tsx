// Audiobook: one book on the Audio side — its painting, how long it sounds,
// Resume (or Play) and Read along, the voice it is chanted in, and its
// chapters with their lengths. Opened from the Audio shelf instead of
// dropping the learner into verse 1; a chapter row starts that chapter.
//
// The header takes the book's cover colour with cream type only (see
// read/look.ts); the list below is on paper.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AlbumArt from "../components/book/AlbumArt";
import { downloadBookAudio } from "../services/offlineBooks";
import { Alert } from "react-native";
import { coverColour } from "../components/book/covers";
import { useBookPages } from "../hooks/useBookPages";
import type { RootStackParamList } from "../navigation/types";
import { addressOf, audioChapters, chapterAt, fmtClock, fmtLong, msLeftInChapter, voicedCount, type AudioChapter } from "../read/audio";
import { CREAM, T, accentOn, sa, softOn, ui } from "../read/look";
import { NumBox, ProgressLine } from "../read/ui";
import { getListenPosition } from "../services/audioProgress";
import { haptics } from "../services/haptics";
import { shelfTitle } from "../read/shelves";
import { firstLine } from "../utils/verses";

type Props = NativeStackScreenProps<RootStackParamList, "Audiobook">;

/** "Vāgdhenu, IISc" for the Vāgdhenu renders; otherwise the voice id as sent. */
function voiceName(voice: string | undefined): string {
  if (!voice) return "";
  return voice.toLowerCase().startsWith("vagdhenu") ? "Vāgdhenu, IISc" : voice;
}

export default function AudiobookScreen({ navigation, route }: Props) {
  const { bookKey } = route.params;
  const insets = useSafeAreaInsets();
  const { pages, title, titleSa } = useBookPages(bookKey, null, "audio");
  const fill = coverColour(bookKey);
  const soft = softOn(fill);

  const [saved, setSaved] = useState<number | null>(null);
  useEffect(() => {
    const load = () =>
      getListenPosition(bookKey)
        .then((p) => setSaved(p ? p.index : null))
        .catch(() => setSaved(null));
    load();
    // Coming back from the player: the position moved.
    return navigation.addListener("focus", load);
  }, [bookKey, navigation]);

  const chapters = useMemo(() => audioChapters(pages), [pages]);
  const flat = chapters.length <= 1;
  const totalMs = useMemo(() => chapters.reduce((n, c) => n + c.ms, 0), [chapters]);
  const voiced = useMemo(() => voicedCount(pages), [pages]);
  const voice = voiceName(pages.find((p) => p.chant)?.chant?.voice);
  const at = saved !== null && pages.length ? Math.min(saved, pages.length - 1) : null;
  const { chapter: nowCh } = chapterAt(chapters, at ?? 0);
  const nowIdx = at !== null && nowCh ? chapters.indexOf(nowCh) : -1;

  const listen = useCallback(
    (index: number) => {
      haptics.press();
      navigation.navigate("Listen", { bookKey, index });
    },
    [navigation, bookKey],
  );

  const meta = [
    "Chanted in Sanskrit",
    totalMs > 0 ? fmtLong(totalMs) : "",
    flat ? `${voiced} verses` : `${chapters.length} chapters`,
  ]
    .filter(Boolean)
    .join(" · ");

  const header = (
    <View>
      <Pressable accessibilityRole="button" onPress={() => {
        void downloadBookAudio(pages, bookKey).then(() => Alert.alert("Saved", "The audiobook is saved on this device.")).catch(e => Alert.alert("Download unavailable", e.message));
      }} style={{ padding: 12 }}><Text style={{ color: "#9e481b", fontWeight: "700" }}>Save audiobook offline</Text></Pressable>
      <View style={[styles.head, { backgroundColor: fill, paddingTop: insets.top }]}>
        <View style={styles.headBar}>
          <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Back to Audio" style={styles.icon}>
            <Ionicons name="arrow-back" size={24} color={CREAM} />
          </Pressable>
        </View>
        <AlbumArt bookKey={bookKey} titleSa={titleSa || shelfTitle(title)} size={196} framed />
        <Text style={styles.title} accessibilityRole="header">
          {shelfTitle(title)}
        </Text>
        {!!titleSa && <Text style={[sa(19), { color: accentOn(fill), textAlign: "center" }]}>{titleSa}</Text>}
        <Text style={[styles.meta, { color: soft }]}>{meta}</Text>
        <View style={styles.actions}>
          <Pressable
            onPress={() => listen(at ?? 0)}
            accessibilityRole="button"
            accessibilityLabel={at ? `Resume at ${addressOf(pages[at])}` : `Play ${shelfTitle(title)}`}
            style={[styles.primary, { flex: 3 }]}
          >
            <Ionicons name="play" size={16} color={fill} />
            <Text style={[styles.primaryText, { color: fill }]} numberOfLines={1}>
              {at ? `Resume · ${addressOf(pages[at])}` : "Play"}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              haptics.tap();
              navigation.navigate("Book", { bookKey, index: at ?? 0 });
            }}
            accessibilityRole="button"
            accessibilityLabel="Read along"
            style={[styles.secondary, { flex: 2 }]}
          >
            <Text style={styles.secondaryText} numberOfLines={1}>
              Read along
            </Text>
          </Pressable>
        </View>
      </View>
      {!!voice && (
        <View style={styles.voice}>
          <Ionicons name="mic-outline" size={16} color={T.ink2} />
          <Text style={styles.voiceText}>Voice: {voice}</Text>
        </View>
      )}
      <View style={styles.listHead}>
        <Text style={styles.listTitle} accessibilityRole="header">
          {flat ? "Verses" : "Chapters"}
        </Text>
        <Text style={styles.listCount}>{flat ? pages.length : chapters.length}</Text>
      </View>
      <View style={styles.rule} />
    </View>
  );

  if (flat) {
    return (
      <View style={styles.root}>
        <StatusBar style="light" />
        <FlatList
          data={pages}
          keyExtractor={(v) => v.id}
          ListHeaderComponent={header}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          renderItem={({ item: v, index: i }) => (
            <Pressable
              onPress={() => listen(i)}
              accessibilityRole="button"
              accessibilityLabel={`Play ${v.source_ref}`}
              style={[styles.vrow, at === i && styles.vrowHere]}
            >
              <Text style={[styles.vnum, at === i && { color: T.action }]}>{addressOf(v)}</Text>
              <Text style={[sa(16), styles.vline]} numberOfLines={1}>
                {firstLine(v.devanagari)}
              </Text>
              <Text style={styles.dur}>{v.chant ? fmtClock(v.chant.duration_ms) : "no chant"}</Text>
            </Pressable>
          )}
        />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <FlatList
        data={chapters}
        keyExtractor={(c) => c.label}
        ListHeaderComponent={header}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        renderItem={({ item: ch, index: i }) => (
          <ChapterRow
            ch={ch}
            n={i + 1}
            state={nowIdx < 0 ? "ahead" : i < nowIdx ? "done" : i === nowIdx ? "now" : "ahead"}
            from={i === nowIdx && at !== null ? addressOf(pages[at]) : ""}
            left={i === nowIdx && at !== null ? msLeftInChapter(chapters, at) : 0}
            onPlay={() => listen(i === nowIdx && at !== null ? at : ch.start)}
          />
        )}
      />
    </View>
  );
}

function ChapterRow({
  ch,
  n,
  state,
  from,
  left,
  onPlay,
}: {
  ch: AudioChapter;
  n: number;
  state: "done" | "now" | "ahead";
  from: string;
  left: number;
  onPlay: () => void;
}) {
  const now = state === "now";
  return (
    <Pressable
      onPress={onPlay}
      accessibilityRole="button"
      accessibilityLabel={`${ch.label}. ${fmtClock(ch.ms)}.${now ? ` Resume from ${from}.` : ""}`}
      style={styles.chRow}
    >
      <View style={styles.chMain}>
        <NumBox state={state} label={ch.num !== null ? String(ch.num) : String(n)} />
        <View style={styles.chText}>
          <Text style={styles.chTitle}>{ch.label}</Text>
          <Text style={[styles.chSub, now && styles.chSubNow]} numberOfLines={1}>
            {now ? `From ${from} · ${fmtLong(left)} left` : `${ch.verses.length} verses`}
          </Text>
        </View>
        <Text style={styles.dur}>{ch.ms > 0 ? fmtClock(ch.ms) : "no chant"}</Text>
        <Ionicons name="play" size={16} color={now ? T.action : T.ink} style={{ marginLeft: 6 }} />
      </View>
      {now && ch.ms > 0 && <ProgressLine frac={1 - left / ch.ms} height={3} style={styles.chBar} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.paper },
  head: { alignItems: "center", paddingBottom: 22 },
  headBar: { alignSelf: "stretch", minHeight: 52, justifyContent: "center", paddingHorizontal: 6 },
  icon: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  title: { ...ui("bold"), fontSize: 26, lineHeight: 32, color: CREAM, marginTop: 18, textAlign: "center", paddingHorizontal: 20 },
  meta: { ...ui("regular"), fontSize: 13.5, marginTop: 2, textAlign: "center", paddingHorizontal: 20 },
  actions: { alignSelf: "stretch", flexDirection: "row", gap: 10, marginTop: 18, paddingHorizontal: 20 },
  primary: { minHeight: 48, backgroundColor: CREAM, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 12 },
  primaryText: { ...ui("bold"), fontSize: 15.5 },
  secondary: { minHeight: 48, borderWidth: 1.5, borderColor: CREAM, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  secondaryText: { ...ui("semibold"), fontSize: 15.5, color: CREAM },
  voice: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 48, marginHorizontal: 20, borderBottomWidth: 1, borderBottomColor: T.line },
  voiceText: { ...ui("regular"), fontSize: 13.5, color: T.ink2 },
  listHead: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginHorizontal: 20, marginTop: 18, marginBottom: 6 },
  listTitle: { ...ui("bold"), fontSize: 19, color: T.ink },
  listCount: { ...ui("regular"), fontSize: 13.5, color: T.ink3 },
  rule: { height: 1, backgroundColor: T.line, marginHorizontal: 20 },
  chRow: { marginHorizontal: 20, borderBottomWidth: 1, borderBottomColor: T.line, paddingVertical: 10 },
  chMain: { flexDirection: "row", alignItems: "center", gap: 14, minHeight: 44 },
  chText: { flex: 1, minWidth: 0 },
  chTitle: { ...ui("semibold"), fontSize: 16, lineHeight: 21, color: T.ink },
  chSub: { ...ui("regular"), fontSize: 13, color: T.ink3 },
  chSubNow: { ...ui("semibold"), color: T.action },
  chBar: { marginLeft: 48, marginTop: 8 },
  dur: { ...ui("regular"), fontSize: 14, color: T.ink2, fontVariant: ["tabular-nums"] },
  vrow: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 52, marginHorizontal: 20, borderBottomWidth: 1, borderBottomColor: "#EFE6D6" },
  vrowHere: { backgroundColor: T.surface },
  vnum: { ...ui("semibold"), width: 34, fontSize: 13.5, color: T.ink3, fontVariant: ["tabular-nums"] },
  vline: { flex: 1, minWidth: 0, color: T.ink },
});
