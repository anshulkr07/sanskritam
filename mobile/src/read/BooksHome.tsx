// Books home (Read tab, Books): one Continue reading card, then shelves of
// painted covers. Books with nothing imported yet wait together in one
// "Coming soon" row at the end instead of greying out every shelf.

import React, { useMemo } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import type { CanonText, Shloka } from "../api/client";
import CoverArt from "../components/book/CoverArt";
import { haptics } from "../services/haptics";
import { plain } from "../utils/text";
import { addressOf, audioChapters, chapterAt } from "./audio";
import { T, sa, ui } from "./look";
import { RAIL_DEFS, shelfTitle } from "./shelves";
import { ProgressLine, ReadHeader, SectionHead, SquareButton, readStyles, type Media } from "./ui";

const ALL_KEY = "all";
const OTHER_KEY = "other";
const TIER_SA: Record<string, string> = { "graded-1": "सरलम्", "graded-2": "सन्धिः", "graded-3": "समासः" };

interface ShelfBook {
  key: string;
  titleSa: string;
  titleEn: string;
  /** null: not known before opening (graded tiers load on open). */
  count: number | null;
  depth: string | null;
  locked: boolean;
}

function metaOf(b: ShelfBook): string {
  if (b.count === null) return "Graded passages";
  const n = b.count;
  const base = b.depth === "studied" ? `${n} selected` : b.depth === "index" ? `${n} indexed` : `${n} verse${n === 1 ? "" : "s"}`;
  return b.locked ? `${base} · Plus` : base;
}

export default function BooksHome({
  media,
  onMedia,
  groups,
  allVerses,
  positions,
  canon,
  onOpen,
  onResume,
  bottomPad,
}: {
  media: Media;
  onMedia: (m: Media) => void;
  groups: { text: CanonText | null; verses: Shloka[] }[];
  allVerses: Shloka[];
  positions: Record<string, number>;
  canon: CanonText[];
  onOpen: (key: string) => void;
  onResume: (key: string, at: number) => void;
  /** The mini player floats above: pad the list so nothing hides under it. */
  bottomPad?: boolean;
}) {
  const rails = useMemo(() => {
    const bySlug = new Map(groups.map((g) => [g.text?.slug ?? OTHER_KEY, g]));
    const canonBySlug = new Map(canon.map((c) => [c.slug, c]));
    const soon: ShelfBook[] = [];
    const out: { title: string; books: ShelfBook[] }[] = [];
    for (const r of RAIL_DEFS) {
      const books: ShelfBook[] = [];
      for (const slug of r.slugs) {
        if (slug.startsWith("graded-")) {
          books.push({ key: slug, titleSa: TIER_SA[slug] ?? "", titleEn: `Tier ${slug.slice(7)}`, count: null, depth: null, locked: false });
          continue;
        }
        const c = canonBySlug.get(slug);
        if (!c) continue;
        const g = bySlug.get(slug);
        // Paged books count from /canon; classic books from their verses.
        const count = c.paged ? c.verses_imported ?? 0 : g?.verses.length ?? 0;
        const b: ShelfBook = {
          key: slug,
          titleSa: c.title_sa || slug,
          titleEn: shelfTitle(c.title_en || slug),
          count,
          depth: c.depth ?? null,
          locked: c.locked ?? false,
        };
        if (count === 0) soon.push(b);
        else books.push(b);
      }
      if (books.length) out.push({ title: r.title, books });
    }
    const known = new Set(RAIL_DEFS.flatMap((r) => r.slugs));
    const more: ShelfBook[] = [
      { key: ALL_KEY, titleSa: "सर्वम्", titleEn: "All verses", count: allVerses.length, depth: null, locked: false },
    ];
    const other = bySlug.get(OTHER_KEY)?.verses.length ?? 0;
    if (other > 0) more.push({ key: OTHER_KEY, titleSa: "अन्यत्", titleEn: "Other verses", count: other, depth: null, locked: false });
    for (const g of groups) {
      if (g.text && !known.has(g.text.slug) && g.verses.length > 0) {
        more.push({ key: g.text.slug, titleSa: g.text.title_sa, titleEn: shelfTitle(g.text.title_en), count: g.verses.length, depth: g.text.depth, locked: false });
      }
    }
    out.push({ title: "More", books: more });
    if (soon.length) out.push({ title: "Coming soon", books: soon });
    return out;
  }, [groups, canon, allVerses.length]);

  return (
    <FlatList
      data={rails}
      keyExtractor={(r) => r.title}
      contentContainerStyle={[styles.body, bottomPad && styles.bodyMini]}
      ListHeaderComponent={
        <View style={{ gap: 18, marginBottom: 6 }}>
          <ReadHeader media={media} onMedia={onMedia} />
          <ContinueReading groups={groups} allVerses={allVerses} positions={positions} onResume={onResume} onContents={onOpen} />
        </View>
      }
      initialNumToRender={3}
      maxToRenderPerBatch={2}
      windowSize={5}
      renderItem={({ item: rail }) => {
        const soon = rail.title === "Coming soon";
        return (
          <View style={styles.rail}>
            <SectionHead title={rail.title} right={soon ? `${rail.books.length}` : undefined} />
            <FlatList
              horizontal
              data={rail.books}
              keyExtractor={(b) => b.key}
              showsHorizontalScrollIndicator={false}
              style={styles.railList}
              contentContainerStyle={styles.railRow}
              initialNumToRender={4}
              maxToRenderPerBatch={4}
              windowSize={3}
              getItemLayout={(_, index) => ({ length: 114, offset: 114 * index, index })}
              renderItem={({ item: b }) => (
                <Pressable
                  onPress={
                    soon
                      ? undefined
                      : () => {
                          haptics.tap();
                          onOpen(b.key);
                        }
                  }
                  disabled={soon}
                  accessibilityRole="button"
                  accessibilityLabel={soon ? `${b.titleEn}. Coming soon.` : `${b.titleEn}. ${metaOf(b)}.`}
                  accessibilityState={{ disabled: soon }}
                  style={[styles.book, soon && styles.bookSoon]}
                >
                  <CoverArt bookKey={b.key} titleSa={b.titleSa} width={100} />
                  <Text style={styles.bookTitle} numberOfLines={2}>
                    {b.titleEn}
                  </Text>
                  <Text style={styles.bookMeta} numberOfLines={1}>
                    {soon ? "Soon" : metaOf(b)}
                  </Text>
                </Pressable>
              )}
            />
          </View>
        );
      }}
    />
  );
}

/** The book last read, with where in it and two ways back in. */
function ContinueReading({
  groups,
  allVerses,
  positions,
  onResume,
  onContents,
}: {
  groups: { text: CanonText | null; verses: Shloka[] }[];
  allVerses: Shloka[];
  positions: Record<string, number>;
  onResume: (key: string, at: number) => void;
  onContents: (key: string) => void;
}) {
  const row = useMemo(() => {
    const candidates: { key: string; title: string; sa: string; verses: Shloka[] }[] = [
      { key: ALL_KEY, title: "All verses", sa: "सर्वम्", verses: allVerses },
    ];
    for (const g of groups) {
      if (g.text) candidates.push({ key: g.text.slug, title: shelfTitle(g.text.title_en), sa: g.text.title_sa, verses: g.verses });
      else candidates.push({ key: OTHER_KEY, title: "Other verses", sa: "अन्यत्", verses: g.verses });
    }
    for (const c of candidates) {
      const at = positions[c.key] ?? 0;
      if (c.verses.length > 0 && at > 0 && at < c.verses.length) return { ...c, at };
    }
    return null;
  }, [groups, allVerses, positions]);
  if (!row) return null;

  const total = row.verses.length;
  const chapters = audioChapters(row.verses);
  const { chapter, pos } = chapterAt(chapters, row.at);
  const where =
    chapter && chapter.num !== null && chapters.length > 1
      ? `Chapter ${chapter.num} · verse ${pos + 1} of ${chapter.verses.length}`
      : `Verse ${row.at + 1} of ${total}`;
  const pct = Math.round((row.at / Math.max(1, total)) * 100);
  const address = addressOf(row.verses[row.at]);

  return (
    <View style={styles.card} accessibilityLabel={`Continue reading ${row.title}`}>
      <View style={styles.cardRow}>
        <CoverArt bookKey={row.key} titleSa={row.sa || row.title} width={64} />
        <View style={styles.cardText}>
          <Text style={readStyles.eyebrow}>CONTINUE READING</Text>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {row.title}
          </Text>
          {!!row.sa && (
            <Text style={[sa(15), { color: T.ink2 }]} numberOfLines={1}>
              {row.sa}
            </Text>
          )}
          <Text style={styles.cardMeta} numberOfLines={1}>
            {where}
          </Text>
          <View style={styles.cardBarRow}>
            <ProgressLine frac={row.at / Math.max(1, total)} style={{ flex: 1 }} />
            <Text style={styles.cardPct}>{pct}% read</Text>
          </View>
        </View>
      </View>
      <View style={styles.cardBtns}>
        <SquareButton
          label={`Continue · ${address}`}
          icon="play"
          onPress={() => onResume(row.key, row.at)}
          style={{ flex: 1 }}
          accessibilityLabel={`Continue ${row.title} at ${address}`}
        />
        <SquareButton label="Contents" outline onPress={() => onContents(row.key)} style={{ flex: 1 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 120 },
  bodyMini: { paddingBottom: 200 },
  rail: { marginTop: 22, gap: 12 },
  railList: { marginRight: -20 },
  railRow: { gap: 14, paddingRight: 20 },
  book: { width: 100, gap: 4 },
  bookSoon: { opacity: 0.5 },
  bookTitle: { ...ui("semibold"), fontSize: 14, lineHeight: 18, color: T.ink, marginTop: 4 },
  bookMeta: { ...ui("regular"), fontSize: 12.5, color: T.ink3 },
  card: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.line, padding: 14, gap: 14 },
  cardRow: { flexDirection: "row", gap: 14 },
  cardText: { flex: 1, minWidth: 0 },
  cardTitle: { ...ui("bold"), fontSize: 19, lineHeight: 24, color: T.ink, marginTop: 2 },
  cardMeta: { ...ui("regular"), fontSize: 13.5, color: T.ink2 },
  cardBarRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8 },
  cardPct: { ...ui("regular"), fontSize: 12.5, color: T.ink3 },
  cardBtns: { flexDirection: "row", gap: 10 },
});
