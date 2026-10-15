import Modal from "../AudioModal";
// Paged books (handover_reading_shelf.md 7.4-7.7): contents, chapter reader,
// Plus preview sheet. Classic books are untouched; these components only
// render paged rows from GET /canon?include=paged.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
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
import { T, sa, ui } from "../../read/look";
import { NumBox, SectionHead, SquareButton } from "../../read/ui";

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
  const totalVerses = data.chapters.reduce((a, c) => a + c.count, 0);
  const order = data.chapters.map((c) => c.chapter);
  const nowAt = resume ? order.indexOf(resume.chapter) : -1;
  const many = data.chapters.length > 1;
  const open = () => {
    if (resume) onOpenChapter(resume.chapter, resume.index);
  };
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <SectionList
        sections={sections.map((s) => ({
          title: s.section ? `Part ${s.section}` : "",
          data: s.chapters,
        }))}
        keyExtractor={(c) => (c as { chapter: string }).chapter || "one"}
        contentContainerStyle={styles.body}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          <View>
            <Pressable onPress={onBack} style={styles.backRow} accessibilityRole="button" accessibilityLabel="Back to Books">
              <Ionicons name="arrow-back" size={20} color={T.ink} />
              <Text style={styles.backText}>Books</Text>
            </Pressable>
            <View style={styles.hero}>
              <CoverArt bookKey={text.slug} titleSa={text.title_sa} width={96} />
              <View style={styles.heroText}>
                <Text style={[styles.title, { fontSize: sized(25) }]} accessibilityRole="header">
                  {plain(text.title_en)}
                </Text>
                {!!text.title_sa && <Text style={[sa(18), { color: T.ink2 }]}>{text.title_sa}</Text>}
                <Text style={styles.fact}>
                  {many ? `${data.chapters.length} chapters · ${totalVerses} verses` : `${totalVerses} verses`}
                </Text>
                {text.locked ? <Text style={styles.fact}>Opening chapters free · rest with Plus</Text> : null}
              </View>
            </View>
            <View style={styles.actions}>
              <SquareButton
                label={started && resume ? `Continue${resume.chapter ? ` · chapter ${resume.chapter}` : ""}` : "Start reading"}
                icon="play"
                onPress={open}
                style={{ flex: 1 }}
              />
            </View>
            <SectionHead title={many ? "Chapters" : "Verses"} right={many ? `${data.chapters.length}` : undefined} style={styles.listHead} />
            <View style={styles.rule} />
          </View>
        }
        renderSectionHeader={({ section }) =>
          section.title ? <Text style={styles.sectionLabel}>{section.title}</Text> : null
        }
        renderItem={({ item }) => {
          const c = item as { chapter: string; count: number; locked: boolean; first_ref: string };
          const label = c.chapter ? `Chapter ${c.chapter}` : "Verses";
          const i = order.indexOf(c.chapter);
          const state = !started || nowAt < 0 ? "ahead" : i < nowAt ? "done" : i === nowAt ? "now" : "ahead";
          return (
            <Pressable
              onPress={() => {
                haptics.tap();
                if (c.locked) {
                  setPlusOpen(true);
                  return;
                }
                onOpenChapter(c.chapter, i === nowAt && resume ? resume.index : 0);
              }}
              style={styles.row}
              accessibilityRole="button"
              accessibilityLabel={c.locked ? `${label}, Plus` : `${label}. ${c.count} verses.`}
            >
              <NumBox state={state} label={c.chapter || "1"} />
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>{label}</Text>
                <Text style={[styles.rowSub, state === "now" && styles.rowSubNow]}>
                  {state === "now" && resume ? `You are at verse ${resume.index + 1} of ${c.count}` : `${c.count} verses`}
                  {c.locked ? " · Plus" : ""}
                </Text>
              </View>
              {c.locked ? (
                <Ionicons name="lock-closed" size={18} color={T.ink3} />
              ) : (
                <Ionicons name="chevron-forward" size={16} color={T.ink3} />
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
  safe: { flex: 1, backgroundColor: T.paper },
  body: { paddingHorizontal: 20, paddingBottom: 120 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: space.lg },
  title: { ...ui("bold"), lineHeight: 30, color: T.ink },
  hint: { color: color.inkSoft, marginTop: 8 },
  backRow: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 48, alignSelf: "flex-start" },
  backText: { ...ui("semibold"), fontSize: 15, color: T.ink },
  sectionLabel: { ...ui("bold"), fontSize: 12, letterSpacing: 1.4, color: T.ink3, marginTop: 16, marginBottom: 2 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    minHeight: 62,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: T.line,
  },
  rowText: { flex: 1, minWidth: 0 },
  rowSubNow: { ...ui("semibold"), color: T.action },
  hero: { flexDirection: "row", gap: 16, marginTop: 2 },
  heroText: { flex: 1, minWidth: 0, paddingTop: 2, gap: 2 },
  fact: { ...ui("regular"), fontSize: 14, color: T.ink2, marginTop: 6 },
  actions: { flexDirection: "row", marginTop: 18 },
  listHead: { marginTop: 26, marginBottom: 8 },
  rule: { height: 1, backgroundColor: T.line },
  rowTitle: { ...ui("semibold"), fontSize: 16, lineHeight: 21, color: T.ink },
  rowSub: { ...ui("regular"), color: T.ink3, fontSize: 13 },
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
