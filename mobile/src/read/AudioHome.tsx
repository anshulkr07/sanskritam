// Audio home (Read tab, Audio): the listening side, made to feel unlike the
// bookshelf. A full-width band in the book's own colour to continue (or
// start) listening, square crops of the paintings instead of tall covers,
// minutes instead of verse counts, short pieces first, then every audiobook
// with a play button. Tapping a book opens its audiobook page; the play
// buttons start it.
//
// Only classic books are listed: a paged book's verses (and so its chant
// lengths) arrive one chapter at a time, so they wait until /canon reports
// voiced counts and durations.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import type { CanonText, Shloka } from "../api/client";
import AlbumArt from "../components/book/AlbumArt";
import { coverColour } from "../components/book/covers";
import MiniPlayer from "../components/chant/MiniPlayer";
import { EmptyState } from "../components/ui";
import { haptics } from "../services/haptics";
import type { ListenPosition } from "../services/audioProgress";
import { listenBus, useListenSummary } from "../services/listenBus";
import { plain } from "../utils/text";
import { addressOf, audioChapters, chantMs, chapterAt, fmtLong, msLeftInChapter, voicedCount } from "./audio";
import { CREAM, CREAM_FAINT, T, accentOn, sa, softOn, ui } from "./look";
import { AUDIO_GROUPS, SHELF_ORDER, audioGroupOf, shelfTitle, type AudioGroup } from "./shelves";
import { ProgressLine, ReadHeader, SectionHead, type Media } from "./ui";

interface AudioBook {
  key: string;
  titleEn: string;
  titleSa: string;
  verses: Shloka[];
  voiced: number;
  ms: number;
  group: AudioGroup;
}

const SHORT_MS = 10 * 60_000;

export default function AudioHome({
  media,
  onMedia,
  groups,
  lastListen,
  onListen,
  onBook,
  onOpenPlayer,
}: {
  media: Media;
  onMedia: (m: Media) => void;
  groups: { text: CanonText | null; verses: Shloka[] }[];
  lastListen: { bookKey: string; pos: ListenPosition } | null;
  /** index -1: wherever this book was left off (or its start). */
  onListen: (key: string, index: number) => void;
  onBook: (key: string) => void;
  onOpenPlayer: (key: string, chapter: string | null, index: number) => void;
}) {
  const books = useMemo(() => {
    const order = new Map(SHELF_ORDER.map((s, i) => [s, i]));
    const out: AudioBook[] = [];
    for (const g of groups) {
      if (!g.text) continue;
      const voiced = voicedCount(g.verses);
      if (voiced === 0) continue;
      out.push({
        key: g.text.slug,
        titleEn: shelfTitle(g.text.title_en),
        titleSa: g.text.title_sa,
        verses: g.verses,
        voiced,
        ms: chantMs(g.verses),
        group: audioGroupOf(g.text.slug),
      });
    }
    return out.sort((a, b) => (order.get(a.key) ?? 999) - (order.get(b.key) ?? 999));
  }, [groups]);

  const [filter, setFilter] = useState<AudioGroup | "All">("All");
  const summary = useListenSummary();

  if (books.length === 0) {
    return (
      <ScrollView contentContainerStyle={styles.pad}>
        <ReadHeader media={media} onMedia={onMedia} />
        <EmptyState title="No audiobooks yet." hint="Books with a chant will appear here." />
      </ScrollView>
    );
  }

  const last = lastListen ? books.find((b) => b.key === lastListen.bookKey) : undefined;
  const hero = last ?? books[0];
  const heroAt = last && lastListen ? Math.min(lastListen.pos.index, hero.verses.length - 1) : 0;
  const shorts = books.filter((b) => b.ms > 0 && b.ms <= SHORT_MS).sort((a, b) => a.ms - b.ms);
  const present = AUDIO_GROUPS.filter((g) => books.some((b) => b.group === g));
  const shown = filter === "All" ? books : books.filter((b) => b.group === filter);
  const totalMs = books.reduce((n, b) => n + b.ms, 0);
  const heroLive = summary.bookKey === hero.key;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.pad}>
          <ReadHeader media={media} onMedia={onMedia} />
        </View>

        <Hero
          book={hero}
          at={heroLive ? summary.at : heroAt}
          resumed={!!last}
          playing={heroLive && summary.isPlaying}
          onPlay={() => {
            haptics.press();
            if (heroLive) listenBus.toggle();
            else onListen(hero.key, heroAt);
          }}
          onOpen={() => onBook(hero.key)}
        />

        {shorts.length > 0 && (
          <View style={styles.section}>
            <SectionHead title="Short listens" right="under 10 minutes" style={styles.pad} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tiles}>
              {shorts.map((b) => (
                <Pressable
                  key={b.key}
                  onPress={() => {
                    haptics.tap();
                    onBook(b.key);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`${b.titleEn}. ${fmtLong(b.ms)}, ${b.voiced} verses.`}
                  style={styles.tile}
                >
                  <View>
                    <AlbumArt bookKey={b.key} titleSa={b.titleSa} size={124} />
                    <Text style={styles.tag}>{fmtLong(b.ms)}</Text>
                  </View>
                  <Text style={styles.tileTitle} numberOfLines={1}>
                    {b.titleEn}
                  </Text>
                  <Text style={styles.tileMeta}>{b.voiced} verses</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={[styles.section, styles.pad]}>
          <SectionHead title="All audiobooks" right={`${fmtLong(totalMs)} in all`} />
          {present.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsWrap} contentContainerStyle={styles.chips}>
              {(["All", ...present] as (AudioGroup | "All")[]).map((g) => {
                const on = filter === g;
                return (
                  <Pressable
                    key={g}
                    onPress={() => {
                      haptics.tap();
                      setFilter(g);
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    style={[styles.chip, on && styles.chipOn]}
                  >
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>{g}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
          <View style={{ marginTop: 4 }}>
            {shown.map((b) => {
              const partial = b.voiced < b.verses.length;
              return (
                <View key={b.key} style={styles.row}>
                  <Pressable
                    onPress={() => {
                      haptics.tap();
                      onBook(b.key);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`${b.titleEn}. ${fmtLong(b.ms)}.`}
                    style={styles.rowMain}
                  >
                    <AlbumArt bookKey={b.key} titleSa={b.titleSa} size={56} />
                    <View style={styles.rowText}>
                      <Text style={styles.rowTitle} numberOfLines={1}>
                        {b.titleEn}
                      </Text>
                      <Text style={styles.rowMeta} numberOfLines={1}>
                        {fmtLong(b.ms)} · {partial ? `${b.voiced} of ${b.verses.length} verses` : `${b.voiced} verses`}
                      </Text>
                    </View>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      haptics.press();
                      onListen(b.key, -1);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Play ${b.titleEn}`}
                    style={styles.rowPlay}
                  >
                    <Ionicons name="play" size={16} color={T.ink} />
                  </Pressable>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
      {/* The band already plays this book; the bar shows only for another. */}
      {!heroLive && <MiniPlayer onOpen={onOpenPlayer} />}
    </View>
  );
}

/** The full-width band in the book's colour. */
function Hero({
  book,
  at,
  resumed,
  playing,
  onPlay,
  onOpen,
}: {
  book: AudioBook;
  at: number;
  resumed: boolean;
  playing: boolean;
  onPlay: () => void;
  onOpen: () => void;
}) {
  const fill = coverColour(book.key);
  const soft = softOn(fill);
  const chapters = audioChapters(book.verses);
  const { chapter } = chapterAt(chapters, at);
  const left = msLeftInChapter(chapters, at);
  const chNum = chapter && chapters.length > 1 ? chapter.num : null;
  const multi = chNum !== null;
  const span = multi && chapter ? chapter.ms : book.ms;
  const remaining = multi ? left : chantMs(book.verses.slice(at));
  const frac = span > 0 ? 1 - remaining / span : 0;
  const where = resumed
    ? multi
      ? `Chapter ${chNum} · verse ${addressOf(book.verses[at])}`
      : `Verse ${at + 1} of ${book.verses.length}`
    : fmtLong(book.ms);

  return (
    <View style={[styles.hero, { backgroundColor: fill }]}>
      <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={`${book.titleEn}, audiobook page`} style={styles.heroRow}>
        <AlbumArt bookKey={book.key} titleSa={book.titleSa} size={112} />
        <View style={styles.heroText}>
          <Text style={[styles.heroEyebrow, { color: accentOn(fill) }]}>{resumed ? "CONTINUE LISTENING" : "START LISTENING"}</Text>
          <Text style={styles.heroTitle} numberOfLines={2}>
            {book.titleEn}
          </Text>
          {!!book.titleSa && (
            <Text style={[sa(15), { color: soft }]} numberOfLines={1}>
              {book.titleSa}
            </Text>
          )}
          <Text style={[styles.heroMeta, { color: soft }]} numberOfLines={1}>
            {where}
          </Text>
        </View>
      </Pressable>
      <View style={styles.heroBottom}>
        <Pressable
          onPress={onPlay}
          accessibilityRole="button"
          accessibilityLabel={playing ? "Pause" : resumed ? `Resume ${book.titleEn}` : `Play ${book.titleEn}`}
          style={styles.heroPlay}
        >
          <Ionicons name={playing ? "pause" : "play"} size={24} color={fill} />
        </Pressable>
        {resumed ? (
          <View style={styles.heroProgress}>
            <ProgressLine frac={frac} fillColor={CREAM} trackColor={CREAM_FAINT} height={3} />
            <View style={styles.heroProgressRow}>
              <Text style={[styles.heroSmall, { color: soft }]}>{multi ? `Chapter ${chNum}` : "This book"}</Text>
              <Text style={[styles.heroSmall, { color: soft }]}>{fmtLong(remaining)} left</Text>
            </View>
          </View>
        ) : (
          <Text style={[styles.heroSmall, { color: soft, flex: 1 }]}>{book.voiced} verses, chanted in Sanskrit</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingTop: 14, paddingBottom: 140 },
  pad: { paddingHorizontal: 20 },
  hero: { marginTop: 16, paddingHorizontal: 20, paddingVertical: 18, gap: 14 },
  heroRow: { flexDirection: "row", gap: 16 },
  heroText: { flex: 1, minWidth: 0, paddingTop: 2 },
  heroEyebrow: { ...ui("bold"), fontSize: 12, letterSpacing: 1.4 },
  heroTitle: { ...ui("bold"), fontSize: 22, lineHeight: 27, color: CREAM, marginTop: 4 },
  heroMeta: { ...ui("regular"), fontSize: 14, marginTop: 4 },
  heroBottom: { flexDirection: "row", alignItems: "center", gap: 14 },
  heroPlay: { width: 56, height: 56, backgroundColor: CREAM, alignItems: "center", justifyContent: "center" },
  heroProgress: { flex: 1, gap: 7 },
  heroProgressRow: { flexDirection: "row", justifyContent: "space-between" },
  heroSmall: { ...ui("regular"), fontSize: 13 },
  section: { marginTop: 24, gap: 12 },
  tiles: { gap: 14, paddingHorizontal: 20 },
  tile: { width: 124, gap: 4 },
  tag: {
    ...ui("semibold"),
    position: "absolute",
    left: 0,
    bottom: 0,
    backgroundColor: T.ink,
    color: CREAM,
    fontSize: 12,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  tileTitle: { ...ui("semibold"), fontSize: 14, color: T.ink, marginTop: 4 },
  tileMeta: { ...ui("regular"), fontSize: 12.5, color: T.ink3 },
  chipsWrap: { marginRight: -20 },
  chips: { gap: 8, paddingRight: 20 },
  chip: { minHeight: 40, paddingHorizontal: 14, borderWidth: 1.5, borderColor: T.lineStrong, justifyContent: "center" },
  chipOn: { backgroundColor: T.ink, borderColor: T.ink },
  chipText: { ...ui("semibold"), fontSize: 14, color: T.ink },
  chipTextOn: { color: CREAM },
  row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 72, borderBottomWidth: 1, borderBottomColor: T.line },
  rowMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: 14, minWidth: 0, paddingVertical: 8 },
  rowText: { flex: 1, minWidth: 0 },
  rowTitle: { ...ui("semibold"), fontSize: 16, lineHeight: 21, color: T.ink },
  rowMeta: { ...ui("regular"), fontSize: 13, color: T.ink3 },
  rowPlay: { width: 44, height: 44, borderWidth: 1.5, borderColor: T.ink, alignItems: "center", justifyContent: "center" },
});
