// Paged books (handover_reading_shelf.md 7.4-7.7): contents, chapter reader,
// Plus preview sheet. Classic books are untouched; these components only
// render paged rows from GET /canon?include=paged.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn } from "react-native-reanimated";

import { api, type CanonText, type PagedChapters, type Shloka } from "../../api/client";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { useTypeScale } from "../../hooks/useTypeScale";
import { haptics } from "../../services/haptics";
import {
  getReadingChapter,
  getReadingPosition,
  setReadingChapter,
  setReadingPosition,
} from "../../services/readingProgress";
import { color, font, space } from "../../theme";
import { plain } from "../../utils/text";
import {
  nextChapter,
  positionKey,
  prevChapter,
  sectionsOf,
} from "../../utils/paged";
import BookCover from "./BookCover";
import CoverArt from "./CoverArt";
import PageCurlBook from "./PageCurlBook";
import ReaderSlider from "../ReaderSlider";
import { Button, EmptyState } from "../ui";

export function PlusSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const reduced = useReducedMotion();
  return (
    <Modal
      visible={visible}
      transparent
      animationType={reduced ? "none" : "fade"}
      onRequestClose={onClose}
    >
      <View style={styles.sheetWrap}>
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Part of Plus</Text>
          <Text style={styles.sheetLine}>This chapter opens with Plus.</Text>
          <Pressable
            onPress={onClose}
            style={styles.sheetBtn}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Text style={styles.sheetBtnText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export function PagedBookIndex({
  text,
  onBack,
  onOpenChapter,
}: {
  text: CanonText;
  onBack: () => void;
  onOpenChapter: (chapter: string, index: number) => void;
}) {
  const { sized } = useTypeScale();
  const [data, setData] = useState<PagedChapters | null>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [plusOpen, setPlusOpen] = useState(false);
  const [resume, setResume] = useState<{ chapter: string; index: number } | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setFailed(false);
    api
      .canonChapters(text.slug)
      .then(async (d) => {
        setData(d);
        // Continue: saved chapter and verse, when the chapter still exists.
        try {
          const ch = await getReadingChapter(text.slug);
          const chapters = d.chapters.map((c) => c.chapter);
          const at = ch && chapters.includes(ch) ? ch : d.preview.chapter;
          const pos = await getReadingPosition(positionKey(text.slug, at));
          setResume({ chapter: at, index: Number.isFinite(pos) ? pos : 0 });
        } catch {
          setResume({ chapter: d.preview.chapter, index: 0 });
        }
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, [text.slug]);

  useEffect(() => {
    load();
  }, [load]);

  const sections = useMemo(
    () => sectionsOf(data?.chapters ?? []),
    [data],
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.body}>
          <Text style={[styles.title, { fontSize: sized(font.sizes.xl) }]}>
            {plain(text.title_en)}
          </Text>
          <Text style={styles.hint}>Loading chapters.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (failed || !data) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.center}>
          <EmptyState
            title="Couldn't load this book. Try again."
            hint=""
          />
          <Button label="Try again" tone="primary" onPress={load} style={{ marginTop: space.md }} />
          <Pressable
            onPress={onBack}
            style={styles.backRow}
            accessibilityRole="button"
            accessibilityLabel="Back to Books"
          >
            <Ionicons name="arrow-back" size={20} color={color.saffron} />
            <Text style={styles.backText}>Books</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const started = (resume?.index ?? 0) > 0;
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <SectionList
        sections={sections.map((s) => ({
          title: s.section ? `Part ${s.section}` : "Chapters",
          data: s.chapters,
        }))}
        keyExtractor={(c) => (c as { chapter: string }).chapter || "one"}
        contentContainerStyle={styles.body}
        ListHeaderComponent={
          <>
            <Pressable
              onPress={onBack}
              style={styles.backRow}
              accessibilityRole="button"
              accessibilityLabel="Back to Books"
            >
              <Ionicons name="arrow-back" size={20} color={color.saffron} />
              <Text style={styles.backText}>Books</Text>
            </Pressable>
            <BookCover
              variant="card"
              titleSa={text.title_sa}
              titleEn={plain(text.title_en)}
              caption={`${data.chapters.reduce((a, c) => a + c.count, 0)} verses`}
              bookmarked={started}
              onPress={() => {
                if (resume) onOpenChapter(resume.chapter, resume.index);
              }}
            />
            <Button
              label={started ? "Continue" : "Open book"}
              tone="primary"
              block
              onPress={() => {
                if (resume) onOpenChapter(resume.chapter, resume.index);
              }}
              style={{ marginTop: space.md }}
            />
          </>
        }
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionLabel}>{section.title}</Text>
        )}
        renderItem={({ item }) => {
          const c = item as { chapter: string; count: number; locked: boolean; first_ref: string };
          const label = c.chapter ? `Chapter ${c.chapter}` : "Verses";
          return (
            <Pressable
              onPress={() => {
                haptics.tap();
                if (c.locked) {
                  setPlusOpen(true);
                  return;
                }
                onOpenChapter(c.chapter, 0);
              }}
              style={styles.row}
              accessibilityRole="button"
              accessibilityLabel={c.locked ? `${label}, Plus` : `${label}. ${c.count} verses.`}
            >
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>{label}</Text>
                <Text style={styles.rowSub}>
                  {c.count} verses{c.locked ? " Plus" : ""}
                </Text>
              </View>
              {c.locked ? (
                <Ionicons name="lock-closed" size={18} color={color.inkSoft} />
              ) : (
                <Ionicons name="chevron-forward" size={16} color={color.inkFaint} />
              )}
            </Pressable>
          );
        }}
      />
      <PlusSheet visible={plusOpen} onClose={() => setPlusOpen(false)} />
    </SafeAreaView>
  );
}

export function PagedChapterReader({
  text,
  chapter,
  startIndex,
  onBack,
  onChapter,
  renderVerse,
  onChant,
}: {
  text: CanonText;
  chapter: string;
  startIndex: number;
  onBack: () => void;
  onChapter: (chapter: string) => void;
  /** One verse as a page. The Reader passes its own page (tappable words,
   *  meanings, Ask) so a paged book reads exactly like a classic one. */
  renderVerse: (verse: Shloka, previous: Shloka | null, position: number, total: number) => React.ReactNode;
  /** Opens this chapter in Chant mode at the given verse; offered only once a verse of it has a chant. */
  onChant?: (index: number) => void;
}) {
  const reduced = useReducedMotion();
  const [verses, setVerses] = useState<Shloka[]>([]);
  const [lockedAfter, setLockedAfter] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [at, setAt] = useState(startIndex);
  const [plusOpen, setPlusOpen] = useState(false);
  const [chapters, setChapters] = useState<PagedChapters | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setFailed(false);
    api
      .canonChapters(text.slug)
      .then((d) => setChapters(d))
      .catch(() => {});
    api
      .canonVerses(text.slug, chapter)
      .then((d) => {
        setVerses(d.verses);
        setLockedAfter(d.locked_after ?? null);
        if ((d.locked_after ?? null) !== null) setPlusOpen(false);
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, [text.slug, chapter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setAt(startIndex);
  }, [startIndex, chapter]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.body}>
          <Text style={styles.hint}>Loading chapter.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (failed) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.center}>
          <EmptyState title="Couldn't load this chapter. Try again." hint="" />
          <Button label="Try again" tone="primary" onPress={load} style={{ marginTop: space.md }} />
        </View>
      </SafeAreaView>
    );
  }

  const next = chapters ? nextChapter(chapters.chapters, chapter) : null;
  const prev = chapters ? prevChapter(chapters.chapters, chapter) : null;
  // Pages: verses, then a Next chapter page after the last verse.
  const count = verses.length + (next ? 1 : 0);
  const safe = Math.max(0, Math.min(at, Math.max(0, count - 1)));

  const turnTo = (i: number) => {
    if (lockedAfter !== null && i >= lockedAfter) {
      setPlusOpen(true);
      return;
    }
    const clamped = Math.max(0, Math.min(count - 1, i));
    setAt(clamped);
    if (clamped < verses.length) {
      setReadingPosition(positionKey(text.slug, chapter), clamped);
      setReadingChapter(text.slug, chapter);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.readHeader}>
        <Pressable
          onPress={onBack}
          style={styles.headerBtn}
          accessibilityRole="button"
          accessibilityLabel={`Back to ${plain(text.title_en)} contents`}
        >
          <Ionicons name="arrow-back" size={20} color={color.saffron} />
          <Text style={styles.headerBtnText}>Contents</Text>
        </Pressable>
        <Text style={styles.readPos} numberOfLines={1}>
          {safe + 1} / {count}
        </Text>
        {onChant && verses.some((v) => !!v.chant) ? (
          <Pressable
            onPress={() => onChant(Math.min(safe, Math.max(0, verses.length - 1)))}
            style={styles.headerBtnRight}
            accessibilityRole="button"
            accessibilityLabel={`Chant ${plain(text.title_en)}${chapter ? ` chapter ${chapter}` : ""}`}
          >
            <Text style={styles.headerBtnText}>Chant</Text>
          </Pressable>
        ) : (
          <View style={styles.headerBtnRight} />
        )}
      </View>
      <View style={{ flex: 1, paddingHorizontal: space.md, paddingBottom: space.xs }}>
        <PageCurlBook
          key={`${text.slug}#${chapter}`}
          index={safe}
          count={count}
          onIndexChange={turnTo}
          renderPage={(i) => {
            if (i < verses.length) {
              const v = verses[i];
              return v ? (
                <React.Fragment key={v.id}>
                  {renderVerse(v, verses[i - 1] ?? null, i, verses.length)}
                </React.Fragment>
              ) : (
                <View style={styles.page} />
              );
            }
            return (
              <View style={styles.page}>
                <Text style={styles.pageSource}>Next</Text>
                <Text style={[styles.verse, { fontSize: 20 }]}>
                  {next ? `Next chapter${next.chapter ? ` ${next.chapter}` : ""}` : ""}
                </Text>
                <Pressable
                  onPress={() => next && onChapter(next.chapter)}
                  style={styles.nextBtn}
                  accessibilityRole="button"
                  accessibilityLabel={next ? `Next chapter${next.chapter ? ` ${next.chapter}` : ""}` : "Next chapter"}
                >
                  <Text style={styles.nextText}>Next chapter</Text>
                </Pressable>
              </View>
            );
          }}
          cover={
            <BookCover
              variant="full"
              titleSa={text.title_sa}
              titleEn={plain(text.title_en)}
              caption={`${verses.length} verses`}
            />
          }
          labelFor={(i) => verses[i]?.source_ref ?? ""}
          reducedMotion={reduced}
        />
      </View>
      <ReaderSlider
        index={safe}
        count={count}
        labelFor={(i) => verses[i]?.source_ref ?? ""}
        onScrubEnd={(i) => turnTo(i)}
      />
      <View style={styles.turnRow}>
        <Pressable
          onPress={() => {
            if (safe <= 0 && prev) onChapter(prev.chapter);
            else turnTo(safe - 1);
          }}
          disabled={safe <= 0 && !prev}
          style={styles.turnBtn}
          accessibilityRole="button"
          accessibilityLabel="Previous chapter or verse"
        >
          <Ionicons name="chevron-back" size={22} color={color.saffron} />
          <Text style={styles.turnText}>Previous</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            if (safe >= count - 1) return;
            if (safe + 1 >= verses.length && next) onChapter(next.chapter);
            else turnTo(safe + 1);
          }}
          disabled={safe >= count - 1}
          style={styles.turnBtn}
          accessibilityRole="button"
          accessibilityLabel="Next chapter or verse"
        >
          <Text style={styles.turnText}>Next</Text>
          <Ionicons name="chevron-forward" size={22} color={color.saffron} />
        </Pressable>
      </View>
      {prev && safe === 0 ? (
        <Animated.View entering={reduced ? undefined : FadeIn.duration(120)}>
          <Pressable
            onPress={() => prev && onChapter(prev.chapter)}
            style={styles.edgeBtn}
            accessibilityRole="button"
            accessibilityLabel={`Previous chapter${prev.chapter ? ` ${prev.chapter}` : ""}`}
          >
            <Text style={styles.edgeText}>Previous chapter</Text>
          </Pressable>
        </Animated.View>
      ) : null}
      <PlusSheet visible={plusOpen} onClose={() => setPlusOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg },
  body: { padding: space.lg, paddingBottom: 120 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: space.lg },
  title: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", color: color.ink },
  hint: { color: color.inkSoft, marginTop: 8 },
  backRow: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 44, marginBottom: 8 },
  backText: { color: color.saffronText, fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.sm },
  sectionLabel: {
    fontFamily: "Nunito_800ExtraBold",
    fontWeight: "800",
    fontSize: font.sizes.sm,
    color: color.saffronText,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 12,
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    minHeight: 56,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.border,
  },
  rowText: { flex: 1 },
  rowTitle: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.base, color: color.ink },
  rowSub: { color: color.inkSoft, fontSize: 12, marginTop: 2 },
  readHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space.lg,
    paddingTop: 8,
    paddingBottom: 4,
  },
  headerBtn: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 44, minWidth: 64 },
  headerBtnText: { color: color.saffronText, fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.sm },
  headerBtnRight: { minHeight: 44, minWidth: 64 },
  readPos: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.sm, color: color.inkSoft, flex: 1, textAlign: "center" },
  page: {
    flex: 1,
    backgroundColor: "#FFFDF7",
    borderTopLeftRadius: 3,
    borderBottomLeftRadius: 3,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    paddingHorizontal: 12,
    overflow: "hidden",
  },
  pageSource: {
    fontFamily: "Nunito_800ExtraBold",
    fontWeight: "800",
    fontSize: 12,
    color: color.saffron,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingTop: 12,
  },
  verse: { color: color.ink, lineHeight: 46, marginTop: 8 },
  turnRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: space.lg, paddingVertical: 8, gap: 12 },
  turnBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: color.surface,
    borderRadius: 12,
    paddingHorizontal: 20,
    minHeight: 52,
    flex: 1,
    justifyContent: "center",
  },
  turnText: { color: color.saffronText, fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.base },
  nextBtn: {
    marginTop: 12,
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: color.saffronBtn,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  nextText: { color: "#FFFFFF", fontWeight: "800", fontSize: 16 },
  edgeBtn: { alignItems: "center", paddingVertical: 8, minHeight: 44, justifyContent: "center" },
  edgeText: { color: color.saffronText, fontWeight: "700" },
  sheetWrap: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center", padding: 24 },
  sheet: { backgroundColor: color.bg, borderRadius: 16, padding: 20, width: "100%", gap: 8 },
  sheetTitle: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 18, color: color.ink },
  sheetLine: { fontSize: 14, color: color.ink },
  sheetBtn: { marginTop: 8, minHeight: 48, borderRadius: 12, backgroundColor: color.saffronBtn, alignItems: "center", justifyContent: "center" },
  sheetBtnText: { color: "#FFFFFF", fontWeight: "800", fontSize: 16 },
});

export default { PagedBookIndex, PagedChapterReader, PlusSheet };
