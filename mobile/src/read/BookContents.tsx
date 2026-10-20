// Book contents (a classic book, Read tab): the cover and what the book is,
// how far in you are, Continue and Listen, then the chapters. Each chapter
// row shows its first real line (speaker lines like "सञ्जय उवाच" skipped),
// read chapters are ticked, and the chapter you are in opens on its verses
// with "Here" on the one you stopped at. A book without chapters (Īśopaniṣad)
// lists its verses straight away.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, SectionList, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { Shloka } from "../api/client";
import { useBookActivity } from "../hooks/useBookActivity";
import { pageId } from "../services/bookActivity";
import CoverArt from "../components/book/CoverArt";
import { haptics } from "../services/haptics";
import { firstLine, parseRef } from "../utils/verses";
import { addressOf, audioChapters, chantMs, fmtLong, voicedCount } from "./audio";
import { T, sa, ui } from "./look";
import { NumBox, ProgressLine, SectionHead, SquareButton } from "./ui";

export interface ContentsBook {
  key: string;
  titleEn: string;
  titleSa: string;
  verses: Shloka[];
  planned: number | null;
  depth: string | null;
}

const DEPTH_LABEL: Record<string, string> = {
  full: "Full text",
  studied: "Selected verses",
  index: "Catalogue selections",
};

export default function BookContents({
  book,
  resumeAt,
  onBack,
  backLabel = "Books",
  onStart,
  onOpen,
  onListen,
}: {
  book: ContentsBook;
  resumeAt: number;
  onBack: () => void;
  backLabel?: string;
  onStart: () => void;
  onOpen: (i: number) => void;
  /** Present when some verse of the book has a chant. */
  onListen?: () => void;
}) {
  const activity = useBookActivity()[book.key] ?? [];
  const readCount = activity.filter(page => page.read).length;
  const total = book.verses.length;
  const chapters = useMemo(() => audioChapters(book.verses), [book.verses]);
  const flat = chapters.length <= 1;
  const resume = Math.max(0, Math.min(resumeAt, total - 1));
  const started = resume > 0 || readCount > 0;
  const nowChapter = useMemo(() => {
    const ch = chapters.find((c) => resume >= c.start && resume < c.start + c.verses.length);
    return ch?.label ?? chapters[0]?.label ?? "";
  }, [chapters, resume]);
  const [open, setOpen] = useState<string>(nowChapter);
  useEffect(() => setOpen(nowChapter), [nowChapter, book.key]);

  const voiced = useMemo(() => voicedCount(book.verses), [book.verses]);
  const sound = useMemo(() => chantMs(book.verses), [book.verses]);
  const nowIdx = chapters.findIndex((c) => c.label === nowChapter);

  const sections = useMemo(
    () =>
      chapters.map((ch) => ({
        key: ch.label,
        ch,
        data: flat || open === ch.label ? ch.verses.map((v, j) => ({ v, at: ch.start + j })) : [],
      })),
    [chapters, open, flat],
  );

  const facts: string[] = [];
  facts.push(flat ? `${total} verse${total === 1 ? "" : "s"}` : `${chapters.length} chapters · ${total} verses`);
  if (book.planned && book.planned > total) facts[0] += ` of ${book.planned}`;
  if (book.depth && DEPTH_LABEL[book.depth]) facts.push(DEPTH_LABEL[book.depth]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.v.id}
        contentContainerStyle={styles.body}
        stickySectionHeadersEnabled={false}
        initialNumToRender={20}
        ListHeaderComponent={
          <View>
            <Pressable onPress={onBack} style={styles.back} accessibilityRole="button" accessibilityLabel={`Back to ${backLabel}`}>
              <Ionicons name="arrow-back" size={20} color={T.ink} />
              <Text style={styles.backText}>{backLabel}</Text>
            </Pressable>

            <View style={styles.hero}>
              <CoverArt bookKey={book.key} titleSa={book.titleSa} width={96} />
              <View style={styles.heroText}>
                <Text style={styles.title} accessibilityRole="header">
                  {book.titleEn}
                </Text>
                {!!book.titleSa && <Text style={[sa(18), { color: T.ink2 }]}>{book.titleSa}</Text>}
                <View style={styles.facts}>
                  {facts.map((f) => (
                    <Text key={f} style={styles.fact}>
                      {f}
                    </Text>
                  ))}
                  {voiced > 0 && (
                    <View style={styles.factRow}>
                      <Ionicons name="headset-outline" size={15} color={T.ink2} />
                      <Text style={styles.fact}>Chanted · {fmtLong(sound)}</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            {(started || readCount > 0) && (
              <View style={styles.progress}>
                <View style={styles.progressRow}>
                  <Text style={styles.progressPct}>{Math.round((readCount / Math.max(1, total)) * 100)}% read</Text>
                  {!flat && nowIdx >= 0 && (
                    <Text style={styles.progressWhere}>
                      Chapter {nowIdx + 1} of {chapters.length}
                    </Text>
                  )}
                </View>
                <ProgressLine frac={readCount / Math.max(1, total)} />
              </View>
            )}

            <View style={styles.actions}>
              <SquareButton
                label={started ? `Continue · ${addressOf(book.verses[resume])}` : "Start reading"}
                icon="play"
                onPress={onStart}
                style={{ flex: 3 }}
              />
              {onListen && <SquareButton label="Listen" icon="headset-outline" outline onPress={onListen} style={{ flex: 2 }} />}
            </View>

            <SectionHead
              title={flat ? "Verses" : "Chapters"}
              right={`${flat ? total : chapters.length}`}
              style={styles.listHead}
            />
            <View style={styles.rule} />
          </View>
        }
        renderSectionHeader={({ section }) => {
          if (flat) return null;
          const ch = section.ch;
          const i = chapters.indexOf(ch);
          const done = ch.verses.every(verse => activity.some(page => page.id === pageId(verse) && page.read));
          const state = done ? "done" : started && i === nowIdx ? "now" : "ahead";
          const isOpen = open === ch.label;
          return (
            <Pressable
              onPress={() => {
                haptics.tap();
                setOpen((cur) => (cur === ch.label ? "" : ch.label));
              }}
              accessibilityRole="button"
              accessibilityState={{ expanded: isOpen }}
              accessibilityLabel={`${ch.label}. ${ch.verses.length} verses.`}
              style={styles.chapter}
            >
              <NumBox state={state} label={ch.num !== null ? String(ch.num) : String(i + 1)} />
              <View style={styles.chapterText}>
                <Text style={styles.chapterTitle}>{ch.label}</Text>
                <Text style={[sa(15), { color: T.ink2 }]} numberOfLines={1}>
                  {firstLine(ch.verses[0]?.devanagari ?? "")}
                </Text>
              </View>
              <Text style={styles.count}>{ch.verses.length}</Text>
              <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={16} color={T.ink3} />
            </Pressable>
          );
        }}
        renderItem={({ item }) => {
          const here = started && item.at === resume;
          const mark = activity.find(page => page.id === pageId(item.v));
          const { nums } = parseRef(item.v.source_ref);
          const num = nums.length > 0 ? nums[nums.length - 1] : item.at + 1;
          return (
            <Pressable
              onPress={() => {
                haptics.tap();
                onOpen(item.at);
              }}
              accessibilityRole="button"
              accessibilityLabel={`${item.v.source_ref}. ${firstLine(item.v.devanagari)}${here ? ". You are here." : ""}${mark?.read ? ". Already read." : ""}${mark?.bookmarked ? ". Bookmarked." : ""}`}
              style={[styles.verse, { marginLeft: (flat ? 0 : 48) - (here ? 8 : 0) }, here && styles.verseHere, mark?.read && { backgroundColor: T.doneBg, borderRadius: 8 }]}
            >
              <Text style={[styles.verseNum, here && { color: T.action }]}>{num}</Text>
              <Text style={[sa(16), styles.verseLine]} numberOfLines={1}>
                {firstLine(item.v.devanagari)}
              </Text>
              {mark?.read && <Ionicons name="checkmark-circle" size={16} color={T.action} />}
              {mark?.bookmarked && <Ionicons name="bookmark" size={16} color={T.action} />}
              {here && (
                <View style={styles.hereTag}>
                  <Ionicons name="location-outline" size={12} color={T.action} />
                  <Text style={styles.hereText}>Here</Text>
                </View>
              )}
            </Pressable>
          );
        }}
        renderSectionFooter={({ section }) => (flat ? null : <View style={styles.rule} key={section.key} />)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.paper },
  body: { paddingHorizontal: 20, paddingBottom: 120 },
  back: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 48, alignSelf: "flex-start" },
  backText: { ...ui("semibold"), fontSize: 15, color: T.ink },
  hero: { flexDirection: "row", gap: 16, marginTop: 2 },
  heroText: { flex: 1, minWidth: 0, paddingTop: 2 },
  title: { ...ui("bold"), fontSize: 25, lineHeight: 30, color: T.ink },
  facts: { marginTop: 10, gap: 3 },
  fact: { ...ui("regular"), fontSize: 14, color: T.ink2 },
  factRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  progress: { marginTop: 18, gap: 7 },
  progressRow: { flexDirection: "row", justifyContent: "space-between" },
  progressPct: { ...ui("semibold"), fontSize: 13.5, color: T.ink },
  progressWhere: { ...ui("regular"), fontSize: 13.5, color: T.ink3 },
  actions: { flexDirection: "row", gap: 10, marginTop: 16 },
  listHead: { marginTop: 26, marginBottom: 8 },
  rule: { height: 1, backgroundColor: T.line },
  chapter: { flexDirection: "row", alignItems: "center", gap: 14, minHeight: 62, paddingVertical: 8 },
  chapterText: { flex: 1, minWidth: 0 },
  chapterTitle: { ...ui("semibold"), fontSize: 16, lineHeight: 21, color: T.ink },
  count: { ...ui("regular"), fontSize: 13.5, color: T.ink3 },
  verse: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 46,
    borderTopWidth: 1,
    borderTopColor: T.line,
  },
  verseHere: { backgroundColor: T.surface, paddingHorizontal: 8, marginRight: -8 },
  verseNum: { ...ui("semibold"), width: 30, fontSize: 13.5, color: T.ink3, fontVariant: ["tabular-nums"] },
  verseLine: { flex: 1, minWidth: 0, color: T.ink },
  hereTag: { flexDirection: "row", alignItems: "center", gap: 4 },
  hereText: { ...ui("bold"), fontSize: 12, color: T.action },
});
